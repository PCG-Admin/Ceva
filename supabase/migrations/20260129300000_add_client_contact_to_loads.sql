-- =============================================================================
-- Add Client Contact Number to Loads Table
-- Optional field for client contact information
-- =============================================================================

-- Add client_contact column to mithon_loads table
ALTER TABLE public.mithon_loads
  ADD COLUMN client_contact TEXT;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON COLUMN public.mithon_loads.client_contact IS 'Optional: Contact number for the client';
