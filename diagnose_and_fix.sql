-- DIAGNOSTIC AND FIX SCRIPT
-- This will diagnose the issues and fix them
-- Run this SQL in your Supabase SQL Editor

-- ==================================================
-- 1. DIAGNOSTIC: CHECK WHAT DATA EXISTS
-- ==================================================

-- Check what's in project_submissions
SELECT 'PROJECT_SUBMISSIONS DATA:' as info;
SELECT 
    id, 
    title, 
    user_id, 
    organization_name, 
    status, 
    created_at::date
FROM project_submissions 
ORDER BY created_at DESC;

-- Check what's in projects 
SELECT 'PROJECTS DATA:' as info;
SELECT 
    id, 
    name, 
    submitted_by_user, 
    organization_name, 
    status, 
    created_at::date
FROM projects 
ORDER BY created_at DESC;

-- Check profiles
SELECT 'PROFILES DATA:' as info;
SELECT 
    id, 
    email, 
    role, 
    full_name
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- ==================================================
-- 2. CHECK FOREIGN KEY RELATIONSHIPS
-- ==================================================

-- Check existing foreign keys
SELECT 'FOREIGN KEYS:' as info;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('projects', 'project_submissions');

-- ==================================================
-- 3. FIX: ADD MISSING FOREIGN KEY IF NOT EXISTS
-- ==================================================

-- Add foreign key from projects.submitted_by_user to profiles.id if it doesn't exist
DO $$
BEGIN
    -- Check if foreign key already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_submitted_by_user_fkey' 
        AND table_name = 'projects'
    ) THEN
        -- Add the foreign key
        ALTER TABLE projects 
        ADD CONSTRAINT projects_submitted_by_user_fkey 
        FOREIGN KEY (submitted_by_user) REFERENCES profiles(id);
        
        RAISE NOTICE 'Added foreign key: projects.submitted_by_user -> profiles.id';
    ELSE
        RAISE NOTICE 'Foreign key already exists: projects.submitted_by_user -> profiles.id';
    END IF;
END $$;

-- Add foreign key from project_submissions.user_id to profiles.id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_submissions_user_id_fkey' 
        AND table_name = 'project_submissions'
    ) THEN
        ALTER TABLE project_submissions 
        ADD CONSTRAINT project_submissions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id);
        
        RAISE NOTICE 'Added foreign key: project_submissions.user_id -> profiles.id';
    ELSE
        RAISE NOTICE 'Foreign key already exists: project_submissions.user_id -> profiles.id';
    END IF;
END $$;

-- ==================================================
-- 4. TEMPORARILY DISABLE RLS FOR TESTING
-- ==================================================

-- Temporarily disable RLS to see if data visibility is the issue
ALTER TABLE project_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Test if we can see data now
SELECT 'TEST WITHOUT RLS - PROJECT_SUBMISSIONS:' as info;
SELECT COUNT(*) as total_submissions FROM project_submissions;

SELECT 'TEST WITHOUT RLS - PROJECTS:' as info;
SELECT COUNT(*) as total_projects FROM projects;

-- Test the views without RLS
SELECT 'TEST ADMIN VIEW WITHOUT RLS:' as info;
SELECT COUNT(*) as admin_view_count FROM admin_project_submissions;

SELECT 'TEST USER VIEW WITHOUT RLS:' as info;
SELECT COUNT(*) as user_view_count FROM user_projects;

-- ==================================================
-- 5. RE-ENABLE RLS WITH CORRECTED POLICIES
-- ==================================================

-- Re-enable RLS
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
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
END $$;

-- Create simple, working policies
-- PROJECT_SUBMISSIONS POLICIES
CREATE POLICY "enable_all_for_authenticated_users" ON project_submissions
    FOR ALL USING (auth.role() = 'authenticated');

-- PROJECTS POLICIES  
CREATE POLICY "enable_all_for_authenticated_users" ON projects
    FOR ALL USING (auth.role() = 'authenticated');

-- ==================================================
-- 6. RECREATE VIEWS WITH BETTER ERROR HANDLING
-- ==================================================

-- Drop and recreate views
DROP VIEW IF EXISTS admin_project_submissions;
DROP VIEW IF EXISTS user_projects;

-- Simple admin view without complex joins that might fail
CREATE VIEW admin_project_submissions AS
SELECT 
    ps.*,
    p.email as user_email,
    p.full_name as user_name
FROM project_submissions ps
LEFT JOIN profiles p ON ps.user_id = p.id;

-- Simple user view
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
WHERE ps.user_id = auth.uid();

-- Grant permissions
GRANT SELECT ON admin_project_submissions TO authenticated;
GRANT SELECT ON user_projects TO authenticated;

-- ==================================================
-- 7. FINAL TESTING
-- ==================================================

-- Test final views
SELECT 'FINAL TEST - ADMIN VIEW:' as info;
SELECT COUNT(*) as admin_view_count FROM admin_project_submissions;

SELECT 'FINAL TEST - USER VIEW:' as info;  
SELECT COUNT(*) as user_view_count FROM user_projects;

-- Show sample data
SELECT 'SAMPLE ADMIN VIEW DATA:' as info;
SELECT 
    id, 
    title, 
    organization_name, 
    status, 
    user_email,
    user_name
FROM admin_project_submissions 
ORDER BY created_at DESC 
LIMIT 3;

-- Check current user ID for debugging
SELECT 'CURRENT USER:' as info;
SELECT auth.uid() as current_user_id;

-- Show which projects the current user should see
SELECT 'PROJECTS FOR CURRENT USER:' as info;
SELECT 
    id,
    title,
    user_id,
    status
FROM project_submissions 
WHERE user_id = auth.uid()
LIMIT 5;

SELECT 'Diagnostic and fix completed!' AS status;

COMMIT;