// dashboard-server/tests/e2e/foundations.spec.js
//
// E2E coverage for the five foundations (plan Foundations 2-6):
//   - Inline editing engine (nbi-inline.js)
//   - Grouping engine (nbi-group.js)
//   - Keyboard shortcut registry (nbi-keys.js)
//   - Saved views (nbi-views.js + routes/views.js)
//   - Per-user prefs + tour/help mode (routes/users.js /api/me/prefs, nbi-help.js)
//
// Includes two mandatory regression guards for the Enter-bubbling defect
// class found in Task 1 (text editor) and Task 3 (combobox editor) review:
// after Enter commits, the editor input must be REMOVED from the DOM, not
// re-activated by the bubbled keydown reaching the host element.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestTask } = require('../helpers/fixtures');
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
    // Defensive fallback: fixtures set ui_prefs tour_completed/setup_completed
    // so the tour must not auto-start, but if it somehow did, dismiss it so
    // the fixed-position overlay cannot swallow this test's clicks.
    const skip = page.locator('[data-action="_actTourSkip"]');
    if (await skip.isVisible().catch(() => false)) await skip.click();
  });

  test('inline editing: activate, edit, save; input removed after Enter commit', async ({ page }) => {
    const result = await page.evaluate(() => {
      let saved = null;
      const d = document.createElement('div');
      d.id = 'e2eInline';
      d.textContent = 'Before';
      document.body.appendChild(d);
      inlineEdit(d, { field: 'title', type: 'text', value: 'Before', onSave: (f, v) => { saved = { f, v }; } });
      d.dispatchEvent(new Event('dblclick'));
      const input = d.querySelector('input');
      const hadInput = !!input;
      input.value = 'After';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      // Regression guard (Task 1 review, Enter-bubbling defect): the commit
      // must remove the editor input; the bubbled Enter reaching the host
      // element must NOT re-activate the editor.
      return {
        saved,
        hadInput,
        inputGone: d.querySelector('.inline-input') === null,
        text: d.textContent,
      };
    });
    expect(result.hadInput).toBe(true);
    expect(result.saved).toEqual({ f: 'title', v: 'After' });
    expect(result.inputGone).toBe(true);
    expect(result.text).toBe('After');
  });

  test('inline editing: combobox commits on Enter and editor is removed', async ({ page }) => {
    const result = await page.evaluate(() => {
      let saved = null;
      const d = document.createElement('div');
      d.id = 'e2eCombo';
      d.textContent = 'Beta';
      document.body.appendChild(d);
      inlineEdit(d, {
        field: 'assignee', type: 'combobox', value: 'b',
        options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }],
        onSave: (f, v) => { saved = { f, v }; },
      });
      d.dispatchEvent(new Event('dblclick'));
      const input = d.querySelector('input.inline-input');
      const hadWrapper = !!d.querySelector('.inline-combobox');
      input.value = 'Alpha';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      // Regression guard (Task 3 review, same Enter-bubbling defect class):
      // both the .inline-combobox wrapper and the .inline-input must be gone
      // and the host must show the committed label.
      return {
        saved,
        hadWrapper,
        wrapperGone: d.querySelector('.inline-combobox') === null,
        inputGone: d.querySelector('.inline-input') === null,
        text: d.textContent,
      };
    });
    expect(result.hadWrapper).toBe(true);
    expect(result.saved).toEqual({ f: 'assignee', v: 'a' });
    expect(result.wrapperGone).toBe(true);
    expect(result.inputGone).toBe(true);
    expect(result.text).toBe('Alpha');
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
    // The tasks view short-circuits to a "No Tasks Yet" empty state (no
    // filter bar, so no .views-dd) when the tasks array is empty. Create a
    // project server-side, then reload data through the app's own loader.
    await createTestTask({ title: 'E2E Project' });
    await page.evaluate(async () => { await load(); switchView('tasks'); });
    await page.waitForSelector('.views-dd', { timeout: 5000 });
    const created = await page.evaluate(async () => {
      const view = await apiCall('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'tasks', name: 'E2E View', config: { filters: { search: 'zzz' }, sort: 'due-asc' }, is_default: false }),
      });
      await viewsLoad('tasks');
      await _actViewsApply('tasks', view.id);
      return { search: currentFilter.search, sort: currentFilter.sort };
    });
    expect(created.search).toBe('zzz');
    expect(created.sort).toBe('due-asc');
  });

  test('me/prefs: tour completion persists', async ({ page }) => {
    const prefs = await page.evaluate(async () => {
      await apiCall('/api/me/prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tour_completed: true }),
      });
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
