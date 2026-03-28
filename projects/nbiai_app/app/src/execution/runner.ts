/**
 * Agent Execution Runner — the main orchestrator for a single agent run.
 *
 * Ties together context loading, Claude API call, budget enforcement,
 * task checkout/checkin, execution record management, and real-time
 * notifications.
 *
 * Step-by-step flow (matches technical architecture Section 3.2):
 *
 *  1.  Load agent. Abort if not found, terminated, or paused.
 *  2.  Check budget. Return budget_blocked if cap reached.
 *  3.  Determine task (from taskId, current_task_id, or oldest 'assigned' task).
 *  4.  Attempt task checkout (atomic INSERT with partial unique index).
 *  5.  Create agent_executions record (status: 'running').
 *  6.  Set agent status to 'running'. Update heartbeat.
 *  7.  Load three-tier context.
 *  8.  Call Claude API.
 *  9.  Record spend.
 * 10.  Update execution record (completed, tokens, cost, output).
 * 11.  Update task status (assigned → in_progress, save output).
 * 12.  Release checkout.
 * 13.  Set agent status back to 'active'. Update heartbeat.
 * 14.  Write activity_log entry.
 * 15.  NOTIFY via PostgreSQL LISTEN/NOTIFY for WebSocket broadcast.
 * 16.  Return RunResult.
 *
 * On any error in steps 7-14: mark execution failed, release checkout,
 * set agent idle, write activity_log, return failed result.
 */

import { eq, and, asc } from 'drizzle-orm'

import { db, pool } from '../db/index.js'
import {
  agents,
  roles,
  tasks,
  taskCheckouts,
  agentExecutions,
  agentHeartbeats,
  activityLog,
} from '../db/schema.js'
import { loadAgentContext } from './context-loader.js'
import { runAgent, MODEL_IDS } from './claude-client.js'
import { checkBudget, recordSpend } from './budget.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunOptions {
  agentId: string
  taskId: string | null
  triggeredBy: 'heartbeat' | 'manual' | 'assignment'
  companyId: string
}

export interface RunResult {
  executionId: string
  status: 'completed' | 'failed' | 'budget_blocked' | 'no_task'
  output?: string
  error?: string
  costUsd?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write an activity log entry without throwing on failure. */
async function logActivity(
  companyId: string,
  eventType: string,
  title: string,
  agentId: string,
  taskId?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(activityLog).values({
      companyId,
      eventType,
      agentId,
      taskId: taskId ?? null,
      title,
      metadata: metadata ?? null,
    })
  } catch (err) {
    console.error('[runner] Failed to write activity_log:', err)
  }
}

/** Upsert the agent heartbeat record. */
async function updateHeartbeat(
  agentId: string,
  executionId?: string | null,
  taskId?: string | null,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO agent_heartbeats (id, agent_id, last_seen_at, last_execution_id, last_task_id, updated_at)
       VALUES (gen_random_uuid(), $1, now(), $2, $3, now())
       ON CONFLICT (agent_id)
       DO UPDATE SET
         last_seen_at      = now(),
         last_execution_id = COALESCE($2, agent_heartbeats.last_execution_id),
         last_task_id      = COALESCE($3, agent_heartbeats.last_task_id),
         updated_at        = now()`,
      [agentId, executionId ?? null, taskId ?? null],
    )
  } catch (err) {
    console.error('[runner] Failed to update agent_heartbeats:', err)
  }
}

/** Emit a PostgreSQL NOTIFY event for the WebSocket broadcast layer. */
async function notifyAgentActivity(
  agentId: string,
  taskId: string | null,
  status: string,
  executionId?: string,
): Promise<void> {
  try {
    const payload = JSON.stringify({ agentId, taskId, status, executionId })
    await pool.query("SELECT pg_notify('agent_activity', $1)", [payload])
  } catch (err) {
    // Non-fatal — the WebSocket layer will recover on the next event
    console.error('[runner] pg_notify failed:', err)
  }
}

/** Release a task checkout by setting checked_in_at and outcome. */
async function releaseCheckout(
  taskId: string,
  agentId: string,
  outcome: 'completed' | 'failed' | 'released',
): Promise<void> {
  try {
    await pool.query(
      `UPDATE task_checkouts
       SET checked_in_at = now(), outcome = $3
       WHERE task_id = $1
         AND agent_id = $2
         AND checked_in_at IS NULL`,
      [taskId, agentId, outcome],
    )
  } catch (err) {
    console.error('[runner] Failed to release task checkout:', err)
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runAgentExecution(options: RunOptions): Promise<RunResult> {
  const { agentId, triggeredBy, companyId } = options
  let taskId = options.taskId

  // -------------------------------------------------------------------------
  // Step 1: Load agent
  // -------------------------------------------------------------------------

  const agentRows = await db
    .select({
      id: agents.id,
      name: agents.name,
      status: agents.status,
      currentTaskId: agents.currentTaskId,
      modelTier: agents.modelTier,
      roleSlug: roles.slug,
    })
    .from(agents)
    .innerJoin(roles, eq(agents.roleId, roles.id))
    .where(eq(agents.id, agentId))
    .limit(1)

  if (agentRows.length === 0) {
    console.warn(`[runner] Agent not found: ${agentId}`)
    return { executionId: '', status: 'failed', error: 'Agent not found' }
  }

  const agent = agentRows[0]

  if (agent.status === 'terminated' || agent.status === 'paused') {
    console.info(`[runner] Agent ${agent.name} is ${agent.status} — skipping execution`)
    return { executionId: '', status: 'failed', error: `Agent is ${agent.status}` }
  }

  // -------------------------------------------------------------------------
  // Step 2: Budget check
  // -------------------------------------------------------------------------

  const budget = await checkBudget(agentId)

  if (!budget.allowed) {
    console.warn(`[runner] Budget blocked for agent ${agent.name}: ${budget.reason}`)

    await logActivity(
      companyId,
      'budget_blocked',
      `Agent ${agent.name} blocked by budget cap (${Math.round(budget.percentUsed)}% used)`,
      agentId,
      null,
      { percentUsed: budget.percentUsed, reason: budget.reason },
    )

    return {
      executionId: '',
      status: 'budget_blocked',
      error: budget.reason,
    }
  }

  // -------------------------------------------------------------------------
  // Step 3: Determine task
  // -------------------------------------------------------------------------

  if (taskId === null) {
    // Use current_task_id if the agent already has one
    if (agent.currentTaskId) {
      taskId = agent.currentTaskId
    } else {
      // Find oldest 'assigned' task for this agent that is not checked out
      const assignedTasks = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.assignedAgentId, agentId),
            eq(tasks.status, 'assigned'),
          ),
        )
        .orderBy(asc(tasks.createdAt))
        .limit(1)

      if (assignedTasks.length > 0) {
        taskId = assignedTasks[0].id
      }
    }
  }

  if (taskId === null) {
    // No task available — set agent to idle and return
    await db
      .update(agents)
      .set({ status: 'idle', updatedAt: new Date() })
      .where(eq(agents.id, agentId))

    await updateHeartbeat(agentId)

    return { executionId: '', status: 'no_task' }
  }

  // Load task details
  const taskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      projectId: tasks.projectId,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1)

  if (taskRows.length === 0) {
    return { executionId: '', status: 'failed', error: `Task not found: ${taskId}` }
  }

  const task = taskRows[0]

  // -------------------------------------------------------------------------
  // Step 4: Attempt task checkout (atomic INSERT)
  // -------------------------------------------------------------------------

  try {
    await pool.query(
      `INSERT INTO task_checkouts (id, task_id, agent_id, checked_out_at)
       VALUES (gen_random_uuid(), $1, $2, now())`,
      [taskId, agentId],
    )
  } catch (err) {
    // Unique constraint violation on the partial index means another agent
    // has this task checked out right now.
    const pgErr = err as { code?: string }
    if (pgErr.code === '23505') {
      return {
        executionId: '',
        status: 'failed',
        error: 'Task already checked out by another agent',
      }
    }
    throw err
  }

  // -------------------------------------------------------------------------
  // Step 5: Create agent_executions record
  // -------------------------------------------------------------------------

  const modelId = MODEL_IDS[agent.modelTier]

  const executionInsert = await db
    .insert(agentExecutions)
    .values({
      agentId,
      taskId,
      status: 'running',
      modelUsed: modelId,
      startedAt: new Date(),
    })
    .returning({ id: agentExecutions.id })

  const executionId = executionInsert[0].id

  // -------------------------------------------------------------------------
  // Step 6: Set agent status to 'running', update heartbeat
  // -------------------------------------------------------------------------

  await db
    .update(agents)
    .set({ status: 'running', currentTaskId: taskId, updatedAt: new Date() })
    .where(eq(agents.id, agentId))

  await updateHeartbeat(agentId, executionId, taskId)
  await notifyAgentActivity(agentId, taskId, 'running', executionId)

  // -------------------------------------------------------------------------
  // Steps 7-14: Core execution with error handling
  // -------------------------------------------------------------------------

  const executionStartMs = Date.now()

  try {
    // Step 7: Load context
    const context = await loadAgentContext(agentId, taskId)

    // Step 8: Call Claude API
    const result = await runAgent({
      agentId,
      taskId,
      context,
      modelTier: agent.modelTier,
    })

    // Step 9: Record spend
    await recordSpend(agentId, result.costUsd)

    // Step 10: Update execution record
    const durationMs = Date.now() - executionStartMs

    await db
      .update(agentExecutions)
      .set({
        status: 'completed',
        endedAt: new Date(),
        durationMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.costUsd.toFixed(6),
        log: [{ output: result.content, stopReason: result.stopReason }] as unknown as Record<string, unknown>[],
      })
      .where(eq(agentExecutions.id, executionId))

    // Step 11: Update task
    if (task.status === 'assigned') {
      await db
        .update(tasks)
        .set({
          status: 'in_progress',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
    }

    if (result.content) {
      await db
        .update(tasks)
        .set({ output: result.content, updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
    }

    // Step 12: Release checkout
    await releaseCheckout(taskId, agentId, 'completed')

    // Step 13: Set agent back to 'active', clear current task, update heartbeat
    await db
      .update(agents)
      .set({ status: 'active', currentTaskId: null, updatedAt: new Date() })
      .where(eq(agents.id, agentId))

    await updateHeartbeat(agentId, executionId, taskId)

    // Step 14: Write activity_log
    await logActivity(
      companyId,
      'agent_execution_complete',
      `Agent ${agent.name} completed task ${task.title}`,
      agentId,
      taskId,
      {
        executionId,
        triggeredBy,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.costUsd,
      },
    )

    // Step 15: Emit NOTIFY
    await notifyAgentActivity(agentId, taskId, 'completed', executionId)

    // Step 16: Return result
    return {
      executionId,
      status: 'completed',
      output: result.content,
      costUsd: result.costUsd,
    }
  } catch (err) {
    // -----------------------------------------------------------------------
    // Error path: mark execution failed, release checkout, set agent idle
    // -----------------------------------------------------------------------

    const errorMessage = err instanceof Error ? err.message : String(err)
    const durationMs = Date.now() - executionStartMs

    console.error(`[runner] Execution failed for agent ${agent.name}:`, errorMessage)

    // Mark execution failed
    try {
      await db
        .update(agentExecutions)
        .set({
          status: 'failed',
          endedAt: new Date(),
          durationMs,
          errorMessage,
        })
        .where(eq(agentExecutions.id, executionId))
    } catch (updateErr) {
      console.error('[runner] Failed to mark execution as failed:', updateErr)
    }

    // Release checkout
    await releaseCheckout(taskId, agentId, 'failed')

    // Set agent to idle
    try {
      await db
        .update(agents)
        .set({ status: 'idle', currentTaskId: null, updatedAt: new Date() })
        .where(eq(agents.id, agentId))
    } catch (statusErr) {
      console.error('[runner] Failed to reset agent status to idle:', statusErr)
    }

    await updateHeartbeat(agentId, executionId, taskId)

    // Write activity log
    await logActivity(
      companyId,
      'agent_execution_failed',
      `Agent ${agent.name} failed on task ${task.title}: ${errorMessage}`,
      agentId,
      taskId,
      { executionId, errorMessage, triggeredBy },
    )

    await notifyAgentActivity(agentId, taskId, 'failed', executionId)

    return {
      executionId,
      status: 'failed',
      error: errorMessage,
    }
  }
}
