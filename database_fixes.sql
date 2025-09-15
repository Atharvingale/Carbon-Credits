-- Database Fixes for Existing Schema
-- Run this SQL in your Supabase SQL Editor

-- ==================================================
-- 1. CREATE THE MISSING ADMIN VIEW
-- ==================================================

-- Create the admin_project_submissions view that combines data
CREATE OR REPLACE VIEW admin_project_submissions AS
SELECT 
    ps.*,
    p.email as user_email,
    p.full_name as user_name,
    p.organization_name as user_organization,
    reviewer.full_name as reviewer_name
FROM project_submissions ps
LEFT JOIN profiles p ON ps.user_id = p.id
LEFT JOIN profiles reviewer ON ps.reviewed_by = reviewer.id;

-- Grant access to the view
GRANT SELECT ON admin_project_submissions TO authenticated;

-- ==================================================
-- 2. CHECK AND FIX RLS POLICIES
-- ==================================================

-- Enable RLS on project_submissions (if not already enabled)
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can insert own project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Users can view own project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Users can update own pending submissions" ON project_submissions;
DROP POLICY IF EXISTS "Admins can view all project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Admins can update all project submissions" ON project_submissions;

-- User policies for project_submissions
CREATE POLICY "Users can insert own project submissions" ON project_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own project submissions" ON project_submissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own pending submissions" ON project_submissions
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status IN ('pending', 'rejected')
    );

-- Admin policies for project_submissions
CREATE POLICY "Admins can view all project submissions" ON project_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

CREATE POLICY "Admins can update all project submissions" ON project_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

-- ==================================================
-- 3. CREATE FUNCTIONS AND TRIGGERS
-- ==================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for project_submissions
DROP TRIGGER IF EXISTS update_project_submissions_updated_at ON project_submissions;
CREATE TRIGGER update_project_submissions_updated_at 
    BEFORE UPDATE ON project_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create a project from approved submission
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
            'Unknown', -- You can extract from location if needed
            'Unknown', -- You can extract from location if needed
            NEW.project_area,
            NEW.project_area,
            NEW.ecosystem_type,
            NEW.estimated_credits,
            NEW.organization_name,
            NEW.organization_name,
            NEW.organization_email,
            NEW.contact_phone,
            'temp_wallet_' || NEW.id::text, -- Temporary wallet address
            'approved',
            NEW.user_id,
            NEW.reviewed_by,
            NEW.reviewed_at,
            NEW.carbon_data,
            NEW.calculated_credits,
            NEW.calculation_data,
            NEW.calculation_timestamp
        ) RETURNING id INTO new_project_id;
        
        -- Update submission with project_id
        NEW.project_id = new_project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create project from submission
DROP TRIGGER IF EXISTS create_project_on_approval ON project_submissions;
CREATE TRIGGER create_project_on_approval
    BEFORE UPDATE ON project_submissions
    FOR EACH ROW
    EXECUTE FUNCTION create_project_from_submission();

-- ==================================================
-- 4. ADD SAMPLE ECOSYSTEM TYPES
-- ==================================================

-- Add ecosystem types to project_types table if not exists
INSERT INTO project_types (name, description, category, is_active) VALUES
    ('Mangrove Restoration', 'Coastal mangrove forest restoration and conservation', 'blue_carbon', true),
    ('Salt Marsh Restoration', 'Tidal salt marsh restoration and protection', 'blue_carbon', true),
    ('Seagrass Restoration', 'Seagrass bed restoration and conservation', 'blue_carbon', true),
    ('Coastal Wetland Restoration', 'General coastal wetland restoration', 'blue_carbon', true),
    ('Tidal Flat Restoration', 'Tidal flat ecosystem restoration', 'blue_carbon', true)
ON CONFLICT (name) DO NOTHING;

-- ==================================================
-- 5. CREATE HELPER FUNCTION FOR DEBUGGING
-- ==================================================

-- Function to check submission count (for debugging)
CREATE OR REPLACE FUNCTION get_submission_count()
RETURNS integer AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM project_submissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_submission_count() TO authenticated;

-- ==================================================
-- 6. VERIFICATION AND DEBUG QUERIES
-- ==================================================

-- Check if view exists
SELECT 'admin_project_submissions view exists' as status
FROM information_schema.views 
WHERE table_name = 'admin_project_submissions';

-- Check project_submissions data
SELECT 
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
FROM project_submissions;

-- Check projects data
SELECT 
    COUNT(*) as total_projects,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
FROM projects;

-- Check profiles and roles
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users
FROM profiles;

-- Check RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    cmd,
    CASE 
        WHEN roles IS NULL THEN 'No specific roles'
        ELSE array_to_string(roles, ', ')
    END as roles
FROM pg_policies 
WHERE tablename IN ('project_submissions', 'projects')
ORDER BY tablename, policyname;

-- Test admin view access
SELECT COUNT(*) as admin_view_count FROM admin_project_submissions;

-- Success message
SELECT 'Database fixes completed! Your admin dashboard should now work properly.' AS status;

COMMIT;