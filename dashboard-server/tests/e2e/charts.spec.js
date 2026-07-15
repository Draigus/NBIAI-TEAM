const { test, expect } = require('@playwright/test');
const { createTestUser } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

async function login(page) {
  const user = await createTestUser({ role: 'admin' });
  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
}

test.describe('Chart Library', () => {
  test.beforeEach(async ({ page }) => {
    await truncate();
    await login(page);
  });

  test('renderChart is globally available', async ({ page }) => {
    const exists = await page.evaluate(() => typeof renderChart === 'function');
    expect(exists).toBe(true);
  });

  test('sparkline renders a canvas element', async ({ page }) => {
    const hasCanvas = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:100px;height:30px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      renderChart(div, { type: 'sparkline', data: [1, 3, 2, 5, 4], ariaLabel: 'Test' });
      return div.querySelector('canvas') !== null;
    });
    expect(hasCanvas).toBe(true);
  });

  test('donut renders with accessibility table', async ({ page }) => {
    const result = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:120px;height:120px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      renderChart(div, { type: 'donut', data: [{ label: 'A', value: 30 }, { label: 'B', value: 70 }], ariaLabel: 'Test donut' });
      const canvas = div.querySelector('canvas');
      const table = div.querySelector('table');
      return { hasCanvas: !!canvas, hasTable: !!table, rows: table ? table.querySelectorAll('tbody tr').length : 0 };
    });
    expect(result.hasCanvas).toBe(true);
    expect(result.hasTable).toBe(true);
    expect(result.rows).toBe(2);
  });

  test('line chart renders with proper ARIA', async ({ page }) => {
    const ariaLabel = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:200px;height:100px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      renderChart(div, { type: 'line', data: [{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }], ariaLabel: 'Revenue trend' });
      return div.querySelector('canvas')?.getAttribute('aria-label');
    });
    expect(ariaLabel).toBe('Revenue trend');
  });

  test('bar chart renders all bars', async ({ page }) => {
    const result = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:300px;height:120px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      renderChart(div, { type: 'bar', data: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }, { label: 'C', value: 15 }], ariaLabel: 'Test bars' });
      return { hasCanvas: !!div.querySelector('canvas'), tableRows: div.querySelector('table')?.querySelectorAll('tbody tr').length || 0 };
    });
    expect(result.hasCanvas).toBe(true);
    expect(result.tableRows).toBe(3);
  });

  test('area chart renders canvas', async ({ page }) => {
    const hasCanvas = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:300px;height:150px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      renderChart(div, { type: 'area', data: [{ label: 'W1', value: 42 }, { label: 'W2', value: 38 }, { label: 'W3', value: 28 }], ariaLabel: 'Burndown' });
      return div.querySelector('canvas') !== null;
    });
    expect(hasCanvas).toBe(true);
  });

  test('returns null for invalid config', async ({ page }) => {
    const result = await page.evaluate(() => {
      const r1 = renderChart(null, { type: 'line' });
      const div = document.createElement('div');
      const r2 = renderChart(div, null);
      const r3 = renderChart(div, {});
      return { r1: r1, r2: r2, r3: r3 };
    });
    expect(result.r1).toBeNull();
    expect(result.r2).toBeNull();
    expect(result.r3).toBeNull();
  });

  test('re-rendering cleans up previous chart', async ({ page }) => {
    const canvasCount = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:100px;height:60px;position:fixed;top:0;right:0;z-index:9999';
      document.body.appendChild(div);
      renderChart(div, { type: 'sparkline', data: [1, 2, 3], ariaLabel: 'First' });
      renderChart(div, { type: 'donut', data: [{ label: 'X', value: 50 }], ariaLabel: 'Second' });
      return div.querySelectorAll('canvas').length;
    });
    expect(canvasCount).toBe(1);
  });
});
