# Bug Batch Triage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 28 open bugs/features from the WorkSage bug tracker, executing criticals first, then quick wins, then scroll/sync cluster, then medium investigation items, then feature requests.

**Architecture:** All changes target the monolithic `server.js` (~9600 lines) and `nbi_project_dashboard.html` (~21300 lines). Each fix follows the CLAUDE.md Bug Triage Pipeline (Receive→Review→Plan→Prioritise→Fix→Test→Update).

**Tech Stack:** Node.js/Express, PostgreSQL, vanilla JS SPA, Vitest, Playwright

---

## Wave 1: CRITICAL (2 items)

### Task 1: Connected Statuses — Bidirectional Status Cascade (c7e48ddf)

**Files:**
- Modify: `dashboard-server/server.js` — PATCH /api/tasks/:id (after line 5429)
- Test: `dashboard-server/tests/unit/status-cascade.test.mjs` (new)

**Behaviour:**
- **Upward:** When a task status changes, check if ALL siblings under the same parent are now Done or Cancelled. If yes, auto-set the parent to Done. Recurse upward.
- **Downward:** When a parent is set to Done, Cancelled, or Blocked, cascade that status to ALL descendants (extend existing Cancelled cascade at line 5411 to also handle Done and Blocked). Only applies to the mentioned statuses per the bug description.
- **Guard:** Don't cascade if the new status equals the old status (prevent loops).

**Implementation — Server side (after line 5429 in server.js):**

- [ ] **Step 1: Write failing tests for upward cascade**

```javascript
// tests/unit/status-cascade.test.mjs
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// Test: when all children of a feature are Done, feature auto-completes
// Test: when all children are mix of Done + Cancelled, parent completes
// Test: when one child is still In progress, parent does NOT auto-complete
// Test: recursive upward — story→feature→project chain
```

- [ ] **Step 2: Write failing tests for downward cascade**

```javascript
// Test: marking project Done → all descendants become Done
// Test: marking feature Blocked → all children become Blocked
// Test: does NOT cascade statuses other than Done/Cancelled/Blocked
```

- [ ] **Step 3: Implement upward cascade after line 5429**

After updating the task status and the existing cascade-cancel logic, add:

```javascript
// Upward status propagation: if ALL children of parent are Done/Cancelled, parent auto-completes
if (['Done', 'Cancelled'].includes(req.body.status) && updatedTask.parent_id) {
  try {
    let parentId = updatedTask.parent_id;
    while (parentId) {
      const { rows: siblings } = await pool.query(
        'SELECT id, status FROM tasks WHERE parent_id = $1', [parentId]
      );
      const allTerminal = siblings.length > 0 && siblings.every(s => s.status === 'Done' || s.status === 'Cancelled');
      if (!allTerminal) break;
      const allDone = siblings.every(s => s.status === 'Done');
      const newParentStatus = allDone ? 'Done' : 'Cancelled';
      const { rows: [parent] } = await pool.query(
        'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 AND status != $1 RETURNING id, parent_id',
        [newParentStatus, parentId]
      );
      if (!parent) break;
      await auditLog('task', parentId, 'cascade_complete', req.user?.displayName, { status: newParentStatus });
      parentId = parent.parent_id;
    }
  } catch (e) {
    log('warn', 'Tasks', 'Upward status cascade failed', { error: e.message });
  }
}
```

- [ ] **Step 4: Extend downward cascade (modify line 5411)**

Replace the existing Cancelled-only cascade with one that handles Done, Cancelled, and Blocked:

```javascript
// Downward cascade: Done/Cancelled/Blocked from parent to all descendants
const CASCADE_STATUSES = ['Done', 'Cancelled', 'Blocked'];
if (CASCADE_STATUSES.includes(req.body.status) && (!oldTask || oldTask.status !== req.body.status)) {
  const hasChildren = (await pool.query('SELECT 1 FROM tasks WHERE parent_id = $1 LIMIT 1', [req.params.id])).rows.length > 0;
  if (hasChildren) {
    try {
      const { rows: cascaded } = await pool.query(`
        WITH RECURSIVE descendants AS (
          SELECT id FROM tasks WHERE parent_id = $1
          UNION ALL
          SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
        )
        UPDATE tasks SET status = $2, updated_at = NOW()
        WHERE id IN (SELECT id FROM descendants) AND status != $2
        RETURNING id
      `, [req.params.id, req.body.status]);
      if (cascaded.length > 0) {
        await auditLog('task', req.params.id, 'cascade_status', req.user?.displayName, { status: req.body.status, count: cascaded.length });
      }
    } catch (e) {
      log('warn', 'Tasks', 'Downward status cascade failed', { error: e.message });
    }
  }
}
```

- [ ] **Step 5: Run tests, verify, commit**

### Task 2: Prerequisites Blocked Cascade (f5a6bff2)

**Files:**
- Modify: `dashboard-server/server.js` — PATCH /api/tasks/:id (after the cascade logic)
- Test: `dashboard-server/tests/unit/prereq-cascade.test.mjs` (new)

**Behaviour:** When a task is marked Blocked or Cancelled, find all tasks that depend on it (have it in their `dependencies` array) and mark them Blocked.

- [ ] **Step 1: Write failing test**

```javascript
// Test: marking prereq Blocked → dependant becomes Blocked
// Test: marking prereq Cancelled → dependant becomes Blocked
// Test: does NOT cascade if dependant is already Done
```

- [ ] **Step 2: Implement after the status cascade logic**

```javascript
// Prerequisite cascade: when task becomes Blocked/Cancelled, block its dependants
if (['Blocked', 'Cancelled'].includes(req.body.status) && (!oldTask || oldTask.status !== req.body.status)) {
  try {
    const { rows: dependants } = await pool.query(`
      UPDATE tasks SET status = 'Blocked', updated_at = NOW()
      WHERE $1 = ANY(dependencies) AND status NOT IN ('Done', 'Cancelled', 'Blocked')
      RETURNING id
    `, [req.params.id]);
    if (dependants.length > 0) {
      await auditLog('task', req.params.id, 'cascade_block_dependants', req.user?.displayName, { count: dependants.length });
    }
  } catch (e) {
    log('warn', 'Tasks', 'Prerequisite block cascade failed', { error: e.message });
  }
}
```

- [ ] **Step 3: Run tests, verify, commit**

---

## Wave 2: QUICK FIXES (9 items)

### Task 3: Client Filters Apply to Bug Tracker (c057f2f9)

**Files:** Modify `nbi_project_dashboard.html`

**Investigation:** The `renderBugTrackerView` at line 17359 uses `_bugReportsData.reports` with its own `_btFilter*` variables — it does NOT use `currentFilter.client`. The issue is likely in `getFilteredTasks()` being called elsewhere on the bug tracker page, or the page/view header showing the filter. Need to check if the sidebar or any shared component applies `currentFilter` when `currentView === 'bugs'`.

- [ ] **Step 1: Find where client filter leaks into bug tracker view — search for `currentFilter` usage near bug tracker rendering**
- [ ] **Step 2: Add guard: skip `currentFilter.client` when `currentView === 'bugs'`**
- [ ] **Step 3: Test manually, commit**

### Task 4: Date Input Fires Validation Too Early (7cc027e5)

**Files:** Modify `nbi_project_dashboard.html` — year validation logic

**Root cause:** The year validation (1900-2099 range) fires on each keystroke. After typing "2" for the year, it validates "2" as a year, fails (not in 1900-2099), and kicks the user out of the field.

- [ ] **Step 1: Find the validation — search for 1900/2099 range check in input handlers**
- [ ] **Step 2: Change to validate only when year has 4 digits (`.length === 4`), or validate on blur instead of on input**
- [ ] **Step 3: Test with the exact repro: enter 08/05/2--- and verify no premature kick-out**
- [ ] **Step 4: Commit**

### Task 5: Gantt Label Bar Scrolls Out of Sight (b2628531)

**Files:** Modify `nbi_project_dashboard.html` — CSS for `.gantt__label-col` and `.gantt__row-label`

**Root cause:** The Gantt label column scrolls horizontally with the timeline. It needs `position: sticky; left: 0; z-index: 3;` and a solid background.

- [ ] **Step 1: Check existing CSS at line ~1013 for `.gantt__label-col`**
- [ ] **Step 2: Add `position: sticky; left: 0; z-index: 3; background: var(--bg-base);` to label column CSS**
- [ ] **Step 3: Same for `.gantt__row-label` — needs sticky + background so rows stay visible during horizontal scroll**
- [ ] **Step 4: Test by scrolling horizontally in Gantt — labels should stay fixed**
- [ ] **Step 5: Commit**

### Task 6: Search Shows Wrong Results (366d49fd)

**Files:** Modify `nbi_project_dashboard.html` — search/filter handler

- [ ] **Step 1: Find the project search input handler and the filtering logic**
- [ ] **Step 2: Fix to search task titles specifically, not folder/project names**
- [ ] **Step 3: Commit**

### Task 7: Can't Add Assignee to New Story (c52c8027)

**Files:** Modify `nbi_project_dashboard.html` — item creation form

- [ ] **Step 1: Find the create-item form/handler and check if assignees field is included for story item_type**
- [ ] **Step 2: Ensure assignees are passed in the POST request for stories**
- [ ] **Step 3: Commit**

### Task 8: Percentage Not Calculated on Tasks (1e8de733)

**Files:** Modify `nbi_project_dashboard.html` — percentage display for leaf tasks

- [ ] **Step 1: Find where percentage is shown on individual tasks (detail panel, tree view)**
- [ ] **Step 2: For leaf tasks: calculate as `hours_spent / hours_estimated * 100` when estimates exist, or hide when no estimate**
- [ ] **Step 3: Commit**

### Task 9: Documentation Hyperlinks Can't Be Clicked (d765b863)

**Files:** Modify `nbi_project_dashboard.html` — doc editor/viewer link handling

- [ ] **Step 1: Find the Tiptap editor config and link extension — check if link click handler is configured**
- [ ] **Step 2: Ensure links in the rendered output have proper `<a>` tags with `target="_blank"` and aren't blocked by `preventDefault` or `pointer-events: none`**
- [ ] **Step 3: Commit**

### Task 10: "NBI Only" Nests Inside Itself (544fc78a)

**Files:** Modify `nbi_project_dashboard.html` — NBI Only block toggle

- [ ] **Step 1: Find the NBI Only wrap command (likely Tiptap custom node)**
- [ ] **Step 2: Add guard: if selection is already inside an NBI Only block, don't allow wrapping again**
- [ ] **Step 3: Commit**

### Task 11: "Mark As Repeating" Inconsistent (a1ec1a84)

**Files:** Modify `nbi_project_dashboard.html` — repeating task checkbox visibility

- [ ] **Step 1: Find the "Mark As Repeating" checkbox/option and its visibility condition**
- [ ] **Step 2: Ensure it's visible for all task-level items (or all item types that should support it), not conditionally hidden by view context (standup vs project page)**
- [ ] **Step 3: Commit**

---

## Wave 3: SCROLL/SYNC CLUSTER (5 items → 1 root cause fix)

Bug IDs: 9bb9eb1a, 2e005a41, 94b12f59, 9c21224b, a7a50500

### Task 12: Fix Scroll Preservation During Sync Re-Render

**Files:**
- Modify: `nbi_project_dashboard.html` — `_softReRender()` at line 6244
- Modify: `nbi_project_dashboard.html` — `renderContent()` at line 5026

**Root cause:** `_softReRender` at line 6252 uses `savedScroll > 0` which fails when scroll is at position 0 (falsy). Also, only `.main__content` scrollTop is preserved — the Gantt's own scroll (`.gantt` overflow-x/y) is lost on re-render. Additionally, the sync re-render may interrupt in-flight edits despite the `activeElement` guard.

- [ ] **Step 1: Fix the scroll preservation in `_softReRender` (line 6244)**

```javascript
function _softReRender() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
  const detailPanel = document.getElementById('detailPanel');
  if (detailPanel && detailPanel.classList.contains('open')) return;
  // Also guard if inline detail panel is open
  const inlineDetail = document.getElementById('inlineDetailPanel');
  if (inlineDetail && !inlineDetail.classList.contains('tasks-layout__detail--hidden')) return;
  
  const scrollEl = document.querySelector('.main__content');
  if (!scrollEl) { renderContent(); return; }
  const savedScroll = scrollEl.scrollTop;
  
  // Save Gantt scroll position too
  const ganttEl = scrollEl.querySelector('.gantt');
  const savedGanttScrollLeft = ganttEl ? ganttEl.scrollLeft : 0;
  const savedGanttScrollTop = ganttEl ? ganttEl.scrollTop : 0;
  
  renderContent();
  if (typeof renderSidebar === 'function') renderSidebar();
  if (typeof updateWarnAlertButton === 'function') updateWarnAlertButton();
  
  // Restore all scroll positions (use >= 0 not > 0)
  scrollEl.scrollTop = savedScroll;
  const newGanttEl = scrollEl.querySelector('.gantt');
  if (newGanttEl) {
    newGanttEl.scrollLeft = savedGanttScrollLeft;
    newGanttEl.scrollTop = savedGanttScrollTop;
  }
}
```

- [ ] **Step 2: Test — make changes as another user, verify scroll doesn't jump**
- [ ] **Step 3: Commit — single commit referencing all 5 bug IDs**

### Task 13: Updates Not Showing Until Refresh (9c21224b)

**Root cause:** When updating a field in the detail panel, the local `tasks` array may not reflect the change immediately if the PATCH response isn't applied to the local state before the next render.

- [ ] **Step 1: Find the inline field update handler (the PATCH call after editing title/assignee)**
- [ ] **Step 2: Ensure the local `tasks` array is updated optimistically BEFORE the PATCH response, not after**
- [ ] **Step 3: Test — edit a title, verify it shows immediately without reopen/refresh**
- [ ] **Step 4: Commit**

---

## Wave 4: MEDIUM INVESTIGATION (6 items)

### Task 14: Warning Spam — Undeliverable Emails (68168751)

- [ ] **Step 1: Find the inbound email processing code — look for "InboundEmail" handler**
- [ ] **Step 2: Add filter to skip/deduplicate "Undeliverable" bounce-back emails from the warning system**
- [ ] **Step 3: Add a purge for existing spam warnings**
- [ ] **Step 4: Commit**

### Task 15: Reports No Longer Sending (3a6436a4)

- [ ] **Step 1: Check the cron job that sends daily reports (line ~9630 in server.js)**
- [ ] **Step 2: Check email config — the undeliverable emails suggest SMTP or recipient issues**
- [ ] **Step 3: Test by triggering a manual report send**
- [ ] **Step 4: Fix and commit**

### Task 16: Leads Client Contact Info Not Saving (a8e9ffd3)

- [ ] **Step 1: Find PATCH /api/leads endpoint and the UI save handler for contact details**
- [ ] **Step 2: Check if the contact fields are in the allowed update fields list**
- [ ] **Step 3: Fix and commit**

### Task 17: SoW Upload Failed (e6108a53)

- [ ] **Step 1: Find the PDF upload/parse endpoint and check the pdf-parse library usage**
- [ ] **Step 2: Test with the specific DS&A SoW PDF — determine if it's a PDF version/encoding issue**
- [ ] **Step 3: Add fallback handling or better error message**
- [ ] **Step 4: Commit**

### Task 18: Milestones Don't Appear for Others (08ba7dbf)

- [ ] **Step 1: Find GET /api/clients/:clientId/milestones endpoint**
- [ ] **Step 2: Check if milestones are filtered by user permissions or client access**
- [ ] **Step 3: Check if the frontend loads milestones for all visible clients or only the "owned" ones**
- [ ] **Step 4: Fix permission/visibility logic, commit**

### Task 19: "Hide Done" Sometimes Hides All Tasks (950e88a9)

- [ ] **Step 1: Review `_ganttHideDone` and `currentFilter.incomplete` interaction**
- [ ] **Step 2: Check for race condition where both filters stack**
- [ ] **Step 3: If unreproducible, add defensive guard and close as cannot-reproduce**
- [ ] **Step 4: Commit if changes made**

---

## Wave 5: FEATURE REQUESTS (7 items)

These are new functionality, lower priority. Each gets its own task:

### Task 20: "Blocked" Tag — Show Details (480e6e2a)
Show blocker_info as collapsible section under Status dropdown when status is Blocked.

### Task 21: Task Not Started Warning (2231e20b)
Add to the warning cron: tasks with start_date < now and status "Not started" → warn first assignee.

### Task 22: Standup Overdue/Blocked Visual Markers (58debdd7)
In standup dropdown, colour overdue task dates red and add blocked tag in purple.

### Task 23: Save History / Undo (054b30c3)
Store last 3 field values per task in a `task_field_history` table. Show undo button in detail panel.

### Task 24: Assign SoW to Lead Card (9b7d31c9)
Add `sow_id` foreign key to leads table, UI picker in lead detail.

### Task 25: Minimise Milestones + Remove Milestones (92ec9998 + new)
Add collapse/expand toggle for milestones panel. Add delete endpoint for milestones.

### Task 26: Set Hours Per Week / Holidays (8ce48ae1)
Add `weekly_hours` and `time_off` fields to users table. Use in workload calculations.

---

## Execution Notes

- Each fix follows the CLAUDE.md Bug Triage Pipeline
- After ALL items in a wave are done: single commit with multi-bullet message referencing each bug ID
- Run `npm test` after each wave, `npm run test:all` after frontend changes
- Update bug_reports status to `please_review` and add fix comment for each item
- Restart PM2 after server.js changes
