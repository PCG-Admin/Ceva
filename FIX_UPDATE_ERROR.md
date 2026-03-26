# Fix "Error updating load status" Issue

## Problem
You're seeing this error when trying to change load status:
```
Error updating load status: {}
```

## Cause
The RLS (Row Level Security) policies on `ceva_loads` table are blocking the update. This happened because the migration policies had some conflicts.

## Quick Fix (2 minutes)

### Step 1: Go to Supabase SQL Editor
https://supabase.com/dashboard/project/easbbrhgrdagpmjgzdyg/sql

### Step 2: Run this SQL
Copy and paste the entire content of `FIX_RLS_POLICIES.sql` into the SQL editor and click "Run"

**OR** run this shorter version:

```sql
-- Drop conflicting policies
DROP POLICY IF EXISTS "Staff and drivers can update loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Users and admins can update loads" ON public.ceva_loads;

-- Create proper admin update policy
CREATE POLICY "Staff can update all loads"
  ON public.ceva_loads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );
```

### Step 3: Refresh the App
1. Go back to your app: http://localhost:3000/customer
2. Refresh the page (F5 or Ctrl+R)
3. Try changing the load status again

## Verify It Works

1. Click on the load "Mnguni"
2. Try to change status from "Pending" to "Assigned"
3. Should work without errors now!

## What This Does

The SQL:
1. Removes the conflicting update policy
2. Creates a new policy that properly allows admins and dispatchers to update loads
3. Adds proper `USING` and `WITH CHECK` clauses

## If Still Not Working

Check if your user has the admin role:

```sql
SELECT
  u.email,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN ceva_profiles p ON p.id = u.id
WHERE u.id = auth.uid();
```

Should show `role = 'admin'`

If role is missing, run:

```sql
-- Get your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Insert profile (replace <user-id> with ID from above)
INSERT INTO ceva_profiles (id, email, full_name, role)
VALUES (
  '<user-id>',
  'your-email@example.com',
  'Admin User',
  'admin'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin';
```

## Additional Checks

### Test Update Permission
```sql
-- This should return "YES - User can update loads"
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM ceva_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
    THEN 'YES - User can update loads'
    ELSE 'NO - User cannot update loads (check your role!)'
  END as can_update_loads;
```

### View All Policies
```sql
SELECT policyname, cmd as operation
FROM pg_policies
WHERE tablename = 'ceva_loads'
ORDER BY cmd, policyname;
```

Expected policies:
- `Staff can view all loads` (SELECT)
- `Clients can view own loads` (SELECT)
- `Drivers can view assigned loads` (SELECT)
- `Staff can create loads` (INSERT)
- `Clients can create own loads` (INSERT)
- `Staff can update all loads` (UPDATE)
- `Drivers can update assigned loads` (UPDATE)
- `Only admins can delete loads` (DELETE)

---

**After running the fix, the error should be gone and you can update load statuses!**
