// ==================== HIRING ====================
// Cached candidates list (populated by loadCandidates). Used by the sidebar
// active-count badge and the hiring view itself so we don't refetch on every
// re-render. Refresh by calling loadCandidates() after any mutation.
let _candidatesData = [];
let _hiringPositionsData = [];
// Glen's 8-stage hiring process (bug b7a2f97f, migration 024). Linear order.
// Rejected is no longer a stage — use archived_at on the candidate row to
// take them out of pipeline (set when Hired is confirmed, also when an
// active candidate is intentionally archived).
const HIRING_STAGES = [
  'sourcing',
  'interviews',
  'offer',
  'onboarding',
  'onboarded',
  'process_closed',
];
const HIRING_STAGE_LABELS = {
  sourcing:        'Sourcing',
  interviews:      'Interviews',
  offer:           'Offer',
  onboarding:      'Onboarding',
  onboarded:       'Onboarded',
  process_closed:  'Process Closed',
};

const _hiringStagesCache = {};

async function getHiringStagesForClient(clientId) {
  if (!clientId) return HIRING_STAGES.map(key => ({ key, label: HIRING_STAGE_LABELS[key] || key, ...(key === 'onboarding' ? { is_onboarding: true } : {}) }));
  if (_hiringStagesCache[clientId]) return _hiringStagesCache[clientId];
  try {
    const data = await apiCall(`/api/clients/${clientId}/hiring-stages`);
    if (data && data.stages) {
      _hiringStagesCache[clientId] = data.stages;
      return data.stages;
    }
  } catch (e) { /* fallback to default */ }
  return HIRING_STAGES.map(key => ({ key, label: HIRING_STAGE_LABELS[key] || key, ...(key === 'onboarding' ? { is_onboarding: true } : {}) }));
}

function getResolvedStageLabel(stages, key) {
  const s = stages.find(st => st.key === key);
  return s ? s.label : key;
}

function invalidateStagesCache(clientId) {
  if (clientId) delete _hiringStagesCache[clientId];
  else Object.keys(_hiringStagesCache).forEach(k => delete _hiringStagesCache[k]);
}

let _resolvedHiringStages = null;
async function resolveAndCacheHiringStages() {
  const clientId = window._hiringFilterClient || null;
  _resolvedHiringStages = await getHiringStagesForClient(clientId);
}

/** Return the index of a stage in the linear process, or 0 if unknown. */
function hiringStageIndex(stage) {
  const i = HIRING_STAGES.indexOf(stage);
  return i < 0 ? 0 : i;
}
/** Return the next stage in the linear process, or null at the end. */
function hiringNextStage(stage) {
  const i = hiringStageIndex(stage);
  return i >= HIRING_STAGES.length - 1 ? null : HIRING_STAGES[i + 1];
}
/** Return the previous stage in the linear process, or null at the start. */
function hiringPrevStage(stage) {
  const i = hiringStageIndex(stage);
  return i <= 0 ? null : HIRING_STAGES[i - 1];
}

/** Load all candidates from the API into _candidatesData. */
async function loadCandidates() {
  try {
    const data = await apiCall('/api/candidates');
    if (Array.isArray(data)) {
      _candidatesData = data;
      window._lastCandidatePollTime = new Date().toISOString();
    }
  } catch (e) { if (window._nbiDebug) console.error('Failed to load candidates:', e); }
}

/** Load all hiring positions from the API into _hiringPositionsData. */
async function loadHiringPositions() {
  try {
    const data = await apiCall('/api/hiring-positions');
    if (Array.isArray(data)) _hiringPositionsData = data;
  } catch (e) { if (window._nbiDebug) console.error('Failed to load hiring positions:', e); }
}

/** Load and render hiring metrics for the selected client in the Metrics tab. */
async function loadHiringMetrics() {
  const clientId = document.getElementById('metricsClientFilter')?.value;
  const container = document.getElementById('metricsContent');
  if (!container) return;
  if (!clientId) { container.innerHTML = '<div style="color:var(--text-muted);font-size:0.9rem">Select a client to view metrics</div>'; return; }

  container.innerHTML = '<div style="color:var(--text-muted)">Loading metrics…</div>';

  try {
    const [timeInStage, timeToHire, pipeline] = await Promise.all([
      apiCall(`/api/hiring/metrics/time-in-stage?client_id=${clientId}`).catch(() => null),
      apiCall(`/api/hiring/metrics/time-to-hire?client_id=${clientId}`).catch(() => null),
      apiCall(`/api/hiring/metrics/pipeline?client_id=${clientId}`).catch(() => null),
    ]);

    let html = '';

    // Summary stat cards (always show)
    const totalActive = pipeline && pipeline.snapshot ? pipeline.snapshot.reduce((s, x) => s + x.count, 0) : 0;
    const totalHires = timeToHire && timeToHire.candidates ? timeToHire.candidates.length : 0;
    const avgDays = timeToHire ? (timeToHire.avg_days || 0) : 0;
    const medianDays = timeToHire ? (timeToHire.median_days || 0) : 0;

    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;margin-bottom:var(--space-xl)">
      <div style="background:var(--bg-surface);padding:18px 20px;border-radius:var(--radius-md);border:1px solid var(--border-default)">
        <div style="font-size:2rem;font-weight:700;color:var(--text-primary);line-height:1">${totalActive}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Active candidates</div>
      </div>
      <div style="background:var(--bg-surface);padding:18px 20px;border-radius:var(--radius-md);border:1px solid var(--border-default)">
        <div style="font-size:2rem;font-weight:700;color:var(--success);line-height:1">${totalHires}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Total hires</div>
      </div>
      <div style="background:var(--bg-surface);padding:18px 20px;border-radius:var(--radius-md);border:1px solid var(--border-default)">
        <div style="font-size:2rem;font-weight:700;color:var(--text-primary);line-height:1">${avgDays}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Avg days to hire</div>
      </div>
      <div style="background:var(--bg-surface);padding:18px 20px;border-radius:var(--radius-md);border:1px solid var(--border-default)">
        <div style="font-size:2rem;font-weight:700;color:var(--text-primary);line-height:1">${medianDays}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Median days</div>
      </div>
    </div>`;

    // Pipeline funnel with conversion rates (Ashby pattern)
    if (pipeline && pipeline.snapshot && pipeline.snapshot.length > 0) {
      const maxCount = Math.max(...pipeline.snapshot.map(s => s.count));
      html += `<div style="margin-bottom:var(--space-xl)">
        <div style="font-size:0.9rem;font-weight:600;margin-bottom:var(--space-md)">Pipeline Funnel</div>`;
      pipeline.snapshot.forEach((s, idx) => {
        const pct = maxCount > 0 ? (s.count / maxCount * 100) : 0;
        const prevCount = idx > 0 ? pipeline.snapshot[idx - 1].count : null;
        const conversionRate = prevCount && prevCount > 0 ? Math.round((s.count / prevCount) * 100) : null;

        if (idx > 0 && conversionRate !== null) {
          html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:2px;margin-top:-2px">
            <span style="width:110px"></span>
            <span style="font-size:0.75rem;color:${conversionRate < 30 ? 'var(--danger)' : conversionRate < 60 ? 'var(--warning)' : 'var(--success)'};font-weight:600">↓ ${conversionRate}%</span>
          </div>`;
        }

        html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <span style="width:110px;font-size:0.82rem;color:var(--text-muted);text-align:right;flex-shrink:0">${s.stage}</span>
          <div style="flex:1;height:28px;background:var(--bg-surface);border-radius:4px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:4px;display:flex;align-items:center;padding-left:10px;font-size:0.78rem;color:#fff;font-weight:600;min-width:fit-content">${s.count}</div>
          </div>
        </div>`;
      });
      html += '</div>';
    }

    // Time in stage bar chart
    if (timeInStage && timeInStage.stages && timeInStage.stages.length > 0) {
      html += `<div style="margin-bottom:var(--space-xl)">
        <div style="font-size:0.9rem;font-weight:600;margin-bottom:var(--space-md)">Average Time in Stage (days)</div>
        ${timeInStage.stages.map(s => {
          const days = Number(s.avg_days) || 0;
          const color = days < 7 ? 'var(--success)' : days < 14 ? 'var(--warning)' : 'var(--danger)';
          const maxDays = Math.max(...timeInStage.stages.map(x => Number(x.avg_days) || 0));
          const pct = maxDays > 0 ? (days / maxDays * 100) : 0;
          return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
            <span style="width:110px;font-size:0.82rem;color:var(--text-muted);text-align:right;flex-shrink:0">${s.stage}</span>
            <div style="flex:1;height:24px;background:var(--bg-surface);border-radius:4px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;display:flex;align-items:center;padding-left:10px;font-size:0.78rem;color:#fff;font-weight:600;min-width:fit-content">${days}d</div>
            </div>
            <span style="font-size:0.78rem;color:var(--text-muted);width:70px">${s.candidate_count} cand.</span>
          </div>`;
        }).join('')}
      </div>`;
    }

    container.innerHTML = html || '<div style="color:var(--text-muted)">No metrics data available for this client</div>';
  } catch (e) {
    container.innerHTML = '<div style="color:var(--danger)">Failed to load metrics</div>';
  }
}

/**
 * Render the Hiring view: filters at the top, candidates grouped by client
 * with thumbnail cards. Click a card to open the slide-in detail panel.
 * @param {HTMLElement} container - The DOM element to render into
 */
const CANDIDATE_SOURCES = ['referral', 'linkedin', 'inbound', 'agency', 'job-board', 'internal', 'other'];
const ATS_STAGE_COLORS = { sourcing: '#6b7280', sourced: '#6b7280', screening: '#3b82f6', interviews: '#f59e0b', interview: '#f59e0b', offer: '#a855f7', onboarding: '#10b981', onboarded: '#22c55e', hired: '#22c55e', rejected: '#ef4444', process_closed: '#9ca3af' };

function candidateAvatarHtml(name, size) {
  size = size || 38;
  const initials = (name || '??').split(/\s+/).map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
  const hues = [262, 220, 340, 160, 30, 200, 280, 120, 0, 50];
  var hash = 0;
  for (var i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash + (name || '').charCodeAt(i)) | 0;
  var hue = hues[Math.abs(hash) % hues.length];
  return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:hsl(' + hue + ',55%,45%);display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size * 0.37) + 'px;font-weight:700;color:white;flex-shrink:0">' + esc(initials) + '</div>';
}

function daysInStageHtml(stageChangedAt, createdAt) {
  if (!stageChangedAt) return '';
  if (createdAt && Math.abs(new Date(stageChangedAt).getTime() - new Date(createdAt).getTime()) < 60000) return '<span style="font-size:12px;color:var(--text-muted)">—</span>';
  var days = Math.floor((Date.now() - new Date(stageChangedAt).getTime()) / 86400000);
  var label = days >= 14 ? Math.floor(days / 7) + 'w' : days + 'd';
  var cls = days > 14 ? 'color:var(--danger);font-weight:600' : days > 7 ? 'color:var(--warning);font-weight:600' : 'color:var(--text-muted)';
  return '<span style="font-size:12px;' + cls + '" title="' + days + ' days in stage">' + label + '</span>';
}

function renderHiringCard(c, draggable) {
  var isArchived = !!c.archived_at;
  var days = c.stage_changed_at ? Math.floor((Date.now() - new Date(c.stage_changed_at).getTime()) / 86400000) : 0;
  var assignees = c.stage_assignees && c.stage_assignees[c.stage] ? c.stage_assignees[c.stage] : [];
  var hasAssignee = assignees.length > 0;
  var borderClass = isArchived ? 'ats-card--border-default' : days > 14 ? 'ats-card--border-red' : days > 7 ? 'ats-card--border-amber' : (!hasAssignee && days > 2) ? 'ats-card--border-amber' : 'ats-card--border-default';

  var stageKey = c.stage || 'sourcing';
  var stageLabel = (HIRING_STAGE_LABELS[stageKey] || stageKey).toUpperCase();
  var stageColor = ATS_STAGE_COLORS[stageKey] || '#6b7280';
  var sourceLabel = c.source ? c.source.replace(/-/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); }) : '';

  var facesHtml = '';
  var shown = assignees.slice(0, 3);
  shown.forEach(function(name) { facesHtml += candidateAvatarHtml(name, 22); });
  if (assignees.length > 3) facesHtml += '<div class="ats-assignee-face" style="background:#555">+' + (assignees.length - 3) + '</div>';

  var dragAttrs = draggable && !isArchived
    ? ' draggable="true" ondragstart="onHiringCardDragStart(event,\'' + c.id + '\')" ondragend="onHiringCardDragEnd(event)"'
    : '';

  return '<div class="ats-card ' + borderClass + (isArchived ? ' archived' : '') + '"' + dragAttrs +
    ' data-action="_actOpenCandidateDetailIfNotDrag" data-arg0="' + c.id + '" tabindex="0" role="button"' +
    ' aria-label="' + esc(c.name || c.role || 'Unnamed') + ', ' + esc(stageKey) + '"' +
    ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openCandidateDetail(\'' + c.id + '\')}">' +
    '<div class="ats-card-identity">' +
      candidateAvatarHtml(c.name || c.role || '?', 38) +
      '<div style="min-width:0;flex:1">' +
        '<div class="ats-card-name">' + esc(c.name || c.role || 'Unnamed') + '</div>' +
        (c.name && c.role ? '<div class="ats-card-role">' + esc(c.role) + '</div>' : '') +
      '</div>' +
    '</div>' +
    (c.client_name ? '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.client_name) + '</div>' : '') +
    '<div class="ats-card-badges">' +
      (sourceLabel ? '<span class="ats-source-badge">' + esc(sourceLabel) + '</span>' : '<span></span>') +
      '<span style="font-size:12px;background:' + stageColor + '20;color:' + stageColor + ';padding:2px 7px;border-radius:4px">' + stageLabel + '</span>' +
    '</div>' +
    ((c.start_date && (c.stage === 'onboarding' || c.stage === 'onboarded' || c.stage === 'offer')) ? '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">Starts: ' + new Date(c.start_date + 'T00:00:00').toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) + '</div>' : '') +
    '<div class="ats-card-meta">' +
      '<div class="ats-assignee-faces">' + (facesHtml || '<span style="font-size:12px;color:var(--text-muted)">No assignee</span>') + '</div>' +
      '<div class="ats-card-indicators">' +
        (c.has_cv ? '<span title="Has CV">&#128196;</span>' : '') +
        (c.comment_count > 0 ? '<span title="' + c.comment_count + ' comments">&#128172;' + c.comment_count + '</span>' : '') +
        daysInStageHtml(c.stage_changed_at, c.created_at) +
      '</div>' +
    '</div>' +
    (c.contract_status ? '<div style="margin-top:6px"><span class="ats-contract-pill">' + esc(c.contract_status.replace(/-/g, ' ').replace(/\b\w/g, function(l){return l.toUpperCase();})) + '</span></div>' : '') +
    (c.rejection_category ? '<div style="margin-top:6px"><span style="font-size:12px;background:rgba(239,68,68,0.15);color:var(--danger);padding:2px 6px;border-radius:3px">Rejected</span></div>' : '') +
    '<div class="ats-mobile-move"><select aria-label="Move stage" onchange="event.stopPropagation();if(this.value)updateCandidateField(\'' + c.id + '\',\'stage\',this.value)">' +
      '<option value="">Move to…</option>' +
      ((_resolvedHiringStages || HIRING_STAGES.map(function(k){return {key:k,label:HIRING_STAGE_LABELS[k]||k};})).map(function(s){return '<option value="' + s.key + '"' + (s.key === (c.stage||'') ? ' disabled' : '') + '>' + esc(s.label) + '</option>';}).join('')) +
    '</select></div>' +
  '</div>';
}

// ---- Hiring Kanban drag-and-drop ----
// These handlers move a candidate between stage lanes. The drop calls the existing
// updateCandidateField('stage', newStage) path so the server is the source of truth
// and audit logging / notifications still fire.

// ---- Lane (column) drag-to-reorder ----
var _dragLane = null;
function onLaneDragStart(ev) {
  var lane = ev.target.closest('.ats-lane');
  if (!lane) return;
  // Only drag from header, not from cards inside the lane
  if (ev.target.closest('.ats-card') || ev.target.closest('.ats-lane-body')) { ev.preventDefault(); return; }
  _dragLane = lane;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/x-lane', lane.dataset.stage);
  lane.style.opacity = '0.4';
  window._laneDragActive = true;
}
function onLaneDragEnd(ev) {
  if (_dragLane) _dragLane.style.opacity = '';
  _dragLane = null;
  setTimeout(function() { window._laneDragActive = false; }, 50);
}

(function() {
  document.addEventListener('dragover', function(ev) {
    if (!_dragLane) return;
    var target = ev.target.closest('.ats-lane');
    if (!target || target === _dragLane || target.dataset.stage === 'onboarded') return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    var kanban = target.closest('.ats-kanban');
    if (!kanban) return;
    var rect = target.getBoundingClientRect();
    var midX = rect.left + rect.width / 2;
    if (ev.clientX < midX) {
      kanban.insertBefore(_dragLane, target);
    } else if (target.nextSibling) {
      kanban.insertBefore(_dragLane, target.nextSibling);
    }
  });

  document.addEventListener('drop', function(ev) {
    if (!_dragLane) return;
    ev.preventDefault();
    var kanban = _dragLane.closest('.ats-kanban');
    if (!kanban) return;
    var lanes = kanban.querySelectorAll('.ats-lane');
    var newOrder = [];
    var stages = _resolvedHiringStages || HIRING_STAGES.map(function(k) { return { key: k, label: HIRING_STAGE_LABELS[k] || k }; });
    var stageMap = {};
    stages.forEach(function(s) { stageMap[s.key] = s; });
    lanes.forEach(function(lane) {
      var key = lane.dataset.stage;
      if (stageMap[key]) newOrder.push(stageMap[key]);
    });
    if (newOrder.length === stages.length) {
      _resolvedHiringStages = newOrder;
      var clientId = window._hiringFilterClient;
      if (clientId) {
        authFetch('/api/clients/' + clientId + '/hiring-stages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stages: newOrder }),
        }).then(function(resp) {
          if (resp.ok) { toast('Column order saved'); invalidateStagesCache(clientId); }
        });
      }
    }
  });
})();

/** Start dragging a candidate card — stash the id on the dataTransfer payload. */
function onHiringCardDragStart(ev, candidateId) {
  if (!ev.dataTransfer) return;
  ev.stopPropagation();
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', candidateId);
  ev.currentTarget.classList.add('dragging');
  // Stop the card's click handler from firing once the drop completes
  window._hiringDragActive = true;
}

/** End of drag (whether dropped or cancelled) — clean up visual state. */
function onHiringCardDragEnd(ev) {
  ev.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.hiring-lane.drag-over,.ats-lane.drag-over').forEach(el => el.classList.remove('drag-over'));
  // Defer clearing the flag so the click that would otherwise fire on drop is suppressed
  setTimeout(() => { window._hiringDragActive = false; }, 50);
}

/** Allow a lane to accept the drop by preventing the default "not allowed" behaviour. */
function onHiringLaneDragOver(ev) {
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  const lane = ev.currentTarget.closest('.hiring-lane,.ats-lane');
  if (lane) lane.classList.add('drag-over');
}

/** Remove the drag-over highlight when the cursor leaves the lane. */
function onHiringLaneDragLeave(ev) {
  const lane = ev.currentTarget.closest('.hiring-lane,.ats-lane');
  if (!lane) return;
  const related = ev.relatedTarget;
  if (!related || !lane.contains(related)) lane.classList.remove('drag-over');
}

/** Handle the drop — compute drop index in the target lane and PATCH stage + position. */
async function onHiringLaneDrop(ev, newStage) {
  ev.preventDefault();
  const lane = ev.currentTarget.closest('.hiring-lane,.ats-lane');
  if (lane) lane.classList.remove('drag-over');
  const candidateId = ev.dataTransfer ? ev.dataTransfer.getData('text/plain') : '';
  if (!candidateId) return;
  const candidate = (_candidatesData || []).find(c => c.id === candidateId);
  if (!candidate) { toast('Candidate not found', 'error'); return; }

  // Compute the drop index against visible cards in the target lane body
  const body = ev.currentTarget;
  const cards = [...body.querySelectorAll('.hiring-card:not(.dragging),.ats-card:not(.dragging)')];
  const afterCard = cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = ev.clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, el: card };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, el: null }).el;
  const dropIdx = afterCard ? cards.indexOf(afterCard) : cards.length;

  try {
    if (candidate.stage !== newStage) {
      // Stage change: route through the transition gateway (bug de607254) so
      // stage-relevant fields are prompted for before the single PATCH.
      await hiringRequestStageChange(candidateId, newStage, { position: dropIdx });
    } else {
      // Same-lane reorder: no prompt, just persist the position
      const res = await authFetch(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: dropIdx }),
      });
      if (!res.ok) { toast('Failed to move candidate', 'error'); return; }
      if (typeof loadCandidates === 'function') await loadCandidates();
      renderContent();
    }
  } catch (e) {
    if (window._nbiDebug) console.error('Hiring drop failed', e);
    toast('Failed to move candidate', 'error');
  }
}

function _parsePositionDesc(desc) {
  const d = { salary: null, monthly: null, origCurrency: null, startMonth: null, priority: null, recruitStatus: null, type: 'Permanent' };
  if (!desc) return d;
  const lines = desc.split('\n');
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('Annual Salary:')) d.salary = l.replace('Annual Salary:', '').trim();
    else if (l.startsWith('Monthly:')) d.monthly = l.replace('Monthly:', '').trim();
    else if (l.startsWith('Original Currency:')) d.origCurrency = l.replace('Original Currency:', '').trim();
    else if (l.startsWith('Planned Start:')) d.startMonth = l.replace('Planned Start:', '').trim();
    else if (l.startsWith('Priority:')) { const v = l.replace('Priority:', '').trim(); if (v !== 'None') d.priority = v; }
    else if (l.startsWith('Recruitment Status:')) d.recruitStatus = l.replace('Recruitment Status:', '').trim();
    else if (l.startsWith('Type: Contract')) d.type = 'Contract';
  }
  return d;
}

function _positionDaysOpen(p) {
  if (!p.created_at) return 0;
  return Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
}

function _daysOpenClass(days) {
  if (days < 30) return 'position-card__days--green';
  if (days < 60) return 'position-card__days--amber';
  return 'position-card__days--red';
}

function renderPositionCard(p, candidates) {
  const d = _parsePositionDesc(p.description);
  const days = _positionDaysOpen(p);
  const linked = candidates.filter(c => c.position_id === p.id && !c.archived_at);
  const dotClass = p.status === 'closed' ? 'position-card__dot--closed' : p.status === 'paused' ? 'position-card__dot--paused' : 'position-card__dot--open';
  const prioClass = d.priority !== null ? 'position-card__priority--' + d.priority : '';
  const seniorityChip = p.seniority ? `<span class="position-card__chip">${esc(p.seniority.charAt(0).toUpperCase() + p.seniority.slice(1))}</span>` : '';
  const isAdmin = _currentUser && _currentUser.role === 'admin';

  let minibar = '';
  if (linked.length > 0) {
    const stageColors = { sourcing: 'var(--text-muted)', interviews: 'var(--warning)', offer: 'var(--accent)', onboarding: 'var(--success)', onboarded: 'var(--success)' };
    const stageCounts = {};
    linked.forEach(c => { stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1; });
    const total = linked.length;
    const segments = Object.entries(stageCounts).map(([stage, count]) =>
      `<span style="width:${(count/total)*100}%;background:${stageColors[stage] || 'var(--text-muted)'}" title="${count} ${stage}"></span>`
    ).join('');
    minibar = `<div class="position-card__minibar">${segments}</div>`;
  }

  const candidateLabel = linked.length === 1 ? '1 candidate' : linked.length + ' candidates';
  const jdIcon = p.jd_filename ? '<span style="position:absolute;top:6px;right:8px;font-size:0.75rem;color:var(--text-muted)" title="Job description attached">&#128196;</span>' : '';

  const isClosed = p.status === 'closed';
  const isPaused = p.status === 'paused';
  const cardDim = isClosed ? 'opacity:0.6' : '';
  const statusBadge = isClosed
    ? `<span style="font-size:0.65rem;font-weight:600;text-transform:uppercase;padding:2px 6px;border-radius:6px;background:var(--bg-surface);color:var(--text-muted);border:1px solid var(--border-default)">${p.closed_reason === 'filled' ? 'Filled' : 'Closed'}</span>`
    : isPaused
    ? `<span style="font-size:0.65rem;font-weight:600;text-transform:uppercase;padding:2px 6px;border-radius:6px;background:color-mix(in srgb, var(--warning) 15%, transparent);color:var(--warning);border:1px solid color-mix(in srgb, var(--warning) 30%, transparent)">Paused</span>`
    : '';
  const metaLine = isClosed
    ? (p.closed_reason === 'filled' && p.filled_by_candidate_name ? `<span>Filled by ${esc(p.filled_by_candidate_name)}</span>` : '')
    : `<span class="${_daysOpenClass(days)}">${days}d open</span>`;

  return `<div class="position-card" data-position-id="${p.id}" data-action="openPositionDetail" data-arg0="${p.id}" tabindex="0" role="button"
              style="${cardDim}"
              aria-label="${esc(p.title)}, ${p.status}, ${candidateLabel}"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPositionDetail('${p.id}')}">
    ${jdIcon}
    <div class="position-card__row">
      <span class="position-card__dot ${dotClass}"></span>
      <span class="position-card__title">${esc(p.title)}</span>
      ${statusBadge}
      ${d.priority !== null ? `<span class="position-card__priority ${prioClass}">P${esc(String(d.priority))}</span>` : ''}
    </div>
    <div class="position-card__row">
      ${seniorityChip}
      ${p.discipline ? `<span class="position-card__chip" style="color:var(--accent);background:color-mix(in srgb, var(--accent) 12%, transparent)">${esc(p.discipline)}</span>` : ''}
      ${d.recruitStatus ? `<span class="position-card__chip">${esc(d.recruitStatus)}</span>` : ''}
      ${p.client_name ? `<span class="position-card__chip" style="color:var(--accent-text);background:rgba(59,130,246,0.1)">${esc(p.client_name)}</span>` : ''}
    </div>
    <div class="position-card__meta">
      ${!isClosed && !isClientUser() && p.salary_range ? `<span>${esc(p.salary_range)}</span>` : !isClosed && !isClientUser() && d.startMonth ? `<span>Start: ${esc(d.startMonth)}</span>` : ''}
      ${p.location ? `<span>${esc(p.location)}</span>` : ''}
      ${metaLine}
    </div>
    <div class="position-card__candidates">
      ${minibar}
      <span>${candidateLabel}</span>
    </div>
  </div>`;
}

function renderHiringView(container) {
  if (!window._hiringLoaded) {
    if (!isClientUser()) window._hiringFilterClient = null;
    container.innerHTML = '<div class="hiring" style="padding:24px"><div class="skeleton skeleton-card"></div>' +
      Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading hiring data</span></div>';
    Promise.all([loadCandidates(), loadHiringPositions()]).then(async () => {
      await resolveAndCacheHiringStages();
      var todayStr = new Date().toISOString().slice(0, 10);
      try {
        var ivConfigs = await apiCall('/api/interview-configs');
        if (ivConfigs) { window._interviewsTodayCount = ivConfigs.filter(function(c) { return c.scheduled_at && c.scheduled_at.slice(0,10) === todayStr; }).length; }
      } catch (e) { /* non-fatal */ }
      window._hiringLoaded = true;
      if (currentView === 'hiring') renderContent();
    });
    return;
  }

  var candidates = _candidatesData || [];
  var active = candidates.filter(function(c) { return !c.archived_at; });
  var canSeeTabs = !isClientUser() || isClientAdmin();
  var activeTab = canSeeTabs ? (window._hiringActiveTab || 'pipeline') : 'pipeline';
  var positions = _hiringPositionsData || [];

  var needsAction = active.filter(function(c) {
    var assignees = c.stage_assignees && c.stage_assignees[c.stage] ? c.stage_assignees[c.stage] : [];
    if (assignees.length === 0) return true;
    if (!c.stage_changed_at) return false;
    return Math.floor((Date.now() - new Date(c.stage_changed_at).getTime()) / 86400000) > 14;
  }).length;
  var offersCount = active.filter(function(c) { return c.stage === 'offer'; }).length;
  var openPositions = positions.filter(function(p) { return p.status === 'open'; }).length;

  var tabNames = ['pipeline', 'positions', 'database', 'calendar', 'metrics', 'questions'];
  var tabLabels = { pipeline: 'Pipeline', positions: 'Positions', database: 'Database', calendar: 'Calendar', metrics: 'Metrics', questions: 'Questions' };

  var html = '<div class="hiring">';
  html += '<div class="ats-summary">' +
    '<div class="ats-summary-item" onclick="window._hiringActiveTab=\'calendar\';renderContent()">' +
      '<span class="ats-summary-count">' + (window._interviewsTodayCount || 0) + '</span> interviews today</div>' +
    '<div class="ats-summary-item" style="cursor:pointer" onclick="window._hiringActiveTab=\'database\';window._hiringDbSort=\'days_desc\';window._hiringDbNeedsAction=true;renderContent()">' +
      '<span class="ats-summary-count' + (needsAction > 0 ? ' danger' : '') + '">' + needsAction + '</span> needs action</div>' +
    '<div class="ats-summary-item" onclick="window._hiringActiveTab=\'pipeline\';window._hiringFilterStage=\'offer\';renderContent()">' +
      '<span class="ats-summary-count' + (offersCount > 0 ? ' warn' : '') + '">' + offersCount + '</span> offers pending</div>' +
    '<div class="ats-summary-item" onclick="window._hiringActiveTab=\'positions\';renderContent()">' +
      '<span class="ats-summary-count">' + openPositions + '</span> open positions</div>' +
  '</div>';

  if (canSeeTabs) {
    html += '<div class="ats-tabs" role="tablist">';
    tabNames.forEach(function(t) {
      if (t === 'questions' && isClientUser()) return;
      html += '<div class="ats-tab' + (activeTab === t ? ' active' : '') + '" role="tab" onclick="window._hiringActiveTab=\'' + t + '\';renderContent()">' + tabLabels[t] + '</div>';
    });
    html += '</div>';
  }

  html += '<div id="ats-tab-content" role="tabpanel"></div></div>';
  container.innerHTML = html;

  var tabEl = container.querySelector('#ats-tab-content');
  switch (activeTab) {
    case 'pipeline': renderPipelineTab(tabEl); break;
    case 'positions': renderPositionsTab(tabEl); break;
    case 'database': renderDatabaseTab(tabEl); break;
    case 'calendar': renderCalendarTab(tabEl); break;
    case 'metrics': renderMetricsTab(tabEl); break;
    case 'questions': renderQuestionsTab(tabEl); break;
  }
}

function renderPipelineTab(container) {
  var candidates = _candidatesData || [];
  var isAdmin = _currentUser && _currentUser.role === 'admin';
  var isScopedUser = isClientUser();
  var isClientAdm = isClientAdmin();
  var showControls = !isScopedUser || isClientAdm;
  var viewMode = showControls ? (window._hiringViewMode || 'kanban') : 'kanban';

  var positions = _hiringPositionsData || [];
  var filtered = candidates.slice();
  if (window._hiringFilterClient) filtered = filtered.filter(function(c) { return c.client_id === window._hiringFilterClient; });
  if (window._hiringFilterStage) filtered = filtered.filter(function(c) { return c.stage === window._hiringFilterStage; });
  if (window._hiringFilterPosition) filtered = filtered.filter(function(c) { return c.position_id === window._hiringFilterPosition; });
  var showArchived = !!window._hiringShowArchived;
  if (!showArchived) {
    filtered = filtered.filter(function(c) { return !c.archived_at; });
  } else {
    filtered.sort(function(a, b) { return (a.archived_at ? 1 : 0) - (b.archived_at ? 1 : 0); });
  }

  var clientOptions = getContractedClientRecords();
  var html = '<div class="ats-controls">';
  if (showControls) {
    if (!isScopedUser) {
      html += '<div class="hiring-view-toggle"><button type="button" class="' + (viewMode === 'kanban' ? 'active' : '') + '" onclick="window._hiringViewMode=\'kanban\';renderContent()">Kanban</button>' +
        '<button type="button" class="' + (viewMode === 'client' ? 'active' : '') + '" onclick="window._hiringViewMode=\'client\';renderContent()">By Client</button></div>';
      html += '<select class="ats-filter-btn" onchange="(async function(v){window._hiringFilterClient=v||null;await resolveAndCacheHiringStages();renderContent();})(this.value)">' +
        '<option value="">All Clients</option>' +
        clientOptions.map(function(c) { return '<option value="' + c.id + '"' + (window._hiringFilterClient === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>';
    }
    if (isAdmin && window._hiringFilterClient) {
      html += '<button class="ats-filter-btn" onclick="openStageEditor(\'' + window._hiringFilterClient + '\')" title="Configure stages">&#9881;</button>';
    }
    html += '<select class="ats-filter-btn" onchange="window._hiringFilterStage=this.value||null;renderContent()">' +
      '<option value="">All Stages</option>' +
      HIRING_STAGES.map(function(s) { return '<option value="' + s + '"' + (window._hiringFilterStage === s ? ' selected' : '') + '>' + HIRING_STAGE_LABELS[s] + '</option>'; }).join('') + '</select>';
    html += '<select class="ats-filter-btn" onchange="window._hiringFilterPosition=this.value||null;renderContent()">' +
      '<option value="">All Positions</option>' +
      positions.map(function(p) { return '<option value="' + p.id + '"' + (window._hiringFilterPosition === p.id ? ' selected' : '') + '>' + esc(p.title) + '</option>'; }).join('') + '</select>';
    html += '<label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted);cursor:pointer;user-select:none"><input type="checkbox"' + (showArchived ? ' checked' : '') + ' onchange="window._hiringShowArchived=this.checked;renderContent()" style="accent-color:var(--purple)"> Show archived</label>';
  }
  html += '<button class="btn btn--primary" data-action="openCreateCandidateModal" style="margin-left:auto">+ Candidate</button>';
  html += '<span style="font-size:12px;color:var(--text-muted)">' + filtered.length + ' of ' + candidates.length + '</span>';
  html += '</div>';

  if (filtered.length === 0) {
    html += '<div style="padding:40px;text-align:center;color:var(--text-muted)">No candidates yet. Click "+ Candidate" to add one.</div>';
  } else if (viewMode === 'kanban') {
    html += '<div class="ats-kanban" role="list" aria-label="Hiring pipeline">';
    var kanbanStages = _resolvedHiringStages || HIRING_STAGES.map(function(k) { return { key: k, label: HIRING_STAGE_LABELS[k] || k }; });
    kanbanStages.forEach(function(stageObj) {
      var stage = stageObj.key;
      var stageLabel = stageObj.label;
      var stageColor = ATS_STAGE_COLORS[stage] || '#6b7280';
      var stageCandidates = filtered.filter(function(c) { return c.stage === stage; })
        .sort(function(a, b) { return (a.position || 0) - (b.position || 0); });
      var isTerminalStage = stage === 'onboarded';
      html += '<section class="ats-lane" data-stage="' + stage + '" ' + (isTerminalStage ? '' : 'draggable="true" ondragstart="onLaneDragStart(event)" ondragend="onLaneDragEnd(event)"') + '>' +
        '<div class="ats-lane-header" style="color:' + stageColor + ';' + (isTerminalStage ? '' : 'cursor:grab') + '">' +
          '<span>' + esc(stageLabel) + '</span><span class="ats-lane-count">' + stageCandidates.length + '</span></div>' +
        '<div class="ats-lane-body" ondragover="onHiringLaneDragOver(event)" ondragleave="onHiringLaneDragLeave(event)" ondrop="onHiringLaneDrop(event,\'' + stage + '\')">';
      if (stageCandidates.length === 0) {
        html += '<div class="ats-lane-empty">Drop candidate here</div>';
      } else {
        stageCandidates.forEach(function(c) { html += renderHiringCard(c, true); });
      }
      html += '</div></section>';
    });
    html += '</div>';
  } else {
    var groups = {};
    filtered.forEach(function(c) {
      var key = c.client_id || '__unassigned__';
      var label = c.client_name || 'Unassigned';
      if (!groups[key]) groups[key] = { label: label, items: [] };
      groups[key].items.push(c);
    });
    var groupKeys = Object.keys(groups).sort(function(a, b) { return groups[a].label.localeCompare(groups[b].label); });
    groupKeys.forEach(function(k) {
      var g = groups[k];
      html += '<div class="hiring-client-group">' +
        '<div class="hiring-client-group__header">' + esc(g.label) + ' <span style="color:var(--text-muted);font-weight:400;font-size:0.82rem">(' + g.items.length + ')</span></div>' +
        '<div class="hiring-grid">';
      g.items.forEach(function(c) { html += renderHiringCard(c); });
      html += '</div></div>';
    });
  }
  container.innerHTML = html;
}

function renderPositionsTab(container) {
  var positions = _hiringPositionsData || [];
  var candidates = _candidatesData || [];
  var isClient = isClientUser();

  var filteredPositions = positions.slice();
  if (window._hiringFilterClient) filteredPositions = filteredPositions.filter(function(p) { return p.client_id === window._hiringFilterClient; });
  if (window._hiringFilterPosStatus) filteredPositions = filteredPositions.filter(function(p) { return p.status === window._hiringFilterPosStatus; });

  var openCount = filteredPositions.filter(function(p) { return p.status === 'open'; }).length;
  var pausedCount = filteredPositions.filter(function(p) { return p.status === 'paused'; }).length;
  var closedCount = filteredPositions.filter(function(p) { return p.status === 'closed'; }).length;
  var posSort = window._hiringPositionSort || 'priority';

  var html = '<div class="ats-controls">' +
    '<div class="hiring-view-toggle" style="font-size:0.75rem">' +
      '<button type="button" class="' + (posSort === 'priority' ? 'active' : '') + '" onclick="window._hiringPositionSort=\'priority\';renderContent()">Priority</button>' +
      '<button type="button" class="' + (posSort === 'start' ? 'active' : '') + '" onclick="window._hiringPositionSort=\'start\';renderContent()">Start Date</button>' +
      '<button type="button" class="' + (posSort === 'status' ? 'active' : '') + '" onclick="window._hiringPositionSort=\'status\';renderContent()">Status</button>' +
      '<button type="button" class="' + (posSort === 'client' ? 'active' : '') + '" onclick="window._hiringPositionSort=\'client\';renderContent()">Client</button>' +
    '</div>' +
    '<select class="ats-filter-btn" onchange="window._hiringFilterPosStatus=this.value||null;renderContent()">' +
      '<option value="">All Statuses</option>' +
      '<option value="open"' + (window._hiringFilterPosStatus === 'open' ? ' selected' : '') + '>Open (' + openCount + ')</option>' +
      '<option value="paused"' + (window._hiringFilterPosStatus === 'paused' ? ' selected' : '') + '>Paused (' + pausedCount + ')</option>' +
      '<option value="closed"' + (window._hiringFilterPosStatus === 'closed' ? ' selected' : '') + '>Closed (' + closedCount + ')</option>' +
    '</select>' +
    '<span style="font-size:12px;color:var(--text-muted)">' + openCount + ' open' + (pausedCount ? ', ' + pausedCount + ' paused' : '') + ', ' + closedCount + ' closed</span>' +
    (!isClient ? '<button class="btn btn--primary" style="margin-left:auto" onclick="openCreatePositionModal()">+ Position</button>' : '') +
  '</div>';

  if (filteredPositions.length === 0) {
    html += '<div style="padding:40px;text-align:center;color:var(--text-muted)">No positions found.</div>';
  } else {
    var groups = {};
    var monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    if (posSort === 'priority') {
      var prioLabels = { '0': 'P0 — Critical', '1': 'P1 — High', '2': 'P2 — Medium', '3': 'P3 — Low', '4': 'P4 — Backlog', 'none': 'No Priority' };
      var activePositions = filteredPositions.filter(function(p) { return p.status === 'open'; });
      var pausedPositions = filteredPositions.filter(function(p) { return p.status === 'paused'; });
      var closedPositions = filteredPositions.filter(function(p) { return p.status === 'closed'; });
      activePositions.forEach(function(p) {
        var d = _parsePositionDesc(p.description);
        var key = d.priority !== null ? String(d.priority) : 'none';
        if (!groups[key]) groups[key] = { label: prioLabels[key] || key, items: [], order: d.priority !== null ? d.priority : 99 };
        groups[key].items.push(p);
      });
      Object.keys(groups).sort(function(a, b) { return groups[a].order - groups[b].order; }).forEach(function(k) {
        var g = groups[k];
        html += '<div class="hiring-client-group"><div class="hiring-client-group__header">' + esc(g.label) + ' <span style="color:var(--text-muted);font-weight:400;font-size:0.82rem">(' + g.items.length + ')</span></div><div class="hiring-grid">';
        g.items.forEach(function(p) { html += renderPositionCard(p, candidates); });
        html += '</div></div>';
      });
      if (pausedPositions.length > 0) {
        html += '<div class="hiring-client-group"><div class="hiring-client-group__header" style="color:var(--warning)">Paused <span style="color:var(--text-muted);font-weight:400;font-size:0.82rem">(' + pausedPositions.length + ')</span></div><div class="hiring-grid">';
        pausedPositions.forEach(function(p) { html += renderPositionCard(p, candidates); });
        html += '</div></div>';
      }
      if (closedPositions.length > 0) {
        html += '<div class="hiring-client-group"><div class="hiring-client-group__header" style="color:var(--text-muted)">Closed <span style="color:var(--text-muted);font-weight:400;font-size:0.82rem">(' + closedPositions.length + ')</span></div><div class="hiring-grid">';
        closedPositions.forEach(function(p) { html += renderPositionCard(p, candidates); });
        html += '</div></div>';
      }
    } else if (posSort === 'start') {
      filteredPositions.sort(function(a, b) {
        var da = _parsePositionDesc(a.description);
        var db = _parsePositionDesc(b.description);
        var ma = da.startMonth ? monthOrder.indexOf(da.startMonth.split(' ')[0]) : 99;
        var mb = db.startMonth ? monthOrder.indexOf(db.startMonth.split(' ')[0]) : 99;
        return ma - mb;
      });
      html += '<div class="hiring-grid">';
      filteredPositions.forEach(function(p) { html += renderPositionCard(p, candidates); });
      html += '</div>';
    } else if (posSort === 'status') {
      var statusLabels = { 'open': 'Open', 'paused': 'Paused', 'closed': 'Closed' };
      var statusOrder = { 'open': 0, 'paused': 1, 'closed': 2 };
      filteredPositions.forEach(function(p) {
        var key = p.status || 'open';
        if (!groups[key]) groups[key] = { label: statusLabels[key] || key, items: [], order: statusOrder[key] !== undefined ? statusOrder[key] : 3 };
        groups[key].items.push(p);
      });
      Object.keys(groups).sort(function(a, b) { return groups[a].order - groups[b].order; }).forEach(function(k) {
        var g = groups[k];
        html += '<div class="hiring-client-group"><div class="hiring-client-group__header">' + esc(g.label) + ' <span style="color:var(--text-muted);font-weight:400;font-size:0.82rem">(' + g.items.length + ')</span></div><div class="hiring-grid">';
        g.items.forEach(function(p) { html += renderPositionCard(p, candidates); });
        html += '</div></div>';
      });
    } else {
      filteredPositions.forEach(function(p) {
        var key = p.client_id || '__unassigned__';
        var label = p.client_name || 'Unassigned';
        if (!groups[key]) groups[key] = { label: label, items: [] };
        groups[key].items.push(p);
      });
      Object.keys(groups).sort(function(a, b) { return groups[a].label.localeCompare(groups[b].label); }).forEach(function(k) {
        var g = groups[k];
        html += '<div class="hiring-client-group"><div class="hiring-client-group__header">' + esc(g.label) + ' <span style="color:var(--text-muted);font-weight:400;font-size:0.82rem">(' + g.items.length + ')</span></div><div class="hiring-grid">';
        g.items.forEach(function(p) { html += renderPositionCard(p, candidates); });
        html += '</div></div>';
      });
    }
  }
  container.innerHTML = html;
}

function openCreatePositionModal() {
  var clientOptions = getContractedClientRecords();
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.setAttribute('role', 'dialog');
  modal.innerHTML = '<div class="modal" style="min-width:360px;max-width:480px">' +
    '<div class="modal__title">Create Position</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<label style="font-size:0.78rem;color:var(--text-muted)">Title *<input type="text" id="cpTitle" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px" autofocus></label>' +
      '<label style="font-size:0.78rem;color:var(--text-muted)">Client<select id="cpClient" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">' +
        '<option value="">— None —</option>' + clientOptions.map(function(c) { return '<option value="' + c.id + '"' + (window._hiringFilterClient === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') +
      '</select></label>' +
      '<div style="display:flex;gap:8px">' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Seniority<select id="cpSeniority" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">' +
          '<option value="">—</option><option value="junior">Junior</option><option value="mid">Mid</option><option value="senior">Senior</option><option value="lead">Lead</option><option value="executive">Executive</option></select></label>' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Type<select id="cpType" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">' +
          '<option value="permanent">Permanent</option><option value="contract">Contract</option><option value="freelance">Freelance</option></select></label>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Discipline<select id="cpDiscipline" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">' +
          '<option value="">— None —</option><option value="Engineering">Engineering</option><option value="Art">Art</option><option value="Narrative/Writing">Narrative/Writing</option><option value="Game Design">Game Design</option><option value="QA">QA</option><option value="Production">Production</option><option value="Audio">Audio</option><option value="HR/People">HR/People</option><option value="Leadership">Leadership</option></select></label>' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Location<input type="text" id="cpLocation" placeholder="e.g. Remote, London" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"></label>' +
      '</div>' +
      '<label style="font-size:0.78rem;color:var(--text-muted)">Salary Range<input type="text" id="cpSalary" placeholder="e.g. £50,000 - £70,000" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"></label>' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">' +
      '<button class="btn" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
      '<button class="btn btn--primary" onclick="submitCreatePosition(this)">Create</button>' +
    '</div></div>';
  document.body.appendChild(modal);
  var prevFocus = document.activeElement;
  var innerModal = modal.querySelector('.modal');
  if (typeof _trapFocus === 'function') _trapFocus(innerModal);
  var closeModal = function() { _releaseFocusTrap(innerModal); modal.remove(); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
  modal.onclick = function(e) { if (e.target === modal) closeModal(); };
  var escHandler = function(e) { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
  setTimeout(function() { var el = modal.querySelector('#cpTitle'); if (el) el.focus(); }, 0);
}

async function submitCreatePosition(btn) {
  var title = (document.getElementById('cpTitle') || {}).value;
  if (!title || !title.trim()) { toast('Title is required', 'error'); return; }
  if (btn) btn.disabled = true;
  var overlay = btn ? btn.closest('.modal-overlay') : document.querySelector('.modal-overlay');
  var body = {
    title: title.trim(),
    client_id: (document.getElementById('cpClient') || {}).value || null,
    seniority: (document.getElementById('cpSeniority') || {}).value || null,
    employment_type: (document.getElementById('cpType') || {}).value || 'permanent',
    salary_range: (document.getElementById('cpSalary') || {}).value || null,
    location: (document.getElementById('cpLocation') || {}).value || null,
    discipline: (document.getElementById('cpDiscipline') || {}).value || null,
  };
  try {
    var resp = await authFetch('/api/hiring-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      toast('Position created');
      if (overlay) overlay.remove();
      await loadHiringPositions();
      renderContent();
    } else {
      var err = await resp.json().catch(function() { return {}; });
      toast(err.error || 'Failed to create position', 'error');
      if (btn) btn.disabled = false;
    }
  } catch(e) {
    toast('Failed to create position', 'error');
    if (btn) btn.disabled = false;
  }
}

function renderDatabaseTab(container) {
  var candidates = _candidatesData || [];
  var positions = _hiringPositionsData || [];
  var clients = [];
  var clientSet = {};
  candidates.forEach(function(c) { if (c.client_name && !clientSet[c.client_name]) { clientSet[c.client_name] = true; clients.push(c.client_name); } });
  clients.sort();
  var sources = [];
  var srcSet = {};
  candidates.forEach(function(c) { if (c.source && !srcSet[c.source]) { srcSet[c.source] = true; sources.push(c.source); } });
  sources.sort();
  var stageKeys = (_resolvedHiringStages || HIRING_STAGES.map(function(k) { return { key: k }; })).map(function(s) { return s.key; });

  var filters = window._hiringDbFilters || {};
  var searchTerm = (filters.search || '').toLowerCase();

  var filtered = candidates.slice();
  if (searchTerm) filtered = filtered.filter(function(c) { return [c.name, c.role, c.client_name, c.source].some(function(f) { return (f || '').toLowerCase().indexOf(searchTerm) >= 0; }); });
  if (filters.stage) filtered = filtered.filter(function(c) { return c.stage === filters.stage; });
  if (filters.client) filtered = filtered.filter(function(c) { return c.client_name === filters.client; });
  if (filters.source) filtered = filtered.filter(function(c) { return c.source === filters.source; });
  if (filters.position_id) filtered = filtered.filter(function(c) { return c.position_id === filters.position_id; });
  if (!filters.showArchived) filtered = filtered.filter(function(c) { return !c.archived_at; });
  if (window._hiringDbNeedsAction) {
    filtered = filtered.filter(function(c) {
      var assignees = c.stage_assignees && c.stage_assignees[c.stage] ? c.stage_assignees[c.stage] : [];
      if (assignees.length === 0) return true;
      if (!c.stage_changed_at) return false;
      return Math.floor((Date.now() - new Date(c.stage_changed_at).getTime()) / 86400000) > 14;
    });
    window._hiringDbNeedsAction = false;
  }

  var sort = window._hiringDbSort || 'days_desc';
  filtered.sort(function(a, b) {
    switch (sort) {
      case 'name_asc': return (a.name || '').localeCompare(b.name || '');
      case 'name_desc': return (b.name || '').localeCompare(a.name || '');
      case 'days_desc': return ((b.stage_changed_at ? Date.now() - new Date(b.stage_changed_at).getTime() : 0) - (a.stage_changed_at ? Date.now() - new Date(a.stage_changed_at).getTime() : 0));
      case 'days_asc': return ((a.stage_changed_at ? Date.now() - new Date(a.stage_changed_at).getTime() : 0) - (b.stage_changed_at ? Date.now() - new Date(b.stage_changed_at).getTime() : 0));
      case 'stage_asc': return stageKeys.indexOf(a.stage) - stageKeys.indexOf(b.stage);
      case 'stage_desc': return stageKeys.indexOf(b.stage) - stageKeys.indexOf(a.stage);
      default: return 0;
    }
  });

  var chipsHtml = '';
  if (filters.stage) chipsHtml += '<span class="ats-chip" onclick="delete window._hiringDbFilters.stage;renderContent()">' + esc(HIRING_STAGE_LABELS[filters.stage] || filters.stage) + ' <span class="remove">&#10005;</span></span>';
  if (filters.client) chipsHtml += '<span class="ats-chip" onclick="delete window._hiringDbFilters.client;renderContent()">' + esc(filters.client) + ' <span class="remove">&#10005;</span></span>';
  if (filters.source) chipsHtml += '<span class="ats-chip" onclick="delete window._hiringDbFilters.source;renderContent()">' + esc(filters.source) + ' <span class="remove">&#10005;</span></span>';

  function sortIcon(col) { return sort.indexOf(col) === 0 ? (sort.indexOf('desc') > 0 ? ' &#9660;' : ' &#9650;') : ''; }
  function toggleSort(col) { return 'window._hiringDbSort=window._hiringDbSort===\'' + col + '_asc\'?\'' + col + '_desc\':\'' + col + '_asc\';renderContent()'; }

  var html = '<div class="ats-controls">' +
    '<input class="ats-search" type="text" placeholder="Search candidates..." value="' + esc(filters.search || '') + '" oninput="window._hiringDbFilters=window._hiringDbFilters||{};window._hiringDbFilters.search=this.value;renderContent()">' +
    '<select class="ats-filter-btn" onchange="window._hiringDbFilters=window._hiringDbFilters||{};window._hiringDbFilters.stage=this.value||undefined;renderContent()">' +
      '<option value="">Stage</option>' + stageKeys.map(function(s) { return '<option value="' + s + '"' + (filters.stage === s ? ' selected' : '') + '>' + (HIRING_STAGE_LABELS[s] || s) + '</option>'; }).join('') + '</select>' +
    '<select class="ats-filter-btn" onchange="window._hiringDbFilters=window._hiringDbFilters||{};window._hiringDbFilters.client=this.value||undefined;renderContent()">' +
      '<option value="">Client</option>' + clients.map(function(c) { return '<option value="' + esc(c) + '"' + (filters.client === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
    '<select class="ats-filter-btn" onchange="window._hiringDbFilters=window._hiringDbFilters||{};window._hiringDbFilters.source=this.value||undefined;renderContent()">' +
      '<option value="">Source</option>' + sources.map(function(s) { return '<option value="' + esc(s) + '"' + (filters.source === s ? ' selected' : '') + '>' + esc(s.replace(/-/g, ' ')) + '</option>'; }).join('') + '</select>' +
    '<select class="ats-filter-btn" onchange="window._hiringDbFilters=window._hiringDbFilters||{};window._hiringDbFilters.position_id=this.value||undefined;renderContent()">' +
      '<option value="">Position</option>' + positions.map(function(p) { return '<option value="' + p.id + '"' + (filters.position_id === p.id ? ' selected' : '') + '>' + esc(p.title) + '</option>'; }).join('') + '</select>' +
    '<button class="btn btn--primary" data-action="openCreateCandidateModal" style="margin-left:auto">+ Candidate</button>' +
  '</div>';
  if (chipsHtml) html += '<div class="ats-filter-chips">' + chipsHtml + '</div>';

  html += '<table class="ats-db-table"><thead><tr>' +
    '<th class="sortable" onclick="' + toggleSort('name') + '">Candidate' + sortIcon('name') + '</th>' +
    '<th>Role</th>' +
    '<th class="sortable" onclick="' + toggleSort('stage') + '">Stage' + sortIcon('stage') + '</th>' +
    '<th>Source</th>' +
    '<th class="sortable" onclick="' + toggleSort('days') + '">Days' + sortIcon('days') + '</th>' +
    '<th>Assignee</th>' +
  '</tr></thead><tbody>';

  var teamMembers = _cachedTeamMembers || [];
  var resolvedStages = _resolvedHiringStages || HIRING_STAGES.map(function(k) { return { key: k, label: HIRING_STAGE_LABELS[k] || k }; });

  filtered.forEach(function(c) {
    var stageColor = ATS_STAGE_COLORS[c.stage] || '#6b7280';
    var assignees = c.stage_assignees && c.stage_assignees[c.stage] ? c.stage_assignees[c.stage] : [];
    var assigneeDisplay = assignees.length > 0 ? assignees.join(', ') : '';

    var isRejected = !!c.rejection_category;
    var isDeclined = c.rejection_category === 'candidate-declined';
    var stageOpts = resolvedStages.map(function(s) {
      return '<option value="' + s.key + '"' + (!isRejected && c.stage === s.key ? ' selected' : '') + '>' + esc(s.label) + '</option>';
    }).join('') +
      '<option disabled>───────</option>' +
      '<option value="_rejected"' + (isRejected && !isDeclined ? ' selected' : '') + ' style="color:var(--danger)">Rejected</option>' +
      '<option value="_declined"' + (isDeclined ? ' selected' : '') + ' style="color:var(--warning)">Declined</option>';

    var sourceOpts = '<option value="">—</option>' + CANDIDATE_SOURCES.map(function(s) {
      return '<option value="' + s + '"' + (c.source === s ? ' selected' : '') + '>' + esc(s.replace(/-/g, ' ')) + '</option>';
    }).join('');

    var assigneeOpts = '<option value="">' + (assigneeDisplay || '—') + '</option>' + teamMembers.map(function(m) {
      return '<option value="' + esc(m) + '">' + esc(m) + '</option>';
    }).join('');

    var assigneeChips = assignees.map(function(name, idx) {
      return '<span style="display:inline-flex;align-items:center;gap:2px;background:var(--bg-surface);border-radius:8px;padding:1px 6px;font-size:12px;color:var(--text-muted);margin-right:2px">' + esc(name.split(' ')[0]) +
        '<span style="cursor:pointer;color:var(--text-muted);font-size:12px" onclick="event.stopPropagation();dbRemoveAssignee(\'' + c.id + '\',\'' + esc(c.stage) + '\',' + idx + ')">&times;</span></span>';
    }).join('');

    html += '<tr' + (c.archived_at ? ' style="opacity:0.5"' : '') + '>' +
      '<td style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="openCandidateDetail(\'' + c.id + '\')">' + candidateAvatarHtml(c.name || c.role, 28) + '<span style="font-weight:500">' + esc(c.name || 'Unnamed') + '</span></td>' +
      '<td style="color:var(--text-secondary);cursor:pointer" onclick="openCandidateDetail(\'' + c.id + '\')">' + esc(c.role || '—') + '</td>' +
      '<td><select class="ats-inline-select" aria-label="Stage for ' + esc(c.name || 'candidate') + '" onchange="event.stopPropagation();dbStageChange(\'' + c.id + '\',this.value,this)" style="color:' + (isRejected ? 'var(--danger)' : isDeclined ? 'var(--warning)' : stageColor) + ';font-weight:600">' + stageOpts + '</select></td>' +
      '<td><select class="ats-inline-select" aria-label="Source for ' + esc(c.name || 'candidate') + '" onchange="event.stopPropagation();updateCandidateField(\'' + c.id + '\',\'source\',this.value||null)" style="color:var(--accent-text)">' + sourceOpts + '</select></td>' +
      '<td>' + daysInStageHtml(c.stage_changed_at, c.created_at) + '</td>' +
      '<td><div style="display:flex;flex-wrap:wrap;align-items:center;gap:2px">' + (assigneeChips || '<span style="font-size:12px;color:var(--text-muted);font-style:italic">Unassigned</span>') +
        '<select class="ats-inline-select" aria-label="Add assignee for ' + esc(c.name || 'candidate') + '" onchange="event.stopPropagation();dbAddAssignee(\'' + c.id + '\',\'' + esc(c.stage) + '\',this.value);this.selectedIndex=0" style="color:var(--text-muted);width:auto;min-width:30px"><option value="">+</option>' +
        (_cachedUsers || []).filter(function(u) { return c.client_id ? u.client_id === c.client_id : !u.client_id; }).map(function(u) { return u.display_name; }).sort().map(function(m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('') + '</select></div></td>' +
    '</tr>';
  });

  html += '</tbody></table>';
  html += '<div style="text-align:right;color:var(--text-muted);font-size:12px;padding:8px 12px">Showing ' + filtered.length + ' of ' + candidates.length + ' candidates</div>';
  container.innerHTML = html;
}

async function dbAddAssignee(candidateId, stage, name) {
  if (!name) return;
  var c = (_candidatesData || []).find(function(x) { return x.id === candidateId; });
  if (!c) return;
  var current = (c.stage_assignees && typeof c.stage_assignees === 'object') ? JSON.parse(JSON.stringify(c.stage_assignees)) : {};
  var list = Array.isArray(current[stage]) ? current[stage].slice() : [];
  if (list.indexOf(name) >= 0) { toast(name + ' already assigned', 'warning'); return; }
  list.push(name);
  current[stage] = list;
  await updateCandidateField(candidateId, 'stage_assignees', current);
}

async function dbRemoveAssignee(candidateId, stage, idx) {
  var c = (_candidatesData || []).find(function(x) { return x.id === candidateId; });
  if (!c) return;
  var current = (c.stage_assignees && typeof c.stage_assignees === 'object') ? JSON.parse(JSON.stringify(c.stage_assignees)) : {};
  var list = Array.isArray(current[stage]) ? current[stage].slice() : [];
  list.splice(idx, 1);
  current[stage] = list;
  await updateCandidateField(candidateId, 'stage_assignees', current);
}

async function dbStageChange(candidateId, value, selectEl) {
  if (value === '_rejected') {
    var categories = ['unqualified', 'culture-mismatch', 'compensation', 'timing', 'other'];
    var catOpts = categories.map(function(c) { return '<option value="' + c + '">' + c.replace(/-/g, ' ') + '</option>'; }).join('');
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = '<div class="modal" style="min-width:340px;max-width:420px">' +
      '<div class="modal__title">Reject Candidate</div>' +
      '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:8px">Category<select id="dbRejectCat" style="width:100%;padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);margin-top:4px">' + catOpts + '</select></label>' +
      '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:12px">Reason (optional)<textarea id="dbRejectReason" rows="3" style="width:100%;padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);margin-top:4px;resize:vertical"></textarea></label>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="btn" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
        '<button class="btn btn--primary" style="background:var(--danger)" onclick="dbRejectSubmit(\'' + candidateId + '\')">Reject</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  } else if (value === '_declined') {
    hiringArchiveWithReason(candidateId, 'candidate-declined');
  } else {
    updateCandidateField(candidateId, 'stage', value);
  }
}

async function dbRejectSubmit(candidateId) {
  var category = document.getElementById('dbRejectCat').value;
  var reason = (document.getElementById('dbRejectReason').value || '').trim();
  var modal = document.getElementById('dbRejectCat').closest('.modal-overlay');
  try {
    var resp = await authFetch('/api/candidates/' + candidateId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_category: category, rejection_reason: reason || null, archived_at: new Date().toISOString() })
    });
    if (resp.ok) { toast('Candidate rejected'); if (modal) modal.remove(); await loadCandidates(); if (currentView === 'hiring') renderContent(); }
    else { toast('Failed to reject', 'error'); }
  } catch (e) { toast('Network error', 'error'); }
}

async function renderCalendarTab(container) {
  var weekOffset = window._calendarWeekOffset || 0;
  var viewMode = window._calendarViewMode || 'week';

  var now = new Date();
  var dayOfWeek = now.getDay() || 7;
  var monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1 + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  var friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  var fromStr, toStr;
  if (viewMode === 'month') {
    var mStart = new Date(now.getFullYear(), now.getMonth() + (window._calendarMonthOffset || 0), 1);
    var mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0);
    fromStr = mStart.toISOString().slice(0, 10);
    toStr = new Date(mEnd.getTime() + 86400000).toISOString().slice(0, 10);
  } else {
    fromStr = monday.toISOString().slice(0, 10);
    toStr = new Date(friday.getTime() + 86400000).toISOString().slice(0, 10);
  }

  container.innerHTML = '<div style="padding:20px;color:var(--text-muted)">Loading interviews…</div>';

  var interviews = [];
  try {
    var allConfigs = await apiCall('/api/interview-configs?include=progress');
    if (allConfigs) {
      interviews = allConfigs.filter(function(c) {
        if (!c.scheduled_at) return false;
        var d = c.scheduled_at.slice(0, 10);
        return d >= fromStr && d <= toStr;
      }).map(function(c) {
        return Object.assign({}, c, { title: c.round_type === 'Other' ? (c.round_type_custom || 'Other') : c.round_type });
      });
    }
  } catch (e) { /* empty */ }

  var todayStr = new Date().toISOString().slice(0, 10);
  window._interviewsTodayCount = interviews.filter(function(iv) { return iv.scheduled_at && iv.scheduled_at.slice(0, 10) === todayStr; }).length;

  if (window._calendarFilterPosition) {
    var posCandIds = {};
    (_candidatesData || []).forEach(function(c) { if (c.position_id === window._calendarFilterPosition) posCandIds[c.id] = true; });
    interviews = interviews.filter(function(iv) { return posCandIds[iv.candidate_id]; });
  }

  var positions = _hiringPositionsData || [];
  var dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var monthYear = monthNames[monday.getMonth()] + ' ' + monday.getFullYear();

  var startHour = 8, endHour = 18;
  var totalSlots = (endHour - startHour) * 2;
  var typeColors = { 'Phone Screen': '#3b82f6', 'Technical': '#7c3aed', 'Cultural': '#f59e0b', 'Final': '#10b981' };

  var prevAction = viewMode === 'month'
    ? 'window._calendarMonthOffset=(window._calendarMonthOffset||0)-1;renderContent()'
    : 'window._calendarWeekOffset=(window._calendarWeekOffset||0)-1;renderContent()';
  var nextAction = viewMode === 'month'
    ? 'window._calendarMonthOffset=(window._calendarMonthOffset||0)+1;renderContent()'
    : 'window._calendarWeekOffset=(window._calendarWeekOffset||0)+1;renderContent()';
  var todayAction = viewMode === 'month'
    ? 'window._calendarMonthOffset=0;renderContent()'
    : 'window._calendarWeekOffset=0;renderContent()';

  var html = '<div class="ats-calendar-header">' +
    '<div class="ats-calendar-nav">' +
      '<span class="ats-calendar-nav-title">' + monthYear + '</span>' +
      '<button class="ats-calendar-nav-btn" onclick="' + prevAction + '">&#9664;</button>' +
      '<button class="ats-calendar-nav-btn" onclick="' + todayAction + '">Today (' + dayNames[(now.getDay() || 7) - 1] + ' ' + now.getDate() + ')</button>' +
      '<button class="ats-calendar-nav-btn" onclick="' + nextAction + '">&#9654;</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px;align-items:center">' +
      '<div class="ats-calendar-toggle">' +
        '<span class="' + (viewMode === 'week' ? 'active' : 'inactive') + '" onclick="window._calendarViewMode=\'week\';renderContent()">Week</span>' +
        '<span class="' + (viewMode === 'month' ? 'active' : 'inactive') + '" onclick="window._calendarViewMode=\'month\';renderContent()">Month</span>' +
      '</div>' +
      '<select class="ats-filter-btn" onchange="window._calendarFilterPosition=this.value||null;renderContent()">' +
        '<option value="">All Positions</option>' +
        positions.map(function(p) { return '<option value="' + p.id + '"' + (window._calendarFilterPosition === p.id ? ' selected' : '') + '>' + esc(p.title) + '</option>'; }).join('') +
      '</select>' +
      '<button class="ats-filter-btn" style="background:var(--accent);color:#fff;border:none" onclick="openScheduleInterviewModal()">+ Schedule</button>' +
    '</div>' +
  '</div>';

  if (viewMode === 'week') {
  html += '<div class="ats-week-grid" style="grid-template-rows:auto repeat(' + totalSlots + ',32px)">';
  html += '<div></div>';
  for (var d = 0; d < 5; d++) {
    var dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + d);
    var isToday = dayDate.toISOString().slice(0, 10) === todayStr;
    html += '<div class="ats-week-day-header' + (isToday ? ' today' : '') + '">' + dayNames[d] + ' ' + dayDate.getDate() + '</div>';
  }

  for (var slot = 0; slot < totalSlots; slot++) {
    var slotHour = startHour + Math.floor(slot / 2);
    var slotMin = (slot % 2) * 30;
    if (slotMin === 0) {
      html += '<div class="ats-week-time">' + slotHour + ':00</div>';
    } else {
      html += '<div class="ats-week-time"></div>';
    }

    for (var dd = 0; dd < 5; dd++) {
      var cellDate = new Date(monday);
      cellDate.setDate(monday.getDate() + dd);
      var cellStr = cellDate.toISOString().slice(0, 10);
      var slotInterviews = interviews.filter(function(iv) {
        if (!iv.scheduled_at || iv.scheduled_at.slice(0, 10) !== cellStr) return false;
        var t = new Date(iv.scheduled_at);
        var ivSlot = (t.getHours() - startHour) * 2 + (t.getMinutes() >= 30 ? 1 : 0);
        return ivSlot === slot;
      });

      var blocksHtml = '';
      slotInterviews.forEach(function(iv) {
        var duration = iv.duration_minutes || 60;
        var spans = Math.max(1, Math.round(duration / 30));
        var heightPx = spans * 32 - 4;
        var color = typeColors[iv.title] || '#7c3aed';
        var t = new Date(iv.scheduled_at);
        var endT = new Date(t.getTime() + duration * 60000);
        var timeStr = t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0') + ' – ' + endT.getHours() + ':' + String(endT.getMinutes()).padStart(2, '0');
        var isCompact = duration <= 30;
        var interviewer = iv.scorecards && iv.scorecards[0] ? iv.scorecards[0].interviewer_name : '';

        blocksHtml += '<div class="ats-interview-block' + (isCompact ? ' compact' : '') + '"' +
          ' style="top:0;height:' + heightPx + 'px;background:' + color + '20;border-left:3px solid ' + color + '"' +
          ' onclick="event.stopPropagation();openCandidateDetail(\'' + iv.candidate_id + '\')"' +
          ' title="' + esc(iv.candidate_name || '') + ' · ' + esc(iv.title) + ' · ' + timeStr + '">' +
          '<div style="display:flex;align-items:center;gap:4px">' +
            candidateAvatarHtml(iv.candidate_name, isCompact ? 14 : 18) +
            '<span class="name" style="color:' + color + 'cc">' + esc(iv.candidate_name || 'Unknown') + '</span>' +
          '</div>' +
          (!isCompact ? '<div class="meta">' + esc(iv.title) + '</div><div class="meta">' + timeStr + (iv.location ? ' · ' + esc(iv.location) : '') + '</div>' : '') +
          (interviewer && !isCompact ? '<div style="position:absolute;bottom:3px;right:3px">' + candidateAvatarHtml(interviewer, 16) + '</div>' : '') +
        '</div>';
      });

      var slotTime = String(slotHour).padStart(2,'0') + ':' + String(slotMin).padStart(2,'0');
      html += '<div class="ats-week-cell" onclick="openScheduleInterviewModal(null,\'' + cellStr + '\',\'' + slotTime + '\')">' + blocksHtml + '</div>';
    }
  }
  html += '</div>';

  html += '<div class="ats-calendar-legend">' +
    '<span><span class="ats-calendar-legend-dot" style="background:#7c3aed"></span>Technical</span>' +
    '<span><span class="ats-calendar-legend-dot" style="background:#3b82f6"></span>Phone Screen</span>' +
    '<span><span class="ats-calendar-legend-dot" style="background:var(--success)"></span>Final</span>' +
    '<span><span class="ats-calendar-legend-dot" style="background:#f59e0b"></span>Cultural</span>' +
    '<span style="margin-left:auto">' + interviews.length + ' interview' + (interviews.length !== 1 ? 's' : '') + ' this week</span>' +
  '</div>';
  if (interviews.length === 0) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--text-muted)">' +
      '<div style="font-size:2rem;margin-bottom:8px">📅</div>' +
      '<div style="font-size:0.9rem;margin-bottom:12px">No interviews scheduled this week</div>' +
      '<button class="btn btn--primary btn--sm" onclick="openScheduleInterviewModal()">Schedule an Interview</button></div>';
  }
  } else {
    // Month view
    var monthStart = new Date(monday.getFullYear(), monday.getMonth() + (window._calendarMonthOffset || 0), 1);
    var monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    var firstDay = (monthStart.getDay() || 7) - 1; // Mon=0
    var daysInMonth = monthEnd.getDate();
    var mMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:rgba(255,255,255,0.03);border-radius:8px;overflow:hidden">';
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(function(d) {
      html += '<div style="background:var(--bg-surface);padding:8px;text-align:center;color:var(--text-muted);font-size:12px;font-weight:500">' + d + '</div>';
    });
    for (var blank = 0; blank < firstDay; blank++) {
      html += '<div style="background:var(--bg-card);min-height:80px;padding:4px"></div>';
    }
    for (var day = 1; day <= daysInMonth; day++) {
      var cellDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      var cellStr = cellDate.toISOString().slice(0, 10);
      var isToday = cellStr === todayStr;
      var dayIvs = interviews.filter(function(iv) { return iv.scheduled_at && iv.scheduled_at.slice(0, 10) === cellStr; });
      var dots = '';
      dayIvs.slice(0, 4).forEach(function(iv) {
        var color = typeColors[iv.title] || '#7c3aed';
        dots += '<div style="display:flex;align-items:center;gap:3px;font-size:12px;color:' + color + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:' + color + ';flex-shrink:0"></span>' +
          esc((iv.candidate_name || '').split(' ')[0]) + '</div>';
      });
      if (dayIvs.length > 4) dots += '<div style="font-size:12px;color:var(--text-muted)">+' + (dayIvs.length - 4) + ' more</div>';
      html += '<div style="background:var(--bg-card);min-height:80px;padding:4px;' + (isToday ? 'border:1px solid #60a5fa;' : '') + 'cursor:pointer" onclick="(function(){var d=new Date(' + cellDate.getTime() + ');var now=new Date();var dayNow=now.getDay()||7;var monNow=new Date(now);monNow.setDate(now.getDate()-dayNow+1);monNow.setHours(0,0,0,0);var dayD=d.getDay()||7;var monD=new Date(d);monD.setDate(d.getDate()-dayD+1);monD.setHours(0,0,0,0);window._calendarViewMode=\'week\';window._calendarWeekOffset=Math.round((monD-monNow)/604800000);renderContent();})()">' +
        '<div style="font-size:12px;font-weight:' + (isToday ? '700;color:var(--accent-text)' : '400;color:var(--text-muted)') + ';margin-bottom:2px">' + day + '</div>' +
        dots + '</div>';
    }
    var totalCells = firstDay + daysInMonth;
    var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (var r = 0; r < remaining; r++) {
      html += '<div style="background:var(--bg-card);min-height:80px;padding:4px"></div>';
    }
    html += '</div>';

    html += '<div style="text-align:center;margin-top:8px;font-size:12px;color:var(--text-muted)">' + mMonthNames[monthStart.getMonth()] + ' ' + monthStart.getFullYear() + ' · ' + interviews.length + ' interview' + (interviews.length !== 1 ? 's' : '') + '</div>';
  }

  container.innerHTML = html;
}

function openScheduleInterviewModal(prefillCandidateId, prefillDate, prefillTime) {
  var candidates = (_candidatesData || []).filter(function(c) { return !c.archived_at; });
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = '<div class="modal" style="max-width:500px">' +
    '<div class="modal-header"><h3>Schedule Interview</h3><button onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
    '<div class="modal-body">' +
      '<div id="schedule-conflict-warn" style="display:none;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--danger)"></div>' +
      '<label style="display:block;margin-bottom:10px">Candidate<br><select id="sched-candidate" class="ats-search" style="width:100%;margin-top:4px;min-width:0">' +
        candidates.map(function(c) { return '<option value="' + c.id + '"' + (c.id === prefillCandidateId ? ' selected' : '') + '>' + esc(c.name || c.role) + ' — ' + esc(c.client_name || '') + '</option>'; }).join('') +
      '</select></label>' +
      '<label style="display:block;margin-bottom:10px">Interview Type<br><select id="sched-type" class="ats-search" style="width:100%;margin-top:4px;min-width:0">' +
        '<option value="Phone Screen">Phone Screen</option><option value="Technical">Technical</option><option value="Cultural">Cultural</option><option value="Final">Final</option></select></label>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<label style="flex:1">Date<br><input id="sched-date" type="date" class="ats-search" style="width:100%;margin-top:4px;min-width:0" value="' + (prefillDate || new Date().toISOString().slice(0, 10)) + '"></label>' +
        '<label style="flex:1">Time<br><input id="sched-time" type="time" class="ats-search" style="width:100%;margin-top:4px;min-width:0" value="' + (prefillTime || '09:00') + '"></label>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<label style="flex:1">Duration<br><select id="sched-duration" class="ats-search" style="width:100%;margin-top:4px;min-width:0">' +
          '<option value="30">30 min</option><option value="45">45 min</option><option value="60" selected>60 min</option><option value="90">90 min</option></select></label>' +
        '<label style="flex:1">Interviewer<br><input id="sched-interviewer" type="text" class="ats-search" style="width:100%;margin-top:4px;min-width:0" placeholder="Name"></label>' +
      '</div>' +
      '<label style="display:block;margin-bottom:10px">Location<br><input id="sched-location" type="text" class="ats-search" style="width:100%;margin-top:4px;min-width:0" placeholder="Zoom link, Office, etc."></label>' +
    '</div>' +
    '<div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px">' +
      '<button onclick="this.closest(\'.modal-overlay\').remove()" style="padding:8px 16px;background:var(--bg-surface);color:var(--text-muted);border:none;border-radius:6px;cursor:pointer">Cancel</button>' +
      '<button onclick="submitScheduleInterview()" style="padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer">Schedule</button>' +
    '</div></div>';
  document.body.appendChild(modal);
}

async function submitScheduleInterview() {
  var candidateId = document.getElementById('sched-candidate').value;
  var title = document.getElementById('sched-type').value;
  var date = document.getElementById('sched-date').value;
  var time = document.getElementById('sched-time').value;
  var duration = parseInt(document.getElementById('sched-duration').value);
  var interviewer = document.getElementById('sched-interviewer').value.trim();
  var location = document.getElementById('sched-location').value.trim();
  if (!candidateId || !date || !time) return;
  var scheduledAt = new Date(date + 'T' + time).toISOString();

  await doCreateInterview(candidateId, title, scheduledAt, duration, interviewer, location);
}

async function doCreateInterview(candidateId, title, scheduledAt, duration, interviewer, location) {
  var roundTypeMap = { 'Phone Screen': 'Phone Screen', 'Technical': 'Technical', 'Technical Interview': 'Technical', 'Cultural': 'Cultural', 'Cultural Fit': 'Cultural', 'Final': 'Final', 'Final Interview': 'Final' };
  var roundType = roundTypeMap[title] || title || 'Phone Screen';
  try {
    var resp = await authFetch('/api/interview-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, round_type: roundType, scheduled_at: scheduledAt, duration_minutes: duration || 60, interviewer_name: interviewer || undefined, location: location || undefined }),
    });
    if (resp.ok) {
      var overlays = document.querySelectorAll('.modal-overlay');
      overlays.forEach(function(o) { if (o.style.display === 'flex' || o.classList.contains('open')) o.remove(); });
      toast('Interview scheduled');
      renderContent();
    } else {
      var err = await resp.json().catch(function() { return {}; });
      toast(err.error || 'Failed to schedule', 'error');
    }
  } catch (e) { toast('Network error', 'error'); }
}

function renderMetricsTab(container) {
  var allCandidates = _candidatesData || [];
  var selectedRole = window._metricsRoleFilter || '';
  var candidates = selectedRole ? allCandidates.filter(function(c) { return c.role === selectedRole; }) : allCandidates;
  var active = candidates.filter(function(c) { return !c.archived_at; });
  var clientOptions = getContractedClientRecords() || [];
  var stageKeys = (_resolvedHiringStages || HIRING_STAGES.map(function(k) { return { key: k, label: HIRING_STAGE_LABELS[k] || k }; }));

  // Collect unique active roles for the filter dropdown
  var roleSet = {};
  allCandidates.forEach(function(c) { if (c.role && !c.archived_at) roleSet[c.role] = (roleSet[c.role] || 0) + 1; });
  var roles = Object.keys(roleSet).sort();

  // Source effectiveness: count candidates per source, show conversion (non-sourcing = progressed)
  var sourceCounts = {};
  var sourceProgressed = {};
  candidates.forEach(function(c) {
    var src = c.source || 'unknown';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    if (c.stage !== 'sourcing') sourceProgressed[src] = (sourceProgressed[src] || 0) + 1;
  });
  var sourceKeys = Object.keys(sourceCounts).sort(function(a, b) { return sourceCounts[b] - sourceCounts[a]; });
  var maxSourceCount = Math.max.apply(null, sourceKeys.map(function(s) { return sourceCounts[s]; }).concat([1]));

  // Time in stage distribution
  var stageTimeBuckets = {};
  stageKeys.forEach(function(s) { stageTimeBuckets[s.key] = { total: 0, count: 0 }; });
  active.forEach(function(c) {
    if (c.stage && c.stage_changed_at && stageTimeBuckets[c.stage]) {
      stageTimeBuckets[c.stage].total += Math.floor((Date.now() - new Date(c.stage_changed_at).getTime()) / 86400000);
      stageTimeBuckets[c.stage].count++;
    }
  });

  // Pipeline summary stats
  var totalActive = active.length;
  var totalArchived = candidates.length - totalActive;
  var avgDaysAll = 0;
  if (active.length > 0) {
    var sumDays = 0;
    active.forEach(function(c) {
      if (c.stage_changed_at) sumDays += Math.floor((Date.now() - new Date(c.stage_changed_at).getTime()) / 86400000);
    });
    avgDaysAll = Math.round(sumDays / active.length);
  }

  var html = '<div style="padding:var(--space-lg)">';

  // Role filter dropdown
  if (roles.length > 1) {
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">' +
      '<label style="font-size:12px;color:var(--text-muted)">Filter by role</label>' +
      '<select class="ats-filter-btn" style="min-width:200px" onchange="window._metricsRoleFilter=this.value;renderContent()">' +
        '<option value="">All roles</option>' +
        roles.map(function(r) { return '<option value="' + esc(r) + '"' + (selectedRole === r ? ' selected' : '') + '>' + esc(r) + ' (' + roleSet[r] + ')</option>'; }).join('') +
      '</select>' +
      (selectedRole ? '<button class="btn btn--sm btn--ghost" onclick="window._metricsRoleFilter=\'\';renderContent()">Clear</button>' : '') +
    '</div>';
  }

  // Summary stat cards
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px">';
  var stats = [
    { label: 'Active candidates', value: totalActive, color: 'var(--accent)' },
    { label: 'Archived / rejected', value: totalArchived, color: 'var(--text-muted)' },
    { label: 'Avg days in stage', value: avgDaysAll + 'd', color: avgDaysAll > 10 ? 'var(--danger)' : 'var(--success)' },
    { label: 'Sources used', value: sourceKeys.length, color: 'var(--accent-text)' },
  ];
  stats.forEach(function(s) {
    html += '<div style="background:var(--bg-surface);border-radius:8px;padding:16px;border-left:3px solid ' + s.color + '">' +
      '<div style="font-size:24px;font-weight:700;color:var(--text-primary)">' + s.value + '</div>' +
      '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">' + s.label + '</div></div>';
  });
  html += '</div>';

  // Pipeline funnel
  html += '<div style="margin-bottom:28px"><div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:12px">Pipeline</div>';
  stageKeys.forEach(function(s) {
    var count = active.filter(function(c) { return c.stage === s.key; }).length;
    var pct = totalActive > 0 ? Math.round(count / totalActive * 100) : 0;
    var stageColor = ATS_STAGE_COLORS[s.key] || '#6b7280';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">' +
      '<span style="width:100px;font-size:12px;color:var(--text-muted);text-align:right;flex-shrink:0">' + esc(s.label) + '</span>' +
      '<div style="flex:1;height:24px;background:var(--bg-surface);border-radius:4px;overflow:hidden">' +
        '<div style="width:' + pct + '%;min-width:' + (count > 0 ? '30px' : '0') + ';height:100%;background:' + stageColor + ';border-radius:4px;display:flex;align-items:center;padding-left:8px;font-size:12px;color:white;font-weight:600">' + count + '</div>' +
      '</div>' +
      '<span style="font-size:12px;color:var(--text-muted);width:40px">' + pct + '%</span>' +
    '</div>';
  });
  html += '</div>';

  // Source effectiveness
  html += '<div style="margin-bottom:28px"><div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:12px">Source Effectiveness</div>';
  if (sourceKeys.length === 0) {
    html += '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No source data — set sources on candidates</div>';
  } else {
    sourceKeys.forEach(function(src) {
      var count = sourceCounts[src];
      var prog = sourceProgressed[src] || 0;
      var convRate = count > 0 ? Math.round(prog / count * 100) : 0;
      var barW = Math.round(count / maxSourceCount * 100);
      var label = src === 'unknown' ? 'No source' : src.replace(/-/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
      html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">' +
        '<span style="width:100px;font-size:12px;color:var(--text-muted);text-align:right;flex-shrink:0">' + esc(label) + '</span>' +
        '<div style="flex:1;height:20px;background:var(--bg-surface);border-radius:4px;overflow:hidden;position:relative">' +
          '<div style="width:' + barW + '%;height:100%;background:#3b82f630;border-radius:4px"></div>' +
          '<div style="position:absolute;top:0;left:0;width:' + Math.round(barW * convRate / 100) + '%;height:100%;background:#3b82f6;border-radius:4px"></div>' +
        '</div>' +
        '<span style="font-size:12px;color:var(--accent-text);width:30px;text-align:right">' + count + '</span>' +
        '<span style="font-size:12px;color:' + (convRate >= 50 ? '#10b981' : 'var(--text-muted)') + ';width:60px" title="Progressed past sourcing">' + convRate + '%</span>' +
      '</div>';
    });
    html += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">Dark bar = total candidates from source · Bright bar = progressed past sourcing</div>';
  }
  html += '</div>';

  // Time in stage distribution
  html += '<div style="margin-bottom:28px"><div style="display:flex;align-items:baseline;gap:12px;margin-bottom:12px"><span style="font-size:14px;font-weight:600;color:var(--text-primary)">Average Time in Stage</span><span style="font-size:12px;color:var(--text-muted)">Green &lt;7d · Amber 7-14d · Red &gt;14d</span></div>';
  var maxAvgDays = 1;
  stageKeys.forEach(function(s) { var b = stageTimeBuckets[s.key]; if (b.count > 0) { var avg = Math.round(b.total / b.count); if (avg > maxAvgDays) maxAvgDays = avg; } });
  stageKeys.forEach(function(s) {
    var b = stageTimeBuckets[s.key];
    var avg = b.count > 0 ? Math.round(b.total / b.count) : 0;
    var barW = maxAvgDays > 0 ? Math.round(avg / maxAvgDays * 100) : 0;
    var stageColor = ATS_STAGE_COLORS[s.key] || '#6b7280';
    var daysColor = avg > 14 ? 'var(--danger)' : avg > 7 ? 'var(--warning)' : 'var(--text-muted)';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">' +
      '<span style="width:100px;font-size:12px;color:var(--text-muted);text-align:right;flex-shrink:0">' + esc(s.label) + '</span>' +
      '<div style="flex:1;height:20px;background:var(--bg-surface);border-radius:4px;overflow:hidden">' +
        '<div style="width:' + barW + '%;min-width:' + (avg > 0 ? '20px' : '0') + ';height:100%;background:' + stageColor + ';border-radius:4px;display:flex;align-items:center;padding-left:6px;font-size:12px;color:white;font-weight:600">' + (avg > 0 ? avg + 'd' : '') + '</div>' +
      '</div>' +
      '<span style="font-size:12px;color:' + daysColor + ';width:40px">' + b.count + ' cand</span>' +
    '</div>';
  });
  html += '</div>';

  // Per-client detailed metrics (existing loadHiringMetrics)
  html += '<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px">' +
    '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:12px">Client Metrics</div>' +
    '<div class="ats-controls">' +
      '<select id="metricsClientFilter" onchange="loadHiringMetrics()" class="ats-filter-btn" style="min-width:200px">' +
        '<option value="">Select a client…</option>' +
        clientOptions.map(function(c) { return '<option value="' + c.id + '"' + (window._hiringFilterClient === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') +
      '</select>' +
    '</div>' +
    '<div id="metricsContent" style="color:var(--text-muted);padding:12px 0">Select a client for detailed pipeline and time-to-hire metrics</div>' +
  '</div>';

  html += '</div>';
  container.innerHTML = html;
}

async function renderQuestionsTab(container) {
  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const DISCIPLINES = ['Engineering','Art','Narrative/Writing','Game Design','QA','Production','Audio','HR/People','Leadership'];
  const CATEGORIES = ['culture','technical','collaboration','leadership','depth'];
  const CATEGORY_ORDER = { culture: 0, technical: 1, collaboration: 2, leadership: 3, depth: 4 };

  const filterClient = window._qbFilterClient || window._hiringFilterClient || '';
  const filterDisc = window._qbFilterDisc || '';
  const filterCat = window._qbFilterCat || '';
  const filterSearch = window._qbFilterSearch || '';

  const clientOptions = getContractedClientRecords();
  let html = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px">';
  html += '<select onchange="window._qbFilterClient=this.value;renderContent()" style="font-size:13px;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">';
  html += '<option value="">All clients</option>';
  clientOptions.forEach(c => { html += '<option value="' + c.id + '"' + (filterClient === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; });
  html += '</select>';
  html += '<select onchange="window._qbFilterDisc=this.value;renderContent()" style="font-size:13px;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">';
  html += '<option value="">All disciplines</option>';
  DISCIPLINES.forEach(d => { html += '<option value="' + d + '"' + (filterDisc === d ? ' selected' : '') + '>' + d + '</option>'; });
  html += '</select>';
  html += '<div style="display:flex;gap:4px">';
  html += '<span style="padding:4px 10px;border-radius:12px;font-size:12px;cursor:pointer;' + (!filterCat ? 'background:var(--accent);color:#fff' : 'background:var(--bg-elevated);color:var(--text-muted)') + '" onclick="window._qbFilterCat=\'\';renderContent()">All</span>';
  CATEGORIES.forEach(cat => {
    html += '<span style="padding:4px 10px;border-radius:12px;font-size:12px;cursor:pointer;text-transform:capitalize;' + (filterCat === cat ? 'background:var(--accent);color:#fff' : 'background:var(--bg-elevated);color:var(--text-muted)') + '" onclick="window._qbFilterCat=\'' + cat + '\';renderContent()">' + cat + '</span>';
  });
  html += '</div>';
  html += '<input type="text" placeholder="Search questions…" value="' + esc(filterSearch) + '" oninput="window._qbFilterSearch=this.value;clearTimeout(window._qbSearchTimer);window._qbSearchTimer=setTimeout(function(){renderContent()},300)" style="font-size:13px;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);min-width:150px">';
  if (isAdmin) html += '<button class="btn btn--primary btn--sm" style="margin-left:auto" onclick="window._qbOpenModal()">+ New Question</button>';
  html += '</div>';

  container.innerHTML = html + '<div id="qbQuestionsList" style="color:var(--text-muted)">Loading questions…</div>';

  const params = new URLSearchParams();
  if (filterClient) params.set('client_id', filterClient);
  if (filterDisc) params.set('discipline', filterDisc);
  let questions = [];
  try {
    const resp = await authFetch('/api/interview-questions?' + params);
    if (resp.ok) questions = await resp.json();
  } catch (e) {}

  if (filterCat) questions = questions.filter(q => q.category === filterCat);
  if (filterSearch) {
    const s = filterSearch.toLowerCase();
    questions = questions.filter(q => q.question_text.toLowerCase().includes(s));
  }

  const grouped = {};
  questions.forEach(q => {
    const d = q.discipline || 'General';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(q);
  });
  for (const d in grouped) grouped[d].sort((a, b) => (CATEGORY_ORDER[a.category] || 99) - (CATEGORY_ORDER[b.category] || 99));

  const listEl = document.getElementById('qbQuestionsList');
  if (!listEl) return;

  if (questions.length === 0) {
    listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">No questions match your filters. Try adjusting your search or filters.</div>';
    return;
  }

  let listHtml = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">' + questions.length + ' question' + (questions.length !== 1 ? 's' : '') + '</div>';
  const catColours = { culture: '#3b82f6', technical: '#7c3aed', collaboration: '#16a34a', leadership: '#d97706', depth: '#e8a87c' };
  const sourceColours = { curated: '#16a34a', custom: '#3b82f6', ai_generated: '#7c3aed' };

  for (const disc of Object.keys(grouped).sort()) {
    const qs = grouped[disc];
    listHtml += '<div style="margin-bottom:16px">';
    listHtml += '<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);font-weight:600;margin-bottom:8px">' + esc(disc) + ' <span style="color:var(--text-muted);font-weight:400">(' + qs.length + ')</span></div>';
    for (const q of qs) {
      listHtml += '<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:6px;margin-bottom:4px;background:var(--bg-card)">';
      listHtml += '<div style="flex:1;min-width:0"><div style="font-size:14px;line-height:1.5;color:var(--text-primary)">' + esc(q.question_text) + '</div>';
      listHtml += '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">';
      listHtml += '<span style="font-size:12px;padding:1px 8px;border-radius:8px;background:color-mix(in srgb, ' + (catColours[q.category] || 'var(--accent)') + ' 15%, transparent);color:' + (catColours[q.category] || 'var(--accent)') + '">' + q.category + '</span>';
      listHtml += '<span style="font-size:12px;padding:1px 8px;border-radius:8px;background:color-mix(in srgb, ' + (sourceColours[q.source] || '#6b7280') + ' 15%, transparent);color:' + (sourceColours[q.source] || '#6b7280') + '">' + q.source + '</span>';
      if (q.created_by_name) listHtml += '<span style="font-size:12px;color:var(--text-muted)">by ' + esc(q.created_by_name) + '</span>';
      listHtml += '</div></div>';
      if (isAdmin) {
        listHtml += '<div style="display:flex;gap:4px;flex-shrink:0">';
        listHtml += '<button class="btn btn--ghost btn--sm" onclick="window._qbEdit(\'' + q.id + '\')" title="Edit">&#9998;</button>';
        listHtml += '<button class="btn btn--ghost btn--sm" style="color:var(--danger)" onclick="window._qbDelete(\'' + q.id + '\')" title="Delete">&times;</button>';
        listHtml += '</div>';
      }
      listHtml += '</div>';
    }
    listHtml += '</div>';
  }
  listEl.innerHTML = listHtml;

  window._qbQuestions = questions;
}

window._qbOpenModal = function(existingId) {
  const DISCIPLINES = ['Engineering','Art','Narrative/Writing','Game Design','QA','Production','Audio','HR/People','Leadership'];
  const CATEGORIES = ['culture','technical','collaboration','leadership','depth'];
  const existing = existingId ? (window._qbQuestions || []).find(q => q.id === existingId) : null;
  const isEdit = !!existing;
  const clientOptions = getContractedClientRecords();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = '<div class="modal" style="min-width:400px;max-width:560px">' +
    '<div class="modal__title">' + (isEdit ? 'Edit Question' : 'New Question') + '</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<label style="font-size:0.78rem;color:var(--text-muted)">Question *<textarea id="qbModalText" rows="4" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px;resize:vertical">' + (existing ? esc(existing.question_text) : '') + '</textarea></label>' +
      '<div style="display:flex;gap:8px">' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Discipline *<select id="qbModalDisc" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">' +
          DISCIPLINES.map(d => '<option value="' + d + '"' + (existing && existing.discipline === d ? ' selected' : '') + '>' + d + '</option>').join('') +
        '</select></label>' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Category *<select id="qbModalCat" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">' +
          CATEGORIES.map(c => '<option value="' + c + '"' + (existing && existing.category === c ? ' selected' : '') + '>' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>').join('') +
        '</select></label>' +
      '</div>' +
      (!isEdit ? '<label style="font-size:0.78rem;color:var(--text-muted)">Client<select id="qbModalClient" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"><option value="">— None —</option>' + clientOptions.map(c => '<option value="' + c.id + '"' + (window._qbFilterClient === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>' : '') +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">' +
      '<button class="btn" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
      '<button class="btn btn--primary" onclick="window._qbModalSave(\'' + (existingId || '') + '\')">' + (isEdit ? 'Save' : 'Create') + '</button>' +
    '</div></div>';

  document.body.appendChild(modal);
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  setTimeout(() => { var el = modal.querySelector('#qbModalText'); if (el) el.focus(); }, 0);
};

window._qbModalSave = async function(existingId) {
  const text = (document.getElementById('qbModalText') || {}).value;
  if (!text || !text.trim()) { toast('Question text is required', 'error'); return; }
  const discipline = (document.getElementById('qbModalDisc') || {}).value;
  const category = (document.getElementById('qbModalCat') || {}).value;

  if (existingId) {
    await authFetch('/api/interview-questions/' + existingId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_text: text.trim(), discipline, category }),
    });
  } else {
    const client_id = (document.getElementById('qbModalClient') || {}).value || null;
    await authFetch('/api/interview-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_text: text.trim(), discipline, category, client_id, source: 'custom' }),
    });
  }
  document.querySelector('.modal-overlay')?.remove();
  renderContent();
};

window._qbEdit = function(id) { window._qbOpenModal(id); };

window._qbDelete = async function(id) {
  if (!confirm('Delete this question? This cannot be undone.')) return;
  await authFetch('/api/interview-questions/' + id, { method: 'DELETE' });
  renderContent();
};

/** Open position detail slide-in panel */
async function openPositionDetail(id) {
  const overlay = document.getElementById('positionDetailOverlay');
  const panel = document.getElementById('positionDetailPanel');
  if (!overlay || !panel) return;

  const positions = _hiringPositionsData || [];
  const p = positions.find(pos => pos.id === id);
  if (!p) return;

  const d = _parsePositionDesc(p.description);
  const days = _positionDaysOpen(p);
  const candidates = (_candidatesData || []).filter(c => c.position_id === id);
  const activeCandidates = candidates.filter(c => !c.archived_at);
  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const canSeeSalary = isAdmin;

  const statusBadge = p.status === 'filled'
    ? '<span style="background:var(--text-muted);color:#fff;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:600;text-transform:uppercase">Filled</span>'
    : '<span style="background:var(--success);color:#fff;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:600;text-transform:uppercase">Open</span>';

  const seniorityLabel = p.seniority ? p.seniority.charAt(0).toUpperCase() + p.seniority.slice(1) : '—';
  const seniorityOptions = ['executive','lead','senior','mid','junior'];
  const inputStyle = 'font-size:0.85rem;padding:5px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);width:100%';

  // Candidate listing table
  let candidateTableHtml = '';
  if (activeCandidates.length > 0) {
    candidateTableHtml = `<table class="position-detail__candidates-table">
      <thead><tr><th>Name</th><th>Stage</th><th>Days in Stage</th><th>Last Activity</th></tr></thead><tbody>`;
    activeCandidates.forEach(c => {
      const name = c.name && c.name.trim() ? c.name : (c.role || 'Unnamed');
      const stageLabel = (typeof HIRING_STAGE_LABELS !== 'undefined' && HIRING_STAGE_LABELS[c.stage]) || c.stage;
      const updated = c.updated_at ? new Date(c.updated_at) : null;
      const daysInStage = updated ? Math.floor((Date.now() - updated.getTime()) / 86400000) : 0;
      const disClass = daysInStage > 14 ? 'position-card__days--red' : daysInStage > 7 ? 'position-card__days--amber' : 'position-card__days--green';
      const lastAct = updated ? updated.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
      candidateTableHtml += `<tr data-action="openCandidateFromPosition" data-arg0="${c.id}" title="Open candidate detail" style="cursor:pointer">
        <td style="font-weight:500">${esc(name)}</td>
        <td><span class="hiring-stage-badge hiring-stage-badge--${c.stage}" style="font-size:0.75rem;padding:2px 7px">${esc(stageLabel)}</span></td>
        <td><span class="${disClass}">${daysInStage}d</span></td>
        <td style="color:var(--text-muted)">${lastAct}</td>
      </tr>`;
    });
    candidateTableHtml += '</tbody></table>';
  } else {
    candidateTableHtml = '<div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0;font-style:italic">No candidates linked to this position yet</div>';
  }

  panel.innerHTML = `
    <div class="position-detail-panel__resize" id="positionResizeHandle"></div>
    <div class="position-detail__header">
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:var(--space-sm);align-items:center;margin-bottom:6px;flex-wrap:wrap">
          ${statusBadge}
          ${p.client_name ? `<span style="font-size:0.78rem;color:var(--text-muted)">${esc(p.client_name)}</span>` : ''}
        </div>
        ${isAdmin
          ? `<input type="text" value="${esc(p.title)}" style="font-size:1.1rem;font-weight:600;border:none;background:transparent;color:var(--text-primary);width:100%;padding:0;outline:none;border-bottom:1px solid transparent" onfocus="this.style.borderBottomColor='var(--accent)'" onblur="this.style.borderBottomColor='transparent';if(this.value.trim()&&this.value!=='${esc(p.title)}')updatePositionField('${p.id}','title',this.value.trim())">`
          : `<h3 style="font-size:1.1rem;font-weight:600;margin:0;word-break:break-word">${esc(p.title)}</h3>`
        }
        ${!isAdmin && (p.seniority || p.discipline) ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">${p.seniority ? esc(seniorityLabel) + ' level' : ''}${p.seniority && p.discipline ? ' · ' : ''}${p.discipline ? esc(p.discipline) : ''}</div>` : ''}
      </div>
      <button class="btn btn--ghost btn--sm" data-action="closePositionDetail" aria-label="Close" style="flex-shrink:0;font-size:1.2rem">&times;</button>
    </div>
    <div class="position-detail__body">

      ${isAdmin ? `<div style="display:flex;gap:12px;margin-bottom:var(--space-lg);flex-wrap:wrap">
        <div style="flex:1;min-width:120px">
          <div class="position-detail__info-label" style="margin-bottom:4px">Status</div>
          <select style="${inputStyle}" onchange="handlePositionStatusChange('${p.id}',this.value,this)">
            <option value="open" ${p.status==='open'?'selected':''}>Open</option>
            <option value="paused" ${p.status==='paused'?'selected':''}>Paused</option>
            <option value="closed" ${p.status==='closed'?'selected':''}>Closed</option>
          </select>
          ${p.status === 'closed' ? `<div style="font-size:0.75rem;margin-top:4px;color:var(--text-muted)">${p.closed_reason === 'filled' ? 'Filled' + (p.filled_by_candidate_name ? ' by ' + esc(p.filled_by_candidate_name) : '') : 'Shut down'}${p.closed_at ? ' · ' + new Date(p.closed_at).toLocaleDateString() : ''}</div>` : ''}
        </div>
        <div style="flex:1;min-width:120px">
          <div class="position-detail__info-label" style="margin-bottom:4px">Seniority</div>
          <select style="${inputStyle}" onchange="updatePositionField('${p.id}','seniority',this.value||null)">
            <option value="">— None —</option>
            ${seniorityOptions.map(s => `<option value="${s}" ${p.seniority===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:120px">
          <div class="position-detail__info-label" style="margin-bottom:4px">Discipline</div>
          <select style="${inputStyle}" onchange="updatePositionField('${p.id}','discipline',this.value||null)">
            <option value="">— None —</option>
            ${['Engineering','Art','Narrative/Writing','Game Design','QA','Production','Audio','HR/People','Leadership'].map(d => `<option value="${d}" ${p.discipline===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>` : ''}

      <div class="position-detail__info-grid">
        <div class="position-detail__info-item">
          <span class="position-detail__info-label">Days Open</span>
          <span class="position-detail__info-value ${_daysOpenClass(days)}">${days} days</span>
        </div>
        ${d.priority !== null ? `<div class="position-detail__info-item">
          <span class="position-detail__info-label">Priority</span>
          <span class="position-detail__info-value">${'P' + d.priority}</span>
        </div>` : ''}
        ${d.recruitStatus ? `<div class="position-detail__info-item">
          <span class="position-detail__info-label">Recruitment Status</span>
          <span class="position-detail__info-value">${esc(d.recruitStatus)}</span>
        </div>` : ''}
      </div>

      ${isAdmin ? `<div style="display:flex;gap:12px;margin-bottom:var(--space-lg);flex-wrap:wrap">
        <div style="flex:1;min-width:140px">
          <div class="position-detail__info-label" style="margin-bottom:4px">Salary Range</div>
          <input type="text" value="${esc(p.salary_range || '')}" placeholder="e.g. £45,000-£55,000" style="${inputStyle}" onchange="updatePositionField('${p.id}','salary_range',this.value||null)">
        </div>
        <div style="flex:1;min-width:120px">
          <div class="position-detail__info-label" style="margin-bottom:4px">Employment Type</div>
          <select style="${inputStyle}" onchange="updatePositionField('${p.id}','employment_type',this.value)">
            ${['permanent','contract','freelance'].map(t => `<option value="${t}" ${p.employment_type===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:140px">
          <div class="position-detail__info-label" style="margin-bottom:4px">Location</div>
          <input type="text" value="${esc(p.location || '')}" placeholder="e.g. Remote, London" style="${inputStyle}" onchange="updatePositionField('${p.id}','location',this.value||null)">
        </div>
      </div>` : `<div class="position-detail__info-grid" style="margin-bottom:var(--space-lg)">
        ${!isClientUser() && p.salary_range ? `<div class="position-detail__info-item"><span class="position-detail__info-label">Salary</span><span class="position-detail__info-value">${esc(p.salary_range)}</span></div>` : ''}
        ${p.employment_type ? `<div class="position-detail__info-item"><span class="position-detail__info-label">Type</span><span class="position-detail__info-value">${esc(p.employment_type.charAt(0).toUpperCase()+p.employment_type.slice(1))}</span></div>` : ''}
        ${p.location ? `<div class="position-detail__info-item"><span class="position-detail__info-label">Location</span><span class="position-detail__info-value">${esc(p.location)}</span></div>` : ''}
      </div>`}

      ${isAdmin ? `<div style="margin-bottom:var(--space-lg)">
        <div class="position-detail__info-label" style="margin-bottom:4px">Job Description</div>
        ${p.jd_filename
          ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:0.82rem;font-weight:500">${esc(p.jd_original_name || p.jd_filename)}</span>
              <button class="btn btn--sm" onclick="openDocumentPreview('/api/hiring-positions/${p.id}/jd/preview','/api/hiring-positions/${p.id}/jd','${esc(p.jd_original_name || '')}')">Preview</button>
              <a href="/api/hiring-positions/${p.id}/jd" class="btn btn--sm" download style="text-decoration:none">Download</a>
              <label class="btn btn--sm" style="cursor:pointer">Replace<input type="file" accept=".docx,.pdf" style="display:none" onchange="uploadPositionJD('${p.id}',this)"></label>
            </div>`
          : `<div style="display:flex;align-items:center;gap:8px">
              <span style="color:var(--text-muted);font-size:0.82rem">No job description attached</span>
              <label class="btn btn--sm btn--primary" style="cursor:pointer">Upload<input type="file" accept=".docx,.pdf" style="display:none" onchange="uploadPositionJD('${p.id}',this)"></label>
            </div>`
        }
      </div>` : (p.jd_filename ? `<div style="margin-bottom:var(--space-lg)">
        <div class="position-detail__info-label" style="margin-bottom:4px">Job Description</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:0.82rem;font-weight:500">${esc(p.jd_original_name || p.jd_filename)}</span>
          <button class="btn btn--sm" onclick="openDocumentPreview('/api/hiring-positions/${p.id}/jd/preview','/api/hiring-positions/${p.id}/jd','${esc(p.jd_original_name || '')}')">Preview</button>
          <a href="/api/hiring-positions/${p.id}/jd" class="btn btn--sm" download style="text-decoration:none">Download</a>
        </div>
      </div>` : '')}

      ${isAdmin ? `<div style="margin-bottom:var(--space-lg)">
        <div class="position-detail__info-label" style="margin-bottom:4px">Interview Panel</div>
        <div id="pdPanel">
          ${(Array.isArray(p.interview_panel) ? p.interview_panel : []).map((m, i) => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:0.82rem"><span style="flex:1;font-weight:500">${esc(m.name || 'Unknown')}</span><span style="color:var(--text-muted)">${esc(m.role || '')}</span><button class="btn btn--ghost btn--sm" style="color:var(--danger);font-size:0.75rem" onclick="positionRemovePanelMember('${p.id}',${i})">&times;</button></div>`).join('')}
          ${(Array.isArray(p.interview_panel) ? p.interview_panel : []).length === 0 ? '<div style="color:var(--text-muted);font-size:0.78rem">No panel members</div>' : ''}
        </div>
        <div style="display:flex;gap:6px;margin-top:4px">
          <select id="pdPanelUser" style="${inputStyle};flex:1"><option value="">+ Add panel member…</option>${(_cachedUsers || []).filter(u => !p.client_id || !u.client_id || u.client_id === p.client_id).map(u => `<option value="${u.id}" data-name="${esc(u.display_name)}">${esc(u.display_name)}</option>`).join('')}</select>
          <input type="text" id="pdPanelRole" placeholder="Role (e.g. Technical)" style="${inputStyle};flex:1">
          <button class="btn btn--sm" onclick="positionAddPanelMember('${p.id}')">Add</button>
        </div>
      </div>` : (Array.isArray(p.interview_panel) && p.interview_panel.length > 0 ? `<div style="margin-bottom:var(--space-lg)">
        <div class="position-detail__info-label" style="margin-bottom:4px">Interview Panel</div>
        ${p.interview_panel.map(m => `<div style="font-size:0.82rem;padding:2px 0"><span style="font-weight:500">${esc(m.name || 'Unknown')}</span> <span style="color:var(--text-muted)">— ${esc(m.role || '')}</span></div>`).join('')}
      </div>` : '')}

      ${isAdmin ? `<div style="margin-bottom:var(--space-lg)">
        <div class="position-detail__info-label" style="margin-bottom:4px">Description</div>
        <textarea rows="4" style="${inputStyle};resize:vertical;min-height:80px" onchange="updatePositionField('${p.id}','description',this.value)">${esc(p.description || '')}</textarea>
      </div>` : ''}

      <div style="margin-bottom:var(--space-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm)">
          <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);font-weight:600">Candidates (${activeCandidates.length})</span>
          <button class="btn btn--sm btn--primary" data-action="createCandidateForPosition" data-arg0="${p.id}" data-arg1="${esc(p.title)}" data-arg2="${p.client_id || ''}">+ Add Candidate</button>
        </div>
        ${candidateTableHtml}
      </div>
      ${isAdmin ? `<div style="border-top:1px solid var(--border-default);padding-top:16px;margin-top:16px">
        <button class="btn btn--sm" style="color:var(--danger);border-color:var(--danger-border)" onclick="deletePosition('${p.id}','${esc(p.title).replace(/'/g, "\\'")}')">Delete Position</button>
      </div>` : ''}
      ${!isClientUser() ? `<div class="pqt-section">
        <div class="pqt-header" data-pos-id="${p.id}" data-pos-title="${esc(p.title)}" data-client-id="${p.client_id||''}" onclick="(function(){
          var el=this;
          var c=document.getElementById('pqtContainer_${p.id.replace(/-/g,'')}');
          var ch=this.querySelector('.pqt-header__chevron');
          if(!c)return;
          if(c.style.display==='none'){c.style.display='block';ch.classList.add('open');if(!c._loaded){c._loaded=true;renderPositionQuestionTemplate(el.dataset.posId,el.dataset.posTitle,el.dataset.clientId)}}
          else{c.style.display='none';ch.classList.remove('open')}
        }).call(this)">
          <span class="pqt-header__chevron">&#9654;</span>
          <span class="pqt-header__title">Interview Questions</span>
          <span class="pqt-header__badge" id="pqtBadge_${p.id.replace(/-/g,'')}" style="display:none">0</span>
        </div>
        <div id="pqtContainer_${p.id.replace(/-/g,'')}" style="display:none"></div>
      </div>` : ''}
    </div>`;

  overlay.style.display = 'block';
  overlay.onclick = (e) => { if (e.target === overlay) closePositionDetail(); };
  panel.classList.add('open');
  _setupPositionResize();
  window._positionDetailPreviousFocus = document.activeElement;
  window._positionDetailEscHandler = (e) => { if (e.key === 'Escape') closePositionDetail(); };
  document.addEventListener('keydown', window._positionDetailEscHandler);

  // Fetch template count for badge (non-blocking)
  if (!isClientUser()) {
    const badgeSafeId = p.id.replace(/-/g, '');
    authFetch('/api/positions/' + p.id + '/question-template').then(r => r.ok ? r.json() : []).then(tpl => {
      const badge = document.getElementById('pqtBadge_' + badgeSafeId);
      if (badge && Array.isArray(tpl) && tpl.length > 0) {
        badge.textContent = tpl.length;
        badge.style.display = '';
      }
    }).catch(() => {});
  }
}

/** Render the interview-question template stepper wizard inside a position detail panel */
async function renderPositionQuestionTemplate(positionId, positionTitle, clientId) {
  const safeId = positionId.replace(/-/g, '');
  const container = document.getElementById('pqtContainer_' + safeId);
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:18px;color:var(--text-muted);font-size:0.82rem">Loading questions&hellip;</div>';

  const CATEGORIES = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
  const CAT_LABELS = { culture: 'Culture', technical: 'Technical', collaboration: 'Collab', leadership: 'Leadership', depth: 'Depth' };

  let allQuestions = [];
  let selectedIds = new Set();
  let currentStep = 0;

  try {
    const [qResp, tResp] = await Promise.all([
      authFetch('/api/interview-questions?position_title=' + encodeURIComponent(positionTitle) + (clientId ? '&client_id=' + encodeURIComponent(clientId) : '')),
      authFetch('/api/positions/' + positionId + '/question-template')
    ]);
    if (qResp.ok) allQuestions = await qResp.json();
    if (tResp.ok) {
      const tpl = await tResp.json();
      (Array.isArray(tpl) ? tpl : []).forEach(t => selectedIds.add(t.question_id));
    }
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger);font-size:0.82rem;padding:12px">Failed to load questions</div>';
    return;
  }

  if (!allQuestions.length) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:0.82rem;padding:12px;font-style:italic">No questions available for this position title</div>';
    return;
  }

  // Group by category
  const grouped = {};
  CATEGORIES.forEach(c => { grouped[c] = []; });
  allQuestions.forEach(q => {
    const cat = (q.category || '').toLowerCase();
    if (grouped[cat]) grouped[cat].push(q);
  });

  function updateBadge() {
    const badge = document.getElementById('pqtBadge_' + safeId);
    if (badge) badge.textContent = selectedIds.size;
  }

  function render() {
    const catQuestions = grouped[CATEGORIES[currentStep]] || [];
    const catSelected = catQuestions.filter(q => selectedIds.has(q.id)).length;

    // Stepper pills
    let stepperHtml = '<div class="pqt-stepper">';
    CATEGORIES.forEach((cat, i) => {
      const catCount = grouped[cat].filter(q => selectedIds.has(q.id)).length;
      let cls = 'pqt-step';
      if (i === currentStep) cls += ' pqt-step--active';
      else if (catCount > 0) cls += ' pqt-step--done';
      else cls += ' pqt-step--pending';
      stepperHtml += '<div class="' + cls + '" onclick="window._pqtSetStep(' + i + ')">' + CAT_LABELS[cat] + (catCount ? ' (' + catCount + ')' : '') + '</div>';
    });
    stepperHtml += '</div>';

    // Actions row
    let actionsHtml = '<div style="display:flex;gap:8px;margin-bottom:8px">';
    actionsHtml += '<button class="btn btn--sm" onclick="window._pqtSelectAll()">Select All</button>';
    actionsHtml += '<button class="btn btn--sm btn--ghost" onclick="window._pqtClearAll()">Clear</button>';
    actionsHtml += '<span style="margin-left:auto;font-size:0.75rem;color:var(--text-muted);align-self:center">' + catSelected + '/' + catQuestions.length + ' selected</span>';
    actionsHtml += '</div>';

    // Question list
    let questionsHtml = '';
    catQuestions.forEach(q => {
      const isSel = selectedIds.has(q.id);
      const cls = 'pqt-question' + (isSel ? ' pqt-question--selected' : '');
      const check = isSel ? '&#9745;' : '&#9744;';
      questionsHtml += '<div class="' + cls + '" onclick="window._pqtToggle(\'' + q.id + '\')">';
      questionsHtml += '<span style="font-size:1rem;line-height:1;flex-shrink:0;color:' + (isSel ? 'var(--accent)' : 'var(--text-muted)') + '">' + check + '</span>';
      questionsHtml += '<span class="pqt-question__text">' + esc(q.question_text) + '</span>';
      questionsHtml += '</div>';
    });

    if (!catQuestions.length) {
      questionsHtml = '<div style="color:var(--text-muted);font-size:0.82rem;padding:12px;font-style:italic">No questions in this category</div>';
    }

    // Nav
    let navHtml = '<div class="pqt-nav">';
    if (currentStep > 0) {
      navHtml += '<button class="btn btn--sm btn--ghost" onclick="window._pqtSetStep(' + (currentStep - 1) + ')">&larr; Back</button>';
    } else {
      navHtml += '<span></span>';
    }
    navHtml += '<span class="pqt-total">' + selectedIds.size + ' total selected</span>';
    if (currentStep < CATEGORIES.length - 1) {
      navHtml += '<button class="btn btn--sm" onclick="window._pqtSetStep(' + (currentStep + 1) + ')">Next &rarr;</button>';
    } else {
      navHtml += '<span></span>';
    }
    navHtml += '</div>';

    container.innerHTML = stepperHtml + actionsHtml + questionsHtml + navHtml;
  }

  // Window globals for event handlers
  window._pqtSetStep = function(i) { currentStep = i; render(); };

  window._pqtToggle = async function(questionId) {
    const wasSelected = selectedIds.has(questionId);
    // Optimistic update
    if (wasSelected) selectedIds.delete(questionId);
    else selectedIds.add(questionId);
    render();
    updateBadge();

    try {
      let resp;
      if (wasSelected) {
        resp = await authFetch('/api/positions/' + positionId + '/question-template/questions/' + questionId, { method: 'DELETE' });
      } else {
        resp = await authFetch('/api/positions/' + positionId + '/question-template/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_id: questionId })
        });
      }
      if (!resp.ok) throw new Error('API error');
    } catch (err) {
      // Revert on failure
      if (wasSelected) selectedIds.add(questionId);
      else selectedIds.delete(questionId);
      render();
      updateBadge();
      showToast('Failed to update question template', 'error');
    }
  };

  window._pqtSelectAll = async function() {
    const catQuestions = grouped[CATEGORIES[currentStep]] || [];
    const toAdd = catQuestions.filter(q => !selectedIds.has(q.id));
    if (!toAdd.length) return;
    // Optimistic
    toAdd.forEach(q => selectedIds.add(q.id));
    render();
    updateBadge();
    // Fire all adds
    const results = await Promise.allSettled(toAdd.map(q =>
      authFetch('/api/positions/' + positionId + '/question-template/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: q.id })
      })
    ));
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === 'rejected' || (r.value && !r.value.ok)) {
        selectedIds.delete(toAdd[i].id);
        failed++;
      }
    });
    if (failed) {
      render();
      updateBadge();
      showToast(failed + ' question(s) failed to save', 'error');
    }
  };

  window._pqtClearAll = async function() {
    const catQuestions = grouped[CATEGORIES[currentStep]] || [];
    const toRemove = catQuestions.filter(q => selectedIds.has(q.id));
    if (!toRemove.length) return;
    // Optimistic
    toRemove.forEach(q => selectedIds.delete(q.id));
    render();
    updateBadge();
    // Fire all deletes
    const results = await Promise.allSettled(toRemove.map(q =>
      authFetch('/api/positions/' + positionId + '/question-template/questions/' + q.id, { method: 'DELETE' })
    ));
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === 'rejected' || (r.value && !r.value.ok)) {
        selectedIds.add(toRemove[i].id);
        failed++;
      }
    });
    if (failed) {
      render();
      updateBadge();
      showToast(failed + ' question(s) failed to remove', 'error');
    }
  };

  render();
  updateBadge();
}

function _setupPositionResize() {
  var handle = document.getElementById('positionResizeHandle');
  if (!handle) return;
  var panel = document.getElementById('positionDetailPanel');
  handle.addEventListener('mousedown', function(e) {
    e.preventDefault();
    var startX = e.clientX;
    var startW = panel.offsetWidth;
    function onMove(e2) {
      var newW = startW - (e2.clientX - startX);
      if (newW < 400) newW = 400;
      if (newW > window.innerWidth * 0.9) newW = window.innerWidth * 0.9;
      panel.style.width = newW + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function closePositionDetail() {
  if (window._positionDetailPreviousFocus) { window._positionDetailPreviousFocus.focus(); window._positionDetailPreviousFocus = null; }
  if (window._positionDetailEscHandler) { document.removeEventListener('keydown', window._positionDetailEscHandler); window._positionDetailEscHandler = null; }
  const overlay = document.getElementById('positionDetailOverlay');
  const panel = document.getElementById('positionDetailPanel');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
}

async function handlePositionStatusChange(positionId, newStatus, selectEl) {
  if (newStatus === 'closed') {
    var position = (_hiringPositionsData || []).find(function(p) { return p.id === positionId; });
    var candidates = (_candidatesData || []).filter(function(c) { return c.position_id === positionId && !c.archived_at; });

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:24px;max-width:400px;width:90%;color:var(--text-primary)';

    var candidateOptions = candidates.map(function(c) {
      return '<option value="' + c.id + '">' + esc(c.name || c.role || 'Unnamed') + '</option>';
    }).join('');

    modal.innerHTML = '<div style="font-weight:600;font-size:1rem;margin-bottom:16px">Close Position</div>'
      + '<div style="font-size:0.85rem;margin-bottom:12px;color:var(--text-secondary)">Was this role filled or shut down?</div>'
      + '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">'
      + '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm);cursor:pointer">'
      + '<input type="radio" name="closeReason" value="filled" style="accent-color:var(--success)"> <span style="font-size:0.85rem;font-weight:500">Filled</span></label>'
      + '<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm);cursor:pointer">'
      + '<input type="radio" name="closeReason" value="shut_down" style="accent-color:var(--danger)"> <span style="font-size:0.85rem;font-weight:500">Shut down</span></label>'
      + '</div>'
      + '<div id="posCloseFilledBy" style="display:none;margin-bottom:16px">'
      + '<div style="font-size:0.82rem;font-weight:500;margin-bottom:6px">Filled by which candidate?</div>'
      + '<select id="posCloseCandidateSelect" style="width:100%;padding:8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">'
      + '<option value="">— Select candidate —</option>' + candidateOptions + '</select>'
      + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end">'
      + '<button class="btn btn--sm" id="posCloseCancelBtn">Cancel</button>'
      + '<button class="btn btn--sm btn--primary" id="posCloseConfirmBtn" disabled>Close Position</button>'
      + '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var radios = modal.querySelectorAll('input[name="closeReason"]');
    var filledByDiv = document.getElementById('posCloseFilledBy');
    var confirmBtn = document.getElementById('posCloseConfirmBtn');

    radios.forEach(function(r) {
      r.addEventListener('change', function() {
        if (r.value === 'filled') {
          filledByDiv.style.display = 'block';
        } else {
          filledByDiv.style.display = 'none';
        }
        confirmBtn.disabled = false;
      });
    });

    document.getElementById('posCloseCancelBtn').onclick = function() {
      overlay.remove();
      if (selectEl) {
        var prev = (position && position.status) || 'open';
        selectEl.value = prev;
      }
    };
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        overlay.remove();
        if (selectEl) {
          var prev = (position && position.status) || 'open';
          selectEl.value = prev;
        }
      }
    };

    confirmBtn.onclick = async function() {
      var reason = modal.querySelector('input[name="closeReason"]:checked');
      if (!reason) return;
      var body = { status: 'closed', closed_reason: reason.value, closed_at: new Date().toISOString() };
      if (reason.value === 'filled') {
        var candSel = document.getElementById('posCloseCandidateSelect');
        if (candSel && candSel.value) body.filled_by_candidate_id = candSel.value;
      }
      var resp = await authFetch('/api/hiring-positions/' + positionId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      overlay.remove();
      if (resp.ok) {
        toast('Position closed');
        await loadHiringPositions();
        if (currentView === 'hiring') renderContent();
        var panel = document.getElementById('positionDetailPanel');
        if (panel && panel.classList.contains('open')) openPositionDetail(positionId);
      } else {
        toast('Failed to close position', 'error');
      }
    };
  } else {
    updatePositionField(positionId, 'status', newStatus);
  }
}

async function updatePositionField(id, field, value) {
  const body = {};
  body[field] = value === '' ? null : value;
  const resp = await authFetch('/api/hiring-positions/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (resp.ok) {
    await loadHiringPositions();
    if (currentView === 'hiring') renderContent();
    const panel = document.getElementById('positionDetailPanel');
    if (panel && panel.classList.contains('open')) openPositionDetail(id);
  }
}

async function deletePosition(id, title) {
  if (!confirm('Delete position "' + (title || 'Untitled') + '"?\n\nThis will unlink all candidates from this position. This cannot be undone.')) return;
  var resp = await authFetch('/api/hiring-positions/' + id, { method: 'DELETE' });
  if (resp.ok) {
    toast('Position deleted');
    closePositionDetail();
    await loadHiringPositions();
    if (currentView === 'hiring') renderContent();
  } else {
    var err = await resp.json().catch(function() { return {}; });
    toast(err.error || 'Failed to delete position', 'error');
  }
}

async function positionAddPanelMember(positionId) {
  const userSel = document.getElementById('pdPanelUser');
  const roleInput = document.getElementById('pdPanelRole');
  if (!userSel || !userSel.value) return;
  const selectedOption = userSel.selectedOptions[0];
  const userId = userSel.value;
  const userName = selectedOption ? selectedOption.getAttribute('data-name') || selectedOption.textContent : '';
  const role = roleInput ? roleInput.value.trim() : '';

  const p = (_hiringPositionsData || []).find(x => x.id === positionId);
  if (!p) return;
  const panel = Array.isArray(p.interview_panel) ? [...p.interview_panel] : [];
  panel.push({ user_id: userId, name: userName, role: role });
  await updatePositionField(positionId, 'interview_panel', panel);
}

async function positionRemovePanelMember(positionId, idx) {
  const p = (_hiringPositionsData || []).find(x => x.id === positionId);
  if (!p) return;
  const panel = Array.isArray(p.interview_panel) ? [...p.interview_panel] : [];
  panel.splice(idx, 1);
  await updatePositionField(positionId, 'interview_panel', panel);
}

async function createCandidateForPosition(positionId, role, clientId) {
  try {
    const body = { name: '', role: role || '', position_id: positionId, stage: 'sourcing' };
    if (clientId) body.client_id = clientId;
    const resp = await authFetch('/api/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (resp.ok) {
      const created = await resp.json();
      await loadCandidates();
      closePositionDetail();
      if (created && created.id) openCandidateDetail(created.id);
    }
  } catch (e) { toast('Failed to create candidate', 'error'); }
}

function openCandidateFromPosition(candidateId) {
  closePositionDetail();
  setTimeout(() => openCandidateDetail(candidateId), 100);
}

let _mammothLoaded = false;
function _ensureMammoth() {
  if (_mammothLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/public/vendor/mammoth.browser.min.js';
    s.onload = () => { _mammothLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load mammoth.js'));
    document.head.appendChild(s);
  });
}

async function openDocumentPreview(previewUrl, downloadUrl, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg-overlay, rgba(0,0,0,0.88));z-index:300;display:flex;align-items:center;justify-content:center';
  overlay.id = 'docPreviewOverlay';

  const modal = document.createElement('div');
  modal.style.cssText = 'width:min(800px,90vw);height:85vh;background:var(--bg-raised);border-radius:var(--radius-md,8px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5)';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border-default);flex-shrink:0;background:var(--bg-surface)';
  header.innerHTML = `<span style="font-weight:600;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;margin-right:12px">${esc(filename || 'Document')}</span>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <a href="${downloadUrl}" class="btn btn--sm btn--primary" download style="text-decoration:none">Download</a>
      <button class="btn btn--ghost btn--sm" id="docPreviewClose" style="font-size:1.1rem">&times;</button>
    </div>`;

  const body = document.createElement('div');
  body.style.cssText = 'flex:1;overflow:auto;padding:24px 32px;min-height:0';

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => { try { document.body.removeChild(overlay); } catch(e){} document.removeEventListener('keydown', escH); };
  const escH = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', escH);
  overlay.querySelector('#docPreviewClose').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  if (ext === 'pdf') {
    body.style.padding = '0';
    body.innerHTML = `<iframe src="${previewUrl}" style="width:100%;height:100%;border:none"></iframe>`;
  } else if (ext === 'docx') {
    body.innerHTML = '<div style="color:var(--text-muted);padding:20px">Loading document…</div>';
    try {
      await _ensureMammoth();
      const resp = await fetch(previewUrl, { credentials: 'include' });
      if (!resp.ok) throw new Error('Fetch failed');
      const arrayBuffer = await resp.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      // Uploaded-document HTML goes into a sandboxed iframe (no scripts, no
      // same-origin access) — the old regex strip was bypassable.
      body.style.padding = '0';
      body.innerHTML = `<iframe sandbox="" style="width:100%;height:100%;border:none;background:#fff" title="${esc(filename || 'Document')}"></iframe>`;
      body.querySelector('iframe').srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;padding:24px 32px;color:#1a1a1a;background:#fff}table{border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ccc;padding:5px 9px}img{max-width:100%}</style></head><body>${result.value}</body></html>`;
    } catch (e) {
      body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
        <div style="font-size:1.1rem;margin-bottom:12px">Preview unavailable for this document</div>
        <a href="${downloadUrl}" class="btn btn--primary" download style="text-decoration:none">Download instead</a>
      </div>`;
    }
  } else {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
      <div style="font-size:1.1rem;margin-bottom:12px">Preview not supported for .${esc(ext)} files</div>
      <a href="${downloadUrl}" class="btn btn--primary" download style="text-decoration:none">Download instead</a>
    </div>`;
  }
}

async function uploadPositionJD(positionId, input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);
  const resp = await authFetch(`/api/hiring-positions/${positionId}/jd`, {
    method: 'POST',
    body: formData,
  });
  if (resp.ok) {
    toast('Job description uploaded');
    await loadHiringPositions();
    if (currentView === 'hiring') renderContent();
    const panel = document.getElementById('positionDetailPanel');
    if (panel && panel.classList.contains('open')) openPositionDetail(positionId);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to upload', 'error');
  }
}

async function openStageEditor(clientId) {
  if (!clientId) { toast('Select a client first', 'error'); return; }
  const data = await apiCall(`/api/clients/${clientId}/hiring-stages`);
  const stages = data.stages || [];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="modal" style="min-width:400px;max-width:560px">
    <div class="modal__title">Configure Hiring Stages</div>
    <div id="stageEditorList" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
      ${stages.map((s, i) => {
        const isTerminal = i === stages.length - 1 && s.key === 'onboarded';
        const isOnboarding = !!s.is_onboarding;
        return `<div class="stage-editor-row" draggable="${isTerminal ? 'false' : 'true'}" style="display:flex;gap:6px;align-items:center">
          ${isTerminal ? '<span style="width:24px"></span>' : '<span class="se-drag-handle" title="Drag to reorder">&#10303;</span>'}
          <input type="text" value="${esc(s.key)}" class="se-key" style="width:120px;padding:5px 8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" onblur="this.value=this.value.toLowerCase().replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'')" ${isTerminal ? 'disabled' : ''} placeholder="key">
          <input type="text" value="${esc(s.label)}" class="se-label" style="flex:1;padding:5px 8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" placeholder="Label">
          <label style="display:flex;align-items:center;gap:3px;font-size:0.75rem;color:var(--text-muted);white-space:nowrap" title="Onboarding stage"><input type="checkbox" class="se-onboarding" ${isOnboarding ? 'checked' : ''}> Onboard</label>
          ${isTerminal ? '' : '<button class="btn btn--ghost btn--sm" style="color:var(--danger)" onclick="this.closest(\'.stage-editor-row\').remove()">×</button>'}
        </div>`;
      }).join('')}
    </div>
    <button class="btn btn--sm" onclick="addStageEditorRow()" style="margin-bottom:12px">+ Add Stage</button>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" id="seCancel">Cancel</button>
      ${data.isCustom ? '<button class="btn" id="seReset">Reset to Default</button>' : ''}
      <button class="btn btn--primary" id="seSave">Save</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  // Drag reorder for stage rows
  const list = overlay.querySelector('#stageEditorList');
  let dragRow = null;
  list.addEventListener('dragstart', (e) => {
    dragRow = e.target.closest('.stage-editor-row');
    if (!dragRow || dragRow.getAttribute('draggable') === 'false') { e.preventDefault(); return; }
    dragRow.classList.add('se-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('.stage-editor-row');
    if (!target || target === dragRow || target.getAttribute('draggable') === 'false') return;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      list.insertBefore(dragRow, target);
    } else {
      list.insertBefore(dragRow, target.nextSibling);
    }
  });
  list.addEventListener('dragend', () => {
    if (dragRow) dragRow.classList.remove('se-dragging');
    dragRow = null;
    // Ensure terminal row stays last
    const rows = list.querySelectorAll('.stage-editor-row');
    const terminal = Array.from(rows).find(r => r.getAttribute('draggable') === 'false');
    if (terminal && terminal !== rows[rows.length - 1]) list.appendChild(terminal);
  });

  const close = () => { try { document.body.removeChild(overlay); } catch(e){} };
  overlay.querySelector('#seCancel').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  if (overlay.querySelector('#seReset')) {
    overlay.querySelector('#seReset').onclick = async () => {
      const resp = await authFetch(`/api/clients/${clientId}/hiring-stages`, { method: 'DELETE' });
      if (resp.ok) { toast('Stages reset to default'); invalidateStagesCache(clientId); close(); await resolveAndCacheHiringStages(); renderContent(); }
      else toast('Failed to reset', 'error');
    };
  }

  overlay.querySelector('#seSave').onclick = async () => {
    const rows = overlay.querySelectorAll('.stage-editor-row');
    const newStages = [];
    for (const row of rows) {
      const rawKey = row.querySelector('.se-key').value.trim();
      const key = rawKey.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const label = row.querySelector('.se-label').value.trim();
      const isOnboarding = row.querySelector('.se-onboarding')?.checked || false;
      if (!key || !label) { toast('All stages need a key and label', 'error'); return; }
      const entry = { key, label };
      if (isOnboarding) entry.is_onboarding = true;
      newStages.push(entry);
    }
    const resp = await authFetch(`/api/clients/${clientId}/hiring-stages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages: newStages }),
    });
    if (resp.ok) { toast('Stages saved'); invalidateStagesCache(clientId); close(); await resolveAndCacheHiringStages(); renderContent(); }
    else { const err = await resp.json().catch(() => ({})); toast(err.error || 'Failed to save', 'error'); }
  };
}

function addStageEditorRow() {
  const list = document.getElementById('stageEditorList');
  if (!list) return;
  const terminalRow = list.querySelector('.stage-editor-row:last-child');
  const newRow = document.createElement('div');
  newRow.className = 'stage-editor-row';
  newRow.draggable = true;
  newRow.style.cssText = 'display:flex;gap:6px;align-items:center';
  newRow.innerHTML = `<span class="se-drag-handle" title="Drag to reorder">&#10303;</span>
    <input type="text" class="se-key" style="width:120px;padding:5px 8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" onblur="this.value=this.value.toLowerCase().replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'')" placeholder="key">
    <input type="text" class="se-label" style="flex:1;padding:5px 8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" placeholder="Label">
    <label style="display:flex;align-items:center;gap:3px;font-size:0.75rem;color:var(--text-muted);white-space:nowrap"><input type="checkbox" class="se-onboarding"> Onboard</label>
    <button class="btn btn--ghost btn--sm" style="color:var(--danger)" onclick="this.closest('.stage-editor-row').remove()">×</button>`;
  list.insertBefore(newRow, terminalRow);
}

/**
 * Open the "Create Candidate" modal — uses themedPrompt-style series of inputs
 * via a small inline modal so we can collect name + client + role in one go.
 */
async function openCreateCandidateModal() {
  // Only show contracted/active clients (not the full leads/prospects list).
  // Falls back to a fresh /api/clients fetch if the cache is empty (e.g. hard reload).
  let clientList = getContractedClientRecords();
  if (clientList.length === 0) {
    try {
      const data = await apiCall('/api/clients');
      if (Array.isArray(data)) {
        data.forEach(c => { if (c && c.name) _apiClientsCache[c.name] = c; });
      }
      clientList = getContractedClientRecords();
    } catch (e) { /* non-fatal — modal will still open with empty dropdown */ }
  }

  // Build a tiny inline modal — reuse modal-overlay/modal classes
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
        ${isClientUser() ? '' : `<label style="font-size:0.78rem;color:var(--text-muted)">Client
          <select id="ccClient" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">
            <option value="">— None —</option>
            ${clientList.map(c => `<option value="${c.id}" ${window._hiringFilterClient === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select></label>`}
        <label style="font-size:0.78rem;color:var(--text-muted)">Role
          <input type="text" id="ccRole" placeholder="e.g. Senior Backend Engineer" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"></label>
        <label style="font-size:0.78rem;color:var(--text-muted)">Email
          <input type="email" id="ccEmail" placeholder="candidate@example.com" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"></label>
        <label style="font-size:0.78rem;color:var(--text-muted)">Source
          <select id="ccSource" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">
            <option value="">— None —</option>
            ${['referral','linkedin','inbound','agency','job-board','internal','other'].map(s => `<option value="${s}">${s.charAt(0).toUpperCase()+s.slice(1).replace('-',' ')}</option>`).join('')}
          </select></label>
        <label style="font-size:0.78rem;color:var(--text-muted)">Position
          <select id="ccPosition" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">
            <option value="">— None —</option>
            ${(_hiringPositionsData || []).map(p => `<option value="${p.id}">${esc(p.title)}${p.client_name ? ' — ' + esc(p.client_name) : ''}</option>`).join('')}
          </select></label>
        <label style="font-size:0.78rem;color:var(--text-muted)">Due date
          <input type="date" id="ccDue" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"></label>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
        <button class="btn" id="ccCancel">Cancel</button>
        <button class="btn btn--primary" id="ccCreate">Create</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // Focus the first input for keyboard users
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
    // Glen spec (bug b7a2f97f): name OR role is required — if both blank, refuse.
    // If role is blank, warn and ask for confirmation (role is the backbone of
    // the card). Cards always start in 'sourcing'.
    if (!name && !role) { toast('Name or role is required', 'error'); return; }
    if (!role) {
      const ok = await themedConfirm('No role on this candidate card — are you sure?\nThe role is normally what you fill first and it anchors the whole pipeline.', 'No role set', 'Create anyway');
      if (!ok) return;
    }
    const body = {
      name: name || '(vacant)',
      client_id: (overlay.querySelector('#ccClient') || {}).value || null,
      role: role || null,
      due_date: overlay.querySelector('#ccDue').value || null,
      email: (overlay.querySelector('#ccEmail') || {}).value?.trim() || null,
      source: (overlay.querySelector('#ccSource') || {}).value || null,
      position_id: (overlay.querySelector('#ccPosition') || {}).value || null,
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
      // Open the newly created candidate's detail panel for further editing
      openCandidateDetail(created.id);
    } else {
      const err = await resp.json().catch(() => ({}));
      toast(err.error || 'Failed to create candidate', 'error');
    }
  };
}

// ---- Candidate detail panel — helper builders (Steps 3–7) ----

function buildCandidateHeaderHtml(c, isArchived) {
  const header = c.name && c.name.trim() ? c.name : (c.role || 'Unnamed candidate');
  const subheader = c.name && c.name.trim() && c.role ? c.role : '';
  return `<div class="candidate-detail__header">
    <div style="flex:1;min-width:0">
      <div style="display:flex;gap:var(--space-sm);align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <span class="hiring-stage-badge hiring-stage-badge--${c.stage}">${HIRING_STAGE_LABELS[c.stage] || c.stage}</span>
        ${c.client_name ? `<span style="font-size:0.78rem;color:var(--text-muted)">${esc(c.client_name)}</span>` : ''}
        ${isArchived ? '<span style="background:var(--success);color:#fff;padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:700">ARCHIVED &#10003;</span>' : ''}
      </div>
      <h3 style="font-size:1rem;font-weight:600;margin:0;word-break:break-word">${esc(header)}</h3>
      ${subheader ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${esc(subheader)}</div>` : ''}
    </div>
    <button class="btn btn--ghost btn--sm" data-action="copyEntityLink" data-arg0="hiring/candidate" data-arg1="${c.id}" title="Copy link" style="flex-shrink:0">&#128279;</button>
    <button class="btn btn--ghost btn--sm" data-action="closeCandidateDetail" aria-label="Close" style="flex-shrink:0">&times;</button>
  </div>`;
}

function buildCandidateStageBarHtml(c, isArchived, disabledStyle, candidateStages) {
  const resolvedStages = candidateStages || HIRING_STAGES.map(k => ({ key: k, label: HIRING_STAGE_LABELS[k] || k }));
  const stageIdx = resolvedStages.findIndex(s => s.key === c.stage);
  const prev = stageIdx > 0 ? resolvedStages[stageIdx - 1] : null;
  const next = stageIdx < resolvedStages.length - 1 ? resolvedStages[stageIdx + 1] : null;
  const stageAssignees = (c.stage_assignees && typeof c.stage_assignees === 'object') ? c.stage_assignees : {};
  const currentStageAssignees = Array.isArray(stageAssignees[c.stage]) ? stageAssignees[c.stage] : [];
  const unassigned = !isArchived && currentStageAssignees.length === 0;

  return `<div style="display:flex;align-items:center;gap:8px;${disabledStyle}">
    <button class="btn btn--sm" style="min-width:36px;background:var(--bg-surface);color:${prev ? 'var(--text-secondary)' : 'var(--text-muted)'};border:1px solid var(--border-default)" ${prev ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${prev.key}" title="Previous: ${esc(prev.label)}"` : 'disabled'}>&larr;</button>
    <select id="cdStageSel" onchange="hiringStageSelectChange('${c.id}',this.value)" style="flex:1;font-weight:600;text-align:center;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.9rem">
      ${resolvedStages.map(s => `<option value="${s.key}" ${c.stage===s.key?'selected':''}>${esc(s.label)}</option>`).join('')}
    </select>
    <button class="btn btn--sm" style="min-width:36px;background:color-mix(in srgb, var(--success) 30%, var(--bg-surface));color:#fff;border:1px solid var(--success)" ${next ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${next.key}" title="Next: ${esc(next.label)}"` : `data-action="hiringConfirmHire" data-arg0="${c.id}" title="Confirm Onboarded"`}>&rarr;</button>
  </div>
  <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap;${disabledStyle}">
    ${currentStageAssignees.map((name, i) => `<span style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:10px;padding:3px 10px;font-size:0.78rem;display:inline-flex;align-items:center;gap:4px">${esc(name)} <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.78rem" data-action="hiringRemoveStageAssignee" data-arg0="${c.id}" data-arg1="${esc(c.stage)}" data-arg2="${i}">&times;</button></span>`).join('')}
    ${unassigned ? '<span style="color:var(--danger);font-size:0.78rem">&#9888; No assignee</span>' : ''}
    <select id="cdStageAssigneeAdd" style="font-size:0.78rem;padding:3px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" onchange="if(this.value){hiringAddStageAssignee('${c.id}','${esc(c.stage)}');this.value=''}"><option value="">+ Assign…</option>${(_cachedUsers || []).filter(u => c.client_id ? u.client_id === c.client_id : !u.client_id).map(u => u.display_name).sort().map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select>
  </div>`;
}

function switchCandidateTab(btn, tabId) {
  const panel = btn.closest('.candidate-detail-panel');
  panel.querySelectorAll('.candidate-detail__tab').forEach(t => t.classList.remove('candidate-detail__tab--active'));
  panel.querySelectorAll('.candidate-detail__tab-content').forEach(t => t.classList.remove('candidate-detail__tab-content--active'));
  btn.classList.add('candidate-detail__tab--active');
  const target = document.getElementById('cdTab' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
  if (target) target.classList.add('candidate-detail__tab-content--active');
}

function buildCandidateProfileHtml(c, isDetailScoped, clientList, positions, disabledStyle) {
  return `<div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Profile</div>
    <div class="candidate-detail__field"><label>Name</label><input type="text" id="cdName" value="${esc(c.name || '')}" placeholder="Leave blank to show role as header" onchange="updateCandidateField('${c.id}','name',this.value)"></div>
    <div class="candidate-detail__field"><label>Role</label><input type="text" id="cdRole" value="${esc(c.role || '')}" placeholder="e.g. Senior Backend Engineer" onchange="updateCandidateField('${c.id}','role',this.value)"></div>
    <div class="candidate-detail__field"><label>Email</label><input type="email" id="cdEmail" value="${esc(c.email || '')}" placeholder="candidate@example.com" onchange="updateCandidateField('${c.id}','email',this.value||null)"></div>
    <div class="candidate-detail__field"><label>LinkedIn URL</label><input type="url" id="cdLinkedIn" value="${esc(c.linkedin_url || '')}" placeholder="https://linkedin.com/in/..." onchange="updateCandidateField('${c.id}','linkedin_url',this.value)"></div>
    <div class="candidate-detail__field"><label>Due date</label><input type="date" id="cdDue" value="${c.due_date ? c.due_date.slice(0,10) : ''}" onchange="updateCandidateField('${c.id}','due_date',this.value||null)"></div>
    <div class="candidate-detail__field">
      <label>Source</label>
      <select id="cdSource" onchange="updateCandidateField('${c.id}','source',this.value||null)">
        <option value="">— None —</option>
        ${['referral','linkedin','inbound','agency','job-board','internal','other'].map(s => `<option value="${s}" ${c.source===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1).replace('-',' ')}</option>`).join('')}
      </select>
    </div>
    <div class="candidate-detail__field"><label>Source detail</label><input type="text" id="cdSourceDetail" value="${esc(c.source_detail || '')}" placeholder="${c.source==='referral'?'Referrer name':c.source==='agency'?'Agency name':'Details'}" onchange="updateCandidateField('${c.id}','source_detail',this.value||null)"></div>
    ${!isDetailScoped ? `<div class="candidate-detail__field"><label>Client</label><select id="cdClient" onchange="updateCandidateField('${c.id}','client_id',this.value||null)"><option value="">— None —</option>${clientList.map(cl => `<option value="${cl.id}" ${c.client_id===cl.id?'selected':''}>${esc(cl.name)}</option>`).join('')}</select></div>` : ''}
    <div class="candidate-detail__field">
      <label>CV</label>
      <div class="candidate-cv">
        ${c.cv_filename ? `<span class="candidate-cv__name">${esc(c.cv_filename)}</span><button class="btn btn--sm" onclick="openDocumentPreview('/api/candidates/${c.id}/cv/preview','/api/candidates/${c.id}/cv','${esc(c.cv_filename)}')">Preview</button><button class="btn btn--sm" data-action="downloadCandidateCV" data-arg0="${c.id}">Download</button>` : '<span style="color:var(--text-muted);font-size:0.78rem">No CV uploaded</span>'}
        <input type="file" id="cdCvFile" style="display:none" onchange="uploadCandidateCV('${c.id}',this)">
        <button class="btn btn--sm" data-action="_actModalClick" data-arg0="cdCvFile">${c.cv_filename ? 'Replace' : 'Upload'}</button>
      </div>
    </div>
    ${positions.length > 0 ? `<div class="candidate-detail__field"><label>Hiring Position (template)</label><select id="cdPosition" onchange="updateCandidateField('${c.id}','position_id',this.value||null)"><option value="">— None —</option>${positions.filter(p => !c.client_id || p.client_id === c.client_id).map(p => `<option value="${p.id}" ${c.position_id===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}</select></div>` : ''}
  </div>`;
}

function buildCandidateStageHtml(c, isArchived, disabledStyle, candidateStages) {
  const resolvedStages = candidateStages || HIRING_STAGES.map(k => ({ key: k, label: HIRING_STAGE_LABELS[k] || k }));
  const stageIdx = resolvedStages.findIndex(s => s.key === c.stage);
  const prev = stageIdx > 0 ? resolvedStages[stageIdx - 1] : null;
  const next = stageIdx < resolvedStages.length - 1 ? resolvedStages[stageIdx + 1] : null;
  const stageAssignees = (c.stage_assignees && typeof c.stage_assignees === 'object') ? c.stage_assignees : {};
  const currentStageAssignees = Array.isArray(stageAssignees[c.stage]) ? stageAssignees[c.stage] : [];
  const unassigned = !isArchived && currentStageAssignees.length === 0;

  return `<div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Stage</div>
    <div style="display:flex;align-items:center;gap:6px">
      <button class="btn btn--sm" style="min-width:36px;background:var(--bg-surface);color:${prev ? 'var(--text-secondary)' : 'var(--text-muted)'};border:1px solid var(--border-default)" ${prev ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${prev.key}" title="Previous: ${esc(prev.label)}"` : 'disabled'}>&larr;</button>
      <select id="cdStageSel" onchange="hiringStageSelectChange('${c.id}',this.value)" style="flex:1;font-weight:600;text-align:center;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
        ${resolvedStages.map(s => `<option value="${s.key}" ${c.stage===s.key?'selected':''}>${esc(s.label)}</option>`).join('')}
      </select>
      <button class="btn btn--sm" style="min-width:36px;background:color-mix(in srgb, var(--success) 30%, var(--bg-surface));color:#fff;border:1px solid var(--success)" ${next ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${next.key}" title="Next: ${esc(next.label)}"` : `data-action="hiringConfirmHire" data-arg0="${c.id}" title="Confirm Onboarded"`}>&rarr;</button>
    </div>
    ${unassigned ? '<div style="color:var(--danger);font-size:0.75rem;margin-top:6px">&#9888; No assignee on this stage</div>' : ''}
  </div>

  <div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Assigned to this stage</div>
    <div id="cdStageAssignees" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
      ${currentStageAssignees.map((name, i) => `<span style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:10px;padding:2px 8px;font-size:0.75rem;display:inline-flex;align-items:center;gap:4px">${esc(name)} <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.75rem" data-action="hiringRemoveStageAssignee" data-arg0="${c.id}" data-arg1="${esc(c.stage)}" data-arg2="${i}">&times;</button></span>`).join('')}
      ${currentStageAssignees.length === 0 ? '<span style="color:var(--danger);font-size:0.75rem;padding:2px 0">Unassigned — add someone</span>' : ''}
    </div>
    <div style="display:flex;gap:4px"><select id="cdStageAssigneeAdd" style="flex:1;font-size:0.78rem;padding:3px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)"><option value="">+ Add assignee…</option>${(_cachedTeamMembers || []).map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select><button class="btn btn--sm" data-action="hiringAddStageAssignee" data-arg0="${c.id}" data-arg1="${esc(c.stage)}">Add</button></div>
  </div>`;
}

function buildCandidateTagsHtml(c, disabledStyle) {
  const tags = Array.isArray(c.tags) ? c.tags : [];
  return `<div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Tags</div>
    <div id="cdTagsContainer" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
      ${tags.map(t => `<span style="background:var(--accent-muted);color:var(--accent-text);border-radius:10px;padding:2px 8px;font-size:0.75rem;display:inline-flex;align-items:center;gap:4px">${esc(t)} <button style="background:none;border:none;color:var(--accent-text);cursor:pointer;font-size:0.75rem" onclick="hiringRemoveTag('${c.id}','${esc(t)}')">&times;</button></span>`).join('')}
      ${tags.length === 0 ? '<span style="color:var(--text-muted);font-size:0.75rem">No tags</span>' : ''}
    </div>
    <div style="display:flex;gap:4px"><input type="text" id="cdTagInput" placeholder="Add tag (Enter or comma)" style="flex:1;font-size:0.78rem;padding:3px 6px" onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();hiringAddTag('${c.id}',this.value);this.value='';}"><button class="btn btn--sm" onclick="hiringAddTag('${c.id}',document.getElementById('cdTagInput').value);document.getElementById('cdTagInput').value='';">Add</button></div>
  </div>`;
}

function buildCandidateDocumentsHtml(c, docs, files, disabledStyle) {
  var cid = c.id;
  var clientId = c.client_id || '';
  var html = '<div class="candidate-detail__section" id="cdDocsDropZone" style="' + disabledStyle + '">';

  // Drop zone overlay (hidden until drag)
  html += '<div id="cdDocsDropOverlay" style="display:none;position:absolute;inset:0;background:color-mix(in srgb, var(--accent) 15%, transparent);border:2px dashed var(--accent);border-radius:var(--radius-sm);z-index:10;pointer-events:none;display:none;align-items:center;justify-content:center">'
    + '<div style="text-align:center;padding:20px"><div style="font-size:28px;margin-bottom:8px">&#128229;</div><div style="font-weight:600;font-size:0.9rem;color:var(--accent)">Drop files here</div></div></div>';

  html += '<div class="candidate-detail__section-title">Documents</div>';

  // CV entry (pinned)
  if (c.cv_filename) {
    html += _cdFileRow('&#128196;', esc(c.cv_filename), 'CV / Resume', ''
      + '<button class="btn btn--sm" onclick="openDocumentPreview(\'/api/candidates/' + cid + '/cv/preview\',\'/api/candidates/' + cid + '/cv\',\'' + esc(c.cv_filename).replace(/'/g, "\\'") + '\')">Preview</button>'
      + '<button class="btn btn--sm" data-action="downloadCandidateCV" data-arg0="' + cid + '">Download</button>');
  }

  // Uploaded files
  var uploads = (files || []).filter(function(f) { return f.file_type === 'upload'; });
  uploads.forEach(function(f) {
    var ago = f.created_at ? _relativeTime(new Date(f.created_at)) : '';
    var sub = (f.uploaded_by ? esc(f.uploaded_by) + ' &middot; ' : '') + ago;
    if (f.size_bytes) sub += ' &middot; ' + _formatBytes(f.size_bytes);
    html += _cdFileRow('&#128206;', esc(f.title || f.filename || 'File'), sub, ''
      + '<a href="/api/candidates/' + cid + '/files/' + f.id + '/download" class="btn btn--sm" download style="text-decoration:none">Download</a>'
      + '<button class="btn btn--sm btn--ghost" style="color:var(--danger)" onclick="deleteCandidateFile(\'' + cid + '\',\'' + f.id + '\')" title="Remove">&times;</button>');
  });

  // URL links
  var urls = (files || []).filter(function(f) { return f.file_type === 'url'; });
  urls.forEach(function(f) {
    var ago = f.created_at ? _relativeTime(new Date(f.created_at)) : '';
    var sub = (f.uploaded_by ? esc(f.uploaded_by) + ' &middot; ' : '') + ago;
    html += _cdFileRow('&#128279;', '<a href="' + esc(f.url) + '" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">' + esc(f.title || f.url) + '</a>', sub, ''
      + '<a href="' + esc(f.url) + '" target="_blank" rel="noopener" class="btn btn--sm" style="text-decoration:none">Open</a>'
      + '<button class="btn btn--sm btn--ghost" style="color:var(--danger)" onclick="deleteCandidateFile(\'' + cid + '\',\'' + f.id + '\')" title="Remove">&times;</button>');
  });

  // Wiki documents
  if (docs.length > 0) {
    docs.forEach(function(d) {
      var updated = d.updated_at ? _relativeTime(new Date(d.updated_at)) : '';
      var dcid = d.client_id || clientId;
      html += _cdFileRow('&#128209;', esc(d.title || 'Untitled'), (d.updated_by ? esc(d.updated_by) + ' &middot; ' : '') + updated + ' &middot; Note', ''
        + '<button class="btn btn--sm btn--ghost" onclick="openCandidateDocument(\'' + dcid + '\',\'' + d.id + '\')" title="Open in Documentation">Open</button>');
    });
  }

  // Empty state
  if (!c.cv_filename && uploads.length === 0 && urls.length === 0 && docs.length === 0) {
    html += '<div style="color:var(--text-muted);font-size:0.85rem;padding:20px 0;text-align:center">'
      + '<div style="font-size:28px;margin-bottom:8px;opacity:0.5">&#128451;</div>'
      + 'No documents yet. Upload a file, add a link, or drag files here.</div>';
  }

  // Action buttons
  html += '<div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">'
    + '<input type="file" id="cdFileUploadInput" multiple style="display:none" onchange="uploadCandidateFiles(\'' + cid + '\',this)">'
    + '<button class="btn btn--sm" onclick="document.getElementById(\'cdFileUploadInput\').click()" style="display:inline-flex;align-items:center;gap:4px"><span style="font-size:12px">&#128228;</span> Upload File</button>'
    + '<button class="btn btn--sm" onclick="addCandidateFileUrl(\'' + cid + '\')" style="display:inline-flex;align-items:center;gap:4px"><span style="font-size:12px">&#128279;</span> Add Link</button>';
  if (clientId) {
    html += '<button class="btn btn--sm btn--ghost" onclick="createCandidateDocument(\'' + cid + '\',\'' + clientId + '\')" style="display:inline-flex;align-items:center;gap:4px"><span style="font-size:12px">&#128209;</span> New Note</button>';
  }
  html += '</div>';

  html += '</div>';
  return html;
}

function _cdFileRow(icon, title, subtitle, actions) {
  return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--border-default)">'
    + '<span style="font-size:15px;flex-shrink:0">' + icon + '</span>'
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-weight:500;font-size:0.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + title + '</div>'
    + (subtitle ? '<div style="font-size:0.75rem;color:var(--text-muted)">' + subtitle + '</div>' : '')
    + '</div>'
    + '<div style="display:flex;gap:4px;flex-shrink:0">' + actions + '</div>'
    + '</div>';
}

function _formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function openCandidateDocument(clientId, docId) {
  closeCandidateDetail();
  _docsState.clientId = clientId;
  _docsState.selectedDocId = docId;
  switchView('documentation');
}

async function createCandidateDocument(candidateId, clientId) {
  var title = prompt('Document title:');
  if (!title || !title.trim()) return;
  var doc = await apiCall('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, candidate_id: candidateId, title: title.trim() }),
  });
  if (doc && doc.id) {
    closeCandidateDetail();
    _docsState.clientId = clientId;
    _docsState.selectedDocId = doc.id;
    switchView('documentation');
  }
}

async function uploadCandidateFiles(candidateId, input) {
  if (!input.files || input.files.length === 0) return;
  var ok = 0;
  for (var i = 0; i < input.files.length; i++) {
    var formData = new FormData();
    formData.append('file', input.files[i]);
    var resp = await authFetch('/api/candidates/' + candidateId + '/files', { method: 'POST', body: formData });
    if (resp.ok) ok++;
  }
  input.value = '';
  if (ok > 0) {
    toast(ok + ' file' + (ok > 1 ? 's' : '') + ' uploaded');
    openCandidateDetail(candidateId);
  } else {
    toast('Upload failed', 'error');
  }
}

async function addCandidateFileUrl(candidateId) {
  var url = prompt('Paste URL:');
  if (!url || !url.trim()) return;
  var title = prompt('Title (optional — leave blank to use URL):');
  var resp = await authFetch('/api/candidates/' + candidateId + '/files/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim(), title: (title && title.trim()) || '' }),
  });
  if (resp.ok) {
    toast('Link added');
    openCandidateDetail(candidateId);
  } else {
    var err = await resp.json().catch(function() { return {}; });
    toast(err.error || 'Failed to add link', 'error');
  }
}

async function deleteCandidateFile(candidateId, fileId) {
  if (!confirm('Remove this document?')) return;
  await authFetch('/api/candidates/' + candidateId + '/files/' + fileId, { method: 'DELETE' });
  toast('Document removed');
  openCandidateDetail(candidateId);
}

function setupCandidateDocsDrop(candidateId) {
  var zone = document.getElementById('cdDocsDropZone');
  if (!zone) return;
  var overlay = document.getElementById('cdDocsDropOverlay');
  var counter = 0;

  zone.style.position = 'relative';

  zone.addEventListener('dragenter', function(e) {
    e.preventDefault();
    counter++;
    if (overlay) { overlay.style.display = 'flex'; }
  });
  zone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    counter--;
    if (counter <= 0) { counter = 0; if (overlay) overlay.style.display = 'none'; }
  });
  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    counter = 0;
    if (overlay) overlay.style.display = 'none';
    var files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    _handleCandidateFileDrop(candidateId, files);
  });
}

async function _handleCandidateFileDrop(candidateId, files) {
  var ok = 0;
  for (var i = 0; i < files.length; i++) {
    var formData = new FormData();
    formData.append('file', files[i]);
    var resp = await authFetch('/api/candidates/' + candidateId + '/files', { method: 'POST', body: formData });
    if (resp.ok) ok++;
  }
  if (ok > 0) {
    toast(ok + ' file' + (ok > 1 ? 's' : '') + ' uploaded');
    openCandidateDetail(candidateId);
  } else {
    toast('Upload failed', 'error');
  }
}

function buildCandidateStageSubHtml(c, interviewConfig) {
  // Start date stays editable through offer AND onboarding stages (bug
  // de607254 — it used to vanish the moment a candidate left 'offer' even
  // though the card still displayed it).
  const startDateSection = `<div class="candidate-detail__section"><div class="candidate-detail__section-title">${c.stage === 'offer' ? 'Offer details' : 'Start date'}</div><div class="candidate-detail__field"><label>Start date</label><input type="date" id="cdStartDate" value="${c.start_date ? String(c.start_date).slice(0,10) : ''}" onchange="updateCandidateField('${c.id}','start_date',this.value||null)"></div></div>`;
  if (c.stage === 'offer') {
    return startDateSection;
  } else if (c.stage === 'onboarding' || c.stage === 'onboarded') {
    return `${startDateSection}<div class="candidate-detail__section" id="cdOnboardingSection">
      <div class="candidate-detail__section-title">Onboarding Checklist</div>
      <div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">Loading checklist…</div>
    </div>`;
  }
  return '';
}

async function loadOnboardingChecklist(candidateId) {
  const container = document.getElementById('cdOnboardingSection');
  if (!container) return;
  try {
    const items = await apiCall(`/api/candidates/${candidateId}/onboarding`);
    const total = items ? items.length : 0;
    const done = items ? items.filter(i => i.completed).length : 0;

    let html = `<div class="candidate-detail__section-title">Onboarding Checklist${total > 0 ? ` <span style="font-size:0.75rem;color:var(--text-muted)">(${done}/${total})</span>` : ''}</div>`;

    if (total > 0) {
      html += `<div style="height:4px;background:var(--bg-surface);border-radius:2px;margin-bottom:8px;overflow:hidden"><div style="width:${total > 0 ? (done/total*100) : 0}%;height:100%;background:var(--success);border-radius:2px"></div></div>`;
      items.forEach(item => {
        html += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.82rem">
          <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleOnboardingItem('${candidateId}','${item.id}',this.checked)" style="accent-color:var(--success)">
          <span style="flex:1;${item.completed ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${esc(item.title)}</span>
          ${item.completed_by ? `<span style="font-size:0.75rem;color:var(--text-muted)">${esc(item.completed_by)}</span>` : ''}
          <button class="btn btn--ghost btn--sm" style="font-size:0.75rem;color:var(--danger)" onclick="deleteOnboardingItem('${candidateId}','${item.id}')">&times;</button>
        </div>`;
      });
    } else {
      html += '<div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">No checklist items yet</div>';
    }

    html += `<div style="display:flex;gap:6px;margin-top:6px">
      <input type="text" id="cdOnboardInput" placeholder="Add item…" style="flex:1;font-size:0.78rem;padding:4px 8px" onkeydown="if(event.key==='Enter'){event.preventDefault();addOnboardingItem('${candidateId}',this.value);this.value='';}">
      <button class="btn btn--sm" onclick="addOnboardingItem('${candidateId}',document.getElementById('cdOnboardInput').value);document.getElementById('cdOnboardInput').value='';">Add</button>
    </div>`;

    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<div class="candidate-detail__section-title">Onboarding Checklist</div><div style="color:var(--text-muted);font-size:0.78rem">Failed to load checklist</div>';
  }
}

async function toggleOnboardingItem(candidateId, itemId, completed) {
  await authFetch(`/api/candidates/${candidateId}/onboarding/${itemId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  loadOnboardingChecklist(candidateId);
}

async function addOnboardingItem(candidateId, title) {
  if (!title || !title.trim()) return;
  await authFetch(`/api/candidates/${candidateId}/onboarding`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title.trim() }),
  });
  loadOnboardingChecklist(candidateId);
}

async function deleteOnboardingItem(candidateId, itemId) {
  await authFetch(`/api/candidates/${candidateId}/onboarding/${itemId}`, { method: 'DELETE' });
  loadOnboardingChecklist(candidateId);
}

async function openInterviewConfig(candidateId, clientId, positionId, existingConfigId) {
  const params = new URLSearchParams();
  if (clientId) params.set('client_id', clientId);

  let allQuestions = [];
  let users = [];
  let templateQuestionIds = [];
  try {
    const fetches = [
      authFetch('/api/interview-questions?' + params),
      authFetch('/api/users')
    ];
    if (positionId) fetches.push(authFetch('/api/positions/' + positionId + '/question-template'));
    const results = await Promise.all(fetches);
    allQuestions = await results[0].json();
    users = await results[1].json();
    if (results[2] && results[2].ok) {
      const tplRows = await results[2].json();
      templateQuestionIds = (tplRows || []).map(function(r) { return r.question_id; }).filter(Boolean);
    }
  } catch (e) {}

  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (!overlay || !panel) return;

  const position = (_hiringPositionsData || []).find(p => p.id === positionId);
  const positionDiscipline = position ? position.discipline : null;

  const categoryOrder = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
  const selectedIds = new Set();
  let hasTemplatePreFill = false;
  if (templateQuestionIds.length > 0) {
    try {
      const cfgResp = await authFetch('/api/interview-configs?candidate_id=' + candidateId);
      const existingConfigs = cfgResp.ok ? await cfgResp.json() : [];
      if (!existingConfigs || existingConfigs.length === 0) {
        for (var tqId of templateQuestionIds) selectedIds.add(tqId);
        hasTemplatePreFill = true;
      }
    } catch (e) {}
  }
  let activeTab = 'questions';
  const selectedInterviewers = new Set();
  const expandedDisciplines = new Set(positionDiscipline ? [positionDiscipline] : []);

  function renderDisciplineSection(discName, discQuestions, isMatched) {
    var total = 0; var selCount = 0;
    for (var cat of categoryOrder) { var qs = discQuestions[cat] || []; total += qs.length; selCount += qs.filter(function(q) { return selectedIds.has(q.id); }).length; }
    var isOpen = expandedDisciplines.has(discName);
    var html = '<div style="margin-bottom:8px;border:1px solid ' + (isMatched ? 'var(--accent)' : 'var(--border)') + ';border-radius:8px;overflow:hidden">';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;background:' + (isMatched ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))' : 'var(--bg-elevated)') + '" onclick="window._ivToggleDisc(\'' + discName.replace(/'/g, "\\'") + '\')">';
    html += '<span style="transform:rotate(' + (isOpen ? '90' : '0') + 'deg);transition:transform 0.15s;font-size:12px">&#9654;</span>';
    html += '<span style="font-weight:600;font-size:13px">' + esc(discName) + '</span>';
    html += '<span style="font-size:12px;color:var(--text-muted)">' + total + ' questions</span>';
    if (selCount > 0) html += '<span style="font-size:12px;color:var(--accent);margin-left:auto">' + selCount + ' selected</span>';
    html += '</div>';
    if (isOpen) {
      html += '<div style="padding:8px 12px">';
      for (var cat of categoryOrder) {
        var qs = discQuestions[cat];
        if (!qs || qs.length === 0) continue;
        html += '<div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">' + cat + '</div>';
        for (var q of qs) {
          html += '<label style="display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;background:' + (selectedIds.has(q.id) ? 'var(--bg-elevated)' : 'transparent') + ';margin-bottom:2px;border:1px solid ' + (selectedIds.has(q.id) ? 'var(--accent)' : 'transparent') + '">';
          html += '<input type="checkbox" ' + (selectedIds.has(q.id) ? 'checked' : '') + ' onchange="window._ivToggleQ(\'' + q.id + '\')" style="margin-top:4px">';
          html += '<div><div style="font-size:14px;line-height:1.5">' + esc(q.question_text) + '</div>';
          html += '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">' + q.source + (q.depth_type ? ' · ' + q.depth_type : '') + '</div></div></label>';
        }
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderConfigPanel() {
    var disciplines = {};
    for (var q of (allQuestions || [])) {
      var d = q.discipline || 'General';
      if (!disciplines[d]) disciplines[d] = {};
      if (!disciplines[d][q.category]) disciplines[d][q.category] = [];
      disciplines[d][q.category].push(q);
    }

    var questionsHtml = '';
    if (positionDiscipline) {
      questionsHtml += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Showing questions for: <strong style="color:var(--accent)">' + esc(positionDiscipline) + '</strong></div>';
      if (disciplines[positionDiscipline]) {
        questionsHtml += renderDisciplineSection(positionDiscipline, disciplines[positionDiscipline], true);
      }
      var otherDiscs = Object.keys(disciplines).filter(function(d) { return d !== positionDiscipline; }).sort();
      if (otherDiscs.length > 0) {
        var otherTotal = otherDiscs.reduce(function(s, d) { return s + Object.values(disciplines[d]).reduce(function(s2, qs) { return s2 + qs.length; }, 0); }, 0);
        questionsHtml += '<div style="font-size:12px;color:var(--text-muted);margin:12px 0 8px;padding-top:8px;border-top:1px solid var(--border)">Other disciplines (' + otherTotal + ' questions)</div>';
        for (var d of otherDiscs) { questionsHtml += renderDisciplineSection(d, disciplines[d], false); }
      }
    } else {
      questionsHtml += '<div style="background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:6px;padding:8px 12px;font-size:12px;color:var(--warning);margin-bottom:12px">This position has no discipline set — showing all questions. Set a discipline on the position to filter.</div>';
      var allExpanded = expandedDisciplines.size === 0;
      for (var d of Object.keys(disciplines).sort()) {
        if (allExpanded) expandedDisciplines.add(d);
        questionsHtml += renderDisciplineSection(d, disciplines[d], false);
      }
    }

    var interviewersHtml = (users || []).filter(function(u) { return u.is_active !== false && (u.client_id === clientId || !u.client_id); }).map(function(u) {
      return '<label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-bottom:1px solid var(--border)">' +
        '<input type="checkbox" ' + (selectedInterviewers.has(u.id) ? 'checked' : '') + ' onchange="window._ivToggleInterviewer(\'' + u.id + '\')">' +
        '<span>' + esc(u.display_name || u.username) + '</span>' +
        '<span style="color:var(--text-muted);font-size:12px">' + esc(u.email || '') + '</span></label>';
    }).join('');

    panel.innerHTML =
      '<div class="candidate-detail__header"><h3>Configure Interview</h3>' +
        '<button class="btn btn--sm" onclick="openCandidateDetail(\'' + candidateId + '\')">Back</button></div>' +
      '<div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:12px">' +
        '<div style="padding:10px 16px;cursor:pointer;font-weight:' + (activeTab === 'questions' ? '600' : '400') + ';border-bottom:2px solid ' + (activeTab === 'questions' ? 'var(--accent)' : 'transparent') + '" onclick="window._ivSetTab(\'questions\')">Questions</div>' +
        '<div style="padding:10px 16px;cursor:pointer;font-weight:' + (activeTab === 'interviewers' ? '600' : '400') + ';border-bottom:2px solid ' + (activeTab === 'interviewers' ? 'var(--accent)' : 'transparent') + '" onclick="window._ivSetTab(\'interviewers\')">Interviewers</div></div>' +
      (activeTab === 'questions'
        ? (hasTemplatePreFill && selectedIds.size > 0
            ? '<div style="background:color-mix(in srgb, var(--accent) 8%, var(--bg-card));border:1px solid color-mix(in srgb, var(--accent) 30%, transparent);border-radius:6px;padding:8px 12px;font-size:0.78rem;color:var(--accent);margin-bottom:12px">&#8505; Pre-loaded ' + selectedIds.size + ' questions from ' + esc((position || {}).title || 'position') + ' template. You can add or remove questions for this candidate.</div>'
            : '') +
          '<div style="display:flex;gap:8px;margin-bottom:12px">' +
            '<button class="btn btn--sm" onclick="window._ivAddCustom()">+ Custom Question</button></div>' +
          '<div style="font-weight:600;margin-bottom:8px;color:var(--accent)">' + selectedIds.size + ' selected</div>' +
          '<div style="max-height:calc(100vh - 320px);overflow-y:auto">' + (questionsHtml || '<p style="color:var(--text-muted)">No questions in bank. Add custom questions.</p>') + '</div>'
        : '<div style="max-height:calc(100vh - 320px);overflow-y:auto">' + (interviewersHtml || '<p style="color:var(--text-muted)">No team members found.</p>') + '</div>') +
      '<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px;display:flex;justify-content:space-between;align-items:center">' +
        '<span style="color:var(--text-muted);font-size:13px">' + selectedIds.size + ' questions · ' + selectedInterviewers.size + ' interviewers</span>' +
        '<button class="btn btn--primary" ' + (selectedIds.size === 0 || selectedInterviewers.size === 0 ? 'disabled' : '') + ' onclick="window._ivSendInterviews()">Send Interviews</button></div>';
  }

  window._ivRenderConfig = renderConfigPanel;
  window._ivSetTab = function(tab) { activeTab = tab; renderConfigPanel(); };
  window._ivToggleQ = function(id) { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); renderConfigPanel(); };
  window._ivToggleInterviewer = function(id) { selectedInterviewers.has(id) ? selectedInterviewers.delete(id) : selectedInterviewers.add(id); renderConfigPanel(); };
  window._ivToggleDisc = function(disc) { expandedDisciplines.has(disc) ? expandedDisciplines.delete(disc) : expandedDisciplines.add(disc); renderConfigPanel(); };

  window._ivAddCustom = function() {
    var formHtml = '<div id="ivCustomForm" style="border:1px solid var(--accent);border-radius:8px;padding:12px;margin-bottom:12px;background:var(--bg-elevated)">' +
      '<div style="font-weight:600;margin-bottom:8px">Add Custom Question</div>' +
      '<textarea id="ivCustomText" rows="3" placeholder="Type your interview question..." style="width:100%;font-size:14px;margin-bottom:8px"></textarea>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<select id="ivCustomCat" style="font-size:13px;padding:4px 8px">' +
          '<option value="culture">Culture</option><option value="technical" selected>Technical</option><option value="collaboration">Collaboration</option><option value="leadership">Leadership</option><option value="depth">Depth</option>' +
        '</select>' +
        '<button class="btn btn--primary btn--sm" onclick="window._ivSaveCustom()">Add</button>' +
        '<button class="btn btn--sm" onclick="document.getElementById(\'ivCustomForm\').remove()">Cancel</button>' +
      '</div></div>';
    var container = panel.querySelector('[style*="max-height:calc"]') || panel.querySelector('[style*="max-height:400px"]');
    if (container) container.insertAdjacentHTML('beforebegin', formHtml);
    var ta = document.getElementById('ivCustomText');
    if (ta) ta.focus();
  };
  window._ivSaveCustom = async function() {
    var text = document.getElementById('ivCustomText');
    var cat = document.getElementById('ivCustomCat');
    if (!text || !text.value.trim()) return;
    var resp = await authFetch('/api/interview-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId || null, discipline: positionDiscipline || 'General', category: cat.value, question_text: text.value.trim() }),
    });
    var q = await resp.json();
    if (q && q.id) { allQuestions.push(q); selectedIds.add(q.id); renderConfigPanel(); }
  };

  window._ivSendInterviews = async function() {
    var configId = existingConfigId;
    if (configId) {
      var cfgResp = await authFetch('/api/interview-configs/' + configId + '/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_ids: [...selectedIds],
          interviewer_ids: [...selectedInterviewers],
        }),
      });
      if (!cfgResp.ok) { var err = await cfgResp.json().catch(function() { return {}; }); toast(err.error || 'Failed to configure round', 'error'); return; }
    } else {
      var resp = await authFetch('/api/interview-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          position_id: positionId || null,
          question_ids: [...selectedIds],
          interviewer_ids: [...selectedInterviewers],
        }),
      });
      var result = await resp.json();
      if (!result || !result.config) return;
      configId = result.config.id;
    }
    await authFetch('/api/interview-configs/' + configId + '/activate', { method: 'POST' });
    openCandidateDetail(candidateId);
  };

  renderConfigPanel();
}

async function openInterviewResults(configId) {
  let results;
  try {
    const resp = await authFetch('/api/interview-results/' + configId);
    results = await resp.json();
  } catch (e) { return; }
  if (!results) return;

  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (!overlay || !panel) return;

  const { config, questions, sessions, scores, decision, summary } = results;
  const categories = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];

  var barsHtml = categories.map(function(cat) {
    var avg = summary.category_avgs[cat] || 0;
    var pct = (avg / 5) * 100;
    var colour = cat === 'depth' ? 'var(--warning)' : 'var(--accent)';
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
      '<span style="width:100px;font-size:12px;text-align:right;color:var(--text-muted)">' + cat + '</span>' +
      '<div style="flex:1;background:var(--bg-elevated);border-radius:4px;height:18px;position:relative">' +
        '<div style="background:' + colour + ';width:' + pct + '%;height:100%;border-radius:4px"></div>' +
        '<span style="position:absolute;right:6px;top:1px;font-size:12px;font-weight:600">' + avg.toFixed(1) + '</span></div></div>';
  }).join('');

  var submittedSessions = sessions.filter(function(s) { return s.status === 'submitted'; });
  var headerCols = submittedSessions.map(function(s) {
    return '<th style="font-size:12px;color:var(--text-muted);text-align:center;padding:6px">' + esc(s.interviewer_name) + '</th>';
  }).join('');

  var tableRows = '';
  var currentCat = '';
  questions.forEach(function(q) {
    if (q.category !== currentCat) {
      currentCat = q.category;
      tableRows += '<tr><td colspan="' + (submittedSessions.length + 2) + '" style="background:var(--bg-elevated);padding:4px 8px;font-size:12px;text-transform:uppercase;color:var(--accent);letter-spacing:1px">' + currentCat + '</td></tr>';
    }
    var qScores = submittedSessions.map(function(s) {
      var sc = scores.find(function(sc) { return sc.session_id === s.id && sc.question_id === q.id; });
      if (!sc) return '<td style="text-align:center;padding:6px;color:var(--text-muted)">—</td>';
      var bg = sc.score >= 4 ? 'var(--success-bg)' : sc.score === 3 ? 'var(--warning-bg)' : 'var(--danger-bg)';
      var fg = sc.score >= 4 ? 'var(--success)' : sc.score === 3 ? 'var(--warning)' : 'var(--danger)';
      return '<td style="text-align:center;padding:6px"><span style="background:' + bg + ';color:' + fg + ';padding:2px 8px;border-radius:4px;font-weight:600">' + sc.score + '</span>' + (sc.notes ? ' <span title="' + esc(sc.notes) + '" style="cursor:help;font-size:12px">💬</span>' : '') + '</td>';
    }).join('');

    var qAvgScores = scores.filter(function(sc) { return sc.question_id === q.id; }).map(function(sc) { return sc.score; });
    var qAvg = qAvgScores.length > 0 ? (qAvgScores.reduce(function(a, b) { return a + b; }, 0) / qAvgScores.length).toFixed(1) : '—';
    var minScore = qAvgScores.length > 0 ? Math.min.apply(null, qAvgScores) : 0;
    var maxScore = qAvgScores.length > 0 ? Math.max.apply(null, qAvgScores) : 0;
    var divergent = (maxScore - minScore) >= 3;

    tableRows += '<tr style="' + (divergent ? 'border-left:3px solid var(--warning);background:var(--warning-bg)' : '') + '">' +
      '<td style="padding:6px 8px;font-size:13px;max-width:300px">' + esc(q.question_text) + (divergent ? ' <span style="font-size:12px;color:var(--warning);background:var(--warning-bg);padding:1px 6px;border-radius:4px">DIVERGENT</span>' : '') + '</td>' +
      qScores +
      '<td style="text-align:center;padding:6px;font-weight:600;color:var(--accent)">' + qAvg + '</td></tr>';
  });

  var pendingCount = sessions.filter(function(s) { return s.status !== 'submitted'; }).length;

  panel.innerHTML =
    '<div class="candidate-detail__header"><h3>Interview Results — ' + esc(config.candidate_name || 'Candidate') + '</h3>' +
      '<button class="btn btn--sm" onclick="openCandidateDetail(\'' + config.candidate_id + '\')">Back</button></div>' +
    '<div style="display:flex;gap:16px;margin-bottom:16px">' +
      '<div style="text-align:center;min-width:80px"><div style="font-size:32px;font-weight:700;color:var(--accent)">' + summary.overall_avg.toFixed(1) + '</div><div style="font-size:12px;color:var(--text-muted)">Overall</div></div>' +
      '<div style="flex:1">' + barsHtml + '</div>' +
      '<div style="text-align:center;min-width:100px"><span style="background:' + (pendingCount === 0 ? 'var(--success-bg)' : 'var(--warning-bg)') + ';color:' + (pendingCount === 0 ? 'var(--success)' : 'var(--warning)') + ';padding:4px 12px;border-radius:12px;font-size:12px">' + (sessions.length - pendingCount) + ' of ' + sessions.length + ' submitted</span></div></div>' +
    (config.candidate_stage && config.candidate_stage !== 'interviews' ? '<div style="background:var(--warning-bg);color:var(--warning);padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:13px">Candidate has been moved to "' + config.candidate_stage + '" stage</div>' : '') +
    '<div style="overflow-x:auto;margin-bottom:16px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="text-align:left;padding:6px 8px;font-size:12px;color:var(--text-muted)">Question</th>' + headerCols + '<th style="font-size:12px;color:var(--text-muted);text-align:center;padding:6px">Avg</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>' +
    (!decision
      ? '<div style="border-top:1px solid var(--border);padding-top:12px"><div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Decision</div>' +
        '<div style="display:flex;gap:8px;align-items:flex-start">' +
          '<button class="btn" style="background:var(--success-bg);color:var(--success);border:1px solid var(--success-border)" onclick="window._ivDecide(\'advance\')">Advance</button>' +
          '<button class="btn" style="background:var(--bg-elevated);color:var(--warning);border:1px solid var(--warning-border)" onclick="window._ivDecide(\'hold\')">Hold</button>' +
          '<button class="btn" style="background:var(--bg-elevated);color:var(--danger);border:1px solid var(--danger-border)" onclick="window._ivDecide(\'reject\')">Reject</button>' +
          '<textarea id="ivDecisionNotes" placeholder="Decision notes (required)" rows="2" style="flex:1;font-size:13px"></textarea></div></div>'
      : '<div style="border-top:1px solid var(--border);padding-top:12px;color:var(--text-muted)">Decision: <strong style="color:' + (decision.decision === 'advance' ? 'var(--success)' : decision.decision === 'reject' ? 'var(--danger)' : 'var(--warning)') + '">' + decision.decision.toUpperCase() + '</strong> — ' + esc(decision.notes) + '</div>');

  window._ivDecide = async function(d) {
    var notes = document.getElementById('ivDecisionNotes');
    if (!notes || !notes.value.trim()) { alert('Please add decision notes.'); return; }
    await authFetch('/api/interview-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config_id: configId, decision: d, notes: notes.value }),
    });
    openInterviewResults(configId);
  };
}

async function openInterviewScorecard(sessionId) {
  const container = document.getElementById('interviewScorecardView');
  if (!container) return;

  container.style.display = 'flex';
  container.innerHTML = '<div class="interview-scorecard__body"><div class="interview-scorecard__splash">' +
    '<h2 style="color:var(--text-primary)">Loading Scorecard</h2>' +
    '<p class="meta">Fetching interview data…</p>' +
    '<button class="btn" onclick="closeInterviewScorecard()">Cancel</button>' +
    '</div></div>';
  document.getElementById('appContainer').style.display = 'none';

  let data;
  try {
    const resp = await authFetch('/api/interview-sessions/' + sessionId);
    if (resp.status === 401) { container.innerHTML = '<div class="interview-scorecard__body"><div class="interview-scorecard__splash"><h2>Please log in</h2><p class="meta">You need to be logged in to view this scorecard.</p><button class="btn btn--primary" onclick="closeInterviewScorecard()">Back to Dashboard</button></div></div>'; return; }
    if (resp.status === 403) { container.innerHTML = '<div class="interview-scorecard__body"><div class="interview-scorecard__splash"><h2>Access Denied</h2><p class="meta">You are not assigned to this interview.</p><button class="btn btn--primary" onclick="closeInterviewScorecard()">Back to Dashboard</button></div></div>'; return; }
    if (!resp.ok) { container.innerHTML = '<div class="interview-scorecard__body"><div class="interview-scorecard__splash"><h2>Not Found</h2><p class="meta">Interview session not found.</p><button class="btn btn--primary" onclick="closeInterviewScorecard()">Back to Dashboard</button></div></div>'; return; }
    data = await resp.json();
  } catch (e) {
    container.innerHTML = '<div class="interview-scorecard__body"><div class="interview-scorecard__splash"><h2>Connection Error</h2><p class="meta">Could not load the scorecard. Please try again.</p><button class="btn btn--primary" onclick="closeInterviewScorecard()">Back to Dashboard</button></div></div>';
    return;
  }

  const { session, questions } = data;
  const categoryOrder = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
  const catColours = { culture: '#3b82f6', technical: '#7c3aed', collaboration: '#16a34a', leadership: '#d97706', depth: '#e8a87c' };
  let currentIdx = 0;
  let showNotes = {};
  const localScores = {};
  for (const q of questions) {
    if (q.score) localScores[q.question_id] = { score: q.score, notes: q.score_notes || '' };
  }

  // Handler assignments must be before status checks — 'assigned' returns early
  // but renderSplash's "Begin Scoring" calls renderScoring which needs these.
  window._scNav = function(dir) { currentIdx = Math.max(0, Math.min(questions.length - 1, currentIdx + dir)); renderScoring(); };
  window._scJump = function(idx) { currentIdx = idx; renderScoring(); };
  window._scJumpCat = function(cat) {
    const idx = questions.findIndex(q => q.category === cat && !localScores[q.question_id]);
    if (idx >= 0) { currentIdx = idx; renderScoring(); }
    else { const firstInCat = questions.findIndex(q => q.category === cat); if (firstInCat >= 0) { currentIdx = firstInCat; renderScoring(); } }
  };
  window._scShowNotes = function() { showNotes[questions[currentIdx].question_id] = true; renderScoring(); };
  window._scNotes = function(val) {
    const qid = questions[currentIdx].question_id;
    if (localScores[qid]) localScores[qid].notes = val;
  };
  window._scScore = async function(score) {
    const q = questions[currentIdx];
    localScores[q.question_id] = { score, notes: (localScores[q.question_id] || {}).notes || '' };
    renderScoring();
    try {
      await authFetch('/api/interview-scores/' + sessionId + '/' + q.question_id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, notes: localScores[q.question_id].notes || null }),
      });
    } catch (e) {
      toast('Score not saved — check your connection', 'error');
    }
  };
  window._scSubmit = async function() {
    if (!confirm('Submit your scorecard for ' + (session.candidate_name || 'this candidate') + '? You won\'t be able to change your scores after submission.')) return;
    const q = questions[currentIdx];
    const sc = localScores[q.question_id];
    if (sc && sc.notes) {
      try { await authFetch('/api/interview-scores/' + sessionId + '/' + q.question_id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score: sc.score, notes: sc.notes }) }); } catch (e) {}
    }
    try {
      const resp = await authFetch('/api/interview-sessions/' + sessionId + '/submit', { method: 'POST' });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); toast(err.error || 'Submission failed', 'error'); return; }
      session.status = 'submitted';
      session.submitted_at = new Date().toISOString();
      renderSubmitted();
    } catch (e) {
      toast('Submission failed — check your connection', 'error');
    }
  };

  function scorecardKeyHandler(e) {
    if (session.status === 'submitted') return;
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') { window._scNav(-1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { window._scNav(1); e.preventDefault(); }
    else if (['1','2','3','4','5'].includes(e.key)) { window._scScore(parseInt(e.key)); e.preventDefault(); }
  }
  container.setAttribute('tabindex', '-1');
  container.focus();
  container.addEventListener('keydown', scorecardKeyHandler);
  window._scCleanup = function() { container.removeEventListener('keydown', scorecardKeyHandler); };

  if (session.status === 'submitted') { renderSubmitted(); return; }
  if (session.status === 'assigned') { renderSplash(); return; }
  currentIdx = questions.findIndex(q => !localScores[q.question_id]);
  if (currentIdx < 0) currentIdx = 0;
  renderScoring();

  function renderSplash() {
    const estTime = questions.length * 2;
    container.innerHTML =
      '<div class="interview-scorecard__body"><div class="interview-scorecard__splash">' +
      '<h2>' + esc(session.candidate_name || 'Candidate') + '</h2>' +
      '<p class="meta">' + esc(session.candidate_role || '') + (session.position_title ? ' — ' + esc(session.position_title) : '') + '</p>' +
      (session.client_name ? '<p class="meta">' + esc(session.client_name) + '</p>' : '') +
      '<p class="info">' + questions.length + ' questions · ~' + estTime + ' minutes</p>' +
      '<p class="info" style="font-style:italic;max-width:400px">These scores are confidential — only the hiring manager will see aggregated results.</p>' +
      '<button class="btn btn--primary" style="padding:12px 32px;font-size:16px" onclick="window._scStart()">Begin Scoring</button>' +
      '<button class="btn" style="margin-top:8px" onclick="closeInterviewScorecard()">Cancel</button>' +
      '</div></div>';
    window._scStart = function() { renderScoring(); };
  }

  function renderSubmitted() {
    let html = '<div class="interview-scorecard__header"><div class="interview-scorecard__header-left"><strong>' + esc(session.candidate_name || 'Candidate') + '</strong></div><div class="interview-scorecard__header-right"><button class="btn btn--sm" onclick="closeInterviewScorecard()">Close</button></div></div>';
    html += '<div class="interview-scorecard__body"><div class="interview-scorecard__submitted">';
    html += '<div style="text-align:center;margin-bottom:24px;padding:16px;background:color-mix(in srgb, var(--success) 10%, var(--bg-card));border-radius:8px;border:1px solid var(--success)"><div style="font-size:18px;font-weight:600;color:var(--success)">Your scorecard has been submitted — thank you</div>';
    html += session.submitted_at ? '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">Submitted ' + new Date(session.submitted_at).toLocaleString('en-GB') + '</div>' : '';
    html += '</div>';
    let currentCat = '';
    for (const q of questions) {
      if (q.category !== currentCat) { currentCat = q.category; html += '<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:' + (catColours[currentCat] || 'var(--text-muted)') + ';margin:16px 0 8px;font-weight:600">' + currentCat + '</div>'; }
      const sc = localScores[q.question_id];
      const scoreBg = sc ? (sc.score >= 4 ? 'var(--success)' : sc.score === 3 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-muted)';
      html += '<div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">';
      html += '<span style="flex-shrink:0;width:28px;height:28px;border-radius:6px;background:' + scoreBg + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px">' + (sc ? sc.score : '—') + '</span>';
      html += '<div style="flex:1"><div style="font-size:14px;line-height:1.5">' + esc(q.question_text) + '</div>';
      if (sc && sc.notes) html += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;font-style:italic">' + esc(sc.notes) + '</div>';
      html += '</div></div>';
    }
    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderScoring() {
    const q = questions[currentIdx];
    const scored = Object.keys(localScores).length;
    const pct = questions.length > 0 ? (scored / questions.length) * 100 : 0;

    let catBarsHtml = '';
    for (const cat of categoryOrder) {
      const catQs = questions.filter(x => x.category === cat);
      const catScored = catQs.filter(x => localScores[x.question_id]).length;
      const catPct = catQs.length > 0 ? (catScored / catQs.length) * 100 : 0;
      catBarsHtml += '<div class="interview-scorecard__cat-bar" onclick="window._scJumpCat(\'' + cat + '\')">' +
        '<div class="interview-scorecard__cat-label" style="color:' + (catColours[cat] || 'var(--text-muted)') + '">' + cat + ' ' + catScored + '/' + catQs.length + '</div>' +
        '<div class="interview-scorecard__cat-track"><div class="interview-scorecard__cat-fill" style="width:' + catPct + '%;background:' + (catColours[cat] || 'var(--accent)') + '"></div></div></div>';
    }

    const sc = localScores[q.question_id];
    const scoreLabels = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];
    let scoreBtnsHtml = '';
    for (let s = 1; s <= 5; s++) {
      const sel = sc && sc.score === s;
      scoreBtnsHtml += '<button class="interview-scorecard__score-btn interview-scorecard__score-btn--' + s + (sel ? ' interview-scorecard__score-btn--selected' : '') + '" onclick="window._scScore(' + s + ')">' + s + '<span class="interview-scorecard__score-label">' + scoreLabels[s] + '</span></button>';
    }

    const showingNotes = showNotes[q.question_id] || (sc && sc.notes);
    let notesHtml = '';
    if (showingNotes) {
      notesHtml = '<textarea class="interview-scorecard__notes" placeholder="Optional — add context for the hiring manager" onchange="window._scNotes(this.value)">' + esc(sc && sc.notes ? sc.notes : '') + '</textarea>';
    } else {
      notesHtml = '<button class="interview-scorecard__notes-toggle" onclick="window._scShowNotes()">+ Add notes</button>';
    }

    let dotsHtml = '';
    for (let i = 0; i < questions.length; i++) {
      const dotClass = i === currentIdx ? ' interview-scorecard__dot--current' : (localScores[questions[i].question_id] ? ' interview-scorecard__dot--scored' : '');
      dotsHtml += '<button class="interview-scorecard__dot' + dotClass + '" onclick="window._scJump(' + i + ')"></button>';
    }

    const allScored = scored >= questions.length;
    const isLast = currentIdx === questions.length - 1;
    let navRightHtml = '';
    if (isLast && allScored) {
      navRightHtml = '<button class="btn btn--primary" onclick="window._scSubmit()">Submit Scorecard</button>';
    } else {
      navRightHtml = '<button class="btn btn--sm" ' + (isLast ? 'disabled' : '') + ' onclick="window._scNav(1)">Next &rarr;</button>';
    }

    container.innerHTML =
      '<div class="interview-scorecard__header">' +
        '<div class="interview-scorecard__header-left"><strong>' + esc(session.candidate_name || 'Candidate') + '</strong><span style="color:var(--text-muted)">·</span><span style="color:var(--text-muted)">' + esc(session.candidate_role || '') + '</span>' + (session.client_name ? '<span style="color:var(--text-muted)">·</span><span style="color:var(--text-muted)">' + esc(session.client_name) + '</span>' : '') + '</div>' +
        '<div class="interview-scorecard__header-centre"><span style="font-size:12px;color:var(--text-muted)">' + scored + ' of ' + questions.length + '</span><div class="interview-scorecard__progress-bar"><div class="interview-scorecard__progress-fill" style="width:' + pct + '%"></div></div></div>' +
        '<div class="interview-scorecard__header-right"><button class="btn btn--sm" onclick="closeInterviewScorecard()">Save &amp; Exit</button></div>' +
      '</div>' +
      '<div class="interview-scorecard__categories">' + catBarsHtml + '</div>' +
      '<div class="interview-scorecard__body"><div class="interview-scorecard__card">' +
        '<div class="interview-scorecard__card-badges"><span class="interview-scorecard__badge" style="background:color-mix(in srgb, ' + (catColours[q.category] || 'var(--accent)') + ' 15%, transparent);color:' + (catColours[q.category] || 'var(--accent)') + '">' + q.category + '</span>' +
        (q.discipline ? '<span class="interview-scorecard__badge" style="background:var(--bg-elevated);color:var(--text-muted)">' + esc(q.discipline) + '</span>' : '') + '</div>' +
        '<div class="interview-scorecard__question-text">' + esc(q.question_text) + '</div>' +
        '<div class="interview-scorecard__scores">' + scoreBtnsHtml + '</div>' +
        '<div style="text-align:center">' + notesHtml + '</div>' +
      '</div></div>' +
      '<div class="interview-scorecard__nav">' +
        '<button class="btn btn--sm" ' + (currentIdx === 0 ? 'disabled' : '') + ' onclick="window._scNav(-1)">&larr; Previous</button>' +
        '<div class="interview-scorecard__dots">' + dotsHtml + '</div>' +
        navRightHtml +
      '</div>';
  }

}

function closeInterviewScorecard() {
  const container = document.getElementById('interviewScorecardView');
  if (container) { container.style.display = 'none'; container.innerHTML = ''; }
  if (window._scCleanup) { window._scCleanup(); window._scCleanup = null; }
  document.getElementById('appContainer').style.display = '';
  ['_scNav','_scJump','_scJumpCat','_scShowNotes','_scNotes','_scScore','_scSubmit','_scStart'].forEach(k => { delete window[k]; });
}

function buildCandidateGdprHtml(c, disabledStyle) {
  const expiresAt = c.retention_expires_at ? new Date(c.retention_expires_at) : null;
  const isExpiring = expiresAt && (expiresAt.getTime() - Date.now()) < 30 * 86400000;
  const isPast = expiresAt && expiresAt.getTime() < Date.now();
  return `<div class="candidate-detail__section" style="${disabledStyle}">
    <div class="candidate-detail__section-title">Data Consent</div>
    <div class="candidate-detail__field" style="display:flex;align-items:center;gap:8px">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="cdConsent" ${c.consent_given ? 'checked' : ''} onchange="updateCandidateField('${c.id}','consent_given',this.checked)">
        Consent given
      </label>
      ${c.consent_date ? `<span style="font-size:0.75rem;color:var(--text-muted)">${new Date(c.consent_date).toLocaleDateString()}</span>` : ''}
    </div>
    <div class="candidate-detail__field">
      <label>Retention expires${isPast ? ' <span style="color:var(--danger);font-weight:600">EXPIRED</span>' : isExpiring ? ' <span style="color:var(--warning);font-weight:600">EXPIRING SOON</span>' : ''}</label>
      <input type="date" id="cdRetention" value="${expiresAt ? expiresAt.toISOString().slice(0,10) : ''}" onchange="updateCandidateField('${c.id}','retention_expires_at',this.value||null)" style="${isPast ? 'border-color:var(--danger)' : isExpiring ? 'border-color:var(--warning)' : ''}">
    </div>
  </div>`;
}

function buildCandidateActionsHtml(c, isArchived, isAdmin) {
  const REJECTION_CATEGORIES = ['unqualified','culture-mismatch','compensation','candidate-withdrew','position-filled','no-response','failed-interview','other'];
  const rejCatLabels = { 'unqualified': 'Unqualified', 'culture-mismatch': 'Culture mismatch', 'compensation': 'Compensation', 'candidate-withdrew': 'Candidate withdrew', 'position-filled': 'Position filled', 'no-response': 'No response', 'failed-interview': 'Failed interview', 'other': 'Other' };

  let rejectSection = '';
  if (!isArchived) {
    rejectSection = `<div style="margin-top:var(--space-md);padding-top:var(--space-md);border-top:1px solid rgba(255,255,255,0.06)">
      <div style="font-size:0.82rem;font-weight:600;color:var(--danger);margin-bottom:8px">Actions</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn--sm" style="background:rgba(239,68,68,0.12);color:var(--danger);border:1px solid rgba(239,68,68,0.3)" onclick="document.getElementById('cdRejectForm').style.display='block'">Reject</button>
        <button class="btn btn--sm" style="background:rgba(107,114,128,0.12);color:#9ca3af;border:1px solid rgba(107,114,128,0.3)" onclick="hiringArchiveWithReason('${c.id}','candidate-withdrew')">Candidate Declined</button>
      </div>
      <div id="cdRejectForm" style="display:none;margin-top:10px;padding:12px;background:var(--bg-surface);border-radius:var(--radius-sm)">
        <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:6px">Rejection category</label>
        <select id="cdRejectCategory" style="width:100%;margin-bottom:8px;font-size:0.82rem;padding:5px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
          ${REJECTION_CATEGORIES.map(cat => `<option value="${cat}">${rejCatLabels[cat]}</option>`).join('')}
        </select>
        <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:6px">Reason (optional)</label>
        <textarea id="cdRejectReason" placeholder="Brief reason..." style="width:100%;min-height:50px;font-size:0.82rem;padding:5px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);resize:vertical;font-family:inherit"></textarea>
        <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">
          <button class="btn btn--sm" onclick="document.getElementById('cdRejectForm').style.display='none'">Cancel</button>
          <button class="btn btn--sm" style="background:var(--danger);color:white;border:none" onclick="hiringRejectCandidate('${c.id}')">Confirm Reject</button>
        </div>
      </div>
    </div>`;
  }

  return `${rejectSection}
  <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-lg);padding-top:var(--space-md);border-top:1px solid var(--border-default);flex-wrap:wrap">
    ${isArchived
      ? `<button class="btn btn--sm" style="background:var(--accent);color:#fff" data-action="hiringReopen" data-arg0="${c.id}">Reopen Card</button>`
      : `<button class="btn btn--sm" style="background:transparent;color:var(--danger);border:1px solid var(--danger)" data-action="hiringClearCandidate" data-arg0="${c.id}" title="Void candidate fields but keep the role">Clear Candidate</button>`
    }
    ${isAdmin ? `<button class="btn btn--danger btn--sm" data-action="deleteCandidate" data-arg0="${c.id}">Delete</button>` : ''}
  </div>`;
}

function buildCandidateInterviewsHtml(candidateId, rounds, disabledStyle) {
  const isNBI = !isClientUser();
  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const DENSITY_LIMIT = 5;
  window._ivRoundsDataMap = {};

  if (!rounds || rounds.length === 0) {
    return `<div class="candidate-detail__section" id="cdInterviewsSection" style="${disabledStyle}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="candidate-detail__section-title">Interviews</div>
        ${isNBI ? `<button class="btn btn--sm" style="background:var(--accent);color:#fff;border:none;font-size:0.75rem" onclick="openAddRoundModal('${candidateId}')">+ Add Round</button>` : ''}
      </div>
      <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.82rem">
        <p style="margin:0 0 8px">No interviews scheduled</p>
        ${isNBI ? `<button class="btn btn--sm" style="background:var(--accent);color:#fff;border:none" onclick="openAddRoundModal('${candidateId}')">Schedule first interview</button>` : ''}
      </div>
    </div>`;
  }

  const typeColors = { 'Phone Screen': '#3b82f6', 'Technical': '#7c3aed', 'Cultural': '#f59e0b', 'Final': '#10b981', 'Other': '#6b7280' };
  const outcomeColors = { pending: 'var(--text-muted)', passed: 'var(--success)', failed: 'var(--danger)', rescheduled: 'var(--accent)', no_show: 'var(--danger)', cancelled: 'var(--text-muted)' };
  const outcomeLabels = { pending: 'Pending', passed: 'Passed', failed: 'Failed', rescheduled: 'Rescheduled', no_show: 'No-show', cancelled: 'Cancelled' };
  const now = new Date();

  function buildRoundCard(r, forceExpanded) {
    window._ivRoundsDataMap[r.id] = r;
    const label = r.round_type === 'Other' ? (r.round_type_custom || 'Other') : (r.round_type || 'Interview');
    const color = typeColors[r.round_type] || '#7c3aed';
    const outcome = r.outcome || 'pending';
    const isCancelled = outcome === 'cancelled';
    const cardOpacity = isCancelled ? 'opacity:0.55;' : '';
    const schedStr = r.scheduled_at ? new Date(r.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

    const sessions = r.sessions || [];
    const activeSessions = sessions.filter(s => s.status !== 'declined');
    const submittedCount = sessions.filter(s => s.status === 'submitted').length;
    const totalActive = activeSessions.length;
    const allSubmitted = totalActive > 0 && submittedCount >= totalActive;

    const isStale = r.scheduled_at && new Date(r.scheduled_at) < now && outcome === 'pending' && submittedCount === 0 && totalActive > 0;

    const scoreSummary = totalActive > 0
      ? (allSubmitted && r.aggregate_score ? `${Number(r.aggregate_score).toFixed(1)}/5` : `${submittedCount}/${totalActive} scored`)
      : '';

    const compactHtml = `<div class="iv-round-compact" data-config-id="${r.id}" onclick="window._ivExpandRound('${r.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;border-left:3px solid ${color};background:var(--bg-surface);border-radius:var(--radius-sm);margin-bottom:4px;${cardOpacity}transition:background 0.15s" onmouseenter="this.style.background='var(--bg-elevated)'" onmouseleave="this.style.background='var(--bg-surface)'">
      <span style="font-size:12px;color:var(--text-muted);transition:transform 0.15s" class="iv-chevron">&#9654;</span>
      <span style="font-weight:600;font-size:0.82rem;color:${color};flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Round ${r.round_number}: ${esc(label)}</span>
      ${isStale ? `<span style="font-size:0.75rem;padding:2px 6px;border-radius:8px;background:color-mix(in srgb, var(--warning) 15%, var(--bg-surface));color:var(--warning)" title="Overdue — scoring not started">Overdue</span>` : ''}
      ${scoreSummary ? `<span style="font-size:0.75rem;color:${allSubmitted && r.aggregate_score ? 'var(--text-primary)' : 'var(--text-muted)'};font-weight:${allSubmitted && r.aggregate_score ? '600' : '400'}">${scoreSummary}</span>` : ''}
      <span style="font-size:0.75rem;padding:2px 8px;border-radius:8px;background:color-mix(in srgb, ${outcomeColors[outcome]} 15%, var(--bg-surface));color:${outcomeColors[outcome]}">${outcomeLabels[outcome] || outcome}</span>
      ${schedStr ? `<span style="font-size:0.75rem;color:var(--text-muted)">${schedStr}</span>` : ''}
    </div>`;

    const durStr = r.duration_minutes ? `${r.duration_minutes}min` : '';

    const sessionsHtml = sessions.length > 0 ? sessions.map(s => {
      const sColor = s.status === 'submitted' ? 'var(--success)' : s.status === 'declined' ? 'var(--danger)' : s.status === 'in_progress' ? 'var(--accent)' : 'var(--text-muted)';
      const blindLabel = isClientUser() ? '' : (s.scored_count ? ` (${s.scored_count} scored)` : '');
      return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;padding:3px 8px;border-radius:8px;background:color-mix(in srgb, ${sColor} 12%, var(--bg-surface));color:${sColor}">${esc(s.interviewer_name || 'Interviewer')} &middot; ${s.status}${blindLabel}</span>`;
    }).join(' ') : (r.interviewer_name ? `<span style="font-size:0.75rem;color:var(--text-muted)">${esc(r.interviewer_name)}</span>` : '');

    const hasResults = allSubmitted && r.aggregate_score && !isClientUser();

    const expandedHtml = `<div class="iv-round-expanded" data-config-id="${r.id}" style="display:none;border-left:3px solid ${color};background:var(--bg-surface);border-radius:var(--radius-sm);margin-bottom:4px;${cardOpacity}">
      <div onclick="window._ivExpandRound('${r.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border-default)">
        <span style="font-size:12px;color:var(--text-muted);transform:rotate(90deg)" class="iv-chevron">&#9654;</span>
        <span style="font-weight:600;font-size:0.85rem;color:${color};flex:1">Round ${r.round_number}: ${esc(label)}</span>
        <span style="font-size:0.75rem;padding:2px 8px;border-radius:8px;background:color-mix(in srgb, ${outcomeColors[outcome]} 15%, var(--bg-surface));color:${outcomeColors[outcome]}">${outcomeLabels[outcome] || outcome}</span>
      </div>
      <div style="padding:10px 12px">
        ${isStale ? `<div style="font-size:0.75rem;padding:6px 10px;border-radius:6px;background:color-mix(in srgb, var(--warning) 10%, var(--bg-surface));color:var(--warning);margin-bottom:8px;border:1px solid color-mix(in srgb, var(--warning) 30%, transparent)">Overdue — scheduled ${schedStr}, scoring not started</div>` : ''}
        <div style="font-size:0.78rem;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">
          ${schedStr ? `<span>&#128197; ${schedStr}</span>` : '<span style="color:var(--text-muted)">Not scheduled</span>'}
          ${durStr ? `<span>&#9201; ${durStr}</span>` : ''}
          ${r.location ? `<span>&#128205; ${esc(r.location)}</span>` : ''}
        </div>
        ${sessionsHtml ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${sessionsHtml}</div>` : ''}
        ${totalActive > 0 ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">${r.question_count || 0} questions &middot; ${submittedCount} of ${totalActive} interviewers scored${allSubmitted && r.aggregate_score ? ` &middot; Avg: <strong style="color:var(--text-primary)">${Number(r.aggregate_score).toFixed(1)}</strong>/5` : ''}</div>` : ''}
        ${r.outcome_notes ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px;padding:6px 8px;background:var(--bg-elevated);border-radius:4px">${esc(r.outcome_notes)}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${isNBI && outcome !== 'cancelled' ? `<select onchange="window._ivSetOutcome('${r.id}',this.value)" style="font-size:0.75rem;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:4px;color:var(--text-primary);font-family:inherit">
            <option value="pending" ${outcome === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="passed" ${outcome === 'passed' ? 'selected' : ''}>Passed</option>
            <option value="failed" ${outcome === 'failed' ? 'selected' : ''}>Failed</option>
            <option value="rescheduled" ${outcome === 'rescheduled' ? 'selected' : ''}>Rescheduled</option>
            <option value="no_show" ${outcome === 'no_show' ? 'selected' : ''}>No-show</option>
          </select>` : ''}
          ${r.round_type !== 'Phone Screen' && isNBI && (r.question_count === 0 || sessions.length === 0) ? (function() { var cd = (_candidatesData||[]).find(function(x){return x.id===candidateId}); return `<button class="btn btn--sm" style="font-size:0.75rem;background:var(--accent);color:#fff;border:none" onclick="openInterviewConfig('${candidateId}','${cd?.client_id || ''}','${cd?.position_id || ''}','${r.id}')">Configure Questions &amp; Interviewers</button>`; })() : ''}
          ${hasResults ? `<button class="btn btn--sm" style="font-size:0.75rem" onclick="openInterviewResults('${r.id}')">View Results &rarr;</button>` : ''}
          ${isNBI && outcome !== 'cancelled' ? `<button class="btn btn--sm" style="font-size:0.75rem;background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border-default)" onclick="window._ivEditRound('${r.id}','${candidateId}')">&#9998; Edit</button>` : ''}
          ${isNBI && r.status === 'active' && totalActive > 0 && !allSubmitted ? `<button class="btn btn--sm" style="font-size:0.75rem;background:var(--bg-elevated);color:var(--accent);border:1px solid color-mix(in srgb, var(--accent) 40%, transparent)" onclick="window._ivResendRound('${r.id}')">&#9993; Resend</button>` : ''}
          ${isNBI && outcome !== 'cancelled' ? `<button class="btn btn--sm" style="font-size:0.75rem;background:transparent;color:var(--text-muted);border:1px solid var(--border-default)" onclick="window._ivCancelRound('${r.id}')">Cancel</button>` : ''}
          ${isAdmin ? `<button class="btn btn--sm" style="font-size:0.75rem;background:transparent;color:var(--danger);border:1px solid var(--danger)" onclick="window._ivDeleteRound('${r.id}','${candidateId}')">Delete</button>` : ''}
        </div>
        <div id="ivScorecard_${r.id}" style="margin-top:8px"></div>
      </div>
    </div>`;

    return compactHtml + expandedHtml;
  }

  const visibleRounds = rounds.slice(0, DENSITY_LIMIT);
  const hiddenRounds = rounds.slice(DENSITY_LIMIT);

  const visibleHtml = visibleRounds.map(r => buildRoundCard(r, false)).join('');
  const hiddenHtml = hiddenRounds.length > 0
    ? `<div id="ivHiddenRounds" style="display:none">${hiddenRounds.map(r => buildRoundCard(r, false)).join('')}</div>
       <button id="ivShowMoreBtn" class="btn btn--sm" style="width:100%;margin-bottom:8px;font-size:0.75rem;background:var(--bg-elevated);color:var(--text-muted);border:1px solid var(--border-default)" onclick="window._ivShowMore()">Show ${hiddenRounds.length} more round${hiddenRounds.length > 1 ? 's' : ''}</button>`
    : '';

  return `<div class="candidate-detail__section" id="cdInterviewsSection" style="${disabledStyle}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div class="candidate-detail__section-title" style="margin-bottom:0">Interviews (${rounds.length})</div>
      ${isNBI ? `<button class="btn btn--sm" style="background:var(--accent);color:#fff;border:none;font-size:0.75rem" onclick="openAddRoundModal('${candidateId}')">+ Add Round</button>` : ''}
    </div>
    ${visibleHtml}
    ${hiddenHtml}
    <div id="cdDecisionBar"></div>
  </div>`;
}

window._ivExpandedRounds = new Set();

window._ivExpandRound = function(configId) {
  const compact = document.querySelector(`.iv-round-compact[data-config-id="${configId}"]`);
  const expanded = document.querySelector(`.iv-round-expanded[data-config-id="${configId}"]`);
  if (!compact || !expanded) return;
  const isOpen = window._ivExpandedRounds.has(configId);
  if (isOpen) {
    compact.style.display = 'flex';
    expanded.style.display = 'none';
    window._ivExpandedRounds.delete(configId);
  } else {
    compact.style.display = 'none';
    expanded.style.display = 'block';
    window._ivExpandedRounds.add(configId);
    var r = (window._ivRoundsDataMap || {})[configId];
    if (r) {
      var sessions = r.sessions || [];
      var hasSubmitted = sessions.some(function(s) { return s.status === 'submitted'; });
      var container = document.getElementById('ivScorecard_' + configId);
      if (hasSubmitted && container && !container.dataset.loaded) {
        window._ivLoadScorecard(configId, container);
      }
    }
  }
};

window._ivSetOutcome = async function(configId, outcome) {
  try {
    const resp = await authFetch('/api/interview-configs/' + configId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: outcome }),
    });
    if (resp.ok) toast('Outcome updated');
    else toast('Failed to update outcome', 'error');
  } catch (e) { toast('Network error', 'error'); }
};

window._ivCancelRound = async function(configId) {
  const ok = await themedConfirm('Cancel this interview round? The round data will be preserved but marked as cancelled.', 'Cancel Round', 'Cancel Round');
  if (!ok) return;
  try {
    const resp = await authFetch('/api/interview-configs/' + configId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'cancelled' }),
    });
    if (resp.ok) {
      toast('Round cancelled');
      const cid = document.getElementById('candidateDetailPanel')?.dataset?.candidateId;
      if (cid) openCandidateDetail(cid);
    } else toast('Failed to cancel round', 'error');
  } catch (e) { toast('Network error', 'error'); }
};

window._ivDeleteRound = async function(configId, candidateId) {
  const ok = await themedConfirm('Permanently delete this interview round? All scores and session data will be lost.', 'Delete Round', 'Delete');
  if (!ok) return;
  try {
    const resp = await authFetch('/api/interview-configs/' + configId, { method: 'DELETE' });
    if (resp.ok) {
      toast('Round deleted');
      openCandidateDetail(candidateId);
    } else toast('Failed to delete round', 'error');
  } catch (e) { toast('Network error', 'error'); }
};

window._ivShowMore = function() {
  const hidden = document.getElementById('ivHiddenRounds');
  const btn = document.getElementById('ivShowMoreBtn');
  if (hidden) hidden.style.display = 'block';
  if (btn) btn.style.display = 'none';
};

window._ivEditRound = async function(configId, candidateId) {
  var r = (window._ivRoundsDataMap || {})[configId];
  if (!r) { toast('Round data not found', 'error'); return; }

  var users = [];
  var isPhoneScreen = r.round_type === 'Phone Screen';
  if (!isPhoneScreen) {
    try {
      var uResp = await authFetch('/api/users');
      users = await uResp.json();
      users = (users || []).filter(function(u) { return u.is_active !== false && !u.client_id; });
    } catch (e) {}
  }

  var dateVal = '';
  var timeVal = '';
  if (r.scheduled_at) {
    var dt = new Date(r.scheduled_at);
    dateVal = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    timeVal = String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
  }

  var sessions = r.sessions || [];
  var assignedIds = new Set(sessions.map(function(s) { return s.interviewer_id; }));
  var candidate = (_candidatesData || []).find(function(c) { return c.id === candidateId; });
  var candidateName = candidate ? candidate.name : 'Candidate';

  var interviewersHtml = '';
  if (!isPhoneScreen) {
    interviewersHtml = '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-default)">';
    interviewersHtml += '<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px;font-weight:600">Interviewers</div>';
    if (sessions.length > 0) {
      for (var si = 0; si < sessions.length; si++) {
        var s = sessions[si];
        var sColor = s.status === 'submitted' ? 'var(--success)' : s.status === 'declined' ? 'var(--danger)' : s.status === 'in_progress' ? 'var(--accent)' : 'var(--text-muted)';
        var canRemove = s.status !== 'submitted';
        interviewersHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-default)">' +
          '<span style="flex:1;font-size:0.85rem">' + esc(s.interviewer_name || 'Interviewer') + '</span>' +
          '<span style="font-size:0.72rem;padding:2px 6px;border-radius:8px;background:color-mix(in srgb, ' + sColor + ' 12%, var(--bg-surface));color:' + sColor + '">' + s.status + '</span>' +
          (canRemove ? '<button class="btn btn--sm" style="font-size:0.72rem;color:var(--danger);background:transparent;border:1px solid var(--danger);padding:2px 8px" onclick="window._ivRemoveInterviewer(\'' + s.id + '\',\'' + configId + '\',\'' + candidateId + '\')">Remove</button>' : '') +
          '</div>';
      }
    } else {
      interviewersHtml += '<div style="font-size:0.8rem;color:var(--text-muted);padding:4px 0">No interviewers assigned</div>';
    }
    var available = users.filter(function(u) { return !assignedIds.has(u.id); });
    if (available.length > 0) {
      interviewersHtml += '<div style="display:flex;gap:8px;align-items:center;margin-top:8px">' +
        '<select id="ivEditAddInterviewer" style="flex:1;font-size:0.82rem;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">' +
        '<option value="">Select interviewer…</option>' +
        available.map(function(u) { return '<option value="' + u.id + '">' + esc(u.display_name || u.username) + '</option>'; }).join('') +
        '</select>' +
        '<button class="btn btn--sm" style="font-size:0.75rem;background:var(--accent);color:#fff;border:none" onclick="window._ivAddInterviewer(\'' + configId + '\',\'' + candidateId + '\')">Add</button>' +
        '</div>';
    }
    interviewersHtml += '</div>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML =
  '<div style="background:var(--bg-card);border-radius:var(--radius-md);width:min(520px,90vw);max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px" role="dialog" aria-modal="true" aria-label="Edit interview round">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
      '<h3 style="margin:0;font-size:1rem;color:var(--text-primary)">Edit Round ' + r.round_number + ' — ' + esc(candidateName) + '</h3>' +
      '<button onclick="this.closest(\'.modal-overlay\').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;padding:4px">&times;</button>' +
    '</div>' +

    '<div style="margin-bottom:12px">' +
      '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Round Type</label>' +
      '<select id="ivEditType" onchange="document.getElementById(\'ivEditCustomRow\').style.display=this.value===\'Other\'?\'block\':\'none\'" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;font-family:inherit">' +
        '<option value="Phone Screen"' + (r.round_type === 'Phone Screen' ? ' selected' : '') + '>Phone Screen</option>' +
        '<option value="Technical"' + (r.round_type === 'Technical' ? ' selected' : '') + '>Technical</option>' +
        '<option value="Cultural"' + (r.round_type === 'Cultural' ? ' selected' : '') + '>Cultural</option>' +
        '<option value="Final"' + (r.round_type === 'Final' ? ' selected' : '') + '>Final</option>' +
        '<option value="Other"' + (r.round_type === 'Other' ? ' selected' : '') + '>Other (custom label)</option>' +
      '</select>' +
    '</div>' +

    '<div id="ivEditCustomRow" style="display:' + (r.round_type === 'Other' ? 'block' : 'none') + ';margin-bottom:12px">' +
      '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Custom Label</label>' +
      '<input id="ivEditCustomLabel" type="text" maxlength="40" value="' + esc(r.round_type_custom || '') + '" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
      '<div>' +
        '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Date</label>' +
        '<input id="ivEditDate" type="date" value="' + dateVal + '" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
      '</div>' +
      '<div>' +
        '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Time</label>' +
        '<input id="ivEditTime" type="time" value="' + timeVal + '" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
      '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
      '<div>' +
        '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Duration (minutes)</label>' +
        '<input id="ivEditDuration" type="number" value="' + (r.duration_minutes || 60) + '" min="5" max="480" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
      '</div>' +
      '<div>' +
        '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Location</label>' +
        '<input id="ivEditLocation" type="text" value="' + esc(r.location || '') + '" placeholder="e.g. Office, Zoom" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
      '</div>' +
    '</div>' +

    (isPhoneScreen
      ? '<div style="margin-bottom:12px">' +
          '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Interviewer Name</label>' +
          '<input id="ivEditInterviewerName" type="text" value="' + esc(r.interviewer_name || '') + '" placeholder="e.g. Glen Pryer" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
        '</div>'
      : '') +

    interviewersHtml +

    '<div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--border-default);margin-top:12px">' +
      '<button class="btn btn--sm" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
      '<button class="btn btn--sm btn--primary" id="ivEditSaveBtn" onclick="window._ivSaveRoundEdit(\'' + configId + '\',\'' + candidateId + '\',this)">Save Changes</button>' +
    '</div>' +
  '</div>';

  document.body.appendChild(overlay);
  if (typeof _trapFocus === 'function') _trapFocus(overlay.querySelector('[role="dialog"]'));
};

window._ivSaveRoundEdit = async function(configId, candidateId, btn) {
  var roundType = document.getElementById('ivEditType')?.value;
  var customLabel = document.getElementById('ivEditCustomLabel')?.value?.trim();
  var date = document.getElementById('ivEditDate')?.value;
  var time = document.getElementById('ivEditTime')?.value;
  var duration = parseInt(document.getElementById('ivEditDuration')?.value) || 60;
  var location = document.getElementById('ivEditLocation')?.value?.trim();
  var interviewerName = document.getElementById('ivEditInterviewerName')?.value?.trim();

  if (roundType === 'Other' && !customLabel) { toast('Custom label is required for Other type', 'error'); return; }

  var body = {
    round_type: roundType,
    round_type_custom: roundType === 'Other' ? customLabel : null,
    duration_minutes: duration,
    location: location || null,
  };

  if (date && time) body.scheduled_at = new Date(date + 'T' + time).toISOString();
  else if (date) body.scheduled_at = new Date(date + 'T00:00').toISOString();
  else body.scheduled_at = null;

  if (roundType === 'Phone Screen' && interviewerName !== undefined) body.interviewer_name = interviewerName || null;

  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    var resp = await authFetch('/api/interview-configs/' + configId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      var overlay = btn.closest('.modal-overlay');
      if (overlay) overlay.remove();
      toast('Round updated');
      openCandidateDetail(candidateId);
    } else {
      var err = await resp.json().catch(function() { return {}; });
      toast(err.error || 'Failed to update round', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  } catch (e) {
    toast('Network error', 'error');
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
};

window._ivAddInterviewer = async function(configId, candidateId) {
  var select = document.getElementById('ivEditAddInterviewer');
  if (!select || !select.value) { toast('Select an interviewer', 'error'); return; }
  try {
    var resp = await authFetch('/api/interview-configs/' + configId + '/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewer_id: select.value }),
    });
    if (resp.ok) {
      toast('Interviewer added');
      var overlay = document.querySelector('.modal-overlay');
      if (overlay) overlay.remove();
      openCandidateDetail(candidateId);
    } else {
      var err = await resp.json().catch(function() { return {}; });
      toast(err.error || 'Failed to add interviewer', 'error');
    }
  } catch (e) { toast('Network error', 'error'); }
};

window._ivRemoveInterviewer = async function(sessionId, configId, candidateId) {
  var ok = await themedConfirm('Remove this interviewer from the round?', 'Remove Interviewer', 'Remove');
  if (!ok) return;
  try {
    var resp = await authFetch('/api/interview-sessions/' + sessionId, { method: 'DELETE' });
    if (resp.ok) {
      toast('Interviewer removed');
      var overlay = document.querySelector('.modal-overlay');
      if (overlay) overlay.remove();
      openCandidateDetail(candidateId);
    } else {
      var err = await resp.json().catch(function() { return {}; });
      toast(err.error || 'Failed to remove interviewer', 'error');
    }
  } catch (e) { toast('Network error', 'error'); }
};

window._ivResendRound = async function(configId) {
  var ok = await themedConfirm('Resend interview notification emails to all pending interviewers?', 'Resend Notifications', 'Resend');
  if (!ok) return;
  try {
    var resp = await authFetch('/api/interview-configs/' + configId + '/resend', { method: 'POST' });
    if (resp.ok) {
      var result = await resp.json();
      toast('Resent to ' + result.resent + ' interviewer' + (result.resent !== 1 ? 's' : ''));
    } else {
      var err = await resp.json().catch(function() { return {}; });
      toast(err.error || 'Failed to resend', 'error');
    }
  } catch (e) { toast('Network error', 'error'); }
};

window._ivLoadScorecard = async function(configId, container) {
  container.innerHTML = '<div style="font-size:0.82rem;color:var(--text-muted);padding:8px 0">Loading scorecard…</div>';
  container.dataset.loaded = '1';
  try {
    var resp = await authFetch('/api/interview-results/' + configId);
    if (!resp.ok) { container.innerHTML = ''; container.dataset.loaded = ''; return; }
    var results = await resp.json();
    var questions = results.questions;
    var sessions = results.sessions;
    var scores = results.scores;
    var summary = results.summary;
    var scoreLabels = { 1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent' };

    var submittedSessions = sessions.filter(function(s) { return s.status === 'submitted'; });
    if (submittedSessions.length === 0) { container.innerHTML = ''; container.dataset.loaded = ''; return; }

    var html = '<div style="border-top:1px solid var(--border-default);padding-top:10px">';

    if (summary && summary.overall_avg !== null && summary.overall_avg !== undefined) {
      html += '<div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;padding:10px 12px;background:var(--bg-elevated);border-radius:var(--radius-sm);flex-wrap:wrap">';
      html += '<div style="text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--accent)">' + Number(summary.overall_avg).toFixed(1) + '</div><div style="font-size:0.75rem;color:var(--text-muted)">Overall</div></div>';
      var catAvgs = summary.category_avgs || {};
      var catKeys = Object.keys(catAvgs);
      for (var ci = 0; ci < catKeys.length; ci++) {
        var catVal = Number(catAvgs[catKeys[ci]]);
        var catFg = catVal >= 4 ? 'var(--success)' : catVal >= 3 ? 'var(--warning)' : 'var(--danger)';
        html += '<div style="text-align:center"><div style="font-size:1rem;font-weight:600;color:' + catFg + '">' + catVal.toFixed(1) + '</div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:capitalize">' + catKeys[ci] + '</div></div>';
      }
      html += '</div>';
    }

    var currentCat = '';
    for (var qi = 0; qi < questions.length; qi++) {
      var q = questions[qi];
      if (q.category !== currentCat) {
        currentCat = q.category;
        var catAvg = (summary && summary.category_avgs && summary.category_avgs[currentCat]) ? Number(summary.category_avgs[currentCat]).toFixed(1) : '';
        html += '<div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent);margin:12px 0 6px;font-weight:600;display:flex;justify-content:space-between">' +
          '<span>' + currentCat + '</span>' + (catAvg ? '<span>' + catAvg + '/5</span>' : '') + '</div>';
      }

      html += '<div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:6px">';
      html += '<div style="font-size:0.85rem;line-height:1.5;color:var(--text-primary);margin-bottom:8px">' + esc(q.question_text) + '</div>';

      for (var sj = 0; sj < submittedSessions.length; sj++) {
        var sc = scores.find(function(x) { return x.session_id === submittedSessions[sj].id && x.question_id === q.question_id; });
        if (!sc) continue;
        var bg = sc.score >= 4 ? 'color-mix(in srgb, var(--success) 15%, transparent)' : sc.score === 3 ? 'color-mix(in srgb, var(--warning) 15%, transparent)' : 'color-mix(in srgb, var(--danger) 15%, transparent)';
        var fg = sc.score >= 4 ? 'var(--success)' : sc.score === 3 ? 'var(--warning)' : 'var(--danger)';
        html += '<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">';
        if (submittedSessions.length > 1) html += '<span style="font-size:0.78rem;color:var(--text-muted);min-width:80px">' + esc(submittedSessions[sj].interviewer_name || 'Interviewer') + '</span>';
        html += '<span style="background:' + bg + ';color:' + fg + ';padding:2px 10px;border-radius:4px;font-weight:600;font-size:0.85rem;white-space:nowrap">' + sc.score + ' — ' + (scoreLabels[sc.score] || '') + '</span>';
        html += '</div>';
        if (sc.notes) {
          html += '<div style="font-size:0.82rem;color:var(--text-secondary);margin:2px 0 6px' + (submittedSessions.length > 1 ? ';padding-left:88px' : '') + ';font-style:italic;line-height:1.4">' + esc(sc.notes) + '</div>';
        }
      }
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '';
    container.dataset.loaded = '';
  }
};

function openAddRoundModal(candidateId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  const candidate = (_candidatesData || []).find(c => c.id === candidateId);
  const candidateName = candidate ? candidate.name : 'Candidate';

  overlay.innerHTML = `
  <div style="background:var(--bg-card);border-radius:var(--radius-md);width:min(520px,90vw);max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px" role="dialog" aria-modal="true" aria-label="Add interview round">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;font-size:1rem;color:var(--text-primary)">Add Interview Round — ${esc(candidateName)}</h3>
      <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;padding:4px">&times;</button>
    </div>

    <div style="margin-bottom:12px">
      <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Round Type</label>
      <select id="ivAddType" onchange="window._ivAddTypeChanged()" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;font-family:inherit">
        <option value="Phone Screen">Phone Screen</option>
        <option value="Technical">Technical</option>
        <option value="Cultural">Cultural</option>
        <option value="Final">Final</option>
        <option value="Other">Other (custom label)</option>
      </select>
    </div>

    <div id="ivAddCustomRow" style="display:none;margin-bottom:12px">
      <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Custom Label</label>
      <input id="ivAddCustomLabel" type="text" maxlength="40" placeholder="e.g. Portfolio Review" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Date</label>
        <input id="ivAddDate" type="date" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">
      </div>
      <div>
        <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Time</label>
        <input id="ivAddTime" type="time" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Duration (minutes)</label>
        <input id="ivAddDuration" type="number" value="60" min="5" max="480" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">
      </div>
      <div>
        <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Location</label>
        <input id="ivAddLocation" type="text" placeholder="e.g. Office, Zoom" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">
      </div>
    </div>

    <div id="ivAddInterviewerRow" style="margin-bottom:16px">
      <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Interviewer Name</label>
      <input id="ivAddInterviewer" type="text" placeholder="e.g. Glen Pryer" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">
    </div>

    <div id="ivAddScoredNote" style="display:none;margin-bottom:16px;padding:10px;border-radius:var(--radius-sm);background:color-mix(in srgb, var(--accent) 8%, var(--bg-surface));font-size:0.78rem;color:var(--text-secondary)">
      For scored rounds (Technical, Cultural, Final), you will be able to select questions and interviewers after creating the round via the Configure Interview panel.
    </div>

    <div id="ivAddPastWarn" style="display:none;margin-bottom:12px;padding:8px;border-radius:var(--radius-sm);background:color-mix(in srgb, var(--warning) 10%, var(--bg-surface));font-size:0.78rem;color:var(--warning)">This date is in the past — the round will be created for retrospective entry.</div>

    <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--border-default)">
      <button class="btn btn--sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn--sm btn--primary" id="ivAddSubmitBtn" onclick="window._ivSubmitAddRound('${candidateId}', this)">Create Round</button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  _trapFocus(overlay.querySelector('[role="dialog"]'));
  document.getElementById('ivAddType')?.focus();
}

window._ivAddTypeChanged = function() {
  const type = document.getElementById('ivAddType')?.value;
  const isPhoneScreen = type === 'Phone Screen';
  const isOther = type === 'Other';
  const customRow = document.getElementById('ivAddCustomRow');
  const interviewerRow = document.getElementById('ivAddInterviewerRow');
  const scoredNote = document.getElementById('ivAddScoredNote');
  if (customRow) customRow.style.display = isOther ? 'block' : 'none';
  if (interviewerRow) interviewerRow.style.display = isPhoneScreen ? 'block' : 'none';
  if (scoredNote) scoredNote.style.display = isPhoneScreen ? 'none' : 'block';
};

window._ivSubmitAddRound = async function(candidateId, btn) {
  const roundType = document.getElementById('ivAddType')?.value;
  const customLabel = document.getElementById('ivAddCustomLabel')?.value?.trim();
  const date = document.getElementById('ivAddDate')?.value;
  const time = document.getElementById('ivAddTime')?.value;
  const duration = parseInt(document.getElementById('ivAddDuration')?.value) || 60;
  const location = document.getElementById('ivAddLocation')?.value?.trim();
  const interviewer = document.getElementById('ivAddInterviewer')?.value?.trim();

  if (roundType === 'Other' && !customLabel) { toast('Custom label is required for Other type', 'error'); return; }

  const scheduledAt = (date && time) ? new Date(date + 'T' + time).toISOString() : null;

  const pastWarn = document.getElementById('ivAddPastWarn');
  if (scheduledAt && new Date(scheduledAt) < new Date() && pastWarn) pastWarn.style.display = 'block';

  const isPhoneScreen = roundType === 'Phone Screen';
  const body = {
    candidate_id: candidateId,
    round_type: roundType,
    scheduled_at: scheduledAt,
    duration_minutes: duration,
    location: location || undefined,
  };
  if (roundType === 'Other') body.round_type_custom = customLabel;
  if (isPhoneScreen && interviewer) body.interviewer_name = interviewer;

  const overlay = btn.closest('.modal-overlay');
  btn.disabled = true;
  btn.textContent = 'Creating…';
  try {
    const resp = await authFetch('/api/interview-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      if (overlay) overlay.remove();
      toast('Interview round created');
      openCandidateDetail(candidateId);
    } else {
      const err = await resp.json().catch(() => ({}));
      toast(err.error || 'Failed to create round', 'error');
      btn.disabled = false;
      btn.textContent = 'Create Round';
    }
  } catch (e) {
    toast('Network error', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Round';
  }
};




/**
 * Open the slide-in detail panel for a candidate. Builds the panel synchronously
 * then skeleton-loads timeline and comments in parallel.
 * @param {string} id - The candidate UUID
 */
async function openCandidateDetail(id) {
  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (!overlay || !panel) return;

  const c = await apiCall('/api/candidates/' + id);
  if (!c) return;

  let interviewConfig = null;
  // Always fetch — the old stage gate referenced 'hired', a stage key that no
  // longer exists (renamed onboarding/onboarded), so interview context (incl.
  // pending round outcomes) silently vanished once a candidate left 'offer'.
  {
    try {
      const cfgResp = await authFetch('/api/interview-configs?candidate_id=' + c.id);
      const configs = await cfgResp.json();
      if (configs && configs.length > 0) interviewConfig = configs[0];
    } catch (e) {}
  }

  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const isDetailScoped = isClientUser();
  let clientList = getContractedClientRecords();
  if (c.client_id && !clientList.some(cl => cl.id === c.client_id)) {
    const existing = Object.values(_apiClientsCache || {}).find(cl => cl && cl.id === c.client_id);
    if (existing) clientList = [...clientList, existing].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  const positions = _hiringPositionsData || [];
  const isArchived = !!c.archived_at;
  const disabledStyle = isArchived ? 'pointer-events:none;opacity:0.55' : '';
  const docsPromise = c.client_id
    ? apiCall(`/api/documents?client_id=${c.client_id}&candidate_id=${id}`).catch(() => [])
    : Promise.resolve([]);
  const filesPromise = apiCall(`/api/candidates/${id}/files`).catch(() => []);
  const [roundsData, candidateStages, docsData, filesData] = await Promise.all([
    apiCall(`/api/interview-configs?candidate_id=${id}&include=progress`).then(r => r || []).catch(() => []),
    getHiringStagesForClient(c.client_id),
    docsPromise,
    filesPromise,
  ]);

  panel.dataset.candidateId = id;
  panel.innerHTML = `
    ${buildCandidateHeaderHtml(c, isArchived)}
    <div class="candidate-detail__stage-bar">${buildCandidateStageBarHtml(c, isArchived, disabledStyle, candidateStages)}</div>
    <div class="candidate-detail__tabs">
      <button class="candidate-detail__tab candidate-detail__tab--active" data-tab="profile" onclick="switchCandidateTab(this,'profile')">Profile</button>
      <button class="candidate-detail__tab" data-tab="interviews" onclick="switchCandidateTab(this,'interviews')">Interviews${roundsData && roundsData.length > 0 ? ' (' + roundsData.length + ')' : ''}</button>
      <button class="candidate-detail__tab" data-tab="activity" onclick="switchCandidateTab(this,'activity')">Activity</button>
      <button class="candidate-detail__tab" data-tab="documents" onclick="switchCandidateTab(this,'documents')" id="cdDocsTabBtn">Documents${((docsData || []).length + (filesData || []).length + (c.cv_filename ? 1 : 0)) > 0 ? ' (' + ((docsData || []).length + (filesData || []).length + (c.cv_filename ? 1 : 0)) + ')' : ''}</button>
      <button class="candidate-detail__tab" data-tab="settings" onclick="switchCandidateTab(this,'settings')">Settings</button>
    </div>
    <div class="candidate-detail__body">
      <div id="cdTabProfile" class="candidate-detail__tab-content candidate-detail__tab-content--active">
        ${buildCandidateProfileHtml(c, isDetailScoped, clientList, positions, disabledStyle)}
        <div class="candidate-detail__section" style="${disabledStyle}">
          <div class="candidate-detail__section-title">Contract Status</div>
          <select onchange="updateCandidateField('${id}','contract_status',this.value||null)" style="width:100%;padding:6px 8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
            <option value="">— Not started —</option>
            <option value="creation-of-contract" ${c.contract_status==='creation-of-contract'?'selected':''}>Creation of Contract</option>
            <option value="contract-sent" ${c.contract_status==='contract-sent'?'selected':''}>Contract Sent</option>
            <option value="edits-on-contract" ${c.contract_status==='edits-on-contract'?'selected':''}>Edits on Contract</option>
            <option value="contract-in-review" ${c.contract_status==='contract-in-review'?'selected':''}>Contract in Review</option>
            <option value="contract-signed" ${c.contract_status==='contract-signed'?'selected':''}>Contract Signed</option>
          </select>
        </div>
        ${buildCandidateTagsHtml(c, disabledStyle)}
      </div>
      <div id="cdTabInterviews" class="candidate-detail__tab-content">
        ${buildCandidateStageSubHtml(c, interviewConfig)}
        ${buildCandidateInterviewsHtml(id, roundsData, disabledStyle)}
      </div>
      <div id="cdTabActivity" class="candidate-detail__tab-content">
        <div class="candidate-detail__section" id="cdTimelineSection">
          <div class="candidate-detail__section-title">Timeline</div>
          <div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0">Loading history…</div>
        </div>
        <div class="candidate-detail__section" id="cdCommentsSection" style="${disabledStyle}">
          <div class="candidate-detail__section-title">Comments <span id="cdCommentCount" style="font-size:0.78rem;color:var(--text-muted)">(${c.comment_count || 0})</span></div>
          <div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0">Loading comments…</div>
        </div>
      </div>
      <div id="cdTabDocuments" class="candidate-detail__tab-content">
        ${buildCandidateDocumentsHtml(c, docsData || [], filesData || [], disabledStyle)}
      </div>
      <div id="cdTabSettings" class="candidate-detail__tab-content">
        ${buildCandidateGdprHtml(c, disabledStyle)}
        ${buildCandidateActionsHtml(c, isArchived, isAdmin)}
      </div>
    </div>`;

  overlay.style.display = 'block';
  overlay.onclick = (e) => { if (e.target === overlay) closeCandidateDetail(); };
  panel.classList.add('open');
  setupCandidateDocsDrop(id);
  window._candidateDetailPreviousFocus = document.activeElement;
  if (typeof _trapFocus === 'function') _trapFocus(panel);
  window._candidateDetailEscHandler = (e) => { if (e.key === 'Escape') closeCandidateDetail(); };
  document.addEventListener('keydown', window._candidateDetailEscHandler);

  const [activityData, commentsData] = await Promise.all([
    apiCall(`/api/candidates/${id}/activity`).catch(() => []),
    apiCall(`/api/candidates/${id}/comments`).catch(() => []),
  ]);

  const timelineEl = document.getElementById('cdTimelineSection');
  if (timelineEl) {
    const actIcons = { stage_change: '&#128260;', comment: '&#128172;', comment_added: '&#128172;', interview_scheduled: '&#128197;', interview_outcome: '&#9989;', cv_uploaded: '&#128196;', cv_removed: '&#128465;', source_set: '&#128279;', created: '&#10024;', archived: '&#128230;', reopened: '&#128275;' };
    if (!activityData || activityData.length === 0) {
      timelineEl.innerHTML = `<div class="candidate-detail__section-title">Activity</div><div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0">No activity recorded</div>`;
    } else {
      timelineEl.innerHTML = `<div class="candidate-detail__section-title">Activity</div>
        ${activityData.map(ev => {
          const ago = _relativeTime(new Date(ev.created_at));
          const icon = actIcons[ev.event_type] || '&#128204;';
          const isComment = ev.event_type === 'comment' || ev.event_type === 'comment_added';
          const isStage = ev.event_type === 'stage_change';
          return `<div style="display:flex;gap:10px;padding:6px 0;font-size:0.82rem;border-left:2px solid ${isStage ? 'var(--accent)' : isComment ? '#7c3aed33' : 'var(--border-default)'};padding-left:14px;margin-left:4px;${isComment ? 'background:var(--bg-surface);border-radius:0 6px 6px 0;padding:8px 14px;margin-bottom:4px' : ''}">
            <span style="font-size:14px;flex-shrink:0">${icon}</span>
            <div style="flex:1;min-width:0">
              <div style="color:${isComment ? 'var(--text-primary)' : 'var(--text-muted)'}">${esc(ev.detail || ev.event_type)}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${esc(ev.actor)} · ${ago}</div>
            </div>
          </div>`;
        }).join('')}`;
    }
  }

  renderCandidateComments(id, commentsData, disabledStyle);

  if (c.stage === 'onboarding') {
    loadOnboardingChecklist(id);
  }

  loadDecisionBar(id);
  _pushEntityHash('hiring/candidate', id);
}

async function loadDecisionBar(candidateId) {
  const container = document.getElementById('cdDecisionBar');
  if (!container) return;
  if (!_currentUser || _currentUser.role !== 'admin') { container.innerHTML = ''; return; }

  const decisions = await apiCall('/api/hiring-decisions?candidate_id=' + candidateId);

  const REJECTION_CATEGORIES = [
    { value: 'skills-mismatch', label: 'Skills mismatch' },
    { value: 'culture-fit', label: 'Culture fit' },
    { value: 'experience-level', label: 'Experience level' },
    { value: 'salary-expectations', label: 'Salary expectations' },
    { value: 'better-candidate', label: 'Better candidate available' },
    { value: 'position-filled', label: 'Position filled' },
    { value: 'candidate-withdrew', label: 'Candidate withdrew' },
    { value: 'other', label: 'Other' },
  ];

  const historyHtml = (decisions && decisions.length > 0) ? decisions.map(d => {
    const dColor = d.decision === 'advance' ? 'var(--success)' : d.decision === 'reject' ? 'var(--danger)' : 'var(--warning)';
    const ago = _relativeTime(new Date(d.decided_at));
    return `<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;font-size:0.78rem;border-bottom:1px solid var(--border-default)">
      <span style="font-size:0.75rem;padding:2px 8px;border-radius:8px;background:color-mix(in srgb, ${dColor} 15%, var(--bg-surface));color:${dColor};font-weight:600;text-transform:uppercase;flex-shrink:0">${d.decision}</span>
      <div style="flex:1;min-width:0">
        <div style="color:var(--text-secondary)">${esc(d.notes)}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${esc(d.decided_by_name || 'Unknown')} &middot; ${ago}${d.rejection_category ? ' &middot; ' + esc(d.rejection_category) : ''}</div>
      </div>
    </div>`;
  }).join('') : '';

  const catOptions = REJECTION_CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('');

  container.innerHTML = `
    <div style="margin-top:12px;padding-top:12px;border-top:2px solid var(--border-default)">
      <div style="font-weight:600;font-size:0.85rem;margin-bottom:8px;color:var(--text-primary)">Hiring Decision</div>
      ${historyHtml ? `<div style="margin-bottom:10px">${historyHtml}</div>` : ''}
      <textarea id="ivBarDecisionNotes" placeholder="Decision notes (required)..." rows="2" style="width:100%;font-size:0.82rem;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;resize:vertical;margin-bottom:8px"></textarea>
      <div id="ivBarRejectCatRow" style="display:none;margin-bottom:8px">
        <select id="ivBarRejectCategory" style="width:100%;font-size:0.82rem;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit">
          <option value="">Select rejection reason...</option>
          ${catOptions}
        </select>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn--sm" style="background:var(--success);color:#fff;border:none;font-weight:600" onclick="window._ivDecideCandidate('${candidateId}','advance',this)">Advance</button>
        <button class="btn btn--sm" style="background:var(--warning);color:#fff;border:none;font-weight:600" onclick="window._ivDecideCandidate('${candidateId}','hold',this)">Hold</button>
        <button class="btn btn--sm" style="background:var(--danger);color:#fff;border:none;font-weight:600" onclick="window._ivShowRejectFlow('${candidateId}')">Reject</button>
      </div>
    </div>`;
}

window._ivShowRejectFlow = function(candidateId) {
  const row = document.getElementById('ivBarRejectCatRow');
  if (row) row.style.display = 'block';
  const notes = document.getElementById('ivBarDecisionNotes');
  if (notes && !notes.value.trim()) notes.focus();
};

window._ivDecideCandidate = async function(candidateId, decision, btn) {
  const notes = document.getElementById('ivBarDecisionNotes')?.value?.trim();
  if (!notes) { toast('Notes are required', 'error'); document.getElementById('ivBarDecisionNotes')?.focus(); return; }

  let rejection_category = null;
  if (decision === 'reject') {
    rejection_category = document.getElementById('ivBarRejectCategory')?.value;
    if (!rejection_category) { toast('Please select a rejection reason', 'error'); return; }
  }

  await withButtonLoading(btn, async () => {
    const resp = await authFetch('/api/hiring-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, decision, notes, rejection_category }),
    });
    if (resp.ok) {
      toast(decision === 'advance' ? 'Candidate advanced to offer' : decision === 'reject' ? 'Candidate rejected' : 'Decision recorded');
      openCandidateDetail(candidateId);
    } else {
      const err = await resp.json().catch(() => ({}));
      toast(err.error || 'Failed to record decision', 'error');
    }
  });
};

/** Render the comments section of the candidate detail panel. */
function renderCandidateComments(candidateId, comments, disabledStyle) {
  const section = document.getElementById('cdCommentsSection');
  if (!section) return;
  const isNBI = !isClientUser();

  const commentsHtml = (comments && comments.length > 0)
    ? comments.map(cm => {
        const ago = _relativeTime(new Date(cm.created_at));
        const canDelete = cm.author_user_id === (_currentUser && _currentUser.id) || (_currentUser && _currentUser.role === 'admin');
        const migrated = cm.author === 'System Migration';
        return `<div style="padding:8px 0;border-bottom:1px solid var(--border-default);font-size:0.78rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-weight:600">${esc(cm.author)}${cm.internal ? ' <span style="font-size:0.75rem;background:var(--warning);color:#000;padding:1px 4px;border-radius:4px">INTERNAL</span>' : ''}${migrated ? ' <span style="font-size:0.75rem;color:var(--text-muted)">(migrated from notes)</span>' : ''}</span>
            <span style="color:var(--text-muted);font-size:0.75rem">${ago}</span>
          </div>
          <div style="white-space:pre-wrap;word-break:break-word">${esc(cm.body)}</div>
          ${canDelete ? `<button class="btn btn--ghost btn--sm" style="font-size:0.75rem;color:var(--danger);margin-top:4px" onclick="deleteCandidateComment('${candidateId}','${cm.id}')">Delete</button>` : ''}
        </div>`;
      }).join('')
    : '<div style="color:var(--text-muted);font-size:0.78rem;padding:8px 0">No comments yet</div>';

  section.innerHTML = `<div class="candidate-detail__section-title">Comments <span id="cdCommentCount" style="font-size:0.75rem;color:var(--text-muted)">(${comments ? comments.length : 0})</span></div>
    ${commentsHtml}
    <div style="display:flex;gap:6px;margin-top:8px;${disabledStyle}">
      ${isNBI ? '<label style="display:flex;align-items:center;gap:4px;font-size:0.75rem;color:var(--text-muted)"><input type="checkbox" id="cdCommentInternal"> Internal</label>' : ''}
      <input type="text" id="cdCommentBody" placeholder="Add a comment…" style="flex:1;font-size:0.78rem;padding:4px 8px" onkeydown="if(event.key==='Enter'){event.preventDefault();postCandidateComment('${candidateId}');}">
      <button class="btn btn--sm" onclick="postCandidateComment('${candidateId}')">Post</button>
    </div>`;
}

/** Add a tag to a candidate (deduplicates, lowercases). */
async function hiringAddTag(candidateId, tagInput) {
  if (!tagInput || !tagInput.trim()) return;
  const c = _candidatesData.find(x => x.id === candidateId);
  if (!c) return;
  const current = Array.isArray(c.tags) ? [...c.tags] : [];
  const newTag = tagInput.trim().toLowerCase();
  if (current.includes(newTag)) return;
  current.push(newTag);
  await updateCandidateField(candidateId, 'tags', current);
}

/** Remove a tag from a candidate. */
async function hiringRemoveTag(candidateId, tag) {
  const c = _candidatesData.find(x => x.id === candidateId);
  if (!c) return;
  const current = Array.isArray(c.tags) ? c.tags.filter(t => t !== tag) : [];
  await updateCandidateField(candidateId, 'tags', current);
}

/** Post a new comment on a candidate. */
async function postCandidateComment(candidateId) {
  const bodyEl = document.getElementById('cdCommentBody');
  const internalEl = document.getElementById('cdCommentInternal');
  if (!bodyEl || !bodyEl.value.trim()) return;

  const resp = await authFetch(`/api/candidates/${candidateId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: bodyEl.value.trim(), internal: internalEl ? internalEl.checked : false }),
  });
  if (resp.ok) {
    const idx = _candidatesData.findIndex(x => x.id === candidateId);
    if (idx >= 0 && typeof _candidatesData[idx].comment_count === 'number') {
      _candidatesData[idx].comment_count++;
    }
    const comments = await apiCall(`/api/candidates/${candidateId}/comments`).catch(() => []);
    const isArchived = _candidatesData[idx] && !!_candidatesData[idx].archived_at;
    renderCandidateComments(candidateId, comments, isArchived ? 'pointer-events:none;opacity:0.55' : '');
    if (currentView === 'hiring') renderContent();
  } else {
    toast('Failed to post comment', 'error');
  }
}

/** Delete a comment from a candidate. */
async function deleteCandidateComment(candidateId, commentId) {
  const resp = await authFetch(`/api/candidates/${candidateId}/comments/${commentId}`, { method: 'DELETE' });
  if (resp.ok) {
    const idx = _candidatesData.findIndex(x => x.id === candidateId);
    if (idx >= 0 && typeof _candidatesData[idx].comment_count === 'number' && _candidatesData[idx].comment_count > 0) {
      _candidatesData[idx].comment_count--;
    }
    const comments = await apiCall(`/api/candidates/${candidateId}/comments`).catch(() => []);
    const isArchived = _candidatesData[idx] && !!_candidatesData[idx].archived_at;
    renderCandidateComments(candidateId, comments, isArchived ? 'pointer-events:none;opacity:0.55' : '');
    if (currentView === 'hiring') renderContent();
  } else {
    toast('Failed to delete comment', 'error');
  }
}

/** Close the candidate detail slide-in panel and restore focus. */
function closeCandidateDetail() {
  _clearEntityHash();
  if (window._candidateDetailPreviousFocus) { window._candidateDetailPreviousFocus.focus(); window._candidateDetailPreviousFocus = null; }
  if (window._candidateDetailEscHandler) { document.removeEventListener('keydown', window._candidateDetailEscHandler); window._candidateDetailEscHandler = null; }
  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Update a single field on a candidate via PATCH and refresh the cached list.
 * @param {string} id - Candidate UUID
 * @param {string} field - Field key (name, role, linkedin_url, due_date, stage, client_id, position_id, notes)
 * @param {*} value - New value (empty string is normalised to null)
 */
async function updateCandidateField(id, field, value) {
  // ALL stage changes route through the transition gateway (bug de607254) so
  // the stage-relevant fields prompt fires no matter which control moved the
  // candidate (arrows, mobile select, kanban drop, stage dropdown).
  if (field === 'stage') return hiringRequestStageChange(id, value);
  await _hiringPatchCandidate(id, { [field]: value === '' ? null : value });
}

/** PATCH a candidate and refresh every dependent surface (cards, sidebar, open panel). */
async function _hiringPatchCandidate(id, body) {
  const resp = await authFetch('/api/candidates/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (resp.ok) {
    await loadCandidates();
    if (currentView === 'hiring') renderContent();
    renderSidebar();
    // Re-render detail panel so dependent UI (stage pills, position list) updates
    const panel = document.getElementById('candidateDetailPanel');
    if (panel && panel.classList.contains('open')) openCandidateDetail(id);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to update', 'error');
  }
  return resp.ok;
}

/**
 * Single gateway for candidate stage changes (bug de607254). When the target
 * stage carries process state (the offer-like stage before onboarding, or an
 * onboarding stage), a small transition prompt collects the stage-relevant
 * fields (contract status, start date) so cards stop going stale as they move.
 * One PATCH carries everything — the server applies stage history, checklist
 * auto-population and field updates in the same transaction.
 * 'onboarded' keeps its dedicated confirm flow (hiringConfirmHire).
 */
async function hiringRequestStageChange(id, newStage, opts = {}) {
  const c = (_candidatesData || []).find(x => x.id === id);
  if (!c) { toast('Candidate not found', 'error'); return; }
  if (newStage === c.stage) {
    if (typeof opts.position === 'number') await _hiringPatchCandidate(id, { position: opts.position });
    return;
  }
  if (newStage === 'onboarded') { await hiringConfirmHire(id); return; }

  const stages = await getHiringStagesForClient(c.client_id);
  const targetIdx = stages.findIndex(s => s.key === newStage);
  const target = targetIdx >= 0 ? stages[targetIdx] : {};
  const onboardingIdx = stages.findIndex(s => s.is_onboarding);
  const targetIsOnboarding = !!target.is_onboarding;
  // "Offer-like" = the stage directly before the onboarding stage in this
  // client's pipeline (custom pipelines may rename it, so position decides).
  const targetIsOfferLike = !targetIsOnboarding && onboardingIdx > 0 && targetIdx === onboardingIdx - 1;

  const basePatch = { stage: newStage };
  if (typeof opts.position === 'number') basePatch.position = opts.position;

  // Moves without process state (sourcing, interviews, process_closed, custom
  // early stages) stay frictionless — no prompt.
  if (!targetIsOnboarding && !targetIsOfferLike) {
    await _hiringPatchCandidate(id, basePatch);
    return;
  }

  // Pending interview rounds — informational hint inside the prompt
  let pendingRounds = [];
  try {
    const rounds = await apiCall(`/api/interview-configs?candidate_id=${id}&include=progress`) || [];
    pendingRounds = rounds.filter(r => !r.outcome || r.outcome === 'pending');
  } catch (e) { /* hint only — never block the move */ }

  const CONTRACT_OPTIONS = [
    ['', '— Not started —'],
    ['creation-of-contract', 'Creation of Contract'],
    ['contract-sent', 'Contract Sent'],
    ['edits-on-contract', 'Edits on Contract'],
    ['contract-in-review', 'Contract in Review'],
    ['contract-signed', 'Contract Signed'],
  ];
  // Moving into onboarding with a contract in flight: suggest Signed
  const suggested = targetIsOnboarding && ['contract-sent', 'edits-on-contract', 'contract-in-review'].includes(c.contract_status || '')
    ? 'contract-signed'
    : (c.contract_status || '');
  const targetLabel = target.label || newStage;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="modal" style="min-width:380px;max-width:500px">
    <div class="modal__title">Move to ${esc(targetLabel)}</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="font-size:0.85rem;color:var(--text-secondary)">${esc(c.name || 'Candidate')} is moving to <strong>${esc(targetLabel)}</strong>. Update the process fields that usually change at this step:</div>
      <label style="font-size:0.78rem;color:var(--text-muted)">Contract status
        <select id="stageTrContract" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">
          ${CONTRACT_OPTIONS.map(([v, l]) => `<option value="${v}" ${suggested === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
      <label style="font-size:0.78rem;color:var(--text-muted)">Start date
        <input type="date" id="stageTrStartDate" value="${c.start_date ? String(c.start_date).slice(0, 10) : ''}" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">
      </label>
      ${pendingRounds.length > 0 ? `<div style="font-size:0.8rem;color:var(--warning);background:color-mix(in srgb, var(--warning) 12%, transparent);border:1px solid var(--warning);border-radius:var(--radius-sm);padding:8px 10px">
        <div style="margin-bottom:6px">&#9888; ${pendingRounds.length} interview round${pendingRounds.length > 1 ? 's' : ''} still pending — set outcomes now or leave as pending:</div>
        ${pendingRounds.map(r => `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
          <span style="flex:1;color:var(--text-primary);font-size:0.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.round_name || r.name || r.round_type || 'Interview round')}</span>
          <select class="stage-tr-round" data-round-id="${r.id}" style="font-size:0.78rem;padding:3px 6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
            <option value="">Leave pending</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>`).join('')}
      </div>` : ''}
      ${targetIsOnboarding ? `<div style="font-size:0.8rem;color:var(--text-muted)">The onboarding checklist is created automatically when the move is saved.</div>` : ''}
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
      <button class="btn" id="stageTrCancel">Cancel</button>
      <button class="btn" id="stageTrSkip" title="Move the card without changing contract status or start date">Move only</button>
      <button class="btn btn--primary" id="stageTrSave">Save &amp; Move</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const close = () => { try { document.body.removeChild(overlay); } catch (e) {} };
  // Cancel must also reset any control that already shows the new stage (the
  // detail panel's stage select changes before this prompt resolves)
  const revert = () => {
    if (currentView === 'hiring') renderContent();
    const panel = document.getElementById('candidateDetailPanel');
    if (panel && panel.classList.contains('open')) openCandidateDetail(id);
  };
  const applyRoundOutcomes = async () => {
    const selects = overlay.querySelectorAll('.stage-tr-round');
    for (const sel of selects) {
      if (sel.value) {
        try {
          await authFetch('/api/interview-configs/' + sel.dataset.roundId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outcome: sel.value }),
          });
        } catch (e) { /* round outcome is best-effort; the move itself must not fail */ }
      }
    }
  };
  overlay.querySelector('#stageTrCancel').onclick = () => { close(); revert(); };
  overlay.onclick = (e) => { if (e.target === overlay) { close(); revert(); } };
  overlay.querySelector('#stageTrSkip').onclick = async () => {
    close();
    await _hiringPatchCandidate(id, basePatch);
  };
  overlay.querySelector('#stageTrSave').onclick = async () => {
    const contract = overlay.querySelector('#stageTrContract').value;
    const startDate = overlay.querySelector('#stageTrStartDate').value;
    close();
    await applyRoundOutcomes();
    const patch = { ...basePatch, contract_status: contract || null, start_date: startDate || null };
    await _hiringPatchCandidate(id, patch);
  };
}

// ===== HIRING — Glen spec helpers (bug b7a2f97f) =====

/** Handle stage dropdown change — delegates to the stage-transition gateway
 *  (which routes 'onboarded' to the confirm flow and prompts for stage fields). */
async function hiringStageSelectChange(id, newStage) {
  await hiringRequestStageChange(id, newStage);
}

/** Show the "Close Candidate Card?" confirmation for moving a candidate to Onboarded.
 *  On confirm: sets stage=onboarded + archived_at=now. On cancel: reverts to the previous stage. */
async function hiringConfirmHire(id) {
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const prev = c.stage;
  const ok = await themedConfirm('Close Candidate Card?\nThis will mark the candidate as Onboarded and archive the card.', 'Close Candidate Card', 'Confirm');
  if (!ok) {
    if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
    return;
  }
  const resp = await authFetch('/api/candidates/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'onboarded', archived_at: new Date().toISOString() })
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

/** Reopen an archived candidate — clears archived_at. */
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

async function hiringRejectCandidate(id) {
  var category = document.getElementById('cdRejectCategory').value;
  var reason = document.getElementById('cdRejectReason').value.trim();
  try {
    var resp = await authFetch('/api/candidates/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_category: category, rejection_reason: reason || null, archived_at: new Date().toISOString() })
    });
    if (resp.ok) {
      toast('Candidate rejected');
      await loadCandidates();
      if (currentView === 'hiring') renderContent();
      if (document.getElementById('candidateDetailPanel') && document.getElementById('candidateDetailPanel').classList.contains('open')) openCandidateDetail(id);
    } else { toast('Failed to reject', 'error'); }
  } catch (e) { toast('Network error', 'error'); }
}

async function hiringArchiveWithReason(id, category) {
  var ok = await themedConfirm('Record this candidate as having declined?', 'Candidate Declined', 'Confirm');
  if (!ok) return;
  try {
    var resp = await authFetch('/api/candidates/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_category: category, archived_at: new Date().toISOString() })
    });
    if (resp.ok) {
      toast('Candidate archived');
      await loadCandidates();
      if (currentView === 'hiring') renderContent();
      if (document.getElementById('candidateDetailPanel') && document.getElementById('candidateDetailPanel').classList.contains('open')) openCandidateDetail(id);
    } else { toast('Failed to archive', 'error'); }
  } catch (e) { toast('Network error', 'error'); }
}

/** Clear the candidate identity — voids name, CV, linkedin, but keeps role/client
 *  so the slot can be refilled. Per Glen spec. */
async function hiringClearCandidate(id) {
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const terminalStage = HIRING_STAGES[HIRING_STAGES.length - 1];
  if (c.stage === terminalStage) {
    // Terminal stage — no rejection needed, just archive
    const ok = await themedConfirm('Archive this candidate?', 'Archive', 'Confirm');
    if (!ok) return;
    const resp = await authFetch('/api/candidates/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived_at: new Date().toISOString() }),
    });
    if (resp.ok) { toast('Candidate archived'); await loadCandidates(); if (currentView === 'hiring') renderContent(); renderSidebar(); }
    else toast('Failed to archive', 'error');
    return;
  }

  // Non-terminal — show rejection modal
  const categories = ['unqualified','culture-mismatch','compensation','candidate-withdrew','position-filled','no-response','failed-interview','other'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="modal" style="min-width:360px;max-width:480px">
    <div class="modal__title">Archive Candidate</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <label style="font-size:0.78rem;color:var(--text-muted)">Rejection category *
        <select id="rejCategory" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">
          <option value="">— Select —</option>
          ${categories.map(cat => `<option value="${cat}">${cat.replace(/-/g, ' ').replace(/^./, s => s.toUpperCase())}</option>`).join('')}
        </select>
      </label>
      <label style="font-size:0.78rem;color:var(--text-muted)">Reason (optional)
        <textarea id="rejReason" rows="3" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px;resize:vertical" placeholder="Why is this candidate being archived?"></textarea>
      </label>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
      <button class="btn" id="rejCancel">Cancel</button>
      <button class="btn btn--danger" id="rejConfirm">Archive</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const close = () => { try { document.body.removeChild(overlay); } catch(e){} };
  overlay.querySelector('#rejCancel').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.querySelector('#rejConfirm').onclick = async () => {
    const category = overlay.querySelector('#rejCategory').value;
    if (!category) { toast('Please select a rejection category', 'error'); return; }
    const reason = overlay.querySelector('#rejReason').value.trim();
    close();
    const resp = await authFetch('/api/candidates/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived_at: new Date().toISOString(), rejection_category: category, rejection_reason: reason || null }),
    });
    if (resp.ok) {
      toast('Candidate archived');
      await loadCandidates();
      if (currentView === 'hiring') renderContent();
      renderSidebar();
      if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
    } else {
      const err = await resp.json().catch(() => ({}));
      toast(err.error || 'Failed to archive', 'error');
    }
  };
}

/** Add a team member to the assignee list for a specific stage. */
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

/** Remove an assignee from a specific stage. */
async function hiringRemoveStageAssignee(id, stage, idx) {
  // Fetch the single candidate so we get stage_assignees — the list endpoint
  // omits that column, so reading from _candidatesData would give an empty object
  // and silently wipe all assignees instead of removing just the one clicked.
  const fresh = await apiCall('/api/candidates/' + id);
  if (!fresh) return;
  const current = (fresh.stage_assignees && typeof fresh.stage_assignees === 'object') ? { ...fresh.stage_assignees } : {};
  const list = Array.isArray(current[stage]) ? [...current[stage]] : [];
  if (idx < 0 || idx >= list.length) return;
  list.splice(idx, 1);
  current[stage] = list;
  await updateCandidateField(id, 'stage_assignees', current);
}

/** Add an onboarding link (Google Doc / Drive / etc.) to the Onboard Candidate stage. */
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

/** Remove an onboarding link by index. */
async function removeOnboardingLink(id, idx) {
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const links = Array.isArray(c.onboarding_links) ? [...c.onboarding_links] : [];
  if (idx < 0 || idx >= links.length) return;
  links.splice(idx, 1);
  await updateCandidateField(id, 'onboarding_links', links);
}

/**
 * Upload a CV file for a candidate. Uses multipart/form-data POST.
 * @param {string} id - Candidate UUID
 * @param {HTMLInputElement} input - The file input element
 */
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

/**
 * Download the CV file for a candidate. Triggers a browser download via
 * an in-memory blob URL so the auth header is preserved.
 * @param {string} id - Candidate UUID
 */
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

/**
 * Delete a candidate after confirmation (admin only).
 * @param {string} id - Candidate UUID
 */
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

