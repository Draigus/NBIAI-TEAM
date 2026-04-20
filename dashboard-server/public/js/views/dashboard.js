import { registerView } from '../core/router.js';

// ===== STATE =====
const _expandedStandupPeople = new Set();
const _standupDoneExpanded = new Set();
const _expandedClientCards = new Set();
let _portfolioSelectedClient = null;
let _portfolioSnapshots = null;
let _portfolioAttentionExpanded = false;
let _portfolioLeadCount = null;
let _portfolioBottomAttentionExpanded = false;
let _pfGanttDayWidth = 12;
let _pfGanttOffsetDays = 0;

// ===== DASHBOARD LOADERS & HELPERS =====
async function loadDashboardSnapshots() {
  try {
    const resp = await authFetch('/api/dashboard/snapshots?days=56');
    if (resp.ok) {
      const data = await resp.json();
      _portfolioSnapshots = data.snapshots || [];
    }
  } catch (e) {
    _portfolioSnapshots = [];
  }
}

async function loadPortfolioLeadCount() {
  try {
    const resp = await authFetch('/api/leads/pipeline/summary');
    if (resp.ok) {
      const data = await resp.json();
      _portfolioLeadCount = (data.stages || [])
        .filter(s => !s.is_closed)
        .reduce((sum, s) => sum + parseInt(s.count || 0), 0);
    }
  } catch (e) {
    _portfolioLeadCount = 0;
  }
}

function selectPortfolioClient(clientName) {
  _portfolioSelectedClient = _portfolioSelectedClient === clientName ? null : clientName;
  renderContent();
}

function pfGanttZoom(delta) { _pfGanttDayWidth = Math.max(6, Math.min(40, _pfGanttDayWidth + delta)); renderContent(); }
function pfGanttNav(days) { _pfGanttOffsetDays += days; renderContent(); }
function pfGanttToday() { _pfGanttOffsetDays = 0; renderContent(); }

// ==================== DASHBOARD VIEW ====================

/** Render the main workload dashboard -- date header, client profile, and tactical view */
function renderDashboard(el) {
  let html = renderClientProfileHeader();

  // Load client notes if profile is expanded
  if (currentFilter.client && _profileExpanded[currentFilter.client.replace(/[^a-zA-Z0-9]/g, '_')]) {
    setTimeout(() => loadClientNotes(currentFilter.client), 50);
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

  // html += renderTacticalDashboard(); // COMMENTED OUT — old tactical/ops view, kept for revert
  html += renderPortfolioDashboard();
  el.innerHTML = html;

  requestAnimationFrame(() => {
    const pf = el.querySelector('.pf');
    if (pf) {
      if (window.matchMedia('(max-height: 850px)').matches) {
        pf.style.height = '';
        return;
      }
      const top = pf.getBoundingClientRect().top;
      const contentEl = document.getElementById('mainContent');
      const padBot = contentEl ? parseFloat(getComputedStyle(contentEl).paddingBottom) || 0 : 0;
      pf.style.height = (window.innerHeight - top - padBot) + 'px';
    }
  });

  // COMMENTED OUT — standup was part of the tactical dashboard, not used in portfolio view
  // const standupExpanded = sessionStorage.getItem('nbi_standup_expanded') === '1';
  // if (standupExpanded) {
  //   _loadStandupContent();
  // }
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
  // Imminent: due within 3 days but not overdue
  const imminentEnd = new Date(now.getTime() + 3 * 86400000);
  const imminentTasks = filtered.filter(t => {
    if (!t.dueDate || t.status === 'Done' || t.status === 'Cancelled') return false;
    const d = safeParseDate(t.dueDate);
    return d >= now && d <= imminentEnd;
  }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
  const dueThisWeek = filtered.filter(t => {
    if (!t.dueDate || t.status === 'Done' || t.status === 'Cancelled') return false;
    const d = safeParseDate(t.dueDate);
    return d >= now && d <= weekEnd;
  }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
  const blockedTasks = filtered.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
  const redHealth = filtered.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');
  const inProgress = filtered.filter(t => t.status === 'In progress');
  const done = filtered.filter(t => t.status === 'Done').length;

  // Compute team workload
  const assigneeSet = new Set();
  filtered.filter(t => t.status !== 'Done' && t.status !== 'Cancelled').forEach(t => { if (t.assignees) t.assignees.forEach(a => assigneeSet.add(a)); });
  const teamData = [...assigneeSet].sort().map(name => {
    const personTasks = filtered.filter(t => t.assignees?.includes(name) && t.status !== 'Done' && t.status !== 'Cancelled');
    const hrs = personTasks.reduce((s,t) => s + (t.hoursEstimated || 0), 0);
    const spent = personTasks.reduce((s,t) => s + (t.hoursSpent || 0), 0);
    return { name, taskCount: personTasks.length, hrsEst: hrs, hrsSpent: spent, util: hrs > 0 ? Math.round(spent / hrs * 100) : 0 };
  });

  let html = '';

  // Trend calculation: estimate change vs 7 days ago
  // Tasks completed this week = newly done (updatedAt in last 7 days + status Done)
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const completedThisWeek = filtered.filter(t => t.status === 'Done' && new Date(t.updatedAt) >= weekAgo).length;
  // Tasks that became overdue this week (due date fell within last 7 days)
  const newlyOverdue = overdueTasks.filter(t => {
    const d = safeParseDate(t.dueDate);
    return d >= weekAgo && d < now;
  }).length;
  /** Render a coloured up/down trend arrow with delta value */
  function trendArrow(delta, invertColour) {
    if (delta === 0) return '<span style="display:block;font-size:0.85rem;font-weight:600;color:var(--text-muted);margin-top:2px">&mdash; 0</span>';
    const up = delta > 0;
    const col = invertColour ? (up ? 'var(--danger)' : 'var(--success)') : (up ? 'var(--success)' : 'var(--danger)');
    return `<span style="display:block;font-size:0.85rem;font-weight:600;color:${col};margin-top:2px">${up ? '&#9650;' : '&#9660;'}${Math.abs(delta)}</span>`;
  }

  // KPI metrics strip removed per Glen's direction (2026-04-20)

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
        html += `<div style="font-size:0.72rem;font-weight:600;color:var(--text-muted);padding:8px 0 4px;border-bottom:1px solid var(--border-subtle);margin-top:4px">${clientBadgeHtml(client)} ${esc(client)}</div>`;
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
  html += `<div class="tactical-section__header"><span class="tactical-section__title" style="color:#f59e0b">&#128197; ${sectionClient}This Week (${thisWeekCombined.length})</span></div>`;
  if (thisWeekCombined.length === 0) {
    html += `<div class="tactical-empty">Nothing due this week</div>`;
  } else {
    thisWeekCombined.forEach(t => {
      const d = safeParseDate(t.dueDate);
      const daysUntil = Math.ceil((d - now) / 86400000);
      const dayLabel = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const urgentColour = daysUntil <= 1 ? '#dc2626' : daysUntil <= 3 ? '#f59e0b' : 'var(--text-muted)';
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
  html += `<div class="tactical-section__header"><span class="tactical-section__title" style="color:var(--purple)">&#128721; Blocked (${blockedTasks.length})</span></div>`;
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
      <span class="standup-chevron" style="font-size:0.7rem;color:var(--text-muted);width:14px">${standupExpanded ? '\u25BC' : '\u25B6'}</span>
      <span style="font-size:0.9rem;font-weight:600">&#128101; Team Standup - Work by Person</span>
      <span class="standup-hint" style="font-size:0.72rem;color:var(--text-muted);font-weight:400">${standupExpanded ? '(click to collapse)' : '(click to expand)'}</span>
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

// ===== PORTFOLIO DASHBOARD v4 — Sidebar + panels layout =====
function renderPortfolioDashboard() {
  const filtered = getFilteredTasks();
  const now = new Date(); now.setHours(0,0,0,0);
  const fortnight = new Date(now); fortnight.setDate(fortnight.getDate() + 14);

  const roots = filtered.filter(t => !t.parentId && t.title && t.title.trim() !== 'New Task');
  const activeRoots = roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const overdueTasks = filtered.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
  const blockedTasks = filtered.filter(t => (t.healthState === 'Blocked' || t.status === 'Blocked') && t.status !== 'Done' && t.status !== 'Cancelled');
  const atRiskTasks = filtered.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');

  const needsAttentionCount = overdueTasks.length;
  const uniqueProblemIds = new Set([...overdueTasks.map(t => t.id), ...atRiskTasks.map(t => t.id)]);
  const onTrackCount = Math.max(0, activeRoots.length - uniqueProblemIds.size);
  const workTypesActive = new Set(activeRoots.filter(r => r.workType).map(r => r.workType)).size;

  const snap7 = _portfolioSnapshots ? _portfolioSnapshots.find(s => {
    const d = new Date(s.snapshot_date);
    const ago = new Date(now); ago.setDate(ago.getDate() - 7);
    return d.toISOString().slice(0,10) === ago.toISOString().slice(0,10);
  }) : null;

  let html = '<div class="pf">';
  html += renderPfStrip(activeRoots.length, onTrackCount, needsAttentionCount, atRiskTasks.length, _portfolioLeadCount || 0, workTypesActive, snap7);

  html += '<div class="pf__main">';
  html += renderPfSidebar(filtered, roots, now);

  const panelTasks = _portfolioSelectedClient
    ? filtered.filter(t => getTaskClient(t) === _portfolioSelectedClient)
    : filtered;
  const panelRoots = _portfolioSelectedClient
    ? roots.filter(r => getTaskClient(r) === _portfolioSelectedClient)
    : roots;

  html += '<div class="pf__content">';
  html += '<div class="pf__panels">';
  html += renderPfProgressStatus(panelTasks);
  html += renderPfMilestones(panelRoots, now);
  html += renderPfTimeline(panelTasks, panelRoots, now);
  html += renderPfWorkTypes(panelRoots);
  html += '</div>';

  html += '<div class="pf__bottom pf__bottom--v4">';
  html += renderPfCompletingSoon(panelRoots, now);
  html += renderPfTeamWorkload(panelTasks);
  html += renderPfBottomNeedsAttention(panelTasks, now);
  html += '</div>';
  html += '</div>';

  html += '</div>';
  html += '</div>';
  return html;
}

// COMMENTED OUT — v3 KPI strip
// function renderPfStrip_v3(activeCount, overdueCount, blockedCount, atRiskCount, hrsSpent, hrsEst, snap7) { ... }

function renderPfStrip(activeCount, onTrackCount, needsAttentionCount, atRiskCount, leadsCount, workTypesCount, snap7) {
  function delta(current, field) {
    if (!snap7) return '';
    const prev = parseFloat(snap7[field]) || 0;
    const diff = current - prev;
    if (diff === 0) return '';
    const isGood = (field === 'active_projects' || field === 'on_track_count' || field === 'active_leads_count')
      ? diff > 0 : diff < 0;
    const arrow = diff > 0 ? '\u25B2' : '\u25BC';
    const sign = diff > 0 ? '+' : '';
    const col = isGood ? 'var(--success)' : 'var(--danger)';
    return `<span class="pf__strip-delta-beside" style="color:${col}"><span class="pf__strip-delta-arrow">${arrow}</span> ${sign}${Math.round(diff)}<span class="pf__strip-delta-week">LST WK</span></span>`;
  }

  const items = [
    { val: activeCount, label: 'Active Engagements', col: 'var(--success)', d: delta(activeCount, 'active_projects') },
    { val: onTrackCount, label: 'On Track', col: 'var(--success)', d: delta(onTrackCount, 'on_track_count') },
    { val: needsAttentionCount, label: 'Needs Attention', col: 'var(--warning)', d: delta(needsAttentionCount, 'overdue_count') },
    { val: atRiskCount, label: 'At Risk', col: 'var(--danger)', d: delta(atRiskCount, 'at_risk_count') },
    { val: leadsCount, label: 'Active Leads', col: 'var(--accent)', d: delta(leadsCount, 'active_leads_count') },
    { val: workTypesCount, label: 'Work Types Active', col: 'var(--purple)', d: '' },
  ];

  return `<div class="pf__strip">${items.map(i => `
    <div class="pf__strip-item">
      <div class="pf__strip-top"><span class="pf__strip-val" style="color:${i.col}">${i.val}</span>${i.d}</div>
      <span class="pf__strip-label">${i.label}</span>
    </div>`).join('')}
  </div>`;
}

function renderPfSidebar(filtered, roots, now) {
  const clientMap = {};
  roots.forEach(r => {
    const client = getTaskClient(r);
    if (!client) return;
    if (!clientMap[client]) clientMap[client] = [];
    clientMap[client].push(r);
  });
  const sortedClients = Object.keys(clientMap).sort(clientSortOrder);

  const allActive = roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const allOverdue = filtered.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
  const allAtRisk = filtered.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');
  const allDone = filtered.filter(t => t.status === 'Done').length;
  const allPct = filtered.length > 0 ? Math.round(allDone / filtered.length * 100) : 0;

  let html = '<div class="pf__sidebar">';

  const pfSelected = !_portfolioSelectedClient;
  html += `<div class="pf__client pf__client--green ${pfSelected ? 'pf__client--selected' : ''}" data-action="selectPortfolioClient" data-arg0="null">`;
  html += `<div class="pf__client-name"><span class="pf__client-dot" style="background:var(--accent)"></span>Portfolio</div>`;
  html += `<div class="pf__client-stats"><span>${allActive.length} active</span>`;
  if (allOverdue.length > 0) html += `<span class="danger">${allOverdue.length} overdue</span>`;
  if (allAtRisk.length > 0) html += `<span class="danger">${allAtRisk.length} at risk</span>`;
  html += `</div>`;
  html += `<div class="pf__client-bar"><div class="pf__client-bar-fill" style="width:${allPct}%;background:var(--accent)"></div></div>`;
  html += `<div class="pf__client-pct">${allPct}%</div>`;
  html += `</div>`;

  sortedClients.forEach(clientName => {
    const clientTasks = filtered.filter(t => getTaskClient(t) === clientName);
    const projects = clientMap[clientName];
    const active = projects.filter(p => p.status !== 'Done' && p.status !== 'Cancelled');
    const overdue = clientTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now);
    const blocked = clientTasks.filter(t => t.healthState === 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled');
    const atRisk = clientTasks.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled');
    const done = clientTasks.filter(t => t.status === 'Done').length;
    const pct = clientTasks.length > 0 ? Math.round(done / clientTasks.length * 100) : 0;

    const hasIssues = atRisk.length > 0 || blocked.length > 0;
    const hasYellow = clientTasks.some(t => t.healthState === 'Yellow' && t.status !== 'Done' && t.status !== 'Cancelled');
    const health = hasIssues ? 'Red' : hasYellow ? 'Yellow' : 'Green';
    const healthCol = HEALTH_COLOURS[health] || 'var(--success)';
    const borderClass = hasIssues ? 'pf__client--red' : hasYellow ? 'pf__client--yellow' : 'pf__client--green';
    const isSelected = _portfolioSelectedClient === clientName;

    html += `<div class="pf__client ${borderClass} ${isSelected ? 'pf__client--selected' : ''}" data-action="selectPortfolioClient" data-arg0="${esc(clientName)}">`;
    html += `<div class="pf__client-name"><span class="pf__client-dot" style="background:${healthCol}"></span>${esc(clientName)}</div>`;
    html += `<div class="pf__client-stats"><span>${active.length} active</span>`;
    if (overdue.length > 0) html += `<span class="danger">${overdue.length} overdue</span>`;
    if (blocked.length > 0) html += `<span class="danger">${blocked.length} blocked</span>`;
    if (atRisk.length > 0) html += `<span class="danger">${atRisk.length} at risk</span>`;
    html += `</div>`;
    html += `<div class="pf__client-bar"><div class="pf__client-bar-fill" style="width:${pct}%;background:${healthCol}"></div></div>`;
    html += `<div class="pf__client-pct">${pct}%</div>`;
    html += `</div>`;
  });

  html += '</div>';
  return html;
}

// COMMENTED OUT — v3 Work Completed (replaced by v4 Progress Status donut)
// function renderPfWorkCompleted() { /* ... see git history ... */ }

function renderPfProgressStatus(panelTasks) {
  const active = panelTasks.filter(t => t.status !== 'Cancelled');
  const total = active.length;
  if (total === 0) {
    return '<div class="pf__panel"><div class="pf__panel-hdr"><div class="pf__panel-title">Progress Status</div></div><div class="pf__panel-body"><div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-muted);font-size:0.82rem">No tasks found.</div></div></div>';
  }

  const buckets = [
    { key: 'done', label: 'COMPLETED', colour: '#22c55e', count: 0 },
    { key: 'inprogress', label: 'IN PROGRESS', colour: '#06b6d4', count: 0 },
    { key: 'planning', label: 'PLANNING', colour: '#3b82f6', count: 0 },
    { key: 'notstarted', label: 'NOT STARTED', colour: '#94a3b8', count: 0 },
    { key: 'waiting', label: 'WAITING ON CLIENT', colour: '#f59e0b', count: 0 },
    { key: 'blocked', label: 'BLOCKED', colour: '#ef4444', count: 0 },
  ];

  active.forEach(t => {
    if (t.status === 'Blocked') buckets[5].count++;
    else if (t.healthState === 'Waiting on Client') buckets[4].count++;
    else if (t.status === 'Done') buckets[0].count++;
    else if (t.status === 'In progress') buckets[1].count++;
    else if (t.status === 'Planning') buckets[2].count++;
    else buckets[3].count++;
  });

  const nonZero = buckets.filter(b => b.count > 0);
  const cx = 400, cy = 200, r = 150, sw = 50;
  const circ = 2 * Math.PI * r;
  const svgW = 800, svgH = 400;

  let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" style="display:block">`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${sw}"/>`;

  let offset = 0;
  const segments = [];
  nonZero.forEach(b => {
    const pct = b.count / total;
    const dashLen = pct * circ;
    const gap = nonZero.length > 1 ? 2 : 0;
    const drawLen = Math.max(0, dashLen - gap);
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${b.colour}" stroke-width="${sw}" stroke-dasharray="${drawLen.toFixed(1)} ${(circ - drawLen).toFixed(1)}" stroke-dashoffset="${(-(offset + gap / 2)).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    const midFrac = (offset + dashLen / 2) / circ;
    const midAngle = midFrac * 2 * Math.PI - Math.PI / 2;
    if (Math.round(pct * 100) > 0) segments.push({ b, midAngle, pct });
    offset += dashLen;
  });

  const outerR = r + sw / 2 + 4;
  const rightLabels = segments.filter(s => Math.cos(s.midAngle) >= 0);
  const leftLabels = segments.filter(s => Math.cos(s.midAngle) < 0);

  function spaceLabels(group, side) {
    if (group.length === 0) return;
    group.sort((a, b) => {
      const ay = cy + Math.sin(a.midAngle) * outerR;
      const by = cy + Math.sin(b.midAngle) * outerR;
      return ay - by;
    });
    const minGap = 50;
    const minY = 30, maxY = svgH - 30;
    const positions = group.map(seg => cy + Math.sin(seg.midAngle) * outerR);
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] - positions[i - 1] < minGap) positions[i] = positions[i - 1] + minGap;
    }
    if (positions.length > 0 && positions[positions.length - 1] > maxY) {
      const shift = positions[positions.length - 1] - maxY;
      for (let i = 0; i < positions.length; i++) positions[i] -= shift;
      for (let i = 1; i < positions.length; i++) {
        if (positions[i] - positions[i - 1] < minGap) positions[i] = positions[i - 1] + minGap;
      }
    }
    if (positions.length > 0 && positions[0] < minY) {
      const shift = minY - positions[0];
      for (let i = 0; i < positions.length; i++) positions[i] += shift;
      for (let i = 1; i < positions.length; i++) {
        if (positions[i] - positions[i - 1] < minGap) positions[i] = positions[i - 1] + minGap;
      }
    }
    const elbowX = side === 'right' ? cx + outerR + 30 : cx - outerR - 30;
    const lineEndX = side === 'right' ? elbowX + 30 : elbowX - 30;
    const textX = side === 'right' ? lineEndX + 6 : lineEndX - 6;
    const anchor = side === 'right' ? 'start' : 'end';

    group.forEach((seg, i) => {
      const dotX = cx + Math.cos(seg.midAngle) * outerR;
      const dotY = cy + Math.sin(seg.midAngle) * outerR;
      const labelY = positions[i];
      const pctText = Math.round(seg.pct * 100) + '%';

      svg += `<circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="3.5" fill="${seg.b.colour}"/>`;
      svg += `<line x1="${dotX.toFixed(1)}" y1="${dotY.toFixed(1)}" x2="${elbowX}" y2="${labelY.toFixed(1)}" stroke="#4dd0e1" stroke-width="1.2" fill="none" opacity="0.65"/>`;
      svg += `<line x1="${elbowX}" y1="${labelY.toFixed(1)}" x2="${lineEndX}" y2="${labelY.toFixed(1)}" stroke="#4dd0e1" stroke-width="1.2" fill="none" opacity="0.65"/>`;
      svg += `<text x="${textX}" y="${(labelY - 2).toFixed(1)}" text-anchor="${anchor}" fill="${seg.b.colour}" font-size="28" font-weight="700">${pctText}</text>`;
      svg += `<text x="${textX}" y="${(labelY + 22).toFixed(1)}" text-anchor="${anchor}" fill="#94a3b8" font-size="15" font-weight="700" letter-spacing="0.5">${seg.b.label}</text>`;
    });
  }

  spaceLabels(rightLabels, 'right');
  spaceLabels(leftLabels, 'left');

  svg += '</svg>';

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">PROGRESS STATUS</div></div>';
  html += `<div class="pf__panel-body" style="padding:0">${svg}</div>`;
  html += '</div>';
  return html;
}

// COMMENTED OUT — v3 Client Health Scorecard (replaced by v4 Upcoming Milestones)
// function renderPfHealthScorecard(filtered, roots, now) { /* ... see git history ... */ }

function renderPfMilestones(panelRoots, now) {
  const activeRoots = panelRoots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const withDate = activeRoots.map(r => {
    const targetDate = r.dueDate || r.endDate;
    if (!targetDate) return null;
    const due = safeParseDate(targetDate);
    if (!due) return null;
    const kids = getDescendants(r.id);
    const all = [r, ...kids];
    const done = all.filter(t => t.status === 'Done').length;
    const pct = all.length > 0 ? Math.round(done / all.length * 100) : 0;
    return { ...r, _due: due, _pct: pct, _dateType: r.dueDate ? 'due' : 'end' };
  }).filter(Boolean);

  const overdue = withDate.filter(r => r._due < now).sort((a, b) => a._due - b._due);
  const upcoming = withDate.filter(r => r._due >= now).sort((a, b) => a._due - b._due);
  const items = [...overdue, ...upcoming].slice(0, 8);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">UPCOMING MILESTONES</div></div>';
  html += '<div class="pf__panel-body">';

  if (items.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-muted);font-size:0.82rem">No projects with target dates.</div>';
  } else {
    items.forEach(t => {
      const isOverdue = t._due < now;
      const daysUntil = Math.ceil((t._due - now) / 86400000);
      const daysLate = Math.ceil((now - t._due) / 86400000);
      const barCol = isOverdue ? 'var(--danger)' : daysUntil <= 7 ? 'var(--warning)' : 'var(--success)';
      const client = getTaskClient(t) || '';
      const abbr = getClientAbbreviation(client);
      const abbrCol = isOverdue ? 'var(--danger)' : 'var(--accent)';

      let statusText, statusCol;
      if (isOverdue) {
        statusText = daysLate + 'd overdue';
        statusCol = 'var(--danger)';
      } else if (daysUntil === 0) {
        statusText = 'Due today';
        statusCol = 'var(--danger)';
      } else if (daysUntil === 1) {
        statusText = 'Due tomorrow';
        statusCol = 'var(--warning)';
      } else if (daysUntil <= 7) {
        statusText = daysUntil + 'd left';
        statusCol = 'var(--warning)';
      } else {
        statusText = 'On track';
        statusCol = 'var(--success)';
      }
      const dateStr = t._due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      html += `<div class="pf__milestone-item" data-action="openDetailOverlay" data-arg0="${t.id}">`;
      html += `<div class="pf__milestone-bar" style="background:${barCol}"></div>`;
      html += '<div style="flex:1;min-width:0">';
      html += `<div class="pf__milestone-title"><span class="pf__milestone-abbr" style="color:${abbrCol}">${esc(abbr)}</span> - ${esc(t.title)}</div>`;
      const workType = t.workType || '';
      html += `<div class="pf__milestone-sub">${esc(client)}${workType ? ' \u00B7 ' + esc(workType) : ''}</div>`;
      html += '</div>';
      html += `<div style="text-align:right"><div class="pf__milestone-status" style="color:${statusCol}">${statusText}</div><div class="pf__milestone-date">${dateStr}</div></div>`;
      html += '</div>';
    });
  }

  html += '</div></div>';
  return html;
}

function renderPfTimeline(panelTasks, panelRoots, now) {
  const activeProjects = panelRoots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled' && r.itemType === 'project');

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">PROJECT TIMELINE</div></div>';
  html += '<div class="pf__panel-body" style="padding:0 14px 10px">';

  if (activeProjects.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:60px;color:var(--text-muted);font-size:0.82rem">No active projects.</div>';
    html += '</div></div>';
    return html;
  }

  const projects = activeProjects.map(r => {
    let s = r.startDate ? safeParseDate(r.startDate) : null;
    let e = r.endDate ? safeParseDate(r.endDate) : (r.dueDate ? safeParseDate(r.dueDate) : null);
    if (!s && r.createdAt) s = safeParseDate(r.createdAt);
    if (!s) s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (!e) { e = new Date(s); e.setMonth(e.getMonth() + 3); }
    if (e <= s) { e = new Date(s); e.setMonth(e.getMonth() + 1); }
    const client = getTaskClient(r) || 'Other';
    return { id: r.id, title: r.title, client, _start: s, _end: e };
  });

  const clientOrder = ['Couch Heroes', 'Lighthouse Studios', 'Sarge Universe', 'Goals Studio', 'Playsage', 'NBI OPS', 'NSI'];
  const clientGroups = {};
  projects.forEach(p => {
    if (!clientGroups[p.client]) clientGroups[p.client] = [];
    clientGroups[p.client].push(p);
  });
  const sortedClients = Object.keys(clientGroups).sort((a, b) => {
    const ai = clientOrder.indexOf(a); const bi = clientOrder.indexOf(b);
    return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99);
  });
  const clientSummaries = sortedClients.map(name => {
    const grp = clientGroups[name];
    grp.sort((a, b) => a._start - b._start);
    return { name, _start: new Date(Math.min(...grp.map(p => p._start))), _end: new Date(Math.max(...grp.map(p => p._end))), count: grp.length, projects: grp };
  });

  const globalMin = new Date(Math.min(...projects.map(p => p._start)));
  const globalMax = new Date(Math.max(...projects.map(p => p._end)));
  globalMin.setDate(1);
  globalMax.setMonth(globalMax.getMonth() + 1, 1);
  const totalDays = Math.round((globalMax - globalMin) / 86400000);

  const months = [];
  let md = new Date(globalMin);
  while (md < globalMax) {
    const mEnd = new Date(md.getFullYear(), md.getMonth() + 1, 1);
    const mDays = Math.round((Math.min(mEnd, globalMax) - md) / 86400000);
    months.push({ label: md.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(), days: mDays, isNow: md.getMonth() === now.getMonth() && md.getFullYear() === now.getFullYear() });
    md = mEnd;
  }

  const labelW = 150;
  html += `<div style="display:flex">`;
  html += `<div style="width:${labelW}px;flex-shrink:0"></div>`;
  html += `<div style="flex:1;display:flex;border-bottom:1px solid var(--border-subtle)">`;
  months.forEach(m => {
    const widthPct = (m.days / totalDays * 100).toFixed(2);
    html += `<div style="width:${widthPct}%;text-align:center;font-size:${m.isNow ? '0.82rem' : '0.68rem'};font-weight:${m.isNow ? '700' : '600'};color:${m.isNow ? 'var(--text-primary)' : 'var(--text-muted)'};padding:4px 0;border-right:1px solid var(--border-subtle)">${m.label}</div>`;
  });
  html += '</div></div>';

  clientSummaries.forEach((cs, idx) => {
    const leftPct = ((cs._start - globalMin) / 86400000 / totalDays * 100).toFixed(2);
    const widthPct = Math.max(1, ((cs._end - cs._start) / 86400000 / totalDays * 100)).toFixed(2);
    const zebra = idx % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : '';
    const groupId = 'tlg_' + idx;
    html += `<div style="display:flex;align-items:center;min-height:30px;cursor:pointer;border-bottom:1px solid var(--border-subtle);${zebra}" onclick="var el=document.getElementById('${groupId}');if(el.style.display==='none'){el.style.display='block';this.querySelector('.tl-chev').textContent='\\u25BC'}else{el.style.display='none';this.querySelector('.tl-chev').textContent='\\u25B6'}" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='${idx % 2 === 1 ? 'rgba(255,255,255,0.02)' : ''}'">`;
    html += `<div style="width:${labelW}px;flex-shrink:0;font-size:0.75rem;font-weight:700;color:var(--accent);padding:0 8px 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span class="tl-chev" style="font-size:0.6rem;margin-right:4px;color:var(--text-muted)">&#9654;</span>${esc(cs.name)} <span style="font-weight:400;color:var(--text-muted)">(${cs.count})</span></div>`;
    html += `<div style="flex:1;position:relative;height:18px">`;
    html += `<div style="position:absolute;left:${leftPct}%;width:${widthPct}%;top:2px;bottom:2px;background:#00e5ff;border-radius:3px;opacity:0.85"></div>`;
    html += '</div></div>';

    html += `<div id="${groupId}" style="display:none">`;
    cs.projects.forEach(p => {
      const pLeft = ((p._start - globalMin) / 86400000 / totalDays * 100).toFixed(2);
      const pWidth = Math.max(0.5, ((p._end - p._start) / 86400000 / totalDays * 100)).toFixed(2);
      html += `<div style="display:flex;align-items:center;min-height:26px;cursor:pointer;border-bottom:1px solid var(--border-subtle);background:rgba(255,255,255,0.015)" data-action="openDetailOverlay" data-arg0="${p.id}" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='rgba(255,255,255,0.015)'">`;
      html += `<div style="width:${labelW}px;flex-shrink:0;font-size:0.7rem;font-weight:400;color:var(--text-secondary);padding:0 8px 0 18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.title)}</div>`;
      html += `<div style="flex:1;position:relative;height:14px">`;
      html += `<div style="position:absolute;left:${pLeft}%;width:${pWidth}%;top:2px;bottom:2px;background:#00e5ff;border-radius:2px;opacity:0.65"></div>`;
      html += '</div></div>';
    });
    html += '</div>';
  });

  html += '</div></div>';
  return html;
}

// COMMENTED OUT — v3 Needs Attention main panel (moved to bottom row in v4)
// function renderPfNeedsAttention(panelTasks, now) { /* ... see git history ... */ }

function renderPfWorkTypes(panelRoots) {
  const activeRoots = panelRoots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const typeCounts = {};
  activeRoots.forEach(r => {
    if (r.workType) {
      typeCounts[r.workType] = (typeCounts[r.workType] || 0) + 1;
    }
  });

  const sorted = Object.entries(typeCounts).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(1, sorted.length > 0 ? sorted[0][1] : 1);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">WORK TYPES</div></div>';
  html += '<div class="pf__panel-body">';

  if (sorted.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-muted);font-size:0.82rem">No work types assigned to projects.</div>';
  } else {
    sorted.forEach(([name, count]) => {
      const barW = Math.round(count / maxCount * 100);
      html += '<div class="pf__wt-row">';
      html += `<div class="pf__wt-label">${esc(name)}</div>`;
      html += `<div class="pf__wt-bar-track"><div class="pf__wt-bar" style="width:${barW}%"></div></div><span style="min-width:24px;text-align:right;font-size:0.8rem;font-weight:700;color:var(--text-secondary)">${count}</span>`;
      html += '</div>';
    });
    const axisSteps = Math.min(maxCount, 6);
    html += '<div class="pf__wt-axis">';
    for (let i = 0; i <= axisSteps; i++) {
      html += `<span>${Math.round(i * maxCount / axisSteps)}</span>`;
    }
    html += '</div>';
  }

  html += '</div></div>';
  return html;
}

function renderPfCompletingSoon(panelRoots, now) {
  const activeRoots = panelRoots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const nearComplete = activeRoots.map(r => {
    const kids = getDescendants(r.id);
    const all = [r, ...kids];
    const d = all.filter(t => t.status === 'Done').length;
    const pct = all.length > 0 ? Math.round(d / all.length * 100) : 0;
    return { ...r, _pct: pct, _client: getTaskClient(r) || '' };
  }).filter(r => r._pct >= 60 && r._pct < 100).sort((a, b) => b._pct - a._pct).slice(0, 6);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title" style="color:var(--success)">Completing Soon</div><div class="pf__panel-sub">Projects 60-99% done</div></div>';
  html += '<div class="pf__panel-body">';

  if (nearComplete.length === 0) {
    html += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">No projects near completion.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:6px">';
    nearComplete.forEach(r => {
      const healthCol = HEALTH_COLOURS[r.healthState] || 'var(--success)';
      html += `<div class="pf__attn-item" data-action="openDetailOverlay" data-arg0="${r.id}">`;
      html += `<span style="width:6px;height:6px;border-radius:50%;background:${healthCol};flex-shrink:0"></span>`;
      html += `<div style="flex:1;min-width:0"><div class="pf__attn-title">${esc(r.title)}</div><div class="pf__attn-context">${esc(r._client)}</div></div>`;
      html += `<div style="width:60px;flex-shrink:0"><div style="height:4px;background:var(--border-subtle);border-radius:2px;overflow:hidden"><div style="width:${r._pct}%;height:100%;background:var(--success);border-radius:2px"></div></div></div>`;
      html += `<span style="font-size:0.72rem;color:var(--success);font-weight:600;flex-shrink:0;width:32px;text-align:right">${r._pct}%</span>`;
      html += `</div>`;
    });
    html += '</div>';
  }

  html += '</div></div>';
  return html;
}

function renderPfUpcomingMilestones(panelTasks, now, fortnight) {
  const upcoming = panelTasks.filter(t => {
    if (!t.dueDate || t.status === 'Done' || t.status === 'Cancelled' || t.parentId) return false;
    const d = safeParseDate(t.dueDate);
    return d >= now && d <= fortnight;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 6);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title" style="color:var(--accent)">Upcoming Milestones</div><div class="pf__panel-sub">Due within 14 days</div></div>';
  html += '<div class="pf__panel-body">';

  if (upcoming.length === 0) {
    html += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">No milestones in the next 14 days.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:6px">';
    upcoming.forEach(t => {
      const d = safeParseDate(t.dueDate);
      const daysUntil = Math.ceil((d - now) / 86400000);
      const dayLabel = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const badgeClass = daysUntil <= 2 ? 'pf__attn-badge--overdue' : daysUntil <= 5 ? 'pf__attn-badge--risk' : '';
      const badgeStyle = !badgeClass ? 'background:rgba(85,85,85,0.2);color:var(--text-muted);border-color:rgba(85,85,85,0.3)' : '';

      html += `<div class="pf__attn-item" data-action="openDetailOverlay" data-arg0="${t.id}">`;
      html += `<span class="pf__attn-badge ${badgeClass}" ${badgeStyle ? `style="${badgeStyle}"` : ''}>${dayLabel}</span>`;
      html += `<div style="flex:1;min-width:0"><div class="pf__attn-title">${esc(t.title)}</div><div class="pf__attn-context">${esc(getTaskClient(t) || '')}</div></div>`;
      html += `</div>`;
    });
    html += '</div>';
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
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">Team Workload</div><div class="pf__panel-sub">Active tasks per person</div></div>';
  html += '<div class="pf__panel-body">';

  if (sorted.length === 0) {
    html += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">No assigned tasks.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:4px">';
    sorted.forEach(([name, count]) => {
      const barW = Math.round(count / maxCount * 100);
      const col = count > 30 ? 'var(--danger)' : count > 15 ? 'var(--warning)' : 'var(--success)';
      html += `<div class="pf__workload-row" data-action="_actSetFilterAssignee" data-arg0="${esc(name)}">`;
      html += `<span class="pf__workload-name">${esc(name)}</span>`;
      html += `<div class="pf__workload-bar"><div class="pf__workload-fill" style="width:${barW}%;background:${col}"></div></div>`;
      html += `<span class="pf__workload-count" style="color:${col}">${count}</span>`;
      html += `</div>`;
    });
    html += '</div>';
    html += `<div style="padding:6px 0 0;font-size:0.62rem;color:var(--text-muted)"><span style="color:var(--danger)">\u25CF</span> >30 &nbsp; <span style="color:var(--warning)">\u25CF</span> 15-30 &nbsp; <span style="color:var(--success)">\u25CF</span> <15</div>`;
  }

  html += '</div></div>';
  return html;
}

function renderPfBottomNeedsAttention(panelTasks, now) {
  const blocked = panelTasks.filter(t => t.healthState === 'Blocked' && t.status !== 'Done' && t.status !== 'Cancelled');
  const overdue = panelTasks.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < now && t.healthState !== 'Blocked');
  const atRisk = panelTasks.filter(t => t.healthState === 'Red' && t.status !== 'Done' && t.status !== 'Cancelled' && !(t.dueDate && safeParseDate(t.dueDate) < now));
  overdue.sort((a, b) => safeParseDate(a.dueDate) - safeParseDate(b.dueDate));
  const items = [...blocked, ...overdue, ...atRisk];
  const seen = new Set();
  const unique = items.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  const showCount = _portfolioBottomAttentionExpanded ? unique.length : 5;
  const visible = unique.slice(0, showCount);
  const remaining = unique.length - visible.length;

  let html = '<div class="pf__panel">';
  html += `<div class="pf__panel-hdr"><div class="pf__panel-title" style="color:var(--danger)">Needs Attention</div><div class="pf__panel-sub">Blocked, overdue &amp; at risk</div></div>`;
  html += '<div class="pf__panel-body">';

  if (unique.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:80px;color:var(--success);font-size:0.82rem">All clear.</div>';
  } else {
    visible.forEach(t => {
      const parent = t.parentId ? tasks.find(p => p.id === t.parentId) : null;
      const projectName = parent ? parent.title : '';
      const clientName = getTaskClient(t) || '';
      let badge = '', badgeClass = '', borderCol = 'var(--danger)';
      if (t.healthState === 'Blocked') {
        badge = 'BLOCKED'; badgeClass = 'pf__na-badge--blocked'; borderCol = 'var(--purple)';
      } else if (t.dueDate && safeParseDate(t.dueDate) < now) {
        const daysLate = Math.ceil((now - safeParseDate(t.dueDate)) / 86400000);
        badge = daysLate + 'd late'; badgeClass = 'pf__na-badge--overdue';
      } else {
        badge = 'AT RISK'; badgeClass = 'pf__na-badge--risk'; borderCol = '#f97316';
      }
      const ctx = [clientName, projectName].filter(Boolean).join(' \u2014 ');
      html += `<div class="pf__na-item" data-action="openDetailOverlay" data-arg0="${t.id}">`;
      html += `<div class="pf__na-border" style="background:${borderCol}"></div>`;
      html += `<span class="pf__na-badge ${badgeClass}">${badge}</span>`;
      html += `<div style="flex:1;min-width:0"><div style="font-size:0.7rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</div>`;
      if (ctx) html += `<div style="font-size:0.58rem;color:var(--text-muted)">${esc(ctx)}</div>`;
      html += '</div></div>';
    });
    if (remaining > 0) {
      html += `<div style="text-align:center;padding:6px;font-size:0.65rem;color:var(--text-muted);cursor:pointer" data-action="_actSetPortfolioBottomExpanded">+ ${remaining} more</div>`;
    }
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
  html += `<span class="standup-task__title ${isDone ? 'standup-task__title--done' : ''}" data-action="openDetailOverlay" data-stop data-arg0="${t.id}">${esc(t.title)}</span>`;
  html += standupAssigneeHtml(t.id, t.assignees);
  html += standupSelect(t.id, 'priority', t.priority || '', ['', ...PRIORITIES]);
  html += standupSelect(t.id, 'healthState', t.healthState || '', ['', ...HEALTH_STATES]);
  html += standupDate(t.id, 'startDate', t.startDate, 'S');
  html += standupDate(t.id, 'endDate', t.endDate, 'E');
  html += standupDate(t.id, 'dueDate', t.dueDate, 'D');
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
  const oldValue = task[field];
  if (oldValue === value) return;
  task[field] = value;
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  pushUndo(`${field} change on "${task.title}"`, () => { task[field] = oldValue; task.updatedAt = new Date().toISOString(); markDirty(taskId); });
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
 *  On first load (no cache), falls back to window._scrollRestoreTarget for the async standup. */
function _softReRender() {
  const scrollEl = document.querySelector('.main__content');
  if (!scrollEl) { renderContent(); return; }
  const savedScroll = scrollEl.scrollTop;
  // Fallback for async standup (first load only, before cache exists)
  window._scrollRestoreTarget = savedScroll > 0 ? savedScroll : null;
  renderContent();
  if (typeof renderSidebar === 'function') renderSidebar();
  if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
  // Restore scroll synchronously — works because standup now renders synchronously
  // when _cachedTeamMembers exists (which it does after the first render).
  if (scrollEl && savedScroll > 0) {
    scrollEl.scrollTop = savedScroll;
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
  if (vals[2]) { vals[2].textContent = thisWeek; vals[2].style.color = thisWeek > 0 ? '#f59e0b' : 'var(--success)'; }
  if (vals[3]) { vals[3].textContent = blocked; vals[3].style.color = blocked > 0 ? 'var(--purple)' : 'var(--success)'; }
  if (vals[4]) { vals[4].textContent = atRisk; vals[4].style.color = atRisk > 0 ? 'var(--warning)' : 'var(--success)'; }
  if (vals[5]) vals[5].textContent = donePct + '%';
  if (vals[6]) vals[6].textContent = filtered.length;
}

/** Build a compact inline <select> for the standup row */
function standupSelect(taskId, field, currentVal, options) {
  return `<select class="standup-inline standup-inline--select" onchange="event.stopPropagation();standupUpdateTask('${taskId}','${field}',this.value,this)" data-stop>${options.map(o => `<option value="${esc(o)}" ${(currentVal||'')===o?'selected':''}>${esc(o||'--')}</option>`).join('')}</select>`;
}

/** Build a compact inline date input for the standup row */
function standupDate(taskId, field, currentVal, label) {
  return `<span class="standup-label">${label}</span><input type="date" class="standup-inline standup-inline--date" value="${currentVal||''}" onchange="event.stopPropagation();standupUpdateTask('${taskId}','${field}',this.value,this)" data-stop>`;
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
  const filtered = getFilteredTasks();
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
  } catch(e) {}

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
    const totalBlocked = Object.values(clients).flat().filter(t => t.healthState === 'Blocked').length;
    const totalOverdue = Object.values(clients).flat().filter(t => t.dueDate && safeParseDate(t.dueDate) < now).length;
    const isExpanded = _expandedStandupPeople.has(person);

    html += `<div class="tactical-person ${isExpanded ? 'expanded' : ''}">`;
    html += `<div class="tactical-person__header" data-action="toggleStandupPerson" data-arg0="${esc(person)}" data-pass-el>
      <span class="tactical-person__name">${esc(person)}</span>
      <span class="tactical-person__stats">${totalTasks} active${totalBlocked > 0 ? ` &middot; <span style="color:var(--purple)">${totalBlocked} blocked</span>` : ''}${totalOverdue > 0 ? ` &middot; <span style="color:var(--danger)">${totalOverdue} overdue</span>` : ''}</span>
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
        html += `<div class="tactical-client-group__header">${clientBadgeHtml(client)} <span style="font-size:0.78rem;color:var(--text-secondary)">${esc(client)}</span> <span style="font-size:0.7rem;color:var(--text-muted)">(${activeOnly.length})</span></div>`;
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
        html += `<span style="color:var(--success);font-size:0.78rem;font-weight:600">${doneCollapsed ? '\u25B6' : '\u25BC'} Completed (${allDone.length})</span>`;
        html += `</div>`;
        html += `<div class="standup-done-body"${doneCollapsed ? ' style="display:none"' : ''}>`;
        allDone.forEach(({ task: t, client }) => {
          html += `<div style="font-size:0.7rem;color:var(--text-muted);padding-left:6px">${esc(client)}</div>`;
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
      html += `<span class="standup-task__title ${isDone ? 'standup-task__title--done' : ''}" data-action="openDetailOverlay" data-stop data-arg0="${t.id}">${esc(t.title)}</span>`;
      html += standupAssigneeHtml(t.id, t.assignees);
      html += standupSelect(t.id, 'priority', t.priority || '', ['', ...PRIORITIES]);
      html += standupSelect(t.id, 'healthState', t.healthState || '', ['', ...HEALTH_STATES]);
      html += standupDate(t.id, 'startDate', t.startDate, 'S');
      html += standupDate(t.id, 'endDate', t.endDate, 'E');
      html += standupDate(t.id, 'dueDate', t.dueDate, 'D');
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
  if (window._scrollRestoreTarget !== null) {
    const scrollEl = document.querySelector('.main__content');
    const target = window._scrollRestoreTarget;
    window._scrollRestoreTarget = null;
    if (scrollEl) {
      // Synchronously restore — don't wait for rAF (which allows a flash frame)
      scrollEl.scrollTop = target;
    }
  }
}

// ==================== CHARTS (SVG) ====================

/**
 * Render an SVG donut chart with legend from a { label: count } data map.
 * @param {Object} data - Key/value pairs to chart
 * @param {Object} colours - Colour map keyed by data label
 * @param {number} total - Sum used for percentage calculation
 */
function renderDonutChart(data, colours, total) {
  const entries = Object.entries(data).filter(([k,v]) => v > 0 && k !== 'Not set');
  if (entries.length === 0) return '<div style="color:var(--text-muted);padding:40px">No data</div>';
  const size = 180, cx = size/2, cy = size/2, r = 70, r2 = 48;
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  let angle = -90;
  entries.forEach(([key, val]) => {
    const pct = val / total;
    const sweep = pct * 360;
    const large = sweep > 180 ? 1 : 0;
    const startRad = (angle * Math.PI) / 180;
    const endRad = ((angle + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
    const ix1 = cx + r2 * Math.cos(endRad), iy1 = cy + r2 * Math.sin(endRad);
    const ix2 = cx + r2 * Math.cos(startRad), iy2 = cy + r2 * Math.sin(startRad);
    svg += `<path d="M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${r2},${r2} 0 ${large} 0 ${ix2},${iy2} Z" fill="${colours[key]||'#666'}" opacity="0.9"/>`;
    angle += sweep;
  });
  svg += `<text x="${cx}" y="${cy-4}" text-anchor="middle" fill="var(--text-primary)" font-family="var(--font-display)" font-size="22" font-weight="700">${total}</text>`;
  svg += `<text x="${cx}" y="${cy+14}" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-display)" font-size="8" letter-spacing="1">TRACKED</text>`;
  svg += `</svg>`;
  // Legend
  let legend = '<div class="chart-legend">';
  entries.forEach(([key, val]) => { legend += `<div class="chart-legend__item"><span class="chart-legend__dot" style="background:${colours[key]||'#666'}"></span>${esc(key)} (${val})</div>`; });
  legend += '</div>';
  return svg + legend;
}

/** Render a horizontal bar chart from a { label: count } data map */
function renderBarChart(data, colours) {
  const entries = Object.entries(data).filter(([k,v]) => v > 0);
  if (entries.length === 0) return '<div style="color:var(--text-muted);padding:40px">No data</div>';
  const max = Math.max(...entries.map(([,v]) => v), 1);
  let html = '<div style="width:100%;padding:0 10px;display:flex;flex-direction:column;justify-content:space-around;flex:1">';
  entries.forEach(([key, val]) => {
    const pct = (val / max) * 100;
    html += `<div style="display:flex;align-items:center;gap:8px"><span style="min-width:85px;font-size:0.88rem;color:var(--text-secondary);text-align:right">${esc(key)}</span><div style="flex:1;height:24px;background:var(--border-subtle);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${colours[key]||'var(--accent)'};border-radius:3px;transition:width 0.3s"></div></div><span style="min-width:30px;font-family:var(--font-mono);font-size:0.9rem;color:var(--text-secondary)">${val}</span></div>`;
  });
  html += '</div>';
  return html;
}

// ==================== BADGE HELPERS ====================


/** Render a coloured status badge */
function statusBadgeHtml(s) {
  const cls = { 'In Review': 'badge--yellow', 'Blocked': 'badge--blocked', 'Done': 'badge--green', 'In progress': 'badge--status' };
  return `<span class="badge ${cls[s] || 'badge--status'}">${esc(s)}</span>`;
}

// ==================== MY TASKS VIEW ====================

let _myTasksSort = 'priority'; // 'priority' | 'dueDate' | 'client' | 'status'

/** Priority sort weight: lower = more urgent */
function _priorityWeight(p) {
  if (p === 'Critical ACT') return 0;
  if (p === 'Urgent') return 1;
  if (p === 'High') return 2;
  if (p === 'Medium') return 3;
  if (p === 'Low') return 4;
  return 5;
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
      ${hrsStr ? `<span class="mytask-row__hours">${hrsStr}</span>` : ''}
      ${dueLabel ? `<span style="font-family:var(--font-mono);font-size:0.75rem;${dueClass}">${isOverdue?'&#9888; ':''}${dueLabel}</span>` : ''}
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
  const critical = active.filter(t => t.healthState === 'Blocked' || t.healthState === 'Red' || t.priority === 'Critical ACT' || t.priority === 'Urgent');
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
      <button class="btn btn--outline ${_myTasksSort==='priority'?'btn--primary':''}" data-action="_actSetMyTasksSort" data-arg0="priority" style="font-size:0.75rem;padding:4px 10px">Priority</button>
      <button class="btn btn--outline ${_myTasksSort==='dueDate'?'btn--primary':''}" data-action="_actSetMyTasksSort" data-arg0="dueDate" style="font-size:0.75rem;padding:4px 10px">Due Date</button>
      <button class="btn btn--outline ${_myTasksSort==='client'?'btn--primary':''}" data-action="_actSetMyTasksSort" data-arg0="client" style="font-size:0.75rem;padding:4px 10px">Client</button>
      <button class="btn btn--outline ${_myTasksSort==='status'?'btn--primary':''}" data-action="_actSetMyTasksSort" data-arg0="status" style="font-size:0.75rem;padding:4px 10px">Status</button>
    </div>
  </div>`;

  // KPI row
  html += `<div class="leads-pipeline__metrics" style="margin-bottom:24px">
    <div class="kpi-card"><div class="kpi-card__value">${active.length}</div><div class="kpi-card__label">Active</div></div>
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--danger)">${critical.length + overdue.length}</div><div class="kpi-card__label">Need Attention</div></div>
    <div class="kpi-card"><div class="kpi-card__value">${inProgress.length}</div><div class="kpi-card__label">In Progress</div></div>
    <div class="kpi-card"><div class="kpi-card__value">${completionPct}%</div><div class="kpi-card__label">Complete (${done.length}/${myTasks.length})</div></div>
    <div class="kpi-card"><div class="kpi-card__value" style="font-size:1rem">${totalHrsSpent.toFixed(0)}h / ${totalHrsEst.toFixed(0)}h</div><div class="kpi-card__label">Hours Tracked</div></div>
  </div>`;

  // Section: Critical & Blocked
  if (critical.length > 0) {
    html += `<div class="mytasks-section mytasks-section--critical">
      <h2 class="mytasks-section__header" style="color:var(--danger)">&#9888; Critical &amp; Blocked <span class="mytasks-section__count">${critical.length}</span></h2>
      <div class="mytasks-section__list">${sortTasks(critical).map(_myTaskRow).join('')}</div>
    </div>`;
  }

  // Section: Overdue
  if (overdue.length > 0) {
    html += `<div class="mytasks-section mytasks-section--overdue">
      <h2 class="mytasks-section__header" style="color:var(--warning)">&#128337; Overdue <span class="mytasks-section__count">${overdue.length}</span></h2>
      <div class="mytasks-section__list">${sortTasks(overdue).map(_myTaskRow).join('')}</div>
    </div>`;
  }

  // Section: In Progress
  if (inProgress.length > 0) {
    html += `<div class="mytasks-section">
      <h2 class="mytasks-section__header" style="color:var(--accent)">&#9654; In Progress <span class="mytasks-section__count">${inProgress.length}</span></h2>
      <div class="mytasks-section__list">${sortTasks(inProgress).map(_myTaskRow).join('')}</div>
    </div>`;
  }

  // Section: Upcoming / Not Started
  if (upcoming.length > 0) {
    html += `<div class="mytasks-section">
      <h2 class="mytasks-section__header">&#128203; Upcoming <span class="mytasks-section__count">${upcoming.length}</span></h2>
      <div class="mytasks-section__list">${sortTasks(upcoming).map(_myTaskRow).join('')}</div>
    </div>`;
  }

  // Section: Done (collapsible)
  if (done.length > 0) {
    html += `<div class="mytasks-section">
      <h2 class="mytasks-section__header" style="cursor:pointer;color:var(--text-muted)" data-action="_actToggleMyTasksSection" data-pass-el>
        <span class="mytasks-toggle">&#9654;</span> Completed <span class="mytasks-section__count">${done.length}</span>
      </h2>
      <div class="mytasks-section__list hidden">${done.slice(0, 50).map(_myTaskRow).join('')}${done.length > 50 ? `<div style="color:var(--text-muted);font-size:0.8rem;padding:8px 16px">...and ${done.length - 50} more</div>` : ''}</div>
    </div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
}


// ===== ACT WRAPPERS =====
function _actSetMyTasksSort(v) { _myTasksSort = v; renderContent(); }
function _actSetPortfolioBottomExpanded() { _portfolioBottomAttentionExpanded = true; renderContent(); }
function _actToggleMyTasksSection(el) {
  el.nextElementSibling.classList.toggle('hidden');
  el.querySelector('.mytasks-toggle').textContent = el.nextElementSibling.classList.contains('hidden') ? '\u25B6' : '\u25BC';
}

// --- Window registrations for event delegation ---
window._expandedStandupPeople = _expandedStandupPeople;
window._standupDoneExpanded = _standupDoneExpanded;
window._expandedClientCards = _expandedClientCards;
window._portfolioSelectedClient = _portfolioSelectedClient;
window._portfolioAttentionExpanded = _portfolioAttentionExpanded;
window._portfolioBottomAttentionExpanded = _portfolioBottomAttentionExpanded;
window.loadDashboardSnapshots = loadDashboardSnapshots;
window.loadPortfolioLeadCount = loadPortfolioLeadCount;
window.selectPortfolioClient = selectPortfolioClient;
window.pfGanttZoom = pfGanttZoom;
window.pfGanttNav = pfGanttNav;
window.pfGanttToday = pfGanttToday;
window.renderDashboard = renderDashboard;
window.renderMyTasksView = renderMyTasksView;
window.statusBadgeHtml = statusBadgeHtml;
window.renderDonutChart = renderDonutChart;
window._actSetMyTasksSort = _actSetMyTasksSort;
window._actSetPortfolioBottomExpanded = _actSetPortfolioBottomExpanded;
window._actToggleMyTasksSection = _actToggleMyTasksSection;
window.standupUpdateTask = standupUpdateTask;
window.standupRefreshMetrics = standupRefreshMetrics;
window.standupSelect = standupSelect;
window.standupDate = standupDate;
window.standupAddAssignee = standupAddAssignee;
window.standupRemoveAssignee = standupRemoveAssignee;

registerView('dashboard', renderDashboard);
registerView('mytasks', renderMyTasksView);
