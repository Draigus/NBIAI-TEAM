// helpers.js — Core utility functions extracted from the monolith
// Access shared state from window (inline script globals declared with var)

// ==================== ESCAPE / SECURITY ====================

/** HTML-escape a string to prevent XSS — used on ALL user-supplied content before insertion into innerHTML and data-* attributes.
 *  For href/src attributes with user-controlled URLs use safeUrl() — esc() alone does not block `javascript:` or `data:` schemes. */
export function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
window.esc = esc;

/**
 * Sanitise a user-supplied URL for safe injection into an href/src attribute.
 * Allows only http, https, mailto, tel, and protocol-relative (//host/...) schemes.
 * Anything else (including javascript:, data:, file:, vbscript:) is replaced with '#'.
 * The returned value is also HTML-escaped so it is safe to interpolate between
 * double quotes in an attribute. Use this instead of esc() whenever the string
 * is going into an href or src.
 */
export function safeUrl(s) {
  if (s == null) return '#';
  const trimmed = String(s).trim();
  if (trimmed === '') return '#';
  // Allow relative paths (starts with / but not //) and fragment-only links.
  if (trimmed.startsWith('#')) return esc(trimmed);
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return esc(trimmed);
  // Allow protocol-relative //host/... (will inherit the page's https scheme).
  if (trimmed.startsWith('//')) return esc(trimmed);
  // Allow only the four known-safe schemes. Match is case-insensitive and
  // tolerates leading control chars the way the HTML parser would.
  const SAFE_SCHEME = /^(?:[\x00-\x20]*)(https?|mailto|tel):/i;
  if (SAFE_SCHEME.test(trimmed)) return esc(trimmed);
  return '#';
}
window.safeUrl = safeUrl;

/** Escape for JS string literals inside onchange/oninput HTML attributes. For data-* attributes, use esc() instead. */
export function escAttrJs(s) {
  if (!s) return '';
  s = String(s);
  // JS string literal escaping
  s = s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  // HTML attribute escaping
  s = s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return s;
}
window.escAttrJs = escAttrJs;

// ==================== EMPTY STATE ====================

/** Render a generic empty-state placeholder with icon, title, and description */
export function emptyState(icon, title, desc) {
  return `<div class="empty-state"><div class="empty-state__icon" style="font-size:2rem">${icon}</div><div class="empty-state__title">${title}</div><div class="empty-state__desc">${desc}</div></div>`;
}
window.emptyState = emptyState;

// ==================== BADGE HELPERS ====================

/** Render a coloured health state badge (Green/Yellow/Red/Blocked/Waiting) */
export function healthBadgeHtml(h) {
  const cls = { Green:'badge--green', Yellow:'badge--yellow', Red:'badge--red', Blocked:'badge--blocked', 'Waiting on Client':'badge--waiting' };
  return `<span class="badge ${cls[h]||'badge--status'}">${esc(h)}</span>`;
}
window.healthBadgeHtml = healthBadgeHtml;

/** Render a coloured priority badge (Low/Medium/High/Urgent/Critical ACT) */
export function priorityBadgeHtml(p) {
  if (!p) return '';
  const cls = { High:'badge--priority-high', 'Critical ACT':'badge--priority-critical', Urgent:'badge--priority-high', Medium:'badge--priority-medium', Low:'badge--priority-low' };
  return `<span class="badge ${cls[p]||'badge--status'}">${esc(p)}</span>`;
}
window.priorityBadgeHtml = priorityBadgeHtml;

// ==================== DATE HELPER ====================

/** Parse a date string safely, returning null for invalid dates */
export function safeParseDate(str) {
  if (!str) return null;
  let d = new Date(str + 'T00:00:00');
  if (isNaN(d.getTime())) {
    // Try dd/mm/yyyy format
    const parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) d = new Date(parts[3], parts[2] - 1, parts[1]);
  }
  if (isNaN(d.getTime())) return null;
  d.setHours(0,0,0,0);
  return d;
}
window.safeParseDate = safeParseDate;

// ==================== FINANCE HELPERS ====================

/** Format a number as a compact money string: 1500000 -> '1.5M', 25000 -> '25k' */
export function fmtMoney(v) {
  const n = parseFloat(v);
  if (isNaN(n) || v == null) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 0) + 'k';
  return n.toFixed(0);
}
window.fmtMoney = fmtMoney;

/** Return the currency symbol for a given currency code */
export function currencySym(c) { return c === 'USD' ? '$' : c === 'EUR' ? '\u20AC' : '\u00A3'; }
window.currencySym = currencySym;

// ==================== ACCESS CONTROL ====================

/** Check whether the current user has access to a given page based on RBAC settings */
export function hasPageAccess(page) {
  if (!window._currentUser) return false;
  if (window._currentUser.role === 'admin') return true;
  const perm = (window._pagePermissions || {})[page];
  if (perm === 'all') return true;
  if (Array.isArray(perm) && perm.includes(window._currentUser.username)) return true;
  return false;
}
window.hasPageAccess = hasPageAccess;

// ==================== UNDO ====================

/**
 * Push an operation onto the undo stack (max 10 entries).
 * @param {string} desc - Human-readable description of the change
 * @param {Function} undoFn - Function that reverses the change
 */
export function pushUndo(desc, undoFn) {
  window._undoStack.push({ desc, fn: undoFn, ts: Date.now() });
  if (window._undoStack.length > window.UNDO_MAX) window._undoStack.shift();
}
window.pushUndo = pushUndo;

// ==================== TASK TREE & CLIENT UTILITIES ====================

/** Get direct children of a task by parent ID */
export function getChildren(parentId) { return window.tasks.filter(t => t.parentId === parentId); }
window.getChildren = getChildren;

/** Walk up the task tree to find the root ancestor (the project-level task) */
export function getRootAncestor(task) { const visited = new Set(); let cur = task; while (cur && cur.parentId) { if (visited.has(cur.id)) return cur; visited.add(cur.id); const p = window.tasks.find(t => t.id === cur.parentId); if (!p) return cur; cur = p; } return cur || task; }
window.getRootAncestor = getRootAncestor;

/** Get all descendants of a task (children, grandchildren, etc.) — O(n) recursive */
export function getDescendants(taskId, _visited) { const seen = _visited || new Set(); if (seen.has(taskId)) return []; seen.add(taskId); const kids = getChildren(taskId); let all = [...kids]; kids.forEach(k => all.push(...getDescendants(k.id, seen))); return all; }
window.getDescendants = getDescendants;

/** Get the client name for a task — inherits from root ancestor if not set directly */
export function getTaskClient(task) { if (task.client) return task.client; const root = getRootAncestor(task); return root.client || ''; }
window.getTaskClient = getTaskClient;

// Client prefix: 2-3 letter code from client name
const _clientPrefixCache = {};

/**
 * Generate a 2-3 letter abbreviation for a client name (e.g. "Couch Heroes" -> "CH").
 * Uses hardcoded overrides for known clients, auto-generates for unknown ones.
 * @param {string} clientName - Full client name
 * @returns {string} Short prefix code
 */
export function clientPrefix(clientName) {
  if (!clientName) return '';
  if (_clientPrefixCache[clientName]) return _clientPrefixCache[clientName];
  // Prefer the persisted abbreviation stored on the client record (Magnus B.3).
  // The _apiClientsCache is keyed by client name and holds full records including abbreviation.
  const cached = window._apiClientsCache && window._apiClientsCache[clientName];
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
window.clientPrefix = clientPrefix;

/** Render a coloured badge chip with the client's short prefix code */
export function clientBadgeHtml(clientName) {
  if (!clientName) return '';
  const pref = clientPrefix(clientName);
  const col = window.stringToColour(clientName);
  return `<span class="badge" style="background:${col};color:#fff;font-size:0.6rem;font-weight:700;padding:1px 5px;border-radius:3px;letter-spacing:0.5px" title="${esc(clientName)}">${pref}</span>`;
}
window.clientBadgeHtml = clientBadgeHtml;

/** Get all top-level (root/project) tasks that have no parent */
export function getRootTasks() { return window.tasks.filter(t => !t.parentId); }
window.getRootTasks = getRootTasks;

/** Generate a sanitised client group key for collapse/expand tracking (e.g. 'client_Couch_Heroes') */
export function clientGroupKey(task) {
  const cn = (task.client || getTaskClient(task) || 'Unassigned').replace(/[^a-zA-Z0-9]/g, '_');
  return 'client_' + cn;
}
window.clientGroupKey = clientGroupKey;

/** Check if a leaf task is missing required fields (hours, priority, assignee, due date, client, description) */
export function isTaskIncomplete(task) {
  if (getChildren(task.id).length > 0) return false;
  if (task.status === 'Done' || task.status === 'Cancelled' || task.status === 'Not started') return false;
  const descLen = (task.description || '').trim().length;
  return !task.hoursEstimated || !task.priority || !task.assignees || task.assignees.length === 0 || !task.dueDate || !task.client || descLen < 15;
}
window.isTaskIncomplete = isTaskIncomplete;

/** Get the item type string for a task ('project', 'feature', 'story', 'task') */
export function getItemType(task) { return task.itemType || 'task'; }
window.getItemType = getItemType;

/** Render a coloured badge showing the item's type (Project/Feature/Story/Task) */
export function itemTypeBadgeHtml(task) {
  const m = window.ITEM_TYPE_META[getItemType(task)] || window.ITEM_TYPE_META.task;
  return `<span class="item-type-badge" style="background:${m.colour}">${m.label}</span>`;
}
window.itemTypeBadgeHtml = itemTypeBadgeHtml;

/** Collect all unique client names from tasks, sorted by client priority order */
export function getAllClients() {
  const s = new Set(); window.tasks.forEach(t => { const c = getTaskClient(t); if (c) s.add(c); });
  return [...s].sort(window.clientSortOrder);
}
window.getAllClients = getAllClients;

/** Get only contracted clients (have tasks) plus NBI Ops and NSI.
 *  Used for task dropdowns, filter bars, and reports — excludes leads/prospects.
 *  Leads page uses its own client list from the DB. */
export function getContractedClients() {
  const ALWAYS_INCLUDE = ['NBI Operations', 'NBI OPS', 'NSI'];
  const s = new Set(ALWAYS_INCLUDE.filter(c => window.settings.knownClients.includes(c)));
  window.tasks.forEach(t => { const c = getTaskClient(t); if (c) s.add(c); });
  return [...s].sort(window.clientSortOrder);
}
window.getContractedClients = getContractedClients;

/** Return the full client records for the contracted-client set, pulled from
 *  _apiClientsCache. Used by the Hiring page so dropdowns only surface active
 *  clients (not the full leads/prospects list). Returns [{id, name, ...}] sorted by name. */
export function getContractedClientRecords() {
  const contractedNames = new Set(getContractedClients());
  return Object.values(window._apiClientsCache || {})
    .filter(c => c && c.id && c.name && contractedNames.has(c.name))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
window.getContractedClientRecords = getContractedClientRecords;

/** Aggregate hours spent and estimated for a task and all its descendants */
export function aggHours(taskId) {
  const desc = getDescendants(taskId);
  const task = window.tasks.find(t => t.id === taskId);
  let spent = task ? (task.hoursSpent || 0) : 0;
  let est = task ? (task.hoursEstimated || 0) : 0;
  desc.forEach(d => { spent += d.hoursSpent || 0; est += d.hoursEstimated || 0; });
  return { spent, est };
}
window.aggHours = aggHours;

/** Count tasks grouped by health state. Returns { healthState: count } map */
export function countByHealth(list) { const c = {}; window.HEALTH_STATES.forEach(h => c[h] = 0); c['Not set'] = 0; list.forEach(t => { const h = t.healthState || 'Not set'; c[h] = (c[h]||0) + 1; }); return c; }
window.countByHealth = countByHealth;

/** Resolve the practice for a task, walking up the parent chain if it
 *  has none of its own. Lets a project tag a whole subtree once.
 *  Guarded against cyclic parent chains (malformed sync data) with a
 *  visited set and a depth cap. */
export function getTaskPractice(t) {
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
    current = window.tasks.find(x => x.id === parentId);
    depth++;
  }
  return null;
}
window.getTaskPractice = getTaskPractice;

/** Apply all active filters (client, status, health, search, sort) and return the matching task list */
export function getFilteredTasks() {
  let list = window.tasks;
  if (window.currentFilter.client) list = list.filter(t => getTaskClient(t) === window.currentFilter.client);
  if (window.currentFilter.practice) list = list.filter(t => getTaskPractice(t) === window.currentFilter.practice);
  if (window.currentFilter.project) { const pid = window.currentFilter.project; list = list.filter(t => t.id === pid || getDescendants(pid).some(d => d.id === t.id)); }
  if (window.currentFilter.status && window.currentFilter.status.length > 0) list = list.filter(t => window.currentFilter.status.includes(t.status));
  if (window.currentFilter.health && window.currentFilter.health.length > 0) list = list.filter(t => window.currentFilter.health.includes(t.healthState || 'Not set'));
  if (window.currentFilter.priority && window.currentFilter.priority.length > 0) list = list.filter(t => window.currentFilter.priority.includes(t.priority));
  if (window.currentFilter.assignee && window.currentFilter.assignee.length > 0) list = list.filter(t => t.assignees?.some(a => window.currentFilter.assignee.includes(a)));
  // "My Work Only" sort option (bugs c73af494, f09303f1): auto-filter to
  // the current user's tasks. Scoped to the Projects view only — previously
  // leaked to Dashboard/People/etc. because currentFilter is global.
  if (window.currentView === 'tasks' && window.currentFilter.sort === 'assignee' && (!window.currentFilter.assignee || window.currentFilter.assignee.length === 0)) {
    const myName = window._currentUser?.displayName || window._currentUser?.display_name || '';
    if (myName) list = list.filter(t => (t.assignees || []).some(a => a.toLowerCase() === myName.toLowerCase()));
  }
  if (window.currentFilter.incomplete) list = list.filter(t => t.status !== 'Done' && t.status !== 'Cancelled' && (!t.hoursEstimated || !t.priority || !t.dueDate || !t.healthState));
  if (window.currentFilter.search) {
    const q = window.currentFilter.search.toLowerCase();
    list = list.filter(t => t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q) || (t.notes||[]).some(n => (n.text||'').toLowerCase().includes(q)) || (t.assignees||[]).some(a => a.toLowerCase().includes(q)) || getTaskClient(t).toLowerCase().includes(q));
  }
  // Sorting
  if (window.currentFilter.sort && window.currentFilter.sort !== 'default') {
    const s = window.currentFilter.sort;
    list = [...list].sort((a, b) => {
      if (s === 'due-asc') return (a.dueDate||'9999').localeCompare(b.dueDate||'9999');
      if (s === 'due-desc') return (b.dueDate||'').localeCompare(a.dueDate||'');
      if (s === 'priority') { const ord = {'Critical ACT':0,'Urgent':1,'High':2,'Medium':3,'Low':4,'':5}; return (ord[a.priority]??5) - (ord[b.priority]??5); }
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
window.getFilteredTasks = getFilteredTasks;

// ==================== ASSIGNEE SELECT ====================

/** Generate an assignee dropdown/selector HTML for the detail panel */
export function assigneeSelectHtml(taskId, currentAssignees) {
  const selected = currentAssignees || [];
  let html = '<div class="assignee-selector">';
  // Show currently assigned as chips
  selected.forEach(name => {
    html += `<span class="filter-chip" style="font-size:0.72rem;margin:2px">${esc(name)} <button data-action="removeAssignee" data-arg0="${taskId}" data-arg1="${esc(name)}">&times;</button></span>`;
  });
  // Dropdown to add
  html += `<select onchange="addAssignee('${taskId}',this.value);this.value=''" style="padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.78rem;min-width:120px">`;
  html += `<option value="">+ Add assignee</option>`;
  (window._cachedTeamMembers || []).forEach(name => {
    if (!selected.includes(name)) html += `<option value="${esc(name)}">${esc(name)}</option>`;
  });
  html += `</select></div>`;
  return html;
}
window.assigneeSelectHtml = assigneeSelectHtml;

// ==================== MULTI-SELECT FILTER HELPERS ====================

/** Handle "All" checkbox in multi-select. Keeps the dropdown open after re-render. */
export function multiSelectAll(checkbox, filterKey) {
  if (checkbox.checked) {
    window.currentFilter[filterKey] = [];
    window.renderContent();
    window._reopenMultiSelect(filterKey);
  }
}
window.multiSelectAll = multiSelectAll;

/** Handle individual checkbox change in multi-select. Keeps the dropdown open after re-render
 *  so users can select multiple values in a single interaction. */
export function multiSelectChanged(checkbox, filterKey) {
  const container = checkbox.closest('.multi-select');
  const allCheckboxes = container.querySelectorAll('.multi-select__option:not(.multi-select__option--all) input[type="checkbox"]');
  const allBox = container.querySelector('.multi-select__option--all input[type="checkbox"]');
  const selected = [];
  allCheckboxes.forEach(cb => { if (cb.checked) selected.push(cb.value); });
  if (selected.length === 0 || selected.length === allCheckboxes.length) {
    // All or none selected means "All"
    window.currentFilter[filterKey] = [];
    if (allBox) allBox.checked = true;
    allCheckboxes.forEach(cb => cb.checked = false);
  } else {
    window.currentFilter[filterKey] = selected;
    if (allBox) allBox.checked = false;
  }
  window.renderContent();
  window._reopenMultiSelect(filterKey);
}
window.multiSelectChanged = multiSelectChanged;
