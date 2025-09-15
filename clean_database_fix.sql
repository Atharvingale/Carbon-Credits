-- CLEAN DATABASE FIX - Handles all existing policies properly
-- Run this SQL in your Supabase SQL Editor

-- ==================================================
-- 1. DROP ALL EXISTING POLICIES (COMPREHENSIVE)
-- ==================================================

-- Get all existing policies and drop them
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on project_submissions
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'project_submissions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON project_submissions', pol.policyname);
    END LOOP;
    
    -- Drop all policies on projects
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
    END LOOP;
    
    RAISE NOTICE 'All existing policies dropped successfully';
END
$$;

-- ==================================================
-- 2. ENABLE RLS ON BOTH TABLES
-- ==================================================

ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- 3. CREATE FRESH RLS POLICIES
-- ==================================================

-- PROJECT_SUBMISSIONS POLICIES
CREATE POLICY "users_can_insert_submissions" ON project_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_view_own_submissions" ON project_submissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_submissions" ON project_submissions
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status IN ('pending', 'rejected')
    );

CREATE POLICY "admins_can_view_all_submissions" ON project_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

CREATE POLICY "admins_can_update_all_submissions" ON project_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

-- PROJECTS TABLE POLICIES
CREATE POLICY "users_can_view_related_projects" ON projects
    FOR SELECT USING (
        auth.uid() = submitted_by_user OR
        EXISTS (
            SELECT 1 FROM project_submissions ps 
            WHERE ps.project_id = projects.id 
            AND ps.user_id = auth.uid()
        )
    );

CREATE POLICY "admins_can_view_all_projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

CREATE POLICY "admins_can_update_all_projects" ON projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

CREATE POLICY "system_can_insert_projects" ON projects
    FOR INSERT WITH CHECK (true);

-- ==================================================
-- 4. CREATE/RECREATE VIEWS
-- ==================================================

-- Drop existing views
DROP VIEW IF EXISTS admin_project_submissions;
DROP VIEW IF EXISTS user_projects;

-- View for ADMIN dashboard
CREATE VIEW admin_project_submissions AS
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
CREATE VIEW user_projects AS
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
-- 5. CREATE/RECREATE FUNCTIONS AND TRIGGERS
-- ==================================================

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS create_project_on_approval ON project_submissions;
DROP TRIGGER IF EXISTS update_project_submissions_updated_at ON project_submissions;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP FUNCTION IF EXISTS create_project_from_submission();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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
        
        RAISE NOTICE 'Created project % from submission %', new_project_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER create_project_on_approval
    BEFORE UPDATE ON project_submissions
    FOR EACH ROW
    EXECUTE FUNCTION create_project_from_submission();

CREATE TRIGGER update_project_submissions_updated_at 
    BEFORE UPDATE ON project_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- 6. ADD HELPER FUNCTION FOR DEBUGGING
-- ==================================================

CREATE OR REPLACE FUNCTION get_submission_count()
RETURNS integer AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM project_submissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_submission_count() TO authenticated;

-- ==================================================
-- 7. ADD ECOSYSTEM TYPES IF NOT EXISTS
-- ==================================================

INSERT INTO project_types (name, description, category, is_active) VALUES
    ('Mangrove Restoration', 'Coastal mangrove forest restoration and conservation', 'blue_carbon', true),
    ('Salt Marsh Restoration', 'Tidal salt marsh restoration and protection', 'blue_carbon', true),
    ('Seagrass Restoration', 'Seagrass bed restoration and conservation', 'blue_carbon', true),
    ('Coastal Wetland Restoration', 'General coastal wetland restoration', 'blue_carbon', true),
    ('Tidal Flat Restoration', 'Tidal flat ecosystem restoration', 'blue_carbon', true)
ON CONFLICT (name) DO NOTHING;

-- ==================================================
-- 8. VERIFICATION AND TESTING
-- ==================================================

-- Show current data counts
SELECT 'PROJECT_SUBMISSIONS' as table_name, COUNT(*) as count FROM project_submissions
UNION ALL
SELECT 'PROJECTS' as table_name, COUNT(*) as count FROM projects
UNION ALL
SELECT 'PROFILES' as table_name, COUNT(*) as count FROM profiles;

-- Show recent submissions
SELECT 
    'Recent Submissions:' as info,
    id, 
    title, 
    organization_name, 
    status, 
    created_at::date,
    user_id
FROM project_submissions 
ORDER BY created_at DESC 
LIMIT 3;

-- Show policies
SELECT 
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('project_submissions', 'projects')
ORDER BY tablename, policyname;

-- Test views
SELECT 'ADMIN VIEW COUNT' as test, COUNT(*) as result FROM admin_project_submissions
UNION ALL
SELECT 'USER VIEW COUNT' as test, COUNT(*) as result FROM user_projects;

-- Success message
SELECT 'Clean database fix completed successfully! All policies recreated from scratch.' AS status;

COMMIT;