// ==================== AIOS ACTION QUEUE ====================
// Admin-only page for reviewing, approving, and routing AIOS actions.

let _aiosData = null;
let _aiosTab = 'pending';
let _aiosRoutingActionId = null;
let _aiosRoutingAction = null;
let _aiosRoutingClients = null;
let _aiosRoutingProjects = null;
let _aiosRoutingSelectedClientId = null;
let _aiosPollingTimer = null;

function _aiosRiskColour(risk) {
  if (risk === 'critical') return 'var(--danger)';
  if (risk === 'high') return 'var(--warning)';
  if (risk === 'medium') return 'var(--accent)';
  return 'var(--text-muted)';
}

function _aiosRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

function _aiosApiState() {
  if (_aiosTab === 'awaiting_routing') return 'approved';
  if (_aiosTab === 'in_progress' || _aiosTab === 'completed' || _aiosTab === 'failed') return 'approved';
  return _aiosTab;
}

function _aiosExecStateParam() {
  if (_aiosTab === 'awaiting_routing') return 'awaiting_routing';
  if (_aiosTab === 'in_progress') return 'in_progress';
  if (_aiosTab === 'completed') return 'completed';
  if (_aiosTab === 'failed') return 'failed';
  return null;
}

async function _aiosLoadActions() {
  try {
    const params = new URLSearchParams({ state: _aiosApiState() });
    const exec = _aiosExecStateParam();
    if (exec) params.set('execution_state', exec);
    _aiosData = await apiCall('/api/aios/actions?' + params.toString()) || [];
  } catch (e) {
    _aiosData = [];
  }
}

async function switchAiosTab(tab) {
  _aiosTab = tab;
  _aiosData = null;
  renderContent();
  await _aiosLoadActions();
  renderContent();
}

function renderAiosQueueView(container) {
  if (_aiosData === null) {
    container.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-card"></div>' +
      Array(4).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading AIOS actions</span></div>';
    _aiosLoadActions().then(function() { if (currentView === 'aios') renderContent(); });
    return;
  }

  var tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'awaiting_routing', label: 'Awaiting Routing' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'failed', label: 'Failed' },
  ];

  var html = '<div style="padding:var(--space-xl)">';
  html += '<h2 style="font-family:var(--font-display);font-size:1.25rem;margin-bottom:var(--space-lg)">AIOS Action Queue</h2>';

  // Tab bar
  html += '<div style="display:flex;gap:4px;margin-bottom:var(--space-lg);border-bottom:1px solid var(--border-default)">';
  tabs.forEach(function(t) {
    var active = _aiosTab === t.key;
    html += '<button class="btn btn--sm ' + (active ? 'btn--primary' : 'btn--ghost') + '" style="border-radius:var(--radius-md) var(--radius-md) 0 0;border-bottom:none" data-action="switchAiosTab" data-arg0="' + t.key + '">' + esc(t.label) + '</button>';
  });
  html += '</div>';

  // Action cards
  if (_aiosData.length === 0) {
    html += '<div style="padding:24px;text-align:center;color:var(--text-muted);border:1px dashed var(--border-default);border-radius:var(--radius-md)">No actions in this state.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:var(--space-md)">';
    _aiosData.forEach(function(a) {
      html += _renderAiosCard(a);
    });
    html += '</div>';
  }

  html += '</div>';

  // Routing modal overlay + panel
  html += '<div id="aiosRoutingOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999" data-action="closeAiosRouting"></div>';
  html += '<div id="aiosRoutingPanel" style="display:none;position:fixed;top:0;right:0;width:400px;max-width:90vw;height:100vh;background:var(--bg-surface);border-left:1px solid var(--border-default);z-index:1000;overflow-y:auto;padding:var(--space-xl);box-shadow:-4px 0 24px rgba(0,0,0,0.2)"></div>';

  container.innerHTML = html;

  // Start polling
  if (_aiosPollingTimer) clearInterval(_aiosPollingTimer);
  _aiosPollingTimer = setInterval(async function() {
    if (currentView !== 'aios') { clearInterval(_aiosPollingTimer); _aiosPollingTimer = null; return; }
    if (_aiosRoutingActionId) return;
    try {
      await _aiosLoadActions();
      if (currentView === 'aios') renderContent();
    } catch (e) { /* silent */ }
  }, 30000);
}

function _renderAiosCard(a) {
  var riskCol = _aiosRiskColour(a.risk_class);
  var recipeType = (a.execution_recipe && a.execution_recipe.type) || '';
  var html = '<div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-md) var(--space-lg)">';
  // Header row
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">';
  html += '<div style="flex:1"><strong style="color:var(--text-primary);font-size:0.9rem">' + esc(a.title) + '</strong>';
  html += '<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">';
  html += '<span style="font-size:0.7rem;padding:1px 6px;border-radius:10px;background:var(--bg-input);color:var(--text-muted)">' + esc(a.action_type) + '</span>';
  html += '<span style="font-size:0.7rem;padding:1px 6px;border-radius:10px;background:var(--bg-input);color:' + riskCol + '">' + esc(a.risk_class) + '</span>';
  if (recipeType) html += '<span style="font-size:0.7rem;padding:1px 6px;border-radius:10px;background:var(--bg-input);color:var(--accent)">' + esc(recipeType) + '</span>';
  html += '<span style="font-size:0.7rem;color:var(--text-muted)">' + esc(a.source_system || '') + '</span>';
  html += '</div></div>';
  html += '<span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap">' + _aiosRelativeTime(a.created_at) + '</span>';
  html += '</div>';
  // Description
  if (a.description) {
    var desc = a.description.length > 150 ? a.description.slice(0, 150) + '...' : a.description;
    html += '<div style="margin-top:8px;font-size:0.82rem;color:var(--text-secondary)">' + esc(desc) + '</div>';
  }
  // Actions
  html += '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">';
  if (_aiosTab === 'pending') {
    html += '<button class="btn btn--sm btn--primary" data-action="openAiosRouting" data-arg0="' + a.id + '">Approve</button>';
    html += '<button class="btn btn--sm btn--ghost" data-action="aiosSkip" data-arg0="' + a.id + '">Skip</button>';
    html += '<button class="btn btn--sm btn--ghost" data-action="aiosSnooze" data-arg0="' + a.id + '">Snooze</button>';
  } else if (_aiosTab === 'awaiting_routing') {
    html += '<button class="btn btn--sm btn--primary" data-action="openAiosRouting" data-arg0="' + a.id + '">Route Now</button>';
    html += '<button class="btn btn--sm btn--ghost" data-action="aiosSkip" data-arg0="' + a.id + '">Skip</button>';
  } else if (_aiosTab === 'completed' || _aiosTab === 'failed') {
    var result = a.execution_result || {};
    var summary = a.execution_state === 'failed' ? (result.error || 'Unknown error') : (result.created_id ? 'Created: ' + result.created_id : 'Done');
    html += '<span style="font-size:0.78rem;color:' + (a.execution_state === 'failed' ? 'var(--danger)' : 'var(--success)') + '">' + esc(summary) + '</span>';
    if (_aiosTab === 'failed') {
      html += '<button class="btn btn--sm btn--ghost" data-action="openAiosRouting" data-arg0="' + a.id + '">Retry</button>';
    }
  } else if (_aiosTab === 'in_progress') {
    html += '<span style="font-size:0.78rem;color:var(--accent)">Executing...</span>';
  }
  html += '</div></div>';
  return html;
}

async function openAiosRouting(actionId) {
  _aiosRoutingActionId = actionId;
  _aiosRoutingAction = (_aiosData || []).find(function(a) { return a.id === actionId; }) || null;
  _aiosRoutingSelectedClientId = null;
  _aiosRoutingProjects = null;
  try {
    _aiosRoutingClients = await apiCall('/api/aios/routing/clients');
  } catch (e) {
    _aiosRoutingClients = [];
  }
  _renderAiosRoutingPanel();
  var overlay = document.getElementById('aiosRoutingOverlay');
  var panel = document.getElementById('aiosRoutingPanel');
  if (overlay) overlay.style.display = 'block';
  if (panel) panel.style.display = 'block';
}

function closeAiosRouting() {
  _aiosRoutingActionId = null;
  _aiosRoutingAction = null;
  _aiosRoutingClients = null;
  _aiosRoutingProjects = null;
  _aiosRoutingSelectedClientId = null;
  var overlay = document.getElementById('aiosRoutingOverlay');
  var panel = document.getElementById('aiosRoutingPanel');
  if (overlay) overlay.style.display = 'none';
  if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
}

function _renderAiosRoutingPanel() {
  var panel = document.getElementById('aiosRoutingPanel');
  if (!panel || !_aiosRoutingAction) return;
  var a = _aiosRoutingAction;
  var clients = _aiosRoutingClients || [];

  var html = '';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">';
  html += '<h3 style="font-family:var(--font-display);font-size:1rem;margin:0">Route Action</h3>';
  html += '<button class="btn btn--sm btn--ghost" data-action="closeAiosRouting">&times;</button>';
  html += '</div>';
  html += '<div style="margin-bottom:var(--space-lg);padding:var(--space-md);background:var(--bg-input);border-radius:var(--radius-md)">';
  html += '<strong>' + esc(a.title) + '</strong>';
  if (a.description) html += '<div style="margin-top:4px;font-size:0.82rem;color:var(--text-secondary)">' + esc(a.description) + '</div>';
  html += '</div>';

  // Step 1: Client select
  html += '<label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">Destination Client</label>';
  html += '<select id="aiosRoutingClientSelect" onchange="_aiosOnClientSelect(this.value)" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem;margin-bottom:var(--space-md)">';
  html += '<option value="">Select...</option>';
  html += '<option value="none"' + (_aiosRoutingSelectedClientId === 'none' ? ' selected' : '') + '>AIOS Inbox (no client)</option>';
  clients.forEach(function(c) {
    var sel = _aiosRoutingSelectedClientId === c.id ? ' selected' : '';
    html += '<option value="' + esc(c.id) + '"' + sel + '>' + esc(c.name) + '</option>';
  });
  html += '</select>';

  // Step 2: Project select (if client selected)
  if (_aiosRoutingSelectedClientId && _aiosRoutingSelectedClientId !== 'none') {
    if (_aiosRoutingProjects === null) {
      html += '<div style="color:var(--text-muted);font-size:0.82rem">Loading projects...</div>';
    } else if (_aiosRoutingProjects.length === 0) {
      html += '<div style="padding:8px;color:var(--text-muted);font-size:0.82rem;border:1px dashed var(--border-default);border-radius:var(--radius-md);margin-bottom:var(--space-md)">No existing projects. Will create AIOS Inbox under this client.</div>';
    } else if (_aiosRoutingProjects.length === 1) {
      html += '<div style="padding:8px;font-size:0.82rem;color:var(--text-secondary);margin-bottom:var(--space-md)">Filing under: <strong>' + esc(_aiosRoutingProjects[0].title) + '</strong></div>';
    } else {
      html += '<label style="font-size:0.78rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">Destination Project</label>';
      html += '<select id="aiosRoutingProjectSelect" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem;margin-bottom:var(--space-md)">';
      _aiosRoutingProjects.forEach(function(p) {
        html += '<option value="' + esc(p.id) + '">' + esc(p.title) + '</option>';
      });
      html += '<option value="inbox">New in AIOS Inbox</option>';
      html += '</select>';
    }
  }

  // Confirm button
  var canConfirm = _aiosRoutingSelectedClientId != null && _aiosRoutingSelectedClientId !== '';
  html += '<div style="margin-top:var(--space-lg);display:flex;gap:8px">';
  html += '<button class="btn btn--primary" ' + (canConfirm ? '' : 'disabled') + ' data-action="confirmAiosRouting" style="flex:1">Confirm & Execute</button>';
  html += '<button class="btn" data-action="closeAiosRouting">Cancel</button>';
  html += '</div>';

  html += '<div id="aiosRoutingResult" style="margin-top:var(--space-md)"></div>';

  panel.innerHTML = html;
}

async function _aiosOnClientSelect(val) {
  if (!val) { _aiosRoutingSelectedClientId = null; _aiosRoutingProjects = null; _renderAiosRoutingPanel(); return; }
  _aiosRoutingSelectedClientId = val;
  _aiosRoutingProjects = null;
  _renderAiosRoutingPanel();
  if (val !== 'none') {
    try {
      _aiosRoutingProjects = await apiCall('/api/aios/routing/projects?client_id=' + encodeURIComponent(val));
    } catch (e) {
      _aiosRoutingProjects = [];
    }
    _renderAiosRoutingPanel();
  }
}

async function confirmAiosRouting() {
  if (!_aiosRoutingActionId || !_aiosRoutingSelectedClientId) return;
  var resultEl = document.getElementById('aiosRoutingResult');
  if (resultEl) resultEl.innerHTML = '<div style="color:var(--accent);font-size:0.82rem">Executing...</div>';

  var clientId = _aiosRoutingSelectedClientId === 'none' ? null : _aiosRoutingSelectedClientId;
  var parentId = null;
  if (clientId && _aiosRoutingProjects) {
    if (_aiosRoutingProjects.length === 1) {
      parentId = _aiosRoutingProjects[0].id;
    } else if (_aiosRoutingProjects.length > 1) {
      var sel = document.getElementById('aiosRoutingProjectSelect');
      var selVal = sel ? sel.value : null;
      parentId = selVal === 'inbox' ? null : selVal;
    }
  }

  var isPending = _aiosRoutingAction && _aiosRoutingAction.approval_state === 'pending';
  var endpoint = isPending
    ? '/api/aios/actions/' + _aiosRoutingActionId + '/approve-and-route'
    : '/api/aios/actions/' + _aiosRoutingActionId + '/route';

  try {
    var body = { client_id: clientId, parent_id: parentId };
    if (isPending) body.feedback = 'approved_unchanged';
    await apiCall(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resultEl) resultEl.innerHTML = '<div style="color:var(--success);font-size:0.82rem">Routed successfully.</div>';
    setTimeout(function() { closeAiosRouting(); switchAiosTab(_aiosTab); }, 1500);
  } catch (e) {
    if (resultEl) resultEl.innerHTML = '<div style="color:var(--danger);font-size:0.82rem">Failed: ' + esc(e.message || 'Unknown error') + '</div>';
  }
}

async function aiosSkip(actionId) {
  try {
    await apiCall('/api/aios/actions/' + actionId + '/reject', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Skipped from AIOS Queue', feedback: 'rejected_not_worth' }),
    });
    switchAiosTab(_aiosTab);
  } catch (e) {
    if (typeof toast === 'function') toast('Skip failed: ' + (e.message || ''), 'error');
  }
}

async function aiosSnooze(actionId) {
  try {
    await apiCall('/api/aios/actions/' + actionId + '/snooze', { method: 'PATCH' });
    switchAiosTab(_aiosTab);
  } catch (e) {
    if (typeof toast === 'function') toast('Snooze failed: ' + (e.message || ''), 'error');
  }
}
