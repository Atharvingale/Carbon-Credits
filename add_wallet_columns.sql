-- Add wallet-related columns to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS wallet_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN DEFAULT FALSE;

-- Create index on wallet_address for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);

-- Add constraint to ensure wallet_address is unique (if not null)
ALTER TABLE profiles 
ADD CONSTRAINT unique_wallet_address UNIQUE (wallet_address) 
DEFERRABLE INITIALLY DEFERRED;