/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

export interface RateLimitConfig {
  interval?: number // Time window in milliseconds
  uniqueTokenPerInterval?: number // Max requests per interval
}

interface RateLimitStore {
  [key: string]: number[]
}

const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  interval: 60 * 1000,        // 1 minute
  uniqueTokenPerInterval: 10, // 10 requests per minute
}

const rateLimitStore: RateLimitStore = {}

/**
 * Rate limiter function
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns boolean - true if rate limit exceeded
 */
export function rateLimit(
  identifier: string,
  config?: RateLimitConfig
): boolean {
  const interval = config?.interval ?? DEFAULT_CONFIG.interval
  const uniqueTokenPerInterval = config?.uniqueTokenPerInterval ?? DEFAULT_CONFIG.uniqueTokenPerInterval

  const now = Date.now()
  const windowStart = now - interval

  // Initialize or get existing timestamps for this identifier
  if (!rateLimitStore[identifier]) {
    rateLimitStore[identifier] = []
  }

  // Remove old timestamps outside the current window
  rateLimitStore[identifier] = rateLimitStore[identifier].filter(
    (timestamp) => timestamp > windowStart
  )

  // Check if rate limit is exceeded
  if (rateLimitStore[identifier].length >= uniqueTokenPerInterval) {
    return true // Rate limit exceeded
  }

  // Add current timestamp
  rateLimitStore[identifier].push(now)

  return false // Within rate limit
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  return (
    forwarded?.split(',')[0].trim() ||
    realIp ||
    cfConnectingIp ||
    'unknown'
  )
}

/**
 * Clean up old entries periodically to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now()
  const maxAge = 60 * 60 * 1000 // 1 hour

  Object.keys(rateLimitStore).forEach((key) => {
    if (
      rateLimitStore[key].length === 0 ||
      rateLimitStore[key][rateLimitStore[key].length - 1] < now - maxAge
    ) {
      delete rateLimitStore[key]
    }
  })
}, 5 * 60 * 1000) // Run every 5 minutes