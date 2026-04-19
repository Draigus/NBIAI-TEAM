# Portfolio Dashboard v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the WorkSage Dashboard view from a card-grid layout to an executive portfolio dashboard with a client sidebar, four visualisation panels, and a bottom insights row.

**Architecture:** The dashboard is a single HTML file (`nbi_project_dashboard.html`) containing CSS, HTML, and JS. The server is `dashboard-server/server.js` (Express/CJS). A new `dashboard_snapshots` table stores daily KPI values for week-over-week trend deltas and the Work Completed chart. The Gantt timeline panel reuses existing rendering functions. All charts are pure HTML/CSS/JS — no external charting library.

**Tech Stack:** HTML/CSS/JS (frontend), Node.js/Express/PostgreSQL (server), Vitest/supertest (tests), PM2 (process manager)

**Spec:** `docs/superpowers/specs/2026-04-18-portfolio-dashboard-v3-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/migrations/028_dashboard_snapshots.sql` | Create | Migration for `dashboard_snapshots` table |
| `dashboard-server/server.js` | Modify | Add snapshot cron job, snapshot API endpoint, startup bootstrapper |
| `dashboard-server/tests/unit/dashboard-snapshots.test.mjs` | Create | Tests for snapshot API + cron logic |
| `nbi_project_dashboard.html` | Modify | Rewrite CSS + `renderPortfolioDashboard()` + new panel render functions |

---

### Task 1: Migration — `dashboard_snapshots` table

**Files:**
- Create: `dashboard-server/migrations/028_dashboard_snapshots.sql`

- [ ] **Step 1a: Write the migration SQL**

```sql
-- 028_dashboard_snapshots.sql
-- Daily KPI snapshots for week-over-week trend deltas and Work Completed chart.

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  active_projects INTEGER NOT NULL DEFAULT 0,
  overdue_count INTEGER NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0,
  at_risk_count INTEGER NOT NULL DEFAULT 0,
  hours_spent NUMERIC(10,1) NOT NULL DEFAULT 0,
  hours_estimated NUMERIC(10,1) NOT NULL DEFAULT 0,
  tasks_planned INTEGER NOT NULL DEFAULT 0,
  tasks_added INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_date
  ON dashboard_snapshots (snapshot_date DESC);
```

- [ ] **Step 1b: Apply the migration**

Run: `cd dashboard-server && pm2 restart nbi-dashboard`

Check PM2 logs for: `Applied migration 028_dashboard_snapshots.sql`

- [ ] **Step 1c: Verify table exists**

```bash
cd dashboard-server && node -e "
  const {pool} = require('./tests/helpers/db');
  pool.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dashboard_snapshots' ORDER BY ordinal_position\")
    .then(r => { console.log(r.rows); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
"
```

Expected: 12 columns matching the schema above.

- [ ] **Step 1d: Commit**

```bash
git add dashboard-server/migrations/028_dashboard_snapshots.sql
git commit -m "feat(db): add dashboard_snapshots table for KPI trend deltas (028)"
```

---

### Task 2: Server — snapshot cron job + startup bootstrapper + API endpoint

**Files:**
- Modify: `dashboard-server/server.js` (cron section ~line 7780+, API section near `/api/dashboard/summary`)
- Create: `dashboard-server/tests/unit/dashboard-snapshots.test.mjs`

- [ ] **Step 2a: Write the snapshot computation function**

Add after the existing `/api/dashboard/summary` endpoint (around line 5060):

```javascript
/**
 * Compute a daily KPI snapshot from current task state.
 * Returns an object with all dashboard_snapshots columns (except id/created_at).
 */
async function computeDashboardSnapshot() {
  const today = new Date().toISOString().slice(0, 10);
  const { rows: taskRows } = await pool.query(`
    SELECT t.status, t.health_state, t.due_date, t.hours_spent, t.hours_estimated,
           t.parent_id, t.created_at::date as created_date, t.title
    FROM tasks t
  `);

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const roots = taskRows.filter(r => !r.parent_id && r.title && r.title.trim() !== 'New Task');
  const activeRoots = roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const overdue = taskRows.filter(r => r.due_date && r.status !== 'Done' && r.status !== 'Cancelled' && new Date(r.due_date) < now);
  const blocked = taskRows.filter(r => r.health_state === 'Blocked' && r.status !== 'Done' && r.status !== 'Cancelled');
  const atRisk = taskRows.filter(r => r.health_state === 'Red' && r.status !== 'Done' && r.status !== 'Cancelled');
  const hrsSpent = taskRows.reduce((s, r) => s + (parseFloat(r.hours_spent) || 0), 0);
  const hrsEst = taskRows.reduce((s, r) => s + (parseFloat(r.hours_estimated) || 0), 0);

  const activeTasks = taskRows.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const addedToday = taskRows.filter(r => r.created_date === today);
  const completedToday = taskRows.filter(r => r.status === 'Done');

  return {
    snapshot_date: today,
    active_projects: activeRoots.length,
    overdue_count: overdue.length,
    blocked_count: blocked.length,
    at_risk_count: atRisk.length,
    hours_spent: hrsSpent.toFixed(1),
    hours_estimated: hrsEst.toFixed(1),
    tasks_planned: activeTasks.length,
    tasks_added: addedToday.length,
    tasks_completed: completedToday.length,
  };
}
```

- [ ] **Step 2b: Add the cron job**

Add in the cron section (after the existing `cron.schedule` blocks, around line 8495):

```javascript
  // Daily dashboard snapshot at 00:05 UTC
  cron.schedule('5 0 * * *', async () => {
    try {
      const snap = await computeDashboardSnapshot();
      await pool.query(
        `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (snapshot_date) DO NOTHING`,
        [snap.snapshot_date, snap.active_projects, snap.overdue_count, snap.blocked_count, snap.at_risk_count, snap.hours_spent, snap.hours_estimated, snap.tasks_planned, snap.tasks_added, snap.tasks_completed]
      );
      log('info', 'Cron', 'Dashboard snapshot recorded', { date: snap.snapshot_date });
    } catch (e) {
      log('error', 'Cron', 'Dashboard snapshot failed', { error: e.message });
    }
  });
  log('info', 'Cron', 'Dashboard snapshot scheduled for 00:05 UTC daily');
```

- [ ] **Step 2c: Add startup bootstrapper**

Add right after the cron schedule block from Step 2b:

```javascript
  // Bootstrap today's snapshot on startup if it doesn't exist yet
  (async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { rows } = await pool.query('SELECT 1 FROM dashboard_snapshots WHERE snapshot_date = $1', [today]);
      if (rows.length === 0) {
        const snap = await computeDashboardSnapshot();
        await pool.query(
          `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (snapshot_date) DO NOTHING`,
          [snap.snapshot_date, snap.active_projects, snap.overdue_count, snap.blocked_count, snap.at_risk_count, snap.hours_spent, snap.hours_estimated, snap.tasks_planned, snap.tasks_added, snap.tasks_completed]
        );
        log('info', 'Startup', 'Bootstrapped dashboard snapshot', { date: today });
      }
    } catch (e) {
      log('warn', 'Startup', 'Dashboard snapshot bootstrap failed', { error: e.message });
    }
  })();
```

- [ ] **Step 2d: Add the API endpoint**

Add near the existing `/api/dashboard/summary` endpoint:

```javascript
/**
 * GET /api/dashboard/snapshots?days=56
 * Returns daily KPI snapshots for the last N days (default 56 = 8 weeks).
 * Used for week-over-week trend deltas and the Work Completed chart.
 */
app.get('/api/dashboard/snapshots', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const days = Math.min(Math.max(parseInt(req.query.days) || 56, 1), 365);
  try {
    const { rows } = await pool.query(
      `SELECT snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count,
              hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed
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
```

- [ ] **Step 2e: Write tests**

Create `dashboard-server/tests/unit/dashboard-snapshots.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Dashboard snapshots', () => {
  async function setup() {
    const client = await createTestClient({ name: 'Test Client' });
    const admin = await createTestUser({ username: 'admin_snap', role: 'admin' });
    const token = await mintSession(admin.id);
    await createTestTask({ title: 'Active Task', client_id: client.id, status: 'In progress' });
    await createTestTask({ title: 'Done Task', client_id: client.id, status: 'Done' });
    await createTestTask({ title: 'Overdue Task', client_id: client.id, status: 'In progress', due_date: '2020-01-01' });
    return { client, admin, token };
  }

  it('GET /api/dashboard/snapshots returns 401 without auth', async () => {
    const res = await request(app).get('/api/dashboard/snapshots');
    expect(res.status).toBe(401);
  });

  it('GET /api/dashboard/snapshots returns empty array when no snapshots exist', async () => {
    const { token } = await setup();
    const res = await request(app)
      .get('/api/dashboard/snapshots')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.snapshots).toEqual([]);
  });

  it('GET /api/dashboard/snapshots returns inserted snapshots', async () => {
    const { token } = await setup();
    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed)
       VALUES ($1, 5, 2, 1, 3, 10.5, 40.0, 20, 5, 8)`,
      [today]
    );
    const res = await request(app)
      .get('/api/dashboard/snapshots?days=7')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.snapshots.length).toBe(1);
    expect(res.body.snapshots[0].active_projects).toBe(5);
    expect(res.body.snapshots[0].overdue_count).toBe(2);
  });

  it('days parameter is clamped to 1-365', async () => {
    const { token } = await setup();
    const res = await request(app)
      .get('/api/dashboard/snapshots?days=9999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2f: Run tests**

```bash
cd dashboard-server && npx vitest run tests/unit/dashboard-snapshots.test.mjs
```

Expected: 4 tests pass.

- [ ] **Step 2g: Restart PM2 and verify bootstrap**

```bash
pm2 restart nbi-dashboard
pm2 logs nbi-dashboard --lines 5 --nostream
```

Expected: log line containing `Bootstrapped dashboard snapshot` or `Dashboard snapshot scheduled`.

- [ ] **Step 2h: Verify API live**

```bash
curl -s -H "Cookie: $(cat /tmp/nbi-cookie 2>/dev/null || echo '')" http://localhost:8888/api/dashboard/snapshots?days=7
```

Expected: `{"snapshots":[...]}` with today's bootstrapped snapshot.

- [ ] **Step 2i: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/dashboard-snapshots.test.mjs
git commit -m "feat(server): dashboard snapshot cron + API for KPI trend deltas"
```

---

### Task 3: Frontend CSS — new layout classes

**Files:**
- Modify: `nbi_project_dashboard.html` (CSS section, lines ~370-410)

This task replaces the existing `.portfolio-*` CSS with the new layout: client sidebar left, 2x2 viz grid right, bottom row.

- [ ] **Step 3a: Replace portfolio CSS**

Replace the entire `/* ===== PORTFOLIO DASHBOARD ===== */` CSS block (lines ~370-410) with:

```css
/* ===== PORTFOLIO DASHBOARD v3 ===== */
.pf { display: flex; flex-direction: column; gap: var(--space-lg); }
.pf__strip { display: flex; gap: 2px; background: var(--bg-surface); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-default); }
.pf__strip-item { flex: 1; text-align: center; padding: 14px 8px; background: color-mix(in srgb, var(--bg-card) 85%, var(--text-muted)); }
.pf__strip-val { display: block; font-size: 1.8rem; font-weight: 700; font-family: var(--font-display); line-height: 1.2; }
.pf__strip-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
.pf__strip-delta { font-size: 0.68rem; font-weight: 600; margin-left: 4px; }
.pf__strip-delta--up { }
.pf__strip-delta--down { }

.pf__main { display: flex; gap: var(--space-md); min-height: 0; }
.pf__sidebar { width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: var(--space-sm); max-height: calc(100vh - 220px); overflow-y: auto; }
.pf__sidebar::-webkit-scrollbar { width: 4px; }
.pf__sidebar::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }

.pf__client { background: color-mix(in srgb, var(--bg-card) 85%, var(--text-muted)); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
.pf__client:hover { border-color: var(--accent-border); }
.pf__client--selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.pf__client--red { border-left: 4px solid var(--danger); }
.pf__client--yellow { border-left: 4px solid var(--warning); }
.pf__client--green { border-left: 4px solid var(--success); }
.pf__client-name { font-weight: 600; font-size: 1.1rem; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
.pf__client-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.pf__client-stats { font-size: 0.75rem; color: var(--text-muted); line-height: 1.6; }
.pf__client-stats span { margin-right: 8px; }
.pf__client-stats .danger { color: var(--danger); font-weight: 600; }
.pf__client-bar { height: 5px; background: var(--border-subtle); border-radius: 3px; overflow: hidden; margin-top: 8px; }
.pf__client-bar-fill { height: 100%; border-radius: 3px; }
.pf__client-pct { font-size: 0.7rem; color: var(--text-muted); text-align: right; margin-top: 2px; }

.pf__panels { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); min-width: 0; }
.pf__panel { background: color-mix(in srgb, var(--bg-card) 85%, var(--text-muted)); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; }
.pf__panel-hdr { padding: 16px 20px 8px; }
.pf__panel-title { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
.pf__panel-sub { font-size: 0.68rem; color: var(--text-muted); margin-top: 2px; }
.pf__panel-body { padding: 0 16px 16px; flex: 1; overflow: auto; }

.pf__bottom { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md); }

.pf__attn-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-surface); border-radius: 6px; cursor: pointer; transition: background 0.15s; }
.pf__attn-item:hover { background: var(--bg-hover); }
.pf__attn-badge { font-size: 0.6rem; padding: 3px 7px; border-radius: 3px; font-weight: 600; white-space: nowrap; border: 1px solid; }
.pf__attn-badge--overdue { background: rgba(248,113,113,0.1); color: var(--danger); border-color: rgba(248,113,113,0.2); }
.pf__attn-badge--risk { background: rgba(248,113,113,0.1); color: var(--danger); border-color: rgba(248,113,113,0.2); }
.pf__attn-badge--blocked { background: rgba(167,139,250,0.1); color: var(--purple); border-color: rgba(167,139,250,0.2); }
.pf__attn-title { font-size: 0.78rem; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pf__attn-context { font-size: 0.65rem; color: var(--text-muted); margin-top: 2px; }

.pf__bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 150px; border-bottom: 1px solid var(--border-default); }
.pf__bar-week { flex: 1; display: flex; gap: 2px; align-items: flex-end; }
.pf__bar-stack { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; }
.pf__bar-seg { border-radius: 2px 2px 0 0; }
.pf__bar-week--current { outline: 1px solid rgba(59,130,246,0.25); border-radius: 2px; }

.pf__scorecard { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
.pf__scorecard th { text-align: center; padding: 8px; color: var(--text-muted); font-weight: 500; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-default); }
.pf__scorecard th:first-child { text-align: left; }
.pf__scorecard td { padding: 10px 8px; border-bottom: 1px solid var(--border-subtle); }
.pf__scorecard tr { cursor: pointer; }
.pf__scorecard tr:hover { background: var(--bg-hover); }
.pf__scorecard-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; }

.pf__workload-row { display: flex; align-items: center; gap: 10px; padding: 6px 10px; background: var(--bg-surface); border-radius: 6px; cursor: pointer; }
.pf__workload-row:hover { background: var(--bg-hover); }
.pf__workload-name { font-size: 0.78rem; color: var(--text-primary); width: 70px; flex-shrink: 0; }
.pf__workload-bar { flex: 1; height: 14px; background: var(--border-subtle); border-radius: 3px; overflow: hidden; }
.pf__workload-fill { height: 100%; border-radius: 3px; }
.pf__workload-count { font-size: 0.7rem; font-weight: 600; width: 24px; text-align: right; }

@media (max-width: 1024px) {
  .pf__main { flex-direction: column; }
  .pf__sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; max-height: none; overflow: visible; }
  .pf__client { flex: 1 1 200px; }
  .pf__panels { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  .pf__strip { flex-wrap: wrap; }
  .pf__strip-item { flex: 1 1 45%; }
  .pf__sidebar { flex-direction: column; }
  .pf__client { flex: 1 1 100%; }
  .pf__panels { grid-template-columns: 1fr; }
  .pf__bottom { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3b: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): portfolio dashboard v3 CSS layout classes"
```

---

### Task 4: Frontend JS — state variables and snapshot loader

**Files:**
- Modify: `nbi_project_dashboard.html` (JS section)

- [ ] **Step 4a: Add state variables**

Find the existing `_expandedPortfolioCards` declaration (around line 2309) and replace it with:

```javascript
let _portfolioSelectedClient = null;
let _portfolioSnapshots = null;
let _portfolioAttentionExpanded = false;
```

- [ ] **Step 4b: Add snapshot fetch function**

Add near the state variables:

```javascript
async function loadDashboardSnapshots() {
  try {
    const resp = await authFetch('/api/dashboard/snapshots?days=56');
    if (resp.ok) {
      const data = await resp.json();
      _portfolioSnapshots = data.snapshots || [];
    }
  } catch (e) {
    _portfolioSnapshots = [];
  }
}
```

- [ ] **Step 4c: Add client selection function**

```javascript
function selectPortfolioClient(clientName) {
  _portfolioSelectedClient = _portfolioSelectedClient === clientName ? null : clientName;
  renderContent();
}
```

- [ ] **Step 4d: Trigger snapshot load when dashboard view is selected**

In `renderDashboard()` (line ~4031), add a snapshot load call after the existing profile header code:

```javascript
  // Load snapshots for trend deltas + Work Completed chart
  if (!_portfolioSnapshots) {
    loadDashboardSnapshots().then(() => {
      if (currentView === 'dashboard') renderContent();
    });
  }
```

- [ ] **Step 4e: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): portfolio v3 state variables + snapshot loader"
```

---

### Task 5: Frontend JS — rewrite `renderPortfolioDashboard()`

**Files:**
- Modify: `nbi_project_dashboard.html` (function at line ~4285)

This is the core task. The function is rewritten to produce the new layout: KPI strip with deltas, client sidebar, 2x2 panel grid, bottom row.

- [ ] **Step 5a: Rewrite the function**

Replace the entire `renderPortfolioDashboard()` function body (from its opening `function` line through its closing `}`) with:

```javascript
function renderPortfolioDashboard() {
  const filtered = getFilteredTasks();
  const now = new Date(); now.setHours(0,0,0,0);
  const fortnight = new Date(now); fortnight.setDate(fortnight.getDate() + 14);

  const roots = filtered.filter(t => !t.parentId && t.title && t.title.trim() !== 'New Task');
  const activeRoots = roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const overdueTasks = filtered.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
  const blockedTasks = filtered.filter(t => t.healthState === 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled');
  const atRiskTasks = filtered.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');
  const totalHrs = filtered.reduce((s, t) => s + (t.hoursSpent || 0), 0);
  const totalEst = filtered.reduce((s, t) => s + (t.hoursEstimated || 0), 0);

  // Week-over-week deltas from snapshots
  const snap7 = _portfolioSnapshots ? _portfolioSnapshots.find(s => {
    const d = new Date(s.snapshot_date);
    const ago = new Date(now); ago.setDate(ago.getDate() - 7);
    return d.toISOString().slice(0,10) === ago.toISOString().slice(0,10);
  }) : null;

  let html = '<div class="pf">';

  // === KPI Strip ===
  html += renderPfStrip(activeRoots.length, overdueTasks.length, blockedTasks.length, atRiskTasks.length, totalHrs, totalEst, snap7);

  // === Main: sidebar + panels ===
  html += '<div class="pf__main">';

  // Client sidebar
  html += renderPfSidebar(filtered, roots, now);

  // Viz panels 2x2
  const panelTasks = _portfolioSelectedClient
    ? filtered.filter(t => getTaskClient(t) === _portfolioSelectedClient)
    : filtered;
  const panelRoots = _portfolioSelectedClient
    ? roots.filter(r => getTaskClient(r) === _portfolioSelectedClient)
    : roots;

  html += '<div class="pf__panels">';
  html += renderPfWorkCompleted();
  html += renderPfHealthScorecard(filtered, roots, now);
  html += renderPfTimeline(panelTasks, panelRoots, now);
  html += renderPfNeedsAttention(panelTasks, now);
  html += '</div>';

  html += '</div>'; // pf__main

  // === Bottom row ===
  html += '<div class="pf__bottom">';
  html += renderPfCompletingSoon(panelRoots, now);
  html += renderPfUpcomingMilestones(panelTasks, now, fortnight);
  html += renderPfTeamWorkload(panelTasks);
  html += '</div>';

  html += '</div>'; // pf
  return html;
}
```

- [ ] **Step 5b: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): rewrite renderPortfolioDashboard as v3 layout orchestrator"
```

---

### Task 6: Frontend JS — KPI strip with trend deltas

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 6a: Add `renderPfStrip()` function**

Add right after `renderPortfolioDashboard()`:

```javascript
function renderPfStrip(activeCount, overdueCount, blockedCount, atRiskCount, hrsSpent, hrsEst, snap7) {
  function delta(current, field) {
    if (!snap7) return '';
    const prev = parseFloat(snap7[field]) || 0;
    const diff = current - prev;
    if (diff === 0) return '';
    const isGood = (field === 'active_projects' || field === 'hours_spent' || field === 'hours_estimated') ? diff > 0 : diff < 0;
    const arrow = diff > 0 ? '\u25B2' : '\u25BC';
    const sign = diff > 0 ? '+' : '';
    const col = isGood ? 'var(--success)' : 'var(--danger)';
    return ` <span class="pf__strip-delta" style="color:${col}">${arrow} ${sign}${Math.round(diff * 10) / 10}</span>`;
  }

  return `<div class="pf__strip">
    <div class="pf__strip-item"><span class="pf__strip-val" style="color:var(--accent)">${activeCount}${delta(activeCount, 'active_projects')}</span><span class="pf__strip-label">Active Projects</span></div>
    <div class="pf__strip-item"><span class="pf__strip-val" style="color:${overdueCount > 0 ? 'var(--danger)' : 'var(--success)'}">${overdueCount}${delta(overdueCount, 'overdue_count')}</span><span class="pf__strip-label">Overdue</span></div>
    <div class="pf__strip-item"><span class="pf__strip-val" style="color:${blockedCount > 0 ? 'var(--purple)' : 'var(--success)'}">${blockedCount}${delta(blockedCount, 'blocked_count')}</span><span class="pf__strip-label">Blocked</span></div>
    <div class="pf__strip-item"><span class="pf__strip-val" style="color:${atRiskCount > 0 ? 'var(--danger)' : 'var(--success)'}">${atRiskCount}${delta(atRiskCount, 'at_risk_count')}</span><span class="pf__strip-label">At Risk</span></div>
    <div class="pf__strip-item"><span class="pf__strip-val" style="color:var(--text-primary)">${hrsSpent.toFixed(1)}${delta(hrsSpent, 'hours_spent')}</span><span class="pf__strip-label">Hours Spent</span></div>
    <div class="pf__strip-item"><span class="pf__strip-val" style="color:var(--text-muted)">${hrsEst.toFixed(1)}${delta(hrsEst, 'hours_estimated')}</span><span class="pf__strip-label">Hours Est.</span></div>
  </div>`;
}
```

- [ ] **Step 6b: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): KPI strip with week-over-week trend deltas"
```

---

### Task 7: Frontend JS — client sidebar

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 7a: Add `renderPfSidebar()` function**

```javascript
function renderPfSidebar(filtered, roots, now) {
  const clientMap = {};
  roots.forEach(r => {
    const client = getTaskClient(r);
    if (!client) return;
    if (!clientMap[client]) clientMap[client] = [];
    clientMap[client].push(r);
  });
  const sortedClients = Object.keys(clientMap).sort(clientSortOrder);

  // Compute portfolio-wide aggregates
  const allActive = roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const allOverdue = filtered.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
  const allAtRisk = filtered.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');
  const allDone = filtered.filter(t => t.status === 'Done').length;
  const allPct = filtered.length > 0 ? Math.round(allDone / filtered.length * 100) : 0;

  let html = '<div class="pf__sidebar">';

  // Portfolio (all) card
  const pfSelected = !_portfolioSelectedClient;
  html += `<div class="pf__client pf__client--green ${pfSelected ? 'pf__client--selected' : ''}" onclick="selectPortfolioClient(null)">`;
  html += `<div class="pf__client-name"><span class="pf__client-dot" style="background:var(--accent)"></span>Portfolio</div>`;
  html += `<div class="pf__client-stats"><span>${allActive.length} active</span>`;
  if (allOverdue.length > 0) html += `<span class="danger">${allOverdue.length} overdue</span>`;
  if (allAtRisk.length > 0) html += `<span class="danger">${allAtRisk.length} at risk</span>`;
  html += `</div>`;
  html += `<div class="pf__client-bar"><div class="pf__client-bar-fill" style="width:${allPct}%;background:var(--accent)"></div></div>`;
  html += `<div class="pf__client-pct">${allPct}%</div>`;
  html += `</div>`;

  // Per-client cards
  sortedClients.forEach(clientName => {
    const clientTasks = filtered.filter(t => getTaskClient(t) === clientName);
    const projects = clientMap[clientName];
    const active = projects.filter(p => p.status !== 'Done' && p.status !== 'Cancelled');
    const overdue = clientTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
    const blocked = clientTasks.filter(t => t.healthState === 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled');
    const atRisk = clientTasks.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');
    const done = clientTasks.filter(t => t.status === 'Done').length;
    const pct = clientTasks.length > 0 ? Math.round(done / clientTasks.length * 100) : 0;

    const hasIssues = atRisk.length > 0 || blocked.length > 0;
    const hasYellow = clientTasks.some(t => t.healthState === 'Yellow' && t.status !== 'Done' && t.status !== 'Cancelled');
    const health = hasIssues ? 'Red' : hasYellow ? 'Yellow' : 'Green';
    const healthCol = HEALTH_COLOURS[health] || 'var(--success)';
    const borderClass = hasIssues ? 'pf__client--red' : hasYellow ? 'pf__client--yellow' : 'pf__client--green';
    const isSelected = _portfolioSelectedClient === clientName;

    html += `<div class="pf__client ${borderClass} ${isSelected ? 'pf__client--selected' : ''}" onclick="selectPortfolioClient('${escAttrJs(clientName)}')">`;
    html += `<div class="pf__client-name"><span class="pf__client-dot" style="background:${healthCol}"></span>${esc(clientName)}</div>`;
    html += `<div class="pf__client-stats"><span>${active.length} active</span>`;
    if (overdue.length > 0) html += `<span class="danger">${overdue.length} overdue</span>`;
    if (blocked.length > 0) html += `<span class="danger">${blocked.length} blocked</span>`;
    if (atRisk.length > 0) html += `<span class="danger">${atRisk.length} at risk</span>`;
    html += `</div>`;
    html += `<div class="pf__client-bar"><div class="pf__client-bar-fill" style="width:${pct}%;background:${healthCol}"></div></div>`;
    html += `<div class="pf__client-pct">${pct}%</div>`;
    html += `</div>`;
  });

  html += '</div>';
  return html;
}
```

- [ ] **Step 7b: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): client sidebar with Portfolio card and per-client cards"
```

---

### Task 8: Frontend JS — Work Completed chart panel

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 8a: Add `renderPfWorkCompleted()` function**

```javascript
function renderPfWorkCompleted() {
  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">Work Completed</div><div class="pf__panel-sub">8 week rolling view</div></div>';
  html += '<div class="pf__panel-body">';

  if (!_portfolioSnapshots || _portfolioSnapshots.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:150px;color:var(--text-muted);font-size:0.82rem">Collecting data — chart will appear after a few days.</div>';
    html += '</div></div>';
    return html;
  }

  // Group snapshots by ISO week
  const weekMap = {};
  _portfolioSnapshots.forEach(s => {
    const d = new Date(s.snapshot_date + 'T00:00:00');
    const onejan = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `W${weekNum}`;
    if (!weekMap[key]) weekMap[key] = { planned: 0, added: 0, completed: 0, count: 0 };
    weekMap[key].planned += parseInt(s.tasks_planned) || 0;
    weekMap[key].added += parseInt(s.tasks_added) || 0;
    weekMap[key].completed += parseInt(s.tasks_completed) || 0;
    weekMap[key].count++;
  });

  const weeks = Object.entries(weekMap).slice(-8);
  const maxVal = Math.max(1, ...weeks.map(([, w]) => Math.max(w.planned + w.added, w.completed)));

  // Legend
  html += `<div style="display:flex;gap:14px;font-size:0.62rem;color:var(--text-muted);margin-bottom:8px;justify-content:flex-end">`;
  html += `<span style="display:flex;align-items:center;gap:4px"><span style="width:7px;height:7px;border-radius:1px;background:#3b82f6"></span>Planned</span>`;
  html += `<span style="display:flex;align-items:center;gap:4px"><span style="width:7px;height:7px;border-radius:1px;background:#fbbf24"></span>Added</span>`;
  html += `<span style="display:flex;align-items:center;gap:4px"><span style="width:7px;height:7px;border-radius:1px;background:#4ade80"></span>Completed</span>`;
  html += `</div>`;

  // Chart
  html += '<div class="pf__bar-chart">';
  weeks.forEach(([label, w], i) => {
    const isLast = i === weeks.length - 1;
    const stackH = Math.round((w.planned + w.added) / maxVal * 140);
    const plannedH = Math.round(w.planned / maxVal * 140);
    const addedH = stackH - plannedH;
    const compH = Math.round(w.completed / maxVal * 140);

    html += `<div class="pf__bar-week ${isLast ? 'pf__bar-week--current' : ''}">`;
    html += `<div class="pf__bar-stack">`;
    if (addedH > 0) html += `<div class="pf__bar-seg" style="height:${addedH}px;background:#fbbf24;opacity:0.65"></div>`;
    if (plannedH > 0) html += `<div class="pf__bar-seg" style="height:${plannedH}px;background:#3b82f6;opacity:0.5"></div>`;
    html += `</div>`;
    html += `<div style="flex:1;height:${compH}px;background:#4ade80;opacity:0.6;border-radius:2px 2px 0 0"></div>`;
    html += `</div>`;
  });
  html += '</div>';

  // X-axis labels
  html += '<div style="display:flex;gap:8px;margin-top:4px">';
  weeks.forEach(([label], i) => {
    const isLast = i === weeks.length - 1;
    html += `<div style="flex:1;text-align:center;font-size:0.55rem;color:${isLast ? 'var(--accent)' : 'var(--text-muted)'};font-weight:${isLast ? '600' : '400'}">${label}</div>`;
  });
  html += '</div>';

  // Summary for current week
  if (weeks.length > 0) {
    const [, cur] = weeks[weeks.length - 1];
    html += `<div style="display:flex;gap:16px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-subtle);font-size:0.7rem">`;
    html += `<span style="color:var(--text-muted)">This week:</span>`;
    html += `<span style="color:#3b82f6">${cur.planned} planned</span>`;
    html += `<span style="color:#fbbf24">+${cur.added} added</span>`;
    html += `<span style="color:#4ade80">${cur.completed} completed</span>`;
    html += `</div>`;
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 8b: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): Work Completed stacked bar chart panel"
```

---

### Task 9: Frontend JS — Client Health Scorecard panel

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 9a: Add `renderPfHealthScorecard()` function**

```javascript
function renderPfHealthScorecard(filtered, roots, now) {
  const clientMap = {};
  roots.forEach(r => {
    const client = getTaskClient(r);
    if (!client) return;
    if (!clientMap[client]) clientMap[client] = [];
    clientMap[client].push(r);
  });
  const sortedClients = Object.keys(clientMap).sort(clientSortOrder);

  function ragDot(colour) {
    return `<span class="pf__scorecard-dot" style="background:${colour}"></span>`;
  }

  function ragColour(val, thresholds) {
    if (val >= thresholds[1]) return 'var(--danger)';
    if (val >= thresholds[0]) return 'var(--warning)';
    return 'var(--success)';
  }

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">Client Health</div><div class="pf__panel-sub">RAG across schedule, blockers, burn rate</div></div>';
  html += '<div class="pf__panel-body">';
  html += '<table class="pf__scorecard"><thead><tr><th style="text-align:left">Client</th><th>Schedule</th><th>Blockers</th><th>Burn Rate</th><th>Overall</th></tr></thead><tbody>';

  sortedClients.forEach(clientName => {
    const clientTasks = filtered.filter(t => getTaskClient(t) === clientName);
    const overdueCount = clientTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now).length;
    const blockedCount = clientTasks.filter(t => t.healthState === 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled').length;
    const hrsSpent = clientTasks.reduce((s, t) => s + (t.hoursSpent || 0), 0);
    const hrsEst = clientTasks.reduce((s, t) => s + (t.hoursEstimated || 0), 0);
    const burnPct = hrsEst > 0 ? (hrsSpent / hrsEst * 100) : 0;

    const schedCol = ragColour(overdueCount, [1, 3]);
    const blockCol = ragColour(blockedCount, [1, 2]);
    const burnCol = ragColour(burnPct, [80, 100]);
    const overallCol = [schedCol, blockCol, burnCol].includes('var(--danger)') ? 'var(--danger)' :
                       [schedCol, blockCol, burnCol].includes('var(--warning)') ? 'var(--warning)' : 'var(--success)';

    html += `<tr onclick="selectPortfolioClient('${escAttrJs(clientName)}')">`;
    html += `<td style="color:var(--text-primary)">${esc(clientName)}</td>`;
    html += `<td style="text-align:center">${ragDot(schedCol)}</td>`;
    html += `<td style="text-align:center">${ragDot(blockCol)}</td>`;
    html += `<td style="text-align:center">${ragDot(burnCol)}</td>`;
    html += `<td style="text-align:center">${ragDot(overallCol)}</td>`;
    html += `</tr>`;
  });

  html += '</tbody></table>';
  html += '</div></div>';
  return html;
}
```

- [ ] **Step 9b: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): Client Health RAG scorecard panel"
```

---

### Task 10: Frontend JS — Project Timeline (mini Gantt) panel

**Files:**
- Modify: `nbi_project_dashboard.html`

This panel renders a compact Gantt directly inside the dashboard panel. It reuses the existing Gantt helper functions (`ganttTaskStart`, `ganttTaskEnd`, `ganttBarClass`, `ganttDayCols`) and the existing Gantt CSS classes (`.gantt__*`).

- [ ] **Step 10a: Add state variables for mini Gantt**

Add near the other portfolio state variables:

```javascript
let _pfGanttDayWidth = 12;
let _pfGanttOffsetDays = 0;
```

- [ ] **Step 10b: Add mini Gantt nav functions**

```javascript
function pfGanttZoom(delta) { _pfGanttDayWidth = Math.max(6, Math.min(40, _pfGanttDayWidth + delta)); renderContent(); }
function pfGanttNav(days) { _pfGanttOffsetDays += days; renderContent(); }
function pfGanttToday() { _pfGanttOffsetDays = 0; renderContent(); }
```

- [ ] **Step 10c: Add `renderPfTimeline()` function**

```javascript
function renderPfTimeline(panelTasks, panelRoots, now) {
  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr" style="display:flex;justify-content:space-between;align-items:center">';
  html += '<div><div class="pf__panel-title">Project Timeline</div><div class="pf__panel-sub">Gantt view</div></div>';
  html += `<div style="display:flex;gap:4px">`;
  html += `<button class="btn btn--outline btn--sm" onclick="pfGanttZoom(-2)" style="font-size:0.6rem;padding:2px 6px">&minus;</button>`;
  html += `<button class="btn btn--outline btn--sm" onclick="pfGanttZoom(2)" style="font-size:0.6rem;padding:2px 6px">+</button>`;
  html += `<button class="btn btn--outline btn--sm" onclick="pfGanttNav(-30)" style="font-size:0.6rem;padding:2px 6px">&larr;</button>`;
  html += `<button class="btn btn--outline btn--sm" onclick="pfGanttToday()" style="font-size:0.6rem;padding:2px 6px;color:var(--accent)">Today</button>`;
  html += `<button class="btn btn--outline btn--sm" onclick="pfGanttNav(30)" style="font-size:0.6rem;padding:2px 6px">&rarr;</button>`;
  html += `</div></div>`;

  html += '<div class="pf__panel-body" style="overflow-x:auto;padding:0 0 12px">';

  const activeTasks = panelTasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
  if (activeTasks.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-muted);font-size:0.82rem">No active tasks with dates.</div>';
    html += '</div></div>';
    return html;
  }

  const dayW = _pfGanttDayWidth;
  let minDate = new Date(now); minDate.setDate(minDate.getDate() - 14 + _pfGanttOffsetDays);
  let maxDate = new Date(now); maxDate.setDate(maxDate.getDate() + 90 + _pfGanttOffsetDays);
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 7);
  const totalDays = Math.min(Math.round((maxDate - minDate) / 86400000), 200);
  const timelineW = totalDays * dayW;

  // Group by client
  const activeRoots = panelRoots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const clientGroups = {};
  activeRoots.forEach(r => {
    const client = getTaskClient(r) || 'Uncategorised';
    if (!clientGroups[client]) clientGroups[client] = [];
    clientGroups[client].push(r);
  });
  const sortedClients = Object.keys(clientGroups).sort(clientSortOrder);

  html += `<div style="min-width:${timelineW + 140}px">`;

  // Month headers
  html += `<div style="display:flex;border-bottom:1px solid var(--border-default)">`;
  html += `<div style="width:140px;padding:4px 10px;font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;border-right:1px solid var(--border-default);background:var(--bg-base);flex-shrink:0">Item</div>`;
  let d = new Date(minDate);
  while (d < maxDate) {
    const monthStart = new Date(d);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const end = monthEnd < maxDate ? monthEnd : maxDate;
    const daysInMonth = Math.ceil((end - monthStart) / 86400000);
    html += `<div style="width:${daysInMonth * dayW}px;font-size:0.6rem;color:var(--text-muted);text-align:center;padding:4px 0;border-right:1px solid var(--border-subtle);font-weight:600">${monthStart.toLocaleDateString('en-GB', {month:'short', year:'numeric'})}</div>`;
    d = monthEnd;
  }
  html += `</div>`;

  // Rows
  sortedClients.forEach(client => {
    const projects = clientGroups[client];
    const totalItems = projects.reduce((s, r) => s + 1 + getDescendants(r.id).filter(c => c.status !== 'Done' && c.status !== 'Cancelled').length, 0);

    // Client group header
    html += `<div style="display:flex;min-height:24px;align-items:center;background:var(--bg-surface);border-bottom:1px solid var(--border-subtle)">`;
    html += `<div style="width:140px;padding:0 10px;font-size:0.72rem;color:var(--text-secondary);font-weight:600;border-right:1px solid var(--border-default);flex-shrink:0">${esc(client)} <span style="font-size:0.6rem;color:var(--text-muted);font-weight:400">(${totalItems})</span></div>`;
    html += `<div style="flex:1;position:relative;height:24px">`;
    const todayOff = Math.round((now - minDate) / 86400000);
    if (todayOff >= 0 && todayOff < totalDays) html += `<div style="position:absolute;left:${todayOff * dayW}px;top:0;bottom:0;width:1px;background:rgba(59,130,246,0.35)"></div>`;
    html += `</div></div>`;

    // Project rows (just root-level projects, not full hierarchy — compact view)
    projects.forEach(project => {
      const start = ganttTaskStart(project);
      const end = ganttTaskEnd(project);
      const barClass = ganttBarClass(project);
      const typeMeta = getItemTypeMeta(project);

      html += `<div style="display:flex;min-height:28px;align-items:center;border-bottom:1px solid var(--border-subtle);cursor:pointer" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''" onclick="openDetailOverlay('${project.id}')">`;
      html += `<div style="width:140px;padding:0 10px 0 16px;font-size:0.7rem;color:var(--text-primary);border-right:1px solid var(--border-default);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:4px">`;
      html += `<span class="item-type-badge" style="background:${typeMeta.colour};font-size:0.5rem;padding:0 4px">${typeMeta.label.charAt(0)}</span>`;
      html += `${esc(project.title)}</div>`;
      html += `<div style="flex:1;position:relative;height:28px;min-width:${timelineW}px">`;
      if (todayOff >= 0 && todayOff < totalDays) html += `<div style="position:absolute;left:${todayOff * dayW}px;top:0;bottom:0;width:1px;background:rgba(59,130,246,0.35)"></div>`;
      if (start && end && end >= start) {
        const rawOff = Math.round((start - minDate) / 86400000);
        const sOff = Math.max(0, rawOff);
        const dur = Math.max(1, Math.ceil((end - start) / 86400000) + 1) - (sOff - rawOff);
        if (dur > 0) {
          html += `<div class="gantt__bar ${barClass}" style="left:${sOff * dayW}px;width:${dur * dayW}px;height:18px;top:5px" title="${esc(project.title)} | ${project.status}">`;
          if (dur * dayW > 40) html += `<span style="overflow:hidden;text-overflow:ellipsis;pointer-events:none;flex:1;font-size:0.6rem">${esc(project.title)}</span>`;
          html += `</div>`;
        }
      }
      html += `</div></div>`;
    });
  });

  html += '</div>';
  html += '</div></div>';
  return html;
}
```

- [ ] **Step 10d: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): Project Timeline mini-Gantt panel"
```

---

### Task 11: Frontend JS — Needs Attention panel

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 11a: Add `renderPfNeedsAttention()` function**

```javascript
function renderPfNeedsAttention(panelTasks, now) {
  const blocked = panelTasks.filter(t => t.healthState === 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled');
  const overdue = panelTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now && t.healthState !== 'Blocked');
  const atRisk = panelTasks.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled' && !(t.dueDate && safeParseDate(t.dueDate) < now));

  overdue.sort((a, b) => safeParseDate(a.dueDate) - safeParseDate(b.dueDate));
  const items = [...blocked, ...overdue, ...atRisk];
  const seen = new Set();
  const unique = items.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });

  const showCount = _portfolioAttentionExpanded ? unique.length : 5;
  const visible = unique.slice(0, showCount);
  const remaining = unique.length - visible.length;

  let html = '<div class="pf__panel">';
  html += `<div class="pf__panel-hdr" style="display:flex;justify-content:space-between;align-items:center"><div><div class="pf__panel-title">Needs Attention</div><div class="pf__panel-sub">Overdue, at risk, and blocked</div></div><span style="font-size:0.72rem;color:var(--danger);font-weight:600">${unique.length} items</span></div>`;
  html += '<div class="pf__panel-body">';

  if (unique.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:80px;color:var(--success);font-size:0.82rem">All clear — nothing needs attention.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:3px">';
    visible.forEach(t => {
      const parent = t.parentId ? tasks.find(p => p.id === t.parentId) : null;
      const projectName = parent ? parent.title : '';
      const clientName = getTaskClient(t) || '';
      const owner = (t.assignees || []).join(', ') || '';
      let badge = '';
      let badgeClass = '';
      let borderCol = 'var(--danger)';

      if (t.healthState === 'Blocked') {
        badge = 'BLOCKED';
        badgeClass = 'pf__attn-badge--blocked';
        borderCol = 'var(--purple)';
      } else if (t.dueDate && safeParseDate(t.dueDate) < now) {
        const daysLate = Math.ceil((now - safeParseDate(t.dueDate)) / 86400000);
        badge = daysLate + 'd overdue';
        badgeClass = 'pf__attn-badge--overdue';
      } else {
        badge = 'AT RISK';
        badgeClass = 'pf__attn-badge--risk';
      }

      html += `<div class="pf__attn-item" style="border-left:3px solid ${borderCol}" onclick="openDetailOverlay('${t.id}')">`;
      html += `<span class="pf__attn-badge ${badgeClass}">${badge}</span>`;
      html += `<div style="flex:1;min-width:0"><div class="pf__attn-title">${esc(t.title)}</div>`;
      const ctx = [clientName, projectName].filter(Boolean).join(' \u2014 ');
      if (ctx) html += `<div class="pf__attn-context">${esc(ctx)}</div>`;
      html += `</div>`;
      if (owner) html += `<span style="font-size:0.68rem;color:var(--text-muted);flex-shrink:0">${esc(owner)}</span>`;
      html += `</div>`;
    });
    html += '</div>';

    if (remaining > 0) {
      html += `<div style="text-align:center;padding:8px;font-size:0.7rem;color:var(--text-muted);cursor:pointer;border-top:1px solid var(--border-subtle);margin-top:4px" onclick="_portfolioAttentionExpanded=true;renderContent()">+ ${remaining} more items</div>`;
    }
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 11b: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): Needs Attention panel with severity badges"
```

---

### Task 12: Frontend JS — bottom row panels

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 12a: Add `renderPfCompletingSoon()` function**

```javascript
function renderPfCompletingSoon(panelRoots, now) {
  const activeRoots = panelRoots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const nearComplete = activeRoots.map(r => {
    const kids = getDescendants(r.id);
    const all = [r, ...kids];
    const d = all.filter(t => t.status === 'Done').length;
    const pct = all.length > 0 ? Math.round(d / all.length * 100) : 0;
    return { ...r, _pct: pct, _client: getTaskClient(r) || '' };
  }).filter(r => r._pct >= 60 && r._pct < 100).sort((a, b) => b._pct - a._pct).slice(0, 6);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title" style="color:var(--success)">Completing Soon</div><div class="pf__panel-sub">Projects 60-99% done</div></div>';
  html += '<div class="pf__panel-body">';

  if (nearComplete.length === 0) {
    html += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">No projects near completion.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:6px">';
    nearComplete.forEach(r => {
      const healthCol = HEALTH_COLOURS[r.healthState] || 'var(--success)';
      html += `<div class="pf__attn-item" onclick="openDetailOverlay('${r.id}')">`;
      html += `<span style="width:6px;height:6px;border-radius:50%;background:${healthCol};flex-shrink:0"></span>`;
      html += `<div style="flex:1;min-width:0"><div class="pf__attn-title">${esc(r.title)}</div><div class="pf__attn-context">${esc(r._client)}</div></div>`;
      html += `<div style="width:60px;flex-shrink:0"><div style="height:4px;background:var(--border-subtle);border-radius:2px;overflow:hidden"><div style="width:${r._pct}%;height:100%;background:var(--success);border-radius:2px"></div></div></div>`;
      html += `<span style="font-size:0.72rem;color:var(--success);font-weight:600;flex-shrink:0;width:32px;text-align:right">${r._pct}%</span>`;
      html += `</div>`;
    });
    html += '</div>';
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 12b: Add `renderPfUpcomingMilestones()` function**

```javascript
function renderPfUpcomingMilestones(panelTasks, now, fortnight) {
  const upcoming = panelTasks.filter(t => {
    if (!t.dueDate || t.status === 'Done' || t.status === 'Cancelled' || t.parentId) return false;
    const d = safeParseDate(t.dueDate);
    return d >= now && d <= fortnight;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 6);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title" style="color:var(--accent)">Upcoming Milestones</div><div class="pf__panel-sub">Due within 14 days</div></div>';
  html += '<div class="pf__panel-body">';

  if (upcoming.length === 0) {
    html += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">No milestones in the next 14 days.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:6px">';
    upcoming.forEach(t => {
      const d = safeParseDate(t.dueDate);
      const daysUntil = Math.ceil((d - now) / 86400000);
      const dayLabel = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const badgeClass = daysUntil <= 2 ? 'pf__attn-badge--overdue' : daysUntil <= 5 ? 'pf__attn-badge--risk' : '';
      const badgeStyle = !badgeClass ? 'background:rgba(85,85,85,0.2);color:var(--text-muted);border-color:rgba(85,85,85,0.3)' : '';

      html += `<div class="pf__attn-item" onclick="openDetailOverlay('${t.id}')">`;
      html += `<span class="pf__attn-badge ${badgeClass}" ${badgeStyle ? `style="${badgeStyle}"` : ''}>${dayLabel}</span>`;
      html += `<div style="flex:1;min-width:0"><div class="pf__attn-title">${esc(t.title)}</div><div class="pf__attn-context">${esc(getTaskClient(t) || '')}</div></div>`;
      html += `</div>`;
    });
    html += '</div>';
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 12c: Add `renderPfTeamWorkload()` function**

```javascript
function renderPfTeamWorkload(panelTasks) {
  const activeTasks = panelTasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
  const personMap = {};
  activeTasks.forEach(t => {
    (t.assignees || []).forEach(a => {
      if (!personMap[a]) personMap[a] = 0;
      personMap[a]++;
    });
  });
  const sorted = Object.entries(personMap).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">Team Workload</div><div class="pf__panel-sub">Active tasks per person</div></div>';
  html += '<div class="pf__panel-body">';

  if (sorted.length === 0) {
    html += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">No assigned tasks.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:4px">';
    sorted.forEach(([name, count]) => {
      const barW = Math.round(count / maxCount * 100);
      const col = count > 30 ? 'var(--danger)' : count > 15 ? 'var(--warning)' : 'var(--success)';
      html += `<div class="pf__workload-row" onclick="currentFilter.assignee=['${escAttrJs(name)}'];renderSidebarCounts();renderContent()">`;
      html += `<span class="pf__workload-name">${esc(name)}</span>`;
      html += `<div class="pf__workload-bar"><div class="pf__workload-fill" style="width:${barW}%;background:${col}"></div></div>`;
      html += `<span class="pf__workload-count" style="color:${col}">${count}</span>`;
      html += `</div>`;
    });
    html += '</div>';
    html += `<div style="padding:6px 0 0;font-size:0.62rem;color:var(--text-muted)"><span style="color:var(--danger)">\u25CF</span> >30 &nbsp; <span style="color:var(--warning)">\u25CF</span> 15-30 &nbsp; <span style="color:var(--success)">\u25CF</span> <15</div>`;
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 12d: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(ui): bottom row panels — Completing Soon, Upcoming Milestones, Team Workload"
```

---

### Task 13: Cleanup — remove old v2 code

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 13a: Remove old functions that are no longer called**

Remove the following functions (they were part of the v2 card-grid layout):
- `togglePortfolioCard(clientName)` — the expand/collapse toggle, no longer needed
- `bestGridColumns(count, maxCols)` — the balanced grid column calculator, no longer needed

Remove the `_expandedPortfolioCards` Set declaration.

Leave `clientSortOrder()` and `getTaskClient()` — they're still used by the new code.

- [ ] **Step 13b: Clean up old CSS**

The old `.portfolio-card__body`, `.portfolio-card.expanded`, `.portfolio-card__arrow`, `.portfolio-project__flags`, and related expand/collapse CSS rules are superseded by the `.pf__*` classes. Remove any CSS rules from the old `PORTFOLIO DASHBOARD` section that are no longer referenced.

- [ ] **Step 13c: Run full test suite**

```bash
cd dashboard-server && npm test
```

Expected: all vitest tests pass (including the new `dashboard-snapshots.test.mjs`).

- [ ] **Step 13d: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "chore: remove v2 portfolio card-grid code (superseded by v3)"
```

---

### Task 14: Smoke test and PM2 restart

**Files:** None (verification only)

- [ ] **Step 14a: Restart PM2**

```bash
pm2 stop nbi-dashboard && sleep 2 && pm2 start nbi-dashboard
```

- [ ] **Step 14b: Verify server boots**

```bash
pm2 logs nbi-dashboard --lines 10 --nostream
```

Expected: `Server running on port 8888`, `All migrations already applied` (or `Applied migration 028`), `Dashboard snapshot scheduled`, `Bootstrapped dashboard snapshot`.

- [ ] **Step 14c: Verify dashboard loads in browser**

Open `http://localhost:8888/nbi_project_dashboard.html#dashboard` and verify:
1. KPI strip renders with 6 metrics
2. Client sidebar shows on the left with Portfolio card + per-client cards
3. Clicking a client card highlights it and filters the panels
4. Work Completed panel shows "Collecting data" message (or chart if snapshots exist)
5. Client Health scorecard shows RAG dots
6. Project Timeline shows Gantt bars
7. Needs Attention shows overdue/blocked/at-risk items
8. Bottom row shows Completing Soon, Upcoming Milestones, Team Workload
9. Clicking any task item opens the detail overlay
10. Mobile view (DevTools 414px) stacks everything single-column

- [ ] **Step 14d: Run full test suite one final time**

```bash
cd dashboard-server && npm run test:all
```

Expected: all vitest + playwright tests green.
