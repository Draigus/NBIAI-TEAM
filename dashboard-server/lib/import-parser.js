// lib/import-parser.js — CSV/Excel parsing and task mapping for import
const fs = require('fs');
const ExcelJS = require('exceljs');

function detectImportFormat(headers) {
  const h = headers.map(x => String(x || '').toLowerCase().trim());
  if (h.includes('_temp_id') && h.includes('_temp_parent_id') && h.includes('item_type'))
    return { format: 'nbi-hierarchy-csv', label: 'NBI Backlog Builder (Hierarchy)' };
  if (h.includes('task id') && h.includes('bucket name') && h.includes('progress'))
    return { format: 'planner', label: 'Microsoft Planner Export' };
  if (h.includes('name') && h.includes('duration') && (h.includes('start_date') || h.includes('start date')) && (h.includes('finish_date') || h.includes('finish date')))
    return { format: 'ms-project', label: 'Microsoft Project Export' };
  if (h.includes('ref') && h.includes('artifact name') && h.includes('legal basis / driver'))
    return { format: 'ch-artifacts', label: 'Couch Heroes Artifacts Plan' };
  if (h.includes('task') && h.includes('status') && h.includes('priority'))
    return { format: 'nbi-csv', label: 'NBI Task List (CSV)' };
  if (h.includes('task') && h.includes('client') && h.includes('health state'))
    return { format: 'nbi-export', label: 'NBI Dashboard Export' };
  if (h.includes('task') || h.includes('task name') || h.includes('name') || h.includes('title'))
    return { format: 'generic', label: 'Generic Task List' };
  return { format: 'unknown', label: 'Unknown Format' };
}

async function parseExcelFile(filePath, headersOnly) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheetNames = wb.worksheets.map(ws => ws.name);
  const sheets = [];
  for (const ws of wb.worksheets) {
    const rows = [];
    const maxRow = headersOnly ? Math.min(ws.rowCount, 5) : ws.rowCount;
    for (let r = 1; r <= maxRow; r++) {
      const row = ws.getRow(r);
      const vals = [];
      for (let c = 1; c <= row.cellCount; c++) {
        const cell = row.getCell(c);
        const v = cell.value;
        if (v instanceof Date) { const d = v; vals.push(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`); }
        else vals.push(v != null ? String(v) : null);
      }
      rows.push(vals);
    }
    const dataRows = rows.filter(r => r.some(c => c != null && String(c).trim() !== ''));
    if (dataRows.length === 0) continue;
    const headers = dataRows[0].map(x => String(x || '').trim());
    const rowCount = headersOnly ? -1 : dataRows.length - 1;
    const allDataRows = headersOnly ? null : dataRows.slice(1);
    sheets.push({ name: ws.name, headers, rowCount, sample: dataRows.slice(1, 6), rows: allDataRows });
  }
  return { sheetNames, sheets };
}

function parseCSVFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  let row = [], cell = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i+1] === '"') { cell += '"'; i++; } else { inQuote = false; }
      } else { cell += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ''; }
      else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i+1] === '\n') i++;
        row.push(cell.trim()); cell = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
      } else { cell += ch; }
    }
  }
  row.push(cell.trim());
  if (row.some(c => c !== '')) rows.push(row);
  if (rows.length === 0) return null;
  const headers = rows[0];
  return { headers, rowCount: rows.length - 1, rows: rows.slice(1) };
}

function mapRowsToTasks(format, headers, rows) {
  const ci = (name) => headers.findIndex(h => String(h || '').toLowerCase().trim() === name.toLowerCase().trim());
  const ciAny = (...names) => { for (const n of names) { const i = ci(n); if (i >= 0) return i; } return -1; };
  const get = (row, idx) => idx >= 0 && row[idx] != null ? String(row[idx]).trim() : '';

  function normaliseStatus(s) {
    if (!s) return 'Not started';
    const lower = s.toLowerCase().trim();
    const map = { 'not started': 'Not started', 'in progress': 'In progress', 'in-progress': 'In progress',
      planning: 'Planning', drafted: 'Drafted', done: 'Done', completed: 'Done',
      cancelled: 'Cancelled', canceled: 'Cancelled', complete: 'Done' };
    return map[lower] || 'Not started';
  }
  function normalisePriority(p) {
    if (!p) return '';
    const lower = p.toLowerCase().trim();
    const map = { p1: 'Critical ACT', critical: 'Critical ACT', urgent: 'Critical ACT',
      p2: 'High', high: 'High', important: 'High',
      p3: 'Medium', medium: 'Medium', p4: 'Low', low: 'Low' };
    return map[lower] || p;
  }

  function parseDdMmYyyy(s) {
    if (!s) return '';
    const trimmed = String(s).trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return trimmed;
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = (parseInt(yyyy, 10) > 50 ? '19' : '20') + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }

  switch (format) {
    case 'nbi-hierarchy-csv': {
      const iTempId = ci('_temp_id');
      const iTempParent = ci('_temp_parent_id');
      const iItemType = ci('item_type');
      const iTask = ciAny('task', 'task name', 'title');
      const iDesc = ci('description');
      const iStatus = ci('status');
      const iPriority = ci('priority');
      const iHoursEst = ciAny('hours_estimated', 'hours estimated', 'hours est');
      const iHoursSpent = ciAny('hours_spent', 'hours spent');
      const iAssignees = ciAny('assignees', 'assignee', 'assigned to');
      const iClient = ciAny('client_id', 'client');
      const iPractice = ci('practice_area');
      const iStart = ciAny('start_date', 'start date');
      const iEnd = ciAny('end_date', 'end date');
      const iDue = ciAny('due_date', 'due date', 'due');
      const iSuccess = ci('success_factor');
      const iCollab = ci('collaborations');
      const iNotes = ci('notes');
      const validItemTypes = new Set(['project', 'feature', 'story', 'task']);
      return rows.map(r => {
        const title = get(r, iTask);
        if (!title) return null;
        const itRaw = get(r, iItemType).toLowerCase();
        const item_type = validItemTypes.has(itRaw) ? itRaw : 'task';
        return {
          _temp_id: get(r, iTempId),
          _temp_parent_id: get(r, iTempParent),
          item_type,
          title,
          description: get(r, iDesc),
          status: normaliseStatus(get(r, iStatus)),
          priority: normalisePriority(get(r, iPriority)),
          hoursEstimated: parseFloat(get(r, iHoursEst)) || 0,
          hoursSpent: parseFloat(get(r, iHoursSpent)) || 0,
          assignees: get(r, iAssignees) ? get(r, iAssignees).split(/[,;\/]/).map(s => s.trim()).filter(Boolean) : [],
          client: get(r, iClient),
          practice_area: get(r, iPractice),
          start_date: parseDdMmYyyy(get(r, iStart)),
          end_date: parseDdMmYyyy(get(r, iEnd)),
          due_date: parseDdMmYyyy(get(r, iDue)),
          success_factor: get(r, iSuccess),
          collaborations: get(r, iCollab),
          notes: get(r, iNotes),
        };
      }).filter(Boolean);
    }

    case 'nbi-csv':
    case 'nbi-export': {
      const iTask = ciAny('task', 'task name', 'title');
      const iParent = ci('parent task');
      const iStatus = ci('status');
      const iPriority = ci('priority');
      const iDesc = ci('description');
      const iAssignee = ciAny('assignee', 'assigned to');
      const iHealth = ci('health state');
      const iClient = ci('client');
      const iHoursEst = ciAny('hours estimated', 'hours est');
      const iHoursSpent = ci('hours spent');
      const iDue = ciAny('due_date', 'due date', 'due', 'deadline');
      return rows.map(r => ({
        title: get(r, iTask),
        parentTitle: get(r, iParent),
        status: normaliseStatus(get(r, iStatus)),
        priority: normalisePriority(get(r, iPriority)),
        description: get(r, iDesc),
        assignees: get(r, iAssignee) ? get(r, iAssignee).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [],
        healthState: get(r, iHealth),
        client: get(r, iClient),
        hoursEstimated: parseFloat(get(r, iHoursEst)) || 0,
        hoursSpent: parseFloat(get(r, iHoursSpent)) || 0,
        dueDate: parseDdMmYyyy(get(r, iDue)),
      })).filter(t => t.title);
    }

    case 'ch-artifacts': {
      const iRef = ci('ref');
      const iPriority = ci('priority');
      const iName = ci('artifact name');
      const iDesc = ci('description');
      const iDriver = ciAny('legal basis / driver', 'legal basis');
      const iDeadline = ciAny('deadline / trigger', 'deadline');
      const iOwner = ci('owner');
      const iStatus = ci('status');
      const iDeps = ci('dependencies');
      const iNotes = ci('notes');
      return rows.map(r => {
        const ref = get(r, iRef);
        const name = get(r, iName);
        if (!name || name.startsWith('PRIORITY')) return null;
        const desc = [get(r, iDesc), get(r, iDriver) ? 'Legal basis: ' + get(r, iDriver) : '', get(r, iNotes)].filter(Boolean).join('\n\n');
        return {
          title: ref ? `[${ref}] ${name}` : name,
          parentTitle: '',
          status: normaliseStatus(get(r, iStatus)),
          priority: normalisePriority(get(r, iPriority)),
          description: desc,
          assignees: get(r, iOwner) ? get(r, iOwner).split(/[+,;]/).map(s => s.trim()).filter(Boolean) : [],
          healthState: '',
          client: 'Couch Heroes',
          hoursEstimated: 0,
          hoursSpent: 0,
          dueDate: '',
          deadlineTrigger: get(r, iDeadline),
          dependencies: get(r, iDeps),
        };
      }).filter(Boolean);
    }

    case 'ms-project': {
      const iName = ciAny('name', 'task name');
      const iDuration = ci('duration');
      const iStart = ciAny('start_date', 'start date', 'start');
      const iFinish = ciAny('finish_date', 'finish date', 'finish');
      const iResource = ciAny('resource_names', 'resource names', 'resources');
      return rows.map(r => {
        const name = get(r, iName);
        if (!name) return null;
        const startRaw = get(r, iStart);
        const endRaw = get(r, iFinish);
        const parseDate = (s) => { if (!s) return ''; try { const d = new Date(s); return isNaN(d) ? '' : d.toISOString().split('T')[0]; } catch(e) { return ''; } };
        return {
          title: name,
          parentTitle: '',
          status: 'Not started',
          priority: '',
          description: get(r, iDuration) ? 'Duration: ' + get(r, iDuration) : '',
          assignees: get(r, iResource) ? get(r, iResource).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [],
          healthState: '',
          client: 'Couch Heroes',
          hoursEstimated: 0,
          hoursSpent: 0,
          startDate: parseDate(startRaw),
          endDate: parseDate(endRaw),
          dueDate: parseDate(endRaw),
        };
      }).filter(Boolean);
    }

    case 'planner': {
      const iName = ciAny('task name', 'name');
      const iBucket = ci('bucket name');
      const iProgress = ci('progress');
      const iPriority = ci('priority');
      const iAssigned = ci('assigned to');
      const iStartDate = ci('start date');
      const iDueDate = ci('due date');
      const iLate = ci('late');
      const iDesc = ci('description');
      const iTaskId = ci('task id');
      const iLabels = ci('labels');
      return rows.map(r => {
        const name = get(r, iName);
        if (!name) return null;
        const progress = get(r, iProgress).toLowerCase();
        const status = progress === 'completed' ? 'Done' : progress === 'in progress' ? 'In progress' : 'Not started';
        const labels = get(r, iLabels).toLowerCase();
        let health = '';
        if (labels.includes('blocked')) health = 'Blocked';
        else if (get(r, iLate) === 'true') health = 'Red';
        else if (labels.includes('on hold') || labels.includes('review')) health = 'Yellow';
        return {
          title: name,
          parentTitle: get(r, iBucket),
          status,
          priority: normalisePriority(get(r, iPriority)),
          description: get(r, iDesc).replace(/_x000d_/g, ''),
          assignees: get(r, iAssigned) ? get(r, iAssigned).split(';').map(s => s.trim()).filter(Boolean) : [],
          healthState: health,
          client: '',
          hoursEstimated: 0,
          hoursSpent: 0,
          startDate: get(r, iStartDate),
          dueDate: get(r, iDueDate),
          plannerTaskId: get(r, iTaskId),
        };
      }).filter(Boolean);
    }

    default: {
      const iName = ciAny('task', 'task name', 'name', 'title', 'item', 'subject');
      const iStatus = ciAny('status', 'state', 'progress');
      const iAssigned = ciAny('assignee', 'assigned to', 'owner', 'resource');
      const iDesc = ciAny('description', 'details', 'notes');
      const iPriority = ciAny('priority', 'importance');
      const iDue = ciAny('due date', 'due', 'deadline', 'finish date', 'end date');
      return rows.map(r => {
        const name = get(r, iName);
        if (!name) return null;
        return {
          title: name,
          parentTitle: '',
          status: normaliseStatus(get(r, iStatus)),
          priority: normalisePriority(get(r, iPriority)),
          description: get(r, iDesc),
          assignees: get(r, iAssigned) ? get(r, iAssigned).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [],
          healthState: '',
          client: '',
          hoursEstimated: 0,
          hoursSpent: 0,
          dueDate: get(r, iDue),
        };
      }).filter(Boolean);
    }
  }
}

module.exports = { detectImportFormat, parseExcelFile, parseCSVFile, mapRowsToTasks };
