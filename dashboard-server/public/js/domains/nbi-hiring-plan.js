// ==================== HIRING PLAN ====================
// Mockup-parity rendering: KPI strip, rich plan table, styled monthly matrix.

var _hiringPlanData = { roles: [], capabilities: {} };
var _hiringPlanCosts = null;
var _hiringPlanSettings = null;
// True when the settings fetch FAILED, as distinct from succeeding and finding
// nothing configured. The day-rate caption must not claim a client has no
// figure set when the truth is that we could not ask.
var _hiringPlanSettingsFailed = false;
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
  if (!data) {
    // A failed fetch is NOT the same as "this client has no figure set". Before
    // this flag, a dropped request silently fell back to the standard divisor
    // while the caption asserted "Not set for this client" -- a provenance
    // feature stating a provenance it could not know. Record the failure so the
    // caption can say it does not know.
    _hiringPlanSettingsFailed = true;
    return false;
  }
  _hiringPlanSettingsFailed = false;
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
  // A role with no engagement type recorded rendered as an EMPTY pill: a grey
  // box with nothing in it, which reads as a rendering fault rather than as
  // missing data. It is not cosmetic -- an unrecorded engagement type is why
  // the cost engine cannot resolve that role's employer on-costs, so the cell
  // must show the absence and say what it costs.
  if (!label) {
    return '<span class="hiring-plan-badge hiring-plan-badge--neutral" title="No engagement type recorded, so employer on-costs cannot be worked out for this role">Not set</span>';
  }
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

// A day rate is a CONTRACTOR'S COMMERCIAL TERM, not a property of a salary
// (Glen 2026-07-25). Nobody pays an employee by the day, so an FTE day rate is
// a derived curiosity whose divisor is arguable, and arguing it was the whole
// problem: 21 (261 calendar weekdays / 12) counts gross weekdays with no leave
// deducted, 18 (216 billable days / 12) counts net of leave, and no single
// figure is right for both populations. Showing the rate only where it is a
// real commercial term removes the question instead of answering it.
//
// This set MIRRORS UNWEIGHTED_TYPES in lib/hiring-costs.js, including the
// legacy spellings, so the screen and the cost engine can never disagree about
// who is a contractor. Anything outside it, including an unrecorded engagement
// type, gets no day rate: we do not know that it is a contractor, and guessing
// is how a made-up number reaches a board pack.
var HP_DAY_RATE_TYPES = { contractor: 1, contract: 1, psc: 1, freelance: 1 };

function _hpHasDayRate(r) {
  var t = r && r.employment_type;
  return !!(t && HP_DAY_RATE_TYPES[String(t).toLowerCase()]);
}

// The standard fallback divisor for contractors: 260 working days a year less
// 36 vacation less 8 sick = 216 billable, / 12 = 18. Couch Heroes' own
// fully-loaded cost model and their July 2026 contractor reform arrive at 18
// independently. Used only when neither the role nor the client states a
// figure, and the UI always says when it is being used.
var HP_STANDARD_WORKDAYS = 18;

// Working days per month behind a contractor's day rate, most specific source
// wins: the role's own expected_workdays_per_month, then the client's
// configured figure, then the standard 18. Returns the number and where it came
// from, so the UI can show its working rather than presenting a bare figure.
function _hpWorkdaysFor(r) {
  var roleWd = Number(r && r.expected_workdays_per_month);
  if (isFinite(roleWd) && roleWd > 0) return { days: roleWd, source: 'role' };

  // The failure check MUST come before the cached client value. A refresh that
  // failed leaves the previously loaded settings object in place, and reading
  // it here reported "set for this client" about a figure that could not be
  // re-read and may since have changed. The flag means "we could not ask", and
  // that outranks a stale answer (Codex P2, 2026-07-25).
  if (_hiringPlanSettingsFailed) return { days: HP_STANDARD_WORKDAYS, source: 'unknown' };

  var s = _hiringPlanSettings || {};
  var clientWd = Number(s.contractor_workdays_per_month);
  if (isFinite(clientWd) && clientWd > 0) return { days: clientWd, source: 'client' };

  return { days: HP_STANDARD_WORKDAYS, source: 'standard' };
}

// Plain-English statement of which working-days figure produced a day rate and
// where it came from. Shown in the role sidebar under the number itself.
function _hpWorkdaysBasisText(r) {
  // Staff have no day rate to explain. Say why, rather than leaving a bare
  // dash that reads as missing data.
  if (!_hpHasDayRate(r)) {
    if (!r || !r.employment_type) {
      return 'No day rate: this role has no engagement type recorded, so it is not known whether it is a contract.';
    }
    return 'Day rates apply to contractors. Staff are paid an annual salary.';
  }

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
  if (wd.source === 'unknown') {
    return 'Based on the standard ' + wd.days + ' billable days per month. This client’s settings could not be loaded, so it is not known whether they use a different figure. Reload before relying on this rate.';
  }
  return 'Based on the standard ' + wd.days + ' billable days per month. Not set for this client, so this rate may not match their own contracting model.';
}

// Same fact as a hover title on the compact table cell. Attribute-safe: the
// text is built here rather than interpolated from user input, but the quote
// strip is kept so a future edit cannot break out of the attribute.
function _hpWorkdaysTitle(r) {
  var text = _hpWorkdaysBasisText(r).split('"').join('');
  var basis = r.compensation_basis || 'annual';
  var days = _hpWorkdaysFor(r).days;

  // No day rate means no arithmetic to quote. The basis text is already a
  // complete explanation of why the cell is empty.
  if (!_hpHasDayRate(r)) return text;

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
// Mirrors VALID_BASES in lib/hiring-costs.js.
var HP_VALID_BASES = { annual: 1, monthly: 1, daily: 1 };

// Which recorded pay assumption is missing, if any. Both columns are nullable
// (migration 084 added them to existing rows), and the cost engine REFUSES to
// cost a role missing either: diagnoseCostInputs raises missing_basis and
// missing_currency. The display used to default them to 'annual' and 'GBP',
// so a role with no currency on record was shown a confident pound sign and a
// role with no basis was shown a confident annual figure, both beside a
// Weighted/mo dash from the engine that had refused the very same inputs.
// Inventing a currency is how a euro contractor reaches a board pack as
// sterling (Codex P1, 2026-07-25).
function _hpMissingPayAssumption(r) {
  if (!r) return null;
  if (!HP_VALID_BASES[r.compensation_basis]) return 'basis';
  var ccy = typeof r.compensation_currency === 'string' ? r.compensation_currency.trim() : '';
  if (!ccy) return 'currency';
  return null;
}

function _budgetInRate(r, rate) {
  if (!r.budgeted_compensation) return null;
  var amount = Number(r.budgeted_compensation);
  if (!isFinite(amount) || amount <= 0) return null;
  if (_hpMissingPayAssumption(r)) return null;
  var basis = r.compensation_basis;
  var wd = _hpWorkdaysFor(r);
  var workdays = wd.days;

  // No daily figure is produced for a role that is not a contract, whether it
  // is asked for by the Day rate column or by the annual/monthly/daily rate
  // toggle. Gating only the column would leave the Daily toggle stating a
  // confident GBP 307/day in the Budget cell while the Day rate cell beside it
  // showed a dash: two adjacent cells answering the same question differently,
  // which is the failure this whole change exists to remove.
  if (rate === 'daily' && !_hpHasDayRate(r)) return null;

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
  // An advertised range with no currency on record cannot be given one. A
  // pound sign we invented is a worse answer than saying we do not know.
  var ccy = typeof r.compensation_currency === 'string' ? r.compensation_currency.trim() : '';
  if (!ccy) return '<span class="hiring-plan-nosalary">no currency recorded</span>';
  var fmt = function(v) {
    try { return Number(v).toLocaleString('en-GB', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }); }
    catch (e) { return String(v); }
  };
  if (r.compensation_min != null && r.compensation_max != null) return fmt(r.compensation_min) + '–' + fmt(r.compensation_max);
  return fmt(r.compensation_min != null ? r.compensation_min : r.compensation_max);
}

function _fmtBudget(r, rate) {
  rate = rate || (HP_VALID_BASES[r.compensation_basis] ? r.compensation_basis : 'annual');
  var value = _budgetInRate(r, rate);
  if (value === null) return '';
  // _budgetInRate has already refused anything with a missing basis or
  // currency, so by here the currency is genuinely on record.
  var ccy = r.compensation_currency.trim();
  var suffix = rate === 'annual' ? '/yr' : rate === 'monthly' ? '/mo' : '/day';
  try {
    var formatted = value.toLocaleString('en-GB', { style: 'currency', currency: ccy, maximumFractionDigits: 0 });
    return formatted + '<span style="color:var(--text-muted);font-size:13px">' + suffix + '</span>';
  } catch (e) {
    return String(Math.round(value));
  }
}

// The one place that decides what an empty money cell SAYS. Plan, Finance and
// the Roles card previously each carried their own copy of this ladder, which
// is how two views came to describe the same missing datum differently. Order
// is most-specific-first, and every branch names a distinct, fixable cause.
function _hpBudgetRefusal(r, rate) {
  if (!r || !r.budgeted_compensation) return '<span class="hiring-plan-nosalary">no salary on record</span>';
  var missing = _hpMissingPayAssumption(r);
  if (missing === 'basis') return '<span class="hiring-plan-nosalary">no pay basis recorded</span>';
  if (missing === 'currency') return '<span class="hiring-plan-nosalary">no currency recorded</span>';
  // The salary IS on record; what is refused is converting it to a day rate,
  // because this role is not a contract.
  if (rate === 'daily' && !_hpHasDayRate(r)) return '<span class="hiring-plan-nosalary">salaried, no day rate</span>';
  // Paid by the day with no working-days figure: the day rate is real, an
  // annual or monthly figure is not derivable.
  if (!_hpCanDeriveFromDaily(r)) return '<span class="hiring-plan-nosalary">needs working days</span>';
  return '<span class="hiring-plan-nosalary">no salary on record</span>';
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
    var approvalById = {}, typeById = {};
    roles.forEach(function(r) { approvalById[r.id] = r.approval_status; typeById[r.id] = r.employment_type; });
    var fmtP = function(pence) { return '£' + Math.round(pence / 100).toLocaleString('en-GB'); };
    // Cost KPIs count HIRED roles only (Glen 2026-07-24: zero until hired),
    // and of those, only roles whose cost has actually STARTED on the
    // Europe/London calendar. A filled role starting in October is not "being
    // paid" in July, and counting it here contradicted the Finance totals one
    // view over (Codex P1, 2026-07-26; same gate as _hpTotalsCoverage). Falls
    // back to base salary when only the weighting inputs are missing, never
    // to £0 while salaries are on record — and every omission is disclosed
    // independently below, because an if/else chain here concealed uncosted
    // roles whenever a base-only role coexisted with them (Codex P1).
    var nowKey = _hpCurrentMonthKey();
    var mkBucket = function() {
      return { paidPence: 0, paid: 0, later: 0, undated: 0, baseWeighting: 0, baseEngagement: 0, uncosted: 0 };
    };
    var kpiCombined = mkBucket(), kpiApproved = mkBucket();
    _hiringPlanCosts.rows.forEach(function(cr) {
      if (cr.excluded || cr.state !== 'hired') return;
      var targets = [kpiCombined];
      if (approvalById[cr.role_id] === 'approved') targets.push(kpiApproved);
      var charging = !!(cr.start_month && cr.start_month <= nowKey);
      targets.forEach(function(b) {
        if (!charging) { if (cr.start_month) b.later++; else b.undated++; return; }
        b.paid++;
        var p = cr.monthly_loaded_gbp_pence;
        if (p === null || p === undefined) {
          p = cr.monthly_base_gbp_pence;
          if (p === null || p === undefined) { b.uncosted++; p = 0; }
          else {
            // Same cause split as _hpTotalsCoverage: an FTE missing the
            // blanket % is fixed in Settings; a role with no engagement type
            // is fixed on the role. Naming the wrong one sends the reader to
            // the wrong screen.
            var t = typeof typeById[cr.role_id] === 'string' ? typeById[cr.role_id].trim().toLowerCase() : '';
            if (HP_FTE_TYPES[t]) b.baseWeighting++; else b.baseEngagement++;
          }
        }
        b.paidPence += Number(p) || 0;
      });
    });

    // Every applicable warning renders — none may conceal another.
    var kpiWarnings = function(b) {
      var out = '';
      if (b.baseWeighting > 0) {
        out += '<div class="hiring-plan-kpi__hint"><span class="flag">⚠ ' + b.baseWeighting + ' paying FTE role' + (b.baseWeighting > 1 ? 's' : '') + ' at base salary, weighting % not set</span></div>';
      }
      if (b.baseEngagement > 0) {
        out += '<div class="hiring-plan-kpi__hint"><span class="flag">⚠ ' + b.baseEngagement + ' paying role' + (b.baseEngagement > 1 ? 's' : '') + ' at base salary, engagement type not recorded</span></div>';
      }
      if (b.uncosted > 0) {
        out += '<div class="hiring-plan-kpi__hint"><span class="flag">⚠ excludes ' + b.uncosted + ' paying role' + (b.uncosted > 1 ? 's' : '') + ' missing cost information</span></div>';
      }
      return out;
    };
    var kpiFooter = function(b, suffix) {
      var bits = [b.paid + ' filled role' + (b.paid !== 1 ? 's' : '') + ' being paid now'];
      if (b.later > 0) bits.push(b.later + ' starting later');
      if (b.undated > 0) bits.push(b.undated + ' with no start date');
      if (suffix) bits.push(suffix);
      return '<div class="hiring-plan-kpi__hint">' + bits.join(' · ') + '</div>';
    };

    html += '<div class="hiring-plan-kpi hiring-plan-kpi--cost">';
    html += '<div class="hiring-plan-kpi__label">Approved monthly (being paid now)</div>';
    html += '<div class="hiring-plan-kpi__value">' + fmtP(kpiApproved.paidPence) + '</div>';
    html += kpiFooter(kpiApproved);
    html += kpiWarnings(kpiApproved);
    html += '</div>';

    html += '<div class="hiring-plan-kpi hiring-plan-kpi--cost">';
    html += '<div class="hiring-plan-kpi__label">Combined monthly (being paid now)</div>';
    html += '<div class="hiring-plan-kpi__value">' + fmtP(kpiCombined.paidPence) + '</div>';
    html += kpiFooter(kpiCombined, 'unfilled roles cost £0 until hired');
    html += kpiWarnings(kpiCombined);
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

// -------------------- What the totals actually cover --------------------

// EXACT to the penny, two decimals. The Weighted/mo column prints two decimals
// per role, so a total rounded to whole pounds does not add up to the column
// above it: two rows of £1,000.49 sum to £2,000.98 but printed £2,001. On a
// screen built specifically so a reader can reconcile rows against totals,
// that is the one rounding they will check (Codex P1, 2026-07-25).
function _hpPence(pence) {
  var v = (Number(pence) || 0) / 100;
  return '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Current calendar month as the engine's 'YYYY-MM' key, for deciding whether a
// filled role's cost has actually started yet. The server's as_of_month
// (Europe/London) is authoritative: around a month boundary a viewer in
// another timezone would otherwise bucket "being paid now" differently from
// a UK viewer (Codex P2, 2026-07-26). The browser clock is only a fallback
// for the moment before the costs payload has arrived.
function _hpCurrentMonthKey() {
  if (_hiringPlanCosts && typeof _hiringPlanCosts.as_of_month === 'string') {
    return _hiringPlanCosts.as_of_month;
  }
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// Mirrors FTE_TYPES in lib/hiring-costs.js, as HP_DAY_RATE_TYPES mirrors
// UNWEIGHTED_TYPES. Kept beside it so the two sets are read together.
var HP_FTE_TYPES = { fte: 1, permanent: 1 };

// Why a role shows base salary instead of a fully weighted figure. The engine
// separates these two causes on purpose (diagnoseCostInputs: an FTE missing the
// client's blanket % vs a role whose engagement type was never recorded) because
// they have DIFFERENT fixes -- one is in Settings, the other is on the role. A
// caption that says "FTE weighting % is not set" over a role that is not marked
// as an FTE sends the reader to the wrong screen to fix it.
function _hpBaseOnlyReason(r) {
  var t = r && typeof r.employment_type === 'string' ? r.employment_type.trim().toLowerCase() : '';
  return HP_FTE_TYPES[t]
    ? 'the FTE weighting % is not set'
    : 'this role has no engagement type recorded, so its employer on-costs cannot be worked out';
}

// The cost engine costs an UNFILLED role at zero in every month of the horizon
// (lib/hiring-costs.js: "unfilled roles contribute zero until someone is
// actually hired", Glen 2026-07-24). That is correct -- nobody is being paid --
// but it means a reader can add the Weighted/mo column up by eye and land
// nowhere near the total printed underneath it, and on a plan where most roles
// are still open that difference IS the plan. Denied and shut-down roles are
// out of every bucket entirely, and a filled role with incomplete inputs is
// skipped cell by cell. None of this was stated anywhere on the page.
//
// Pass roleIds to restrict the count to the rows currently on screen, so a
// filtered table is never described using money drawn from rows it is hiding.
// A filled role is NOT necessarily being paid yet. The engine anchors a hired
// role's first charge to the month AFTER its start date, so a role filled with
// a September start contributes nothing in July. Lumping those into a figure
// labelled "being paid now" states a present-tense fact that is false, which is
// worse than the omission it was meant to cure (Codex P1, 2026-07-25). Filled
// roles are therefore split three ways: cost already started, cost starts
// later, and no start date recorded at all (which the engine treats as
// incomplete and cannot place in time).
function _hpTotalsCoverage(roleIds) {
  var cov = {
    started: 0, startedPence: 0,
    startingLater: 0, startingLaterPence: 0,
    noStart: 0, noStartPence: 0,
    planned: 0, plannedPence: 0,
    startedUncosted: 0, startingLaterUncosted: 0, noStartUncosted: 0, plannedUncosted: 0,
    denied: 0, incomplete: 0,
    // Base-only rows split by CAUSE, because the two causes have different
    // fixes and a count that merges them cannot name either.
    baseOnlyWeighting: 0, baseOnlyEngagement: 0,
  };
  if (!_hiringPlanCosts || !Array.isArray(_hiringPlanCosts.rows)) return cov;

  var only = null;
  if (roleIds) {
    only = {};
    roleIds.forEach(function(id) { only[id] = true; });
  }
  var roleById = {};
  (_hiringPlanData.roles || []).forEach(function(r) { roleById[r.id] = r; });
  var nowKey = _hpCurrentMonthKey();

  _hiringPlanCosts.rows.forEach(function(cr) {
    if (only && !only[cr.role_id]) return;
    // Denied and shut-down roles carry no cost by definition; counting their
    // recorded salary as "would cost once filled" would invite someone to add
    // back money the business has already decided not to spend.
    if (cr.excluded) { cov.denied++; return; }

    var g;
    if (cr.state !== 'hired') g = 'planned';
    else if (!cr.start_month) g = 'noStart';
    else g = cr.start_month <= nowKey ? 'started' : 'startingLater';
    cov[g]++;

    // Same fallback ladder as the KPI strip: loaded, then base salary marked
    // as such, never a silent zero while a salary is on record.
    var p = cr.monthly_loaded_gbp_pence;
    if (p === null || p === undefined) {
      p = cr.monthly_base_gbp_pence;
      if (p === null || p === undefined) { cov[g + 'Uncosted']++; p = 0; }
      else {
        var src = roleById[cr.role_id];
        var t = src && typeof src.employment_type === 'string' ? src.employment_type.trim().toLowerCase() : '';
        if (HP_FTE_TYPES[t]) cov.baseOnlyWeighting++; else cov.baseOnlyEngagement++;
      }
    }
    cov[g + 'Pence'] += Number(p) || 0;
  });

  (_hiringPlanCosts.incompleteRoleIds || []).forEach(function(id) {
    if (only && !only[id]) return;
    cov.incomplete++;
  });
  return cov;
}

// Plain-English disclosure of what sits OUTSIDE the totals. Returns '' when
// nothing is excluded, so a plan with every role filled and costed carries no
// notice at all rather than a reassuring sentence nobody needs to read.
function _hpCoverageSentences(cov) {
  var out = [];

  // The earlier wording said unfilled roles "add nothing to the totals above"
  // while their money sat in two of those very totals. What they add nothing to
  // is the CURRENT cost, and that is what this now says (Codex P1).
  if (cov.planned > 0) {
    var isOne = cov.planned === 1;
    var s = '<strong>' + cov.planned + ' role' + (isOne ? ' is' : 's are') + ' not filled yet</strong>, so '
      + (isOne ? 'it adds' : 'they add') + ' nothing to what is being paid today. '
      + (isOne ? 'Its ' : 'Their ') + _hpPence(cov.plannedPence)
      + '/mo counts only towards the run-rate once filled';
    if (cov.plannedUncosted > 0) {
      s += ', and that figure leaves out ' + cov.plannedUncosted + ' of them with no cost information on record';
    }
    out.push(s + '.');
  }

  // Filled but not yet charging. Without this the reader cannot tell why the
  // "being paid now" figure is lower than the filled headcount implies.
  if (cov.startingLater > 0) {
    var l1 = cov.startingLater === 1;
    out.push('<strong>' + cov.startingLater + ' filled role' + (l1 ? '' : 's')
      + ' ' + (l1 ? 'has' : 'have') + ' not started being paid yet</strong> ('
      + _hpPence(cov.startingLaterPence) + '/mo). Cost begins the month after the start date.');
  }

  if (cov.noStart > 0) {
    var n1 = cov.noStart === 1;
    out.push(cov.noStart + ' filled role' + (n1 ? ' has' : 's have')
      + ' no start date recorded, so it is not known when ' + (n1 ? 'its' : 'their') + ' cost begins. '
      + _hpPence(cov.noStartPence) + '/mo is counted in the full run-rate only.');
  }

  if (cov.startedUncosted > 0) {
    out.push(cov.startedUncosted + ' role' + (cov.startedUncosted === 1 ? ' that is' : 's that are')
      + ' already being paid ' + (cov.startedUncosted === 1 ? 'has' : 'have')
      + ' no cost information on record, so ' + (cov.startedUncosted === 1 ? 'it is' : 'they are')
      + ' missing from every figure here.');
  }

  // Base-only rows, split by cause. The fix for one is in Settings and the fix
  // for the other is on the role itself, so a single merged count would send
  // half the reader's effort to the wrong screen.
  if (cov.baseOnlyWeighting > 0) {
    out.push(cov.baseOnlyWeighting + ' role' + (cov.baseOnlyWeighting === 1 ? ' is' : 's are')
      + ' counted at base salary because the FTE weighting % is not set for this client.');
  }
  if (cov.baseOnlyEngagement > 0) {
    out.push(cov.baseOnlyEngagement + ' role' + (cov.baseOnlyEngagement === 1 ? ' is' : 's are')
      + ' counted at base salary because no engagement type is recorded on '
      + (cov.baseOnlyEngagement === 1 ? 'it' : 'them') + ', so employer on-costs cannot be worked out.');
  }

  if (cov.denied > 0) {
    out.push(cov.denied + ' denied or shut-down role' + (cov.denied === 1 ? ' is' : 's are')
      + ' excluded entirely and carr' + (cov.denied === 1 ? 'ies' : 'y') + ' no cost.');
  }

  // Filled roles that are not yet charging, or have no start date, and also
  // carry no cost information: their money is missing from the run-rate too.
  var otherUncosted = cov.startingLaterUncosted + cov.noStartUncosted;
  if (otherUncosted > 0) {
    out.push(otherUncosted + ' filled role' + (otherUncosted === 1 ? '' : 's')
      + ' not yet being paid also ' + (otherUncosted === 1 ? 'has' : 'have')
      + ' no cost information on record and ' + (otherUncosted === 1 ? 'is' : 'are')
      + ' missing from the run-rate.');
  }

  return out;
}

function _hpCoverageNotice(cov) {
  var sentences = _hpCoverageSentences(cov);
  if (sentences.length === 0) return '';
  return '<div class="hiring-plan-coverage-notice">' + sentences.join(' ') + '</div>';
}

// -------------------- Plan table: sorting --------------------

// Money columns are displayed in the currency each role is paid in, so sorting
// them on the raw number ranks EUR 400 above GBP 390 when it is worth less.
// Convert to GBP for comparison only, mirroring lib/hiring-costs.js exactly:
// GBP is a fixed rate of 1 and any stored rate on a GBP role is legacy noise,
// every other currency requires its stored rate, and a missing rate cannot be
// ranked so it sorts with the other unknowns rather than at its face value.
function _hpSortableGbp(r, rate) {
  var v = _budgetInRate(r, rate);
  if (v === null) return -1;
  var ccy = typeof r.compensation_currency === 'string' ? r.compensation_currency.trim().toUpperCase() : '';
  if (ccy === 'GBP') return v;
  if (!ccy) return -1;
  var fx = Number(r.fx_rate_to_gbp);
  if (!isFinite(fx) || fx <= 0) return -1;
  return v * fx;
}

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
  // Advertised ranges are displayed in each role's own currency, so they must
  // be normalised to GBP for ranking exactly as Budget and Day rate are. Left
  // raw, a EUR 400,000 range outranked a GBP 390,000 one while being worth
  // less, which is the same defect already fixed on the other money columns
  // (Codex P2, 2026-07-25).
  advertised: function(r) {
    var v = r.compensation_min != null ? Number(r.compensation_min)
      : (r.compensation_max != null ? Number(r.compensation_max) : null);
    if (v === null || !isFinite(v)) return -1;
    var ccy = typeof r.compensation_currency === 'string' ? r.compensation_currency.trim().toUpperCase() : '';
    if (ccy === 'GBP') return v;
    if (!ccy) return -1;
    var fx = Number(r.fx_rate_to_gbp);
    if (!isFinite(fx) || fx <= 0) return -1;
    return v * fx;
  },
  day_rate: function(r) { return _hpSortableGbp(r, 'daily'); },
  budget: function(r) { return _hpSortableGbp(r, 'annual'); },
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
  html += '<h3 style="margin:0 0 6px">Deny: ' + esc(r.title || '') + '</h3>';
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

// Filter, search, rate and action controls. Shared verbatim by the Plan table
// and the Finance table: two copies of this would drift, and a filter that
// selects different roles depending on which view you are looking at is a
// worse defect than any amount of duplication saved. Both write the same
// window._hiringPlanFilters, so a filter set on one view holds on the other.
function _hpTableControls(caps, rate) {
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
  return html;
}

function renderHiringPlanTableView(container) {
  var caps = _hiringPlanData.capabilities || {};
  var roles = _sortPlanRoles(_planFilterRoles(_hiringPlanData.roles || []));
  var rate = window._hiringPlanRate || 'annual';

  var html = _hpTableControls(caps, rate);

  // Advertised range column only appears when the user may see salary ranges
  // AND at least one role carries one — an all-dash column is noise.
  var showAdvertised = caps.view_salary_range &&
    (_hiringPlanData.roles || []).some(function(r) { return r.compensation_min != null || r.compensation_max != null; });

  // Same established rule applied to Hiring manager. On a plan where nobody has
  // been assigned one -- which is every Couch Heroes row today -- it renders as
  // a column of dashes roughly 155px wide, and those 155px are the reason the
  // financial columns sit off the right-hand edge. An all-dash column is noise;
  // a column of money the reader cannot see is worse.
  var showManager = (_hiringPlanData.roles || []).some(function(r) { return !!_hpUserName(r.hiring_manager_user_id); });

  // Table — column order follows the approved mockup: operational fields,
  // pipeline, then financial columns at the right. Day rate sits directly
  // in front of the monthly loaded column (Glen 2026-07-23).
  html += '<div class="hiring-plan-table-wrap"><table class="hiring-plan-table">';
  html += '<thead><tr>';
  html += _sortableTh('title', 'Role');
  html += _sortableTh('priority', 'Priority');
  html += _sortableTh('start', 'Start');
  // "Type" renders requirement_type (New / Backfill) but sat two columns from
  // Engagement (FTE / Contractor / PSC), so it read as a duplicate of it. The
  // role sidebar has always called this field "Requirement"; the header now
  // agrees with it.
  html += _sortableTh('type', 'Requirement');
  html += _sortableTh('approval', 'Approval');
  if (showManager) html += _sortableTh('manager', 'Hiring manager');
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

  // Nine mandatory columns (Role, Priority, Start, Requirement, Approval, Days
  // open, Recruiting, Engagement, Pipeline) plus Hiring manager only when it is
  // rendered. The flat 10 predated Hiring manager learning to hide itself, so
  // the empty-state row spanned one column too many whenever it was suppressed
  // (Codex P3, 2026-07-25).
  var colSpan = 9 + (showManager ? 1 : 0) + (showAdvertised ? 1 : 0) + (caps.view_financials ? 3 : 0);
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

    // Hiring manager, only when at least one role has one (see showManager).
    if (showManager) html += '<td>' + (esc(_hpUserName(r.hiring_manager_user_id)) || '—') + '</td>';

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
      var budgetCell = _fmtBudget(r, rate) || _hpBudgetRefusal(r, rate);
      html += '<td class="hiring-plan-money">' + budgetCell + '</td>';
      var dayCell = _fmtBudget(r, 'daily');
      // The hover carries a basis when there is a rate, and an explanation of
      // why the cell is empty when the role simply has no day rate. It stays
      // silent only for a contractor whose data is incomplete, where any
      // statement of basis would describe arithmetic that never ran.
      var dayTitle = (dayCell || !_hpHasDayRate(r)) ? _hpWorkdaysTitle(r) : '';
      html += '<td class="hiring-plan-money"'
        + (dayTitle ? ' title="' + dayTitle + '" aria-label="' + dayTitle + '"' : '')
        + '>' + (dayCell || '—') + '</td>';
      var costRow = _hiringPlanCosts ? (_hiringPlanCosts.rows || []).find(function(cr) { return cr.role_id === r.id; }) : null;
      // Loaded when on-cost is set; otherwise the real base figure marked
      // amber, never a dash while the salary is on record.
      var loadedCell = '—';
      if (costRow && costRow.monthly_loaded_gbp) loadedCell = costRow.monthly_loaded_gbp;
      else if (costRow && costRow.monthly_base_gbp) loadedCell = '<span style="color:#f59e0b" title="Base salary only: ' + _hpBaseOnlyReason(r) + '">' + costRow.monthly_base_gbp + '</span>';
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
      html += '<span style="color:#f59e0b" title="Includes FTE roles at base salary, weighting % not set">Combined horizon total: ' + horizonMixed + ' (part base salary)</span>';
    } else {
      html += '<span>Combined horizon total: ' + (combinedTotals.horizon_loaded_gbp || '') + '</span>';
    }
  }
  html += '</div>';

  container.innerHTML = html;
}

// -------------------- Roles card view --------------------

var _PRIO_LABELS = { 0: 'P0 · Critical', 1: 'P1 · High', 2: 'P2 · Medium', 3: 'P3 · Low', 4: 'P4 · Wishlist' };

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

  if (caps.view_financials) {
    // The table has two fallback states for a budget it cannot show and the
    // card had none, so a card silently dropped the Budget row entirely and a
    // role with missing data looked identical to one nobody had costed. Same
    // three states as the table, same wording.
    var cardBudget = _fmtBudget(r) || _hpBudgetRefusal(r, r.compensation_basis);
    html += '<div class="hiring-plan-card__row"><span class="k">Budget</span><span class="v">' + cardBudget + '</span></div>';
  } else if (caps.view_salary_range && (r.compensation_min != null || r.compensation_max != null)) {
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

// -------------------- Finance view --------------------

// Every financial figure for every role, on one screen, with no horizontal
// scroll. The Plan table carries ten operational columns in front of the money,
// which put Budget, Day rate and Weighted/mo ~364px off the right-hand edge of
// a 1600px viewport; pinning the Role column stopped the label scrolling away
// but did nothing about the money being invisible. This view keeps only the
// columns needed to READ a number or to QUALIFY it, and states underneath
// exactly which roles its totals do and do not cover (Glen 2026-07-25).
function renderHiringPlanFinanceView(container) {
  var caps = _hiringPlanData.capabilities || {};
  if (!caps.view_financials) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">Financial access required to view costs</div>';
    return;
  }
  if (!_hiringPlanCosts) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px">Loading cost data…</div>';
    loadHiringPlanCosts().then(function() { if (window._hiringActiveTab === 'plan' && window._hiringPlanView === 'finance') renderContent(); });
    return;
  }

  var allRoles = _hiringPlanData.roles || [];
  var roles = _sortPlanRoles(_planFilterRoles(allRoles));
  var rate = window._hiringPlanRate || 'annual';

  var costByRole = {};
  (_hiringPlanCosts.rows || []).forEach(function(cr) { costByRole[cr.role_id] = cr; });

  var html = _hpTableControls(caps, rate);

  // Same established rule as the Plan table: a column of dashes is noise.
  var showAdvertised = caps.view_salary_range &&
    roles.some(function(r) { return r.compensation_min != null || r.compensation_max != null; });

  html += '<div class="hiring-plan-table-wrap"><table class="hiring-plan-table hiring-plan-finance-table">';
  html += '<thead><tr>';
  html += _sortableTh('title', 'Role');
  html += _sortableTh('engagement', 'Engagement');
  html += _sortableTh('approval', 'Approval');
  html += _sortableTh('recruiting', 'Recruiting');
  html += '<th title="The month this role first costs money. For a filled role that is the month after the start date, the first payday, not the first day on the job.">Cost starts</th>';
  if (showAdvertised) html += _sortableTh('advertised', 'Advertised range', 'right');
  html += _sortableTh('budget', 'Budget', 'right');
  html += _sortableTh('day_rate', 'Day rate', 'right');
  html += '<th style="text-align:right" title="Base salary plus employer on-costs, per month. Contractors carry no on-cost.">Weighted/mo</th>';
  html += '</tr></thead><tbody>';

  var colSpan = 8 + (showAdvertised ? 1 : 0);
  if (roles.length === 0) {
    html += '<tr><td colspan="' + colSpan + '" style="text-align:center;color:var(--text-muted);padding:32px">No roles match the current filters</td></tr>';
  }

  roles.forEach(function(r) {
    var cr = costByRole[r.id];
    html += '<tr class="hiring-plan-row" data-position-id="' + r.id + '" tabindex="0" onclick="openPositionDetail(\'' + r.id + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openPositionDetail(\'' + r.id + '\')}">';

    html += '<td class="hiring-plan-role-cell"><div class="hiring-plan-title">' + esc(r.title || '') + '</div><div class="hiring-plan-dept">' + esc(r.department_name || '') + '</div></td>';
    html += '<td>' + _engagementBadge(r.employment_type) + '</td>';
    html += '<td>' + _approvalBadge(r.approval_status) + '</td>';
    html += '<td>' + _recruitingCell(r) + '</td>';

    // Cost start comes from the engine's own row, so this column cannot
    // disagree with the month the matrix starts charging. Crucially it must
    // only state a date where the engine will ACTUALLY charge one: an unfilled
    // role costs zero however near its target month is, and a denied role never
    // costs anything, so printing a date against either is a claim the engine
    // does not honour (Codex P2, 2026-07-25).
    var startCell, startTitle = '';
    if (cr && cr.excluded) {
      startCell = '<span class="hiring-plan-nosalary">excluded</span>';
      startTitle = 'Denied or shut down. This role never begins costing.';
    } else if (!cr || cr.state !== 'hired') {
      startCell = '<span class="hiring-plan-nosalary">not until filled</span>';
      startTitle = 'Target start ' + (_fmtStartMonth(r.target_start_month) || 'not set')
        + '. Cost begins only once someone is in post, not on the target month.';
    } else if (cr.start_month) {
      startCell = _fmtStartMonth(cr.start_month) || '—';
      startTitle = 'First month this role is charged: the month after the recorded start date.';
    } else {
      startCell = '<span class="hiring-plan-nosalary">no start date</span>';
      startTitle = 'Filled, but no start date is recorded, so it is not known when the cost begins.';
    }
    html += '<td' + (startTitle ? ' title="' + startTitle + '"' : '') + '>' + startCell + '</td>';

    if (showAdvertised) html += '<td class="hiring-plan-num">' + _fmtAdvertised(r) + '</td>';

    // Budget, refusing through the SAME ladder the Plan table uses. Two views
    // describing one missing datum differently is the defect this workstream
    // keeps catching, so they share the function rather than the wording.
    html += '<td class="hiring-plan-money">' + (_fmtBudget(r, rate) || _hpBudgetRefusal(r, rate)) + '</td>';

    var dayCell = _fmtBudget(r, 'daily');
    var dayTitle = (dayCell || !_hpHasDayRate(r)) ? _hpWorkdaysTitle(r) : '';
    html += '<td class="hiring-plan-money"'
      + (dayTitle ? ' title="' + dayTitle + '" aria-label="' + dayTitle + '"' : '')
      + '>' + (dayCell || '—') + '</td>';

    // Weighted/mo. An unfilled role's figure is real but is NOT being spent,
    // and the totals underneath exclude it. Printing it in the same weight as
    // money actually leaving the bank is how a reader sums the column and
    // disagrees with the total. Unfilled figures are muted and say why.
    var weightedCell = '—';
    var weightedAttrs = '';
    if (cr && cr.excluded) {
      weightedAttrs = ' title="Denied or shut down. This role carries no cost."';
    } else if (cr) {
      var money = null, baseOnly = false;
      if (cr.monthly_loaded_gbp) money = cr.monthly_loaded_gbp;
      else if (cr.monthly_base_gbp) { money = cr.monthly_base_gbp; baseOnly = true; }
      if (money) {
        var baseNote = baseOnly ? ' Base salary only: ' + _hpBaseOnlyReason(r) + '.' : '';
        // Charging means the engine is billing this role THIS month. A filled
        // role with a future start is not, and must not be printed at the same
        // weight as money actually leaving the bank.
        var charging = cr.state === 'hired' && cr.start_month && cr.start_month <= _hpCurrentMonthKey();
        if (charging) {
          weightedCell = baseOnly
            ? '<span style="color:#f59e0b" title="Base salary only: ' + _hpBaseOnlyReason(r) + '">' + money + '</span>'
            : money;
        } else if (cr.state === 'hired') {
          weightedCell = '<span class="hiring-plan-unfilled">' + money + '</span>';
          weightedAttrs = ' title="Filled, but not being charged yet'
            + (cr.start_month ? ': cost begins ' + _fmtStartMonth(cr.start_month) : ': no start date is recorded')
            + '. Counted in the run-rate, not in what is being paid now.' + baseNote + '"';
        } else {
          weightedCell = '<span class="hiring-plan-unfilled">' + money + '</span>';
          weightedAttrs = ' title="Not filled, so nothing is being paid. Counted in the run-rate once filled, '
            + 'not in what is being paid now.' + baseNote + '"';
        }
      }
    }
    html += '<td class="hiring-plan-money"' + weightedAttrs + '>' + weightedCell + '</td>';

    html += '</tr>';
  });

  // Totals, built from the same per-role figures printed above so that adding
  // the column by eye reaches the bottom line rather than contradicting it.
  var cov = _hpTotalsCoverage(roles.map(function(r) { return r.id; }));
  var moneyColSpan = showAdvertised ? 4 : 3;
  var labelColSpan = colSpan - moneyColSpan;
  var totalRow = function(label, hint, pence, cls) {
    html += '<tr class="hiring-plan-total-row ' + cls + '">';
    html += '<td colspan="' + labelColSpan + '"><strong>' + label + '</strong>'
      + (hint ? ' <span class="hiring-plan-total-hint">' + hint + '</span>' : '') + '</td>';
    html += '<td colspan="' + (moneyColSpan - 1) + '"></td>';
    html += '<td class="hiring-plan-money"><strong>' + _hpPence(pence) + '/mo</strong></td>';
    html += '</tr>';
  };
  // Each row states what it actually is. "Being paid now" counts only roles the
  // engine is already charging: a role filled with a September start is not
  // being paid in July, and saying otherwise is a false present-tense claim
  // about money. The rows that are NOT current spend are labelled as run-rate
  // so no line contradicts the figure printed beside it (Codex P1, both).
  if (roles.length > 0) {
    totalRow('Being paid now',
      cov.started + ' role' + (cov.started === 1 ? '' : 's') + ' filled and already charging',
      cov.startedPence, 'approved');
    if (cov.startingLater > 0) {
      totalRow('Filled, not charging yet',
        cov.startingLater + ' role' + (cov.startingLater === 1 ? '' : 's') + ', cost begins the month after the start date',
        cov.startingLaterPence, 'pending');
    }
    if (cov.noStart > 0) {
      totalRow('Filled, start date not recorded',
        cov.noStart + ' role' + (cov.noStart === 1 ? '' : 's') + ', cannot be placed in time',
        cov.noStartPence, 'pending');
    }
    if (cov.planned > 0) {
      totalRow('Unfilled, run-rate once filled',
        cov.planned + ' role' + (cov.planned === 1 ? '' : 's') + ' not filled yet',
        cov.plannedPence, 'pending');
    }
    if (cov.startingLater > 0 || cov.noStart > 0 || cov.planned > 0) {
      totalRow('Full run-rate once everyone is in post', '',
        cov.startedPence + cov.startingLaterPence + cov.noStartPence + cov.plannedPence, 'combined');
    }
  }

  html += '</tbody></table></div>';

  if (roles.length > 0) {
    html += _hpCoverageNotice(cov);
    // A filtered table must never present its totals as the whole plan.
    if (roles.length !== allRoles.length) {
      html += '<div class="hiring-plan-coverage-notice">These totals cover the ' + roles.length
        + ' role' + (roles.length === 1 ? '' : 's') + ' matching the current filters, not all '
        + allRoles.length + ' roles in the plan.</div>';
    }
  }

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
      + 'Contractors are never weighted: their cost is simply what they are paid.';
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
    var startTitle = row.actual_start_date ? 'Recorded start date' : 'Planning target month, no start date recorded';
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
          html += '<td class="hiring-plan-cell hiring-plan-cell--baseonly" style="color:#f59e0b" title="Base salary only: ' + _hpBaseOnlyReason(role) + '">' + fmtPence(baseCells[i]) + '</td>';
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
      html += '<td class="hiring-plan-cell hiring-plan-horizon-cell" style="color:#f59e0b" title="Includes months at base salary only: ' + _hpBaseOnlyReason(role) + '"><strong>' + fmtPence(horizonSum) + '</strong></td>';
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
    if (excludesMissing) caveats.push('excludes roles whose base salary cannot be calculated, see the flagged rows for what each is missing');
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
        html += '<td class="hiring-plan-cell" style="color:#f59e0b" title="Includes FTE roles at base salary, weighting % not set"><strong>' + fmtPence(cellVal) + '</strong></td>';
      } else {
        html += '<td class="hiring-plan-cell"><strong>' + fmtPence(cellVal) + '</strong></td>';
      }
    });
    html += '<td class="hiring-plan-cell hiring-plan-horizon-cell"' + (totalUsedBase ? ' style="color:#f59e0b" title="Includes FTE roles at base salary, weighting % not set"' : '') + '><strong>' + fmtPence(totalSum) + '</strong></td>';
    html += '</tr>';
  };
  if (totals.approved) renderTotalRow('Approved', totals.approved, 'approved', _bucketMissesRoles(['approved']));
  if (totals.pending) renderTotalRow('Total Pending', totals.pending, 'pending', _bucketMissesRoles(['pending']));
  if (totals.combined) renderTotalRow('Combined Total', totals.combined, 'combined', _bucketMissesRoles(['approved', 'pending']));

  html += '</tbody></table></div>';

  var incIds = _hiringPlanCosts.incompleteRoleIds || [];
  if (incIds.length > 0) {
    var noticeParts = ['⚠ ' + incIds.length + ' role' + (incIds.length > 1 ? 's are' : ' is') + ' missing cost information.'];
    if (showLoaded && _hpFteUnweighted > 0) noticeParts.push('Amber figures are base salary only. Set the FTE weighting % in Settings to see the fully weighted cost.');
    if (anyBaseNull) noticeParts.push('Roles whose base salary cannot be calculated are left out of the totals. Each flagged row says what it is missing.');
    html += '<div class="hiring-plan-incomplete-notice">' + noticeParts.join(' ') + '</div>';
  }

  // Every unfilled role contributes zero to every month of this matrix, so a
  // client whose plan is mostly open roles sees a Total Pending row of zeros
  // with nothing on the page explaining why. Self-suppresses when there is
  // nothing outside the totals. Unfiltered: the matrix shows all roles.
  html += _hpCoverageNotice(_hpTotalsCoverage());

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
    + 'This percentage is added to every <strong>FTE</strong> salary to give the fully weighted cost: one blanket figure for all FTE roles at this client. '
    + 'Contractors are never weighted: their cost is simply what they are paid.'
    + '</div>';
  // Redaction check: GET strips the pct field for configure-capable users
  // without financial access. For them a blank input must mean "keep the
  // hidden value", never "clear it" — otherwise saving wipes a default they
  // cannot see (Codex P1, round 4). window._hsPctReadable drives save logic.
  var pctReadable = ('fte_on_cost_pct' in s);
  window._hsPctReadable = pctReadable;
  // The existence of a settings row is NOT the same fact as the FTE weighting
  // being set, and since a client can now create its row by saving contractor
  // working days alone, keying this notice on row existence would silence a
  // warning about a percentage that is still unset. Gate on the value itself,
  // falling back to row existence only when the value is redacted from us.
  var fteUnset = pctReadable
    ? (s.fte_on_cost_pct === null || s.fte_on_cost_pct === undefined)
    : s.configured === false;
  if (fteUnset) {
    html += '<div style="color:#b45309;font-size:14px;margin-bottom:8px">⚠ Not set for this client yet. FTE roles show base salary only until it is.</div>';
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

  html += '<fieldset style="border:1px solid var(--border-default);border-radius:6px;padding:12px"><legend>Contractor Working Days per Month</legend>';
  var wdVal = s.contractor_workdays_per_month;
  var wdSet = wdVal !== null && wdVal !== undefined && wdVal !== '';
  var wdEff = wdSet ? Number(wdVal) : HP_STANDARD_WORKDAYS;
  html += '<div style="font-size:14px;color:var(--text-muted);margin-bottom:10px;line-height:1.5">'
    + 'A day rate is a contractor term. Staff are paid an annual salary, so no day rate is shown against them and this setting does not touch their figures. '
    + 'It is used to turn a contract paid by the year or the month into a day rate: <strong>annual ÷ 12 ÷ billable days per month</strong>. '
    + 'Set it to match how this client contracts, so the day rates here agree with their own model. '
    + 'Leave it blank to use the standard 18 days (260 working days a year less 36 vacation and 8 sick = 216 billable, ÷ 12).'
    + '</div>';
  html += '<label style="display:block;max-width:260px">Contractor working days per month<input id="hsWorkdays" type="number" step="0.5" min="0.5" max="31" value="' + (wdSet ? tidyNum(wdVal) : '') + '" placeholder="not set, using 18" style="width:100%"></label>';
  html += '<div style="font-size:14px;color:var(--text-muted);margin-top:10px;line-height:1.5">'
    + 'Currently ' + (wdSet ? '<strong>' + wdEff + ' days</strong>, set for this client' : 'the standard <strong>18 days</strong>. Not set for this client')
    + '. A contract worth £60,000 a year shows as <strong>£' + Math.round(60000 / 12 / wdEff).toLocaleString('en-GB') + '/day</strong> at this setting.'
    + '</div>';
  html += '<div style="font-size:14px;color:var(--text-muted);margin-top:8px;line-height:1.5">'
    + 'This changes the day rate <strong>shown on screen</strong> for contracts paid by the year or the month. It does not change any cost total. It also does not fill in a missing figure on a contract already paid by the day: those roles stay flagged as incomplete until someone records working days per month on that role, which is a separate field and does feed the totals.'
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

  // Contractor working days is handled separately from the percentage loop on
  // purpose. It must NOT count towards anyValue: that flag guards first-time
  // setup, and saving a working-days figure alone must not be mistaken for
  // having configured the client's on-costs. Zero is rejected rather than
  // stored -- it is a divisor, so a zero would be a divide by zero, not a valid
  // choice.
  //
  // A blank field is only sent as an explicit null when the client actually has
  // a value to clear. Assigning null unconditionally put a key in the body on
  // every save, so "No changes to save" was unreachable and every press fired a
  // PATCH.
  var wdEl = document.getElementById('hsWorkdays');
  if (wdEl) {
    var wdRaw = wdEl.value.trim();
    var wdStored = (_hiringPlanSettings || {}).contractor_workdays_per_month;
    var wdWasSet = wdStored !== null && wdStored !== undefined && wdStored !== '';
    if (wdRaw === '') {
      if (wdWasSet) body.contractor_workdays_per_month = null;
    } else if (isFinite(Number(wdRaw)) && Number(wdRaw) >= 0.5 && Number(wdRaw) <= 31) {
      if (!wdWasSet || Number(wdStored) !== Number(wdRaw)) {
        body.contractor_workdays_per_month = Number(wdRaw);
      }
    } else {
      showToast('Contractor working days per month must be a number between 0.5 and 31', 'error');
      return;
    }
  }

  // The first-time-setup guard must not block a client who has no FTEs. A
  // contractor-only client -- which is the entire population the working-days
  // figure exists for -- was forced to invent an FTE weighting percentage it
  // does not use before it could save its own contracting basis, and a
  // fabricated setting is exactly what this guard was meant to prevent. The
  // guard still fires when nothing meaningful was entered, and working days
  // still does not count towards anyValue, so saving one is never mistaken for
  // having configured on-costs (Codex P2, 2026-07-25).
  if (!anyValue && body.contractor_workdays_per_month === undefined
      && (_hiringPlanSettings || {}).configured === false) {
    showToast('Enter the FTE weighting percentage, or contractor working days, before saving', 'error');
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
    // Same refusal ladder as Plan, Finance and the Roles card — a role with a
    // real amount but no basis or currency must name that cause here too, not
    // claim there is no salary on record (Codex P2, 2026-07-26).
    html += _hpKv('Exact budget', _fmtBudget(p) || _hpBudgetRefusal(p, p.compensation_basis));
    // A role with no day rate gets the reason, not a bare dash: a dash here
    // reads as missing data on a row whose data is complete.
    var dayRate = _fmtBudget(p, 'daily');
    var dayCaption = function(text) {
      return '<div style="color:var(--text-secondary);font-size:14px;font-weight:400;margin-top:4px;line-height:1.4">' + text + '</div>';
    };
    if (dayRate) {
      html += _hpKv('Day rate', dayRate + dayCaption(_hpWorkdaysBasisText(p)));
    } else if (!_hpHasDayRate(p)) {
      html += _hpKv('Day rate', '—' + dayCaption(_hpWorkdaysBasisText(p)));
    } else {
      html += _hpKv('Day rate', '—');
    }
    // A missing currency must not default to GBP here: "Exact budget" two
    // rows up refuses the figure with "no currency recorded", and an FX line
    // confidently stating "1 (GBP)" beside that refusal re-invents the very
    // assumption it refused (Codex P2, 2026-07-26 round 3).
    var sbCcy = typeof p.compensation_currency === 'string' ? p.compensation_currency.trim() : '';
    html += _hpKv('FX to GBP', p.fx_rate_to_gbp != null ? esc(String(p.fx_rate_to_gbp)) : (sbCcy === 'GBP' ? '1 (GBP)' : '—'));
    html += _hpKv('FX source', esc(p.fx_rate_source_note || '') || '—');
    html += _hpKv('FTE weighting', _hpHasDayRate(p) ? 'n/a, contractors are not weighted' : (onCost != null ? '+' + onCost + '%' : 'not set for this client'));
    html += _hpKv('Monthly base salary GBP', costRow && costRow.monthly_base_gbp ? costRow.monthly_base_gbp : '—');
    // Same cause split as everywhere else: an FTE missing the blanket % is
    // fixed in Settings, a role with no engagement type is fixed on the role
    // (Codex P2, 2026-07-26 round 3: this line blamed the weighting even
    // when the engagement type was the missing input).
    html += _hpKv('Monthly fully weighted GBP', costRow && costRow.monthly_loaded_gbp ? costRow.monthly_loaded_gbp : (costRow && costRow.monthly_base_gbp ? 'base salary shown, ' + _hpBaseOnlyReason(p) : '—'));
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
      extra = '<div class="hp-hist-extra">' + esc(_HP_DENIAL_LABELS[ev.denial_reason] || ev.denial_reason) + (ev.denial_comment ? ': “' + esc(ev.denial_comment) + '”' : '') + '</div>';
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
      denialEl.innerHTML = '<div class="hp-sb-denial"><b>Denied: ' + esc(_HP_DENIAL_LABELS[lastDenied.denial_reason] || lastDenied.denial_reason || '') + '.</b> ' + esc(lastDenied.denial_comment || '') + '</div>';
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
  // Clear the failure flag too, or one client's dropped request would keep
  // captioning the next client's rates as unknowable.
  _hiringPlanSettingsFailed = false;
  // Each client's plan starts at its own earliest role month; a start month
  // carried over from another client would silently crop or pad the horizon.
  window._hiringCostStart = null;
  renderContent();
}

function renderHiringPlanTab(container) {
  var view = window._hiringPlanView || 'plan';

  var clientSelector = '';
  if (!isClientUser()) {
    var clientOptions = (getContractedClientRecords() || []).slice();
    var selectedId = selectedHiringPlanClientId();

    // getContractedClientRecords() derives its list from active WORK ITEMS, so
    // a client with a hiring plan but no live project has no option here. The
    // selector then read "Select a client..." above that client's own salary
    // and day-rate figures, attributing financial data to nobody. Whatever is
    // being displayed must be named, so the selected client is added back from
    // the client cache when the contracted list has missed it.
    if (selectedId && !clientOptions.some(function(c) { return c.id === selectedId; })) {
      var known = null;
      var cache = (typeof _apiClientsCache !== 'undefined' && _apiClientsCache) ? _apiClientsCache : {};
      Object.keys(cache).forEach(function(k) {
        var rec = cache[k];
        if (rec && rec.id === selectedId) known = rec;
      });
      clientOptions.push({ id: selectedId, name: (known && known.name) || 'Current client' });
      clientOptions.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
    }

    clientSelector = '<select id="hpClientSelect" aria-label="Select client" onchange="changeHiringPlanClient(this.value)" style="margin-left:auto">' +
      '<option value="">Select a client…</option>' +
      clientOptions.map(function(c) {
        return '<option value="' + c.id + '"' + (selectedId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
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
    html += '<button class="hiring-plan-view-btn' + (view === 'finance' ? ' active' : '') + '" onclick="window._hiringPlanView=\'finance\';renderContent()">Finance</button>';
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
  // Finance is a financial view; a user who cannot see financials must not be
  // stranded on it if their capabilities change under them mid-session.
  if (view === 'finance' && caps.view_financials) return renderHiringPlanFinanceView(contentEl);
  return renderHiringPlanTableView(contentEl);
}
