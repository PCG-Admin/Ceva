-- =============================================================================
-- Add Supplier (Transporter), Horse, and Trailer to Loads Table
-- Optional fields to assign transportation resources to mithon_loads
-- =============================================================================

-- Add new columns to mithon_loads table
ALTER TABLE public.mithon_loads
  ADD COLUMN supplier_id UUID REFERENCES public.mithon_transporters(id) ON DELETE SET NULL,
  ADD COLUMN horse_id UUID REFERENCES public.mithon_horses(id) ON DELETE SET NULL,
  ADD COLUMN trailer_id UUID REFERENCES public.mithon_trailers(id) ON DELETE SET NULL;

-- Make vehicle_type optional (nullable) since we're using supplier/horse/trailer instead
ALTER TABLE public.mithon_loads
  ALTER COLUMN vehicle_type DROP NOT NULL;

-- Create indexes for the new foreign keys
CREATE INDEX mithon_loads_supplier_id_idx ON public.mithon_loads(supplier_id);
CREATE INDEX mithon_loads_horse_id_idx ON public.mithon_loads(horse_id);
CREATE INDEX mithon_loads_trailer_id_idx ON public.mithon_loads(trailer_id);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON COLUMN public.mithon_loads.supplier_id IS 'Optional: The transporter/supplier assigned to this load';
COMMENT ON COLUMN public.mithon_loads.horse_id IS 'Optional: The horse (truck) assigned to this load';
COMMENT ON COLUMN public.mithon_loads.trailer_id IS 'Optional: The trailer assigned to this load';
