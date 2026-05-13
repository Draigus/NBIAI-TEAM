# Portfolio Page v5 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current v4 portfolio page (sidebar + 2x2 panels) with the approved v5 neumorphic design (KPI strip, client table, 3-col + 2-col panels) and add the Command theme to the theme picker.

**Architecture:** The SPA is a monolithic `nbi_project_dashboard.html` (~21k lines, inline CSS+JS). The portfolio view is rendered by `renderPortfolioDashboard()` and ~8 sub-functions (lines 5472-6245). The approved prototype is at `prototypes/portfolio-redesign-v5.html`. All changes are in one file. The design uses neumorphic shadows via the existing `--shadow-sm/md/lg` CSS variables so the layout works across all 8 themes, with hex grid + backdrop-filter exclusive to the Command theme.

**Tech Stack:** Vanilla JS (string-template rendering), CSS custom properties, SVG for donut chart, Express+Postgres backend (no backend changes needed).

**Reference files:**
- Prototype: `prototypes/portfolio-redesign-v5.html` (approved design, hardcoded data)
- Handoff: `docs/HANDOFF.md` (design decisions, data mappings)
- Main SPA: `nbi_project_dashboard.html` (the file being modified)

**Critical constraints:**
- Font weights available: Inter 300-700, JetBrains Mono 400-500. Prototype uses 800-900 weights — use 700/500 respectively (visually close enough with variable fonts).
- The existing header (`.g-header`) is NOT being replaced. Only the portfolio content below it changes.
- `_portfolioSelectedClient` filtering is KEPT — clicking a client row still filters panels to that client's data.
- The `selectPortfolioClient` action handler (line 3147) stays unchanged.
- All existing utility functions are reused: `getTaskClient()`, `getDescendants()`, `safeParseDate()`, `esc()`, `computeMilestoneStatus()`, `clientSortOrder()`, `getClientAbbreviation()`, `HEALTH_COLOURS`.
- Existing global state variables are reused: `_portfolioSnapshots`, `_portfolioLeadCount`, `_portfolioSelectedClient`, `_portfolioBottomAttentionExpanded`, `_cachedTeamMembers`, `_milestonesCache`, `_apiClientsCache`.

---

## File Structure

All changes are in a single file:

- **Modify:** `nbi_project_dashboard.html`
  - CSS: Replace lines ~415-609 (portfolio CSS block) with new v5 CSS
  - CSS: Lines ~186-225 (Command theme block) — minor additions
  - JS: Replace lines ~5472-6245 (all portfolio render functions) with v5 versions
  - JS: Line ~22475 (THEMES array) — add Command entry
  - JS: Lines ~3052-3058 — remove `_portfolioBottomAttentionExpanded` (no longer needed, scrollable panel replaces truncation)
  - JS: Lines ~3152-3154 — remove Gantt zoom/nav functions (timeline removed)

No new files created. No backend changes.

---

### Task 1: Replace Portfolio CSS Block

**Files:**
- Modify: `nbi_project_dashboard.html:415-609` (CSS section)

The old `.pf__*` CSS supports a sidebar+panels layout. Replace it entirely with v5 CSS that supports: KPI grid, client table, 3-col panel grid, 2-col panel grid, neumorphic cards, inset wells, health diamonds, workload bars, attention items, milestone rows, alert banner.

All colours use theme variables (`--bg-card`, `--text-primary`, `--accent`, `--danger`, `--warning`, `--success`, `--border-default`, `--shadow-sm/md/lg`). The neumorphic depth comes from `--shadow-sm/md/lg` which every theme already defines. Only Command theme gets hex grid and backdrop-filter.

- [ ] **Step 1: Replace the portfolio CSS block (lines 415-609)**

Delete everything from `.pf {` (line 415) through the `}` closing the `@media (max-width: 768px)` block (line 609), KEEPING the milestone detail CSS block (lines 537-556 — `.ms-detail-*` and `.client-ms-card*` classes). Then insert the following CSS in its place:

```css
/* ===== PORTFOLIO v5 — Neumorphic layout ===== */
.pf { max-width: 2200px; margin: 0 auto; padding: 28px 36px 60px; display: flex; flex-direction: column; gap: 24px; }

/* Alert banner */
.pf__alert { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 0 4px; }
.pf__alert-pill { display: flex; align-items: center; gap: 10px; padding: 12px 20px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); font-size: 0.88rem; font-weight: 700; color: var(--danger); }
.pf__alert-dot { width: 10px; height: 10px; background: var(--danger); border-radius: 50%; box-shadow: 0 0 12px rgba(255,71,87,0.25); animation: pf-pulse 2s infinite; }
@keyframes pf-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

/* KPI row — 5 cards */
.pf__kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px; }
.pf__kpi { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); padding: 18px 26px 22px; cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; min-height: 160px; transition: box-shadow 0.25s, transform 0.2s; }
.pf__kpi:hover { box-shadow: var(--shadow-md); transform: translateY(-3px); }
.pf__kpi:active { box-shadow: inset 3px 3px 8px rgba(0,0,0,0.15); transform: translateY(0); transition-duration: 0.08s; }
.pf__kpi-label { font-size: 0.82rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.pf__kpi-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.pf__kpi-val { font-size: 3.5rem; font-weight: 700; font-family: var(--font-mono); line-height: 1; letter-spacing: -0.04em; color: var(--text-primary); }
.pf__kpi-delta-row { display: flex; align-items: center; gap: 8px; }
.pf__kpi-delta { display: flex; align-items: center; gap: 4px; font-size: 1rem; font-weight: 700; }
.pf__kpi-delta-text { font-size: 0.82rem; font-weight: 500; color: var(--text-muted); }

/* Client table */
.pf__tbl-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
.pf__tbl-hdr { padding: 18px 28px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.pf__tbl-title { font-size: 1.05rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
.pf__tbl { width: 100%; border-collapse: collapse; }
.pf__tbl th { text-align: left; padding: 14px 28px; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-faint); border-bottom: 1px solid var(--border-subtle); }
.pf__tbl td { padding: 20px 28px; font-size: 1.05rem; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
.pf__tbl tbody tr { cursor: pointer; transition: background 0.15s; }
.pf__tbl tbody tr:hover { background: var(--accent-glow); }
.pf__tbl tbody tr:active { background: color-mix(in srgb, var(--accent-glow) 200%, transparent); }
.pf__tbl-health { width: 14px; height: 14px; border-radius: 2px; transform: rotate(45deg); box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2); }
.pf__tbl-health--r { background: var(--danger); box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2), 0 0 8px rgba(255,71,87,0.35); }
.pf__tbl-health--y { background: var(--warning); box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2), 0 0 8px rgba(255,165,2,0.3); }
.pf__tbl-health--g { background: var(--success); box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2), 0 0 8px rgba(46,213,115,0.25); }
.pf__tbl-name { font-size: 1.05rem; font-weight: 700; }
.pf__tbl-count { font-size: 0.82rem; font-weight: 500; color: var(--text-muted); margin-left: 12px; }
.pf__tbl-inactive { opacity: 0.35; }
.pf__tbl-risk { font-size: 0.95rem; font-weight: 600; }
.pf__tbl-risk--ok { color: var(--text-muted); }
.pf__tbl-risk--mid { color: var(--warning); }
.pf__tbl-risk--bad { color: var(--danger); text-shadow: 0 0 10px rgba(255,71,87,0.2); }

/* Inset well (progress bar tracks, backlog bar) */
.pf__well { background: var(--bg-input); border-radius: var(--radius-sm); box-shadow: inset 3px 3px 6px rgba(0,0,0,0.2), inset -1px -1px 3px rgba(255,255,255,0.02); }

/* Progress bar fill with glow */
.pf__bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.pf__bar-fill--r { background: linear-gradient(90deg, var(--danger), color-mix(in srgb, var(--danger) 70%, white)); box-shadow: 0 0 10px rgba(255,71,87,0.3); }
.pf__bar-fill--y { background: linear-gradient(90deg, var(--warning), color-mix(in srgb, var(--warning) 70%, white)); box-shadow: 0 0 10px rgba(255,165,2,0.25); }
.pf__bar-fill--g { background: linear-gradient(90deg, var(--success), color-mix(in srgb, var(--success) 70%, white)); box-shadow: 0 0 10px rgba(46,213,115,0.25); }
.pf__bar-fill--c { background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, white)); box-shadow: 0 0 10px var(--accent-glow); }

/* Panel grid */
.pf__pgrid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
.pf__pgrid--2 { grid-template-columns: 1fr 1fr; }
.pf__panel { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; display: flex; flex-direction: column; max-height: 420px; }
.pf__panel-hdr { padding: 18px 24px 14px; display: flex; align-items: center; justify-content: center; gap: 16px; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; }
.pf__panel-title { font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.pf__panel-badge { font-size: 0.82rem; font-weight: 700; font-family: var(--font-mono); padding: 5px 12px; background: var(--bg-input); border-radius: 8px; box-shadow: inset 2px 2px 5px rgba(0,0,0,0.15); }
.pf__panel-body { padding: 16px 24px 22px; flex: 1; overflow-y: auto; min-height: 0; }
.pf__panel-body::-webkit-scrollbar { width: 6px; }
.pf__panel-body::-webkit-scrollbar-track { background: transparent; }
.pf__panel-body::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 3px; }
.pf__panel-body::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.35); }

/* Attention items (Needs Attention panel) */
.pf__attn { display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin: 4px -16px; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; }
.pf__attn:hover { background: var(--accent-glow); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
.pf__attn:active { box-shadow: inset 2px 2px 5px rgba(0,0,0,0.15); transform: translateY(0); }
.pf__attn-bar { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
.pf__attn-badge { font-size: 0.82rem; font-weight: 700; padding: 6px 12px; border-radius: 3px; letter-spacing: 0.06em; white-space: nowrap; flex-shrink: 0; box-shadow: inset 2px 2px 5px rgba(0,0,0,0.15); }
.pf__attn-badge--blk { background: var(--danger-bg); color: var(--danger); }
.pf__attn-badge--ovd { background: var(--danger-bg); color: var(--danger); }
.pf__attn-info { flex: 1; min-width: 0; }
.pf__attn-name { font-size: 0.95rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pf__attn-sub { font-size: 0.82rem; color: var(--text-muted); margin-top: 3px; }
.pf__attn-who { font-size: 0.82rem; font-weight: 600; color: var(--accent-text); flex-shrink: 0; }

/* Workload bars */
.pf__wl { display: flex; align-items: center; gap: 14px; padding: 9px 0; }
.pf__wl-name { font-size: 0.95rem; font-weight: 500; width: 120px; flex-shrink: 0; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pf__wl-trk { flex: 1; height: 18px; border-radius: 3px; overflow: hidden; position: relative; }
.pf__wl-ct { font-size: 1.05rem; font-weight: 700; font-family: var(--font-mono); width: 40px; text-align: right; flex-shrink: 0; }

/* Milestone rows */
.pf__msl { display: flex; align-items: center; gap: 16px; padding: 16px; margin: 4px -16px; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; }
.pf__msl:hover { background: var(--accent-glow); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
.pf__msl:active { box-shadow: inset 2px 2px 5px rgba(0,0,0,0.15); transform: translateY(0); }
.pf__msl-marker { width: 44px; height: 44px; background: var(--bg-input); border-radius: var(--radius-sm); box-shadow: inset 3px 3px 6px rgba(0,0,0,0.2), inset -1px -1px 3px rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pf__msl-dot { width: 12px; height: 12px; border-radius: 50%; }
.pf__msl-info { flex: 1; min-width: 0; }
.pf__msl-title { font-size: 1.05rem; font-weight: 700; }
.pf__msl-sub { font-size: 0.82rem; color: var(--text-muted); margin-top: 3px; }
.pf__msl-r { text-align: right; flex-shrink: 0; }
.pf__msl-days { font-size: 1.4rem; font-weight: 700; font-family: var(--font-mono); }
.pf__msl-dt { font-size: 0.82rem; color: var(--text-muted); margin-top: 4px; }

/* Near Completion panel (empty state) */
.pf__empty { text-align: center; color: var(--text-muted); padding: 24px; }
.pf__empty-title { font-size: 0.95rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.pf__empty-sub { font-size: 0.82rem; }

/* Responsive */
@media (max-width: 1400px) { .pf__pgrid { grid-template-columns: 1fr 1fr; } .pf__pgrid--2 { grid-template-columns: 1fr 1fr; } }
@media (max-width: 1200px) { .pf__kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px) { .pf__pgrid { grid-template-columns: 1fr; } .pf__pgrid--2 { grid-template-columns: 1fr; } .pf__kpis { grid-template-columns: 1fr 1fr; } .pf { padding: 16px 16px 40px; } }
@media (max-width: 600px) { .pf__kpis { grid-template-columns: 1fr; } }
```

Also keep the milestone detail CSS (`.ms-detail-*`, `.client-ms-card*`) and the existing `.kpi-card` classes that follow it — those are used by other views.

- [ ] **Step 2: Update Command theme CSS (lines ~220-225)**

Replace the existing Command theme portfolio overrides:

```css
html[data-theme="command"] .pf__kpi,
html[data-theme="command"] .pf__panel,
html[data-theme="command"] .pf__tbl-card {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
```

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "refactor: replace portfolio v4 CSS with v5 neumorphic layout styles"
```

---

### Task 2: Rewrite Orchestrator + KPI Strip + Alert Banner

**Files:**
- Modify: `nbi_project_dashboard.html:5472-5558` (renderPortfolioDashboard + renderPfStrip)

- [ ] **Step 1: Rewrite `renderPortfolioDashboard()` (replacing lines 5472-5524)**

The new layout structure removes the sidebar and adds a client table. The function now calls different sub-functions in a different layout:

```javascript
// ===== PORTFOLIO DASHBOARD v5 — Neumorphic KPI + table + panels =====
function renderPortfolioDashboard() {
  const filtered = getFilteredTasks();
  const now = new Date(); now.setHours(0,0,0,0);

  const roots = filtered.filter(t => !t.parentId && t.title && t.title.trim() !== 'New Task');
  const activeRoots = roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const overdueTasks = filtered.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
  const blockedTasks = filtered.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
  const atRiskTasks = filtered.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');

  const needsAttentionCount = overdueTasks.length;
  const uniqueProblemIds = new Set([...overdueTasks.map(t => t.id), ...atRiskTasks.map(t => t.id)]);
  const onTrackCount = Math.max(0, activeRoots.length - uniqueProblemIds.size);

  const snap7 = _portfolioSnapshots ? _portfolioSnapshots.find(s => {
    const d = new Date(s.snapshot_date);
    const ago = new Date(now); ago.setDate(ago.getDate() - 7);
    return d.toISOString().slice(0,10) === ago.toISOString().slice(0,10);
  }) : null;

  const panelTasks = _portfolioSelectedClient
    ? filtered.filter(t => getTaskClient(t) === _portfolioSelectedClient)
    : filtered;
  const panelRoots = _portfolioSelectedClient
    ? roots.filter(r => getTaskClient(r) === _portfolioSelectedClient)
    : roots;

  let html = '<div class="pf">';
  html += renderPfAlertBanner(blockedTasks);
  html += renderPfStrip(activeRoots.length, onTrackCount, needsAttentionCount, atRiskTasks.length, snap7);
  html += renderPfClientTable(filtered, roots, now);

  html += '<div class="pf__pgrid">';
  html += renderPfProgressStatus(panelTasks);
  html += renderPfNeedsAttention(panelTasks, now);
  html += renderPfMilestones(panelRoots, now);
  html += '</div>';

  html += '<div class="pf__pgrid pf__pgrid--2">';
  html += renderPfTeamWorkload(panelTasks);
  html += renderPfCompletingSoon(panelRoots, now);
  html += '</div>';

  html += '</div>';
  return html;
}
```

- [ ] **Step 2: Rewrite `renderPfStrip()` (replacing lines 5529-5558)**

5 KPI cards with big centred numbers and week-over-week deltas. The 5th card shows milestone count + days to nearest milestone.

```javascript
function renderPfStrip(activeCount, onTrackCount, needsAttentionCount, atRiskCount, snap7) {
  function delta(current, field, invertGood) {
    if (!snap7) return '';
    const prev = parseFloat(snap7[field]) || 0;
    const diff = current - prev;
    if (diff === 0) return '';
    const arrow = diff > 0 ? '▲' : '▼';
    const sign = diff > 0 ? '+' : '';
    const isGood = invertGood ? diff < 0 : diff > 0;
    const col = isGood ? 'var(--success)' : 'var(--danger)';
    return `<span class="pf__kpi-delta" style="color:${col}">${arrow} ${sign}${Math.round(diff)}</span><span class="pf__kpi-delta-text">vs last week</span>`;
  }

  // Milestone info for 5th KPI
  const allMs = [];
  const now = new Date(); now.setHours(0,0,0,0);
  Object.entries(_milestonesCache).forEach(([clientId, milestones]) => {
    milestones.forEach(ms => {
      const d = safeParseDate(ms.target_date);
      if (d && d >= now) allMs.push({ title: ms.title, days: Math.ceil((d - now) / 86400000) });
    });
  });
  allMs.sort((a, b) => a.days - b.days);
  const nearestMs = allMs[0];

  const items = [
    { val: activeCount, label: 'Active Engagements', style: '', delta: delta(activeCount, 'active_projects', false) },
    { val: onTrackCount, label: 'On Track', style: '', delta: delta(onTrackCount, 'on_track_count', false) },
    { val: needsAttentionCount, label: 'Needs Attention', style: `color:var(--warning)`, delta: delta(needsAttentionCount, 'overdue_count', true) },
    { val: atRiskCount, label: 'At Risk', style: `color:var(--danger);text-shadow:0 0 20px rgba(255,71,87,0.2)`, delta: delta(atRiskCount, 'at_risk_count', true) },
  ];

  let html = '<div class="pf__kpis">';
  items.forEach(i => {
    html += `<div class="pf__kpi">`;
    html += `<div class="pf__kpi-label">${i.label}</div>`;
    html += `<div class="pf__kpi-center">`;
    html += `<div class="pf__kpi-val"${i.style ? ` style="${i.style}"` : ''}>${i.val}</div>`;
    if (i.delta) html += `<div class="pf__kpi-delta-row">${i.delta}</div>`;
    html += `</div></div>`;
  });

  // 5th KPI: Upcoming Milestones
  html += `<div class="pf__kpi">`;
  html += `<div class="pf__kpi-label">Upcoming Milestones</div>`;
  html += `<div class="pf__kpi-center">`;
  html += `<div class="pf__kpi-val">${allMs.length}</div>`;
  if (nearestMs) {
    html += `<div class="pf__kpi-delta-row"><span style="font-size:0.95rem;font-weight:600;color:var(--text-secondary)">Next in ${nearestMs.days}d</span></div>`;
    html += `<div class="pf__kpi-delta-text">${esc(nearestMs.title)}</div>`;
  }
  html += `</div></div>`;

  html += '</div>';
  return html;
}
```

- [ ] **Step 3: Add `renderPfAlertBanner()` (new function, after renderPfStrip)**

Shows a pulsing red dot + blocked count when any client has blocked items.

```javascript
function renderPfAlertBanner(blockedTasks) {
  if (blockedTasks.length === 0) return '';
  const byClient = {};
  blockedTasks.forEach(t => {
    const c = getTaskClient(t) || 'Unknown';
    byClient[c] = (byClient[c] || 0) + 1;
  });
  const worst = Object.entries(byClient).sort((a, b) => b[1] - a[1])[0];
  const text = blockedTasks.length + ' blocked item' + (blockedTasks.length !== 1 ? 's' : '') + ' — ' + worst[0];
  return `<div class="pf__alert"><div class="pf__alert-pill"><div class="pf__alert-dot"></div>${esc(text)}</div></div>`;
}
```

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: portfolio v5 orchestrator, KPI strip, and alert banner"
```

---

### Task 3: New Client Portfolio Table

**Files:**
- Modify: `nbi_project_dashboard.html` (new function, replacing renderPfSidebar)

- [ ] **Step 1: Replace `renderPfSidebar()` with `renderPfClientTable()`**

Delete the old `renderPfSidebar()` function (lines ~5560-5630). In its place, write the client portfolio table that shows health diamond, client name + task count, progress bar, and key risk for each client. Inactive/complete clients are greyed out at the bottom. Rows sorted: red first, then amber, then green. Clicking a row calls `selectPortfolioClient`.

```javascript
function renderPfClientTable(filtered, roots, now) {
  const clientMap = {};
  roots.forEach(r => {
    const client = getTaskClient(r);
    if (!client) return;
    if (!clientMap[client]) clientMap[client] = { tasks: [], roots: [] };
    clientMap[client].roots.push(r);
  });
  Object.values(_apiClientsCache || {}).forEach(c => {
    if (c && c.name && !clientMap[c.name]) clientMap[c.name] = { tasks: [], roots: [] };
  });
  Object.keys(clientMap).forEach(name => {
    clientMap[name].tasks = filtered.filter(t => getTaskClient(t) === name);
  });

  // Compute per-client stats
  const rows = Object.entries(clientMap).map(([name, data]) => {
    const allTasks = data.tasks;
    const total = allTasks.length;
    const done = allTasks.filter(t => t.status === 'Done').length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    const active = data.roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
    const blocked = allTasks.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
    const overdue = allTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
    const atRisk = allTasks.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');
    const yellow = allTasks.filter(t => t.healthState === 'Yellow' && t.status !== 'Done' && t.status !== 'Cancelled');
    const isInactive = active.length === 0;
    const health = blocked.length > 0 || atRisk.length > 0 ? 'r' : yellow.length > 0 || overdue.length > 0 ? 'y' : 'g';

    let risk = '', riskClass = 'pf__tbl-risk--ok';
    if (blocked.length > 0 || overdue.length > 0) {
      const parts = [];
      if (blocked.length > 0) parts.push(blocked.length + ' blocked');
      if (overdue.length > 0) parts.push(overdue.length + ' overdue');
      risk = parts.join(', ');
      riskClass = 'pf__tbl-risk--bad';
    } else if (yellow.length > 0) {
      risk = yellow.length + ' item' + (yellow.length !== 1 ? 's' : '') + ' yellow';
      riskClass = 'pf__tbl-risk--mid';
    } else if (isInactive) {
      risk = 'Complete';
      riskClass = 'pf__tbl-risk--ok';
    } else {
      risk = 'Clear';
      riskClass = 'pf__tbl-risk--ok';
    }

    const barClass = pct >= 80 ? 'pf__bar-fill--g' : health === 'r' ? 'pf__bar-fill--r' : health === 'y' ? 'pf__bar-fill--y' : pct > 0 ? 'pf__bar-fill--g' : '';
    const pctCol = health === 'r' ? 'var(--danger)' : health === 'y' ? 'var(--warning)' : pct > 0 ? 'var(--success)' : 'var(--text-muted)';

    return { name, total, pct, health, isInactive, risk, riskClass, barClass, pctCol, healthSort: health === 'r' ? 0 : health === 'y' ? 1 : 2 };
  });

  // Sort: red first, then amber, then green; inactive at bottom
  rows.sort((a, b) => {
    if (a.isInactive !== b.isInactive) return a.isInactive ? 1 : -1;
    if (a.healthSort !== b.healthSort) return a.healthSort - b.healthSort;
    return a.name.localeCompare(b.name);
  });

  const isSelected = name => _portfolioSelectedClient === name;

  let html = '<div class="pf__tbl-card">';
  html += '<div class="pf__tbl-hdr"><span class="pf__tbl-title">Client Portfolio</span></div>';
  html += '<table class="pf__tbl"><thead><tr>';
  html += '<th style="width:60px">Health</th><th>Client</th><th style="min-width:220px">Progress</th><th>Key Risk</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(r => {
    const sel = isSelected(r.name) ? 'outline:2px solid var(--accent);outline-offset:-2px;' : '';
    const inactive = r.isInactive ? ' class="pf__tbl-inactive"' : '';
    html += `<tr${inactive} style="${sel}" data-action="selectPortfolioClient" data-arg0="${esc(r.name)}">`;
    html += `<td><div class="pf__tbl-health pf__tbl-health--${r.health}"></div></td>`;
    html += `<td><span class="pf__tbl-name">${esc(r.name)}</span><span class="pf__tbl-count">${r.total} tasks</span></td>`;
    html += `<td><div style="display:flex;align-items:center;gap:14px">`;
    html += `<div class="pf__well" style="flex:1;height:18px;padding:0;overflow:hidden;border-radius:2px">`;
    html += `<div class="pf__bar-fill ${r.barClass}" style="width:${r.pct}%"></div></div>`;
    html += `<span style="font-family:var(--font-mono);font-size:1.05rem;font-weight:700;color:${r.pctCol};min-width:44px;text-align:right">${r.pct}%</span>`;
    html += `</div></td>`;
    html += `<td><span class="pf__tbl-risk ${r.riskClass}">${esc(r.risk)}</span></td>`;
    html += `</tr>`;
  });

  html += '</tbody></table></div>';
  return html;
}
```

- [ ] **Step 2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: portfolio v5 client table with health diamonds and progress bars"
```

---

### Task 4: Rewrite Panel Row 1 — Status Overview, Needs Attention, Milestones

**Files:**
- Modify: `nbi_project_dashboard.html` (replacing renderPfProgressStatus, renderPfBottomNeedsAttention, renderPfMilestones)

- [ ] **Step 1: Rewrite `renderPfProgressStatus()` (lines ~5635-5722)**

Backlog bar on left + WIP donut on right. Uses SVG for the donut ring with neumorphic track.

```javascript
function renderPfProgressStatus(panelTasks) {
  const active = panelTasks.filter(t => t.status !== 'Cancelled');
  const total = active.length;
  if (total === 0) {
    return '<div class="pf__panel"><div class="pf__panel-hdr"><span class="pf__panel-title">Status Overview</span></div><div class="pf__panel-body"><div class="pf__empty"><div class="pf__empty-title">No tasks found</div></div></div></div>';
  }

  const buckets = [
    { key: 'done', label: 'Completed', colour: 'var(--success)', hex: '#2ed573', count: 0 },
    { key: 'inprogress', label: 'In Progress', colour: 'var(--accent)', hex: '#00d4ff', count: 0 },
    { key: 'planning', label: 'Planning', colour: 'var(--warning)', hex: '#ffa502', count: 0 },
    { key: 'blocked', label: 'Blocked', colour: 'var(--danger)', hex: '#ff4757', count: 0 },
  ];

  let backlogCount = 0;
  active.forEach(t => {
    if (t.status === 'Blocked' || t.healthState === 'Blocked') buckets[3].count++;
    else if (t.status === 'Done') buckets[0].count++;
    else if (t.status === 'In progress') buckets[1].count++;
    else if (t.status === 'Planning') buckets[2].count++;
    else backlogCount++;
  });

  const wipTotal = buckets.reduce((s, b) => s + b.count, 0);
  const backlogPct = total > 0 ? Math.round(backlogCount / total * 100) : 0;
  const nonZero = buckets.filter(b => b.count > 0);

  // Backlog bar HTML
  const backlogFillPct = total > 0 ? Math.round(backlogCount / total * 100) : 0;
  let backlogHtml = '<div style="flex-shrink:0;text-align:center">';
  backlogHtml += `<div class="pf__well" style="width:90px;height:200px;display:flex;flex-direction:column;justify-content:flex-end;padding:0">`;
  backlogHtml += `<div style="height:${backlogFillPct}%;background:rgba(148,163,184,0.18);border-radius:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:${backlogCount > 0 ? '50px' : '0'}">`;
  backlogHtml += `<div style="font-family:var(--font-mono);font-size:2rem;font-weight:700;color:var(--text-primary)">${backlogCount}</div>`;
  backlogHtml += `<div style="font-size:0.82rem;font-weight:700;color:var(--text-muted);margin-top:8px;letter-spacing:0.08em">BACKLOG</div>`;
  backlogHtml += `</div></div>`;
  backlogHtml += `<div style="font-size:0.82rem;font-weight:500;color:var(--text-muted);margin-top:8px">${backlogPct}%</div>`;
  backlogHtml += '</div>';

  // Donut SVG
  const r = 70, sw = 24, circ = 2 * Math.PI * r;
  let donutSvg = `<svg viewBox="0 0 180 180" width="160" height="160" style="flex-shrink:0">`;
  // Track ring (neumorphic inset)
  donutSvg += `<circle cx="90" cy="90" r="${r}" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="${sw + 4}"/>`;
  donutSvg += `<circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--bg-input)" stroke-width="${sw}"/>`;
  donutSvg += `<circle cx="90" cy="90" r="${r}" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="${sw}" stroke-dasharray="${circ/2} ${circ/2}" transform="rotate(-90 90 90)"/>`;

  if (wipTotal > 0) {
    let offset = 0;
    nonZero.forEach(b => {
      const pct = b.count / wipTotal;
      const dashLen = pct * circ;
      const gap = nonZero.length > 1 ? 3 : 0;
      const drawLen = Math.max(0, dashLen - gap);
      const rot = -90 + (offset / circ * 360);
      donutSvg += `<circle cx="90" cy="90" r="${r}" fill="none" stroke="${b.hex}" stroke-width="${sw}" stroke-dasharray="${drawLen.toFixed(1)} ${(circ - drawLen).toFixed(1)}" transform="rotate(${rot.toFixed(1)} 90 90)" style="filter:drop-shadow(0 0 4px ${b.hex}40)"/>`;
      offset += dashLen;
    });
  }
  donutSvg += `<text x="90" y="84" text-anchor="middle" fill="var(--text-primary)" font-family="var(--font-mono)" font-weight="700" font-size="30">${wipTotal}</text>`;
  donutSvg += `<text x="90" y="106" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-body)" font-weight="700" font-size="14" letter-spacing="1.5">ACTIVE</text>`;
  donutSvg += '</svg>';

  // Legend
  let legendHtml = '<div style="display:flex;flex-direction:column;gap:14px">';
  nonZero.forEach(b => {
    legendHtml += `<div style="display:flex;align-items:center;gap:12px">`;
    legendHtml += `<div style="width:18px;height:18px;background:${b.colour};border-radius:3px;flex-shrink:0;box-shadow:var(--shadow-sm)"></div>`;
    legendHtml += `<span style="font-family:var(--font-mono);font-size:1.05rem;font-weight:700;min-width:30px">${b.count}</span>`;
    legendHtml += `<span style="font-size:0.95rem;font-weight:500;color:var(--text-secondary)">${b.label}</span>`;
    legendHtml += `</div>`;
  });
  legendHtml += '</div>';

  let html = '<div class="pf__panel">';
  html += `<div class="pf__panel-hdr"><span class="pf__panel-title">Status Overview</span><span class="pf__panel-badge" style="color:var(--text-secondary)">${total} items</span></div>`;
  html += `<div class="pf__panel-body" style="display:flex;align-items:center;justify-content:center;gap:72px">`;
  html += backlogHtml;
  html += `<div style="flex:0 0 auto;display:flex;align-items:center;gap:24px">${donutSvg}${legendHtml}</div>`;
  html += '</div></div>';
  return html;
}
```

- [ ] **Step 2: Write new `renderPfNeedsAttention()` (replacing renderPfBottomNeedsAttention)**

Delete old `renderPfBottomNeedsAttention()` (lines ~6195-6245). Write new version that shows ALL blocked/overdue items (no truncation), is scrollable, with red side bars + BLOCKED/OVERDUE badges.

```javascript
function renderPfNeedsAttention(panelTasks, now) {
  const blocked = panelTasks.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
  const overdue = panelTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now && t.healthState !== 'Blocked' && t.status !== 'Blocked');
  overdue.sort((a, b) => safeParseDate(a.dueDate) - safeParseDate(b.dueDate));
  const items = [...blocked, ...overdue];
  const seen = new Set();
  const unique = items.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });

  let html = '<div class="pf__panel">';
  html += `<div class="pf__panel-hdr"><span class="pf__panel-title" style="color:var(--danger)">Needs Attention</span><span class="pf__panel-badge" style="color:var(--danger)">${unique.length}</span></div>`;
  html += '<div class="pf__panel-body">';

  if (unique.length === 0) {
    html += '<div class="pf__empty"><div class="pf__empty-title" style="color:var(--success)">All clear</div></div>';
  } else {
    unique.forEach(t => {
      const parent = t.parentId ? tasks.find(p => p.id === t.parentId) : null;
      const clientName = getTaskClient(t) || '';
      const projectName = parent ? parent.title : '';
      const ctx = [clientName, projectName].filter(Boolean).join(' — ');
      const owner = (t.assignees || []).join(', ');
      const isBlocked = t.healthState === 'Blocked' || t.status === 'Blocked';
      const badge = isBlocked ? 'BLOCKED' : 'OVERDUE';
      const badgeClass = isBlocked ? 'pf__attn-badge--blk' : 'pf__attn-badge--ovd';

      html += `<div class="pf__attn" data-action="openDetailOverlay" data-arg0="${t.id}">`;
      html += `<div class="pf__attn-bar" style="background:var(--danger);box-shadow:0 0 6px var(--danger-bg)"></div>`;
      html += `<span class="pf__attn-badge ${badgeClass}">${badge}</span>`;
      html += `<div class="pf__attn-info"><div class="pf__attn-name">${esc(t.title)}</div>`;
      if (ctx) html += `<div class="pf__attn-sub">${esc(ctx)}</div>`;
      html += `</div>`;
      if (owner) html += `<span class="pf__attn-who">${esc(owner)}</span>`;
      html += `</div>`;
    });
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 3: Rewrite `renderPfMilestones()` (lines ~5727-5803)**

Keep the data logic (milestone collection, filtering, sorting) but restyle with neumorphic markers.

```javascript
function renderPfMilestones(panelRoots, now) {
  const allMilestones = [];
  Object.entries(_milestonesCache).forEach(([clientId, milestones]) => {
    const clientObj = Object.values(_apiClientsCache || {}).find(c => c.id === clientId);
    const clientName = clientObj ? clientObj.name : '';
    milestones.forEach(ms => {
      allMilestones.push({ ...ms, _clientName: clientName });
    });
  });

  const filtered = _portfolioSelectedClient
    ? allMilestones.filter(ms => ms._clientName === _portfolioSelectedClient)
    : allMilestones;

  filtered.sort((a, b) => {
    const da = safeParseDate(a.target_date) || new Date(9999, 0);
    const db = safeParseDate(b.target_date) || new Date(9999, 0);
    return da - db;
  });

  let html = '<div class="pf__panel">';
  html += `<div class="pf__panel-hdr"><span class="pf__panel-title">Milestones</span><span class="pf__panel-badge" style="color:var(--accent-text)">${filtered.length}</span></div>`;
  html += '<div class="pf__panel-body">';

  if (filtered.length === 0) {
    html += '<div class="pf__empty"><div class="pf__empty-title">No milestones set</div></div>';
  } else {
    filtered.forEach(ms => {
      const target = safeParseDate(ms.target_date);
      const isOverdue = target && target < now;
      const daysUntil = target ? Math.ceil((target - now) / 86400000) : null;

      let dotCol, daysCol;
      if (isOverdue) {
        dotCol = 'var(--danger)'; daysCol = 'var(--danger)';
      } else if (daysUntil !== null && daysUntil <= 14) {
        dotCol = 'var(--warning)'; daysCol = 'var(--warning)';
      } else {
        dotCol = 'var(--success)'; daysCol = 'var(--success)';
      }

      const dateStr = target ? target.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
      const daysLabel = isOverdue ? Math.abs(daysUntil) + 'd late' : (daysUntil !== null ? daysUntil + 'd' : '');
      const clientObj = Object.values(_apiClientsCache || {}).find(c => c.name === ms._clientName);
      const clientId = clientObj ? clientObj.id : '';

      html += `<div class="pf__msl" data-action="openMilestoneDetail" data-arg0="${clientId}" data-arg1="${ms.id}">`;
      html += `<div class="pf__msl-marker"><div class="pf__msl-dot" style="background:${dotCol};box-shadow:0 0 10px ${dotCol}"></div></div>`;
      html += `<div class="pf__msl-info"><div class="pf__msl-title">${esc(ms.title)}</div><div class="pf__msl-sub">${esc(ms._clientName)}</div></div>`;
      html += `<div class="pf__msl-r"><div class="pf__msl-days" style="color:${daysCol}">${daysLabel}</div><div class="pf__msl-dt">${dateStr}</div></div>`;
      html += `</div>`;
    });

    if (filtered.length <= 2) {
      html += `<div style="padding:16px;text-align:center;color:var(--text-faint);font-size:0.82rem">No other clients have milestones set</div>`;
    }
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: portfolio v5 status overview, needs attention, and milestones panels"
```

---

### Task 5: Rewrite Panel Row 2 — Team Workload + Near Completion

**Files:**
- Modify: `nbi_project_dashboard.html` (replacing renderPfTeamWorkload, renderPfCompletingSoon)

- [ ] **Step 1: Rewrite `renderPfTeamWorkload()` (lines ~6156-6193)**

NBI staff only at portfolio level (filtered via `_cachedTeamMembers`). All bars use cyan (neutral). Inset well tracks with glowing gradient fill.

```javascript
function renderPfTeamWorkload(panelTasks) {
  const activeTasks = panelTasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
  const activeStaff = new Set(_cachedTeamMembers || []);
  const personMap = {};
  activeTasks.forEach(t => {
    (t.assignees || []).forEach(a => {
      if (activeStaff.size > 0 && !activeStaff.has(a)) return;
      if (!personMap[a]) personMap[a] = 0;
      personMap[a]++;
    });
  });
  const sorted = Object.entries(personMap).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  let html = '<div class="pf__panel">';
  html += `<div class="pf__panel-hdr"><span class="pf__panel-title">Team Workload</span><span class="pf__panel-badge" style="color:var(--accent-text)">${sorted.length}</span></div>`;
  html += '<div class="pf__panel-body">';

  if (sorted.length === 0) {
    html += '<div class="pf__empty"><div class="pf__empty-title">No assigned tasks</div></div>';
  } else {
    sorted.forEach(([name, count]) => {
      const barW = Math.round(count / maxCount * 100);
      html += `<div class="pf__wl">`;
      html += `<span class="pf__wl-name">${esc(name)}</span>`;
      html += `<div class="pf__wl-trk pf__well"><div class="pf__bar-fill pf__bar-fill--c" style="width:${barW}%"></div></div>`;
      html += `<span class="pf__wl-ct" style="color:var(--accent-text)">${count}</span>`;
      html += `</div>`;
    });
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 2: Rewrite `renderPfCompletingSoon()` (lines ~6088-6120)**

Restyle as "Near Completion" panel. Shows projects at 60-99% completion.

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
  html += `<div class="pf__panel-hdr"><span class="pf__panel-title" style="color:var(--success)">Near Completion</span><span class="pf__panel-badge" style="color:var(--success)">${nearComplete.length}</span></div>`;
  html += '<div class="pf__panel-body">';

  if (nearComplete.length === 0) {
    html += '<div class="pf__empty" style="display:flex;align-items:center;justify-content:center;min-height:100px"><div><div class="pf__empty-title">No projects near completion</div><div class="pf__empty-sub">Most active work is early-stage</div></div></div>';
  } else {
    nearComplete.forEach(r => {
      html += `<div class="pf__wl" style="cursor:pointer" data-action="openDetailOverlay" data-arg0="${r.id}">`;
      html += `<span class="pf__wl-name">${esc(r.title)}</span>`;
      html += `<div class="pf__wl-trk pf__well"><div class="pf__bar-fill pf__bar-fill--g" style="width:${r._pct}%"></div></div>`;
      html += `<span class="pf__wl-ct" style="color:var(--success)">${r._pct}%</span>`;
      html += `</div>`;
    });
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: portfolio v5 team workload and near completion panels"
```

---

### Task 6: Cleanup — Delete Dead Code + Add Command Theme

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Delete `renderPfTimeline()` (lines ~5805-6086)**

This function is ~280 lines and is no longer called by the v5 orchestrator. Delete it entirely. Also delete the related `renderPfUpcomingMilestones()` function (lines ~6122-6154) which is also unused.

- [ ] **Step 2: Delete `_portfolioBottomAttentionExpanded` and `_actSetPortfolioBottomExpanded`**

Remove `let _portfolioBottomAttentionExpanded = false;` from line ~3058 and the action handler `function _actSetPortfolioBottomExpanded()` from line ~2907. The v5 panel scrolls instead of truncating.

- [ ] **Step 3: Delete Gantt zoom/nav functions**

Remove `pfGanttZoom`, `pfGanttNav`, `pfGanttToday` (line ~3152-3154) and associated state variables `_pfGanttDayWidth`, `_pfGanttOffsetDays` (search for these and remove their declarations).

- [ ] **Step 4: Add Command to THEMES array (line ~22475)**

Add the Command theme entry to the array:

```javascript
const THEMES = [
  { id: 'dark',      label: 'Dark',      group: 'default', swatches: ['#0a0a0a','#e8e8e8','#0066FF','#2a2a2a'] },
  { id: 'light',     label: 'Light',     group: 'default', swatches: ['#f5f5f7','#1a1a1a','#0055dd','#d1d1d6'] },
  { id: 'midnight',  label: 'Midnight',  group: 'extra',   swatches: ['#0f172a','#e2e8f0','#38bdf8','#2d4a6f'] },
  { id: 'nord',      label: 'Nord',      group: 'extra',   swatches: ['#2e3440','#eceff4','#88c0d0','#4c566a'] },
  { id: 'solarized', label: 'Solarized', group: 'extra',   swatches: ['#002b36','#fdf6e3','#b58900','#1a5c6e'] },
  { id: 'dracula',   label: 'Dracula',   group: 'extra',   swatches: ['#282a36','#f8f8f2','#bd93f9','#44475a'] },
  { id: 'emerald',   label: 'Emerald',   group: 'extra',   swatches: ['#0c1a0f','#e0f0e4','#34d399','#264d33'] },
  { id: 'command',   label: 'Command',   group: 'extra',   swatches: ['#1c1f24','#e8ecf1','#00d4ff','rgba(255,255,255,0.08)'] },
];
```

- [ ] **Step 5: Clean up old CSS classes no longer referenced**

Search for any remaining `.pf__sidebar`, `.pf__client-*`, `.pf__wt-*`, `.pf__bottom--v4`, `.pf__na-*`, `.pf__scorecard*`, `.pf__donut-*`, `.pf__strip-delta-beside`, `.pf__strip-delta-week` CSS rules and remove them (should have been replaced in Task 1, but verify no stragglers).

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "refactor: remove dead portfolio v4 code, add Command theme to picker"
```

---

### Task 7: Verify

**Files:**
- Read: `nbi_project_dashboard.html` (sanity check)
- Run: tests + Playwright

- [ ] **Step 1: Run unit tests**

```bash
cd dashboard-server && npm test
```

Expected: All ~387 tests pass. The portfolio render functions don't have unit tests, but changes must not break other tests (e.g., CSS parsing, shared utility functions).

- [ ] **Step 2: Restart PM2 staging**

```bash
pm2 restart nbi-dashboard-staging
```

- [ ] **Step 3: Run Playwright e2e tests**

```bash
cd dashboard-server && npm run test:e2e
```

Expected: smoke + tasks + verification tests pass. The portfolio page will render with the new layout. Screenshots will show the v5 design.

- [ ] **Step 4: Visual verification**

Open http://localhost:8887/nbi_project_dashboard.html in a browser. Switch to the Dashboard (portfolio) view. Verify:
- 5 KPI cards across the top with big numbers
- Alert banner with pulsing red dot (if blocked items exist)
- Client portfolio table with health diamonds, progress bars, key risks
- 3-column panel row: Status Overview, Needs Attention, Milestones
- 2-column panel row: Team Workload, Near Completion
- Click a client row to filter panels to that client
- Switch themes: Dark, Light, Midnight, Nord, Solarized, Dracula, Emerald, Command
- Command theme: hex grid background visible, cards have backdrop-filter blur
- Responsive: resize browser to test breakpoints (1400px, 1200px, 900px, 600px)

- [ ] **Step 5: Restart PM2 production and commit final state**

```bash
pm2 restart nbi-dashboard
git add nbi_project_dashboard.html
git commit -m "verify: portfolio v5 redesign — all tests passing, visual check done"
```

---

## Notes for Implementing Agent

1. **Line numbers are approximate** — the file is ~21k lines and edits will shift numbers. Use function name search to find exact locations.

2. **The old `renderPfSidebar` action handler `selectPortfolioClient` (line ~3147) must be kept.** The client table rows use the same `data-action="selectPortfolioClient"` pattern. The handler toggles `_portfolioSelectedClient` and calls `renderContent()`.

3. **The `renderPfTimeline` function is ~280 lines.** Deleting it will shift all subsequent line numbers significantly. Do this deletion in Task 6 after all new code is in place.

4. **The `color-mix()` CSS function** is used in the new CSS. It has >96% browser support (all modern browsers). If Glen reports issues in older browsers, fallback to hardcoded RGBA values.

5. **The SVG donut** uses `transform="rotate()"` to position segments. The rotation calculation: `startAngle = -90 + (cumulativeArc / circumference * 360)`. The `-90` offset makes 12 o'clock the start position.

6. **Font weight caveat:** The prototype uses 800-900 weight for numbers. The local font files only go to 700 (Inter) and 500 (JetBrains Mono). The numbers will look slightly thinner than the prototype. This is acceptable — Glen can request heavier font files as a follow-up.
