# Client Auto-User Creation Guide

## 🎯 Overview

When you create a **client** (customer/shipper) in the system with an email address, a user account is **automatically created** so they can login and track their loads.

---

## 🚀 Setup

### Step 1: Run the Migration

```bash
# Copy and run in Supabase SQL Editor:
supabase/migrations/20260326120000_auto_create_client_users.sql
```

This migration:
- ✅ Adds `user_id` column to `ceva_clients` table
- ✅ Creates trigger to auto-create auth users
- ✅ Sets up RLS policies for client-specific filtering
- ✅ Updates existing clients with email addresses

---

## 📋 How It Works

### When Dispatcher Creates a Client:

1. **Dispatcher goes to Clients Management**
   - Navigate to `/admin/clients`
   - Click "Add Client"

2. **Fills in Client Details:**
   ```
   Name: ABC Citrus Farms
   Email: abc@example.com    ← KEY: Must provide email
   Phone: 082 123 4567
   Address: Nottingham Road, KZN
   ```

3. **System Automatically:**
   - ✅ Creates auth user with email: `abc@example.com`
   - ✅ Sets password to: `CevaCitrus2026!`
   - ✅ Creates profile with role: `client`
   - ✅ Links client record to user account

### When Client Logs In:

1. **Client visits:** `http://your-domain.com/login`

2. **Credentials:**
   ```
   Email: abc@example.com
   Password: CevaCitrus2026!
   ```

3. **Redirected to:** `/client/dashboard`

4. **Client sees:**
   - ✅ ONLY their loads (filtered automatically)
   - ✅ Milestone tracking for their shipments
   - ✅ Real-time updates every 30 seconds
   - ✅ Full-screen mode option

---

## 🧪 Testing

### Test Scenario 1: Create New Client

1. **As Admin/Dispatcher:**
   - Go to `/admin/clients`
   - Click "Add Client"
   - Fill in:
     ```
     Name: Test Citrus Co
     Email: testclient@example.com
     Phone: 082 999 9999
     ```
   - Save

2. **Verify User Created:**
   ```sql
   -- Check auth user was created
   SELECT id, email FROM auth.users WHERE email = 'testclient@example.com';

   -- Check profile was created
   SELECT email, role FROM ceva_profiles WHERE email = 'testclient@example.com';

   -- Check link in client table
   SELECT name, email, user_id FROM ceva_clients WHERE email = 'testclient@example.com';
   ```

3. **Test Login:**
   - Go to `/login`
   - Email: `testclient@example.com`
   - Password: `CevaCitrus2026!`
   - Should redirect to `/client/dashboard`

### Test Scenario 2: Create Load for Client

1. **As Dispatcher:**
   - Go to `/admin/loads`
   - Create load:
     ```
     Client: Test Citrus Co  ← Select from dropdown
     Material: Citrus
     Status: in_transit
     Pickup Date: 2026-03-26
     Origin: Nottingham
     Destination: K-Hold, Durban
     ```

2. **As Client:**
   - Login as `testclient@example.com`
   - Go to `/client/dashboard`
   - Should see the load!

3. **Add Milestones (as admin):**
   ```sql
   UPDATE ceva_loads
   SET
     date_loaded = '2026-03-26 08:00:00',
     date_arrived_border_sa = '2026-03-26 14:00:00'
   WHERE client = 'Test Citrus Co';
   ```

4. **Refresh client dashboard:**
   - Should see milestone timeline updated
   - Green checkmarks on completed milestones

### Test Scenario 3: Multiple Clients

1. **Create 3 clients:**
   - Client A: `clienta@example.com`
   - Client B: `clientb@example.com`
   - Client C: `clientc@example.com`

2. **Create loads for each:**
   - 2 loads for Client A
   - 3 loads for Client B
   - 1 load for Client C

3. **Login as Client A:**
   - Should see ONLY 2 loads (their own)
   - Should NOT see Client B or C loads

4. **Login as Client B:**
   - Should see ONLY 3 loads
   - Should NOT see Client A or C loads

**✅ This confirms RLS filtering works!**

---

## 🔐 Default Password

**All clients get the same default password:**
```
CevaCitrus2026!
```

### Why?

- Easy for clients to remember
- Consistent across all clients
- Clients can change it later (when password reset is implemented)

### To Change a Client's Password:

```sql
-- Reset password for a specific client
UPDATE auth.users
SET encrypted_password = crypt('NewPassword123!', gen_salt('bf'))
WHERE email = 'client@example.com';
```

---

## 📊 Client Portal Features

### What Clients Can See:

✅ **Their Active Loads**
- Status: assigned or in_transit
- Filtered to 2026 citrus season (March-October)
- ONLY loads where client name matches

✅ **Milestone Timeline**
- 6-milestone visual tracking
- Color-coded: Yellow → Green → Blue
- Timestamps for each milestone

✅ **Load Details**
- Load number & manifest
- Route (origin → destination)
- Transporter & driver
- Controller assigned

✅ **Auto-Refresh**
- Updates every 30 seconds
- No manual refresh needed

✅ **Full-Screen Mode**
- Clean display for premises
- Exit via Minimize button or ESC key

### What Clients CANNOT Do:

❌ Create new loads
❌ Edit load details
❌ Change status
❌ Assign vehicles
❌ See other clients' loads
❌ Access admin functions

**Strictly read-only for their own loads!**

---

## 🛠️ Troubleshooting

### Issue: User not created when client added

**Check:**
```sql
-- Verify trigger exists
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'create_client_auth_user_trigger';
```

**If missing, re-run migration:**
```sql
-- Re-create trigger
-- Copy from: 20260326120000_auto_create_client_users.sql
```

### Issue: Client can't login

**Check user exists:**
```sql
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'client@example.com';
```

**If missing `email_confirmed_at`, fix it:**
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'client@example.com';
```

### Issue: Client sees no loads

**Check client has loads:**
```sql
SELECT load_number, client, status
FROM ceva_loads
WHERE client = 'Client Name';
```

**Check client link:**
```sql
SELECT c.name, c.email, c.user_id, u.email as user_email
FROM ceva_clients c
LEFT JOIN auth.users u ON c.user_id = u.id
WHERE c.email = 'client@example.com';
```

**If `user_id` is NULL, update client:**
```sql
UPDATE ceva_clients
SET email = email  -- Triggers the trigger
WHERE email = 'client@example.com';
```

### Issue: Client sees other clients' loads

**Check RLS policy:**
```sql
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'ceva_loads'
AND policyname = 'Clients can view own loads';
```

**If missing, re-run migration to recreate policy.**

---

## 📝 Important Notes

### Existing Clients

- Migration automatically creates users for **all existing clients** with email addresses
- They can login immediately with `CevaCitrus2026!`

### Updating Client Email

- If you update a client's email, a new user will be created
- Old user remains (not deleted automatically)
- Manual cleanup may be needed

### Deleting Clients

- If you delete a client from `ceva_clients`, the auth user remains
- User won't be able to see loads (no client link)
- Consider disabling user instead of deleting client

### Security

- RLS policies enforce client-specific filtering
- No way for Client A to see Client B's data
- Database-level security, not just UI filtering

---

## ✅ Checklist

Before going live:

- [ ] Run migration successfully
- [ ] Test creating new client with email
- [ ] Verify auto-user creation works
- [ ] Test client login with default password
- [ ] Confirm client sees only their loads
- [ ] Test with multiple clients (isolation check)
- [ ] Test full-screen mode on client dashboard
- [ ] Verify auto-refresh works
- [ ] Document default password for clients
- [ ] Train dispatchers on client creation process

---

## 📞 Support

**Default Password for ALL Clients:**
```
CevaCitrus2026!
```

**Client Portal URL:**
```
/client/dashboard
```

**For Issues:**
- Check migration ran successfully
- Verify trigger exists on `ceva_clients`
- Check RLS policies are active
- Ensure client has email address
- Confirm loads exist with matching client name

---

**Created:** 26 March 2026
**Purpose:** Auto-create user accounts for clients
**SOW Reference:** Section 3.1.3 - Client Dashboard
