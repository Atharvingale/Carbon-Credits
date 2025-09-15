-- Fixed script to create/update admin user (without full_name issue)
-- Run this after the emergency fix

-- First verify RLS is disabled
SELECT 'RLS Status for profiles:' as info, 
       relname, 
       relrowsecurity as rls_enabled 
FROM pg_class 
WHERE relname = 'profiles';

-- Check if admin user exists in auth.users
SELECT 'Auth users check:' as info;
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'admin@gmail.com';

-- Create or update admin profile (without full_name since it's generated)
DO $$ 
DECLARE
    auth_user_id uuid;
BEGIN
    -- Get the auth user ID for admin@gmail.com
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = 'admin@gmail.com';
    
    IF auth_user_id IS NOT NULL THEN
        -- Update or insert admin profile (excluding generated full_name column)
        INSERT INTO public.profiles (
            id,
            email,
            role,
            first_name,
            last_name,
            created_at,
            updated_at
        ) VALUES (
            auth_user_id,
            'admin@gmail.com',
            'admin',
            'Admin',
            'User',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            first_name = 'Admin',
            last_name = 'User',
            updated_at = NOW();
            
        RAISE NOTICE 'Admin user profile updated successfully with ID: %', auth_user_id;
    ELSE
        RAISE NOTICE 'Admin user not found in auth.users table. Please create the user first in Supabase Auth dashboard.';
    END IF;
END $$;

-- Verify the admin user
SELECT 'Final check:' as info;
SELECT id, email, role, first_name, last_name, full_name, created_at 
FROM public.profiles 
WHERE email = 'admin@gmail.com';

-- Show all admin users
SELECT 'All admin users:' as info;
SELECT id, email, role, first_name, last_name, full_name 
FROM public.profiles 
WHERE role = 'admin';