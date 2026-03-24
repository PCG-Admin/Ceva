-- Convert existing load weights from kilograms to tons
UPDATE public.mithon_loads SET weight = weight / 1000 WHERE weight IS NOT NULL;
