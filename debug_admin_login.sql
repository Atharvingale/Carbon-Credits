-- Debug script to verify admin login setup
-- Run this in Supabase SQL Editor to check admin user setup

-- 1. Check if RLS is disabled (should return 'f' for false)
SELECT relname as table_name, relrowsecurity as rls_enabled 
FROM pg_class 
WHERE relname = 'profiles';

-- 2. Verify admin user exists and has correct role
SELECT 'Admin User Check:' as info;
SELECT id, email, role, first_name, last_name, created_at 
FROM public.profiles 
WHERE email = 'admin@gmail.com';

-- 3. Check if there are any admin users at all
SELECT 'All Admin Users:' as info;
SELECT id, email, role, first_name, last_name 
FROM public.profiles 
WHERE role = 'admin';

-- 4. Check role data type and values to catch any issues
SELECT 'Role Analysis:' as info;
SELECT 
    role,
    COUNT(*) as count,
    LENGTH(role) as role_length,
    CASE 
        WHEN role = 'admin' THEN 'EXACT MATCH'
        ELSE 'NO MATCH: [' || role || ']'
    END as admin_check
FROM public.profiles 
GROUP BY role
ORDER BY role;