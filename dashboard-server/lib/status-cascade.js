'use strict';

// lib/status-cascade.js — upward activation roll-up (bug c2c2b046).
//
// Statuses that mean "work has begun". When any task moves into one of these,
// every ancestor still sitting at 'Not started' must become active too —
// a project must never read "Not started" while its descendants are underway.
const ACTIVATION_STATUSES = ['Planning', 'In progress', 'In Review', 'Drafted'];

/**
 * Activate all 'Not started' ancestors of a task. Mapping: child Planning ->
 * ancestor Planning; anything stronger (In progress / In Review / Drafted) ->
 * ancestor In progress. Ancestors in any other status (Done, Blocked,
 * Cancelled, or an already-active state) are never touched, and there is no
 * reverse roll-up when a child reverts to Not started.
 *
 * @param {object} conn - pg Pool or client (both expose .query)
 * @param {string} taskId - the task that just became active
 * @param {string} childStatus - the new active status of that task
 * @returns {Promise<Array<{id: string, updated_at: Date}>>} updated ancestor rows
 *   (callers should surface these timestamps to clients so optimistic-concurrency
 *   metadata stays fresh, and write their own audit entry)
 */
async function rollUpActivation(conn, taskId, childStatus) {
  const target = childStatus === 'Planning' ? 'Planning' : 'In progress';
  const { rows } = await conn.query(`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM tasks WHERE id = (SELECT parent_id FROM tasks WHERE id = $1)
      UNION ALL
      SELECT t.id, t.parent_id FROM tasks t INNER JOIN ancestors a ON t.id = a.parent_id
    )
    UPDATE tasks SET status = $2, updated_at = NOW()
    WHERE id IN (SELECT id FROM ancestors) AND status = 'Not started'
    RETURNING id, updated_at
  `, [taskId, target]);
  return rows;
}

module.exports = { ACTIVATION_STATUSES, rollUpActivation };
