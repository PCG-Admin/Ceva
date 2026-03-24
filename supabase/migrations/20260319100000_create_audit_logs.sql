-- =============================================================================
-- AUDIT LOGS TABLE
-- Captures INSERT/UPDATE/DELETE events across key tables via triggers
-- =============================================================================

CREATE TABLE public.mithon_audit_logs (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name     TEXT NOT NULL,
  record_id      TEXT NOT NULL,
  action         TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data       JSONB,
  new_data       JSONB,
  changed_fields TEXT[],
  user_id        UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX mithon_idx_audit_logs_table_created
  ON public.mithon_audit_logs (table_name, created_at DESC);

CREATE INDEX mithon_idx_audit_logs_user
  ON public.mithon_audit_logs (user_id, created_at DESC);

CREATE INDEX mithon_idx_audit_logs_action
  ON public.mithon_audit_logs (action, created_at DESC);

CREATE INDEX mithon_idx_audit_logs_record
  ON public.mithon_audit_logs (table_name, record_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.mithon_audit_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.mithon_audit_logs TO authenticated;

CREATE POLICY "Admins can view audit logs"
  ON public.mithon_audit_logs FOR SELECT
  TO authenticated
  USING (public.mithon_get_user_role() = 'admin');

-- =============================================================================
-- GENERIC TRIGGER FUNCTION
-- =============================================================================

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
    -- Calculate which fields actually changed (exclude updated_at noise)
    v_changed := ARRAY(
      SELECT key FROM jsonb_each(v_new)
      WHERE key != 'updated_at'
        AND (NOT v_old ? key OR v_old->key IS DISTINCT FROM v_new->key)
    );
    -- Skip logging if nothing meaningful changed (only updated_at)
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.mithon_audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, v_changed, auth.uid());

  RETURN NULL;
END;
$$;

-- =============================================================================
-- AFTER TRIGGERS ON TRACKED TABLES
-- =============================================================================

-- Loads
CREATE TRIGGER mithon_audit_loads
  AFTER INSERT OR UPDATE OR DELETE ON public.mithon_loads
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Transporters
CREATE TRIGGER mithon_audit_transporters
  AFTER INSERT OR UPDATE OR DELETE ON public.mithon_transporters
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Horses
CREATE TRIGGER mithon_audit_horses
  AFTER INSERT OR UPDATE OR DELETE ON public.mithon_horses
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Trailers
CREATE TRIGGER mithon_audit_trailers
  AFTER INSERT OR UPDATE OR DELETE ON public.mithon_trailers
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Drivers
CREATE TRIGGER mithon_audit_drivers
  AFTER INSERT OR UPDATE OR DELETE ON public.mithon_drivers
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Geofence Events
CREATE TRIGGER mithon_audit_load_geofence_events
  AFTER INSERT OR UPDATE OR DELETE ON public.mithon_load_geofence_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Vehicle Trips
CREATE TRIGGER mithon_audit_vehicle_trips
  AFTER INSERT OR UPDATE OR DELETE ON public.mithon_vehicle_trips
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Transporter Documents
CREATE TRIGGER mithon_audit_transporter_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.mithon_transporter_documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- =============================================================================
-- CLEANUP FUNCTION (retention default: 365 days)
-- =============================================================================

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
