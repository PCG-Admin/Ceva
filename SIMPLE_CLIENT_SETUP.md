# Simple Client Setup Guide

Since auto-creation has permission issues, here's the **simple manual approach**:

---

## 🎯 For Each Client

### Step 1: Create Client in System (Dispatcher)
1. Go to `/admin/clients`
2. Add client:
   ```
   Name: ABC Citrus Farms
   Email: abc@citrus.com
   Phone: 082 123 4567
   ```
3. **Write down the email!**

### Step 2: Create User Account (Admin via Supabase)
1. Open Supabase Dashboard
2. Go to: **Authentication** → **Users**
3. Click **"Add User"**
4. Fill in:
   ```
   Email: abc@citrus.com  (same as client email!)
   Password: CevaCitrus2026!
   Auto Confirm: ✅ CHECK THIS
   ```
5. Click **"Create User"**

### Step 3: Link User to Client & Set Role
Run this SQL in Supabase SQL Editor:

```sql
-- Link user to client and set role
UPDATE ceva_clients c
SET user_id = (SELECT id FROM auth.users WHERE email = 'abc@citrus.com')
WHERE c.email = 'abc@citrus.com';

-- Set user role to client
UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'abc@citrus.com';
```

### Step 4: Test Login
1. Go to `/login`
2. Email: `abc@citrus.com`
3. Password: `CevaCitrus2026!`
4. Should redirect to `/client/dashboard`
5. Should see ONLY their loads

---

## 📋 Quick SQL Template

For multiple clients, use this template:

```sql
-- Replace EMAIL and CLIENT_NAME for each client

-- 1. Link user to client
UPDATE ceva_clients c
SET user_id = (SELECT id FROM auth.users WHERE email = 'CLIENT_EMAIL')
WHERE c.email = 'CLIENT_EMAIL';

-- 2. Set user role to client
UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'CLIENT_EMAIL';

-- 3. Verify setup
SELECT
  c.name as client_name,
  c.email,
  c.user_id,
  p.role
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON c.user_id = p.id
WHERE c.email = 'CLIENT_EMAIL';
```

---

## ✅ All Clients Get:
- **Email:** Their company email
- **Password:** `CevaCitrus2026!`
- **Role:** `client`
- **Access:** `/client/dashboard`
- **See:** ONLY their loads

---

## 🔒 RLS Policy Setup

Run this once to enable client filtering:

```sql
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add user_id column to clients
ALTER TABLE public.ceva_clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ceva_clients_user_id_idx ON public.ceva_clients(user_id);

-- Create RLS policy for client-specific filtering
DROP POLICY IF EXISTS "Clients can view own loads" ON public.ceva_loads;
CREATE POLICY "Clients can view own loads"
  ON public.ceva_loads FOR SELECT
  USING (
    CASE
      WHEN public.ceva_get_user_role() = 'client' THEN
        EXISTS (
          SELECT 1 FROM public.ceva_clients c
          WHERE c.user_id = auth.uid()
          AND (c.name = ceva_loads.client OR c.id = ceva_loads.client_id)
        )
      ELSE
        public.ceva_get_user_role() IN ('dispatcher', 'admin')
    END
  );

-- Remove old policy
DROP POLICY IF EXISTS "Clients can view loads" ON public.ceva_loads;
```

---

## 📝 Workflow

**For each new client:**

1. ✅ Dispatcher adds client in system (`/admin/clients`)
2. ✅ Admin creates user in Supabase Dashboard
3. ✅ Admin runs SQL to link & set role
4. ✅ Give client their credentials:
   - Email: (their email)
   - Password: `CevaCitrus2026!`
   - URL: `yourdomain.com/client/dashboard`

**Total time:** ~2 minutes per client

---

## 🧪 Test Example

```sql
-- Example: ABC Citrus Farms

-- 1. Create user in Supabase Dashboard:
--    Email: abc@citrus.com
--    Password: CevaCitrus2026!

-- 2. Link and set role:
UPDATE ceva_clients c
SET user_id = (SELECT id FROM auth.users WHERE email = 'abc@citrus.com')
WHERE c.email = 'abc@citrus.com';

UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'abc@citrus.com';

-- 3. Verify:
SELECT
  c.name,
  c.email,
  p.role,
  c.user_id IS NOT NULL as is_linked
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON c.user_id = p.id
WHERE c.email = 'abc@citrus.com';

-- Should show:
-- name: ABC Citrus Farms
-- email: abc@citrus.com
-- role: client
-- is_linked: true
```

---

## ✨ Simple & Works!

No triggers, no complicated functions. Just:
1. Create user in Dashboard
2. Run 2 SQL statements
3. Done!

**Password for ALL clients:** `CevaCitrus2026!`
