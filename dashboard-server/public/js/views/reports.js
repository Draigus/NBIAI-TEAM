// ==================== REPORT VIEW ====================
// Extracted from nbi_project_dashboard.html
// Executive report view: KPI strip, blocked/at-risk, project table,
// workload bars, progress tracking, and print support.

import { registerView } from '../core/router.js';

// ===== MODULE STATE =====
let _reportSubView = 'overall';
let _rptProjectSort = { col: 'client', dir: 'asc' };
let _rptProgressSort = { col: 'title', dir: 'asc' };

// ===== _act* WRAPPERS =====
function _actSetReportSubView(v) { _reportSubView = v; renderContent(); }
window._actSetReportSubView = _actSetReportSubView;

function _actToggleRptProgressSort(col) { _rptProgressSort = { col, dir: _rptProgressSort.col === col && _rptProgressSort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
window._actToggleRptProgressSort = _actToggleRptProgressSort;

function _actToggleRptProjectSort(col) { _rptProjectSort = { col, dir: _rptProjectSort.col === col && _rptProjectSort.dir === 'asc' ? 'desc' : 'asc' }; renderContent(); }
window._actToggleRptProjectSort = _actToggleRptProjectSort;

// ===== FUNCTIONS =====

// ==================== REPORT VIEW ====================

/** Render the executive report view: KPI strip, blocked/at-risk, project table, workload, and charts */
function renderReport(el) {
  // Skeleton placeholder while the initial sync/load is still in flight (O4)
  if (tasks.length === 0 && !window._initialLoadComplete) {
    el.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-card"></div>' +
      Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading report</span></div>';
    return;
  }
  // Respect practice filter (Glen 2026-04-16). Start from the practice-
  // scoped task set so KPIs, client cards, and project tables all narrow.
  let baseTasks = tasks;
  if (currentFilter.practice) baseTasks = tasks.filter(t => getTaskPractice(t) === currentFilter.practice);
  const scopedTasks = currentFilter.client ? baseTasks.filter(t => getTaskClient(t) === currentFilter.client) : baseTasks;
  const statusC = countByStatus(scopedTasks);
  const healthC = countByHealth(scopedTasks);
  const baseRoots = baseTasks.filter(t => !t.parentId);
  const roots = (currentFilter.client ? baseRoots.filter(r => getTaskClient(r) === currentFilter.client) : baseRoots)
    .filter(r => r.title && r.title.trim() !== 'New Task');
  const totalHrs = scopedTasks.reduce((s,t) => s + (t.hoursSpent||0), 0);
  const totalEst = scopedTasks.reduce((s,t) => s + (t.hoursEstimated||0), 0);
  const atRisk = scopedTasks.filter(t => t.healthState === 'Red' || t.healthState === 'Blocked');
  const clients = currentFilter.client ? [currentFilter.client] : [...new Set(baseTasks.map(t => getTaskClient(t)).filter(Boolean))].sort();
  const assigneeSet = new Set(); scopedTasks.forEach(t => { if (t.assignees) t.assignees.forEach(a => assigneeSet.add(a)); });
  const assignees = [...assigneeSet].sort();
  const donePct = scopedTasks.length ? Math.round((statusC['Done']||0) / scopedTasks.length * 100) : 0;
  const reportTitle = currentFilter.client ? `${currentFilter.client} Report` : 'NBI Portfolio Report';

  let html = renderClientProfileHeader();
  // Practice-mode banner (same as Dashboard/Projects/Finances)
  if (currentFilter.practice) {
    const p = PRACTICES.find(x => x.value === currentFilter.practice);
    if (p) {
      html += `<div class="practice-mode-banner" style="background:color-mix(in srgb, ${p.colour} 14%, var(--bg-raised));border:1px solid ${p.colour};border-left:4px solid ${p.colour};border-radius:var(--radius-md);padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.colour}"></span><strong style="font-size:0.85rem;color:var(--text-primary)">${esc(p.label)} mode</strong><span style="font-size:0.75rem;color:var(--text-muted);flex:1;min-width:200px">KPIs, client cards, and project tables are scoped to ${esc(p.label)} work only.</span><button class="btn btn--sm btn--ghost" data-action="filterByPractice" data-arg0="null">Exit ${esc(p.shortLabel || p.label)}</button></div>`;
    }
  }
  html += `<div class="report"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:var(--space-md)"><div><h1 style="margin:0">${esc(reportTitle)}</h1><div class="report__date">Generated ${new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}</div></div>
  <div class="task-subview-toggle">
    <button class="task-subview-btn ${_reportSubView==='overall'?'active':''}" data-action="_actSetReportSubView" data-arg0="overall">Overall</button>
    <button class="task-subview-btn ${_reportSubView==='byProject'?'active':''}" data-action="_actSetReportSubView" data-arg0="byProject">By Project</button>
    <button class="task-subview-btn ${_reportSubView==='byPerson'?'active':''}" data-action="_actSetReportSubView" data-arg0="byPerson">By Person</button>
  </div>${currentFilter.client ? `<button class="btn btn--primary" data-action="generateClientReport" data-arg0="${esc(currentFilter.client)}">&#128196; Generate Client Report</button>` : ''}</div>`;

  // ===== EXECUTIVE KPI STRIP (all views) =====
  html += `<div class="report__section"><div class="report-exec">
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--accent)">${scopedTasks.length}</div><div class="kpi-card__label">Total Items</div></div>
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--success)">${donePct}%</div><div class="kpi-card__label">Complete</div></div>
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--danger)">${atRisk.length}</div><div class="kpi-card__label">At Risk</div></div>
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--text-primary)">${totalHrs.toFixed(1)}</div><div class="kpi-card__label">Hours Spent</div></div>
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--text-muted)">${totalEst.toFixed(1)}</div><div class="kpi-card__label">Hours Est.</div></div>
  </div></div>`;

  // ===== CLIENT SUMMARY CARDS — projects grouped by client with progress bars =====
  const projectRows = roots.map(r => {
    const kids = getDescendants(r.id);
    const all = [r, ...kids];
    const d = all.filter(t => t.status === 'Done').length;
    const ip = all.filter(t => t.status === 'In progress').length;
    const bl = all.filter(t => t.healthState === 'Blocked').length;
    const pct = all.length ? Math.round(d / all.length * 100) : 0;
    const hEst = all.reduce((s,t) => s + (t.hoursEstimated||0), 0);
    const hSpent = all.reduce((s,t) => s + (t.hoursSpent||0), 0);
    const client = getTaskClient(r) || 'Unassigned';
    return { id: r.id, title: r.title, client, tasks: all.length, done: d, active: ip, blocked: bl, pct, estimate: hEst, actual: hSpent };
  });

  // Group projects by client
  const clientGroups = {};
  projectRows.forEach(r => {
    if (!clientGroups[r.client]) clientGroups[r.client] = { projects: [], totalTasks: 0, totalDone: 0, totalHours: 0, totalEst: 0 };
    clientGroups[r.client].projects.push(r);
    clientGroups[r.client].totalTasks += r.tasks;
    clientGroups[r.client].totalDone += r.done;
    clientGroups[r.client].totalHours += r.actual;
    clientGroups[r.client].totalEst += r.estimate;
  });
  const sortedClients = Object.keys(clientGroups).sort(clientSortOrder);

  html += `<div class="report__section"><h2>Client Overview</h2><div class="client-summary-grid">`;
  sortedClients.forEach(clientName => {
    const cg = clientGroups[clientName];
    const clientPct = cg.totalTasks > 0 ? Math.round(cg.totalDone / cg.totalTasks * 100) : 0;
    const cardId = 'clientCard_' + clientName.replace(/[^a-zA-Z0-9]/g, '_');
    const isExpanded = _expandedClientCards.has(clientName);

    // Derive client health from worst task health state
    const clientTasks = scopedTasks.filter(t => getTaskClient(t) === clientName);
    const hasRedOrBlocked = clientTasks.some(t => t.healthState === 'Red' || t.healthState === 'Blocked');
    const hasYellow = clientTasks.some(t => t.healthState === 'Yellow');
    const clientHealth = hasRedOrBlocked ? 'Red' : hasYellow ? 'Yellow' : 'Green';
    const healthColour = HEALTH_COLOURS[clientHealth] || 'var(--success)';

    // Primary contact from client brief
    const brief = clientBriefs[clientName];
    const primaryContact = brief?.contacts?.[0];

    // Overall progress bar segments
    const overallDonePct = cg.totalTasks > 0 ? (cg.totalDone / cg.totalTasks * 100) : 0;
    const totalActive = cg.projects.reduce((s, p) => s + p.active, 0);
    const overallActivePct = cg.totalTasks > 0 ? (totalActive / cg.totalTasks * 100) : 0;

    html += `<div class="client-summary-card ${isExpanded ? 'expanded' : ''}" id="${cardId}">`;

    // Header: badge + name + health dot
    html += `<div class="client-summary-card__header">`;
    html += clientBadgeHtml(clientName);
    html += `<span class="client-summary-card__name">${esc(clientName)}</span>`;
    html += `<span class="client-summary-card__health" style="background:${healthColour}" title="${clientHealth}"></span>`;
    html += `</div>`;

    // Primary contact
    if (primaryContact) {
      html += `<div class="client-summary-card__contact">${esc(primaryContact.name)} &middot; ${esc(primaryContact.role)}</div>`;
    } else {
      html += `<div class="client-summary-card__contact" style="font-style:italic">No primary contact set</div>`;
    }

    // Metrics row: projects count, progress bar, %, hours
    html += `<div class="client-summary-card__metrics">`;
    html += `<span class="client-summary-card__stat">${cg.projects.length} project${cg.projects.length !== 1 ? 's' : ''}</span>`;
    html += `<div class="client-summary-card__bar-wrap">`;
    html += `<div class="client-summary-card__bar">`;
    if (overallDonePct > 0) html += `<div class="client-summary-card__seg" style="width:${overallDonePct}%;background:var(--success)"></div>`;
    if (overallActivePct > 0) html += `<div class="client-summary-card__seg" style="width:${overallActivePct}%;background:var(--accent)"></div>`;
    html += `</div>`;
    html += `<span class="client-summary-card__stat" style="color:${clientPct >= 75 ? 'var(--success)' : clientPct >= 25 ? 'var(--accent)' : 'var(--text-muted)'}">${clientPct}%</span>`;
    html += `</div>`;
    html += `<span class="client-summary-card__stat">${cg.totalHours > 0 ? cg.totalHours.toFixed(1) + 'h' : '-'}</span>`;
    html += `</div>`;

    // Expand button
    html += `<button class="client-summary-card__expand-btn" data-action="toggleClientCard" data-stop data-arg0="${esc(clientName)}">${isExpanded ? '&#9650; Hide Projects' : '&#9660; Show Projects (' + cg.projects.length + ')'}</button>`;

    // Expandable project detail section
    html += `<div class="client-summary-card__projects">`;
    cg.projects.sort((a, b) => {
      const aComplete = a.pct === 100 || tasks.find(t => t.id === a.id)?.status === 'Done';
      const bComplete = b.pct === 100 || tasks.find(t => t.id === b.id)?.status === 'Done';
      if (aComplete !== bComplete) return aComplete ? 1 : -1;
      return a.pct - b.pct;
    }).forEach(p => {
      const rootTask = tasks.find(t => t.id === p.id);
      const isComplete = p.pct === 100 || rootTask?.status === 'Done';
      const donePctW = p.tasks > 0 ? (p.done / p.tasks * 100) : 0;
      const ipPctW = p.tasks > 0 ? (p.active / p.tasks * 100) : 0;
      const completeStyle = isComplete ? 'opacity:0.6;' : '';
      html += `<div class="client-summary-card__project" data-action="openDetailOverlay" data-arg0="${p.id}" style="cursor:pointer;${completeStyle}">`;
      html += `<span class="client-summary-card__pname" title="${esc(p.title)}">${isComplete ? '<span style="color:var(--success);margin-right:4px">&#10003;</span>' : ''}${esc(p.title)}</span>`;
      html += `<div class="client-summary-card__bar">`;
      if (donePctW > 0) html += `<div class="client-summary-card__seg" style="width:${donePctW}%;background:var(--success)"></div>`;
      if (ipPctW > 0) html += `<div class="client-summary-card__seg" style="width:${ipPctW}%;background:var(--accent)"></div>`;
      html += `</div>`;
      html += `<span class="client-summary-card__pct">${p.pct}%</span>`;
      html += `<span class="client-summary-card__hrs">${p.actual > 0 ? p.actual.toFixed(1) + 'h' : '-'}</span>`;
      html += `</div>`;
    });
    html += `</div>`; // end projects

    html += `</div>`; // end card
  });
  html += `</div></div>`;

  if (_reportSubView === 'overall' || _reportSubView === 'byProject') {

  // ===== BLOCKED & AT RISK — grouped by project, aligned columns =====
  const dashBlocked = scopedTasks.filter(t => t.healthState === 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled');
  const dashAtRisk = scopedTasks.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');

  // Group tasks by their root project for structured display
  const groupByProject = (items) => {
    const groups = {};
    items.forEach(t => {
      const root = getRootAncestor(t);
      const key = root.id;
      if (!groups[key]) groups[key] = { root, tasks: [] };
      if (t.id !== root.id) groups[key].tasks.push(t);
      else groups[key].isRootAtRisk = true;
    });
    return Object.values(groups).sort((a, b) => {
      const ca = getTaskClient(a.root) || 'zzz';
      const cb = getTaskClient(b.root) || 'zzz';
      return ca === cb ? a.root.title.localeCompare(b.root.title) : clientSortOrder(ca, cb);
    });
  };

  // Render a risk section (Blocked or At Risk) with project grouping
  const renderRiskSection = (items, healthType) => {
    const groups = groupByProject(items);
    let s = `<div class="risk-list">`;
    groups.forEach(g => {
      const projectClient = getTaskClient(g.root);
      const projectOwner = (g.root.assignees || []).join(', ') || 'Unassigned';
      // Project header row
      s += `<div class="risk-list__project" data-action="openDetailOverlay" data-arg0="${g.root.id}">`;
      s += `<span class="risk-list__col risk-list__col--client">${clientBadgeHtml(projectClient)}</span>`;
      s += `<span class="risk-list__col risk-list__col--assignee">${esc(projectOwner)}</span>`;
      s += `<span class="risk-list__col risk-list__col--title">${esc(g.root.title)}</span>`;
      s += `<span class="risk-list__col risk-list__col--health">${healthBadgeHtml(g.root.healthState || healthType)}</span>`;
      s += `</div>`;
      // Sub-task rows (indented)
      g.tasks.forEach(t => {
        const owner = (t.assignees || []).join(', ') || 'Unassigned';
        s += `<div class="risk-list__task" data-action="openDetailOverlay" data-arg0="${t.id}">`;
        s += `<span class="risk-list__col risk-list__col--client"></span>`;
        s += `<span class="risk-list__col risk-list__col--assignee">${esc(owner)}</span>`;
        s += `<span class="risk-list__col risk-list__col--title-indent">${esc(t.title)}</span>`;
        s += `<span class="risk-list__col risk-list__col--health">${healthBadgeHtml(t.healthState || healthType)}</span>`;
        s += `</div>`;
      });
    });
    s += `</div>`;
    return s;
  };

  if (dashBlocked.length > 0 || dashAtRisk.length > 0) {
    html += `<div class="report__section" style="display:grid;grid-template-columns:${dashBlocked.length > 0 && dashAtRisk.length > 0 ? '1fr 1fr' : '1fr'};gap:var(--space-lg)">`;
    if (dashBlocked.length > 0) {
      html += `<div><h2 style="color:var(--purple);margin-bottom:8px">&#128721; Blocked (${dashBlocked.length})</h2>`;
      html += renderRiskSection(dashBlocked, 'Blocked');
      html += `</div>`;
    }
    if (dashAtRisk.length > 0) {
      html += `<div><h2 style="color:var(--warning);margin-bottom:8px">&#9888; At Risk (${dashAtRisk.length})</h2>`;
      html += renderRiskSection(dashAtRisk, 'Red');
      html += `</div>`;
    }
    html += `</div>`;
  }

  // ===== PROJECT PORTFOLIO TABLE — sortable =====
  if (!_rptProjectSort) _rptProjectSort = { col: 'client', dir: 'asc' };
  if (!_rptProjectFilterClient) _rptProjectFilterClient = null;

  // projectRows already computed above (client summary section)

  // Filter by client if selected
  const filteredRows = _rptProjectFilterClient ? projectRows.filter(r => r.client === _rptProjectFilterClient) : projectRows;

  // Sort
  const sc = _rptProjectSort.col;
  const sd = _rptProjectSort.dir === 'asc' ? 1 : -1;
  filteredRows.sort((a, b) => {
    if (sc === 'client') return clientSortOrder(a.client, b.client) * sd;
    if (sc === 'title') return a.title.localeCompare(b.title) * sd;
    return ((a[sc] || 0) - (b[sc] || 0)) * sd;
  });

  // Unique clients for filter dropdown
  const rptClients = [...new Set(projectRows.map(r => r.client))].sort(clientSortOrder);

  html += `<div class="report__section"><h2>Project Portfolio</h2>`;
  html += `<div style="overflow-x:auto"><table class="report-table" style="width:100%;font-size:0.78rem">`;

  // Sortable header helper
  const sortTh = (col, label, align) => {
    const isActive = _rptProjectSort.col === col;
    const arrow = isActive ? (_rptProjectSort.dir === 'asc' ? ' &#9650;' : ' &#9660;') : '';
    const style = align === 'right' ? 'text-align:right;' : '';
    return `<th style="${style}cursor:pointer;user-select:none;white-space:nowrap${isActive ? ';color:var(--accent)' : ''}" data-action="_actToggleRptProjectSort" data-arg0="${col}">${label}${arrow}</th>`;
  };

  html += `<thead><tr>`;
  html += sortTh('title', 'Project', 'left');
  // Client column with filter dropdown
  html += `<th style="cursor:pointer;white-space:nowrap" data-stop><select onchange="_rptProjectFilterClient=this.value||null;renderContent()" style="background:transparent;border:none;color:var(--text-primary);font-size:0.72rem;font-weight:600;cursor:pointer;padding:0"><option value="">Client</option>${rptClients.map(c => `<option value="${esc(c)}" ${_rptProjectFilterClient===c?'selected':''}>${esc(c)}</option>`).join('')}</select></th>`;
  html += sortTh('tasks', 'Tasks', 'right');
  html += sortTh('done', 'Done', 'right');
  html += sortTh('active', 'Active', 'right');
  html += sortTh('blocked', 'Blocked', 'right');
  html += sortTh('pct', '%', 'right');
  html += sortTh('estimate', 'Estimate', 'right');
  html += sortTh('actual', 'Actual', 'right');
  html += `</tr></thead><tbody>`;

  filteredRows.forEach(r => {
    const pctBar = `<div style="display:flex;align-items:center;gap:4px;justify-content:flex-end"><div style="width:40px;height:6px;background:var(--border-default);border-radius:3px;overflow:hidden"><div style="height:100%;width:${r.pct}%;background:${r.pct >= 75 ? 'var(--success)' : r.pct >= 25 ? 'var(--accent)' : 'var(--text-muted)'};border-radius:3px"></div></div><span>${r.pct}%</span></div>`;
    html += `<tr class="report-table__clickable" data-action="filterByProject" data-arg0="${r.id}">`;
    html += `<td><strong>${esc(r.title)}</strong></td>`;
    html += `<td>${clientBadgeHtml(r.client)} <span style="font-size:0.72rem">${esc(r.client)}</span></td>`;
    html += `<td style="text-align:right">${r.tasks}</td>`;
    html += `<td style="text-align:right;color:var(--success)">${r.done}</td>`;
    html += `<td style="text-align:right;color:var(--accent)">${r.active}</td>`;
    html += `<td style="text-align:right;color:${r.blocked > 0 ? 'var(--danger)' : 'var(--text-muted)'};font-weight:${r.blocked > 0 ? '700' : '400'}">${r.blocked}</td>`;
    html += `<td style="text-align:right">${pctBar}</td>`;
    html += `<td style="text-align:right;font-family:var(--font-mono)">${r.estimate > 0 ? r.estimate.toFixed(1) + 'h' : '-'}</td>`;
    html += `<td style="text-align:right;font-family:var(--font-mono);color:${r.actual > r.estimate && r.estimate > 0 ? 'var(--danger)' : 'var(--text-primary)'}">${r.actual > 0 ? r.actual.toFixed(1) + 'h' : '-'}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table></div></div>`;

  } // end byProject

  if (_reportSubView === 'overall' || _reportSubView === 'byPerson') {
  // ===== WORKLOAD BY ASSIGNEE (horizontal stacked bars) =====
  html += `<div class="report__section"><h2>Workload by Assignee</h2>`;
  html += `<div class="report-workload">`;
  const maxAssigneeTasks = Math.max(...assignees.map(a => scopedTasks.filter(t => t.assignees && t.assignees.includes(a)).length), 1);
  assignees.forEach(a => {
    const at = scopedTasks.filter(t => t.assignees && t.assignees.includes(a));
    const aDone = at.filter(t => t.status === 'Done').length;
    const aIp = at.filter(t => t.status === 'In progress').length;
    const aBlocked = at.filter(t => t.healthState === 'Blocked').length;
    const aOther = at.length - aDone - aIp - aBlocked;
    const hs = at.reduce((s,t) => s + (t.hoursSpent||0), 0);
    const he = at.reduce((s,t) => s + (t.hoursEstimated||0), 0);
    const barW = (at.length / maxAssigneeTasks * 100);

    html += `<div class="rw-row">`;
    html += `<div class="rw-name">${esc(a)}</div>`;
    html += `<div class="rw-bar-wrap">`;
    html += `<div class="rw-bar" style="width:${barW}%">`;
    if (aDone > 0) html += `<div class="rw-seg" style="flex:${aDone};background:var(--success)" title="Done: ${aDone}"></div>`;
    if (aIp > 0) html += `<div class="rw-seg" style="flex:${aIp};background:var(--accent)" title="In Progress: ${aIp}"></div>`;
    if (aBlocked > 0) html += `<div class="rw-seg" style="flex:${aBlocked};background:var(--danger)" title="Blocked: ${aBlocked}"></div>`;
    if (aOther > 0) html += `<div class="rw-seg" style="flex:${aOther};background:var(--text-muted)" title="Other: ${aOther}"></div>`;
    html += `</div></div>`;
    html += `<div class="rw-nums"><span>${at.length} item${at.length === 1 ? '' : 's'}</span><span>${hs.toFixed(1)}h / ${he.toFixed(1)}h</span></div>`;
    html += `</div>`;
  });
  // Unassigned
  const unassigned = scopedTasks.filter(t => !t.assignees || t.assignees.length === 0);
  if (unassigned.length > 0) {
    const barW = (unassigned.length / maxAssigneeTasks * 100);
    html += `<div class="rw-row"><div class="rw-name" style="color:var(--text-muted);font-style:italic">Unassigned</div><div class="rw-bar-wrap"><div class="rw-bar" style="width:${barW}%"><div class="rw-seg" style="flex:1;background:var(--border-default)"></div></div></div><div class="rw-nums"><span>${unassigned.length} tasks</span></div></div>`;
  }
  html += `</div></div>`;

  } // end byPerson

  // ===== HEALTH & STATUS DISTRIBUTION (overall only) =====
  if (_reportSubView === 'overall') {
  html += `<div class="report__section"><h2>Distribution</h2><div class="charts-grid">
    <div class="chart-card"><div class="chart-card__title">Health</div><div class="chart-card__body">${renderDonutChart(healthC, HEALTH_COLOURS_HEX, scopedTasks.length)}</div></div>
    <div class="chart-card"><div class="chart-card__title">Status</div><div class="chart-card__body">${renderBarChart(statusC, STATUS_COLOURS_HEX)}</div></div>
  </div></div>`;

  } // end overall distribution

  if (_reportSubView === 'overall' || _reportSubView === 'byProject') {
  // ===== DETAILED PROJECT TABLE (clickable, sortable) =====
  // Build row data once so we can sort independently of render.
  const progressRows = roots.map(r => {
    const kids = getDescendants(r.id);
    const all = [r, ...kids];
    const d = all.filter(t => t.status === 'Done').length;
    const ip = all.filter(t => t.status === 'In progress').length;
    const bl = all.filter(t => t.healthState === 'Blocked').length;
    const pct = all.length ? Math.round(d/all.length*100) : 0;
    const hS = all.reduce((s,t) => s + (t.hoursSpent||0), 0);
    const hE = all.reduce((s,t) => s + (t.hoursEstimated||0), 0);
    return {
      id: r.id,
      title: r.title || '',
      client: getTaskClient(r) || '',
      tasks: all.length,
      done: d,
      active: ip,
      blocked: bl,
      pct,
      estimate: hE,
      actual: hS
    };
  });
  const pgSc = _rptProgressSort.col;
  const pgSd = _rptProgressSort.dir === 'asc' ? 1 : -1;
  progressRows.sort((a, b) => {
    if (pgSc === 'title') return (a.title || '').localeCompare(b.title || '') * pgSd;
    if (pgSc === 'client') return clientSortOrder(a.client, b.client) * pgSd;
    return ((a[pgSc] || 0) - (b[pgSc] || 0)) * pgSd;
  });

  // Clickable header helper — mirrors the Project Portfolio table pattern.
  const pgSortTh = (col, label, align) => {
    const isActive = _rptProgressSort.col === col;
    const arrow = isActive ? (_rptProgressSort.dir === 'asc' ? ' &#9650;' : ' &#9660;') : '';
    const style = align === 'right' ? 'text-align:right;' : '';
    return `<th style="${style}cursor:pointer;user-select:none;white-space:nowrap${isActive ? ';color:var(--accent)' : ''}" data-action="_actToggleRptProgressSort" data-arg0="${col}">${label}${arrow}</th>`;
  };

  html += `<div class="report__section"><h2>Progress by Project</h2><table class="report-table"><thead><tr>`;
  html += pgSortTh('title', 'Project', 'left');
  html += pgSortTh('client', 'Client', 'left');
  html += pgSortTh('tasks', 'Tasks', 'left');
  html += pgSortTh('done', 'Done', 'left');
  html += pgSortTh('active', 'Active', 'left');
  html += pgSortTh('blocked', 'Blocked', 'left');
  html += pgSortTh('pct', '%', 'left');
  html += pgSortTh('estimate', 'Est.', 'left');
  html += pgSortTh('actual', 'Actual', 'left');
  html += `</tr></thead><tbody>`;
  progressRows.forEach(r => {
    html += `<tr class="report-table__clickable" data-action="_actFilterClientAndOpenTask" data-arg0="${esc(r.client)}" data-arg1="${r.id}">
      <td><strong>${esc(r.title)}</strong></td><td>${esc(r.client)}</td><td>${r.tasks}</td><td style="color:var(--success)">${r.done}</td><td style="color:var(--accent)">${r.active}</td><td style="color:${r.blocked>0?'var(--danger)':'inherit'}">${r.blocked}</td>
      <td><div style="display:flex;align-items:center;gap:6px"><div style="width:50px;height:6px;background:var(--border-subtle);border-radius:3px;overflow:hidden"><div style="width:${r.pct}%;height:100%;background:var(--success);border-radius:3px"></div></div><span style="font-family:var(--font-mono)">${r.pct}%</span></div></td>
      <td style="font-family:var(--font-mono)">${r.estimate.toFixed(1)}h</td><td style="font-family:var(--font-mono);color:${r.actual>r.estimate&&r.estimate>0?'var(--danger)':'inherit'}">${r.actual.toFixed(1)}h</td></tr>`;
  });
  html += `</tbody></table></div>`;

  } // end byProject table

  if (_reportSubView === 'overall' || _reportSubView === 'byPerson') {
  // ===== WORKLOAD TABLE (clickable) =====
  html += `<div class="report__section"><h2>Assignee Detail</h2><table class="report-table"><thead><tr><th>Assignee</th><th>Assigned</th><th>Done</th><th>In Progress</th><th>Blocked</th><th>Hours Spent</th><th>Hours Est.</th><th>Utilisation</th></tr></thead><tbody>`;
  assignees.forEach(a => {
    const at = scopedTasks.filter(t => t.assignees && t.assignees.includes(a));
    const d = at.filter(t => t.status === 'Done').length;
    const ip = at.filter(t => t.status === 'In progress').length;
    const bl = at.filter(t => t.healthState === 'Blocked').length;
    const hs = at.reduce((s,t) => s + (t.hoursSpent||0), 0);
    const he = at.reduce((s,t) => s + (t.hoursEstimated||0), 0);
    const util = he > 0 ? Math.round(hs / he * 100) : 0;
    html += `<tr><td>${esc(a)}</td><td>${at.length}</td><td>${d}</td><td>${ip}</td><td>${bl}</td><td style="font-family:var(--font-mono)">${hs.toFixed(1)}h</td><td style="font-family:var(--font-mono)">${he.toFixed(1)}h</td><td style="font-family:var(--font-mono);color:${util>100?'var(--danger)':util>80?'var(--warning)':'inherit'}">${util}%</td></tr>`;
  });
  html += `</tbody></table></div>`;

  } // end byPerson table

  // ===== CLIENT SUMMARY =====
  if (!currentFilter.client) {
    html += `<div class="report__section"><h2>Client Summary</h2><table class="report-table"><thead><tr><th>Client</th><th>Projects</th><th>Tasks</th><th>Hours Spent</th><th>Cost (&pound;)</th></tr></thead><tbody>`;
    clients.forEach(c => {
      const ct = scopedTasks.filter(t => getTaskClient(t) === c);
      const proj = new Set(ct.map(t => getRootAncestor(t).title)).size;
      const hrs = ct.reduce((s,t) => s + (t.hoursSpent||0), 0);
      html += `<tr class="report-table__clickable" data-action="_actFilterClientReport" data-arg0="${esc(c)}"><td>${esc(c)}</td><td>${proj}</td><td>${ct.length}</td><td style="font-family:var(--font-mono)">${hrs.toFixed(1)}h</td><td style="font-family:var(--font-mono)">&pound;${(hrs * settings.hourlyRate).toLocaleString()}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // ===== AT-RISK ITEMS (clickable) =====
  if (atRisk.length > 0) {
    html += `<div class="report__section"><h2>At-Risk Items</h2><table class="report-table"><thead><tr><th>Task</th><th>Project</th><th>Health</th><th>Status</th><th>Assignee</th></tr></thead><tbody>`;
    atRisk.forEach(t => {
      const root = getRootAncestor(t);
      html += `<tr class="report-table__clickable" data-action="_actSwitchAndOpenDetail" data-arg0="${t.id}"><td>${esc(t.title)}</td><td>${esc(root.title)}</td><td>${healthBadgeHtml(t.healthState)}</td><td>${statusBadgeHtml(t.status)}</td><td>${esc((t.assignees||[]).join(', '))}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
  if (currentFilter.client && _profileExpanded[currentFilter.client.replace(/[^a-zA-Z0-9]/g, '_')]) {
    setTimeout(() => loadClientNotes(currentFilter.client), 50);
  }
}

/** Trigger the browser's print dialog after a short delay for rendering */
function printReport() { setTimeout(() => window.print(), 200); }


// ===== WINDOW REGISTRATIONS =====
window.renderReport = renderReport;
window.printReport = printReport;

// ===== REGISTER VIEW =====
registerView("report", renderReport);
