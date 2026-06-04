'use strict';

async function analyse(ctx) {
  const { pool } = ctx;
  const insights = [];

  const { rows: [bugRate] } = await pool.query(
    "SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS opened, COUNT(*) FILTER (WHERE status IN ('resolved','closed','wont_fix') AND updated_at >= NOW() - INTERVAL '7 days')::int AS closed FROM bug_reports"
  );
  const opened = parseInt(bugRate.opened) || 0;
  const closed = parseInt(bugRate.closed) || 0;
  if (closed > opened && closed >= 3) {
    insights.push({
      category: 'achievement', severity: 'info',
      title: 'Bug fix momentum',
      body: closed + ' bugs closed vs ' + opened + ' opened this week. Backlog is shrinking.',
      evidence: ['closed_7d:' + closed, 'opened_7d:' + opened],
      action: null, related_4c: 'capabilities',
    });
  }

  const { rows: milestoneHits } = await pool.query(
    "SELECT c.name AS client_name, t_parent.title, ROUND(COUNT(*) FILTER (WHERE t.status = 'Done')::numeric / NULLIF(COUNT(*), 0) * 100) AS pct FROM tasks t JOIN tasks t_parent ON t.parent_id = t_parent.id JOIN clients c ON t.client_id = c.id WHERE t.item_type IN ('story', 'task') AND t.status != 'Cancelled' GROUP BY c.name, t_parent.title HAVING COUNT(*) >= 5 AND ROUND(COUNT(*) FILTER (WHERE t.status = 'Done')::numeric / NULLIF(COUNT(*), 0) * 100) >= 80 AND COUNT(*) FILTER (WHERE t.status = 'Done' AND t.updated_at >= NOW() - INTERVAL '7 days') > 0 ORDER BY pct DESC LIMIT 5"
  );

  milestoneHits.forEach(m => {
    insights.push({
      category: 'achievement', severity: 'info',
      title: m.client_name + ': ' + m.title + ' reached ' + m.pct + '% complete',
      body: 'Project crossed the 80% threshold this week.',
      evidence: ['project:' + m.title, 'pct:' + m.pct],
      action: null, related_4c: null,
    });
  });

  const { rows: clearedBacklogs } = await pool.query(
    "SELECT DISTINCT unnest(t.assignees) AS assignee FROM tasks t WHERE t.status = 'Done' AND t.updated_at >= NOW() - INTERVAL '7 days' AND t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < t.updated_at::date AND t.item_type IN ('story', 'task') EXCEPT SELECT DISTINCT unnest(t2.assignees) FROM tasks t2 WHERE t2.status NOT IN ('Done', 'Cancelled') AND t2.due_date IS NOT NULL AND t2.due_date != '' AND t2.due_date::date < CURRENT_DATE AND t2.item_type IN ('story', 'task')"
  );

  clearedBacklogs.forEach(cb => {
    insights.push({
      category: 'achievement', severity: 'info',
      title: cb.assignee + ' cleared their overdue backlog',
      body: 'All previously overdue items now completed.',
      evidence: ['assignee:' + cb.assignee],
      action: null, related_4c: null,
    });
  });

  const { rows: onTrackClients } = await pool.query(
    "SELECT c.name AS client_name, COUNT(t.id)::int AS total FROM tasks t JOIN clients c ON t.client_id = c.id WHERE t.status NOT IN ('Done', 'Cancelled') AND t.item_type IN ('story', 'task') GROUP BY c.name HAVING COUNT(t.id) >= 5 AND COUNT(t.id) FILTER (WHERE t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < CURRENT_DATE) = 0 AND COUNT(t.id) FILTER (WHERE t.status = 'Blocked') = 0"
  );

  onTrackClients.forEach(cl => {
    insights.push({
      category: 'achievement', severity: 'info',
      title: cl.client_name + ': all ' + cl.total + ' items on track',
      body: 'Zero overdue, zero blocked.',
      evidence: ['client:' + cl.client_name, 'active:' + cl.total],
      action: null, related_4c: null,
    });
  });

  return { insights };
}

module.exports = { analyse };
