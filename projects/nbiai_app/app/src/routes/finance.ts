/**
 * Finance module routes.
 *
 * Revenue:
 * GET    /api/finance/revenue           — list revenue items with summary
 * POST   /api/finance/revenue           — create a revenue item (board only)
 * PATCH  /api/finance/revenue/:id       — update a revenue item (board only)
 * DELETE /api/finance/revenue/:id       — soft-delete a revenue item (board only)
 *
 * Payroll:
 * GET    /api/finance/payroll           — list payroll items with summary
 * POST   /api/finance/payroll           — create a payroll item (board only)
 * PATCH  /api/finance/payroll/:id       — update a payroll item (board only)
 * DELETE /api/finance/payroll/:id       — deactivate a payroll item (board only)
 *
 * Summary:
 * GET    /api/finance/summary           — full P&L summary
 * GET    /api/finance/agent-costs       — agent budget records for current month
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc, sql, sum } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import {
  revenueItems,
  payrollItems,
  costLogs,
  agents,
  roles,
  pipelineLeads,
} from '../db/schema.js'
import { requireRole } from '../middleware/auth.js'
import { BOARD_ONLY, BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody, paginationSchema } from '../lib/validate.js'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const revenueListQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'ended']).optional(),
})

const createRevenueSchema = z.object({
  clientName: z.string().min(1).max(255),
  type: z.enum(['monthly_retainer', 'one_off', 'milestone']),
  amountGbp: z.number().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
    .optional(),
  notes: z.string().optional(),
})

const updateRevenueSchema = z.object({
  clientName: z.string().min(1).max(255).optional(),
  type: z.enum(['monthly_retainer', 'one_off', 'milestone']).optional(),
  amountGbp: z.number().positive().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
})

const payrollListQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
})

const createPayrollSchema = z.object({
  name: z.string().min(1).max(255),
  payrollType: z.enum(['human', 'agent']),
  roleDescription: z.string().max(255).optional(),
  monthlyCostGbp: z.number().positive(),
  annualCostGbp: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  agentId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

const updatePayrollSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  roleDescription: z.string().max(255).nullable().optional(),
  monthlyCostGbp: z.number().positive().optional(),
  annualCostGbp: z.number().positive().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  agentId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns current month in YYYY-MM format. */
function currentMonthYear(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Cursor encode/decode for pagination (createdAt + id). */
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

export async function financeRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/finance/revenue
  // -------------------------------------------------------------------------
  fastify.get(
    '/finance/revenue',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const query = validateBody(
        revenueListQuerySchema,
        request.query as Record<string, unknown>,
      )
      const { limit, cursor, status } = query
      const pageSize = limit ?? 25
      const activeFilter = status !== 'ended' // default to active

      const conditions = [
        eq(revenueItems.companyId, companyId),
        eq(revenueItems.isActive, activeFilter),
      ]

      if (cursor) {
        const decoded = decodeCursor(cursor)
        if (decoded) {
          conditions.push(
            sql`(${revenueItems.createdAt} < ${new Date(decoded.createdAt)} OR (${revenueItems.createdAt} = ${new Date(decoded.createdAt)} AND ${revenueItems.id} < ${decoded.id}))` as ReturnType<typeof eq>,
          )
        }
      }

      const rows = await db
        .select()
        .from(revenueItems)
        .where(and(...conditions))
        .orderBy(desc(revenueItems.createdAt), desc(revenueItems.id))
        .limit(pageSize + 1)

      const hasMore = rows.length > pageSize
      const data = hasMore ? rows.slice(0, pageSize) : rows

      const nextCursor =
        hasMore && data.length > 0
          ? encodeCursor(data[data.length - 1].createdAt, data[data.length - 1].id)
          : null

      // Summary across all active items (not just this page)
      const summaryRows = await db
        .select({
          amount: revenueItems.amount,
          revenueType: revenueItems.revenueType,
        })
        .from(revenueItems)
        .where(and(eq(revenueItems.companyId, companyId), eq(revenueItems.isActive, true)))

      let totalMonthlyGbp = 0
      let totalAnnualGbp = 0
      let activeCount = 0

      for (const row of summaryRows) {
        const amount = parseFloat(row.amount)
        activeCount++
        if (row.revenueType === 'monthly_retainer') {
          totalMonthlyGbp += amount
          totalAnnualGbp += amount * 12
        } else {
          // one_off and milestone count toward annual, not monthly MRR
          totalAnnualGbp += amount
        }
      }

      return reply.send({
        data,
        pagination: { cursor: nextCursor, hasMore },
        summary: {
          totalMonthlyGbp: Math.round(totalMonthlyGbp * 100) / 100,
          totalAnnualGbp: Math.round(totalAnnualGbp * 100) / 100,
          activeCount,
        },
      })
    },
  )

  // -------------------------------------------------------------------------
  // POST /api/finance/revenue
  // -------------------------------------------------------------------------
  fastify.post(
    '/finance/revenue',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId
      const userId = request.user.sub

      const body = validateBody(createRevenueSchema, request.body)
      const { clientName, type, amountGbp, startDate, endDate, notes } = body

      const [created] = await db
        .insert(revenueItems)
        .values({
          companyId,
          clientName,
          revenueType: type,
          amount: String(amountGbp),
          currency: 'GBP',
          startDate,
          endDate: endDate ?? null,
          description: notes ?? null,
          isActive: true,
          createdByUserId: userId,
        })
        .returning()

      return reply.status(201).send({ data: created })
    },
  )

  // -------------------------------------------------------------------------
  // PATCH /api/finance/revenue/:id
  // -------------------------------------------------------------------------
  fastify.patch(
    '/finance/revenue/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId

      const body = validateBody(updateRevenueSchema, request.body)

      const [existing] = await db
        .select()
        .from(revenueItems)
        .where(and(eq(revenueItems.id, id), eq(revenueItems.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Revenue item not found.' },
        })
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }

      if (body.clientName !== undefined) updateData.clientName = body.clientName
      if (body.type !== undefined) updateData.revenueType = body.type
      if (body.amountGbp !== undefined) updateData.amount = String(body.amountGbp)
      if (body.startDate !== undefined) updateData.startDate = body.startDate
      if ('endDate' in body) updateData.endDate = body.endDate ?? null
      if ('notes' in body) updateData.description = body.notes ?? null

      const [updated] = await db
        .update(revenueItems)
        .set(updateData)
        .where(eq(revenueItems.id, id))
        .returning()

      return reply.send({ data: updated })
    },
  )

  // -------------------------------------------------------------------------
  // DELETE /api/finance/revenue/:id  (soft-delete: set isActive false)
  // -------------------------------------------------------------------------
  fastify.delete(
    '/finance/revenue/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId

      const [existing] = await db
        .select()
        .from(revenueItems)
        .where(and(eq(revenueItems.id, id), eq(revenueItems.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Revenue item not found.' },
        })
      }

      await db
        .update(revenueItems)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(revenueItems.id, id))

      return reply.status(204).send()
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/finance/payroll
  // -------------------------------------------------------------------------
  fastify.get(
    '/finance/payroll',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const query = validateBody(
        payrollListQuerySchema,
        request.query as Record<string, unknown>,
      )
      const isActive = query.isActive !== undefined ? query.isActive : true

      const rows = await db
        .select()
        .from(payrollItems)
        .where(
          and(
            eq(payrollItems.companyId, companyId),
            eq(payrollItems.isActive, isActive),
          ),
        )
        .orderBy(desc(payrollItems.createdAt))

      let totalMonthlyGbp = 0
      let totalAnnualGbp = 0
      let humanCount = 0
      let agentCount = 0

      for (const row of rows) {
        const monthly = parseFloat(row.monthlyCost)
        const annual = parseFloat(row.annualCost)
        if (row.payrollType === 'human') {
          humanCount++
          totalMonthlyGbp += monthly
          totalAnnualGbp += annual
        } else {
          agentCount++
          totalMonthlyGbp += monthly
          totalAnnualGbp += annual
        }
      }

      return reply.send({
        data: rows,
        summary: {
          totalMonthlyGbp: Math.round(totalMonthlyGbp * 100) / 100,
          totalAnnualGbp: Math.round(totalAnnualGbp * 100) / 100,
          humanCount,
          agentCount,
        },
      })
    },
  )

  // -------------------------------------------------------------------------
  // POST /api/finance/payroll
  // -------------------------------------------------------------------------
  fastify.post(
    '/finance/payroll',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const body = validateBody(createPayrollSchema, request.body)
      const {
        name,
        payrollType,
        roleDescription,
        monthlyCostGbp,
        annualCostGbp,
        currency,
        startDate,
        endDate,
        agentId,
        notes,
      } = body

      // Default annual cost to 12x monthly if not provided
      const annual = annualCostGbp ?? monthlyCostGbp * 12

      const [created] = await db
        .insert(payrollItems)
        .values({
          companyId,
          name,
          payrollType,
          roleDescription: roleDescription ?? null,
          monthlyCost: String(monthlyCostGbp),
          annualCost: String(annual),
          currency: currency ?? 'GBP',
          isActive: true,
          startDate,
          endDate: endDate ?? null,
          agentId: agentId ?? null,
          notes: notes ?? null,
        })
        .returning()

      return reply.status(201).send({ data: created })
    },
  )

  // -------------------------------------------------------------------------
  // PATCH /api/finance/payroll/:id
  // -------------------------------------------------------------------------
  fastify.patch(
    '/finance/payroll/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId

      const body = validateBody(updatePayrollSchema, request.body)

      const [existing] = await db
        .select()
        .from(payrollItems)
        .where(and(eq(payrollItems.id, id), eq(payrollItems.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Payroll item not found.' },
        })
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }

      if (body.name !== undefined) updateData.name = body.name
      if ('roleDescription' in body) updateData.roleDescription = body.roleDescription ?? null
      if (body.monthlyCostGbp !== undefined) updateData.monthlyCost = String(body.monthlyCostGbp)
      if (body.annualCostGbp !== undefined) updateData.annualCost = String(body.annualCostGbp)
      if (body.startDate !== undefined) updateData.startDate = body.startDate
      if ('endDate' in body) updateData.endDate = body.endDate ?? null
      if ('agentId' in body) updateData.agentId = body.agentId ?? null
      if ('notes' in body) updateData.notes = body.notes ?? null

      const [updated] = await db
        .update(payrollItems)
        .set(updateData)
        .where(eq(payrollItems.id, id))
        .returning()

      return reply.send({ data: updated })
    },
  )

  // -------------------------------------------------------------------------
  // DELETE /api/finance/payroll/:id  (soft-delete: set isActive false)
  // -------------------------------------------------------------------------
  fastify.delete(
    '/finance/payroll/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId

      const [existing] = await db
        .select()
        .from(payrollItems)
        .where(and(eq(payrollItems.id, id), eq(payrollItems.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Payroll item not found.' },
        })
      }

      await db
        .update(payrollItems)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(payrollItems.id, id))

      return reply.status(204).send()
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/finance/summary
  // -------------------------------------------------------------------------
  fastify.get(
    '/finance/summary',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId
      const monthYear = currentMonthYear()

      // Revenue: active retainers only for monthly contracted
      const revenueRows = await db
        .select({
          amount: revenueItems.amount,
          revenueType: revenueItems.revenueType,
        })
        .from(revenueItems)
        .where(
          and(eq(revenueItems.companyId, companyId), eq(revenueItems.isActive, true)),
        )

      let monthlyContracted = 0
      let annualContracted = 0

      for (const row of revenueRows) {
        const amount = parseFloat(row.amount)
        if (row.revenueType === 'monthly_retainer') {
          monthlyContracted += amount
          annualContracted += amount * 12
        } else {
          annualContracted += amount
        }
      }

      // Payroll: sum of active human payroll in GBP
      const payrollRows = await db
        .select({ monthlyCost: payrollItems.monthlyCost, currency: payrollItems.currency })
        .from(payrollItems)
        .where(
          and(
            eq(payrollItems.companyId, companyId),
            eq(payrollItems.isActive, true),
            eq(payrollItems.payrollType, 'human'),
          ),
        )

      let monthlyPayroll = 0
      for (const row of payrollRows) {
        monthlyPayroll += parseFloat(row.monthlyCost)
      }

      // Agent costs: no-API architecture uses flat Max plan (GBP 180/month).
      // Cost logs track estimated session costs for capacity planning.
      const GBP_PER_USD = 1 / 1.27

      const [agentCostResult] = await db
        .select({
          totalCostUsd: sum(costLogs.costUsd),
        })
        .from(costLogs)
        .where(eq(costLogs.periodMonth, `${monthYear}-01`))

      const totalSpentUsd = parseFloat(agentCostResult?.totalCostUsd ?? '0') || 0
      const monthlyAgentCosts = Math.round(totalSpentUsd * GBP_PER_USD * 100) / 100

      // Pipeline weighted and total values
      const pipelineRows = await db
        .select({
          expectedValue: pipelineLeads.expectedValue,
          probability: pipelineLeads.probability,
        })
        .from(pipelineLeads)
        .where(eq(pipelineLeads.companyId, companyId))

      let totalPipelineValue = 0
      let weightedPipelineValue = 0

      for (const row of pipelineRows) {
        if (row.expectedValue) {
          const value = parseFloat(row.expectedValue)
          totalPipelineValue += value
          weightedPipelineValue += value * (row.probability / 100)
        }
      }

      // Monthly target: from company settings or 50000 default
      const monthlyTarget = 50000

      const net =
        Math.round(
          (monthlyContracted - monthlyPayroll - monthlyAgentCosts) * 100,
        ) / 100

      return reply.send({
        data: {
          revenue: {
            monthlyContracted: Math.round(monthlyContracted * 100) / 100,
            annualContracted: Math.round(annualContracted * 100) / 100,
            monthlyTarget,
          },
          costs: {
            monthlyPayroll: Math.round(monthlyPayroll * 100) / 100,
            monthlyAgentCosts,
          },
          net: {
            monthly: net,
          },
          pipeline: {
            totalValue: Math.round(totalPipelineValue * 100) / 100,
            weightedValue: Math.round(weightedPipelineValue * 100) / 100,
          },
        },
      })
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/finance/agent-costs
  // No-API architecture: returns cost log entries grouped by agent for the
  // current month. These are manually logged session cost estimates.
  // -------------------------------------------------------------------------
  fastify.get(
    '/finance/agent-costs',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const monthYear = currentMonthYear()

      const rows = await db
        .select({
          id: costLogs.id,
          agentId: costLogs.agentId,
          agentName: agents.name,
          roleName: roles.name,
          costUsd: costLogs.costUsd,
          periodMonth: costLogs.periodMonth,
          notes: costLogs.notes,
          createdAt: costLogs.createdAt,
        })
        .from(costLogs)
        .leftJoin(agents, eq(costLogs.agentId, agents.id))
        .leftJoin(roles, eq(agents.roleId, roles.id))
        .where(eq(costLogs.periodMonth, `${monthYear}-01`))
        .orderBy(desc(costLogs.createdAt))

      const totalCostUsd = rows.reduce(
        (acc, row) => acc + parseFloat(row.costUsd),
        0,
      )

      return reply.send({
        data: rows,
        summary: {
          monthYear,
          totalCostUsd: Math.round(totalCostUsd * 1000) / 1000,
          note: 'Flat Max plan: GBP 180/month. Costs here are estimated session fractions.',
        },
      })
    },
  )
}
