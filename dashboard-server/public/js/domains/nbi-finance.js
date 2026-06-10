// ==================== FINANCES VIEW ====================
// ----- FINANCE SEED DATA -----
const NBI_FINANCE_SEED = { revenue: [], pipeline: [], payroll: [], targets: { y2026: 0, y2027: 0 }, opex: [] };

// ===== GBP/USD FX RATE =====
let _fxRate = null;
let _fxDate = null;
/** Read FX rate from server-managed settings (updated by daily cron). No cross-origin calls. */
function fetchFxRate() {
  const fx = settings.fx_rates;
  if (fx && fx.USD) {
    _fxRate = fx.USD;
    _fxDate = new Date().toISOString().split('T')[0];
  }
}
/** Convert a GBP amount to USD using the cached FX rate (null if rate unavailable) */
function gbpToUsd(gbp) { return _fxRate ? Math.round(gbp * _fxRate) : null; }
/** Format a GBP amount as a USD string, or dash if FX rate unavailable */
function fmtUsd(gbp) { const usd = gbpToUsd(gbp); return usd !== null ? '$' + usd.toLocaleString() : '—'; }
// Fetch on load
fetchFxRate();

// ===== EDITABLE FINANCE DATA LAYER (PostgreSQL-backed) =====
let _financeData = null;
let _financeSaveTimer = null;
let _financeVersion = 0; // Tracks server version for optimistic concurrency

/** Get the editable finance data object -- loads from cache, localStorage, or server seed */
function getFinanceData() {
  if (_financeData) {
    // Ensure all required keys exist (DB data may have been partially saved)
    const defaults = NBI_FINANCE_SEED;
    for (const key of Object.keys(defaults)) {
      if (_financeData[key] === undefined) _financeData[key] = JSON.parse(JSON.stringify(defaults[key]));
    }
    return _financeData;
  }
  // Fallback: localStorage cache, then empty seed (server seed loaded async separately)
  try { const s = localStorage.getItem('nbi_finance_data'); if (s) { _financeData = JSON.parse(s); return getFinanceData(); /* recurse to apply defaults */ } } catch(e) {}
  _financeData = JSON.parse(JSON.stringify(NBI_FINANCE_SEED));
  return _financeData;
}

/** Fetch finance seed data from server if no local data exists (admin only) */
async function loadFinanceSeedIfEmpty() {
  if (localStorage.getItem('nbi_finance_data')) return; // already have local data
  try {
    const seed = await apiCall('/api/finance/seed');
    if (seed && seed.revenue && seed.revenue.length > 0) {
      _financeData = seed;
      localStorage.setItem('nbi_finance_data', JSON.stringify(seed));
    }
  } catch(e) { /* Server seed not available */ }
}

/** Save finance data to localStorage immediately, then debounce a push to PostgreSQL (800ms) */
function saveFinanceData(data) {
  // SAFEGUARD: refuse to persist data missing critical keys (prevents corruption)
  const requiredKeys = ['revenue', 'payroll', 'opex'];
  const missing = requiredKeys.filter(k => !Array.isArray(data[k]));
  if (missing.length > 0) {
    if (window._nbiDebug) console.warn('[Finance] Repaired corrupt save — missing keys:', missing.join(', '), '— restored from defaults');
    // Restore missing keys from seed rather than saving broken data
    const defaults = NBI_FINANCE_SEED;
    missing.forEach(k => { data[k] = data[k] || JSON.parse(JSON.stringify(defaults[k] || [])); });
  }

  _financeData = data;
  localStorage.setItem('nbi_finance_data', JSON.stringify(data));

  // SAFEGUARD: do not push empty/seed data to the server if the DB already has real data.
  // This prevents overwriting another user's finance entries when loading with an empty local cache.
  const totalEntries = (data.revenue || []).length + (data.payroll || []).length + (data.opex || []).length + (data.pipeline || []).length;
  if (totalEntries === 0 && _financeVersion > 0) {
    if (window._nbiDebug) console.warn('[Finance] Skipping DB save — data is empty but server has version', _financeVersion);
    renderContent();
    return;
  }

  // Debounced save to PostgreSQL with optimistic concurrency
  clearTimeout(_financeSaveTimer);
  _financeSaveTimer = setTimeout(async () => {
    try {
      const resp = await authFetch('/api/finance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, expectedVersion: _financeVersion })
      });
      if (resp.ok) {
        const result = await resp.json();
        _financeVersion = result.version || _financeVersion;
      } else if (resp.status === 409) {
        const err = await resp.json();
        const pendingData = JSON.parse(JSON.stringify(data));
        document.getElementById('conflictTitle').textContent = 'Finance Conflict';
        document.getElementById('conflictFields').innerHTML =
          `<p style="font-size:0.85rem;margin-bottom:var(--space-md)">Finance data was updated by <strong>${esc(err.updatedBy || 'another user')}</strong> while you were editing.</p>` +
          `<div class="conflict-field"><div class="conflict-field__label">Your version</div><div class="conflict-field__mine">${(pendingData.revenue||[]).length} revenue + ${(pendingData.payroll||[]).length} payroll + ${(pendingData.opex||[]).length} opex entries</div></div>`;
        window._financeConflictPending = pendingData;
        window._financeConflictServerVersion = err.currentVersion;
        const modal = document.getElementById('conflictModal');
        modal.classList.add('open');
        _trapFocus(modal);
      } else if (resp.status === 401) {
        showToast('Please log in to save finance changes', 'warning');
      } else {
        const err = await resp.json().catch(() => ({}));
        showToast(err.error || 'Failed to save finance data', 'warning');
      }
    } catch(e) { if (window._nbiDebug) console.warn('[Finance] DB save failed, data safe in localStorage:', e.message); }
  }, FINANCE_DEBOUNCE_MS);
  renderContent();
}

// Load finance data from DB on startup
/** Load finance data from the database on startup; pushes seed data up if DB is empty */
async function loadFinanceFromDB() {
  try {
    const resp = await authFetch('/api/finance');
    if (resp.ok) {
      const result = await resp.json();
      if (result.data) {
        _financeData = result.data;
        _financeVersion = result.version || 0;
        localStorage.setItem('nbi_finance_data', JSON.stringify(_financeData));
        if (currentView === 'finances') renderContent();
        return;
      }
    }
  } catch(e) { if (window._nbiDebug) console.warn('[Finance] DB load failed, using localStorage'); }
  // If DB is empty, push localStorage/seed data up
  const data = getFinanceData();
  try {
    await authFetch('/api/finance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
  } catch(e) { console.warn('[Finance] API save error:', e.message || e); }
}
/**
 * Start inline editing of a finance table cell -- replaces cell content with an input.
 * For 'select-billable' type, toggles the boolean immediately.
 */
function finStartEdit(el, section, idx, field, type) {
  if (el.querySelector('input') || el.querySelector('select')) return;
  const val = el.getAttribute('data-val');
  if (type === 'select-billable') {
    const cur = val === 'true';
    const data = getFinanceData();
    if (data[section] && data[section][idx]) { data[section][idx][field] = !cur; saveFinanceData(data); }
    return;
  }
  const input = document.createElement('input');
  input.type = type || 'text';
  if (type === 'number') { input.step = 'any'; input.min = '0'; }
  input.value = val;
  input.style.cssText = 'width:100%;padding:4px 6px;background:var(--bg-input);border:1px solid var(--accent-border);border-radius:3px;color:var(--text-primary);font-size:inherit';
  if (type === 'number') input.style.fontFamily = 'var(--font-mono)';
  input.onblur = function() { finSaveEdit(section, idx, field, this.value); };
  input.onkeydown = function(e) { if (e.key === 'Enter') this.blur(); if (e.key === 'Escape') { this.onblur = null; renderContent(); } };
  el.textContent = '';
  el.appendChild(input);
  input.focus();
  input.select();
}
/** Commit an inline finance cell edit -- auto-syncs monthly/annual for payroll fields */
function finSaveEdit(section, idx, field, value) {
  const data = getFinanceData();
  if (section === '_root') { data[field] = parseFloat(value) || 0; }
  else if (section === 'targets') { data.targets[field] = parseFloat(value) || 0; }
  else {
    if (!data[section] || !data[section][idx]) return;
    const orig = data[section][idx][field];
    if (typeof orig === 'number') {
      data[section][idx][field] = parseFloat(value) || 0;
      if (section === 'payroll' && field === 'annual') data[section][idx].monthly = Math.round(parseFloat(value) / 12);
      if (section === 'payroll' && field === 'monthly') data[section][idx].annual = Math.round(parseFloat(value) * 12);
    } else { data[section][idx][field] = value; }
  }
  saveFinanceData(data);
}
/** Add a new row to a finance section (revenue/payroll/pipeline/opex) with template defaults */
function finAddRow(section) {
  const data = getFinanceData();
  const tpl = { revenue: { client: 'New Client', annual: 0, type: 'TBD', status: 'TBD', startMonth: 1 },
    payroll: { name: 'New Hire', role: 'TBD', monthly: 0, annual: 0, billable: false, client: null },
    pipeline: { client: 'New Lead', low: 0, high: 0, probability: 'Low', notes: '' },
    opex: { name: 'New Expense', amount: 0, tag: 'Other', type: 'recurring' } };
  if (!data[section]) data[section] = [];
  data[section].push(tpl[section] || {});
  saveFinanceData(data);
}
/** Remove a row from a finance section by index */
function finRemoveRow(section, idx) {
  const data = getFinanceData();
  if (data[section]) { data[section].splice(idx, 1); saveFinanceData(data); }
}
// ==================== EXPENSE REPORTS ====================
// Expenses are grouped into submittable reports. The view shows:
// 1. Report cards (draft/submitted/approved) at the top
// 2. Unassigned expenses (not yet in a report) in a table below
//
// Workflow: Create expenses (manual or OCR upload) → Create a report →
// Add expenses to it → Submit → Tom Rieger gets notified (in-app + email) →
// Admin (Tom) approves or rejects the report.
//
// Report statuses: draft → submitted → approved/rejected
// Expense statuses: pending (while in draft/submitted report) → approved/rejected (cascaded from report)

let _expenseCategories = null;       // Cached categories from GET /api/expenses/categories
let _expensesData = null;            // Cached expenses from GET /api/expenses
let _expenseReportsData = null;      // Cached reports from GET /api/expense-reports
let _expenseFilter = { status: null, user_id: null }; // Active filters for expense list
let _unassignedSort = { col: 'date', dir: 'desc' };  // Sort state for unassigned expenses table
let _expenseDetailId = null;         // Currently open expense detail panel ID (or null)
let _expenseReportDetailId = null;   // Currently open report detail panel ID (or null)

/** Fetch expense categories from the API for use in dropdown selectors */
async function loadExpenseCategories() {
  try {
    const cats = await apiCall('/api/expenses/categories');
    if (cats) _expenseCategories = cats;
  } catch(e) { if (window._nbiDebug) console.error('Failed to load expense categories:', e); }
}

/** Fetch expenses from the API, applying current status/user filters */
async function loadExpenses() {
  const params = new URLSearchParams();
  if (_expenseFilter.status) params.set('status', _expenseFilter.status);
  if (_expenseFilter.user_id) params.set('user_id', _expenseFilter.user_id);
  try {
    const data = await apiCall('/api/expenses?' + params.toString());
    if (data) _expensesData = data;
  } catch(e) { if (window._nbiDebug) console.error('Failed to load expenses:', e); }
}

/** Fetch expense reports from the API */
async function loadExpenseReports() {
  try {
    const data = await apiCall('/api/expense-reports');
    if (data) _expenseReportsData = data;
  } catch(e) { if (window._nbiDebug) console.error('Failed to load expense reports:', e); }
}

/** Reload all expense data and re-render */
async function refreshExpenses() {
  await Promise.all([loadExpenses(), loadExpenseReports()]);
  renderExpensesContent();
}

/** Status badge helper — maps report/expense statuses to CSS classes */
function expenseStatusClass(status) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'submitted') return 'info';
  return 'warning'; // draft, pending
}

/** Render the expenses view: header, reports, unassigned expenses, and detail overlays */
async function renderExpensesView(el) {
  if (!_expenseCategories) {
    // Skeleton placeholders while async data loads (Phase 12.1)
    el.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-card"></div>' +
      Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading expenses</span></div>';
    await loadExpenseCategories();
    await Promise.all([loadExpenses(), loadExpenseReports()]);
  }
  if (!_expensesData) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary)">Failed to load expenses.</div>';
    return;
  }

  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const expenses = _expensesData.expenses || [];
  const reports = (_expenseReportsData && _expenseReportsData.reports) || [];
  const unassigned = expenses.filter(e => !e.report_id);

  let html = '';

  // Header
  html += `<div class="expenses-header">`;
  html += `<h1 style="margin:0;font-size:1.3rem">Expense Reports</h1>`;
  html += `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">`;
  html += `<button class="btn btn--primary btn--sm" data-action="openNewReportModal">+ New Report</button>`;
  html += `<button class="btn btn--sm" data-action="openNewExpenseModal">+ New Expense</button>`;
  html += `<button class="btn btn--sm" data-action="_actModalClick" data-arg0="receiptUploadInput" style="background:var(--accent);color:#fff">&#128247; Upload Receipt</button>`;
  html += `<input type="file" id="receiptUploadInput" accept="image/*,.pdf" style="display:none" onchange="processReceiptUpload(this.files[0])">`;
  html += `</div></div>`;

  // Summary KPIs
  const totalAll = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const draftReports = reports.filter(r => r.status === 'draft');
  const submittedReports = reports.filter(r => r.status === 'submitted');
  const approvedReports = reports.filter(r => r.status === 'approved');

  html += `<div class="expenses-summary">`;
  html += `<div class="kpi-card"><div class="kpi-card__value">${reports.length}</div><div class="kpi-card__label">Reports</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:var(--warning)">${draftReports.length}</div><div class="kpi-card__label">Draft</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:var(--accent)">${submittedReports.length}</div><div class="kpi-card__label">Submitted</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value">${unassigned.length}</div><div class="kpi-card__label">Unassigned Expenses</div></div>`;
  html += `</div>`;

  // Content area
  html += `<div id="expensesContent"></div>`;

  // Detail overlays (shared for both expense detail and report detail)
  html += `<div id="expenseDetailOverlay" class="lead-detail-overlay" data-action="_actCloseExpReportDetail"></div>`;
  html += `<div id="expenseDetailPanel" class="lead-detail-panel"></div>`;
  html += `<div id="reportDetailPanel" class="lead-detail-panel"></div>`;

  el.innerHTML = html;
  renderExpensesContent();
}

/** Render the main content: reports grid + unassigned expenses table */
function renderExpensesContent() {
  const el = document.getElementById('expensesContent');
  if (!el) return;

  const expenses = (_expensesData && _expensesData.expenses) || [];
  const reports = (_expenseReportsData && _expenseReportsData.reports) || [];
  const unassigned = expenses.filter(e => !e.report_id);
  const isAdmin = _currentUser && _currentUser.role === 'admin';

  let html = '';

  // Reports section
  if (reports.length > 0) {
    html += `<div class="report-cards">`;
    reports.forEach(r => {
      const statusCls = expenseStatusClass(r.status);
      const total = parseFloat(r.total_amount || 0).toFixed(2);
      const dateStr = r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : new Date(r.created_at).toLocaleDateString('en-GB');
      html += `<div class="report-card" data-action="openReportDetail" data-arg0="${r.id}">
        <div class="report-card__header">
          <div class="report-card__title">${esc(r.title)}</div>
          <span class="expense-status expense-status--${statusCls}">${r.status}</span>
        </div>
        <div class="report-card__meta">
          ${isAdmin && r.employee_name ? `<span>${esc(r.employee_name)}</span>` : ''}
          <span>${r.expense_count} expense${r.expense_count !== 1 ? 's' : ''}</span>
          <span>${r.status === 'submitted' ? 'Submitted' : 'Created'} ${dateStr}</span>
        </div>
        <div class="report-card__total">${currencySym('GBP')}${fmtMoney(parseFloat(total))}</div>
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="padding:20px;text-align:center;color:var(--text-muted);background:var(--bg-card);border-radius:var(--radius-md);margin-bottom:16px">
      No expense reports yet. Create a report to group your expenses for submission.
    </div>`;
  }

  // Unassigned expenses section
  html += `<div class="unassigned-section">`;
  html += `<h3>Unassigned Expenses <span style="font-weight:400;color:var(--text-muted)">(${unassigned.length})</span></h3>`;

  if (unassigned.length === 0) {
    html += `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem">
      All expenses are assigned to reports. Upload a receipt or add a new expense to get started.
    </div>`;
  } else {
    // Sort unassigned expenses
    const sortCol = _unassignedSort.col;
    const sortDir = _unassignedSort.dir === 'asc' ? 1 : -1;
    unassigned.sort((a, b) => {
      if (sortCol === 'date') return ((a.date || '') < (b.date || '') ? -1 : 1) * sortDir;
      if (sortCol === 'description') return (a.description || '').localeCompare(b.description || '') * sortDir;
      if (sortCol === 'category') return (a.category_name || '').localeCompare(b.category_name || '') * sortDir;
      if (sortCol === 'amount') return ((parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0)) * sortDir;
      if (sortCol === 'receipts') return ((a.receipt_count || 0) - (b.receipt_count || 0)) * sortDir;
      return 0;
    });

    // Sortable header helper
    const expSortTh = (col, label) => {
      const isActive = _unassignedSort.col === col;
      const arrow = isActive ? (_unassignedSort.dir === 'asc' ? ' &#9650;' : ' &#9660;') : '';
      return `<th style="cursor:pointer;user-select:none;white-space:nowrap${isActive ? ';color:var(--accent)' : ''}" data-action="_actToggleUnassignedSort" data-arg0="${col}">${label}${arrow}</th>`;
    };

    // Desktop table
    html += '<div class="expenses-table-wrap expenses-desktop"><table class="leads-table"><thead><tr>';
    html += expSortTh('date', 'Date');
    if (isAdmin) html += expSortTh('employee', 'Employee');
    html += `<th>Description</th>`;
    html += expSortTh('category', 'Category');
    html += expSortTh('amount', 'Amount');
    html += `<th>VAT</th>`;
    html += expSortTh('receipts', 'Receipts');
    html += `<th></th>`;
    html += '</tr></thead><tbody>';

    unassigned.forEach(exp => {
      html += `<tr class="leads-table__row" data-action="openExpenseDetail" data-arg0="${exp.id}">`;
      html += `<td>${(exp.date||'').slice(0,10)}</td>`;
      if (isAdmin) html += `<td>${esc(exp.employee_name || '')}</td>`;
      html += `<td><strong>${esc(exp.description || '-')}</strong></td>`;
      html += `<td>${esc(exp.category_name || '-')}</td>`;
      html += `<td>${currencySym(exp.currency)}${(parseFloat(exp.amount) || 0).toFixed(2)}</td>`;
      html += `<td>${exp.vat_amount ? currencySym(exp.currency) + (parseFloat(exp.vat_amount) || 0).toFixed(2) : '-'}</td>`;
      html += `<td>${exp.receipt_count > 0 ? exp.receipt_count + ' file' + (exp.receipt_count > 1 ? 's' : '') : '-'}</td>`;
      html += `<td><button class="btn btn--ghost btn--sm" data-action="deleteExpense" data-stop data-arg0="${exp.id}" title="Delete">&times;</button></td>`;
      html += `</tr>`;
    });
    html += '</tbody></table></div>';

    // Mobile card list
    html += '<div class="expenses-mobile">';
    unassigned.forEach(exp => {
      const amt = currencySym(exp.currency) + (parseFloat(exp.amount) || 0).toFixed(2);
      html += `<div class="expense-card" data-action="openExpenseDetail" data-arg0="${exp.id}">
        <div class="expense-card__top">
          <div class="expense-card__desc">${esc(exp.description || 'Expense')}</div>
          <div class="expense-card__amount">${amt}</div>
        </div>
        <div class="expense-card__meta">
          <span>${(exp.date || '').slice(0, 10)}</span>
          ${isAdmin && exp.employee_name ? `<span>${esc(exp.employee_name)}</span>` : ''}
          <span>${esc(exp.category_name || '')}</span>
          ${exp.receipt_count > 0 ? `<span>&#128206; ${exp.receipt_count}</span>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
  }
  html += `</div>`;

  el.innerHTML = html;
}

// ==================== REPORT DETAIL PANEL ====================
// Slides in from the right (reuses the lead-detail-panel pattern).
// Shows: title, notes (editable if draft), totals by currency,
// expense list with remove buttons, add-expenses checkbox list,
// admin approve/reject buttons, and submit button.

/** Open report detail panel showing expenses, add/remove, and submit */
async function openReportDetail(id) {
  _expenseReportDetailId = id;

  // Remove any existing full-screen view
  document.getElementById('reportFullscreen')?.remove();

  // Create full-screen container
  const fs = document.createElement('div');
  fs.id = 'reportFullscreen';
  fs.className = 'report-fullscreen';
  fs.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-muted)">Loading report...</div>';
  document.body.appendChild(fs);

  try {
    const report = await apiCall('/api/expense-reports/' + id);
    if (!report) { fs.innerHTML = '<p style="padding:60px;text-align:center">Failed to load report</p>'; return; }
    renderReportDetailContent(fs, report);
  } catch(e) {
    fs.innerHTML = '<p style="padding:60px;text-align:center">Error loading report</p>';
  }
}

/** Close report detail — remove full-screen view */
function closeReportDetail() {
  _expenseReportDetailId = null;
  document.getElementById('reportFullscreen')?.remove();
}

/** Render full-screen report view */
function renderReportDetailContent(container, data) {
  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const r = data;
  const isOwner = _currentUser && _currentUser.id === r.user_id;
  const isDraft = r.status === 'draft';
  const canEdit = isDraft && (isOwner || isAdmin);
  const expenses = r.expenses || [];
  const totals = r.totals_by_currency || [];

  // Calculate summary stats (per-currency)
  let grandTotal = 0, vatTotal = 0, receiptCount = 0;
  const byCategory = {};
  const byCurrency = {};
  expenses.forEach(exp => {
    const amt = parseFloat(exp.amount) || 0;
    const vat = parseFloat(exp.vat_amount) || 0;
    const cur = exp.currency || 'GBP';
    grandTotal += amt;
    vatTotal += vat;
    if (!byCurrency[cur]) byCurrency[cur] = { total: 0, vat: 0 };
    byCurrency[cur].total += amt;
    byCurrency[cur].vat += vat;
    if (exp.receipt_count > 0) receiptCount++;
    const cat = exp.category_name || 'Uncategorised';
    if (!byCategory[cat]) byCategory[cat] = { expenses: [], total: 0 };
    byCategory[cat].expenses.push(exp);
    byCategory[cat].total += amt;
  });

  // Date range
  const dates = expenses.map(e => (e.date || '').slice(0, 10)).filter(Boolean).sort();
  const dateRange = dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : '';

  let html = '';

  // Top bar
  html += `<div class="report-fs__topbar">
    <button class="btn btn--ghost" data-action="closeReportDetail" title="Back to expenses">&#8592; Back</button>
    <h1>${esc(r.title)}</h1>
    <span class="expense-status expense-status--${expenseStatusClass(r.status)}" style="font-size:0.85rem;padding:4px 14px">${r.status}</span>
    <button class="btn btn--ghost" data-action="exportReportExcel" data-arg0="${r.id}" title="Export as Excel">&#128196; Export Excel</button>
    <button class="btn btn--ghost" data-action="emailReport" data-arg0="${r.id}" title="Email to approver">&#9993; Email</button>
  </div>`;

  html += `<div class="report-fs__body">`;

  // Employee + date info
  if (r.employee_name || dateRange) {
    html += `<div style="margin-bottom:24px;color:var(--text-secondary);font-size:0.85rem">`;
    if (r.employee_name) html += `<span>Submitted by <strong>${esc(r.employee_name)}</strong></span>`;
    if (dateRange) html += `<span style="margin-left:16px">${dateRange}</span>`;
    if (r.submitted_at) html += `<span style="margin-left:16px">Submitted ${new Date(r.submitted_at).toLocaleDateString('en-GB')}</span>`;
    html += `</div>`;
  }

  // Editable title (draft only)
  if (canEdit) {
    html += `<div class="report-fs__notes">
      <h3>Report Details</h3>
      <div style="display:grid;grid-template-columns:80px 1fr;gap:8px;align-items:center">
        <label style="font-size:0.78rem;color:var(--text-muted)">Title</label>
        <input type="text" value="${esc(r.title)}" onchange="updateReport('${r.id}','title',this.value)"
          style="padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;width:100%">
        <label style="font-size:0.78rem;color:var(--text-muted)">Notes</label>
        <textarea rows="2" style="width:100%;resize:vertical;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem"
          onchange="updateReport('${r.id}','notes',this.value)">${esc(r.notes || '')}</textarea>
      </div>
    </div>`;
  }

  // Summary cards (per-currency if mixed, else single)
  const curKeys = Object.keys(byCurrency);
  const totalDisplay = curKeys.length <= 1
    ? `${currencySym(curKeys[0] || 'GBP')}${grandTotal.toFixed(2)}`
    : curKeys.map(c => `${currencySym(c)}${byCurrency[c].total.toFixed(2)}`).join(' + ');
  const vatDisplay = curKeys.length <= 1
    ? `${currencySym(curKeys[0] || 'GBP')}${vatTotal.toFixed(2)}`
    : curKeys.map(c => `${currencySym(c)}${byCurrency[c].vat.toFixed(2)}`).join(' + ');
  html += `<div class="report-fs__summary">
    <div class="report-fs__card">
      <div class="report-fs__card-label">Total Amount</div>
      <div class="report-fs__card-value">${totalDisplay}</div>
    </div>
    <div class="report-fs__card">
      <div class="report-fs__card-label">VAT Claimed</div>
      <div class="report-fs__card-value">${vatDisplay}</div>
    </div>
    <div class="report-fs__card">
      <div class="report-fs__card-label">Expenses</div>
      <div class="report-fs__card-value">${expenses.length}</div>
    </div>
    <div class="report-fs__card">
      <div class="report-fs__card-label">Receipts</div>
      <div class="report-fs__card-value">${receiptCount} / ${expenses.length}</div>
    </div>
  </div>`;

  // Expenses grouped by category
  const catNames = Object.keys(byCategory).sort((a, b) => byCategory[b].total - byCategory[a].total);
  catNames.forEach(cat => {
    const group = byCategory[cat];
    const sorted = group.expenses.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    html += `<div class="report-fs__cat-group">
      <div class="report-fs__cat-header">
        <span>${esc(cat)} (${sorted.length})</span>
        <span class="report-fs__cat-subtotal">&pound;${group.total.toFixed(2)}</span>
      </div>
      <table class="report-fs__table">
        <thead><tr>
          <th style="width:100px">Date</th>
          <th>Description</th>
          <th style="width:90px;text-align:right">Amount</th>
          <th style="width:80px;text-align:right">VAT</th>
          <th style="width:70px;text-align:center">Receipt</th>
          ${canEdit ? '<th style="width:40px"></th>' : ''}
        </tr></thead>
        <tbody>`;
    sorted.forEach(exp => {
      const hasReceipt = exp.receipt_count > 0;
      html += `<tr style="cursor:pointer" data-action="openExpenseDetail" data-arg0="${exp.id}">
        <td style="color:var(--text-muted)">${(exp.date || '').slice(0, 10)}</td>
        <td>${esc(exp.description || '-')}</td>
        <td class="amt">${currencySym(exp.currency)}${(parseFloat(exp.amount) || 0).toFixed(2)}</td>
        <td class="amt">${exp.vat_amount ? currencySym(exp.currency) + (parseFloat(exp.vat_amount) || 0).toFixed(2) : '-'}</td>
        <td style="text-align:center" class="${hasReceipt ? 'receipt-yes' : 'receipt-no'}">${hasReceipt ? '&#10003;' : '&#10007;'}</td>
        ${canEdit ? `<td><button class="btn btn--ghost btn--sm" data-action="removeExpenseFromReport" data-stop data-arg0="${r.id}" data-arg1="${exp.id}" title="Remove" style="padding:0 4px;color:var(--text-muted)">&times;</button></td>` : ''}
      </tr>`;
    });
    html += `</tbody></table></div>`;
  });

  // Add unassigned expenses (draft only)
  if (canEdit) {
    const allExpenses = (_expensesData && _expensesData.expenses) || [];
    const unassigned = allExpenses.filter(e => !e.report_id);
    if (unassigned.length > 0) {
      html += `<div class="report-fs__notes" style="margin-top:24px">
        <h3>Add Unassigned Expenses</h3>
        <div style="max-height:250px;overflow-y:auto;border:1px solid var(--border-subtle);border-radius:var(--radius-sm)">`;
      unassigned.forEach(exp => {
        html += `<label class="expense-checkbox-row">
          <input type="checkbox" value="${exp.id}" class="add-expense-cb">
          <span style="min-width:80px;color:var(--text-muted)">${(exp.date || '').slice(0, 10)}</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(exp.description || '-')}</span>
          <span style="font-family:var(--font-mono);font-weight:600">${currencySym(exp.currency)}${(parseFloat(exp.amount) || 0).toFixed(2)}</span>
        </label>`;
      });
      html += `</div>
        <button class="btn btn--primary btn--sm" style="margin-top:8px" data-action="addSelectedExpensesToReport" data-arg0="${r.id}">Add Selected</button>
      </div>`;
    }
  }

  // Review section — visible to admins and the configured expense approver.
  // The old check (_currentUser.username === 'tom') hardcoded the username
  // in the client bundle; anyone with a 'tom' account could review
  // (audit finding F-C8). Now we read settings.expense_approver, which the
  // server sources from DB settings / env var. The server enforces this
  // again on every PATCH regardless of what the client decides to show.
  const configuredApprover = (settings && (settings.expense_approver || settings.expenseApprover)) || null;
  const canReview = isAdmin || (_currentUser && configuredApprover && _currentUser.username === configuredApprover);
  if (canReview && r.status === 'submitted') {
    html += `<div class="report-fs__notes" style="margin-top:24px">
      <h3>Review</h3>
      <textarea id="reviewNotes" rows="3" placeholder="Add review notes (required for rejection)..."
        style="width:100%;resize:vertical;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-bottom:12px"></textarea>
      <div style="display:flex;gap:12px">
        <button class="btn btn--primary" data-action="reviewReport" data-arg0="${r.id}" data-arg1="approved" style="flex:1">Approve</button>
        <button class="btn btn--danger" data-action="reviewReport" data-arg0="${r.id}" data-arg1="rejected" style="flex:1">Reject &amp; Return</button>
      </div>
    </div>`;
  }
  if (r.reviewed_by) {
    html += `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:16px">
      Reviewed by ${esc(r.reviewed_by)} on ${r.reviewed_at ? new Date(r.reviewed_at).toLocaleString('en-GB') : '-'}
    </div>`;
  }
  if (r.review_notes) {
    html += `<div class="report-fs__notes" style="margin-top:8px">
      <h3>Reviewer Notes</h3>
      <p style="font-size:0.85rem;margin:0">${esc(r.review_notes)}</p>
    </div>`;
  }

  // Action buttons
  html += `<div class="report-fs__actions">`;
  if (canEdit && expenses.length > 0) {
    html += `<button class="btn btn--primary" data-action="submitReport" data-arg0="${r.id}" style="min-width:180px">Submit Report</button>`;
  } else if (canEdit) {
    html += `<button class="btn" disabled style="min-width:180px;opacity:0.5" title="Add expenses before submitting">Submit Report</button>`;
  }
  html += `<button class="btn btn--ghost" data-action="exportReportExcel" data-arg0="${r.id}">&#128196; Export Excel</button>`;
  html += `<button class="btn btn--ghost" data-action="emailReport" data-arg0="${r.id}">&#9993; Email to Tom</button>`;
  if (canEdit) {
    html += `<button class="btn btn--danger" data-action="deleteReport" data-arg0="${r.id}" style="margin-left:auto">Delete Report</button>`;
  }
  if (!canEdit && !isAdmin) {
    html += `<button class="btn" data-action="closeReportDetail" style="min-width:120px">Close</button>`;
  }
  html += `</div>`;

  html += `</div>`; // end body
  container.innerHTML = html;
}

/** Export report as Excel spreadsheet */
async function exportReportExcel(id) {
  try {
    const r = await apiCall('/api/expense-reports/' + id);
    if (!r) return;
    const expenses = r.expenses || [];

    // Build CSV content (Excel-compatible)
    const rows = [['Date', 'Description', 'Category', 'Amount (GBP)', 'VAT', 'Currency', 'Receipt', 'Status']];
    let grandTotal = 0, vatTotal = 0;
    expenses.sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      const vat = parseFloat(e.vat_amount) || 0;
      grandTotal += amt;
      vatTotal += vat;
      rows.push([
        (e.date || '').slice(0, 10),
        (e.description || '').replace(/[\t\n\r]/g, ' '),
        e.category_name || '',
        amt.toFixed(2),
        vat ? vat.toFixed(2) : '',
        e.currency || 'GBP',
        e.receipt_count > 0 ? 'Yes' : 'No',
        e.status || ''
      ]);
    });
    // Summary rows
    rows.push([]);
    rows.push(['', '', 'TOTAL', grandTotal.toFixed(2), vatTotal.toFixed(2)]);
    rows.push(['', '', 'Expenses', expenses.length.toString()]);
    rows.push(['', '', 'With receipts', expenses.filter(e => e.receipt_count > 0).length.toString()]);

    // Convert to CSV with proper escaping
    const csv = rows.map(row => row.map(cell => {
      const s = String(cell);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\r\n');

    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (r.title || 'Expense_Report').replace(/[^a-zA-Z0-9-_ ]/g, '') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Excel file downloaded');
  } catch(e) {
    toast('Export failed: ' + e.message, 'error');
  }
}

/** Email report to approver — downloads ZIP (CSV + receipts + bank statements), then opens mailto */
async function emailReport(id) {
  try {
    toast('Preparing export package...');

    // Download the ZIP containing everything
    const resp = await authFetch('/api/expense-reports/' + id + '/export');
    if (!resp.ok) { toast('Export failed', 'error'); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const disposition = resp.headers.get('content-disposition') || '';
    const filenameMatch = disposition.match(/filename="(.+?)"/);
    a.href = url;
    a.download = filenameMatch ? filenameMatch[1] : 'Expense_Report.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('ZIP downloaded — attach it to the email that opens next');

    // Get report summary for email body
    const reportResp = await authFetch('/api/expense-reports/' + id);
    const r = await reportResp.json();
    const expenses = r.expenses || [];
    let total = 0, vatTotal = 0;
    expenses.forEach(e => { total += parseFloat(e.amount) || 0; vatTotal += parseFloat(e.vat_amount) || 0; });
    const dates = expenses.map(e => (e.date||'').slice(0,10)).filter(Boolean).sort();
    const receiptCount = expenses.filter(e => e.receipt_count > 0).length;

    const to = 'trieger@nbi-consulting.com';
    const subject = encodeURIComponent(r.title || 'Expense Report');
    const body = encodeURIComponent(
      `Hi Tom,\n\nPlease find attached the expense report ZIP containing:\n` +
      `- CSV spreadsheet with all expenses\n` +
      `- ${receiptCount} receipt files\n` +
      `- Redacted bank statements (Monzo Jan-Mar 2026)\n\n` +
      `Report: ${r.title}\n` +
      `Period: ${dates[0] || ''} to ${dates[dates.length - 1] || ''}\n` +
      `Expenses: ${expenses.length}\n` +
      `Total: GBP ${total.toFixed(2)}\n` +
      `VAT: GBP ${vatTotal.toFixed(2)}\n` +
      `Receipts: ${receiptCount} / ${expenses.length}\n\n` +
      `Please review and approve at your earliest convenience.\n\n` +
      `Thanks,\nGlen`
    );

    // Open email client after a short delay
    setTimeout(() => {
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    }, 1500);
  } catch(e) {
    toast('Failed to prepare email: ' + e.message, 'error');
  }
}

/** Update a report field via PATCH */
async function updateReport(id, field, value) {
  const resp = await authFetch('/api/expense-reports/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Update failed', 'error');
  } else {
    // Re-render so the Expenses view reflects the change immediately
    // (Glen 2026-04-16: fields updated but page didn't refresh).
    await refreshExpenses();
  }
}

/** Submit a report for review — notifies Tom */
async function submitReport(id) {
  if (!(await themedConfirm('Submit this expense report for review? Tom Rieger will be notified.'))) return;
  const resp = await authFetch('/api/expense-reports/' + id + '/submit', { method: 'POST' });
  if (resp.ok) {
    toast('Report submitted! Tom has been notified.');
    closeReportDetail();
    await refreshExpenses();
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Submit failed', 'error');
  }
}

/** Approve or reject an expense report, with optional reviewer notes */
async function reviewReport(id, status) {
  const notes = document.getElementById('reviewNotes')?.value?.trim() || '';
  if (status === 'rejected' && !notes) {
    toast('Please add notes explaining why the report is being returned', 'error');
    document.getElementById('reviewNotes')?.focus();
    return;
  }
  const action = status === 'approved' ? 'approve' : 'reject and return';
  if (!(await themedConfirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this expense report?`))) return;
  const body = { status };
  if (notes) body.notes = (body.notes ? body.notes + '\n' : '') + `[Review] ${notes}`;
  body.review_notes = notes || null;
  const resp = await authFetch('/api/expense-reports/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (resp.ok) {
    toast(status === 'approved' ? 'Report approved' : 'Report returned with notes');
    closeReportDetail();
    await refreshExpenses();
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Review failed', 'error');
  }
}

/** Add checked expenses to a report */
async function addSelectedExpensesToReport(reportId) {
  const checkboxes = document.querySelectorAll('.add-expense-cb:checked');
  if (checkboxes.length === 0) { toast('Select at least one expense'); return; }
  const ids = Array.from(checkboxes).map(cb => cb.value);

  const resp = await authFetch('/api/expense-reports/' + reportId + '/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expense_ids: ids })
  });
  if (resp.ok) {
    toast(`${ids.length} expense${ids.length > 1 ? 's' : ''} added to report`);
    await refreshExpenses();
    openReportDetail(reportId);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to add expenses', 'error');
  }
}

/** Remove an expense from a report */
async function removeExpenseFromReport(reportId, expenseId) {
  const resp = await authFetch('/api/expense-reports/' + reportId + '/expenses/' + expenseId, { method: 'DELETE' });
  if (resp.ok) {
    toast('Expense removed from report');
    await refreshExpenses();
    openReportDetail(reportId);
  } else {
    toast('Failed to remove expense', 'error');
  }
}

/** Delete a draft report */
async function deleteReport(id) {
  if (!(await themedConfirm('Delete this expense report? Expenses will be unlinked but not deleted.'))) return;
  const resp = await authFetch('/api/expense-reports/' + id, { method: 'DELETE' });
  if (resp.ok) {
    toast('Report deleted');
    closeReportDetail();
    await refreshExpenses();
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Delete failed', 'error');
  }
}

/** Open modal to create a new expense report */
function openNewReportModal() {
  let html = `<div class="modal-overlay open" id="newReportModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-sm)">
      <h2 style="margin-top:0">New Expense Report</h2>
      <div class="lead-detail__grid">
        <label class="field-required">Title</label><input type="text" id="newReportTitle" placeholder="e.g. GDC March 2026">
        <label>Notes</label><textarea id="newReportNotes" rows="2" style="resize:vertical" placeholder="Optional notes..."></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button class="btn" data-action="_actModalRemove" data-arg0="newReportModal">Cancel</button>
        <button class="btn btn--primary" data-action="_actWithLoading" data-pass-el data-arg0="submitNewReport">Create Report</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  _activateDynamicModal('newReportModal');
}

/** Submit new report creation */
async function submitNewReport() {
  const modal = document.getElementById('newReportModal');
  clearFieldErrors(modal);
  const titleEl = document.getElementById('newReportTitle');
  const title = titleEl.value.trim();
  if (!title) { showFieldError(titleEl, 'Title is required'); return; }

  const resp = await authFetch('/api/expense-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, notes: document.getElementById('newReportNotes').value.trim() || null })
  });
  if (resp.ok) {
    const created = await resp.json();
    document.getElementById('newReportModal')?.remove();
    await refreshExpenses();
    openReportDetail(created.id);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast('Failed to create report: ' + (err.error || 'Unknown error'), 'error');
  }
}

// ==================== INDIVIDUAL EXPENSE DETAIL ====================
// Expense detail panel shows: editable fields (date, amount, currency, category,
// description, notes), admin review section, receipt list with upload/download/delete,
// and report assignment info if the expense belongs to a report.

/** Open the expense detail overlay panel, fetching full details from the API */
async function openExpenseDetail(id) {
  _expenseDetailId = id;

  // Ensure overlay and panel exist (they might be inside a hidden section when report fullscreen is open)
  let overlay = document.getElementById('expenseDetailOverlay');
  let panel = document.getElementById('expenseDetailPanel');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'expenseDetailOverlay';
    overlay.className = 'lead-detail-overlay';
    overlay.onclick = () => closeExpenseDetail();
    document.body.appendChild(overlay);
  }
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'expenseDetailPanel';
    panel.className = 'lead-detail-panel';
    document.body.appendChild(panel);
  }

  overlay.classList.add('open');
  panel.classList.add('open');
  panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading...</div>';

  try {
    const expense = await apiCall('/api/expenses/' + id);
    if (!expense) { panel.innerHTML = '<p>Failed to load expense</p>'; return; }
    renderExpenseDetailContent(panel, expense);
  } catch(e) {
    panel.innerHTML = '<p>Error loading expense</p>';
  }
}

/** Close the expense detail overlay panel */
function closeExpenseDetail() {
  _expenseDetailId = null;
  document.getElementById('expenseDetailOverlay')?.classList.remove('open');
  document.getElementById('expenseDetailPanel')?.classList.remove('open');
}

/** Render expense detail content: editable fields, admin review controls, and receipt management */
function renderExpenseDetailContent(panel, exp) {
  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const isOwner = _currentUser && _currentUser.id === exp.user_id;
  const canEdit = isAdmin || (isOwner && exp.status === 'pending');

  let html = `<div class="lead-detail">`;
  // Header
  html += `<div class="lead-detail__header">
    <button class="btn btn--ghost" data-action="closeExpenseDetail" style="margin-right:8px">\u2715</button>
    <div style="flex:1">
      <div style="color:var(--text-secondary);font-size:0.8rem">${esc(exp.employee_name || '')}</div>
      <h2 style="margin:0">${esc(exp.description || 'Expense')}</h2>
    </div>
    <span class="expense-status expense-status--${exp.status === 'approved' ? 'success' : exp.status === 'rejected' ? 'danger' : 'warning'}" style="font-size:0.85rem;padding:4px 12px">${exp.status}</span>
  </div>`;

  // Report assignment info
  if (exp.report_title) {
    html += `<div style="padding:8px 12px;background:color-mix(in srgb, var(--accent) 8%, var(--bg-surface));border-radius:var(--radius-sm);margin-bottom:8px;font-size:0.82rem">
      In report: <strong>${esc(exp.report_title)}</strong>
      ${exp.report_status ? ` <span class="expense-status expense-status--${expenseStatusClass(exp.report_status)}" style="font-size:0.75rem;padding:1px 6px">${exp.report_status}</span>` : ''}
    </div>`;
  }

  // Details
  html += `<div class="lead-detail__section"><h3>Details</h3><div class="lead-detail__grid">`;
  html += `<label>Date</label><input type="date" value="${(exp.date||'').slice(0,10)}" ${canEdit ? `onchange="updateExpense('${exp.id}','date',this.value)"` : 'disabled'}>`;
  html += `<label>Amount</label><input type="number" step="0.01" value="${exp.amount || ''}" ${canEdit ? `onchange="updateExpense('${exp.id}','amount',parseFloat(this.value))"` : 'disabled'}>`;
  html += `<label>VAT</label><input type="number" step="0.01" value="${exp.vat_amount || ''}" placeholder="0.00" ${canEdit ? `onchange="updateExpense('${exp.id}','vat_amount',this.value?parseFloat(this.value):null)"` : 'disabled'}>`;
  html += `<label>Currency</label><select ${canEdit ? `onchange="updateExpense('${exp.id}','currency',this.value)"` : 'disabled'}>`;
  ['GBP', 'USD', 'EUR'].forEach(c => { html += `<option value="${c}" ${exp.currency === c ? 'selected' : ''}>${c}</option>`; });
  html += `</select>`;
  html += `<label>Category</label><select ${canEdit ? `onchange="updateExpense('${exp.id}','category_id',this.value||null)"` : 'disabled'}><option value="">-- Select --</option>`;
  (_expenseCategories || []).forEach(cat => { html += `<option value="${cat.id}" ${exp.category_id === cat.id ? 'selected' : ''}>${esc(cat.name)}</option>`; });
  html += `</select>`;
  html += `<label>Description</label><input type="text" value="${esc(exp.description || '')}" ${canEdit ? `onchange="updateExpense('${exp.id}','description',this.value)"` : 'disabled'}>`;
  html += `</div></div>`;

  // Notes
  html += `<div class="lead-detail__section"><h3>Notes</h3>
    <textarea rows="3" style="width:100%;resize:vertical" ${canEdit ? `onchange="updateExpense('${exp.id}','notes',this.value)"` : 'disabled'}>${esc(exp.notes || '')}</textarea>
  </div>`;

  // Admin: status change
  if (isAdmin) {
    html += `<div class="lead-detail__section"><h3>Review</h3><div class="lead-detail__grid">`;
    html += `<label>Status</label><select onchange="updateExpense('${exp.id}','status',this.value)">`;
    ['pending', 'approved', 'rejected'].forEach(s => { html += `<option value="${s}" ${exp.status === s ? 'selected' : ''}>${s}</option>`; });
    html += `</select>`;
    if (exp.reviewed_by) {
      html += `<label>Reviewed by</label><div style="padding:6px 0">${esc(exp.reviewed_by)}</div>`;
      html += `<label>Reviewed at</label><div style="padding:6px 0">${exp.reviewed_at ? new Date(exp.reviewed_at).toLocaleString() : '-'}</div>`;
    }
    html += `</div></div>`;
  }

  // Receipts
  html += `<div class="lead-detail__section"><h3>Receipts</h3>`;
  html += `<div id="expenseReceiptsList">`;
  if (exp.receipts && exp.receipts.length > 0) {
    exp.receipts.forEach(r => {
      const sizeKB = Math.round((r.size_bytes || 0) / 1024);
      const sizeStr = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + 'MB' : sizeKB + 'KB';
      const isPdf = (r.original_name || '').toLowerCase().endsWith('.pdf');
      const isImage = /\.(jpe?g|png|gif|webp)$/i.test(r.original_name || '');
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:3px 0;border-bottom:1px solid var(--border-subtle)">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          <a href="#" data-action="previewReceipt" data-prevent data-arg0="${esc(r.filename)}" data-arg1="${esc(r.original_name)}" style="color:var(--accent-text);text-decoration:none;cursor:pointer">${esc(r.original_name)}</a>
        </span>
        <span style="color:var(--text-muted);font-size:0.75rem">${sizeStr}</span>
        <button class="btn btn--ghost btn--sm" data-action="downloadAttachment" data-prevent data-arg0="${esc(r.filename)}" data-arg1="${esc(r.original_name)}" title="Download" style="padding:0 4px;color:var(--text-muted)">&#8615;</button>
        ${canEdit ? `<button class="btn btn--ghost btn--sm" data-action="deleteExpenseReceipt" data-arg0="${exp.id}" data-arg1="${r.id}" title="Delete" style="padding:0 4px;color:var(--text-muted)">&times;</button>` : ''}
      </div>`;
      // Inline preview area
      html += `<div id="receiptPreview_${r.id}" style="margin:4px 0 8px;display:none"></div>`;
    });
  } else {
    html += `<div style="color:var(--text-muted);font-size:0.78rem">No receipts attached</div>`;
  }
  html += `</div>`;
  if (canEdit) {
    html += `<div style="display:flex;gap:6px;align-items:center;margin-top:8px">
      <input type="file" id="expenseReceiptInput" style="font-size:0.75rem;color:var(--text-secondary);max-width:200px">
      <button class="btn btn--sm btn--primary" data-action="uploadExpenseReceipt" data-arg0="${exp.id}">Upload Receipt</button>
    </div>`;
  }
  html += `</div>`;

  // Save & Close + Delete
  html += `<div class="lead-detail__section" style="display:flex;gap:8px;align-items:center;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-default)">
    <button class="btn btn--primary" data-action="closeExpenseDetail" style="flex:1">Save &amp; Close</button>`;
  if (canEdit) {
    html += `<button class="btn btn--danger" data-action="deleteExpense" data-arg0="${exp.id}">Delete</button>`;
  }
  html += `</div>`;

  html += `</div>`;
  panel.innerHTML = html;
}

/** Update a single field on an expense via PATCH and refresh the view */
async function updateExpense(id, field, value) {
  const resp = await authFetch('/api/expenses/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value })
  });
  if (resp.ok) {
    await refreshExpenses();
    if (_expenseDetailId === id) openExpenseDetail(id);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Update failed', 'error');
  }
}

/** Delete an expense permanently after confirmation */
async function deleteExpense(id) {
  if (!(await themedConfirm('Delete this expense permanently?'))) return;
  const resp = await authFetch('/api/expenses/' + id, { method: 'DELETE' });
  if (resp.ok) {
    closeExpenseDetail();
    await refreshExpenses();
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Delete failed', 'error');
  }
}

/** Upload a receipt, auto-extract fields, create expense, and open detail for review */
async function processReceiptUpload(file) {
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    toast('Processing receipt... (this may take 10-15 seconds)');
    const resp = await authFetch('/api/expenses/from-receipt', {
      method: 'POST',
      body: formData
    });
    if (resp.ok) {
      const result = await resp.json();
      const ext = result.extracted;
      const amtStr = ext.amount ? ` ${ext.currency} ${ext.amount}` : '';
      const vendStr = ext.vendor ? ` — ${ext.vendor.substring(0, 40)}` : '';
      const method = ext.ocrMethod || '';
      toast(`Receipt processed${amtStr}${vendStr}${method === 'unsupported-format' ? ' (HEIC not supported — use JPEG)' : ''}`);
      await refreshExpenses();
      openExpenseDetail(result.id);
    } else {
      const errText = await resp.text();
      if (window._nbiDebug) console.error('[Receipt] Error response:', errText);
      let errMsg = 'Unknown error';
      try { errMsg = JSON.parse(errText).error || errMsg; } catch(e) {}
      toast('Receipt processing failed: ' + errMsg, 'error');
    }
  } catch(e) { toast('Upload error: ' + e.message, 'error'); }
  // Reset input so same file can be uploaded again
  const input = document.getElementById('receiptUploadInput');
  if (input) input.value = '';
}

/** Upload a receipt file attachment to an expense via the API */
async function uploadExpenseReceipt(expenseId) {
  const input = document.getElementById('expenseReceiptInput');
  if (!input || !input.files || !input.files[0]) { toast('Select a file first'); return; }
  const formData = new FormData();
  formData.append('file', input.files[0]);
  try {
    toast('Uploading...');
    const resp = await fetch('/api/expenses/' + expenseId + '/receipts', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    if (resp.ok) { toast('Receipt uploaded'); openExpenseDetail(expenseId); }
    else { toast('Upload failed', 'error'); }
  } catch(e) { toast('Upload error: ' + e.message, 'error'); }
}

/** Delete a receipt attachment from an expense after confirmation */
async function deleteExpenseReceipt(expenseId, receiptId) {
  if (!(await themedConfirm('Delete this receipt?'))) return;
  const resp = await authFetch('/api/expenses/' + expenseId + '/receipts/' + receiptId, { method: 'DELETE' });
  if (resp.ok) { toast('Receipt deleted'); openExpenseDetail(expenseId); }
  else { toast('Delete failed', 'error'); }
}

/** Open a modal dialog for creating a new expense entry */
async function openNewExpenseModal() {
  if (!_expenseCategories) await loadExpenseCategories();

  let html = `<div class="modal-overlay open" id="newExpenseModal" role="dialog" aria-modal="true" data-action="_actRemoveIfSelf" data-pass-event data-pass-el>
    <div class="modal" style="max-width:var(--modal-sm)">
      <h2 style="margin-top:0">New Expense</h2>
      <div class="lead-detail__grid">
        <label class="field-required">Date</label><input type="date" id="newExpDate" value="${new Date().toISOString().slice(0,10)}">
        <label class="field-required">Amount</label><input type="number" id="newExpAmount" step="0.01" placeholder="0.00">
        <label>Currency</label><select id="newExpCurrency">
          <option value="GBP" selected>GBP</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
        <label>Category</label><select id="newExpCategory"><option value="">-- Select --</option>`;
  (_expenseCategories || []).forEach(c => { html += `<option value="${c.id}">${esc(c.name)}</option>`; });
  html += `</select>
        <label class="field-required">Description</label><input type="text" id="newExpDesc" placeholder="What was this expense for?">
        <label>VAT</label><input type="number" id="newExpVat" step="0.01" placeholder="0.00">
        <label>Notes</label><textarea id="newExpNotes" rows="2" style="resize:vertical" placeholder="Additional details..."></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button class="btn" data-action="_actModalRemove" data-arg0="newExpenseModal">Cancel</button>
        <button class="btn btn--primary" data-action="_actWithLoading" data-pass-el data-arg0="submitNewExpense">Create Expense</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  _activateDynamicModal('newExpenseModal');
}

/** Validate and submit the new expense form to the API */
async function submitNewExpense() {
  const modal = document.getElementById('newExpenseModal');
  clearFieldErrors(modal);
  const dateEl = document.getElementById('newExpDate');
  const amountEl = document.getElementById('newExpAmount');
  const descEl = document.getElementById('newExpDesc');
  const date = dateEl.value;
  const amount = amountEl.value;
  const description = descEl.value.trim();

  let valid = true;
  if (!date) { showFieldError(dateEl, 'Date is required'); valid = false; }
  if (!amount) { showFieldError(amountEl, 'Amount is required'); valid = false; }
  if (!description) { showFieldError(descEl, 'Description is required'); valid = false; }
  if (!valid) return;

  const vatVal = document.getElementById('newExpVat').value;
  const body = {
    date,
    amount: parseFloat(amount),
    currency: document.getElementById('newExpCurrency').value || 'GBP',
    category_id: document.getElementById('newExpCategory').value || null,
    description,
    notes: document.getElementById('newExpNotes').value.trim() || null,
    vat_amount: vatVal ? parseFloat(vatVal) : null,
  };

  const resp = await authFetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (resp.ok) {
    const created = await resp.json();
    document.getElementById('newExpenseModal')?.remove();
    await refreshExpenses();
    // Open detail so user can attach receipt
    openExpenseDetail(created.id);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast('Failed to create expense: ' + (err.error || 'Unknown error'), 'error');
  }
}

/** Render the full finances view: KPI cards, P&L statement, pipeline, targets, and charts */
async function renderFinancesView(el) {
  if (!hasPageAccess('finances')) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state__icon" style="font-size:2rem">&#128274;</div><div class="empty-state__title">Access Restricted</div><div class="empty-state__desc">You don't have permission to view this page.</div></div>`;
    return;
  }

  // Load finance entries from server (with localStorage migration on first load)
  if (!window._financeEntriesLoaded) {
    try {
      const feResp = await authFetch('/api/finance/entries');
      if (feResp.ok) {
        _financeEntries = await feResp.json();
        window._financeEntriesLoaded = true;
        // One-time migration: push localStorage entries to server if server is empty
        const lsEntries = JSON.parse(localStorage.getItem('nbi_finance_entries') || '[]');
        if (lsEntries.length > 0 && _financeEntries.length === 0) {
          const migResp = await authFetch('/api/finance/entries/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries: lsEntries }) });
          if (migResp.ok) { const migData = await migResp.json(); _financeEntries = migData.entries || []; localStorage.removeItem('nbi_finance_entries'); toast('Finance entries migrated to server'); }
        } else if (lsEntries.length > 0) { localStorage.removeItem('nbi_finance_entries'); }
      } else { _financeEntries = JSON.parse(localStorage.getItem('nbi_finance_entries') || '[]'); }
    } catch(e) { _financeEntries = JSON.parse(localStorage.getItem('nbi_finance_entries') || '[]'); }
  }
  let S = getFinanceData();

  // Practice filter MUST run BEFORE the P&L calculations so KPI cards,
  // monthly charts, and burn rate all use the filtered data. Moving this
  // after the calculations was the bug Glen caught (2026-04-16).
  const _finPractice = currentFilter.practice || null;
  const _finClientMatchesPractice = (clientName) => {
    if (!_finPractice || !clientName) return !_finPractice;
    const rec = _apiClientsCache[clientName];
    return rec && rec.practice_area === _finPractice;
  };
  if (_finPractice) {
    S = {
      ...S,
      revenue: S.revenue.filter(r => _finClientMatchesPractice(r.client)),
      payroll: S.payroll.filter(r => _finClientMatchesPractice(r.client)),
      opex: [],
    };
    _financeEntries = [];
  }

  // USD conversion helpers (only show if FX rate loaded)
  const hasFx = _fxRate !== null;
  const usdTh = hasFx ? `<th style="text-align:right;font-size:0.75rem;color:var(--text-muted);width:100px">USD</th>` : '';
  const usdTd = (gbp) => hasFx ? `<td style="text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem">${fmtUsd(gbp)}</td>` : '';
  const usdTdBold = (gbp, col) => hasFx ? `<td style="text-align:right;font-family:var(--font-mono);color:${col||'var(--text-muted)'};font-size:0.78rem;font-weight:700">${fmtUsd(gbp)}</td>` : '';
  const colSpan = hasFx ? 3 : 2;

  // ---- CORE FINANCIALS (from editable data + ad-hoc entries) ----
  const annualPayroll = S.payroll.reduce((s,p) => s + p.annual, 0);
  const monthlyPayroll = annualPayroll / 12;
  const contractedRevenue = S.revenue.reduce((s,r) => s + r.annual, 0);
  const monthlyContracted = contractedRevenue / 12;

  // Ad-hoc entries from the Add Entry form
  const recurring = _financeEntries.filter(e => e.type === 'recurring');
  const oneOff = _financeEntries.filter(e => e.type === 'one-off');
  const recurringExp = recurring.filter(e => e.category === 'expense');
  const recurringInc = recurring.filter(e => e.category === 'income');
  const oneOffExp = oneOff.filter(e => e.category === 'expense');
  const oneOffInc = oneOff.filter(e => e.category === 'income');
  const adHocMonthlyExp = recurringExp.reduce((s,e) => s + (parseFloat(e.amount)||0), 0);
  const totalOneOffExp = oneOffExp.reduce((s,e) => s + (parseFloat(e.amount)||0), 0);
  const totalOneOffInc = oneOffInc.reduce((s,e) => s + (parseFloat(e.amount)||0), 0);

  // Structured opex from editable data
  const seedOpexAnnual = (S.opex || []).reduce((s,e) => s + ((parseFloat(e.amount)||0) * 12), 0);

  // Employer cost multiplier (NI + pension + benefits) — editable via data
  const employerCostPct = parseFloat(S.employerCostPct || 15) / 100;
  const billableStaffCost = S.payroll.filter(p => p.billable).reduce((s,p) => s + p.annual, 0);
  const billableFullCost = Math.round(billableStaffCost * (1 + employerCostPct));
  const nonBillableStaffCost = S.payroll.filter(p => !p.billable).reduce((s,p) => s + p.annual, 0);
  const totalStaffFullCost = Math.round(annualPayroll * (1 + employerCostPct));
  const employerCosts = totalStaffFullCost - annualPayroll;

  // Gross Profit = Revenue - Billable Staff (full cost incl. employer contributions)
  const grossProfit = contractedRevenue - billableFullCost;
  const grossMarginPct = contractedRevenue > 0 ? Math.round(grossProfit / contractedRevenue * 100) : 0;

  // Operating costs = Non-billable staff + OpEx + ad-hoc expenses
  const nonBillableFullCost = Math.round(nonBillableStaffCost * (1 + employerCostPct));
  const totalOverheads = nonBillableFullCost + seedOpexAnnual + (adHocMonthlyExp * 12) + totalOneOffExp;
  const otherIncome = totalOneOffInc + (recurringInc.reduce((s,e) => s + (parseFloat(e.amount)||0), 0) * 12);

  // EBITDA / Operating Profit = Gross Profit - Overheads + Other Income
  const netProfit = grossProfit - totalOverheads + otherIncome;
  const netMarginPct = contractedRevenue > 0 ? Math.round(netProfit / contractedRevenue * 100) : 0;
  const monthlyBurn = (totalStaffFullCost / 12) + (seedOpexAnnual / 12) + adHocMonthlyExp;
  const headcount = S.payroll.length;
  const billableCount = S.payroll.filter(p => p.billable).length;
  const utilisationPct = headcount > 0 ? Math.round(billableCount / headcount * 100) : 0;
  const revenuePerHead = headcount > 0 ? contractedRevenue / headcount : 0;
  const target2026 = S.targets.y2026;
  const revenueGap = target2026 - contractedRevenue;

  // Monthly data for charts (spread evenly for now, actual tracking TBD)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyRev = months.map(() => monthlyContracted);
  const monthlyExp = months.map(() => monthlyBurn);

  // Track which sub-view is active
  if (!window._financeSubView) window._financeSubView = 'summary';

  let html = `<div class="report finance-view">`;
  // Practice banner (filter logic already ran above, before calculations)
  if (_finPractice) {
    const p = PRACTICES.find(x => x.value === _finPractice);
    if (p) {
      html += `<div class="practice-mode-banner" style="background:color-mix(in srgb, ${p.colour} 14%, var(--bg-raised));border:1px solid ${p.colour};border-left:4px solid ${p.colour};border-radius:var(--radius-md);padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.colour}"></span><strong style="font-size:0.85rem;color:var(--text-primary)">${esc(p.label)} mode</strong><span style="font-size:0.75rem;color:var(--text-muted);flex:1;min-width:200px">Revenue and staff are filtered to ${esc(p.label)} clients only. Shared costs (OpEx, ad-hoc expenses) are excluded since they cannot be attributed to a single practice.</span><button class="btn btn--sm btn--ghost" data-action="filterByPractice" data-arg0="null">Exit ${esc(p.shortLabel || p.label)}</button></div>`;
    }
  }
  html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:var(--space-lg)">`;
  html += `<div><h1 style="margin:0">NBI Analytics Ltd</h1><div class="report__date">Financial Dashboard &mdash; FY ${new Date().getFullYear()}${hasFx ? ` <span style="margin-left:12px;font-size:0.75rem;padding:2px 8px;border-radius:3px;background:var(--accent-glow);color:var(--accent-text);border:1px solid var(--accent-border)">GBP/USD ${_fxRate.toFixed(4)} <span style="color:var(--text-muted)">(${_fxDate})</span></span>` : ''}</div></div>`;
  // Finance toolbar. Reset is destructive (wipes all financial data) so it is
  // gated to admins only — closes e8b58255 ("big bad button" — non-admins were
  // seeing the Danger Zone reset). Non-admin users see Export buttons but no Reset.
  const isFinAdmin = _currentUser && _currentUser.role === 'admin';
  html += `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-action="exportFinancesCSV"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 1v9M4 7l3 3 3-3M2 12h10"/></svg> Export CSV</button><button class="btn" data-action="exportPnLCSV"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="1" width="10" height="12" rx="1"/><path d="M5 4h4M5 7h4M5 10h2"/></svg> P&amp;L Export</button></div>`;
  html += `</div>`;

  // ===== SUB-VIEW TABS =====
  html += `<div style="display:flex;gap:4px;margin-bottom:var(--space-lg);border-bottom:2px solid var(--border-default);padding-bottom:0">
    <button class="btn ${window._financeSubView === 'summary' ? 'btn--primary' : 'btn--ghost'}" data-action="_actSetFinanceSubView" data-arg0="summary" data-pass-el style="border-radius:var(--radius-sm) var(--radius-sm) 0 0;border-bottom:${window._financeSubView === 'summary' ? '2px solid var(--accent)' : 'none'}">Summary</button>
    <button class="btn ${window._financeSubView === 'monthly' ? 'btn--primary' : 'btn--ghost'}" data-action="_actSetFinanceSubView" data-arg0="monthly" data-pass-el style="border-radius:var(--radius-sm) var(--radius-sm) 0 0;border-bottom:${window._financeSubView === 'monthly' ? '2px solid var(--accent)' : 'none'}">Monthly View</button>
  </div>`;

  // If monthly view, render that and return early (load actuals first)
  if (window._financeSubView === 'monthly') {
    html += renderMonthlyFinanceView(S, months, hasFx);
    html += `</div>`;
    el.innerHTML = html;
    // Load expense actuals async then update badges
    loadExpenseActuals().then(actuals => {
      if (actuals) { window._expenseActuals = actuals; renderActualsBadges(); }
    });
    return;
  }

  // ===== KPI CARDS ROW =====
  html += `<div class="report__section"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:var(--space-md)">`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:var(--success);font-size:1.4rem">&pound;${Math.round(contractedRevenue/1000)}k</div><div class="kpi-card__label">Annual Revenue</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:var(--danger);font-size:1.4rem">&pound;${Math.round(totalStaffFullCost/1000)}k</div><div class="kpi-card__label">Staff Cost<div class="kpi-card__sub" style="font-size:0.75rem;color:var(--text-muted)">incl. ${S.employerCostPct||15}% employer</div></div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:${grossMarginPct >= 20 ? 'var(--success)' : 'var(--danger)'};font-size:1.4rem">${grossMarginPct}%</div><div class="kpi-card__label">Gross Margin</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:${netMarginPct >= 0 ? 'var(--success)' : 'var(--danger)'};font-size:1.4rem">${netMarginPct}%</div><div class="kpi-card__label">Op. Margin</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'};font-size:1.4rem">&pound;${Math.round(netProfit/1000)}k</div><div class="kpi-card__label">Net Profit</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:var(--accent);font-size:1.4rem">&pound;${Math.round(monthlyBurn/1000)}k</div><div class="kpi-card__label">Monthly Burn</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:var(--warning);font-size:1.4rem">&pound;${Math.round(revenuePerHead/1000)}k</div><div class="kpi-card__label">Revenue / Head</div></div>`;
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:var(--accent);font-size:1.4rem">${utilisationPct}%</div><div class="kpi-card__label">Utilisation</div><div class="kpi-card__sub">${billableCount} of ${headcount} billable</div></div>`;
  html += `</div></div>`;


  // ===== MAIN DASHBOARD GRID: P&L (left) + SIDEBAR (right) =====
  const targetPct = Math.round(contractedRevenue / target2026 * 100);
  const WORK_HRS_MONTH = 160; // 8hrs × 20 working days
  html += `<div class="fin-pnl-wrap">`;

  // --- LEFT COLUMN: MONTHLY P&L ---
  html += `<div>`;
  html += `<div class="report__section"><h2>Monthly Income Statement</h2>`;
  html += `<table class="report-table" style="width:100%">`;

  // --- FEE INCOME ---
  html += `<thead><tr><th style="background:var(--success-bg);color:var(--success);border:1px solid var(--success-border)">Fee Income</th><th style="text-align:right;background:var(--success-bg);color:var(--success);border:1px solid var(--success-border);font-size:0.75rem">Monthly</th><th style="text-align:right;background:var(--success-bg);color:var(--success);border:1px solid var(--success-border);font-size:0.75rem">Annual</th>${usdTh}<th style="width:28px;background:var(--success-bg);border:1px solid var(--success-border)"></th></tr></thead><tbody>`;
  S.revenue.forEach((r, i) => {
    const mo = Math.round(r.annual / 12);
    html += `<tr>`;
    html += `<td style="padding-left:20px"><span data-val="${esc(r.client)}" data-action="_actFinStartEdit" data-pass-el data-arg0="revenue" data-arg1="${i}" data-arg2="client" data-arg3="text" style="cursor:pointer" title="Click to edit">${esc(r.client)}</span> <span data-val="${esc(r.type)}" data-action="_actFinStartEdit" data-pass-el data-arg0="revenue" data-arg1="${i}" data-arg2="type" data-arg3="text" style="cursor:pointer;color:var(--text-muted);font-size:0.75rem" title="Click to edit type">(${esc(r.type)})</span></td>`;
    html += `<td style="text-align:right;font-family:var(--font-mono);font-weight:500">${r.annual > 0 ? '&pound;' + mo.toLocaleString() : '<span style="color:var(--text-muted)">TBD</span>'}</td>`;
    html += `<td data-val="${r.annual}" data-action="_actFinStartEdit" data-pass-el data-arg0="revenue" data-arg1="${i}" data-arg2="annual" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem" title="Click to edit annual">&pound;${r.annual > 0 ? r.annual.toLocaleString() : '0'}</td>`;
    html += usdTd(mo);
    html += `<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="finRemoveRow" data-arg0="revenue" data-arg1="${i}" title="Remove">&times;</button></td>`;
    html += `</tr>`;
  });
  if (otherIncome > 0) {
    html += `<tr><td style="padding-left:20px;color:var(--text-muted)">Other Income</td><td style="text-align:right;font-family:var(--font-mono);font-weight:500">&pound;${Math.round(otherIncome/12).toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem">&pound;${Math.round(otherIncome).toLocaleString()}</td>${usdTd(Math.round(otherIncome/12))}<td></td></tr>`;
  }
  // The "+ Add Revenue" button creates a new revenue row for ANY client (existing or new):
  // finAddRow('revenue') pushes a {client:'New Client', annual:0, type:'TBD', ...} row,
  // which can then be edited inline (click the client name / type / annual cells) via finStartEdit.
  // No client lookup is required, so adding revenue for a brand-new client works the same way.
  html += `<tr><td colspan="${3 + (hasFx?1:0) + 1}" style="padding:3px 20px"><button class="btn btn--sm" data-action="finAddRow" data-arg0="revenue" style="font-size:0.75rem;padding:2px 7px">+ Add Revenue</button></td></tr>`;
  const totalFeeIncome = contractedRevenue + otherIncome;
  const totalFeeMonthly = Math.round(totalFeeIncome / 12);
  html += `<tr style="border-top:2px solid var(--border-strong);font-weight:700"><td>Total Fee Income</td><td style="text-align:right;font-family:var(--font-mono);color:var(--success)">&pound;${totalFeeMonthly.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--success);font-size:0.78rem">&pound;${totalFeeIncome.toLocaleString()}</td>${usdTdBold(totalFeeMonthly,'var(--success)')}<td></td></tr>`;
  html += `</tbody>`;

  // --- STAFF (split into Billable / Non-billable sub-groups) ---
  html += `<thead><tr><th style="background:var(--warning-bg);color:var(--warning);border:1px solid var(--warning-border)">Staff</th><th style="text-align:right;background:var(--warning-bg);color:var(--warning);border:1px solid var(--warning-border);font-size:0.75rem">Monthly</th><th style="text-align:right;background:var(--warning-bg);color:var(--warning);border:1px solid var(--warning-border);font-size:0.75rem">Annual</th>${usdTh}<th style="width:28px;background:var(--warning-bg);border:1px solid var(--warning-border)"></th></tr></thead><tbody>`;

  // Billable staff sub-header
  html += `<tr><td colspan="${colSpan + 2}" style="padding:4px 10px;font-size:0.75rem;color:var(--success);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;background:color-mix(in srgb, var(--success) 5%, var(--bg-surface))">Billable (Cost of Revenue)</td></tr>`;
  S.payroll.filter(p => p.billable).forEach(p => {
    const i = S.payroll.indexOf(p);
    const hrRate = Math.round(p.annual / (WORK_HRS_MONTH * 12));
    html += `<tr>`;
    html += `<td style="padding-left:20px"><span data-val="${esc(p.name)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="name" data-arg3="text" style="cursor:pointer" title="Click to edit"><strong>${esc(p.name)}</strong></span> <span data-val="${esc(p.role)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="role" data-arg3="text" style="cursor:pointer;color:var(--text-muted);font-size:0.75rem" title="Click to edit">${esc(p.role)}</span>${p.client ? ` <span data-val="${esc(p.client)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="client" data-arg3="text" style="cursor:pointer;color:var(--text-muted);font-size:0.75rem" title="Click to edit client">&mdash; ${esc(p.client)}</span>` : ''}<div style="font-size:0.75rem;color:var(--text-muted);margin-top:1px;font-family:var(--font-mono)">&pound;${hrRate}/hr &middot; ${WORK_HRS_MONTH} hrs/mo</div></td>`;
    html += `<td data-val="${p.monthly || Math.round(p.annual/12)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="monthly" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);font-weight:500" title="Click to edit monthly">&pound;${(p.monthly || Math.round(p.annual/12)).toLocaleString()}</td>`;
    html += `<td data-val="${p.annual}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="annual" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem" title="Click to edit annual">&pound;${p.annual.toLocaleString()}</td>`;
    html += usdTd(p.monthly || Math.round(p.annual/12));
    html += `<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="finRemoveRow" data-arg0="payroll" data-arg1="${i}" title="Remove">&times;</button></td>`;
    html += `</tr>`;
  });
  const billableMo = Math.round(billableStaffCost / 12);
  html += `<tr style="font-size:0.82rem;color:var(--text-muted)"><td style="padding-left:20px;font-style:italic">Subtotal Billable</td><td style="text-align:right;font-family:var(--font-mono)">&pound;${billableMo.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);font-size:0.78rem">&pound;${billableStaffCost.toLocaleString()}</td>${usdTd(billableMo)}<td></td></tr>`;

  // Non-billable staff sub-header
  html += `<tr><td colspan="${colSpan + 2}" style="padding:4px 10px;font-size:0.75rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;background:color-mix(in srgb, var(--text-muted) 5%, var(--bg-surface))">Non-billable (Overhead)</td></tr>`;
  S.payroll.filter(p => !p.billable).forEach(p => {
    const i = S.payroll.indexOf(p);
    const mo = p.monthly || Math.round(p.annual / 12);
    html += `<tr>`;
    html += `<td style="padding-left:20px"><span data-val="${esc(p.name)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="name" data-arg3="text" style="cursor:pointer" title="Click to edit"><strong>${esc(p.name)}</strong></span> <span data-val="${esc(p.role)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="role" data-arg3="text" style="cursor:pointer;color:var(--text-muted);font-size:0.75rem" title="Click to edit">${esc(p.role)}</span></td>`;
    html += `<td data-val="${mo}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="monthly" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);font-weight:500" title="Click to edit monthly">&pound;${mo.toLocaleString()}</td>`;
    html += `<td data-val="${p.annual}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="annual" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem" title="Click to edit annual">&pound;${p.annual.toLocaleString()}</td>`;
    html += usdTd(mo);
    html += `<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="finRemoveRow" data-arg0="payroll" data-arg1="${i}" title="Remove">&times;</button></td>`;
    html += `</tr>`;
  });
  html += `<tr><td colspan="${colSpan + 2}" style="padding:3px 20px"><button class="btn btn--sm" data-action="finAddRow" data-arg0="payroll" style="font-size:0.75rem;padding:2px 7px">+ Add Staff</button></td></tr>`;

  // Employer costs row
  const ecMo = Math.round(employerCosts / 12);
  html += `<tr style="color:var(--text-muted);font-size:0.82rem"><td style="padding-left:20px;font-style:italic">Employer Costs (NI + Pension) <span data-val="${S.employerCostPct || 15}" data-action="_actFinStartEdit" data-pass-el data-arg0="_root" data-arg1="0" data-arg2="employerCostPct" data-arg3="number" style="cursor:pointer;color:var(--accent-text);font-size:0.75rem" title="Click to edit employer cost %">${S.employerCostPct || 15}%</span></td><td style="text-align:right;font-family:var(--font-mono)">&pound;${ecMo.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);font-size:0.78rem">&pound;${employerCosts.toLocaleString()}</td>${usdTd(ecMo)}<td></td></tr>`;

  // Total Staff
  const staffFullMo = Math.round(totalStaffFullCost / 12);
  html += `<tr style="border-top:2px solid var(--border-strong);font-weight:700"><td>Total Staff Cost</td><td style="text-align:right;font-family:var(--font-mono);color:var(--warning)">&pound;${staffFullMo.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--warning);font-size:0.78rem">&pound;${totalStaffFullCost.toLocaleString()}</td>${usdTdBold(staffFullMo,'var(--warning)')}<td></td></tr>`;

  // Gross Profit (Revenue - Billable Staff Full Cost)
  const gpMonthly = Math.round(grossProfit / 12);
  html += `<tr style="font-weight:700;font-size:1.02rem;background:var(--bg-hover)"><td>Gross Profit <span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">(Revenue - Billable Staff)</span></td><td style="text-align:right;font-family:var(--font-mono);color:${grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">&pound;${gpMonthly.toLocaleString()} <span style="font-size:0.75rem;font-weight:400">(${grossMarginPct}%)</span></td><td style="text-align:right;font-family:var(--font-mono);color:${grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'};font-size:0.78rem">&pound;${grossProfit.toLocaleString()}</td>${usdTdBold(gpMonthly, grossProfit >= 0 ? 'var(--success)' : 'var(--danger)')}<td></td></tr>`;
  html += `</tbody>`;

  // --- OPERATING EXPENSES ---
  html += `<thead><tr><th style="background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border)">Operating Expenses</th><th style="text-align:right;background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);font-size:0.75rem">Monthly</th><th style="text-align:right;background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);font-size:0.75rem">Annual</th>${usdTh}<th style="width:28px;background:var(--danger-bg);border:1px solid var(--danger-border)"></th></tr></thead><tbody>`;
  if ((S.opex || []).length > 0 || recurringExp.length > 0) {
    (S.opex || []).forEach((e, i) => {
      const mo = parseFloat(e.amount) || 0;
      const yr = Math.round(mo * 12);
      html += `<tr>`;
      html += `<td style="padding-left:20px"><span data-val="${esc(e.name)}" data-action="_actFinStartEdit" data-pass-el data-arg0="opex" data-arg1="${i}" data-arg2="name" data-arg3="text" style="cursor:pointer" title="Click to edit">${esc(e.name)}</span> <span data-val="${esc(e.tag||'')}" data-action="_actFinStartEdit" data-pass-el data-arg0="opex" data-arg1="${i}" data-arg2="tag" data-arg3="text" style="cursor:pointer;color:var(--text-muted);font-size:0.75rem" title="Click to edit tag">${esc(e.tag||'')}</span></td>`;
      html += `<td data-val="${e.amount}" data-action="_actFinStartEdit" data-pass-el data-arg0="opex" data-arg1="${i}" data-arg2="amount" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);font-weight:500" title="Click to edit monthly">&pound;${mo.toLocaleString()}</td>`;
      html += `<td style="text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem">&pound;${yr.toLocaleString()}</td>`;
      html += usdTd(mo);
      html += `<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="finRemoveRow" data-arg0="opex" data-arg1="${i}" title="Remove">&times;</button></td>`;
      html += `</tr>`;
    });
    recurringExp.forEach(e => {
      const idx = _financeEntries.indexOf(e);
      const mo = parseFloat(e.amount) || 0;
      html += `<tr><td style="padding-left:20px">${esc(e.name)} <span style="color:var(--text-muted);font-size:0.75rem">${esc(e.tag||'')}</span></td><td style="text-align:right;font-family:var(--font-mono);font-weight:500">&pound;${mo.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem">&pound;${Math.round(mo*12).toLocaleString()}</td>${usdTd(mo)}<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="removeFinanceEntry" data-arg0="${idx}">&times;</button></td></tr>`;
    });
  }
  html += `<tr><td colspan="${3 + (hasFx?1:0) + 1}" style="padding:3px 20px"><button class="btn btn--sm" data-action="finAddRow" data-arg0="opex" style="font-size:0.75rem;padding:2px 7px">+ Add Expense</button></td></tr>`;
  if (oneOffExp.length > 0) {
    html += `<tr><td colspan="${3 + (hasFx?1:0) + 1}" style="padding-left:10px;font-size:0.75rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-top:6px">One-off Costs</td></tr>`;
    oneOffExp.forEach(e => {
      const idx = _financeEntries.indexOf(e);
      const amt = parseFloat(e.amount) || 0;
      html += `<tr><td style="padding-left:20px">${esc(e.name)} <span style="color:var(--text-muted);font-size:0.75rem">${esc(e.tag||'')}</span></td><td style="text-align:right;font-family:var(--font-mono);font-weight:500">&pound;${amt.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem">&mdash;</td>${usdTd(amt)}<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="removeFinanceEntry" data-arg0="${idx}">&times;</button></td></tr>`;
    });
  }
  const ohMonthly = Math.round(totalOverheads / 12);
  html += `<tr style="border-top:2px solid var(--border-strong);font-weight:700"><td>Total Operating Expenses</td><td style="text-align:right;font-family:var(--font-mono);color:var(--danger)">&pound;${ohMonthly.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--danger);font-size:0.78rem">&pound;${Math.round(totalOverheads).toLocaleString()}</td>${usdTdBold(ohMonthly,'var(--danger)')}<td></td></tr>`;
  html += `</tbody>`;

  // --- OPERATING PROFIT ---
  const npMonthly = Math.round(netProfit / 12);
  html += `<tbody><tr style="font-weight:700;font-size:1.05rem;border-top:3px double var(--border-strong);background:var(--bg-hover)"><td>Operating Profit (EBIT)</td><td style="text-align:right;font-family:var(--font-mono);color:${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">&pound;${npMonthly.toLocaleString()} <span style="font-size:0.75rem;font-weight:400">(${netMarginPct}%)</span></td><td style="text-align:right;font-family:var(--font-mono);color:${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'};font-size:0.78rem">&pound;${Math.round(netProfit).toLocaleString()}</td>${usdTdBold(npMonthly, netProfit >= 0 ? 'var(--success)' : 'var(--danger)')}<td></td></tr></tbody>`;
  html += `</table></div>`;
  html += `</div>`; // close left column

  // --- RIGHT COLUMN: SIDEBAR ---
  html += `<div class="fin-sidebar">`;

  // Consulting Metrics (compact 2x2)
  html += `<div class="report__section"><h2>Consulting Metrics</h2>`;
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm)">`;
  html += `<div class="kpi-card" style="padding:var(--space-md)"><div class="kpi-card__value" style="color:${grossMarginPct >= 20 ? 'var(--success)' : grossMarginPct >= 10 ? 'var(--warning)' : 'var(--danger)'};font-size:1.1rem">${grossMarginPct}%</div><div class="kpi-card__label">Gross Margin</div></div>`;
  html += `<div class="kpi-card" style="padding:var(--space-md)"><div class="kpi-card__value" style="color:${netMarginPct >= 0 ? 'var(--success)' : 'var(--danger)'};font-size:1.1rem">${netMarginPct}%</div><div class="kpi-card__label">Op. Margin</div></div>`;
  html += `<div class="kpi-card" style="padding:var(--space-md)"><div class="kpi-card__value" style="color:${utilisationPct >= 60 ? 'var(--success)' : 'var(--warning)'};font-size:1.1rem">${utilisationPct}%</div><div class="kpi-card__label">Utilisation<div style="font-size:0.75rem;color:var(--text-muted)">${billableCount}/${headcount} billable</div></div></div>`;
  html += `<div class="kpi-card" style="padding:var(--space-md)"><div class="kpi-card__value" style="color:var(--warning);font-size:1.1rem">&pound;${Math.round(monthlyBurn/1000)}k</div><div class="kpi-card__label">Monthly Burn</div></div>`;
  const profitCoverMonths = monthlyBurn > 0 ? Math.round(netProfit / monthlyBurn * 10) / 10 : 0;
  html += `<div class="kpi-card" style="padding:var(--space-md)"><div class="kpi-card__value" style="color:${profitCoverMonths >= 6 ? 'var(--success)' : profitCoverMonths >= 3 ? 'var(--warning)' : 'var(--danger)'};font-size:1.1rem">${profitCoverMonths > 0 ? profitCoverMonths + 'mo' : 'N/A'}</div><div class="kpi-card__label">Profit Cover</div></div>`;
  html += `</div></div>`;

  // P&L Summary (mini waterfall)
  const pnlItems = [
    { label: 'Revenue', value: contractedRevenue, col: 'var(--success)' },
    { label: 'Billable Staff', value: -billableFullCost, col: 'var(--danger)' },
    { label: 'Gross Profit', value: grossProfit, col: grossProfit >= 0 ? 'var(--success)' : 'var(--danger)' },
    { label: 'Support Staff', value: -nonBillableFullCost, col: 'var(--warning)' },
    { label: 'OpEx', value: -(seedOpexAnnual + (adHocMonthlyExp*12) + totalOneOffExp), col: 'var(--danger)' },
    { label: 'Other Income', value: otherIncome, col: 'var(--accent)' },
    { label: 'Net Profit', value: netProfit, col: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' },
  ];
  const pnlMax = Math.max(...pnlItems.map(i => Math.abs(i.value)), 1);
  html += `<div class="report__section"><h2>P&L Summary</h2>`;
  html += `<div style="display:flex;flex-direction:column;gap:4px">`;
  pnlItems.forEach(item => {
    const pct = Math.abs(item.value) / pnlMax * 100;
    const sign = item.value >= 0 ? '' : '-';
    html += `<div style="display:flex;align-items:center;gap:6px">
      <span style="min-width:85px;font-size:0.75rem;color:var(--text-secondary)">${item.label}</span>
      <div style="flex:1;height:14px;background:var(--border-subtle);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${item.col};border-radius:3px"></div></div>
      <span style="min-width:55px;text-align:right;font-family:var(--font-mono);font-size:0.75rem;font-weight:600;color:${item.col}">${sign}&pound;${Math.round(Math.abs(item.value)/1000)}k</span>
    </div>`;
  });
  html += `</div></div>`;

  // Revenue Target
  html += `<div class="report__section"><h2>2026 Revenue Target</h2>`;
  html += `<div style="display:flex;align-items:center;gap:var(--space-lg);padding:var(--space-md) 0">`;
  html += `<div>${renderProgressRing(Math.min(targetPct, 100), 90)}</div>`;
  html += `<div><div style="font-family:var(--font-mono);font-size:0.85rem;color:var(--text-primary)">&pound;${Math.round(contractedRevenue/1000)}k / &pound;${Math.round(target2026/1000)}k</div><div style="font-size:0.78rem;color:var(--danger);margin-top:2px">Gap: &pound;${Math.round(revenueGap/1000)}k</div></div>`;
  html += `</div></div>`;

  // Revenue by Client (compact bars)
  html += `<div class="report__section"><h2>Revenue by Client</h2>`;
  const maxRevClient = Math.max(...S.revenue.map(r => r.annual), 1);
  html += `<div style="display:flex;flex-direction:column;gap:6px">`;
  S.revenue.filter(r => r.annual > 0).forEach(r => {
    html += `<div style="display:flex;align-items:center;gap:6px"><span style="min-width:90px;font-size:0.75rem;color:var(--text-secondary)">${esc(r.client)}</span><div style="flex:1;height:18px;background:var(--border-subtle);border-radius:3px;overflow:hidden"><div style="height:100%;width:${r.annual/maxRevClient*100}%;background:var(--success);border-radius:3px"></div></div><span style="min-width:50px;text-align:right;font-family:var(--font-mono);font-size:0.75rem;font-weight:600">&pound;${Math.round(r.annual/1000)}k</span></div>`;
  });
  html += `</div></div>`;

  // Revenue Pipeline (compact)
  html += `<div class="report__section"><h2>Revenue Pipeline</h2>`;
  html += `<table class="report-table" style="width:100%;font-size:0.75rem"><thead><tr><th>Opportunity</th><th>Range</th><th>Prob.</th><th style="width:22px"></th></tr></thead><tbody>`;
  S.pipeline.forEach((p, i) => {
    const probCol = p.probability === 'High' ? 'var(--success)' : p.probability === 'Medium' ? 'var(--warning)' : 'var(--text-muted)';
    html += `<tr>`;
    html += `<td><strong data-val="${esc(p.client)}" data-action="_actFinStartEdit" data-pass-el data-arg0="pipeline" data-arg1="${i}" data-arg2="client" data-arg3="text" style="cursor:pointer" title="Click to edit">${esc(p.client)}</strong>`;
    if (p.notes) html += `<div style="font-size:0.75rem;color:var(--text-muted)">${esc(p.notes)}</div>`;
    html += `</td>`;
    html += `<td style="font-family:var(--font-mono);white-space:nowrap"><span data-val="${p.low}" data-action="_actFinStartEdit" data-pass-el data-arg0="pipeline" data-arg1="${i}" data-arg2="low" data-arg3="number" style="cursor:pointer" title="Click to edit">&pound;${(p.low/1000).toFixed(0)}k</span>&ndash;<span data-val="${p.high}" data-action="_actFinStartEdit" data-pass-el data-arg0="pipeline" data-arg1="${i}" data-arg2="high" data-arg3="number" style="cursor:pointer" title="Click to edit">&pound;${(p.high/1000).toFixed(0)}k</span></td>`;
    html += `<td data-val="${esc(p.probability)}" data-action="_actFinStartEdit" data-pass-el data-arg0="pipeline" data-arg1="${i}" data-arg2="probability" data-arg3="text" style="cursor:pointer;color:${probCol}" title="Click to edit">${esc(p.probability)}</td>`;
    html += `<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.8rem" data-action="finRemoveRow" data-arg0="pipeline" data-arg1="${i}" title="Remove">&times;</button></td>`;
    html += `</tr>`;
  });
  html += `<tr><td colspan="4" style="padding:3px 0"><button class="btn btn--sm" data-action="finAddRow" data-arg0="pipeline" style="font-size:0.75rem;padding:2px 6px">+ Add Opportunity</button></td></tr>`;
  html += `</tbody></table></div>`;

  html += `</div>`; // close fin-sidebar
  html += `</div>`; // close fin-pnl-wrap

  // ===== MONTHLY REVENUE vs EXPENSES (full width below) =====
  html += `<div class="report__section"><div class="chart-card chart-card--compact"><div class="chart-card__title">Monthly Revenue vs Expenses (FY ${new Date().getFullYear()})</div>`;
  html += renderMonthlyBarChart(months, monthlyRev, monthlyExp);
  html += `</div></div>`;


  // ===== ADD ENTRY FORM =====
  html += `<div class="report__section"><h2>Add Financial Entry</h2>`;
  html += `<div style="background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:var(--space-lg)">`;
  html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:var(--space-md);margin-bottom:var(--space-md)">`;
  html += `<div><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px">Name</label><input id="finName" placeholder="e.g. Office 365" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"></div>`;
  html += `<div><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px">Amount (&pound;)</label><input id="finAmount" type="number" step="0.01" min="0" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-mono);font-size:0.85rem"></div>`;
  html += `<div><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px">Category</label><select id="finCategory" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"><option value="expense">Expense</option><option value="income">Income</option></select></div>`;
  html += `<div><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px">Type</label><select id="finType" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"><option value="recurring">Monthly Recurring</option><option value="one-off">One-off</option></select></div>`;
  html += `<div><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px">Tag</label><select id="finTag" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"><option value="">Select...</option><option value="Software">Software</option><option value="Salary">Salary</option><option value="Contractor">Contractor</option><option value="Infrastructure">Infrastructure</option><option value="Marketing">Marketing</option><option value="Office">Office</option><option value="Legal">Legal</option><option value="Insurance">Insurance</option><option value="Travel">Travel</option><option value="Training">Training</option><option value="AI/Software">AI/Software</option><option value="Other">Other</option></select></div>`;
  html += `<div><label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:4px">Date</label><input id="finDate" type="date" value="${new Date().toISOString().split('T')[0]}" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"></div>`;
  html += `</div>`;
  html += `<button class="btn btn--primary" data-action="addFinanceEntry"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 1v12M1 7h12"/></svg> Add Entry</button>`;
  html += `</div></div>`;

  // ===== RECURRING EXPENSES CARDS =====
  const allRecurringExp = recurringExp;
  if (allRecurringExp.length > 0) {
    const monthTotal = allRecurringExp.reduce((s,e) => s + (parseFloat(e.amount)||0), 0);
    const tagColours = {};
    const palette = ['#ef4444','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1'];
    allRecurringExp.forEach((e,i) => { if (!tagColours[e.tag||'Other']) tagColours[e.tag||'Other'] = palette[Object.keys(tagColours).length % palette.length]; });
    html += `<div class="report__section"><h2>Monthly Recurring Costs <span style="font-family:var(--font-mono);font-weight:400;font-size:0.85rem;color:var(--danger)">&pound;${monthTotal.toLocaleString()}/mo</span></h2>`;
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--space-md)">`;
    allRecurringExp.forEach(e => {
      const idx = _financeEntries.indexOf(e);
      const col = tagColours[e.tag||'Other'] || 'var(--danger)';
      html += `<div style="background:var(--bg-card);border:1px solid var(--border-default);border-left:3px solid ${col};border-radius:var(--radius-md);padding:var(--space-md) var(--space-lg);display:flex;justify-content:space-between;align-items:center">`;
      html += `<div><div style="font-weight:500;font-size:0.88rem;margin-bottom:2px">${esc(e.name)}</div><div style="font-size:0.75rem;color:var(--text-muted)">${esc(e.tag || 'Other')}</div></div>`;
      html += `<div style="display:flex;align-items:center;gap:8px"><span style="font-family:var(--font-mono);font-weight:600;color:var(--danger);font-size:0.95rem">&pound;${(parseFloat(e.amount) || 0).toLocaleString()}</span>`;
      html += `<button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.9rem;padding:2px" data-action="removeFinanceEntry" data-arg0="${idx}" title="Remove">&times;</button></div></div>`;
    });
    html += `</div></div>`;
  }

  // One-off transactions
  if (oneOff.length > 0) {
    html += `<div class="report__section"><h2>One-off Transactions</h2>`;
    html += `<table class="report-table"><thead><tr><th>Date</th><th>Name</th><th>Tag</th><th>Type</th><th style="text-align:right">Amount</th><th style="width:40px"></th></tr></thead><tbody>`;
    oneOff.sort((a,b) => (b.date||'').localeCompare(a.date||'')).forEach(e => {
      const idx = _financeEntries.indexOf(e);
      const isInc = e.category === 'income';
      const col = isInc ? 'var(--success)' : 'var(--danger)';
      html += `<tr><td style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap">${e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '-'}</td><td><strong>${esc(e.name)}</strong></td><td style="color:var(--text-muted);font-size:0.82rem">${esc(e.tag||'-')}</td><td><span style="font-size:0.75rem;padding:2px 8px;border-radius:3px;background:${isInc?'var(--success-bg)':'var(--danger-bg)'};color:${col};border:1px solid ${isInc?'var(--success-border)':'var(--danger-border)'}">${isInc?'Income':'Expense'}</span></td><td style="text-align:right;font-family:var(--font-mono);font-weight:600;color:${col}">${isInc?'+':'-'}&pound;${(parseFloat(e.amount) || 0).toLocaleString()}</td><td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.9rem" data-action="removeFinanceEntry" data-arg0="${idx}">&times;</button></td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
}

/** Load actual expense data grouped by month and category from the expense reports */
async function loadExpenseActuals() {
  try {
    const data = await apiCall('/api/expenses');
    if (!data) return null;
    const expenses = Array.isArray(data) ? data : (data.expenses || []);
    // Group by month (1-12) and category for current financial year
    const fy = new Date().getFullYear();
    const actuals = {};
    expenses.forEach(e => {
      const d = e.date ? new Date(e.date) : null;
      if (!d || d.getFullYear() !== fy) return;
      const monthKey = `${fy}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!actuals[monthKey]) actuals[monthKey] = { total: 0 };
      const cat = e.category_name || 'Other';
      actuals[monthKey][cat] = (actuals[monthKey][cat] || 0) + (parseFloat(e.amount) || 0);
      actuals[monthKey].total += parseFloat(e.amount) || 0;
    });
    return actuals;
  } catch(e) { return null; }
}

/** Render actual vs forecast badges on monthly view cells */
function renderActualsBadges() {
  const actuals = window._expenseActuals;
  if (!actuals) return;
  const now = new Date();
  const curMonth = now.getMonth();
  // Find the actuals summary row and inject it
  const summaryEl = document.getElementById('monthlyActualsSummary');
  if (!summaryEl) return;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let html = '<tr style="font-size:0.78rem;color:var(--accent-text);background:color-mix(in srgb, var(--accent) 6%, var(--bg-surface))"><td style="position:sticky;left:0;background:color-mix(in srgb, var(--accent) 6%, var(--bg-surface));z-index:1;font-weight:600">Actual Spend (from expenses)</td>';
  let totalActual = 0;
  months.forEach((m, mi) => {
    const key = `2026-${String(mi + 1).padStart(2, '0')}`;
    const val = actuals[key] ? Math.round(actuals[key].total) : 0;
    totalActual += val;
    const hasData = mi <= curMonth && val > 0;
    html += `<td style="text-align:right;font-family:var(--font-mono);color:${hasData ? 'var(--accent-text)' : 'var(--text-muted)'}">${hasData ? '&pound;' + val.toLocaleString() : '-'}</td>`;
  });
  html += `<td style="text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--accent-text)">&pound;${totalActual.toLocaleString()}</td></tr>`;
  summaryEl.innerHTML = html;
}

/** Render month-by-month financial view — months across top, categories down left, all editable */
function renderMonthlyFinanceView(S, months, hasFx) {
  const contractedRevenue = S.revenue.reduce((s,r) => s + r.annual, 0);
  const annualPayroll = S.payroll.reduce((s,p) => s + p.annual, 0);

  // Monthly overrides stored in localStorage (editable cells)
  if (!window._monthlyOverrides) {
    try { window._monthlyOverrides = JSON.parse(localStorage.getItem('nbi_monthly_overrides') || '{}'); } catch(e) { window._monthlyOverrides = {}; }
  }
  const MO = window._monthlyOverrides;

  /** Get an editable monthly override value, falling back to the default if not set */
  function getVal(key, defaultVal) { return MO[key] !== undefined ? parseFloat(MO[key]) : defaultVal; }

  // Editable cell renderer
  const thStyle = 'text-align:right;font-size:0.75rem;min-width:68px;padding:4px 6px';
  const cellStyle = 'text-align:right;font-family:var(--font-mono);font-size:0.78rem;padding:2px 4px';
  /** Render an editable table cell with a number input that saves monthly overrides on change */
  function editCell(key, val, colour) {
    const v = Math.round(val);
    return `<td style="${cellStyle}"><input type="number" value="${v}" style="width:70px;text-align:right;font-family:var(--font-mono);font-size:0.78rem;padding:2px 4px;background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:3px;color:${colour || 'var(--text-primary)'}" onchange="updateMonthlyOverride('${key}',this.value)"></td>`;
  }
  /** Render a read-only table cell with formatted GBP value */
  function roCell(val, colour, bold) {
    const v = Math.round(val);
    return `<td style="${cellStyle};color:${colour || 'var(--text-primary)'};${bold ? 'font-weight:700' : ''}">&pound;${v.toLocaleString()}</td>`;
  }

  // Month header row
  const now = new Date();
  const curMonth = now.getMonth();
  let html = `<div class="report__section"><h2>Monthly P&amp;L &mdash; FY ${new Date().getFullYear()}</h2>
    <div style="overflow-x:auto"><table class="report-table" style="width:100%;min-width:1100px;font-size:0.82rem">
    <thead><tr><th style="min-width:200px;position:sticky;left:0;background:var(--bg-surface);z-index:1">Category</th>`;
  months.forEach((m, i) => {
    const isFuture = i > curMonth;
    const cur = i === curMonth ? 'background:color-mix(in srgb, var(--accent) 15%, var(--bg-surface));font-weight:700' :
      (isFuture ? 'opacity:0.6;font-style:italic' : 'background:color-mix(in srgb, var(--success) 6%, var(--bg-surface))');
    const label = isFuture ? m + ' <span style="font-size:0.75rem;display:block;font-style:italic">forecast</span>' :
      (i === curMonth ? m + ' <span style="font-size:0.75rem;display:block;font-weight:400">current</span>' :
      m + ' <span style="font-size:0.75rem;display:block;color:var(--success)">actual</span>');
    html += `<th style="${thStyle};${cur}">${label}</th>`;
  });
  html += `<th style="${thStyle};font-weight:700">FY Total</th></tr></thead><tbody>`;

  // ===== REVENUE SECTION =====
  html += `<tr style="background:var(--success-bg);border-top:2px solid var(--success-border)"><td colspan="${months.length + 2}" style="font-weight:700;color:var(--success);padding:6px 8px">Revenue</td></tr>`;
  S.revenue.forEach((r, ri) => {
    const defaultMo = Math.round(r.annual / 12);
    let rowTotal = 0;
    html += `<tr><td style="padding-left:20px;position:sticky;left:0;background:var(--bg-surface);z-index:1">${esc(r.client)} <span style="color:var(--text-muted);font-size:0.75rem">(${esc(r.type)})</span></td>`;
    months.forEach((_, mi) => {
      const key = `rev.${ri}.${mi}`;
      const val = getVal(key, defaultMo);
      rowTotal += val;
      html += editCell(key, val, 'var(--success)');
    });
    html += roCell(rowTotal, 'var(--success)', true);
    html += `</tr>`;
  });
  // Revenue total row
  html += `<tr style="background:var(--bg-surface);font-weight:700"><td style="position:sticky;left:0;background:var(--bg-surface);z-index:1">Total Revenue</td>`;
  let annualRevTotal = 0;
  months.forEach((_, mi) => {
    let moTotal = 0;
    S.revenue.forEach((r, ri) => { moTotal += getVal(`rev.${ri}.${mi}`, Math.round(r.annual / 12)); });
    annualRevTotal += moTotal;
    html += roCell(moTotal, 'var(--success)', true);
  });
  html += roCell(annualRevTotal, 'var(--success)', true);
  html += `</tr>`;

  // ===== PAYROLL SECTION =====
  html += `<tr style="background:var(--danger-bg);border-top:2px solid var(--danger-border)"><td colspan="${months.length + 2}" style="font-weight:700;color:var(--danger);padding:6px 8px">Payroll</td></tr>`;
  S.payroll.forEach((p, pi) => {
    const defaultMo = Math.round(p.annual / 12);
    let rowTotal = 0;
    html += `<tr><td style="padding-left:20px;position:sticky;left:0;background:var(--bg-surface);z-index:1">${esc(p.name)} <span style="color:var(--text-muted);font-size:0.75rem">${esc(p.role)}${p.billable ? ' (billable)' : ''}</span></td>`;
    months.forEach((_, mi) => {
      const key = `pay.${pi}.${mi}`;
      const val = getVal(key, defaultMo);
      rowTotal += val;
      html += editCell(key, val, 'var(--danger)');
    });
    html += roCell(rowTotal, 'var(--danger)', true);
    html += `</tr>`;
  });
  // Payroll total
  html += `<tr style="background:var(--bg-surface);font-weight:700"><td style="position:sticky;left:0;background:var(--bg-surface);z-index:1">Total Payroll</td>`;
  let annualPayTotal = 0;
  months.forEach((_, mi) => {
    let moTotal = 0;
    S.payroll.forEach((p, pi) => { moTotal += getVal(`pay.${pi}.${mi}`, Math.round(p.annual / 12)); });
    annualPayTotal += moTotal;
    html += roCell(moTotal, 'var(--danger)', true);
  });
  html += roCell(annualPayTotal, 'var(--danger)', true);
  html += `</tr>`;

  // ===== OPERATING EXPENSES SECTION =====
  html += `<tr style="background:var(--warning-bg);border-top:2px solid var(--warning-border)"><td colspan="${months.length + 2}" style="font-weight:700;color:var(--warning);padding:6px 8px">Operating Expenses</td></tr>`;
  const opexItems = S.opex || [];
  opexItems.forEach((o, oi) => {
    const defaultMo = parseFloat(o.amount) || 0;
    let rowTotal = 0;
    html += `<tr><td style="padding-left:20px;position:sticky;left:0;background:var(--bg-surface);z-index:1">${esc(o.name)}</td>`;
    months.forEach((_, mi) => {
      const key = `opex.${oi}.${mi}`;
      const val = getVal(key, defaultMo);
      rowTotal += val;
      html += editCell(key, val, 'var(--text-muted)');
    });
    html += roCell(rowTotal, 'var(--text-muted)', true);
    html += `</tr>`;
  });
  // OpEx total
  html += `<tr style="background:var(--bg-surface);font-weight:700"><td style="position:sticky;left:0;background:var(--bg-surface);z-index:1">Total OpEx</td>`;
  let annualOpexTotal = 0;
  months.forEach((_, mi) => {
    let moTotal = 0;
    opexItems.forEach((o, oi) => { moTotal += getVal(`opex.${oi}.${mi}`, parseFloat(o.amount) || 0); });
    annualOpexTotal += moTotal;
    html += roCell(moTotal, 'var(--text-muted)', true);
  });
  html += roCell(annualOpexTotal, 'var(--text-muted)', true);
  html += `</tr>`;

  // ===== SUMMARY SECTION =====
  html += `<tr style="border-top:3px solid var(--border-default)"><td colspan="${months.length + 2}"></td></tr>`;
  // Gross Profit
  html += `<tr style="font-weight:700"><td style="position:sticky;left:0;background:var(--bg-surface);z-index:1">Gross Profit</td>`;
  let annualGross = 0;
  months.forEach((_, mi) => {
    let rev = 0, cos = 0;
    S.revenue.forEach((r, ri) => { rev += getVal(`rev.${ri}.${mi}`, Math.round(r.annual / 12)); });
    S.payroll.filter(p => p.billable).forEach((p, pi) => {
      const idx = S.payroll.indexOf(p);
      cos += getVal(`pay.${idx}.${mi}`, Math.round(p.annual / 12));
    });
    const gp = rev - cos;
    annualGross += gp;
    html += roCell(gp, gp >= 0 ? 'var(--success)' : 'var(--danger)', true);
  });
  html += roCell(annualGross, annualGross >= 0 ? 'var(--success)' : 'var(--danger)', true);
  html += `</tr>`;

  // Net Profit
  html += `<tr style="font-weight:700;background:var(--bg-surface)"><td style="position:sticky;left:0;background:var(--bg-surface);z-index:1">Net Profit / Loss</td>`;
  let annualNet = 0;
  months.forEach((_, mi) => {
    let rev = 0, pay = 0, opex = 0;
    S.revenue.forEach((r, ri) => { rev += getVal(`rev.${ri}.${mi}`, Math.round(r.annual / 12)); });
    S.payroll.forEach((p, pi) => { pay += getVal(`pay.${pi}.${mi}`, Math.round(p.annual / 12)); });
    opexItems.forEach((o, oi) => { opex += getVal(`opex.${oi}.${mi}`, parseFloat(o.amount) || 0); });
    const net = rev - pay - opex;
    annualNet += net;
    html += roCell(net, net >= 0 ? 'var(--success)' : 'var(--danger)', true);
  });
  html += roCell(annualNet, annualNet >= 0 ? 'var(--success)' : 'var(--danger)', true);
  html += `</tr>`;

  // Cumulative P&L
  html += `<tr style="font-weight:600"><td style="position:sticky;left:0;background:var(--bg-surface);z-index:1;color:var(--text-muted)">Cumulative P&amp;L</td>`;
  let cum = 0;
  months.forEach((_, mi) => {
    let rev = 0, pay = 0, opex = 0;
    S.revenue.forEach((r, ri) => { rev += getVal(`rev.${ri}.${mi}`, Math.round(r.annual / 12)); });
    S.payroll.forEach((p, pi) => { pay += getVal(`pay.${pi}.${mi}`, Math.round(p.annual / 12)); });
    opexItems.forEach((o, oi) => { opex += getVal(`opex.${oi}.${mi}`, parseFloat(o.amount) || 0); });
    cum += rev - pay - opex;
    html += roCell(cum, cum >= 0 ? 'var(--success)' : 'var(--danger)', false);
  });
  html += roCell(cum, cum >= 0 ? 'var(--success)' : 'var(--danger)', true);
  html += `</tr>`;

  // Pipeline weighted revenue row
  const pipelineWeighted = (S.pipeline || []).reduce((s, p) => {
    const mid = ((p.low || 0) + (p.high || 0)) / 2;
    const prob = p.probability === 'High' ? 0.75 : p.probability === 'Medium' ? 0.5 : 0.25;
    return s + (mid * prob);
  }, 0);
  if (pipelineWeighted > 0) {
    const pwMonthly = Math.round(pipelineWeighted / 12);
    html += `<tr style="font-size:0.78rem;color:var(--text-muted);font-style:italic"><td style="position:sticky;left:0;background:var(--bg-surface);z-index:1">Pipeline (Weighted Estimate)</td>`;
    months.forEach((_, mi) => {
      // Only show pipeline for future months
      html += `<td style="text-align:right;font-family:var(--font-mono)">${mi > curMonth ? '+&pound;' + pwMonthly.toLocaleString() : '-'}</td>`;
    });
    html += `<td style="text-align:right;font-family:var(--font-mono);font-weight:600">+&pound;${Math.round(pipelineWeighted).toLocaleString()}</td></tr>`;
  }

  // Actuals row (populated async after render)
  html += `<tbody id="monthlyActualsSummary"></tbody>`;

  // Forecast vs Actual legend
  const curMo = now.getMonth();
  html += `</table></div>
    <div style="display:flex;gap:16px;margin-top:8px;font-size:0.75rem;color:var(--text-muted)">
      <span>&#9632; <strong style="color:var(--accent-text)">Actual</strong> = from expense reports (Jan${curMo > 0 ? '-' + months[curMo] : ''})</span>
      <span>&#9633; <strong>Forecast</strong> = projected (${months[Math.min(curMo+1,11)]}-Dec)</span>
    </div>
  </div>`;
  return html;
}

/** Save a monthly override value and re-render */
function updateMonthlyOverride(key, value) {
  if (!window._monthlyOverrides) window._monthlyOverrides = {};
  window._monthlyOverrides[key] = parseFloat(value) || 0;
  localStorage.setItem('nbi_monthly_overrides', JSON.stringify(window._monthlyOverrides));
}

/** Add an ad-hoc finance entry (income or expense) from the inline form */
async function addFinanceEntry() {
  const name = document.getElementById('finName').value.trim();
  const amount = document.getElementById('finAmount').value;
  const category = document.getElementById('finCategory').value;
  const type = document.getElementById('finType').value;
  const tag = document.getElementById('finTag').value;
  const date = document.getElementById('finDate').value;
  if (!name || !amount) { toast('Name and amount are required', 'warning'); return; }
  try {
    const resp = await authFetch('/api/finance/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, amount: parseFloat(amount), category, type, tag, date }) });
    if (resp.ok) { const entry = await resp.json(); _financeEntries.unshift(entry); renderContent(); toast('Entry added'); }
    else { const err = await resp.json(); toast(err.error || 'Failed to add entry', 'error'); }
  } catch(e) { toast('Network error', 'error'); }
}

/** Remove an ad-hoc finance entry by index */
async function removeFinanceEntry(idx) {
  const entry = _financeEntries[idx];
  if (!entry) return;
  if (entry.id) {
    try {
      const resp = await authFetch('/api/finance/entries/' + entry.id, { method: 'DELETE' });
      if (!resp.ok) { toast('Failed to remove entry', 'error'); return; }
    } catch(e) { toast('Network error', 'error'); return; }
  }
  _financeEntries.splice(idx, 1);
  renderContent();
  toast('Entry removed');
}

/** Export the structured finance data (revenue, payroll, pipeline, opex) as a CSV download */
function exportFinancesCSV() {
  let csv = 'Name,Amount,Category,Type,Tag,Date\n';
  _financeEntries.forEach(e => {
    csv += `"${e.name}",${e.amount},${e.category},${e.type},"${e.tag || ''}","${e.date || ''}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nbi_finances_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Render a paired bar chart comparing monthly revenue vs expenses across 12 months */
function renderMonthlyBarChart(months, revData, expData) {
  const W = 700, H = 280;
  const padL = 60, padR = 20, padT = 30, padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n = months.length;
  const allVals = [...revData, ...expData];
  const maxVal = Math.max(...allVals, 1);
  // Round max up to nearest nice number
  const niceMax = Math.ceil(maxVal / 10000) * 10000;
  const groupW = chartW / n;
  const barW = groupW * 0.3;
  const gap = groupW * 0.06;

  let svg = `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;margin:var(--space-md) 0">`;

  // Grid lines and Y-axis labels
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (chartH / gridLines) * i;
    const val = niceMax - (niceMax / gridLines) * i;
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--border-subtle)" stroke-width="0.5"/>`;
    svg += `<text x="${padL - 8}" y="${y + 3}" text-anchor="end" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="9">\u00a3${Math.round(val / 1000)}k</text>`;
  }

  // Bars
  months.forEach((m, i) => {
    const gx = padL + i * groupW + (groupW - barW * 2 - gap) / 2;
    const revH = (revData[i] / niceMax) * chartH;
    const expH = (expData[i] / niceMax) * chartH;
    // Revenue bar
    svg += `<rect x="${gx}" y="${padT + chartH - revH}" width="${barW}" height="${revH}" rx="2" fill="var(--success)" opacity="0.85"/>`;
    // Expense bar
    svg += `<rect x="${gx + barW + gap}" y="${padT + chartH - expH}" width="${barW}" height="${expH}" rx="2" fill="var(--danger)" opacity="0.7"/>`;
    // Month label
    svg += `<text x="${padL + i * groupW + groupW / 2}" y="${H - padB + 16}" text-anchor="middle" fill="var(--text-secondary)" font-family="var(--font-body)" font-size="10">${m}</text>`;
  });

  // Legend
  svg += `<rect x="${padL}" y="${6}" width="10" height="10" rx="2" fill="var(--success)" opacity="0.85"/>`;
  svg += `<text x="${padL + 14}" y="${15}" fill="var(--text-secondary)" font-family="var(--font-body)" font-size="10">Revenue</text>`;
  svg += `<rect x="${padL + 75}" y="${6}" width="10" height="10" rx="2" fill="var(--danger)" opacity="0.7"/>`;
  svg += `<text x="${padL + 89}" y="${15}" fill="var(--text-secondary)" font-family="var(--font-body)" font-size="10">Expenses</text>`;

  svg += `</svg>`;
  return svg;
}

/** Export the P&L statement as a structured CSV with section headers and totals */
function exportPnLCSV() {
  const S = getFinanceData();

  const contractedRevenue = S.revenue.reduce((s, r) => s + r.annual, 0);
  const annPayroll = S.payroll.reduce((s, p) => s + p.annual, 0);
  const empPct = parseFloat(S.employerCostPct || 15) / 100;
  const billableCost = S.payroll.filter(p => p.billable).reduce((s, p) => s + p.annual, 0);
  const billableFullCost = Math.round(billableCost * (1 + empPct));
  const nonBillableCost = S.payroll.filter(p => !p.billable).reduce((s, p) => s + p.annual, 0);
  const nonBillableFullCost = Math.round(nonBillableCost * (1 + empPct));
  const totalStaffCost = Math.round(annPayroll * (1 + empPct));
  const employerCosts = totalStaffCost - annPayroll;
  const grossProfit = contractedRevenue - billableFullCost;
  const grossMarginPct = contractedRevenue > 0 ? Math.round(grossProfit / contractedRevenue * 100) : 0;

  const recurringExp = _financeEntries.filter(e => e.type === 'recurring' && e.category === 'expense');
  const oneOffExp = _financeEntries.filter(e => e.type === 'one-off' && e.category === 'expense');
  const recurringInc = _financeEntries.filter(e => e.type === 'recurring' && e.category === 'income');
  const oneOffInc = _financeEntries.filter(e => e.type === 'one-off' && e.category === 'income');
  const adHocMonthlyExp = recurringExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalOneOffExp = oneOffExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalOneOffInc = oneOffInc.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const seedOpexAnnual = (S.opex || []).reduce((s, e) => s + ((parseFloat(e.amount)||0) * 12), 0);
  const totalOverheads = nonBillableFullCost + seedOpexAnnual + (adHocMonthlyExp * 12) + totalOneOffExp;
  const totalOtherIncome = totalOneOffInc + (recurringInc.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0) * 12);
  const netProfit = grossProfit - totalOverheads + totalOtherIncome;
  const netMarginPct = contractedRevenue > 0 ? Math.round(netProfit / contractedRevenue * 100) : 0;
  const headcount = S.payroll.length;
  const billableCount = S.payroll.filter(p => p.billable).length;
  const revenuePerHead = headcount > 0 ? Math.round(contractedRevenue / headcount) : 0;

  const rows = [];
  rows.push([`NBI Analytics Ltd - Income Statement (P&L) - FY ${new Date().getFullYear()}`, '']);
  rows.push(['', '']);
  rows.push(['FEE INCOME', '']);
  S.revenue.forEach(r => { rows.push([`  ${r.client} (${r.type})`, r.annual]); });
  rows.push(['Total Fee Income', contractedRevenue]);
  rows.push(['', '']);
  rows.push(['STAFF', '']);
  rows.push(['  Billable (Cost of Revenue)', '']);
  S.payroll.filter(p => p.billable).forEach(p => { rows.push([`    ${p.name} - ${p.role}${p.client ? ' - ' + p.client : ''}`, p.annual]); });
  rows.push(['  Subtotal Billable', billableCost]);
  rows.push(['  Non-billable (Overhead)', '']);
  S.payroll.filter(p => !p.billable).forEach(p => { rows.push([`    ${p.name} - ${p.role}`, p.annual]); });
  rows.push(['  Subtotal Non-billable', nonBillableCost]);
  rows.push([`  Employer Costs (${S.employerCostPct||15}%)`, employerCosts]);
  rows.push(['Total Staff Cost', totalStaffCost]);
  rows.push(['', '']);
  rows.push(['GROSS PROFIT (Revenue - Billable Staff)', grossProfit]);
  rows.push(['Gross Margin %', grossMarginPct + '%']);
  rows.push(['', '']);
  rows.push(['OPERATING EXPENSES', '']);
  if ((S.opex || []).length > 0) {
    rows.push(['  Operational Costs', '']);
    (S.opex || []).forEach(e => { rows.push([`    ${e.name} (${e.tag || ''})`, Math.round((parseFloat(e.amount) || 0) * 12)]); });
  }
  if (recurringExp.length > 0) {
    rows.push(['  Ad-hoc Recurring (Monthly x12)', '']);
    recurringExp.forEach(e => { rows.push([`    ${e.name}`, (parseFloat(e.amount) || 0) * 12]); });
  }
  if (oneOffExp.length > 0) {
    rows.push(['  One-off Costs', '']);
    oneOffExp.forEach(e => { rows.push([`    ${e.name}`, parseFloat(e.amount) || 0]); });
  }
  rows.push(['Total Operating Expenses', Math.round(totalOverheads)]);
  rows.push(['', '']);
  if (totalOtherIncome > 0) {
    rows.push(['OTHER INCOME', '']);
    recurringInc.forEach(e => { rows.push([`  ${e.name} (recurring x12)`, (parseFloat(e.amount) || 0) * 12]); });
    oneOffInc.forEach(e => { rows.push([`  ${e.name}`, parseFloat(e.amount) || 0]); });
    rows.push(['Total Other Income', totalOtherIncome]);
    rows.push(['', '']);
  }
  rows.push(['OPERATING PROFIT (EBIT)', Math.round(netProfit)]);
  rows.push(['', '']);
  rows.push(['CONSULTING METRICS', '']);
  rows.push(['Gross Margin %', grossMarginPct + '%']);
  rows.push(['Operating Margin %', netMarginPct + '%']);
  rows.push(['Utilisation Rate', Math.round(billableCount / headcount * 100) + '% (' + billableCount + '/' + headcount + ')']);
  rows.push(['Revenue per Head', revenuePerHead]);
  rows.push(['Headcount', headcount]);

  let csv = rows.map(r => `"${r[0]}","${r[1]}"`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nbi_pnl_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ----- CHANGELOG VIEW -----
