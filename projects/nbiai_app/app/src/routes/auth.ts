/**
 * Authentication routes.
 *
 * POST /api/v1/auth/login     — email/password login, returns JWT + refresh token
 * POST /api/v1/auth/refresh   — refresh token rotation, returns new JWT pair
 * POST /api/v1/auth/logout    — revokes the refresh token
 *
 * Password hashing: Argon2id (CEO binding decision; bcrypt was rejected).
 * Refresh token storage: SHA-256 hash only, raw token never persisted (CTO spec).
 * Rate limit on login: 5 attempts per email per 15 minutes.
 *
 * TODO: implement
 */

import type { FastifyInstance } from 'fastify'

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: implement POST /api/v1/auth/login
  // TODO: implement POST /api/v1/auth/refresh
  // TODO: implement POST /api/v1/auth/logout
}
