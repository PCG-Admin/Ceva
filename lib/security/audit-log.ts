/**
 * Security Audit Logging
 * Comprehensive logging system for security events and user actions
 */

import { createClient } from '@/lib/supabase/server'

export type AuditEventType =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'auth.password_change'
  | 'auth.password_reset'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.role_change'
  | 'data.create'
  | 'data.read'
  | 'data.update'
  | 'data.delete'
  | 'api.rate_limit_exceeded'
  | 'api.unauthorized_access'
  | 'api.forbidden_access'
  | 'security.csrf_violation'
  | 'security.sql_injection_attempt'
  | 'security.xss_attempt'
  | 'security.suspicious_activity'
  | 'system.error'

export interface AuditLogEntry {
  event_type: AuditEventType
  user_id?: string
  user_email?: string
  ip_address?: string
  user_agent?: string
  resource?: string
  action?: string
  details?: Record<string, unknown>
  severity: 'low' | 'medium' | 'high' | 'critical'
  success: boolean
}

/**
 * Log security audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.from('audit_logs').insert({
      event_type: entry.event_type,
      user_id: entry.user_id,
      user_email: entry.user_email,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      resource: entry.resource,
      action: entry.action,
      details: entry.details,
      severity: entry.severity,
      success: entry.success,
      created_at: new Date().toISOString(),
    })

    // For critical events, also log to console/external monitoring
    if (entry.severity === 'critical') {
      console.error('[CRITICAL SECURITY EVENT]', {
        event_type: entry.event_type,
        user_id: entry.user_id,
        ip_address: entry.ip_address,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    // Failsafe: Always log to console if database logging fails
    console.error('[AUDIT LOG ERROR]', error)
    console.error('[AUDIT EVENT]', entry)
  }
}

/**
 * Get request metadata for audit logging
 */
export function getRequestMetadata(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  return {
    ip_address:
      forwarded?.split(',')[0].trim() ||
      realIp ||
      cfConnectingIp ||
      'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
  }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  type: Extract<AuditEventType, `auth.${string}`>,
  userId?: string,
  email?: string,
  request?: Request,
  success: boolean = true,
  details?: Record<string, unknown>
): Promise<void> {
  const metadata = request ? getRequestMetadata(request) : {}

  await logAuditEvent({
    event_type: type,
    user_id: userId,
    user_email: email,
    ...metadata,
    severity: success ? 'low' : 'medium',
    success,
    details,
  })
}

/**
 * Log user management events
 */
export async function logUserEvent(
  type: Extract<AuditEventType, `user.${string}`>,
  actorId: string,
  targetUserId: string,
  request?: Request,
  details?: Record<string, unknown>
): Promise<void> {
  const metadata = request ? getRequestMetadata(request) : {}

  await logAuditEvent({
    event_type: type,
    user_id: actorId,
    resource: `user:${targetUserId}`,
    ...metadata,
    severity: type === 'user.delete' || type === 'user.role_change' ? 'high' : 'medium',
    success: true,
    details,
  })
}

/**
 * Log data access events (for sensitive data)
 */
export async function logDataEvent(
  type: Extract<AuditEventType, `data.${string}`>,
  userId: string,
  resource: string,
  action: string,
  request?: Request,
  success: boolean = true,
  details?: Record<string, unknown>
): Promise<void> {
  const metadata = request ? getRequestMetadata(request) : {}

  await logAuditEvent({
    event_type: type,
    user_id: userId,
    resource,
    action,
    ...metadata,
    severity: 'low',
    success,
    details,
  })
}

/**
 * Log security violations
 */
export async function logSecurityViolation(
  type: Extract<AuditEventType, `security.${string}`>,
  request: Request,
  userId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const metadata = getRequestMetadata(request)

  await logAuditEvent({
    event_type: type,
    user_id: userId,
    ...metadata,
    severity: 'critical',
    success: false,
    details,
  })
}

/**
 * Log API access violations
 */
export async function logApiViolation(
  type: Extract<AuditEventType, `api.${string}`>,
  request: Request,
  resource: string,
  userId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const metadata = getRequestMetadata(request)

  await logAuditEvent({
    event_type: type,
    user_id: userId,
    resource,
    ...metadata,
    severity: type === 'api.rate_limit_exceeded' ? 'medium' : 'high',
    success: false,
    details,
  })
}
