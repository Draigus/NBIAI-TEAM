/**
 * Approval queue routes.
 *
 * GET    /api/v1/approvals         — list pending approvals (board/admin only)
 * GET    /api/v1/approvals/:id     — get full approval detail with content
 * PATCH  /api/v1/approvals/:id     — approve, reject, or request changes (board/admin only)
 *
 * Approval types require Glen's explicit action before the agent may proceed.
 * On PATCH, the associated agent execution is either resumed or cancelled.
 *
 * TODO: implement
 */

import type { FastifyInstance } from 'fastify'

export async function approvalRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: implement approval queue endpoints
}
