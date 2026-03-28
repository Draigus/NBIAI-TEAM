/**
 * Cryptographic utility functions.
 *
 * Centralises all crypto operations so algorithm choices are enforced in one
 * place and are easy to audit or rotate:
 *   - Password hashing: Argon2id (CEO binding decision)
 *   - Refresh token generation: crypto.randomBytes(64) hex
 *   - Refresh token storage: SHA-256 hash only, raw token never persisted
 *   - API key encryption: AES-256-GCM with IV + auth tag prepended
 */

import crypto from 'crypto'
import * as argon2 from 'argon2'

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

/**
 * Hash a plaintext password with Argon2id.
 *
 * Parameters chosen for a server-side context (not embedded/IoT):
 *   memoryCost: 64 MiB — balances security vs. server RAM under load
 *   timeCost: 3 iterations
 *   parallelism: 4 threads
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 4,
  })
}

/**
 * Verify a plaintext password against an Argon2id hash.
 * Returns true if the password matches, false otherwise.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

// ---------------------------------------------------------------------------
// Refresh token helpers
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random refresh token.
 * Returns 128 hex characters (64 bytes of entropy).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

/**
 * Hash a refresh token with SHA-256 for safe storage.
 * The raw token is issued to the client; only the hash is stored in the DB.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ---------------------------------------------------------------------------
// API key encryption (AES-256-GCM)
// ---------------------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12    // 96-bit IV is the GCM recommendation
const TAG_LENGTH = 16   // 128-bit auth tag

/**
 * Encrypt an API key using AES-256-GCM.
 *
 * The key is read from the API_KEY_ENCRYPTION_KEY environment variable.
 * It must be a 64-character hex string (32 bytes).
 *
 * Returns a base64-encoded string in the format:
 *   iv:authTag:ciphertext
 * where all three components are hex-encoded before being base64-encoded together.
 */
export function encryptApiKey(key: string): string {
  const encryptionKey = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Encode as hex components joined with colons, then base64 the whole string
  const payload = [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')

  return Buffer.from(payload).toString('base64')
}

/**
 * Decrypt an AES-256-GCM encrypted API key.
 * Reverses encryptApiKey; throws if the ciphertext is tampered.
 */
export function decryptApiKey(encrypted: string): string {
  const encryptionKey = getEncryptionKey()
  const payload = Buffer.from(encrypted, 'base64').toString('utf8')
  const parts = payload.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted API key format.')
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const keyHex = process.env.API_KEY_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'API_KEY_ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes).',
    )
  }
  return Buffer.from(keyHex, 'hex')
}
