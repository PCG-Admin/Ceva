-- =============================================================================
-- Mithon TMS Profiles Table Migration
-- Creates mithon_profiles table with auto-creation trigger for new users
-- =============================================================================

-- Create enum for user roles
DO $$ BEGIN
  CREATE TYPE public.mithon_user_role AS ENUM ('dispatcher', 'driver', 'admin', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create mithon_profiles table
CREATE TABLE public.mithon_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role public.mithon_user_role DEFAULT 'dispatcher',
  company_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX mithon_profiles_email_idx ON public.mithon_profiles(email);
CREATE INDEX mithon_profiles_company_id_idx ON public.mithon_profiles(company_id);

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

ALTER TABLE public.mithon_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.mithon_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.mithon_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.mithon_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mithon_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- Auto-create Profile Trigger
-- =============================================================================

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
    COALESCE((NEW.raw_user_meta_data->>'role')::public.mithon_user_role, 'dispatcher'::public.mithon_user_role)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Updated At Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER mithon_profiles_updated_at
  BEFORE UPDATE ON public.mithon_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- Grant Permissions
-- =============================================================================

GRANT SELECT, UPDATE ON public.mithon_profiles TO authenticated;
GRANT USAGE ON TYPE public.mithon_user_role TO authenticated;
