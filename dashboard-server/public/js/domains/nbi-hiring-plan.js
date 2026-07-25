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

// Earliest role start month in the loaded plan (denied roles ignored). The
// monthly view defaults here, not to today: starting at the current month
// chops off the hiring ramp and makes every past hire look like it began on
// the first visible column (Glen 2026-07-24).
function _hiringEarliestStartMonth() {
  var min = null;
  (_hiringPlanData.roles || []).forEach(function(r) {
    if (r.approval_status === 'denied') return;
    var s = typeof r.target_start_month === 'string' ? r.target_start_month.slice(0, 7) : null;
    if (s && /^\d{4}-\d{2}$/.test(s) && (!min || s < min)) min = s;
  });
  return min ? min + '-01' : null;
}

function buildHiringCostQuery() {
  var params = new URLSearchParams();
  var clientId = selectedHiringPlanClientId();
  if (clientId) params.set('client_id', clientId);
  params.set('start_month', window._hiringCostStart || _hiringEarliestStartMonth() || _hiringCostStartMonth());
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

// 'YYYY-MM-DD' -> '13 Jul 2026'
function _fmtFullDate(val) {
  var m = typeof val === 'string' ? val.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  if (!m) return _fmtStartMonth(val) || '—';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(m[3], 10) + ' ' + months[parseInt(m[2], 10) - 1] + ' ' + m[1];
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

var _HP_STAGE_ORDER = ['sourcing', 'interviews', 'offer', 'onboarding', 'onboarded', 'process_closed'];
var _HP_STAGE_SHORT = { sourcing: 'Sou', interviews: 'Int', offer: 'Off', onboarding: 'Onb', onboarded: 'Hrd', process_closed: 'Cls' };

function _pipelineStageParts(counts) {
  if (!counts || typeof counts !== 'object') return [];
  var keys = Object.keys(counts).filter(function(k) { return Number(counts[k]) > 0; });
  keys.sort(function(a, b) {
    var ia = _HP_STAGE_ORDER.indexOf(a), ib = _HP_STAGE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return keys.map(function(k) { return { key: k, count: Number(counts[k]) }; });
}

// Spec 11: summaries show total active candidates and counts by stage;
// selecting the summary navigates to Candidates filtered to this role.
function _pipelineChip(r) {
  var n = Number(r.candidate_total) || 0;
  if (n === 0) return '<span class="hiring-plan-pipeline hiring-plan-pipeline--none">No candidates</span>';
  var parts = _pipelineStageParts(r.candidate_counts).map(function(p) {
    return (_HP_STAGE_SHORT[p.key] || p.key.slice(0, 3)) + ' ' + p.count;
  }).join(' · ');
  return '<span class="hiring-plan-pipeline" role="button" tabindex="0" title="Open Pipeline filtered to this role" ' +
    'onclick="openRolePipeline(event, \'' + r.id + '\')"><b>' + n + '</b>' + (parts ? ' ' + parts : '') + ' →</span>';
}

function openRolePipeline(event, id) {
  event.stopPropagation();
  window._hiringActiveTab = 'pipeline';
  window._hiringFilterPosition = id;
  renderContent();
}

function _hpUserName(id) {
  if (!id) return '';
  var u = (typeof _cachedUsers !== 'undefined' ? _cachedUsers : []).find(function(x) { return x.id === id; });
  return u ? (u.display_name || u.username || '') : '';
}

function _hpTypeLabel(t) {
  if (t === 'new') return 'New';
  if (t === 'backfill') return 'Backfill';
  if (!t) return '—';
  return String(t).charAt(0).toUpperCase() + String(t).slice(1);
}

// Recruiting cannot start until a role is approved, so "Not started" on a
// pending/denied role is meaningless — show a dash. Active recruiting stays
// visible regardless (a material change can send a recruiting role back to
// Pending without stopping the search).
function _hpDisplayRecruiting(r) {
  if (r.recruiting_status === 'not_started' && r.approval_status !== 'approved') return null;
  return r.recruiting_status;
}

function _recruitingCell(r) {
  var display = _hpDisplayRecruiting(r);
  if (display === null) return '<span class="hiring-plan-badge hiring-plan-badge--neutral">—</span>';
  return _recruitingBadge(display);
}

// The standard fallback divisor: 261 UK working days a year / 12 = 21.75,
// conventionally rounded down. Used only when neither the role nor the client
// states a figure, and the UI always says when it is being used.
var HP_STANDARD_WORKDAYS = 21;

// Working days per month behind a role's day rate, most specific source wins:
// the role's own expected_workdays_per_month, then the client's configured
// default, then the standard 21. Returns the number and where it came from, so
// the UI can show its working rather than presenting a bare figure.
function _hpWorkdaysFor(r) {
  var roleWd = Number(r && r.expected_workdays_per_month);
  if (isFinite(roleWd) && roleWd > 0) return { days: roleWd, source: 'role' };

  var s = _hiringPlanSettings || {};
  var clientWd = Number(s.default_workdays_per_month);
  if (isFinite(clientWd) && clientWd > 0) return { days: clientWd, source: 'client' };

  return { days: HP_STANDARD_WORKDAYS, source: 'standard' };
}

// Plain-English statement of which working-days figure produced a day rate and
// where it came from. Shown in the role sidebar under the number itself.
function _hpWorkdaysBasisText(r) {
  var wd = _hpWorkdaysFor(r);
  var days = wd.days + (wd.days === 1 ? ' day' : ' days');

  // A role paid BY THE DAY already has its day rate on record. No divisor
  // produced it, so citing one would misdescribe the number this caption sits
  // under, whatever working-days figure the role happens to carry.
  if ((r.compensation_basis || 'annual') === 'daily') {
    if (wd.source === 'role') {
      return 'Recorded day rate. Monthly and annual figures use ' + days + ' per month, set on this role.';
    }
    return 'Recorded day rate. Add working days per month to this role to show a monthly or annual figure.';
  }

  if (wd.source === 'role') return 'Based on ' + days + ' per month, set on this role.';
  if (wd.source === 'client') return 'Based on ' + days + ' per month, set for this client.';
  return 'Based on the standard ' + days + ' per month. Not set for this client, so this rate may not match their own budget model.';
}

// Same fact as a hover title on the compact table cell. Attribute-safe: the
// text is built here rather than interpolated from user input, but the quote
// strip is kept so a future edit cannot break out of the attribute.
function _hpWorkdaysTitle(r) {
  var text = _hpWorkdaysBasisText(r).split('"').join('');
  var basis = r.compensation_basis || 'annual';
  var days = _hpWorkdaysFor(r).days;

  // State the arithmetic that ACTUALLY ran for this row's basis. Quoting the
  // annual formula on a monthly role (no division by 12 happens) or on a daily
  // role (no division happens at all) is a false statement about a number
  // someone has to defend.
  // _hpWorkdaysBasisText already returns a complete, punctuated sentence, so
  // only the arithmetic is appended, and only where arithmetic occurred.
  if (basis === 'annual') return text + ' Annual salary / 12 / ' + days + ' working days per month.';
  if (basis === 'monthly') return text + ' Monthly salary / ' + days + ' working days per month.';
  return text;
}

// True when a role is paid by the day and carries no working-days figure of its
// own, so nothing can legitimately be derived from its rate.
function _hpCanDeriveFromDaily(r) {
  return !((r.compensation_basis || 'annual') === 'daily' && _hpWorkdaysFor(r).source !== 'role');
}

// Convert a role's budget to the requested display rate, using the working-days
// basis resolved above.
function _budgetInRate(r, rate) {
  if (!r.budgeted_compensation) return null;
  var amount = Number(r.budgeted_compensation);
  if (!isFinite(amount) || amount <= 0) return null;
  var basis = r.compensation_basis || 'annual';
  var wd = _hpWorkdaysFor(r);
  var workdays = wd.days;

  // A role paid BY THE DAY cannot be annualised without knowing how many days
  // it is actually worked. The cost engine refuses to cost such a role and
  // flags it missing_workdays; the table must refuse in the same place, or it
  // prints an annual figure that is deliberately excluded from every total on
  // the page. Its own day rate is still shown -- that figure is recorded, not
  // derived. Converting the other way (annual -> day rate) is a presentational
  // convenience and does carry a stated basis, which is why it stays.
  if (basis === 'daily' && wd.source !== 'role') {
    return rate === 'daily' ? amount : null;
  }

  var monthly;
  if (basis === 'annual') monthly = amount / 12;
  else if (basis === 'monthly') monthly = amount;
  else monthly = amount * workdays; // daily

  if (rate === 'annual') return monthly * 12;
  if (rate === 'daily') return monthly / workdays;
  return monthly;
}

function _fmtAdvertised(r) {
  if (r.compensation_min == null && r.compensation_max == null) return '—';
  var ccy = r.compensation_currency || 'GBP';
  var fmt = function(v) {
    try { return Number(v).toLocaleString('en-GB', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }); }
    catch (e) { return String(v); }
  };
  if (r.compensation_min != null && r.compensation_max != null) return fmt(r.compensation_min) + '–' + fmt(r.compensation_max);
  return fmt(r.compensation_min != null ? r.compensation_min : r.compensation_max);
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
    if (f.recruiting_status && _hpDisplayRecruiting(r) !== f.recruiting_status) return false;
    if (f.priority !== undefined && f.priority !== '' && f.priority !== null) {
      if (f.priority === 'none') { if (r.priority != null) return false; }
      else if (Number(r.priority) !== Number(f.priority) || r.priority == null) return false;
    }
    if (f.search) {
      var s = f.search.toLowerCase();
      var hay = [
        r.title, r.description, r.department_name,
        _hpUserName(r.hiring_manager_user_id),
      ].map(function(v) { return (v || '').toLowerCase(); }).join(' ');
      if (hay.indexOf(s) < 0) return false;
    }
    return true;
  });
}

// Debounced search that survives the re-render: renderContent() rebuilds the
// input, which would otherwise drop focus after the first keystroke.
function _hpSearchInput(el) {
  window._hiringPlanFilters = window._hiringPlanFilters || {};
  window._hiringPlanFilters.search = el.value;
  clearTimeout(window._hpSearchTimer);
  window._hpSearchTimer = setTimeout(function() {
    renderContent();
    var input = document.getElementById('hpSearch');
    if (input) {
      input.focus();
      var v = input.value;
      try { input.setSelectionRange(v.length, v.length); } catch (e) { /* non-text inputs */ }
    }
  }, 300);
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
    // Cost KPIs count HIRED roles only (Glen 2026-07-24: zero until hired).
    // An unhired role's per-unit cost is planning metadata, not spend —
    // summing it here re-created the exact lie the matrix fix removed
    // (caught by visual check 2026-07-25: KPI said £91,750 while actual
    // hired payroll was £43,572). Falls back to base salary when only the
    // FTE weighting is missing, never to £0 while salaries are on record.
    var approvedMonthly = 0, combinedMonthly = 0, kpiBaseOnly = 0, kpiUncosted = 0, approvedBaseOnly = 0;
    var hiredCount = 0, approvedHiredCount = 0;
    _hiringPlanCosts.rows.forEach(function(cr) {
      if (cr.excluded || cr.state !== 'hired') return;
      hiredCount++;
      var isApproved = approvalById[cr.role_id] === 'approved';
      if (isApproved) approvedHiredCount++;
      var p = cr.monthly_loaded_gbp_pence;
      if (p === null || p === undefined) {
        p = cr.monthly_base_gbp_pence;
        if (p === null || p === undefined) { kpiUncosted++; p = 0; }
        else { kpiBaseOnly++; if (isApproved) approvedBaseOnly++; }
      }
      p = Number(p) || 0;
      combinedMonthly += p;
      if (isApproved) approvedMonthly += p;
    });

    html += '<div class="hiring-plan-kpi hiring-plan-kpi--cost">';
    html += '<div class="hiring-plan-kpi__label">Approved monthly (fully weighted)</div>';
    html += '<div class="hiring-plan-kpi__value">' + fmtP(approvedMonthly) + '</div>';
    if (approvedBaseOnly > 0) {
      html += '<div class="hiring-plan-kpi__hint"><span class="flag">⚠ ' + approvedBaseOnly + ' of ' + approvedHiredCount + ' filled FTE roles at base salary — weighting % not set</span></div>';
    } else {
      html += '<div class="hiring-plan-kpi__hint">' + approvedHiredCount + ' filled role' + (approvedHiredCount !== 1 ? 's' : '') + ' being paid</div>';
    }
    html += '</div>';

    html += '<div class="hiring-plan-kpi hiring-plan-kpi--cost">';
    html += '<div class="hiring-plan-kpi__label">Combined monthly (fully weighted)</div>';
    html += '<div class="hiring-plan-kpi__value">' + fmtP(combinedMonthly) + '</div>';
    if (kpiBaseOnly > 0) {
      html += '<div class="hiring-plan-kpi__hint"><span class="flag">⚠ ' + kpiBaseOnly + ' filled FTE role' + (kpiBaseOnly > 1 ? 's' : '') + ' at base salary — weighting % not set</span></div>';
    } else if (kpiUncosted > 0) {
      html += '<div class="hiring-plan-kpi__hint"><span class="flag">⚠ excludes ' + kpiUncosted + ' filled role' + (kpiUncosted > 1 ? 's' : '') + ' missing cost information</span></div>';
    } else {
      html += '<div class="hiring-plan-kpi__hint">' + hiredCount + ' filled role' + (hiredCount !== 1 ? 's' : '') + ' · unfilled roles cost £0 until hired</div>';
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
  type: function(r) { return r.requirement_type || 'zzz'; },
  manager: function(r) { return (_hpUserName(r.hiring_manager_user_id) || '￿').toLowerCase(); },
  days_open: function(r) { return r.days_open != null ? Number(r.days_open) : -1; },
  engagement: function(r) { return r.employment_type || ''; },
  approval: function(r) { var order = { approved: 0, pending: 1, denied: 2 }; return order[r.approval_status] != null ? order[r.approval_status] : 3; },
  recruiting: function(r) { var order = { recruiting: 0, hired: 1, paused: 2, not_started: 3, closed: 4 }; return order[r.recruiting_status] != null ? order[r.recruiting_status] : 5; },
  advertised: function(r) { var v = r.compensation_min != null ? Number(r.compensation_min) : (r.compensation_max != null ? Number(r.compensation_max) : null); return v === null ? -1 : v; },
  day_rate: function(r) { var v = _budgetInRate(r, 'daily'); return v === null ? -1 : v; },
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

var _HP_DENIAL_LABELS = {
  not_current_priority: 'Not the current priority',
  beyond_financial_boundaries: 'Beyond financial boundaries',
  lacks_information: 'Lacks information',
  other: 'Other',
};

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
  var panel = document.getElementById('positionDetailPanel');
  if (panel && panel.classList.contains('open')) openPositionDetail(id);
}

function inlineEditRecruiting(event, id) {
  event.stopPropagation();
  var caps = _hiringPlanData.capabilities || {};
  if (!caps.edit_requirement) return;
  var r = _hpRole(id);
  if (!r) return;
  if (r.recruiting_status === 'hired' || r.recruiting_status === 'closed') return; // closed roles are read-only
  if (r.approval_status !== 'approved') return; // recruiting starts only on approved roles
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

  // Recruiting state filter
  html += '<select id="hpFilterRecruiting" onchange="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.recruiting_status=this.value;renderContent()">';
  html += '<option value="">Recruiting: Any</option>';
  [['not_started', 'Not started'], ['recruiting', 'Recruiting'], ['hired', 'Hired'], ['paused', 'Paused'], ['closed', 'Closed']].forEach(function(pair) {
    var sel = (window._hiringPlanFilters || {}).recruiting_status === pair[0] ? ' selected' : '';
    html += '<option value="' + pair[0] + '"' + sel + '>' + pair[1] + '</option>';
  });
  html += '</select>';

  // Priority filter
  html += '<select id="hpFilterPriority" onchange="window._hiringPlanFilters=window._hiringPlanFilters||{};window._hiringPlanFilters.priority=this.value;renderContent()">';
  html += '<option value="">Priority: Any</option>';
  [0, 1, 2, 3, 4].forEach(function(p) {
    var sel = String((window._hiringPlanFilters || {}).priority) === String(p) ? ' selected' : '';
    html += '<option value="' + p + '"' + sel + '>P' + p + '</option>';
  });
  html += '<option value="none"' + ((window._hiringPlanFilters || {}).priority === 'none' ? ' selected' : '') + '>No priority</option>';
  html += '</select>';

  // Search (title, description, department, hiring manager)
  var searchVal = (window._hiringPlanFilters || {}).search || '';
  html += '<input type="text" id="hpSearch" placeholder="Search role or hiring manager…" value="' + searchVal.replace(/"/g, '&quot;') + '" oninput="_hpSearchInput(this)">';

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

  // Advertised range column only appears when the user may see salary ranges
  // AND at least one role carries one — an all-dash column is noise.
  var showAdvertised = caps.view_salary_range &&
    (_hiringPlanData.roles || []).some(function(r) { return r.compensation_min != null || r.compensation_max != null; });

  // Table — column order follows the approved mockup: operational fields,
  // pipeline, then financial columns at the right. Day rate sits directly
  // in front of the monthly loaded column (Glen 2026-07-23).
  html += '<div class="hiring-plan-table-wrap"><table class="hiring-plan-table">';
  html += '<thead><tr>';
  html += _sortableTh('title', 'Role');
  html += _sortableTh('priority', 'Priority');
  html += _sortableTh('start', 'Start');
  html += _sortableTh('type', 'Type');
  html += _sortableTh('approval', 'Approval');
  html += _sortableTh('manager', 'Hiring manager');
  html += _sortableTh('days_open', 'Days open', 'right');
  html += _sortableTh('recruiting', 'Recruiting');
  html += _sortableTh('engagement', 'Engagement');
  html += _sortableTh('candidates', 'Pipeline');
  if (showAdvertised) html += _sortableTh('advertised', 'Advertised range', 'right');
  if (caps.view_financials) {
    html += _sortableTh('budget', 'Budget', 'right');
    html += _sortableTh('day_rate', 'Day rate', 'right');
    html += '<th style="text-align:right">Weighted/mo</th>';
  }
  html += '</tr></thead><tbody>';

  var colSpan = 10 + (showAdvertised ? 1 : 0) + (caps.view_financials ? 3 : 0);
  if (roles.length === 0) {
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
    html += '<td>' + (_fmtStartMonth(r.target_start_month) || '—') + '</td>';

    // Requirement type (New/Backfill)
    html += '<td>' + _hpTypeLabel(r.requirement_type) + '</td>';

    // Approval — click to approve/deny
    html += '<td' + (canApprove ? ' class="hiring-plan-editable" title="Click to approve or deny" onclick="inlineEditApproval(event, \'' + r.id + '\')"' : '') + '>' + _approvalBadge(r.approval_status) + '</td>';

    // Hiring manager
    html += '<td>' + (esc(_hpUserName(r.hiring_manager_user_id)) || '—') + '</td>';

    // Days open
    html += '<td class="hiring-plan-num">' + (r.days_open != null ? r.days_open : '—') + '</td>';

    // Recruiting — click to toggle started/not started (approved roles only)
    var recruitingEditable = canEdit && r.approval_status === 'approved' && r.recruiting_status !== 'hired' && r.recruiting_status !== 'closed';
    html += '<td' + (recruitingEditable ? ' class="hiring-plan-editable" title="Click to change recruiting state" onclick="inlineEditRecruiting(event, \'' + r.id + '\')"' : '') + '>' + _recruitingCell(r) + '</td>';

    // Engagement type — click to edit
    html += '<td' + (canEdit ? ' class="hiring-plan-editable" title="Click to change engagement" onclick="inlineEditEngagement(event, \'' + r.id + '\')"' : '') + '>' + _engagementBadge(r.employment_type) + '</td>';

    // Pipeline — stage counts, navigates to filtered Candidates
    html += '<td>' + _pipelineChip(r) + '</td>';

    // Financial columns
    if (showAdvertised) {
      html += '<td class="hiring-plan-num">' + _fmtAdvertised(r) + '</td>';
    }
    if (caps.view_financials) {
      // "no salary on record" must mean exactly that. A role paid by the day
      // with no working-days figure HAS a rate on record; what it cannot do is
      // be shown as an annual or monthly number. Saying "no salary" there would
      // be a false statement about the data.
      var budgetCell = _fmtBudget(r, rate);
      if (!budgetCell) {
        budgetCell = (r.budgeted_compensation && !_hpCanDeriveFromDaily(r))
          ? '<span class="hiring-plan-nosalary">needs working days</span>'
          : '<span class="hiring-plan-nosalary">no salary on record</span>';
      }
      html += '<td class="hiring-plan-money">' + budgetCell + '</td>';
      var dayCell = _fmtBudget(r, 'daily');
      html += '<td class="hiring-plan-money"'
        + (dayCell ? ' title="' + _hpWorkdaysTitle(r) + '" aria-label="' + _hpWorkdaysTitle(r) + '"' : '')
        + '>' + (dayCell || '—') + '</td>';
      var costRow = _hiringPlanCosts ? (_hiringPlanCosts.rows || []).find(function(cr) { return cr.role_id === r.id; }) : null;
      // Loaded when on-cost is set; otherwise the real base figure marked
      // amber, never a dash while the salary is on record.
      var loadedCell = '—';
      if (costRow && costRow.monthly_loaded_gbp) loadedCell = costRow.monthly_loaded_gbp;
      else if (costRow && costRow.monthly_base_gbp) loadedCell = '<span style="color:#f59e0b" title="Base salary — FTE weighting % not set">' + costRow.monthly_base_gbp + '</span>';
      html += '<td class="hiring-plan-money">' + loadedCell + '</td>';
    }

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
    var combinedTotals = _hiringPlanCosts.totals.combined;
    var horizonLoadedPence = Number(combinedTotals.horizon_loaded_gbp_pence) || 0;
    var horizonBaseOnlyPence = Number(combinedTotals.horizon_base_only_gbp_pence) || 0;
    if (horizonBaseOnlyPence > 0) {
      var horizonMixed = '£' + Math.round((horizonLoadedPence + horizonBaseOnlyPence) / 100).toLocaleString('en-GB');
      html += '<span style="color:#f59e0b" title="Includes FTE roles at base salary — weighting % not set">Combined horizon total: ' + horizonMixed + ' (part base salary)</span>';
    } else {
      html += '<span>Combined horizon total: ' + (combinedTotals.horizon_loaded_gbp || '') + '</span>';
    }
  }
  html += '</div>';

  container.innerHTML = html;
}

// -------------------- Roles card view --------------------

var _PRIO_LABELS = { 0: 'P0 — Critical', 1: 'P1 — High', 2: 'P2 — Medium', 3: 'P3 — Low', 4: 'P4 — Wishlist' };

// Drag-to-reprioritise (restored 2026-07-24 — the old Positions view had
// this and the Hiring Plan rebuild dropped it). Cards drag between priority
// groups; the drop PATCHes priority through _hpPatchRole, the same endpoint
// the plan table's inline editor uses, so approval/versioning behave
// identically.
var _hpDragRoleId = null;
var _hpDragFromPrio = null;

function hpCardDragStart(ev, id, prioKey) {
  _hpDragRoleId = id;
  _hpDragFromPrio = prioKey;
  ev.dataTransfer.effectAllowed = 'move';
  try { ev.dataTransfer.setData('text/plain', id); } catch (e) { /* IE quirk, harmless */ }
  ev.currentTarget.classList.add('hiring-plan-card--dragging');
}

function hpCardDragEnd(ev) {
  ev.currentTarget.classList.remove('hiring-plan-card--dragging');
  document.querySelectorAll('.hiring-plan-prio-group--over').forEach(function(el) {
    el.classList.remove('hiring-plan-prio-group--over');
  });
  _hpDragRoleId = null;
  _hpDragFromPrio = null;
}

function hpGroupDragOver(ev) {
  if (_hpDragRoleId === null) return;
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  ev.currentTarget.classList.add('hiring-plan-prio-group--over');
}

function hpGroupDragLeave(ev) {
  if (ev.currentTarget.contains(ev.relatedTarget)) return;
  ev.currentTarget.classList.remove('hiring-plan-prio-group--over');
}

async function hpGroupDrop(ev, targetPrio) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('hiring-plan-prio-group--over');
  var id = _hpDragRoleId;
  var from = _hpDragFromPrio;
  _hpDragRoleId = null;
  _hpDragFromPrio = null;
  if (!id || String(from) === String(targetPrio)) return;
  var result = await _hpPatchRole(id, { priority: targetPrio === 'none' ? null : Number(targetPrio) });
  if (result) showToast('Priority updated', 'success');
}

function _renderRoleCard(r, caps) {
  var pLevel = r.priority != null ? Math.min(Math.max(0, Number(r.priority)), 4) : 'null';
  var canDrag = !!caps.edit_requirement;
  var prioKey = r.priority != null ? String(Number(r.priority)) : 'none';
  var dragAttrs = canDrag
    ? ' draggable="true" ondragstart="hpCardDragStart(event, \'' + r.id + '\', \'' + prioKey + '\')" ondragend="hpCardDragEnd(event)"'
    : '';
  var html = '<div class="hiring-plan-card hiring-plan-card--p' + pLevel + ' position-card" data-position-id="' + r.id + '"' + dragAttrs + ' onclick="openPositionDetail(\'' + r.id + '\')">';

  var manager = _hpUserName(r.hiring_manager_user_id);
  var deptLine = [r.department_name, manager].filter(Boolean).map(esc).join(' · ');

  html += '<div class="hiring-plan-card__top">';
  html += '<div><div class="hiring-plan-card__title">' + esc(r.title || '') + '</div>';
  html += '<div class="hiring-plan-card__dept">' + deptLine + '</div></div>';
  html += _prioPill(r.priority);
  html += '</div>';

  html += '<div class="hiring-plan-card__meta">';
  html += _approvalBadge(r.approval_status);
  html += _recruitingCell(r);
  html += _engagementBadge(r.employment_type);
  if (r.requirement_type) html += '<span class="hiring-plan-badge hiring-plan-badge--neutral">' + _hpTypeLabel(r.requirement_type) + '</span>';
  html += '</div>';

  html += '<div class="hiring-plan-card__row"><span class="k">Target start</span><span class="v" style="font-family:inherit">' + (_fmtStartMonth(r.target_start_month) || '—') + '</span></div>';

  if (caps.view_financials && r.budgeted_compensation) {
    html += '<div class="hiring-plan-card__row"><span class="k">Budget</span><span class="v">' + _fmtBudget(r) + '</span></div>';
  } else if (!caps.view_financials && caps.view_salary_range && (r.compensation_min != null || r.compensation_max != null)) {
    html += '<div class="hiring-plan-card__row"><span class="k">Advertised</span><span class="v">' + _fmtAdvertised(r) + '</span></div>';
  }

  html += '<div class="hiring-plan-card__foot">';
  html += _pipelineChip(r);
  html += '<span class="hiring-plan-card__link">Open →</span>';
  html += '</div>';

  html += '</div>';
  return html;
}

function renderHiringPlanRolesView(container) {
  var allRoles = _planFilterRoles(_hiringPlanData.roles || []);
  var caps = _hiringPlanData.capabilities || {};

  // Cards are a planning surface: closed (filled or shut down) roles are
  // hidden by default and revealed with an explicit toggle. The Plan table
  // remains the full authoritative record.
  var closedCount = allRoles.filter(function(r) { return r.status === 'closed'; }).length;
  var showClosed = !!window._hiringPlanShowClosed;
  var roles = showClosed ? allRoles : allRoles.filter(function(r) { return r.status !== 'closed'; });

  var html = '<div class="hiring-plan-controls"><div class="hiring-plan-filters">';
  if (closedCount > 0) {
    html += '<button class="btn btn-sm" id="hpToggleClosed" onclick="window._hiringPlanShowClosed=!window._hiringPlanShowClosed;renderContent()">' +
      (showClosed ? 'Hide closed roles' : 'Show ' + closedCount + ' closed role' + (closedCount !== 1 ? 's' : '')) + '</button>';
  }
  html += '</div><div class="hiring-plan-actions">';
  if (caps.create_requirement) {
    html += '<button class="btn btn-sm btn-primary" onclick="openAddHiringRole()">+ Add Role</button>';
  }
  html += '</div></div>';

  if (roles.length === 0) {
    container.innerHTML = html + '<div style="text-align:center;color:var(--text-muted);padding:32px">No roles match the current filters</div>';
    return;
  }

  // Group by priority, sorted P0 first. When the user can reprioritise,
  // every tier renders even while empty — a drop target has to exist to
  // drag a card into it.
  var canDrag = !!caps.edit_requirement;
  var groups = {};
  roles.forEach(function(r) {
    var p = r.priority != null ? Number(r.priority) : 99;
    if (!groups[p]) groups[p] = [];
    groups[p].push(r);
  });
  var keys = Object.keys(groups).map(Number);
  if (canDrag) [0, 1, 2, 3, 4].forEach(function(p) { if (keys.indexOf(p) === -1) keys.push(p); });
  var sortedKeys = keys.sort(function(a, b) { return a - b; });

  sortedKeys.forEach(function(p) {
    var label = _PRIO_LABELS[p] || (p === 99 ? 'No priority set' : 'P' + p);
    var group = groups[p] || [];
    var dropKey = p === 99 ? 'none' : String(p);
    var dropAttrs = canDrag
      ? ' ondragover="hpGroupDragOver(event)" ondragleave="hpGroupDragLeave(event)" ondrop="hpGroupDrop(event, \'' + dropKey + '\')"'
      : '';
    html += '<div class="hiring-plan-prio-group"' + dropAttrs + '>';
    html += '<div class="hiring-plan-prio-group__head">' + _prioPill(p === 99 ? null : p) + ' ' + label + ' <span class="hiring-plan-prio-group__count">(' + group.length + ')</span></div>';
    html += '<div class="hiring-plan-cards">';
    group.forEach(function(r) { html += _renderRoleCard(r, caps); });
    if (group.length === 0) html += '<div class="hiring-plan-prio-group__empty">Drop a role here</div>';
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

  // Controls: from-month + horizon + mode selects (E2E tests use .selectOption on these)
  var html = '<div class="hiring-plan-controls"><div class="hiring-plan-filters">';
  var _hpStartVal = (window._hiringCostStart || _hiringEarliestStartMonth() || _hiringCostStartMonth()).slice(0, 7);
  html += '<label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-muted)">From ';
  html += '<input type="month" id="hpCostStart" value="' + _hpStartVal + '" style="font-size:13px" onchange="if(/^\\d{4}-\\d{2}$/.test(this.value)){window._hiringCostStart=this.value+\'-01\';loadHiringPlanCosts().then(renderContent)}"></label>';
  html += '<select id="hpCostMonths" onchange="window._hiringCostMonths=Number(this.value);loadHiringPlanCosts().then(renderContent)">';
  [12, 24, 36].forEach(function(n) {
    var sel = (window._hiringCostMonths || 24) === n ? ' selected' : '';
    html += '<option value="' + n + '"' + sel + '>' + n + ' months</option>';
  });
  html += '</select>';
  html += '<select id="hpCostMode" onchange="window._hiringCostMode=this.value;renderContent()">';
  html += '<option value="loaded"' + (showLoaded ? ' selected' : '') + '>Fully weighted GBP</option>';
  html += '<option value="base"' + (!showLoaded ? ' selected' : '') + '>Base salary GBP</option>';
  html += '</select>';
  html += '</div></div>';

  // Honest empty-state: when cost defaults are missing (no settings row at
  // all, or a partial save that left types unset), say so prominently and
  // point at the fix. Without this the matrix is a wall of dashes that reads
  // as a rendering bug (Glen UAT, 2026-07-24).
  // Gate on rows actually blocked by a missing default: a client whose
  // roles all carry on_cost_override_pct is fully loaded even with no
  // settings row, and must not see a false warning (Codex P2, round 6).
  // Rows blocked ONLY by the missing FTE weighting %: they show amber base
  // salary and Settings is the one-step fix. Rows missing salary, FX, or a
  // start month gain nothing from Settings and must not trigger the banner.
  var _hpFteUnweighted = rows.filter(function(r) {
    return (r.incomplete_reasons || []).indexOf('missing_on_cost_default') !== -1
      && (r.base_gbp_pence || []).some(function(v) { return v !== null && v !== undefined && v > 0; });
  }).length;
  if (_hpFteUnweighted > 0) {
    var bannerText = '<strong>FTE weighting is not set for this client.</strong> '
      + 'Fully weighted cost = base salary + the FTE weighting % (employer costs such as NI and pension). '
      + 'Until it is set, ' + _hpFteUnweighted + ' FTE role' + (_hpFteUnweighted > 1 ? 's show' : ' shows') + ' base salary in amber. '
      + 'Contractors are never weighted — their cost is simply what they are paid.';
    html += '<div class="hiring-plan-settings-banner" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.45);border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:14px">';
    html += '<span>⚠ ' + bannerText + '</span>';
    if (caps.configure) {
      html += '<button class="btn btn-sm btn-primary" onclick="openHiringSettings()">Open Settings</button>';
    }
    html += '</div>';
  }

  // Plain-English labels for the engine's incomplete_reasons codes.
  var _HP_REASON_LABEL = {
    missing_salary: 'no salary on record',
    missing_basis: 'no pay basis set',
    missing_workdays: 'no workdays per month set',
    missing_currency: 'no currency set',
    missing_fx_rate: 'no FX rate to GBP set',
    missing_on_cost_default: 'FTE weighting % not set',
    missing_engagement_type: 'engagement type not set',
    missing_start_month: 'no start month set',
  };

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
  html += '<thead><tr>';
  html += '<th class="hiring-plan-matrix-sticky hiring-plan-matrix-c1">Role</th>';
  html += '<th class="hiring-plan-matrix-sticky hiring-plan-matrix-c2">Approval</th>';
  html += '<th class="hiring-plan-matrix-sticky hiring-plan-matrix-c3">Start</th>';
  months.forEach(function(m) { html += '<th>' + fmtMonth(m) + '</th>'; });
  html += '<th class="hiring-plan-horizon-th">Horizon total</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(function(row) {
    var cls = row.excluded ? ' hiring-plan-excluded' : row.incomplete ? ' hiring-plan-incomplete-row' : '';
    var role = rolesById[row.role_id] || {};
    var deptInfo = role.department_name || '';
    var typeInfo = _HP_ENGAGEMENT_SHORT[role.employment_type] || '';
    var ccyInfo = role.compensation_currency || '';
    var subLine = [deptInfo, typeInfo, ccyInfo].filter(Boolean).join(' · ');
    if (row.incomplete) {
      // Say WHY the row cannot be costed. The old blanket "no salary on
      // record" was false whenever the missing input was the client on-cost
      // default or an FX rate.
      var reasonText = (row.incomplete_reasons || [])
        .map(function(rc) { return _HP_REASON_LABEL[rc]; })
        .filter(Boolean)
        .join(', ') || 'incomplete cost assumptions';
      subLine = subLine ? subLine + ' · ' + reasonText : reasonText;
    }

    html += '<tr class="' + cls + '" onclick="openPositionDetail(\'' + row.role_id + '\')" style="cursor:pointer">';
    html += '<td class="hiring-plan-matrix-sticky hiring-plan-matrix-c1 hiring-plan-matrix-role"><div class="t">' + esc(row.title || '') + '</div><div class="d' + (row.incomplete ? ' hiring-plan-incomplete-flag-inline' : '') + '">' + esc(subLine) + '</div></td>';
    // Approval is editable here exactly as on the plan table: same inline
    // select, same endpoints, so a change made on this sheet propagates
    // everywhere (Glen 2026-07-24).
    var canApproveHere = !!caps.approve_or_deny;
    html += '<td class="hiring-plan-matrix-sticky hiring-plan-matrix-c2' + (canApproveHere ? ' hiring-plan-editable' : '') + '"'
      + (canApproveHere ? ' title="Click to approve or deny" onclick="inlineEditApproval(event, \'' + row.role_id + '\')"' : '')
      + '>' + _approvalBadge(role.approval_status) + '</td>';
    // Start: the real hire date when one is recorded; otherwise the
    // planning target month, labelled as such.
    var startCell = row.actual_start_date
      ? _fmtFullDate(row.actual_start_date)
      : ((_fmtStartMonth(role.target_start_month) || '—'));
    var startTitle = row.actual_start_date ? 'Recorded start date' : 'Planning target month — no start date recorded';
    html += '<td class="hiring-plan-matrix-sticky hiring-plan-matrix-c3" title="' + startTitle + '">' + startCell + '</td>';

    // Per-cell rendering. A null LOADED cell whose base cost is known shows
    // the base figure in amber ("base only") instead of a dash: salary and
    // start date fully determine base cost; only the on-cost is pending
    // (Glen's correction 2026-07-24 — the matrix must never be blank when
    // the salaries are on record).
    var cells = row[field] || [];
    var baseCells = row.base_gbp_pence || [];
    var rowUsedBaseOnly = false;
    cells.forEach(function(val, i) {
      if (val === null || val === undefined) {
        if (showLoaded && baseCells[i] !== null && baseCells[i] !== undefined) {
          rowUsedBaseOnly = true;
          html += '<td class="hiring-plan-cell hiring-plan-cell--baseonly" style="color:#f59e0b" title="Base salary — FTE weighting % not set">' + fmtPence(baseCells[i]) + '</td>';
        } else {
          html += '<td class="hiring-plan-cell hiring-plan-cell--zero">—</td>';
        }
      } else if (val === 0) {
        html += '<td class="hiring-plan-cell hiring-plan-cell--zero">0</td>';
      } else {
        html += '<td class="hiring-plan-cell">' + fmtPence(val) + '</td>';
      }
    });

    // Row horizon total: sum known cells, falling back to base where only
    // the loaded figure is missing. Unknown only when a cell has neither.
    var horizonSum = 0;
    var horizonKnown = true;
    cells.forEach(function(val, i) {
      if (val !== null && val !== undefined) horizonSum += Number(val) || 0;
      else if (showLoaded && baseCells[i] !== null && baseCells[i] !== undefined) horizonSum += Number(baseCells[i]) || 0;
      else horizonKnown = false;
    });
    if (!horizonKnown) {
      html += '<td class="hiring-plan-cell hiring-plan-horizon-cell hiring-plan-cell--zero">—</td>';
    } else if (rowUsedBaseOnly) {
      html += '<td class="hiring-plan-cell hiring-plan-horizon-cell" style="color:#f59e0b" title="Includes months at base salary — FTE weighting % not set"><strong>' + fmtPence(horizonSum) + '</strong></td>';
    } else {
      html += '<td class="hiring-plan-cell hiring-plan-horizon-cell"><strong>' + fmtPence(horizonSum) + '</strong></td>';
    }
    html += '</tr>';
  });

  // Total rows with color coding
  // Which caveats actually apply to a total: roles with NO computable cost
  // (missing salary or start month) are excluded from every total; roles at
  // base cost are INCLUDED in loaded-mode totals and shown amber. Both
  // caveats are computed PER BUCKET — a complete Approved bucket must not be
  // flagged for a pending role's missing data (Codex P2, round 3).
  var anyBaseNull = rows.some(function(r) {
    return !r.excluded && (r.base_gbp_pence || []).some(function(v) { return v === null || v === undefined; });
  });
  var _bucketMissesRoles = function(statuses) {
    return rows.some(function(r) {
      if (r.excluded) return false;
      var role = rolesById[r.role_id] || {};
      if (statuses.indexOf(role.approval_status) === -1) return false;
      return (r.base_gbp_pence || []).some(function(v) { return v === null || v === undefined; });
    });
  };
  var renderTotalRow = function(label, bucket, colorClass, excludesMissing) {
    var bucketBaseOnly = showLoaded && (bucket.base_only_gbp_pence || []).some(function(v) { return Number(v) > 0; });
    var caveats = [];
    if (bucketBaseOnly) caveats.push('includes FTE roles at base salary (weighting % not set)');
    if (excludesMissing) caveats.push('excludes roles whose base salary cannot be calculated — see the flagged rows for what each is missing');
    html += '<tr class="hiring-plan-total-row ' + colorClass + '">';
    html += '<td class="hiring-plan-matrix-sticky hiring-plan-matrix-c1"><strong>' + label + '</strong>';
    if (caveats.length > 0) {
      var caveatText = caveats.join('; ');
      html += '<span class="hiring-plan-incomplete-flag" title="' + caveatText.charAt(0).toUpperCase() + caveatText.slice(1) + '">⚠ partial</span>';
    }
    html += '</td>';
    html += '<td class="hiring-plan-matrix-sticky hiring-plan-matrix-c2"></td>';
    html += '<td class="hiring-plan-matrix-sticky hiring-plan-matrix-c3"></td>';
    // In loaded mode, months containing base-only roles show the combined
    // "loaded + base" figure in amber: a real minimum, never a blank and
    // never presented as a true loaded total.
    var cells = bucket[field] || [];
    var baseOnly = showLoaded ? (bucket.base_only_gbp_pence || []) : [];
    var totalSum = 0;
    var totalUsedBase = false;
    cells.forEach(function(val, i) {
      var extra = Number(baseOnly[i]) || 0;
      var cellVal = (Number(val) || 0) + extra;
      totalSum += cellVal;
      if (extra > 0) {
        totalUsedBase = true;
        html += '<td class="hiring-plan-cell" style="color:#f59e0b" title="Includes FTE roles at base salary — weighting % not set"><strong>' + fmtPence(cellVal) + '</strong></td>';
      } else {
        html += '<td class="hiring-plan-cell"><strong>' + fmtPence(cellVal) + '</strong></td>';
      }
    });
    html += '<td class="hiring-plan-cell hiring-plan-horizon-cell"' + (totalUsedBase ? ' style="color:#f59e0b" title="Includes FTE roles at base salary — weighting % not set"' : '') + '><strong>' + fmtPence(totalSum) + '</strong></td>';
    html += '</tr>';
  };
  if (totals.approved) renderTotalRow('Approved', totals.approved, 'approved', _bucketMissesRoles(['approved']));
  if (totals.pending) renderTotalRow('Total Pending', totals.pending, 'pending', _bucketMissesRoles(['pending']));
  if (totals.combined) renderTotalRow('Combined Total', totals.combined, 'combined', _bucketMissesRoles(['approved', 'pending']));

  html += '</tbody></table></div>';

  var incIds = _hiringPlanCosts.incompleteRoleIds || [];
  if (incIds.length > 0) {
    var noticeParts = ['⚠ ' + incIds.length + ' role' + (incIds.length > 1 ? 's are' : ' is') + ' missing cost information.'];
    if (showLoaded && _hpFteUnweighted > 0) noticeParts.push('Amber figures are base salary only — set the FTE weighting % in Settings to see the fully weighted cost.');
    if (anyBaseNull) noticeParts.push('Roles whose base salary cannot be calculated are left out of the totals — each flagged row says what it is missing.');
    html += '<div class="hiring-plan-incomplete-notice">' + noticeParts.join(' ') + '</div>';
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

  html += '<fieldset style="border:1px solid var(--border-default);border-radius:6px;padding:12px"><legend>FTE Weighting</legend>';
  html += '<div style="font-size:14px;color:var(--text-muted);margin-bottom:10px;line-height:1.5">'
    + 'An employee costs more than their salary: employer National Insurance, pension and similar costs come on top. '
    + 'This percentage is added to every <strong>FTE</strong> salary to give the fully weighted cost — one blanket figure for all FTE roles at this client. '
    + 'Contractors are never weighted: their cost is simply what they are paid.'
    + '</div>';
  // Redaction check: GET strips the pct field for configure-capable users
  // without financial access. For them a blank input must mean "keep the
  // hidden value", never "clear it" — otherwise saving wipes a default they
  // cannot see (Codex P1, round 4). window._hsPctReadable drives save logic.
  var pctReadable = ('fte_on_cost_pct' in s);
  window._hsPctReadable = pctReadable;
  if (s.configured === false) {
    html += '<div style="color:#b45309;font-size:14px;margin-bottom:8px">⚠ Not set for this client yet — FTE roles show base salary only until it is.</div>';
  } else if (!pctReadable) {
    html += '<div style="color:var(--text-muted);font-size:14px;margin-bottom:8px">The current value is hidden (financial access required). Enter a number to overwrite; leave blank to keep the existing value.</div>';
  }
  // Unset renders as an EMPTY input, never a fabricated 0: a zero here is a
  // real "0% weighting" choice, not a default.
  // Postgres hands back NUMERIC(14,4) as "26.0000". Showing that in an input a
  // human typed "26" into is noise, and it round-trips back on every save.
  // Trim to the significant figure without ever turning an unset value into 0.
  var tidyNum = function(v) {
    if (v === null || v === undefined || v === '') return '';
    var n = Number(v);
    return isFinite(n) ? String(n) : String(v);
  };
  var pctVal = tidyNum;
  var pctPlaceholder = pctReadable ? 'not set' : 'hidden';
  html += '<label style="display:block;max-width:220px">FTE weighting %<input id="hsFte" type="number" step="0.01" min="0" value="' + pctVal(s.fte_on_cost_pct) + '" placeholder="' + pctPlaceholder + '" style="width:100%"></label>';
  html += '</fieldset>';

  html += '<fieldset style="border:1px solid var(--border-default);border-radius:6px;padding:12px"><legend>Working Days per Month</legend>';
  var wdVal = s.default_workdays_per_month;
  var wdSet = wdVal !== null && wdVal !== undefined && wdVal !== '';
  var wdEff = wdSet ? Number(wdVal) : HP_STANDARD_WORKDAYS;
  html += '<div style="font-size:14px;color:var(--text-muted);margin-bottom:10px;line-height:1.5">'
    + 'Used to turn a salary into a day rate: <strong>annual salary ÷ 12 ÷ working days per month</strong>. '
    + 'Set it to match how this client counts a working month, so the day rates here agree with their own budget model. '
    + 'Leave it blank to use the standard 21 days (261 UK working days a year ÷ 12 = 21.75, rounded down).'
    + '</div>';
  html += '<label style="display:block;max-width:220px">Working days per month<input id="hsWorkdays" type="number" step="0.5" min="0.5" max="31" value="' + (wdSet ? tidyNum(wdVal) : '') + '" placeholder="not set, using 21" style="width:100%"></label>';
  html += '<div style="font-size:14px;color:var(--text-muted);margin-top:10px;line-height:1.5">'
    + 'Currently ' + (wdSet ? '<strong>' + wdEff + ' days</strong>, set for this client' : 'the standard <strong>21 days</strong>. Not set for this client')
    + '. A salary of £60,000 shows as <strong>£' + Math.round(60000 / 12 / wdEff).toLocaleString('en-GB') + '/day</strong> at this setting.'
    + '</div>';
  html += '<div style="font-size:14px;color:var(--text-muted);margin-top:8px;line-height:1.5">'
    + 'This changes the day rate <strong>shown on screen</strong> for roles paid by the year or the month. It does not change any cost total. It also does not fill in a missing figure on a role paid by the day: those roles stay flagged as incomplete until someone records working days per month on that role, which is a separate field and does feed the totals.'
    + '</div>';
  html += '</fieldset>';

  html += '<fieldset style="border:1px solid var(--border-default);border-radius:6px;padding:12px"><legend>Departments</legend>';
  html += '<div style="font-size:14px;color:var(--text-muted);margin-bottom:10px;line-height:1.5">'
    + 'The teams roles can be assigned to. Departments group the plan and the cost breakdown, so a role without one is counted in the totals but cannot be traced to a team. '
    + 'Departments are never deleted, only made inactive, so historic roles keep the department they were planned under.'
    + '</div>';
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
  // WYSIWYG save: the three inputs are the whole picture. A number saves
  // that percentage; a blank saves NULL ("not set") — never a silent 0, and
  // clearing a previously saved value genuinely unsets it. Exception: when
  // the stored values are REDACTED from this user (configure capability
  // without financial access), a blank means "keep the hidden value" and is
  // omitted — otherwise saving would wipe defaults they cannot see.
  var pctReadable = window._hsPctReadable !== false;
  var body = {};
  var anyValue = false;
  var invalidInput = false;
  [['hsFte', 'fte_on_cost_pct']].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (!el) return;
    var raw = el.value.trim();
    if (raw === '') {
      if (pctReadable) body[pair[1]] = null;
    } else if (isFinite(Number(raw)) && Number(raw) >= 0) {
      body[pair[1]] = Number(raw);
      anyValue = true;
    } else {
      invalidInput = true;
    }
  });
  if (invalidInput) {
    showToast('The FTE weighting must be a number of 0 or more', 'error');
    return;
  }

  // Working days is handled separately from the percentage loop on purpose.
  // It must NOT count towards anyValue: that flag guards first-time setup, and
  // saving a working-days figure alone must not be mistaken for having
  // configured the client's on-costs. Zero is rejected rather than stored --
  // it is a divisor, so a zero would be a divide by zero, not a valid choice.
  var wdEl = document.getElementById('hsWorkdays');
  if (wdEl) {
    var wdRaw = wdEl.value.trim();
    if (wdRaw === '') {
      body.default_workdays_per_month = null;
    } else if (isFinite(Number(wdRaw)) && Number(wdRaw) >= 0.5 && Number(wdRaw) <= 31) {
      body.default_workdays_per_month = Number(wdRaw);
    } else {
      showToast('Working days per month must be a number between 0.5 and 31', 'error');
      return;
    }
  }

  if (!anyValue && (_hiringPlanSettings || {}).configured === false) {
    showToast('Enter the FTE weighting percentage before saving', 'error');
    return;
  }
  if (Object.keys(body).length === 0) {
    showToast('No changes to save', 'info');
    return;
  }
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

// -------------------- Role sidebar: hiring plan sections --------------------
// Injected into the existing position-detail panel (spec 9: the sidebar
// retains all current role and candidate information and ADDS planning
// details, cost assumptions, the approval decision and immutable history).

var _HP_STAGE_COLORS = {
  sourcing: '#8b8b8b', interviews: '#0066FF', offer: '#22c55e',
  onboarding: '#06b6d4', onboarded: '#16a34a', process_closed: '#6b7280',
};

function _hpIsPlanRole(p) {
  return !!p && 'approval_status' in p;
}

function _hpKv(k, v) {
  return '<div class="hp-sb-item"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
}

// Applied weighting, mirroring the server engine (lib/hiring-costs.js):
// contractors and PSCs are NEVER weighted (0); FTE roles use the role
// override when set, else the client's blanket FTE weighting %. Null when
// an FTE role has neither.
function _hpOnCostPct(r) {
  var type = r.employment_type;
  if (type === 'contractor' || type === 'contract' || type === 'psc' || type === 'freelance') return 0;
  if (r.on_cost_override_pct != null) return Number(r.on_cost_override_pct);
  if (type !== 'fte' && type !== 'permanent') return null;
  var s = _hiringPlanSettings || {};
  return s.fte_on_cost_pct != null ? Number(s.fte_on_cost_pct) : null;
}

function renderHiringPlanSidebarSections(p) {
  var caps = _hiringPlanData.capabilities || {};
  var html = '';

  // Planning details
  var manager = _hpUserName(p.hiring_manager_user_id);
  html += '<div class="hp-sb-section"><h3>Planning details</h3><div class="hp-sb-kv">';
  html += _hpKv('Department', esc(p.department_name || '') || '—');
  html += _hpKv('Priority', p.priority != null ? 'P' + p.priority : '—');
  html += _hpKv('Target start', _fmtStartMonth(p.target_start_month) || '—');
  html += _hpKv('Requirement', _hpTypeLabel(p.requirement_type));
  html += _hpKv('Engagement', _HP_ENGAGEMENT_SHORT[p.employment_type] || esc(p.employment_type || '') || '—');
  html += _hpKv('Hiring manager', esc(manager) || '—');
  html += '</div></div>';

  // Approval state + actions
  html += '<div class="hp-sb-section"><h3>Approval</h3>';
  html += '<div class="hp-sb-badges">' + _approvalBadge(p.approval_status) + ' ' + _recruitingCell(p) + '</div>';
  if (p.approval_status === 'pending' && caps.approve_or_deny) {
    html += '<div class="hp-sb-approve-bar">';
    html += '<button class="btn btn-sm hp-btn-approve" onclick="sidebarApproveRole(\'' + p.id + '\')">✓ Approve</button>';
    html += '<button class="btn btn-sm hp-btn-deny" onclick="openDenyRoleModal(\'' + p.id + '\')">✕ Deny…</button>';
    html += '</div>';
  }
  html += '<div id="hpSbDenial"></div>';
  html += '</div>';

  // Compensation & cost assumptions — the server redacts fields the current
  // user may not see, so field presence is the permission signal.
  if ('budgeted_compensation' in p) {
    var costRow = _hiringPlanCosts ? (_hiringPlanCosts.rows || []).find(function(cr) { return cr.role_id === p.id; }) : null;
    var onCost = _hpOnCostPct(p);
    html += '<div class="hp-sb-section"><h3>Compensation &amp; cost assumptions</h3><div class="hp-sb-kv">';
    html += _hpKv('Advertised range', _fmtAdvertised(p));
    html += _hpKv('Exact budget', _fmtBudget(p) || 'no salary on record');
    var dayRate = _fmtBudget(p, 'daily');
    html += _hpKv('Day rate', dayRate
      ? dayRate + '<div style="color:var(--text-secondary);font-size:14px;font-weight:400;margin-top:4px;line-height:1.4">' + _hpWorkdaysBasisText(p) + '</div>'
      : '—');
    html += _hpKv('FX to GBP', p.fx_rate_to_gbp != null ? esc(String(p.fx_rate_to_gbp)) : ((p.compensation_currency || 'GBP') === 'GBP' ? '1 (GBP)' : '—'));
    html += _hpKv('FX source', esc(p.fx_rate_source_note || '') || '—');
    var isUnweighted = ['contractor', 'contract', 'psc', 'freelance'].indexOf(p.employment_type) !== -1;
    html += _hpKv('FTE weighting', isUnweighted ? 'n/a — contractors are not weighted' : (onCost != null ? '+' + onCost + '%' : 'not set for this client'));
    html += _hpKv('Monthly base salary GBP', costRow && costRow.monthly_base_gbp ? costRow.monthly_base_gbp : '—');
    html += _hpKv('Monthly fully weighted GBP', costRow && costRow.monthly_loaded_gbp ? costRow.monthly_loaded_gbp : (costRow && costRow.monthly_base_gbp ? 'base salary shown — weighting % not set' : '—'));
    html += '</div></div>';
  } else if ('compensation_min' in p) {
    html += '<div class="hp-sb-section"><h3>Compensation</h3><div class="hp-sb-kv">';
    html += _hpKv('Advertised range', _fmtAdvertised(p));
    html += _hpKv('Budget &amp; cost data', '<span class="hp-sb-redacted">restricted</span>');
    html += '</div></div>';
  }

  // Immutable history — filled in asynchronously by loadSidebarHistory().
  html += '<div class="hp-sb-section"><h3>Approval &amp; change history <span class="hp-sb-hint">(immutable)</span></h3>';
  html += '<div id="hpSbHistory" class="hp-sb-history">Loading…</div></div>';

  return html;
}

// Candidate stage distribution bar for the sidebar (spec 11).
function renderHiringPlanStageBar(p, activeCandidates) {
  var counts = {};
  if (activeCandidates && activeCandidates.length) {
    activeCandidates.forEach(function(c) { counts[c.stage] = (counts[c.stage] || 0) + 1; });
  } else if (p.candidate_counts && typeof p.candidate_counts === 'object') {
    counts = p.candidate_counts;
  }
  var parts = _pipelineStageParts(counts);
  var total = parts.reduce(function(a, x) { return a + x.count; }, 0);
  if (total === 0) return '';
  var bar = parts.map(function(x) {
    return '<span style="width:' + ((x.count / total) * 100) + '%;background:' + (_HP_STAGE_COLORS[x.key] || '#888') + '"></span>';
  }).join('');
  var legend = parts.map(function(x) {
    var lbl = (typeof HIRING_STAGE_LABELS !== 'undefined' && HIRING_STAGE_LABELS[x.key]) || x.key;
    return '<span><span class="dot" style="background:' + (_HP_STAGE_COLORS[x.key] || '#888') + '"></span>' + esc(lbl) + ' <b>' + x.count + '</b></span>';
  }).join('');
  return '<div class="hp-stage-bar">' + bar + '</div><div class="hp-stage-legend">' + legend + '</div>';
}

async function loadSidebarHistory(id) {
  var el = document.getElementById('hpSbHistory');
  if (!el) return;
  var events = await apiCall('/api/hiring-plan/' + id + '/history');
  if (!Array.isArray(events)) { el.innerHTML = '<span style="color:var(--text-muted)">History unavailable</span>'; return; }
  if (events.length === 0) { el.innerHTML = '<span style="color:var(--text-muted)">No approval events yet</span>'; return; }

  var LABELS = {
    approved: 'Approved', denied: 'Denied', reopened_for_approval: 'Reopened for approval',
    legacy_imported: 'Imported from legacy tracker', submitted: 'Submitted for approval',
  };
  var CLS = { approved: 'ok', denied: 'bad', reopened_for_approval: 'warn', legacy_imported: 'ok', submitted: 'warn' };

  var html = '';
  events.slice().reverse().forEach(function(ev) { // newest first
    var label = LABELS[ev.event_type] || esc(ev.event_type || '');
    var who = ev.actor_name ? ' by ' + esc(ev.actor_name) : '';
    var when = ev.created_at ? new Date(ev.created_at).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    var extra = '';
    if (ev.event_type === 'denied' && ev.denial_reason) {
      extra = '<div class="hp-hist-extra">' + esc(_HP_DENIAL_LABELS[ev.denial_reason] || ev.denial_reason) + (ev.denial_comment ? ' — “' + esc(ev.denial_comment) + '”' : '') + '</div>';
    }
    html += '<div class="hp-hist-item ' + (CLS[ev.event_type] || '') + '"><div>' + label + who + '</div>' + extra + '<div class="hp-hist-when">' + when + '</div></div>';
  });
  el.innerHTML = html;

  // Surface the latest denial in the Approval section
  var denialEl = document.getElementById('hpSbDenial');
  var role = _hpRole(id);
  if (denialEl && role && role.approval_status === 'denied') {
    var denials = events.filter(function(ev) { return ev.event_type === 'denied'; });
    var lastDenied = denials[denials.length - 1];
    if (lastDenied) {
      denialEl.innerHTML = '<div class="hp-sb-denial"><b>Denied — ' + esc(_HP_DENIAL_LABELS[lastDenied.denial_reason] || lastDenied.denial_reason || '') + '.</b> ' + esc(lastDenied.denial_comment || '') + '</div>';
    }
  }
}

async function sidebarApproveRole(id) {
  var r = _hpRole(id);
  if (!r) return;
  var result = await apiCall('/api/hiring-plan/' + id + '/approve', {
    method: 'POST',
    body: JSON.stringify({ planning_version: r.planning_version }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (result && result.id) showToast('Role approved', 'success');
  await refreshHiringPlan();
  renderContent();
  openPositionDetail(id);
}

// -------------------- Tab rendering --------------------

function changeHiringPlanClient(clientId) {
  window._hiringFilterClient = clientId || null;
  _hiringPlanLoaded = false;
  _hiringPlanCosts = null;
  _hiringPlanSettings = null;
  // Each client's plan starts at its own earliest role month; a start month
  // carried over from another client would silently crop or pad the horizon.
  window._hiringCostStart = null;
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
