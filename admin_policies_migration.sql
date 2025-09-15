-- Admin policies for project_submissions table
-- Run this AFTER running the project_submissions_migration.sql
-- This assumes you have an admin role setup in your auth system

-- Create admin policies for project_submissions
CREATE POLICY IF NOT EXISTS "Admins can view all project submissions" ON project_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_app_meta_data->>'role' = 'admin' OR
        auth.users.email IN ('admin@carboncredits.com', 'your-admin-email@domain.com')
      )
    )
  );

-- Policy to allow admins to update all projects
CREATE POLICY IF NOT EXISTS "Admins can update all project submissions" ON project_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_app_meta_data->>'role' = 'admin' OR
        auth.users.email IN ('admin@carboncredits.com', 'your-admin-email@domain.com')
      )
    )
  );

-- Policy to allow admins to delete projects if needed
CREATE POLICY IF NOT EXISTS "Admins can delete project submissions" ON project_submissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_app_meta_data->>'role' = 'admin' OR
        auth.users.email IN ('admin@carboncredits.com', 'your-admin-email@domain.com')
      )
    )
  );

-- Function to grant admin role to a user (call this for your admin users)
-- Replace 'your-admin-email@domain.com' with actual admin email
-- 
-- Example usage:
-- SELECT grant_admin_role('admin@carboncredits.com');

CREATE OR REPLACE FUNCTION grant_admin_role(user_email TEXT)
RETURNS VOID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Find the user by email
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
    
    -- Update the user's metadata to include admin role
    UPDATE auth.users 
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
    WHERE id = user_id;
    
    RAISE NOTICE 'Admin role granted to user: %', user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant admin privileges to specific email (replace with your admin email)
-- Uncomment and modify the line below:
-- SELECT grant_admin_role('your-admin-email@domain.com');

COMMIT;