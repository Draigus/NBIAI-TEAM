'use strict';

async function analyse(ctx) {
  const { pool } = ctx;
  const insights = [];

  const { rows: [current] } = await pool.query(
    "SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS opened, COUNT(*) FILTER (WHERE status IN ('resolved','closed','wont_fix') AND updated_at >= NOW() - INTERVAL '7 days')::int AS closed FROM bug_reports"
  );

  const { rows: [prior] } = await pool.query(
    "SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::int AS opened, COUNT(*) FILTER (WHERE status IN ('resolved','closed','wont_fix') AND updated_at >= NOW() - INTERVAL '14 days' AND updated_at < NOW() - INTERVAL '7 days')::int AS closed FROM bug_reports"
  );

  const opened7d = parseInt(current.opened) || 0;
  const closed7d = parseInt(current.closed) || 0;
  const net = opened7d - closed7d;
  const priorOpened = parseInt(prior.opened) || 0;
  const priorClosed = parseInt(prior.closed) || 0;
  const priorNet = priorOpened - priorClosed;

  let trend = 'stable';
  if (net > 0 && (net > priorNet || priorNet <= 0)) trend = 'worsening';
  else if (net < 0) trend = 'improving';
  else if (net === 0 && priorNet === 0) trend = 'stable';
  else if (Math.abs(net - priorNet) <= 1) trend = 'stable';
  else if (net < priorNet) trend = 'improving';
  else trend = 'worsening';

  if (net > 2) {
    insights.push({
      category: 'risk', severity: net > 5 ? 'critical' : 'warning',
      title: 'Bug backlog growing',
      body: opened7d + ' bugs opened in the last 7 days, only ' + closed7d + ' closed. Backlog increased by ' + net + '.',
      evidence: ['opened_7d:' + opened7d, 'closed_7d:' + closed7d],
      action: 'Prioritise bug triage.', related_4c: 'capabilities',
    });
  } else if (net < -2) {
    insights.push({
      category: 'achievement', severity: 'info',
      title: 'Bug backlog shrinking',
      body: closed7d + ' bugs closed vs ' + opened7d + ' opened. Net reduction of ' + Math.abs(net) + '.',
      evidence: ['opened_7d:' + opened7d, 'closed_7d:' + closed7d],
      action: null, related_4c: 'capabilities',
    });
  }

  const { rows: staleBugs } = await pool.query(
    "SELECT id, title, status, priority, created_at FROM bug_reports WHERE status NOT IN ('resolved','closed','wont_fix') AND created_at < NOW() - INTERVAL '14 days' ORDER BY created_at"
  );

  if (staleBugs.length > 0) {
    insights.push({
      category: 'risk', severity: staleBugs.length > 5 ? 'warning' : 'info',
      title: staleBugs.length + ' bugs open longer than 14 days',
      body: staleBugs.slice(0, 5).map(b => b.title).join(', ') + (staleBugs.length > 5 ? ' (+' + (staleBugs.length - 5) + ' more)' : ''),
      evidence: staleBugs.slice(0, 5).map(b => 'bug:' + b.id),
      action: 'Review stale bugs for triage or closure.', related_4c: 'capabilities',
    });
  }

  const { rows: [reviewRow] } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM bug_reports WHERE status = 'please_review'"
  );
  const reviewCount = parseInt(reviewRow.count) || 0;
  if (reviewCount > 5) {
    insights.push({
      category: 'gap', severity: reviewCount > 15 ? 'warning' : 'info',
      title: reviewCount + ' bugs awaiting review',
      body: 'The please_review queue has ' + reviewCount + ' items waiting for team closure.',
      evidence: ['please_review:' + reviewCount],
      action: 'Team should close verified fixes.', related_4c: 'cadence',
    });
  }

  return {
    insights,
    trends: { bugs_velocity: { opened_7d: opened7d, closed_7d: closed7d, net, opened_prior_7d: priorOpened, closed_prior_7d: priorClosed, trend } },
  };
}

module.exports = { analyse };
