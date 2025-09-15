-- Debug script to check database status
-- Run this in your Supabase SQL Editor to diagnose issues

-- 1. Check if project_submissions table exists
SELECT 'project_submissions table exists' as status
FROM information_schema.tables 
WHERE table_name = 'project_submissions';

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'project_submissions'
ORDER BY ordinal_position;

-- 3. Check if there's any data in project_submissions
SELECT 
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
FROM project_submissions;

-- 4. Show recent submissions (if any)
SELECT 
    id,
    title,
    organization_name,
    status,
    created_at
FROM project_submissions 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check if admin_project_submissions view exists
SELECT 'admin_project_submissions view exists' as status
FROM information_schema.views 
WHERE table_name = 'admin_project_submissions';

-- 6. Check profiles table for users and admin roles
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as users
FROM profiles;

-- 7. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('project_submissions', 'projects')
ORDER BY tablename, policyname;

-- 8. Test the admin view (this might fail if there's no data)
SELECT 
    COUNT(*) as submissions_in_admin_view
FROM admin_project_submissions;

-- 9. Check if projects table has new columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'projects' 
AND column_name IN ('carbon_data', 'ecosystem_type', 'project_area', 'calculated_credits');

-- 10. Check current user's role (replace with actual checking)
-- This will work when run by an authenticated user
-- SELECT role FROM profiles WHERE id = auth.uid();