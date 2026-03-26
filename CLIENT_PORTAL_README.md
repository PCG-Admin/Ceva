# 🎯 CEVA Client Portal - Quick Start

## What Is This?

A dedicated read-only dashboard for CEVA Logistics clients to view their active citrus loads in real-time. Perfect for displaying on a screen at client premises.

---

## 🚀 Quick Start (3 Steps)

### 1. Run the Setup

**Option A - Automatic:**
```bash
# Run setup script
bash setup-client-portal.sh
```

**Option B - Manual:**
```bash
# Push migrations
supabase db push

# Or copy SQL from this file and run in Supabase SQL Editor:
# supabase/migrations/20260326110000_create_client_user.sql
```

### 2. Login as Client

**Credentials:**
```
Email: client@ceva.co.za
Password: CevaCitrus2026!
```

**URL:**
```
http://localhost:3000/client/dashboard
```

### 3. Create Test Load (as Admin)

1. Login as admin/dispatcher
2. Go to `/admin/loads`
3. Create citrus load with:
   - Material: **Citrus**
   - Status: **in_transit** or **assigned**
   - Pickup date: **2026-03-01 to 2026-10-31**

4. Logout, login as client
5. See the load on dashboard!

---

## 📺 For Client Premises Display

### Setup Steps:

1. **Login** as `client@ceva.co.za`
2. **Navigate** to `/client/dashboard`
3. **Click** "Full Screen" button
4. **Display** on premises screen

### Features:

- ✅ Auto-refreshes every 30 seconds
- ✅ Shows all active citrus loads
- ✅ Visual milestone timeline (6 milestones)
- ✅ Color-coded progress (Yellow → Green → Blue)
- ✅ Clean, distraction-free interface
- ✅ Read-only (client cannot edit anything)

---

## 🎨 What Client Sees

```
╔════════════════════════════════════════════════════════════╗
║  CEVA Logistics - Citrus Transport Tracking 2026 Season   ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📊 Stats:                                                 ║
║    Active Loads: 5    In Transit: 3    Assigned: 2        ║
║                                                            ║
║  📦 Load L-1234                     🟢 IN TRANSIT          ║
║  ─────────────────────────────────────────────────────────  ║
║  Client: ABC Citrus Farms                                  ║
║  Route: Nottingham → K-Hold, Bayhead, Durban              ║
║  Transporter: Playfair Transport                           ║
║  Driver: John Doe                                          ║
║  Controller: Mahesh                                        ║
║                                                            ║
║  Milestones:                                               ║
║  🟢 Loaded at Farm        ✅ 26 Mar 08:00                  ║
║  🟢 Bitebridge Border     ✅ 26 Mar 14:00                  ║
║  🟢 Johannesburg          ✅ 26 Mar 23:00                  ║
║  🟡 Harrismith            ⏳ Pending                        ║
║  🟡 Durban Arrival        ⏳ Pending                        ║
║  🟡 Delivered —Bayhead    ⏳ Pending                        ║
║                                                            ║
║  Progress: ████████████░░░░░░░░░░ 50%                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📋 SOW Compliance

**SOW Section 3.1.3 Requirements:**

✅ "View all active loads for the current season at a glance"
✅ "See the current milestone status of each individual load on a visual timeline"
✅ "Display the dashboard on a screen at the client's premises for continuous visibility"

**All requirements met!**

---

## 🔐 Security

**Client Role Permissions:**
- ✅ Can view loads (read-only)
- ✅ Can view milestones (read-only)
- ✅ Can view transporter/driver info (read-only)
- ❌ Cannot create/edit/delete loads
- ❌ Cannot assign vehicles
- ❌ Cannot change statuses
- ❌ Cannot access admin functions

**Row-Level Security (RLS) enforced at database level.**

---

## 📁 Files Created

1. **Database Migration:**
   - `supabase/migrations/20260326110000_create_client_user.sql`
   - Creates client user + RLS policies

2. **Client Portal Pages:**
   - `app/client/layout.tsx` - Clean layout (no sidebar)
   - `app/client/dashboard/page.tsx` - Dashboard page

3. **Dashboard Component:**
   - `components/citrus-dashboard-client.tsx` - Main dashboard (updated)

4. **Documentation:**
   - `CLIENT_USER_SETUP.md` - Detailed setup guide
   - `CLIENT_PORTAL_README.md` - This file
   - `setup-client-portal.sh` - Automated setup script

---

## 🧪 Testing

**Test Client Portal:**
```bash
# 1. Run setup
bash setup-client-portal.sh

# 2. Open browser
http://localhost:3000/login

# 3. Login as client
Email: client@ceva.co.za
Password: CevaCitrus2026!

# 4. Should redirect to:
http://localhost:3000/client/dashboard
```

**Create Test Data (as admin):**
```sql
-- Update existing load for testing
UPDATE ceva_loads
SET
  material = 'citrus',
  commodity = 'Citrus',
  status = 'in_transit',
  pickup_date = '2026-03-26',
  date_loaded = '2026-03-26 08:00:00',
  date_arrived_border_sa = '2026-03-26 14:00:00'
WHERE id = (SELECT id FROM ceva_loads LIMIT 1);
```

Then view as client - should see the load with 2 green milestones!

---

## 🎯 Demo Script for Client

**Opening:**
> "Welcome! This is your dedicated citrus tracking dashboard. Let me show you how it works."

**Walkthrough:**
1. "Here you see all your active loads for the 2026 citrus season"
2. "Each load shows the route, transporter, driver, and controller"
3. "This visual timeline shows progress through 6 checkpoints"
4. "Green means completed, yellow means pending, blue is delivered"
5. "The dashboard refreshes automatically every 30 seconds"
6. "Click this button for full-screen mode - perfect for your wall display"

**Handoff:**
> "We've set this up with auto-login on your display screen. Just turn it on and it will show live tracking 24/7."

---

## 🆘 Common Issues

**Issue:** Can't login
```bash
# Reset password
supabase db push  # Re-run migrations
```

**Issue:** No loads showing
```sql
-- Check for active loads
SELECT load_number, status, pickup_date, material
FROM ceva_loads
WHERE status IN ('assigned', 'in_transit')
  AND pickup_date >= '2026-03-01';
```

**Issue:** "Not authorized"
```sql
-- Verify client role
SELECT email, role FROM ceva_profiles WHERE email = 'client@ceva.co.za';
-- Should show: client
```

---

## 📞 Quick Reference

| What | Value |
|------|-------|
| Email | `client@ceva.co.za` |
| Password | `CevaCitrus2026!` |
| URL | `/client/dashboard` |
| Role | `client` (read-only) |
| Refresh | 30 seconds (automatic) |
| Season Filter | Mar 1 - Oct 31, 2026 |
| Status Filter | assigned, in_transit |

---

**Ready to go!** 🚀

For detailed setup instructions, see: **CLIENT_USER_SETUP.md**
