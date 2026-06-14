// ==================== THEMES ====================

const THEMES = [
  { id: 'dark',      label: 'Dark',      group: 'default', swatches: ['#0a0a0a','#e8e8e8','#0066FF','#2a2a2a'] },
  { id: 'light',     label: 'Light',     group: 'default', swatches: ['#f5f5f7','#1a1a1a','#0055dd','#d1d1d6'] },
  { id: 'midnight',  label: 'Midnight',  group: 'extra',   swatches: ['#0f172a','#e2e8f0','#38bdf8','#2d4a6f'] },
  { id: 'nord',      label: 'Nord',      group: 'extra',   swatches: ['#2e3440','#eceff4','#88c0d0','#4c566a'] },
  { id: 'solarized', label: 'Solarized', group: 'extra',   swatches: ['#002b36','#fdf6e3','#b58900','#1a5c6e'] },
  { id: 'dracula',   label: 'Dracula',   group: 'extra',   swatches: ['#282a36','#f8f8f2','#bd93f9','#44475a'] },
  { id: 'emerald',   label: 'Emerald',   group: 'extra',   swatches: ['#0c1a0f','#e0f0e4','#34d399','#264d33'] },
  { id: 'command',   label: 'Command',   group: 'extra',   swatches: ['#1c1f24','#e8ecf1','#00d4ff','rgba(255,255,255,0.08)'] },
];

/** Get the currently active theme name from the HTML element's data attribute */
function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }

/** Render the theme selector dropdown with colour preview dots */
function renderThemeDropdown() {
  const dd = document.getElementById('themeDropdown');
  if (!dd) return;
  const cur = currentTheme();
  let html = '<div class="theme-picker__label">Standard</div>';
  THEMES.filter(t => t.group === 'default').forEach(t => {
    html += `<div class="theme-picker__item ${cur===t.id?'active':''}" data-action="setTheme" data-arg0="${t.id}">
      <span>${t.label}</span>
      <span class="theme-picker__swatches">${t.swatches.map(c => `<span class="theme-picker__swatch" style="background:${c}"></span>`).join('')}</span>
    </div>`;
  });
  html += '<div class="theme-picker__sep"></div><div class="theme-picker__label">Colour Themes</div>';
  THEMES.filter(t => t.group === 'extra').forEach(t => {
    html += `<div class="theme-picker__item ${cur===t.id?'active':''}" data-action="setTheme" data-arg0="${t.id}">
      <span>${t.label}</span>
      <span class="theme-picker__swatches">${t.swatches.map(c => `<span class="theme-picker__swatch" style="background:${c}"></span>`).join('')}</span>
    </div>`;
  });
  dd.innerHTML = html;
}

/** Toggle the theme dropdown open/closed */
function toggleThemeDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('themeDropdown');
  const isOpen = dd.classList.contains('open');
  // Close all other panels first
  const _np = document.getElementById('notifPanel'); if (_np) _np.style.display = 'none';
  if (isOpen) { dd.classList.remove('open'); }
  else { renderThemeDropdown(); dd.classList.add('open'); }
}

/** Apply a theme by name and persist the choice to localStorage */
const _commandBgs = ['/public/images/command-bg1.jpg','/public/images/command-bg2.png','/public/images/command-bg3.jpg','/public/images/command-bg4.jpg','/public/images/command-bg5.jpg','/public/images/command-bg6.jpg'];
let _commandBgIdx = Math.floor(Math.random() * _commandBgs.length);
let _commandBgTimer = null;

function _applyCommandBg() {
  document.body.style.setProperty('--command-bg', `url("${_commandBgs[_commandBgIdx]}")`);
}

function _startCommandBgRotation() {
  if (_commandBgTimer) return;
  _applyCommandBg();
  _commandBgTimer = setInterval(() => {
    _commandBgIdx = (_commandBgIdx + 1) % _commandBgs.length;
    _applyCommandBg();
  }, 15 * 60 * 1000);
}

function _stopCommandBgRotation() {
  if (_commandBgTimer) { clearInterval(_commandBgTimer); _commandBgTimer = null; }
}

function setTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('nbi_dashboard_theme', name);
  document.getElementById('themeDropdown').classList.remove('open');
  renderThemeDropdown();
  if (name === 'command') _startCommandBgRotation();
  else _stopCommandBgRotation();
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

// Close theme dropdown on outside click
document.addEventListener('click', function(e) {
  const picker = document.getElementById('themePicker');
  if (picker && !picker.contains(e.target)) {
    document.getElementById('themeDropdown').classList.remove('open');
  }
});

// Load saved theme
(function() {
  const saved = localStorage.getItem('nbi_dashboard_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  if (saved === 'command') _startCommandBgRotation();
})();

// ----- MOBILE SIDEBAR -----
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

// ----- INIT -----
(async function init() {
  // Check if we have a valid session cookie by calling auth/me
  try {
    const resp = await fetch('/api/auth/me', { credentials: 'include' });
    if (resp.ok) {
      const data = await resp.json();
      _currentUser = data.user;
      if (checkForcePasswordChange()) return;
      showApp();
      await openIDB();
      await Promise.all([load(), loadTeamMembers(), loadPagePermissions(), loadBugReports(), loadCandidates(), loadAllTeams(), loadAllSows(), apiCall('/api/clients').then(data => { if (data) data.forEach(c => { _apiClientsCache[c.name] = c; }); }).catch(() => {}), (_currentUser && _currentUser.role === 'admin' ? apiCall('/api/queue').then(data => { if (data) _queueData = data; }) : Promise.resolve()).catch(() => {})]);
      if (!isClientUser() && !window._hiringFilterClient) {
        const nbiClient = Object.values(_apiClientsCache || {}).find(c => c.name === 'NBI Operations' || c.name === 'NBI OPS');
        if (nbiClient) window._hiringFilterClient = nbiClient.id;
      }
      await loadFinanceSeedIfEmpty();
      await loadFinanceFromDB();
      checkLeadReminders();
      if (tasks.length === 0) {
        const seedCSV = await fetchSeedData();
        if (seedCSV) { parseCSVPreview(seedCSV); if (pendingCSVData) confirmImport(); }
      }
      if (isClientUser()) {
        const myClient = Object.values(_apiClientsCache).find(c => c.id === _currentUser.clientId);
        if (myClient) currentFilter.client = myClient.name;
        if (!isClientAllowedView(currentView)) currentView = 'dashboard';
      }
      renderAll();
      restartPollingIntervals();
      checkExpenseReportDeepLink();
      checkInterviewDeepLink();
      if (window._pendingDeepLink) {
        var link = window._pendingDeepLink;
        window._pendingDeepLink = null;
        _resolveDeepLink(link);
      }
      return;
    }
  } catch (e) {
    document.getElementById('appContainer').style.display = '';
    document.getElementById('loginScreen').style.display = 'none';
    await openIDB();
    await load();
    renderAll();
    return;
  }
  // Check if this is a password reset link
  if (checkHashForReset()) return;
  // No valid session -- show login
  showLoginScreen();
})();

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

function showKeyboardShortcutHelp() {
  var existing = document.getElementById('kbShortcutOverlay');
  if (existing) { existing.remove(); return; }
  var overlay = document.createElement('div');
  overlay.id = 'kbShortcutOverlay';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = '<div class="modal" style="max-width:520px;max-height:80vh;overflow-y:auto">' +
    '<div class="modal__title" style="display:flex;justify-content:space-between;align-items:center">Keyboard Shortcuts <button class="btn btn--ghost btn--sm" onclick="this.closest(\'.modal-overlay\').remove()" style="font-size:1.2rem">&times;</button></div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">?</kbd></td><td>Show this help</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">/</kbd></td><td>Focus search</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">n</kbd></td><td>New task (Projects view)</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">[</kbd></td><td>Toggle sidebar</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">Esc</kbd></td><td>Close panel / deselect</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">1-4</kbd></td><td>Set task status (when detail open)</td></tr>' +
    '<tr><td colspan="2" style="padding:10px 12px 4px;font-weight:600;color:var(--text-primary);border-top:1px solid var(--border-default)">Navigation (g then...)</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">g d</kbd></td><td>Dashboard</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">g t</kbd></td><td>Projects (tasks)</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">g r</kbd></td><td>Reporting</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">g p</kbd></td><td>People</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">g l</kbd></td><td>Leads</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">g f</kbd></td><td>Finances</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">g e</kbd></td><td>Expenses</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">g s</kbd></td><td>Settings</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">g m</kbd></td><td>My Work</td></tr>' +
    '<tr><td colspan="2" style="padding:10px 12px 4px;font-weight:600;color:var(--text-primary);border-top:1px solid var(--border-default)">Gantt</td></tr>' +
    '<tr><td style="padding:6px 12px;color:var(--text-muted)"><kbd style="background:var(--bg-surface);padding:2px 6px;border-radius:3px;font-size:12px">Del</kbd></td><td>Remove selected dependency</td></tr>' +
    '</table></div>';
  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
}

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

  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    showKeyboardShortcutHelp();
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
// ==================== GLOBAL KEYBOARD ACCESSIBILITY ====================
// Event delegation: make all div/span elements with onclick keyboard-accessible
// by adding Enter/Space activation. This runs on every click event to patch
// dynamically rendered elements without modifying every render function.
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target;
  if (!el || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'BUTTON' || el.tagName === 'A') return;
  if (el.getAttribute('onclick') || el.hasAttribute('role')) {
    e.preventDefault();
    el.click();
  }
});

// After each renderAll, patch interactive elements with tabindex
const _origRenderAll = typeof renderAll === 'function' ? renderAll : null;
if (_origRenderAll) {
  const _patchA11y = () => {
    document.querySelectorAll('.tactical-item[onclick], .task-row[onclick], .board-card[onclick], .mytask-row[onclick], .task-client-header[onclick], .tactical-person__header[onclick], .kpi-card[onclick]').forEach(el => {
      if (!el.hasAttribute('tabindex')) { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); }
    });
    // Patch textareas for auto-resize
    initTextareaAutoResize(document.getElementById('mainContent'));
  };
  // Use MutationObserver for efficiency instead of monkey-patching renderAll
  const _a11yObserver = new MutationObserver(() => requestAnimationFrame(_patchA11y));
  const mc = document.getElementById('mainContent');
  if (mc) _a11yObserver.observe(mc, { childList: true, subtree: true });
}

