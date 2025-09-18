-- Verify wallet_address columns exist in both profiles and projects tables
-- Run this to check the current database structure

-- Check profiles table wallet columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name LIKE '%wallet%'
ORDER BY column_name;

-- Check projects table wallet columns  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name LIKE '%wallet%'
ORDER BY column_name;

-- Show sample data from projects with wallet addresses
SELECT 
  id, 
  title, 
  user_id, 
  wallet_address, 
  mint_address,
  status,
  created_at
FROM projects 
WHERE wallet_address IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;

-- Count projects with and without wallet addresses
SELECT 
  CASE 
    WHEN wallet_address IS NOT NULL THEN 'With Wallet'
    ELSE 'Without Wallet'
  END as wallet_status,
  COUNT(*) as project_count
FROM projects 
GROUP BY (wallet_address IS NOT NULL);

-- Show user profiles with wallet addresses
SELECT 
  id,
  email,
  full_name,
  wallet_address,
  wallet_connected_at,
  wallet_verified
FROM profiles 
WHERE wallet_address IS NOT NULL
ORDER BY wallet_connected_at DESC
LIMIT 5;