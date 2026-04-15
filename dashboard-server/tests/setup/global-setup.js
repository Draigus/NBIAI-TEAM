// dashboard-server/tests/setup/global-setup.js
//
// Vitest globalSetup hook. Runs once before any test in the suite.
// Delegates the actual DB reset to tests/setup/reset-db.js so the
// same routine is used by Playwright globalSetup.

require('dotenv').config({ path: __dirname + '/../../.env.test' });

const { resetTestDb } = require('./reset-db');

module.exports = async function globalSetup() {
  console.log('[vitest globalSetup] Resetting test DB from baseline...');
  await resetTestDb();
  console.log('[vitest globalSetup] Done.');

  return async () => {
    console.log('[vitest globalTeardown] Closing pools.');
  };
};
