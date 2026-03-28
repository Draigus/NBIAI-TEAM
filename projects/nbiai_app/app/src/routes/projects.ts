/**
 * Project management routes.
 *
 * GET    /api/v1/projects           — list projects with task counts and health
 * POST   /api/v1/projects           — create a project (admin/board only)
 * GET    /api/v1/projects/:id       — get a project with tasks and agents
 * PATCH  /api/v1/projects/:id       — update project fields
 * DELETE /api/v1/projects/:id       — archive a project (board only)
 * GET    /api/v1/projects/:id/tasks — tasks for a project with pagination
 *
 * TODO: implement
 */

import type { FastifyInstance } from 'fastify'

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: implement project CRUD and task list endpoints
}
