-- Test script to verify admin user data
-- Run this in Supabase SQL Editor

-- Check RLS status
SELECT 'RLS Status:' as check_type, 
       relname as table_name, 
       relrowsecurity as rls_enabled 
FROM pg_class 
WHERE relname = 'profiles';

-- Check all profiles with their roles
SELECT 'All Profiles:' as check_type;
SELECT email, role, first_name, last_name, full_name, created_at 
FROM public.profiles 
ORDER BY created_at DESC;

-- Specifically check admin@gmail.com
SELECT 'Admin User Check:' as check_type;
SELECT id, email, role, first_name, last_name, full_name, created_at 
FROM public.profiles 
WHERE email = 'admin@gmail.com';

-- Check if there are any admin users
SELECT 'All Admin Users:' as check_type;
SELECT id, email, role, first_name, last_name, full_name 
FROM public.profiles 
WHERE role = 'admin';

-- Check the role values and data types
SELECT 'Role Analysis:' as check_type;
SELECT 
    role,
    COUNT(*) as count,
    pg_typeof(role) as role_type,
    LENGTH(role) as role_length,
    ASCII(role) as first_char_ascii
FROM public.profiles 
GROUP BY role, pg_typeof(role)
ORDER BY role;