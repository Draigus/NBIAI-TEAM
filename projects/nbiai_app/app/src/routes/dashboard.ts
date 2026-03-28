/**
 * Dashboard (Command Centre) routes.
 *
 * GET /api/dashboard/summary      — quick stats: open tasks, active agents,
 *                                   pending approvals, active projects
 * GET /api/dashboard/activity     — recent activity feed with cursor pagination
 * GET /api/dashboard/agent-status — real-time agent status with heartbeats
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, inArray, sql, gt } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import {
  agents,
  roles,
  tasks,
  approvals,
  projects,
  activityLog,
  agentHeartbeats,
  users,
} from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../lib/validate.js'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const activityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  since: z.string().datetime().optional(),
})

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/dashboard/summary
  // -------------------------------------------------------------------------
  fastify.get('/dashboard/summary', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.user.companyId

    const [{ openTasksCount }] = await db
      .select({ openTasksCount: sql<number>`cast(count(*) as int)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.companyId, companyId),
          sql`${tasks.status} NOT IN ('done', 'cancelled')`,
        ),
      )

    const [{ activeAgentsCount }] = await db
      .select({ activeAgentsCount: sql<number>`cast(count(*) as int)` })
      .from(agents)
      .where(
        and(
          eq(agents.companyId, companyId),
          inArray(agents.status, ['active', 'running', 'idle']),
        ),
      )

    const [{ pendingApprovalsCount }] = await db
      .select({ pendingApprovalsCount: sql<number>`cast(count(*) as int)` })
      .from(approvals)
      .where(
        and(
          eq(approvals.companyId, companyId),
          eq(approvals.status, 'pending'),
        ),
      )

    const [{ projectsCount }] = await db
      .select({ projectsCount: sql<number>`cast(count(*) as int)` })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, companyId),
          eq(projects.status, 'active'),
        ),
      )

    return reply.send({
      data: {
        openTasksCount,
        activeAgentsCount,
        pendingApprovalsCount,
        projectsCount,
      },
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/dashboard/activity
  // -------------------------------------------------------------------------
  fastify.get('/dashboard/activity', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.user.companyId
    const query = validateBody(
      activityQuerySchema,
      request.query as Record<string, unknown>,
    )
    const limit = query.limit ?? 20
    const since = query.since

    const conditions = [eq(activityLog.companyId, companyId)]

    if (since) {
      conditions.push(gt(activityLog.createdAt, new Date(since)))
    }

    const rows = await db
      .select({
        id: activityLog.id,
        eventType: activityLog.eventType,
        title: activityLog.title,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
        agentId: activityLog.agentId,
        agentName: agents.name,
        userId: activityLog.userId,
        userDisplayName: users.displayName,
        taskId: activityLog.taskId,
        projectId: activityLog.projectId,
      })
      .from(activityLog)
      .leftJoin(agents, eq(activityLog.agentId, agents.id))
      .leftJoin(users, eq(activityLog.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)

    return reply.send({ data: rows })
  })

  // -------------------------------------------------------------------------
  // GET /api/dashboard/agent-status
  // -------------------------------------------------------------------------
  fastify.get('/dashboard/agent-status', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.user.companyId

    const rows = await db
      .select({
        id: agents.id,
        name: agents.name,
        status: agents.status,
        currentTaskId: agents.currentTaskId,
        roleName: roles.name,
        roleModelTier: roles.defaultModelTier,
        lastSeenAt: agentHeartbeats.lastSeenAt,
        currentTaskTitle: tasks.title,
      })
      .from(agents)
      .innerJoin(roles, eq(agents.roleId, roles.id))
      .leftJoin(agentHeartbeats, eq(agents.id, agentHeartbeats.agentId))
      .leftJoin(tasks, eq(agents.currentTaskId, tasks.id))
      .where(eq(agents.companyId, companyId))
      .orderBy(agents.name)

    const data = rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      role: {
        name: row.roleName,
        modelTier: row.roleModelTier,
      },
      lastSeenAt: row.lastSeenAt ?? null,
      currentTask:
        row.currentTaskId && row.currentTaskTitle
          ? { id: row.currentTaskId, title: row.currentTaskTitle }
          : null,
    }))

    return reply.send({ data })
  })
}
