-- EMERGENCY FIX: Disable RLS to allow login
-- Run this immediately in your Supabase SQL editor to fix the login issue

-- Temporarily disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verify admin user exists and has correct role
SELECT id, email, role, first_name, last_name, created_at 
FROM public.profiles 
WHERE email = 'admin@gmail.com';

-- If no admin user found, you may need to create one manually:
-- Replace 'YOUR_AUTH_USER_ID' with the actual UUID from auth.users table
/*
INSERT INTO public.profiles (
  id,
  email,
  role,
  first_name,
  last_name,
  full_name,
  created_at,
  updated_at
) 
SELECT 
  id,
  email,
  'admin',
  'Admin',
  'User',
  'Admin User',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'admin@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();
*/