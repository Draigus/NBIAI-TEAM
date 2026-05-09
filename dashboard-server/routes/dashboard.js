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

  return router;
};
