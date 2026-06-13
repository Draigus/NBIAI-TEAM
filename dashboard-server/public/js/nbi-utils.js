// ==================== LISTENER REGISTRY ====================
const _listenerRegistry = [];
/** Register an event listener and track it for later cleanup */
function addManagedListener(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  _listenerRegistry.push({ target, event, handler, options });
}
/** Remove all managed event listeners and clear the registry */
function cleanupListeners() {
  _listenerRegistry.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options);
  });
  _listenerRegistry.length = 0;
}

// ==================== PASTE NORMALISATION FOR DATE INPUTS ====================
document.addEventListener('paste', (e) => {
  const el = e.target;
  if (el.tagName !== 'INPUT' || el.type !== 'date') return;
  const text = (e.clipboardData || window.clipboardData).getData('text').trim();
  if (!text) return;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return;
  const ukMatch = text.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (ukMatch) {
    e.preventDefault();
    let [, dd, mm, yyyy] = ukMatch;
    if (yyyy.length === 2) yyyy = (parseInt(yyyy) > 50 ? '19' : '20') + yyyy;
    const iso = `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    el.value = iso;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const months = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  const namedMatch = text.match(/^(\d{1,2})\s+(\w{3,})\s+(\d{4})$/) || text.match(/^(\w{3,})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (namedMatch) {
    e.preventDefault();
    let day, monthName, year;
    if (/^\d/.test(namedMatch[1])) { day = namedMatch[1]; monthName = namedMatch[2]; year = namedMatch[3]; }
    else { monthName = namedMatch[1]; day = namedMatch[2]; year = namedMatch[3]; }
    const monthNum = months[monthName.toLowerCase().slice(0, 3)];
    if (monthNum) {
      const iso = `${year}-${String(monthNum).padStart(2, '0')}-${day.padStart(2, '0')}`;
      el.value = iso;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
});

// ==================== HELPERS & TASK TREE UTILITIES ====================

/** Generate a UUID v4 for new task/entity IDs (uses crypto.randomUUID when available) */
function uid() {
  // Generate a proper UUID v4 for database compatibility
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
/** Generic debounce utility — returns a wrapper that delays fn by ms milliseconds */
function _debounce(fn, ms) { let t; return function() { clearTimeout(t); t = setTimeout(fn, ms); }; }
const _debouncedLeadsSearch = _debounce(() => refreshLeads(), 300);
const _debouncedBtSearch = _debounce(() => renderContent(), 300);
/** Get direct children of a task by parent ID */
function getChildren(parentId) { return tasks.filter(t => t.parentId === parentId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)); }
/** Walk up the task tree to find the root ancestor (the project-level task) */
function getRootAncestor(task) { const visited = new Set(); let cur = task; while (cur && cur.parentId) { if (visited.has(cur.id)) return cur; visited.add(cur.id); const p = tasks.find(t => t.id === cur.parentId); if (!p) return cur; cur = p; } return cur || task; }
/** Get all descendants of a task (children, grandchildren, etc.) — O(n) recursive */
function getDescendants(taskId, _visited) { const seen = _visited || new Set(); if (seen.has(taskId)) return []; seen.add(taskId); const kids = getChildren(taskId); let all = [...kids]; kids.forEach(k => all.push(...getDescendants(k.id, seen))); return all; }
/** Get the client name for a task — inherits from root ancestor if not set directly */
function getTaskClient(task) { if (task.client) return task.client; const root = getRootAncestor(task); return root.client || ''; }
// Client prefix: 2-3 letter code from client name
const _clientPrefixCache = {};
/**
 * Generate a 2-3 letter abbreviation for a client name (e.g. "Couch Heroes" -> "CH").
 * Uses hardcoded overrides for known clients, auto-generates for unknown ones.
 * @param {string} clientName - Full client name
 * @returns {string} Short prefix code
 */
function clientPrefix(clientName) {
  if (!clientName) return '';
  if (_clientPrefixCache[clientName]) return _clientPrefixCache[clientName];
  // Prefer the persisted abbreviation stored on the client record (Magnus B.3).
  // The _apiClientsCache is keyed by client name and holds full records including abbreviation.
  const cached = _apiClientsCache && _apiClientsCache[clientName];
  if (cached && cached.abbreviation) {
    _clientPrefixCache[clientName] = cached.abbreviation;
    return cached.abbreviation;
  }
  // Legacy hardcoded fallback (kept so the page still works when the cache is cold).
  // Matches the DB abbreviation column per G1 (2026-04-15).
  const known = { 'Couch Heroes': 'CH', 'Lighthouse Games': 'LH', 'Lighthouse Studios': 'LS', 'Goals Studio': 'GS', 'Sarge Universe': 'SU', 'Playsage': 'PS', 'NSI': 'NSI', 'NBI Operations': 'NBI', 'NBI OPS': 'NBI' };
  if (known[clientName]) { _clientPrefixCache[clientName] = known[clientName]; return known[clientName]; }
  // Auto-generate: take first letter of each word, uppercase, max 3
  const words = clientName.split(/\s+/).filter(Boolean);
  const prefix = words.length >= 2 ? words.map(w => w[0]).join('').toUpperCase().slice(0,3) : clientName.slice(0,2).toUpperCase();
  _clientPrefixCache[clientName] = prefix;
  return prefix;
}
/** Clear the client prefix cache — call after a client's abbreviation is edited. */
function clearClientPrefixCache(clientName) {
  if (clientName) delete _clientPrefixCache[clientName];
  else Object.keys(_clientPrefixCache).forEach(k => delete _clientPrefixCache[k]);
}
/** Render a coloured badge chip with the client's short prefix code */
function clientBadgeHtml(clientName) {
  if (!clientName) return '';
  const pref = clientPrefix(clientName);
  const col = stringToColour(clientName);
  return `<span class="badge" style="background:${col};color:#fff;font-size:0.75rem;font-weight:700;padding:1px 5px;border-radius:3px;letter-spacing:0.5px" title="${esc(clientName)}">${pref}</span>`;
}
/** Get all top-level (root/project) tasks that have no parent */
function getRootTasks() { return tasks.filter(t => !t.parentId); }
/** Generate a sanitised client group key for collapse/expand tracking (e.g. 'client_Couch_Heroes') */
function clientGroupKey(task) {
  const cn = (task.client || getTaskClient(task) || 'Unassigned').replace(/[^a-zA-Z0-9]/g, '_');
  return 'client_' + cn;
}
/** Check if a leaf task is missing required fields (hours, priority, assignee, due date, client) */
function isTaskIncomplete(task) {
  if (getChildren(task.id).length > 0) return false;
  if (task.status === 'Done' || task.status === 'Cancelled' || task.status === 'Not started') return false;
  return getMissingFields(task).length > 0;
}
/** List the human-readable names of required fields missing on a task.
 *  Single source of truth for the incomplete-fields warning triangle and the
 *  warnings sidebar. Client is resolved via getTaskClient so items inheriting
 *  their client from an ancestor are not falsely flagged (bug 02bf81b0). */
function getMissingFields(task) {
  const missing = [];
  if (!task.hoursEstimated) missing.push('hours estimate');
  if (!task.priority) missing.push('priority');
  if (!task.assignees || task.assignees.length === 0) missing.push('assignee');
  if (!task.dueDate) missing.push('due date');
  if (!getTaskClient(task)) missing.push('client');
  return missing;
}

// ==================== ITEM TYPE HIERARCHY ====================
// Fixed 4-level hierarchy: Project > Feature > Story > Task
const ITEM_TYPE_META = {
  project: { label: 'Project', plural: 'Projects', colour: '#6366f1', icon: '\u{1F4C1}' },
  feature: { label: 'Feature', plural: 'Features', colour: '#8b5cf6', icon: '\u2605' },
  story:   { label: 'Story',   plural: 'Stories',  colour: '#06b6d4', icon: '\u{1F4D6}' },
  task:    { label: 'Task',    plural: 'Tasks',    colour: '#64748b', icon: '\u270E' },
};
const ITEM_TYPE_ORDER = ['project', 'feature', 'story', 'task'];
const VALID_CHILD_TYPE = { project: 'feature', feature: 'story', story: 'task', task: null };
const VALID_PARENT_TYPE = { project: null, feature: 'project', story: 'feature', task: 'story' };

/** Get the item type string for a task ('project', 'feature', 'story', 'task') */
function getItemType(task) { return task.itemType || 'task'; }
/** Get the full metadata object (label, plural, colour, icon) for a task's type */
function getItemTypeMeta(task) { return ITEM_TYPE_META[getItemType(task)] || ITEM_TYPE_META.task; }
/** Get the human-readable type label (e.g. 'Feature') */
function getItemTypeLabel(task) { return getItemTypeMeta(task).label; }
/** Get the allowed child type string, or null if no children allowed */
function getAllowedChildType(task) { return VALID_CHILD_TYPE[getItemType(task)]; }
/** Get the plural label for children (e.g. 'Stories' for a feature), or null */
function getChildTypeLabel(task) {
  const ct = getAllowedChildType(task);
  return ct ? ITEM_TYPE_META[ct].plural : null;
}
/** Render a coloured badge showing the item's type (Project/Feature/Story/Task) */
function itemTypeBadgeHtml(task) {
  const m = getItemTypeMeta(task);
  return `<span class="item-type-badge" style="background:${m.colour}">${m.label}</span>`;
}
/** Sort comparator that puts priority clients first, 'Unassigned' last, alphabetical otherwise */
function clientSortOrder(a, b) {
  if (a === 'Unassigned' || a === 'Uncategorised') return 1;
  if (b === 'Unassigned' || b === 'Uncategorised') return -1;
  const ai = CLIENT_PRIORITY.indexOf(a); const bi = CLIENT_PRIORITY.indexOf(b);
  if (ai >= 0 && bi >= 0) return ai - bi;
  if (ai >= 0) return -1; if (bi >= 0) return 1;
  return a.localeCompare(b);
}

function getAllClients() {
  const s = new Set();
  tasks.forEach(t => { const c = getTaskClient(t); if (c) s.add(c); });
  Object.values(_apiClientsCache || {}).forEach(c => { if (c && c.name && c.has_active_work) s.add(c.name); });
  return [...s].sort(clientSortOrder);
}
function getContractedClients() {
  const ALWAYS_INCLUDE = ['NBI Operations', 'NBI OPS', 'NSI'];
  const s = new Set(ALWAYS_INCLUDE.filter(c => settings.knownClients.includes(c)));
  tasks.forEach(t => { const c = getTaskClient(t); if (c) s.add(c); });
  Object.values(_apiClientsCache || {}).forEach(c => { if (c && c.name && c.has_active_work) s.add(c.name); });
  return [...s].sort(clientSortOrder);
}
/** Return the full client records for the contracted-client set, pulled from
 *  _apiClientsCache. Used by the Hiring page so dropdowns only surface active
 *  clients (not the full leads/prospects list). Returns [{id, name, ...}] sorted by name. */
function getContractedClientRecords() {
  const contractedNames = new Set(getContractedClients());
  return Object.values(_apiClientsCache || {})
    .filter(c => c && c.id && c.name && contractedNames.has(c.name))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
/** Aggregate hours spent and estimated for a task and all its descendants */
function aggHours(taskId) {
  const desc = getDescendants(taskId);
  const task = tasks.find(t => t.id === taskId);
  let spent = task ? (task.hoursSpent || 0) : 0;
  let est = task ? (task.hoursEstimated || 0) : 0;
  desc.forEach(d => { spent += d.hoursSpent || 0; est += d.hoursEstimated || 0; });
  return { spent, est };
}

function computeDateRange(taskId) {
  const children = getDescendants(taskId);
  if (children.length === 0) return { start: '', dueDate: '', endDate: '' };
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  let earliest = null;
  let latestDue = null;
  let latestEnd = null;
  let allHaveEnd = true;
  children.forEach(c => {
    if (c.startDate) {
      const d = safeParseDate(c.startDate);
      if (d && (!earliest || d < earliest)) earliest = d;
    }
    if (c.dueDate) {
      const d = safeParseDate(c.dueDate);
      if (d && (!latestDue || d > latestDue)) latestDue = d;
    }
    if (c.endDate) {
      const d = safeParseDate(c.endDate);
      if (d && (!latestEnd || d > latestEnd)) latestEnd = d;
    } else {
      allHaveEnd = false;
    }
  });
  return {
    start: earliest ? fmt(earliest) : '',
    dueDate: latestDue ? fmt(latestDue) : '',
    endDate: allHaveEnd && latestEnd ? fmt(latestEnd) : ''
  };
}

/** Count tasks grouped by status. Returns { statusName: count } map */
function countByStatus(list) { const c = {}; STATUSES.forEach(s => c[s] = 0); list.forEach(t => { if (c[t.status] !== undefined) c[t.status]++; else c[t.status] = (c[t.status]||0)+1; }); return c; }
/** Count tasks grouped by health state. Returns { healthState: count } map */
function countByHealth(list) { const c = {}; HEALTH_STATES.forEach(h => c[h] = 0); c['Not set'] = 0; list.forEach(t => { const h = t.healthState || 'Not set'; c[h] = (c[h]||0) + 1; }); return c; }

/** Apply all active filters (client, status, health, search, sort) and return the matching task list */
/** Resolve the practice for a task, walking up the parent chain if it
 *  has none of its own. Lets a project tag a whole subtree once.
 *  Guarded against cyclic parent chains (malformed sync data) with a
 *  visited set and a depth cap. */
function getTaskPractice(t) {
  if (!t) return null;
  const visited = new Set();
  let current = t;
  let depth = 0;
  while (current && depth < 32) {
    // Accept both camelCase (from sync/load) and snake_case (from GET /api/tasks)
    // because the two transport paths use different casing conventions.
    const p = current.practiceArea || current.practice_area;
    if (p) return p;
    const parentId = current.parentId || current.parent_id;
    if (!parentId || visited.has(current.id)) return null;
    visited.add(current.id);
    current = tasks.find(x => x.id === parentId);
    depth++;
  }
  return null;
}
function getFilteredTasks() {
  let list = tasks;
  if (currentFilter.client) list = list.filter(t => getTaskClient(t) === currentFilter.client);
  if (currentFilter.practice) list = list.filter(t => getTaskPractice(t) === currentFilter.practice);
  if (currentFilter.project) { const pid = currentFilter.project; list = list.filter(t => t.id === pid || getDescendants(pid).some(d => d.id === t.id)); }
  if (currentFilter.status && currentFilter.status.length > 0) list = list.filter(t => currentFilter.status.includes(t.status));
  if (currentFilter.health && currentFilter.health.length > 0) list = list.filter(t => currentFilter.health.includes(t.healthState || 'Not set'));
  if (currentFilter.priority && currentFilter.priority.length > 0) list = list.filter(t => currentFilter.priority.includes(t.priority));
  if (currentFilter.assignee && currentFilter.assignee.length > 0) list = list.filter(t => t.assignees?.some(a => currentFilter.assignee.includes(a)));
  // "My Work Only" sort option (bugs c73af494, f09303f1): auto-filter to
  // the current user's tasks. Scoped to the Projects view only — previously
  // leaked to Dashboard/People/etc. because currentFilter is global.
  if (currentView === 'tasks' && currentFilter.sort === 'assignee' && (!currentFilter.assignee || currentFilter.assignee.length === 0)) {
    const myName = _currentUser?.displayName || _currentUser?.display_name || '';
    if (myName) list = list.filter(t => (t.assignees || []).some(a => a.toLowerCase() === myName.toLowerCase()));
  }
  if (currentFilter.overdue) list = list.filter(t => t.dueDate && t.status !== 'Done' && t.status !== 'Cancelled' && safeParseDate(t.dueDate) < new Date());
  if (currentFilter.incomplete) list = list.filter(t => t.status !== 'Done' && t.status !== 'Cancelled' && (!t.hoursEstimated || !t.priority || !t.dueDate || !t.healthState));
  if (currentFilter.search) {
    const q = currentFilter.search.toLowerCase();
    list = list.filter(t => t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q) || (t.notes||[]).some(n => (n.text||'').toLowerCase().includes(q)) || (t.assignees||[]).some(a => a.toLowerCase().includes(q)));
  }
  // Sorting
  if (currentFilter.sort && currentFilter.sort !== 'default') {
    const s = currentFilter.sort;
    list = [...list].sort((a, b) => {
      if (s === 'due-asc') return (a.dueDate||'9999').localeCompare(b.dueDate||'9999');
      if (s === 'due-desc') return (b.dueDate||'').localeCompare(a.dueDate||'');
      if (s === 'priority') { const ord = {'Urgent':0,'High':1,'Medium':2,'Low':3,'':4}; return (ord[a.priority]??4) - (ord[b.priority]??4); }
      if (s === 'hours-desc') return (b.hoursEstimated||0) - (a.hoursEstimated||0);
      if (s === 'hours-asc') return (a.hoursSpent||0) - (b.hoursSpent||0);
      if (s === 'status') { const ord = {'In progress':0,'In Review':1,'Not started':2,'Planning':3,'Done':4,'Cancelled':5}; return (ord[a.status]??3) - (ord[b.status]??3); }
      if (s === 'assignee') return ((a.assignees||[])[0]||'zzz').localeCompare(((b.assignees||[])[0]||'zzz'));
      if (s === 'updated') return (b.updatedAt||'').localeCompare(a.updatedAt||'');
      return 0;
    });
  }
  return list;
}

// ==================== TOAST NOTIFICATIONS ====================

/** Show a temporary toast notification that auto-dismisses after 4 seconds */
function toast(msg, type='success') {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Alias: a handful of call-sites (finance 409 conflict, system broadcast,
// attachment confirm/move/download failure) were wired up calling
// `showToast` which was never defined and threw ReferenceError. This
// keeps both names working so no call site is silently broken.
const showToast = toast;

// ==================== THEMED CONFIRMATION DIALOG ====================

let _confirmResolve = null;

/** Themed replacement for window.confirm(). Returns a Promise<boolean>. */
function themedConfirm(message, title = 'Confirm', dangerLabel = 'Confirm') {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent = dangerLabel;
    const modal = document.getElementById('confirmModal');
    modal.classList.add('open');
    // Focus the cancel button for safety
    modal.querySelector('.btn').focus();
    // Trap focus inside the dialog
    _trapFocus(modal);
  });
}

/** Themed replacement for window.prompt(). Returns Promise<string|null>. */
function themedPrompt(message, defaultValue = '', title = 'Input') {
  return new Promise(resolve => {
    _confirmResolve = (ok) => ok ? (document.getElementById('confirmInput').value || null) : null;
    const realResolve = resolve;
    _confirmResolve = (ok) => {
      const val = ok ? (document.getElementById('confirmInput').value || null) : null;
      realResolve(val);
    };
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent = 'OK';
    const input = document.getElementById('confirmInput');
    input.style.display = 'block';
    input.value = defaultValue;
    const modal = document.getElementById('confirmModal');
    modal.classList.add('open');
    _trapFocus(modal);
    setTimeout(() => { input.focus(); input.select(); }, 50);
  });
}

/** Close the confirm modal and resolve the pending promise with the user's choice */
function _resolveConfirm(result) {
  const modal = document.getElementById('confirmModal');
  modal.classList.remove('open');
  _releaseFocusTrap(modal);
  const input = document.getElementById('confirmInput');
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
  input.style.display = 'none';
  input.value = '';
}

// ==================== FOCUS TRAP (ACCESSIBILITY) ====================

const _focusTrapMap = new WeakMap();

/** Trap keyboard focus inside a modal container (Tab cycling and Escape to close) */
function _trapFocus(container) {
  const handler = (e) => {
    if (e.key === 'Escape') {
      // Close the modal on Escape
      if (container.id === 'confirmModal') { _resolveConfirm(false); return; }
      if (container.id === 'importModal') { closeImportModal(); return; }
      if (container.classList.contains('detail-overlay') || container.id === 'detailPanel') { closeDetail(); return; }
      container.classList.remove('open');
      _releaseFocusTrap(container);
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]');
    if (focusable.length === 0) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  _focusTrapMap.set(container, handler);
  container.addEventListener('keydown', handler);
}

/** Remove the focus trap from a container and clean up the keydown handler */
function _releaseFocusTrap(container) {
  const handler = _focusTrapMap.get(container);
  if (handler) { container.removeEventListener('keydown', handler); _focusTrapMap.delete(container); }
}

/** Activate focus management on a dynamically inserted modal overlay.
 *  Saves the previously focused element, traps Tab/Escape, and restores focus on close. */
function _activateDynamicModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const prevFocus = document.activeElement;
  _trapFocus(modal);
  // Patch .remove() to restore focus when the modal is dismissed
  const origRemove = modal.remove.bind(modal);
  modal.remove = function() { _releaseFocusTrap(modal); origRemove(); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
  // Focus the first focusable element inside the modal
  const first = modal.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]');
  if (first) setTimeout(() => first.focus(), 50);
}

// ==================== ASYNC BUTTON HELPER ====================

/** Disable a button during an async operation, show spinner, re-enable on completion. */
async function withButtonLoading(btn, asyncFn) {
  if (!btn || btn.disabled) return;
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle"></span> ' + btn.textContent.trim();
  try { return await asyncFn(); }
  catch(e) { console.error('[withButtonLoading]', e); toast(e.message || 'An error occurred', 'error'); }
  finally { btn.disabled = false; btn.innerHTML = originalHtml; }
}

// ==================== INLINE FORM VALIDATION ====================

/** Show an inline validation error beneath an input element */
function showFieldError(input, message) {
  if (!input) return;
  input.classList.add('is-invalid');
  let errEl = input.parentElement.querySelector('.detail-field__error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'detail-field__error';
    input.parentElement.appendChild(errEl);
  }
  errEl.textContent = message;
}

/** Clear all inline validation errors within a container */
function clearFieldErrors(container) {
  if (!container) return;
  container.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  container.querySelectorAll('.detail-field__error').forEach(el => el.remove());
}

// ==================== TEXTAREA AUTO-RESIZE FALLBACK ====================

/** Auto-resize textareas to fit their content (fallback for browsers without field-sizing: content) */
function initTextareaAutoResize(container) {
  if (CSS.supports && CSS.supports('field-sizing', 'content')) return;
  (container || document).querySelectorAll('textarea').forEach(ta => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
    if (!ta._autoResizeBound) {
      ta.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; });
      ta._autoResizeBound = true;
    }
  });
}

