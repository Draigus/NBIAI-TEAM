# Meetings Intelligence CC Tab — Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Meetings" tab to the Command Centre displaying structured meeting intelligence (actions, decisions, people, learnings, numbers, timeline, threads) with filtering, search, and action status editing.

**Architecture:** Server reads `intelligence/compiled/meetings.json` (pre-compiled structured data), merges action status overrides from Postgres, exposes via REST API. Frontend fetches full dataset once on tab load, filters client-side for instant interaction. Status edits PATCH to server then re-merge.

**Tech Stack:** Express 4, PostgreSQL (via `pg`), vanilla JS frontend (SPA monolith pattern), Vitest (`.test.mjs`, ESM) for unit tests, Playwright for E2E.

**Spec:** `docs/superpowers/specs/2026-06-01-meetings-intelligence-cc-tab.md`

**Prerequisites:** `intelligence/compiled/meetings.json` and `intelligence/compiled/person_registry.json` must exist before execution. These are generated in the current session from the Granola consolidation data (142 meetings already extracted). The orchestrating session commits the seed files before dispatching Task 1.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/migrations/059_meeting_action_status.sql` | Create | DB table for status overrides |
| `intelligence/compiled/meetings.json` | Create (pre-task) | Seed data from consolidation |
| `intelligence/compiled/person_registry.json` | Create (pre-task) | Person name normalisation |
| `dashboard-server/lib/meetings-intelligence.js` | Create | File reader, cache, status merge |
| `dashboard-server/tests/unit/meetings-intelligence.test.mjs` | Create | Unit tests (ESM) |
| `dashboard-server/routes/meetings-intelligence.js` | Create | API endpoints |
| `dashboard-server/server.js` | Modify (~line 441) | Mount meetings routes |
| `nbi_project_dashboard.html` | Modify | CC tab + 7 renderers + filters + CSS |
| `dashboard-server/tests/e2e/meetings-tab.spec.js` | Create | Playwright E2E |

---

## Task 1: Database Migration

**Files:**
- Create: `dashboard-server/migrations/059_meeting_action_status.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 059_meeting_action_status.sql
CREATE TABLE IF NOT EXISTS meeting_action_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('open', 'done', 'overdue')),
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_action_status_action ON meeting_action_status(action_id);
```

- [ ] **Step 2: Run the migration**

Run: `cd dashboard-server && node init-db.js`
Expected: Migration 059 applies without error.

- [ ] **Step 3: Verify**

Run: `cd dashboard-server && node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='meeting_action_status'\").then(r=>{console.log(r.rows.map(x=>x.column_name));p.end()})"`
Expected: `['id','action_id','status','updated_by','updated_at']`

- [ ] **Step 4: Commit**

```
git add dashboard-server/migrations/059_meeting_action_status.sql
git commit -m "feat(meetings): add meeting_action_status table"
```

---

## Task 2: Server Library — meetings-intelligence.js

**Files:**
- Create: `dashboard-server/lib/meetings-intelligence.js`
- Create: `dashboard-server/tests/unit/meetings-intelligence.test.mjs`

The lib reads `meetings.json`, caches in memory, merges DB status overrides BEFORE returning data. Filtering happens on the already-merged dataset. The frontend receives the full merged dataset and filters client-side.

- [ ] **Step 1: Write the test file**

```js
// dashboard-server/tests/unit/meetings-intelligence.test.mjs
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);

const SAMPLE_DATA = {
  compiled_at: '2026-06-01T12:00:00Z',
  meeting_count: 3,
  date_range: { start: '2026-03-06', end: '2026-05-22' },
  sections: {
    actions: [
      { id: 'act_20260521_glen_narrative-jd', date: '2026-05-21', owner: 'Glen', owner_normalised: 'glen_pryer', description: 'Write Narrative Lead JD', workstream: 'couch_heroes', status: 'open' },
      { id: 'act_20260504_glen_strategy', date: '2026-05-04', owner: 'Glen', owner_normalised: 'glen_pryer', description: 'Q2 strategy review', workstream: 'nbi', status: 'done' },
      { id: 'act_20260318_aris_spreadsheet', date: '2026-03-18', owner: 'Aris', owner_normalised: 'aris_konstantinidis', description: 'Create accountability spreadsheet', workstream: 'couch_heroes', status: 'open' }
    ],
    decisions: [
      { id: 'dec_20260520_cosmetics-only', date: '2026-05-20', decision: 'Cosmetics-only monetisation', rationale: 'Foundational design pillar', workstream: 'couch_heroes' }
    ],
    people: [
      { id: 'per_vardis', name: 'Vardis', name_normalised: 'vardis', role: 'CEO', workstreams: ['couch_heroes'], notes: ['Receptive to feedback'], last_seen: '2026-05-22' }
    ],
    learnings: [
      { id: 'lrn_20260413_nia-audit', date: '2026-04-13', insight: 'External assessment validated audit', context: 'Pre-production confirmed', workstream: 'couch_heroes' }
    ],
    numbers: [
      { id: 'num_20260504_revenue', date: '2026-05-04', figure: '55K/month', context: 'Current NBI revenue', workstream: 'nbi', category: 'revenue' }
    ],
    timeline: [
      { period: 'March 6-18', label: 'Post-GDC', summary: 'Returned from GDC...' }
    ],
    threads: [
      { id: 'thr_cto-hire', title: 'CTO Hire', status: 'active', summary: 'Pipeline open...', workstream: 'couch_heroes' }
    ]
  }
};

const COMPILED_DIR = path.resolve(__dirname, '..', '..', 'intelligence', 'compiled');
const COMPILED_FILE = path.join(COMPILED_DIR, 'meetings.json');

describe('meetings-intelligence lib', () => {
  let mi;

  beforeEach(() => {
    vi.resetModules();
    fs.mkdirSync(COMPILED_DIR, { recursive: true });
    fs.writeFileSync(COMPILED_FILE, JSON.stringify(SAMPLE_DATA));
    mi = require('../../lib/meetings-intelligence');
    mi._clearCache();
  });

  it('loads compiled data from disk', () => {
    const data = mi.getCompiled();
    expect(data).toBeTruthy();
    expect(data.meeting_count).toBe(3);
    expect(data.sections.actions).toHaveLength(3);
  });

  it('returns null when file missing', () => {
    fs.unlinkSync(COMPILED_FILE);
    mi._clearCache();
    expect(mi.getCompiled()).toBeNull();
  });

  it('caches on second read', () => {
    mi.getCompiled();
    fs.unlinkSync(COMPILED_FILE);
    const data = mi.getCompiled();
    expect(data).toBeTruthy();
    expect(data.meeting_count).toBe(3);
  });

  it('_clearCache forces re-read from disk', () => {
    mi.getCompiled();
    fs.unlinkSync(COMPILED_FILE);
    mi._clearCache();
    expect(mi.getCompiled()).toBeNull();
  });

  it('mergeStatusOverrides patches action statuses from DB rows', () => {
    const data = mi.getCompiled();
    const overrides = [{ action_id: 'act_20260521_glen_narrative-jd', status: 'done' }];
    mi.applyOverrides(data, overrides);
    const patched = data.sections.actions.find(a => a.id === 'act_20260521_glen_narrative-jd');
    expect(patched.status).toBe('done');
  });

  it('getStats returns correct counts', () => {
    const stats = mi.getStats(mi.getCompiled());
    expect(stats.meeting_count).toBe(3);
    expect(stats.action_count).toBe(3);
    expect(stats.open_actions).toBe(2);
    expect(stats.decision_count).toBe(1);
    expect(stats.people_count).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/meetings-intelligence.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// dashboard-server/lib/meetings-intelligence.js
'use strict';

const fs = require('fs');
const path = require('path');

const COMPILED_PATH = path.resolve(__dirname, '../../intelligence/compiled/meetings.json');

let _cache = null;

function _load() {
  try {
    const raw = fs.readFileSync(COMPILED_PATH, 'utf8');
    _cache = JSON.parse(raw);
    return _cache;
  } catch {
    _cache = null;
    return null;
  }
}

function _clearCache() { _cache = null; }

function getCompiled() {
  if (!_cache) _load();
  if (!_cache) return null;
  return JSON.parse(JSON.stringify(_cache));
}

function applyOverrides(data, overrideRows) {
  if (!data || !data.sections || !data.sections.actions || !overrideRows) return;
  const map = new Map(overrideRows.map(r => [r.action_id, r.status]));
  data.sections.actions.forEach(a => {
    if (map.has(a.id)) a.status = map.get(a.id);
  });
}

function getStats(data) {
  if (!data || !data.sections) return { meeting_count: 0, action_count: 0, open_actions: 0, decision_count: 0, people_count: 0 };
  const s = data.sections;
  return {
    meeting_count: data.meeting_count,
    date_range: data.date_range,
    compiled_at: data.compiled_at,
    action_count: (s.actions || []).length,
    open_actions: (s.actions || []).filter(a => a.status === 'open').length,
    done_actions: (s.actions || []).filter(a => a.status === 'done').length,
    overdue_actions: (s.actions || []).filter(a => a.status === 'overdue').length,
    decision_count: (s.decisions || []).length,
    people_count: (s.people || []).length,
    learning_count: (s.learnings || []).length,
    number_count: (s.numbers || []).length,
    thread_count: (s.threads || []).length
  };
}

async function setActionStatus(pool, actionId, status, updatedBy) {
  await pool.query(
    `INSERT INTO meeting_action_status (action_id, status, updated_by, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (action_id) DO UPDATE SET status = $2, updated_by = $3, updated_at = now()`,
    [actionId, status, updatedBy]
  );
}

async function getOverrides(pool) {
  const { rows } = await pool.query('SELECT action_id, status FROM meeting_action_status');
  return rows;
}

module.exports = { getCompiled, applyOverrides, getStats, setActionStatus, getOverrides, _clearCache };
```

Key design: `getCompiled()` returns a deep copy. `applyOverrides()` mutates in place. The route calls `getCompiled()` → `getOverrides(pool)` → `applyOverrides(data, overrides)` → return. This ensures overrides are applied BEFORE the frontend receives data, so client-side filtering sees the correct statuses.

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/meetings-intelligence.test.mjs`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```
git add dashboard-server/lib/meetings-intelligence.js dashboard-server/tests/unit/meetings-intelligence.test.mjs
git commit -m "feat(meetings): add meetings-intelligence lib with caching and status merge"
```

---

## Task 3: Server Routes

**Files:**
- Create: `dashboard-server/routes/meetings-intelligence.js`
- Modify: `dashboard-server/server.js` (~line 441)

- [ ] **Step 1: Write the routes**

```js
// dashboard-server/routes/meetings-intelligence.js
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { requireNBI, pool } = ctx;
  const mi = require('../lib/meetings-intelligence');

  const VALID_STATUSES = ['open', 'done', 'overdue'];

  router.get('/api/meetings/compiled', requireNBI, async (req, res) => {
    try {
      const data = mi.getCompiled();
      if (!data) return res.json({ sections: { actions: [], decisions: [], people: [], learnings: [], numbers: [], timeline: [], threads: [] }, meeting_count: 0 });
      const overrides = await mi.getOverrides(pool);
      mi.applyOverrides(data, overrides);
      res.json(data);
    } catch (err) {
      console.error('meetings compiled error:', err);
      res.status(500).json({ error: 'Failed to load meetings data' });
    }
  });

  router.get('/api/meetings/stats', requireNBI, async (req, res) => {
    try {
      const data = mi.getCompiled();
      if (!data) return res.json({ meeting_count: 0, action_count: 0, open_actions: 0, decision_count: 0, people_count: 0 });
      const overrides = await mi.getOverrides(pool);
      mi.applyOverrides(data, overrides);
      res.json(mi.getStats(data));
    } catch (err) {
      res.status(500).json({ error: 'Failed to load stats' });
    }
  });

  router.patch('/api/meetings/actions/:id', requireNBI, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: open, done, overdue' });
    }
    try {
      const user = req.user ? req.user.displayName || req.user.username : 'unknown';
      await mi.setActionStatus(pool, id, status, user);
      res.json({ ok: true, action_id: id, status });
    } catch (err) {
      console.error('meetings status update error:', err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  router.post('/api/meetings/refresh', requireNBI, (req, res) => {
    mi._clearCache();
    res.json({ ok: true, message: 'Cache cleared.' });
  });

  return router;
};
```

- [ ] **Step 2: Mount in server.js**

After `app.use(require('./routes/intelligence')({ requireNBI }));` (~line 441), add:

```js
app.use(require('./routes/meetings-intelligence')({ requireNBI, pool }));
```

- [ ] **Step 3: Verify endpoints**

Run: `pm2 restart nbi-dashboard && sleep 3`
Then: `curl -s http://localhost:8888/api/meetings/stats | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)))"`
Expected: JSON with `meeting_count`, `action_count`, etc. (or 401 if auth required — that's fine, means route is mounted).

- [ ] **Step 4: Commit**

```
git add dashboard-server/routes/meetings-intelligence.js dashboard-server/server.js
git commit -m "feat(meetings): add meetings API routes and mount in server"
```

---

## Task 4: Frontend — CSS (before renderers so styling is visible immediately)

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add Meetings tab CSS**

Find the CC intel styles (search for `.cc-intel`) and add after them:

```css
/* ——— Meetings Intelligence Tab ——— */
.cc-meetings-stats { display:flex; gap:12px; align-items:center; flex-wrap:wrap; padding:12px 0; border-bottom:1px solid var(--border-default); margin-bottom:12px; }
.cc-meetings-refresh { margin-left:auto; display:flex; align-items:center; gap:8px; }
.cc-meetings-compiled { font-size:0.75rem; color:var(--text-secondary); }
.cc-meetings-subtabs { display:flex; gap:2px; margin-bottom:12px; background:var(--bg-surface); border-radius:6px; padding:3px; }
.cc-meetings-subtab { padding:6px 14px; border-radius:4px; font-size:0.82rem; cursor:pointer; color:var(--text-secondary); transition:all .15s; }
.cc-meetings-subtab:hover { color:var(--text-primary); background:rgba(255,255,255,0.04); }
.cc-meetings-subtab.on { background:var(--accent); color:#fff; font-weight:600; }
.cc-meetings-filters { display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
.cc-meetings-filters select, .cc-meetings-search { background:var(--bg-surface); color:var(--text-primary); border:1px solid var(--border-default); border-radius:4px; padding:5px 10px; font-size:0.82rem; }
.cc-meetings-search { flex:1; min-width:150px; max-width:300px; }
.cc-meetings-people-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:10px; }
.cc-meetings-person ul li { margin-bottom:3px; }
.cc-meetings-insight { background:var(--purple-bg); border-left:3px solid var(--purple); padding:10px 14px; margin-bottom:8px; border-radius:0 6px 6px 0; }
.cc-meetings-timeline { padding-left:20px; }
.cc-meetings-tl-item { border-left:2px solid var(--border-default); padding:8px 0 8px 18px; position:relative; }
.cc-meetings-tl-dot { position:absolute; left:-5px; top:14px; width:8px; height:8px; border-radius:50%; background:var(--accent); }
.cc-meetings-tl-date { font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; }
.cc-meetings-threads-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(400px,1fr)); gap:10px; }
@media(max-width:800px) { .cc-meetings-people-grid,.cc-meetings-threads-grid { grid-template-columns:1fr; } .cc-meetings-filters { flex-direction:column; } .cc-meetings-search { max-width:100%; } }
```

Uses actual theme variables: `--border-default`, `--text-secondary`, `--text-primary`, `--bg-surface`, `--accent`, `--purple`, `--purple-bg`. All verified to exist in the SPA's CSS custom properties across all 5 themes.

- [ ] **Step 2: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(meetings): add CSS for Meetings tab"
```

---

## Task 5: Frontend — Tab Registration + Data Loading

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add 'meetings' to valid tabs**

At line 22757, change:
```js
const _ccValidTabs = ['work', 'pipeline', 'money', 'aios', 'comms'];
```
to:
```js
const _ccValidTabs = ['work', 'pipeline', 'money', 'aios', 'comms', 'meetings'];
```

- [ ] **Step 2: Add tab to tab bar**

At line 22927, in the `tabs` array inside `_ccRenderPage`, add after the `intel` entry:
```js
{ id: 'meetings', label: 'Meetings' }
```

- [ ] **Step 3: Add render branch**

At line 22947, after `else if (_ccTab === 'intel') html += _ccRenderIntelTab();`, add:
```js
else if (_ccTab === 'meetings') html += _ccRenderMeetingsTab();
```

- [ ] **Step 4: Write data loading — fetches full dataset once, filters client-side**

Add after `_ccRenderIntelTab()` (after ~line 23624):

```js
// ——— MEETINGS INTELLIGENCE TAB ———
var _mtgData = null;
var _mtgSubTab = 'actions';
var _mtgFilters = JSON.parse(localStorage.getItem('ccMtgFilters') || '{}');

function _ccRenderMeetingsTab() {
  var html = '<div class="cc-meetings" id="ccMeetingsRoot"><div class="cc-panel-empty">Loading meetings intelligence...</div></div>';
  setTimeout(function() { _mtgFetchAll(); }, 0);
  return html;
}

function _mtgFetchAll() {
  var el = document.getElementById('ccMeetingsRoot');
  if (!el) return;
  authFetch('/api/meetings/compiled').then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
    _mtgData = data;
    if (!_mtgData || !_mtgData.sections) {
      el.innerHTML = '<div class="cc-panel-empty">No meetings data compiled yet.<br><span style="font-size:0.78rem;color:var(--text-secondary)">Run <code>/compile-meetings</code> in Claude Code to get started.</span></div>';
      return;
    }
    _mtgRender();
  }).catch(function() {
    el.innerHTML = '<div class="cc-panel-empty">Failed to load meetings data.</div>';
  });
}

function _mtgRender() {
  var el = document.getElementById('ccMeetingsRoot');
  if (!el || !_mtgData) return;
  el.innerHTML = _mtgRenderFull();
}
```

Client-side filtering: `_mtgFetchAll` loads the full merged dataset once. `_mtgRender` re-renders from `_mtgData` without hitting the server. Only status edits and the Refresh button cause a server round-trip.

- [ ] **Step 5: Verify tab appears**

Restart PM2: `pm2 restart nbi-dashboard`
Open browser to CC. Verify "Meetings" tab in tab bar. Click — shows loading then either data or empty state.

- [ ] **Step 6: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(meetings): add Meetings tab with single-fetch data loading"
```

---

## Task 6: Frontend — Stats Strip, Sub-Tabs, Filter Bar

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Write _mtgRenderFull and filter functions**

```js
function _mtgRenderFull() {
  var d = _mtgData;
  var s = d.sections;
  var filtered = _mtgApplyFilters(s);
  var stats = _mtgCalcStats(d, filtered);
  var h = '';

  // Stats strip
  h += '<div class="cc-meetings-stats">';
  h += '<div class="cc-hstat"><span class="v">' + stats.meeting_count + '</span><span class="l">Meetings</span></div>';
  h += '<div class="cc-hstat"><span class="v">' + stats.days + '</span><span class="l">Days</span></div>';
  h += '<div class="cc-hstat' + (stats.open_actions > 5 ? ' warn' : '') + '"><span class="v">' + stats.open_actions + '</span><span class="l">Open Actions</span></div>';
  h += '<div class="cc-hstat"><span class="v">' + stats.decisions + '</span><span class="l">Decisions</span></div>';
  h += '<div class="cc-hstat"><span class="v">' + stats.people + '</span><span class="l">People</span></div>';
  var compiled = d.compiled_at ? new Date(d.compiled_at) : null;
  var ago = compiled ? Math.round((Date.now() - compiled) / 3600000) + 'h ago' : 'never';
  h += '<div class="cc-meetings-refresh"><span class="cc-meetings-compiled">Compiled ' + ago + '</span>';
  h += '<button class="cc-btn-sm" onclick="_mtgRefresh()">Refresh &#8635;</button></div>';
  h += '</div>';

  // Sub-tabs
  var subTabs = [
    { id: 'actions', label: 'Actions (' + filtered.actions.length + ')' },
    { id: 'decisions', label: 'Decisions (' + filtered.decisions.length + ')' },
    { id: 'people', label: 'People (' + filtered.people.length + ')' },
    { id: 'learnings', label: 'Learnings (' + filtered.learnings.length + ')' },
    { id: 'numbers', label: 'Numbers (' + filtered.numbers.length + ')' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'threads', label: 'Threads (' + filtered.threads.length + ')' }
  ];
  h += '<div class="cc-meetings-subtabs">';
  subTabs.forEach(function(t) {
    h += '<div class="cc-meetings-subtab' + (_mtgSubTab === t.id ? ' on' : '') + '" onclick="_mtgSwitchSub(\'' + t.id + '\')">' + t.label + '</div>';
  });
  h += '</div>';

  // Filter bar
  h += '<div class="cc-meetings-filters">';
  h += '<select onchange="_mtgSetFilter(\'workstream\',this.value)"><option value="">All workstreams</option>';
  ['couch_heroes', 'lighthouse', 'nbi', 'sarge', 'playgoals'].forEach(function(ws) {
    h += '<option value="' + ws + '"' + (_mtgFilters.workstream === ws ? ' selected' : '') + '>' + ws.replace(/_/g, ' ') + '</option>';
  });
  h += '</select>';
  if (_mtgSubTab === 'actions') {
    h += '<select onchange="_mtgSetFilter(\'status\',this.value)"><option value="">All statuses</option>';
    ['open', 'done', 'overdue'].forEach(function(st) {
      h += '<option value="' + st + '"' + (_mtgFilters.status === st ? ' selected' : '') + '>' + st + '</option>';
    });
    h += '</select>';
  }
  h += '<input type="text" class="cc-meetings-search" placeholder="Search..." value="' + esc(_mtgFilters.q || '') + '" onkeyup="_mtgSearchDebounce(this.value)">';
  if (Object.values(_mtgFilters).some(function(v) { return v; })) {
    h += '<button class="cc-btn-sm" onclick="_mtgClearFilters()">Clear</button>';
  }
  h += '</div>';

  // Content
  h += '<div class="cc-meetings-content">' + _mtgRenderSubTab(filtered) + '</div>';
  return h;
}

function _mtgApplyFilters(sections) {
  var f = _mtgFilters;
  function matchWs(item) {
    if (!f.workstream) return true;
    if (Array.isArray(item.workstreams)) return item.workstreams.indexOf(f.workstream) >= 0;
    return item.workstream === f.workstream;
  }
  function matchStatus(item) { return !f.status || item.status === f.status; }
  function matchQ(item) {
    if (!f.q) return true;
    return JSON.stringify(item).toLowerCase().indexOf(f.q.toLowerCase()) >= 0;
  }
  function matchAll(item) { return matchWs(item) && matchStatus(item) && matchQ(item); }
  function matchNoStatus(item) { return matchWs(item) && matchQ(item); }
  return {
    actions: (sections.actions || []).filter(matchAll),
    decisions: (sections.decisions || []).filter(matchNoStatus),
    people: (sections.people || []).filter(matchNoStatus),
    learnings: (sections.learnings || []).filter(matchNoStatus),
    numbers: (sections.numbers || []).filter(matchNoStatus),
    timeline: f.q ? (sections.timeline || []).filter(matchQ) : (sections.timeline || []),
    threads: (sections.threads || []).filter(matchNoStatus)
  };
}

function _mtgCalcStats(data, filtered) {
  return {
    meeting_count: data.meeting_count || 0,
    days: data.date_range ? Math.round((new Date(data.date_range.end) - new Date(data.date_range.start)) / 86400000) : 0,
    open_actions: filtered.actions.filter(function(a) { return a.status === 'open'; }).length,
    decisions: filtered.decisions.length,
    people: filtered.people.length
  };
}

function _mtgSwitchSub(tab) {
  _mtgSubTab = tab;
  if (tab !== 'actions') delete _mtgFilters.status;
  _mtgRender();
}

function _mtgSetFilter(key, val) {
  if (val) _mtgFilters[key] = val; else delete _mtgFilters[key];
  localStorage.setItem('ccMtgFilters', JSON.stringify(_mtgFilters));
  _mtgRender();
}

var _mtgSearchTimer;
function _mtgSearchDebounce(val) {
  clearTimeout(_mtgSearchTimer);
  _mtgSearchTimer = setTimeout(function() { _mtgSetFilter('q', val); }, 300);
}

function _mtgClearFilters() {
  _mtgFilters = {};
  localStorage.removeItem('ccMtgFilters');
  _mtgRender();
}

function _mtgRefresh() {
  authFetch('/api/meetings/refresh', { method: 'POST' }).then(function() { _mtgFetchAll(); });
}
```

All filtering happens client-side on the already-loaded `_mtgData`. No server round-trips for filter changes. Only `_mtgFetchAll()` and `_mtgRefresh()` hit the server.

- [ ] **Step 2: Write sub-tab router**

```js
function _mtgRenderSubTab(filtered) {
  if (_mtgSubTab === 'actions') return _mtgRenderActions(filtered.actions);
  if (_mtgSubTab === 'decisions') return _mtgRenderDecisions(filtered.decisions);
  if (_mtgSubTab === 'people') return _mtgRenderPeople(filtered.people);
  if (_mtgSubTab === 'learnings') return _mtgRenderLearnings(filtered.learnings);
  if (_mtgSubTab === 'numbers') return _mtgRenderNumbers(filtered.numbers);
  if (_mtgSubTab === 'timeline') return _mtgRenderTimeline(filtered.timeline);
  if (_mtgSubTab === 'threads') return _mtgRenderThreads(filtered.threads);
  return '';
}
```

- [ ] **Step 3: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(meetings): add stats strip, sub-tabs, and client-side filter bar"
```

---

## Task 7: Frontend — All 7 Section Renderers + Status Editing

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Write all renderers**

```js
function _mtgRenderActions(actions) {
  if (!actions.length) return '<div class="cc-panel-empty">No actions match your filters.</div>';
  var h = '<table class="cc-tbl"><thead><tr><th>Date</th><th>Owner</th><th>Action</th><th>Workstream</th><th>Status</th></tr></thead><tbody>';
  actions.forEach(function(a) {
    var cls = a.status === 'done' ? 'cc-tag--green' : a.status === 'overdue' ? 'cc-tag--red' : 'cc-tag--yellow';
    h += '<tr><td style="white-space:nowrap">' + esc(a.date) + '</td>';
    h += '<td>' + esc(a.owner) + '</td>';
    h += '<td>' + esc(a.description) + '</td>';
    h += '<td><span class="cc-tag cc-tag--blue">' + esc((a.workstream || '').replace(/_/g, ' ')) + '</span></td>';
    h += '<td><span class="cc-tag ' + cls + '" style="cursor:pointer" onclick="_mtgCycleStatus(\'' + esc(a.id) + '\',\'' + esc(a.status) + '\')">' + esc(a.status) + '</span></td></tr>';
  });
  h += '</tbody></table>';
  return h;
}

function _mtgCycleStatus(id, current) {
  var next = current === 'open' ? 'done' : current === 'done' ? 'overdue' : 'open';
  authFetch('/api/meetings/actions/' + encodeURIComponent(id), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: next })
  }).then(function(r) {
    if (!r.ok) return;
    if (_mtgData && _mtgData.sections) {
      var a = _mtgData.sections.actions.find(function(x) { return x.id === id; });
      if (a) a.status = next;
      _mtgRender();
    }
  });
}

function _mtgRenderDecisions(items) {
  if (!items.length) return '<div class="cc-panel-empty">No decisions match your filters.</div>';
  var h = '<table class="cc-tbl"><thead><tr><th>Date</th><th>Decision</th><th>Rationale</th><th>Workstream</th></tr></thead><tbody>';
  items.forEach(function(d) {
    h += '<tr><td style="white-space:nowrap">' + esc(d.date) + '</td>';
    h += '<td>' + esc(d.decision) + '</td>';
    h += '<td style="color:var(--text-secondary)">' + esc(d.rationale) + '</td>';
    h += '<td><span class="cc-tag cc-tag--blue">' + esc((d.workstream || '').replace(/_/g, ' ')) + '</span></td></tr>';
  });
  h += '</tbody></table>';
  return h;
}

function _mtgRenderPeople(items) {
  if (!items.length) return '<div class="cc-panel-empty">No people match your filters.</div>';
  var h = '<div class="cc-meetings-people-grid">';
  items.forEach(function(p) {
    h += '<div class="cc-card cc-meetings-person">';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline">';
    h += '<strong style="color:var(--accent)">' + esc(p.name) + '</strong>';
    h += '<span style="font-size:0.72rem;color:var(--text-secondary)">Last: ' + esc(p.last_seen || '?') + '</span></div>';
    h += '<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:6px">' + esc(p.role) + '</div>';
    if (p.workstreams) p.workstreams.forEach(function(ws) { h += '<span class="cc-tag cc-tag--blue" style="margin-right:4px">' + esc(ws.replace(/_/g, ' ')) + '</span>'; });
    if (p.notes && p.notes.length) {
      h += '<ul style="margin-top:8px;font-size:0.85rem;padding-left:16px">';
      p.notes.forEach(function(n) { h += '<li>' + esc(n) + '</li>'; });
      h += '</ul>';
    }
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function _mtgRenderLearnings(items) {
  if (!items.length) return '<div class="cc-panel-empty">No learnings match your filters.</div>';
  var h = '';
  items.forEach(function(l) {
    h += '<div class="cc-meetings-insight">';
    h += '<div style="display:flex;justify-content:space-between;margin-bottom:4px">';
    h += '<span style="font-size:0.78rem;color:var(--text-secondary)">' + esc(l.date) + '</span>';
    h += '<span class="cc-tag cc-tag--blue">' + esc((l.workstream || '').replace(/_/g, ' ')) + '</span></div>';
    h += '<strong>' + esc(l.insight) + '</strong>';
    h += '<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px">' + esc(l.context) + '</div></div>';
  });
  return h;
}

function _mtgRenderNumbers(items) {
  if (!items.length) return '<div class="cc-panel-empty">No numbers match your filters.</div>';
  var groups = {};
  items.forEach(function(n) { var c = n.category || 'other'; if (!groups[c]) groups[c] = []; groups[c].push(n); });
  var h = '';
  Object.keys(groups).forEach(function(cat) {
    h += '<h4 style="margin:16px 0 8px;color:var(--text-secondary);text-transform:capitalize">' + esc(cat.replace(/_/g, ' ')) + '</h4>';
    h += '<table class="cc-tbl"><thead><tr><th>Date</th><th>Figure</th><th>Context</th><th>Workstream</th></tr></thead><tbody>';
    groups[cat].forEach(function(n) {
      h += '<tr><td style="white-space:nowrap">' + esc(n.date) + '</td>';
      h += '<td style="color:var(--success);font-weight:700">' + esc(n.figure) + '</td>';
      h += '<td>' + esc(n.context) + '</td>';
      h += '<td><span class="cc-tag cc-tag--blue">' + esc((n.workstream || '').replace(/_/g, ' ')) + '</span></td></tr>';
    });
    h += '</tbody></table>';
  });
  return h;
}

function _mtgRenderTimeline(items) {
  if (!items.length) return '<div class="cc-panel-empty">No timeline data.</div>';
  var h = '<div class="cc-meetings-timeline">';
  items.forEach(function(t) {
    h += '<div class="cc-meetings-tl-item"><div class="cc-meetings-tl-dot"></div>';
    h += '<div class="cc-meetings-tl-date">' + esc(t.period) + ' &mdash; ' + esc(t.label) + '</div>';
    h += '<div style="font-size:0.88rem">' + esc(t.summary) + '</div></div>';
  });
  h += '</div>';
  return h;
}

function _mtgRenderThreads(items) {
  if (!items.length) return '<div class="cc-panel-empty">No active threads.</div>';
  var h = '<div class="cc-meetings-threads-grid">';
  items.forEach(function(t) {
    var cls = t.status === 'active' ? 'cc-tag--yellow' : 'cc-tag--green';
    h += '<div class="cc-card">';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">';
    h += '<strong style="color:var(--warning)">' + esc(t.title) + '</strong>';
    h += '<span class="cc-tag ' + cls + '">' + esc(t.status) + '</span></div>';
    h += '<div style="font-size:0.88rem">' + esc(t.summary) + '</div>';
    if (t.workstream) h += '<div style="margin-top:8px"><span class="cc-tag cc-tag--blue">' + esc(t.workstream.replace(/_/g, ' ')) + '</span></div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}
```

Note: `_mtgCycleStatus` patches the server AND optimistically updates `_mtgData` locally, then re-renders. No second fetch needed.

- [ ] **Step 2: Verify all renderers**

Restart PM2. Navigate to CC > Meetings. Click through all 7 sub-tabs. Verify: tables render, status tags are clickable, people cards show in grid, insights have purple accent, numbers grouped by category, timeline has dots, threads have badges. Test filtering by workstream and search. Test status cycling on an action.

- [ ] **Step 3: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(meetings): add all 7 section renderers with status editing"
```

---

## Task 8: E2E Test

**Files:**
- Create: `dashboard-server/tests/e2e/meetings-tab.spec.js`

- [ ] **Step 1: Write Playwright test**

```js
// dashboard-server/tests/e2e/meetings-tab.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Meetings Intelligence Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('.sidebar', { timeout: 10000 });
  });

  test('navigates to Meetings tab and shows content', async ({ page }) => {
    await page.click('text=Command Centre');
    await page.waitForSelector('.cc-tab-bar');
    await page.click('.cc-tab-bar >> text=Meetings');
    await page.waitForSelector('.cc-meetings-stats, .cc-panel-empty', { timeout: 5000 });
    const root = page.locator('#ccMeetingsRoot');
    await expect(root).toBeVisible();
  });

  test('sub-tabs switch content', async ({ page }) => {
    await page.click('text=Command Centre');
    await page.click('.cc-tab-bar >> text=Meetings');
    await page.waitForSelector('.cc-meetings-subtabs', { timeout: 5000 });
    await page.click('.cc-meetings-subtab >> text=Decisions');
    await expect(page.locator('.cc-meetings-subtab.on')).toContainText('Decisions');
    await page.click('.cc-meetings-subtab >> text=People');
    await expect(page.locator('.cc-meetings-subtab.on')).toContainText('People');
  });
});
```

- [ ] **Step 2: Run E2E test**

Run: `cd dashboard-server && npm run test:e2e -- --grep "Meetings"`
Expected: Both tests PASS (or skip gracefully if no meetings.json exists).

- [ ] **Step 3: Commit**

```
git add dashboard-server/tests/e2e/meetings-tab.spec.js
git commit -m "test(meetings): add E2E tests for Meetings tab navigation"
```

---

## Task 9: Full Verification

- [ ] **Step 1: Run full unit test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass including new meetings-intelligence tests. No regressions.

- [ ] **Step 2: Run full E2E suite**

Run: `cd dashboard-server && npm run test:e2e`
Expected: All specs pass.

- [ ] **Step 3: Visual verification checklist**

Open http://localhost:8888/nbi_project_dashboard.html > Command Centre > Meetings:

1. Stats strip: meeting count, days, open actions, decisions, people
2. "Compiled Xh ago" displays, Refresh button works
3. All 7 sub-tabs switch and show counts in labels
4. Actions: table with clickable status tags (cycles open→done→overdue)
5. Decisions: table with rationale column
6. People: card grid with names, roles, tags, notes
7. Learnings: purple insight boxes
8. Numbers: grouped by category, figures in green
9. Timeline: vertical dots with summaries
10. Threads: cards with active/resolved badges
11. Workstream filter narrows all sections
12. Status filter (Actions only) works
13. Search filters across sections
14. Clear button resets filters
15. Empty state when filters exclude all items
16. Existing CC tabs unaffected

- [ ] **Step 4: Restart PM2 for production**

Run: `pm2 restart nbi-dashboard`

---

## Summary

| Task | What | Key Fix from Critique |
|---|---|---|
| 1 | DB migration | — |
| 2 | Server lib + tests | ESM `.test.mjs`, status overrides applied via `applyOverrides()` BEFORE return |
| 3 | Server routes | `getOverrides` → `applyOverrides` → respond (merge before filtering) |
| 4 | CSS | Moved BEFORE renderers; uses verified theme vars |
| 5 | Tab registration + loading | Single fetch, client-side filtering |
| 6 | Stats + sub-tabs + filters | All filtering in JS, no server round-trips |
| 7 | All 7 renderers + status edit | Optimistic update on status cycle |
| 8 | E2E Playwright test | Added (was missing in v1) |
| 9 | Full verification | — |
