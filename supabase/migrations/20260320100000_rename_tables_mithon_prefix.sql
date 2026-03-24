-- =============================================================================
-- Rename all Mithon tables to use mithon_ prefix
-- Conditional: skips tables that don't exist (safe for fresh installs where
-- migration files already create tables with the mithon_ prefix)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_profiles') THEN
    ALTER TABLE public.profiles RENAME TO mithon_profiles;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loads')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_loads') THEN
    ALTER TABLE public.loads RENAME TO mithon_loads;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transporters')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_transporters') THEN
    ALTER TABLE public.transporters RENAME TO mithon_transporters;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transporter_documents')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_transporter_documents') THEN
    ALTER TABLE public.transporter_documents RENAME TO mithon_transporter_documents;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'horses')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_horses') THEN
    ALTER TABLE public.horses RENAME TO mithon_horses;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trailers')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_trailers') THEN
    ALTER TABLE public.trailers RENAME TO mithon_trailers;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drivers')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_drivers') THEN
    ALTER TABLE public.drivers RENAME TO mithon_drivers;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_documents')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_driver_documents') THEN
    ALTER TABLE public.driver_documents RENAME TO mithon_driver_documents;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_combinations')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_vehicle_combinations') THEN
    ALTER TABLE public.vehicle_combinations RENAME TO mithon_vehicle_combinations;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contracts')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_contracts') THEN
    ALTER TABLE public.contracts RENAME TO mithon_contracts;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_clients') THEN
    ALTER TABLE public.clients RENAME TO mithon_clients;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_trips')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_vehicle_trips') THEN
    ALTER TABLE public.vehicle_trips RENAME TO mithon_vehicle_trips;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_tracking_positions')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_vehicle_tracking_positions') THEN
    ALTER TABLE public.vehicle_tracking_positions RENAME TO mithon_vehicle_tracking_positions;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_delivery_confirmations')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_whatsapp_delivery_confirmations') THEN
    ALTER TABLE public.whatsapp_delivery_confirmations RENAME TO mithon_whatsapp_delivery_confirmations;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'load_geofence_events')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_load_geofence_events') THEN
    ALTER TABLE public.load_geofence_events RENAME TO mithon_load_geofence_events;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs')
    AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mithon_audit_logs') THEN
    ALTER TABLE public.audit_logs RENAME TO mithon_audit_logs;
  END IF;
END $$;

-- =============================================================================
-- Update functions that reference the renamed tables
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mithon_get_user_role()
RETURNS public.mithon_user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.mithon_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.mithon_profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'dispatcher')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_changed TEXT[];
  v_record_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := COALESCE(OLD.id::TEXT, '');
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_changed := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := COALESCE(NEW.id::TEXT, '');
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_changed := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := COALESCE(NEW.id::TEXT, '');
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_changed := ARRAY(
      SELECT key FROM jsonb_each(v_new)
      WHERE key != 'updated_at'
        AND (NOT v_old ? key OR v_old->key IS DISTINCT FROM v_new->key)
    );
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.mithon_audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, v_changed, auth.uid());

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(positions_deleted BIGINT, trips_deleted BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    pos_count BIGINT;
    trip_count BIGINT;
BEGIN
    DELETE FROM public.mithon_vehicle_tracking_positions
    WHERE recorded_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS pos_count = ROW_COUNT;

    DELETE FROM public.mithon_vehicle_trips
    WHERE status = 'completed'
      AND end_time < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS trip_count = ROW_COUNT;

    RETURN QUERY SELECT pos_count, trip_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM public.mithon_audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
