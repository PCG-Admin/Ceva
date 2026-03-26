-- =============================================================================
-- Auto-Create User Accounts for Clients
-- When a client is created with an email, automatically create a user account
-- Default password: CevaCitrus2026!
-- =============================================================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add user_id to ceva_clients to link to auth user
ALTER TABLE public.ceva_clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ceva_clients_user_id_idx ON public.ceva_clients(user_id);

COMMENT ON COLUMN public.ceva_clients.user_id IS 'Auth user ID for client portal access';

-- Function to create auth user for new client
CREATE OR REPLACE FUNCTION public.create_client_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Only create user if email is provided and not already linked
  IF NEW.email IS NOT NULL AND NEW.email != '' AND NEW.user_id IS NULL THEN

    -- Check if user already exists with this email
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE email = NEW.email
    ) INTO user_exists;

    IF NOT user_exists THEN
      -- Create the auth user
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        NEW.email,
        crypt('CevaCitrus2026!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', NEW.name, 'role', 'client'),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )
      RETURNING id INTO new_user_id;

      -- Update the client record with the new user_id
      NEW.user_id := new_user_id;

      -- Create profile with client role (will be handled by existing trigger)
      -- The handle_new_user trigger should create the profile automatically

    ELSE
      -- User exists, link to existing user
      SELECT id INTO new_user_id FROM auth.users WHERE email = NEW.email;
      NEW.user_id := new_user_id;

      -- Make sure profile has client role
      UPDATE public.ceva_profiles
      SET role = 'client'::public.ceva_user_role
      WHERE id = new_user_id AND role != 'admin' AND role != 'dispatcher';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on ceva_clients
DROP TRIGGER IF EXISTS create_client_auth_user_trigger ON public.ceva_clients;
CREATE TRIGGER create_client_auth_user_trigger
  BEFORE INSERT OR UPDATE ON public.ceva_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.create_client_auth_user();

-- Update existing clients to create user accounts
-- This will create users for any existing clients that have emails
UPDATE public.ceva_clients
SET email = email  -- This triggers the trigger
WHERE email IS NOT NULL AND email != '' AND user_id IS NULL;

-- Add RLS policy for clients to view only their own loads
DROP POLICY IF EXISTS "Clients can view own loads" ON public.ceva_loads;
CREATE POLICY "Clients can view own loads"
  ON public.ceva_loads FOR SELECT
  USING (
    CASE
      WHEN public.ceva_get_user_role() = 'client' THEN
        -- Client can only see loads where client name matches
        EXISTS (
          SELECT 1 FROM public.ceva_clients c
          WHERE c.user_id = auth.uid()
          AND (c.name = ceva_loads.client OR c.id = ceva_loads.client_id)
        )
      ELSE
        -- Admin and dispatcher can see all
        public.ceva_get_user_role() IN ('dispatcher', 'admin')
    END
  );

-- Update the general loads policy to include the client-specific filter
DROP POLICY IF EXISTS "Clients can view loads" ON public.ceva_loads;

COMMENT ON POLICY "Clients can view own loads" ON public.ceva_loads IS
  'SOW 3.1.3 - Clients can only view their own loads';

-- Success message
DO $$
DECLARE
  client_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO client_count
  FROM ceva_clients
  WHERE email IS NOT NULL AND email != '';

  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Client user auto-creation enabled!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Clients with email addresses: %', client_count;
  RAISE NOTICE 'Default password: CevaCitrus2026!';
  RAISE NOTICE '';
  RAISE NOTICE 'When you create a new client with an email:';
  RAISE NOTICE '  1. Auth user is created automatically';
  RAISE NOTICE '  2. Password set to: CevaCitrus2026!';
  RAISE NOTICE '  3. Client can login at: /client/dashboard';
  RAISE NOTICE '  4. Client sees ONLY their loads';
  RAISE NOTICE '=================================================';
END $$;
