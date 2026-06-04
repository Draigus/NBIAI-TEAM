'use strict';

async function analyse(ctx) {
  const { pool } = ctx;
  const insights = [];

  const { rows: [current] } = await pool.query(
    "SELECT COUNT(*) FILTER (WHERE status = 'Done' AND updated_at >= NOW() - INTERVAL '7 days')::int AS completed, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS added FROM tasks WHERE item_type IN ('story', 'task')"
  );

  const { rows: [prior] } = await pool.query(
    "SELECT COUNT(*) FILTER (WHERE status = 'Done' AND updated_at >= NOW() - INTERVAL '14 days' AND updated_at < NOW() - INTERVAL '7 days')::int AS completed, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::int AS added FROM tasks WHERE item_type IN ('story', 'task')"
  );

  const completed7d = parseInt(current.completed) || 0;
  const added7d = parseInt(current.added) || 0;
  const net = completed7d - added7d;
  const priorCompleted = parseInt(prior.completed) || 0;

  let trend = 'stable';
  if (completed7d > added7d && completed7d >= priorCompleted) trend = 'improving';
  else if (added7d > completed7d + 3) trend = 'worsening';
  else if (Math.abs(completed7d - added7d) <= 2) trend = 'stable';

  if (added7d > completed7d + 5) {
    insights.push({
      category: 'risk', severity: 'warning',
      title: 'Task queue growing faster than completion',
      body: added7d + ' tasks added vs ' + completed7d + ' completed in the last 7 days.',
      evidence: ['added_7d:' + added7d, 'completed_7d:' + completed7d],
      action: 'Review incoming task volume.', related_4c: 'cadence',
    });
  }

  const { rows: stalled } = await pool.query(
    "SELECT t.id, t.title, t.status, c.name AS client_name, t.updated_at FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.status IN ('In Progress', 'In Review') AND t.updated_at < NOW() - INTERVAL '14 days' AND t.item_type IN ('story', 'task') ORDER BY t.updated_at LIMIT 20"
  );

  if (stalled.length > 0) {
    insights.push({
      category: 'pattern', severity: stalled.length > 5 ? 'warning' : 'info',
      title: stalled.length + ' tasks stalled in-progress >14 days',
      body: stalled.slice(0, 5).map(t => t.title + (t.client_name ? ' (' + t.client_name + ')' : '')).join(', '),
      evidence: stalled.slice(0, 5).map(t => 'task:' + t.id),
      action: 'Check if these are blocked or deprioritised.', related_4c: 'cadence',
    });
  }

  const { rows: zeroMovement } = await pool.query(
    "SELECT c.name AS client_name, COUNT(t.id)::int AS active_count FROM tasks t JOIN clients c ON t.client_id = c.id WHERE t.status NOT IN ('Done', 'Cancelled') AND t.item_type IN ('story', 'task') AND t.client_id IS NOT NULL GROUP BY c.name HAVING COUNT(t.id) >= 5 AND COUNT(t.id) FILTER (WHERE t.updated_at >= NOW() - INTERVAL '7 days') = 0 ORDER BY COUNT(t.id) DESC"
  );

  zeroMovement.forEach(zm => {
    insights.push({
      category: 'gap', severity: 'info',
      title: zm.client_name + ': no movement in 7 days',
      body: zm.active_count + ' active tasks with zero status changes.',
      evidence: ['client:' + zm.client_name, 'active:' + zm.active_count],
      action: 'Check if work is ongoing or deprioritised.', related_4c: 'cadence',
    });
  });

  return {
    insights,
    trends: { task_velocity: { completed_7d: completed7d, added_7d: added7d, net, completed_prior_7d: priorCompleted, trend } },
  };
}

module.exports = { analyse };
