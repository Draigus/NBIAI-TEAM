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
