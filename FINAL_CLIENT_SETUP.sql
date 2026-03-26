-- =============================================================================
-- CLIENT PORTAL SETUP - Final Working Version
-- Run this ONCE to enable client filtering
-- =============================================================================

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add user_id column to ceva_clients table
ALTER TABLE public.ceva_clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS ceva_clients_user_id_idx ON public.ceva_clients(user_id);

-- Add comment
COMMENT ON COLUMN public.ceva_clients.user_id IS 'Links client to their auth user account for portal access';

-- =============================================================================
-- RLS POLICY: Clients can only see their own loads
-- =============================================================================

-- Remove old policy if exists
DROP POLICY IF EXISTS "Clients can view loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Clients can view own loads" ON public.ceva_loads;

-- Create new policy with proper filtering
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE '✅ Client portal setup complete!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create client in system (/admin/clients)';
  RAISE NOTICE '2. Create user in Supabase Dashboard:';
  RAISE NOTICE '   - Email: client email';
  RAISE NOTICE '   - Password: CevaCitrus2026!';
  RAISE NOTICE '   - Auto Confirm: YES';
  RAISE NOTICE '3. Run link SQL (see below)';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
END $$;

-- =============================================================================
-- EXAMPLE: Link a client to their user account
-- Copy and modify this for each client
-- =============================================================================

/*
-- Template: Replace 'client@example.com' with actual client email

-- Step 1: Link user to client
UPDATE ceva_clients
SET user_id = (SELECT id FROM auth.users WHERE email = 'client@example.com')
WHERE email = 'client@example.com';

-- Step 2: Set role to client
UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'client@example.com';

-- Step 3: Verify (should show client name, email, role='client', linked=true)
SELECT
  c.name as client_name,
  c.email,
  p.role,
  c.user_id IS NOT NULL as linked
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON c.user_id = p.id
WHERE c.email = 'client@example.com';
*/
