/**
 * Agent management routes.
 *
 * GET    /api/v1/agents           — list all agents for the company
 * GET    /api/v1/agents/:id       — get a single agent with current task and heartbeat
 * PATCH  /api/v1/agents/:id       — update agent status, model tier, persona override
 * GET    /api/v1/agents/:id/executions — execution history for an agent
 * GET    /api/v1/agents/:id/budget     — current month budget and spend
 *
 * TODO: implement
 */

import type { FastifyInstance } from 'fastify'

export async function agentRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: implement agent CRUD and execution history endpoints
}
