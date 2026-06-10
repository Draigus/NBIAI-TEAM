// ===== GANTT / TIMELINE VIEW =====
let ganttDayWidth = 28; // px per day, adjustable via zoom
let _ganttLabelWidth = 260; // px, draggable column width
let _ganttOffsetDays = 0; // Shift the timeline window: negative = past, positive = future
let _ganttScrolledToToday = false;
let _ganttLinkMode = false;  // Whether dependency link mode is active
let _ganttLinkFrom = null;   // Source task ID when dragging a dependency arrow
let _ganttHideArrows = false;  // Toggle dependency arrows visibility
let _ganttSelectedArrow = null; // { fromId, toId } when an arrow is selected
let _ganttDepView = false;     // Critical path dependency view mode

/** Render the Gantt/timeline view -- horizontal bars per task, grouped by client, with zoom controls */
let _ganttLimit = GANTT_ROW_LIMIT;
let _ganttHideDone = true; // Hide completed tasks by default on timeline
let _ganttScopeId = null; // Scoped view: show only this item and its descendants

function _actSetGanttScope(id) { _ganttScopeId = id; renderContent(); }
function _actClearGanttScope() { _ganttScopeId = null; renderContent(); }

/** Render the Gantt/timeline view with horizontal bars, dependency chains, and zoom controls */
function renderGanttView(filtered) {
  // Scoped view: restrict to subtree of the scoped item
  if (_ganttScopeId) {
    const scopeTask = filtered.find(t => t.id === _ganttScopeId);
    if (!scopeTask) { _ganttScopeId = null; }
    else {
      const descIds = new Set();
      (function collect(pid) { descIds.add(pid); filtered.filter(t => t.parentId === pid).forEach(t => collect(t.id)); })(_ganttScopeId);
      filtered = filtered.filter(t => descIds.has(t.id)).map(t => t.id === _ganttScopeId ? { ...t, parentId: null } : t);
    }
  }
  // Inject missing ancestors so the tree structure is complete for rendering
  if (currentFilter.search) {
    const idSet = new Set(filtered.map(t => t.id));
    const toAdd = [];
    filtered.forEach(t => {
      let cur = t;
      while (cur.parentId && !idSet.has(cur.parentId)) {
        const parent = tasks.find(p => p.id === cur.parentId);
        if (!parent) break;
        idSet.add(parent.id);
        toAdd.push(parent);
        cur = parent;
      }
    });
    if (toAdd.length > 0) filtered = [...filtered, ...toAdd];
  }
  // Show all items in hierarchy (not just leaves), optionally excluding Done
  const allLeafTasks = filtered.filter(t => !_ganttHideDone || t.status !== 'Done');
  if (allLeafTasks.length === 0) return emptyState('&#128197;', 'No items for timeline', 'Add items with due dates to see the Gantt chart.');

  // Mobile card view — replaces the Gantt chart on narrow screens
  if (window.innerWidth <= 768) {
    const now = new Date(); now.setHours(0,0,0,0);
    const dateFmt = { day: '2-digit', month: 'short', year: 'numeric' };
    const roots = allLeafTasks.filter(t => !t.parentId);
    const clientGrps = {};
    roots.forEach(t => { const c = getTaskClient(t) || 'Uncategorised'; if (!clientGrps[c]) clientGrps[c] = []; clientGrps[c].push(t); });
    let html = '<div style="display:flex;flex-direction:column;gap:16px">';
    html += `<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted);cursor:pointer"><input type="checkbox" ${_ganttHideDone ? 'checked' : ''} onchange="_ganttHideDone=this.checked;renderContent()" style="accent-color:var(--accent)"> Hide Done</label>`;
    Object.keys(clientGrps).sort(clientSortOrder).forEach(client => {
      const cKey = 'mgantt_' + client.replace(/\W/g, '_');
      const cCollapsed = collapsedTaskIds.has(cKey);
      html += `<div style="font-size:0.75rem;font-weight:700;color:var(--accent-text);letter-spacing:0.06em;text-transform:uppercase;padding:8px 0;border-bottom:1px solid var(--border-default);display:flex;align-items:center;gap:8px;cursor:pointer" data-action="toggleClientGroup" data-arg0="${cKey}">`;
      html += `<span style="font-size:0.75rem">${cCollapsed ? '&#9654;' : '&#9660;'}</span>`;
      html += `<span>${esc(client)}</span>`;
      html += `</div>`;
      if (cCollapsed) return;
      // Split projects into active vs not-started
      function renderMobileCard(t, depth) {
        if (_ganttHideDone && t.status === 'Done') return;
        const kids = getChildren(t.id).filter(c => !_ganttHideDone || c.status !== 'Done');
        const isParent = kids.length > 0;
        const start = isParent ? ganttRolledStart(t) : ganttTaskStart(t);
        const end = isParent ? ganttRolledEnd(t) : ganttTaskEnd(t);
        const startStr = start ? start.toLocaleDateString('en-GB', dateFmt) : '';
        const endStr = end ? end.toLocaleDateString('en-GB', dateFmt) : '';
        const dateRange = startStr && endStr ? startStr + ' — ' + endStr : startStr || endStr || '—';
        const leafDescAll = []; (function collect(n) { const ch = getChildren(n.id); if (ch.length === 0) leafDescAll.push(n); else ch.forEach(collect); })(t);
        const leafDesc = leafDescAll.filter(l => l.status !== 'Cancelled');
        const total = leafDesc.length || 1;
        const donePct = Math.round(leafDesc.filter(l => l.status === 'Done').length / total * 100);
        const blockedPct = Math.round(leafDesc.filter(l => l.status === 'Blocked' || l.healthState === 'Blocked' || (l.dueDate && l.status !== 'Done' && safeParseDate(l.dueDate) < now)).length / total * 100);
        const inProgPct = Math.round(leafDesc.filter(l => l.status === 'In progress' && l.healthState !== 'Blocked' && !(l.dueDate && safeParseDate(l.dueDate) < now)).length / total * 100);
        const notStartedPct = Math.max(0, 100 - donePct - blockedPct - inProgPct);
        const blocked = t.healthState === 'Blocked' || t.status === 'Blocked';
        const overdue = end && end < now && t.status !== 'Done';
        const hasActivity = leafDesc.some(l => l.status === 'Done' || l.status === 'In progress' || l.status === 'Blocked' || l.healthState === 'Blocked');
        const allNotStarted = !hasActivity && t.status !== 'Done';
        // Not-started projects: collapsed by default, tap arrow to expand (inverted toggle)
        // Active projects: expanded by default, tap arrow to collapse (normal toggle)
        const isCollapsed = (depth === 0 && isParent && allNotStarted)
          ? !collapsedTaskIds.has(t.id)   // inverted: in set = expanded
          : collapsedTaskIds.has(t.id);   // normal: in set = collapsed
        const statusLabel = blocked ? 'BLOCKED' : t.status === 'Done' ? 'DONE' : overdue ? 'OVERDUE' : t.status;
        const statusCol = blocked || overdue ? 'var(--danger)' : t.status === 'Done' ? 'var(--purple)' : t.status === 'In progress' ? 'var(--success)' : 'var(--text-muted)';
        const typeMeta = getItemTypeMeta(t);
        const assignee = (t.assignees && t.assignees[0]) || '';
        const ml = depth * 12;
        const dimStyle = allNotStarted ? 'opacity:0.5;' : '';
        html += `<div style="margin-left:${ml}px;background:var(--bg-card);border:1px solid ${blocked || overdue ? 'var(--danger)' : inProgPct > 0 ? 'var(--success)' : 'var(--border-default)'};border-radius:var(--radius-md);padding:10px 12px;cursor:pointer;${dimStyle}${blocked || overdue ? 'border-left:3px solid var(--danger);' : ''}" data-action="openDetailOverlay" data-arg0="${t.id}">`;
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">`;
        if (isParent) html += `<span style="font-size:0.75rem;color:var(--text-muted);flex-shrink:0" data-action="toggleGanttCollapse" data-stop data-arg0="${t.id}">${isCollapsed ? '&#9654;' : '&#9660;'}</span>`;
        html += `<span class="item-type-badge" style="background:${typeMeta.colour};font-size:0.75rem;padding:0 4px">${typeMeta.label.charAt(0)}</span>`;
        html += `<span style="font-weight:600;font-size:0.82rem;flex:1;word-break:break-word">${esc(t.title)}</span>`;
        if (isParent && isCollapsed) html += `<span style="font-size:0.75rem;color:var(--text-muted)">${kids.length}</span>`;
        html += `<span style="font-size:0.75rem;font-weight:700;color:${statusCol}">${statusLabel.toUpperCase()}</span>`;
        html += `</div>`;
        html += `<div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">`;
        html += `<span>${dateRange}</span>`;
        if (assignee) html += `<span>${esc(assignee)}</span>`;
        html += `</div>`;
        html += `<div style="height:8px;border-radius:4px;overflow:hidden;display:flex;border:1px solid var(--border-default)">`;
        if (donePct > 0) html += `<div style="width:${donePct}%;background:var(--purple)"></div>`;
        if (inProgPct > 0) html += `<div style="width:${inProgPct}%;background:var(--success)"></div>`;
        if (blockedPct > 0) html += `<div style="width:${blockedPct}%;background:var(--danger)"></div>`;
        if (notStartedPct > 0) html += `<div style="width:${notStartedPct}%;background:var(--text-muted)"></div>`;
        html += `</div>`;
        html += `<div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-top:3px">`;
        html += `<span>${donePct > 0 ? donePct + '% done' : ''}${inProgPct > 0 ? ' · ' + inProgPct + '% active' : ''}${blockedPct > 0 ? ' · ' + blockedPct + '% blocked' : ''}</span>`;
        html += `<span>${donePct}%</span>`;
        html += `</div>`;
        html += `</div>`;
        if (isParent && !isCollapsed) kids.forEach(k => renderMobileCard(k, depth + 1));
      }
      clientGrps[client].forEach(t => renderMobileCard(t, 0));
    });
    html += '</div>';
    return html;
  }

  // No truncation. The previous cap (Show More at 300/328 etc.) hid items
  // and irritated more than it helped. Modern browsers render hundreds of
  // bars without trouble; if a workspace ever grows past a few thousand
  // we'll revisit. Glen 2026-05-02.
  let leafTasks = allLeafTasks;

  // Determine date range — span from the earliest start of any item in the
  // visible set to the latest end / due. Glen 2026-05-02: don't anchor to
  // "now ± fixed window" because that hides the part of a project that
  // already happened or extends out beyond the default ceiling. Always
  // include "today" in the range so the TODAY line stays visible even
  // when all work is in the past or future.
  const now = new Date(); now.setHours(0,0,0,0);
  let minDate = new Date(now);
  let maxDate = new Date(now);
  let firstSeen = false;
  leafTasks.forEach(t => {
    const start = ganttTaskStart(t);
    const end = ganttTaskEnd(t);
    if (!firstSeen && (start || end)) { minDate = new Date(start || end); maxDate = new Date(end || start); firstSeen = true; }
    if (start && start < minDate) minDate = new Date(start);
    if (end && end > maxDate) maxDate = new Date(end);
  });
  // Always include today so the TODAY line is on screen.
  if (now < minDate) minDate = new Date(now);
  if (now > maxDate) maxDate = new Date(now);
  // Pad by a few days at each end so bars don't kiss the edge of the chart.
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 7);

  // Apply the navigation offset on top of the auto range so the prev /
  // next buttons still slide the view if Glen wants to see further.
  if (_ganttOffsetDays) {
    minDate.setDate(minDate.getDate() + _ganttOffsetDays);
    maxDate.setDate(maxDate.getDate() + _ganttOffsetDays);
  }

  // Soft cap at 365 days — projects shouldn't span more than a year on
  // screen at once; if they do, the user can zoom. Use round instead of
  // ceil to avoid DST off-by-one errors.
  const totalDays = Math.max(30, Math.min(Math.round((maxDate - minDate) / 86400000), 365));
  const dayW = ganttDayWidth;
  const timelineW = totalDays * dayW;

  // Group ROOT tasks (projects) by client — children are rendered recursively
  const rootTasks = leafTasks.filter(t => !t.parentId);
  const clientGroups = {};
  rootTasks.forEach(t => {
    const client = getTaskClient(t) || 'Uncategorised';
    if (!clientGroups[client]) clientGroups[client] = [];
    clientGroups[client].push(t);
  });

  // Sort clients, then projects within each client by due date
  const sortedClients = Object.keys(clientGroups).sort(clientSortOrder);
  sortedClients.forEach(c => {
    clientGroups[c].sort((a,b) => {
      const da = a.dueDate || '9999'; const db = b.dueDate || '9999';
      return da.localeCompare(db);
    });
  });

  let html = '';
  // Scope banner
  if (_ganttScopeId) {
    const scopeTask = allLeafTasks.find(t => t.id === _ganttScopeId) || filtered.find(t => t.id === _ganttScopeId);
    const scopeName = scopeTask ? esc(scopeTask.title) : 'Unknown';
    const scopeType = scopeTask ? getItemTypeMeta(scopeTask) : { label: 'Item', colour: '#64748b' };
    html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;margin-bottom:8px;background:color-mix(in srgb, var(--accent) 10%, transparent);border:1px solid var(--accent);border-radius:var(--radius-sm);font-size:0.8rem">
      <span style="font-weight:600;color:var(--accent)">Scoped to:</span>
      <span class="item-type-badge" style="background:${scopeType.colour};font-size:0.75rem;padding:0 4px">${scopeType.label.charAt(0)}</span>
      <span style="font-weight:600">${scopeName}</span>
      <button class="btn btn--ghost btn--sm" data-action="_actClearGanttScope" style="margin-left:auto;font-size:0.75rem">Clear scope &times;</button>
    </div>`;
  }
  // Zoom + filter controls
  html += `<div class="gantt__zoom" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:4px">
      <button class="btn btn--outline btn--sm" data-action="_actGanttZoomOut" title="Zoom out">&minus;</button>
      <span style="font-size:0.75rem;color:var(--text-muted);min-width:28px;text-align:center">${dayW}px</span>
      <button class="btn btn--outline btn--sm" data-action="_actGanttZoomIn" title="Zoom in">+</button>
    </div>
    <div style="display:flex;align-items:center;gap:4px">
      <button class="btn btn--outline btn--sm" data-action="_actGanttBack" title="Back 1 month">&larr;</button>
      <button class="btn btn--outline btn--sm" data-action="_actGanttToday" title="Jump to today" style="font-size:0.75rem">Today</button>
      <button class="btn btn--outline btn--sm" data-action="_actGanttFwd" title="Forward 1 month">&rarr;</button>
    </div>
    <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted);cursor:pointer;user-select:none">
      <input type="checkbox" ${_ganttHideDone ? 'checked' : ''} onchange="_ganttHideDone=this.checked;renderContent()" style="accent-color:var(--accent)"> Hide Done
    </label>
    <div class="add-item-menu" style="position:relative;display:inline-flex">
      <button class="btn btn--sm ${_ganttLinkMode || _ganttDepView ? 'btn--primary' : 'btn--outline'}" data-action="toggleGanttDepMenu" data-pass-event style="font-size:0.75rem">&#128279; Prerequisites &#9660;</button>
      <div id="ganttDepMenu" style="display:none;position:absolute;top:100%;right:0;margin-top:4px;background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-sm);box-shadow:var(--shadow-lg);z-index:400;min-width:180px;overflow:hidden">
        <div class="picker-row" data-action="_actToggleGanttLinkMode">
          <span style="width:18px;text-align:center">${_ganttLinkMode ? '&#10003;' : ''}</span> ${_ganttLinkMode ? 'Stop Linking' : 'Link Mode'}
        </div>
        <div class="picker-row" data-action="_actToggleGanttHideArrows">
          <span style="width:18px;text-align:center">${_ganttHideArrows ? '' : '&#10003;'}</span> Show Arrows
        </div>
        <div style="border-top:1px solid var(--border-default)"></div>
        <div class="picker-row" data-action="_actToggleGanttDepView">
          <span style="width:18px;text-align:center">${_ganttDepView ? '&#10003;' : ''}</span> Prerequisite View
        </div>
      </div>
    </div>
  </div>`;

  html += `<div class="gantt ${_ganttLinkMode ? 'gantt-link-mode' : ''}" style="width:100%;--gantt-label-w:${_ganttLabelWidth}px;--gantt-content-w:${_ganttLabelWidth + timelineW}px" data-action="_actDeselectGanttArrowIfNeeded" data-pass-event>`;

  // Draggable column resize handle
  html += `<div class="gantt__col-resize" style="left:${_ganttLabelWidth - 3}px" onmousedown="ganttColResizeStart(event)"></div>`;

  // Collect milestones for the timeline (trigger load if cache is empty)
  const _ganttMilestones = [];
  if (Object.keys(_milestonesCache).length === 0 && Object.keys(_apiClientsCache).length > 0) {
    loadAllMilestones().then(() => { if (currentView === 'tasks' && taskSubView === 'gantt') renderContent(); });
  }
  const _msClients = currentFilter.client
    ? [_apiClientsCache[currentFilter.client]].filter(Boolean)
    : Object.values(_apiClientsCache || {}).filter(c => c.has_active_work);
  _msClients.forEach(c => {
    if (!_milestonesCache[c.id]) {
      loadMilestones(c.id).then(() => { if (currentView === 'tasks' && taskSubView === 'gantt') renderContent(); });
      _milestonesCache[c.id] = [];
    }
    _milestonesCache[c.id].forEach(ms => {
      if (!ms.target_date) return;
      const md = new Date(ms.target_date);
      const localD = new Date(md.getFullYear(), md.getMonth(), md.getDate());
      const off = Math.round((localD - minDate) / 86400000);
      if (off >= 0 && off < totalDays) _ganttMilestones.push({ title: ms.title, offset: off });
    });
  });

  // Header row: months + day numbers
  html += `<div class="gantt__header">`;
  html += `<div class="gantt__label-col">Item</div>`;
  html += `<div style="display:flex;flex-direction:column;flex:1;min-width:${timelineW}px">`;

  // Month row
  html += `<div style="display:flex">`;
  let d = new Date(minDate);
  while (d < maxDate) {
    const monthStart = new Date(d);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const end = monthEnd < maxDate ? monthEnd : maxDate;
    const daysInMonth = Math.ceil((end - monthStart) / 86400000);
    html += `<div class="gantt__month" style="width:${daysInMonth * dayW}px">${monthStart.toLocaleDateString('en-GB', {month:'short', year:'numeric'})}</div>`;
    d = monthEnd;
  }
  html += `</div>`;

  // Day headers
  html += `<div class="gantt__day-headers">`;
  d = new Date(minDate);
  for (let i = 0; i < totalDays; i++) {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    const msHit = _ganttMilestones.filter(m => m.offset === i);
    let cls = 'gantt__day-hdr';
    if (isWeekend) cls += ' gantt__day-hdr--weekend';
    if (isToday) cls += ' gantt__day-hdr--today';
    if (msHit.length > 0) cls += ' gantt__day-hdr--milestone';
    const msTitle = msHit.length > 0 ? ` title="${msHit.map(m => m.title).join(', ')}"` : '';
    html += `<div class="${cls}" style="width:${dayW}px"${msTitle}>${d.getDate()}</div>`;
    d.setDate(d.getDate() + 1);
  }
  html += `</div>`;
  html += `</div>`; // close timeline header column
  html += `</div>`; // close header

  const _pad2 = n => String(n).padStart(2, '0');
  const _localISO = d => `${d.getFullYear()}-${_pad2(d.getMonth()+1)}-${_pad2(d.getDate())}`;

  // Body
  html += `<div class="gantt__body">`;

  if (_ganttDepView) {
    // ===== CRITICAL PATH / DEPENDENCY VIEW =====
    // Show only items involved in dependency chains, topologically sorted (prerequisites first)
    const depTaskIds = new Set();
    leafTasks.forEach(t => {
      if (t.dependencies && t.dependencies.length > 0) { depTaskIds.add(t.id); t.dependencies.forEach(d => depTaskIds.add(d)); }
    });
    leafTasks.forEach(t => { if (getDependents(t.id).length > 0) depTaskIds.add(t.id); });
    const depTasks = leafTasks.filter(t => depTaskIds.has(t.id));

    // Topological sort: prerequisites before dependents
    const sorted = [];
    const visited = new Set();
    /** Topological sort visitor — recursively visits prerequisites before the task itself */
    function topoVisit(id) {
      if (visited.has(id)) return;
      visited.add(id);
      const t = depTasks.find(x => x.id === id);
      if (!t) return;
      (t.dependencies || []).forEach(depId => topoVisit(depId));
      sorted.push(t);
    }
    depTasks.forEach(t => topoVisit(t.id));

    if (sorted.length === 0) {
      html += `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:0.85rem">No prerequisite chains found. Use Link mode to create prerequisites between items.</div>`;
    } else {
      // Header row
      html += `<div class="gantt__row gantt__row--group">`;
      html += `<div class="gantt__row-label" style="font-weight:600">Critical Path <span style="font-size:0.75rem;color:var(--text-muted);font-weight:400">(${sorted.length} items)</span></div>`;
      html += `<div class="gantt__row-timeline" style="min-width:${timelineW}px">`;
      html += ganttDayCols(totalDays, dayW, minDate, now);
      html += `</div></div>`;

      // Compute chain depth for indentation (0 = no prerequisites, deeper = more prereqs above)
      const depthMemo = {};
      const _depVisiting = new Set();
      function depChainDepth(t) {
        if (depthMemo[t.id] !== undefined) return depthMemo[t.id];
        if (_depVisiting.has(t.id)) { depthMemo[t.id] = 0; return 0; }
        if (!t.dependencies || t.dependencies.length === 0) { depthMemo[t.id] = 0; return 0; }
        _depVisiting.add(t.id);
        let maxD = 0;
        t.dependencies.forEach(depId => { const dep = tasks.find(x => x.id === depId); if (dep) maxD = Math.max(maxD, depChainDepth(dep) + 1); });
        _depVisiting.delete(t.id);
        depthMemo[t.id] = maxD;
        return maxD;
      }
      sorted.forEach(t => depChainDepth(t));

      // Render rows
      sorted.forEach(t => {
        const start = ganttTaskStart(t);
        const end = ganttTaskEnd(t);
        const barClass = ganttBarClass(t);
        const chainDepth = depthMemo[t.id] || 0;
        const indent = chainDepth * 20;
        const typeMeta = getItemTypeMeta(t);
        const prereqBlocked = getIncompletePrereqs(t).length > 0;

        html += `<div class="gantt__row">`;
        html += `<div class="gantt__row-label" data-action="openDetailOverlay" data-arg0="${t.id}" title="${esc(t.title)}" style="padding-left:${8 + indent}px;font-size:0.75rem">`;
        html += `<span class="item-type-badge" style="background:${typeMeta.colour};font-size:0.75rem;padding:0 4px">${typeMeta.label.charAt(0)}</span>`;
        if (prereqBlocked) html += `<span style="color:var(--warning);font-size:0.75rem">&#128274;</span>`;
        html += `<span style="overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>`;
        html += `</div>`;
        html += `<div class="gantt__row-timeline" style="min-width:${timelineW}px">`;
        html += ganttDayCols(totalDays, dayW, minDate, now);
        const todayOff = Math.round((now - minDate) / 86400000);
        if (todayOff >= 0 && todayOff < totalDays) html += `<div class="gantt__today-line" style="left:${todayOff * dayW}px;width:${dayW}px"></div>`;
        _ganttMilestones.forEach(ms => { html += `<div class="gantt__milestone-line" style="left:${ms.offset * dayW}px;width:${dayW}px" title="${esc(ms.title)}" data-ms-title="${esc(ms.title)}"></div>`; });
        if (start && end && end >= start) {
          const rawOff = Math.round((start - minDate) / 86400000);
          const sOff = Math.max(0, rawOff);
          const dur = Math.max(1, Math.ceil((end - start) / 86400000) + 1) - (sOff - rawOff);
          if (dur > 0) {
            html += `<div class="gantt__bar ${barClass}" style="left:${sOff * dayW}px;width:${dur * dayW}px" data-task-id="${t.id}" data-start="${_localISO(start)}" data-end="${_localISO(end)}" data-min-date="${_localISO(minDate)}" data-day-width="${dayW}" onmousedown="ganttBarDragStart(event,'${t.id}','move')" ondblclick="event.stopPropagation();openDetailOverlay('${t.id}')" title="${esc(t.title)} | ${t.status}${blockerTooltip(t)}">`;
            if (dur * dayW > 40) html += `<span style="overflow:hidden;text-overflow:ellipsis;pointer-events:none;flex:1">${esc(t.title)}</span>`;
            html += `</div>`;
          }
        } else if (end) {
          const eOff = Math.max(0, Math.round((end - minDate) / 86400000));
          html += `<div class="gantt__bar ${barClass}" style="left:${eOff * dayW}px;width:${dayW}px" data-task-id="${t.id}" title="${esc(t.title)} — due ${t.dueDate}"></div>`;
        }
        html += `</div></div>`;
      });
    }
  } else {
  // ===== NORMAL HIERARCHICAL VIEW =====
  sortedClients.forEach(client => {
    // Client group header row
    html += `<div class="gantt__row gantt__row--group">`;
    const totalClientItems = clientGroups[client].reduce((s, r) => s + 1 + getDescendants(r.id).length, 0);
    const cAttr = escAttrJs(client);
    // Depth-quick-select buttons: P / F / S collapse the client's tree to
    // the chosen level (project / feature / story). T is "show all the way
    // down to Tasks". Buttons live on the client header so each client can
    // be set independently. Compact: 1-char labels and tight padding so all
    // four fit inside the 260px row label.
    const depthBtns = `<span style="display:inline-flex;gap:2px;margin-left:6px;vertical-align:middle;flex-shrink:0">
      <button class="gantt__depth-btn" data-stop onclick="event.stopPropagation();_actGanttClientDepth('${cAttr}',0)" title="Show projects only">P</button>
      <button class="gantt__depth-btn" data-stop onclick="event.stopPropagation();_actGanttClientDepth('${cAttr}',1)" title="Show through features">F</button>
      <button class="gantt__depth-btn" data-stop onclick="event.stopPropagation();_actGanttClientDepth('${cAttr}',2)" title="Show through stories">S</button>
      <button class="gantt__depth-btn" data-stop onclick="event.stopPropagation();_actGanttClientDepth('${cAttr}',9)" title="Expand everything down to tasks">T</button>
      <span class="gantt__divider"></span>
      <button class="gantt__depth-btn gantt__depth-btn--docs" data-stop onclick="event.stopPropagation();_actDocsOpenForClient('${cAttr}')" title="Open documentation for this client">Docs</button>
    </span>`;
    // Drop the "(N items)" count to free up width for the depth buttons —
    // the chevron under each project already conveys content existence.
    html += `<div class="gantt__row-label" style="display:flex;align-items:center;gap:4px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(client)}</span>${depthBtns}</div>`;
    html += `<div class="gantt__row-timeline" style="min-width:${timelineW}px">`;
    // Day columns for background
    html += ganttDayCols(totalDays, dayW, minDate, now);
    html += `</div></div>`;

    /** Render a single Gantt row with bar, label, and recursively render child rows */
    function renderGanttRow(t, depth) {
      if (_ganttHideDone && t.status === 'Done') return;
      const kids = getChildren(t.id).filter(c => !_ganttHideDone || c.status !== 'Done');
      const isParent = kids.length > 0;
      const isCollapsed = collapsedTaskIds.has(t.id);
      // Parent rows always use the rolled-up date range — a project with no
      // explicit start/end of its own should still span its descendant work,
      // not a phantom createdAt+7d. Leaf rows use their own dates. Glen
      // 2026-05-02: this applies whether the parent is expanded or collapsed.
      const useRolled = isParent;
      const start = useRolled ? ganttRolledStart(t) : ganttTaskStart(t);
      const end = useRolled ? ganttRolledEnd(t) : ganttTaskEnd(t);
      const barClass = ganttBarClass(t);
      const indent = depth * 16;
      const typeMeta = getItemTypeMeta(t);
      const fontWeight = isParent ? '600' : '400';
      const fontSize = depth === 0 ? '0.78rem' : '0.72rem';

      // Percent complete: hours spent ÷ hours estimated across descendants.
      // Falls back to status (Done=100%) when no hours are estimated.
      const hrs = aggHours(t.id);
      let pctVal = hrs.est > 0 ? Math.round(hrs.spent / hrs.est * 100) : (t.status === 'Done' ? 100 : 0);
      const blocked = t.healthState === 'Blocked' || t.status === 'Blocked';
      const overdue = end && end < now && t.status !== 'Done';
      const daysToEnd = end ? Math.round((end - now) / 86400000) : null;
      const subColCls = blocked ? 'gantt__row-sub--blocked' : (overdue ? 'gantt__row-sub--red' : (daysToEnd !== null && daysToEnd >= 0 && daysToEnd <= 14 ? 'gantt__row-sub--amber' : ''));
      const subText = blocked ? 'BLOCKED' : (daysToEnd === null ? '' : daysToEnd < 0 ? `${Math.abs(daysToEnd)}d OVERDUE` : daysToEnd === 0 ? 'TODAY' : `${daysToEnd}d to close`);
      // Health class drives the progress-fill colour: red overdue, amber
      // within 14d, blocked grey, green otherwise. Mirrors Portfolio +
      // Reporting so the same colour means the same thing everywhere.
      const healthCls = 'gantt__bar--health-' + (
        blocked ? 'blocked' :
        overdue ? 'red' :
        (t.healthState === 'Red') ? 'red' :
        (t.healthState === 'Yellow') ? 'amber' :
        (daysToEnd !== null && daysToEnd >= 0 && daysToEnd <= 14) ? 'amber' :
        'green'
      );

      html += `<div class="gantt__row">`;
      html += `<div class="gantt__row-label" data-action="openDetailOverlay" data-arg0="${t.id}" title="${esc(t.title)}" style="padding-left:${8 + indent}px;font-weight:${fontWeight};font-size:${fontSize};flex-direction:column;align-items:flex-start;justify-content:center">`;
      html += `<div style="display:flex;align-items:center;gap:6px;width:100%;overflow:hidden">`;
      // Collapse toggle for parent items
      if (isParent) {
        html += `<span class="gantt__collapse-toggle" data-action="toggleGanttCollapse" data-stop data-arg0="${t.id}">${isCollapsed ? '&#9654;' : '&#9660;'}</span>`;
      } else {
        html += `<span style="width:14px;display:inline-block"></span>`;
      }
      html += `<span class="item-type-badge" style="background:${typeMeta.colour};font-size:0.75rem;padding:0 4px">${typeMeta.label.charAt(0)}</span>`;
      if (isTaskIncomplete(t)) html += `<span style="color:var(--danger);font-size:0.75rem">&#9888;</span>`;
      html += `<span style="overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>`;
      if (isParent && isCollapsed) html += `<span style="font-size:0.75rem;color:var(--text-muted);margin-left:4px">(${kids.length})</span>`;
      if (isParent) html += `<span class="gantt__scope-btn" data-action="_actSetGanttScope" data-stop data-arg0="${t.id}" title="Scope view to this item">&#9678;</span>`;
      html += `</div>`;
      // Subtitle: "Nd to close · X%"
      const subParts = [subText, pctVal + '%'].filter(Boolean);
      if (subParts.length) html += `<div class="gantt__row-sub ${subColCls}" style="padding-left:${22}px">${subParts.join(' · ')}</div>`;
      html += `</div>`;
      html += `<div class="gantt__row-timeline" style="min-width:${timelineW}px">`;
      html += ganttDayCols(totalDays, dayW, minDate, now);

      // Today line
      const todayOffset = Math.round((now - minDate) / 86400000);
      if (todayOffset >= 0 && todayOffset < totalDays) {
        html += `<div class="gantt__today-line" style="left:${todayOffset * dayW}px;width:${dayW}px"></div>`;
      }
      // Milestone lines
      _ganttMilestones.forEach(ms => { html += `<div class="gantt__milestone-line" style="left:${ms.offset * dayW}px;width:${dayW}px" title="${esc(ms.title)}" data-ms-title="${esc(ms.title)}"></div>`; });

      // Bar — clamp left edge so bars never render behind the label column
      if (start && end && end >= start) {
        const rawStartOff = Math.round((start - minDate) / 86400000);
        const startOff = Math.max(0, rawStartOff);
        const rawDur = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
        const dur = rawDur - (startOff - rawStartOff); // trim days lost to clamping
        if (dur <= 0) { /* bar entirely before visible range */ } else {
        const left = startOff * dayW;
        const width = dur * dayW;
        const startISO = _localISO(start);
        const endISO = _localISO(end);
        const selCls = _ganttSelectedTaskId === t.id ? ' selected' : '';
        html += `<div class="gantt__bar ${barClass} ${healthCls}${selCls}" style="left:${left}px;width:${width}px" data-task-id="${t.id}" data-start="${startISO}" data-end="${endISO}" data-min-date="${_localISO(minDate)}" data-day-width="${dayW}" onmousedown="ganttBarDragStart(event,'${t.id}','move')" ondblclick="event.stopPropagation();openDetailOverlay('${t.id}')" title="${esc(t.title)} | ${t.status} | ${startISO} to ${endISO} | ${pctVal}% complete${blockerTooltip(t)}">`;
        // Progress fill (pointer-events:none so drag/resize still works
        // through it). Hidden when status is Done — the whole bar is
        // already success-coloured and a fill would be redundant.
        if (t.status !== 'Done' && pctVal > 0) {
          html += `<div class="gantt__bar-progress" style="width:${pctVal}%"></div>`;
        }
        html += `<div class="gantt__bar-handle gantt__bar-handle--left" onmousedown="event.stopPropagation();ganttBarDragStart(event,'${t.id}','resize-start')"></div>`;
        if (width > 40) html += `<span style="overflow:hidden;text-overflow:ellipsis;pointer-events:none;flex:1;position:relative;z-index:1">${esc(t.title)}</span>`;
        // Percent label at the right edge — readable without depending on
        // bar width.
        if (width > 60 && t.status !== 'Done' && pctVal > 0) html += `<span class="gantt__bar-pct">${pctVal}%</span>`;
        html += `<div class="gantt__bar-handle gantt__bar-handle--right" onmousedown="event.stopPropagation();ganttBarDragStart(event,'${t.id}','resize-end')"></div>`;
        html += `</div>`;
        } // close dur > 0
      } else if (end) {
        // Single-day bar (due date only, no start) — uses status colour
        const endOff = Math.max(0, Math.round((end - minDate) / 86400000));
        const endISO = _localISO(end);
        html += `<div class="gantt__bar ${barClass}" style="left:${endOff * dayW}px;width:${dayW}px" data-task-id="${t.id}" data-start="${endISO}" data-end="${endISO}" data-min-date="${_localISO(minDate)}" data-day-width="${dayW}" onmousedown="ganttBarDragStart(event, '${t.id}', 'move')" ondblclick="event.stopPropagation();openDetailOverlay('${t.id}')" title="${esc(t.title)} — due ${t.dueDate}"></div>`;
      } else if (start) {
        // Single-day bar (start only, no due date) — uses status colour, dimmed
        const startOff = Math.max(0, Math.round((start - minDate) / 86400000));
        const startISO = _localISO(start);
        html += `<div class="gantt__bar ${barClass}" style="left:${startOff * dayW}px;width:${dayW}px;opacity:0.5" data-task-id="${t.id}" data-start="${startISO}" data-end="${startISO}" data-min-date="${_localISO(minDate)}" data-day-width="${dayW}" onmousedown="ganttBarDragStart(event, '${t.id}', 'move')" ondblclick="event.stopPropagation();openDetailOverlay('${t.id}')" title="${esc(t.title)} — no due date"></div>`;
      }

      html += `</div></div>`;
      // Recurse into children (skip if collapsed)
      if (!isCollapsed) {
        kids.forEach(c => renderGanttRow(c, depth + 1));
      }
    }
    // Render root tasks (projects) for this client, then recurse
    clientGroups[client].forEach(t => renderGanttRow(t, 0));
  });
  } // close if/else _ganttDepView

  html += `<svg class="gantt__arrows" id="ganttArrowsSvg"></svg>`;
  html += `</div>`; // close body
  html += `</div>`; // close gantt

  return html;
}

/** Draw SVG dependency arrows on the Gantt chart — called after DOM render via requestAnimationFrame */
/** Draw dependency arrows on the Gantt chart: right edge of prerequisite → left edge of dependent */
function drawGanttArrows() {
  const svg = document.getElementById('ganttArrowsSvg');
  if (!svg) return;
  if (_ganttHideArrows) { svg.innerHTML = ''; return; }
  const ganttBody = svg.closest('.gantt');
  if (!ganttBody) return;
  svg.setAttribute('width', ganttBody.scrollWidth);
  svg.setAttribute('height', ganttBody.scrollHeight);
  // Arrowhead markers for done (green) and pending (orange)
  svg.innerHTML = `<defs>
    <marker id="depArrowDone" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="var(--purple)"/></marker>
    <marker id="depArrowPending" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="var(--warning)"/></marker>
  </defs>`;

  // Build a map of task ID → bar element
  const barMap = {};
  ganttBody.querySelectorAll('.gantt__bar[data-task-id]').forEach(bar => { barMap[bar.dataset.taskId] = bar; });

  // Get scroll-aware origin: the gantt element's position relative to the viewport, adjusted for scroll
  const ganttRect = ganttBody.getBoundingClientRect();
  const scrollLeft = ganttBody.scrollLeft || 0;
  const scrollTop = ganttBody.scrollTop || 0;

  tasks.forEach(t => {
    if (!t.dependencies || t.dependencies.length === 0) return;
    const toBar = barMap[t.id]; // dependent bar (this task)
    if (!toBar) return;
    t.dependencies.forEach(depId => {
      const fromBar = barMap[depId]; // prerequisite bar
      if (!fromBar) return;

      const fr = fromBar.getBoundingClientRect();
      const tr = toBar.getBoundingClientRect();

      // Right edge of prerequisite → left edge of dependent (scroll-adjusted)
      const x1 = fr.right - ganttRect.left + scrollLeft;
      const y1 = fr.top + fr.height / 2 - ganttRect.top + scrollTop;
      const x2 = tr.left - ganttRect.left + scrollLeft;
      const y2 = tr.top + tr.height / 2 - ganttRect.top + scrollTop;

      // Route the connector: right-angle path with sensible routing
      const gap = 12; // horizontal gap before/after vertical segment
      let d;
      if (x2 > x1 + gap * 2) {
        // Normal: prereq ends before dependent starts — straight connector
        const midX = (x1 + x2) / 2;
        d = `M${x1},${y1} H${midX} V${y2} H${x2}`;
      } else {
        // Overlap: dependent starts before prereq ends — route around
        const rowH = 16;
        const detourY = Math.max(y1, y2) + rowH;
        d = `M${x1},${y1} H${x1 + gap} V${detourY} H${x2 - gap} V${y2} H${x2}`;
      }

      const depTask = tasks.find(dd => dd.id === depId);
      const isDone = depTask && depTask.status === 'Done';
      const isSelected = _ganttSelectedArrow && _ganttSelectedArrow.fromId === depId && _ganttSelectedArrow.toId === t.id;

      // Invisible wide hit area for clicking
      const hitEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitEl.setAttribute('d', d);
      hitEl.setAttribute('class', 'gantt__arrow-hit');
      hitEl.dataset.fromId = depId;
      hitEl.dataset.toId = t.id;
      hitEl.addEventListener('click', (ev) => { ev.stopPropagation(); selectGanttArrow(depId, t.id); });
      hitEl.addEventListener('mousedown', (ev) => {
        if (_ganttSelectedArrow && _ganttSelectedArrow.fromId === depId && _ganttSelectedArrow.toId === t.id) {
          ev.stopPropagation();
          startArrowRedrag(ev, depId, t.id, ganttBody, ganttRect, scrollLeft, scrollTop, x1, y1);
        }
      });
      svg.appendChild(hitEl);

      // Visible arrow path
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', d);
      pathEl.setAttribute('class', 'gantt__arrow ' + (isSelected ? 'gantt__arrow--selected' : isDone ? 'gantt__arrow--done' : 'gantt__arrow--pending'));
      if (!isSelected) pathEl.setAttribute('marker-end', isDone ? 'url(#depArrowDone)' : 'url(#depArrowPending)');
      else pathEl.setAttribute('marker-end', 'url(#depArrowPending)');
      svg.appendChild(pathEl);
    });
  });
}

/** Select a dependency arrow for editing (delete or re-drag) */
function selectGanttArrow(fromId, toId) {
  _ganttSelectedArrow = { fromId, toId };
  drawGanttArrows(); // redraw with selected state
  const fromTask = tasks.find(t => t.id === fromId);
  const toTask = tasks.find(t => t.id === toId);
  toast(`Selected: "${fromTask?.title || '?'}" → "${toTask?.title || '?'}". Press Delete to remove, or drag to reconnect.`);
}

/** Deselect the current arrow */
function deselectGanttArrow() {
  if (!_ganttSelectedArrow) return;
  _ganttSelectedArrow = null;
  drawGanttArrows();
}

/** Re-drag a selected arrow's endpoint to a new target bar */
function startArrowRedrag(e, fromId, toId, ganttBody, ganttRect, scrollLeft, scrollTop, x1, y1) {
  e.preventDefault();
  const svg = document.getElementById('ganttArrowsSvg');
  if (!svg) return;

  // Draw a preview line from the prereq bar to the cursor
  const previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  previewLine.id = 'ganttArrowRedrag';
  previewLine.setAttribute('stroke', 'var(--accent)');
  previewLine.setAttribute('stroke-width', '2');
  previewLine.setAttribute('stroke-dasharray', '6 3');
  previewLine.setAttribute('x1', x1);
  previewLine.setAttribute('y1', y1);
  previewLine.setAttribute('x2', e.clientX - ganttRect.left + scrollLeft);
  previewLine.setAttribute('y2', e.clientY - ganttRect.top + scrollTop);
  svg.appendChild(previewLine);

  /** Track mouse movement during arrow redrag — update preview line endpoint */
  function onMove(ev) {
    const line = document.getElementById('ganttArrowRedrag');
    if (!line) return;
    line.setAttribute('x2', ev.clientX - ganttRect.left + scrollLeft);
    line.setAttribute('y2', ev.clientY - ganttRect.top + scrollTop);
    document.querySelectorAll('.gantt__bar.gantt-link-target').forEach(b => b.classList.remove('gantt-link-target'));
    const target = ev.target.closest('.gantt__bar');
    if (target && target.dataset.taskId && target.dataset.taskId !== fromId) {
      target.classList.add('gantt-link-target');
    }
  }

  /** Finish arrow redrag — clean up visuals and apply the new dependency target */
  function onUp(ev) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    const line = document.getElementById('ganttArrowRedrag');
    if (line) line.remove();
    document.querySelectorAll('.gantt__bar.gantt-link-target').forEach(b => b.classList.remove('gantt-link-target'));

    const target = ev.target.closest('.gantt__bar');
    const newToId = target?.dataset?.taskId;

    if (!newToId || newToId === fromId || newToId === toId) {
      // No change or invalid target
      return;
    }

    // Validate the new connection
    const newDepTask = tasks.find(t => t.id === newToId);
    if (!newDepTask) return;
    if (newDepTask.dependencies && newDepTask.dependencies.includes(fromId)) {
      toast('This prerequisite already exists', 'warning'); return;
    }
    if (wouldCreateCycle(newToId, fromId)) {
      toast('Cannot link — would create a prerequisite loop', 'warning'); return;
    }

    // Remove old dependency
    const oldDepTask = tasks.find(t => t.id === toId);
    if (oldDepTask && oldDepTask.dependencies) {
      oldDepTask.dependencies = oldDepTask.dependencies.filter(d => d !== fromId);
      updateTask(toId, 'dependencies', oldDepTask.dependencies);
    }

    // Add new dependency
    if (!newDepTask.dependencies) newDepTask.dependencies = [];
    newDepTask.dependencies.push(fromId);
    updateTask(newToId, 'dependencies', newDepTask.dependencies);

    _ganttSelectedArrow = { fromId, toId: newToId };
    const fromTask = tasks.find(t => t.id === fromId);
    toast(`Reconnected: "${fromTask?.title}" → "${newDepTask.title}"`);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

/** Parse a date string safely, returning null for invalid dates */
function safeParseDate(str) {
  if (!str) return null;
  let d = new Date(str + 'T00:00:00');
  if (isNaN(d.getTime())) {
    // Try dd/mm/yyyy format
    const parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) d = new Date(parts[3], parts[2] - 1, parts[1]);
  }
  if (isNaN(d.getTime())) return null;
  d.setHours(0,0,0,0);
  return d;
}

/** Render lightweight background for a Gantt row using CSS repeating pattern (no per-day divs) */
function ganttDayCols(totalDays, dayW, minDate, now) {
  // Use a single div with repeating background instead of one div per day
  const w = totalDays * dayW;
  return `<div style="position:absolute;top:0;bottom:0;left:0;width:${w}px;background-image:repeating-linear-gradient(90deg,transparent,transparent ${dayW - 1}px,var(--border-subtle) ${dayW - 1}px,var(--border-subtle) ${dayW}px);pointer-events:none"></div>`;
}

/** Return CSS class for a Gantt bar based on task status and health */
function ganttBarClass(t) {
  if (t.status === 'Blocked') return 'gantt__bar--blocked';
  if (t.healthState === 'Blocked') return 'gantt__bar--blocked';
  if (t.status === 'Cancelled') return 'gantt__bar--cancelled';
  if (t.status === 'Done') return 'gantt__bar--done';
  if (t.healthState === 'Red') return 'gantt__bar--blocked';
  if (t.status !== 'Done' && t.dueDate) {
    const due = safeParseDate(t.dueDate);
    const now = new Date(); now.setHours(0,0,0,0);
    if (due && due < now) return 'gantt__bar--blocked';
  }
  if (t.status === 'In progress') return 'gantt__bar--inprogress';
  if (t.status === 'Not started') return 'gantt__bar--notstarted';
  return 'gantt__bar--inprogress';
}

/** Get the effective start date for a Gantt bar -- prefers startDate, falls back to createdAt */
function ganttTaskStart(t) {
  if (t.startDate) { const d = safeParseDate(t.startDate); if (d) return d; }
  if (t.createdAt) { const d = new Date(t.createdAt); if (!isNaN(d.getTime())) { d.setHours(0,0,0,0); return d; } }
  return null;
}

/** Get the effective end date for a Gantt bar -- prefers endDate, then dueDate, falls back to start + 7 days */
function ganttTaskEnd(t) {
  if (t.dueDate) { const d = safeParseDate(t.dueDate); if (d) return d; }
  if (t.endDate) { const d = safeParseDate(t.endDate); if (d) return d; }
  // Fallback: start date + 7 days (or null if no start either)
  const start = ganttTaskStart(t);
  if (start) { const d = new Date(start); d.setDate(d.getDate() + 7); return d; }
  return null;
}

/** "Rolled-up" start: own startDate if set, else the EARLIEST explicit
 *  startDate found anywhere in the descendant tree. Falls back to createdAt
 *  only as a last resort. Used by collapsed parent rows so their bar spans
 *  the actual child work, not a phantom createdAt+7d. */
function ganttRolledStart(t) {
  if (t.startDate) { const d = safeParseDate(t.startDate); if (d) return d; }
  let minS = null;
  const stack = [t]; const seen = new Set();
  while (stack.length) {
    const n = stack.pop();
    if (seen.has(n.id)) continue; seen.add(n.id);
    if (n !== t && n.startDate) { const d = safeParseDate(n.startDate); if (d && (!minS || d < minS)) minS = d; }
    (typeof getChildren === 'function' ? getChildren(n.id) : []).forEach(c => stack.push(c));
  }
  if (minS) return minS;
  if (t.createdAt) { const d = new Date(t.createdAt); if (!isNaN(d.getTime())) { d.setHours(0,0,0,0); return d; } }
  return null;
}

/** "Rolled-up" end: own endDate or dueDate if set, else the LATEST explicit
 *  endDate or dueDate found anywhere in the descendant tree. Falls back to
 *  rolled start + 7 days. */
function ganttRolledEnd(t) {
  if (t.endDate) { const d = safeParseDate(t.endDate); if (d) return d; }
  if (t.dueDate) { const d = safeParseDate(t.dueDate); if (d) return d; }
  let maxE = null;
  const stack = [t]; const seen = new Set();
  while (stack.length) {
    const n = stack.pop();
    if (seen.has(n.id)) continue; seen.add(n.id);
    if (n !== t) {
      const candidate = n.endDate ? safeParseDate(n.endDate) : (n.dueDate ? safeParseDate(n.dueDate) : null);
      if (candidate && (!maxE || candidate > maxE)) maxE = candidate;
    }
    (typeof getChildren === 'function' ? getChildren(n.id) : []).forEach(c => stack.push(c));
  }
  if (maxE) return maxE;
  const start = ganttRolledStart(t);
  if (start) { const d = new Date(start); d.setDate(d.getDate() + 7); return d; }
  return null;
}

// ===== GANTT SELECT + DRAG =====
let _ganttSelectedTaskId = null;
let _ganttDrag = null;

/** Select a Gantt bar (highlights it, deselects previous) */
function ganttSelectBar(e, taskId) {
  e.stopPropagation();
  // Deselect previous
  document.querySelectorAll('.gantt__bar.selected').forEach(el => el.classList.remove('selected'));
  _ganttSelectedTaskId = taskId;
  const bar = document.querySelector(`.gantt__bar[data-task-id="${taskId}"]`);
  if (bar) bar.classList.add('selected');
}

// Deselect when clicking empty gantt area
document.addEventListener('mousedown', function(e) {
  if (!_ganttSelectedTaskId) return;
  if (e.target.closest('.gantt__bar') || e.target.closest('.gantt__zoom') || e.target.closest('.gantt__row-label')) return;
  if (e.target.closest('.gantt')) {
    _ganttSelectedTaskId = null;
    document.querySelectorAll('.gantt__bar.selected').forEach(el => el.classList.remove('selected'));
  }
});

/** Toggle the Dependencies dropdown menu */
function toggleGanttDepMenu(e) {
  e.stopPropagation();
  const dd = document.getElementById('ganttDepMenu');
  if (!dd) return;
  const open = dd.style.display !== 'none';
  dd.style.display = open ? 'none' : '';
  if (!open) document.addEventListener('click', closeGanttDepMenu, { once: true });
}
/** Close the Gantt dependency display mode dropdown menu */
function closeGanttDepMenu() {
  const dd = document.getElementById('ganttDepMenu');
  if (dd) dd.style.display = 'none';
}

/** Toggle collapse/expand of a parent item in the timeline view */
function toggleGanttCollapse(id) {
  if (collapsedTaskIds.has(id)) collapsedTaskIds.delete(id);
  else collapsedTaskIds.add(id);
  renderContent();
}

// ===== GANTT LINK MODE — drag arrows to create dependency relationships =====

/** Start a link drag from a bar (prerequisite → dependent). Called from ganttBarDragStart when link mode is on. */
function ganttLinkDragStart(e, taskId) {
  e.preventDefault();
  e.stopPropagation();
  _ganttLinkFrom = taskId;
  const barEl = e.target.closest('.gantt__bar');
  if (barEl) barEl.classList.add('gantt-link-source');
  const ganttEl = document.querySelector('.gantt');
  if (ganttEl) ganttEl.classList.add('gantt-link-mode');

  // Get SVG for drawing the preview line
  const svg = document.getElementById('ganttArrowsSvg');
  if (!svg) return;
  const previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  previewLine.id = 'ganttLinkPreview';
  previewLine.setAttribute('stroke', 'var(--warning)');
  previewLine.setAttribute('stroke-width', '2');
  previewLine.setAttribute('stroke-dasharray', '6 3');
  previewLine.setAttribute('marker-end', '');
  const barRect = barEl.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  const x1 = barRect.right - svgRect.left;
  const y1 = barRect.top + barRect.height / 2 - svgRect.top;
  previewLine.setAttribute('x1', x1);
  previewLine.setAttribute('y1', y1);
  previewLine.setAttribute('x2', x1);
  previewLine.setAttribute('y2', y1);
  svg.appendChild(previewLine);

  /** Track mouse movement during link drag — update preview line and highlight target bars */
  function onMove(ev) {
    const line = document.getElementById('ganttLinkPreview');
    if (!line) return;
    line.setAttribute('x2', ev.clientX - svgRect.left);
    line.setAttribute('y2', ev.clientY - svgRect.top);
    // Highlight target bar on hover
    document.querySelectorAll('.gantt__bar.gantt-link-target').forEach(b => b.classList.remove('gantt-link-target'));
    const target = ev.target.closest('.gantt__bar');
    if (target && target.dataset.taskId && target.dataset.taskId !== taskId) {
      target.classList.add('gantt-link-target');
    }
  }

  /** Finish link drag — clean up visuals and create the dependency if target is valid */
  function onUp(ev) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    // Clean up visuals
    const line = document.getElementById('ganttLinkPreview');
    if (line) line.remove();
    document.querySelectorAll('.gantt__bar.gantt-link-source').forEach(b => b.classList.remove('gantt-link-source'));
    document.querySelectorAll('.gantt__bar.gantt-link-target').forEach(b => b.classList.remove('gantt-link-target'));

    // Check if we landed on a valid target bar
    const target = ev.target.closest('.gantt__bar');
    const toId = target?.dataset?.taskId;
    if (!toId || toId === taskId) { _ganttLinkFrom = null; return; }

    // Validate and create dependency: source (taskId) is the prerequisite, target (toId) is the dependent
    const depTask = tasks.find(t => t.id === toId);
    const prereqTask = tasks.find(t => t.id === taskId);
    if (!depTask || !prereqTask) { _ganttLinkFrom = null; return; }

    if (depTask.dependencies && depTask.dependencies.includes(taskId)) {
      toast('This prerequisite already exists', 'warning');
      _ganttLinkFrom = null; return;
    }
    if (wouldCreateCycle(toId, taskId)) {
      toast('Cannot link — would create a prerequisite loop', 'warning');
      _ganttLinkFrom = null; return;
    }

    // Create the dependency
    if (!depTask.dependencies) depTask.dependencies = [];
    depTask.dependencies.push(taskId);
    updateTask(toId, 'dependencies', depTask.dependencies);
    toast(`Linked: "${prereqTask.title}" → "${depTask.title}"`);
    _ganttLinkFrom = null;
    // Arrows will redraw on next renderContent via the updateTask call
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

/**
 * Begin dragging a Gantt bar to move or resize it.
 * In link mode, intercepts to start a dependency link drag instead.
 * @param {MouseEvent} e
 * @param {string} taskId
 * @param {string} mode - 'move' | 'resize-start' | 'resize-end'
 */
function ganttBarDragStart(e, taskId, mode) {
  // Intercept for link mode
  if (_ganttLinkMode) { ganttLinkDragStart(e, taskId); return; }
  e.preventDefault();
  e.stopPropagation();
  const barEl = e.target.closest('.gantt__bar');
  if (!barEl) return;
  // Select this bar
  ganttSelectBar(e, taskId);
  const dayWidth = parseFloat(barEl.dataset.dayWidth);
  const minDateMs = new Date(barEl.dataset.minDate + 'T00:00:00').getTime();
  barEl.classList.add('dragging');
  _ganttDrag = {
    taskId, mode, barEl, dayWidth, minDateMs,
    startX: e.clientX,
    origLeft: parseFloat(barEl.style.left),
    origWidth: parseFloat(barEl.style.width) || dayWidth,
    origStart: barEl.dataset.start,
    origEnd: barEl.dataset.end,
    moved: false
  };
  document.addEventListener('mousemove', ganttBarDragMove);
  document.addEventListener('mouseup', ganttBarDragEnd);
}

/** Handle mousemove during Gantt bar drag -- snaps to day grid */
function ganttBarDragMove(e) {
  if (!_ganttDrag) return;
  const { mode, barEl, startX, origLeft, origWidth, dayWidth } = _ganttDrag;
  const dx = e.clientX - startX;
  if (Math.abs(dx) > 3) _ganttDrag.moved = true;

  // Snap to day grid
  const snappedDx = Math.round(dx / dayWidth) * dayWidth;

  if (mode === 'move') {
    barEl.style.left = (origLeft + snappedDx) + 'px';
  } else if (mode === 'resize-end') {
    barEl.style.width = Math.max(dayWidth, origWidth + snappedDx) + 'px';
  } else if (mode === 'resize-start') {
    const newLeft = origLeft + snappedDx;
    const newWidth = origWidth - snappedDx;
    if (newWidth >= dayWidth) {
      barEl.style.left = newLeft + 'px';
      barEl.style.width = newWidth + 'px';
    }
  }
}

/** Finish Gantt bar drag -- calculate snapped dates, update the task, and save */
function ganttBarDragEnd(e) {
  document.removeEventListener('mousemove', ganttBarDragMove);
  document.removeEventListener('mouseup', ganttBarDragEnd);
  if (!_ganttDrag) return;
  const { taskId, mode, barEl, dayWidth, minDateMs, origLeft, origWidth, origStart, origEnd, moved } = _ganttDrag;
  barEl.classList.remove('dragging');

  if (!moved) { _ganttDrag = null; return; }

  // Calculate snapped position — use local dates (not UTC) to avoid timezone shift
  const newLeft = parseFloat(barEl.style.left);
  const newWidth = parseFloat(barEl.style.width);
  const startDayOffset = Math.round(newLeft / dayWidth);
  const durationDays = Math.max(1, Math.round(newWidth / dayWidth));
  const newStartDate = new Date(minDateMs); newStartDate.setDate(newStartDate.getDate() + startDayOffset);
  const newEndDate = new Date(minDateMs); newEndDate.setDate(newEndDate.getDate() + startDayOffset + durationDays - 1);
  const pad2 = n => String(n).padStart(2, '0');
  const localISO = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const newStartStr = localISO(newStartDate);
  const newEndStr = localISO(newEndDate);

  const task = tasks.find(t => t.id === taskId);
  if (!task) { _ganttDrag = null; return; }

  let changed = false;
  if (mode === 'move') {
    if (newStartStr !== origStart || newEndStr !== origEnd) {
      task.startDate = newStartStr;
      task.endDate = newEndStr;
      changed = true;
    }
  } else if (mode === 'resize-end') {
    if (newEndStr !== origEnd) {
      task.dueDate = newEndStr;
      changed = true;
    }
  } else if (mode === 'resize-start') {
    if (newStartStr !== origStart) {
      task.startDate = newStartStr;
      changed = true;
    }
  }

  if (changed) {
    task.updatedAt = new Date().toISOString();
    markDirty(taskId);
    save();
    // Update bar data attributes in place (full re-render shifts the timeline grid)
    barEl.dataset.start = task.startDate || newStartStr;
    barEl.dataset.end = task.endDate || newEndStr;
    barEl.title = `${esc(task.title)} | ${task.status} | ${newStartStr} to ${newEndStr}`;
    toast(`${mode === 'move' ? 'Moved' : 'Resized'}: ${newStartStr} to ${newEndStr}`);
    requestAnimationFrame(() => drawGanttArrows());
  } else {
    // Snap back to original position
    barEl.style.left = origLeft + 'px';
    barEl.style.width = origWidth + 'px';
  }
  _ganttDrag = null;
}

// ===== GANTT COLUMN RESIZE =====
let _ganttColResize = null;

/** Begin dragging the Gantt label column resize handle */
function ganttColResizeStart(e) {
  e.preventDefault();
  const handle = e.target;
  handle.classList.add('active');
  _ganttColResize = { startX: e.clientX, origWidth: _ganttLabelWidth, handle };
  document.addEventListener('mousemove', ganttColResizeMove);
  document.addEventListener('mouseup', ganttColResizeEnd);
}

/** Handle mousemove during Gantt column resize (clamped 120-600px) */
function ganttColResizeMove(e) {
  if (!_ganttColResize) return;
  const dx = e.clientX - _ganttColResize.startX;
  const newWidth = Math.max(120, Math.min(600, _ganttColResize.origWidth + dx));
  const ganttEl = document.querySelector('.gantt');
  if (ganttEl) {
    ganttEl.style.setProperty('--gantt-label-w', newWidth + 'px');
    _ganttColResize.handle.style.left = (newWidth - 3) + 'px';
  }
}

/** Finish Gantt column resize and persist the new width */
function ganttColResizeEnd(e) {
  document.removeEventListener('mousemove', ganttColResizeMove);
  document.removeEventListener('mouseup', ganttColResizeEnd);
  if (!_ganttColResize) return;
  const dx = e.clientX - _ganttColResize.startX;
  _ganttLabelWidth = Math.max(120, Math.min(600, _ganttColResize.origWidth + dx));
  _ganttColResize.handle.classList.remove('active');
  _ganttColResize = null;
}

