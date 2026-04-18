/**
 * Role-based access control (RBAC) constants and action permission map.
 *
 * The three roles in ascending privilege order are:
 *   viewer  — read-only access to the app
 *   admin   — operational control: manage agents, tasks, budgets, clients
 *   board   — full control including financial approvals and strategic decisions
 *
 * Use the `can()` helper in route handlers to gate specific actions:
 *
 *   if (!can(request.user.role, 'approve_actions')) {
 *     return reply.status(403).send({ error: { code: 'FORBIDDEN', message: '...' } })
 *   }
 */

import type { UserRole } from '../types/index.js'

// ---------------------------------------------------------------------------
// Role set constants
// ---------------------------------------------------------------------------

/** Only the board-level user may perform this action. */
export const BOARD_ONLY: UserRole[] = ['board']

/** Board and admin users may perform this action. */
export const BOARD_AND_ADMIN: UserRole[] = ['board', 'admin']

/** All authenticated users may perform this action. */
export const ALL_ROLES: UserRole[] = ['board', 'admin', 'viewer']

// ---------------------------------------------------------------------------
// Action permission map
// ---------------------------------------------------------------------------

/**
 * Maps a named action string to the set of roles that are permitted to
 * perform it.
 *
 * Keeping the map here (rather than inline in each route) means permission
 * changes only need to be made in one place and are easily auditable.
 */
const ACTION_PERMISSIONS: Record<string, UserRole[]> = {
  // Requires Glen's explicit approval; board only
  approve_actions: BOARD_ONLY,

  // User and team management
  manage_users: BOARD_ONLY,

  // Financial control
  manage_budgets: BOARD_ONLY,

  // API key management (service integrations)
  manage_api_keys: BOARD_ONLY,

  // Agent lifecycle management
  fire_agents: BOARD_AND_ADMIN,
  hire_agents: BOARD_AND_ADMIN,

  // Task and work management
  create_tasks: BOARD_AND_ADMIN,

  // Finance visibility
  view_finance: BOARD_AND_ADMIN,

  // Read access — all authenticated users
  view_all: ALL_ROLES,
}

// ---------------------------------------------------------------------------
// Permission check helper
// ---------------------------------------------------------------------------

/**
 * Returns true if `role` is permitted to perform `action`.
 *
 * Unknown actions default to BOARD_ONLY — fail secure.
 */
export function can(role: string, action: string): boolean {
  const permitted = ACTION_PERMISSIONS[action] ?? BOARD_ONLY
  return (permitted as string[]).includes(role)
}
