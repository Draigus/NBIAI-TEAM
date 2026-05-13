// dashboard-server/tests/e2e/playwright.global-setup.js
//
// Playwright global setup. Runs once before any test in the E2E
// suite. Ensures the test database schema exists and is current.
//
// IMPORTANT: Unlike vitest (which starts fresh each run), the E2E
// suite reuses a running server. We must NOT drop the schema while
// the server is connected — dropping the schema kills the server's
// Postgres connections and crashes it. Instead, we:
//   1. Ensure the test database exists
//   2. Run migrations to bring the schema up to date
//   3. Truncate all data tables (each test also truncates at start)
//
// If you need a full schema reset (e.g., after migration changes),
// stop the test server first, run `npm test` (vitest resets fully),
// then re-run E2E tests.

require('dotenv').config({ path: __dirname + '/../../.env.test' });

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async function playwrightGlobalSetup() {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('nbi_dashboard_test')) {
    throw new Error(
      `playwright globalSetup: REFUSING — DATABASE_URL is "${process.env.DATABASE_URL}". ` +
      `Tests are only allowed to touch nbi_dashboard_test.`
    );
  }

  // 1. Ensure the test database exists
  console.log('[playwright globalSetup] Ensuring test DB exists...');
  execSync('node ' + path.join(__dirname, '..', 'setup', 'create-test-db.js'), { stdio: 'inherit' });

  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Check if schema has tables (i.e., baseline was loaded at least once)
    const { rows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const tableCount = parseInt(rows[0].cnt, 10);

    if (tableCount < 5) {
      // Schema is empty or incomplete — need full reset via baseline
      console.log('[playwright globalSetup] Schema appears empty, running full reset...');
      await pool.end();
      const { resetTestDb } = require('../setup/reset-db');
      await resetTestDb();
      console.log('[playwright globalSetup] Full reset done.');
      return;
    }

    // 2. Run migrations to bring schema up to date (safe no-op if current)
    console.log('[playwright globalSetup] Running migrations...');
    const runMigrations = require('../../migrations/runner');
    const log = (level, prefix, message) => {
      if (level === 'error') console.error(`[migrate] ${prefix}: ${message}`);
    };
    await runMigrations(pool, log);

    // 3. Truncate all data tables so tests start clean
    console.log('[playwright globalSetup] Truncating data tables...');
    const { truncate } = require('../helpers/db');
    await truncate();

    console.log('[playwright globalSetup] Done.');
  } finally {
    await pool.end();
  }
};
