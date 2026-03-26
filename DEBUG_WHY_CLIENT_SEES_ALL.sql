-- =============================================================================
-- DEBUG: Why is client seeing all loads?
-- =============================================================================

-- Check 1: Is RLS enabled on ceva_loads table?
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'ceva_loads';

-- Check 2: What policies exist?
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as "Command",
  qual as "USING clause"
FROM pg_policies
WHERE tablename = 'ceva_loads'
ORDER BY policyname;

-- Check 3: What is the current user when logged in as azande?
-- (You'll need to check this in the browser console when logged in as client)
-- SELECT auth.uid(), auth.email();

-- Check 4: Is the client properly linked?
SELECT
  c.id as client_id,
  c.name,
  c.email,
  c.user_id,
  p.role,
  CASE
    WHEN c.user_id IS NULL THEN '❌ NOT LINKED - user_id is NULL'
    WHEN p.id IS NULL THEN '❌ NO PROFILE - profile does not exist'
    WHEN p.role != 'client' THEN '⚠️ WRONG ROLE - role is: ' || p.role
    ELSE '✅ Correctly set up'
  END as status
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON p.id = c.user_id
WHERE c.email = 'azande@pc-group.net';

-- Check 5: Does ceva_get_user_role() function work?
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'ceva_get_user_role';

-- Check 6: Are there other policies that might override?
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'ceva_loads'
AND cmd = 'SELECT';

-- =============================================================================
-- LIKELY ISSUES:
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'CHECK THESE RESULTS:';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. RLS Enabled should be TRUE';
  RAISE NOTICE '2. Policy "Clients can view own loads" should exist';
  RAISE NOTICE '3. Client should have user_id linked and role = client';
  RAISE NOTICE '';
  RAISE NOTICE 'MOST LIKELY ISSUE:';
  RAISE NOTICE '• RLS is not enabled on ceva_loads table';
  RAISE NOTICE '• OR there is another policy allowing all access';
  RAISE NOTICE '• OR client user_id is not linked';
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
END $$;
