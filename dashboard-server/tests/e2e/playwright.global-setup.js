// dashboard-server/tests/e2e/playwright.global-setup.js
//
// Playwright global setup. Runs once before any test in the E2E
// suite. Resets the test database from the baseline schema using
// the same routine the vitest unit tests use.

require('dotenv').config({ path: __dirname + '/../../.env.test' });

const { resetTestDb } = require('../setup/reset-db');

module.exports = async function playwrightGlobalSetup() {
  console.log('[playwright globalSetup] Resetting test DB from baseline...');
  await resetTestDb();
  console.log('[playwright globalSetup] Done.');
};
