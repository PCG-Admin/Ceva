# Ceva TMS - Quick Testing Steps

## Phase 1: Database Setup (Via Supabase Dashboard)

### 1. Go to Supabase Dashboard
- URL: https://supabase.com/dashboard/project/easbbrhgrdagpmjgzdyg
- Navigate to: SQL Editor

### 2. Run Migrations in Order
Copy and paste each SQL file content into the SQL Editor and run:

**Migration Order:**
1. `20260324000000_ceva_complete_schema.sql` - Main schema
2. `20260324235900_add_client_enum_value.sql` - Add 'client' role
3. `20260325000000_add_client_role.sql` - Client portal
4. `20260325095900_add_driver_enum_value.sql` - Add 'driver' role
5. `20260325100000_add_driver_role.sql` - Driver portal

### 3. Verify Tables Created
Run this query:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'ceva_%'
ORDER BY table_name;
```

Expected: Should see 15+ tables

---

## Phase 2: Create Test Users

### Admin User
**Location:** Supabase Dashboard → Authentication → Add User

**Email:** `admin@cevatest.com`
**Password:** `Admin123!@#`
**User Metadata (click "Add Additional Metadata"):**
```json
{
  "role": "admin",
  "full_name": "Admin User",
  "phone": "+27123456789"
}
```

### Dispatcher User
**Email:** `dispatcher@cevatest.com`
**Password:** `Dispatcher123!@#`
**User Metadata:**
```json
{
  "role": "dispatcher",
  "full_name": "John Dispatcher",
  "phone": "+27123456790"
}
```

### Client User (Test Company)
**Email:** `client@testcompany.com`
**Password:** `Client123!@#`
**User Metadata:**
```json
{
  "role": "client",
  "full_name": "Test Client",
  "company_name": "Test Transport Ltd",
  "phone": "+27123456791"
}
```

### Driver User
**Email:** `driver@cevatest.com`
**Password:** `Driver123!@#`
**User Metadata:**
```json
{
  "role": "driver",
  "full_name": "John Driver",
  "phone": "+27123456792"
}
```

---

## Phase 3: Test Logins

### Test 1: Admin Login
1. Go to: `http://localhost:3000/login`
2. Login with `admin@cevatest.com` / `Admin123!@#`
3. Expected: Redirect to `/admin` dashboard
4. Check: Can see all sections (Users, Transporters, Drivers, Loads)

✅ Result: ______

### Test 2: Dispatcher Login
1. Logout admin
2. Login with `dispatcher@cevatest.com` / `Dispatcher123!@#`
3. Expected: Access to loads, transporters, but NOT user management
4. Try to create a load

✅ Result: ______

### Test 3: Client Login
1. Go to: `http://localhost:3000/client/login`
2. Login with `client@testcompany.com` / `Client123!@#`
3. Expected: Redirect to `/client` portal
4. Check: Can see dashboard, but no loads yet

✅ Result: ______

### Test 4: Driver Login
1. Go to: `http://localhost:3000/driver/login`
2. Login with `driver@cevatest.com` / `Driver123!@#`
3. Expected: Redirect to `/driver` portal
4. Check: Can see dashboard, but no assigned loads yet

✅ Result: ______

---

## Phase 4: Create Master Data (As Admin)

### 1. Create Transporter
**Navigate:** Admin Dashboard → Transporters → Add New

**Data:**
- Company Name: `MACHETE Transport`
- RIB Code: `25616711`
- Contact Person: `Transport Manager`
- Contact Phone: `+27123456800`
- Status: `Approved`

### 2. Create Horse (Truck)
**Navigate:** Transporters → MACHETE Transport → Add Horse

**Data:**
- Registration Number: `JY55ZSGP`
- Make: `Mercedes-Benz`
- Model: `Actros`
- Year: `2020`
- Status: `Available`

### 3. Create Trailers
**Trailer 1:**
- Registration: `MN16BZGP`
- Type: `Side Tipper`
- Status: `Available`

**Trailer 2:**
- Registration: `MN16BYGP`
- Type: `Side Tipper`
- Status: `Available`

### 4. Create Driver
**Navigate:** Drivers → Add New

**Data:**
- First Name: `Givemore`
- Last Name: `Muzanenhamo`
- Passport Number: `AE001378`
- Contact Phone: `+27123456801`
- Transporter: Select `MACHETE Transport`
- Status: `Active`

✅ Result: ______

---

## Phase 5: Create & Test Load

### 1. Create Load (As Admin)
**Navigate:** Loads → Add New Load

**Data:**
- Client: `Nottingham Estate`
- Origin: `Nottingham Estate, Zimbabwe`
- Destination: `Khold, Bayhead, Durban`
- Border: `Beitbridge`
- Commodity: `Citrus`
- Material: `Citrus - Oranges`
- Weight: `34` tons
- Manifest Number: `I325600001NT`
- Pickup Date: (Today's date)
- Delivery Date: (Today + 5 days)
- Transporter: `MACHETE Transport`
- Horse: `JY55ZSGP`
- Trailer 1: `MN16BZGP`
- Trailer 2: `MN16BYGP`
- Driver: `Givemore Muzanenhamo`
- Status: `Assigned`

### 2. Assign Load to Client
After creating load, edit it:
- Client User: Select `Test Transport Ltd` (client@testcompany.com)
- Save

### 3. Test Client Can See Load
1. Logout admin
2. Login as client: `client@testcompany.com`
3. Go to Client Portal
4. Expected: Should see the load with all details

✅ Result: ______

### 4. Test Driver Can See Load
1. Logout client
2. Login as driver: `driver@cevatest.com`
3. Go to Driver Portal
4. Expected: Should see the assigned load

**PROBLEM:** Driver will NOT see load yet because the driver created via admin panel is different from the driver user who logged in.

**Solution:** We need to link them. Run this SQL:
```sql
-- Find the driver record ID
SELECT id, first_name, last_name FROM ceva_drivers WHERE first_name = 'Givemore';

-- Find the driver user auth ID
SELECT id, email FROM auth.users WHERE email = 'driver@cevatest.com';

-- Link them (replace the IDs)
UPDATE ceva_drivers
SET user_id = (SELECT id FROM auth.users WHERE email = 'driver@cevatest.com')
WHERE first_name = 'Givemore';
```

Now refresh driver portal - should see the load!

✅ Result: ______

---

## Phase 6: Test Load Updates

### Test Driver Can Update Milestones
1. Login as driver
2. Go to assigned load
3. Try to update:
   - Date Arrived at Pickup: (Today)
   - Date Loaded: (Today)
   - Status: `In Transit`
4. Save
5. Expected: Success

✅ Result: ______

### Test Client Cannot Update
1. Login as client
2. Go to their load
3. Try to update status
4. Expected: No edit button OR permission denied

✅ Result: ______

---

## Phase 7: Test RLS Policies (SQL Verification)

### Run these in Supabase SQL Editor:

**Test 1: Admin sees all loads**
```sql
-- First, set the JWT to admin user
-- (In Supabase Dashboard, you're already admin, so just run:)
SELECT COUNT(*) FROM ceva_loads;
-- Expected: Should see the count of all loads
```

**Test 2: Client sees only own loads**
```sql
-- This would need to be tested via the app, or by using:
SELECT * FROM client_load_summary;
-- When logged in as client, should only show their loads
```

**Test 3: Driver sees only assigned loads**
```sql
-- When logged in as driver:
SELECT * FROM driver_load_summary;
-- Should only show loads where driver_id matches
```

✅ Result: ______

---

## Phase 8: Test Views

### Test Client Load Summary
Run in SQL Editor (when user context is set):
```sql
SELECT
    load_number,
    manifest_number,
    origin,
    destination,
    status,
    vehicle_number,
    driver_name,
    driver_phone,
    transporter_name,
    current_location
FROM client_load_summary;
```

Expected: All fields populated, GPS location shows if available

✅ Result: ______

### Test Driver Load Summary
```sql
SELECT
    load_number,
    manifest_number,
    origin,
    destination,
    border,
    status,
    vehicle_registration,
    trailer_registration,
    trailer2_registration,
    client_company,
    transporter_name
FROM driver_load_summary;
```

Expected: All fields populated

✅ Result: ______

---

## Phase 9: Test GPS Tracking (Optional)

### Add Sample GPS Position
```sql
-- Get horse_id first
SELECT id FROM ceva_horses WHERE registration_number = 'JY55ZSGP';

-- Insert GPS position (replace <horse_id>)
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
    '<horse_id>',
    12345,
    -25.7479,
    28.2293,
    60.5,
    'NE',
    true,
    'N1 Highway, Polokwane, Limpopo',
    NOW()
);
```

### Verify in Client Portal
1. Login as client
2. View the load
3. Expected: Should see "Current Location: N1 Highway, Polokwane, Limpopo"

✅ Result: ______

---

## Summary Checklist

- [ ] All migrations ran successfully
- [ ] Admin login works
- [ ] Dispatcher login works
- [ ] Client login works (via /client/login)
- [ ] Driver login works (via /driver/login)
- [ ] Transporter/Horse/Trailer/Driver created
- [ ] Load created and assigned
- [ ] Client can see their load
- [ ] Driver can see assigned load
- [ ] Driver can update milestones
- [ ] Client cannot update load
- [ ] RLS policies working correctly
- [ ] Views show correct data
- [ ] GPS tracking works (if tested)

---

## Common Issues

**Issue:** Driver user cannot see assigned loads
**Fix:** Link the driver record to the auth user:
```sql
UPDATE ceva_drivers
SET user_id = (SELECT id FROM auth.users WHERE email = 'driver@cevatest.com')
WHERE first_name = 'Givemore';
```

**Issue:** Views return no data
**Fix:** Check if client_id is set on the load:
```sql
UPDATE ceva_loads
SET client_id = (SELECT id FROM auth.users WHERE email = 'client@testcompany.com')
WHERE load_number = 'L-1000';
```

**Issue:** Permission denied errors
**Fix:** Verify user role:
```sql
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'client@testcompany.com';
```

---

**Testing Completed:** ___/___/______
**Overall Status:** □ PASS □ FAIL
**Notes:**
