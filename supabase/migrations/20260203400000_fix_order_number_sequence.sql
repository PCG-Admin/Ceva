-- Migration: Fix order_number sequence to be in sync with existing data
-- This resets the sequence to start after the highest existing order number

-- Reset sequence to the maximum existing order number + 1
SELECT setval('public.order_number_seq', COALESCE(
  (SELECT MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::INT) FROM public.mithon_loads),
  0
) + 1);
