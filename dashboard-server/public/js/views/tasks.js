import { registerView } from '../core/router.js';

// ==================== TASK VIEW ====================

/** Render the tasks view: filter bar, sub-view toggle, quick-add, and the active sub-view (tree/board/gantt/calendar) */
function renderTaskView(el) {
  const filtered = getFilteredTasks();

  let html = renderClientProfileHeader();
  // Practice-mode banner (bug a6c82c8c). When the practice filter is active,
  // show a coloured banner naming the practice so the user knows the entire
  // workspace is scoped down. Doubles as the landing experience Glen asked
  // for with "HC Page and Board" — pick Org Health in the sidebar and every
  // tab (Dashboard, Projects, Leads, Clients) scopes to it.
  if (currentFilter.practice) {
    const p = PRACTICES.find(x => x.value === currentFilter.practice);
    if (p) {
      html += `<div class="practice-mode-banner" style="background:color-mix(in srgb, ${p.colour} 14%, var(--bg-raised));border:1px solid ${p.colour};border-left:4px solid ${p.colour};border-radius:var(--radius-md);padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.colour}"></span><strong style="font-size:0.85rem;color:var(--text-primary)">${esc(p.label)} mode</strong><span style="font-size:0.75rem;color:var(--text-muted);flex:1;min-width:200px">Dashboard, Projects, Leads and Clients are all scoped to this practice. Tag clients and projects with Practice = ${esc(p.label)} to populate this view.</span><button class="btn btn--sm btn--ghost" data-action="filterByPractice" data-arg0="null">Exit ${esc(p.shortLabel || p.label)}</button></div>`;
    }
  }
  // Client dropdown populated from the contracted-client list. When a client
  // is picked, the project dropdown narrows to that client's projects only,
  // and the tree view scopes the same way the sidebar client chip does.
  // Glen 2026-04-16: filter bar had All Projects but no All Clients.
  const allClients = getContractedClients();
  const projectOptions = getRootTasks()
    .filter(r => r.title && r.title.trim() !== 'New Task')
    .filter(r => !currentFilter.client || getTaskClient(r) === currentFilter.client)
    .sort((a,b) => a.title.localeCompare(b.title));
  html += `<div class="filter-bar">
    <input type="text" placeholder="Search items... (Enter)" value="${esc(currentFilter.search)}" onkeydown="if(event.key==='Enter'){currentFilter.search=this.value;renderContent()}" onblur="if(this.value!==currentFilter.search){currentFilter.search=this.value;renderContent()}">
    ${buildMultiSelect('assignee', 'People', _cachedTeamMembers, currentFilter.assignee)}
    <select onchange="currentFilter.client=this.value||null;currentFilter.project=null;renderContent();renderBreadcrumbs();renderSidebarCounts()" style="min-width:120px" aria-label="Filter by client"><option value="">All Clients</option>${allClients.map(c => `<option value="${esc(c)}" ${currentFilter.client===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <select onchange="currentFilter.project=this.value||null;renderContent()" style="min-width:100px" aria-label="Filter by project"><option value="">All Projects</option>${projectOptions.map(r => `<option value="${esc(r.id)}" ${currentFilter.project===r.id?'selected':''}>${esc(r.title)}</option>`).join('')}</select>
    ${buildMultiSelect('status', 'Status', STATUSES, currentFilter.status)}
    ${buildMultiSelect('health', 'Health', HEALTH_STATES, currentFilter.health)}
    <select onchange="currentFilter.sort=this.value;renderContent()" style="min-width:100px">
      <option value="default" ${currentFilter.sort==='default'?'selected':''}>Sort: Default</option>
      <option value="due-asc" ${currentFilter.sort==='due-asc'?'selected':''}>Due Date (earliest)</option>
      <option value="due-desc" ${currentFilter.sort==='due-desc'?'selected':''}>Due Date (latest)</option>
      <option value="priority" ${currentFilter.sort==='priority'?'selected':''}>Priority (highest)</option>
      <option value="status" ${currentFilter.sort==='status'?'selected':''}>Status</option>
      <option value="assignee" ${currentFilter.sort==='assignee'?'selected':''}>My Work Only</option>
      <option value="hours-desc" ${currentFilter.sort==='hours-desc'?'selected':''}>Hours (most)</option>
      <option value="updated" ${currentFilter.sort==='updated'?'selected':''}>Recently Updated</option>
    </select>
    <div class="task-subview-toggle">
      <button class="task-subview-btn ${taskSubView==='tree'?'active':''}" data-action="_actSetTaskSubView" data-arg0="tree">By Project</button>
      <button class="task-subview-btn ${taskSubView==='board'?'active':''}" data-action="_actSetTaskSubView" data-arg0="board">Board</button>
      <button class="task-subview-btn ${taskSubView==='gantt'?'active':''}" data-action="_actSetTaskSubView" data-arg0="gantt">Timeline</button>
      <button class="task-subview-btn ${taskSubView==='calendar'?'active':''}" data-action="_actSetTaskSubView" data-arg0="calendar">Calendar</button>
    </div>
    <button class="btn btn--sm ${currentFilter.incomplete ? 'btn--danger' : 'btn--outline'}" data-action="_actToggleFilterIncomplete" style="font-size:0.72rem;padding:3px 10px" title="Show only tasks with missing fields">&#9888; Incomplete</button>
    ${currentFilter.assignee && currentFilter.assignee.length > 0 ? `<span class="filter-chip" style="font-size:0.72rem">${currentFilter.assignee.map(a => esc(a)).join(', ')} <button data-action="_actClearFilterAssignee" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:0 2px">&times;</button></span>` : ''}
    ${!inlineDetailVisible ? '<button class="btn btn--outline" data-action="_actSetInlineDetail" data-arg0="true" style="font-size:0.72rem;padding:3px 10px" title="Show detail panel">&#9776; Detail</button>' : ''}
    <div class="batch-actions">${selectedTaskIds.size > 0 ? `
      <span style="font-size:0.75rem;color:var(--accent);font-weight:600">${selectedTaskIds.size} selected</span>
      <select onchange="if(this.value){bulkSetField('status',this.value);this.value=''}"><option value="">Set Status...</option>${STATUSES.map(s=>`<option>${s}</option>`).join('')}</select>
      <select onchange="if(this.value){bulkSetField('priority',this.value);this.value=''}"><option value="">Set Priority...</option>${PRIORITIES.map(p=>`<option>${p}</option>`).join('')}</select>
      <select onchange="if(this.value){bulkSetField('healthState',this.value);this.value=''}"><option value="">Set Health...</option>${HEALTH_STATES.map(h=>`<option>${h}</option>`).join('')}</select>
      <button class="btn btn--sm btn--danger" data-action="bulkDelete">Delete</button>
      <button class="btn btn--sm" data-action="_actClearSelectedTasks">Clear</button>
    ` : ''}</div>
  </div>`;

  // Active filter breadcrumbs
  const hasActiveFilters = currentFilter.client || (currentFilter.status && currentFilter.status.length > 0) || (currentFilter.health && currentFilter.health.length > 0) || currentFilter.project || (currentFilter.assignee && currentFilter.assignee.length > 0);
  if (hasActiveFilters) {
    html += `<div class="filter-chips">`;
    if (currentFilter.client) html += `<span class="filter-chip">Client: ${esc(currentFilter.client)} <button data-action="_actClearFilterClient" title="Clear filter">&times;</button></span>`;
    if (currentFilter.project) { const pTask = tasks.find(t => t.id === currentFilter.project); html += `<span class="filter-chip">Project: ${esc(pTask ? pTask.title : 'Unknown')} <button data-action="_actClearFilterProject" title="Clear filter">&times;</button></span>`; }
    if (currentFilter.status && currentFilter.status.length > 0) html += `<span class="filter-chip">Status: ${currentFilter.status.map(s => esc(s)).join(', ')} <button data-action="_actClearFilterStatus" title="Clear filter">&times;</button></span>`;
    if (currentFilter.health && currentFilter.health.length > 0) html += `<span class="filter-chip">Health: ${currentFilter.health.map(h => esc(h)).join(', ')} <button data-action="_actClearFilterHealth" title="Clear filter">&times;</button></span>`;
    if (currentFilter.assignee && currentFilter.assignee.length > 0) html += `<span class="filter-chip">People: ${currentFilter.assignee.map(a => esc(a)).join(', ')} <button data-action="_actClearFilterAssignee" title="Clear filter">&times;</button></span>`;
    html += `<button class="filter-chip-clear" data-action="_actResetFilters">Clear all</button>`;
    html += `</div>`;
  }

  // Quick-add task bar
  html += `<div class="quick-add-bar" style="display:flex;gap:8px;margin-bottom:var(--space-md);align-items:center">
    <input type="text" id="quickAddInput" placeholder="Quick add project... (press Enter)" style="flex:1;padding:8px 12px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem" onkeydown="if(event.key==='Enter'&&this.value.trim()){quickAddTask(this.value.trim());this.value=''}">
    <select id="quickAddClient" style="padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem">
      <option value="">No Client</option>${getContractedClients().map(c => `<option value="${esc(c)}" ${currentFilter.client===c?'selected':''}>${esc(c)}</option>`).join('')}
    </select>
  </div>`;

  html += '<div class="tasks-layout">';
  html += '<div class="tasks-layout__main">';
  if (taskSubView === 'calendar') {
    html += renderCalendarView(filtered);
  } else if (taskSubView === 'gantt') {
    html += renderGanttView(filtered);
  } else if (taskSubView === 'board') {
    html += renderBoardView(filtered);
  } else {
    html += renderTreeView(filtered);
  }
  html += '</div>';

  // Inline detail panel (30% right side)
  html += `<div class="tasks-layout__detail ${inlineDetailVisible ? '' : 'tasks-layout__detail--hidden'}" id="inlineDetailPanel">`;
  html += `<div class="tasks-layout__detail-resize" onmousedown="startPanelResize(event,'inlineDetailPanel')"></div>`;
  if (activeDetailTaskId && tasks.find(t => t.id === activeDetailTaskId)) {
    html += renderInlineTaskDetail(activeDetailTaskId);
  } else {
    html += renderClientSummary(filtered);
  }
  html += '</div>';

  html += '</div>'; // close tasks-layout
  el.innerHTML = html;
  // Load notes if profile expanded
  if (currentFilter.client && _profileExpanded[currentFilter.client.replace(/[^a-zA-Z0-9]/g, '_')]) {
    setTimeout(() => loadClientNotes(currentFilter.client), 50);
  }
}

/** Render the hierarchical tree view -- tasks grouped by client, then by project, with collapsible nesting */
function renderTreeView(filtered) {
  // Skeleton placeholders while the initial /api/sync/load is still in flight (Phase 12.1).
  // Once `tasks` is populated we never show this again — it's a one-time first-paint state.
  if (tasks.length === 0 && !window._initialLoadComplete) {
    return '<div style="padding:24px">' +
      Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading projects</span></div>';
  }
  const rootIds = new Set(filtered.filter(t => !t.parentId).map(t => t.id));
  filtered.forEach(t => { if (t.parentId) { const root = getRootAncestor(t); rootIds.add(root.id); } });
  const roots = tasks.filter(t => rootIds.has(t.id) && !t.parentId);

  // "My Work Only" tree-level filtering (bugs f09303f1, c73af494): build a
  // set of task IDs that should be visible — the filtered tasks themselves
  // plus every ancestor needed to maintain hierarchy. renderTaskRow uses this
  // to skip siblings the user is not assigned to.
  let visibleIds = null;
  if (currentFilter.sort === 'assignee' && filtered.length < tasks.length) {
    visibleIds = new Set(filtered.map(t => t.id));
    filtered.forEach(t => {
      let cursor = tasks.find(p => p.id === t.parentId);
      while (cursor) {
        visibleIds.add(cursor.id);
        cursor = tasks.find(p => p.id === cursor.parentId);
      }
    });
  }

  // Default collapsed to client level: client groups are collapsed, items inside expanded.
  // _tasksInitialCollapse is set true on page load and when navigating TO the Projects page.
  if (_tasksInitialCollapse) {
    if (roots.length > 0) {
      _tasksInitialCollapse = false;
      collapsedTaskIds.clear();
      // Collapse client groups and all parent items so expanding a client shows project names only
      roots.forEach(t => { collapsedTaskIds.add(clientGroupKey(t)); });
      tasks.forEach(t => { if (getChildren(t.id).length > 0) collapsedTaskIds.add(t.id); });
    }
  }

  let html = `<div class="tree-controls" style="display:flex;gap:8px;align-items:center">
    <button class="btn btn--outline" data-action="collapseAll">Collapse All</button>
    <div style="display:flex;align-items:center;gap:4px">
      <span style="font-size:0.78rem;color:var(--text-muted)">Expand to:</span>
      <select class="leads-select" onchange="if(this.value){expandToLevel(this.value);this.value=''}" style="font-size:0.78rem;padding:4px 8px">
        <option value="">Choose level...</option>
        <option value="project">Projects</option>
        <option value="feature">Features</option>
        <option value="story">Stories</option>
        <option value="task">Tasks (all)</option>
      </select>
    </div>
  </div>`;
  html += '<div class="task-tree">';

  if (roots.length === 0) {
    html += emptyState('&#128269;', 'No items match filters', 'Try adjusting your filters or search.');
    html += '</div>';
    return html;
  }

  // Group roots by client (Epic level)
  const clientGroups = {};
  roots.forEach(r => {
    const client = r.client || getTaskClient(r) || 'Unassigned';
    if (!clientGroups[client]) clientGroups[client] = [];
    clientGroups[client].push(r);
  });
  const sortedClients = Object.keys(clientGroups).sort(clientSortOrder);

  sortedClients.forEach(client => {
    const clientKey = 'client_' + client.replace(/[^a-zA-Z0-9]/g, '_');
    const clientRoots = clientGroups[client];
    const isCollapsed = collapsedTaskIds.has(clientKey);
    const allClientTasks = clientRoots.flatMap(r => [r, ...getDescendants(r.id)]);
    const totalTasks = allClientTasks.length;
    const doneTasks = allClientTasks.filter(t => t.status === 'Done').length;
    const completePct = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;
    const inProgress = allClientTasks.filter(t => t.status === 'In progress').length;
    const blocked = allClientTasks.filter(t => t.healthState === 'Blocked').length;

    // Client header row (Epic)
    html += `<div class="task-client-group">`;
    html += `<div class="task-client-header" data-action="toggleClientGroup" data-arg0="${clientKey}" style="cursor:pointer">`;
    html += `<span class="task-client-header__toggle">${isCollapsed ? '&#9654;' : '&#9660;'}</span>`;
    html += `<span class="task-client-header__name">${esc(client)}</span>`;
    const featureCount = allClientTasks.filter(t => getItemType(t) === 'feature').length;
    const storyCount = allClientTasks.filter(t => getItemType(t) === 'story').length;
    const taskCount = allClientTasks.filter(t => getItemType(t) === 'task').length;
    html += `<span class="task-client-header__stats">${clientRoots.length} project${clientRoots.length !== 1 ? 's' : ''} &middot; ${featureCount} features &middot; ${storyCount + taskCount} items &middot; ${completePct}% complete`;
    if (inProgress > 0) html += ` &middot; <span style="color:var(--accent)">${inProgress} active</span>`;
    if (blocked > 0) html += ` &middot; <span style="color:var(--danger)">${blocked} blocked</span>`;
    html += `</span></div>`;

    // Projects under this client, now grouped by Statement of Work (bug cb32b7f9).
    // Client > SoW > Project > Tickets. Projects without a SoW land in a
    // "(No SoW)" bucket so nothing disappears. Buckets collapse independently
    // via their own clientGroupKey-style keys.
    html += `<div class="task-client-children ${isCollapsed ? 'hidden' : ''}" id="clientgroup_${clientKey}" data-client-name="${esc(client)}">`;
    if (!isCollapsed) {
      // Group roots by sowId
      const sowBuckets = new Map();
      clientRoots.forEach(r => {
        const sid = r.sowId || r.sow_id || '__nosow__';
        if (!sowBuckets.has(sid)) sowBuckets.set(sid, []);
        sowBuckets.get(sid).push(r);
      });
      // Order: known SoWs by title (stable), "(No SoW)" bucket last
      const orderedSowIds = [...sowBuckets.keys()].filter(k => k !== '__nosow__').sort((a, b) => {
        const sa = _sowsCache.find(s => s.id === a);
        const sb = _sowsCache.find(s => s.id === b);
        return (sa?.title || 'zzz').localeCompare(sb?.title || 'zzz');
      });
      if (sowBuckets.has('__nosow__')) orderedSowIds.push('__nosow__');
      // If there's only one bucket AND it's the no-sow bucket, skip the SoW
      // header entirely so existing clients without any SoW tagging render
      // exactly like before — avoids clutter when the feature isn't being used.
      const skipSowHeader = orderedSowIds.length === 1 && orderedSowIds[0] === '__nosow__';
      orderedSowIds.forEach(sid => {
        const bucketRoots = sowBuckets.get(sid);
        const sow = sid !== '__nosow__' ? _sowsCache.find(s => s.id === sid) : null;
        const sowLabel = sow ? sow.title : 'No Statement of Work';
        const sowKey = `sow_${clientKey}_${sid}`;
        const sowCollapsed = collapsedTaskIds.has(sowKey);
        if (!skipSowHeader) {
          html += `<div class="task-sow-group" style="margin-left:24px;margin-top:4px">`;
          html += `<div class="task-sow-header" data-action="toggleClientGroup" data-arg0="${sowKey}" style="cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:0.78rem;color:var(--text-secondary);border-left:2px solid var(--border-subtle)">`;
          html += `<span style="font-size:0.7rem">${sowCollapsed ? '&#9654;' : '&#9660;'}</span>`;
          html += `<span style="font-weight:600">${esc(sowLabel)}</span>`;
          html += `<span style="color:var(--text-muted);font-size:0.7rem">${bucketRoots.length} project${bucketRoots.length !== 1 ? 's' : ''}</span>`;
          html += `</div>`;
          if (!sowCollapsed) {
            bucketRoots.forEach(r => { html += renderTaskRow(r, 1, filtered, visibleIds); });
          }
          html += `</div>`;
        } else {
          bucketRoots.forEach(r => { html += renderTaskRow(r, 1, filtered, visibleIds); });
        }
      });
    }
    html += `</div></div>`;
  });

  html += '</div>';
  return html;
}

/** Collapse All — collapse everything: client groups and all parent items */
function collapseAll() {
  collapsedTaskIds.clear();
  // Collapse client groups
  tasks.filter(t => !t.parentId).forEach(t => { collapsedTaskIds.add(clientGroupKey(t)); });
  // Collapse every item that has children
  tasks.forEach(t => { if (getChildren(t.id).length > 0) collapsedTaskIds.add(t.id); });
  renderContent();
}

/** Expand the tree to a specific hierarchy level, collapsing everything below it.
 *  'project'  = open client groups, collapse projects (show project names only)
 *  'feature'  = open clients + projects, collapse features
 *  'story'    = open clients + projects + features, collapse stories
 *  'task'     = expand everything (same as Expand All) */
function expandToLevel(targetType) {
  // Depth map: which types should be EXPANDED (visible) vs COLLAPSED
  const depthOrder = ['project', 'feature', 'story', 'task'];
  const targetIdx = depthOrder.indexOf(targetType);
  if (targetIdx < 0) return;

  collapsedTaskIds.clear();

  // If expanding to project level, open client groups but collapse every project (and below)
  // If expanding to feature level, open client groups + projects, collapse features (and below)
  // etc.
  tasks.forEach(t => {
    if (getChildren(t.id).length === 0) return; // leaf nodes don't need collapsing
    const type = getItemType(t);
    const typeIdx = depthOrder.indexOf(type);
    // Collapse items AT the target level and below (they have children to hide)
    if (typeIdx >= targetIdx) {
      collapsedTaskIds.add(t.id);
    }
  });

  // Client groups: always expand them (they're above project level)
  // No need to add client keys — they were cleared above

  renderContent();
}

let _boardTypeFilter = null; // null = all types, or 'project'|'feature'|'story'|'task'

/** Render the Kanban board view -- items sorted into status-based swim lanes with drag-and-drop */
function renderBoardView(filtered) {
  // Type filter: show all items by default (no longer leaf-only)
  let allFiltered = _boardTypeFilter ? filtered.filter(t => getItemType(t) === _boardTypeFilter) : filtered;
  const cancelled = allFiltered.filter(t => t.status === 'Cancelled');
  const active = allFiltered.filter(t => t.status !== 'Cancelled');

  // Separate blocked-by-health tasks so they appear in the Blocked lane regardless of their status
  const blockedByHealth = active.filter(t => t.healthState === 'Blocked');
  const notBlockedByHealth = active.filter(t => t.healthState !== 'Blocked');

  // BOARD_LANE_CAP defined in config constants
  let html = `<div style="display:flex;gap:6px;margin-bottom:10px;align-items:center;flex-wrap:wrap">
    <span style="font-size:0.75rem;color:var(--text-muted)">Show:</span>
    <button class="btn btn--sm ${!_boardTypeFilter?'btn--primary':''}" data-action="_actSetBoardTypeFilter" data-arg0="null" style="font-size:0.7rem;padding:2px 8px">All</button>
    ${ITEM_TYPE_ORDER.map(type => `<button class="btn btn--sm ${_boardTypeFilter===type?'btn--primary':''}" data-action="_actSetBoardTypeFilter" data-arg0="${type}" style="font-size:0.7rem;padding:2px 8px">${ITEM_TYPE_META[type].plural}</button>`).join('')}
  </div>`;
  html += '<div class="board">';
  BOARD_COLUMNS.forEach(col => {
    const laneTasks = (col.id === 'blocked'
      ? [...active.filter(t => t.status === 'Blocked'), ...blockedByHealth.filter(t => t.status !== 'Blocked')]
      : notBlockedByHealth.filter(t => col.statuses.includes(t.status)))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const laneTotal = laneTasks.length;
    const cappedTasks = laneTasks.slice(0, BOARD_LANE_CAP);
    html += `<div class="board__lane">`;
    html += `<div class="board__lane-header"><span class="board__lane-title" style="color:${col.color}">${col.label}</span><span class="board__lane-count">${laneTotal}</span></div>`;
    html += `<div class="board__lane-body ${laneTasks.length === 0 ? 'board__lane-body--empty' : ''}" data-lane-statuses="${col.statuses.join(',')}" ondragover="onBoardDragOver(event)" ondragleave="onBoardDragLeave(event)" ondrop="onBoardDrop(event)">`;
    if (laneTasks.length === 0) {
      html += 'No items';
    } else {
      cappedTasks.forEach(t => { html += renderBoardCard(t); });
      if (laneTotal > BOARD_LANE_CAP) html += `<div style="text-align:center;padding:8px;color:var(--text-muted);font-size:0.75rem">+${laneTotal - BOARD_LANE_CAP} more</div>`;
    }
    html += '</div></div>';
  });
  html += '</div>';

  if (cancelled.length > 0) {
    html += `<div class="board__cancelled">
      <button class="board__cancelled-toggle" data-action="_actToggleNextSection" data-pass-el>
        <span>&#9654;</span> Cancelled (${cancelled.length})
      </button>
      <div class="board__cancelled-cards hidden">`;
    const cappedCancelled = cancelled.slice(0, CANCELLED_CAP);
    cappedCancelled.forEach(t => { html += renderBoardCard(t); });
    if (cancelled.length > CANCELLED_CAP) {
      html += `<div style="padding:8px 12px;font-size:0.72rem;color:var(--text-muted);text-align:center;border-top:1px solid var(--border-subtle)">Showing ${CANCELLED_CAP} of ${cancelled.length} cancelled tickets</div>`;
    }
    html += '</div></div>';
  }

  return html;
}

/** Render a single draggable card for the Kanban board view */
function renderBoardCard(task) {
  const hasKids = getChildren(task.id).length > 0;
  const isBlocked = task.healthState === 'Blocked';
  const isCancelled = task.status === 'Cancelled';
  let cls = 'board-card';
  if (isBlocked) cls += ' board-card--blocked';
  if (hasKids) cls += ' board-card--parent';
  if (isCancelled) cls += ' board-card--cancelled';

  const bcClient = getTaskClient(task);
  let html = `<div class="${cls}" draggable="true" data-task-id="${task.id}" data-action="openDetail" data-arg0="${task.id}" ondragstart="onBoardCardDragStart(event,'${task.id}')" ondragend="onBoardCardDragEnd(event)">`;
  if (bcClient) html += `<div style="margin-bottom:3px;display:flex;gap:4px;align-items:center">${clientBadgeHtml(bcClient)} ${itemTypeBadgeHtml(task)}</div>`;
  else html += `<div style="margin-bottom:3px">${itemTypeBadgeHtml(task)}</div>`;
  html += `<div class="board-card__title">${esc(task.title)}</div>`;
  // Incomplete marker for board cards
  const bcIncomplete = isTaskIncomplete(task);
  const bcMissing = bcIncomplete ? [!task.hoursEstimated?'hours':'', !task.priority?'priority':'', !task.assignees||task.assignees.length===0?'assignee':'', !task.dueDate?'due date':''].filter(Boolean).join(', ') : '';
  html += '<div class="board-card__badges">';
  if (bcIncomplete) html += `<span style="color:var(--danger);font-size:0.7rem;font-weight:700;display:inline-flex;align-items:center;gap:2px" title="Missing: ${bcMissing}">&#9888;</span>`;
  const bcPrereqBlocked = task.status !== 'Done' && getIncompletePrereqs(task).length > 0;
  if (bcPrereqBlocked) html += `<span style="color:var(--warning);font-size:0.7rem" title="Has incomplete prerequisites">&#128274;</span>`;
  if (task.priority) html += priorityBadgeHtml(task.priority);
  if (task.healthState) html += healthBadgeHtml(task.healthState);
  html += '</div>';
  html += '<div class="board-card__meta">';
  if (task.assignees && task.assignees.length > 0) html += `<span>${esc(task.assignees[0])}</span>`;
  if (task.dueDate) {
    const due = safeParseDate(task.dueDate);
    if (due) {
      const now = new Date(); now.setHours(0,0,0,0);
      const overdue = due < now && task.status !== 'Done';
      html += `<span style="${overdue ? 'color:var(--danger)' : ''}">${overdue ? '&#9888; ' : ''}${due.toLocaleDateString('en-GB', {day:'numeric',month:'short'})}</span>`;
    }
  }
  const hrs = aggHours(task.id);
  if (hrs.est > 0) html += `<span style="margin-left:auto;font-family:var(--font-mono)">Hr Est: ${hrs.est.toFixed(1)}h</span>`;
  html += '</div></div>';
  return html;
}

// ===== CALENDAR VIEW =====
let _calMonth = new Date().getMonth();
let _calYear = new Date().getFullYear();
let _calEvents = [];                 // Cached list of calendar events for the visible month
let _calEventsKey = '';              // Cache key (year-month) so re-renders don't re-fetch
let _calShowOthers = true;           // Toggle: show events created by other users
let _calTeamFilter = '';             // Selected team_id for the calendar team filter (empty = no filter)
let _teamMembersCache = {};          // team_id → [display_name, ...] for fanning team events onto roster rows
let _capacityEvents = [];            // Calendar events covering the Capacity Planning 4-week window
let _capacityEventsKey = '';         // Cache key so re-renders of People view don't re-fetch
// Event types that reduce a person's effective weekly capacity. Full day off each.
const CAPACITY_REDUCING_TYPES = ['vacation', 'sick_leave', 'uto', 'bank_holiday', 'firm_closed'];
const CAL_EVENT_TYPES = [
  { value: 'vacation',    label: 'Vacation',     colour: '#22c55e' },
  { value: 'sick_leave',  label: 'Sick Leave',   colour: '#ef4444' },
  { value: 'uto',         label: 'UTO',          colour: '#a855f7' },
  { value: 'bank_holiday',label: 'Bank Holiday', colour: '#3b82f6' },
  { value: 'firm_closed', label: 'Firm Closed',  colour: '#64748b', adminOnly: true },
  { value: 'business',    label: 'Business',     colour: '#f97316' },
  { value: 'other',       label: 'Other',        colour: '#9ca3af' }
];
const CAL_EVENT_VISIBILITY = [
  { value: 'private', label: 'Private' },
  { value: 'team',    label: 'Team' },
  { value: 'client',  label: 'Client' },
  { value: 'public',  label: 'Public' }
];

/** Look up an event type colour, falling back to grey. */
function calEventColour(type) {
  const t = CAL_EVENT_TYPES.find(x => x.value === type);
  return t ? t.colour : '#9ca3af';
}

/** Look up an event type human label. */
function calEventTypeLabel(type) {
  const t = CAL_EVENT_TYPES.find(x => x.value === type);
  return t ? t.label : 'Other';
}

/** Fetch calendar events for the currently visible month and cache them. */
async function loadCalendarEvents(year, month) {
  // Pad the window by one week on either side so multi-day events that
  // overlap the month boundary still show up.
  const from = new Date(year, month, 1); from.setDate(from.getDate() - 7);
  const to = new Date(year, month + 1, 0); to.setDate(to.getDate() + 7);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  // Append the team filter if one is active so the server returns events
  // for every member of that team.
  let url = `/api/calendar-events?from=${fmt(from)}&to=${fmt(to)}`;
  if (_calTeamFilter) url += `&team_id=${encodeURIComponent(_calTeamFilter)}`;
  // Fetch events + team member roster in parallel so team events can be
  // fanned out to each member's row without a render-time lookup miss.
  const [events, teamsWithMembers] = await Promise.all([
    apiCall(url),
    apiCall('/api/teams?include=members')
  ]);
  _calEvents = Array.isArray(events) ? events : [];
  // Populate the team-members cache keyed by team_id → [display_name, ...]
  _teamMembersCache = {};
  if (Array.isArray(teamsWithMembers)) {
    teamsWithMembers.forEach(t => {
      if (Array.isArray(t.member_display_names)) {
        _teamMembersCache[t.id] = t.member_display_names;
      }
    });
  }
  _calEventsKey = `${year}-${month}` + (_calTeamFilter ? `:team:${_calTeamFilter}` : '');
  // Re-render whichever calendar surface is currently visible.
  const main = document.querySelector('.tasks-layout__main');
  if (main && taskSubView === 'calendar') { renderContent(); return; }
  // People → Calendar sub-view (D92)
  if (currentView === 'people' && _peopleSubView === 'calendar') { renderContent(); return; }
}

/**
 * Fetch calendar events covering the Capacity Planning 4-week window so the
 * People → Workload capacity table can deduct time off (vacation, sick_leave,
 * uto, bank_holiday, firm_closed) from each person's weekly capacity (D93).
 * Separate from _calEvents because that cache is keyed to the visible
 * calendar month, while capacity is always "today → today+28 days".
 */
async function loadCapacityEvents() {
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const start = new Date(); start.setHours(0,0,0,0);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday of current week
  const end = new Date(start); end.setDate(end.getDate() + 28); // +4 weeks
  const key = `${fmt(start)}:${fmt(end)}`;
  if (_capacityEventsKey === key && _capacityEvents.length >= 0) return;
  try {
    const events = await apiCall(`/api/calendar-events?from=${fmt(start)}&to=${fmt(end)}`);
    _capacityEvents = Array.isArray(events) ? events : [];
    _capacityEventsKey = key;
  } catch (e) {
    _capacityEvents = [];
    _capacityEventsKey = '';
  }
}

/**
 * Count how many weekdays (Mon-Fri only) within [weekStart, weekEnd] the
 * given person has off based on capacity-reducing calendar events. Counts
 * firm_closed events for everyone; personal events only for the named
 * person. Returns the weekday count (0-5), clamped.
 */
function computeDaysOff(person, weekStart, weekEnd, events) {
  if (!Array.isArray(events) || events.length === 0) return 0;
  const personKey = person || '';
  const daysOff = new Set();
  events.forEach(ev => {
    if (!ev || !ev.start_date) return;
    if (!CAPACITY_REDUCING_TYPES.includes(ev.event_type)) return;
    const isFirm = ev.event_type === 'firm_closed';
    const isForThisPerson = isFirm || ev.user_display_name === personKey;
    if (!isForThisPerson) return;
    const s = new Date(ev.start_date + 'T00:00:00');
    const eEnd = ev.end_date ? new Date(ev.end_date + 'T00:00:00') : new Date(s);
    // Walk every day in the event's range that falls inside the requested week
    const cursor = new Date(Math.max(s.getTime(), weekStart.getTime()));
    const stop = new Date(Math.min(eEnd.getTime(), weekEnd.getTime()));
    while (cursor <= stop) {
      const dow = cursor.getDay(); // 0=Sun, 6=Sat
      if (dow !== 0 && dow !== 6) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        daysOff.add(key);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return Math.min(5, daysOff.size);
}

/** Build a date-keyed map of events that overlap each day in the visible month. */
function calBuildEventDayMap(year, month) {
  const dayEvents = {};
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  _calEvents.forEach(ev => {
    // Firm-closed events apply to the whole team — always visible regardless
    // of the "Show events from others" toggle (bug e49be05e).
    if (!_calShowOthers && _currentUser && ev.user_id !== _currentUser.id && ev.event_type !== 'firm_closed') return;
    const start = ev.start_date ? new Date(ev.start_date + 'T00:00:00') : null;
    const end = ev.end_date ? new Date(ev.end_date + 'T00:00:00') : start;
    if (!start) return;
    // Walk every day in the event's range that falls inside the visible month
    const cursor = new Date(Math.max(start.getTime(), monthStart.getTime()));
    const stop = new Date(Math.min(end.getTime(), monthEnd.getTime()));
    while (cursor <= stop) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
      if (!dayEvents[key]) dayEvents[key] = [];
      dayEvents[key].push(ev);
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return dayEvents;
}

/** Render the monthly calendar grid view -- tasks shown as coloured chips on their due/start/end dates */
function renderCalendarView(filtered) {
  const now = new Date(); now.setHours(0,0,0,0);
  const firstDay = new Date(_calYear, _calMonth, 1);
  const lastDay = new Date(_calYear, _calMonth + 1, 0);
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday-first
  const daysInMonth = lastDay.getDate();
  const monthName = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // When "Show events from others" is off, only show the current user's own
  // tasks on the calendar (bug e49be05e — unassigned/others' due-date chips
  // were still visible). Firm-closed events are handled separately in
  // calBuildEventDayMap.
  let calFiltered = filtered;
  if (!_calShowOthers && _currentUser) {
    const myName = (_currentUser.displayName || _currentUser.display_name || '').toLowerCase();
    if (myName) calFiltered = filtered.filter(t => (t.assignees || []).some(a => a.toLowerCase() === myName));
  }

  // Build map: date string → tasks due/ending that day
  const dayTasks = {};
  calFiltered.forEach(t => {
    const dates = [t.dueDate, t.endDate, t.startDate].filter(Boolean);
    const uniqueDates = [...new Set(dates)];
    uniqueDates.forEach(ds => {
      if (!dayTasks[ds]) dayTasks[ds] = [];
      dayTasks[ds].push(t);
    });
  });

  // Trigger a calendar events fetch the first time we render this month
  // (or when navigating). loadCalendarEvents will re-render once the data is in.
  // IMPORTANT: visibleKey must match the same shape that loadCalendarEvents
  // writes into _calEventsKey, including the team filter suffix. Otherwise
  // picking a team makes the check perpetually mismatched, and each render
  // schedules another loadCalendarEvents → renderContent → render loop that
  // crashes the tab. (Reported by Glen 2026-04-15, D91.)
  const visibleKey = `${_calYear}-${_calMonth}` + (_calTeamFilter ? `:team:${_calTeamFilter}` : '');
  if (_calEventsKey !== visibleKey) {
    setTimeout(() => loadCalendarEvents(_calYear, _calMonth), 0);
  }
  const eventDayMap = calBuildEventDayMap(_calYear, _calMonth);

  let html = '<div class="cal">';
  // Navigation + add-event controls
  html += `<div class="cal__nav" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">`;
  html += `<button class="cal__nav-btn" data-action="_actCalPrev">&laquo; Prev</button>`;
  html += `<button class="cal__nav-btn" data-action="_actCalToday">Today</button>`;
  html += `<div class="cal__month-title">${monthName}</div>`;
  html += `<button class="cal__nav-btn" data-action="_actCalNext">Next &raquo;</button>`;
  html += `<div style="flex:1"></div>`;
  // Team filter — when a team is selected, the server returns events for
  // every member of that team. The dropdown is populated from _teamsCache
  // which is refreshed on startup and after any team mutation.
  const teamOpts = (_teamsCache && _teamsCache.length > 0)
    ? `<option value="">None</option>` + _teamsCache.map(t =>
        `<option value="${esc(t.id)}" ${_calTeamFilter === t.id ? 'selected' : ''}>${esc(t.name)}${t.client_name ? ' (' + esc(t.client_name) + ')' : ''}</option>`
      ).join('')
    : `<option value="">Loading teams\u2026</option>`;
  html += `<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted)">Filter by team:
    <select onchange="_calTeamFilter=this.value;_calEventsKey='';loadCalendarEvents(_calYear,_calMonth)" style="font-size:0.78rem;padding:2px 4px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">${teamOpts}</select>
  </label>`;
  html += `<label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted);cursor:pointer;user-select:none">
    <input type="checkbox" ${_calShowOthers ? 'checked' : ''} onchange="_calShowOthers=this.checked;renderContent()" style="accent-color:var(--accent)"> Show events from others
  </label>`;
  html += `<button class="btn btn--sm btn--primary" data-action="openCalendarEventModal">+ Add Event</button>`;
  html += `</div>`;

  // Legend for event type colours
  html += `<div class="cal__legend" style="display:flex;flex-wrap:wrap;gap:10px;padding:6px 4px;font-size:0.7rem;color:var(--text-muted)">`;
  CAL_EVENT_TYPES.forEach(t => {
    html += `<span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${t.colour}"></span>${t.label}</span>`;
  });
  html += `</div>`;

  // Grid
  html += '<div class="cal__grid">';
  // Day headers (Mon-Sun)
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
    html += `<div class="cal__day-header">${d}</div>`;
  });

  // Previous month padding
  const prevMonth = new Date(_calYear, _calMonth, 0);
  for (let i = startDay - 1; i >= 0; i--) {
    const day = prevMonth.getDate() - i;
    html += `<div class="cal__cell cal__cell--other"><div class="cal__date">${day}</div></div>`;
  }

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${_calYear}-${String(_calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dt = new Date(_calYear, _calMonth, d);
    const isToday = dt.getTime() === now.getTime();
    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
    let cls = 'cal__cell';
    if (isToday) cls += ' cal__cell--today';
    else if (isWeekend) cls += ' cal__cell--weekend';

    const tasksOnDay = dayTasks[dateStr] || [];
    const eventsOnDay = eventDayMap[dateStr] || [];
    const maxShow = 3;

    html += `<div class="${cls}"><div class="cal__date">${d}</div>`;
    // Calendar events render first as solid coloured bars (distinct from task cards)
    eventsOnDay.slice(0, maxShow).forEach(ev => {
      const col = calEventColour(ev.event_type);
      const ownerSuffix = ev.user_display_name ? ' — ' + ev.user_display_name : '';
      html += `<div class="cal__event" role="button" tabindex="0" aria-label="${esc(calEventTypeLabel(ev.event_type))}: ${esc(ev.title)}${esc(ownerSuffix)}" style="background:${col};color:#fff;padding:1px 5px;border-radius:3px;font-size:0.65rem;margin-top:2px;cursor:pointer;border-left:3px solid rgba(0,0,0,0.25);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" data-action="openCalendarEventDetail" data-stop data-arg0="${ev.id}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openCalendarEventDetail('${ev.id}')}" title="${esc(calEventTypeLabel(ev.event_type))}: ${esc(ev.title)}${esc(ownerSuffix)}">${esc(ev.title)}</div>`;
    });
    if (eventsOnDay.length > maxShow) {
      html += `<div class="cal__more" style="font-size:0.62rem;color:var(--text-muted)">+${eventsOnDay.length - maxShow} more events</div>`;
    }
    tasksOnDay.slice(0, maxShow).forEach(t => {
      const col = STATUS_COLOURS_HEX[t.status] || '#666';
      const overdue = t.dueDate === dateStr && dt < now && t.status !== 'Done';
      html += `<div class="cal__task${overdue?' cal__task--overdue':''}" style="background:${col}" data-action="openDetail" data-stop data-arg0="${t.id}" title="${esc(t.title)}">${clientPrefix(getTaskClient(t))} ${esc(t.title)}</div>`;
    });
    if (tasksOnDay.length > maxShow) {
      html += `<div class="cal__more" data-action="calExpandDay" data-stop data-arg0="${dateStr}" data-pass-el>+${tasksOnDay.length - maxShow} more</div>`;
    }
    html += '</div>';
  }

  // Next month padding to fill grid
  const totalCells = startDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal__cell cal__cell--other"><div class="cal__date">${i}</div></div>`;
  }

  html += '</div></div>';
  return html;
}

/**
 * Open the create/edit modal for a calendar event.
 *
 * @param {Object|null} event    An existing event to edit (with id), or null to create.
 * @param {Object}      prefill  Optional prefill for a fresh create:
 *   - start_date / end_date (ISO YYYY-MM-DD)
 *   - event_type (slug from CAL_EVENT_TYPES)
 *   - user_id (target user for admin-created entries; hidden form field)
 *   - user_display_name (for the h2 subtitle)
 */
async function openCalendarEventModal(event, prefill) {
  const isEdit = !!(event && event.id);
  prefill = prefill || {};
  // Pull live client list so we have the canonical IDs to attach to the event
  const clientList = (await apiCall('/api/clients')) || [];
  // Pull teams for the "For" dropdown — members see teams they belong to,
  // admins see all. Non-admin non-members fall through to "Myself only".
  const teamsList = (await apiCall('/api/teams')) || [];
  const selectedType = event?.event_type || prefill.event_type || '';
  const typeOpts = CAL_EVENT_TYPES.map(t => `<option value="${t.value}" ${selectedType === t.value ? 'selected' : ''}>${t.label}</option>`).join('');
  const visOpts = CAL_EVENT_VISIBILITY.map(v => `<option value="${v.value}" ${event && event.visibility === v.value ? 'selected' : (!event && v.value === 'team' ? 'selected' : '')}>${v.label}</option>`).join('');
  const clientOpts = `<option value="">-- None --</option>` + clientList.map(c =>
    `<option value="${esc(c.id)}" ${event && event.client_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`
  ).join('');
  // "For" dropdown: Myself (default) or one of the teams. Admins get every team.
  const selectedTeamId = event?.team_id || prefill.team_id || '';
  const teamOpts = `<option value="">Myself</option>` + teamsList.map(t =>
    `<option value="${esc(t.id)}" ${selectedTeamId === t.id ? 'selected' : ''}>Team: ${esc(t.name)}</option>`
  ).join('');
  const startVal = event?.start_date ? String(event.start_date).slice(0,10) : (prefill.start_date || '');
  const endVal = event?.end_date ? String(event.end_date).slice(0,10) : (prefill.end_date || '');
  const targetUserId = prefill.user_id || '';
  const targetName = prefill.user_display_name || '';
  const subtitle = targetName && !isEdit ? `<div style="color:var(--text-muted);font-size:0.82rem;margin-top:-8px;margin-bottom:12px">for <strong>${esc(targetName)}</strong></div>` : '';

  const html = `<div class="modal-overlay open" id="calEventModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-sm)">
      <h2 style="margin-top:0">${isEdit ? 'Edit' : 'New'} Calendar Event</h2>
      ${subtitle}
      <input type="hidden" id="calEvTargetUserId" value="${esc(targetUserId)}">
      <div class="lead-detail__grid">
        <label class="field-required">Title</label><input type="text" id="calEvTitle" value="${esc(event?.title || prefill.title || '')}" placeholder="e.g. London Games Conference">
        <label class="field-required">Type</label><select id="calEvType">${typeOpts}</select>
        <label>For</label><select id="calEvTeam" title="Choose Myself for a personal entry, or a team to mark the event for everyone on that team">${teamOpts}</select>
        <label class="field-required">Start date</label><input type="date" id="calEvStart" value="${startVal}">
        <label>End date</label><input type="date" id="calEvEnd" value="${endVal}">
        <label>Client</label><select id="calEvClient">${clientOpts}</select>
        <label>Visibility</label><select id="calEvVis">${visOpts}</select>
        <label>Description</label><textarea id="calEvDesc" rows="3" style="resize:vertical">${esc(event?.description || '')}</textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        ${isEdit ? `<button class="btn btn--danger" data-action="deleteCalendarEventFromModal" data-arg0="${event.id}">Delete</button>` : ''}
        <button class="btn" data-action="_actModalRemove" data-arg0="calEventModal">Cancel</button>
        <button class="btn btn--primary" data-action="_actSubmitCalEvent" data-pass-el data-arg0="${isEdit ? event.id : 'null'}">${isEdit ? 'Save' : 'Create'}</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  if (typeof _activateDynamicModal === 'function') _activateDynamicModal('calEventModal');
}

/** Submit the calendar event modal — POSTs a new event or PATCHes an existing one. */
async function submitCalendarEvent(eventId) {
  const modal = document.getElementById('calEventModal');
  if (!modal) return;
  if (typeof clearFieldErrors === 'function') clearFieldErrors(modal);
  const titleEl = document.getElementById('calEvTitle');
  const startEl = document.getElementById('calEvStart');
  const title = titleEl.value.trim();
  const start_date = startEl.value;
  if (!title) { if (typeof showFieldError === 'function') showFieldError(titleEl, 'Title is required'); return; }
  if (!start_date) { if (typeof showFieldError === 'function') showFieldError(startEl, 'Start date is required'); return; }

  const teamSel = document.getElementById('calEvTeam');
  const teamId = teamSel ? teamSel.value : '';
  const payload = {
    title,
    event_type: document.getElementById('calEvType').value,
    start_date,
    end_date: document.getElementById('calEvEnd').value || null,
    client_id: document.getElementById('calEvClient').value || null,
    visibility: document.getElementById('calEvVis').value,
    description: document.getElementById('calEvDesc').value.trim() || null
  };
  // Team event branch — when the "For" dropdown is set to a team, the
  // server drops user_id and attaches team_id, so the event shows on
  // every team member's roster row (bug d4367137).
  if (teamId) {
    payload.team_id = teamId;
  } else if (eventId) {
    // Editing: explicitly clear team_id to switch a team event back to a personal one
    payload.team_id = null;
  }
  // Admin-created entries can target another user via the hidden field
  // that the People → Calendar roster fills in. Server-side enforcement
  // ensures only admins can actually use this — members get a 403 if
  // they try to POST with a user_id != their own. Ignored when team_id is set.
  const targetUserId = document.getElementById('calEvTargetUserId')?.value || '';
  if (!eventId && targetUserId && !teamId) payload.user_id = targetUserId;

  const url = eventId ? `/api/calendar-events/${eventId}` : '/api/calendar-events';
  const resp = await authFetch(url, {
    method: eventId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    toast('Failed to save event: ' + (err.error?.message || err.error || 'Unknown error'), 'error');
    return;
  }
  modal.remove();
  toast(eventId ? 'Event updated' : 'Event created');
  _calEventsKey = '';
  _capacityEventsKey = ''; // D93: invalidate capacity cache so People view picks up the change
  await loadCalendarEvents(_calYear, _calMonth);
}

/** Open the calendar event detail/edit modal for an existing event. */
async function openCalendarEventDetail(eventId) {
  const event = await apiCall(`/api/calendar-events/${eventId}`);
  if (!event) return;
  openCalendarEventModal(event);
}

/** Delete a calendar event from inside the edit modal, with confirmation. */
async function deleteCalendarEventFromModal(eventId) {
  if (!(await themedConfirm('Delete this calendar event?'))) return;
  const resp = await authFetch(`/api/calendar-events/${eventId}`, { method: 'DELETE' });
  if (!resp.ok) { toast('Delete failed', 'error'); return; }
  document.getElementById('calEventModal')?.remove();
  toast('Event deleted');
  _calEventsKey = '';
  _capacityEventsKey = ''; // D93: invalidate capacity cache so People view picks up the change
  await loadCalendarEvents(_calYear, _calMonth);
}

/** Expand a calendar day cell to show all tasks */
function calExpandDay(dateStr, el) {
  const cell = el.closest('.cal__cell');
  if (!cell) return;
  // Remove the "+N more" button and show all hidden tasks
  const allTasks = tasks.filter(t => t.dueDate === dateStr || t.startDate === dateStr || t.endDate === dateStr);
  el.remove();
  allTasks.forEach(t => {
    if (cell.querySelector(`[onclick*="${t.id}"]`)) return; // already shown
    const col = STATUS_COLOURS_HEX[t.status] || '#666';
    const div = document.createElement('div');
    div.className = 'cal__task';
    div.style.background = col;
    div.title = t.title;
    div.textContent = (getTaskClient(t) ? getTaskClient(t).substring(0,2).toUpperCase() + ' ' : '') + t.title;
    div.onclick = (e) => { e.stopPropagation(); openDetail(t.id); };
    cell.appendChild(div);
  });
}

// ===== GANTT / TIMELINE VIEW =====
let ganttDayWidth = 28; // px per day, adjustable via zoom
let _ganttLabelWidth = 260; // px, draggable column width
let _ganttOffsetDays = 0; // Shift the timeline window: negative = past, positive = future
let _ganttLinkMode = false;  // Whether dependency link mode is active
let _ganttLinkFrom = null;   // Source task ID when dragging a dependency arrow
let _ganttHideArrows = false;  // Toggle dependency arrows visibility
let _ganttSelectedArrow = null; // { fromId, toId } when an arrow is selected
let _ganttDepView = false;     // Critical path dependency view mode

/** Render the Gantt/timeline view -- horizontal bars per task, grouped by client, with zoom controls */
let _ganttLimit = GANTT_ROW_LIMIT;
let _ganttHideDone = true; // Hide completed tasks by default on timeline

/** Render the Gantt/timeline view with horizontal bars, dependency chains, and zoom controls */
function renderGanttView(filtered) {
  // Show all items in hierarchy (not just leaves), optionally excluding Done
  const allLeafTasks = filtered.filter(t => !_ganttHideDone || t.status !== 'Done');
  if (allLeafTasks.length === 0) return emptyState('&#128197;', 'No items for timeline', 'Add items with due dates to see the Gantt chart.');

  // Performance guard: cap rendered tasks, prioritise active/upcoming with due dates
  let leafTasks = allLeafTasks;
  let truncated = false;
  if (allLeafTasks.length > _ganttLimit) {
    // Prioritise: tasks with due dates first, then active status, then by date
    leafTasks = [...allLeafTasks].sort((a, b) => {
      const aActive = a.status !== 'Done' && a.status !== 'Cancelled' ? 0 : 1;
      const bActive = b.status !== 'Done' && b.status !== 'Cancelled' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      const aHasDue = a.dueDate ? 0 : 1;
      const bHasDue = b.dueDate ? 0 : 1;
      if (aHasDue !== bHasDue) return aHasDue - bHasDue;
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    }).slice(0, _ganttLimit);
    truncated = true;
  }

  // Determine date range — shifted by _ganttOffsetDays for navigation
  const now = new Date(); now.setHours(0,0,0,0);
  let minDate = new Date(now); minDate.setDate(minDate.getDate() - 14 + _ganttOffsetDays);
  let maxDate = new Date(now); maxDate.setDate(maxDate.getDate() + 90 + _ganttOffsetDays);

  // Expand range for tasks within a reasonable window around the current view
  const rangeFloor = new Date(minDate); rangeFloor.setMonth(rangeFloor.getMonth() - 2);
  const rangeCeiling = new Date(maxDate); rangeCeiling.setMonth(rangeCeiling.getMonth() + 3);
  leafTasks.forEach(t => {
    const start = ganttTaskStart(t);
    const end = ganttTaskEnd(t);
    if (start && start > rangeFloor && start < minDate) minDate = new Date(start);
    if (end && end < rangeCeiling && end > maxDate) maxDate = new Date(end);
  });
  // Pad by a few days
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 7);

  // Hard cap: never exceed 250 days to prevent DOM explosion
  // Use round instead of ceil to avoid DST off-by-one errors
  const totalDays = Math.min(Math.round((maxDate - minDate) / 86400000), 250);
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
  // Zoom + filter controls
  html += `<div class="gantt__zoom" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:4px">
      <button class="btn btn--outline btn--sm" data-action="_actGanttZoomOut" title="Zoom out">&minus;</button>
      <span style="font-size:0.68rem;color:var(--text-muted);min-width:28px;text-align:center">${dayW}px</span>
      <button class="btn btn--outline btn--sm" data-action="_actGanttZoomIn" title="Zoom in">+</button>
    </div>
    <div style="display:flex;align-items:center;gap:4px">
      <button class="btn btn--outline btn--sm" data-action="_actGanttBack" title="Back 1 month">&larr;</button>
      <button class="btn btn--outline btn--sm" data-action="_actGanttToday" title="Jump to today" style="font-size:0.68rem">Today</button>
      <button class="btn btn--outline btn--sm" data-action="_actGanttFwd" title="Forward 1 month">&rarr;</button>
    </div>
    <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-muted);cursor:pointer;user-select:none">
      <input type="checkbox" ${_ganttHideDone ? 'checked' : ''} onchange="_ganttHideDone=this.checked;renderContent()" style="accent-color:var(--accent)"> Hide Done
    </label>
    <div class="add-item-menu" style="position:relative;display:inline-flex">
      <button class="btn btn--sm ${_ganttLinkMode || _ganttDepView ? 'btn--primary' : 'btn--outline'}" data-action="toggleGanttDepMenu" data-pass-event style="font-size:0.72rem">&#128279; Prerequisites &#9660;</button>
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

  html += `<div class="gantt ${_ganttLinkMode ? 'gantt-link-mode' : ''}" style="width:100%;--gantt-label-w:${_ganttLabelWidth}px" data-action="_actDeselectGanttArrowIfNeeded" data-pass-event>`;

  // Draggable column resize handle
  html += `<div class="gantt__col-resize" style="left:${_ganttLabelWidth - 3}px" onmousedown="ganttColResizeStart(event)"></div>`;

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
    let cls = 'gantt__day-hdr';
    if (isWeekend) cls += ' gantt__day-hdr--weekend';
    if (isToday) cls += ' gantt__day-hdr--today';
    html += `<div class="${cls}" style="width:${dayW}px">${d.getDate()}</div>`;
    d.setDate(d.getDate() + 1);
  }
  html += `</div>`;
  html += `</div>`; // close timeline header column
  html += `</div>`; // close header

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
      html += `<div class="gantt__row-label" style="font-weight:600">Critical Path <span style="font-size:0.68rem;color:var(--text-muted);font-weight:400">(${sorted.length} items)</span></div>`;
      html += `<div class="gantt__row-timeline" style="min-width:${timelineW}px">`;
      html += ganttDayCols(totalDays, dayW, minDate, now);
      html += `</div></div>`;

      // Compute chain depth for indentation (0 = no prerequisites, deeper = more prereqs above)
      const depthMemo = {};
      /** Calculate the dependency chain depth of a task (memoised) for indentation */
      function depChainDepth(t) {
        if (depthMemo[t.id] !== undefined) return depthMemo[t.id];
        if (!t.dependencies || t.dependencies.length === 0) { depthMemo[t.id] = 0; return 0; }
        let maxD = 0;
        t.dependencies.forEach(depId => { const dep = tasks.find(x => x.id === depId); if (dep) maxD = Math.max(maxD, depChainDepth(dep) + 1); });
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
        html += `<div class="gantt__row-label" data-action="openDetailOverlay" data-arg0="${t.id}" title="${esc(t.title)}" style="padding-left:${8 + indent}px;font-size:0.72rem">`;
        html += `<span class="item-type-badge" style="background:${typeMeta.colour};font-size:0.5rem;padding:0 4px">${typeMeta.label.charAt(0)}</span>`;
        if (prereqBlocked) html += `<span style="color:var(--warning);font-size:0.65rem">&#128274;</span>`;
        html += `<span style="overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>`;
        html += `</div>`;
        html += `<div class="gantt__row-timeline" style="min-width:${timelineW}px">`;
        html += ganttDayCols(totalDays, dayW, minDate, now);
        const todayOff = Math.round((now - minDate) / 86400000);
        if (todayOff >= 0 && todayOff < totalDays) html += `<div class="gantt__today-line" style="left:${todayOff * dayW}px;width:${dayW}px"></div>`;
        if (start && end && end >= start) {
          const rawOff = Math.round((start - minDate) / 86400000);
          const sOff = Math.max(0, rawOff);
          const dur = Math.max(1, Math.ceil((end - start) / 86400000) + 1) - (sOff - rawOff);
          if (dur > 0) {
            html += `<div class="gantt__bar ${barClass}" style="left:${sOff * dayW}px;width:${dur * dayW}px" data-task-id="${t.id}" data-start="${start.toISOString().slice(0,10)}" data-end="${end.toISOString().slice(0,10)}" data-min-date="${minDate.toISOString().slice(0,10)}" data-day-width="${dayW}" onmousedown="ganttBarDragStart(event,'${t.id}','move')" ondblclick="event.stopPropagation();openDetailOverlay('${t.id}')" title="${esc(t.title)} | ${t.status}">`;
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
    html += `<div class="gantt__row-label">${esc(client)} <span style="font-size:0.68rem;color:var(--text-muted);font-weight:400">(${totalClientItems} items)</span></div>`;
    html += `<div class="gantt__row-timeline" style="min-width:${timelineW}px">`;
    // Day columns for background
    html += ganttDayCols(totalDays, dayW, minDate, now);
    html += `</div></div>`;

    /** Render a single Gantt row with bar, label, and recursively render child rows */
    function renderGanttRow(t, depth) {
      if (_ganttHideDone && t.status === 'Done') return;
      const start = ganttTaskStart(t);
      const end = ganttTaskEnd(t);
      const barClass = ganttBarClass(t);
      const indent = depth * 16;
      const typeMeta = getItemTypeMeta(t);
      const kids = getChildren(t.id).filter(c => !_ganttHideDone || c.status !== 'Done');
      const isParent = kids.length > 0;
      const isCollapsed = collapsedTaskIds.has(t.id);
      const fontWeight = isParent ? '600' : '400';
      const fontSize = depth === 0 ? '0.78rem' : '0.72rem';

      html += `<div class="gantt__row">`;
      html += `<div class="gantt__row-label" data-action="openDetailOverlay" data-arg0="${t.id}" title="${esc(t.title)}" style="padding-left:${8 + indent}px;font-weight:${fontWeight};font-size:${fontSize}">`;
      // Collapse toggle for parent items
      if (isParent) {
        html += `<span class="gantt__collapse-toggle" data-action="toggleGanttCollapse" data-stop data-arg0="${t.id}">${isCollapsed ? '&#9654;' : '&#9660;'}</span>`;
      } else {
        html += `<span style="width:14px;display:inline-block"></span>`;
      }
      html += `<span class="item-type-badge" style="background:${typeMeta.colour};font-size:0.5rem;padding:0 4px">${typeMeta.label.charAt(0)}</span>`;
      if (isTaskIncomplete(t)) html += `<span style="color:var(--danger);font-size:0.65rem">&#9888;</span>`;
      html += `<span style="overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>`;
      if (isParent && isCollapsed) html += `<span style="font-size:0.6rem;color:var(--text-muted);margin-left:4px">(${kids.length})</span>`;
      html += `</div>`;
      html += `<div class="gantt__row-timeline" style="min-width:${timelineW}px">`;
      html += ganttDayCols(totalDays, dayW, minDate, now);

      // Today line
      const todayOffset = Math.round((now - minDate) / 86400000);
      if (todayOffset >= 0 && todayOffset < totalDays) {
        html += `<div class="gantt__today-line" style="left:${todayOffset * dayW}px;width:${dayW}px"></div>`;
      }

      // Bar — clamp left edge so bars never render behind the label column
      if (start && end && end >= start) {
        const rawStartOff = Math.round((start - minDate) / 86400000);
        const startOff = Math.max(0, rawStartOff);
        const rawDur = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
        const dur = rawDur - (startOff - rawStartOff); // trim days lost to clamping
        if (dur <= 0) { /* bar entirely before visible range */ } else {
        const left = startOff * dayW;
        const width = dur * dayW;
        const startISO = start.toISOString().slice(0,10);
        const endISO = end.toISOString().slice(0,10);
        const selCls = _ganttSelectedTaskId === t.id ? ' selected' : '';
        html += `<div class="gantt__bar ${barClass}${selCls}" style="left:${left}px;width:${width}px" data-task-id="${t.id}" data-start="${startISO}" data-end="${endISO}" data-min-date="${minDate.toISOString().slice(0,10)}" data-day-width="${dayW}" onmousedown="ganttBarDragStart(event,'${t.id}','move')" ondblclick="event.stopPropagation();openDetailOverlay('${t.id}')" title="${esc(t.title)} | ${t.status} | ${startISO} to ${endISO}">`;
        html += `<div class="gantt__bar-handle gantt__bar-handle--left" onmousedown="event.stopPropagation();ganttBarDragStart(event,'${t.id}','resize-start')"></div>`;
        if (width > 40) html += `<span style="overflow:hidden;text-overflow:ellipsis;pointer-events:none;flex:1">${esc(t.title)}</span>`;
        html += `<div class="gantt__bar-handle gantt__bar-handle--right" onmousedown="event.stopPropagation();ganttBarDragStart(event,'${t.id}','resize-end')"></div>`;
        html += `</div>`;
        } // close dur > 0
      } else if (end) {
        // Single-day bar (due date only, no start) — uses status colour
        const endOff = Math.max(0, Math.round((end - minDate) / 86400000));
        const endISO = end.toISOString().slice(0,10);
        html += `<div class="gantt__bar ${barClass}" style="left:${endOff * dayW}px;width:${dayW}px" data-task-id="${t.id}" data-start="${endISO}" data-end="${endISO}" data-min-date="${minDate.toISOString().slice(0,10)}" data-day-width="${dayW}" onmousedown="ganttBarDragStart(event, '${t.id}', 'move')" ondblclick="event.stopPropagation();openDetailOverlay('${t.id}')" title="${esc(t.title)} — due ${t.dueDate}"></div>`;
      } else if (start) {
        // Single-day bar (start only, no due date) — uses status colour, dimmed
        const startOff = Math.max(0, Math.round((start - minDate) / 86400000));
        const startISO = start.toISOString().slice(0,10);
        html += `<div class="gantt__bar ${barClass}" style="left:${startOff * dayW}px;width:${dayW}px;opacity:0.5" data-task-id="${t.id}" data-start="${startISO}" data-end="${startISO}" data-min-date="${minDate.toISOString().slice(0,10)}" data-day-width="${dayW}" onmousedown="ganttBarDragStart(event, '${t.id}', 'move')" ondblclick="event.stopPropagation();openDetailOverlay('${t.id}')" title="${esc(t.title)} — no due date"></div>`;
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

  // Truncation banner
  if (truncated) {
    html += `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:0.85rem">
      Showing ${_ganttLimit} of ${allLeafTasks.length} tasks (active with due dates first).
      <button class="btn btn--outline" style="margin-left:8px;font-size:0.75rem" data-action="_actGanttShowMore">Show More</button>
      ${_ganttLimit < allLeafTasks.length ? '' : ''}
    </div>`;
  }
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
    <marker id="depArrowDone" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="var(--success)"/></marker>
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

/** Render lightweight background for a Gantt row using CSS repeating pattern (no per-day divs) */
function ganttDayCols(totalDays, dayW, minDate, now) {
  // Use a single div with repeating background instead of one div per day
  const w = totalDays * dayW;
  return `<div style="position:absolute;top:0;bottom:0;left:0;width:${w}px;background-image:repeating-linear-gradient(90deg,transparent,transparent ${dayW - 1}px,var(--border-subtle) ${dayW - 1}px,var(--border-subtle) ${dayW}px);pointer-events:none"></div>`;
}

/** Return CSS class for a Gantt bar based on task status and health */
function ganttBarClass(t) {
  if (t.healthState === 'Blocked') return 'gantt__bar--blocked';
  if (t.status === 'Cancelled') return 'gantt__bar--cancelled';
  if (t.status === 'Done') return 'gantt__bar--done';
  if (t.status === 'In progress') return 'gantt__bar--inprogress';
  if (t.status === 'Not started') return 'gantt__bar--notstarted';
  return 'gantt__bar--inprogress'; // Planning, In Review, etc.
}

/** Get the effective start date for a Gantt bar -- prefers startDate, falls back to createdAt */
function ganttTaskStart(t) {
  if (t.startDate) { const d = safeParseDate(t.startDate); if (d) return d; }
  if (t.createdAt) { const d = new Date(t.createdAt); if (!isNaN(d.getTime())) { d.setHours(0,0,0,0); return d; } }
  return null;
}

/** Get the effective end date for a Gantt bar -- prefers endDate, then dueDate, falls back to start + 7 days */
function ganttTaskEnd(t) {
  if (t.endDate) { const d = safeParseDate(t.endDate); if (d) return d; }
  if (t.dueDate) { const d = safeParseDate(t.dueDate); if (d) return d; }
  // Fallback: start date + 7 days (or null if no start either)
  const start = ganttTaskStart(t);
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

  // Calculate snapped position
  const newLeft = parseFloat(barEl.style.left);
  const newWidth = parseFloat(barEl.style.width);
  const startDayOffset = Math.round(newLeft / dayWidth);
  const durationDays = Math.max(1, Math.round(newWidth / dayWidth));
  const newStartDate = new Date(minDateMs + startDayOffset * 86400000);
  const newEndDate = new Date(minDateMs + (startDayOffset + durationDays - 1) * 86400000);
  const newStartStr = newStartDate.toISOString().slice(0,10);
  const newEndStr = newEndDate.toISOString().slice(0,10);

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
      task.endDate = newEndStr;
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
    // Update bar data attributes without re-render
    barEl.dataset.start = task.startDate || newStartStr;
    barEl.dataset.end = task.endDate || newEndStr;
    // Update the task label's tooltip
    const label = document.querySelector(`.gantt__row-label[onclick*="${taskId}"]`);
    if (label) label.title = task.title;
    toast(`${mode === 'move' ? 'Moved' : 'Resized'}: ${newStartStr} to ${newEndStr}`);
    // Redraw dependency arrows to match new bar positions
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

// ==================== CLIENT SUMMARY PANEL ====================

/** Render the 30% right-side summary panel showing portfolio/client stats, progress ring, and team breakdown */
function renderClientSummary(filtered) {
  const clientName = currentFilter.assignee ? currentFilter.assignee + "'s Tasks" : currentFilter.client || 'NBI Portfolio';
  const scopedTasks = filtered;
  const total = scopedTasks.length;
  const roots = scopedTasks.filter(t => !t.parentId);
  const statusC = countByStatus(scopedTasks);
  const healthC = countByHealth(scopedTasks);
  const totalHrs = scopedTasks.reduce((s,t) => s + (t.hoursSpent||0), 0);
  const totalEst = scopedTasks.reduce((s,t) => s + (t.hoursEstimated||0), 0);
  const done = statusC['Done'] || 0;
  const donePct = total ? Math.round(done / total * 100) : 0;
  const blocked = scopedTasks.filter(t => t.healthState === 'Blocked').length;
  const overdue = scopedTasks.filter(t => {
    if (!t.dueDate || t.status === 'Done') return false;
    const d = safeParseDate(t.dueDate); if (!d) return false;
    const now = new Date(); now.setHours(0,0,0,0);
    return d < now;
  }).length;
  const assigneeSet = new Set(); scopedTasks.forEach(t => { if (t.assignees) t.assignees.forEach(a => assigneeSet.add(a)); });
  const assignees = [...assigneeSet].sort();

  let html = '<div class="client-summary">';
  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md)">
    <div class="client-summary__title">${esc(clientName)}</div>
    <button class="inline-detail__close" data-action="_actSetInlineDetail" data-arg0="false" title="Hide panel">&times;</button>
  </div>`;

  // Progress ring
  html += `<div style="text-align:center;margin-bottom:var(--space-lg)">`;
  html += renderProgressRing(donePct, 80);
  html += `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">${done} of ${total} tasks complete</div>`;
  html += '</div>';

  // Status minibar
  html += '<div class="client-summary__subtitle">Status Breakdown</div>';
  if (total > 0) {
    html += '<div class="summary-minibar">';
    const statusColours = { 'Done': 'var(--success)', 'In progress': 'var(--accent)', 'Planning': 'var(--warning)', 'Drafted': 'var(--purple)', 'In Review': 'var(--warning)', 'Blocked': 'var(--danger)', 'Not started': 'var(--text-muted)', 'Cancelled': '#444' };
    STATUSES.forEach(s => {
      const cnt = statusC[s] || 0;
      if (cnt > 0) {
        const pct = (cnt / total * 100);
        html += `<div class="summary-minibar__seg" style="width:${pct}%;background:${statusColours[s] || 'var(--text-muted)'}" title="${s}: ${cnt}"></div>`;
      }
    });
    html += '</div>';
  }
  STATUSES.forEach(s => {
    const cnt = statusC[s] || 0;
    if (cnt > 0) {
      html += `<div class="summary-stat"><span class="summary-stat__label">${s}</span><span class="summary-stat__value">${cnt}</span></div>`;
    }
  });

  // Key metrics
  html += `<div class="client-summary__subtitle" style="margin-top:var(--space-lg)">Key Metrics</div>`;
  html += `<div class="summary-stat"><span class="summary-stat__label">Projects</span><span class="summary-stat__value">${roots.length}</span></div>`;
  html += `<div class="summary-stat"><span class="summary-stat__label">Hours Spent</span><span class="summary-stat__value">${totalHrs.toFixed(1)}h</span></div>`;
  html += `<div class="summary-stat"><span class="summary-stat__label">Hours Estimated</span><span class="summary-stat__value">${totalEst.toFixed(1)}h</span></div>`;
  if (totalEst > 0) {
    const burnPct = Math.round(totalHrs / totalEst * 100);
    html += `<div class="summary-stat"><span class="summary-stat__label">Budget Used</span><span class="summary-stat__value ${burnPct > 100 ? 'summary-stat__value--danger' : burnPct > 80 ? 'summary-stat__value--warning' : ''}">${burnPct}%</span></div>`;
  }
  html += `<div class="summary-stat"><span class="summary-stat__label">Blocked</span><span class="summary-stat__value ${blocked > 0 ? 'summary-stat__value--danger' : ''}">${blocked}</span></div>`;
  html += `<div class="summary-stat"><span class="summary-stat__label">Overdue</span><span class="summary-stat__value ${overdue > 0 ? 'summary-stat__value--danger' : ''}">${overdue}</span></div>`;

  // Team
  if (assignees.length > 0) {
    html += `<div class="client-summary__subtitle" style="margin-top:var(--space-lg)">Team (${assignees.length})</div>`;
    assignees.forEach(a => {
      const at = scopedTasks.filter(t => t.assignees && t.assignees.includes(a));
      const aDone = at.filter(t => t.status === 'Done').length;
      html += `<div class="summary-stat"><span class="summary-stat__label">${esc(a)}</span><span class="summary-stat__value">${aDone}/${at.length}</span></div>`;
    });
  }

  html += '</div>';
  return html;
}

/**
 * Render an SVG circular progress ring.
 * @param {number} pct - Completion percentage (0-100)
 * @param {number} size - Diameter in pixels
 */
function renderProgressRing(pct, size) {
  const cx = size/2, cy = size/2, r = size/2 - 6, stroke = 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const colour = pct >= 80 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : 'var(--warning)';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-subtle)" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colour}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})" style="transition:stroke-dashoffset 0.4s ease"/>
    <text x="${cx}" y="${cy+1}" text-anchor="middle" dominant-baseline="middle" fill="var(--text-primary)" font-family="var(--font-display)" font-size="${size*0.25}" font-weight="700">${pct}%</text>
  </svg>`;
}

/** Render the inline task detail panel (30% right side in tasks view) -- properties, time, notes, children */
function renderInlineTaskDetail(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return renderClientSummary(getFilteredTasks());
  const children = getChildren(id);
  const hrs = aggHours(id);
  const isRoot = !task.parentId;

  let html = '<div class="inline-detail">';
  html += `<div class="inline-detail__header"><input class="inline-detail__title-input" value="${esc(task.title)}" onchange="updateTask('${id}','title',this.value)" onkeydown="if(event.key==='Enter')this.blur()"><button class="inline-detail__close" data-action="_actClearDetailTask" title="Back to summary">&larr;</button></div>`;

  // Properties
  // Properties — Name first, then Client, editable on all tasks
  const ilClient = getTaskClient(task);
  html += `<div class="detail-section"><div class="detail-section__title">Properties</div>`;
  html += `<div class="detail-field"><span class="detail-field__label">Type</span><div style="display:flex;align-items:center;gap:6px">${itemTypeBadgeHtml(task)} <span style="font-size:0.82rem;color:var(--text-primary)">${getItemTypeLabel(task)}</span></div></div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="inline-detail-title">Name</label><input id="inline-detail-title" value="${esc(task.title)}" onchange="updateTask('${id}','title',this.value)" onkeydown="if(event.key==='Enter')this.blur()"></div>`;
  if (ilClient) {
    html += `<div class="detail-field"><span class="detail-field__label field-required">Client</span><div style="display:flex;align-items:center;gap:6px">${clientBadgeHtml(ilClient)} <span style="font-size:0.82rem;color:var(--text-primary)">${esc(ilClient)}</span></div></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label field-required" for="inline-detail-client">Client</label><select id="inline-detail-client" onchange="if(!this.value){this.value='${escAttrJs(task.client||'')}';toast('Every item must belong to a client.','warning');return;}updateTask('${id}','client',this.value)"><option value="" disabled>${task.client ? '' : '-- Select Client --'}</option>${getContractedClients().map(o => `<option value="${esc(o)}" ${(task.client||'')=== o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  }
  html += inlineDetailSelect('Status', 'status', task.status, STATUSES, id, true);
  html += inlineDetailSelect('Priority', 'priority', task.priority || '', ['', ...PRIORITIES], id, true);
  html += inlineDetailSelect('Health', 'healthState', task.healthState || '', ['', ...HEALTH_STATES], id);
  html += `<div class="detail-field"><span class="detail-field__label">Assignee</span>${assigneeSelectHtml(id, task.assignees)}</div>`;
  // Practice (Phase 9, a6c82c8c). Tag a task to roll it up under a
  // practice in the sidebar filter. Inherits from the parent chain when
  // unset, so users normally only need to set this on a project.
  // Read both camelCase (sync/load) and snake_case (REST) for compatibility.
  html += (function() {
    const cur = task.practiceArea || task.practice_area || '';
    return `<div class="detail-field"><label class="detail-field__label" for="inline-detail-practice">Practice</label><select id="inline-detail-practice" onchange="updateTask('${id}','practiceArea',this.value||null)"><option value="">-- Inherit / None --</option>${PRACTICES.map(p => `<option value="${esc(p.value)}" ${cur === p.value ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>`;
  })();
  html += (function() {
    if (task.parentId) return '';
    const cur = task.workType || '';
    const config = _leadsConfig;
    const opts = config && config.fieldOptions
      ? (config.fieldOptions.work_type || []).map(o => typeof o === 'string' ? o : o.value)
      : [];
    return `<div class="detail-field"><label class="detail-field__label" for="inline-detail-workType">Work Type</label><select id="inline-detail-workType" onchange="updateTask('${id}','workType',this.value||null)"><option value="">-- None --</option>${opts.map(v => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`;
  })();
  // SoW selector (bug cb32b7f9). Only shown on root tasks (projects) — child
  // tasks inherit the parent's SoW via the tree grouping. Filters the SoW
  // list to the task's client so PMs don't see irrelevant SoWs.
  if (isRoot) {
    html += (function() {
      const curSow = task.sowId || task.sow_id || '';
      const taskClient = getTaskClient(task);
      const clientId = taskClient ? (_apiClientsCache[taskClient] && _apiClientsCache[taskClient].id) : null;
      const scopedSows = clientId ? _sowsCache.filter(s => s.client_id === clientId) : _sowsCache;
      return `<div class="detail-field"><label class="detail-field__label" for="inline-detail-sow">Statement of Work</label><select id="inline-detail-sow" onchange="updateTask('${id}','sowId',this.value||null)"><option value="">-- No SoW --</option>${scopedSows.map(s => `<option value="${esc(s.id)}" ${curSow === s.id ? 'selected' : ''}>${esc(s.title)}${s.client_name && !clientId ? ' (' + esc(s.client_name) + ')' : ''}</option>`).join('')}</select></div>`;
    })();
  }
  html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-startDate">Start Date</label><input id="inline-detail-startDate" type="date" value="${task.startDate||''}" onchange="updateTask('${id}','startDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-endDate">End Date</label><input id="inline-detail-endDate" type="date" value="${task.endDate||''}" onchange="updateTask('${id}','endDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-dueDate">Due Date</label><input id="inline-detail-dueDate" type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
  html += `</div>`;

  // Time Tracking
  html += `<div class="detail-section"><div class="detail-section__title">Time Tracking</div>`;
  if (children.length > 0) html += `<div class="detail-agg" style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px">${hrs.spent.toFixed(1)}h spent / ${hrs.est.toFixed(1)}h estimated (${hrs.est > 0 ? Math.round(hrs.spent/hrs.est*100) : 0}%)</div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-hoursSpent">Hours Spent</label><input id="inline-detail-hoursSpent" type="number" step="0.5" min="0" value="${task.hoursSpent||0}" onchange="updateTask('${id}','hoursSpent',parseFloat(this.value)||0)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="inline-detail-hoursEstimated">Hours Est.</label><input id="inline-detail-hoursEstimated" type="number" step="0.5" min="0" value="${task.hoursEstimated||0}" onchange="updateTask('${id}','hoursEstimated',parseFloat(this.value)||0)"></div>`;
  html += `</div>`;

  // Description (split into three fields — Feature 5)
  html += `<div class="detail-section"><div class="detail-section__title field-required">Description of Work <span style="font-size:0.7rem;font-weight:400;color:var(--text-muted)">(min 15 characters)</span></div>`;
  html += `<div class="detail-field"><textarea placeholder="A clear, concise description of the work needed to complete this task." onchange="updateTask('${id}','description',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.description||'')}</textarea></div></div>`;
  html += `<div class="detail-section"><div class="detail-section__title">Collaborations</div>`;
  html += `<div class="detail-field"><textarea placeholder="If there are multiple people on the task, describe everyone's responsibilities." onchange="updateTask('${id}','collaborations',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.collaborations||'')}</textarea></div></div>`;
  html += `<div class="detail-section"><div class="detail-section__title">Success Factor</div>`;
  html += `<div class="detail-field"><textarea placeholder="What will we have accomplished or made by the completion of this task?" onchange="updateTask('${id}','successFactor',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.successFactor||'')}</textarea></div></div>`;

  // Notes
  html += `<div class="detail-section"><div class="detail-section__title">Notes</div><div class="note-list">`;
  (task.notes||[]).forEach(n => { html += `<div class="note-item"><div class="note-item__time">${new Date(n.time).toLocaleString()}</div><div>${esc(n.text)}</div></div>`; });
  html += `</div><div class="note-input"><input id="inlineNoteInput" placeholder="Add a note..." onkeydown="if(event.key==='Enter'){addNoteInline('${id}')}"><button class="btn btn--sm btn--primary" data-action="addNoteInline" data-arg0="${id}">Add</button></div></div>`;

  // Attachments
  html += renderAttachmentsSection(isRoot ? 'project' : 'task', id);

  // Prerequisites (compact version for inline panel)
  const inlineDeps = task.dependencies || [];
  const inlineDepTasks = inlineDeps.map(did => tasks.find(t => t.id === did)).filter(Boolean);
  const inlineBlockers = inlineDepTasks.filter(d => d.status !== 'Done');
  html += `<div class="detail-section"><div class="detail-section__title">Prerequisites ${inlineBlockers.length > 0 ? `<span style="color:var(--warning);font-size:0.7rem;font-weight:400">(${inlineBlockers.length} incomplete)</span>` : inlineDeps.length > 0 ? '<span style="color:var(--success);font-size:0.7rem;font-weight:400">All met</span>' : ''}</div>`;
  if (inlineDepTasks.length > 0) {
    inlineDepTasks.forEach(d => {
      const dIcon = d.status === 'Done' ? '<span style="color:var(--success)">&#10003;</span>' : '<span style="color:var(--warning)">&#9679;</span>';
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;padding:2px 0">${dIcon} ${itemTypeBadgeHtml(d)} <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--accent-text)" data-action="openDetailOverlay" data-arg0="${d.id}">${esc(d.title)}</span><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.65rem" data-action="_actStopRemoveDepAndRender" data-stop data-arg0="${id}" data-arg1="${d.id}" title="Remove">&times;</button></div>`;
    });
  } else {
    html += `<div style="color:var(--text-muted);font-size:0.75rem;padding:2px 0">None</div>`;
  }
  html += `</div>`;

  // Dependents (compact, read-only)
  const inlineDependents = getDependents(id);
  if (inlineDependents.length > 0) {
    html += `<div class="detail-section"><div class="detail-section__title">Dependents <span style="font-size:0.7rem;font-weight:400;color:var(--text-muted)">(${inlineDependents.length} waiting)</span></div>`;
    inlineDependents.forEach(d => {
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;padding:2px 0">${itemTypeBadgeHtml(d)} <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--accent-text)" data-action="openDetailOverlay" data-arg0="${d.id}">${esc(d.title)}</span><span style="font-size:0.65rem;color:var(--text-muted)">${d.status}</span></div>`;
    });
    html += `</div>`;
  }

  // Children summary + add child button
  const childType = getAllowedChildType(task);
  if (children.length > 0 || childType) {
    const childLabel = getChildTypeLabel(task) || 'Children';
    html += `<div class="detail-section"><div class="detail-section__title">${childLabel} (${children.length})</div>`;
    if (children.length > 0) {
      const childDone = children.filter(c => c.status === 'Done').length;
      const childPct = Math.round(childDone / children.length * 100);
      html += `<div class="summary-progress"><div class="summary-progress__bar"><div class="summary-progress__fill" style="width:${childPct}%;background:var(--success)"></div></div></div>`;
      html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">${childDone}/${children.length} complete</div>`;
      children.slice(0, 8).forEach(c => {
        const icon = c.status === 'Done' ? '&#10003;' : c.status === 'In progress' ? '&#9654;' : '&#9675;';
        const style = c.status === 'Done' ? 'color:var(--success)' : c.status === 'Blocked' ? 'color:var(--danger)' : '';
        html += `<div style="font-size:0.78rem;padding:3px 0;cursor:pointer;display:flex;align-items:center;gap:6px;${style}" data-action="openDetail" data-arg0="${c.id}"><span>${icon}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.title)}</span></div>`;
      });
      if (children.length > 8) html += `<div style="font-size:0.72rem;color:var(--text-muted);padding:4px 0">+ ${children.length - 8} more</div>`;
    }
    if (childType) {
      const childMeta = ITEM_TYPE_META[childType];
      html += `<button class="btn btn--sm btn--outline" data-action="addItem" data-arg0="${childType}" data-arg1="${id}" style="margin-top:8px;font-size:0.72rem">+ Add ${childMeta.label}</button>`;
    }
    html += '</div>';
  }

  // Actions
  html += `<div class="detail-section"><div class="detail-section__title">Actions</div>`;
  html += `<div style="display:flex;gap:8px">`;
  html += `<button class="btn btn--outline" data-action="openDetailOverlay" data-arg0="${id}" style="font-size:0.72rem">Expand</button>`;
  html += `<button class="btn btn--danger" data-action="deleteTask" data-arg0="${id}" style="font-size:0.72rem">Delete</button>`;
  html += `</div></div>`;

  html += '</div>';
  return html;
}

/** Generate a labelled select dropdown for the inline detail panel. Pass required=true to mark the label as mandatory. */
function inlineDetailSelect(label, field, value, options, taskId, required) {
  const cls = 'detail-field__label' + (required ? ' field-required' : '');
  const selId = `inline-detail-${field}`;
  return `<div class="detail-field"><label class="${cls}" for="${selId}">${label}</label><select id="${selId}" onchange="updateTask('${taskId}','${field}',this.value)">${options.map(o => `<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o||'-- None --')}</option>`).join('')}</select></div>`;
}

/** Add a timestamped note to a task from the inline detail panel input */
function addNoteInline(id) {
  const input = document.getElementById('inlineNoteInput');
  if (!input || !input.value.trim()) return;
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (!task.notes) task.notes = [];
  task.notes.push({ time: new Date().toISOString(), text: input.value.trim() });
  task.updatedAt = new Date().toISOString();
  markDirty(id);
  save();
  renderContent();
}

/**
 * Render a single task row in the tree view, recursively rendering children.
 * @param {Object} task - The task object
 * @param {number} depth - Nesting depth (controls indentation)
 * @param {Array} filtered - The currently filtered task list
 */
function renderTaskRow(task, depth, filtered, visibleIds) {
  if (visibleIds && !visibleIds.has(task.id)) return '';
  const children = getChildren(task.id);
  const hasKids = children.length > 0;
  const hrs = aggHours(task.id);
  const hrsStr = (hrs.spent > 0 || hrs.est > 0) ? `${hrs.spent.toFixed(1)}/${hrs.est.toFixed(1)}h` : '';
  const isDone = task.status === 'Done';
  const isCancelled = task.status === 'Cancelled';
  const isInProgress = task.status === 'In progress';
  const isBlocked = task.healthState === 'Blocked';
  let iconClass = 'task-row__status-icon';
  let iconContent = '';
  if (isDone) { iconClass += ' task-row__status-icon--done'; iconContent = '&#10003;'; }
  else if (isCancelled) { iconContent = '&times;'; }
  else if (isBlocked) { iconClass += ' task-row__status-icon--blocked'; }
  else if (isInProgress) { iconClass += ' task-row__status-icon--inprogress'; }
  const rowClass = 'task-row' + (isDone ? ' task-row--done' : '') + (isCancelled ? ' task-row--cancelled' : '');

  let html = `<div class="${rowClass}" style="padding-left:${16 + depth*20}px" draggable="true" data-task-id="${task.id}" data-action="openDetail" data-arg0="${task.id}" ondragstart="onDragStart(event,'${task.id}')" ondragend="onDragEnd(event)">`;
  const isCollapsed = collapsedTaskIds.has(task.id);
  html += `<span class="task-row__toggle" data-action="toggleChildren" data-stop data-arg0="${task.id}" data-pass-el>${hasKids ? (isCollapsed ? '&#9654;' : '&#9660;') : '&nbsp;'}</span>`;
  html += `<span class="${iconClass}" data-action="toggleDone" data-stop data-arg0="${task.id}">${iconContent}</span>`;
  const trClient = getTaskClient(task);
  if (trClient) html += clientBadgeHtml(trClient);
  html += itemTypeBadgeHtml(task);
  const prereqBlocked = task.status !== 'Done' && getIncompletePrereqs(task).length > 0;
  if (prereqBlocked) html += `<span style="color:var(--warning);font-size:0.7rem;flex-shrink:0" title="Has incomplete prerequisites">&#128274;</span>`;
  const isIncomplete = isTaskIncomplete(task);
  html += `<span class="task-row__title ${hasKids?'task-row__title--parent':''}">${esc(task.title)}</span>`;
  if (isIncomplete) html += `<span style="color:var(--danger);font-size:0.7rem;flex-shrink:0" title="Missing fields: ${!task.hoursEstimated?'hours ':''}${!task.priority?'priority ':''}${!task.assignees||task.assignees.length===0?'assignee ':''}${!task.dueDate?'due date':''}">&#9888;</span>`;
  html += `<div class="task-row__badges">`;
  if (task.priority) html += priorityBadgeHtml(task.priority);
  if (task.healthState) html += healthBadgeHtml(task.healthState);
  if (!isDone) html += statusBadgeHtml(task.status);
  html += `</div>`;
  if (task.dueDate) {
    const due = safeParseDate(task.dueDate);
    if (due) {
    const now = new Date(); now.setHours(0,0,0,0);
    const overdue = due < now && task.status !== 'Done';
    const dueSoon = !overdue && (due - now) <= 3*86400000 && task.status !== 'Done';
    const dueClass = overdue ? 'color:var(--danger)' : dueSoon ? 'color:var(--warning)' : 'color:var(--text-muted)';
    const dueLabel = due.toLocaleDateString('en-GB', {day:'numeric',month:'short'});
    html += `<span style="font-family:var(--font-mono);font-size:0.7rem;${dueClass};flex-shrink:0">${overdue?'&#9888; ':''}${dueLabel}</span>`;
    } // close if (due)
  }
  if (hrsStr) html += `<span class="task-row__hours">${hrsStr}</span>`;
  if (task.assignees && task.assignees.length > 0) html += `<span class="task-row__assignee">${esc(task.assignees[0])}</span>`;
  html += `</div>`;

  if (hasKids) {
    html += `<div class="task-children ${isCollapsed ? 'hidden' : ''}" id="children_${task.id}" ondragover="onDragOver(event,'${task.id}')" ondragleave="onDragLeave(event)" ondrop="onDrop(event,'${task.id}')">`;
    // Performance: skip rendering children of collapsed nodes entirely (lazy render)
    if (!isCollapsed) {
      children.forEach(c => { html += renderTaskRow(c, depth + 1, filtered, visibleIds); });
    }
    html += `</div>`;
  }

  return html;
}

/** Toggle a task between Done and In progress status */
function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  // Hard-block: cannot mark Done if prerequisites are incomplete
  if (task.status !== 'Done') {
    const blockers = getIncompletePrereqs(task);
    if (blockers.length > 0) {
      toast(`Cannot complete "${task.title}" — ${blockers.length} prerequisite${blockers.length > 1 ? 's' : ''} not done: ${blockers.map(b => b.title).join(', ')}`, 'warning');
      return;
    }
  }
  task.status = task.status === 'Done' ? 'In progress' : 'Done';
  task.updatedAt = new Date().toISOString();
  markDirty(id);
  save(); renderSidebarCounts(); renderContent();
}

/** Toggle visibility of a task's children in the tree view */
function toggleChildren(id, el) {
  const wrap = document.getElementById('children_' + id);
  if (!wrap) return;
  const hidden = wrap.classList.toggle('hidden');
  if (hidden) {
    collapsedTaskIds.add(id);
  } else {
    collapsedTaskIds.delete(id);
    // Lazy render: if children container is empty, render them now
    if (wrap.innerHTML.trim() === '') {
      const task = tasks.find(t => t.id === id);
      if (task) {
        const children = getChildren(task.id);
        const depth = getDepth(task);
        let childHtml = '';
        children.forEach(c => { childHtml += renderTaskRow(c, depth + 1, tasks); });
        wrap.innerHTML = childHtml;
      }
    }
  }
  el.innerHTML = hidden ? '&#9654;' : '&#9660;';
}

/** Toggle a client group header without full re-render (performance optimisation) */
function toggleClientGroup(clientKey) {
  const wrap = document.getElementById('clientgroup_' + clientKey);
  if (!wrap) { // fallback: full re-render
    collapsedTaskIds.has(clientKey) ? collapsedTaskIds.delete(clientKey) : collapsedTaskIds.add(clientKey);
    renderContent();
    return;
  }
  const isHidden = wrap.classList.toggle('hidden');
  if (isHidden) {
    collapsedTaskIds.add(clientKey);
  } else {
    collapsedTaskIds.delete(clientKey);
    // Lazy render: populate children if empty
    if (wrap.innerHTML.trim() === '') {
      const clientName = wrap.getAttribute('data-client-name') || clientKey.replace('client_', '');
      const rootTasks = tasks.filter(t => !t.parentId && (t.client || getTaskClient(t) || 'Unassigned') === clientName);
      let childHtml = '';
      rootTasks.forEach(r => { childHtml += renderTaskRow(r, 1, tasks); });
      wrap.innerHTML = childHtml;
    }
  }
  // Update toggle arrow in the header
  const header = wrap.previousElementSibling;
  if (header) {
    const toggle = header.querySelector('.task-client-header__toggle');
    if (toggle) toggle.innerHTML = isHidden ? '&#9654;' : '&#9660;';
  }
}

/** Calculate the nesting depth of a task in the hierarchy */
function getDepth(task) {
  let depth = 0;
  let current = task;
  while (current && current.parentId) {
    depth++;
    current = tasks.find(t => t.id === current.parentId);
  }
  return depth;
}

// ==================== BULK OPERATIONS ====================

/** Set a field (status/priority/health) on all selected tasks after confirmation */
async function bulkSetField(field, value) {
  if (selectedTaskIds.size === 0) return;
  const count = selectedTaskIds.size;
  if (!(await themedConfirm(`Set ${field} to "${value}" on ${count} item${count>1?'s':''}?`))) return;

  let applied = 0, blocked = 0;
  selectedTaskIds.forEach(id => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    // Hard-block: skip items with incomplete prerequisites when setting to Done
    if (field === 'status' && value === 'Done' && getIncompletePrereqs(task).length > 0) {
      blocked++;
      return;
    }
    task[field] = value; task.updatedAt = new Date().toISOString(); markDirty(id);
    applied++;
  });
  save();
  selectedTaskIds.clear();
  renderSidebarCounts(); renderContent();
  if (blocked > 0) {
    toast(`${applied} item${applied!==1?'s':''} updated, ${blocked} skipped (incomplete prerequisites)`, 'warning');
  } else {
    toast(`${applied} item${applied!==1?'s':''} updated`);
  }
}

/** Delete all selected tasks after confirmation */
async function bulkDelete() {
  if (selectedTaskIds.size === 0) return;
  const count = selectedTaskIds.size;
  if (!(await themedConfirm(`Delete ${count} item${count>1?'s':''}? This cannot be undone.`))) return;
  selectedTaskIds.forEach(id => {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx >= 0) { tasks.splice(idx, 1); markDeleted(id); }
  });
  save();
  selectedTaskIds.clear();
  renderSidebarCounts(); renderContent();
  toast(`${count} item${count>1?'s':''} deleted`);
}

// ==================== TREE VIEW DRAG AND DROP ====================

let draggedTaskId = null;

/** Begin dragging a task row -- sets transfer data and applies drag styling */
function onDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskId);
  // Delay to let the drag image render before applying style
  setTimeout(() => {
    const el = document.querySelector(`[data-task-id="${taskId}"]`);
    if (el) el.classList.add('dragging');
  }, 0);
}

/** Clean up drag styling when a tree drag ends */
function onDragEnd(e) {
  document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.querySelectorAll('.drag-target').forEach(el => el.classList.remove('drag-target'));
  draggedTaskId = null;
}

/** Allow drop if the target is not the dragged task or one of its descendants */
function onDragOver(e, targetParentId) {
  if (!draggedTaskId || draggedTaskId === targetParentId) return;
  // Don't allow dropping onto own descendants
  const desc = getDescendants(draggedTaskId);
  if (desc.some(d => d.id === targetParentId)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  // Highlight the drop target
  const container = e.currentTarget;
  container.classList.add('drag-over');
}

/** Remove drag-over highlight when cursor leaves a drop target */
function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

/** Handle drop -- reparent the dragged task under the target, inherit client from new root */
function onDrop(e, targetParentId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!draggedTaskId || draggedTaskId === targetParentId) return;
  // Don't allow dropping onto own descendants
  const desc = getDescendants(draggedTaskId);
  if (desc.some(d => d.id === targetParentId)) return;

  const task = tasks.find(t => t.id === draggedTaskId);
  if (!task) return;

  // Enforce item type hierarchy: only allow valid parent-child type combinations
  const targetTask = targetParentId ? tasks.find(t => t.id === targetParentId) : null;
  if (targetTask) {
    const allowedChild = VALID_CHILD_TYPE[getItemType(targetTask)];
    if (!allowedChild) { toast(`A ${getItemTypeLabel(targetTask)} cannot have children`, 'warning'); draggedTaskId = null; return; }
    if (getItemType(task) !== allowedChild) { toast(`A ${getItemTypeLabel(task)} cannot be placed under a ${getItemTypeLabel(targetTask)}. Expected: ${ITEM_TYPE_META[allowedChild].label}`, 'warning'); draggedTaskId = null; return; }
  } else {
    // Dropping at root — only projects allowed
    if (getItemType(task) !== 'project') { toast(`Only Projects can exist at the root level`, 'warning'); draggedTaskId = null; return; }
  }

  const oldParent = task.parentId ? tasks.find(t => t.id === task.parentId) : null;
  task.parentId = targetParentId;
  task.updatedAt = new Date().toISOString();
  markDirty(draggedTaskId);

  // Inherit client from new root ancestor
  const newRoot = getRootAncestor(task);
  if (newRoot.client && !task.client) task.client = '';

  save(); renderSidebarCounts(); renderContent();
  toast(`Moved "${task.title}" under "${targetTask ? targetTask.title : 'root'}"`);
  draggedTaskId = null;
}

// Also allow dropping on parent task rows directly (not just their children container)
document.addEventListener('dragover', function(e) {
  if (!draggedTaskId) return;
  const row = e.target.closest('.task-row');
  if (!row) return;
  const targetId = row.dataset.taskId;
  if (!targetId || targetId === draggedTaskId) return;
  const desc = getDescendants(draggedTaskId);
  if (desc.some(d => d.id === targetId)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  // Highlight
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  row.classList.add('drag-over');
});

document.addEventListener('drop', function(e) {
  if (!draggedTaskId) return;
  const row = e.target.closest('.task-row');
  if (!row) return;
  const targetId = row.dataset.taskId;
  if (!targetId || targetId === draggedTaskId) return;
  const desc = getDescendants(draggedTaskId);
  if (desc.some(d => d.id === targetId)) return;
  e.preventDefault();
  row.classList.remove('drag-over');

  const task = tasks.find(t => t.id === draggedTaskId);
  if (!task) return;
  task.parentId = targetId;
  task.updatedAt = new Date().toISOString();
  markDirty(draggedTaskId);
  save(); renderSidebarCounts(); renderContent();
  const targetTask = tasks.find(t => t.id === targetId);
  toast(`Moved "${task.title}" under "${targetTask ? targetTask.title : 'root'}"`);
  draggedTaskId = null;
});

// ==================== BOARD DRAG AND DROP ====================

let boardDraggedTaskId = null;
let _pendingBoardDropPosition = null;

/** Begin dragging a Kanban board card */
function onBoardCardDragStart(e, taskId) {
  boardDraggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskId);
  setTimeout(() => {
    const el = e.target.closest('.board-card');
    if (el) el.classList.add('dragging');
  }, 0);
}

/** Clean up drag styling when a board card drag ends */
function onBoardCardDragEnd(e) {
  document.querySelectorAll('.board-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.board__lane-body.drag-over').forEach(el => el.classList.remove('drag-over'));
  boardDraggedTaskId = null;
}

/** Allow drop on a board lane — show drop indicator between cards */
function onBoardDragOver(e) {
  if (!boardDraggedTaskId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const lane = e.currentTarget;
  lane.classList.add('drag-over');
  // Show drop indicator between cards
  const cards = [...lane.querySelectorAll('.board-card:not(.dragging)')];
  lane.querySelectorAll('.board-drop-indicator').forEach(d => d.remove());
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = e.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const indicator = document.createElement('div');
  indicator.className = 'board-drop-indicator';
  if (afterCard) lane.insertBefore(indicator, afterCard);
  else lane.appendChild(indicator);
}

/** Remove highlight and indicator when cursor leaves a board lane */
function onBoardDragLeave(e) {
  if (e.currentTarget.contains(e.relatedTarget)) return;
  e.currentTarget.classList.remove('drag-over');
  e.currentTarget.querySelectorAll('.board-drop-indicator').forEach(d => d.remove());
}

/** Handle board drop -- status changes route through updateTask (sync pipeline with
 *  conflict detection), position changes use direct PATCH (server-side reorderInGroup). */
async function onBoardDrop(e) {
  e.preventDefault();
  const lane = e.currentTarget;
  lane.classList.remove('drag-over');
  lane.querySelectorAll('.board-drop-indicator').forEach(d => d.remove());
  if (!boardDraggedTaskId) return;
  const laneStatuses = lane.dataset.laneStatuses;
  if (!laneStatuses) return;
  const task = tasks.find(t => t.id === boardDraggedTaskId);
  if (!task) return;

  const cards = [...lane.querySelectorAll('.board-card:not(.dragging)')];
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = e.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const dropIdx = afterCard ? cards.indexOf(afterCard) : cards.length;

  const newStatus = laneStatuses.split(',')[0];
  const statusChanged = task.status !== newStatus;
  const positionChanged = (task.position || 0) !== dropIdx;

  if (!statusChanged && !positionChanged) { boardDraggedTaskId = null; return; }

  const taskId = boardDraggedTaskId;
  boardDraggedTaskId = null;

  if (!statusChanged) {
    task.position = dropIdx;
    task.updatedAt = new Date().toISOString();
    renderContent();
    await _patchBoardPosition(taskId, dropIdx);
    return;
  }

  // Blocked requires the popup workflow; store pending position for saveMarkAsBlocked
  if (newStatus === 'Blocked' && task.status !== 'Blocked') {
    if (positionChanged) _pendingBoardDropPosition = { taskId, position: dropIdx };
    openMarkAsBlockedPopup(taskId);
    renderContent();
    return;
  }

  // All other status changes go through updateTask for safety checks,
  // undo support, and the sync pipeline (conflict detection via _serverUpdatedAt)
  const oldStatus = task.status;
  await updateTask(taskId, 'status', newStatus);

  if (task.status === oldStatus) return;

  if (positionChanged) await _patchBoardPosition(taskId, dropIdx);
}

/** PATCH position to the server so reorderInGroup shifts siblings, then reload */
async function _patchBoardPosition(taskId, position) {
  try {
    const resp = await authFetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position }),
    });
    if (!resp.ok) toast('Failed to set position', 'error');
    if (typeof load === 'function') await load();
    renderContent();
  } catch (err) {
    toast('Failed to set position', 'error');
    if (typeof load === 'function') await load();
    renderContent();
  }
}

// ==================== DETAIL PANEL ====================

/** Open a task detail. On wide screens (>1024px) in the Projects view this
 *  uses the inline split panel; at tablet/mobile the inline panel stacks
 *  below the task list and the header gets pushed below the fold, so we
 *  route to the overlay panel instead (which is viewport-aware and works
 *  at every size).
 *  Preserves scroll position of the actual scrolling element (.tasks-layout__main)
 *  which gets destroyed and recreated by renderContent. */
/** Jump from My Work → Projects tree view, expanding ancestors and scrolling
 *  the target task into view (bug 1d3d811e). Without this, clicking a My Work
 *  item would land on Projects with everything collapsed. */
function navigateToTaskInTree(taskId) {
  // Expand every ancestor so the target row is actually rendered
  let cursor = tasks.find(t => t.id === taskId);
  while (cursor && cursor.parentId) {
    collapsedTaskIds.delete(cursor.parentId);
    cursor = tasks.find(t => t.id === cursor.parentId);
  }
  // Also expand the client group header (it's keyed by clientGroupKey)
  if (cursor) {
    try { collapsedTaskIds.delete(clientGroupKey(cursor)); } catch (e) {}
  }
  // Force "By Project" (tree) sub-view so the hierarchical rows exist in the
  // DOM — board/gantt/calendar views don't render .task-row elements.
  taskSubView = 'tree';
  localStorage.setItem('nbi_task_subview', 'tree');
  switchView('tasks');
  openDetail(taskId);
  // Two frames: first lets renderContent rebuild the DOM, second scrolls.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const row = document.querySelector(`.task-row[data-task-id="${taskId}"]`);
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

function openDetail(id) {
  activeDetailTaskId = id;
  // At ≤1024px the layout is stacked; inline panel is unusable. Use overlay.
  const isWideEnough = window.innerWidth > 1024;
  if (currentView === 'tasks' && isWideEnough) {
    // Capture scroll from the real scrollable element BEFORE re-render destroys it
    const oldMain = document.querySelector('.tasks-layout__main');
    const savedScroll = oldMain ? oldMain.scrollTop : 0;
    inlineDetailVisible = true;
    renderContent();
    // Restore scroll on the newly-created .tasks-layout__main synchronously
    const newMain = document.querySelector('.tasks-layout__main');
    if (newMain) newMain.scrollTop = savedScroll;
    return;
  }
  openDetailOverlay(id);
}

/** Open the full-screen detail overlay for a task -- properties, time tracking, notes, deps, comments */
function openDetailOverlay(id) {
  // Preserve scroll position — opening the fixed overlay + auto-sizing textareas
  // caused the dashboard scroll to reset when standup items were clicked (bug 420ee3b6).
  const _savedScrollY = window.scrollY;
  const _savedMainScroll = (document.getElementById('mainContent') || {}).scrollTop || 0;
  activeDetailTaskId = id;
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (!_leadsConfig && !task.parentId) loadLeadsConfig().then(() => { if (activeDetailTaskId === id) openDetailOverlay(id); });
  const panel = document.getElementById('detailPanel');
  const children = getChildren(id);
  const hrs = aggHours(id);
  const isRoot = !task.parentId;

  // Incomplete marker for detail panel
  const dpIncomplete = isTaskIncomplete(task);
  const dpMissingFields = dpIncomplete ? [!task.hoursEstimated?'Hours estimated':'', !task.priority?'Priority':'', !task.assignees||task.assignees.length===0?'Assignee':'', !task.dueDate?'Due date':'', !task.client?'Client':'', (task.description||'').trim().length < 15 ? 'Description (min 15 chars)' : ''].filter(Boolean) : [];

  let html = `<div class="detail-panel__resize" onmousedown="startPanelResize(event,'detailPanel')"></div>`;
  html += `<div class="detail-panel__header"><input class="detail-panel__title-input" value="${esc(task.title)}" onchange="updateTask('${id}','title',this.value);this.closest('.detail-panel__header').querySelector('.detail-panel__title-input').value=this.value" onkeydown="if(event.key==='Enter')this.blur()"><button class="detail-panel__close" data-action="closeDetail" aria-label="Close detail panel">&times;</button></div>`;
  html += `<div class="detail-panel__body">`;

  // Incomplete warning banner
  if (dpIncomplete) {
    html += `<div style="background:color-mix(in srgb, var(--danger) 12%, transparent);border:1px solid var(--danger);border-radius:var(--radius-md);padding:var(--space-sm) var(--space-md);margin-bottom:var(--space-md);display:flex;align-items:flex-start;gap:var(--space-sm)">`;
    html += `<span style="color:var(--danger);font-size:1.1rem;line-height:1">&#9888;</span>`;
    html += `<div style="font-size:0.78rem;color:var(--danger)"><strong>Incomplete task</strong><br>Missing: ${dpMissingFields.join(', ')}</div>`;
    html += `</div>`;
  }

  // Properties — Type, Name, Client, editable fields
  const dpClient = getTaskClient(task);
  html += `<div class="detail-section"><div class="detail-section__title">Properties</div>`;
  html += `<div class="detail-field"><span class="detail-field__label">Type</span><div style="display:flex;align-items:center;gap:6px">${itemTypeBadgeHtml(task)} <span style="font-size:0.82rem;color:var(--text-primary)">${getItemTypeLabel(task)}</span></div></div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="detail-title">Name</label><input id="detail-title" value="${esc(task.title)}" onchange="updateTask('${id}','title',this.value)" onkeydown="if(event.key==='Enter')this.blur()"></div>`;
  if (dpClient) {
    html += `<div class="detail-field"><span class="detail-field__label field-required">Client</span><div style="display:flex;align-items:center;gap:6px">${clientBadgeHtml(dpClient)} <span style="font-size:0.82rem;color:var(--text-primary)">${esc(dpClient)}</span></div></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label field-required" for="detail-client">Client</label><select id="detail-client" onchange="if(!this.value){this.value='${escAttrJs(task.client||'')}';toast('Every item must belong to a client.','warning');return;}updateTask('${id}','client',this.value)"><option value="" disabled>${task.client ? '' : '-- Select Client --'}</option>${getContractedClients().map(o => `<option value="${esc(o)}" ${(task.client||'')=== o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  }
  // Team — read-only derived from the task's client/SoW. If the project's
  // client (or specific SoW) belongs to a team, surface it here so people
  // know who they're working with.
  const dpClientObj = dpClient ? _apiClientsCache[dpClient] : null;
  const dpTeam = findTeamForClientOrSow(dpClientObj?.id, task.sow_id);
  if (dpTeam) {
    const teamSwatch = dpTeam.colour ? `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${esc(dpTeam.colour)};margin-right:4px;vertical-align:middle"></span>` : '';
    html += `<div class="detail-field"><span class="detail-field__label">Team</span><div style="display:flex;align-items:center;gap:6px"><a href="#" data-action="openTeamDetailModal" data-prevent data-arg0="${dpTeam.id}" style="font-size:0.82rem;color:var(--accent-text);text-decoration:none">${teamSwatch}${esc(dpTeam.name)}</a></div></div>`;
  }
  html += detailSelect('Status', 'status', task.status, STATUSES, true);
  html += detailSelect('Priority', 'priority', task.priority || '', ['', ...PRIORITIES], true);
  html += detailSelect('Health', 'healthState', task.healthState || '', ['', ...HEALTH_STATES]);
  html += `<div class="detail-field"><span class="detail-field__label">Assignee</span>${assigneeSelectHtml(id, task.assignees)}</div>`;
  // Practice (Phase 9, a6c82c8c). Same semantics as the inline panel —
  // unset means "inherit from parent project" for the sidebar filter.
  // Read both camelCase (sync/load) and snake_case (REST) for compatibility.
  html += (function() {
    const cur = task.practiceArea || task.practice_area || '';
    return `<div class="detail-field"><label class="detail-field__label" for="detail-practice">Practice</label><select id="detail-practice" onchange="updateTask('${id}','practiceArea',this.value||null)"><option value="">-- Inherit / None --</option>${PRACTICES.map(p => `<option value="${esc(p.value)}" ${cur === p.value ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>`;
  })();
  html += (function() {
    if (task.parentId) return '';
    const cur = task.workType || '';
    const config = _leadsConfig;
    const opts = config && config.fieldOptions
      ? (config.fieldOptions.work_type || []).map(o => typeof o === 'string' ? o : o.value)
      : [];
    return `<div class="detail-field"><label class="detail-field__label" for="detail-workType">Work Type</label><select id="detail-workType" onchange="updateTask('${id}','workType',this.value||null)"><option value="">-- None --</option>${opts.map(v => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`;
  })();
  html += `<div class="detail-field"><label class="detail-field__label" for="detail-startDate">Start Date</label><input id="detail-startDate" type="date" value="${task.startDate||''}" onchange="updateTask('${id}','startDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="detail-endDate">End Date</label><input id="detail-endDate" type="date" value="${task.endDate||''}" onchange="updateTask('${id}','endDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="detail-dueDate">Due Date</label><input id="detail-dueDate" type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
  html += `</div>`;

  // Time Tracking (quick log + entries)
  html += `<div class="detail-section"><div class="detail-section__title">Time Tracking</div>`;
  if (children.length > 0) html += `<div class="detail-agg">${hrs.spent.toFixed(1)}h spent / ${hrs.est.toFixed(1)}h estimated (${hrs.est > 0 ? Math.round(hrs.spent/hrs.est*100) : 0}%)</div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="detail-hoursEstimated">Hours Est.</label><input id="detail-hoursEstimated" type="number" step="0.5" min="0" value="${task.hoursEstimated||0}" onchange="updateTask('${id}','hoursEstimated',parseFloat(this.value)||0)"></div>`;
  // Quick log entry
  html += `<div style="display:flex;gap:4px;align-items:center;margin-bottom:8px"><input id="logHours" type="number" step="0.25" min="0.25" placeholder="Hours" style="width:60px;padding:4px 6px;font-size:0.78rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><input id="logDesc" placeholder="What did you work on?" style="flex:1;padding:4px 6px;font-size:0.78rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><button class="btn btn--sm" data-action="logTimeEntry" data-arg0="${id}">Log</button></div>`;
  // Time entries list
  html += `<div id="timeEntriesList" style="max-height:150px;overflow-y:auto"><div style="color:var(--text-muted);font-size:0.7rem">Loading time entries...</div></div>`;
  html += `</div>`;

  // Description (split into three fields — Feature 5)
  html += `<div class="detail-section"><div class="detail-section__title field-required">Description of Work <span style="font-size:0.7rem;font-weight:400;color:var(--text-muted)">(min 15 characters)</span></div>`;
  html += `<div class="detail-field"><textarea placeholder="A clear, concise description of the work needed to complete this task." onchange="updateTask('${id}','description',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.description||'')}</textarea></div></div>`;
  html += `<div class="detail-section"><div class="detail-section__title">Collaborations</div>`;
  html += `<div class="detail-field"><textarea placeholder="If there are multiple people on the task, describe everyone's responsibilities." onchange="updateTask('${id}','collaborations',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.collaborations||'')}</textarea></div></div>`;
  html += `<div class="detail-section"><div class="detail-section__title">Success Factor</div>`;
  html += `<div class="detail-field"><textarea placeholder="What will we have accomplished or made by the completion of this task?" onchange="updateTask('${id}','successFactor',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.successFactor||'')}</textarea></div></div>`;

  // Repeat (Feature 2)
  html += renderRepeatSection(task);

  // Notes
  html += `<div class="detail-section"><div class="detail-section__title">Notes</div><div class="note-list">`;
  (task.notes||[]).forEach(n => { html += `<div class="note-item"><div class="note-item__time">${new Date(n.time).toLocaleString()}</div><div>${esc(n.text)}</div></div>`; });
  html += `</div><div class="note-input"><input id="noteInput" placeholder="Add a note..."><button class="btn btn--sm btn--primary" data-action="addNote" data-arg0="${id}">Add</button></div></div>`;

  // Attachments (universal system — works for tasks, projects, clients)
  html += renderAttachmentsSection('task', id);

  // Prerequisites (what must be done before this item)
  const deps = task.dependencies || [];
  const depTasks = deps.map(did => tasks.find(t => t.id === did)).filter(Boolean);
  const blockedByUndone = depTasks.filter(d => d.status !== 'Done');
  html += `<div class="detail-section"><div class="detail-section__title">Prerequisites ${blockedByUndone.length > 0 ? `<span style="color:var(--warning);font-size:0.7rem;font-weight:400">(${blockedByUndone.length} incomplete)</span>` : deps.length > 0 ? '<span style="color:var(--success);font-size:0.7rem;font-weight:400">All met</span>' : ''}</div>`;
  if (depTasks.length > 0) {
    depTasks.forEach(d => {
      const doneIcon = d.status === 'Done' ? '<span style="color:var(--success)">&#10003;</span>' : '<span style="color:var(--warning)">&#9679;</span>';
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:3px 0"><span>${doneIcon}</span>${itemTypeBadgeHtml(d)}<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--accent-text)" data-action="openDetailOverlay" data-arg0="${d.id}">${esc(d.title)}</span><span style="font-size:0.68rem;color:var(--text-muted)">${d.status}</span><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.7rem" data-action="removeDependency" data-arg0="${id}" data-arg1="${d.id}" title="Remove prerequisite">&times;</button></div>`;
    });
  } else {
    html += `<div style="color:var(--text-muted);font-size:0.78rem;padding:4px 0">No prerequisites</div>`;
  }
  html += `<div style="margin-top:6px"><select id="addDepSelect" style="font-size:0.78rem;padding:3px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);max-width:200px"><option value="">Add prerequisite...</option>${tasks.filter(t => t.id !== id && !deps.includes(t.id)).sort((a,b) => a.title.localeCompare(b.title)).slice(0,80).map(t => `<option value="${t.id}">${esc(t.title.substring(0,50))}</option>`).join('')}</select><button class="btn btn--sm" style="margin-left:4px" data-action="addDependency" data-arg0="${id}">Add</button></div>`;
  html += `</div>`;

  // Dependents (items waiting on this one — read-only reverse lookup)
  const dependents = getDependents(id);
  html += `<div class="detail-section"><div class="detail-section__title">Dependents ${dependents.length > 0 ? `<span style="font-size:0.7rem;font-weight:400;color:var(--text-muted)">(${dependents.length} item${dependents.length !== 1 ? 's' : ''} waiting)</span>` : ''}</div>`;
  if (dependents.length > 0) {
    dependents.forEach(d => {
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:3px 0">${itemTypeBadgeHtml(d)}<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--accent-text)" data-action="openDetailOverlay" data-arg0="${d.id}">${esc(d.title)}</span><span style="font-size:0.68rem;color:var(--text-muted)">${d.status}</span></div>`;
    });
  } else {
    html += `<div style="color:var(--text-muted);font-size:0.78rem;padding:4px 0">Nothing depends on this item</div>`;
  }
  html += `</div>`;

  // Comments / Activity Feed (API-backed)
  html += `<div class="detail-section"><div class="detail-section__title">Comments</div>`;
  html += `<div id="commentsList" style="max-height:250px;overflow-y:auto;margin-bottom:var(--space-md)"><div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">Loading comments...</div></div>`;
  html += `<div class="note-input"><input id="commentInput" placeholder="Add a comment..." onkeydown="if(event.key==='Enter')postComment('${id}')"><button class="btn btn--sm btn--primary" data-action="postComment" data-arg0="${id}">Post</button></div></div>`;

  // Children + add child button (overlay panel)
  const ovChildType = getAllowedChildType(task);
  if (children.length > 0 || ovChildType) {
    const ovChildLabel = getChildTypeLabel(task) || 'Children';
    html += `<div class="detail-section"><div class="detail-section__title">${ovChildLabel} (${children.length})</div>`;
    if (children.length > 0) {
      const ovChildDone = children.filter(c => c.status === 'Done').length;
      const ovChildPct = Math.round(ovChildDone / children.length * 100);
      html += `<div class="summary-progress"><div class="summary-progress__bar"><div class="summary-progress__fill" style="width:${ovChildPct}%;background:var(--success)"></div></div></div>`;
      html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">${ovChildDone}/${children.length} complete</div>`;
      children.forEach(c => {
        const icon = c.status === 'Done' ? '&#10003;' : c.status === 'In progress' ? '&#9654;' : '&#9675;';
        const cStyle = c.status === 'Done' ? 'color:var(--success)' : c.healthState === 'Blocked' ? 'color:var(--danger)' : '';
        html += `<div style="font-size:0.78rem;padding:3px 0;cursor:pointer;display:flex;align-items:center;gap:6px;${cStyle}" data-action="openDetailOverlay" data-arg0="${c.id}"><span>${icon}</span>${itemTypeBadgeHtml(c)} <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.title)}</span></div>`;
      });
    }
    if (ovChildType) {
      const ovChildMeta = ITEM_TYPE_META[ovChildType];
      html += `<button class="btn btn--sm btn--outline" data-action="addItem" data-arg0="${ovChildType}" data-arg1="${id}" style="margin-top:8px;font-size:0.72rem">+ Add ${ovChildMeta.label}</button>`;
    }
    html += `</div>`;
  }

  // Move / Reparent — filtered by valid parent type
  const requiredParentType = VALID_PARENT_TYPE[getItemType(task)];
  html += `<div class="detail-section"><div class="detail-section__title">Move Under</div>`;
  const currentParent = task.parentId ? tasks.find(t => t.id === task.parentId) : null;
  html += `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">Currently under: <strong>${currentParent ? esc(currentParent.title) : 'Root (top level)'}</strong></div>`;
  const descIds = new Set(getDescendants(id).map(d => d.id));
  if (requiredParentType) {
    // Only show items of the correct parent type
    const possibleParents = tasks.filter(t => t.id !== id && !descIds.has(t.id) && getItemType(t) === requiredParentType);
    html += `<select style="width:100%" onchange="reparentTask('${id}', this.value)"><option value="">-- Select a ${ITEM_TYPE_META[requiredParentType].label} --</option>`;
    possibleParents.sort((a, b) => a.title.localeCompare(b.title)).forEach(p => {
      const sel = task.parentId === p.id ? 'selected' : '';
      const client = getTaskClient(p);
      html += `<option value="${p.id}" ${sel}>${client ? clientPrefix(client) + ' - ' : ''}${esc(p.title)}</option>`;
    });
    html += `</select>`;
  } else {
    // Projects live at root — no move selector needed
    html += `<div style="font-size:0.8rem;color:var(--text-muted)">Projects are always at the root level.</div>`;
  }
  html += `</div>`;

  // Actions
  html += `<div class="detail-section"><div class="detail-section__title">Actions</div>`;
  html += `<button class="btn btn--danger" data-action="deleteTask" data-arg0="${id}" style="margin-top:12px">Delete ${getItemTypeLabel(task)}</button>`;
  html += `</div>`;

  html += `</div>`;
  panel.innerHTML = html;
  panel.classList.add('open');
  document.getElementById('detailOverlay').classList.add('open');
  // Auto-size description textareas to fit content
  setTimeout(() => { panel.querySelectorAll('textarea').forEach(ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }); }, 50);
  // Restore scroll — fixed overlay + textarea auto-resize can otherwise reset the dashboard scroll.
  requestAnimationFrame(() => {
    if (window.scrollY !== _savedScrollY) window.scrollTo(0, _savedScrollY);
    const mc = document.getElementById('mainContent');
    if (mc && mc.scrollTop !== _savedMainScroll) mc.scrollTop = _savedMainScroll;
  });
  // Load async content (attachments handled by renderAttachmentsSection's setTimeout)
  loadTimeEntries(id);
  loadComments(id);
}

/** Fetch and render the attachments list for a task from the API */
async function loadAttachments(taskId) {
  const el = document.getElementById('attachmentsList');
  if (!el) return;
  try {
    const files = await apiCall('/api/tasks/' + taskId + '/attachments');
    if (!files) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">Could not load</div>'; return; }
    if (files.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">No files attached</div>'; return; }
    el.innerHTML = files.map(f => {
      const sizeKB = Math.round(f.size_bytes / 1024);
      const sizeStr = sizeKB > 1024 ? (sizeKB/1024).toFixed(1) + 'MB' : sizeKB + 'KB';
      return `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:3px 0;border-bottom:1px solid var(--border-subtle)"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="#" data-action="downloadAttachment" data-prevent data-arg0="${esc(f.filename)}" data-arg1="${esc(f.original_name)}" style="color:var(--accent-text);text-decoration:none;cursor:pointer">${esc(f.original_name)}</a></span><span style="color:var(--text-muted);font-size:0.65rem">${sizeStr}</span><span style="color:var(--text-muted);font-size:0.65rem">${esc(f.uploaded_by)}</span><button class="btn btn--ghost btn--sm" data-action="deleteAttachmentUI" data-arg0="${taskId}" data-arg1="${f.id}" title="Delete" style="padding:0 4px;color:var(--text-muted)">&times;</button></div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">Unavailable</div>'; }
}

/** Upload a file attachment to a task via multipart form POST */
async function uploadAttachment(taskId) {
  const input = document.getElementById('attachFileInput');
  if (!input || !input.files || !input.files[0]) { toast('Select a file first'); return; }
  const formData = new FormData();
  formData.append('file', input.files[0]);
  try {
    toast('Uploading...');
    const resp = await fetch('/api/tasks/' + taskId + '/attachments', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    if (resp.ok) { toast('File uploaded'); loadAttachments(taskId); input.value = ''; }
    else { toast('Upload failed', 'error'); }
  } catch(e) { toast('Upload error: ' + e.message, 'error'); }
}

/** Download an attachment as a blob and trigger a browser save dialog */
async function downloadAttachment(filename, originalName) {
  try {
    const resp = await authFetch('/api/attachments/' + encodeURIComponent(filename));
    if (!resp.ok) { toast('Download failed', 'error'); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = originalName || filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) { toast('Download error: ' + e.message, 'error'); }
}

/** Preview a receipt inline — shows PDF in iframe or image directly */
async function previewReceipt(filename, originalName) {
  // Find the preview container by looking for one that's hidden
  const containers = document.querySelectorAll('[id^="receiptPreview_"]');
  // Toggle: hide all others, toggle the one matching this filename
  let targetContainer = null;
  containers.forEach(c => {
    if (c.style.display !== 'none' && c.dataset.filename === filename) {
      c.style.display = 'none';
      c.innerHTML = '';
      return;
    }
    if (c.dataset.filename === filename || (!c.dataset.filename && !targetContainer)) {
      targetContainer = c;
    }
    c.style.display = 'none';
    c.innerHTML = '';
  });
  if (!targetContainer) return;

  targetContainer.dataset.filename = filename;
  targetContainer.style.display = 'block';
  targetContainer.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:0.78rem">Loading preview...</div>';

  try {
    const resp = await authFetch('/api/attachments/' + encodeURIComponent(filename));
    if (!resp.ok) { targetContainer.innerHTML = '<div style="padding:12px;color:var(--text-muted)">Preview unavailable</div>'; return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const isPdf = (originalName || '').toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(originalName || '');

    if (isPdf) {
      targetContainer.innerHTML = `<iframe src="${url}" style="width:100%;height:400px;border:1px solid var(--border-default);border-radius:var(--radius-sm)"></iframe>`;
    } else if (isImage) {
      targetContainer.innerHTML = `<img src="${url}" style="max-width:100%;max-height:400px;border:1px solid var(--border-default);border-radius:var(--radius-sm)">`;
    } else {
      targetContainer.innerHTML = `<div style="padding:12px;color:var(--text-muted);font-size:0.78rem">Cannot preview this file type. <a href="#" data-action="downloadAttachment" data-prevent data-arg0="${esc(filename)}" data-arg1="${esc(originalName)}" style="color:var(--accent-text)">Download instead</a></div>`;
    }
  } catch(e) {
    targetContainer.innerHTML = '<div style="padding:12px;color:var(--text-muted)">Preview failed</div>';
  }
}

/** Delete an attachment after confirmation and refresh the list */
async function deleteAttachmentUI(taskId, attachmentId) {
  if (!(await themedConfirm('Delete this attachment?'))) return;
  try {
    const resp = await authFetch('/api/tasks/' + taskId + '/attachments/' + attachmentId, { method: 'DELETE' });
    if (resp.ok) { toast('Attachment deleted'); loadAttachments(taskId); }
    else { toast('Delete failed', 'error'); }
  } catch(e) { toast('Delete error', 'error'); }
}

/** Check if a task has incomplete prerequisites. Returns array of {id, title, status} or empty array. */
function getIncompletePrereqs(task) {
  if (!task.dependencies || task.dependencies.length === 0) return [];
  return task.dependencies
    .map(did => tasks.find(t => t.id === did))
    .filter(d => d && d.status !== 'Done')
    .map(d => ({ id: d.id, title: d.title, status: d.status }));
}

/** Check if adding depId as a prerequisite of taskId would create a prerequisite loop.
 *  Walks the dependency chain from depId to see if it eventually leads back to taskId. */
function wouldCreateCycle(taskId, depId) {
  const visited = new Set();
  /** Recursively walk dependencies to detect cycles */
  function walk(id) {
    if (id === taskId) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    const t = tasks.find(x => x.id === id);
    if (!t || !t.dependencies) return false;
    return t.dependencies.some(d => walk(d));
  }
  return walk(depId);
}

/** Get all tasks that depend on a given task (reverse lookup — this task is their prerequisite). */
function getDependents(taskId) {
  return tasks.filter(t => t.dependencies && t.dependencies.includes(taskId));
}

/** Add a dependency (prerequisite) to a task from the detail overlay dropdown */
function addDependency(taskId) {
  const sel = document.getElementById('addDepSelect');
  if (!sel || !sel.value) return;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  if (!task.dependencies) task.dependencies = [];
  if (task.dependencies.includes(sel.value)) return;
  // Prevent circular dependencies
  if (wouldCreateCycle(taskId, sel.value)) {
    toast('Cannot add — would create a prerequisite loop', 'warning');
    return;
  }
  task.dependencies.push(sel.value);
  updateTask(taskId, 'dependencies', task.dependencies);
  openDetailOverlay(taskId);
}

/** Remove a dependency link between two tasks */
function removeDependency(taskId, depId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.dependencies) return;
  task.dependencies = task.dependencies.filter(d => d !== depId);
  updateTask(taskId, 'dependencies', task.dependencies);
  openDetailOverlay(taskId);
}

/** Fetch and render the comments/activity feed for a task from the API */
async function loadComments(taskId) {
  const el = document.getElementById('commentsList');
  if (!el) return;
  try {
    const comments = await apiCall('/api/tasks/' + taskId + '/comments');
    if (!comments) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">Could not load comments</div>'; return; }
    if (comments.length === 0) {
      el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;padding:4px 0">No comments yet</div>';
      return;
    }
    el.innerHTML = comments.map(c => `<div class="note-item" style="border-left:2px solid var(--accent);padding-left:8px;margin-bottom:8px"><div class="note-item__time" style="display:flex;justify-content:space-between;align-items:center"><span><strong style="color:var(--text-primary)">${esc(c.author)}</strong> &middot; ${new Date(c.created_at).toLocaleString('en-GB', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div><div style="font-size:0.82rem;margin-top:2px">${esc(c.text)}</div></div>`).join('');
    el.scrollTop = el.scrollHeight;
  } catch(e) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">Comments unavailable</div>'; }
}

/** Post a new comment on a task via the API */
async function postComment(taskId) {
  const input = document.getElementById('commentInput');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = '';
  input.disabled = true;
  try {
    const resp = await authFetch('/api/tasks/' + taskId + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (resp.ok) {
      loadComments(taskId);
      toast('Comment posted');
    }
  } catch(e) { toast('Failed to post comment'); }
  input.disabled = false;
  input.focus();
}

/** Generate a labelled select dropdown for the overlay detail panel. Pass required=true to mark the label as mandatory. */
function detailSelect(label, field, value, options, required) {
  const cls = 'detail-field__label' + (required ? ' field-required' : '');
  const selId = `detail-${field}`;
  return `<div class="detail-field"><label class="${cls}" for="${selId}">${label}</label><select id="${selId}" onchange="updateTask('${activeDetailTaskId}','${field}',this.value)">${options.map(o => `<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o||'-- None --')}</option>`).join('')}</select></div>`;
}

/** Close the detail overlay panel */
function closeDetail() {
  document.getElementById('detailPanel').classList.remove('open');
  document.getElementById('detailOverlay').classList.remove('open');
  activeDetailTaskId = null;
  if (window._detailEscHandler) {
    document.removeEventListener('keydown', window._detailEscHandler);
    window._detailEscHandler = null;
  }
}

/** Install Escape-to-close handler when the task detail panel opens. */
(function installDetailEscape() {
  if (typeof window === 'undefined') return;
  const origOpen = window.openDetailOverlay;
  if (typeof origOpen !== 'function') {
    // openDetailOverlay defined later in file — defer install via document.addEventListener
    document.addEventListener('DOMContentLoaded', installDetailEscape);
    return;
  }
  window.openDetailOverlay = function(...args) {
    const result = origOpen.apply(this, args);
    if (window._detailEscHandler) document.removeEventListener('keydown', window._detailEscHandler);
    window._detailEscHandler = (e) => {
      if (e.key === 'Escape') {
        const panel = document.getElementById('detailPanel');
        if (panel && panel.classList.contains('open')) closeDetail();
      }
    };
    document.addEventListener('keydown', window._detailEscHandler);
    // Move focus to the panel for keyboard users
    setTimeout(() => {
      const titleInput = document.querySelector('#detailPanel .detail-panel__title-input');
      if (titleInput) titleInput.focus();
    }, 50);
    return result;
  };
})();

/** Resizable detail panels — drag left edge to widen/narrow */
function startPanelResize(e, panelId) {
  e.preventDefault();
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const handle = e.target;
  handle.classList.add('active');
  const startX = e.clientX;
  const startWidth = panel.offsetWidth;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  /** Handle mouse movement during panel resize — adjust width based on drag delta */
  function onMove(ev) {
    // Panel is on the right side, so dragging left = wider
    const delta = startX - ev.clientX;
    const newWidth = Math.max(240, Math.min(window.innerWidth * 0.8, startWidth + delta));
    panel.style.width = newWidth + 'px';
  }
  /** Finish panel resize — restore cursor and remove drag listeners */
  function onUp() {
    handle.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

/**
 * Update a single field on a task with undo support.
 * Includes safety checks: client change confirmation and dependency soft-block warning.
 */
async function updateTask(id, field, value) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  // Feature 6: Mark As Blocked popup. When the user changes status to "Blocked"
  // we open a popup to capture blocker details and notify internal owners.
  if (field === 'status' && value === 'Blocked' && task.status !== 'Blocked') {
    openMarkAsBlockedPopup(id);
    // Re-render so the dropdown reverts visually until popup completes
    renderContent();
    return;
  }

  // Feature 3: Cancelled cascade for projects
  if (field === 'status' && value === 'Cancelled' && getItemType(task) === 'project') {
    const descendants = getDescendants(id).filter(d => d.status !== 'Cancelled');
    if (descendants.length > 0) {
      if (!(await themedConfirm(`Cancelling this project will set ${descendants.length} child item${descendants.length > 1 ? 's' : ''} to Cancelled.\n\nContinue?`, 'Cancel Project'))) {
        renderContent();
        return;
      }
      // Apply cascade locally so the UI updates immediately; server applies the same cascade on PATCH/sync.
      descendants.forEach(d => { d.status = 'Cancelled'; d.updatedAt = new Date().toISOString(); markDirty(d.id); });
    }
  }

  // Client change confirmation
  if (field === 'client') {
    const oldClient = getTaskClient(task);
    if (oldClient && value && oldClient !== value) {
      if (!(await themedConfirm(`Warning: this will move "${task.title}" from ${oldClient} to ${value}. Are you sure?`))) {
        renderContent();
        return;
      }
    }
  }

  // Hard-block: cannot mark Done if prerequisites are incomplete (no override)
  if (field === 'status' && value === 'Done') {
    const blockers = getIncompletePrereqs(task);
    if (blockers.length > 0) {
      const names = blockers.map(b => `  \u2022 ${b.title} (${b.status})`).join('\n');
      await themedConfirm(`Cannot mark as Done \u2014 ${blockers.length} prerequisite${blockers.length > 1 ? 's' : ''} not complete:\n${names}\n\nComplete these first.`);
      renderContent();
      return;
    }
  }

  // Soft-block: warn if moving to "In progress" with incomplete prerequisites (can override)
  if (field === 'status' && value === 'In progress') {
    const blockers = getIncompletePrereqs(task);
    if (blockers.length > 0) {
      const names = blockers.map(b => `  \u2022 ${b.title} (${b.status})`).join('\n');
      if (!(await themedConfirm(`${blockers.length} prerequisite${blockers.length > 1 ? 's' : ''} not done:\n${names}\n\nStart anyway?`))) {
        renderContent();
        return;
      }
    }
  }

  const oldValue = task[field];
  task[field] = value;
  task.updatedAt = new Date().toISOString();
  markDirty(id);
  pushUndo(`${field} change on "${task.title}"`, () => { task[field] = oldValue; task.updatedAt = new Date().toISOString(); markDirty(id); });
  save();

  // Structural changes need a full re-render (task moves between sections).
  // Non-structural changes get a lightweight update — no scroll flash.
  const structural = (field === 'status' && (
    value === 'Done' || value === 'Cancelled' || oldValue === 'Done' || oldValue === 'Cancelled'
  )) || field === 'client_id' || field === 'parent_id';

  if (structural) {
    const scrollEl = document.querySelector('.main__content');
    const savedScroll = scrollEl ? scrollEl.scrollTop : 0;
    _scrollRestoreTarget = savedScroll > 0 ? savedScroll : null;
    renderContent();
    if (currentView !== 'dashboard' && scrollEl && savedScroll > 0) {
      requestAnimationFrame(() => { scrollEl.scrollTop = savedScroll; _scrollRestoreTarget = null; });
    }
  } else {
    // Lightweight: update metrics + sidebar, leave the DOM alone
    if (typeof standupRefreshMetrics === 'function') standupRefreshMetrics();
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
    // Update inline task row styling if status/health changed
    _updateTaskRowInPlace(id, field, value);
  }

  // Refresh the overlay detail panel if it's open for this task
  if (activeDetailTaskId === id && document.getElementById('detailPanel')?.classList.contains('open')) {
    openDetailOverlay(id);
  }
}

/** Update a task row's visual styling in place without re-rendering the whole page */
function _updateTaskRowInPlace(taskId, field, value) {
  // Update any visible select/input that shows this field for this task
  // (handles the case where the same task appears in multiple views)
  if (field === 'status') {
    document.querySelectorAll(`[data-task-id="${taskId}"] .task-status-badge, .task-row[data-id="${taskId}"] .task-row__status`).forEach(el => {
      if (el.tagName === 'SELECT') el.value = value;
      else el.textContent = value;
    });
  }
}

// ==================== REPEAT TASK SECTION (Feature 2) ====================

/** Render the Repeat section UI for the task detail panel */
function renderRepeatSection(task) {
  const rule = task.repeatRule || null;
  const enabled = !!rule;
  let html = `<div class="detail-section"><div class="detail-section__title">Repeat</div>`;
  html += `<label style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;margin-bottom:8px"><input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleRepeat('${task.id}', this.checked)"> Make this task repeating</label>`;
  if (enabled) {
    const ruleType = rule.type || 'daily';
    html += `<div class="detail-field"><label class="detail-field__label" for="detail-repeatFrequency">Frequency</label><select id="detail-repeatFrequency" onchange="setRepeatType('${task.id}', this.value)">`;
    ['daily', 'weekly', 'yearly'].forEach(t => {
      html += `<option value="${t}" ${ruleType === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`;
    });
    html += `</select></div>`;

    if (ruleType === 'weekly') {
      const days = Array.isArray(rule.daysOfWeek) ? rule.daysOfWeek : [];
      const labels = ['S','M','T','W','T','F','S'];
      html += `<div class="detail-field"><span class="detail-field__label">Days</span><div style="display:flex;gap:4px">`;
      labels.forEach((lab, i) => {
        const checked = days.includes(i);
        html += `<label style="display:inline-flex;flex-direction:column;align-items:center;font-size:0.7rem;cursor:pointer"><input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleRepeatDay('${task.id}', ${i}, this.checked)" style="margin:0">${lab}</label>`;
      });
      html += `</div></div>`;
    } else if (ruleType === 'yearly') {
      const dates = Array.isArray(rule.dates) ? rule.dates : [];
      html += `<div class="detail-field"><span class="detail-field__label">Dates</span><div style="display:flex;flex-direction:column;gap:4px">`;
      dates.forEach((d, idx) => {
        html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem"><span>${esc(d)}</span><button class="btn btn--ghost btn--sm" data-action="removeRepeatDate" data-arg0="${task.id}" data-arg1="${idx}" style="padding:0 6px">&times;</button></div>`;
      });
      html += `<div style="display:flex;gap:4px;margin-top:4px"><input type="date" id="addRepeatDate_${task.id}" style="font-size:0.78rem;padding:4px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><button class="btn btn--sm" data-action="addRepeatDate" data-arg0="${task.id}">Add date</button></div>`;
      html += `</div></div>`;
    } else {
      html += `<div style="font-size:0.72rem;color:var(--text-muted);padding:4px 0">A new instance will be created the day after the task is marked Done or Cancelled.</div>`;
    }
  }
  html += `</div>`;
  return html;
}

/** Toggle whether a task is a repeating task */
function toggleRepeat(taskId, on) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  if (on) {
    task.repeatRule = task.repeatRule || { type: 'daily' };
  } else {
    task.repeatRule = null;
  }
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  save();
  if (activeDetailTaskId === taskId && document.getElementById('detailPanel')?.classList.contains('open')) openDetailOverlay(taskId);
  else renderContent();
}

/** Set the repeat rule type (daily/weekly/yearly), preserving existing day/date config where possible */
function setRepeatType(taskId, type) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const existing = task.repeatRule || {};
  if (type === 'daily') task.repeatRule = { type: 'daily' };
  else if (type === 'weekly') task.repeatRule = { type: 'weekly', daysOfWeek: existing.daysOfWeek || [] };
  else if (type === 'yearly') task.repeatRule = { type: 'yearly', dates: existing.dates || [] };
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  save();
  if (activeDetailTaskId === taskId && document.getElementById('detailPanel')?.classList.contains('open')) openDetailOverlay(taskId);
}

/** Toggle a single day-of-week in a weekly repeat rule */
function toggleRepeatDay(taskId, dayIdx, on) {
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.repeatRule || task.repeatRule.type !== 'weekly') return;
  const days = new Set(task.repeatRule.daysOfWeek || []);
  if (on) days.add(dayIdx); else days.delete(dayIdx);
  task.repeatRule.daysOfWeek = [...days].sort((a,b) => a - b);
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  save();
}

/** Add a date to a yearly repeat rule */
function addRepeatDate(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.repeatRule || task.repeatRule.type !== 'yearly') return;
  const input = document.getElementById('addRepeatDate_' + taskId);
  if (!input || !input.value) return;
  const dates = new Set(task.repeatRule.dates || []);
  dates.add(input.value);
  task.repeatRule.dates = [...dates].sort();
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  save();
  if (activeDetailTaskId === taskId && document.getElementById('detailPanel')?.classList.contains('open')) openDetailOverlay(taskId);
}

/** Remove a date from a yearly repeat rule */
function removeRepeatDate(taskId, idx) {
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.repeatRule || task.repeatRule.type !== 'yearly') return;
  const dates = task.repeatRule.dates || [];
  const numIdx = typeof idx === 'string' ? parseInt(idx, 10) : idx;
  task.repeatRule.dates = dates.filter((_, i) => i !== numIdx);
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  save();
  if (activeDetailTaskId === taskId && document.getElementById('detailPanel')?.classList.contains('open')) openDetailOverlay(taskId);
}

// ==================== MARK AS BLOCKED POPUP (Feature 6) ====================

let _markAsBlockedTaskId = null;

/** Open the Mark As Blocked popup for a task. Pre-fills the header and date. */
function openMarkAsBlockedPopup(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  _markAsBlockedTaskId = taskId;

  // Build header: [Client] - [SoW title] "Task Name" Owner: [Owner name]
  const client = getTaskClient(task) || 'No Client';
  // Walk up the tree to find a SoW or top-level project for context
  let parentTitle = '';
  let walker = task.parentId ? tasks.find(t => t.id === task.parentId) : null;
  while (walker) {
    const wType = getItemType(walker);
    if (wType === 'sow' || wType === 'project') { parentTitle = walker.title; break; }
    walker = walker.parentId ? tasks.find(t => t.id === walker.parentId) : null;
  }
  const owner = (task.assignees && task.assignees.length > 0) ? task.assignees.join(', ') : 'Unassigned';
  const headerEl = document.getElementById('blockerHeaderInfo');
  if (headerEl) headerEl.innerHTML = `<strong>${esc(client)}</strong>${parentTitle ? ' &mdash; ' + esc(parentTitle) : ''} &nbsp; "${esc(task.title)}" &nbsp; <span style="color:var(--text-muted)">Owner: ${esc(owner)}</span>`;

  // Pre-fill from existing blocker_info if present (re-blocking)
  const existing = task.blockerInfo || {};
  document.getElementById('blockerBlockedOn').value = existing.blockedOn || '';
  document.getElementById('blockerToUnblock').value = existing.toUnblock || '';
  document.getElementById('blockerDate').value = existing.dateBlocked || new Date().toISOString().slice(0, 10);
  const internalChk = document.getElementById('blockerInternalChk');
  const externalChk = document.getElementById('blockerExternalChk');
  internalChk.checked = Array.isArray(existing.internal) && existing.internal.length > 0;
  externalChk.checked = Array.isArray(existing.external) && existing.external.length > 0;
  document.getElementById('blockerInternalNames').value = (existing.internal || []).join(', ');
  document.getElementById('blockerExternalNames').value = (existing.external || []).join(', ');
  document.getElementById('blockerInternalRow').style.display = internalChk.checked ? 'flex' : 'none';
  document.getElementById('blockerExternalRow').style.display = externalChk.checked ? 'flex' : 'none';
  document.getElementById('blockerError').style.display = 'none';

  document.getElementById('blockerModal').classList.add('open');
  setTimeout(() => document.getElementById('blockerBlockedOn').focus(), 50);
}

/** Toggle visibility of the internal/external nametag input rows */
function toggleBlockerType(which) {
  const chk = document.getElementById(which === 'internal' ? 'blockerInternalChk' : 'blockerExternalChk');
  const row = document.getElementById(which === 'internal' ? 'blockerInternalRow' : 'blockerExternalRow');
  row.style.display = chk.checked ? 'flex' : 'none';
}

/** Cancel the Mark As Blocked popup without saving */
function cancelMarkAsBlocked() {
  document.getElementById('blockerModal').classList.remove('open');
  _pendingBoardDropPosition = null;
  _markAsBlockedTaskId = null;
}

/** Save the popup data, set status=Blocked, and notify internal owners (server-side) */
function saveMarkAsBlocked() {
  const taskId = _markAsBlockedTaskId;
  if (!taskId) return;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const blockedOn = document.getElementById('blockerBlockedOn').value.trim();
  const toUnblock = document.getElementById('blockerToUnblock').value.trim();
  const dateBlocked = document.getElementById('blockerDate').value || new Date().toISOString().slice(0, 10);
  const internalChk = document.getElementById('blockerInternalChk').checked;
  const externalChk = document.getElementById('blockerExternalChk').checked;
  const internal = internalChk ? document.getElementById('blockerInternalNames').value.split(',').map(s => s.trim()).filter(Boolean) : [];
  const external = externalChk ? document.getElementById('blockerExternalNames').value.split(',').map(s => s.trim()).filter(Boolean) : [];
  const errEl = document.getElementById('blockerError');
  errEl.style.display = 'none';

  if (!blockedOn) { errEl.textContent = 'Please enter what the task is blocked on.'; errEl.style.display = 'block'; return; }
  if (!internalChk && !externalChk) { errEl.textContent = 'Select at least one type (Internal or External).'; errEl.style.display = 'block'; return; }
  if (internalChk && internal.length === 0) { errEl.textContent = 'Enter at least one internal person.'; errEl.style.display = 'block'; return; }
  if (externalChk && external.length === 0) { errEl.textContent = 'Enter the external party.'; errEl.style.display = 'block'; return; }
  if (!toUnblock) { errEl.textContent = 'Please describe what is needed to unblock.'; errEl.style.display = 'block'; return; }

  const blockerInfo = { blockedOn, internal, external, toUnblock, dateBlocked };

  // Apply locally and queue for sync (server picks this up via sync/changes and sends notifications)
  const oldStatus = task.status;
  const oldInfo = task.blockerInfo;
  task.status = 'Blocked';
  task.blockerInfo = blockerInfo;
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  pushUndo(`Mark "${task.title}" as Blocked`, () => { task.status = oldStatus; task.blockerInfo = oldInfo; task.updatedAt = new Date().toISOString(); markDirty(taskId); });
  save();
  document.getElementById('blockerModal').classList.remove('open');
  _markAsBlockedTaskId = null;
  toast('Task marked as Blocked' + (internal.length > 0 ? ` — ${internal.length} owner${internal.length > 1 ? 's' : ''} notified` : ''));
  renderContent();
  if (activeDetailTaskId === taskId && document.getElementById('detailPanel')?.classList.contains('open')) {
    openDetailOverlay(taskId);
  }
  if (_pendingBoardDropPosition && _pendingBoardDropPosition.taskId === taskId) {
    const pos = _pendingBoardDropPosition;
    _pendingBoardDropPosition = null;
    _patchBoardPosition(pos.taskId, pos.position);
  }
}

/** Add a timestamped note to a task from the overlay detail panel input */
function addNote(id) {
  const input = document.getElementById('noteInput');
  if (!input || !input.value.trim()) return;
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (!task.notes) task.notes = [];
  task.notes.push({ time: new Date().toISOString(), text: input.value.trim() });
  task.updatedAt = new Date().toISOString();
  markDirty(id);
  save();
  openDetail(id);
}

/** Move a task under a new parent (or to root if newParentId is empty). Enforces item type hierarchy. */
function reparentTask(id, newParentId) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  // Enforce hierarchy rules
  if (newParentId) {
    const newParent = tasks.find(t => t.id === newParentId);
    if (newParent) {
      const allowedChild = VALID_CHILD_TYPE[getItemType(newParent)];
      if (!allowedChild || getItemType(task) !== allowedChild) {
        toast(`A ${getItemTypeLabel(task)} cannot be placed under a ${getItemTypeLabel(newParent)}`, 'warning'); return;
      }
    }
  } else if (getItemType(task) !== 'project') {
    toast(`Only Projects can exist at the root level`, 'warning'); return;
  }
  task.parentId = newParentId || null;
  task.updatedAt = new Date().toISOString();
  markDirty(id);
  save(); renderSidebarCounts(); renderContent();
  openDetail(id);
  const newParent = newParentId ? tasks.find(t => t.id === newParentId) : null;
  toast(`Moved "${task.title}" to ${newParent ? newParent.title : 'root'}`);
}

/** Delete an item and all its descendants after confirmation with cascade warning */
async function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const typeLabel = getItemTypeLabel(task);
  const descendants = getDescendants(id);
  let msg = `Delete this ${typeLabel}?`;
  // Feature 2: extra warning for repeating tasks
  if (task.repeatRule) {
    msg = `Delete Repeating Task?\n\nThis will delete all future versions of this task.\n\nAre you sure?`;
  } else if (getItemType(task) === 'project') {
    // Feature 3: project deletion shows the all-items warning
    msg = `Delete Project?\n\nThis will delete all items in the project${descendants.length > 0 ? ` (${descendants.length} child item${descendants.length > 1 ? 's' : ''})` : ''}.\n\nAll artifacts and time tracking will be lost. This cannot be undone.\n\nAre you sure?`;
  } else if (descendants.length > 0) {
    const counts = {};
    descendants.forEach(d => { const dt = getItemType(d); counts[dt] = (counts[dt] || 0) + 1; });
    const parts = ITEM_TYPE_ORDER.filter(t => counts[t]).map(t => `${counts[t]} ${counts[t] === 1 ? ITEM_TYPE_META[t].label.toLowerCase() : ITEM_TYPE_META[t].plural.toLowerCase()}`);
    msg = `Removing this ${typeLabel.toLowerCase()} will delete everything underneath it:\n${parts.join(', ')}.\n\nAll artifacts and time tracking will be lost. This cannot be undone.\n\nAre you sure?`;
  }
  if (!(await themedConfirm(msg))) return;
  const toRemove = new Set([id, ...descendants.map(d => d.id)]);
  toRemove.forEach(rid => markDeleted(rid));
  tasks = tasks.filter(t => !toRemove.has(t.id));
  // Clean up stale dependency references: remove deleted IDs from other tasks' prerequisites
  tasks.forEach(t => {
    if (t.dependencies && t.dependencies.some(d => toRemove.has(d))) {
      t.dependencies = t.dependencies.filter(d => !toRemove.has(d));
      markDirty(t.id);
    }
  });
  save(); closeDetail(); renderSidebarCounts(); renderContent();
  toast(`${typeLabel} deleted`);
}

/** Create a new task/item object with all default fields. Shared factory for addTask, addItem, quickAddTask. */
function createTaskObject(overrides) {
  const now = new Date().toISOString();
  return {
    id: uid(), title: 'New Item', parentId: null, itemType: 'task', client: '',
    status: 'Not started', priority: '', healthState: '', description: '',
    assignees: [], hoursEstimated: 0, hoursSpent: 0,
    dueDate: '', startDate: '', endDate: '', dependencies: [],
    notes: [], createdAt: now, updatedAt: now,
    ...overrides,
  };
}

/** Create a new project at root level and open its detail panel (header + button default action) */
function addTask() {
  const client = currentFilter.client || '';
  if (!client) { toast('Select a client first — every project must belong to a client.', 'warning'); return; }
  const t = createTaskObject({ title: 'New Project', itemType: 'project', client });
  tasks.push(t);
  markDirty(t.id);
  save(); renderSidebarCounts(); renderContent();
  openDetail(t.id);
}

/** Toggle the + New dropdown menu */
function toggleAddItemMenu(e) {
  e.stopPropagation();
  const dd = document.getElementById('addItemMenuDropdown');
  if (!dd) return;
  const open = dd.style.display !== 'none';
  dd.style.display = open ? 'none' : '';
  if (!open) document.addEventListener('click', closeAddItemMenu, { once: true });
}
/** Close the + New dropdown menu */
function closeAddItemMenu() {
  const dd = document.getElementById('addItemMenuDropdown');
  if (dd) dd.style.display = 'none';
}
function addItemFromMenu(type) { closeAddItemMenu(); if (type === 'project') addItem('project'); else showAddItemPicker(type); }
function overflowPrint() { printReport(); toggleHeaderOverflow(); }
function overflowReport() { openBugReportModal(); toggleHeaderOverflow(); }
function overflowTheme(e) { toggleThemeDropdown(e); toggleHeaderOverflow(); }

/** Create a new item of a given type under an optional parent. Opens its detail panel. */
function addItem(type, parentId) {
  const meta = ITEM_TYPE_META[type] || ITEM_TYPE_META.task;
  const parent = parentId ? tasks.find(t => t.id === parentId) : null;
  const client = parent ? getTaskClient(parent) : (currentFilter.client || '');
  if (!client) { toast('Select a client first — every item must belong to a client.', 'warning'); return; }
  const t = createTaskObject({ title: `New ${meta.label}`, parentId: parentId || null, itemType: type, client });
  tasks.push(t);
  markDirty(t.id);
  save(); renderSidebarCounts(); renderContent();
  openDetail(t.id);
}

/** Show a modal to pick a parent before creating an item of a given type */
function showAddItemPicker(type) {
  const parentType = VALID_PARENT_TYPE[type];
  if (!parentType) { addItem(type, null); return; }
  const parents = tasks.filter(t => getItemType(t) === parentType).sort((a, b) => a.title.localeCompare(b.title));
  if (parents.length === 0) {
    toast(`No ${ITEM_TYPE_META[parentType].plural} exist yet. Create a ${ITEM_TYPE_META[parentType].label} first.`, 'warning');
    return;
  }
  let html = `<div class="modal-overlay open" id="addItemPickerModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-sm)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h2 style="margin:0">New ${ITEM_TYPE_META[type].label}</h2>
        <button class="btn btn--ghost" data-action="_actModalRemove" data-arg0="addItemPickerModal">&times;</button>
      </div>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:12px">Select a ${ITEM_TYPE_META[parentType].label} to create this ${ITEM_TYPE_META[type].label} under:</p>
      <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border-default);border-radius:var(--radius-sm)">`;
  parents.forEach(p => {
    const clientBadge = p.client ? clientBadgeHtml(p.client) : '';
    html += `<div class="picker-row" data-action="_actAddItemFromPicker" data-arg0="${type}" data-arg1="${p.id}">
      ${clientBadge} ${itemTypeBadgeHtml(p)} <span>${esc(p.title)}</span>
    </div>`;
  });
  html += `</div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  _activateDynamicModal('addItemPickerModal');
}

/** Quick-add a project by title from the inline input bar */
function quickAddTask(title) {
  const client = document.getElementById('quickAddClient')?.value || currentFilter.client || '';
  if (!client) { toast('Select a client first — every project must belong to a client.', 'warning'); return; }
  const assignees = currentFilter.assignee ? [currentFilter.assignee] : [];
  const t = createTaskObject({ title, itemType: 'project', client, assignees });
  tasks.push(t);
  markDirty(t.id);
  save();
  toast(`Project "${title}" created`);
  renderSidebarCounts(); renderContent();
  // Re-focus the quick-add input
  setTimeout(() => { const input = document.getElementById('quickAddInput'); if (input) input.focus(); }, 100);
}


// --- Window registrations for event delegation ---
window.renderTaskView = renderTaskView;
window.renderTreeView = renderTreeView;
window.renderBoardView = renderBoardView;
window.renderCalendarView = renderCalendarView;
window.renderGanttView = renderGanttView;
window.renderClientSummary = renderClientSummary;
window.renderInlineTaskDetail = renderInlineTaskDetail;
window.openDetail = openDetail;
window.openDetailOverlay = openDetailOverlay;
window.closeDetail = closeDetail;
window.addItem = addItem;
window.addItemFromMenu = addItemFromMenu;
window.showAddItemPicker = showAddItemPicker;
window.addTask = addTask;
window.quickAddTask = quickAddTask;
window.updateTask = updateTask;
window.deleteTask = deleteTask;
window.toggleDone = toggleDone;
window.toggleChildren = toggleChildren;
window.toggleClientGroup = toggleClientGroup;
window.collapseAll = collapseAll;
window.expandToLevel = expandToLevel;
window.navigateToTaskInTree = navigateToTaskInTree;
window.reparentTask = reparentTask;
window.addDependency = addDependency;
window.removeDependency = removeDependency;
window.getDependents = getDependents;
window.getIncompletePrereqs = getIncompletePrereqs;
window.wouldCreateCycle = wouldCreateCycle;
window.bulkDelete = bulkDelete;
window.bulkSetField = bulkSetField;
window.onDragStart = onDragStart;
window.onDragOver = onDragOver;
window.onDragLeave = onDragLeave;
window.onDrop = onDrop;
window.onDragEnd = onDragEnd;
window.onBoardCardDragStart = onBoardCardDragStart;
window.onBoardDragOver = onBoardDragOver;
window.onBoardDragLeave = onBoardDragLeave;
window.onBoardDrop = onBoardDrop;
window.onBoardCardDragEnd = onBoardCardDragEnd;
window.renderCalendarView = renderCalendarView;
window.loadCalendarEvents = loadCalendarEvents;
window.loadCapacityEvents = loadCapacityEvents;
window.computeDaysOff = computeDaysOff;
window.calExpandDay = calExpandDay;
window.openCalendarEventModal = openCalendarEventModal;
window.openCalendarEventDetail = openCalendarEventDetail;
window.submitCalendarEvent = submitCalendarEvent;
window.deleteCalendarEventFromModal = deleteCalendarEventFromModal;
window.renderGanttView = renderGanttView;
window.ganttSelectBar = ganttSelectBar;
window.toggleGanttCollapse = toggleGanttCollapse;
window.toggleGanttDepMenu = toggleGanttDepMenu;
window.closeGanttDepMenu = closeGanttDepMenu;
window.selectGanttArrow = selectGanttArrow;
window.deselectGanttArrow = deselectGanttArrow;
window.startArrowRedrag = startArrowRedrag;
window.ganttBarDragStart = ganttBarDragStart;
window.ganttBarDragMove = ganttBarDragMove;
window.ganttBarDragEnd = ganttBarDragEnd;
window.ganttLinkDragStart = ganttLinkDragStart;
window.ganttColResizeStart = ganttColResizeStart;
window.postComment = postComment;
window.loadComments = loadComments;
window.loadAttachments = loadAttachments;
window.uploadAttachment = uploadAttachment;
window.deleteAttachmentUI = deleteAttachmentUI;
window.downloadAttachment = downloadAttachment;
window.addNote = addNote;
window.addNoteInline = addNoteInline;
window.detailSelect = detailSelect;
window.inlineDetailSelect = inlineDetailSelect;
window.renderRepeatSection = renderRepeatSection;
window.toggleRepeat = toggleRepeat;
window.setRepeatType = setRepeatType;
window.addRepeatDate = addRepeatDate;
window.removeRepeatDate = removeRepeatDate;
window.toggleRepeatDay = toggleRepeatDay;
window.openMarkAsBlockedPopup = openMarkAsBlockedPopup;
window.cancelMarkAsBlocked = cancelMarkAsBlocked;
window.saveMarkAsBlocked = saveMarkAsBlocked;
window.toggleBlockerType = toggleBlockerType;
window.startPanelResize = startPanelResize;
window.toggleAddItemMenu = toggleAddItemMenu;
window.closeAddItemMenu = closeAddItemMenu;
window.filterByPractice = filterByPractice;
window.overflowPrint = overflowPrint;
window.overflowReport = overflowReport;
window.overflowTheme = overflowTheme;
window.logTimeEntry = logTimeEntry;
window.previewReceipt = previewReceipt;
window._updateTaskRowInPlace = _updateTaskRowInPlace;
window.openTeamDetailModal = openTeamDetailModal;

registerView('tasks', renderTaskView);
