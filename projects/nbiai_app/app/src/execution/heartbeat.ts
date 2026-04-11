/**
 * Agent heartbeat scheduler -- REMOVED (no-API architecture, 2026-03-28).
 *
 * The heartbeat system tracked real-time agent activity during API-based
 * execution. In the no-API architecture, agent activity is tracked via
 * the claude_desktop_sessions table and the file-based task queue.
 *
 * Exports are no-op stubs to prevent broken imports in index.ts during
 * the Sprint 1 → Sprint 2 migration.
 */

export function startHeartbeat(_intervalMs?: number): NodeJS.Timeout {
  // No-op: heartbeat removed in no-API architecture.
  // Returns a timer that fires once in ~24 days (practically never).
  const timer = setInterval(() => {}, 2_147_483_647)
  timer.unref() // Don't prevent process exit
  return timer
}

export function stopHeartbeat(timer: NodeJS.Timeout): void {
  clearInterval(timer)
}
