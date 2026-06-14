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
  const target = tasks.find(t => t.id === taskId);
  // Clear filters that might hide the target task
  if (target) {
    const taskClient = getTaskClient(target);
    if (taskClient) currentFilter.client = taskClient;
    currentFilter.assignee = [];
    currentFilter.search = '';
    currentFilter.status = [];
    currentFilter.health = [];
  }
  // Force tree sub-view and trigger initial collapse
  taskSubView = 'tree';
  localStorage.setItem('nbi_task_subview', 'tree');
  switchView('tasks');
  // AFTER switchView triggers _tasksInitialCollapse (which collapses everything),
  // expand the target's ancestors so the item is visible
  let cursor = target;
  while (cursor && cursor.parentId) {
    collapsedTaskIds.delete(cursor.parentId);
    cursor = tasks.find(t => t.id === cursor.parentId);
  }
  if (cursor) {
    try { collapsedTaskIds.delete(clientGroupKey(cursor)); } catch (e) {}
  }
  // Re-render with ancestors expanded, then scroll to target
  renderContent();
  openDetail(taskId);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const row = document.querySelector(`.task-row[data-task-id="${taskId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('task-row--highlight');
        setTimeout(() => row.classList.remove('task-row--highlight'), 2500);
      }
    });
  });
}

function openDetail(id) {
  if (_calDepMode && currentView === 'tasks' && taskSubView === 'calendar') {
    calDepSelectTask(id);
    return;
  }
  activeDetailTaskId = id;
  _pushEntityHash('task', id);
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
  const dpMissingFields = dpIncomplete ? [!task.hoursEstimated?'Hours estimated':'', !task.priority?'Priority':'', !task.assignees||task.assignees.length===0?'Assignee':'', !task.dueDate?'Due date':'', !task.client?'Client':''].filter(Boolean) : [];

  let html = `<div class="detail-panel__resize" onmousedown="startPanelResize(event,'detailPanel')"></div>`;
  html += `<div class="detail-panel__header"><input class="detail-panel__title-input" value="${esc(task.title)}" oninput="_liveWrite('${id}','title',this.value)" onchange="updateTask('${id}','title',this.value);this.closest('.detail-panel__header').querySelector('.detail-panel__title-input').value=this.value" onkeydown="if(event.key==='Enter')this.blur()"><button class="detail-panel__close" data-action="closeDetail" aria-label="Close detail panel">&times;</button></div>`;
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
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="detail-title">Name</label><input id="detail-title" value="${esc(task.title)}" oninput="_liveWrite('${id}','title',this.value)" onchange="updateTask('${id}','title',this.value)" onkeydown="if(event.key==='Enter')this.blur()"></div>`;
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
  if (task.status === 'Blocked') html += blockerDetailBoxHtml(task, id);
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
  const _iType2 = getItemType(task);
  const _datesAuto2 = (_iType2 === 'feature' || _iType2 === 'story') && getChildren(task.id).length > 0;
  if (_datesAuto2) {
    const _range2 = computeDateRange(id);
    html += `<div class="detail-field"><label class="detail-field__label">Start Date</label><input type="date" value="${_range2.start}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label">Due Date</label><input type="date" value="${_range2.dueDate}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label">End Date</label><input type="date" value="${_range2.endDate}" disabled title="Set when all children are complete"></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label" for="detail-startDate">Start Date</label><input id="detail-startDate" type="date" value="${task.startDate||''}" onchange="updateTask('${id}','startDate',this.value)"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label" for="detail-endDate">End Date</label><input id="detail-endDate" type="date" value="${task.endDate||''}" onchange="updateTask('${id}','endDate',this.value)"></div>`;
  }
  html += `<div class="detail-field"><label class="detail-field__label" for="detail-dueDate">Due Date</label><input id="detail-dueDate" type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
  html += renderRepeatSection(task);
  html += `</div>`;

  // Time Tracking (quick log + entries)
  html += `<div class="detail-section"><div class="detail-section__title">Time Tracking</div>`;
  if (hrs.est > 0) html += `<div class="detail-agg">${hrs.spent.toFixed(1)}h spent / ${hrs.est.toFixed(1)}h estimated (${Math.round(hrs.spent/hrs.est*100)}%)</div>`;
  if (children.length > 0) {
    html += `<div class="detail-field"><label class="detail-field__label">Hours Est.</label><input type="number" value="${hrs.est}" disabled title="Aggregated from ${children.length} child items"></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label field-required" for="detail-hoursEstimated">Hours Est.</label><input id="detail-hoursEstimated" type="number" step="0.5" min="0" value="${task.hoursEstimated||0}" onchange="updateTask('${id}','hoursEstimated',parseFloat(this.value)||0)"></div>`;
  }
  // Quick log entry
  html += `<div style="display:flex;gap:4px;align-items:center;margin-bottom:8px"><input id="logHours" type="number" step="0.25" min="0.25" placeholder="Hours" style="width:60px;padding:4px 6px;font-size:0.78rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><input id="logDesc" placeholder="What did you work on?" style="flex:1;padding:4px 6px;font-size:0.78rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><button class="btn btn--sm" data-action="logTimeEntry" data-arg0="${id}">Log</button></div>`;
  // Time entries list
  html += `<div id="timeEntriesList" style="max-height:150px;overflow-y:auto"><div style="color:var(--text-muted);font-size:0.75rem">Loading time entries...</div></div>`;
  html += `</div>`;

  // Description (split into three fields — Feature 5)
  html += `<div class="detail-section"><div class="detail-section__title field-required">Description of Work <span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">(min 15 characters)</span></div>`;
  html += `<div class="detail-field"><textarea placeholder="A clear, concise description of the work needed to complete this task." onchange="updateTask('${id}','description',this.value)" oninput="_liveWrite('${id}','description',this.value);this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.description||'')}</textarea></div></div>`;
  html += `<div class="detail-section"><div class="detail-section__title">Collaborations</div>`;
  html += `<div class="detail-field"><textarea placeholder="If there are multiple people on the task, describe everyone's responsibilities." onchange="updateTask('${id}','collaborations',this.value)" oninput="_liveWrite('${id}','collaborations',this.value);this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.collaborations||'')}</textarea></div></div>`;
  html += `<div class="detail-section"><div class="detail-section__title">Success Factor</div>`;
  html += `<div class="detail-field"><textarea placeholder="What will we have accomplished or made by the completion of this task?" onchange="updateTask('${id}','successFactor',this.value)" oninput="_liveWrite('${id}','successFactor',this.value);this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.successFactor||'')}</textarea></div></div>`;

  // Notes
  html += `<div class="detail-section"><div class="detail-section__title">Notes</div><div class="note-list">`;
  (task.notes||[]).forEach((n, idx) => { html += `<div class="note-item"><div class="note-item__time" style="display:flex;justify-content:space-between;align-items:center"><span>${new Date(n.time).toLocaleString()}</span><a href="#" data-action="deleteNote" data-prevent data-arg0="${id}" data-arg1="${idx}" style="color:var(--danger);font-size:0.75rem">delete</a></div><div>${esc(n.text)}</div></div>`; });
  html += `</div><div class="note-input"><input id="noteInput" placeholder="Add a note..."><button class="btn btn--sm btn--primary" data-action="addNote" data-arg0="${id}">Add</button></div></div>`;

  // Attachments (universal system — works for tasks, projects, clients)
  html += renderAttachmentsSection('task', id);

  // Prerequisites (what must be done before this item)
  const deps = task.dependencies || [];
  const depTasks = deps.map(did => tasks.find(t => t.id === did)).filter(Boolean);
  const blockedByUndone = depTasks.filter(d => d.status !== 'Done');
  html += `<div class="detail-section"><div class="detail-section__title">Prerequisites ${blockedByUndone.length > 0 ? `<span style="color:var(--warning);font-size:0.75rem;font-weight:400">(${blockedByUndone.length} incomplete)</span>` : deps.length > 0 ? '<span style="color:var(--success);font-size:0.75rem;font-weight:400">All met</span>' : ''}</div>`;
  if (depTasks.length > 0) {
    depTasks.forEach(d => {
      const doneIcon = d.status === 'Done' ? '<span style="color:var(--success)">&#10003;</span>' : '<span style="color:var(--warning)">&#9679;</span>';
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:3px 0"><span>${doneIcon}</span>${itemTypeBadgeHtml(d)}<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--accent-text)" data-action="openDetailOverlay" data-arg0="${d.id}">${esc(d.title)}</span><span style="font-size:0.75rem;color:var(--text-muted)">${d.status}</span><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.75rem" data-action="removeDependency" data-arg0="${id}" data-arg1="${d.id}" title="Remove prerequisite">&times;</button></div>`;
    });
  } else {
    html += `<div style="color:var(--text-muted);font-size:0.78rem;padding:4px 0">No prerequisites</div>`;
  }
  html += `<div style="margin-top:6px"><select id="addDepSelect" style="font-size:0.78rem;padding:3px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);max-width:200px"><option value="">Add prerequisite...</option>${tasks.filter(t => t.id !== id && !deps.includes(t.id)).sort((a,b) => a.title.localeCompare(b.title)).slice(0,80).map(t => `<option value="${t.id}">${esc(t.title.substring(0,50))}</option>`).join('')}</select><button class="btn btn--sm" style="margin-left:4px" data-action="addDependency" data-arg0="${id}">Add</button></div>`;
  html += `</div>`;

  // Dependents (items waiting on this one — read-only reverse lookup)
  const dependents = getDependents(id);
  html += `<div class="detail-section"><div class="detail-section__title">Dependents ${dependents.length > 0 ? `<span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">(${dependents.length} item${dependents.length !== 1 ? 's' : ''} waiting)</span>` : ''}</div>`;
  if (dependents.length > 0) {
    dependents.forEach(d => {
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:3px 0">${itemTypeBadgeHtml(d)}<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--accent-text)" data-action="openDetailOverlay" data-arg0="${d.id}">${esc(d.title)}</span><span style="font-size:0.75rem;color:var(--text-muted)">${d.status}</span></div>`;
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
        const cStyle = c.status === 'Done' ? 'color:var(--purple)' : c.healthState === 'Blocked' ? 'color:var(--danger)' : '';
        html += `<div style="font-size:0.78rem;padding:3px 0;cursor:pointer;display:flex;align-items:center;gap:6px;${cStyle}" data-action="openDetailOverlay" data-arg0="${c.id}"><span>${icon}</span>${itemTypeBadgeHtml(c)} <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.title)}</span></div>`;
      });
    }
    if (ovChildType) {
      const ovChildMeta = ITEM_TYPE_META[ovChildType];
      html += `<button class="btn btn--sm btn--outline" data-action="addItem" data-arg0="${ovChildType}" data-arg1="${id}" style="margin-top:8px;font-size:0.75rem">+ Add ${ovChildMeta.label}</button>`;
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
  html += `<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn--outline" data-action="duplicateTask" data-arg0="${id}">Duplicate ${getItemTypeLabel(task)}</button>`;
  html += `<button class="btn btn--danger" data-action="deleteTask" data-arg0="${id}">Delete ${getItemTypeLabel(task)}</button></div>`;
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
      return `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:3px 0;border-bottom:1px solid var(--border-subtle)"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="#" data-action="downloadAttachment" data-prevent data-arg0="${esc(f.filename)}" data-arg1="${esc(f.original_name)}" style="color:var(--accent-text);text-decoration:none;cursor:pointer">${esc(f.original_name)}</a></span><span style="color:var(--text-muted);font-size:0.75rem">${sizeStr}</span><span style="color:var(--text-muted);font-size:0.75rem">${esc(f.uploaded_by)}</span><button class="btn btn--ghost btn--sm" data-action="deleteAttachmentUI" data-arg0="${taskId}" data-arg1="${f.id}" title="Delete" style="padding:0 4px;color:var(--text-muted)">&times;</button></div>`;
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
    const resp = await authFetch('/api/tasks/' + taskId + '/attachments', {
      method: 'POST',
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
    const myName = _currentUser?.displayName || _currentUser?.display_name || '';
    const isAdmin = _currentUser?.role === 'admin';
    el.innerHTML = comments.map(c => {
      const canDelete = (c.author === myName || isAdmin);
      const deleteBtn = canDelete ? ` <a href="#" data-action="deleteTaskComment" data-prevent data-arg0="${taskId}" data-arg1="${c.id}" style="color:var(--danger);font-size:0.75rem">delete</a>` : '';
      return `<div class="note-item" style="border-left:2px solid var(--accent);padding-left:8px;margin-bottom:8px"><div class="note-item__time" style="display:flex;justify-content:space-between;align-items:center"><span><strong style="color:var(--text-primary)">${esc(c.author)}</strong> &middot; ${new Date(c.created_at).toLocaleString('en-GB', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>${deleteBtn}</div><div style="font-size:0.82rem;margin-top:2px">${esc(c.text)}</div></div>`;
    }).join('');
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

async function deleteTaskComment(taskId, commentId) {
  if (!(await themedConfirm('Delete this comment?'))) return;
  const resp = await authFetch('/api/tasks/' + taskId + '/comments/' + commentId, { method: 'DELETE' });
  if (resp.ok) {
    loadComments(taskId);
    toast('Comment deleted');
  } else {
    toast('Failed to delete comment', 'error');
  }
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
  _clearEntityHash();
  _softReRender();
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

  if ((field === 'startDate' || field === 'endDate' || field === 'dueDate') && value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const yr = parseInt(value.slice(0, 4), 10);
    if (yr < 1000) return;
    if (yr < 1900 || yr > 2099) {
      showToast('Invalid year — must be between 1900 and 2099', 'error');
      return;
    }
  }

  // When status changes away from Blocked, clear blocker details
  if (field === 'status' && task.status === 'Blocked' && value !== 'Blocked') {
    task.blockerInfo = null;
  }

  // When status changes to Blocked, show the blocker details popup first.
  // The popup's confirm handler calls updateTask again with the filled-in blockerInfo.
  if (field === 'status' && value === 'Blocked' && task.status !== 'Blocked') {
    if (!task.blockerInfo) task.blockerInfo = { blockedOn: '', internal: [], external: [], toUnblock: '', dateBlocked: new Date().toISOString().slice(0, 10) };
    openMarkAsBlockedPopup(id);
    return;
  }

  // Blocked cascade: when blocked, cascade to descendants AND dependants (prerequisite chain)
  if (field === 'status' && value === 'Blocked') {
    const descendants = getDescendants(id).filter(d => d.status !== 'Blocked' && d.status !== 'Done' && d.status !== 'Cancelled');
    descendants.forEach(d => { d.status = 'Blocked'; d.updatedAt = new Date().toISOString(); markDirty(d.id); });
    const dependants = tasks.filter(t => Array.isArray(t.dependencies) && t.dependencies.includes(id) && t.status !== 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled');
    dependants.forEach(d => { d.status = 'Blocked'; d.updatedAt = new Date().toISOString(); markDirty(d.id); });
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

  // Auto-set endDate when marking Done; clear when un-Done
  let _prevEndDate;
  if (field === 'status') {
    _prevEndDate = task.endDate || '';
    if (value === 'Done') {
      task.endDate = new Date().toISOString().slice(0, 10);
    } else if (oldValue === 'Done') {
      task.endDate = '';
    }
  }

  pushUndo(`${field} change on "${task.title}"`, () => {
    task[field] = oldValue;
    if (_prevEndDate !== undefined) task.endDate = _prevEndDate;
    task.updatedAt = new Date().toISOString();
    markDirty(id);
  });
  save();

  // Upward activation roll-up (bug c2c2b046): any active status pulls every
  // 'Not started' ancestor up with it — INCLUDING projects (the old version
  // skipped projects, which is exactly what Glen reported: the project read
  // "Not started" while its stories were underway). Mirrors the server-side
  // cascade in routes/sync.js + lib/status-cascade.js so both converge:
  // child Planning -> ancestor Planning, anything stronger -> In progress.
  // Only 'Not started' ancestors are touched (manually set statuses survive).
  if (field === 'status' && ['Planning', 'In progress', 'In Review', 'Drafted'].includes(value)) {
    const ancestorTarget = value === 'Planning' ? 'Planning' : 'In progress';
    let parent = task.parentId ? tasks.find(t => t.id === task.parentId) : null;
    while (parent) {
      if (parent.status === 'Not started') {
        parent.status = ancestorTarget;
        parent.updatedAt = new Date().toISOString();
        markDirty(parent.id);
      }
      parent = parent.parentId ? tasks.find(t => t.id === parent.parentId) : null;
    }
  }

  const _dateChanged = field === 'startDate' || field === 'dueDate' || field === 'endDate'
    || (field === 'status' && (value === 'Done' || oldValue === 'Done'));
  if (_dateChanged) {
    let parent = task.parentId ? tasks.find(t => t.id === task.parentId) : null;
    while (parent) {
      const pt = getItemType(parent);
      if (pt === 'feature' || pt === 'story') {
        const range = computeDateRange(parent.id);
        let changed = false;
        if (parent.startDate !== range.start) { parent.startDate = range.start; changed = true; }
        if (parent.dueDate !== range.dueDate) { parent.dueDate = range.dueDate; changed = true; }
        if (range.endDate && parent.endDate !== range.endDate) { parent.endDate = range.endDate; changed = true; }
        if (!range.endDate && parent.endDate) { parent.endDate = ''; changed = true; }
        if (changed) {
          parent.updatedAt = new Date().toISOString();
          markDirty(parent.id);
        }
      }
      parent = parent.parentId ? tasks.find(t => t.id === parent.parentId) : null;
    }
  }

  // Structural changes need a full re-render (task moves between sections).
  // Non-structural changes get a lightweight update — no scroll flash.
  const structural = field === 'status'
    || field === 'client_id' || field === 'parent_id'
    || field === 'hoursEstimated' || field === 'hoursSpent'
    || field === 'startDate' || field === 'endDate' || field === 'dueDate';

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
  // Refresh the inline detail panel if it's showing for this task
  if (activeDetailTaskId === id && !structural) {
    const inlinePanel = document.getElementById('inlineDetailPanel');
    if (inlinePanel && !inlinePanel.classList.contains('tasks-layout__detail--hidden')) {
      inlinePanel.querySelector('.inline-detail')?.remove();
      inlinePanel.insertAdjacentHTML('beforeend', renderInlineTaskDetail(id));
    }
  }
}

/** Update a task row's visual styling in place without re-rendering the whole page */
function _updateTaskRowInPlace(taskId, field, value) {
  const row = document.querySelector(`.task-row[data-task-id="${taskId}"]`);
  if (field === 'status') {
    document.querySelectorAll(`[data-task-id="${taskId}"] .task-status-badge, .task-row[data-task-id="${taskId}"] .task-row__status`).forEach(el => {
      if (el.tagName === 'SELECT') el.value = value;
      else el.textContent = value;
    });
  }
  if (field === 'title' && row) {
    const titleEl = row.querySelector('.task-row__title');
    if (titleEl) titleEl.textContent = value;
  }
  if (field === 'assignees' && row) {
    const assigneeEl = row.querySelector('.task-row__assignee');
    const display = Array.isArray(value) && value.length > 0 ? value[0] : '';
    if (assigneeEl) assigneeEl.textContent = display;
    else if (display) {
      const titleEl = row.querySelector('.task-row__title');
      if (titleEl) titleEl.insertAdjacentHTML('afterend', `<span class="task-row__assignee">${esc(display)}</span>`);
    }
  }
  if (field === 'priority' && row) {
    const prioEl = row.querySelector('.task-row__priority');
    if (prioEl) prioEl.textContent = value || '';
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
    const interval = rule.interval || 1;
    const unitLabels = { daily: 'Day(s)', weekly: 'Week(s)', monthly: 'Month(s)', yearly: 'Year(s)' };
    html += `<div class="detail-field" style="display:flex;gap:6px;align-items:center"><label class="detail-field__label" style="white-space:nowrap">Every</label><input type="number" min="1" max="365" value="${interval}" style="width:50px;padding:4px 6px;font-size:0.82rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" onchange="setRepeatInterval('${task.id}',parseInt(this.value)||1)"><select id="detail-repeatFrequency" onchange="setRepeatType('${task.id}', this.value)" style="flex:1">`;
    ['daily', 'weekly', 'monthly', 'yearly'].forEach(t => {
      html += `<option value="${t}" ${ruleType === t ? 'selected' : ''}>${unitLabels[t]}</option>`;
    });
    html += `</select></div>`;

    if (ruleType === 'weekly') {
      const days = Array.isArray(rule.daysOfWeek) ? rule.daysOfWeek : [];
      const labels = ['S','M','T','W','T','F','S'];
      html += `<div class="detail-field"><span class="detail-field__label">Days</span><div style="display:flex;gap:4px">`;
      labels.forEach((lab, i) => {
        const checked = days.includes(i);
        html += `<label style="display:inline-flex;flex-direction:column;align-items:center;font-size:0.75rem;cursor:pointer"><input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleRepeatDay('${task.id}', ${i}, this.checked)" style="margin:0">${lab}</label>`;
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
      html += `<div style="font-size:0.75rem;color:var(--text-muted);padding:4px 0">A new instance will be created the day after the task is marked Done or Cancelled.</div>`;
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
    task.repeatRule = task.repeatRule || { type: 'daily', interval: 1 };
  } else {
    task.repeatRule = null;
  }
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  save();
  if (activeDetailTaskId === taskId && document.getElementById('detailPanel')?.classList.contains('open')) openDetailOverlay(taskId);
  else renderContent();
}

/** Set the repeat rule type, preserving interval and existing config where possible */
function setRepeatType(taskId, type) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const existing = task.repeatRule || {};
  const interval = existing.interval || 1;
  if (type === 'daily') task.repeatRule = { type: 'daily', interval };
  else if (type === 'weekly') task.repeatRule = { type: 'weekly', interval, daysOfWeek: existing.daysOfWeek || [] };
  else if (type === 'monthly') task.repeatRule = { type: 'monthly', interval };
  else if (type === 'yearly') task.repeatRule = { type: 'yearly', interval, dates: existing.dates || [] };
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  save();
  if (activeDetailTaskId === taskId && document.getElementById('detailPanel')?.classList.contains('open')) openDetailOverlay(taskId);
  else renderContent();
}

function setRepeatInterval(taskId, interval) {
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.repeatRule) return;
  task.repeatRule.interval = Math.max(1, Math.min(365, interval));
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  save();
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
  renderContent();
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
  const blockedDescendants = getDescendants(taskId).filter(d => d.status !== 'Blocked' && d.status !== 'Done' && d.status !== 'Cancelled');
  blockedDescendants.forEach(d => { d.status = 'Blocked'; d.updatedAt = new Date().toISOString(); markDirty(d.id); });
  const blockedDependants = tasks.filter(t => Array.isArray(t.dependencies) && t.dependencies.includes(taskId) && t.status !== 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled');
  blockedDependants.forEach(d => { d.status = 'Blocked'; d.updatedAt = new Date().toISOString(); markDirty(d.id); });
  const allCascaded = [...blockedDescendants, ...blockedDependants];
  pushUndo(`Mark "${task.title}" as Blocked`, () => { task.status = oldStatus; task.blockerInfo = oldInfo; task.updatedAt = new Date().toISOString(); markDirty(taskId); allCascaded.forEach(d => { d.status = 'In progress'; d.updatedAt = new Date().toISOString(); markDirty(d.id); }); });
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

async function duplicateTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  // Duplicate the whole subtree (bug 0e8b4144): children come with the copy.
  // getDescendants returns pre-order (parent before child), which the sync
  // layer relies on — tasks.parent_id is a FK, so parents must insert first.
  const descendants = getDescendants(id);
  if (descendants.length > 0) {
    const ok = await themedConfirm(
      `Duplicate "${task.title}" and its ${descendants.length} child item${descendants.length > 1 ? 's' : ''}?`,
      'Duplicate with children'
    );
    if (!ok) return;
  }

  const subtree = [task, ...descendants];
  const idMap = {};
  subtree.forEach(n => { idMap[n.id] = uid(); });

  /** Remap prerequisite refs pointing inside the subtree to the new copies;
   *  refs to items outside the subtree are preserved for descendants (still
   *  valid prerequisites) and dropped for the root (matches the old
   *  single-item duplicate, which reset dependencies entirely). */
  function mapDeps(node, isRoot) {
    const deps = node.dependencies || [];
    return deps
      .map(d => idMap[d] || (isRoot ? null : d))
      .filter(Boolean);
  }

  let rootCloneId = null;
  subtree.forEach(node => {
    const isRoot = node.id === task.id;
    const clone = createTaskObject({
      id: idMap[node.id],
      title: isRoot ? node.title + ' (copy)' : node.title,
      parentId: isRoot ? node.parentId : idMap[node.parentId],
      itemType: node.itemType || 'task',
      client: node.client || '',
      clientId: node.clientId || node.client_id || null,
      status: 'Not started',
      priority: node.priority || '',
      description: node.description || '',
      assignees: [...(node.assignees || [])],
      hoursEstimated: node.hoursEstimated || 0,
      dueDate: node.dueDate || '',
      startDate: node.startDate || '',
      endDate: node.endDate || '',
      dependencies: mapDeps(node, isRoot),
      practiceArea: node.practiceArea || node.practice_area || null,
      sowId: node.sowId || node.sow_id || null,
      workType: node.workType || node.work_type || null,
      sortOrder: isRoot ? (node.sortOrder || 0) + 1 : (node.sortOrder || 0),
    });
    if (isRoot) rootCloneId = clone.id;
    tasks.push(clone);
    markDirty(clone.id); // pre-order: parents are dirtied (and inserted) before children
  });

  save(); renderSidebarCounts(); renderContent();
  toast(descendants.length > 0
    ? `Duplicated "${task.title}" with ${descendants.length} child item${descendants.length > 1 ? 's' : ''}`
    : `Duplicated "${task.title}"`);
  openDetailOverlay(rootCloneId);
}

/** Create a new task/item object with all default fields. Shared factory for addTask, addItem, quickAddTask. */
function createTaskObject(overrides) {
  const now = new Date().toISOString();
  return {
    id: uid(), title: 'New Item', parentId: null, itemType: 'task', client: '',
    status: 'Not started', priority: '', healthState: '', description: '',
    assignees: [], hoursEstimated: 0, hoursSpent: 0,
    dueDate: '', startDate: '', endDate: '', dependencies: [],
    notes: [], createdAt: now, updatedAt: now, sortOrder: 0,
    ...overrides,
  };
}

/** Open the add-item type menu (header New button default action) */
function addTask() {
  const dd = document.getElementById('addItemMenuDropdown');
  if (!dd) return;
  const open = dd.style.display !== 'none';
  dd.style.display = open ? 'none' : '';
  if (!open) document.addEventListener('click', closeAddItemMenu, { once: true });
}

function _pickClient(title) {
  return new Promise(resolve => {
    const clients = getAllClients();
    if (clients.length === 0) { toast('No clients configured — add one in Settings first.', 'warning'); resolve(null); return; }
    _confirmResolve = null;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = '';
    document.getElementById('confirmOkBtn').textContent = 'Create';
    const input = document.getElementById('confirmInput');
    input.style.display = 'none';
    const msgEl = document.getElementById('confirmMessage');
    msgEl.innerHTML = '<select id="_pickClientSelect" style="width:100%;padding:8px;margin-top:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem">' + clients.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('') + '</select>';
    const modal = document.getElementById('confirmModal');
    const realResolve = resolve;
    _confirmResolve = (ok) => {
      const sel = document.getElementById('_pickClientSelect');
      realResolve(ok && sel ? sel.value : null);
      msgEl.textContent = '';
    };
    modal.classList.add('open');
    _trapFocus(modal);
  });
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
function addItemFromMenu(type) { closeAddItemMenu(); showAddItemPicker(type); }
function overflowPrint() { printReport(); toggleHeaderOverflow(); }
function overflowReport() { openBugReportModal(); toggleHeaderOverflow(); }
function overflowTheme(e) { toggleThemeDropdown(e); toggleHeaderOverflow(); }
function backToLogin() { window.location.hash = ''; showLoginScreen(); }

/** Create a new item of a given type under an optional parent. Opens its detail panel. */
async function addItem(type, parentId) {
  const meta = ITEM_TYPE_META[type] || ITEM_TYPE_META.task;
  const parent = parentId ? tasks.find(t => t.id === parentId) : null;
  let client = parent ? getTaskClient(parent) : (currentFilter.client || '');
  if (!client) {
    client = await _pickClient(`Select a client for the new ${meta.label.toLowerCase()}`);
    if (!client) return;
  }
  const t = createTaskObject({ title: `New ${meta.label}`, parentId: parentId || null, itemType: type, client });
  tasks.push(t);
  markDirty(t.id);
  save(); renderSidebarCounts(); renderContent();
  openDetail(t.id);
}

/** Show a modal to pick a parent before creating an item of a given type */
function showAddItemPicker(type) {
  // Project: pick a client
  if (type === 'project') {
    const clients = getAllClients();
    if (clients.length === 0) { toast('No clients configured — add one in Settings first.', 'warning'); return; }
    if (currentFilter.client) { addItem('project', null); return; }
    if (clients.length === 1) { addItem('project', null); return; }
    let html = `<div class="modal-overlay open" id="addItemPickerModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
      <div class="modal" style="max-width:var(--modal-sm)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h2 style="margin:0">New Project</h2>
          <button class="btn btn--ghost" data-action="_actModalRemove" data-arg0="addItemPickerModal">&times;</button>
        </div>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:12px">Which client is this project for?</p>
        <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border-default);border-radius:var(--radius-sm)">`;
    clients.sort().forEach(c => {
      html += `<div class="picker-row" data-action="_actAddProjectForClient" data-arg0="${esc(c)}">${clientBadgeHtml(c)} <span>${esc(c)}</span></div>`;
    });
    html += `</div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    _activateDynamicModal('addItemPickerModal');
    return;
  }
  // Feature/Story/Task: pick a parent, grouped by hierarchy
  const parentType = VALID_PARENT_TYPE[type];
  if (!parentType) { addItem(type, null); return; }
  const parents = tasks.filter(t => getItemType(t) === parentType).sort((a, b) => a.title.localeCompare(b.title));
  if (parents.length === 0) {
    toast(`No ${ITEM_TYPE_META[parentType].plural} exist yet. Create a ${ITEM_TYPE_META[parentType].label} first.`, 'warning');
    return;
  }
  if (parents.length === 1) { addItem(type, parents[0].id); return; }
  // Group parents by client, then by ancestor chain
  const grouped = {};
  parents.forEach(p => {
    const client = getTaskClient(p) || 'Unassigned';
    if (!grouped[client]) grouped[client] = [];
    grouped[client].push(p);
  });
  const filterClient = currentFilter.client;
  const sortedClients = Object.keys(grouped).sort((a, b) => {
    if (filterClient) { if (a === filterClient) return -1; if (b === filterClient) return 1; }
    return a.localeCompare(b);
  });
  let html = `<div class="modal-overlay open" id="addItemPickerModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-sm)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h2 style="margin:0">New ${ITEM_TYPE_META[type].label}</h2>
        <button class="btn btn--ghost" data-action="_actModalRemove" data-arg0="addItemPickerModal">&times;</button>
      </div>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:12px">Select a ${ITEM_TYPE_META[parentType].label} to add this ${ITEM_TYPE_META[type].label} under:</p>
      <div style="max-height:400px;overflow-y:auto;border:1px solid var(--border-default);border-radius:var(--radius-sm)">`;
  sortedClients.forEach((client, ci) => {
    const isActive = client === filterClient;
    html += `<div style="padding:6px 12px;font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;background:var(--bg-surface);border-bottom:1px solid var(--border-subtle);cursor:pointer;user-select:none" onclick="const g=this.nextElementSibling;const open=g.style.display!=='none';g.style.display=open?'none':'block';this.querySelector('.picker-arrow').textContent=open?'\\u25B6':'\\u25BC'"><span class="picker-arrow">${isActive ? '▼' : '▶'}</span> ${clientBadgeHtml(client)} ${esc(client)}</div><div style="display:${isActive ? 'block' : 'none'}">`;
    // Sub-group by ancestor project if parent type is deeper than project
    const items = grouped[client];
    if (parentType === 'project') {
      items.forEach(p => {
        html += `<div class="picker-row" data-action="_actAddItemFromPicker" data-arg0="${type}" data-arg1="${p.id}">
          ${itemTypeBadgeHtml(p)} <span>${esc(p.title)}</span></div>`;
      });
    } else {
      // Group by project ancestor, then by intermediate parent (e.g. feature between project and story)
      const byProject = {};
      items.forEach(p => {
        const root = getRootAncestor(p);
        const projKey = root.id;
        if (!byProject[projKey]) byProject[projKey] = { project: root, direct: [], byIntermediate: {} };
        const directParent = p.parentId ? tasks.find(t => t.id === p.parentId) : null;
        if (directParent && directParent.id !== root.id) {
          if (!byProject[projKey].byIntermediate[directParent.id]) byProject[projKey].byIntermediate[directParent.id] = { parent: directParent, items: [] };
          byProject[projKey].byIntermediate[directParent.id].items.push(p);
        } else {
          byProject[projKey].direct.push(p);
        }
      });
      Object.values(byProject).sort((a, b) => a.project.title.localeCompare(b.project.title)).forEach(grp => {
        html += `<div style="padding:4px 12px 4px 24px;font-size:0.75rem;color:var(--text-secondary);border-bottom:1px solid var(--border-subtle);cursor:pointer;user-select:none" onclick="var g=this.nextElementSibling;var o=g.style.display!=='none';g.style.display=o?'none':'block';this.querySelector('.picker-arrow').textContent=o?'\\u25B6':'\\u25BC'"><span class="picker-arrow">&#9654;</span> ${esc(grp.project.title)}</div><div style="display:none">`;
        grp.direct.forEach(p => {
          html += `<div class="picker-row" style="padding-left:36px" data-action="_actAddItemFromPicker" data-arg0="${type}" data-arg1="${p.id}">
            ${itemTypeBadgeHtml(p)} <span>${esc(p.title)}</span></div>`;
        });
        Object.values(grp.byIntermediate).sort((a, b) => a.parent.title.localeCompare(b.parent.title)).forEach(sub => {
          html += `<div style="padding:4px 12px 4px 36px;font-size:0.75rem;color:var(--text-muted);border-bottom:1px solid var(--border-subtle);cursor:pointer;user-select:none" onclick="var g=this.nextElementSibling;var o=g.style.display!=='none';g.style.display=o?'none':'block';this.querySelector('.picker-arrow').textContent=o?'\\u25B6':'\\u25BC'"><span class="picker-arrow">&#9654;</span> ${itemTypeBadgeHtml(sub.parent)} ${esc(sub.parent.title)}</div><div style="display:none">`;
          sub.items.forEach(p => {
            html += `<div class="picker-row" style="padding-left:48px" data-action="_actAddItemFromPicker" data-arg0="${type}" data-arg1="${p.id}">
              ${itemTypeBadgeHtml(p)} <span>${esc(p.title)}</span></div>`;
          });
          html += `</div>`;
        });
        html += `</div>`;
      });
    }
    html += `</div>`;
  });
  html += `</div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  _activateDynamicModal('addItemPickerModal');
}

/** Quick-add a project by title from the inline input bar */
function quickAddTask(title) {
  const itemType = document.getElementById('quickAddType')?.value || 'project';
  const client = document.getElementById('quickAddClient')?.value || currentFilter.client || '';
  if (!client) { toast('Select a client first.', 'warning'); var sel = document.getElementById('quickAddClient'); if (sel) { sel.style.borderColor = 'var(--danger)'; sel.focus(); setTimeout(function() { sel.style.borderColor = ''; }, 3000); } return; }
  const parentType = VALID_PARENT_TYPE[itemType];
  if (parentType) {
    showAddItemPicker(itemType);
    return;
  }
  const assignees = currentFilter.assignee ? [currentFilter.assignee] : [];
  const t = createTaskObject({ title, itemType, client, assignees });
  tasks.push(t);
  markDirty(t.id);
  save();
  toast(`${ITEM_TYPE_META[itemType].label} "${title}" created`);
  renderSidebarCounts(); renderContent();
  setTimeout(() => { const input = document.getElementById('quickAddInput'); if (input) input.focus(); }, 100);
}


