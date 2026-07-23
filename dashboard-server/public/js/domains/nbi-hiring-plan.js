// ==================== HIRING PLAN ====================
// Mockup-parity rendering: KPI strip, rich plan table, styled monthly matrix.

var _hiringPlanData = { roles: [], capabilities: {} };
var _hiringPlanCosts = null;
var _hiringPlanSettings = null;
var _hiringPlanLoaded = false;

function selectedHiringPlanClientId() {
  if (isClientUser()) return _currentUser.clientId;
  return window._hiringFilterClient || '';
}

function buildHiringClientQuery() {
  var params = new URLSearchParams();
  var clientId = selectedHiringPlanClientId();
  if (clientId) params.set('client_id', clientId);
  var qs = params.toString();
  return qs ? '?' + qs : '';
}

function buildHiringPlanQuery() {
  var params = new URLSearchParams();
  var clientId = selectedHiringPlanClientId();
  if (clientId) params.set('client_id', clientId);
  var qs = params.toString();
  return qs ? '?' + qs : '';
}

function _hiringCostStartMonth() {
  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth() + 1).padStart(2, '0');
  return y + '-' + m + '-01';
}

function buildHiringCostQuery() {
  var params = new URLSearchParams();
  var clientId = selectedHiringPlanClientId();
  if (clientId) params.set('client_id', clientId);
  params.set('start_month', window._hiringCostStart || _hiringCostStartMonth());
  params.set('months', String(window._hiringCostMonths || 24));
  var qs = params.toString();
  return qs ? '?' + qs : '';
}

async function loadHiringPlanData() {
  var data = await apiCall('/api/hiring-plan' + buildHiringPlanQuery());
  if (!data) return false;
  _hiringPlanData = data;
  _hiringPositionsData = Array.isArray(data.roles) ? data.roles : [];
  return true;
}

async function loadHiringPlanCosts() {
  var data = await apiCall('/api/hiring-plan/costs' + buildHiringCostQuery());
  if (!data) return false;
  _hiringPlanCosts = data;
  return true;
}

async function loadHiringPlanSettings() {
  var data = await apiCall('/api/hiring-settings' + buildHiringClientQuery());
  if (!data) return false;
  _hiringPlanSettings = data;
  return true;
}

async function refreshHiringPlan() {
  if (!selectedHiringPlanClientId()) {
    _hiringPlanLoaded = true;
    return;
  }
  _hiringPlanLoaded = false;
  await Promise.all([loadHiringPlanData(), loadHiringPlanSettings()]);
  if (_hiringPlanData.capabilities && _hiringPlanData.capabilities.view_financials) {
    await loadHiringPlanCosts();
  }
  _hiringPlanLoaded = true;
}

// -------------------- Shared formatting --------------------

var _HP_ENGAGEMENT_SHORT = { fte: 'FTE', contractor: 'Contractor', psc: 'PSC' };

function _fmtStartMonth(val) {
  if (!val) return '';
  var s = typeof val === 'string' ? val : '';
  var m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return '';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m[2], 10) - 1] + ' ' + m[1];
}

function _approvalBadge(status) {
  if (status === 'approved') return '<span class="hiring-plan-badge hiring-plan-badge--success">✓ Approved</span>';
  if (status === 'denied') return '<span class="hiring-plan-badge hiring-plan-badge--danger">✕ Denied</span>';
  return '<span class="hiring-plan-badge hiring-plan-badge--warn">⏳ Pending</span>';
}

function _recruitingBadge(status) {
  if (status === 'recruiting') return '<span class="hiring-plan-badge hiring-plan-badge--info">● Recruiting</span>';
  if (status === 'hired') return '<span class="hiring-plan-badge hiring-plan-badge--success">✓ Hired</span>';
  if (status === 'paused') return '<span class="hiring-plan-badge hiring-plan-badge--warn">Paused</span>';
  if (status === 'closed') return '<span class="hiring-plan-badge hiring-plan-badge--neutral">Closed</span>';
  return '<span class="hiring-plan-badge hiring-plan-badge--neutral">Not started</span>';
}

function _prioPill(p) {
  if (p == null) return '<span class="hiring-plan-prio hiring-plan-prio--null">—</span>';
  var level = Math.min(Math.max(0, Number(p)), 4);
  return '<span class="hiring-plan-prio hiring-plan-prio--' + level + '">P' + level + '</span>';
}

function _engagementBadge(type) {
  var label = _HP_ENGAGEMENT_SHORT[type] || (type || '').toUpperCase();
  return '<span class="hiring-plan-badge hiring-plan-badge--neutral">' + label + '</span>';
}

function _pipelineChip(candidateTotal) {
  var n = Number(candidateTotal) || 0;
  if (n === 0) return '<span class="hiring-plan-pipeline hiring-plan-pipeline--none">No candidates</span>';
  return '<span class="hiring-plan-pipeline"><b>' + n + '</b> candidate' + (n !== 1 ? 's' : '') + '</span>';
}

// Convert a role's budget to the requested display rate. Basis conversions
// use the role's expected_workdays_per_month (default 21).
function _budgetInRate(r, rate) {
  if (!r.budgeted_compensation) return null;
  var amount = Number(r.budgeted_compensation);
  if (!isFinite(amount) || amount <= 0) return null;
  var basis = r.compensation_basis || 'annual';
  var workdays = Number(r.expected_workdays_per_month) || 21;

  var monthly;
  if (basis === 'annual') monthly = amount / 12;
  else if (basis === 'monthly') monthly = amount;
  else monthly = amount * workdays; // daily

  if (rate === 'annual') return monthly * 12;
  if (rate === 'daily') return monthly / workdays;
  return monthly;
}

function _fmtBudget(r, rate) {
  rate = rate || r.compensation_basis || 'annual';
  var value = _budgetInRate(r, rate);
  if (value === null) return '';
  var ccy = r.compensation_currency || 'GBP';
  var suffix = rate === 'annual' ? '/yr' : rate === 'monthly' ? '/mo' : '/day';
  try {
    var formatted = value.toLocaleString('en-GB', { style: 'currency', currency: ccy, maximumFractionDigits: 0 });
    return formatted + '<span style="color:var(--text-muted);font-size:12px">' + suffix + '</span>';
  } catch (e) {
    return String(Math.round(value));
  }
}

// -------------------- Filters --------------------

function _planFilterRoles(roles) {
  var f = window._hiringPlanFilters || {};
  return roles.filter(function(r) {
    if (f.department_id && r.department_id !== f.department_id) return false;
    if (f.approval_status && r.approval_status !== f.approval_status) return false;
    if (f.employment_type && r.employment_type !== f.employment_type) return false;
    if (f.search) {
      var s = f.search.toLowerCase();
      var title = (r.title || '').toLowerCase();
      var desc = (r.description || '').toLowerCase();
      if (title.indexOf(s) < 0 && desc.indexOf(s) < 0) return false;
    }
    return true;
  });
}

// -------------------- KPI strip --------------------

function _renderKpiStrip(roles, caps) {
  var approved = roles.filter(function(r) { return r.approval_status === 'approved'; });
  var pending = roles.filter(function(r) { return r.approval_status === 'pending'; });
  var recruiting = roles.filter(function(r) { return r.recruiting_status === 'recruiting'; });
  var candidateTotal = roles.reduce(function(sum, r) { return sum + (Number(r.candidate_total) || 0); }, 0);

  var html = '<div class="hiring-plan-kpis">';

  html += '<div class="hiring-plan-kpi hiring-plan-kpi--approved">';
  html += '<div class="hiring-plan-kpi__label">Approved</div>';
  html += '<div class="hiring-plan-kpi__value">' + approved.length + '</div>';
  html += '<div class="hiring-plan-kpi__hint">' + recruiting.length + ' actively recruiting</div>';
  html += '</div>';

  html += '<div class="hiring-plan-kpi hiring-plan-kpi--pending">';
  html += '<div class="hiring-plan-kpi__label">Pending approval</div>';
  html += '<div class="hiring-plan-kpi__value">' + pending.length + '</div>';
  html += '<div class="hiring-plan-kpi__hint">' + roles.length + ' total roles</div>';
  html += '</div>';

  if (caps.view_financials && _hiringPlanCosts && Array.isArray(_hiringPlanCosts.rows)) {
    var approvalById = {};
    roles.forEach(function(r) { approvalById[r.id] = r.approval_status; });
    var fmtP = function(pence) { return '£' + Math.round(pence / 100).toLocaleString('en-GB'); };
    var approvedMonthly = 0, combinedMonthly = 0;
    _hiringPlanCosts.rows.forEach(function(cr) {
      var p = Number(cr.monthly_loaded_gbp_pence) || 0;
      if (cr.excluded) return;
      combinedMonthly += p;
      if (approvalById[cr.role_id] === 'approved') approvedMonthly += p;
    });

    html += '<div class="hiring-plan-kpi hiring-plan-kpi--cost">';
    html += '<div class="hiring-plan-kpi__label">Approved monthly (loaded)</div>';
    html += '<div class="hiring-plan-kpi__value">' + fmtP(approvedMonthly) + '</div>';
    html += '<div class="hiring-plan-kpi__hint">' + approved.length + ' approved roles</div>';
    html += '</div>';

    html += '<div class="hiring-plan-kpi hiring-plan-kpi--cost">';
    html += '<div class="hiring-plan-kpi__label">Combined monthly (loaded)</div>';
    html += '<div class="hiring-plan-kpi__value">' + fmtP(combinedMonthly) + '</div>';
    var incCount = (_hiringPlanCosts.incompleteRoleIds || []).length;
    if (incCount > 0) {
      html += '<div class="hiring-plan-kpi__hint"><span class="flag">⚠ excludes ' + incCount + ' role' + (incCount > 1 ? 's' : '') + ' without a salary on record</span></div>';
    } else {
      html += '<div class="hiring-plan-kpi__hint">All roles costed</div>';
    }
    html += '</div>';
  }

  html += '<div class="hiring-plan-kpi hiring-plan-kpi--pipeline">';
  html += '<div class="hiring-plan-kpi__label">Candidates in pipeline</div>';
  html += '<div class="hiring-plan-kpi__value">' + candidateTotal + '</div>';
  var rolesWithCandidates = roles.filter(function(r) { return (Number(r.candidate_total) || 0) > 0; }).length;
  html += '<div class="hiring-plan-kpi__hint">across ' + rolesWithCandidates + ' role' + (rolesWithCandidates !== 1 ? 's' : '') + '</div>';
  html += '</div>';

  html += '</div>';
  return html;
}

// -------------------- Plan table: sorting --------------------

var _HP_SORT_ACCESSORS = {
  title: function(r) { return (r.title || '').toLowerCase(); },
  department: function(r) { return (r.department_name || '').toLowerCase(); },
  priority: function(r) { return r.priority != null ? Number(r.priority) : 99; },
  start: function(r) { return r.target_start_month || '9999-99'; },
  engagement: function(r) { return r.employment_type || ''; },
  approval: function(r) { var order = { approved: 0, pending: 1, denied: 2 }; return order[r.approval_status] != null ? order[r.approval_status] : 3; },
  recruiting: function(r) { var order = { recruiting: 0, hired: 1, paused: 2, not_started: 3, closed: 4 }; return order[r.recruiting_status] != null ? order[r.recruiting_status] : 5; },
  budget: function(r) { var v = _budgetInRate(r, 'annual'); return v === null ? -1 : v; },
  candidates: function(r) { return Number(r.candidate_total) || 0; },
};

function setHiringPlanSort(field) {
  var s = window._hiringPlanSort || {};
  if (s.field === field) {
    s.dir = s.dir === 'asc' ? 'desc' : 'asc';
  } else {
    s = { field: field, dir: 'asc' };
  }
  window._hiringPlanSort = s;
  renderContent();
}

function _sortPlanRoles(roles) {
  var s = window._hiringPlanSort;
  if (!s || !s.field || !_HP_SORT_ACCESSORS[s.field]) return roles;
  var acc = _HP_SORT_ACCESSORS[s.field];
  var dir = s.dir === 'desc' ? -1 : 1;
  return roles.slice().sort(function(a, b) {
    var va = acc(a), vb = acc(b);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

function _sortableTh(field, label, align) {
  var s = window._hiringPlanSort || {};
  var arrow = s.field === field ? (s.dir === 'desc' ? ' ▼' : ' ▲') : '';
  return '<th class="hiring-plan-th-sort" ' + (align ? 'style="text-align:' + align + '" ' : '') +
    'onclick="setHiringPlanSort(\'' + field + '\')">' + label + arrow + '</th>';
}

// -------------------- Plan table: inline editing --------------------

function _hpRole(id) {
  return (_hiringPlanData.roles || []).find(function(r) { return r.id === id; });
}

function _hpMergeRole(updated) {
  var existing = _hpRole(updated.id);
  if (!existing) return;
  Object.keys(updated).forEach(function(k) { existing[k] = updated[k]; });
}

async function _hpPatchRole(id, fields) {
  var r = _hpRole(id);
  if (!r) return null;
  var body = Object.assign({ planning_version: r.planning_version }, fields);
  var result = await apiCall('/api/hiring-plan/' + id, {
    method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  });
  if (result && result.id) {
    _hpMergeRole(result);
    var caps = _hiringPlanData.capabilities || {};
    if (caps.view_financials) await loadHiringPlanCosts();
    renderContent();
    return result;
  }
  // Version conflict or error: reload for fresh state
  await refreshHiringPlan();
  renderContent();
  return null;
}

function inlineEditPriority(event, id) {
  event.stopPropagation();
  var r = _hpRole(id);
  if (!r) return;
  var cell = event.currentTarget;
  var options = '<option value="">—</option>';
  [0, 1, 2, 3, 4].forEach(function(p) {
    options += '<option value="' + p + '"' + (r.priority === p ? ' selected' : '') + '>P' + p + '</option>';
  });
  cell.innerHTML = '<select class="hiring-plan-inline-select" onclick="event.stopPropagation()" ' +
    'onchange="this.dataset.c=1;_hpPatchRole(\'' + id + '\', { priority: this.value === \'\' ? null : Number(this.value) })" ' +
    'onblur="if(!this.dataset.c&&this.isConnected)renderContent()">' + options + '</select>';
  cell.querySelector('select').focus();
}

function inlineEditEngagement(event, id) {
  event.stopPropagation();
  var r = _hpRole(id);
  if (!r) return;
  var cell = event.currentTarget;
  var options = '';
  ['fte', 'contractor', 'psc'].forEach(function(t) {
    options += '<option value="' + t + '"' + (r.employment_type === t ? ' selected' : '') + '>' + (_HP_ENGAGEMENT_SHORT[t] || t) + '</option>';
  });
  cell.innerHTML = '<select class="hiring-plan-inline-select" onclick="event.stopPropagation()" ' +
    'onchange="this.dataset.c=1;_hpPatchRole(\'' + id + '\', { employment_type: this.value })" ' +
    'onblur="if(!this.dataset.c&&this.isConnected)renderContent()">' + options + '</select>';
  cell.querySelector('select').focus();
}

function inlineEditApproval(event, id) {
  event.stopPropagation();
  var caps = _hiringPlanData.capabilities || {};
  if (!caps.approve_or_deny) return; // view-only badge for everyone else
  var r = _hpRole(id);
  if (!r) return;
  var cell = event.currentTarget;
  var current = r.approval_status || 'pending';
  var options = '';
  [['pending', 'Pending'], ['approved', 'Approved'], ['denied', 'Denied']].forEach(function(pair) {
    options += '<option value="' + pair[0] + '"' + (current === pair[0] ? ' selected' : '') + '>' + pair[1] + '</option>';
  });
  cell.innerHTML = '<select class="hiring-plan-inline-select" onclick="event.stopPropagation()" ' +
    'onchange="this.dataset.c=1;inlineApprovalChange(\'' + id + '\', this.value)" ' +
    'onblur="if(!this.dataset.c&&this.isConnected)renderContent()">' + options + '</select>';
  cell.querySelector('select').focus();
}

async function inlineApprovalChange(id, value) {
  var r = _hpRole(id);
  if (!r || value === r.approval_status) { renderContent(); return; }

  if (value === 'approved') {
    var result = await apiCall('/api/hiring-plan/' + id + '/approve', {
      method: 'POST',
      body: JSON.stringify({ planning_version: r.planning_version }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (result && result.id) showToast('Role approved', 'success');
    await refreshHiringPlan();
    renderContent();
  } else if (value === 'denied') {
    openDenyRoleModal(id);
  } else {
    // pending: the workflow returns roles to pending via material changes only
    showToast('Roles return to Pending automatically when a material field changes', 'info');
    renderContent();
  }
}

function openDenyRoleModal(id) {
  var r = _hpRole(id);
  if (!r) return;
  var reasons = [
    ['not_current_priority', 'Not the current priority'],
    ['beyond_financial_boundaries', 'Beyond financial boundaries'],
    ['lacks_information', 'Lacks information'],
    ['other', 'Other (comment required)'],
  ];
  var html = '<div class="modal-overlay open" id="denyRoleOverlay" onclick="if(event.target===this){this.remove();renderContent()}">';
  html += '<div class="modal" style="max-width:460px">';
  html += '<h3 style="margin:0 0 6px">Deny — ' + esc(r.title || '') + '</h3>';
  html += '<p style="margin:0 0 14px;color:var(--text-secondary);font-size:14px">The denial and its reason are recorded in the role’s approval history.</p>';
  html += '<div style="display:flex;flex-direction:column;gap:10px">';
  html += '<select id="denyReason">';
  reasons.forEach(function(pair) { html += '<option value="' + pair[0] + '">' + pair[1] + '</option>'; });
  html += '</select>';
  html += '<textarea id="denyComment" placeholder="Comment (optional unless reason is Other)" rows="3"></textarea>';
  html += '</div>';
  html += '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">';
  html += '<button class="btn btn-sm" onclick="document.getElementById(\'denyRoleOverlay\').remove();renderContent()">Cancel</button>';
  html += '<button class="btn btn-sm btn-primary" onclick="submitDenyRole(\'' + id + '\')">Deny role</button>';
  html += '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

async function submitDenyRole(id) {
  var r = _hpRole(id);
  if (!r) return;
  var reason = document.getElementById('denyReason').value;
  var comment = document.getElementById('denyComment').value.trim();
  if (reason === 'other' && !comment) { showToast('A comment is required for Other', 'error'); return; }
  var result = await apiCall('/api/hiring-plan/' + id + '/deny', {
    method: 'POST',
    body: JSON.stringify({ planning_version: r.planning_version, denial_reason: reason, denial_comment: comment || undefined }),
    headers: { 'Content-Type': 'application/json' },
  });
  var overlay = document.getElementById('denyRoleOverlay');
  if (overlay) overlay.remove();
  if (result && result.id) showToast('Role denied', 'success');
  await refreshHiringPlan();
  renderContent();
}

function inlineEditRecruiting(event, id) {
  event.stopPropagation();
  var caps = _hiringPlanData.capabilities || {};
  if (!caps.edit_requirement) return;
  var r = _hpRole(id);
  if (!r) return;
  if (r.recruiting_status === 'hired' || r.recruiting_status === 'closed') return; // closed roles are read-only
  var cell = event.currentTarget;
  var current = r.recruiting_status === 'recruiting' ? 'started' : 'not_started';
  var html = '<select class="hiring-plan-inline-select" onclick="event.stopPropagation()" ' +
    'onchange="this.dataset.c=1;inlineRecruitingChange(\'' + id + '\', this.value)" onblur="if(!this.dataset.c&&this.isConnected)renderContent()">';
  html += '<option value="not_started"' + (current === 'not_started' ? ' selected' : '') + '>Not started</option>';
  html += '<option value="started"' + (current === 'started' ? ' selected' : '') + '>Recruiting</option>';
  html += '</select>';
  cell.innerHTML = html;
  cell.querySelector('select').focus();
}

async function inlineRecruitingChange(id, value) {
  var r = _hpRole(id);
  if (!r) { renderContent(); return; }
  var result = await apiCall('/api/hiring-plan/' + id + '/recruiting', {
    method: 'POST',
    body: JSON.stringify({ planning_version: r.planning_version, started: value === 'started' }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (result && result.id) { _hpMergeRole(result); }
  else { await refreshHiringPlan(); }
  renderContent();
}

// -------------------- Plan table view --------------------

function renderHiringPlanTableView(container) {
  var caps = _hiringPlanData.capabilities || {};
  var roles = _sortPlanRoles(_planFilterRoles(_hiringPlanData.roles || []));
  var rate = window._hiringPlanRate || 'annual';

  var html = '<div class="hiring-plan-controls">';
  html += '<div class="hiring-plan-filters">';

  // Department filter
  var depts = (_hiringPlanSettings && _hiringPlanSettings.departments) || [];
  html += '<select id="hpFilterDept" onchange="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.department_id=this.value;renderContent()">';
  html += '<option value="">All Departments</option>';
  depts.forEach(function(d) {
    var sel = (window._hiringPlanFilters || {}).department_id === d.id ? ' selected' : '';
    html += '<option value="' + d.id + '"' + sel + '>' + (d.name || '') + '</option>';
  });
  html += '</select>';

  // Approval filter
  html += '<select id="hpFilterApproval" onchange="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.approval_status=this.value;renderContent()">';
  html += '<option value="">All Statuses</option>';
  ['pending', 'approved', 'denied'].forEach(function(s) {
    var sel = (window._hiringPlanFilters || {}).approval_status === s ? ' selected' : '';
    html += '<option value="' + s + '"' + sel + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
  });
  html += '</select>';

  // Employment type filter
  html += '<select id="hpFilterEngagement" onchange="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.employment_type=this.value;renderContent()">';
  html += '<option value="">All Types</option>';
  ['fte', 'contractor', 'psc'].forEach(function(s) {
    var sel = (window._hiringPlanFilters || {}).employment_type === s ? ' selected' : '';
    html += '<option value="' + s + '"' + sel + '>' + s.toUpperCase() + '</option>';
  });
  html += '</select>';

  // Search
  var searchVal = (window._hiringPlanFilters || {}).search || '';
  html += '<input type="text" id="hpSearch" placeholder="Search roles…" value="' + searchVal.replace(/"/g, '&quot;') + '" oninput="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.search=this.value;clearTimeout(window._hpSearchTimer);window._hpSearchTimer=setTimeout(renderContent,300)">';

  // Rate display selector (financial users)
  if (caps.view_financials) {
    html += '<div class="hiring-plan-seg" id="hpRateSeg" title="Show salaries as annual, monthly or daily rates">';
    [['annual', 'Annual'], ['monthly', 'Monthly'], ['daily', 'Daily']].forEach(function(pair) {
      html += '<button' + (rate === pair[0] ? ' class="on"' : '') + ' onclick="window._hiringPlanRate=\'' + pair[0] + '\';renderContent()">' + pair[1] + '</button>';
    });
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="hiring-plan-actions">';
  if (caps.create_requirement) {
    html += '<button class="btn btn-sm btn-primary" onclick="openAddHiringRole()">+ Add Role</button>';
  }
  html += '<button class="btn btn-sm" onclick="exportHiringPlan()">Export Excel</button>';
  html += '</div>';
  html += '</div>';

  // Table
  html += '<div class="hiring-plan-table-wrap"><table class="hiring-plan-table">';
  html += '<thead><tr>';
  html += _sortableTh('title', 'Role');
  html += _sortableTh('priority', 'Priority');
  html += _sortableTh('start', 'Start');
  html += _sortableTh('engagement', 'Engagement');
  html += _sortableTh('approval', 'Approval');
  html += _sortableTh('recruiting', 'Recruiting');
  if (caps.view_financials) {
    html += _sortableTh('budget', 'Budget', 'right');
    html += '<th style="text-align:right">Loaded/mo</th>';
  }
  html += _sortableTh('candidates', 'Candidates');
  html += '</tr></thead><tbody>';

  if (roles.length === 0) {
    var colSpan = caps.view_financials ? 9 : 7;
    html += '<tr><td colspan="' + colSpan + '" style="text-align:center;color:var(--text-muted);padding:32px">No roles match the current filters</td></tr>';
  }

  var canEdit = caps.edit_requirement;
  var canApprove = caps.approve_or_deny;

  roles.forEach(function(r) {
    html += '<tr class="hiring-plan-row" data-position-id="' + r.id + '" tabindex="0" onclick="openPositionDetail(\'' + r.id + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openPositionDetail(\'' + r.id + '\')}">';

    // Role cell: title + department stacked (always opens the sidebar)
    html += '<td class="hiring-plan-role-cell"><div class="hiring-plan-title">' + esc(r.title || '') + '</div><div class="hiring-plan-dept">' + esc(r.department_name || '') + '</div></td>';

    // Priority pill — click to edit
    html += '<td' + (canEdit ? ' class="hiring-plan-editable" title="Click to change priority" onclick="inlineEditPriority(event, \'' + r.id + '\')"' : '') + '>' + _prioPill(r.priority) + '</td>';

    // Target start
    html += '<td>' + _fmtStartMonth(r.target_start_month) + '</td>';

    // Engagement type — click to edit
    html += '<td' + (canEdit ? ' class="hiring-plan-editable" title="Click to change engagement" onclick="inlineEditEngagement(event, \'' + r.id + '\')"' : '') + '>' + _engagementBadge(r.employment_type) + '</td>';

    // Approval — click to approve/deny
    html += '<td' + (canApprove ? ' class="hiring-plan-editable" title="Click to approve or deny" onclick="inlineEditApproval(event, \'' + r.id + '\')"' : '') + '>' + _approvalBadge(r.approval_status) + '</td>';

    // Recruiting — click to toggle started/not started
    var recruitingEditable = canEdit && r.recruiting_status !== 'hired' && r.recruiting_status !== 'closed';
    html += '<td' + (recruitingEditable ? ' class="hiring-plan-editable" title="Click to change recruiting state" onclick="inlineEditRecruiting(event, \'' + r.id + '\')"' : '') + '>' + _recruitingBadge(r.recruiting_status) + '</td>';

    // Financial columns
    if (caps.view_financials) {
      html += '<td class="hiring-plan-money">' + _fmtBudget(r, rate) + '</td>';
      var costRow = _hiringPlanCosts ? (_hiringPlanCosts.rows || []).find(function(cr) { return cr.role_id === r.id; }) : null;
      html += '<td class="hiring-plan-money">' + (costRow && costRow.monthly_loaded_gbp ? costRow.monthly_loaded_gbp : '') + '</td>';
    }

    // Pipeline
    html += '<td>' + _pipelineChip(r.candidate_total) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';

  // Summary strip
  html += '<div class="hiring-plan-summary">';
  html += '<span>' + roles.length + ' role' + (roles.length !== 1 ? 's' : '') + '</span>';
  var approved = roles.filter(function(r) { return r.approval_status === 'approved'; }).length;
  var pending = roles.filter(function(r) { return r.approval_status === 'pending'; }).length;
  var hired = roles.filter(function(r) { return r.recruiting_status === 'hired'; }).length;
  html += '<span>' + approved + ' approved, ' + pending + ' pending' + (hired ? ', ' + hired + ' hired' : '') + '</span>';
  if (caps.view_financials && _hiringPlanCosts && _hiringPlanCosts.totals) {
    html += '<span>Combined horizon total: ' + (_hiringPlanCosts.totals.combined.horizon_loaded_gbp || '') + '</span>';
  }
  html += '</div>';

  container.innerHTML = html;
}

// -------------------- Roles card view --------------------

var _PRIO_LABELS = { 0: 'P0 — Critical', 1: 'P1 — High', 2: 'P2 — Medium', 3: 'P3 — Low', 4: 'P4 — Wishlist' };

function _renderRoleCard(r, caps) {
  var pLevel = r.priority != null ? Math.min(Math.max(0, Number(r.priority)), 4) : 'null';
  var html = '<div class="hiring-plan-card hiring-plan-card--p' + pLevel + ' position-card" data-position-id="' + r.id + '" onclick="openPositionDetail(\'' + r.id + '\')">';

  html += '<div class="hiring-plan-card__top">';
  html += '<div><div class="hiring-plan-card__title">' + esc(r.title || '') + '</div>';
  html += '<div class="hiring-plan-card__dept">' + esc(r.department_name || '') + '</div></div>';
  html += _prioPill(r.priority);
  html += '</div>';

  html += '<div class="hiring-plan-card__meta">';
  html += _approvalBadge(r.approval_status);
  html += _recruitingBadge(r.recruiting_status);
  html += _engagementBadge(r.employment_type);
  html += '</div>';

  html += '<div class="hiring-plan-card__row"><span class="k">Target start</span><span class="v" style="font-family:inherit">' + (_fmtStartMonth(r.target_start_month) || '—') + '</span></div>';

  if (caps.view_financials && r.budgeted_compensation) {
    html += '<div class="hiring-plan-card__row"><span class="k">Budget</span><span class="v">' + _fmtBudget(r) + '</span></div>';
  }

  html += '<div class="hiring-plan-card__foot">';
  html += _pipelineChip(r.candidate_total);
  html += '<span class="hiring-plan-card__link">Open →</span>';
  html += '</div>';

  html += '</div>';
  return html;
}

function renderHiringPlanRolesView(container) {
  var roles = _planFilterRoles(_hiringPlanData.roles || []);
  var caps = _hiringPlanData.capabilities || {};
  if (roles.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">No roles match the current filters</div>';
    return;
  }

  var html = '<div class="hiring-plan-controls"><div class="hiring-plan-filters">';
  html += '</div><div class="hiring-plan-actions">';
  if (caps.create_requirement) {
    html += '<button class="btn btn-sm btn-primary" onclick="openAddHiringRole()">+ Add Role</button>';
  }
  html += '</div></div>';

  // Group by priority, sorted P0 first
  var groups = {};
  roles.forEach(function(r) {
    var p = r.priority != null ? Number(r.priority) : 99;
    if (!groups[p]) groups[p] = [];
    groups[p].push(r);
  });
  var sortedKeys = Object.keys(groups).map(Number).sort(function(a, b) { return a - b; });

  sortedKeys.forEach(function(p) {
    var label = _PRIO_LABELS[p] || (p === 99 ? 'No priority set' : 'P' + p);
    var group = groups[p];
    html += '<div class="hiring-plan-prio-group">';
    html += '<div class="hiring-plan-prio-group__head">' + _prioPill(p === 99 ? null : p) + ' ' + label + ' <span class="hiring-plan-prio-group__count">(' + group.length + ')</span></div>';
    html += '<div class="hiring-plan-cards">';
    group.forEach(function(r) { html += _renderRoleCard(r, caps); });
    html += '</div></div>';
  });

  container.innerHTML = html;
}

// -------------------- Monthly cost matrix --------------------

function renderHiringPlanMonthlyView(container) {
  var caps = _hiringPlanData.capabilities || {};
  if (!caps.view_financials) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">Financial access required to view costs</div>';
    return;
  }
  if (!_hiringPlanCosts) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">Loading cost data…</div>';
    loadHiringPlanCosts().then(function() { if (window._hiringActiveTab === 'plan' && window._hiringPlanView === 'monthly') renderContent(); });
    return;
  }

  var months = _hiringPlanCosts.months || [];
  var rows = _hiringPlanCosts.rows || [];
  var totals = _hiringPlanCosts.totals || {};
  var showLoaded = window._hiringCostMode !== 'base';
  var field = showLoaded ? 'loaded_gbp_pence' : 'base_gbp_pence';

  // Controls: horizon + mode selects (E2E tests use .selectOption on these)
  var html = '<div class="hiring-plan-controls"><div class="hiring-plan-filters">';
  html += '<select id="hpCostMonths" onchange="window._hiringCostMonths=Number(this.value);loadHiringPlanCosts().then(renderContent)">';
  [12, 24, 36].forEach(function(n) {
    var sel = (window._hiringCostMonths || 24) === n ? ' selected' : '';
    html += '<option value="' + n + '"' + sel + '>' + n + ' months</option>';
  });
  html += '</select>';
  html += '<select id="hpCostMode" onchange="window._hiringCostMode=this.value;renderContent()">';
  html += '<option value="loaded"' + (showLoaded ? ' selected' : '') + '>Fully loaded GBP</option>';
  html += '<option value="base"' + (!showLoaded ? ' selected' : '') + '>Base GBP</option>';
  html += '</select>';
  html += '</div></div>';

  var fmtMonth = function(key) {
    var parts = key.split('-');
    var mi = parseInt(parts[1], 10) - 1;
    var short = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return short[mi] + String.fromCharCode(32,39) + parts[0].slice(2);
  };

  var fmtPence = function(val) {
    if (val === null || val === undefined) return '<span class="hiring-plan-incomplete">—</span>';
    var pounds = Math.abs(val) / 100;
    return (val < 0 ? '-' : '') + '£' + pounds.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Look up role details for richer sticky cells
  var rolesById = {};
  (_hiringPlanData.roles || []).forEach(function(r) { rolesById[r.id] = r; });

  html += '<div class="hiring-plan-matrix-wrap"><table class="hiring-plan-matrix">';
  html += '<thead><tr><th class="hiring-plan-matrix-sticky hiring-plan-matrix-c1">Role</th>';
  months.forEach(function(m) { html += '<th>' + fmtMonth(m) + '</th>'; });
  html += '</tr></thead><tbody>';

  rows.forEach(function(row) {
    var cls = row.excluded ? ' hiring-plan-excluded' : row.incomplete ? ' hiring-plan-incomplete-row' : '';
    var role = rolesById[row.role_id] || {};
    var deptInfo = role.department_name || '';
    var typeInfo = _HP_ENGAGEMENT_SHORT[role.employment_type] || '';
    var startInfo = _fmtStartMonth(role.target_start_month);
    var subLine = [deptInfo, typeInfo, startInfo].filter(Boolean).join(' · ');
    if (row.incomplete) subLine = subLine ? subLine + ' · no salary on record' : 'no salary on record';

    html += '<tr class="' + cls + '" onclick="openPositionDetail(\'' + row.role_id + '\')" style="cursor:pointer">';
    html += '<td class="hiring-plan-matrix-sticky hiring-plan-matrix-c1 hiring-plan-matrix-role"><div class="t">' + esc(row.title || '') + '</div><div class="d' + (row.incomplete ? ' hiring-plan-incomplete-flag-inline' : '') + '">' + esc(subLine) + '</div></td>';

    var cells = row[field] || [];
    cells.forEach(function(val) {
      if (row.incomplete) {
        html += '<td class="hiring-plan-cell hiring-plan-cell--zero">—</td>';
      } else if (val === 0 || val === null || val === undefined) {
        html += '<td class="hiring-plan-cell hiring-plan-cell--zero">0</td>';
      } else {
        html += '<td class="hiring-plan-cell">' + fmtPence(val) + '</td>';
      }
    });
    html += '</tr>';
  });

  // Total rows with color coding
  var renderTotalRow = function(label, bucket, colorClass, incomplete) {
    html += '<tr class="hiring-plan-total-row ' + colorClass + '">';
    html += '<td class="hiring-plan-matrix-sticky hiring-plan-matrix-c1"><strong>' + label + '</strong>';
    if (incomplete && (_hiringPlanCosts.incompleteRoleIds || []).length > 0) html += '<span class="hiring-plan-incomplete-flag" title="Roles without a salary on record are not included in this total">⚠ partial</span>';
    html += '</td>';
    var cells = bucket[field] || [];
    cells.forEach(function(val) {
      html += '<td class="hiring-plan-cell"><strong>' + fmtPence(val) + '</strong></td>';
    });
    html += '</tr>';
  };
  if (totals.approved) renderTotalRow('Approved', totals.approved, 'approved', false);
  if (totals.pending) renderTotalRow('Pending', totals.pending, 'pending', true);
  if (totals.combined) renderTotalRow('Combined', totals.combined, 'combined', true);

  html += '</tbody></table></div>';

  var incIds = _hiringPlanCosts.incompleteRoleIds || [];
  if (incIds.length > 0) {
    html += '<div class="hiring-plan-incomplete-notice">⚠ ' + incIds.length + ' role' + (incIds.length > 1 ? 's have' : ' has') + ' incomplete cost assumptions. Totals show the subtotal that can be calculated.</div>';
  }

  container.innerHTML = html;
}

// -------------------- Add Role modal --------------------

function openAddHiringRole() {
  var caps = _hiringPlanData.capabilities || {};
  var depts = (_hiringPlanSettings && _hiringPlanSettings.departments) || [];

  var html = '<div class="modal-overlay open" id="addRoleOverlay" onclick="if(event.target===this)this.remove()">';
  html += '<div class="modal" style="max-width:560px">';
  html += '<h3 style="margin:0 0 16px">Add Hiring Role</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:12px">';
  html += '<input id="arTitle" placeholder="Role title" required>';
  html += '<textarea id="arDesc" placeholder="Description" rows="3"></textarea>';
  html += '<div style="display:flex;gap:8px">';
  html += '<select id="arDept" style="flex:1"><option value="">Department</option>';
  depts.forEach(function(d) { html += '<option value="' + d.id + '">' + d.name + '</option>'; });
  html += '</select>';
  html += '<select id="arType" style="flex:1"><option value="fte">FTE</option><option value="contractor">Contractor</option><option value="psc">PSC</option></select>';
  html += '</div>';
  html += '<div style="display:flex;gap:8px">';
  html += '<input id="arSeniority" placeholder="Seniority" style="flex:1">';
  html += '<input id="arStart" type="month" style="flex:1">';
  html += '</div>';
  if (caps.edit_financials) {
    html += '<div style="display:flex;gap:8px">';
    html += '<input id="arBudget" placeholder="Budget" type="number" style="flex:1">';
    html += '<select id="arBasis" style="flex:1"><option value="annual">Annual</option><option value="monthly">Monthly</option><option value="daily">Daily</option></select>';
    html += '</div>';
  }
  html += '</div>';
  html += '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">';
  html += '<button class="btn btn-sm" onclick="document.getElementById(\'addRoleOverlay\').remove()">Cancel</button>';
  html += '<button class="btn btn-sm btn-primary" onclick="submitAddHiringRole()">Create</button>';
  html += '</div></div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('arTitle').focus();
}

async function submitAddHiringRole() {
  var title = document.getElementById('arTitle').value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }

  var body = {
    client_id: selectedHiringPlanClientId(),
    title: title,
    description: document.getElementById('arDesc').value.trim() || undefined,
    department_id: document.getElementById('arDept').value || undefined,
    employment_type: document.getElementById('arType').value,
    seniority: document.getElementById('arSeniority').value.trim() || undefined,
  };

  var startEl = document.getElementById('arStart');
  if (startEl && startEl.value) body.target_start_month = startEl.value + '-01';

  var caps = _hiringPlanData.capabilities || {};
  if (caps.edit_financials) {
    var budgetEl = document.getElementById('arBudget');
    if (budgetEl && budgetEl.value) body.budgeted_compensation = Number(budgetEl.value);
    var basisEl = document.getElementById('arBasis');
    if (basisEl) body.compensation_basis = basisEl.value;
    body.compensation_currency = 'GBP';
  }

  var result = await apiCall('/api/hiring-plan', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  if (result && result.id) {
    var overlay = document.getElementById('addRoleOverlay');
    if (overlay) overlay.remove();
    showToast('Role created', 'success');
    await refreshHiringPlan();
    renderContent();
    openPositionDetail(result.id);
  }
}

// -------------------- Export --------------------

async function exportHiringPlan() {
  var clientId = selectedHiringPlanClientId();
  if (!clientId) { showToast('Select a client first', 'error'); return; }

  try {
    var resp = await fetch('/api/hiring-plan/export.xlsx?client_id=' + encodeURIComponent(clientId), {
      credentials: 'include',
    });
    if (!resp.ok) {
      var err = await resp.json().catch(function() { return {}; });
      showToast(err.error || 'Export failed', 'error');
      return;
    }
    var blob = await resp.blob();
    var disposition = resp.headers.get('content-disposition') || '';
    var filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    var filename = filenameMatch ? filenameMatch[1] : 'hiring_plan.xlsx';
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export downloaded', 'success');
  } catch (e) {
    showToast('Export failed', 'error');
  }
}

// -------------------- Settings panel --------------------

function openHiringSettings() {
  var s = _hiringPlanSettings || {};
  var depts = s.departments || [];

  var html = '<div class="modal-overlay open" id="settingsOverlay" onclick="if(event.target===this)this.remove()">';
  html += '<div class="modal" style="max-width:600px;max-height:80vh;overflow-y:auto">';
  html += '<h3 style="margin:0 0 16px">Hiring Settings</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:16px">';

  html += '<fieldset style="border:1px solid var(--border-default);border-radius:6px;padding:12px"><legend>On-Cost Percentages</legend>';
  html += '<div style="display:flex;gap:8px">';
  html += '<label style="flex:1">FTE<input id="hsFte" type="number" step="0.01" value="' + (s.fte_on_cost_pct || 0) + '" style="width:100%"></label>';
  html += '<label style="flex:1">Contractor<input id="hsContractor" type="number" step="0.01" value="' + (s.contractor_on_cost_pct || 0) + '" style="width:100%"></label>';
  html += '<label style="flex:1">PSC<input id="hsPsc" type="number" step="0.01" value="' + (s.psc_on_cost_pct || 0) + '" style="width:100%"></label>';
  html += '</div></fieldset>';

  html += '<fieldset style="border:1px solid var(--border-default);border-radius:6px;padding:12px"><legend>Departments</legend>';
  html += '<div id="hsDeptList">';
  depts.forEach(function(d) {
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
    html += '<span style="flex:1">' + (d.name || '') + '</span>';
    html += '<span style="color:var(--text-muted);font-size:0.85rem">' + (d.is_active !== false ? 'Active' : 'Inactive') + '</span>';
    html += '</div>';
  });
  html += '</div>';
  html += '<div style="display:flex;gap:8px;margin-top:8px">';
  html += '<input id="hsNewDept" placeholder="New department name" style="flex:1">';
  html += '<button class="btn btn-sm" onclick="addHiringDepartment()">Add</button>';
  html += '</div></fieldset>';

  html += '</div>';
  html += '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">';
  html += '<button class="btn btn-sm" onclick="document.getElementById(\'settingsOverlay\').remove()">Cancel</button>';
  html += '<button class="btn btn-sm btn-primary" onclick="saveHiringSettings()">Save</button>';
  html += '</div></div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
}

async function addHiringDepartment() {
  var nameEl = document.getElementById('hsNewDept');
  if (!nameEl || !nameEl.value.trim()) return;
  var clientId = selectedHiringPlanClientId();
  var result = await apiCall('/api/hiring-settings/departments' + buildHiringClientQuery(), {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId, name: nameEl.value.trim() }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (result) {
    showToast('Department added', 'success');
    await loadHiringPlanSettings();
    var overlay = document.getElementById('settingsOverlay');
    if (overlay) overlay.remove();
    openHiringSettings();
  }
}

async function saveHiringSettings() {
  var clientId = selectedHiringPlanClientId();
  var body = {
    fte_on_cost_pct: Number(document.getElementById('hsFte').value),
    contractor_on_cost_pct: Number(document.getElementById('hsContractor').value),
    psc_on_cost_pct: Number(document.getElementById('hsPsc').value),
  };
  var result = await apiCall('/api/hiring-settings' + buildHiringClientQuery(), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  if (result) {
    showToast('Settings saved', 'success');
    var overlay = document.getElementById('settingsOverlay');
    if (overlay) overlay.remove();
    await refreshHiringPlan();
    renderContent();
  }
}

// -------------------- Tab rendering --------------------

function changeHiringPlanClient(clientId) {
  window._hiringFilterClient = clientId || null;
  _hiringPlanLoaded = false;
  _hiringPlanCosts = null;
  _hiringPlanSettings = null;
  renderContent();
}

function renderHiringPlanTab(container) {
  var view = window._hiringPlanView || 'plan';

  var clientSelector = '';
  if (!isClientUser()) {
    var clientOptions = getContractedClientRecords() || [];
    clientSelector = '<select id="hpClientSelect" aria-label="Select client" onchange="changeHiringPlanClient(this.value)" style="margin-left:auto">' +
      '<option value="">Select a client…</option>' +
      clientOptions.map(function(c) {
        return '<option value="' + c.id + '"' + (window._hiringFilterClient === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
      }).join('') +
      '</select>';
  }

  if (!selectedHiringPlanClientId()) {
    container.innerHTML = '<div class="hiring-plan-views">' + clientSelector + '</div>' +
      '<div style="text-align:center;color:var(--text-muted);padding:48px 24px">Select a client to view their hiring plan.</div>';
    return;
  }

  var caps = _hiringPlanData.capabilities || {};
  var roles = _hiringPlanData.roles || [];

  // KPI strip
  var html = _renderKpiStrip(roles, caps);

  // View tabs (segmented control)
  html += '<div class="hiring-plan-views">';
  html += '<div class="hiring-plan-view-tabs">';
  html += '<button class="hiring-plan-view-btn' + (view === 'plan' ? ' active' : '') + '" onclick="window._hiringPlanView=\'plan\';renderContent()">Plan</button>';
  html += '<button class="hiring-plan-view-btn' + (view === 'roles' ? ' active' : '') + '" onclick="window._hiringPlanView=\'roles\';renderContent()">Roles</button>';
  if (caps.view_financials) {
    html += '<button class="hiring-plan-view-btn' + (view === 'monthly' ? ' active' : '') + '" onclick="window._hiringPlanView=\'monthly\';renderContent()">Monthly Costs</button>';
  }
  var canConfigure = (!_currentUser.clientId && _currentUser.role === 'admin') || (_currentUser.clientId && _currentUser.clientRole === 'admin');
  if (canConfigure) {
    html += '<button class="hiring-plan-view-btn" onclick="openHiringSettings()">Settings</button>';
  }
  html += '</div>';
  html += clientSelector;
  html += '</div>';

  html += '<div id="hiring-plan-content"></div>';
  container.innerHTML = html;

  var contentEl = container.querySelector('#hiring-plan-content');
  if (view === 'roles') return renderHiringPlanRolesView(contentEl);
  if (view === 'monthly') return renderHiringPlanMonthlyView(contentEl);
  return renderHiringPlanTableView(contentEl);
}
