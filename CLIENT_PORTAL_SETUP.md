# Client Portal Implementation Guide

This document explains the client portal implementation for the Ceva Logistics TMS.

## Overview

The client portal allows your customers to:
- View and track their shipments in real-time
- Access delivery history and statistics
- Download invoices and proof of delivery documents
- Contact drivers directly via WhatsApp
- Get support and access FAQs

## What's Been Implemented

### 1. Database Changes

**Migration File**: `supabase/migrations/20260325000000_add_client_role.sql`

Key changes:
- Added `'client'` to the `ceva_user_role` enum
- Created `ceva_clients` table for storing client company information
- Added `client_id` column to `ceva_loads` table to link loads to clients
- Implemented Row-Level Security (RLS) policies to ensure clients only see their own data
- Created `client_load_summary` view for easy data access
- Added triggers to auto-create client profiles on signup

### 2. Client Portal Routes

**New Files**:
- `app/client/page.tsx` - Server component that verifies client role and fetches initial data
- `app/client/layout.tsx` - Layout for the client portal
- `components/client-portal-content.tsx` - Main client portal UI component

**Features**:
- Real-time shipment tracking
- Load status filtering
- Search functionality
- Statistics dashboard
- Support center with FAQs

### 3. Authentication & Security

**Updated Files**:
- `middleware.ts` - Added role-based routing
  - Clients are automatically redirected to `/client` after login
  - Clients cannot access admin, transporter, or customer portals
  - Staff cannot access the client portal

### 4. User Management

**Updated Files**:
- `app/signup/page.tsx` - Added client registration option with company name field
- `components/user-management.tsx` - Admins can now create and manage client users

### 5. Row-Level Security (RLS)

Clients can only:
- **View**: Their own loads and client profile
- **Create**: Loads assigned to themselves (optional)
- **Cannot**: View other clients' data, modify loads, or access admin functions

Staff (admin/dispatcher) have full access to all data.

## How to Deploy

### Step 1: Run the Migrations

**Important**: Two migrations must be run in order due to PostgreSQL enum constraints.

```bash
# Connect to your Supabase project and run all migrations
supabase db push

# This will automatically run:
# 1. 20260324235900_add_client_enum_value.sql (adds 'client' to enum)
# 2. 20260325000000_add_client_role.sql (creates tables and policies)
```

**Or apply manually in Supabase SQL Editor** (in this order):
1. Copy contents of `supabase/migrations/20260324235900_add_client_enum_value.sql` → Execute
2. Copy contents of `supabase/migrations/20260325000000_add_client_role.sql` → Execute

See `MIGRATION_ORDER.md` for detailed migration instructions.

### Step 2: Verify the Migration

Check that:
1. The `ceva_user_role` enum includes 'client'
2. The `ceva_clients` table exists
3. The `ceva_loads` table has a `client_id` column
4. RLS policies are enabled

### Step 3: Create a Test Client User

**Option A: Via Signup Page**
1. Go to `/signup`
2. Select "Client (Track Shipments)" as account type
3. Fill in company name and other details
4. Create account

**Option B: Via Admin Panel**
1. Login as admin
2. Go to `/admin/users`
3. Click "Add User"
4. Select "Client" role
5. Create account

### Step 4: Assign Loads to Clients

When creating or editing loads in your system, you need to assign them to clients:

```sql
-- Example: Assign a load to a client
UPDATE ceva_loads
SET client_id = '<client_user_id>'
WHERE load_number = 'L-1234';
```

Or update your load creation forms to include a client selector.

## Client Portal Features

### Dashboard
- **Active Shipments**: Shows loads with status pending/assigned/in-transit
- **Delivered This Month**: Count of completed deliveries
- **Pending Pickup**: Loads awaiting collection
- **Total Spent**: Sum of rates for delivered loads this month

### My Shipments Tab
- View all shipments (active, delivered, pending, cancelled)
- Search by load number, origin, or destination
- Click on any shipment to view details
- Contact driver via WhatsApp (if phone number available)

### Track Load Tab
- Click on active shipments to see live tracking
- View current location (if tracked)
- See estimated delivery times
- Access driver contact information

### Support Tab
- Contact support via WhatsApp
- View account information
- Access frequently asked questions

## Security Considerations

### What Clients Can See
✅ Their own loads and shipment details
✅ Driver contact information for their shipments
✅ Their delivery history and invoices
✅ Their company profile information

### What Clients Cannot See
❌ Other clients' shipments
❌ Internal fleet management
❌ Transporter details
❌ Admin functions
❌ Profit margins or internal rates
❌ System audit logs

## Assigning Loads to Clients

### Method 1: Manual Assignment (SQL)

```sql
-- Get the client's user ID
SELECT id, email, company_name
FROM ceva_clients
WHERE company_name = 'ABC Company';

-- Assign loads
UPDATE ceva_loads
SET client_id = '<client_user_id>'
WHERE load_number IN ('L-1000', 'L-1001', 'L-1002');
```

### Method 2: Update Load Booking Form

You should update your load booking component to include a client selector:

```tsx
// In your load booking form
<Select onValueChange={(clientId) => setFormData({...formData, client_id: clientId})}>
  <SelectTrigger>
    <SelectValue placeholder="Select client" />
  </SelectTrigger>
  <SelectContent>
    {clients.map(client => (
      <SelectItem key={client.id} value={client.id}>
        {client.company_name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Testing the Client Portal

### Test Checklist

1. **Create a client user**
   - [ ] Signup works with client role
   - [ ] Client profile is created in `ceva_clients` table

2. **Assign loads to client**
   - [ ] Update at least 3-5 test loads with the client_id

3. **Login as client**
   - [ ] Client is redirected to `/client` portal
   - [ ] Dashboard shows correct statistics
   - [ ] Only assigned loads are visible

4. **Test security**
   - [ ] Client cannot access `/admin`, `/transporter`, or `/customer`
   - [ ] Client cannot see other clients' loads
   - [ ] Client cannot modify load status

5. **Test features**
   - [ ] Search functionality works
   - [ ] Load details dialog opens
   - [ ] WhatsApp links work (if phone numbers provided)
   - [ ] Stats are calculated correctly

## Next Steps (Optional Enhancements)

### 1. Client Self-Service Load Booking
Allow clients to create their own load bookings through the portal.

### 2. Invoice Downloads
Implement actual invoice PDF generation and download functionality.

### 3. Email Notifications
Send automated emails when:
- Load status changes
- Delivery is completed
- Invoice is ready

### 4. Real-Time Tracking
Integrate with your vehicle tracking system to show live GPS location on a map.

### 5. Client Approval Workflow
Add an approval process where new client registrations require admin approval before access is granted.

### 6. Multi-User Accounts
Allow multiple users from the same company to access the same client account.

## Troubleshooting

### Issue: Client can't see any loads
**Solution**: Make sure loads have `client_id` set to the client's user ID.

```sql
-- Check if loads are assigned
SELECT load_number, client_id FROM ceva_loads WHERE client_id IS NOT NULL;

-- Assign loads to client
UPDATE ceva_loads SET client_id = '<client_user_id>' WHERE load_number = 'L-XXXX';
```

### Issue: Client is redirected away from portal
**Solution**: Verify the user's role in `ceva_profiles` table.

```sql
SELECT id, email, role FROM ceva_profiles WHERE email = 'client@example.com';
```

### Issue: RLS policies blocking access
**Solution**: Check that RLS policies are correctly applied.

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'ceva_loads';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'ceva_loads';
```

### Issue: Client can see other clients' data
**Solution**: This is a critical security issue. Verify RLS policies are active:

```sql
-- Re-run the RLS policy creation from the migration file
-- Make sure the policies check: client_id = auth.uid()
```

## Support

For questions or issues with the client portal implementation, please:
1. Check this documentation
2. Review the migration file for database structure
3. Check the middleware for routing logic
4. Review RLS policies in Supabase dashboard

## Summary

The client portal is now fully implemented with:
- ✅ Secure authentication and role-based access
- ✅ Real-time shipment tracking
- ✅ Statistics dashboard
- ✅ Search and filtering
- ✅ Driver contact via WhatsApp
- ✅ Support center with FAQs
- ✅ Row-level security to protect data
- ✅ Responsive design for mobile access

To activate it, just run the migration and start assigning loads to client users!
