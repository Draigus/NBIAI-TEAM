/**
 * Execution management routes.
 *
 * GET  /api/executions              — paginated list (agentId?, taskId?, status?, limit, cursor)
 * GET  /api/executions/:id          — full execution record with agent and task details
 * POST /api/executions/trigger      — manually trigger an agent execution (board, admin only)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, lt } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import {
  agentExecutions,
  agents,
  roles,
  tasks,
  projects,
} from '../db/schema.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody, paginationSchema } from '../lib/validate.js'
import { runAgentExecution } from '../execution/runner.js'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const executionListQuerySchema = paginationSchema.extend({
  agentId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  status: z
    .enum(['running', 'completed', 'failed', 'cancelled', 'pending_approval'])
    .optional(),
})

const triggerExecutionSchema = z.object({
  agentId: z.string().uuid('agentId must be a valid UUID'),
  taskId: z.string().uuid('taskId must be a valid UUID').optional(),
})

// ---------------------------------------------------------------------------
// Cursor helpers (startedAt + id)
// ---------------------------------------------------------------------------

function encodeCursor(startedAt: Date | string, id: string): string {
  return Buffer.from(JSON.stringify({ startedAt, id })).toString('base64')
}

function decodeCursor(cursor: string): { startedAt: string; id: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function executionRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/executions
  // -------------------------------------------------------------------------

  fastify.get(
    '/executions',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const query = validateBody(
        executionListQuerySchema,
        request.query as Record<string, unknown>,
      )

      const { limit, cursor, agentId, taskId, status } = query
      const pageSize = limit ?? 25

      // Build WHERE conditions — always scope to company via agents.companyId
      const conditions: ReturnType<typeof eq>[] = [
        eq(agents.companyId, companyId) as ReturnType<typeof eq>,
      ]

      if (agentId) {
        conditions.push(eq(agentExecutions.agentId, agentId) as ReturnType<typeof eq>)
      }

      if (taskId) {
        conditions.push(eq(agentExecutions.taskId, taskId) as ReturnType<typeof eq>)
      }

      if (status) {
        conditions.push(eq(agentExecutions.status, status) as ReturnType<typeof eq>)
      }

      if (cursor) {
        const decoded = decodeCursor(cursor)
        if (decoded) {
          conditions.push(
            lt(agentExecutions.startedAt, new Date(decoded.startedAt)) as ReturnType<typeof eq>,
          )
        }
      }

      const rows = await db
        .select({
          id: agentExecutions.id,
          status: agentExecutions.status,
          modelUsed: agentExecutions.modelUsed,
          durationMs: agentExecutions.durationMs,
          startedAt: agentExecutions.startedAt,
          endedAt: agentExecutions.endedAt,
          errorMessage: agentExecutions.errorMessage,
          agentId: agentExecutions.agentId,
          taskId: agentExecutions.taskId,
          agent: {
            name: agents.name,
            roleName: roles.name,
          },
          taskTitle: tasks.title,
        })
        .from(agentExecutions)
        .innerJoin(agents, eq(agentExecutions.agentId, agents.id))
        .innerJoin(roles, eq(agents.roleId, roles.id))
        .leftJoin(tasks, eq(agentExecutions.taskId, tasks.id))
        .where(and(...conditions))
        .orderBy(desc(agentExecutions.startedAt), desc(agentExecutions.id))
        .limit(pageSize + 1)

      const hasMore = rows.length > pageSize
      const data = hasMore ? rows.slice(0, pageSize) : rows

      // Count total for display purposes
      const totalResult = await db.$count(agentExecutions)
      const total = totalResult ?? 0

      const nextCursor =
        hasMore && data.length > 0
          ? encodeCursor(
              data[data.length - 1].startedAt,
              data[data.length - 1].id,
            )
          : null

      return reply.send({
        data,
        pagination: {
          cursor: nextCursor,
          hasMore,
          total,
        },
      })
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/executions/:id
  // -------------------------------------------------------------------------

  fastify.get(
    '/executions/:id',
    { preHandler: requireAuth },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params
      const companyId = request.user.companyId

      const rows = await db
        .select({
          id: agentExecutions.id,
          agentId: agentExecutions.agentId,
          taskId: agentExecutions.taskId,
          status: agentExecutions.status,
          modelUsed: agentExecutions.modelUsed,
          systemPromptTokens: agentExecutions.systemPromptTokens,
          contextTokens: agentExecutions.contextTokens,
          durationMs: agentExecutions.durationMs,
          startedAt: agentExecutions.startedAt,
          endedAt: agentExecutions.endedAt,
          errorMessage: agentExecutions.errorMessage,
          log: agentExecutions.log,
          toolsUsed: agentExecutions.toolsUsed,
          createdAt: agentExecutions.createdAt,
          agent: {
            id: agents.id,
            name: agents.name,
            status: agents.status,
            modelTier: agents.modelTier,
            companyId: agents.companyId,
          },
          role: {
            name: roles.name,
            slug: roles.slug,
            department: roles.department,
          },
          taskTitle: tasks.title,
          taskStatus: tasks.status,
          projectName: projects.name,
        })
        .from(agentExecutions)
        .innerJoin(agents, eq(agentExecutions.agentId, agents.id))
        .innerJoin(roles, eq(agents.roleId, roles.id))
        .leftJoin(tasks, eq(agentExecutions.taskId, tasks.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(
          and(
            eq(agentExecutions.id, id),
            eq(agents.companyId, companyId),
          ),
        )
        .limit(1)

      if (rows.length === 0) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Execution record not found.',
          },
        })
      }

      return reply.send({ data: rows[0] })
    },
  )

  // -------------------------------------------------------------------------
  // POST /api/executions/trigger
  // REMOVED in no-API architecture (2026-03-28).
  //
  // Direct API execution is not supported. Agent execution runs through
  // Claude Desktop sessions on Glen's Max plan. Use the Queue screen (Sprint 2)
  // to assemble and dispatch tasks via Claude Desktop.
  //
  // Endpoint retained as a 501 stub to avoid breaking any existing references
  // until Sprint 2 replaces it with POST /api/v1/queue/results.
  // -------------------------------------------------------------------------

  fastify.post(
    '/executions/trigger',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(501).send({
        error: {
          code: 'NOT_IMPLEMENTED',
          message:
            'Direct API execution is not supported in the no-API architecture. ' +
            'Use the Queue screen to assemble tasks and run them via Claude Desktop. ' +
            'Results are posted back via POST /api/v1/queue/results (available in Sprint 2).',
        },
      })
    },
  )
}
