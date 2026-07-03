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
// Flows 4 and 5 drive the REAL click path: pill click → option click →
// executeRetype (delegated data-action dispatch) → session-cookie authFetch
// → undo toast. The picker overlay now closes only on clicks that land on
// the overlay itself, so option clicks bubble to the document-level
// dispatcher. Flow 5 additionally asserts the server-held undo token is
// single-use (replay returns 410) via an in-page fetch on the same session.

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
  test('retype via the pill dropdown cascades children and shows the undo toast', async ({ page }) => {
    const fx = await seedFullDepth();
    const user = await createTestUser({ role: 'admin' });
    await login(page, user);

    // Open the pill dropdown and click the Feature option — the real click path
    await openDetailFor(page, fx.project.id);
    await page.click(`[data-action="openRetypePicker"][data-arg0="${fx.project.id}"]`);
    await page.waitForSelector('#retypePickerOverlay .retype-option', { state: 'attached' });
    await page.click('#retypePickerOverlay [data-action="executeRetype"][data-arg1="feature"]');

    // Picker closes and the undo toast reports the cascade
    await expect(page.locator('#retypePickerOverlay')).toHaveCount(0);
    const undoToast = page.locator('#undoToast');
    await expect(undoToast).toBeVisible();
    await expect(undoToast).toContainText('Changed to Feature. 2 children cascaded.');

    // Server cascaded the whole subtree by the same offset
    await expect.poll(() => dbItemType(fx.project.id)).toBe('feature');
    await expect.poll(() => dbItemType(fx.feature.id)).toBe('story');
    await expect.poll(() => dbItemType(fx.story.id)).toBe('task');
    // The initiative above the retyped item is untouched
    expect(await dbItemType(fx.init.id)).toBe('initiative');

    // A server-held undo token row exists for the cascade
    const { rows: tokens } = await pool.query(
      'SELECT root_item_id, changes, expires_at FROM retype_undo_tokens WHERE root_item_id = $1',
      [fx.project.id]
    );
    expect(tokens.length).toBe(1);
    expect(tokens[0].changes.length).toBe(3);

    // The reopened detail panel shows the new type on the pill
    await expect(
      page.locator(`[data-action="openRetypePicker"][data-arg0="${fx.project.id}"]`)
    ).toHaveText('Feature');
  });

  // ---- Flow 5 -----------------------------------------------------------
  test('undo from the toast reverts the retype cascade', async ({ page }) => {
    const fx = await seedFullDepth();
    const user = await createTestUser({ role: 'admin' });
    await login(page, user);

    // Retype project → feature through the pill dropdown
    await openDetailFor(page, fx.project.id);
    await page.click(`[data-action="openRetypePicker"][data-arg0="${fx.project.id}"]`);
    await page.waitForSelector('#retypePickerOverlay .retype-option', { state: 'attached' });
    await page.click('#retypePickerOverlay [data-action="executeRetype"][data-arg1="feature"]');
    await expect(page.locator('#undoToast')).toBeVisible();
    await expect.poll(() => dbItemType(fx.project.id)).toBe('feature');

    // Capture the server-held token before the toast consumes it
    const { rows: [tokenRow] } = await pool.query(
      'SELECT id FROM retype_undo_tokens WHERE root_item_id = $1', [fx.project.id]
    );
    expect(tokenRow).toBeTruthy();

    // Click Undo in the toast
    await page.click('#undoToast button');
    await expect(page.locator('#undoToast')).toHaveCount(0);

    // Server restores every previous type in the cascade
    await expect.poll(() => dbItemType(fx.project.id)).toBe('project');
    await expect.poll(() => dbItemType(fx.feature.id)).toBe('feature');
    await expect.poll(() => dbItemType(fx.story.id)).toBe('story');
    // Parent links are intact after the round trip
    const { rows } = await pool.query('SELECT parent_id FROM tasks WHERE id = $1', [fx.project.id]);
    expect(rows[0].parent_id).toBe(fx.init.id);

    // Token is single-use: replaying it through the same session is rejected
    const second = await page.evaluate(async (undoToken) => {
      const res = await fetch('/api/tasks/retype-undo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ undoToken }),
      });
      return res.status;
    }, tokenRow.id);
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

    // Header New menu scopes to the active client filter too: 4 types, no Initiative
    await page.click('.add-item-menu [data-action="addTask"]');
    await expect(menuItems).toHaveCount(4);
    await expect(page.locator('#addItemMenuItems', { hasText: 'New Initiative' })).toHaveCount(0);
    await page.click('#quickAddInput');
    await expect(page.locator('#addItemMenuDropdown')).toBeHidden();

    // Scoped to the full-depth client: all five types offered
    await page.locator('select[aria-label="Filter by client"]').selectOption('FullDepth Co');
    await expect.poll(() => page.$$eval('#quickAddType option', els => els.map(e => e.value)))
      .toEqual(FULL_LEVELS);

    // Header New menu offers all five for the full-depth client
    await page.click('.add-item-menu [data-action="addTask"]');
    await expect(menuItems).toHaveCount(5);
    await expect(page.locator('#addItemMenuItems', { hasText: 'New Initiative' })).toHaveCount(1);
  });
});
