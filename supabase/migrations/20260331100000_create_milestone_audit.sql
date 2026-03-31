-- =============================================================================
-- CEVA Citrus TMS - Milestone Audit Log (CE2-T45)
-- Tracks every manual milestone update: who changed what and when
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ceva_load_milestone_audit (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id             UUID        NOT NULL REFERENCES public.ceva_loads(id) ON DELETE CASCADE,
  milestone_field     TEXT        NOT NULL,   -- e.g. 'date_johannesburg'
  milestone_name      TEXT        NOT NULL,   -- e.g. 'Johannesburg'
  previous_value      DATE,
  new_value           DATE,
  note                TEXT,
  updated_by_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_email    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ceva_milestone_audit_load_id_idx   ON public.ceva_load_milestone_audit(load_id);
CREATE INDEX ceva_milestone_audit_created_at_idx ON public.ceva_load_milestone_audit(created_at DESC);

ALTER TABLE public.ceva_load_milestone_audit ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit records
CREATE POLICY "Admins can view milestone audit"
  ON public.ceva_load_milestone_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ceva_profiles
      WHERE ceva_profiles.id = auth.uid()
        AND ceva_profiles.role = 'admin'
    )
  );

-- Authenticated users can insert (actual auth check is in the API route)
CREATE POLICY "Authenticated users can insert milestone audit"
  ON public.ceva_load_milestone_audit
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE  public.ceva_load_milestone_audit IS 'Audit trail for manual milestone updates on ceva_loads (CE2-T45)';
COMMENT ON COLUMN public.ceva_load_milestone_audit.milestone_field IS 'Column name in ceva_loads that was updated';
COMMENT ON COLUMN public.ceva_load_milestone_audit.previous_value  IS 'Value before the update (null if it was unset)';
COMMENT ON COLUMN public.ceva_load_milestone_audit.new_value       IS 'Value after the update (null if milestone was cleared)';
