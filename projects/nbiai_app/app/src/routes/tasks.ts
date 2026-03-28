/**
 * Task management routes.
 *
 * GET    /api/v1/tasks              — list tasks with filters (status, project, agent)
 * POST   /api/v1/tasks              — create a task (admin/board only)
 * GET    /api/v1/tasks/:id          — get a task with comments and checkout state
 * PATCH  /api/v1/tasks/:id          — update task fields (respects status transition matrix)
 * DELETE /api/v1/tasks/:id          — cancel a task (board only)
 * GET    /api/v1/tasks/:id/comments — paginated comment and activity thread
 * POST   /api/v1/tasks/:id/comments — add a comment (board/admin only; agents write via execution)
 * POST   /api/v1/tasks/:id/checkout — agent checks out a task (atomic; rejects if already checked out)
 * POST   /api/v1/tasks/:id/checkin  — agent checks in a task with outcome
 *
 * TODO: implement
 */

import type { FastifyInstance } from 'fastify'

export async function taskRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: implement task CRUD, comment thread, and checkout/checkin endpoints
}
