-- =============================================================================
-- Check if azande@pc-group.net client user is set up correctly
-- =============================================================================

-- Check 1: Does client exist in ceva_clients?
SELECT
  'Client Record' as check_type,
  name,
  email,
  user_id,
  CASE WHEN user_id IS NULL THEN '❌ Not linked' ELSE '✅ Linked' END as status
FROM public.ceva_clients
WHERE email = 'azande@pc-group.net';

-- Check 2: Does auth user exist?
SELECT
  'Auth User' as check_type,
  id,
  email,
  email_confirmed_at,
  CASE WHEN email_confirmed_at IS NULL THEN '❌ Not confirmed' ELSE '✅ Confirmed' END as status
FROM auth.users
WHERE email = 'azande@pc-group.net';

-- Check 3: Does profile exist with correct role?
SELECT
  'Profile' as check_type,
  id,
  email,
  role,
  CASE WHEN role = 'client' THEN '✅ Client role' ELSE '❌ Wrong role: ' || role END as status
FROM public.ceva_profiles
WHERE email = 'azande@pc-group.net';

-- Check 4: Complete join to see the full picture
SELECT
  c.name as client_name,
  c.email as client_email,
  c.user_id as client_user_id,
  u.id as auth_user_id,
  u.email_confirmed_at,
  p.role as profile_role,
  CASE
    WHEN c.user_id IS NULL THEN '❌ Client not linked to auth user'
    WHEN u.id IS NULL THEN '❌ Auth user does not exist'
    WHEN u.email_confirmed_at IS NULL THEN '❌ Auth user not confirmed'
    WHEN p.role IS NULL THEN '❌ Profile does not exist'
    WHEN p.role != 'client' THEN '❌ Wrong role: ' || p.role
    ELSE '✅ Setup complete'
  END as diagnosis
FROM public.ceva_clients c
LEFT JOIN auth.users u ON u.email = c.email
LEFT JOIN public.ceva_profiles p ON p.id = c.user_id
WHERE c.email = 'azande@pc-group.net';
