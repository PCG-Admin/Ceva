-- =============================================================================
-- Vehicle Tracking History
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.mithon_vehicle_trip_status AS ENUM ('active', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- MITHON_VEHICLE_TRIPS TABLE
-- ============================================

CREATE TABLE public.mithon_vehicle_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id UUID NOT NULL REFERENCES public.mithon_horses(id) ON DELETE CASCADE,
    ctrack_node_id INTEGER NOT NULL,
    status public.mithon_vehicle_trip_status NOT NULL DEFAULT 'active',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    start_latitude DOUBLE PRECISION,
    start_longitude DOUBLE PRECISION,
    start_address TEXT,
    end_latitude DOUBLE PRECISION,
    end_longitude DOUBLE PRECISION,
    end_address TEXT,
    distance_km REAL,
    max_speed REAL DEFAULT 0,
    position_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX mithon_idx_vt_active_trips
    ON public.mithon_vehicle_trips (ctrack_node_id)
    WHERE status = 'active';

CREATE INDEX mithon_idx_vt_horse_time
    ON public.mithon_vehicle_trips (horse_id, start_time DESC);

CREATE TRIGGER mithon_handle_vehicle_trips_updated_at
    BEFORE UPDATE ON public.mithon_vehicle_trips
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- MITHON_VEHICLE_TRACKING_POSITIONS TABLE
-- ============================================

CREATE TABLE public.mithon_vehicle_tracking_positions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    horse_id UUID NOT NULL REFERENCES public.mithon_horses(id) ON DELETE CASCADE,
    ctrack_node_id INTEGER NOT NULL,
    trip_id UUID REFERENCES public.mithon_vehicle_trips(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed REAL NOT NULL DEFAULT 0,
    heading TEXT,
    ignition BOOLEAN NOT NULL DEFAULT false,
    address TEXT,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX mithon_idx_vtp_horse_recorded
    ON public.mithon_vehicle_tracking_positions (horse_id, recorded_at DESC);

CREATE INDEX mithon_idx_vtp_trip_recorded
    ON public.mithon_vehicle_tracking_positions (trip_id, recorded_at ASC)
    WHERE trip_id IS NOT NULL;

CREATE INDEX mithon_idx_vtp_node_latest
    ON public.mithon_vehicle_tracking_positions (ctrack_node_id, recorded_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.mithon_vehicle_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mithon_vehicle_tracking_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispatchers and admins can view vehicle trips"
    ON public.mithon_vehicle_trips FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

CREATE POLICY "Dispatchers and admins can view tracking positions"
    ON public.mithon_vehicle_tracking_positions FOR SELECT TO authenticated
    USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));

GRANT SELECT ON public.mithon_vehicle_trips TO authenticated;
GRANT SELECT ON public.mithon_vehicle_tracking_positions TO authenticated;

-- ============================================
-- DATA RETENTION CLEANUP
-- ============================================

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
