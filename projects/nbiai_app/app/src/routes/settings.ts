/**
 * Settings routes.
 *
 * GET    /api/v1/settings/company        — get company settings (board/admin only)
 * PATCH  /api/v1/settings/company        — update company settings (board only)
 *
 * API key management:
 * GET    /api/v1/settings/api-keys       — list API keys (suffix only, never full key)
 * POST   /api/v1/settings/api-keys       — add an API key (board only; encrypts with AES-256-GCM)
 * DELETE /api/v1/settings/api-keys/:id   — remove an API key (board only)
 * PATCH  /api/v1/settings/api-keys/:id   — update label or active status (board only)
 *
 * User management:
 * GET    /api/v1/settings/users          — list users (admin/board only)
 * POST   /api/v1/settings/users          — invite a new user (board only)
 * PATCH  /api/v1/settings/users/:id      — update role or active status (board only)
 *
 * Knowledge files:
 * GET    /api/v1/settings/knowledge      — list registered knowledge files
 * POST   /api/v1/settings/knowledge      — register a knowledge file
 * DELETE /api/v1/settings/knowledge/:id  — deregister a knowledge file
 *
 * TODO: implement
 */

import type { FastifyInstance } from 'fastify'

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: implement company settings, API key management, users, and knowledge file endpoints
}
