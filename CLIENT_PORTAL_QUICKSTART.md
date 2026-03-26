# Client Portal - Quick Start Checklist

## ✅ One-Time Setup (Do This First)

### Step 1: Run Initial Setup SQL
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Run the entire file: `FINAL_CLIENT_SETUP.sql`
- [ ] Verify you see success message
- [ ] ✅ This adds `user_id` column and RLS policy

### Step 2: Verify Setup
- [ ] Run `VERIFY_CLIENT_SETUP.sql` in SQL Editor
- [ ] Check all items show ✅
- [ ] If any show ❌, re-run `FINAL_CLIENT_SETUP.sql`

---

## 📋 For Each New Client (3 Steps)

### Example: Setting up "Sundays River Citrus"

#### Step 1: Create Client in App (2 min)
- [ ] Go to `/admin/clients`
- [ ] Click "Add Client"
- [ ] Fill in:
  - **Name**: `Sundays River Citrus`
  - **Email**: `info@sundaysriver.co.za` ⚠️ REQUIRED
  - Contact, addresses (optional)
- [ ] Click "Add Client"
- [ ] ✅ Client created

#### Step 2: Create Auth User (2 min)
- [ ] Supabase Dashboard → **Authentication** → **Users**
- [ ] Click **"Add User"**
- [ ] Fill in:
  - **Email**: `info@sundaysriver.co.za` (same as Step 1)
  - **Password**: `CevaCitrus2026!`
  - **Auto Confirm User**: ✅ **CHECK THIS BOX**
- [ ] Click "Create User"
- [ ] ✅ Auth user created

#### Step 3: Link User to Client (1 min)
- [ ] Supabase Dashboard → **SQL Editor**
- [ ] Copy this SQL and **replace email** (3 places):

```sql
-- Replace 'info@sundaysriver.co.za' with your client's email

UPDATE ceva_clients
SET user_id = (SELECT id FROM auth.users WHERE email = 'info@sundaysriver.co.za')
WHERE email = 'info@sundaysriver.co.za';

UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'info@sundaysriver.co.za';

-- Verify (should show client_name, email, role='client', linked=true)
SELECT
  c.name as client_name,
  c.email,
  p.role,
  c.user_id IS NOT NULL as linked
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON c.user_id = p.id
WHERE c.email = 'info@sundaysriver.co.za';
```

- [ ] Click "Run"
- [ ] Check verification shows:
  - `client_name`: Sundays River Citrus
  - `email`: info@sundaysriver.co.za
  - `role`: client
  - `linked`: true
- [ ] ✅ Client ready!

---

## 🧪 Test Client Access (2 min)

#### Step 1: Test Login
- [ ] Open **incognito/private browser window**
- [ ] Go to your app URL + `/login`
- [ ] Login with:
  - Email: `info@sundaysriver.co.za`
  - Password: `CevaCitrus2026!`
- [ ] Should redirect to `/client/dashboard`
- [ ] ✅ Login works

#### Step 2: Test Data Filtering
- [ ] As admin, create test load with **Client = "Sundays River Citrus"**
- [ ] Log out and log in as client
- [ ] Verify client sees the test load
- [ ] Verify client does NOT see loads for other clients
- [ ] ✅ Filtering works

#### Step 3: Test Permissions
- [ ] While logged in as client, try to access `/admin`
- [ ] Should get error or redirect
- [ ] ✅ Permissions work

---

## 📝 Copy-Paste Template

When creating a client, use this SQL template (save it somewhere handy):

```sql
-- Client Setup SQL Template
-- Replace EMAIL_HERE (3 times) with actual client email

UPDATE ceva_clients
SET user_id = (SELECT id FROM auth.users WHERE email = 'EMAIL_HERE')
WHERE email = 'EMAIL_HERE';

UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'EMAIL_HERE';

-- Verify
SELECT
  c.name as client_name,
  c.email,
  p.role,
  c.user_id IS NOT NULL as linked
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON c.user_id = p.id
WHERE c.email = 'EMAIL_HERE';
```

---

## 🔑 Client Login Info

Give this to clients:

```
CEVA Logistics - Load Tracking Portal

Login URL: [YOUR_APP_URL]/login
Email: [their email]
Password: CevaCitrus2026!

After login, you will see live tracking of your citrus loads.
```

---

## ❓ Quick Troubleshooting

### Client can't login
- ✅ Check email matches exactly (case-sensitive)
- ✅ Check "Auto Confirm User" was checked in Supabase
- ✅ Verify user exists: Supabase → Authentication → Users

### Client sees no loads
- ✅ Check load's "Client" field matches client name exactly
- ✅ Run `VERIFY_CLIENT_SETUP.sql` to check linking
- ✅ Verify client is logged in (check `/client/dashboard` URL)

### Client sees ALL loads (not just theirs)
- ✅ Run `VERIFY_CLIENT_SETUP.sql`
- ✅ Check RLS policy exists
- ✅ Re-run `FINAL_CLIENT_SETUP.sql`

### "Permission denied" error
- ✅ Check role is set to 'client': Run Step 3 SQL again
- ✅ Check user_id is linked: Run Step 3 SQL again

---

## 📊 Check Status of All Clients

Run this SQL to see which clients need setup:

```sql
-- See setup status of all clients
SELECT
  c.name as "Client",
  c.email as "Email",
  CASE WHEN c.user_id IS NOT NULL THEN '✅' ELSE '❌' END as "Linked",
  COALESCE(p.role, '❌ None') as "Role",
  CASE
    WHEN c.user_id IS NOT NULL AND p.role = 'client' THEN '✅ Ready'
    WHEN c.user_id IS NULL THEN '⏳ Need Steps 2+3'
    ELSE '⏳ Need Step 3'
  END as "Status"
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON c.user_id = p.id
WHERE c.email IS NOT NULL
ORDER BY c.name;
```

Or run: `VERIFY_CLIENT_SETUP.sql`

---

## 🎯 Summary

**Total Time Per Client**: ~5 minutes

1. **App** (2 min): Create client with email
2. **Supabase Auth** (2 min): Create user with password `CevaCitrus2026!`
3. **SQL** (1 min): Run 2 UPDATE statements to link

**Files Needed**:
- `FINAL_CLIENT_SETUP.sql` - Run once to set up system
- `VERIFY_CLIENT_SETUP.sql` - Run anytime to check status
- SQL template above - Run for each client

**Default Password**: `CevaCitrus2026!` (all clients use this)

**Portal URL**: `/client/dashboard`

---

## 🚀 You're All Set!

Once you've run `FINAL_CLIENT_SETUP.sql` and verified with `VERIFY_CLIENT_SETUP.sql`, you're ready to create client accounts using the 3-step process above.

**Questions?** See [CLIENT_PORTAL_WORKFLOW.md](CLIENT_PORTAL_WORKFLOW.md) for detailed explanations.
