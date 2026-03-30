/**
 * CSRF Protection
 * Protects against Cross-Site Request Forgery attacks
 */

import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

const CSRF_TOKEN_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Set CSRF token in cookie
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateCsrfToken()
  const cookieStore = await cookies()

  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })

  return token
}

/**
 * Get CSRF token from cookie
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_TOKEN_NAME)?.value
}

/**
 * Verify CSRF token from request
 */
export async function verifyCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken)
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * CSRF middleware for API routes
 */
export async function csrfMiddleware(request: Request): Promise<Response | null> {
  // Skip CSRF check for GET, HEAD, OPTIONS requests (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null
  }

  const isValid = await verifyCsrfToken(request)

  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Invalid CSRF token' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return null
}

/**
 * Get CSRF token for client-side usage
 */
export function getCsrfTokenFromMeta(): string | null {
  if (typeof window === 'undefined') return null

  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute('content') || null
}
