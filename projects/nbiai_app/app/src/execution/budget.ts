/**
 * Budget enforcement -- REMOVED (no-API architecture, 2026-03-28).
 *
 * Per-token budget caps and USD spend tracking are not applicable to the
 * no-API architecture. Glen pays £180/month flat for Claude Max.
 * There is no per-token billing to enforce against.
 *
 * Cost tracking is handled manually via the cost_logs table.
 * See: company/policies/cost_tracking_procedure.md
 *
 * This file is a stub to prevent broken imports during migration.
 */

export interface BudgetCheck {
  allowed: boolean
  reason?: string
  currentSpend: number
  budgetLimit: number | null
  percentUsed: number
}

// No-op stub -- budget enforcement removed in no-API architecture
export async function checkBudget(_agentId: string): Promise<BudgetCheck> {
  return {
    allowed: true,
    currentSpend: 0,
    budgetLimit: null,
    percentUsed: 0,
  }
}

export async function recordSpend(
  _agentId: string,
  _costUsd: number,
): Promise<void> {
  // No-op: no per-token billing
}

export async function sendBudgetAlert(
  _agentId: string,
  _percentUsed: number,
): Promise<void> {
  // No-op: budget alerts removed
}
