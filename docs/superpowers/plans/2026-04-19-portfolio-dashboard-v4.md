# Portfolio Dashboard v4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four main dashboard panels, KPI strip, and bottom row with Glen's approved design: Progress Status donut, Upcoming Milestones list, fixed Project Timeline, Work Types bar chart, and a 4-panel bottom row including Needs Attention.

**Architecture:** Server-first (migration + snapshot updates + allowlist), then frontend panel rewrites. Each panel is a standalone render function that accepts `panelTasks`/`panelRoots` and returns HTML. The orchestrator (`renderPortfolioDashboard`) wires them together. No external dependencies — all charts are SVG/HTML/CSS.

**Tech Stack:** PostgreSQL (migration), Node/Express (server.js), vanilla JS/HTML/CSS (nbi_project_dashboard.html), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-04-19-portfolio-dashboard-v4-design.md`

**Standing directive:** Comment out replaced code, do NOT delete it.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/migrations/029_work_type.sql` | Create | Add `work_type` to tasks, snapshot columns, seed work type categories |
| `dashboard-server/server.js` | Modify | allowedFields, sync/load mapping, snapshot function, snapshot SELECT |
| `dashboard-server/tests/unit/dashboard-snapshots.test.mjs` | Modify | Test new snapshot columns |
| `nbi_project_dashboard.html` | Modify | KPI strip, 4 main panels, bottom row, detail overlay, CSS, state vars |

---

### Task 1: Migration — work_type field + snapshot columns + seed data

**Files:**
- Create: `dashboard-server/migrations/029_work_type.sql`

- [ ] **Step 1: Write migration file**

```sql
-- 029_work_type.sql
-- Add work_type field to tasks for project categorisation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_type TEXT;

-- Add new KPI columns to dashboard_snapshots
ALTER TABLE dashboard_snapshots ADD COLUMN IF NOT EXISTS on_track_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dashboard_snapshots ADD COLUMN IF NOT EXISTS active_leads_count INTEGER NOT NULL DEFAULT 0;

-- Seed default work type categories into lead_field_options
INSERT INTO lead_field_options (field_name, value, sort_order, is_active) VALUES
  ('work_type_categories', 'Research', 1, true),
  ('work_type_categories', 'Strategy', 2, true),
  ('work_type_categories', 'Implementation', 3, true),
  ('work_type_categories', 'Assessment', 4, true),
  ('work_type_categories', 'Ongoing Mgmt', 5, true)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Run migration and verify**

Run: `cd dashboard-server && node migrations/runner.js`
Expected: Migration 029 applied successfully. No errors.

- [ ] **Step 3: Verify columns exist**

Run: `cd dashboard-server && node -e "const {pool}=require('./db');pool.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name='work_type'\").then(r=>{console.log(r.rows);process.exit()})"`
Expected: `[ { column_name: 'work_type' } ]`

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/migrations/029_work_type.sql
git commit -m "feat(db): migration 029 — work_type on tasks, snapshot KPI columns, seed work type categories"
```

---

### Task 2: Server — work_type in task PATCH, sync/load, and full-sync

**Files:**
- Modify: `dashboard-server/server.js:4020` (allowedFields)
- Modify: `dashboard-server/server.js:4949` (sync/load mapping)
- Modify: `dashboard-server/server.js:4552-4587` (full-sync UPDATE + INSERT)

- [ ] **Step 1: Add work_type to PATCH allowedFields**

At line 4020, add `'work_type'` to the end of the array:

```javascript
const allowedFields = ['title', 'parent_id', 'client_id', 'item_type', 'priority', 'health_state', 'description', 'assignees', 'hours_estimated', 'hours_spent', 'due_date', 'start_date', 'end_date', 'dependencies', 'collaborations', 'success_factor', 'repeat_rule', 'blocker_info', 'practice_area', 'sow_id', 'work_type'];
```

- [ ] **Step 2: Add workType to sync/load frontend mapping**

At line 4949, after the `sowId` line, add:

```javascript
workType: r.work_type || null,
```

- [ ] **Step 3: Add work_type to full-sync UPDATE query**

At line 4552, the UPDATE SET clause currently ends with `practice_area=$20, sow_id=$21`. Change to:

```sql
practice_area=$20, sow_id=$21, work_type=$22,
updated_at=NOW()
WHERE id=$23
```

At line 4566, after the `t.practiceArea || t.practice_area || null,` line, add:

```javascript
t.workType || t.work_type || null,
```

Update the `t.id` parameter index from `$22` to `$23`.

- [ ] **Step 4: Add work_type to full-sync INSERT query**

At line 4573, add `work_type` to the column list after `sow_id`:

```sql
collaborations, success_factor, repeat_rule, blocker_info, practice_area, sow_id, work_type, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW()) RETURNING id
```

At line 4585, after the `t.practiceArea || t.practice_area || null,` line, add:

```javascript
t.workType || t.work_type || null,
```

Update all subsequent parameter indices accordingly.

- [ ] **Step 5: Add abbreviation to client briefs mapping**

At line 4955 in the `frontendBriefs` mapping, after `nbiRelationship`, add:

```javascript
abbreviation: r.abbreviation || null,
```

- [ ] **Step 6: Run existing tests to verify nothing breaks**

Run: `cd dashboard-server && npx vitest run`
Expected: All existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/server.js
git commit -m "feat(server): wire work_type through task PATCH, sync/load, and full-sync"
```

---

### Task 3: Server — update computeDashboardSnapshot and snapshots endpoint

**Files:**
- Modify: `dashboard-server/server.js:5120-5152` (computeDashboardSnapshot)
- Modify: `dashboard-server/server.js:5165` (GET /api/dashboard/snapshots SELECT)
- Modify: `dashboard-server/tests/unit/dashboard-snapshots.test.mjs`

- [ ] **Step 1: Write failing test for new snapshot columns**

Add to `dashboard-server/tests/unit/dashboard-snapshots.test.mjs`:

```javascript
it('computeDashboardSnapshot includes on_track_count and active_leads_count', async () => {
  const { token } = await setup();
  // Import the snapshot function
  const { computeDashboardSnapshot } = require('../../server.js');
  const snapshot = await computeDashboardSnapshot();
  expect(snapshot).toHaveProperty('on_track_count');
  expect(snapshot).toHaveProperty('active_leads_count');
  expect(typeof snapshot.on_track_count).toBe('number');
  expect(typeof snapshot.active_leads_count).toBe('number');
  // With our setup: 1 active root (no parent_id), 1 overdue, 0 at_risk
  // on_track = active - overdue - atRisk (deduplicated)
  expect(snapshot.on_track_count).toBeGreaterThanOrEqual(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/dashboard-snapshots.test.mjs`
Expected: FAIL — `on_track_count` property not found.

- [ ] **Step 3: Update computeDashboardSnapshot**

At line 5120 in `computeDashboardSnapshot()`, after line 5133 (the `atRisk` filter), add:

```javascript
const uniqueProblems = new Set([...overdue.map(r => r), ...atRisk.map(r => r)]);
const onTrackCount = Math.max(0, activeRoots.length - uniqueProblems.size);
```

Then add a leads count query after the existing task queries (around line 5138):

```javascript
let activeLeadsCount = 0;
try {
  const { rows: [lc] } = await pool.query(
    `SELECT count(*) as cnt FROM leads l
     JOIN lead_pipeline_stages s ON l.stage_id = s.id
     WHERE s.is_closed = false`
  );
  activeLeadsCount = parseInt(lc.cnt) || 0;
} catch (e) { /* leads table may not exist in test env */ }
```

Update the return object at line 5141 — add after `tasks_completed`:

```javascript
on_track_count: onTrackCount,
active_leads_count: activeLeadsCount,
```

Also export `computeDashboardSnapshot` if not already exported. At the bottom of server.js, find the `module.exports` and ensure it includes `computeDashboardSnapshot`.

- [ ] **Step 4: Update GET /api/dashboard/snapshots SELECT**

At line 5165, change the SELECT to include the new columns:

```sql
SELECT snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count,
       hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed,
       on_track_count, active_leads_count
FROM dashboard_snapshots
WHERE snapshot_date >= CURRENT_DATE - $1::integer
ORDER BY snapshot_date ASC
```

- [ ] **Step 5: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/dashboard-snapshots.test.mjs`
Expected: All tests pass including the new one.

- [ ] **Step 6: Run full test suite**

Run: `cd dashboard-server && npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/dashboard-snapshots.test.mjs
git commit -m "feat(server): add on_track_count and active_leads_count to dashboard snapshots"
```

---

### Task 4: Frontend — new CSS for v4 panels

**Files:**
- Modify: `nbi_project_dashboard.html:372-428` (CSS section, after existing `.pf__` styles)

- [ ] **Step 1: Add new CSS classes after existing `.pf__scorecard` styles (around line 428)**

```css
/* === v4 KPI strip layout — delta beside number === */
.pf__strip-top { display: flex; align-items: baseline; justify-content: center; gap: 6px; }
.pf__strip-delta-beside { font-size: 0.72rem; font-weight: 600; line-height: 1.2; }
.pf__strip-delta-beside .pf__strip-delta-week { display: block; font-size: 0.5rem; font-weight: 400; color: var(--text-muted); letter-spacing: 0.5px; }

/* === v4 Progress Status donut === */
.pf__donut-container { display: flex; align-items: center; justify-content: center; position: relative; height: 100%; min-height: 260px; }
.pf__donut-leader { stroke: var(--border-default); stroke-width: 0.8; fill: none; }

/* === v4 Upcoming Milestones === */
.pf__milestone-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); cursor: pointer; }
.pf__milestone-item:last-child { border-bottom: none; }
.pf__milestone-item:hover { background: var(--bg-hover); margin: 0 -16px; padding: 8px 16px; }
.pf__milestone-bar { width: 3px; min-height: 36px; border-radius: 2px; flex-shrink: 0; }
.pf__milestone-title { font-size: 0.78rem; font-weight: 500; color: var(--text-primary); }
.pf__milestone-sub { font-size: 0.6rem; color: var(--text-muted); margin-top: 1px; }
.pf__milestone-status { font-size: 0.65rem; font-weight: 600; text-align: right; flex-shrink: 0; }
.pf__milestone-date { font-size: 0.55rem; color: var(--text-muted); text-align: right; }
.pf__milestone-abbr { font-size: 0.65rem; font-weight: 700; }

/* === v4 Work Types bar chart === */
.pf__wt-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.pf__wt-label { width: 120px; flex-shrink: 0; font-size: 0.78rem; font-weight: 600; text-align: right; color: var(--text-primary); }
.pf__wt-bar-track { flex: 1; height: 20px; }
.pf__wt-bar { height: 100%; background: #00e5ff; border-radius: 3px; opacity: 0.7; }
.pf__wt-axis { display: flex; margin-top: 4px; padding-left: 128px; }
.pf__wt-axis span { flex: 1; font-size: 0.55rem; color: var(--text-muted); }

/* === v4 Bottom row — 4 columns instead of 3 === */
.pf__bottom--v4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md); }

/* === v4 Needs Attention (bottom row version) === */
.pf__na-item { display: flex; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid var(--border-subtle); cursor: pointer; }
.pf__na-item:last-child { border-bottom: none; }
.pf__na-item:hover { background: var(--bg-hover); }
.pf__na-border { width: 3px; min-height: 28px; border-radius: 1px; flex-shrink: 0; }
.pf__na-badge { font-size: 0.52rem; padding: 1px 5px; border-radius: 2px; font-weight: 600; flex-shrink: 0; white-space: nowrap; }
.pf__na-badge--blocked { background: var(--purple); color: white; }
.pf__na-badge--overdue { background: var(--danger); color: white; }
.pf__na-badge--risk { background: #f97316; color: white; }
```

- [ ] **Step 2: Update mobile breakpoint for bottom row**

At line 449 (inside the `@media (max-width: 768px)` block), after the existing `.pf__bottom` rule, add:

```css
.pf__bottom--v4 { grid-template-columns: 1fr; }
```

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(css): add v4 portfolio dashboard panel styles"
```

---

### Task 5: Frontend — new state variables + leads count loader

**Files:**
- Modify: `nbi_project_dashboard.html:2393-2408` (state variables and data loaders)

- [ ] **Step 1: Add new state variable for active leads count**

After line 2394 (`let _portfolioAttentionExpanded = false;`), add:

```javascript
let _portfolioLeadCount = null;
let _portfolioBottomAttentionExpanded = false;
```

- [ ] **Step 2: Add leads count loader function**

After the `loadDashboardSnapshots()` function (after line 2408), add:

```javascript
async function loadPortfolioLeadCount() {
  try {
    const resp = await authFetch('/api/leads/pipeline/summary');
    if (resp.ok) {
      const data = await resp.json();
      _portfolioLeadCount = (data.stages || [])
        .filter(s => !s.is_closed)
        .reduce((sum, s) => sum + parseInt(s.count || 0), 0);
    }
  } catch (e) {
    _portfolioLeadCount = 0;
  }
}
```

- [ ] **Step 3: Trigger leads count load alongside snapshots**

At line 4120 (inside `renderDashboard`), the existing code loads snapshots. After line 4123, add leads loading:

```javascript
if (_portfolioLeadCount === null) {
  loadPortfolioLeadCount().then(() => {
    if (currentView === 'dashboard') renderContent();
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(dashboard): add leads count loader and v4 state variables"
```

---

### Task 6: Frontend — rewrite KPI strip

**Files:**
- Modify: `nbi_project_dashboard.html:4343-4363` (data computation in renderPortfolioDashboard)
- Modify: `nbi_project_dashboard.html:4393-4413` (renderPfStrip function)

- [ ] **Step 1: Update renderPortfolioDashboard to compute new KPI values**

At line 4343, the function currently computes `overdueTasks`, `blockedTasks`, `atRiskTasks`, `totalHrs`, `totalEst`. After the existing `atRiskTasks` computation (line 4352), add:

```javascript
const needsAttentionCount = overdueTasks.length;
const uniqueProblemIds = new Set([...overdueTasks.map(t => t.id), ...atRiskTasks.map(t => t.id)]);
const onTrackCount = Math.max(0, activeRoots.length - uniqueProblemIds.size);
const workTypesActive = new Set(activeRoots.filter(r => r.workType).map(r => r.workType)).size;
```

- [ ] **Step 2: Update the renderPfStrip call**

At line 4363, change:

```javascript
html += renderPfStrip(activeRoots.length, overdueTasks.length, blockedTasks.length, atRiskTasks.length, totalHrs, totalEst, snap7);
```

To:

```javascript
html += renderPfStrip(activeRoots.length, onTrackCount, needsAttentionCount, atRiskTasks.length, _portfolioLeadCount || 0, workTypesActive, snap7);
```

- [ ] **Step 3: Rewrite renderPfStrip function**

Comment out the existing `renderPfStrip` function (line 4393-4413). Write a new one directly below the commented block:

```javascript
function renderPfStrip(activeCount, onTrackCount, needsAttentionCount, atRiskCount, leadsCount, workTypesCount, snap7) {
  function delta(current, field) {
    if (!snap7) return '';
    const prev = parseFloat(snap7[field]) || 0;
    const diff = current - prev;
    if (diff === 0) return '';
    const isGood = (field === 'active_projects' || field === 'on_track_count' || field === 'active_leads_count')
      ? diff > 0 : diff < 0;
    const arrow = diff > 0 ? '\u25B2' : '\u25BC';
    const sign = diff > 0 ? '+' : '';
    const col = isGood ? 'var(--success)' : 'var(--danger)';
    return `<span class="pf__strip-delta-beside" style="color:${col}"><span class="pf__strip-delta-arrow">${arrow}</span> ${sign}${Math.round(diff)}<span class="pf__strip-delta-week">LST WK</span></span>`;
  }

  const items = [
    { val: activeCount, label: 'Active Engagements', col: 'var(--success)', d: delta(activeCount, 'active_projects') },
    { val: onTrackCount, label: 'On Track', col: 'var(--success)', d: delta(onTrackCount, 'on_track_count') },
    { val: needsAttentionCount, label: 'Needs Attention', col: 'var(--warning)', d: delta(needsAttentionCount, 'overdue_count') },
    { val: atRiskCount, label: 'At Risk', col: 'var(--danger)', d: delta(atRiskCount, 'at_risk_count') },
    { val: leadsCount, label: 'Active Leads', col: 'var(--accent)', d: delta(leadsCount, 'active_leads_count') },
    { val: workTypesCount, label: 'Work Types Active', col: 'var(--purple)', d: '' },
  ];

  return `<div class="pf__strip">${items.map(i => `
    <div class="pf__strip-item">
      <div class="pf__strip-top"><span class="pf__strip-val" style="color:${i.col}">${i.val}</span>${i.d}</div>
      <span class="pf__strip-label">${i.label}</span>
    </div>`).join('')}
  </div>`;
}
```

- [ ] **Step 4: Verify the dashboard loads in the browser**

Open WorkSage in a browser, navigate to Dashboard. The KPI strip should show the 6 new metrics. Verify no JS console errors.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(dashboard): rewrite KPI strip with v4 metrics (Active Engagements, On Track, Needs Attention, At Risk, Active Leads, Work Types Active)"
```

---

### Task 7: Frontend — Progress Status donut panel

**Files:**
- Modify: `nbi_project_dashboard.html:4376` (panel call in orchestrator)
- Modify: `nbi_project_dashboard.html:4478-4547` (comment out renderPfWorkCompleted, write new function)

- [ ] **Step 1: Comment out renderPfWorkCompleted**

Wrap the entire `renderPfWorkCompleted()` function (lines 4478-4547) in a comment block:

```javascript
// COMMENTED OUT — v3 Work Completed (replaced by v4 Progress Status donut)
// function renderPfWorkCompleted() { ... }
```

- [ ] **Step 2: Write renderPfProgressStatus function**

Add directly after the commented-out block:

```javascript
function renderPfProgressStatus(panelTasks) {
  const active = panelTasks.filter(t => t.status !== 'Cancelled');
  const total = active.length;
  if (total === 0) {
    return `<div class="pf__panel"><div class="pf__panel-hdr"><div class="pf__panel-title">Progress Status</div></div><div class="pf__panel-body"><div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-muted);font-size:0.82rem">No tasks found.</div></div></div>`;
  }

  const buckets = [
    { key: 'blocked', label: 'BLOCKED', colour: '#ef4444', count: 0 },
    { key: 'waiting', label: 'WAITING ON CLIENT', colour: '#fbbf24', count: 0 },
    { key: 'done', label: 'COMPLETED', colour: '#4ade80', count: 0 },
    { key: 'inprogress', label: 'IN PROGRESS', colour: '#06b6d4', count: 0 },
    { key: 'planning', label: 'PLANNING', colour: '#3b82f6', count: 0 },
    { key: 'notstarted', label: 'NOT STARTED', colour: '#666', count: 0 },
  ];

  active.forEach(t => {
    if (t.status === 'Blocked') buckets[0].count++;
    else if (t.healthState === 'Waiting on Client') buckets[1].count++;
    else if (t.status === 'Done') buckets[2].count++;
    else if (t.status === 'In progress') buckets[3].count++;
    else if (t.status === 'Planning') buckets[4].count++;
    else buckets[5].count++;
  });

  const nonZero = buckets.filter(b => b.count > 0);
  const cx = 200, cy = 150, r = 72, sw = 30;
  const circ = 2 * Math.PI * r;

  const labelPositions = [
    { x: 334, y: 82, anchor: 'start', lx1: 262, ly1: 100, lx2: 280, ly2: 85, lx3: 330, ly3: 85 },
    { x: 334, y: 152, anchor: 'start', lx1: 272, ly1: 155, lx2: 290, ly2: 155, lx3: 330, ly3: 155 },
    { x: 334, y: 222, anchor: 'start', lx1: 252, ly1: 212, lx2: 270, ly2: 225, lx3: 330, ly3: 225 },
    { x: 15, y: 222, anchor: 'start', lx1: 148, ly1: 212, lx2: 130, ly2: 225, lx3: 55, ly3: 225 },
    { x: 15, y: 147, anchor: 'start', lx1: 128, ly1: 150, lx2: 110, ly2: 150, lx3: 55, ly3: 150 },
    { x: 15, y: 75, anchor: 'start', lx1: 145, ly1: 92, lx2: 125, ly2: 78, lx3: 55, ly3: 78 },
  ];

  let svg = `<svg viewBox="0 0 400 300" width="100%" height="100%" style="max-height:280px">`;
  let offset = 0;
  nonZero.forEach((b, i) => {
    const pct = b.count / total;
    const dashLen = pct * circ;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${b.colour}" stroke-width="${sw}" stroke-dasharray="${dashLen.toFixed(1)} ${(circ - dashLen).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dashLen;
  });

  nonZero.forEach((b, i) => {
    const pos = labelPositions[i % labelPositions.length];
    const pctText = Math.round(b.count / total * 100) + '%';
    svg += `<line x1="${pos.lx1}" y1="${pos.ly1}" x2="${pos.lx2}" y2="${pos.ly2}" class="pf__donut-leader"/>`;
    svg += `<line x1="${pos.lx2}" y1="${pos.ly2}" x2="${pos.lx3}" y2="${pos.ly3}" class="pf__donut-leader"/>`;
    svg += `<circle cx="${pos.lx1}" cy="${pos.ly1}" r="3" fill="${b.colour}"/>`;
    svg += `<text x="${pos.x}" y="${pos.y}" fill="${b.colour}" font-size="16" font-weight="700">${pctText}</text>`;
    svg += `<text x="${pos.x}" y="${pos.y + 14}" fill="#999" font-size="9">${b.label}</text>`;
  });

  svg += `</svg>`;

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">Progress Status</div></div>';
  html += `<div class="pf__panel-body" style="padding:0"><div class="pf__donut-container">${svg}</div></div>`;
  html += '</div>';
  return html;
}
```

- [ ] **Step 3: Update orchestrator call**

At line 4376, change:

```javascript
html += renderPfWorkCompleted();
```

To:

```javascript
html += renderPfProgressStatus(panelTasks);
```

- [ ] **Step 4: Verify in browser**

Open Dashboard. The top-left panel should show a donut chart with status segments and leader lines. Verify segments match task data.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(dashboard): replace Work Completed with Progress Status donut chart"
```

---

### Task 8: Frontend — Upcoming Milestones panel (main panel)

**Files:**
- Modify: `nbi_project_dashboard.html:4377` (panel call)
- Modify: `nbi_project_dashboard.html:4550-4600` (comment out renderPfHealthScorecard, write new)

- [ ] **Step 1: Add client abbreviation helper**

Add before the panel functions (around line 4330):

```javascript
function getClientAbbreviation(clientName) {
  if (!clientName) return '';
  const briefs = window._clientBriefs || {};
  const brief = briefs[clientName];
  if (brief && brief.abbreviation) return brief.abbreviation;
  if (clientName.length <= 4 || clientName === clientName.toUpperCase()) return clientName;
  return clientName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3);
}
```

- [ ] **Step 2: Comment out renderPfHealthScorecard**

Wrap the entire `renderPfHealthScorecard()` function (lines 4550-4600) in a comment block.

- [ ] **Step 3: Write renderPfMilestones function**

```javascript
function renderPfMilestones(panelRoots, now) {
  const withDue = panelRoots.filter(r => r.dueDate && r.status !== 'Done' && r.status !== 'Cancelled');
  const overdue = withDue.filter(r => safeParseDate(r.dueDate) < now)
    .sort((a, b) => safeParseDate(a.dueDate) - safeParseDate(b.dueDate));
  const upcoming = withDue.filter(r => safeParseDate(r.dueDate) >= now)
    .sort((a, b) => safeParseDate(a.dueDate) - safeParseDate(b.dueDate));
  const items = [...overdue, ...upcoming].slice(0, 6);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">Upcoming Milestones</div></div>';
  html += '<div class="pf__panel-body">';

  if (items.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-muted);font-size:0.82rem">No milestones with due dates.</div>';
  } else {
    items.forEach(t => {
      const due = safeParseDate(t.dueDate);
      const isOverdue = due < now;
      const daysUntil = Math.ceil((due - now) / 86400000);
      const daysLate = Math.ceil((now - due) / 86400000);
      const barCol = isOverdue ? 'var(--danger)' : 'var(--success)';
      const client = getTaskClient(t) || '';
      const abbr = getClientAbbreviation(client);
      const abbrCol = isOverdue ? 'var(--danger)' : 'var(--accent)';
      const wt = t.workType || '';
      const subtitle = wt ? `${esc(client)} \u00B7 ${esc(wt)}` : esc(client);

      let statusText, statusCol;
      if (isOverdue) {
        statusText = daysLate + 'd overdue';
        statusCol = 'var(--danger)';
      } else if (daysUntil === 0) {
        statusText = 'Due today';
        statusCol = 'var(--danger)';
      } else if (daysUntil === 1) {
        statusText = 'Due tomorrow';
        statusCol = 'var(--danger)';
      } else {
        statusText = 'On track';
        statusCol = 'var(--success)';
      }
      const dateStr = due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      html += `<div class="pf__milestone-item" onclick="openDetailOverlay('${t.id}')">`;
      html += `<div class="pf__milestone-bar" style="background:${barCol}"></div>`;
      html += `<div style="flex:1;min-width:0">`;
      html += `<div class="pf__milestone-title"><span class="pf__milestone-abbr" style="color:${abbrCol}">${esc(abbr)}</span> \u2014 ${esc(t.title)}</div>`;
      html += `<div class="pf__milestone-sub">${subtitle}</div>`;
      html += `</div>`;
      html += `<div><div class="pf__milestone-status" style="color:${statusCol}">${statusText}</div><div class="pf__milestone-date">${dateStr}</div></div>`;
      html += `</div>`;
    });
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 4: Update orchestrator call**

At line 4377, change:

```javascript
html += renderPfHealthScorecard(filtered, roots, now);
```

To:

```javascript
html += renderPfMilestones(panelRoots, now);
```

- [ ] **Step 5: Verify in browser**

Open Dashboard. Top-right panel should show Upcoming Milestones with client abbreviations, titles, work types, and status badges. Click an item — should open detail overlay.

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(dashboard): replace Client Health with Upcoming Milestones panel"
```

---

### Task 9: Frontend — fix Project Timeline panel

**Files:**
- Modify: `nbi_project_dashboard.html:4603-4695` (renderPfTimeline)

- [ ] **Step 1: Widen label column**

In `renderPfTimeline()`, find all occurrences of `width:140px` and change to `width:180px`. There are approximately 4 occurrences (header, client row, project row label, and the min-width reference).

- [ ] **Step 2: Add vertical grid lines**

After the month headers `</div>` (around line 4653), before the client group rows, add a grid line container. Inside each client's project rows section, add:

```javascript
// After the month header div, add grid lines to the gantt body container
// Wrap the gantt body in a relative container with grid lines
```

In the `<div style="flex:1;position:relative;height:28px;min-width:${timelineW}px">` for each row, add vertical grid lines by modifying the timeline rendering to include a grid overlay:

After line 4641 (closing the month header div), add:

```javascript
html += `<div style="position:relative">`;
// Vertical grid lines overlay
html += `<div style="position:absolute;top:0;bottom:0;left:180px;right:0;display:flex;pointer-events:none;z-index:0">`;
for (let m = 0; m < sortedMonths; m++) html += `<div style="flex:1;border-right:1px solid var(--border-subtle)"></div>`;
html += `</div>`;
```

The simpler approach: after the month header row, compute the number of months and add grid lines as a positioned overlay matching the gantt body.

- [ ] **Step 3: Add scrollable container**

Wrap the gantt body (client groups and project rows) in a scrollable container:

```javascript
html += `<div style="max-height:220px;overflow-y:auto">`;
// ... existing client/project rows ...
html += `</div>`;
```

- [ ] **Step 4: Ensure only root-level projects shown in portfolio mode**

The current code already uses `panelRoots` which are root tasks. The `getDescendants` call at line 4658 renders child tasks — remove this or conditionally skip child rendering to show only root-level project bars.

- [ ] **Step 5: Verify in browser**

Check: labels not truncated, vertical grid lines visible, panel scrollable, root projects only shown.

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(dashboard): widen timeline labels to 180px, add vertical grid lines, scrollable panel"
```

---

### Task 10: Frontend — Work Types panel

**Files:**
- Modify: `nbi_project_dashboard.html:4379` (panel call)
- Modify: `nbi_project_dashboard.html:4698-4760` (comment out renderPfNeedsAttention from main, write new)

- [ ] **Step 1: Comment out renderPfNeedsAttention from main panels**

Comment out `renderPfNeedsAttention()` (lines 4698-4760). Keep it — the logic will be reused in the bottom row.

- [ ] **Step 2: Write renderPfWorkTypes function**

```javascript
function renderPfWorkTypes(panelRoots) {
  const activeRoots = panelRoots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const typeCounts = {};
  activeRoots.forEach(r => {
    if (r.workType) {
      typeCounts[r.workType] = (typeCounts[r.workType] || 0) + 1;
    }
  });
  const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">Work Types</div></div>';
  html += '<div class="pf__panel-body">';

  if (sorted.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-muted);font-size:0.82rem">No work types assigned yet. Add work types to projects in the detail overlay.</div>';
  } else {
    sorted.forEach(([name, count]) => {
      const barW = Math.round(count / maxCount * 100);
      html += `<div class="pf__wt-row">`;
      html += `<div class="pf__wt-label">${esc(name)}</div>`;
      html += `<div class="pf__wt-bar-track"><div class="pf__wt-bar" style="width:${barW}%"></div></div>`;
      html += `</div>`;
    });
    const axisMax = maxCount;
    const axisSteps = Math.min(axisMax, 6);
    html += '<div class="pf__wt-axis">';
    for (let i = 0; i <= axisSteps; i++) {
      html += `<span>${Math.round(i * axisMax / axisSteps)}</span>`;
    }
    html += '</div>';
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 3: Update orchestrator call**

At line 4379, change:

```javascript
html += renderPfNeedsAttention(panelTasks, now);
```

To:

```javascript
html += renderPfWorkTypes(panelRoots);
```

- [ ] **Step 4: Verify in browser**

Open Dashboard. Bottom-right main panel should show Work Types chart (initially empty since no projects have work_type assigned yet — verify empty state message shows).

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(dashboard): replace main Needs Attention with Work Types bar chart"
```

---

### Task 11: Frontend — bottom row: add Needs Attention as 4th panel

**Files:**
- Modify: `nbi_project_dashboard.html:4383-4387` (bottom row rendering)
- Modify: `nbi_project_dashboard.html:405` (bottom row CSS)

- [ ] **Step 1: Write renderPfBottomNeedsAttention function**

Add after the existing bottom row panel functions (after `renderPfTeamWorkload`, around line 4865):

```javascript
function renderPfBottomNeedsAttention(panelTasks, now) {
  const blocked = panelTasks.filter(t => t.healthState === 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled');
  const overdue = panelTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now && t.healthState !== 'Blocked');
  const atRisk = panelTasks.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled' && !(t.dueDate && safeParseDate(t.dueDate) < now));
  overdue.sort((a, b) => safeParseDate(a.dueDate) - safeParseDate(b.dueDate));
  const items = [...blocked, ...overdue, ...atRisk];
  const seen = new Set();
  const unique = items.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  const showCount = _portfolioBottomAttentionExpanded ? unique.length : 5;
  const visible = unique.slice(0, showCount);
  const remaining = unique.length - visible.length;

  let html = '<div class="pf__panel">';
  html += `<div class="pf__panel-hdr"><div class="pf__panel-title" style="color:var(--danger)">Needs Attention</div><div class="pf__panel-sub">Blocked, overdue &amp; at risk</div></div>`;
  html += '<div class="pf__panel-body">';

  if (unique.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:80px;color:var(--success);font-size:0.82rem">All clear.</div>';
  } else {
    visible.forEach(t => {
      const parent = t.parentId ? tasks.find(p => p.id === t.parentId) : null;
      const projectName = parent ? parent.title : '';
      const clientName = getTaskClient(t) || '';
      let badge = '', badgeClass = '', borderCol = 'var(--danger)';
      if (t.healthState === 'Blocked') {
        badge = 'BLOCKED'; badgeClass = 'pf__na-badge--blocked'; borderCol = 'var(--purple)';
      } else if (t.dueDate && safeParseDate(t.dueDate) < now) {
        const daysLate = Math.ceil((now - safeParseDate(t.dueDate)) / 86400000);
        badge = daysLate + 'd late'; badgeClass = 'pf__na-badge--overdue';
      } else {
        badge = 'AT RISK'; badgeClass = 'pf__na-badge--risk'; borderCol = '#f97316';
      }
      const ctx = [clientName, projectName].filter(Boolean).join(' \u2014 ');
      html += `<div class="pf__na-item" onclick="openDetailOverlay('${t.id}')">`;
      html += `<div class="pf__na-border" style="background:${borderCol}"></div>`;
      html += `<span class="pf__na-badge ${badgeClass}">${badge}</span>`;
      html += `<div style="flex:1;min-width:0"><div style="font-size:0.7rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</div>`;
      if (ctx) html += `<div style="font-size:0.58rem;color:var(--text-muted)">${esc(ctx)}</div>`;
      html += `</div></div>`;
    });
    if (remaining > 0) {
      html += `<div style="text-align:center;padding:6px;font-size:0.65rem;color:var(--text-muted);cursor:pointer" onclick="_portfolioBottomAttentionExpanded=true;renderContent()">+ ${remaining} more</div>`;
    }
  }
  html += '</div></div>';
  return html;
}
```

- [ ] **Step 2: Update bottom row CSS class**

At line 405, change the existing `.pf__bottom` rule or add the v4 override. In the orchestrator at line 4383, change:

```javascript
html += '<div class="pf__bottom">';
```

To:

```javascript
html += '<div class="pf__bottom pf__bottom--v4">';
```

- [ ] **Step 3: Add the 4th panel call**

At line 4386, after `renderPfTeamWorkload(panelTasks)`, add:

```javascript
html += renderPfBottomNeedsAttention(panelTasks, now);
```

So the bottom row becomes:

```javascript
html += '<div class="pf__bottom pf__bottom--v4">';
html += renderPfCompletingSoon(panelRoots, now);
html += renderPfUpcomingMilestones(panelTasks, now, fortnight);
html += renderPfTeamWorkload(panelTasks);
html += renderPfBottomNeedsAttention(panelTasks, now);
html += '</div>';
```

- [ ] **Step 4: Verify in browser**

Check bottom row now shows 4 equal-width panels. Needs Attention panel shows blocked/overdue/at-risk items. Click opens overlay.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(dashboard): add Needs Attention as 4th bottom row panel"
```

---

### Task 12: Frontend — work_type dropdown in detail overlay

**Files:**
- Modify: `nbi_project_dashboard.html:8079` (detail overlay, after Practice dropdown)

- [ ] **Step 1: Add work_type dropdown after the Practice field**

After line 8080 (the Practice area `</div>`), add:

```javascript
// Work Type dropdown — only for root tasks (projects)
html += (function() {
  if (task.parentId) return '';
  const cur = task.workType || '';
  const config = _leadsConfig;
  const opts = config && config.fieldOptions
    ? (config.fieldOptions.work_type_categories || []).map(o => typeof o === 'string' ? o : o.value)
    : [];
  return `<div class="detail-field"><label class="detail-field__label" for="detail-workType">Work Type</label><select id="detail-workType" onchange="updateTask('${id}','workType',this.value||null)"><option value="">-- None --</option>${opts.map(v => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`;
})();
```

- [ ] **Step 2: Ensure _leadsConfig is loaded when detail overlay opens**

Check that `loadLeadsConfig()` is called before the detail overlay renders. If `_leadsConfig` is null when the overlay opens, the dropdown will be empty. Add a load call at the top of the overlay render function if needed:

```javascript
if (!_leadsConfig) loadLeadsConfig();
```

- [ ] **Step 3: Also add to inline detail panel**

Find the inline detail panel Practice dropdown (around line 7405). Add the same work_type dropdown after it, following the same pattern but using the inline field IDs:

```javascript
html += (function() {
  if (task.parentId) return '';
  const cur = task.workType || '';
  const config = _leadsConfig;
  const opts = config && config.fieldOptions
    ? (config.fieldOptions.work_type_categories || []).map(o => typeof o === 'string' ? o : o.value)
    : [];
  return `<div class="detail-field"><label class="detail-field__label" for="inline-detail-workType">Work Type</label><select id="inline-detail-workType" onchange="updateTask('${id}','workType',this.value||null)"><option value="">-- None --</option>${opts.map(v => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`;
})();
```

- [ ] **Step 4: Verify in browser**

Open a project (root task) detail overlay. Work Type dropdown should appear after Practice. Select a value — it should save. Reload — value should persist. Check a child task — dropdown should NOT appear.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(dashboard): add Work Type dropdown to project detail overlay"
```

---

### Task 13: Admin UI — work type categories in Settings

**Files:**
- Modify: `nbi_project_dashboard.html` (Settings > Configuration tab, around renderLeadsSettings)

- [ ] **Step 1: Find renderLeadsSettings and add Work Types section**

In the `renderLeadsSettings()` function (around line 14276), after the existing field options sections, add a new section for Work Types:

```javascript
// Work Type Categories section
const wtOpts = (config.fieldOptions || []).filter(o => o.field_name === 'work_type_categories');
settingsHtml += `<div style="margin-top:16px"><label style="font-weight:600;font-size:0.82rem">Work Type Categories</label>`;
settingsHtml += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">`;
wtOpts.forEach(o => {
  settingsHtml += `<span class="tag" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:4px;font-size:0.75rem">${esc(o.value)}<button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.8rem;padding:0 2px" onclick="deleteFieldOption(${o.id})">&times;</button></span>`;
});
settingsHtml += `</div>`;
settingsHtml += `<div style="display:flex;gap:4px;margin-top:6px"><input id="newWorkTypeCategory" placeholder="New category..." style="flex:1;padding:4px 8px;font-size:0.75rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:4px;color:var(--text-primary)"><button class="btn btn--sm" onclick="createFieldOption('work_type_categories',document.getElementById('newWorkTypeCategory').value)">Add</button></div>`;
settingsHtml += `</div>`;
```

- [ ] **Step 2: Ensure createFieldOption handles work_type_categories**

The existing `createFieldOption(fieldName)` function should already work since it just POSTs to `/api/leads/field-options` with the field_name. Verify the function signature accepts a value parameter. If it currently reads from a fixed input ID, update it to accept the value:

```javascript
// If the existing function is: createFieldOption(fieldName)
// and it reads from input#newFieldOption_${fieldName}, adjust the input ID above to match
// OR modify the function to accept an optional value parameter
```

- [ ] **Step 3: Verify in browser**

Go to Settings > Configuration. Scroll to Work Type Categories section. Should show the 5 seeded categories as tags with delete buttons. Add a new one — it should appear. Delete one — it should disappear.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(settings): add Work Type Categories admin UI"
```

---

### Task 14: Full test suite + PM2 restart + smoke test

**Files:**
- No new files

- [ ] **Step 1: Run full test suite**

Run: `cd dashboard-server && npx vitest run`
Expected: All tests pass (existing + new snapshot test).

- [ ] **Step 2: Restart PM2**

Run: `pm2 restart nbi-dashboard`
Expected: Process restarts successfully. Migration 029 runs on startup.

- [ ] **Step 3: Smoke test in browser**

Open WorkSage in browser. Verify:
1. KPI strip shows 6 new metrics with deltas
2. Progress Status donut renders with correct segments
3. Upcoming Milestones shows projects with due dates
4. Project Timeline has wider labels and vertical grid lines
5. Work Types panel shows empty state (or data if work types assigned)
6. Bottom row has 4 panels including Needs Attention
7. Clicking a client in sidebar filters ALL panels
8. Clicking Portfolio resets to all-client view
9. Clicking any item opens detail overlay
10. Work Type dropdown appears in project detail overlay
11. Settings > Configuration shows Work Type Categories admin

- [ ] **Step 4: Commit any fixes**

If any issues found during smoke test, fix and commit.

- [ ] **Step 5: Final commit with all changes**

```bash
git add -A
git commit -m "feat(dashboard): Portfolio Dashboard v4 — Progress Status donut, Upcoming Milestones, fixed Timeline, Work Types chart, 4-panel bottom row with Needs Attention"
```
