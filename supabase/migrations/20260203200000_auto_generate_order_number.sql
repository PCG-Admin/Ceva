-- Migration: Auto-generate sequential order numbers for loads
-- Order numbers will be generated as ORD-0001, ORD-0002, etc.

-- Create sequence for generating order numbers (starting at 1)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1;

-- Function to auto-generate order number on insert
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'ORD-' || LPAD(nextval('public.order_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate order number before insert
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.mithon_loads
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- Grant permissions
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated;

-- Make order_number NOT NULL with a default for existing records
-- First, update any existing NULL order_numbers using a CTE
WITH numbered_loads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.mithon_loads
  WHERE order_number IS NULL
)
UPDATE public.mithon_loads
SET order_number = 'ORD-' || LPAD(numbered_loads.rn::TEXT, 4, '0')
FROM numbered_loads
WHERE public.mithon_loads.id = numbered_loads.id;

-- Update sequence to start after the highest existing number
SELECT setval('public.order_number_seq', COALESCE(
  (SELECT MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::INT) FROM public.mithon_loads),
  0
) + 1);

-- Then alter the column to be NOT NULL
ALTER TABLE public.mithon_loads ALTER COLUMN order_number SET NOT NULL;

-- Add unique constraint
ALTER TABLE public.mithon_loads ADD CONSTRAINT mithon_loads_order_number_unique UNIQUE (order_number);
