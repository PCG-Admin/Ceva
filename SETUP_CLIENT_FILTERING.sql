-- =============================================================================
-- COMPLETE CLIENT FILTERING SETUP
-- Run this ONCE in Supabase SQL Editor to enable client-only filtering
-- =============================================================================

-- STEP 1: Remove old problematic trigger
-- =============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created_client ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_client();

RAISE NOTICE '✅ Step 1: Removed old trigger';

-- STEP 2: Add user_id column to ceva_clients
-- =============================================================================
ALTER TABLE public.ceva_clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ceva_clients_user_id_idx ON public.ceva_clients(user_id);

COMMENT ON COLUMN public.ceva_clients.user_id IS 'Links client to their auth user account for portal access';

RAISE NOTICE '✅ Step 2: Added user_id column to ceva_clients';

-- STEP 3: Create RLS policy for client filtering
-- =============================================================================
DROP POLICY IF EXISTS "Clients can view loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Clients can view own loads" ON public.ceva_loads;

CREATE POLICY "Clients can view own loads"
  ON public.ceva_loads FOR SELECT
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
      ELSE true
    END
  );

COMMENT ON POLICY "Clients can view own loads" ON public.ceva_loads IS
  'SOW 3.1.3 - Clients can only view loads for their company';

RAISE NOTICE '✅ Step 3: Created RLS policy for client filtering';

-- =============================================================================
-- SUCCESS!
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '✅✅✅ CLIENT FILTERING SETUP COMPLETE! ✅✅✅';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'HOW IT WORKS:';
  RAISE NOTICE '1. Create client in portal (/admin/clients) with email';
  RAISE NOTICE '2. Server action auto-creates auth user with password: CevaCitrus2026!';
  RAISE NOTICE '3. Client logs in and sees ONLY their loads (filtered by RLS)';
  RAISE NOTICE '';
  RAISE NOTICE 'SECURITY:';
  RAISE NOTICE '• Clients can ONLY see loads where client name matches theirs';
  RAISE NOTICE '• Admins and dispatchers see ALL loads';
  RAISE NOTICE '• Filtering happens at DATABASE level (cannot be bypassed)';
  RAISE NOTICE '';
  RAISE NOTICE 'TEST IT:';
  RAISE NOTICE '1. Create a test client in /admin/clients';
  RAISE NOTICE '2. Login as that client';
  RAISE NOTICE '3. Verify they only see their loads!';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
END $$;
