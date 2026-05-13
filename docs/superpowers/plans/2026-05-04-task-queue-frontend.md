# Task Queue Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a Queue view into `nbi_project_dashboard.html` so internal staff can see, promote, and dismiss items submitted to `/api/queue`.

**Architecture:** All changes are in the single monolithic file `nbi_project_dashboard.html` (~22,280 lines). No new files are created. Changes are grouped by concern: CSS, global state, sidebar, routing, view render functions, init load, hash routing guard, tasks-empty guard, and settings permissions toggle. Changes 1 (CSS) and 2 (`_queueData` variable) are already applied and confirmed.

**Tech Stack:** Vanilla JS, inline CSS, Express `/api/queue` backend already deployed.

---

## Pre-flight: what is already done

- **Change 1 (CSS):** `.queue-item` and child class rules are at line 1111–1115.
- **Change 2 (global state):** `let _queueData = null;` is at line 16619.

The remaining 7 changes are tasks 3–9 below.

---

### Task 3: Add Queue sidebar entry

**Files:**
- Modify: `nbi_project_dashboard.html` — `renderSidebar()` function, after line 4164

**Context:** The sidebar block for Bug Tracker ends at line 4164:
```
    html += sidebarItem(svgBugs, 'Bug Tracker', bugOpenCount || '', () => switchView('bugs'), currentView==='bugs');
  }
  html += sidebarItem(svgSettings, 'Settings', '', ...);
```

- [ ] **Step 1: Insert the Queue sidebar block** immediately after the closing `}` of the Bug Tracker block (before the Settings line)

Find this exact string:
```javascript
    html += sidebarItem(svgBugs, 'Bug Tracker', bugOpenCount || '', () => switchView('bugs'), currentView==='bugs');
  }
  html += sidebarItem(svgSettings, 'Settings', '', () => switchView('settings'), currentView==='settings');
```

Replace with:
```javascript
    html += sidebarItem(svgBugs, 'Bug Tracker', bugOpenCount || '', () => switchView('bugs'), currentView==='bugs');
  }
  if (!isScoped) {
    const queueCount = (_queueData || []).length;
    const svgQueue = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M2 8h12M2 12h12"/><circle cx="14" cy="4" r="1.5" fill="currentColor" stroke="none"/></svg>';
    html += sidebarItem(svgQueue, 'Queue', queueCount || '', () => switchView('queue'), currentView==='queue');
  }
  html += sidebarItem(svgSettings, 'Settings', '', () => switchView('settings'), currentView==='settings');
```

- [ ] **Step 2: Verify the edit landed correctly**

Run: `grep -n "switchView('queue')" nbi_project_dashboard.html`
Expected: one match in the sidebar block, no others yet.

---

### Task 4: Add queue view to the render dispatcher

**Files:**
- Modify: `nbi_project_dashboard.html` — `_renderMainContent()`, around line 4606

**Context:** The dispatcher currently reads:
```javascript
  else if (currentView === 'bugs') renderBugTrackerView(content);
  else if (currentView === 'hiring') renderHiringView(content);
```

- [ ] **Step 1: Insert the queue dispatch line** after the bugs line

Find:
```javascript
  else if (currentView === 'bugs') renderBugTrackerView(content);
  else if (currentView === 'hiring') renderHiringView(content);
```

Replace with:
```javascript
  else if (currentView === 'bugs') renderBugTrackerView(content);
  else if (currentView === 'queue') renderQueueView(content);
  else if (currentView === 'hiring') renderHiringView(content);
```

- [ ] **Step 2: Verify**

Run: `grep -n "renderQueueView" nbi_project_dashboard.html`
Expected: exactly one match (the dispatcher line — the function definition comes in Task 5).

---

### Task 5: Add queue view render functions

**Files:**
- Modify: `nbi_project_dashboard.html` — after the `closeSpPreview` keydown listener (~line 18756)

**Context:** The Escape keydown listener ends at line 18756:
```javascript
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('spPreviewModal')) closeSpPreview();
});
```
The next section is `// ----- UNIVERSAL FILE ATTACHMENTS -----`.

- [ ] **Step 1: Insert the four functions** immediately after the `closeSpPreview` keydown block

Find:
```javascript
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('spPreviewModal')) closeSpPreview();
});

// ----- UNIVERSAL FILE ATTACHMENTS -----
```

Replace with:
```javascript
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('spPreviewModal')) closeSpPreview();
});

// ----- TASK QUEUE VIEW -----

async function renderQueueView(el) {
  el.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-card"></div></div>';
  try {
    const data = await apiCall('/api/queue');
    _queueData = data || [];
  } catch(e) { _queueData = []; }
  renderSidebar();

  if (_queueData.length === 0) {
    el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-secondary)">
      <div style="font-size:2rem;margin-bottom:12px">&#128229;</div>
      <div style="font-size:0.9rem;font-weight:600;margin-bottom:8px">Queue is empty</div>
      <div style="font-size:0.8rem;color:var(--text-muted)">Items submitted by team members will appear here for triage.</div>
    </div>`;
    return;
  }

  let html = '<div style="padding:24px;max-width:700px">';
  html += '<h2 style="margin:0 0 16px;font-size:1.1rem;color:var(--text-primary)">Submission Queue</h2>';
  html += '<div style="display:flex;flex-direction:column;gap:12px">';
  _queueData.forEach(item => {
    const ago = _relativeTime(item.created_at);
    const channelLabel = item.slack_channel ? `<span style="background:var(--bg-elevated);padding:1px 6px;border-radius:4px;font-size:0.62rem">#${esc(item.slack_channel)}</span>` : '';
    html += `<div class="queue-item">
      <div class="queue-item__title">${esc(item.title)}</div>
      ${item.description ? `<div class="queue-item__desc">${esc(item.description)}</div>` : ''}
      <div class="queue-item__meta">
        <span>${esc(item.submitted_by)}</span>
        <span>${ago}</span>
        ${channelLabel}
      </div>
      <div class="queue-item__actions">
        <button class="btn btn--primary btn--sm" data-action="_actPromoteQueueItem" data-arg0="${item.id}" data-arg1="${escAttrJs(item.title)}" data-arg2="${escAttrJs(item.description || '')}">Promote</button>
        <button class="btn btn--danger btn--sm" data-action="_actDismissQueueItem" data-arg0="${item.id}" data-arg1="${escAttrJs(item.title)}">Dismiss</button>
      </div>
    </div>`;
  });
  html += '</div></div>';
  el.innerHTML = html;
}

function _relativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

async function _actPromoteQueueItem(queueId, title, description) {
  const client = await _pickClient('Select client for: ' + title);
  if (!client) return;

  const types = ['project', 'feature', 'story', 'task'];
  const typeLabels = { project: 'Project', feature: 'Feature', story: 'Story', task: 'Task' };

  _confirmResolve = null;
  document.getElementById('confirmTitle').textContent = 'Select item type';
  document.getElementById('confirmOkBtn').textContent = 'Create';
  const input = document.getElementById('confirmInput');
  input.style.display = 'none';
  const msgEl = document.getElementById('confirmMessage');
  msgEl.innerHTML = '<select id="_promoteTypeSelect" style="width:100%;padding:8px;margin-top:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem">' + types.map(t => '<option value="' + t + '">' + typeLabels[t] + '</option>').join('') + '</select>';
  const modal = document.getElementById('confirmModal');
  const chosenType = await new Promise(resolve => {
    _confirmResolve = (ok) => {
      const sel = document.getElementById('_promoteTypeSelect');
      resolve(ok && sel ? sel.value : null);
      msgEl.textContent = '';
    };
    modal.classList.add('open');
    _trapFocus(modal);
  });
  if (!chosenType) return;

  const t = createTaskObject({ title: title, itemType: chosenType, client, description: description || '' });
  tasks.push(t);
  markDirty(t.id);
  save();

  await authFetch('/api/queue/' + queueId, { method: 'DELETE' });
  _queueData = (_queueData || []).filter(q => q.id !== queueId);
  renderSidebarCounts();
  renderContent();
  openDetail(t.id);
  toast('Item promoted to ' + chosenType);
}

async function _actDismissQueueItem(queueId, title) {
  if (!await themedConfirm('Dismiss "' + title + '" from the queue? This cannot be undone.', 'Dismiss')) return;
  await authFetch('/api/queue/' + queueId, { method: 'DELETE' });
  _queueData = (_queueData || []).filter(q => q.id !== queueId);
  renderSidebarCounts();
  renderContent();
  toast('Item dismissed');
}

// ----- UNIVERSAL FILE ATTACHMENTS -----
```

- [ ] **Step 2: Verify**

Run: `grep -n "function renderQueueView\|function _relativeTime\|function _actPromoteQueueItem\|function _actDismissQueueItem" nbi_project_dashboard.html`
Expected: four matches, all in the newly inserted block.

---

### Task 6: Load queue data on init

**Files:**
- Modify: `nbi_project_dashboard.html` — Promise.all in init sequence (~line 21337)

**Context:** The Promise.all line currently reads:
```javascript
      await Promise.all([load(), loadTeamMembers(), loadPagePermissions(), loadBugReports(), loadAllTeams(), loadAllSows(), apiCall('/api/clients').then(data => { if (data) data.forEach(c => { _apiClientsCache[c.name] = c; }); }).catch(() => {})]);
```

- [ ] **Step 1: Append the queue load to the Promise.all array**

Find:
```javascript
      await Promise.all([load(), loadTeamMembers(), loadPagePermissions(), loadBugReports(), loadAllTeams(), loadAllSows(), apiCall('/api/clients').then(data => { if (data) data.forEach(c => { _apiClientsCache[c.name] = c; }); }).catch(() => {})]);
```

Replace with:
```javascript
      await Promise.all([load(), loadTeamMembers(), loadPagePermissions(), loadBugReports(), loadAllTeams(), loadAllSows(), apiCall('/api/clients').then(data => { if (data) data.forEach(c => { _apiClientsCache[c.name] = c; }); }).catch(() => {}), apiCall('/api/queue').then(data => { if (data) _queueData = data; }).catch(() => {})]);
```

- [ ] **Step 2: Verify**

Run: `grep -n "api/queue" nbi_project_dashboard.html`
Expected: at least two matches — one in `renderQueueView` and one in the Promise.all init line.

---

### Task 7: Add 'queue' to the known hash views list

**Files:**
- Modify: `nbi_project_dashboard.html` — hash restore IIFE (~line 4513)

**Context:**
```javascript
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks'];
```

- [ ] **Step 1: Add 'queue' to the array**

Find:
```javascript
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks'];
```

Replace with:
```javascript
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks','queue'];
```

- [ ] **Step 2: Verify**

Run: `grep -n "'queue'" nbi_project_dashboard.html | grep known`
Expected: one match on the known array line.

---

### Task 8: Add 'queue' to the tasks-empty guard exclusion

**Files:**
- Modify: `nbi_project_dashboard.html` — `_renderMainContent()` guard (~line 4592)

**Context:**
```javascript
  if (tasks.length === 0 && currentView !== 'settings' && currentView !== 'documentation' && currentView !== 'leads' && currentView !== 'bugs' && currentView !== 'hiring' && currentView !== 'news') {
```

- [ ] **Step 1: Append the queue exclusion**

Find:
```javascript
  if (tasks.length === 0 && currentView !== 'settings' && currentView !== 'documentation' && currentView !== 'leads' && currentView !== 'bugs' && currentView !== 'hiring' && currentView !== 'news') {
```

Replace with:
```javascript
  if (tasks.length === 0 && currentView !== 'settings' && currentView !== 'documentation' && currentView !== 'leads' && currentView !== 'bugs' && currentView !== 'hiring' && currentView !== 'news' && currentView !== 'queue') {
```

- [ ] **Step 2: Verify**

Run: `grep -n "currentView !== 'queue'" nbi_project_dashboard.html`
Expected: one match on the guard line.

---

### Task 9: Settings toggle for can_submit_queue

**Files:**
- Modify: `nbi_project_dashboard.html` — `loadUserManagement()` settings table (~line 20562)

**Context:** The Docs column cell currently reads (all on one line ~20562):
```
<td style="font-size:0.7rem;white-space:nowrap"><label title="View docs"><input type="checkbox" ${u.docs_view!==false?'checked':''} onchange="updateUserField('${u.id}','docs_view',this.checked)"> V</label> <label title="Edit docs"><input type="checkbox" ${u.docs_edit!==false?'checked':''} onchange="updateUserField('${u.id}','docs_edit',this.checked)"> E</label> <label title="Create docs"><input type="checkbox" ${u.docs_create!==false?'checked':''} onchange="updateUserField('${u.id}','docs_create',this.checked)"> C</label> <label title="Upload images"><input type="checkbox" ${u.docs_upload!==false?'checked':''} onchange="updateUserField('${u.id}','docs_upload',this.checked)"> U</label></td>
```
Also need to update the column header `<th>Docs</th>` to `<th>Docs / Queue</th>`.

- [ ] **Step 1: Update the table header**

Find:
```javascript
    el.innerHTML = `<table class="report-table" style="font-size:0.8rem"><thead><tr><th>Username</th><th>Display Name</th><th>Email</th><th>Role</th><th>Client Scope</th><th>Docs</th><th></th></tr></thead><tbody>` +
```

Replace with:
```javascript
    el.innerHTML = `<table class="report-table" style="font-size:0.8rem"><thead><tr><th>Username</th><th>Display Name</th><th>Email</th><th>Role</th><th>Client Scope</th><th>Docs / Queue</th><th></th></tr></thead><tbody>` +
```

- [ ] **Step 2: Append the Queue submit checkbox to the Docs cell**

Find:
```
<label title="Upload images"><input type="checkbox" ${u.docs_upload!==false?'checked':''} onchange="updateUserField('${u.id}','docs_upload',this.checked)"> U</label></td>
```

Replace with:
```
<label title="Upload images"><input type="checkbox" ${u.docs_upload!==false?'checked':''} onchange="updateUserField('${u.id}','docs_upload',this.checked)"> U</label> <label title="Queue submit"><input type="checkbox" ${u.can_submit_queue?'checked':''} onchange="updateUserField('${u.id}','can_submit_queue',this.checked)" style="accent-color:var(--accent)"> Q</label></td>
```

- [ ] **Step 3: Add can_submit_queue to the patchUser labels map**

Find:
```javascript
      const labels = { display_name: 'Name', email: 'Email', docs_view: 'View docs', docs_edit: 'Edit docs', docs_create: 'Create docs', docs_upload: 'Upload docs' };
```

Replace with:
```javascript
      const labels = { display_name: 'Name', email: 'Email', docs_view: 'View docs', docs_edit: 'Edit docs', docs_create: 'Create docs', docs_upload: 'Upload docs', can_submit_queue: 'Queue submit' };
```

- [ ] **Step 4: Verify**

Run: `grep -n "can_submit_queue" nbi_project_dashboard.html`
Expected: three matches — the checkbox render, the labels map, and (from the spec context) the `updateUserField` call in the rendered HTML.

---

## Self-Review

**Spec coverage check:**
1. CSS rules — Task 1 (done) ✓
2. `_queueData` variable — Task 2 (done) ✓
3. Sidebar entry — Task 3 ✓
4. Render dispatcher — Task 4 ✓
5. `renderQueueView` + helper functions — Task 5 ✓
6. Init load — Task 6 ✓
7. Hash routing — Task 7 ✓
8. Tasks-empty guard — Task 8 ✓
9. Settings `can_submit_queue` toggle — Task 9 ✓

**Placeholder scan:** None found. All code blocks are complete.

**Type/name consistency:**
- `_queueData` used in: Task 3 (sidebar count), Task 5 (renderQueueView, _actPromoteQueueItem, _actDismissQueueItem), Task 6 (init load). Consistent throughout.
- `updateUserField` used in Task 9 — matches the actual function name confirmed in the file (not `patchUser` which the spec incorrectly names).
- `renderSidebarCounts()` called in Task 5 — confirmed to exist as an alias for `renderSidebar()`.
- `_trapFocus` called in `_actPromoteQueueItem` — this is a pre-existing utility, confirmed pattern from bug tracker modal usage.

All names consistent.
