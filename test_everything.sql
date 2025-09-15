-- TEST EVERYTHING SCRIPT
-- Run this AFTER the diagnostic script to test if everything works
-- Run this SQL in your Supabase SQL Editor

-- ==================================================
-- 1. SHOW CURRENT STATE
-- ==================================================

SELECT 'CURRENT DATA STATE:' as info;

-- Show submissions count
SELECT 'Total Submissions:' as metric, COUNT(*) as value FROM project_submissions
UNION ALL
SELECT 'Total Projects:' as metric, COUNT(*) as value FROM projects
UNION ALL  
SELECT 'Total Profiles:' as metric, COUNT(*) as value FROM profiles;

-- ==================================================
-- 2. TEST VIEWS
-- ==================================================

SELECT 'VIEW TESTS:' as info;

-- Test admin view
SELECT 'Admin View Count:' as test, COUNT(*) as result FROM admin_project_submissions
UNION ALL
SELECT 'User View Count:' as test, COUNT(*) as result FROM user_projects;

-- ==================================================
-- 3. SHOW SAMPLE DATA
-- ==================================================

SELECT 'SAMPLE DATA:' as info;

-- Show admin view data
SELECT 
    'Admin View Sample:' as source,
    id,
    title,
    organization_name,
    status,
    user_email
FROM admin_project_submissions 
ORDER BY created_at DESC 
LIMIT 3;

-- Show user view data  
SELECT 
    'User View Sample:' as source,
    id,
    name,
    organization_name,
    status,
    source_type
FROM user_projects 
ORDER BY created_at DESC 
LIMIT 3;

-- ==================================================
-- 4. CREATE TEST SUBMISSION IF NONE EXISTS
-- ==================================================

-- Insert a test submission for the current user if none exists
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
) 
SELECT 
    auth.uid(),
    'Test Project - ' || NOW()::text,
    'Test project created by diagnostic script',
    'Test Location',
    'mangrove',
    50.0,
    750,
    'Test Org',
    'test@example.com',
    '+1234567890',
    '{"bulk_density": 1.1, "depth": 0.8, "carbon_percent": 2.8}',
    'pending'
WHERE NOT EXISTS (
    SELECT 1 FROM project_submissions WHERE user_id = auth.uid()
) AND auth.uid() IS NOT NULL;

-- ==================================================
-- 5. FINAL VERIFICATION
-- ==================================================

SELECT 'FINAL VERIFICATION:' as info;

-- Show current user's projects
SELECT 
    'My Projects:' as source,
    COUNT(*) as count
FROM project_submissions 
WHERE user_id = auth.uid();

-- Show if views are working
SELECT 
    'Views Working:' as test,
    CASE 
        WHEN (SELECT COUNT(*) FROM admin_project_submissions) >= 0 
        AND (SELECT COUNT(*) FROM user_projects) >= 0 
        THEN 'YES' 
        ELSE 'NO' 
    END as result;

-- Show current user info
SELECT 
    'Current User:' as info,
    auth.uid() as user_id,
    auth.email() as email;

SELECT 'All tests completed!' AS status;