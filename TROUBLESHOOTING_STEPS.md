# 🚨 Troubleshooting Guide - Project Submissions Not Working

## 🔍 Step 1: Run Database Diagnostics

First, let's check if your database is properly set up:

### In Supabase SQL Editor:
```sql
-- Copy and paste this into Supabase SQL Editor to check your setup
-- 1. Check if project_submissions table exists
SELECT 'project_submissions table exists' as status
FROM information_schema.tables 
WHERE table_name = 'project_submissions';

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'project_submissions'
ORDER BY ordinal_position;

-- 3. Check if there's any data
SELECT COUNT(*) as total_submissions FROM project_submissions;

-- 4. Check profiles table for users
SELECT COUNT(*) as total_users, 
       COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
FROM profiles;
```

## 🔧 Step 2: Run the Complete Migration

If the queries above show empty results, you need to run the migration:

### Execute in Supabase SQL Editor:
1. **Open Supabase Dashboard** → **SQL Editor**
2. **Copy entire contents** of `complete_database_migration.sql`
3. **Execute the SQL**
4. **Check for any error messages**

## 🧪 Step 3: Use Debug Dashboard

I've created a debug dashboard to help diagnose issues:

### Add to your App.js or Router:
```jsx
import DebugAdminDashboard from './components/DebugAdminDashboard';

// Add a route for debugging
<Route path="/debug-admin" element={<DebugAdminDashboard />} />
```

### Access the Debug Dashboard:
1. Navigate to `http://localhost:3000/debug-admin`
2. Check all sections for errors
3. Try the "Test Submission" button

## 📋 Step 4: Check Common Issues

### Issue 1: User Not Logged In
**Symptom:** Form submission fails with authentication error
**Solution:**
```sql
-- Check if user is properly logged in
SELECT auth.uid(); -- Should return your user ID
```

### Issue 2: Profile Missing
**Symptom:** User logged in but profile doesn't exist
**Solution:**
```sql
-- Create profile for logged-in user
INSERT INTO profiles (id, email, role, first_name, last_name)
VALUES (
    auth.uid(), 
    'your-email@domain.com', 
    'user', 
    'Your First Name', 
    'Your Last Name'
) ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;
```

### Issue 3: RLS Policies Blocking Access
**Symptom:** Tables exist but queries return empty results
**Solution:**
```sql
-- Temporarily disable RLS for testing (DANGEROUS - only for debugging)
ALTER TABLE project_submissions DISABLE ROW LEVEL SECURITY;
-- Test your queries, then re-enable:
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

-- Or check what policies exist:
SELECT * FROM pg_policies WHERE tablename = 'project_submissions';
```

### Issue 4: Admin Role Missing
**Symptom:** Admin dashboard shows no projects even though they exist
**Solution:**
```sql
-- Grant admin role to your account
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@domain.com';

-- Verify admin role
SELECT role FROM profiles WHERE email = 'your-email@domain.com';
```

## 🔄 Step 5: Test the Complete Flow

### Test Form Submission:
1. **Log in** to your app
2. **Navigate** to project submission form
3. **Fill out all fields** including ecosystem type
4. **Submit** and check browser console for errors
5. **Check Supabase Table Editor** for new data

### Test Manual Insert:
```sql
-- Insert test data manually to verify table works
INSERT INTO project_submissions (
    user_id,
    title,
    description,
    location,
    ecosystem_type,
    project_area,
    organization_name,
    organization_email,
    carbon_data
) VALUES (
    (SELECT id FROM profiles LIMIT 1), -- Use any existing user
    'Manual Test Project',
    'Test description',
    'Test Location',
    'mangrove',
    100.0,
    'Test Org',
    'test@example.com',
    '{"bulk_density": 1.2, "depth": 1.0, "carbon_percent": 3.5}'
);
```

## 🚨 Step 6: Check Environment Variables

### Verify your `.env` file:
```env
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Test Supabase Connection:
```jsx
// Add this to any component to test connection
const testConnection = async () => {
  const { data, error } = await supabase.from('profiles').select('count');
  console.log('Connection test:', { data, error });
};
```

## 📊 Step 7: Browser Console Debugging

### Open Browser Developer Tools:
1. **Right-click** → **Inspect** → **Console** tab
2. **Submit a project** and watch for error messages
3. **Look for network errors** in Network tab
4. **Check** if Supabase calls are being made

### Common Console Errors:
- `PGRST204`: Table/column doesn't exist → Run migration
- `JWT expired`: User not authenticated → Re-login
- `Row level security`: Permission denied → Check RLS policies
- `violates foreign key`: User profile missing → Create profile

## 🎯 Step 8: Verify Each Component

### Check Form Component:
```jsx
// Add logging to your form submission
const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('📤 Submitting form data:', formData);
  console.log('👤 Current user:', user);
  
  // ... rest of submission code
};
```

### Check Admin Dashboard:
```jsx
// Add logging to admin dashboard
const fetchProjects = async () => {
  console.log('🔍 Fetching projects...');
  const { data, error } = await supabase.from('project_submissions').select('*');
  console.log('📋 Projects result:', { data, error });
};
```

## ✅ Success Checklist

When everything is working, you should see:

- [ ] ✅ Migration executed without errors
- [ ] ✅ `project_submissions` table exists with data
- [ ] ✅ User profile exists with correct role
- [ ] ✅ Form submission creates database entries
- [ ] ✅ Admin dashboard shows submitted projects
- [ ] ✅ No console errors during submission
- [ ] ✅ RLS policies allow appropriate access

## 🆘 Still Not Working?

If you're still having issues:

1. **Share the error messages** from browser console
2. **Run the debug SQL queries** and share results
3. **Check Supabase logs** in Dashboard → Logs
4. **Try the debug dashboard** and share what it shows

### Quick Reset (Last Resort):
```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS project_submissions CASCADE;
-- Then re-run the complete migration
```

The most common issues are:
1. **Migration not run** → Run `complete_database_migration.sql`
2. **User not logged in** → Check authentication
3. **Profile missing** → Create user profile
4. **RLS blocking access** → Check policies and user roles

Let's debug this step by step! 🔍