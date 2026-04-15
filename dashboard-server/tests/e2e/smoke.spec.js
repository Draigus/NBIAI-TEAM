// dashboard-server/tests/e2e/smoke.spec.js
//
// Proves Playwright + chromium + the test server boot work end-to-end.
// If this passes, the harness is ready for real E2E tests.

const { test, expect } = require('@playwright/test');

test('GET /api/health returns 200 ok', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});

test('app HTML loads', async ({ page }) => {
  await page.goto('/nbi_project_dashboard.html');
  // Just check the page returned some HTML — title is set in the document
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});
