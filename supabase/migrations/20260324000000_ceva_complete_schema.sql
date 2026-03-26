-- =============================================================================
-- CEVA Logistics TMS - Complete Database Schema
-- Run this on the CEVA Supabase project (easbbrhgrdagpmjgzdyg)
-- Creates all tables with ceva_ prefix, two roles: admin + dispatcher
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.ceva_user_role AS ENUM ('admin', 'dispatcher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ceva_load_status AS ENUM ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ceva_vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ceva_driver_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ceva_transporter_status AS ENUM ('pending', 'approved', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ceva_trailer_type AS ENUM ('side_tipper', 'bottom_dumper', 'drop_side', 'flat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ceva_document_type AS ENUM ('bank_proof', 'vat_certificate', 'git_confirmation', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ceva_driver_doc_type AS ENUM ('id_document', 'drivers_license', 'prdp', 'passport', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Auto-create profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.ceva_profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.ceva_user_role,
      'dispatcher'::public.ceva_user_role
    )
  );
  RETURN NEW;
END;
$$;

-- Load number auto-generation
CREATE SEQUENCE IF NOT EXISTS ceva_load_number_seq START WITH 1000;

CREATE OR REPLACE FUNCTION public.generate_ceva_load_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.load_number IS NULL THEN
    NEW.load_number := 'L-' || nextval('ceva_load_number_seq')::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

-- Audit log trigger function
CREATE OR REPLACE FUNCTION public.ceva_audit_log_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_changed TEXT[];
  v_record_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := COALESCE(OLD.id::TEXT, '');
    v_old := to_jsonb(OLD); v_new := NULL; v_changed := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := COALESCE(NEW.id::TEXT, '');
    v_old := NULL; v_new := to_jsonb(NEW); v_changed := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := COALESCE(NEW.id::TEXT, '');
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    v_changed := ARRAY(
      SELECT key FROM jsonb_each(v_new)
      WHERE key != 'updated_at'
        AND (NOT v_old ? key OR v_old->key IS DISTINCT FROM v_new->key)
    );
    IF array_length(v_changed, 1) IS NULL THEN RETURN NULL; END IF;
  END IF;

  INSERT INTO public.ceva_audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, v_changed, auth.uid());

  RETURN NULL;
END;
$$;

-- =============================================================================
-- TABLE: ceva_profiles
-- Stores user accounts. Two roles: admin and dispatcher.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  role        public.ceva_user_role NOT NULL DEFAULT 'dispatcher',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_profiles_email_idx ON public.ceva_profiles(email);
CREATE INDEX IF NOT EXISTS ceva_profiles_role_idx  ON public.ceva_profiles(role);

-- Get the current user's role (used in RLS policies to avoid recursion)
-- Must be created AFTER ceva_profiles table exists
CREATE OR REPLACE FUNCTION public.ceva_get_user_role()
RETURNS public.ceva_user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.ceva_profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.ceva_get_user_role() TO authenticated;
GRANT USAGE ON TYPE public.ceva_user_role TO authenticated;

-- =============================================================================
-- TABLE: ceva_clients
-- Customers / shippers.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_clients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255) NOT NULL,
  contact_number       VARCHAR(50),
  email                VARCHAR(255),
  address              TEXT,
  notes                TEXT,
  pickup_addresses     JSONB DEFAULT '[]'::jsonb,
  delivery_addresses   JSONB DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_idx_clients_name ON public.ceva_clients(name);

-- =============================================================================
-- TABLE: ceva_transporters
-- Transport companies / haulers.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_transporters (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name        TEXT NOT NULL,
  trading_name        TEXT,
  registration_number TEXT,
  vat_number          TEXT,
  rib_code            TEXT,   -- e.g. 25616711 (used on daily tracking report)
  physical_address    TEXT,
  postal_address      TEXT,
  contact_person      TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  bank_name           TEXT,
  bank_account_number TEXT,
  bank_branch_code    TEXT,
  bank_account_type   TEXT,
  status              public.ceva_transporter_status NOT NULL DEFAULT 'approved',
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_transporters_status_idx     ON public.ceva_transporters(status);
CREATE INDEX IF NOT EXISTS ceva_transporters_created_by_idx ON public.ceva_transporters(created_by);

-- =============================================================================
-- TABLE: ceva_horses
-- Trucks / tractor units.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_horses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id      UUID NOT NULL REFERENCES public.ceva_transporters(id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL UNIQUE,
  make                TEXT,
  model               TEXT,
  year                INTEGER,
  vin_number          TEXT,
  engine_number       TEXT,
  color               TEXT,
  license_expiry      DATE,
  tracking_provider   TEXT,
  tracking_unit_id    TEXT,   -- CTrack node ID
  status              public.ceva_vehicle_status NOT NULL DEFAULT 'available',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_horses_transporter_id_idx       ON public.ceva_horses(transporter_id);
CREATE INDEX IF NOT EXISTS ceva_horses_status_idx               ON public.ceva_horses(status);
CREATE INDEX IF NOT EXISTS ceva_horses_registration_number_idx  ON public.ceva_horses(registration_number);
CREATE INDEX IF NOT EXISTS ceva_horses_tracking_unit_idx        ON public.ceva_horses(tracking_unit_id);

-- =============================================================================
-- TABLE: ceva_trailers
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_trailers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id      UUID NOT NULL REFERENCES public.ceva_transporters(id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL UNIQUE,
  trailer_type        public.ceva_trailer_type NOT NULL,
  length_meters       NUMERIC,
  max_payload_tons    NUMERIC,
  tare_weight_tons    NUMERIC,
  license_expiry      DATE,
  status              public.ceva_vehicle_status NOT NULL DEFAULT 'available',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_trailers_transporter_id_idx ON public.ceva_trailers(transporter_id);
CREATE INDEX IF NOT EXISTS ceva_trailers_status_idx         ON public.ceva_trailers(status);
CREATE INDEX IF NOT EXISTS ceva_trailers_type_idx           ON public.ceva_trailers(trailer_type);

-- =============================================================================
-- TABLE: ceva_drivers
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_drivers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id           UUID NOT NULL REFERENCES public.ceva_transporters(id) ON DELETE CASCADE,
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  id_number                TEXT,
  passport_number          TEXT,
  license_number           TEXT,
  license_type             TEXT,
  license_expiry           DATE,
  prdp_number              TEXT,
  prdp_expiry              DATE,
  contact_phone            TEXT,
  contact_email            TEXT,
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  status                   public.ceva_driver_status NOT NULL DEFAULT 'active',
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_drivers_transporter_id_idx ON public.ceva_drivers(transporter_id);
CREATE INDEX IF NOT EXISTS ceva_drivers_status_idx         ON public.ceva_drivers(status);

-- =============================================================================
-- TABLE: ceva_transporter_documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_transporter_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id  UUID NOT NULL REFERENCES public.ceva_transporters(id) ON DELETE CASCADE,
  document_type   public.ceva_document_type NOT NULL,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified        BOOLEAN DEFAULT FALSE,
  verified_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS ceva_transporter_docs_transporter_id_idx ON public.ceva_transporter_documents(transporter_id);
CREATE INDEX IF NOT EXISTS ceva_transporter_docs_type_idx           ON public.ceva_transporter_documents(document_type);

-- =============================================================================
-- TABLE: ceva_driver_documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_driver_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id      UUID NOT NULL REFERENCES public.ceva_drivers(id) ON DELETE CASCADE,
  document_type  public.ceva_driver_doc_type NOT NULL,
  file_name      TEXT NOT NULL,
  file_path      TEXT NOT NULL,
  file_size      INTEGER,
  mime_type      TEXT,
  expiry_date    DATE,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified       BOOLEAN DEFAULT FALSE,
  verified_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at    TIMESTAMPTZ,
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS ceva_driver_docs_driver_id_idx ON public.ceva_driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS ceva_driver_docs_type_idx      ON public.ceva_driver_documents(document_type);

-- =============================================================================
-- TABLE: ceva_contracts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_contracts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_name  TEXT NOT NULL,
  weight_tons    NUMERIC,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_contracts_created_by_idx ON public.ceva_contracts(created_by);

-- =============================================================================
-- TABLE: ceva_loads
-- Main operational table. Includes all daily tracking report fields.
-- Each row = one truck movement on the daily report.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_loads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_number     TEXT UNIQUE,       -- Auto: L-1000, L-1001 ...
  order_number    TEXT,
  loading_number  TEXT,
  offloading_number TEXT,
  manifest_number TEXT,              -- e.g. I325600001NT (from daily report)

  -- Client & commodity
  client          TEXT NOT NULL,
  client_id       UUID REFERENCES public.ceva_clients(id) ON DELETE SET NULL,
  client_contact  TEXT,
  material        TEXT NOT NULL,
  commodity       TEXT,              -- e.g. Citrus

  -- Route
  origin          TEXT NOT NULL,     -- Loading place
  destination     TEXT NOT NULL,     -- e.g. Khold, Bayhead
  border          TEXT,              -- Border crossing point, e.g. Beitbridge
  origin_lat      DOUBLE PRECISION,
  origin_lng      DOUBLE PRECISION,
  dest_lat        DOUBLE PRECISION,
  dest_lng        DOUBLE PRECISION,

  -- Schedule
  pickup_date     DATE NOT NULL,
  delivery_date   DATE NOT NULL,

  -- Daily tracking report milestone dates
  date_loaded               DATE,    -- Date truck was loaded
  date_arrived_border_zim   DATE,    -- Date arrived at Zimbabwe side of border
  date_arrived_border_sa    DATE,    -- Date arrived at South Africa side of border
  date_arrived_cold_stores  DATE,    -- Date arrived at cold stores / destination
  date_offloaded            DATE,    -- Date offloaded

  -- Cargo
  weight          NUMERIC,           -- in tons
  rate            NUMERIC NOT NULL DEFAULT 0,

  -- Status & notes
  status          public.ceva_load_status NOT NULL DEFAULT 'pending',
  comments        TEXT,              -- e.g. "POLOKWANE ENROUTE TO KHOLD DURBAN"
  notes           TEXT,

  -- Vehicle assignment
  assigned_vehicle TEXT,
  supplier_id      UUID REFERENCES public.ceva_transporters(id) ON DELETE SET NULL,
  horse_id         UUID REFERENCES public.ceva_horses(id) ON DELETE SET NULL,
  trailer_id       UUID REFERENCES public.ceva_trailers(id) ON DELETE SET NULL,
  trailer2_id      UUID REFERENCES public.ceva_trailers(id) ON DELETE SET NULL,
  driver_id        UUID REFERENCES public.ceva_drivers(id) ON DELETE SET NULL,
  contract_id      UUID REFERENCES public.ceva_contracts(id) ON DELETE SET NULL,

  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_loads_status_idx      ON public.ceva_loads(status);
CREATE INDEX IF NOT EXISTS ceva_loads_created_by_idx  ON public.ceva_loads(created_by);
CREATE INDEX IF NOT EXISTS ceva_loads_pickup_date_idx ON public.ceva_loads(pickup_date);
CREATE INDEX IF NOT EXISTS ceva_loads_supplier_id_idx ON public.ceva_loads(supplier_id);
CREATE INDEX IF NOT EXISTS ceva_loads_horse_id_idx    ON public.ceva_loads(horse_id);
CREATE INDEX IF NOT EXISTS ceva_loads_driver_id_idx   ON public.ceva_loads(driver_id);
CREATE INDEX IF NOT EXISTS ceva_loads_border_idx      ON public.ceva_loads(border);
CREATE INDEX IF NOT EXISTS ceva_loads_date_loaded_idx ON public.ceva_loads(date_loaded);

-- =============================================================================
-- TABLE: ceva_vehicle_combinations
-- Pre-defined truck + trailer1 + trailer2 + driver combos.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_vehicle_combinations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id  UUID NOT NULL REFERENCES public.ceva_transporters(id) ON DELETE CASCADE,
  combination_name TEXT,
  horse_id        UUID NOT NULL REFERENCES public.ceva_horses(id) ON DELETE CASCADE,
  trailer1_id     UUID NOT NULL REFERENCES public.ceva_trailers(id) ON DELETE CASCADE,
  trailer2_id     UUID REFERENCES public.ceva_trailers(id) ON DELETE SET NULL,
  driver_id       UUID NOT NULL REFERENCES public.ceva_drivers(id) ON DELETE CASCADE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_trailers CHECK (trailer1_id != trailer2_id OR trailer2_id IS NULL)
);

CREATE INDEX IF NOT EXISTS ceva_vehicle_combinations_transporter_id_idx ON public.ceva_vehicle_combinations(transporter_id);
CREATE INDEX IF NOT EXISTS ceva_vehicle_combinations_horse_id_idx       ON public.ceva_vehicle_combinations(horse_id);
CREATE INDEX IF NOT EXISTS ceva_vehicle_combinations_is_active_idx      ON public.ceva_vehicle_combinations(is_active);

-- =============================================================================
-- TABLE: ceva_vehicle_trips
-- GPS trip records from CTrack.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_vehicle_trips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id         UUID NOT NULL REFERENCES public.ceva_horses(id) ON DELETE CASCADE,
  ctrack_node_id   INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ,
  start_latitude   DOUBLE PRECISION,
  start_longitude  DOUBLE PRECISION,
  start_address    TEXT,
  end_latitude     DOUBLE PRECISION,
  end_longitude    DOUBLE PRECISION,
  end_address      TEXT,
  distance_km      REAL,
  max_speed        REAL DEFAULT 0,
  position_count   INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_idx_vt_active_trips ON public.ceva_vehicle_trips(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS ceva_idx_vt_horse_time   ON public.ceva_vehicle_trips(horse_id, start_time DESC);

-- =============================================================================
-- TABLE: ceva_vehicle_tracking_positions
-- Raw GPS positions from CTrack polling.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_vehicle_tracking_positions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  horse_id        UUID NOT NULL REFERENCES public.ceva_horses(id) ON DELETE CASCADE,
  ctrack_node_id  INTEGER NOT NULL,
  trip_id         UUID REFERENCES public.ceva_vehicle_trips(id) ON DELETE SET NULL,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  speed           REAL NOT NULL DEFAULT 0,
  heading         TEXT,
  ignition        BOOLEAN NOT NULL DEFAULT FALSE,
  address         TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_idx_vtp_horse_recorded ON public.ceva_vehicle_tracking_positions(horse_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS ceva_idx_vtp_trip_recorded  ON public.ceva_vehicle_tracking_positions(trip_id, recorded_at ASC) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ceva_idx_vtp_node_latest    ON public.ceva_vehicle_tracking_positions(ctrack_node_id, recorded_at DESC);

-- =============================================================================
-- TABLE: ceva_load_geofence_events
-- Fired when a truck arrives/departs pickup or destination.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_load_geofence_events (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  load_id      UUID NOT NULL REFERENCES public.ceva_loads(id) ON DELETE CASCADE,
  horse_id     UUID NOT NULL REFERENCES public.ceva_horses(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('arrived_pickup', 'left_pickup', 'arrived_destination', 'left_destination')),
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(load_id, event_type)
);

CREATE INDEX IF NOT EXISTS ceva_idx_lge_load_id ON public.ceva_load_geofence_events(load_id);
CREATE INDEX IF NOT EXISTS ceva_idx_lge_horse   ON public.ceva_load_geofence_events(horse_id, occurred_at DESC);

-- =============================================================================
-- TABLE: ceva_audit_logs
-- Automatically tracks all INSERT/UPDATE/DELETE on key tables.
-- Visible to admins only.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ceva_audit_logs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name      TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data        JSONB,
  new_data        JSONB,
  changed_fields  TEXT[],
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ceva_idx_audit_table_created ON public.ceva_audit_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS ceva_idx_audit_user          ON public.ceva_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ceva_idx_audit_action        ON public.ceva_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS ceva_idx_audit_record        ON public.ceva_audit_logs(table_name, record_id, created_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-create profile on new signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE TRIGGER ceva_profiles_updated_at            BEFORE UPDATE ON public.ceva_profiles            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ceva_clients_updated_at             BEFORE UPDATE ON public.ceva_clients             FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ceva_transporters_updated_at        BEFORE UPDATE ON public.ceva_transporters        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ceva_horses_updated_at              BEFORE UPDATE ON public.ceva_horses              FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ceva_trailers_updated_at            BEFORE UPDATE ON public.ceva_trailers            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ceva_drivers_updated_at             BEFORE UPDATE ON public.ceva_drivers             FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ceva_contracts_updated_at           BEFORE UPDATE ON public.ceva_contracts           FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ceva_loads_updated_at               BEFORE UPDATE ON public.ceva_loads               FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ceva_vehicle_combinations_updated_at BEFORE UPDATE ON public.ceva_vehicle_combinations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ceva_vehicle_trips_updated_at       BEFORE UPDATE ON public.ceva_vehicle_trips       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-generate load number on insert
CREATE TRIGGER ceva_loads_load_number
  BEFORE INSERT ON public.ceva_loads
  FOR EACH ROW EXECUTE FUNCTION public.generate_ceva_load_number();

-- Audit log triggers (key operational tables)
CREATE TRIGGER ceva_audit_loads         AFTER INSERT OR UPDATE OR DELETE ON public.ceva_loads         FOR EACH ROW EXECUTE FUNCTION public.ceva_audit_log_trigger();
CREATE TRIGGER ceva_audit_transporters  AFTER INSERT OR UPDATE OR DELETE ON public.ceva_transporters  FOR EACH ROW EXECUTE FUNCTION public.ceva_audit_log_trigger();
CREATE TRIGGER ceva_audit_horses        AFTER INSERT OR UPDATE OR DELETE ON public.ceva_horses        FOR EACH ROW EXECUTE FUNCTION public.ceva_audit_log_trigger();
CREATE TRIGGER ceva_audit_trailers      AFTER INSERT OR UPDATE OR DELETE ON public.ceva_trailers      FOR EACH ROW EXECUTE FUNCTION public.ceva_audit_log_trigger();
CREATE TRIGGER ceva_audit_drivers       AFTER INSERT OR UPDATE OR DELETE ON public.ceva_drivers       FOR EACH ROW EXECUTE FUNCTION public.ceva_audit_log_trigger();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.ceva_profiles                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_clients                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_transporters                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_horses                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_trailers                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_drivers                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_transporter_documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_driver_documents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_contracts                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_loads                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_vehicle_combinations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_vehicle_trips                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_vehicle_tracking_positions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_load_geofence_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceva_audit_logs                      ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- ceva_profiles
-- USER: view/update own profile only
-- ADMIN: view and update ALL profiles
-- ------------------------------------------
CREATE POLICY "Users can view own profile"
  ON public.ceva_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.ceva_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.ceva_profiles FOR SELECT USING (public.ceva_get_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON public.ceva_profiles FOR UPDATE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_clients
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "All authenticated can view clients"
  ON public.ceva_clients FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated can create clients"
  ON public.ceva_clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "All authenticated can update clients"
  ON public.ceva_clients FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete clients"
  ON public.ceva_clients FOR DELETE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_transporters
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "Users and admins can view transporters"
  ON public.ceva_transporters FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can create transporters"
  ON public.ceva_transporters FOR INSERT WITH CHECK (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can update transporters"
  ON public.ceva_transporters FOR UPDATE USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Admins can delete transporters"
  ON public.ceva_transporters FOR DELETE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_horses
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "Users and admins can view horses"
  ON public.ceva_horses FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can create horses"
  ON public.ceva_horses FOR INSERT WITH CHECK (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can update horses"
  ON public.ceva_horses FOR UPDATE USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Admins can delete horses"
  ON public.ceva_horses FOR DELETE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_trailers
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "Users and admins can view trailers"
  ON public.ceva_trailers FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can create trailers"
  ON public.ceva_trailers FOR INSERT WITH CHECK (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can update trailers"
  ON public.ceva_trailers FOR UPDATE USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Admins can delete trailers"
  ON public.ceva_trailers FOR DELETE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_drivers
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "Users and admins can view drivers"
  ON public.ceva_drivers FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can create drivers"
  ON public.ceva_drivers FOR INSERT WITH CHECK (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can update drivers"
  ON public.ceva_drivers FOR UPDATE USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Admins can delete drivers"
  ON public.ceva_drivers FOR DELETE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_transporter_documents
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "Users and admins can view transporter docs"
  ON public.ceva_transporter_documents FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can upload transporter docs"
  ON public.ceva_transporter_documents FOR INSERT WITH CHECK (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can update transporter docs"
  ON public.ceva_transporter_documents FOR UPDATE USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Admins can delete transporter docs"
  ON public.ceva_transporter_documents FOR DELETE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_driver_documents
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "Users and admins can view driver docs"
  ON public.ceva_driver_documents FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can upload driver docs"
  ON public.ceva_driver_documents FOR INSERT WITH CHECK (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can update driver docs"
  ON public.ceva_driver_documents FOR UPDATE USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Admins can delete driver docs"
  ON public.ceva_driver_documents FOR DELETE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_contracts
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "Users and admins can view contracts"
  ON public.ceva_contracts FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can create contracts"
  ON public.ceva_contracts FOR INSERT WITH CHECK (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can update contracts"
  ON public.ceva_contracts FOR UPDATE USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Admins can delete contracts"
  ON public.ceva_contracts FOR DELETE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_loads
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "Users and admins can view loads"
  ON public.ceva_loads FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can create loads"
  ON public.ceva_loads FOR INSERT WITH CHECK (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can update loads"
  ON public.ceva_loads FOR UPDATE USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Admins can delete loads"
  ON public.ceva_loads FOR DELETE USING (public.ceva_get_user_role() = 'admin');

-- ------------------------------------------
-- ceva_vehicle_combinations
-- USER: SELECT, INSERT, UPDATE
-- ADMIN: SELECT, INSERT, UPDATE, DELETE
-- ------------------------------------------
CREATE POLICY "Users and admins can view vehicle combinations"
  ON public.ceva_vehicle_combinations FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Users and admins can manage vehicle combinations"
  ON public.ceva_vehicle_combinations FOR ALL USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

-- ------------------------------------------
-- ceva_vehicle_trips
-- USER: SELECT only (GPS data, read-only for staff)
-- ADMIN: SELECT only
-- ------------------------------------------
CREATE POLICY "Users and admins can view vehicle trips"
  ON public.ceva_vehicle_trips FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

-- ------------------------------------------
-- ceva_vehicle_tracking_positions
-- USER: SELECT only
-- ADMIN: SELECT only
-- ------------------------------------------
CREATE POLICY "Users and admins can view tracking positions"
  ON public.ceva_vehicle_tracking_positions FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

-- ------------------------------------------
-- ceva_load_geofence_events
-- USER: SELECT only
-- ADMIN: SELECT only
-- ------------------------------------------
CREATE POLICY "Users and admins can view geofence events"
  ON public.ceva_load_geofence_events FOR SELECT USING (public.ceva_get_user_role() IN ('dispatcher', 'admin'));

-- ------------------------------------------
-- ceva_audit_logs
-- USER: NO ACCESS
-- ADMIN: SELECT only (read-only, written by trigger)
-- ------------------------------------------
CREATE POLICY "Admins only can view audit logs"
  ON public.ceva_audit_logs FOR SELECT USING (public.ceva_get_user_role() = 'admin');

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- STORAGE BUCKET: transporter-documents
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transporter-documents',
  'transporter-documents',
  FALSE,
  10485760,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'transporter-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'transporter-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'transporter-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'transporter-documents' AND public.ceva_get_user_role() = 'admin');

-- =============================================================================
-- DATA RETENTION FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_ceva_tracking_data(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(positions_deleted BIGINT, trips_deleted BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  pos_count BIGINT;
  trip_count BIGINT;
BEGIN
  DELETE FROM public.ceva_vehicle_tracking_positions
  WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS pos_count = ROW_COUNT;

  DELETE FROM public.ceva_vehicle_trips
  WHERE status = 'completed'
    AND end_time < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS trip_count = ROW_COUNT;

  RETURN QUERY SELECT pos_count, trip_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_ceva_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM public.ceva_audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
