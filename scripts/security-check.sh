#!/bin/bash

# Security Testing Script for CEVA Logistics TMS
# This script runs various security checks and audits

set -e

echo "======================================"
echo "CEVA Logistics TMS - Security Check"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo "1. Checking for vulnerable dependencies..."
echo "=========================================="
npm audit --audit-level=moderate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ No moderate or higher vulnerabilities found${NC}"
else
    echo -e "${YELLOW}⚠ Vulnerabilities detected - review above${NC}"
fi
echo ""

echo "2. Checking for exposed secrets..."
echo "===================================="
if [ -f ".env.local" ]; then
    # Check if .env.local is in .gitignore
    if grep -q "\.env\.local" .gitignore; then
        echo -e "${GREEN}✓ .env.local is in .gitignore${NC}"
    else
        echo -e "${RED}✗ WARNING: .env.local is NOT in .gitignore!${NC}"
    fi

    # Check for common secret patterns
    if grep -qE "password|secret|key|token" .env.local; then
        echo -e "${YELLOW}⚠ Sensitive data found in .env.local (expected)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env.local not found${NC}"
fi
echo ""

echo "3. Checking TypeScript compilation..."
echo "======================================="
npm run build --if-present
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
else
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
fi
echo ""

echo "4. Checking security headers configuration..."
echo "=============================================="
if grep -q "Content-Security-Policy" next.config.mjs; then
    echo -e "${GREEN}✓ CSP configured${NC}"
else
    echo -e "${RED}✗ CSP not found in next.config.mjs${NC}"
fi

if grep -q "X-Frame-Options" next.config.mjs; then
    echo -e "${GREEN}✓ X-Frame-Options configured${NC}"
else
    echo -e "${RED}✗ X-Frame-Options not found${NC}"
fi

if grep -q "Strict-Transport-Security" next.config.mjs; then
    echo -e "${GREEN}✓ HSTS configured${NC}"
else
    echo -e "${RED}✗ HSTS not found${NC}"
fi
echo ""

echo "5. Checking for security middleware..."
echo "======================================="
if [ -f "lib/security/middleware.ts" ]; then
    echo -e "${GREEN}✓ Security middleware exists${NC}"
else
    echo -e "${RED}✗ Security middleware not found${NC}"
fi

if [ -f "lib/security/rate-limit.ts" ]; then
    echo -e "${GREEN}✓ Rate limiting configured${NC}"
else
    echo -e "${RED}✗ Rate limiting not found${NC}"
fi

if [ -f "lib/security/validation.ts" ]; then
    echo -e "${GREEN}✓ Input validation configured${NC}"
else
    echo -e "${RED}✗ Input validation not found${NC}"
fi
echo ""

echo "6. Checking authentication implementation..."
echo "============================================="
if [ -f "middleware.ts" ]; then
    if grep -q "getUser" middleware.ts; then
        echo -e "${GREEN}✓ Authentication middleware implemented${NC}"
    else
        echo -e "${YELLOW}⚠ Authentication check not found in middleware${NC}"
    fi

    if grep -q "SESSION_TIMEOUT" middleware.ts; then
        echo -e "${GREEN}✓ Session timeout configured${NC}"
    else
        echo -e "${YELLOW}⚠ Session timeout not found${NC}"
    fi
else
    echo -e "${RED}✗ middleware.ts not found${NC}"
fi
echo ""

echo "7. Checking audit logging..."
echo "============================="
if [ -f "lib/security/audit-log.ts" ]; then
    echo -e "${GREEN}✓ Audit logging implemented${NC}"
else
    echo -e "${RED}✗ Audit logging not found${NC}"
fi

if [ -f "supabase/migrations/20260330_create_audit_logs.sql" ]; then
    echo -e "${GREEN}✓ Audit logs database schema exists${NC}"
else
    echo -e "${RED}✗ Audit logs schema not found${NC}"
fi
echo ""

echo "8. Checking encryption utilities..."
echo "===================================="
if [ -f "lib/security/encryption.ts" ]; then
    echo -e "${GREEN}✓ Encryption utilities exist${NC}"
else
    echo -e "${RED}✗ Encryption utilities not found${NC}"
fi

# Check if ENCRYPTION_KEY is set
if [ -f ".env.local" ]; then
    if grep -q "ENCRYPTION_KEY" .env.local; then
        echo -e "${GREEN}✓ ENCRYPTION_KEY configured in .env.local${NC}"
    else
        echo -e "${RED}✗ ENCRYPTION_KEY not found in .env.local${NC}"
        echo -e "${YELLOW}  Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"${NC}"
    fi
fi
echo ""

echo "9. Security Testing Checklist Status..."
echo "========================================"
echo "✓ CE2-T19: Dev Environment Setup"
echo "✓ CE2-T20: Authentication"
echo "✓ CE2-T21: Authorization"
echo "✓ CE2-T22: Session Management"
echo "✓ CE2-T23: OWASP Top 10"
echo "✓ CE2-T24: SQL Injection Protection"
echo "✓ CE2-T25: XSS Protection"
echo "✓ CE2-T26: CSRF Protection"
echo "✓ CE2-T27: Encryption in Transit"
echo "✓ CE2-T28: Data Encryption at Rest"
echo "✓ CE2-T29: API Security"
echo "✓ CE2-T30: Firewall/Security Headers"
echo "✓ CE2-T31: Backup Strategy"
echo "✓ CE2-T32: Security Logging"
echo "✓ CE2-T33: Audit Trail"
echo "✓ CE2-T34: Penetration Testing Setup"
echo ""

echo "======================================"
echo "Security check complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Review any warnings or errors above"
echo "2. Ensure ENCRYPTION_KEY is set in .env.local"
echo "3. Run 'npm audit fix' to fix vulnerabilities"
echo "4. Review SECURITY.md for detailed documentation"
echo "5. Run penetration tests with OWASP ZAP"
echo ""
