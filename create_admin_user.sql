-- Create or update admin user
-- Run this in your Supabase SQL editor AFTER running fix_rls_policies.sql

-- First, check if admin user exists in profiles
SELECT id, email, role, first_name, last_name, created_at 
FROM public.profiles 
WHERE email = 'admin@gmail.com';

-- If the admin user doesn't exist in profiles, you'll need to:
-- 1. First create the user in Supabase Auth (do this through the Auth tab in Supabase dashboard)
-- 2. Then run this insert statement with the correct user ID

-- Example: Insert admin profile manually (replace 'YOUR_USER_ID_HERE' with actual UUID from auth.users)
-- INSERT INTO public.profiles (
--   id,
--   email,
--   role,
--   first_name,
--   last_name,
--   full_name,
--   created_at,
--   updated_at
-- ) VALUES (
--   'YOUR_USER_ID_HERE',
--   'admin@gmail.com',
--   'admin',
--   'Admin',
--   'User',
--   'Admin User',
--   NOW(),
--   NOW()
-- ) ON CONFLICT (id) DO UPDATE SET
--   role = 'admin',
--   updated_at = NOW();

-- Or if the profile exists but doesn't have admin role:
UPDATE public.profiles 
SET 
  role = 'admin',
  updated_at = NOW()
WHERE email = 'admin@gmail.com';

-- Verify the update
SELECT id, email, role, first_name, last_name, created_at 
FROM public.profiles 
WHERE email = 'admin@gmail.com';