-- COMPLETE DATA FLOW FIX
-- This will fix the entire data flow so NGOs can see their projects and admins can manage them
-- Run this SQL in your Supabase SQL Editor

-- ==================================================
-- 1. FIRST, LET'S CHECK WHAT TABLES ACTUALLY EXIST
-- ==================================================

-- Show all tables related to projects
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name LIKE '%project%' 
ORDER BY table_name;

-- ==================================================
-- 2. CLEAR RLS POLICIES TO START FRESH
-- ==================================================

-- Drop ALL existing policies on project_submissions
DROP POLICY IF EXISTS "Users can insert own project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Users can view own project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Users can update own pending submissions" ON project_submissions;
DROP POLICY IF EXISTS "Admins can view all project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Admins can update all project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON project_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON project_submissions;
DROP POLICY IF EXISTS "Enable update for users based on email" ON project_submissions;

-- Drop existing policies on projects table
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;

-- ==================================================
-- 3. CREATE PROPER RLS POLICIES
-- ==================================================

-- Enable RLS on both tables
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- PROJECT_SUBMISSIONS POLICIES
-- Users can insert their own submissions
CREATE POLICY "Users can insert submissions" ON project_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions" ON project_submissions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own pending submissions
CREATE POLICY "Users can update own submissions" ON project_submissions
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status IN ('pending', 'rejected')
    );

-- Admins can view ALL submissions
CREATE POLICY "Admins can view all submissions" ON project_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

-- Admins can update ALL submissions
CREATE POLICY "Admins can update all submissions" ON project_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

-- PROJECTS TABLE POLICIES
-- Users can view projects they submitted (either directly or via submission)
CREATE POLICY "Users can view related projects" ON projects
    FOR SELECT USING (
        auth.uid() = submitted_by_user OR
        EXISTS (
            SELECT 1 FROM project_submissions ps 
            WHERE ps.project_id = projects.id 
            AND ps.user_id = auth.uid()
        )
    );

-- Admins can view all projects
CREATE POLICY "Admins can view all projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

-- Admins can update all projects
CREATE POLICY "Admins can update all projects" ON projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

-- System can insert projects (for triggers)
CREATE POLICY "System can insert projects" ON projects
    FOR INSERT WITH CHECK (true);

-- ==================================================
-- 4. CREATE VIEWS FOR DIFFERENT DASHBOARDS
-- ==================================================

-- View for ADMIN dashboard (shows all submissions with user details)
CREATE OR REPLACE VIEW admin_project_submissions AS
SELECT 
    ps.*,
    p.email as user_email,
    p.full_name as user_name,
    p.organization_name as user_organization,
    reviewer.full_name as reviewer_name,
    proj.id as linked_project_id,
    proj.status as project_status
FROM project_submissions ps
LEFT JOIN profiles p ON ps.user_id = p.id
LEFT JOIN profiles reviewer ON ps.reviewed_by = reviewer.id
LEFT JOIN projects proj ON ps.project_id = proj.id;

-- View for NGO dashboard (shows user's own submissions AND related projects)
CREATE OR REPLACE VIEW user_projects AS
SELECT 
    'submission' as source_type,
    ps.id,
    ps.title as name,
    ps.description,
    ps.location,
    ps.ecosystem_type,
    ps.project_area as area,
    ps.estimated_credits,
    ps.organization_name,
    ps.status,
    ps.calculated_credits,
    ps.created_at,
    ps.updated_at,
    ps.user_id,
    ps.carbon_data,
    ps.project_id as linked_project_id
FROM project_submissions ps
WHERE ps.user_id = auth.uid()

UNION ALL

SELECT 
    'project' as source_type,
    p.id,
    p.name,
    p.description,
    p.location,
    p.ecosystem_type,
    p.area,
    p.estimated_credits,
    p.organization_name,
    p.status,
    p.calculated_credits,
    p.created_at,
    p.updated_at,
    p.submitted_by_user as user_id,
    p.carbon_data,
    NULL as linked_project_id
FROM projects p
WHERE p.submitted_by_user = auth.uid();

-- Grant permissions on views
GRANT SELECT ON admin_project_submissions TO authenticated;
GRANT SELECT ON user_projects TO authenticated;

-- ==================================================
-- 5. CREATE/UPDATE TRIGGERS FOR DATA SYNC
-- ==================================================

-- Function to create project from approved submission
CREATE OR REPLACE FUNCTION create_project_from_submission()
RETURNS TRIGGER AS $$
DECLARE
    new_project_id UUID;
BEGIN
    -- Only create project when status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Insert into projects table
        INSERT INTO projects (
            name,
            description,
            project_type,
            location,
            country,
            region,
            area,
            project_area,
            ecosystem_type,
            estimated_credits,
            submitted_by,
            organization_name,
            contact_email,
            contact_phone,
            wallet_address,
            status,
            submitted_by_user,
            approved_by,
            approved_at,
            carbon_data,
            calculated_credits,
            calculation_data,
            calculation_timestamp
        ) VALUES (
            NEW.title,
            NEW.description,
            COALESCE(NEW.ecosystem_type, 'blue_carbon'),
            NEW.location,
            'Unknown',
            'Unknown', 
            NEW.project_area,
            NEW.project_area,
            NEW.ecosystem_type,
            NEW.estimated_credits,
            NEW.organization_name,
            NEW.organization_name,
            NEW.organization_email,
            NEW.contact_phone,
            'temp_wallet_' || NEW.id::text,
            'approved',
            NEW.user_id,
            NEW.reviewed_by,
            NEW.reviewed_at,
            NEW.carbon_data,
            NEW.calculated_credits,
            NEW.calculation_data,
            NEW.calculation_timestamp
        ) RETURNING id INTO new_project_id;
        
        -- Update submission with project_id link
        NEW.project_id = new_project_id;
        
        -- Log the creation
        RAISE NOTICE 'Created project % from submission %', new_project_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS create_project_on_approval ON project_submissions;
CREATE TRIGGER create_project_on_approval
    BEFORE UPDATE ON project_submissions
    FOR EACH ROW
    EXECUTE FUNCTION create_project_from_submission();

-- Function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_project_submissions_updated_at ON project_submissions;
CREATE TRIGGER update_project_submissions_updated_at 
    BEFORE UPDATE ON project_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- 6. VERIFICATION QUERIES
-- ==================================================

-- Show current data in both tables
SELECT 'PROJECT_SUBMISSIONS' as table_name, COUNT(*) as count FROM project_submissions
UNION ALL
SELECT 'PROJECTS' as table_name, COUNT(*) as count FROM projects;

-- Show recent submissions
SELECT 
    'Recent Submissions' as info,
    id, 
    title, 
    organization_name, 
    status, 
    created_at,
    user_id,
    project_id
FROM project_submissions 
ORDER BY created_at DESC 
LIMIT 5;

-- Show recent projects
SELECT 
    'Recent Projects' as info,
    id, 
    name, 
    organization_name, 
    status, 
    created_at,
    submitted_by_user
FROM projects 
ORDER BY created_at DESC 
LIMIT 5;

-- Check policies
SELECT 
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('project_submissions', 'projects')
ORDER BY tablename, policyname;

-- Final success message
SELECT 'Data flow fix completed! NGOs should now see their projects in their dashboard.' AS status;

COMMIT;