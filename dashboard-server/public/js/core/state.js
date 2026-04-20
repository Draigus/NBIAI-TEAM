// state.js — Auth, persistence, sync, and init functions extracted from the monolith
// All global state is accessed via window. (state variables remain in the inline script)

// ==================== AUTH ====================

export function isClientUser() { return !!(window._currentUser && window._currentUser.clientId); }
window.isClientUser = isClientUser;

export function isClientAdmin() { return window._currentUser?.clientRole === 'admin'; }
window.isClientAdmin = isClientAdmin;

/** Reset UI to the login screen -- hides app container and clears form fields */
export function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('resetPasswordScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginResetPrompt').style.display = 'none';
  document.getElementById('loginUser').focus();
}
window.showLoginScreen = showLoginScreen;

/** Show the main app container and display the current user's name badge */
export function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('resetPasswordScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = '';
  if (window._currentUser) {
    document.getElementById('userBadge').textContent = window._currentUser.displayName;
    if (isClientUser()) {
      const co = Object.values(window._apiClientsCache).find(c => c.id === window._currentUser.clientId);
      const subtitleEl = document.querySelector('.g-header__subtitle');
      if (co && subtitleEl) subtitleEl.textContent = co.name;
    }
  }
}
window.showApp = showApp;

export function checkForcePasswordChange() {
  if (window._currentUser?.mustChangePassword) {
    document.getElementById('forcePasswordChangeModal').style.display = 'flex';
    document.getElementById('fpwSubmit').onclick = async () => {
      const current = document.getElementById('fpwCurrent').value;
      const newPw = document.getElementById('fpwNew').value;
      const confirm = document.getElementById('fpwConfirm').value;
      const errorEl = document.getElementById('fpwError');
      if (!current || !newPw || !confirm) { errorEl.textContent = 'All fields required'; errorEl.style.display = 'block'; return; }
      if (newPw.length < 6) { errorEl.textContent = 'Password must be at least 6 characters'; errorEl.style.display = 'block'; return; }
      if (newPw !== confirm) { errorEl.textContent = 'Passwords do not match'; errorEl.style.display = 'block'; return; }
      try {
        const res = await authFetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
        });
        if (res.ok) {
          window._currentUser.mustChangePassword = false;
          document.getElementById('forcePasswordChangeModal').style.display = 'none';
          window.location.reload();
        } else {
          const data = await res.json();
          errorEl.textContent = data.error || 'Password change failed';
          errorEl.style.display = 'block';
        }
      } catch (e) {
        errorEl.textContent = 'Network error';
        errorEl.style.display = 'block';
      }
    };
    return true;
  }
  return false;
}
window.checkForcePasswordChange = checkForcePasswordChange;

/** Handle login form submission -- validates credentials and initialises the app on success */
export async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  const resetPrompt = document.getElementById('loginResetPrompt');
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  if (!username || !password) { errEl.textContent = 'Please enter username and password'; return; }

  btn.disabled = true;
  errEl.textContent = '';
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      errEl.textContent = data.error || 'Login failed';
      if (data.showReset) {
        resetPrompt.style.display = 'block';
        document.getElementById('resetEmailMsg').style.display = 'none';
      }
      btn.disabled = false;
      return;
    }

    resetPrompt.style.display = 'none';
    window._currentUser = data.user;
    if (checkForcePasswordChange()) { btn.disabled = false; return; }
    showApp();
    await openIDB();
    await Promise.all([load(), loadTeamMembers(), loadPagePermissions(), loadBugReports(), window.loadCandidates()]);
    await window.loadFinanceFromDB();
    if (isClientUser()) {
      const myClient = Object.values(window._apiClientsCache).find(c => c.id === window._currentUser.clientId);
      if (myClient) window.currentFilter.client = myClient.name;
    }
    window.renderAll();
    restartPollingIntervals();
    window.checkExpenseReportDeepLink();
  } catch (err) {
    errEl.textContent = 'Connection error. Is the server running?';
  }
  btn.disabled = false;
}
window.handleLogin = handleLogin;

/** Request a password reset email for the username entered on the login form */
export async function sendPasswordResetEmail() {
  const username = document.getElementById('loginUser').value.trim();
  const btn = document.getElementById('resetEmailBtn');
  const msgEl = document.getElementById('resetEmailMsg');
  if (!username) { msgEl.style.display = 'block'; msgEl.style.color = '#dc2626'; msgEl.textContent = 'Enter your username or email above first.'; return; }
  btn.disabled = true;
  msgEl.style.display = 'none';
  try {
    const resp = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await resp.json();
    msgEl.style.display = 'block';
    msgEl.style.color = '#16a34a';
    msgEl.textContent = data.message || 'If an account exists, a reset email has been sent.';
  } catch (err) {
    msgEl.style.display = 'block';
    msgEl.style.color = '#dc2626';
    msgEl.textContent = 'Connection error. Is the server running?';
  }
  btn.disabled = false;
}
window.sendPasswordResetEmail = sendPasswordResetEmail;

/** Submit a new password using the reset token from the URL hash */
export async function submitPasswordReset(e) {
  e.preventDefault();
  const btn = document.getElementById('resetBtn');
  const errEl = document.getElementById('resetError');
  const newPass = document.getElementById('resetNewPass').value;
  const confirmPass = document.getElementById('resetConfirmPass').value;
  if (!newPass || newPass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (newPass !== confirmPass) { errEl.textContent = 'Passwords do not match.'; return; }

  const token = window.location.hash.replace('#reset-password/', '');
  btn.disabled = true;
  errEl.textContent = '';
  try {
    const resp = await fetch('/api/auth/reset-token/' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: newPass }),
    });
    const data = await resp.json();
    if (!resp.ok) { errEl.textContent = data.error || 'Reset failed.'; btn.disabled = false; return; }
    window.location.hash = '';
    showLoginScreen();
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginResetPrompt').style.display = 'none';
    const successEl = document.getElementById('loginError');
    successEl.textContent = 'Password reset successfully. Please sign in.';
    successEl.style.color = '#16a34a';
    setTimeout(() => { successEl.style.color = ''; }, 5000);
  } catch (err) {
    errEl.textContent = 'Connection error.';
  }
  btn.disabled = false;
}
window.submitPasswordReset = submitPasswordReset;

/** Check whether the URL hash contains a password reset token; if so, show the reset screen */
export function checkHashForReset() {
  const hash = window.location.hash;
  if (hash.startsWith('#reset-password/')) {
    const token = hash.replace('#reset-password/', '');
    if (token) { window.showResetPasswordScreen(token); return true; }
  }
  return false;
}
window.checkHashForReset = checkHashForReset;

export function backToLogin() { window.location.hash = ''; showLoginScreen(); }
window.backToLogin = backToLogin;

// ==================== INDEXEDDB / PERSISTENCE ====================

/** Open the IndexedDB database for the write-ahead log and data cache */
export function openIDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { resolve(null); return; }
    const req = indexedDB.open(window.IDB_NAME, window.IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('wal')) db.createObjectStore('wal', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('data_cache')) db.createObjectStore('data_cache', { keyPath: 'key' });
    };
    req.onsuccess = (e) => { window._idb = e.target.result; resolve(window._idb); };
    req.onerror = () => { resolve(null); };
  });
}
window.openIDB = openIDB;

/** Wraps fetch() with auth token injection and automatic 401 → login screen redirect */
export function authFetch(url, opts = {}) {
  opts.credentials = 'include';
  return fetch(url, opts).then(resp => {
    if (resp.status === 401) {
      window._currentUser = null;
      showLoginScreen();
    } else if (resp.status === 403) {
      window.toast('You do not have permission for this action', 'error');
    }
    return resp;
  });
}
window.authFetch = authFetch;

/** Fetch wrapper that handles v2 envelope: unwraps { data, error, meta } automatically.
 *  Sends X-API-Version: 2 header so the server wraps responses in { data, error, meta }.
 *  On success, returns the unwrapped data. On failure, shows a toast and returns null. */
export async function apiCall(url, options = {}) {
  options.headers = { ...options.headers, 'X-API-Version': '2' };
  const resp = await authFetch(url, options);
  if (!resp.ok) {
    let errMsg = 'Request failed';
    try {
      const body = await resp.json();
      errMsg = body?.error?.message || body?.error || errMsg;
    } catch(e) {}
    window.toast(errMsg, 'error');
    return null;
  }
  const body = await resp.json();
  // v2 envelope: unwrap data
  if (body && body.hasOwnProperty('data') && body.hasOwnProperty('error')) {
    return body.data;
  }
  // v1 fallback
  return body;
}
window.apiCall = apiCall;

/** Flag a task as locally modified — it will be included in the next sync batch */
export function markDirty(taskId) {
  window._dirtyTaskIds.add(taskId);
  window._recentlyEditedIds.add(taskId);
  setTimeout(() => window._recentlyEditedIds.delete(taskId), window.SELF_ECHO_WINDOW_MS);
}
window.markDirty = markDirty;

/** Save to localStorage immediately, then debounce an API sync (500ms) */
export function save() {
  // Always save to localStorage as local cache
  try {
    localStorage.setItem('nbi_dashboard_tasks', JSON.stringify(window.tasks));
    localStorage.setItem('nbi_dashboard_settings', JSON.stringify(window.settings));
    localStorage.setItem('nbi_dashboard_briefs', JSON.stringify(window.clientBriefs));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      window.toast('Local storage full. Your changes are saved to the server only.', 'warning');
    }
  }
  // Write dirty tasks to IndexedDB WAL for crash recovery
  window._dirtyTaskIds.forEach(id => {
    const task = window.tasks.find(t => t.id === id);
    if (task) window.walWrite(id, 'update', task);
  });
  window._deletedTaskIds.forEach(id => window.walWrite(id, 'delete', null));
  // Cache full tasks array in IndexedDB (larger quota than localStorage)
  window.idbCacheWrite('tasks', window.tasks);
  window.idbCacheWrite('settings', window.settings);
  // Debounced sync to API (prevents hammering during rapid edits)
  if (window.useAPI) {
    clearTimeout(window.syncDebounceTimer);
    window.syncDebounceTimer = setTimeout(syncToAPI, window.SYNC_DEBOUNCE_MS);
  }
}
window.save = save;

/**
 * Push local changes to the server via POST /api/sync/changes.
 * Sends only dirty/deleted tasks (not the full array).
 * Includes _serverUpdatedAt for conflict detection — server rejects if another user edited since.
 * On failure, re-queues the changes for the next cycle.
 */
export async function syncToAPI() {
  if (window._syncInFlight) return;
  if (window._dirtyTaskIds.size === 0 && window._deletedTaskIds.size === 0 && !window._briefsDirty) return;
  window._syncInFlight = true;

  // Snapshot and clear so new edits during flight get queued for next sync
  const dirtyIds = [...window._dirtyTaskIds];
  const deletedIds = [...window._deletedTaskIds];
  const sendBriefs = window._briefsDirty;
  window._dirtyTaskIds.clear();
  window._deletedTaskIds.clear();
  window._briefsDirty = false;

  const changes = [];
  for (const id of dirtyIds) {
    const t = window.tasks.find(x => x.id === id);
    if (t) changes.push({ action: 'upsert', entity: 'task', data: { ...t, _serverUpdatedAt: t._serverUpdatedAt || t.updatedAt } });
  }
  for (const id of deletedIds) {
    changes.push({ action: 'delete', entity: 'task', id });
  }

  if (changes.length === 0) { window._syncInFlight = false; return; }

  window.showSyncStatus('saving', 'Saving...');
  try {
    const payload = { changes };
    if (sendBriefs) payload.client_briefs = window.clientBriefs;
    const resp = await authFetch('/api/sync/changes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      if (window._nbiDebug) console.warn('[Sync] Incremental sync failed:', resp.status);
      dirtyIds.forEach(id => window._dirtyTaskIds.add(id));
      deletedIds.forEach(id => window._deletedTaskIds.add(id));
      if (sendBriefs) window._briefsDirty = true;
      window.showSyncStatus('error', 'Sync failed — retrying...');
    } else {
      window._lastLocalSyncTime = Date.now();
      window.walClear([...dirtyIds, ...deletedIds]);
      window.showSyncStatus('saving', 'Saved \u2713');
    }
  } catch (e) {
    if (window._nbiDebug) console.warn('[Sync] Error:', e.message);
    dirtyIds.forEach(id => window._dirtyTaskIds.add(id));
    deletedIds.forEach(id => window._deletedTaskIds.add(id));
    if (sendBriefs) window._briefsDirty = true;
    window.showSyncStatus('error', 'Server unreachable — changes saved locally');
  } finally {
    window._syncInFlight = false;
  }
}
window.syncToAPI = syncToAPI;

/** Load all data on startup — tries API first, falls back to localStorage. Stamps _serverUpdatedAt for conflict detection. */
export async function load() {
  // Try API first
  try {
    const resp = await authFetch('/api/sync/load');
    if (resp.ok) {
      const data = await resp.json();
      if (data.tasks && data.tasks.length > 0) {
        // Stamp each task with its server timestamp for conflict detection
        window.tasks = data.tasks.map(t => ({ ...t, _serverUpdatedAt: t.updatedAt }));
        window.useAPI = true;
      }
      if (data.clientBriefs) window.clientBriefs = data.clientBriefs;
      if (data.settings) {
        if (data.settings.hourlyRate) window.settings.hourlyRate = Number(data.settings.hourlyRate) || 150;
        if (data.settings.fx_rates) { window.settings.fx_rates = data.settings.fx_rates; window.fetchFxRate(); }
      }
      if (data.knownClients) window.settings.knownClients = data.knownClients;
      window._lastPollTime = new Date().toISOString();
    }
  } catch (e) {
  }

  // Fall back to localStorage if API had no data
  if (window.tasks.length === 0) {
    try { const t = localStorage.getItem('nbi_dashboard_tasks'); if (t) window.tasks = JSON.parse(t); } catch(e) {}
  }
  try {
    const s = localStorage.getItem('nbi_dashboard_settings');
    if (s && !window.useAPI) window.settings = { ...window.settings, ...JSON.parse(s) };
  } catch(e) {}
  if (Object.keys(window.clientBriefs).length === 0) {
    try { const b = localStorage.getItem('nbi_dashboard_briefs'); if (b) window.clientBriefs = JSON.parse(b); } catch(e) {}
  }
  window.mergeBriefDefaults();

  // If API is connected and localStorage has data the DB doesn't, push it up
  if (window.useAPI && window.tasks.length === 0) {
    try {
      const t = localStorage.getItem('nbi_dashboard_tasks');
      if (t) {
        window.tasks = JSON.parse(t);
        // Mark all as dirty so incremental sync pushes them
        window.tasks.forEach(task => window._dirtyTaskIds.add(task.id));
        await syncToAPI();
      }
    } catch(e) {}
  }

  // Recover any uncommitted changes from IndexedDB WAL
  const walEntries = await window.walReadAll();
  if (walEntries.length > 0) {
    let recovered = 0;
    for (const entry of walEntries) {
      if (entry.action === 'update' && entry.data) {
        const existing = window.tasks.find(t => t.id === entry.id);
        if (existing) {
          const walTime = entry.ts;
          const loadedTime = new Date(existing.updatedAt || existing.updated_at || 0).getTime();
          if (walTime > loadedTime) {
            Object.assign(existing, entry.data);
            markDirty(entry.id);
            recovered++;
          }
        } else {
          if (window._nbiDebug) console.warn('[WAL] Skipped orphan entry — task', entry.id, 'no longer exists on server');
        }
      } else if (entry.action === 'delete') {
        if (!window._deletedTaskIds.has(entry.id)) {
          window._deletedTaskIds.add(entry.id);
          recovered++;
        }
      }
    }
    if (recovered > 0) {
      window.toast(`Recovered ${recovered} unsaved change${recovered > 1 ? 's' : ''} from previous session`, 'warning');
      save();
    }
  }
  // Mark initial load as complete so skeleton placeholders (Phase 12.1) stop showing
  window._initialLoadComplete = true;
}
window.load = load;

// ==================== SYNC / DATA LOADING ====================

/** Fetch and cache the team member list for dropdowns */
export async function loadTeamMembers() {
  try {
    const users = await apiCall('/api/users');
    if (users) {
      window._cachedUsers = users.filter(u => u.is_active !== false);
      window._cachedTeamMembers = window._cachedUsers.map(u => u.display_name).sort();
    }
  } catch(e) {}
}
window.loadTeamMembers = loadTeamMembers;

/**
 * Refresh the in-memory teams cache from /api/teams. Called on startup and
 * any time team data changes via create/update/delete/membership operations.
 */
export async function loadAllTeams() {
  try {
    const teams = await apiCall('/api/teams');
    window._teamsCache = Array.isArray(teams) ? teams : [];
  } catch (e) { window._teamsCache = []; }
  // If the calendar was rendered before teams arrived, refresh the filter bar now
  if (window.currentView === 'people' && window._peopleSubView === 'calendar') window.renderContent();
  return window._teamsCache;
}
window.loadAllTeams = loadAllTeams;

/**
 * Refresh the in-memory SoWs cache from /api/sows. Called on startup and
 * any time a task's SoW changes. SoWs are pre-loaded with their client_name
 * joined server-side so the selector and tree grouping don't need extra lookups.
 */
export async function loadAllSows() {
  try {
    const sows = await apiCall('/api/sows');
    window._sowsCache = Array.isArray(sows) ? sows : [];
  } catch (e) { window._sowsCache = []; }
  return window._sowsCache;
}
window.loadAllSows = loadAllSows;

/** Load bug reports for the Settings tab */
export async function loadBugReports() {
  try {
    const data = await apiCall('/api/bug-reports');
    if (data) window._bugReportsData = data;
  } catch(e) { if (window._nbiDebug) console.error('Failed to load bug reports:', e); }
}
window.loadBugReports = loadBugReports;

/** Load page permissions from server settings (shared across all users) */
export async function loadPagePermissions() {
  try {
    const settings = await apiCall('/api/settings');
    if (settings && settings.page_permissions) {
      const perms = typeof settings.page_permissions === 'string' ? JSON.parse(settings.page_permissions) : settings.page_permissions;
      window._pagePermissions = perms;
      localStorage.setItem('nbi_page_permissions', JSON.stringify(perms));
    }
  } catch(e) { if (window._nbiDebug) console.warn('[Permissions] Failed to load from server, using local cache'); }
}
window.loadPagePermissions = loadPagePermissions;

/** Restart all polling intervals after re-login (they are cleared on logout) */
export function restartPollingIntervals() {
  clearInterval(window._syncPollInterval);
  clearInterval(window._leadsReminderInterval);
  clearInterval(window._notifPollInterval);
  window._syncPollInterval = setInterval(async () => {
    if (!window.useAPI || !window._lastPollTime) return;
    try {
      const resp = await authFetch('/api/sync/poll?since=' + encodeURIComponent(window._lastPollTime));
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.updated?.length > 0 || data.deleted?.length > 0 || data.created?.length > 0) {
        // Skip re-render if all changes are from our own recent save (self-echo).
        // The local state is already up to date — we made these changes.
        const selfEcho = window._lastLocalSyncTime && (Date.now() - window._lastLocalSyncTime < 15000) &&
          (data.updated || []).every(t => window._recentlyEditedIds.has(t.id));
        if (!selfEcho) {
          // Merge remote changes into local state without full reload
          for (const t of (data.updated || [])) {
            const idx = window.tasks.findIndex(x => x.id === t.id);
            if (idx >= 0) Object.assign(window.tasks[idx], t, { _serverUpdatedAt: t.updatedAt || t.updated_at });
            else window.tasks.push({ ...t, _serverUpdatedAt: t.updatedAt || t.updated_at });
          }
          for (const id of (data.deleted || [])) {
            const idx = window.tasks.findIndex(x => x.id === id);
            if (idx >= 0) window.tasks.splice(idx, 1);
          }
          // Remote changes — re-render content but preserve scroll exactly
          window._softReRender();
        }
      }
      if (data.serverTime) window._lastPollTime = data.serverTime;
    } catch(e) {}
  }, window.SYNC_POLL_MS);
  window._leadsReminderInterval = setInterval(() => { if (window._currentUser) window.checkLeadReminders(); }, 60000);
  window._notifPollInterval = setInterval(() => { if (window._currentUser) window.loadNotifications(); }, 30000);
}
window.restartPollingIntervals = restartPollingIntervals;

// ==================== INIT ====================

export async function init() {
  // Check if we have a valid session cookie by calling auth/me
  try {
    const resp = await fetch('/api/auth/me', { credentials: 'include' });
    if (resp.ok) {
      const data = await resp.json();
      window._currentUser = data.user;
      if (checkForcePasswordChange()) return;
      showApp();
      await openIDB();
      await Promise.all([load(), loadTeamMembers(), loadPagePermissions(), loadBugReports(), loadAllTeams(), loadAllSows(), apiCall('/api/clients').then(data => { if (data) data.forEach(c => { window._apiClientsCache[c.name] = c; }); }).catch(() => {})]);
      await window.loadFinanceSeedIfEmpty();
      await window.loadFinanceFromDB();
      window.checkLeadReminders();
      if (window.tasks.length === 0) {
        const seedCSV = await window.fetchSeedData();
        if (seedCSV) { window.parseCSVPreview(seedCSV); if (window.pendingCSVData) window.confirmImport(); }
      }
      if (isClientUser()) {
        const myClient = Object.values(window._apiClientsCache).find(c => c.id === window._currentUser.clientId);
        if (myClient) window.currentFilter.client = myClient.name;
      }
      window.renderAll();
      restartPollingIntervals();
      window.checkExpenseReportDeepLink();
      return;
    }
  } catch (e) {
    document.getElementById('appContainer').style.display = '';
    document.getElementById('loginScreen').style.display = 'none';
    await openIDB();
    await load();
    window.renderAll();
    return;
  }
  // Check if this is a password reset link
  if (checkHashForReset()) return;
  // No valid session -- show login
  showLoginScreen();
}

// Self-invoke during transition period (monolith IIFE has been removed)
init();

// ==================== FORM LISTENERS ====================
// Form listeners (moved from inline script during state.js extraction)
document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
document.getElementById('resetForm')?.addEventListener('submit', submitPasswordReset);
document.getElementById('showPasswordToggle')?.addEventListener('change', function() {
  document.getElementById('loginPass').type = this.checked ? 'text' : 'password';
});
