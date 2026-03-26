# Quick Test Guide - Ceva TMS

## 🚀 Quick Start Testing

### Step 1: Start the Application
```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## Step 2: Database Setup (One-Time)

### Option A: Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/easbbrhgrdagpmjgzdyg
2. Click "SQL Editor" in left menu
3. Run these migrations in order:

**Migration 1:** `20260324000000_ceva_complete_schema.sql`
- Copy entire content and run

**Migration 2:** `20260324235900_add_client_enum_value.sql`
- Copy and run

**Migration 3:** `20260325000000_add_client_role.sql`
- Copy and run

**Migration 4:** `20260325095900_add_driver_enum_value.sql`
- Copy and run

**Migration 5:** `20260325100000_add_driver_role.sql`
- Copy and run

### Verify Migrations
Run this in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'ceva_%'
ORDER BY table_name;
```

Expected: Should show 15+ ceva_* tables

---

## Step 3: Create Test Users

### In Supabase Dashboard → Authentication → Add User

**Admin User:**
- Email: `admin@test.com`
- Password: `Admin123!`
- Confirm password: `Admin123!`
- Click "Additional Metadata" and paste:
```json
{"role": "admin", "full_name": "Test Admin", "phone": "+27123456789"}
```

**Dispatcher User:**
- Email: `dispatch@test.com`
- Password: `Dispatch123!`
- Metadata:
```json
{"role": "dispatcher", "full_name": "Test Dispatcher", "phone": "+27123456790"}
```

---

## Step 4: Test Login

1. Go to: `http://localhost:3000/login`
2. Login with: `admin@test.com` / `Admin123!`
3. Should redirect to: `http://localhost:3000/admin`

✅ If you see the admin dashboard, authentication is working!

---

## Step 5: Add Mock CTrack Data

### Why?
The app uses CTrack for GPS tracking. Since you don't have CTrack credentials, we'll add mock GPS data.

### In Supabase SQL Editor, run:

```sql
-- Insert mock transporter
INSERT INTO ceva_transporters (id, company_name, rib_code, status, contact_person, contact_phone)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'MACHETE Transport',
  '25616711',
  'approved',
  'Transport Manager',
  '+27123456800'
) ON CONFLICT (id) DO NOTHING;

-- Insert mock horse (truck)
INSERT INTO ceva_horses (id, transporter_id, registration_number, make, model, year, status, tracking_unit_id)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'JY55ZSGP',
  'Mercedes-Benz',
  'Actros',
  2020,
  'available',
  '12345'
) ON CONFLICT (id) DO NOTHING;

-- Insert mock trailers
INSERT INTO ceva_trailers (id, transporter_id, registration_number, trailer_type, status)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'MN16BZGP', 'side_tipper', 'available'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'MN16BYGP', 'side_tipper', 'available')
ON CONFLICT (id) DO NOTHING;

-- Insert mock driver
INSERT INTO ceva_drivers (id, transporter_id, first_name, last_name, passport_number, contact_phone, status)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Givemore',
  'Muzanenhamo',
  'AE001378',
  '+27123456801',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Insert mock GPS position
INSERT INTO ceva_vehicle_tracking_positions (
  horse_id,
  ctrack_node_id,
  latitude,
  longitude,
  speed,
  heading,
  ignition,
  address,
  recorded_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  12345,
  -25.7479,  -- Polokwane coordinates
  28.2293,
  65.5,
  'NE',
  true,
  'N1 Highway, Polokwane, Limpopo',
  NOW()
);

-- Verify data inserted
SELECT
  t.company_name,
  h.registration_number as horse,
  tr1.registration_number as trailer1,
  tr2.registration_number as trailer2,
  d.first_name || ' ' || d.last_name as driver,
  vp.address as last_location
FROM ceva_transporters t
LEFT JOIN ceva_horses h ON h.transporter_id = t.id
LEFT JOIN ceva_trailers tr1 ON tr1.id = 'c0000000-0000-0000-0000-000000000001'
LEFT JOIN ceva_trailers tr2 ON tr2.id = 'c0000000-0000-0000-0000-000000000002'
LEFT JOIN ceva_drivers d ON d.transporter_id = t.id
LEFT JOIN LATERAL (
  SELECT address FROM ceva_vehicle_tracking_positions
  WHERE horse_id = h.id
  ORDER BY recorded_at DESC LIMIT 1
) vp ON true
WHERE t.id = 'a0000000-0000-0000-0000-000000000001';
```

---

## Step 6: Create Test Load

### In Admin Dashboard:

1. **Navigate to:** Loads (in sidebar)
2. **Click:** "New Load" or "Add Load" button
3. **Fill in form:**
   - Client: `Nottingham Estate`
   - Origin: `Nottingham Estate, Zimbabwe`
   - Destination: `Khold, Bayhead, Durban`
   - Border: `Beitbridge`
   - Material: `Citrus - Oranges`
   - Commodity: `Citrus`
   - Weight: `34`
   - Manifest Number: `I325600001NT`
   - Pickup Date: (Select today)
   - Delivery Date: (Select 5 days from now)
   - Transporter: Select `MACHETE Transport`
   - Horse: Select `JY55ZSGP`
   - Trailer 1: Select `MN16BZGP`
   - Trailer 2: Select `MN16BYGP`
   - Driver: Select `Givemore Muzanenhamo`
   - Status: `Assigned`

4. **Click:** Save/Submit

✅ Load should be created with auto-generated load number (e.g., L-1000)

---

## Step 7: Test Features

### 7.1 Vehicle Tracking
1. **Navigate to:** Vehicle Tracking (in sidebar)
2. **Expected:** Should see truck `JY55ZSGP`
3. **Location:** Should show "N1 Highway, Polokwane, Limpopo"
4. **Speed:** Should show ~65 km/h
5. **Status:** Should show "Moving" (green indicator)

### 7.2 Dispatch Planning
1. **Navigate to:** Dispatch Planning
2. **Expected:** Should see the load you created
3. **Try:** Drag and drop load to different day
4. **Try:** Click load to see details

### 7.3 Analytics Reports
1. **Navigate to:** Analytics / Reports
2. **Expected:** Should see dashboard with:
   - Total Loads count
   - Active Loads count
   - Fleet Utilization percentage
   - Charts and graphs

### 7.4 Completed Orders
1. **Navigate to:** Completed Orders
2. **Try:** Update the load status to "Delivered"
3. **Expected:** Load should move to completed orders

---

## Step 8: Test CTrack Mock API (Optional)

Since CTrack credentials are not configured, the app will fail when trying to fetch real GPS data. Let's create a mock API endpoint:

### Create file: `app/api/ctrack/mock/route.ts`

This file provides mock data when CTrack is not available. The app should gracefully handle CTrack being unavailable and use database GPS positions instead.

**Test:**
1. Navigate to Vehicle Tracking
2. If CTrack fails, it should show vehicles from database (the mock GPS we inserted)
3. Check browser console for any CTrack errors

---

## Step 9: Check Report Generation

### Daily Tracking Report Location

Reports are **NOT automatically generated** to files. Instead:

1. **Navigate to:** Analytics → Reports tab
2. **Click:** "Export" or "Download" button (if available)
3. **Expected:** Downloads as Excel or PDF

**Current Implementation:**
- Reports are **displayed on screen** in the Analytics component
- There's a Download button (icon visible) but the actual export function may not be implemented

### To Add Report Export:

The report data is already calculated in `components/analytics-reports.tsx`. You need to add export functionality.

**Files to check:**
- `components/analytics-reports.tsx` - Main analytics component
- Look for the Download button around line 534

---

## Step 10: Test Daily Tracking Report View

### In SQL Editor, run this to see Daily Tracking Report data:

```sql
SELECT
  ROW_NUMBER() OVER (ORDER BY l.date_loaded, l.load_number) as seq,
  t.company_name as transporter,
  d.first_name || ' ' || d.last_name as driver_name,
  h.registration_number as horse,
  tr1.registration_number as trailer1,
  tr2.registration_number as trailer2,
  d.passport_number,
  t.rib_code,
  l.manifest_number,
  l.weight as tonnage,
  l.border,
  l.date_arrived_pickup as date_arrived_estate,
  l.date_loaded,
  l.date_arrived_border_zim,
  l.date_arrived_border_sa,
  l.status,
  l.comments,
  l.date_arrived_cold_stores,
  l.date_offloaded
FROM ceva_loads l
LEFT JOIN ceva_transporters t ON l.supplier_id = t.id
LEFT JOIN ceva_horses h ON l.horse_id = h.id
LEFT JOIN ceva_trailers tr1 ON l.trailer_id = tr1.id
LEFT JOIN ceva_trailers tr2 ON l.trailer2_id = tr2.id
LEFT JOIN ceva_drivers d ON l.driver_id = d.id
WHERE l.date_loaded IS NOT NULL
ORDER BY l.date_loaded DESC, l.load_number;
```

This shows data in the same format as the PDF Daily Tracking Report you provided.

---

## Common Issues & Solutions

### Issue 1: "Cannot read property 'role' of null"
**Fix:** User profile wasn't created. Run:
```sql
SELECT * FROM ceva_profiles WHERE email = 'admin@test.com';
-- If empty, manually insert:
INSERT INTO ceva_profiles (id, email, full_name, phone, role)
SELECT id, email,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'phone',
  (raw_user_meta_data->>'role')::ceva_user_role
FROM auth.users
WHERE email = 'admin@test.com';
```

### Issue 2: "Table 'ceva_loads' does not exist"
**Fix:** Migrations didn't run. Go back to Step 2.

### Issue 3: CTrack errors in console
**Fix:** This is expected. The app tries to connect to CTrack but fails because credentials are empty. The app should fallback to showing database GPS positions.

### Issue 4: Vehicle map doesn't show location
**Fix:** Google Maps API key may be invalid or restricted. Check:
- `.env.local` has `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Key is enabled for Maps JavaScript API in Google Cloud Console

### Issue 5: No loads showing in Vehicle Tracking
**Fix:** Link horse to load:
```sql
UPDATE ceva_loads
SET horse_id = 'b0000000-0000-0000-0000-000000000001'
WHERE load_number = 'L-1000';
```

---

## 📊 Where Are Reports Generated?

### Current State:
1. **Analytics Dashboard** - `components/analytics-reports.tsx`
   - Displays reports on screen
   - Has Download button (line ~534) but export may not be fully implemented

2. **No Auto File Generation**
   - Reports are NOT automatically saved to filesystem
   - They are rendered in React components

3. **Database Query for Report Data**
   - Use the SQL query from Step 10 above
   - This gives you Daily Tracking Report data
   - You can export this from Supabase as CSV

### To Export Reports:

**Option A: From Supabase Dashboard**
1. Run the Daily Tracking Report SQL query (from Step 10)
2. Click "Download CSV" button in SQL Editor
3. Opens in Excel

**Option B: Implement Export in App**
You need to add export functionality to `analytics-reports.tsx`:
- Install library: `npm install xlsx` (for Excel export)
- Or use `jspdf` for PDF export
- Add export function to the Download button

---

## ✅ Testing Checklist

- [ ] App runs on localhost:3000
- [ ] Migrations ran successfully
- [ ] Admin user created and can login
- [ ] Admin dashboard loads
- [ ] Mock transporter/horse/driver/trailer data inserted
- [ ] Mock GPS position inserted
- [ ] Test load created successfully
- [ ] Vehicle tracking shows mock vehicle
- [ ] Load appears in dispatch planning
- [ ] Analytics dashboard loads and shows stats
- [ ] Can view Daily Tracking Report data via SQL
- [ ] CTrack errors handled gracefully (or mock data works)

---

## Next Steps

1. **Add more test data:** Create more loads, transporters, drivers
2. **Test all load statuses:** Pending, Assigned, In Transit, Delivered
3. **Test milestone updates:** Update dates on loads
4. **Test user permissions:** Create dispatcher user and test limited access
5. **Implement report export:** Add Excel/PDF export to analytics
6. **Add real CTrack integration:** Get credentials and test real GPS data

---

**Testing Date:** _______________
**Tester:** _______________
**Status:** □ PASS □ FAIL
**Notes:**
