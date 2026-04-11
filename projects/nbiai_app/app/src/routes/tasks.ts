/**
 * Task management routes.
 *
 * GET    /api/tasks                    — paginated list with filters
 * GET    /api/tasks/:id                — full detail with comments, relations, checkout
 * POST   /api/tasks                    — create task (board, admin)
 * PATCH  /api/tasks/:id               — update task with status transition validation
 * POST   /api/tasks/:id/comments       — add a human comment
 * POST   /api/tasks/:id/checkout       — agent checks out a task (atomic)
 * POST   /api/tasks/:id/checkin        — agent checks in a task
 * POST   /api/tasks/:id/relations      — add a task relation (with mirror)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, inArray, sql, or, lt, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import {
  tasks,
  projects,
  agents,
  roles,
  taskComments,
  taskCheckouts,
  taskRelations,
  users,
} from '../db/schema.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody, paginationSchema } from '../lib/validate.js'

// ---------------------------------------------------------------------------
// Status transition matrix
// ---------------------------------------------------------------------------

const STATUS_TRANSITIONS: Record<string, string[]> = {
  backlog: ['assigned'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'review', 'cancelled'],
  blocked: ['in_progress', 'assigned', 'cancelled'],
  review: ['done', 'in_progress'],
  done: [],
  cancelled: [],
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const taskListQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  assignedAgentId: z.string().uuid().optional(),
  status: z
    .enum(['backlog', 'assigned', 'in_progress', 'blocked', 'review', 'done', 'cancelled'])
    .optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
})

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignedAgentId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  requiresApproval: z.boolean().optional(),
  dueDate: z.string().datetime().optional(),
})

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z
    .enum(['backlog', 'assigned', 'in_progress', 'blocked', 'review', 'done', 'cancelled'])
    .optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignedAgentId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
})

const addCommentSchema = z.object({
  content: z.string().min(1),
  commentType: z.literal('comment').optional().default('comment'),
})

const checkoutSchema = z.object({
  agentId: z.string().uuid(),
})

const checkinSchema = z.object({
  agentId: z.string().uuid(),
  output: z.string().optional(),
})

const relationSchema = z.object({
  relatedTaskId: z.string().uuid(),
  relationType: z.enum(['blocking', 'blocked_by', 'related']),
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
// Mirror relation type
// ---------------------------------------------------------------------------

function mirrorRelationType(
  type: 'blocking' | 'blocked_by' | 'related',
): 'blocking' | 'blocked_by' | 'related' {
  if (type === 'blocking') return 'blocked_by'
  if (type === 'blocked_by') return 'blocking'
  return 'related'
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function taskRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/tasks
  // -------------------------------------------------------------------------
  fastify.get('/tasks', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.user.companyId
    const query = validateBody(
      taskListQuerySchema,
      request.query as Record<string, unknown>,
    )
    const { limit, cursor, projectId, assignedAgentId, status, priority } = query
    const pageSize = limit ?? 25

    const conditions = [eq(tasks.companyId, companyId)]

    if (projectId) conditions.push(eq(tasks.projectId, projectId))
    if (assignedAgentId) conditions.push(eq(tasks.assignedAgentId, assignedAgentId))
    if (status) conditions.push(eq(tasks.status, status))
    if (priority) conditions.push(eq(tasks.priority, priority))

    if (cursor) {
      const decoded = decodeCursor(cursor)
      if (decoded) {
        conditions.push(
          or(
            lt(tasks.createdAt, new Date(decoded.createdAt)),
            and(
              eq(tasks.createdAt, new Date(decoded.createdAt)),
              lt(tasks.id, decoded.id),
            ),
          ) as ReturnType<typeof eq>,
        )
      }
    }

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectId: projects.id,
        projectName: projects.name,
        assignedAgentId: agents.id,
        assignedAgentName: agents.name,
        assignedAgentRoleName: roles.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(agents, eq(tasks.assignedAgentId, agents.id))
      .leftJoin(roles, eq(agents.roleId, roles.id))
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt), desc(tasks.id))
      .limit(pageSize + 1)

    const hasMore = rows.length > pageSize
    const data = hasMore ? rows.slice(0, pageSize) : rows

    const nextCursor =
      hasMore && data.length > 0
        ? encodeCursor(data[data.length - 1].createdAt, data[data.length - 1].id)
        : null

    const [{ total }] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(tasks)
      .where(eq(tasks.companyId, companyId))

    return reply.send({
      data: data.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        priority: r.priority,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        project: { id: r.projectId, name: r.projectName },
        assignedAgent: r.assignedAgentId
          ? {
              id: r.assignedAgentId,
              name: r.assignedAgentName,
              role: { name: r.assignedAgentRoleName },
            }
          : null,
      })),
      pagination: { cursor: nextCursor, hasMore, total },
    })
  })

  // -------------------------------------------------------------------------
  // GET /api/tasks/:id
  // -------------------------------------------------------------------------
  fastify.get('/tasks/:id', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const companyId = request.user.companyId

    const [row] = await db
      .select({
        task: tasks,
        projectId: projects.id,
        projectName: projects.name,
        assignedAgentId: agents.id,
        assignedAgentName: agents.name,
        assignedAgentRoleId: agents.roleId,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(agents, eq(tasks.assignedAgentId, agents.id))
      .where(and(eq(tasks.id, id), eq(tasks.companyId, companyId)))
      .limit(1)

    if (!row) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    // Resolve assigned agent role name
    let assignedAgentWithRole = null
    if (row.assignedAgentId) {
      const [roleRow] = await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, row.assignedAgentRoleId!))
        .limit(1)
      assignedAgentWithRole = {
        id: row.assignedAgentId,
        name: row.assignedAgentName,
        role: { name: roleRow?.name ?? null },
      }
    }

    // Created-by agent
    let createdByAgent = null
    if (row.task.createdByAgentId) {
      const [creator] = await db
        .select({ id: agents.id, name: agents.name })
        .from(agents)
        .where(eq(agents.id, row.task.createdByAgentId))
        .limit(1)
      createdByAgent = creator ?? null
    }

    // Task relations with related task titles
    const relations = await db
      .select({
        id: taskRelations.id,
        relatedTaskId: taskRelations.relatedTaskId,
        relationType: taskRelations.relationType,
        relatedTaskTitle: tasks.title,
      })
      .from(taskRelations)
      .leftJoin(tasks, eq(taskRelations.relatedTaskId, tasks.id))
      .where(eq(taskRelations.taskId, id))

    // Last 50 comments
    const comments = await db
      .select({
        id: taskComments.id,
        commentType: taskComments.commentType,
        content: taskComments.content,
        metadata: taskComments.metadata,
        createdAt: taskComments.createdAt,
        authorUserId: taskComments.authorUserId,
        authorAgentId: taskComments.authorAgentId,
      })
      .from(taskComments)
      .where(eq(taskComments.taskId, id))
      .orderBy(desc(taskComments.createdAt))
      .limit(50)

    // Enrich comments with author display names
    const userIds = comments
      .map((c) => c.authorUserId)
      .filter((uid): uid is string => uid !== null)
    const agentIds = comments
      .map((c) => c.authorAgentId)
      .filter((aid): aid is string => aid !== null)

    const userMap: Record<string, string> = {}
    const agentMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const userRows = await db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, userIds))
      for (const u of userRows) userMap[u.id] = u.displayName
    }
    if (agentIds.length > 0) {
      const agentRows = await db
        .select({ id: agents.id, name: agents.name })
        .from(agents)
        .where(inArray(agents.id, agentIds))
      for (const a of agentRows) agentMap[a.id] = a.name
    }

    const enrichedComments = comments.map((c) => ({
      ...c,
      authorName: c.authorUserId
        ? (userMap[c.authorUserId] ?? null)
        : c.authorAgentId
          ? (agentMap[c.authorAgentId] ?? null)
          : null,
    }))

    // Active checkout
    const [checkout] = await db
      .select()
      .from(taskCheckouts)
      .where(and(eq(taskCheckouts.taskId, id), isNull(taskCheckouts.checkedInAt)))
      .limit(1)

    return reply.send({
      data: {
        ...row.task,
        project: { id: row.projectId, name: row.projectName },
        assignedAgent: assignedAgentWithRole,
        createdByAgent,
        taskRelations: relations,
        taskComments: enrichedComments,
        checkout: checkout ?? null,
      },
    })
  })

  // -------------------------------------------------------------------------
  // POST /api/tasks
  // -------------------------------------------------------------------------
  fastify.post('/tasks', { preHandler: requireRole(BOARD_AND_ADMIN) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.user.companyId
    const userId = request.user.sub
    const body = validateBody(createTaskSchema, request.body)

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, body.projectId), eq(projects.companyId, companyId)))
      .limit(1)

    if (!project) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    if (body.assignedAgentId) {
      const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, body.assignedAgentId), eq(agents.companyId, companyId)))
        .limit(1)

      if (!agent) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Resource not found',
        })
      }
    }

    const taskStatus = body.assignedAgentId ? 'assigned' : 'backlog'

    const [created] = await db
      .insert(tasks)
      .values({
        companyId,
        projectId: body.projectId,
        title: body.title,
        description: body.description,
        status: taskStatus,
        priority: body.priority ?? 'medium',
        assignedAgentId: body.assignedAgentId,
        parentTaskId: body.parentTaskId,
        dueAt: body.dueDate ? new Date(body.dueDate) : undefined,
        createdByUserId: userId,
      })
      .returning()

    if (body.assignedAgentId) {
      await db.insert(taskComments).values({
        taskId: created.id,
        authorUserId: userId,
        commentType: 'assignment',
        content: `Task assigned to agent.`,
        metadata: { agentId: body.assignedAgentId },
      })
    }

    return reply.status(201).send({ data: created })
  })

  // -------------------------------------------------------------------------
  // PATCH /api/tasks/:id
  // -------------------------------------------------------------------------
  fastify.patch('/tasks/:id', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const companyId = request.user.companyId
    const userId = request.user.sub
    const body = validateBody(updateTaskSchema, request.body)

    const [existing] = await db
      .select({
        id: tasks.id,
        status: tasks.status,
        assignedAgentId: tasks.assignedAgentId,
      })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    if (body.status && body.status !== existing.status) {
      const allowed = STATUS_TRANSITIONS[existing.status] ?? []
      if (!allowed.includes(body.status)) {
        return reply.status(422).send({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: `Invalid status transition: "${existing.status}" → "${body.status}". Allowed: ${allowed.join(', ') || 'none'}.`,
        })
      }
    }

    if (body.assignedAgentId) {
      const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, body.assignedAgentId), eq(agents.companyId, companyId)))
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
    if (body.title !== undefined) updateValues.title = body.title
    if (body.description !== undefined) updateValues.description = body.description
    if (body.status !== undefined) updateValues.status = body.status
    if (body.priority !== undefined) updateValues.priority = body.priority
    if ('assignedAgentId' in body) updateValues.assignedAgentId = body.assignedAgentId ?? null
    if ('dueDate' in body) updateValues.dueAt = body.dueDate ? new Date(body.dueDate) : null

    const [updated] = await db
      .update(tasks)
      .set(updateValues)
      .where(and(eq(tasks.id, id), eq(tasks.companyId, companyId)))
      .returning()

    if (body.status && body.status !== existing.status) {
      await db.insert(taskComments).values({
        taskId: id,
        authorUserId: userId,
        commentType: 'status_change',
        content: `Status changed from "${existing.status}" to "${body.status}".`,
        metadata: { from: existing.status, to: body.status },
      })
    }

    if (
      'assignedAgentId' in body &&
      body.assignedAgentId !== existing.assignedAgentId
    ) {
      await db.insert(taskComments).values({
        taskId: id,
        authorUserId: userId,
        commentType: 'assignment',
        content: body.assignedAgentId ? `Task assigned to agent.` : `Task unassigned.`,
        metadata: {
          previousAgentId: existing.assignedAgentId,
          newAgentId: body.assignedAgentId ?? null,
        },
      })
    }

    return reply.send({ data: updated })
  })

  // -------------------------------------------------------------------------
  // POST /api/tasks/:id/comments
  // -------------------------------------------------------------------------
  fastify.post('/tasks/:id/comments', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const companyId = request.user.companyId
    const userId = request.user.sub
    const body = validateBody(addCommentSchema, request.body)

    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    const [comment] = await db
      .insert(taskComments)
      .values({
        taskId: id,
        authorUserId: userId,
        commentType: 'comment',
        content: body.content,
      })
      .returning()

    return reply.status(201).send({ data: comment })
  })

  // -------------------------------------------------------------------------
  // POST /api/tasks/:id/checkout
  // -------------------------------------------------------------------------
  fastify.post('/tasks/:id/checkout', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const companyId = request.user.companyId
    const body = validateBody(checkoutSchema, request.body)

    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    const [activeCheckout] = await db
      .select()
      .from(taskCheckouts)
      .where(and(eq(taskCheckouts.taskId, id), isNull(taskCheckouts.checkedInAt)))
      .limit(1)

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000) // +30 minutes

    if (activeCheckout) {
      if (activeCheckout.agentId !== body.agentId) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Task is already checked out by another agent.',
        })
      }

      // Same agent — release old checkout and create a fresh one (refreshes expiry)
      await db
        .update(taskCheckouts)
        .set({ checkedInAt: now, outcome: 'released' })
        .where(eq(taskCheckouts.id, activeCheckout.id))
    }

    const [checkout] = await db
      .insert(taskCheckouts)
      .values({
        taskId: id,
        agentId: body.agentId,
        checkedOutAt: now,
      })
      .returning()

    return reply.status(201).send({ data: { ...checkout, expiresAt } })
  })

  // -------------------------------------------------------------------------
  // POST /api/tasks/:id/checkin
  // -------------------------------------------------------------------------
  fastify.post('/tasks/:id/checkin', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const companyId = request.user.companyId
    const body = validateBody(checkinSchema, request.body)

    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    await db
      .update(taskCheckouts)
      .set({ checkedInAt: new Date(), outcome: 'completed' })
      .where(
        and(
          eq(taskCheckouts.taskId, id),
          eq(taskCheckouts.agentId, body.agentId),
          isNull(taskCheckouts.checkedInAt),
        ),
      )

    if (body.output !== undefined) {
      await db
        .update(tasks)
        .set({ output: body.output, updatedAt: new Date() })
        .where(eq(tasks.id, id))
    }

    return reply.status(204).send()
  })

  // -------------------------------------------------------------------------
  // POST /api/tasks/:id/relations
  // -------------------------------------------------------------------------
  fastify.post('/tasks/:id/relations', { preHandler: requireRole(BOARD_AND_ADMIN) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const companyId = request.user.companyId
    const body = validateBody(relationSchema, request.body)

    const [existing] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.companyId, companyId)))
      .limit(1)

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    const [relatedTask] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, body.relatedTaskId), eq(tasks.companyId, companyId)))
      .limit(1)

    if (!relatedTask) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Resource not found',
      })
    }

    const [relation] = await db
      .insert(taskRelations)
      .values({
        taskId: id,
        relatedTaskId: body.relatedTaskId,
        relationType: body.relationType,
      })
      .onConflictDoNothing()
      .returning()

    // Insert mirror relation
    await db
      .insert(taskRelations)
      .values({
        taskId: body.relatedTaskId,
        relatedTaskId: id,
        relationType: mirrorRelationType(body.relationType),
      })
      .onConflictDoNothing()

    return reply.status(201).send({ data: relation })
  })
}
