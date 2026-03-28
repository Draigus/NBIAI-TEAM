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
          inputTokens: agentExecutions.inputTokens,
          outputTokens: agentExecutions.outputTokens,
          costUsd: agentExecutions.costUsd,
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
          inputTokens: agentExecutions.inputTokens,
          outputTokens: agentExecutions.outputTokens,
          costUsd: agentExecutions.costUsd,
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
  // Board and admin only. Manually triggers an agent execution.
  // -------------------------------------------------------------------------

  fastify.post(
    '/executions/trigger',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const body = validateBody(triggerExecutionSchema, request.body)

      // Verify the agent belongs to this company
      const agentRows = await db
        .select({
          id: agents.id,
          name: agents.name,
          status: agents.status,
          companyId: agents.companyId,
        })
        .from(agents)
        .where(
          and(
            eq(agents.id, body.agentId),
            eq(agents.companyId, companyId),
          ),
        )
        .limit(1)

      if (agentRows.length === 0) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Agent not found.',
          },
        })
      }

      const agent = agentRows[0]

      if (agent.status === 'terminated') {
        return reply.status(400).send({
          error: {
            code: 'AGENT_TERMINATED',
            message: 'Cannot trigger execution for a terminated agent.',
          },
        })
      }

      if (agent.status === 'paused') {
        return reply.status(400).send({
          error: {
            code: 'AGENT_PAUSED',
            message: 'Cannot trigger execution for a paused agent.',
          },
        })
      }

      // Run the execution — this is synchronous from the HTTP handler's perspective
      // (we await the full result before returning). Phase 5 will add streaming.
      const runResult = await runAgentExecution({
        agentId: body.agentId,
        taskId: body.taskId ?? null,
        triggeredBy: 'manual',
        companyId,
      })

      if (runResult.status === 'budget_blocked') {
        return reply.status(429).send({
          error: {
            code: 'BUDGET_EXHAUSTED',
            message: runResult.error ?? 'Agent monthly budget cap has been reached.',
          },
        })
      }

      return reply.status(200).send({ data: runResult })
    },
  )
}
