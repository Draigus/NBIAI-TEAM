// ==================== HIRING PLAN ====================
// Browser module for the Hiring Plan feature. Loads after nbi-hiring.js
// and replaces the Positions tab with a Plan view that includes:
//   - Plan table with filters and inline editing
//   - Roles card view (reusing existing position cards)
//   - Monthly cost matrix (financial users only)
//   - Settings panel and Excel export

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
    // No client context yet (NBI user, no filter chosen): nothing to load.
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

// -------------------- Plan table view --------------------

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

function _fmtStartMonth(val) {
  if (!val) return '';
  var s = typeof val === 'string' ? val : '';
  var m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return '';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m[2], 10) - 1] + ' ' + m[1];
}

function _approvalBadge(status) {
  var cls = status === 'approved' ? 'success' : status === 'denied' ? 'danger' : 'warn';
  return '<span class="hiring-plan-badge hiring-plan-badge--' + cls + '">' + (status || 'pending') + '</span>';
}

function _recruitingBadge(status) {
  if (!status || status === 'not_started') return '<span class="hiring-plan-badge">Not started</span>';
  var cls = status === 'hired' ? 'success' : status === 'recruiting' ? 'info' : status === 'paused' ? 'warn' : '';
  return '<span class="hiring-plan-badge' + (cls ? ' hiring-plan-badge--' + cls : '') + '">' + status.replace(/_/g, ' ') + '</span>';
}

function renderHiringPlanTableView(container) {
  var caps = _hiringPlanData.capabilities || {};
  var roles = _planFilterRoles(_hiringPlanData.roles || []);

  var html = '<div class="hiring-plan-controls">';

  // Filter bar
  html += '<div class="hiring-plan-filters">';
  // Department filter
  var depts = (_hiringPlanSettings && _hiringPlanSettings.departments) || [];
  html += '<select id="hpFilterDept" onchange="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.department_id=this.value;renderContent()" style="max-width:160px">';
  html += '<option value="">All Departments</option>';
  depts.forEach(function(d) {
    var sel = (window._hiringPlanFilters || {}).department_id === d.id ? ' selected' : '';
    html += '<option value="' + d.id + '"' + sel + '>' + (d.name || '') + '</option>';
  });
  html += '</select>';

  // Approval filter
  html += '<select id="hpFilterApproval" onchange="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.approval_status=this.value;renderContent()" style="max-width:140px">';
  html += '<option value="">All Statuses</option>';
  ['pending', 'approved', 'denied'].forEach(function(s) {
    var sel = (window._hiringPlanFilters || {}).approval_status === s ? ' selected' : '';
    html += '<option value="' + s + '"' + sel + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
  });
  html += '</select>';

  // Employment type filter
  html += '<select id="hpFilterEngagement" onchange="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.employment_type=this.value;renderContent()" style="max-width:140px">';
  html += '<option value="">All Types</option>';
  ['fte', 'contractor', 'psc'].forEach(function(s) {
    var sel = (window._hiringPlanFilters || {}).employment_type === s ? ' selected' : '';
    html += '<option value="' + s + '"' + sel + '>' + s.toUpperCase() + '</option>';
  });
  html += '</select>';

  // Search
  var searchVal = (window._hiringPlanFilters || {}).search || '';
  html += '<input type="text" id="hpSearch" placeholder="Search roles…" value="' + searchVal.replace(/"/g, '&quot;') + '" style="max-width:200px" oninput="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.search=this.value;clearTimeout(window._hpSearchTimer);window._hpSearchTimer=setTimeout(renderContent,300)">';
  html += '</div>';

  // Action bar
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
  html += '<th>Title</th><th>Department</th><th>Type</th><th>Seniority</th>';
  html += '<th>Start</th><th>Approval</th><th>Recruiting</th><th>Priority</th>';
  if (caps.view_financials) {
    html += '<th>Budget</th><th>Loaded/mo</th>';
  }
  html += '<th>Candidates</th>';
  html += '</tr></thead><tbody>';

  if (roles.length === 0) {
    var colSpan = caps.view_financials ? 11 : 9;
    html += '<tr><td colspan="' + colSpan + '" style="text-align:center;color:var(--text-muted);padding:32px">No roles match the current filters</td></tr>';
  }

  roles.forEach(function(r) {
    html += '<tr class="hiring-plan-row" data-position-id="' + r.id + '" tabindex="0" onclick="openPositionDetail(\'' + r.id + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openPositionDetail(\'' + r.id + '\')}">';
    html += '<td class="hiring-plan-title">' + (r.title || '') + '</td>';
    html += '<td>' + (r.department_name || '') + '</td>';
    html += '<td>' + (r.employment_type || '').toUpperCase() + '</td>';
    html += '<td>' + (r.seniority || '') + '</td>';
    html += '<td>' + _fmtStartMonth(r.target_start_month) + '</td>';
    html += '<td>' + _approvalBadge(r.approval_status) + '</td>';
    html += '<td>' + _recruitingBadge(r.recruiting_status) + '</td>';
    html += '<td>' + (r.priority != null ? r.priority : '') + '</td>';
    if (caps.view_financials) {
      var budget = r.budgeted_compensation ? Number(r.budgeted_compensation).toLocaleString('en-GB', { style: 'currency', currency: r.compensation_currency || 'GBP', maximumFractionDigits: 0 }) : '';
      html += '<td>' + budget + '</td>';
      var costRow = _hiringPlanCosts ? (_hiringPlanCosts.rows || []).find(function(cr) { return cr.role_id === r.id; }) : null;
      html += '<td>' + (costRow && costRow.monthly_loaded_gbp ? costRow.monthly_loaded_gbp : '') + '</td>';
    }
    html += '<td>' + (r.candidate_total || 0) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';

  // Summary
  html += '<div class="hiring-plan-summary">';
  html += '<span>' + roles.length + ' role' + (roles.length !== 1 ? 's' : '') + '</span>';
  var approved = roles.filter(function(r) { return r.approval_status === 'approved'; }).length;
  var pending = roles.filter(function(r) { return r.approval_status === 'pending'; }).length;
  html += '<span>' + approved + ' approved, ' + pending + ' pending</span>';
  if (caps.view_financials && _hiringPlanCosts && _hiringPlanCosts.totals) {
    html += '<span>Combined: ' + (_hiringPlanCosts.totals.combined.horizon_loaded_gbp || '') + '</span>';
  }
  html += '</div>';

  container.innerHTML = html;
}

// -------------------- Roles card view --------------------

function renderHiringPlanRolesView(container) {
  var roles = _planFilterRoles(_hiringPlanData.roles || []);
  if (roles.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">No roles match the current filters</div>';
    return;
  }
  var html = '<div class="hiring-plan-controls"><div class="hiring-plan-filters">';
  html += '</div><div class="hiring-plan-actions">';
  var caps = _hiringPlanData.capabilities || {};
  if (caps.create_requirement) {
    html += '<button class="btn btn-sm btn-primary" onclick="openAddHiringRole()">+ Add Role</button>';
  }
  html += '</div></div>';
  html += '<div class="position-cards-grid">';
  roles.forEach(function(r) {
    html += renderPositionCard(r, _candidatesData || [], {});
  });
  html += '</div>';
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

  var html = '<div class="hiring-plan-controls"><div class="hiring-plan-filters">';
  // Horizon selector
  html += '<select id="hpCostMonths" onchange="window._hiringCostMonths=Number(this.value);loadHiringPlanCosts().then(renderContent)" style="max-width:120px">';
  [12, 24, 36].forEach(function(n) {
    var sel = (window._hiringCostMonths || 24) === n ? ' selected' : '';
    html += '<option value="' + n + '"' + sel + '>' + n + ' months</option>';
  });
  html += '</select>';
  // Base/loaded toggle
  html += '<select id="hpCostMode" onchange="window._hiringCostMode=this.value;renderContent()" style="max-width:120px">';
  html += '<option value="loaded"' + (showLoaded ? ' selected' : '') + '>Loaded</option>';
  html += '<option value="base"' + (!showLoaded ? ' selected' : '') + '>Base</option>';
  html += '</select>';
  html += '</div></div>';

  var fmtMonth = function(key) {
    var parts = key.split('-');
    var mi = parseInt(parts[1], 10) - 1;
    var short = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return short[mi] + ' ' + parts[0].slice(2);
  };

  var fmtPence = function(val) {
    if (val === null || val === undefined) return '<span class="hiring-plan-incomplete">—</span>';
    var pounds = Math.abs(val) / 100;
    return (val < 0 ? '-' : '') + '£' + pounds.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  html += '<div class="hiring-plan-matrix-wrap"><table class="hiring-plan-matrix">';
  html += '<thead><tr><th class="hiring-plan-matrix-sticky">Role</th>';
  months.forEach(function(m) { html += '<th>' + fmtMonth(m) + '</th>'; });
  html += '</tr></thead><tbody>';

  rows.forEach(function(row) {
    var cls = row.excluded ? ' hiring-plan-excluded' : row.incomplete ? ' hiring-plan-incomplete-row' : '';
    html += '<tr class="' + cls + '" onclick="openPositionDetail(\'' + row.role_id + '\')" style="cursor:pointer">';
    html += '<td class="hiring-plan-matrix-sticky">' + (row.title || '') + '</td>';
    var cells = row[field] || [];
    cells.forEach(function(val) { html += '<td class="hiring-plan-cell">' + fmtPence(val) + '</td>'; });
    html += '</tr>';
  });

  // Totals
  var renderTotalRow = function(label, bucket) {
    html += '<tr class="hiring-plan-total-row"><td class="hiring-plan-matrix-sticky"><strong>' + label + '</strong></td>';
    var cells = bucket[field] || [];
    cells.forEach(function(val) { html += '<td class="hiring-plan-cell"><strong>' + fmtPence(val) + '</strong></td>'; });
    html += '</tr>';
  };
  if (totals.approved) renderTotalRow('Approved', totals.approved);
  if (totals.pending) renderTotalRow('Pending', totals.pending);
  if (totals.combined) renderTotalRow('Combined', totals.combined);

  html += '</tbody></table></div>';

  // Incomplete indicator
  var incIds = _hiringPlanCosts.incompleteRoleIds || [];
  if (incIds.length > 0) {
    html += '<div class="hiring-plan-incomplete-notice">' + incIds.length + ' role' + (incIds.length > 1 ? 's have' : ' has') + ' incomplete cost assumptions. Totals show the subtotal that can be calculated.</div>';
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

  // On-cost percentages
  html += '<fieldset style="border:1px solid var(--border);border-radius:6px;padding:12px"><legend>On-Cost Percentages</legend>';
  html += '<div style="display:flex;gap:8px">';
  html += '<label style="flex:1">FTE<input id="hsFte" type="number" step="0.01" value="' + (s.fte_on_cost_pct || 0) + '" style="width:100%"></label>';
  html += '<label style="flex:1">Contractor<input id="hsContractor" type="number" step="0.01" value="' + (s.contractor_on_cost_pct || 0) + '" style="width:100%"></label>';
  html += '<label style="flex:1">PSC<input id="hsPsc" type="number" step="0.01" value="' + (s.psc_on_cost_pct || 0) + '" style="width:100%"></label>';
  html += '</div></fieldset>';

  // Departments
  html += '<fieldset style="border:1px solid var(--border);border-radius:6px;padding:12px"><legend>Departments</legend>';
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

  // NBI users pick a client first (design spec: client selector using the
  // existing WorkSage client context). Client users are already scoped.
  var clientSelector = '';
  if (!isClientUser()) {
    var clientOptions = getContractedClientRecords() || [];
    clientSelector = '<select id="hpClientSelect" aria-label="Select client" onchange="changeHiringPlanClient(this.value)" style="margin-left:auto;max-width:200px">' +
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

  // Sub-view switcher
  var caps = _hiringPlanData.capabilities || {};
  var html = '<div class="hiring-plan-views">';
  html += '<button class="hiring-plan-view-btn' + (view === 'plan' ? ' active' : '') + '" onclick="window._hiringPlanView=\'plan\';renderContent()">Plan</button>';
  html += '<button class="hiring-plan-view-btn' + (view === 'roles' ? ' active' : '') + '" onclick="window._hiringPlanView=\'roles\';renderContent()">Roles</button>';
  if (caps.view_financials) {
    html += '<button class="hiring-plan-view-btn' + (view === 'monthly' ? ' active' : '') + '" onclick="window._hiringPlanView=\'monthly\';renderContent()">Monthly Costs</button>';
  }
  var canConfigure = (!_currentUser.clientId && _currentUser.role === 'admin') || (_currentUser.clientId && _currentUser.clientRole === 'admin');
  if (canConfigure) {
    html += '<button class="hiring-plan-view-btn" onclick="openHiringSettings()"' + (clientSelector ? '' : ' style="margin-left:auto"') + '>Settings</button>';
  }
  html += clientSelector;
  html += '</div>';

  html += '<div id="hiring-plan-content"></div>';
  container.innerHTML = html;

  var contentEl = container.querySelector('#hiring-plan-content');
  if (view === 'roles') return renderHiringPlanRolesView(contentEl);
  if (view === 'monthly') return renderHiringPlanMonthlyView(contentEl);
  return renderHiringPlanTableView(contentEl);
}
