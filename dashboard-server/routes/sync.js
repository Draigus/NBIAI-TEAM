'use strict';

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, auditLog, createNotification, getClientScopes,
          computeNextRepeatDate, ITEM_TYPES } = ctx;

/**
 * POST /api/sync/changes
 * Incremental sync: apply a list of change operations (upsert/delete) to tasks.
 * Also syncs client briefs and contacts if provided.
 * Runs in a transaction with a client name -> ID cache to avoid repeated lookups.
 */
router.post('/api/sync/changes', async (req, res) => {
  // Any authenticated user may sync their task changes. Previously this was
  // admin-only, which silently blocked every member's local edit (Magnus
  // report C.9 "Ticket Not Marked as Blocked" was a symptom of this —
  // her Blocked status never reached the server so it reverted on reload).
  // Client briefs remain admin-only because they carry client metadata.
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const isAdmin = req.user.role === 'admin';
  const { changes } = req.body;
  // Silently drop client-brief updates from non-admins instead of rejecting the whole sync
  const briefList = isAdmin ? req.body.client_briefs : null;
  if ((!Array.isArray(changes) || changes.length === 0) && !briefList) return res.json({ ok: true, applied: 0 });

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    // Build client name->id cache
    const clientRows = (await conn.query('SELECT id, name FROM clients')).rows;
    const clientMap = {};
    clientRows.forEach(r => { clientMap[r.name] = r.id; });

    let applied = 0;
    let rejectedOutOfScope = 0;
    const idMap = {}; // frontend_id -> db_id (for new tasks)
    const updatedTimestamps = {}; // task_id -> new updated_at (for client to refresh _serverUpdatedAt)

    // Scope gate for the write path. Admin passes through; everyone else
    // may only touch tasks whose client_id is in their scope. External (G5)
    // users can never touch null-client tasks; internal-with-team users
    // can. Out-of-scope changes are silently dropped from the batch and
    // surfaced to the client via rejectedOutOfScope in the response.
    const scopes = await getClientScopes(req);
    const isExternal = !!req.user?.clientId;
    const scopeSet = scopes ? new Set(scopes) : null;
    const clientInScope = (clientId) => {
      if (scopeSet === null) return true;
      if (clientId == null) return !isExternal;
      return scopeSet.has(clientId);
    };

    // Batch-fetch existing task states to avoid N+1 queries in the loop.
    // Also fetch client_ids of any tasks being deleted so we can scope-check them.
    const upsertIds = changes.filter(ch => ch.action === 'upsert' && ch.entity === 'task' && ch.data?.id).map(ch => ch.data.id);
    const deleteIds = changes.filter(ch => ch.action === 'delete' && ch.entity === 'task' && ch.id).map(ch => ch.id);
    const existingTaskMap = new Map();
    const existingFullMap = new Map(); // full row, used for post-processing transitions
    const deleteClientMap = new Map();
    if (upsertIds.length > 0) {
      const { rows: existingRows } = await conn.query('SELECT * FROM tasks WHERE id = ANY($1::uuid[])', [upsertIds]);
      existingRows.forEach(r => { existingTaskMap.set(r.id, r.updated_at); existingFullMap.set(r.id, r); });
    }
    if (scopeSet !== null && deleteIds.length > 0) {
      const { rows: delRows } = await conn.query('SELECT id, client_id FROM tasks WHERE id = ANY($1::uuid[])', [deleteIds]);
      delRows.forEach(r => deleteClientMap.set(r.id, r.client_id));
    }
    // Track per-task transitions to process after the main upsert loop (cascade cancel, repeat clones, blocker notifications)
    const postProcessTransitions = [];
    const conflicted = [];

    for (const ch of changes) {
      const t = ch.data || {};

      if (ch.action === 'upsert' && ch.entity === 'task') {
        // Defensive normalisation: Postgres text[] columns must receive a flat
        // 1-D array of strings. The frontend has been observed sending [[]]
        // (nested empty array) which Postgres parses as the invalid array
        // literal "{{}}". Flatten + filter-string + log when we had to fix it,
        // so we keep visibility into frontend sources still producing bad data
        // while the server stops throwing.
        const normaliseStringArray = (val, fieldName) => {
          if (val == null) return [];
          if (!Array.isArray(val)) return [];
          // Fast path: already flat 1-D string array
          const isFlat = val.every(x => typeof x === 'string');
          if (isFlat) return val;
          // Flatten recursively and keep only non-empty strings
          const flat = val.flat(Infinity).filter(x => typeof x === 'string' && x.length > 0);
          log('warn', 'Sync', 'Normalised non-flat array field', {
            taskId: t.id, field: fieldName, before: val, after: flat
          });
          return flat;
        };
        t.assignees = normaliseStringArray(t.assignees, 'assignees');
        t.dependencies = normaliseStringArray(t.dependencies, 'dependencies');

        // Resolve client name to ID. Auto-creation of clients (the old
        // INSERT ... ON CONFLICT path) is restricted to admins — otherwise
        // any caller could manufacture client rows by picking novel names.
        let clientId = null;
        if (t.client && clientMap[t.client]) {
          clientId = clientMap[t.client];
        } else if (t.client && isAdmin && typeof t.client === 'string' && t.client.trim().length > 0 && t.client.length <= 200) {
          const cr = await conn.query('INSERT INTO clients (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id', [t.client.trim()]);
          clientId = cr.rows[0].id;
          clientMap[t.client] = clientId;
        } else if (t.client) {
          // Non-admin referenced an unknown client name: drop the row rather
          // than create it. Surface via rejectedOutOfScope so the client can
          // warn the user.
          rejectedOutOfScope++;
          continue;
        }

        // Scope gate: reject writes whose resolved clientId is outside the
        // user's scope. For updates we also require the task's OLD clientId
        // to be in scope (so a scoped user can't steal a task by patching
        // its client_id to their own).
        if (!clientInScope(clientId)) { rejectedOutOfScope++; continue; }
        if (existingTaskMap.has(t.id)) {
          const oldClientId = existingFullMap.get(t.id)?.client_id ?? null;
          if (!clientInScope(oldClientId)) { rejectedOutOfScope++; continue; }
        }

        // Resolve parentId (might be a frontend temp ID or a DB UUID)
        let parentId = t.parentId || t.parent_id || null;
        if (parentId && idMap[parentId]) parentId = idMap[parentId];

        // Validate item_type — sanitise to a known value
        const rawType = t.itemType || t.item_type || 'task';
        const itemType = ITEM_TYPES.includes(rawType) ? rawType : 'task';

        // Validate date fields: must be empty or YYYY-MM-DD with year in 1900-2099
        for (const dk of ['dueDate', 'due_date', 'startDate', 'start_date', 'endDate', 'end_date']) {
          const dv = t[dk];
          if (dv) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dv))) { t[dk] = ''; continue; }
            const yr = parseInt(String(dv).slice(0, 4), 10);
            if (yr < 1900 || yr > 2099) t[dk] = '';
          }
        }

        // Check if task exists (pre-fetched above, or created within this batch)
        const serverUpdatedAt = existingTaskMap.get(t.id) || null;
        const taskExists = serverUpdatedAt !== null;

        if (taskExists) {
          // Conflict detection: version-based (preferred) or timestamp fallback
          const clientVersion = t._version;
          const clientKnownAt = t._serverUpdatedAt;
          if (clientVersion !== undefined) {
            const { rows: verRows } = await conn.query('SELECT version FROM tasks WHERE id = $1', [t.id]);
            if (verRows.length > 0 && verRows[0].version !== clientVersion) {
              conflicted.push({ id: t.id, title: t.title || '', serverUpdatedAt, serverVersion: verRows[0].version });
              continue;
            }
          } else if (clientKnownAt && serverUpdatedAt && new Date(clientKnownAt) < new Date(serverUpdatedAt)) {
            conflicted.push({ id: t.id, title: t.title || '', serverUpdatedAt });
            continue;
          }

          // Update existing task, increment version
          const updRes = await conn.query(
            `UPDATE tasks SET title=$1, parent_id=$2, client_id=$3, item_type=$4, status=$5, priority=$6,
             health_state=$7, description=$8, assignees=$9, hours_estimated=$10, hours_spent=$11,
             due_date=$12, start_date=$13, end_date=$14, dependencies=$15,
             collaborations=$16, success_factor=$17, repeat_rule=$18, blocker_info=$19,
             practice_area=$20, sow_id=$21, work_type=$22, sort_order=$23,
             updated_at=NOW(), version=version+1
             WHERE id=$24 RETURNING updated_at, version`,
            [t.title, parentId, clientId, itemType, t.status || 'Not started', t.priority || '',
             t.healthState || t.health_state || '', t.description || '', t.assignees || [],
             t.hoursEstimated || t.hours_estimated || 0, t.hoursSpent || t.hours_spent || 0,
             t.dueDate || t.due_date || '', t.startDate || t.start_date || '', t.endDate || t.end_date || '',
             t.dependencies || [],
             t.collaborations || null, t.successFactor || t.success_factor || null,
             t.repeatRule || t.repeat_rule || null, t.blockerInfo || t.blocker_info || null,
             t.practiceArea || t.practice_area || null,
             t.sowId || t.sow_id || null,
             t.workType || t.work_type || null,
             t.sortOrder ?? t.sort_order ?? 0,
             t.id]
          );
          if (updRes.rows.length > 0) updatedTimestamps[t.id] = updRes.rows[0].updated_at;
        } else {
          // Insert new task
          const { rows } = await conn.query(
            `INSERT INTO tasks (id, title, parent_id, client_id, item_type, status, priority, health_state,
             description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, source, created_at,
             collaborations, success_factor, repeat_rule, blocker_info, practice_area, sow_id, work_type, sort_order, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,NOW()) RETURNING id, updated_at`,
            [t.id, t.title, parentId, clientId, itemType, t.status || 'Not started', t.priority || '',
             t.healthState || t.health_state || '', t.description || '', t.assignees || [],
             t.hoursEstimated || t.hours_estimated || 0, t.hoursSpent || t.hours_spent || 0,
             t.dueDate || t.due_date || '', t.startDate || t.start_date || '', t.endDate || t.end_date || '',
             t.dependencies || [], t.source || 'sync',
             t.createdAt || t.created_at || new Date().toISOString(),
             t.collaborations || null, t.successFactor || t.success_factor || null,
             t.repeatRule || t.repeat_rule || null, t.blockerInfo || t.blocker_info || null,
             t.practiceArea || t.practice_area || null,
             t.sowId || t.sow_id || null,
             t.workType || t.work_type || null,
             t.sortOrder ?? t.sort_order ?? 0]
          );
          idMap[t.id] = rows[0].id;
          if (rows[0].updated_at) updatedTimestamps[rows[0].id] = rows[0].updated_at;
          existingTaskMap.set(rows[0].id, new Date()); // Register in map for subsequent batch references
        }

        // Sync task notes: append-only to avoid wiping notes added by other users
        if (Array.isArray(t.notes) && t.notes.length > 0) {
          const taskDbId = idMap[t.id] || t.id;
          const existing = await conn.query('SELECT text, created_at FROM task_notes WHERE task_id = $1', [taskDbId]);
          const existingSet = new Set(existing.rows.map(r => r.text + '|' + new Date(r.created_at).toISOString()));
          for (const n of t.notes) {
            if (n.text || n.time) {
              const ts = n.time || n.created_at || new Date().toISOString();
              const key = (n.text || '') + '|' + new Date(ts).toISOString();
              if (!existingSet.has(key)) {
                await conn.query('INSERT INTO task_notes (task_id, text, created_at) VALUES ($1, $2, $3)',
                  [taskDbId, n.text || '', ts]);
              }
            }
          }
        }
        const changedBy = req.user ? req.user.displayName : 'system';
        await auditLog('task', idMap[t.id] || t.id,
          taskExists ? 'update' : 'create',
          changedBy, { title: t.title, status: t.status, healthState: t.healthState || t.health_state }, conn);

        // Capture state transitions for post-processing (cancel cascade, repeat clones, blocker notifications)
        if (taskExists) {
          const oldRow = existingFullMap.get(t.id);
          if (oldRow) {
            postProcessTransitions.push({
              id: t.id,
              oldStatus: oldRow.status,
              newStatus: t.status,
              itemType,
              repeatRule: t.repeatRule || t.repeat_rule || oldRow.repeat_rule || null,
              blockerInfo: t.blockerInfo || t.blocker_info || null,
              title: t.title || oldRow.title,
              snapshot: { ...oldRow,
                title: t.title,
                priority: t.priority || '',
                health_state: t.healthState || t.health_state || '',
                description: t.description || '',
                assignees: t.assignees || [],
                hours_estimated: t.hoursEstimated || t.hours_estimated || 0,
                client_id: clientId,
                parent_id: parentId,
                item_type: itemType,
                collaborations: t.collaborations || null,
                success_factor: t.successFactor || t.success_factor || null,
                repeat_rule: t.repeatRule || t.repeat_rule || null,
                dependencies: t.dependencies || []
              }
            });
          }
        }
        applied++;

      } else if (ch.action === 'delete' && ch.entity === 'task') {
        // Scope gate for deletes. Admins pass through. Others may only
        // delete tasks whose client_id is in their scope.
        if (scopeSet !== null) {
          const existingClientId = deleteClientMap.get(ch.id);
          if (existingClientId === undefined) {
            // Task not found or not visible: treat as out of scope.
            rejectedOutOfScope++; continue;
          }
          if (!clientInScope(existingClientId)) { rejectedOutOfScope++; continue; }
        }
        const changedBy = req.user ? req.user.displayName : 'system';
        await auditLog('task', ch.id, 'delete', changedBy, null, conn);
        await conn.query('DELETE FROM tasks WHERE id = $1', [ch.id]);
        applied++;
      }
    }

    // Sync client briefs if provided
    if (briefList && typeof briefList === 'object') {
      for (const [name, brief] of Object.entries(briefList)) {
        await conn.query(
          `INSERT INTO clients (name, description, founded, headquarters, employees, revenue, website, linkedin_company, nbi_relationship)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (name) DO UPDATE SET description=$2, founded=$3, headquarters=$4, employees=$5, revenue=$6, website=$7, linkedin_company=$8, nbi_relationship=$9, updated_at=NOW()`,
          [name, brief.description || '', brief.founded || '', brief.headquarters || '',
           brief.employees || '', brief.revenue || '', brief.website || '',
           brief.linkedin || '', brief.nbiRelationship || '']
        );
        // Sync contacts
        if (Array.isArray(brief.contacts)) {
          const clientRow = await conn.query('SELECT id FROM clients WHERE name = $1', [name]);
          if (clientRow.rows.length > 0) {
            const cid = clientRow.rows[0].id;
            await conn.query('DELETE FROM contacts WHERE client_id = $1', [cid]);
            for (let i = 0; i < brief.contacts.length; i++) {
              const ct = brief.contacts[i];
              await conn.query(
                'INSERT INTO contacts (client_id, name, role, notes, background, linkedin, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
                [cid, ct.name || '', ct.role || '', ct.notes || '', ct.background || '', ct.linkedin || '', i]
              );
            }
          }
        }
      }
    }

    // Post-process state transitions (cancel cascade, repeat clones, blocker notifications)
    const blockerNotifications = []; // run after COMMIT
    for (const tr of postProcessTransitions) {
      const TERMINAL = ['Done', 'Cancelled'];
      // Cancel cascade for project-type items
      if (tr.newStatus === 'Cancelled' && tr.oldStatus !== 'Cancelled' && tr.itemType === 'project') {
        try {
          const { rows: cascaded } = await conn.query(`
            WITH RECURSIVE descendants AS (
              SELECT id FROM tasks WHERE parent_id = $1
              UNION ALL
              SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
            )
            UPDATE tasks SET status = 'Cancelled', updated_at = NOW()
            WHERE id IN (SELECT id FROM descendants) AND status != 'Cancelled'
            RETURNING id
          `, [tr.id]);
          if (cascaded.length > 0) {
            await auditLog('task', tr.id, 'cascade_cancel', req.user?.displayName || 'system', { count: cascaded.length }, conn);
          }
        } catch (e) {
          log('warn', 'Sync', 'Cascade cancel failed', { error: e.message });
        }
      }

      // Clear blocker_info when unblocking (status moves away from Blocked)
      if (tr.oldStatus === 'Blocked' && tr.newStatus !== 'Blocked') {
        try {
          await conn.query('UPDATE tasks SET blocker_info = NULL WHERE id = $1', [tr.id]);
        } catch (e) {
          log('warn', 'Sync', 'Clear blocker_info on unblock failed', { error: e.message });
        }
      }

      // Repeat clone when transitioning into Done or Cancelled
      if (TERMINAL.includes(tr.newStatus) && !TERMINAL.includes(tr.oldStatus) && tr.repeatRule) {
        try {
          const nextDate = computeNextRepeatDate(tr.repeatRule, new Date());
          if (nextDate) {
            const snap = tr.snapshot;
            let newStart = '';
            let newEnd = '';
            if (snap.start_date && snap.due_date) {
              const origDuration = Math.round((new Date(snap.due_date) - new Date(snap.start_date)) / 86400000);
              const nd = new Date(nextDate + 'T00:00:00');
              const ns = new Date(nd); ns.setDate(ns.getDate() - origDuration);
              newStart = ns.toISOString().slice(0, 10);
            }
            if (snap.end_date && snap.due_date) {
              const endOffset = Math.round((new Date(snap.end_date) - new Date(snap.due_date)) / 86400000);
              const nd = new Date(nextDate + 'T00:00:00');
              const ne = new Date(nd); ne.setDate(ne.getDate() + endOffset);
              newEnd = ne.toISOString().slice(0, 10);
            }
            const cloneRes = await conn.query(
              `INSERT INTO tasks
                (title, parent_id, client_id, item_type, status, priority, health_state, description, assignees,
                 hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, source,
                 collaborations, success_factor, repeat_rule)
                VALUES ($1,$2,$3,$4,'Not started',$5,$6,$7,$8,$9,0,$10,$15,$16,$11,'repeat',$12,$13,$14)
                RETURNING id`,
              [snap.title, snap.parent_id, snap.client_id, snap.item_type, snap.priority || '',
               snap.health_state || '', snap.description || '', snap.assignees || [],
               snap.hours_estimated || 0, nextDate, snap.dependencies || [],
               snap.collaborations || null, snap.success_factor || null, tr.repeatRule,
               newStart, newEnd]
            );
            await auditLog('task', cloneRes.rows[0].id, 'repeat_clone', req.user?.displayName || 'system', { source_task_id: tr.id, due_date: nextDate }, conn);
          }
        } catch (e) {
          log('warn', 'Sync', 'Repeat clone failed', { error: e.message });
        }
      }

      // Blocker notifications: queue for after COMMIT (createNotification uses pool, not conn)
      if (tr.newStatus === 'Blocked' && tr.oldStatus !== 'Blocked' && tr.blockerInfo && Array.isArray(tr.blockerInfo.internal)) {
        const internalNames = tr.blockerInfo.internal.filter(n => n && typeof n === 'string');
        if (internalNames.length > 0) {
          blockerNotifications.push({ taskId: tr.id, taskTitle: tr.title, names: internalNames });
        }
      }
    }

    await conn.query('COMMIT');

    // Send blocker notifications (after the transaction has committed)
    let notificationsSent = 0;
    for (const bn of blockerNotifications) {
      try {
        const { rows: matchedUsers } = await pool.query(
          'SELECT username, display_name FROM users WHERE display_name = ANY($1) OR username = ANY($1)',
          [bn.names]
        );
        for (const u of matchedUsers) {
          if (u.username && u.username !== req.user?.username) {
            await createNotification(
              u.username, 'warning',
              `Task blocking on you`,
              `Task "${bn.taskTitle}" is blocking on you.`,
              '/nbi_project_dashboard.html#workload'
            );
            notificationsSent++;
          }
        }
      } catch (e) {
        log('warn', 'Sync', 'Blocker notify failed', { error: e.message });
      }
    }

    res.json({ ok: true, applied, idMap, rejectedOutOfScope, notificationsSent, updatedTimestamps, conflicted });
  } catch (e) {
    await conn.query('ROLLBACK');
    log('error', 'Sync', 'Incremental sync failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/sync/poll?since=<ISO timestamp>
 * Lightweight polling endpoint — returns tasks updated after the given timestamp
 * plus the full list of current task IDs (so the client can detect deletions).
 *
 * Scoped by getClientScopes: admins and internal-no-team users see everything;
 * internal-with-team users see their team's clients + always_visible clients +
 * null-client tasks (internal work); G5 external users see only their own
 * client's tasks and never null-client tasks.
 */
router.get('/api/sync/poll', async (req, res) => {
  const since = req.query.since;
  if (!since) return res.status(400).json({ error: 'since parameter required' });

  const sinceDate = new Date(since);
  if (isNaN(sinceDate.getTime())) return res.status(400).json({ error: 'Invalid timestamp' });

  const scopes = await getClientScopes(req);
  const isExternal = !!req.user?.clientId;

  let updated, allIds;
  if (scopes === null) {
    // Unrestricted
    updated = await pool.query(`
      SELECT t.*, c.name as client_name
      FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.updated_at > $1
      ORDER BY t.updated_at
      LIMIT 501
    `, [sinceDate.toISOString()]);
    allIds = await pool.query('SELECT id FROM tasks');
  } else {
    // Scoped. External users never see null-client tasks.
    const nullClause = isExternal ? '' : ' OR t.client_id IS NULL';
    updated = await pool.query(`
      SELECT t.*, c.name as client_name
      FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.updated_at > $1 AND (t.client_id = ANY($2)${nullClause})
      ORDER BY t.updated_at
      LIMIT 501
    `, [sinceDate.toISOString(), scopes]);
    const idNullClause = isExternal ? '' : ' OR client_id IS NULL';
    allIds = await pool.query(
      `SELECT id FROM tasks WHERE client_id = ANY($1)${idNullClause}`,
      [scopes]
    );
  }
  const currentIds = allIds.rows.map(r => r.id);

  const hasMore = updated.rows.length > 500;
  const capped = hasMore ? updated.rows.slice(0, 500) : updated.rows;

  const updatedTasks = capped.map(r => ({
    id: r.id,
    title: r.title,
    parentId: r.parent_id,
    client: r.client_name || '',
    status: r.status,
    priority: r.priority || '',
    healthState: r.health_state || '',
    description: r.description || '',
    collaborations: r.collaborations || '',
    successFactor: r.success_factor || '',
    repeatRule: r.repeat_rule || null,
    blockerInfo: r.blocker_info || null,
    assignees: r.assignees || [],
    hoursEstimated: r.hours_estimated || 0,
    hoursSpent: r.hours_spent || 0,
    dueDate: r.due_date || '',
    startDate: r.start_date || '',
    endDate: r.end_date || '',
    dependencies: r.dependencies || [],
    itemType: r.item_type || 'task',
    practiceArea: r.practice_area || null,
    position: r.position || 0,
    sortOrder: r.sort_order || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    plannerTaskId: r.planner_task_id || '',
    sowId: r.sow_id || null,
    workType: r.work_type || null,
  }));

  res.json({
    updated: updatedTasks,
    currentIds,
    hasMore,
    serverTime: new Date().toISOString(),
  });
});

// PUT /api/sync/tasks — REMOVED (B-B16). Was a destructive full-replace
// that DELETE FROM tasks then re-inserted everything. No frontend caller
// existed; the incremental POST /api/sync/changes replaced it. Keeping
// this comment so git blame shows the removal was intentional.

// Client briefs are still writable via POST /api/sync/changes (admin-only,
// scope-checked). The brief upsert block that lived here was a duplicate
// of the one in POST /api/sync/changes and is not preserved.

/* eslint-disable-next-line no-unused-vars -- placeholder to keep line numbers stable for any in-flight references */
void 0; // B-B16 removal anchor

/**
 * GET /api/sync/load
 * Bootstrap endpoint — loads all tasks, clients, contacts, and settings in one call.
 * Maps DB column names (snake_case) to frontend format (camelCase).
 * Used on initial dashboard load to avoid multiple round-trips.
 */
router.get('/api/sync/load', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  // Client visibility scoping (bug 4af29301): filter tasks and clients by
  // the user's team memberships. Admins see everything; internal users with
  // teams see their team's clients + exceptions + null-client tasks;
  // internal users with no teams see only exceptions + null-client tasks;
  // G5 external users see only their own client.
  const scopes = await getClientScopes(req);
  const isExternal = !!req.user?.clientId;

  let tasks;
  if (scopes === null) {
    tasks = await pool.query(`
      SELECT t.*, c.name as client_name,
        (SELECT json_agg(json_build_object('text', n.text, 'time', n.created_at) ORDER BY n.created_at)
         FROM task_notes n WHERE n.task_id = t.id) as notes
      FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
      ORDER BY t.created_at, t.title, t.id
    `);
  } else {
    const nullClause = isExternal ? '' : ' OR t.client_id IS NULL';
    tasks = await pool.query(`
      SELECT t.*, c.name as client_name,
        (SELECT json_agg(json_build_object('text', n.text, 'time', n.created_at) ORDER BY n.created_at)
         FROM task_notes n WHERE n.task_id = t.id) as notes
      FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.client_id = ANY($1)${nullClause}
      ORDER BY t.created_at, t.title, t.id
    `, [scopes]);
  }

  let clients;
  if (scopes === null) {
    clients = await pool.query(`
      SELECT c.*,
        (SELECT json_agg(json_build_object('name', ct.name, 'role', ct.role, 'notes', ct.notes, 'background', ct.background, 'linkedin', ct.linkedin) ORDER BY ct.sort_order)
         FROM contacts ct WHERE ct.client_id = c.id) as contacts
      FROM clients c ORDER BY c.name
    `);
  } else {
    clients = await pool.query(`
      SELECT c.*,
        (SELECT json_agg(json_build_object('name', ct.name, 'role', ct.role, 'notes', ct.notes, 'background', ct.background, 'linkedin', ct.linkedin) ORDER BY ct.sort_order)
         FROM contacts ct WHERE ct.client_id = c.id) as contacts
      FROM clients c WHERE c.id = ANY($1) ORDER BY c.name
    `, [scopes]);
  }

  // Settings are returned to the browser, so external users (G5) must see
  // only UI-relevant keys. fx_rates, expense_approver, feature flags, and
  // anything else internal is stripped for external accounts.
  const EXTERNAL_SETTINGS_ALLOW = new Set([
    'currency', 'hourly_rate', 'hourlyRate', 'date_format', 'dateFormat',
    'timezone', 'client_priority', 'clientPriority',
  ]);
  const settings = await pool.query('SELECT key, value FROM settings');
  const settingsObj = {};
  settings.rows.forEach(r => {
    if (!isExternal || EXTERNAL_SETTINGS_ALLOW.has(r.key)) settingsObj[r.key] = r.value;
  });

  // Map tasks back to frontend format
  const taskIdMap = {};
  tasks.rows.forEach(r => { taskIdMap[r.id] = r; });

  const frontendTasks = tasks.rows.map(r => ({
    id: r.id,
    title: r.title,
    parentId: r.parent_id,
    client: r.client_name || '',
    status: r.status,
    priority: r.priority || '',
    healthState: r.health_state || '',
    description: r.description || '',
    collaborations: r.collaborations || '',
    successFactor: r.success_factor || '',
    repeatRule: r.repeat_rule || null,
    blockerInfo: r.blocker_info || null,
    assignees: r.assignees || [],
    hoursEstimated: r.hours_estimated || 0,
    hoursSpent: r.hours_spent || 0,
    dueDate: r.due_date || '',
    startDate: r.start_date || '',
    endDate: r.end_date || '',
    dependencies: r.dependencies || [],
    itemType: r.item_type || 'task',
    practiceArea: r.practice_area || null,
    position: r.position || 0,
    sortOrder: r.sort_order || 0,
    notes: r.notes || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    plannerTaskId: r.planner_task_id || '',
    sowId: r.sow_id || null,
    workType: r.work_type || null,
  }));

  // Map client briefs to frontend format
  const frontendBriefs = {};
  clients.rows.forEach(r => {
    frontendBriefs[r.name] = {
      name: r.name,
      description: r.description || '',
      founded: r.founded || '',
      headquarters: r.headquarters || '',
      employees: r.employees || '',
      revenue: r.revenue || '',
      website: r.website || '',
      linkedinCompany: r.linkedin_company || '',
      nbiRelationship: r.nbi_relationship || '',
      practiceArea: r.practice_area || null,
      abbreviation: r.abbreviation || null,
      contacts: r.contacts || [],
    };
  });

  res.json({
    tasks: frontendTasks,
    clientBriefs: frontendBriefs,
    settings: settingsObj,
    knownClients: clients.rows.map(r => r.name),
  });
});

  return router;
};
