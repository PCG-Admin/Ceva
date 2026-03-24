-- Migration: Add Order, Loading, and Offloading Numbers to Loads
-- Description: Adds user-provided reference numbers to mithon_loads table

-- Add new columns
ALTER TABLE public.mithon_loads
ADD COLUMN order_number TEXT,
ADD COLUMN loading_number TEXT,
ADD COLUMN offloading_number TEXT;

-- Create index for order_number lookups
CREATE INDEX mithon_loads_order_number_idx ON public.mithon_loads(order_number);
