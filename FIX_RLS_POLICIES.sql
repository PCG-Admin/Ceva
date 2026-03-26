-- =============================================================================
-- Fix RLS Policies for Load Updates
-- Run this in Supabase SQL Editor to fix the update permission error
-- =============================================================================

-- First, check current user's role
SELECT
  u.email,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN ceva_profiles p ON p.id = u.id
WHERE u.email LIKE '%admin%'
LIMIT 5;

-- Check existing policies on ceva_loads
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'ceva_loads'
ORDER BY cmd, policyname;

-- Drop all existing policies on ceva_loads and recreate them properly
DROP POLICY IF EXISTS "Users and admins can view loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Users and admins can create loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Users and admins can update loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Admins can delete loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Clients can view own loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Clients can create loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Drivers can view assigned loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Staff and drivers can update loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Only admins can delete loads" ON public.ceva_loads;

-- =============================================================================
-- SELECT Policies (Who can view loads)
-- =============================================================================

-- Admin and Dispatcher can view all loads
CREATE POLICY "Staff can view all loads"
  ON public.ceva_loads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Clients can view their own loads
CREATE POLICY "Clients can view own loads"
  ON public.ceva_loads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid()
      AND role = 'client'
      AND ceva_loads.client_id = auth.uid()
    )
  );

-- Drivers can view assigned loads
CREATE POLICY "Drivers can view assigned loads"
  ON public.ceva_loads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles p
      JOIN public.ceva_drivers d ON d.user_id = p.id
      WHERE p.id = auth.uid()
      AND p.role = 'driver'
      AND d.id = ceva_loads.driver_id
    )
  );

-- =============================================================================
-- INSERT Policies (Who can create loads)
-- =============================================================================

-- Admin and Dispatcher can create loads
CREATE POLICY "Staff can create loads"
  ON public.ceva_loads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Clients can create their own loads
CREATE POLICY "Clients can create own loads"
  ON public.ceva_loads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid()
      AND role = 'client'
    )
    AND (client_id = auth.uid() OR client_id IS NULL)
  );

-- =============================================================================
-- UPDATE Policies (Who can update loads)
-- =============================================================================

-- Admin and Dispatcher can update all loads
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

-- Drivers can update their assigned loads (milestone dates, status)
CREATE POLICY "Drivers can update assigned loads"
  ON public.ceva_loads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles p
      JOIN public.ceva_drivers d ON d.user_id = p.id
      WHERE p.id = auth.uid()
      AND p.role = 'driver'
      AND d.id = ceva_loads.driver_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles p
      JOIN public.ceva_drivers d ON d.user_id = p.id
      WHERE p.id = auth.uid()
      AND p.role = 'driver'
      AND d.id = ceva_loads.driver_id
    )
  );

-- =============================================================================
-- DELETE Policies (Who can delete loads)
-- =============================================================================

-- Only Admins can delete loads
CREATE POLICY "Only admins can delete loads"
  ON public.ceva_loads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =============================================================================
-- Verify policies were created
-- =============================================================================

SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_check,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_status
FROM pg_policies
WHERE tablename = 'ceva_loads'
ORDER BY cmd, policyname;

-- Test if current user can update
-- This should return true for admin users
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM ceva_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
    THEN 'YES - User can update loads'
    ELSE 'NO - User cannot update loads'
  END as can_update_loads;
