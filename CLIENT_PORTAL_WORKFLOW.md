# Client Portal Setup - Complete Workflow

## Overview
This guide explains how to give clients access to the tracking portal at `/client/dashboard`. Clients will only see loads for their company.

**Client Login Credentials**:
- Email: Their email address
- Password: `CevaCitrus2026!` (default for all clients)

---

## ONE-TIME SETUP (Run Once)

Before creating your first client user, run this SQL in Supabase SQL Editor:

```sql
-- File: FINAL_CLIENT_SETUP.sql (run the entire file)
```

This adds:
1. A `user_id` column to link clients to their auth accounts
2. RLS policy that filters loads to only show each client their own data

**Status**: ✅ This should already be done if you ran `FINAL_CLIENT_SETUP.sql`

---

## FOR EACH CLIENT (3-Step Process)

### Step 1: Create Client in the App ✅ (You do this)

1. Go to `/admin/clients` in your application
2. Click "Add Client"
3. Fill in the form:
   - **Name**: Client company name (e.g., "Sundays River Citrus")
   - **Email**: Client's email (e.g., "info@sundaysriver.co.za") ⚠️ REQUIRED
   - Contact number, addresses, notes (optional)
4. Click "Add Client"

**Result**: Client record created in `ceva_clients` table with their email

---

### Step 2: Create Auth User in Supabase Dashboard

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add User"**
3. Fill in:
   - **Email**: Same email as Step 1 (e.g., "info@sundaysriver.co.za")
   - **Password**: `CevaCitrus2026!`
   - **Auto Confirm User**: ✅ **YES** (important!)
4. Click **"Create User"**

**Result**: Auth user created in `auth.users` table

---

### Step 3: Link Client to User (SQL)

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy this template and **replace the email** with the actual client email:

```sql
-- Replace 'info@sundaysriver.co.za' with actual client email (3 places)

-- Link user to client record
UPDATE ceva_clients
SET user_id = (SELECT id FROM auth.users WHERE email = 'info@sundaysriver.co.za')
WHERE email = 'info@sundaysriver.co.za';

-- Set role to client
UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'info@sundaysriver.co.za';

-- Verify setup (should show client name, email, role='client', linked=true)
SELECT
  c.name as client_name,
  c.email,
  p.role,
  c.user_id IS NOT NULL as linked
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON c.user_id = p.id
WHERE c.email = 'info@sundaysriver.co.za';
```

3. Click **"Run"**
4. Check the verification query result shows:
   - `client_name`: The client company name
   - `email`: The client email
   - `role`: `client`
   - `linked`: `true`

**Result**: Client can now log in and see their loads

---

## Testing

### 1. Client Login Test
1. Open your app in incognito/private window
2. Go to `/login`
3. Enter:
   - Email: The client's email
   - Password: `CevaCitrus2026!`
4. Should redirect to `/client/dashboard`

### 2. Data Filtering Test
1. While logged in as client, verify:
   - ✅ Can see loads where `client` field matches their company name
   - ✅ Can see loads where `client_id` matches their ID
   - ❌ Cannot see loads for other clients
   - ✅ Cannot access `/admin` routes (should get 403 or redirect)

### 3. Create Test Load
1. Log in as admin/dispatcher
2. Create a test load with:
   - **Client**: Select the client company name
   - **Material**: Citrus
   - Other required fields
3. Log out and log in as the client
4. Verify the load appears on their dashboard

---

## Troubleshooting

### Client sees no loads
**Cause**: Load's `client` field doesn't match the client's name exactly
**Fix**: Ensure when creating loads, you select the client from the dropdown (this sets both `client` name and `client_id`)

### Login fails
**Cause**: User not created or email doesn't match
**Fix**:
1. Check user exists in Supabase → Authentication → Users
2. Verify email matches exactly (case-sensitive)
3. Verify "Auto Confirm User" was checked

### "Permission denied" error
**Cause**: Role not set to 'client' or user_id not linked
**Fix**: Run Step 3 SQL again to link and set role

### Client sees ALL loads (not just theirs)
**Cause**: RLS policy not applied
**Fix**: Re-run `FINAL_CLIENT_SETUP.sql`

---

## How It Works (Technical)

1. **Client Table** (`ceva_clients`):
   - Has `user_id` column linking to auth user
   - Contains client company info and email

2. **Auth User** (`auth.users`):
   - Standard Supabase auth account
   - Email must match client's email

3. **Profile** (`ceva_profiles`):
   - Has `role` set to `'client'`
   - Used by `ceva_get_user_role()` function

4. **RLS Policy** (on `ceva_loads`):
   ```sql
   -- If user role is 'client', only show loads where:
   -- 1. client name matches, OR
   -- 2. client_id matches
   -- If user is admin/dispatcher, show all loads
   ```

5. **Dashboard**:
   - Route: `/client/dashboard`
   - Uses `CitrusDashboardClient` component with `isClientView={true}`
   - Clean layout without admin navigation

---

## Security Notes

- ✅ Clients can only view data (read-only)
- ✅ Clients cannot create, edit, or delete loads
- ✅ Clients cannot access admin routes
- ✅ Each client only sees their own loads via RLS
- ⚠️ Default password is `CevaCitrus2026!` - clients should change it (Supabase provides password reset functionality)

---

## Default Password Policy

All clients use the same default password: `CevaCitrus2026!`

**Why?**
- Easy for you to communicate to clients
- Easy for clients to remember
- Clients can reset via Supabase auth if needed

**Security Recommendation**:
If clients need individual passwords, create them manually in Supabase Dashboard when creating the auth user (Step 2).

---

## Quick Reference

| Step | Where | What |
|------|-------|------|
| 1 | App: `/admin/clients` | Create client with email |
| 2 | Supabase: Authentication → Users | Create user with email & password |
| 3 | Supabase: SQL Editor | Run UPDATE queries to link |

**Default Password**: `CevaCitrus2026!`

**Client Portal URL**: `/client/dashboard`

---

## Example: Complete Walkthrough

Let's create a client for "Sundays River Citrus":

### Step 1: App
```
Route: /admin/clients
Click: "Add Client"
Name: Sundays River Citrus
Email: info@sundaysriver.co.za
Contact: +27 42 295 0000
Click: "Add Client"
```

### Step 2: Supabase Dashboard
```
Go to: Authentication → Users → Add User
Email: info@sundaysriver.co.za
Password: CevaCitrus2026!
Auto Confirm: ✅ YES
Click: "Create User"
```

### Step 3: SQL Editor
```sql
UPDATE ceva_clients
SET user_id = (SELECT id FROM auth.users WHERE email = 'info@sundaysriver.co.za')
WHERE email = 'info@sundaysriver.co.za';

UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'info@sundaysriver.co.za';
```

### Test:
```
1. Open incognito window
2. Go to /login
3. Login: info@sundaysriver.co.za / CevaCitrus2026!
4. Should see /client/dashboard with only Sundays River loads
```

---

## Summary

✅ **Client created in app** → has email
✅ **Auth user created in Supabase** → same email, password `CevaCitrus2026!`
✅ **SQL links them** → sets user_id and role='client'
✅ **RLS filters data** → client sees only their loads
✅ **Client logs in** → goes to `/client/dashboard`

**This workflow works because:**
- The app creates clients with email addresses
- Supabase auth uses those same emails
- SQL links them via `user_id` column
- RLS policy filters based on the link
