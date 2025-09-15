-- Admin Role Setup Script
-- Replace 'your-email@domain.com' with your actual admin email address
-- Run this AFTER running database_fixes.sql

-- ==================================================
-- 1. GRANT ADMIN ROLE TO YOUR ACCOUNT
-- ==================================================

-- Update your profile to have admin role
-- REPLACE 'your-email@domain.com' WITH YOUR ACTUAL EMAIL
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@domain.com';

-- Verify the role was set
SELECT 
    id,
    email,
    role,
    full_name,
    organization_name
FROM profiles 
WHERE email = 'your-email@domain.com';

-- ==================================================
-- 2. CREATE A TEST SUBMISSION (OPTIONAL)
-- ==================================================

-- Insert a test project submission for testing
-- This will use the first available user profile
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
    'Test Mangrove Restoration Project',
    'A comprehensive mangrove restoration project for testing the admin dashboard functionality.',
    'Sundarbans, West Bengal, India',
    'mangrove',
    150.0,
    2500,
    'Marine Conservation Test Organization',
    'info@testorg.com',
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

-- ==================================================
-- 3. VERIFY EVERYTHING IS WORKING
-- ==================================================

-- Check if admin can see submissions
SELECT 
    'Admin can view submissions' as test,
    COUNT(*) as submission_count
FROM admin_project_submissions;

-- Check recent submissions
SELECT 
    id,
    title,
    organization_name,
    status,
    user_name,
    created_at
FROM admin_project_submissions
ORDER BY created_at DESC
LIMIT 5;

-- Check if there are any projects in the main projects table
SELECT 
    COUNT(*) as total_projects,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_projects
FROM projects;

-- Final success message
SELECT 'Admin setup completed! You can now access the admin dashboard.' AS status;