-- Migration: Update mithon_trailer_type enum values
-- Old: flatbed, tautliner, refrigerated, tanker, container, lowbed, other
-- New: side_tipper, bottom_dumper, drop_side, flat

DO $$ BEGIN
  CREATE TYPE public.mithon_trailer_type_new AS ENUM ('side_tipper', 'bottom_dumper', 'drop_side', 'flat');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.mithon_trailers ADD COLUMN trailer_type_temp public.mithon_trailer_type_new;

UPDATE public.mithon_trailers SET trailer_type_temp = 'side_tipper';

ALTER TABLE public.mithon_trailers DROP COLUMN trailer_type;
ALTER TABLE public.mithon_trailers RENAME COLUMN trailer_type_temp TO trailer_type;

ALTER TABLE public.mithon_trailers ALTER COLUMN trailer_type SET NOT NULL;

DROP TYPE public.mithon_trailer_type;
ALTER TYPE public.mithon_trailer_type_new RENAME TO mithon_trailer_type;

DROP INDEX IF EXISTS mithon_trailers_trailer_type_idx;
CREATE INDEX mithon_trailers_trailer_type_idx ON public.mithon_trailers(trailer_type);
