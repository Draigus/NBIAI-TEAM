// ==================== LEADS CRM ====================

let _leadsConfig = null;    // { stages, resourceTypes, fieldOptions }
let _leadsData = null;      // { leads, total }
let _leadsFilter = { sector: null, stage_id: null, client_id: null, owner: null, priority: null, search: '', sort: 'stage' };
let _leadsSubView = localStorage.getItem('nbi_leads_subview') || 'kanban';
let _leadsDetailId = null;
let _leadsDragId = null;
const _expandedClientIds = new Set();

/** Fetch lead pipeline configuration (stages, resource types, field options) from
 *  the API. Dedupes parallel calls (in-flight Promise cache) and retries once on
 *  transient null/failure — fixes the "Leads page only works on reload" bug
 *  (601e39d8) where the first call sometimes lost its race with auth bootstrap. */
let _leadsConfigInFlight = null;
async function loadLeadsConfig() {
  if (_leadsConfig) return _leadsConfig;
  if (isClientUser()) { _leadsConfig = { stages: [], resourceTypes: [], fieldOptions: {} }; return _leadsConfig; }
  if (_leadsConfigInFlight) return _leadsConfigInFlight;
  _leadsConfigInFlight = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await apiCall('/api/leads/config');
        if (data) { _leadsConfig = data; return _leadsConfig; }
      } catch(e) { if (window._nbiDebug) console.error('Failed to load leads config:', e); }
      if (attempt === 0) await new Promise(r => setTimeout(r, 250));
    }
    if (!_leadsConfig) _leadsConfig = { stages: [], resourceTypes: [], fieldOptions: {} };
    return _leadsConfig;
  })();
  try { return await _leadsConfigInFlight; }
  finally { _leadsConfigInFlight = null; }
}

/** Fetch leads from the API with current filter/sort parameters. Same retry +
 *  dedupe as loadLeadsConfig. */
let _leadsDataInFlight = null;
async function loadLeads() {
  const params = new URLSearchParams();
  if (_leadsFilter.sector) params.set('sector', _leadsFilter.sector);
  if (_leadsFilter.stage_id) params.set('stage_id', _leadsFilter.stage_id);
  if (_leadsFilter.client_id) params.set('client_id', _leadsFilter.client_id);
  if (_leadsFilter.owner) params.set('owner', _leadsFilter.owner);
  if (_leadsFilter.priority) params.set('priority', _leadsFilter.priority);
  if (_leadsFilter.search) params.set('search', _leadsFilter.search);
  params.set('limit', '500');
  const url = '/api/leads?' + params.toString();
  if (_leadsDataInFlight) return _leadsDataInFlight;
  _leadsDataInFlight = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await apiCall(url);
        if (data) { _leadsData = data; return; }
      } catch(e) { if (window._nbiDebug) console.error('Failed to load leads:', e); }
      if (attempt === 0) await new Promise(r => setTimeout(r, 250));
    }
    if (!_leadsData) _leadsData = { leads: [], total: 0 };
  })();
  try { await _leadsDataInFlight; }
  finally { _leadsDataInFlight = null; }
}

/** Format ROM (Rough Order of Magnitude) value for a lead — handles min/max ranges, text overrides, and NaN */
function formatROM(lead) {
  const sym = lead.currency === 'USD' ? '$' : lead.currency === 'EUR' ? '\u20AC' : '\u00A3';
  if (lead.rom_text) return lead.rom_text;
  const min = parseFloat(lead.rom_min);
  const max = parseFloat(lead.rom_max);
  if (!isNaN(min) && !isNaN(max) && min !== max) {
    return `${sym}${fmtMoney(min)} - ${sym}${fmtMoney(max)}`;
  }
  if (!isNaN(max)) return `${sym}${fmtMoney(max)}`;
  if (!isNaN(min)) return `${sym}${fmtMoney(min)}`;
  return '-';
}

/** Format a number as a compact money string: 1500000 → '1.5M', 25000 → '25k' */
/** Format a number as a compact money string: 1500000 -> '1.5M', 25000 -> '25k' */
function fmtMoney(v) {
  const n = parseFloat(v);
  if (isNaN(n) || v == null) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 0) + 'k';
  return n.toFixed(0);
}

/** Return the currency symbol for a given currency code */
function currencySym(c) { return c === 'USD' ? '$' : c === 'EUR' ? '\u20AC' : '\u00A3'; }

// Sanitise colour values to prevent XSS (only allow valid hex colours)
/** Sanitise a hex colour value — rejects anything that isn't a valid hex code (XSS prevention for style attributes) */
function safeColour(c) { return /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#666666'; }

/** Render the leads CRM view: header, filters, sub-views (kanban/table/cards/pipeline/by-client/clients) */
async function renderLeadsView(el) {
  // Load config + data on first render. Skeleton while in-flight; if either
  // returns null (transient race during auth bootstrap), show a Retry button
  // instead of a dead-end error message.
  if (!_leadsConfig || !_leadsData) {
    el.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-card"></div>' +
      Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading leads</span></div>';
    await Promise.all([loadLeadsConfig(), loadLeads()]);
  }
  if (!_leadsConfig || !_leadsData) {
    el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-secondary)">
      <div style="margin-bottom:12px">Could not load the leads pipeline. The server might be starting or your session may have just refreshed.</div>
      <button class="btn btn--primary" onclick="_leadsConfig=null;_leadsData=null;renderLeadsView(this.closest('div').parentElement);">Retry</button>
    </div>`;
    return;
  }

  const config = _leadsConfig;
  const leads = _leadsData.leads || [];
  const sectors = (config.fieldOptions.client_sector || []).map(o => o.value);
  // Guard: sector filter was causing confusion with the practice filter
  // (Glen 2026-04-16) — if no sector values are defined, the sector tabs
  // are suppressed entirely so the only scoping control is the sidebar
  // practice chip. When Glen re-populates sectors with real industry
  // categories via the Config tab, the tabs come back automatically.
  if (sectors.length > 0 && _leadsFilter.sector && !sectors.includes(_leadsFilter.sector)) {
    _leadsFilter.sector = null;
  }

  let html = '';

  // Header row — New Lead button + sector tabs when sectors exist
  html += `<div class="leads-tabs">`;
  if (sectors.length > 0) {
    html += `<button class="leads-tab ${!_leadsFilter.sector ? 'active' : ''}" data-action="_actClearLeadsSector">All Sectors</button>`;
    sectors.forEach(s => {
      html += `<button class="leads-tab ${_leadsFilter.sector===s ? 'active' : ''}" data-action="_actSetLeadsSector" data-arg0="${esc(s)}">${esc(s)}</button>`;
    });
  }
  html += `<div style="flex:1"></div>`;
  html += `<button class="btn btn--primary btn--sm" data-action="openNewLeadModal" style="margin-right:8px">+ New Lead</button>`;
  html += `</div>`;

  // Filter bar
  html += `<div class="leads-filter-bar">`;
  html += `<input type="text" class="leads-search" placeholder="Search leads..." value="${esc(_leadsFilter.search)}" oninput="_leadsFilter.search=this.value;_debouncedLeadsSearch()">`;

  // Stage filter
  html += `<select class="leads-select" onchange="_leadsFilter.stage_id=this.value||null;refreshLeads()"><option value="">All Stages</option>`;
  config.stages.forEach(s => {
    html += `<option value="${s.id}" ${_leadsFilter.stage_id===s.id?'selected':''}>${esc(s.name)}</option>`;
  });
  html += `</select>`;

  // Owner filter
  html += `<select class="leads-select" onchange="_leadsFilter.owner=this.value||null;refreshLeads()"><option value="">All Owners</option>`;
  (config.fieldOptions.deal_owner || []).forEach(o => {
    html += `<option value="${esc(o.value)}" ${_leadsFilter.owner===o.value?'selected':''}>${esc(o.value)}</option>`;
  });
  html += `</select>`;

  // Priority filter
  html += `<select class="leads-select" onchange="_leadsFilter.priority=this.value||null;refreshLeads()"><option value="">All Priorities</option>`;
  [1,2,3,4,5].forEach(p => {
    html += `<option value="${p}" ${_leadsFilter.priority==p?'selected':''}>${p}</option>`;
  });
  html += `</select>`;

  // Sub-view toggles
  html += `<div class="leads-view-toggles">`;
  const subviews = [{id:'kanban',label:'Kanban'},{id:'table',label:'Table'},{id:'pipeline',label:'Pipeline'},{id:'clients',label:'By Client'},{id:'manage',label:'Manage Clients'}];
  subviews.forEach(sv => {
    html += `<button class="leads-view-btn ${_leadsSubView===sv.id?'active':''}" data-action="switchLeadsView" data-arg0="${sv.id}">${sv.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // Content area
  html += `<div id="leadsContent" class="leads-content"></div>`;

  // Detail panel overlay
  html += `<div id="leadDetailOverlay" class="lead-detail-overlay" data-action="_actCloseLeadDetailIfSelf" data-pass-event data-pass-el></div>`;
  html += `<div id="leadDetailPanel" class="lead-detail-panel"></div>`;

  el.innerHTML = html;
  renderLeadsContent();
}

/** Switch between leads sub-views (kanban/table/cards/pipeline/byClient/clients) */
function switchLeadsView(viewId) {
  _leadsSubView = viewId;
  localStorage.setItem('nbi_leads_subview', viewId);
  document.querySelectorAll('.leads-view-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.leads-view-btn[onclick*="${viewId}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  renderLeadsContent();
}

/** Reload leads data from the API and re-render the content area */
async function refreshLeads() {
  await loadLeads();
  renderLeadsContent();
}

/** Route to the correct leads sub-view renderer based on _leadsSubView.
 *  Honours the global practice filter (currentFilter.practice) so flipping
 *  Practices in the sidebar narrows the kanban/table/pipeline/clients
 *  views without a server round-trip. */
function renderLeadsContent() {
  const el = document.getElementById('leadsContent');
  if (!el) return;
  let leads = (_leadsData && _leadsData.leads) || [];
  if (currentFilter.practice) {
    leads = leads.filter(l => l.practice_area === currentFilter.practice);
  }

  if (_leadsSubView === 'kanban') renderLeadsKanban(el, leads);
  else if (_leadsSubView === 'table') renderLeadsTable(el, leads);
  else if (_leadsSubView === 'pipeline') renderLeadsPipeline(el, leads);
  else if (_leadsSubView === 'clients') renderLeadsByClient(el, leads);
  else if (_leadsSubView === 'manage') renderManageClients(el);
}

// ---- KANBAN VIEW ----
/** Render leads as a Kanban board grouped by pipeline stage with drag-and-drop */
function renderLeadsKanban(el, leads) {
  const stages = _leadsConfig.stages;
  const isMobile = window.innerWidth <= 900;
  let html = '<div class="leads-kanban">';
  if (isMobile) html += '<div class="leads-kanban__track" id="kanbanTrack">';
  stages.forEach(stage => {
    const stageLeads = leads.filter(l => l.stage_id === stage.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const totalRom = stageLeads.reduce((sum, l) => sum + (parseFloat(l.rom_max) || parseFloat(l.rom_min) || 0), 0);

    html += `<div class="leads-kanban__lane" data-stage-id="${stage.id}"
      ${isMobile?'':'ondragover="onLeadLaneDragOver(event)" ondragleave="onLeadLaneDragLeave(event)" ondrop="onLeadDrop(event,\''+stage.id+'\')"'}>`;
    html += `<div class="leads-kanban__header" style="border-top:3px solid ${safeColour(stage.colour)}">
      <span class="leads-kanban__title">${esc(stage.name)}</span>
      <span class="leads-kanban__count">${stageLeads.length}</span>
      ${totalRom > 0 ? `<span class="leads-kanban__rom">${fmtMoney(totalRom)}</span>` : ''}
    </div>`;
    html += `<div class="leads-kanban__body">`;
    stageLeads.forEach((lead, idx) => {
      const isOverdue = lead.next_followup_date && new Date(lead.next_followup_date) < new Date(new Date().toDateString());
      const isDueToday = lead.next_followup_date && lead.next_followup_date === new Date().toISOString().slice(0,10);
      const isLeadComplete = !!lead.completed_at;
      html += `<div class="leads-kanban__card ${isLeadComplete ? 'lead-card--complete' : ''}" ${isMobile||isLeadComplete?'':'draggable="true"'} data-lead-id="${lead.id}" data-lead-idx="${idx}"
        ${isLeadComplete?'':"ondragstart=\"_leadsDragId='"+lead.id+"';_leadsDragStage='"+stage.id+"';this.classList.add('dragging')\""}
        ondragend="this.classList.remove('dragging')"
        data-action="openLeadDetail" data-arg0="${lead.id}">`;
      if (lead.client_name) html += `<div class="leads-card__client">${esc(lead.client_name)}</div>`;
      html += `<div class="leads-card__title">${esc(lead.title)}</div>`;
      if (lead.sow_title) html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">${esc(lead.sow_title)}</div>`;
      html += `<div class="leads-card__meta">`;
      if (lead.priority) html += `<span class="leads-card__prio leads-card__prio--${lead.priority}">P${lead.priority}</span>`;
      html += `<span class="leads-card__rom">${formatROM(lead)}</span>`;
      if (lead.win_probability != null) html += `<span class="leads-card__prob">${lead.win_probability}%</span>`;
      html += `</div>`;
      if (lead.primary_contact_name) {
        html += `<div class="leads-card__contact">`;
        html += `<span>${esc(lead.primary_contact_name)}</span>`;
        if (lead.primary_contact_email) html += `<span style="font-size:0.75rem;color:var(--text-muted)">${esc(lead.primary_contact_email)}</span>`;
        if (lead.primary_contact_phone) html += `<span style="font-size:0.75rem;color:var(--text-muted)">${esc(lead.primary_contact_phone)}</span>`;
        html += `</div>`;
      }
      html += `<div class="leads-card__footer">`;
      if (lead.deal_owner) html += `<span class="leads-card__owner">${esc(lead.deal_owner)}</span>`;
      if (lead.next_followup_date) {
        const cls = isOverdue ? 'overdue' : isDueToday ? 'today' : '';
        html += `<span class="leads-card__followup ${cls}">${lead.next_followup_date.slice(5)}</span>`;
      }
      html += `</div>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  });
  if (isMobile) html += '</div>'; // close track
  html += '</div>'; // close kanban
  el.innerHTML = html;
  if (isMobile) initLaneCounter(isMobile ? '#kanbanTrack' : null);
}

let _leadsDragStage = null; // Source stage of dragged lead

/** Drag over handler for kanban lanes — shows drop indicator between cards */
function onLeadLaneDragOver(event) {
  event.preventDefault();
  const lane = event.currentTarget;
  lane.classList.add('drag-over');
  // Find nearest card to insert before
  const body = lane.querySelector('.leads-kanban__body');
  if (!body) return;
  const cards = [...body.querySelectorAll('.leads-kanban__card:not(.dragging)')];
  const dropIndicators = body.querySelectorAll('.leads-drop-indicator');
  dropIndicators.forEach(d => d.remove());
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = event.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const indicator = document.createElement('div');
  indicator.className = 'leads-drop-indicator';
  if (afterCard) body.insertBefore(indicator, afterCard);
  else body.appendChild(indicator);
}

/** Clean up drag-over styling */
function onLeadLaneDragLeave(event) {
  const lane = event.currentTarget;
  if (!lane.contains(event.relatedTarget)) {
    lane.classList.remove('drag-over');
    lane.querySelectorAll('.leads-drop-indicator').forEach(d => d.remove());
  }
}

/** Handle dropping a lead — cross-lane changes stage, within-lane reorders priority */
async function onLeadDrop(event, stageId) {
  event.preventDefault();
  const lane = event.currentTarget;
  lane.classList.remove('drag-over');
  lane.querySelectorAll('.leads-drop-indicator').forEach(d => d.remove());
  if (!_leadsDragId) return;

  // Find drop position among cards in target lane
  const body = lane.querySelector('.leads-kanban__body');
  const cards = body ? [...body.querySelectorAll('.leads-kanban__card:not(.dragging)')] : [];
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = event.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;

  // Drop index is the new position in the target stage.
  // Priority (P1-P5) is the client need indicator and is unchanged by drag (decision D79).
  const laneLeadIds = cards.map(c => c.dataset.leadId);
  const dropIdx = afterCard ? laneLeadIds.indexOf(afterCard.dataset.leadId) : laneLeadIds.length;

  const patch = { position: dropIdx };
  if (stageId !== _leadsDragStage) patch.stage_id = stageId;

  const resp = await authFetch(`/api/leads/${_leadsDragId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  if (resp.ok) {
    _leadsDragId = null;
    _leadsDragStage = null;
    await refreshLeads();
    if (_leadsDetailId) openLeadDetail(_leadsDetailId);
  }
}

// ---- TABLE VIEW ----
/** Render leads as a sortable data table with clickable rows */
function renderLeadsTable(el, leads) {
  // On narrow screens, render card list instead of table
  if (window.innerWidth < 768) { renderLeadsCardList(el, leads); return; }
  const sortedLeads = sortLeadsForTable(leads);
  let html = '<div class="leads-table-wrap"><table class="leads-table"><thead><tr>';
  const cols = [
    { key: 'priority', label: 'Prio', w: '4%' },
    { key: 'client_name', label: 'Client', w: '12%' },
    { key: 'title', label: 'Title', w: '13%' },
    { key: 'work_type', label: 'Work Type', w: '9%' },
    { key: 'stage_name', label: 'Stage', w: '8%' },
    { key: 'rom', label: 'ROM', w: '8%' },
    { key: 'win_probability', label: 'Win %', w: '5%' },
    { key: 'weighted_value', label: 'Weighted', w: '8%' },
    { key: 'deal_owner', label: 'Owner', w: '6%' },
    { key: 'next_followup_date', label: 'Follow-up', w: '8%' },
    { key: 'location', label: 'Location', w: '8%' },
    { key: 'notes', label: 'Notes', w: '11%' },
  ];
  cols.forEach(c => {
    const isSorted = _leadsFilter.sort === c.key;
    html += `<th style="width:${c.w}" data-action="toggleLeadSort" data-arg0="${c.key}" class="sortable ${isSorted?'sorted':''}">${c.label}</th>`;
  });
  html += '</tr></thead><tbody>';

  sortedLeads.forEach(lead => {
    const isOverdue = lead.next_followup_date && new Date(lead.next_followup_date) < new Date(new Date().toDateString());
    const isComplete = !!lead.completed_at;
    html += `<tr data-action="openLeadDetail" data-arg0="${lead.id}" class="leads-table__row${isComplete ? ' leads-table__row--complete' : ''}">`;
    html += `<td>${lead.priority ? `<span class="leads-card__prio leads-card__prio--${lead.priority}">P${lead.priority}</span>` : ''}</td>`;
    html += `<td>${lead.client_name ? esc(lead.client_name) : '<span style="color:var(--text-muted);font-style:italic">(no client)</span>'}</td>`;
    html += `<td><strong>${isComplete ? '\u2713 ' : ''}${esc(lead.title)}</strong></td>`;
    html += `<td>${lead.work_type ? esc(lead.work_type) : ''}</td>`;
    html += `<td><span class="leads-stage-badge" style="background:${safeColour(lead.stage_colour)}20;color:${safeColour(lead.stage_colour)};border:1px solid ${safeColour(lead.stage_colour)}40">${esc(lead.stage_name)}</span></td>`;
    html += `<td>${formatROM(lead)}</td>`;
    html += `<td>${lead.win_probability != null ? lead.win_probability + '%' : ''}</td>`;
    html += `<td>${lead.weighted_value && !isNaN(parseFloat(lead.weighted_value)) ? currencySym(lead.currency) + fmtMoney(lead.weighted_value) : '-'}</td>`;
    html += `<td>${lead.deal_owner ? esc(lead.deal_owner) : ''}</td>`;
    html += `<td class="${isOverdue ? 'text-danger' : ''}">${lead.next_followup_date || ''}</td>`;
    html += `<td>${lead.location ? esc(lead.location) : ''}</td>`;
    html += `<td class="leads-table__notes">${lead.notes ? esc(lead.notes).substring(0, 60) + (lead.notes.length > 60 ? '...' : '') : ''}</td>`;
    html += `</tr>`;
  });

  html += '</tbody></table></div>';
  el.innerHTML = html;
}

/** Render leads as a card grid layout */
function renderLeadsCardList(el, leads) {
  // Group leads by stage and render as swipeable lanes (like kanban but simpler cards)
  const stages = _leadsConfig ? _leadsConfig.stages : [];
  if (stages.length === 0) { el.innerHTML = '<div style="padding:20px;color:var(--text-muted)">No stages configured.</div>'; return; }

  let html = '<div class="leads-kanban"><div class="leads-kanban__track" id="tableTrack">';
  stages.forEach(stage => {
    const stageLeads = leads.filter(l => l.stage_id === stage.id);
    html += `<div class="leads-kanban__lane">`;
    html += `<div class="leads-kanban__header" style="border-top:3px solid ${safeColour(stage.colour)}">
      <span class="leads-kanban__title">${esc(stage.name)}</span>
      <span class="leads-kanban__count">${stageLeads.length}</span>
    </div>`;
    html += `<div class="leads-kanban__body">`;
    if (stageLeads.length === 0) {
      html += '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.8rem">No leads</div>';
    }
    stageLeads.forEach(lead => {
      const isOverdue = lead.next_followup_date && new Date(lead.next_followup_date) < new Date(new Date().toDateString());
      const isComplete = !!lead.completed_at;
      html += `<div class="leads-card-list__item${isComplete ? ' lead-card--complete' : ''}" data-action="openLeadDetail" data-arg0="${lead.id}">`;
      html += `<div class="leads-card-list__top">`;
      if (lead.priority) html += `<span class="leads-card__prio leads-card__prio--${lead.priority}">P${lead.priority}</span>`;
      if (isComplete) html += `<span style="color:var(--success);font-weight:700;font-size:0.78rem">\u2713 Won</span>`;
      html += `</div>`;
      html += `<div class="leads-card-list__title">${esc(lead.title)}</div>`;
      if (lead.client_name) html += `<div class="leads-card-list__client">${esc(lead.client_name)}</div>`;
      html += `<div class="leads-card-list__meta">`;
      const rom = formatROM(lead);
      if (rom !== '-') html += `<span class="leads-card-list__rom">${rom}</span>`;
      if (lead.win_probability != null) html += `<span class="leads-card-list__prob">${lead.win_probability}%</span>`;
      if (lead.deal_owner) html += `<span class="leads-card-list__owner">${esc(lead.deal_owner)}</span>`;
      html += `</div>`;
      if (lead.next_followup_date) {
        const d = new Date(lead.next_followup_date + 'T00:00:00');
        html += `<div class="leads-card-list__followup ${isOverdue ? 'overdue' : ''}">${d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>`;
      }
      html += `</div>`;
    });
    html += `</div></div>`;
  });
  html += '</div></div>'; // close track + kanban
  el.innerHTML = html;
  initLaneCounter('#tableTrack');
}

/** Initialise Kanban lane counters with scroll-based visibility tracking */
function initLaneCounter(trackSel) {
  const track = document.querySelector(trackSel);
  if (!track) return;
  const lanes = track.querySelectorAll('.leads-kanban__lane');
  const total = lanes.length;
  if (total === 0) return;
  // Add counter element after the kanban container
  const counterEl = document.createElement('div');
  counterEl.className = 'leads-swipe-counter';
  track.parentElement.after(counterEl);

  /** Update the lane counter display based on current scroll position */
  function update() {
    const idx = Math.round(track.scrollLeft / track.offsetWidth);
    const current = Math.max(0, Math.min(idx, total - 1));
    const name = lanes[current]?.querySelector('.leads-kanban__title')?.textContent || (current + 1);
    counterEl.textContent = `\u25C0 ${name} (${current + 1}/${total}) \u25B6`;
  }
  update();
  track.addEventListener('scroll', update, { passive: true });
}

/** Sort the leads array according to the current _leadsFilter.sort setting */
function sortLeadsForTable(leads) {
  const s = _leadsFilter.sort;
  const arr = [...leads];
  if (s === 'priority') arr.sort((a,b) => (a.priority||99) - (b.priority||99));
  else if (s === 'rom') arr.sort((a,b) => (parseFloat(b.rom_max)||0) - (parseFloat(a.rom_max)||0));
  else if (s === 'weighted_value') arr.sort((a,b) => (parseFloat(b.weighted_value)||0) - (parseFloat(a.weighted_value)||0));
  else if (s === 'next_followup_date') arr.sort((a,b) => (a.next_followup_date||'9999').localeCompare(b.next_followup_date||'9999'));
  else if (s === 'client_name') arr.sort((a,b) => (a.client_name||'').localeCompare(b.client_name||''));
  else if (s === 'title') arr.sort((a,b) => (a.title||'').localeCompare(b.title||''));
  // default: by stage sort order then priority
  else arr.sort((a,b) => (a.stage_sort_order||0) - (b.stage_sort_order||0) || (a.priority||99) - (b.priority||99));
  return arr;
}

/** Toggle sort direction for a leads table column (asc/desc cycle) */
function toggleLeadSort(key) {
  _leadsFilter.sort = (_leadsFilter.sort === key) ? 'stage' : key;
  renderLeadsContent();
}

// ---- PIPELINE SUMMARY VIEW ----
/** Render a visual pipeline funnel with revenue metrics per stage */
async function renderLeadsPipeline(el, leads) {
  let html = '<div class="leads-pipeline">';

  // Fetch summary
  const params = _leadsFilter.sector ? `?sector=${encodeURIComponent(_leadsFilter.sector)}` : '';
  let summary = null;
  try {
    summary = await apiCall('/api/leads/pipeline/summary' + params);
  } catch(e) {}

  if (!summary) { el.innerHTML = '<p>Failed to load pipeline summary</p>'; return; }

  // Key metrics
  const activeLeads = leads.filter(l => !l.is_closed);
  const totalRom = activeLeads.reduce((s, l) => s + (parseFloat(l.rom_max) || parseFloat(l.rom_min) || 0), 0);
  const totalWeighted = activeLeads.reduce((s, l) => s + (parseFloat(l.weighted_value) || 0), 0);
  const wonLeads = leads.filter(l => l.is_won);
  const wonValue = wonLeads.reduce((s, l) => s + (parseFloat(l.rom_max) || parseFloat(l.rom_min) || 0), 0);

  // Pipeline metrics — lead with won value (contracted revenue), then pipeline
  const avgWonDeal = wonLeads.length > 0 ? wonValue / wonLeads.length : 0;
  html += `<div class="leads-pipeline__metrics">`;
  html += `<div class="kpi-card"><div class="kpi-card__value">${fmtMoney(wonValue)}</div><div class="kpi-card__label">Won (${wonLeads.length} deal${wonLeads.length !== 1 ? 's' : ''})</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value">${wonLeads.length > 0 ? fmtMoney(avgWonDeal) : '-'}</div><div class="kpi-card__label">Avg Won Deal</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value">${fmtMoney(totalRom)}</div><div class="kpi-card__label">Pipeline (${activeLeads.length} active)</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value">${fmtMoney(totalWeighted)}</div><div class="kpi-card__label">Weighted Pipeline</div></div>`;
  html += `</div>`;

  // Funnel
  html += `<div class="leads-pipeline__funnel">`;
  const maxCount = Math.max(..._leadsConfig.stages.map(s => leads.filter(l => l.stage_id === s.id).length), 1);
  _leadsConfig.stages.forEach(stage => {
    const stageLeads = leads.filter(l => l.stage_id === stage.id);
    const stageRom = stageLeads.reduce((s, l) => s + (parseFloat(l.rom_max) || parseFloat(l.rom_min) || 0), 0);
    const stageWeighted = stageLeads.reduce((s, l) => s + (parseFloat(l.weighted_value) || 0), 0);
    const pct = maxCount > 0 ? (stageLeads.length / maxCount * 100) : 0;

    html += `<div class="leads-funnel__row">
      <div class="leads-funnel__label">${esc(stage.name)}</div>
      <div class="leads-funnel__bar-wrap">
        <div class="leads-funnel__bar" style="width:${Math.max(pct, 2)}%;background:${safeColour(stage.colour)}"></div>
      </div>
      <div class="leads-funnel__stats">
        <span class="leads-funnel__count">${stageLeads.length}</span>
        <span class="leads-funnel__value">${stageRom > 0 ? fmtMoney(stageRom) : '-'}</span>
        <span class="leads-funnel__weighted">${stageWeighted > 0 ? fmtMoney(stageWeighted) + ' wtd' : ''}</span>
      </div>
    </div>`;
  });
  html += `</div>`;

  // Forecast
  let forecast = null;
  try {
    forecast = await apiCall('/api/leads/pipeline/forecast');
  } catch(e) {}

  if (forecast && forecast.length > 0) {
    html += `<h3 style="margin-top:24px">Forecast by Expected Close Month</h3>`;
    html += `<div class="leads-forecast">`;
    forecast.forEach(f => {
      html += `<div class="leads-forecast__row">
        <span class="leads-forecast__month">${f.month}</span>
        <span class="leads-forecast__count">${f.deal_count} deals</span>
        <span class="leads-forecast__value">${currencySym(f.currency)}${fmtMoney(f.total_rom)}</span>
        <span class="leads-forecast__weighted">${currencySym(f.currency)}${fmtMoney(f.total_weighted)} weighted</span>
      </div>`;
    });
    html += `</div>`;
  }

  html += '</div>';
  el.innerHTML = html;
}

// ---- BY CLIENT VIEW ----
/** Render leads grouped by client company with aggregate metrics */
function renderLeadsByClient(el, leads) {
  // Group by client
  const groups = {};
  leads.forEach(l => {
    const key = l.client_name || 'No Client';
    if (!groups[key]) groups[key] = { leads: [], sector: l.client_sector, clientId: l.client_id };
    groups[key].leads.push(l);
  });

  const sortedClients = Object.keys(groups).sort(clientSortOrder);
  let html = '<div class="leads-by-client">';

  sortedClients.forEach(clientName => {
    const g = groups[clientName];
    const totalRom = g.leads.reduce((s, l) => s + (parseFloat(l.rom_max) || parseFloat(l.rom_min) || 0), 0);
    const activeCount = g.leads.filter(l => !l.is_closed).length;

    html += `<div class="leads-client-group">`;
    html += `<div class="leads-client-group__header" data-action="_actToggleCollapsed" data-pass-el>
      <span class="leads-client-group__name">${esc(clientName)}</span>
      ${g.sector ? `<span class="leads-client-group__sector">${esc(g.sector)}</span>` : ''}
      <span class="leads-client-group__stats">${activeCount} active | ${fmtMoney(totalRom)} ROM</span>
      <span class="leads-client-group__arrow">\u25BC</span>
    </div>`;
    html += `<div class="leads-client-group__body">`;
    g.leads.forEach(lead => {
      html += `<div class="leads-client-group__lead" data-action="openLeadDetail" data-arg0="${lead.id}">
        <span class="leads-stage-badge" style="background:${safeColour(lead.stage_colour)}20;color:${safeColour(lead.stage_colour)};border:1px solid ${safeColour(lead.stage_colour)}40">${esc(lead.stage_name)}</span>
        <span class="leads-client-group__title">${esc(lead.title)}</span>
        ${lead.priority ? `<span class="leads-card__prio leads-card__prio--${lead.priority}">P${lead.priority}</span>` : ''}
        <span style="margin-left:auto;color:var(--text-secondary)">${formatROM(lead)}</span>
        ${lead.deal_owner ? `<span style="color:var(--text-muted)">${esc(lead.deal_owner)}</span>` : ''}
      </div>`;
    });
    html += `</div></div>`;
  });

  if (sortedClients.length === 0) {
    html += '<div style="padding:40px;text-align:center;color:var(--text-muted)">No leads yet. Click "+ New Lead" to add one.</div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

// ---- MANAGE CLIENTS VIEW ----
/** Render the client management view with expandable rows for contacts */
async function renderManageClients(el) {
  // Skeleton placeholder while the clients fetch is in flight (O4)
  el.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-card"></div>' +
    Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') +
    '<span class="visually-hidden">Loading clients</span></div>';

  let clients = [];
  try {
    const data = await apiCall('/api/clients');
    if (data) {
      data.forEach(c => { _apiClientsCache[c.name] = c; });
      clients = data.filter(c => c.has_active_work);
    }
  } catch(e) {}

  // Also get lead counts per client
  const leads = (_leadsData && _leadsData.leads) || [];
  const leadCounts = {};
  leads.forEach(l => { if (l.client_id) leadCounts[l.client_id] = (leadCounts[l.client_id] || 0) + 1; });

  const sectors = (_leadsConfig?.fieldOptions?.client_sector || []).map(o => o.value);

  let html = '<div class="manage-clients">';

  // Add client form — practice is REQUIRED (G2 / D84)
  html += `<div class="manage-clients__add">
    <input type="text" id="newClientName" placeholder="New client name..." style="flex:1">
    <select id="newClientPractice" required aria-label="Practice (required)"><option value="">-- Practice * --</option>`;
  PRACTICES.forEach(p => { html += `<option value="${esc(p.value)}">${esc(p.label)}</option>`; });
  html += `</select>
    <select id="newClientSector"><option value="">-- Sector --</option>`;
  sectors.forEach(s => { html += `<option value="${esc(s)}">${esc(s)}</option>`; });
  html += `</select>
    <input type="text" id="newClientHQ" placeholder="HQ / Location" style="width:150px">
    <button class="btn btn--primary btn--sm" data-action="createClientFromManage">Add Client</button>
  </div>`;

  // Apply sector filter (legacy) and practice filter (Phase 9, a6c82c8c)
  let filtered = clients;
  if (_leadsFilter.sector) {
    filtered = filtered.filter(c => c.sector === _leadsFilter.sector);
  }
  if (currentFilter.practice) {
    filtered = filtered.filter(c => c.practice_area === currentFilter.practice);
  }

  // Client list
  html += `<div class="manage-clients__list">`;
  if (filtered.length === 0) {
    html += `<div style="padding:20px;text-align:center;color:var(--text-muted)">${_leadsFilter.sector ? 'No ' + esc(_leadsFilter.sector) + ' clients.' : 'No clients yet.'}</div>`;
  } else {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    filtered.forEach(c => {
      const count = leadCounts[c.id] || 0;
      // Compute Active Contracts and Total SoW Value from won leads for this client
      const clientLeads = leads.filter(l => l.client_id === c.id && l.stage === 'Won');
      const activeCount = clientLeads.length;
      const totalSoWValue = clientLeads.reduce((sum, l) => sum + (parseFloat(l.rom_max) || 0), 0);
      const escName = escAttrJs(c.name);
      const _isExp = _expandedClientIds.has(c.id);
      html += `<div class="manage-clients__row" data-client-id="${c.id}">
        <div class="manage-clients__info" data-action="_actToggleClientExpand" data-pass-el>
          <span class="manage-clients__name">${esc(c.name)}</span>
          ${c.sector ? `<span class="leads-client-group__sector">${esc(c.sector)}</span>` : '<span class="manage-clients__no-sector">No sector</span>'}
          ${c.headquarters ? `<span class="manage-clients__hq">${esc(c.headquarters)}</span>` : ''}
          ${c.studio_size ? `<span style="color:var(--text-secondary);font-size:0.78rem">${c.studio_size} staff</span>` : ''}
          ${c.contract_value ? `<span style="color:var(--success);font-size:0.78rem;font-weight:600">&pound;${Number(c.contract_value).toLocaleString()}</span>` : ''}
          <span class="manage-clients__leads">${count} lead${count !== 1 ? 's' : ''}</span>
          <span class="manage-clients__arrow">${_isExp ? '\u25B2' : '\u25BC'}</span>
        </div>
        <div class="manage-clients__detail" style="display:${_isExp ? 'block' : 'none'}">
          <div style="display:flex;gap:24px;margin:12px 0;padding:12px;background:var(--bg-surface);border-radius:var(--radius-md);flex-wrap:wrap">
            <div><div style="font-size:0.75rem;color:var(--text-muted)">Active Contracts</div><div style="font-size:1.1rem;font-weight:600"><span style="cursor:pointer;color:var(--accent-text);text-decoration:underline" data-action="_actFilterClientTasks" data-arg0="${escName}" title="View tasks for ${esc(c.name)}">${activeCount}</span></div></div>
            <div><div style="font-size:0.75rem;color:var(--text-muted)">Total SoW Value</div><div style="font-size:1.1rem;font-weight:600">&pound;${totalSoWValue.toLocaleString()}</div></div>
            <div><div style="font-size:0.75rem;color:var(--text-muted)">Hiring Positions</div><div style="font-size:1.1rem;font-weight:600"><span style="cursor:pointer;color:var(--accent-text);text-decoration:underline" data-action="_actSetHiringFilterClient" data-arg0="${c.id}" title="View hiring for ${esc(c.name)}">${(_candidatesData || []).filter(x => x.client_id === c.id && !x.archived_at).length}</span></div></div>
          </div>
          <div class="lead-detail__grid" style="max-width:500px">
            <label>Name</label><input type="text" value="${esc(c.name)}" onchange="updateClientField('${c.id}','name',this.value)">
            <label>Sector</label><select onchange="updateClientField('${c.id}','sector',this.value)"><option value="">-- None --</option>`;
      sectors.forEach(s => { html += `<option value="${esc(s)}" ${c.sector === s ? 'selected' : ''}>${esc(s)}</option>`; });
      html += `</select>
            <label>HQ / Location</label><input type="text" value="${esc(c.headquarters || '')}" onchange="updateClientField('${c.id}','headquarters',this.value)">
            <label>Website</label><input type="text" value="${esc(c.website || '')}" onchange="updateClientField('${c.id}','website',this.value)">
            <label>Description</label><textarea rows="2" style="resize:vertical" onchange="updateClientField('${c.id}','description',this.value)">${esc(c.description || '')}</textarea>
            <label>NBI Relationship</label><input type="text" value="${esc(c.nbi_relationship || '')}" onchange="updateClientField('${c.id}','nbi_relationship',this.value)" placeholder="e.g. Active client, Prospect">
            <label>Studio Size</label><input type="number" min="0" value="${c.studio_size != null ? c.studio_size : ''}" onchange="updateClientField('${c.id}','studio_size',this.value?parseInt(this.value,10):null)" placeholder="Number of employees">
            <label>Contract Value</label><div style="display:flex;align-items:center;gap:0"><span style="background:var(--bg-elevated);border:1px solid var(--border-default);border-right:none;border-radius:var(--radius-md) 0 0 var(--radius-md);padding:6px 8px;color:var(--text-muted);font-size:0.82rem">&pound;</span><input type="number" min="0" step="0.01" value="${c.contract_value != null ? c.contract_value : ''}" onchange="updateClientField('${c.id}','contract_value',this.value?parseFloat(this.value):null)" placeholder="0.00" style="border-radius:0 var(--radius-md) var(--radius-md) 0;flex:1"></div>
            <label>Current Studio Project</label><input type="text" value="${esc(c.current_studio_project || '')}" onchange="updateClientField('${c.id}','current_studio_project',this.value)" placeholder="e.g. Project Alpha">
            <label title="Short code shown in calendar chips and truncated lists (e.g. CH for Couch Heroes)">Abbreviation</label><input type="text" value="${esc(c.abbreviation || '')}" maxlength="6" onchange="updateClientField('${c.id}','abbreviation',this.value.trim().toUpperCase()||null)" placeholder="CH" style="text-transform:uppercase;max-width:80px">
            <label>Practice</label><select onchange="updateClientField('${c.id}','practice_area',this.value||null)"><option value="">-- Unclassified --</option>${PRACTICES.map(p => `<option value="${esc(p.value)}" ${c.practice_area === p.value ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select>
          </div>
          <div class="manage-clients__contacts" id="clientContacts_${c.id}">
            <h4 style="margin:12px 0 6px;font-size:0.82rem;color:var(--text-secondary)">Contacts</h4>
            <div id="contactsList_${c.id}"><span style="color:var(--text-muted);font-size:0.78rem">Loading...</span></div>
            <div style="display:flex;gap:6px;margin-top:6px">
              <input type="text" id="newContactName_${c.id}" placeholder="Contact name" style="flex:1">
              <input type="text" id="newContactRole_${c.id}" placeholder="Role / Title" style="flex:1">
              <input type="email" id="newContactEmail_${c.id}" placeholder="Email" style="flex:1">
              <button class="btn btn--sm btn--primary" data-action="addClientContact" data-arg0="${c.id}">Add</button>
            </div>
          </div>
          <div class="manage-clients__sows" id="clientSows_${c.id}">
            <h4 style="margin:12px 0 6px;font-size:0.82rem;color:var(--text-secondary)">Statements of Work</h4>
            <div id="sowsList_${c.id}"><span style="color:var(--text-muted);font-size:0.78rem">Loading...</span></div>
            ${(_currentUser && _currentUser.role === 'admin') ? `<div style="display:flex;gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap">
              <input type="file" id="sowFileInput_${c.id}" accept=".pdf,.txt,application/pdf,text/plain" style="font-size:0.78rem">
              <input type="text" id="newSowTitle_${c.id}" placeholder="SoW title" style="flex:1;min-width:120px">
              <button class="btn btn--sm btn--primary" data-action="uploadSowFile" data-arg0="${c.id}">Upload SoW</button>
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">PDF or .txt. Pricing and legal sections are automatically stripped. Only the work package is stored.</div>` : ''}
          </div>
          <div class="manage-clients__teams" id="clientTeams_${c.id}">
            <h4 style="margin:12px 0 6px;font-size:0.82rem;color:var(--text-secondary)">Teams</h4>
            <div id="teamsList_${c.id}"><span style="color:var(--text-muted);font-size:0.78rem">Loading...</span></div>
            ${(_currentUser && _currentUser.role === 'admin') ? `<button class="btn btn--sm btn--primary" data-action="openCreateTeamModal" data-arg0="${c.id}" data-arg1="${escName}" style="margin-top:6px">+ New Team</button>` : ''}
          </div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <button class="btn btn--sm" data-action="gatherClientPortfolio" data-arg0="${c.id}" data-arg1="${escName}">Gather Portfolio Detail Information</button>
            ${c.research_updated_at ? `<span style="font-size:0.75rem;color:var(--text-muted)">Last researched: ${new Date(c.research_updated_at).toLocaleDateString('en-GB')}</span>` : ''}
          </div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle)">
            <button class="btn btn--danger btn--sm" data-action="deleteClientFromManage" data-arg0="${c.id}" data-arg1="${escName}" ${count > 0 ? 'title="Client has leads — leads will lose their client link"' : ''}>Delete Client</button>
          </div>
        </div>
      </div>`;
    });
  }
  html += `</div></div>`;

  el.innerHTML = html;
  _expandedClientIds.forEach(cid => {
    loadClientContacts(cid);
    loadClientSows(cid);
    loadClientTeams(cid);
  });
}

/** Toggle expansion of a client row to show/hide contacts */
function toggleClientExpand(row) {
  const detail = row.querySelector('.manage-clients__detail');
  if (!detail) return;
  const isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  row.querySelector('.manage-clients__arrow').textContent = isOpen ? '\u25BC' : '\u25B2';

  const clientId = row.getAttribute('data-client-id');
  if (isOpen) { _expandedClientIds.delete(clientId); }
  else {
    _expandedClientIds.add(clientId);
    loadClientContacts(clientId);
    loadClientSows(clientId);
    loadClientTeams(clientId);
  }
}

/** Fetch and render the contacts list for a client in the management view */
async function loadClientContacts(clientId) {
  const el = document.getElementById('contactsList_' + clientId);
  if (!el) return;
  try {
    const contacts = await apiCall('/api/clients/' + clientId + '/contacts');
    if (!contacts) { el.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">Could not load</span>'; return; }
    if (contacts.length === 0) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">No contacts yet</span>';
      return;
    }
    el.innerHTML = contacts.map(ct => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.82rem;border-bottom:1px solid var(--border-subtle)">
      <strong style="min-width:120px">${esc(ct.name)}</strong>
      <span style="color:var(--text-muted);min-width:120px">${esc(ct.role || '')}</span>
      <span style="color:var(--text-secondary);flex:1">${ct.email ? `<a href="mailto:${esc(ct.email)}" data-stop style="color:var(--accent-text);text-decoration:none">${esc(ct.email)}</a>` : ''}</span>
      ${ct.phone ? `<span style="color:var(--text-muted)">${esc(ct.phone)}</span>` : ''}
      <button class="btn btn--ghost btn--sm" data-action="deleteClientContact" data-arg0="${clientId}" data-arg1="${ct.id}" style="padding:0 4px;color:var(--text-muted)">&times;</button>
    </div>`).join('');
  } catch(e) { el.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">Error</span>'; }
}

/** Add a new contact to a client via a prompt dialog */
async function addClientContact(clientId) {
  const name = document.getElementById('newContactName_' + clientId)?.value.trim();
  const role = document.getElementById('newContactRole_' + clientId)?.value.trim();
  const email = document.getElementById('newContactEmail_' + clientId)?.value.trim();
  if (!name) { toast('Contact name is required'); return; }

  const resp = await authFetch('/api/clients/' + clientId + '/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, role: role || null, email: email || null })
  });
  if (resp.ok) {
    toast('Contact added');
    document.getElementById('newContactName_' + clientId).value = '';
    document.getElementById('newContactRole_' + clientId).value = '';
    document.getElementById('newContactEmail_' + clientId).value = '';
    loadClientContacts(clientId);
  } else {
    toast('Failed to add contact', 'error');
  }
}

/** Delete a client contact after confirmation */
async function deleteClientContact(clientId, contactId) {
  if (!(await themedConfirm('Delete this contact?'))) return;
  const resp = await authFetch('/api/contacts/' + contactId, { method: 'DELETE' });
  if (resp.ok) { toast('Contact deleted'); loadClientContacts(clientId); }
  else { toast('Delete failed', 'error'); }
}

/**
 * Load and render the SoWs list for a client in the Manage Clients view.
 * Lists are metadata only (no work_package_text) — clicking a SoW opens the
 * full filtered text in a modal via viewSow().
 */
async function loadClientSows(clientId) {
  const el = document.getElementById('sowsList_' + clientId);
  if (!el) return;
  try {
    const sows = await apiCall('/api/sows?client_id=' + clientId);
    if (!sows) { el.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">Could not load</span>'; return; }
    if (sows.length === 0) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">No SoWs yet</span>';
      return;
    }
    const isAdmin = _currentUser && _currentUser.role === 'admin';
    el.innerHTML = sows.map(s => {
      const range = [s.start_date, s.end_date].filter(Boolean).join(' \u2192 ');
      const tc = s.task_count || 0;
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.82rem;border-bottom:1px solid var(--border-subtle)">
        <a href="#" data-action="viewSow" data-prevent data-arg0="${s.id}" data-arg1="${esc(s.title)}" style="flex:1;color:var(--accent-text);text-decoration:none">${esc(s.title)}</a>
        ${range ? `<span style="color:var(--text-muted);font-size:0.75rem">${esc(range)}</span>` : ''}
        <span style="color:var(--text-muted);font-size:0.75rem">${tc} project${tc !== 1 ? 's' : ''}</span>
        ${isAdmin ? `<button class="btn btn--ghost btn--sm" data-action="deleteSow" data-arg0="${s.id}" data-arg1="${esc(s.title)}" data-arg2="${clientId}" style="padding:0 4px;color:var(--text-muted)" title="Delete SoW">&times;</button>` : ''}
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">Error</span>'; }
}

/**
 * Upload a SoW PDF file. The server extracts and filters work-package text
 * before storing — pricing and legal sections are stripped, the original
 * file is never written to disk.
 */
async function uploadSowFile(clientId, force) {
  const fileInput = document.getElementById('sowFileInput_' + clientId);
  const titleInput = document.getElementById('newSowTitle_' + clientId);
  if (!fileInput || !fileInput.files || !fileInput.files[0]) { toast('Select a PDF file first'); return; }
  const file = fileInput.files[0];
  const ACCEPTED_TYPES = ['application/pdf', 'text/plain'];
  if (file.type && !ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith('.txt')) { toast('Only PDF and plain text (.txt) files are accepted', 'error'); return; }
  const title = (titleInput && titleInput.value.trim()) || file.name.replace(/\.pdf$/i, '');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('client_id', clientId);
  formData.append('title', title);
  if (force) formData.append('force', 'true');
  try {
    toast(force ? 'Uploading without filter...' : 'Extracting work package content...');
    const resp = await authFetch('/api/sows/upload', {
      method: 'POST',
      body: formData
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      if (err.canForce && !force) {
        const msg = (err.hint || err.error) + '\n\nUpload anyway without the pricing/legal filter?';
        if (await themedConfirm(msg, 'Force Upload')) {
          uploadSowFile(clientId, true);
        }
        return;
      }
      toast(err.hint || err.error || 'Upload failed', 'error');
      return;
    }
    const result = await resp.json();
    const stats = result.extraction_stats || {};
    toast('SoW uploaded. ' + (stats.kept || 0) + ' work package sections kept, ' + (stats.filtered || 0) + ' pricing/legal sections stripped.');
    fileInput.value = '';
    if (titleInput) titleInput.value = '';
    loadClientSows(clientId);
  } catch(e) { toast('Upload error: ' + e.message, 'error'); }
}

/** Open a modal showing the filtered work-package text of a SoW */
async function viewSow(sowId, title) {
  try {
    const sow = await apiCall('/api/sows/' + sowId);
    if (!sow) { toast('Could not load SoW', 'error'); return; }
    const range = [sow.start_date, sow.end_date].filter(Boolean).join(' \u2192 ');
    const html = `<div class="modal-overlay open" id="sowViewModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
      <div class="modal" style="max-width:var(--modal-lg);max-height:90vh;display:flex;flex-direction:column">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h2 style="margin:0">${esc(sow.title)}</h2>
          <button class="btn btn--ghost" data-action="_actModalRemove" data-arg0="sowViewModal" aria-label="Close">&times;</button>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">${sow.client_name ? 'Client: ' + esc(sow.client_name) + (range ? ' \u00b7 ' : '') : '<span style="font-style:italic">(no client)</span>' + (range ? ' \u00b7 ' : '')}${range ? esc(range) : ''}</div>
        <div style="padding:12px;background:var(--bg-surface);border-radius:var(--radius-md);border:1px solid var(--border-default);font-size:0.82rem;line-height:1.5;overflow-y:auto;flex:1;white-space:pre-wrap">${esc(sow.work_package_text || '(No work package content)')}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">Pricing and legal sections were automatically filtered from the source document.</div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    if (typeof _activateDynamicModal === 'function') _activateDynamicModal('sowViewModal');
  } catch(e) { toast('View error: ' + e.message, 'error'); }
}

/** Delete a SoW (admin only). Linked projects are unlinked via ON DELETE SET NULL. */
async function deleteSow(sowId, title, clientId) {
  if (!(await themedConfirm('Delete SoW "' + title + '"? Projects currently linked to this SoW will be unlinked.'))) return;
  const resp = await authFetch('/api/sows/' + sowId, { method: 'DELETE' });
  if (resp.ok) {
    toast('SoW deleted');
    if (clientId) loadClientSows(clientId);
  } else {
    toast('Delete failed', 'error');
  }
}

// ===== TEAMS =====
// Cache of all teams keyed by id, refreshed by loadAllTeams. Used by the
// task detail panel to look up which team a project's client/SoW belongs to
// without an extra fetch per task.
let _teamsCache = [];
// SoW cache — refreshed on startup. Used by the task detail panel's SoW
// selector and by renderTreeView to group projects under SoW buckets
// (bug cb32b7f9: Client > SoW > Project > Tickets hierarchy).
let _sowsCache = [];

/**
 * Refresh the in-memory teams cache from /api/teams. Called on startup and
 * any time team data changes via create/update/delete/membership operations.
 */
async function loadAllTeams() {
  try {
    const teams = await apiCall('/api/teams');
    _teamsCache = Array.isArray(teams) ? teams : [];
  } catch (e) { _teamsCache = []; }
  // If the calendar was rendered before teams arrived, refresh the filter bar now
  if (currentView === 'people' && _peopleSubView === 'calendar') renderContent();
  return _teamsCache;
}

/**
 * Refresh the in-memory SoWs cache from /api/sows. Called on startup and
 * any time a task's SoW changes. SoWs are pre-loaded with their client_name
 * joined server-side so the selector and tree grouping don't need extra lookups.
 */
async function loadAllSows() {
  try {
    const sows = await apiCall('/api/sows');
    _sowsCache = Array.isArray(sows) ? sows : [];
  } catch (e) { _sowsCache = []; }
  return _sowsCache;
}

/** Return the team that owns a given client or SoW, or null if none. SoW match takes precedence. */
function findTeamForClientOrSow(clientId, sowId) {
  if (!Array.isArray(_teamsCache) || _teamsCache.length === 0) return null;
  if (sowId) {
    const bySow = _teamsCache.find(t => t.sow_id === sowId);
    if (bySow) return bySow;
  }
  if (clientId) {
    return _teamsCache.find(t => t.client_id === clientId) || null;
  }
  return null;
}

/**
 * Render the teams list for a client in the Manage Clients view. Each row
 * shows the team name, member count and (for admins) edit / delete controls.
 */
async function loadClientTeams(clientId) {
  const el = document.getElementById('teamsList_' + clientId);
  if (!el) return;
  try {
    const teams = await apiCall('/api/teams?client_id=' + clientId);
    if (!teams) { el.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">Could not load</span>'; return; }
    if (teams.length === 0) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">No teams yet</span>';
      return;
    }
    const isAdmin = _currentUser && _currentUser.role === 'admin';
    el.innerHTML = teams.map(t => {
      const swatch = t.colour ? `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${esc(t.colour)};margin-right:4px;vertical-align:middle"></span>` : '';
      const sowSuffix = t.sow_title ? ` <span style="color:var(--text-muted);font-size:0.75rem">\u00b7 ${esc(t.sow_title)}</span>` : '';
      const mc = t.member_count || 0;
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.82rem;border-bottom:1px solid var(--border-subtle)">
        <a href="#" data-action="openTeamDetailModal" data-prevent data-arg0="${t.id}" style="flex:1;color:var(--accent-text);text-decoration:none">${swatch}${esc(t.name)}${sowSuffix}</a>
        <span style="color:var(--text-muted);font-size:0.75rem">${mc} member${mc !== 1 ? 's' : ''}</span>
        ${isAdmin ? `<button class="btn btn--ghost btn--sm" data-action="deleteTeam" data-arg0="${t.id}" data-arg1="${esc(t.name)}" data-arg2="${clientId}" style="padding:0 4px;color:var(--text-muted)" title="Delete team">&times;</button>` : ''}
      </div>`;
    }).join('');
  } catch (e) { el.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">Error</span>'; }
}

/**
 * Open the create-team modal scoped to a particular client. Admin only.
 * Pre-fetches SoWs for the client so the user can optionally tie the team
 * to a specific SoW.
 */
async function openCreateTeamModal(clientId, clientName) {
  if (!_currentUser || _currentUser.role !== 'admin') { toast('Admin only', 'error'); return; }
  // Fetch SoWs for the client to populate the optional dropdown
  let sows = [];
  try { sows = (await apiCall('/api/sows?client_id=' + clientId)) || []; } catch (e) { console.warn('[Teams] SOW fetch error:', e.message || e); }
  const sowOpts = `<option value="">-- None --</option>` + sows.map(s =>
    `<option value="${esc(s.id)}">${esc(s.title)}</option>`
  ).join('');
  const html = `<div class="modal-overlay open" id="createTeamModal" role="dialog" aria-modal="true" aria-labelledby="createTeamModalTitle" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-sm)">
      <h2 id="createTeamModalTitle" style="margin-top:0">New Team</h2>
      <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">For client: <strong>${esc(clientName)}</strong></div>
      <div class="lead-detail__grid">
        <label class="field-required">Name</label><input type="text" id="newTeamName" placeholder="e.g. DS&amp;A Team">
        <label>Description</label><textarea id="newTeamDesc" rows="2" style="resize:vertical" placeholder="What does this team do?"></textarea>
        <label>SoW (optional)</label><select id="newTeamSow">${sowOpts}</select>
        <label>Colour</label><input type="color" id="newTeamColour" value="#3b82f6" style="height:32px;width:60px;padding:2px">
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button class="btn" data-action="_actModalRemove" data-arg0="createTeamModal">Cancel</button>
        <button class="btn btn--primary" data-action="_actSubmitCreateTeam" data-pass-el data-arg0="${clientId}">Create</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  if (typeof _activateDynamicModal === 'function') _activateDynamicModal('createTeamModal');
}

/** Submit the create-team modal and refresh the client's teams list on success. */
async function submitCreateTeam(clientId) {
  const nameEl = document.getElementById('newTeamName');
  const name = nameEl ? nameEl.value.trim() : '';
  if (!name) {
    if (typeof showFieldError === 'function' && nameEl) showFieldError(nameEl, 'Name is required');
    else toast('Name is required');
    return;
  }
  const description = document.getElementById('newTeamDesc')?.value.trim() || null;
  const sow_id = document.getElementById('newTeamSow')?.value || null;
  const colour = document.getElementById('newTeamColour')?.value || null;
  const resp = await authFetch('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, client_id: clientId, sow_id: sow_id || null, colour })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    toast('Failed to create team: ' + (err.error?.message || err.error || 'Unknown error'), 'error');
    return;
  }
  document.getElementById('createTeamModal')?.remove();
  toast('Team created');
  await loadAllTeams();
  loadClientTeams(clientId);
}

/**
 * Open the team detail modal showing metadata, members and (for admins) the
 * controls to add / remove members and toggle their lead/member role.
 */
async function openTeamDetailModal(teamId) {
  const team = await apiCall('/api/teams/' + teamId);
  if (!team) { toast('Could not load team', 'error'); return; }
  // Fetch all users so the admin add-member dropdown can pick anyone
  const isAdmin = _currentUser && _currentUser.role === 'admin';
  let allUsers = [];
  let clientSows = [];
  if (isAdmin) {
    try { allUsers = (await apiCall('/api/users')) || []; } catch (e) { console.warn('[Teams] users fetch error:', e.message || e); }
    // Fetch SoWs scoped to this team's client so the SoW picker is relevant
    if (team.client_id) {
      try { clientSows = (await apiCall('/api/sows?client_id=' + team.client_id)) || []; } catch (e) { console.warn('[Teams] client SOW fetch error:', e.message || e); }
    } else {
      // No client set — offer all SoWs as a fallback
      clientSows = Array.isArray(_sowsCache) ? _sowsCache : [];
    }
  }
  const memberIds = new Set((team.members || []).map(m => m.user_id));
  const candidateUsers = allUsers.filter(u => !memberIds.has(u.id));
  const userOpts = `<option value="">-- Select user --</option>` + candidateUsers
    .sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''))
    .map(u => `<option value="${esc(u.id)}">${esc(u.display_name || u.username)}</option>`).join('');

  const memberRows = (team.members || []).map(m => {
    const isLead = m.role === 'lead';
    const roleSelect = isAdmin
      ? `<select onchange="setTeamMemberRole('${teamId}','${m.user_id}',this.value)" style="font-size:0.75rem;padding:2px 4px">
           <option value="member" ${!isLead ? 'selected' : ''}>Member</option>
           <option value="lead" ${isLead ? 'selected' : ''}>Lead</option>
         </select>`
      : `<span style="font-size:0.75rem;color:var(--text-muted)">${isLead ? 'Lead' : 'Member'}</span>`;
    const removeBtn = isAdmin
      ? `<button class="btn btn--ghost btn--sm" data-action="removeTeamMember" data-arg0="${teamId}" data-arg1="${m.user_id}" title="Remove from team" style="padding:0 4px;color:var(--text-muted)">&times;</button>`
      : '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.82rem;border-bottom:1px solid var(--border-subtle)">
      <strong style="flex:1">${esc(m.display_name || m.username)}</strong>
      ${roleSelect}
      ${removeBtn}
    </div>`;
  }).join('') || '<span style="color:var(--text-muted);font-size:0.78rem">No members yet</span>';

  // SoW row: admins get an editable dropdown; others see read-only text
  let sowRow = '';
  if (isAdmin) {
    const sowOpts = `<option value="">-- No SoW --</option>` + clientSows.map(s =>
      `<option value="${esc(s.id)}" ${team.sow_id === s.id ? 'selected' : ''}>${esc(s.title)}</option>`
    ).join('');
    sowRow = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
      <span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap">SoW:</span>
      <select id="teamDetailSowSelect" style="font-size:0.78rem;flex:1">${sowOpts}</select>
      <button class="btn btn--sm btn--primary" data-action="patchTeamSow" data-arg0="${teamId}">Save</button>
    </div>`;
  } else if (team.sow_title) {
    sowRow = `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">SoW: ${esc(team.sow_title)}</div>`;
  }

  const swatch = team.colour ? `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${esc(team.colour)};margin-right:6px;vertical-align:middle"></span>` : '';
  const html = `<div class="modal-overlay open" id="teamDetailModal" role="dialog" aria-modal="true" aria-labelledby="teamDetailModalTitle" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-md);max-height:90vh;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h2 id="teamDetailModalTitle" style="margin:0">${swatch}${esc(team.name)}</h2>
        <button class="btn btn--ghost" data-action="_actModalRemove" data-arg0="teamDetailModal" aria-label="Close team detail">&times;</button>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">
        ${team.client_name ? 'Client: ' + esc(team.client_name) : '<span style="font-style:italic">(no client)</span>'}
      </div>
      ${sowRow}
      ${team.description ? `<div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px">${esc(team.description)}</div>` : ''}
      <h3 style="margin:8px 0 4px;font-size:0.82rem;color:var(--text-secondary)">Members</h3>
      <div id="teamMembersList" style="overflow-y:auto;flex:1;min-height:80px">${memberRows}</div>
      ${isAdmin ? `<div style="display:flex;gap:6px;margin-top:12px;align-items:center">
        <select id="addTeamMemberUser" style="flex:1;font-size:0.78rem">${userOpts}</select>
        <select id="addTeamMemberRole" style="font-size:0.78rem">
          <option value="member" selected>Member</option>
          <option value="lead">Lead</option>
        </select>
        <button class="btn btn--sm btn--primary" data-action="addTeamMemberFromModal" data-arg0="${teamId}">Add</button>
      </div>` : ''}
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  if (typeof _activateDynamicModal === 'function') _activateDynamicModal('teamDetailModal');
}

/** PATCH sow_id on a team from the team detail modal. Admin only. */
async function patchTeamSow(teamId) {
  const sel = document.getElementById('teamDetailSowSelect');
  if (!sel) return;
  const sow_id = sel.value || null;
  const resp = await authFetch('/api/teams/' + teamId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sow_id: sow_id || '' })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    toast('Failed to update SoW: ' + (err.error?.message || err.error || 'Unknown error'), 'error');
    return;
  }
  toast('SoW updated');
  await loadAllTeams();
  document.getElementById('teamDetailModal')?.remove();
  openTeamDetailModal(teamId);
}

/** Add a member to a team from the team detail modal. Admin only. */
async function addTeamMemberFromModal(teamId) {
  const userSel = document.getElementById('addTeamMemberUser');
  const roleSel = document.getElementById('addTeamMemberRole');
  const userId = userSel ? userSel.value : '';
  if (!userId) { toast('Select a user first'); return; }
  const role = roleSel ? roleSel.value : 'member';
  await addTeamMember(teamId, userId, role);
}

/**
 * POST a new team membership and refresh the modal + teams cache. Used by
 * both the team detail modal add button and any future programmatic callers.
 */
async function addTeamMember(teamId, userId, role) {
  const resp = await authFetch('/api/teams/' + teamId + '/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, role: role || 'member' })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    toast('Failed to add member: ' + (err.error?.message || err.error || 'Unknown error'), 'error');
    return;
  }
  toast('Member added');
  await loadAllTeams();
  // Reopen detail modal to reflect the change
  document.getElementById('teamDetailModal')?.remove();
  openTeamDetailModal(teamId);
}

/** DELETE a team membership and refresh the modal. Admin only. */
async function removeTeamMember(teamId, userId) {
  if (!(await themedConfirm('Remove this member from the team?'))) return;
  const resp = await authFetch('/api/teams/' + teamId + '/members/' + userId, { method: 'DELETE' });
  if (!resp.ok) {
    toast('Failed to remove member', 'error');
    return;
  }
  toast('Member removed');
  await loadAllTeams();
  document.getElementById('teamDetailModal')?.remove();
  openTeamDetailModal(teamId);
}

/** PATCH a team member's role (lead/member) and refresh the cache. Admin only. */
async function setTeamMemberRole(teamId, userId, role) {
  const resp = await authFetch('/api/teams/' + teamId + '/members/' + userId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
  if (!resp.ok) {
    toast('Failed to update role', 'error');
    return;
  }
  toast('Role updated');
  await loadAllTeams();
}

/** Delete a team after confirmation. Admin only. */
async function deleteTeam(teamId, name, clientId) {
  if (!(await themedConfirm('Delete team "' + name + '"? All memberships will be removed. This cannot be undone.'))) return;
  const resp = await authFetch('/api/teams/' + teamId, { method: 'DELETE' });
  if (!resp.ok) {
    toast('Delete failed', 'error');
    return;
  }
  toast('Team deleted');
  await loadAllTeams();
  if (clientId) loadClientTeams(clientId);
}

/** Create a new client from the management view via prompt dialog */
async function createClientFromManage() {
  const name = document.getElementById('newClientName')?.value.trim();
  if (!name) { toast('Client name is required'); return; }
  // G2 / D84: practice_area is required at creation time
  const practice_area = document.getElementById('newClientPractice')?.value || '';
  if (!practice_area) { toast('Practice is required — pick Gaming or Organizational Performance', 'warning'); return; }
  const sector = document.getElementById('newClientSector')?.value || null;
  const headquarters = document.getElementById('newClientHQ')?.value.trim() || null;

  const resp = await authFetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sector, headquarters, practice_area })
  });
  if (resp.ok) {
    toast('Client created');
    document.getElementById('newClientName').value = '';
    document.getElementById('newClientPractice').value = '';
    document.getElementById('newClientSector').value = '';
    document.getElementById('newClientHQ').value = '';
    renderLeadsContent();
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to create client', 'error');
  }
}

/** Update a single field on a client record via PATCH */
async function updateClientField(clientId, field, value) {
  const resp = await authFetch('/api/clients/' + clientId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value })
  });
  if (resp.ok) {
    toast('Updated');
    // Update the in-memory client cache so changes are reflected without a reload.
    try {
      const updated = await resp.json();
      if (updated && updated.name) {
        _apiClientsCache[updated.name] = updated;
        // Bust the prefix cache so the new abbreviation takes effect immediately
        if (field === 'abbreviation' || field === 'name') clearClientPrefixCache(updated.name);
      }
    } catch (e) { /* non-fatal — next poll will refresh */ }
    // Re-render so the Manage Clients page reflects the change immediately
    // (Glen 2026-04-16: fields updated but page didn't refresh).
    renderContent();
    renderSidebar();
  }
  else { toast('Update failed', 'error'); }
}

/** Trigger the client research pipeline. Currently a stub -- no search backend is wired.
 *  The user is told this explicitly rather than shown a "0 fields verified" success toast. */
async function gatherClientPortfolio(clientId, clientName) {
  if (!(await themedConfirm(
    `Research is not yet connected to a live search backend.\n\nClicking Continue will log the request and create an audit trail, but no fields will be populated until the research backend is configured (Brave / Tavily / Anthropic search).\n\nContinue?`,
    'Gather Portfolio Information — Not Yet Active'
  ))) return;
  toast('Logging research request for ' + clientName + '...');
  try {
    const result = await apiCall('/api/clients/' + clientId + '/research', { method: 'POST' });
    if (!result) { toast('Request failed', 'error'); return; }
    const fieldCount = Object.keys(result.fields || {}).length;
    if (fieldCount > 0) {
      toast(`Research complete. ${fieldCount} field${fieldCount !== 1 ? 's' : ''} populated.`);
    } else {
      toast('Request logged. Research backend not yet wired -- no fields populated.', 'warning');
    }
    renderContent();
  } catch (e) {
    toast('Research error: ' + e.message, 'error');
  }
}

/** Delete a client record after confirmation (warns about data loss) */
async function deleteClientFromManage(clientId, clientName) {
  if (!(await themedConfirm('Delete client "' + clientName + '"? Any leads linked to this client will lose their client association.'))) return;
  const resp = await authFetch('/api/clients/' + clientId, { method: 'DELETE' });
  if (resp.ok) {
    toast('Client deleted');
    await loadLeads(); // Refresh leads data since client links changed
    renderLeadsContent();
  } else {
    toast('Delete failed', 'error');
  }
}

// ---- LEAD DETAIL PANEL ----
/** Open the lead detail overlay panel, fetching full lead data from the API */
async function openLeadDetail(id) {
  _leadsDetailId = id;
  _pushEntityHash('lead', id);
  const overlay = document.getElementById('leadDetailOverlay');
  const panel = document.getElementById('leadDetailPanel');
  if (!overlay || !panel) return;

  overlay.classList.add('open');
  panel.classList.add('open');
  panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading...</div>';

  try {
    const lead = await apiCall('/api/leads/' + id);
    if (!lead) { panel.innerHTML = '<p>Failed to load lead</p>'; return; }
    renderLeadDetailContent(panel, lead);
  } catch(e) {
    panel.innerHTML = '<p>Error loading lead</p>';
  }
}

/** Close the lead detail overlay panel */
/** Update a contact field inline from the lead detail panel */
async function patchContact(contactId, field, value, leadId) {
  try {
    await authFetch('/api/contacts/' + contactId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });
  } catch(e) { toast('Failed to update contact', 'error'); }
}

/** Add a new contact from the lead detail panel */
async function addContactFromDetail(clientId, leadId) {
  const name = document.getElementById('addContactName_' + clientId)?.value?.trim();
  if (!name) { toast('Contact name required', 'error'); return; }
  const role = document.getElementById('addContactRole_' + clientId)?.value?.trim() || '';
  const email = document.getElementById('addContactEmail_' + clientId)?.value?.trim() || '';
  const phone = document.getElementById('addContactPhone_' + clientId)?.value?.trim() || '';
  try {
    const resp = await authFetch(`/api/clients/${clientId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, email, phone })
    });
    if (resp.ok) {
      toast('Contact added');
      openLeadDetail(leadId); // Refresh the detail panel
    } else { toast('Failed to add contact', 'error'); }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Close the lead detail slide-over panel */
function closeLeadDetail() {
  _clearEntityHash();
  _leadsDetailId = null;
  document.getElementById('leadDetailOverlay')?.classList.remove('open');
  document.getElementById('leadDetailPanel')?.classList.remove('open');
}

/** Render lead detail content: properties, ROM, resources, activities, attachments, and staffing check */
function renderLeadDetailContent(panel, lead) {
  const config = _leadsConfig;
  const isAdmin = _currentUser && _currentUser.role === 'admin';

  const isComplete = !!lead.completed_at;
  let html = `<div class="lead-detail ${isComplete ? 'lead-detail--complete' : ''}">`;
  // Header
  html += `<div class="lead-detail__header">
    <button class="btn btn--ghost" data-action="copyEntityLink" data-arg0="lead" data-arg1="${lead.id}" title="Copy link">&#128279;</button>
    <button class="btn btn--ghost" data-action="closeLeadDetail" style="margin-right:8px">\u2715</button>
    <div style="flex:1">
      ${lead.client_name ? `<div class="leads-card__client">${esc(lead.client_name)}</div>` : ''}
      <h2 style="margin:0">${esc(lead.title)}${isComplete ? ' <span style="color:var(--success);font-size:0.8em" title="Completed">\u2713</span>' : ''}</h2>
    </div>
    <span class="leads-stage-badge" style="background:${safeColour(lead.stage_colour)}20;color:${safeColour(lead.stage_colour)};border:1px solid ${safeColour(lead.stage_colour)}40;font-size:0.85rem;padding:4px 12px">${esc(lead.stage_name)}</span>
    ${isAdmin ? `<button class="btn btn--danger btn--sm" data-action="deleteLead" data-arg0="${lead.id}" style="margin-left:8px;font-size:0.75rem" title="Delete this lead">Delete</button>` : ''}
  </div>`;

  // Won-stage Mark Complete button (or Uncomplete for completed leads, admin only)
  if (lead.is_won) {
    html += `<div class="lead-detail__section" style="display:flex;align-items:center;gap:8px;padding:8px 0">`;
    if (isComplete) {
      const completedOn = new Date(lead.completed_at).toLocaleDateString();
      html += `<span style="font-size:0.78rem;color:var(--success)">\u2713 Completed on ${esc(completedOn)}</span>`;
      if (isAdmin) {
        html += `<button class="btn btn--sm btn--outline" data-action="uncompleteLead" data-arg0="${lead.id}" style="margin-left:auto">Uncomplete</button>`;
      }
    } else {
      html += `<button class="btn btn--sm btn--success" data-action="completeLead" data-arg0="${lead.id}">\u2713 Mark Complete</button>`;
      html += `<span style="font-size:0.75rem;color:var(--text-muted)">Locks the card and prevents further edits.</span>`;
    }
    html += `</div>`;
  }

  // Client Profile section
  if (lead.client_id && lead.client_name) {
    html += `<div class="lead-detail__section lead-detail__profile">
      <h3>Client Profile</h3>
      <div class="client-profile">
        <div class="client-profile__header">
          <strong class="client-profile__name">${esc(lead.client_name)}</strong>
          ${lead.client_sector ? `<span class="client-profile__sector">${esc(lead.client_sector)}</span>` : ''}
        </div>
        <div class="client-profile__fields">
          ${lead.client_hq ? `<div class="client-profile__field"><span class="client-profile__label">HQ</span><span>${esc(lead.client_hq)}</span></div>` : ''}
          ${lead.client_website ? `<div class="client-profile__field"><span class="client-profile__label">Website</span><a href="${safeUrl(lead.client_website)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">${esc(lead.client_website)}</a></div>` : ''}
          ${lead.client_linkedin ? `<div class="client-profile__field"><span class="client-profile__label">LinkedIn</span><a href="${safeUrl(lead.client_linkedin)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">${esc(lead.client_linkedin)}</a></div>` : ''}
          ${lead.client_nbi_relationship ? `<div class="client-profile__field"><span class="client-profile__label">NBI Relationship</span><span>${esc(lead.client_nbi_relationship)}</span></div>` : ''}
          ${lead.client_description ? `<div class="client-profile__field client-profile__field--full"><span class="client-profile__label">About</span><span>${esc(lead.client_description)}</span></div>` : ''}
        </div>`;
    // Client contacts — editable inline
    html += `<div class="client-profile__contacts"><span class="client-profile__label" style="margin-bottom:6px;display:block">Key Contacts</span>`;
    if (lead.client_contacts && lead.client_contacts.length > 0) {
      lead.client_contacts.forEach(cc => {
        html += `<div class="client-profile__contact" style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
          <input value="${esc(cc.name)}" placeholder="Name" onblur="patchContact('${cc.id}','name',this.value,'${lead.id}')" style="font-weight:600;background:transparent;border:1px solid transparent;border-radius:3px;padding:2px 4px;color:var(--text-primary);font-size:0.82rem" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='transparent';patchContact('${cc.id}','name',this.value,'${lead.id}')">
          <input value="${esc(cc.role||'')}" placeholder="Role / Title" onblur="patchContact('${cc.id}','role',this.value,'${lead.id}')" style="background:transparent;border:1px solid transparent;border-radius:3px;padding:2px 4px;color:var(--text-secondary);font-size:0.8rem" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='transparent';patchContact('${cc.id}','role',this.value,'${lead.id}')">
          <input value="${esc(cc.email||'')}" placeholder="Email" onblur="patchContact('${cc.id}','email',this.value,'${lead.id}')" style="background:transparent;border:1px solid transparent;border-radius:3px;padding:2px 4px;color:var(--accent);font-size:0.8rem" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='transparent';patchContact('${cc.id}','email',this.value,'${lead.id}')">
          <input value="${esc(cc.phone||'')}" placeholder="Phone" onblur="patchContact('${cc.id}','phone',this.value,'${lead.id}')" style="background:transparent;border:1px solid transparent;border-radius:3px;padding:2px 4px;color:var(--text-secondary);font-size:0.8rem" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='transparent';patchContact('${cc.id}','phone',this.value,'${lead.id}')">
        </div>`;
      });
    }
    // Add contact form
    html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:4px;margin-top:6px;align-items:center">
      <input id="addContactName_${lead.client_id}" placeholder="Name" style="padding:4px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary);font-size:0.78rem">
      <input id="addContactRole_${lead.client_id}" placeholder="Role" style="padding:4px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary);font-size:0.78rem">
      <input id="addContactEmail_${lead.client_id}" placeholder="Email" style="padding:4px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary);font-size:0.78rem">
      <input id="addContactPhone_${lead.client_id}" placeholder="Phone" style="padding:4px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary);font-size:0.78rem">
      <button class="btn btn--sm btn--primary" data-action="addContactFromDetail" data-arg0="${lead.client_id}" data-arg1="${lead.id}" style="font-size:0.75rem;padding:4px 8px">Add</button>
    </div>`;
    html += `</div>`;
    html += `</div></div>`;
  }

  // Deal Info
  html += `<div class="lead-detail__section"><h3>Deal Info</h3><div class="lead-detail__grid">`;

  // Client - loaded async
  html += `<label>Client</label><select id="leadDetailClientSelect" onchange="updateLead('${lead.id}','client_id',this.value||null)"><option value="">-- None --</option></select>`;
  // Load clients async
  authFetch('/api/clients').then(r=>r.json()).then(clients => {
    const sel = document.getElementById('leadDetailClientSelect');
    if (!sel) return;
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.name;
      if (c.id === lead.client_id) opt.selected = true;
      sel.appendChild(opt);
    });
  }).catch(()=>{});

  // Work type
  html += `<label>Work Type</label><select onchange="updateLead('${lead.id}','work_type',this.value)"><option value="">-- Select --</option>`;
  (config.fieldOptions.work_type || []).forEach(o => {
    html += `<option value="${esc(o.value)}" ${lead.work_type===o.value?'selected':''}>${esc(o.value)}</option>`;
  });
  html += `</select>`;

  // Service line
  html += `<label>Service Line</label><select onchange="updateLead('${lead.id}','service_line',this.value)"><option value="">-- Select --</option>`;
  (config.fieldOptions.service_line || []).forEach(o => {
    html += `<option value="${esc(o.value)}" ${lead.service_line===o.value?'selected':''}>${esc(o.value)}</option>`;
  });
  html += `</select>`;

  // Stage
  html += `<label>Stage</label><select onchange="updateLead('${lead.id}','stage_id',this.value)">`;
  config.stages.forEach(s => {
    html += `<option value="${s.id}" ${lead.stage_id===s.id?'selected':''}>${esc(s.name)}</option>`;
  });
  html += `</select>`;

  // Priority
  html += `<label>Priority</label><select onchange="updateLead('${lead.id}','priority',this.value||null)"><option value="">-- None --</option>`;
  [1,2,3,4,5].forEach(p => { html += `<option value="${p}" ${lead.priority===p?'selected':''}>${p}</option>`; });
  html += `</select>`;

  // Deal owner
  html += `<label>Deal Owner</label><select onchange="updateLead('${lead.id}','deal_owner',this.value)"><option value="">-- Select --</option>`;
  (config.fieldOptions.deal_owner || []).forEach(o => {
    html += `<option value="${esc(o.value)}" ${lead.deal_owner===o.value?'selected':''}>${esc(o.value)}</option>`;
  });
  html += `</select>`;

  // Lead source
  html += `<label>Lead Source</label><select onchange="updateLead('${lead.id}','lead_source',this.value)"><option value="">-- Select --</option>`;
  (config.fieldOptions.lead_source || []).forEach(o => {
    html += `<option value="${esc(o.value)}" ${lead.lead_source===o.value?'selected':''}>${esc(o.value)}</option>`;
  });
  html += `</select>`;

  // Practice (Phase 9, a6c82c8c). Tagging a lead with a practice makes
  // it appear when the sidebar Practices filter is active.
  html += `<label>Practice</label><select onchange="updateLead('${lead.id}','practice_area',this.value||null)"><option value="">-- Unclassified --</option>`;
  PRACTICES.forEach(p => {
    html += `<option value="${esc(p.value)}" ${lead.practice_area === p.value ? 'selected' : ''}>${esc(p.label)}</option>`;
  });
  html += `</select>`;

  // SoW picker — scoped to the lead's client so PMs don't see irrelevant SoWs
  const clientSows = lead.client_id ? _sowsCache.filter(s => s.client_id === lead.client_id) : _sowsCache;
  html += `<label>Statement of Work</label><select onchange="updateLead('${lead.id}','sow_id',this.value||null)"><option value="">-- None --</option>`;
  clientSows.forEach(s => {
    html += `<option value="${esc(s.id)}" ${lead.sow_id === s.id ? 'selected' : ''}>${esc(s.title)}</option>`;
  });
  html += `</select>`;

  html += `</div></div>`;

  // Primary Contact
  html += `<div class="lead-detail__section"><h3>Primary Contact</h3><div class="lead-detail__grid">`;
  if (lead.primary_contact_id) {
    html += `<label>Name</label><input type="text" value="${esc(lead.primary_contact_name||'')}" onchange="_updateLeadContact('${lead.primary_contact_id}','name',this.value)">`;
    html += `<label>Email</label><input type="email" value="${esc(lead.primary_contact_email||'')}" onchange="_updateLeadContact('${lead.primary_contact_id}','email',this.value)">`;
    html += `<label>Phone</label><input type="tel" value="${esc(lead.primary_contact_phone||'')}" onchange="_updateLeadContact('${lead.primary_contact_id}','phone',this.value)">`;
  } else {
    html += `<div style="grid-column:1/-1;color:var(--text-muted);font-size:0.78rem">No contact linked. Add one when creating a new lead.</div>`;
  }
  html += `</div></div>`;

  // Value section
  html += `<div class="lead-detail__section"><h3>Value</h3><div class="lead-detail__grid">`;
  html += `<label>Currency</label><select onchange="updateLead('${lead.id}','currency',this.value)">`;
  (config.fieldOptions.currency || []).forEach(o => {
    html += `<option value="${esc(o.value)}" ${lead.currency===o.value?'selected':''}>${esc(o.value)}</option>`;
  });
  html += `</select>`;
  html += `<label>ROM Min</label><input type="number" value="${lead.rom_min||''}" onchange="updateLead('${lead.id}','rom_min',this.value)" placeholder="e.g. 75000">`;
  html += `<label>ROM Max</label><input type="number" value="${lead.rom_max||''}" onchange="updateLead('${lead.id}','rom_max',this.value)" placeholder="e.g. 150000">`;
  html += `<label>ROM Text</label><input type="text" value="${esc(lead.rom_text||'')}" onchange="updateLead('${lead.id}','rom_text',this.value)" placeholder="e.g. TBD">`;
  html += `<label>Win %</label><input type="number" min="0" max="100" value="${lead.win_probability!=null?lead.win_probability:''}" onchange="updateLead('${lead.id}','win_probability',this.value?parseInt(this.value):null)" placeholder="0-100">`;
  html += `<label>Weighted</label><div style="padding:6px 0;font-weight:600">${lead.weighted_value ? currencySym(lead.currency) + fmtMoney(lead.weighted_value) : '-'}</div>`;
  html += `</div></div>`;

  // Dates
  html += `<div class="lead-detail__section"><h3>Dates</h3><div class="lead-detail__grid">`;
  html += `<label>Est Start</label><input type="date" value="${lead.est_start_date||''}" onchange="updateLead('${lead.id}','est_start_date',this.value)">`;
  html += `<label>Expected Close</label><input type="date" value="${lead.expected_close_date||''}" onchange="updateLead('${lead.id}','expected_close_date',this.value)">`;
  html += `<label>Last Contacted</label><input type="date" value="${lead.last_contacted||''}" onchange="updateLead('${lead.id}','last_contacted',this.value)">`;
  const isOverdue = lead.next_followup_date && new Date(lead.next_followup_date) < new Date(new Date().toDateString());
  html += `<label>Next Follow-up</label><input type="date" value="${lead.next_followup_date||''}" onchange="updateLead('${lead.id}','next_followup_date',this.value)" style="${isOverdue?'border-color:var(--danger)':''}">`;
  html += `<label>Next Action</label><input type="text" value="${esc(lead.next_action||'')}" onchange="updateLead('${lead.id}','next_action',this.value)" placeholder="What's the next step?">`;
  html += `</div></div>`;

  // Location
  html += `<div class="lead-detail__section"><h3>Location</h3>
    <input type="text" value="${esc(lead.location||'')}" onchange="updateLead('${lead.id}','location',this.value)" placeholder="e.g. Leamington Spa" style="width:100%">
  </div>`;

  // Resource requirements
  html += `<div class="lead-detail__section"><h3>Resource Requirements</h3>`;
  if (lead.resources && lead.resources.length > 0) {
    html += `<div class="lead-resources-list">`;
    lead.resources.forEach(r => {
      html += `<div class="lead-resource-row">
        <span>${esc(r.resource_name)}</span>
        <input type="number" min="1" value="${r.quantity}" style="width:60px" onchange="updateLeadResource('${lead.id}','${r.resource_type_id}',parseInt(this.value))">
        <button class="btn btn--ghost btn--sm" data-action="removeLeadResource" data-arg0="${lead.id}" data-arg1="${r.resource_type_id}">\u2715</button>
      </div>`;
    });
    html += `</div>`;
  }
  // Add resource dropdown
  const usedTypes = (lead.resources || []).map(r => r.resource_type_id);
  const availableTypes = (_leadsConfig.resourceTypes || []).filter(rt => !usedTypes.includes(rt.id));
  if (availableTypes.length > 0) {
    html += `<select id="addResourceSelect" style="margin-top:8px"><option value="">+ Add resource...</option>`;
    availableTypes.forEach(rt => { html += `<option value="${rt.id}">${esc(rt.name)}</option>`; });
    html += `</select>`;
  }
  // Staffing check button
  if (lead.resources && lead.resources.length > 0) {
    html += `<button class="btn btn--sm" style="margin-top:8px" data-action="checkDealReadiness" data-arg0="${lead.id}">&#128101; Check Staffing</button>`;
    html += `<div id="staffingResult_${lead.id}" style="margin-top:8px"></div>`;
  }
  html += `</div>`;

  // Notes — Phase 12.3: auto-resize during typing as well as on initial render
  html += `<div class="lead-detail__section"><h3>Notes</h3>
    <textarea rows="4" style="width:100%;resize:vertical" onchange="updateLead('${lead.id}','notes',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(lead.notes||'')}</textarea>
  </div>`;

  // Activity log
  html += `<div class="lead-detail__section"><h3>Activity Log</h3>`;
  html += `<div class="lead-activity-add">
    <select id="activityTypeSelect"><option value="note">Note</option><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option></select>
    <input type="text" id="activityDescInput" placeholder="Description..." style="flex:1">
    <button class="btn btn--sm btn--primary" data-action="addLeadActivity" data-arg0="${lead.id}">Add</button>
  </div>`;
  if (lead.activities && lead.activities.length > 0) {
    html += `<div class="lead-activities-list">`;
    lead.activities.forEach(a => {
      const typeIcon = a.activity_type === 'email' ? '\u2709' : a.activity_type === 'call' ? '\u260E' : a.activity_type === 'meeting' ? '\uD83D\uDCC5' : a.activity_type === 'stage_change' ? '\u21C4' : a.activity_type === 'priority_change' ? '\u2B06' : '\uD83D\uDCDD';
      html += `<div class="lead-activity-row">
        <span class="lead-activity-icon">${typeIcon}</span>
        <div class="lead-activity-content">
          <div>${esc(a.description || '')}</div>
          <div class="lead-activity-meta">${esc(a.performed_by || '')} \u2022 ${new Date(a.created_at).toLocaleString()}</div>
        </div>
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="color:var(--text-muted);padding:8px 0">No activity yet</div>`;
  }
  html += `</div>`;

  // Delete button (admin only)
  if (isAdmin) {
    html += `<div class="lead-detail__section" style="border-top:1px solid var(--danger);padding-top:16px;margin-top:16px">
      <button class="btn btn--danger" data-action="deleteLead" data-arg0="${lead.id}">Delete Lead</button>
    </div>`;
  }

  html += `</div>`;
  panel.innerHTML = html;

  // Bind the add resource select without inline script
  const addResSelect = panel.querySelector('#addResourceSelect');
  if (addResSelect) {
    addResSelect.onchange = function() { if (this.value) addLeadResource(lead.id, this.value); };
  }
}

/** Mark a Won lead as complete — locks it from further edits */
async function completeLead(id) {
  if (!(await themedConfirm('Mark this lead as complete? It will be locked from further edits.', 'Mark Complete', 'Mark Complete'))) return;
  const resp = await authFetch(`/api/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed_at: new Date().toISOString() })
  });
  if (resp.ok) {
    toast('Lead marked complete');
    await refreshLeads();
    if (_leadsDetailId === id) openLeadDetail(id);
  } else {
    toast('Failed to mark lead complete', 'error');
  }
}

/** Reverse a previously-completed lead (admin only) */
async function uncompleteLead(id) {
  if (!(await themedConfirm('Unmark this lead as complete? It will become editable again.', 'Uncomplete', 'Uncomplete'))) return;
  const resp = await authFetch(`/api/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed_at: null })
  });
  if (resp.ok) {
    toast('Lead reopened');
    await refreshLeads();
    if (_leadsDetailId === id) openLeadDetail(id);
  } else {
    toast('Failed to reopen lead', 'error');
  }
}

/** Update a single field on a lead via PATCH and refresh the detail panel */
async function _updateLeadContact(contactId, field, value) {
  const body = {};
  body[field] = value;
  const resp = await authFetch(`/api/contacts/${contactId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (resp.ok) { await refreshLeads(); }
  else { toast('Failed to update contact', 'error'); }
}

async function updateLead(id, field, value) {
  // Block edits on a completed lead — admins must Uncomplete first.
  // Allow setting completed_at itself (for complete/uncomplete actions).
  if (field !== 'completed_at') {
    const existing = (_leadsData && _leadsData.leads) ? _leadsData.leads.find(l => l.id === id) : null;
    if (existing && existing.completed_at) {
      toast('This lead is complete — uncomplete it before editing', 'warning');
      if (_leadsDetailId === id) openLeadDetail(id);
      return;
    }
  }
  const body = {};
  body[field] = value;
  const resp = await authFetch(`/api/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (resp.ok) {
    await refreshLeads();
    if (_leadsDetailId === id) openLeadDetail(id);
  }
}

/** Add an activity note to a lead via the detail panel input */
async function addLeadActivity(leadId) {
  const typeEl = document.getElementById('activityTypeSelect');
  const descEl = document.getElementById('activityDescInput');
  if (!typeEl || !descEl || !descEl.value.trim()) return;

  await authFetch(`/api/leads/${leadId}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_type: typeEl.value, description: descEl.value.trim() })
  });
  openLeadDetail(leadId);
}

/** Add a resource requirement to a lead */
async function addLeadResource(leadId, resourceTypeId) {
  // Fetch current resources, add new one, PUT all
  const resp = await authFetch(`/api/leads/${leadId}`);
  if (!resp.ok) return;
  const lead = await resp.json();
  const resources = (lead.resources || []).map(r => ({ resource_type_id: r.resource_type_id, quantity: r.quantity, notes: r.notes }));
  resources.push({ resource_type_id: resourceTypeId, quantity: 1, notes: null });

  await authFetch(`/api/leads/${leadId}/resources`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resources })
  });
  openLeadDetail(leadId);
}

/** Remove a resource requirement from a lead */
async function removeLeadResource(leadId, resourceTypeId) {
  const resp = await authFetch(`/api/leads/${leadId}`);
  if (!resp.ok) return;
  const lead = await resp.json();
  const resources = (lead.resources || [])
    .filter(r => r.resource_type_id !== resourceTypeId)
    .map(r => ({ resource_type_id: r.resource_type_id, quantity: r.quantity, notes: r.notes }));

  await authFetch(`/api/leads/${leadId}/resources`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resources })
  });
  openLeadDetail(leadId);
}

/** Update the quantity of a resource requirement on a lead */
async function updateLeadResource(leadId, resourceTypeId, quantity) {
  const resp = await authFetch(`/api/leads/${leadId}`);
  if (!resp.ok) return;
  const lead = await resp.json();
  const resources = (lead.resources || []).map(r => ({
    resource_type_id: r.resource_type_id,
    quantity: r.resource_type_id === resourceTypeId ? quantity : r.quantity,
    notes: r.notes
  }));

  await authFetch(`/api/leads/${leadId}/resources`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resources })
  });
  // Refresh the detail panel to show updated resources
  if (_leadsDetailId === leadId) openLeadDetail(leadId);
}

/** Delete a lead permanently after confirmation */
async function deleteLead(id) {
  if (!(await themedConfirm('Delete this lead permanently?'))) return;
  const resp = await authFetch(`/api/leads/${id}`, { method: 'DELETE' });
  if (!resp.ok) { toast('Failed to delete lead', 'error'); return; }
  closeLeadDetail();
  await refreshLeads();
}

// ---- NEW LEAD MODAL ----
/** Open a modal dialog for creating a new lead entry */
async function openNewLeadModal() {
  const config = _leadsConfig;
  if (!config) return;

  // Load clients list
  let clientsList = [];
  try {
    const data = await apiCall('/api/clients');
    if (data) clientsList = data;
  } catch(e) { console.warn('[Leads] clients fetch error:', e.message || e); }

  const defaultStage = config.stages.find(s => !s.is_closed) || config.stages[0];

  let html = `<div class="modal-overlay open" id="newLeadModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-md)">
      <h2 style="margin-top:0">New Lead</h2>
      <div class="lead-detail__grid">
        <label class="field-required">Client</label>
        <select id="newLeadClient"><option value="">-- Select or type below --</option>`;
  clientsList.forEach(c => { html += `<option value="${c.id}">${esc(c.name)}</option>`; });
  html += `</select>
        <label>Or New Client</label><input type="text" id="newLeadNewClient" placeholder="New client name">
        <label class="field-required">Title</label><input type="text" id="newLeadTitle" placeholder="Deal title">
        <label>Work Type</label><select id="newLeadWorkType"><option value="">-- Select --</option>`;
  (config.fieldOptions.work_type || []).forEach(o => { html += `<option value="${esc(o.value)}">${esc(o.value)}</option>`; });
  html += `</select>
        <label>Stage</label><select id="newLeadStage">`;
  config.stages.forEach(s => { html += `<option value="${s.id}" ${s.id===defaultStage.id?'selected':''}>${esc(s.name)}</option>`; });
  html += `</select>
        <label>Currency</label><select id="newLeadCurrency">`;
  (config.fieldOptions.currency || []).forEach(o => { html += `<option value="${esc(o.value)}" ${o.value==='GBP'?'selected':''}>${esc(o.value)}</option>`; });
  html += `</select>
        <label>ROM</label><input type="number" id="newLeadRom" placeholder="e.g. 75000">
        <label>Deal Owner</label><select id="newLeadOwner"><option value="">-- Select --</option>`;
  (config.fieldOptions.deal_owner || []).forEach(o => { html += `<option value="${esc(o.value)}">${esc(o.value)}</option>`; });
  html += `</select>
        <label>Win %</label><input type="number" id="newLeadWinProb" min="0" max="100" placeholder="0-100">
        <label style="grid-column:1/-1;font-weight:600;margin-top:8px;border-top:1px solid var(--border-default);padding-top:8px">Primary Contact</label><span></span>
        <label>Name</label><input type="text" id="newLeadContactName" placeholder="Contact name">
        <label>Email</label><input type="email" id="newLeadContactEmail" placeholder="email@example.com">
        <label>Phone</label><input type="tel" id="newLeadContactPhone" placeholder="+44 ...">
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button class="btn" data-action="_actModalRemove" data-arg0="newLeadModal">Cancel</button>
        <button class="btn btn--primary" data-action="_actWithLoading" data-pass-el data-arg0="submitNewLead">Create Lead</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  _activateDynamicModal('newLeadModal');
}

/** Validate and submit the new lead form to the API */
async function submitNewLead() {
  const modal = document.getElementById('newLeadModal');
  clearFieldErrors(modal);
  const titleEl = document.getElementById('newLeadTitle');
  const title = titleEl.value.trim();
  if (!title) { showFieldError(titleEl, 'Title is required'); return; }

  let client_id = document.getElementById('newLeadClient')?.value || null;
  const newClientName = document.getElementById('newLeadNewClient')?.value?.trim() || '';

  if (!client_id && !newClientName) {
    const clientEl = document.getElementById('newLeadClient');
    showFieldError(clientEl, 'Select a client or enter a new client name');
    return;
  }

  // Create new client or find existing match
  if (!client_id && newClientName) {
    try {
      const existingClients = await apiCall('/api/clients');
      const match = (existingClients || []).find(c => c.name.toLowerCase() === newClientName.toLowerCase());
      if (match) {
        client_id = match.id;
      } else {
        const resp = await authFetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newClientName, practice_area: 'gaming' })
        });
        if (resp.ok) {
          const c = await resp.json();
          client_id = c.id;
        } else {
          const err = await resp.json().catch(() => ({}));
          toast('Failed to create client: ' + (err.error || 'Unknown error'), 'error');
          return;
        }
      }
    } catch(e) {
      toast('Failed to create client: ' + e.message, 'error');
      return;
    }
  }

  // Create contact if name provided
  const contactName = document.getElementById('newLeadContactName')?.value?.trim();
  const contactEmail = document.getElementById('newLeadContactEmail')?.value?.trim();
  const contactPhone = document.getElementById('newLeadContactPhone')?.value?.trim();
  let primary_contact_id = null;

  if (contactName && client_id) {
    try {
      const cResp = await authFetch(`/api/clients/${client_id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: contactName, email: contactEmail || '', phone: contactPhone || '', role: '' })
      });
      if (cResp.ok) {
        const contact = await cResp.json();
        primary_contact_id = contact.id;
      }
    } catch(e) { /* continue without contact */ }
  }

  const body = {
    title,
    client_id,
    primary_contact_id,
    stage_id: document.getElementById('newLeadStage').value,
    work_type: document.getElementById('newLeadWorkType').value || null,
    currency: document.getElementById('newLeadCurrency').value || 'GBP',
    rom_max: document.getElementById('newLeadRom').value ? parseFloat(document.getElementById('newLeadRom').value) : null,
    deal_owner: document.getElementById('newLeadOwner').value || null,
    win_probability: document.getElementById('newLeadWinProb').value ? parseInt(document.getElementById('newLeadWinProb').value) : null,
  };

  const resp = await authFetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (resp.ok) {
    document.getElementById('newLeadModal')?.remove();
    await refreshLeads();
  } else {
    const err = await resp.json().catch(() => ({}));
    toast('Failed to create lead: ' + (err.error || 'Unknown error'), 'error');
  }
}

// ---- LEADS SETTINGS (in Settings page) ----
/** Render the leads pipeline settings panel: stages, field options, resource types, FX rates */
async function renderLeadsSettings() {
  const config = await loadLeadsConfig();
  if (!config) return '<div>Failed to load leads config</div>';

  let html = `<div class="settings__group"><h2>Leads Configuration</h2>`;

  // Pipeline stages
  html += `<h3>Pipeline Stages</h3><div class="leads-config-list">`;
  config.stages.forEach(s => {
    html += `<div class="leads-config-row">
      <input type="color" value="${s.colour}" onchange="updateLeadStage('${s.id}','colour',this.value)" style="width:32px;height:28px;border:none;cursor:pointer">
      <input type="text" value="${esc(s.name)}" onchange="updateLeadStage('${s.id}','name',this.value)" style="flex:1">
      <label style="font-size:0.75rem"><input type="checkbox" ${s.is_closed?'checked':''} onchange="updateLeadStage('${s.id}','is_closed',this.checked)"> Closed</label>
      <label style="font-size:0.75rem"><input type="checkbox" ${s.is_won?'checked':''} onchange="updateLeadStage('${s.id}','is_won',this.checked)"> Won</label>
      <input type="number" value="${s.sort_order}" onchange="updateLeadStage('${s.id}','sort_order',parseInt(this.value))" style="width:50px" title="Sort order">
    </div>`;
  });
  html += `</div>`;
  html += `<div style="margin-top:8px"><input type="text" id="newStageName" placeholder="New stage name" style="width:200px">
    <button class="btn btn--sm" data-action="createLeadStage">Add Stage</button></div>`;

  // Field options sections
  const fieldGroups = [
    { field: 'work_type', label: 'Work Types' },
    { field: 'service_line', label: 'Service Lines' },
    { field: 'lead_source', label: 'Lead Sources' },
    { field: 'client_sector', label: 'Client Sectors' },
    { field: 'deal_owner', label: 'Deal Owners' },
    { field: 'currency', label: 'Currencies' },
  ];
  fieldGroups.forEach(g => {
    const opts = config.fieldOptions[g.field] || [];
    html += `<h3 style="margin-top:16px">${g.label}</h3><div class="leads-config-tags">`;
    opts.forEach(o => {
      html += `<span class="leads-config-tag">${esc(o.value)} <button class="leads-config-tag__x" data-action="deleteFieldOption" data-arg0="${o.id}">\u2715</button></span>`;
    });
    html += `</div>`;
    html += `<div style="margin-top:4px"><input type="text" id="newOpt_${g.field}" placeholder="Add ${g.label.toLowerCase()}" style="width:180px">
      <button class="btn btn--sm" data-action="createFieldOption" data-arg0="${g.field}">Add</button></div>`;
  });

  // Resource types
  html += `<h3 style="margin-top:16px">Resource Types</h3><div class="leads-config-tags">`;
  config.resourceTypes.forEach(rt => {
    html += `<span class="leads-config-tag">${esc(rt.name)} <button class="leads-config-tag__x" data-action="deleteResourceType" data-arg0="${rt.id}">\u2715</button></span>`;
  });
  html += `</div>`;
  html += `<div style="margin-top:4px"><input type="text" id="newResourceType" placeholder="Add resource type" style="width:180px">
    <button class="btn btn--sm" data-action="createResourceType">Add</button></div>`;

  // FX Rates
  html += `<h3 style="margin-top:16px">FX Rates (to GBP)</h3><div class="lead-detail__grid" style="max-width:300px">`;
  const fxResult = await authFetch('/api/settings');
  const allSettings = fxResult.ok ? await fxResult.json() : {};
  const fxRates = allSettings.fx_rates || { USD: 0.79, EUR: 0.86 };
  html += `<label>USD \u2192 GBP</label><input type="number" step="0.01" value="${fxRates.USD || 0.79}" onchange="updateFxRate('USD',parseFloat(this.value))">`;
  html += `<label>EUR \u2192 GBP</label><input type="number" step="0.01" value="${fxRates.EUR || 0.86}" onchange="updateFxRate('EUR',parseFloat(this.value))">`;
  html += `</div>`;

  html += `</div>`;
  return html;
}

/** Update a pipeline stage's name or sort order */
async function updateLeadStage(id, field, value) {
  const body = {}; body[field] = value;
  await authFetch(`/api/leads/stages/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  _leadsConfig = null;
  renderSettings(document.getElementById('mainContent'));
}

/** Create a new pipeline stage via prompt dialog */
async function createLeadStage() {
  const nameEl = document.getElementById('newStageName');
  if (!nameEl || !nameEl.value.trim()) return;
  await authFetch('/api/leads/stages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nameEl.value.trim(), sort_order: (_leadsConfig?.stages?.length || 0) + 1 }) });
  _leadsConfig = null;
  renderSettings(document.getElementById('mainContent'));
}

/** Create a new field option (sector/priority/source) via prompt dialog */
async function createFieldOption(fieldName) {
  const el = document.getElementById('newOpt_' + fieldName);
  if (!el || !el.value.trim()) return;
  await authFetch('/api/leads/field-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field_name: fieldName, value: el.value.trim() }) });
  _leadsConfig = null;
  renderSettings(document.getElementById('mainContent'));
}

/** Delete a field option after confirmation */
async function deleteFieldOption(id) {
  await authFetch(`/api/leads/field-options/${id}`, { method: 'DELETE' });
  _leadsConfig = null;
  renderSettings(document.getElementById('mainContent'));
}

/** Create a new resource type for lead staffing requirements */
async function createResourceType() {
  const el = document.getElementById('newResourceType');
  if (!el || !el.value.trim()) return;
  await authFetch('/api/leads/resource-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: el.value.trim() }) });
  _leadsConfig = null;
  renderSettings(document.getElementById('mainContent'));
}

/** Delete a resource type after confirmation */
async function deleteResourceType(id) {
  await authFetch(`/api/leads/resource-types/${id}`, { method: 'DELETE' });
  _leadsConfig = null;
  renderSettings(document.getElementById('mainContent'));
}

/** Update a stored FX rate for currency conversion in lead valuations */
async function updateFxRate(currency, rate) {
  const fxResp = await authFetch('/api/settings');
  const allSettings = fxResp.ok ? await fxResp.json() : {};
  const fxRates = allSettings.fx_rates || { USD: 0.79, EUR: 0.86 };
  fxRates[currency] = rate;
  await authFetch('/api/settings/fx_rates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: fxRates }) });
}

// ----- SETTINGS VIEW -----
