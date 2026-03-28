/**
 * Common Zod validation schemas and helpers.
 *
 * Centralising schemas here means route handlers stay lean and the same
 * validation rules are never duplicated across endpoints.
 */

import { z, type ZodSchema } from 'zod'

// ---------------------------------------------------------------------------
// Reusable primitive schemas
// ---------------------------------------------------------------------------

/** Validates a UUID v4 string. */
export const uuidSchema = z.string().uuid()

/**
 * Cursor-based pagination query parameters.
 * `limit` is coerced from string (query params arrive as strings).
 * `cursor` is the opaque cursor string from a previous response.
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(25),
  cursor: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Password policy
// ---------------------------------------------------------------------------

/**
 * Shared password validation rule.
 * Minimum 12 characters, at least one uppercase letter, one lowercase letter,
 * and one digit. No maximum length — argon2 handles arbitrarily long inputs safely.
 */
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

/** POST /auth/login request body. */
export const loginSchema = z.object({
  email: z.string().email('A valid email address is required.'),
  password: z.string().min(1, 'Password is required.'),
})

/**
 * POST /auth/setup request body.
 * Used for first-time setup — creates the company and initial board user.
 */
export const setupSchema = z.object({
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters.')
    .max(255, 'Company name must not exceed 255 characters.'),
  email: z.string().email('A valid email address is required.'),
  password: passwordSchema,
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters.')
    .max(255, 'Display name must not exceed 255 characters.'),
})

/** POST /auth/refresh request body. */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
})

/** POST /auth/logout request body. */
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type LoginBody = z.infer<typeof loginSchema>
export type SetupBody = z.infer<typeof setupSchema>
export type RefreshBody = z.infer<typeof refreshSchema>
export type LogoutBody = z.infer<typeof logoutSchema>
export type PaginationQuery = z.infer<typeof paginationSchema>

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * A Fastify-compatible error shape that the global error handler in index.ts
 * will pick up and return as a structured 400 response.
 */
class ValidationError extends Error {
  statusCode: number
  code: string
  details: unknown

  constructor(details: unknown) {
    super('Request validation failed.')
    this.name = 'ValidationError'
    this.statusCode = 400
    this.code = 'VALIDATION_ERROR'
    this.details = details
  }
}

/**
 * Parse `body` against the given Zod schema.
 *
 * On success returns the typed, parsed value.
 * On failure throws a Fastify-compatible 400 error that includes the flattened
 * Zod field errors in the `details` property so clients can map them to form fields.
 */
export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (result.success) {
    return result.data
  }
  throw new ValidationError(result.error.flatten())
}
