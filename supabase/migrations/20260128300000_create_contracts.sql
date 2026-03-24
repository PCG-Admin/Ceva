-- Migration: Create Contracts Table
-- Description: Basic contracts table with name and weight

CREATE TABLE public.mithon_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_name TEXT NOT NULL,
    weight_tons NUMERIC,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX mithon_contracts_created_by_idx ON public.mithon_contracts(created_by);

-- Trigger for updated_at
CREATE TRIGGER mithon_handle_contracts_updated_at
    BEFORE UPDATE ON public.mithon_contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security
ALTER TABLE public.mithon_contracts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_contracts TO authenticated;

CREATE POLICY "Dispatchers and admins can view all contracts"
    ON public.mithon_contracts FOR SELECT
    TO authenticated
    USING (
        public.mithon_get_user_role() IN ('dispatcher', 'admin')
    );

CREATE POLICY "Dispatchers and admins can manage contracts"
    ON public.mithon_contracts FOR ALL
    TO authenticated
    USING (
        public.mithon_get_user_role() IN ('dispatcher', 'admin')
    );
