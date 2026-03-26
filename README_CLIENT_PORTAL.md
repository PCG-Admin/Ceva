# Client Portal - Complete Guide

## 🎯 What This Is

A client-facing dashboard where customers can track their citrus loads in real-time. Each client only sees their own loads - no one else's data.

**Client Portal URL**: `/client/dashboard`
**Default Password**: `CevaCitrus2026!` (same for all clients)

---

## ✅ Yes, It Works When You Create Clients in the App

You mentioned: *"i will create a client on the app not on supabase i hope this works"*

**Answer: Yes! This is exactly how it's designed to work.**

Here's the workflow:

```
1. You create client in app at /admin/clients
   ↓
   (Client record saved to ceva_clients table with email)
   ↓
2. You create auth user in Supabase Dashboard
   ↓
   (Auth user saved to auth.users table with same email)
   ↓
3. You run 2 SQL queries to link them
   ↓
   (Sets user_id and role='client')
   ↓
4. Client logs in with email + CevaCitrus2026!
   ↓
   (RLS policy filters loads to only show theirs)
   ↓
5. Client sees their tracking dashboard ✅
```

**Why it works:**
- App creates client in `ceva_clients` table ✅
- Supabase Dashboard creates user in `auth.users` table ✅
- SQL links them via `user_id` column ✅
- RLS policy uses the link to filter data ✅

---

## 📁 Files in This Package

| File | Purpose | When to Use |
|------|---------|-------------|
| **FINAL_CLIENT_SETUP.sql** | One-time setup SQL | Run once before creating first client |
| **VERIFY_CLIENT_SETUP.sql** | Check if setup is correct | Run anytime to check status |
| **CLIENT_PORTAL_QUICKSTART.md** | Step-by-step checklist | Follow this when setting up clients |
| **CLIENT_PORTAL_WORKFLOW.md** | Detailed explanation | Read for understanding how it works |
| **README_CLIENT_PORTAL.md** | This file | Overview and quick reference |

---

## 🚀 Quick Start (First Time)

### 1. One-Time Setup (5 minutes)

```bash
# In Supabase SQL Editor:
# 1. Open FINAL_CLIENT_SETUP.sql
# 2. Run entire file
# 3. Verify you see success messages
```

### 2. Verify Setup (1 minute)

```bash
# In Supabase SQL Editor:
# 1. Open VERIFY_CLIENT_SETUP.sql
# 2. Run entire file
# 3. Check all items show ✅
```

✅ **You're now ready to create client accounts!**

---

## 📋 For Each Client (5 minutes)

### Full Process

**Step 1: App** - Create client at `/admin/clients`
- Name: Client company name
- Email: Client email address ⚠️ REQUIRED
- Other info (optional)

**Step 2: Supabase Dashboard** - Authentication → Users → Add User
- Email: (same as Step 1)
- Password: `CevaCitrus2026!`
- Auto Confirm: ✅ YES

**Step 3: SQL Editor** - Link them
```sql
-- Replace EMAIL with client email (3 places)

UPDATE ceva_clients
SET user_id = (SELECT id FROM auth.users WHERE email = 'EMAIL')
WHERE email = 'EMAIL';

UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'EMAIL';
```

**Step 4: Test**
- Login as client at `/login`
- Verify they see `/client/dashboard`
- Create test load with their client name
- Verify they see it on their dashboard

---

## 🔑 Client Login Info Template

Send this to clients:

```
CEVA Logistics - Load Tracking Portal

URL: https://your-app.com/login
Email: info@yourclient.co.za
Password: CevaCitrus2026!

You can view real-time tracking of your citrus loads 24/7.
The dashboard shows all loads for your company, updated automatically.
```

---

## 🧪 Testing Checklist

After setting up a client, verify:

- [ ] Client can login with email + `CevaCitrus2026!`
- [ ] Client is redirected to `/client/dashboard`
- [ ] Client sees loads where "Client" field = their company name
- [ ] Client does NOT see loads for other clients
- [ ] Client cannot access `/admin` routes
- [ ] Timeline shows milestone progress correctly
- [ ] Full screen button works for display on premises

---

## 🔒 Security Features

✅ **Row Level Security (RLS)**
- Each client sees only their own loads
- Database-level filtering (cannot be bypassed)

✅ **Read-Only Access**
- Clients cannot create, edit, or delete loads
- Clients cannot access admin functions

✅ **Role-Based Access Control**
- Admin: Full access
- Dispatcher: Full access
- Client: View own loads only

✅ **Authentication**
- Supabase Auth with secure session handling
- Password protected access
- Auto-logout on browser close

---

## 📊 Check All Clients Status

Run this SQL anytime to see which clients are set up:

```sql
SELECT
  c.name as "Client",
  c.email as "Email",
  CASE WHEN c.user_id IS NOT NULL THEN '✅' ELSE '❌' END as "Linked",
  COALESCE(p.role, 'None') as "Role",
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

Or just run `VERIFY_CLIENT_SETUP.sql`

---

## ❓ FAQ

### Q: Why 3 steps? Can it be automated?
**A:** We tried auto-creation but hit Supabase permission limits (cannot modify `auth.users` table directly). The 3-step manual process is simple, secure, and takes ~5 minutes per client.

### Q: Can each client have a different password?
**A:** Yes! In Step 2, just enter a different password for each client. The default `CevaCitrus2026!` is just for convenience.

### Q: What if I already created clients before this setup?
**A:** No problem! Just do Steps 2 and 3 for each existing client. Their existing client record will be linked to the new auth user.

### Q: Can clients reset their password?
**A:** Yes! Supabase provides built-in password reset via email. Configure it in Supabase Dashboard → Authentication → Email Templates.

### Q: What if client name doesn't match exactly in loads?
**A:** The RLS policy checks both:
1. `ceva_loads.client` (text field) matches `ceva_clients.name`
2. `ceva_loads.client_id` (UUID) matches `ceva_clients.id`

Best practice: Always select client from dropdown when creating loads to set both fields.

### Q: Can I have multiple users for one client company?
**A:** Not currently. Each client company = one login. If needed in future, you'd need to:
1. Add a `company_id` field to `ceva_clients`
2. Update RLS policy to check `company_id` instead of `user_id`
3. Create multiple users linked to same `company_id`

---

## 🛠️ Troubleshooting

### Client sees no loads after login

**Check 1:** Does client have loads?
```sql
SELECT * FROM ceva_loads WHERE client = 'Client Name';
```

**Check 2:** Is client linked correctly?
```sql
SELECT c.name, c.email, c.user_id, p.role
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON c.user_id = p.id
WHERE c.email = 'client@email.com';
```
Should show: `user_id` = UUID, `role` = 'client'

**Check 3:** Re-run Step 3 SQL to re-link.

---

### Client login fails

**Check 1:** User exists in Supabase?
- Supabase Dashboard → Authentication → Users
- Search for client email

**Check 2:** Email matches exactly?
- Email is case-sensitive
- Check for spaces or typos

**Check 3:** Was "Auto Confirm User" checked?
- If not, user needs to confirm email first

**Fix:** Delete user and recreate with "Auto Confirm User" checked.

---

### Client sees ALL loads (not filtered)

**Check 1:** Role is 'client'?
```sql
SELECT role FROM ceva_profiles WHERE email = 'client@email.com';
```
Should return: `client`

**Check 2:** RLS policy exists?
```sql
SELECT * FROM pg_policies
WHERE tablename = 'ceva_loads'
AND policyname = 'Clients can view own loads';
```
Should return 1 row.

**Fix:** Re-run `FINAL_CLIENT_SETUP.sql`

---

### Permission denied error

**Cause:** Role not set or user_id not linked.

**Fix:** Re-run Step 3 SQL:
```sql
UPDATE ceva_clients
SET user_id = (SELECT id FROM auth.users WHERE email = 'EMAIL')
WHERE email = 'EMAIL';

UPDATE ceva_profiles
SET role = 'client'::ceva_user_role
WHERE email = 'EMAIL';
```

---

## 📱 Client Dashboard Features

What clients see:

✅ **Live Load Tracking**
- All loads for their company
- Real-time status updates
- Color-coded by status

✅ **Milestone Timeline**
- 6 checkpoints from farm to Durban
- Visual progress bar
- Date/time for each milestone

✅ **Load Details**
- Load number
- Material (Citrus)
- Pickup/delivery locations
- Driver and vehicle info
- Current status

✅ **Full Screen Mode**
- Button to go full screen
- Perfect for TV display on premises
- Auto-refresh for real-time updates

✅ **Filtering & Search**
- Filter by status
- Search by load number
- Sort by date

❌ **No Edit/Create Access**
- Read-only view
- Cannot modify data
- Cannot delete loads

---

## 📈 SOW Compliance

This implementation satisfies **SOW Section 3.1.3**:

> **3.1.3 Client Portal**
> Clients shall have access to a dashboard displaying real-time tracking of their citrus loads. The dashboard shall:
> - Display load status and milestone progress ✅
> - Show 6 citrus-specific checkpoints ✅
> - Provide read-only access ✅
> - Filter loads to show only client's own data ✅
> - Support full-screen display mode for on-site viewing ✅

---

## 📞 Support

If you encounter issues:

1. **Run verification**: `VERIFY_CLIENT_SETUP.sql`
2. **Check specific client**: Query ceva_clients and ceva_profiles
3. **Re-run setup**: `FINAL_CLIENT_SETUP.sql` is safe to run multiple times
4. **Re-link client**: Step 3 SQL is idempotent (safe to run multiple times)

---

## 🎓 How It Works (Technical)

For developers:

**Database Schema:**
```
ceva_clients
├── id (UUID)
├── name (TEXT) - Company name
├── email (TEXT) - Client email
├── user_id (UUID) → references auth.users(id)
└── ... other fields

auth.users
├── id (UUID)
├── email (TEXT)
└── ... Supabase auth fields

ceva_profiles
├── id (UUID) → references auth.users(id)
├── role (ENUM: admin, dispatcher, client)
└── ... other fields

ceva_loads
├── id (UUID)
├── client (TEXT) - Client company name
├── client_id (UUID) → references ceva_clients(id)
└── ... other fields
```

**RLS Policy Logic:**
```sql
-- If user role = 'client':
--   Show loads where client name matches OR client_id matches
-- Else (admin/dispatcher):
--   Show all loads
```

**Function Used:**
- `public.ceva_get_user_role()` - Returns current user's role from ceva_profiles

**Client Dashboard:**
- Route: `/app/client/dashboard/page.tsx`
- Layout: `/app/client/layout.tsx` (clean, no admin sidebar)
- Component: `<CitrusDashboardClient isClientView={true} />`

**Authentication:**
- Checks `auth.getUser()` on page load
- Redirects to `/login` if not authenticated
- Verifies role is 'client', 'dispatcher', or 'admin'

---

## ✅ Summary

**Your Workflow:**
1. ⚙️ One-time: Run `FINAL_CLIENT_SETUP.sql` (done)
2. 🏢 Per client: Create in app with email (you do this)
3. 👤 Per client: Create user in Supabase (2 min)
4. 🔗 Per client: Link with SQL (1 min)
5. ✅ Done! Client can login

**Client Experience:**
1. 🌐 Go to `/login`
2. 📧 Enter their email
3. 🔑 Enter `CevaCitrus2026!`
4. 📊 See their dashboard with only their loads
5. 🖥️ Click full screen for display mode

**Security:** ✅ RLS enforced, read-only, role-based

**Time:** 5 min per client setup

**Files:** See table above for reference

---

## 🚀 You're Ready!

The system is set up to work exactly as you described: create clients in the app, then give them portal access via the 3-step process.

**Next Steps:**
1. ✅ Verify setup: Run `VERIFY_CLIENT_SETUP.sql`
2. ✅ Create first test client: Follow `CLIENT_PORTAL_QUICKSTART.md`
3. ✅ Test login and filtering
4. ✅ Roll out to production clients

**Questions?** Check `CLIENT_PORTAL_WORKFLOW.md` for detailed explanations.

**Default Password:** `CevaCitrus2026!`

**Portal URL:** `/client/dashboard`

---

*Last Updated: 2026-03-26*
*SOW Reference: Section 3.1.3 - Client Portal*
