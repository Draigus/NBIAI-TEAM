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
    .sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.title.localeCompare(b.title));
  html += '<div class="tasks-view">';
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
    <button class="btn btn--sm ${currentFilter.incomplete ? 'btn--danger' : 'btn--outline'}" data-action="_actToggleFilterIncomplete" style="font-size:0.75rem;padding:3px 10px" title="Show only tasks with missing fields">&#9888; Incomplete</button>
    ${currentFilter.assignee && currentFilter.assignee.length > 0 ? `<span class="filter-chip" style="font-size:0.75rem">${currentFilter.assignee.map(a => esc(a)).join(', ')} <button data-action="_actClearFilterAssignee" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:0 2px">&times;</button></span>` : ''}
    ${!inlineDetailVisible ? '<button class="btn btn--outline" data-action="_actSetInlineDetail" data-arg0="true" style="font-size:0.75rem;padding:3px 10px" title="Show detail panel">&#9776; Detail</button>' : ''}
    <div class="batch-actions">${selectedTaskIds.size > 0 ? `
      <span style="font-size:0.75rem;color:var(--accent);font-weight:600">${selectedTaskIds.size} selected</span>
      <select onchange="if(this.value){bulkSetField('status',this.value);this.value=''}"><option value="">Set Status...</option>${STATUSES.map(s=>`<option>${s}</option>`).join('')}</select>
      <select onchange="if(this.value){bulkSetField('priority',this.value);this.value=''}"><option value="">Set Priority...</option>${PRIORITIES.map(p=>`<option>${p}</option>`).join('')}</select>
      <select onchange="if(this.value){bulkSetField('healthState',this.value);this.value=''}"><option value="">Set Health...</option>${HEALTH_STATES.map(h=>`<option>${h}</option>`).join('')}</select>
      <button class="btn btn--sm btn--danger" data-action="bulkDelete">Delete</button>
      <button class="btn btn--sm" data-action="_actClearSelectedTasks">Clear</button>
    ` : ''}</div>
  </div>`;

  // Combined sub-controls row: Show buttons (board only) + quick-add + filter pills
  const hasFilter = currentFilter.client || (currentFilter.status && currentFilter.status.length > 0) || (currentFilter.health && currentFilter.health.length > 0) || currentFilter.project || (currentFilter.assignee && currentFilter.assignee.length > 0) || currentFilter.incomplete || currentFilter.overdue;
  html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-sm);flex-wrap:wrap">`;
  if (taskSubView === 'board') {
    html += `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
      <span style="font-size:0.75rem;color:var(--text-muted)">Show:</span>
      <button class="btn btn--sm ${!_boardTypeFilter?'btn--primary':''}" data-action="_actSetBoardTypeFilter" data-arg0="null" style="font-size:0.75rem;padding:2px 8px">All</button>
      ${ITEM_TYPE_ORDER.map(type => '<button class="btn btn--sm '+(_boardTypeFilter===type?'btn--primary':'')+'" data-action="_actSetBoardTypeFilter" data-arg0="'+type+'" style="font-size:0.75rem;padding:2px 8px">'+ITEM_TYPE_META[type].plural+'</button>').join('')}
    </div>`;
  }
  html += `<div class="quick-add-bar" style="display:flex;gap:4px;align-items:center;flex-shrink:0">
    <select id="quickAddType" style="padding:3px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.75rem">
      ${ITEM_TYPE_ORDER.map(t => '<option value="'+t+'">'+ITEM_TYPE_META[t].label+'</option>').join('')}
    </select>
    <input type="text" id="quickAddInput" placeholder="Quick add... (Enter)" style="width:160px;flex:none;padding:3px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.75rem;min-width:0" onkeydown="if(event.key==='Enter'&&this.value.trim()){quickAddTask(this.value.trim());this.value=''}">
    <select id="quickAddClient" style="padding:3px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.75rem">
      <option value="" style="color:var(--danger)">Select Client…</option>${getContractedClients().map(c => '<option value="'+esc(c)+'" '+(currentFilter.client===c?'selected':'')+'>'+esc(c)+'</option>').join('')}
    </select>
  </div>`;
  if (hasFilter) {
    html += `<div style="display:flex;align-items:center;gap:4px;margin-left:auto;flex-shrink:0">`;
    if (currentFilter.client) html += `<span class="filter-chip" style="font-size:0.75rem;margin:0">${esc(currentFilter.client)} <button data-action="_actClearFilterClientBreadcrumb">&times;</button></span>`;
    if (currentFilter.project) { const pt = tasks.find(t => t.id === currentFilter.project); html += `<span class="filter-chip" style="font-size:0.75rem;margin:0">${esc(pt ? pt.title : 'Project')} <button data-action="_actClearFilterProjectBreadcrumb">&times;</button></span>`; }
    if (currentFilter.status && currentFilter.status.length > 0) html += `<span class="filter-chip" style="font-size:0.75rem;margin:0">${currentFilter.status.join(', ')} <button data-action="_actClearFilterStatusBreadcrumb">&times;</button></span>`;
    if (currentFilter.health && currentFilter.health.length > 0) html += `<span class="filter-chip" style="font-size:0.75rem;margin:0">${currentFilter.health.join(', ')} <button data-action="_actClearFilterHealthBreadcrumb">&times;</button></span>`;
    if (currentFilter.overdue) html += `<span class="filter-chip" style="font-size:0.75rem;margin:0;background:var(--danger-bg);color:var(--danger)">Overdue <button data-action="_actClearFilterOverdueBreadcrumb">&times;</button></span>`;
    if (currentFilter.incomplete) html += `<span class="filter-chip" style="font-size:0.75rem;margin:0">Incomplete <button data-action="_actClearFilterIncompleteBreadcrumb">&times;</button></span>`;
    html += `<button class="filter-chip-clear" style="font-size:0.75rem" data-action="_actResetFiltersBreadcrumb">Clear all</button>`;
    html += `</div>`;
  }
  html += `</div>`;

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
  html += '</div>'; // close tasks-view
  el.innerHTML = html;
  if (activeDetailTaskId) setTimeout(() => loadTimeEntriesInline(activeDetailTaskId), 50);
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
  const hasAssigneeFilter = (currentFilter.sort === 'assignee' || (currentFilter.assignee && currentFilter.assignee.length > 0));
  const hasSearchFilter = !!currentFilter.search;
  if ((hasAssigneeFilter || hasSearchFilter) && filtered.length < tasks.length) {
    visibleIds = new Set(filtered.map(t => t.id));
    filtered.forEach(t => {
      let cursor = tasks.find(p => p.id === t.parentId);
      while (cursor) {
        visibleIds.add(cursor.id);
        cursor = tasks.find(p => p.id === cursor.parentId);
      }
    });
  }
  _treeVisibleIds = visibleIds;

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
        const bucketRoots = sowBuckets.get(sid).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        const sow = sid !== '__nosow__' ? _sowsCache.find(s => s.id === sid) : null;
        const sowLabel = sow ? sow.title : 'No Statement of Work';
        const sowKey = `sow_${clientKey}_${sid}`;
        const sowCollapsed = collapsedTaskIds.has(sowKey);
        if (!skipSowHeader) {
          html += `<div class="task-sow-group" style="margin-left:24px;margin-top:4px">`;
          html += `<div class="task-sow-header" data-action="toggleClientGroup" data-arg0="${sowKey}" style="cursor:pointer;display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:0.78rem;color:var(--text-secondary);border-left:2px solid var(--border-subtle)">`;
          html += `<span style="font-size:0.75rem">${sowCollapsed ? '&#9654;' : '&#9660;'}</span>`;
          html += `<span style="font-weight:600">${esc(sowLabel)}</span>`;
          html += `<span style="color:var(--text-muted);font-size:0.75rem">${bucketRoots.length} project${bucketRoots.length !== 1 ? 's' : ''}</span>`;
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
  let html = '';
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
      html += '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.82rem;font-style:italic">No items</div>';
    } else {
      cappedTasks.forEach(t => { html += renderBoardCard(t); });
      if (laneTotal > BOARD_LANE_CAP) html += `<div style="text-align:center;padding:8px;cursor:pointer" onclick="currentFilter.status='${col.statuses[0]}';switchView('tasks');setSubView('tree')"><span style="color:var(--accent-text);font-size:0.78rem;text-decoration:underline">+${laneTotal - BOARD_LANE_CAP} more — view in tree</span></div>`;
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
      html += `<div style="padding:8px 12px;font-size:0.75rem;color:var(--text-muted);text-align:center;border-top:1px solid var(--border-subtle)">Showing ${CANCELLED_CAP} of ${cancelled.length} cancelled tickets</div>`;
    }
    html += '</div></div>';
  }

  return html;
}

/** Render a single draggable card for the Kanban board view */
function renderBoardCard(task) {
  const hasKids = getChildren(task.id).length > 0;
  const isBlocked = task.healthState === 'Blocked';
  const isRed = task.healthState === 'Red';
  const isOverdue = task.dueDate && task.status !== 'Done' && task.status !== 'Cancelled' && safeParseDate(task.dueDate) < ((() => { const n = new Date(); n.setHours(0,0,0,0); return n; })());
  const isCancelled = task.status === 'Cancelled';
  let cls = 'board-card';
  if (isBlocked || isRed || isOverdue) cls += ' board-card--blocked';
  if (hasKids && !isBlocked && !isRed && !isOverdue) cls += ' board-card--parent';
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
  if (bcIncomplete) html += `<span style="color:var(--danger);font-size:0.75rem;font-weight:700;display:inline-flex;align-items:center;gap:2px" title="Missing: ${bcMissing}">&#9888;</span>`;
  const bcPrereqBlocked = task.status !== 'Done' && getIncompletePrereqs(task).length > 0;
  if (bcPrereqBlocked) html += `<span style="color:var(--warning);font-size:0.75rem" title="Has incomplete prerequisites">&#128274;</span>`;
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

