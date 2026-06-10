// ==================== INDEXEDDB WRITE-AHEAD LOG ====================
const IDB_NAME = 'nbi_dashboard';
const IDB_VERSION = 2;
let _idb = null;

/** Open the IndexedDB database for the write-ahead log and data cache */
function openIDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { resolve(null); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // v2: flush stale WAL entries left by the pre-fix self-refreshing cycle
      if (db.objectStoreNames.contains('wal')) db.deleteObjectStore('wal');
      db.createObjectStore('wal', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('data_cache')) db.createObjectStore('data_cache', { keyPath: 'key' });
    };
    req.onsuccess = (e) => { _idb = e.target.result; resolve(_idb); };
    req.onerror = () => { resolve(null); };
  });
}

/** Write a change to the WAL for crash recovery */
function walWrite(taskId, action, data) {
  if (!_idb) return;
  try {
    const tx = _idb.transaction('wal', 'readwrite');
    tx.objectStore('wal').put({ id: taskId, action, data, ts: Date.now() });
  } catch(e) { /* IndexedDB unavailable, continue without WAL */ }
}

/** Remove a task from the WAL after successful sync */
function walClear(taskIds) {
  if (!_idb || !taskIds?.length) return;
  try {
    const tx = _idb.transaction('wal', 'readwrite');
    const store = tx.objectStore('wal');
    taskIds.forEach(id => store.delete(id));
  } catch(e) {}
}

/** Read all pending WAL entries for crash recovery */
function walReadAll() {
  return new Promise((resolve) => {
    if (!_idb) { resolve([]); return; }
    try {
      const tx = _idb.transaction('wal', 'readonly');
      const req = tx.objectStore('wal').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch(e) { resolve([]); }
  });
}

/** Cache large data in IndexedDB instead of localStorage */
function idbCacheWrite(key, data) {
  if (!_idb) return;
  try {
    const tx = _idb.transaction('data_cache', 'readwrite');
    tx.objectStore('data_cache').put({ key, data, ts: Date.now() });
  } catch(e) {}
}
