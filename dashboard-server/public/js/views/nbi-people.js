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

  let html = renderClientProfileHeader();
  html += `<div class="report">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px"><h1>People</h1>
  <div class="task-subview-toggle">
    <button class="task-subview-btn ${_peopleSubView==='workload'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="workload">Workload</button>
    <button class="task-subview-btn ${_peopleSubView==='capacity'?'active':''}" data-action="_actSetPeopleSubView" data-arg0="capacity">Capacity</button>
  </div></div>`;

  // Capacity heatmap view
  if (_peopleSubView === 'capacity') {
    html += `<div id="capacityHeatmap" style="margin-top:var(--space-lg)"><div style="text-align:center;color:var(--text-muted);padding:40px">Loading capacity data...</div></div>`;
    html += `</div>`;
    el.innerHTML = html;
    loadCapacityHeatmap();
    return;
  }

  // Calendar sub-view removed in People redesign (2026-04-20).
  // renderPeopleCalendarView() function retained for potential future use.

  // The All Time / This Week / This Month / This Quarter buttons used to live
  // here. They filtered the workload table by createdAt / updatedAt, which
  // told you nothing about FORWARD capacity — only when rows were last
  // touched. Glen 2026-05-02: replaced with a per-person 3-week capacity
  // preview rendered inline on each person row below.

  if (allPeople.length === 0) {
    html += emptyState('&#128100;', 'No assignees found', 'Assign people to tasks to see workload data here.');
    html += `</div>`;
    el.innerHTML = html;
    return;
  }

  // === DATA COMPUTATION ===
  function getCapacity(personName) {
    if (!Array.isArray(_cachedUsers)) return 40;
    const u = _cachedUsers.find(x => x.display_name === personName);
    return (u && u.capacity_hours_per_week) || 40;
  }
  const now = new Date(); now.setHours(0,0,0,0);

  // Build the 3-week window — Monday of this week, next, and the following.
  const previewWeeks = [];
  for (let w = 0; w < 3; w++) {
    const wStart = new Date(now); wStart.setDate(wStart.getDate() - wStart.getDay() + 1 + w*7); wStart.setHours(0,0,0,0);
    const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6); wEnd.setHours(23,59,59,0);
    previewWeeks.push({ start: wStart, end: wEnd, label: w === 0 ? 'THIS WK' : w === 1 ? 'NEXT WK' : '+2 WK' });
  }

  /** Compute one person's utilisation % for a given week window — sums
   *  estimated hours across active tasks whose date range overlaps the week,
   *  divides by 40 hours (less days off × 8). Returns 'OFF' if the week
   *  is fully covered by absences. */
  function weekUtilFor(person, weekStart, weekEnd) {
    const weekMs = 7 * 86400000;
    let committed = 0;
    filtered.forEach(t => {
      if (!isAssignedTo(t, person)) return;
      if (t.status === 'Done' || t.status === 'Cancelled') return;
      const est = t.hoursEstimated || 0;
      if (!est) return;
      const tStart = t.startDate ? safeParseDate(t.startDate) : null;
      const tEnd = t.endDate ? safeParseDate(t.endDate) : (t.dueDate ? safeParseDate(t.dueDate) : null);
      if (!tEnd) return;
      const effectiveStart = tStart || tEnd;
      if (effectiveStart > weekEnd || tEnd < weekStart) return;
      const taskDays = Math.max(1, Math.round((tEnd - effectiveStart) / 86400000) + 1);
      const overlapStart = effectiveStart > weekStart ? effectiveStart : weekStart;
      const overlapEnd = tEnd < weekEnd ? tEnd : weekEnd;
      const overlapDays = Math.max(1, Math.round((overlapEnd - overlapStart) / 86400000) + 1);
      committed += est * (overlapDays / taskDays);
    });
    const daysOff = (typeof computeDaysOff === 'function') ? computeDaysOff(person, weekStart, weekEnd, _capacityEvents) : 0;
    const cap = getCapacity(person);
    const effCap = Math.max(0, cap - daysOff * (cap / 5));
    if (effCap === 0) return { pct: null, label: 'OFF', daysOff };
    return { pct: Math.round(committed / effCap * 100), daysOff };
  }

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
      util: (() => { const wk0 = previewWeeks[0]; const u = weekUtilFor(p, wk0.start, wk0.end); return u.pct !== null ? u.pct : 0; })(),
      weeks: previewWeeks.map(wk => weekUtilFor(p, wk.start, wk.end)),
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
  const myName = _currentUser?.displayName || _currentUser?.display_name || '';
  const defaultPerson = (myName && workloadRows.some(r => r.name === myName)) ? myName : (workloadRows.length > 0 ? workloadRows[0].name : null);
  const selectedPerson = _peopleFilter.person || defaultPerson;
  if (!_peopleFilter.person && selectedPerson) _peopleFilter.person = selectedPerson;

  // === RED FLAGS STRIP ===
  const totalBlocked = workloadRows.reduce((s, r) => s + r.blocked, 0);
  const overCapacity = workloadRows.filter(r => r.util > 100).length;
  const nextWeekEnd = new Date(now); nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
  let absentNextWeek = 0;
  allPeople.forEach(p => {
    const off = computeDaysOff(p, now, nextWeekEnd, _capacityEvents);
    if (off > 0) absentNextWeek++;
  });

  html += `<div class="people-flags">`;
  html += `<div class="people-flags__item"><span style="color:var(--danger);font-weight:700;">&#9888; ${overCapacity} over capacity</span></div>`;
  html += `<div class="people-flags__item"><span style="color:var(--danger);font-weight:600;">&#128721; ${totalBlocked} blocked</span></div>`;
  html += `<div class="people-flags__item"><span style="color:var(--text-muted);">&#128197; ${absentNextWeek} absent next week</span></div>`;
  html += `</div>`;

  // === MASTER-DETAIL SPLIT ===
  html += `<div class="people-split">`;

  // --- LEFT PANEL: Team List ---
  html += `<div class="people-list">`;
  html += `<div class="people-list__search"><input type="text" placeholder="Filter team..." value="${esc(_peopleSearchFilter)}" oninput="_actPeopleSearch(this)"></div>`;
  const wlSortBtn = (col, label) => {
    const isActive = _peopleWorkloadSort.col === col;
    const arrow = isActive ? (_peopleWorkloadSort.dir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
    return `<button class="task-subview-btn ${isActive?'active':''}" style="font-size:0.75rem;padding:3px 8px;" data-action="_actTogglePeopleWorkloadSort" data-arg0="${col}">${label}${arrow}</button>`;
  };
  html += `<div style="display:flex;gap:4px;padding:6px 10px;border-bottom:1px solid var(--border-default);flex-wrap:wrap;align-items:center;">`;
  html += `<span style="font-size:0.75rem;color:var(--text-muted);">Sort:</span>`;
  html += wlSortBtn('name', 'Name');
  html += wlSortBtn('total', 'Tasks');
  html += wlSortBtn('hs', 'Hrs Spent');
  html += wlSortBtn('he', 'Hrs Est.');
  html += `</div>`;
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
    if (r.done > 0) html += `<div class="rw-seg" style="flex:${r.done};background:var(--purple)" title="Done: ${r.done}"></div>`;
    if (r.active > 0) html += `<div class="rw-seg" style="flex:${r.active};background:var(--success)" title="Active: ${r.active}"></div>`;
    if (r.blocked > 0) html += `<div class="rw-seg" style="flex:${r.blocked};background:var(--danger)" title="Blocked: ${r.blocked}"></div>`;
    if (other > 0) html += `<div class="rw-seg" style="flex:${other};background:var(--border-subtle, var(--text-muted))" title="Other: ${other}"></div>`;
    html += `</div>`;
    html += `<div class="people-row__stats">`;
    html += `<span>${r.total} tasks &middot; ${r.hs.toFixed(1)}h spent</span>`;
    html += `<span class="${utilClass}">${r.util}% util</span>`;
    html += `</div>`;
    // 3-week capacity preview — this week, next week, +2. Each cell colour-
    // coded: red >95%, amber >70%, green otherwise. OFF means full week of
    // logged absences.
    html += `<div class="people-row__weeks" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:6px">`;
    previewWeeks.forEach((wk, wi) => {
      const w = r.weeks[wi];
      let bg, fg, valueText;
      if (w.label === 'OFF') {
        bg = 'color-mix(in srgb, var(--text-muted) 8%, transparent)';
        fg = 'var(--text-muted)';
        valueText = 'OFF';
      } else {
        const pct = w.pct;
        bg = pct > 95 ? 'color-mix(in srgb, var(--danger) 14%, transparent)' :
             pct > 70 ? 'color-mix(in srgb, var(--warning) 14%, transparent)' :
             'color-mix(in srgb, var(--success) 12%, transparent)';
        fg = pct > 95 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';
        valueText = pct + '%';
      }
      const tip = `${wk.label} — ${wk.start.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}${w.daysOff ? ` · ${w.daysOff}d off` : ''}`;
      html += `<div title="${esc(tip)}" style="background:${bg};border:1px solid color-mix(in srgb, ${fg} 25%, var(--border-default));border-radius:4px;padding:3px 6px;text-align:center">`;
      html += `<div style="font-size:0.75rem;font-weight:700;letter-spacing:0.06em;color:${fg}">${valueText}</div>`;
      html += `<div style="font-size:0.75rem;color:var(--text-muted);letter-spacing:0.04em">${wk.label}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
    html += `</div>`;
  });
  html += `</div></div>`;

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
        let committedHrs = 0;
        tasks.forEach(t => {
          if (!isAssignedTo(t, selectedPerson)) return;
          if (t.status === 'Done' || t.status === 'Cancelled') return;
          const est = t.hoursEstimated || 0;
          if (!est) return;
          const tStart = t.startDate ? safeParseDate(t.startDate) : null;
          const tEnd = t.endDate ? safeParseDate(t.endDate) : (t.dueDate ? safeParseDate(t.dueDate) : null);
          if (!tEnd) return;
          const effectiveStart = tStart || tEnd;
          if (effectiveStart > wk.end || tEnd < wk.start) return;
          const taskDays = Math.max(1, Math.round((tEnd - effectiveStart) / 86400000) + 1);
          const overlapStart = effectiveStart > wk.start ? effectiveStart : wk.start;
          const overlapEnd = tEnd < wk.end ? tEnd : wk.end;
          const overlapDays = Math.max(1, Math.round((overlapEnd - overlapStart) / 86400000) + 1);
          committedHrs += est * (overlapDays / taskDays);
        });
        const daysOff = computeDaysOff(selectedPerson, wk.start, wk.end, _capacityEvents);
        const pCap = getCapacity(selectedPerson);
        const effCap = Math.max(0, pCap - daysOff * (pCap / 5));
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

    }
  }

  html += `</div>`; // close people-detail
  html += `</div>`; // close people-split
  html += `</div>`; // close report
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
  html += `<label style="display:flex;align-items:center;gap:4px;font-size:0.75rem;color:var(--text-muted);cursor:pointer;user-select:none"><input type="checkbox" ${_calShowOthers ? 'checked' : ''} onchange="_calShowOthers=this.checked;_calEventsKey='';renderContent()" style="accent-color:var(--accent)"> Show events from others</label>`;
  html += `<button class="btn btn--sm btn--primary" data-action="openCalendarEventModal">+ Add Event</button>`;
  // Admin quick-add: declare today as firm-closed in one click. Prefills a
  // firm_closed event on today's date for both start and end. Admin can edit
  // the date range or title in the modal before saving — applies to everyone.
  if (_currentUser && _currentUser.role === 'admin') {
    html += `<button class="btn btn--sm" style="background:var(--text-muted);color:#fff;border-color:var(--text-muted)" data-action="_actOpenCalEventFirmClosed" data-arg0="${todayStr}" title="Admin: declare a firm-closed day that applies to everyone">&times; Firm Closed (All)</button>`;
  }
  html += `</div>`;

  // Legend
  html += `<div class="people-cal__legend">`;
  CAL_EVENT_TYPES.forEach(t => {
    html += `<span class="people-cal__legend-item"><span class="people-cal__legend-swatch" style="background:${t.colour}"></span>${esc(t.label)}${t.adminOnly ? ' <em style="color:var(--text-muted);font-size:0.75rem">(admin)</em>' : ''}</span>`;
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
          ${r.users.length > 0 ? `<span style="color:var(--text-muted);font-size:0.75rem">(${r.users.map(u => esc(u.name)).join(', ')})</span>` : ''}
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

    // Auto-select first person if none selected
    if (!_capSelectedPerson && data.users.length > 0) _capSelectedPerson = data.users[0].name;

    const capIsAssigned = (task, personName) => {
      if (!task.assignees || !Array.isArray(task.assignees)) return false;
      const pLower = personName.toLowerCase();
      const pFirst = pLower.split(/\s+/)[0];
      return task.assignees.some(a => { const al = a.toLowerCase().trim(); return al === pLower || al === pFirst || pLower.startsWith(al) || al.startsWith(pLower); });
    };

    let html = '<div class="cap-split">';

    // --- LEFT: Heatmap table ---
    html += '<div class="cap-table-wrap">';
    html += '<table class="leads-table" style="table-layout:fixed"><thead><tr><th style="width:140px">Person</th><th style="width:50px">Hrs/Wk</th>';
    data.weekLabels.forEach(w => { html += `<th class="cap-th-vertical" style="width:56px">${w}</th>`; });
    html += '</tr></thead><tbody>';

    data.users.forEach(u => {
      const isSelected = u.name === _capSelectedPerson;
      html += `<tr class="cap-row--clickable${isSelected ? ' cap-row--selected' : ''}" data-action="_actSelectCapPerson" data-arg0="${esc(u.name)}">`;
      html += `<td><strong style="font-size:0.82rem">${esc(u.name)}</strong></td>`;
      html += `<td style="font-family:var(--font-mono);font-size:0.78rem;text-align:center">${u.capacityPerWeek}h</td>`;
      u.weeks.forEach(w => {
        const util = w.utilisation;
        let bg, fg;
        if (util === 0) { bg = 'var(--bg-surface)'; fg = 'var(--text-muted)'; }
        else if (util < 60) { bg = 'rgba(34,197,94,0.15)'; fg = 'var(--success)'; }
        else if (util < 90) { bg = 'rgba(245,158,11,0.15)'; fg = 'var(--warning)'; }
        else if (util <= 100) { bg = 'rgba(249,115,22,0.2)'; fg = '#f97316'; }
        else { bg = 'rgba(239,68,68,0.2)'; fg = 'var(--danger)'; }
        const offLabel = w.timeOffDays ? ` (${w.timeOffDays}d off)` : '';
        html += `<td style="text-align:center;background:${bg};font-family:var(--font-mono);font-size:0.75rem;font-weight:600;color:${fg}" title="${u.name}: ${w.committed ?? 0}h / ${w.capacity ?? 40}h (${util ?? 0}%)${offLabel}">${w.committed ?? 0}h<div style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">${util ?? 0}%${w.timeOffDays ? ' ✈' : ''}</div></td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';

    // Legend
    html += `<div style="display:flex;gap:var(--space-md);margin-top:var(--space-sm);font-size:0.75rem;color:var(--text-muted);flex-wrap:wrap">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(34,197,94,0.15);margin-right:3px;vertical-align:middle"></span>&lt;60%</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(245,158,11,0.15);margin-right:3px;vertical-align:middle"></span>60-90%</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(249,115,22,0.2);margin-right:3px;vertical-align:middle"></span>90-100%</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(239,68,68,0.2);margin-right:3px;vertical-align:middle"></span>&gt;100%</span>
    </div>`;
    html += '</div>';

    // --- RIGHT: Detail panel ---
    html += '<div class="cap-detail">';
    if (_capSelectedPerson) {
      const selUser = data.users.find(u => u.name === _capSelectedPerson);
      if (selUser) {
        const avgUtil = selUser.weeks.length > 0 ? Math.round(selUser.weeks.reduce((s, w) => s + w.utilisation, 0) / selUser.weeks.length) : 0;
        const totalCommitted = selUser.weeks.reduce((s, w) => s + (w.committed || 0), 0);

        html += '<div class="cap-detail__card">';
        html += `<div class="cap-detail__name">${esc(_capSelectedPerson)}</div>`;

        // KPIs
        html += '<div class="cap-detail__kpi">';
        html += `<div class="cap-detail__kpi-item"><div class="cap-detail__kpi-val" style="color:var(--accent)">${selUser.capacityPerWeek}h</div><div class="cap-detail__kpi-lbl">Cap/Wk</div></div>`;
        const utilCol = avgUtil > 100 ? 'var(--danger)' : avgUtil > 80 ? 'var(--warning)' : 'var(--success)';
        html += `<div class="cap-detail__kpi-item"><div class="cap-detail__kpi-val" style="color:${utilCol}">${avgUtil}%</div><div class="cap-detail__kpi-lbl">Avg Util</div></div>`;
        html += `<div class="cap-detail__kpi-item"><div class="cap-detail__kpi-val">${totalCommitted.toFixed(0)}h</div><div class="cap-detail__kpi-lbl">8wk Total</div></div>`;
        html += '</div>';

        // Task breakdown by client
        const personTasks = tasks.filter(t => capIsAssigned(t, _capSelectedPerson) && t.status !== 'Done' && t.status !== 'Cancelled');
        const clientMap = {};
        personTasks.forEach(t => {
          const client = getTaskClient(t) || 'Unassigned';
          if (!clientMap[client]) clientMap[client] = [];
          clientMap[client].push(t);
        });
        const clientEntries = Object.entries(clientMap).sort((a, b) => b[1].length - a[1].length);

        html += '<div class="cap-detail__section">';
        html += `<div class="cap-detail__section-title">Active Tasks by Client (${personTasks.length})</div>`;
        if (clientEntries.length === 0) {
          html += '<div style="color:var(--text-muted);font-size:0.8rem;padding:6px 0">No active tasks</div>';
        } else {
          clientEntries.forEach(([client, ctasks]) => {
            const clientHrs = ctasks.reduce((s, t) => s + (t.hoursEstimated || 0), 0);
            const clientSpent = ctasks.reduce((s, t) => s + (t.hoursSpent || 0), 0);
            html += '<div class="cap-detail__client">';
            html += `<div class="cap-detail__client-name">${esc(client)} <span style="font-weight:400;font-size:0.75rem;color:var(--text-muted)">${ctasks.length} tasks &middot; ${clientSpent.toFixed(0)}h/${clientHrs.toFixed(0)}h</span></div>`;
            ctasks.slice(0, 8).forEach(t => {
              const root = getRootAncestor(t);
              const label = root.id !== t.id ? root.title + ' → ' + t.title : t.title;
              html += `<div class="cap-detail__task" data-action="openDetailOverlay" data-arg0="${t.id}" style="cursor:pointer">`;
              html += `<span class="cap-detail__task-title" title="${esc(label)}">${esc(label)}</span>`;
              html += `<span class="cap-detail__task-hrs">${(t.hoursEstimated || 0).toFixed(0)}h</span>`;
              html += '</div>';
            });
            if (ctasks.length > 8) html += `<div style="font-size:0.75rem;color:var(--text-muted);padding:3px 0">+ ${ctasks.length - 8} more</div>`;
            html += '</div>';
          });
        }
        html += '</div>';

        // Time-off management
        const selUserObj = _cachedUsers ? _cachedUsers.find(x => x.display_name === _capSelectedPerson) : null;
        if (selUserObj) {
          html += '<div class="cap-detail__section">';
          html += `<div class="cap-detail__section-title">Time Off</div>`;
          html += `<div id="capTimeOffList" data-user-id="${selUserObj.id}"><span style="color:var(--text-muted);font-size:0.78rem">Loading...</span></div>`;
          html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;margin-top:8px;align-items:end">
            <div><label style="font-size:0.75rem;color:var(--text-muted);display:block">From</label><input type="date" id="capTimeOffFrom" style="width:100%;padding:4px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:4px;color:var(--text-primary);font-size:0.78rem"></div>
            <div><label style="font-size:0.75rem;color:var(--text-muted);display:block">To</label><input type="date" id="capTimeOffTo" style="width:100%;padding:4px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:4px;color:var(--text-primary);font-size:0.78rem"></div>
            <div><label style="font-size:0.75rem;color:var(--text-muted);display:block">Label</label><input type="text" id="capTimeOffLabel" placeholder="e.g. Holiday" style="width:100%;padding:4px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:4px;color:var(--text-primary);font-size:0.78rem"></div>
            <button class="btn btn--sm btn--primary" style="padding:4px 10px;font-size:0.75rem" onclick="_addTimeOff()">Add</button>
          </div>`;
          html += '</div>';
        }

        html += '</div>';
      }
    }
    html += '</div>';

    html += '</div>'; // close cap-split
    el.innerHTML = html;

    // Load time-off entries for the selected person
    const timeOffEl = document.getElementById('capTimeOffList');
    if (timeOffEl) _loadTimeOffList(timeOffEl.dataset.userId, timeOffEl);
  } catch(e) { el.innerHTML = `<div style="color:var(--danger);padding:20px">Error: ${esc(e.message)}</div>`; }
}

async function _loadTimeOffList(userId, el) {
  try {
    const entries = await apiCall(`/api/users/${userId}/time-off`);
    if (!entries || entries.length === 0) {
      el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;padding:4px 0">No time off scheduled</div>';
      return;
    }
    let html = '';
    entries.forEach(e => {
      const from = e.start_date.slice(0, 10);
      const to = e.end_date.slice(0, 10);
      const label = e.label ? ` — ${esc(e.label)}` : '';
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-subtle);font-size:0.78rem">
        <span>${from} to ${to}${label}</span>
        <button class="btn btn--sm btn--ghost" style="font-size:0.75rem;padding:2px 6px;color:var(--danger)" onclick="_deleteTimeOff('${e.id}')">Remove</button>
      </div>`;
    });
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = '<div style="color:var(--danger);font-size:0.78rem">Failed to load</div>';
  }
}

async function _addTimeOff() {
  const el = document.getElementById('capTimeOffList');
  if (!el) return;
  const userId = el.dataset.userId;
  const from = document.getElementById('capTimeOffFrom')?.value;
  const to = document.getElementById('capTimeOffTo')?.value;
  const label = document.getElementById('capTimeOffLabel')?.value || '';
  if (!from || !to) { showToast('Please select both From and To dates', 'error'); return; }
  if (new Date(to) < new Date(from)) { showToast('To date must be after From date', 'error'); return; }
  try {
    await apiCall(`/api/users/${userId}/time-off`, { method: 'POST', body: JSON.stringify({ start_date: from, end_date: to, label }) });
    await _loadTimeOffList(userId, el);
    loadCapacityHeatmap();
    if (document.getElementById('capTimeOffFrom')) document.getElementById('capTimeOffFrom').value = '';
    if (document.getElementById('capTimeOffTo')) document.getElementById('capTimeOffTo').value = '';
    if (document.getElementById('capTimeOffLabel')) document.getElementById('capTimeOffLabel').value = '';
    showToast('Time off added');
  } catch (err) { showToast('Failed to add time off', 'error'); }
}

async function _deleteTimeOff(id) {
  const el = document.getElementById('capTimeOffList');
  if (!el) return;
  try {
    await apiCall(`/api/time-off/${id}`, { method: 'DELETE' });
    await _loadTimeOffList(el.dataset.userId, el);
    loadCapacityHeatmap();
    showToast('Time off removed');
  } catch (err) { showToast('Failed to remove time off', 'error'); }
}
