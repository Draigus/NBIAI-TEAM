'use strict';

const crypto = require('crypto');

function insightId(category, title, evidence) {
  return crypto.createHash('md5')
    .update(category + ':' + title + ':' + (evidence || []).sort().join(','))
    .digest('hex')
    .slice(0, 12);
}

async function runDreamingEngine(ctx) {
  const { pool, log } = ctx;
  const start = Date.now();

  const analysers = [
    { name: 'bug-velocity', fn: require('./bug-velocity') },
    { name: 'task-velocity', fn: require('./task-velocity') },
    { name: 'achievements', fn: require('./achievements') },
    { name: 'capacity-pressure', fn: require('./capacity-pressure') },
    { name: 'memory-staleness', fn: require('./memory-staleness') },
    { name: 'brain-coherence', fn: require('./brain-coherence') },
    { name: 'skill-coverage', fn: require('./skill-coverage') },
  ];

  const allInsights = [];
  const trends = {};
  const staleReport = {
    memory_files: [],
    brain_modules: [],
    skills_without_learnings: [],
    roles_without_knowledge: [],
  };
  const crossRefs = { brain_db_drift: [], orphaned_decisions: [] };
  let failed = 0;

  for (const a of analysers) {
    try {
      const result = await a.fn.analyse(ctx);
      if (result.insights) {
        result.insights.forEach(ins => {
          ins.id = ins.id || insightId(ins.category, ins.title, ins.evidence);
          allInsights.push(ins);
        });
      }
      if (result.trends) Object.assign(trends, result.trends);
      if (result.stale_report) {
        if (result.stale_report.memory_files) staleReport.memory_files.push(...result.stale_report.memory_files);
        if (result.stale_report.brain_modules) staleReport.brain_modules.push(...result.stale_report.brain_modules);
        if (result.stale_report.skills_without_learnings) staleReport.skills_without_learnings.push(...result.stale_report.skills_without_learnings);
        if (result.stale_report.roles_without_knowledge) staleReport.roles_without_knowledge.push(...result.stale_report.roles_without_knowledge);
      }
      if (result.cross_refs) {
        if (result.cross_refs.brain_db_drift) crossRefs.brain_db_drift.push(...result.cross_refs.brain_db_drift);
        if (result.cross_refs.orphaned_decisions) crossRefs.orphaned_decisions.push(...result.cross_refs.orphaned_decisions);
      }
      log('info', 'Dreaming', a.name + ' completed: ' + (result.insights || []).length + ' insights');
    } catch (e) {
      failed++;
      log('error', 'Dreaming', a.name + ' failed', { error: e.message });
    }
  }

  const sevOrder = { critical: 0, warning: 1, info: 2 };
  allInsights.sort((a, b) => (sevOrder[a.severity] || 2) - (sevOrder[b.severity] || 2));

  const dreaming = {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - start,
    analysers_run: analysers.length,
    analysers_failed: failed,
    insights: allInsights,
    trends,
    stale_report: staleReport,
    cross_refs: crossRefs,
  };

  try {
    const { rows } = await pool.query(
      'SELECT snapshot_date, data FROM cc_snapshots ORDER BY snapshot_date DESC LIMIT 1'
    );
    if (rows.length > 0) {
      const data = rows[0].data;
      data.dreaming = dreaming;
      await pool.query(
        'UPDATE cc_snapshots SET data = $1, updated_at = NOW() WHERE snapshot_date = $2',
        [JSON.stringify(data), rows[0].snapshot_date]
      );
    } else {
      const today = new Date().toISOString().slice(0, 10);
      await pool.query(
        'INSERT INTO cc_snapshots (snapshot_date, data) VALUES ($1, $2)',
        [today, JSON.stringify({ dreaming })]
      );
    }
    log('info', 'Dreaming', 'Engine complete: ' + allInsights.length + ' insights, ' + failed + ' failures, ' + dreaming.duration_ms + 'ms');
  } catch (e) {
    log('error', 'Dreaming', 'Failed to write snapshot', { error: e.message });
  }

  return dreaming;
}

module.exports = { runDreamingEngine, insightId };
