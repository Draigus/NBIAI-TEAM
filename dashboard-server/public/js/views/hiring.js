// ==================== HIRING ====================
// Extracted from nbi_project_dashboard.html (lines 10561-11326)
// Hiring pipeline: Kanban board with drag-and-drop stage progression,
// candidate detail panel with per-stage assignees, CV upload/download,
// and Glen's 5-stage hiring process (sourcing → interviews → offer →
// onboarding → hired). Archived cards are greyed with a green tick.

import { registerView } from '../core/router.js';

// ===== MODULE STATE =====
// Exposed on window because sidebar badge (line 915) and leads client summary
// (line 9252) read _candidatesData directly.
let _candidatesData = [];
let _hiringPositionsData = [];
window._candidatesData = _candidatesData;

// Glen's 5-stage hiring process (bug b7a2f97f, migration 024). Linear order.
const HIRING_STAGES = [
  'sourcing',
  'interviews',
  'offer',
  'onboarding',
  'hired',
];
const HIRING_STAGE_LABELS = {
  sourcing:   'Sourcing',
  interviews: 'Interviews',
  offer:      'Offer',
  onboarding: 'Onboarding',
  hired:      'Hired',
};

// ===== _act* WRAPPERS (moved from delegated action section) =====
function _actSetHiringFilterClient(id) { window._hiringFilterClient = id; switchView('hiring'); }
window._actSetHiringFilterClient = _actSetHiringFilterClient;

function _actSetHiringViewMode(v) { window._hiringViewMode = v; renderContent(); }
window._actSetHiringViewMode = _actSetHiringViewMode;

function _actOpenCandidateDetailIfNotDrag(id) { if (!window._hiringDragActive) openCandidateDetail(id); }
window._actOpenCandidateDetailIfNotDrag = _actOpenCandidateDetailIfNotDrag;

// ===== STAGE HELPERS =====

function hiringStageIndex(stage) {
  const i = HIRING_STAGES.indexOf(stage);
  return i < 0 ? 0 : i;
}

function hiringNextStage(stage) {
  const i = hiringStageIndex(stage);
  return i >= HIRING_STAGES.length - 1 ? null : HIRING_STAGES[i + 1];
}

function hiringPrevStage(stage) {
  const i = hiringStageIndex(stage);
  return i <= 0 ? null : HIRING_STAGES[i - 1];
}

// ===== DATA LOADING =====

async function loadCandidates() {
  try {
    const data = await apiCall('/api/candidates');
    if (Array.isArray(data)) { _candidatesData = data; window._candidatesData = _candidatesData; }
  } catch (e) { if (window._nbiDebug) console.error('Failed to load candidates:', e); }
}
window.loadCandidates = loadCandidates;

async function loadHiringPositions() {
  try {
    const data = await apiCall('/api/hiring-positions');
    if (Array.isArray(data)) _hiringPositionsData = data;
  } catch (e) { if (window._nbiDebug) console.error('Failed to load hiring positions:', e); }
}
window.loadHiringPositions = loadHiringPositions;

// ===== CARD RENDERER =====

function renderHiringCard(c, draggable) {
  const due = c.due_date ? new Date(c.due_date) : null;
  const isArchived = !!c.archived_at;
  const isLate = due && due < new Date() && c.stage !== 'hired' && !isArchived;
  const dueText = due ? due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  const clientChip = c.client_name ? `<span style="color:var(--text-muted);font-size:0.7rem">${esc(c.client_name)}</span>` : '';
  const header = c.name && c.name.trim() ? c.name : (c.role || 'Unnamed candidate');
  const subheader = c.name && c.name.trim() && c.role ? c.role : '';
  const stageAssignees = (c.stage_assignees && typeof c.stage_assignees === 'object') ? c.stage_assignees : {};
  const currentStageAssignees = Array.isArray(stageAssignees[c.stage]) ? stageAssignees[c.stage] : [];
  const unassigned = !isArchived && currentStageAssignees.length === 0;
  const warnMarker = unassigned ? '<span style="position:absolute;top:4px;right:4px;color:var(--danger);font-size:0.8rem" title="No assignee on the current stage">&#9888;</span>' : '';
  const archivedMarker = (isArchived || c.stage === 'hired') ? '<span style="position:absolute;bottom:4px;left:4px;color:var(--success);font-size:0.9rem;font-weight:bold" title="Hired">&#10003;</span>' : '';
  const archivedStyle = isArchived ? 'opacity:0.55;filter:grayscale(0.4);' : '';
  const dragAttrs = draggable && !isArchived
    ? ` draggable="true" ondragstart="onHiringCardDragStart(event, '${c.id}')" ondragend="onHiringCardDragEnd(event)"`
    : '';
  return `<div class="hiring-card" data-candidate-id="${c.id}" style="position:relative;${archivedStyle}"${dragAttrs} data-action="_actOpenCandidateDetailIfNotDrag" data-arg0="${c.id}" tabindex="0" role="button"
              aria-label="${esc(header)}${subheader ? ', ' + esc(subheader) : ''}${c.client_name ? ', ' + esc(c.client_name) : ''}, stage ${esc(HIRING_STAGE_LABELS[c.stage] || c.stage)}${unassigned ? ', no assignee' : ''}${isArchived ? ', archived' : ''}"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCandidateDetail('${c.id}')}">
    ${warnMarker}${archivedMarker}
    <div class="hiring-card__name" ${c.stage === 'hired' ? 'style="text-decoration:line-through"' : ''}>${esc(header)}</div>
    ${subheader ? `<div class="hiring-card__role">${esc(subheader)}</div>` : ''}
    <div class="hiring-card__meta">
      ${clientChip || `<span class="${isLate ? 'hiring-card__due--late' : ''}">${dueText || '\u2014'}</span>`}
      <span class="hiring-stage-badge hiring-stage-badge--${c.stage}" aria-hidden="true">${HIRING_STAGE_LABELS[c.stage] || c.stage}</span>
    </div>
  </div>`;
}

// ===== KANBAN DRAG-AND-DROP =====

function onHiringCardDragStart(ev, candidateId) {
  if (!ev.dataTransfer) return;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', candidateId);
  ev.currentTarget.classList.add('dragging');
  window._hiringDragActive = true;
}
window.onHiringCardDragStart = onHiringCardDragStart;

function onHiringCardDragEnd(ev) {
  ev.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.hiring-lane.drag-over').forEach(el => el.classList.remove('drag-over'));
  setTimeout(() => { window._hiringDragActive = false; }, 50);
}
window.onHiringCardDragEnd = onHiringCardDragEnd;

function onHiringLaneDragOver(ev) {
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  const lane = ev.currentTarget.closest('.hiring-lane');
  if (lane) lane.classList.add('drag-over');
}
window.onHiringLaneDragOver = onHiringLaneDragOver;

function onHiringLaneDragLeave(ev) {
  const lane = ev.currentTarget.closest('.hiring-lane');
  if (!lane) return;
  const related = ev.relatedTarget;
  if (!related || !lane.contains(related)) lane.classList.remove('drag-over');
}
window.onHiringLaneDragLeave = onHiringLaneDragLeave;

async function onHiringLaneDrop(ev, newStage) {
  ev.preventDefault();
  const lane = ev.currentTarget.closest('.hiring-lane');
  if (lane) lane.classList.remove('drag-over');
  const candidateId = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '';
  if (!candidateId) return;
  const candidate = (_candidatesData || []).find(c => c.id === candidateId);
  if (!candidate) { toast('Candidate not found', 'error'); return; }

  const body = ev.currentTarget;
  const cards = [...body.querySelectorAll('.hiring-card:not(.dragging)')];
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = ev.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const dropIdx = afterCard ? cards.indexOf(afterCard) : cards.length;

  const patch = { position: dropIdx };
  if (candidate.stage !== newStage) patch.stage = newStage;

  try {
    const res = await authFetch(`/api/candidates/${candidateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast('Failed to move candidate', 'error');
      return;
    }
    if (typeof loadCandidates === 'function') {
      await loadCandidates();
    }
    renderContent();
  } catch (e) {
    if (window._nbiDebug) console.error('Hiring drop failed', e);
    toast('Failed to move candidate', 'error');
  }
}
window.onHiringLaneDrop = onHiringLaneDrop;

// ===== MAIN VIEW RENDERER =====

function renderHiringView(container) {
  if (!window._hiringLoaded) {
    container.innerHTML = '<div class="hiring" style="padding:24px"><div class="skeleton skeleton-card"></div>' +
      Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading hiring data</span></div>';
    Promise.all([loadCandidates(), loadHiringPositions()]).then(() => {
      window._hiringLoaded = true;
      if (currentView === 'hiring') renderContent();
    });
    return;
  }

  const candidates = _candidatesData || [];
  const positions = _hiringPositionsData || [];
  const isAdmin = _currentUser && _currentUser.role === 'admin';

  let filtered = [...candidates];
  if (window._hiringFilterClient) filtered = filtered.filter(c => c.client_id === window._hiringFilterClient);
  if (window._hiringFilterStage) filtered = filtered.filter(c => c.stage === window._hiringFilterStage);
  const showArchived = !!window._hiringShowArchived;
  if (!showArchived) {
    filtered = filtered.filter(c => !c.archived_at);
  } else {
    filtered = filtered.sort((a, b) => {
      const aArch = a.archived_at ? 1 : 0;
      const bArch = b.archived_at ? 1 : 0;
      return aArch - bArch;
    });
  }

  const clientOptions = getContractedClientRecords();
  const viewMode = window._hiringViewMode || 'kanban';

  let html = '<div class="hiring">';
  html += `<div class="hiring__header">
    <h2 style="font-size:1.1rem;font-weight:600;margin:0">Hiring</h2>
    <div style="display:flex;gap:8px;align-items:center">
      <div class="hiring-view-toggle" role="tablist" aria-label="Hiring view mode">
        <button type="button" class="${viewMode==='kanban'?'active':''}" role="tab" aria-selected="${viewMode==='kanban'}" data-action="_actSetHiringViewMode" data-arg0="kanban">Kanban</button>
        <button type="button" class="${viewMode==='client'?'active':''}" role="tab" aria-selected="${viewMode==='client'}" data-action="_actSetHiringViewMode" data-arg0="client">By Client</button>
      </div>
      <button class="btn btn--primary" data-action="openCreateCandidateModal">+ Create Candidate Card</button>
    </div>
  </div>`;

  html += `<div class="hiring__filters">
    <select class="leads-select" onchange="window._hiringFilterClient=this.value||null;renderContent()">
      <option value="">All Clients</option>
      ${clientOptions.map(c => `<option value="${c.id}" ${window._hiringFilterClient===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
    </select>
    <select class="leads-select" onchange="window._hiringFilterStage=this.value||null;renderContent()">
      <option value="">All Stages</option>
      ${HIRING_STAGES.map(s => `<option value="${s}" ${window._hiringFilterStage===s?'selected':''}>${HIRING_STAGE_LABELS[s]}</option>`).join('')}
    </select>
    <label style="display:flex;align-items:center;gap:4px;font-size:0.75rem;color:var(--text-muted);cursor:pointer;user-select:none"><input type="checkbox" ${showArchived ? 'checked' : ''} onchange="window._hiringShowArchived=this.checked;renderContent()" style="accent-color:var(--accent)"> Show archived</label>
    <span style="font-size:0.75rem;color:var(--text-muted)">${filtered.length} of ${candidates.length} candidates</span>
  </div>`;

  if (filtered.length === 0) {
    html += `<div style="padding:var(--space-xl);text-align:center;color:var(--text-muted)">No candidates yet. Click "Create Candidate Card" to add one.</div>`;
  } else if (viewMode === 'kanban') {
    html += `<div class="hiring-kanban" role="list" aria-label="Hiring pipeline">`;
    HIRING_STAGES.forEach(stage => {
      const stageCandidates = filtered.filter(c => c.stage === stage)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      html += `<section class="hiring-lane" data-stage="${stage}" role="listitem" aria-label="${esc(HIRING_STAGE_LABELS[stage])} lane, ${stageCandidates.length} candidates">
        <div class="hiring-lane__header hiring-lane__header--${stage}">
          <span>${esc(HIRING_STAGE_LABELS[stage] || stage)}</span>
          <span class="hiring-lane__count">${stageCandidates.length}</span>
        </div>
        <div class="hiring-lane__body"
             ondragover="onHiringLaneDragOver(event)"
             ondragleave="onHiringLaneDragLeave(event)"
             ondrop="onHiringLaneDrop(event, '${stage}')">`;
      if (stageCandidates.length === 0) {
        html += `<div class="hiring-lane__empty">Drop candidate here</div>`;
      } else {
        stageCandidates.forEach(c => { html += renderHiringCard(c, true); });
      }
      html += `</div></section>`;
    });
    html += `</div>`;
  } else {
    const groups = {};
    filtered.forEach(c => {
      const key = c.client_id || '__unassigned__';
      const label = c.client_name || 'Unassigned';
      if (!groups[key]) groups[key] = { label, items: [] };
      groups[key].items.push(c);
    });
    const groupKeys = Object.keys(groups).sort((a, b) => groups[a].label.localeCompare(groups[b].label));
    groupKeys.forEach(k => {
      const g = groups[k];
      html += `<div class="hiring-client-group">
        <div class="hiring-client-group__header">${esc(g.label)} <span style="color:var(--text-muted);font-weight:400;font-size:0.82rem">(${g.items.length})</span></div>
        <div class="hiring-grid">`;
      g.items.forEach(c => { html += renderHiringCard(c); });
      html += `</div></div>`;
    });
  }

  html += '</div>';
  container.innerHTML = html;
}

// ===== CREATE CANDIDATE MODAL =====

async function openCreateCandidateModal() {
  let clientList = getContractedClientRecords();
  if (clientList.length === 0) {
    try {
      const data = await apiCall('/api/clients');
      if (Array.isArray(data)) {
        data.forEach(c => { if (c && c.name) _apiClientsCache[c.name] = c; });
      }
      clientList = getContractedClientRecords();
    } catch (e) { /* non-fatal */ }
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'ccModalTitle');
  overlay.id = 'createCandidateOverlay';
  overlay.innerHTML = `
    <div class="modal" style="min-width:360px;max-width:480px">
      <div class="modal__title" id="ccModalTitle">Create Candidate Card</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <label style="font-size:0.78rem;color:var(--text-muted)">Name *
          <input type="text" id="ccName" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px" autofocus></label>
        <label style="font-size:0.78rem;color:var(--text-muted)">Client
          <select id="ccClient" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">
            <option value="">— None —</option>
            ${clientList.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
          </select></label>
        <label style="font-size:0.78rem;color:var(--text-muted)">Role
          <input type="text" id="ccRole" placeholder="e.g. Senior Backend Engineer" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"></label>
        <label style="font-size:0.78rem;color:var(--text-muted)">Due date
          <input type="date" id="ccDue" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"></label>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
        <button class="btn" id="ccCancel">Cancel</button>
        <button class="btn btn--primary" id="ccCreate">Create</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  setTimeout(() => { const firstInput = overlay.querySelector('#ccName'); if (firstInput) firstInput.focus(); }, 0);

  const escHandler = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  document.addEventListener('keydown', escHandler);

  const close = () => {
    document.removeEventListener('keydown', escHandler);
    try { document.body.removeChild(overlay); } catch (e) {}
  };
  overlay.querySelector('#ccCancel').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.querySelector('#ccCreate').onclick = async () => {
    const name = overlay.querySelector('#ccName').value.trim();
    const role = overlay.querySelector('#ccRole').value.trim();
    if (!name && !role) { toast('Name or role is required', 'error'); return; }
    if (!role) {
      const ok = await themedConfirm('No role on this candidate card — are you sure?\nThe role is normally what you fill first and it anchors the whole pipeline.', 'No role set', 'Create anyway');
      if (!ok) return;
    }
    const body = {
      name: name || '(vacant)',
      client_id: overlay.querySelector('#ccClient').value || null,
      role: role || null,
      due_date: overlay.querySelector('#ccDue').value || null,
      stage: 'sourcing'
    };
    const resp = await authFetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (resp.ok) {
      const created = await resp.json();
      toast('Candidate created');
      close();
      await loadCandidates();
      if (currentView === 'hiring') renderContent();
      renderSidebar();
      openCandidateDetail(created.id);
    } else {
      const err = await resp.json().catch(() => ({}));
      toast(err.error || 'Failed to create candidate', 'error');
    }
  };
}
window.openCreateCandidateModal = openCreateCandidateModal;

// ===== CANDIDATE DETAIL PANEL =====

async function openCandidateDetail(id) {
  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (!overlay || !panel) return;

  const c = await apiCall('/api/candidates/' + id);
  if (!c) return;

  let interviewConfig = null;
  if (c.stage === 'interviews' || c.stage === 'offer' || c.stage === 'hired') {
    const configs = await apiCall(`/api/interview-configs?candidate_id=${c.id}`);
    if (configs && configs.length > 0) interviewConfig = configs[0];
  }

  const isAdmin = _currentUser && _currentUser.role === 'admin';
  let clientList = getContractedClientRecords();
  if (c.client_id && !clientList.some(cl => cl.id === c.client_id)) {
    const existing = Object.values(_apiClientsCache || {}).find(cl => cl && cl.id === c.client_id);
    if (existing) clientList = [...clientList, existing].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  const positions = _hiringPositionsData || [];

  const isArchived = !!c.archived_at;
  const header = c.name && c.name.trim() ? c.name : (c.role || 'Unnamed candidate');
  const subheader = c.name && c.name.trim() && c.role ? c.role : '';
  const stageAssignees = (c.stage_assignees && typeof c.stage_assignees === 'object') ? c.stage_assignees : {};
  const currentStageAssignees = Array.isArray(stageAssignees[c.stage]) ? stageAssignees[c.stage] : [];
  const unassigned = !isArchived && currentStageAssignees.length === 0;
  const prev = hiringPrevStage(c.stage);
  const next = hiringNextStage(c.stage);
  const disabledStyle = isArchived ? 'pointer-events:none;opacity:0.55' : '';

  let stageSubHtml = '';
  if (c.stage === 'offer') {
    stageSubHtml = `<div class="candidate-detail__field"><label>Start date</label><input type="date" id="cdStartDate" value="${c.start_date ? String(c.start_date).slice(0,10) : ''}" onchange="updateCandidateField('${c.id}','start_date',this.value||null)"></div>`;
  } else if (c.stage === 'onboarding') {
    const links = Array.isArray(c.onboarding_links) ? c.onboarding_links : [];
    const linksHtml = links.length > 0
      ? links.map((l, i) => `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:4px 0"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.type === 'file' ? '&#128196;' : '&#128279;'} <a href="${safeUrl(l.value)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-text)">${esc(l.value)}</a></span><button class="btn btn--sm btn--ghost" data-action="removeOnboardingLink" data-arg0="${c.id}" data-arg1="${i}" title="Remove">&times;</button></div>`).join('')
      : '<div style="color:var(--text-muted);font-size:0.78rem;padding:4px 0">No onboarding docs yet</div>';
    stageSubHtml = `<div class="candidate-detail__field"><label>Onboarding documents</label>${linksHtml}<div style="display:flex;gap:6px;margin-top:6px"><input type="text" id="cdOnboardLink" placeholder="Paste a link (Google Doc, Drive, etc.)" style="flex:1"><button class="btn btn--sm" data-action="addOnboardingLink" data-arg0="${c.id}">Add link</button></div></div>`;
  } else if (c.stage === 'interviews') {
    let interviewBtnLabel = 'Configure Interview';
    let interviewBtnAction = `openInterviewConfig('${c.id}', '${c.client_id || ''}', '${c.position_id || ''}')`;
    if (interviewConfig && interviewConfig.status === 'active') {
      interviewBtnLabel = 'View Interview';
      interviewBtnAction = `openInterviewResults('${interviewConfig.id}')`;
    } else if (interviewConfig && interviewConfig.status === 'completed') {
      interviewBtnLabel = 'Interview Results';
      interviewBtnAction = `openInterviewResults('${interviewConfig.id}')`;
    }
    stageSubHtml = `<div class="candidate-detail__field"><label>Interview</label>
      <button class="btn btn--primary" onclick="${interviewBtnAction}">${interviewBtnLabel}</button>
    </div>`;
  }

  panel.innerHTML = `
    <div class="candidate-detail__header">
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:var(--space-sm);align-items:center;margin-bottom:6px;flex-wrap:wrap">
          <span class="hiring-stage-badge hiring-stage-badge--${c.stage}">${HIRING_STAGE_LABELS[c.stage] || c.stage}</span>
          ${c.client_name ? `<span style="font-size:0.78rem;color:var(--text-muted)">${esc(c.client_name)}</span>` : ''}
          ${isArchived ? '<span style="background:var(--success);color:#fff;padding:2px 8px;border-radius:10px;font-size:0.65rem;font-weight:700">ARCHIVED &#10003;</span>' : ''}
        </div>
        <h3 style="font-size:1rem;font-weight:600;margin:0;word-break:break-word">${esc(header)}</h3>
        ${subheader ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${esc(subheader)}</div>` : ''}
      </div>
      <button class="btn btn--ghost btn--sm" data-action="closeCandidateDetail" aria-label="Close" style="flex-shrink:0">&times;</button>
    </div>
    <div class="candidate-detail__body">

      <!-- TOP THIRD: candidate profile fields -->
      <div class="candidate-detail__section" style="${disabledStyle}">
        <div class="candidate-detail__section-title">Profile</div>
        <div class="candidate-detail__field"><label>Name</label><input type="text" id="cdName" value="${esc(c.name || '')}" placeholder="Leave blank to show role as header" onchange="updateCandidateField('${c.id}','name',this.value)"></div>
        <div class="candidate-detail__field"><label>Role</label><input type="text" id="cdRole" value="${esc(c.role || '')}" placeholder="e.g. Senior Backend Engineer" onchange="updateCandidateField('${c.id}','role',this.value)"></div>
        <div class="candidate-detail__field"><label>LinkedIn URL</label><input type="url" id="cdLinkedIn" value="${esc(c.linkedin_url || '')}" placeholder="https://linkedin.com/in/..." onchange="updateCandidateField('${c.id}','linkedin_url',this.value)"></div>
        <div class="candidate-detail__field"><label>Due date</label><input type="date" id="cdDue" value="${c.due_date ? c.due_date.slice(0,10) : ''}" onchange="updateCandidateField('${c.id}','due_date',this.value||null)"></div>
        <div class="candidate-detail__field"><label>Client</label><select id="cdClient" onchange="updateCandidateField('${c.id}','client_id',this.value||null)"><option value="">— None —</option>${clientList.map(cl => `<option value="${cl.id}" ${c.client_id===cl.id?'selected':''}>${esc(cl.name)}</option>`).join('')}</select></div>
        <div class="candidate-detail__field">
          <label>CV</label>
          <div class="candidate-cv">
            ${c.cv_filename ? `<span class="candidate-cv__name">${esc(c.cv_filename)}</span><button class="btn btn--sm" data-action="downloadCandidateCV" data-arg0="${c.id}">Download</button>` : '<span style="color:var(--text-muted);font-size:0.78rem">No CV uploaded</span>'}
            <input type="file" id="cdCvFile" style="display:none" onchange="uploadCandidateCV('${c.id}',this)">
            <button class="btn btn--sm" data-action="_actModalClick" data-arg0="cdCvFile">${c.cv_filename ? 'Replace' : 'Upload'}</button>
          </div>
        </div>
        ${positions.length > 0 ? `<div class="candidate-detail__field"><label>Hiring Position (template)</label><select id="cdPosition" onchange="updateCandidateField('${c.id}','position_id',this.value||null)"><option value="">— None —</option>${positions.filter(p => !c.client_id || p.client_id === c.client_id).map(p => `<option value="${p.id}" ${c.position_id===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}</select></div>` : ''}
      </div>

      <!-- STAGE NAVIGATION -->
      <div class="candidate-detail__section" style="${disabledStyle}">
        <div class="candidate-detail__section-title">Stage</div>
        <div style="display:flex;align-items:center;gap:6px">
          <button class="btn btn--sm" style="min-width:36px;background:var(--bg-surface);color:${prev ? 'var(--text-secondary)' : 'var(--text-faint)'};border:1px solid var(--border-default)" ${prev ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${prev}" title="Previous: ${HIRING_STAGE_LABELS[prev]}"` : 'disabled'}>&larr;</button>
          <select id="cdStageSel" onchange="hiringStageSelectChange('${c.id}',this.value)" style="flex:1;font-weight:600;text-align:center;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
            ${HIRING_STAGES.map(s => `<option value="${s}" ${c.stage===s?'selected':''}>${HIRING_STAGE_LABELS[s]}</option>`).join('')}
          </select>
          <button class="btn btn--sm" style="min-width:36px;background:color-mix(in srgb, var(--success) 30%, var(--bg-surface));color:#fff;border:1px solid var(--success)" ${next ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${next}" title="Next: ${HIRING_STAGE_LABELS[next]}"` : `data-action="hiringConfirmHire" data-arg0="${c.id}" title="Confirm Hired"`}>&rarr;</button>
        </div>
        ${unassigned ? '<div style="color:var(--danger);font-size:0.72rem;margin-top:6px">&#9888; No assignee on this stage</div>' : ''}
      </div>

      <!-- PER-STAGE ASSIGNEE FIELD -->
      <div class="candidate-detail__section" style="${disabledStyle}">
        <div class="candidate-detail__section-title">Assigned to this stage</div>
        <div id="cdStageAssignees" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
          ${currentStageAssignees.map((name, i) => `<span style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:10px;padding:2px 8px;font-size:0.72rem;display:inline-flex;align-items:center;gap:4px">${esc(name)} <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.75rem" data-action="hiringRemoveStageAssignee" data-arg0="${c.id}" data-arg1="${esc(c.stage)}" data-arg2="${i}">&times;</button></span>`).join('')}
          ${currentStageAssignees.length === 0 ? '<span style="color:var(--danger);font-size:0.72rem;padding:2px 0">Unassigned — add someone</span>' : ''}
        </div>
        <div style="display:flex;gap:4px"><select id="cdStageAssigneeAdd" style="flex:1;font-size:0.78rem;padding:3px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><option value="">+ Add assignee…</option>${(_cachedTeamMembers || []).map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select><button class="btn btn--sm" data-action="hiringAddStageAssignee" data-arg0="${c.id}" data-arg1="${esc(c.stage)}">Add</button></div>
      </div>

      <!-- STAGE-SPECIFIC FIELD -->
      ${stageSubHtml ? `<div class="candidate-detail__section" style="${disabledStyle}"><div class="candidate-detail__section-title">${esc(HIRING_STAGE_LABELS[c.stage])} details</div>${stageSubHtml}</div>` : ''}

      <div class="candidate-detail__section" style="${disabledStyle}">
        <div class="candidate-detail__section-title">Notes</div>
        <div class="candidate-detail__field"><textarea id="cdNotes" rows="3" onchange="updateCandidateField('${c.id}','notes',this.value)">${esc(c.notes || '')}</textarea></div>
      </div>

      <!-- BOTTOM ACTIONS -->
      <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-lg);padding-top:var(--space-md);border-top:1px solid var(--border-default);flex-wrap:wrap">
        ${isArchived
          ? `<button class="btn btn--sm" style="background:var(--accent);color:#fff" data-action="hiringReopen" data-arg0="${c.id}">Reopen Card</button>`
          : `<button class="btn btn--sm" style="background:transparent;color:var(--danger);border:1px solid var(--danger)" data-action="hiringClearCandidate" data-arg0="${c.id}" title="Void candidate fields but keep the role">Clear Candidate</button>`
        }
        ${isAdmin ? `<button class="btn btn--danger btn--sm" data-action="deleteCandidate" data-arg0="${c.id}">Delete</button>` : ''}
      </div>
    </div>`;

  overlay.style.display = 'block';
  overlay.onclick = (e) => { if (e.target === overlay) closeCandidateDetail(); };
  panel.classList.add('open');
  window._candidateDetailPreviousFocus = document.activeElement;
  if (typeof _trapFocus === 'function') _trapFocus(panel);
  window._candidateDetailEscHandler = (e) => { if (e.key === 'Escape') closeCandidateDetail(); };
  document.addEventListener('keydown', window._candidateDetailEscHandler);
}
window.openCandidateDetail = openCandidateDetail;

function closeCandidateDetail() {
  if (window._candidateDetailPreviousFocus) { window._candidateDetailPreviousFocus.focus(); window._candidateDetailPreviousFocus = null; }
  if (window._candidateDetailEscHandler) { document.removeEventListener('keydown', window._candidateDetailEscHandler); window._candidateDetailEscHandler = null; }
  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
}
window.closeCandidateDetail = closeCandidateDetail;

// ===== CANDIDATE FIELD UPDATE =====

async function updateCandidateField(id, field, value) {
  const body = {};
  body[field] = value === '' ? null : value;
  const resp = await authFetch('/api/candidates/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (resp.ok) {
    await loadCandidates();
    if (currentView === 'hiring') renderContent();
    renderSidebar();
    const panel = document.getElementById('candidateDetailPanel');
    if (panel && panel.classList.contains('open')) openCandidateDetail(id);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to update', 'error');
  }
}
window.updateCandidateField = updateCandidateField;

// ===== GLEN SPEC HELPERS (bug b7a2f97f) =====

async function hiringStageSelectChange(id, newStage) {
  if (newStage === 'hired') {
    const c = _candidatesData.find(x => x.id === id);
    if (!c || c.stage === 'hired') return;
    await hiringConfirmHire(id);
    return;
  }
  await updateCandidateField(id, 'stage', newStage);
}
window.hiringStageSelectChange = hiringStageSelectChange;

async function hiringConfirmHire(id) {
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const prev = c.stage;
  const ok = await themedConfirm('Close Candidate Card?\nThis will mark the candidate as Hired and archive the card.', 'Close Candidate Card', 'Confirm');
  if (!ok) {
    if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
    return;
  }
  const resp = await authFetch('/api/candidates/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'hired', archived_at: new Date().toISOString() })
  });
  if (resp.ok) {
    toast('Candidate archived');
    await loadCandidates();
    if (currentView === 'hiring') renderContent();
    renderSidebar();
    if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
  } else {
    toast('Failed to archive', 'error');
  }
}
window.hiringConfirmHire = hiringConfirmHire;

async function hiringReopen(id) {
  const ok = await themedConfirm('Reopen this card?\nThe candidate will become editable again at their current stage.', 'Reopen Card', 'Reopen');
  if (!ok) return;
  const resp = await authFetch('/api/candidates/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived_at: null })
  });
  if (resp.ok) {
    toast('Card reopened');
    await loadCandidates();
    if (currentView === 'hiring') renderContent();
    if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
  } else {
    toast('Failed to reopen', 'error');
  }
}
window.hiringReopen = hiringReopen;

async function hiringClearCandidate(id) {
  const ok = await themedConfirm('Clear this candidate?\nName, LinkedIn and CV will be wiped so the slot can be reused. Role and client are kept.', 'Clear Candidate', 'Clear');
  if (!ok) return;
  const resp = await authFetch('/api/candidates/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '(vacant)', linkedin_url: null, cv_filename: null, stage: 'sourcing', stage_assignees: {} })
  });
  if (resp.ok) {
    toast('Candidate cleared');
    await loadCandidates();
    if (currentView === 'hiring') renderContent();
    if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
  } else {
    toast('Failed to clear', 'error');
  }
}
window.hiringClearCandidate = hiringClearCandidate;

async function hiringAddStageAssignee(id, stage) {
  const sel = document.getElementById('cdStageAssigneeAdd');
  if (!sel || !sel.value) return;
  const name = sel.value;
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const current = (c.stage_assignees && typeof c.stage_assignees === 'object') ? { ...c.stage_assignees } : {};
  const list = Array.isArray(current[stage]) ? [...current[stage]] : [];
  if (list.includes(name)) { toast('Already assigned', 'warning'); return; }
  list.push(name);
  current[stage] = list;
  await updateCandidateField(id, 'stage_assignees', current);
}
window.hiringAddStageAssignee = hiringAddStageAssignee;

async function hiringRemoveStageAssignee(id, stage, idx) {
  const fresh = await apiCall('/api/candidates/' + id);
  if (!fresh) return;
  const current = (fresh.stage_assignees && typeof fresh.stage_assignees === 'object') ? { ...fresh.stage_assignees } : {};
  const list = Array.isArray(current[stage]) ? [...current[stage]] : [];
  if (idx < 0 || idx >= list.length) return;
  list.splice(idx, 1);
  current[stage] = list;
  await updateCandidateField(id, 'stage_assignees', current);
}
window.hiringRemoveStageAssignee = hiringRemoveStageAssignee;

async function addOnboardingLink(id) {
  const input = document.getElementById('cdOnboardLink');
  if (!input || !input.value.trim()) return;
  const url = input.value.trim();
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const links = Array.isArray(c.onboarding_links) ? [...c.onboarding_links] : [];
  links.push({ type: 'link', value: url });
  await updateCandidateField(id, 'onboarding_links', links);
}
window.addOnboardingLink = addOnboardingLink;

async function removeOnboardingLink(id, idx) {
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const links = Array.isArray(c.onboarding_links) ? [...c.onboarding_links] : [];
  if (idx < 0 || idx >= links.length) return;
  links.splice(idx, 1);
  await updateCandidateField(id, 'onboarding_links', links);
}
window.removeOnboardingLink = removeOnboardingLink;

// ===== CV UPLOAD/DOWNLOAD =====

async function uploadCandidateCV(id, input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);
  const resp = await authFetch('/api/candidates/' + id + '/cv', { method: 'POST', body: formData });
  if (resp.ok) {
    toast('CV uploaded');
    await loadCandidates();
    if (currentView === 'hiring') renderContent();
    openCandidateDetail(id);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to upload CV', 'error');
  }
  input.value = '';
}
window.uploadCandidateCV = uploadCandidateCV;

async function downloadCandidateCV(id) {
  const resp = await authFetch('/api/candidates/' + id + '/cv');
  if (!resp.ok) { toast('Failed to download CV', 'error'); return; }
  const disp = resp.headers.get('Content-Disposition') || '';
  const m = disp.match(/filename="?([^"]+)"?/);
  const filename = m ? m[1] : 'cv';
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}
window.downloadCandidateCV = downloadCandidateCV;

async function deleteCandidate(id) {
  if (!(await themedConfirm('Delete this candidate permanently?'))) return;
  const resp = await authFetch('/api/candidates/' + id, { method: 'DELETE' });
  if (resp.ok) {
    toast('Candidate deleted');
    closeCandidateDetail();
    await loadCandidates();
    if (currentView === 'hiring') renderContent();
    renderSidebar();
  } else {
    toast('Failed to delete candidate', 'error');
  }
}
window.deleteCandidate = deleteCandidate;

// ===== INTERVIEW CONFIG (Question Picker + Interviewer Selection) =====

const INTERVIEW_CATEGORIES = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
const INTERVIEW_CATEGORY_LABELS = {
  culture: 'Culture', technical: 'Technical', collaboration: 'Collaboration',
  leadership: 'Leadership', depth: 'Depth',
};
const INTERVIEW_CATEGORY_COLOURS = {
  culture: '#f59e0b', technical: '#3b82f6', collaboration: '#10b981',
  leadership: '#8b5cf6', depth: '#ef4444',
};

async function openInterviewConfig(candidateId, clientId, positionId) {
  const panel = document.getElementById('candidateDetailPanel');
  if (!panel) return;

  // Show loading
  panel.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">Loading questions...</div>';

  let questions = [];
  let users = [];
  try {
    const [q, u] = await Promise.all([
      apiCall('/api/interview-questions' + (clientId ? `?client_id=${clientId}` : '')),
      apiCall('/api/users'),
    ]);
    if (Array.isArray(q)) questions = q;
    if (Array.isArray(u)) users = u.filter(usr => usr.is_active !== false && usr.role !== 'client');
  } catch (e) {
    panel.innerHTML = `<div style="padding:24px;color:var(--danger)">Failed to load data: ${esc(e.message || 'Unknown error')}</div>`;
    return;
  }

  const selectedIds = new Set();
  const selectedInterviewers = new Set();
  let activeTab = 'questions';
  let filterCategory = '';

  function render() {
    const filteredQuestions = filterCategory
      ? questions.filter(q => q.category === filterCategory)
      : questions;

    // Group by category
    const grouped = {};
    for (const cat of INTERVIEW_CATEGORIES) grouped[cat] = [];
    for (const q of filteredQuestions) {
      if (grouped[q.category]) grouped[q.category].push(q);
    }

    let html = `
      <div class="candidate-detail__header">
        <div style="flex:1;min-width:0">
          <h3 style="font-size:1rem;font-weight:600;margin:0">Configure Interview</h3>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${selectedIds.size} question${selectedIds.size !== 1 ? 's' : ''} selected &middot; ${selectedInterviewers.size} interviewer${selectedInterviewers.size !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn--ghost btn--sm" onclick="openCandidateDetail('${candidateId}')" aria-label="Back">&larr; Back</button>
      </div>
      <div style="display:flex;gap:0;border-bottom:1px solid var(--border-default);margin-bottom:12px">
        <button class="btn btn--sm" style="border-radius:0;border-bottom:2px solid ${activeTab === 'questions' ? 'var(--accent)' : 'transparent'};color:${activeTab === 'questions' ? 'var(--accent-text)' : 'var(--text-muted)'};font-weight:${activeTab === 'questions' ? '600' : '400'}" onclick="window._ivSetTab('questions')">Questions</button>
        <button class="btn btn--sm" style="border-radius:0;border-bottom:2px solid ${activeTab === 'interviewers' ? 'var(--accent)' : 'transparent'};color:${activeTab === 'interviewers' ? 'var(--accent-text)' : 'var(--text-muted)'};font-weight:${activeTab === 'interviewers' ? '600' : '400'}" onclick="window._ivSetTab('interviewers')">Interviewers</button>
      </div>`;

    if (activeTab === 'questions') {
      // Filter chips
      html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px">';
      html += `<button class="btn btn--sm" style="font-size:0.7rem;${!filterCategory ? 'background:var(--accent);color:#fff' : ''}" onclick="window._ivFilterCat('')">All</button>`;
      for (const cat of INTERVIEW_CATEGORIES) {
        const active = filterCategory === cat;
        html += `<button class="btn btn--sm" style="font-size:0.7rem;${active ? 'background:' + INTERVIEW_CATEGORY_COLOURS[cat] + ';color:#fff' : ''}" onclick="window._ivFilterCat('${cat}')">${INTERVIEW_CATEGORY_LABELS[cat]}</button>`;
      }
      html += '</div>';

      // Action buttons
      html += '<div style="display:flex;gap:6px;margin-bottom:12px">';
      html += `<button class="btn btn--sm" onclick="window._ivAddCustomQuestion()">+ Add Custom Question</button>`;
      html += `<button class="btn btn--sm" onclick="window._ivGenerateFromJD()" ${positionId ? '' : 'disabled title="No hiring position linked"'}>Generate from JD</button>`;
      html += '</div>';

      // Questions grouped by category
      for (const cat of INTERVIEW_CATEGORIES) {
        const catQs = grouped[cat];
        if (catQs.length === 0) continue;
        html += `<div style="margin-bottom:12px">
          <div style="font-size:0.72rem;font-weight:600;color:${INTERVIEW_CATEGORY_COLOURS[cat]};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">${INTERVIEW_CATEGORY_LABELS[cat]} (${catQs.length})</div>`;
        for (const q of catQs) {
          const checked = selectedIds.has(q.id) ? 'checked' : '';
          html += `<label style="display:flex;align-items:flex-start;gap:8px;padding:6px 4px;cursor:pointer;border-radius:var(--radius-sm);font-size:0.82rem;line-height:1.4" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'">
            <input type="checkbox" ${checked} onchange="window._ivToggleQ('${q.id}')" style="accent-color:var(--accent);margin-top:2px;flex-shrink:0">
            <span>${esc(q.question_text)}</span>
          </label>`;
        }
        html += '</div>';
      }

      if (questions.length === 0) {
        html += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">No questions available. Add custom questions or generate from a JD.</div>';
      }
    } else {
      // Interviewers tab
      html += '<div style="display:flex;flex-direction:column;gap:4px">';
      for (const u of users) {
        const checked = selectedInterviewers.has(u.id) ? 'checked' : '';
        html += `<label style="display:flex;align-items:center;gap:8px;padding:8px 4px;cursor:pointer;border-radius:var(--radius-sm);font-size:0.85rem" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'">
          <input type="checkbox" ${checked} onchange="window._ivToggleInterviewer('${u.id}')" style="accent-color:var(--accent)">
          <span style="flex:1">${esc(u.display_name || u.username || u.email)}</span>
          ${u.role === 'admin' ? '<span style="font-size:0.65rem;color:var(--text-muted);background:var(--bg-surface);padding:1px 6px;border-radius:8px">admin</span>' : ''}
        </label>`;
      }
      if (users.length === 0) {
        html += '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.82rem">No users available.</div>';
      }
      html += '</div>';
    }

    // Bottom actions
    const canSend = selectedIds.size > 0 && selectedInterviewers.size > 0;
    html += `<div style="display:flex;gap:var(--space-sm);margin-top:var(--space-lg);padding-top:var(--space-md);border-top:1px solid var(--border-default)">
      <button class="btn btn--primary" ${canSend ? '' : 'disabled'} onclick="window._ivSendInterviews()" style="flex:1">Send Interviews (${selectedIds.size}q &middot; ${selectedInterviewers.size}p)</button>
    </div>`;

    panel.innerHTML = html;
  }

  // Expose handlers on window for onclick
  window._ivSetTab = (tab) => { activeTab = tab; render(); };
  window._ivFilterCat = (cat) => { filterCategory = cat; render(); };
  window._ivToggleQ = (id) => { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); render(); };
  window._ivToggleInterviewer = (id) => { selectedInterviewers.has(id) ? selectedInterviewers.delete(id) : selectedInterviewers.add(id); render(); };

  window._ivAddCustomQuestion = async () => {
    const text = prompt('Enter your custom interview question:');
    if (!text || !text.trim()) return;
    const catSel = prompt('Category (culture, technical, collaboration, leadership, depth):', 'technical');
    if (!catSel || !INTERVIEW_CATEGORIES.includes(catSel.trim().toLowerCase())) {
      toast('Invalid category', 'error');
      return;
    }
    const disc = prompt('Discipline (e.g. engineering, design, production):', 'general');
    try {
      const created = await apiCall('/api/interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: text.trim(),
          category: catSel.trim().toLowerCase(),
          discipline: (disc || 'general').trim(),
          source: 'custom',
          client_id: clientId || null,
        }),
      });
      if (created && created.id) {
        questions.push(created);
        selectedIds.add(created.id);
        toast('Question added');
        render();
      }
    } catch (e) {
      toast('Failed to add question: ' + (e.message || ''), 'error');
    }
  };

  window._ivGenerateFromJD = async () => {
    if (!positionId) { toast('No hiring position linked', 'error'); return; }
    const disc = prompt('Discipline to generate questions for (e.g. engineering, design, production):', 'engineering');
    if (!disc || !disc.trim()) return;
    toast('Generating questions from JD...', 'info');
    try {
      const generated = await apiCall('/api/interview-questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_id: positionId,
          client_id: clientId || null,
          discipline: disc.trim(),
        }),
      });
      if (Array.isArray(generated)) {
        for (const q of generated) {
          questions.push(q);
          selectedIds.add(q.id);
        }
        toast(`Generated ${generated.length} questions`);
        render();
      }
    } catch (e) {
      toast('Failed to generate: ' + (e.message || ''), 'error');
    }
  };

  window._ivSendInterviews = async () => {
    if (selectedIds.size === 0 || selectedInterviewers.size === 0) return;
    const ok = await themedConfirm(
      `Send ${selectedIds.size} questions to ${selectedInterviewers.size} interviewer${selectedInterviewers.size !== 1 ? 's' : ''}?\nEach interviewer will receive an email with a link to their scorecard.`,
      'Send Interviews',
      'Send'
    );
    if (!ok) return;
    try {
      // Create config
      const result = await apiCall('/api/interview-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          position_id: positionId || null,
          question_ids: [...selectedIds],
          interviewer_ids: [...selectedInterviewers],
        }),
      });
      if (!result || !result.config) throw new Error('Failed to create config');
      // Activate it
      await apiCall(`/api/interview-configs/${result.config.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      toast('Interviews sent! Interviewers will receive an email.');
      openCandidateDetail(candidateId);
    } catch (e) {
      toast('Failed to send interviews: ' + (e.message || ''), 'error');
    }
  };

  render();
}
window.openInterviewConfig = openInterviewConfig;

// ===== INTERVIEW RESULTS (Aggregated Scores + Decision) =====

async function openInterviewResults(configId) {
  const panel = document.getElementById('candidateDetailPanel');
  if (!panel) return;

  panel.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">Loading results...</div>';

  let data;
  try {
    data = await apiCall(`/api/interview-results/${configId}`);
  } catch (e) {
    panel.innerHTML = `<div style="padding:24px;color:var(--danger)">Failed to load results: ${esc(e.message || 'Unknown error')}</div>`;
    return;
  }

  if (!data || !data.config) {
    panel.innerHTML = '<div style="padding:24px;color:var(--danger)">No results found.</div>';
    return;
  }

  const { config, questions, sessions, scores, decision, summary } = data;
  const candidateId = config.candidate_id;

  // Build a lookup: scores by session_id -> question_id
  const scoreMap = {};
  for (const sc of scores) {
    if (!scoreMap[sc.session_id]) scoreMap[sc.session_id] = {};
    scoreMap[sc.session_id][sc.question_id] = sc;
  }

  // Check if candidate is still in interviews stage
  let stageWarning = '';
  try {
    const cand = await apiCall('/api/candidates/' + candidateId);
    if (cand && cand.stage !== 'interviews') {
      stageWarning = `<div style="background:color-mix(in srgb, var(--warning) 15%, var(--bg-surface));border:1px solid var(--warning);border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:12px;font-size:0.78rem;color:var(--text-primary)">&#9888; This candidate has been moved to <strong>${esc(cand.stage)}</strong> stage.</div>`;
    }
  } catch (e) { /* non-fatal */ }

  function scoreColour(score) {
    if (score >= 4) return 'var(--success)';
    if (score === 3) return 'var(--warning)';
    return 'var(--danger)';
  }

  let html = `
    <div class="candidate-detail__header">
      <div style="flex:1;min-width:0">
        <h3 style="font-size:1rem;font-weight:600;margin:0">${esc(config.candidate_name || 'Candidate')}</h3>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${esc(config.candidate_role || '')}${config.client_name ? ' &middot; ' + esc(config.client_name) : ''}</div>
      </div>
      <button class="btn btn--ghost btn--sm" onclick="openCandidateDetail('${candidateId}')" aria-label="Back">&larr; Back</button>
    </div>
    ${stageWarning}`;

  // Summary section
  html += '<div class="candidate-detail__section">';
  html += '<div class="candidate-detail__section-title">Summary</div>';

  // Overall average
  if (summary.overall_avg !== null) {
    html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-size:2rem;font-weight:700;color:${scoreColour(summary.overall_avg)}">${summary.overall_avg.toFixed(1)}</div>
      <div style="font-size:0.78rem;color:var(--text-muted)">Overall average<br>${scores.length} scores from ${sessions.length} interviewer${sessions.length !== 1 ? 's' : ''}</div>
    </div>`;
  }

  // Category bar charts
  if (summary.category_avgs && Object.keys(summary.category_avgs).length > 0) {
    html += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">';
    for (const cat of INTERVIEW_CATEGORIES) {
      const avg = summary.category_avgs[cat];
      if (avg === undefined) continue;
      const pct = (avg / 5) * 100;
      html += `<div style="display:flex;align-items:center;gap:8px;font-size:0.75rem">
        <span style="width:90px;color:${INTERVIEW_CATEGORY_COLOURS[cat]};font-weight:600">${INTERVIEW_CATEGORY_LABELS[cat]}</span>
        <div style="flex:1;height:8px;background:var(--bg-surface);border-radius:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${INTERVIEW_CATEGORY_COLOURS[cat]};border-radius:4px"></div>
        </div>
        <span style="width:28px;text-align:right;font-weight:600;color:var(--text-primary)">${avg.toFixed(1)}</span>
      </div>`;
    }
    html += '</div>';
  }

  // Submission status
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
  for (const s of sessions) {
    const statusIcon = s.status === 'submitted' ? '&#10003;' : (s.status === 'in_progress' ? '&#9998;' : '&#8987;');
    const statusColour = s.status === 'submitted' ? 'var(--success)' : (s.status === 'in_progress' ? 'var(--warning)' : 'var(--text-muted)');
    html += `<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;padding:3px 8px;border:1px solid var(--border-default);border-radius:12px">
      <span style="color:${statusColour}">${statusIcon}</span> ${esc(s.interviewer_name || 'Interviewer')}
    </span>`;
  }
  html += '</div>';
  html += '</div>';

  // Comparison table
  html += '<div class="candidate-detail__section">';
  html += '<div class="candidate-detail__section-title">Score Comparison</div>';
  html += '<div style="overflow-x:auto">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:0.78rem">';
  html += '<thead><tr><th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--border-default);color:var(--text-muted);font-weight:600">Question</th>';
  for (const s of sessions) {
    html += `<th style="text-align:center;padding:6px 8px;border-bottom:1px solid var(--border-default);color:var(--text-muted);font-weight:600;min-width:60px">${esc(s.interviewer_name || '?')}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const q of questions) {
    // Calculate divergence
    const qScores = sessions.map(s => scoreMap[s.id]?.[q.question_id]?.score).filter(v => v != null);
    const maxScore = Math.max(...qScores);
    const minScore = Math.min(...qScores);
    const divergent = qScores.length >= 2 && (maxScore - minScore) >= 3;

    html += '<tr>';
    html += `<td style="padding:6px 8px;border-bottom:1px solid var(--border-subtle);line-height:1.3">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${INTERVIEW_CATEGORY_COLOURS[q.category] || 'var(--text-muted)'};margin-right:4px;vertical-align:middle"></span>
      ${esc(q.question_text)}
      ${divergent ? ' <span style="background:var(--danger);color:#fff;font-size:0.6rem;padding:1px 5px;border-radius:6px;font-weight:700;vertical-align:middle">DIVERGENT</span>' : ''}
    </td>`;

    for (const s of sessions) {
      const sc = scoreMap[s.id]?.[q.question_id];
      if (sc) {
        const notesAttr = sc.notes ? ` title="${esc(sc.notes)}"` : '';
        const notesIcon = sc.notes ? ' <span style="cursor:help"' + notesAttr + '>&#128172;</span>' : '';
        html += `<td style="text-align:center;padding:6px 8px;border-bottom:1px solid var(--border-subtle);font-weight:700;color:${scoreColour(sc.score)}"${notesAttr}>${sc.score}${notesIcon}</td>`;
      } else {
        html += '<td style="text-align:center;padding:6px 8px;border-bottom:1px solid var(--border-subtle);color:var(--text-faint)">&mdash;</td>';
      }
    }
    html += '</tr>';
  }

  html += '</tbody></table></div></div>';

  // Decision section
  html += '<div class="candidate-detail__section">';
  html += '<div class="candidate-detail__section-title">Decision</div>';

  if (decision) {
    const decColour = decision.decision === 'advance' ? 'var(--success)' : (decision.decision === 'reject' ? 'var(--danger)' : 'var(--warning)');
    html += `<div style="padding:12px;border:1px solid ${decColour};border-radius:var(--radius-sm);margin-bottom:8px">
      <div style="font-weight:700;color:${decColour};text-transform:uppercase;font-size:0.82rem;margin-bottom:4px">${esc(decision.decision)}</div>
      <div style="font-size:0.82rem;color:var(--text-primary);margin-bottom:6px">${esc(decision.notes)}</div>
      <div style="font-size:0.7rem;color:var(--text-muted)">By ${esc(decision.decided_by_name || 'Unknown')} on ${new Date(decision.decided_at || decision.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
    </div>`;
  } else {
    html += `<div style="margin-bottom:8px">
      <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Notes (required)</label>
      <textarea id="ivDecisionNotes" rows="3" placeholder="Explain your reasoning..." style="width:100%;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);padding:8px;font-size:0.82rem;resize:vertical"></textarea>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn--sm" style="background:var(--success);color:#fff;flex:1" onclick="window._ivDecide('${configId}','advance')">Advance</button>
      <button class="btn btn--sm" style="background:var(--warning);color:#fff;flex:1" onclick="window._ivDecide('${configId}','hold')">Hold</button>
      <button class="btn btn--sm" style="background:var(--danger);color:#fff;flex:1" onclick="window._ivDecide('${configId}','reject')">Reject</button>
    </div>`;
  }
  html += '</div>';

  panel.innerHTML = html;

  // Decision handler
  window._ivDecide = async (cfgId, dec) => {
    const notesEl = document.getElementById('ivDecisionNotes');
    const notes = notesEl ? notesEl.value.trim() : '';
    if (!notes) { toast('Notes are required', 'error'); if (notesEl) notesEl.focus(); return; }
    try {
      await apiCall('/api/interview-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_id: cfgId, decision: dec, notes }),
      });
      toast('Decision recorded');
      await loadCandidates();
      if (currentView === 'hiring') renderContent();
      renderSidebar();
      openInterviewResults(cfgId);
    } catch (e) {
      toast('Failed to record decision: ' + (e.message || ''), 'error');
    }
  };
}
window.openInterviewResults = openInterviewResults;

// ===== REGISTER VIEW =====
registerView('hiring', renderHiringView);
