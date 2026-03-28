/**
 * Leads and Clients routes.
 *
 * Pipeline leads:
 * GET    /api/clients/pipeline          — list pipeline leads
 * POST   /api/clients/pipeline          — create a lead
 * PATCH  /api/clients/pipeline/:id      — update a lead
 * DELETE /api/clients/pipeline/:id      — hard-delete a lead
 * GET    /api/clients/overdue           — leads with overdue next-action dates
 *
 * Active clients:
 * GET    /api/clients/active            — list active clients
 * POST   /api/clients                   — create a client record
 * PATCH  /api/clients/:id               — update a client record
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, lt, notInArray, asc } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import {
  pipelineLeads,
  clients,
  agents,
  activityLog,
} from '../db/schema.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody, paginationSchema } from '../lib/validate.js'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const pipelineListQuerySchema = paginationSchema.extend({
  stage: z
    .enum([
      'identification',
      'qualification',
      'outreach',
      'discovery',
      'proposal',
      'negotiation',
      'closed_won',
      'closed_lost',
    ])
    .optional(),
})

const createLeadSchema = z.object({
  companyName: z.string().min(1).max(255),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  stage: z
    .enum([
      'identification',
      'qualification',
      'outreach',
      'discovery',
      'proposal',
      'negotiation',
      'closed_won',
      'closed_lost',
    ])
    .optional(),
  expectedValueGbp: z.number().positive().optional(),
  expectedCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  source: z.string().max(255).optional(),
  notes: z.string().optional(),
})

const updateLeadSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  contactName: z.string().max(255).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  stage: z
    .enum([
      'identification',
      'qualification',
      'outreach',
      'discovery',
      'proposal',
      'negotiation',
      'closed_won',
      'closed_lost',
    ])
    .optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedValueGbp: z.number().positive().nullable().optional(),
  expectedCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  source: z.string().max(255).nullable().optional(),
  notes: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  nextActionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  lastContactDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
})

const createClientSchema = z.object({
  companyName: z.string().min(1).max(255),
  primaryContactName: z.string().max(255).optional(),
  primaryContactEmail: z.string().email().optional(),
  contractStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  contractEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  monthlyValueGbp: z.number().positive().optional(),
  notes: z.string().optional(),
  engagementType: z.string().max(255).optional(),
  glenRole: z.string().max(255).optional(),
})

const updateClientSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  primaryContactName: z.string().max(255).nullable().optional(),
  primaryContactEmail: z.string().email().nullable().optional(),
  contractStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  contractEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  monthlyValueGbp: z.number().positive().nullable().optional(),
  health: z.enum(['green', 'amber', 'red']).optional(),
  notes: z.string().nullable().optional(),
  engagementType: z.string().max(255).nullable().optional(),
  glenRole: z.string().max(255).nullable().optional(),
  nextMilestone: z.string().nullable().optional(),
  nextMilestoneDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Helpers
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

export async function clientRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/clients/pipeline
  // -------------------------------------------------------------------------
  fastify.get(
    '/clients/pipeline',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const query = validateBody(
        pipelineListQuerySchema,
        request.query as Record<string, unknown>,
      )
      const { limit, cursor, stage } = query
      const pageSize = limit ?? 25

      const conditions = [eq(pipelineLeads.companyId, companyId)]

      if (stage) {
        conditions.push(
          eq(
            pipelineLeads.stage,
            stage as
              | 'identification'
              | 'qualification'
              | 'outreach'
              | 'discovery'
              | 'proposal'
              | 'negotiation'
              | 'closed_won'
              | 'closed_lost',
          ),
        )
      }

      if (cursor) {
        const decoded = decodeCursor(cursor)
        if (decoded) {
          conditions.push(
            and(
              lt(pipelineLeads.createdAt, new Date(decoded.createdAt)),
            ) as ReturnType<typeof eq>,
          )
        }
      }

      const rows = await db
        .select({
          id: pipelineLeads.id,
          companyId: pipelineLeads.companyId,
          companyName: pipelineLeads.companyName,
          contactName: pipelineLeads.contactName,
          contactEmail: pipelineLeads.contactEmail,
          contactTitle: pipelineLeads.contactTitle,
          stage: pipelineLeads.stage,
          probability: pipelineLeads.probability,
          expectedValue: pipelineLeads.expectedValue,
          expectedValueCurrency: pipelineLeads.expectedValueCurrency,
          expectedCloseDate: pipelineLeads.expectedCloseDate,
          source: pipelineLeads.source,
          ownerAgentId: pipelineLeads.ownerAgentId,
          lastContactDate: pipelineLeads.lastContactDate,
          nextAction: pipelineLeads.nextAction,
          nextActionDate: pipelineLeads.nextActionDate,
          notes: pipelineLeads.notes,
          createdAt: pipelineLeads.createdAt,
          updatedAt: pipelineLeads.updatedAt,
          assignedAgentName: agents.name,
        })
        .from(pipelineLeads)
        .leftJoin(agents, eq(pipelineLeads.ownerAgentId, agents.id))
        .where(and(...conditions))
        .orderBy(desc(pipelineLeads.createdAt))
        .limit(pageSize + 1)

      const hasMore = rows.length > pageSize
      const data = hasMore ? rows.slice(0, pageSize) : rows

      const nextCursor =
        hasMore && data.length > 0
          ? encodeCursor(data[data.length - 1].createdAt, data[data.length - 1].id)
          : null

      return reply.send({
        data,
        pagination: { cursor: nextCursor, hasMore },
      })
    },
  )

  // -------------------------------------------------------------------------
  // POST /api/clients/pipeline
  // -------------------------------------------------------------------------
  fastify.post(
    '/clients/pipeline',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const body = validateBody(createLeadSchema, request.body)
      const {
        companyName,
        contactName,
        contactEmail,
        stage,
        expectedValueGbp,
        expectedCloseDate,
        source,
        notes,
      } = body

      const [created] = await db
        .insert(pipelineLeads)
        .values({
          companyId,
          companyName,
          contactName: contactName ?? null,
          contactEmail: contactEmail ?? null,
          stage: (stage ?? 'identification') as
            | 'identification'
            | 'qualification'
            | 'outreach'
            | 'discovery'
            | 'proposal'
            | 'negotiation'
            | 'closed_won'
            | 'closed_lost',
          expectedValue: expectedValueGbp != null ? String(expectedValueGbp) : null,
          expectedValueCurrency: 'GBP',
          expectedCloseDate: expectedCloseDate ?? null,
          source: source ?? null,
          notes: notes ?? null,
        })
        .returning()

      return reply.status(201).send({ data: created })
    },
  )

  // -------------------------------------------------------------------------
  // PATCH /api/clients/pipeline/:id
  // -------------------------------------------------------------------------
  fastify.patch(
    '/clients/pipeline/:id',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId
      const userId = request.user.sub

      const body = validateBody(updateLeadSchema, request.body)

      const [existing] = await db
        .select()
        .from(pipelineLeads)
        .where(and(eq(pipelineLeads.id, id), eq(pipelineLeads.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Pipeline lead not found.' },
        })
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }

      if (body.companyName !== undefined) updateData.companyName = body.companyName
      if ('contactName' in body) updateData.contactName = body.contactName ?? null
      if ('contactEmail' in body) updateData.contactEmail = body.contactEmail ?? null
      if (body.stage !== undefined) updateData.stage = body.stage
      if (body.probability !== undefined) updateData.probability = body.probability
      if ('expectedValueGbp' in body) {
        updateData.expectedValue = body.expectedValueGbp != null ? String(body.expectedValueGbp) : null
      }
      if ('expectedCloseDate' in body) updateData.expectedCloseDate = body.expectedCloseDate ?? null
      if ('source' in body) updateData.source = body.source ?? null
      if ('notes' in body) updateData.notes = body.notes ?? null
      if ('nextAction' in body) updateData.nextAction = body.nextAction ?? null
      if ('nextActionDate' in body) updateData.nextActionDate = body.nextActionDate ?? null
      if ('lastContactDate' in body) updateData.lastContactDate = body.lastContactDate ?? null

      // If stage has changed, write an activity_log entry
      if (body.stage !== undefined && body.stage !== existing.stage) {
        await db.insert(activityLog).values({
          companyId,
          eventType: 'pipeline_stage_change',
          userId,
          title: `${existing.companyName} moved from ${existing.stage} to ${body.stage}`,
          metadata: {
            leadId: id,
            fromStage: existing.stage,
            toStage: body.stage,
          },
        })
      }

      const [updated] = await db
        .update(pipelineLeads)
        .set(updateData)
        .where(eq(pipelineLeads.id, id))
        .returning()

      return reply.send({ data: updated })
    },
  )

  // -------------------------------------------------------------------------
  // DELETE /api/clients/pipeline/:id  (hard delete)
  // -------------------------------------------------------------------------
  fastify.delete(
    '/clients/pipeline/:id',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId

      const [existing] = await db
        .select()
        .from(pipelineLeads)
        .where(and(eq(pipelineLeads.id, id), eq(pipelineLeads.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Pipeline lead not found.' },
        })
      }

      await db
        .delete(pipelineLeads)
        .where(eq(pipelineLeads.id, id))

      return reply.status(204).send()
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/clients/overdue
  // -------------------------------------------------------------------------
  fastify.get(
    '/clients/overdue',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId
      const today = new Date().toISOString().slice(0, 10)

      const rows = await db
        .select({
          id: pipelineLeads.id,
          companyName: pipelineLeads.companyName,
          contactName: pipelineLeads.contactName,
          stage: pipelineLeads.stage,
          nextAction: pipelineLeads.nextAction,
          nextActionDate: pipelineLeads.nextActionDate,
          probability: pipelineLeads.probability,
          expectedValue: pipelineLeads.expectedValue,
          createdAt: pipelineLeads.createdAt,
        })
        .from(pipelineLeads)
        .where(
          and(
            eq(pipelineLeads.companyId, companyId),
            lt(pipelineLeads.nextActionDate, today),
            notInArray(pipelineLeads.stage, ['closed_won', 'closed_lost']),
          ),
        )
        .orderBy(asc(pipelineLeads.nextActionDate))

      return reply.send({ data: rows })
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/clients/active
  // -------------------------------------------------------------------------
  fastify.get(
    '/clients/active',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const rows = await db
        .select({
          id: clients.id,
          name: clients.name,
          health: clients.health,
          engagementType: clients.engagementType,
          glenRole: clients.glenRole,
          primaryContactName: clients.primaryContactName,
          primaryContactEmail: clients.primaryContactEmail,
          nextMilestone: clients.nextMilestone,
          nextMilestoneDate: clients.nextMilestoneDate,
          notes: clients.notes,
          isActive: clients.isActive,
          startedAt: clients.startedAt,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
        })
        .from(clients)
        .where(
          and(eq(clients.companyId, companyId), eq(clients.isActive, true)),
        )
        .orderBy(asc(clients.name))

      return reply.send({ data: rows })
    },
  )

  // -------------------------------------------------------------------------
  // POST /api/clients
  // -------------------------------------------------------------------------
  fastify.post(
    '/clients',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const body = validateBody(createClientSchema, request.body)
      const {
        companyName,
        primaryContactName,
        primaryContactEmail,
        contractStart,
        notes,
        engagementType,
        glenRole,
      } = body

      const [created] = await db
        .insert(clients)
        .values({
          companyId,
          name: companyName,
          primaryContactName: primaryContactName ?? null,
          primaryContactEmail: primaryContactEmail ?? null,
          startedAt: contractStart ?? null,
          notes: notes ?? null,
          engagementType: engagementType ?? null,
          glenRole: glenRole ?? null,
          isActive: true,
          health: 'green',
        })
        .returning()

      return reply.status(201).send({ data: created })
    },
  )

  // -------------------------------------------------------------------------
  // PATCH /api/clients/:id
  // -------------------------------------------------------------------------
  fastify.patch(
    '/clients/:id',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId

      const body = validateBody(updateClientSchema, request.body)

      const [existing] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Client not found.' },
        })
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }

      if (body.companyName !== undefined) updateData.name = body.companyName
      if ('primaryContactName' in body) updateData.primaryContactName = body.primaryContactName ?? null
      if ('primaryContactEmail' in body) updateData.primaryContactEmail = body.primaryContactEmail ?? null
      if ('contractStart' in body) updateData.startedAt = body.contractStart ?? null
      if ('health' in body && body.health !== undefined) updateData.health = body.health
      if ('notes' in body) updateData.notes = body.notes ?? null
      if ('engagementType' in body) updateData.engagementType = body.engagementType ?? null
      if ('glenRole' in body) updateData.glenRole = body.glenRole ?? null
      if ('nextMilestone' in body) updateData.nextMilestone = body.nextMilestone ?? null
      if ('nextMilestoneDate' in body) updateData.nextMilestoneDate = body.nextMilestoneDate ?? null
      if (body.isActive !== undefined) updateData.isActive = body.isActive

      const [updated] = await db
        .update(clients)
        .set(updateData)
        .where(eq(clients.id, id))
        .returning()

      return reply.send({ data: updated })
    },
  )
}
