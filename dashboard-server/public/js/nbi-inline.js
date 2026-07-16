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

// Placeholder editors — implemented in Task 2 and Task 3
function _inlineEditorDate(opts) { return _inlineEditorText(opts); }
function _inlineEditorSelect(opts) { return _inlineEditorText(opts); }
function _inlineEditorCombobox(opts) { return _inlineEditorText(opts); }
function _inlineEditorNumber(opts) { return _inlineEditorText(opts); }

// Batch save — implemented in Task 2
var _inlineBatches = new WeakMap();
function _inlineBatchAdd(rowEl, opts, value) {
  if (typeof opts.onSave === 'function') opts.onSave(opts.field, value);
}
