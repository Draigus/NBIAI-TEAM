/**
 * Approval queue routes.
 *
 * GET    /api/approvals             — paginated list of approvals (authenticated)
 * GET    /api/approvals/pending     — all pending approvals, max 100 (board only)
 * PATCH  /api/approvals/:id        — decide on an approval (board only)
 * POST   /api/approvals            — request an approval (system/agent use)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import {
  approvals,
  agents,
  tasks,
  activityLog,
  users,
} from '../db/schema.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { BOARD_ONLY } from '../middleware/rbac.js'
import { validateBody, paginationSchema } from '../lib/validate.js'
import { sendNotification } from '../realtime/notify.js'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const approvalListQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'approved', 'rejected', 'changes_requested']).optional(),
})

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'changes_requested']),
  comment: z.string().optional(),
})

const createApprovalSchema = z.object({
  taskId: z.string().uuid().optional(),
  requestedByAgentId: z.string().uuid(),
  approvalType: z.enum([
    'external_email',
    'client_communication',
    'financial_commitment',
    'public_publish',
    'strategic_decision',
    'hiring',
    'other',
  ]),
  summary: z.string().min(1).max(500),
  content: z.record(z.unknown()),
})

// ---------------------------------------------------------------------------
// Cursor helpers (createdAt + id)
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
// Plugin
// ---------------------------------------------------------------------------

export async function approvalRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/approvals
  // -------------------------------------------------------------------------
  fastify.get(
    '/approvals',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const query = validateBody(
        approvalListQuerySchema,
        request.query as Record<string, unknown>,
      )

      const { limit, cursor, status } = query
      const pageSize = limit ?? 25
      const filterStatus = status ?? 'pending'

      const conditions = [
        eq(approvals.companyId, companyId),
        eq(
          approvals.status,
          filterStatus as 'pending' | 'approved' | 'rejected' | 'changes_requested',
        ),
      ]

      if (cursor) {
        const decoded = decodeCursor(cursor)
        if (decoded) {
          conditions.push(
            sql`(${approvals.createdAt} < ${new Date(decoded.createdAt)} OR (${approvals.createdAt} = ${new Date(decoded.createdAt)} AND ${approvals.id} < ${decoded.id}))` as ReturnType<typeof eq>,
          )
        }
      }

      const rows = await db
        .select({
          id: approvals.id,
          approvalType: approvals.approvalType,
          title: approvals.title,
          status: approvals.status,
          context: approvals.context,
          resolvedAt: approvals.resolvedAt,
          createdAt: approvals.createdAt,
          updatedAt: approvals.updatedAt,
          requestingAgentName: agents.name,
          taskTitle: tasks.title,
        })
        .from(approvals)
        .innerJoin(agents, eq(approvals.requestedByAgentId, agents.id))
        .leftJoin(tasks, eq(approvals.taskId, tasks.id))
        .where(and(...conditions))
        .orderBy(desc(approvals.createdAt), desc(approvals.id))
        .limit(pageSize + 1)

      const hasMore = rows.length > pageSize
      const data = hasMore ? rows.slice(0, pageSize) : rows

      const nextCursor =
        hasMore && data.length > 0
          ? encodeCursor(
              data[data.length - 1].createdAt,
              data[data.length - 1].id,
            )
          : null

      return reply.send({
        data,
        pagination: { cursor: nextCursor, hasMore },
      })
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/approvals/pending
  // -------------------------------------------------------------------------
  fastify.get(
    '/approvals/pending',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const rows = await db
        .select({
          id: approvals.id,
          approvalType: approvals.approvalType,
          title: approvals.title,
          status: approvals.status,
          content: approvals.content,
          context: approvals.context,
          createdAt: approvals.createdAt,
          updatedAt: approvals.updatedAt,
          requestingAgentName: agents.name,
          taskTitle: tasks.title,
        })
        .from(approvals)
        .innerJoin(agents, eq(approvals.requestedByAgentId, agents.id))
        .leftJoin(tasks, eq(approvals.taskId, tasks.id))
        .where(
          and(
            eq(approvals.companyId, companyId),
            eq(approvals.status, 'pending'),
          ),
        )
        .orderBy(desc(approvals.createdAt))
        .limit(100)

      return reply.send({ data: rows })
    },
  )

  // -------------------------------------------------------------------------
  // PATCH /api/approvals/:id
  // -------------------------------------------------------------------------
  fastify.patch(
    '/approvals/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId
      const userId = request.user.sub

      const body = validateBody(decisionSchema, request.body)
      const { decision, comment } = body

      // comment is required for rejected and changes_requested
      if ((decision === 'rejected' || decision === 'changes_requested') && !comment) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: `A comment is required when decision is '${decision}'.`,
          },
        })
      }

      // Fetch the deciding user's display name for the activity log entry
      const [decidingUser] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      const userName = decidingUser?.displayName ?? 'Board user'

      // Fetch existing approval to verify it belongs to this company
      const [existing] = await db
        .select()
        .from(approvals)
        .where(and(eq(approvals.id, id), eq(approvals.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Approval not found.' },
        })
      }

      if (existing.status !== 'pending') {
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Approval has already been decided.',
          },
        })
      }

      const now = new Date()

      const [updated] = await db
        .update(approvals)
        .set({
          status: decision as 'approved' | 'rejected' | 'changes_requested',
          reviewedByUserId: userId,
          reviewerComment: comment ?? null,
          resolvedAt: now,
          updatedAt: now,
        })
        .where(eq(approvals.id, id))
        .returning()

      // Write activity log
      await db.insert(activityLog).values({
        companyId,
        eventType: 'approval_decision',
        userId,
        title: `Approval ${existing.approvalType} ${decision} by ${userName}`,
        metadata: {
          approvalId: id,
          approvalType: existing.approvalType,
          decision,
          comment: comment ?? null,
        },
      })

      // Emit pg_notify
      await sendNotification('approval_update', {
        approvalId: id,
        decision,
        companyId,
      })

      return reply.send({ data: updated })
    },
  )

  // -------------------------------------------------------------------------
  // POST /api/approvals
  // -------------------------------------------------------------------------
  fastify.post(
    '/approvals',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const body = validateBody(createApprovalSchema, request.body)
      const { taskId, requestedByAgentId, approvalType, summary, content } = body

      // Verify agent belongs to this company
      const [agent] = await db
        .select({ id: agents.id, name: agents.name })
        .from(agents)
        .where(and(eq(agents.id, requestedByAgentId), eq(agents.companyId, companyId)))
        .limit(1)

      if (!agent) {
        return reply.status(400).send({
          error: { code: 'INVALID_AGENT', message: 'Agent not found in this company.' },
        })
      }

      const [created] = await db
        .insert(approvals)
        .values({
          companyId,
          approvalType: approvalType as
            | 'external_email'
            | 'client_communication'
            | 'financial_commitment'
            | 'public_publish'
            | 'strategic_decision'
            | 'hiring'
            | 'other',
          title: summary,
          requestedByAgentId,
          taskId: taskId ?? null,
          content,
          status: 'pending',
        })
        .returning()

      // Write activity log
      await db.insert(activityLog).values({
        companyId,
        eventType: 'approval_requested',
        agentId: requestedByAgentId,
        taskId: taskId ?? null,
        title: `Approval requested: ${summary}`,
        metadata: {
          approvalId: created.id,
          approvalType,
        },
      })

      // Emit pg_notify
      await sendNotification('approval_update', {
        approvalId: created.id,
        status: 'pending',
        companyId,
      })

      return reply.status(201).send({ data: created })
    },
  )
}
