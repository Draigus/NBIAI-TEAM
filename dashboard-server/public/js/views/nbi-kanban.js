// ==================== CLIENT SUMMARY PANEL ====================

/** Render the 30% right-side summary panel showing portfolio/client stats, progress ring, and team breakdown */
function renderClientSummary(filtered) {
  const clientName = currentFilter.assignee ? currentFilter.assignee + "'s Tasks" : currentFilter.client || (_currentUser?.display_name ? _currentUser.display_name + "'s Tasks" : 'NBI Portfolio');
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
    const statusColours = { 'Done': 'var(--purple)', 'In progress': 'var(--success)', 'Planning': 'var(--warning)', 'Drafted': 'var(--purple)', 'In Review': 'var(--warning)', 'Blocked': 'var(--danger)', 'Not started': 'var(--text-muted)', 'Cancelled': '#444' };
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

/** Toggle a collapsible accordion section in the task detail panel */
let _accordionState = {};
let _accordionTaskId = null;
function toggleDetailSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.classList.toggle('detail-accordion--collapsed');
  _accordionState[sectionId.replace('acc-', '')] = el.classList.contains('detail-accordion--collapsed');
}
function _accWrap(key, title, body, defaultCollapsed) {
  if (_accordionTaskId !== _accordionState._tid) { _accordionState = { _tid: _accordionTaskId }; }
  const collapsed = _accordionState[key] !== undefined ? _accordionState[key] : defaultCollapsed;
  const cls = collapsed ? ' detail-accordion--collapsed' : '';
  const chevron = '&#9662;';
  return '<div id="acc-' + key + '" class="detail-accordion' + cls + '"><div class="detail-accordion__header" onclick="toggleDetailSection(\'acc-' + key + '\')"><span>' + title + '</span><span class="detail-accordion__chevron">' + chevron + '</span></div><div class="detail-accordion__body">' + body + '</div></div>';
}

/** Render the inline task detail panel (30% right side in tasks view) -- properties, time, notes, children */
function renderInlineTaskDetail(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return renderClientSummary(getFilteredTasks());
  const children = getChildren(id);
  const hrs = aggHours(id);
  const isRoot = !task.parentId;

  _accordionTaskId = id;

  let html = '<div class="inline-detail">';
  html += `<div class="inline-detail__header"><input class="inline-detail__title-input" value="${esc(task.title)}" oninput="_liveWrite('${id}','title',this.value)" onchange="updateTask('${id}','title',this.value)" onkeydown="if(event.key==='Enter')this.blur()"><button class="inline-detail__close" data-action="_actClearDetailTask" title="Back to summary">&larr;</button></div>`;

  // Properties — always visible, not collapsible
  const ilClient = getTaskClient(task);
  html += `<div class="detail-section"><div class="detail-section__title">Properties</div>`;
  html += `<div class="detail-field"><span class="detail-field__label">Type</span><div style="display:flex;align-items:center;gap:6px">${itemTypeBadgeHtml(task)} <span style="font-size:0.82rem;color:var(--text-primary)">${getItemTypeLabel(task)}</span></div></div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="inline-detail-title">Name</label><input id="inline-detail-title" value="${esc(task.title)}" oninput="_liveWrite('${id}','title',this.value)" onchange="updateTask('${id}','title',this.value)" onkeydown="if(event.key==='Enter')this.blur()"></div>`;
  if (ilClient) {
    html += `<div class="detail-field"><span class="detail-field__label field-required">Client</span><div style="display:flex;align-items:center;gap:6px">${clientBadgeHtml(ilClient)} <span style="font-size:0.82rem;color:var(--text-primary)">${esc(ilClient)}</span></div></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label field-required" for="inline-detail-client">Client</label><select id="inline-detail-client" onchange="if(!this.value){this.value='${escAttrJs(task.client||'')}';toast('Every item must belong to a client.','warning');return;}updateTask('${id}','client',this.value)"><option value="" disabled>${task.client ? '' : '-- Select Client --'}</option>${getContractedClients().map(o => `<option value="${esc(o)}" ${(task.client||'')=== o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  }
  html += inlineDetailSelect('Status', 'status', task.status, STATUSES, id, true);
  if (task.status === 'Blocked') html += blockerDetailBoxHtml(task, id);
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
  const _iType = getItemType(task);
  const _datesAuto = (_iType === 'feature' || _iType === 'story') && getChildren(task.id).length > 0;
  if (_datesAuto) {
    const _range = computeDateRange(id);
    html += `<div class="detail-field"><label class="detail-field__label">Start Date</label><input type="date" value="${_range.start}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label">Due Date</label><input type="date" value="${_range.dueDate}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label">End Date</label><input type="date" value="${_range.endDate}" disabled title="Set when all children are complete"></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-startDate">Start Date</label><input id="inline-detail-startDate" type="date" value="${task.startDate||''}" onchange="updateTask('${id}','startDate',this.value)"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-endDate">End Date</label><input id="inline-detail-endDate" type="date" value="${task.endDate||''}" onchange="updateTask('${id}','endDate',this.value)"></div>`;
  }
  html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-dueDate">Due Date</label><input id="inline-detail-dueDate" type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
  html += renderRepeatSection(task);
  html += `</div>`;

  // Time Tracking (collapsible, collapsed by default)
  { let timeBody = '';
  if (hrs.est > 0) timeBody += `<div class="detail-agg" style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px">${hrs.spent.toFixed(1)}h spent / ${hrs.est.toFixed(1)}h estimated (${Math.round(hrs.spent/hrs.est*100)}%)</div>`;
  if (children.length > 0) {
    timeBody += `<div class="detail-field"><label class="detail-field__label">Hours Spent</label><input type="number" value="${hrs.spent}" disabled title="Aggregated from ${children.length} child items"></div>`;
    timeBody += `<div class="detail-field"><label class="detail-field__label">Hours Est.</label><input type="number" value="${hrs.est}" disabled title="Aggregated from ${children.length} child items"></div>`;
  } else {
    timeBody += `<div class="detail-field"><label class="detail-field__label field-required" for="inline-detail-hoursEstimated">Hours Est.</label><input id="inline-detail-hoursEstimated" type="number" step="0.5" min="0" value="${task.hoursEstimated||0}" onchange="updateTask('${id}','hoursEstimated',parseFloat(this.value)||0)"></div>`;
  }
  timeBody += `<div style="display:flex;gap:4px;align-items:center;margin-bottom:8px"><input id="inlineLogHours" type="number" step="0.25" min="0.25" placeholder="Hours" style="width:60px;padding:4px 6px;font-size:0.78rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><input id="inlineLogDesc" placeholder="What did you work on?" style="flex:1;padding:4px 6px;font-size:0.78rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><button class="btn btn--sm" data-action="logTimeEntryInline" data-arg0="${id}">Log</button></div>`;
  timeBody += `<div id="inlineTimeEntriesList" style="max-height:120px;overflow-y:auto"><div style="color:var(--text-muted);font-size:0.75rem">Loading time entries...</div></div>`;
  html += _accWrap('time', 'Time Tracking', timeBody, true); }

  // Description (collapsible, open by default)
  { let descBody = '';
  descBody += `<div class="detail-section"><div class="detail-section__title field-required">Description of Work <span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">(min 15 characters)</span></div>`;
  descBody += `<div class="detail-field"><textarea placeholder="A clear, concise description of the work needed to complete this task." onchange="updateTask('${id}','description',this.value)" oninput="_liveWrite('${id}','description',this.value);this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.description||'')}</textarea></div></div>`;
  descBody += `<div class="detail-section"><div class="detail-section__title">Collaborations</div>`;
  descBody += `<div class="detail-field"><textarea placeholder="If there are multiple people on the task, describe everyone's responsibilities." onchange="updateTask('${id}','collaborations',this.value)" oninput="_liveWrite('${id}','collaborations',this.value);this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.collaborations||'')}</textarea></div></div>`;
  descBody += `<div class="detail-section"><div class="detail-section__title">Success Factor</div>`;
  descBody += `<div class="detail-field"><textarea placeholder="What will we have accomplished or made by the completion of this task?" onchange="updateTask('${id}','successFactor',this.value)" oninput="_liveWrite('${id}','successFactor',this.value);this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(task.successFactor||'')}</textarea></div></div>`;
  html += _accWrap('desc', 'Description', descBody, false); }

  // Notes (collapsible, open by default)
  { let notesBody = '<div class="note-list">';
  (task.notes||[]).forEach((n, idx) => { notesBody += `<div class="note-item"><div class="note-item__time" style="display:flex;justify-content:space-between;align-items:center"><span>${new Date(n.time).toLocaleString()}</span><a href="#" data-action="deleteNote" data-prevent data-arg0="${id}" data-arg1="${idx}" style="color:var(--danger);font-size:0.75rem">delete</a></div><div>${esc(n.text)}</div></div>`; });
  notesBody += `</div><div class="note-input"><input id="inlineNoteInput" placeholder="Add a note..." onkeydown="if(event.key==='Enter'){addNoteInline('${id}')}"><button class="btn btn--sm btn--primary" data-action="addNoteInline" data-arg0="${id}">Add</button></div>`;
  html += _accWrap('notes', 'Notes' + ((task.notes||[]).length ? ' (' + (task.notes||[]).length + ')' : ''), notesBody, false); }

  // Attachments (collapsible, collapsed by default)
  html += _accWrap('attach', 'Attachments', renderAttachmentsSection(isRoot ? 'project' : 'task', id), true);

  // Prerequisites + Dependents (collapsible, collapsed by default)
  { const inlineDeps = task.dependencies || [];
  const inlineDepTasks = inlineDeps.map(did => tasks.find(t => t.id === did)).filter(Boolean);
  const inlineBlockers = inlineDepTasks.filter(d => d.status !== 'Done');
  let prereqBody = '';
  if (inlineDepTasks.length > 0) {
    inlineDepTasks.forEach(d => {
      const dIcon = d.status === 'Done' ? '<span style="color:var(--success)">&#10003;</span>' : '<span style="color:var(--warning)">&#9679;</span>';
      prereqBody += `<div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;padding:2px 0">${dIcon} ${itemTypeBadgeHtml(d)} <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--accent-text)" data-action="openDetailOverlay" data-arg0="${d.id}">${esc(d.title)}</span><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.75rem" data-action="_actStopRemoveDepAndRender" data-stop data-arg0="${id}" data-arg1="${d.id}" title="Remove">&times;</button></div>`;
    });
  } else {
    prereqBody += `<div style="color:var(--text-muted);font-size:0.75rem;padding:2px 0">None</div>`;
  }
  const inlineDependents = getDependents(id);
  if (inlineDependents.length > 0) {
    prereqBody += `<div style="margin-top:var(--space-md);font-weight:600;font-size:0.75rem;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:var(--space-xs)">Dependents (${inlineDependents.length} waiting)</div>`;
    inlineDependents.forEach(d => {
      prereqBody += `<div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;padding:2px 0">${itemTypeBadgeHtml(d)} <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--accent-text)" data-action="openDetailOverlay" data-arg0="${d.id}">${esc(d.title)}</span><span style="font-size:0.75rem;color:var(--text-muted)">${d.status}</span></div>`;
    });
  }
  const prereqTitle = 'Prerequisites' + (inlineBlockers.length > 0 ? ' <span style="color:var(--warning);font-size:0.75rem;font-weight:400;text-transform:none;letter-spacing:0">(' + inlineBlockers.length + ' incomplete)</span>' : inlineDeps.length > 0 ? ' <span style="color:var(--success);font-size:0.75rem;font-weight:400;text-transform:none;letter-spacing:0">All met</span>' : '');
  html += _accWrap('prereq', prereqTitle, prereqBody, true); }

  // Children (collapsible, collapsed by default)
  const childType = getAllowedChildType(task);
  if (children.length > 0 || childType) {
    const childLabel = getChildTypeLabel(task) || 'Children';
    let childBody = '';
    if (children.length > 0) {
      const childDone = children.filter(c => c.status === 'Done').length;
      const childPct = Math.round(childDone / children.length * 100);
      childBody += `<div class="summary-progress"><div class="summary-progress__bar"><div class="summary-progress__fill" style="width:${childPct}%;background:var(--success)"></div></div></div>`;
      childBody += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">${childDone}/${children.length} complete</div>`;
      children.slice(0, 8).forEach(c => {
        const icon = c.status === 'Done' ? '&#10003;' : c.status === 'In progress' ? '&#9654;' : '&#9675;';
        const style = c.status === 'Done' ? 'color:var(--purple)' : c.status === 'Blocked' ? 'color:var(--danger)' : '';
        childBody += `<div style="font-size:0.78rem;padding:3px 0;cursor:pointer;display:flex;align-items:center;gap:6px;${style}" data-action="openDetail" data-arg0="${c.id}"><span>${icon}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.title)}</span></div>`;
      });
      if (children.length > 8) childBody += `<div style="font-size:0.75rem;color:var(--text-muted);padding:4px 0">+ ${children.length - 8} more</div>`;
    }
    if (childType) {
      const childMeta = ITEM_TYPE_META[childType];
      childBody += `<button class="btn btn--sm btn--outline" data-action="addItem" data-arg0="${childType}" data-arg1="${id}" style="margin-top:8px;font-size:0.75rem">+ Add ${childMeta.label}</button>`;
    }
    html += _accWrap('children', childLabel + ' (' + children.length + ')', childBody, true);
  }

  // Actions
  html += `<div class="detail-section"><div class="detail-section__title">Actions</div>`;
  html += `<div style="display:flex;gap:8px">`;
  html += `<button class="btn btn--outline" data-action="openDetailOverlay" data-arg0="${id}" style="font-size:0.75rem">Expand</button>`;
  html += `<button class="btn btn--outline" data-action="duplicateTask" data-arg0="${id}" style="font-size:0.75rem">Duplicate</button>`;
  html += `<button class="btn btn--danger" data-action="deleteTask" data-arg0="${id}" style="font-size:0.75rem">Delete</button>`;
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

/** Delete a note from a task by index */
async function deleteNote(id, noteIndex) {
  if (!(await themedConfirm('Delete this note?'))) return;
  const task = tasks.find(t => t.id === id);
  if (!task || !task.notes || noteIndex < 0 || noteIndex >= task.notes.length) return;
  task.notes.splice(noteIndex, 1);
  task.updatedAt = new Date().toISOString();
  markDirty(id);
  save();
  renderContent();
  if (activeDetailTaskId === id && document.getElementById('detailPanel')?.classList.contains('open')) {
    openDetailOverlay(id);
  }
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
  const isInReview = task.status === 'In Review' || task.status === 'Drafted';
  const isPlanning = task.status === 'Planning';
  const isBlocked = task.healthState === 'Blocked';
  let iconClass = 'task-row__status-icon';
  let iconContent = '';
  if (isDone) { iconClass += ' task-row__status-icon--done'; iconContent = '&#10003;'; }
  else if (isCancelled) { iconContent = '&times;'; }
  else if (isBlocked) { iconClass += ' task-row__status-icon--blocked'; }
  else if (isInReview) { iconClass += ' task-row__status-icon--review'; }
  else if (isPlanning) { iconClass += ' task-row__status-icon--planning'; }
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
  if (prereqBlocked) html += `<span style="color:var(--warning);font-size:0.75rem;flex-shrink:0" title="Has incomplete prerequisites">&#128274;</span>`;
  const isIncomplete = isTaskIncomplete(task);
  html += `<span class="task-row__title ${hasKids?'task-row__title--parent':''}">${esc(task.title)}</span>`;
  if (isIncomplete) html += `<span style="color:var(--danger);font-size:0.75rem;flex-shrink:0" title="Missing fields: ${!task.hoursEstimated?'hours ':''}${!task.priority?'priority ':''}${!task.assignees||task.assignees.length===0?'assignee ':''}${!task.dueDate?'due date':''}">&#9888;</span>`;
  html += `<div class="task-row__badges">`;
  if (task.priority) html += priorityBadgeHtml(task.priority);
  if (task.healthState) html += healthBadgeHtml(task.healthState);
  if (!isDone) html += statusBadgeHtml(task.status, task);
  html += `</div>`;
  if (task.dueDate) {
    const due = safeParseDate(task.dueDate);
    if (due) {
    const now = new Date(); now.setHours(0,0,0,0);
    const overdue = due < now && task.status !== 'Done';
    const dueSoon = !overdue && (due - now) <= 3*86400000 && task.status !== 'Done';
    const dueClass = overdue ? 'color:var(--danger)' : dueSoon ? 'color:var(--warning)' : 'color:var(--text-muted)';
    const dueLabel = due.toLocaleDateString('en-GB', {day:'numeric',month:'short'});
    html += `<span style="font-family:var(--font-mono);font-size:0.75rem;${dueClass};flex-shrink:0">${overdue?'&#9888; ':''}${dueLabel}</span>`;
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
        children.forEach(c => { childHtml += renderTaskRow(c, depth + 1, tasks, _treeVisibleIds); });
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
      const rootTasks = tasks.filter(t => !t.parentId && (t.client || getTaskClient(t) || 'Unassigned') === clientName)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      let childHtml = '';
      rootTasks.forEach(r => { childHtml += renderTaskRow(r, 1, tasks, _treeVisibleIds); });
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
  const visited = new Set();
  while (current && current.parentId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
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
  document.querySelectorAll('.tree-drop-before, .tree-drop-after').forEach(el => { el.classList.remove('tree-drop-before', 'tree-drop-after'); });
  _treeDragZone = null;
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

/** Handle drop -- reparent the dragged task under the target, inherit client from new root.
 *  Skips if the drop landed on a .task-row — the document-level zone handler handles those. */
function onDrop(e, targetParentId) {
  e.currentTarget.classList.remove('drag-over');
  if (e.target.closest('.task-row')) return;
  e.preventDefault();
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

// Tree view drag: supports reordering siblings (top/bottom edge) and reparenting (middle zone).
// Drop zone detection: top 25% = insert before, bottom 25% = insert after, middle 50% = reparent.
let _treeDragZone = null; // 'before' | 'after' | 'reparent'

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

  // Detect drop zone from cursor position
  const rect = row.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const pct = y / rect.height;
  const zone = pct < 0.25 ? 'before' : pct > 0.75 ? 'after' : 'reparent';
  _treeDragZone = zone;

  // Visual feedback
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.querySelectorAll('.tree-drop-before, .tree-drop-after').forEach(el => { el.classList.remove('tree-drop-before', 'tree-drop-after'); });
  if (zone === 'reparent') {
    row.classList.add('drag-over');
  } else {
    row.classList.add(zone === 'before' ? 'tree-drop-before' : 'tree-drop-after');
  }
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
  row.classList.remove('drag-over', 'tree-drop-before', 'tree-drop-after');

  const task = tasks.find(t => t.id === draggedTaskId);
  const target = tasks.find(t => t.id === targetId);
  if (!task || !target) return;
  const zone = _treeDragZone || 'reparent';
  _treeDragZone = null;

  if (zone === 'reparent') {
    // Existing reparent behaviour
    const targetTask = tasks.find(t => t.id === targetId);
    if (targetTask) {
      const allowedChild = VALID_CHILD_TYPE[getItemType(targetTask)];
      if (!allowedChild) { toast(`A ${getItemTypeLabel(targetTask)} cannot have children`, 'warning'); draggedTaskId = null; return; }
      if (getItemType(task) !== allowedChild) { toast(`A ${getItemTypeLabel(task)} cannot be placed under a ${getItemTypeLabel(targetTask)}. Expected: ${ITEM_TYPE_META[allowedChild].label}`, 'warning'); draggedTaskId = null; return; }
    }
    task.parentId = targetId;
    task.updatedAt = new Date().toISOString();
    markDirty(draggedTaskId);
    save(); renderSidebarCounts(); renderContent();
    toast(`Moved "${task.title}" under "${target.title}"`);
  } else {
    // Reorder: insert before/after the target within the same parent
    const newParent = target.parentId;
    // Validate type hierarchy if moving to a different parent
    if (task.parentId !== newParent) {
      if (newParent) {
        const parentTask = tasks.find(t => t.id === newParent);
        if (parentTask) {
          const allowedChild = VALID_CHILD_TYPE[getItemType(parentTask)];
          if (!allowedChild || getItemType(task) !== allowedChild) { toast(`Cannot place a ${getItemTypeLabel(task)} at this level`, 'warning'); draggedTaskId = null; return; }
        }
      } else {
        if (getItemType(task) !== 'project') { toast('Only Projects can exist at the root level', 'warning'); draggedTaskId = null; return; }
      }
      task.parentId = newParent;
    }
    // Get siblings sorted by current sortOrder, remove dragged task
    const siblings = getChildren(newParent).filter(t => t.id !== task.id);
    // Find target's index and insert before or after
    const targetIdx = siblings.findIndex(t => t.id === targetId);
    const insertIdx = zone === 'before' ? targetIdx : targetIdx + 1;
    siblings.splice(insertIdx, 0, task);
    // Reassign sequential sortOrder
    siblings.forEach((s, i) => {
      if (s.sortOrder !== i) {
        s.sortOrder = i;
        s.updatedAt = new Date().toISOString();
        markDirty(s.id);
      }
    });
    save(); renderSidebarCounts(); renderContent();
    toast(`Reordered "${task.title}"`);
  }
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

