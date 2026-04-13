/**
 * Queue management routes.
 *
 * The file-based queue bridges the web app and Claude Desktop execution.
 * The app writes JSON task files to queue/inbox/; Glen executes them in
 * Claude Desktop on his Max plan; results are posted back via the API.
 *
 * POST   /api/v1/queue/create          — assemble prompt, write to inbox
 * GET    /api/v1/queue                 — list queued/active/review/done tasks
 * GET    /api/v1/queue/:taskId/prompt  — retrieve stored session prompt
 * POST   /api/v1/queue/results         — post execution results back
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { writeFile, rename, mkdir } from 'fs/promises'
import { join } from 'path'

import { db } from '../db/index.js'
import {
  tasks,
  agents,
  roles,
  projects,
  claudeDesktopSessions,
  activityLog,
} from '../db/schema.js'
import { loadAgentContext } from '../execution/context-loader.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody, paginationSchema } from '../lib/validate.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPO_PATH = process.env.NBIAI_REPO_PATH ?? 'D:/OneDrive/Claude_code/NBIAI_TEAM'
const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createQueueSchema = z.object({
  agentId: z.string().uuid(),
  taskId: z.string().uuid(),
})

const queueListQuerySchema = paginationSchema.extend({
  status: z
    .enum(['queued', 'in_progress', 'review', 'done'])
    .optional(),
})

const resultsSchema = z.object({
  taskId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  status: z.enum(['done', 'failed']),
  output: z.string(),
  notes: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Cursor helpers (same pattern as tasks.ts)
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

export async function queueRoutes(app: FastifyInstance) {
  // =========================================================================
  // POST /queue/create — assemble prompt, create session, write to inbox
  // =========================================================================

  app.post(
    '/queue/create',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = validateBody(createQueueSchema, request.body)

      // 1. Validate agent exists
      const agentRows = await db
        .select({
          id: agents.id,
          name: agents.name,
          companyId: agents.companyId,
          roleSlug: roles.slug,
          modelTier: agents.modelTier,
        })
        .from(agents)
        .innerJoin(roles, eq(agents.roleId, roles.id))
        .where(eq(agents.id, body.agentId))
        .limit(1)

      if (agentRows.length === 0) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Agent not found.' },
        })
      }

      const agent = agentRows[0]

      // 2. Validate task exists and belongs to the same company
      const taskRows = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, body.taskId))
        .limit(1)

      if (taskRows.length === 0) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Task not found.' },
        })
      }

      const task = taskRows[0]

      if (task.companyId !== agent.companyId) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Agent and task belong to different companies.' },
        })
      }

      // 3. Load three-tier context
      const context = await loadAgentContext(body.agentId, body.taskId)

      // 4. Assemble session prompt
      const promptParts: string[] = [context.systemPrompt]

      if (context.tier1Knowledge) {
        promptParts.push('---\n\n## Company Knowledge (Tier 1)\n\n' + context.tier1Knowledge)
      }
      if (context.tier2Knowledge) {
        promptParts.push('---\n\n## Role Knowledge (Tier 2)\n\n' + context.tier2Knowledge)
      }
      if (context.tier3Knowledge) {
        promptParts.push('---\n\n## Project Knowledge (Tier 3)\n\n' + context.tier3Knowledge)
      }

      promptParts.push('---\n\n' + context.taskContext)

      const sessionPrompt = promptParts.join('\n\n')

      // 5. Create claude_desktop_session record
      const userId = request.user.sub

      const [session] = await db
        .insert(claudeDesktopSessions)
        .values({
          label: `${agent.name}: ${task.title}`,
          agentId: body.agentId,
          status: 'pending',
          trigger: 'manual',
          createdByUserId: userId,
        })
        .returning()

      // 6. Update task: queued status, link session, store prompt
      const now = new Date()

      const [updatedTask] = await db
        .update(tasks)
        .set({
          status: 'queued',
          queuedAt: now,
          sessionId: session.id,
          sessionPrompt,
          assignedAgentId: body.agentId,
          updatedAt: now,
        })
        .where(eq(tasks.id, body.taskId))
        .returning()

      // 7. Write JSON task file to queue/inbox/
      const inboxDir = join(REPO_PATH, 'queue', 'inbox')
      await mkdir(inboxDir, { recursive: true })

      const queueFile = {
        task_id: task.id,
        assigned_to: agent.roleSlug,
        model_tier: agent.modelTier,
        priority: task.priority,
        title: task.title,
        description: task.description ?? '',
        project_id: task.projectId,
        session_prompt: sessionPrompt,
        created_at: task.createdAt.toISOString(),
        queued_at: now.toISOString(),
        claimed_at: null,
        completed_at: null,
        result_endpoint: `POST ${APP_BASE_URL}/api/v1/queue/results`,
        status: 'inbox',
      }

      await writeFile(
        join(inboxDir, `${task.id}.json`),
        JSON.stringify(queueFile, null, 2),
        'utf8',
      )

      // 8. Log activity
      await db.insert(activityLog).values({
        companyId: agent.companyId,
        eventType: 'task_queued',
        userId: userId,
        agentId: body.agentId,
        taskId: body.taskId,
        projectId: task.projectId,
        title: `Queued task "${task.title}" for ${agent.name}`,
        metadata: {
          sessionId: session.id,
          estimatedTokens: context.estimatedTokens,
        },
      })

      return reply.status(201).send({
        data: {
          task: updatedTask,
          sessionPrompt,
          sessionId: session.id,
        },
      })
    },
  )

  // =========================================================================
  // GET /queue — list tasks with queue-relevant statuses
  // =========================================================================

  app.get(
    '/queue',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = queueListQuerySchema.parse(request.query)
      const { limit, cursor, status } = query
      const companyId = request.user.companyId

      const conditions = []

      // Scope to user's company
      conditions.push(eq(tasks.companyId, companyId))

      // Filter to queue-relevant statuses
      if (status) {
        conditions.push(eq(tasks.status, status))
      } else {
        conditions.push(
          inArray(tasks.status, ['queued', 'in_progress', 'review', 'done']),
        )
      }

      // Cursor-based pagination
      if (cursor) {
        const decoded = decodeCursor(cursor)
        if (decoded) {
          conditions.push(
            sql`(${tasks.queuedAt}, ${tasks.id}) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`,
          )
        }
      }

      const rows = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
          projectId: tasks.projectId,
          projectName: projects.name,
          agentId: agents.id,
          agentName: agents.name,
          roleSlug: roles.slug,
          queuedAt: tasks.queuedAt,
          completedAt: tasks.completedAt,
          sessionId: tasks.sessionId,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .leftJoin(agents, eq(tasks.assignedAgentId, agents.id))
        .leftJoin(roles, eq(agents.roleId, roles.id))
        .where(and(...conditions))
        .orderBy(desc(tasks.queuedAt), desc(tasks.id))
        .limit(limit + 1)

      const hasMore = rows.length > limit
      const items = hasMore ? rows.slice(0, limit) : rows
      const nextCursor =
        hasMore && items.length > 0
          ? encodeCursor(
              items[items.length - 1].queuedAt?.toISOString() ?? '',
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
  // GET /queue/:taskId/prompt — retrieve stored session prompt for clipboard
  // =========================================================================

  app.get<{ Params: { taskId: string } }>(
    '/queue/:taskId/prompt',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { taskId } = request.params
      const companyId = request.user.companyId

      const rows = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          sessionPrompt: tasks.sessionPrompt,
          sessionId: tasks.sessionId,
          status: tasks.status,
        })
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.companyId, companyId)))
        .limit(1)

      if (rows.length === 0) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Task not found.' },
        })
      }

      const task = rows[0]

      if (!task.sessionPrompt) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No session prompt stored for this task. Queue it first.',
          },
        })
      }

      return reply.send({
        data: {
          taskId: task.id,
          title: task.title,
          status: task.status,
          sessionId: task.sessionId,
          sessionPrompt: task.sessionPrompt,
        },
      })
    },
  )

  // =========================================================================
  // POST /queue/results — post execution results back from Claude Desktop
  // =========================================================================

  app.post(
    '/queue/results',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = validateBody(resultsSchema, request.body)
      const now = new Date()
      const userId = request.user.sub

      // 1. Validate task exists
      const taskRows = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, body.taskId))
        .limit(1)

      if (taskRows.length === 0) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Task not found.' },
        })
      }

      const task = taskRows[0]

      // Determine new task status: done tasks go to review for Glen's sign-off
      const newTaskStatus = body.status === 'done' ? 'review' : 'done'

      // 2. Update task
      const [updatedTask] = await db
        .update(tasks)
        .set({
          status: newTaskStatus,
          output: body.output,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(tasks.id, body.taskId))
        .returning()

      // 3. Update claude_desktop_session if we have a session ID
      const sessionId = body.sessionId ?? task.sessionId
      if (sessionId) {
        await db
          .update(claudeDesktopSessions)
          .set({
            status: body.status === 'done' ? 'completed' : 'failed',
            completedAt: now,
            notes: body.notes ?? null,
            updatedAt: now,
          })
          .where(eq(claudeDesktopSessions.id, sessionId))
      }

      // 4. Move queue file from active/ to done/ or failed/
      const activeFile = join(REPO_PATH, 'queue', 'active', `${body.taskId}.json`)
      const destFolder = body.status === 'done' ? 'done' : 'failed'
      const destDir = join(REPO_PATH, 'queue', destFolder)
      await mkdir(destDir, { recursive: true })

      try {
        await rename(activeFile, join(destDir, `${body.taskId}.json`))
      } catch {
        // File may not exist in active/ (manual result posting). Try inbox/.
        try {
          const inboxFile = join(REPO_PATH, 'queue', 'inbox', `${body.taskId}.json`)
          await rename(inboxFile, join(destDir, `${body.taskId}.json`))
        } catch {
          // File not found in either location; that is fine for manual posts.
        }
      }

      // 5. Log activity
      await db.insert(activityLog).values({
        companyId: task.companyId,
        eventType: body.status === 'done' ? 'task_completed' : 'task_failed',
        userId: userId,
        agentId: task.assignedAgentId,
        taskId: body.taskId,
        projectId: task.projectId,
        title: `Task "${task.title}" ${body.status === 'done' ? 'completed (awaiting review)' : 'failed'}`,
        metadata: { sessionId, notes: body.notes },
      })

      return reply.send({ data: updatedTask })
    },
  )
}
