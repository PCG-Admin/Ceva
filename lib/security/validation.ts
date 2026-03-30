/**
 * Input Validation and Sanitization
 * Protects against SQL Injection, XSS, and other injection attacks
 */

import { z } from 'zod'

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim()
}

/**
 * Sanitize HTML by encoding special characters
 */
export function escapeHtml(input: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return input.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Validate email format
 */
export const emailSchema = z.string().email().min(5).max(255)

/**
 * Validate password strength
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character'
  )

/**
 * Validate phone number
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()

/**
 * Validate UUID
 */
export const uuidSchema = z.string().uuid()

/**
 * User creation schema with security validations
 */
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(2).max(100),
  phone: phoneSchema,
  role: z.enum(['admin', 'dispatcher', 'transporter', 'client', 'driver']),
})

/**
 * User update schema
 */
export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  full_name: z.string().min(2).max(100).optional(),
  phone: phoneSchema,
  role: z.enum(['admin', 'dispatcher', 'transporter', 'client', 'driver']).optional(),
})

/**
 * Validate and sanitize object
 */
export function validateAndSanitize<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      }
    }
    return { success: false, error: 'Validation failed' }
  }
}

/**
 * SQL Injection Prevention - Check for suspicious patterns
 */
export function detectSqlInjection(input: string): boolean {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|\*\/|\/\*)/g, // SQL comments
    /('|('')|;|\\x|\\u)/g, // SQL special characters
    /(\bOR\b|\bAND\b).*?=.*?=/gi, // OR/AND with comparisons
  ]

  return sqlInjectionPatterns.some((pattern) => pattern.test(input))
}

/**
 * Path traversal prevention
 */
export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '') // Remove ..
    .replace(/\/\//g, '/') // Remove double slashes
    .replace(/[^a-zA-Z0-9\-_\/\.]/g, '') // Allow only safe characters
}

/**
 * Validate API request body size (prevent DOS attacks)
 */
export function validateRequestSize(
  body: unknown,
  maxSizeKB: number = 1024
): boolean {
  const bodySize = JSON.stringify(body).length / 1024 // Size in KB
  return bodySize <= maxSizeKB
}
