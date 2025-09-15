# Database Setup Guide for Carbon Credits Project

## 🚀 Quick Setup Steps

### Step 1: Run Database Migration
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `project_submissions_migration.sql` 
4. Click **Run** to execute the migration

### Step 2: Set Up Admin Access (Optional)
1. In the **SQL Editor**, copy and paste the contents of `admin_policies_migration.sql`
2. **Replace** `'your-admin-email@domain.com'` with your actual admin email address
3. Uncomment the last line and replace with your email:
   ```sql
   SELECT grant_admin_role('your-actual-email@domain.com');
   ```
4. Click **Run** to execute

### Step 3: Verify Setup
Run this query in SQL Editor to verify your table structure:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'project_submissions'
ORDER BY ordinal_position;
```

## 📋 What This Creates

### `project_submissions` Table Structure:
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users
- `title` (TEXT) - Project name
- `description` (TEXT) - Project description  
- `location` (TEXT) - Project location
- `ecosystem_type` (TEXT) - Type of ecosystem
- `project_area` (DECIMAL) - Project area in hectares
- `estimated_credits` (DECIMAL) - Estimated carbon credits
- `organization_name` (TEXT) - Organization name
- `organization_email` (TEXT) - Organization email
- `contact_phone` (TEXT) - Contact phone
- `carbon_data` (JSONB) - All carbon parameters as JSON
- `status` (TEXT) - Project status (pending, approved, rejected, etc.)
- `calculated_credits` (DECIMAL) - Calculated carbon credits
- `calculation_data` (JSONB) - Calculation details
- `calculation_timestamp` (TIMESTAMP) - When calculation was done
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

### `organizations` Table (Optional):
- `id` (UUID) - Primary key
- `name` (TEXT) - Organization name
- `contact_email` (TEXT) - Contact email
- `phone` (TEXT) - Phone number
- `address` (TEXT) - Address
- `created_at` / `updated_at` (TIMESTAMP)

### Security Policies:
- ✅ Users can insert their own projects
- ✅ Users can view their own projects  
- ✅ Users can update pending projects
- ✅ Admins can view/update all projects
- ✅ Row Level Security enabled

## 🔧 Troubleshooting

### If you get "table already exists" errors:
The migration uses `IF NOT EXISTS` so it's safe to run multiple times.

### If you get "column already exists" errors:
The migration uses `ADD COLUMN IF NOT EXISTS` so it's safe to run.

### If RLS policies conflict:
The migration drops existing policies before creating new ones.

### If you need to reset everything:
```sql
-- DANGER: This will delete all data!
DROP TABLE IF EXISTS project_submissions CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
-- Then run the migration again
```

## 🎯 After Database Setup

1. **Test the form submission** - Try submitting a project through your React form
2. **Check the data** - Verify data appears in Supabase table editor
3. **Test admin dashboard** - Ensure admins can see all projects
4. **Test calculations** - Use the Carbon Credit Calculator dialog

## 📊 Sample Data (Optional)

If you want to add test data, run this in SQL Editor:
```sql
-- Insert sample organizations
INSERT INTO organizations (name, contact_email) VALUES 
('Marine Conservation Society', 'info@marineconservation.org'),
('Coastal Restoration Initiative', 'contact@coastalrestoration.org');

-- Insert sample project (replace user_id with actual user ID)
INSERT INTO project_submissions (
  user_id, 
  title, 
  description, 
  location, 
  ecosystem_type, 
  project_area,
  organization_name,
  organization_email,
  carbon_data,
  status
) VALUES (
  'your-user-uuid-here',
  'Sample Mangrove Restoration',
  'A test mangrove restoration project for demonstration',
  'Gulf Coast, Florida',
  'mangrove',
  100.0,
  'Test Organization',
  'test@example.com',
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
);
```

## ✅ Verification Checklist

- [ ] Database migration executed successfully
- [ ] Table `project_submissions` exists with all columns
- [ ] RLS policies are active
- [ ] Admin policies setup (if needed)
- [ ] Form submission works without errors
- [ ] Data appears in Supabase dashboard
- [ ] Admin dashboard can fetch projects
- [ ] Carbon credit calculator works

## 🆘 Need Help?

If you encounter any issues:
1. Check the Supabase logs in Dashboard > Logs
2. Verify your environment variables are correct
3. Ensure your user is authenticated
4. Check the browser console for JavaScript errors

Your database should now be ready for the Carbon Credits application! 🎉