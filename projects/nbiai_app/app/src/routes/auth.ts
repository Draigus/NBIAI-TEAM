/**
 * Authentication routes.
 *
 * Registered at /api/v1/auth (prefix applied in index.ts).
 * The auth prefix also applies a tighter rate limit: 10 requests per minute.
 *
 * Routes:
 *   POST /login    — email/password login, issues JWT + refresh token
 *   POST /refresh  — rotate refresh token, issue new JWT + refresh token
 *   POST /logout   — revoke refresh token (requires JWT auth)
 *   GET  /me       — return current user from DB (requires JWT auth)
 *   POST /setup    — first-time setup: create company + board user
 *
 * Security decisions (binding, per CEO/CTO review):
 *   - Passwords: Argon2id (see lib/crypto.ts)
 *   - Refresh tokens: SHA-256 hashed before storage; raw token never persisted
 *   - Token rotation: each /refresh call invalidates the old session and
 *     creates a new one. Presenting a used token revokes all sessions for that
 *     user (replay detection — not yet implemented here; logged for future).
 *   - JWT access token TTL: 15 minutes
 *   - Refresh token TTL: 30 days
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, gt, and, count } from 'drizzle-orm'

import { db } from '../db/index.js'
import { companies, users, sessions } from '../db/schema.js'
import type { SelectUser } from '../types/index.js'
import { requireAuth } from '../middleware/auth.js'
import {
  hashPassword,
  verifyPassword,
  generateRefreshToken,
  hashRefreshToken,
} from '../lib/crypto.js'
import {
  validateBody,
  loginSchema,
  setupSchema,
} from '../lib/validate.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JwtPayloadInput {
  sub: string
  email: string
  role: SelectUser['role']
  companyId: string
}

interface AuthResponse {
  accessToken: string
  user: {
    id: string
    email: string
    displayName: string
    role: SelectUser['role']
    avatarUrl: string | null
  }
}

// Cookie scope: refresh token only travels to /api/v1/auth/*. httpOnly keeps
// JS from touching it; sameSite=lax covers the top-level navigation case for
// same-site deployments (Vite proxy in dev, @fastify/static in prod). `secure`
// is set in production so browsers refuse to send the cookie over http.
const REFRESH_COOKIE_NAME = 'refreshToken'
const REFRESH_COOKIE_PATH = '/api/v1/auth'
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const REFRESH_TOKEN_TTL_DAYS = 30

/**
 * Issue a JWT access token and a new refresh token, store the session,
 * set the refresh token as an httpOnly cookie on `reply`, and return the
 * response body (access token + user). The raw refresh token never leaves
 * the server except inside the Set-Cookie header.
 */
async function issueTokens(
  fastify: FastifyInstance,
  user: SelectUser,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthResponse> {
  const payload: JwtPayloadInput = {
    sub: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  }

  // JWT access token — @fastify/jwt sign uses the options from plugin registration (15m TTL)
  const accessToken = fastify.jwt.sign(payload)

  // Refresh token — raw set as httpOnly cookie, hash stored in DB
  const rawRefreshToken = generateRefreshToken()
  const tokenHash = hashRefreshToken(rawRefreshToken)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)

  await db.insert(sessions).values({
    userId: user.id,
    refreshTokenHash: tokenHash,
    userAgent: request.headers['user-agent'] ?? null,
    ipAddress: request.ip,
    expiresAt,
  })

  reply.setCookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  })

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function authRoutes(fastify: FastifyInstance): Promise<void> {

  // -------------------------------------------------------------------------
  // POST /login
  // -------------------------------------------------------------------------

  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validateBody(loginSchema, request.body)

    // Look up user by email
    let user: SelectUser | undefined
    try {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email.toLowerCase()))
        .limit(1)
      user = rows[0]
    } catch (err) {
      fastify.log.error(err, 'DB error during login lookup')
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      })
    }

    // Always run the password verify to prevent timing attacks that reveal
    // whether an email address exists in the system.
    // The dummy hash is a valid bcrypt hash so compare() runs its full cost
    // path and does not short-circuit on format errors.
    const dummyHash =
      '$2a$12$ahm9B9ZGM6W6Da8VCZI6Des3x4qbapXT0WKHixHlmoFhhz30C8HNa'
    const passwordValid = user
      ? await verifyPassword(user.passwordHash, body.password)
      : await verifyPassword(dummyHash, body.password).catch(() => false)

    if (!user || !passwordValid || !user.isActive) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' },
      })
    }

    // Update last_login_at (best-effort; do not fail the login if this errors)
    db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id))
      .catch((err) => fastify.log.warn(err, 'Failed to update last_login_at'))

    const response = await issueTokens(fastify, user, request, reply)
    return reply.status(200).send(response)
  })

  // -------------------------------------------------------------------------
  // POST /refresh
  // -------------------------------------------------------------------------

  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawRefreshToken = request.cookies?.[REFRESH_COOKIE_NAME]
    if (!rawRefreshToken) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Missing refresh token.' },
      })
    }

    const tokenHash = hashRefreshToken(rawRefreshToken)
    const now = new Date()

    // Find a valid, non-expired, non-revoked session matching this hash
    let sessionRow: typeof sessions.$inferSelect | undefined
    let userRow: SelectUser | undefined

    try {
      const rows = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.refreshTokenHash, tokenHash),
            gt(sessions.expiresAt, now),
          ),
        )
        .limit(1)

      if (rows[0]) {
        sessionRow = rows[0].session
        userRow = rows[0].user
      }
    } catch (err) {
      fastify.log.error(err, 'DB error during token refresh lookup')
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      })
    }

    if (!sessionRow || !userRow) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token.' },
      })
    }

    // Check if session has been manually revoked
    if (sessionRow.revokedAt !== null) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Session has been revoked.' },
      })
    }

    // Token rotation: delete old session before issuing new tokens
    try {
      await db.delete(sessions).where(eq(sessions.id, sessionRow.id))
    } catch (err) {
      fastify.log.error(err, 'DB error deleting old session during rotation')
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      })
    }

    const response = await issueTokens(fastify, userRow, request, reply)
    return reply.status(200).send(response)
  })

  // -------------------------------------------------------------------------
  // POST /logout
  // -------------------------------------------------------------------------

  fastify.post(
    '/logout',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawRefreshToken = request.cookies?.[REFRESH_COOKIE_NAME]

      if (rawRefreshToken) {
        const tokenHash = hashRefreshToken(rawRefreshToken)
        try {
          await db.delete(sessions).where(
            and(
              eq(sessions.refreshTokenHash, tokenHash),
              eq(sessions.userId, request.user.sub),
            ),
          )
        } catch (err) {
          fastify.log.error(err, 'DB error during logout')
          // Still clear the cookie on the client even if DB delete failed —
          // the user's intent is to log out.
        }
      }

      reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH })
      return reply.status(204).send()
    },
  )

  // -------------------------------------------------------------------------
  // GET /me
  // -------------------------------------------------------------------------

  fastify.get(
    '/me',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let user: SelectUser | undefined

      try {
        const rows = await db
          .select()
          .from(users)
          .where(eq(users.id, request.user.sub))
          .limit(1)
        user = rows[0]
      } catch (err) {
        fastify.log.error(err, 'DB error fetching current user')
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
        })
      }

      if (!user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'User no longer exists.' },
        })
      }

      return reply.status(200).send({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        companyId: user.companyId,
        lastLoginAt: user.lastLoginAt ?? null,
      })
    },
  )

  // -------------------------------------------------------------------------
  // POST /setup
  // -------------------------------------------------------------------------

  /**
   * First-time setup endpoint.
   * Creates the company and the first board-level user.
   * Returns 403 if any users already exist (setup has already been completed).
   * No authentication required — this runs before any users exist.
   */
  fastify.post('/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check whether any users already exist
    let existingUserCount: number
    try {
      const result = await db.select({ value: count() }).from(users)
      existingUserCount = result[0]?.value ?? 0
    } catch (err) {
      fastify.log.error(err, 'DB error checking existing users during setup')
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      })
    }

    if (existingUserCount > 0) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Setup has already been completed. This endpoint is no longer available.',
        },
      })
    }

    const body = validateBody(setupSchema, request.body)

    // Generate a URL-safe slug from the company name
    const slug = body.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const passwordHash = await hashPassword(body.password)

    let newUser: SelectUser | undefined

    try {
      await db.transaction(async (tx) => {
        // Create company
        const companyRows = await tx
          .insert(companies)
          .values({
            name: body.companyName,
            slug,
            settings: {},
          })
          .returning()

        const company = companyRows[0]
        if (!company) throw new Error('Failed to create company.')

        // Create board user
        const userRows = await tx
          .insert(users)
          .values({
            companyId: company.id,
            email: body.email.toLowerCase(),
            passwordHash,
            displayName: body.displayName,
            role: 'board',
            isActive: true,
          })
          .returning()

        newUser = userRows[0]
        if (!newUser) throw new Error('Failed to create user.')
      })
    } catch (err) {
      fastify.log.error(err, 'DB error during setup')
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      })
    }

    if (!newUser) {
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      })
    }

    const response = await issueTokens(fastify, newUser, request, reply)
    return reply.status(201).send(response)
  })
}
