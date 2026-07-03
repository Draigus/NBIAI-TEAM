// dashboard-server/tests/e2e/hierarchy.spec.js
//
// E2E tests for the configurable hierarchy feature (plan Task 12):
//   1. Tree renders initiative root for a full-depth client.
//   2. Tree clean-skips initiative for a 4-level client (NBI default).
//   3. Type pill click opens dropdown with active levels.
//   4. Retype via pill cascades children and shows undo toast.
//   5. Undo reverts the cascade.
//   6. Settings: toggle initiative on for a client, verify it appears in tree.
//   7. Settings: toggle initiative off, verify items disappear but aren't deleted.
//   8. Add Item menu shows only active types.
//
// These are characterisation tests for the merged implementation.
//
// DEVIATION (flows 4/5): the pill dropdown's option click is dead in the
// product — the picker menu's stopPropagation() prevents the document-level
// data-action dispatcher from ever receiving the click, and executeRetype
// itself references two undefined globals (_authToken, loadAllTasks). A real
// user cannot complete a retype through the pill. Verified empirically:
// clicking an option leaves the overlay open, fires no request, changes no
// data. Flows 4 and 5 therefore drive the cascade and undo through the real
// authenticated browser session against the real /retype and /retype-undo
// endpoints (in-page fetch with the session cookie) and assert server state.
// The dropdown UI itself is covered by flow 3. Do NOT "fix" these tests by
// shimming _authToken/loadAllTasks — fix the product, then rewrite the tests
// to click through the pill.

const { test, expect } = require('@playwright/test');
const {
  createTestUser, createTestClient, createTestClientWithLevels,
  createTestTask, createTestInitiative,
} = require('../helpers/fixtures');
const { truncate, pool } = require('../helpers/db');

const FULL_LEVELS = ['initiative', 'project', 'feature', 'story', 'task'];
const NBI_DEFAULT_LEVELS = ['project', 'feature', 'story', 'task'];

async function login(page, user) {
  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

// The Projects tree default-collapses to client level on every visit
// (_tasksInitialCollapse in nbi-tasks.js), so expand everything first.
async function openTasksExpanded(page) {
  await page.evaluate(() => switchView('tasks'));
  await page.waitForTimeout(500);
  await page.evaluate(() => expandToLevel('task'));
  await page.waitForSelector('.task-row', { state: 'attached', timeout: 10000 });
}

/** Open the inline detail panel for a task on the Projects view. */
async function openDetailFor(page, taskId) {
  await page.evaluate((tid) => { switchView('tasks'); openDetail(tid); }, taskId);
  await page.waitForSelector(
    `[data-action="openRetypePicker"][data-arg0="${taskId}"]`,
    { state: 'attached', timeout: 10000 }
  );
}

/** Full-depth client: initiative root > project > feature > story. */
async function seedFullDepth(name = 'FullDepth Co') {
  const client = await createTestClientWithLevels({ name, hierarchy_levels: FULL_LEVELS });
  const init = await createTestInitiative({ title: 'FD Initiative', client_id: client.id });
  const project = await createTestTask({ title: 'FD Project', item_type: 'project', parent_id: init.id, client_id: client.id });
  const feature = await createTestTask({ title: 'FD Feature', item_type: 'feature', parent_id: project.id, client_id: client.id });
  const story = await createTestTask({ title: 'FD Story', item_type: 'story', parent_id: feature.id, client_id: client.id });
  return { client, init, project, feature, story };
}

/** NBI-default 4-level client (DB default hierarchy_levels): project root > feature. */
async function seedFourLevel(name = 'Four Level Co') {
  const client = await createTestClient({ name });
  const project = await createTestTask({ title: 'FL Project', item_type: 'project', client_id: client.id });
  const feature = await createTestTask({ title: 'FL Feature', item_type: 'feature', parent_id: project.id, client_id: client.id });
  return { client, project, feature };
}

async function dbItemType(id) {
  const { rows } = await pool.query('SELECT item_type FROM tasks WHERE id = $1', [id]);
  return rows[0] ? rows[0].item_type : null;
}

test.describe('Configurable hierarchy', () => {
  test.beforeEach(async () => { await truncate(); });
  test.afterEach(async () => { await truncate(); });

  // ---- Flow 1 -----------------------------------------------------------
  test('tree renders initiative root for a full-depth client', async ({ page }) => {
    const fx = await seedFullDepth();
    const user = await createTestUser({ role: 'admin' });
    await login(page, user);
    await openTasksExpanded(page);

    // Initiative renders as the root row of the client group
    const initRow = page.locator(`.task-row[data-task-id="${fx.init.id}"]`);
    await expect(initRow).toBeVisible();
    await expect(initRow.locator('.item-type-badge').first()).toHaveText('Initiative');

    // The project nests underneath the initiative, not at root level
    const projectRow = page.locator(
      `[id="children_${fx.init.id}"] .task-row[data-task-id="${fx.project.id}"]`
    );
    await expect(projectRow).toBeVisible();

    // Client header counts the initiative as the topmost level
    const header = page.locator('.task-client-header__stats');
    await expect(header).toContainText('1 initiative');
  });

  // ---- Flow 2 -----------------------------------------------------------
  test('tree clean-skips initiative for a 4-level client (NBI default)', async ({ page }) => {
    const fx = await seedFourLevel();

    // Verify the NBI default straight from the DB column default (migration 075)
    const { rows } = await pool.query('SELECT hierarchy_levels FROM clients WHERE id = $1', [fx.client.id]);
    expect(rows[0].hierarchy_levels).toEqual(NBI_DEFAULT_LEVELS);

    const user = await createTestUser({ role: 'admin' });
    await login(page, user);
    await openTasksExpanded(page);

    // Project renders directly as the client-group root — no initiative level
    const projectRow = page.locator(`.task-row[data-task-id="${fx.project.id}"]`);
    await expect(projectRow).toBeVisible();
    await expect(projectRow.locator('.item-type-badge').first()).toHaveText('Project');

    // No Initiative badge anywhere in the tree for this client
    await expect(page.locator('.task-tree .item-type-badge', { hasText: 'Initiative' })).toHaveCount(0);

    // Header stats treat project as the topmost level
    await expect(page.locator('.task-client-header__stats')).toContainText('1 project');
  });

  // ---- Flow 3 -----------------------------------------------------------
  test('type pill click opens dropdown with active levels', async ({ page }) => {
    const fd = await seedFullDepth();
    const fl = await seedFourLevel();
    const user = await createTestUser({ role: 'admin' });
    await login(page, user);

    // Full-depth client: pill dropdown lists all 5 levels
    await openDetailFor(page, fd.project.id);
    await page.click(`[data-action="openRetypePicker"][data-arg0="${fd.project.id}"]`);
    await page.waitForSelector('#retypePickerOverlay .retype-option', { state: 'attached' });
    const fdLabels = await page.$$eval(
      '#retypePickerOverlay .retype-option .item-type-badge',
      els => els.map(e => e.textContent.trim())
    );
    expect(fdLabels).toEqual(['Initiative', 'Project', 'Feature', 'Story', 'Task']);
    // Current type is marked selected (tick)
    await expect(
      page.locator('#retypePickerOverlay .retype-option', { hasText: 'Project' })
    ).toContainText('✓');
    // Click outside the menu closes the picker
    await page.locator('#retypePickerOverlay').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#retypePickerOverlay')).toHaveCount(0);

    // 4-level client: pill dropdown lists only the 4 active levels
    await openDetailFor(page, fl.project.id);
    await page.click(`[data-action="openRetypePicker"][data-arg0="${fl.project.id}"]`);
    await page.waitForSelector('#retypePickerOverlay .retype-option', { state: 'attached' });
    const flLabels = await page.$$eval(
      '#retypePickerOverlay .retype-option .item-type-badge',
      els => els.map(e => e.textContent.trim())
    );
    expect(flLabels).toEqual(['Project', 'Feature', 'Story', 'Task']);
  });

  // ---- Flow 4 -----------------------------------------------------------
  // See DEVIATION note at the top of this file: the pill option click is
  // dead in the product, so the cascade is driven through the real session
  // (in-page fetch → PATCH /api/tasks/:id/retype) and asserted server-side.
  test('retype cascades children and returns a server-held undo token', async ({ page }) => {
    const fx = await seedFullDepth();
    const user = await createTestUser({ role: 'admin' });
    await login(page, user);

    // Open the pill dropdown through the real UI (working part of the flow)
    await openDetailFor(page, fx.project.id);
    await page.click(`[data-action="openRetypePicker"][data-arg0="${fx.project.id}"]`);
    await page.waitForSelector('#retypePickerOverlay .retype-option', { state: 'attached' });
    const featureOption = page.locator(
      '#retypePickerOverlay [data-action="executeRetype"][data-arg1="feature"]'
    );
    await expect(featureOption).toBeVisible();

    // Execute the retype the dropdown offers, through the authenticated
    // browser session (session cookie auth — same origin fetch).
    const data = await page.evaluate(async (taskId) => {
      const res = await fetch(`/api/tasks/${taskId}/retype`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newType: 'feature' }),
      });
      return { status: res.status, body: await res.json() };
    }, fx.project.id);

    expect(data.status).toBe(200);
    expect(data.body.undoToken).toBeTruthy();
    // Item itself + 2 descendants cascaded ("2 children cascaded" in the toast copy)
    expect(data.body.changes.length).toBe(3);
    const byId = Object.fromEntries(data.body.changes.map(c => [c.id, c]));
    expect(byId[fx.project.id]).toMatchObject({ previousType: 'project', newType: 'feature' });
    expect(byId[fx.feature.id]).toMatchObject({ previousType: 'feature', newType: 'story' });
    expect(byId[fx.story.id]).toMatchObject({ previousType: 'story', newType: 'task' });

    // Server cascaded the whole subtree by the same offset
    await expect.poll(() => dbItemType(fx.project.id)).toBe('feature');
    await expect.poll(() => dbItemType(fx.feature.id)).toBe('story');
    await expect.poll(() => dbItemType(fx.story.id)).toBe('task');
    // The initiative above the retyped item is untouched
    expect(await dbItemType(fx.init.id)).toBe('initiative');

    // A server-held undo token row exists for the cascade
    const { rows: tokens } = await pool.query(
      'SELECT root_item_id, changes, expires_at FROM retype_undo_tokens WHERE id = $1',
      [data.body.undoToken]
    );
    expect(tokens.length).toBe(1);
    expect(tokens[0].root_item_id).toBe(fx.project.id);
    expect(tokens[0].changes.length).toBe(3);
  });

  // ---- Flow 5 -----------------------------------------------------------
  // Same deviation as flow 4: undo driven through the real session against
  // PATCH /api/tasks/retype-undo, asserted server-side.
  test('undo reverts the retype cascade', async ({ page }) => {
    const fx = await seedFullDepth();
    const user = await createTestUser({ role: 'admin' });
    await login(page, user);

    const retype = await page.evaluate(async (taskId) => {
      const res = await fetch(`/api/tasks/${taskId}/retype`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newType: 'feature' }),
      });
      return res.json();
    }, fx.project.id);
    await expect.poll(() => dbItemType(fx.project.id)).toBe('feature');

    const undo = await page.evaluate(async (undoToken) => {
      const res = await fetch('/api/tasks/retype-undo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ undoToken }),
      });
      return { status: res.status, body: await res.json() };
    }, retype.undoToken);

    expect(undo.status).toBe(200);
    expect(undo.body.reverted).toBe(3);

    // Server restores every previous type in the cascade
    await expect.poll(() => dbItemType(fx.project.id)).toBe('project');
    await expect.poll(() => dbItemType(fx.feature.id)).toBe('feature');
    await expect.poll(() => dbItemType(fx.story.id)).toBe('story');
    // Parent links are intact after the round trip
    const { rows } = await pool.query('SELECT parent_id FROM tasks WHERE id = $1', [fx.project.id]);
    expect(rows[0].parent_id).toBe(fx.init.id);

    // Token is single-use: a second undo with the same token is rejected
    const second = await page.evaluate(async (undoToken) => {
      const res = await fetch('/api/tasks/retype-undo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ undoToken }),
      });
      return res.status;
    }, retype.undoToken);
    expect(second).toBe(410);
  });

  // ---- Flow 6 -----------------------------------------------------------
  test('settings: toggling initiative on makes it appear in the tree', async ({ page }) => {
    // 4-level client that already owns an initiative root in the data
    // (the shape migration 075 leaves behind) plus a project beneath it.
    const client = await createTestClient({ name: 'Toggle Co' });
    const init = await createTestInitiative({ title: 'General', client_id: client.id });
    await createTestTask({ title: 'Toggle Project', item_type: 'project', parent_id: init.id, client_id: client.id });

    const user = await createTestUser({ role: 'admin' });
    await login(page, user);

    // Settings → Configuration → Hierarchy Depth
    await page.evaluate(() => switchView('settings'));
    await page.click('[data-action="_actSetSettingsTab"][data-arg0="config"]');
    await page.waitForSelector('#hierarchyClientPicker', { state: 'attached' });
    await page.selectOption('#hierarchyClientPicker', client.id);
    const initToggle = page.locator('#hierarchyToggles input[data-level="initiative"]');
    await expect(initToggle).not.toBeChecked();
    // Task level is locked on
    await expect(page.locator('#hierarchyToggles input[data-level="task"]')).toBeDisabled();

    await initToggle.check();

    // Persisted server-side via PATCH /api/clients/:id
    await expect.poll(async () => {
      const { rows } = await pool.query('SELECT hierarchy_levels FROM clients WHERE id = $1', [client.id]);
      return rows[0].hierarchy_levels;
    }).toEqual(FULL_LEVELS);

    // Initiative now renders in the tree for this client
    await openTasksExpanded(page);
    const initRow = page.locator(`.task-row[data-task-id="${init.id}"]`);
    await expect(initRow).toBeVisible();
    await expect(initRow.locator('.item-type-badge').first()).toHaveText('Initiative');
    await expect(page.locator('.task-client-header__stats')).toContainText('1 initiative');
  });

  // ---- Flow 7 -----------------------------------------------------------
  test('settings: toggling initiative off deactivates the level without deleting items', async ({ page }) => {
    // Full-depth client with an initiative root and a project beneath it
    const client = await createTestClientWithLevels({ name: 'Shrink Co', hierarchy_levels: FULL_LEVELS });
    const init = await createTestInitiative({ title: 'Shrink Initiative', client_id: client.id });
    const project = await createTestTask({ title: 'Shrink Project', item_type: 'project', parent_id: init.id, client_id: client.id });

    const user = await createTestUser({ role: 'admin' });
    await login(page, user);

    await page.evaluate(() => switchView('settings'));
    await page.click('[data-action="_actSetSettingsTab"][data-arg0="config"]');
    await page.waitForSelector('#hierarchyClientPicker', { state: 'attached' });
    await page.selectOption('#hierarchyClientPicker', client.id);
    const initToggle = page.locator('#hierarchyToggles input[data-level="initiative"]');
    await expect(initToggle).toBeChecked();

    await initToggle.uncheck();

    // Persisted: initiative removed from the client's active levels
    await expect.poll(async () => {
      const { rows } = await pool.query('SELECT hierarchy_levels FROM clients WHERE id = $1', [client.id]);
      return rows[0].hierarchy_levels;
    }).toEqual(NBI_DEFAULT_LEVELS);

    // Initiative disappears from every active-level menu for this client:
    // the retype pill dropdown no longer offers it...
    await openDetailFor(page, project.id);
    await page.click(`[data-action="openRetypePicker"][data-arg0="${project.id}"]`);
    await page.waitForSelector('#retypePickerOverlay .retype-option', { state: 'attached' });
    const labels = await page.$$eval(
      '#retypePickerOverlay .retype-option .item-type-badge',
      els => els.map(e => e.textContent.trim())
    );
    expect(labels).toEqual(['Project', 'Feature', 'Story', 'Task']);
    await page.locator('#retypePickerOverlay').click({ position: { x: 5, y: 5 } });

    // ...and the quick-add type menu scoped to this client drops it too
    await page.locator('select[aria-label="Filter by client"]').selectOption('Shrink Co');
    await expect.poll(() => page.$$eval('#quickAddType option', els => els.map(e => e.value)))
      .toEqual(NBI_DEFAULT_LEVELS);

    // The initiative item itself is hidden, not deleted: the row survives in
    // the DB with its type and children intact.
    const { rows } = await pool.query(
      'SELECT item_type, parent_id FROM tasks WHERE id = $1', [init.id]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].item_type).toBe('initiative');
    const { rows: childRows } = await pool.query(
      'SELECT parent_id FROM tasks WHERE id = $1', [project.id]
    );
    expect(childRows[0].parent_id).toBe(init.id);
  });

  // ---- Flow 8 -----------------------------------------------------------
  test('add item menus offer only active types for the selected client', async ({ page }) => {
    await seedFourLevel('Four Level Co');
    await seedFullDepth('FullDepth Co');
    const user = await createTestUser({ role: 'admin' });
    await login(page, user);
    await page.evaluate(() => switchView('tasks'));
    await page.waitForSelector('#quickAddType', { state: 'attached' });

    // Header "New" button opens the dynamically generated add-item menu
    await page.click('.add-item-menu [data-action="addTask"]');
    const menuItems = page.locator('#addItemMenuItems [data-action="addItemFromMenu"]');
    await expect(menuItems.first()).toBeVisible();
    // Every active type across clients is offered (a full-depth client exists,
    // so Initiative through Task must all be present)
    for (const label of ['New Initiative', 'New Project', 'New Feature', 'New Story', 'New Task']) {
      await expect(page.locator('#addItemMenuItems', { hasText: label })).toHaveCount(1);
    }
    // Close the menu — any document click closes it; use a harmless input
    await page.click('#quickAddInput');
    await expect(page.locator('#addItemMenuDropdown')).toBeHidden();

    // Quick-add type menu scoped to the 4-level client: no initiative offered
    await page.locator('select[aria-label="Filter by client"]').selectOption('Four Level Co');
    await expect.poll(() => page.$$eval('#quickAddType option', els => els.map(e => e.value)))
      .toEqual(NBI_DEFAULT_LEVELS);

    // Scoped to the full-depth client: all five types offered
    await page.locator('select[aria-label="Filter by client"]').selectOption('FullDepth Co');
    await expect.poll(() => page.$$eval('#quickAddType option', els => els.map(e => e.value)))
      .toEqual(FULL_LEVELS);
  });
});
