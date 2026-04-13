/**
 * User management routes.
 *
 * Registered at /api/v1 (prefix applied in index.ts).
 *
 * Routes:
 *   GET  /users        — list users for the company (board and admin)
 *   POST /users        — create a new user (board only)
 *   PATCH /users/:id   — update user role or display name (board only)
 *   DELETE /users/:id  — deactivate a user (board only)
 *
 * Note: equivalent user management routes also exist under /settings/users
 * (settingsRoutes). These routes expose the same capabilities at the
 * canonical /api/v1/users path defined in the architecture document (section 2.2).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { requireRole } from '../middleware/auth.js'
import { BOARD_ONLY, BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody } from '../lib/validate.js'
import { hashPassword } from '../lib/crypto.js'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(255),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  role: z.enum(['admin', 'viewer']),
})

const updateUserSchema = z.object({
  role: z.enum(['admin', 'viewer']).optional(),
  displayName: z.string().min(2).max(255).optional(),
})

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /users
  // -------------------------------------------------------------------------
  fastify.get(
    '/users',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          isActive: users.isActive,
          avatarUrl: users.avatarUrl,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.companyId, companyId))

      return reply.send({ data: rows })
    },
  )

  // -------------------------------------------------------------------------
  // POST /users
  // -------------------------------------------------------------------------
  fastify.post(
    '/users',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId
      const body = validateBody(createUserSchema, request.body)

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.email.toLowerCase()))
        .limit(1)

      if (existing) {
        return reply.status(409).send({
          error: { code: 'CONFLICT', message: 'A user with that email address already exists.' },
        })
      }

      const passwordHash = await hashPassword(body.password)

      const [created] = await db
        .insert(users)
        .values({
          companyId,
          email: body.email.toLowerCase(),
          passwordHash,
          displayName: body.displayName,
          role: body.role,
          isActive: true,
        })
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          isActive: users.isActive,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        })

      return reply.status(201).send({ data: created })
    },
  )

  // -------------------------------------------------------------------------
  // PATCH /users/:id
  // -------------------------------------------------------------------------
  fastify.patch(
    '/users/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId
      const body = validateBody(updateUserSchema, request.body)

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), eq(users.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found.' },
        })
      }

      const updateData: Record<string, unknown> = {}
      if (body.role !== undefined) updateData.role = body.role
      if (body.displayName !== undefined) updateData.displayName = body.displayName

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(and(eq(users.id, id), eq(users.companyId, companyId)))
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          isActive: users.isActive,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        })

      return reply.send({ data: updated })
    },
  )

  // -------------------------------------------------------------------------
  // DELETE /users/:id
  // -------------------------------------------------------------------------
  fastify.delete(
    '/users/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId

      // Prevent self-deletion
      if (id === request.user.sub) {
        return reply.status(400).send({
          error: { code: 'INVALID_OPERATION', message: 'You cannot deactivate your own account.' },
        })
      }

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), eq(users.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found.' },
        })
      }

      await db
        .update(users)
        .set({ isActive: false })
        .where(and(eq(users.id, id), eq(users.companyId, companyId)))

      return reply.status(204).send()
    },
  )
}
