'use strict';

const VALID_STATUSES_SET = new Set(['Not started', 'Planning', 'In progress', 'Done', 'Blocked', 'Cancelled']);

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid, validateLength, auditLog, buildPatchQuery,
          createNotification, getClientScopes, reorderInGroup, shiftForInsert,
          requireAdmin, requireTaskAccess, computeNextRepeatDate,
          ITEM_TYPES, VALID_CHILD_TYPE } = ctx;

/**
 * GET /api/tasks
 * List tasks with optional filters: client_id, status, assignee.
 * Includes inline task notes as a JSON aggregate and the client name via join.
 */
router.get('/api/tasks', async (req, res) => {
  let { client_id, status, assignee, limit, offset, cursor } = req.query;
  const scopes = await getClientScopes(req);
  if (scopes && scopes.length === 1) { client_id = scopes[0]; } // G5: force single client
  else if (scopes && !client_id) { /* Team visibility: filter applied below */ }
  let where = []; let vals = []; let i = 1;
  if (client_id) { where.push(`t.client_id = $${i}`); vals.push(client_id); i++; }
  else if (scopes && scopes.length > 1) { where.push(`(t.client_id = ANY($${i}) OR t.client_id IS NULL)`); vals.push(scopes); i++; }
  if (status) { where.push(`t.status = $${i}`); vals.push(status); i++; }
  if (assignee) { where.push(`$${i} = ANY(t.assignees)`); vals.push(assignee); i++; }

  // Cursor-based: filter tasks with updated_at before the cursor timestamp
  if (cursor) {
    where.push(`t.updated_at > $${i}`);
    vals.push(cursor);
    i++;
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  // Pagination: default to all rows for backwards compat, but support limit/offset/cursor
  if (cursor || limit) {
    // Paginated mode — use cursor or offset
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedOffset = parseInt(offset) || 0;
    const fetchLimit = parsedLimit + 1; // Fetch one extra to determine hasMore

    vals.push(fetchLimit);
    let paginationClause;
    if (cursor) {
      paginationClause = `LIMIT $${i}`;
    } else {
      vals.push(parsedOffset);
      paginationClause = `LIMIT $${i} OFFSET $${i + 1}`;
    }

    // Count query uses only filter params (no cursor, limit, or offset)
    const countFilterWhere = [];
    const countVals = [];
    let ci = 1;
    if (client_id) { countFilterWhere.push(`t.client_id = $${ci}`); countVals.push(client_id); ci++; }
    if (status) { countFilterWhere.push(`t.status = $${ci}`); countVals.push(status); ci++; }
    if (assignee) { countFilterWhere.push(`$${ci} = ANY(t.assignees)`); countVals.push(assignee); ci++; }
    const countWhere = countFilterWhere.length > 0 ? 'WHERE ' + countFilterWhere.join(' AND ') : '';

    const [{ rows }, countResult] = await Promise.all([
      pool.query(`
        SELECT t.*, c.name as client_name,
          s.title AS sow_title, s.status AS sow_status,
          (SELECT json_agg(json_build_object('id', n.id, 'text', n.text, 'author', n.author, 'created_at', n.created_at) ORDER BY n.created_at)
           FROM task_notes n WHERE n.task_id = t.id) as notes
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN sows s ON s.id = t.sow_id
        ${whereClause}
        ORDER BY t.created_at, t.title, t.id
        ${paginationClause}
      `, vals),
      pool.query(`SELECT count(*) FROM tasks t LEFT JOIN clients c ON t.client_id = c.id ${countWhere}`, countVals)
    ]);

    const hasMore = rows.length > parsedLimit;
    const taskRows = hasMore ? rows.slice(0, parsedLimit) : rows;
    const nextCursor = hasMore && taskRows.length > 0 ? taskRows[taskRows.length - 1].updated_at : null;

    res.json({
      rows: taskRows,
      total: parseInt(countResult.rows[0].count),
      limit: parsedLimit,
      offset: parsedOffset,
      nextCursor,
      hasMore
    });
  } else {
    // No pagination — return all rows (backward compat)
    const { rows } = await pool.query(`
      SELECT t.*, c.name as client_name,
        s.title AS sow_title, s.status AS sow_status,
        (SELECT json_agg(json_build_object('id', n.id, 'text', n.text, 'author', n.author, 'created_at', n.created_at) ORDER BY n.created_at)
         FROM task_notes n WHERE n.task_id = t.id) as notes
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN sows s ON s.id = t.sow_id
      ${whereClause}
      ORDER BY t.created_at, t.title, t.id
    `, vals);
    res.json(rows);
  }
});

/** GET /api/tasks/:id — Get a single task with notes, client name and SoW title */
router.get('/api/tasks/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const { rows } = await pool.query(`
    SELECT t.*, c.name as client_name,
      s.title AS sow_title, s.status AS sow_status,
      (SELECT json_agg(json_build_object('id', n.id, 'text', n.text, 'author', n.author, 'created_at', n.created_at) ORDER BY n.created_at)
       FROM task_notes n WHERE n.task_id = t.id) as notes
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    LEFT JOIN sows s ON s.id = t.sow_id
    WHERE t.id = $1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

/** POST /api/tasks — Create a new task (all authenticated users). Client users are scoped to their own client. Enforces hierarchy: project > feature > story > task. */
router.post('/api/tasks', async (req, res) => {
  let { title, parent_id, client_id, item_type, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, planner_task_id, source } = req.body;
  const scopes = await getClientScopes(req);
  if (scopes && client_id && !scopes.includes(client_id)) return res.status(403).json({ error: 'Cannot create tasks for other clients' });
  if (scopes && scopes.length === 1 && !client_id) client_id = scopes[0]; // Default for G5 users
  if (!title) return res.status(400).json({ error: 'Title required' });
  const lenErr = validateLength(title, 'title') || validateLength(description, 'description');
  if (lenErr) return res.status(400).json({ error: lenErr });

  // Validate status against the canonical enum (matches frontend STATUSES constant).
  const VALID_STATUSES = ['Not started', 'In progress', 'Planning', 'Drafted', 'In Review', 'Blocked', 'Done', 'Cancelled'];
  if (status !== undefined && status !== null && status !== '' && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  // Coerce and validate numeric hour fields up-front so bad input returns 400, not 500.
  let parsedHoursEst = 0;
  if (hours_estimated !== undefined && hours_estimated !== null && hours_estimated !== '') {
    parsedHoursEst = Number(hours_estimated);
    if (!Number.isFinite(parsedHoursEst) || parsedHoursEst < 0) {
      return res.status(400).json({ error: 'hours_estimated must be a non-negative number' });
    }
  }
  let parsedHoursSpent = 0;
  if (hours_spent !== undefined && hours_spent !== null && hours_spent !== '') {
    parsedHoursSpent = Number(hours_spent);
    if (!Number.isFinite(parsedHoursSpent) || parsedHoursSpent < 0) {
      return res.status(400).json({ error: 'hours_spent must be a non-negative number' });
    }
  }

  // Reject start_date after end_date
  if (start_date && end_date && start_date > end_date) {
    return res.status(400).json({ error: 'start_date must be before or equal to end_date' });
  }

  // Infer or validate item_type based on parent hierarchy
  let resolvedType;
  if (parent_id) {
    const parentResult = await pool.query('SELECT item_type FROM tasks WHERE id = $1', [parent_id]);
    if (parentResult.rows.length > 0) {
      const expectedType = VALID_CHILD_TYPE[parentResult.rows[0].item_type];
      if (!expectedType) return res.status(400).json({ error: `Cannot create children under a ${parentResult.rows[0].item_type}` });
      resolvedType = item_type || expectedType;
      if (resolvedType !== expectedType) return res.status(400).json({ error: `Expected ${expectedType} under ${parentResult.rows[0].item_type}, got ${resolvedType}` });
    }
  } else {
    resolvedType = item_type || 'project';
  }
  if (!ITEM_TYPES.includes(resolvedType)) return res.status(400).json({ error: `Invalid item_type: ${resolvedType}` });

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
    await dbClient.query('ROLLBACK');
    log('error', 'Tasks', 'POST failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to create task' });
  } finally {
    dbClient.release();
  }
  await auditLog('task', createdRow.id, 'create', req.user?.displayName, { title, item_type: resolvedType });
  res.status(201).json(createdRow);
});

/**
 * PATCH /api/tasks/:id
 * Update task fields. Compares old and new values to build a detailed
 * audit trail entry showing exactly what changed.
 */
router.patch('/api/tasks/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });

  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;

  // Client users cannot change client_id on tasks
  if (req.user?.clientId && req.body.client_id !== undefined) {
    delete req.body.client_id;
  }

  const lenErr = validateLength(req.body.title, 'title') || validateLength(req.body.description, 'description');
  if (lenErr) return res.status(400).json({ error: lenErr });
  // Validate item_type if provided
  if (req.body.item_type && !ITEM_TYPES.includes(req.body.item_type)) {
    return res.status(400).json({ error: `Invalid item_type: ${req.body.item_type}. Must be one of: ${ITEM_TYPES.join(', ')}` });
  }
  // Validate status enum (matches frontend STATUSES constant)
  const VALID_STATUSES = ['Not started', 'In progress', 'Planning', 'Drafted', 'In Review', 'Blocked', 'Done', 'Cancelled'];
  if (req.body.status !== undefined && req.body.status !== null && req.body.status !== '' && !VALID_STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  // Coerce and validate numeric hour fields up-front
  if (req.body.hours_estimated !== undefined && req.body.hours_estimated !== null && req.body.hours_estimated !== '') {
    const h = Number(req.body.hours_estimated);
    if (!Number.isFinite(h) || h < 0) {
      return res.status(400).json({ error: 'hours_estimated must be a non-negative number' });
    }
    req.body.hours_estimated = h;
  }
  if (req.body.hours_spent !== undefined && req.body.hours_spent !== null && req.body.hours_spent !== '') {
    const h = Number(req.body.hours_spent);
    if (!Number.isFinite(h) || h < 0) {
      return res.status(400).json({ error: 'hours_spent must be a non-negative number' });
    }
    req.body.hours_spent = h;
  }
  // Reject out-of-range years (e.g. 5-digit years typed into date inputs)
  const dateFields = ['start_date', 'end_date', 'due_date'];
  for (const df of dateFields) {
    const val = req.body[df];
    if (val !== undefined && val !== null && val !== '') {
      const yearMatch = String(val).match(/^(\d+)-/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (year < 1900 || year > 2099) {
          return res.status(400).json({ error: `Invalid year in ${df}: ${year}. Must be between 1900 and 2099.` });
        }
      }
    }
  }
  // Reject start_date > end_date (use both incoming values, or fall back to existing below)
  if (req.body.start_date && req.body.end_date && req.body.start_date > req.body.end_date) {
    return res.status(400).json({ error: 'start_date must be before or equal to end_date' });
  }
  // Text fields are stored raw; escaping happens at render time in the frontend (esc()).
  // Status is routed through reorderInGroup below — NOT in allowedFields.
  const allowedFields = ['title', 'parent_id', 'client_id', 'item_type', 'priority', 'health_state', 'description', 'assignees', 'hours_estimated', 'hours_spent', 'due_date', 'start_date', 'end_date', 'dependencies', 'collaborations', 'success_factor', 'repeat_rule', 'blocker_info', 'practice_area', 'sow_id', 'work_type', 'risks', 'mitigations', 'documentation_link'];
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowedFields);
  if (req.body.title !== undefined && !req.body.title.trim()) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }
  const wantsReorder = (req.body.status !== undefined) || (req.body.position !== undefined);
  if (updates.length === 0 && !wantsReorder) return res.status(400).json({ error: 'No valid fields to update' });
  // Fetch old values before update for audit trail
  const oldResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  const oldTask = oldResult.rows[0];
  const scopes = await getClientScopes(req);
  if (scopes && oldTask && !scopes.includes(oldTask.client_id)) return res.status(403).json({ error: 'Cannot edit tasks for other clients' });

  // If this update sets status to In progress / In Review / Done, validate that all
  // mandatory fields are present (merged old + new). Leaf tasks only — skip if the task
  // has children. Description must be at least 15 characters when provided.
  // Client is inherited from parent chain on the frontend, so walk ancestors.
  const ACTIVE_STATUSES = ['In progress', 'In Review', 'Done'];
  if (req.body.status && ACTIVE_STATUSES.includes(req.body.status) && oldTask) {
    // Skip validation for parent items (rollups, not leaf work)
    const { rows: childRows } = await pool.query('SELECT 1 FROM tasks WHERE parent_id = $1 LIMIT 1', [req.params.id]);
    if (childRows.length === 0) {
      const merged = { ...oldTask, ...req.body };
      // Resolve effective client by walking the parent chain if not directly set
      let effectiveClientId = merged.client_id;
      if (!effectiveClientId) {
        const { rows: ancestorRows } = await pool.query(`
          WITH RECURSIVE ancestors AS (
            SELECT id, parent_id, client_id FROM tasks WHERE id = $1
            UNION ALL
            SELECT t.id, t.parent_id, t.client_id FROM tasks t
            INNER JOIN ancestors a ON t.id = a.parent_id
          )
          SELECT client_id FROM ancestors WHERE client_id IS NOT NULL LIMIT 1
        `, [req.params.id]);
        if (ancestorRows.length > 0) effectiveClientId = ancestorRows[0].client_id;
      }
      const missing = [];
      if (!merged.hours_estimated || Number(merged.hours_estimated) <= 0) missing.push('Hours estimated');
      if (!merged.priority || String(merged.priority).trim() === '') missing.push('Priority');
      if (!Array.isArray(merged.assignees) || merged.assignees.length === 0) missing.push('Assignee');
      if (!merged.due_date || String(merged.due_date).trim() === '') missing.push('Due date');
      if (!effectiveClientId) missing.push('Client');
      const desc = (merged.description || '').toString().trim();
      if (desc.length < 15) missing.push('Description (min 15 chars)');
      if (missing.length > 0) {
        return res.status(400).json({
          error: `Cannot set status to "${req.body.status}" — missing mandatory fields: ${missing.join(', ')}`,
          missingFields: missing
        });
      }
    }
  }
  // If description is being set on its own, still enforce the 15-char minimum
  // (allow empty/clear, but reject 1-14 char values)
  if (req.body.description !== undefined) {
    const d = (req.body.description || '').toString().trim();
    if (d.length > 0 && d.length < 15) {
      return res.status(400).json({ error: 'Description must be at least 15 characters' });
    }
  }

  // Server-side prerequisite enforcement: block Done if prerequisites are incomplete
  if (req.body.status === 'Done' && oldTask && Array.isArray(oldTask.dependencies) && oldTask.dependencies.length > 0) {
    const { rows: prereqs } = await pool.query(
      "SELECT id, title, status FROM tasks WHERE id = ANY($1::uuid[]) AND status != 'Done'",
      [oldTask.dependencies]
    );
    if (prereqs.length > 0) {
      return res.status(400).json({
        error: 'Cannot mark as Done — incomplete prerequisites',
        incompletePrereqs: prereqs.map(p => ({ id: p.id, title: p.title, status: p.status }))
      });
    }
  }

  // Server-side circular dependency prevention (single recursive CTE, replaces O(M*N) loop — code review H3)
  if (Array.isArray(req.body.dependencies) && req.body.dependencies.length > 0) {
    // Self-dependency check first (cheap)
    if (req.body.dependencies.some(d => d === req.params.id)) {
      return res.status(400).json({ error: 'A task cannot depend on itself' });
    }
    // Walk the transitive closure of all proposed dependencies in one query and see if the
    // current task appears anywhere in the reachable set. If it does, adding these dependencies
    // would create a cycle.
    const { rows: reachRows } = await pool.query(`
      WITH RECURSIVE dep_closure(task_id, depth) AS (
        SELECT unnest($1::uuid[]), 1
        UNION
        SELECT dep_id::uuid, dc.depth + 1
        FROM dep_closure dc
        JOIN tasks t ON t.id = dc.task_id
        CROSS JOIN LATERAL unnest(COALESCE(t.dependencies, ARRAY[]::text[])) AS dep_id
        WHERE dc.depth < 500
      )
      SELECT 1 FROM dep_closure WHERE task_id = $2::uuid LIMIT 1
    `, [req.body.dependencies, req.params.id]);
    if (reachRows.length > 0) {
      return res.status(400).json({ error: 'Circular dependency detected — this would create a cycle' });
    }
  }
  // Run reorder + field updates atomically
  const txnClient = await pool.connect();
  let updatedTask;
  try {
    await txnClient.query('BEGIN');

    if (wantsReorder) {
      const targetStatus = (req.body.status !== undefined && req.body.status !== '')
        ? req.body.status
        : (oldTask ? oldTask.status : 'Not started');
      const targetPos = (typeof req.body.position === 'number' && Number.isInteger(req.body.position))
        ? req.body.position
        : 0;
      await reorderInGroup(txnClient, 'tasks', 'status', req.params.id, targetStatus, targetPos);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      vals.push(req.params.id);
      await txnClient.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${nextIdx}`, vals);
    }

    const fresh = await txnClient.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!fresh.rows[0]) {
      await txnClient.query('ROLLBACK');
      txnClient.release();
      return res.status(404).json({ error: 'Not found' });
    }
    updatedTask = fresh.rows[0];
    await txnClient.query('COMMIT');
  } catch (err) {
    await txnClient.query('ROLLBACK');
    log('error', 'Tasks', 'PATCH failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to update task' });
  } finally {
    txnClient.release();
  }

  // Build detailed change log against the freshly-updated row
  const changes = {};
  const allFields = [...allowedFields, 'status', 'position'];
  for (const f of allFields) {
    if (req.body[f] !== undefined && oldTask) {
      const oldVal = oldTask[f];
      const newVal = updatedTask[f];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[f] = { from: oldVal, to: newVal };
      }
    }
  }
  if (Object.keys(changes).length > 0) {
    await auditLog('task', req.params.id, 'update', req.user?.displayName, changes);
  }

  // Connected Statuses: bidirectional cascade for Done/Cancelled/Blocked
  // Downward: parent status pushes to all descendants
  const CASCADE_STATUSES = ['Done', 'Cancelled', 'Blocked'];
  if (req.body.status && CASCADE_STATUSES.includes(req.body.status) && (!oldTask || oldTask.status !== req.body.status)) {
    const hasKids = (await pool.query('SELECT 1 FROM tasks WHERE parent_id = $1 LIMIT 1', [req.params.id])).rows.length > 0;
    if (hasKids) {
      try {
        const { rows: cascaded } = await pool.query(`
          WITH RECURSIVE descendants AS (
            SELECT id FROM tasks WHERE parent_id = $1
            UNION ALL
            SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
          )
          UPDATE tasks SET status = $2, updated_at = NOW()
          WHERE id IN (SELECT id FROM descendants) AND status != $2
          RETURNING id
        `, [req.params.id, req.body.status]);
        if (cascaded.length > 0) {
          await auditLog('task', req.params.id, 'cascade_status_down', req.user?.displayName, { status: req.body.status, count: cascaded.length });
        }
      } catch (e) {
        log('warn', 'Tasks', 'Downward status cascade failed', { error: e.message });
      }
    }
  }

  // Upward: when a task becomes Done/Cancelled, check if ALL siblings are terminal — if so, auto-complete parent
  if (req.body.status && ['Done', 'Cancelled'].includes(req.body.status) && updatedTask.parent_id) {
    try {
      let parentId = updatedTask.parent_id;
      while (parentId) {
        const { rows: siblings } = await pool.query(
          'SELECT id, status FROM tasks WHERE parent_id = $1', [parentId]
        );
        const allTerminal = siblings.length > 0 && siblings.every(s => s.status === 'Done' || s.status === 'Cancelled');
        if (!allTerminal) break;
        const allDone = siblings.every(s => s.status === 'Done');
        const newStatus = allDone ? 'Done' : 'Cancelled';
        const { rows: [parent] } = await pool.query(
          'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 AND status != $1 RETURNING id, parent_id',
          [newStatus, parentId]
        );
        if (!parent) break;
        await auditLog('task', parentId, 'cascade_status_up', req.user?.displayName, { status: newStatus });
        parentId = parent.parent_id;
      }
    } catch (e) {
      log('warn', 'Tasks', 'Upward status cascade failed', { error: e.message });
    }
  }

  // Prerequisites cascade: when task becomes Blocked/Cancelled, block its dependants
  if (req.body.status && ['Blocked', 'Cancelled'].includes(req.body.status) && (!oldTask || oldTask.status !== req.body.status)) {
    try {
      const { rows: dependants } = await pool.query(`
        UPDATE tasks SET status = 'Blocked', updated_at = NOW()
        WHERE $1 = ANY(dependencies) AND status NOT IN ('Done', 'Cancelled', 'Blocked')
        RETURNING id
      `, [req.params.id]);
      if (dependants.length > 0) {
        await auditLog('task', req.params.id, 'cascade_block_dependants', req.user?.displayName, { count: dependants.length });
      }
    } catch (e) {
      log('warn', 'Tasks', 'Prerequisite block cascade failed', { error: e.message });
    }
  }

  // Feature 2: clone next instance of a repeating task when marked Done or Cancelled
  try {
    const TERMINAL_STATUSES = ['Done', 'Cancelled'];
    const newTerminal = req.body.status && TERMINAL_STATUSES.includes(req.body.status);
    const wasTerminal = oldTask && TERMINAL_STATUSES.includes(oldTask.status);
    if (newTerminal && !wasTerminal && updatedTask.repeat_rule) {
      const nextDate = computeNextRepeatDate(updatedTask.repeat_rule, new Date());
      if (nextDate) {
        const cloneSql = `INSERT INTO tasks
          (title, parent_id, client_id, item_type, status, priority, health_state, description, assignees,
           hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, planner_task_id, source,
           collaborations, success_factor, repeat_rule)
          VALUES ($1,$2,$3,$4,'Not started',$5,$6,$7,$8,$9,0,$10,'','',$11,'','repeat',$12,$13,$14)
          RETURNING id`;
        const cloneVals = [
          updatedTask.title, updatedTask.parent_id, updatedTask.client_id, updatedTask.item_type,
          updatedTask.priority || '', updatedTask.health_state || '', updatedTask.description || '',
          updatedTask.assignees || [], updatedTask.hours_estimated || 0, nextDate, updatedTask.dependencies || [],
          updatedTask.collaborations || null, updatedTask.success_factor || null, updatedTask.repeat_rule
        ];
        const cloneRes = await pool.query(cloneSql, cloneVals);
        await auditLog('task', cloneRes.rows[0].id, 'repeat_clone', req.user?.displayName, { source_task_id: req.params.id, due_date: nextDate });
      }
    }
  } catch (e) {
    log('warn', 'Tasks', 'Repeat clone failed', { error: e.message });
  }

  // Feature 6: notify internal assignees tagged as blockers when task is set to Blocked
  try {
    if (req.body.status === 'Blocked' && updatedTask.blocker_info && Array.isArray(updatedTask.blocker_info.internal)) {
      const internalNames = updatedTask.blocker_info.internal.filter(n => n && typeof n === 'string');
      if (internalNames.length > 0) {
        const { rows: matchedUsers } = await pool.query(
          'SELECT username, display_name FROM users WHERE display_name = ANY($1) OR username = ANY($1)',
          [internalNames]
        );
        for (const u of matchedUsers) {
          if (u.username && u.username !== req.user?.username) {
            await createNotification(
              u.username, 'warning',
              `Task blocking on you`,
              `Task "${updatedTask.title}" is blocking on you.`,
              '/nbi_project_dashboard.html#workload'
            );
          }
        }
      }
    }
  } catch (e) {
    log('warn', 'Tasks', 'Blocker notification failed', { error: e.message });
  }

  // Notify assignees of meaningful task changes (skip position/updated_at noise)
  try {
    const changedFields = Object.keys(changes).filter(k => !['position', 'updated_at'].includes(k));
    // Batch lookup: one query for all assignees instead of one per assignee
    const assigneeNames = (updatedTask.assignees || []).filter(a => a !== req.user?.displayName);
    if (assigneeNames.length > 0 && changedFields.length > 0) {
      const { rows: assigneeUsers } = await pool.query(
        'SELECT username, display_name FROM users WHERE display_name = ANY($1) AND is_active = true',
        [assigneeNames]
      );
      for (const u of assigneeUsers) {
        await createNotification(
          u.username, 'info', 'Task updated',
          `"${updatedTask.title}" was updated: ${changedFields.join(', ')}`,
          updatedTask.id, true
        );
      }
    }
  } catch (e) {
    log('warn', 'Tasks', 'Assignee change notification failed', { error: e.message });
  }

  res.json(updatedTask);
});

/** DELETE /api/tasks/:id — Delete a task and all descendants (admin only). Uses a transaction for atomicity. */
router.delete('/api/tasks/:id', requireAdmin, async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  // Fetch the task before deletion so we can notify assignees
  const { rows: preDeleteRows } = await pool.query('SELECT title, assignees FROM tasks WHERE id = $1', [req.params.id]);
  const taskToDelete = preDeleteRows[0] || null;
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    // Collect all IDs to delete (target + descendants) BEFORE deleting
    const { rows: deletedRows } = await conn.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE id = $1
        UNION ALL
        SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
      )
      SELECT id FROM descendants
    `, [req.params.id]);
    const deletedIds = deletedRows.map(r => r.id);

    // Cascade-delete all descendants first, then the item itself
    await conn.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE parent_id = $1
        UNION ALL
        SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
      )
      DELETE FROM tasks WHERE id IN (SELECT id FROM descendants)
    `, [req.params.id]);
    await conn.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);

    // Clean up orphaned dependency references: remove deleted IDs from other tasks' dependencies arrays
    if (deletedIds.length > 0) {
      await conn.query(`
        UPDATE tasks SET dependencies = (
          SELECT COALESCE(array_agg(d), '{}') FROM unnest(dependencies) d WHERE d != ALL($1::text[])
        ), updated_at = NOW()
        WHERE dependencies && $1::text[]
      `, [deletedIds]);
    }

    await conn.query('COMMIT');
    // Audit log after successful delete
    await auditLog('task', req.params.id, 'delete', req.user?.displayName);
    res.json({ ok: true });

    // Notify assignees the task was deleted (fire-and-forget, outside the transaction)
    if (taskToDelete && Array.isArray(taskToDelete.assignees) && taskToDelete.assignees.length > 0) {
      try {
        // Batch lookup: one query for all assignees instead of one per assignee
        const assigneeNames = taskToDelete.assignees.filter(a => a);
        if (assigneeNames.length > 0) {
          const { rows: assigneeUsers } = await pool.query(
            'SELECT username, display_name FROM users WHERE display_name = ANY($1) AND is_active = true',
            [assigneeNames]
          );
          for (const u of assigneeUsers) {
            if (u.username === req.user?.username) continue;
            await createNotification(
              u.username, 'warning', 'Task deleted',
              `Task "${taskToDelete.title}" was deleted by ${req.user?.displayName || 'an admin'}.`,
              null, true
            );
          }
        }
      } catch (notifErr) {
        log('warn', 'Tasks', 'Delete notification failed', { error: notifErr.message });
      }
    }
  } catch (e) {
    await conn.query('ROLLBACK');
    throw e;
  } finally {
    conn.release();
  }
});

/**
 * POST /api/tasks/bulk
 * Bulk-create tasks from an import. Uses a two-pass approach:
 * first pass inserts all tasks to get real IDs, second pass resolves
 * parent relationships using a temp_id -> real_id mapping.
 */
router.post('/api/tasks/bulk', requireAdmin, async (req, res) => {
  const { tasks: taskList } = req.body;
  if (!Array.isArray(taskList)) return res.status(400).json({ error: 'tasks array required' });
  if (taskList.length === 0) return res.status(400).json({ error: 'tasks array must not be empty' });
  if (taskList.length > 500) return res.status(400).json({ error: 'Too many tasks (max 500 per batch)' });
  for (let i = 0; i < taskList.length; i++) {
    const t = taskList[i];
    if (!t.title || typeof t.title !== 'string' || !t.title.trim()) return res.status(400).json({ error: `tasks[${i}].title: required` });
    if (t.title.length > 500) return res.status(400).json({ error: `tasks[${i}].title: too long (max 500)` });
    if (t.status && !VALID_STATUSES_SET.has(t.status)) return res.status(400).json({ error: `tasks[${i}].status: invalid value "${t.status}"` });
    if (t.client_id && !isValidUuid(t.client_id)) return res.status(400).json({ error: `tasks[${i}].client_id: invalid UUID` });
    if (t.item_type && !ITEM_TYPES.includes(t.item_type)) return res.status(400).json({ error: `tasks[${i}].item_type: invalid value "${t.item_type}"` });
  }

  // Auto-repair orphan parent links for hierarchy imports. The Backlog Builder
  // template uses prefix-based _temp_ids (P1, F1, S1.1, T1.1.1, T2.4.3, etc.).
  // Two cases need rescuing:
  //   1. _temp_parent_id is BLANK on the row (source CSV omitted it).
  //   2. _temp_parent_id points at a sibling that is not in the batch — e.g.
  //      a story row with empty title gets dropped by the mapper, and its
  //      child tasks then reference a parent the linker can't find.
  // In both cases we derive the parent from the prefix convention:
  //   "S{X}.{Y}"     -> parent is "F{X}"
  //   "T{X}.{Y}.{Z}" -> parent is "S{X}.{Y}", falling back to "F{X}" if the
  //                     story is also missing.
  const tempIdSet = new Set(taskList.filter(t => t._temp_id).map(t => t._temp_id));
  for (const t of taskList) {
    const needsRepair = !t._temp_parent_id || !tempIdSet.has(t._temp_parent_id);
    if (!needsRepair) continue;
    const id = t._temp_id || '';
    let m;
    if ((m = id.match(/^S(\d+)\.\d+$/))) {
      const feat = `F${m[1]}`;
      if (tempIdSet.has(feat)) t._temp_parent_id = feat;
    } else if ((m = id.match(/^T(\d+)\.(\d+)\.\d+$/))) {
      const story = `S${m[1]}.${m[2]}`;
      const feat = `F${m[1]}`;
      if (tempIdSet.has(story)) t._temp_parent_id = story;
      else if (tempIdSet.has(feat)) t._temp_parent_id = feat;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve `client` (free-text name like "Lighthouse Games") -> client_id UUID.
    // We cache lookups by name so we hit the DB at most once per distinct name.
    const nameCache = {};
    for (let i = 0; i < taskList.length; i++) {
      const t = taskList[i];
      if (t.client_id) continue;
      const rawName = t.client && String(t.client).trim();
      if (!rawName) continue;
      if (!(rawName in nameCache)) {
        const { rows } = await client.query('SELECT id FROM clients WHERE LOWER(name) = LOWER($1) LIMIT 1', [rawName]);
        nameCache[rawName] = rows.length ? rows[0].id : null;
      }
      const resolved = nameCache[rawName];
      if (!resolved) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `tasks[${i}].client: unknown client name "${rawName}" (no matching row in clients table)` });
      }
      t.client_id = resolved;
    }

    const created = [];
    const idMap = {};
    const rowByTempId = {};
    for (const t of taskList) {
      const status = t.status || 'Not started';
      await shiftForInsert(client, 'tasks', 'status', status);
      const { rows } = await client.query(
        `INSERT INTO tasks (title, client_id, status, priority, health_state, description, assignees,
                             hours_estimated, hours_spent, due_date, planner_task_id, source, item_type,
                             start_date, end_date, success_factor, practice_area, collaborations, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,0) RETURNING *`,
        [t.title, t.client_id || null, status, t.priority || '', t.health_state || '',
         t.description || '', t.assignees || [], t.hours_estimated || 0, t.hours_spent || 0,
         t.due_date || '', t.planner_task_id || '', t.source || 'import', t.item_type || 'task',
         t.start_date || '', t.end_date || '', t.success_factor || '', t.practice_area || '',
         t.collaborations || '']
      );
      if (t._temp_id) { idMap[t._temp_id] = rows[0].id; rowByTempId[t._temp_id] = rows[0]; }
      created.push(rows[0]);
    }

    // Second pass: set parent_ids and inherit client_id from parents that have one.
    // Iterate in input order so a deeper child can pick up a client_id that was
    // resolved on its parent in this same loop.
    const clientByTempId = Object.fromEntries(taskList.filter(t => t._temp_id).map(t => [t._temp_id, t.client_id || null]));
    for (const t of taskList) {
      if (!t._temp_parent_id || !idMap[t._temp_parent_id]) continue;
      const realId = idMap[t._temp_id];
      const realParentId = idMap[t._temp_parent_id];
      const inherited = !t.client_id && clientByTempId[t._temp_parent_id] ? clientByTempId[t._temp_parent_id] : null;
      if (inherited) {
        await client.query('UPDATE tasks SET parent_id = $1, client_id = $2 WHERE id = $3', [realParentId, inherited, realId]);
        clientByTempId[t._temp_id] = inherited; // Propagate one level deeper next iteration
      } else {
        await client.query('UPDATE tasks SET parent_id = $1 WHERE id = $2', [realParentId, realId]);
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ count: created.length });
  } catch (e) {
    await client.query('ROLLBACK');
    log('error', 'Tasks', 'Bulk task creation failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    client.release();
  }
});

/** POST /api/tasks/:taskId/notes — Add a quick note to a task (also bumps the task's updated_at) */
router.post('/api/tasks/:taskId/notes', requireAdmin, async (req, res) => {
  const { text, author } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  const { rows } = await pool.query(
    'INSERT INTO task_notes (task_id, text, author) VALUES ($1, $2, $3) RETURNING *',
    [req.params.taskId, text, author || (req.user && req.user.display_name) || 'Unknown']
  );
  // Update task's updated_at
  await pool.query('UPDATE tasks SET updated_at = NOW() WHERE id = $1', [req.params.taskId]);
  res.status(201).json(rows[0]);
});

  return router;
};
