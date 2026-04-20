// ==================== FINANCES VIEW ====================
// Extracted from nbi_project_dashboard.html (lines 375, 400, 7472-7680, 8719-9546)

import { registerView } from '../core/router.js';

// ----- FINANCE SEED DATA -----
const NBI_FINANCE_SEED = { revenue: [], pipeline: [], payroll: [], targets: { y2026: 0, y2027: 0 }, opex: [] };

// ===== MODULE-PRIVATE STATE =====
let _fxRate = null;
let _fxDate = null;
let _financeData = null;
let _financeSaveTimer = null;
// _financeVersion is kept on window so the inline conflict-resolution handler can read/write it
window._financeVersion = window._financeVersion || 0;
let _financeEntries = []; // Ad-hoc finance entries (loaded from API or localStorage)

// ===== GBP/USD FX RATE =====

/** Read FX rate from server-managed settings (updated by daily cron). No cross-origin calls. */
export function fetchFxRate() {
  const fx = window.settings.fx_rates;
  if (fx && fx.USD) {
    _fxRate = fx.USD;
    _fxDate = new Date().toISOString().split('T')[0];
  }
}
window.fetchFxRate = fetchFxRate;

/** Convert a GBP amount to USD using the cached FX rate (null if rate unavailable) */
export function gbpToUsd(gbp) { return _fxRate ? Math.round(gbp * _fxRate) : null; }
window.gbpToUsd = gbpToUsd;

/** Format a GBP amount as a USD string, or dash if FX rate unavailable */
export function fmtUsd(gbp) { const usd = gbpToUsd(gbp); return usd !== null ? '$' + usd.toLocaleString() : '—'; }
window.fmtUsd = fmtUsd;

// Fetch on load
fetchFxRate();

// ===== EDITABLE FINANCE DATA LAYER (PostgreSQL-backed) =====

/** Get the editable finance data object -- loads from cache, localStorage, or server seed */
export function getFinanceData() {
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
window.getFinanceData = getFinanceData;

/** Fetch finance seed data from server if no local data exists (admin only) */
export async function loadFinanceSeedIfEmpty() {
  if (localStorage.getItem('nbi_finance_data')) return; // already have local data
  try {
    const seed = await window.apiCall('/api/finance/seed');
    if (seed && seed.revenue && seed.revenue.length > 0) {
      _financeData = seed;
      localStorage.setItem('nbi_finance_data', JSON.stringify(seed));
    }
  } catch(e) { /* Server seed not available */ }
}
window.loadFinanceSeedIfEmpty = loadFinanceSeedIfEmpty;

/** Save finance data to localStorage immediately, then debounce a push to PostgreSQL (800ms) */
export function saveFinanceData(data) {
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
  if (totalEntries === 0 && window._financeVersion > 0) {
    if (window._nbiDebug) console.warn('[Finance] Skipping DB save — data is empty but server has version', window._financeVersion);
    window.renderContent();
    return;
  }

  // Debounced save to PostgreSQL with optimistic concurrency
  clearTimeout(_financeSaveTimer);
  _financeSaveTimer = setTimeout(async () => {
    try {
      const resp = await window.authFetch('/api/finance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, expectedVersion: window._financeVersion })
      });
      if (resp.ok) {
        const result = await resp.json();
        window._financeVersion = result.version || window._financeVersion;
      } else if (resp.status === 409) {
        const err = await resp.json();
        const pendingData = JSON.parse(JSON.stringify(data));
        document.getElementById('conflictTitle').textContent = 'Finance Conflict';
        document.getElementById('conflictFields').innerHTML =
          `<p style="font-size:0.85rem;margin-bottom:var(--space-md)">Finance data was updated by <strong>${window.esc(err.updatedBy || 'another user')}</strong> while you were editing.</p>` +
          `<div class="conflict-field"><div class="conflict-field__label">Your version</div><div class="conflict-field__mine">${(pendingData.revenue||[]).length} revenue + ${(pendingData.payroll||[]).length} payroll + ${(pendingData.opex||[]).length} opex entries</div></div>`;
        window._financeConflictPending = pendingData;
        window._financeConflictServerVersion = err.currentVersion;
        const modal = document.getElementById('conflictModal');
        modal.classList.add('open');
        window._trapFocus(modal);
      } else if (resp.status === 401) {
        window.showToast('Please log in to save finance changes', 'warning');
      } else {
        const err = await resp.json().catch(() => ({}));
        window.showToast(err.error || 'Failed to save finance data', 'warning');
      }
    } catch(e) { if (window._nbiDebug) console.warn('[Finance] DB save failed, data safe in localStorage:', e.message); }
  }, window.FINANCE_DEBOUNCE_MS);
  window.renderContent();
}
window.saveFinanceData = saveFinanceData;

// Load finance data from DB on startup
/** Load finance data from the database on startup; pushes seed data up if DB is empty */
export async function loadFinanceFromDB() {
  try {
    const resp = await window.authFetch('/api/finance');
    if (resp.ok) {
      const result = await resp.json();
      if (result.data) {
        _financeData = result.data;
        window._financeVersion = result.version || 0;
        localStorage.setItem('nbi_finance_data', JSON.stringify(_financeData));
        if (window.currentView === 'finances') window.renderContent();
        return;
      }
    }
  } catch(e) { if (window._nbiDebug) console.warn('[Finance] DB load failed, using localStorage'); }
  // If DB is empty, push localStorage/seed data up
  const data = getFinanceData();
  try {
    await window.authFetch('/api/finance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
  } catch(e) {}
}
window.loadFinanceFromDB = loadFinanceFromDB;

/**
 * Start inline editing of a finance table cell -- replaces cell content with an input.
 * For 'select-billable' type, toggles the boolean immediately.
 */
export function finStartEdit(el, section, idx, field, type) {
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
  input.onkeydown = function(e) { if (e.key === 'Enter') this.blur(); if (e.key === 'Escape') { this.onblur = null; window.renderContent(); } };
  el.textContent = '';
  el.appendChild(input);
  input.focus();
  input.select();
}
window.finStartEdit = finStartEdit;

/** Commit an inline finance cell edit -- auto-syncs monthly/annual for payroll fields */
export function finSaveEdit(section, idx, field, value) {
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
window.finSaveEdit = finSaveEdit;

/** Add a new row to a finance section (revenue/payroll/pipeline/opex) with template defaults */
export function finAddRow(section) {
  const data = getFinanceData();
  const tpl = { revenue: { client: 'New Client', annual: 0, type: 'TBD', status: 'TBD', startMonth: 1 },
    payroll: { name: 'New Hire', role: 'TBD', monthly: 0, annual: 0, billable: false, client: null },
    pipeline: { client: 'New Lead', low: 0, high: 0, probability: 'Low', notes: '' },
    opex: { name: 'New Expense', amount: 0, tag: 'Other', type: 'recurring' } };
  if (!data[section]) data[section] = [];
  data[section].push(tpl[section] || {});
  saveFinanceData(data);
}
window.finAddRow = finAddRow;

/** Remove a row from a finance section by index */
export function finRemoveRow(section, idx) {
  const data = getFinanceData();
  if (data[section]) { data[section].splice(idx, 1); saveFinanceData(data); }
}
window.finRemoveRow = finRemoveRow;

/** Reset all finance data to hardcoded seed defaults after confirmation. Admin only. */
export async function finResetData() {
  if (!window._currentUser || window._currentUser.role !== 'admin') {
    window.toast('Admin only', 'error');
    return;
  }
  if (!(await window.themedConfirm('Reset all financial data to defaults? This cannot be undone.'))) return;
  localStorage.removeItem('nbi_finance_data');
  window.renderContent();
  window.toast('Financial data reset to defaults');
}
window.finResetData = finResetData;

// ===== ACTION HANDLERS =====

function _actSetFinanceSubView(v, el) { window._financeSubView = v; renderFinancesView(el.closest('.finance-view').parentElement); }
window._actSetFinanceSubView = _actSetFinanceSubView;

function _actFinStartEdit(section, idx, field, type, el) { finStartEdit(el, section, parseInt(idx), field, type); }
window._actFinStartEdit = _actFinStartEdit;

// ===== RENDERING =====

/** Render the full finances view into the given container element */
export function renderFinancesView(el) {
  if (!window.hasPageAccess('finances')) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state__icon" style="font-size:2rem">&#128274;</div><div class="empty-state__title">Access Restricted</div><div class="empty-state__desc">You don't have permission to view this page.</div></div>`;
    return;
  }

  // Load finance data
  try { _financeEntries = JSON.parse(localStorage.getItem('nbi_finance_entries') || '[]'); } catch(e) { _financeEntries = []; }
  let S = getFinanceData();

  // Practice filter MUST run BEFORE the P&L calculations so KPI cards,
  // monthly charts, and burn rate all use the filtered data. Moving this
  // after the calculations was the bug Glen caught (2026-04-16).
  const _finPractice = window.currentFilter.practice || null;
  const _finClientMatchesPractice = (clientName) => {
    if (!_finPractice || !clientName) return !_finPractice;
    const rec = window._apiClientsCache[clientName];
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
  const usdTh = hasFx ? `<th style="text-align:right;font-size:0.72rem;color:var(--text-muted);width:100px">USD</th>` : '';
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
    const p = window.PRACTICES.find(x => x.value === _finPractice);
    if (p) {
      html += `<div class="practice-mode-banner" style="background:color-mix(in srgb, ${p.colour} 14%, var(--bg-raised));border:1px solid ${p.colour};border-left:4px solid ${p.colour};border-radius:var(--radius-md);padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.colour}"></span><strong style="font-size:0.85rem;color:var(--text-primary)">${window.esc(p.label)} mode</strong><span style="font-size:0.75rem;color:var(--text-muted);flex:1;min-width:200px">Revenue and staff are filtered to ${window.esc(p.label)} clients only. Shared costs (OpEx, ad-hoc expenses) are excluded since they cannot be attributed to a single practice.</span><button class="btn btn--sm btn--ghost" data-action="filterByPractice" data-arg0="null">Exit ${window.esc(p.shortLabel || p.label)}</button></div>`;
    }
  }
  html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:var(--space-lg)">`;
  html += `<div><h1 style="margin:0">NBI Analytics Ltd</h1><div class="report__date">Financial Dashboard &mdash; FY 2026${hasFx ? ` <span style="margin-left:12px;font-size:0.72rem;padding:2px 8px;border-radius:3px;background:var(--accent-glow);color:var(--accent-text);border:1px solid var(--accent-border)">GBP/USD ${_fxRate.toFixed(4)} <span style="color:var(--text-muted)">(${_fxDate})</span></span>` : ''}</div></div>`;
  // Finance toolbar. Reset is destructive (wipes all financial data) so it is
  // gated to admins only — closes e8b58255 ("big bad button" — non-admins were
  // seeing the Danger Zone reset). Non-admin users see Export buttons but no Reset.
  const isFinAdmin = window._currentUser && window._currentUser.role === 'admin';
  html += `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-action="exportFinancesCSV"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 1v9M4 7l3 3 3-3M2 12h10"/></svg> Export CSV</button><button class="btn" data-action="exportPnLCSV"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="1" width="10" height="12" rx="1"/><path d="M5 4h4M5 7h4M5 10h2"/></svg> P&amp;L Export</button>${isFinAdmin ? `<button class="btn btn--danger" data-action="finResetData" title="Admin only — wipes all financial data" aria-label="Reset financial data (admin only)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1v5h5"/><path d="M2.5 9A5.5 5.5 0 1 0 3 4L1 6"/></svg> Reset</button>` : ''}</div>`;
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
  html += `<div class="kpi-card"><div class="kpi-card__value" style="color:var(--danger);font-size:1.4rem">&pound;${Math.round(totalStaffFullCost/1000)}k</div><div class="kpi-card__label">Staff Cost<div class="kpi-card__sub" style="font-size:0.6rem;color:var(--text-muted)">incl. ${S.employerCostPct||15}% employer</div></div></div>`;
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
  html += `<thead><tr><th style="background:var(--success-bg);color:var(--success);border:1px solid var(--success-border)">Fee Income</th><th style="text-align:right;background:var(--success-bg);color:var(--success);border:1px solid var(--success-border);font-size:0.7rem">Monthly</th><th style="text-align:right;background:var(--success-bg);color:var(--success);border:1px solid var(--success-border);font-size:0.7rem">Annual</th>${usdTh}<th style="width:28px;background:var(--success-bg);border:1px solid var(--success-border)"></th></tr></thead><tbody>`;
  S.revenue.forEach((r, i) => {
    const mo = Math.round(r.annual / 12);
    html += `<tr>`;
    html += `<td style="padding-left:20px"><span data-val="${window.esc(r.client)}" data-action="_actFinStartEdit" data-pass-el data-arg0="revenue" data-arg1="${i}" data-arg2="client" data-arg3="text" style="cursor:pointer" title="Click to edit">${window.esc(r.client)}</span> <span data-val="${window.esc(r.type)}" data-action="_actFinStartEdit" data-pass-el data-arg0="revenue" data-arg1="${i}" data-arg2="type" data-arg3="text" style="cursor:pointer;color:var(--text-muted);font-size:0.72rem" title="Click to edit type">(${window.esc(r.type)})</span></td>`;
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
  html += `<tr><td colspan="${3 + (hasFx?1:0) + 1}" style="padding:3px 20px"><button class="btn btn--sm" data-action="finAddRow" data-arg0="revenue" style="font-size:0.7rem;padding:2px 7px">+ Add Revenue</button></td></tr>`;
  const totalFeeIncome = contractedRevenue + otherIncome;
  const totalFeeMonthly = Math.round(totalFeeIncome / 12);
  html += `<tr style="border-top:2px solid var(--border-strong);font-weight:700"><td>Total Fee Income</td><td style="text-align:right;font-family:var(--font-mono);color:var(--success)">&pound;${totalFeeMonthly.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--success);font-size:0.78rem">&pound;${totalFeeIncome.toLocaleString()}</td>${usdTdBold(totalFeeMonthly,'var(--success)')}<td></td></tr>`;
  html += `</tbody>`;

  // --- STAFF (split into Billable / Non-billable sub-groups) ---
  html += `<thead><tr><th style="background:var(--warning-bg);color:var(--warning);border:1px solid var(--warning-border)">Staff</th><th style="text-align:right;background:var(--warning-bg);color:var(--warning);border:1px solid var(--warning-border);font-size:0.7rem">Monthly</th><th style="text-align:right;background:var(--warning-bg);color:var(--warning);border:1px solid var(--warning-border);font-size:0.7rem">Annual</th>${usdTh}<th style="width:28px;background:var(--warning-bg);border:1px solid var(--warning-border)"></th></tr></thead><tbody>`;

  // Billable staff sub-header
  html += `<tr><td colspan="${colSpan + 2}" style="padding:4px 10px;font-size:0.7rem;color:var(--success);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;background:color-mix(in srgb, var(--success) 5%, var(--bg-surface))">Billable (Cost of Revenue)</td></tr>`;
  S.payroll.filter(p => p.billable).forEach(p => {
    const i = S.payroll.indexOf(p);
    const hrRate = Math.round(p.annual / (WORK_HRS_MONTH * 12));
    html += `<tr>`;
    html += `<td style="padding-left:20px"><span data-val="${window.esc(p.name)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="name" data-arg3="text" style="cursor:pointer" title="Click to edit"><strong>${window.esc(p.name)}</strong></span> <span data-val="${window.esc(p.role)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="role" data-arg3="text" style="cursor:pointer;color:var(--text-muted);font-size:0.72rem" title="Click to edit">${window.esc(p.role)}</span>${p.client ? ` <span data-val="${window.esc(p.client)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="client" data-arg3="text" style="cursor:pointer;color:var(--text-faint);font-size:0.68rem" title="Click to edit client">&mdash; ${window.esc(p.client)}</span>` : ''}<div style="font-size:0.68rem;color:var(--text-muted);margin-top:1px;font-family:var(--font-mono)">&pound;${hrRate}/hr &middot; ${WORK_HRS_MONTH} hrs/mo</div></td>`;
    html += `<td data-val="${p.monthly || Math.round(p.annual/12)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="monthly" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);font-weight:500" title="Click to edit monthly">&pound;${(p.monthly || Math.round(p.annual/12)).toLocaleString()}</td>`;
    html += `<td data-val="${p.annual}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="annual" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem" title="Click to edit annual">&pound;${p.annual.toLocaleString()}</td>`;
    html += usdTd(p.monthly || Math.round(p.annual/12));
    html += `<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="finRemoveRow" data-arg0="payroll" data-arg1="${i}" title="Remove">&times;</button></td>`;
    html += `</tr>`;
  });
  const billableMo = Math.round(billableStaffCost / 12);
  html += `<tr style="font-size:0.82rem;color:var(--text-muted)"><td style="padding-left:20px;font-style:italic">Subtotal Billable</td><td style="text-align:right;font-family:var(--font-mono)">&pound;${billableMo.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);font-size:0.78rem">&pound;${billableStaffCost.toLocaleString()}</td>${usdTd(billableMo)}<td></td></tr>`;

  // Non-billable staff sub-header
  html += `<tr><td colspan="${colSpan + 2}" style="padding:4px 10px;font-size:0.7rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;background:color-mix(in srgb, var(--text-muted) 5%, var(--bg-surface))">Non-billable (Overhead)</td></tr>`;
  S.payroll.filter(p => !p.billable).forEach(p => {
    const i = S.payroll.indexOf(p);
    const mo = p.monthly || Math.round(p.annual / 12);
    html += `<tr>`;
    html += `<td style="padding-left:20px"><span data-val="${window.esc(p.name)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="name" data-arg3="text" style="cursor:pointer" title="Click to edit"><strong>${window.esc(p.name)}</strong></span> <span data-val="${window.esc(p.role)}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="role" data-arg3="text" style="cursor:pointer;color:var(--text-muted);font-size:0.72rem" title="Click to edit">${window.esc(p.role)}</span></td>`;
    html += `<td data-val="${mo}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="monthly" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);font-weight:500" title="Click to edit monthly">&pound;${mo.toLocaleString()}</td>`;
    html += `<td data-val="${p.annual}" data-action="_actFinStartEdit" data-pass-el data-arg0="payroll" data-arg1="${i}" data-arg2="annual" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem" title="Click to edit annual">&pound;${p.annual.toLocaleString()}</td>`;
    html += usdTd(mo);
    html += `<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="finRemoveRow" data-arg0="payroll" data-arg1="${i}" title="Remove">&times;</button></td>`;
    html += `</tr>`;
  });
  html += `<tr><td colspan="${colSpan + 2}" style="padding:3px 20px"><button class="btn btn--sm" data-action="finAddRow" data-arg0="payroll" style="font-size:0.7rem;padding:2px 7px">+ Add Staff</button></td></tr>`;

  // Employer costs row
  const ecMo = Math.round(employerCosts / 12);
  html += `<tr style="color:var(--text-muted);font-size:0.82rem"><td style="padding-left:20px;font-style:italic">Employer Costs (NI + Pension) <span data-val="${S.employerCostPct || 15}" data-action="_actFinStartEdit" data-pass-el data-arg0="_root" data-arg1="0" data-arg2="employerCostPct" data-arg3="number" style="cursor:pointer;color:var(--accent-text);font-size:0.68rem" title="Click to edit employer cost %">${S.employerCostPct || 15}%</span></td><td style="text-align:right;font-family:var(--font-mono)">&pound;${ecMo.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);font-size:0.78rem">&pound;${employerCosts.toLocaleString()}</td>${usdTd(ecMo)}<td></td></tr>`;

  // Total Staff
  const staffFullMo = Math.round(totalStaffFullCost / 12);
  html += `<tr style="border-top:2px solid var(--border-strong);font-weight:700"><td>Total Staff Cost</td><td style="text-align:right;font-family:var(--font-mono);color:var(--warning)">&pound;${staffFullMo.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--warning);font-size:0.78rem">&pound;${totalStaffFullCost.toLocaleString()}</td>${usdTdBold(staffFullMo,'var(--warning)')}<td></td></tr>`;

  // Gross Profit (Revenue - Billable Staff Full Cost)
  const gpMonthly = Math.round(grossProfit / 12);
  html += `<tr style="font-weight:700;font-size:1.02rem;background:var(--bg-hover)"><td>Gross Profit <span style="font-size:0.68rem;font-weight:400;color:var(--text-muted)">(Revenue - Billable Staff)</span></td><td style="text-align:right;font-family:var(--font-mono);color:${grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">&pound;${gpMonthly.toLocaleString()} <span style="font-size:0.75rem;font-weight:400">(${grossMarginPct}%)</span></td><td style="text-align:right;font-family:var(--font-mono);color:${grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'};font-size:0.78rem">&pound;${grossProfit.toLocaleString()}</td>${usdTdBold(gpMonthly, grossProfit >= 0 ? 'var(--success)' : 'var(--danger)')}<td></td></tr>`;
  html += `</tbody>`;

  // --- OPERATING EXPENSES ---
  html += `<thead><tr><th style="background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border)">Operating Expenses</th><th style="text-align:right;background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);font-size:0.7rem">Monthly</th><th style="text-align:right;background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);font-size:0.7rem">Annual</th>${usdTh}<th style="width:28px;background:var(--danger-bg);border:1px solid var(--danger-border)"></th></tr></thead><tbody>`;
  if ((S.opex || []).length > 0 || recurringExp.length > 0) {
    (S.opex || []).forEach((e, i) => {
      const mo = parseFloat(e.amount) || 0;
      const yr = Math.round(mo * 12);
      html += `<tr>`;
      html += `<td style="padding-left:20px"><span data-val="${window.esc(e.name)}" data-action="_actFinStartEdit" data-pass-el data-arg0="opex" data-arg1="${i}" data-arg2="name" data-arg3="text" style="cursor:pointer" title="Click to edit">${window.esc(e.name)}</span> <span data-val="${window.esc(e.tag||'')}" data-action="_actFinStartEdit" data-pass-el data-arg0="opex" data-arg1="${i}" data-arg2="tag" data-arg3="text" style="cursor:pointer;color:var(--text-muted);font-size:0.72rem" title="Click to edit tag">${window.esc(e.tag||'')}</span></td>`;
      html += `<td data-val="${e.amount}" data-action="_actFinStartEdit" data-pass-el data-arg0="opex" data-arg1="${i}" data-arg2="amount" data-arg3="number" style="cursor:pointer;text-align:right;font-family:var(--font-mono);font-weight:500" title="Click to edit monthly">&pound;${mo.toLocaleString()}</td>`;
      html += `<td style="text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem">&pound;${yr.toLocaleString()}</td>`;
      html += usdTd(mo);
      html += `<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="finRemoveRow" data-arg0="opex" data-arg1="${i}" title="Remove">&times;</button></td>`;
      html += `</tr>`;
    });
    recurringExp.forEach(e => {
      const idx = _financeEntries.indexOf(e);
      const mo = parseFloat(e.amount) || 0;
      html += `<tr><td style="padding-left:20px">${window.esc(e.name)} <span style="color:var(--text-muted);font-size:0.72rem">${window.esc(e.tag||'')}</span></td><td style="text-align:right;font-family:var(--font-mono);font-weight:500">&pound;${mo.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem">&pound;${Math.round(mo*12).toLocaleString()}</td>${usdTd(mo)}<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="removeFinanceEntry" data-arg0="${idx}">&times;</button></td></tr>`;
    });
  }
  html += `<tr><td colspan="${3 + (hasFx?1:0) + 1}" style="padding:3px 20px"><button class="btn btn--sm" data-action="finAddRow" data-arg0="opex" style="font-size:0.7rem;padding:2px 7px">+ Add Expense</button></td></tr>`;
  if (oneOffExp.length > 0) {
    html += `<tr><td colspan="${3 + (hasFx?1:0) + 1}" style="padding-left:10px;font-size:0.72rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-top:6px">One-off Costs</td></tr>`;
    oneOffExp.forEach(e => {
      const idx = _financeEntries.indexOf(e);
      const amt = parseFloat(e.amount) || 0;
      html += `<tr><td style="padding-left:20px">${window.esc(e.name)} <span style="color:var(--text-muted);font-size:0.72rem">${window.esc(e.tag||'')}</span></td><td style="text-align:right;font-family:var(--font-mono);font-weight:500">&pound;${amt.toLocaleString()}</td><td style="text-align:right;font-family:var(--font-mono);color:var(--text-muted);font-size:0.78rem">&mdash;</td>${usdTd(amt)}<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem" data-action="removeFinanceEntry" data-arg0="${idx}">&times;</button></td></tr>`;
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
  html += `<div class="kpi-card" style="padding:var(--space-md)"><div class="kpi-card__value" style="color:${utilisationPct >= 60 ? 'var(--success)' : 'var(--warning)'};font-size:1.1rem">${utilisationPct}%</div><div class="kpi-card__label">Utilisation<div style="font-size:0.6rem;color:var(--text-muted)">${billableCount}/${headcount} billable</div></div></div>`;
  html += `<div class="kpi-card" style="padding:var(--space-md)"><div class="kpi-card__value" style="color:var(--warning);font-size:1.1rem">&pound;${Math.round(monthlyBurn/1000)}k</div><div class="kpi-card__label">Monthly Burn</div></div>`;
  const cashRunwayMonths = monthlyBurn > 0 ? Math.round(netProfit / monthlyBurn * 10) / 10 : 0;
  html += `<div class="kpi-card" style="padding:var(--space-md)"><div class="kpi-card__value" style="color:${cashRunwayMonths >= 6 ? 'var(--success)' : cashRunwayMonths >= 3 ? 'var(--warning)' : 'var(--danger)'};font-size:1.1rem">${cashRunwayMonths > 0 ? cashRunwayMonths + 'mo' : 'N/A'}</div><div class="kpi-card__label">Cash Runway</div></div>`;
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
      <span style="min-width:85px;font-size:0.72rem;color:var(--text-secondary)">${item.label}</span>
      <div style="flex:1;height:14px;background:var(--border-subtle);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${item.col};border-radius:3px"></div></div>
      <span style="min-width:55px;text-align:right;font-family:var(--font-mono);font-size:0.72rem;font-weight:600;color:${item.col}">${sign}&pound;${Math.round(Math.abs(item.value)/1000)}k</span>
    </div>`;
  });
  html += `</div></div>`;

  // Revenue Target
  html += `<div class="report__section"><h2>2026 Revenue Target</h2>`;
  html += `<div style="display:flex;align-items:center;gap:var(--space-lg);padding:var(--space-md) 0">`;
  html += `<div>${window.renderProgressRing(Math.min(targetPct, 100), 90)}</div>`;
  html += `<div><div style="font-family:var(--font-mono);font-size:0.85rem;color:var(--text-primary)">&pound;${Math.round(contractedRevenue/1000)}k / &pound;${Math.round(target2026/1000)}k</div><div style="font-size:0.78rem;color:var(--danger);margin-top:2px">Gap: &pound;${Math.round(revenueGap/1000)}k</div></div>`;
  html += `</div></div>`;

  // Revenue by Client (compact bars)
  html += `<div class="report__section"><h2>Revenue by Client</h2>`;
  const maxRevClient = Math.max(...S.revenue.map(r => r.annual), 1);
  html += `<div style="display:flex;flex-direction:column;gap:6px">`;
  S.revenue.filter(r => r.annual > 0).forEach(r => {
    html += `<div style="display:flex;align-items:center;gap:6px"><span style="min-width:90px;font-size:0.75rem;color:var(--text-secondary)">${window.esc(r.client)}</span><div style="flex:1;height:18px;background:var(--border-subtle);border-radius:3px;overflow:hidden"><div style="height:100%;width:${r.annual/maxRevClient*100}%;background:var(--success);border-radius:3px"></div></div><span style="min-width:50px;text-align:right;font-family:var(--font-mono);font-size:0.75rem;font-weight:600">&pound;${Math.round(r.annual/1000)}k</span></div>`;
  });
  html += `</div></div>`;

  // Revenue Pipeline (compact)
  html += `<div class="report__section"><h2>Revenue Pipeline</h2>`;
  html += `<table class="report-table" style="width:100%;font-size:0.75rem"><thead><tr><th>Opportunity</th><th>Range</th><th>Prob.</th><th style="width:22px"></th></tr></thead><tbody>`;
  S.pipeline.forEach((p, i) => {
    const probCol = p.probability === 'High' ? 'var(--success)' : p.probability === 'Medium' ? 'var(--warning)' : 'var(--text-muted)';
    html += `<tr>`;
    html += `<td><strong data-val="${window.esc(p.client)}" data-action="_actFinStartEdit" data-pass-el data-arg0="pipeline" data-arg1="${i}" data-arg2="client" data-arg3="text" style="cursor:pointer" title="Click to edit">${window.esc(p.client)}</strong>`;
    if (p.notes) html += `<div style="font-size:0.68rem;color:var(--text-muted)">${window.esc(p.notes)}</div>`;
    html += `</td>`;
    html += `<td style="font-family:var(--font-mono);white-space:nowrap"><span data-val="${p.low}" data-action="_actFinStartEdit" data-pass-el data-arg0="pipeline" data-arg1="${i}" data-arg2="low" data-arg3="number" style="cursor:pointer" title="Click to edit">&pound;${(p.low/1000).toFixed(0)}k</span>&ndash;<span data-val="${p.high}" data-action="_actFinStartEdit" data-pass-el data-arg0="pipeline" data-arg1="${i}" data-arg2="high" data-arg3="number" style="cursor:pointer" title="Click to edit">&pound;${(p.high/1000).toFixed(0)}k</span></td>`;
    html += `<td data-val="${window.esc(p.probability)}" data-action="_actFinStartEdit" data-pass-el data-arg0="pipeline" data-arg1="${i}" data-arg2="probability" data-arg3="text" style="cursor:pointer;color:${probCol}" title="Click to edit">${window.esc(p.probability)}</td>`;
    html += `<td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.8rem" data-action="finRemoveRow" data-arg0="pipeline" data-arg1="${i}" title="Remove">&times;</button></td>`;
    html += `</tr>`;
  });
  html += `<tr><td colspan="4" style="padding:3px 0"><button class="btn btn--sm" data-action="finAddRow" data-arg0="pipeline" style="font-size:0.68rem;padding:2px 6px">+ Add Opportunity</button></td></tr>`;
  html += `</tbody></table></div>`;

  html += `</div>`; // close fin-sidebar
  html += `</div>`; // close fin-pnl-wrap

  // ===== MONTHLY REVENUE vs EXPENSES (full width below) =====
  html += `<div class="report__section"><div class="chart-card chart-card--compact"><div class="chart-card__title">Monthly Revenue vs Expenses (FY 2026)</div>`;
  html += renderMonthlyBarChart(months, monthlyRev, monthlyExp);
  html += `</div></div>`;


  // ===== ADD ENTRY FORM =====
  html += `<div class="report__section"><h2>Add Financial Entry</h2>`;
  html += `<div style="background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:var(--space-lg)">`;
  html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:var(--space-md);margin-bottom:var(--space-md)">`;
  html += `<div><label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Name</label><input id="finName" placeholder="e.g. Office 365" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"></div>`;
  html += `<div><label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Amount (&pound;)</label><input id="finAmount" type="number" step="0.01" min="0" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-mono);font-size:0.85rem"></div>`;
  html += `<div><label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Category</label><select id="finCategory" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"><option value="expense">Expense</option><option value="income">Income</option></select></div>`;
  html += `<div><label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Type</label><select id="finType" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"><option value="recurring">Monthly Recurring</option><option value="one-off">One-off</option></select></div>`;
  html += `<div><label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Tag</label><select id="finTag" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"><option value="">Select...</option><option value="Software">Software</option><option value="Salary">Salary</option><option value="Contractor">Contractor</option><option value="Infrastructure">Infrastructure</option><option value="Marketing">Marketing</option><option value="Office">Office</option><option value="Legal">Legal</option><option value="Insurance">Insurance</option><option value="Travel">Travel</option><option value="Training">Training</option><option value="AI/Software">AI/Software</option><option value="Other">Other</option></select></div>`;
  html += `<div><label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px">Date</label><input id="finDate" type="date" value="${new Date().toISOString().split('T')[0]}" style="width:100%;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem"></div>`;
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
      html += `<div><div style="font-weight:500;font-size:0.88rem;margin-bottom:2px">${window.esc(e.name)}</div><div style="font-size:0.7rem;color:var(--text-muted)">${window.esc(e.tag || 'Other')}</div></div>`;
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
      html += `<tr><td style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap">${e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '-'}</td><td><strong>${window.esc(e.name)}</strong></td><td style="color:var(--text-muted);font-size:0.82rem">${window.esc(e.tag||'-')}</td><td><span style="font-size:0.72rem;padding:2px 8px;border-radius:3px;background:${isInc?'var(--success-bg)':'var(--danger-bg)'};color:${col};border:1px solid ${isInc?'var(--success-border)':'var(--danger-border)'}">${isInc?'Income':'Expense'}</span></td><td style="text-align:right;font-family:var(--font-mono);font-weight:600;color:${col}">${isInc?'+':'-'}&pound;${(parseFloat(e.amount) || 0).toLocaleString()}</td><td><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.9rem" data-action="removeFinanceEntry" data-arg0="${idx}">&times;</button></td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
}
window.renderFinancesView = renderFinancesView;

/** Load actual expense data grouped by month and category from the expense reports */
export async function loadExpenseActuals() {
  try {
    const data = await window.apiCall('/api/expenses');
    if (!data) return null;
    const expenses = Array.isArray(data) ? data : (data.expenses || []);
    // Group by month (1-12) and category
    const actuals = {}; // { "2026-01": { "Software & Subscriptions": 324, ... }, ... }
    expenses.forEach(e => {
      const d = e.date ? new Date(e.date) : null;
      if (!d || d.getFullYear() !== 2026) return;
      const monthKey = `2026-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!actuals[monthKey]) actuals[monthKey] = { total: 0 };
      const cat = e.category_name || 'Other';
      actuals[monthKey][cat] = (actuals[monthKey][cat] || 0) + (parseFloat(e.amount) || 0);
      actuals[monthKey].total += parseFloat(e.amount) || 0;
    });
    return actuals;
  } catch(e) { return null; }
}
window.loadExpenseActuals = loadExpenseActuals;

/** Render actual vs forecast badges on monthly view cells */
export function renderActualsBadges() {
  const actuals = window._expenseActuals;
  if (!actuals) return;
  const now = new Date();
  const curMonth = now.getFullYear() === 2026 ? now.getMonth() : -1;
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
window.renderActualsBadges = renderActualsBadges;

/** Render month-by-month financial view — months across top, categories down left, all editable */
export function renderMonthlyFinanceView(S, months, hasFx) {
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
  const thStyle = 'text-align:right;font-size:0.72rem;min-width:68px;padding:4px 6px';
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
  const curMonth = now.getFullYear() === 2026 ? now.getMonth() : -1;
  let html = `<div class="report__section"><h2>Monthly P&amp;L &mdash; FY 2026</h2>
    <div style="overflow-x:auto"><table class="report-table" style="width:100%;min-width:1100px;font-size:0.82rem">
    <thead><tr><th style="min-width:200px;position:sticky;left:0;background:var(--bg-surface);z-index:1">Category</th>`;
  months.forEach((m, i) => {
    const isFuture = i > curMonth;
    const cur = i === curMonth ? 'background:color-mix(in srgb, var(--accent) 15%, var(--bg-surface));font-weight:700' :
      (isFuture ? 'opacity:0.6;font-style:italic' : 'background:color-mix(in srgb, var(--success) 6%, var(--bg-surface))');
    const label = isFuture ? m + ' <span style="font-size:0.55rem;display:block;font-style:italic">forecast</span>' :
      (i === curMonth ? m + ' <span style="font-size:0.55rem;display:block;font-weight:400">current</span>' :
      m + ' <span style="font-size:0.55rem;display:block;color:var(--success)">actual</span>');
    html += `<th style="${thStyle};${cur}">${label}</th>`;
  });
  html += `<th style="${thStyle};font-weight:700">FY Total</th></tr></thead><tbody>`;

  // ===== REVENUE SECTION =====
  html += `<tr style="background:var(--success-bg);border-top:2px solid var(--success-border)"><td colspan="${months.length + 2}" style="font-weight:700;color:var(--success);padding:6px 8px">Revenue</td></tr>`;
  S.revenue.forEach((r, ri) => {
    const defaultMo = Math.round(r.annual / 12);
    let rowTotal = 0;
    html += `<tr><td style="padding-left:20px;position:sticky;left:0;background:var(--bg-surface);z-index:1">${window.esc(r.client)} <span style="color:var(--text-muted);font-size:0.68rem">(${window.esc(r.type)})</span></td>`;
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
    html += `<tr><td style="padding-left:20px;position:sticky;left:0;background:var(--bg-surface);z-index:1">${window.esc(p.name)} <span style="color:var(--text-muted);font-size:0.68rem">${window.esc(p.role)}${p.billable ? ' (billable)' : ''}</span></td>`;
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
    html += `<tr><td style="padding-left:20px;position:sticky;left:0;background:var(--bg-surface);z-index:1">${window.esc(o.name)}</td>`;
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
  const curMo = now.getFullYear() === 2026 ? now.getMonth() : -1;
  html += `</table></div>
    <div style="display:flex;gap:16px;margin-top:8px;font-size:0.72rem;color:var(--text-muted)">
      <span>&#9632; <strong style="color:var(--accent-text)">Actual</strong> = from expense reports (Jan${curMo > 0 ? '-' + months[curMo] : ''})</span>
      <span>&#9633; <strong>Forecast</strong> = projected (${months[Math.min(curMo+1,11)]}-Dec)</span>
    </div>
  </div>`;
  return html;
}
window.renderMonthlyFinanceView = renderMonthlyFinanceView;

/** Save a monthly override value and re-render */
export function updateMonthlyOverride(key, value) {
  if (!window._monthlyOverrides) window._monthlyOverrides = {};
  window._monthlyOverrides[key] = parseFloat(value) || 0;
  localStorage.setItem('nbi_monthly_overrides', JSON.stringify(window._monthlyOverrides));
}
window.updateMonthlyOverride = updateMonthlyOverride;

/** Add an ad-hoc finance entry (income or expense) from the inline form */
export function addFinanceEntry() {
  const name = document.getElementById('finName').value.trim();
  const amount = document.getElementById('finAmount').value;
  const category = document.getElementById('finCategory').value;
  const type = document.getElementById('finType').value;
  const tag = document.getElementById('finTag').value;
  const date = document.getElementById('finDate').value;
  if (!name || !amount) { window.toast('Name and amount are required', 'warning'); return; }
  _financeEntries.push({ name, amount: parseFloat(amount), category, type, tag, date, createdAt: new Date().toISOString() });
  localStorage.setItem('nbi_finance_entries', JSON.stringify(_financeEntries));
  window.renderContent();
  window.toast('Entry added');
}
window.addFinanceEntry = addFinanceEntry;

/** Remove an ad-hoc finance entry by index */
export function removeFinanceEntry(idx) {
  _financeEntries.splice(idx, 1);
  localStorage.setItem('nbi_finance_entries', JSON.stringify(_financeEntries));
  window.renderContent();
  window.toast('Entry removed');
}
window.removeFinanceEntry = removeFinanceEntry;

/** Export the structured finance data (revenue, payroll, pipeline, opex) as a CSV download */
export function exportFinancesCSV() {
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
window.exportFinancesCSV = exportFinancesCSV;

/** Render a paired bar chart comparing monthly revenue vs expenses across 12 months */
export function renderMonthlyBarChart(months, revData, expData) {
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
window.renderMonthlyBarChart = renderMonthlyBarChart;

/** Export the P&L statement as a structured CSV with section headers and totals */
export function exportPnLCSV() {
  const S = getFinanceData();
  try { _financeEntries = JSON.parse(localStorage.getItem('nbi_finance_entries') || '[]'); } catch(e) { _financeEntries = []; }

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
  rows.push(['NBI Analytics Ltd - Income Statement (P&L) - FY 2026', '']);
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
window.exportPnLCSV = exportPnLCSV;

// Register this view with the router
registerView('finances', renderFinancesView);
