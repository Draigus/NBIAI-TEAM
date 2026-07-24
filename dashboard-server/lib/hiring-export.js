'use strict';

const ExcelJS = require('exceljs');
const { buildCostMatrix, moneyFromPence, monthKeyOf } = require('./hiring-costs');

const STATUS_FILLS = {
  approved: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } },
  pending:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } },
  denied:   { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } },
};

const CURRENCY_FMT = '£#,##0.00;[Red]-£#,##0.00';
const PCT_FMT = '0.00%';

function addHiringPlanSheet(wb, roles, caps) {
  const ws = wb.addWorksheet('Hiring Plan');

  const headers = ['Title', 'Department', 'Seniority', 'Employment Type', 'Status', 'Approval', 'Priority', 'Target Start', 'Description'];
  if (caps.view_financials) {
    headers.push('Budget', 'Comp Min', 'Comp Max', 'Currency', 'Basis', 'Workdays/Month', 'FX Rate', 'On-Cost Override %');
  }

  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell(c => { c.alignment = { wrapText: true }; });

  ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + headers.length)}1` };

  for (const role of roles) {
    const row = [
      role.title || '',
      role.department_name || '',
      role.seniority || '',
      role.employment_type || '',
      role.status || '',
      role.approval_status || '',
      role.priority != null ? role.priority : '',
      role.target_start_month ? monthKeyOf(role.target_start_month) : '',
      role.description || '',
    ];
    if (caps.view_financials) {
      row.push(
        role.budgeted_compensation != null ? Number(role.budgeted_compensation) : '',
        role.compensation_min != null ? Number(role.compensation_min) : '',
        role.compensation_max != null ? Number(role.compensation_max) : '',
        role.compensation_currency || '',
        role.compensation_basis || '',
        role.expected_workdays_per_month != null ? Number(role.expected_workdays_per_month) : '',
        role.fx_rate_to_gbp != null ? Number(role.fx_rate_to_gbp) : '',
        role.on_cost_override_pct != null ? Number(role.on_cost_override_pct) : '',
      );
    }
    const dataRow = ws.addRow(row);
    const fill = STATUS_FILLS[role.approval_status];
    if (fill) dataRow.eachCell(c => { c.fill = fill; });
  }

  ws.columns.forEach(col => { col.width = 16; });
  const titleCol = ws.getColumn(1);
  titleCol.width = 28;
  const descCol = ws.getColumn(headers.indexOf('Description') + 1);
  descCol.width = 40;
}

function addMonthlyCostsSheet(wb, costMatrix) {
  const ws = wb.addWorksheet('Monthly Costs');

  const headers = ['Role', ...costMatrix.months];
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };

  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

  // Amber = base cost only (loaded unknown because the client on-cost
  // default is unset). Matches the matrix UI: a role whose salary is on
  // record must never export as a blank month (Glen 2026-07-24).
  const BASE_ONLY_FONT = { color: { argb: 'FFB45309' } };
  let sheetHasBaseOnly = false;

  for (const row of costMatrix.rows) {
    const cells = [row.title || row.role_id];
    const baseOnlyCols = [];
    for (let i = 0; i < row.loaded_gbp_pence.length; i++) {
      const loaded = row.loaded_gbp_pence[i];
      const base = row.base_gbp_pence[i];
      if (loaded != null) {
        cells.push(loaded / 100);
      } else if (base != null) {
        cells.push(base / 100);
        baseOnlyCols.push(i + 2);
      } else {
        cells.push('');
      }
    }
    const dataRow = ws.addRow(cells);
    for (let i = 2; i <= cells.length; i++) {
      const cell = dataRow.getCell(i);
      if (typeof cell.value === 'number') cell.numFmt = CURRENCY_FMT;
    }
    for (const col of baseOnlyCols) {
      dataRow.getCell(col).font = BASE_ONLY_FONT;
      sheetHasBaseOnly = true;
    }
  }

  const addTotalRow = (label, bucket) => {
    const cells = [label];
    const baseOnlyCols = [];
    for (let i = 0; i < bucket.loaded_gbp_pence.length; i++) {
      const baseOnly = bucket.base_only_gbp_pence ? bucket.base_only_gbp_pence[i] : 0;
      cells.push((bucket.loaded_gbp_pence[i] + baseOnly) / 100);
      if (baseOnly > 0) baseOnlyCols.push(i + 2);
    }
    const row = ws.addRow(cells);
    row.font = { bold: true };
    for (let i = 2; i <= cells.length; i++) {
      row.getCell(i).numFmt = CURRENCY_FMT;
    }
    for (const col of baseOnlyCols) {
      row.getCell(col).font = { bold: true, ...BASE_ONLY_FONT };
      sheetHasBaseOnly = true;
    }
  };

  addTotalRow('Approved Total', costMatrix.totals.approved);
  addTotalRow('Pending Total', costMatrix.totals.pending);
  addTotalRow('Combined Total', costMatrix.totals.combined);

  if (sheetHasBaseOnly) {
    ws.addRow([]);
    const legend = ws.addRow(['Amber figures are base salary only — the FTE weighting % is not set for this client. Contractors are never weighted.']);
    legend.font = BASE_ONLY_FONT;
  }

  ws.getColumn(1).width = 28;
  for (let i = 2; i <= headers.length; i++) {
    ws.getColumn(i).width = 14;
  }
}

function addPipelineSummarySheet(wb, roles) {
  const ws = wb.addWorksheet('Pipeline Summary');

  const allStages = new Set();
  for (const role of roles) {
    if (role.candidate_counts && typeof role.candidate_counts === 'object') {
      for (const stage of Object.keys(role.candidate_counts)) {
        allStages.add(stage);
      }
    }
  }
  const stages = [...allStages].sort();

  const headers = ['Role', 'Total Candidates', ...stages];
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };

  for (const role of roles) {
    const counts = role.candidate_counts || {};
    const total = role.candidate_total || 0;
    const row = [role.title || '', total];
    for (const stage of stages) {
      row.push(counts[stage] || 0);
    }
    ws.addRow(row);
  }

  ws.getColumn(1).width = 28;
}

function addAssumptionsSheet(wb, settings, metadata) {
  const ws = wb.addWorksheet('Assumptions');

  ws.addRow(['Setting', 'Value']).font = { bold: true };
  // An unset default prints "not set", never a fabricated 0: the cost rows
  // in this same workbook are blank for such roles and the two must agree.
  const pctCell = (v) => (v === null || v === undefined || v === '' ? 'not set' : Number(v));
  ws.addRow(['FTE Weighting %', settings ? pctCell(settings.fte_on_cost_pct) : 'not set']);
  ws.addRow(['Contractor Weighting', 'none — contractors are never weighted']);
  ws.addRow([]);
  ws.addRow(['Permitted Currencies', settings && settings.permitted_currencies ? settings.permitted_currencies.join(', ') : 'GBP']);
  ws.addRow([]);
  ws.addRow(['Generated', metadata.generatedAt || new Date().toISOString()]);
  ws.addRow(['Client', metadata.clientName || '']);

  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 30;
}

function buildHiringPlanWorkbook(roles, costMatrix, settings, caps, metadata) {
  const wb = new ExcelJS.Workbook();

  addHiringPlanSheet(wb, roles, caps);

  if (caps.view_financials && costMatrix) {
    const titleMap = new Map(roles.map(r => [r.id, r.title]));
    const enrichedRows = costMatrix.rows.map(row => ({
      ...row,
      title: titleMap.get(row.role_id) || row.role_id,
    }));
    addMonthlyCostsSheet(wb, { ...costMatrix, rows: enrichedRows });
  }

  addPipelineSummarySheet(wb, roles);

  if (caps.view_financials) {
    addAssumptionsSheet(wb, settings, metadata);
  }

  return wb;
}

async function writeWorkbookResponse(wb, res, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const buffer = await wb.xlsx.writeBuffer();
  res.send(Buffer.from(buffer));
}

module.exports = {
  buildHiringPlanWorkbook,
  writeWorkbookResponse,
};
