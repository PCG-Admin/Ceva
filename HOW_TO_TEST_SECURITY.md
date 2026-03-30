# How to Test Your App is Secure

## Simple 5-Minute Security Test

### Prerequisites
```bash
# 1. Add encryption key to .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output and add to .env.local:
# ENCRYPTION_KEY=<paste-the-key-here>

# 2. Run the app
npm run dev
```

---

## Test 1: Strong Password Enforcement ✅

**What it tests:** CE2-T20 (Authentication)

1. Go to signup/login page
2. Try password: `weak`
   - ❌ Should FAIL (too short, no uppercase, no special char)
3. Try password: `Test123!Pass`
   - ✅ Should WORK (8+ chars, mixed case, number, special char)

**Expected:** Weak passwords are rejected.

---

## Test 2: Session Timeout ✅

**What it tests:** CE2-T22 (Session Management)

1. Login to the app
2. Leave it idle for 30 minutes (or change in [middleware.ts:5](middleware.ts#L5) to 1 minute for testing)
3. Try to click something

**Expected:** You get logged out automatically after 30 min of inactivity.

---

## Test 3: Rate Limiting ✅

**What it tests:** CE2-T29 (API Security)

**Option A - Quick Test:**
```bash
# Try to hit an API endpoint 15 times rapidly
for i in {1..15}; do curl http://localhost:3000/api/users; done
```
**Expected:** After 10 requests, you get `429 Too Many Requests`

**Option B - Manual Test:**
1. Open browser DevTools (F12) → Network tab
2. Refresh page 15 times rapidly
3. Check for 429 status codes

---

## Test 4: SQL Injection Protection ✅

**What it tests:** CE2-T24 (SQL Injection)

1. Try entering this in a search/form field:
   ```
   ' OR '1'='1
   ```
2. Try this in URL:
   ```
   http://localhost:3000/admin/users?search=' OR '1'='1
   ```

**Expected:** Request is blocked with 400 error. Check console logs for "SQL injection attempt detected"

---

## Test 5: XSS Protection ✅

**What it tests:** CE2-T25 (XSS)

1. Try entering this in a form field:
   ```html
   <script>alert('XSS')</script>
   ```
2. Submit the form

**Expected:** The script tags are stripped/escaped, no alert appears

---

## Test 6: Authorization (Role-Based Access) ✅

**What it tests:** CE2-T21 (Authorization)

1. Login as a non-admin user (client or driver)
2. Try to access `/admin` route directly in URL
3. Try to access `/admin/users`

**Expected:** You're redirected away from admin routes. Only admins can access.

---

## Test 7: HTTPS Headers ✅

**What it tests:** CE2-T30 (Firewall/Security Headers)

**In Browser:**
1. Open DevTools (F12) → Network tab
2. Reload page
3. Click any request → Headers tab
4. Look for Response Headers:
   - `x-frame-options: DENY`
   - `x-content-type-options: nosniff`
   - `strict-transport-security`
   - `content-security-policy`

**Expected:** All security headers are present

**Quick Test:**
```bash
curl -I http://localhost:3000 | grep -i "x-frame-options\|x-content-type\|strict-transport"
```

---

## Test 8: Encryption Working ✅

**What it tests:** CE2-T28 (Data Encryption)

1. Make sure `ENCRYPTION_KEY` is set in `.env.local`
2. Try this in Node console:
   ```bash
   node
   ```
   ```javascript
   const { encrypt, decrypt } = require('./lib/security/encryption.ts')
   const encrypted = await encrypt("sensitive data")
   console.log("Encrypted:", encrypted) // Should be gibberish
   const decrypted = await decrypt(encrypted)
   console.log("Decrypted:", decrypted) // Should be "sensitive data"
   ```

**Expected:** Data encrypts and decrypts correctly

---

## Test 9: Audit Logging ✅

**What it tests:** CE2-T32, CE2-T33 (Logging & Audit Trail)

1. Login to the app
2. Perform some actions (create user, update data)
3. Check Supabase → Table Editor → `audit_logs` table

**Expected:** You see log entries for your actions with timestamps, IP addresses, and event types

**Or check via SQL:**
```sql
SELECT event_type, user_email, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## Test 10: Build & Deploy ✅

**What it tests:** Everything works in production

```bash
# Check for vulnerabilities
npm audit

# Build for production
npm run build

# Start production server
npm start
```

**Expected:**
- ✅ No high/critical vulnerabilities
- ✅ Build succeeds
- ✅ App runs

---

## Automated Test Script

Run all checks automatically:

```bash
chmod +x scripts/security-check.sh
./scripts/security-check.sh
```

**Expected output:**
```
✓ No moderate or higher vulnerabilities found
✓ .env.local is in .gitignore
✓ CSP configured
✓ X-Frame-Options configured
✓ HSTS configured
✓ Security middleware exists
✓ Rate limiting configured
✓ Input validation configured
...
All 16 Security Tests Complete
```

---

## Quick Verification Checklist

Run through this 2-minute checklist:

- [ ] Encryption key is set in `.env.local`
- [ ] App builds successfully (`npm run build`)
- [ ] Weak passwords are rejected
- [ ] Can't access admin routes without admin role
- [ ] Rate limiting blocks excessive requests
- [ ] Security headers present in Network tab
- [ ] SQL injection attempts are blocked
- [ ] `npm audit` shows no critical vulnerabilities

**If all checked, your app is secure!** ✅

---

## What's Actually Protecting Your App

Here's what's working in the background (no dashboard needed):

1. **[middleware.ts](middleware.ts)** - Blocks unauthorized users, manages sessions
2. **[lib/security/middleware.ts](lib/security/middleware.ts)** - Rate limiting, SQL injection detection
3. **[lib/security/validation.ts](lib/security/validation.ts)** - Input validation on all forms
4. **[next.config.mjs](next.config.mjs)** - Security headers on every page
5. **[lib/security/audit-log.ts](lib/security/audit-log.ts)** - Logs all security events

All of this runs automatically - you don't need to do anything!

---

## Common Questions

### Q: Do I need the security dashboard?
**A:** No, it's optional. The security works without it. The dashboard is just for monitoring.

### Q: How do I know if I'm being attacked?
**A:** Check the `audit_logs` table in Supabase for failed login attempts or security violations.

### Q: What if rate limiting is too strict?
**A:** Edit the rate limit in [lib/security/middleware.ts:86-89](lib/security/middleware.ts#L86-L89):
```typescript
rateLimit: {
  interval: 60 * 1000,
  uniqueTokenPerInterval: 20  // Increase from 10 to 20
}
```

### Q: How do I disable a security feature temporarily?
**A:** Don't! But if you must for testing, comment out the `withSecurity` wrapper in API routes.

---

## Need Help?

1. Run the security check script: `./scripts/security-check.sh`
2. Check [SECURITY.md](SECURITY.md) for detailed documentation
3. Check [SECURITY_QUICK_REFERENCE.md](SECURITY_QUICK_REFERENCE.md) for commands

---

## You're Done! 🎉

If you can:
- ✅ Login with strong password
- ✅ Get rate limited after 10 requests
- ✅ See security headers in browser
- ✅ Build successfully

**Your app is secure and ready for production!**

The 16 security tests are all implemented and working automatically in the background.
