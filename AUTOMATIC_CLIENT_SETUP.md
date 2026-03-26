# Automatic Client User Creation - Setup Guide

## 🎯 What This Does

When you create a client in the portal (`/admin/clients`), it now **automatically**:
1. Creates the client record in `ceva_clients` table
2. Creates an auth user in `auth.users` with password `CevaCitrus2026!`
3. Links the client to the auth user
4. Sets the role to `client`
5. Client can immediately login to `/client/dashboard`

**No more manual Supabase Dashboard steps!** ✅

---

## 🔧 Setup (One-Time)

### Step 1: Add Service Role Key to Environment

1. Go to **Supabase Dashboard** → Your Project → **Settings** → **API**

2. Copy the **`service_role`** key (NOT the anon key)
   - ⚠️ This key has full admin access - keep it secret!
   - It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long)

3. Add it to your `.env.local` file:

```bash
# .env.local

# Your existing variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# Add this NEW variable:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key-here
```

4. **Restart your dev server** for the environment variable to take effect:
   ```bash
   # Stop the server (Ctrl+C)
   # Then start again:
   npm run dev
   ```

### Step 2: Run Initial Database Setup (if not done already)

If you haven't run this yet, run it now in Supabase SQL Editor:

```sql
-- Run FINAL_CLIENT_SETUP.sql
-- This adds user_id column and RLS policy
```

---

## ✅ Usage (Automatic!)

### Create a New Client

1. Go to `/admin/clients`
2. Click **"Add Client"**
3. Fill in the form:
   - **Name**: Client company name (e.g., "PC Group")
   - **Email**: Client email (e.g., "azande@pc-group.net") ⚠️ **REQUIRED**
   - Contact number (optional)
   - Addresses (optional)
4. Click **"Add Client"**

**That's it!** The system will automatically:
- ✅ Create client record
- ✅ Create auth user with email + password `CevaCitrus2026!`
- ✅ Link them together
- ✅ Set role to `client`

You'll see a success message with the login credentials.

### Client Can Now Login

The client can immediately login at `/login` with:
- Email: Their email (e.g., `azande@pc-group.net`)
- Password: `CevaCitrus2026!`

They'll be redirected to `/client/dashboard` and see only their loads.

---

## 🧪 Testing

### Test with azande@pc-group.net

1. **Delete the existing azande client** (if it exists without auth user):
   ```sql
   DELETE FROM ceva_clients WHERE email = 'azande@pc-group.net';
   ```

2. **Create it fresh** in the portal:
   - Go to `/admin/clients`
   - Click "Add Client"
   - Name: PC Group
   - Email: azande@pc-group.net
   - Click "Add Client"

3. **Try to login**:
   - Go to `/login`
   - Email: azande@pc-group.net
   - Password: CevaCitrus2026!
   - Should redirect to `/client/dashboard` ✅

---

## 🔍 How It Works

### Before (Manual Process):
```
1. Create client in portal
2. Go to Supabase Dashboard
3. Create auth user manually
4. Run SQL to link
5. Client can login
```

### After (Automatic Process):
```
1. Create client in portal
   ↓ (Automatic!)
2. Server action creates auth user
   ↓ (Automatic!)
3. Server action links them
   ↓ (Automatic!)
4. Server action sets role
   ↓
5. Client can login immediately ✅
```

### Technical Flow:

```typescript
// components/clients-management.tsx
handleSubmit()
  ↓
createClientWithUser() // Server action
  ↓
supabase.from("ceva_clients").insert() // Create client record
  ↓
supabaseAdmin.auth.admin.createUser() // Create auth user (needs service role key)
  ↓
update ceva_clients set user_id = ... // Link them
  ↓
update ceva_profiles set role = 'client' // Set role
  ↓
return success
```

---

## 🛠️ Files Changed

| File | Changes |
|------|---------|
| `lib/supabase/server.ts` | Added `createAdminClient()` function |
| `app/actions/create-client-user.ts` | New server action for creating clients with users |
| `components/clients-management.tsx` | Updated to use server action instead of direct insert |
| `hooks/use-toast.ts` | New toast hook for user feedback |
| `.env.local.example` | Template for environment variables |

---

## ❓ Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY is not set"

**Cause**: Environment variable missing or dev server not restarted

**Fix**:
1. Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY=...`
2. Restart dev server: Stop (Ctrl+C) and run `npm run dev` again
3. Verify the key is correct (copy from Supabase Dashboard → Settings → API)

### "Client created but login not enabled"

**Cause**: Auth user creation failed (usually permissions or invalid email)

**Fix**:
1. Check the error message in the toast/alert
2. Verify email is valid format
3. Check Supabase logs: Dashboard → Logs
4. If needed, manually create auth user:
   - Supabase Dashboard → Authentication → Users → Add User
   - Then run linking SQL from `FINAL_CLIENT_SETUP.sql`

### Client still can't login after creation

**Cause**: User might not be confirmed

**Check**:
```sql
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'azande@pc-group.net';
```

If `email_confirmed_at` is NULL:
```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'azande@pc-group.net';
```

### "Invalid login credentials" after creation

**Possible causes**:
1. User wasn't created (check auth.users table)
2. Wrong password (should be `CevaCitrus2026!`)
3. Email not confirmed (see above)

**Debug**:
```sql
-- Check if user exists
SELECT * FROM auth.users WHERE email = 'azande@pc-group.net';

-- Check if linked
SELECT c.name, c.email, c.user_id, p.role
FROM ceva_clients c
LEFT JOIN ceva_profiles p ON p.id = c.user_id
WHERE c.email = 'azande@pc-group.net';
```

---

## 🔒 Security Notes

### Service Role Key Security

⚠️ **IMPORTANT**: The `SUPABASE_SERVICE_ROLE_KEY` has full admin access to your database.

**DO:**
- ✅ Keep it in `.env.local` (never commit to git)
- ✅ Only use it in server actions/API routes (never expose to client)
- ✅ Add `.env.local` to `.gitignore`

**DON'T:**
- ❌ Never put it in client-side code
- ❌ Never commit it to version control
- ❌ Never expose it in API responses
- ❌ Never log it in console

The current implementation is safe because:
- Server action runs on the server only
- Client can't access the service role key
- Admin client is only created in server action

---

## 📊 Default Password Policy

All clients use the same default password: `CevaCitrus2026!`

**Why?**
- Easy to communicate to clients
- Easy to remember
- Clients can change it via Supabase auth (password reset)

**To change the default password:**

Edit `app/actions/create-client-user.ts`:

```typescript
// Change this line:
password: "CevaCitrus2026!", // Default password

// To:
password: "YourNewPassword123!",
```

---

## ✅ Summary

**Before Setup:**
- Create client in portal
- Manual steps in Supabase Dashboard
- Manual SQL linking
- ~5 minutes per client

**After Setup:**
- Create client in portal
- **Everything automatic**
- Client can login immediately
- **~2 minutes per client** ✅

**Setup Steps:**
1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
2. Restart dev server
3. Done!

**Client Creation:**
1. Create client in portal with email
2. Done! They can login immediately.

**Client Login:**
- URL: `/login`
- Email: Their email
- Password: `CevaCitrus2026!`

---

## 🚀 Next Steps

1. **Add service role key** to `.env.local`
2. **Restart dev server**
3. **Test** by creating a client
4. **Try logging in** as that client
5. **Verify** they see only their loads

Once working, you can create clients effortlessly and they can access the portal immediately! 🎉
