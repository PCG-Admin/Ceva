/**
 * Encryption Utilities
 * Provides encryption/decryption for sensitive data at rest
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16

/**
 * Get encryption key from environment
 * In production, this should come from a secure key management service
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  return key
}

/**
 * Derive key from password using scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
}

/**
 * Encrypt data
 * @param plaintext - Data to encrypt
 * @returns Encrypted data with salt, iv, and auth tag
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const password = getEncryptionKey()
    const salt = randomBytes(SALT_LENGTH)
    const key = await deriveKey(password, salt)
    const iv = randomBytes(IV_LENGTH)

    const cipher = createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Combine salt, iv, authTag, and encrypted data
    const result = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ])

    return result.toString('base64')
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data
 * @param encryptedData - Encrypted data with salt, iv, and auth tag
 * @returns Decrypted plaintext
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const password = getEncryptionKey()
    const buffer = Buffer.from(encryptedData, 'base64')

    // Extract components
    const salt = buffer.subarray(0, SALT_LENGTH)
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const authTag = buffer.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    )
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    const key = await deriveKey(password, salt)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Hash sensitive data (one-way)
 * Use for data that doesn't need to be decrypted (e.g., API keys for comparison)
 */
export async function hash(data: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await deriveKey(data, salt)

  return Buffer.concat([salt, key]).toString('base64')
}

/**
 * Verify hashed data
 */
export async function verifyHash(data: string, hashedData: string): Promise<boolean> {
  try {
    const buffer = Buffer.from(hashedData, 'base64')
    const salt = buffer.subarray(0, SALT_LENGTH)
    const storedKey = buffer.subarray(SALT_LENGTH)

    const key = await deriveKey(data, salt)

    return timingSafeEqual(key, storedKey)
  } catch (error) {
    return false
  }
}

/**
 * Timing-safe buffer comparison
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }

  return result === 0
}

/**
 * Generate secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}
