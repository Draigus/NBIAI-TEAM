/**
 * Project management routes.
 *
 * GET    /api/projects           — paginated list with task counts and lead agent
 * GET    /api/projects/:id       — full detail with tasks and assigned agents
 * POST   /api/projects           — create project (board, admin)
 * PATCH  /api/projects/:id       — update project fields (board, admin)
 * DELETE /api/projects/:id       — archive project (board only; blocks if incomplete tasks)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, inArray, sql, or, lt } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import { projects, agents, roles, tasks } from '../db/schema.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { BOARD_ONLY, BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody, paginationSchema } from '../lib/validate.js'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const projectListQuerySchema = paginationSchema.extend({
  status: z
    .enum(['planning', 'active', 'paused', 'completed', 'cancelled'])
    .optional(),
})

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  leadAgentId: z.string().uuid().optional(),
  status: z
    .enum(['planning', 'active', 'paused', 'completed', 'cancelled'])
    .optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z
    .enum(['planning', 'active', 'paused', 'completed', 'cancelled'])
    .optional(),
  leadAgentId: z.string().uuid().nullable().optional(),
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
// Slug generator
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/projects
  // -------------------------------------------------------------------------
  fastify.get('/projects', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.user.companyId
    const query = validateBody(
      projectListQuerySchema,
      request.query as Record<string, unknown>,
    )
    const { limit, cursor, status } = query
    const pageSize = limit ?? 25

    const conditions = [eq(projects.companyId, companyId)]

    if (status) {
      conditions.push(eq(projects.status, status))
    }

    if (cursor) {
      const decoded = decodeCursor(cursor)
      if (decoded) {
        conditions.push(
          or(
            lt(projects.createdAt, new Date(decoded.createdAt)),
            and(
              eq(projects.createdAt, new Date(decoded.createdAt)),
              lt(projects.id, decoded.id),
            ),
          ) as ReturnType<typeof eq>,
        )
      }
    }

    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        health: projects.health,
        updatedAt: projects.updatedAt,
        createdAt: projects.createdAt,
        leadAgentId: agents.id,
        leadAgentName: agents.name,
        leadAgentRoleName: roles.name,
      })
      .from(projects)
      .leftJoin(agents, eq(projects.leadAgentId, agents.id))
      .leftJoin(roles, eq(agents.roleId, roles.id))
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt), desc(projects.id))
      .limit(pageSize + 1)

    const hasMore = rows.length > pageSize
    const data = hasMore ? rows.slice(0, pageSize) : rows

    // Task counts per project
    const projectIds = data.map((r) => r.id)
    const taskCountMap: Record<
      string,
      { total: number; backlog: number; inProgress: number; blocked: number; done: number }
    > = {}

    if (projectIds.length > 0) {
      const counts = await db
        .select({
          projectId: tasks.projectId,
          status: tasks.status,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(tasks)
        .where(inArray(tasks.projectId, projectIds))
        .groupBy(tasks.projectId, tasks.status)

      for (const row of counts) {
        if (!taskCountMap[row.projectId]) {
          taskCountMap[row.projectId] = {
            total: 0,
            backlog: 0,
            inProgress: 0,
            blocked: 0,
            done: 0,
          }
        }
        const bucket = taskCountMap[row.projectId]
        bucket.total += row.count
        if (row.status === 'backlog') bucket.backlog += row.count
        if (row.status === 'in_progress') bucket.inProgress += row.count
        if (row.status === 'blocked') bucket.blocked += row.count
        if (row.status === 'done') bucket.done += row.count
      }
    }

    const enriched = data.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      health: row.health,
      lastUpdatedAt: row.updatedAt,
      leadAgent: row.leadAgentId
        ? {
            id: row.leadAgentId,
            name: row.leadAgentName,
            role: { name: row.leadAgentRoleName },
          }
        : null,
      taskCounts: taskCountMap[row.id] ?? {
        total: 0,
        backlog: 0,
        inProgress: 0,
        blocked: 0,
        done: 0,
      },
    }))

    const nextCursor =
      hasMore && data.length > 0
        ? encodeCursor(data[data.length - 1].createdAt, data[data.length - 1].id)
        : null

    const [{ total }] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(projects)
      .where(
        status
          ? and(eq(projects.companyId, companyId), eq(projects.status, status))
          : eq(projects.companyId, companyId),
      )

    return reply.send({
      data: enriched,
      pagination: { cursor: nextCursor, hasMore, total },
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/projects/:id
  // -------------------------------------------------------------------------
  fastify.get('/projects/:id', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const companyId = request.user.companyId

    const [row] = await db
      .select({
        project: projects,
        leadAgentId: agents.id,
        leadAgentName: agents.name,
        leadAgentRoleId: agents.roleId,
        leadAgentRoleName: roles.name,
      })
      .from(projects)
      .leftJoin(agents, eq(projects.leadAgentId, agents.id))
      .leftJoin(roles, eq(agents.roleId, roles.id))
      .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
      .limit(1)

    if (!row) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    // Fetch all tasks for this project with assigned agent info
    // Use aliases to avoid column name collisions
    const assignedAgent = agents
    const assignedRole = roles

    const projectTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueAt: tasks.dueAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        assignedAgentId: assignedAgent.id,
        assignedAgentName: assignedAgent.name,
        assignedAgentRoleName: assignedRole.name,
      })
      .from(tasks)
      .leftJoin(assignedAgent, eq(tasks.assignedAgentId, assignedAgent.id))
      .leftJoin(assignedRole, eq(assignedAgent.roleId, assignedRole.id))
      .where(eq(tasks.projectId, id))
      .orderBy(desc(tasks.createdAt))

    return reply.send({
      data: {
        ...row.project,
        leadAgent: row.leadAgentId
          ? {
              id: row.leadAgentId,
              name: row.leadAgentName,
              role: { name: row.leadAgentRoleName },
            }
          : null,
        tasks: projectTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueAt: t.dueAt,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          assignedAgent: t.assignedAgentId
            ? {
                id: t.assignedAgentId,
                name: t.assignedAgentName,
                role: { name: t.assignedAgentRoleName },
              }
            : null,
        })),
      },
    })
  })

  // -------------------------------------------------------------------------
  // POST /api/projects
  // -------------------------------------------------------------------------
  fastify.post('/projects', { preHandler: requireRole(BOARD_AND_ADMIN) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.user.companyId
    const body = validateBody(createProjectSchema, request.body)

    if (body.leadAgentId) {
      const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, body.leadAgentId), eq(agents.companyId, companyId)))
        .limit(1)

      if (!agent) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Resource not found',
        })
      }
    }

    const baseSlug = slugify(body.name)

    const [existingSlug] = await db
      .select({ slug: projects.slug })
      .from(projects)
      .where(and(eq(projects.companyId, companyId), eq(projects.slug, baseSlug)))
      .limit(1)

    const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug

    const [created] = await db
      .insert(projects)
      .values({
        companyId,
        name: body.name,
        slug,
        description: body.description,
        leadAgentId: body.leadAgentId,
        status: body.status ?? 'planning',
      })
      .returning()

    return reply.status(201).send({ data: created })
  })

  // -------------------------------------------------------------------------
  // PATCH /api/projects/:id
  // -------------------------------------------------------------------------
  fastify.patch('/projects/:id', { preHandler: requireRole(BOARD_AND_ADMIN) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const companyId = request.user.companyId
    const body = validateBody(updateProjectSchema, request.body)

    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    if (body.leadAgentId) {
      const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, body.leadAgentId), eq(agents.companyId, companyId)))
        .limit(1)

      if (!agent) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Resource not found',
        })
      }
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined) updateValues.name = body.name
    if (body.description !== undefined) updateValues.description = body.description
    if (body.status !== undefined) updateValues.status = body.status
    if ('leadAgentId' in body) updateValues.leadAgentId = body.leadAgentId ?? null

    const [updated] = await db
      .update(projects)
      .set(updateValues)
      .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
      .returning()

    return reply.send({ data: updated })
  })

  // -------------------------------------------------------------------------
  // DELETE /api/projects/:id
  // -------------------------------------------------------------------------
  fastify.delete('/projects/:id', { preHandler: requireRole(BOARD_ONLY) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const companyId = request.user.companyId

    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    const [{ incompleteTasks }] = await db
      .select({ incompleteTasks: sql<number>`cast(count(*) as int)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, id),
          inArray(tasks.status, ['backlog', 'assigned', 'in_progress', 'blocked', 'review']),
        ),
      )

    if (incompleteTasks > 0) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Cannot archive project: ${incompleteTasks} incomplete task(s) remain. Complete or cancel all tasks first.`,
      })
    }

    await db
      .update(projects)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(projects.id, id))

    return reply.status(204).send()
  })
}
