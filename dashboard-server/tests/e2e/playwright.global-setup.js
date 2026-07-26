// dashboard-server/tests/e2e/playwright.global-setup.js
//
// Playwright global setup. Runs once before any test in the E2E
// suite. Ensures the test database schema exists and is current.
//
// Behaviour:
//   1. Ensure the test database exists
//   2. Prove the schema is COMPLETE: every migration file on disk must have
//      a schema_migrations row. Anything missing => full reset from the
//      baseline (which then applies newer migrations). Table-count
//      heuristics are banned here: a half-applied schema has "enough
//      tables" and poisoned an entire e2e run on 2026-07-25.
//   3. Truncate all data tables (each test also truncates at start)
//
// NOTE: a full reset drops the schema, which kills the Postgres
// connections of any ALREADY-RUNNING test server (reuseExistingServer
// leaves one alive between runs). That crash is loud and correct — a
// stale server on an old schema must not serve a new suite. Stop the old
// :8889 server before re-running after migration changes.

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

  // 2. Schema completeness: every migration on disk must be recorded as
  // applied UNDER ITS OWN FILENAME, else full reset from the baseline. The
  // old `tableCount < 5` heuristic accepted an 18-table half-schema as
  // healthy (2026-07-25: a failed migration run built a partial schema, the
  // heuristic saw "enough tables", skipped the baseline, and every fixture
  // then failed on a missing column). Names are checked as well as versions
  // because a version-only check is blind to exactly the class that caused
  // the 072 collision: a renamed file whose number is already in the ledger
  // never runs, and the count still balances (Codex P3, 2026-07-26).
  // The pool is closed exactly once, before any reset drops the schema.
  const problems = [];
  try {
    const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
    const disk = new Map();
    for (const f of fs.readdirSync(MIGRATIONS_DIR).filter(f => /^\d{3}_.*\.sql$/.test(f))) {
      const v = parseInt(f.slice(0, 3), 10);
      if (disk.has(v)) problems.push(`duplicate migration number ${v}: ${disk.get(v)} and ${f}`);
      disk.set(v, f);
    }

    const ledger = new Map();
    const { rows: smExists } = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations'`
    );
    if (smExists.length > 0) {
      const { rows } = await pool.query('SELECT version, name FROM schema_migrations');
      rows.forEach(r => ledger.set(r.version, r.name));
    }
    for (const [v, f] of disk) {
      if (!ledger.has(v)) problems.push(`unapplied: ${f}`);
      else if (ledger.get(v) !== f) problems.push(`version ${v} recorded as "${ledger.get(v)}" but disk has "${f}"`);
    }

    if (problems.length === 0) {
      // 3. Truncate all data tables so tests start clean
      console.log('[playwright globalSetup] Schema ledger complete. Truncating data tables...');
      const { truncate } = require('../helpers/db');
      await truncate();
      console.log('[playwright globalSetup] Done.');
    }
  } finally {
    await pool.end();
  }

  if (problems.length > 0) {
    console.log(`[playwright globalSetup] Schema cannot prove completeness, running full reset:\n  - ${problems.join('\n  - ')}`);
    const { resetTestDb } = require('../setup/reset-db');
    await resetTestDb();
    console.log('[playwright globalSetup] Full reset done.');
  }
};
