-- Add coordinate columns to mithon_loads (nullable — existing loads geocoded lazily by cron)
ALTER TABLE public.mithon_loads
  ADD COLUMN origin_lat  DOUBLE PRECISION,
  ADD COLUMN origin_lng  DOUBLE PRECISION,
  ADD COLUMN dest_lat    DOUBLE PRECISION,
  ADD COLUMN dest_lng    DOUBLE PRECISION;

-- Geofence events table
CREATE TABLE public.mithon_load_geofence_events (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  load_id      UUID NOT NULL REFERENCES public.mithon_loads(id) ON DELETE CASCADE,
  horse_id     UUID NOT NULL REFERENCES public.mithon_horses(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('arrived_pickup','left_pickup','arrived_destination','left_destination')),
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (load_id, event_type)   -- one row per event type per load (idempotency)
);

CREATE INDEX mithon_idx_lge_load_id ON public.mithon_load_geofence_events (load_id);
CREATE INDEX mithon_idx_lge_horse ON public.mithon_load_geofence_events (horse_id, occurred_at DESC);

ALTER TABLE public.mithon_load_geofence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispatchers and admins can view geofence events"
  ON public.mithon_load_geofence_events FOR SELECT TO authenticated
  USING (public.mithon_get_user_role() IN ('dispatcher', 'admin'));
