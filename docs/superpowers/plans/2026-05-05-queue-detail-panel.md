# Queue Detail Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inline Promote/Dismiss buttons on queue items with a full detail panel that lets Glen fill in all task card fields before promoting a queue item to a real task.

**Architecture:** Client-side only — no server changes. A new `openQueueDetail(queueId)` function renders a slide-in panel (same pattern as bug-detail-panel: `display:none` → `.open { display:flex }`). The panel has a source-info header, client+type pickers, and once both are selected, renders the full detail form fields identical to `openDetailOverlay`. A temporary task object lives in memory; Promote pushes it to `tasks[]` and deletes the queue item via API.

**Tech Stack:** Vanilla JS/HTML/CSS inside `nbi_project_dashboard.html` monolith.

---

## File Structure

All changes are in a single file: `nbi_project_dashboard.html` (monolith, ~13,100 lines).

**Sections to modify:**
1. **CSS** (around line 1116): Add `.queue-detail-*` styles after existing `.queue-item__actions`
2. **HTML** (around line 2578): Add queue detail panel + overlay elements after candidate detail panel
3. **JS — renderQueueView** (line 18778): Make queue items clickable instead of inline buttons
4. **JS — new functions** (after line 18879): `openQueueDetail`, `closeQueueDetail`, `_queueDetailUpdateField`, `_queueDetailRenderForm`, `_actPromoteFromDetail`, helper to build the detail form HTML
5. **JS — remove/simplify** (line 18832): `_actPromoteQueueItem` replaced by the new panel flow

---

### Task 1: Add CSS for Queue Detail Panel

**Files:**
- Modify: `nbi_project_dashboard.html:1116` (after `.queue-item__actions`)

- [ ] **Step 1: Add queue detail panel CSS**

Insert after line 1116 (`.queue-item__actions { ... }`):

```css
/* Queue detail panel — follows bug-detail-panel pattern (display:none → .open display:flex) */
.queue-detail-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: none; }
.queue-detail-panel { position: fixed; top: var(--header-h); right: 0; width: 520px; min-width: 320px; max-width: 80vw; height: calc(100dvh - var(--header-h)); background: var(--bg-raised); border-left: 1px solid var(--border-default); z-index: 201; overflow: hidden; display: none; flex-direction: column; }
.queue-detail-panel.open { display: flex; }
.queue-detail__header { padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); flex-shrink: 0; background: var(--bg-raised); }
.queue-detail__body { padding: var(--space-lg); flex: 1; overflow-y: auto; min-height: 0; }
.queue-detail__section { margin-bottom: var(--space-lg); }
.queue-detail__section-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: var(--space-sm); font-weight: 600; }
.queue-detail__source { font-size: 0.75rem; color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 8px 16px; padding: var(--space-sm) var(--space-md); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-default); margin-bottom: var(--space-md); }
.queue-detail__source dt { font-weight: 600; }
.queue-detail__source dd { margin: 0; }
.queue-detail__actions { padding: var(--space-md) var(--space-lg); border-top: 1px solid var(--border-default); display: flex; gap: var(--space-sm); background: var(--bg-raised); flex-shrink: 0; }
.queue-detail__type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-sm); margin-top: var(--space-sm); }
.queue-detail__type-btn { padding: 8px 4px; border: 2px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.15s; font-family: var(--font-body); }
.queue-detail__type-btn:hover { border-color: var(--accent-border); color: var(--text-primary); }
.queue-detail__type-btn.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--bg-card)); color: var(--accent-text); }
```

- [ ] **Step 2: Add responsive override**

Find the existing media query block that has `.bug-detail-panel { width: 100vw; max-width: 100vw; }` (around line 1951) and add the queue panel rule immediately after it. Specifically, insert after the closing `}` of the `@media (max-width: 768px)` block that contains `.bug-detail-panel`:

Actually, add this inside the same `@media (max-width: 768px)` block, right after `.bug-detail-panel { width: 100vw; max-width: 100vw; }`:

```css
  .queue-detail-panel { width: 100vw; max-width: 100vw; }
```

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "style: add queue detail panel CSS"
```

---

### Task 2: Add HTML Elements for Queue Detail Panel

**Files:**
- Modify: `nbi_project_dashboard.html:2578` (after candidate detail panel elements)

- [ ] **Step 1: Add queue detail panel HTML elements**

Insert after line 2578 (`</div>` closing candidate detail panel):

```html
<!-- QUEUE DETAIL PANEL -->
<div class="queue-detail-overlay" id="queueDetailOverlay" data-action="closeQueueDetail"></div>
<div class="queue-detail-panel" id="queueDetailPanel" role="dialog" aria-modal="true" aria-label="Queue item detail"></div>
```

- [ ] **Step 2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: add queue detail panel HTML elements"
```

---

### Task 3: Make Queue Items Clickable

**Files:**
- Modify: `nbi_project_dashboard.html:18798-18816` (`renderQueueView` item rendering loop)

- [ ] **Step 1: Replace inline Promote/Dismiss buttons with clickable row**

Replace the `_queueData.forEach(item => { ... })` block inside `renderQueueView` (lines 18798–18814) with a version that makes the entire queue item clickable and removes the inline action buttons:

Find this exact block:
```javascript
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
```

Replace with:
```javascript
  _queueData.forEach(item => {
    const ago = _relativeTime(item.created_at);
    const channelLabel = item.slack_channel ? `<span style="background:var(--bg-elevated);padding:1px 6px;border-radius:4px;font-size:0.62rem">#${esc(item.slack_channel)}</span>` : '';
    html += `<div class="queue-item" style="cursor:pointer" data-action="openQueueDetail" data-arg0="${item.id}">
      <div class="queue-item__title">${esc(item.title)}</div>
      ${item.description ? `<div class="queue-item__desc">${esc(item.description)}</div>` : ''}
      <div class="queue-item__meta">
        <span>${esc(item.submitted_by)}</span>
        <span>${ago}</span>
        ${channelLabel}
      </div>
    </div>`;
  });
```

- [ ] **Step 2: Add hover effect to queue items**

In the CSS section, add a hover rule after the `.queue-item` block (around line 1112):

```css
.queue-item[style*="cursor"] { transition: border-color 0.15s, box-shadow 0.15s; }
.queue-item[style*="cursor"]:hover { border-color: var(--accent-border); box-shadow: var(--shadow-md); }
```

Actually, cleaner approach — just add to the existing `.queue-item` rule:

Find:
```css
.queue-item { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
```

Replace with:
```css
.queue-item { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
.queue-item:hover { border-color: var(--accent-border); box-shadow: var(--shadow-md); }
```

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: make queue items clickable, remove inline buttons"
```

---

### Task 4: Implement openQueueDetail and closeQueueDetail

**Files:**
- Modify: `nbi_project_dashboard.html` — insert new functions after `_actDismissQueueItem` (after line 18879)

- [ ] **Step 1: Add state variable for temp task**

Insert a module-level variable near the top of the queue section (right after `// ----- TASK QUEUE VIEW -----` at line 18776):

```javascript
let _queueDetailTempTask = null;
let _queueDetailQueueId = null;
```

- [ ] **Step 2: Implement closeQueueDetail**

Insert after `_actDismissQueueItem` function (after line 18879):

```javascript
function closeQueueDetail() {
  _queueDetailTempTask = null;
  _queueDetailQueueId = null;
  const overlay = document.getElementById('queueDetailOverlay');
  const panel = document.getElementById('queueDetailPanel');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
  if (window._queueDetailEscHandler) {
    document.removeEventListener('keydown', window._queueDetailEscHandler);
    window._queueDetailEscHandler = null;
  }
}
```

- [ ] **Step 3: Implement openQueueDetail**

Insert after `closeQueueDetail`:

```javascript
function openQueueDetail(queueId) {
  const item = (_queueData || []).find(q => String(q.id) === String(queueId));
  if (!item) return;

  _queueDetailQueueId = queueId;
  _queueDetailTempTask = null;

  const overlay = document.getElementById('queueDetailOverlay');
  const panel = document.getElementById('queueDetailPanel');
  if (!overlay || !panel) return;

  const clients = getContractedClients();
  const clientOpts = clients.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const types = ['project', 'feature', 'story', 'task'];

  let html = `<div class="queue-detail__header">
    <div style="flex:1;min-width:0">
      <input id="qdTitle" type="text" value="${esc(item.title)}" style="width:100%;font-size:1rem;font-weight:600;padding:4px 8px;border:1px solid transparent;border-radius:var(--radius-md);background:transparent;color:var(--text-primary);font-family:var(--font-body)" onfocus="this.style.borderColor='var(--accent-border)';this.style.background='var(--bg-input)'" onblur="this.style.borderColor='transparent';this.style.background='transparent'" aria-label="Title">
    </div>
    <button class="btn btn--ghost btn--sm" data-action="closeQueueDetail" aria-label="Close" style="flex-shrink:0">&times;</button>
  </div>`;

  html += `<div class="queue-detail__body">`;

  // Source info (read-only metadata)
  html += `<dl class="queue-detail__source">
    <div><dt>Submitted by</dt><dd>${esc(item.submitted_by || 'Unknown')}</dd></div>
    <div><dt>Received</dt><dd>${new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
    ${item.slack_channel ? `<div><dt>Channel</dt><dd>#${esc(item.slack_channel)}</dd></div>` : ''}
  </dl>`;

  // Description (editable)
  html += `<div class="queue-detail__section">
    <div class="queue-detail__section-title">Description</div>
    <textarea id="qdDescription" placeholder="Add a description..." style="width:100%;min-height:60px;padding:var(--space-sm);border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;font-family:var(--font-body);resize:vertical" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(item.description || '')}</textarea>
  </div>`;

  // Client picker (required)
  html += `<div class="queue-detail__section">
    <div class="queue-detail__section-title field-required">Client</div>
    <select id="qdClient" onchange="_queueDetailOnPickersChanged()" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem">
      <option value="">-- Select Client --</option>
      ${clientOpts}
    </select>
  </div>`;

  // Item type picker (required) — grid of buttons
  html += `<div class="queue-detail__section">
    <div class="queue-detail__section-title field-required">Item Type</div>
    <div class="queue-detail__type-grid">
      ${types.map(t => {
        const meta = ITEM_TYPE_META[t];
        return `<button class="queue-detail__type-btn" data-type="${t}" onclick="_queueDetailSelectType(this, '${t}')">${meta.icon} ${meta.label}</button>`;
      }).join('')}
    </div>
  </div>`;

  // Detail form placeholder — populated when both client and type are selected
  html += `<div id="qdDetailForm"></div>`;

  html += `</div>`; // end body

  // Action bar
  html += `<div class="queue-detail__actions">
    <button id="qdPromoteBtn" class="btn btn--primary" disabled data-action="_actPromoteFromDetail">Promote</button>
    <button class="btn btn--danger" data-action="_actDismissFromDetail" data-arg0="${item.id}" data-arg1="${escAttrJs(item.title)}">Dismiss</button>
  </div>`;

  panel.innerHTML = html;
  panel.classList.add('open');
  overlay.style.display = 'block';

  // Auto-size description textarea
  setTimeout(() => {
    const ta = document.getElementById('qdDescription');
    if (ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  }, 50);

  // Escape to close
  if (window._queueDetailEscHandler) document.removeEventListener('keydown', window._queueDetailEscHandler);
  window._queueDetailEscHandler = (e) => {
    if (e.key === 'Escape') closeQueueDetail();
  };
  document.addEventListener('keydown', window._queueDetailEscHandler);
}
```

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: implement openQueueDetail and closeQueueDetail"
```

---

### Task 5: Implement Type Selection and Detail Form Rendering

**Files:**
- Modify: `nbi_project_dashboard.html` — insert after `openQueueDetail`

- [ ] **Step 1: Implement _queueDetailSelectType**

```javascript
function _queueDetailSelectType(btn, type) {
  document.querySelectorAll('.queue-detail__type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _queueDetailOnPickersChanged();
}
```

- [ ] **Step 2: Implement _queueDetailOnPickersChanged**

This is the key function — when both client and type are selected, it creates a temporary task object and renders the full detail form:

```javascript
function _queueDetailOnPickersChanged() {
  const clientEl = document.getElementById('qdClient');
  const selectedTypeBtn = document.querySelector('.queue-detail__type-btn.selected');
  const formEl = document.getElementById('qdDetailForm');
  const promoteBtn = document.getElementById('qdPromoteBtn');
  if (!clientEl || !formEl || !promoteBtn) return;

  const client = clientEl.value;
  const itemType = selectedTypeBtn ? selectedTypeBtn.dataset.type : '';

  if (!client || !itemType) {
    formEl.innerHTML = client || itemType
      ? `<div style="color:var(--text-muted);font-size:0.82rem;padding:var(--space-md);text-align:center">${!client ? 'Select a client' : 'Select an item type'} to see all fields.</div>`
      : '';
    promoteBtn.disabled = true;
    return;
  }

  const titleEl = document.getElementById('qdTitle');
  const descEl = document.getElementById('qdDescription');

  _queueDetailTempTask = createTaskObject({
    title: titleEl ? titleEl.value : '',
    description: descEl ? descEl.value : '',
    itemType: itemType,
    client: client,
  });

  promoteBtn.disabled = false;
  _queueDetailRenderForm(formEl);
}
```

- [ ] **Step 3: Implement _queueDetailRenderForm**

This renders the same fields as `openDetailOverlay` but writes to `_queueDetailTempTask` instead of calling `updateTask`:

```javascript
function _queueDetailRenderForm(container) {
  const t = _queueDetailTempTask;
  if (!t) { container.innerHTML = ''; return; }

  let html = '<div class="queue-detail__section"><div class="queue-detail__section-title">Properties</div>';

  // Status
  html += `<div class="detail-field"><label class="detail-field__label" for="qd-status">Status</label><select id="qd-status" onchange="_qdField('status',this.value)">${STATUSES.map(o => `<option value="${esc(o)}" ${o === t.status ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;

  // Priority
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="qd-priority">Priority</label><select id="qd-priority" onchange="_qdField('priority',this.value)">${['', ...PRIORITIES].map(o => `<option value="${esc(o)}" ${o === (t.priority || '') ? 'selected' : ''}>${esc(o || '-- None --')}</option>`).join('')}</select></div>`;

  // Health
  html += `<div class="detail-field"><label class="detail-field__label" for="qd-health">Health</label><select id="qd-health" onchange="_qdField('healthState',this.value)">${['', ...HEALTH_STATES].map(o => `<option value="${esc(o)}" ${o === (t.healthState || '') ? 'selected' : ''}>${esc(o || '-- None --')}</option>`).join('')}</select></div>`;

  // Assignee
  html += `<div class="detail-field"><span class="detail-field__label">Assignee</span>${_qdAssigneeHtml(t.assignees)}</div>`;

  // Practice
  html += `<div class="detail-field"><label class="detail-field__label" for="qd-practice">Practice</label><select id="qd-practice" onchange="_qdField('practiceArea',this.value||null)"><option value="">-- Inherit / None --</option>${PRACTICES.map(p => `<option value="${esc(p.value)}" ${(t.practiceArea || '') === p.value ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>`;

  // Dates
  html += `<div class="detail-field"><label class="detail-field__label" for="qd-startDate">Start Date</label><input id="qd-startDate" type="date" value="${t.startDate || ''}" onchange="_qdField('startDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="qd-endDate">End Date</label><input id="qd-endDate" type="date" value="${t.endDate || ''}" onchange="_qdField('endDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="qd-dueDate">Due Date</label><input id="qd-dueDate" type="date" value="${t.dueDate || ''}" onchange="_qdField('dueDate',this.value)"></div>`;

  // Hours estimated
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="qd-hours">Hours Est.</label><input id="qd-hours" type="number" step="0.5" min="0" value="${t.hoursEstimated || 0}" onchange="_qdField('hoursEstimated',parseFloat(this.value)||0)"></div>`;

  html += '</div>';

  // Description of Work
  html += `<div class="queue-detail__section"><div class="queue-detail__section-title field-required">Description of Work</div>`;
  html += `<textarea id="qd-desc" placeholder="A clear, concise description of the work needed." onchange="_qdField('description',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" style="width:100%;min-height:60px;padding:var(--space-sm);border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;font-family:var(--font-body);resize:vertical">${esc(t.description || '')}</textarea></div>`;

  // Success Factor
  html += `<div class="queue-detail__section"><div class="queue-detail__section-title">Success Factor</div>`;
  html += `<textarea id="qd-success" placeholder="What will we have accomplished?" onchange="_qdField('successFactor',this.value)" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" style="width:100%;min-height:40px;padding:var(--space-sm);border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:0.82rem;font-family:var(--font-body);resize:vertical">${esc(t.successFactor || '')}</textarea></div>`;

  container.innerHTML = html;

  // Auto-size textareas
  setTimeout(() => { container.querySelectorAll('textarea').forEach(ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }); }, 50);
}
```

- [ ] **Step 4: Implement _qdField helper**

```javascript
function _qdField(field, value) {
  if (_queueDetailTempTask) _queueDetailTempTask[field] = value;
}
```

- [ ] **Step 5: Implement _qdAssigneeHtml and its add/remove functions**

The existing `assigneeSelectHtml` uses `taskId` and calls `updateTask` to persist — we need a local version that writes to `_queueDetailTempTask`:

```javascript
function _qdAssigneeHtml(currentAssignees) {
  const selected = currentAssignees || [];
  let html = '<div class="assignee-selector">';
  selected.forEach(name => {
    html += `<span class="filter-chip" style="font-size:0.72rem;margin:2px">${esc(name)} <button data-action="_qdRemoveAssignee" data-arg0="${esc(name)}">&times;</button></span>`;
  });
  html += `<select onchange="_qdAddAssignee(this.value);this.value=''" style="padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem;min-width:120px">`;
  html += `<option value="">+ Add assignee</option>`;
  (_cachedTeamMembers || []).forEach(name => {
    if (!selected.includes(name)) html += `<option value="${esc(name)}">${esc(name)}</option>`;
  });
  html += `</select></div>`;
  return html;
}

function _qdAddAssignee(name) {
  if (!name || !_queueDetailTempTask) return;
  const a = [...(_queueDetailTempTask.assignees || [])];
  if (!a.includes(name)) a.push(name);
  _queueDetailTempTask.assignees = a;
  const formEl = document.getElementById('qdDetailForm');
  if (formEl) _queueDetailRenderForm(formEl);
}

function _qdRemoveAssignee(name) {
  if (!_queueDetailTempTask) return;
  _queueDetailTempTask.assignees = (_queueDetailTempTask.assignees || []).filter(a => a !== name);
  const formEl = document.getElementById('qdDetailForm');
  if (formEl) _queueDetailRenderForm(formEl);
}
```

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: implement type selection and detail form rendering"
```

---

### Task 6: Implement Promote and Dismiss Actions

**Files:**
- Modify: `nbi_project_dashboard.html` — insert after `_qdRemoveAssignee`

- [ ] **Step 1: Implement _actPromoteFromDetail**

```javascript
async function _actPromoteFromDetail() {
  if (!_queueDetailTempTask || !_queueDetailQueueId) return;

  // Sync title and description from the header inputs (user may have edited after form rendered)
  const titleEl = document.getElementById('qdTitle');
  const descEl = document.getElementById('qdDescription');
  if (titleEl) _queueDetailTempTask.title = titleEl.value;
  // Prefer the detail form description if it exists (more detailed), otherwise header
  const detailDescEl = document.getElementById('qd-desc');
  if (detailDescEl && detailDescEl.value) {
    _queueDetailTempTask.description = detailDescEl.value;
  } else if (descEl) {
    _queueDetailTempTask.description = descEl.value;
  }

  const t = _queueDetailTempTask;
  tasks.push(t);
  markDirty(t.id);
  save();

  // Delete queue item via API
  const queueId = _queueDetailQueueId;
  const delResp = await authFetch('/api/queue/' + queueId, { method: 'DELETE' });
  if (delResp.ok) _queueData = (_queueData || []).filter(q => q.id !== parseInt(queueId) && String(q.id) !== String(queueId));

  closeQueueDetail();
  renderSidebarCounts();
  renderContent();
  openDetail(t.id);
  toast('Item promoted to ' + getItemTypeLabel(t));
}
```

- [ ] **Step 2: Implement _actDismissFromDetail**

```javascript
async function _actDismissFromDetail(queueId, title) {
  if (!await themedConfirm('Dismiss "' + title + '" from the queue? This cannot be undone.', 'Dismiss')) return;
  const delResp = await authFetch('/api/queue/' + queueId, { method: 'DELETE' });
  if (!delResp.ok) { toast('Failed to dismiss', 'error'); return; }
  _queueData = (_queueData || []).filter(q => q.id !== parseInt(queueId) && String(q.id) !== String(queueId));
  closeQueueDetail();
  renderSidebarCounts();
  renderContent();
  toast('Item dismissed');
}
```

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: implement promote and dismiss from queue detail panel"
```

---

### Task 7: Clean Up Old Promote Flow

**Files:**
- Modify: `nbi_project_dashboard.html:18832` (old `_actPromoteQueueItem` function)

- [ ] **Step 1: Remove _actPromoteQueueItem**

Delete the entire `_actPromoteQueueItem` function (lines 18832–18869). It is fully replaced by the new `openQueueDetail` → `_actPromoteFromDetail` flow. No other code calls `_actPromoteQueueItem` — it was only referenced in the inline Promote button's `data-action`, which was removed in Task 3.

- [ ] **Step 2: Verify no remaining references**

Search for `_actPromoteQueueItem` — should find zero results after the deletion.

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "refactor: remove old inline promote flow, replaced by queue detail panel"
```

---

### Task 8: Register data-action Handlers in the Event Delegation System

**Files:**
- Modify: `nbi_project_dashboard.html` — the global `data-action` click handler

The dashboard uses event delegation — clicking any element with `data-action="funcName"` calls `window[funcName](arg0, arg1, ...)`. The new functions (`openQueueDetail`, `closeQueueDetail`, `_actPromoteFromDetail`, `_actDismissFromDetail`, `_qdRemoveAssignee`) are defined at module scope so they're already on `window`. However, we need to verify the delegation system picks them up.

- [ ] **Step 1: Verify data-action delegation**

Search for the global click handler that dispatches `data-action`. It should already handle all functions on `window` generically. Confirm by finding the handler code — likely near line 3986:

```javascript
if (container.classList.contains('detail-overlay') || container.id === 'detailPanel') { closeDetail(); return; }
```

The delegation handler should be above this, pattern-matching `data-action` attributes and calling `window[action](...)`. If it already does generic dispatch, no change needed. If it requires explicit registration, add the new action names.

- [ ] **Step 2: Commit if changes were needed**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: register queue detail actions in event delegation"
```

---

### Task 9: End-to-End Manual Test

- [ ] **Step 1: Run vitest to verify no regressions**

```bash
cd dashboard-server && npm test
```

Expected: 360 tests passing, 0 failures.

- [ ] **Step 2: Test in browser at worksage.nbi-consulting.com**

After merging to master and restarting PM2:

1. Navigate to Submission Queue in the sidebar
2. Click a queue item → queue detail panel should slide in from the right
3. Verify source info (submitted by, timestamp, channel) is displayed read-only
4. Select a client from the dropdown
5. Click a type button (e.g. Task) — it should highlight and the full detail form should appear
6. Fill in some fields (priority, assignee, due date)
7. Click Promote → item should disappear from queue, new task should appear in the task list with all fields populated, and the task detail panel should open
8. Test Dismiss on another item → confirmation dialog, then item removed
9. Test Escape key → panel closes
10. Test clicking the overlay → panel closes
11. Test on mobile viewport (resize browser to <768px) → panel should be full width

- [ ] **Step 3: Take screenshot as verification evidence**

---

## Self-Review Checklist

1. **Spec coverage:** All 6 spec requirements covered:
   - ✅ Clickable queue items (Task 3)
   - ✅ Side panel with title + description (Task 4)
   - ✅ Source info read-only (Task 4)
   - ✅ Client + Item Type pickers (Task 4)
   - ✅ Full detail form for selected type (Task 5)
   - ✅ Promote + Dismiss action bar (Task 6)

2. **Placeholder scan:** No TBD/TODO/placeholders found. All code blocks are complete.

3. **Type consistency:** `_queueDetailTempTask` used consistently. Function names match between definition and `data-action` references. `_qdField` matches the `onchange` handlers in `_queueDetailRenderForm`.
