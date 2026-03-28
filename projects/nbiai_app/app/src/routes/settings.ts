/**
 * Settings routes.
 *
 * Company:
 * GET    /api/settings/company          — get company record
 * PATCH  /api/settings/company          — update company (board only)
 *
 * Users:
 * GET    /api/settings/users            — list users (board and admin)
 * POST   /api/settings/users            — create user (board only)
 * PATCH  /api/settings/users/:id        — update user role/displayName (board only)
 * DELETE /api/settings/users/:id        — delete user (board only)
 *
 * API keys:
 * GET    /api/settings/api-keys         — list keys (board only, masked)
 * POST   /api/settings/api-keys         — add key (board only, encrypted)
 * DELETE /api/settings/api-keys/:id     — deactivate key (board only)
 *
 * Budgets:
 * GET    /api/settings/budgets          — list agent budget records (board and admin)
 * PATCH  /api/settings/budgets/:agentId — upsert budget for current month (board only)
 *
 * Knowledge files:
 * GET    /api/settings/knowledge        — list knowledge files grouped by tier
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/index.js'
import {
  companies,
  users,
  apiKeys,
  agentBudgets,
  agents,
  roles,
  knowledgeFiles,
  projects,
} from '../db/schema.js'
import { requireRole } from '../middleware/auth.js'
import { BOARD_ONLY, BOARD_AND_ADMIN } from '../middleware/rbac.js'
import { validateBody } from '../lib/validate.js'
import { encryptApiKey, hashPassword } from '../lib/crypto.js'

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logoUrl: z.string().url().nullable().optional(),
})

// BUG-016 fix: board role cannot be assigned via user creation per spec Section 11.2.
// "Board role cannot be assigned -- it is set during setup."
// Role is restricted to admin or viewer at the schema level.
const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(255),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  role: z.enum(['admin', 'viewer']),
})

// Board role cannot be assigned via PATCH either — prevents role escalation.
const updateUserSchema = z.object({
  role: z.enum(['admin', 'viewer']).optional(),
  displayName: z.string().min(2).max(255).optional(),
})

const createApiKeySchema = z.object({
  label: z.string().min(1).max(255),
  key: z.string().min(1),
  provider: z.string().min(1).max(100),
})

const upsertBudgetSchema = z.object({
  budgetUsd: z.number().positive(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns current month in YYYY-MM format. */
function currentMonthYear(): string {
  return new Date().toISOString().slice(0, 7)
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/settings/company
  // -------------------------------------------------------------------------
  fastify.get(
    '/settings/company',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1)

      if (!company) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Company not found.' },
        })
      }

      return reply.send({ data: company })
    },
  )

  // -------------------------------------------------------------------------
  // PATCH /api/settings/company
  // -------------------------------------------------------------------------
  fastify.patch(
    '/settings/company',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const body = validateBody(updateCompanySchema, request.body)

      const [existing] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Company not found.' },
        })
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }

      if (body.name !== undefined) updateData.name = body.name
      if ('logoUrl' in body) updateData.logoUrl = body.logoUrl ?? null

      const [updated] = await db
        .update(companies)
        .set(updateData)
        .where(eq(companies.id, companyId))
        .returning()

      return reply.send({ data: updated })
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/settings/users
  // -------------------------------------------------------------------------
  fastify.get(
    '/settings/users',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.companyId, companyId))
        .orderBy(desc(users.createdAt))

      return reply.send({ data: rows })
    },
  )

  // -------------------------------------------------------------------------
  // POST /api/settings/users
  // -------------------------------------------------------------------------
  fastify.post(
    '/settings/users',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const body = validateBody(createUserSchema, request.body)
      const { email, displayName, password, role } = body

      // Check email uniqueness
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (existingUser) {
        return reply.status(409).send({
          error: { code: 'CONFLICT', message: 'A user with this email already exists.' },
        })
      }

      const passwordHash = await hashPassword(password)

      const [created] = await db
        .insert(users)
        .values({
          companyId,
          email,
          displayName,
          passwordHash,
          role: role as 'admin' | 'viewer',
          isActive: true,
        })
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })

      return reply.status(201).send({ data: created })
    },
  )

  // -------------------------------------------------------------------------
  // PATCH /api/settings/users/:id
  // -------------------------------------------------------------------------
  fastify.patch(
    '/settings/users/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId
      const requestingUserId = request.user.sub

      const body = validateBody(updateUserSchema, request.body)

      // Cannot change own role
      if (id === requestingUserId && body.role !== undefined) {
        return reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot change your own role.',
          },
        })
      }

      const [existing] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found.' },
        })
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }

      if (body.role !== undefined) updateData.role = body.role
      if (body.displayName !== undefined) updateData.displayName = body.displayName

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })

      return reply.send({ data: updated })
    },
  )

  // -------------------------------------------------------------------------
  // DELETE /api/settings/users/:id
  // -------------------------------------------------------------------------
  fastify.delete(
    '/settings/users/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId
      const requestingUserId = request.user.sub

      // Cannot delete own account
      if (id === requestingUserId) {
        return reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot delete your own account.',
          },
        })
      }

      const [existing] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found.' },
        })
      }

      // BUG-019 fix: deactivate rather than hard-delete so that foreign key
      // references (activity logs, task comments, etc.) are preserved.
      // Per spec Section 11.2: "Remove User -- sets is_active to false."
      const [deactivated] = await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          isActive: users.isActive,
          updatedAt: users.updatedAt,
        })

      return reply.status(200).send({ data: deactivated })
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/settings/api-keys
  // -------------------------------------------------------------------------
  fastify.get(
    '/settings/api-keys',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      // Return masked view only — never the encrypted value
      const rows = await db
        .select({
          id: apiKeys.id,
          label: apiKeys.name,
          keyPreview: apiKeys.keySuffix,
          provider: apiKeys.provider,
          isActive: apiKeys.isActive,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.companyId, companyId))
        .orderBy(desc(apiKeys.createdAt))

      return reply.send({ data: rows })
    },
  )

  // -------------------------------------------------------------------------
  // POST /api/settings/api-keys
  // -------------------------------------------------------------------------
  fastify.post(
    '/settings/api-keys',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId
      const userId = request.user.sub

      const body = validateBody(createApiKeySchema, request.body)
      const { label, key, provider } = body

      // Encrypt the key for storage
      const encryptedKey = encryptApiKey(key)

      // Store last 8 chars of raw key as preview
      const keyPreview = key.slice(-8)

      const [created] = await db
        .insert(apiKeys)
        .values({
          companyId,
          name: label,
          provider,
          encryptedKey,
          keySuffix: keyPreview,
          isActive: true,
          createdByUserId: userId,
        })
        .returning({
          id: apiKeys.id,
          label: apiKeys.name,
          keyPreview: apiKeys.keySuffix,
          provider: apiKeys.provider,
          isActive: apiKeys.isActive,
          createdAt: apiKeys.createdAt,
        })

      return reply.status(201).send({ data: created })
    },
  )

  // -------------------------------------------------------------------------
  // DELETE /api/settings/api-keys/:id  (soft-delete: set isActive false)
  // -------------------------------------------------------------------------
  fastify.delete(
    '/settings/api-keys/:id',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const companyId = request.user.companyId

      const [existing] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.id, id), eq(apiKeys.companyId, companyId)))
        .limit(1)

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'API key not found.' },
        })
      }

      await db
        .update(apiKeys)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(apiKeys.id, id))

      return reply.status(204).send()
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/settings/budgets
  // -------------------------------------------------------------------------
  fastify.get(
    '/settings/budgets',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId
      const monthYear = currentMonthYear()

      const rows = await db
        .select({
          id: agentBudgets.id,
          agentId: agentBudgets.agentId,
          monthYear: agentBudgets.monthYear,
          budgetUsd: agentBudgets.budgetUsd,
          spentUsd: agentBudgets.spentUsd,
          alertSentAt: agentBudgets.alertSentAt,
          hardStopAt: agentBudgets.hardStopAt,
          createdAt: agentBudgets.createdAt,
          agentName: agents.name,
          roleName: roles.name,
        })
        .from(agentBudgets)
        .innerJoin(agents, eq(agentBudgets.agentId, agents.id))
        .innerJoin(roles, eq(agents.roleId, roles.id))
        .where(
          and(
            eq(agents.companyId, companyId),
            eq(agentBudgets.monthYear, monthYear),
          ),
        )
        .orderBy(desc(agentBudgets.budgetUsd))

      return reply.send({ data: rows })
    },
  )

  // -------------------------------------------------------------------------
  // PATCH /api/settings/budgets/:agentId
  // -------------------------------------------------------------------------
  fastify.patch(
    '/settings/budgets/:agentId',
    { preHandler: requireRole(BOARD_ONLY) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { agentId } = request.params as { agentId: string }
      const companyId = request.user.companyId
      const monthYear = currentMonthYear()

      const body = validateBody(upsertBudgetSchema, request.body)
      const { budgetUsd } = body

      // Verify agent belongs to this company
      const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.companyId, companyId)))
        .limit(1)

      if (!agent) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Agent not found.' },
        })
      }

      // Upsert: update if exists, insert if not
      const [existing] = await db
        .select()
        .from(agentBudgets)
        .where(
          and(
            eq(agentBudgets.agentId, agentId),
            eq(agentBudgets.monthYear, monthYear),
          ),
        )
        .limit(1)

      let result

      if (existing) {
        ;[result] = await db
          .update(agentBudgets)
          .set({ budgetUsd: String(budgetUsd), updatedAt: new Date() })
          .where(eq(agentBudgets.id, existing.id))
          .returning()
      } else {
        ;[result] = await db
          .insert(agentBudgets)
          .values({
            agentId,
            monthYear,
            budgetUsd: String(budgetUsd),
            spentUsd: '0',
          })
          .returning()
      }

      return reply.send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // GET /api/settings/knowledge
  // -------------------------------------------------------------------------
  fastify.get(
    '/settings/knowledge',
    { preHandler: requireRole(BOARD_AND_ADMIN) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.user.companyId

      const rows = await db
        .select({
          id: knowledgeFiles.id,
          name: knowledgeFiles.name,
          tier: knowledgeFiles.tier,
          roleId: knowledgeFiles.roleId,
          projectId: knowledgeFiles.projectId,
          contentPath: knowledgeFiles.contentPath,
          description: knowledgeFiles.description,
          tokenEstimate: knowledgeFiles.tokenEstimate,
          lastSyncedAt: knowledgeFiles.lastSyncedAt,
          createdAt: knowledgeFiles.createdAt,
          updatedAt: knowledgeFiles.updatedAt,
          roleName: roles.name,
          projectName: projects.name,
        })
        .from(knowledgeFiles)
        .leftJoin(roles, eq(knowledgeFiles.roleId, roles.id))
        .leftJoin(projects, eq(knowledgeFiles.projectId, projects.id))
        .where(eq(knowledgeFiles.companyId, companyId))
        .orderBy(knowledgeFiles.tier, knowledgeFiles.name)

      // Group by tier
      const tier1 = rows.filter((r) => r.tier === 'tier_1')

      // Tier 2: group by role name
      const tier2Map: Record<string, typeof rows> = {}
      for (const row of rows.filter((r) => r.tier === 'tier_2')) {
        const key = row.roleName ?? row.roleId ?? 'unknown'
        if (!tier2Map[key]) tier2Map[key] = []
        tier2Map[key].push(row)
      }

      // Tier 3: group by project name
      const tier3Map: Record<string, typeof rows> = {}
      for (const row of rows.filter((r) => r.tier === 'tier_3')) {
        const key = row.projectName ?? row.projectId ?? 'unknown'
        if (!tier3Map[key]) tier3Map[key] = []
        tier3Map[key].push(row)
      }

      return reply.send({
        data: {
          tier1,
          tier2: tier2Map,
          tier3: tier3Map,
        },
      })
    },
  )
}
