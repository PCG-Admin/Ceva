-- =============================================================================
-- Fix azande@pc-group.net client to enable login
-- =============================================================================

-- BEFORE RUNNING THIS:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add User
-- 2. Email: azande@pc-group.net
-- 3. Password: CevaCitrus2026!
-- 4. Auto Confirm User: ✅ YES (CHECK THIS!)
-- 5. Click "Create User"
-- 6. THEN run this SQL below:

-- =============================================================================

-- Step 1: Link the client record to the auth user
UPDATE public.ceva_clients
SET user_id = (SELECT id FROM auth.users WHERE email = 'azande@pc-group.net')
WHERE email = 'azande@pc-group.net';

-- Step 2: Set the role to 'client' in the profile
UPDATE public.ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'azande@pc-group.net';

-- Step 3: Verify the setup
SELECT
  c.name as "Client Name",
  c.email as "Email",
  c.user_id as "User ID",
  p.role as "Role",
  CASE
    WHEN c.user_id IS NOT NULL AND p.role = 'client' THEN '✅ Ready to login!'
    WHEN c.user_id IS NULL THEN '❌ User not created in Supabase yet'
    WHEN p.role IS NULL THEN '❌ Profile missing'
    WHEN p.role != 'client' THEN '⚠️ Wrong role: ' || p.role
    ELSE '⚠️ Unknown issue'
  END as "Status"
FROM public.ceva_clients c
LEFT JOIN public.ceva_profiles p ON p.id = c.user_id
WHERE c.email = 'azande@pc-group.net';

-- Expected result:
-- Client Name | Email                   | User ID      | Role   | Status
-- ------------|-------------------------|--------------|--------|------------------
-- [name]      | azande@pc-group.net     | [uuid]       | client | ✅ Ready to login!
