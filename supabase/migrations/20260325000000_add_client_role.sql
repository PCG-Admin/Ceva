-- =============================================================================
-- Add Client Role to Ceva Logistics TMS
-- This migration adds 'client' role and creates necessary relationships
-- NOTE: The enum value 'client' is added in migration 20260324235900_add_client_enum_value.sql
-- =============================================================================

-- =============================================================================
-- Add client_id to loads table to link loads to clients
-- =============================================================================

ALTER TABLE public.ceva_loads
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ceva_loads_client_id ON public.ceva_loads(client_id);

-- =============================================================================
-- Create a clients table for additional client information
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ceva_clients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT NOT NULL,
  physical_address TEXT,
  billing_address TEXT,
  vat_number TEXT,
  account_number TEXT,
  payment_terms INTEGER DEFAULT 30, -- days
  credit_limit DECIMAL(12,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger (drop first if exists)
DROP TRIGGER IF EXISTS ceva_clients_updated_at ON public.ceva_clients;
CREATE TRIGGER ceva_clients_updated_at
  BEFORE UPDATE ON public.ceva_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add audit logging (drop first if exists)
DROP TRIGGER IF EXISTS ceva_clients_audit_log ON public.ceva_clients;
CREATE TRIGGER ceva_clients_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.ceva_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.ceva_audit_log_trigger();

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on clients table
ALTER TABLE public.ceva_clients ENABLE ROW LEVEL SECURITY;

-- Clients can view their own profile
DROP POLICY IF EXISTS "Clients can view own profile" ON public.ceva_clients;
CREATE POLICY "Clients can view own profile"
  ON public.ceva_clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Clients can update their own profile (limited fields)
DROP POLICY IF EXISTS "Clients can update own profile" ON public.ceva_clients;
CREATE POLICY "Clients can update own profile"
  ON public.ceva_clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins and dispatchers can view all clients
DROP POLICY IF EXISTS "Staff can view all clients" ON public.ceva_clients;
CREATE POLICY "Staff can view all clients"
  ON public.ceva_clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );

-- Admins can manage all clients
DROP POLICY IF EXISTS "Admins can manage clients" ON public.ceva_clients;
CREATE POLICY "Admins can manage clients"
  ON public.ceva_clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- Update RLS policies for loads table to include client access
-- =============================================================================

-- Drop existing policies if they exist (we'll recreate them)
DROP POLICY IF EXISTS "Clients can view own loads" ON public.ceva_loads;
DROP POLICY IF EXISTS "Clients can create loads" ON public.ceva_loads;

-- Clients can view their own loads
CREATE POLICY "Clients can view own loads"
  ON public.ceva_loads
  FOR SELECT
  TO authenticated
  USING (
    -- If user is a client, only show their loads
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.ceva_profiles
        WHERE id = auth.uid() AND role = 'client'
      )
      THEN client_id = auth.uid()
      -- Otherwise allow (staff can see all)
      ELSE true
    END
  );

-- Clients can create loads (they will be auto-assigned as client_id)
CREATE POLICY "Clients can create loads"
  ON public.ceva_loads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Clients can only create loads assigned to themselves
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.ceva_profiles
        WHERE id = auth.uid() AND role = 'client'
      )
      THEN client_id = auth.uid() OR client_id IS NULL
      -- Staff can create loads for any client
      ELSE true
    END
  );

-- Note: Update and delete policies are handled in the driver migration
-- to properly handle permissions for admin, dispatcher, client, and driver roles

-- =============================================================================
-- Function to automatically create client profile when user signs up as client
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- If the new user is a client, create a client profile
  IF NEW.raw_user_meta_data->>'role' = 'client' THEN
    INSERT INTO public.ceva_clients (
      id,
      company_name,
      contact_person,
      phone,
      email
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'New Client'),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      NEW.email
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger to handle new client creation
DROP TRIGGER IF EXISTS on_auth_user_created_client ON auth.users;
CREATE TRIGGER on_auth_user_created_client
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_client();

-- =============================================================================
-- Update profiles RLS to allow clients to view their own profile
-- =============================================================================

-- Create policy for clients to view own profile (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ceva_profiles'
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.ceva_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- =============================================================================
-- Grant necessary permissions
-- =============================================================================

GRANT SELECT ON public.ceva_clients TO authenticated;
GRANT INSERT, UPDATE ON public.ceva_clients TO authenticated;

-- =============================================================================
-- Helper Views
-- =============================================================================

-- Drop the view first to allow column structure changes
DROP VIEW IF EXISTS public.client_load_summary;

-- View for clients to see their load summary
CREATE VIEW public.client_load_summary AS
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
  l.rate,
  l.weight,
  l.commodity,
  l.comments,
  -- Milestone dates from Daily Tracking Report
  l.date_arrived_pickup,
  l.date_loaded,
  l.date_arrived_border_zim,
  l.date_arrived_border_sa,
  l.date_arrived_cold_stores,
  l.date_offloaded,
  -- IDs
  l.client_id,
  l.driver_id,
  l.horse_id,
  l.trailer_id,
  l.trailer2_id,
  l.created_at,
  l.updated_at,
  -- Vehicle and driver details
  h.registration_number as vehicle_number,
  t.registration_number as trailer_number,
  t2.registration_number as trailer2_number,
  CONCAT(d.first_name, ' ', d.last_name) as driver_name,
  d.contact_phone as driver_phone,
  d.passport_number as driver_passport,
  -- Current location from GPS tracking
  vtp.address as current_location,
  vtp.latitude as current_latitude,
  vtp.longitude as current_longitude,
  vtp.speed as current_speed,
  vtp.recorded_at as location_updated_at,
  -- Transporter details
  tr.company_name as transporter_name,
  tr.rib_code as transporter_rib_code
FROM public.ceva_loads l
LEFT JOIN public.ceva_horses h ON l.horse_id = h.id
LEFT JOIN public.ceva_trailers t ON l.trailer_id = t.id
LEFT JOIN public.ceva_trailers t2 ON l.trailer2_id = t2.id
LEFT JOIN public.ceva_drivers d ON l.driver_id = d.id
LEFT JOIN public.ceva_transporters tr ON l.supplier_id = tr.id
LEFT JOIN LATERAL (
  SELECT address, latitude, longitude, speed, recorded_at
  FROM public.ceva_vehicle_tracking_positions
  WHERE horse_id = l.horse_id
  ORDER BY recorded_at DESC
  LIMIT 1
) vtp ON true
WHERE l.client_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.client_load_summary TO authenticated;

COMMENT ON TABLE public.ceva_clients IS 'Client information for the TMS';
COMMENT ON VIEW public.client_load_summary IS 'Simplified load view for clients showing only their loads';
