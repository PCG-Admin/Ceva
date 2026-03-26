-- =============================================================================
-- CEVA Citrus TMS - Phase 1 SOW Compliance Migration
-- Adds missing fields from SOW Section 3.1.1 and 3.1.2
-- Date: 26 March 2026
-- =============================================================================

-- Add missing mandatory fields to ceva_loads table
ALTER TABLE public.ceva_loads
  ADD COLUMN IF NOT EXISTS rib_code TEXT,
  ADD COLUMN IF NOT EXISTS controller TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT;

-- Set commodity default to 'Citrus' as per SOW requirement
ALTER TABLE public.ceva_loads
  ALTER COLUMN commodity SET DEFAULT 'Citrus';

-- Add citrus-specific milestone date fields (SOW Section 3.1.2)
-- Mapping to the 6 milestones:
-- 1. Loaded at Farm -> date_loaded (already exists)
-- 2. Bitebridge (BBR Border) -> date_arrived_border_sa (already exists, renamed conceptually)
-- 3. Johannesburg -> NEW
-- 4. Harrismith -> NEW
-- 5. Durban Arrival -> NEW
-- 6. Delivered —Bayhead -> date_offloaded (already exists)

ALTER TABLE public.ceva_loads
  ADD COLUMN IF NOT EXISTS date_johannesburg DATE,
  ADD COLUMN IF NOT EXISTS date_harrismith DATE,
  ADD COLUMN IF NOT EXISTS date_durban_arrival DATE;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS ceva_loads_rib_code_idx ON public.ceva_loads(rib_code);
CREATE INDEX IF NOT EXISTS ceva_loads_controller_idx ON public.ceva_loads(controller);
CREATE INDEX IF NOT EXISTS ceva_loads_date_johannesburg_idx ON public.ceva_loads(date_johannesburg);
CREATE INDEX IF NOT EXISTS ceva_loads_date_harrismith_idx ON public.ceva_loads(date_harrismith);
CREATE INDEX IF NOT EXISTS ceva_loads_date_durban_arrival_idx ON public.ceva_loads(date_durban_arrival);

-- Add comment for documentation
COMMENT ON COLUMN public.ceva_loads.rib_code IS 'Remover in Bond Code per load (e.g., 25616711) - Required for cross-border citrus loads';
COMMENT ON COLUMN public.ceva_loads.controller IS 'CEVA controller assigned to the load (e.g., Mahesh)';
COMMENT ON COLUMN public.ceva_loads.passport_number IS 'Phytosanitary / export passport number for citrus loads';
COMMENT ON COLUMN public.ceva_loads.date_johannesburg IS 'Milestone: Load confirmed passing through or staging in Joburg';
COMMENT ON COLUMN public.ceva_loads.date_harrismith IS 'Milestone: Load has passed through Harrismith on the N3';
COMMENT ON COLUMN public.ceva_loads.date_durban_arrival IS 'Milestone: Load has arrived in Durban metro area';

-- Update audit trigger to include new fields (already covered by existing trigger)
