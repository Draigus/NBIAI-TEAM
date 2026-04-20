// ==================== EXPENSE REPORTS ====================
// Extracted from nbi_project_dashboard.html
// Expense reporting: report cards, individual expense CRUD, report detail
// panel, category management, CSV export, and approval workflow.

import { registerView } from '../core/router.js';

// ===== _act* WRAPPERS =====
function _actCloseExpReportDetail() { closeExpenseDetail(); closeReportDetail(); }
window._actCloseExpReportDetail = _actCloseExpReportDetail;

// ===== FUNCTIONS =====

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

  // Calculate summary stats
  let grandTotal = 0, vatTotal = 0, receiptCount = 0;
  const byCategory = {};
  expenses.forEach(exp => {
    const amt = parseFloat(exp.amount) || 0;
    const vat = parseFloat(exp.vat_amount) || 0;
    grandTotal += amt;
    vatTotal += vat;
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

  // Summary cards
  html += `<div class="report-fs__summary">
    <div class="report-fs__card">
      <div class="report-fs__card-label">Total Amount</div>
      <div class="report-fs__card-value">&pound;${grandTotal.toFixed(2)}</div>
    </div>
    <div class="report-fs__card">
      <div class="report-fs__card-label">VAT Claimed</div>
      <div class="report-fs__card-value">&pound;${vatTotal.toFixed(2)}</div>
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
      ${exp.report_status ? ` <span class="expense-status expense-status--${expenseStatusClass(exp.report_status)}" style="font-size:0.65rem;padding:1px 6px">${exp.report_status}</span>` : ''}
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
        <span style="color:var(--text-muted);font-size:0.65rem">${sizeStr}</span>
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
    const resp = await fetch('/api/expenses/from-receipt', {
      method: 'POST',
      credentials: 'include',
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


// ----- CHANGELOG VIEW -----

// ===== WINDOW REGISTRATIONS =====
window.renderExpensesView = renderExpensesView;
window.renderExpensesContent = renderExpensesContent;
window.openExpenseDetail = openExpenseDetail;
window.closeExpenseDetail = closeExpenseDetail;
window.openReportDetail = openReportDetail;
window.closeReportDetail = closeReportDetail;
window.loadExpenses = loadExpenses;
window.loadExpenseReports = loadExpenseReports;
window.loadExpenseCategories = loadExpenseCategories;
window.refreshExpenses = refreshExpenses;
window.exportReportExcel = exportReportExcel;
window.emailReport = emailReport;
window.updateReport = updateReport;
window.submitReport = submitReport;
window.reviewReport = reviewReport;
window.addSelectedExpensesToReport = addSelectedExpensesToReport;
window.removeExpenseFromReport = removeExpenseFromReport;
window.deleteReport = deleteReport;
window.openNewReportModal = openNewReportModal;
window.submitNewReport = submitNewReport;
window.updateExpense = updateExpense;
window.deleteExpense = deleteExpense;
window.processReceiptUpload = processReceiptUpload;
window.uploadExpenseReceipt = uploadExpenseReceipt;
window.deleteExpenseReceipt = deleteExpenseReceipt;
window.openNewExpenseModal = openNewExpenseModal;
window.submitNewExpense = submitNewExpense;

// ===== REGISTER VIEW =====
registerView("expenses", renderExpensesView);
