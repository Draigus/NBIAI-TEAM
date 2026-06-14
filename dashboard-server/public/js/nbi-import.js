// ==================== CONTRACT IMPORT WIZARD ====================
let _extractedTasks = [];       // Staging area for contract-extracted tasks
let _contractStoredFile = null;  // Filename of uploaded contract for attachment

/** Open the contract import wizard modal */
function openContractImport() {
  const overlay = document.createElement('div');
  overlay.id = 'contractWizard';
  overlay.className = 'detail-overlay open';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const clientOpts = getContractedClients().map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const rootOpts = getRootTasks().map(r => `<option value="${r.id}">${esc(r.title)}</option>`).join('');

  overlay.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-xl);padding:var(--space-xl);width:600px;max-width:95vw;max-height:85vh;overflow-y:auto;z-index:300" data-stop>
    <h2 style="margin:0 0 16px;font-size:1.1rem">Import Tasks from Contract</h2>
    <div id="contractStep1">
      <div style="margin-bottom:12px"><label style="display:block;font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px">Contract File (PDF or text)</label>
      <input type="file" id="contractFileInput" accept=".pdf,.txt,.docx" style="font-size:0.82rem;color:var(--text-secondary)"></div>
      <div style="margin-bottom:12px"><label style="display:block;font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px">Client</label>
      <select id="contractClientSelect" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem"><option value="">-- Select Client --</option>${clientOpts}</select></div>
      <div style="margin-bottom:16px"><label style="display:block;font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px">Parent Project</label>
      <select id="contractParentSelect" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem"><option value="">-- New Root Project --</option>${rootOpts}</select></div>
      <button class="btn btn--primary" data-action="extractContractTasks">Extract Tasks</button>
    </div>
    <div id="contractStep2" style="display:none"></div>
  </div>`;
  document.body.appendChild(overlay);
}

/** Call the contract extraction endpoint and show preview */
/** Upload a contract file and extract tasks via the AI extraction API */
async function extractContractTasks() {
  const input = document.getElementById('contractFileInput');
  if (!input?.files?.[0]) { toast('Select a file first'); return; }

  const formData = new FormData();
  formData.append('file', input.files[0]);

  toast('Extracting tasks...');
  try {
    const resp = await authFetch('/api/contract/extract', { method: 'POST', body: formData });
    if (!resp.ok) { toast('Extraction failed', 'error'); return; }
    const data = await resp.json();
    _extractedTasks = data.extracted.map((t, i) => ({ ...t, selected: true, idx: i }));
    _contractStoredFile = data.storedFilename;

    // Show step 2: preview table
    const step2 = document.getElementById('contractStep2');
    const step1 = document.getElementById('contractStep1');
    if (step1) step1.style.display = 'none';

    let html = `<div style="margin-bottom:12px;font-size:0.85rem;color:var(--text-secondary)">${data.extracted.length} tasks extracted from <strong>${esc(data.filename)}</strong> (${data.totalLines} lines scanned)</div>`;

    if (_extractedTasks.length === 0) {
      html += '<div style="padding:20px;text-align:center;color:var(--text-muted)">No tasks found. Try a different file format.</div>';
    } else {
      html += '<div style="display:flex;gap:8px;margin-bottom:8px"><button class="btn btn--sm" data-action="toggleAllContractTasks" data-arg0="true">Select All</button><button class="btn btn--sm" data-action="toggleAllContractTasks" data-arg0="false">Deselect All</button></div>';
      html += '<div style="max-height:350px;overflow-y:auto"><table class="leads-table" style="font-size:0.78rem"><thead><tr><th style="width:30px"></th><th>Title</th><th style="width:90px">Type</th><th style="width:90px">Due Date</th></tr></thead><tbody>';
      _extractedTasks.forEach((t, i) => {
        html += `<tr><td><input type="checkbox" checked onchange="_extractedTasks[${i}].selected=this.checked"></td>`;
        html += `<td><input style="width:100%;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:3px 6px;color:var(--text-primary);font-size:0.78rem" value="${esc(t.title)}" onchange="_extractedTasks[${i}].title=this.value"></td>`;
        html += `<td><select style="font-size:0.75rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);padding:2px" onchange="_extractedTasks[${i}].type=this.value"><option value="task" ${t.type==='task'?'selected':''}>Task</option><option value="milestone" ${t.type==='milestone'?'selected':''}>Milestone</option><option value="deliverable" ${t.type==='deliverable'?'selected':''}>Deliverable</option></select></td>`;
        html += `<td><input type="date" value="${t.dueDate||''}" style="font-size:0.75rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);padding:2px" onchange="_extractedTasks[${i}].dueDate=this.value"></td></tr>`;
      });
      html += '</tbody></table></div>';
    }

    html += `<div style="display:flex;gap:8px;margin-top:16px">`;
    html += `<button class="btn btn--primary" data-action="createContractTasks">Create ${_extractedTasks.filter(t=>t.selected).length} Tasks</button>`;
    html += `<button class="btn" data-action="_actModalRemove" data-arg0="contractWizard">Cancel</button>`;
    html += `</div>`;

    if (step2) { step2.innerHTML = html; step2.style.display = 'block'; }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Select or deselect all extracted contract tasks */
function toggleAllContractTasks(val) {
  const boolVal = val === true || val === 'true';
  _extractedTasks.forEach(t => t.selected = boolVal);
  document.querySelectorAll('#contractStep2 input[type="checkbox"]').forEach(cb => cb.checked = boolVal);
}

/** Create the selected tasks from the contract extraction */
/** Create tasks from selected contract extractions and attach the source document */
async function createContractTasks() {
  const selected = _extractedTasks.filter(t => t.selected);
  if (selected.length === 0) { toast('No tasks selected'); return; }

  const client = document.getElementById('contractClientSelect')?.value || '';
  const parentId = document.getElementById('contractParentSelect')?.value || null;

  toast(`Creating ${selected.length} tasks...`);

  // Create each task individually (uses the existing sync mechanism)
  for (const t of selected) {
    const id = crypto.randomUUID();
    tasks.push({
      id, title: t.title, parentId: parentId || null, client: client,
      status: 'Not started', priority: t.type === 'milestone' ? 'High' : '',
      healthState: '', description: `Imported from contract (${t.type})`,
      assignees: [], hoursEstimated: 0, hoursSpent: 0,
      dueDate: t.dueDate || '', startDate: '', endDate: '',
      dependencies: [], notes: [], createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), _serverUpdatedAt: null,
    });
    markDirty(id);
  }
  save();

  // Optionally attach the contract file to the parent project
  if (_contractStoredFile && parentId) {
    try {
      // Create attachment record directly by calling the API
      await authFetch(`/api/attachments/entity/project/${parentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: _contractStoredFile, original_name: 'Contract.pdf' })
      });
    } catch(e) { /* Best effort — file is already on disk */ }
  }

  _extractedTasks = [];
  _contractStoredFile = null;
  document.getElementById('contractWizard')?.remove();
  toast(`${selected.length} tasks created`);
  renderAll();
}

// ==================== DOWNLOADS / EXCEL IMPORT ====================
let _downloadsImportData = null;

/** Open the Downloads scanner import wizard */
async function openDownloadsImport() {
  const overlay = document.createElement('div');
  overlay.id = 'downloadsWizard';
  overlay.className = 'detail-overlay open';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-xl);padding:var(--space-xl);width:750px;max-width:95vw;max-height:85vh;overflow-y:auto;z-index:300" data-stop>
    <h2 style="margin:0 0 16px;font-size:1.1rem">Import from Downloads</h2>
    <div id="dlStep1"><div style="text-align:center;padding:24px;color:var(--text-muted)">Scanning Downloads folder...</div></div>
    <div id="dlStep2" style="display:none"></div>
    <div id="dlStep3" style="display:none"></div>
  </div>`;
  document.body.appendChild(overlay);

  // Fetch file list
  try {
    const data = await apiCall('/api/import/scan-downloads');
    if (!data) { overlay.remove(); return; }
    renderDownloadsFileList(data);
  } catch(e) { toast('Scan failed: ' + e.message, 'error'); overlay.remove(); }
}

/** Render the list of downloadable server files with sheet selectors for Excel files */
function renderDownloadsFileList(data) {
  const step1 = document.getElementById('dlStep1');
  if (!step1) return;

  const importableFormats = ['nbi-csv', 'nbi-export', 'planner', 'ms-project', 'ch-artifacts', 'generic'];
  const importable = data.files.filter(f => importableFormats.includes(f.format));
  const unknown = data.files.filter(f => !importableFormats.includes(f.format));

  const formatBadge = (f) => {
    const colours = { 'nbi-csv': 'var(--success)', 'nbi-export': 'var(--success)', planner: '#6366f1', 'ms-project': '#0ea5e9', 'ch-artifacts': 'var(--warning)', generic: 'var(--text-muted)' };
    return `<span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:0.75rem;background:${colours[f.format] || 'var(--text-muted)'};color:#fff;white-space:nowrap">${esc(f.formatLabel)}</span>`;
  };

  const fmtSize = (b) => b > 1048576 ? (b/1048576).toFixed(1) + ' MB' : b > 1024 ? (b/1024).toFixed(0) + ' KB' : b + ' B';
  const fmtDate = (d) => { const dt = new Date(d); return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };

  let html = `<div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px">${data.files.length} Excel/CSV files found in Downloads. ${importable.length} have recognised task formats.</div>`;

  if (importable.length > 0) {
    // Group by folder
    const folders = {};
    importable.forEach(f => { const folder = f.folder || ''; if (!folders[folder]) folders[folder] = []; folders[folder].push(f); });
    const folderNames = Object.keys(folders).sort((a, b) => a === '' ? -1 : b === '' ? 1 : a.localeCompare(b));

    html += '<div style="max-height:400px;overflow-y:auto"><table class="leads-table" style="font-size:0.78rem"><thead><tr><th>File</th><th style="width:160px">Format</th><th style="width:50px">Rows</th><th style="width:60px">Size</th><th style="width:60px">Date</th><th style="width:70px"></th></tr></thead><tbody>';
    folderNames.forEach(folder => {
      if (folder) {
        html += `<tr><td colspan="6" style="font-weight:600;color:var(--accent-text);padding:8px 4px;font-size:0.8rem">&#128193; ${esc(folder)}/</td></tr>`;
      }
      folders[folder].forEach(f => {
        const rawName = f.folder ? f.name.split('/').pop() : f.name;
        const nameNoExt = rawName.replace(/\.[^.]+$/, '').replace(/[-_ ]+/g, ' ').trim().toLowerCase();
        const planNorm = (f.planName || '').replace(/[-_: ]+/g, ' ').trim().toLowerCase();
        const planMatch = f.planName && (planNorm === nameNoExt || rawName.toLowerCase().startsWith(planNorm));
        const displayName = f.planName && !planMatch ? f.planName : rawName;
        const subtitle = (f.planName && !planMatch) ? `<br><span style="font-size:0.75rem;color:var(--text-muted)">${esc(rawName)}</span>` : '';
        html += `<tr>`;
        html += `<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis" title="${esc(f.name)}">${esc(displayName)}${subtitle}</td>`;
        html += `<td>${formatBadge(f)}</td>`;
        html += `<td>${f.rowCount >= 0 ? f.rowCount : '--'}</td>`;
        html += `<td>${fmtSize(f.size)}</td>`;
        html += `<td>${fmtDate(f.modified)}</td>`;
        html += `<td><button class="btn btn--sm btn--primary" data-action="previewDownloadsFile" data-arg0="${esc(f.name)}">Preview</button></td>`;
        html += `</tr>`;
      });
    });
    html += '</tbody></table></div>';
  }

  if (unknown.length > 0) {
    html += `<details style="margin-top:12px"><summary style="font-size:0.78rem;color:var(--text-muted);cursor:pointer">${unknown.length} files with unrecognised format</summary>`;
    html += '<div style="max-height:200px;overflow-y:auto;margin-top:8px"><table class="leads-table" style="font-size:0.75rem"><thead><tr><th>File</th><th>Size</th><th>Date</th></tr></thead><tbody>';
    unknown.forEach(f => {
      html += `<tr><td title="${esc(f.name)}" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</td><td>${fmtSize(f.size)}</td><td>${fmtDate(f.modified)}</td></tr>`;
    });
    html += '</tbody></table></div></details>';
  }

  html += `<div style="margin-top:16px;text-align:right"><button class="btn" data-action="_actModalRemove" data-arg0="downloadsWizard">Close</button></div>`;
  step1.innerHTML = html;
}

/** Preview a specific file before importing */
/** Fetch and display a preview of a server-side file for column mapping */
async function previewDownloadsFile(filename, sheet) {
  const step1 = document.getElementById('dlStep1');
  const step2 = document.getElementById('dlStep2');
  if (!step1 || !step2) return;

  step1.style.display = 'none';
  step2.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Parsing file...</div>';
  step2.style.display = 'block';

  try {
    const body = { filename };
    if (sheet) body.sheet = sheet;
    const resp = await authFetch('/api/import/parse-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) { const err = await resp.json(); toast(err.error || 'Parse failed', 'error'); step2.style.display = 'none'; step1.style.display = 'block'; return; }
    const data = await resp.json();
    _downloadsImportData = data;
    renderDownloadsPreview(data);
  } catch(e) { toast('Parse error: ' + e.message, 'error'); step2.style.display = 'none'; step1.style.display = 'block'; }
}

/** Render the column mapping UI and data preview for a server file import */
function renderDownloadsPreview(data) {
  const step2 = document.getElementById('dlStep2');
  if (!step2) return;

  const clientOpts = getContractedClients().map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const rootOpts = getRootTasks().map(r => `<option value="${r.id}">${esc(r.title)}</option>`).join('');

  let html = `<div style="margin-bottom:12px"><button class="btn btn--sm" data-action="_actDlStepBack">&larr; Back to file list</button></div>`;

  html += `<div style="margin-bottom:12px;font-size:0.85rem"><strong>${esc(data.filename)}</strong> &mdash; <span style="color:var(--accent-text)">${esc(data.formatLabel)}</span> &mdash; ${data.totalRows} rows`;
  if (data.sheets) html += ` &mdash; Sheets: ${data.sheets.join(', ')}`;
  html += `</div>`;

  // Hierarchy CSV stats + data quality warnings (NBI Backlog Builder format).
  if (data.format === 'nbi-hierarchy-csv' && Array.isArray(data.tasks)) {
    const counts = { project: 0, feature: 0, story: 0, task: 0 };
    const titlesByType = { project: {}, feature: {}, story: {} };
    const tempIds = new Set();
    let emptyTitle = 0, corruption = 0, withParent = 0;
    const clientNames = new Set();
    data.tasks.forEach(t => {
      const it = t.item_type || 'task';
      counts[it] = (counts[it] || 0) + 1;
      if (t._temp_id) tempIds.add(t._temp_id);
      if (t._temp_parent_id) withParent++;
      if (!t.title) emptyTitle++;
      if (titlesByType[it]) {
        const k = (t.title || '').trim();
        if (k) titlesByType[it][k] = (titlesByType[it][k] || 0) + 1;
      }
      const blob = `${t.title || ''} ${t.success_factor || ''} ${t.description || ''}`;
      if (/confirMedium|Criticalical/i.test(blob)) corruption++;
      if (t.client) clientNames.add(t.client);
    });
    let orphans = 0;
    data.tasks.forEach(t => { if (t._temp_parent_id && !tempIds.has(t._temp_parent_id)) orphans++; });
    const dups = [];
    Object.entries(titlesByType).forEach(([type, m]) => {
      Object.entries(m).forEach(([title, n]) => { if (n > 1) dups.push(`${type}: "${title}" (×${n})`); });
    });

    html += `<div style="margin-bottom:12px;padding:10px 12px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);font-size:0.78rem">`;
    html += `<div style="font-weight:600;margin-bottom:6px">Hierarchy detected</div>`;
    html += `<div style="display:flex;gap:14px;flex-wrap:wrap;color:var(--text-secondary)">`;
    html += `<span><strong style="color:var(--text-primary)">${counts.project}</strong> project(s)</span>`;
    html += `<span><strong style="color:var(--text-primary)">${counts.feature}</strong> feature(s)</span>`;
    html += `<span><strong style="color:var(--text-primary)">${counts.story}</strong> stor${counts.story === 1 ? 'y' : 'ies'}</span>`;
    html += `<span><strong style="color:var(--text-primary)">${counts.task}</strong> task(s)</span>`;
    if (clientNames.size) html += `<span>Client(s): <strong style="color:var(--text-primary)">${esc([...clientNames].join(', '))}</strong></span>`;
    html += `</div>`;

    const warnings = [];
    if (emptyTitle) warnings.push(`${emptyTitle} row(s) with empty title — will be dropped`);
    if (orphans) warnings.push(`${orphans} row(s) reference a parent _temp_id that is not in the file — will become root tasks`);
    if (dups.length) warnings.push(`Duplicate titles at the same level: ${dups.join('; ')} — hierarchy is preserved by _temp_id, but rename for clarity`);
    if (corruption) warnings.push(`${corruption} cell(s) contain "confirMedium" / "Criticalical" autocorrect damage — imported as-is, edit after load`);
    if (warnings.length) {
      html += `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border-default);color:var(--accent-text)">`;
      html += `<div style="font-weight:600;margin-bottom:4px">⚠ Data quality warnings (non-blocking)</div>`;
      html += `<ul style="margin:0;padding-left:18px">${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  // Sheet selector for multi-sheet files
  if (data.sheets && data.sheets.length > 1) {
    html += `<div style="margin-bottom:12px"><label style="font-size:0.78rem;color:var(--text-secondary)">Sheet: </label><select id="dlSheetSelect" onchange="reloadDownloadsSheet()" style="padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem">`;
    data.sheets.forEach(s => { html += `<option value="${esc(s)}" ${s === data.activeSheet ? 'selected' : ''}>${esc(s)}</option>`; });
    html += `</select></div>`;
  }

  // Client & parent selectors
  html += `<div style="display:flex;gap:12px;margin-bottom:12px">`;
  html += `<div style="flex:1"><label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Assign to Client</label>
    <select id="dlClientSelect" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem">
      <option value="">-- Auto-detect / None --</option>${clientOpts}</select></div>`;
  html += `<div style="flex:1"><label style="display:block;font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">Parent Project</label>
    <select id="dlParentSelect" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem">
      <option value="">-- Create as root tasks --</option>${rootOpts}</select></div>`;
  html += `</div>`;

  // Import mode
  html += `<div style="margin-bottom:12px"><label style="font-size:0.78rem;color:var(--text-secondary)">Import mode: </label>
    <select id="dlModeSelect" style="padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem">
      <option value="append">Append (add to existing tasks)</option>
      <option value="replace">Replace all tasks (clear first)</option>
    </select></div>`;

  // Preview table
  const preview = data.preview || [];
  if (preview.length > 0) {
    html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">Preview (first ${preview.length} of ${data.totalRows} rows):</div>`;
    html += '<div style="max-height:250px;overflow:auto"><table class="leads-table" style="font-size:0.75rem"><thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Assignees</th><th>Due</th></tr></thead><tbody>';
    preview.forEach(t => {
      html += `<tr>`;
      html += `<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title || '')}</td>`;
      html += `<td>${esc(t.status || '')}</td>`;
      html += `<td>${esc(t.priority || '')}</td>`;
      html += `<td>${esc((t.assignees || []).join(', '))}</td>`;
      html += `<td>${esc(t.dueDate || t.endDate || '')}</td>`;
      html += `</tr>`;
    });
    if (data.totalRows > preview.length) html += `<tr><td colspan="5" style="color:var(--text-muted);text-align:center">... and ${data.totalRows - preview.length} more rows</td></tr>`;
    html += '</tbody></table></div>';
  }

  html += `<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">`;
  html += `<button class="btn" data-action="_actDlStepBack">Cancel</button>`;
  html += `<button class="btn btn--primary" data-action="executeDownloadsImport">Import ${data.tasks ? data.tasks.length : 0} Tasks</button>`;
  html += `</div>`;

  step2.innerHTML = html;
}

/** Reload a different sheet from the same file */
/** Reload preview when the user selects a different sheet */
async function reloadDownloadsSheet() {
  const sheet = document.getElementById('dlSheetSelect')?.value;
  if (!_downloadsImportData || !sheet) return;
  await previewDownloadsFile(_downloadsImportData.filename, sheet);
}

/** Execute the import — create tasks from parsed data */
/** Execute the import: map columns, transform rows into tasks, and merge with existing data */
async function executeDownloadsImport() {
  if (!_downloadsImportData || !_downloadsImportData.tasks) { toast('No data to import'); return; }

  const importTasks = _downloadsImportData.tasks;
  const clientOverride = document.getElementById('dlClientSelect')?.value || '';
  const parentId = document.getElementById('dlParentSelect')?.value || null;
  const mode = document.getElementById('dlModeSelect')?.value || 'append';

  if (importTasks.length === 0) { toast('No tasks found in file'); return; }

  // Hierarchy CSV (NBI Backlog Builder format) takes a separate path that
  // posts straight to /api/tasks/bulk so _temp_id parent linking and
  // item_type are preserved. The legacy local path below collapses
  // everything to flat tasks via title-based parent matching, which is
  // what produced the failed Couch Heroes import (bug df1fb00b).
  if (_downloadsImportData.format === 'nbi-hierarchy-csv') {
    return executeHierarchyImport(importTasks, clientOverride, parentId, mode);
  }

  if (mode === 'replace') {
    if (!(await themedConfirm(`This will replace ALL existing tasks with ${importTasks.length} imported tasks. Continue?`))) return;
    tasks.forEach(t => markDeleted(t.id));
    tasks = [];
  }

  // Build tasks with IDs and resolve parent relationships
  const newTasks = [];
  const titleMap = {};

  importTasks.forEach(t => {
    const id = uid();
    const task = {
      id, title: t.title, parentId: parentId || null,
      client: clientOverride || t.client || '',
      status: t.status || 'Not started',
      priority: t.priority || '',
      healthState: t.healthState || '',
      description: t.description || '',
      assignees: t.assignees || [],
      hoursEstimated: t.hoursEstimated || 0,
      hoursSpent: t.hoursSpent || 0,
      dueDate: t.dueDate || '',
      startDate: t.startDate || '',
      endDate: t.endDate || '',
      dependencies: [],
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _serverUpdatedAt: null,
      _parentTitle: t.parentTitle || '',
    };
    if (t.plannerTaskId) task.plannerTaskId = t.plannerTaskId;
    if (!titleMap[t.title]) titleMap[t.title] = id;
    newTasks.push(task);
  });

  // Resolve parent titles to IDs
  newTasks.forEach(t => {
    if (t._parentTitle && t._parentTitle !== t.title) {
      let pid = titleMap[t._parentTitle];
      if (!pid) {
        // Check existing tasks too
        const existing = tasks.find(x => x.title === t._parentTitle);
        if (existing) { pid = existing.id; }
        else {
          // Create parent as group task
          const parentTask = {
            id: uid(), title: t._parentTitle, parentId: parentId || null,
            client: clientOverride || t.client || '', status: 'In progress', priority: '',
            healthState: '', description: '', assignees: [], hoursEstimated: 0, hoursSpent: 0,
            dueDate: '', startDate: '', endDate: '', dependencies: [], notes: [],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _serverUpdatedAt: null,
          };
          titleMap[t._parentTitle] = parentTask.id;
          newTasks.push(parentTask);
          pid = parentTask.id;
        }
      }
      t.parentId = pid;
    }
    delete t._parentTitle;
  });

  // Auto-detect client from root task names if no override
  if (!clientOverride) {
    const clientAliases = {
      'Couch Heroes': ['couch heroes', 'couch'], 'Lighthouse Studios': ['lighthouse'],
      'Sarge Universe': ['sarge'], 'Goals Studio': ['goals'], 'Playsage': ['playsage'],
      'NBI Operations': ['nbi operations', 'nbi internal', 'nbi'],
    };
    newTasks.filter(t => !t.parentId || t.parentId === parentId).forEach(t => {
      if (t.client) return;
      const lower = t.title.toLowerCase();
      for (const [client, aliases] of Object.entries(clientAliases)) {
        if (aliases.some(a => lower.includes(a))) { t.client = client; break; }
      }
    });
  }

  // Inherit client from parent
  newTasks.forEach(t => {
    if (!t.client && t.parentId) {
      const parent = newTasks.find(p => p.id === t.parentId) || tasks.find(p => p.id === t.parentId);
      if (parent && parent.client) t.client = parent.client;
    }
  });

  // Add to task list and sync
  tasks.push(...newTasks);
  newTasks.forEach(t => markDirty(t.id));
  save();

  const importedFilename = _downloadsImportData?.filename || 'file';
  _downloadsImportData = null;
  document.getElementById('downloadsWizard')?.remove();
  toast(`Imported ${newTasks.length} tasks from ${importedFilename}`);
  renderAll();
}

/** Hierarchy-aware import path for NBI Backlog Builder CSVs.
 *  Posts the parsed rows direct to /api/tasks/bulk where the server
 *  resolves _temp_id -> real UUID parent links, looks up the client
 *  name, and persists item_type / dates / success_factor verbatim.
 *  This is the path that closes bug df1fb00b. */
async function executeHierarchyImport(importTasks, clientOverride, parentId, mode) {
  if (mode === 'replace') {
    const ok = await themedConfirm(`This will REPLACE all existing tasks with ${importTasks.length} imported rows. Continue?`);
    if (!ok) return;
    tasks.forEach(t => markDeleted(t.id));
    tasks = [];
    save();
  }

  // When user picked a parent project in the wizard, hang every orphan
  // (row with no _temp_parent_id) under it. We attach the real UUID via
  // a synthetic _temp_id so the server's two-pass linker resolves it.
  const ROOT_TEMP = '__wizard_root__';
  const parentTask = parentId ? tasks.find(t => t.id === parentId) : null;
  const useSyntheticRoot = !!parentTask;

  // The override client (if any) wins. Otherwise the client_id text from the
  // CSV (e.g. "Lighthouse Games") is sent verbatim and the server resolves it.
  const clientField = clientOverride || '';

  const payload = importTasks.map(t => {
    const out = {
      _temp_id: t._temp_id || '',
      _temp_parent_id: t._temp_parent_id || (useSyntheticRoot ? ROOT_TEMP : ''),
      item_type: t.item_type || 'task',
      title: t.title,
      description: t.description || '',
      status: t.status || 'Not started',
      priority: t.priority || '',
      hours_estimated: t.hoursEstimated || 0,
      assignees: t.assignees || [],
      practice_area: t.practice_area || '',
      start_date: t.start_date || '',
      end_date: t.end_date || '',
      due_date: t.due_date || '',
      success_factor: t.success_factor || '',
      collaborations: t.collaborations || '',
      source: 'import',
    };
    if (clientField) out.client = clientField;
    else if (t.client) out.client = t.client;
    return out;
  });

  // Bridge row that re-parents the imported tree under an existing project.
  if (useSyntheticRoot) {
    payload.unshift({
      _temp_id: ROOT_TEMP,
      title: parentTask.title,
      item_type: parentTask.item_type || 'project',
      // No client field on the bridge: the server already has a row with
      // this id and parent_id will be set against it after insert.
      _bridge: true,
    });
  }

  // /api/tasks/bulk caps at 500 rows per call. Chunk if needed.
  const CHUNK = 450;
  let totalCreated = 0;
  try {
    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.slice(i, i + CHUNK);
      const resp = await authFetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: slice }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Bulk import failed (${resp.status})`);
      }
      const data = await resp.json();
      totalCreated += (data.count || 0);
    }
  } catch (e) {
    toast('Hierarchy import failed: ' + e.message, 'error');
    return;
  }

  // Refresh in-memory state so the kanban + tree views reflect the new rows.
  if (typeof loadAllTasks === 'function') await loadAllTasks();

  const importedFilename = _downloadsImportData?.filename || 'file';
  _downloadsImportData = null;
  document.getElementById('downloadsWizard')?.remove();
  toast(`Imported ${totalCreated} hierarchy rows from ${importedFilename}`, 'success');
  renderAll();
}

// ----- CSV IMPORT -----
// ==================== CSV / EXCEL FILE IMPORT ====================

/** Open the file import modal (CSV/Excel drag-and-drop) */
function openImportModal() { document.getElementById('importModal').classList.add('open'); document.getElementById('importPreview').innerHTML = ''; document.getElementById('confirmImportBtn').style.display = 'none'; pendingCSVData = null; }
/** Close the file import modal and clear staging data */
function closeImportModal() { document.getElementById('importModal').classList.remove('open'); pendingCSVData = null; }

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

/** Handle a dropped/selected file -- routes to Excel or CSV parser based on extension */
function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = e => { parseExcelPreview(new Uint8Array(e.target.result), file.name).catch(err => toast('Failed to parse Excel: ' + err.message, 'error')); };
    reader.readAsArrayBuffer(file);
  } else if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => { parseCSVPreview(e.target.result); };
    reader.readAsText(file);
  } else {
    toast('Please select an Excel (.xlsx) or CSV file', 'error');
  }
}

/** Parse an Excel workbook (via ExcelJS) and render a column-mapping preview with sheet selector */
async function parseExcelPreview(data, filename) {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(data.buffer);
    const sheetNames = wb.worksheets.map(ws => ws.name);
    const sheetName = sheetNames.includes('Tasks') ? 'Tasks' : sheetNames[0];
    const ws = wb.getWorksheet(sheetName);
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = [];
      for (let c = 1; c <= row.cellCount; c++) {
        const cell = row.getCell(c);
        const v = cell.value;
        if (v instanceof Date) { vals.push(`${String(v.getDate()).padStart(2,'0')}/${String(v.getMonth()+1).padStart(2,'0')}/${v.getFullYear()}`); }
        else vals.push(v != null ? String(v) : null);
      }
      rows.push(vals);
    });
    if (rows.length < 2) { toast('Spreadsheet appears empty', 'error'); return; }

    const headers = rows[0].map(h => String(h || '').trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => c != null && String(c).trim() !== ''));

    const isPlannerExport = headers.includes('Task ID') && headers.includes('Bucket Name') && headers.includes('Progress');
    const lowerHeaders = headers.map(h => h.toLowerCase());
    const isHierarchy = lowerHeaders.includes('_temp_id')
      && lowerHeaders.includes('_temp_parent_id')
      && lowerHeaders.includes('item_type');

    let planName = '';
    if (sheetNames.includes('Plan name')) {
      const pnWs = wb.getWorksheet('Plan name');
      const pnRows = [];
      pnWs.eachRow({ includeEmpty: false }, (row) => {
        const vals = [];
        for (let c = 1; c <= row.cellCount; c++) { const v = row.getCell(c).value; vals.push(v != null ? String(v) : null); }
        pnRows.push(vals);
      });
      const nameRow = pnRows.find(r => r[0] === 'Plan name');
      if (nameRow) planName = nameRow[1] || '';
    }

    // Preview
    let html = `<div class="import-summary"><strong>${dataRows.length} tasks</strong> from ${esc(filename)}`;
    if (planName) html += ` <span style="color:var(--accent-text)">(${esc(planName)})</span>`;
    if (isPlannerExport) html += ` <span style="color:var(--success);font-size:0.8rem">&#10003; Microsoft Planner format detected</span>`;
    if (isHierarchy) html += ` <span style="color:var(--accent-text);font-size:0.8rem">&#10003; Hierarchy CSV detected — Project / Feature / Story / Task tree will be preserved</span>`;
    html += `</div>`;

    // Show column mapping
    const displayHeaders = isPlannerExport ? ['Task Name', 'Bucket', 'Progress', 'Priority', 'Assigned To', 'Due date'] : headers.slice(0, 8);
    const displayIndices = displayHeaders.map(h => headers.indexOf(h));

    html += '<table class="preview-table"><thead><tr>';
    displayHeaders.forEach(h => { html += `<th>${esc(h)}</th>`; });
    html += '</tr></thead><tbody>';
    dataRows.slice(0, 5).forEach(r => {
      html += '<tr>';
      displayIndices.forEach(i => { html += `<td>${esc(i >= 0 && r[i] != null ? String(r[i]) : '')}</td>`; });
      html += '</tr>';
    });
    if (dataRows.length > 5) html += `<tr><td colspan="${displayHeaders.length}" style="color:var(--text-muted);text-align:center">... and ${dataRows.length - 5} more rows</td></tr>`;
    html += '</tbody></table>';

    if (isPlannerExport) {
      // Show Planner-specific mapping summary
      const buckets = new Set();
      const people = new Set();
      const bucketIdx = headers.indexOf('Bucket Name');
      const assignIdx = headers.indexOf('Assigned To');
      dataRows.forEach(r => {
        if (bucketIdx >= 0 && r[bucketIdx]) buckets.add(String(r[bucketIdx]).trim());
        if (assignIdx >= 0 && r[assignIdx]) String(r[assignIdx]).split(';').forEach(p => people.add(p.trim()));
      });
      html += `<div style="margin-top:var(--space-md);font-size:0.8rem;color:var(--text-secondary)">`;
      html += `<strong>Buckets:</strong> ${[...buckets].map(b => esc(b)).join(', ')}<br>`;
      html += `<strong>People:</strong> ${[...people].filter(Boolean).map(p => esc(p)).join(', ')}`;
      html += `</div>`;
    }

    document.getElementById('importPreview').innerHTML = html;
    document.getElementById('confirmImportBtn').style.display = '';
    pendingCSVData = { headers, rows: dataRows, isPlannerExport, planName, isHierarchy };
  } catch (e) {
    toast('Failed to parse Excel file: ' + e.message, 'error');
  }
}

/** Parse CSV text into an array of row arrays, handling quoted fields with commas */
function parseCSV(text) {
  // Single-pass RFC 4180 parser that handles multiline quoted fields
  const rows = [];
  let row = [], cell = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i+1] === '"') { cell += '"'; i++; } // escaped quote
        else { inQuote = false; } // end of quoted field
      } else { cell += ch; } // content inside quotes (including newlines, commas)
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ''; }
      else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i+1] === '\n') i++; // skip \r\n
        row.push(cell.trim()); cell = '';
        if (row.some(c => c !== '')) rows.push(row); // skip fully empty rows
        row = [];
      } else { cell += ch; }
    }
  }
  // Final row
  row.push(cell.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

/** Parse CSV text and render a preview table with the first 5 rows */
function parseCSVPreview(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) { toast('CSV appears empty', 'error'); return; }
  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Hierarchy detection — same triple of headers the server's
  // detectImportFormat looks for. When present we route through the
  // hierarchy-aware confirmHierarchyImport path so the tree, dates,
  // assignees, success_factor and client name are preserved instead of
  // being collapsed by the legacy title-based resolver.
  const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  const isHierarchy = lowerHeaders.includes('_temp_id')
    && lowerHeaders.includes('_temp_parent_id')
    && lowerHeaders.includes('item_type');

  // Preview
  let html = `<div class="import-summary"><strong>${dataRows.length} tasks</strong> found in CSV with columns: ${headers.join(', ')}</div>`;
  if (isHierarchy) {
    html += `<div style="margin:6px 0;padding:6px 10px;background:var(--bg-input);border:1px solid var(--accent-text);border-radius:var(--radius-md);color:var(--accent-text);font-size:0.8rem">`;
    html += `Hierarchy CSV detected — will preserve Project / Feature / Story / Task tree, dates, assignees, success factors, and tag rows to the client named in the <code>client_id</code> column (resolved server-side).`;
    html += `</div>`;
  }
  html += '<table class="preview-table"><thead><tr>';
  headers.forEach(h => { html += `<th>${esc(h)}</th>`; });
  html += '</tr></thead><tbody>';
  dataRows.slice(0, 5).forEach(r => { html += '<tr>'; r.forEach(c => { html += `<td>${esc(c)}</td>`; }); html += '</tr>'; });
  if (dataRows.length > 5) html += `<tr><td colspan="${headers.length}" style="color:var(--text-muted);text-align:center">... and ${dataRows.length - 5} more rows</td></tr>`;
  html += '</tbody></table>';

  document.getElementById('importPreview').innerHTML = html;
  document.getElementById('confirmImportBtn').style.display = '';
  pendingCSVData = { headers, rows: dataRows, isHierarchy };
}

/** Confirm and execute a CSV/Excel import -- transforms rows into tasks with parent-child nesting.
 *  The Import button is disabled for the duration of this call so a double-click cannot fire two
 *  imports back-to-back (which previously caused the LH backlog to land twice — see HANDOFF.md). */
let _importInFlight = false;
async function confirmImport() {
  if (_importInFlight) return;
  if (!pendingCSVData) return;
  const { headers, rows, isPlannerExport, planName, isHierarchy } = pendingCSVData;

  const btn = document.getElementById('confirmImportBtn');
  const originalLabel = btn ? btn.textContent : 'Import';
  _importInFlight = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Importing...'; }
  try {
    if (isHierarchy) { await confirmHierarchyImport(headers, rows); return; }
    if (isPlannerExport) { confirmPlannerImport(headers, rows, planName); return; }
    return await _confirmLegacyImport(headers, rows);
  } finally {
    _importInFlight = false;
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}

async function _confirmLegacyImport(headers, rows) {

  // Column indices
  const col = (name) => { const i = headers.findIndex(h => h.toLowerCase().replace(/[^a-z]/g,'') === name.toLowerCase().replace(/[^a-z]/g,'')); return i; };
  const iTask = col('task'), iParent = col('parenttask'), iStatus = col('status'), iPriority = col('priority');
  const iDesc = col('description'), iAssignee = col('assignee'), iFiles = col('files'), iHealth = col('healthstate');
  const iDue = col('duedate');
  const iHoursEst = col('hoursestimated');
  const iHoursSpent = col('hoursspent');

  if (iTask < 0) { toast('CSV must have a "Task" column', 'error'); return; }

  // Build tasks
  const newTasks = [];
  const titleMap = {};
  let warnings = 0;

  rows.forEach(r => {
    const title = r[iTask];
    if (!title) { warnings++; return; }
    const id = uid();
    const parentTitle = iParent >= 0 ? r[iParent] : '';
    const status = iStatus >= 0 ? normaliseStatus(r[iStatus]) : 'Not started';
    const priority = iPriority >= 0 ? r[iPriority] : '';
    const desc = iDesc >= 0 ? r[iDesc] : '';
    const assignee = iAssignee >= 0 ? r[iAssignee] : '';
    const health = iHealth >= 0 ? normaliseHealth(r[iHealth]) : '';
    const assignees = assignee ? assignee.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];

    const dueDate = iDue >= 0 ? r[iDue] : '';
    const hoursEstimated = iHoursEst >= 0 ? parseFloat(r[iHoursEst]) || 0 : 0;
    const hoursSpent = iHoursSpent >= 0 ? parseFloat(r[iHoursSpent]) || 0 : 0;
    const task = { id, title, parentId: null, _parentTitle: parentTitle, client: '', status, priority, healthState: health, description: desc, assignees, hoursEstimated, hoursSpent, dueDate: dueDate || '', notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

    if (!titleMap[title]) titleMap[title] = id;
    newTasks.push(task);
  });

  // Resolve parents -- create missing parent tasks automatically
  newTasks.forEach(t => {
    if (t._parentTitle && t._parentTitle !== t.title) {
      let pid = titleMap[t._parentTitle];
      if (!pid) {
        // Parent referenced but doesn't exist -- create it as a top-level project
        const parentTask = { id: uid(), title: t._parentTitle, parentId: null, client: '', status: 'In progress', priority: '', healthState: '', description: '', assignees: [], hoursEstimated: 0, hoursSpent: 0, dueDate: '', notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        titleMap[t._parentTitle] = parentTask.id;
        newTasks.push(parentTask);
        pid = parentTask.id;
      }
      t.parentId = pid;
    }
    delete t._parentTitle;
  });

  // Detect circular refs
  newTasks.forEach(t => {
    const visited = new Set();
    let cur = t;
    while (cur && cur.parentId) {
      if (visited.has(cur.id)) { t.parentId = null; warnings++; break; }
      visited.add(cur.id);
      cur = newTasks.find(x => x.id === cur.parentId);
    }
  });

  // Auto-assign clients from root project names
  // Known client names and short forms for matching
  const clientAliases = {
    'Couch Heroes': ['couch heroes', 'couch'],
    'Lighthouse Studios': ['lighthouse'],
    'Sarge Universe': ['sarge'],
    'Goals Studio': ['goals'],
    'Playsage': ['playsage'],
    'NBI Operations': ['nbi operations', 'nbi internal', 'nbi']
  };
  newTasks.filter(t => !t.parentId).forEach(t => {
    const lower = t.title.toLowerCase();
    for (const [client, aliases] of Object.entries(clientAliases)) {
      if (aliases.some(a => lower.includes(a))) { t.client = client; break; }
    }
    // No silent default. If no alias matches, leave client unset and let
    // the user assign it explicitly. The previous "default to Couch
    // Heroes" caused the failed Lighthouse import that landed under
    // Couch (bug df1fb00b).
  });

  // Confirm before destructive replacement
  if (!(await themedConfirm(`This will REPLACE all ${tasks.length} existing tasks with ${newTasks.length} imported tasks. This cannot be undone.`, 'Replace All Tasks', 'Replace'))) return;

  // Mark all existing tasks as deleted, all new tasks as dirty
  tasks.forEach(t => markDeleted(t.id));
  tasks = newTasks;
  newTasks.forEach(t => markDirty(t.id));
  save();
  closeImportModal();
  renderAll();
  toast(`Imported ${newTasks.length} tasks` + (warnings > 0 ? ` (${warnings} warnings)` : ''));
}

/** Hierarchy CSV import — drag-drop path. Mirrors the Downloads-scanner
 *  hierarchy path: maps every column the Backlog Builder format uses,
 *  converts dd/mm/yyyy dates, and POSTs straight to /api/tasks/bulk so
 *  the server does _temp_id linking, client-name resolution and
 *  client_id inheritance in one transactional batch. No legacy
 *  title-based parent matching, no "default to Couch Heroes" fallback. */
async function confirmHierarchyImport(headers, rows) {
  const ci = name => headers.findIndex(h => String(h || '').toLowerCase().trim() === name);
  const get = (r, i) => i >= 0 && r[i] != null ? String(r[i]).trim() : '';
  const iTempId = ci('_temp_id'), iTempParent = ci('_temp_parent_id'), iItemType = ci('item_type');
  const iTask = ci('task') >= 0 ? ci('task') : ci('title');
  const iDesc = ci('description'), iStatus = ci('status'), iPriority = ci('priority');
  const iHours = ci('hours_estimated') >= 0 ? ci('hours_estimated') : ci('hours estimated');
  const iHoursSpent = ci('hours_spent') >= 0 ? ci('hours_spent') : ci('hours spent');
  const iAssignees = ci('assignees') >= 0 ? ci('assignees') : (ci('assignee') >= 0 ? ci('assignee') : ci('assigned to'));
  const iClient = ci('client_id') >= 0 ? ci('client_id') : ci('client');
  const iPractice = ci('practice_area');
  const iStart = ci('start_date') >= 0 ? ci('start_date') : ci('start date');
  const iEnd = ci('end_date') >= 0 ? ci('end_date') : ci('end date');
  const iDue = ci('due_date') >= 0 ? ci('due_date') : ci('due date');
  const iSuccess = ci('success_factor');
  const iCollab = ci('collaborations');
  const iNotes = ci('notes');
  const validItemTypes = new Set(['project', 'feature', 'story', 'task']);

  function parseDdMmYyyy(s) {
    if (!s) return '';
    const t = String(s).trim();
    if (!t) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return t;
    const dd = m[1].padStart(2, '0'), mm = m[2].padStart(2, '0');
    let yyyy = m[3]; if (yyyy.length === 2) yyyy = (parseInt(yyyy, 10) > 50 ? '19' : '20') + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  function normStatus(s) {
    if (!s) return 'Not started';
    const m = { 'not started': 'Not started', 'in progress': 'In progress', 'in-progress': 'In progress',
      planning: 'Planning', drafted: 'Drafted', done: 'Done', completed: 'Done', complete: 'Done',
      cancelled: 'Cancelled', canceled: 'Cancelled' };
    return m[s.toLowerCase().trim()] || 'Not started';
  }
  function normPriority(p) {
    if (!p) return '';
    const m = { p1: 'Urgent', critical: 'Urgent', urgent: 'Urgent',
      p2: 'High', high: 'High', important: 'High', p3: 'Medium', medium: 'Medium', p4: 'Low', low: 'Low' };
    return m[p.toLowerCase().trim()] || p;
  }

  const payload = [];
  for (const r of rows) {
    const title = get(r, iTask);
    if (!title) continue; // drop empty-title rows (e.g. CSV typos)
    const itRaw = get(r, iItemType).toLowerCase();
    const item_type = validItemTypes.has(itRaw) ? itRaw : 'task';
    payload.push({
      _temp_id: get(r, iTempId),
      _temp_parent_id: get(r, iTempParent),
      item_type,
      title,
      description: get(r, iDesc),
      status: normStatus(get(r, iStatus)),
      priority: normPriority(get(r, iPriority)),
      hours_estimated: parseFloat(get(r, iHours)) || 0,
      hours_spent: parseFloat(get(r, iHoursSpent)) || 0,
      assignees: get(r, iAssignees) ? get(r, iAssignees).split(/[,;\/]/).map(s => s.trim()).filter(Boolean) : [],
      client: get(r, iClient),
      practice_area: get(r, iPractice),
      start_date: parseDdMmYyyy(get(r, iStart)),
      end_date: parseDdMmYyyy(get(r, iEnd)),
      due_date: parseDdMmYyyy(get(r, iDue)),
      success_factor: get(r, iSuccess),
      collaborations: get(r, iCollab),
      notes: get(r, iNotes),
      source: 'import',
    });
  }

  if (payload.length === 0) { toast('No rows to import after filtering empty titles', 'error'); return; }

  const CHUNK = 450;
  let totalCreated = 0;
  try {
    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.slice(i, i + CHUNK);
      const resp = await authFetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: slice }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Bulk import failed (${resp.status})`);
      }
      const data = await resp.json();
      totalCreated += (data.count || 0);
    }
  } catch (e) {
    toast('Hierarchy import failed: ' + e.message, 'error');
    return;
  }

  // Replace local in-memory state from the server so the dashboard reflects
  // exactly what landed (and any pre-import local cruft is dropped).
  if (typeof loadAllTasks === 'function') await loadAllTasks();
  pendingCSVData = null;
  closeImportModal();
  toast(`Imported ${totalCreated} hierarchy rows`, 'success');
  renderAll();
}

/** Normalise a free-text status string to one of the canonical STATUSES values */
function normaliseStatus(s) {
  if (!s) return 'Not started';
  const lower = s.toLowerCase().trim();
  const map = { 'not started': 'Not started', 'in progress': 'In progress', planning: 'Planning', drafted: 'Drafted', done: 'Done', completed: 'Done', cancelled: 'Cancelled', canceled: 'Cancelled' };
  return map[lower] || 'Not started'; // Default to Not started if unrecognised
}

/** Normalise a free-text health string to one of the canonical HEALTH_STATES values */
function normaliseHealth(h) {
  if (!h) return '';
  const lower = h.toLowerCase().trim();
  const map = { green: 'Green', yellow: 'Yellow', red: 'Red', blocked: 'Blocked', 'waiting on client': 'Waiting on Client' };
  return map[lower] || h;
}

// ----- MICROSOFT PLANNER IMPORT -----
/**
 * Import tasks from a Microsoft Planner export.
 * Maps Planner columns (Bucket, Task Name, etc.) to dashboard task fields.
 * @param {string[]} headers - Column headers from the Planner export
 * @param {string[][]} rows - Data rows
 * @param {string} planName - Name of the Planner plan
 */
function confirmPlannerImport(headers, rows, planName) {
  // Column indices for Planner export format
  const ci = (name) => headers.indexOf(name);
  const iName = ci('Task Name');
  const iBucket = ci('Bucket Name');
  const iProgress = ci('Progress');
  const iPriority = ci('Priority');
  const iAssigned = ci('Assigned To');
  const iCreatedBy = ci('Created By');
  const iCreatedDate = ci('Created Date');
  const iStartDate = ci('Start date');
  const iDueDate = ci('Due date');
  const iLate = ci('Late');
  const iCompletedDate = ci('Completed Date');
  const iCompletedBy = ci('Completed By');
  const iChecklist = ci('Checklist Items');
  const iChecklistDone = ci('Completed Checklist Items');
  const iLabels = ci('Labels');
  const iDesc = ci('Description');
  const iTaskId = ci('Task ID');

  if (iName < 0) { toast('Planner export must have a "Task Name" column', 'error'); return; }

  /** Map Microsoft Planner progress values to dashboard status strings */
  function plannerStatus(progress) {
    if (!progress) return 'Not started';
    const lower = progress.toLowerCase().trim();
    const map = {
      'not started': 'Not started',
      'in progress': 'In progress',
      'completed': 'Done',
    };
    return map[lower] || 'Not started';
  }

  /** Map Microsoft Planner priority levels to dashboard priority strings */
  function plannerPriority(p) {
    if (!p) return '';
    const lower = p.toLowerCase().trim();
    const map = { 'urgent': 'Urgent', 'important': 'High', 'medium': 'Medium', 'low': 'Low' };
    return map[lower] || p;
  }

  /** Derive health state from Planner labels and late status */
  function plannerHealth(labels, isLate) {
    if (!labels) labels = '';
    const lower = labels.toLowerCase();
    if (lower.includes('blocked')) return 'Blocked';
    if (isLate === 'true') return 'Red';
    if (lower.includes('on hold')) return 'Yellow';
    if (lower.includes('review')) return 'Yellow';
    return '';
  }

  /** Parse estimated hours from a task name (pattern: *Xh or *X hrs) */
  function parseHoursFromTitle(title) {
    const match = title.match(/\*\s*(\d+)\s*h/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Parse checklist completion from Planner done/total columns (e.g. '3/5') */
  function parseChecklist(done, total) {
    if (!done || !total) return { done: 0, total: 0 };
    const doneMatch = String(done).match(/(\d+)/);
    const totalMatch = String(total).match(/(\d+)/);
    // Format is "3/5" in done column and individual items in total column
    const doneStr = String(done);
    const slashMatch = doneStr.match(/(\d+)\/(\d+)/);
    if (slashMatch) return { done: parseInt(slashMatch[1], 10), total: parseInt(slashMatch[2], 10) };
    return { done: doneMatch ? parseInt(doneMatch[1], 10) : 0, total: totalMatch ? parseInt(totalMatch[1], 10) : 0 };
  }

  /** Detect the client name from a task or plan name using known client aliases */
  function detectClient(taskName, pName) {
    const combined = (taskName + ' ' + pName).toLowerCase();
    const clientAliases = {
      'Couch Heroes': ['couch heroes', 'couch'],
      'Lighthouse Studios': ['lighthouse'],
      'Sarge Universe': ['sarge'],
      'Goals Studio': ['goals'],
      'Playsage': ['playsage'],
      'NBI Operations': ['nbi operations', 'nbi internal', 'nbi'],
      'Blizzard Entertainment': ['blizzard'],
    };
    for (const [client, aliases] of Object.entries(clientAliases)) {
      if (aliases.some(a => combined.includes(a))) return client;
    }
    return '';
  }

  // Build tasks grouped by bucket
  const newTasks = [];
  const bucketIds = {};
  const clientName = detectClient('', planName);
  let warnings = 0;

  // Create bucket parent tasks first
  const buckets = new Set();
  rows.forEach(r => {
    const bucket = iBucket >= 0 && r[iBucket] ? String(r[iBucket]).trim() : '';
    if (bucket) buckets.add(bucket);
  });

  // Determine bucket ordering (Planner uses: Actively Working, Planning, Backlog, Complete, Resources, Review)
  const bucketOrder = ['Actively Working', 'Planning', 'Backlog', 'Review', 'Resources', 'Complete'];
  const sortedBuckets = [...buckets].sort((a, b) => {
    const ai = bucketOrder.indexOf(a); const bi = bucketOrder.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  sortedBuckets.forEach(bucket => {
    const id = uid();
    bucketIds[bucket] = id;
    const bucketTasks = rows.filter(r => iBucket >= 0 && String(r[iBucket] || '').trim() === bucket);
    const doneCount = bucketTasks.filter(r => iProgress >= 0 && String(r[iProgress] || '').toLowerCase() === 'completed').length;
    const bucketStatus = doneCount === bucketTasks.length ? 'Done' : doneCount > 0 ? 'In progress' : 'Not started';
    newTasks.push({
      id, title: bucket, parentId: null, client: clientName || detectClient(bucket, planName),
      status: bucketStatus, priority: '', healthState: '',
      description: `${bucketTasks.length} tasks (${doneCount} completed)`,
      assignees: [], hoursEstimated: 0, hoursSpent: 0, dueDate: '',
      notes: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  });

  // Create task entries
  rows.forEach(r => {
    const name = iName >= 0 ? String(r[iName] || '').trim() : '';
    if (!name) { warnings++; return; }

    const bucket = iBucket >= 0 ? String(r[iBucket] || '').trim() : '';
    const progress = iProgress >= 0 ? String(r[iProgress] || '') : '';
    const priority = iPriority >= 0 ? String(r[iPriority] || '') : '';
    const assigned = iAssigned >= 0 ? String(r[iAssigned] || '') : '';
    const createdDate = iCreatedDate >= 0 ? String(r[iCreatedDate] || '') : '';
    const startDate = iStartDate >= 0 ? String(r[iStartDate] || '') : '';
    const dueDate = iDueDate >= 0 ? String(r[iDueDate] || '') : '';
    const isLate = iLate >= 0 ? String(r[iLate] || '') : '';
    const completedDate = iCompletedDate >= 0 ? String(r[iCompletedDate] || '') : '';
    const labels = iLabels >= 0 ? String(r[iLabels] || '') : '';
    const desc = iDesc >= 0 ? String(r[iDesc] || '').replace(/_x000d_/g, '') : '';
    const taskId = iTaskId >= 0 ? String(r[iTaskId] || '') : '';
    const checklistDone = iChecklistDone >= 0 ? String(r[iChecklistDone] || '') : '';
    const checklistItems = iChecklist >= 0 ? String(r[iChecklist] || '') : '';

    const assignees = assigned ? assigned.split(';').map(s => s.trim()).filter(Boolean) : [];
    const hoursEst = parseHoursFromTitle(name);
    const checklist = parseChecklist(checklistDone, checklistItems);

    // Build description with checklist and metadata
    let fullDesc = desc;
    if (checklist.total > 0) {
      fullDesc += (fullDesc ? '\n\n' : '') + `Checklist: ${checklist.done}/${checklist.total} complete`;
      if (checklistItems) fullDesc += '\n' + checklistItems.split(';').map(i => `  - ${i.trim()}`).join('\n');
    }
    if (labels) fullDesc += (fullDesc ? '\n\n' : '') + `Labels: ${labels}`;
    if (completedDate) fullDesc += (fullDesc ? '\n' : '') + `Completed: ${completedDate}`;

    const id = uid();
    newTasks.push({
      id, title: name, parentId: bucketIds[bucket] || null,
      client: clientName || detectClient(name, planName),
      status: plannerStatus(progress), priority: plannerPriority(priority),
      healthState: plannerHealth(labels, isLate),
      description: fullDesc.trim(), assignees, hoursEstimated: hoursEst, hoursSpent: 0,
      dueDate: dueDate || '', notes: [],
      createdAt: createdDate || new Date().toISOString(),
      updatedAt: completedDate || createdDate || new Date().toISOString(),
      plannerTaskId: taskId,
    });
  });

  // If no client was detected, try to add it to known clients from plan name
  if (clientName && !settings.knownClients.includes(clientName)) {
    settings.knownClients.push(clientName);
  }

  tasks = [...tasks, ...newTasks];
  save();
  closeImportModal();
  renderAll();
  toast(`Imported ${rows.length} tasks from Planner` + (planName ? ` (${planName})` : '') + (warnings > 0 ? ` - ${warnings} warnings` : ''));
}

// ==================== CSV EXPORT ====================

/** Generate a client-specific report as a CSV download with task details, hours, and costs */
async function generateClientReport(clientName) {
  const clientObj = Object.values(_apiClientsCache).find(c => c.name === clientName);
  if (clientObj) { generateServerClientReport(clientObj.id, clientName); return; }
  const ct = tasks.filter(t => getTaskClient(t) === clientName);
  if (ct.length === 0) { toast('No tasks for ' + clientName); return; }
  const roots = ct.filter(t => !t.parentId || getTaskClient(tasks.find(p => p.id === t.parentId)) !== clientName);
  const statusC = {};
  ct.forEach(t => { statusC[t.status] = (statusC[t.status]||0) + 1; });
  const totalHrs = ct.reduce((s,t) => s + (t.hoursSpent||0), 0);
  const totalEst = ct.reduce((s,t) => s + (t.hoursEstimated||0), 0);
  const done = statusC['Done'] || 0;
  const blocked = ct.filter(t => t.healthState === 'Blocked');
  const overdue = ct.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < new Date(new Date().setHours(0,0,0,0)));
  const inProg = ct.filter(t => t.status === 'In progress');
  const dueThisWeek = ct.filter(t => {
    if (!t.dueDate || t.status === 'Done') return false;
    const d = safeParseDate(t.dueDate); const now = new Date(); now.setHours(0,0,0,0);
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
    return d >= now && d <= weekEnd;
  });

  let report = `CLIENT STATUS REPORT: ${clientName}\n`;
  report += `Generated: ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}\n`;
  report += `${'='.repeat(50)}\n\n`;
  report += `SUMMARY\n`;
  report += `  Total tasks: ${ct.length} | Done: ${done} (${ct.length ? Math.round(done/ct.length*100) : 0}%)\n`;
  report += `  In progress: ${inProg.length} | Blocked: ${blocked.length} | Overdue: ${overdue.length}\n`;
  report += `  Hours: ${totalHrs.toFixed(1)}h spent / ${totalEst.toFixed(1)}h estimated\n`;
  report += `  Due this week: ${dueThisWeek.length}\n\n`;

  if (blocked.length > 0) {
    report += `BLOCKED ITEMS\n`;
    blocked.forEach(t => { report += `  - ${t.title}\n`; });
    report += '\n';
  }
  if (overdue.length > 0) {
    report += `OVERDUE\n`;
    overdue.forEach(t => { report += `  - ${t.title} (due ${t.dueDate})\n`; });
    report += '\n';
  }
  if (dueThisWeek.length > 0) {
    report += `DUE THIS WEEK\n`;
    dueThisWeek.forEach(t => { report += `  - ${t.title} (${t.dueDate})\n`; });
    report += '\n';
  }

  report += `ACTIVE WORK\n`;
  inProg.forEach(t => {
    const pct = t.hoursEstimated > 0 ? Math.round((t.hoursSpent||0)/t.hoursEstimated*100) : 0;
    report += `  - ${t.title} [${pct}% | ${(t.assignees||[]).join(', ')||'Unassigned'}]\n`;
  });

  // Copy to clipboard and open in a new window. The old implementation
  // used document.write with clientName interpolated directly into the
  // title tag, which let a client name containing a closing title tag
  // followed by an injected script break out of the title context and
  // run arbitrary JS with access to window.opener (audit finding F-C4).
  // Build the DOM via textContent and a pre element instead, and drop
  // window.opener so the popup cannot reach back into the parent origin.
  navigator.clipboard.writeText(report).then(() => toast('Report copied to clipboard'));
  const win = window.open('', '_blank', 'width=700,height=600');
  if (!win) { toast('Popup blocked — report copied to clipboard', 'warning'); return; }
  try { win.opener = null; } catch (_) { /* ignore — some browsers lock this */ }
  const doc = win.document;
  doc.title = 'Status Report: ' + clientName;
  const style = doc.createElement('style');
  style.textContent = 'body{font-family:monospace;background:#111;color:#ddd;padding:24px;white-space:pre-wrap;font-size:13px;line-height:1.6}';
  doc.head.appendChild(style);
  const pre = doc.createElement('pre');
  pre.textContent = report;
  doc.body.innerHTML = '';
  doc.body.appendChild(pre);
}

async function generateServerClientReport(clientId, clientName) {
  toast('Generating report...');
  try {
    const resp = await authFetch('/api/clients/' + clientId + '/status-report');
    if (!resp.ok) { toast('Failed to generate report', 'error'); return; }
    const r = await resp.json();
    const s = r.summary;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const section = (title, items, render) => {
      if (!items || items.length === 0) return '';
      return '<div style="margin-bottom:16px"><div style="font-weight:600;font-size:0.9rem;margin-bottom:6px;color:var(--text-primary)">' + esc(title) + ' (' + items.length + ')</div>' + items.map(render).join('') + '</div>';
    };
    const row = (icon, text, sub) => '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.82rem"><span>' + icon + '</span><span style="flex:1">' + esc(text) + '</span>' + (sub ? '<span style="color:var(--text-muted);font-size:0.75rem">' + esc(sub) + '</span>' : '') + '</div>';
    let html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">';
    html += '<div style="background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-xl);padding:24px;width:600px;max-width:90vw;max-height:85vh;overflow-y:auto">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div><h2 style="margin:0;font-size:1.2rem">' + esc(clientName) + '</h2><div style="color:var(--text-muted);font-size:0.78rem">Status Report — ' + dateStr + '</div></div><button class="btn btn--sm" onclick="this.closest(\'div[style*=fixed]\').remove()">Close</button></div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:16px">';
    html += '<div style="text-align:center;padding:10px;background:var(--bg-surface);border-radius:8px"><div style="font-size:1.4rem;font-weight:700">' + s.completed_count + '</div><div style="font-size:0.75rem;color:var(--text-muted)">Completed</div></div>';
    html += '<div style="text-align:center;padding:10px;background:var(--bg-surface);border-radius:8px"><div style="font-size:1.4rem;font-weight:700;color:var(--warning)">' + s.overdue_count + '</div><div style="font-size:0.75rem;color:var(--text-muted)">Overdue</div></div>';
    html += '<div style="text-align:center;padding:10px;background:var(--bg-surface);border-radius:8px"><div style="font-size:1.4rem;font-weight:700;color:var(--danger)">' + s.blocked_count + '</div><div style="font-size:0.75rem;color:var(--text-muted)">Blocked</div></div>';
    html += '<div style="text-align:center;padding:10px;background:var(--bg-surface);border-radius:8px"><div style="font-size:1.4rem;font-weight:700">' + s.in_progress_count + '</div><div style="font-size:0.75rem;color:var(--text-muted)">In Progress</div></div>';
    html += '<div style="text-align:center;padding:10px;background:var(--bg-surface);border-radius:8px"><div style="font-size:1.4rem;font-weight:700">' + s.open_positions + '</div><div style="font-size:0.75rem;color:var(--text-muted)">Open Roles</div></div>';
    html += '</div>';
    html += section('Completed Since ' + r.since, r.completed, i => row('✅', i.title, i.type));
    html += section('Overdue', r.overdue, i => row('⚠️', i.title, 'Due ' + (i.due_date || '?')));
    html += section('Blocked', r.blocked, i => row('🛑', i.title, i.health || i.status));
    html += section('In Progress', r.in_progress, i => row('🔄', i.title, (i.assignees || []).join(', ') || 'Unassigned'));
    if (r.positions && r.positions.length > 0) html += section('Open Positions', r.positions, i => row('💼', i.title, i.seniority || ''));
    if (r.bugs && r.bugs.length > 0) html += section('Open Bugs', r.bugs, i => row('🐛', i.title, i.priority || ''));
    if (r.pipeline && Object.keys(r.pipeline).length > 0) {
      html += '<div style="margin-bottom:16px"><div style="font-weight:600;font-size:0.9rem;margin-bottom:6px">Hiring Pipeline</div>';
      Object.entries(r.pipeline).forEach(([stage, count]) => { html += '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.82rem"><span>' + esc(stage) + '</span><strong>' + count + '</strong></div>'; });
      html += '</div>';
    }
    html += '<div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn--primary" onclick="generateClientReportPDF(\'' + esc(clientName) + '\');this.closest(\'div[style*=fixed]\').remove()">Share Report</button></div>';
    html += '</div></div>';
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstElementChild);
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

// ===== LOADING & SYNC STATUS =====
/** Display sync status indicator (saving/error/conflict) in the header bar */
function showSyncStatus(type, msg) {
  const el = document.getElementById('syncBadge');
  if (!el) return;
  el.className = 'sync-badge sync-badge--' + type;
  el.textContent = msg;
  if (type === 'saving') setTimeout(() => { if (el.classList.contains('sync-badge--saving')) el.style.display = 'none'; }, 2000);
}

// ===== TAB OVERFLOW CHECK ON RESIZE =====
window.addEventListener('resize', () => {
  checkTabOverflow();
});

// ===== OFFLINE INDICATOR =====
window.addEventListener('online', () => { document.getElementById('offlineBanner')?.classList.remove('visible'); syncToAPI(); });
window.addEventListener('offline', () => { document.getElementById('offlineBanner')?.classList.add('visible'); });

// ===== NOTIFICATION DEEP LINKS =====
window.addEventListener('hashchange', () => {
  const hash = window.location.hash;
  if (hash.startsWith('#interview/')) {
    const sessionId = hash.replace('#interview/', '');
    if (sessionId && /^[a-f0-9-]+$/i.test(sessionId)) {
      openInterviewScorecard(sessionId);
    }
    history.replaceState(null, '', window.location.pathname);
  }
});

// ===== CONFLICT RESOLUTION =====
let _conflictData = null;

/** Display the conflict resolution modal showing field-level diffs between local and server versions */
function showConflict(taskTitle, myChanges, serverVersion) {
  _conflictData = { myChanges, serverVersion };
  document.getElementById('conflictTitle').textContent = 'Conflict: ' + taskTitle;
  let html = '';
  for (const field of Object.keys(myChanges)) {
    if (field === 'id' || field === '_serverUpdatedAt' || field === 'updatedAt') continue;
    if (JSON.stringify(myChanges[field]) !== JSON.stringify(serverVersion[field])) {
      html += '<div class="conflict-field">' +
        '<div class="conflict-field__label">' + esc(field) + '</div>' +
        '<div class="conflict-field__mine">Yours: ' + esc(String(myChanges[field])) + '</div>' +
        '<div class="conflict-field__theirs">Server: ' + esc(String(serverVersion[field])) + '</div>' +
        '</div>';
    }
  }
  if (!html) html = '<p style="color:var(--text-muted)">Changes are identical</p>';
  document.getElementById('conflictFields').innerHTML = html;
  document.getElementById('conflictModal').classList.add('open');
}

/** Resolve a sync conflict — apply the chosen version ('mine' keeps local, 'theirs' accepts server) */
async function resolveConflict(choice) {
  const modal = document.getElementById('conflictModal');
  modal.classList.remove('open');
  _releaseFocusTrap(modal);
  // Finance conflict path (F-C7)
  if (window._financeConflictPending) {
    if (choice === 'mine') {
      _financeVersion = window._financeConflictServerVersion || _financeVersion;
      saveFinanceData(window._financeConflictPending);
      toast('Retrying save with your version', 'info');
    } else {
      await loadFinanceFromDB();
      toast('Server version loaded', 'success');
    }
    window._financeConflictPending = null;
    window._financeConflictServerVersion = null;
    return;
  }
  // Task conflict path
  if (choice === 'theirs' && _conflictData) {
    const sv = _conflictData.serverVersion;
    const task = tasks.find(t => t.id === sv.id);
    if (task) {
      Object.assign(task, sv);
      _dirtyTaskIds.delete(task.id);
      save();
      renderContent();
      toast('Server version applied', 'success');
    }
  } else {
    toast('Your changes kept - will sync on next save', 'warning');
  }
  _conflictData = null;
}

// ===== UNDO SYSTEM =====
let _undoStack = []; // max 10 operations
const UNDO_MAX = 10;

/**
 * Push an operation onto the undo stack (max 10 entries).
 * @param {string} desc - Human-readable description of the change
 * @param {Function} undoFn - Function that reverses the change
 */
function pushUndo(desc, undoFn) {
  _undoStack.push({ desc, fn: undoFn, ts: Date.now() });
  if (_undoStack.length > UNDO_MAX) _undoStack.shift();
}

/** Pop and execute the most recent undo operation from the stack */
function performUndo() {
  if (_undoStack.length === 0) { toast('Nothing to undo'); return; }
  const op = _undoStack.pop();
  // Verify the undo closure is still valid (task may have been deleted since)
  try {
    op.fn();
  } catch (e) {
    toast('Cannot undo: item no longer exists', 'warning');
    return;
  }
  save();
  renderSidebarCounts(); renderContent();
  toast('Undone: ' + op.desc);
}

// Keyboard shortcut: Ctrl+Z for undo
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.target.closest('input,textarea,select')) {
    e.preventDefault();
    performUndo();
  }
});

// ===== NEWS ADMIN =====
async function loadNewsAdmin() {
  var fhEl = document.getElementById('newsAdminFeedHealth');
  if (fhEl) {
    try {
      var fhData = await apiCall('/api/news/admin/feed-health/sources');
      var sources = fhData.sources || [];
      var fhHtml = '<table class="news-admin-table"><thead><tr><th>Source</th><th>Tier</th><th>Status</th><th>7d Attempts</th><th>7d Failures</th><th>New Items</th><th>Last Success</th><th>Enabled</th></tr></thead><tbody>';
      sources.forEach(function(s) {
        var rate = s.attempts_7d > 0 ? Math.round((s.failures_7d / s.attempts_7d) * 100) : 0;
        var badge = rate === 0 ? 'ok' : rate < 50 ? 'warn' : 'err';
        var lastSuccess = s.last_success_at ? new Date(s.last_success_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never';
        fhHtml += '<tr><td><strong>' + esc(s.name) + '</strong><br><span style="color:var(--text-muted);font-size:12px">' + esc(s.slug) + '</span></td>';
        fhHtml += '<td>' + esc(s.tier) + '</td>';
        fhHtml += '<td><span class="news-admin-badge news-admin-badge--' + badge + '">' + rate + '% fail</span></td>';
        fhHtml += '<td>' + (s.attempts_7d || 0) + '</td>';
        fhHtml += '<td>' + (s.failures_7d || 0) + '</td>';
        fhHtml += '<td>' + (s.new_items_7d || 0) + '</td>';
        fhHtml += '<td>' + lastSuccess + '</td>';
        fhHtml += '<td><span class="news-admin-toggle" data-action="newsAdminToggleSource" data-arg0="' + esc(s.id) + '" data-arg1="' + (s.enabled ? 'false' : 'true') + '">' + (s.enabled ? '\u2705' : '\u274c') + '</span></td>';
        fhHtml += '</tr>';
      });
      fhHtml += '</tbody></table>';
      fhEl.innerHTML = fhHtml;
    } catch (err) { fhEl.innerHTML = '<div style="color:var(--text-muted)">Failed to load feed health: ' + esc(err.message || '') + '</div>'; }
  }
  var prEl = document.getElementById('newsAdminPrompts');
  if (prEl) {
    try {
      var prData = await apiCall('/api/news/admin/prompts');
      var prompts = prData.prompts || [];
      var keys = {};
      prompts.forEach(function(p) { if (!keys[p.prompt_key]) keys[p.prompt_key] = []; keys[p.prompt_key].push(p); });
      var prHtml = '';
      Object.keys(keys).forEach(function(key) {
        var versions = keys[key];
        var active = versions.find(function(v) { return v.is_active; }) || versions[0];
        prHtml += '<div style="margin-bottom:16px;padding:12px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface)">';
        prHtml += '<div style="font-weight:600;margin-bottom:8px">' + esc(key) + ' <span style="color:var(--text-muted);font-size:12px">v' + active.version + ' (active)</span></div>';
        prHtml += '<textarea id="newsPrompt_' + esc(key) + '" style="width:100%;min-height:100px;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-family:monospace;font-size:12px;resize:vertical">' + esc(active.body || '') + '</textarea>';
        prHtml += '<button class="btn btn--sm" style="margin-top:6px" data-action="newsAdminSavePrompt" data-arg0="' + esc(key) + '">Save as new version</button>';
        if (versions.length > 1) {
          prHtml += '<details style="margin-top:8px"><summary style="cursor:pointer;font-size:12px;color:var(--text-muted)">Version history (' + versions.length + ')</summary>';
          versions.forEach(function(v) {
            prHtml += '<div style="padding:4px 0;font-size:12px;border-bottom:1px solid var(--border-default)">';
            prHtml += 'v' + v.version + (v.is_active ? ' (active)' : '') + ' by ' + esc(v.created_by || 'unknown') + ' ';
            if (!v.is_active) prHtml += '<button class="btn btn--sm" data-action="newsAdminActivatePrompt" data-arg0="' + esc(v.id) + '">Activate</button>';
            prHtml += '</div>';
          });
          prHtml += '</details>';
        }
        prHtml += '</div>';
      });
      if (!prHtml) prHtml = '<div style="color:var(--text-muted)">No prompts configured.</div>';
      prEl.innerHTML = prHtml;
    } catch (err) { prEl.innerHTML = '<div style="color:var(--text-muted)">Failed to load prompts: ' + esc(err.message || '') + '</div>'; }
  }
  var stEl = document.getElementById('newsAdminStories');
  if (stEl) {
    try {
      var dgData = await apiCall('/api/news/digests/current');
      var stories = dgData.stories || [];
      if (!stories.length) { stEl.innerHTML = '<div style="color:var(--text-muted)">No stories in current digest.</div>'; }
      else {
        var stHtml = '<div style="margin-bottom:8px;font-size:12px;color:var(--text-muted)">Select stories to merge, or click Regenerate on individual stories.</div>';
        stHtml += '<form id="newsStoryForm">';
        stories.forEach(function(s) {
          stHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-default)">';
          stHtml += '<input type="checkbox" name="storyId" value="' + esc(s.id) + '">';
          stHtml += '<div style="flex:1"><strong>' + esc(s.headline) + '</strong> <span style="color:var(--text-muted);font-size:12px">' + esc(s.category || '') + '</span></div>';
          stHtml += '<button type="button" class="btn btn--sm" data-action="newsAdminRegenerateStory" data-arg0="' + esc(s.id) + '">Regenerate</button>';
          stHtml += '</div>';
        });
        stHtml += '</form>';
        stHtml += '<div style="margin-top:8px;display:flex;gap:8px">';
        stHtml += '<button class="btn btn--sm btn--primary" data-action="newsAdminMergeStories">Merge selected</button>';
        stHtml += '</div>';
        stEl.innerHTML = stHtml;
      }
    } catch (err) { stEl.innerHTML = '<div style="color:var(--text-muted)">Failed to load stories: ' + esc(err.message || '') + '</div>'; }
  }
}

async function newsAdminMergeStories() {
  var form = document.getElementById('newsStoryForm');
  if (!form) return;
  var checked = Array.from(form.querySelectorAll('input[name="storyId"]:checked')).map(function(cb) { return cb.value; });
  if (checked.length < 2) { toast('Select at least 2 stories to merge', 'warning'); return; }
  if (!confirm('Merge ' + checked.length + ' stories? This will regenerate the summary via LLM.')) return;
  try {
    await apiCall('/api/news/admin/stories/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyIds: checked }) });
    toast('Stories merged and regenerated', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Merge failed', 'error'); }
}

async function newsAdminRegenerateStory(id) {
  if (!confirm('Regenerate this story summary via LLM?')) return;
  try {
    await apiCall('/api/news/admin/regenerate/stories/' + id, { method: 'POST' });
    toast('Story regenerated', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Regeneration failed', 'error'); }
}

async function newsAdminToggleSource(id, enabled) {
  try {
    await apiCall('/api/news/admin/feed-health/sources/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: enabled === 'true' }) });
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Failed to toggle source', 'error'); }
}

async function newsAdminSavePrompt(promptKey) {
  var ta = document.getElementById('newsPrompt_' + promptKey);
  if (!ta) return;
  try {
    await apiCall('/api/news/admin/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ promptKey: promptKey, body: ta.value }) });
    toast('Prompt saved as new version', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Failed to save prompt', 'error'); }
}

async function newsAdminActivatePrompt(id) {
  try {
    await apiCall('/api/news/admin/prompts/' + id + '/activate', { method: 'POST' });
    toast('Prompt version activated', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Failed to activate prompt', 'error'); }
}

async function newsAdminAddSource() {
  var slug = prompt('Source slug (e.g. ign):');
  if (!slug) return;
  var name = prompt('Display name:');
  if (!name) return;
  var feedUrl = prompt('RSS feed URL:');
  if (!feedUrl) return;
  var tier = prompt('Tier (t1/t2/t3):', 't2');
  try {
    await apiCall('/api/news/admin/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: slug, name: name, feedUrl: feedUrl, tier: tier || 't2' }) });
    toast('Source added', 'success');
    window._settingsTab = 'news'; renderContent();
  } catch (err) { toast(err.message || 'Failed to add source', 'error'); }
}

// ===== USER MANAGEMENT =====
/** Fetch user list from the API and render the user management table in settings */
async function loadUserManagement() {
  const el = document.getElementById('userManageList');
  if (!el) return;
  try {
    const users = await apiCall('/api/users');
    if (!users) return;
    const clientList = Object.values(_apiClientsCache);
    el.innerHTML = `<table class="report-table" style="font-size:0.8rem"><thead><tr><th>Username</th><th>Display Name</th><th>Email</th><th>Role</th><th>Hrs/wk</th><th>Client Scope</th><th>Docs / Queue</th><th></th></tr></thead><tbody>` +
      users.map(u => {
        const scopeOpts = `<option value="">None (internal)</option>` + clientList.map(c => `<option value="${esc(c.id)}" ${u.client_id===c.id?'selected':''}>${esc(c.name)}</option>`).join('');
        return `<tr>
        <td><strong>${esc(u.username)}</strong></td>
        <td><input value="${esc(u.display_name)}" onblur="updateUserField('${u.id}','display_name',this.value)" onkeydown="if(event.key==='Enter')this.blur()" style="background:transparent;border:1px solid transparent;border-radius:3px;padding:2px 4px;color:var(--text-primary);font-size:0.8rem;width:100%" onfocus="this.style.borderColor='var(--accent)';this.style.background='var(--bg-input)'" onblur="this.style.borderColor='transparent';this.style.background='transparent';updateUserField('${u.id}','display_name',this.value)"></td>
        <td><input value="${esc(u.email||'')}" onblur="updateUserField('${u.id}','email',this.value)" onkeydown="if(event.key==='Enter')this.blur()" style="background:transparent;border:1px solid transparent;border-radius:3px;padding:2px 4px;color:var(--text-primary);font-size:0.8rem;width:100%" onfocus="this.style.borderColor='var(--accent)';this.style.background='var(--bg-input)'" onblur="this.style.borderColor='transparent';this.style.background='transparent';updateUserField('${u.id}','email',this.value)"></td>
        <td><select onchange="updateUserRole('${u.id}',this.value,${u.client_id?'true':'false'})" style="font-size:0.75rem;padding:2px 4px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary)">${u.client_id
          ? `<option value="member" ${u.client_role!=='admin'?'selected':''}>User</option><option value="admin" ${u.client_role==='admin'?'selected':''}>Admin</option>`
          : `<option value="member" ${u.role!=='admin'?'selected':''}>User</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>`
        }</select></td>
        <td><input type="number" min="1" max="80" step="1" value="${u.capacity_hours_per_week || 40}" onchange="updateUserCapacity('${u.id}',this.value)" style="width:50px;padding:2px 4px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary);font-size:0.8rem;text-align:center"></td>
        <td><select onchange="updateUserClientScope('${u.id}',this.value)" style="font-size:0.75rem;padding:2px 4px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary)">${scopeOpts}</select></td>
        <td style="font-size:0.75rem;white-space:nowrap"><label title="View docs"><input type="checkbox" ${u.docs_view!==false?'checked':''} onchange="updateUserField('${u.id}','docs_view',this.checked)"> V</label> <label title="Edit docs"><input type="checkbox" ${u.docs_edit!==false?'checked':''} onchange="updateUserField('${u.id}','docs_edit',this.checked)"> E</label> <label title="Create docs"><input type="checkbox" ${u.docs_create!==false?'checked':''} onchange="updateUserField('${u.id}','docs_create',this.checked)"> C</label> <label title="Upload images"><input type="checkbox" ${u.docs_upload!==false?'checked':''} onchange="updateUserField('${u.id}','docs_upload',this.checked)"> U</label> <label title="Queue submit"><input type="checkbox" ${u.can_submit_queue?'checked':''} onchange="updateUserField('${u.id}','can_submit_queue',this.checked)" style="accent-color:var(--accent)"> Q</label></td>
        <td>${_currentUser && u.id !== _currentUser.id ? `<button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.75rem" data-action="deleteUser" data-arg0="${u.id}" data-arg1="${esc(u.display_name)}">&times; Remove</button>` : ''}</td>
      </tr>`;
      }).join('') +
      `</tbody></table>`;
  } catch(e) { console.warn('[UserManagement] render error:', e.message || e); }
}

/** Create a new user account via prompt dialogs (admin only) */
async function createUser() {
  const usernameEl = document.getElementById('newUserUsername');
  const passwordEl = document.getElementById('newUserPw');
  const container = usernameEl?.closest('.settings__group') || usernameEl?.parentElement;
  clearFieldErrors(container);
  const username = usernameEl?.value?.trim();
  const displayName = document.getElementById('newUserName')?.value?.trim();
  const email = document.getElementById('newUserEmail')?.value?.trim();
  const password = passwordEl?.value;
  const role = document.getElementById('newUserRole')?.value;
  const clientScope = document.getElementById('newUserClientScope')?.value || null;
  let valid = true;
  if (!username) { showFieldError(usernameEl, 'Username is required'); valid = false; }
  if (!password) { showFieldError(passwordEl, 'Password is required'); valid = false; }
  if (!valid) return;
  const newUserPayload = { username, display_name: displayName || username, email, password };
  if (clientScope) {
    newUserPayload.client_id = clientScope;
    newUserPayload.role = 'member';
    newUserPayload.client_role = role;
  } else {
    newUserPayload.role = role;
  }
  try {
    const resp = await authFetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserPayload)
    });
    if (resp.ok) {
      const created = await resp.json().catch(() => ({}));
      if (created.generated_password) {
        await themedConfirm('User created successfully.\n\nUsername: ' + username + '\nTemporary password: ' + created.generated_password + '\n\nPlease share these credentials securely.', 'Credentials', 'OK');
      } else {
        toast('User created: ' + (displayName || username));
      }
      ['newUserUsername','newUserName','newUserEmail','newUserPw'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      const scopeSel = document.getElementById('newUserClientScope'); if (scopeSel) scopeSel.value = '';
      loadUserManagement();
    } else {
      const err = await resp.json();
      toast(err.error || 'Failed to create user', 'error');
    }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Delete a user account after confirmation (admin only) */
async function deleteUser(userId, name) {
  if (!(await themedConfirm(`Remove user "${name}"? This will delete their account and all sessions.`))) return;
  try {
    const resp = await authFetch('/api/users/' + userId, { method: 'DELETE' });
    if (resp.ok) { toast('User removed: ' + name); loadUserManagement(); }
    else { toast('Failed to remove user', 'error'); }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Update a user's role (admin/member) via the API */
async function updateUserRole(userId, value, isClientUser) {
  try {
    const body = isClientUser
      ? { role: 'member', client_role: value }
      : { role: value };
    await authFetch('/api/users/' + userId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    toast('Role updated');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Update a user's client_id scope via the API (empty string clears the scope) */
async function updateUserClientScope(userId, clientId) {
  try {
    const body = { client_id: clientId || null };
    if (!clientId) {
      body.client_role = null;
    }
    await authFetch('/api/users/' + userId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    toast('Client scope updated');
    loadUserManagement();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Update a user field (display_name, email, docs_* booleans) via PATCH */
async function updateUserField(userId, field, value) {
  try {
    const resp = await authFetch('/api/users/' + userId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });
    if (resp.ok) {
      const labels = { display_name: 'Name', email: 'Email', docs_view: 'View docs', docs_edit: 'Edit docs', docs_create: 'Create docs', docs_upload: 'Upload docs', can_submit_queue: 'Queue submit' };
      toast((labels[field] || field) + ' updated');
    } else toast('Update failed', 'error');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function updateUserCapacity(userId, value) {
  const hrs = parseInt(value, 10);
  if (isNaN(hrs) || hrs < 1 || hrs > 80) { toast('Hours must be between 1 and 80', 'error'); return; }
  try {
    const resp = await authFetch('/api/users/' + userId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacity_hours_per_week: hrs })
    });
    if (resp.ok) {
      const cached = _cachedUsers.find(u => u.id === userId);
      if (cached) cached.capacity_hours_per_week = hrs;
      toast('Capacity updated to ' + hrs + 'h/wk');
    } else toast('Update failed', 'error');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

// ===== CLIENT TEAM MANAGEMENT =====

async function loadClientTeamList() {
  const container = document.getElementById('clientTeamList');
  if (!container) return;
  try {
    const res = await authFetch('/api/users');
    if (!res.ok) return;
    const users = await res.json();
    if (users.length === 0) { container.innerHTML = '<div style="color:var(--text-muted);font-size:0.82rem">No team members yet.</div>'; return; }
    container.innerHTML = users.map(u => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
        <span style="flex:1;font-size:0.85rem">${esc(u.display_name)}</span>
        <span style="font-size:0.75rem;color:var(--text-muted)">${esc(u.email || '')}</span>
        <span style="font-size:0.75rem;padding:2px 6px;border-radius:3px;background:${u.is_active ? 'var(--bg-surface)' : 'var(--status-overdue)'};color:${u.is_active ? 'var(--text-muted)' : '#fff'}">${u.is_active ? (u.client_role || 'member') : 'Inactive'}</span>
        ${u.id !== _currentUser.id ? `
          <button class="btn btn--sm" data-action="toggleClientUserActive" data-arg0="${u.id}" data-arg1="${u.is_active ? 'deactivate' : 'reactivate'}">${u.is_active ? 'Deactivate' : 'Reactivate'}</button>
          <button class="btn btn--sm" data-action="resetClientUserPassword" data-arg0="${u.id}">Reset PW</button>
        ` : ''}
      </div>`).join('');
  } catch (e) { container.innerHTML = '<div style="color:var(--status-overdue)">Failed to load team</div>'; }
}

async function inviteClientUser() {
  const display_name = document.getElementById('inviteDisplayName')?.value?.trim();
  const email = document.getElementById('inviteEmail')?.value?.trim();
  const client_role = document.getElementById('inviteRole')?.value;
  if (!display_name || !email) { toast('Name and email required', 'error'); return; }
  const username = email.split('@')[0].toLowerCase();
  try {
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name, email, client_role }),
    });
    if (res.ok) {
      const created = await res.json().catch(() => ({}));
      const tempPw = created.generated_password || created.temporaryPassword || created.password || null;
      if (tempPw) {
        await themedConfirm('User created successfully.\\n\\nUsername: ' + username + '\\nTemporary password: ' + tempPw + '\\n\\nPlease share these credentials securely.', 'Credentials', 'OK');
      } else {
        toast('User created. Invite email sent to ' + email);
      }
      const dnEl = document.getElementById('inviteDisplayName'); if (dnEl) dnEl.value = '';
      const emEl = document.getElementById('inviteEmail'); if (emEl) emEl.value = '';
      loadClientTeamList();
    } else {
      const data = await res.json();
      toast(data.error || 'Failed to create user', 'error');
    }
  } catch (e) { toast('Network error', 'error'); }
}

async function toggleClientUserActive(userId, action) {
  if (action === 'deactivate' && !(await themedConfirm('Deactivate this user? They will be logged out immediately.'))) return;
  try {
    const res = await authFetch('/api/users/' + userId + '/' + action, { method: 'POST' });
    if (res.ok) { toast(action === 'reactivate' ? 'User reactivated' : 'User deactivated'); loadClientTeamList(); }
    else { const d = await res.json(); toast(d.error || 'Failed', 'error'); }
  } catch (e) { toast('Network error', 'error'); }
}

async function resetClientUserPassword(userId) {
  if (!(await themedConfirm("Reset this user's password? They will receive a new temporary password by email."))) return;
  try {
    const res = await authFetch('/api/users/' + userId + '/reset-password', { method: 'POST' });
    if (res.ok) { toast('Password reset. New temporary password sent by email.'); }
    else { const d = await res.json(); toast(d.error || 'Failed', 'error'); }
  } catch (e) { toast('Network error', 'error'); }
}

// ===== TIME TRACKING =====

async function logTimeEntryInline(taskId) {
  const hoursInput = document.getElementById('inlineLogHours');
  const descInput = document.getElementById('inlineLogDesc');
  const hours = parseFloat(hoursInput?.value);
  if (!hours || hours <= 0) { toast('Enter hours > 0'); return; }
  try {
    await authFetch('/api/tasks/' + taskId + '/time-entries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours, description: descInput?.value || '' })
    });
    const task = tasks.find(t => t.id === taskId);
    if (task) { task.hoursSpent = (task.hoursSpent || 0) + hours; }
    toast(hours + 'h logged');
    if (hoursInput) hoursInput.value = '';
    if (descInput) descInput.value = '';
    loadTimeEntriesInline(taskId);
    renderContent();
  } catch(e) { toast('Failed to log time', 'error'); }
}

async function loadTimeEntriesInline(taskId) {
  const el = document.getElementById('inlineTimeEntriesList');
  if (!el) return;
  try {
    const entries = await apiCall('/api/tasks/' + taskId + '/time-entries');
    if (!entries) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.75rem">Could not load</div>'; return; }
    if (entries.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.75rem">No time logged yet</div>'; return; }
    el.innerHTML = entries.map(e => `<div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;padding:3px 0;border-bottom:1px solid var(--border-subtle)"><span style="font-weight:600;font-family:var(--font-mono);color:var(--accent);min-width:40px">${(parseFloat(e.hours) || 0).toFixed(2)}h</span><span style="flex:1;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.description || '-')}</span><span style="color:var(--text-muted);font-size:0.75rem">${esc(e.user_name)} &middot; ${e.date}</span></div>`).join('');
  } catch(e) { console.warn('[TimeEntries] inline error:', e.message || e); }
}

/** Manually log a time entry from the detail panel's quick-log fields */
async function logTimeEntry(taskId) {
  const hoursInput = document.getElementById('logHours');
  const descInput = document.getElementById('logDesc');
  const hours = parseFloat(hoursInput?.value);
  if (!hours || hours <= 0) { toast('Enter hours > 0'); return; }
  try {
    await authFetch('/api/tasks/' + taskId + '/time-entries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours, description: descInput?.value || '' })
    });
    const task = tasks.find(t => t.id === taskId);
    if (task) { task.hoursSpent = (task.hoursSpent || 0) + hours; }
    toast(hours + 'h logged');
    if (hoursInput) hoursInput.value = '';
    if (descInput) descInput.value = '';
    loadTimeEntries(taskId);
  } catch(e) { toast('Failed to log time', 'error'); }
}

/** Fetch and render time entries for a task in the detail panel */
async function loadTimeEntries(taskId) {
  const el = document.getElementById('timeEntriesList');
  if (!el) return;
  try {
    const entries = await apiCall('/api/tasks/' + taskId + '/time-entries');
    if (!entries) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.75rem">Could not load</div>'; return; }
    if (entries.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.75rem">No time logged yet</div>'; return; }
    el.innerHTML = entries.map(e => `<div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;padding:3px 0;border-bottom:1px solid var(--border-subtle)"><span style="font-weight:600;font-family:var(--font-mono);color:var(--accent);min-width:40px">${(parseFloat(e.hours) || 0).toFixed(2)}h</span><span style="flex:1;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.description || '-')}</span><span style="color:var(--text-muted);font-size:0.75rem">${esc(e.user_name)} &middot; ${e.date}</span></div>`).join('');
  } catch(e) { console.warn('[TimeEntries] API error:', e.message || e); }
}

// ===== NOTIFICATIONS =====
let _notifOpen = false;

/** Legacy stub — notification bell is removed; alerts live in the sidebar panel now. */
function toggleNotifications() { toggleWarnAlertSidebar(); }

/** Handle notification click — route to the right view based on the link content.
 *  Supports: expense-report deep links (#expenses/report/{uuid}), hash-based view routes
 *  (#bugs, #settings, #mytasks, etc.), and bare task IDs. */
function handleNotificationClick(link, notifId) {
  if (notifId) {
    authFetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [notifId] }) })
      .then(() => { window._lastNotificationCount = Math.max(0, (window._lastNotificationCount || 1) - 1); if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton(); })
      .catch(() => {});
  }
  if (!link) return;
  // Close the warn-alert sidebar
  const panel = document.getElementById('warnAlertPanel');
  if (panel && panel.classList.contains('open')) panel.classList.remove('open');
  // Expense report link: URL containing #expenses/report/{uuid}
  const reportMatch = link.match(/[#/]expenses\/report\/([a-f0-9-]+)/i);
  if (reportMatch) {
    switchView('expenses');
    let attempts = 0;
    const tryOpen = () => {
      if (document.querySelector('.expenses-reports-grid') || attempts > 15) {
        openReportDetail(reportMatch[1]);
      } else { attempts++; setTimeout(tryOpen, 200); }
    };
    tryOpen();
    return;
  }
  // Hash-route link, e.g. "/nbi_project_dashboard.html#bugs" or "#settings"
  const hashIdx = link.indexOf('#');
  if (hashIdx !== -1) {
    const hashPart = link.slice(hashIdx + 1);
    const knownViews = ['report','dashboard','tasks','people','leads','expenses','finances','bugs','settings','mytasks','changelog','hiring','data','timeTracking'];
    const firstSeg = hashPart.split('/')[0];
    if (firstSeg && knownViews.includes(LEGACY_ROUTES[firstSeg] || firstSeg)) {
      switchView(firstSeg);
      return;
    }
  }
  // Default: treat as task ID
  openDetailOverlay(link);
}

/** Fetch notifications from the API and update the sidebar alert count */
async function loadNotifications() {
  try {
    const result = await apiCall('/api/notifications');
    if (!result) return;
    const { unread } = result;
    window._lastNotificationCount = unread || 0;
    if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
  } catch(e) { console.warn('[Notifications] fetch error:', e.message || e); }
}

// Check lead follow-up reminders
let _leadReminderCount = 0;
/** Check for overdue lead follow-ups and show a notification badge */
async function checkLeadReminders() {
  try {
    const reminders = await apiCall('/api/leads/reminders');
    if (!reminders) return;
    _leadReminderCount = reminders.length;
    // Update sidebar badge if on a page that shows it
    const leadsNav = document.getElementById('si_Leads');
    if (leadsNav) {
      let countEl = leadsNav.querySelector('.sidebar__item__count');
      if (_leadReminderCount > 0) {
        if (countEl) { countEl.textContent = _leadReminderCount; countEl.style.color = 'var(--danger)'; }
      } else {
        if (countEl) { countEl.textContent = ''; countEl.style.color = ''; }
      }
    }
  } catch(e) { console.warn('[LeadReminders] API error:', e.message || e); }
}
// Run reminders check every 60 seconds
let _leadsReminderInterval = setInterval(() => { if (_currentUser && !_pollingPaused) checkLeadReminders(); }, 60000);

/** Mark all notifications as read via the API and refresh the sidebar alert count */
async function markAllNotificationsRead() {
  try {
    await authFetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    window._lastNotificationCount = 0;
    if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
    renderWarnAlertContent();
  } catch(e) { console.warn('[Notifications] mark-read error:', e.message || e); }
}

async function clearAllNotifications() {
  try {
    await authFetch('/api/notifications/clear-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    window._lastNotificationCount = 0;
    if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
    toast('All notifications cleared');
    renderWarnAlertContent();
  } catch(e) { console.warn('[Notifications] clear-all error:', e.message || e); }
}

async function clearAllWarnings() {
  const warnings = computeWarnings();
  const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  warnings.forEach(w => { _warnAlertSnoozedUntil[w.id] = farFuture; });
  try { localStorage.setItem('nbi_warn_snoozed', JSON.stringify(_warnAlertSnoozedUntil)); } catch (e) {}
  try { await authFetch('/api/attachments/verify-matches', { method: 'DELETE' }); } catch (e) {}
  toast('All warnings cleared');
  renderWarnAlertContent();
  updateWarnAlertButton();
}

/** Convert a date to a human-readable relative time string (e.g. "3h ago", "2d ago") */
function timeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

// Poll notifications every 30 seconds
let _notifPollInterval = setInterval(() => { if (_currentUser && !_pollingPaused) loadNotifications(); }, 30000);

/** Restart all polling intervals after re-login (they are cleared on logout).
 *  Reuses _syncPollTick (nbi-init.js) — this function previously installed its
 *  own divergent poll body that expected data.deleted/data.created (fields the
 *  server never returns) and ignored currentIds, so remote DELETIONS silently
 *  stopped propagating after any poll restart until a full page reload. */
function restartPollingIntervals() {
  clearInterval(_syncPollInterval);
  clearInterval(_leadsReminderInterval);
  clearInterval(_notifPollInterval);
  _syncPollInFlight = false;
  _syncPollInterval = setInterval(_syncPollTick, SYNC_POLL_MS);
  _leadsReminderInterval = setInterval(() => { if (_currentUser && !_pollingPaused) checkLeadReminders(); }, 60000);
  _notifPollInterval = setInterval(() => { if (_currentUser && !_pollingPaused) loadNotifications(); }, 30000);
}
// Close panel when clicking outside (legacy — notification bell removed, kept as no-op guard)
document.addEventListener('click', e => { if (_notifOpen && !e.target.closest('#warnAlertPanel')) { _notifOpen = false; } });

// ===== TASK TEMPLATES =====
/** Fetch task templates from the API and render them in the settings view */
async function loadTemplates() {
  const el = document.getElementById('templatesList');
  if (!el) return;
  try {
    const templates = await apiCall('/api/templates');
    if (!templates) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">Could not load templates</div>'; return; }
    if (templates.length === 0) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">No templates saved yet</div>'; return; }
    el.innerHTML = templates.map(t => {
      const lastUsed = t.last_created_at ? new Date(t.last_created_at).toLocaleDateString('en-GB') : 'Never';
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle)"><span style="flex:1;font-size:0.82rem;font-weight:500">${esc(t.name)}</span><span style="font-size:0.75rem;color:var(--text-muted)">Last used: ${lastUsed}</span><button class="btn btn--sm" data-action="instantiateTemplate" data-arg0="${t.id}" data-arg1="${esc(t.name)}">Create</button><button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.8rem" data-action="deleteTemplate" data-arg0="${t.id}">&times;</button></div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem">Templates unavailable</div>'; }
}

/** Save a project (root task + descendants) as a reusable template */
async function saveAsTemplate() {
  const sel = document.getElementById('templateSourceTask');
  if (!sel || !sel.value) { toast('Select a root task first'); return; }
  const rootTask = tasks.find(t => t.id === sel.value);
  if (!rootTask) return;
  const name = await themedPrompt('Enter a name for this template:', rootTask.title + ' Template', 'Save Template');
  if (!name) return;

  /** Recursively build a template tree from a task and its descendants */
  function buildTree(task) {
    const children = getChildren(task.id);
    return {
      title: task.title, status: 'Not started', priority: task.priority || '', description: task.description || '',
      assignees: task.assignees || [], hoursEstimated: task.hoursEstimated || 0,
      children: children.map(c => buildTree(c))
    };
  }
  const template = buildTree(rootTask);
  try {
    const resp = await authFetch('/api/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, template })
    });
    if (resp.ok) { toast('Template saved: ' + name); loadTemplates(); }
    else { toast('Failed to save template', 'error'); }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Create a new project from a saved template -- generates new IDs and resets status */
async function instantiateTemplate(id, name) {
  if (!(await themedConfirm('Create new tasks from template "' + name + '"?'))) return;
  try {
    const resp = await authFetch('/api/templates/' + id + '/create', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (resp.ok) {
      const result = await resp.json();
      toast(result.created.length + ' tasks created from template');
      // Reload tasks from DB
      await load(); renderAll();
    } else { toast('Failed to create from template', 'error'); }
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

/** Delete a task template after confirmation */
async function deleteTemplate(id) {
  if (!(await themedConfirm('Delete this template?'))) return;
  await authFetch('/api/templates/' + id, { method: 'DELETE' });
  toast('Template deleted');
  loadTemplates();
}

