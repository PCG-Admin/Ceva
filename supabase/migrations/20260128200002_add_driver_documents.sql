-- Migration: Add Driver Documents Table

DO $$ BEGIN
    CREATE TYPE public.mithon_driver_document_type AS ENUM ('id_document', 'drivers_license', 'prdp', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.mithon_driver_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.mithon_drivers(id) ON DELETE CASCADE,
    document_type public.mithon_driver_document_type NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    expiry_date DATE,
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS mithon_driver_documents_driver_id_idx ON public.mithon_driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS mithon_driver_documents_document_type_idx ON public.mithon_driver_documents(document_type);

ALTER TABLE public.mithon_driver_documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_driver_documents TO authenticated;

DROP POLICY IF EXISTS "Dispatchers and admins can view all driver documents" ON public.mithon_driver_documents;
DROP POLICY IF EXISTS "Dispatchers and admins can manage driver documents" ON public.mithon_driver_documents;

CREATE POLICY "Dispatchers and admins can view all driver documents"
    ON public.mithon_driver_documents FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can manage driver documents"
    ON public.mithon_driver_documents FOR ALL TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));
