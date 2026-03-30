/**
 * Login Attempt Tracking and Brute Force Protection
 * Prevents brute force attacks by limiting login attempts
 */

interface LoginAttempt {
  attempts: number
  lockedUntil: number | null
  lastAttempt: number
}

// In-memory store for login attempts
// In production, consider using Redis or database for persistence across server restarts
const loginAttempts = new Map<string, LoginAttempt>()

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes in milliseconds
const ATTEMPT_WINDOW = 15 * 60 * 1000 // 15 minutes - reset counter if no attempts in this time

/**
 * Check if an identifier (email/IP) is currently locked out
 */
export function isLockedOut(identifier: string): { locked: boolean; remainingTime?: number } {
  const attempt = loginAttempts.get(identifier)

  if (!attempt) {
    return { locked: false }
  }

  const now = Date.now()

  // Check if lockout period has expired
  if (attempt.lockedUntil && attempt.lockedUntil > now) {
    const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000 / 60) // minutes
    return { locked: true, remainingTime }
  }

  // Lockout expired, reset
  if (attempt.lockedUntil && attempt.lockedUntil <= now) {
    loginAttempts.delete(identifier)
    return { locked: false }
  }

  // Check if attempt window has expired (no attempts in 15 minutes)
  if (now - attempt.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.delete(identifier)
    return { locked: false }
  }

  return { locked: false }
}

/**
 * Record a failed login attempt
 * Returns whether the account is now locked
 */
export function recordFailedAttempt(identifier: string): { locked: boolean; attemptsRemaining: number; lockoutMinutes?: number } {
  const now = Date.now()
  const attempt = loginAttempts.get(identifier)

  if (!attempt) {
    // First failed attempt
    loginAttempts.set(identifier, {
      attempts: 1,
      lockedUntil: null,
      lastAttempt: now,
    })
    return { locked: false, attemptsRemaining: MAX_ATTEMPTS - 1 }
  }

  // Increment attempts
  attempt.attempts += 1
  attempt.lastAttempt = now

  // Check if max attempts reached
  if (attempt.attempts >= MAX_ATTEMPTS) {
    attempt.lockedUntil = now + LOCKOUT_DURATION
    loginAttempts.set(identifier, attempt)
    return {
      locked: true,
      attemptsRemaining: 0,
      lockoutMinutes: LOCKOUT_DURATION / 1000 / 60
    }
  }

  loginAttempts.set(identifier, attempt)
  return {
    locked: false,
    attemptsRemaining: MAX_ATTEMPTS - attempt.attempts
  }
}

/**
 * Reset login attempts for an identifier (called on successful login)
 */
export function resetAttempts(identifier: string): void {
  loginAttempts.delete(identifier)
}

/**
 * Get current attempt count for an identifier
 */
export function getAttemptCount(identifier: string): number {
  const attempt = loginAttempts.get(identifier)
  return attempt?.attempts || 0
}

/**
 * Get all login attempts (for admin monitoring/reporting)
 * Note: Data persists in memory until server restart
 */
export function getAllAttempts(): Map<string, LoginAttempt> {
  return new Map(loginAttempts)
}

/**
 * Manual cleanup function - only call if needed
 * This is NOT run automatically to preserve audit data
 */
export function cleanupExpiredLockouts(): number {
  const now = Date.now()
  let cleaned = 0

  loginAttempts.forEach((attempt, key) => {
    // Only remove entries where lockout has expired (not just old attempts)
    if (attempt.lockedUntil && attempt.lockedUntil < now) {
      loginAttempts.delete(key)
      cleaned++
    }
  })

  return cleaned
}
