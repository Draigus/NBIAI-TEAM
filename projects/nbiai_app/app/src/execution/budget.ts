/**
 * Budget enforcement module.
 *
 * Agents have a configurable monthly USD spend cap stored in agent_budgets.
 * This module handles three concerns:
 *
 *   checkBudget   — pre-execution gate: is this agent allowed to run?
 *   recordSpend   — post-execution: add the cost to this month's running total.
 *   sendBudgetAlert — triggered at 80% threshold: writes an activity_log entry.
 *
 * Race condition mitigation: checkBudget uses SELECT ... FOR UPDATE to acquire
 * a row-level lock. This prevents two concurrent executions for the same agent
 * from both passing the budget check when the balance is near the cap.
 * (CEO review note, Section "Budget enforcement race condition".)
 *
 * The current month key is 'YYYY-MM' (e.g. '2026-03').
 */

import { eq, and, sql } from 'drizzle-orm'

import { db, pool } from '../db/index.js'
import { agentBudgets, agents, activityLog } from '../db/schema.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetCheck {
  /** True if the agent may proceed with execution. */
  allowed: boolean
  /** Human-readable explanation if not allowed. */
  reason?: string
  /** Current month's spend in USD. */
  currentSpend: number
  /** Budget cap in USD (null = no cap). */
  budgetLimit: number | null
  /** Spend as a percentage of the cap (0-100+). 0 if no cap. */
  percentUsed: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the current calendar month in 'YYYY-MM' format. */
function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

// ---------------------------------------------------------------------------
// checkBudget
// ---------------------------------------------------------------------------

/**
 * Check whether the agent has remaining budget to run this month.
 *
 * Uses a raw SQL transaction with SELECT ... FOR UPDATE to lock the budget
 * row and prevent race conditions with concurrent executions.
 *
 * If no budget record exists for the current month, execution is allowed
 * (no cap configured).
 */
export async function checkBudget(agentId: string): Promise<BudgetCheck> {
  const monthYear = currentMonthKey()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Acquire a row-level lock on the budget record for this agent + month.
    // If no row exists, the query returns zero rows → no cap → allowed.
    const result = await client.query<{
      id: string
      budget_usd: string
      spent_usd: string
      alert_sent_at: string | null
    }>(
      `SELECT id, budget_usd, spent_usd, alert_sent_at
       FROM agent_budgets
       WHERE agent_id = $1
         AND month_year = $2
       FOR UPDATE`,
      [agentId, monthYear],
    )

    await client.query('COMMIT')

    if (result.rows.length === 0) {
      // No budget record → no cap → always allowed
      return {
        allowed: true,
        currentSpend: 0,
        budgetLimit: null,
        percentUsed: 0,
      }
    }

    const row = result.rows[0]
    const budgetUsd = parseFloat(row.budget_usd)
    const spentUsd = parseFloat(row.spent_usd)
    const percentUsed = budgetUsd > 0 ? (spentUsd / budgetUsd) * 100 : 0

    if (spentUsd >= budgetUsd) {
      return {
        allowed: false,
        reason: `Monthly budget cap of $${budgetUsd.toFixed(2)} USD has been reached (spent: $${spentUsd.toFixed(2)} USD).`,
        currentSpend: spentUsd,
        budgetLimit: budgetUsd,
        percentUsed,
      }
    }

    return {
      allowed: true,
      currentSpend: spentUsd,
      budgetLimit: budgetUsd,
      percentUsed,
    }
  } catch (err) {
    try { await client.query('ROLLBACK') } catch {}
    throw err
  } finally {
    client.release()
  }
}

// ---------------------------------------------------------------------------
// recordSpend
// ---------------------------------------------------------------------------

/**
 * Add `costUsd` to the agent's current month running total.
 *
 * If no budget record exists for the current month, upserts one with a
 * null budget cap (spend-tracking only, no enforcement).
 *
 * After updating, checks if the 80% alert threshold has been crossed and has
 * not yet been sent — if so, calls sendBudgetAlert.
 */
export async function recordSpend(agentId: string, costUsd: number): Promise<void> {
  const monthYear = currentMonthKey()

  // Upsert the budget record, adding the new cost to spent_usd.
  // ON CONFLICT uses the unique index on (agent_id, month_year).
  await pool.query(
    `INSERT INTO agent_budgets (id, agent_id, month_year, budget_usd, spent_usd, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 0, $3, now(), now())
     ON CONFLICT (agent_id, month_year)
     DO UPDATE SET
       spent_usd   = agent_budgets.spent_usd + EXCLUDED.spent_usd,
       updated_at  = now()`,
    [agentId, monthYear, costUsd],
  )

  // Reload the updated record to check the alert threshold
  const result = await pool.query<{
    budget_usd: string
    spent_usd: string
    alert_sent_at: string | null
  }>(
    `SELECT budget_usd, spent_usd, alert_sent_at
     FROM agent_budgets
     WHERE agent_id = $1
       AND month_year = $2`,
    [agentId, monthYear],
  )

  if (result.rows.length === 0) return

  const row = result.rows[0]
  const budgetUsd = parseFloat(row.budget_usd)
  const spentUsd = parseFloat(row.spent_usd)

  // Only trigger the alert if a cap is set (budget_usd > 0), spend has
  // crossed 80%, and the alert has not been sent yet this month.
  if (budgetUsd > 0 && spentUsd >= budgetUsd * 0.8 && row.alert_sent_at === null) {
    const percentUsed = (spentUsd / budgetUsd) * 100
    await sendBudgetAlert(agentId, percentUsed)

    // Mark the alert as sent
    await pool.query(
      `UPDATE agent_budgets
       SET alert_sent_at = now(), updated_at = now()
       WHERE agent_id = $1
         AND month_year = $2`,
      [agentId, monthYear],
    )
  }
}

// ---------------------------------------------------------------------------
// sendBudgetAlert
// ---------------------------------------------------------------------------

/**
 * Log a budget alert to the console and write an activity_log entry.
 *
 * This is an informational alert — it does not stop execution. The hard stop
 * is enforced by checkBudget when spend >= 100%.
 *
 * Requires the agent record to look up the agent name for the log message.
 */
export async function sendBudgetAlert(agentId: string, percentUsed: number): Promise<void> {
  // Look up agent name and company ID for the activity log entry
  const agentRows = await db
    .select({
      name: agents.name,
      companyId: agents.companyId,
    })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1)

  const agentName = agentRows.length > 0 ? agentRows[0].name : agentId
  const companyId = agentRows.length > 0 ? agentRows[0].companyId : null

  const percent = Math.round(percentUsed)
  const description = `Agent ${agentName} has used ${percent}% of monthly budget`

  console.warn(`[budget] ALERT: ${description}`)

  if (companyId === null) {
    console.warn(`[budget] Cannot write activity_log: companyId not found for agent ${agentId}`)
    return
  }

  // Write to activity_log
  await db.insert(activityLog).values({
    companyId,
    eventType: 'budget_alert',
    agentId,
    title: description,
    metadata: { percentUsed: percent },
  })
}
