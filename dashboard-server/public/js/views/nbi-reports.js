// ==================== REPORT VIEW ====================

// ==================== REPORTING VIEW (v1) ====================
// Per-project roadmap view modelled on the "Analytics Project status" PPT
// Glen shared on 2026-05-02. Two levels:
//   1. Roadmap — features of the selected project as left-side rows, timeline
//      across the top, Owner / Status / % columns on the right. Stories show
//      as inner segments within each feature's bar.
//   2. Initiative drawer — click any feature row to open a deep-dive panel
//      with status pills, stories mini-timeline, Goals (success_factor),
//      Dependencies, Risks, Mitigations, Documentation, Key Updates.

let _reportingClient = null;     // selected client name (string)
let _reportingProjectId = null;  // selected project task id
let _reportingDrawerId = null;   // open feature id, or null

function _actSetReportingClient(name) {
  _reportingClient = name || null;
  // Auto-pick first project under this client
  const projects = tasks.filter(t => t.itemType === 'project' && getTaskClient(t) === _reportingClient);
  _reportingProjectId = projects.length ? projects[0].id : null;
  _reportingDrawerId = null;
  renderContent();
}
function _actSetReportingProject(id) { _reportingProjectId = id || null; _reportingDrawerId = null; renderContent(); }
function _actOpenReportingDrawer(id) {
  // Click the same row again to close — same toggle pattern as the Gantt's
  // collapse chevrons. No separate Close button needed.
  _reportingDrawerId = (_reportingDrawerId === id) ? null : id;
  renderContent();
}
function _actCloseReportingDrawer() { _reportingDrawerId = null; renderContent(); }

/** Reporting tab — feature roadmap + per-feature initiative drawer */
function renderReportingView(el) {
  if (tasks.length === 0 && !window._initialLoadComplete) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading report data...</div>';
    return;
  }

  // Scoped (client portal) users are locked to their own client
  const _reportingScoped = !!(_currentUser && _currentUser.clientId);
  const _reportingScopedClientName = _reportingScoped
    ? (Object.values(_apiClientsCache).find(c => c.id === _currentUser.clientId) || {}).name || null
    : null;

  if (_reportingScoped) {
    _reportingClient = _reportingScopedClientName;
  } else if (!_reportingClient) {
    const allClients = [...new Set(tasks.filter(t => t.itemType === 'project' && getTaskClient(t)).map(t => getTaskClient(t)))].sort();
    _reportingClient = allClients.includes('Lighthouse Games') ? 'Lighthouse Games' : (allClients[0] || null);
  }
  if (Object.keys(_milestonesCache).length === 0) {
    loadAllMilestones().then(() => { if (currentView === 'reporting') renderContent(); });
  }
  const projectsForClient = tasks.filter(t => t.itemType === 'project' && getTaskClient(t) === _reportingClient);
  if (!_reportingProjectId || !projectsForClient.find(p => p.id === _reportingProjectId)) {
    _reportingProjectId = projectsForClient.length ? projectsForClient[0].id : null;
  }
  const project = _reportingProjectId ? tasks.find(t => t.id === _reportingProjectId) : null;
  const features = project ? tasks.filter(t => t.parentId === project.id && t.itemType === 'feature') : [];

  const allClientNames = _reportingScoped
    ? (_reportingScopedClientName ? [_reportingScopedClientName] : [])
    : [...new Set(tasks.filter(t => t.itemType === 'project' && getTaskClient(t)).map(t => getTaskClient(t)))].sort();

  let html = '<div class="reporting">';

  // Header bar — client + project pickers
  html += '<div class="reporting__hdr">';
  html += `<div class="reporting__hdr-title">Reporting</div>`;
  html += `<div class="reporting__hdr-pickers">`;
  if (!_reportingScoped) {
    html += `<label class="reporting__lbl">Client</label>`;
    html += `<select class="reporting__select" onchange="_actSetReportingClient(this.value)">`;
    allClientNames.forEach(n => { html += `<option value="${esc(n)}" ${n === _reportingClient ? 'selected' : ''}>${esc(n)}</option>`; });
    html += `</select>`;
  }
  html += `<label class="reporting__lbl">Project</label>`;
  html += `<select class="reporting__select" onchange="_actSetReportingProject(this.value)">`;
  projectsForClient.forEach(p => { html += `<option value="${esc(p.id)}" ${p.id === _reportingProjectId ? 'selected' : ''}>${esc(p.title)}</option>`; });
  if (projectsForClient.length === 0) html += `<option value="">— no projects —</option>`;
  html += `</select>`;
  html += `</div></div>`;

  if (!project || features.length === 0) {
    html += `<div style="padding:60px;text-align:center;color:var(--text-muted);font-size:0.85rem">${project ? 'This project has no features yet.' : 'Pick a client and project above.'}</div>`;
    html += '</div>';
    el.innerHTML = html;
    return;
  }

  // Compute timeline range from all feature + story dates (rolled up).
  const stories = tasks.filter(t => t.itemType === 'story' && features.find(f => f.id === t.parentId));
  const allRange = [...features, ...stories].map(t => ({
    s: ganttRolledStart(t), e: ganttRolledEnd(t)
  })).filter(r => r.s && r.e);
  const now = new Date(); now.setHours(0,0,0,0);
  let gMin = allRange.length ? new Date(Math.min(...allRange.map(r => r.s), now)) : new Date(now);
  let gMax = allRange.length ? new Date(Math.max(...allRange.map(r => r.e), now)) : new Date(now.getFullYear(), now.getMonth() + 3, 1);
  gMin.setDate(1);
  gMax.setMonth(gMax.getMonth() + 1, 1);
  const totalDays = Math.max(1, Math.round((gMax - gMin) / 86400000));
  const nowPct = ((now - gMin) / 86400000 / totalDays * 100).toFixed(2);

  // Month band
  const months = [];
  let md = new Date(gMin);
  while (md < gMax) {
    const mEnd = new Date(md.getFullYear(), md.getMonth() + 1, 1);
    const mDays = Math.round((Math.min(mEnd, gMax) - md) / 86400000);
    months.push({ label: md.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(), days: mDays, year: md.getFullYear(), isNow: md.getMonth() === now.getMonth() && md.getFullYear() === now.getFullYear() });
    md = mEnd;
  }
  // Quarter band derived from months
  const quarters = [];
  months.forEach(m => {
    const q = 'Q' + (Math.floor(((new Date(m.label + ' 1, ' + m.year)).getMonth()) / 3) + 1) + ' ' + m.year;
    if (quarters.length && quarters[quarters.length-1].label === q) quarters[quarters.length-1].days += m.days;
    else quarters.push({ label: q, days: m.days });
  });

  // Helpers
  const featurePct = f => {
    const leaves = []; (function walk(n) { const ch = tasks.filter(t => t.parentId === n.id); if (ch.length === 0) leaves.push(n); else ch.forEach(walk); })(f);
    const active = leaves.filter(l => l.status !== 'Cancelled');
    const total = active.length; if (total === 0) return f.status === 'Done' ? 100 : 0;
    return Math.round(active.filter(l => l.status === 'Done').length / total * 100);
  };
  const featureHealth = f => {
    if (f.healthState === 'Blocked' || f.status === 'Blocked') return 'blocked';
    const e = ganttRolledEnd(f);
    if (e && e < now && f.status !== 'Done') return 'red';
    const days = e ? Math.round((e - now) / 86400000) : null;
    if (f.healthState === 'Red') return 'red';
    if (f.healthState === 'Yellow') return 'amber';
    if (days !== null && days >= 0 && days <= 14) return 'amber';
    return 'green';
  };
  const ownerOf = t => {
    if (t.assignees && t.assignees.length) return t.assignees[0];
    const desc = getDescendants(t.id);
    const counts = {};
    desc.forEach(d => { (d.assignees || []).forEach(a => { counts[a] = (counts[a] || 0) + 1; }); });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : '—';
  };
  const healthFill = h => h === 'red' ? 'var(--danger)' : h === 'amber' ? 'var(--warning)' : h === 'blocked' ? 'var(--text-muted)' : 'var(--success)';
  const healthLabel = h => h === 'red' ? 'AT RISK' : h === 'amber' ? 'AMBER' : h === 'blocked' ? 'BLOCKED' : 'GREEN';

  const isMobile = window.innerWidth <= 768;
  const labelW = isMobile ? 140 : 280, ownerW = isMobile ? 0 : 100, statusW = isMobile ? 70 : 90, pctW = isMobile ? 45 : 60, rightPanelW = labelW + ownerW + statusW + pctW;

  // Roadmap header row
  html += '<div class="reporting__roadmap">';
  html += `<div class="reporting__row reporting__row--hdr">`;
  html += `<div class="reporting__cell" style="width:${labelW}px">FEATURE</div>`;
  if (ownerW > 0) html += `<div class="reporting__cell" style="width:${ownerW}px">OWNER</div>`;
  html += `<div class="reporting__cell" style="width:${statusW}px">STATUS</div>`;
  html += `<div class="reporting__cell" style="width:${pctW}px">% DONE</div>`;
  html += `<div class="reporting__timeline-hdr" style="position:relative">`;
  // Quarter row
  html += `<div style="display:flex;border-bottom:1px solid var(--border-subtle)">`;
  quarters.forEach(q => { const w = (q.days / totalDays * 100).toFixed(2); html += `<div style="width:${w}%;text-align:left;padding-left:4px;font-size:0.75rem;color:var(--text-muted);font-weight:700;letter-spacing:0.06em;padding-top:3px;padding-bottom:3px;border-right:1px solid var(--border-subtle)">${esc(q.label)}</div>`; });
  html += `</div>`;
  // Month row
  html += `<div style="display:flex">`;
  months.forEach(m => { const w = (m.days / totalDays * 100).toFixed(2); html += `<div style="width:${w}%;text-align:left;padding-left:4px;font-size:0.75rem;color:${m.isNow ? 'var(--accent-text)' : 'var(--text-muted)'};font-weight:${m.isNow ? '700' : '500'};padding-top:2px;padding-bottom:2px;border-right:1px solid var(--border-subtle)">${esc(m.label)}</div>`; });
  html += `</div>`;
  html += `<div style="position:absolute;left:${nowPct}%;top:0;bottom:0;border-left:2px dashed var(--danger);pointer-events:none"></div>`;
  html += `<div style="position:absolute;left:calc(${nowPct}% - 18px);top:-2px;font-size:0.75rem;color:var(--danger);font-weight:700;letter-spacing:0.06em">TODAY</div>`;
  // Milestone lines in header
  const clientObj = Object.values(_apiClientsCache || {}).find(c => c.name === _reportingClient);
  const clientMilestones = clientObj ? (_milestonesCache[clientObj.id] || []) : [];
  clientMilestones.forEach(ms => {
    const mDate = safeParseDate(ms.target_date);
    if (mDate && mDate >= gMin && mDate <= gMax) {
      const mPct = ((mDate - gMin) / 86400000 / totalDays * 100).toFixed(2);
      const mCol = mDate < now ? 'var(--danger)' : 'var(--accent)';
      html += `<div style="position:absolute;left:${mPct}%;top:0;bottom:0;border-left:2px solid ${mCol};pointer-events:none;opacity:0.7"></div>`;
      html += `<div style="position:absolute;left:calc(${mPct}% + 4px);bottom:2px;font-size:0.75rem;color:${mCol};font-weight:700;letter-spacing:0.04em;white-space:nowrap">${esc(ms.title)}</div>`;
    }
  });
  html += `</div></div>`;

  // Feature rows
  features.forEach((f, fi) => {
    const fStart = ganttRolledStart(f);
    const fEnd = ganttRolledEnd(f);
    const left = fStart ? ((fStart - gMin) / 86400000 / totalDays * 100).toFixed(2) : '0';
    const width = fStart && fEnd ? Math.max(0.5, (fEnd - fStart) / 86400000 / totalDays * 100).toFixed(2) : '1';
    const pct = featurePct(f);
    const h = featureHealth(f);
    const fill = healthFill(h);
    const fStories = tasks.filter(t => t.parentId === f.id && t.itemType === 'story');
    const zebra = fi % 2 === 1 ? 'background:rgba(255,255,255,0.015);' : '';
    const isOpen = _reportingDrawerId === f.id;

    html += `<div class="reporting__row ${isOpen ? 'reporting__row--open' : ''}" style="${zebra}cursor:pointer" onclick="_actOpenReportingDrawer('${escAttrJs(f.id)}')">`;
    html += `<div class="reporting__cell reporting__cell--title" style="width:${labelW}px"><span class="reporting__type">FT</span> <span title="${esc(f.title)}">${esc(f.title)}</span></div>`;
    if (ownerW > 0) html += `<div class="reporting__cell" style="width:${ownerW}px;color:var(--text-secondary)">${esc(ownerOf(f))}</div>`;
    html += `<div class="reporting__cell" style="width:${statusW}px"><span class="reporting__pill" style="background:${fill};color:#fff">${healthLabel(h)}</span></div>`;
    html += `<div class="reporting__cell" style="width:${pctW}px;font-weight:700;color:${fill}">${pct}%</div>`;
    html += `<div class="reporting__timeline" style="position:relative">`;
    html += `<div style="position:absolute;left:${nowPct}%;top:0;bottom:0;border-left:1px dashed var(--danger);opacity:0.35;pointer-events:none"></div>`;
    clientMilestones.forEach(ms => { const mD = safeParseDate(ms.target_date); if (mD && mD >= gMin && mD <= gMax) { const mP = ((mD - gMin) / 86400000 / totalDays * 100).toFixed(2); html += `<div style="position:absolute;left:${mP}%;top:0;bottom:0;border-left:2px solid ${mD < now ? 'var(--danger)' : 'var(--accent)'};opacity:0.4;pointer-events:none"></div>`; } });
    if (fStart && fEnd) {
      // Stacked status bar: purple=done, green=in progress, grey=not started, red=blocked/overdue
      const allLeavesRaw = []; (function walk(n) { const ch = tasks.filter(t => t.parentId === n.id); if (ch.length === 0) allLeavesRaw.push(n); else ch.forEach(walk); })(f);
      const allLeaves = allLeavesRaw.filter(l => l.status !== 'Cancelled');
      const total = allLeaves.length || 1;
      const donePct = Math.round(allLeaves.filter(l => l.status === 'Done').length / total * 100);
      const blockedPct = Math.round(allLeaves.filter(l => (l.status === 'Blocked' || l.healthState === 'Blocked' || (l.dueDate && l.status !== 'Done' && safeParseDate(l.dueDate) < now))).length / total * 100);
      const inProgressPct = Math.round(allLeaves.filter(l => l.status === 'In progress' && l.healthState !== 'Blocked' && !(l.dueDate && safeParseDate(l.dueDate) < now)).length / total * 100);
      const notStartedPct = Math.max(0, 100 - donePct - blockedPct - inProgressPct);
      html += `<div style="position:absolute;left:${left}%;width:${width}%;top:8px;bottom:8px;border-radius:4px;overflow:hidden;display:flex;border:1px solid var(--border-default)">`;
      if (donePct > 0) html += `<div style="width:${donePct}%;background:var(--purple)" title="Done ${donePct}%"></div>`;
      if (inProgressPct > 0) html += `<div style="width:${inProgressPct}%;background:var(--success)" title="In Progress ${inProgressPct}%"></div>`;
      if (blockedPct > 0) html += `<div style="width:${blockedPct}%;background:var(--danger)" title="Blocked/Overdue ${blockedPct}%"></div>`;
      if (notStartedPct > 0) html += `<div style="width:${notStartedPct}%;background:var(--border-default)" title="Not Started ${notStartedPct}%"></div>`;
      html += `</div>`;
      html += `<div style="position:absolute;left:calc(${left}% + ${width}% + 6px);top:50%;transform:translateY(-50%);font-size:0.75rem;color:${fill};font-weight:700;letter-spacing:0.04em">${pct}%</div>`;
    }
    html += `</div></div>`;

    // Inline drawer (slides under the row)
    if (isOpen) {
      html += renderReportingDrawer(f);
    }
  });
  html += '</div></div>';
  el.innerHTML = html;
}

/** Initiative drawer — opens inline under the clicked feature row */
function renderReportingDrawer(f) {
  const now = new Date(); now.setHours(0,0,0,0);
  const stories = tasks.filter(t => t.parentId === f.id && t.itemType === 'story');
  const fStart = ganttRolledStart(f);
  const fEnd = ganttRolledEnd(f);
  const eta = fEnd ? fEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  let owner = (f.assignees && f.assignees[0]) || '';
  const descAll = getDescendants(f.id);
  if (!owner) {
    const counts = {};
    descAll.forEach(d => { (d.assignees || []).forEach(a => { counts[a] = (counts[a] || 0) + 1; }); });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    owner = top ? top[0] : '—';
  }
  const teamSet = new Set();
  descAll.forEach(d => { (d.assignees || []).forEach(a => teamSet.add(a)); });
  (f.assignees || []).forEach(a => teamSet.add(a));
  teamSet.delete(owner);
  const team = [...teamSet].sort().join('; ');
  const leafFor = id => { const out = []; (function walk(n) { const ch = tasks.filter(t => t.parentId === n.id); if (ch.length === 0) out.push(n); else ch.forEach(walk); })(tasks.find(t => t.id === id) || {id}); return out; };
  const leaves = leafFor(f.id);
  const activeLeaves = leaves.filter(l => l.status !== 'Cancelled');
  const pct = activeLeaves.length ? Math.round(activeLeaves.filter(l => l.status === 'Done').length / activeLeaves.length * 100) : (f.status === 'Done' ? 100 : 0);

  const h = (() => {
    if (f.healthState === 'Blocked' || f.status === 'Blocked') return 'blocked';
    if (fEnd && fEnd < now && f.status !== 'Done') return 'red';
    const days = fEnd ? Math.round((fEnd - now) / 86400000) : null;
    if (f.healthState === 'Red') return 'red';
    if (f.healthState === 'Yellow') return 'amber';
    if (days !== null && days >= 0 && days <= 14) return 'amber';
    return 'green';
  })();
  const fill = h === 'red' ? 'var(--danger)' : h === 'amber' ? 'var(--warning)' : h === 'blocked' ? 'var(--text-muted)' : 'var(--success)';
  const statusLabel = h === 'red' ? 'AT RISK' : h === 'amber' ? 'AMBER' : h === 'blocked' ? 'BLOCKED' : 'GREEN';

  let html = `<div class="reporting__drawer">`;
  // No Close button — clicking the parent row again toggles the drawer
  // shut. Hint shown to the right of the title.
  html += `<div class="reporting__drawer-hdr"><div class="reporting__drawer-title">${esc(f.title)}</div><span style="font-size:0.75rem;color:var(--text-muted);letter-spacing:0.06em">CLICK ROW TO CLOSE</span></div>`;

  // Pills row
  html += `<div class="reporting__pills">`;
  html += `<div class="reporting__pill-block"><div class="reporting__pill-lbl">STATUS</div><div class="reporting__pill" style="background:${fill};color:#fff;display:inline-block">${statusLabel}</div></div>`;
  html += `<div class="reporting__pill-block"><div class="reporting__pill-lbl">% DONE</div><div class="reporting__pill-val" style="color:${fill}">${pct}%</div></div>`;
  html += `<div class="reporting__pill-block"><div class="reporting__pill-lbl">ETA</div><div class="reporting__pill-val">${esc(eta)}</div></div>`;
  html += `<div class="reporting__pill-block"><div class="reporting__pill-lbl">LEAD</div><div class="reporting__pill-val">${esc(owner)}</div></div>`;
  html += `<div class="reporting__pill-block"><div class="reporting__pill-lbl">TEAM</div><div class="reporting__pill-val" style="font-size:0.78rem">${esc(team || '—')}</div></div>`;
  html += `</div>`;

  // Two-column layout: stories mini-timeline left, narrative blocks right
  html += `<div class="reporting__drawer-grid">`;

  // Stories mini-timeline
  html += `<div class="reporting__drawer-card"><div class="reporting__drawer-card-hdr">Stories</div><div class="reporting__drawer-card-body">`;
  if (stories.length === 0) {
    html += `<div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">No stories yet.</div>`;
  } else {
    const sMin = fStart ? new Date(fStart) : now;
    const sMax = fEnd ? new Date(fEnd) : new Date(now.getFullYear(), now.getMonth() + 3, 1);
    const sDays = Math.max(1, Math.round((sMax - sMin) / 86400000));
    // Month headers above story bars
    const dMonths = [];
    const dCur = new Date(sMin.getFullYear(), sMin.getMonth(), 1);
    while (dCur <= sMax) {
      const mS = dCur < sMin ? new Date(sMin) : new Date(dCur);
      const nxt = new Date(dCur.getFullYear(), dCur.getMonth() + 1, 1);
      const mE = nxt > sMax ? new Date(sMax) : new Date(nxt);
      const mD = Math.max(1, Math.round((mE - mS) / 86400000));
      const isNow = now >= mS && now < nxt;
      dMonths.push({ label: dCur.toLocaleDateString('en-GB', { month: 'short' }), days: mD, isNow });
      dCur.setMonth(dCur.getMonth() + 1);
    }
    const dTotalDays = dMonths.reduce((s, m) => s + m.days, 0) || 1;
    html += `<div style="display:grid;grid-template-columns:auto 48px 1fr;gap:4px 10px;align-items:center;font-size:0.75rem">`;
    // Month header row
    html += `<div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;letter-spacing:0.04em">STORY</div><div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;letter-spacing:0.04em;text-align:right">% DONE</div><div style="display:flex;border-bottom:1px solid var(--border-subtle);padding-bottom:4px;margin-bottom:2px">`;
    dMonths.forEach(m => { const w = (m.days / dTotalDays * 100).toFixed(2); html += `<div style="width:${w}%;text-align:left;padding-left:3px;font-size:0.75rem;color:${m.isNow ? 'var(--accent-text)' : 'var(--text-muted)'};font-weight:${m.isNow ? '700' : '500'};border-right:1px solid var(--border-subtle)">${esc(m.label)}</div>`; });
    html += `</div>`;
    stories.forEach(s => {
      const ss = ganttRolledStart(s); const se = ganttRolledEnd(s);
      const sLeaves = leafFor(s.id).filter(l => l.status !== 'Cancelled');
      const sDone = sLeaves.filter(l => l.status === 'Done').length;
      const sBlocked = sLeaves.filter(l => l.status === 'Blocked' || l.healthState === 'Blocked' || (l.dueDate && l.status !== 'Done' && safeParseDate(l.dueDate) < now)).length;
      const sInProg = sLeaves.filter(l => l.status === 'In progress' && l.healthState !== 'Blocked' && !(l.dueDate && safeParseDate(l.dueDate) < now)).length;
      const sTotal = sLeaves.length || 1;
      const sPct = Math.round(sDone / sTotal * 100);
      const sDonePct = Math.round(sDone / sTotal * 100);
      const sInProgPct = Math.round(sInProg / sTotal * 100);
      const sBlockedPct = Math.round(sBlocked / sTotal * 100);
      const sNotStartedPct = Math.max(0, 100 - sDonePct - sInProgPct - sBlockedPct);
      const sH = sBlocked > 0 ? 'red' : sInProg > 0 ? 'green' : sDone === sTotal ? 'done' : 'grey';
      html += `<div style="white-space:nowrap" title="${esc(s.title)}">${esc(s.title)}</div>`;
      html += `<div style="text-align:right;color:var(--purple);font-weight:700;font-size:0.75rem">${sPct}%</div>`;
      html += `<div style="height:14px;border-radius:3px;overflow:hidden;display:flex;border:1px solid var(--border-default)">`;
      if (sDonePct > 0) html += `<div style="width:${sDonePct}%;background:var(--purple)"></div>`;
      if (sInProgPct > 0) html += `<div style="width:${sInProgPct}%;background:var(--success)"></div>`;
      if (sBlockedPct > 0) html += `<div style="width:${sBlockedPct}%;background:var(--danger)"></div>`;
      if (sNotStartedPct > 0) html += `<div style="width:${sNotStartedPct}%;background:var(--border-default)"></div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }
  html += `</div></div>`;

  // Blockers summary — items under this feature that are blocked
  const blockedItems = descAll.filter(t => t.status === 'Blocked');
  if (blockedItems.length > 0) {
    html += `<div class="reporting__drawer-card" style="border:2px solid var(--danger);background:color-mix(in srgb, var(--danger) 6%, transparent)"><div class="reporting__drawer-card-hdr" style="color:var(--danger)">Blockers (${blockedItems.length})</div><div class="reporting__drawer-card-body">`;
    blockedItems.forEach(bt => {
      const bi = bt.blockerInfo || bt.blocker_info;
      const reason = bi ? (bi.blockedOn || '') : '';
      const people = bi ? [...(bi.internal || []), ...(bi.external || [])].join(', ') : '';
      const since = bi && bi.dateBlocked ? new Date(bi.dateBlocked).toLocaleDateString('en-GB', {day:'numeric',month:'short'}) : '';
      html += `<div style="padding:6px 0;border-bottom:1px dashed var(--border-subtle);font-size:0.78rem;cursor:pointer" onclick="event.stopPropagation();openDetailOverlay('${escAttrJs(bt.id)}')">`;
      html += `<div style="font-weight:600;color:var(--text-primary)">${esc(bt.title)}</div>`;
      if (reason) html += `<div style="color:var(--danger);margin-top:2px">${esc(reason)}</div>`;
      if (people) html += `<div style="color:var(--text-muted);font-size:0.75rem;margin-top:1px">By: ${esc(people)}</div>`;
      if (since) html += `<div style="color:var(--text-muted);font-size:0.75rem">Since ${esc(since)}</div>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  }

  // Right column: editable narrative blocks
  html += `<div class="reporting__drawer-side">`;
  const editBlock = (label, field, content) => {
    const text = (content || '').toString().trim();
    return `<div class="reporting__drawer-card"><div class="reporting__drawer-card-hdr">${label}</div><div class="reporting__drawer-card-body"><textarea style="width:100%;min-height:48px;font-size:0.78rem;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:6px 8px;resize:vertical;font-family:var(--font-body)" placeholder="Add ${label.toLowerCase()}..." onchange="updateTask('${escAttrJs(f.id)}','${field}',this.value)" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'" oninput="_liveWrite('${escAttrJs(f.id)}','${field}',this.value);this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(text)}</textarea></div></div>`;
  };
  const linkBlock = (label, field, content) => {
    const text = (content || '').toString().trim();
    return editBlock(label, field, text);
  };
  // Dependencies: resolve UUIDs to task names
  const depIds = Array.isArray(f.dependencies) ? f.dependencies : [];
  const depNames = depIds.map(did => { const dt = tasks.find(t => t.id === did); return dt ? dt.title : did; });
  const depBlock = `<div class="reporting__drawer-card"><div class="reporting__drawer-card-hdr">Dependencies</div><div class="reporting__drawer-card-body" style="font-size:0.78rem;color:var(--text-secondary)">${depNames.length > 0 ? depNames.map(n => `<div style="padding:2px 0">&#8226; ${esc(n)}</div>`).join('') : `<span style="color:var(--text-muted);font-style:italic">None — add via detail overlay</span>`}</div></div>`;

  html += editBlock('Goals', 'successFactor', f.success_factor || f.successFactor);
  html += depBlock;
  html += editBlock('Risks', 'risks', f.risks);
  html += editBlock('Mitigations', 'mitigations', f.mitigations);
  html += linkBlock('Documentation', 'documentationLink', f.documentation_link || f.documentationLink);
  html += `</div>`;

  html += `</div>`;

  // Key Updates: latest 5 events from notes / status
  html += `<div class="reporting__drawer-card"><div class="reporting__drawer-card-hdr">Key Updates</div><div class="reporting__drawer-card-body">`;
  const events = [];
  [f, ...stories, ...leaves].forEach(t => {
    (t.notes || []).forEach(n => events.push({ when: n.time, text: n.text, who: t.title }));
  });
  events.sort((a, b) => (b.when || '').localeCompare(a.when || ''));
  if (events.length === 0) {
    html += `<div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0;font-style:italic">No comments or notes yet on this feature or its children.</div>`;
  } else {
    events.slice(0, 5).forEach(ev => {
      const when = ev.when ? new Date(ev.when).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
      html += `<div style="padding:6px 0;border-bottom:1px dashed var(--border-subtle);font-size:0.78rem"><div style="display:flex;justify-content:space-between;color:var(--text-muted);font-size:0.75rem;letter-spacing:0.04em"><span>${esc(ev.who)}</span><span>${esc(when)}</span></div><div style="color:var(--text-primary);margin-top:2px">${esc(ev.text)}</div></div>`;
    });
  }
  html += `<div style="display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-subtle)"><input id="reportingNote_${f.id}" placeholder="Add a note..." style="flex:1;font-size:0.78rem;padding:4px 8px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-default);border-radius:var(--radius-sm)" onkeydown="if(event.key==='Enter'){event.stopPropagation();_addReportingNote('${escAttrJs(f.id)}')}" onclick="event.stopPropagation()"><button class="btn btn--sm btn--primary" onclick="event.stopPropagation();_addReportingNote('${escAttrJs(f.id)}')" style="font-size:0.75rem">Add</button></div>`;
  html += `</div></div>`;

  html += `<div style="margin-top:12px;text-align:right"><button class="btn btn--sm" onclick="event.stopPropagation();openDetailOverlay('${escAttrJs(f.id)}')" style="font-size:0.75rem">Open in detail view to edit</button></div>`;

  html += `</div>`;
  return html;
}

function _addReportingNote(id) {
  const input = document.getElementById('reportingNote_' + id);
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
  const scopedTasksAll = currentFilter.client ? baseTasks.filter(t => getTaskClient(t) === currentFilter.client) : baseTasks;
  const scopedTasks = scopedTasksAll.filter(t => t.status !== 'Cancelled');
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
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--purple)">${donePct}%</div><div class="kpi-card__label">Complete</div></div>
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--danger)">${atRisk.length}</div><div class="kpi-card__label">At Risk</div></div>
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--text-primary)">${totalHrs.toFixed(1)}</div><div class="kpi-card__label">Hours Spent</div></div>
    <div class="kpi-card"><div class="kpi-card__value" style="color:var(--text-muted)">${totalEst.toFixed(1)}</div><div class="kpi-card__label">Hours Est.</div></div>
  </div></div>`;

  // ===== CLIENT SUMMARY CARDS — projects grouped by client with progress bars =====
  const projectRows = roots.map(r => {
    const kids = getDescendants(r.id);
    const all = [r, ...kids].filter(t => t.status !== 'Cancelled');
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
    if (overallDonePct > 0) html += `<div class="client-summary-card__seg" style="width:${overallDonePct}%;background:var(--purple)"></div>`;
    if (overallActivePct > 0) html += `<div class="client-summary-card__seg" style="width:${overallActivePct}%;background:var(--success)"></div>`;
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
      html += `<div><h2 style="color:var(--danger);margin-bottom:8px">&#128721; Blocked (${dashBlocked.length})</h2>`;
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
  html += `<th style="cursor:pointer;white-space:nowrap" data-stop><select onchange="_rptProjectFilterClient=this.value||null;renderContent()" style="background:transparent;border:none;color:var(--text-primary);font-size:0.75rem;font-weight:600;cursor:pointer;padding:0"><option value="">Client</option>${rptClients.map(c => `<option value="${esc(c)}" ${_rptProjectFilterClient===c?'selected':''}>${esc(c)}</option>`).join('')}</select></th>`;
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
    html += `<td>${clientBadgeHtml(r.client)} <span style="font-size:0.75rem">${esc(r.client)}</span></td>`;
    html += `<td style="text-align:right">${r.tasks}</td>`;
    html += `<td style="text-align:right;color:var(--purple)">${r.done}</td>`;
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
    if (aDone > 0) html += `<div class="rw-seg" style="flex:${aDone};background:var(--purple)" title="Done: ${aDone}"></div>`;
    if (aIp > 0) html += `<div class="rw-seg" style="flex:${aIp};background:var(--success)" title="In Progress: ${aIp}"></div>`;
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
    const all = [r, ...kids].filter(t => t.status !== 'Cancelled');
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
      <td><strong>${esc(r.title)}</strong></td><td>${esc(r.client)}</td><td>${r.tasks}</td><td style="color:var(--purple)">${r.done}</td><td style="color:var(--success)">${r.active}</td><td style="color:${r.blocked>0?'var(--danger)':'inherit'}">${r.blocked}</td>
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

