// ==================== INLINE EDITING ENGINE ====================
// Foundation 5. Makes any element editable in place.
// API: inlineEdit(el, opts) — see spec Part 1 Foundation 5.
// Editors swap the element's content for an input; Enter/blur saves,
// Escape cancels, Tab saves and moves to the next editable field in
// the same [data-inline-row].

var _inlineActive = null; // { el, opts, editor, originalHtml }

function inlineEdit(el, opts) {
  if (!el || !opts || !opts.field) return;
  el.setAttribute('data-inline', opts.field);
  el.classList.add('inline-editable');
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.addEventListener('dblclick', function(e) { e.preventDefault(); _inlineActivate(el, opts); });
  el.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !_inlineActive) { e.preventDefault(); _inlineActivate(el, opts); }
  });
}

function _inlineActivate(el, opts) {
  if (_inlineActive) _inlineCommit();
  var editor = _inlineBuildEditor(opts);
  _inlineActive = { el: el, opts: opts, editor: editor, originalHtml: el.innerHTML };
  el.innerHTML = '';
  el.appendChild(editor.node);
  el.classList.add('inline-editing');
  var input = editor.focusEl;
  input.focus();
  if (opts.selectOnFocus !== false && input.select) input.select();

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); _inlineCancel(); }
    else if (e.key === 'Enter' && opts.type !== 'combobox') { e.preventDefault(); e.stopPropagation(); _inlineCommit(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      var row = el.closest('[data-inline-row]');
      _inlineCommit();
      if (row) _inlineFocusSibling(row, el, e.shiftKey ? -1 : 1);
    }
  });
  input.addEventListener('blur', function() {
    // Give click-on-dropdown-option a beat before committing
    setTimeout(function() { if (_inlineActive && _inlineActive.el === el) _inlineCommit(); }, 150);
  });
}

function _inlineCommit() {
  if (!_inlineActive) return;
  var a = _inlineActive;
  _inlineActive = null;
  var newValue = a.editor.getValue();
  a.el.classList.remove('inline-editing');
  if (newValue !== null && String(newValue) !== String(a.opts.value)) {
    if (a.el.closest('[data-inline-row]') && a.opts.batch !== false) {
      _inlineBatchAdd(a.el.closest('[data-inline-row]'), a.opts, newValue);
      a.el.textContent = a.editor.displayValue(newValue);
    } else {
      a.el.textContent = a.editor.displayValue(newValue);
      if (typeof a.opts.onSave === 'function') a.opts.onSave(a.opts.field, newValue);
    }
    a.opts.value = newValue;
  } else {
    a.el.innerHTML = a.originalHtml;
    if (typeof a.opts.onCancel === 'function' && newValue === null) a.opts.onCancel();
  }
}

function _inlineCancel() {
  if (!_inlineActive) return;
  var a = _inlineActive;
  _inlineActive = null;
  a.el.classList.remove('inline-editing');
  a.el.innerHTML = a.originalHtml;
  if (typeof a.opts.onCancel === 'function') a.opts.onCancel();
  a.el.focus();
}

function _inlineFocusSibling(row, fromEl, dir) {
  var fields = Array.prototype.slice.call(row.querySelectorAll('[data-inline]'));
  var idx = fields.indexOf(fromEl);
  var next = fields[idx + dir];
  if (next) {
    var evt = new Event('dblclick', { bubbles: false });
    next.dispatchEvent(evt);
  }
}

function _inlineBuildEditor(opts) {
  switch (opts.type) {
    case 'date':     return _inlineEditorDate(opts);
    case 'select':   return _inlineEditorSelect(opts);
    case 'combobox': return _inlineEditorCombobox(opts);
    case 'number':   return _inlineEditorNumber(opts);
    default:         return _inlineEditorText(opts);
  }
}

function _inlineEditorText(opts) {
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-input';
  input.value = opts.value != null ? opts.value : '';
  input.placeholder = opts.placeholder || '';
  return {
    node: input,
    focusEl: input,
    getValue: function() { return input.value.trim(); },
    displayValue: function(v) { return v || (opts.placeholder || ''); }
  };
}

function _inlineEditorDate(opts) {
  var input = document.createElement('input');
  input.type = 'date';
  input.className = 'inline-input';
  input.value = opts.value || '';
  return {
    node: input,
    focusEl: input,
    getValue: function() { return input.value; },
    displayValue: function(v) { return v ? formatDate(v) : (opts.placeholder || 'No date'); }
  };
}

function _inlineEditorSelect(opts) {
  var select = document.createElement('select');
  select.className = 'inline-input';
  (opts.options || []).forEach(function(o) {
    var opt = document.createElement('option');
    opt.value = o.value != null ? o.value : o;
    opt.textContent = o.label != null ? o.label : o;
    if (String(opt.value) === String(opts.value)) opt.selected = true;
    select.appendChild(opt);
  });
  return {
    node: select,
    focusEl: select,
    getValue: function() { return select.value; },
    displayValue: function(v) {
      var match = (opts.options || []).find(function(o) { return String(o.value != null ? o.value : o) === String(v); });
      return match ? (match.label != null ? match.label : match) : v;
    }
  };
}

function _inlineEditorNumber(opts) {
  var input = document.createElement('input');
  input.type = 'number';
  input.className = 'inline-input';
  input.value = opts.value != null ? opts.value : '';
  if (opts.min !== undefined) input.min = opts.min;
  if (opts.max !== undefined) input.max = opts.max;
  if (opts.step !== undefined) input.step = opts.step;
  return {
    node: input,
    focusEl: input,
    getValue: function() {
      if (input.value === '') return '';
      var n = parseFloat(input.value);
      if (isNaN(n)) return null;
      if (opts.min !== undefined && n < opts.min) n = opts.min;
      if (opts.max !== undefined && n > opts.max) n = opts.max;
      return n;
    },
    displayValue: function(v) { return v === '' ? (opts.placeholder || '') : String(v); }
  };
}

function _inlineEditorCombobox(opts) { return _inlineEditorText(opts); }

// Batch save: while editing fields inside a [data-inline-row], changes
// accumulate and flush in one onFlush(changes) call when focus leaves
// the row. Register rows with inlineRow(rowEl, { onFlush }).
var _inlineBatches = new WeakMap();

function inlineRow(rowEl, opts) {
  rowEl.setAttribute('data-inline-row', '1');
  _inlineBatches.set(rowEl, { changes: {}, onFlush: opts.onFlush });
  rowEl.addEventListener('focusout', function(e) {
    if (rowEl.contains(e.relatedTarget)) return;
    setTimeout(function() {
      if (rowEl.contains(document.activeElement)) return;
      _inlineBatchFlush(rowEl);
    }, 180);
  });
}

function _inlineBatchAdd(rowEl, opts, value) {
  var batch = _inlineBatches.get(rowEl);
  if (!batch) { if (typeof opts.onSave === 'function') opts.onSave(opts.field, value); return; }
  batch.changes[opts.field] = value;
}

function _inlineBatchFlush(rowEl) {
  var batch = _inlineBatches.get(rowEl);
  if (!batch || Object.keys(batch.changes).length === 0) return;
  var changes = batch.changes;
  batch.changes = {};
  if (typeof batch.onFlush === 'function') batch.onFlush(changes);
}
