// dashboard-server/tests/setup/load-env.js
//
// Vitest setupFiles entrypoint. Runs once per test FILE before any
// imports inside the test file resolve. Loads .env.test so that
// server.js (and any other module that reads DATABASE_URL at import
// time) sees the test database, not the dev database.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.test') });

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('nbi_dashboard_test')) {
  throw new Error(
    'load-env: DATABASE_URL is not pointing at nbi_dashboard_test. ' +
    'Did .env.test fail to load?'
  );
}
