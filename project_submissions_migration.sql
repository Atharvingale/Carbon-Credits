-- Migration to create or update project_submissions table for Blue Carbon project submission
-- Run this SQL in your Supabase SQL Editor

-- Create project_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    ecosystem_type TEXT,
    project_area DECIMAL,
    estimated_credits DECIMAL,
    organization_name TEXT,
    organization_email TEXT,
    contact_phone TEXT,
    carbon_data JSONB,
    status TEXT DEFAULT 'pending',
    calculated_credits DECIMAL,
    calculation_data JSONB,
    calculation_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to project_submissions table (if table already exists)
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS carbon_data JSONB;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS organization_email TEXT;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS estimated_credits DECIMAL;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS calculated_credits DECIMAL;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS calculation_data JSONB;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS calculation_timestamp TIMESTAMP;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_submissions_status ON project_submissions(status);
CREATE INDEX IF NOT EXISTS idx_project_submissions_user_id ON project_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_created_at ON project_submissions(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Users can view own project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Admins can view all project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Admins can update all project submissions" ON project_submissions;

-- Policy to allow users to insert their own projects
CREATE POLICY "Users can insert own project submissions" ON project_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own projects
CREATE POLICY "Users can view own project submissions" ON project_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to update their own projects (before submission)
CREATE POLICY "Users can update own project submissions" ON project_submissions
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Policy to allow all authenticated users to view project submissions (for public viewing)
-- Comment this out if you want projects to be private
-- CREATE POLICY "Authenticated users can view project submissions" ON project_submissions
--   FOR SELECT USING (auth.role() = 'authenticated');

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_project_submissions_updated_at ON project_submissions;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_project_submissions_updated_at 
  BEFORE UPDATE ON project_submissions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create organizations table for better data organization (optional)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS for organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read organizations
CREATE POLICY IF NOT EXISTS "Authenticated users can view organizations" ON organizations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to insert organizations
CREATE POLICY IF NOT EXISTS "Users can insert organizations" ON organizations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add organization_id column to project_submissions (optional - for better normalization)
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'project_submissions'
ORDER BY ordinal_position;

-- Insert some sample data for testing (optional)
-- INSERT INTO organizations (name, contact_email) VALUES 
-- ('Marine Conservation Society', 'info@marineconservation.org'),
-- ('Coastal Restoration Initiative', 'contact@coastalrestoration.org');

COMMIT;