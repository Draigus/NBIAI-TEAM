'use strict';

// Shared work-item creation logic, extracted from routes/tasks.js POST /api/tasks
// so the AIOS executor's internal route enforces the SAME server-side validation
// (hierarchy, status enum, hours, dates) as the dashboard route. Single source of
// truth: a rule added here applies to both entry points.

const { validateLength, isDescendantOrder, getActiveLevels, getActiveChildType,
        VALID_CHILD_TYPE, ITEM_TYPES, shiftForInsert } = require('./helpers');
const { ACTIVATION_STATUSES, rollUpActivation } = require('./status-cascade');

const VALID_STATUSES = ['Not started', 'In progress', 'Planning', 'Drafted', 'In Review', 'Blocked', 'Done', 'Cancelled'];

/**
 * Create a work item with full hierarchy validation.
 * Client-scope authorisation is the CALLER's responsibility (route-specific).
 *
 * @returns {Promise<{ok:true,row:object}|{ok:false,status:number,error:string}>}
 */
async function createWorkItem({ pool, log, auditLog }, payload, actor) {
  const { title, parent_id, client_id, item_type, status, priority, health_state,
          description, assignees, hours_estimated, hours_spent, due_date,
          start_date, end_date, dependencies, planner_task_id, source } = payload || {};

  if (!title) return { ok: false, status: 400, error: 'Title required' };
  const lenErr = validateLength(title, 'title') || validateLength(description, 'description');
  if (lenErr) return { ok: false, status: 400, error: lenErr };

  if (status !== undefined && status !== null && status !== '' && !VALID_STATUSES.includes(status)) {
    return { ok: false, status: 400, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` };
  }

  let parsedHoursEst = 0;
  if (hours_estimated !== undefined && hours_estimated !== null && hours_estimated !== '') {
    parsedHoursEst = Number(hours_estimated);
    if (!Number.isFinite(parsedHoursEst) || parsedHoursEst < 0) {
      return { ok: false, status: 400, error: 'hours_estimated must be a non-negative number' };
    }
  }
  let parsedHoursSpent = 0;
  if (hours_spent !== undefined && hours_spent !== null && hours_spent !== '') {
    parsedHoursSpent = Number(hours_spent);
    if (!Number.isFinite(parsedHoursSpent) || parsedHoursSpent < 0) {
      return { ok: false, status: 400, error: 'hours_spent must be a non-negative number' };
    }
  }

  if (start_date && end_date && start_date > end_date) {
    return { ok: false, status: 400, error: 'start_date must be before or equal to end_date' };
  }

  // Infer or validate item_type against the parent hierarchy (descendant-order rule)
  let resolvedType;
  if (parent_id) {
    const parentResult = await pool.query('SELECT item_type, client_id FROM tasks WHERE id = $1', [parent_id]);
    if (parentResult.rows.length > 0) {
      const parentType = parentResult.rows[0].item_type;
      if (item_type) {
        if (!isDescendantOrder(parentType, item_type)) {
          return { ok: false, status: 400, error: `Cannot place ${item_type} under ${parentType} -- child must be lower in hierarchy` };
        }
        resolvedType = item_type;
      } else {
        const parentClientId = parentResult.rows[0].client_id;
        let clientLevels = null;
        if (parentClientId) {
          const { rows: cRows } = await pool.query('SELECT hierarchy_levels FROM clients WHERE id = $1', [parentClientId]);
          if (cRows.length > 0) clientLevels = cRows[0];
        }
        const activeLevels = getActiveLevels(clientLevels);
        resolvedType = getActiveChildType(parentType, activeLevels) || VALID_CHILD_TYPE[parentType] || 'task';
      }
    }
  } else {
    if (item_type && item_type !== 'initiative') {
      return { ok: false, status: 400, error: `Root items must be initiative type, got ${item_type}` };
    }
    resolvedType = 'initiative';
  }
  if (!ITEM_TYPES.includes(resolvedType)) return { ok: false, status: 400, error: `Invalid item_type: ${resolvedType}` };

  const targetStatus = status || 'Not started';
  const dbClient = await pool.connect();
  let createdRow;
  try {
    await dbClient.query('BEGIN');
    await shiftForInsert(dbClient, 'tasks', 'status', targetStatus);
    const { rows } = await dbClient.query(
      `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, planner_task_id, source, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,0) RETURNING *`,
      [title, parent_id || null, client_id || null, resolvedType, targetStatus, priority || '', health_state || '', description || '',
       assignees || [], parsedHoursEst, parsedHoursSpent, due_date || '', start_date || '', end_date || '', dependencies || [], planner_task_id || '', source || 'manual']
    );
    createdRow = rows[0];
    await dbClient.query('COMMIT');
  } catch (err) {
    try { await dbClient.query('ROLLBACK'); } catch (rbErr) { /* connection-level failure */ }
    log('error', 'WorkItemCreate', 'INSERT failed', { error: err.message, actor });
    return { ok: false, status: 500, error: 'Failed to create task' };
  } finally {
    dbClient.release();
  }

  await auditLog('task', createdRow.id, 'create', actor, { title, item_type: resolvedType });

  // Upward activation roll-up (bug c2c2b046): an item created already-active
  // pulls its 'Not started' ancestors up with it.
  if (createdRow.parent_id && ACTIVATION_STATUSES.includes(createdRow.status)) {
    try {
      const cascaded = await rollUpActivation(pool, createdRow.id, createdRow.status);
      if (cascaded.length > 0) {
        await auditLog('task', createdRow.id, 'cascade_status_up_activate', actor, { count: cascaded.length });
      }
    } catch (e) {
      log('warn', 'WorkItemCreate', 'Activation roll-up on create failed', { error: e.message });
    }
  }

  return { ok: true, row: createdRow };
}

module.exports = { createWorkItem, VALID_STATUSES };
