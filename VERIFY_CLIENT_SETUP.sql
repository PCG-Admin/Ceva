-- =============================================================================
-- VERIFICATION SCRIPT: Check if client portal is set up correctly
-- Run this in Supabase SQL Editor to verify setup
-- =============================================================================

-- Check 1: Verify user_id column exists on ceva_clients
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ceva_clients'
    AND column_name = 'user_id'
  ) THEN
    RAISE NOTICE '✅ Check 1: user_id column exists on ceva_clients';
  ELSE
    RAISE NOTICE '❌ Check 1: FAILED - user_id column missing on ceva_clients';
    RAISE NOTICE '   → Run FINAL_CLIENT_SETUP.sql to fix';
  END IF;
END $$;

-- Check 2: Verify RLS policy exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'ceva_loads'
    AND policyname = 'Clients can view own loads'
  ) THEN
    RAISE NOTICE '✅ Check 2: RLS policy "Clients can view own loads" exists';
  ELSE
    RAISE NOTICE '❌ Check 2: FAILED - RLS policy missing';
    RAISE NOTICE '   → Run FINAL_CLIENT_SETUP.sql to fix';
  END IF;
END $$;

-- Check 3: Verify ceva_get_user_role() function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'ceva_get_user_role'
  ) THEN
    RAISE NOTICE '✅ Check 3: ceva_get_user_role() function exists';
  ELSE
    RAISE NOTICE '❌ Check 3: FAILED - ceva_get_user_role() function missing';
    RAISE NOTICE '   → Run database migrations to fix';
  END IF;
END $$;

-- Check 4: Verify client role exists in enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ceva_user_role'
    AND e.enumlabel = 'client'
  ) THEN
    RAISE NOTICE '✅ Check 4: "client" role exists in ceva_user_role enum';
  ELSE
    RAISE NOTICE '❌ Check 4: FAILED - "client" role missing from enum';
    RAISE NOTICE '   → Run database migrations to fix';
  END IF;
END $$;

-- =============================================================================
-- Display current setup
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'CURRENT CLIENT SETUP STATUS';
  RAISE NOTICE '=============================================================================';
END $$;

-- Show all clients and their auth status
SELECT
  c.name as "Client Name",
  c.email as "Email",
  CASE
    WHEN c.user_id IS NULL THEN '❌ No auth user'
    ELSE '✅ Linked'
  END as "Auth Status",
  CASE
    WHEN p.role = 'client' THEN '✅ Client'
    WHEN p.role IS NOT NULL THEN '⚠️ ' || p.role
    ELSE '❌ No role'
  END as "Role",
  CASE
    WHEN c.user_id IS NOT NULL AND p.role = 'client' THEN '✅ Ready'
    WHEN c.user_id IS NULL THEN '⏳ Need auth user'
    WHEN p.role IS NULL OR p.role != 'client' THEN '⏳ Need role set'
    ELSE '⚠️ Check setup'
  END as "Status"
FROM public.ceva_clients c
LEFT JOIN public.ceva_profiles p ON p.id = c.user_id
ORDER BY c.name;

-- =============================================================================
-- Instructions for incomplete setups
-- =============================================================================

DO $$
DECLARE
  incomplete_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO incomplete_count
  FROM public.ceva_clients c
  LEFT JOIN public.ceva_profiles p ON p.id = c.user_id
  WHERE c.email IS NOT NULL
    AND (c.user_id IS NULL OR p.role IS NULL OR p.role != 'client');

  IF incomplete_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Found % client(s) with incomplete setup', incomplete_count;
    RAISE NOTICE '';
    RAISE NOTICE 'For each incomplete client:';
    RAISE NOTICE '1. Create auth user in Supabase Dashboard (Authentication → Users)';
    RAISE NOTICE '   - Email: (same as client email)';
    RAISE NOTICE '   - Password: CevaCitrus2026!';
    RAISE NOTICE '   - Auto Confirm: YES';
    RAISE NOTICE '2. Run linking SQL:';
    RAISE NOTICE '   UPDATE ceva_clients';
    RAISE NOTICE '   SET user_id = (SELECT id FROM auth.users WHERE email = ''CLIENT_EMAIL'')';
    RAISE NOTICE '   WHERE email = ''CLIENT_EMAIL'';';
    RAISE NOTICE '';
    RAISE NOTICE '   UPDATE ceva_profiles';
    RAISE NOTICE '   SET role = ''client''::ceva_user_role';
    RAISE NOTICE '   WHERE email = ''CLIENT_EMAIL'';';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ All clients with emails are properly set up!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- Display clients needing setup
-- =============================================================================

-- Show detailed info for incomplete clients
WITH incomplete_clients AS (
  SELECT
    c.name,
    c.email,
    c.user_id,
    p.role,
    CASE
      WHEN c.email IS NULL THEN 'Missing email - add email to client record'
      WHEN c.user_id IS NULL THEN 'Need to create auth user + link'
      WHEN p.role IS NULL THEN 'Need to set role to client'
      WHEN p.role != 'client' THEN 'Need to change role to client (currently: ' || p.role || ')'
      ELSE 'Unknown issue'
    END as action_needed
  FROM public.ceva_clients c
  LEFT JOIN public.ceva_profiles p ON p.id = c.user_id
  WHERE c.user_id IS NULL OR p.role IS NULL OR p.role != 'client'
)
SELECT * FROM incomplete_clients
WHERE email IS NOT NULL
ORDER BY name;
