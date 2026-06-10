/** Merge hardcoded client brief defaults with user-edited briefs (API data wins, defaults fill gaps) */
function mergeBriefDefaults() {
  Object.keys(DEFAULT_CLIENT_BRIEFS).forEach(k => {
    if (!clientBriefs[k]) { clientBriefs[k] = DEFAULT_CLIENT_BRIEFS[k]; }
    else {
      const def = DEFAULT_CLIENT_BRIEFS[k];
      const cur = clientBriefs[k];
      Object.keys(def).forEach(field => {
        if (!cur[field] || (typeof cur[field] === 'string' && cur[field].trim() === '') || (Array.isArray(cur[field]) && cur[field].length === 0 && def[field].length > 0)) {
          cur[field] = def[field];
        }
      });
    }
  });
}

/** Flag a task as locally modified — it will be included in the next sync batch */
function markDirty(taskId) { _dirtyTaskIds.add(taskId); _recentlyEditedIds.add(taskId); setTimeout(() => _recentlyEditedIds.delete(taskId), SELF_ECHO_WINDOW_MS); }
/** Flag a task as deleted locally — removes it from the dirty set and queues it for server deletion */
function markDeleted(taskId) { _deletedTaskIds.add(taskId); _dirtyTaskIds.delete(taskId); }

/** Write a field value to the in-memory task immediately (every keystroke).
 *  Does NOT trigger localStorage/API sync — that happens on blur via onchange.
 *  This ensures the in-memory task always has the latest text, even if the
 *  DOM element is destroyed before onchange/blur fires. */
let _liveWriteSaveTimer = null;
function _liveWrite(taskId, field, value) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task[field] === value) return;
  task[field] = value;
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  clearTimeout(_liveWriteSaveTimer);
  _liveWriteSaveTimer = setTimeout(save, 1500);
}
function _liveWriteBlocker(taskId, subField, value) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  if (!task.blockerInfo) task.blockerInfo = {};
  if (task.blockerInfo[subField] === value) return;
  task.blockerInfo[subField] = value;
  task.blockerInfo.lastUpdated = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  markDirty(taskId);
  clearTimeout(_liveWriteSaveTimer);
  _liveWriteSaveTimer = setTimeout(save, 1500);
}

let _flushing = false;
/** Flush any text the user has typed into a focused input/textarea before the DOM is rebuilt.
 *  Called at the top of renderContent() so re-renders never destroy unsaved keystrokes. */
function _flushActiveEdits() {
  if (_flushing) return;
  const el = document.activeElement;
  if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
  if (el.type === 'date' || el.type === 'number' || el.type === 'checkbox') return;
  _flushing = true;
  try {
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } finally {
    _flushing = false;
  }
}

/** Save to localStorage immediately, then debounce an API sync (500ms) */
function save() {
  // Always save to localStorage as local cache
  try {
    localStorage.setItem('nbi_dashboard_tasks', JSON.stringify(tasks));
    localStorage.setItem('nbi_dashboard_settings', JSON.stringify(settings));
    localStorage.setItem('nbi_dashboard_briefs', JSON.stringify(clientBriefs));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      toast('Local storage full. Your changes are saved to the server only.', 'warning');
    }
  }
  // Write dirty tasks to IndexedDB WAL for crash recovery
  _dirtyTaskIds.forEach(id => {
    const task = tasks.find(t => t.id === id);
    if (task) walWrite(id, 'update', task);
  });
  _deletedTaskIds.forEach(id => walWrite(id, 'delete', null));
  // Cache full tasks array in IndexedDB (larger quota than localStorage)
  idbCacheWrite('tasks', tasks);
  idbCacheWrite('settings', settings);
  // Debounced sync to API (prevents hammering during rapid edits)
  if (useAPI) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(syncToAPI, SYNC_DEBOUNCE_MS);
  }
}

let _syncRetryCount = 0;
let _syncRetryTimer = null;
function _scheduleSyncRetry() {
  if (_syncRetryTimer) return;
  _syncRetryCount++;
  if (_syncRetryCount > 5) { showSyncStatus('error', 'Sync failed after 5 attempts — changes saved locally'); return; }
  const delay = Math.min(2000 * Math.pow(2, _syncRetryCount - 1), 30000);
  _syncRetryTimer = setTimeout(() => { _syncRetryTimer = null; syncToAPI(); }, delay);
}

/**
 * Push local changes to the server via POST /api/sync/changes.
 * Sends only dirty/deleted tasks (not the full array).
 * Includes _serverUpdatedAt for conflict detection — server rejects if another user edited since.
 * On failure, re-queues the changes for the next cycle with exponential backoff.
 */
async function syncToAPI() {
  if (_syncInFlight) return;
  if (_dirtyTaskIds.size === 0 && _deletedTaskIds.size === 0 && !_briefsDirty) return;
  _syncInFlight = true;

  // Snapshot and clear so new edits during flight get queued for next sync
  const dirtyIds = [..._dirtyTaskIds];
  const deletedIds = [..._deletedTaskIds];
  const sendBriefs = _briefsDirty;
  _dirtyTaskIds.clear();
  _deletedTaskIds.clear();
  _briefsDirty = false;

  const changes = [];
  for (const id of dirtyIds) {
    const t = tasks.find(x => x.id === id);
    if (t) changes.push({ action: 'upsert', entity: 'task', data: { ...t, _serverUpdatedAt: t._serverUpdatedAt || t.updatedAt, _version: t.version } });
  }
  for (const id of deletedIds) {
    changes.push({ action: 'delete', entity: 'task', id });
  }

  if (changes.length === 0) { _syncInFlight = false; return; }

  showSyncStatus('saving', 'Saving...');
  try {
    const payload = { changes };
    if (sendBriefs) payload.client_briefs = clientBriefs;
    const resp = await authFetch('/api/sync/changes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      if (window._nbiDebug) console.warn('[Sync] Incremental sync failed:', resp.status);
      dirtyIds.forEach(id => _dirtyTaskIds.add(id));
      deletedIds.forEach(id => _deletedTaskIds.add(id));
      if (sendBriefs) _briefsDirty = true;
      showSyncStatus('error', 'Sync failed — retrying...');
      _scheduleSyncRetry();
    } else {
      _syncRetryCount = 0;
      _lastLocalSyncTime = Date.now();
      walClear([...dirtyIds, ...deletedIds]);
      // Update _serverUpdatedAt from the response so the next sync won't conflict
      try {
        const syncResult = await resp.json();
        if (syncResult.updatedTimestamps) {
          for (const [tid, ts] of Object.entries(syncResult.updatedTimestamps)) {
            const task = tasks.find(t => t.id === tid);
            if (task) task._serverUpdatedAt = new Date(ts).toISOString();
          }
        }
        if (syncResult.conflicted && syncResult.conflicted.length > 0) {
          syncResult.conflicted.forEach(c => {
            _dirtyTaskIds.add(c.id);
            const task = tasks.find(t => t.id === c.id);
            if (task && c.serverUpdatedAt) task._serverUpdatedAt = new Date(c.serverUpdatedAt).toISOString();
          });
          const names = syncResult.conflicted.map(c => c.title).filter(Boolean).slice(0, 3).join(', ');
          showToast(`${syncResult.conflicted.length} change${syncResult.conflicted.length > 1 ? 's' : ''} conflicted (${names || 'untitled'}) — retrying`, 'warning');
          _scheduleSyncRetry();
        }
      } catch (_) { /* response already consumed or no timestamps */ }
      showSyncStatus('saving', 'Saved ✓');
    }
  } catch (e) {
    if (window._nbiDebug) console.warn('[Sync] Error:', e.message);
    dirtyIds.forEach(id => _dirtyTaskIds.add(id));
    deletedIds.forEach(id => _deletedTaskIds.add(id));
    if (sendBriefs) _briefsDirty = true;
    showSyncStatus('error', 'Server unreachable — changes saved locally');
    _scheduleSyncRetry();
  } finally {
    _syncInFlight = false;
  }
}

/** Load all data on startup — tries API first, falls back to localStorage. Stamps _serverUpdatedAt for conflict detection. */
async function load() {
  // Try API first
  try {
    const resp = await authFetch('/api/sync/load');
    if (resp.ok) {
      const data = await resp.json();
      if (data.tasks && data.tasks.length > 0) {
        // Stamp each task with its server timestamp for conflict detection
        tasks = data.tasks.map(t => ({ ...t, _serverUpdatedAt: t.updatedAt }));
        useAPI = true;
      }
      if (data.clientBriefs) clientBriefs = data.clientBriefs;
      if (data.settings) {
        if (data.settings.hourlyRate) settings.hourlyRate = Number(data.settings.hourlyRate) || 150;
        if (data.settings.fx_rates) { settings.fx_rates = data.settings.fx_rates; fetchFxRate(); }
      }
      if (data.knownClients) settings.knownClients = data.knownClients;
      _lastPollTime = new Date().toISOString();
    }
  } catch (e) {
  }

  // Fall back to localStorage if API had no data
  if (tasks.length === 0) {
    try { const t = localStorage.getItem('nbi_dashboard_tasks'); if (t) tasks = JSON.parse(t); } catch(e) {}
  }
  try {
    const s = localStorage.getItem('nbi_dashboard_settings');
    if (s && !useAPI) settings = { ...settings, ...JSON.parse(s) };
  } catch(e) {}
  if (Object.keys(clientBriefs).length === 0) {
    try { const b = localStorage.getItem('nbi_dashboard_briefs'); if (b) clientBriefs = JSON.parse(b); } catch(e) {}
  }
  mergeBriefDefaults();

  // If API is connected and localStorage has data the DB doesn't, push it up
  if (useAPI && tasks.length === 0) {
    try {
      const t = localStorage.getItem('nbi_dashboard_tasks');
      if (t) {
        tasks = JSON.parse(t);
        // Mark all as dirty so incremental sync pushes them
        tasks.forEach(task => _dirtyTaskIds.add(task.id));
        await syncToAPI();
      }
    } catch(e) {}
  }

  // Recover any uncommitted changes from IndexedDB WAL.
  // Critical: do NOT call save() after recovery — save() re-writes to WAL
  // with fresh timestamps, creating a self-refreshing cycle where the same
  // entries are "recovered" on every page load.
  const walEntries = await walReadAll();
  if (walEntries.length > 0) {
    walClear(walEntries.map(e => e.id));
    let recovered = 0;
    for (const entry of walEntries) {
      if (entry.action === 'update' && entry.data) {
        const existing = tasks.find(t => t.id === entry.id);
        if (existing) {
          const walTime = entry.ts;
          const loadedTime = new Date(existing.updatedAt || existing.updated_at || 0).getTime();
          if (walTime > loadedTime) {
            Object.assign(existing, entry.data);
            markDirty(entry.id);
            recovered++;
          }
        } else if (entry.data && entry.data.id) {
          tasks.push(entry.data);
          markDirty(entry.id);
          recovered++;
        }
      } else if (entry.action === 'delete') {
        if (!_deletedTaskIds.has(entry.id)) {
          _deletedTaskIds.add(entry.id);
          recovered++;
        }
      }
    }
    if (recovered > 0) {
      toast(`Recovered ${recovered} unsaved change${recovered > 1 ? 's' : ''} from previous session`, 'warning');
      // Update localStorage and idbCache (offline resilience) but skip WAL
      // writes — WAL was already cleared and must not be re-populated with
      // the same entries. syncToAPI() will push to server; on success,
      // walClear is a harmless no-op.
      try { localStorage.setItem('nbi_dashboard_tasks', JSON.stringify(tasks)); } catch(e) {}
      idbCacheWrite('tasks', tasks);
      syncToAPI();
    }
  }
  // Mark initial load as complete so skeleton placeholders (Phase 12.1) stop showing
  window._initialLoadComplete = true;
}

// Pause all polling when tab is hidden to reduce background server load
let _pollingPaused = false;
document.addEventListener('visibilitychange', () => {
  _pollingPaused = document.hidden;
});

// Flush pending edits and sync before tab/window close
window.addEventListener('beforeunload', (e) => {
  _flushActiveEdits();
  if (_dirtyTaskIds.size > 0 || _deletedTaskIds.size > 0) {
    save();
    const dirtyIds = [..._dirtyTaskIds];
    const deletedIds = [..._deletedTaskIds];
    const changes = [];
    for (const id of dirtyIds) {
      const t = tasks.find(x => x.id === id);
      if (t) changes.push({ action: 'upsert', entity: 'task', data: { ...t, _serverUpdatedAt: t._serverUpdatedAt || t.updatedAt, _version: t.version } });
    }
    for (const id of deletedIds) {
      changes.push({ action: 'delete', entity: 'task', id });
    }
    if (changes.length > 0) {
      fetch('/api/sync/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
        keepalive: true,
        credentials: 'include'
      });
    }
  }
});
