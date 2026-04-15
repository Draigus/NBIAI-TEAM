// dashboard-server/tests/setup/create-test-db.js
//
// Creates the nbi_dashboard_test database if it does not already exist.
// Idempotent — safe to run multiple times. Called automatically by
// vitest globalSetup before any tests run.
//
// Connects to the `postgres` admin database (not nbi_dashboard) so
// that CREATE DATABASE doesn't run inside an existing connection to
// the target.

require('dotenv').config({ path: __dirname + '/../../.env.test' });

const { Client } = require('pg');

const ADMIN_URL = process.env.ADMIN_DATABASE_URL;
const TEST_URL = process.env.DATABASE_URL;

if (!ADMIN_URL || !TEST_URL) {
  throw new Error('create-test-db: ADMIN_DATABASE_URL and DATABASE_URL must be set in .env.test');
}

// Pull the database name out of the test URL
const match = TEST_URL.match(/\/([^/?]+)(?:\?|$)/);
if (!match) throw new Error('create-test-db: could not parse database name from DATABASE_URL');
const dbName = match[1];

if (!dbName.includes('test')) {
  throw new Error(
    `create-test-db: REFUSING to create "${dbName}" — name must include "test" as a safety guard.`
  );
}

async function main() {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  try {
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      // pg does not allow $1 substitution for identifiers; dbName is internal config, not user input
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[create-test-db] Created ${dbName}`);
    } else {
      console.log(`[create-test-db] ${dbName} already exists`);
    }
  } finally {
    await admin.end();
  }
}

main().catch(err => {
  console.error('[create-test-db] FAILED:', err.message);
  process.exit(1);
});
