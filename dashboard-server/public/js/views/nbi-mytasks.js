// ==================== MY TASKS VIEW ====================

let _myTasksSort = 'priority'; // 'priority' | 'dueDate' | 'client' | 'status'

/** Priority sort weight: lower = more urgent */
function _priorityWeight(p) {
  if (p === 'Urgent') return 0;
  if (p === 'High') return 1;
  if (p === 'Medium') return 2;
  if (p === 'Low') return 3;
  return 4;
}

/** Health sort weight: lower = more critical */
function _healthWeight(h) {
  if (h === 'Blocked') return 0;
  if (h === 'Red') return 1;
  if (h === 'Yellow') return 2;
  if (h === 'Green') return 3;
  return 4;
}

/** Parse a date string that might be YYYY-MM-DD or DD/MM/YYYY */
function _parseTaskDate(d) {
  if (!d) return null;
  if (d.includes('/')) {
    const [dd, mm, yyyy] = d.split('/');
    return new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}T00:00:00`);
  }
  return new Date(d + 'T00:00:00');
}

/** Render a single task row in the My Tasks view */
function _myTaskRow(t) {
  const isDone = t.status === 'Done';
  const dueDate = _parseTaskDate(t.dueDate);
  const now = new Date(); now.setHours(0,0,0,0);
  const isOverdue = dueDate && !isNaN(dueDate) && dueDate < now && !isDone;
  const dueSoon = dueDate && !isNaN(dueDate) && !isOverdue && (dueDate - now) <= 3*86400000 && !isDone;
  const dueLabel = dueDate && !isNaN(dueDate) ? dueDate.toLocaleDateString('en-GB', {day:'numeric',month:'short'}) : '';
  const dueClass = isOverdue ? 'color:var(--danger);font-weight:600' : dueSoon ? 'color:var(--warning)' : 'color:var(--text-muted)';
  const hrsStr = (t.hoursEstimated || t.hoursSpent) ? `${(t.hoursSpent||0).toFixed(1)}/${(t.hoursEstimated||0).toFixed(1)}h` : '';
  const parent = t.parentId ? tasks.find(p => p.id === t.parentId) : null;
  const projectName = parent ? parent.title : '';

  return `<div class="mytask-row" data-action="navigateToTaskInTree" data-arg0="${t.id}" style="cursor:pointer">
    <div class="mytask-row__left">
      <div class="mytask-row__badges">${t.priority ? priorityBadgeHtml(t.priority) : ''}${t.healthState ? healthBadgeHtml(t.healthState) : ''}${statusBadgeHtml(t.status)}</div>
      <div class="mytask-row__title">${esc(t.title)}</div>
      <div class="mytask-row__meta">
        ${t.client ? clientBadgeHtml(t.client) : ''}
        ${projectName ? `<span class="mytask-row__project">${esc(projectName)}</span>` : ''}
      </div>
    </div>
    <div class="mytask-row__right">
      ${hrsStr ? `<span class="mytask-row__hours" data-tooltip="Hours spent / estimated">${hrsStr}</span>` : ''}
      ${dueLabel ? `<span style="font-family:var(--font-mono);font-size:0.75rem;${dueClass}" data-tooltip="${isOverdue ? 'Past due date' : dueSoon ? 'Due within 3 days' : 'Due date'}">${isOverdue?'&#9888; ':''}${dueLabel}</span>` : ''}
    </div>
  </div>`;
}

/** Render the My Tasks view: personal task dashboard with priority sections */
function renderMyTasksView(el) {
  const myName = _currentUser?.displayName || '';
  if (!myName) {
    el.innerHTML = emptyState('&#128100;', 'Not signed in', 'Sign in to see your tasks.');
    return;
  }

  // Get all tasks assigned to current user (leaf tasks only — skip parent/container tasks)
  const myTasks = tasks.filter(t => {
    if (!t.assignees?.includes(myName)) return false;
    if (t.status === 'Cancelled') return false;
    return true;
  });

  const active = myTasks.filter(t => t.status !== 'Done');
  const done = myTasks.filter(t => t.status === 'Done');
  const now = new Date(); now.setHours(0,0,0,0);

  // Categorise active tasks
  const critical = active.filter(t => t.healthState === 'Blocked' || t.healthState === 'Red' || t.priority === 'Urgent');
  const overdue = active.filter(t => { const d = _parseTaskDate(t.dueDate); return d && !isNaN(d) && d < now && !critical.includes(t); });
  const inProgress = active.filter(t => t.status === 'In progress' && !critical.includes(t) && !overdue.includes(t));
  const upcoming = active.filter(t => !critical.includes(t) && !overdue.includes(t) && !inProgress.includes(t));

  /** Extract a numeric sort value from a task's due date (Infinity if missing) */
  function _dateSortVal(t) { const d = _parseTaskDate(t.dueDate); return d && !isNaN(d) ? d.getTime() : Infinity; }
  /** Sort a task array by the current My Tasks sort mode (priority, dueDate, or status) */
  function sortTasks(arr) {
    return [...arr].sort((a, b) => {
      if (_myTasksSort === 'priority') {
        const pw = _priorityWeight(a.priority) - _priorityWeight(b.priority);
        if (pw !== 0) return pw;
        const hw = _healthWeight(a.healthState) - _healthWeight(b.healthState);
        if (hw !== 0) return hw;
        return _dateSortVal(a) - _dateSortVal(b);
      }
      if (_myTasksSort === 'dueDate') {
        return _dateSortVal(a) - _dateSortVal(b);
      }
      if (_myTasksSort === 'client') {
        return (getTaskClient(a) || '').localeCompare(getTaskClient(b) || '');
      }
      if (_myTasksSort === 'status') {
        const order = ['In progress', 'Planning', 'In Review', 'Not started', 'Done'];
        return (order.indexOf(a.status) === -1 ? 99 : order.indexOf(a.status)) - (order.indexOf(b.status) === -1 ? 99 : order.indexOf(b.status));
      }
      return 0;
    });
  }

  // Summary stats
  const totalHrsEst = active.reduce((s,t) => s + (t.hoursEstimated||0), 0);
  const totalHrsSpent = active.reduce((s,t) => s + (t.hoursSpent||0), 0);
  const completionPct = myTasks.length > 0 ? Math.round(done.length / myTasks.length * 100) : 0;

  let html = `<div class="mytasks">`;
  html += `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
    <h1 style="margin:0">${esc(myName)}'s Work</h1>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="font-size:0.78rem;color:var(--text-muted)">Sort:</span>
      <button class="btn btn--outline ${_myTasksSort==='priority'?'btn--primary':''}" data-action="_actSetMyTasksSort" data-arg0="priority" style="font-size:0.75rem;padding:4px 10px" data-tooltip="Sort by urgency and health state" data-tooltip-pos="below">Priority</button>
      <button class="btn btn--outline ${_myTasksSort==='dueDate'?'btn--primary':''}" data-action="_actSetMyTasksSort" data-arg0="dueDate" style="font-size:0.75rem;padding:4px 10px" data-tooltip="Sort by due date, soonest first" data-tooltip-pos="below">Due Date</button>
      <button class="btn btn--outline ${_myTasksSort==='client'?'btn--primary':''}" data-action="_actSetMyTasksSort" data-arg0="client" style="font-size:0.75rem;padding:4px 10px" data-tooltip="Group tasks alphabetically by client" data-tooltip-pos="below">Client</button>
      <button class="btn btn--outline ${_myTasksSort==='status'?'btn--primary':''}" data-action="_actSetMyTasksSort" data-arg0="status" style="font-size:0.75rem;padding:4px 10px" data-tooltip="Sort by workflow status" data-tooltip-pos="below">Status</button>
    </div>
  </div>`;

  // KPI row
  html += `<div class="leads-pipeline__metrics" style="margin-bottom:24px">
    <div class="kpi-card" data-tooltip="All tasks not yet marked Done"><div class="kpi-card__value">${active.length}</div><div class="kpi-card__label">Active</div></div>
    <div class="kpi-card" data-tooltip="Blocked, red health, urgent, or overdue tasks"><div class="kpi-card__value" style="color:var(--danger)">${critical.length + overdue.length}</div><div class="kpi-card__label">Need Attention</div></div>
    <div class="kpi-card" data-tooltip="Tasks with status set to In Progress"><div class="kpi-card__value">${inProgress.length}</div><div class="kpi-card__label">In Progress</div></div>
    <div class="kpi-card" data-tooltip="Percentage of your tasks marked Done"><div class="kpi-card__value">${completionPct}%</div><div class="kpi-card__label">Complete (${done.length}/${myTasks.length})</div></div>
    <div class="kpi-card" data-tooltip="Hours spent vs estimated across active tasks"><div class="kpi-card__value" style="font-size:1rem">${totalHrsSpent.toFixed(0)}h / ${totalHrsEst.toFixed(0)}h</div><div class="kpi-card__label">Hours Tracked</div></div>
  </div>`;

  // Section: Critical & Blocked
  if (critical.length > 0) {
    html += `<div class="mytasks-section mytasks-section--critical">
      <h2 class="mytasks-section__header" style="color:var(--danger)" data-tooltip="Urgent priority, blocked, or red health tasks">&#9888; Critical &amp; Blocked <span class="mytasks-section__count">${critical.length}</span></h2>
      <div class="mytasks-section__list">${sortTasks(critical).map(_myTaskRow).join('')}</div>
    </div>`;
  }

  // Section: Overdue
  if (overdue.length > 0) {
    html += `<div class="mytasks-section mytasks-section--overdue">
      <h2 class="mytasks-section__header" style="color:var(--warning)" data-tooltip="Tasks past their due date">&#128337; Overdue <span class="mytasks-section__count">${overdue.length}</span></h2>
      <div class="mytasks-section__list">${sortTasks(overdue).map(_myTaskRow).join('')}</div>
    </div>`;
  }

  // Section: In Progress
  if (inProgress.length > 0) {
    html += `<div class="mytasks-section">
      <h2 class="mytasks-section__header" style="color:var(--accent)" data-tooltip="Tasks you are actively working on">&#9654; In Progress <span class="mytasks-section__count">${inProgress.length}</span></h2>
      <div class="mytasks-section__list">${sortTasks(inProgress).map(_myTaskRow).join('')}</div>
    </div>`;
  }

  // Section: Upcoming / Not Started
  if (upcoming.length > 0) {
    html += `<div class="mytasks-section">
      <h2 class="mytasks-section__header" data-tooltip="Not started or planned tasks waiting to begin">&#128203; Upcoming <span class="mytasks-section__count">${upcoming.length}</span></h2>
      <div class="mytasks-section__list">${sortTasks(upcoming).map(_myTaskRow).join('')}</div>
    </div>`;
  }

  // Section: Done (collapsible)
  if (done.length > 0) {
    html += `<div class="mytasks-section">
      <h2 class="mytasks-section__header" style="cursor:pointer;color:var(--text-muted)" data-action="_actToggleMyTasksSection" data-pass-el data-tooltip="Click to show or hide finished tasks">
        <span class="mytasks-toggle">&#9654;</span> Completed <span class="mytasks-section__count">${done.length}</span>
      </h2>
      <div class="mytasks-section__list hidden">${done.slice(0, 50).map(_myTaskRow).join('')}${done.length > 50 ? `<div style="color:var(--text-muted);font-size:0.8rem;padding:8px 16px">...and ${done.length - 50} more</div>` : ''}</div>
    </div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
}

