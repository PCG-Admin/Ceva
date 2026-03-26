# CEVA Client User Setup Guide

## 📋 Overview

This guide explains how to set up and test the client portal for the CEVA Citrus TMS (SOW Section 3.1.3).

---

## 🚀 Quick Setup

### Step 1: Run the Database Migration

Execute the client user creation script in your Supabase SQL Editor:

```bash
# Option A: Push migration
cd c:\Users\zandi\Downloads\Ceva
supabase db push
```

**OR manually run the SQL file:**

Copy the contents of `supabase/migrations/20260326110000_create_client_user.sql` and execute in Supabase SQL Editor.

---

### Step 2: Verify User Creation

After running the migration, check that the user was created:

```sql
-- Check auth user
SELECT id, email, created_at
FROM auth.users
WHERE email = 'client@ceva.co.za';

-- Check profile
SELECT id, email, full_name, role
FROM ceva_profiles
WHERE email = 'client@ceva.co.za';
```

**Expected Result:**
- Auth user exists with email `client@ceva.co.za`
- Profile exists with role `client`

---

### Step 3: Test Login

**Credentials:**
```
Email: client@ceva.co.za
Password: CevaCitrus2026!
```

**Access URLs:**
- Client Dashboard: `http://localhost:3000/client/dashboard`
- Login Page: `http://localhost:3000/login`

---

## 🎯 Client Portal Features

### What the Client Can See:

✅ **View All Active Citrus Loads**
- Loads with status: `assigned` or `in_transit`
- Filtered to 2026 citrus season (March - October)

✅ **Visual Milestone Timeline**
- 6-milestone tracking for each load
- Color-coded indicators (Yellow → Green → Blue)
- Progress percentage

✅ **Load Details**
- Load number & manifest number
- Client name
- Route (origin → destination)
- Transporter & driver info
- Assigned controller

✅ **Auto-Refresh**
- Updates every 30 seconds automatically
- Last updated timestamp displayed

✅ **Full-Screen Mode**
- Click "Full Screen" button
- Perfect for displaying on client premises screen
- Clean, distraction-free interface

### What the Client CANNOT Do:

❌ Create or edit loads
❌ Assign vehicles
❌ Change load status
❌ Access admin functions
❌ View system settings

**Read-Only Access** - Client can only view tracking information.

---

## 🧪 Testing the Client Portal

### Test Scenario 1: View Empty Dashboard

1. Login as `client@ceva.co.za`
2. Navigate to `/client/dashboard`
3. **Expected:** Message "No active citrus loads found"

### Test Scenario 2: Create Test Load

1. Login as admin/dispatcher account
2. Create a citrus load:
   - Material: Citrus
   - Status: assigned or in_transit
   - Pickup date: between March 1 - October 31, 2026
3. Logout and login as `client@ceva.co.za`
4. **Expected:** Load appears on dashboard

### Test Scenario 3: Milestone Tracking

1. As admin, add milestone dates to the test load:
   ```sql
   UPDATE ceva_loads
   SET
     date_loaded = '2026-03-26 08:00:00',
     date_arrived_border_sa = '2026-03-26 14:00:00'
   WHERE load_number = 'L-XXXX';
   ```
2. As client, view dashboard
3. **Expected:** Timeline shows 2 green milestones, 4 yellow pending

### Test Scenario 4: Full-Screen Mode

1. As client, click "Full Screen" button
2. **Expected:**
   - Browser enters full-screen
   - Clean dashboard view
   - No distracting UI elements
   - Perfect for premises display

### Test Scenario 5: Auto-Refresh

1. As client, note the "Last Updated" time
2. Wait 30 seconds
3. **Expected:** Time updates automatically

---

## 🔐 Security & Access Control

### RLS Policies

The migration creates these policies for client role:

```sql
-- Clients can view loads (read-only)
CREATE POLICY "Clients can view loads"
  ON public.ceva_loads FOR SELECT
  USING (ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

-- Clients can view transporters (read-only)
CREATE POLICY "Clients can view transporters"
  ON public.ceva_transporters FOR SELECT
  USING (ceva_get_user_role() IN ('dispatcher', 'admin', 'client'));

-- Similar for drivers and horses
```

**Result:** Client role has SELECT (read-only) access to:
- ✅ Loads
- ✅ Transporters
- ✅ Drivers
- ✅ Horses
- ❌ Cannot INSERT, UPDATE, or DELETE

---

## 📱 Client Portal vs Admin Dashboard

| Feature | Client Portal (`/client/dashboard`) | Admin Dashboard (`/admin/citrus-dashboard`) |
|---------|-----------------------------------|------------------------------------------|
| **URL** | `/client/dashboard` | `/admin/citrus-dashboard` |
| **Layout** | Clean, no sidebar | Full admin layout |
| **Access** | Client role only | Admin, Dispatcher, Client |
| **Permissions** | Read-only | Full CRUD |
| **Auto-Refresh** | Always on | Optional |
| **Full-Screen** | Yes | Yes |
| **Purpose** | Client premises display | Internal operations |

---

## 🎨 Customization for Client Premises

### Recommended Display Setup:

1. **Hardware:**
   - Large screen TV or monitor
   - Dedicated computer/tablet
   - Stable internet connection

2. **Browser Setup:**
   - Chrome or Edge (full-screen mode works best)
   - Set to auto-login (save credentials)
   - Disable sleep/screensaver
   - Set homepage to `/client/dashboard`

3. **Display Settings:**
   - Login as `client@ceva.co.za`
   - Navigate to `/client/dashboard`
   - Click "Full Screen" button
   - Leave running 24/7

4. **Auto-Refresh:**
   - Built-in 30-second refresh
   - No manual intervention needed
   - Shows real-time updates

---

## 🔄 Creating Additional Client Users

To create more client users (e.g., different clients), modify the SQL:

```sql
-- Create additional client user
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
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'client2@example.com', -- Change email
  crypt('SecurePassword123!', gen_salt('bf')), -- Change password
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Client Name","role":"client"}',
  'authenticated',
  'authenticated'
);

-- Create profile
INSERT INTO public.ceva_profiles (id, email, full_name, role)
SELECT id, 'client2@example.com', 'Client Name', 'client'::public.ceva_user_role
FROM auth.users
WHERE email = 'client2@example.com';
```

---

## 🐛 Troubleshooting

### Issue: "Not authorized" error

**Solution:**
```sql
-- Verify client role exists
SELECT * FROM ceva_profiles WHERE email = 'client@ceva.co.za';

-- Should show: role = 'client'

-- If not, update:
UPDATE ceva_profiles
SET role = 'client'::public.ceva_user_role
WHERE email = 'client@ceva.co.za';
```

### Issue: No loads showing

**Possible causes:**
1. No loads with status `assigned` or `in_transit`
2. Load dates outside 2026 season range
3. RLS policies not applied

**Solution:**
```sql
-- Check for active loads
SELECT load_number, status, pickup_date
FROM ceva_loads
WHERE status IN ('assigned', 'in_transit')
  AND pickup_date >= '2026-03-01'
  AND pickup_date <= '2026-10-31';

-- If none exist, create test load or update existing:
UPDATE ceva_loads
SET
  status = 'in_transit',
  pickup_date = '2026-03-26'
WHERE id = 'some-load-id';
```

### Issue: Can't login

**Solution:**
```sql
-- Reset password
UPDATE auth.users
SET encrypted_password = crypt('CevaCitrus2026!', gen_salt('bf'))
WHERE email = 'client@ceva.co.za';
```

---

## ✅ Checklist

Before going live with client portal:

- [ ] Run migration to create client user
- [ ] Verify user can login
- [ ] Test dashboard shows loads correctly
- [ ] Test milestone timeline displays properly
- [ ] Test full-screen mode works
- [ ] Verify auto-refresh works (30s interval)
- [ ] Confirm client has read-only access (cannot edit)
- [ ] Test on actual display hardware
- [ ] Train client on how to use
- [ ] Provide client with credentials
- [ ] Set up auto-login on display device

---

## 📞 Support

**Default Client Account:**
```
Email: client@ceva.co.za
Password: CevaCitrus2026!
URL: /client/dashboard
```

**For Issues:**
- Check RLS policies are applied
- Verify user role is 'client'
- Check loads exist with correct status/dates
- Review browser console for errors

---

**Created:** 26 March 2026
**SOW Reference:** Section 3.1.3 - Client Dashboard
**Purpose:** Client premises continuous visibility
