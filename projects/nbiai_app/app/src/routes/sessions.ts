/**
 * Claude Desktop session management routes.
 *
 * POST   /api/v1/sessions         — create a new session record
 * GET    /api/v1/sessions         — list sessions with pagination
 * PATCH  /api/v1/sessions/:id     — update status, notes, completedAt
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, desc, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import { claudeDesktopSessions, agents, roles } from '../db/schema.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody, paginationSchema } from '../lib/validate.js'

// ---------------------------------------------------------------------------
// UUID format guard (BUG-QA-002)
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createSessionSchema = z.object({
  label: z.string().min(1).max(200),
  agentId: z.string().uuid().optional(),
  trigger: z.enum(['manual', 'scheduled']).default('manual'),
  scheduledFor: z.string().datetime().optional(),
})

const updateSessionSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
  notes: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
})

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

function encodeCursor(createdAt: Date | string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString('base64')
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function sessionRoutes(app: FastifyInstance) {
  // =========================================================================
  // POST /sessions — create a new session record
  // =========================================================================

  app.post(
    '/sessions',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = validateBody(createSessionSchema, request.body)
      const userId = request.user.sub

      // Validate agent if provided
      if (body.agentId) {
        const agentRows = await db
          .select({ id: agents.id })
          .from(agents)
          .where(eq(agents.id, body.agentId))
          .limit(1)

        if (agentRows.length === 0) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Agent not found.' },
          })
        }
      }

      const [session] = await db
        .insert(claudeDesktopSessions)
        .values({
          label: body.label,
          agentId: body.agentId ?? null,
          status: 'pending',
          trigger: body.trigger ?? 'manual',
          scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
          createdByUserId: userId,
        })
        .returning()

      return reply.status(201).send({ data: session })
    },
  )

  // =========================================================================
  // GET /sessions — list sessions with pagination
  // =========================================================================

  app.get(
    '/sessions',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = paginationSchema.parse(request.query)
      const { limit, cursor } = query

      const conditions = []

      if (cursor) {
        const decoded = decodeCursor(cursor)
        if (decoded) {
          conditions.push(
            sql`(${claudeDesktopSessions.createdAt}, ${claudeDesktopSessions.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`,
          )
        }
      }

      const whereClause = conditions.length > 0 ? conditions[0] : undefined

      const rows = await db
        .select({
          id: claudeDesktopSessions.id,
          label: claudeDesktopSessions.label,
          status: claudeDesktopSessions.status,
          trigger: claudeDesktopSessions.trigger,
          agentId: claudeDesktopSessions.agentId,
          agentName: agents.name,
          roleSlug: roles.slug,
          scheduledFor: claudeDesktopSessions.scheduledFor,
          startedAt: claudeDesktopSessions.startedAt,
          completedAt: claudeDesktopSessions.completedAt,
          notes: claudeDesktopSessions.notes,
          createdAt: claudeDesktopSessions.createdAt,
        })
        .from(claudeDesktopSessions)
        .leftJoin(agents, eq(claudeDesktopSessions.agentId, agents.id))
        .leftJoin(roles, eq(agents.roleId, roles.id))
        .where(whereClause)
        .orderBy(desc(claudeDesktopSessions.createdAt), desc(claudeDesktopSessions.id))
        .limit(limit + 1)

      const hasMore = rows.length > limit
      const items = hasMore ? rows.slice(0, limit) : rows
      const nextCursor =
        hasMore && items.length > 0
          ? encodeCursor(
              items[items.length - 1].createdAt.toISOString(),
              items[items.length - 1].id,
            )
          : undefined

      return reply.send({
        data: items,
        pagination: {
          limit,
          hasMore,
          nextCursor,
        },
      })
    },
  )

  // =========================================================================
  // PATCH /sessions/:id — update status, notes, timestamps
  // =========================================================================

  app.patch<{ Params: { id: string } }>(
    '/sessions/:id',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request, reply) => {
      const { id } = request.params
      if (!UUID_RE.test(id)) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ID format' } })
      }
      const body = validateBody(updateSessionSchema, request.body)

      // Check session exists
      const existing = await db
        .select({ id: claudeDesktopSessions.id })
        .from(claudeDesktopSessions)
        .where(eq(claudeDesktopSessions.id, id))
        .limit(1)

      if (existing.length === 0) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Session not found.' },
        })
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() }

      if (body.status !== undefined) updates.status = body.status
      if (body.notes !== undefined) updates.notes = body.notes
      if (body.completedAt !== undefined) updates.completedAt = new Date(body.completedAt)
      if (body.startedAt !== undefined) updates.startedAt = new Date(body.startedAt)

      const [updated] = await db
        .update(claudeDesktopSessions)
        .set(updates)
        .where(eq(claudeDesktopSessions.id, id))
        .returning()

      return reply.send({ data: updated })
    },
  )
}
