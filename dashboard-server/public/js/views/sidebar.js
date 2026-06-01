// ==================== SIDEBAR ====================
// Extracted from nbi_project_dashboard.html
// Bundles: Sidebar navigation, mobile sidebar keyboard handling, mobile header
// overflow menu, sidebar collapse & mobile, warnings & alerts sidebar.

import { registerShellCallback } from '../core/router.js';

// ===== FUNCTIONS =====

// ==================== MOBILE SIDEBAR KEYBOARD HANDLING ====================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebarEl');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      toggleMobileSidebar();
    }
  }
});

// ==================== SIDEBAR NAVIGATION ====================

/** Build and render the sidebar: views list, client filters, health filters, quick filters */
/** Return the opening markup for a collapsible sidebar section.
 *  Collapsed state is persisted in localStorage under 'sidebarSection:<key>'. */
function sidebarSectionOpen(key, title) {
  const collapsed = localStorage.getItem('sidebarSection:' + key) === '1';
  const keyAttr = esc(key);
  return `<div class="sidebar__section" data-collapsed="${collapsed}" data-section="${keyAttr}">
    <button type="button" class="sidebar__title" aria-expanded="${!collapsed}" data-action="toggleSidebarSection" data-arg0="${keyAttr}">${esc(title)}</button>
    <div class="sidebar__section__body">`;
}
function sidebarSectionClose() { return `</div></div>`; }

/** Toggle a sidebar section's collapsed state and persist it. */
function toggleSidebarSection(key) {
  const current = localStorage.getItem('sidebarSection:' + key) === '1';
  localStorage.setItem('sidebarSection:' + key, current ? '0' : '1');
  const section = document.querySelector(`.sidebar__section[data-section="${CSS.escape(key)}"]`);
  if (section) {
    section.setAttribute('data-collapsed', String(!current));
    const title = section.querySelector('.sidebar__title');
    if (title) title.setAttribute('aria-expanded', String(current));
  }
}

function renderSidebar() {
  const roots = getRootTasks();
  // Sidebar counts must respect the active practice filter so that picking
  // Org Performance actually narrows the visible client list, health counts,
  // and critical count — not just the main content area (Glen 2026-04-16).
  const practiceTasks = currentFilter.practice
    ? tasks.filter(t => getTaskPractice(t) === currentFilter.practice)
    : tasks;
  const clients = currentFilter.practice
    ? [...new Set(practiceTasks.map(t => getTaskClient(t)).filter(Boolean))].sort()
    : getAllClients();
  const scopedForHealth = currentFilter.client
    ? practiceTasks.filter(t => getTaskClient(t) === currentFilter.client)
    : practiceTasks;
  const healthCounts = countByHealth(scopedForHealth);

  let html = '';
  // Scoped users (client portal accounts) only see a restricted set of views
  const isScoped = !!(_currentUser && _currentUser.clientId);
  // Views
  const svgDashboard = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="3" rx="1"/><rect x="9" y="6" width="6" height="9" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/></svg>';
  const svgTasks = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M2 8h12M2 12h8"/><circle cx="13" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>';
  const svgReport = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="1" width="12" height="14" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h3"/></svg>';
  const svgPeople = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="5" r="2.5"/><path d="M1 14c0-3 2.5-5 5-5s5 2 5 5"/><circle cx="11.5" cy="4.5" r="2"/><path d="M15 13c0-2.5-1.8-4-3.5-4"/></svg>';
  const svgIncomplete = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1L1 14h14L8 1z"/><path d="M8 6v4M8 12v0.5" stroke-linecap="round"/></svg>';
  const svgFinances = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1v14M5 4c0-1 1.5-2 3-2s3 1 3 2-1.5 2-3 2-3 1-3 2 1.5 2 3 2 3-1 3-2"/></svg>';
  const svgSettings = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4"/></svg>';

  html += sidebarSectionOpen('views', 'Views');
  html += sidebarItem(svgDashboard, 'Portfolio', '', () => switchView('dashboard'), currentView==='dashboard');
  // html += sidebarItem(svgReport, 'Report', '', () => switchView('report'), currentView==='report'); // COMMENTED OUT — old report view, kept for revert
  html += sidebarItem(svgTasks, 'Projects', scopedForHealth.length, () => { currentFilter.priority = []; switchView('tasks'); }, currentView==='tasks');
  html += sidebarItem(svgPeople, 'People', '', () => switchView('people'), currentView==='people');
  const svgLeads = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2h12v3H2zM4 5h8v3H4zM6 8h4v3H6zM7 11h2v3H7z"/></svg>';
  if (!isScoped && hasPageAccess('leads')) {
    html += sidebarItem(svgLeads, 'Leads', '', () => switchView('leads'), currentView==='leads');
  }
  const svgHiring = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="5" r="2.5"/><path d="M1 14c0-3 2.5-5 5-5 1.3 0 2.5.4 3.4 1.1"/><circle cx="12" cy="11" r="3"/><path d="M12 9.5v3M10.5 11h3"/></svg>';
  if (!isScoped) {
    const hiringActiveCount = (_candidatesData || []).filter(c => !c.archived_at).length;
    html += sidebarItem(svgHiring, 'Hiring', hiringActiveCount || '', () => switchView('hiring'), currentView==='hiring');
  }
  if (!isScoped && hasPageAccess('finances')) {
    html += sidebarItem(svgFinances, 'Finances', '', () => switchView('finances'), currentView==='finances');
  }
  const svgExpenses = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 6h12M5 9h3M5 11h2"/></svg>';
  if (!isScoped && hasPageAccess('expenses')) {
    html += sidebarItem(svgExpenses, 'Expenses', '', () => switchView('expenses'), currentView==='expenses');
  }
  const svgBugs = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="9" r="4"/><path d="M6 5.5C6 4.1 6.9 3 8 3s2 1.1 2 2.5M1 7h3M12 7h3M2 12l2.5-1.5M14 12l-2.5-1.5M4 5L2 3.5M12 5l2-1.5"/></svg>';
  {
    const bugOpenCount = ((_bugReportsData && _bugReportsData.reports) || []).filter(r => r.status === 'open' || r.status === 'in_progress').length;
    html += sidebarItem(svgBugs, 'Bug Tracker', bugOpenCount || '', () => switchView('bugs'), currentView==='bugs');
  }
  html += sidebarItem(svgSettings, 'Settings', '', () => switchView('settings'), currentView==='settings');
  html += sidebarSectionClose();

  // My Tasks shortcut
  const myName = _currentUser?.displayName || '';
  if (myName) {
    const myActiveTasks = practiceTasks.filter(t => t.assignees?.some(a => a === myName) && t.status !== 'Done' && t.status !== 'Cancelled');
    const svgMyTasks = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>';
    html += sidebarSectionOpen('mywork', 'My Work');
    html += sidebarItem(svgMyTasks, 'My Work', myActiveTasks.length, () => switchView('mytasks'), currentView === 'mytasks');
    html += sidebarSectionClose();
  }

  // Clients
  html += sidebarSectionOpen('clients', 'Clients');
  if (!isScoped) {
    // Internal users see NBI Portfolio (all clients) option
    const portfolioActive = !currentFilter.client;
    html += `<button class="sidebar__item ${portfolioActive?'active':''}"${portfolioActive?' aria-current="page"':''} aria-label="NBI Portfolio, ${practiceTasks.length} items" data-action="filterByClient" data-arg0="null"><span class="sidebar__dot" aria-hidden="true" style="background:var(--accent)"></span><span class="sidebar__item__abbrev" aria-hidden="true">NBI</span><span class="sidebar__item__label" style="font-weight:600">NBI Portfolio</span><span class="sidebar__item__count" aria-hidden="true">${practiceTasks.length}</span></button>`;
  }
  const sidebarClients = isScoped
    ? clients.filter(c => { const co = Object.values(_apiClientsCache).find(x => x.name === c); return co && co.id === _currentUser.clientId; })
    : clients;
  sidebarClients.forEach(c => {
    const count = practiceTasks.filter(t => getTaskClient(t) === c).length;
    const dotColour = stringToColour(c);
    const isActive = currentFilter.client===c;
    const abbrev = clientPrefix(c);
    html += `<button class="sidebar__item ${isActive?'active':''}"${isActive?' aria-current="page"':''} aria-label="${esc(c)}, ${count} items" data-action="filterByClient" data-arg0="${esc(c)}"><span class="sidebar__dot" aria-hidden="true" style="background:${dotColour}"></span><span class="sidebar__item__abbrev" aria-hidden="true">${esc(abbrev)}</span><span class="sidebar__item__label">${esc(c)}</span><span class="sidebar__item__count" aria-hidden="true">${count}</span></button>`;
  });
  html += sidebarSectionClose();

  // Practices section — internal users only (scoped users are already locked to one client)
  if (!isScoped) {
    // Practices (Phase 9, a6c82c8c). Counts span tasks + leads so users
    // see at a glance how much volume sits in each practice. The "All"
    // entry clears the filter rather than passing a value.
    html += sidebarSectionOpen('practices', 'Practices');
    const _leadList = (typeof _leadsData !== 'undefined' && _leadsData && _leadsData.leads) ? _leadsData.leads : [];
    const allPracticeCount = tasks.length + _leadList.length;
    const practiceAllActive = !currentFilter.practice;
    html += `<button class="sidebar__item ${practiceAllActive?'active':''}"${practiceAllActive?' aria-current="page"':''} aria-label="All practices, ${allPracticeCount} items" data-action="filterByPractice" data-arg0="null"><span class="sidebar__dot" aria-hidden="true" style="background:var(--accent)"></span><span class="sidebar__item__abbrev" aria-hidden="true">ALL</span><span class="sidebar__item__label" style="font-weight:600">All</span><span class="sidebar__item__count" aria-hidden="true">${allPracticeCount}</span></button>`;
    PRACTICES.forEach(p => {
      const tCount = tasks.filter(t => getTaskPractice(t) === p.value).length;
      const lCount = _leadList.filter(l => l.practice_area === p.value).length;
      const total = tCount + lCount;
      const isActive = currentFilter.practice===p.value;
      const abbrev = p.abbrev || p.label.slice(0, 2).toUpperCase();
      html += `<button class="sidebar__item ${isActive?'active':''}"${isActive?' aria-current="page"':''} aria-label="${esc(p.label)}, ${total} items" data-action="filterByPractice" data-arg0="${esc(p.value)}"><span class="sidebar__dot" aria-hidden="true" style="background:${p.colour}"></span><span class="sidebar__item__abbrev" aria-hidden="true">${esc(abbrev)}</span><span class="sidebar__item__label">${esc(p.label)}</span><span class="sidebar__item__count" aria-hidden="true">${total}</span></button>`;
    });
    html += sidebarSectionClose();
  }

  // Health
  html += sidebarSectionOpen('health', 'Health');
  HEALTH_STATES.forEach(h => {
    if (healthCounts[h] > 0) {
      const col = HEALTH_COLOURS_HEX[h] || '#666';
      const isActive = !!(currentFilter.health && currentFilter.health.includes(h));
      html += `<button class="sidebar__item ${isActive?'active':''}"${isActive?' aria-current="page"':''} aria-label="${esc(h)}, ${healthCounts[h]} items" data-action="filterByHealth" data-arg0="${esc(h)}"><span class="sidebar__dot" aria-hidden="true" style="background:${col}"></span><span class="sidebar__item__label">${esc(h)}</span><span class="sidebar__item__count" aria-hidden="true">${healthCounts[h]}</span></button>`;
    }
  });
  html += sidebarSectionClose();

  // Quick Filters
  html += sidebarSectionOpen('quickfilters', 'Quick Filters');
  const critPriorities = ['Critical ACT', 'Urgent', 'High'];
  const critCount = practiceTasks.filter(t => critPriorities.includes(t.priority)).length;
  html += sidebarItem('&#9888;', 'Critical / High', critCount, () => { currentFilter = { ...currentFilter, status: [], health: [], priority: critPriorities, client: null, project: null }; switchView('tasks'); renderAll(); }, false);
  html += sidebarSectionClose();

  document.getElementById('sidebarNav').innerHTML = html;
}

/** Generate HTML for a single sidebar navigation item with icon, label, and optional count badge.
 *  Active item gets aria-current="page" (a11y H5). Count badge gets an aria-label prefix so
 *  screen readers announce "Projects, 1123 items" instead of "Projects1123" (a11y H6). */
function sidebarItem(icon, label, count, onclick, active) {
  const id = 'si_' + label.replace(/\s/g,'');
  const ariaCurrent = active ? ' aria-current="page"' : '';
  const ariaLabel = count !== '' ? ` aria-label="${esc(label)}, ${esc(String(count))} items"` : ` aria-label="${esc(label)}"`;
  const countHtml = count !== '' ? `<span class="sidebar__item__count" aria-hidden="true">${count}</span>` : '';
  return `<button class="sidebar__item ${active?'active':''}" id="${id}"${ariaCurrent}${ariaLabel} title="${esc(label)}" onclick="(${onclick.toString()})()"><span class="sidebar__item__icon" aria-hidden="true">${icon}</span><span class="sidebar__item__label">${label}</span>${countHtml}</button>`;
}

/** Deterministically convert a string to an HSL colour -- used for client dot colours */
function stringToColour(str) {
  let hash = 0; for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 60%, 55%)`;
}


// ==================== MOBILE HEADER OVERFLOW MENU ====================
/** Toggle the mobile header overflow menu (three-dot menu for narrow screens) */
function toggleHeaderOverflow(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('headerOverflowMenu');
  menu.classList.toggle('open');
  // Sync user badge text
  const badge = document.getElementById('userBadge');
  const overflowBadge = document.getElementById('overflowUserBadge');
  if (badge && overflowBadge) overflowBadge.textContent = badge.textContent;
}
document.addEventListener('click', function(e) {
  const overflow = document.getElementById('headerOverflow');
  if (overflow && !overflow.contains(e.target)) {
    document.getElementById('headerOverflowMenu')?.classList.remove('open');
  }
});

// ==================== SIDEBAR COLLAPSE & MOBILE ====================

/** Toggle the sidebar between collapsed (icons only) and expanded states */
function toggleSidebarCollapse() {
  const sb = document.getElementById('sidebarEl');
  sb.classList.toggle('collapsed');
  const isCollapsed = sb.classList.contains('collapsed');
  localStorage.setItem('nbi_sidebar_collapsed', isCollapsed ? '1' : '');
  // Flip the toggle arrow
  const arrow = sb.querySelector('.sidebar__toggle svg');
  if (arrow) arrow.style.transform = isCollapsed ? 'rotate(180deg)' : '';
}
// Restore sidebar state on load
if (localStorage.getItem('nbi_sidebar_collapsed') === '1') {
  document.getElementById('sidebarEl')?.classList.add('collapsed');
  const arrow = document.querySelector('.sidebar__toggle svg');
  if (arrow) arrow.style.transform = 'rotate(180deg)';
}

/** Toggle the mobile sidebar overlay on small screens */
function toggleMobileSidebar() {
  const sb = document.getElementById('sidebarEl');
  const ov = document.getElementById('sidebarOverlay');
  sb.classList.toggle('mobile-open');
  ov.classList.toggle('open');
}

// Close sidebar after clicking a nav item on mobile
const origSwitchView = switchView;
switchView = function(view) {
  document.getElementById('sidebarEl').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  origSwitchView(view);
};

// ----- SEED DATA -----
// Seed data is now loaded from the server API (/api/seed-data) to avoid exposing
// sensitive business data (salaries, performance reviews, client strategies) in page source.
// The server serves it only to authenticated admin users.


/** Fetch seed data from server (admin only, called when DB has no tasks) */
async function fetchSeedData() {
  try {
    const data = await apiCall('/api/seed-data');
    if (data) return data.csv || null;
  } catch(e) {}
  return null;
}


// ===== KEYBOARD ACCESSIBILITY: delegated Enter/Space for clickable non-interactive elements =====
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target;
  const tag = (el.tagName || '').toLowerCase();
  // Skip native interactive elements (already keyboard-accessible)
  if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable) return;
  // Only act on elements with an onclick handler (inline or attribute) and cursor:pointer or role=button
  if (el.hasAttribute('onclick') || el.closest('[onclick]') === el) {
    e.preventDefault();
    el.click();
  }
});

// MutationObserver: auto-add tabindex and role to dynamically rendered clickable divs/spans
(function() {
  const processed = new WeakSet();
  function patchClickable(root) {
    root.querySelectorAll('div[onclick], span[onclick]').forEach(el => {
      if (processed.has(el)) return;
      processed.add(el);
      const tag = el.tagName.toLowerCase();
      if (tag === 'button' || tag === 'a') return;
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    });
  }
  // Patch on each render cycle via MutationObserver
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) patchClickable(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  // Initial pass
  patchClickable(document.body);
})();

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
  // Skip if typing in an input/select/textarea
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  // Skip if modal is open
  if (document.querySelector('.modal-overlay.open')) return;

  // Delete/Backspace removes a selected dependency arrow
  if ((e.key === 'Delete' || e.key === 'Backspace') && _ganttSelectedArrow) {
    e.preventDefault();
    const { fromId, toId } = _ganttSelectedArrow;
    const depTask = tasks.find(t => t.id === toId);
    const prereqTask = tasks.find(t => t.id === fromId);
    if (depTask && depTask.dependencies) {
      depTask.dependencies = depTask.dependencies.filter(d => d !== fromId);
      updateTask(toId, 'dependencies', depTask.dependencies);
    }
    toast(`Removed link: "${prereqTask?.title || '?'}" → "${depTask?.title || '?'}"`);
    _ganttSelectedArrow = null;
    return;
  }

  // Escape deselects arrow or exits link mode
  if (e.key === 'Escape' && _ganttSelectedArrow) {
    deselectGanttArrow();
    return;
  }
  if (e.key === 'Escape' && _ganttLinkMode) {
    _ganttLinkMode = false;
    _ganttLinkFrom = null;
    document.querySelectorAll('.gantt__bar.gantt-link-source').forEach(b => b.classList.remove('gantt-link-source'));
    const preview = document.getElementById('ganttLinkPreview');
    if (preview) preview.remove();
    renderContent();
    return;
  }

  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const search = document.querySelector('.search-input') || document.querySelector('input[placeholder*="Search"]');
    if (search) { search.focus(); search.select(); }
  }
  else if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
    // New task (if on tasks view)
    if (currentView === 'tasks') {
      const addBtn = document.querySelector('[onclick*="openNewTask"], [onclick*="addTask"]');
      if (addBtn) addBtn.click();
    }
  }
  else if (e.key === 'Escape') {
    // Close detail panel
    const panel = document.querySelector('.detail-panel.open');
    if (panel) { const close = panel.querySelector('.detail-panel__close'); if (close) close.click(); }
  }
  else if (e.key === '[') { toggleSidebarCollapse(); }
  // Status shortcuts (1-4) when a task detail is open
  else if (['1','2','3','4'].includes(e.key) && !e.ctrlKey && !e.metaKey && activeDetailTaskId) {
    const statusMap = { '1': 'Not started', '2': 'In progress', '3': 'In Review', '4': 'Done' };
    const newStatus = statusMap[e.key];
    if (newStatus) { updateTask(activeDetailTaskId, 'status', newStatus); }
  }
  // Navigation shortcuts
  else if (e.key === 'g' && !e.ctrlKey) {
    // Wait for next key
    const handler = function(e2) {
      document.removeEventListener('keydown', handler);
      if (e2.key === 'd') switchView('dashboard');
      else if (e2.key === 't') switchView('tasks');
      else if (e2.key === 'r') switchView('report');
      else if (e2.key === 'p') switchView('people');
      else if (e2.key === 'f') switchView('finances');
      else if (e2.key === 'l') switchView('leads');
      else if (e2.key === 'e') switchView('expenses');
      else if (e2.key === 's') switchView('settings');
      else if (e2.key === 'm') { currentFilter = { client: null, project: null, status: null, health: null, search: '', sort: 'default', assignee: _currentUser?.displayName || '' }; switchView('tasks'); }
    };
    document.addEventListener('keydown', handler, { once: true });
    // Cancel the chord if no second key within 1 second
    setTimeout(() => document.removeEventListener('keydown', handler), 1000);
  }
});

// ==================== WARNINGS & ALERTS SIDEBAR ====================
// Right-hand sidebar that surfaces task warnings (imminent, late, blocked)
// and the existing notification feed in two tabs. Trigger button is hidden
// unless there is at least one warning or unread alert.
let _warnAlertTab = 'warnings';
let _warnAlertSnoozedUntil = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem('nbi_warn_snoozed') || '{}');
    // Garbage collect expired snoozes on load so the map doesn't grow unboundedly
    const now = Date.now();
    const kept = {};
    for (const [id, until] of Object.entries(raw)) {
      if (new Date(until).getTime() > now) kept[id] = until;
    }
    if (Object.keys(kept).length !== Object.keys(raw).length) {
      localStorage.setItem('nbi_warn_snoozed', JSON.stringify(kept));
    }
    return kept;
  } catch (e) { return {}; }
})();

/** Compute the list of warnings derived from the user's tasks.
 *
 *  Ownership model (Glen 2026-04-15): warnings are user-specific and NOT
 *  role-gated. A user "owns" a task if they are listed in `assignees` on
 *  that task OR on any ancestor in the task hierarchy (root project,
 *  intermediate feature, etc.). This lets PMs who own a project see
 *  warnings for every task under it without needing to be listed on
 *  each child, while keeping individual contributors scoped to the work
 *  they're actually responsible for.
 *
 *  Admins get NO special treatment — they see the same warnings as any
 *  other user based purely on ownership. This is deliberate: admins
 *  should see a quiet, personalised panel when nothing they own is on
 *  fire, not a firehose of every late task across the whole company.
 */
function computeWarnings() {
  if (!Array.isArray(tasks)) return [];
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const myName = (_currentUser && (_currentUser.displayName || _currentUser.display_name)) || '';
  if (!myName) return [];
  const warnings = [];

  // Pre-compute a set of ancestor-assignee ownership by walking each task's
  // parent chain once. Cache the per-root result so we don't walk the chain
  // for every single task on every computeWarnings() call.
  const _ownedCache = {};
  const _ownsViaAncestor = (task) => {
    // Walk up parent chain collecting every assignee list
    let cur = task;
    let guard = 0;
    while (cur && guard < 20) {
      if (cur.id && _ownedCache[cur.id] !== undefined) return _ownedCache[cur.id];
      if (Array.isArray(cur.assignees) && cur.assignees.includes(myName)) {
        if (cur.id) _ownedCache[cur.id] = true;
        return true;
      }
      if (!cur.parentId) break;
      cur = tasks.find(t => t.id === cur.parentId);
      guard++;
    }
    if (task && task.id) _ownedCache[task.id] = false;
    return false;
  };

  tasks.forEach(t => {
    if (!t || t.status === 'Done' || t.status === 'Cancelled') return;
    // Fast path: direct assignment
    const isAssigned = Array.isArray(t.assignees) && t.assignees.includes(myName);
    // Slow path: owns an ancestor (PM owns the project, warning fires on a child task)
    const ownsHierarchy = isAssigned || _ownsViaAncestor(t);
    if (!ownsHierarchy) return;

    // Skip snoozed items
    const snoozeUntil = _warnAlertSnoozedUntil[t.id];
    if (snoozeUntil && new Date(snoozeUntil) > new Date()) return;

    let warning = null;

    // Late / imminent tasks (require a due date)
    if (t.dueDate) {
      const due = safeParseDate(t.dueDate);
      if (due) {
        due.setHours(0, 0, 0, 0);
        const oneDay = 1000 * 60 * 60 * 24;
        const daysLate = Math.floor((now - due) / oneDay);
        const daysUntil = Math.floor((due - now) / oneDay);
        if (daysLate > 7) {
          warning = { severity: 'critical', type: 'late', label: daysLate + ' days late' };
        } else if (daysLate > 2) {
          warning = { severity: 'high', type: 'late', label: daysLate + ' days late' };
        } else if (daysLate >= 1) {
          warning = { severity: 'medium', type: 'late', label: daysLate + ' day' + (daysLate === 1 ? '' : 's') + ' late' };
        } else if (daysLate === 0) {
          warning = { severity: 'medium', type: 'imminent', label: 'Due today' };
        } else if (daysUntil <= 3) {
          warning = {
            severity: daysUntil <= 1 ? 'high' : 'medium',
            type: 'imminent',
            label: 'Due in ' + daysUntil + ' day' + (daysUntil === 1 ? '' : 's')
          };
        }
      }
    }

    // Blocked tasks always count as a warning, even if not late
    if (!warning && t.status === 'Blocked') {
      warning = { severity: 'high', type: 'blocked', label: 'Blocked' };
    }

    // Missing fields on directly-assigned active tasks
    if (!warning && isAssigned) {
      if (t.status === 'In progress' && (!t.dueDate || t.dueDate === '')) {
        warning = { severity: 'medium', type: 'missing_field', label: 'No due date set' };
      } else if ((t.status === 'In progress' || t.status === 'Not started') &&
                 (!Array.isArray(t.assignees) || t.assignees.length === 0)) {
        warning = { severity: 'medium', type: 'missing_field', label: 'No assignee' };
      }
    }

    if (warning) {
      warnings.push({
        id: t.id,
        title: t.title || 'Untitled',
        client: getTaskClient(t),
        dueDate: t.dueDate,
        severity: warning.severity,
        type: warning.type,
        label: warning.label
      });
    }
  });

  // Sort: critical > high > medium > low, then earliest due date first
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  warnings.sort((a, b) => {
    const sev = (order[a.severity] || 9) - (order[b.severity] || 9);
    if (sev !== 0) return sev;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return warnings;
}

/** Update the header Alerts button badge and flash state */
function updateWarnAlertButton() {
  const btn = document.getElementById('headerAlertsBtn');
  const badge = document.getElementById('headerAlertsBadge');
  if (!btn || !badge) return;

  const warnings = typeof computeWarnings === 'function' ? computeWarnings().length : 0;
  const alertCount = window._lastNotificationCount || 0;
  const total = warnings + alertCount;

  if (total > 0) {
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.style.display = 'inline-block';
    btn.classList.add('header-alerts-btn--active');
  } else {
    badge.style.display = 'none';
    btn.classList.remove('header-alerts-btn--active');
  }

  // If panel is open, also refresh the body
  const panel = document.getElementById('warnAlertPanel');
  if (panel && panel.classList.contains('open')) renderWarnAlertContent();
}

/** Toggle the right-hand sidebar panel open or closed. */
function toggleWarnAlertSidebar() {
  const panel = document.getElementById('warnAlertPanel');
  if (!panel) return;
  const open = panel.classList.contains('open');
  if (open) {
    panel.classList.remove('open');
  } else {
    renderWarnAlertContent();
    panel.classList.add('open');
  }
}

/** Switch the active tab inside the warnings/alerts sidebar. */
function switchWarnAlertTab(tab) {
  _warnAlertTab = tab;
  document.querySelectorAll('.warn-alert-panel__tab').forEach(el => {
    el.classList.toggle('warn-alert-panel__tab--active', el.getAttribute('data-tab') === tab);
  });
  renderWarnAlertContent();
}

/** Render the body of the active sidebar tab. */
async function renderWarnAlertContent() {
  const list = document.getElementById('warnAlertList');
  if (!list) return;

  const warnTabCount = document.getElementById('warnTabCount');

  // Always update the warnings tab count, regardless of which tab is active
  const warnings = computeWarnings();
  if (warnTabCount) warnTabCount.textContent = warnings.length > 0 ? String(warnings.length) : '';

  if (_warnAlertTab === 'warnings') {
    // Fetch verify-match items from the server alongside the computed warnings
    let verifyMatches = [];
    try {
      verifyMatches = await apiCall('/api/attachments/verify-matches') || [];
    } catch (e) { /* non-fatal */ }

    if (warnings.length === 0 && verifyMatches.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:0.82rem">No warnings. Nice work.</div>';
      return;
    }
    // Update badge to include verify-match count
    const totalWarnCount = warnings.length + verifyMatches.length;
    if (warnTabCount) warnTabCount.textContent = totalWarnCount > 0 ? String(totalWarnCount) : '';

    const taskWarningsHtml = warnings.map(w => `
      <div class="warn-item warn-item--${w.severity}">
        <button type="button" class="warn-item__main" aria-label="${esc(w.severity.toUpperCase())}: ${esc(w.title)}${w.client ? ' for ' + esc(w.client) : ''}" data-action="_actOpenOverlayAndClose" data-arg0="${esc(w.id)}">
          <div class="warn-item__header">
            <div class="warn-item__title">${esc(w.title)}</div>
            <span class="warn-item__sev warn-item__sev--${w.severity}" aria-hidden="true">${esc(w.severity.toUpperCase())}</span>
          </div>
          <div class="warn-item__meta">${w.client ? esc(w.client) + ' &middot; ' : ''}${esc(w.label)}</div>
        </button>
        <div class="warn-item__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-action="snoozeWarning" data-arg0="${esc(w.id)}" data-arg1="24">Snooze 1 day</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="snoozeWarning" data-arg0="${esc(w.id)}" data-arg1="168">Snooze 1 week</button>
        </div>
      </div>
    `).join('');

    const verifyMatchHtml = verifyMatches.length === 0 ? '' :
      `<div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;padding:8px 12px 4px;margin-top:${warnings.length > 0 ? '8px' : '0'}">Email attachments needing verification (${verifyMatches.length})</div>` +
      verifyMatches.map(m => {
        const label = m.entity_name ? esc(m.entity_name) : (m.entity_type + ' attachment');
        const fileName = m.original_name ? esc(m.original_name) : 'Untitled';
        return `<div class="warn-item warn-item--medium">
          <div class="warn-item__main" style="cursor:default">
            <div class="warn-item__header">
              <div class="warn-item__title">${fileName}</div>
              <span class="warn-item__sev warn-item__sev--medium" aria-hidden="true">VERIFY</span>
            </div>
            <div class="warn-item__meta">Matched to: ${label} &middot; Auto-matched from email</div>
          </div>
          <div class="warn-item__actions">
            <button type="button" class="btn btn--ghost btn--sm" data-action="_actShowVerifyAndClose" data-arg0="${esc(m.id)}" data-arg1="${esc(m.entity_type)}" data-arg2="${esc(m.entity_id)}" data-arg3="warn-verify-${esc(m.id)}">Verify</button>
          </div>
        </div>`;
      }).join('');

    list.innerHTML = taskWarningsHtml + verifyMatchHtml;
  } else if (_warnAlertTab === 'notifications') {
    // Notifications tab — chronological notification feed
    list.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:24px;font-size:0.82rem">Loading...</div>';
    try {
      const result = await apiCall('/api/notifications');
      const notifications = (result && result.notifications) || [];
      const unread = notifications.filter(n => !n.is_read).length;
      window._lastNotificationCount = unread;
      const notifCount = document.getElementById('notifTabCount');
      if (notifCount) notifCount.textContent = unread > 0 ? String(unread) : '';
      if (notifications.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;padding:16px;text-align:center">No notifications</div>';
        return;
      }
      list.innerHTML = '<div style="padding:4px 12px 4px;display:flex;justify-content:flex-end"><button class="btn btn--sm" data-action="markAllNotificationsRead" style="font-size:0.65rem;padding:2px 6px">Mark all read</button></div>' + notifications.slice(0, 50).map(n => {
        const ago = timeAgo(new Date(n.created_at));
        const isPersistent = n.dismissable === false;
        const readStyle = n.is_read && !isPersistent ? 'opacity:0.5' : '';
        const persistBadge = isPersistent && !n.is_read ? '<span style="display:inline-block;font-size:0.6rem;padding:1px 5px;border-radius:3px;background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);margin-left:6px">Action required</span>' : '';
        const bgStyle = isPersistent && !n.is_read ? 'background:color-mix(in srgb, var(--danger) 6%, var(--bg-surface));border-left:3px solid var(--danger);' : '';
        return `<div style="padding:8px 12px;border-bottom:1px solid var(--border-subtle);font-size:0.78rem;${readStyle};${bgStyle};cursor:pointer" data-action="handleNotificationClick" data-arg0="${esc(n.link || '')}" data-arg1="${esc(n.id || '')}">
          <div style="font-weight:${n.is_read && !isPersistent ? '400' : '600'};color:var(--text-primary)">${esc(n.title)}${persistBadge}</div>
          <div style="color:var(--text-muted);font-size:0.68rem;margin-top:2px">${esc(n.message)} &middot; ${ago}</div>
        </div>`;
      }).join('');
    } catch (e) {
      list.innerHTML = '<div style="color:var(--danger);font-size:0.82rem;padding:12px">Failed to load notifications.</div>';
    }
  }
}

/** Snooze a warning for N hours (persisted to localStorage). */
function snoozeWarning(taskId, hours) {
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  _warnAlertSnoozedUntil[taskId] = until;
  try { localStorage.setItem('nbi_warn_snoozed', JSON.stringify(_warnAlertSnoozedUntil)); } catch (e) {}
  if (typeof toast === 'function') {
    toast('Snoozed for ' + (hours < 24 ? hours + 'h' : (hours / 24) + 'd'));
  }
  renderWarnAlertContent();
  updateWarnAlertButton();
}

// Close the sidebar with Escape and refresh once tasks are loaded
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  const panel = document.getElementById('warnAlertPanel');
  if (panel && panel.classList.contains('open')) {
    panel.classList.remove('open');
  }
});

// Patch renderAll so the trigger button stays current after every render.
// router.js is a module and runs after the inline script, so we defer the
// wrap until after DOMContentLoaded when window.renderAll is guaranteed set.
document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.renderAll !== 'function') return;
  const _origRA = window.renderAll;
  window.renderAll = function() {
    const r = _origRA.apply(this, arguments);
    try { updateWarnAlertButton(); } catch (e) {}
    return r;
  };
});

// Refresh the button once a minute so newly-imminent tasks surface promptly
setInterval(function() { try { updateWarnAlertButton(); } catch (e) {} }, 60000);

// Initial paint after the page settles (tasks may load asynchronously)
setTimeout(function() { try { updateWarnAlertButton(); } catch (e) {} }, 1500);


// ===== WINDOW REGISTRATIONS =====
window.renderSidebar = renderSidebar;
window.toggleSidebarCollapse = toggleSidebarCollapse;
window.toggleMobileSidebar = toggleMobileSidebar;
window.toggleHeaderOverflow = toggleHeaderOverflow;
window.toggleSidebarSection = toggleSidebarSection;
window.toggleWarnAlertSidebar = toggleWarnAlertSidebar;
window.updateWarnAlertButton = updateWarnAlertButton;
window.renderWarnAlertContent = renderWarnAlertContent;
// snoozeWarnings/unsnoozeWarnings/dismissWarning were never extracted from the monolith

// ===== REGISTER SHELL CALLBACK =====
registerShellCallback("sidebar", renderSidebar);
