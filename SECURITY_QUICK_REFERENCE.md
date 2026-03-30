# Security Quick Reference Card

## 🔒 All 16 Security Tests Complete ✅

| Test | Status | Implementation |
|------|--------|----------------|
| CE2-T19 | ✅ | Dev Environment |
| CE2-T20 | ✅ | Authentication |
| CE2-T21 | ✅ | Authorization (RBAC) |
| CE2-T22 | ✅ | Session Management |
| CE2-T23 | ✅ | OWASP Top 10 |
| CE2-T24 | ✅ | SQL Injection Protection |
| CE2-T25 | ✅ | XSS Protection |
| CE2-T26 | ✅ | CSRF Protection |
| CE2-T27 | ✅ | Encryption (TLS) |
| CE2-T28 | ✅ | Data Encryption (AES-256) |
| CE2-T29 | ✅ | API Security |
| CE2-T30 | ✅ | Firewall (Headers) |
| CE2-T31 | ✅ | Backup Strategy |
| CE2-T32 | ✅ | Security Logging |
| CE2-T33 | ✅ | Audit Trail |
| CE2-T34 | ✅ | Penetration Testing |

## 🚀 Quick Setup (3 Steps)

### 1. Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add to `.env.local` as `ENCRYPTION_KEY=<generated-key>`

### 2. Run Database Migration
```bash
supabase db push
```

### 3. Verify Setup
```bash
chmod +x scripts/security-check.sh
./scripts/security-check.sh
```

## 📁 Key Files

### Security Libraries
- `/lib/security/rate-limit.ts` - Rate limiting
- `/lib/security/validation.ts` - Input validation & sanitization
- `/lib/security/csrf.ts` - CSRF protection
- `/lib/security/encryption.ts` - Data encryption
- `/lib/security/audit-log.ts` - Security logging
- `/lib/security/middleware.ts` - Combined security middleware

### Configuration
- `/next.config.mjs` - Security headers & CSP
- `/middleware.ts` - Session management & auth
- `/.env.example` - Environment variables template

### Database
- `/supabase/migrations/20260330_create_audit_logs.sql` - Audit logging

### Documentation
- `/SECURITY.md` - Complete security guide
- `/SECURITY_IMPLEMENTATION_SUMMARY.md` - Implementation details

### Components
- `/components/security-dashboard.tsx` - Security monitoring UI

## 🛡️ Key Security Features

### Authentication
- ✅ Supabase Auth with JWT
- ✅ Strong password requirements (8+ chars, mixed case, numbers, special)
- ✅ Secure cookie storage (httpOnly, secure, sameSite)

### Authorization
- ✅ Role-based access control (Admin, Dispatcher, Transporter, Client, Driver)
- ✅ Row-Level Security (RLS) in database
- ✅ Middleware route protection

### Session Management
- ✅ Idle timeout: 30 minutes
- ✅ Absolute timeout: 12 hours
- ✅ Automatic session refresh

### API Security
- ✅ Rate limiting (10 req/min default)
- ✅ Request size validation
- ✅ Input validation with Zod
- ✅ SQL injection detection
- ✅ XSS protection

### Data Protection
- ✅ HTTPS/TLS 1.3 enforced
- ✅ AES-256-GCM encryption
- ✅ Secure headers (CSP, HSTS, etc.)

### Monitoring
- ✅ Comprehensive audit logging
- ✅ Real-time security dashboard
- ✅ Automatic alerts for critical events

## 📝 Using Security Middleware

### Protect API Routes
```typescript
import { withSecurity } from '@/lib/security/middleware'

async function handler(request: NextRequest) {
  // Your API logic
}

export const POST = withSecurity(handler, {
  rateLimit: {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 5
  },
  maxRequestSizeKB: 10
})
```

### Validate Input
```typescript
import { validateAndSanitize, createUserSchema } from '@/lib/security/validation'

const validation = validateAndSanitize(body, createUserSchema)
if (!validation.success) {
  return NextResponse.json({ error: validation.error }, { status: 400 })
}
```

### Log Security Events
```typescript
import { logAuthEvent, logUserEvent, logSecurityViolation } from '@/lib/security/audit-log'

// Authentication event
await logAuthEvent('auth.login', userId, email, request)

// User management event
await logUserEvent('user.create', actorId, newUserId, request)

// Security violation
await logSecurityViolation('security.sql_injection_attempt', request, userId)
```

### Encrypt Sensitive Data
```typescript
import { encrypt, decrypt } from '@/lib/security/encryption'

const encrypted = await encrypt(sensitiveData)
const decrypted = await decrypt(encrypted)
```

## 🔍 Testing Commands

```bash
# Security check
./scripts/security-check.sh

# Dependency audit
npm audit

# Build verification
npm run build

# Run tests
npm test

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000
```

## ⚙️ Environment Variables

```bash
# Required
ENCRYPTION_KEY=<generated-32-byte-hex>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>

# Optional (with defaults)
SESSION_TIMEOUT_MINUTES=30
SESSION_ABSOLUTE_TIMEOUT_HOURS=12
RATE_LIMIT_INTERVAL_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

## 🎯 Security Headers

Automatically applied to all routes:

```
Content-Security-Policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: (restrictive)
Strict-Transport-Security: max-age=31536000
```

## 📊 Security Dashboard

Access at `/admin/security` (admin role required):

- Real-time security metrics
- Failed login attempts
- Critical security events
- Suspicious IP tracking
- Recent security events feed

## 🔐 Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

## 📋 Audit Event Types

### Authentication
- `auth.login`
- `auth.logout`
- `auth.failed_login`
- `auth.password_change`

### User Management
- `user.create`
- `user.update`
- `user.delete`
- `user.role_change`

### Data Access
- `data.create`
- `data.read`
- `data.update`
- `data.delete`

### Security Violations
- `security.csrf_violation`
- `security.sql_injection_attempt`
- `security.xss_attempt`
- `security.suspicious_activity`

### API Violations
- `api.rate_limit_exceeded`
- `api.unauthorized_access`
- `api.forbidden_access`

## 🆘 Troubleshooting

### Issue: Rate limiting too strict
**Solution:** Adjust in API route:
```typescript
rateLimit: { interval: 60000, uniqueTokenPerInterval: 20 }
```

### Issue: Session timing out too quickly
**Solution:** Update in `/middleware.ts`:
```typescript
const SESSION_TIMEOUT = 60 * 60 * 1000 // 60 minutes
```

### Issue: CSP blocking resources
**Solution:** Update CSP in `/next.config.mjs`:
```typescript
"script-src 'self' https://trusted-domain.com"
```

### Issue: Encryption key not set
**Solution:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to .env.local
```

## 📞 Support

- Review `/SECURITY.md` for detailed documentation
- Check `/SECURITY_IMPLEMENTATION_SUMMARY.md` for implementation details
- Run `./scripts/security-check.sh` for automated checks

---

**All 16 security tests are complete and production-ready!** ✅
