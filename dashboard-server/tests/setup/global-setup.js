// dashboard-server/tests/setup/global-setup.js
//
// Vitest globalSetup hook. Runs once before any test in the suite.
//
// Responsibilities:
//   1. Ensure the test database exists (delegates to create-test-db.js)
//   2. Run all migrations against the test database to bring the schema
//      to head, using the existing dashboard-server/migrations/runner.js
//
// Returns a teardown function that vitest will call after all tests.

require('dotenv').config({ path: __dirname + '/../../.env.test' });

const { execSync } = require('child_process');
const path = require('path');

module.exports = async function globalSetup() {
  console.log('[vitest globalSetup] Bootstrapping test DB...');

  // 1. Ensure the database exists
  execSync('node ' + path.join(__dirname, 'create-test-db.js'), { stdio: 'inherit' });

  // 2. Run migrations against the test DB
  const { Pool } = require('pg');
  const runMigrations = require('../../migrations/runner');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Migration runner expects a (level, prefix, message, data?) logger
  const log = (level, prefix, message, data) => {
    if (level === 'error') console.error(`[migrate] ${prefix}: ${message}`, data || '');
  };
  await runMigrations(pool, log);
  await pool.end();

  console.log('[vitest globalSetup] Done.');

  // Vitest accepts a teardown returned from globalSetup
  return async () => {
    console.log('[vitest globalTeardown] Closing pools.');
  };
};
