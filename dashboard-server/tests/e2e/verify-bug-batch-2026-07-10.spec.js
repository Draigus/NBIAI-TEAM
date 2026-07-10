// Verification tests for the 2026-07-10 bug batch:
//   f7b8220b — duplicate Due Date field in the detail panel
//   f8eb57f6 — Reporting page colour legend
//   f3cc10bb — ticket multi-select (checkboxes, bulk status/assign/move/delete)
//   fcad389c — practice (organisation) inherited on creation

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestTask, createTestClient } = require('../helpers/fixtures');
const { pool, truncate } = require('../helpers/db');

test.setTimeout(90000);

async function login(page, user) {
  await page.goto('/nbi_project_dashboard.html#tasks');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

async function expandTasks(page) {
  await page.evaluate(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        if (typeof expandToLevel === 'function') expandToLevel('task');
        setTimeout(resolve, 800);
      }, 800);
    });
  });
}

test('f7b8220b: detail panel shows exactly one Due Date field for parents and leaves', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const client = await createTestClient({ name: 'DupDateClient' });
  const project = await createTestTask({ title: 'DupDateProject', item_type: 'project', client_id: client.id });
  const feature = await createTestTask({ title: 'DupDateFeature', item_type: 'feature', client_id: client.id, parent_id: project.id });
  await createTestTask({ title: 'DupDateStory', item_type: 'story', client_id: client.id, parent_id: feature.id, due_date: '2026-08-15' });
  const leaf = await createTestTask({ title: 'DupDateLeaf', item_type: 'task', client_id: client.id, parent_id: feature.id, due_date: '2026-08-20' });

  await login(page, user);

  // Parent (feature with children): dates are auto-calculated — one locked Due Date, no editable one.
  const readDateFields = () => {
    const panel = document.getElementById('detailPanel');
    if (!panel) return null;
    const fields = [...panel.querySelectorAll('.detail-field')].map(f => {
      const label = f.querySelector('label');
      const input = f.querySelector('input[type="date"]');
      return label && input ? { label: label.textContent.trim(), disabled: input.disabled } : null;
    }).filter(Boolean);
    return {
      dueFields: fields.filter(f => f.label === 'Due Date'),
      startFields: fields.filter(f => f.label === 'Start Date'),
      endFields: fields.filter(f => f.label === 'End Date'),
    };
  };

  await page.evaluate((fid) => { if (typeof openDetailOverlay === 'function') openDetailOverlay(fid); }, feature.id);
  await page.waitForTimeout(800);
  const parentPanel = await page.evaluate(readDateFields);
  expect(parentPanel).not.toBeNull();
  expect(parentPanel.dueFields.length).toBe(1);        // was 2 before the fix
  expect(parentPanel.dueFields[0].disabled).toBe(true); // the locked auto-calculated one
  expect(parentPanel.startFields.length).toBe(1);
  expect(parentPanel.endFields.length).toBe(1);
  await page.screenshot({ path: 'test-results/f7b8220b-parent-single-due-date.png' });

  // Leaf: one editable Due Date, nothing locked.
  await page.evaluate((tid) => { if (typeof openDetailOverlay === 'function') openDetailOverlay(tid); }, leaf.id);
  await page.waitForTimeout(800);
  const leafPanel = await page.evaluate(readDateFields);
  expect(leafPanel).not.toBeNull();
  expect(leafPanel.dueFields.length).toBe(1);
  expect(leafPanel.dueFields[0].disabled).toBe(false);
  expect(leafPanel.startFields.length).toBe(1);
  expect(leafPanel.endFields.length).toBe(1);
  await page.screenshot({ path: 'test-results/f7b8220b-leaf-single-due-date.png' });
});

test('f8eb57f6: reporting page renders the colour legend between header and roadmap', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const client = await createTestClient({ name: 'LegendClient' });
  const project = await createTestTask({ title: 'LegendProject', item_type: 'project', client_id: client.id });
  await pool.query(
    `INSERT INTO tasks (title, parent_id, client_id, item_type, status, start_date, end_date)
     VALUES ('LegendFeature', $1, $2, 'feature', 'In progress', '2026-07-01', '2026-09-30')`,
    [project.id, client.id]
  );

  await login(page, user);
  await page.evaluate(() => { if (typeof switchView === 'function') switchView('reporting'); });
  await page.waitForSelector('.report-legend', { state: 'visible', timeout: 10000 });

  const legend = await page.evaluate(() => {
    const el = document.querySelector('.report-legend');
    const roadmap = document.querySelector('.reporting__roadmap');
    return {
      text: el ? el.textContent : '',
      dotCount: el ? el.querySelectorAll('.report-legend__dot').length : 0,
      beforeRoadmap: !!(el && roadmap && (el.compareDocumentPosition(roadmap) & Node.DOCUMENT_POSITION_FOLLOWING)),
    };
  });
  expect(legend.text).toContain('Done');
  expect(legend.text).toContain('In progress');
  expect(legend.text).toContain('At risk');
  expect(legend.text).toContain('Blocked');
  expect(legend.text).toContain('Today');
  expect(legend.text).toContain('Milestone');
  expect(legend.dotCount).toBe(8);
  expect(legend.beforeRoadmap).toBe(true);
  await page.screenshot({ path: 'test-results/f8eb57f6-reporting-legend.png', fullPage: true });
});

test('f3cc10bb: multi-select drives bulk status, move, and cascading delete', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const client = await createTestClient({ name: 'MultiClient' });
  const p1 = await createTestTask({ title: 'MultiProjectOne', item_type: 'project', client_id: client.id });
  const p2 = await createTestTask({ title: 'MultiProjectTwo', item_type: 'project', client_id: client.id });
  const fA = await createTestTask({ title: 'MultiFeatureA', item_type: 'feature', client_id: client.id, parent_id: p1.id });
  const fB = await createTestTask({ title: 'MultiFeatureB', item_type: 'feature', client_id: client.id, parent_id: p1.id });
  const childStory = await createTestTask({ title: 'MultiChildStory', item_type: 'story', client_id: client.id, parent_id: fA.id });

  await login(page, user);
  await page.evaluate(() => { if (typeof switchView === 'function') switchView('tasks'); });
  await expandTasks(page);

  // Selecting two rows lights up the batch toolbar with the full action set.
  await page.locator(`[data-task-id="${fA.id}"] .task-row__checkbox`).first().click();
  await page.locator(`[data-task-id="${fB.id}"] .task-row__checkbox`).first().click();
  await expect(page.locator('.batch-actions')).toContainText('2 selected');
  await expect(page.locator('.batch-actions button', { hasText: 'Move...' })).toBeVisible();
  await expect(page.locator('.batch-actions select')).toHaveCount(4); // status, priority, health, assign
  await page.screenshot({ path: 'test-results/f3cc10bb-selection-toolbar.png' });

  // Bulk status through the themed confirm.
  await page.locator('.batch-actions select').first().selectOption('In progress');
  await page.waitForSelector('#confirmModal.open', { timeout: 5000 });
  await page.locator('#confirmOkBtn').click();
  await page.waitForTimeout(600);
  const statuses = await page.evaluate(([a, b]) => {
    return [tasks.find(t => t.id === a).status, tasks.find(t => t.id === b).status];
  }, [fA.id, fB.id]);
  expect(statuses).toEqual(['In progress', 'In progress']);

  // Bulk move: re-select both features, move them under MultiProjectTwo.
  await expandTasks(page);
  await page.locator(`[data-task-id="${fA.id}"] .task-row__checkbox`).first().click();
  await page.locator(`[data-task-id="${fB.id}"] .task-row__checkbox`).first().click();
  await page.locator('.batch-actions button', { hasText: 'Move...' }).click();
  await page.waitForSelector('#bulkMoveModal', { timeout: 5000 });
  await page.locator('#bulkMoveModal .picker-row', { hasText: 'MultiProjectTwo' }).click();
  await page.waitForTimeout(600);
  const parents = await page.evaluate(([a, b]) => {
    return [tasks.find(t => t.id === a).parentId, tasks.find(t => t.id === b).parentId];
  }, [fA.id, fB.id]);
  expect(parents).toEqual([p2.id, p2.id]);
  await page.screenshot({ path: 'test-results/f3cc10bb-after-move.png' });

  // Bulk delete cascades to children (MultiFeatureA still owns MultiChildStory).
  await expandTasks(page);
  await page.locator(`[data-task-id="${fA.id}"] .task-row__checkbox`).first().click();
  await page.locator('.batch-actions button', { hasText: 'Delete' }).click();
  await page.waitForSelector('#confirmModal.open', { timeout: 5000 });
  const confirmMsg = await page.locator('#confirmMessage').textContent();
  expect(confirmMsg).toContain('child item');
  await page.locator('#confirmOkBtn').click();
  await page.waitForTimeout(600);
  const survivors = await page.evaluate(([a, s]) => {
    return { feature: !!tasks.find(t => t.id === a), story: !!tasks.find(t => t.id === s) };
  }, [fA.id, childStory.id]);
  expect(survivors.feature).toBe(false);
  expect(survivors.story).toBe(false);
});

test('fcad389c: new child items persist the parent practice on creation', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const client = await createTestClient({ name: 'PracticeClient' });
  const project = await createTestTask({ title: 'PracticeProject', item_type: 'project', client_id: client.id });
  await pool.query(`UPDATE tasks SET practice_area = 'gaming' WHERE id = $1`, [project.id]);
  const feature = await createTestTask({ title: 'PracticeFeature', item_type: 'feature', client_id: client.id, parent_id: project.id });

  await login(page, user);
  await page.evaluate(() => { if (typeof switchView === 'function') switchView('tasks'); });
  await page.waitForTimeout(800);

  // addItem walks the ancestor chain: feature has no practice of its own, the
  // project above it carries 'gaming' — the new story must be created with it.
  const created = await page.evaluate(async (fid) => {
    await addItem('story', fid);
    const t = tasks.find(x => x.parentId === fid && x.title === 'New Story');
    return t ? { practiceArea: t.practiceArea || null } : null;
  }, feature.id);
  expect(created).not.toBeNull();
  expect(created.practiceArea).toBe('gaming');
});
