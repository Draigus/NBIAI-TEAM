/**
 * Dashboard (Command Centre) routes.
 *
 * GET /api/v1/dashboard/summary    — quick stats: open tasks, active agents,
 *                                    pending approvals, goals in progress
 *                                    (4-card layout per CEO-approved design spec)
 * GET /api/v1/dashboard/activity   — recent activity feed with cursor pagination
 * GET /api/v1/dashboard/agents     — real-time agent status feed (heartbeats)
 *
 * The real-time layer (PostgreSQL LISTEN/NOTIFY -> WebSocket) is registered
 * separately via the WebSocket plugin in src/index.ts.
 *
 * TODO: implement
 */

import type { FastifyInstance } from 'fastify'

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: implement dashboard summary, activity feed, and agent status endpoints
}
