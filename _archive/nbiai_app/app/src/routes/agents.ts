/**
 * Agent management routes.
 *
 * GET    /api/agents                    — paginated list with role join
 * GET    /api/agents/:id                — full detail with role, current task, direct reports
 * POST   /api/agents                    — hire agent (board, admin)
 * PATCH  /api/agents/:id               — update agent (board, admin)
 * DELETE /api/agents/:id               — terminate agent (board only, soft delete)
 * GET    /api/agents/:id/executions     — last 20 execution records
 * GET    /api/agents/:id/budget         — current month budget record
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, inArray, sql, or, lt } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import {
  agents,
  roles,
  tasks,
  agentReports,
  agentExecutions,
} from '../db/schema.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { BOARD_ONLY, BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody, paginationSchema } from '../lib/validate.js'

// ---------------------------------------------------------------------------
// UUID format guard (BUG-QA-002)
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const agentListQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  department: z.string().optional(),
  modelTier: z.enum(['opus', 'sonnet', 'haiku']).optional(),
})

const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  roleId: z.string().uuid().optional(),
  roleSlug: z.string().optional(),
  personaConfig: z.record(z.unknown()).optional(),
}).refine((data) => data.roleId || data.roleSlug, {
  message: 'Either roleId or roleSlug is required.',
})

const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  // 'running' and 'terminated' excluded — system-managed
  status: z
    .enum(['active', 'idle', 'blocked', 'paused', 'error', 'offline'])
    .optional(),
  personaConfig: z.record(z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Cursor helpers (hiredAt + id)
// ---------------------------------------------------------------------------

function encodeCursor(hiredAt: Date | string, id: string): string {
  return Buffer.from(JSON.stringify({ hiredAt, id })).toString('base64')
}

function decodeCursor(cursor: string): { hiredAt: string; id: string } | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function agentRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/agents
  // -------------------------------------------------------------------------
  fastify.get('/agents', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.user.companyId

    const query = validateBody(
      agentListQuerySchema,
      request.query as Record<string, unknown>,
    )

    const { limit, cursor, status, department, modelTier } = query
    const pageSize = limit ?? 25

    const conditions = [eq(agents.companyId, companyId)]

    if (status) {
      conditions.push(
        eq(
          agents.status,
          status as
            | 'active'
            | 'idle'
            | 'running'
            | 'blocked'
            | 'paused'
            | 'error'
            | 'offline'
            | 'terminated',
        ),
      )
    }

    if (modelTier) {
      conditions.push(eq(agents.modelTier, modelTier))
    }

    if (cursor) {
      const decoded = decodeCursor(cursor)
      if (decoded) {
        conditions.push(
          or(
            lt(agents.hiredAt, new Date(decoded.hiredAt)),
            and(
              eq(agents.hiredAt, new Date(decoded.hiredAt)),
              lt(agents.id, decoded.id),
            ),
          ) as ReturnType<typeof eq>,
        )
      }
    }

    const whereClause = department
      ? and(...conditions, eq(roles.department, department))
      : and(...conditions)

    const rows = await db
      .select({
        id: agents.id,
        name: agents.name,
        status: agents.status,
        modelTier: agents.modelTier,
        currentTaskId: agents.currentTaskId,
        hiredAt: agents.hiredAt,
        role: {
          name: roles.name,
          slug: roles.slug,
          department: roles.department,
          modelTier: roles.defaultModelTier,
        },
      })
      .from(agents)
      .innerJoin(roles, eq(agents.roleId, roles.id))
      .where(whereClause)
      .orderBy(desc(agents.hiredAt), desc(agents.id))
      .limit(pageSize + 1)

    const hasMore = rows.length > pageSize
    const data = hasMore ? rows.slice(0, pageSize) : rows

    const nextCursor =
      hasMore && data.length > 0
        ? encodeCursor(data[data.length - 1].hiredAt, data[data.length - 1].id)
        : null

    const [{ total }] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(agents)
      .innerJoin(roles, eq(agents.roleId, roles.id))
      .where(
        department
          ? and(eq(agents.companyId, companyId), eq(roles.department, department))
          : eq(agents.companyId, companyId),
      )

    return reply.send({
      data,
      pagination: { cursor: nextCursor, hasMore, total },
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/agents/:id
  // -------------------------------------------------------------------------
  fastify.get('/agents/:id', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    if (!UUID_RE.test(id)) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ID format' } })
    }
    const companyId = request.user.companyId

    const [row] = await db
      .select({
        agent: agents,
        role: roles,
      })
      .from(agents)
      .innerJoin(roles, eq(agents.roleId, roles.id))
      .where(and(eq(agents.id, id), eq(agents.companyId, companyId)))
      .limit(1)

    if (!row) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      })
    }

    // Fetch current task if any
    let currentTask = null
    if (row.agent.currentTaskId) {
      const [task] = await db
        .select({ id: tasks.id, title: tasks.title, status: tasks.status })
        .from(tasks)
        .where(eq(tasks.id, row.agent.currentTaskId))
        .limit(1)
      currentTask = task ?? null
    }

    // Fetch direct reports (agents that report to this agent)
    const directReports = await db
      .select({
        id: agents.id,
        name: agents.name,
        status: agents.status,
        roleName: roles.name,
      })
      .from(agentReports)
      .innerJoin(agents, eq(agentReports.agentId, agents.id))
      .innerJoin(roles, eq(agents.roleId, roles.id))
      .where(eq(agentReports.reportsToAgentId, id))

    return reply.send({
      data: {
        ...row.agent,
        role: row.role,
        currentTask,
        directReports,
      },
    })
  })

  // -------------------------------------------------------------------------
  // POST /api/agents
  // -------------------------------------------------------------------------
  fastify.post('/agents', { preHandler: requireRole(BOARD_AND_ADMIN) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.user.companyId
    const body = validateBody(createAgentSchema, request.body)

    // Resolve role by ID or slug
    let roleQuery
    if (body.roleId) {
      roleQuery = and(eq(roles.id, body.roleId), eq(roles.companyId, companyId))
    } else {
      roleQuery = and(eq(roles.slug, body.roleSlug!), eq(roles.companyId, companyId))
    }

    const [role] = await db
      .select({ id: roles.id, defaultModelTier: roles.defaultModelTier })
      .from(roles)
      .where(roleQuery)
      .limit(1)

    if (!role) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Role not found' },
      })
    }

    try {
      const [created] = await db
        .insert(agents)
        .values({
          companyId,
          roleId: role.id,
          name: body.name,
          modelTier: role.defaultModelTier,
          status: 'idle',
          config: body.personaConfig ?? {},
        })
        .returning()

      return reply.status(201).send({ data: created })
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr.code === '23505') {
        return reply.status(409).send({
          error: { code: 'CONFLICT', message: 'An active agent already exists for this role.' },
        })
      }
      throw err
    }
  })

  // -------------------------------------------------------------------------
  // PATCH /api/agents/:id
  // -------------------------------------------------------------------------
  fastify.patch('/agents/:id', { preHandler: requireRole(BOARD_AND_ADMIN) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    if (!UUID_RE.test(id)) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ID format' } })
    }
    const companyId = request.user.companyId
    const body = validateBody(updateAgentSchema, request.body)

    const [existing] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      })
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined) updateValues.name = body.name
    if (body.status !== undefined) updateValues.status = body.status
    if (body.personaConfig !== undefined) updateValues.config = body.personaConfig

    const [updated] = await db
      .update(agents)
      .set(updateValues)
      .where(and(eq(agents.id, id), eq(agents.companyId, companyId)))
      .returning()

    return reply.send({ data: updated })
  })

  // -------------------------------------------------------------------------
  // DELETE /api/agents/:id
  // -------------------------------------------------------------------------
  fastify.delete('/agents/:id', { preHandler: requireRole(BOARD_ONLY) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    if (!UUID_RE.test(id)) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ID format' } })
    }
    const companyId = request.user.companyId

    const [existing] = await db
      .select({ id: agents.id, currentTaskId: agents.currentTaskId })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      })
    }

    // Unassign any current task
    if (existing.currentTaskId) {
      await db
        .update(tasks)
        .set({ assignedAgentId: null, updatedAt: new Date() })
        .where(eq(tasks.id, existing.currentTaskId))
    }

    // Soft delete: set status to terminated
    await db
      .update(agents)
      .set({
        status: 'terminated',
        terminatedAt: new Date(),
        currentTaskId: null,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))

    return reply.status(204).send()
  })

  // -------------------------------------------------------------------------
  // GET /api/agents/:id/executions
  // -------------------------------------------------------------------------
  fastify.get('/agents/:id/executions', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    if (!UUID_RE.test(id)) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ID format' } })
    }
    const companyId = request.user.companyId

    const [existing] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      })
    }

    const rows = await db
      .select({
        id: agentExecutions.id,
        taskId: agentExecutions.taskId,
        taskTitle: tasks.title,
        status: agentExecutions.status,
        modelUsed: agentExecutions.modelUsed,
        durationMs: agentExecutions.durationMs,
        systemPromptTokens: agentExecutions.systemPromptTokens,
        contextTokens: agentExecutions.contextTokens,
        startedAt: agentExecutions.startedAt,
        endedAt: agentExecutions.endedAt,
      })
      .from(agentExecutions)
      .leftJoin(tasks, eq(agentExecutions.taskId, tasks.id))
      .where(eq(agentExecutions.agentId, id))
      .orderBy(desc(agentExecutions.startedAt))
      .limit(20)

    return reply.send({ data: rows })
  })

  // -------------------------------------------------------------------------
  // GET /api/agents/:id/budget
  // No-API architecture: no per-token budgets. Returns stub data.
  // Cost tracking uses the costLogs table (manual session cost entries).
  // -------------------------------------------------------------------------
  fastify.get('/agents/:id/budget', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    if (!UUID_RE.test(id)) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ID format' } })
    }
    const companyId = request.user.companyId

    const [existing] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      })
    }

    const now = new Date()
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    return reply.send({
      data: {
        budgetUsd: null,
        spentUsd: 0,
        percentUsed: 0,
        alertSent: false,
        monthYear,
        note: 'No-API architecture: costs tracked via flat Max plan subscription, not per-token.',
      },
    })
  })
}
