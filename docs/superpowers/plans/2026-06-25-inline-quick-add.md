# Inline Quick-Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hover-reveal plus icons on project/feature/story rows in the tree view that open an inline quick-add form for creating child items without leaving the tree.

**Architecture:** Three-file frontend change. CSS adds the hover-reveal button, form container, and highlight animation styles. `renderTaskRow()` in `nbi-kanban.js` emits the plus button HTML per row. New global functions in `nbi-detail.js` (`showQuickAdd`, `submitQuickAdd`, `closeQuickAdd`) handle form lifecycle, inline DOM insertion, and the `createTaskObject()` pipeline. No server changes.

**Tech Stack:** Vanilla JS (global scope, no build step), CSS custom properties, existing `data-action` event delegation in `nbi-events.js`.

**Spec:** `docs/superpowers/specs/2026-06-25-inline-quick-add-design.md`

---

### Task 1: CSS — Quick-Add Button, Form, and Highlight Styles

**Files:**
- Modify: `dashboard-server/public/css/dashboard.css`

These styles must be added before any JS changes so the elements render correctly when the JS tasks land.

- [ ] **Step 1: Add quick-add button styles**

Add after line 728 (after `.task-row__assignee`):

```css
/* ---- Quick-Add inline creation ---- */
.quick-add-btn {
  width: 20px; height: 20px; border-radius: 4px; border: none;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff; cursor: pointer;
  flex-shrink: 0; opacity: 0; transition: opacity 0.15s;
  padding: 0; line-height: 1;
}
.task-row:hover .quick-add-btn,
.quick-add-btn:focus-visible { opacity: 1; }
@media (hover: none) { .quick-add-btn { opacity: 1; } }
```

- [ ] **Step 2: Add quick-add form styles**

Add immediately after the button styles:

```css
.quick-add-form {
  padding: 10px 16px; border-radius: 6px; margin: 4px 8px;
}
.quick-add-form__header {
  display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
}
.quick-add-form__label { font-size: 0.7rem; font-weight: 500; }
.quick-add-form__fields {
  display: flex; gap: 8px; align-items: center;
}
.quick-add-form__fields input,
.quick-add-form__fields select {
  background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: 4px; padding: 6px 10px; color: var(--text-primary);
  font-size: 0.78rem; font-family: var(--font-body);
}
.quick-add-form__fields input:focus,
.quick-add-form__fields select:focus {
  outline: none; border-color: var(--accent);
}
.quick-add-form__fields input[type="text"] { flex: 2; }
.quick-add-form__fields input[type="date"] { flex: 1; }
.quick-add-form__fields select { flex: 1; }
.quick-add-form__create-btn {
  color: #fff; border: none; border-radius: 4px; padding: 6px 14px;
  font-size: 0.78rem; font-weight: 600; cursor: pointer; white-space: nowrap;
}
.quick-add-form__close-btn {
  background: none; color: var(--text-muted); border: none;
  font-size: 16px; cursor: pointer; padding: 2px 6px;
}
.quick-add-form__hint {
  color: var(--text-muted); font-size: 0.65rem; margin-top: 6px;
}
.quick-add-form__fields input.quick-add-form__error {
  border-color: var(--danger); animation: qa-shake 0.3s;
}
@keyframes qa-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
```

- [ ] **Step 3: Add post-creation highlight styles**

Add immediately after:

```css
.task-row--just-created {
  border-left: 3px solid var(--qa-highlight-color, var(--accent));
  background: color-mix(in srgb, var(--qa-highlight-color, var(--accent)) 8%, transparent);
  transition: border-left-color 1.5s ease-out, background 1.5s ease-out;
}
.task-row--just-created.task-row--fade {
  border-left-color: transparent; background: transparent;
}
```

- [ ] **Step 4: Add mobile responsive overrides**

Add inside the existing `@media (max-width: 768px)` block (around line 1472 where `.quick-add-bar` already has mobile rules):

```css
  .quick-add-form__fields { flex-direction: column; gap: 6px; }
  .quick-add-form__fields input, .quick-add-form__fields select { width: 100%; flex: none; }
```

- [ ] **Step 5: Verify CSS loads**

Run: `cd dashboard-server && npm start`
Open: `http://localhost:8888/nbi_project_dashboard.html`
Verify: No CSS parse errors in browser console. Existing tree view renders normally.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/public/css/dashboard.css
git commit -m "feat(ui): add CSS styles for inline quick-add button, form, and highlight animation"
```

---

### Task 2: renderTaskRow — Add Plus Icon Button

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-kanban.js:348-380`

Add the quick-add button to each tree row that has a valid child type (project, feature, story). Uses the existing `data-action` delegation pattern.

- [ ] **Step 1: Add the plus button HTML inside renderTaskRow**

In `dashboard-server/public/js/views/nbi-kanban.js`, find line 379 (the assignee span, just before `html += '</div>'` that closes the row):

```javascript
  if (task.assignees && task.assignees.length > 0) html += `<span class="task-row__assignee">${esc(task.assignees[0])}</span>`;
```

Add the plus button immediately AFTER that line, BEFORE `html += '</div>';`:

```javascript
  const _childType = VALID_CHILD_TYPE[getItemType(task)];
  if (_childType) {
    const _childMeta = ITEM_TYPE_META[_childType];
    html += `<button type="button" class="quick-add-btn" style="background:${_childMeta.colour}" aria-label="Add ${_childMeta.label}" data-action="showQuickAdd" data-stop data-arg0="${task.id}">+</button>`;
  }
```

- [ ] **Step 2: Verify the button renders**

Run the server, open the dashboard, navigate to a project view with items. Hover over a feature row — the plus button should appear in the child type's colour. Hover off — it should disappear. Tab to the button — it should become visible via `:focus-visible`.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/public/js/views/nbi-kanban.js
git commit -m "feat(ui): add hover-reveal plus icon button to tree rows for quick-add"
```

---

### Task 3: Quick-Add Functions — showQuickAdd, submitQuickAdd, closeQuickAdd

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-detail.js` (add after `createTaskObject()` at ~line 1191)

This is the core logic: showing the form, handling submit (with inline DOM insertion), and closing. All functions are global (no IIFE wrapping) because the codebase uses `data-action` delegation that calls `window[action]()`.

- [ ] **Step 1: Add the showQuickAdd function**

Insert after the `createTaskObject()` function (after line 1191) in `nbi-detail.js`:

```javascript
/** Inline quick-add: show the form below a parent's children */
function showQuickAdd(parentId) {
  closeQuickAdd();
  const parent = tasks.find(t => t.id === parentId);
  if (!parent) return;
  const parentType = getItemType(parent);
  const childType = VALID_CHILD_TYPE[parentType];
  if (!childType) return;
  const childMeta = ITEM_TYPE_META[childType];

  // Expand parent if collapsed
  if (collapsedTaskIds.has(parentId)) {
    collapsedTaskIds.delete(parentId);
    try { localStorage.setItem('nbi_collapsed_tasks', JSON.stringify([...collapsedTaskIds])); } catch(e) {}
    const childContainer = document.getElementById('children_' + parentId);
    if (childContainer) childContainer.classList.remove('hidden');
    const toggleEl = document.querySelector(`[data-action="toggleChildren"][data-arg0="${parentId}"]`);
    if (toggleEl) toggleEl.innerHTML = '&#9660;';
  }

  // Find or create children container
  let container = document.getElementById('children_' + parentId);
  if (!container) {
    const parentRow = document.querySelector(`[data-task-id="${parentId}"]`);
    if (!parentRow) return;
    container = document.createElement('div');
    container.className = 'task-children';
    container.id = 'children_' + parentId;
    container.setAttribute('ondragover', `onDragOver(event,'${parentId}')`);
    container.setAttribute('ondragleave', 'onDragLeave(event)');
    container.setAttribute('ondrop', `onDrop(event,'${parentId}')`);
    parentRow.insertAdjacentElement('afterend', container);
    // Update toggle arrow
    const toggleEl = document.querySelector(`[data-action="toggleChildren"][data-arg0="${parentId}"]`);
    if (toggleEl) toggleEl.innerHTML = '&#9660;';
  }

  // Build smart owner dropdown
  const parentAssignees = parent.assignees || [];
  const siblingAssignees = getChildren(parentId).flatMap(c => c.assignees || []);
  const contextPeople = [...new Set([...parentAssignees, ...siblingAssignees])].sort();
  const allPeople = (_cachedTeamMembers || []).filter(n => !contextPeople.includes(n));
  let ownerOpts = '<option value="">Owner...</option>';
  if (contextPeople.length > 0) {
    ownerOpts += `<optgroup label="On this ${ITEM_TYPE_META[parentType].label.toLowerCase()}">`;
    contextPeople.forEach(n => { ownerOpts += `<option value="${esc(n)}">${esc(n)}</option>`; });
    ownerOpts += '</optgroup>';
  }
  if (allPeople.length > 0) {
    ownerOpts += '<optgroup label="Everyone else">';
    allPeople.forEach(n => { ownerOpts += `<option value="${esc(n)}">${esc(n)}</option>`; });
    ownerOpts += '</optgroup>';
  }

  const today = new Date().toISOString().slice(0, 10);
  const depth = _getTaskDepth(parent) + 1;
  const formHtml = `<div class="quick-add-form" id="quickAddForm" data-parent-id="${parentId}" data-child-type="${childType}" style="padding-left:${16 + depth * 20}px;background:color-mix(in srgb, ${childMeta.colour} 8%, transparent);border:1px solid color-mix(in srgb, ${childMeta.colour} 25%, transparent)">
    <div class="quick-add-form__header">
      ${itemTypeBadgeHtml({ itemType: childType, item_type: childType })}
      <span class="quick-add-form__label" style="color:${childMeta.colour}">Quick Add</span>
    </div>
    <div class="quick-add-form__fields">
      <input type="text" id="qaName" placeholder="${childMeta.label} name..." autofocus />
      <input type="date" id="qaStartDate" value="${today}" />
      <select id="qaOwner">${ownerOpts}</select>
      <button type="button" class="quick-add-form__create-btn" style="background:${childMeta.colour}" data-action="submitQuickAdd" data-stop>Create</button>
      <button type="button" class="quick-add-form__close-btn" data-action="closeQuickAdd" data-stop>&times;</button>
    </div>
    <div class="quick-add-form__hint">Enter to create &amp; add another &bull; Esc to close</div>
  </div>`;

  container.insertAdjacentHTML('beforeend', formHtml);

  // Focus name input
  const nameInput = document.getElementById('qaName');
  if (nameInput) {
    nameInput.focus();
    // Enter on name input submits
    nameInput.addEventListener('keydown', _qaKeyHandler);
  }
  // Escape on form closes it
  const form = document.getElementById('quickAddForm');
  if (form) form.addEventListener('keydown', _qaEscHandler);
}

function _qaKeyHandler(e) {
  if (e.key === 'Enter') { e.preventDefault(); submitQuickAdd(); }
}
function _qaEscHandler(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeQuickAdd(); }
}

/** Calculate depth of a task in the hierarchy (project=0, feature=1, etc.) */
function _getTaskDepth(task) {
  let depth = 0;
  let cur = task;
  const visited = new Set();
  while (cur && cur.parentId) {
    if (visited.has(cur.id)) break;
    visited.add(cur.id);
    cur = tasks.find(t => t.id === cur.parentId);
    depth++;
  }
  return depth;
}
```

- [ ] **Step 2: Add the submitQuickAdd function**

Insert immediately after `_getTaskDepth`:

```javascript
/** Submit the quick-add form: create item, insert row inline, keep form open */
function submitQuickAdd() {
  const form = document.getElementById('quickAddForm');
  if (!form) return;
  const parentId = form.dataset.parentId;
  const childType = form.dataset.childType;
  const nameInput = document.getElementById('qaName');
  const dateInput = document.getElementById('qaStartDate');
  const ownerSelect = document.getElementById('qaOwner');

  const title = (nameInput.value || '').trim();
  if (!title) {
    nameInput.classList.add('quick-add-form__error');
    nameInput.focus();
    setTimeout(() => nameInput.classList.remove('quick-add-form__error'), 600);
    return;
  }

  const parent = tasks.find(t => t.id === parentId);
  if (!parent) return;
  const client = getTaskClient(parent);
  const siblings = getChildren(parentId);
  const maxSort = siblings.length > 0 ? Math.max(...siblings.map(s => s.sortOrder || 0)) : 0;

  const assignees = ownerSelect.value ? [ownerSelect.value] : [];
  const t = createTaskObject({
    title,
    parentId,
    itemType: childType,
    client: client || '',
    startDate: dateInput.value || '',
    assignees,
    sortOrder: maxSort + 1,
  });
  tasks.push(t);
  markDirty(t.id);
  save();

  // Render the new row inline, above the form
  const childMeta = ITEM_TYPE_META[childType];
  const depth = _getTaskDepth(parent) + 1;
  const rowHtml = renderTaskRow(t, depth, null, null);
  form.insertAdjacentHTML('beforebegin', rowHtml);

  // Highlight animation
  const newRow = form.previousElementSibling;
  if (newRow) {
    newRow.style.setProperty('--qa-highlight-color', childMeta.colour);
    newRow.classList.add('task-row--just-created');
    setTimeout(() => {
      newRow.classList.add('task-row--fade');
      setTimeout(() => {
        newRow.classList.remove('task-row--just-created', 'task-row--fade');
        newRow.style.removeProperty('--qa-highlight-color');
      }, 1500);
    }, 50);
  }

  // Update sidebar counts
  renderSidebarCounts();

  // Clear name, keep date and owner, refocus
  nameInput.value = '';
  nameInput.focus();
}
```

- [ ] **Step 3: Add the closeQuickAdd function**

Insert immediately after `submitQuickAdd`:

```javascript
/** Close the quick-add form without creating */
function closeQuickAdd() {
  const form = document.getElementById('quickAddForm');
  if (!form) return;
  const parentId = form.dataset.parentId;
  form.remove();
  // Return focus to the parent row
  const parentRow = document.querySelector(`[data-task-id="${parentId}"]`);
  if (parentRow) parentRow.focus();
}
```

- [ ] **Step 4: Verify end-to-end flow**

1. Open the dashboard, navigate to a project with features and stories.
2. Hover over a feature row — the purple "+" button appears.
3. Click it — the inline form appears below the feature's stories.
4. Type a name, press Enter — the story appears in the tree with a highlight. The form stays open.
5. Type another name, press Enter — second story appears.
6. Press Escape — form closes, focus returns to the feature row.
7. Click "+" on a story row — the form appears for adding a task (grey themed).
8. Click "+" on a different feature while the task form is open — old form closes, new form opens.

- [ ] **Step 5: Verify edge cases**

1. Click "+" on a project with NO features — container is created dynamically, form appears, toggle arrow updates.
2. Submit with an empty name — input flashes red, no item created.
3. Check sidebar counts update after each creation.
4. Collapse a feature, click its "+" — it expands first, then shows the form.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/public/js/views/nbi-detail.js
git commit -m "feat(ui): implement inline quick-add form with smart owner dropdown and inline DOM insertion"
```

---

### Task 4: E2E Test — Quick-Add Workflow

**Files:**
- Create: `dashboard-server/tests/e2e/quick-add.spec.js`

E2E test covering the golden path and key edge cases. Follows the pattern from `kanban-drag.spec.js`: login, seed data, use `page.evaluate()` for view navigation.

- [ ] **Step 1: Write the e2e test file**

```javascript
// dashboard-server/tests/e2e/quick-add.spec.js
//
// E2E specs for the inline quick-add feature.
// Verifies: plus button appears on hover, form opens, item creates inline,
// form stays open for rapid entry, escape closes, empty parent gets container.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestTask } = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

async function loginAs(page, username, rawPassword) {
  await page.goto('/nbi_project_dashboard.html#tasks');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(username);
  await page.locator('#loginPass').fill(rawPassword);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForSelector('.sidebar__item', { state: 'visible', timeout: 10000 });
}

test.describe('Inline Quick-Add', () => {
  let user;
  let featureTask;

  test.beforeEach(async () => {
    await truncate();
    user = await createTestUser({ username: 'qatest', password: 'test123', role: 'admin', display_name: 'QA Tester' });
    // Create a project with one feature (no stories yet)
    const project = await createTestTask({ title: 'Test Project', item_type: 'project', client: 'Test Client' });
    featureTask = await createTestTask({ title: 'Test Feature', item_type: 'feature', parent_id: project.id, client: 'Test Client' });
  });

  test.afterEach(async () => { await truncate(); });

  test('plus button appears on feature row hover and opens form', async ({ page }) => {
    await loginAs(page, 'qatest', 'test123');
    await page.evaluate(() => switchView('tasks'));
    await page.waitForTimeout(500);

    // Find the feature row
    const featureRow = page.locator(`.task-row[data-task-id="${featureTask.id}"]`);
    await expect(featureRow).toBeVisible();

    // Plus button should be hidden initially
    const plusBtn = featureRow.locator('.quick-add-btn');
    await expect(plusBtn).toHaveCSS('opacity', '0');

    // Hover to reveal
    await featureRow.hover();
    await expect(plusBtn).toHaveCSS('opacity', '1');

    // Click to open form
    await plusBtn.click();
    const form = page.locator('#quickAddForm');
    await expect(form).toBeVisible();

    // Name input should be focused
    const nameInput = page.locator('#qaName');
    await expect(nameInput).toBeFocused();
  });

  test('submitting creates item inline and keeps form open', async ({ page }) => {
    await loginAs(page, 'qatest', 'test123');
    await page.evaluate(() => switchView('tasks'));
    await page.waitForTimeout(500);

    // Open the quick-add form on the feature
    const featureRow = page.locator(`.task-row[data-task-id="${featureTask.id}"]`);
    await featureRow.hover();
    await featureRow.locator('.quick-add-btn').click();

    // Fill in name and press Enter
    await page.locator('#qaName').fill('My New Story');
    await page.locator('#qaName').press('Enter');

    // New row should appear in the tree
    const newRow = page.locator('.task-row:has-text("My New Story")');
    await expect(newRow).toBeVisible();

    // Form should still be open (rapid sibling entry)
    await expect(page.locator('#quickAddForm')).toBeVisible();

    // Name input should be cleared and refocused
    const nameInput = page.locator('#qaName');
    await expect(nameInput).toHaveValue('');
    await expect(nameInput).toBeFocused();
  });

  test('escape closes form without creating', async ({ page }) => {
    await loginAs(page, 'qatest', 'test123');
    await page.evaluate(() => switchView('tasks'));
    await page.waitForTimeout(500);

    const featureRow = page.locator(`.task-row[data-task-id="${featureTask.id}"]`);
    await featureRow.hover();
    await featureRow.locator('.quick-add-btn').click();
    await expect(page.locator('#quickAddForm')).toBeVisible();

    await page.locator('#qaName').press('Escape');
    await expect(page.locator('#quickAddForm')).not.toBeVisible();
  });

  test('empty name shows validation error', async ({ page }) => {
    await loginAs(page, 'qatest', 'test123');
    await page.evaluate(() => switchView('tasks'));
    await page.waitForTimeout(500);

    const featureRow = page.locator(`.task-row[data-task-id="${featureTask.id}"]`);
    await featureRow.hover();
    await featureRow.locator('.quick-add-btn').click();

    // Press Enter with empty name
    await page.locator('#qaName').press('Enter');

    // Form should stay open, input should have error class
    await expect(page.locator('#quickAddForm')).toBeVisible();
    await expect(page.locator('#qaName')).toHaveClass(/quick-add-form__error/);
  });

  test('only one form open at a time', async ({ page }) => {
    await loginAs(page, 'qatest', 'test123');
    // Add a second feature so we have two plus buttons
    await page.evaluate(() => {
      const t = createTaskObject({ title: 'Second Feature', itemType: 'feature', parentId: tasks.find(t => t.itemType === 'project')?.id, client: 'Test Client' });
      tasks.push(t);
      markDirty(t.id);
      save();
      renderContent();
    });
    await page.waitForTimeout(500);

    // Open form on first feature
    const rows = page.locator('.task-row:has(.quick-add-btn)');
    const first = rows.first();
    await first.hover();
    await first.locator('.quick-add-btn').click();
    await expect(page.locator('#quickAddForm')).toBeVisible();

    // Open form on second feature — first should close
    const second = rows.nth(1);
    await second.hover();
    await second.locator('.quick-add-btn').click();
    const forms = page.locator('#quickAddForm');
    await expect(forms).toHaveCount(1);
  });
});
```

- [ ] **Step 2: Run the e2e test**

Run: `cd dashboard-server && npm run test:e2e -- --grep "Quick-Add"`
Expected: All 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/e2e/quick-add.spec.js
git commit -m "test(e2e): add Playwright tests for inline quick-add feature"
```

---

### Task 5: Final Verification and Cleanup

**Files:**
- None new — this is a verification task

- [ ] **Step 1: Run the full test suite**

Run: `cd dashboard-server && npm run test:all`
Expected: All unit tests and e2e tests pass (including the new quick-add tests).

- [ ] **Step 2: Verify all 7 themes**

Open the dashboard, switch through each theme (Dark, Light, Midnight, Nord, Solarised, Dracula, Emerald). The quick-add button and form should render correctly in all themes because they use CSS custom properties (`--bg-input`, `--border-default`, `--text-primary`, `--text-muted`, `--accent`).

- [ ] **Step 3: Verify mobile responsive**

Open browser DevTools, toggle device toolbar to a phone-width viewport (375px). The quick-add form fields should stack vertically. The plus button should be permanently visible (not hover-dependent) on touch devices.

- [ ] **Step 4: Verify existing flows still work**

1. Header "+ New" menu → New Story → parent picker → creates story → opens detail. Unchanged.
2. Open a feature's detail panel → scroll to children → "+ Add Story" → creates and opens detail. Unchanged.
3. Drag-drop a task to a different story parent. Unchanged.

- [ ] **Step 5: Commit and restart PM2**

```bash
pm2 restart nbi-dashboard
```
