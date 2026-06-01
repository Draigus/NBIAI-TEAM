// router.js — Routing, navigation, and shell rendering extracted from the monolith
// All state accessed via window. (inline script vars declared with var ARE on window)

// ==================== VIEW REGISTRY ====================

const viewRenderers = {};
export function registerView(name, renderFn) {
  viewRenderers[name] = renderFn;
}
window.registerView = registerView;

const shellCallbacks = {};
export function registerShellCallback(name, fn) {
  shellCallbacks[name] = fn;
}
window.registerShellCallback = registerShellCallback;

// ==================== TABS ====================

/** Render the main tab bar, filtering out tabs the current user lacks permission to see */
export function renderTabs() {
  const tabs = ['dashboard', 'tasks', 'workload', 'people', 'leads', 'expenses', 'finances', 'news', 'settings'];
  const labels = { dashboard: 'Portfolio', tasks: 'Projects', workload: 'Workload', report: 'Report', people: 'People', leads: 'Leads', expenses: 'Expenses', finances: 'Finances', news: 'News', settings: 'Settings' };
  // Filter tabs based on permissions
  const visibleTabs = tabs.filter(t => {
    if (t === 'finances' || t === 'leads' || t === 'expenses') return window.hasPageAccess(t);
    return true;
  });
  document.getElementById('mainTabs').setAttribute('role', 'tablist');
  document.getElementById('mainTabs').innerHTML = visibleTabs.map(t => `<div class="main__tab ${window.currentView===t?'active':''}" data-action="switchView" data-arg0="${t}" role="tab" aria-selected="${window.currentView===t}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.switchView('${t}')}">${labels[t]}</div>`).join('');
  checkTabOverflow();
}
window.renderTabs = renderTabs;

/** Detect if the tab bar is overflowing and show scroll fade indicator */
export function checkTabOverflow() {
  const tabs = document.getElementById('mainTabs');
  if (tabs) tabs.classList.toggle('has-overflow', tabs.scrollWidth > tabs.clientWidth);
}
window.checkTabOverflow = checkTabOverflow;

// ==================== LEGACY ROUTES ====================

/** Legacy hash route redirects — map removed views to their replacements */
export const LEGACY_ROUTES = { incomplete: 'tasks', changelog: 'settings', report: 'dashboard' };
window.LEGACY_ROUTES = LEGACY_ROUTES;

// ==================== NAVIGATION ====================

/** Switch to a different view and push a history state for browser back/forward */
export function switchView(view) {
  if (LEGACY_ROUTES[view]) view = LEGACY_ROUTES[view];
  const prev = window.currentView;
  window.currentView = view;
  // Re-collapse the tree when entering the Projects page from a different view
  if (view === 'tasks' && prev !== 'tasks') { window._tasksInitialCollapse = true; }
  if (prev !== view) { history.pushState({ view, filter: { ...window.currentFilter }, taskSubView: window.taskSubView }, '', '#' + view); }
  renderAll();
}
window.switchView = switchView;

// popstate — browser back/forward button support
window.addEventListener('popstate', e => {
  if (e.state && e.state.view) {
    window.currentView = LEGACY_ROUTES[e.state.view] || e.state.view;
    if (e.state.filter) {
      window.currentFilter = e.state.filter;
      // Migrate old single-value filters from browser history to arrays
      if (window.currentFilter.status && typeof window.currentFilter.status === 'string') window.currentFilter.status = [window.currentFilter.status];
      if (window.currentFilter.health && typeof window.currentFilter.health === 'string') window.currentFilter.health = [window.currentFilter.health];
      if (window.currentFilter.assignee && typeof window.currentFilter.assignee === 'string') window.currentFilter.assignee = [window.currentFilter.assignee];
      if (!Array.isArray(window.currentFilter.status)) window.currentFilter.status = [];
      if (!Array.isArray(window.currentFilter.health)) window.currentFilter.health = [];
      if (!Array.isArray(window.currentFilter.assignee)) window.currentFilter.assignee = [];
    }
    window.taskSubView = e.state.taskSubView || 'tree';
    renderAll();
  }
});

// Restore view from URL hash on page load (supports deep-linking e.g. #bugs, #leads, #interview/uuid)
(function() {
  const h = window.location.hash.replace('#', '');
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks','workload','hiring'];
  if (h && known.includes(h)) { window.currentView = LEGACY_ROUTES[h] || h; }
  else if (h && h.startsWith('interview/')) { window.currentView = 'interview'; }
  if (!window.currentView) window.currentView = 'dashboard';
})();

// Set initial history state
history.replaceState({ view: window.currentView, filter: { ...window.currentFilter }, taskSubView: window.taskSubView }, '', '#' + window.currentView);

// ==================== FILTERS ====================

/** Clear all active filters except sort order, and deselect any bulk-selected tasks */
export function resetFilters() {
  window.currentFilter = { client: null, project: null, status: [], health: [], search: '', sort: window.currentFilter.sort || 'default', assignee: [], incomplete: false, practice: window.currentFilter.practice || null };
  window.selectedTaskIds.clear();
}
window.resetFilters = resetFilters;

/** Set the client filter and re-render -- pass null to show all clients */
export function filterByClient(c) {
  if (window.isClientUser()) return;
  window.currentFilter = { client: c, project: null, status: [], health: [], assignee: [], search: '', sort: window.currentFilter.sort || 'default', practice: window.currentFilter.practice || null };
  window.selectedTaskIds.clear();
  renderSidebarCounts();
  renderContent();
  renderBreadcrumbs();
  history.replaceState({ view: window.currentView, filter: { ...window.currentFilter }, taskSubView: window.taskSubView }, '', '#' + window.currentView);
}
window.filterByClient = filterByClient;

// ==================== PRACTICES ====================

// Practice areas (Phase 9 of the NBI WorkSage backlog, a6c82c8c).
// Stored as `practice_area` on tasks/leads/clients. The legacy "Human
// Capital" / HC label has been retired in favour of "Organisational"
// (closes 9a10d8d1) — Glen's call: HC is one piece of organisational
// performance, not the umbrella. The dot colours match the sidebar
// styling for consistency.
// G2 / decision D84: exactly two practices, with "general" removed.
// Slug is stored in the DB; label is shown in the full sidebar; abbrev is
// shown in the collapsed sidebar. shortLabel is the terser display name
// Glen specified ("Org Perf") for space-constrained UIs.
export const PRACTICES = [
  { value: 'gaming',                label: 'Gaming',                shortLabel: 'Gaming',    abbrev: 'GM', colour: '#22c1c3' },
  { value: 'organisational_performance', label: 'Organizational Performance', shortLabel: 'Org Perf', abbrev: 'OP', colour: '#7c5cff' },
];
window.PRACTICES = PRACTICES;

export function getPracticeLabel(value) {
  const p = PRACTICES.find(x => x.value === value);
  return p ? p.label : value || '';
}
window.getPracticeLabel = getPracticeLabel;

/** Toggle the practice-area filter that scopes the entire workspace
 *  (dashboard, projects, leads, clients) to a single practice. Pass null
 *  to clear and show All. */
export function filterByPractice(p) {
  window.currentFilter = { ...window.currentFilter, practice: p };
  window.selectedTaskIds.clear();
  renderSidebarCounts();
  renderContent();
  renderBreadcrumbs();
  // Re-render leads/clients views if they're active so the practice
  // filter takes effect across every page that displays records.
  if (window.currentView === 'leads') { try { window.renderLeadsContent(); } catch(e) {} }
  history.replaceState({ view: window.currentView, filter: { ...window.currentFilter }, taskSubView: window.taskSubView }, '', '#' + window.currentView);
}
window.filterByPractice = filterByPractice;

/** Filter by health state and switch to tasks view */
export function filterByHealth(h) {
  window.currentFilter = { client: window.currentFilter.client, project: null, status: [], health: [h], assignee: [], search: '', practice: window.currentFilter.practice || null };
  switchView('tasks');
}
window.filterByHealth = filterByHealth;

/** Filter to a specific project, switch to tree view, and scroll to the project row */
export function filterByProject(projectId) {
  window.currentFilter = { client: window.currentFilter.client, project: projectId, status: [], health: [], search: '', sort: 'default', assignee: [], incomplete: false, practice: window.currentFilter.practice || null };
  window.taskSubView = 'tree';
  // Ensure the project is expanded in the tree
  if (typeof window.collapsedTaskIds !== 'undefined') window.collapsedTaskIds.delete(projectId);
  switchView('tasks');
  // Scroll to the project row after render
  setTimeout(() => {
    const row = document.querySelector(`[data-task-id="${projectId}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}
window.filterByProject = filterByProject;

// ==================== BREADCRUMBS ====================

/** Render breadcrumb bar showing active filters */
export function renderBreadcrumbs() {
  const bar = document.getElementById('breadcrumbBar');
  if (!bar) return;
  const hasFilter = window.currentFilter.client || window.currentFilter.practice || (window.currentFilter.assignee && window.currentFilter.assignee.length > 0) || (window.currentFilter.health && window.currentFilter.health.length > 0) || (window.currentFilter.status && window.currentFilter.status.length > 0) || window.currentFilter.incomplete || window.currentFilter.project;
  if (!hasFilter) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  let html = '<span style="font-size:0.72rem;color:var(--text-muted);margin-right:4px">Filtered:</span>';
  if (window.currentFilter.practice) html += `<span class="filter-chip">Practice: ${window.esc(getPracticeLabel(window.currentFilter.practice))} <button data-action="filterByPractice" data-arg0="null">&times;</button></span>`;
  if (window.currentFilter.client) html += `<span class="filter-chip">${window.esc(window.currentFilter.client)} <button data-action="_actClearFilterClientBreadcrumb">&times;</button></span>`;
  if (window.currentFilter.assignee && window.currentFilter.assignee.length > 0) html += `<span class="filter-chip">${window.currentFilter.assignee.map(a => window.esc(a)).join(', ')} <button data-action="_actClearFilterAssigneeBreadcrumb">&times;</button></span>`;
  if (window.currentFilter.health && window.currentFilter.health.length > 0) html += `<span class="filter-chip">${window.currentFilter.health.map(h => window.esc(h)).join(', ')} <button data-action="_actClearFilterHealthBreadcrumb">&times;</button></span>`;
  if (window.currentFilter.status && window.currentFilter.status.length > 0) html += `<span class="filter-chip">${window.currentFilter.status.map(s => window.esc(s)).join(', ')} <button data-action="_actClearFilterStatusBreadcrumb">&times;</button></span>`;
  if (window.currentFilter.project) { const pt = window.tasks.find(t => t.id === window.currentFilter.project); html += `<span class="filter-chip">${window.esc(pt ? pt.title : 'Project')} <button data-action="_actClearFilterProjectBreadcrumb">&times;</button></span>`; }
  if (window.currentFilter.incomplete) html += `<span class="filter-chip">Incomplete only <button data-action="_actClearFilterIncompleteBreadcrumb">&times;</button></span>`;
  html += `<button class="filter-chip-clear" data-action="_actResetFiltersBreadcrumb">Clear all</button>`;
  bar.innerHTML = html;
}
window.renderBreadcrumbs = renderBreadcrumbs;

// ==================== CONTENT RENDERING ====================

function _renderMainContent(content) {
  if (window.currentView === 'incomplete') { window.currentView = 'tasks'; window.currentFilter.incomplete = true; }
  if (window.currentView === 'changelog') { window.currentView = 'settings'; }
  if (window.tasks.length === 0 && window.currentView !== 'settings') {
    content.innerHTML = `<div class="empty-state"><div class="empty-state__icon">&#128203;</div><div class="empty-state__title">No Tasks Yet</div><div class="empty-state__desc">Import tasks or add them manually to get started.</div><button class="btn btn--primary" data-action="openImportModal">Import</button></div>`;
    return;
  }
  const renderer = viewRenderers[window.currentView];
  if (renderer) {
    renderer(content);
  } else {
    // Fallback for views not yet extracted to modules
    const fallback = window['_renderMainContent_fallback'];
    if (typeof fallback === 'function') fallback(content);
  }
  if (window.currentView === 'tasks' && window.taskSubView === 'gantt') {
    requestAnimationFrame(window.drawGanttArrows);
  }
}

/** Re-render only the main content area (not sidebar/tabs). Preserves scroll position. */
export function renderContent() {
  const _perfStart = performance.now();
  const content = document.getElementById('mainContent');
  if (!content) return;
  const savedScroll = content.scrollTop;
  _renderMainContent(content);
  requestAnimationFrame(() => { content.scrollTop = savedScroll; });
  const _perfEnd = performance.now();
  if (_perfEnd - _perfStart > 100) {
    console.debug('[Perf] renderContent took ' + Math.round(_perfEnd - _perfStart) + 'ms');
  }
}
window.renderContent = renderContent;

/** Re-render sidebar counts without rebuilding the whole page */
export function renderSidebarCounts() {
  shellCallbacks.sidebar ? shellCallbacks.sidebar() : window.renderSidebar?.();
}
window.renderSidebarCounts = renderSidebarCounts;

/** Re-render the entire UI: sidebar, tabs, breadcrumbs, and the active view. */
export function renderAll() {
  const _perfStart = performance.now();
  shellCallbacks.sidebar ? shellCallbacks.sidebar() : window.renderSidebar?.();
  renderTabs();
  renderBreadcrumbs();
  const content = document.getElementById('mainContent');
  _renderMainContent(content);
  const _perfEnd = performance.now();
  if (_perfEnd - _perfStart > 100) {
    console.debug('[Perf] renderAll took ' + Math.round(_perfEnd - _perfStart) + 'ms');
  }
}
window.renderAll = renderAll;
