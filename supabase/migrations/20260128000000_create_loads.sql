-- =============================================================================
-- Mithon TMS Loads Table Migration
-- Creates mithon_loads table for load booking and management
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.mithon_load_status AS ENUM ('pending', 'assigned', 'in-transit', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.mithon_vehicle_type AS ENUM ('20ft', '24ft', '32ft', 'open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.mithon_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_number TEXT NOT NULL UNIQUE,
  client TEXT NOT NULL,
  material TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  weight NUMERIC NOT NULL CHECK (weight > 0),
  vehicle_type public.mithon_vehicle_type NOT NULL,
  rate NUMERIC NOT NULL CHECK (rate >= 0),
  notes TEXT,
  status public.mithon_load_status DEFAULT 'pending' NOT NULL,
  assigned_vehicle TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- Load Number Sequence
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.load_number_seq START WITH 1000;

CREATE OR REPLACE FUNCTION public.generate_load_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.load_number IS NULL OR NEW.load_number = '' THEN
    NEW.load_number := 'L-' || nextval('public.load_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER mithon_loads_generate_number
  BEFORE INSERT ON public.mithon_loads
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_load_number();

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX mithon_loads_status_idx ON public.mithon_loads(status);
CREATE INDEX mithon_loads_created_by_idx ON public.mithon_loads(created_by);
CREATE INDEX mithon_loads_company_id_idx ON public.mithon_loads(company_id);
CREATE INDEX mithon_loads_pickup_date_idx ON public.mithon_loads(pickup_date);
CREATE INDEX mithon_loads_load_number_idx ON public.mithon_loads(load_number);

CREATE TRIGGER mithon_loads_updated_at
  BEFORE UPDATE ON public.mithon_loads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

ALTER TABLE public.mithon_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispatchers and admins can view all loads"
  ON public.mithon_loads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mithon_profiles
      WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
    )
  );

CREATE POLICY "Users can view own loads"
  ON public.mithon_loads FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Dispatchers and admins can create loads"
  ON public.mithon_loads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mithon_profiles
      WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
    )
  );

CREATE POLICY "Dispatchers and admins can update loads"
  ON public.mithon_loads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mithon_profiles
      WHERE id = auth.uid() AND role IN ('dispatcher', 'admin')
    )
  );

CREATE POLICY "Admins can delete loads"
  ON public.mithon_loads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.mithon_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- Grant Permissions
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_loads TO authenticated;
GRANT USAGE ON TYPE public.mithon_load_status TO authenticated;
GRANT USAGE ON TYPE public.mithon_vehicle_type TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.load_number_seq TO authenticated;
