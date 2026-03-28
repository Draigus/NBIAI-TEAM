/**
 * Heartbeat scheduler.
 *
 * Runs on a configurable setInterval (default: 60 seconds). On each tick:
 *
 *  1. Queries all agents with status 'active' or 'idle' (not terminated or paused).
 *  2. For each agent that has a current_task_id or an 'assigned' task waiting,
 *     calls runAgentExecution with triggeredBy: 'heartbeat'.
 *  3. Agents are processed sequentially to avoid concurrent API hammering.
 *  4. Updates agent_heartbeats.last_seen_at for all checked agents regardless
 *     of whether they ran (confirms they are still alive).
 *  5. Logs a summary line: "Heartbeat: checked {n} agents, ran {m} executions"
 *
 * The scheduler runs in the main Node.js process. If the process restarts,
 * the scheduler resumes on boot. Queued-but-not-started executions are lost
 * on crash and re-triggered by the next heartbeat tick (per architecture note).
 *
 * Usage in index.ts:
 *   import { startHeartbeat, stopHeartbeat } from './execution/heartbeat.js'
 *   const heartbeatTimer = startHeartbeat()
 *   // On shutdown:
 *   stopHeartbeat(heartbeatTimer)
 */

import { eq, or, and, inArray } from 'drizzle-orm'

import { db, pool } from '../db/index.js'
import { agents, tasks } from '../db/schema.js'
import { runAgentExecution } from './runner.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Summary of a single heartbeat tick. */
interface HeartbeatTick {
  checkedAgents: number
  ranExecutions: number
  errors: number
}

// ---------------------------------------------------------------------------
// Tick handler
// ---------------------------------------------------------------------------

async function tick(): Promise<HeartbeatTick> {
  const result: HeartbeatTick = { checkedAgents: 0, ranExecutions: 0, errors: 0 }

  // Load all active/idle agents that are not terminated or paused
  const activeAgents = await db
    .select({
      id: agents.id,
      name: agents.name,
      status: agents.status,
      currentTaskId: agents.currentTaskId,
      companyId: agents.companyId,
    })
    .from(agents)
    .where(
      or(
        eq(agents.status, 'active'),
        eq(agents.status, 'idle'),
      ),
    )

  result.checkedAgents = activeAgents.length

  if (activeAgents.length === 0) {
    return result
  }

  // Collect agent IDs for the heartbeat update at the end
  const agentIds = activeAgents.map((a) => a.id)

  // Check which agents have pending work:
  // - agent.current_task_id is set (already on a task)
  // - OR there exists an 'assigned' task for this agent
  const agentsWithAssignedTasks = await db
    .select({ assignedAgentId: tasks.assignedAgentId })
    .from(tasks)
    .where(
      and(
        eq(tasks.status, 'assigned'),
        inArray(tasks.assignedAgentId, agentIds),
      ),
    )

  const agentIdsWithAssignedWork = new Set(
    agentsWithAssignedTasks
      .map((t) => t.assignedAgentId)
      .filter((id): id is string => id !== null),
  )

  // Build the list of agents that should run this tick
  const agentsToRun = activeAgents.filter(
    (a) => a.currentTaskId !== null || agentIdsWithAssignedWork.has(a.id),
  )

  // Run agents sequentially to avoid concurrent API calls hammering rate limits
  for (const agent of agentsToRun) {
    // Skip agents that are currently marked 'running' — they are already in flight
    if (agent.status === 'running') continue

    try {
      const runResult = await runAgentExecution({
        agentId: agent.id,
        taskId: agent.currentTaskId ?? null,
        triggeredBy: 'heartbeat',
        companyId: agent.companyId,
      })

      if (runResult.status === 'completed') {
        result.ranExecutions++
      } else if (runResult.status === 'failed') {
        result.errors++
      }
    } catch (err) {
      result.errors++
      console.error(`[heartbeat] Unhandled error running agent ${agent.name}:`, err)
    }
  }

  // Update last_seen_at for all checked agents (confirms they are alive, even
  // if they had nothing to do this tick)
  if (agentIds.length > 0) {
    try {
      // Bulk upsert heartbeat timestamps using raw SQL for efficiency
      const placeholders = agentIds.map((_, i) => `($${i + 1})`).join(', ')
      await pool.query(
        `INSERT INTO agent_heartbeats (id, agent_id, last_seen_at, updated_at)
         VALUES ${agentIds.map((id, i) => `(gen_random_uuid(), $${i + 1}, now(), now())`).join(', ')}
         ON CONFLICT (agent_id)
         DO UPDATE SET
           last_seen_at = now(),
           updated_at   = now()`,
        agentIds,
      )
      void placeholders // suppress unused-var lint
    } catch (err) {
      console.error('[heartbeat] Failed to bulk-update heartbeats:', err)
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/**
 * Start the heartbeat scheduler.
 *
 * @param intervalMs - How often to run the tick, in milliseconds. Default: 60,000 (1 minute).
 * @returns The NodeJS.Timeout handle. Pass this to stopHeartbeat() on shutdown.
 */
export function startHeartbeat(intervalMs: number = 60_000): NodeJS.Timeout {
  console.info(`[heartbeat] Starting scheduler (interval: ${intervalMs}ms)`)

  const timer = setInterval(async () => {
    try {
      const summary = await tick()
      console.info(
        `[heartbeat] Checked ${summary.checkedAgents} agents, ` +
        `ran ${summary.ranExecutions} executions, ` +
        `${summary.errors} error(s)`,
      )
    } catch (err) {
      console.error('[heartbeat] Tick failed with unhandled error:', err)
    }
  }, intervalMs)

  // Allow the process to exit even if the timer is still running
  timer.unref()

  return timer
}

/**
 * Stop the heartbeat scheduler.
 *
 * @param timer - The handle returned by startHeartbeat().
 */
export function stopHeartbeat(timer: NodeJS.Timeout): void {
  clearInterval(timer)
  console.info('[heartbeat] Scheduler stopped')
}
