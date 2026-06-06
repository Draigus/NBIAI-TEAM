// dashboard-server/tests/e2e/playwright.config.js
//
// Playwright config for the dashboard E2E suite.
//
// Boots the Express app via the webServer block (Playwright handles
// startup and waits for the server to respond). Uses a single
// chromium project. Retries are zero — flaky tests are broken tests.
//
// Boots server.js as a child process with PORT=8889 and DATABASE_URL
// pointing at nbi_dashboard_test, so it doesn't conflict with the
// PM2 production server on 8888.

const { defineConfig } = require('@playwright/test');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.test') });

const TEST_PORT = parseInt(process.env.PORT || '8889', 10);
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '**/*.spec.js',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: path.join(__dirname, 'playwright.global-setup.js'),
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 5000,
    navigationTimeout: 10000,
  },
  webServer: {
    command: 'node ' + JSON.stringify(path.join(__dirname, '..', '..', 'server.js')),
    url: BASE_URL + '/api/health',
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: 'test',
    },
    cwd: path.join(__dirname, '..', '..'),
    stdout: 'ignore',
    stderr: 'ignore',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
