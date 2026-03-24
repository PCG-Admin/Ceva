-- =============================================================================
-- Add Contract to Loads Table
-- Optional field to link a load to a contract
-- =============================================================================

-- Add contract_id column to mithon_loads table
ALTER TABLE public.mithon_loads
  ADD COLUMN contract_id UUID REFERENCES public.mithon_contracts(id) ON DELETE SET NULL;

-- Make weight optional (nullable)
ALTER TABLE public.mithon_loads
  ALTER COLUMN weight DROP NOT NULL;

-- Create index for the new foreign key
CREATE INDEX mithon_loads_contract_id_idx ON public.mithon_loads(contract_id);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON COLUMN public.mithon_loads.contract_id IS 'Optional: The contract associated with this load';
