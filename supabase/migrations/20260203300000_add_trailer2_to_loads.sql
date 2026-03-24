-- Migration: Add second trailer support to loads
-- Allows assigning two trailers to a single load

-- Add trailer2_id column
ALTER TABLE public.mithon_loads
ADD COLUMN trailer2_id UUID REFERENCES public.mithon_trailers(id) ON DELETE SET NULL;

-- Create index for trailer2_id lookups
CREATE INDEX mithon_loads_trailer2_id_idx ON public.mithon_loads(trailer2_id);
