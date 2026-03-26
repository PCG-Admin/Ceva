# Client Portal Setup - Visual Guide

## 🎯 The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR WORKFLOW                           │
└─────────────────────────────────────────────────────────────────┘

Step 1: CREATE CLIENT IN APP
┌────────────────────────┐
│   /admin/clients       │
│   ┌──────────────┐     │      Creates record in database:
│   │ Add Client   │────────────► ceva_clients table
│   └──────────────┘     │        ├── name: "Sundays River"
│                        │        ├── email: "info@sr.co.za"
│  Name: [.........]     │        └── user_id: NULL (not linked yet)
│  Email: [.........]    │
│  Phone: [.........]    │
└────────────────────────┘

                ⬇️

Step 2: CREATE AUTH USER IN SUPABASE
┌────────────────────────┐
│  Supabase Dashboard    │
│  Authentication→Users  │      Creates auth account:
│  ┌──────────────┐     │        auth.users table
│  │ Add User     │────────────► ├── id: "abc-123-..."
│  └──────────────┘     │        ├── email: "info@sr.co.za"
│                        │        └── password: (hashed)
│  Email: [.........]    │
│  Password: [........]  │        AND
│  ✅ Auto Confirm       │        ceva_profiles table
└────────────────────────┘        ├── id: "abc-123-..."
                                  ├── email: "info@sr.co.za"
                                  └── role: NULL (not set yet)

                ⬇️

Step 3: LINK THEM WITH SQL
┌────────────────────────┐
│  Supabase SQL Editor   │
│                        │      Updates both records:
│  UPDATE ceva_clients   │
│  SET user_id = ...     │────► ceva_clients
│                        │      ├── user_id: "abc-123-..." ✅ LINKED
│  UPDATE ceva_profiles  │
│  SET role = 'client'   │────► ceva_profiles
│                        │      ├── role: "client" ✅ ROLE SET
└────────────────────────┘

                ⬇️

✅ CLIENT CAN NOW LOGIN!
┌────────────────────────┐
│   Client's Browser     │
│   /login               │      RLS Policy Filters:
│                        │      "Show only loads where:
│  Email: info@sr.co.za  │       client_name = 'Sundays River'
│  Password: Ceva...2026!│       OR client_id = linked_client.id"
│  ┌──────────────┐     │
│  │   Login      │     │      Client sees ONLY their loads!
│  └──────────────┘     │
└────────────────────────┘
```

---

## 🔗 How the Linking Works

```
BEFORE LINKING (Step 1 & 2 complete):

┌─────────────────────┐         ┌──────────────────────┐
│   ceva_clients      │         │    auth.users        │
├─────────────────────┤         ├──────────────────────┤
│ name: "Sundays..."  │         │ id: "abc-123..."     │
│ email: "info@sr..." │  ❌ NO  │ email: "info@sr..."  │
│ user_id: NULL       │   LINK  │ (password hash)      │
└─────────────────────┘         └──────────────────────┘
        ⬇️                               ⬇️
   (Cannot login)              (Can login but no data)


AFTER LINKING (Step 3 complete):

┌─────────────────────┐         ┌──────────────────────┐
│   ceva_clients      │         │    auth.users        │
├─────────────────────┤         ├──────────────────────┤
│ name: "Sundays..."  │         │ id: "abc-123..."     │
│ email: "info@sr..." │  ✅ ══► │ email: "info@sr..."  │
│ user_id: "abc-123..." ═══════► │ (password hash)      │
└─────────────────────┘         └──────────────────────┘
        ⬇️                               ⬇️
   (Company info)              (Can login, sees own loads)
                                       ⬇️
                              ┌──────────────────────┐
                              │  ceva_profiles       │
                              ├──────────────────────┤
                              │ id: "abc-123..."     │
                              │ email: "info@sr..."  │
                              │ role: "client"  ✅   │
                              └──────────────────────┘
```

---

## 🔒 How RLS Filtering Works

```
CLIENT LOGS IN:
info@sr.co.za / CevaCitrus2026!
        ⬇️
Supabase Auth: ✅ Valid credentials
        ⬇️
Sets session: auth.uid() = "abc-123..."
        ⬇️
User navigates to /client/dashboard
        ⬇️
Query: SELECT * FROM ceva_loads
        ⬇️
RLS Policy activates:

┌────────────────────────────────────────────────────┐
│ RLS Policy: "Clients can view own loads"          │
├────────────────────────────────────────────────────┤
│                                                    │
│ 1. Get user role: ceva_get_user_role()            │
│    → Returns: "client"                             │
│                                                    │
│ 2. If role = "client":                             │
│    Filter loads WHERE:                             │
│      ┌──────────────────────────────────┐         │
│      │ EXISTS (                          │         │
│      │   SELECT 1 FROM ceva_clients c   │         │
│      │   WHERE c.user_id = auth.uid()   │ ◄───────┼─── "abc-123..."
│      │   AND (                           │         │
│      │     c.name = load.client  OR     │ ◄───────┼─── "Sundays River"
│      │     c.id = load.client_id        │         │
│      │   )                               │         │
│      │ )                                 │         │
│      └──────────────────────────────────┘         │
│                                                    │
│ 3. Else (admin/dispatcher):                        │
│    Show all loads                                  │
│                                                    │
└────────────────────────────────────────────────────┘
        ⬇️
Result: Only loads for "Sundays River Citrus"
```

---

## 📊 Database Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE SCHEMA                           │
└─────────────────────────────────────────────────────────────────┘

        ┌──────────────────┐
        │   auth.users     │ (Managed by Supabase)
        ├──────────────────┤
        │ id        (PK)   │◄─────┐
        │ email            │      │
        │ encrypted_pwd    │      │
        └──────────────────┘      │
                ⬇️                │
        ┌──────────────────┐      │
        │  ceva_profiles   │      │
        ├──────────────────┤      │
        │ id        (PK/FK)│──────┤ References
        │ email            │      │ auth.users.id
        │ role      (ENUM) │      │
        │ └─ admin         │      │
        │ └─ dispatcher    │      │
        │ └─ client   ✅   │      │
        └──────────────────┘      │
                                  │
        ┌──────────────────┐      │
        │  ceva_clients    │      │
        ├──────────────────┤      │
        │ id        (PK)   │◄─────┼───────┐
        │ name             │      │       │
        │ email            │      │       │
        │ user_id   (FK)   │──────┘       │
        │ ...              │              │
        └──────────────────┘              │ References
                ⬇️                        │ ceva_clients.id
        ┌──────────────────┐              │
        │   ceva_loads     │              │
        ├──────────────────┤              │
        │ id        (PK)   │              │
        │ client    (TEXT) │──► "Sundays River"
        │ client_id (FK)   │──────────────┘
        │ status           │
        │ ...              │
        └──────────────────┘

FILTERING LOGIC:
Show load if EITHER:
  1. load.client = client.name  (text match)
  2. load.client_id = client.id (UUID match)
```

---

## 🎭 Three User Types Comparison

```
┌─────────────┬──────────────┬──────────────┬──────────────┐
│ Feature     │ Admin        │ Dispatcher   │ Client       │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ View Loads  │ ALL loads    │ ALL loads    │ OWN loads    │
│ Create Load │ ✅ Yes       │ ✅ Yes       │ ❌ No        │
│ Edit Load   │ ✅ Yes       │ ✅ Yes       │ ❌ No        │
│ Delete Load │ ✅ Yes       │ ❌ No        │ ❌ No        │
│ /admin      │ ✅ Access    │ ✅ Access    │ ❌ Blocked   │
│ Dashboard   │ /admin       │ /admin       │ /client      │
│ Sidebar     │ Full nav     │ Full nav     │ Clean layout │
│ Analytics   │ ✅ Yes       │ ✅ Yes       │ ❌ No        │
└─────────────┴──────────────┴──────────────┴──────────────┘

RLS POLICY BEHAVIOR:
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  IF role = 'admin' OR role = 'dispatcher':                   │
│    RETURN all_loads  ✅ No filtering                         │
│                                                              │
│  ELSE IF role = 'client':                                    │
│    RETURN loads WHERE client matches user's company  ✅       │
│                                                              │
│  ELSE:                                                       │
│    RETURN nothing  ❌ No access                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 Password & Security Flow

```
DEFAULT PASSWORD: CevaCitrus2026!

┌─────────────────────────────────────────────────────────────┐
│                  PASSWORD LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

1. YOU CREATE USER
   └─► Password: "CevaCitrus2026!"
       └─► Supabase hashes it
           └─► Stored as bcrypt hash (secure)

2. YOU TELL CLIENT
   "Your password is: CevaCitrus2026!"
   (via email, phone, etc.)

3. CLIENT LOGS IN FIRST TIME
   └─► Enters: CevaCitrus2026!
       └─► Supabase compares hash
           └─► ✅ Login successful

4. CLIENT CAN CHANGE PASSWORD (Optional)
   └─► Supabase provides password reset
       └─► Client receives email
           └─► Sets new password
               └─► You don't need to know it

5. CLIENT FORGETS PASSWORD
   └─► Uses "Forgot Password" link
       └─► Receives reset email
           └─► Sets new password


SECURITY FEATURES:
✅ Passwords never stored in plain text
✅ Bcrypt hashing (industry standard)
✅ Session tokens (not password per request)
✅ HTTPS encryption in transit
✅ RLS enforced at database level
✅ Role-based access control
```

---

## 📱 Client Dashboard Flow

```
┌─────────────────────────────────────────────────────────────┐
│              CLIENT DASHBOARD EXPERIENCE                    │
└─────────────────────────────────────────────────────────────┘

1. CLIENT OPENS BROWSER
   https://your-app.com/login
        ⬇️
   ┌──────────────────────┐
   │ ╔══════════════════╗ │
   │ ║  CEVA Logistics  ║ │
   │ ║  Login           ║ │
   │ ╚══════════════════╝ │
   │                      │
   │ Email:               │
   │ [info@sr.co.za    ]  │
   │                      │
   │ Password:            │
   │ [CevaCitrus2026!  ]  │
   │                      │
   │   [ Login ]          │
   └──────────────────────┘

        ⬇️ Auth Check

2. REDIRECT TO DASHBOARD
   https://your-app.com/client/dashboard
        ⬇️
   ┌─────────────────────────────────────────────────────┐
   │ ╔═════════════════════════════════════════════════╗ │
   │ ║  🍊 CEVA Logistics                  [Full Screen]║ │
   │ ║  Citrus Transport Tracking - 2026 Season        ║ │
   │ ╚═════════════════════════════════════════════════╝ │
   │                                                     │
   │ 🔍 Search: [............]  📊 Filter: [All Status] │
   │                                                     │
   │ ┌─────────────────────────────────────────────────┐ │
   │ │ Load #CVL-2026-001              Status: In Transit│
   │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
   │ │ 🚛 Citrus - 24 Pallets                          │ │
   │ │ 📍 Nottingham Farm → Durban Bayhead             │ │
   │ │                                                 │ │
   │ │ Timeline:                                       │ │
   │ │ ✅ Loaded      ✅ Border    ✅ JHB              │ │
   │ │ 🟡 Harrismith  ⚪ Durban    ⚪ Delivered         │ │
   │ │                                                 │ │
   │ │ Driver: John Smith | Truck: ABC-123-GP          │ │
   │ └─────────────────────────────────────────────────┘ │
   │                                                     │
   │ ┌─────────────────────────────────────────────────┐ │
   │ │ Load #CVL-2026-002              Status: Delivered│
   │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
   │ │ 🚛 Citrus - 32 Pallets                          │ │
   │ │ 📍 Kirkwood → Durban Bayhead                    │ │
   │ │                                                 │ │
   │ │ Timeline:                                       │ │
   │ │ ✅ All milestones completed                     │ │
   │ │ Delivered: 25 Mar 2026 14:30                    │ │
   │ └─────────────────────────────────────────────────┘ │
   │                                                     │
   │               [ Sign Out ]                          │
   └─────────────────────────────────────────────────────┘

3. FULL SCREEN MODE (For TV Display)
   Click "Full Screen" button
        ⬇️
   ┌───────────────────────────────────────────────────────┐
   │ 🍊 CEVA CITRUS TRACKING - LIVE                   [Exit]│
   │                                                       │
   │ ┌─────────────────────┐ ┌─────────────────────┐     │
   │ │ CVL-2026-001        │ │ CVL-2026-002        │     │
   │ │ In Transit          │ │ Delivered           │     │
   │ │ ━━━━━━━━━━━━━━━━━━│ │ ━━━━━━━━━━━━━━━━━━│     │
   │ │ 24 Pallets          │ │ 32 Pallets          │     │
   │ │ ✅✅✅🟡⚪⚪       │ │ ✅✅✅✅✅✅       │     │
   │ └─────────────────────┘ └─────────────────────┘     │
   │                                                       │
   │ Auto-refreshes every 30 seconds                      │
   └───────────────────────────────────────────────────────┘
```

---

## 🚀 Complete Setup Timeline

```
┌─────────────────────────────────────────────────────────────┐
│                 FIRST-TIME SETUP TIMELINE                   │
└─────────────────────────────────────────────────────────────┘

Day 1: Initial Setup
├─ [5 min] Read README_CLIENT_PORTAL.md
├─ [2 min] Run FINAL_CLIENT_SETUP.sql
├─ [1 min] Run VERIFY_CLIENT_SETUP.sql
└─ ✅ System ready for clients

Day 2: First Test Client
├─ [2 min] Create client in app
├─ [2 min] Create user in Supabase
├─ [1 min] Run linking SQL
├─ [3 min] Test login and filtering
└─ ✅ First client working

Day 3: Production Rollout
├─ [5 min per client] Setup remaining clients
│   ├─ App: 2 min
│   ├─ Supabase: 2 min
│   └─ SQL: 1 min
├─ Send login info to clients
└─ ✅ All clients have access

Ongoing: Maintenance
├─ New client requests access
│   └─ [5 min] Follow 3-step process
├─ Client forgets password
│   └─ [1 min] Send password reset link
└─ Monitor dashboard usage
    └─ Clients access 24/7 ✅
```

---

## ✅ Success Checklist

After following the 3-step process, verify:

**Database Checks:**
```sql
-- ✅ Client has user_id
SELECT name, email, user_id FROM ceva_clients WHERE email = 'CLIENT_EMAIL';
-- Expected: user_id should be a UUID, not NULL

-- ✅ User has client role
SELECT email, role FROM ceva_profiles WHERE email = 'CLIENT_EMAIL';
-- Expected: role should be 'client'

-- ✅ Can see test load
-- Login as client and check dashboard shows loads
```

**Browser Tests:**
- ✅ Client can login with email + password
- ✅ Redirects to `/client/dashboard`
- ✅ Sees loads for their company only
- ✅ Cannot access `/admin` routes
- ✅ Timeline shows milestone progress
- ✅ Full screen button works
- ✅ Sign out works

**Security Tests:**
- ✅ Create load for different client → Client doesn't see it
- ✅ Try to access `/admin` → Blocked or redirected
- ✅ Try to edit load → No edit buttons visible
- ✅ Check browser console → No errors

---

## 📞 Quick Reference Card

```
╔══════════════════════════════════════════════════════════╗
║            CLIENT PORTAL - QUICK REFERENCE               ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  SETUP (One-time):                                       ║
║  1. Run FINAL_CLIENT_SETUP.sql                          ║
║  2. Run VERIFY_CLIENT_SETUP.sql                         ║
║                                                          ║
║  FOR EACH CLIENT:                                        ║
║  1. App: Create client with email (2 min)              ║
║  2. Supabase: Create user + auto confirm (2 min)       ║
║  3. SQL: Link user_id + set role (1 min)               ║
║                                                          ║
║  CLIENT LOGIN:                                           ║
║  • URL: /login                                          ║
║  • Email: [their email]                                 ║
║  • Password: CevaCitrus2026!                            ║
║                                                          ║
║  FILES:                                                  ║
║  • README_CLIENT_PORTAL.md ← Start here                 ║
║  • CLIENT_PORTAL_QUICKSTART.md ← Checklist              ║
║  • CLIENT_PORTAL_WORKFLOW.md ← Details                  ║
║  • VERIFY_CLIENT_SETUP.sql ← Check status               ║
║                                                          ║
║  TROUBLESHOOTING:                                        ║
║  • Run VERIFY_CLIENT_SETUP.sql first                    ║
║  • Check email matches exactly                          ║
║  • Re-run Step 3 SQL if needed                          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

*This visual guide supplements the detailed documentation in other files.*
*For step-by-step instructions, see CLIENT_PORTAL_QUICKSTART.md*
*For troubleshooting, see README_CLIENT_PORTAL.md*
