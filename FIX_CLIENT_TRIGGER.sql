-- =============================================================================
-- Fix Client Creation Trigger
-- The old trigger tries to create a client record when auth user is created,
-- but we now create the client FIRST, then the auth user.
-- This migration drops the problematic trigger.
-- =============================================================================

-- Drop the trigger that creates a client record on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created_client ON auth.users;

-- Drop the function (we don't need it anymore)
DROP FUNCTION IF EXISTS public.handle_new_client();

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ Client creation trigger removed successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Clients are now created FIRST in the portal, then the auth';
  RAISE NOTICE 'user is created and linked automatically.';
  RAISE NOTICE '';
  RAISE NOTICE 'Try creating a client in /admin/clients now!';
  RAISE NOTICE '============================================================';
END $$;
