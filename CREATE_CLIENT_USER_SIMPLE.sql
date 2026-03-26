-- =============================================================================
-- SIMPLE METHOD: Create Client User via Supabase Dashboard
-- =============================================================================
-- Since we can't modify auth.users directly due to triggers and permissions,
-- use Supabase Dashboard to create the user, then run this to set the role.
-- =============================================================================

-- After creating user via Supabase Dashboard Auth > Users > Add User:
-- Email: client@ceva.co.za
-- Password: CevaCitrus2026!
-- Then run this SQL:

-- Update the profile to client role
UPDATE public.ceva_profiles
SET role = 'client'::public.ceva_user_role
WHERE email = 'client@ceva.co.za';

-- Grant read-only access to loads for client role
-- Update existing RLS policies to include client role

-- Allow clients to view loads (read-only)
DROP POLICY IF EXISTS "Clients can view loads" ON public.ceva_loads;
CREATE POLICY "Clients can view loads"
  ON public.ceva_loads FOR SELECT
  USING (public.ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

-- Allow clients to view transporters (read-only)
DROP POLICY IF EXISTS "Clients can view transporters" ON public.ceva_transporters;
CREATE POLICY "Clients can view transporters"
  ON public.ceva_transporters FOR SELECT
  USING (public.ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

-- Allow clients to view drivers (read-only)
DROP POLICY IF EXISTS "Clients can view drivers" ON public.ceva_drivers;
CREATE POLICY "Clients can view drivers"
  ON public.ceva_drivers FOR SELECT
  USING (public.ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

-- Allow clients to view horses (read-only)
DROP POLICY IF EXISTS "Clients can view horses" ON public.ceva_horses;
CREATE POLICY "Clients can view horses"
  ON public.ceva_horses FOR SELECT
  USING (public.ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

-- Verify the user was created correctly
SELECT
  p.email,
  p.full_name,
  p.role,
  p.created_at
FROM ceva_profiles p
WHERE p.email = 'client@ceva.co.za';
