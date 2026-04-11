/**
 * Agent execution runner -- REPLACED (no-API architecture, 2026-03-28).
 *
 * The original runner orchestrated direct Claude API calls. In the no-API
 * architecture, agent execution runs through Claude Desktop sessions.
 *
 * Sprint 2 will add:
 *   - POST /api/v1/queue/results  (Glen posts Claude Desktop output back to app)
 *   - Queue screen showing tasks in inbox/active/review/done
 *   - Session creation and task queueing endpoints
 *
 * This stub exports a no-op function so existing imports compile during
 * the Sprint 1 completion phase.
 */

export interface RunResult {
  success: boolean
  message: string
}

// No-op stub -- the trigger execution endpoint in routes/executions.ts
// returns 501 in the no-API architecture. See that file for details.
export async function runAgentExecution(
  _agentId: string,
  _taskId: string | null,
): Promise<RunResult> {
  return {
    success: false,
    message:
      'Direct API execution is not supported. Use the Queue screen to assemble and dispatch tasks via Claude Desktop.',
  }
}
