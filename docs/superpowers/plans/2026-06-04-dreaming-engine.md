# Dreaming Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a nightly analysis cron that runs 7 deterministic analysers over the database and filesystem, writes structured findings into `cc_snapshots.data.dreaming`, and renders them on the Command Centre Work tab.

**Architecture:** Modular analyser pattern — each of the 7 analysis functions lives in its own file under `dashboard-server/cron/dreaming/`, exporting `async function analyse(ctx)`. An orchestrator runs them sequentially with per-analyser error isolation, merges results, and upserts into the existing `cc_snapshots` table. The Work tab gains a new Row 4 with Overnight Insights, Trends, and Stale Report sections.

**Tech Stack:** Node.js, PostgreSQL (via `pg` pool), `node-cron`, `crypto` (for insight IDs), Vitest (testing)

**Spec:** `docs/superpowers/specs/2026-06-04-dreaming-engine-design.md`

---

### Task 1: Orchestrator — `cron/dreaming/index.js`

**Files:**
- Create: `dashboard-server/cron/dreaming/index.js`

This is the backbone — it imports and runs all analysers, handles errors, and writes to the DB. Build it first with stub analysers so the cron registration and snapshot writing work end-to-end.

- [ ] **Step 1: Create the orchestrator**

```js
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
      log('info', 'Dreaming', `${a.name} completed: ${(result.insights || []).length} insights`);
    } catch (e) {
      failed++;
      log('error', 'Dreaming', `${a.name} failed`, { error: e.message });
    }
  }

  // Sort insights: critical first, then warning, then info
  const sevOrder = { critical: 0, warning: 1, info: 2 };
  allInsights.sort((a, b) => (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2));

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

  // Upsert into today's snapshot
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await pool.query(
      'SELECT data FROM cc_snapshots WHERE snapshot_date = $1', [today]
    );
    let data = rows.length > 0 ? rows[0].data : {};
    data.dreaming = dreaming;
    await pool.query(
      `INSERT INTO cc_snapshots (snapshot_date, data) VALUES ($1, $2)
       ON CONFLICT (snapshot_date) DO UPDATE SET data = $2, updated_at = NOW()`,
      [today, JSON.stringify(data)]
    );
    log('info', 'Dreaming', `Engine complete: ${allInsights.length} insights, ${failed} failures, ${dreaming.duration_ms}ms`);
  } catch (e) {
    log('error', 'Dreaming', 'Failed to write snapshot', { error: e.message });
  }

  return dreaming;
}

module.exports = { runDreamingEngine, insightId };
```

- [ ] **Step 2: Verify the file is syntactically valid**

Run: `node -e "require('./dashboard-server/cron/dreaming/index.js')"`

This will fail with missing analyser files — that's expected at this stage. We just need it to parse.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/cron/dreaming/index.js
git commit -m "feat(dreaming): add orchestrator for nightly analysis engine"
```

---

### Task 2: Bug Velocity Analyser

**Files:**
- Create: `dashboard-server/cron/dreaming/bug-velocity.js`
- Create: `dashboard-server/tests/unit/dreaming.test.mjs`

- [ ] **Step 1: Write the test**

```js
// dashboard-server/tests/unit/dreaming.test.mjs
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Helper: mock pool that returns given rows for sequential queries
function mockPool(...queryResults) {
  let callIndex = 0;
  return {
    query: vi.fn(async () => {
      const result = queryResults[callIndex] || { rows: [] };
      callIndex++;
      return result;
    }),
  };
}

function baseCtx(pool) {
  return {
    pool: pool || mockPool(),
    log: vi.fn(),
    fs: require('fs'),
    path: require('path'),
  };
}

describe('Dreaming Engine — Bug Velocity', () => {
  const bugVelocity = require('../../cron/dreaming/bug-velocity');

  it('returns worsening trend when opened > closed', async () => {
    const pool = mockPool(
      { rows: [{ opened: '10', closed: '3' }] },   // 7d window
      { rows: [{ opened: '6', closed: '8' }] },     // prior 7d
      { rows: [] },                                   // stale bugs
      { rows: [{ count: '5' }] }                      // please_review count
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    expect(result.trends.bugs_velocity.trend).toBe('worsening');
    expect(result.trends.bugs_velocity.opened_7d).toBe(10);
    expect(result.trends.bugs_velocity.closed_7d).toBe(3);
    expect(result.trends.bugs_velocity.net).toBe(7);
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.insights[0].category).toBe('risk');
  });

  it('returns improving trend when closed > opened', async () => {
    const pool = mockPool(
      { rows: [{ opened: '3', closed: '10' }] },
      { rows: [{ opened: '6', closed: '4' }] },
      { rows: [] },
      { rows: [{ count: '0' }] }
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    expect(result.trends.bugs_velocity.trend).toBe('improving');
  });

  it('returns stable trend when similar rates', async () => {
    const pool = mockPool(
      { rows: [{ opened: '5', closed: '5' }] },
      { rows: [{ opened: '5', closed: '5' }] },
      { rows: [] },
      { rows: [{ count: '0' }] }
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    expect(result.trends.bugs_velocity.trend).toBe('stable');
  });

  it('flags stale bugs older than 14 days', async () => {
    const pool = mockPool(
      { rows: [{ opened: '1', closed: '1' }] },
      { rows: [{ opened: '1', closed: '1' }] },
      { rows: [
        { id: 1, title: 'Old bug', status: 'open', priority: 'medium', created_at: '2026-05-01' },
        { id: 2, title: 'Another old one', status: 'in_progress', priority: 'high', created_at: '2026-05-10' },
      ]},
      { rows: [{ count: '0' }] }
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    const staleInsight = result.insights.find(i => i.title.includes('bugs open'));
    expect(staleInsight).toBeDefined();
    expect(staleInsight.severity).toBe('warning');
  });

  it('flags large please_review queue', async () => {
    const pool = mockPool(
      { rows: [{ opened: '1', closed: '1' }] },
      { rows: [{ opened: '1', closed: '1' }] },
      { rows: [] },
      { rows: [{ count: '12' }] }
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    const reviewInsight = result.insights.find(i => i.title.includes('review'));
    expect(reviewInsight).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/dreaming.test.mjs`

Expected: FAIL — `Cannot find module './bug-velocity'`

- [ ] **Step 3: Write bug-velocity.js**

```js
'use strict';

async function analyse(ctx) {
  const { pool } = ctx;
  const insights = [];

  // 7-day window: opened and closed counts
  const { rows: [current] } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS opened,
      COUNT(*) FILTER (WHERE status IN ('resolved','closed','wont_fix') AND updated_at >= NOW() - INTERVAL '7 days')::int AS closed
    FROM bug_reports
  `);

  // Prior 7-day window
  const { rows: [prior] } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::int AS opened,
      COUNT(*) FILTER (WHERE status IN ('resolved','closed','wont_fix') AND updated_at >= NOW() - INTERVAL '14 days' AND updated_at < NOW() - INTERVAL '7 days')::int AS closed
    FROM bug_reports
  `);

  const opened7d = parseInt(current.opened) || 0;
  const closed7d = parseInt(current.closed) || 0;
  const net = opened7d - closed7d;
  const priorOpened = parseInt(prior.opened) || 0;
  const priorClosed = parseInt(prior.closed) || 0;
  const priorNet = priorOpened - priorClosed;

  // Trend direction
  let trend = 'stable';
  if (net > 0 && (net > priorNet || priorNet <= 0)) trend = 'worsening';
  else if (net < 0) trend = 'improving';
  else if (net === 0 && priorNet === 0) trend = 'stable';
  else if (Math.abs(net - priorNet) <= 1) trend = 'stable';
  else if (net < priorNet) trend = 'improving';
  else trend = 'worsening';

  // Insight: backlog direction
  if (net > 2) {
    insights.push({
      category: 'risk',
      severity: net > 5 ? 'critical' : 'warning',
      title: 'Bug backlog growing',
      body: `${opened7d} bugs opened in the last 7 days, only ${closed7d} closed. Backlog increased by ${net}.`,
      evidence: [`opened_7d:${opened7d}`, `closed_7d:${closed7d}`],
      action: 'Prioritise bug triage.',
      related_4c: 'capabilities',
    });
  } else if (net < -2) {
    insights.push({
      category: 'achievement',
      severity: 'info',
      title: 'Bug backlog shrinking',
      body: `${closed7d} bugs closed vs ${opened7d} opened. Net reduction of ${Math.abs(net)}.`,
      evidence: [`opened_7d:${opened7d}`, `closed_7d:${closed7d}`],
      action: null,
      related_4c: 'capabilities',
    });
  }

  // Stale bugs: open > 14 days
  const { rows: staleBugs } = await pool.query(`
    SELECT id, title, status, priority, created_at FROM bug_reports
    WHERE status NOT IN ('resolved','closed','wont_fix')
      AND created_at < NOW() - INTERVAL '14 days'
    ORDER BY created_at
  `);

  if (staleBugs.length > 0) {
    insights.push({
      category: 'risk',
      severity: staleBugs.length > 5 ? 'warning' : 'info',
      title: `${staleBugs.length} bugs open longer than 14 days`,
      body: staleBugs.slice(0, 5).map(b => b.title).join(', ') + (staleBugs.length > 5 ? ` (+${staleBugs.length - 5} more)` : ''),
      evidence: staleBugs.slice(0, 5).map(b => `bug:${b.id}`),
      action: 'Review stale bugs for triage or closure.',
      related_4c: 'capabilities',
    });
  }

  // Please review queue depth
  const { rows: [reviewRow] } = await pool.query(`
    SELECT COUNT(*)::int AS count FROM bug_reports WHERE status = 'please_review'
  `);
  const reviewCount = parseInt(reviewRow.count) || 0;
  if (reviewCount > 5) {
    insights.push({
      category: 'gap',
      severity: reviewCount > 15 ? 'warning' : 'info',
      title: `${reviewCount} bugs awaiting review`,
      body: `The please_review queue has ${reviewCount} items waiting for team closure.`,
      evidence: [`please_review:${reviewCount}`],
      action: 'Team should close verified fixes.',
      related_4c: 'cadence',
    });
  }

  return {
    insights,
    trends: {
      bugs_velocity: {
        opened_7d: opened7d,
        closed_7d: closed7d,
        net,
        opened_prior_7d: priorOpened,
        closed_prior_7d: priorClosed,
        trend,
      },
    },
  };
}

module.exports = { analyse };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/dreaming.test.mjs`

Expected: All Bug Velocity tests PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/cron/dreaming/bug-velocity.js dashboard-server/tests/unit/dreaming.test.mjs
git commit -m "feat(dreaming): bug velocity analyser with tests"
```

---

### Task 3: Task Velocity Analyser

**Files:**
- Create: `dashboard-server/cron/dreaming/task-velocity.js`
- Modify: `dashboard-server/tests/unit/dreaming.test.mjs`

- [ ] **Step 1: Add tests to dreaming.test.mjs**

Append a new `describe` block:

```js
describe('Dreaming Engine — Task Velocity', () => {
  const taskVelocity = require('../../cron/dreaming/task-velocity');

  it('returns worsening trend when added > completed', async () => {
    const pool = mockPool(
      { rows: [{ completed: '5', added: '12' }] },    // 7d
      { rows: [{ completed: '8', added: '6' }] },      // prior 7d
      { rows: [] },                                      // stalled tasks
      { rows: [] }                                       // zero-movement projects
    );
    const result = await taskVelocity.analyse(baseCtx(pool));
    expect(result.trends.task_velocity.trend).toBe('worsening');
    expect(result.trends.task_velocity.completed_7d).toBe(5);
    expect(result.trends.task_velocity.added_7d).toBe(12);
  });

  it('flags tasks in-progress longer than 14 days', async () => {
    const pool = mockPool(
      { rows: [{ completed: '5', added: '5' }] },
      { rows: [{ completed: '5', added: '5' }] },
      { rows: [
        { id: 1, title: 'Stuck task', status: 'In Progress', client_name: 'NBI', updated_at: '2026-05-01' },
      ]},
      { rows: [] }
    );
    const result = await taskVelocity.analyse(baseCtx(pool));
    const stalledInsight = result.insights.find(i => i.title.includes('stalled'));
    expect(stalledInsight).toBeDefined();
  });

  it('flags clients with zero movement', async () => {
    const pool = mockPool(
      { rows: [{ completed: '5', added: '5' }] },
      { rows: [{ completed: '5', added: '5' }] },
      { rows: [] },
      { rows: [{ client_name: 'Goals Studio', active_count: '8' }] }
    );
    const result = await taskVelocity.analyse(baseCtx(pool));
    const zeroInsight = result.insights.find(i => i.title.includes('no movement'));
    expect(zeroInsight).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/dreaming.test.mjs`

Expected: FAIL — task-velocity tests fail, bug-velocity tests still pass.

- [ ] **Step 3: Write task-velocity.js**

```js
'use strict';

async function analyse(ctx) {
  const { pool } = ctx;
  const insights = [];

  // 7-day window
  const { rows: [current] } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'Done' AND updated_at >= NOW() - INTERVAL '7 days')::int AS completed,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS added
    FROM tasks
    WHERE item_type IN ('story', 'task')
  `);

  // Prior 7-day window
  const { rows: [prior] } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'Done' AND updated_at >= NOW() - INTERVAL '14 days' AND updated_at < NOW() - INTERVAL '7 days')::int AS completed,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::int AS added
    FROM tasks
    WHERE item_type IN ('story', 'task')
  `);

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
      category: 'risk',
      severity: 'warning',
      title: 'Task queue growing faster than completion',
      body: `${added7d} tasks added vs ${completed7d} completed in the last 7 days.`,
      evidence: [`added_7d:${added7d}`, `completed_7d:${completed7d}`],
      action: 'Review incoming task volume.',
      related_4c: 'cadence',
    });
  }

  // Stalled tasks: in-progress > 14 days without update
  const { rows: stalled } = await pool.query(`
    SELECT t.id, t.title, t.status, c.name AS client_name, t.updated_at
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.status IN ('In Progress', 'In Review')
      AND t.updated_at < NOW() - INTERVAL '14 days'
      AND t.item_type IN ('story', 'task')
    ORDER BY t.updated_at
    LIMIT 20
  `);

  if (stalled.length > 0) {
    insights.push({
      category: 'pattern',
      severity: stalled.length > 5 ? 'warning' : 'info',
      title: `${stalled.length} tasks stalled in-progress >14 days`,
      body: stalled.slice(0, 5).map(t => t.title + (t.client_name ? ` (${t.client_name})` : '')).join(', '),
      evidence: stalled.slice(0, 5).map(t => `task:${t.id}`),
      action: 'Check if these are blocked or deprioritised.',
      related_4c: 'cadence',
    });
  }

  // Projects/clients with zero movement in 7 days
  const { rows: zeroMovement } = await pool.query(`
    SELECT c.name AS client_name, COUNT(t.id)::int AS active_count
    FROM tasks t
    JOIN clients c ON t.client_id = c.id
    WHERE t.status NOT IN ('Done', 'Cancelled')
      AND t.item_type IN ('story', 'task')
      AND t.client_id IS NOT NULL
    GROUP BY c.name
    HAVING COUNT(t.id) >= 5
      AND COUNT(t.id) FILTER (WHERE t.updated_at >= NOW() - INTERVAL '7 days') = 0
    ORDER BY COUNT(t.id) DESC
  `);

  zeroMovement.forEach(zm => {
    insights.push({
      category: 'gap',
      severity: 'info',
      title: `${zm.client_name}: no movement in 7 days`,
      body: `${zm.active_count} active tasks with zero status changes.`,
      evidence: [`client:${zm.client_name}`, `active:${zm.active_count}`],
      action: 'Check if work is ongoing or deprioritised.',
      related_4c: 'cadence',
    });
  });

  return {
    insights,
    trends: {
      task_velocity: {
        completed_7d: completed7d,
        added_7d: added7d,
        net,
        completed_prior_7d: priorCompleted,
        trend,
      },
    },
  };
}

module.exports = { analyse };
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/dreaming.test.mjs`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/cron/dreaming/task-velocity.js dashboard-server/tests/unit/dreaming.test.mjs
git commit -m "feat(dreaming): task velocity analyser with tests"
```

---

### Task 4: Achievements Analyser

**Files:**
- Create: `dashboard-server/cron/dreaming/achievements.js`
- Modify: `dashboard-server/tests/unit/dreaming.test.mjs`

- [ ] **Step 1: Add tests**

```js
describe('Dreaming Engine — Achievements', () => {
  const achievements = require('../../cron/dreaming/achievements');

  it('detects bug momentum when closed > opened', async () => {
    const pool = mockPool(
      { rows: [{ opened: '3', closed: '10' }] },     // bug momentum
      { rows: [] },                                     // projects >80%
      { rows: [] },                                     // cleared backlogs
      { rows: [] }                                      // on-track clients
    );
    const result = await achievements.analyse(baseCtx(pool));
    const momentum = result.insights.find(i => i.title.includes('momentum'));
    expect(momentum).toBeDefined();
    expect(momentum.category).toBe('achievement');
    expect(momentum.severity).toBe('info');
  });

  it('detects projects reaching 80%+ completion', async () => {
    const pool = mockPool(
      { rows: [{ opened: '5', closed: '5' }] },
      { rows: [{ client_name: 'NBI', title: 'Phase 1', pct: 85 }] },
      { rows: [] },
      { rows: [] }
    );
    const result = await achievements.analyse(baseCtx(pool));
    const milestone = result.insights.find(i => i.title.includes('80%'));
    expect(milestone).toBeDefined();
  });

  it('returns empty insights when nothing positive', async () => {
    const pool = mockPool(
      { rows: [{ opened: '10', closed: '3' }] },
      { rows: [] },
      { rows: [] },
      { rows: [] }
    );
    const result = await achievements.analyse(baseCtx(pool));
    expect(result.insights.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/dreaming.test.mjs`

- [ ] **Step 3: Write achievements.js**

```js
'use strict';

async function analyse(ctx) {
  const { pool } = ctx;
  const insights = [];

  // Bug momentum: more closed than opened in 7 days
  const { rows: [bugRate] } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS opened,
      COUNT(*) FILTER (WHERE status IN ('resolved','closed','wont_fix') AND updated_at >= NOW() - INTERVAL '7 days')::int AS closed
    FROM bug_reports
  `);
  const opened = parseInt(bugRate.opened) || 0;
  const closed = parseInt(bugRate.closed) || 0;
  if (closed > opened && closed >= 3) {
    insights.push({
      category: 'achievement',
      severity: 'info',
      title: 'Bug fix momentum',
      body: `${closed} bugs closed vs ${opened} opened this week. Backlog is shrinking.`,
      evidence: [`closed_7d:${closed}`, `opened_7d:${opened}`],
      action: null,
      related_4c: 'capabilities',
    });
  }

  // Projects reaching >80% completion this week
  const { rows: milestoneHits } = await pool.query(`
    SELECT c.name AS client_name, t_parent.title,
      ROUND(COUNT(*) FILTER (WHERE t.status = 'Done')::numeric / NULLIF(COUNT(*), 0) * 100) AS pct
    FROM tasks t
    JOIN tasks t_parent ON t.parent_id = t_parent.id
    JOIN clients c ON t.client_id = c.id
    WHERE t.item_type IN ('story', 'task') AND t.status != 'Cancelled'
    GROUP BY c.name, t_parent.title
    HAVING COUNT(*) >= 5
      AND ROUND(COUNT(*) FILTER (WHERE t.status = 'Done')::numeric / NULLIF(COUNT(*), 0) * 100) >= 80
      AND COUNT(*) FILTER (WHERE t.status = 'Done' AND t.updated_at >= NOW() - INTERVAL '7 days') > 0
    ORDER BY pct DESC
    LIMIT 5
  `);

  milestoneHits.forEach(m => {
    insights.push({
      category: 'achievement',
      severity: 'info',
      title: `${m.client_name}: ${m.title} reached ${m.pct}% complete`,
      body: `Project crossed the 80% threshold this week.`,
      evidence: [`project:${m.title}`, `pct:${m.pct}`],
      action: null,
      related_4c: null,
    });
  });

  // Team members who cleared overdue backlog
  const { rows: clearedBacklogs } = await pool.query(`
    SELECT DISTINCT unnest(t.assignees) AS assignee
    FROM tasks t
    WHERE t.status = 'Done'
      AND t.updated_at >= NOW() - INTERVAL '7 days'
      AND t.due_date IS NOT NULL AND t.due_date != ''
      AND t.due_date::date < t.updated_at::date
      AND t.item_type IN ('story', 'task')
    EXCEPT
    SELECT DISTINCT unnest(t2.assignees)
    FROM tasks t2
    WHERE t2.status NOT IN ('Done', 'Cancelled')
      AND t2.due_date IS NOT NULL AND t2.due_date != ''
      AND t2.due_date::date < CURRENT_DATE
      AND t2.item_type IN ('story', 'task')
  `);

  clearedBacklogs.forEach(cb => {
    insights.push({
      category: 'achievement',
      severity: 'info',
      title: `${cb.assignee} cleared their overdue backlog`,
      body: `All previously overdue items now completed.`,
      evidence: [`assignee:${cb.assignee}`],
      action: null,
      related_4c: null,
    });
  });

  // Clients with all items on track
  const { rows: onTrackClients } = await pool.query(`
    SELECT c.name AS client_name, COUNT(t.id)::int AS total
    FROM tasks t
    JOIN clients c ON t.client_id = c.id
    WHERE t.status NOT IN ('Done', 'Cancelled')
      AND t.item_type IN ('story', 'task')
    GROUP BY c.name
    HAVING COUNT(t.id) >= 5
      AND COUNT(t.id) FILTER (WHERE t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < CURRENT_DATE) = 0
      AND COUNT(t.id) FILTER (WHERE t.status = 'Blocked') = 0
  `);

  onTrackClients.forEach(cl => {
    insights.push({
      category: 'achievement',
      severity: 'info',
      title: `${cl.client_name}: all ${cl.total} items on track`,
      body: 'Zero overdue, zero blocked.',
      evidence: [`client:${cl.client_name}`, `active:${cl.total}`],
      action: null,
      related_4c: null,
    });
  });

  return { insights };
}

module.exports = { analyse };
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/dreaming.test.mjs`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/cron/dreaming/achievements.js dashboard-server/tests/unit/dreaming.test.mjs
git commit -m "feat(dreaming): achievements analyser with tests"
```

---

### Task 5: Capacity Pressure Analyser

**Files:**
- Create: `dashboard-server/cron/dreaming/capacity-pressure.js`
- Modify: `dashboard-server/tests/unit/dreaming.test.mjs`

- [ ] **Step 1: Add tests**

```js
describe('Dreaming Engine — Capacity Pressure', () => {
  const capacityPressure = require('../../cron/dreaming/capacity-pressure');

  it('flags users over 100% utilisation', async () => {
    const pool = mockPool(
      { rows: [
        { display_name: 'Stavros', capacity_hours_per_week: 40 },
        { display_name: 'Glen', capacity_hours_per_week: 40 },
      ]},
      { rows: [
        { assignee: 'Stavros', task_count: '22' },
        { assignee: 'Glen', task_count: '5' },
      ]},
      { rows: [{ avg_util: '120' }] }
    );
    const result = await capacityPressure.analyse(baseCtx(pool));
    const overloaded = result.insights.find(i => i.title.includes('Stavros'));
    expect(overloaded).toBeDefined();
    expect(overloaded.category).toBe('risk');
  });

  it('returns empty when everyone is balanced', async () => {
    const pool = mockPool(
      { rows: [
        { display_name: 'Glen', capacity_hours_per_week: 40 },
      ]},
      { rows: [
        { assignee: 'Glen', task_count: '5' },
      ]},
      { rows: [{ avg_util: '40' }] }
    );
    const result = await capacityPressure.analyse(baseCtx(pool));
    expect(result.insights.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to fail, then write capacity-pressure.js**

```js
'use strict';

async function analyse(ctx) {
  const { pool } = ctx;
  const insights = [];

  // Get users with capacity
  const { rows: users } = await pool.query(
    'SELECT display_name, capacity_hours_per_week FROM users WHERE capacity_hours_per_week IS NOT NULL AND capacity_hours_per_week > 0'
  );

  // Get active task count per assignee
  const { rows: taskCounts } = await pool.query(`
    SELECT unnest(assignees) AS assignee, COUNT(*)::int AS task_count
    FROM tasks
    WHERE status NOT IN ('Done', 'Cancelled')
      AND item_type IN ('story', 'task')
      AND assignees IS NOT NULL AND array_length(assignees, 1) > 0
    GROUP BY unnest(assignees)
    ORDER BY task_count DESC
  `);

  // Build utilisation estimates (rough: each active task ~4hrs/week)
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
      category: 'risk',
      severity: o.util > 150 ? 'critical' : 'warning',
      title: `${o.name} at ${o.util}% utilisation`,
      body: `${o.tasks} active tasks against ${o.capacity}h/week capacity (~${o.tasks * HRS_PER_TASK}h committed).`,
      evidence: [`assignee:${o.name}`, `tasks:${o.tasks}`, `util:${o.util}%`],
      action: `Redistribute or defer ${Math.ceil(o.tasks * (1 - 100/o.util))} tasks to bring below 100%.`,
      related_4c: 'cadence',
    });
  });

  // Capacity trend
  const { rows: [avgRow] } = await pool.query(`
    SELECT COALESCE(AVG(sub.util), 0)::int AS avg_util FROM (
      SELECT unnest(assignees) AS assignee, COUNT(*)::int * ${HRS_PER_TASK} AS committed
      FROM tasks
      WHERE status NOT IN ('Done', 'Cancelled') AND item_type IN ('story', 'task')
        AND assignees IS NOT NULL AND array_length(assignees, 1) > 0
      GROUP BY unnest(assignees)
    ) sub
    CROSS JOIN LATERAL (SELECT COALESCE(u.capacity_hours_per_week, 40) AS cap FROM users u WHERE lower(u.display_name) = lower(sub.assignee) LIMIT 1) uc
    CROSS JOIN LATERAL (SELECT ROUND(sub.committed::numeric / NULLIF(uc.cap, 0) * 100) AS util) x
  `);
  const avgUtil = parseInt(avgRow.avg_util) || 0;

  return {
    insights,
    trends: {
      capacity_pressure: {
        avg_util_pct: avgUtil,
        over_capacity_count: overloaded.length,
        trend: overloaded.length > 2 ? 'worsening' : overloaded.length === 0 ? 'improving' : 'stable',
      },
    },
  };
}

module.exports = { analyse };
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
git add dashboard-server/cron/dreaming/capacity-pressure.js dashboard-server/tests/unit/dreaming.test.mjs
git commit -m "feat(dreaming): capacity pressure analyser with tests"
```

---

### Task 6: Memory Staleness Analyser

**Files:**
- Create: `dashboard-server/cron/dreaming/memory-staleness.js`
- Modify: `dashboard-server/tests/unit/dreaming.test.mjs`

- [ ] **Step 1: Add tests**

```js
describe('Dreaming Engine — Memory Staleness', () => {
  const memStaleness = require('../../cron/dreaming/memory-staleness');

  it('flags old memory files with broken refs', async () => {
    const mockFs = {
      existsSync: vi.fn(p => !p.includes('nonexistent')),
      readdirSync: vi.fn(() => ['old_memory.md', 'MEMORY.md']),
      readFileSync: vi.fn(() => '---\ntype: feedback\ndescription: test\n---\nRefers to `nonexistent/path.js`'),
      statSync: vi.fn(() => ({ mtime: new Date(Date.now() - 100 * 86400000) })),
    };
    const ctx = { ...baseCtx(), fs: mockFs, path: require('path') };
    const result = await memStaleness.analyse(ctx);
    expect(result.stale_report.memory_files.length).toBeGreaterThan(0);
    expect(result.stale_report.memory_files[0].broken_refs).toBe(true);
  });

  it('returns empty when no stale files', async () => {
    const mockFs = {
      existsSync: vi.fn(() => true),
      readdirSync: vi.fn(() => ['fresh_memory.md']),
      readFileSync: vi.fn(() => '---\ntype: user\ndescription: test\n---\nContent'),
      statSync: vi.fn(() => ({ mtime: new Date() })),
    };
    const ctx = { ...baseCtx(), fs: mockFs, path: require('path') };
    const result = await memStaleness.analyse(ctx);
    expect(result.stale_report.memory_files.length).toBe(0);
  });
});
```

- [ ] **Step 2: Write memory-staleness.js**

```js
'use strict';

const STALE_DAYS = 90;

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

async function analyse(ctx) {
  const { fs, path } = ctx;
  const insights = [];
  const staleFiles = [];

  const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '../../..');
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const projectKey = REPO_ROOT.replace(/[^a-zA-Z0-9]/g, '-');
  const MEMORY_DIR = path.join(home, '.claude', 'projects', projectKey, 'memory');

  if (!fs.existsSync(MEMORY_DIR)) {
    return { insights, stale_report: { memory_files: [] } };
  }

  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');

  files.forEach(f => {
    const fp = path.join(MEMORY_DIR, f);
    let stat, content;
    try { stat = fs.statSync(fp); } catch { return; }
    try { content = fs.readFileSync(fp, 'utf8'); } catch { return; }

    const age = daysSince(stat.mtime);

    // Check for broken file references
    const refMatches = content.match(/`([^`]+\.(js|ts|md|py|html))`/g) || [];
    const brokenRefs = [];
    refMatches.forEach(ref => {
      const cleanRef = ref.replace(/`/g, '');
      const fullPath = path.join(REPO_ROOT, cleanRef);
      if (!fs.existsSync(fullPath)) brokenRefs.push(cleanRef);
    });

    if (age > STALE_DAYS || brokenRefs.length > 0) {
      staleFiles.push({
        name: f.replace('.md', ''),
        days_stale: age,
        broken_refs: brokenRefs.length > 0,
        broken_ref_count: brokenRefs.length,
      });
    }
  });

  if (staleFiles.length > 0) {
    const withBroken = staleFiles.filter(f => f.broken_refs);
    const justOld = staleFiles.filter(f => !f.broken_refs);

    if (withBroken.length > 0) {
      insights.push({
        category: 'drift',
        severity: 'warning',
        title: `${withBroken.length} memory files have broken references`,
        body: withBroken.slice(0, 5).map(f => f.name).join(', '),
        evidence: withBroken.slice(0, 5).map(f => `memory:${f.name}`),
        action: 'Update or remove stale memory entries.',
        related_4c: 'context',
      });
    }
    if (justOld.length > 3) {
      insights.push({
        category: 'stale',
        severity: 'info',
        title: `${justOld.length} memory files older than ${STALE_DAYS} days`,
        body: 'These may contain outdated information.',
        evidence: justOld.slice(0, 5).map(f => `memory:${f.name}`),
        action: 'Review for relevance.',
        related_4c: 'context',
      });
    }
  }

  return { insights, stale_report: { memory_files: staleFiles } };
}

module.exports = { analyse };
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
git add dashboard-server/cron/dreaming/memory-staleness.js dashboard-server/tests/unit/dreaming.test.mjs
git commit -m "feat(dreaming): memory staleness analyser with tests"
```

---

### Task 7: Brain Coherence Analyser

**Files:**
- Create: `dashboard-server/cron/dreaming/brain-coherence.js`
- Modify: `dashboard-server/tests/unit/dreaming.test.mjs`

- [ ] **Step 1: Add tests**

```js
describe('Dreaming Engine — Brain Coherence', () => {
  const brainCoherence = require('../../cron/dreaming/brain-coherence');

  it('detects client mismatch between brain and DB', async () => {
    const pool = mockPool(
      { rows: [{ name: 'Couch Heroes' }, { name: 'Lighthouse Games' }, { name: 'Playsage' }] },
      { rows: [{ display_name: 'Glen Pryer' }] }
    );
    const mockFs = {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn((p) => {
        if (p.includes('clients_detailed')) return '## Couch Heroes\n## Lighthouse Games\n';
        return '';
      }),
      readdirSync: vi.fn(() => ['clients_detailed.md']),
      statSync: vi.fn(() => ({ mtime: new Date() })),
    };
    const ctx = { ...baseCtx(pool), fs: mockFs, path: require('path') };
    const result = await brainCoherence.analyse(ctx);
    const drift = result.cross_refs.brain_db_drift.find(d => d.detail.includes('Playsage'));
    expect(drift).toBeDefined();
  });
});
```

- [ ] **Step 2: Write brain-coherence.js**

```js
'use strict';

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

async function analyse(ctx) {
  const { pool, fs, path } = ctx;
  const insights = [];
  const brainDbDrift = [];
  const brainModules = [];

  const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '../../..');
  const BRAIN_DIR = path.join(REPO_ROOT, 'brain');
  const STALE_DAYS = 30;

  // Client name comparison
  try {
    const { rows: dbClients } = await pool.query('SELECT name FROM clients ORDER BY name');
    const dbNames = dbClients.map(c => c.name.toLowerCase());

    const clientsBrain = path.join(BRAIN_DIR, 'clients_detailed.md');
    if (fs.existsSync(clientsBrain)) {
      const content = fs.readFileSync(clientsBrain, 'utf8');
      const brainSections = (content.match(/^## (.+)/gm) || []).map(s => s.replace('## ', '').trim().toLowerCase());

      // DB clients not in brain
      dbNames.forEach(name => {
        if (!brainSections.some(bs => bs.includes(name) || name.includes(bs))) {
          brainDbDrift.push({
            type: 'client_mismatch',
            detail: `${name} exists in DB but not in brain/clients_detailed.md`,
            source: 'clients table vs brain/clients_detailed.md',
          });
        }
      });
    }
  } catch (e) { /* skip client check on error */ }

  // Team roster comparison
  try {
    const { rows: dbUsers } = await pool.query('SELECT display_name FROM users WHERE display_name IS NOT NULL');
    const dbPeople = dbUsers.map(u => u.display_name.toLowerCase());

    const peopleBrain = path.join(BRAIN_DIR, 'people_directory.md');
    if (fs.existsSync(peopleBrain)) {
      const content = fs.readFileSync(peopleBrain, 'utf8');
      const brainPeople = (content.match(/^## (.+)/gm) || []).map(s => s.replace('## ', '').trim().toLowerCase());

      dbPeople.forEach(name => {
        if (!brainPeople.some(bp => bp.includes(name) || name.includes(bp))) {
          brainDbDrift.push({
            type: 'team_mismatch',
            detail: `${name} exists in users table but not in brain/people_directory.md`,
            source: 'users table vs brain/people_directory.md',
          });
        }
      });
    }
  } catch (e) { /* skip team check on error */ }

  // Brain module staleness
  if (fs.existsSync(BRAIN_DIR)) {
    try {
      const modules = fs.readdirSync(BRAIN_DIR).filter(f => f.endsWith('.md'));
      modules.forEach(f => {
        try {
          const stat = fs.statSync(path.join(BRAIN_DIR, f));
          const age = daysSince(stat.mtime);
          if (age > STALE_DAYS) {
            brainModules.push({ name: f.replace('.md', ''), days_stale: age });
          }
        } catch {}
      });
    } catch {}
  }

  if (brainDbDrift.length > 0) {
    insights.push({
      category: 'drift',
      severity: brainDbDrift.length > 3 ? 'warning' : 'info',
      title: `${brainDbDrift.length} brain/DB mismatches detected`,
      body: brainDbDrift.slice(0, 3).map(d => d.detail).join('; '),
      evidence: brainDbDrift.slice(0, 5).map(d => d.source),
      action: 'Reconcile brain modules with current database state.',
      related_4c: 'context',
    });
  }

  if (brainModules.length > 3) {
    insights.push({
      category: 'stale',
      severity: 'info',
      title: `${brainModules.length} brain modules not updated in ${STALE_DAYS}+ days`,
      body: brainModules.slice(0, 5).map(m => m.name).join(', '),
      evidence: brainModules.slice(0, 5).map(m => `brain:${m.name}`),
      action: 'Verify brain modules are current.',
      related_4c: 'context',
    });
  }

  return {
    insights,
    stale_report: { brain_modules: brainModules },
    cross_refs: { brain_db_drift: brainDbDrift },
  };
}

module.exports = { analyse };
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
git add dashboard-server/cron/dreaming/brain-coherence.js dashboard-server/tests/unit/dreaming.test.mjs
git commit -m "feat(dreaming): brain coherence analyser with tests"
```

---

### Task 8: Skill Coverage Analyser

**Files:**
- Create: `dashboard-server/cron/dreaming/skill-coverage.js`
- Modify: `dashboard-server/tests/unit/dreaming.test.mjs`

- [ ] **Step 1: Add tests**

```js
describe('Dreaming Engine — Skill Coverage', () => {
  const skillCoverage = require('../../cron/dreaming/skill-coverage');

  it('flags skills without learnings', async () => {
    const mockFs = {
      existsSync: vi.fn(p => {
        if (p.includes('learnings')) return false;
        if (p.includes('evals')) return false;
        return true;
      }),
      readdirSync: vi.fn((p, opts) => {
        if (opts && opts.withFileTypes) {
          return [{ name: 'brainstorming', isDirectory: () => true }, { name: 'gsd', isDirectory: () => true }];
        }
        return ['2026-06-01_session.md'];
      }),
      readFileSync: vi.fn(() => 'some session content without skill mentions'),
      statSync: vi.fn(() => ({ mtime: new Date() })),
    };
    const ctx = { ...baseCtx(), fs: mockFs, path: require('path') };
    const result = await skillCoverage.analyse(ctx);
    expect(result.stale_report.skills_without_learnings.length).toBe(2);
  });
});
```

- [ ] **Step 2: Write skill-coverage.js**

```js
'use strict';

async function analyse(ctx) {
  const { fs, path } = ctx;
  const insights = [];
  const skillsWithoutLearnings = [];
  const rolesWithoutKnowledge = [];

  const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '../../..');
  const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');
  const ROLES_DIR = path.join(REPO_ROOT, 'roles');
  const SESSION_LOGS_DIR = path.join(REPO_ROOT, 'projects', 'nbi_dashboard', 'session_logs');

  // Skills without learnings
  if (fs.existsSync(SKILLS_DIR)) {
    try {
      const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(e => e.isDirectory());
      entries.forEach(e => {
        const learningsPath = path.join(SKILLS_DIR, e.name, 'learnings.md');
        if (!fs.existsSync(learningsPath)) {
          skillsWithoutLearnings.push(e.name);
        }
      });
    } catch {}
  }

  // Skills not referenced in recent session logs (last 14 days)
  const unreferencedSkills = [];
  if (fs.existsSync(SESSION_LOGS_DIR) && fs.existsSync(SKILLS_DIR)) {
    try {
      const cutoff = Date.now() - 14 * 86400000;
      const logFiles = fs.readdirSync(SESSION_LOGS_DIR)
        .filter(f => f.endsWith('.md'))
        .filter(f => {
          try { return fs.statSync(path.join(SESSION_LOGS_DIR, f)).mtime.getTime() > cutoff; } catch { return false; }
        });
      const logContent = logFiles.map(f => {
        try { return fs.readFileSync(path.join(SESSION_LOGS_DIR, f), 'utf8'); } catch { return ''; }
      }).join('\n').toLowerCase();

      const allSkills = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);

      allSkills.forEach(s => {
        if (!logContent.includes(s.replace(/-/g, ' ')) && !logContent.includes(s)) {
          unreferencedSkills.push(s);
        }
      });
    } catch {}
  }

  // Roles without knowledge
  if (fs.existsSync(ROLES_DIR)) {
    try {
      const roleDirs = fs.readdirSync(ROLES_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name !== '_template');
      roleDirs.forEach(rd => {
        const knowledgeDir = path.join(ROLES_DIR, rd.name, 'knowledge');
        if (!fs.existsSync(knowledgeDir)) {
          rolesWithoutKnowledge.push(rd.name);
        } else {
          try {
            const kFiles = fs.readdirSync(knowledgeDir);
            if (kFiles.length === 0) rolesWithoutKnowledge.push(rd.name);
          } catch {}
        }
      });
    } catch {}
  }

  if (skillsWithoutLearnings.length > 5) {
    insights.push({
      category: 'gap',
      severity: 'info',
      title: `${skillsWithoutLearnings.length} skills have no learnings captured`,
      body: 'Skills without learnings cannot improve over time.',
      evidence: skillsWithoutLearnings.slice(0, 5).map(s => `skill:${s}`),
      action: 'Run evals or capture learnings for active skills.',
      related_4c: 'capabilities',
    });
  }

  if (rolesWithoutKnowledge.length > 3) {
    insights.push({
      category: 'gap',
      severity: 'info',
      title: `${rolesWithoutKnowledge.length} roles have no knowledge banks`,
      body: rolesWithoutKnowledge.slice(0, 5).join(', '),
      evidence: rolesWithoutKnowledge.slice(0, 5).map(r => `role:${r}`),
      action: 'Add AGENT.md knowledge to active roles.',
      related_4c: 'capabilities',
    });
  }

  return {
    insights,
    stale_report: {
      skills_without_learnings: skillsWithoutLearnings,
      roles_without_knowledge: rolesWithoutKnowledge,
    },
  };
}

module.exports = { analyse };
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
git add dashboard-server/cron/dreaming/skill-coverage.js dashboard-server/tests/unit/dreaming.test.mjs
git commit -m "feat(dreaming): skill coverage analyser with tests"
```

---

### Task 9: Cron Registration + Briefing Passthrough

**Files:**
- Modify: `dashboard-server/cron/index.js` (add 2 lines near line 868, before the monthly job)
- Modify: `dashboard-server/routes/command-centre.js` (briefing endpoint adds `dreaming` key)

- [ ] **Step 1: Register the cron job in cron/index.js**

After the PDF cleanup block (line 868) and before the monthly expense block (line 872), add:

```js
// Nightly Dreaming Engine — deterministic analysis cron (Phase 2)
if (cron) {
  const { runDreamingEngine } = require('./dreaming');
  cron.schedule('0 3 * * *', async () => {
    log('info', 'Cron', 'Running Dreaming Engine...');
    try {
      await runDreamingEngine({ pool, log, fs, path });
    } catch (e) {
      log('error', 'Cron', 'Dreaming Engine failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Dreaming Engine scheduled for 03:00 daily');
}
```

Also add `runDreamingEngine` to the exports object at line 1004:

```js
return {
  computeDashboardSnapshot,
  buildPmReportEmails,
  matchSubjectToTask,
  extractLinksFromHtml,
  processOneInboundEmail,
  processInboundEmails,
  buildDueWarningEmails,
  runAttachmentSweep,
  checkHiringStalls,
  runDreamingEngine: require('./dreaming').runDreamingEngine,
};
```

- [ ] **Step 2: Add dreaming passthrough to briefing endpoint**

In `routes/command-centre.js`, inside the briefing endpoint response (around line 641), add `dreaming` to the response object. After the `knowledge_flags` line (line 656), add:

```js
          dreaming: snapRows.length > 0 && snapRows[0].data.dreaming ? snapRows[0].data.dreaming : null,
```

The `snapRows` variable is already available from line 559.

- [ ] **Step 3: Restart staging and verify no crashes**

Run: `pm2 restart nbi-dashboard-staging && pm2 logs nbi-dashboard-staging --lines 10 --nostream`

Expected: Server starts without errors. Look for "Dreaming Engine scheduled for 03:00 daily" in the logs.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/cron/index.js dashboard-server/routes/command-centre.js
git commit -m "feat(dreaming): register 03:00 cron job and briefing passthrough"
```

---

### Task 10: Frontend — Overnight Insights, Trends, Stale Report

**Files:**
- Modify: `nbi_project_dashboard.html` (inside `_ccRenderWorkTab`, after Row 3)

- [ ] **Step 1: Add Row 4 to the Work tab**

After line 24066 (`html += '</div>';` closing Row 3), before `return html;` on line 24068, insert:

```js
  // === ROW 4: Dreaming Engine — Overnight Insights + Trends + Stale Report ===
  var dr = b.dreaming;
  if (dr) {
    var drInsights = dr.insights || [];
    var drTrends = dr.trends || {};
    var drStale = dr.stale_report || {};
    var staleTotal = (drStale.memory_files || []).length + (drStale.brain_modules || []).length + (drStale.skills_without_learnings || []).length + (drStale.roles_without_knowledge || []).length;

    html += '<div class="cc-grid-3">';

    // Overnight Insights card
    html += '<div class="cc-card" style="grid-column:span 2;"><h3><span>&#127769; Overnight Insights</span> <span class="ct">' + drInsights.length + '</span></h3>';
    if (drInsights.length === 0) {
      html += '<div style="padding:8px 0;color:#3fb950">&#10003; No issues detected overnight</div>';
    } else {
      var sevBorders = { critical: '#f85149', warning: '#d29922', info: '#58a6ff' };
      var sevBgs = { critical: 'rgba(248,81,73,.06)', warning: 'rgba(210,153,34,.06)', info: 'rgba(88,166,255,.06)' };
      var catBadges = { risk: 'Risk', drift: 'Drift', stale: 'Stale', gap: 'Gap', achievement: 'Win', pattern: 'Pattern' };
      drInsights.forEach(function(ins) {
        var bc = sevBorders[ins.severity] || '#8b949e';
        var bg = sevBgs[ins.severity] || 'transparent';
        var badge = catBadges[ins.category] || ins.category;
        html += '<div class="cc-row" style="border-left:3px solid ' + bc + ';background:' + bg + ';margin-bottom:6px;padding:8px 12px;border-radius:4px;">';
        html += '<div class="cc-row-b" style="flex:1;">';
        html += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:2px;">';
        html += '<span class="cc-tag" style="background:' + bc + '22;color:' + bc + ';font-size:0.65rem;">' + esc(badge) + '</span>';
        html += '<span class="cc-row-t" style="font-size:0.85rem;">' + esc(ins.title) + '</span>';
        html += '</div>';
        html += '<div class="cc-row-m" style="font-size:0.8rem;">' + esc(ins.body) + '</div>';
        html += '</div>';
        if (ins.action) {
          html += '<div class="cc-row-a" style="min-width:auto;"><button class="cc-btn" style="font-size:0.65rem;white-space:nowrap;">' + esc(ins.action.length > 30 ? ins.action.slice(0, 28) + '...' : ins.action) + '</button></div>';
        }
        html += '</div>';
      });
    }
    if (dr.generated_at) {
      html += '<div style="margin-top:8px;font-size:0.72rem;color:#484f58;">Generated ' + new Date(dr.generated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' (' + dr.duration_ms + 'ms)</div>';
    }
    html += '</div>';

    // Trends + Stale Report stacked in right column
    html += '<div style="display:flex;flex-direction:column;gap:16px;">';

    // Trends card
    html += '<div class="cc-card"><h3><span>&#128200; Trends</span> <span class="ct">7-day</span></h3>';
    var trendLabels = { bugs_velocity: 'Bugs', task_velocity: 'Tasks', capacity_pressure: 'Capacity', test_health: 'Tests' };
    var trendKeys = Object.keys(trendLabels);
    trendKeys.forEach(function(key) {
      var t = drTrends[key];
      if (!t) return;
      var arrow = t.trend === 'improving' ? '&#9650;' : t.trend === 'worsening' ? '&#9660;' : '&#8212;';
      var col = t.trend === 'improving' ? '#3fb950' : t.trend === 'worsening' ? '#f85149' : '#8b949e';
      var val = '';
      if (key === 'bugs_velocity') val = 'net ' + (t.net > 0 ? '+' : '') + t.net;
      else if (key === 'task_velocity') val = t.completed_7d + ' done';
      else if (key === 'capacity_pressure') val = t.avg_util_pct + '% avg';
      else if (key === 'test_health') val = (t.pass_rate || 0) + '% pass';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #21262d;">';
      html += '<span style="font-size:0.82rem;">' + trendLabels[key] + '</span>';
      html += '<span style="font-size:0.82rem;color:' + col + ';">' + arrow + ' ' + val + '</span>';
      html += '</div>';
    });
    html += '</div>';

    // Stale Report card
    if (staleTotal > 0) {
      html += '<div class="cc-card"><h3><span>&#128203; Stale Report</span> <span class="ct">' + staleTotal + '</span></h3>';
      (drStale.brain_modules || []).forEach(function(m) {
        html += '<div style="font-size:0.8rem;padding:2px 0;color:var(--text-secondary);">&#128218; ' + esc(m.name) + ' <span style="color:#d29922;">(' + m.days_stale + 'd)</span></div>';
      });
      (drStale.memory_files || []).slice(0, 5).forEach(function(f) {
        html += '<div style="font-size:0.8rem;padding:2px 0;color:var(--text-secondary);">&#128203; ' + esc(f.name) + ' <span style="color:' + (f.broken_refs ? '#f85149' : '#d29922') + ';">(' + f.days_stale + 'd' + (f.broken_refs ? ' + broken refs' : '') + ')</span></div>';
      });
      if ((drStale.skills_without_learnings || []).length > 0) {
        html += '<div style="font-size:0.8rem;padding:2px 0;color:var(--text-secondary);">&#9889; ' + drStale.skills_without_learnings.length + ' skills without learnings</div>';
      }
      if ((drStale.roles_without_knowledge || []).length > 0) {
        html += '<div style="font-size:0.8rem;padding:2px 0;color:var(--text-secondary);">&#128101; ' + drStale.roles_without_knowledge.length + ' roles without knowledge</div>';
      }
      html += '</div>';
    }

    html += '</div>'; // end right column
    html += '</div>'; // end row 4
  } else {
    // No dreaming data yet
    html += '<div class="cc-card" style="margin-top:16px;text-align:center;padding:20px;"><span style="color:var(--text-secondary);font-size:0.85rem;">&#127769; Overnight analysis will appear here after the first nightly run at 03:00.</span></div>';
  }
```

- [ ] **Step 2: Restart production + staging**

Run: `pm2 restart nbi-dashboard && pm2 restart nbi-dashboard-staging`

- [ ] **Step 3: Manually trigger a dreaming run to populate data**

Run from the repo root:

```bash
node -e "
  const path = require('path');
  process.env.REPO_ROOT = path.resolve('.');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://nbiai:nbiai@localhost:5432/nbi_dashboard' });
  const { runDreamingEngine } = require('./dashboard-server/cron/dreaming');
  runDreamingEngine({ pool, log: (l,p,m,d) => console.log(l,p,m,d||''), fs: require('fs'), path: require('path') })
    .then(r => { console.log('Done:', r.insights.length, 'insights in', r.duration_ms, 'ms'); pool.end(); })
    .catch(e => { console.error(e); pool.end(); });
"
```

Expected: Prints insight count and duration. No crashes.

- [ ] **Step 4: Open browser, verify Work tab shows Overnight Insights**

Navigate to `http://localhost:8888/nbi_project_dashboard.html#commandcentre` and verify Row 4 appears with insights, trends, and stale report.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(dreaming): render overnight insights, trends, and stale report on Work tab"
```

---

### Task 11: Integration Test + Final Verification

**Files:**
- Modify: `dashboard-server/tests/unit/dreaming.test.mjs`

- [ ] **Step 1: Add orchestrator integration test**

```js
describe('Dreaming Engine — Orchestrator', () => {
  const { runDreamingEngine } = require('../../cron/dreaming');

  it('runs all analysers and returns complete dreaming object', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const result = await runDreamingEngine({
      pool,
      log: vi.fn(),
      fs: require('fs'),
      path: require('path'),
    });

    expect(result).toHaveProperty('generated_at');
    expect(result).toHaveProperty('duration_ms');
    expect(result).toHaveProperty('analysers_run', 7);
    expect(result).toHaveProperty('insights');
    expect(result).toHaveProperty('trends');
    expect(result).toHaveProperty('stale_report');
    expect(result).toHaveProperty('cross_refs');
    expect(Array.isArray(result.insights)).toBe(true);
  });

  it('survives individual analyser failures', async () => {
    const pool = {
      query: vi.fn().mockRejectedValueOnce(new Error('DB down'))
        .mockResolvedValue({ rows: [] }),
    };
    const log = vi.fn();
    const result = await runDreamingEngine({ pool, log, fs: require('fs'), path: require('path') });

    expect(result.analysers_failed).toBeGreaterThan(0);
    expect(result.analysers_run).toBe(7);
    const errorCalls = log.mock.calls.filter(c => c[0] === 'error');
    expect(errorCalls.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the full dreaming test suite**

Run: `cd dashboard-server && npx vitest run tests/unit/dreaming.test.mjs`

Expected: All tests PASS

- [ ] **Step 3: Run the full project test suite**

Run: `cd dashboard-server && npm test`

Expected: Dreaming tests pass. Pre-existing failures in client-scope and interview-configs are acceptable.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/tests/unit/dreaming.test.mjs
git commit -m "test(dreaming): add orchestrator integration tests"
```

---

### Task 12: Final Cleanup + Documentation

- [ ] **Step 1: Verify the cron schedule doesn't conflict**

Check PM2 logs for any cron registration errors:

Run: `pm2 logs nbi-dashboard --lines 30 --nostream | findstr /i "dream cron"`

Expected: "Dreaming Engine scheduled for 03:00 daily" present in logs.

- [ ] **Step 2: Run full e2e test suite**

Run: `cd dashboard-server && npm run test:all`

Expected: Unit + e2e tests pass (pre-existing failures excluded).

- [ ] **Step 3: Final commit with all files**

```bash
git add -A
git status
git commit -m "feat(dreaming): complete Phase 2 Dreaming Engine

7 deterministic analysers run nightly at 03:00 London:
- bug-velocity: backlog direction, stale bugs, review queue
- task-velocity: throughput, stalled tasks, zero-movement clients
- achievements: positive momentum, milestone hits, cleared backlogs
- capacity-pressure: per-person utilisation, overload detection
- memory-staleness: broken refs, old files
- brain-coherence: brain/DB drift, stale modules
- skill-coverage: missing learnings, dormant roles

Results written to cc_snapshots.data.dreaming and rendered
on Command Centre Work tab as Overnight Insights + Trends +
Stale Report."
```
