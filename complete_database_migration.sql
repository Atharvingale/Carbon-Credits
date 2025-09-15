-- Complete Database Migration for Carbon Credits Project
-- This updates your existing schema to support the new project submission form
-- Run this SQL in your Supabase SQL Editor

-- ==================================================
-- ADD MISSING COLUMNS TO EXISTING PROJECTS TABLE
-- ==================================================

-- Add columns needed for the project submission form
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carbon_data JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ecosystem_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_area DECIMAL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS calculated_credits DECIMAL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS calculation_data JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS calculation_timestamp TIMESTAMP WITH TIME ZONE;

-- Update area column to be consistent (your table has 'area', form uses 'project_area')
-- We'll keep both for backward compatibility
UPDATE projects SET project_area = area WHERE project_area IS NULL AND area IS NOT NULL;

-- ==================================================
-- CREATE PROJECT_SUBMISSIONS TABLE (FOR FORM SUBMISSIONS)
-- ==================================================

CREATE TABLE IF NOT EXISTS project_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Project Information
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    ecosystem_type TEXT,
    project_area DECIMAL,
    estimated_credits DECIMAL,
    
    -- Organization Information  
    organization_name TEXT,
    organization_email TEXT,
    contact_phone TEXT,
    
    -- Carbon Data (JSON containing all environmental parameters)
    carbon_data JSONB,
    
    -- Status and Processing
    status TEXT DEFAULT 'pending' CHECK (status = ANY (ARRAY[
        'pending'::text, 
        'under_review'::text,
        'approved'::text, 
        'rejected'::text,
        'credits_calculated'::text,
        'credits_minted'::text
    ])),
    
    -- Calculated Credits (populated after calculation)
    calculated_credits DECIMAL,
    calculation_data JSONB,
    calculation_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Admin Review
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Link to main projects table (when approved)
    project_id UUID REFERENCES projects(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==================================================
-- ADD INDEXES FOR PERFORMANCE
-- ==================================================

-- Indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_ecosystem_type ON projects(ecosystem_type);
CREATE INDEX IF NOT EXISTS idx_projects_calculation_timestamp ON projects(calculation_timestamp);

-- Indexes for project_submissions table
CREATE INDEX IF NOT EXISTS idx_project_submissions_status ON project_submissions(status);
CREATE INDEX IF NOT EXISTS idx_project_submissions_user_id ON project_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_created_at ON project_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_project_submissions_ecosystem_type ON project_submissions(ecosystem_type);

-- ==================================================
-- UPDATE EXISTING RLS POLICIES
-- ==================================================

-- Enable RLS on project_submissions table
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Users can view own project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Users can update own pending submissions" ON project_submissions;
DROP POLICY IF EXISTS "Admins can view all project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Admins can update all project submissions" ON project_submissions;

-- User policies for project_submissions
CREATE POLICY "Users can insert own project submissions" ON project_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own project submissions" ON project_submissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own pending submissions" ON project_submissions
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status IN ('pending', 'rejected')
    );

-- Admin policies for project_submissions
CREATE POLICY "Admins can view all project submissions" ON project_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

CREATE POLICY "Admins can update all project submissions" ON project_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'verifier')
        )
    );

-- ==================================================
-- CREATE FUNCTIONS AND TRIGGERS
-- ==================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for project_submissions
DROP TRIGGER IF EXISTS update_project_submissions_updated_at ON project_submissions;
CREATE TRIGGER update_project_submissions_updated_at 
    BEFORE UPDATE ON project_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create a project from approved submission
CREATE OR REPLACE FUNCTION create_project_from_submission()
RETURNS TRIGGER AS $$
DECLARE
    new_project_id UUID;
BEGIN
    -- Only create project when status changes to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Insert into projects table
        INSERT INTO projects (
            name,
            description,
            project_type,
            location,
            country,
            region,
            area,
            project_area,
            ecosystem_type,
            estimated_credits,
            submitted_by,
            organization_name,
            contact_email,
            contact_phone,
            wallet_address,
            status,
            submitted_by_user,
            approved_by,
            approved_at,
            carbon_data,
            calculated_credits,
            calculation_data,
            calculation_timestamp
        ) VALUES (
            NEW.title,
            NEW.description,
            COALESCE(NEW.ecosystem_type, 'blue_carbon'),
            NEW.location,
            'Unknown', -- You can extract from location if needed
            'Unknown', -- You can extract from location if needed
            NEW.project_area,
            NEW.project_area,
            NEW.ecosystem_type,
            NEW.estimated_credits,
            NEW.organization_name,
            NEW.organization_name,
            NEW.organization_email,
            NEW.contact_phone,
            'temp_wallet_' || NEW.id::text, -- Temporary wallet address
            'approved',
            NEW.user_id,
            NEW.reviewed_by,
            NEW.reviewed_at,
            NEW.carbon_data,
            NEW.calculated_credits,
            NEW.calculation_data,
            NEW.calculation_timestamp
        ) RETURNING id INTO new_project_id;
        
        -- Update submission with project_id
        NEW.project_id = new_project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create project from submission
DROP TRIGGER IF EXISTS create_project_on_approval ON project_submissions;
CREATE TRIGGER create_project_on_approval
    BEFORE UPDATE ON project_submissions
    FOR EACH ROW
    EXECUTE FUNCTION create_project_from_submission();

-- ==================================================
-- UPDATE EXISTING ECOSYSTEM OPTIONS
-- ==================================================

-- Add ecosystem types to project_types table if not exists
INSERT INTO project_types (name, description, category, is_active) VALUES
    ('Mangrove Restoration', 'Coastal mangrove forest restoration and conservation', 'blue_carbon', true),
    ('Salt Marsh Restoration', 'Tidal salt marsh restoration and protection', 'blue_carbon', true),
    ('Seagrass Restoration', 'Seagrass bed restoration and conservation', 'blue_carbon', true),
    ('Coastal Wetland Restoration', 'General coastal wetland restoration', 'blue_carbon', true),
    ('Tidal Flat Restoration', 'Tidal flat ecosystem restoration', 'blue_carbon', true)
ON CONFLICT (name) DO NOTHING;

-- ==================================================
-- CREATE VIEW FOR ADMIN DASHBOARD
-- ==================================================

-- Create a view that combines project submissions with user profiles
CREATE OR REPLACE VIEW admin_project_submissions AS
SELECT 
    ps.*,
    p.email as user_email,
    p.full_name as user_name,
    p.organization_name as user_organization,
    reviewer.full_name as reviewer_name
FROM project_submissions ps
LEFT JOIN profiles p ON ps.user_id = p.id
LEFT JOIN profiles reviewer ON ps.reviewed_by = reviewer.id;

-- Grant access to admin view
GRANT SELECT ON admin_project_submissions TO authenticated;

-- ==================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- ==================================================

-- Uncomment to insert sample data
/*
INSERT INTO project_submissions (
    user_id,
    title,
    description,
    location,
    ecosystem_type,
    project_area,
    estimated_credits,
    organization_name,
    organization_email,
    contact_phone,
    carbon_data,
    status
) VALUES (
    (SELECT id FROM profiles LIMIT 1), -- Use first available user
    'Sample Mangrove Restoration Project',
    'A comprehensive mangrove restoration project aimed at carbon sequestration and biodiversity conservation in coastal areas.',
    'Sundarbans, West Bengal, India',
    'mangrove',
    150.0,
    2500,
    'Coastal Conservation Initiative',
    'info@coastalconservation.org',
    '+91-9876543210',
    '{
        "bulk_density": 1.2,
        "depth": 1.0,
        "carbon_percent": 3.5,
        "agb_biomass": 180,
        "bgb_biomass": 90,
        "carbon_fraction": 0.47,
        "ch4_flux": 5.8,
        "n2o_flux": 0.9,
        "baseline_carbon_stock": 140,
        "uncertainty_deduction": 0.2
    }',
    'pending'
);
*/

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Check project_submissions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'project_submissions'
ORDER BY ordinal_position;

-- Check that projects table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' 
AND column_name IN ('carbon_data', 'ecosystem_type', 'project_area', 'calculated_credits')
ORDER BY column_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('projects', 'project_submissions')
ORDER BY tablename, policyname;

-- Success message
SELECT 'Database migration completed successfully! Your project submission form should now work.' AS status;

COMMIT;