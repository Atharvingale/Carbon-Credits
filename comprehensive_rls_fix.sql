-- COMPREHENSIVE RLS FIX for profiles table
-- Run this in Supabase SQL editor AFTER the emergency fix

-- Step 1: Drop ALL existing policies to clear recursion
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
    END LOOP;
END $$;

-- Step 2: Create simple, non-recursive policies

-- Allow everyone to read profiles (common for platforms/marketplaces)
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Step 3: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Test the policies
SELECT 'Testing profiles access...' as status;
SELECT count(*) as total_profiles FROM public.profiles;
SELECT count(*) as admin_profiles FROM public.profiles WHERE role = 'admin';

-- Step 5: Ensure admin user exists with correct role
-- Update existing admin user or create if needed
DO $$ 
DECLARE
    auth_user_id uuid;
BEGIN
    -- Get the auth user ID for admin@gmail.com
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = 'admin@gmail.com';
    
    IF auth_user_id IS NOT NULL THEN
        -- Update or insert admin profile
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
            
        RAISE NOTICE 'Admin user profile updated successfully';
    ELSE
        RAISE NOTICE 'Admin user not found in auth.users - please create via Supabase Auth dashboard first';
    END IF;
END $$;

-- Step 6: Verify everything works
SELECT 'Final verification...' as status;
SELECT id, email, role, first_name, last_name 
FROM public.profiles 
WHERE email = 'admin@gmail.com';