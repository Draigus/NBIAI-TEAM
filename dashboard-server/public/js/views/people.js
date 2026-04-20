// ==================== PEOPLE VIEW ====================
// Extracted from nbi_project_dashboard.html (lines 6675-7464)
// People view: workload overview with sortable bar charts, capacity planning
// with days-off deduction, hours-by-client grid, individual person detail,
// calendar sub-view (roster + month grid), and deal readiness check.

import { registerView } from '../core/router.js';

// ===== MODULE STATE =====
// Exposed on window because _peopleSubView is read at line 3264 in the monolith
// and _peopleFilter is written inline by onchange handlers in rendered HTML.
let _peopleSubView = 'workload';
let _peopleFilter = { person: null, dateRange: 'all' };
let _peopleCalView = localStorage.getItem('nbi_people_cal_view') || 'roster';
let _peopleWorkloadSort = { col: 'total', dir: 'desc' };
let _peopleCapacitySort = { col: 'name', dir: 'asc' };
let _peopleClientHoursSort = { col: 'name', dir: 'asc' };
let _peopleTaskSummarySort = { col: 'name', dir: 'asc' };

window._peopleSubView = _peopleSubView;
window._peopleFilter = _peopleFilter;
window._peopleCalView = _peopleCalView;

// ===== _act* WRAPPERS =====
function _actSetPeopleSubView(v) { _peopleSubView = v; window._peopleSubView = v; renderContent(); }
window._actSetPeopleSubView = _actSetPeopleSubView;

function _actSetPeopleFilterDateRange(v) { _peopleFilter.dateRange = v; renderContent(); }
window._actSetPeopleFilterDateRange = _actSetPeopleFilterDateRange;

function _actSetPeopleFilterPerson(v) { _peopleFilter.person = v; renderContent(); }
window._actSetPeopleFilterPerson = _actSetPeopleFilterPerson;

function _actSetPeopleCalView(v) { _peopleCalView = v; window._peopleCalView = v; localStorage.setItem('nbi_people_cal_view', v); renderContent(); }
window._actSetPeopleCalView = _actSetPeopleCalView;

function _actTogglePeopleCapacitySort(col) { _peopleCapacitySort = { col, dir: _peopleCapacitySort.col === col && _peopleCapacitySort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
window._actTogglePeopleCapacitySort = _actTogglePeopleCapacitySort;

function _actTogglePeopleClientHoursSort(col) { _peopleClientHoursSort = { col, dir: _peopleClientHoursSort.col === col && _peopleClientHoursSort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
window._actTogglePeopleClientHoursSort = _actTogglePeopleClientHoursSort;

function _actTogglePeopleTaskSummarySort(col) { _peopleTaskSummarySort = { col, dir: _peopleTaskSummarySort.col === col && _peopleTaskSummarySort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
window._actTogglePeopleTaskSummarySort = _actTogglePeopleTaskSummarySort;

function _actTogglePeopleWorkloadSort(col) { _peopleWorkloadSort = { col, dir: _peopleWorkloadSort.col === col && _peopleWorkloadSort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
window._actTogglePeopleWorkloadSort = _actTogglePeopleWorkloadSort;

// ===== FUNCTIONS =====

// ==================== PEOPLE VIEW ====================

/** Normalise assignee names: merge partial matches (e.g. "Glen" + "Glen Pryer" -> "Glen Pryer") */
function normaliseAssignees(rawNames) {
  const sorted = [...rawNames].sort((a, b) => b.length - a.length); // longest first
  const mergeMap = {}; // short name -> canonical (long) name
  sorted.forEach(name => {
    const lower = name.toLowerCase().trim();
    // Check if this name is a prefix of an already-seen longer name
    const existing = Object.values(mergeMap).find(canonical =>
      canonical.toLowerCase().startsWith(lower) || lower.startsWith(canonical.toLowerCase())
    );
    if (existing) {
      // Map shorter to longer
      const longer = name.length >= existing.length ? name : existing;
      const shorter = name.length < existing.length ? name : existing;
      // Re-map anything pointing to old canonical
      Object.keys(mergeMap).forEach(k => { if (mergeMap[k] === shorter) mergeMap[k] = longer; });
      mergeMap[name] = longer;
    } else {
      mergeMap[name] = name;
    }
  });
  return mergeMap;
}

/** Render the people view: workload overview, capacity planning, hours-by-client, or individual person detail */
function renderPeopleView(el) {
  // D93: Capacity Planning reads from _capacityEvents which is keyed to
  // today → today+28 days. Fetch once per view render if missing, then
  // re-render so the table shows effective capacity with days off deducted.
  const capKey = (() => {
    const s = new Date(); s.setHours(0,0,0,0);
    s.setDate(s.getDate() - s.getDay() + 1);
    const e = new Date(s); e.setDate(e.getDate() + 28);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return `${fmt(s)}:${fmt(e)}`;
  })();
  if (_capacityEventsKey !== capKey) {
    loadCapacityEvents().then(() => { if (currentView === 'people') renderContent(); });
  }
  const scopedTasks = currentFilter.client ? tasks.filter(t => getTaskClient(t) === currentFilter.client) : tasks;
  const assigneeSet = new Set();
  scopedTasks.forEach(t => { if (t.assignees) t.assignees.forEach(a => assigneeSet.add(a)); });
  // Normalise: merge "Glen" and "Glen Pryer" into one canonical name
  const _assigneeMerge = normaliseAssignees(assigneeSet);
  // Exclude client staff and hourly contractors not on permanent workload
  const CLIENT_STAFF = ['Robin', 'Valeria', 'Lorenza', 'Jeff Day', 'Jessica Williams', 'Denise Delahanty', 'Bryan Rasmussen'];
  const allPeople = [...new Set(Object.values(_assigneeMerge))].filter(p => !CLIENT_STAFF.includes(p)).sort();
  // Helper: check if a task is assigned to canonical person (matches any merged variant)
  const mergeKeys = {};
  allPeople.forEach(p => { mergeKeys[p] = Object.keys(_assigneeMerge).filter(k => _assigneeMerge[k] === p); });
  /** Check if a task is assigned to a person (handles merged name variants) */
  function isAssignedTo(task, person) {
    if (!task.assignees) return false;
    const variants = mergeKeys[person] || [person];
    return variants.some(v => task.assignees.includes(v));
  }

  /** Filter tasks by the selected date range (week, month, quarter, or all) */
  function filterByDate(taskList) {
    if (_peopleFilter.dateRange === 'all') return taskList;
    const now = new Date();
    let start;
    if (_peopleFilter.dateRange === 'week') {
      start = new Date(now); start.setDate(start.getDate() - start.getDay() + 1); start.setHours(0,0,0,0);
    } else if (_peopleFilter.dateRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (_peopleFilter.dateRange === 'quarter') {
      const qm = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qm, 1);
    }
    if (!start) return taskList;
    return taskList.filter(t => {
      const u = new Date(t.updatedAt || t.createdAt || 0);
      return u >= start;
    });
  }

  const filtered = filterByDate(scopedTasks);
  const selectedPerson = _peopleFilter.person;

  let html = renderClientProfileHeader();
  html += `<div class="report">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px"><h1>People</h1>
  <div class="task-subview-toggle">
    <button class="task-subview-btn ${_peopleSubView==='workload'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="workload">Workload</button>
    <button class="task-subview-btn ${_peopleSubView==='capacity'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="capacity">Capacity</button>
    <button class="task-subview-btn ${_peopleSubView==='calendar'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="calendar">Calendar</button>
  </div></div>`;

  // Capacity heatmap view
  if (_peopleSubView === 'capacity') {
    html += `<div id="capacityHeatmap" style="margin-top:var(--space-lg)"><div style="text-align:center;color:var(--text-muted);padding:40px">Loading capacity data...</div></div>`;
    html += `</div>`;
    el.innerHTML = html;
    loadCapacityHeatmap();
    return;
  }

  // Calendar view: team roster or month grid of vacation / sick / uto /
  // bank_holiday / firm_closed entries. Shares _calEvents cache with the
  // Projects Calendar — navigating months here affects both.
  if (_peopleSubView === 'calendar') {
    html += renderPeopleCalendarView(allPeople, _assigneeMerge);
    html += `</div>`;
    el.innerHTML = html;
    // Trigger a fetch if the cache is stale for the visible month
    const visibleKey = `${_calYear}-${_calMonth}` + (_calTeamFilter ? `:team:${_calTeamFilter}` : '');
    if (_calEventsKey !== visibleKey) {
      setTimeout(() => loadCalendarEvents(_calYear, _calMonth), 0);
    }
    return;
  }

  // Filters bar (workload view only)
  html += `<div class="filter-bar" style="margin-bottom:var(--space-xl)">`;
  html += `<select onchange="_peopleFilter.person=this.value||null;renderContent()"><option value="">All People</option>${allPeople.map(p => `<option value="${esc(p)}" ${selectedPerson===p?'selected':''}>${esc(p)}</option>`).join('')}</select>`;
  html += `<div class="task-subview-toggle">`;
  ['all','week','month','quarter'].forEach(r => {
    const labels = { all: 'All Time', week: 'This Week', month: 'This Month', quarter: 'This Quarter' };
    html += `<button class="task-subview-btn ${_peopleFilter.dateRange===r?'active':''}" data-action="_actSetPeopleFilterDateRange" data-arg0="${r}">${labels[r]}</button>`;
  });
  html += `</div></div>`;

  const people = selectedPerson ? [selectedPerson] : allPeople;

  if (allPeople.length === 0) {
    html += emptyState('&#128100;', 'No assignees found', 'Assign people to tasks to see workload data here.');
    html += `</div>`;
    el.innerHTML = html;
    return;
  }

  if (!selectedPerson) {
    // === OVERVIEW: all people ===

    // Workload comparison bar chart — sortable toolbar per G4.
    // Build rows once so the sort can reorder them independently of render.
    const WEEKLY_CAPACITY = 40;
    const workloadRows = allPeople.map(p => {
      const pt = filtered.filter(t => isAssignedTo(t, p));
      return {
        name: p,
        pt,
        total: pt.length,
        done: pt.filter(t => t.status === 'Done').length,
        active: pt.filter(t => t.status === 'In progress').length,
        blocked: pt.filter(t => t.healthState === 'Blocked').length,
        hs: pt.reduce((s,t) => s + (t.hoursSpent||0), 0),
        he: pt.reduce((s,t) => s + (t.hoursEstimated||0), 0),
      };
    });
    const maxHrs = Math.max(...workloadRows.map(r => r.he), WEEKLY_CAPACITY, 1);
    const maxTasks = Math.max(...workloadRows.map(r => r.total), 1);

    // Apply the sort
    const wSc = _peopleWorkloadSort.col;
    const wSd = _peopleWorkloadSort.dir === 'asc' ? 1 : -1;
    workloadRows.sort((a, b) => {
      if (wSc === 'name') return a.name.localeCompare(b.name) * wSd;
      return ((a[wSc] || 0) - (b[wSc] || 0)) * wSd;
    });

    // Sort toolbar — "sortable by person from highest to lowest" per Glen's G4 note
    const wlSortBtn = (col, label) => {
      const isActive = _peopleWorkloadSort.col === col;
      const arrow = isActive ? (_peopleWorkloadSort.dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
      return `<button class="task-subview-btn ${isActive?'active':''}" data-action="_actTogglePeopleWorkloadSort" data-arg0="${col}">${label}${arrow}</button>`;
    };
    html += `<div class="report__section"><h2>Workload Overview <span style="font-weight:400;font-size:0.72rem;color:var(--text-muted)">40hr/week baseline</span></h2>`;
    html += `<div style="display:flex;gap:6px;margin-bottom:8px;align-items:center;flex-wrap:wrap"><span style="font-size:0.72rem;color:var(--text-muted);margin-right:6px">Sort:</span>`;
    html += wlSortBtn('name',  'Name');
    html += wlSortBtn('total', 'Tasks');
    html += wlSortBtn('hs',    'Hours Spent');
    html += wlSortBtn('he',    'Hours Est.');
    html += `</div>`;
    html += `<div class="report-workload" style="position:relative">`;
    // 40hr baseline marker
    const baselinePct = (WEEKLY_CAPACITY / maxHrs * 100).toFixed(1);
    html += `<div style="position:absolute;left:calc(120px + ${baselinePct}% * 0.65);top:0;bottom:0;width:1px;border-left:2px dashed var(--warning);opacity:0.4;z-index:1" title="40hr/week capacity"></div>`;
    workloadRows.forEach(r => {
      const other = r.pt.length - r.done - r.active - r.blocked;
      const barW = r.pt.length / maxTasks * 100;

      html += `<div class="rw-row" style="cursor:pointer" data-action="_actSetPeopleFilterPerson" data-arg0="${esc(r.name)}">`;
      html += `<div class="rw-name">${esc(r.name)}</div>`;
      html += `<div class="rw-bar-wrap"><div class="rw-bar" style="width:${barW}%">`;
      if (r.done > 0) html += `<div class="rw-seg" style="flex:${r.done};background:var(--success)" title="Done: ${r.done}"></div>`;
      if (r.active > 0) html += `<div class="rw-seg" style="flex:${r.active};background:var(--accent)" title="Active: ${r.active}"></div>`;
      if (r.blocked > 0) html += `<div class="rw-seg" style="flex:${r.blocked};background:var(--danger)" title="Blocked: ${r.blocked}"></div>`;
      if (other > 0) html += `<div class="rw-seg" style="flex:${other};background:var(--text-muted)" title="Other: ${other}"></div>`;
      html += `</div></div>`;
      html += `<div class="rw-nums"><span class="rw-n-tasks">${r.pt.length}</span><span class="rw-n-spent">${r.hs.toFixed(1)}h</span><span class="rw-n-est">${r.he.toFixed(1)}h</span></div>`;
      html += `</div>`;
    });
    html += `</div></div>`;

    // Capacity Planning — next 4 weeks, sortable per column (G4 + D93)
    // D93: effective capacity subtracts days off from calendar events
    // (vacation, sick_leave, uto, bank_holiday, firm_closed). 8h per weekday off.
    html += `<div class="report__section"><h2>Capacity Planning <span style="font-weight:400;font-size:0.72rem;color:var(--text-muted)">Next 4 weeks &middot; 40hr/week baseline, less days off from calendar</span></h2>`;
    const capNow = new Date(); capNow.setHours(0,0,0,0);
    const capWeeks = [];
    for (let w = 0; w < 4; w++) {
      const wStart = new Date(capNow); wStart.setDate(wStart.getDate() - wStart.getDay() + 1 + w*7);
      const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
      capWeeks.push({ start: wStart, end: wEnd, label: wStart.toLocaleDateString('en-GB', {day:'numeric',month:'short'}), key: 'w'+w });
    }
    // Build rows with per-week committed hours, days off, and effective capacity
    const capRows = allPeople.map(p => {
      const row = { name: p };
      capWeeks.forEach(wk => {
        const weekTasks = tasks.filter(t => {
          if (!isAssignedTo(t, p)) return false;
          if (t.status === 'Done' || t.status === 'Cancelled') return false;
          const start = t.startDate ? safeParseDate(t.startDate) : null;
          const end = t.endDate ? safeParseDate(t.endDate) : (t.dueDate ? safeParseDate(t.dueDate) : null);
          if (!end) return false;
          return (!start || start <= wk.end) && end >= wk.start;
        });
        row[wk.key] = weekTasks.reduce((s,t) => s + (t.hoursEstimated||0), 0);
        // D93: deduct full-day time off from effective capacity
        const daysOff = computeDaysOff(p, wk.start, wk.end, _capacityEvents);
        row[wk.key + '_off'] = daysOff;
        row[wk.key + '_eff'] = Math.max(0, WEEKLY_CAPACITY - daysOff * 8);
      });
      return row;
    });
    // Apply sort
    const capSc = _peopleCapacitySort.col;
    const capSd = _peopleCapacitySort.dir === 'asc' ? 1 : -1;
    capRows.sort((a, b) => {
      if (capSc === 'name') return a.name.localeCompare(b.name) * capSd;
      return ((a[capSc] || 0) - (b[capSc] || 0)) * capSd;
    });
    // Clickable header helper for this table
    const capSortTh = (col, label, align) => {
      const isActive = _peopleCapacitySort.col === col;
      const arrow = isActive ? (_peopleCapacitySort.dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
      const style = align === 'center' ? 'text-align:center;' : '';
      return `<th style="${style}cursor:pointer;user-select:none;white-space:nowrap${isActive ? ';color:var(--accent)' : ''}" data-action="_actTogglePeopleCapacitySort" data-arg0="${col}">${label}${arrow}</th>`;
    };
    html += `<div style="overflow-x:auto"><table class="report-table"><thead><tr>`;
    html += capSortTh('name', 'Person', 'left');
    capWeeks.forEach(wk => { html += capSortTh(wk.key, wk.label, 'center'); });
    html += `</tr></thead><tbody>`;
    capRows.forEach(r => {
      html += `<tr><td><strong>${esc(r.name)}</strong></td>`;
      capWeeks.forEach(wk => {
        const committedHrs = r[wk.key];
        const daysOff = r[wk.key + '_off'];
        const effCap = r[wk.key + '_eff'];
        // Fully off: show "OFF" label, no percentage maths
        if (effCap === 0) {
          html += `<td style="text-align:center"><span style="color:var(--text-muted);font-weight:600;font-family:var(--font-mono)">OFF</span><div style="font-size:0.6rem;color:var(--text-muted)">${daysOff}d off</div></td>`;
          return;
        }
        const pct = Math.round((committedHrs / effCap) * 100);
        const col = pct > 100 ? 'var(--danger)' : pct > 80 ? 'var(--warning)' : pct > 50 ? 'var(--accent)' : 'var(--text-muted)';
        // Sub-label format: "committed/effective" when any days off, else just "commit/40"
        const subLabel = daysOff > 0
          ? `${pct}% &middot; ${daysOff}d off`
          : `${pct}%`;
        html += `<td style="text-align:center"><span style="color:${col};font-weight:600;font-family:var(--font-mono)">${committedHrs.toFixed(0)}h<span style="color:var(--text-muted);font-weight:400">/${effCap}h</span></span><div style="font-size:0.6rem;color:var(--text-muted)">${subLabel}</div></td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div></div>`;

    // Hours by person per client grid — sortable per column (G4)
    const clientList = currentFilter.client ? [currentFilter.client] : getAllClients();
    // Use indexed client keys so the sort helper can reference them safely
    // (raw client names contain spaces and special chars that would break onclick)
    const clientKeys = clientList.map((c, i) => ({ name: c, key: 'c' + i }));
    // Build rows
    const clhRows = allPeople.map(p => {
      const row = { name: p, total: 0 };
      clientKeys.forEach(ck => {
        const ct = filtered.filter(t => isAssignedTo(t, p) && getTaskClient(t) === ck.name);
        const h = ct.reduce((s,t) => s + (t.hoursSpent||0), 0);
        row[ck.key] = h;
        row.total += h;
      });
      return row;
    });
    // Apply sort
    const clhSc = _peopleClientHoursSort.col;
    const clhSd = _peopleClientHoursSort.dir === 'asc' ? 1 : -1;
    clhRows.sort((a, b) => {
      if (clhSc === 'name') return a.name.localeCompare(b.name) * clhSd;
      return ((a[clhSc] || 0) - (b[clhSc] || 0)) * clhSd;
    });
    // Clickable header helper
    const clhSortTh = (col, label, align) => {
      const isActive = _peopleClientHoursSort.col === col;
      const arrow = isActive ? (_peopleClientHoursSort.dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
      const style = align === 'right' ? 'text-align:right;' : '';
      return `<th style="${style}cursor:pointer;user-select:none;white-space:nowrap${isActive ? ';color:var(--accent)' : ''}" data-action="_actTogglePeopleClientHoursSort" data-arg0="${col}">${label}${arrow}</th>`;
    };
    html += `<div class="report__section"><h2>Hours by Person per Client</h2>`;
    html += `<div style="overflow-x:auto"><table class="report-table"><thead><tr>`;
    html += clhSortTh('name', 'Person', 'left');
    clientKeys.forEach(ck => { html += clhSortTh(ck.key, esc(ck.name), 'left'); });
    html += clhSortTh('total', 'Total', 'left');
    html += `</tr></thead><tbody>`;
    clhRows.forEach(r => {
      html += `<tr><td><strong>${esc(r.name)}</strong></td>`;
      clientKeys.forEach(ck => {
        const h = r[ck.key];
        html += `<td style="font-family:var(--font-mono);color:${h > 0 ? 'var(--text-primary)' : 'var(--text-muted)'}">${h > 0 ? h.toFixed(1) : '-'}</td>`;
      });
      html += `<td style="font-family:var(--font-mono);font-weight:600">${r.total.toFixed(1)}h</td></tr>`;
    });
    // Totals row (always at bottom regardless of sort)
    html += `<tr style="border-top:2px solid var(--border-default);font-weight:600"><td>Total</td>`;
    let grandTotal = 0;
    clientKeys.forEach(ck => {
      const h = filtered.filter(t => getTaskClient(t) === ck.name).reduce((s,t) => s + (t.hoursSpent||0), 0);
      grandTotal += h;
      html += `<td style="font-family:var(--font-mono)">${h.toFixed(1)}</td>`;
    });
    html += `<td style="font-family:var(--font-mono)">${grandTotal.toFixed(1)}h</td></tr>`;
    html += `</tbody></table></div></div>`;

    // Summary grid: tasks by person — sortable per column (G4)
    const tsRows = allPeople.map(p => {
      const pt = filtered.filter(t => isAssignedTo(t, p));
      return {
        name: p,
        total: pt.length,
        done: pt.filter(t=>t.status==='Done').length,
        active: pt.filter(t=>t.status==='In progress').length,
        blocked: pt.filter(t=>t.healthState==='Blocked').length,
        notstarted: pt.filter(t=>t.status==='Not started').length,
        spent: pt.reduce((s,t)=>s+(t.hoursSpent||0),0),
        estimate: pt.reduce((s,t)=>s+(t.hoursEstimated||0),0),
      };
    });
    const tsSc = _peopleTaskSummarySort.col;
    const tsSd = _peopleTaskSummarySort.dir === 'asc' ? 1 : -1;
    tsRows.sort((a, b) => {
      if (tsSc === 'name') return a.name.localeCompare(b.name) * tsSd;
      return ((a[tsSc] || 0) - (b[tsSc] || 0)) * tsSd;
    });
    const tsSortTh = (col, label) => {
      const isActive = _peopleTaskSummarySort.col === col;
      const arrow = isActive ? (_peopleTaskSummarySort.dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
      return `<th style="cursor:pointer;user-select:none;white-space:nowrap${isActive ? ';color:var(--accent)' : ''}" data-action="_actTogglePeopleTaskSummarySort" data-arg0="${col}">${label}${arrow}</th>`;
    };
    html += `<div class="report__section"><h2>Task Summary by Person</h2>`;
    html += `<table class="report-table"><thead><tr>`;
    html += tsSortTh('name',       'Person');
    html += tsSortTh('total',      'Total');
    html += tsSortTh('done',       'Done');
    html += tsSortTh('active',     'Active');
    html += tsSortTh('blocked',    'Blocked');
    html += tsSortTh('notstarted', 'Not Started');
    html += tsSortTh('spent',      'Hrs Spent');
    html += tsSortTh('estimate',   'Hrs Est.');
    html += `</tr></thead><tbody>`;
    tsRows.forEach(r => {
      html += `<tr class="report-table__clickable" data-action="_actSetPeopleFilterPerson" data-arg0="${esc(r.name)}">`;
      html += `<td><strong>${esc(r.name)}</strong></td>`;
      html += `<td>${r.total}</td>`;
      html += `<td style="color:var(--success)">${r.done}</td>`;
      html += `<td style="color:var(--accent)">${r.active}</td>`;
      html += `<td style="color:var(--danger)">${r.blocked}</td>`;
      html += `<td>${r.notstarted}</td>`;
      html += `<td style="font-family:var(--font-mono)">${r.spent.toFixed(1)}h</td>`;
      html += `<td style="font-family:var(--font-mono)">${r.estimate.toFixed(1)}h</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;

  } else {
    // === INDIVIDUAL PERSON VIEW ===
    const personTasks = filtered.filter(t => isAssignedTo(t, selectedPerson));
    const done = personTasks.filter(t => t.status === 'Done').length;
    const active = personTasks.filter(t => t.status === 'In progress').length;
    const blocked = personTasks.filter(t => t.healthState === 'Blocked').length;
    const totalHrs = personTasks.reduce((s,t) => s + (t.hoursSpent||0), 0);
    const totalEst = personTasks.reduce((s,t) => s + (t.hoursEstimated||0), 0);
    const donePct = personTasks.length ? Math.round(done / personTasks.length * 100) : 0;

    // KPI strip
    html += `<div class="report__section"><div class="report-exec">
      <div class="kpi-card"><div class="kpi-card__value" style="color:var(--accent)">${personTasks.length}</div><div class="kpi-card__label">Assigned</div></div>
      <div class="kpi-card"><div class="kpi-card__value" style="color:var(--success)">${donePct}%</div><div class="kpi-card__label">Complete</div></div>
      <div class="kpi-card"><div class="kpi-card__value" style="color:var(--accent)">${active}</div><div class="kpi-card__label">Active</div></div>
      <div class="kpi-card"><div class="kpi-card__value" style="color:var(--danger)">${blocked}</div><div class="kpi-card__label">Blocked</div></div>
      <div class="kpi-card"><div class="kpi-card__value">${totalHrs.toFixed(1)}</div><div class="kpi-card__label">Hours Spent</div></div>
      <div class="kpi-card"><div class="kpi-card__value" style="color:var(--text-muted)">${totalEst.toFixed(1)}</div><div class="kpi-card__label">Hours Est.</div></div>
    </div></div>`;

    // Hours by client for this person
    const clientList = currentFilter.client ? [currentFilter.client] : getAllClients();
    html += `<div class="report__section"><h2>Hours by Client</h2>`;
    const maxClientHrs = Math.max(...clientList.map(c => personTasks.filter(t => getTaskClient(t) === c).reduce((s,t) => s + (t.hoursSpent||0), 0)), 1);
    html += `<div class="report-workload">`;
    clientList.forEach(c => {
      const ct = personTasks.filter(t => getTaskClient(t) === c);
      const h = ct.reduce((s,t) => s + (t.hoursSpent||0), 0);
      const he = ct.reduce((s,t) => s + (t.hoursEstimated||0), 0);
      if (ct.length === 0) return;
      html += `<div class="rw-row"><div class="rw-name">${esc(c)}</div><div class="rw-bar-wrap"><div class="rw-bar" style="width:${h/maxClientHrs*100}%"><div class="rw-seg" style="flex:1;background:var(--accent)"></div></div></div><div class="rw-nums"><span>${ct.length} tasks</span><span>${h.toFixed(1)}h / ${he.toFixed(1)}h</span></div></div>`;
    });
    html += `</div></div>`;

    // Projects for this person
    const personRoots = new Map();
    personTasks.forEach(t => {
      const root = getRootAncestor(t);
      if (!personRoots.has(root.id)) personRoots.set(root.id, { root, tasks: [] });
      personRoots.get(root.id).tasks.push(t);
    });

    html += `<div class="report__section"><h2>Projects</h2>`;
    html += `<table class="report-table"><thead><tr><th>Project</th><th>Client</th><th>Tasks</th><th>Done</th><th>Active</th><th>Hours</th></tr></thead><tbody>`;
    [...personRoots.values()].forEach(({ root, tasks: pts }) => {
      html += `<tr class="report-table__clickable" data-action="_actSwitchAndOpenDetail" data-arg0="${root.id}">`;
      html += `<td><strong>${esc(root.title)}</strong></td>`;
      html += `<td>${esc(getTaskClient(root))}</td>`;
      html += `<td>${pts.length}</td>`;
      html += `<td style="color:var(--success)">${pts.filter(t=>t.status==='Done').length}</td>`;
      html += `<td style="color:var(--accent)">${pts.filter(t=>t.status==='In progress').length}</td>`;
      html += `<td style="font-family:var(--font-mono)">${pts.reduce((s,t)=>s+(t.hoursSpent||0),0).toFixed(1)}h</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;

    // All tasks for this person
    html += `<div class="report__section"><h2>All Tasks</h2>`;
    html += `<table class="report-table"><thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Health</th><th>Hours</th><th>Due</th></tr></thead><tbody>`;
    personTasks.forEach(t => {
      const root = getRootAncestor(t);
      html += `<tr class="report-table__clickable" data-action="_actSwitchAndOpenDetail" data-arg0="${t.id}">`;
      html += `<td><strong>${esc(t.title)}</strong></td>`;
      html += `<td style="font-size:0.78rem;color:var(--text-muted)">${esc(root.title)}</td>`;
      html += `<td>${statusBadgeHtml(t.status)}</td>`;
      html += `<td>${priorityBadgeHtml(t.priority)}</td>`;
      html += `<td>${t.healthState ? healthBadgeHtml(t.healthState) : '<span style="color:var(--text-muted)">-</span>'}</td>`;
      html += `<td style="font-family:var(--font-mono)">${(t.hoursSpent||0).toFixed(1)}h</td>`;
      html += `<td style="font-size:0.78rem">${t.dueDate ? new Date(t.dueDate+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '<span style="color:var(--text-muted)">-</span>'}</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
}

// =============================================================================
// People → Calendar sub-view (D92, 2026-04-15)
// =============================================================================

/** Render the People → Calendar sub-view. Shows team time-off (vacation /
 *  sick / uto / bank_holiday / firm_closed) in either a roster layout
 *  (one row per person) or a month grid. Reads from _calEvents (shared
 *  with the Projects Calendar). Inline click-to-create wires through the
 *  existing openCalendarEventModal() modal. */
function renderPeopleCalendarView(allPeople, assigneeMerge) {
  const year = _calYear;
  const monthIdx = _calMonth;
  const firstDay = new Date(year, monthIdx, 1);
  const lastDay = new Date(year, monthIdx + 1, 0);
  const daysInMonth = lastDay.getDate();
  const monthName = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  // Helper: resolve a display name to a user_id by looking it up in _cachedUsers.
  // Used for inline create — when the user clicks an empty cell in their own
  // row, we need the user_id to pass to the modal's target user field.
  const lookupUserId = (displayName) => {
    if (!Array.isArray(_cachedUsers)) return null;
    const u = _cachedUsers.find(x => x.display_name === displayName);
    return u ? u.id : null;
  };

  // Build a per-person-per-day index: { 'Glen Pryer|2026-04-16': [event, ...] }
  // We walk each event's start..end range and drop it into every matching cell.
  // Firm closed events are special: they apply to everyone, not a single user.
  const cellKey = (person, dateStr) => `${person}|${dateStr}`;
  const personDay = {};
  const firmClosedDays = new Set();
  const monthStart = new Date(year, monthIdx, 1);
  const monthEnd = new Date(year, monthIdx + 1, 0);
  // For team events (user_id is null, team_id set) we need to know which
  // people to fan the event out to. We synchronously look up team
  // membership from the _teamMembersCache populated alongside _cachedUsers.
  // If missing, the event lands under a synthetic "Team: <name>" row.
  const teamEventRecipients = (teamId) => {
    if (!teamId) return [];
    const cache = (typeof _teamMembersCache === 'object' && _teamMembersCache) ? _teamMembersCache[teamId] : null;
    return Array.isArray(cache) ? cache : [];
  };

  (_calEvents || []).forEach(ev => {
    if (!ev.start_date) return;
    // "Show events from others" filter — respects toggle but firm_closed is
    // always visible since it applies to everyone (bug e49be05e).
    if (!_calShowOthers && _currentUser && ev.user_id !== _currentUser.id && ev.event_type !== 'firm_closed' && !ev.team_id) return;
    const start = new Date(ev.start_date + 'T00:00:00');
    const end = ev.end_date ? new Date(ev.end_date + 'T00:00:00') : start;
    if (isNaN(start.getTime())) return;
    const cursor = new Date(Math.max(start.getTime(), monthStart.getTime()));
    const stop = new Date(Math.min(end.getTime(), monthEnd.getTime()));
    while (cursor <= stop) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
      if (ev.event_type === 'firm_closed') {
        firmClosedDays.add(key);
        // Also fan the firm closure onto every person's row so the roster
        // explicitly shows each person is off, not just the dedicated
        // Firm Closed row at the bottom (Glen follow-up to D92/D93).
        // Dedupe: at most ONE firm_closed bar per person per day, regardless
        // of how many separate firm closures overlap. If the firm is closed
        // it's closed — two events on the same day collapse to one visual.
        (allPeople || []).forEach(person => {
          const ck = cellKey(person, key);
          if (!personDay[ck]) personDay[ck] = [];
          if (!personDay[ck].some(e => e.event_type === 'firm_closed')) personDay[ck].push(ev);
        });
      } else if (ev.team_id) {
        // Team event — fan out to every member of that team (bug d4367137)
        const members = teamEventRecipients(ev.team_id);
        if (members.length > 0) {
          members.forEach(name => {
            const ck = cellKey(name, key);
            if (!personDay[ck]) personDay[ck] = [];
            personDay[ck].push(ev);
          });
        } else {
          // Fallback row: events show under "Team: <name>" when membership isn't cached
          const teamLabel = `Team: ${ev.team_name || 'Unknown'}`;
          const ck = cellKey(teamLabel, key);
          if (!personDay[ck]) personDay[ck] = [];
          personDay[ck].push(ev);
        }
      } else if (ev.user_display_name) {
        const ck = cellKey(ev.user_display_name, key);
        if (!personDay[ck]) personDay[ck] = [];
        personDay[ck].push(ev);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  const typeColour = (t) => {
    const meta = CAL_EVENT_TYPES.find(x => x.value === t);
    return meta ? meta.colour : '#9ca3af';
  };
  const typeLabel = (t) => {
    const meta = CAL_EVENT_TYPES.find(x => x.value === t);
    return meta ? meta.label : t;
  };

  let html = `<div class="report__section" style="margin-top:var(--space-lg)">`;
  // Controls bar: prev/today/next + layout toggle + add-event button
  html += `<div class="people-cal__controls">`;
  html += `<button class="cal__nav-btn" data-action="_actCalPrev">&laquo; Prev</button>`;
  html += `<button class="cal__nav-btn" data-action="_actCalToday">Today</button>`;
  html += `<div class="cal__month-title" style="font-weight:600;font-size:0.95rem">${esc(monthName)}</div>`;
  html += `<button class="cal__nav-btn" data-action="_actCalNext">Next &raquo;</button>`;
  html += `<div style="flex:1"></div>`;
  html += `<div class="task-subview-toggle">
    <button class="task-subview-btn ${_peopleCalView==='roster'?'active':''}" data-action="_actSetPeopleCalView" data-arg0="roster">Roster</button>
    <button class="task-subview-btn ${_peopleCalView==='month'?'active':''}" data-action="_actSetPeopleCalView" data-arg0="month">Month</button>
  </div>`;
  html += `<label style="display:flex;align-items:center;gap:4px;font-size:0.72rem;color:var(--text-muted);cursor:pointer;user-select:none"><input type="checkbox" ${_calShowOthers ? 'checked' : ''} onchange="_calShowOthers=this.checked;_calEventsKey='';renderContent()" style="accent-color:var(--accent)"> Show events from others</label>`;
  html += `<button class="btn btn--sm btn--primary" data-action="openCalendarEventModal">+ Add Event</button>`;
  // Admin quick-add: declare today as firm-closed in one click. Prefills a
  // firm_closed event on today's date for both start and end. Admin can edit
  // the date range or title in the modal before saving — applies to everyone.
  if (_currentUser && _currentUser.role === 'admin') {
    html += `<button class="btn btn--sm" style="background:#64748b;color:#fff;border-color:#64748b" data-action="_actOpenCalEventFirmClosed" data-arg0="${todayStr}" title="Admin: declare a firm-closed day that applies to everyone">&times; Firm Closed (All)</button>`;
  }
  html += `</div>`;

  // Legend
  html += `<div class="people-cal__legend">`;
  CAL_EVENT_TYPES.forEach(t => {
    html += `<span class="people-cal__legend-item"><span class="people-cal__legend-swatch" style="background:${t.colour}"></span>${esc(t.label)}${t.adminOnly ? ' <em style="color:var(--text-muted);font-size:0.65rem">(admin)</em>' : ''}</span>`;
  });
  html += `</div>`;

  if (_peopleCalView === 'roster') {
    // --- ROSTER VIEW -------------------------------------------------------
    // Horizontal: name column + one cell per day of the visible month.
    // Sticky first column so the name stays put while scrolling. Firm-closed
    // days get a grey overlay across every row. Click an empty cell in your
    // own row to create, click a filled cell to edit.
    const myName = (_currentUser && (_currentUser.displayName || _currentUser.display_name)) || '';
    const isAdmin = _currentUser && _currentUser.role === 'admin';
    html += `<div class="people-cal__roster-wrap"><table class="people-cal__roster"><thead><tr>`;
    html += `<th class="people-cal__roster-name">Person</th>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dt = new Date(year, monthIdx, d);
      const dow = dt.getDay();
      const isWknd = (dow === 0 || dow === 6);
      const isToday = dateStr === todayStr;
      const isFirmClosed = firmClosedDays.has(dateStr);
      let cls = 'people-cal__roster-daycol';
      if (isWknd) cls += ' is-weekend';
      if (isToday) cls += ' is-today';
      if (isFirmClosed) cls += ' is-firm-closed';
      html += `<th class="${cls}" data-date="${dateStr}" title="${dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${isFirmClosed ? ' — FIRM CLOSED' : ''}">${d}<div class="people-cal__roster-dow">${['S','M','T','W','T','F','S'][dow]}</div></th>`;
    }
    html += `</tr></thead><tbody>`;
    allPeople.forEach(person => {
      const isMe = person === myName;
      const userId = lookupUserId(person);
      html += `<tr>`;
      html += `<td class="people-cal__roster-name">${esc(person)}</td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const evs = personDay[cellKey(person, dateStr)] || [];
        const isFirmClosed = firmClosedDays.has(dateStr);
        const dt = new Date(year, monthIdx, d);
        const dow = dt.getDay();
        const isWknd = (dow === 0 || dow === 6);
        let cellCls = 'people-cal__roster-cell';
        if (isWknd) cellCls += ' is-weekend';
        if (isFirmClosed) cellCls += ' is-firm-closed';
        const canCreate = isMe || isAdmin;
        const canEdit = (ev) => isAdmin || (myName && ev.user_display_name === myName);
        if (evs.length === 0) {
          if (canCreate) {
            // Empty cell — click to create in this row, prefilled for this user
            const targetId = isMe ? '' : (isAdmin && userId ? userId : '');
            html += `<td class="${cellCls}" data-date="${dateStr}" data-action="_actOpenCalEventForPerson" data-arg0="${dateStr}" data-arg1="${targetId}" data-arg2="${esc(person)}" title="Add event for ${esc(person)} on ${dateStr}"></td>`;
          } else {
            html += `<td class="${cellCls}"></td>`;
          }
        } else {
          // Filled cell — single or multiple events stacked as thin bars
          let inner = '';
          evs.forEach(ev => {
            const editable = canEdit(ev);
            const title = `${typeLabel(ev.event_type)}: ${ev.title || ''}`;
            inner += `<div class="people-cal__roster-bar" style="background:${typeColour(ev.event_type)}" ${editable ? `data-action="openCalendarEventDetail" data-stop data-arg0="${esc(ev.id)}"` : ''} title="${esc(title)}"></div>`;
          });
          html += `<td class="${cellCls}" data-date="${dateStr}">${inner}</td>`;
        }
      }
      html += `</tr>`;
    });
    // Firm closed row (admin-scoped row at the bottom showing any admin-created closures)
    if (firmClosedDays.size > 0 || isAdmin) {
      html += `<tr class="people-cal__roster-firm-row"><td class="people-cal__roster-name">Firm Closed</td>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isFirmClosed = firmClosedDays.has(dateStr);
        if (isFirmClosed) {
          // Find the firm_closed event for this day and wire edit
          const ev = (_calEvents || []).find(e => {
            if (e.event_type !== 'firm_closed' || !e.start_date) return false;
            const s = new Date(e.start_date + 'T00:00:00');
            const en = e.end_date ? new Date(e.end_date + 'T00:00:00') : s;
            const cur = new Date(year, monthIdx, d);
            return s <= cur && cur <= en;
          });
          const clickAttr = isAdmin && ev ? `data-action="openCalendarEventDetail" data-arg0="${esc(ev.id)}"` : '';
          html += `<td class="people-cal__roster-cell is-firm-closed-full" ${clickAttr} title="${ev ? esc(ev.title || 'Firm Closed') : 'Firm Closed'}"></td>`;
        } else if (isAdmin) {
          html += `<td class="people-cal__roster-cell" data-date="${dateStr}" data-action="_actOpenCalEventClosed" data-arg0="${dateStr}" title="Admin: add firm closure"></td>`;
        } else {
          html += `<td class="people-cal__roster-cell"></td>`;
        }
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div>`;
  } else {
    // --- MONTH GRID VIEW ---------------------------------------------------
    // Standard calendar month layout with one cell per day. Each cell
    // shows stacked coloured chips for every person with an event that day.
    const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday-first
    html += `<div class="people-cal__grid">`;
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => { html += `<div class="people-cal__grid-header">${d}</div>`; });
    // Leading blank cells for the first row
    for (let i = 0; i < startDow; i++) {
      html += `<div class="people-cal__grid-cell is-other-month"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isFirmClosed = firmClosedDays.has(dateStr);
      const isToday = dateStr === todayStr;
      const dt = new Date(year, monthIdx, d);
      const dow = dt.getDay();
      const isWknd = (dow === 0 || dow === 6);
      let cls = 'people-cal__grid-cell';
      if (isWknd) cls += ' is-weekend';
      if (isToday) cls += ' is-today';
      if (isFirmClosed) cls += ' is-firm-closed';
      // Collect all events that overlap this day
      const dayEvents = (_calEvents || []).filter(ev => {
        if (!ev.start_date) return false;
        const s = new Date(ev.start_date + 'T00:00:00');
        const en = ev.end_date ? new Date(ev.end_date + 'T00:00:00') : s;
        const cur = new Date(year, monthIdx, d);
        return s <= cur && cur <= en;
      });
      html += `<div class="${cls}" data-date="${dateStr}" data-action="_actOpenCalEventDefault" data-arg0="${dateStr}">`;
      html += `<div class="people-cal__grid-daynum">${d}</div>`;
      if (isFirmClosed) {
        html += `<div class="people-cal__grid-firm-label">FIRM CLOSED</div>`;
      }
      dayEvents.forEach(ev => {
        if (ev.event_type === 'firm_closed') return; // already shown above
        const name = ev.user_display_name || '';
        html += `<div class="people-cal__grid-chip" style="background:${typeColour(ev.event_type)}" data-action="openCalendarEventDetail" data-stop data-arg0="${esc(ev.id)}" title="${esc(typeLabel(ev.event_type))}: ${esc(ev.title || '')} — ${esc(name)}"><span class="people-cal__grid-chip-name">${esc(name.split(' ')[0] || '?')}</span></div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

/** Check if we can staff a lead's required roles — shows green/red per role in the lead detail */
async function checkDealReadiness(leadId) {
  const el = document.getElementById('staffingResult_' + leadId);
  if (!el) return;
  el.innerHTML = '<span style="color:var(--text-muted);font-size:0.75rem">Checking...</span>';
  try {
    const data = await apiCall(`/api/resource-planning/deal-readiness/${leadId}`);
    if (!data) { el.innerHTML = '<span style="color:var(--danger);font-size:0.75rem">Failed</span>'; return; }
    let html = '';
    if (data.readiness.length === 0) { html = '<span style="color:var(--text-muted);font-size:0.75rem">No resource requirements defined</span>'; }
    else {
      data.readiness.forEach(r => {
        const ok = r.canFill;
        html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;margin-bottom:4px">
          <span style="color:${ok ? 'var(--success)' : 'var(--danger)'}">${ok ? '&#10003;' : '&#10007;'}</span>
          <span>${esc(r.role)}</span>
          <span style="color:var(--text-muted)">${r.available}/${r.needed} available</span>
          ${r.users.length > 0 ? `<span style="color:var(--text-muted);font-size:0.7rem">(${r.users.map(u => esc(u.name)).join(', ')})</span>` : ''}
        </div>`;
      });
      html += `<div style="margin-top:6px;font-size:0.82rem;font-weight:600;color:${data.canStaff ? 'var(--success)' : 'var(--danger)'}">${data.canStaff ? '&#10003; Can staff this deal' : '&#10007; Staffing gaps identified'}</div>`;
    }
    el.innerHTML = html;
  } catch(e) { el.innerHTML = `<span style="color:var(--danger);font-size:0.75rem">${esc(e.message)}</span>`; }
}

/** Load and render the capacity heatmap from the resource planning API */
async function loadCapacityHeatmap() {
  const el = document.getElementById('capacityHeatmap');
  if (!el) return;
  try {
    const data = await apiCall('/api/resource-planning/capacity?weeks=8');
    if (!data) { el.innerHTML = '<div style="color:var(--danger);padding:20px">Failed to load capacity data</div>'; return; }

    let html = '<div style="overflow-x:auto">';
    html += '<table class="leads-table" style="table-layout:auto"><thead><tr><th style="width:150px">Person</th><th style="width:60px">Hrs/Wk</th>';
    data.weekLabels.forEach(w => { html += `<th style="text-align:center;min-width:80px">${w}</th>`; });
    html += '</tr></thead><tbody>';

    data.users.forEach(u => {
      html += `<tr><td><strong style="font-size:0.85rem">${esc(u.name)}</strong></td><td style="font-family:var(--font-mono);font-size:0.8rem;text-align:center">${u.capacityPerWeek}h</td>`;
      u.weeks.forEach(w => {
        const util = w.utilisation;
        let bg, fg;
        if (util === 0) { bg = 'var(--bg-surface)'; fg = 'var(--text-muted)'; }
        else if (util < 60) { bg = 'rgba(34,197,94,0.15)'; fg = 'var(--success)'; }
        else if (util < 90) { bg = 'rgba(245,158,11,0.15)'; fg = 'var(--warning)'; }
        else if (util <= 100) { bg = 'rgba(249,115,22,0.2)'; fg = '#f97316'; }
        else { bg = 'rgba(239,68,68,0.2)'; fg = 'var(--danger)'; }
        html += `<td style="text-align:center;background:${bg};font-family:var(--font-mono);font-size:0.78rem;font-weight:600;color:${fg}" title="${u.name}: ${w.committed ?? 0}h / ${w.capacity ?? 40}h (${util ?? 0}%)">${w.committed ?? 0}h<div style="font-size:0.6rem;font-weight:400;color:var(--text-muted)">${util ?? 0}%</div></td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';

    // Legend
    html += `<div style="display:flex;gap:var(--space-lg);margin-top:var(--space-md);font-size:0.75rem;color:var(--text-muted)">
      <span><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:rgba(34,197,94,0.15);margin-right:4px;vertical-align:middle"></span>&lt;60% Available</span>
      <span><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:rgba(245,158,11,0.15);margin-right:4px;vertical-align:middle"></span>60-90% Busy</span>
      <span><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:rgba(249,115,22,0.2);margin-right:4px;vertical-align:middle"></span>90-100% At Capacity</span>
      <span><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:rgba(239,68,68,0.2);margin-right:4px;vertical-align:middle"></span>&gt;100% Overloaded</span>
    </div>`;

    el.innerHTML = html;
  } catch(e) { el.innerHTML = `<div style="color:var(--danger);padding:20px">Error: ${esc(e.message)}</div>`; }
}

// ===== WINDOW REGISTRATIONS =====
window.normaliseAssignees = normaliseAssignees;
window.renderPeopleView = renderPeopleView;
window.renderPeopleCalendarView = renderPeopleCalendarView;
window.checkDealReadiness = checkDealReadiness;
window.loadCapacityHeatmap = loadCapacityHeatmap;

// ===== REGISTER VIEW =====
registerView("people", renderPeopleView);
