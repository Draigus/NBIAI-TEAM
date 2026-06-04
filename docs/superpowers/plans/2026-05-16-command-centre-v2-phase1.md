# Command Centre v2 — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the CC from a 4-row fixed layout into a tabbed 5-panel nerve centre, adding Pipeline tracking (F1+F11), AIOS deep view (F5), Project health + client signals (F6+F8), Team workload (F9), and Handoff hub (F12).

**Architecture:** Persistent header (collapsed fires + 4 stats) sits above a tab bar (Work, Pipeline, Money, AIOS, Comms). Each tab fills remaining viewport height with its own scroll context. Four new backend endpoints serve tab-specific data via standard `{ data, error }` JSON responses. Frontend fetches all endpoints in parallel via `Promise.allSettled`, stores in module-level variables, and dispatches to per-tab render functions.

**Tech Stack:** Express 4 route handlers, PostgreSQL via `pg` pool, Vitest + supertest, monolithic HTML SPA with inline JS (string concatenation, no framework).

**Spec:** `docs/superpowers/specs/2026-05-16-command-centre-v2-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `dashboard-server/routes/command-centre.js` | Modify | Add 4 new endpoints: `/pipeline`, `/aios-detail`, `/team-workload`, `/handoffs`. Extend `/client-work` with project health data. |
| `nbi_project_dashboard.html` (CSS ~2635) | Modify | Add tab-bar CSS, header-stats CSS, panel CSS. Remove unused v1 4-row CSS. |
| `nbi_project_dashboard.html` (JS ~19634) | Modify | Refactor `_ccRenderPage` to tabbed dispatch. Add 5 new state vars. Update `_ccFetchAll` for 7 endpoints. Add 5 per-tab render functions. |
| `dashboard-server/tests/unit/command-centre.test.mjs` | Modify | Add test suites for each new endpoint. |

No new files created. All changes are in existing files.

---

## Schema Reference (read-only, no migrations needed)

All tables below already exist. Column names verified against `tests/fixtures/baseline-schema.sql`.

| Table | Key columns used |
|-------|-----------------|
| `leads` | id, title, stage_id, weighted_value (GENERATED), last_contacted, next_followup_date, completed_at, primary_contact_id, rom_min, rom_max, win_probability, created_at |
| `lead_pipeline_stages` | id, name, sort_order, colour, is_closed, is_won |
| `lead_activities` | id, lead_id, activity_type, created_at |
| `contacts` | id, name |
| `milestones` | id, client_id, title, target_date |
| `milestone_items` | milestone_id, task_id |
| `sows` | id, client_id, title, start_date, end_date, status |
| `tasks` | id, title, status, assignee, client_id, due_date, item_type, updated_at |
| `time_entries` | id, task_id, user_name, hours, date (TEXT, format 'YYYY-MM-DD') |
| `clients` | id, name, contract_value |
| `cc_snapshots` | snapshot_date, data (JSONB), updated_at |

**Important:** `lead_pipeline_stages` uses `sort_order` (not `position`). `time_entries.date` is TEXT, not DATE — cast with `::date` in queries. `leads.weighted_value` is a GENERATED column (`rom_max * win_probability / 100`).

---

## Existing Patterns to Follow

**Backend endpoint pattern** (from existing endpoints in `command-centre.js`):
```js
router.get('/api/command-centre/ENDPOINT', requireNBI, async (req, res) => {
  try {
    // queries...
    res.json({ data: { ... }, error: null });
  } catch (e) {
    log('error', 'CC', 'ENDPOINT failed', { error: e.message });
    res.status(500).json({ data: null, error: e.message });
  }
});
```

**Test pattern** (from existing `command-centre.test.mjs`):
```js
// Use makeApp(poolOverride) for HTTP tests via supertest
// Use makeMockPool(overrides) for SQL pattern-matching mocks
// Pool mock matches SQL substrings to return canned rows
```

**Frontend render pattern** (from `_ccRenderCommand`):
```js
// String concatenation, NO template literals in CC section
// Use esc() for user data, cc- prefixed classes
// Cards: <div class="cc-card">
// Rows: <div class="cc-row"> with cc-row-icon, cc-row-b (body), cc-row-a (actions)
// Badges: <span class="cc-badge cr|la|wa">
// Tags: <span class="cc-tag r|a|g|b">
// Buttons: <button class="cc-btn p|g|rd|pu">
```

**Data fetch pattern** (from `_ccFetchAll`):
```js
// Promise.allSettled with apiCall(), store .value.data || .value
// Guard with .status === 'fulfilled'
```

---

## Task 1: Tabbed UX Shell + Data Wiring

Refactor the CC from a 4-row fixed layout into a persistent header + 5-tab panel architecture. Move all v1 content into the Work tab. Set up data wiring for new endpoints (they'll 404 until Tasks 2-6 build them — `Promise.allSettled` handles this gracefully).

**Files:**
- Modify: `nbi_project_dashboard.html` — CSS block at ~2635, JS block at ~19634

### Steps

- [ ] **Step 1: Add new CSS rules for header stats, tab bar, and panels**

Find the CC CSS block (starts with `/* ===== Command Centre — Dense Widescreen Dark ===== */` around line 2635). Add the following rules at the end of the CC CSS block, before `</style>`:

```css
/* v2 Persistent header stats */
.cc-header-stats { display: flex; gap: 16px; align-items: center; }
.cc-hstat { text-align: center; line-height: 1.1; }
.cc-hstat .v { font-size: 1.1rem; font-weight: 800; color: #e6edf3; }
.cc-hstat .l { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.6px; color: #8b949e; display: block; }
.cc-hstat.danger .v { color: #f85149; }
.cc-hstat.warn .v { color: #d29922; }
.cc-hstat.info .v { color: #58a6ff; }
.cc-hstat.ok .v { color: #3fb950; }

/* v2 Collapsed fires in header */
.cc-fires-inline { display: flex; align-items: center; gap: 8px; margin-left: 14px; max-width: 500px; overflow: hidden; }
.cc-fire-count { font-size: 0.72rem; font-weight: 700; color: #f85149; background: rgba(248,81,73,.12); padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
.cc-fire-preview { font-size: 0.68rem; color: #8b949e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* v2 Tab bar */
.cc-tab-bar { display: flex; gap: 0; background: #161b22; border-bottom: 1px solid #30363d; padding: 0 24px; position: sticky; top: 45px; z-index: 99; }
.cc-tab-bar .cc-tab { padding: 8px 20px; font-size: 0.78rem; font-weight: 500; color: #8b949e; cursor: pointer; border-bottom: 2px solid transparent; transition: all .15s; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; }
.cc-tab-bar .cc-tab:hover { color: #e6edf3; }
.cc-tab-bar .cc-tab.on { color: #e6edf3; font-weight: 600; border-bottom-color: #58a6ff; }

/* v2 Panel area */
.cc-panel { flex: 1; min-height: 0; overflow-y: auto; }
.cc-panel-empty { padding: 60px 24px; text-align: center; color: #8b949e; font-size: 0.9rem; }

/* v2 Section headers inside tabs */
.cc-section-hdr { font-size: 0.78rem; font-weight: 600; color: #e6edf3; margin: 18px 0 10px 0; padding-bottom: 6px; border-bottom: 1px solid #21262d; display: flex; justify-content: space-between; align-items: center; }
.cc-section-hdr:first-child { margin-top: 0; }
.cc-section-hdr .ct { font-size: 0.62rem; color: #8b949e; font-weight: 400; }
```

- [ ] **Step 2: Remove the old `.cc-tabs` duplicate rule**

The CSS at line ~2647 has a duplicate `.cc-tabs` rule (the first one at line 2639 is the in-header tab toggle, the second at 2647 is an orphan). Remove this duplicate:

```css
/* REMOVE this block — it conflicts with the new tab-bar */
.cc-tabs { display: flex; gap: 2px; margin-bottom: 24px; border-bottom: 1px solid var(--border); }
```

- [ ] **Step 3: Add new state variables and update tab default**

In the CC JS section (starts at `// ==================== COMMAND CENTRE ====================` around line 19633), replace the existing state block:

Old:
```js
let _ccBriefing = null;
let _ccClientWork = null;
let _ccSnapshot = null;
let _ccLoading = false;
let _ccLoadFailed = false;
let _ccTab = (() => { const v = localStorage.getItem('ccTab'); return (v === 'command' || v === 'brief') ? v : 'command'; })();
let _ccPollTimer = null;
```

New:
```js
let _ccBriefing = null;
let _ccClientWork = null;
let _ccSnapshot = null;
let _ccPipeline = null;
let _ccAiosDetail = null;
let _ccTeamWorkload = null;
let _ccHandoffs = null;
let _ccLoading = false;
let _ccLoadFailed = false;
const _ccValidTabs = ['work', 'pipeline', 'money', 'aios', 'comms'];
let _ccTab = (() => { const v = localStorage.getItem('ccTab'); return _ccValidTabs.includes(v) ? v : 'work'; })();
let _ccPollTimer = null;
```

- [ ] **Step 4: Update `_ccFetchAll` to fetch all 7 endpoints**

Replace the existing `_ccFetchAll` function:

```js
async function _ccFetchAll() {
  _ccLoading = true;
  try {
    const [briefRes, workRes, snapRes, pipeRes, aiosRes, teamRes, handoffRes] = await Promise.allSettled([
      apiCall('/api/command-centre/briefing'),
      apiCall('/api/command-centre/client-work'),
      apiCall('/api/command-centre/snapshot'),
      apiCall('/api/command-centre/pipeline'),
      apiCall('/api/command-centre/aios-detail'),
      apiCall('/api/command-centre/team-workload'),
      apiCall('/api/command-centre/handoffs')
    ]);
    if (briefRes.status === 'fulfilled' && briefRes.value) {
      _ccBriefing = briefRes.value.data || briefRes.value;
    }
    if (workRes.status === 'fulfilled' && workRes.value) {
      _ccClientWork = workRes.value.data || workRes.value;
    }
    if (snapRes.status === 'fulfilled' && snapRes.value) {
      const raw = snapRes.value.data || snapRes.value;
      _ccSnapshot = raw.data || raw;
    }
    if (pipeRes.status === 'fulfilled' && pipeRes.value) {
      _ccPipeline = pipeRes.value.data || pipeRes.value;
    }
    if (aiosRes.status === 'fulfilled' && aiosRes.value) {
      _ccAiosDetail = aiosRes.value.data || aiosRes.value;
    }
    if (teamRes.status === 'fulfilled' && teamRes.value) {
      _ccTeamWorkload = teamRes.value.data || teamRes.value;
    }
    if (handoffRes.status === 'fulfilled' && handoffRes.value) {
      _ccHandoffs = handoffRes.value.data || handoffRes.value;
    }
  } catch (e) {
    console.warn('[CC] fetch error:', e);
  }
  if (!_ccBriefing && !_ccClientWork) _ccLoadFailed = true;
  _ccLoading = false;
  if (currentView === 'commandcentre') {
    const el = document.getElementById('mainContent');
    if (el) renderCommandCentre(el);
  }
}
```

- [ ] **Step 5: Rewrite `_ccRenderPage` with persistent header + tab dispatch**

Replace the entire `_ccRenderPage` function:

```js
function _ccRenderPage(el) {
  const b = _ccBriefing || {};
  const w = _ccClientWork || {};
  const s = _ccSnapshot || {};
  const fc = s.four_cs || {};
  const stats = w.stats || {};
  const fires = b.fires || [];

  let html = '<div class="cc-page">';

  // === Persistent header: fires summary + stats ===
  html += '<div class="cc-header">';
  html += '<div style="display:flex;align-items:center;flex:1;min-width:0;">';
  html += '<h1>Command Centre</h1>';

  // Collapsed fires
  if (fires.length > 0) {
    html += '<div class="cc-fires-inline">';
    html += '<span class="cc-fire-count">' + fires.length + ' fires</span>';
    var top2 = fires.slice(0, 2).map(function(f) { return esc(f.title); }).join(' · ');
    html += '<span class="cc-fire-preview">' + top2 + '</span>';
    html += '</div>';
  }
  html += '</div>';

  // Header stats
  html += '<div class="cc-header-stats">';
  html += '<div class="cc-hstat"><span class="v">' + (stats.open_tasks || 0) + '</span><span class="l">Open</span></div>';
  html += '<div class="cc-hstat' + ((stats.overdue || 0) > 0 ? ' danger' : '') + '"><span class="v">' + (stats.overdue || 0) + '</span><span class="l">Overdue</span></div>';
  html += '<div class="cc-hstat' + ((stats.blocked || 0) > 0 ? ' warn' : '') + '"><span class="v">' + (stats.blocked || 0) + '</span><span class="l">Blocked</span></div>';
  html += '<div class="cc-hstat info"><span class="v">' + (stats.due_today || 0) + '</span><span class="l">Today</span></div>';
  html += '</div>';

  html += '<div class="cc-live"><div class="cc-live-dot"></div>Live</div>';
  html += '</div>';

  // === Tab bar ===
  html += '<div class="cc-tab-bar">';
  var tabs = [
    { id: 'work', label: 'Work' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'money', label: 'Money' },
    { id: 'aios', label: 'AIOS' },
    { id: 'comms', label: 'Comms' }
  ];
  tabs.forEach(function(t) {
    html += '<div class="cc-tab' + (_ccTab === t.id ? ' on' : '') + '" onclick="_ccSwitchTab(\'' + t.id + '\')">' + t.label + '</div>';
  });
  html += '</div>';

  // === Active panel ===
  html += '<div class="cc-body">';
  if (_ccTab === 'work') html += _ccRenderWorkTab(b, w, s, fc);
  else if (_ccTab === 'pipeline') html += _ccRenderPipelineTab();
  else if (_ccTab === 'money') html += _ccRenderMoneyTab();
  else if (_ccTab === 'aios') html += _ccRenderAiosTab();
  else if (_ccTab === 'comms') html += _ccRenderCommsTab();
  html += '</div>';

  html += '</div>';
  el.innerHTML = html;
}
```

- [ ] **Step 6: Rename `_ccRenderCommand` to `_ccRenderWorkTab`**

Rename the existing function. Its signature becomes:

```js
function _ccRenderWorkTab(b, w, s, fc) {
```

The body stays the same for now — it contains the v1 Row 1-4 content. This preserves all existing functionality in the Work tab.

- [ ] **Step 7: Add placeholder tab renderers**

Add these functions after `_ccRenderWorkTab`:

```js
function _ccRenderPipelineTab() {
  var p = _ccPipeline;
  if (!p) return '<div class="cc-panel-empty">Loading pipeline data...</div>';
  return _ccRenderPipelineContent(p);
}

function _ccRenderMoneyTab() {
  return '<div class="cc-panel-empty">Financial Pulse &mdash; coming in Phase 2.<br><span style="font-size:0.75rem;color:#484f58;">Revenue tracking, invoice status, contract values.</span></div>';
}

function _ccRenderAiosTab() {
  var a = _ccAiosDetail;
  if (!a) return '<div class="cc-panel-empty">Loading AIOS data...</div>';
  return _ccRenderAiosContent(a);
}

function _ccRenderCommsTab() {
  return '<div class="cc-panel-empty">Comms Debt &mdash; coming in Phase 3.<br><span style="font-size:0.75rem;color:#484f58;">Email backlog, meeting actions, follow-ups.</span></div>';
}
```

- [ ] **Step 8: Add stub render functions that Tasks 2-6 will implement**

```js
function _ccRenderPipelineContent(p) {
  return '<div class="cc-panel-empty">Pipeline view loading...</div>';
}

function _ccRenderAiosContent(a) {
  return '<div class="cc-panel-empty">AIOS detail loading...</div>';
}
```

- [ ] **Step 9: Update `_ccSwitchTab` to use direct re-render**

Replace:
```js
function _ccSwitchTab(tab) {
  _ccTab = tab;
  localStorage.setItem('ccTab', tab);
  renderContent();
}
```

With:
```js
function _ccSwitchTab(tab) {
  _ccTab = tab;
  localStorage.setItem('ccTab', tab);
  if (currentView === 'commandcentre') {
    var el = document.getElementById('mainContent');
    if (el) renderCommandCentre(el);
  }
}
```

- [ ] **Step 10: Delete the `_ccRenderBrief` function**

The "Brief" tab is replaced by the new 5-tab system. Remove the entire `_ccRenderBrief` function (around line 20117-20123).

- [ ] **Step 11: Verify and commit**

Run: `cd dashboard-server && npm test`
Expected: All existing CC tests still pass (no endpoint changes in this task).

```
git add nbi_project_dashboard.html
git commit -m "feat(cc): v2 tabbed UX shell — persistent header + 5-tab layout"
```

---

## Task 2: Pipeline Endpoint + Tab (F1 + F11)

New `/api/command-centre/pipeline` endpoint serving leads funnel, stale leads, upcoming follow-ups, and pipeline analytics. Pipeline tab frontend rendering.

**Files:**
- Modify: `dashboard-server/routes/command-centre.js` — add endpoint before `router._computeSnapshot` export
- Modify: `dashboard-server/tests/unit/command-centre.test.mjs` — add pipeline test suite
- Modify: `nbi_project_dashboard.html` — replace `_ccRenderPipelineContent` stub

### Steps

- [ ] **Step 1: Write failing tests for the pipeline endpoint**

Add to `dashboard-server/tests/unit/command-centre.test.mjs`, after the existing `describe('Command Centre — Client-work endpoint')` block:

```js
describe('Command Centre — Pipeline endpoint', () => {
  function makePipelineMockPool(overrides = {}) {
    return {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes('lead_pipeline_stages') && sql.includes('GROUP BY')) {
          return { rows: overrides.stages || [] };
        }
        if (sql.includes('last_contacted') && sql.includes('14 days')) {
          return { rows: overrides.stale || [] };
        }
        if (sql.includes('next_followup_date')) {
          return { rows: overrides.followups || [] };
        }
        if (sql.includes('is_won') && sql.includes('90 days')) {
          return { rows: overrides.conversion || [{ won: '0', total: '0' }] };
        }
        if (sql.includes('completed_at') && sql.includes('avg_days')) {
          return { rows: overrides.velocity || [{ avg_days: null }] };
        }
        if (sql.includes('DATE_TRUNC') && sql.includes('leads')) {
          return { rows: overrides.trend || [] };
        }
        return { rows: [] };
      }),
    };
  }

  it('GET /api/command-centre/pipeline returns correct shape', async () => {
    const pool = makePipelineMockPool();
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/pipeline');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('stages');
    expect(res.body.data).toHaveProperty('stale_leads');
    expect(res.body.data).toHaveProperty('upcoming_followups');
    expect(res.body.data).toHaveProperty('analytics');
    expect(res.body.error).toBeNull();
  });

  it('returns pipeline stages with counts and weighted values', async () => {
    const pool = makePipelineMockPool({
      stages: [
        { name: 'Lead', sort_order: 1, colour: '#6b7280', count: '3', weighted_total: '15000' },
        { name: 'Proposal', sort_order: 4, colour: '#f59e0b', count: '2', weighted_total: '50000' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/pipeline');
    expect(res.body.data.stages).toHaveLength(2);
    expect(res.body.data.stages[0]).toEqual({
      name: 'Lead', sort_order: 1, colour: '#6b7280', count: 3, weighted_total: 15000,
    });
  });

  it('returns stale leads with contact name', async () => {
    const pool = makePipelineMockPool({
      stale: [
        { id: 'abc', title: 'Stale deal', last_contacted: '2026-04-01', contact_name: 'John' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/pipeline');
    expect(res.body.data.stale_leads).toHaveLength(1);
    expect(res.body.data.stale_leads[0].title).toBe('Stale deal');
    expect(res.body.data.stale_leads[0].contact_name).toBe('John');
  });

  it('returns analytics with conversion rate and velocity', async () => {
    const pool = makePipelineMockPool({
      conversion: [{ won: '5', total: '20' }],
      velocity: [{ avg_days: '18.5' }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/pipeline');
    const a = res.body.data.analytics;
    expect(a.conversion_rate).toBe(25);
    expect(a.avg_deal_days).toBe(18.5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: FAIL — `/api/command-centre/pipeline` returns 404.

- [ ] **Step 3: Implement the pipeline endpoint**

Add this endpoint in `dashboard-server/routes/command-centre.js`, before the `router._computeSnapshot = computeSnapshot;` line:

```js
  /** GET /api/command-centre/pipeline — leads funnel, stale, follow-ups, analytics (F1+F11) */
  router.get('/api/command-centre/pipeline', requireNBI, async (req, res) => {
    try {
      // Pipeline by stage
      const stagesQ = await pool.query(`
        SELECT s.name, s.sort_order, s.colour,
          COUNT(l.id)::int as count,
          COALESCE(SUM(l.weighted_value), 0)::numeric as weighted_total
        FROM lead_pipeline_stages s
        LEFT JOIN leads l ON l.stage_id = s.id AND l.completed_at IS NULL
        WHERE s.is_closed = false
        GROUP BY s.name, s.sort_order, s.colour
        ORDER BY s.sort_order
      `);

      // Stale leads (not contacted in 14+ days, still open)
      const staleQ = await pool.query(`
        SELECT l.id, l.title, l.last_contacted, l.weighted_value,
          c.name as contact_name, s.name as stage_name, s.colour as stage_colour
        FROM leads l
        LEFT JOIN contacts c ON l.primary_contact_id = c.id
        JOIN lead_pipeline_stages s ON l.stage_id = s.id
        WHERE l.completed_at IS NULL
          AND (l.last_contacted IS NULL OR l.last_contacted < CURRENT_DATE - 14)
        ORDER BY l.last_contacted NULLS FIRST
        LIMIT 20
      `);

      // Upcoming follow-ups (next 7 days)
      const followupsQ = await pool.query(`
        SELECT l.id, l.title, l.next_followup_date, l.next_action, l.weighted_value,
          c.name as contact_name, s.name as stage_name, s.colour as stage_colour
        FROM leads l
        LEFT JOIN contacts c ON l.primary_contact_id = c.id
        JOIN lead_pipeline_stages s ON l.stage_id = s.id
        WHERE l.next_followup_date IS NOT NULL
          AND l.next_followup_date <= CURRENT_DATE + 7
          AND l.completed_at IS NULL
        ORDER BY l.next_followup_date
        LIMIT 20
      `);

      // Analytics: conversion rate (90 days)
      const convQ = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE s.is_won)::int as won,
          COUNT(*)::int as total
        FROM leads l
        JOIN lead_pipeline_stages s ON l.stage_id = s.id
        WHERE l.created_at >= NOW() - INTERVAL '90 days'
      `);

      // Analytics: average deal velocity
      const velQ = await pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (l.completed_at - l.created_at)) / 86400)::numeric(10,1) as avg_days
        FROM leads l
        WHERE l.completed_at IS NOT NULL
          AND l.created_at >= NOW() - INTERVAL '90 days'
      `);

      // Analytics: weekly new vs closed (8 weeks)
      const trendQ = await pool.query(`
        SELECT
          DATE_TRUNC('week', d.week)::date as week,
          COALESCE(n.count, 0)::int as new_leads,
          COALESCE(c.count, 0)::int as closed_leads
        FROM generate_series(
          DATE_TRUNC('week', NOW() - INTERVAL '56 days'),
          DATE_TRUNC('week', NOW()),
          '1 week'
        ) d(week)
        LEFT JOIN (
          SELECT DATE_TRUNC('week', created_at)::date as week, COUNT(*) as count
          FROM leads WHERE created_at >= NOW() - INTERVAL '56 days'
          GROUP BY 1
        ) n ON n.week = d.week::date
        LEFT JOIN (
          SELECT DATE_TRUNC('week', completed_at)::date as week, COUNT(*) as count
          FROM leads WHERE completed_at IS NOT NULL AND completed_at >= NOW() - INTERVAL '56 days'
          GROUP BY 1
        ) c ON c.week = d.week::date
        ORDER BY d.week
      `);

      // Total weighted pipeline
      const totalQ = await pool.query(`
        SELECT COALESCE(SUM(weighted_value), 0)::numeric as total_weighted
        FROM leads WHERE completed_at IS NULL
      `);

      const conv = convQ.rows[0] || { won: 0, total: 0 };
      const convRate = conv.total > 0 ? Math.round((conv.won / conv.total) * 100) : 0;
      const avgDays = velQ.rows[0]?.avg_days ? parseFloat(velQ.rows[0].avg_days) : null;

      res.json({
        data: {
          stages: stagesQ.rows.map(r => ({
            name: r.name,
            sort_order: parseInt(r.sort_order),
            colour: r.colour,
            count: parseInt(r.count),
            weighted_total: parseFloat(r.weighted_total) || 0,
          })),
          stale_leads: staleQ.rows,
          upcoming_followups: followupsQ.rows,
          analytics: {
            total_weighted_pipeline: parseFloat(totalQ.rows[0]?.total_weighted) || 0,
            conversion_rate: convRate,
            avg_deal_days: avgDays,
            trend: trendQ.rows,
          },
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'pipeline failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: All pipeline tests PASS. All existing tests still PASS.

- [ ] **Step 5: Implement Pipeline tab frontend**

In `nbi_project_dashboard.html`, replace the `_ccRenderPipelineContent` stub with:

```js
function _ccRenderPipelineContent(p) {
  var html = '';

  // === Pipeline Funnel + Summary tiles (2 columns) ===
  html += '<div class="cc-grid-2">';

  // Funnel card
  html += '<div class="cc-card"><h3><span>Pipeline Funnel</span> <span class="ct">active stages</span></h3>';
  var stages = p.stages || [];
  if (stages.length === 0) {
    html += '<div style="padding:12px 0;color:#8b949e;font-size:0.85rem">No active pipeline stages</div>';
  } else {
    var maxCount = Math.max.apply(null, stages.map(function(s) { return s.count; }).concat([1]));
    stages.forEach(function(s) {
      var pct = Math.max(8, Math.round((s.count / maxCount) * 100));
      html += '<div style="margin-bottom:8px;">';
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
      html += '<span style="font-size:0.8rem;">' + esc(s.name) + '</span>';
      html += '<span style="font-size:0.72rem;color:#8b949e;">' + s.count + ' leads &middot; &pound;' + Math.round(s.weighted_total).toLocaleString() + '</span>';
      html += '</div>';
      html += '<div style="background:#21262d;border-radius:4px;height:10px;overflow:hidden;">';
      html += '<div style="background:' + esc(s.colour || '#58a6ff') + ';width:' + pct + '%;height:100%;border-radius:4px;"></div>';
      html += '</div></div>';
    });
  }
  html += '</div>';

  // Analytics summary tiles
  var a = p.analytics || {};
  html += '<div class="cc-card"><h3><span>Pipeline Analytics</span> <span class="ct">90-day window</span></h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">';

  html += '<div class="cc-stat"><div class="s">PIPELINE VALUE</div>';
  html += '<div class="v" style="color:#58a6ff;">&pound;' + Math.round(a.total_weighted_pipeline || 0).toLocaleString() + '</div></div>';

  html += '<div class="cc-stat"><div class="s">CONVERSION</div>';
  var convColour = (a.conversion_rate || 0) >= 20 ? '#3fb950' : (a.conversion_rate || 0) >= 10 ? '#d29922' : '#f85149';
  html += '<div class="v" style="color:' + convColour + ';">' + (a.conversion_rate || 0) + '%</div></div>';

  html += '<div class="cc-stat"><div class="s">AVG DEAL VELOCITY</div>';
  html += '<div class="v">' + (a.avg_deal_days !== null ? a.avg_deal_days + 'd' : '—') + '</div></div>';

  html += '<div class="cc-stat"><div class="s">ACTIVE LEADS</div>';
  var totalLeads = stages.reduce(function(sum, s) { return sum + s.count; }, 0);
  html += '<div class="v">' + totalLeads + '</div></div>';

  html += '</div>';

  // Weekly trend mini chart
  var trend = a.trend || [];
  if (trend.length > 0) {
    html += '<div class="cc-section-hdr">Weekly Trend <span class="ct">new vs closed</span></div>';
    var trendMax = Math.max.apply(null, trend.map(function(t) { return Math.max(t.new_leads || 0, t.closed_leads || 0); }).concat([1]));
    html += '<div style="display:flex;align-items:flex-end;gap:4px;height:60px;">';
    trend.forEach(function(t, i) {
      var nH = Math.max(4, Math.round(((t.new_leads || 0) / trendMax) * 55));
      var cH = Math.max(4, Math.round(((t.closed_leads || 0) / trendMax) * 55));
      html += '<div style="flex:1;display:flex;gap:2px;align-items:flex-end;">';
      html += '<div style="flex:1;background:#1f6feb;height:' + nH + 'px;border-radius:2px 2px 0 0;" title="New: ' + (t.new_leads || 0) + '"></div>';
      html += '<div style="flex:1;background:#238636;height:' + cH + 'px;border-radius:2px 2px 0 0;" title="Closed: ' + (t.closed_leads || 0) + '"></div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:0.55rem;color:#484f58;margin-top:4px;"><span>8w ago</span><span style="color:#1f6feb;">&#9632; new</span><span style="color:#238636;">&#9632; closed</span><span>now</span></div>';
  }
  html += '</div>';

  html += '</div>';

  // === Stale Leads + Upcoming Follow-ups (2 columns) ===
  html += '<div class="cc-grid-2" style="margin-top:14px;">';

  // Stale leads
  html += '<div class="cc-card" style="border-color:rgba(248,81,73,.15);"><h3><span>&#9888; Stale Leads</span> <span class="ct">no contact 14d+</span></h3>';
  var stale = p.stale_leads || [];
  if (stale.length === 0) {
    html += '<div style="padding:8px 0;color:#8b949e;font-size:0.85rem">All leads recently contacted</div>';
  } else {
    stale.slice(0, 8).forEach(function(l) {
      var days = l.last_contacted ? Math.floor((Date.now() - new Date(l.last_contacted).getTime()) / 86400000) : 999;
      var daysLabel = l.last_contacted ? days + 'd ago' : 'never';
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:rgba(248,81,73,.1);color:#f85149;font-size:.6rem;font-weight:700;">' + (days > 30 ? '!!' : '!') + '</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(l.title) + '</div>';
      html += '<div class="cc-row-m">' + esc(l.contact_name || 'No contact') + ' &middot; <span class="cc-tag r">' + daysLabel + '</span>' + (l.stage_name ? ' &middot; ' + esc(l.stage_name) : '') + '</div>';
      html += '</div>';
      html += '<div class="cc-row-a"><button class="cc-btn g" onclick="switchView(\'leads\')">Open</button></div>';
      html += '</div>';
    });
  }
  html += '</div>';

  // Upcoming follow-ups
  html += '<div class="cc-card" style="border-color:rgba(88,166,255,.15);"><h3><span>&#128197; Follow-ups Due</span> <span class="ct">next 7 days</span></h3>';
  var followups = p.upcoming_followups || [];
  if (followups.length === 0) {
    html += '<div style="padding:8px 0;color:#8b949e;font-size:0.85rem">No follow-ups scheduled</div>';
  } else {
    followups.slice(0, 8).forEach(function(l) {
      var dateStr = l.next_followup_date ? new Date(l.next_followup_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
      var isToday = l.next_followup_date && new Date(l.next_followup_date).toDateString() === new Date().toDateString();
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:rgba(88,166,255,.1);color:#58a6ff;">&#9673;</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(l.title) + '</div>';
      html += '<div class="cc-row-m">' + esc(l.contact_name || '') + ' &middot; <span class="cc-tag ' + (isToday ? 'a' : 'b') + '">' + dateStr + '</span>' + (l.next_action ? ' &middot; ' + esc(l.next_action) : '') + '</div>';
      html += '</div>';
      html += '<div class="cc-row-a"><button class="cc-btn" onclick="switchView(\'leads\')">Open</button></div>';
      html += '</div>';
    });
  }
  html += '</div>';

  html += '</div>';

  return html;
}
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/command-centre.js dashboard-server/tests/unit/command-centre.test.mjs nbi_project_dashboard.html
git commit -m "feat(cc): pipeline endpoint + tab (F1+F11) — funnel, stale leads, follow-ups, analytics"
```

---

## Task 3: AIOS Deep View Endpoint + Tab (F5)

New `/api/command-centre/aios-detail` endpoint serving expanded Four Cs data, actionable recommendations generated from snapshot data, and 30-day score history. AIOS tab frontend rendering.

**Files:**
- Modify: `dashboard-server/routes/command-centre.js` — add endpoint
- Modify: `dashboard-server/tests/unit/command-centre.test.mjs` — add tests
- Modify: `nbi_project_dashboard.html` — replace `_ccRenderAiosContent` stub

### Steps

- [ ] **Step 1: Write failing tests**

Add to the test file:

```js
describe('Command Centre — AIOS-detail endpoint', () => {
  it('GET /api/command-centre/aios-detail returns correct shape', async () => {
    const pool = makeMockPool({
      snapshots: [{
        data: {
          four_cs: {
            context: { score: 7, max: 10, details: ['Brain core fresh'] },
            connections: { score: 6, max: 10, details: ['comms: connected'] },
            capabilities: { score: 8, max: 10, details: ['30 skills'] },
            cadence: { score: 2, max: 10, details: ['WorkSage cron active'] },
          },
          brain: { modules: [], roles: [] },
          skills: { skills: [] },
          memory: { files: [], health: { total: 0, fresh: 0, stale: 0 } },
          connections: { buckets: {} },
        },
        snapshot_date: '2026-05-16',
        updated_at: '2026-05-16T10:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/aios-detail');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('four_cs');
    expect(res.body.data).toHaveProperty('recommendations');
    expect(res.body.data).toHaveProperty('history');
    expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    expect(res.body.error).toBeNull();
  });

  it('returns 404 when no snapshot exists', async () => {
    const pool = makeMockPool({ snapshots: [] });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/aios-detail');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: FAIL — 404.

- [ ] **Step 3: Implement the AIOS detail endpoint**

Add to `command-centre.js` before `router._computeSnapshot`:

```js
  /** GET /api/command-centre/aios-detail — expanded Four Cs, recommendations, history (F5) */
  router.get('/api/command-centre/aios-detail', requireNBI, async (req, res) => {
    try {
      // Latest snapshot
      const { rows: snapRows } = await pool.query(
        'SELECT data, snapshot_date, updated_at FROM cc_snapshots ORDER BY snapshot_date DESC LIMIT 1'
      );
      if (snapRows.length === 0) {
        return res.status(404).json({ data: null, error: 'No snapshot exists. Trigger a refresh first.' });
      }

      const snap = snapRows[0].data;
      const fourCs = snap.four_cs || {};

      // Generate recommendations from snapshot data
      const recommendations = [];
      // Brain module freshness
      if (snap.brain && snap.brain.modules) {
        snap.brain.modules.forEach(m => {
          if (m.last_modified && daysSince(m.last_modified) > STALE_DAYS) {
            recommendations.push({
              category: 'context',
              severity: 'amber',
              title: 'Verify brain/' + m.name + '.md',
              detail: 'Last modified ' + daysSince(m.last_modified) + ' days ago',
              action: 'refresh',
            });
          }
        });
      }
      // Skills without learnings
      if (snap.skills) {
        const noLearnings = (Array.isArray(snap.skills) ? snap.skills : []).filter(s => !s.has_learnings);
        if (noLearnings.length > 5) {
          recommendations.push({
            category: 'capabilities',
            severity: 'info',
            title: noLearnings.length + ' skills have no learnings captured',
            detail: 'Run evals or capture learnings to improve skill reuse',
            action: 'improve',
          });
        }
      }
      // Missing connections
      if (snap.connections && snap.connections.buckets) {
        Object.entries(snap.connections.buckets).forEach(([name, b]) => {
          if (b.status === 'missing') {
            recommendations.push({
              category: 'connections',
              severity: 'red',
              title: 'Connect ' + name + ' data source',
              detail: 'No sources configured for ' + name + ' bucket',
              action: 'connect',
            });
          }
        });
      }
      // Stale memory files
      if (snap.memory && snap.memory.files) {
        const staleMemFiles = snap.memory.files.filter(f => f.is_stale);
        if (staleMemFiles.length > 0) {
          recommendations.push({
            category: 'context',
            severity: 'amber',
            title: staleMemFiles.length + ' memory files reference moved targets',
            detail: staleMemFiles.slice(0, 3).map(f => f.name).join(', '),
            action: 'review',
          });
        }
      }
      // Dormant roles
      if (snap.brain && snap.brain.roles) {
        const dormant = snap.brain.roles.filter(r =>
          !r.has_knowledge || (r.knowledge_freshness !== null && r.knowledge_freshness > 90)
        );
        if (dormant.length > 0) {
          recommendations.push({
            category: 'capabilities',
            severity: 'amber',
            title: dormant.length + ' roles have stale or missing knowledge',
            detail: dormant.slice(0, 3).map(r => r.name).join(', '),
            action: 'refresh',
          });
        }
      }
      // Cadence
      if (fourCs.cadence && fourCs.cadence.score < 5) {
        recommendations.push({
          category: 'cadence',
          severity: 'info',
          title: 'Cadence score is low (' + fourCs.cadence.score + '/10)',
          detail: 'Consider setting up analysis crons or the Hermes agent',
          action: 'plan',
        });
      }

      // 30-day history (Four Cs scores only)
      const { rows: histRows } = await pool.query(`
        SELECT snapshot_date, data->'four_cs' as four_cs
        FROM cc_snapshots
        WHERE snapshot_date >= CURRENT_DATE - 30
        ORDER BY snapshot_date
      `);

      res.json({
        data: {
          four_cs: fourCs,
          snapshot_date: snapRows[0].snapshot_date,
          last_updated: snapRows[0].updated_at,
          recommendations,
          history: histRows.map(r => ({
            date: r.snapshot_date,
            four_cs: r.four_cs,
          })),
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'aios-detail failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: All PASS.

- [ ] **Step 5: Implement AIOS tab frontend**

Replace the `_ccRenderAiosContent` stub in `nbi_project_dashboard.html`:

```js
function _ccRenderAiosContent(a) {
  var html = '';
  var fc = a.four_cs || {};

  // === Four Cs Detail Cards (4 columns) ===
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;">';
  ['context', 'connections', 'capabilities', 'cadence'].forEach(function(key) {
    var c = fc[key] || { score: 0, max: 10, details: [] };
    var label = key.charAt(0).toUpperCase() + key.slice(1);
    html += '<div class="cc-card" style="text-align:center;">';
    html += _ccRingSvg(c.score, c.max, 56);
    html += '<div style="font-size:0.82rem;font-weight:600;margin:6px 0 2px;">' + esc(label) + '</div>';
    html += '<div style="font-size:0.65rem;color:#8b949e;margin-bottom:8px;">' + c.score + '/' + c.max + '</div>';
    // Detail items
    c.details.slice(0, 4).forEach(function(d) {
      html += '<div style="font-size:0.68rem;color:#8b949e;padding:2px 0;text-align:left;">&middot; ' + esc(d) + '</div>';
    });
    html += '</div>';
  });
  html += '</div>';

  // === Recommendations + History (2 columns) ===
  html += '<div class="cc-grid-2" style="margin-top:14px;">';

  // Recommendations
  html += '<div class="cc-card"><h3><span>&#128640; Recommendations</span> <span class="ct">' + (a.recommendations || []).length + ' items</span></h3>';
  var recs = a.recommendations || [];
  if (recs.length === 0) {
    html += '<div style="padding:8px 0;color:#8b949e;font-size:0.85rem">All systems healthy &mdash; no actions needed</div>';
  } else {
    recs.forEach(function(r) {
      var sevColour = r.severity === 'red' ? '#f85149' : r.severity === 'amber' ? '#d29922' : '#58a6ff';
      var sevBg = r.severity === 'red' ? 'rgba(248,81,73,.1)' : r.severity === 'amber' ? 'rgba(210,153,34,.1)' : 'rgba(88,166,255,.1)';
      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:' + sevBg + ';color:' + sevColour + ';font-size:.6rem;font-weight:700;">' + esc(r.category.charAt(0).toUpperCase()) + '</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(r.title) + '</div>';
      html += '<div class="cc-row-m">' + esc(r.detail || '') + '</div>';
      html += '</div>';
      html += '<div class="cc-row-a"><button class="cc-btn pu" style="font-size:.6rem;">' + esc(r.action || 'View') + '</button></div>';
      html += '</div>';
    });
  }
  html += '</div>';

  // History chart (30 days)
  html += '<div class="cc-card"><h3><span>&#128200; 30-Day Trend</span> <span class="ct">Four Cs scores</span></h3>';
  var hist = a.history || [];
  if (hist.length < 2) {
    html += '<div style="padding:8px 0;color:#8b949e;font-size:0.85rem">Not enough history yet &mdash; scores are recorded daily.</div>';
  } else {
    // Simple bar chart showing total score per day
    var maxTotal = 40;
    html += '<div style="display:flex;align-items:flex-end;gap:2px;height:80px;">';
    hist.forEach(function(h) {
      var fc2 = h.four_cs || {};
      var total = (fc2.context ? fc2.context.score : 0) + (fc2.connections ? fc2.connections.score : 0) + (fc2.capabilities ? fc2.capabilities.score : 0) + (fc2.cadence ? fc2.cadence.score : 0);
      var barH = Math.max(4, Math.round((total / maxTotal) * 75));
      var colour = total >= 28 ? '#3fb950' : total >= 18 ? '#d29922' : '#f85149';
      html += '<div style="flex:1;background:' + colour + ';height:' + barH + 'px;border-radius:2px 2px 0 0;opacity:0.7;" title="' + esc(h.date) + ': ' + total + '/40"></div>';
    });
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:0.55rem;color:#484f58;margin-top:4px;"><span>30d ago</span><span>today</span></div>';
  }

  // Last updated
  if (a.last_updated) {
    html += '<div style="margin-top:10px;font-size:0.62rem;color:#484f58;text-align:right;">Last snapshot: ' + new Date(a.last_updated).toLocaleString('en-GB') + '</div>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/command-centre.js dashboard-server/tests/unit/command-centre.test.mjs nbi_project_dashboard.html
git commit -m "feat(cc): AIOS detail endpoint + tab (F5) — Four Cs deep view, recommendations, 30-day history"
```

---

## Task 4: Project Health + Client Signals (F6 + F8)

Extend the Work tab with per-client project health (milestones, SOW status) and client health signals (touchpoint recency, risk score). Data comes from a new `/api/command-centre/project-health` endpoint.

**Files:**
- Modify: `dashboard-server/routes/command-centre.js` — add endpoint
- Modify: `dashboard-server/tests/unit/command-centre.test.mjs` — add tests
- Modify: `nbi_project_dashboard.html` — add section to `_ccRenderWorkTab`

### Steps

- [ ] **Step 1: Write failing tests**

```js
describe('Command Centre — Project-health endpoint', () => {
  function makeHealthMockPool(overrides = {}) {
    return {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes('milestones') && sql.includes('target_date')) {
          return { rows: overrides.milestones || [] };
        }
        if (sql.includes('sows') && sql.includes('end_date')) {
          return { rows: overrides.sows || [] };
        }
        if (sql.includes('MAX') && sql.includes('updated_at') && sql.includes('client_id')) {
          return { rows: overrides.health || [] };
        }
        return { rows: [] };
      }),
    };
  }

  it('GET /api/command-centre/project-health returns correct shape', async () => {
    const pool = makeHealthMockPool();
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/project-health');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('client_health');
    expect(res.body.data).toHaveProperty('milestones');
    expect(res.body.data).toHaveProperty('sow_status');
    expect(res.body.error).toBeNull();
  });

  it('returns client health with risk indicators', async () => {
    const pool = makeHealthMockPool({
      health: [{
        client_id: 'c1', client_name: 'Acme', total: '20', done: '10', overdue: '3',
        blocked: '1', last_activity: '2026-05-10T00:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/project-health');
    const clients = res.body.data.client_health;
    expect(clients).toHaveLength(1);
    expect(clients[0].client_name).toBe('Acme');
    expect(clients[0]).toHaveProperty('risk');
  });

  it('returns upcoming milestones', async () => {
    const pool = makeHealthMockPool({
      milestones: [{
        id: 'm1', title: 'Beta launch', client_name: 'Acme',
        target_date: '2026-06-01', total_items: '5', done_items: '2',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/project-health');
    expect(res.body.data.milestones).toHaveLength(1);
    expect(res.body.data.milestones[0].title).toBe('Beta launch');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: FAIL — 404.

- [ ] **Step 3: Implement the project-health endpoint**

Add to `command-centre.js`:

```js
  /** GET /api/command-centre/project-health — per-client health, milestones, SOW status (F6+F8) */
  router.get('/api/command-centre/project-health', requireNBI, async (req, res) => {
    try {
      // Per-client health composite
      const healthQ = await pool.query(`
        SELECT
          c.id as client_id, c.name as client_name,
          COUNT(t.id)::int as total,
          COUNT(t.id) FILTER (WHERE t.status = 'Done')::int as done,
          COUNT(t.id) FILTER (WHERE t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < CURRENT_DATE AND t.status NOT IN ('Done','Cancelled'))::int as overdue,
          COUNT(t.id) FILTER (WHERE t.status = 'Blocked')::int as blocked,
          MAX(t.updated_at) as last_activity
        FROM clients c
        LEFT JOIN tasks t ON t.client_id = c.id AND t.item_type IN ('story','task') AND t.status != 'Cancelled'
        GROUP BY c.id, c.name
        HAVING COUNT(t.id) > 0
        ORDER BY c.name
      `);

      // Upcoming milestones (next 90 days)
      const milestonesQ = await pool.query(`
        SELECT
          m.id, m.title, m.target_date, c.name as client_name,
          COUNT(mi.task_id)::int as total_items,
          COUNT(mi.task_id) FILTER (WHERE t.status = 'Done')::int as done_items
        FROM milestones m
        JOIN clients c ON m.client_id = c.id
        LEFT JOIN milestone_items mi ON mi.milestone_id = m.id
        LEFT JOIN tasks t ON t.id = mi.task_id
        WHERE m.target_date >= CURRENT_DATE
          AND m.target_date <= CURRENT_DATE + 90
        GROUP BY m.id, m.title, m.target_date, c.name
        ORDER BY m.target_date
      `);

      // SOW status
      const sowsQ = await pool.query(`
        SELECT s.id, s.title, s.start_date, s.end_date, s.status, c.name as client_name
        FROM sows s
        JOIN clients c ON s.client_id = c.id
        WHERE s.status = 'active'
        ORDER BY s.end_date
      `);

      // Compute risk per client
      const clientHealth = healthQ.rows.map(r => {
        const total = r.total || 1;
        const overduePct = r.overdue / total;
        const blockedPct = r.blocked / total;
        const daysSinceActivity = r.last_activity ? daysSince(r.last_activity) : 999;
        let risk = 'green';
        if (overduePct > 0.3 || blockedPct > 0.2 || daysSinceActivity > 14) risk = 'red';
        else if (overduePct > 0.15 || blockedPct > 0.1 || daysSinceActivity > 7) risk = 'amber';
        return {
          client_id: r.client_id,
          client_name: r.client_name,
          total: r.total,
          done: r.done,
          overdue: r.overdue,
          blocked: r.blocked,
          pct_complete: total > 0 ? Math.round((r.done / total) * 100) : 0,
          days_since_activity: daysSinceActivity,
          risk,
        };
      });

      // Flag SOWs expiring within 60 days
      const sowStatus = sowsQ.rows.map(s => ({
        ...s,
        days_remaining: s.end_date ? Math.ceil((new Date(s.end_date) - Date.now()) / 86400000) : null,
        expiring_soon: s.end_date ? (new Date(s.end_date) - Date.now()) / 86400000 <= 60 : false,
      }));

      res.json({
        data: {
          client_health: clientHealth,
          milestones: milestonesQ.rows,
          sow_status: sowStatus,
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'project-health failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: All PASS.

- [ ] **Step 5: Wire up frontend data + render Work tab section**

First, add `_ccProjectHealth` to the state variables (at the top of the CC JS section, alongside the other state vars added in Task 1):

```js
let _ccProjectHealth = null;
```

Add to `_ccFetchAll`, inside the `Promise.allSettled` array (after the handoffs call):

```js
apiCall('/api/command-centre/project-health')
```

And add the corresponding result extraction (after the handoffs extraction):

```js
    if (healthRes.status === 'fulfilled' && healthRes.value) {
      _ccProjectHealth = healthRes.value.data || healthRes.value;
    }
```

Update the `Promise.allSettled` destructure to include `healthRes`:
```js
const [briefRes, workRes, snapRes, pipeRes, aiosRes, teamRes, handoffRes, healthRes] = await Promise.allSettled([
```

Then, in `_ccRenderWorkTab`, after the existing Row 2 (client bars + velocity/bugs) and before Row 3 (calendar), insert a new section:

```js
  // === Project Health Section (F6+F8) ===
  var ph = _ccProjectHealth || {};
  var ch = ph.client_health || [];
  var miles = ph.milestones || [];
  var sows = ph.sow_status || [];

  if (ch.length > 0 || miles.length > 0) {
    html += '<div class="cc-grid-2" style="margin-bottom:14px;">';

    // Client health signals
    html += '<div class="cc-card"><h3><span>Client Health</span> <span class="ct">' + ch.length + ' clients</span></h3>';
    ch.forEach(function(c) {
      var riskColour = c.risk === 'red' ? '#f85149' : c.risk === 'amber' ? '#d29922' : '#3fb950';
      var riskBg = c.risk === 'red' ? 'rgba(248,81,73,.1)' : c.risk === 'amber' ? 'rgba(210,153,34,.1)' : 'rgba(63,185,80,.1)';
      html += '<div class="cc-row" onclick="switchView(\'projects\')">';
      html += '<div class="cc-row-icon" style="background:' + riskBg + ';color:' + riskColour + ';font-weight:700;font-size:.55rem;">' + c.pct_complete + '%</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(c.client_name) + '</div>';
      html += '<div class="cc-row-m">';
      if (c.overdue > 0) html += '<span class="cc-tag r">' + c.overdue + ' overdue</span> ';
      if (c.blocked > 0) html += '<span class="cc-tag a">' + c.blocked + ' blocked</span> ';
      html += '<span style="color:#8b949e;">' + c.done + '/' + c.total + ' done</span>';
      html += '</div></div>';
      html += '<div class="cc-row-a" style="font-size:.62rem;color:' + riskColour + ';">' + (c.days_since_activity < 999 ? c.days_since_activity + 'd ago' : 'no activity') + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // Milestones + SOW status
    html += '<div class="cc-card"><h3><span>Milestones &amp; Contracts</span></h3>';
    if (miles.length > 0) {
      html += '<div class="cc-section-hdr">Upcoming Milestones <span class="ct">' + miles.length + '</span></div>';
      miles.slice(0, 5).forEach(function(m) {
        var daysUntil = Math.ceil((new Date(m.target_date) - Date.now()) / 86400000);
        var daysColour = daysUntil <= 7 ? '#f85149' : daysUntil <= 30 ? '#d29922' : '#8b949e';
        var pctDone = m.total_items > 0 ? Math.round((m.done_items / m.total_items) * 100) : 0;
        html += '<div class="cc-row">';
        html += '<div class="cc-row-icon" style="background:rgba(88,166,255,.1);color:#58a6ff;font-size:.55rem;">' + pctDone + '%</div>';
        html += '<div class="cc-row-b">';
        html += '<div class="cc-row-t">' + esc(m.title) + '</div>';
        html += '<div class="cc-row-m">' + esc(m.client_name) + ' &middot; <span style="color:' + daysColour + ';">' + daysUntil + 'd</span> &middot; ' + (m.done_items || 0) + '/' + (m.total_items || 0) + ' items</div>';
        html += '</div></div>';
      });
    }
    if (sows.length > 0) {
      html += '<div class="cc-section-hdr">Active Contracts <span class="ct">' + sows.length + '</span></div>';
      sows.forEach(function(s) {
        var expColour = s.expiring_soon ? '#f85149' : '#8b949e';
        var daysLeft = s.days_remaining !== null ? s.days_remaining + 'd left' : 'no end date';
        html += '<div class="cc-row">';
        html += '<div class="cc-row-b">';
        html += '<div class="cc-row-t">' + esc(s.title || 'Untitled SOW') + '</div>';
        html += '<div class="cc-row-m">' + esc(s.client_name) + ' &middot; <span style="color:' + expColour + ';">' + daysLeft + '</span></div>';
        html += '</div>';
        if (s.expiring_soon) html += '<span class="cc-tag r">expiring</span>';
        html += '</div>';
      });
    }
    if (miles.length === 0 && sows.length === 0) {
      html += '<div style="padding:8px 0;color:#8b949e;font-size:0.85rem">No milestones or active contracts</div>';
    }
    html += '</div>';

    html += '</div>';
  }
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/command-centre.js dashboard-server/tests/unit/command-centre.test.mjs nbi_project_dashboard.html
git commit -m "feat(cc): project health + client signals (F6+F8) — milestones, SOW status, risk scores"
```

---

## Task 5: Team Workload (F9)

New `/api/command-centre/team-workload` endpoint showing per-assignee task distribution, time logged this week, capacity alerts, and single-point-of-failure detection.

**Files:**
- Modify: `dashboard-server/routes/command-centre.js` — add endpoint
- Modify: `dashboard-server/tests/unit/command-centre.test.mjs` — add tests
- Modify: `nbi_project_dashboard.html` — add section to `_ccRenderWorkTab`

### Steps

- [ ] **Step 1: Write failing tests**

```js
describe('Command Centre — Team-workload endpoint', () => {
  function makeTeamMockPool(overrides = {}) {
    return {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes('assignee') && sql.includes('GROUP BY') && sql.includes('client_name')) {
          return { rows: overrides.workload || [] };
        }
        if (sql.includes('time_entries') && sql.includes('SUM')) {
          return { rows: overrides.time || [] };
        }
        if (sql.includes('assignee') && sql.includes('80')) {
          return { rows: overrides.spof || [] };
        }
        return { rows: [] };
      }),
    };
  }

  it('GET /api/command-centre/team-workload returns correct shape', async () => {
    const pool = makeTeamMockPool();
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/team-workload');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('assignees');
    expect(res.body.data).toHaveProperty('time_logged');
    expect(res.body.data).toHaveProperty('alerts');
    expect(res.body.error).toBeNull();
  });

  it('returns assignee workload grouped by client', async () => {
    const pool = makeTeamMockPool({
      workload: [
        { assignee: 'Glen', client_name: 'NBI', active_count: '5' },
        { assignee: 'Glen', client_name: 'CH', active_count: '3' },
        { assignee: 'Claude', client_name: 'NBI', active_count: '12' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/team-workload');
    const assignees = res.body.data.assignees;
    expect(assignees.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: FAIL — 404.

- [ ] **Step 3: Implement the team-workload endpoint**

Add to `command-centre.js`:

```js
  /** GET /api/command-centre/team-workload — assignee distribution, time, capacity (F9) */
  router.get('/api/command-centre/team-workload', requireNBI, async (req, res) => {
    try {
      // Per-assignee active tasks grouped by client
      const workloadQ = await pool.query(`
        SELECT
          t.assignee, c.name as client_name,
          COUNT(*)::int as active_count
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.assignee IS NOT NULL AND t.assignee != ''
          AND t.status NOT IN ('Done', 'Cancelled')
          AND t.item_type IN ('story', 'task')
        GROUP BY t.assignee, c.name
        ORDER BY t.assignee, active_count DESC
      `);

      // Time logged this week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const timeQ = await pool.query(`
        SELECT user_name, SUM(hours)::numeric(10,1) as total_hours
        FROM time_entries
        WHERE date >= $1
        GROUP BY user_name
        ORDER BY total_hours DESC
      `, [weekStartStr]);

      // SPOF detection: any client where >80% active tasks go to one person
      const spofQ = await pool.query(`
        WITH client_totals AS (
          SELECT client_id, COUNT(*)::int as total
          FROM tasks
          WHERE status NOT IN ('Done','Cancelled') AND item_type IN ('story','task')
            AND assignee IS NOT NULL AND assignee != ''
          GROUP BY client_id
        ),
        assignee_counts AS (
          SELECT client_id, assignee, COUNT(*)::int as cnt
          FROM tasks
          WHERE status NOT IN ('Done','Cancelled') AND item_type IN ('story','task')
            AND assignee IS NOT NULL AND assignee != ''
          GROUP BY client_id, assignee
        )
        SELECT
          ac.assignee, c.name as client_name,
          ac.cnt as assignee_count, ct.total as client_total,
          ROUND(ac.cnt::numeric / ct.total * 100)::int as pct
        FROM assignee_counts ac
        JOIN client_totals ct ON ct.client_id = ac.client_id
        JOIN clients c ON c.id = ac.client_id
        WHERE ct.total >= 3 AND ac.cnt::numeric / ct.total > 0.8
        ORDER BY pct DESC
      `);

      // Group workload by assignee
      const assigneeMap = {};
      workloadQ.rows.forEach(r => {
        if (!assigneeMap[r.assignee]) assigneeMap[r.assignee] = { name: r.assignee, total: 0, clients: [] };
        assigneeMap[r.assignee].total += r.active_count;
        assigneeMap[r.assignee].clients.push({ client: r.client_name || 'Unassigned', count: r.active_count });
      });
      const assignees = Object.values(assigneeMap).sort((a, b) => b.total - a.total);

      // Capacity alerts
      const alerts = [];
      assignees.forEach(a => {
        if (a.total > 15) alerts.push({ type: 'overloaded', name: a.name, count: a.total });
        else if (a.total === 0) alerts.push({ type: 'idle', name: a.name, count: 0 });
      });

      res.json({
        data: {
          assignees,
          time_logged: timeQ.rows.map(r => ({ user_name: r.user_name, hours: parseFloat(r.total_hours) })),
          spof: spofQ.rows,
          alerts,
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'team-workload failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: All PASS.

- [ ] **Step 5: Implement Work tab section**

In `_ccRenderWorkTab`, after the project health section (Task 4) and before Row 3 (calendar), add:

```js
  // === Team Workload Section (F9) ===
  var tw = _ccTeamWorkload || {};
  var assignees = tw.assignees || [];
  var timeLogs = tw.time_logged || [];
  var spofs = tw.spof || [];
  var alerts = tw.alerts || [];

  if (assignees.length > 0) {
    html += '<div class="cc-grid-2" style="margin-bottom:14px;">';

    // Assignee workload bars
    html += '<div class="cc-card"><h3><span>Team Workload</span> <span class="ct">' + assignees.length + ' people</span></h3>';
    var maxTasks = Math.max.apply(null, assignees.map(function(a) { return a.total; }).concat([1]));
    assignees.forEach(function(a) {
      var pct = Math.max(8, Math.round((a.total / maxTasks) * 100));
      var loadColour = a.total > 15 ? '#f85149' : a.total > 10 ? '#d29922' : '#3fb950';
      html += '<div style="margin-bottom:8px;">';
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
      html += '<span style="font-size:0.8rem;">' + esc(a.name) + '</span>';
      html += '<span style="font-size:0.68rem;color:' + loadColour + ';">' + a.total + ' active</span>';
      html += '</div>';
      html += '<div style="background:#21262d;border-radius:4px;height:10px;overflow:hidden;">';
      // Stacked segments per client
      var segs = a.clients || [];
      var clientColours = ['#238636', '#1f6feb', '#8b5cf6', '#f59e0b', '#f85149', '#06b6d4'];
      html += '<div style="display:flex;height:100%;">';
      segs.forEach(function(seg, j) {
        html += '<div style="background:' + clientColours[j % clientColours.length] + ';flex:' + seg.count + ';" title="' + esc(seg.client) + ': ' + seg.count + '"></div>';
      });
      html += '</div></div></div>';
    });
    html += '</div>';

    // Time logged + alerts
    html += '<div class="cc-card"><h3><span>Time &amp; Alerts</span></h3>';
    if (timeLogs.length > 0) {
      html += '<div class="cc-section-hdr">Hours This Week</div>';
      timeLogs.forEach(function(t) {
        html += '<div class="cc-row">';
        html += '<div class="cc-row-b">';
        html += '<div class="cc-row-t">' + esc(t.user_name) + '</div>';
        html += '</div>';
        html += '<div style="font-size:0.82rem;font-weight:600;color:#58a6ff;">' + t.hours + 'h</div>';
        html += '</div>';
      });
    }
    if (alerts.length > 0) {
      html += '<div class="cc-section-hdr">Capacity Alerts</div>';
      alerts.forEach(function(al) {
        var alColour = al.type === 'overloaded' ? '#f85149' : '#d29922';
        html += '<div class="cc-row">';
        html += '<div class="cc-row-icon" style="background:rgba(248,81,73,.1);color:' + alColour + ';font-size:.55rem;font-weight:700;">!</div>';
        html += '<div class="cc-row-b">';
        html += '<div class="cc-row-t">' + esc(al.name) + ' &mdash; ' + esc(al.type) + '</div>';
        html += '<div class="cc-row-m">' + al.count + ' active tasks</div>';
        html += '</div></div>';
      });
    }
    if (spofs.length > 0) {
      html += '<div class="cc-section-hdr" style="color:#f85149;">Single Points of Failure</div>';
      spofs.forEach(function(sp) {
        html += '<div class="cc-row">';
        html += '<div class="cc-row-icon" style="background:rgba(248,81,73,.15);color:#f85149;font-size:.55rem;font-weight:700;">!!</div>';
        html += '<div class="cc-row-b">';
        html += '<div class="cc-row-t">' + esc(sp.assignee) + ' owns ' + sp.pct + '% of ' + esc(sp.client_name) + '</div>';
        html += '<div class="cc-row-m">' + sp.assignee_count + '/' + sp.client_total + ' active tasks</div>';
        html += '</div></div>';
      });
    }
    html += '</div>';

    html += '</div>';
  }
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/command-centre.js dashboard-server/tests/unit/command-centre.test.mjs nbi_project_dashboard.html
git commit -m "feat(cc): team workload endpoint + section (F9) — assignee bars, time, capacity alerts, SPOF"
```

---

## Task 6: Handoff Hub (F12)

New `/api/command-centre/handoffs` endpoint scanning `projects/*/session_handoffs/` directories for markdown files, parsing headers to extract structured summaries. Work tab section.

**Files:**
- Modify: `dashboard-server/routes/command-centre.js` — add endpoint
- Modify: `dashboard-server/tests/unit/command-centre.test.mjs` — add tests
- Modify: `nbi_project_dashboard.html` — add section to `_ccRenderWorkTab`

### Steps

- [ ] **Step 1: Write failing tests**

```js
describe('Command Centre — Handoffs endpoint', () => {
  it('GET /api/command-centre/handoffs returns correct shape', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/command-centre/handoffs');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('projects');
    expect(Array.isArray(res.body.data.projects)).toBe(true);
    expect(res.body.error).toBeNull();
  });

  it('returns project entries with handoff metadata', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/command-centre/handoffs');
    // The test repo has projects/nbi_dashboard/session_handoffs/ with real files
    const projects = res.body.data.projects;
    if (projects.length > 0) {
      const p = projects[0];
      expect(p).toHaveProperty('project');
      expect(p).toHaveProperty('latest_handoff');
      expect(p.latest_handoff).toHaveProperty('filename');
      expect(p.latest_handoff).toHaveProperty('title');
      expect(p.latest_handoff).toHaveProperty('date');
    }
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: FAIL — 404.

- [ ] **Step 3: Implement the handoffs endpoint**

Add to `command-centre.js`:

```js
  /** GET /api/command-centre/handoffs — file system scan for session handoffs (F12) */
  router.get('/api/command-centre/handoffs', requireNBI, (req, res) => {
    try {
      const projectsDir = path.join(REPO_ROOT, 'projects');
      const projects = [];

      if (!fs.existsSync(projectsDir)) {
        return res.json({ data: { projects: [] }, error: null });
      }

      const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

      projectDirs.forEach(pd => {
        const handoffsDir = path.join(projectsDir, pd.name, 'session_handoffs');
        if (!fs.existsSync(handoffsDir)) return;

        const handoffFiles = fs.readdirSync(handoffsDir)
          .filter(f => f.endsWith('.md'))
          .sort()
          .reverse();

        if (handoffFiles.length === 0) return;

        const latestFile = handoffFiles[0];
        const latestPath = path.join(handoffsDir, latestFile);
        const stat = safeStat(latestPath);
        const content = safeReadFile(latestPath) || '';

        // Parse title from first H1
        const titleMatch = content.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : latestFile.replace('.md', '');

        // Extract "What's Next" section
        let whatsNext = '';
        const nextMatch = content.match(/##\s+(?:What.*?Next|Next Session|What the Next).+?\n([\s\S]*?)(?=\n##\s|$)/i);
        if (nextMatch) {
          whatsNext = nextMatch[1].trim().split('\n').slice(0, 5).join('\n');
        }

        // Extract branch name if mentioned
        const branchMatch = content.match(/(?:branch|Branch)[:\s]+`?([^\s`\n]+)`?/i);
        const branch = branchMatch ? branchMatch[1] : null;

        // Extract date from filename (handoff_YYYY-MM-DD_...)
        const dateMatch = latestFile.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : (stat ? stat.mtime.toISOString().slice(0, 10) : null);

        projects.push({
          project: pd.name,
          handoff_count: handoffFiles.length,
          latest_handoff: {
            filename: latestFile,
            title,
            date,
            branch,
            whats_next: whatsNext,
            path: 'projects/' + pd.name + '/session_handoffs/' + latestFile,
          },
        });
      });

      // Sort by most recent handoff first
      projects.sort((a, b) => {
        const aDate = a.latest_handoff.date || '';
        const bDate = b.latest_handoff.date || '';
        return bDate.localeCompare(aDate);
      });

      res.json({ data: { projects }, error: null });
    } catch (e) {
      log('error', 'CC', 'handoffs scan failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: All PASS.

- [ ] **Step 5: Implement Handoff Hub section in Work tab**

In `_ccRenderWorkTab`, after the team workload section and before Row 3 (calendar), add:

```js
  // === Handoff Hub (F12) ===
  var hf = _ccHandoffs || {};
  var handoffProjects = hf.projects || [];

  if (handoffProjects.length > 0) {
    html += '<div class="cc-card" style="margin-bottom:14px;"><h3><span>&#128221; Handoff Hub</span> <span class="ct">' + handoffProjects.length + ' projects</span></h3>';
    handoffProjects.forEach(function(p) {
      var h = p.latest_handoff || {};
      var age = h.date ? Math.floor((Date.now() - new Date(h.date).getTime()) / 86400000) : 999;
      var ageColour = age <= 1 ? '#3fb950' : age <= 3 ? '#d29922' : '#8b949e';
      var ageLabel = age === 0 ? 'today' : age === 1 ? 'yesterday' : age + 'd ago';

      html += '<div class="cc-row">';
      html += '<div class="cc-row-icon" style="background:rgba(163,113,247,.1);color:#a371f7;font-size:.55rem;">&#128196;</div>';
      html += '<div class="cc-row-b">';
      html += '<div class="cc-row-t">' + esc(p.project.replace(/_/g, ' ')) + '</div>';
      html += '<div class="cc-row-m">';
      html += '<span style="color:' + ageColour + ';">' + esc(ageLabel) + '</span>';
      if (h.branch) html += ' &middot; <span style="font-family:monospace;font-size:.62rem;color:#8b949e;">' + esc(h.branch) + '</span>';
      html += ' &middot; ' + p.handoff_count + ' handoff' + (p.handoff_count > 1 ? 's' : '');
      html += '</div>';
      if (h.whats_next) {
        html += '<div style="font-size:0.72rem;color:#8b949e;margin-top:4px;max-height:3em;overflow:hidden;">' + esc(h.whats_next.split('\\n')[0]) + '</div>';
      }
      html += '</div>';
      html += '<div class="cc-row-a"><button class="cc-btn pu" style="font-size:.6rem;">Resume</button></div>';
      html += '</div>';
    });
    html += '</div>';
  }
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/command-centre.js dashboard-server/tests/unit/command-centre.test.mjs nbi_project_dashboard.html
git commit -m "feat(cc): handoff hub endpoint + section (F12) — file scan, parsed summaries, resume buttons"
```

---

## Task 7: Final Integration + Full Test Run

Wire up any remaining data flows, ensure all new endpoints are in `_ccFetchAll`, verify the full test suite passes, and handle edge cases.

**Files:**
- Modify: `nbi_project_dashboard.html` — final polish
- No new backend changes

### Steps

- [ ] **Step 1: Verify `_ccFetchAll` has all 8 parallel fetches**

The final `_ccFetchAll` should have these in the `Promise.allSettled` array:
1. `/api/command-centre/briefing`
2. `/api/command-centre/client-work`
3. `/api/command-centre/snapshot`
4. `/api/command-centre/pipeline`
5. `/api/command-centre/aios-detail`
6. `/api/command-centre/team-workload`
7. `/api/command-centre/handoffs`
8. `/api/command-centre/project-health`

If any were missed during Tasks 2-6, add them now.

- [ ] **Step 2: Verify the Work tab Row 1 uses header stats (no duplication)**

The v1 Work tab has a full stats grid in Row 1 (6 stat cards in a 2-column grid). Since v2 moved the 4 key stats to the persistent header, Row 1 in the Work tab should now start with fires (full card) and keep only the 2 supplementary stats (TESTS, AIOS HEALTH). Update if needed.

Alternatively, keep all 6 stats in Row 1 as a secondary detail view — the persistent header shows at-a-glance numbers, the Work tab stats card shows more detail. This is the safer approach (no data loss).

- [ ] **Step 3: Run the full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests PASS (unit + any integration).

Run: `cd dashboard-server && npm run test:e2e` (if a server is running on port 8888)
Expected: All e2e tests PASS.

- [ ] **Step 4: Restart PM2 and verify live**

```
pm2 restart nbi-dashboard
```

Tell Glen: "CC v2 Phase 1 is live. Please check https://worksage.nbi-consulting.com — the Command Centre now has 5 tabs (Work, Pipeline, Money, AIOS, Comms). Work tab has client health, team workload, and handoff hub. Pipeline tab has the leads funnel and analytics. AIOS tab has the Four Cs deep view."

- [ ] **Step 5: Commit any polish changes**

```
git add nbi_project_dashboard.html
git commit -m "feat(cc): v2 Phase 1 complete — final polish and integration"
```

---

## Dependency Graph

```
Task 1 (Tabbed UX Shell + Data Wiring)
  │
  ├── Task 2 (Pipeline F1+F11) ─── sequential
  ├── Task 3 (AIOS F5)
  ├── Task 4 (Project Health F6+F8)
  ├── Task 5 (Team Workload F9)
  ├── Task 6 (Handoff Hub F12)
  │
  └── Task 7 (Integration + Polish) ─── after all above
```

Tasks 2-6 are sequential (they each modify the same files) but independent in scope. Each adds one endpoint + one UI section without touching the others.

---

## Verification Checklist

After all tasks complete:

- [ ] `npm test` — all unit tests pass
- [ ] `npm run test:e2e` — all e2e tests pass
- [ ] Command Centre loads at `/nbi_project_dashboard.html` with 5 tabs visible
- [ ] Work tab shows: fires, stats, client bars, velocity, bugs, client health, milestones, team workload, handoff hub
- [ ] Pipeline tab shows: funnel, stale leads, follow-ups, analytics, weekly trend
- [ ] AIOS tab shows: Four Cs detail cards, recommendations, 30-day history
- [ ] Money tab shows: Phase 2 placeholder
- [ ] Comms tab shows: Phase 3 placeholder
- [ ] Tab state persists across page reloads (localStorage)
- [ ] 30-second auto-refresh continues working
- [ ] No console errors in browser DevTools
- [ ] All text is readable (14px+ body, 16px+ data values)
