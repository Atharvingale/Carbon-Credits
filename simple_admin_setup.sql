-- Simple Admin Setup
-- Run this AFTER running clean_database_fix.sql
-- Replace 'your-email@domain.com' with your actual email

-- Set your account as admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@domain.com';

-- Verify admin role
SELECT 
    email,
    role,
    full_name
FROM profiles 
WHERE email = 'your-email@domain.com';

-- Create a test submission for testing (optional)
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
    (SELECT id FROM profiles WHERE email = 'your-email@domain.com'), 
    'Test Mangrove Project',
    'Test project for dashboard verification',
    'Test Location, India',
    'mangrove',
    100.0,
    1500,
    'Test Organization',
    'test@example.com',
    '+91-1234567890',
    '{
        "bulk_density": 1.2,
        "depth": 1.0,
        "carbon_percent": 3.5,
        "agb_biomass": 150,
        "bgb_biomass": 75,
        "carbon_fraction": 0.47,
        "ch4_flux": 5.2,
        "n2o_flux": 0.8,
        "baseline_carbon_stock": 120,
        "uncertainty_deduction": 0.2
    }',
    'pending'
) ON CONFLICT DO NOTHING;

-- Test the views
SELECT 'ADMIN VIEW TEST' as test, COUNT(*) as count FROM admin_project_submissions;
SELECT 'USER VIEW TEST' as test, COUNT(*) as count FROM user_projects;

-- Show recent data
SELECT 
    title,
    status,
    organization_name,
    created_at::date
FROM project_submissions 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'Admin setup completed!' AS status;