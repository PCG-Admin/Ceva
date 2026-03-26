-- =============================================================================
-- FIX: Remove conflicting policies that let clients see all loads
-- =============================================================================

-- The problem: Multiple SELECT policies use OR logic
-- If ANY policy returns true, the user can see the row
-- The "Users and admins can view loads" policy is letting clients through

-- STEP 1: Drop the conflicting policies
-- =============================================================================
DROP POLICY IF EXISTS "Users and admins can view loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Drivers can view assigned loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Clients can view own loads" ON public.ceva_loads;

RAISE NOTICE '✅ Dropped all existing SELECT policies';

-- STEP 2: Create ONE comprehensive policy for all roles
-- =============================================================================
CREATE POLICY "Role-based load access"
  ON public.ceva_loads
  FOR SELECT
  TO authenticated
  USING (
    CASE public.ceva_get_user_role()
      -- Admins see everything
      WHEN 'admin' THEN true

      -- Dispatchers see everything
      WHEN 'dispatcher' THEN true

      -- Clients see only their own loads
      WHEN 'client' THEN
        EXISTS (
          SELECT 1
          FROM public.ceva_clients c
          WHERE c.user_id = auth.uid()
            AND (c.name = ceva_loads.client OR c.id = ceva_loads.client_id)
        )

      -- Drivers see only their assigned loads
      WHEN 'driver' THEN
        EXISTS (
          SELECT 1
          FROM public.ceva_drivers d
          WHERE d.user_id = auth.uid()
            AND d.id = ceva_loads.driver_id
        )

      -- Default: no access
      ELSE false
    END
  );

COMMENT ON POLICY "Role-based load access" ON public.ceva_loads IS
  'Single policy for all roles: admin/dispatcher see all, clients see own, drivers see assigned';

RAISE NOTICE '✅ Created single comprehensive policy';

-- STEP 3: Verify only one SELECT policy exists
-- =============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'ceva_loads'
  AND cmd = 'SELECT';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'VERIFICATION:';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Number of SELECT policies: %', policy_count;
  RAISE NOTICE '';

  IF policy_count = 1 THEN
    RAISE NOTICE '✅✅✅ FIXED! Only ONE policy exists now';
    RAISE NOTICE '';
    RAISE NOTICE 'Access rules:';
    RAISE NOTICE '  • Admins: See ALL loads';
    RAISE NOTICE '  • Dispatchers: See ALL loads';
    RAISE NOTICE '  • Clients: See ONLY their loads (filtered by name)';
    RAISE NOTICE '  • Drivers: See ONLY assigned loads';
    RAISE NOTICE '';
    RAISE NOTICE 'Test by logging in as azande@pc-group.net';
  ELSE
    RAISE NOTICE '⚠️  WARNING: % SELECT policies found (should be 1)', policy_count;
  END IF;

  RAISE NOTICE '=================================================================';
END $$;

-- STEP 4: Show the final policy
-- =============================================================================
SELECT
  policyname as "Policy Name",
  cmd as "Command",
  'All authenticated users' as "Who",
  'Role-based filtering' as "How"
FROM pg_policies
WHERE tablename = 'ceva_loads'
AND cmd = 'SELECT';
