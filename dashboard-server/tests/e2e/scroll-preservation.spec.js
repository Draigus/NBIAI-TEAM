// dashboard-server/tests/e2e/scroll-preservation.spec.js
//
// Regression for Glen's 2026-07-30 report: closing (marking Done) a task,
// feature or story on the Projects screen threw the list back to the top.
//
// Root cause: on the Projects view, `.main__content` carries overflow:hidden
// (dashboard.css `:has(> .tasks-view)`) and the REAL scroll container is the
// inner `.tasks-layout__main`. Both scroll-preservation sites (updateTask's
// structural branch and renderContent) saved #mainContent.scrollTop, which is
// permanently 0 on this screen, so the rebuilt inner scroller reset to 0.
// renderContent now preserves known inner scrollers as well.

const { test, expect } = require('@playwright/test');
const {
  createTestUser, createTestClient, createTestTask,
} = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

async function login(page, user) {
  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

test.describe('Projects view scroll preservation', () => {
  let user, client, stories;

  test.beforeAll(async () => {
    await truncate();
    user = await createTestUser({ role: 'admin' });
    client = await createTestClient({ name: 'Scrolltest Co' });
    const project = await createTestTask({ title: 'Scroll Project', item_type: 'project', client_id: client.id });
    const feature = await createTestTask({ title: 'Scroll Feature', item_type: 'feature', parent_id: project.id, client_id: client.id });
    stories = [];
    for (let i = 1; i <= 30; i++) {
      stories.push(await createTestTask({
        title: `Scroll Story ${String(i).padStart(2, '0')}`,
        item_type: 'story', parent_id: feature.id, client_id: client.id,
      }));
    }
  });

  test('marking a story Done keeps the Projects list scroll position', async ({ page }) => {
    await login(page, user);
    await page.evaluate(() => switchView('tasks'));
    await page.waitForTimeout(500);
    await page.evaluate(() => expandToLevel('task'));
    await page.waitForSelector('.task-row', { state: 'attached', timeout: 10000 });

    // The inner element is the real scroller on this view; prove that first,
    // otherwise this test is asserting against the wrong container.
    const scrollState = await page.evaluate(() => {
      const inner = document.querySelector('.tasks-layout__main');
      const outer = document.getElementById('mainContent');
      inner.scrollTop = 10000; // clamps to max
      return {
        innerScrollable: inner.scrollHeight > inner.clientHeight,
        innerTop: inner.scrollTop,
        outerTop: outer.scrollTop,
      };
    });
    expect(scrollState.innerScrollable, 'seeded list must overflow the inner scroller').toBe(true);
    expect(scrollState.innerTop, 'inner scroller must actually scroll').toBeGreaterThan(0);
    expect(scrollState.outerTop, '#mainContent must NOT be the scroller here').toBe(0);

    const savedTop = scrollState.innerTop;

    // Close a story near the bottom through the same function the status
    // select's onchange invokes (views/nbi-detail.js field helper).
    await page.evaluate((id) => updateTask(id, 'status', 'Done'), stories[24].id);

    // renderContent restores in a requestAnimationFrame; give it two frames
    // plus a settle, then read the scroller that now exists in the new DOM.
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const inner = document.querySelector('.tasks-layout__main');
      return inner ? inner.scrollTop : -1;
    });

    // The rebuilt list is one visual state change away (a Done chip), not a
    // relayout, so the position should survive within a small tolerance.
    expect(after, 'scroll position must survive marking an item Done').toBeGreaterThan(0);
    expect(Math.abs(after - savedTop), 'scroll position must be preserved, not merely non-zero').toBeLessThanOrEqual(80);

    // And the change itself must have applied — this is not a no-op render.
    const doneStatus = await page.evaluate((id) => tasks.find(t => t.id === id).status, stories[24].id);
    expect(doneStatus).toBe('Done');
  });
});
