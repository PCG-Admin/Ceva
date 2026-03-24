-- Add pickup and delivery address arrays to mithon_clients
ALTER TABLE public.mithon_clients
  ADD COLUMN pickup_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN delivery_addresses JSONB NOT NULL DEFAULT '[]'::jsonb;
