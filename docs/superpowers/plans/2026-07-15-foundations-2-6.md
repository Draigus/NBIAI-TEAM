# Foundations 2-6 Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the five remaining cross-cutting foundation modules — Inline Editing, Grouping, Keyboard Shortcuts, Saved Views, and Help/Onboarding — that the 11 section upgrades (Plans 3-5) depend on.

**Architecture:** Five standalone global-scope JS modules following the existing no-build convention (traditional script tags, global functions, `data-action` event delegation). Saved Views adds one backend route file + one migration. Help/Onboarding adds a per-user preferences column + two endpoints on the existing users route. The keyboard system replaces the hardcoded listener in `nbi-themes.js` with a registry.

**Tech Stack:** Vanilla JS (global scope, no IIFEs), Express 4 + pg, Vitest + supertest, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-15-worksage-9of10-design.md` — Part 1, Foundations 2-6

**Implementation order** (per spec Phase 1): Foundation 5 (Inline) → Foundation 6 (Group) → Foundation 3 (Keys) → Foundation 2 (Views) → Foundation 4 (Help/Onboarding).

## Spec corrections (verified against the live codebase 2026-07-15)

These override the spec where they conflict:

1. **`users.id` is UUID, not INTEGER.** Verified via information_schema on the test DB. The spec's `user_id INTEGER REFERENCES users(id)` would fail. All FK columns in this plan use UUID.
2. **There is no existing Cmd+K command palette.** The spec says Foundation 3 "extends the existing Cmd+K palette"; what actually exists is a hardcoded `document.addEventListener('keydown', ...)` in `nbi-themes.js:292-377` (keys: `?`, `/`, `n`, `[`, `Escape`, `1-4`, `g`-chords) plus a static help modal `showKeyboardShortcutHelp()` at `nbi-themes.js:258`. Foundation 3 builds the registry and migrates those shortcuts into it.
3. **Migration numbers:** last committed migration is `081`. This plan creates `082_user_views.sql` and `083_user_ui_prefs.sql`. The spec's table (082-086) listed migrations for section-specific tables (news_read_state, document_comments, user_skills, user_pins) — those belong to Plans 3-5 and take the next free numbers when they land.
4. **No per-user server-side preferences mechanism exists.** The `settings` table is global and admin-write-only. The spec requires `tour_completed` / `setup_completed` stored server-side per user, so this plan adds `users.ui_prefs JSONB` + `GET/PATCH /api/me/prefs` (in `routes/users.js`, not a new file).
5. **The standup view's "bespoke inline editing"** referenced by the spec is minimal (a collapsible section). Foundation 5 is built from scratch to the spec's API; the standup migration happens in Plan 3 (Dashboard upgrade).

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/public/js/nbi-inline.js` | Create | Inline editing engine: `inlineEdit()`, 5 editor types, Tab row navigation, batch save |
| `dashboard-server/public/js/nbi-group.js` | Create | Grouping engine: `groupItems()`, group header rendering, collapse persistence |
| `dashboard-server/public/js/nbi-keys.js` | Create | Shortcut registry: `registerShortcuts()`, dispatcher, chords, help overlay, key badges |
| `dashboard-server/public/js/nbi-views.js` | Create | Saved views: dropdown UI, apply/save/save-as/manage, dirty indicator |
| `dashboard-server/public/js/nbi-help.js` | Create | Tour engine, setup wizard, on-demand help mode |
| `dashboard-server/public/js/nbi-help-content.js` | Create | Selector → help card content map (initial entries; full content in Plan 6) |
| `dashboard-server/routes/views.js` | Create | Saved views CRUD API |
| `dashboard-server/routes/users.js` | Modify | Add `GET/PATCH /api/me/prefs` |
| `dashboard-server/migrations/082_user_views.sql` | Create | user_views table (UUID FKs) |
| `dashboard-server/migrations/083_user_ui_prefs.sql` | Create | ui_prefs JSONB on users |
| `dashboard-server/server.js` | Modify | Register routes/views.js |
| `dashboard-server/public/js/nbi-themes.js` | Modify | Remove hardcoded shortcut listener + old help modal (migrated to nbi-keys.js) |
| `dashboard-server/public/js/views/nbi-tasks.js` | Modify | Reference integration: Views dropdown in the tasks filter bar |
| `dashboard-server/public/css/dashboard.css` | Modify | Component styles: inline editors, group headers, views dropdown, tour, wizard, help cards, key badges |
| `nbi_project_dashboard.html` | Modify | Script tags for the 6 new JS files |
| `dashboard-server/tests/unit/group-engine.test.mjs` | Create | groupItems pure-function tests |
| `dashboard-server/tests/unit/keys-match.test.mjs` | Create | Shortcut matching pure-function tests |
| `dashboard-server/tests/unit/views-api.test.mjs` | Create | Saved views CRUD API tests (supertest) |
| `dashboard-server/tests/unit/me-prefs.test.mjs` | Create | /api/me/prefs tests (supertest) |
| `dashboard-server/tests/e2e/foundations.spec.js` | Create | E2E: inline editing, shortcuts overlay, views dropdown, tour, help mode |

**Script tag order** in `nbi_project_dashboard.html` (after `nbi-charts.js?v=2`, line 332): nbi-inline, nbi-group, nbi-keys, nbi-views, nbi-help-content, nbi-help. All are libraries consumed by view files that load later.

**Convention reminders for the implementing engineer:**
- No IIFEs, no modules. Bare `function name() {}` and `var`/`let` at top level. `let`/`const` do NOT attach to `window` — reference by bare name.
- Event handlers on rendered HTML use `data-action="fnName"` delegation (see `nbi-events.js`) or inline `onclick`. Follow whichever the surrounding code uses.
- `apiCall(path, opts)` (from `nbi-api.js`) is the fetch wrapper — session cookie auth, returns parsed JSON.
- `esc(str)` HTML-escapes. `toast(msg)` shows a toast. `_debounce(fn, ms)` exists in `nbi-utils.js`.
- E2E tests must log in first — copy the `login(page)` helper pattern from `tests/e2e/charts.spec.js`.
- Unit tests run against the test DB via supertest: see `tests/unit/calendar-visibility-ambiguous.test.mjs` for the canonical shape (`truncate()` in beforeEach, fixtures, `mintSession`).
- British English in all UI copy. No em dashes.

---

### Task 1: Inline Editing Engine — core + text editor

**Files:**
- Create: `dashboard-server/public/js/nbi-inline.js`
- Modify: `nbi_project_dashboard.html` (script tag)

- [ ] **Step 1: Create nbi-inline.js with the activation core and text editor**

```javascript
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
    else if (e.key === 'Enter' && opts.type !== 'combobox') { e.preventDefault(); _inlineCommit(); }
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
```

- [ ] **Step 2: Add script tags to nbi_project_dashboard.html**

After the `nbi-charts.js?v=2` line, add all six foundation script tags at once (the remaining files are created in later tasks; browsers ignore 404 script tags with a console error, so create empty files for the other five now to keep the page clean):

```html
<script src="/public/js/nbi-inline.js?v=1"></script>
<script src="/public/js/nbi-group.js?v=1"></script>
<script src="/public/js/nbi-keys.js?v=1"></script>
<script src="/public/js/nbi-views.js?v=1"></script>
<script src="/public/js/nbi-help-content.js?v=1"></script>
<script src="/public/js/nbi-help.js?v=1"></script>
```

Create the five other files each containing only a header comment (they are filled in by their tasks):

```javascript
// ==================== GROUPING ENGINE ====================  (nbi-group.js)
// ==================== KEYBOARD SHORTCUTS ====================  (nbi-keys.js)
// ==================== SAVED VIEWS ====================  (nbi-views.js)
// ==================== HELP CONTENT ====================  (nbi-help-content.js)
// ==================== HELP & ONBOARDING ====================  (nbi-help.js)
```

- [ ] **Step 3: Add inline editing CSS to dashboard.css**

Append to the components section of `dashboard-server/public/css/dashboard.css`:

```css
/* ===== INLINE EDITING (Foundation 5) ===== */
.inline-editable { position: relative; cursor: text; border-radius: var(--radius-sm); }
.inline-editable:hover { background: var(--bg-hover); }
.inline-editable:hover::after { content: '✎'; position: absolute; right: 2px; top: 50%; transform: translateY(-50%); font-size: 10px; color: var(--text-muted); opacity: 0.7; }
.inline-editing { background: var(--bg-input); }
.inline-editing:hover::after { content: none; }
.inline-input { width: 100%; min-width: 60px; background: var(--bg-input); border: 1px solid var(--accent-border); border-radius: var(--radius-sm); color: var(--text-primary); font: inherit; padding: 2px 6px; outline: none; }
.inline-input:focus { border-color: var(--accent); }
```

- [ ] **Step 4: Verify in browser**

Restart PM2 (`pm2 restart nbi-dashboard`), open http://localhost:8888/nbi_project_dashboard.html, run in console:

```javascript
var d = document.createElement('div');
d.textContent = 'Double-click me';
d.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:8px;background:var(--bg-card);border:1px solid var(--border-default)';
document.body.appendChild(d);
inlineEdit(d, { field: 'title', type: 'text', value: 'Double-click me', onSave: (f, v) => console.log('SAVED', f, v) });
```

Expected: double-click swaps to an input, typing + Enter logs `SAVED title <newvalue>`, Escape restores the original text.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-inline.js dashboard-server/public/js/nbi-group.js dashboard-server/public/js/nbi-keys.js dashboard-server/public/js/nbi-views.js dashboard-server/public/js/nbi-help.js dashboard-server/public/js/nbi-help-content.js nbi_project_dashboard.html dashboard-server/public/css/dashboard.css
git commit -m "feat(inline): inline editing engine core with text editor (Foundation 5)"
```

---

### Task 2: Inline Editing — date/select/number editors + row batch save

**Files:**
- Modify: `dashboard-server/public/js/nbi-inline.js`

- [ ] **Step 1: Replace the placeholder editors**

```javascript
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
```

Note: `formatDate` already exists in `nbi-utils.js` — verify with `grep -n "function formatDate" dashboard-server/public/js/nbi-utils.js` before relying on it; if the signature differs, adapt the display call.

- [ ] **Step 2: Replace the batch save stub with the row collector**

```javascript
// Batch save: while editing fields inside a [data-inline-row], changes
// accumulate and flush in one onFlush(changes) call when focus leaves
// the row. Register rows with inlineRow(rowEl, { onFlush }).
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
```

- [ ] **Step 3: Verify in browser**

Restart PM2, then in the console build a row with two fields and confirm: Tab moves between them, both edits arrive in ONE flush call after clicking elsewhere:

```javascript
var row = document.createElement('div');
row.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:8px;background:var(--bg-card);display:flex;gap:12px';
var f1 = document.createElement('span'); f1.textContent = 'Title A'; row.appendChild(f1);
var f2 = document.createElement('span'); f2.textContent = '5'; row.appendChild(f2);
document.body.appendChild(row);
inlineRow(row, { onFlush: (changes) => console.log('FLUSH', changes) });
inlineEdit(f1, { field: 'title', type: 'text', value: 'Title A' });
inlineEdit(f2, { field: 'hours', type: 'number', value: 5, min: 0 });
```

Expected: edit title, Tab (moves to hours editor), change number, click outside → single `FLUSH {title: ..., hours: ...}` log.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/public/js/nbi-inline.js
git commit -m "feat(inline): date/select/number editors and row batch save"
```

---

### Task 3: Inline Editing — combobox editor

**Files:**
- Modify: `dashboard-server/public/js/nbi-inline.js`

- [ ] **Step 1: Replace the combobox placeholder**

```javascript
function _inlineEditorCombobox(opts) {
  var wrap = document.createElement('div');
  wrap.className = 'inline-combobox';
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-input';
  input.value = opts.value != null ? opts.value : '';
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  var list = document.createElement('div');
  list.className = 'inline-combobox__list';
  wrap.appendChild(input);
  wrap.appendChild(list);

  var options = (opts.options || []).map(function(o) {
    return { value: o.value != null ? o.value : o, label: o.label != null ? o.label : String(o) };
  });
  var highlighted = -1;
  var committed = null;

  function renderList() {
    var q = input.value.toLowerCase();
    var matches = options.filter(function(o) { return o.label.toLowerCase().includes(q); }).slice(0, 8);
    list.innerHTML = matches.map(function(o, i) {
      return '<div class="inline-combobox__opt' + (i === highlighted ? ' is-active' : '') + '" data-value="' + esc(String(o.value)) + '">' + esc(o.label) + '</div>';
    }).join('');
    list.style.display = matches.length ? 'block' : 'none';
    input.setAttribute('aria-expanded', matches.length ? 'true' : 'false');
    Array.prototype.forEach.call(list.children, function(el, i) {
      el.addEventListener('mousedown', function(e) {
        e.preventDefault(); // fires before input blur
        committed = matches[i].value;
        input.value = matches[i].label;
        _inlineCommit();
      });
    });
    return matches;
  }

  input.addEventListener('input', function() { highlighted = -1; renderList(); });
  input.addEventListener('keydown', function(e) {
    var matches = options.filter(function(o) { return o.label.toLowerCase().includes(input.value.toLowerCase()); }).slice(0, 8);
    if (e.key === 'ArrowDown') { e.preventDefault(); highlighted = Math.min(highlighted + 1, matches.length - 1); renderList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlighted = Math.max(highlighted - 1, 0); renderList(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && matches[highlighted]) { committed = matches[highlighted].value; input.value = matches[highlighted].label; }
      else if (matches.length === 1) { committed = matches[0].value; input.value = matches[0].label; }
      _inlineCommit();
    }
  });
  setTimeout(renderList, 0);

  return {
    node: wrap,
    focusEl: input,
    getValue: function() {
      if (committed !== null) return committed;
      var exact = options.find(function(o) { return o.label.toLowerCase() === input.value.trim().toLowerCase(); });
      return exact ? exact.value : (opts.allowFreeText ? input.value.trim() : null);
    },
    displayValue: function(v) {
      var match = options.find(function(o) { return String(o.value) === String(v); });
      return match ? match.label : String(v);
    }
  };
}
```

- [ ] **Step 2: Add combobox CSS to dashboard.css**

```css
.inline-combobox { position: relative; display: inline-block; min-width: 140px; }
.inline-combobox__list { position: absolute; top: 100%; left: 0; right: 0; z-index: 200; background: var(--bg-raised); border: 1px solid var(--border-default); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); max-height: 200px; overflow-y: auto; display: none; }
.inline-combobox__opt { padding: 5px 10px; cursor: pointer; font-size: 13px; }
.inline-combobox__opt:hover, .inline-combobox__opt.is-active { background: var(--bg-hover); color: var(--accent-text); }
```

- [ ] **Step 3: Verify in browser**

Restart PM2. Console test: a combobox with `options: [{value:'u1',label:'Glen'},{value:'u2',label:'Tom'},{value:'u3',label:'Magnus'}]` — typing "ma" narrows to Magnus, ArrowDown+Enter selects it, onSave receives `u3`.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/public/js/nbi-inline.js dashboard-server/public/css/dashboard.css
git commit -m "feat(inline): combobox typeahead editor"
```

---

### Task 4: Grouping Engine — groupItems() with unit tests

**Files:**
- Modify: `dashboard-server/public/js/nbi-group.js`
- Create: `dashboard-server/tests/unit/group-engine.test.mjs`

- [ ] **Step 1: Write the failing unit tests**

The engine's core is a pure function, so we test it directly in Node by extracting it. Structure `nbi-group.js` so `groupItems` has no DOM dependencies, and load it in the test via `fs.readFileSync` + `eval` in a sandbox (the codebase has no module exports — this is the established pattern for testing browser globals; if no prior example exists, `new Function` with the file source + return statement is acceptable and self-contained):

```javascript
// dashboard-server/tests/unit/group-engine.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(__dirname, '../../public/js/nbi-group.js'), 'utf8');
const groupItems = new Function(src + '; return groupItems;')();

describe('groupItems', () => {
  const items = [
    { id: 1, assignee: 'Glen', hours: 4, status: 'Done' },
    { id: 2, assignee: 'Tom', hours: 2, status: 'In progress' },
    { id: 3, assignee: 'Glen', hours: 6, status: 'In progress' },
    { id: 4, assignee: null, hours: 1, status: 'Done' },
  ];

  it('groups by field with counts', () => {
    const groups = groupItems(items, { field: 'assignee' });
    const glen = groups.find(g => g.key === 'Glen');
    expect(glen.items.length).toBe(2);
    expect(glen.stats.count).toBe(2);
  });

  it('puts empty values under emptyLabel', () => {
    const groups = groupItems(items, { field: 'assignee', emptyLabel: 'Unassigned' });
    const empty = groups.find(g => g.label === 'Unassigned');
    expect(empty.items.map(i => i.id)).toEqual([4]);
  });

  it('sorts groups by count-desc', () => {
    const groups = groupItems(items, { field: 'assignee', sort: 'count-desc' });
    expect(groups[0].key).toBe('Glen');
  });

  it('sorts groups alphabetically', () => {
    const groups = groupItems(items, { field: 'assignee', sort: 'alpha', emptyLabel: 'Unassigned' });
    expect(groups.map(g => g.label)).toEqual(['Glen', 'Tom', 'Unassigned']);
  });

  it('computes custom aggregates', () => {
    const groups = groupItems(items, {
      field: 'assignee',
      aggregate: (its) => ({ hours: its.reduce((s, i) => s + i.hours, 0), done: its.filter(i => i.status === 'Done').length })
    });
    const glen = groups.find(g => g.key === 'Glen');
    expect(glen.stats.hours).toBe(10);
    expect(glen.stats.done).toBe(1);
  });

  it('supports a getValue accessor for nested fields', () => {
    const nested = [{ meta: { team: 'A' } }, { meta: { team: 'B' } }, { meta: { team: 'A' } }];
    const groups = groupItems(nested, { getValue: i => i.meta.team, sort: 'count-desc' });
    expect(groups[0].key).toBe('A');
    expect(groups[0].stats.count).toBe(2);
  });

  it('returns empty array for empty input', () => {
    expect(groupItems([], { field: 'x' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/group-engine.test.mjs`
Expected: FAIL (`groupItems is not defined` or similar)

- [ ] **Step 3: Implement groupItems in nbi-group.js**

```javascript
// ==================== GROUPING ENGINE ====================
// Foundation 6. groupItems is pure (no DOM) so it can be unit-tested.
// Rendering helpers live below it.

function groupItems(items, opts) {
  if (!items || items.length === 0) return [];
  opts = opts || {};
  var getValue = opts.getValue || function(it) { return it[opts.field]; };
  var emptyLabel = opts.emptyLabel || 'None';

  var map = new Map();
  items.forEach(function(it) {
    var raw = getValue(it);
    var key = (raw === null || raw === undefined || raw === '') ? '__empty__' : String(raw);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  });

  var groups = [];
  map.forEach(function(groupedItems, key) {
    var label = key === '__empty__' ? emptyLabel : key;
    var stats = { count: groupedItems.length };
    if (typeof opts.aggregate === 'function') {
      var extra = opts.aggregate(groupedItems);
      for (var k in extra) stats[k] = extra[k];
    }
    groups.push({ key: key === '__empty__' ? label : key, label: label, items: groupedItems, stats: stats });
  });

  var sort = opts.sort || 'alpha';
  if (sort === 'alpha') groups.sort(function(a, b) { return a.label.localeCompare(b.label); });
  else if (sort === 'count-asc') groups.sort(function(a, b) { return a.stats.count - b.stats.count; });
  else if (sort === 'count-desc') groups.sort(function(a, b) { return b.stats.count - a.stats.count; });
  else if (sort === 'custom' && Array.isArray(opts.customOrder)) {
    groups.sort(function(a, b) {
      var ai = opts.customOrder.indexOf(a.key); var bi = opts.customOrder.indexOf(b.key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }
  return groups;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/unit/group-engine.test.mjs`
Expected: 7 PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-group.js dashboard-server/tests/unit/group-engine.test.mjs
git commit -m "feat(group): grouping engine groupItems with sort modes and aggregates"
```

---

### Task 5: Grouping Engine — header rendering + collapse persistence + dropdown builder

**Files:**
- Modify: `dashboard-server/public/js/nbi-group.js`
- Modify: `dashboard-server/public/css/dashboard.css`
- Modify: `dashboard-server/public/js/nbi-events.js` (register toggle action)

- [ ] **Step 1: Add the rendering helpers below groupItems**

```javascript
// ---- Rendering (DOM side) ----

function groupCollapsed(section, groupKey) {
  return localStorage.getItem('groupCollapsed:' + section + ':' + groupKey) === '1';
}

function toggleGroupCollapse(section, groupKey) {
  var cur = groupCollapsed(section, groupKey);
  localStorage.setItem('groupCollapsed:' + section + ':' + groupKey, cur ? '0' : '1');
  var header = document.querySelector('.group-header[data-group-key="' + CSS.escape(groupKey) + '"][data-group-section="' + CSS.escape(section) + '"]');
  if (header) {
    var body = header.nextElementSibling;
    var nowCollapsed = !cur;
    header.setAttribute('data-collapsed', String(nowCollapsed));
    header.setAttribute('aria-expanded', String(!nowCollapsed));
    if (body && body.classList.contains('group-body')) body.style.display = nowCollapsed ? 'none' : '';
  }
}

/** Header row HTML for one group. Extra stats render as label:value chips.
 *  completionPct (0-100) renders as a mini progress bar when present. */
function renderGroupHeader(section, group) {
  var collapsed = groupCollapsed(section, group.key);
  var statsHtml = '<span class="group-header__count">' + group.stats.count + '</span>';
  if (group.stats.hours !== undefined) statsHtml += '<span class="group-header__stat">' + group.stats.hours + 'h</span>';
  if (group.stats.completionPct !== undefined) {
    statsHtml += '<span class="group-header__bar" title="' + Math.round(group.stats.completionPct) + '% complete"><span class="group-header__bar-fill" style="width:' + Math.round(group.stats.completionPct) + '%"></span></span>';
  }
  return '<button type="button" class="group-header" data-collapsed="' + collapsed + '" aria-expanded="' + !collapsed + '"' +
    ' data-group-key="' + esc(group.key) + '" data-group-section="' + esc(section) + '"' +
    ' data-action="_actToggleGroupCollapse" data-arg0="' + esc(section) + '" data-arg1="' + esc(group.key) + '">' +
    '<span class="group-header__chevron">' + (collapsed ? '▶' : '▼') + '</span>' +
    '<span class="group-header__label">' + esc(group.label) + '</span>' + statsHtml + '</button>';
}

/** Group-by <select> for a filter bar. onchange must be provided by the
 *  section (it owns its state + re-render). */
function buildGroupByDropdown(options, current, onchangeAttr) {
  var html = '<select class="group-by-select" aria-label="Group by" onchange="' + onchangeAttr + '">';
  html += '<option value="">Group: None</option>';
  options.forEach(function(o) {
    html += '<option value="' + esc(o.value) + '"' + (current === o.value ? ' selected' : '') + '>Group: ' + esc(o.label) + '</option>';
  });
  return html + '</select>';
}
```

- [ ] **Step 2: Register the delegated action**

In `nbi-events.js`, find the action dispatch table/switch (grep `data-action` handling — actions are plain global function names resolved via `data-action="fnName"`). Add a thin wrapper next to the other `_act*` functions:

```javascript
function _actToggleGroupCollapse(section, groupKey) { toggleGroupCollapse(section, groupKey); }
```

If actions resolve by bare global name automatically, this wrapper is all that is needed — verify by reading the dispatcher before adding anything else.

- [ ] **Step 3: Add group CSS**

```css
/* ===== GROUPING (Foundation 6) ===== */
.group-header { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 10px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 13px; font-weight: 600; cursor: pointer; margin: 8px 0 4px; text-align: left; }
.group-header:hover { background: var(--bg-hover); }
.group-header__chevron { font-size: 10px; color: var(--text-muted); width: 12px; }
.group-header__count { background: var(--bg-input); border-radius: 10px; padding: 1px 8px; font-size: 11px; color: var(--text-secondary); font-family: var(--font-mono); }
.group-header__stat { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
.group-header__bar { width: 60px; height: 5px; background: var(--bg-input); border-radius: 3px; overflow: hidden; margin-left: auto; }
.group-header__bar-fill { display: block; height: 100%; background: var(--success); border-radius: 3px; }
.group-by-select { min-width: 110px; }
```

- [ ] **Step 4: Verify in browser**

Restart PM2. Console: `groupItems([{a:'x'},{a:'x'},{a:'y'}], {field:'a', sort:'count-desc'})` returns 2 groups, x first. Inject `renderGroupHeader('test', groups[0])` into a container and confirm the header renders and the chevron toggles on click (collapse state persists across reload via localStorage).

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-group.js dashboard-server/public/js/nbi-events.js dashboard-server/public/css/dashboard.css
git commit -m "feat(group): group headers with collapse persistence and group-by dropdown builder"
```

---

### Task 6: Keyboard Shortcuts — registry + matcher with unit tests

**Files:**
- Modify: `dashboard-server/public/js/nbi-keys.js`
- Create: `dashboard-server/tests/unit/keys-match.test.mjs`

- [ ] **Step 1: Write the failing matcher tests**

```javascript
// dashboard-server/tests/unit/keys-match.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(__dirname, '../../public/js/nbi-keys.js'), 'utf8');
const matchShortcut = new Function(src + '; return _keysMatch;')();

function ev(key, mods = {}) {
  return { key, ctrlKey: !!mods.ctrl, metaKey: !!mods.meta, shiftKey: !!mods.shift, altKey: !!mods.alt };
}

describe('_keysMatch', () => {
  it('matches a bare key with no modifiers', () => {
    expect(matchShortcut({ key: 'n', mod: null }, ev('n'))).toBe(true);
    expect(matchShortcut({ key: 'n', mod: null }, ev('n', { ctrl: true }))).toBe(false);
  });

  it('matches mod as ctrl OR meta (cross-platform)', () => {
    expect(matchShortcut({ key: 'k', mod: 'mod' }, ev('k', { ctrl: true }))).toBe(true);
    expect(matchShortcut({ key: 'k', mod: 'mod' }, ev('k', { meta: true }))).toBe(true);
    expect(matchShortcut({ key: 'k', mod: 'mod' }, ev('k'))).toBe(false);
  });

  it('matches specific modifiers', () => {
    expect(matchShortcut({ key: 'z', mod: 'ctrl' }, ev('z', { ctrl: true }))).toBe(true);
    expect(matchShortcut({ key: 'z', mod: 'ctrl' }, ev('z', { meta: true }))).toBe(false);
    expect(matchShortcut({ key: 'S', mod: 'shift' }, ev('S', { shift: true }))).toBe(true);
  });

  it('is case-insensitive on the key', () => {
    expect(matchShortcut({ key: 'N', mod: null }, ev('n'))).toBe(true);
  });

  it('? matches without treating shift as a modifier mismatch', () => {
    expect(matchShortcut({ key: '?', mod: null }, ev('?', { shift: true }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/keys-match.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement the registry and dispatcher in nbi-keys.js**

```javascript
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
```

Note the `typeof document` guard — it lets the unit test evaluate the file in Node without a DOM.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/unit/keys-match.test.mjs`
Expected: 5 PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-keys.js dashboard-server/tests/unit/keys-match.test.mjs
git commit -m "feat(keys): shortcut registry, matcher, and chord dispatcher (Foundation 3)"
```

---

### Task 7: Keyboard Shortcuts — migrate existing shortcuts out of nbi-themes.js

**Files:**
- Modify: `dashboard-server/public/js/nbi-keys.js`
- Modify: `dashboard-server/public/js/nbi-themes.js:291-377` (delete the hardcoded listener)

- [ ] **Step 1: Register the existing global shortcuts in nbi-keys.js**

Append to `nbi-keys.js`. Every action body is lifted verbatim from the old listener in `nbi-themes.js:292-377` — read that code side by side while writing this and keep behaviour identical (including the Gantt guards):

```javascript
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
```

Ordering caveat: `nbi-keys.js` loads BEFORE the view files that define `_ganttSelectedArrow`, `switchView`, etc. All references are inside action closures that only run on keypress, and the registration itself runs at DOMContentLoaded — both after every script has loaded. The `typeof X !== 'undefined'` guards protect the Gantt globals that only exist once nbi-gantt.js has run.

- [ ] **Step 2: Delete the old hardcoded listener from nbi-themes.js**

Remove the entire `document.addEventListener('keydown', function(e) { ... })` block at `nbi-themes.js:291-377` (the one beginning with the `// ===== KEYBOARD SHORTCUTS =====` comment). Leave `showKeyboardShortcutHelp()` in place for now — Task 8 replaces it. Leave the two accessibility keydown listeners (lines ~219-230 and ~382-390) untouched — they are not shortcuts.

- [ ] **Step 3: Verify no other code depended on the removed block**

Run: `grep -n "showKeyboardShortcutHelp" dashboard-server/public/js/*.js dashboard-server/public/js/views/*.js dashboard-server/public/js/domains/*.js nbi_project_dashboard.html`
Expected: the definition in nbi-themes.js, the call in nbi-keys.js globals, plus any help-icon button — all still resolve.

- [ ] **Step 4: Verify in browser**

Restart PM2, hard-reload. Test each migrated shortcut manually: `?` opens help, `/` focuses search, `[` collapses sidebar, `g` then `d` navigates to Dashboard, `g` then `t` to Projects, Escape closes an open detail panel, `1-4` change status with a detail open. Also confirm typing `g` inside the search input does NOT trigger the chord.

- [ ] **Step 5: Bump nbi-themes.js cache-buster in nbi_project_dashboard.html** (`?v=2` → `?v=3`)

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/public/js/nbi-keys.js dashboard-server/public/js/nbi-themes.js nbi_project_dashboard.html
git commit -m "feat(keys): migrate global shortcuts from nbi-themes hardcoded listener to registry"
```

---

### Task 8: Keyboard Shortcuts — registry-driven help overlay + key badges

**Files:**
- Modify: `dashboard-server/public/js/nbi-keys.js`
- Modify: `dashboard-server/public/js/nbi-themes.js` (delete old `showKeyboardShortcutHelp`)
- Modify: `dashboard-server/public/css/dashboard.css`

- [ ] **Step 1: Add the registry-driven overlay to nbi-keys.js**

```javascript
// ---- Help overlay (replaces the static modal that lived in nbi-themes.js) ----
function _keysRenderKbd(def) {
  if (def.chord) {
    return def.chord.split(' ').map(function(k) { return '<kbd>' + esc(k) + '</kbd>'; }).join(' then ');
  }
  var mods = { mod: navigator.platform.indexOf('Mac') >= 0 ? '⌘' : 'Ctrl', ctrl: 'Ctrl', meta: '⌘', shift: 'Shift', alt: 'Alt' };
  var parts = [];
  if (def.mod) parts.push('<kbd>' + mods[def.mod] + '</kbd>');
  parts.push('<kbd>' + esc(def.key) + '</kbd>');
  return parts.join(' + ');
}

function showKeyboardShortcutHelp() {
  var existing = document.getElementById('kbShortcutOverlay');
  if (existing) { existing.remove(); return; }

  var categories = {};
  var addDefs = function(defs, suffix) {
    defs.forEach(function(d) {
      if (!d.label) return;
      var cat = (d.category || 'Other') + suffix;
      (categories[cat] = categories[cat] || []).push(d);
    });
  };
  addDefs(_keysRegistry.section, _keysSection ? ' — ' + _keysSection : '');
  addDefs(_keysRegistry.global, '');

  var body = '';
  Object.keys(categories).forEach(function(cat) {
    body += '<div class="kb-help__cat">' + esc(cat) + '</div>';
    categories[cat].forEach(function(d) {
      body += '<div class="kb-help__row"><span class="kb-help__keys">' + _keysRenderKbd(d) + '</span><span class="kb-help__label">' + esc(d.label) + '</span></div>';
    });
  });

  var overlay = document.createElement('div');
  overlay.id = 'kbShortcutOverlay';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = '<div class="modal" style="max-width:560px;max-height:80vh;overflow-y:auto">' +
    '<div class="modal__title" style="display:flex;justify-content:space-between;align-items:center">Keyboard Shortcuts' +
    ' <button class="btn btn--ghost btn--sm" onclick="this.closest(\'.modal-overlay\').remove()" style="font-size:1.2rem" aria-label="Close">&times;</button></div>' +
    '<div class="kb-help">' + body + '</div></div>';
  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
}

// ---- Key hint badges: hold Ctrl/Cmd to reveal badges on buttons that
// declare data-key-hint="N" ----
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Control' || e.key === 'Meta') document.body.classList.add('show-key-hints');
  });
  document.addEventListener('keyup', function(e) {
    if (e.key === 'Control' || e.key === 'Meta') document.body.classList.remove('show-key-hints');
  });
  window.addEventListener('blur', function() { document.body.classList.remove('show-key-hints'); });
}
```

- [ ] **Step 2: Delete the old `showKeyboardShortcutHelp` from nbi-themes.js** (lines ~258-289). The nbi-keys.js version is now the only definition. Script order note: nbi-keys.js loads before nbi-themes.js? **Check the actual order** — nbi-themes.js is the LAST script tag, nbi-keys.js sits mid-list, so the nbi-keys definition wins only if nbi-themes' copy is deleted. Delete it; do not rely on load order.

- [ ] **Step 3: Add help overlay + badge CSS**

```css
/* ===== SHORTCUT HELP OVERLAY (Foundation 3) ===== */
.kb-help { font-size: 13px; }
.kb-help__cat { font-weight: 700; color: var(--text-primary); padding: 12px 4px 6px; border-bottom: 1px solid var(--border-subtle); margin-bottom: 4px; }
.kb-help__row { display: flex; align-items: center; gap: 16px; padding: 4px; }
.kb-help__keys { min-width: 130px; color: var(--text-muted); }
.kb-help__keys kbd { background: var(--bg-surface); border: 1px solid var(--border-default); padding: 2px 7px; border-radius: 3px; font-size: 12px; font-family: var(--font-mono); }
.kb-help__label { color: var(--text-secondary); }
/* Key hint badges */
[data-key-hint] { position: relative; }
body.show-key-hints [data-key-hint]::after { content: attr(data-key-hint); position: absolute; top: -6px; right: -6px; background: var(--accent); color: #fff; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px; z-index: 50; font-family: var(--font-mono); }
```

- [ ] **Step 4: Verify in browser**

Restart PM2, hard-reload. `?` opens the new categorised overlay showing Navigation and Editing groups with rendered kbd chips including the `g then d` chords. Holding Ctrl shows a badge on any element carrying `data-key-hint` (add `data-key-hint="n"` to the New button in the header temporarily via devtools to confirm, or wire it permanently if the New button markup is in `nbi_project_dashboard.html`).

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-keys.js dashboard-server/public/js/nbi-themes.js dashboard-server/public/css/dashboard.css nbi_project_dashboard.html
git commit -m "feat(keys): registry-driven help overlay and Ctrl-hold key hint badges"
```

---

### Task 9: Saved Views — migration + API (TDD)

**Files:**
- Create: `dashboard-server/migrations/082_user_views.sql`
- Create: `dashboard-server/routes/views.js`
- Create: `dashboard-server/tests/unit/views-api.test.mjs`
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Write the migration**

```sql
-- 082_user_views.sql
-- Foundation 2: saved filter/sort/grouping/column views per user+section.
-- users.id is UUID in this schema (spec draft said INTEGER; that was wrong).
CREATE TABLE IF NOT EXISTS user_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, section, name)
);
CREATE INDEX IF NOT EXISTS idx_user_views_user_section ON user_views (user_id, section);
CREATE INDEX IF NOT EXISTS idx_user_views_shared ON user_views (section) WHERE is_shared = true;
```

- [ ] **Step 2: Write the failing API tests**

```javascript
// dashboard-server/tests/unit/views-api.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

const CONFIG = { filters: { status: ['In progress'] }, sort: 'due-asc', groupBy: 'assignee' };

describe('Saved views API', () => {
  it('POST creates a view and GET returns it for the owner', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const post = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'My WIP', config: CONFIG });
    expect(post.status).toBe(201);
    expect(post.body.name).toBe('My WIP');

    const get = await request(app).get('/api/views?section=tasks').set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.length).toBe(1);
    expect(get.body[0].config.sort).toBe('due-asc');
  });

  it('GET does not return another user\'s private views', async () => {
    const a = await createTestUser({ role: 'member' });
    const b = await createTestUser({ role: 'member' });
    const tokenA = await mintSession(a.id);
    const tokenB = await mintSession(b.id);
    await request(app).post('/api/views').set('Authorization', `Bearer ${tokenA}`)
      .send({ section: 'tasks', name: 'Private', config: CONFIG });
    const get = await request(app).get('/api/views?section=tasks').set('Authorization', `Bearer ${tokenB}`);
    expect(get.body.length).toBe(0);
  });

  it('admin-created shared views are visible to everyone', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const member = await createTestUser({ role: 'member' });
    const adminToken = await mintSession(admin.id);
    const memberToken = await mintSession(member.id);
    await request(app).post('/api/views').set('Authorization', `Bearer ${adminToken}`)
      .send({ section: 'tasks', name: 'Team Default', config: CONFIG, is_shared: true });
    const get = await request(app).get('/api/views?section=tasks').set('Authorization', `Bearer ${memberToken}`);
    expect(get.body.length).toBe(1);
    expect(get.body[0].is_shared).toBe(true);
  });

  it('non-admin cannot create a shared view', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const post = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'Sneaky', config: CONFIG, is_shared: true });
    expect(post.status).toBe(403);
  });

  it('setting is_default unsets the previous default for that user+section', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const v1 = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'One', config: CONFIG, is_default: true });
    await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'Two', config: CONFIG, is_default: true });
    const get = await request(app).get('/api/views?section=tasks').set('Authorization', `Bearer ${token}`);
    const defaults = get.body.filter(v => v.is_default);
    expect(defaults.length).toBe(1);
    expect(defaults[0].name).toBe('Two');
    expect(get.body.find(v => v.id === v1.body.id).is_default).toBe(false);
  });

  it('PATCH updates own view; 404 on someone else\'s', async () => {
    const a = await createTestUser({ role: 'member' });
    const b = await createTestUser({ role: 'member' });
    const tokenA = await mintSession(a.id);
    const tokenB = await mintSession(b.id);
    const post = await request(app).post('/api/views').set('Authorization', `Bearer ${tokenA}`)
      .send({ section: 'tasks', name: 'Mine', config: CONFIG });
    const patch = await request(app).patch(`/api/views/${post.body.id}`).set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Renamed' });
    expect(patch.status).toBe(200);
    expect(patch.body.name).toBe('Renamed');
    const forbidden = await request(app).patch(`/api/views/${post.body.id}`).set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hijack' });
    expect(forbidden.status).toBe(404);
  });

  it('DELETE removes own view; duplicate name in same section returns 409', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const post = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'Dup', config: CONFIG });
    const dup = await request(app).post('/api/views').set('Authorization', `Bearer ${token}`)
      .send({ section: 'tasks', name: 'Dup', config: CONFIG });
    expect(dup.status).toBe(409);
    const del = await request(app).delete(`/api/views/${post.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  it('rejects missing/invalid fields with 400', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    expect((await request(app).post('/api/views').set('Authorization', `Bearer ${token}`).send({ name: 'x', config: {} })).status).toBe(400);
    expect((await request(app).post('/api/views').set('Authorization', `Bearer ${token}`).send({ section: 'tasks', config: {} })).status).toBe(400);
    expect((await request(app).post('/api/views').set('Authorization', `Bearer ${token}`).send({ section: 'tasks', name: 'x' })).status).toBe(400);
    expect((await request(app).get('/api/views')).status).toBe(401);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/unit/views-api.test.mjs`
Expected: FAIL (404s — route does not exist). NOTE: the migration runner applies on server start; vitest's globalSetup resets from baseline then runs migrations, so 082 applies automatically. If a test fails with `relation "user_views" does not exist`, check the globalSetup migration step ran.

- [ ] **Step 4: Implement routes/views.js**

```javascript
// dashboard-server/routes/views.js
// Foundation 2: saved views CRUD. Ownership: users manage their own
// views; admins may additionally create/patch/delete shared views.
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid } = ctx;

  const SECTION_RE = /^[a-z_]{2,50}$/;

  router.get('/api/views', async (req, res) => {
    const section = req.query.section;
    if (!section || !SECTION_RE.test(section)) return res.status(400).json({ error: 'section is required' });
    try {
      const { rows } = await pool.query(
        `SELECT * FROM user_views WHERE section = $1 AND (user_id = $2 OR is_shared = true)
         ORDER BY is_shared DESC, name ASC`,
        [section, req.user.id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'Views', 'Failed to list views', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.post('/api/views', async (req, res) => {
    const { section, name, config } = req.body || {};
    const isDefault = !!req.body?.is_default;
    const isShared = !!req.body?.is_shared;
    if (!section || !SECTION_RE.test(section)) return res.status(400).json({ error: 'Valid section is required' });
    if (!name || typeof name !== 'string' || name.length > 100) return res.status(400).json({ error: 'name (max 100 chars) is required' });
    if (!config || typeof config !== 'object' || Array.isArray(config)) return res.status(400).json({ error: 'config object is required' });
    if (isShared && req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create shared views' });
    try {
      if (isDefault) {
        await pool.query('UPDATE user_views SET is_default = false WHERE user_id = $1 AND section = $2', [req.user.id, section]);
      }
      const { rows } = await pool.query(
        `INSERT INTO user_views (user_id, section, name, config, is_default, is_shared)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.user.id, section, name.trim(), JSON.stringify(config), isDefault, isShared]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'A view with that name already exists for this section' });
      log('error', 'Views', 'Failed to create view', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.patch('/api/views/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid view ID' });
    const updates = [];
    const params = [];
    let i = 1;
    if (req.body?.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.length > 100) return res.status(400).json({ error: 'Invalid name' });
      updates.push(`name = $${i++}`); params.push(req.body.name.trim());
    }
    if (req.body?.config !== undefined) {
      if (typeof req.body.config !== 'object' || Array.isArray(req.body.config)) return res.status(400).json({ error: 'Invalid config' });
      updates.push(`config = $${i++}`); params.push(JSON.stringify(req.body.config));
    }
    if (req.body?.is_default !== undefined) { updates.push(`is_default = $${i++}`); params.push(!!req.body.is_default); }
    if (updates.length === 0) return res.status(400).json({ error: 'No updatable fields supplied' });
    updates.push(`updated_at = now()`);
    try {
      // Owner check baked into WHERE; admins may also patch shared views
      const ownerClause = req.user.role === 'admin' ? '(user_id = $' + i + ' OR is_shared = true)' : 'user_id = $' + i;
      params.push(req.user.id);
      const idIdx = ++i;
      params.push(req.params.id);
      if (req.body?.is_default) {
        const { rows: target } = await pool.query('SELECT section FROM user_views WHERE id = $1', [req.params.id]);
        if (target[0]) await pool.query('UPDATE user_views SET is_default = false WHERE user_id = $1 AND section = $2', [req.user.id, target[0].section]);
      }
      const { rows } = await pool.query(
        `UPDATE user_views SET ${updates.join(', ')} WHERE ${ownerClause} AND id = $${idIdx} RETURNING *`, params
      );
      if (rows.length === 0) return res.status(404).json({ error: 'View not found' });
      res.json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'A view with that name already exists for this section' });
      log('error', 'Views', 'Failed to update view', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.delete('/api/views/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid view ID' });
    try {
      const ownerClause = req.user.role === 'admin' ? '(user_id = $1 OR is_shared = true)' : 'user_id = $1';
      const { rowCount } = await pool.query(
        `DELETE FROM user_views WHERE ${ownerClause} AND id = $2`, [req.user.id, req.params.id]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'View not found' });
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Views', 'Failed to delete view', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
```

- [ ] **Step 5: Register in server.js**

Next to the other route registrations after `app.use(requireAuth)` (around line 526-536):

```javascript
app.use(require('./routes/views')({ pool, log, isValidUuid }));
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npx vitest run tests/unit/views-api.test.mjs`
Expected: 8 PASS

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/migrations/082_user_views.sql dashboard-server/routes/views.js dashboard-server/server.js dashboard-server/tests/unit/views-api.test.mjs
git commit -m "feat(views): user_views migration and saved views CRUD API (Foundation 2)"
```

---

### Task 10: Saved Views — frontend dropdown + tasks-view reference integration

**Files:**
- Modify: `dashboard-server/public/js/nbi-views.js`
- Modify: `dashboard-server/public/js/views/nbi-tasks.js` (filter bar)
- Modify: `dashboard-server/public/css/dashboard.css`

- [ ] **Step 1: Implement the views component in nbi-views.js**

```javascript
// ==================== SAVED VIEWS ====================
// Foundation 2 frontend. Each section calls viewsDropdownHtml() inside
// its filter bar and viewsInit() after render. State adapters:
//   getState(): plain object snapshot of the section's filter state
//   applyState(config): set state + re-render
var _viewsCache = {};     // section -> array of views
var _viewsActive = {};    // section -> active view id or null
var _viewsAdapters = {};  // section -> { getState, applyState }

function viewsRegister(section, adapter) { _viewsAdapters[section] = adapter; }

async function viewsLoad(section) {
  try {
    const views = await apiCall('/api/views?section=' + encodeURIComponent(section));
    _viewsCache[section] = views || [];
    return _viewsCache[section];
  } catch (e) { _viewsCache[section] = []; return []; }
}

function viewsDropdownHtml(section) {
  var views = _viewsCache[section] || [];
  var active = views.find(function(v) { return v.id === _viewsActive[section]; });
  var dirty = active && _viewsAdapters[section] &&
    JSON.stringify(_viewsAdapters[section].getState()) !== JSON.stringify(active.config);
  var label = active ? active.name : 'Views';
  return '<div class="views-dd" data-views-section="' + esc(section) + '">' +
    '<button class="btn btn--outline btn--sm views-dd__btn" data-action="_actViewsToggle" data-arg0="' + esc(section) + '">' +
    esc(label) + (dirty ? '<span class="views-dd__dirty" title="Unsaved filter changes"></span>' : '') +
    ' <span style="font-size:9px">▼</span></button>' +
    '<div class="views-dd__menu" style="display:none"></div></div>';
}

function _actViewsToggle(section) {
  var dd = document.querySelector('.views-dd[data-views-section="' + CSS.escape(section) + '"]');
  if (!dd) return;
  var menu = dd.querySelector('.views-dd__menu');
  if (menu.style.display !== 'none') { menu.style.display = 'none'; return; }
  var views = _viewsCache[section] || [];
  var own = views.filter(function(v) { return !v.is_shared; });
  var shared = views.filter(function(v) { return v.is_shared; });
  var html = '';
  if (shared.length) {
    html += '<div class="views-dd__hdr">Shared</div>';
    shared.forEach(function(v) { html += _viewsItemHtml(section, v); });
  }
  html += '<div class="views-dd__hdr">My views</div>';
  if (own.length === 0) html += '<div class="views-dd__empty">No saved views yet</div>';
  own.forEach(function(v) { html += _viewsItemHtml(section, v); });
  html += '<div class="views-dd__sep"></div>';
  if (_viewsActive[section]) {
    html += '<div class="views-dd__item" data-action="_actViewsSave" data-arg0="' + esc(section) + '">Save changes to current view</div>';
  }
  html += '<div class="views-dd__item" data-action="_actViewsSaveAs" data-arg0="' + esc(section) + '">Save current as...</div>';
  if (_viewsActive[section]) {
    html += '<div class="views-dd__item" data-action="_actViewsClear" data-arg0="' + esc(section) + '">Deactivate view</div>';
  }
  menu.innerHTML = html;
  menu.style.display = 'block';
  setTimeout(function() {
    document.addEventListener('click', function closer(e) {
      if (!dd.contains(e.target)) { menu.style.display = 'none'; document.removeEventListener('click', closer); }
    });
  }, 0);
}

function _viewsItemHtml(section, v) {
  var isActive = _viewsActive[section] === v.id;
  return '<div class="views-dd__item' + (isActive ? ' is-active' : '') + '" data-action="_actViewsApply" data-arg0="' + esc(section) + '" data-arg1="' + esc(v.id) + '">' +
    esc(v.name) + (v.is_default ? ' <span class="views-dd__badge">default</span>' : '') +
    '<span class="views-dd__item-actions">' +
    '<button title="Set as default" data-action="_actViewsSetDefault" data-arg0="' + esc(section) + '" data-arg1="' + esc(v.id) + '">★</button>' +
    '<button title="Rename" data-action="_actViewsRename" data-arg0="' + esc(section) + '" data-arg1="' + esc(v.id) + '">✎</button>' +
    '<button title="Delete" data-action="_actViewsDelete" data-arg0="' + esc(section) + '" data-arg1="' + esc(v.id) + '">×</button>' +
    '</span></div>';
}

function _actViewsApply(section, id) {
  var v = (_viewsCache[section] || []).find(function(x) { return x.id === id; });
  if (!v || !_viewsAdapters[section]) return;
  _viewsActive[section] = id;
  _viewsAdapters[section].applyState(v.config);
}

async function _actViewsSave(section) {
  var id = _viewsActive[section];
  if (!id || !_viewsAdapters[section]) return;
  try {
    var updated = await apiCall('/api/views/' + id, { method: 'PATCH', body: { config: _viewsAdapters[section].getState() } });
    var views = _viewsCache[section];
    var idx = views.findIndex(function(v) { return v.id === id; });
    if (idx >= 0) views[idx] = updated;
    toast('View updated');
    _viewsRefreshButton(section);
  } catch (e) { toast('Failed to save view'); }
}

async function _actViewsSaveAs(section) {
  var name = prompt('Name for this view:');
  if (!name || !name.trim()) return;
  try {
    var created = await apiCall('/api/views', { method: 'POST', body: { section: section, name: name.trim(), config: _viewsAdapters[section].getState() } });
    (_viewsCache[section] = _viewsCache[section] || []).push(created);
    _viewsActive[section] = created.id;
    toast('View saved');
    _viewsRefreshButton(section);
  } catch (e) { toast('Failed to save view (duplicate name?)'); }
}

async function _actViewsSetDefault(section, id) {
  try {
    await apiCall('/api/views/' + id, { method: 'PATCH', body: { is_default: true } });
    await viewsLoad(section);
    _viewsRefreshButton(section);
    toast('Default view set');
  } catch (e) { toast('Failed to set default'); }
}

async function _actViewsRename(section, id) {
  var name = prompt('New name:');
  if (!name || !name.trim()) return;
  try {
    await apiCall('/api/views/' + id, { method: 'PATCH', body: { name: name.trim() } });
    await viewsLoad(section);
    _viewsRefreshButton(section);
  } catch (e) { toast('Failed to rename'); }
}

async function _actViewsDelete(section, id) {
  if (!confirm('Delete this view?')) return;
  try {
    await apiCall('/api/views/' + id, { method: 'DELETE' });
    if (_viewsActive[section] === id) _viewsActive[section] = null;
    await viewsLoad(section);
    _viewsRefreshButton(section);
  } catch (e) { toast('Failed to delete'); }
}

function _actViewsClear(section) {
  _viewsActive[section] = null;
  _viewsRefreshButton(section);
}

function _viewsRefreshButton(section) {
  var dd = document.querySelector('.views-dd[data-views-section="' + CSS.escape(section) + '"]');
  if (dd) dd.outerHTML = viewsDropdownHtml(section);
}

/** Call once per section on first render: loads views and auto-applies the default. */
async function viewsInit(section) {
  if (_viewsCache[section]) return;
  var views = await viewsLoad(section);
  var def = views.find(function(v) { return v.is_default; });
  if (def && _viewsAdapters[section] && !_viewsActive[section]) {
    _viewsActive[section] = def.id;
    _viewsAdapters[section].applyState(def.config);
  } else {
    _viewsRefreshButton(section);
  }
}
```

Verify `apiCall`'s option shape before writing this — read `nbi-api.js` to confirm whether it takes `{ method, body }` with auto-JSON or a raw fetch options object, and match it exactly.

- [ ] **Step 2: Wire the tasks view (reference integration)**

In `nbi-tasks.js`, inside the filter-bar template (after the sort `<select>`, around line 45), add:

```javascript
${typeof viewsDropdownHtml === 'function' ? viewsDropdownHtml('tasks') : ''}
```

At the top of the tasks render function, register the adapter once and init:

```javascript
if (typeof viewsRegister === 'function' && !window._tasksViewsRegistered) {
  window._tasksViewsRegistered = true;
  viewsRegister('tasks', {
    getState: function() {
      return { filters: { client: currentFilter.client, project: currentFilter.project, status: currentFilter.status, health: currentFilter.health, assignee: currentFilter.assignee, search: currentFilter.search }, sort: currentFilter.sort, subView: taskSubView };
    },
    applyState: function(config) {
      var f = config.filters || {};
      currentFilter.client = f.client || null;
      currentFilter.project = f.project || null;
      currentFilter.status = f.status || null;
      currentFilter.health = f.health || null;
      currentFilter.assignee = f.assignee || '';
      currentFilter.search = f.search || '';
      currentFilter.sort = config.sort || 'default';
      if (config.subView) { taskSubView = config.subView; localStorage.setItem('nbi_task_subview', taskSubView); }
      renderContent();
    }
  });
  viewsInit('tasks');
}
```

(`window._tasksViewsRegistered` guard: bare `let` at nbi-tasks top level would also work, but the render function re-runs — use the window flag for a one-time registration.)

- [ ] **Step 3: Add views dropdown CSS**

```css
/* ===== SAVED VIEWS (Foundation 2) ===== */
.views-dd { position: relative; display: inline-block; }
.views-dd__btn { display: inline-flex; align-items: center; gap: 6px; }
.views-dd__dirty { width: 7px; height: 7px; border-radius: 50%; background: var(--warning); display: inline-block; }
.views-dd__menu { position: absolute; top: calc(100% + 4px); left: 0; z-index: 300; min-width: 230px; background: var(--bg-raised); border: 1px solid var(--border-default); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); padding: 4px; }
.views-dd__hdr { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-muted); padding: 6px 10px 2px; }
.views-dd__item { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; color: var(--text-secondary); }
.views-dd__item:hover { background: var(--bg-hover); color: var(--text-primary); }
.views-dd__item.is-active { color: var(--accent-text); font-weight: 600; }
.views-dd__item-actions { margin-left: auto; display: none; gap: 2px; }
.views-dd__item:hover .views-dd__item-actions { display: inline-flex; }
.views-dd__item-actions button { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 12px; padding: 1px 4px; border-radius: 3px; }
.views-dd__item-actions button:hover { background: var(--bg-input); color: var(--text-primary); }
.views-dd__badge { font-size: 9px; background: var(--accent-glow); color: var(--accent-text); border-radius: 3px; padding: 1px 5px; }
.views-dd__empty { padding: 6px 10px; font-size: 12px; color: var(--text-muted); font-style: italic; }
.views-dd__sep { border-top: 1px solid var(--border-subtle); margin: 4px 0; }
```

- [ ] **Step 4: Verify in browser**

Restart PM2, hard-reload, go to Projects. Set some filters, open Views → "Save current as..." → name it. Reload the page: the view appears in the dropdown; applying it restores the filters; changing a filter shows the amber dirty dot; "Save changes" clears it; star sets default and a fresh reload auto-applies it.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-views.js dashboard-server/public/js/views/nbi-tasks.js dashboard-server/public/css/dashboard.css nbi_project_dashboard.html
git commit -m "feat(views): views dropdown UI with tasks-view reference integration"
```

---

### Task 11: Per-user preferences — migration + /api/me/prefs (TDD)

**Files:**
- Create: `dashboard-server/migrations/083_user_ui_prefs.sql`
- Modify: `dashboard-server/routes/users.js`
- Create: `dashboard-server/tests/unit/me-prefs.test.mjs`

- [ ] **Step 1: Write the migration**

```sql
-- 083_user_ui_prefs.sql
-- Per-user UI preference blob (tour_completed, setup_completed,
-- help/category toggles). Spec Foundation 4 requires server-side
-- per-user storage; the settings table is global so this is new.
ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;
```

- [ ] **Step 2: Write the failing tests**

```javascript
// dashboard-server/tests/unit/me-prefs.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET/PATCH /api/me/prefs', () => {
  it('returns {} for a fresh user and merges patches', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const get1 = await request(app).get('/api/me/prefs').set('Authorization', `Bearer ${token}`);
    expect(get1.status).toBe(200);
    expect(get1.body).toEqual({});

    const patch1 = await request(app).patch('/api/me/prefs').set('Authorization', `Bearer ${token}`)
      .send({ tour_completed: true });
    expect(patch1.status).toBe(200);
    const patch2 = await request(app).patch('/api/me/prefs').set('Authorization', `Bearer ${token}`)
      .send({ setup_completed: true });
    expect(patch2.body).toEqual({ tour_completed: true, setup_completed: true });
  });

  it('rejects non-object bodies and oversized payloads', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    expect((await request(app).patch('/api/me/prefs').set('Authorization', `Bearer ${token}`).send([1, 2])).status).toBe(400);
    const big = { x: 'a'.repeat(20000) };
    expect((await request(app).patch('/api/me/prefs').set('Authorization', `Bearer ${token}`).send(big)).status).toBe(400);
  });

  it('requires auth', async () => {
    expect((await request(app).get('/api/me/prefs')).status).toBe(401);
  });
});
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run tests/unit/me-prefs.test.mjs` → FAIL (404)

- [ ] **Step 4: Add the endpoints to routes/users.js**

Inside the module, alongside the other routes:

```javascript
  // ---- Per-user UI preferences (Foundation 4 onboarding state) ----
  router.get('/api/me/prefs', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT ui_prefs FROM users WHERE id = $1', [req.user.id]);
      res.json(rows[0]?.ui_prefs || {});
    } catch (e) {
      log('error', 'Users', 'Failed to read ui_prefs', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.patch('/api/me/prefs', async (req, res) => {
    const patch = req.body;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return res.status(400).json({ error: 'Body must be an object' });
    if (JSON.stringify(patch).length > 10000) return res.status(400).json({ error: 'Preferences payload too large' });
    try {
      const { rows } = await pool.query(
        'UPDATE users SET ui_prefs = ui_prefs || $1::jsonb WHERE id = $2 RETURNING ui_prefs',
        [JSON.stringify(patch), req.user.id]
      );
      res.json(rows[0].ui_prefs);
    } catch (e) {
      log('error', 'Users', 'Failed to update ui_prefs', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

Check what `routes/users.js` destructures from ctx at its top (`pool`, `log` at minimum) — if `log` is not already destructured, add it.

- [ ] **Step 5: Run tests to verify pass** — `npx vitest run tests/unit/me-prefs.test.mjs` → 3 PASS

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/migrations/083_user_ui_prefs.sql dashboard-server/routes/users.js dashboard-server/tests/unit/me-prefs.test.mjs
git commit -m "feat(users): per-user ui_prefs column and /api/me/prefs endpoints"
```

---

### Task 12: Help & Onboarding — guided tour engine

**Files:**
- Modify: `dashboard-server/public/js/nbi-help.js`
- Modify: `dashboard-server/public/css/dashboard.css`

- [ ] **Step 1: Implement the tour engine**

```javascript
// ==================== HELP & ONBOARDING ====================
// Foundation 4. Three layers: guided tour, setup wizard, help mode.

var _tourSteps = [
  { selector: '.sidebar', position: 'right', title: 'Navigation', text: 'This is your navigation. Your clients and sections live here.' },
  { selector: '[data-view="dashboard"]', position: 'right', title: 'Dashboard', text: 'Your morning view. Blocked items, deadlines, and team standup.' },
  { selector: '[data-view="tasks"]', position: 'right', title: 'Projects', text: 'Trees, boards and timelines. Drag cards between columns to update status.' },
  { selector: '.g-header__actions, .g-header', position: 'bottom', title: 'Quick actions', text: 'Create tasks, clients, and leads from here.' },
  { selector: '.theme-picker-btn, [data-action*="theme"], .g-header', position: 'bottom', title: 'Themes', text: 'Customise the look. 8 themes available.' },
  { selector: 'body', position: 'centre', title: 'Keyboard shortcuts', text: 'Press ? anytime to see keyboard shortcuts and help. Press F1 to click any element and learn what it does.' },
];
// Selector caveat: verify each selector against the live DOM while
// implementing (devtools inspect). Fix any that do not match. The final
// step content pass happens in Plan 6 after all sections are upgraded.

var _tourIdx = 0;
var _tourEls = null;

function tourStart() {
  _tourIdx = 0;
  _tourBuild();
  _tourShowStep();
}

function _tourBuild() {
  tourEnd();
  var overlay = document.createElement('div');
  overlay.id = 'tourOverlay';
  overlay.innerHTML = '<div class="tour-spotlight"></div>' +
    '<div class="tour-tip" role="dialog" aria-modal="true">' +
    '<div class="tour-tip__title"></div><div class="tour-tip__text"></div>' +
    '<div class="tour-tip__footer">' +
    '<span class="tour-tip__progress"></span>' +
    '<span class="tour-tip__counter"></span>' +
    '<button class="btn btn--ghost btn--sm" data-action="_actTourSkip">Skip tour</button>' +
    '<button class="btn btn--primary btn--sm" data-action="_actTourNext">Next</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  _tourEls = {
    overlay: overlay,
    spotlight: overlay.querySelector('.tour-spotlight'),
    tip: overlay.querySelector('.tour-tip'),
    title: overlay.querySelector('.tour-tip__title'),
    text: overlay.querySelector('.tour-tip__text'),
    progress: overlay.querySelector('.tour-tip__progress'),
    counter: overlay.querySelector('.tour-tip__counter'),
  };
}

function _tourShowStep() {
  var step = _tourSteps[_tourIdx];
  if (!step) { _tourFinish(); return; }
  var target = document.querySelector(step.selector);
  if (!target) { _tourIdx++; _tourShowStep(); return; }

  var r = target.getBoundingClientRect();
  var pad = 6;
  var s = _tourEls.spotlight.style;
  if (step.position === 'centre') {
    s.left = '50%'; s.top = '50%'; s.width = '0'; s.height = '0';
  } else {
    s.left = (r.left - pad) + 'px'; s.top = (r.top - pad) + 'px';
    s.width = (r.width + pad * 2) + 'px'; s.height = (r.height + pad * 2) + 'px';
  }

  _tourEls.title.textContent = step.title;
  _tourEls.text.textContent = step.text;
  _tourEls.counter.textContent = (_tourIdx + 1) + ' of ' + _tourSteps.length;
  _tourEls.progress.innerHTML = _tourSteps.map(function(_, i) {
    return '<span class="tour-dot' + (i === _tourIdx ? ' is-active' : '') + '"></span>';
  }).join('');

  var tip = _tourEls.tip;
  tip.style.visibility = 'hidden';
  requestAnimationFrame(function() {
    var tr = tip.getBoundingClientRect();
    var x, y;
    if (step.position === 'right') { x = r.right + 16; y = r.top; }
    else if (step.position === 'bottom') { x = r.left; y = r.bottom + 12; }
    else if (step.position === 'left') { x = r.left - tr.width - 16; y = r.top; }
    else if (step.position === 'top') { x = r.left; y = r.top - tr.height - 12; }
    else { x = (window.innerWidth - tr.width) / 2; y = (window.innerHeight - tr.height) / 2; }
    x = Math.max(8, Math.min(x, window.innerWidth - tr.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - tr.height - 8));
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.style.visibility = 'visible';
  });

  var isLast = _tourIdx === _tourSteps.length - 1;
  _tourEls.overlay.querySelector('[data-action="_actTourNext"]').textContent = isLast ? 'Finish' : 'Next';
}

function _actTourNext() { _tourIdx++; _tourShowStep(); }
function _actTourSkip() { _tourFinish(); }

function _tourFinish() {
  tourEnd();
  apiCall('/api/me/prefs', { method: 'PATCH', body: { tour_completed: true } }).catch(function() {});
}

function tourEnd() {
  var el = document.getElementById('tourOverlay');
  if (el) el.remove();
  _tourEls = null;
}

/** Called at app init (after login): starts tour once per user. */
async function helpOnboardingCheck() {
  try {
    var prefs = await apiCall('/api/me/prefs');
    if (!prefs.tour_completed) { tourStart(); return; }
    if (!prefs.setup_completed && typeof _currentUser !== 'undefined' && _currentUser && _currentUser.isAdmin) {
      wizardStart(); // Task 13
    }
  } catch (e) { /* onboarding must never block app load */ }
}
```

Wire `helpOnboardingCheck()` into the app init: find the post-login render entry point (grep `renderAll()` calls in `nbi-init.js`) and call `helpOnboardingCheck()` once after the first successful render. Check how `_currentUser`'s admin flag is spelled (`isAdmin` vs `role === 'admin'`) in `nbi-init.js` and match it.

- [ ] **Step 2: Add tour CSS**

```css
/* ===== GUIDED TOUR (Foundation 4) ===== */
#tourOverlay { position: fixed; inset: 0; z-index: 1000; }
.tour-spotlight { position: fixed; border-radius: var(--radius-md); box-shadow: 0 0 0 9999px rgba(0,0,0,0.72); pointer-events: none; transition: all 0.25s ease; }
.tour-tip { position: fixed; z-index: 1001; width: 320px; background: var(--bg-raised); border: 1px solid var(--border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 16px; }
.tour-tip__title { font-weight: 700; font-size: 15px; color: var(--text-primary); margin-bottom: 6px; }
.tour-tip__text { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 14px; }
.tour-tip__footer { display: flex; align-items: center; gap: 8px; }
.tour-tip__progress { display: flex; gap: 4px; }
.tour-tip__counter { font-size: 11px; color: var(--text-muted); margin-right: auto; }
.tour-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-strong); display: inline-block; }
.tour-dot.is-active { background: var(--accent); }
```

- [ ] **Step 3: Verify in browser**

Restart PM2. In the console run `tourStart()`. Expected: dark overlay with a spotlight cutout on the sidebar, positioned tooltip, working Next/Skip, progress dots advancing, counter "1 of 6". After Finish, `GET /api/me/prefs` (Network tab) shows `tour_completed: true`, and a reload does NOT restart the tour.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/public/js/nbi-help.js dashboard-server/public/js/nbi-init.js dashboard-server/public/css/dashboard.css
git commit -m "feat(help): guided tour engine with spotlight overlay and server-side completion state"
```

---

### Task 13: Help & Onboarding — setup wizard

**Files:**
- Modify: `dashboard-server/public/js/nbi-help.js`
- Modify: `dashboard-server/public/css/dashboard.css`

- [ ] **Step 1: Implement the wizard**

Uses verified endpoints: `PUT /api/settings/company_name` (admin), `POST /api/users` (admin; requires username + password), `POST /api/clients` (admin), `POST /api/tasks`.

```javascript
// ---- Setup wizard: Company -> Team -> First client -> First project ----
var _wizState = null;

function wizardStart() {
  _wizState = { step: 0, company: '', invites: [], client: null, project: null };
  _wizRender();
}

var _wizSteps = ['Company', 'Team', 'First client', 'First project', 'Done'];

function _wizRender() {
  var existing = document.getElementById('wizOverlay');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'wizOverlay';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';

  var stepsHtml = _wizSteps.slice(0, 4).map(function(s, i) {
    return '<span class="wiz__step' + (i === _wizState.step ? ' is-active' : i < _wizState.step ? ' is-done' : '') + '">' + esc(s) + '</span>';
  }).join('<span class="wiz__step-sep">→</span>');

  var body = '';
  if (_wizState.step === 0) {
    body = '<label class="wiz__label">Company name</label>' +
      '<input id="wizCompany" class="wiz__input" type="text" value="' + esc(_wizState.company) + '" placeholder="e.g. NBI Analytics">' +
      '<p class="wiz__hint">Shown in headers and report exports. You can change it later in Settings.</p>';
  } else if (_wizState.step === 1) {
    body = '<label class="wiz__label">Invite team members (one email per line)</label>' +
      '<textarea id="wizInvites" class="wiz__input" rows="4" placeholder="tom@example.com&#10;magnus@example.com">' + esc(_wizState.invites.join('\n')) + '</textarea>' +
      '<p class="wiz__hint">Each teammate gets an account with a temporary password shown to you at the end. Leave empty to skip.</p>';
  } else if (_wizState.step === 2) {
    body = '<label class="wiz__label">First client name</label>' +
      '<input id="wizClient" class="wiz__input" type="text" value="' + esc(_wizState.client || '') + '" placeholder="e.g. Couch Heroes">' +
      '<p class="wiz__hint">Clients group your projects. Leave empty to skip.</p>';
  } else if (_wizState.step === 3) {
    body = '<label class="wiz__label">First project name</label>' +
      '<input id="wizProject" class="wiz__input" type="text" value="' + esc(_wizState.project || '') + '" placeholder="e.g. Live Ops Q3">' +
      '<p class="wiz__hint">' + (_wizState.client ? 'Will be created under ' + esc(_wizState.client) + '.' : 'Created unassigned; you can attach it to a client later.') + '</p>';
  } else {
    body = '<div class="wiz__summary">' +
      '<p><strong>Company:</strong> ' + esc(_wizState.company || 'skipped') + '</p>' +
      '<p><strong>Invites:</strong> ' + (_wizState.invites.length ? esc(_wizState.invites.join(', ')) : 'skipped') + '</p>' +
      '<p><strong>Client:</strong> ' + esc(_wizState.client || 'skipped') + '</p>' +
      '<p><strong>Project:</strong> ' + esc(_wizState.project || 'skipped') + '</p>' +
      (_wizState.credentials ? '<div class="wiz__creds"><strong>Temporary passwords (share securely, shown once):</strong><br>' + _wizState.credentials.map(function(c) { return esc(c.email) + ': <code>' + esc(c.password) + '</code>'; }).join('<br>') + '</div>' : '') +
      '</div>';
  }

  var isSummary = _wizState.step === 4;
  overlay.innerHTML = '<div class="modal wiz" style="max-width:480px">' +
    '<div class="wiz__steps">' + stepsHtml + '</div>' +
    '<div class="wiz__body">' + body + '</div>' +
    '<div class="wiz__footer">' +
    (!isSummary ? '<a href="#" class="wiz__skip" data-action="_actWizFinish">I’ll set this up later</a>' : '') +
    (_wizState.step > 0 && !isSummary ? '<button class="btn btn--outline btn--sm" data-action="_actWizBack">Back</button>' : '') +
    (isSummary
      ? '<button class="btn btn--primary" data-action="_actWizFinish">Get started</button>'
      : '<button class="btn btn--primary btn--sm" data-action="_actWizNext">Next</button>') +
    '</div></div>';
  document.body.appendChild(overlay);
  var firstInput = overlay.querySelector('.wiz__input');
  if (firstInput) firstInput.focus();
}

function _actWizBack() { _wizCapture(); _wizState.step--; _wizRender(); }

async function _actWizNext() {
  _wizCapture();
  if (_wizState.step === 3) {
    await _wizExecute();
    _wizState.step = 4;
  } else {
    _wizState.step++;
  }
  _wizRender();
}

function _wizCapture() {
  var company = document.getElementById('wizCompany');
  var invites = document.getElementById('wizInvites');
  var client = document.getElementById('wizClient');
  var project = document.getElementById('wizProject');
  if (company) _wizState.company = company.value.trim();
  if (invites) _wizState.invites = invites.value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
  if (client) _wizState.client = client.value.trim() || null;
  if (project) _wizState.project = project.value.trim() || null;
}

async function _wizExecute() {
  _wizState.credentials = [];
  try {
    if (_wizState.company) {
      await apiCall('/api/settings/company_name', { method: 'PUT', body: { value: _wizState.company } });
    }
    for (var i = 0; i < _wizState.invites.length; i++) {
      var email = _wizState.invites[i];
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
      var username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      var tempPassword = 'Wz' + Math.random().toString(36).slice(2, 10) + '!7';
      try {
        await apiCall('/api/users', { method: 'POST', body: { username: username, display_name: username, email: email, password: tempPassword, role: 'member' } });
        _wizState.credentials.push({ email: email, password: tempPassword });
      } catch (e) { toast('Could not create ' + email); }
    }
    var clientRow = null;
    if (_wizState.client) {
      clientRow = await apiCall('/api/clients', { method: 'POST', body: { name: _wizState.client } });
    }
    if (_wizState.project) {
      await apiCall('/api/tasks', { method: 'POST', body: { title: _wizState.project, item_type: 'project', client_id: clientRow ? clientRow.id : null } });
    }
  } catch (e) { toast('Some setup steps failed; you can finish in Settings'); }
}

function _actWizFinish() {
  var el = document.getElementById('wizOverlay');
  if (el) el.remove();
  apiCall('/api/me/prefs', { method: 'PATCH', body: { setup_completed: true } }).catch(function() {});
  if (typeof renderAll === 'function') renderAll();
}
```

Before implementing, verify `POST /api/clients` and `POST /api/tasks` payload contracts by reading the first ~30 lines of each handler — field names above are from the fixtures and must be confirmed against the actual validation.

- [ ] **Step 2: Add wizard CSS**

```css
/* ===== SETUP WIZARD (Foundation 4) ===== */
.wiz__steps { display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 18px; flex-wrap: wrap; }
.wiz__step { color: var(--text-muted); }
.wiz__step.is-active { color: var(--accent-text); font-weight: 700; }
.wiz__step.is-done { color: var(--success); }
.wiz__step-sep { color: var(--border-strong); }
.wiz__label { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.wiz__input { width: 100%; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-primary); font-size: 15px; padding: 10px 12px; }
.wiz__input:focus { border-color: var(--accent); outline: none; }
.wiz__hint { font-size: 12px; color: var(--text-muted); margin-top: 8px; }
.wiz__footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.wiz__skip { margin-right: auto; font-size: 12px; color: var(--text-muted); }
.wiz__summary p { margin: 6px 0; font-size: 13px; color: var(--text-secondary); }
.wiz__creds { margin-top: 12px; padding: 10px; background: var(--warning-bg); border: 1px solid var(--warning-border); border-radius: var(--radius-sm); font-size: 12px; }
```

- [ ] **Step 3: Verify in browser**

Restart PM2. Console: `wizardStart()`. Walk all 4 steps with test values against the staging DB mindset — on a dev machine this CREATES REAL ROWS in the local prod DB, so use throwaway names and delete them after, or verify on staging (:8887). Confirm: skip link works and marks `setup_completed`; Back preserves entered values; summary shows temp passwords for invited users.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/public/js/nbi-help.js dashboard-server/public/css/dashboard.css
git commit -m "feat(help): four-step setup wizard using existing admin endpoints"
```

---

### Task 14: Help & Onboarding — on-demand help mode + content map

**Files:**
- Modify: `dashboard-server/public/js/nbi-help.js`
- Modify: `dashboard-server/public/js/nbi-help-content.js`
- Modify: `dashboard-server/public/css/dashboard.css`

- [ ] **Step 1: Implement help mode in nbi-help.js**

```javascript
// ---- On-demand help mode (F1 or ? icon): click any element for a help card ----
var _helpModeOn = false;

function helpModeToggle() {
  _helpModeOn = !_helpModeOn;
  document.body.classList.toggle('help-mode', _helpModeOn);
  if (_helpModeOn) {
    document.addEventListener('click', _helpModeClick, true);
    document.addEventListener('keydown', _helpModeEsc, true);
    toast('Help mode: click any element to learn about it. Esc to exit.');
  } else {
    document.removeEventListener('click', _helpModeClick, true);
    document.removeEventListener('keydown', _helpModeEsc, true);
    _helpCardClose();
  }
}

function _helpModeEsc(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); helpModeToggle(); }
}

function _helpModeClick(e) {
  e.preventDefault();
  e.stopPropagation();
  var entry = _helpLookup(e.target);
  _helpCardShow(entry, e.target);
}

function _helpLookup(el) {
  // HELP_CONTENT is defined in nbi-help-content.js: array of
  // { selector, title, text, related, shortcut }
  for (var i = 0; i < HELP_CONTENT.length; i++) {
    if (el.closest(HELP_CONTENT[i].selector)) return HELP_CONTENT[i];
  }
  return { title: 'No help written yet', text: 'This element has no help entry yet. Press Escape to leave help mode.', related: [], shortcut: null };
}

function _helpCardShow(entry, target) {
  _helpCardClose();
  var card = document.createElement('div');
  card.id = 'helpCard';
  card.setAttribute('role', 'dialog');
  var related = (entry.related || []).map(function(r) { return '<span class="help-card__rel">' + esc(r) + '</span>'; }).join('');
  card.innerHTML = '<div class="help-card__title">' + esc(entry.title) + '</div>' +
    '<div class="help-card__text">' + esc(entry.text) + '</div>' +
    (entry.shortcut ? '<div class="help-card__shortcut">Shortcut: <kbd>' + esc(entry.shortcut) + '</kbd></div>' : '') +
    (related ? '<div class="help-card__related">See also: ' + related + '</div>' : '') +
    '<button class="btn btn--ghost btn--sm help-card__close" onclick="_helpCardClose()" aria-label="Close">&times;</button>';
  document.body.appendChild(card);
  var r = target.getBoundingClientRect();
  var cr = card.getBoundingClientRect();
  var x = Math.max(8, Math.min(r.left, window.innerWidth - cr.width - 8));
  var y = r.bottom + 8 + cr.height > window.innerHeight ? r.top - cr.height - 8 : r.bottom + 8;
  card.style.left = x + 'px';
  card.style.top = Math.max(8, y) + 'px';
}

function _helpCardClose() {
  var el = document.getElementById('helpCard');
  if (el) el.remove();
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F1') { e.preventDefault(); helpModeToggle(); }
  });
}
```

Also add a `?` help icon button to the header in `nbi_project_dashboard.html` (next to the theme/settings icons — read the header markup first and match its button classes):

```html
<button class="g-header__icon-btn" title="Help (F1)" data-action="helpModeToggle" aria-label="Help mode">?</button>
```

- [ ] **Step 2: Author the initial content map in nbi-help-content.js**

```javascript
// ==================== HELP CONTENT ====================
// Selector -> help card content. First match wins (el.closest), so put
// specific selectors before broad ones. Visual assets and full coverage
// are authored in Plan 6 after all sections are upgraded.
var HELP_CONTENT = [
  { selector: '.filter-bar', title: 'Filter bar', text: 'Narrow what you see by client, project, status, health or assignee. Save combinations as named views with the Views button.', related: ['Saved Views'], shortcut: '/' },
  { selector: '.views-dd', title: 'Saved Views', text: 'Save the current filters, sort and grouping as a named view. Star one as default and it applies every time you open this section.', related: ['Filter bar'], shortcut: null },
  { selector: '.task-subview-toggle', title: 'View switcher', text: 'Switch between the project tree, kanban board, Gantt timeline and calendar for the same filtered data.', related: [], shortcut: null },
  { selector: '.sidebar', title: 'Sidebar', text: 'Your navigation. Sections at the top, clients below. Click a client to scope every view to it.', related: [], shortcut: '[' },
  { selector: '.g-header', title: 'Header', text: 'Global actions: create items, print, report a bug, alerts and settings.', related: [], shortcut: null },
  { selector: '.group-header', title: 'Group header', text: 'Click to collapse or expand the group. The chips show item count and aggregate stats.', related: [], shortcut: null },
  { selector: '.detail-panel', title: 'Detail panel', text: 'Full record for the selected item. Press 1-4 to set status while it is open.', related: [], shortcut: '1-4' },
];
```

- [ ] **Step 3: Add help mode CSS**

```css
/* ===== HELP MODE (Foundation 4) ===== */
body.help-mode, body.help-mode * { cursor: help !important; }
body.help-mode .sidebar:hover, body.help-mode .filter-bar:hover, body.help-mode .g-header:hover, body.help-mode .views-dd:hover, body.help-mode .detail-panel:hover, body.help-mode .group-header:hover { outline: 2px dashed var(--accent-border); outline-offset: 2px; }
#helpCard { position: fixed; z-index: 1100; width: 300px; background: var(--bg-raised); border: 1px solid var(--accent-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 14px; }
.help-card__title { font-weight: 700; font-size: 14px; color: var(--text-primary); margin-bottom: 6px; padding-right: 20px; }
.help-card__text { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.help-card__shortcut { margin-top: 8px; font-size: 12px; color: var(--text-muted); }
.help-card__shortcut kbd { background: var(--bg-surface); border: 1px solid var(--border-default); padding: 1px 6px; border-radius: 3px; font-family: var(--font-mono); font-size: 11px; }
.help-card__related { margin-top: 8px; font-size: 12px; color: var(--text-muted); }
.help-card__rel { color: var(--accent-text); margin-right: 6px; }
.help-card__close { position: absolute; top: 6px; right: 6px; }
```

- [ ] **Step 4: Verify in browser**

Restart PM2. Press F1 → toast appears, cursor becomes help, hovering the sidebar shows a dashed outline. Click the filter bar → card describes it with the `/` shortcut. Escape exits. The `?` header icon toggles the same mode.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-help.js dashboard-server/public/js/nbi-help-content.js dashboard-server/public/css/dashboard.css nbi_project_dashboard.html
git commit -m "feat(help): on-demand help mode with anchored help cards and initial content map"
```

---

### Task 15: E2E tests for all five foundations

**Files:**
- Create: `dashboard-server/tests/e2e/foundations.spec.js`

- [ ] **Step 1: Write the E2E suite**

```javascript
// dashboard-server/tests/e2e/foundations.spec.js
const { test, expect } = require('@playwright/test');
const { createTestUser } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

async function login(page, role = 'admin') {
  const user = await createTestUser({ role });
  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  return user;
}

test.describe('Foundations 2-6', () => {
  test.beforeEach(async ({ page }) => {
    await truncate();
    await login(page);
    // Dismiss the tour if it auto-started (fresh user has no prefs)
    const skip = page.locator('[data-action="_actTourSkip"]');
    if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  });

  test('inline editing: activate, edit, save', async ({ page }) => {
    const saved = await page.evaluate(() => new Promise(resolve => {
      const d = document.createElement('div');
      d.id = 'e2eInline';
      d.textContent = 'Before';
      document.body.appendChild(d);
      inlineEdit(d, { field: 'title', type: 'text', value: 'Before', onSave: (f, v) => resolve({ f, v }) });
      d.dispatchEvent(new Event('dblclick'));
      const input = d.querySelector('input');
      input.value = 'After';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }));
    expect(saved).toEqual({ f: 'title', v: 'After' });
  });

  test('grouping: groupItems available and header renders', async ({ page }) => {
    const result = await page.evaluate(() => {
      const groups = groupItems([{ a: 'x' }, { a: 'x' }, { a: 'y' }], { field: 'a', sort: 'count-desc' });
      const html = renderGroupHeader('e2e', groups[0]);
      return { first: groups[0].key, count: groups[0].stats.count, hasHeader: html.includes('group-header') };
    });
    expect(result.first).toBe('x');
    expect(result.count).toBe(2);
    expect(result.hasHeader).toBe(true);
  });

  test('shortcuts: ? opens the registry-driven help overlay', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('#kbShortcutOverlay')).toBeVisible();
    await expect(page.locator('#kbShortcutOverlay .kb-help__cat').first()).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('shortcuts: g then d navigates to dashboard', async ({ page }) => {
    await page.evaluate(() => switchView('tasks'));
    await page.keyboard.press('g');
    await page.keyboard.press('d');
    const view = await page.evaluate(() => currentView);
    expect(view).toBe('dashboard');
  });

  test('saved views: save, apply and default round-trip', async ({ page }) => {
    await page.evaluate(() => switchView('tasks'));
    await page.waitForSelector('.views-dd', { timeout: 5000 });
    const created = await page.evaluate(async () => {
      const view = await apiCall('/api/views', { method: 'POST', body: { section: 'tasks', name: 'E2E View', config: { filters: { search: 'zzz' }, sort: 'due-asc' }, is_default: false } });
      await viewsLoad('tasks');
      _actViewsApply('tasks', view.id);
      return { search: currentFilter.search, sort: currentFilter.sort };
    });
    expect(created.search).toBe('zzz');
    expect(created.sort).toBe('due-asc');
  });

  test('me/prefs: tour completion persists', async ({ page }) => {
    const prefs = await page.evaluate(async () => {
      await apiCall('/api/me/prefs', { method: 'PATCH', body: { tour_completed: true } });
      return apiCall('/api/me/prefs');
    });
    expect(prefs.tour_completed).toBe(true);
  });

  test('tour: starts and advances', async ({ page }) => {
    await page.evaluate(() => tourStart());
    await expect(page.locator('#tourOverlay .tour-tip__title')).toBeVisible();
    const t1 = await page.locator('.tour-tip__counter').textContent();
    await page.locator('[data-action="_actTourNext"]').click();
    const t2 = await page.locator('.tour-tip__counter').textContent();
    expect(t1).not.toBe(t2);
    await page.locator('[data-action="_actTourSkip"]').click();
    await expect(page.locator('#tourOverlay')).toHaveCount(0);
  });

  test('help mode: F1 toggles and shows a card on click', async ({ page }) => {
    await page.keyboard.press('F1');
    const helpOn = await page.evaluate(() => document.body.classList.contains('help-mode'));
    expect(helpOn).toBe(true);
    await page.locator('.sidebar').click();
    await expect(page.locator('#helpCard')).toBeVisible();
    await page.keyboard.press('Escape');
    const helpOff = await page.evaluate(() => document.body.classList.contains('help-mode'));
    expect(helpOff).toBe(false);
  });
});
```

- [ ] **Step 2: Run the suite**

Run: `npm run test:e2e -- --grep "Foundations 2-6"`
Expected: 8 PASS. Debug any selector drift against the real DOM — do not weaken assertions to pass.

- [ ] **Step 3: Run everything**

Run: `npm test` then `npm run test:e2e`
Expected: full unit suite green (baseline was 93 files / 1197 tests + this plan's additions), full E2E suite green.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/tests/e2e/foundations.spec.js
git commit -m "test(foundations): E2E coverage for inline, group, keys, views, prefs, tour, help mode"
```

---

### Task 16: Deploy + session log

- [ ] **Step 1:** Follow the `deploy` skill: restart staging (`pm2 restart nbi-dashboard-staging`), check "Applied migration 082/083" in logs, run E2E against staging, then `pm2 restart nbi-dashboard` and tail production logs for errors.
- [ ] **Step 2:** Ask Glen to spot-check at https://worksage.nbi-consulting.com: `?` overlay, F1 help mode, Views dropdown on Projects, and (with a fresh test user) the tour.
- [ ] **Step 3:** Update the session log with completed state and evidence. Plan 3 (Dashboard, Kanban, Tree, Navigation upgrades) is next.

---

## Self-Review (completed)

**Spec coverage:** F2 saved views (data model UUID-corrected, all four routes, default/shared semantics, dirty dot, per-section adapters — sections beyond tasks wire up in Plans 3-5 where their upgrades land) ✓. F3 registration API, per-view precedence, chords, suppression in inputs, help overlay two-column categorised, key badges ✓. F4 all three layers: tour (spotlight, dots, skip, once-only, server-side state), wizard (4 steps + skip + re-trigger via Settings — re-trigger buttons land in Plan 4's Settings touch; `tourStart()`/`wizardStart()` are global and callable from anywhere), help mode (F1/`?` icon, highlight, anchored cards, content map; visuals deferred to Plan 6 per spec Phase 3) ✓. F5 all five editor types, activate/save/cancel semantics, Tab row navigation, batch save, pencil affordance ✓. F6 groupItems with sorts/emptyLabel/aggregates, collapsible headers with stats, dropdown builder; swimlane rendering and drag-between-groups are Kanban-specific and land in Plan 3 per spec 2.1 ✓.

**Placeholders:** none — every code step is complete; the only deferred items are explicitly routed to later plans with the spec section named.

**Type consistency:** `_keysRegistry`/`_keysMatch` names consistent across Tasks 6-8; `viewsRegister/viewsInit/viewsDropdownHtml` consistent across Task 10 and the E2E suite; `inlineEdit/inlineRow` consistent across Tasks 1-3 and E2E; `groupItems/renderGroupHeader` consistent across Tasks 4-5 and E2E.

**Verification duties for the engineer** (marked inline): apiCall option shape, formatDate signature, nbi-events dispatcher mechanics, header markup for the `?` icon, POST /api/clients and /api/tasks payload contracts, tour selectors against the live DOM, routes/users.js ctx destructuring.
