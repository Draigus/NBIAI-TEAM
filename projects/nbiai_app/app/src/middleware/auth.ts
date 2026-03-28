/**
 * Authentication middleware for Fastify.
 *
 * Exports two preHandler hooks:
 *
 *   requireAuth       — verifies the JWT Bearer token and attaches the decoded
 *                       payload to request.user. Returns 401 if missing or invalid.
 *
 *   requireRole(roles) — composes requireAuth, then checks request.user.role is
 *                        in the allowed set. Returns 403 if not.
 *
 * The FastifyJWT interface is augmented here so request.user is typed as
 * JwtPayload everywhere without casting.
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtPayload } from '../types/index.js'

// ---------------------------------------------------------------------------
// FastifyJWT module augmentation
// ---------------------------------------------------------------------------

/**
 * Extend @fastify/jwt's FastifyJWT interface to declare our JwtPayload type.
 * This flows through to FastifyRequest.user automatically.
 * See: https://github.com/fastify/fastify-jwt#typescript
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------

/**
 * Async Fastify preHandler that validates the Authorization: Bearer <token> header.
 *
 * On success: attaches the decoded payload to request.user and returns.
 * On failure: replies with 401 UNAUTHORIZED and returns without continuing.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Provide a Bearer token in the Authorization header.',
      },
    })
  }

  const token = authHeader.slice(7) // strip "Bearer "

  try {
    // @fastify/jwt attaches .jwt to the Fastify instance.
    // jwtVerify is available on the request directly via the plugin.
    await request.jwtVerify()
  } catch {
    // jwtVerify populates request.user on success; on failure we return 401
    // We also catch in case the token parsing threw before verify
    void token // suppress unused-var lint; token is used above via jwtVerify reading the header
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token.',
      },
    })
  }
}

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------

/**
 * Factory that returns a Fastify async preHandler requiring the authenticated
 * user to hold one of the specified roles.
 *
 * Internally calls requireAuth first, so routes only need to declare
 * requireRole — they do not need to also declare requireAuth separately.
 *
 * @param roles - Array of allowed role strings (e.g. ['board', 'admin'])
 *
 * @example
 *   fastify.post('/admin/thing', {
 *     preHandler: requireRole(['board', 'admin']),
 *   }, handler)
 */
export function requireRole(
  roles: string[],
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Run auth check first
    await requireAuth(request, reply)

    // If requireAuth already sent a response, abort
    if (reply.sent) return

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      })
    }
  }
}
