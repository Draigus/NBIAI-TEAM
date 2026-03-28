/**
 * Leads and Clients routes.
 *
 * Pipeline leads:
 * GET    /api/v1/leads              — list pipeline leads by stage
 * POST   /api/v1/leads              — create a lead (admin/board only)
 * PATCH  /api/v1/leads/:id          — update lead stage, contact info, next action
 * DELETE /api/v1/leads/:id          — remove a lead (board only)
 *
 * Active clients:
 * GET    /api/v1/clients            — list active clients with health status
 * POST   /api/v1/clients            — create a client record (board/admin only)
 * GET    /api/v1/clients/:id        — get a client with full detail
 * PATCH  /api/v1/clients/:id        — update client fields
 *
 * TODO: implement
 */

import type { FastifyInstance } from 'fastify'

export async function clientRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: implement pipeline leads and active client endpoints
}
