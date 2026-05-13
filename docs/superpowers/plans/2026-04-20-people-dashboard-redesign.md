# People Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the People tab from a scrolling multi-section layout to a master-detail split view with red flags strip, team list on the left, and person detail on the right.

**Architecture:** Replace the `renderPeopleView` function's workload branch (lines 10005-10337 in `nbi_project_dashboard.html`) with a master-detail layout. All existing data computation logic is preserved and reused. New CSS classes are added for the split layout. The Calendar sub-tab is removed from the tab bar but its function is left intact.

**Tech Stack:** Vanilla HTML/CSS/JS in a single-page app. CSS custom properties for theming. No build tools.

**Spec:** `docs/superpowers/specs/2026-04-20-people-dashboard-redesign.md`

---

## File Structure

All changes are in a single file:

- **Modify:** `nbi_project_dashboard.html`
  - CSS section (~line 1054): Add new `.people-*` classes
  - CSS responsive (~line 367): Add responsive breakpoints for split layout
  - JS state (~line 3094): Add `_peopleSearchFilter` state variable
  - JS action handlers (~line 2501): Add `_actSelectPerson` and `_actPeopleSearch` handlers
  - JS render (~lines 9972-10337): Replace the workload sub-view rendering with master-detail layout

---

### Task 1: Add CSS Classes for Master-Detail Layout

**Files:**
- Modify: `nbi_project_dashboard.html:1059` (after existing `.rw-nums` rules)
- Modify: `nbi_project_dashboard.html:367-368` (responsive breakpoints)

- [ ] **Step 1: Add new `.people-*` CSS classes after the `.rw-nums` rule block (~line 1063)**

Insert after the line `.rw-nums .rw-n-est { width: 52px; }`:

```css
/* ===== PEOPLE MASTER-DETAIL LAYOUT ===== */
.people-flags { display: flex; gap: var(--space-lg); padding: 10px var(--space-md); background: color-mix(in srgb, var(--danger) 8%, var(--bg-card)); border: 1px solid color-mix(in srgb, var(--danger) 20%, var(--border-default)); border-radius: var(--radius-lg); margin-bottom: var(--space-md); font-size: 0.82rem; align-items: center; flex-wrap: wrap; }
.people-flags__item { display: flex; align-items: center; gap: 6px; }
.people-split { display: flex; gap: var(--space-md); align-items: flex-start; }
.people-list { width: 35%; min-width: 280px; background: color-mix(in srgb, var(--bg-card) 85%, var(--text-muted)); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; position: sticky; top: 60px; max-height: calc(100vh - 120px); display: flex; flex-direction: column; }
.people-list__search { padding: 8px 10px; border-bottom: 1px solid var(--border-default); }
.people-list__search input { width: 100%; background: var(--bg-raised); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 6px 10px; color: var(--text-primary); font-size: 0.82rem; font-family: inherit; outline: none; }
.people-list__search input:focus { border-color: var(--accent); }
.people-list__body { overflow-y: auto; flex: 1; }
.people-row { padding: 10px 12px; border-bottom: 1px solid color-mix(in srgb, var(--border-default) 50%, transparent); cursor: pointer; transition: background 0.1s; }
.people-row:hover { background: color-mix(in srgb, var(--accent) 5%, transparent); }
.people-row--selected { background: color-mix(in srgb, var(--accent) 8%, transparent); border-left: 3px solid var(--accent); padding-left: 9px; }
.people-row__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.people-row__name { font-size: 0.85rem; color: var(--text-primary); }
.people-row--selected .people-row__name { font-weight: 600; }
.people-row__badges { display: flex; gap: 4px; }
.people-row__badge { font-size: 0.68rem; padding: 2px 6px; border-radius: var(--radius-sm); font-weight: 600; }
.people-row__badge--overdue { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); }
.people-row__badge--blocked { background: color-mix(in srgb, var(--purple) 15%, transparent); color: var(--purple); }
.people-row__bar { height: 14px; background: var(--bg-raised); border-radius: var(--radius-md); overflow: hidden; display: flex; gap: 1px; }
.people-row__stats { display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.72rem; color: var(--text-muted); }
.people-row__util--green { color: var(--success); font-weight: 600; }
.people-row__util--amber { color: var(--warning); font-weight: 600; }
.people-row__util--red { color: var(--danger); font-weight: 600; }
.people-detail { width: 65%; min-width: 0; }
.people-kpi { display: flex; gap: var(--space-sm); margin-bottom: var(--space-lg); flex-wrap: wrap; }
.people-kpi__item { flex: 1; min-width: 100px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 10px 14px; text-align: center; }
.people-kpi__value { font-size: 1.3rem; font-weight: 700; font-family: var(--font-display); line-height: 1.2; }
.people-kpi__label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
.people-capacity-row { display: flex; gap: 6px; margin-bottom: var(--space-lg); }
.people-capacity-cell { flex: 1; text-align: center; border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 8px 6px; }
.people-capacity-cell__pct { font-weight: 700; font-family: var(--font-mono); font-size: 1rem; }
.people-capacity-cell__date { font-size: 0.68rem; color: var(--text-muted); margin-top: 2px; }
.people-capacity-cell__off { font-size: 0.62rem; color: var(--text-muted); }
.people-blocked-item { background: color-mix(in srgb, var(--purple) 6%, transparent); border-left: 3px solid var(--purple); padding: 8px 12px; border-radius: 0 var(--radius-md) var(--radius-md) 0; margin-bottom: 6px; }
.people-blocked-item__title { font-size: 0.82rem; color: var(--text-primary); }
.people-blocked-item__meta { font-size: 0.72rem; color: var(--purple); margin-top: 2px; }
.people-client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }
.people-client-card { background: var(--bg-raised); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 10px 12px; }
.people-client-card__header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.people-client-card__name { font-weight: 600; font-size: 0.82rem; }
.people-client-card__count { font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); }
.people-client-card__bar { height: 4px; background: var(--bg-card); border-radius: 2px; overflow: hidden; }
```

- [ ] **Step 2: Update responsive breakpoints at ~line 367**

Find the existing line:
```css
@media (max-width: 768px) { .tactical-grid { grid-template-columns: 1fr; } ...
```

Add after the existing `@media (min-width: 769px) and (max-width: 1024px)` rule:

```css
@media (max-width: 768px) { .people-split { flex-direction: column; } .people-list { width: 100%; max-height: 300px; position: static; } .people-detail { width: 100%; } .people-client-grid { grid-template-columns: 1fr; } .people-capacity-row { flex-wrap: wrap; } .people-capacity-cell { min-width: 70px; } }
@media (min-width: 769px) and (max-width: 1024px) { .people-split { flex-direction: column; } .people-list { width: 100%; max-height: 400px; position: static; } .people-detail { width: 100%; } }
```

- [ ] **Step 3: Update print media rule (~line 1130)**

Find `.tactical-section { border-color: #ddd !important; background: #fff !important; }` and add after it:

```css
.people-list { position: static !important; max-height: none !important; }
```

- [ ] **Step 4: Verify CSS parses correctly**

Open the dashboard in a browser and check the developer console for CSS parse errors. No errors expected.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "style: add CSS classes for People master-detail layout"
```

---

### Task 2: Add State Variables and Action Handlers

**Files:**
- Modify: `nbi_project_dashboard.html:3094` (state variables)
- Modify: `nbi_project_dashboard.html:2501-2508` (action handlers)

- [ ] **Step 1: Add `_peopleSearchFilter` state variable**

Find line 3094:
```js
let _peopleFilter = { person: null, dateRange: 'all' };
```

Add after it:
```js
let _peopleSearchFilter = '';
```

- [ ] **Step 2: Add action handler for person selection in the left panel**

Find line 2508:
```js
function _actSetPeopleFilterPerson(v) { _peopleFilter.person = v; renderContent(); }
```

Add after it:
```js
function _actSelectPerson(name) { _peopleFilter.person = name; renderContent(); }
function _actPeopleSearch(el) { _peopleSearchFilter = el.value.toLowerCase(); const pos = el.selectionStart; renderContent(); const inp = document.querySelector('.people-list__search input'); if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); } }
```

- [ ] **Step 3: Remove Calendar sub-tab from the tab bar**

Find lines 9975-9979 (the sub-tab toggle buttons):
```js
  <div class="task-subview-toggle">
    <button class="task-subview-btn ${_peopleSubView==='workload'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="workload">Workload</button>
    <button class="task-subview-btn ${_peopleSubView==='capacity'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="capacity">Capacity</button>
    <button class="task-subview-btn ${_peopleSubView==='calendar'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="calendar">Calendar</button>
  </div>
```

Replace with:
```js
  <div class="task-subview-toggle">
    <button class="task-subview-btn ${_peopleSubView==='workload'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="workload">Workload</button>
    <button class="task-subview-btn ${_peopleSubView==='capacity'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="capacity">Capacity</button>
  </div>
```

- [ ] **Step 4: Remove Calendar sub-view branch**

Find lines 9990-10003 (the calendar view branch):
```js
  // Calendar view: team roster or month grid...
  if (_peopleSubView === 'calendar') {
    ...
    return;
  }
```

Replace with a comment:
```js
  // Calendar sub-view removed in People redesign (2026-04-20).
  // renderPeopleCalendarView() function retained for potential future use.
```

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: add People state variables and remove Calendar sub-tab"
```

---

### Task 3: Replace Workload View with Master-Detail Layout

This is the main task. It replaces lines 10005-10337 (the entire workload sub-view) with the new master-detail rendering.

**Files:**
- Modify: `nbi_project_dashboard.html:10005-10337`

- [ ] **Step 1: Replace the filters bar and all workload/individual rendering**

Find the line (after the Calendar branch removal):
```js
  // Filters bar (workload view only)
```

Replace everything from that line down to and including:
```js
  html += `</div>`;
  el.innerHTML = html;
}
```

With the following new rendering code:

```js
  // Date range filter (shared across the master-detail view)
  html += `<div style="display:flex;gap:6px;margin-bottom:var(--space-md);align-items:center;flex-wrap:wrap">`;
  html += `<div class="task-subview-toggle">`;
  ['all','week','month','quarter'].forEach(r => {
    const labels = { all: 'All Time', week: 'This Week', month: 'This Month', quarter: 'This Quarter' };
    html += `<button class="task-subview-btn ${_peopleFilter.dateRange===r?'active':''}" data-action="_actSetPeopleFilterDateRange" data-arg0="${r}">${labels[r]}</button>`;
  });
  html += `</div></div>`;

  if (allPeople.length === 0) {
    html += emptyState('&#128100;', 'No assignees found', 'Assign people to tasks to see workload data here.');
    html += `</div>`;
    el.innerHTML = html;
    return;
  }

  // === DATA COMPUTATION (reused from old view) ===
  const WEEKLY_CAPACITY = 40;
  const now = new Date(); now.setHours(0,0,0,0);

  const workloadRows = allPeople.map(p => {
    const pt = filtered.filter(t => isAssignedTo(t, p));
    const activeTasks = pt.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
    return {
      name: p,
      pt,
      total: pt.length,
      done: pt.filter(t => t.status === 'Done').length,
      active: pt.filter(t => t.status === 'In progress').length,
      blocked: pt.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled').length,
      overdue: pt.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now).length,
      hs: pt.reduce((s,t) => s + (t.hoursSpent||0), 0),
      he: pt.reduce((s,t) => s + (t.hoursEstimated||0), 0),
      util: Math.round((activeTasks.reduce((s,t) => s + (t.hoursEstimated||0), 0)) / WEEKLY_CAPACITY * 100),
    };
  });

  // Sort
  const wSc = _peopleWorkloadSort.col;
  const wSd = _peopleWorkloadSort.dir === 'asc' ? 1 : -1;
  workloadRows.sort((a, b) => {
    if (wSc === 'name') return a.name.localeCompare(b.name) * wSd;
    return ((a[wSc] || 0) - (b[wSc] || 0)) * wSd;
  });

  // Auto-select first person if none selected
  const selectedPerson = _peopleFilter.person || (workloadRows.length > 0 ? workloadRows[0].name : null);
  if (!_peopleFilter.person && selectedPerson) _peopleFilter.person = selectedPerson;

  // === RED FLAGS STRIP ===
  const totalBlocked = workloadRows.reduce((s, r) => s + r.blocked, 0);
  const overCapacity = workloadRows.filter(r => r.util > 100).length;
  // Count people absent in next 7 days
  const nextWeekEnd = new Date(now); nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
  let absentNextWeek = 0;
  allPeople.forEach(p => {
    const off = computeDaysOff(p, now, nextWeekEnd, _capacityEvents);
    if (off > 0) absentNextWeek++;
  });

  html += `<div class="people-flags">`;
  html += `<div class="people-flags__item"><span style="color:var(--danger);font-weight:700;">&#9888; ${overCapacity} over capacity</span></div>`;
  html += `<div class="people-flags__item"><span style="color:var(--purple);font-weight:600;">&#128721; ${totalBlocked} blocked</span></div>`;
  html += `<div class="people-flags__item"><span style="color:var(--text-muted);">&#128197; ${absentNextWeek} absent next week</span></div>`;
  html += `</div>`;

  // === MASTER-DETAIL SPLIT ===
  html += `<div class="people-split">`;

  // --- LEFT PANEL: Team List ---
  html += `<div class="people-list">`;
  // Search
  html += `<div class="people-list__search"><input type="text" placeholder="Filter team..." value="${esc(_peopleSearchFilter)}" oninput="_actPeopleSearch(this)"></div>`;
  // Sort bar
  const wlSortBtn = (col, label) => {
    const isActive = _peopleWorkloadSort.col === col;
    const arrow = isActive ? (_peopleWorkloadSort.dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
    return `<button class="task-subview-btn ${isActive?'active':''}" style="font-size:0.68rem;padding:3px 8px;" data-action="_actTogglePeopleWorkloadSort" data-arg0="${col}">${label}${arrow}</button>`;
  };
  html += `<div style="display:flex;gap:4px;padding:6px 10px;border-bottom:1px solid var(--border-default);flex-wrap:wrap;align-items:center;">`;
  html += `<span style="font-size:0.68rem;color:var(--text-muted);">Sort:</span>`;
  html += wlSortBtn('name', 'Name');
  html += wlSortBtn('total', 'Tasks');
  html += wlSortBtn('hs', 'Hrs Spent');
  html += wlSortBtn('he', 'Hrs Est.');
  html += `</div>`;
  // Person rows
  html += `<div class="people-list__body">`;
  const maxTasks = Math.max(...workloadRows.map(x => x.total), 1);
  workloadRows.forEach(r => {
    if (_peopleSearchFilter && !r.name.toLowerCase().includes(_peopleSearchFilter)) return;
    const isSelected = r.name === selectedPerson;
    const other = Math.max(0, r.total - r.done - r.active - r.blocked);
    const barW = r.total / maxTasks * 100;
    const utilClass = r.util > 100 ? 'people-row__util--red' : r.util > 80 ? 'people-row__util--amber' : 'people-row__util--green';

    html += `<div class="people-row${isSelected ? ' people-row--selected' : ''}" data-action="_actSelectPerson" data-arg0="${esc(r.name)}">`;
    html += `<div class="people-row__header">`;
    html += `<span class="people-row__name">${esc(r.name)}</span>`;
    html += `<div class="people-row__badges">`;
    if (r.overdue > 0) html += `<span class="people-row__badge people-row__badge--overdue">${r.overdue} overdue</span>`;
    if (r.blocked > 0) html += `<span class="people-row__badge people-row__badge--blocked">${r.blocked} blocked</span>`;
    html += `</div></div>`;
    html += `<div class="people-row__bar" style="width:${barW}%">`;
    if (r.done > 0) html += `<div class="rw-seg" style="flex:${r.done};background:var(--success)" title="Done: ${r.done}"></div>`;
    if (r.active > 0) html += `<div class="rw-seg" style="flex:${r.active};background:var(--accent)" title="Active: ${r.active}"></div>`;
    if (r.blocked > 0) html += `<div class="rw-seg" style="flex:${r.blocked};background:var(--danger)" title="Blocked: ${r.blocked}"></div>`;
    if (other > 0) html += `<div class="rw-seg" style="flex:${other};background:var(--border-subtle, var(--text-muted))" title="Other: ${other}"></div>`;
    html += `</div>`;
    html += `<div class="people-row__stats">`;
    html += `<span>${r.total} tasks &middot; ${r.hs.toFixed(1)}h spent</span>`;
    html += `<span class="${utilClass}">${r.util}% util</span>`;
    html += `</div>`;
    html += `</div>`;
  });
  html += `</div></div>`; // close people-list__body and people-list

  // --- RIGHT PANEL: Person Detail ---
  html += `<div class="people-detail">`;

  if (selectedPerson) {
    const row = workloadRows.find(r => r.name === selectedPerson);
    if (row) {
      const personTasks = row.pt;

      // KPI Header
      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md)">`;
      html += `<h2 style="margin:0">${esc(selectedPerson)}</h2>`;
      html += `</div>`;
      html += `<div class="people-kpi">`;
      html += `<div class="people-kpi__item" style="border-color:color-mix(in srgb, var(--success) 30%, var(--border-default))"><div class="people-kpi__value" style="color:var(--success)">${row.total}</div><div class="people-kpi__label">Tasks</div></div>`;
      html += `<div class="people-kpi__item" style="border-color:color-mix(in srgb, var(--accent) 30%, var(--border-default))"><div class="people-kpi__value" style="color:var(--accent)">${row.hs.toFixed(1)}h</div><div class="people-kpi__label">Hours Spent</div></div>`;
      html += `<div class="people-kpi__item" style="border-color:color-mix(in srgb, var(--danger) 30%, var(--border-default))"><div class="people-kpi__value" style="color:var(--danger)">${row.blocked}</div><div class="people-kpi__label">Blocked</div></div>`;
      html += `<div class="people-kpi__item" style="border-color:color-mix(in srgb, var(--warning) 30%, var(--border-default))"><div class="people-kpi__value" style="color:var(--warning)">${row.overdue}</div><div class="people-kpi__label">Overdue</div></div>`;
      html += `</div>`;

      // Section 1: Capacity Forecast (next 4 weeks)
      html += `<div class="report__section"><h3 style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:var(--space-sm)">Capacity &mdash; Next 4 Weeks</h3>`;
      const capNow = new Date(); capNow.setHours(0,0,0,0);
      const capWeeks = [];
      for (let w = 0; w < 4; w++) {
        const wStart = new Date(capNow); wStart.setDate(wStart.getDate() - wStart.getDay() + 1 + w*7);
        const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
        capWeeks.push({ start: wStart, end: wEnd, label: wStart.toLocaleDateString('en-GB', {day:'numeric',month:'short'}) });
      }
      html += `<div class="people-capacity-row">`;
      capWeeks.forEach(wk => {
        const weekTasks = tasks.filter(t => {
          if (!isAssignedTo(t, selectedPerson)) return false;
          if (t.status === 'Done' || t.status === 'Cancelled') return false;
          const start = t.startDate ? safeParseDate(t.startDate) : null;
          const end = t.endDate ? safeParseDate(t.endDate) : (t.dueDate ? safeParseDate(t.dueDate) : null);
          if (!end) return false;
          return (!start || start <= wk.end) && end >= wk.start;
        });
        const committedHrs = weekTasks.reduce((s,t) => s + (t.hoursEstimated||0), 0);
        const daysOff = computeDaysOff(selectedPerson, wk.start, wk.end, _capacityEvents);
        const effCap = Math.max(0, WEEKLY_CAPACITY - daysOff * 8);
        if (effCap === 0) {
          html += `<div class="people-capacity-cell" style="background:color-mix(in srgb, var(--text-muted) 8%, transparent);border-color:var(--border-default)"><div class="people-capacity-cell__pct" style="color:var(--text-muted)">OFF</div><div class="people-capacity-cell__date">${wk.label}</div><div class="people-capacity-cell__off">${daysOff}d off</div></div>`;
          return;
        }
        const pct = Math.round((committedHrs / effCap) * 100);
        const col = pct > 95 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';
        const bg = pct > 95 ? 'color-mix(in srgb, var(--danger) 10%, transparent)' : pct > 70 ? 'color-mix(in srgb, var(--warning) 10%, transparent)' : 'color-mix(in srgb, var(--success) 10%, transparent)';
        const border = pct > 95 ? 'color-mix(in srgb, var(--danger) 25%, var(--border-default))' : pct > 70 ? 'color-mix(in srgb, var(--warning) 25%, var(--border-default))' : 'color-mix(in srgb, var(--success) 25%, var(--border-default))';
        html += `<div class="people-capacity-cell" style="background:${bg};border-color:${border}"><div class="people-capacity-cell__pct" style="color:${col}">${pct}%</div><div class="people-capacity-cell__date">${wk.label}</div>`;
        if (daysOff > 0) html += `<div class="people-capacity-cell__off">${daysOff}d off</div>`;
        html += `</div>`;
      });
      html += `</div></div>`;

      // Section 2: Blocked Tasks
      const blockedTasks = personTasks.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
      html += `<div class="report__section"><h3 style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:var(--space-sm)">Blocked Tasks (${blockedTasks.length})</h3>`;
      if (blockedTasks.length === 0) {
        html += `<div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0;">No blocked tasks</div>`;
      } else {
        blockedTasks.forEach(t => {
          const client = getTaskClient(t) || 'Unassigned';
          const desc = t.description ? t.description.substring(0, 120) : '';
          html += `<div class="people-blocked-item" data-action="openDetailOverlay" data-arg0="${t.id}" style="cursor:pointer">`;
          html += `<div class="people-blocked-item__title">${esc(t.title)}</div>`;
          html += `<div class="people-blocked-item__meta">${esc(client)}${desc ? ' &middot; ' + esc(desc) : ''}</div>`;
          html += `</div>`;
        });
      }
      html += `</div>`;

      // Section 3: Workload by Client
      const clientList = currentFilter.client ? [currentFilter.client] : getAllClients();
      const clientWork = clientList.map(c => {
        const ct = personTasks.filter(t => getTaskClient(t) === c && t.status !== 'Done' && t.status !== 'Cancelled');
        return { name: c, count: ct.length, hs: ct.reduce((s,t) => s + (t.hoursSpent||0), 0) };
      }).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
      const maxClientTasks = Math.max(...clientWork.map(c => c.count), 1);

      html += `<div class="report__section"><h3 style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:var(--space-sm)">Workload by Client</h3>`;
      if (clientWork.length === 0) {
        html += `<div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0;">No active tasks</div>`;
      } else {
        const clientColours = ['var(--accent)', 'var(--purple)', 'var(--warning)', 'var(--success)', 'var(--danger)', '#e879f9', '#fb923c'];
        html += `<div class="people-client-grid">`;
        clientWork.forEach((c, i) => {
          const col = clientColours[i % clientColours.length];
          const barW = (c.count / maxClientTasks * 100).toFixed(0);
          html += `<div class="people-client-card">`;
          html += `<div class="people-client-card__header"><span class="people-client-card__name" style="color:${col}">${esc(c.name)}</span><span class="people-client-card__count">${c.count} tasks</span></div>`;
          html += `<div class="people-client-card__bar"><div style="width:${barW}%;height:100%;background:${col};border-radius:2px;"></div></div>`;
          html += `</div>`;
        });
        html += `</div>`;
      }
      html += `</div>`;

    } // end if (row)
  } // end if (selectedPerson)

  html += `</div>`; // close people-detail
  html += `</div>`; // close people-split
  html += `</div>`; // close report
  el.innerHTML = html;
}
```

- [ ] **Step 2: Verify the page renders**

Open http://localhost:8888, navigate to the People tab. Verify:
- Red flags strip shows at the top
- Left panel shows team list with bars, badges, utilisation
- Right panel shows the first person's detail (KPIs, capacity, blockers, clients)
- Clicking a different person in the left panel updates the right panel
- Search filter narrows the list
- Sort buttons reorder the list

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: People dashboard master-detail redesign

- Replace stacked sections with 35/65 split layout
- Red flags strip: over-capacity, blocked, absent counts
- Left panel: team list with 14px status bars, badges, utilisation
- Right panel: KPI header, 4-week capacity, blocked tasks, client workload
- Auto-selects heaviest workload person on load
- Search filter and sort buttons in left panel
- Remove Calendar sub-tab (function retained)
- Responsive: stacks vertically below 1024px"
```

---

### Task 4: Visual Polish and Edge Cases

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Test with no tasks assigned**

Navigate to People tab with a client filter that has no assignees. Verify the empty state renders correctly.

- [ ] **Step 2: Test responsive layout**

Resize browser to below 1024px. Verify panels stack vertically. Resize below 768px. Verify left panel shrinks to 300px max-height.

- [ ] **Step 3: Test light theme**

Switch to a light theme. Verify colour-mix CSS values produce readable backgrounds. Check red flags strip, capacity cells, and blocked items.

- [ ] **Step 4: Test Capacity sub-tab still works**

Click the Capacity sub-tab. Verify the heatmap still renders correctly and switching back to Workload shows the new master-detail view.

- [ ] **Step 5: Fix any visual issues found during testing**

Address CSS spacing, font size, or colour issues found in steps 1-4.

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix: People dashboard polish and edge case handling"
```

---

## Execution Notes

- **Worktree required:** Per CLAUDE.md, this change touches significant rendering in `nbi_project_dashboard.html`. Create a worktree before starting.
- **No tests to write:** This is a frontend rendering change in a single HTML file. Visual verification in the browser is the testing strategy.
- **Existing handlers preserved:** `_actSetPeopleFilterPerson` still works (used by capacity heatmap click-through). The new `_actSelectPerson` is an alias that also toggles deselection.
- **Data computation unchanged:** `workloadRows`, `capWeeks`, `computeDaysOff`, `isAssignedTo`, `normaliseAssignees` are all reused from the existing code. No data model changes.
- **Mobile dropdown deferred:** Spec says "Below 768px, hide left panel and show person dropdown." v1 stacks panels vertically instead — simpler, still functional. Dropdown is a future polish item.
- **Self-review fixes applied:** (1) `_actSelectPerson` is always-select, not toggle (avoids auto-select re-selection loop). (2) `maxTasks` computed once outside forEach loop. (3) Search input preserves cursor position after re-render.
