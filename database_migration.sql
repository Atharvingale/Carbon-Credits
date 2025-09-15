-- Migration to add missing columns to projects table for Blue Carbon project submission
-- Run this SQL in your Supabase SQL Editor

-- Add missing columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carbon_data JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_email TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_credits DECIMAL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS calculated_credits DECIMAL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS calculation_data JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS calculation_timestamp TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own projects
CREATE POLICY IF NOT EXISTS "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own projects
CREATE POLICY IF NOT EXISTS "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow admins to view all projects (you'll need to set up admin role)
CREATE POLICY IF NOT EXISTS "Admins can view all projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Policy to allow admins to update all projects
CREATE POLICY IF NOT EXISTS "Admins can update all projects" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER IF NOT EXISTS update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;