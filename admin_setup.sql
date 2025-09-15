-- Admin Dashboard Database Setup
-- Run this in your Supabase SQL editor to add admin functionality

-- 1. Add blocking fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;

-- 2. Add rejection reason to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'project', 'token'
  target_id UUID NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked);

-- 5. Add RLS policies for admin_logs
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all logs
CREATE POLICY "Admins can read all logs" ON admin_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Allow admins to insert logs
CREATE POLICY "Admins can insert logs" ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND admin_id = auth.uid()
  );

-- 6. Update profiles RLS to prevent blocked users from accessing
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    AND (is_blocked = FALSE OR is_blocked IS NULL)
  );

-- Allow admins to view and edit all profiles
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 7. Update projects RLS to allow admins full access
CREATE POLICY "Admins can manage all projects" ON projects
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 8. Update tokens RLS to allow admins full access
CREATE POLICY "Admins can manage all tokens" ON tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 9. Create function to check if user is blocked (for additional security)
CREATE OR REPLACE FUNCTION is_user_blocked(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND is_blocked = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to get admin statistics
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'blocked_users', (SELECT COUNT(*) FROM profiles WHERE is_blocked = TRUE),
    'admin_users', (SELECT COUNT(*) FROM profiles WHERE role = 'admin'),
    'total_projects', (SELECT COUNT(*) FROM projects),
    'pending_projects', (SELECT COUNT(*) FROM projects WHERE status = 'pending'),
    'approved_projects', (SELECT COUNT(*) FROM projects WHERE status = 'approved'),
    'rejected_projects', (SELECT COUNT(*) FROM projects WHERE status = 'rejected'),
    'total_tokens', (SELECT COALESCE(SUM(amount), 0) FROM tokens),
    'total_transactions', (SELECT COUNT(*) FROM tokens)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admins will be checked in the function)
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID) TO authenticated;

COMMENT ON TABLE admin_logs IS 'Audit trail for all admin actions';
COMMENT ON COLUMN profiles.is_blocked IS 'Whether the user account is blocked by admin';
COMMENT ON COLUMN profiles.block_reason IS 'Reason why the user was blocked';
COMMENT ON COLUMN profiles.blocked_at IS 'Timestamp when the user was blocked';
COMMENT ON COLUMN projects.rejection_reason IS 'Reason why the project was rejected';