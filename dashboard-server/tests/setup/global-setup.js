// dashboard-server/tests/setup/global-setup.js
//
// Vitest globalSetup hook. Runs once before any test in the suite.
//
// Responsibilities:
//   1. Ensure the test database exists (delegates to create-test-db.js)
//   2. Drop and re-load the schema from tests/fixtures/baseline-schema.sql
//      to guarantee a known starting state regardless of what previous
//      test runs left behind. The baseline is a pg_dump of the live dev
//      DB schema + the schema_migrations data, so the runner sees all
//      committed migrations as already applied.
//   3. Run the migration runner — for migrations that are newer than
//      the baseline (added since the dump), they get applied. For
//      migrations covered by the baseline, the runner is a no-op.
//
// Returns a teardown function that vitest will call after all tests.

require('dotenv').config({ path: __dirname + '/../../.env.test' });

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE_SCHEMA = path.join(__dirname, '..', 'fixtures', 'baseline-schema.sql');

module.exports = async function globalSetup() {
  console.log('[vitest globalSetup] Bootstrapping test DB...');

  // 1. Ensure the database exists
  execSync('node ' + path.join(__dirname, 'create-test-db.js'), { stdio: 'inherit' });

  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 2. Wipe the public schema and reload from baseline.
    //    The dump file contains psql backslash commands (\connect,
    //    \restrict, etc.) that node-postgres can't parse, so we shell
    //    out to psql to load it. Tests run from a Windows shell — the
    //    PG_BIN / PGPASSWORD env vars cover both bash and cmd.
    console.log('[vitest globalSetup] Resetting schema from baseline...');
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.end(); // close before psql touches the DB

    if (!fs.existsSync(BASELINE_SCHEMA)) {
      throw new Error(`Baseline schema not found: ${BASELINE_SCHEMA}`);
    }

    const PSQL = process.env.PSQL_BIN || 'C:/Program Files/PostgreSQL/16/bin/psql.exe';
    if (!fs.existsSync(PSQL)) {
      throw new Error(`psql not found at ${PSQL} — set PSQL_BIN in .env.test`);
    }

    // Parse DATABASE_URL into psql args. We need user, host, port, dbname.
    const m = process.env.DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!m) throw new Error('Cannot parse DATABASE_URL for psql');
    const [, user, password, host, port, dbName] = m;

    execSync(
      `"${PSQL}" -h ${host} -p ${port} -U ${user} -d ${dbName} -v ON_ERROR_STOP=1 -q -f "${BASELINE_SCHEMA}"`,
      {
        stdio: ['ignore', 'pipe', 'inherit'],
        env: { ...process.env, PGPASSWORD: password },
      }
    );

    // 3. Reopen pool and run any newer migrations (no-op if baseline is current).
    const newPool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const runMigrations = require('../../migrations/runner');
      const log = (level, prefix, message, data) => {
        if (level === 'error') console.error(`[migrate] ${prefix}: ${message}`, data || '');
      };
      await runMigrations(newPool, log);
    } finally {
      await newPool.end();
    }
  } catch (err) {
    // Make sure the original pool is closed if we threw before reaching await pool.end()
    try { await pool.end(); } catch (e) { /* ignore */ }
    throw err;
  }

  console.log('[vitest globalSetup] Done.');

  return async () => {
    console.log('[vitest globalTeardown] Closing pools.');
  };
};
