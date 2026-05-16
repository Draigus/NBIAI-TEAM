# Command Centre Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Command Centre as a dense widescreen operational dashboard with fires, client work balance, email queue, Granola meeting-note tasks, improvement suggestions, and AIOS health strip.

**Architecture:** Extend the existing `dashboard-server/routes/command-centre.js` (621 lines, 6 scanners, 5 endpoints) with new aggregation endpoints. Rewrite the CC frontend section in `nbi_project_dashboard.html` (replacing ~813 lines of existing CC code). Gmail and Granola data fetched via MCP proxy from the Claude Code host — for now, the backend aggregates what it can from the DB and file system, and the frontend calls the existing MCPs client-side where needed.

**Tech Stack:** Express 4, PostgreSQL (`pg`), vanilla JS (no framework), inline CSS in the monolithic HTML file. Existing patterns: factory-function route modules, `requireNBI` auth guard, `pool.query()` for DB access.

**Spec:** `docs/superpowers/specs/2026-05-16-command-centre-redesign.md`
**Mockup:** `docs/superpowers/specs/cc-mockup-v6.html`

**Critical context:**
- `dashboard-server/routes/command-centre.js` already exists with scanners for skills, memory, connections, brain, sessions, bugs, tests, and Four Cs scoring. The briefing endpoint already queries overdue tasks, calendar events, critical bugs, client deliveries, and knowledge flags.
- The frontend CC code lives in `nbi_project_dashboard.html` at approximately lines 19,736-20,374 (JS) and 2,635-2,818 (CSS).
- The `cc_snapshots` DB table exists (migration 044).
- Route is registered in `server.js` — search for `command-centre` to find the `app.use(require('./routes/command-centre')(...))` line.

---

## Phase A: Backend Extensions

### Task 1: Add fires aggregation to the briefing endpoint

**Files:**
- Modify: `dashboard-server/routes/command-centre.js`

The existing `/api/command-centre/briefing` endpoint already queries overdue tasks, critical bugs, and client deliveries. We need to reshape its output to include a dedicated `fires` array that combines cross-client problems into one prioritised list.

- [ ] **Step 1: Read the existing briefing endpoint**

Read `dashboard-server/routes/command-centre.js` lines 486-595. Understand the existing queries: `overdueQ`, `critBugsQ`, `blockedQ`, `delivQ`. The `critical` array at line 568 already does basic aggregation.

- [ ] **Step 2: Add fires aggregation logic**

Inside the briefing endpoint handler (before the `res.json` call at line 573), add a `fires` array builder that replaces the basic `critical` array. Add this code after line 567 (`const critical = [];`):

```javascript
// Fires: cross-client problems, prioritised
const fires = [];

// Critical/urgent bugs
critBugsQ.rows.forEach(b => {
  fires.push({
    severity: b.priority === 'critical' ? 'CRITICAL' : 'URGENT',
    title: b.title,
    client: 'WorkSage',
    type: 'bug',
    link_type: 'bug',
    link_id: b.id,
    age_days: daysSince(b.created_at),
  });
});

// Overdue tasks with client names
const overdueWithClients = await pool.query(`
  SELECT t.id, t.title, t.due_date, t.priority, c.name as client_name
  FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
  WHERE t.due_date IS NOT NULL AND t.due_date != ''
    AND t.due_date::date < $1::date
    AND t.status NOT IN ('Done','Cancelled')
    AND t.item_type IN ('story','task','feature')
  ORDER BY t.due_date
`, [todayStr]);

overdueWithClients.rows.forEach(t => {
  const daysLate = daysSince(t.due_date);
  fires.push({
    severity: daysLate + 'D LATE',
    title: t.title,
    client: t.client_name || 'Unassigned',
    type: 'task',
    link_type: 'task',
    link_id: t.id,
    age_days: daysLate,
  });
});

// Blocked items
blockedQ.rows.forEach(t => {
  fires.push({
    severity: 'BLOCKED',
    title: t.title,
    client: 'WorkSage',
    type: 'task',
    link_type: 'task',
    link_id: t.id,
    age_days: t.due_date ? daysSince(t.due_date) : 0,
  });
});

// Sort: CRITICAL first, then by age descending
fires.sort((a, b) => {
  const sev = { CRITICAL: 0, URGENT: 1, BLOCKED: 2 };
  const aS = sev[a.severity] ?? 3;
  const bS = sev[b.severity] ?? 3;
  if (aS !== bS) return aS - bS;
  return b.age_days - a.age_days;
});
```

- [ ] **Step 3: Add fires to the response JSON**

In the `res.json` call at line 573, add `fires` to the `data` object alongside the existing `critical` array:

```javascript
fires,
```

- [ ] **Step 4: Test the endpoint**

Run: `curl -s -H "Cookie: nbi_session=<token>" http://localhost:8888/api/command-centre/briefing | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('Fires:', d.data?.fires?.length, JSON.stringify(d.data?.fires?.slice(0,2), null, 2))"`

Verify fires array exists and contains items sorted by severity.

- [ ] **Step 5: Commit**

```
git add dashboard-server/routes/command-centre.js
git commit -m "feat(cc): add fires aggregation to briefing endpoint"
```

### Task 2: Add client work balance endpoint

**Files:**
- Modify: `dashboard-server/routes/command-centre.js`

- [ ] **Step 1: Add the client-work endpoint**

Add this new endpoint before the `return router;` line at the end of command-centre.js:

```javascript
/** GET /api/command-centre/client-work — per-client task balance + velocity */
router.get('/api/command-centre/client-work', requireNBI, async (req, res) => {
  try {
    // Per-client task counts
    const clientsQ = await pool.query(`
      SELECT c.name as client_name, c.id as client_id,
        COUNT(*) FILTER (WHERE t.status = 'Done') as done,
        COUNT(*) FILTER (WHERE t.status IN ('In Progress','In Review')) as in_progress,
        COUNT(*) FILTER (WHERE t.status NOT IN ('Done','Cancelled','In Progress','In Review')) as todo,
        COUNT(*) as total
      FROM tasks t
      JOIN clients c ON t.client_id = c.id
      WHERE t.item_type IN ('story','task')
        AND t.status != 'Cancelled'
      GROUP BY c.name, c.id
      ORDER BY total DESC
    `);

    // Weekly velocity (last 4 weeks)
    const velocityQ = await pool.query(`
      SELECT
        DATE_TRUNC('week', updated_at)::date as week_start,
        COUNT(*) as completed
      FROM tasks
      WHERE status = 'Done'
        AND updated_at >= NOW() - INTERVAL '28 days'
        AND item_type IN ('story','task')
      GROUP BY DATE_TRUNC('week', updated_at)
      ORDER BY week_start
    `);

    // Summary stats
    const statsQ = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('Done','Cancelled')) as open_tasks,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date < CURRENT_DATE AND status NOT IN ('Done','Cancelled')) as overdue,
        COUNT(*) FILTER (WHERE status = 'Blocked') as blocked,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date = CURRENT_DATE AND status NOT IN ('Done','Cancelled')) as due_today,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 AND status NOT IN ('Done','Cancelled')) as due_this_week
      FROM tasks
      WHERE item_type IN ('story','task')
    `);

    res.json({
      data: {
        clients: clientsQ.rows.map(r => ({
          name: r.client_name,
          id: r.client_id,
          done: parseInt(r.done),
          in_progress: parseInt(r.in_progress),
          todo: parseInt(r.todo),
          total: parseInt(r.total),
        })),
        velocity: velocityQ.rows.map(r => ({
          week_start: r.week_start,
          completed: parseInt(r.completed),
        })),
        stats: statsQ.rows[0] ? {
          open_tasks: parseInt(statsQ.rows[0].open_tasks),
          overdue: parseInt(statsQ.rows[0].overdue),
          blocked: parseInt(statsQ.rows[0].blocked),
          due_today: parseInt(statsQ.rows[0].due_today),
          due_this_week: parseInt(statsQ.rows[0].due_this_week),
        } : {},
      },
      error: null,
    });
  } catch (e) {
    log('error', 'CC', 'client-work failed', { error: e.message });
    res.status(500).json({ data: null, error: e.message });
  }
});
```

- [ ] **Step 2: Test the endpoint**

```
curl -s -H "Cookie: nbi_session=<token>" http://localhost:8888/api/command-centre/client-work | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('Clients:', d.data?.clients?.length); d.data?.clients?.forEach(c => console.log(c.name, c.done+'/'+c.total))"
```

- [ ] **Step 3: Commit**

```
git add dashboard-server/routes/command-centre.js
git commit -m "feat(cc): add client work balance endpoint with velocity data"
```

### Task 3: Write Vitest tests for new endpoints

**Files:**
- Create: `dashboard-server/tests/routes/command-centre.test.js`

- [ ] **Step 1: Create test file**

Follow the pattern from existing route tests (check `dashboard-server/tests/` for examples). Write tests for:

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// Use the test database and authenticated request helpers from the test setup

describe('Command Centre API', () => {
  describe('GET /api/command-centre/briefing', () => {
    it('returns fires array sorted by severity', async () => {
      const res = await authGet('/api/command-centre/briefing');
      expect(res.status).toBe(200);
      const { data } = res.body;
      expect(data).toHaveProperty('fires');
      expect(Array.isArray(data.fires)).toBe(true);
      // Each fire has required fields
      if (data.fires.length > 0) {
        expect(data.fires[0]).toHaveProperty('severity');
        expect(data.fires[0]).toHaveProperty('title');
        expect(data.fires[0]).toHaveProperty('client');
        expect(data.fires[0]).toHaveProperty('link_type');
      }
    });
  });

  describe('GET /api/command-centre/client-work', () => {
    it('returns per-client task counts and velocity', async () => {
      const res = await authGet('/api/command-centre/client-work');
      expect(res.status).toBe(200);
      const { data } = res.body;
      expect(data).toHaveProperty('clients');
      expect(data).toHaveProperty('velocity');
      expect(data).toHaveProperty('stats');
      expect(Array.isArray(data.clients)).toBe(true);
      // Each client has done/in_progress/todo/total
      if (data.clients.length > 0) {
        const c = data.clients[0];
        expect(c).toHaveProperty('name');
        expect(c).toHaveProperty('done');
        expect(c).toHaveProperty('in_progress');
        expect(c).toHaveProperty('todo');
        expect(c).toHaveProperty('total');
        expect(c.done + c.in_progress + c.todo).toBe(c.total);
      }
      // Stats object
      expect(data.stats).toHaveProperty('open_tasks');
      expect(data.stats).toHaveProperty('overdue');
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd dashboard-server && npx vitest run tests/routes/command-centre.test.js`

Expected: All tests pass. If tests fail due to auth setup, check how other route tests handle authentication and adapt.

- [ ] **Step 3: Commit**

```
git add dashboard-server/tests/routes/command-centre.test.js
git commit -m "test(cc): add endpoint tests for fires and client-work"
```

---

## Phase B: Frontend Rewrite

### Task 4: Replace CC CSS with new design system

**Files:**
- Modify: `nbi_project_dashboard.html` (CSS section, approximately lines 2,635-2,818)

- [ ] **Step 1: Find and read the existing CC CSS block**

Search for `.cc-` or `#commandCentreContainer` styles in the HTML file. Read the full CSS block.

- [ ] **Step 2: Replace the existing CC CSS with the new design system**

Replace the entire CC CSS block with the styles from the mockup at `docs/superpowers/specs/cc-mockup-v6.html`. The mockup's `<style>` block contains the complete CSS. Copy it verbatim — the class names (`.cc-header`, `.cc-card`, `.cc-row`, `.cc-fires`, `.cc-grid-2`, `.cc-grid-3`, `.stat-tile`, `.btn`, `.tag`, `.badge`, `.sbar`, `.fire-row`, `.gt`, `.pill`) are the new design system.

Key additions not in the current CSS:
- The dense dark palette (#0d1117 / #161b22 / #21262d)
- Status colour variables (#3fb950, #d29922, #f85149, #58a6ff, #a371f7)
- Responsive grid classes (.cc-grid-2, .cc-grid-3)
- Button variants (.btn.g, .btn.rd, .btn.p, .btn.pu)
- Inline action row styles (.cc-row with hover opacity)
- AIOS strip layout

Ensure the CSS respects the dashboard's existing `min-font-size` rules (Glen wears glasses — body 14-15px minimum, data 16px+).

- [ ] **Step 3: Verify no conflicts with existing styles**

Search for any CSS class names in the new CSS that might conflict with existing dashboard styles. The `.cc-` prefix should namespace everything safely, but check for generic class names like `.btn`, `.tag`, `.badge` — if the dashboard already uses these, prefix them (e.g. `.cc-btn`, `.cc-tag`).

- [ ] **Step 4: Commit**

```
git add nbi_project_dashboard.html
git commit -m "style(cc): replace CC CSS with dense widescreen dark design system"
```

### Task 5: Rewrite CC JavaScript — data loading and layout

**Files:**
- Modify: `nbi_project_dashboard.html` (JS section, approximately lines 19,736-20,374)

- [ ] **Step 1: Read the existing CC JavaScript**

Read lines 19,736-20,374. Understand:
- `renderCommandCentre()` — the main entry point
- `_ccLoadData()` / `_ccLoadBriefing()` — data fetching
- `_ccSnapshot` / `_ccBriefing` — global cache variables
- `_ccTab` — tab state management
- The existing rendering functions for each card

- [ ] **Step 2: Rewrite renderCommandCentre()**

Replace the main render function. The new version:
1. Calls two endpoints: `/api/command-centre/briefing` and `/api/command-centre/client-work`
2. Renders the 4-row layout
3. Sets up auto-refresh (30s polling)

```javascript
async function renderCommandCentre() {
  const container = document.getElementById('commandCentreContainer');
  if (!container) return;

  // Show loading state
  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;color:#8b949e;">Loading Command Centre...</div>';

  try {
    // Fetch both endpoints in parallel
    const [briefingRes, clientWorkRes, snapshotRes] = await Promise.all([
      fetch('/api/command-centre/briefing').then(r => r.json()),
      fetch('/api/command-centre/client-work').then(r => r.json()),
      fetch('/api/command-centre/snapshot').then(r => r.json()).catch(() => ({ data: null })),
    ]);

    const briefing = briefingRes.data || {};
    const clientWork = clientWorkRes.data || {};
    const snapshot = snapshotRes.data?.data ? (typeof snapshotRes.data.data === 'string' ? JSON.parse(snapshotRes.data.data) : snapshotRes.data.data) : {};

    // Render based on active tab
    const tab = localStorage.getItem('ccTab') || 'command';
    if (tab === 'command') {
      _ccRenderCommandView(container, briefing, clientWork, snapshot);
    } else {
      _ccRenderBriefView(container, briefing, snapshot);
    }

    // Set up auto-refresh
    if (window._ccRefreshTimer) clearInterval(window._ccRefreshTimer);
    window._ccRefreshTimer = setInterval(() => {
      if (document.getElementById('commandCentreContainer')) {
        renderCommandCentre();
      } else {
        clearInterval(window._ccRefreshTimer);
      }
    }, 30000);

  } catch (err) {
    container.innerHTML = `<div style="padding:40px;color:#f85149;">Failed to load Command Centre: ${err.message}</div>`;
  }
}
```

- [ ] **Step 3: Write _ccRenderCommandView()**

This is the main rendering function. It builds the 4-row layout from the spec. Use the mockup HTML structure from `cc-mockup-v6.html` as the template, but replace static data with dynamic values from the API responses.

The function signature:

```javascript
function _ccRenderCommandView(container, briefing, clientWork, snapshot) {
  const fires = briefing.fires || [];
  const stats = clientWork.stats || {};
  const clients = clientWork.clients || [];
  const velocity = clientWork.velocity || [];
  const bugs = briefing.bugs || {};
  const fourCs = snapshot.four_cs || {};
  const aios = { brain: snapshot.brain, memory: snapshot.memory, connections: snapshot.connections, tests: snapshot.tests };

  container.innerHTML = `
    ${_ccRenderHeader('command')}
    <div class="cc-body">
      ${_ccRenderRow1_Fires(fires, stats, aios)}
      ${_ccRenderRow2_ClientWork(clients, velocity, bugs)}
      ${_ccRenderRow3_Queues(briefing)}
      ${_ccRenderRow4_AIOSStrip(fourCs, aios)}
    </div>
  `;

  // Attach event listeners for action buttons
  _ccAttachActions(container);
}
```

Build each `_ccRenderRow*` function following the mockup's HTML structure. Each function returns an HTML string. Key patterns:

- Fires: iterate `fires` array, render `.fire-row` for each with badge, text, client, "Open →" link
- Client bars: iterate `clients`, render `.sbar` with flex proportions from done/in_progress/todo
- Velocity: render bar chart from `velocity` array
- Bugs: render stacked bar from `bugs.by_priority` + trend from existing data
- Stat tiles: render from `stats` object
- AIOS strip: render Four Cs SVG rings + stats inline

- [ ] **Step 4: Write _ccRenderRow1_Fires()**

```javascript
function _ccRenderRow1_Fires(fires, stats, aios) {
  const fireRows = fires.slice(0, 6).map(f => `
    <div class="fire-row" onclick="_ccNavigate('${f.link_type}', '${f.link_id}')">
      <span class="badge ${f.severity === 'CRITICAL' ? 'cr' : f.severity.includes('LATE') ? 'la' : 'wa'}">${f.severity}</span>
      <span class="fire-t">${_escHtml(f.title)}</span>
      <span class="fire-c">${_escHtml(f.client)}</span>
      <span class="fire-a">Open →</span>
    </div>
  `).join('');

  const testsColor = (aios.tests?.last_run?.failed || 0) === 0 ? '#3fb950' : '#f85149';
  const testsCount = aios.tests?.last_run?.passed || aios.tests?.last_run?.total || '—';
  const aiosScore = _ccComputeAIOSScore(aios);

  return `
    <div class="cc-section">
      <div style="display:grid;grid-template-columns:1fr 340px;gap:14px;">
        <div class="cc-card" style="border-color:rgba(248,81,73,0.2);background:rgba(248,81,73,0.03);">
          <h3><span><span style="color:#f85149;margin-right:6px;">●</span>Fires Across Clients</span><span class="ct">${fires.length} need attention</span></h3>
          ${fires.length > 0 ? `<div class="cc-fires">${fireRows}</div>` : '<div style="padding:16px;text-align:center;color:#3fb950;">No fires. All clear.</div>'}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="cc-card stat" style="text-align:center;"><div class="s">OPEN TASKS</div><div class="v">${stats.open_tasks || 0}</div><div class="s">across ${(aios.brain?.roles?.length || 0) > 0 ? clients.length : '—'} clients</div></div>
          <div class="cc-card stat" style="text-align:center;"><div class="s">OVERDUE</div><div class="v" style="color:#f85149;">${stats.overdue || 0}</div></div>
          <div class="cc-card stat" style="text-align:center;"><div class="s">BLOCKED</div><div class="v" style="color:#d29922;">${stats.blocked || 0}</div></div>
          <div class="cc-card stat" style="text-align:center;"><div class="s">DUE TODAY</div><div class="v" style="color:#58a6ff;">${stats.due_today || 0}</div><div class="s">+ ${stats.due_this_week || 0} this week</div></div>
          <div class="cc-card stat" style="text-align:center;"><div class="s">TESTS</div><div class="v" style="color:${testsColor};">${testsCount}</div></div>
          <div class="cc-card stat" style="text-align:center;"><div class="s">AIOS</div><div class="v" style="color:#3fb950;">${aiosScore}</div></div>
        </div>
      </div>
    </div>
  `;
}
```

- [ ] **Step 5: Write _ccRenderRow2_ClientWork()**

Build the client work bars, velocity chart, and bug breakdown following the mockup layout. This is the widest section — uses `grid-template-columns: 1fr 1fr` with the right side split into velocity + bugs.

Key rendering logic for client bars:
```javascript
clients.map(c => {
  const remaining = c.total - c.done;
  const color = c.done / c.total > 0.8 ? '#3fb950' : c.done / c.total > 0.5 ? '#d29922' : '#f85149';
  return `
    <div style="margin-bottom:14px;cursor:pointer;" onclick="_ccNavigate('client','${c.id}')">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <span style="font-size:0.8rem;">${_escHtml(c.name)}</span>
        <span style="font-size:0.68rem;color:${color};">${c.done}/${c.total} — ${remaining} left</span>
      </div>
      <div class="sbar">
        <div style="background:#238636;flex:${c.done}"></div>
        <div style="background:#1f6feb;flex:${c.in_progress}"></div>
        <div style="background:#30363d;flex:${c.todo}"></div>
      </div>
    </div>
  `;
}).join('')
```

Velocity chart: render bars from `velocity` array with height proportional to max value. Current week shown as dashed.

Bug breakdown: use existing `bugs.by_priority` from briefing data for the stacked bar. Use `bugs.critical_open.length` etc for tags.

- [ ] **Step 6: Write _ccRenderRow3_Queues()**

Three-column layout: emails, Granola, improvements.

**Emails column:** For now, render a placeholder that shows the existing overdue/due-today tasks as "items needing response" since Gmail MCP integration requires server-side proxy work. Add a comment marking where the Gmail data will plug in:

```javascript
// TODO: Replace with /api/command-centre/emails when Gmail proxy is built
// For now, show work items that are blocked or overdue as "needing attention"
```

**Granola column:** Similarly, render a placeholder showing yesterday's calendar events (from briefing.calendar.today) as "meetings that may have generated tasks":

```javascript
// TODO: Replace with /api/command-centre/granola when Granola proxy is built
// For now, show yesterday's meetings as potential task sources
```

**Improvements column:** Static suggestions based on known gaps (from the AIOS scan data — stale brain modules, missing connections, etc.):

```javascript
function _ccRenderImprovements(snapshot) {
  const suggestions = [];
  // Stale brain modules
  if (snapshot.brain) {
    const stale = snapshot.brain.modules.filter(m => m.last_modified && daysSince(m.last_modified) > 30);
    stale.forEach(m => suggestions.push({
      title: `Brain module "${m.name}" is ${daysSince(m.last_modified)} days stale`,
      meta: 'Verify content is still accurate',
      type: 'platform',
    }));
  }
  // Missing connections
  if (snapshot.connections) {
    Object.entries(snapshot.connections.buckets).forEach(([name, b]) => {
      if (b.status === 'missing') suggestions.push({
        title: `No ${name} connection — blind spot`,
        meta: 'Consider adding an integration',
        type: 'platform',
      });
    });
  }
  return suggestions;
}
```

- [ ] **Step 7: Write _ccRenderRow4_AIOSStrip()**

Compact inline strip with Four Cs SVG rings, stats, and connection pills. Follow the mockup's Row 4 HTML exactly — it's already the right density.

The Four Cs SVG ring helper:
```javascript
function _ccRingSvg(score, label, size = 40) {
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const fill = (score / 10) * circ;
  const color = score >= 7 ? '#3fb950' : score >= 4 ? '#d29922' : '#f85149';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#21262d" stroke-width="3"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="3"
      stroke-dasharray="${fill} ${circ}" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="#e6edf3" font-size="${size * 0.3}" font-weight="800">${score}</text>
  </svg>`;
}
```

- [ ] **Step 8: Write _ccAttachActions() and _ccNavigate()**

```javascript
function _ccNavigate(type, id) {
  if (type === 'bug') { switchView('bugs'); /* TODO: scroll to bug id */ }
  else if (type === 'task') { selectWorkItem(id); }
  else if (type === 'client') { /* switch to client view and filter */ }
}

function _ccAttachActions(container) {
  // Snooze buttons, approve/reject for Granola, etc.
  container.querySelectorAll('[data-cc-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.ccAction;
      const id = btn.dataset.ccId;
      // Handle each action type
      if (action === 'snooze') { /* mark as snoozed in localStorage */ }
      else if (action === 'approve') { /* POST to create work item */ }
      else if (action === 'reject') { /* mark as rejected */ }
    });
  });
}
```

- [ ] **Step 9: Write _ccRenderHeader() and tab switching**

```javascript
function _ccRenderHeader(activeTab) {
  return `
    <div class="cc-header">
      <div style="display:flex;align-items:center;">
        <h1>Command Centre</h1>
        <div class="cc-tabs">
          <div class="cc-tab ${activeTab === 'command' ? 'on' : ''}" onclick="_ccSwitchTab('command')">Command</div>
          <div class="cc-tab ${activeTab === 'brief' ? 'on' : ''}" onclick="_ccSwitchTab('brief')">Brief</div>
        </div>
      </div>
      <div class="cc-live"><div class="cc-live-dot"></div>Live — refreshed just now</div>
    </div>
  `;
}

function _ccSwitchTab(tab) {
  localStorage.setItem('ccTab', tab);
  renderCommandCentre();
}
```

- [ ] **Step 10: Write _ccRenderBriefView() placeholder**

```javascript
function _ccRenderBriefView(container, briefing, snapshot) {
  container.innerHTML = `
    ${_ccRenderHeader('brief')}
    <div class="cc-body">
      <div style="display:flex;align-items:center;justify-content:center;height:50vh;color:#8b949e;">
        <div style="text-align:center;">
          <div style="font-size:1.2rem;margin-bottom:8px;">Morning Brief</div>
          <div>Coming soon — use the Command view for now</div>
        </div>
      </div>
    </div>
  `;
}
```

- [ ] **Step 11: Test the full CC rendering**

1. Restart the server: `pm2 restart nbi-dashboard`
2. Open http://localhost:8888/nbi_project_dashboard.html
3. Click "Command Centre" in the sidebar
4. Verify:
   - The 4-row layout renders
   - Fires section shows any overdue tasks or critical bugs
   - Client work bars show real data from the DB
   - Stat tiles show correct counts
   - AIOS strip renders with Four Cs rings
   - Tab switching works
   - Auto-refresh triggers after 30s
5. Run: `npm run test:e2e` to verify no regressions

- [ ] **Step 12: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(cc): rewrite Command Centre frontend with dense widescreen layout

- 4-row layout: fires, client work, queues, AIOS strip
- Dark design system (#0d1117 / #161b22 / #21262d)
- Stacked bars, velocity chart, SVG ring gauges, bug trend
- Auto-refresh every 30s
- Deep link navigation from all items
- Email/Granola columns as placeholders (MCP integration TBD)"
```

---

## Phase C: Integration and Polish

### Task 6: Run full test suite and fix regressions

**Files:**
- Possibly modify: `nbi_project_dashboard.html`, `dashboard-server/routes/command-centre.js`

- [ ] **Step 1: Run unit tests**

```
cd dashboard-server && npm test
```

All tests must pass. Fix any failures.

- [ ] **Step 2: Run e2e tests**

```
cd dashboard-server && npm run test:e2e
```

All tests must pass. If CC-specific e2e tests exist, verify they still work with the new rendering.

- [ ] **Step 3: Manual verification**

Open http://localhost:8888/nbi_project_dashboard.html in a browser. Navigate through:
1. Command Centre — verify all 4 rows render with real data
2. Switch to another view (e.g. Tasks) and back — verify CC reloads
3. Click a fire item — verify it navigates to the correct view
4. Resize browser window — verify responsive layout works at 1200px breakpoint
5. Check other views (Tasks, Calendar, Clients) still work — no regressions

- [ ] **Step 4: Commit any fixes**

```
git add -A
git commit -m "fix(cc): address test failures and regressions from CC rewrite"
```

### Task 7: Restart PM2 and verify production

**Files:** None

- [ ] **Step 1: Restart production server**

```
pm2 restart nbi-dashboard
```

- [ ] **Step 2: Verify at production URL**

Ask Glen to check https://worksage.nbi-consulting.com — navigate to Command Centre and confirm it renders correctly.

- [ ] **Step 3: Final commit if needed**

Tag the completion in the session log.
