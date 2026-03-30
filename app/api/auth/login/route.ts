import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isLockedOut, recordFailedAttempt, resetAttempts } from '@/lib/security/login-attempts'
import { logSecurityViolation, logUserEvent } from '@/lib/security/audit-log'
import { getClientIdentifier } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create identifier from email + IP for tracking
    const clientIp = getClientIdentifier(request)
    const identifier = `${email}:${clientIp}`

    // Check if account is locked out
    const lockoutStatus = isLockedOut(identifier)
    if (lockoutStatus.locked) {
      await logSecurityViolation(
        'security.login_attempt_while_locked',
        request,
        undefined,
        { email, remainingTime: lockoutStatus.remainingTime }
      )

      return NextResponse.json(
        {
          error: `Too many failed login attempts. Account locked for ${lockoutStatus.remainingTime} more minutes.`,
          locked: true,
          remainingMinutes: lockoutStatus.remainingTime
        },
        { status: 429 }
      )
    }

    // Attempt login with Supabase
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Record failed attempt
      const result = recordFailedAttempt(identifier)

      await logSecurityViolation(
        'security.failed_login_attempt',
        request,
        undefined,
        {
          email,
          attemptsRemaining: result.attemptsRemaining,
          locked: result.locked,
          reason: error.message
        }
      )

      if (result.locked) {
        return NextResponse.json(
          {
            error: `Too many failed login attempts. Account locked for ${result.lockoutMinutes} minutes.`,
            locked: true,
            lockoutMinutes: result.lockoutMinutes
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        {
          error: error.message,
          attemptsRemaining: result.attemptsRemaining
        },
        { status: 401 }
      )
    }

    // Successful login - reset attempts
    resetAttempts(identifier)

    await logUserEvent(
      'user.login_success',
      data.user.id,
      data.user.id,
      request,
      { email }
    )

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    })

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
