-- =============================================================================
-- Add Driver Role to Ceva Logistics TMS
-- This migration adds 'driver' role and enables driver portal functionality
-- NOTE: The enum value 'driver' is added in migration 20260325095900_add_driver_enum_value.sql
-- =============================================================================

-- =============================================================================
-- Link drivers table to auth users
-- =============================================================================

-- Add user_id column to drivers table to link to auth.users
ALTER TABLE public.ceva_drivers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create unique index to ensure one driver per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_ceva_drivers_user_id ON public.ceva_drivers(user_id) WHERE user_id IS NOT NULL;

-- =============================================================================
-- Add missing fields to loads table for Daily Tracking Report
-- =============================================================================

-- Add date_arrived_pickup field (DATE ARRIVED AT NOTTINGHAM ESTATE in report)
ALTER TABLE public.ceva_loads
ADD COLUMN IF NOT EXISTS date_arrived_pickup DATE;

-- Add index for this field
CREATE INDEX IF NOT EXISTS ceva_loads_date_arrived_pickup_idx ON public.ceva_loads(date_arrived_pickup);

COMMENT ON COLUMN public.ceva_loads.date_arrived_pickup IS 'Date truck arrived at pickup location (e.g., Nottingham Estate) - from Daily Tracking Report';

-- =============================================================================
-- Row Level Security (RLS) Policies for Drivers
-- =============================================================================

-- Enable RLS on drivers table if not already enabled
ALTER TABLE public.ceva_drivers ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own profile
DROP POLICY IF EXISTS "Drivers can view own profile" ON public.ceva_drivers;
CREATE POLICY "Drivers can view own profile"
  ON public.ceva_drivers
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    -- Staff can see all drivers
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

-- Drivers can update their own profile (limited fields)
DROP POLICY IF EXISTS "Drivers can update own profile" ON public.ceva_drivers;
CREATE POLICY "Drivers can update own profile"
  ON public.ceva_drivers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Staff can manage all drivers
DROP POLICY IF EXISTS "Staff can manage drivers" ON public.ceva_drivers;
CREATE POLICY "Staff can manage drivers"
  ON public.ceva_drivers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

-- =============================================================================
-- Update RLS policies for loads table to include driver access
-- =============================================================================

-- Drivers can view their assigned loads
DROP POLICY IF EXISTS "Drivers can view assigned loads" ON public.ceva_loads;
CREATE POLICY "Drivers can view assigned loads"
  ON public.ceva_loads
  FOR SELECT
  TO authenticated
  USING (
    -- If user is a driver, only show their loads
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.ceva_profiles p
        WHERE p.id = auth.uid() AND p.role = 'driver'
      )
      THEN EXISTS (
        SELECT 1 FROM public.ceva_drivers d
        WHERE d.user_id = auth.uid() AND d.id = ceva_loads.driver_id
      )
      -- Otherwise allow (handled by other policies)
      ELSE true
    END
  );

-- Drop existing update policies from base schema
DROP POLICY IF EXISTS "Users and admins can update loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Only staff can update loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Drivers can update assigned loads" ON public.ceva_loads;

-- Create comprehensive update policy for drivers and staff
CREATE POLICY "Staff and drivers can update loads"
  ON public.ceva_loads
  FOR UPDATE
  TO authenticated
  USING (
    -- Staff can update any load
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
    OR
    -- Drivers can update their assigned loads
    EXISTS (
      SELECT 1 FROM public.ceva_drivers d
      JOIN public.ceva_profiles p ON p.id = auth.uid()
      WHERE d.user_id = auth.uid()
        AND d.id = ceva_loads.driver_id
        AND p.role = 'driver'
    )
  )
  WITH CHECK (
    -- Staff can update anything
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
    OR
    -- Drivers can only update specific fields (enforced at application level)
    EXISTS (
      SELECT 1 FROM public.ceva_drivers d
      JOIN public.ceva_profiles p ON p.id = auth.uid()
      WHERE d.user_id = auth.uid()
        AND d.id = ceva_loads.driver_id
        AND p.role = 'driver'
    )
  );

-- Drop existing delete policies from base schema
DROP POLICY IF EXISTS "Admins can delete loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Only staff can delete loads" ON public.ceva_loads;

-- Only admins can delete loads
CREATE POLICY "Only admins can delete loads"
  ON public.ceva_loads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- Create driver_loads view for easy access
-- =============================================================================

-- Drop the view first to allow column structure changes
DROP VIEW IF EXISTS public.driver_load_summary;

CREATE VIEW public.driver_load_summary AS
SELECT
  l.id,
  l.load_number,
  l.manifest_number,
  l.status,
  l.origin,
  l.destination,
  l.border,
  l.pickup_date,
  l.delivery_date,
  l.weight,
  l.commodity,
  l.comments,
  l.notes,
  -- Milestone dates from Daily Tracking Report
  l.date_arrived_pickup,
  l.date_loaded,
  l.date_arrived_border_zim,
  l.date_arrived_border_sa,
  l.date_arrived_cold_stores,
  l.date_offloaded,
  -- IDs
  l.driver_id,
  l.horse_id,
  l.trailer_id,
  l.trailer2_id,
  l.client_id,
  l.created_at,
  l.updated_at,
  -- Vehicle and trailer details
  h.registration_number as vehicle_registration,
  t.registration_number as trailer_registration,
  t2.registration_number as trailer2_registration,
  vtp.address as vehicle_location,
  vtp.latitude as vehicle_latitude,
  vtp.longitude as vehicle_longitude,
  vtp.speed as vehicle_speed,
  vtp.recorded_at as location_updated_at,
  -- Client and transporter info
  l.client as client_company,
  tr.company_name as transporter_name,
  tr.rib_code as transporter_rib_code
FROM public.ceva_loads l
LEFT JOIN public.ceva_horses h ON l.horse_id = h.id
LEFT JOIN public.ceva_trailers t ON l.trailer_id = t.id
LEFT JOIN public.ceva_trailers t2 ON l.trailer2_id = t2.id
LEFT JOIN public.ceva_transporters tr ON l.supplier_id = tr.id
LEFT JOIN LATERAL (
  SELECT address, latitude, longitude, speed, recorded_at
  FROM public.ceva_vehicle_tracking_positions
  WHERE horse_id = l.horse_id
  ORDER BY recorded_at DESC
  LIMIT 1
) vtp ON true
WHERE l.driver_id IN (
  SELECT id FROM public.ceva_drivers WHERE user_id = auth.uid()
);

-- Grant access to the view
GRANT SELECT ON public.driver_load_summary TO authenticated;

-- =============================================================================
-- Function to automatically create driver profile when user signs up as driver
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_driver()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_transporter_id UUID;
BEGIN
  -- If the new user is a driver, create a driver profile
  IF NEW.raw_user_meta_data->>'role' = 'driver' THEN
    -- Parse full name into first and last name
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Driver');
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name := NULLIF(TRIM(SUBSTRING(v_full_name FROM LENGTH(v_first_name) + 1)), '');

    -- Get or create a default transporter (required by schema)
    -- Note: In production, you'll need to assign drivers to proper transporters
    SELECT id INTO v_transporter_id
    FROM public.ceva_transporters
    WHERE company_name = 'Self-Registered Drivers'
    LIMIT 1;

    -- Create default transporter if it doesn't exist
    IF v_transporter_id IS NULL THEN
      INSERT INTO public.ceva_transporters (company_name, status)
      VALUES ('Self-Registered Drivers', 'approved')
      RETURNING id INTO v_transporter_id;
    END IF;

    INSERT INTO public.ceva_drivers (
      transporter_id,
      first_name,
      last_name,
      contact_phone,
      contact_email,
      status,
      user_id
    )
    VALUES (
      v_transporter_id,
      v_first_name,
      COALESCE(v_last_name, ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      NEW.email,
      'active',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger to handle new driver creation
DROP TRIGGER IF EXISTS on_auth_user_created_driver ON auth.users;
CREATE TRIGGER on_auth_user_created_driver
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_driver();

-- =============================================================================
-- Add RLS policies for driver-related tables
-- =============================================================================

-- Horses (vehicles) - drivers can view their assigned vehicle
ALTER TABLE public.ceva_horses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view assigned vehicles" ON public.ceva_horses;
CREATE POLICY "Drivers can view assigned vehicles"
  ON public.ceva_horses
  FOR SELECT
  TO authenticated
  USING (
    -- Drivers can see vehicles assigned to their loads
    EXISTS (
      SELECT 1 FROM public.ceva_loads l
      JOIN public.ceva_drivers d ON d.id = l.driver_id
      WHERE d.user_id = auth.uid() AND l.horse_id = ceva_horses.id
    )
    OR
    -- Staff can see all vehicles
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

-- Trailers - drivers can view their assigned trailer
ALTER TABLE public.ceva_trailers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view assigned trailers" ON public.ceva_trailers;
CREATE POLICY "Drivers can view assigned trailers"
  ON public.ceva_trailers
  FOR SELECT
  TO authenticated
  USING (
    -- Drivers can see trailers assigned to their loads
    EXISTS (
      SELECT 1 FROM public.ceva_loads l
      JOIN public.ceva_drivers d ON d.id = l.driver_id
      WHERE d.user_id = auth.uid() AND l.trailer_id = ceva_trailers.id
    )
    OR
    -- Staff can see all trailers
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

-- =============================================================================
-- Grant necessary permissions
-- =============================================================================

GRANT SELECT ON public.ceva_drivers TO authenticated;
GRANT UPDATE ON public.ceva_drivers TO authenticated;
GRANT SELECT ON public.ceva_horses TO authenticated;
GRANT SELECT ON public.ceva_trailers TO authenticated;

-- =============================================================================
-- Helper function to get driver ID from user ID
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_driver_id_from_user()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.ceva_drivers WHERE user_id = auth.uid() LIMIT 1;
$$;

COMMENT ON TABLE public.ceva_drivers IS 'Driver information with optional link to auth users for driver portal access';
COMMENT ON VIEW public.driver_load_summary IS 'Simplified load view for drivers showing only their assigned loads';
COMMENT ON FUNCTION public.get_driver_id_from_user() IS 'Helper function to get driver ID from authenticated user ID';
