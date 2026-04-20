// dashboard-server/tests/helpers/db.js
//
// Shared Postgres pool for the test suite. All tests should import
// `pool` from here rather than creating their own connection.
//
// Also exposes truncate() which clears the data tables between tests
// while preserving the schema and the system-of-record tables.

require('dotenv').config({ path: __dirname + '/../../.env.test' });

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('helpers/db.js: DATABASE_URL not set — is .env.test present?');
}

if (!process.env.DATABASE_URL.includes('nbi_dashboard_test')) {
  throw new Error(
    `helpers/db.js: REFUSING to connect — DATABASE_URL points to "${process.env.DATABASE_URL}". ` +
    `Tests are only allowed to touch nbi_dashboard_test.`
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Tables that hold test-created data and should be wiped between tests.
// schema_migrations, settings, lead_pipeline_stages, lead_field_options,
// lead_resource_types, expense_categories, and any other system-of-record
// tables are deliberately omitted. CASCADE handles FK chains.
const TRUNCATE_TABLES = [
  'client_activity_log',
  'dashboard_snapshots',
  'bug_report_comments',
  'bug_reports',
  'task_notes',
  'audit_log',
  'notifications',
  'sessions',
  'password_reset_tokens',
  'tasks',
  'lead_resources',
  'lead_activities',
  'leads',
  'expenses',
  'expense_reports',
  'candidates',
  'hiring_positions',
  'team_members',
  'teams',
  'calendar_events',
  'client_notes',
  'client_reports',
  'contacts',
  'clients',
  'users',
];

async function truncate() {
  // CASCADE handles any tables not explicitly listed
  await pool.query(`TRUNCATE ${TRUNCATE_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

// Idempotent — multiple test files share this module-cached pool, and
// each one calls end() in its afterAll. Without the guard, the second
// call throws "Called end on pool more than once" and unrelated tests
// fail with "Cannot use a pool after calling end on the pool".
let _ended = false;
async function end() {
  if (_ended) return;
  _ended = true;
  await pool.end();
}

module.exports = { pool, truncate, end };
