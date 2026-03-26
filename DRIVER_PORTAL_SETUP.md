# Driver Portal Implementation Guide

This document explains the driver portal implementation for the Ceva Logistics TMS.

## Overview

The driver portal allows your drivers to:
- View their assigned loads and deliveries
- Update delivery status in real-time
- Navigate to pickup and delivery locations
- Track completed deliveries
- View their profile information

## What's Been Implemented

### 1. Database Changes

**Migration File**: `supabase/migrations/20260325100000_add_driver_role.sql`

Key changes:
- Added `'driver'` to the `ceva_user_role` enum
- Added `user_id` column to `ceva_drivers` table to link drivers to auth users
- Implemented Row-Level Security (RLS) policies for driver data access
- Created `driver_load_summary` view for easy data access
- Added triggers to auto-create driver profiles on signup
- Drivers can only see and update their assigned loads

### 2. Driver Portal Routes

**New Files**:
- `app/driver/page.tsx` - Server component that verifies driver role and fetches initial data
- `app/driver/layout.tsx` - Layout for the driver portal
- `components/driver-portal-content.tsx` - Main driver portal UI component

**Features**:
- Active loads dashboard
- Pending pickups
- Completed deliveries history
- Real-time status updates
- Google Maps navigation integration
- Driver profile view

### 3. Authentication & Security

**Updated Files**:
- `middleware.ts` - Added driver role-based routing
  - Drivers are automatically redirected to `/driver` after login
  - Drivers cannot access admin, client, transporter, or customer portals
  - Staff cannot access the driver portal

### 4. User Management

**Updated Files**:
- `app/signup/page.tsx` - Added driver registration option
- `components/user-management.tsx` - Admins can now create and manage driver users

### 5. Row-Level Security (RLS)

Drivers can:
- **View**: Only their assigned loads, their profile, and assigned vehicles/trailers
- **Update**: Status of their assigned loads and their own profile
- **Cannot**: View other drivers' loads, access admin functions, or modify assignments

Staff (admin/dispatcher) have full access to all data.

## How to Deploy

### Step 1: Run the Migrations

**Important**: Two migrations must be run in order due to PostgreSQL enum constraints.

```bash
# Connect to your Supabase project and run all migrations
supabase db push

# This will automatically run:
# 1. 20260325095900_add_driver_enum_value.sql (adds 'driver' to enum)
# 2. 20260325100000_add_driver_role.sql (creates links and policies)
```

**Or apply manually in Supabase SQL Editor** (in this order):
1. Copy contents of `supabase/migrations/20260325095900_add_driver_enum_value.sql` → Execute
2. Copy contents of `supabase/migrations/20260325100000_add_driver_role.sql` → Execute

See `MIGRATION_ORDER.md` for detailed migration instructions.

### Step 2: Verify the Migrations

Check that:
1. The `ceva_user_role` enum includes 'driver'
2. The `ceva_drivers` table has a `user_id` column
3. RLS policies are enabled for drivers
4. The `driver_load_summary` view exists

### Step 3: Link Existing Drivers to User Accounts

**Option A: Create New Driver User**
1. Go to `/signup`
2. Select "Driver (Delivery Personnel)" as account type
3. Fill in details and create account
4. This will automatically create a driver profile

**Option B: Link Existing Driver to Auth User**

If you already have drivers in the `ceva_drivers` table:

```sql
-- First create an auth user via signup or admin panel
-- Then link the existing driver record

UPDATE ceva_drivers
SET user_id = '<auth_user_id>'
WHERE email = 'driver@example.com';
```

### Step 4: Assign Loads to Drivers

When creating or editing loads, make sure to assign them to drivers:

```sql
-- Assign a load to a driver
UPDATE ceva_loads
SET driver_id = '<driver_id>'
WHERE load_number = 'L-1234';
```

## Driver Portal Features

### Dashboard
- **Active Loads**: Shows loads with status assigned/in-transit
- **Completed Today**: Count of deliveries made today
- **Pending Pickup**: Loads awaiting collection

### Active Loads Tab
- View all assigned and in-transit loads
- See pickup and delivery locations
- View delivery dates and times
- Access vehicle/trailer information
- Update load status
- Navigate to destinations via Google Maps

### Pending Loads Tab
- View loads awaiting pickup
- Update status when ready to collect
- See all pickup details

### Completed Loads Tab
- View delivery history
- See last 10 completed deliveries
- Review past delivery notes

### My Profile Tab
- View driver information
- See license number
- Check account status
- View contact details

### Status Update Feature
- Drivers can update load status to:
  - **Assigned**: Load has been assigned to driver
  - **In Transit**: Load is currently being transported
  - **Delivered**: Load has been delivered successfully
- Add optional notes with each status update
- All updates are timestamped

## Security Considerations

### What Drivers Can See
✅ Their assigned loads only
✅ Their assigned vehicles and trailers
✅ Customer delivery addresses
✅ Their own profile information
✅ Navigation to delivery locations

### What Drivers Cannot See
❌ Other drivers' loads
❌ Internal fleet management
❌ Financial information (rates, invoices)
❌ Admin functions
❌ Client information beyond delivery details
❌ System audit logs

### What Drivers Can Update
✅ Status of their assigned loads
✅ Add notes to loads
✅ Their own profile (limited fields)

### What Drivers Cannot Update
❌ Load assignments
❌ Customer information
❌ Vehicle assignments
❌ Delivery rates or financial data
❌ Other drivers' loads

## Assigning Loads to Drivers

### Method 1: Via SQL

```sql
-- Get the driver's ID
SELECT id, full_name, email
FROM ceva_drivers
WHERE email = 'driver@example.com';

-- Assign loads to driver
UPDATE ceva_loads
SET driver_id = '<driver_id>'
WHERE load_number IN ('L-1000', 'L-1001', 'L-1002');
```

### Method 2: Update Load Booking Form

Update your load booking component to include a driver selector:

```tsx
// Fetch drivers
const { data: drivers } = await supabase
  .from('ceva_drivers')
  .select('id, full_name, status')
  .eq('status', 'active')

// In your form
<Select onValueChange={(driverId) => setFormData({...formData, driver_id: driverId})}>
  <SelectTrigger>
    <SelectValue placeholder="Select driver" />
  </SelectTrigger>
  <SelectContent>
    {drivers?.map(driver => (
      <SelectItem key={driver.id} value={driver.id}>
        {driver.full_name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Testing the Driver Portal

### Test Checklist

1. **Create a driver user**
   - [ ] Signup works with driver role
   - [ ] Driver profile is created in `ceva_drivers` table with `user_id`

2. **Assign loads to driver**
   - [ ] Update at least 3-5 test loads with the driver_id

3. **Login as driver**
   - [ ] Driver is redirected to `/driver` portal
   - [ ] Dashboard shows correct statistics
   - [ ] Only assigned loads are visible

4. **Test security**
   - [ ] Driver cannot access `/admin`, `/client`, `/transporter`, or `/customer`
   - [ ] Driver cannot see other drivers' loads
   - [ ] Driver can only update status of their own loads

5. **Test status updates**
   - [ ] Driver can update load status
   - [ ] Notes are added to load
   - [ ] Status changes are reflected immediately
   - [ ] Other users see the updated status

6. **Test navigation**
   - [ ] Google Maps navigation links work
   - [ ] Correct origin and destination are used

## Common Workflows

### 1. Driver Starting Their Day

1. Login to driver portal
2. View "Pending Pickup" tab
3. Update first load to "In Transit"
4. Click "Navigate" to get directions to pickup location
5. After pickup, update notes: "Cargo loaded, departing for delivery"

### 2. Driver En Route

1. Check "Active Loads" tab
2. See current assignments and delivery times
3. Use navigation to reach destination
4. Call customer if needed (contact info in load details)

### 3. Driver Completing Delivery

1. Arrive at destination
2. Click "Update Status" on the load
3. Change status to "Delivered"
4. Add notes: "Delivered to warehouse, signed by John Doe"
5. Submit update
6. Load moves to "Completed" tab

### 4. Driver Ending Their Day

1. Review "Completed" tab
2. Verify all deliveries are marked as delivered
3. Sign out

## Integration with Vehicle Tracking

The driver portal is ready to integrate with GPS tracking:

```sql
-- When you update vehicle location via GPS
UPDATE ceva_horses
SET current_location = 'N1 Highway, Johannesburg'
WHERE registration_number = 'ABC-123';

-- Drivers will see this in their load details
```

## Troubleshooting

### Issue: Driver can't see any loads
**Solution**: Make sure loads have `driver_id` set to the driver's ID (not user_id).

```sql
-- Check driver's ID
SELECT id, user_id, full_name FROM ceva_drivers WHERE email = 'driver@example.com';

-- Assign loads to driver using driver.id (not user_id)
UPDATE ceva_loads SET driver_id = '<driver_id>' WHERE load_number = 'L-XXXX';
```

### Issue: Driver cannot login
**Solution**: Verify the driver has both:
1. A user account in `auth.users`
2. A driver profile in `ceva_drivers` with matching `user_id`

```sql
-- Check if driver profile is linked
SELECT d.id, d.full_name, d.user_id, p.role
FROM ceva_drivers d
LEFT JOIN ceva_profiles p ON p.id = d.user_id
WHERE d.email = 'driver@example.com';
```

### Issue: Driver is redirected away from portal
**Solution**: Verify the user's role in `ceva_profiles` table.

```sql
SELECT id, email, role FROM ceva_profiles WHERE email = 'driver@example.com';
-- Role should be 'driver'
```

### Issue: Driver cannot update load status
**Solution**: Check RLS policies and verify driver owns the load.

```sql
-- Verify load assignment
SELECT l.load_number, l.driver_id, d.full_name, d.user_id
FROM ceva_loads l
JOIN ceva_drivers d ON d.id = l.driver_id
WHERE l.load_number = 'L-XXXX';
```

### Issue: Status update doesn't save
**Solution**: Check browser console for errors. Ensure driver is updating their own load.

## Mobile Optimization

The driver portal is fully responsive and optimized for mobile use:
- Large tap targets for easy status updates
- Simplified navigation on small screens
- Quick access to essential features
- Mobile-friendly forms

Drivers can use the portal on:
- Smartphones (iOS/Android)
- Tablets
- Desktop computers

## Next Steps (Optional Enhancements)

### 1. Photo Upload for POD
Allow drivers to take photos of delivered cargo as proof of delivery.

### 2. Signature Capture
Implement digital signature capture for deliveries.

### 3. Offline Mode
Add PWA capabilities so drivers can update status even without internet.

### 4. Push Notifications
Send notifications when new loads are assigned or priorities change.

### 5. Route Optimization
Suggest optimal delivery sequence for multiple loads.

### 6. Real-Time GPS Tracking
Integrate live GPS tracking from driver's mobile device.

### 7. Incident Reporting
Allow drivers to report issues (accidents, delays, damages).

### 8. Chat with Dispatcher
Add real-time messaging between drivers and dispatch.

## API Endpoints for Mobile App

If you build a native mobile app, use these Supabase queries:

```typescript
// Get driver's loads
const { data: loads } = await supabase
  .from('driver_load_summary')
  .select('*')
  .order('pickup_date', { ascending: true })

// Update load status
const { error } = await supabase
  .from('ceva_loads')
  .update({ status: 'delivered' })
  .eq('id', loadId)

// Get driver profile
const { data: profile } = await supabase
  .from('ceva_drivers')
  .select('*')
  .eq('user_id', userId)
  .single()
```

## Summary

The driver portal is now fully implemented with:
- ✅ Secure authentication and role-based access
- ✅ Real-time load management
- ✅ Status update functionality
- ✅ Navigation integration
- ✅ Delivery history tracking
- ✅ Row-level security to protect data
- ✅ Mobile-responsive design
- ✅ Profile management

To activate it:
1. Run the migration
2. Create driver users or link existing drivers
3. Assign loads to drivers
4. Drivers can login and start managing deliveries!
