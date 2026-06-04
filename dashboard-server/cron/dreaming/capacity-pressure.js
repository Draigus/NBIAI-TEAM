'use strict';

async function analyse(ctx) {
  const { pool } = ctx;
  const insights = [];

  const { rows: users } = await pool.query(
    'SELECT display_name, capacity_hours_per_week FROM users WHERE capacity_hours_per_week IS NOT NULL AND capacity_hours_per_week > 0'
  );

  const { rows: taskCounts } = await pool.query(
    "SELECT unnest(assignees) AS assignee, COUNT(*)::int AS task_count FROM tasks WHERE status NOT IN ('Done', 'Cancelled') AND item_type IN ('story', 'task') AND assignees IS NOT NULL AND array_length(assignees, 1) > 0 GROUP BY unnest(assignees) ORDER BY task_count DESC"
  );

  const HRS_PER_TASK = 4;
  const overloaded = [];
  taskCounts.forEach(tc => {
    const user = users.find(u => u.display_name && u.display_name.toLowerCase() === tc.assignee.toLowerCase());
    const capacity = user ? (parseInt(user.capacity_hours_per_week) || 40) : 40;
    const committed = parseInt(tc.task_count) * HRS_PER_TASK;
    const utilPct = Math.round((committed / capacity) * 100);
    if (utilPct > 100) {
      overloaded.push({ name: tc.assignee, util: utilPct, tasks: parseInt(tc.task_count), capacity });
    }
  });

  overloaded.forEach(o => {
    insights.push({
      category: 'risk', severity: o.util > 150 ? 'critical' : 'warning',
      title: o.name + ' at ' + o.util + '% utilisation',
      body: o.tasks + ' active tasks against ' + o.capacity + 'h/week capacity (~' + (o.tasks * HRS_PER_TASK) + 'h committed).',
      evidence: ['assignee:' + o.name, 'tasks:' + o.tasks, 'util:' + o.util + '%'],
      action: 'Redistribute or defer ' + Math.ceil(o.tasks * (1 - 100/o.util)) + ' tasks to bring below 100%.',
      related_4c: 'cadence',
    });
  });

  let avgUtil = 0;
  if (taskCounts.length > 0) {
    let totalUtil = 0;
    taskCounts.forEach(tc => {
      const user = users.find(u => u.display_name && u.display_name.toLowerCase() === tc.assignee.toLowerCase());
      const capacity = user ? (parseInt(user.capacity_hours_per_week) || 40) : 40;
      const committed = parseInt(tc.task_count) * HRS_PER_TASK;
      totalUtil += Math.round((committed / capacity) * 100);
    });
    avgUtil = Math.round(totalUtil / taskCounts.length);
  }

  return {
    insights,
    trends: { capacity_pressure: { avg_util_pct: avgUtil, over_capacity_count: overloaded.length, trend: overloaded.length > 2 ? 'worsening' : overloaded.length === 0 ? 'improving' : 'stable' } },
  };
}

module.exports = { analyse };
