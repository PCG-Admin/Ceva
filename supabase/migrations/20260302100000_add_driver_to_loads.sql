-- Migration: Add driver_id to mithon_loads table

ALTER TABLE public.mithon_loads
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.mithon_drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS mithon_loads_driver_id_idx ON public.mithon_loads(driver_id);
