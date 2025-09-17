# Wallet Connection Setup Instructions

## 🚀 Quick Setup Guide

### Step 1: Add Database Columns

You need to add wallet-related columns to your `profiles` table in Supabase.

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor"
3. Copy and paste this SQL script:

```sql
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
```

4. Click "Run" to execute the script

**Option B: Using the provided SQL file**
1. Use the `add_wallet_columns.sql` file in the project root
2. Execute it in your Supabase SQL Editor

### Step 2: Start the Wallet API Server

The wallet connection system requires a separate API server running on port 3001.

```bash
# Navigate to server directory
cd server

# Start the wallet API server
npm run start:wallet

# For development with auto-restart
npm run dev:wallet
```

You should see:
```
🔗 Wallet API running on port 3001
📊 Environment: development
🔗 CORS origin: http://localhost:3000
```

### Step 3: Verify Setup

1. **Database Check**: After running the SQL, verify the columns exist:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name LIKE 'wallet%';
   ```

2. **API Check**: Test the wallet API:
   ```bash
curl http://localhost:3001/health
   ```

3. **Frontend Check**: The ConnectWallet component should now work without errors.

## 🔧 Troubleshooting

### Database Issues
- **Error**: `column profiles.wallet_address does not exist`
- **Solution**: Run the SQL script above in your Supabase dashboard

### API Connection Issues
- **Error**: `GET http://localhost:3001/wallet net::ERR_CONNECTION_REFUSED`
- **Solution**: Start the wallet API server with `npm run start:wallet`

### CORS Issues
- **Error**: CORS policy errors
- **Solution**: Ensure `CORS_ORIGIN=http://localhost:3000` in your server `.env` file

## 📝 What Each Column Does

- `wallet_address` (TEXT): Stores the Solana wallet public key address
- `wallet_connected_at` (TIMESTAMP): Records when the wallet was first connected
- `wallet_verified` (BOOLEAN): Indicates if the wallet address has been verified

## 🚀 Features Available After Setup

- ✅ Persistent wallet address storage
- ✅ Wallet connection status tracking
- ✅ Wallet address validation
- ✅ Duplicate wallet prevention
- ✅ Wallet mismatch detection
- ✅ Secure API with authentication
- ✅ User-friendly wallet management UI

## 📋 Environment Variables

Ensure your `server/.env` file contains:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CORS_ORIGIN=http://localhost:3000
PORT=3001
```

---

After completing these steps, your wallet connection system will be fully functional!