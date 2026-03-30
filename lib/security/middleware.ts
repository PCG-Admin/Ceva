/**
 * Security Middleware
 * Combines all security checks into reusable middleware functions
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIdentifier } from './rate-limit'
import { detectSqlInjection, validateRequestSize } from './validation'
import { logSecurityViolation, logApiViolation } from './audit-log'

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  config?: { interval?: number; uniqueTokenPerInterval?: number }
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request)
  const isLimited = rateLimit(identifier, config)

  if (isLimited) {
    await logApiViolation(
      'api.rate_limit_exceeded',
      request,
      request.nextUrl.pathname,
      undefined,
      { identifier }
    )

    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    )
  }

  return null
}

/**
 * SQL injection detection middleware
 * Clones the request body so the original stream remains intact for the handler.
 */
export async function sqlInjectionMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  try {
    // Check URL parameters
    const searchParams = request.nextUrl.searchParams
    for (const [key, value] of searchParams.entries()) {
      if (detectSqlInjection(value)) {
        await logSecurityViolation(
          'security.sql_injection_attempt',
          request,
          undefined,
          { parameter: key, value }
        )

        return NextResponse.json(
          { error: 'Invalid request parameters' },
          { status: 400 }
        )
      }
    }

    // Check request body for POST/PUT/PATCH — clone first so the body stream
    // is not consumed before the actual route handler reads it.
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const cloned = request.clone()
        const body = await cloned.json()
        const bodyStr = JSON.stringify(body)

        if (detectSqlInjection(bodyStr)) {
          await logSecurityViolation(
            'security.sql_injection_attempt',
            request,
            undefined,
            { body: 'redacted' }
          )

          return NextResponse.json(
            { error: 'Invalid request data' },
            { status: 400 }
          )
        }
      } catch {
        // If body is not JSON, skip check
      }
    }
  } catch (error) {
    console.error('SQL injection middleware error:', error)
  }

  return null
}

/**
 * Request size validation middleware (prevent DOS)
 * Clones the request body so the original stream remains intact for the handler.
 */
export async function requestSizeMiddleware(
  request: NextRequest,
  maxSizeKB: number = 1024
): Promise<NextResponse | null> {
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const cloned = request.clone()
      const body = await cloned.json()

      if (!validateRequestSize(body, maxSizeKB)) {
        await logSecurityViolation(
          'security.suspicious_activity',
          request,
          undefined,
          { reason: 'Request size exceeded limit' }
        )

        return NextResponse.json(
          { error: 'Request payload too large' },
          { status: 413 }
        )
      }
    } catch {
      // If body is not JSON, skip check
    }
  }

  return null
}

/**
 * Combine all security middleware
 */
export async function securityMiddleware(
  request: NextRequest,
  config?: {
    rateLimit?: { interval?: number; uniqueTokenPerInterval?: number }
    maxRequestSizeKB?: number
  }
): Promise<NextResponse | null> {
  const rateLimitResponse = await rateLimitMiddleware(request, config?.rateLimit)
  if (rateLimitResponse) return rateLimitResponse

  const sqlInjectionResponse = await sqlInjectionMiddleware(request)
  if (sqlInjectionResponse) return sqlInjectionResponse

  const requestSizeResponse = await requestSizeMiddleware(
    request,
    config?.maxRequestSizeKB
  )
  if (requestSizeResponse) return requestSizeResponse

  return null
}

/**
 * API route wrapper with security checks
 */
export function withSecurity<T>(
  handler: (request: NextRequest, context?: T) => Promise<NextResponse>,
  config?: {
    rateLimit?: { interval?: number; uniqueTokenPerInterval?: number }
    maxRequestSizeKB?: number
  }
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    const securityResponse = await securityMiddleware(request, config)
    if (securityResponse) return securityResponse

    try {
      return await handler(request, context)
    } catch (error) {
      console.error('API handler error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}