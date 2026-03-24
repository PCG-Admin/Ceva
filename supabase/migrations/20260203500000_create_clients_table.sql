-- Migration: Create mithon_clients table for customer portal
-- Clients can be added to the system with name and contact information

CREATE TABLE IF NOT EXISTS public.mithon_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_mithon_clients_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER mithon_update_clients_updated_at_trigger
  BEFORE UPDATE ON public.mithon_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mithon_clients_updated_at();

-- Enable RLS
ALTER TABLE public.mithon_clients ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read clients"
  ON public.mithon_clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert clients"
  ON public.mithon_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update clients"
  ON public.mithon_clients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete clients"
  ON public.mithon_clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON public.mithon_clients TO authenticated;

-- Create index for faster searches
CREATE INDEX mithon_idx_clients_name ON public.mithon_clients(name);
