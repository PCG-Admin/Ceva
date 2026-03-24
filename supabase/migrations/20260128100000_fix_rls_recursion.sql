-- =============================================================================
-- Fix infinite recursion in RLS policies
-- Creates mithon_get_user_role() to avoid conflicting with other projects'
-- get_user_role() function on the shared database.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mithon_get_user_role()
RETURNS public.mithon_user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.mithon_profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.mithon_get_user_role() TO authenticated;

-- =============================================================================
-- Fix mithon_profiles policies
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.mithon_profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.mithon_profiles FOR SELECT
  USING (public.mithon_get_user_role() = 'admin');

-- =============================================================================
-- Fix mithon_loads policies
-- =============================================================================

DROP POLICY IF EXISTS "Dispatchers and admins can view all loads" ON public.mithon_loads;
DROP POLICY IF EXISTS "Dispatchers and admins can create loads" ON public.mithon_loads;
DROP POLICY IF EXISTS "Dispatchers and admins can update loads" ON public.mithon_loads;
DROP POLICY IF EXISTS "Admins can delete loads" ON public.mithon_loads;

CREATE POLICY "Dispatchers and admins can view all loads"
  ON public.mithon_loads FOR SELECT
  USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can create loads"
  ON public.mithon_loads FOR INSERT
  WITH CHECK (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can update loads"
  ON public.mithon_loads FOR UPDATE
  USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Admins can delete loads"
  ON public.mithon_loads FOR DELETE
  USING (public.mithon_get_user_role() = 'admin');
