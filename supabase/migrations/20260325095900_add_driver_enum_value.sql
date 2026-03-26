-- =============================================================================
-- Add 'driver' enum value to ceva_user_role
-- This must be in a separate migration from its usage due to PostgreSQL enum constraints
-- =============================================================================

-- Add 'driver' to the user_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'driver'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'ceva_user_role'
    )
  ) THEN
    ALTER TYPE public.ceva_user_role ADD VALUE 'driver';
  END IF;
END $$;
