/**
 * Claude API client -- REMOVED (no-API architecture, 2026-03-28).
 *
 * The NBIAI App makes zero calls to the Anthropic API.
 * Agent execution runs through Claude Desktop sessions on Glen's Max plan (£180/month flat).
 * See: company/knowledge/strategic_decisions.md -- "NBIAI App: zero Anthropic API"
 *
 * This file is a stub to prevent broken imports while the codebase is migrated.
 * Sprint 2 will add the queue-based execution routes that replace this layer.
 */

export const MODEL_IDS = {
  opus: 'claude-opus-4-5-20251101',
  sonnet: 'claude-sonnet-4-5',
  haiku: 'claude-haiku-4-5-20251001',
} as const

export type ModelTierKey = keyof typeof MODEL_IDS

// No-op stub -- this function is never called in the no-API architecture.
// The queue-based flow (Sprint 2) assembles prompts into JSON files for
// Claude Desktop, not API calls.
export async function runAgent(_input: unknown): Promise<never> {
  throw new Error(
    '[claude-client] Direct API execution is not supported in the no-API architecture. ' +
    'Use the queue-based flow: create a task, queue it, run via Claude Desktop, post results back.',
  )
}
