'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, getClientScopes } = ctx;

  /**
   * GET /api/dashboard/summary
   * Compute dashboard statistics: task counts by status and health,
   * hours totals, breakdowns by client, and breakdowns by assignee.
   * Optionally filtered by client_id.
   */
  router.get('/api/dashboard/summary', async (req, res) => {
    const scopes = await getClientScopes(req);
    let { client_id } = req.query;
    if (scopes && scopes.length === 1) client_id = scopes[0];
    let clientFilter = ''; let vals = [];
    if (client_id) { clientFilter = 'WHERE t.client_id = $1'; vals = [client_id]; }
    else if (scopes && scopes.length > 1) { clientFilter = 'WHERE t.client_id = ANY($1)'; vals = [scopes]; }

    const stats = await pool.query(`
      SELECT
        count(*) as total_tasks,
        count(*) FILTER (WHERE status = 'Not started') as not_started,
        count(*) FILTER (WHERE status = 'In progress') as in_progress,
        count(*) FILTER (WHERE status = 'Planning') as planning,
        count(*) FILTER (WHERE status = 'Done') as done,
        count(*) FILTER (WHERE status = 'Blocked') as blocked,
        count(*) FILTER (WHERE status = 'Cancelled') as cancelled,
        count(*) FILTER (WHERE health_state = 'Red') as health_red,
        count(*) FILTER (WHERE health_state = 'Yellow') as health_yellow,
        count(*) FILTER (WHERE health_state = 'Green') as health_green,
        count(*) FILTER (WHERE health_state = 'Blocked') as health_blocked,
        COALESCE(sum(hours_estimated), 0) as total_hours_estimated,
        COALESCE(sum(hours_spent), 0) as total_hours_spent
      FROM tasks t ${clientFilter}
    `, vals);

    let byClientQuery = `
      SELECT c.id, c.name,
        count(t.id) as task_count,
        count(t.id) FILTER (WHERE t.status = 'Done') as done_count,
        COALESCE(sum(t.hours_estimated), 0) as hours_estimated,
        COALESCE(sum(t.hours_spent), 0) as hours_spent
      FROM clients c
      LEFT JOIN tasks t ON t.client_id = c.id`;
    let byClientVals = [];
    if (scopes) {
      byClientQuery += ' WHERE c.id = ANY($1)';
      byClientVals = [scopes];
    }
    byClientQuery += ' GROUP BY c.id, c.name ORDER BY c.name';
    const byClient = await pool.query(byClientQuery, byClientVals);

    const byAssignee = await pool.query(`
      SELECT unnest(assignees) as assignee, count(*) as task_count,
        count(*) FILTER (WHERE status = 'In progress') as active_count
      FROM tasks t ${clientFilter}
      GROUP BY assignee ORDER BY task_count DESC
    `, vals);

    res.json({
      stats: stats.rows[0],
      by_client: byClient.rows,
      by_assignee: byAssignee.rows,
    });
  });

  /**
   * GET /api/dashboard/snapshots?days=56
   * Returns daily KPI snapshots for the last N days (default 56 = 8 weeks).
   * Used for week-over-week trend deltas and the Work Completed chart.
   */
  router.get('/api/dashboard/snapshots', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const days = Math.min(Math.max(parseInt(req.query.days) || 56, 1), 365);
    try {
      const { rows } = await pool.query(
        `SELECT snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count,
                hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed,
                on_track_count, active_leads_count
         FROM dashboard_snapshots
         WHERE snapshot_date >= CURRENT_DATE - $1::integer
         ORDER BY snapshot_date ASC`,
        [days]
      );
      res.json({ snapshots: rows });
    } catch (e) {
      log('error', 'API', 'Dashboard snapshots query failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/dashboard/health-scores — Per-client health score (0-100, Red/Amber/Green) */
  router.get('/api/dashboard/health-scores', async (req, res) => {
    try {
      const { rows: clients } = await pool.query(
        `SELECT c.id, c.name FROM clients c
         WHERE EXISTS (SELECT 1 FROM tasks t WHERE t.client_id = c.id)
         ORDER BY c.name`
      );
      const now = new Date();
      const sevenDaysAgo = new Date(now - 7 * 86400000);
      const fourteenDaysAgo = new Date(now - 14 * 86400000);

      const scores = [];
      for (const client of clients) {
        const { rows: tasks } = await pool.query(
          `SELECT status, health, due_date, updated_at, assignees
           FROM tasks WHERE client_id = $1 AND status NOT IN ('Done', 'Cancelled')`,
          [client.id]
        );
        const { rows: completions } = await pool.query(
          `SELECT updated_at FROM tasks
           WHERE client_id = $1 AND status = 'Done'
           ORDER BY updated_at DESC LIMIT 1`,
          [client.id]
        );

        let penalty = 0;
        const total = tasks.length;
        if (total === 0) { scores.push({ ...client, score: 100, grade: 'green', factors: [] }); continue; }

        const factors = [];
        const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < now);
        if (overdue.length > 0) {
          const overdueP = Math.round((overdue.length / total) * 30);
          penalty += overdueP;
          factors.push({ label: 'Overdue tasks', count: overdue.length, penalty: overdueP });
        }

        const blocked = tasks.filter(t => t.status === 'Blocked' || t.health === 'blocked');
        if (blocked.length > 0) {
          const blockedP = Math.min(blocked.length * 5, 20);
          penalty += blockedP;
          factors.push({ label: 'Blocked tasks', count: blocked.length, penalty: blockedP });
        }

        const stale = tasks.filter(t => t.updated_at && new Date(t.updated_at) < sevenDaysAgo);
        if (stale.length > 0) {
          const staleP = Math.min(stale.length * 3, 15);
          penalty += staleP;
          factors.push({ label: 'Stale tasks (>7d)', count: stale.length, penalty: staleP });
        }

        if (completions.length === 0 || new Date(completions[0].updated_at) < fourteenDaysAgo) {
          penalty += 10;
          factors.push({ label: 'No recent completions (>14d)', count: 1, penalty: 10 });
        }

        const unassigned = tasks.filter(t => !t.assignees || t.assignees.length === 0);
        if (unassigned.length > 0) {
          const unassP = Math.min(unassigned.length * 2, 10);
          penalty += unassP;
          factors.push({ label: 'Unassigned tasks', count: unassigned.length, penalty: unassP });
        }

        const score = Math.max(0, 100 - penalty);
        const grade = score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red';
        scores.push({ ...client, score, grade, factors });
      }
      res.json(scores);
    } catch (e) {
      log('error', 'API', 'Health scores failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/dashboard/activity — Recent audit log entries for the activity feed */
  router.get('/api/dashboard/activity', async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const { rows } = await pool.query(
        `SELECT a.entity_type, a.entity_id, a.action, a.changed_by, a.changes, a.created_at,
                CASE
                  WHEN a.entity_type = 'task' THEN (SELECT title FROM tasks WHERE id = a.entity_id)
                  WHEN a.entity_type = 'client' THEN (SELECT name FROM clients WHERE id = a.entity_id)
                  WHEN a.entity_type IN ('candidate', 'hiring') THEN (SELECT name FROM candidates WHERE id = a.entity_id)
                  WHEN a.entity_type = 'lead' THEN (SELECT title FROM leads WHERE id = a.entity_id)
                  WHEN a.entity_type = 'bug' THEN (SELECT title FROM bug_reports WHERE id = a.entity_id)
                  ELSE NULL
                END AS entity_title
         FROM audit_log a
         WHERE a.entity_type IN ('task', 'client', 'candidate', 'hiring', 'lead', 'bug', 'finance')
         ORDER BY a.created_at DESC LIMIT $1`,
        [limit]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'API', 'Activity feed failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
