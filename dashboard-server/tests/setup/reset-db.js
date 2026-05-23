// dashboard-server/tests/setup/reset-db.js
//
// Shared "wipe and re-seed test DB from baseline" routine. Called by
// both vitest globalSetup and playwright globalSetup so unit tests
// and E2E tests both get a known baseline before they run.
//
// Steps:
//   1. Ensure the test database exists (delegates to create-test-db.js)
//   2. Drop the public schema and recreate it
//   3. Load the baseline schema from tests/fixtures/baseline-schema.sql
//      via psql (the dump file uses backslash commands node-postgres
//      can't parse)
//   4. Run the migration runner — for migrations newer than the
//      baseline, they get applied. For migrations covered by the
//      baseline, the runner is a no-op.

require('dotenv').config({ path: __dirname + '/../../.env.test' });

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE_SCHEMA = path.join(__dirname, '..', 'fixtures', 'baseline-schema.sql');

async function resetTestDb() {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('nbi_dashboard_test')) {
    throw new Error(
      `reset-db: REFUSING to reset — DATABASE_URL is "${process.env.DATABASE_URL}". ` +
      `Tests are only allowed to touch nbi_dashboard_test.`
    );
  }

  // 1. Ensure the database exists
  execSync('node ' + path.join(__dirname, 'create-test-db.js'), { stdio: 'inherit' });

  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();

  try {
    // 2. Kill other connections to avoid deadlocks, then wipe public schema
    //    Single client so pg_backend_pid() is consistent across all queries
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = current_database() AND pid != pg_backend_pid()`
    );
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    client.release();
    await pool.end();
  }

  // 3. Load baseline via psql
  if (!fs.existsSync(BASELINE_SCHEMA)) {
    throw new Error(`Baseline schema not found: ${BASELINE_SCHEMA}`);
  }
  const PSQL = process.env.PSQL_BIN || 'C:/Program Files/PostgreSQL/16/bin/psql.exe';
  if (!fs.existsSync(PSQL)) {
    throw new Error(`psql not found at ${PSQL} — set PSQL_BIN in .env.test`);
  }
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

  // 4. Run any newer migrations (no-op when baseline is current)
  const newPool = new (require('pg').Pool)({ connectionString: process.env.DATABASE_URL });
  try {
    const runMigrations = require('../../migrations/runner');
    const log = (level, prefix, message, data) => {
      if (level === 'error') console.error(`[migrate] ${prefix}: ${message}`, data || '');
    };
    await runMigrations(newPool, log);
  } finally {
    await newPool.end();
  }
}

module.exports = { resetTestDb };
