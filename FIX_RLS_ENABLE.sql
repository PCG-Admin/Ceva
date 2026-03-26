-- =============================================================================
-- FIX: Enable RLS and ensure client filtering works
-- =============================================================================

-- STEP 1: Enable RLS on ceva_loads table (CRITICAL!)
-- =============================================================================
ALTER TABLE public.ceva_loads ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ Step 1: RLS enabled on ceva_loads';

-- STEP 2: Drop ALL existing SELECT policies on ceva_loads
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'ceva_loads'
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ceva_loads', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

RAISE NOTICE '✅ Step 2: Dropped all old SELECT policies';

-- STEP 3: Create single comprehensive SELECT policy
-- =============================================================================
CREATE POLICY "Clients can view own loads"
  ON public.ceva_loads
  FOR SELECT
  TO authenticated
  USING (
    -- Check user role
    CASE public.ceva_get_user_role()
      -- If user is a client, filter to only their loads
      WHEN 'client' THEN
        EXISTS (
          SELECT 1
          FROM public.ceva_clients c
          WHERE c.user_id = auth.uid()
            AND (c.name = ceva_loads.client OR c.id = ceva_loads.client_id)
        )
      -- If user is admin or dispatcher, show all loads
      WHEN 'admin' THEN true
      WHEN 'dispatcher' THEN true
      -- Default: no access
      ELSE false
    END
  );

RAISE NOTICE '✅ Step 3: Created comprehensive SELECT policy';

-- STEP 4: Verify setup
-- =============================================================================
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check RLS is enabled
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'ceva_loads';

  -- Check policy exists
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'ceva_loads'
  AND policyname = 'Clients can view own loads';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'VERIFICATION:';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RLS Enabled: %', CASE WHEN rls_enabled THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Policy Created: %', CASE WHEN policy_count > 0 THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '';

  IF rls_enabled AND policy_count > 0 THEN
    RAISE NOTICE '✅✅✅ CLIENT FILTERING IS NOW ACTIVE! ✅✅✅';
    RAISE NOTICE '';
    RAISE NOTICE 'Clients will ONLY see loads where:';
    RAISE NOTICE '  • client field matches their company name';
    RAISE NOTICE '  • OR client_id matches their client ID';
    RAISE NOTICE '';
    RAISE NOTICE 'Admins and dispatchers see ALL loads.';
  ELSE
    RAISE NOTICE '❌ SETUP INCOMPLETE - Please check the results above';
  END IF;

  RAISE NOTICE '=================================================================';
END $$;

-- STEP 5: Show current policies for verification
-- =============================================================================
SELECT
  policyname as "Policy Name",
  cmd as "Command",
  roles as "Roles",
  CASE WHEN qual IS NOT NULL THEN 'Has USING clause' ELSE 'No filter' END as "Filter"
FROM pg_policies
WHERE tablename = 'ceva_loads'
ORDER BY cmd, policyname;
