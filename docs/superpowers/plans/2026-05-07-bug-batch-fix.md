# WorkSage Bug Batch Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 confirmed bugs and implement 3 feature requests from the WorkSage bug tracker, all verified against the codebase.

**Architecture:** Two files: `dashboard-server/server.js` (Express API, ~5000 lines) and `nbi_project_dashboard.html` (monolithic SPA, ~22500 lines). Server changes affect SQL queries and validation. Client changes affect rendering, filtering, and date handling. Tests use Vitest + supertest for server endpoints, Playwright for e2e.

**Tech Stack:** Node.js/Express, PostgreSQL, vanilla JS SPA, Vitest, Playwright

---

## File Map

| File | Changes |
|------|---------|
| `dashboard-server/server.js` | Tasks 1, 4, 5 — sort order, date validation, import due dates |
| `nbi_project_dashboard.html` | Tasks 2, 3, 4, 6, 7, 8 — people filter, sync focus, date validation, auto-dates, paste dates, warning timestamps |
| `dashboard-server/tests/unit/sort-order.test.mjs` | Task 1 — test deterministic sort |
| `dashboard-server/tests/unit/date-validation.test.mjs` | Task 4 — test year range validation |
| `dashboard-server/tests/unit/import-due-dates.test.mjs` | Task 5 — test due date import paths |

---

### Task 1: Deterministic Task Sort Order (Bug 3af6701c)

**Files:**
- Modify: `dashboard-server/server.js:6193,6203` — add secondary sort columns
- Create: `dashboard-server/tests/unit/sort-order.test.mjs` — test deterministic ordering

**Root cause:** `ORDER BY t.created_at` has no tiebreaker. Tasks with identical timestamps get non-deterministic order from PostgreSQL.

- [ ] **Step 1: Write the failing test**

Create `dashboard-server/tests/unit/sort-order.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET /api/sync/load — task sort order', () => {
  it('returns tasks in deterministic order when created_at is identical', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const now = new Date().toISOString();

    // Insert 3 tasks with identical created_at but different titles
    for (const title of ['Charlie', 'Alpha', 'Bravo']) {
      await pool.query(
        `INSERT INTO tasks (title, status, item_type, created_at) VALUES ($1, 'Not started', 'project', $2)`,
        [title, now]
      );
    }

    const res1 = await request(app)
      .get('/api/sync/load')
      .set('Authorization', `Bearer ${token}`);

    const res2 = await request(app)
      .get('/api/sync/load')
      .set('Authorization', `Bearer ${token}`);

    const titles1 = res1.body.tasks.map(t => t.title);
    const titles2 = res2.body.tasks.map(t => t.title);

    // Order should be identical across calls
    expect(titles1).toEqual(titles2);
    // And alphabetical as the tiebreaker
    expect(titles1).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/sort-order.test.mjs`
Expected: FAIL — order is non-deterministic or not alphabetical.

- [ ] **Step 3: Fix the ORDER BY clauses in server.js**

In `dashboard-server/server.js`, find both ORDER BY clauses in the `/api/sync/load` handler:

**Line 6193** — change:
```sql
ORDER BY t.created_at
```
to:
```sql
ORDER BY t.created_at, t.title, t.id
```

**Line 6203** — change:
```sql
ORDER BY t.created_at
```
to:
```sql
ORDER BY t.created_at, t.title, t.id
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard-server && npx vitest run tests/unit/sort-order.test.mjs`
Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/sort-order.test.mjs
git commit -m "fix: deterministic task sort order — add title+id tiebreaker to ORDER BY"
```

---

### Task 2: People Filter at Correct Hierarchy Level (Bug 84273f41)

**Files:**
- Modify: `nbi_project_dashboard.html:9004-9064` — filter children against the filtered set in `renderTaskRow()`
- Modify: `nbi_project_dashboard.html:6954` — extend `visibleIds` to work with assignee filter, not just "My Work Only"

**Root cause:** `renderTaskRow()` at line 9006 calls `getChildren(task.id)` which returns children from the unfiltered `tasks` array. The `visibleIds` mechanism only activates for `currentFilter.sort === 'assignee'` ("My Work Only"), not for the People multi-select filter (`currentFilter.assignee`).

- [ ] **Step 1: Build the visibleIds set for assignee filter too**

In `nbi_project_dashboard.html`, find the `renderTreeView()` function around line 6953-6963. The current code only builds `visibleIds` when `currentFilter.sort === 'assignee'`. Extend it to also build `visibleIds` when `currentFilter.assignee` is active.

Change this block (lines 6953-6963):
```javascript
  let visibleIds = null;
  if (currentFilter.sort === 'assignee' && filtered.length < tasks.length) {
    visibleIds = new Set(filtered.map(t => t.id));
    filtered.forEach(t => {
      let cursor = tasks.find(p => p.id === t.parentId);
      while (cursor) {
        visibleIds.add(cursor.id);
        cursor = tasks.find(p => p.id === cursor.parentId);
      }
    });
  }
```

To:
```javascript
  let visibleIds = null;
  const hasAssigneeFilter = (currentFilter.sort === 'assignee' || (currentFilter.assignee && currentFilter.assignee.length > 0));
  if (hasAssigneeFilter && filtered.length < tasks.length) {
    visibleIds = new Set(filtered.map(t => t.id));
    filtered.forEach(t => {
      let cursor = tasks.find(p => p.id === t.parentId);
      while (cursor) {
        visibleIds.add(cursor.id);
        cursor = tasks.find(p => p.id === cursor.parentId);
      }
    });
  }
```

This reuses the exact same `visibleIds` logic that already works for "My Work Only", but triggers it whenever a People filter is active too. The `renderTaskRow()` function already respects `visibleIds` at line 9005: `if (visibleIds && !visibleIds.has(task.id)) return '';`

- [ ] **Step 2: Verify the existing visibleIds check in renderTaskRow**

Read `nbi_project_dashboard.html` line 9005 and confirm it already has:
```javascript
if (visibleIds && !visibleIds.has(task.id)) return '';
```

No changes needed in `renderTaskRow()` — the existing guard handles it once `visibleIds` is populated.

- [ ] **Step 3: Test manually**

Open WorkSage, go to Projects view, select a person in the People filter. Confirm:
- Only tasks assigned to that person are shown
- Empty stories/features/projects are hidden
- Hierarchy is maintained (parent chain visible but unmatched siblings hidden)

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix: People filter now hides unassigned tasks at all hierarchy levels"
```

---

### Task 3: Multi-User Sync Focus Preservation (Bug bb889390)

**Files:**
- Modify: `nbi_project_dashboard.html:6191-6204` — enhance `_softReRender()` to protect detail panel
- Modify: `nbi_project_dashboard.html:10072-10075` — skip detail panel refresh during remote updates

**Root cause:** When polling detects remote changes, `_softReRender()` skips main content re-render when an input is focused (line 6193), but the detail panel overlay (`openDetailOverlay`) does a full `innerHTML` rebuild (line 10074), destroying focus and unsaved values.

- [ ] **Step 1: Add a flag to distinguish local vs remote re-renders**

In `nbi_project_dashboard.html`, near the sync variables (around line 3470), add a tracking variable:

```javascript
let _remoteUpdateInProgress = false;
```

- [ ] **Step 2: Set the flag in _softReRender before calling renderContent**

Modify `_softReRender()` (lines 6191-6204). Wrap the `renderContent()` call:

```javascript
function _softReRender() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
  const scrollEl = document.querySelector('.main__content');
  if (!scrollEl) { renderContent(); return; }
  const savedScroll = scrollEl.scrollTop;
  _scrollRestoreTarget = savedScroll > 0 ? savedScroll : null;
  _remoteUpdateInProgress = true;
  renderContent();
  _remoteUpdateInProgress = false;
  if (typeof renderSidebar === 'function') renderSidebar();
  if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
  if (scrollEl && savedScroll > 0) {
    scrollEl.scrollTop = savedScroll;
  }
}
```

- [ ] **Step 3: Skip detail panel refresh during remote updates**

In `updateTask()` (around line 10072-10075), the detail panel re-opens after every field change:
```javascript
  if (activeDetailTaskId === id && document.getElementById('detailPanel')?.classList.contains('open')) {
    openDetailOverlay(id);
  }
```

This is fine for LOCAL edits (the user just changed something, so refreshing the panel shows their change). The problem is when `renderContent()` from `_softReRender()` causes downstream effects.

The real fix is in `_softReRender()`: after `renderContent()` is called with `_remoteUpdateInProgress = true`, we need to NOT re-open the detail overlay. Find any place in `renderContent()` or its callees that calls `openDetailOverlay`.

Actually, the simpler and more targeted fix: enhance `_softReRender()` to also check if the detail panel is open with a focused field.

Replace the `_softReRender()` function entirely:

```javascript
function _softReRender() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
  const detailPanel = document.getElementById('detailPanel');
  if (detailPanel && detailPanel.classList.contains('open')) {
    const detailActive = detailPanel.querySelector(':focus');
    if (detailActive && (detailActive.tagName === 'INPUT' || detailActive.tagName === 'TEXTAREA' || detailActive.tagName === 'SELECT')) return;
  }
  const scrollEl = document.querySelector('.main__content');
  if (!scrollEl) { renderContent(); return; }
  const savedScroll = scrollEl.scrollTop;
  _scrollRestoreTarget = savedScroll > 0 ? savedScroll : null;
  renderContent();
  if (typeof renderSidebar === 'function') renderSidebar();
  if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
  if (scrollEl && savedScroll > 0) {
    scrollEl.scrollTop = savedScroll;
  }
}
```

Wait — this won't work because `document.activeElement` already covers elements inside the detail panel. The check at line 6193 already handles this: if ANY input/textarea/select is focused (including inside the detail panel), the entire re-render is skipped.

The actual problem is: after `_softReRender()` runs (when no input is focused), it calls `renderContent()`, which rebuilds the tree view. The tree view rebuild does NOT re-open the detail panel. The detail panel rebuild happens at line 10073-10074 in `updateTask()`, which is only called when the USER changes a field, not during polling.

So the real scenario is:
1. User A is editing a field in the detail panel (focused on an input)
2. User B makes a change, polling detects it
3. `_softReRender()` fires — but the user has an input focused, so it returns early (line 6193). GOOD.
4. User A finishes editing, blurs the field, `updateTask()` fires
5. `updateTask()` calls `renderContent()` (for structural changes) or the lightweight path
6. For structural changes, `renderContent()` fully re-renders, then line 10073 re-opens the detail panel

The gap: between step 3 and step 4, the user may blur+refocus on a DIFFERENT field. At that moment there's no input focused, so a subsequent poll tick will fire `_softReRender()` → `renderContent()`. The `renderContent()` rebuilds the tree, and if the detail panel references a task that just changed, the task data in the `tasks` array was already updated by the polling merge (line 3786). So when the user's `updateTask()` fires, it reads the server-updated value as `oldValue`, making undo wrong. And `openDetailOverlay(id)` at line 10074 replaces the detail panel HTML, destroying focus.

The simplest robust fix: track when the detail panel is "dirty" (has unsaved edits in progress) and skip re-render entirely in that state.

Replace `_softReRender()`:

```javascript
function _softReRender() {
  const active = document.activeElement;
  const isEditing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
  if (isEditing) return;
  const detailPanel = document.getElementById('detailPanel');
  if (detailPanel && detailPanel.classList.contains('open') && detailPanel.contains(document.activeElement)) return;
  const scrollEl = document.querySelector('.main__content');
  if (!scrollEl) { renderContent(); return; }
  const savedScroll = scrollEl.scrollTop;
  _scrollRestoreTarget = savedScroll > 0 ? savedScroll : null;
  renderContent();
  if (typeof renderSidebar === 'function') renderSidebar();
  if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
  if (scrollEl && savedScroll > 0) {
    scrollEl.scrollTop = savedScroll;
  }
}
```

Actually, the existing check already covers this. Let me re-read the bug report more carefully:

> "When multiple users are making edits within the tool, the tool refreshes frequently. This forces you out of whatever field you are editing, does not save changes consistently, and forces you into the title field when editing a task."

The "forces you out of whatever field" suggests the re-render IS happening even when editing. This could happen if:
1. The user is between keystrokes (input is focused but `document.activeElement` might be the body briefly during some browser reflow)
2. The user is using a dropdown/select and the blur happens between click and selection
3. `renderContent()` is called from somewhere other than `_softReRender()` during polling

Let me check if there's another path from the polling to a re-render.

Looking at lines 3805-3811:
```javascript
if (changed) {
  localStorage.setItem('nbi_dashboard_tasks', JSON.stringify(tasks));
  if (Date.now() - _lastLocalSyncTime < SELF_ECHO_WINDOW_MS) {
  } else {
    _softReRender();
  }
}
```

So `_softReRender()` is the only render path from polling. The focus check should work.

The issue might be timing: user clicks a dropdown, the dropdown opens, `blur` fires on the previously focused element, at that exact moment the poll fires, `document.activeElement` is the body (between blur and focus), `_softReRender()` runs, rebuilds the DOM, and the dropdown disappears.

The fix: extend the protection window. Instead of just checking `document.activeElement`, also check if the detail panel is open (any interaction with it means don't re-render).

- [ ] **Step 1 (revised): Protect detail panel from remote re-renders**

Modify `_softReRender()` in `nbi_project_dashboard.html` (lines 6191-6204):

Change:
```javascript
function _softReRender() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
```

To:
```javascript
function _softReRender() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
  const detailPanel = document.getElementById('detailPanel');
  if (detailPanel && detailPanel.classList.contains('open')) return;
```

This is the safest approach: if the detail panel is open at all, skip remote re-renders. The user's own local edits still trigger immediate updates via `updateTask()`. Remote changes will appear the next time the user closes the detail panel, at which point the data in the `tasks` array is already current (polling still merges data at line 3786, just doesn't re-render).

- [ ] **Step 2: Test manually with two browser windows**

Open WorkSage in two browser windows logged in as different users. In window A, open a task detail panel and start editing. In window B, make a change. Confirm:
- Window A does NOT lose focus or flash
- Window A's detail panel stays stable
- After closing the detail panel in A, the tree reflects B's changes

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix: skip remote re-render when detail panel is open — prevents field jumping"
```

---

### Task 4: Date Validation — Block 5-Digit Years (Bug d106f9e0)

**Files:**
- Modify: `dashboard-server/server.js:5235-5238` — add year range validation on PATCH
- Modify: `nbi_project_dashboard.html:9981` — add client-side date validation in `updateTask()`
- Create: `dashboard-server/tests/unit/date-validation.test.mjs` — test year range rejection

**Root cause:** `<input type="date">` allows typing years > 9999 in some browsers. Server PATCH endpoint only validates start < end, not year range. Dates stored as TEXT with no constraint.

- [ ] **Step 1: Write the failing test**

Create `dashboard-server/tests/unit/date-validation.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('PATCH /api/tasks/:id — date validation', () => {
  async function createTask(token) {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, status, item_type) VALUES ('Test Task', 'Not started', 'task') RETURNING id`
    );
    return rows[0].id;
  }

  it('rejects a 5-digit year in due_date', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const taskId = await createTask(token);

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ due_date: '20266-05-07' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/year/i);
  });

  it('rejects a 5-digit year in start_date', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const taskId = await createTask(token);

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ start_date: '20266-01-01' });

    expect(res.status).toBe(400);
  });

  it('accepts a valid 4-digit year', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const taskId = await createTask(token);

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ due_date: '2026-05-07' });

    expect(res.status).toBe(200);
  });

  it('accepts an empty date (clearing a field)', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const taskId = await createTask(token);

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ due_date: '' });

    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/date-validation.test.mjs`
Expected: FAIL — 5-digit years currently accepted.

- [ ] **Step 3: Add server-side date validation**

In `dashboard-server/server.js`, before the existing `start_date > end_date` check (around line 5235), add a year range validator:

```javascript
  // Validate date field years are in reasonable range (1900-2099)
  const dateFields = ['start_date', 'end_date', 'due_date'];
  for (const df of dateFields) {
    const val = req.body[df];
    if (val !== undefined && val !== null && val !== '') {
      const yearMatch = String(val).match(/^(\d+)-/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (year < 1900 || year > 2099) {
          return res.status(400).json({ error: `Invalid year in ${df}: ${year}. Must be between 1900 and 2099.` });
        }
      }
    }
  }
```

Insert this BEFORE the existing block:
```javascript
  if (req.body.start_date && req.body.end_date && req.body.start_date > req.body.end_date) {
```

- [ ] **Step 4: Add client-side validation in updateTask()**

In `nbi_project_dashboard.html`, in the `updateTask()` function (around line 9981), add date validation early in the function:

After `if (!task) return;` (line 9983), add:

```javascript
  if ((field === 'startDate' || field === 'endDate' || field === 'dueDate') && value) {
    const yearMatch = value.match(/^(\d+)-/);
    if (yearMatch && (parseInt(yearMatch[1], 10) < 1900 || parseInt(yearMatch[1], 10) > 2099)) {
      showToast('Invalid year — must be between 1900 and 2099', 'error');
      renderContent();
      return;
    }
  }
```

- [ ] **Step 5: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/date-validation.test.mjs`
Expected: All 4 tests PASS.

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js nbi_project_dashboard.html dashboard-server/tests/unit/date-validation.test.mjs
git commit -m "fix: block 5-digit years in date fields — client + server validation"
```

---

### Task 5: Due Dates Not Importing — Consistent Date Parsing (Bug 786db90d)

**Files:**
- Modify: `dashboard-server/server.js:2483` — apply `parseDdMmYyyy()` to nbi-csv due date
- Modify: `dashboard-server/server.js:2471` — expand column name matching
- Create: `dashboard-server/tests/unit/import-due-dates.test.mjs` — test due date import

**Root cause:** The `nbi-csv` import format (line 2483) passes `dueDate: get(r, iDue)` as a raw string without calling `parseDdMmYyyy()`. The `nbi-hierarchy-csv` format (line 2451) correctly calls `parseDdMmYyyy()`. So DD/MM/YYYY dates in NBI CSV imports are stored verbatim and can't be parsed by the frontend.

Also, the column name matching at line 2471 uses `ciAny('due date', 'due')` but not `'due_date'` or `'deadline'`.

- [ ] **Step 1: Write the failing test**

Create `dashboard-server/tests/unit/import-due-dates.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { mapRowsToTasks, detectImportFormat } = require('../../server.js');

describe('mapRowsToTasks — due date parsing in nbi-csv format', () => {
  it('parses DD/MM/YYYY due dates in nbi-csv format', () => {
    const headers = ['task', 'status', 'priority', 'due date'];
    const rows = [
      { 'task': 'Fix login', 'status': 'Not started', 'priority': 'High', 'due date': '15/06/2026' }
    ];

    const format = detectImportFormat(headers);
    const tasks = mapRowsToTasks(headers, rows, format.format);

    expect(tasks[0].dueDate).toBe('2026-06-15');
  });

  it('leaves ISO dates unchanged', () => {
    const headers = ['task', 'status', 'priority', 'due date'];
    const rows = [
      { 'task': 'Fix login', 'status': 'Not started', 'priority': 'High', 'due date': '2026-06-15' }
    ];

    const format = detectImportFormat(headers);
    const tasks = mapRowsToTasks(headers, rows, format.format);

    expect(tasks[0].dueDate).toBe('2026-06-15');
  });

  it('matches due_date column name with underscore', () => {
    const headers = ['task', 'status', 'priority', 'due_date'];
    const rows = [
      { 'task': 'Fix login', 'status': 'Not started', 'priority': 'High', 'due_date': '15/06/2026' }
    ];

    const format = detectImportFormat(headers);
    const tasks = mapRowsToTasks(headers, rows, format.format);

    expect(tasks[0].dueDate).toBe('2026-06-15');
  });

  it('matches deadline column name', () => {
    const headers = ['task', 'status', 'priority', 'deadline'];
    const rows = [
      { 'task': 'Fix login', 'status': 'Not started', 'priority': 'High', 'deadline': '2026-06-15' }
    ];

    const format = detectImportFormat(headers);
    const tasks = mapRowsToTasks(headers, rows, format.format);

    expect(tasks[0].dueDate).toBe('2026-06-15');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/import-due-dates.test.mjs`
Expected: FAIL — DD/MM/YYYY not parsed, underscore column not matched.

- [ ] **Step 3: Fix the nbi-csv import path**

In `dashboard-server/server.js`, in the `nbi-csv` / `nbi-export` case block:

**Line 2471** — expand column matching. Change:
```javascript
      const iDue = ciAny('due date', 'due');
```
to:
```javascript
      const iDue = ciAny('due_date', 'due date', 'due', 'deadline');
```

**Line 2483** — apply `parseDdMmYyyy()`. Change:
```javascript
        dueDate: get(r, iDue),
```
to:
```javascript
        dueDate: parseDdMmYyyy(get(r, iDue)),
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/import-due-dates.test.mjs`
Expected: All 4 tests PASS.

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/import-due-dates.test.mjs
git commit -m "fix: parse due dates in nbi-csv import — handle DD/MM/YYYY + more column name variants"
```

---

### Task 6: Auto-Calculate Dates for Stories and Features (Feature 968107db)

**Files:**
- Modify: `nbi_project_dashboard.html:8889-8891` — make dates read-only for features/stories in inline detail
- Modify: `nbi_project_dashboard.html:9568-9570` — make dates read-only for features/stories in overlay detail
- Modify: `nbi_project_dashboard.html:9981` — auto-compute parent dates when child dates change

**Requirement:** Remove manual date entry for stories and features. Their date ranges should auto-compute from children (earliest start → latest end).

- [ ] **Step 1: Add the auto-compute helper function**

In `nbi_project_dashboard.html`, near the `aggHours()` function (which does similar child aggregation), add:

```javascript
function computeDateRange(taskId) {
  const children = getDescendants(taskId);
  if (children.length === 0) return { start: '', end: '' };
  let earliest = null;
  let latest = null;
  children.forEach(c => {
    if (c.startDate) {
      const d = safeParseDate(c.startDate);
      if (d && (!earliest || d < earliest)) earliest = d;
    }
    if (c.endDate || c.dueDate) {
      const d = safeParseDate(c.endDate || c.dueDate);
      if (d && (!latest || d > latest)) latest = d;
    }
  });
  return {
    start: earliest ? earliest.toISOString().slice(0, 10) : '',
    end: latest ? latest.toISOString().slice(0, 10) : ''
  };
}
```

Find `aggHours` using grep — it's near the task utility functions. Place `computeDateRange` right after it.

- [ ] **Step 2: Make date fields read-only for features and stories in the inline detail panel**

In `nbi_project_dashboard.html`, find lines 8889-8891 (inline detail date fields). Replace:

```javascript
  html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-startDate">Start Date</label><input id="inline-detail-startDate" type="date" value="${task.startDate||''}" onchange="updateTask('${id}','startDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-endDate">End Date</label><input id="inline-detail-endDate" type="date" value="${task.endDate||''}" onchange="updateTask('${id}','endDate',this.value)"></div>`;
  html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-dueDate">Due Date</label><input id="inline-detail-dueDate" type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
```

With:

```javascript
  const itemType = getItemType(task);
  const datesReadOnly = (itemType === 'feature' || itemType === 'story') && getChildren(task.id).length > 0;
  if (datesReadOnly) {
    const range = computeDateRange(id);
    html += `<div class="detail-field"><label class="detail-field__label">Start Date</label><input type="date" value="${range.start}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label">End Date</label><input type="date" value="${range.end}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label">Due Date</label><input type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-startDate">Start Date</label><input id="inline-detail-startDate" type="date" value="${task.startDate||''}" onchange="updateTask('${id}','startDate',this.value)"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-endDate">End Date</label><input id="inline-detail-endDate" type="date" value="${task.endDate||''}" onchange="updateTask('${id}','endDate',this.value)"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label" for="inline-detail-dueDate">Due Date</label><input id="inline-detail-dueDate" type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
  }
```

Note: Due Date stays editable for features/stories since it represents a deadline target, not a computed range.

- [ ] **Step 3: Apply the same logic to the overlay detail panel**

In `nbi_project_dashboard.html`, find lines 9568-9570 (overlay detail date fields). Apply the same pattern as Step 2, but with `detail-` prefixed IDs instead of `inline-detail-`:

```javascript
  const itemType = getItemType(task);
  const datesReadOnly = (itemType === 'feature' || itemType === 'story') && getChildren(task.id).length > 0;
  if (datesReadOnly) {
    const range = computeDateRange(id);
    html += `<div class="detail-field"><label class="detail-field__label">Start Date</label><input type="date" value="${range.start}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label">End Date</label><input type="date" value="${range.end}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label" for="detail-dueDate">Due Date</label><input id="detail-dueDate" type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label" for="detail-startDate">Start Date</label><input id="detail-startDate" type="date" value="${task.startDate||''}" onchange="updateTask('${id}','startDate',this.value)"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label" for="detail-endDate">End Date</label><input id="detail-endDate" type="date" value="${task.endDate||''}" onchange="updateTask('${id}','endDate',this.value)"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label" for="detail-dueDate">Due Date</label><input id="detail-dueDate" type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
  }
```

- [ ] **Step 4: Propagate date changes up the parent chain**

In `updateTask()` (line 9981), after the field update is applied and saved (after `save()` on line 10046), add parent date propagation for date fields:

After `save();` (line 10046), add:

```javascript
  if (field === 'startDate' || field === 'endDate') {
    let parent = task.parentId ? tasks.find(t => t.id === task.parentId) : null;
    while (parent) {
      const pt = getItemType(parent);
      if (pt === 'feature' || pt === 'story') {
        const range = computeDateRange(parent.id);
        if (parent.startDate !== range.start || parent.endDate !== range.end) {
          parent.startDate = range.start;
          parent.endDate = range.end;
          parent.updatedAt = new Date().toISOString();
          markDirty(parent.id);
        }
      }
      parent = parent.parentId ? tasks.find(t => t.id === parent.parentId) : null;
    }
  }
```

- [ ] **Step 5: Test manually**

Open a feature with child stories/tasks. Confirm:
- Start/End dates are greyed out and show computed range
- Due Date is still editable
- Changing a child task's dates updates the parent feature's range
- Features/stories with no children still have editable dates

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: auto-calculate start/end dates for features and stories from children"
```

---

### Task 7: Copy/Paste Date Fields (Feature c650d170)

**Files:**
- Modify: `nbi_project_dashboard.html` — add paste handler to date inputs

**Context:** Native `<input type="date">` fields accept paste of ISO format (`2026-05-07`) in most browsers, but reject pasted text in other formats (DD/MM/YYYY, "May 7, 2026", etc.). The fix: intercept paste events on date inputs and normalise the pasted text.

- [ ] **Step 1: Add a global paste handler for date inputs**

In `nbi_project_dashboard.html`, in the event delegation section (near the existing `document.addEventListener` blocks), add:

```javascript
document.addEventListener('paste', (e) => {
  const el = e.target;
  if (el.tagName !== 'INPUT' || el.type !== 'date') return;
  const text = (e.clipboardData || window.clipboardData).getData('text').trim();
  if (!text) return;
  // Already ISO format — let browser handle it
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return;
  // DD/MM/YYYY or D/M/YYYY
  const ukMatch = text.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (ukMatch) {
    e.preventDefault();
    let [, dd, mm, yyyy] = ukMatch;
    if (yyyy.length === 2) yyyy = (parseInt(yyyy) > 50 ? '19' : '20') + yyyy;
    const iso = `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    el.value = iso;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  // "May 7, 2026" or "7 May 2026" style
  const months = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  const namedMatch = text.match(/^(\d{1,2})\s+(\w{3,})\s+(\d{4})$/) || text.match(/^(\w{3,})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (namedMatch) {
    e.preventDefault();
    let day, monthName, year;
    if (/^\d/.test(namedMatch[1])) { day = namedMatch[1]; monthName = namedMatch[2]; year = namedMatch[3]; }
    else { monthName = namedMatch[1]; day = namedMatch[2]; year = namedMatch[3]; }
    const monthNum = months[monthName.toLowerCase().slice(0, 3)];
    if (monthNum) {
      const iso = `${year}-${String(monthNum).padStart(2, '0')}-${day.padStart(2, '0')}`;
      el.value = iso;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
});
```

- [ ] **Step 2: Test manually**

Copy "15/06/2026" from a spreadsheet. Paste into a date field on a task. Confirm the date is set to 2026-06-15. Also test "June 15, 2026" and "2026-06-15".

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: normalise pasted dates in date fields — DD/MM/YYYY and named month formats"
```

---

### Task 8: Add Timestamps to Warning Notifications (Feature 4601dfb2)

**Files:**
- Modify: `nbi_project_dashboard.html:22399-22408` — add timestamp to warning objects
- Modify: `nbi_project_dashboard.html:22499-22513` — display timestamp in warning rendering

**Context:** Warnings are computed fresh every time from task data. They have no inherent creation date. The most meaningful "date" is when the warning condition became true (e.g., when a task became overdue, or when it was last updated).

- [ ] **Step 1: Add timestamp to warning objects**

In `nbi_project_dashboard.html`, in `computeWarnings()` at the warning push block (lines 22399-22408), change:

```javascript
    if (warning) {
      warnings.push({
        id: t.id,
        title: t.title || 'Untitled',
        client: getTaskClient(t),
        dueDate: t.dueDate,
        severity: warning.severity,
        type: warning.type,
        label: warning.label
      });
    }
```

To:

```javascript
    if (warning) {
      warnings.push({
        id: t.id,
        title: t.title || 'Untitled',
        client: getTaskClient(t),
        dueDate: t.dueDate,
        severity: warning.severity,
        type: warning.type,
        label: warning.label,
        since: t.updatedAt || t.createdAt || ''
      });
    }
```

The `since` field uses the task's `updatedAt` (or `createdAt` as fallback) as a proxy for when the warning condition arose. This is imperfect but meaningful — it tells the user when the task was last touched, which contextualises the warning.

- [ ] **Step 2: Display the timestamp in warning rendering**

In `nbi_project_dashboard.html`, in `renderWarnAlertContent()`, find the warning item template (lines 22499-22506). The `warn-item__meta` line currently shows:

```javascript
          <div class="warn-item__meta">${w.client ? esc(w.client) + ' &middot; ' : ''}${esc(w.label)}</div>
```

Change to:

```javascript
          <div class="warn-item__meta">${w.client ? esc(w.client) + ' &middot; ' : ''}${esc(w.label)}${w.since ? ' &middot; ' + timeAgo(w.since) : ''}</div>
```

Verify `timeAgo()` exists by grepping for it — this is the same function used for notification timestamps.

- [ ] **Step 3: Verify timeAgo exists**

Run: `grep -n "function timeAgo" nbi_project_dashboard.html`

If it exists, no action needed. If not, add a simple implementation near the date utility functions:

```javascript
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const secs = Math.floor((Date.now() - d) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
  if (secs < 604800) return Math.floor(secs / 86400) + 'd ago';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
```

- [ ] **Step 4: Test manually**

Open the Alerts panel. Confirm warnings now show a relative time (e.g., "3d ago") after the warning label.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: add timestamps to warning notifications — shows when task was last updated"
```

---

## Dependency Map

```
Task 1 (sort order)         → server.js only, no dependencies
Task 2 (people filter)      → HTML only, no dependencies
Task 3 (sync focus)         → HTML only, no dependencies
Task 4 (5-digit years)      → server.js + HTML, no dependencies
Task 5 (import due dates)   → server.js only, no dependencies
Task 6 (auto dates)         → HTML only, depends on no other task
Task 7 (paste dates)        → HTML only, no dependencies
Task 8 (warning timestamps) → HTML only, no dependencies
```

All 8 tasks are independent. They can be executed in any order or in parallel. Tasks 1, 4, 5 touch `server.js`. Tasks 2, 3, 4, 6, 7, 8 touch `nbi_project_dashboard.html`. Task 4 touches both.

## Post-Fix Checklist

- [ ] Run `npm test` — all unit tests pass
- [ ] Run `npm run test:all` — all unit + e2e tests pass
- [ ] Restart PM2: `pm2 restart nbi-dashboard`
- [ ] Verify through https://worksage.nbi-consulting.com in browser
- [ ] Update bug_reports status to `please_review` for each fixed bug
- [ ] Add bug_report_comments for each fix
