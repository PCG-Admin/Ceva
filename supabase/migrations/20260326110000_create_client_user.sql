-- =============================================================================
-- Create Client User for Dashboard Testing
-- Email: client@ceva.co.za
-- Password: CevaCitrus2026!
-- Role: client (read-only access to citrus dashboard)
-- =============================================================================

-- Note: This creates a test client user account
-- In production, use Supabase Auth UI or proper user management

-- Create auth user
-- Password: CevaCitrus2026!
-- Note: We disable triggers temporarily to avoid conflicts with client table
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'client@ceva.co.za';

  IF new_user_id IS NULL THEN
    -- Generate new ID
    new_user_id := gen_random_uuid();

    -- Disable triggers temporarily
    ALTER TABLE auth.users DISABLE TRIGGER ALL;

    -- Insert user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'client@ceva.co.za',
      crypt('CevaCitrus2026!', gen_salt('bf')), -- Bcrypt hash
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"CEVA Client Portal","role":"client"}',
      'authenticated',
      'authenticated'
    );

    -- Re-enable triggers
    ALTER TABLE auth.users ENABLE TRIGGER ALL;
  END IF;
END $$;

-- Create profile with client role
INSERT INTO public.ceva_profiles (
  id,
  email,
  full_name,
  phone,
  role
)
SELECT
  id,
  'client@ceva.co.za',
  'CEVA Client Portal',
  NULL,
  'client'::public.ceva_user_role
FROM auth.users
WHERE email = 'client@ceva.co.za'
ON CONFLICT (id) DO UPDATE
SET role = 'client'::public.ceva_user_role;

-- Grant read-only access to loads for client role
-- Update existing RLS policies to include client role

-- Allow clients to view loads (read-only)
DROP POLICY IF EXISTS "Clients can view loads" ON public.ceva_loads;
CREATE POLICY "Clients can view loads"
  ON public.ceva_loads FOR SELECT
  USING (public.ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

-- Allow clients to view transporters (read-only)
DROP POLICY IF EXISTS "Clients can view transporters" ON public.ceva_transporters;
CREATE POLICY "Clients can view transporters"
  ON public.ceva_transporters FOR SELECT
  USING (public.ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

-- Allow clients to view drivers (read-only)
DROP POLICY IF EXISTS "Clients can view drivers" ON public.ceva_drivers;
CREATE POLICY "Clients can view drivers"
  ON public.ceva_drivers FOR SELECT
  USING (public.ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

-- Allow clients to view horses (read-only)
DROP POLICY IF EXISTS "Clients can view horses" ON public.ceva_horses;
CREATE POLICY "Clients can view horses"
  ON public.ceva_horses FOR SELECT
  USING (public.ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

COMMENT ON POLICY "Clients can view loads" ON public.ceva_loads IS 'SOW 3.1.3 - Client dashboard read-only access';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Client user created successfully!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Email: client@ceva.co.za';
  RAISE NOTICE 'Password: CevaCitrus2026!';
  RAISE NOTICE 'Role: client (read-only)';
  RAISE NOTICE '';
  RAISE NOTICE 'Client Portal URL: /client/dashboard';
  RAISE NOTICE 'Full Screen URL: /client/dashboard (click Full Screen button)';
  RAISE NOTICE '=================================================';
END $$;
