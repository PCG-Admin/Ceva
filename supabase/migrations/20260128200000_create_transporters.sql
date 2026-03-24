-- Migration: Create Transporter Management Tables

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN CREATE TYPE public.mithon_transporter_status AS ENUM ('pending', 'approved', 'suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.mithon_document_type AS ENUM ('bank_proof', 'vat_certificate', 'git_confirmation', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.mithon_driver_document_type AS ENUM ('id_document', 'drivers_license', 'prdp', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.mithon_vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.mithon_trailer_type AS ENUM ('flatbed', 'tautliner', 'refrigerated', 'tanker', 'container', 'lowbed', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.mithon_driver_status AS ENUM ('active', 'inactive', 'suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- MITHON_TRANSPORTERS TABLE
-- ============================================

CREATE TABLE public.mithon_transporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    trading_name TEXT,
    registration_number TEXT,
    vat_number TEXT,
    physical_address TEXT,
    postal_address TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_branch_code TEXT,
    bank_account_type TEXT,
    status public.mithon_transporter_status DEFAULT 'approved',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    company_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX mithon_transporters_status_idx ON public.mithon_transporters(status);
CREATE INDEX mithon_transporters_company_id_idx ON public.mithon_transporters(company_id);
CREATE INDEX mithon_transporters_created_by_idx ON public.mithon_transporters(created_by);

-- ============================================
-- MITHON_TRANSPORTER_DOCUMENTS TABLE
-- ============================================

CREATE TABLE public.mithon_transporter_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID NOT NULL REFERENCES public.mithon_transporters(id) ON DELETE CASCADE,
    document_type public.mithon_document_type NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX mithon_transporter_documents_transporter_id_idx ON public.mithon_transporter_documents(transporter_id);
CREATE INDEX mithon_transporter_documents_document_type_idx ON public.mithon_transporter_documents(document_type);

-- ============================================
-- MITHON_HORSES TABLE
-- ============================================

CREATE TABLE public.mithon_horses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID NOT NULL REFERENCES public.mithon_transporters(id) ON DELETE CASCADE,
    registration_number TEXT NOT NULL UNIQUE,
    make TEXT,
    model TEXT,
    year INTEGER,
    vin_number TEXT,
    engine_number TEXT,
    color TEXT,
    license_expiry DATE,
    tracking_provider TEXT,
    tracking_unit_id TEXT,
    status public.mithon_vehicle_status DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX mithon_horses_transporter_id_idx ON public.mithon_horses(transporter_id);
CREATE INDEX mithon_horses_status_idx ON public.mithon_horses(status);
CREATE INDEX mithon_horses_registration_number_idx ON public.mithon_horses(registration_number);

-- ============================================
-- MITHON_TRAILERS TABLE
-- ============================================

CREATE TABLE public.mithon_trailers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID NOT NULL REFERENCES public.mithon_transporters(id) ON DELETE CASCADE,
    registration_number TEXT NOT NULL UNIQUE,
    trailer_type public.mithon_trailer_type NOT NULL,
    length_meters NUMERIC,
    max_payload_tons NUMERIC,
    tare_weight_tons NUMERIC,
    license_expiry DATE,
    status public.mithon_vehicle_status DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX mithon_trailers_transporter_id_idx ON public.mithon_trailers(transporter_id);
CREATE INDEX mithon_trailers_status_idx ON public.mithon_trailers(status);
CREATE INDEX mithon_trailers_trailer_type_idx ON public.mithon_trailers(trailer_type);

-- ============================================
-- MITHON_DRIVERS TABLE
-- ============================================

CREATE TABLE public.mithon_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID NOT NULL REFERENCES public.mithon_transporters(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    id_number TEXT,
    passport_number TEXT,
    license_number TEXT,
    license_type TEXT,
    license_expiry DATE,
    prdp_number TEXT,
    prdp_expiry DATE,
    contact_phone TEXT,
    contact_email TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    status public.mithon_driver_status DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX mithon_drivers_transporter_id_idx ON public.mithon_drivers(transporter_id);
CREATE INDEX mithon_drivers_status_idx ON public.mithon_drivers(status);

-- ============================================
-- MITHON_DRIVER_DOCUMENTS TABLE
-- ============================================

CREATE TABLE public.mithon_driver_documents (
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

CREATE INDEX mithon_driver_documents_driver_id_idx ON public.mithon_driver_documents(driver_id);
CREATE INDEX mithon_driver_documents_document_type_idx ON public.mithon_driver_documents(document_type);

-- ============================================
-- MITHON_VEHICLE_COMBINATIONS TABLE
-- ============================================

CREATE TABLE public.mithon_vehicle_combinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID NOT NULL REFERENCES public.mithon_transporters(id) ON DELETE CASCADE,
    combination_name TEXT,
    horse_id UUID NOT NULL REFERENCES public.mithon_horses(id) ON DELETE RESTRICT,
    trailer1_id UUID NOT NULL REFERENCES public.mithon_trailers(id) ON DELETE RESTRICT,
    trailer2_id UUID REFERENCES public.mithon_trailers(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES public.mithon_drivers(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT different_trailers CHECK (trailer1_id != trailer2_id OR trailer2_id IS NULL)
);

CREATE INDEX mithon_vehicle_combinations_transporter_id_idx ON public.mithon_vehicle_combinations(transporter_id);
CREATE INDEX mithon_vehicle_combinations_horse_id_idx ON public.mithon_vehicle_combinations(horse_id);
CREATE INDEX mithon_vehicle_combinations_driver_id_idx ON public.mithon_vehicle_combinations(driver_id);
CREATE INDEX mithon_vehicle_combinations_is_active_idx ON public.mithon_vehicle_combinations(is_active);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER mithon_handle_transporters_updated_at
    BEFORE UPDATE ON public.mithon_transporters
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER mithon_handle_horses_updated_at
    BEFORE UPDATE ON public.mithon_horses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER mithon_handle_trailers_updated_at
    BEFORE UPDATE ON public.mithon_trailers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER mithon_handle_drivers_updated_at
    BEFORE UPDATE ON public.mithon_drivers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER mithon_handle_vehicle_combinations_updated_at
    BEFORE UPDATE ON public.mithon_vehicle_combinations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.mithon_transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mithon_transporter_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mithon_horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mithon_trailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mithon_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mithon_driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mithon_vehicle_combinations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_transporters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_transporter_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_horses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_trailers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_drivers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_driver_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_vehicle_combinations TO authenticated;

-- RLS POLICIES - MITHON_TRANSPORTERS

CREATE POLICY "Dispatchers and admins can view all transporters"
    ON public.mithon_transporters FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can create transporters"
    ON public.mithon_transporters FOR INSERT TO authenticated
    WITH CHECK (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can update transporters"
    ON public.mithon_transporters FOR UPDATE TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Only admins can delete transporters"
    ON public.mithon_transporters FOR DELETE TO authenticated
    USING (public.mithon_get_user_role() = 'admin');

-- RLS POLICIES - MITHON_TRANSPORTER_DOCUMENTS

CREATE POLICY "Dispatchers and admins can view all transporter documents"
    ON public.mithon_transporter_documents FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can manage transporter documents"
    ON public.mithon_transporter_documents FOR INSERT TO authenticated
    WITH CHECK (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can update transporter documents"
    ON public.mithon_transporter_documents FOR UPDATE TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Only admins can delete transporter documents"
    ON public.mithon_transporter_documents FOR DELETE TO authenticated
    USING (public.mithon_get_user_role() = 'admin');

-- RLS POLICIES - MITHON_HORSES

CREATE POLICY "Dispatchers and admins can view all horses"
    ON public.mithon_horses FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can manage horses"
    ON public.mithon_horses FOR ALL TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

-- RLS POLICIES - MITHON_TRAILERS

CREATE POLICY "Dispatchers and admins can view all trailers"
    ON public.mithon_trailers FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can manage trailers"
    ON public.mithon_trailers FOR ALL TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

-- RLS POLICIES - MITHON_DRIVERS

CREATE POLICY "Dispatchers and admins can view all drivers"
    ON public.mithon_drivers FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can manage drivers"
    ON public.mithon_drivers FOR ALL TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

-- RLS POLICIES - MITHON_DRIVER_DOCUMENTS

CREATE POLICY "Dispatchers and admins can view all driver documents"
    ON public.mithon_driver_documents FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can manage driver documents"
    ON public.mithon_driver_documents FOR ALL TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

-- RLS POLICIES - MITHON_VEHICLE_COMBINATIONS

CREATE POLICY "Dispatchers and admins can view all vehicle combinations"
    ON public.mithon_vehicle_combinations FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can manage vehicle combinations"
    ON public.mithon_vehicle_combinations FOR ALL TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));
