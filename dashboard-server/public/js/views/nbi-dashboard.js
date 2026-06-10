// ==================== DASHBOARD VIEW ====================

/** Render a generic empty-state placeholder with icon, title, and description */
function emptyState(icon, title, desc) {
  return `<div class="empty-state"><div class="empty-state__icon" style="font-size:2rem">${icon}</div><div class="empty-state__title">${title}</div><div class="empty-state__desc">${desc}</div></div>`;
}

/** Render the main workload dashboard -- date header, client profile, and tactical view */
function renderDashboard(el) {
  let html = renderClientProfileHeader();

  // Load client notes if profile is expanded
  if (currentFilter.client && _profileExpanded[currentFilter.client.replace(/[^a-zA-Z0-9]/g, '_')]) {
    setTimeout(() => loadClientNotes(currentFilter.client), 50);
  }

  // Load milestones for the current client if not cached
  if (currentFilter.client) {
    const clientObj = _apiClientsCache[currentFilter.client];
    if (clientObj && !_milestonesCache[clientObj.id]) {
      loadMilestones(clientObj.id).then(() => renderContent());
    }
  }

  // Practice-mode banner — same affordance as the Projects view so Glen
  // can see the filter is active (Glen 2026-04-16: "dashboard does not
  // filter" — it does, via getFilteredTasks(), but there was no visual cue).
  if (currentFilter.practice) {
    const p = PRACTICES.find(x => x.value === currentFilter.practice);
    if (p) {
      html += `<div class="practice-mode-banner" style="background:color-mix(in srgb, ${p.colour} 14%, var(--bg-raised));border:1px solid ${p.colour};border-left:4px solid ${p.colour};border-radius:var(--radius-md);padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.colour}"></span><strong style="font-size:0.85rem;color:var(--text-primary)">${esc(p.label)} mode</strong><span style="font-size:0.75rem;color:var(--text-muted);flex:1;min-width:200px">All metrics below are scoped to tasks tagged Practice = ${esc(p.label)}.</span><button class="btn btn--sm btn--ghost" data-action="filterByPractice" data-arg0="null">Exit ${esc(p.shortLabel || p.label)}</button></div>`;
    }
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const headerDateEl = document.getElementById('headerDate');
  if (headerDateEl) headerDateEl.textContent = dateStr;

  // Load snapshots for trend deltas + Work Completed chart
  if (!_portfolioSnapshots) {
    loadDashboardSnapshots().then(() => {
      if (currentView === 'dashboard') renderContent();
    });
  }
  if (_portfolioLeadCount === null) {
    loadPortfolioLeadCount().then(() => {
      if (currentView === 'dashboard') renderContent();
    });
  }
  if (!_leadsConfig) {
    loadLeadsConfig().then(() => {
      if (currentView === 'dashboard') renderContent();
    });
  }
  if (!_milestonesLoaded) {
    loadAllMilestones().then(() => {
      if (currentView === 'dashboard') renderContent();
    });
  }

  html += renderPortfolioDashboard();

  el.innerHTML = html;
}

function renderWorkloadView(el) {
  let html = renderClientProfileHeader();
  if (currentFilter.client && _profileExpanded[currentFilter.client.replace(/[^a-zA-Z0-9]/g, '_')]) {
    setTimeout(() => loadClientNotes(currentFilter.client), 50);
  }
  html += renderTacticalDashboard();
  el.innerHTML = html;
  const standupExpanded = sessionStorage.getItem('nbi_standup_expanded') === '1';
  if (standupExpanded) _loadStandupContent();
}

// ===== TACTICAL DASHBOARD — "What needs attention right now?" =====
/** Build the tactical dashboard HTML: metrics strip, overdue/this-week panels, blocked/at-risk, standup */
function renderTacticalDashboard() {
  const filtered = getFilteredTasks();
  const now = new Date(); now.setHours(0,0,0,0);
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

  // Compute data
  const overdueTasks = filtered.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now)
    .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
  const blockedTasks = filtered.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
  const redHealth = filtered.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');

  let html = '';

  /** Return severity styling (background, font weight, icon) based on days overdue */
  function lateSeverity(daysLate) {
    if (daysLate >= 14) return { bg: 'color-mix(in srgb, var(--danger) 20%, transparent)', weight: '700', icon: '&#9888;' };
    if (daysLate >= 7) return { bg: 'color-mix(in srgb, var(--danger) 12%, transparent)', weight: '600', icon: '' };
    if (daysLate >= 4) return { bg: 'color-mix(in srgb, var(--warning) 10%, transparent)', weight: '500', icon: '' };
    return { bg: 'transparent', weight: '400', icon: '' };
  }

  // GRID: Overdue | Imminent | Blocked | At Risk — 4 columns on widescreen
  html += `<div class="tactical-grid">`;

  // Column 1: Overdue
  html += `<div class="tactical-section" id="tactOverdue">`;
  const sectionClient = currentFilter.client ? currentFilter.client + ' — ' : '';
  html += `<div class="tactical-section__header"><span class="tactical-section__title" style="color:var(--danger)">&#9888; ${sectionClient}Overdue (${overdueTasks.length})</span></div>`;
  if (overdueTasks.length === 0) {
    html += `<div class="tactical-empty">No overdue tasks</div>`;
  } else {
    // Group by client when viewing portfolio (no client filter)
    const overdueByClient = {};
    overdueTasks.forEach(t => {
      const c = getTaskClient(t) || 'Unassigned';
      if (!overdueByClient[c]) overdueByClient[c] = [];
      overdueByClient[c].push(t);
    });
    const overdueClients = Object.keys(overdueByClient).sort();
    const showClientGroups = !currentFilter.client && overdueClients.length > 1;

    overdueClients.forEach(client => {
      if (showClientGroups) {
        html += `<div style="font-size:0.75rem;font-weight:600;color:var(--text-muted);padding:8px 0 4px;border-bottom:1px solid var(--border-subtle);margin-top:4px">${clientBadgeHtml(client)} ${esc(client)}</div>`;
      }
      overdueByClient[client].forEach(t => {
        const daysLate = Math.ceil((now - safeParseDate(t.dueDate)) / (1000 * 60 * 60 * 24));
        const sev = lateSeverity(daysLate);
        const owner = (t.assignees || []).join(', ') || 'Unassigned';
        html += `<div class="tactical-item tactical-item--danger" data-action="openDetailOverlay" data-arg0="${t.id}" style="background:${sev.bg}">
          ${!showClientGroups ? clientBadgeHtml(getTaskClient(t)) : ''}
          <span class="tactical-item__title">${esc(t.title)}</span>
          <span class="tactical-item__assignee">${esc(owner)}</span>
          <span class="tactical-item__meta" style="color:var(--danger);font-weight:${sev.weight}">${sev.icon}${daysLate}d late</span>
        </div>`;
      });
    });
  }
  html += `</div>`; // close Overdue column

  // Column 2: This Week (combines Imminent + Due This Week, sorted soonest first)
  const thisWeekCombined = filtered.filter(t => {
    if (!t.dueDate || t.status === 'Done' || t.status === 'Cancelled') return false;
    const d = safeParseDate(t.dueDate);
    return d && d >= now && d <= weekEnd;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  html += `<div class="tactical-section" id="tactThisWeek">`;
  html += `<div class="tactical-section__header"><span class="tactical-section__title" style="color:var(--warning)">&#128197; ${sectionClient}This Week (${thisWeekCombined.length})</span></div>`;
  if (thisWeekCombined.length === 0) {
    html += `<div class="tactical-empty">Nothing due this week</div>`;
  } else {
    thisWeekCombined.forEach(t => {
      const d = safeParseDate(t.dueDate);
      const daysUntil = Math.ceil((d - now) / 86400000);
      const dayLabel = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const urgentColour = daysUntil <= 1 ? 'var(--danger)' : daysUntil <= 3 ? 'var(--warning)' : 'var(--text-muted)';
      const owner = (t.assignees || []).join(', ') || 'Unassigned';
      html += `<div class="tactical-item" data-action="openDetailOverlay" data-arg0="${t.id}" style="border-left:3px solid ${urgentColour}">
        ${clientBadgeHtml(getTaskClient(t))}
        <span class="tactical-item__title">${esc(t.title)}</span>
        <span class="tactical-item__assignee">${esc(owner)}</span>
        <span class="tactical-item__meta" style="color:${urgentColour};font-weight:600">${dayLabel}</span>
      </div>`;
    });
  }
  html += `</div>`; // close This Week section

  // Blocked — always render tile for consistent 4-column layout
  html += `<div class="tactical-section" id="tactBlocked">`;
  html += `<div class="tactical-section__header"><span class="tactical-section__title" style="color:var(--danger)">&#128721; Blocked (${blockedTasks.length})</span></div>`;
  if (blockedTasks.length === 0) {
    html += `<div class="tactical-empty">No blocked tasks</div>`;
  } else {
    blockedTasks.forEach(t => {
      const owner = (t.assignees || []).join(', ') || 'Unassigned';
      html += `<div class="tactical-item" data-action="openDetailOverlay" data-arg0="${t.id}" style="border-left:3px solid var(--purple)">
        ${clientBadgeHtml(getTaskClient(t))}
        <span class="tactical-item__title">${esc(t.title)}</span>
        <span class="tactical-item__assignee">${esc(owner)}</span>
      </div>`;
    });
  }
  html += `</div>`;

  // At Risk — always render tile for consistent 4-column layout
  html += `<div class="tactical-section" id="tactAtRisk">`;
  html += `<div class="tactical-section__header"><span class="tactical-section__title" style="color:var(--warning)">&#9888; At Risk (${redHealth.length})</span></div>`;
  if (redHealth.length === 0) {
    html += `<div class="tactical-empty">No at-risk tasks</div>`;
  } else {
    redHealth.forEach(t => {
      const owner = (t.assignees || []).join(', ') || 'Unassigned';
      html += `<div class="tactical-item" data-action="openDetailOverlay" data-arg0="${t.id}" style="border-left:3px solid var(--warning)">
        ${clientBadgeHtml(getTaskClient(t))}
        <span class="tactical-item__title">${esc(t.title)}</span>
        <span class="tactical-item__assignee">${esc(owner)}</span>
        ${healthBadgeHtml(t.healthState)}
      </div>`;
    });
  }
  html += `</div>`;

  html += `</div>`; // close tactical-grid

  // Standup view: work by NBI team member, grouped by client.
  // Phase 12.2 / 12.4 — collapsed by default to reduce dashboard cognitive load.
  // Persists per-session via sessionStorage so the user's preference survives
  // re-renders within the session but resets fresh each new tab/session.
  const standupExpanded = sessionStorage.getItem('nbi_standup_expanded') === '1';
  html += `<div style="margin-top:var(--space-lg)">
    <button aria-expanded="${standupExpanded}" aria-controls="standupContainer" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 0;font:inherit;color:inherit;background:none;border:none;text-align:left;width:100%" data-action="_actToggleStandupSection" data-pass-el>
      <span class="standup-chevron" style="font-size:0.75rem;color:var(--text-muted);width:14px">${standupExpanded ? '\u25BC' : '\u25B6'}</span>
      <span style="font-size:0.9rem;font-weight:600">&#128101; Team Standup - Work by Person</span>
      <span class="standup-hint" style="font-size:0.75rem;color:var(--text-muted);font-weight:400">${standupExpanded ? '(click to collapse)' : '(click to expand)'}</span>
    </button>
    <div id="standupContainer" style="display:${standupExpanded ? 'block' : 'none'}"><div style="text-align:center;color:var(--text-muted);padding:20px">Loading team...</div></div>
  </div>`;

  return html;
}

/** Toggle client summary card expansion in report view */
function toggleClientCard(clientName) {
  if (_expandedClientCards.has(clientName)) {
    _expandedClientCards.delete(clientName);
  } else {
    _expandedClientCards.add(clientName);
  }
  const card = document.getElementById('clientCard_' + clientName.replace(/[^a-zA-Z0-9]/g, '_'));
  if (card) card.classList.toggle('expanded');
}

function getClientAbbreviation(clientName) {
  if (!clientName) return '';
  const brief = clientBriefs[clientName];
  if (brief && brief.abbreviation) return brief.abbreviation;
  if (clientName.length <= 4 || clientName === clientName.toUpperCase()) return clientName;
  return clientName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3);
}

// ===== PORTFOLIO DASHBOARD v5 — Neumorphic KPI + table + panels =====
function renderPortfolioDashboard() {
  const filtered = getFilteredTasks();
  const now = new Date(); now.setHours(0,0,0,0);

  const roots = filtered.filter(t => !t.parentId && t.title && t.title.trim() !== 'New Task');
  const activeRoots = roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const overdueTasks = filtered.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
  const blockedTasks = filtered.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
  const atRiskTasks = filtered.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');

  const needsAttentionIds = new Set([...overdueTasks.map(t => t.id), ...blockedTasks.map(t => t.id)]);
  const needsAttentionCount = needsAttentionIds.size;
  const uniqueProblemIds = new Set([...overdueTasks.map(t => t.id), ...atRiskTasks.map(t => t.id)]);
  const onTrackCount = Math.max(0, activeRoots.length - uniqueProblemIds.size);

  const snap7 = _portfolioSnapshots ? _portfolioSnapshots.find(s => {
    const ago = new Date(now); ago.setDate(ago.getDate() - 7);
    const agoStr = ago.getFullYear() + '-' + String(ago.getMonth()+1).padStart(2,'0') + '-' + String(ago.getDate()).padStart(2,'0');
    return (s.snapshot_date || '').slice(0,10) === agoStr;
  }) : null;

  const panelTasks = _portfolioSelectedClient
    ? filtered.filter(t => getTaskClient(t) === _portfolioSelectedClient)
    : filtered;
  const panelRoots = _portfolioSelectedClient
    ? roots.filter(r => getTaskClient(r) === _portfolioSelectedClient)
    : roots;

  let html = '<div class="pf">';
  html += renderPfStrip(activeRoots.length, onTrackCount, needsAttentionCount, atRiskTasks.length, snap7);

  html += '<div class="pf__row">';
  html += renderPfClientTable(filtered, roots, now);
  html += renderPfProgressStatus(panelTasks);
  html += '</div>';

  html += '<div class="pf__pgrid pf__pgrid--auto">';
  html += renderPfCompletingSoon(panelRoots, now);
  html += renderPfMilestones(panelRoots, now);
  html += '</div>';

  html += '<div class="pf__pgrid pf__pgrid--fill">';
  html += renderPfNeedsAttention(panelTasks, now);
  html += renderPfTeamWorkload(panelTasks);
  html += '</div>';

  html += '</div>';
  return html;
}

async function loadActivityFeed() {
  const container = document.getElementById('activityFeedContainer');
  if (!container) return;
  try {
    const resp = await authFetch('/api/dashboard/activity?limit=15');
    if (!resp.ok) { container.textContent = 'Failed to load'; return; }
    const rawItems = await resp.json();
    const items = rawItems.filter(a => a.action !== 'delete' && a.action !== 'cascade_cancel');
    if (items.length === 0) { container.innerHTML = '<div style="padding:12px;color:var(--text-muted)">No recent activity</div>'; return; }
    const actionLabels = { create: 'created', update: 'updated' };
    const typeIcons = { task: '☑', client: '🏢', candidate: '👤', lead: '💼', bug: '🐛', finance: '💰' };
    container.innerHTML = items.map(a => {
      const icon = typeIcons[a.entity_type] || '•';
      const action = actionLabels[a.action] || a.action;
      const title = a.entity_title ? ' "' + esc(a.entity_title.substring(0, 40)) + '"' : '';
      const ago = timeAgo(new Date(a.created_at));
      let detail = '';
      if (a.changes && typeof a.changes === 'object') {
        if (a.changes.stage) detail = ' → ' + esc(a.changes.stage);
        else if (a.changes.status) detail = ' → ' + esc(a.changes.status);
        else if (a.changes.fields) detail = ' (' + esc(String(a.changes.fields).substring(0, 30)) + ')';
      }
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-bottom:1px solid var(--border-subtle)">' +
        '<span style="font-size:14px;width:20px;text-align:center">' + icon + '</span>' +
        '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><strong>' + esc(a.changed_by || 'System') + '</strong> ' + action + ' ' + a.entity_type + title + '<span style="color:var(--text-muted)">' + detail + '</span></span>' +
        '<span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap">' + ago + '</span></div>';
    }).join('');
  } catch (e) { container.textContent = 'Error loading feed'; }
}

async function loadHealthScores() {
  const container = document.getElementById('healthScoresContainer');
  if (!container) return;
  try {
    const resp = await authFetch('/api/dashboard/health-scores');
    if (!resp.ok) { container.textContent = 'Failed to load'; return; }
    const scores = await resp.json();
    if (scores.length === 0) { container.innerHTML = '<div style="padding:12px;color:var(--text-muted)">No clients with tasks</div>'; return; }
    container.innerHTML = scores.map(s => {
      const gradeColour = s.grade === 'green' ? 'var(--success)' : s.grade === 'amber' ? 'var(--warning)' : 'var(--danger)';
      const factors = s.factors.length > 0 ? s.factors.map(f => f.label + ' (' + f.count + ')').join(', ') : 'All clear';
      return '<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-bottom:1px solid var(--border-subtle);cursor:pointer" onclick="switchView(\'tasks\');setFilter({client:\'' + esc(s.name) + '\'})">' +
        '<div style="width:44px;height:44px;border-radius:50%;background:' + gradeColour + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.95rem">' + s.score + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:0.85rem">' + esc(s.name) + '</div>' +
        '<div style="font-size:0.75rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(factors) + '</div></div></div>';
    }).join('');
  } catch (e) { container.textContent = 'Error loading scores'; }
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

function renderPfStrip(activeCount, onTrackCount, needsAttentionCount, atRiskCount, snap7) {
  function delta(current, field, invertGood) {
    if (!snap7) return '';
    const prev = parseFloat(snap7[field]) || 0;
    const diff = current - prev;
    if (diff === 0) return '';
    const arrow = diff > 0 ? '▲' : '▼';
    const sign = diff > 0 ? '+' : '';
    const isGood = invertGood ? diff < 0 : diff > 0;
    const col = isGood ? 'var(--success)' : 'var(--danger)';
    return '<span class="pf__kpi-delta" style="color:' + col + '">' + arrow + ' ' + sign + Math.round(diff) + '</span><span class="pf__kpi-delta-text">vs last week</span>';
  }

  const allMs = [];
  const now = new Date(); now.setHours(0,0,0,0);
  Object.entries(_milestonesCache).forEach(function(entry) {
    var milestones = entry[1];
    milestones.forEach(function(ms) {
      var d = safeParseDate(ms.target_date);
      if (d && d >= now) allMs.push({ title: ms.title, days: Math.ceil((d - now) / 86400000) });
    });
  });
  allMs.sort(function(a, b) { return a.days - b.days; });
  var nearestMs = allMs[0];

  var items = [
    { val: activeCount, label: 'Active Engagements', style: '', delta: delta(activeCount, 'active_projects', false) },
    { val: onTrackCount, label: 'On Track', style: '', delta: delta(onTrackCount, 'on_track_count', false) },
    { val: needsAttentionCount, label: 'Needs Attention', style: 'color:var(--warning)', delta: (function() { if (!snap7) return ''; var prev = (parseFloat(snap7.overdue_count) || 0) + (parseFloat(snap7.blocked_count) || 0); var diff = needsAttentionCount - prev; if (diff === 0) return ''; var arrow = diff > 0 ? '▲' : '▼'; var sign = diff > 0 ? '+' : ''; var col = diff < 0 ? 'var(--success)' : 'var(--danger)'; return '<span class="pf__kpi-delta" style="color:' + col + '">' + arrow + ' ' + sign + Math.round(diff) + '</span><span class="pf__kpi-delta-text">vs last week</span>'; })() },
    { val: atRiskCount, label: 'At Risk', style: 'color:var(--danger);text-shadow:0 0 20px rgba(255,71,87,0.2)', delta: delta(atRiskCount, 'at_risk_count', true) },
  ];

  var html = '<div class="pf__kpis">';
  items.forEach(function(i) {
    html += '<div class="pf__kpi">';
    html += '<div class="pf__kpi-label">' + i.label + '</div>';
    html += '<div class="pf__kpi-center">';
    html += '<div class="pf__kpi-val"' + (i.style ? ' style="' + i.style + '"' : '') + '>' + i.val + '</div>';
    if (i.delta) html += '<div class="pf__kpi-delta-row">' + i.delta + '</div>';
    html += '</div></div>';
  });

  // 5th KPI: Upcoming Milestones
  html += '<div class="pf__kpi">';
  html += '<div class="pf__kpi-label">Upcoming Milestones</div>';
  html += '<div class="pf__kpi-center">';
  html += '<div class="pf__kpi-val">' + allMs.length + '</div>';
  if (nearestMs) {
    html += '<div class="pf__kpi-delta-row"><span class="pf__kpi-delta" style="color:var(--text-secondary)">Next in ' + nearestMs.days + 'd</span></div>';
    html += '<div class="pf__kpi-delta-text">' + esc(nearestMs.title) + '</div>';
  }
  html += '</div></div>';

  html += '</div>';
  return html;
}


function renderPfClientTable(filtered, roots, now) {
  const clientMap = {};
  roots.forEach(r => {
    const client = getTaskClient(r);
    if (!client) return;
    if (!clientMap[client]) clientMap[client] = { tasks: [], roots: [] };
    clientMap[client].roots.push(r);
  });
  Object.values(_apiClientsCache || {}).forEach(c => {
    if (c && c.name && c.has_active_work && !clientMap[c.name]) clientMap[c.name] = { tasks: [], roots: [] };
  });
  Object.keys(clientMap).forEach(name => {
    clientMap[name].tasks = filtered.filter(t => getTaskClient(t) === name);
  });

  const rows = Object.entries(clientMap).map(([name, data]) => {
    const allTasks = data.tasks;
    const total = allTasks.length;
    const done = allTasks.filter(t => t.status === 'Done').length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    const active = data.roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
    const blocked = allTasks.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
    const overdue = allTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
    const atRisk = allTasks.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');
    const yellow = allTasks.filter(t => t.healthState === 'Yellow' && t.status !== 'Done' && t.status !== 'Cancelled');
    const isInactive = active.length === 0;
    const health = blocked.length > 0 || atRisk.length > 0 ? 'r' : yellow.length > 0 || overdue.length > 0 ? 'y' : 'g';

    let risk = '', riskClass = 'pf__tbl-risk--ok';
    if (blocked.length > 0 || overdue.length > 0) {
      const parts = [];
      if (blocked.length > 0) parts.push(blocked.length + ' blocked');
      if (overdue.length > 0) parts.push(overdue.length + ' overdue');
      risk = parts.join(', ');
      riskClass = 'pf__tbl-risk--bad';
    } else if (yellow.length > 0) {
      risk = yellow.length + ' item' + (yellow.length !== 1 ? 's' : '') + ' yellow';
      riskClass = 'pf__tbl-risk--mid';
    } else if (isInactive) {
      risk = 'Complete';
      riskClass = 'pf__tbl-risk--ok';
    } else {
      risk = 'Clear';
      riskClass = 'pf__tbl-risk--ok';
    }

    const barClass = pct >= 80 ? 'pf__bar-fill--g' : health === 'r' ? 'pf__bar-fill--r' : health === 'y' ? 'pf__bar-fill--y' : pct > 0 ? 'pf__bar-fill--g' : '';
    const pctCol = health === 'r' ? 'var(--danger)' : health === 'y' ? 'var(--warning)' : pct > 0 ? 'var(--success)' : 'var(--text-muted)';

    return { name, total, pct, health, isInactive, risk, riskClass, barClass, pctCol, healthSort: health === 'r' ? 0 : health === 'y' ? 1 : 2 };
  });

  rows.sort((a, b) => {
    if (a.isInactive !== b.isInactive) return a.isInactive ? 1 : -1;
    if (a.healthSort !== b.healthSort) return a.healthSort - b.healthSort;
    return a.name.localeCompare(b.name);
  });

  let html = '<div class="pf__tbl-card">';
  if (_portfolioSelectedClient) {
    html += '<div class="pf__tbl-hdr" style="cursor:pointer" data-action="selectPortfolioClient" data-arg0="null"><span class="pf__tbl-title" style="color:var(--accent-text)">&larr; All Clients</span></div>';
  } else {
    html += '<div class="pf__tbl-hdr"><span class="pf__tbl-title">Client Portfolio</span></div>';
  }
  html += '<table class="pf__tbl"><thead><tr>';
  html += '<th style="width:60px">Health</th><th>Client</th><th style="min-width:220px">Progress</th><th>Key Risk</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(r => {
    const sel = _portfolioSelectedClient === r.name ? 'outline:2px solid var(--accent);outline-offset:-2px;' : '';
    const inactive = r.isInactive ? ' class="pf__tbl-inactive"' : '';
    html += '<tr' + inactive + ' style="' + sel + '" data-action="selectPortfolioClient" data-arg0="' + esc(r.name) + '">';
    html += '<td><div class="pf__tbl-health pf__tbl-health--' + r.health + '"></div></td>';
    html += '<td><span class="pf__tbl-name">' + esc(r.name) + '</span><span class="pf__tbl-count">' + r.total + ' tasks</span></td>';
    html += '<td><div style="display:flex;align-items:center;gap:14px">';
    html += '<div class="pf__well" style="flex:1;height:18px;padding:0;overflow:hidden;border-radius:2px">';
    html += '<div class="pf__bar-fill ' + r.barClass + '" style="width:' + r.pct + '%"></div></div>';
    html += '<span style="font-family:var(--font-mono);font-size:1.05rem;font-weight:700;color:' + r.pctCol + ';min-width:44px;text-align:right">' + r.pct + '%</span>';
    html += '</div></td>';
    html += '<td><span class="pf__tbl-risk ' + r.riskClass + '">' + esc(r.risk) + '</span></td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}


function renderPfProgressStatus(panelTasks) {
  const active = panelTasks.filter(t => t.status !== 'Cancelled');
  const total = active.length;
  if (total === 0) {
    return '<div class="pf__panel"><div class="pf__panel-hdr"><span class="pf__panel-title">Status Overview</span></div><div class="pf__panel-body"><div class="pf__empty"><div class="pf__empty-title">No tasks found</div></div></div></div>';
  }

  const buckets = [
    { key: 'done', label: 'Completed', colour: 'var(--success)', hex: '#2ed573', count: 0 },
    { key: 'inprogress', label: 'In Progress', colour: 'var(--accent)', hex: '#00d4ff', count: 0 },
    { key: 'planning', label: 'Planning', colour: 'var(--warning)', hex: '#ffa502', count: 0 },
    { key: 'blocked', label: 'Blocked', colour: 'var(--danger)', hex: '#ff4757', count: 0 },
  ];

  let backlogCount = 0;
  active.forEach(t => {
    if (t.status === 'Blocked' || t.healthState === 'Blocked') buckets[3].count++;
    else if (t.status === 'Done') buckets[0].count++;
    else if (t.status === 'In progress') buckets[1].count++;
    else if (t.status === 'Planning') buckets[2].count++;
    else backlogCount++;
  });

  const wipTotal = buckets.reduce((s, b) => s + b.count, 0);
  const backlogPct = total > 0 ? Math.round(backlogCount / total * 100) : 0;
  const nonZero = buckets.filter(b => b.count > 0);

  let backlogHtml = '<div class="pf__so-backlog" style="flex-shrink:0;text-align:center">';
  backlogHtml += '<div class="pf__well pf__so-bar" style="display:flex;flex-direction:column;justify-content:flex-end;padding:0">';
  backlogHtml += '<div style="height:' + backlogPct + '%;background:rgba(148,163,184,0.18);border-radius:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:' + (backlogCount > 0 ? '36px' : '0') + '">';
  backlogHtml += '<div style="font-family:var(--font-mono);font-size:1.2rem;font-weight:700;color:var(--text-primary)">' + backlogCount + '</div>';
  backlogHtml += '<div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-top:2px;letter-spacing:0.06em">BACKLOG</div>';
  backlogHtml += '</div></div>';
  backlogHtml += '<div style="font-size:0.75rem;font-weight:500;color:var(--text-muted);margin-top:4px">' + backlogPct + '%</div>';
  backlogHtml += '</div>';

  const r = 50, sw = 16, circ = 2 * Math.PI * r;
  let donutSvg = '<svg viewBox="0 0 130 130" class="pf__so-donut">';
  donutSvg += '<circle cx="65" cy="65" r="' + r + '" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="' + (sw + 4) + '"/>';
  donutSvg += '<circle cx="65" cy="65" r="' + r + '" fill="none" stroke="var(--bg-input)" stroke-width="' + sw + '"/>';
  donutSvg += '<circle cx="65" cy="65" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="' + sw + '" stroke-dasharray="' + (circ/2) + ' ' + (circ/2) + '" transform="rotate(-90 65 65)"/>';

  if (wipTotal > 0) {
    let offset = 0;
    nonZero.forEach(b => {
      const pct = b.count / wipTotal;
      const dashLen = pct * circ;
      const gap = nonZero.length > 1 ? 2 : 0;
      const drawLen = Math.max(0, dashLen - gap);
      const rot = -90 + (offset / circ * 360);
      donutSvg += '<circle cx="65" cy="65" r="' + r + '" fill="none" stroke="' + b.hex + '" stroke-width="' + sw + '" stroke-dasharray="' + drawLen.toFixed(1) + ' ' + (circ - drawLen).toFixed(1) + '" transform="rotate(' + rot.toFixed(1) + ' 65 65)" style="filter:drop-shadow(0 0 3px ' + b.hex + '40)"/>';
      offset += dashLen;
    });
  }
  donutSvg += '<text x="65" y="61" text-anchor="middle" fill="var(--text-primary)" font-family="var(--font-mono)" font-weight="700" font-size="22">' + wipTotal + '</text>';
  donutSvg += '<text x="65" y="78" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-body)" font-weight="700" font-size="10" letter-spacing="1">ACTIVE</text>';
  donutSvg += '</svg>';

  let legendHtml = '<div style="display:flex;flex-direction:column;gap:6px">';
  nonZero.forEach(b => {
    legendHtml += '<div style="display:flex;align-items:center;gap:8px">';
    legendHtml += '<div style="width:12px;height:12px;background:' + b.colour + ';border-radius:2px;flex-shrink:0;box-shadow:var(--shadow-sm)"></div>';
    legendHtml += '<span style="font-family:var(--font-mono);font-size:0.78rem;font-weight:700;min-width:22px">' + b.count + '</span>';
    legendHtml += '<span style="font-size:0.75rem;font-weight:500;color:var(--text-secondary)">' + b.label + '</span>';
    legendHtml += '</div>';
  });
  legendHtml += '</div>';

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><span class="pf__panel-title">Status Overview</span><span class="pf__panel-badge" style="color:var(--text-secondary)">' + total + '</span></div>';
  html += '<div class="pf__panel-body" style="display:flex;align-items:center;justify-content:space-evenly;gap:16px;flex-wrap:wrap">';
  html += backlogHtml;
  html += '<div style="flex:0 0 auto;display:flex;align-items:center;gap:12px">' + donutSvg + legendHtml + '</div>';
  html += '</div></div>';
  return html;
}

function renderPfNeedsAttention(panelTasks, now) {
  const blocked = panelTasks.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
  const overdue = panelTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now && t.healthState !== 'Blocked' && t.status !== 'Blocked');
  const totalCount = blocked.length + overdue.length;

  const clientMap = {};
  blocked.forEach(t => {
    const c = getTaskClient(t) || 'Unassigned';
    if (!clientMap[c]) clientMap[c] = { blocked: 0, overdue: 0 };
    clientMap[c].blocked++;
  });
  overdue.forEach(t => {
    const c = getTaskClient(t) || 'Unassigned';
    if (!clientMap[c]) clientMap[c] = { blocked: 0, overdue: 0 };
    clientMap[c].overdue++;
  });
  const clientList = Object.entries(clientMap)
    .map(([name, counts]) => ({ name, blocked: counts.blocked, overdue: counts.overdue, total: counts.blocked + counts.overdue }))
    .sort((a, b) => b.total - a.total);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><span class="pf__panel-title" style="color:var(--danger)">Needs Attention</span><span class="pf__panel-badge" style="color:var(--danger)">' + totalCount + '</span></div>';
  html += '<div class="pf__panel-body">';

  if (clientList.length === 0) {
    html += '<div class="pf__empty"><div class="pf__empty-title" style="color:var(--success)">All clear</div></div>';
  } else {
    const rows = [];
    clientList.forEach(c => {
      if (c.overdue > 0) rows.push({ name: c.name, type: 'overdue', count: c.overdue });
      if (c.blocked > 0) rows.push({ name: c.name, type: 'blocked', count: c.blocked });
    });
    rows.forEach(r => {
      const isBlocked = r.type === 'blocked';
      const badge = isBlocked ? 'BLOCKED' : 'OVERDUE';
      const badgeClass = isBlocked ? 'pf__attn-badge--blk' : 'pf__attn-badge--ovd';
      const action = isBlocked ? '_actNeedsAttnBlocked' : '_actNeedsAttnOverdue';
      html += '<div class="pf__attn" data-action="' + action + '" data-arg0="' + esc(r.name) + '">';
      html += '<div class="pf__attn-bar" style="background:var(--danger);box-shadow:0 0 6px var(--danger-bg)"></div>';
      html += '<span class="pf__attn-badge ' + badgeClass + '">' + badge + '</span>';
      html += '<div class="pf__attn-info"><div class="pf__attn-name">' + esc(r.name) + ' <span style="font-weight:600">' + r.count + '</span></div></div>';
      html += '</div>';
    });
  }

  html += '</div></div>';
  return html;
}


function renderPfMilestones(panelRoots, now) {
  const allMilestones = [];
  Object.entries(_milestonesCache).forEach(([clientId, milestones]) => {
    const clientObj = Object.values(_apiClientsCache || {}).find(c => c.id === clientId);
    const clientName = clientObj ? clientObj.name : '';
    milestones.forEach(ms => {
      allMilestones.push({ ...ms, _clientName: clientName });
    });
  });

  const filtered = _portfolioSelectedClient
    ? allMilestones.filter(ms => ms._clientName === _portfolioSelectedClient)
    : allMilestones;

  filtered.sort((a, b) => {
    const da = safeParseDate(a.target_date) || new Date(9999, 0);
    const db = safeParseDate(b.target_date) || new Date(9999, 0);
    return da - db;
  });

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><span class="pf__panel-title">Milestones</span><span class="pf__panel-badge" style="color:var(--accent-text)">' + filtered.length + '</span></div>';
  html += '<div class="pf__panel-body">';

  if (filtered.length === 0) {
    html += '<div class="pf__empty"><div class="pf__empty-title">No milestones set</div></div>';
  } else {
    filtered.forEach(ms => {
      const target = safeParseDate(ms.target_date);
      const isOverdue = target && target < now;
      const daysUntil = target ? Math.ceil((target - now) / 86400000) : null;

      let dotCol, daysCol;
      if (isOverdue) {
        dotCol = 'var(--danger)'; daysCol = 'var(--danger)';
      } else if (daysUntil !== null && daysUntil <= 14) {
        dotCol = 'var(--warning)'; daysCol = 'var(--warning)';
      } else {
        dotCol = 'var(--success)'; daysCol = 'var(--success)';
      }

      const dateStr = target ? target.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
      const daysLabel = isOverdue ? Math.abs(daysUntil) + 'd late' : (daysUntil !== null ? daysUntil + 'd' : '');
      const clientObj = Object.values(_apiClientsCache || {}).find(c => c.name === ms._clientName);
      const clientId = clientObj ? clientObj.id : '';

      html += '<div class="pf__msl" data-action="openMilestoneDetail" data-arg0="' + clientId + '" data-arg1="' + ms.id + '">';
      html += '<div class="pf__msl-marker"><div class="pf__msl-dot" style="background:' + dotCol + ';box-shadow:0 0 10px ' + dotCol + '"></div></div>';
      html += '<div class="pf__msl-info"><div class="pf__msl-title">' + esc(ms.title) + '</div><div class="pf__msl-sub">' + esc(ms._clientName) + '</div></div>';
      html += '<div class="pf__msl-r"><div class="pf__msl-days" style="color:' + daysCol + '">' + daysLabel + '</div><div class="pf__msl-dt">' + dateStr + '</div></div>';
      html += '</div>';
    });

  }

  html += '</div></div>';
  return html;
}


function renderPfCompletingSoon(panelRoots, now) {
  const features = [];
  panelRoots.forEach(r => {
    getChildren(r.id).forEach(f => {
      if (getItemType(f) !== 'feature') return;
      if (f.status === 'Done' || f.status === 'Cancelled') return;
      const kids = getDescendants(f.id);
      const all = [f, ...kids];
      const d = all.filter(t => t.status === 'Done').length;
      const pct = all.length > 1 ? Math.round(d / all.length * 100) : 0;
      if (pct >= 60 && pct < 100) features.push({ ...f, _pct: pct, _client: getTaskClient(f) || '' });
    });
  });
  features.sort((a, b) => b._pct - a._pct);
  const nearComplete = features.slice(0, 8);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><span class="pf__panel-title" style="color:var(--success)">Near Completion</span><span class="pf__panel-badge" style="color:var(--success)">' + nearComplete.length + '</span></div>';
  html += '<div class="pf__panel-body">';

  if (nearComplete.length === 0) {
    html += '<div class="pf__empty" style="display:flex;align-items:center;justify-content:center;min-height:100px"><div><div class="pf__empty-title">No features near completion</div><div class="pf__empty-sub">Most active work is early-stage</div></div></div>';
  } else {
    nearComplete.forEach(r => {
      html += '<div class="pf__wl" style="cursor:pointer" data-action="openDetailOverlay" data-arg0="' + r.id + '">';
      html += '<span style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:1px">' + esc(r._client) + '</span>';
      html += '<span class="pf__wl-name">' + esc(r.title) + '</span>';
      html += '<div class="pf__wl-trk pf__well"><div class="pf__bar-fill pf__bar-fill--g" style="width:' + r._pct + '%"></div></div>';
      html += '<span class="pf__wl-ct" style="color:var(--success)">' + r._pct + '%</span>';
      html += '</div>';
    });
  }

  html += '</div></div>';
  return html;
}

function renderPfTeamWorkload(panelTasks) {
  const activeTasks = panelTasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
  const activeStaff = new Set(_cachedTeamMembers || []);
  const personMap = {};
  activeTasks.forEach(t => {
    (t.assignees || []).forEach(a => {
      if (activeStaff.size > 0 && !activeStaff.has(a)) return;
      if (!personMap[a]) personMap[a] = 0;
      personMap[a]++;
    });
  });
  const sorted = Object.entries(personMap).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><span class="pf__panel-title">Team Workload</span><span class="pf__panel-badge" style="color:var(--accent-text)">' + sorted.length + '</span></div>';
  html += '<div class="pf__panel-body">';

  if (sorted.length === 0) {
    html += '<div class="pf__empty"><div class="pf__empty-title">No assigned tasks</div></div>';
  } else {
    sorted.forEach(([name, count]) => {
      const barW = Math.round(count / maxCount * 100);
      html += '<div class="pf__wl">';
      html += '<span class="pf__wl-name">' + esc(name) + '</span>';
      html += '<div class="pf__wl-trk pf__well"><div class="pf__bar-fill pf__bar-fill--c" style="width:' + barW + '%"></div></div>';
      html += '<span class="pf__wl-ct" style="color:var(--accent-text)">' + count + '</span>';
      html += '</div>';
    });
  }

  html += '</div></div>';
  return html;
}

/** Toggle standup person expansion and track state for re-render survival */
function toggleStandupPerson(personName, el) {
  if (_expandedStandupPeople.has(personName)) {
    _expandedStandupPeople.delete(personName);
    el.closest('.tactical-person').classList.remove('expanded');
  } else {
    _expandedStandupPeople.add(personName);
    el.closest('.tactical-person').classList.add('expanded');
  }
}

/** Toggle the per-person Completed (Done) section in standup. Default is collapsed. */
function toggleStandupDone(personName, el) {
  const wasExpanded = _standupDoneExpanded.has(personName);
  if (wasExpanded) _standupDoneExpanded.delete(personName);
  else _standupDoneExpanded.add(personName);
  const section = el.closest('.standup-done-section');
  if (!section) return;
  const body = section.querySelector('.standup-done-body');
  if (body) body.style.display = wasExpanded ? 'none' : '';
  const arrow = el.querySelector('span');
  if (arrow) arrow.textContent = arrow.textContent.replace(wasExpanded ? '\u25BC' : '\u25B6', wasExpanded ? '\u25B6' : '\u25BC');
}

/** Render a single standup task row (used for both active and done sections) */
function renderStandupTaskRow(t, now) {
  const isOverdue = t.dueDate && safeParseDate(t.dueDate) < now;
  const isDone = t.status === 'Done';
  const isCancelled = t.status === 'Cancelled';
  const depNames = (t.dependencies || []).map(did => { const d = tasks.find(x => x.id === did); return d ? d.title : null; }).filter(Boolean);
  let html = `<div class="standup-task ${isOverdue ? 'standup-task--danger' : ''} ${isDone ? 'standup-task--done' : ''} ${isCancelled ? 'standup-task--cancelled' : ''}">`;
  html += `<div class="standup-task__row">`;
  html += standupSelect(t.id, 'status', t.status, STATUSES);
  if (t.status === 'Blocked') {
    const bInfo = t.blockerInfo || t.blocker_info;
    const bReason = bInfo ? (bInfo.blockedOn || 'Blocked') : 'Blocked';
    html += `<span class="badge badge--blocked" style="font-size:0.75rem;padding:1px 6px" title="${esc(bReason)}">BLOCKED</span>`;
  }
  if (isOverdue && !isDone && !isCancelled && t.status !== 'Blocked') {
    const daysLate = Math.ceil((now - safeParseDate(t.dueDate)) / 86400000);
    html += `<span style="font-size:0.75rem;padding:1px 6px;border-radius:3px;background:var(--danger-bg);color:var(--danger);font-weight:700">${daysLate}d OVERDUE</span>`;
  }
  html += `<span class="standup-task__title ${isDone ? 'standup-task__title--done' : ''}" data-action="openDetailOverlay" data-stop data-arg0="${t.id}">${esc(t.title)}</span>`;
  html += standupAssigneeHtml(t.id, t.assignees);
  html += standupSelect(t.id, 'priority', t.priority || '', ['', ...PRIORITIES]);
  html += standupSelect(t.id, 'healthState', t.healthState || '', ['', ...HEALTH_STATES]);
  html += standupDate(t.id, 'startDate', t.startDate, 'S', t);
  html += standupDate(t.id, 'endDate', t.endDate, 'E', t);
  html += standupDate(t.id, 'dueDate', t.dueDate, 'D', t);
  html += `<input type="number" class="standup-inline standup-inline--number" step="0.5" min="0" value="${t.hoursEstimated||0}" data-stop onchange="event.stopPropagation();standupUpdateTask('${t.id}','hoursEstimated',parseFloat(this.value)||0,this)" title="Hours Est.">`;
  html += `<span class="standup-label">h</span>`;
  if (depNames.length > 0) {
    html += `<span class="standup-deps" data-stop title="${esc(depNames.join(', '))}">Prereqs: ${depNames.map((n, i) => `<a data-action="openDetailOverlay" data-stop data-arg0="${t.dependencies[i]}">${esc(n.length > 20 ? n.substring(0, 18) + '..' : n)}</a>`).join(', ')}</span>`;
  }
  html += `</div>`;
  html += `</div>`;
  return html;
}

/** Update a task field from a standup inline control — no full page re-render */
function standupUpdateTask(taskId, field, value, el) {
  if (el) el.blur();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  if ((field === 'startDate' || field === 'endDate' || field === 'dueDate') && value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const yr = parseInt(value.slice(0, 4), 10);
    if (yr < 1000) return;
    if (yr < 1900 || yr > 2099) { showToast('Invalid year', 'error'); return; }
  }
  const oldValue = task[field];
  if (oldValue === value) return;
  task[field] = value;
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);

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
    markDirty(taskId);
  });
  save();

  // Structural changes (status to/from Done/Cancelled) need a full re-render
  // because tasks move between sections. Everything else is a lightweight update.
  const structural = field === 'status' && (
    value === 'Done' || value === 'Cancelled' || oldValue === 'Done' || oldValue === 'Cancelled'
  );

  if (structural) {
    const scrollEl = document.querySelector('.main__content');
    const savedScroll = scrollEl ? scrollEl.scrollTop : 0;
    renderContent();
    if (scrollEl && savedScroll > 0) {
      requestAnimationFrame(() => { scrollEl.scrollTop = savedScroll; });
    }
  } else {
    // Lightweight: update only the metrics strip and sidebar counts.
    // The input/select the user just changed already shows the new value.
    standupRefreshMetrics();
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
  }

  // Refresh detail overlay if open on this task
  if (activeDetailTaskId === taskId) openDetailOverlay(taskId);
}

/** Re-render page for remote changes without visible scroll flash.
 *  When cached team members exist, the standup renders synchronously — the entire
 *  rebuild + scroll restore happens in one JS block before the browser paints.
 *  On first load (no cache), falls back to _scrollRestoreTarget for the async standup. */
function _softReRender() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
  const detailPanel = document.getElementById('detailPanel');
  if (detailPanel && detailPanel.classList.contains('open')) return;
  const inlineDetail = document.getElementById('inlineDetailPanel');
  if (inlineDetail && !inlineDetail.classList.contains('tasks-layout__detail--hidden')) return;
  const scView = document.getElementById('interviewScorecardView');
  if (scView && scView.style.display !== 'none' && scView.style.display !== '') return;
  const panelIds = ['bugDetailPanel', 'leadDetailPanel', 'candidateDetailPanel', 'positionDetailPanel'];
  for (const pid of panelIds) {
    const p = document.getElementById(pid);
    if (p && p.classList.contains('open')) return;
  }
  const scrollEl = document.querySelector('.main__content');
  if (!scrollEl) { renderContent(); return; }
  const savedScroll = scrollEl.scrollTop;
  const ganttEl = scrollEl.querySelector('.gantt');
  const savedGanttLeft = ganttEl ? ganttEl.scrollLeft : 0;
  const savedGanttTop = ganttEl ? ganttEl.scrollTop : 0;
  _scrollRestoreTarget = savedScroll;
  renderContent();
  if (typeof renderSidebar === 'function') renderSidebar();
  if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
  scrollEl.scrollTop = savedScroll;
  const newGanttEl = scrollEl.querySelector('.gantt');
  if (newGanttEl) {
    newGanttEl.scrollLeft = savedGanttLeft;
    newGanttEl.scrollTop = savedGanttTop;
  }
}

function standupRefreshMetrics() {
  const metricsEl = document.querySelector('.tactical-metrics');
  if (!metricsEl) return;
  const now = new Date(); now.setHours(0,0,0,0);
  const filtered = typeof getFilteredTasks === 'function' ? getFilteredTasks() : tasks;
  const active = filtered.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
  const overdue = active.filter(t => t.dueDate && safeParseDate(t.dueDate) < now).length;
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  const thisWeek = active.filter(t => { if (!t.dueDate) return false; const d = safeParseDate(t.dueDate); return d && d >= now && d <= weekEnd; }).length;
  const blocked = active.filter(t => t.healthState === 'Blocked').length;
  const atRisk = active.filter(t => t.healthState === 'Red').length;
  const inProgress = filtered.filter(t => t.status === 'In progress').length;
  const done = filtered.filter(t => t.status === 'Done').length;
  const donePct = filtered.length ? Math.round(done / filtered.length * 100) : 0;
  // Update metric values in place
  const vals = metricsEl.querySelectorAll('.tactical-metric__value');
  if (vals[0]) vals[0].textContent = inProgress;
  if (vals[1]) { vals[1].textContent = overdue; vals[1].style.color = overdue > 0 ? 'var(--danger)' : 'var(--success)'; }
  if (vals[2]) { vals[2].textContent = thisWeek; vals[2].style.color = thisWeek > 0 ? 'var(--warning)' : 'var(--success)'; }
  if (vals[3]) { vals[3].textContent = blocked; vals[3].style.color = blocked > 0 ? 'var(--danger)' : 'var(--success)'; }
  if (vals[4]) { vals[4].textContent = atRisk; vals[4].style.color = atRisk > 0 ? 'var(--warning)' : 'var(--success)'; }
  if (vals[5]) vals[5].textContent = donePct + '%';
  if (vals[6]) vals[6].textContent = filtered.length;
}

/** Build a compact inline <select> for the standup row */
function standupSelect(taskId, field, currentVal, options) {
  return `<select class="standup-inline standup-inline--select" onchange="event.stopPropagation();standupUpdateTask('${taskId}','${field}',this.value,this)" data-stop>${options.map(o => `<option value="${esc(o)}" ${(currentVal||'')===o?'selected':''}>${esc(o||'--')}</option>`).join('')}</select>`;
}

/** Build a compact inline date input for the standup row */
function standupDate(taskId, field, currentVal, label, task) {
  let cls = 'standup-inline standup-inline--date';
  if (task && currentVal) {
    const d = safeParseDate(currentVal);
    const today = new Date(new Date().toDateString());
    if (d && d < today) {
      if (field === 'dueDate' && task.status !== 'Done' && task.status !== 'Cancelled') cls += ' standup-inline--overdue';
      if (field === 'startDate' && task.status === 'Not started') cls += ' standup-inline--late-start';
    }
  }
  return `<span class="standup-label">${label}</span><input type="date" class="${cls}" value="${currentVal||''}" onchange="event.stopPropagation();standupUpdateTask('${taskId}','${field}',this.value,this)" data-stop>`;
}

/** Add assignee from standup without full re-render */
function standupAddAssignee(taskId, name) {
  if (!name) return;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const assignees = [...(task.assignees || [])];
  if (!assignees.includes(name)) assignees.push(name);
  standupUpdateTask(taskId, 'assignees', assignees, null);
}

/** Remove assignee from standup without full re-render */
function standupRemoveAssignee(taskId, name) {
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.assignees) return;
  standupUpdateTask(taskId, 'assignees', task.assignees.filter(a => a !== name), null);
}

/** Build compact inline assignee chips + add dropdown for standup row */
function standupAssigneeHtml(taskId, assignees) {
  const selected = assignees || [];
  let h = '<div class="standup-assignees" data-stop>';
  selected.forEach(name => {
    h += `<span class="standup-assignee-chip">${esc(name)} <button data-action="standupRemoveAssignee" data-stop data-arg0="${taskId}" data-arg1="${esc(name)}">&times;</button></span>`;
  });
  h += `<select class="standup-inline standup-inline--select" style="min-width:60px;max-width:80px" onchange="event.stopPropagation();standupAddAssignee('${taskId}',this.value);this.value=''" data-stop><option value="">+</option>`;
  (_cachedTeamMembers || []).forEach(name => {
    if (!selected.includes(name)) h += `<option value="${esc(name)}">${esc(name)}</option>`;
  });
  h += `</select></div>`;
  return h;
}

function _loadStandupContent() {
  const container = document.getElementById('standupContainer');
  if (!container) return;
  const filtered = getFilteredTasks().filter(t => getItemType(t) === 'task');
  const now = new Date(); now.setHours(0,0,0,0);
  if (_cachedTeamMembers && _cachedTeamMembers.length > 0) {
    _renderStandupBody(container, filtered, now, _cachedTeamMembers);
  } else {
    renderStandupSection(filtered, now);
  }
}

function renderStandupSectionSync(filtered, now, teamMembers) {
  const container = document.getElementById('standupContainer');
  if (!container) return;
  _renderStandupBody(container, filtered, now, teamMembers);
}

async function renderStandupSection(filtered, now) {
  const container = document.getElementById('standupContainer');
  if (!container) return;

  // Fetch registered users (NBI team only — not client employees)
  let teamMembers = [];
  try {
    const users = await apiCall('/api/users');
    if (users) {
      teamMembers = users.filter(u => u.is_active !== false).map(u => u.display_name).sort();
    }
  } catch(e) { console.warn('[Tasks] users fetch error:', e.message || e); }

  // If fetch failed, fall back to assignees
  if (teamMembers.length === 0) {
    const s = new Set();
    filtered.forEach(t => { if (t.assignees) t.assignees.forEach(a => s.add(a)); });
    teamMembers = [...s].sort();
  }

  // Cache for future synchronous re-renders
  _cachedTeamMembers = teamMembers;

  _renderStandupBody(container, filtered, now, teamMembers);
}

function _renderStandupBody(container, filtered, now, teamMembers) {
  // Standup: active work + done this sprint. Sort order per Glen's spec.
  const sprintStart = new Date(now); sprintStart.setDate(sprintStart.getDate() - 7);
  const standupSortOrder = { 'Blocked': 0, 'Planning': 2, 'In progress': 3, 'Drafted': 4, 'In Review': 5, 'Done': 6 };
  const activeTasks = filtered.filter(t => {
    if (t.status === 'Cancelled' || t.status === 'Not started') return false;
    if (t.status === 'Done') return new Date(t.updatedAt) >= sprintStart;
    return true;
  });
  const personClientMap = {};
  // Initialise all team members (even those with no tasks)
  teamMembers.forEach(p => { personClientMap[p] = {}; });

  // Build name matching: map short names (e.g. "Glen") to full display names ("Glen Pryer")
  const nameToMember = {};
  teamMembers.forEach(m => {
    nameToMember[m.toLowerCase()] = m;
    const first = m.split(' ')[0].toLowerCase();
    if (!nameToMember[first]) nameToMember[first] = m;
  });

  activeTasks.forEach(t => {
    const people = (t.assignees && t.assignees.length > 0) ? t.assignees : [];
    const client = getTaskClient(t) || 'No Client';
    people.forEach(p => {
      // Match by exact name, or by first name prefix
      const resolved = personClientMap[p] ? p : nameToMember[p.toLowerCase()] || null;
      if (!resolved || !personClientMap[resolved]) return;
      if (!personClientMap[resolved][client]) personClientMap[resolved][client] = [];
      personClientMap[resolved][client].push(t);
    });
  });

  // Also collect unassigned tasks
  const unassigned = activeTasks.filter(t => !t.assignees || t.assignees.length === 0);

  // Sort people by urgency: blocked/overdue first, then by task count desc, Available at bottom
  const sortedPeople = Object.keys(personClientMap).sort((a, b) => {
    const aTasks = Object.values(personClientMap[a]).flat();
    const bTasks = Object.values(personClientMap[b]).flat();
    const aBlocked = aTasks.filter(t => t.healthState === 'Blocked').length;
    const bBlocked = bTasks.filter(t => t.healthState === 'Blocked').length;
    const aOverdue = aTasks.filter(t => t.dueDate && safeParseDate(t.dueDate) < now).length;
    const bOverdue = bTasks.filter(t => t.dueDate && safeParseDate(t.dueDate) < now).length;
    const aUrgency = aBlocked * 100 + aOverdue * 10 + aTasks.length;
    const bUrgency = bBlocked * 100 + bOverdue * 10 + bTasks.length;
    if (aTasks.length === 0 && bTasks.length > 0) return 1;
    if (bTasks.length === 0 && aTasks.length > 0) return -1;
    return bUrgency - aUrgency;
  });

  // Separate active people from available
  const activePeople = sortedPeople.filter(p => Object.values(personClientMap[p]).flat().length > 0);
  const availablePeople = sortedPeople.filter(p => Object.values(personClientMap[p]).flat().length === 0);

  let html = `<div class="tactical-standup">`;

  activePeople.forEach(person => {
    const clients = personClientMap[person];
    const totalTasks = Object.values(clients).reduce((s, arr) => s + arr.length, 0);
    const totalBlocked = Object.values(clients).flat().filter(t => t.healthState === 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled').length;
    const totalOverdue = Object.values(clients).flat().filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now).length;
    const isExpanded = _expandedStandupPeople.has(person);

    html += `<div class="tactical-person ${isExpanded ? 'expanded' : ''}">`;
    html += `<div class="tactical-person__header" data-action="toggleStandupPerson" data-arg0="${esc(person)}" data-pass-el>
      <span class="tactical-person__name">${esc(person)}</span>
      <span class="tactical-person__stats">${totalTasks} active${totalBlocked > 0 ? ` &middot; <span style="color:var(--danger)">${totalBlocked} blocked</span>` : ''}${totalOverdue > 0 ? ` &middot; <span style="color:var(--danger)">${totalOverdue} overdue</span>` : ''}</span>
      <span class="tactical-person__arrow">&#9660;</span>
    </div>`;

    if (totalTasks > 0) {
      // Split each client group into active vs Done tasks; Done go into a per-person collapsible section
      const allDone = [];
      html += `<div class="tactical-person__body">`;
      Object.entries(clients).sort((a,b) => b[1].length - a[1].length).forEach(([client, cTasks]) => {
        const activeOnly = cTasks.filter(t => t.status !== 'Done');
        const doneOnly = cTasks.filter(t => t.status === 'Done');
        doneOnly.forEach(d => allDone.push({ task: d, client }));
        if (activeOnly.length === 0) return;
        html += `<div class="tactical-client-group">`;
        html += `<div class="tactical-client-group__header">${clientBadgeHtml(client)} <span style="font-size:0.78rem;color:var(--text-secondary)">${esc(client)}</span> <span style="font-size:0.75rem;color:var(--text-muted)">(${activeOnly.length})</span></div>`;
        activeOnly.sort((a,b) => {
          const aOverdue = a.dueDate && safeParseDate(a.dueDate) < now;
          const bOverdue = b.dueDate && safeParseDate(b.dueDate) < now;
          const aOrder = a.healthState === 'Blocked' ? 0 : aOverdue ? 1 : (standupSortOrder[a.status] ?? 3);
          const bOrder = b.healthState === 'Blocked' ? 0 : bOverdue ? 1 : (standupSortOrder[b.status] ?? 3);
          return aOrder - bOrder;
        }).forEach(t => {
          html += renderStandupTaskRow(t, now);
        });
        html += `</div>`;
      });
      // Collapsible Done section per person (default collapsed via _standupDoneCollapsed map)
      if (allDone.length > 0) {
        const doneCollapsed = !_standupDoneExpanded.has(person);
        html += `<div class="tactical-client-group standup-done-section" data-person="${esc(person)}">`;
        html += `<div class="tactical-client-group__header" style="cursor:pointer;user-select:none" data-action="toggleStandupDone" data-arg0="${esc(person)}" data-pass-el>`;
        html += `<span style="color:var(--purple);font-size:0.78rem;font-weight:600">${doneCollapsed ? '\u25B6' : '\u25BC'} Completed (${allDone.length})</span>`;
        html += `</div>`;
        html += `<div class="standup-done-body"${doneCollapsed ? ' style="display:none"' : ''}>`;
        allDone.forEach(({ task: t, client }) => {
          html += `<div style="font-size:0.75rem;color:var(--text-muted);padding-left:6px">${esc(client)}</div>`;
          html += renderStandupTaskRow(t, now);
        });
        html += `</div>`;
        html += `</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  });

  // Unassigned tasks
  if (unassigned.length > 0) {
    const isUnassignedExpanded = _expandedStandupPeople.has('__unassigned__');
    html += `<div class="tactical-person ${isUnassignedExpanded ? 'expanded' : ''}">`;
    html += `<div class="tactical-person__header" data-action="toggleStandupPerson" data-arg0="__unassigned__" data-pass-el><span class="tactical-person__name" style="color:var(--text-muted);font-style:italic">Unassigned</span><span class="tactical-person__stats">${unassigned.length} tasks</span><span class="tactical-person__arrow">&#9660;</span></div>`;
    html += `<div class="tactical-person__body">`;
    unassigned.sort((a,b) => {
      const aOverdue = a.status !== 'Done' && a.dueDate && safeParseDate(a.dueDate) < now;
      const bOverdue = b.status !== 'Done' && b.dueDate && safeParseDate(b.dueDate) < now;
      const aOrder = a.healthState === 'Blocked' ? 0 : aOverdue ? 1 : (standupSortOrder[a.status] ?? 3);
      const bOrder = b.healthState === 'Blocked' ? 0 : bOverdue ? 1 : (standupSortOrder[b.status] ?? 3);
      return aOrder - bOrder;
    }).forEach(t => {
      const isOverdue = t.dueDate && safeParseDate(t.dueDate) < now;
      const isDone = t.status === 'Done';
      const isCancelled = t.status === 'Cancelled';
      const depNames = (t.dependencies || []).map(did => { const d = tasks.find(x => x.id === did); return d ? d.title : null; }).filter(Boolean);
      html += `<div class="standup-task ${isOverdue ? 'standup-task--danger' : ''} ${isDone ? 'standup-task--done' : ''} ${isCancelled ? 'standup-task--cancelled' : ''}">`;
      html += `<div class="standup-task__row">`;
      html += `${clientBadgeHtml(getTaskClient(t))} `;
      html += standupSelect(t.id, 'status', t.status, STATUSES);
      if (t.status === 'Blocked') {
        const bInfo = t.blockerInfo || t.blocker_info;
        const bReason = bInfo ? (bInfo.blockedOn || 'Blocked') : 'Blocked';
        html += `<span class="badge badge--blocked" style="font-size:0.75rem;padding:1px 6px" title="${esc(bReason)}">BLOCKED</span>`;
      }
      html += `<span class="standup-task__title ${isDone ? 'standup-task__title--done' : ''}" data-action="openDetailOverlay" data-stop data-arg0="${t.id}">${esc(t.title)}</span>`;
      html += standupAssigneeHtml(t.id, t.assignees);
      html += standupSelect(t.id, 'priority', t.priority || '', ['', ...PRIORITIES]);
      html += standupSelect(t.id, 'healthState', t.healthState || '', ['', ...HEALTH_STATES]);
      html += standupDate(t.id, 'startDate', t.startDate, 'S', t);
      html += standupDate(t.id, 'endDate', t.endDate, 'E', t);
      html += standupDate(t.id, 'dueDate', t.dueDate, 'D', t);
      html += `<input type="number" class="standup-inline standup-inline--number" step="0.5" min="0" value="${t.hoursEstimated||0}" data-stop onchange="event.stopPropagation();standupUpdateTask('${t.id}','hoursEstimated',parseFloat(this.value)||0,this)" title="Hours Est.">`;
      html += `<span class="standup-label">h</span>`;
      if (depNames.length > 0) {
        html += `<span class="standup-deps" data-stop title="${esc(depNames.join(', '))}">Prereqs: ${depNames.map((n, i) => `<a data-action="openDetailOverlay" data-stop data-arg0="${t.dependencies[i]}">${esc(n.length > 20 ? n.substring(0, 18) + '..' : n)}</a>`).join(', ')}</span>`;
      }
      html += `</div>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  }

  // Available people — collapsed into a single line
  if (availablePeople.length > 0) {
    html += `<div style="padding:8px 12px;font-size:0.78rem;color:var(--text-muted)"><span style="color:var(--success)">Available:</span> ${availablePeople.map(p => esc(p)).join(', ')}</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
  // Restore scroll position after standup content is set (this is the last async render on the workload page)
  if (_scrollRestoreTarget !== null) {
    const scrollEl = document.querySelector('.main__content');
    const target = _scrollRestoreTarget;
    _scrollRestoreTarget = null;
    if (scrollEl) {
      // Synchronously restore — don't wait for rAF (which allows a flash frame)
      scrollEl.scrollTop = target;
    }
  }
}
