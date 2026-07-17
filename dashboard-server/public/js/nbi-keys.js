// ==================== KEYBOARD SHORTCUTS ====================
// Foundation 3. Central registry + single dispatcher. Sections register
// shortcuts on view entry; registrations are replaced per scope, so
// switching views re-registering the same scope is idempotent.
// def: { key, mod: null|'ctrl'|'meta'|'shift'|'alt'|'mod', chord, action, label, category }
// chord: two-key sequence like 'g d' (1s timeout, mirrors old behaviour).

var _keysRegistry = { global: [], section: [] };
var _keysSection = null;
var _keysChordPending = null;
var _keysChordTimer = null;

function registerShortcuts(scope, defs) {
  if (scope === 'global') { _keysRegistry.global = defs.slice(); }
  else { _keysSection = scope; _keysRegistry.section = defs.slice(); }
}

function unregisterShortcuts(scope) {
  if (scope === 'global') _keysRegistry.global = [];
  else if (scope === _keysSection) { _keysRegistry.section = []; _keysSection = null; }
}

function _keysMatch(def, e) {
  if (String(def.key).toLowerCase() !== String(e.key).toLowerCase()) return false;
  var mod = def.mod || null;
  var symbolKey = def.key.length === 1 && /[^a-z0-9]/i.test(def.key);
  if (mod === null) {
    // shift alone is not a disqualifier for symbol keys (e.g. '?')
    return !e.ctrlKey && !e.metaKey && !e.altKey && (symbolKey || !e.shiftKey);
  }
  if (mod === 'mod') return (e.ctrlKey || e.metaKey) && !e.altKey;
  if (mod === 'ctrl') return e.ctrlKey && !e.metaKey && !e.altKey;
  if (mod === 'meta') return e.metaKey && !e.ctrlKey && !e.altKey;
  if (mod === 'shift') return e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey;
  if (mod === 'alt') return e.altKey && !e.ctrlKey && !e.metaKey;
  return false;
}

function _keysDispatch(e) {
  var tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  if (document.querySelector('.modal-overlay.open') && e.key !== 'Escape' && e.key !== '?') return;

  // Chord second key
  if (_keysChordPending) {
    var pending = _keysChordPending;
    _keysChordPending = null;
    clearTimeout(_keysChordTimer);
    var full = pending + ' ' + e.key.toLowerCase();
    var chordDefs = _keysRegistry.section.concat(_keysRegistry.global);
    for (var ci = 0; ci < chordDefs.length; ci++) {
      if (chordDefs[ci].chord === full) { e.preventDefault(); chordDefs[ci].action(e); return; }
    }
    return;
  }

  // Chord openers: any registered chord starting with this key
  var all = _keysRegistry.section.concat(_keysRegistry.global);
  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    var opensChord = all.some(function(d) { return d.chord && d.chord.split(' ')[0] === e.key.toLowerCase(); });
    if (opensChord) {
      _keysChordPending = e.key.toLowerCase();
      _keysChordTimer = setTimeout(function() { _keysChordPending = null; }, 1000);
      return;
    }
  }

  // Section defs take precedence over globals (spec: per-view overrides)
  for (var i = 0; i < all.length; i++) {
    var d = all[i];
    if (d.chord) continue;
    if (_keysMatch(d, e)) { e.preventDefault(); d.action(e); return; }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', _keysDispatch);
}

// ---- Global shortcuts (migrated from nbi-themes.js hardcoded listener) ----
function _keysRegisterGlobals() {
  registerShortcuts('global', [
    { key: '?', mod: null, label: 'Keyboard shortcuts help', category: 'Navigation',
      action: function() { showKeyboardShortcutHelp(); } },
    { key: '/', mod: null, label: 'Focus search', category: 'Navigation',
      action: function() {
        var search = document.querySelector('.search-input') || document.querySelector('input[placeholder*="Search"]');
        if (search) { search.focus(); search.select(); }
      } },
    { key: 'n', mod: null, label: 'New task (Projects view)', category: 'Editing',
      action: function() {
        if (currentView === 'tasks') {
          var addBtn = document.querySelector('[onclick*="openNewTask"], [onclick*="addTask"]');
          if (addBtn) addBtn.click();
        }
      } },
    { key: '[', mod: null, label: 'Toggle sidebar', category: 'Navigation',
      action: function() { toggleSidebarCollapse(); } },
    { key: 'Escape', mod: null, label: 'Close panel / deselect', category: 'Navigation',
      action: function(e) {
        if (typeof _ganttSelectedArrow !== 'undefined' && _ganttSelectedArrow) { deselectGanttArrow(); return; }
        if (typeof _ganttLinkMode !== 'undefined' && _ganttLinkMode) {
          _ganttLinkMode = false; _ganttLinkFrom = null;
          document.querySelectorAll('.gantt__bar.gantt-link-source').forEach(function(b) { b.classList.remove('gantt-link-source'); });
          var preview = document.getElementById('ganttLinkPreview');
          if (preview) preview.remove();
          renderContent(); return;
        }
        var panel = document.querySelector('.detail-panel.open');
        if (panel) { var close = panel.querySelector('.detail-panel__close'); if (close) close.click(); }
      } },
    { key: 'Delete', mod: null, label: 'Remove selected dependency (Gantt)', category: 'Editing',
      action: function() {
        if (typeof _ganttSelectedArrow === 'undefined' || !_ganttSelectedArrow) return;
        var fromId = _ganttSelectedArrow.fromId, toId = _ganttSelectedArrow.toId;
        var depTask = tasks.find(function(t) { return t.id === toId; });
        var prereqTask = tasks.find(function(t) { return t.id === fromId; });
        if (depTask && depTask.dependencies) {
          depTask.dependencies = depTask.dependencies.filter(function(d) { return d !== fromId; });
          updateTask(toId, 'dependencies', depTask.dependencies);
        }
        toast('Removed link: "' + (prereqTask && prereqTask.title || '?') + '" → "' + (depTask && depTask.title || '?') + '"');
        _ganttSelectedArrow = null;
      } },
    { key: 'Backspace', mod: null, label: 'Remove selected dependency (Gantt)', category: 'Editing',
      action: function() {
        if (typeof _ganttSelectedArrow === 'undefined' || !_ganttSelectedArrow) return;
        var fromId = _ganttSelectedArrow.fromId, toId = _ganttSelectedArrow.toId;
        var depTask = tasks.find(function(t) { return t.id === toId; });
        var prereqTask = tasks.find(function(t) { return t.id === fromId; });
        if (depTask && depTask.dependencies) {
          depTask.dependencies = depTask.dependencies.filter(function(d) { return d !== fromId; });
          updateTask(toId, 'dependencies', depTask.dependencies);
        }
        toast('Removed link: "' + (prereqTask && prereqTask.title || '?') + '" → "' + (depTask && depTask.title || '?') + '"');
        _ganttSelectedArrow = null;
      } },
    { key: '1', mod: null, label: 'Status: Not started (detail open)', category: 'Editing', action: function() { _keysSetStatus('Not started'); } },
    { key: '2', mod: null, label: 'Status: In progress (detail open)', category: 'Editing', action: function() { _keysSetStatus('In progress'); } },
    { key: '3', mod: null, label: 'Status: In Review (detail open)', category: 'Editing', action: function() { _keysSetStatus('In Review'); } },
    { key: '4', mod: null, label: 'Status: Done (detail open)', category: 'Editing', action: function() { _keysSetStatus('Done'); } },
    { chord: 'g d', label: 'Go to Dashboard', category: 'Navigation', action: function() { switchView('dashboard'); } },
    { chord: 'g t', label: 'Go to Projects', category: 'Navigation', action: function() { switchView('tasks'); } },
    { chord: 'g r', label: 'Go to Reporting', category: 'Navigation', action: function() { switchView('report'); } },
    { chord: 'g p', label: 'Go to People', category: 'Navigation', action: function() { switchView('people'); } },
    { chord: 'g f', label: 'Go to Finances', category: 'Navigation', action: function() { switchView('finances'); } },
    { chord: 'g l', label: 'Go to Leads', category: 'Navigation', action: function() { switchView('leads'); } },
    { chord: 'g e', label: 'Go to Expenses', category: 'Navigation', action: function() { switchView('expenses'); } },
    { chord: 'g s', label: 'Go to Settings', category: 'Navigation', action: function() { switchView('settings'); } },
    { chord: 'g m', label: 'Go to My Work', category: 'Navigation', action: function() {
        currentFilter = { client: null, project: null, status: null, health: null, search: '', sort: 'default', assignee: (typeof _currentUser !== 'undefined' && _currentUser && _currentUser.displayName) || '' };
        switchView('tasks');
      } },
  ]);
}

function _keysSetStatus(newStatus) {
  if (typeof activeDetailTaskId === 'undefined' || !activeDetailTaskId) return;
  updateTask(activeDetailTaskId, 'status', newStatus);
}

if (typeof document !== 'undefined') {
  // Register after all scripts load so referenced globals exist
  window.addEventListener('DOMContentLoaded', _keysRegisterGlobals);
  if (document.readyState !== 'loading') _keysRegisterGlobals();
}
