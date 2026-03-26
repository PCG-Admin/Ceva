# 🚀 START TESTING NOW - Quick Guide

## What's Ready
✅ Migrations fixed and ready to run
✅ Mock CTrack data implemented
✅ App should work without real CTrack credentials

---

## Step 1: Run the App (2 minutes)

```bash
npm install  # If first time
npm run dev
```

Visit: http://localhost:3000

---

## Step 2: Run Migrations (5 minutes)

**Go to:** https://supabase.com/dashboard/project/easbbrhgrdagpmjgzdyg

**Click:** SQL Editor (left sidebar)

**Copy-paste and run these 5 files in order:**

1. `supabase/migrations/20260324000000_ceva_complete_schema.sql`
2. `supabase/migrations/20260324235900_add_client_enum_value.sql`
3. `supabase/migrations/20260325000000_add_client_role.sql`
4. `supabase/migrations/20260325095900_add_driver_enum_value.sql`
5. `supabase/migrations/20260325100000_add_driver_role.sql`

**After each file:** Click "Run" button

---

## Step 3: Create Admin User (2 minutes)

**In Supabase Dashboard:**
1. Click "Authentication" in left sidebar
2. Click "Add User" button
3. Fill in:
   - Email: `admin@test.com`
   - Password: `Admin123!`
   - Click "Additional Metadata" section
   - Paste this:
     ```json
     {"role": "admin", "full_name": "Test Admin", "phone": "+27123456789"}
     ```
4. Click "Create User"

---

## Step 4: Test Login (1 minute)

1. Go to: http://localhost:3000/login
2. Enter:
   - Email: `admin@test.com`
   - Password: `Admin123!`
3. Click "Sign In"

**✅ Success if:** You see the admin dashboard

---

## Step 5: Add Test Data (5 minutes)

**In Supabase Dashboard → SQL Editor, run this:**

```sql
-- Insert test transporter
INSERT INTO ceva_transporters (id, company_name, rib_code, status, contact_person, contact_phone)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'MACHETE Transport',
  '25616711',
  'approved',
  'Transport Manager',
  '+27123456800'
);

-- Insert truck
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
);

-- Insert trailers
INSERT INTO ceva_trailers (id, transporter_id, registration_number, trailer_type, status)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'MN16BZGP', 'side_tipper', 'available'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'MN16BYGP', 'side_tipper', 'available');

-- Insert driver
INSERT INTO ceva_drivers (id, transporter_id, first_name, last_name, passport_number, contact_phone, status)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Givemore',
  'Muzanenhamo',
  'AE001378',
  '+27123456801',
  'active'
);

-- Insert GPS position
INSERT INTO ceva_vehicle_tracking_positions (
  horse_id, ctrack_node_id, latitude, longitude, speed, heading, ignition, address, recorded_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  12345, -25.7479, 28.2293, 65.5, 'NE', true,
  'N1 Highway, Polokwane, Limpopo', NOW()
);
```

---

## Step 6: Test Features (10 minutes)

### Test 1: Create a Load
1. In admin dashboard, click "Loads" in sidebar
2. Click "New Load" or "+ Add Load"
3. Fill in:
   - Client: `Nottingham Estate`
   - Origin: `Nottingham Estate, Zimbabwe`
   - Destination: `Khold, Bayhead, Durban`
   - Material: `Citrus`
   - Weight: `34`
   - Manifest: `I325600001NT`
   - Select dates (pickup and delivery)
   - Transporter: `MACHETE Transport`
   - Horse: `JY55ZSGP`
   - Trailer 1: `MN16BZGP`
   - Driver: `Givemore Muzanenhamo`
   - Status: `Assigned`
4. Save

**✅ Success:** Load created with number like "L-1000"

### Test 2: Vehicle Tracking
1. Click "Vehicle Tracking" in sidebar
2. **✅ Should see:** Truck JY55ZSGP with location in Polokwane

**Note:** If you see console errors about CTrack, that's OK! The app now uses mock data automatically.

### Test 3: Analytics
1. Click "Analytics" or "Reports"
2. **✅ Should see:** Dashboard with load statistics

---

## Where Are Reports?

### Currently:
Reports are shown **on screen** in the Analytics dashboard, not saved to files.

### Daily Tracking Report (like your PDF):
Run this in SQL Editor to get the data:

```sql
SELECT
  ROW_NUMBER() OVER (ORDER BY l.created_at) as seq,
  t.company_name as transporter,
  d.first_name || ' ' || d.last_name as driver,
  h.registration_number as horse,
  tr1.registration_number as trailer1,
  tr2.registration_number as trailer2,
  d.passport_number,
  t.rib_code,
  l.manifest_number,
  l.weight,
  l.border,
  l.date_loaded,
  l.date_arrived_border_zim,
  l.date_arrived_border_sa,
  l.status,
  l.comments
FROM ceva_loads l
LEFT JOIN ceva_transporters t ON l.supplier_id = t.id
LEFT JOIN ceva_horses h ON l.horse_id = h.id
LEFT JOIN ceva_trailers tr1 ON l.trailer_id = tr1.id
LEFT JOIN ceva_trailers tr2 ON l.trailer2_id = tr2.id
LEFT JOIN ceva_drivers d ON l.driver_id = d.id
ORDER BY l.created_at DESC;
```

Then click "Download CSV" in Supabase to export.

---

## CTrack Mock Data

**What's implemented:**
- Mock GPS positions for 4 vehicles
- Mock trip data
- Automatic fallback when CTrack is not configured

**Location:** `lib/ctrack/mock-service.ts`

**How it works:**
- App checks if CTrack credentials are in .env.local
- If empty, uses mock data automatically
- No errors, everything works!

---

## Common Issues

**Issue:** Can't login
**Fix:** Check user was created in Supabase → Authentication

**Issue:** Dashboard is blank
**Fix:** Run migrations again, check browser console for errors

**Issue:** No transporter/drivers show in dropdowns
**Fix:** Run Step 5 SQL again

**Issue:** CTrack errors in console
**Fix:** This is normal! Mock data is being used. Ignore these errors.

---

## What to Test Next

1. ✅ Create multiple loads
2. ✅ Update load statuses
3. ✅ View vehicle tracking map
4. ✅ Check analytics dashboard
5. ✅ Test dispatch planning (drag loads)
6. ✅ Create dispatcher user (repeat Step 3 with role "dispatcher")
7. ✅ Test RLS permissions (dispatcher vs admin)

---

## Files Reference

- **Testing Steps:** `TESTING_STEPS.md` - Detailed step-by-step
- **Testing Guide:** `TESTING_GUIDE.md` - Comprehensive guide
- **Quick Test:** `QUICK_TEST.md` - Full testing procedures
- **This File:** `TEST_NOW.md` - Start here!

---

## Summary

✅ **Migrations:** Fixed and ready
✅ **CTrack:** Mock data works without credentials
✅ **Reports:** Shown in Analytics, can export via SQL
✅ **Testing:** Follow steps above

**Total Time:** ~25 minutes to get fully running!

**Questions?** Check the detailed guides in the markdown files above.
