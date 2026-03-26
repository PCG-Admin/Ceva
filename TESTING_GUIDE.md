# Ceva Logistics TMS - Complete Testing Guide

## Prerequisites
- Supabase project is set up and running
- Access to Supabase Dashboard
- Node.js and npm installed
- Application is running locally

---

## Step 1: Database Setup & Migration Testing

### 1.1 Check Current Database State
```bash
# Check if migrations have been run
npx supabase migration list
```

### 1.2 Run Migrations in Order
The correct migration order is:
1. `20260324000000_ceva_complete_schema.sql` - Main schema
2. `20260324235900_add_client_enum_value.sql` - Add 'client' to user_role enum
3. `20260325000000_add_client_role.sql` - Client portal setup
4. `20260325095900_add_driver_enum_value.sql` - Add 'driver' to user_role enum
5. `20260325100000_add_driver_role.sql` - Driver portal setup

```bash
# Apply all pending migrations
npx supabase db push

# OR if using migration commands
npx supabase migration up
```

### 1.3 Verify Schema
Go to Supabase Dashboard → SQL Editor and run:
```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'ceva_%'
ORDER BY table_name;

-- Check if all enums exist
SELECT t.typname as enum_name, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE 'ceva_%'
GROUP BY t.typname
ORDER BY t.typname;
```

**Expected Tables:**
- ceva_profiles
- ceva_clients (two versions - one for portal auth, one for customer records)
- ceva_transporters
- ceva_horses
- ceva_trailers
- ceva_drivers
- ceva_loads
- ceva_contracts
- ceva_vehicle_combinations
- ceva_vehicle_trips
- ceva_vehicle_tracking_positions
- ceva_load_geofence_events
- ceva_audit_logs
- ceva_transporter_documents
- ceva_driver_documents

**Expected Enums:**
- ceva_user_role: 'admin', 'dispatcher', 'client', 'driver'
- ceva_load_status: 'pending', 'assigned', 'in_transit', 'delivered', 'cancelled'
- ceva_vehicle_status: 'available', 'in_use', 'maintenance', 'inactive'
- ceva_driver_status: 'active', 'inactive', 'suspended'
- ceva_transporter_status: 'pending', 'approved', 'suspended'
- ceva_trailer_type: 'side_tipper', 'bottom_dumper', 'drop_side', 'flat'

✅ **Test Result:** □ Pass □ Fail

---

## Step 2: Admin User Testing

### 2.1 Create Admin User
Go to Supabase Dashboard → Authentication → Add User

**Test Admin User:**
- Email: `admin@cevatest.com`
- Password: `Admin123!@#`
- User Metadata (Important!):
```json
{
  "role": "admin",
  "full_name": "Admin User",
  "phone": "+27123456789"
}
```

### 2.2 Verify Admin Profile Creation
Go to SQL Editor:
```sql
-- Check if admin profile was auto-created
SELECT * FROM ceva_profiles WHERE email = 'admin@cevatest.com';
```

**Expected Result:**
- Profile exists with role = 'admin'
- full_name = 'Admin User'
- phone = '+27123456789'

### 2.3 Test Admin Login
1. Go to your app: `http://localhost:3000/login`
2. Login with admin credentials
3. Verify redirect to `/admin` dashboard

**Expected:**
- ✅ Login successful
- ✅ Redirect to admin dashboard
- ✅ Can see all menu options (Users, Transporters, Loads, etc.)

✅ **Test Result:** □ Pass □ Fail

---

## Step 3: Dispatcher User Testing

### 3.1 Create Dispatcher User
In Supabase Dashboard → Authentication → Add User

**Test Dispatcher:**
- Email: `dispatcher@cevatest.com`
- Password: `Dispatcher123!@#`
- User Metadata:
```json
{
  "role": "dispatcher",
  "full_name": "John Dispatcher",
  "phone": "+27123456790"
}
```

### 3.2 Verify Dispatcher Profile
```sql
SELECT * FROM ceva_profiles WHERE email = 'dispatcher@cevatest.com';
```

### 3.3 Test Dispatcher Login & Permissions
1. Logout admin
2. Login as dispatcher
3. Try to access different sections

**Expected Permissions:**
- ✅ Can view and create loads
- ✅ Can view and create transporters
- ✅ Can view and create drivers
- ❌ Cannot delete loads (admin only)
- ❌ Cannot access user management

✅ **Test Result:** □ Pass □ Fail

---

## Step 4: Client Portal Testing

### 4.1 Create Client User via Signup
1. Go to: `http://localhost:3000/signup`
2. Fill in the form:
   - Full Name: `Test Client Company`
   - Email: `client@testcompany.com`
   - Password: `Client123!@#`
   - Phone: `+27123456791`
   - Company Name: `Test Transport Ltd`
   - Role: Select "Client"

### 4.2 Verify Client Records Created
```sql
-- Check ceva_profiles
SELECT * FROM ceva_profiles WHERE email = 'client@testcompany.com';

-- Check ceva_clients (portal auth table)
SELECT * FROM ceva_clients WHERE email = 'client@testcompany.com';
```

**Expected:**
- Profile with role = 'client'
- Client record with company_name = 'Test Transport Ltd'

### 4.3 Test Client Portal Access
1. Login as client
2. Navigate to: `http://localhost:3000/client`

**Expected Features:**
- ✅ Can view own loads only
- ✅ Can create new load requests
- ✅ Can see load tracking information
- ✅ Can see milestone dates (date_loaded, date_arrived_border_zim, etc.)
- ✅ Can see vehicle location (if GPS tracking is active)
- ❌ Cannot see loads from other clients
- ❌ Cannot update load status
- ❌ Cannot delete loads

### 4.4 Test Client Load Summary View
```sql
-- Login as the client user, then run:
SELECT * FROM client_load_summary;
```

**Expected:**
- Only shows loads where client_id = current user's auth.uid()

✅ **Test Result:** □ Pass □ Fail

---

## Step 5: Driver Portal Testing

### 5.1 Create Driver User via Signup
1. Go to: `http://localhost:3000/signup`
2. Fill in the form:
   - Full Name: `John Driver`
   - Email: `driver@cevatest.com`
   - Password: `Driver123!@#`
   - Phone: `+27123456792`
   - Role: Select "Driver"

### 5.2 Verify Driver Records Created
```sql
-- Check ceva_profiles
SELECT * FROM ceva_profiles WHERE email = 'driver@cevatest.com';

-- Check ceva_drivers (should auto-link to user)
SELECT * FROM ceva_drivers WHERE contact_email = 'driver@cevatest.com';

-- Check if default transporter was created
SELECT * FROM ceva_transporters WHERE company_name = 'Self-Registered Drivers';
```

**Expected:**
- Profile with role = 'driver'
- Driver record with user_id linked to auth user
- first_name = 'John', last_name = 'Driver'
- transporter_id points to 'Self-Registered Drivers'

### 5.3 Test Driver Portal Access
1. Login as driver
2. Navigate to: `http://localhost:3000/driver`

**Expected Features:**
- ✅ Can view assigned loads only
- ✅ Can update load milestone dates
- ✅ Can update load status
- ✅ Can see vehicle and trailer information
- ✅ Can see client information
- ❌ Cannot see unassigned loads
- ❌ Cannot create new loads
- ❌ Cannot delete loads

### 5.4 Test Driver Load Summary View
```sql
-- Login as the driver user, then run:
SELECT * FROM driver_load_summary;
```

**Expected:**
- Only shows loads where driver_id matches the logged-in driver
- Initially empty (no loads assigned yet)

✅ **Test Result:** □ Pass □ Fail

---

## Step 6: Transporter & Vehicle Data Testing

### 6.1 Create Transporter (as Admin/Dispatcher)
1. Login as admin
2. Navigate to Transporters section
3. Create a new transporter:
   - Company Name: `MACHETE Transport`
   - RIB Code: `25616711`
   - Contact Person: `Transport Manager`
   - Phone: `+27123456800`
   - Status: `approved`

### 6.2 Verify Transporter in Database
```sql
SELECT * FROM ceva_transporters WHERE company_name = 'MACHETE Transport';
```

### 6.3 Create Horse (Truck)
1. In Transporters → Select MACHETE → Add Horse
   - Registration: `JY55ZSGP`
   - Make: `Mercedes-Benz`
   - Model: `Actros`
   - Status: `available`

### 6.4 Create Trailers
1. Add Trailer 1:
   - Registration: `MN16BZGP`
   - Type: `side_tipper`
   - Status: `available`

2. Add Trailer 2:
   - Registration: `MN16BYGP`
   - Type: `side_tipper`
   - Status: `available`

### 6.5 Create Driver (Linked to Transporter)
1. Navigate to Drivers section
2. Create new driver:
   - First Name: `Givemore`
   - Last Name: `Muzanenhamo`
   - Passport Number: `AE001378`
   - Phone: `+27123456801`
   - Transporter: `MACHETE Transport`
   - Status: `active`

### 6.6 Verify All Created
```sql
-- Check all related records
SELECT
    t.company_name,
    h.registration_number as horse,
    tr.registration_number as trailer,
    d.first_name || ' ' || d.last_name as driver_name
FROM ceva_transporters t
LEFT JOIN ceva_horses h ON h.transporter_id = t.id
LEFT JOIN ceva_trailers tr ON tr.transporter_id = t.id
LEFT JOIN ceva_drivers d ON d.transporter_id = t.id
WHERE t.company_name = 'MACHETE Transport';
```

✅ **Test Result:** □ Pass □ Fail

---

## Step 7: Load Creation & Assignment Testing

### 7.1 Create Load (as Admin/Dispatcher)
1. Login as admin
2. Navigate to Loads section
3. Create new load with Daily Tracking Report data:
   - Client: Select "Test Transport Ltd" (or use text "Nottingham Estate")
   - Origin: `Nottingham Estate, Zimbabwe`
   - Destination: `Khold, Bayhead`
   - Border: `Beitbridge`
   - Commodity: `Citrus`
   - Material: `Citrus - Oranges`
   - Weight: `34` tons
   - Manifest Number: `I325600001NT`
   - Pickup Date: Today's date
   - Delivery Date: Today + 5 days
   - Status: `assigned`
   - Transporter: `MACHETE Transport`
   - Horse: `JY55ZSGP`
   - Trailer 1: `MN16BZGP`
   - Trailer 2: `MN16BYGP`
   - Driver: `Givemore Muzanenhamo`

### 7.2 Update Milestone Dates
After creating the load, update:
- Date Arrived at Pickup: Today
- Date Loaded: Today
- Date Arrived Border (Zim): Today + 1 day
- Date Arrived Border (SA): Today + 2 days

### 7.3 Verify Load Creation
```sql
-- Check the load
SELECT
    l.load_number,
    l.manifest_number,
    l.client,
    l.status,
    h.registration_number as horse,
    t1.registration_number as trailer1,
    t2.registration_number as trailer2,
    d.first_name || ' ' || d.last_name as driver_name,
    l.date_loaded,
    l.date_arrived_border_zim
FROM ceva_loads l
LEFT JOIN ceva_horses h ON l.horse_id = h.id
LEFT JOIN ceva_trailers t1 ON l.trailer_id = t1.id
LEFT JOIN ceva_trailers t2 ON l.trailer2_id = t2.id
LEFT JOIN ceva_drivers d ON l.driver_id = d.id
WHERE l.manifest_number = 'I325600001NT';
```

**Expected:**
- Load number auto-generated (e.g., L-1000)
- All relationships properly linked
- Status = 'assigned'

✅ **Test Result:** □ Pass □ Fail

---

## Step 8: RLS (Row Level Security) Testing

### 8.1 Test Client RLS
1. Login as client user (`client@testcompany.com`)
2. Try to view loads

**SQL Test (run as client):**
```sql
-- Should only see loads where client_id = auth.uid()
SELECT COUNT(*) FROM ceva_loads;
```

**Expected:** Should see 0 or only loads assigned to this client

### 8.2 Test Driver RLS
1. Login as driver user (`driver@cevatest.com`)
2. Navigate to driver portal

**Expected:** Should not see any loads yet (none assigned to this driver)

3. As admin, create a new load assigned to this driver
4. Refresh driver portal

**Expected:** Should now see the assigned load

### 8.3 Test Admin Access
1. Login as admin
2. Navigate to loads

**Expected:** Should see ALL loads regardless of client/driver assignment

### 8.4 Test Update Permissions
Run these tests via SQL Editor (you'll need to switch users):

```sql
-- As Client: Try to update a load (should fail)
UPDATE ceva_loads
SET status = 'delivered'
WHERE id = '<some-load-id>';
-- Expected: Permission denied

-- As Driver: Try to update assigned load milestone (should succeed)
UPDATE ceva_loads
SET date_arrived_border_zim = NOW()::DATE
WHERE driver_id = (SELECT id FROM ceva_drivers WHERE user_id = auth.uid())
LIMIT 1;
-- Expected: Success

-- As Admin: Try to update any load (should succeed)
UPDATE ceva_loads
SET comments = 'Test update by admin'
WHERE manifest_number = 'I325600001NT';
-- Expected: Success
```

✅ **Test Result:** □ Pass □ Fail

---

## Step 9: Portal Views Testing

### 9.1 Test Client Load Summary View
1. Login as client
2. Ensure the client has a load assigned (client_id set)
3. Run query:
```sql
SELECT * FROM client_load_summary;
```

**Expected Fields:**
- load_number, manifest_number
- origin, destination, border
- All milestone dates (date_arrived_pickup, date_loaded, etc.)
- vehicle_number, trailer_number, trailer2_number
- driver_name, driver_phone, driver_passport
- current_location (GPS address)
- current_latitude, current_longitude, current_speed
- transporter_name, transporter_rib_code

### 9.2 Test Driver Load Summary View
1. Login as driver
2. Ensure driver has loads assigned
3. Run query:
```sql
SELECT * FROM driver_load_summary;
```

**Expected Fields:**
- Same comprehensive fields as client view
- Only shows loads assigned to this driver
- Includes vehicle_location and real-time tracking data

✅ **Test Result:** □ Pass □ Fail

---

## Step 10: GPS Tracking Testing (Optional)

### 10.1 Insert Sample GPS Position
```sql
-- Get a horse_id first
SELECT id, registration_number FROM ceva_horses LIMIT 1;

-- Insert sample GPS position
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
    '<horse-id-from-above>',
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

### 10.2 Verify GPS Data in Views
```sql
-- Check if GPS data appears in client view
SELECT
    load_number,
    current_location,
    current_latitude,
    current_longitude,
    current_speed,
    location_updated_at
FROM client_load_summary
WHERE horse_id = '<horse-id>';
```

**Expected:** GPS data should appear in the view

✅ **Test Result:** □ Pass □ Fail

---

## Step 11: Audit Log Testing

### 11.1 Check Audit Logs
```sql
-- View recent audit log entries
SELECT
    table_name,
    record_id,
    action,
    changed_fields,
    created_at,
    user_id
FROM ceva_audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

**Expected:**
- Logs for INSERT operations on loads, transporters, drivers
- Logs for UPDATE operations with changed_fields array
- user_id matches the auth user who made changes

### 11.2 Test Audit Triggers
1. As admin, update a load's status
2. Check audit log:
```sql
SELECT * FROM ceva_audit_logs
WHERE table_name = 'ceva_loads'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- New audit entry created
- action = 'UPDATE'
- changed_fields includes 'status'

✅ **Test Result:** □ Pass □ Fail

---

## Summary Checklist

Use this checklist to track overall testing progress:

- [ ] Step 1: Database migrations applied successfully
- [ ] Step 2: Admin user creation and login works
- [ ] Step 3: Dispatcher user creation and permissions correct
- [ ] Step 4: Client portal registration and access works
- [ ] Step 5: Driver portal registration and access works
- [ ] Step 6: Transporter, horse, trailer, driver creation works
- [ ] Step 7: Load creation and assignment works
- [ ] Step 8: RLS policies enforce correct permissions
- [ ] Step 9: Client and driver views show correct data
- [ ] Step 10: GPS tracking data appears correctly (if applicable)
- [ ] Step 11: Audit logs capture all changes

---

## Common Issues & Solutions

### Issue 1: Migration Fails
**Solution:** Check if older migrations conflict. You may need to reset the database:
```bash
npx supabase db reset
```

### Issue 2: User Profile Not Created
**Solution:** Check if `handle_new_user()` trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Issue 3: RLS Denies Access
**Solution:** Check user's role in ceva_profiles:
```sql
SELECT * FROM ceva_profiles WHERE id = auth.uid();
```

### Issue 4: Views Return No Data
**Solution:** Check if data exists and user has access:
```sql
-- Check raw data
SELECT * FROM ceva_loads WHERE client_id = auth.uid();
```

### Issue 5: Enum Value Errors
**Solution:** Ensure enum migrations ran:
```sql
SELECT enumlabel FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'ceva_user_role';
```

---

## Next Steps After Testing

Once all tests pass:
1. Deploy to production Supabase project
2. Set up environment variables
3. Configure email templates for user invitations
4. Set up GPS tracking integration (CTrack API)
5. Configure WhatsApp notifications (if required)
6. Import production data (transporters, clients, etc.)
7. Train users on the system

---

**Testing Date:** _______________
**Tested By:** _______________
**Overall Result:** □ Pass □ Fail
**Notes:**
