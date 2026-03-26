# Migration Order for Client & Driver Portals

Due to PostgreSQL's enum handling, the migrations must be run in a specific order.

## Migration Files (in order)

### 1. Add Client Enum Value
**File**: `supabase/migrations/20260324235900_add_client_enum_value.sql`
- Adds 'client' to the `ceva_user_role` enum
- Must run first and be committed before using 'client' value

### 2. Add Client Portal
**File**: `supabase/migrations/20260325000000_add_client_role.sql`
- Creates `ceva_clients` table
- Adds `client_id` to loads table
- Sets up RLS policies for clients
- Creates client views and triggers

### 3. Add Driver Enum Value
**File**: `supabase/migrations/20260325095900_add_driver_enum_value.sql`
- Adds 'driver' to the `ceva_user_role` enum
- Must run before driver portal migration

### 4. Add Driver Portal
**File**: `supabase/migrations/20260325100000_add_driver_role.sql`
- Links `ceva_drivers` table to auth users
- Sets up RLS policies for drivers
- Creates driver views and triggers

## How to Run

### Option 1: Using Supabase CLI (Recommended)

```bash
# This will automatically run all migrations in order
supabase db push
```

The CLI will execute migrations in filename order, which is why we numbered them correctly.

### Option 2: Manual Execution in Supabase SQL Editor

Run each file in order:

1. Copy contents of `20260324235900_add_client_enum_value.sql` → Execute
2. Copy contents of `20260325000000_add_client_role.sql` → Execute
3. Copy contents of `20260325095900_add_driver_enum_value.sql` → Execute
4. Copy contents of `20260325100000_add_driver_role.sql` → Execute

**Important**: Execute each migration completely before starting the next one.

## Verification

After running all migrations, verify:

```sql
-- Check enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ceva_user_role')
ORDER BY enumlabel;

-- Should show: admin, client, dispatcher, driver

-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('ceva_clients', 'ceva_drivers');

-- Check client_id column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ceva_loads'
AND column_name = 'client_id';

-- Check driver user_id column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ceva_drivers'
AND column_name = 'user_id';

-- Check views exist
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('client_load_summary', 'driver_load_summary');
```

## Rollback (if needed)

If you need to rollback:

```sql
-- Rollback driver portal
DROP VIEW IF EXISTS public.driver_load_summary;
DROP TRIGGER IF EXISTS on_auth_user_created_driver ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_driver();
DROP FUNCTION IF EXISTS public.get_driver_id_from_user();
ALTER TABLE public.ceva_drivers DROP COLUMN IF EXISTS user_id;

-- Rollback client portal
DROP VIEW IF EXISTS public.client_load_summary;
DROP TRIGGER IF EXISTS on_auth_user_created_client ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_client();
DROP TABLE IF EXISTS public.ceva_clients;
ALTER TABLE public.ceva_loads DROP COLUMN IF EXISTS client_id;

-- Note: Cannot remove enum values in PostgreSQL without dropping and recreating the type
-- This would affect existing data, so it's not recommended
```

## Common Issues

### Issue: "unsafe use of new value of enum type"
**Cause**: Trying to use enum value in the same transaction where it was added
**Solution**: The migrations are now split - enum values are added in separate files

### Issue: "trigger already exists"
**Cause**: Migration was run before
**Solution**: Migrations now use `DROP TRIGGER IF EXISTS` - safe to re-run

### Issue: "policy already exists"
**Cause**: Migration was run before
**Solution**: Migrations now use `DROP POLICY IF EXISTS` - safe to re-run

## Next Steps After Migration

### For Client Portal:
1. Create test client user via `/signup`
2. Assign loads to client by setting `client_id`
3. Test client login at `/client`

### For Driver Portal:
1. Create test driver user via `/signup`
2. Link driver profile or create new one
3. Assign loads to driver by setting `driver_id`
4. Test driver login at `/driver`

See `CLIENT_PORTAL_SETUP.md` and `DRIVER_PORTAL_SETUP.md` for detailed setup instructions.
