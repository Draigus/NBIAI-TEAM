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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep connections alive so Windows TCP stack doesn't drop them mid-suite
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Without this handler, a terminated backend connection becomes an unhandled
// 'error' event that poisons the pool — every subsequent query fails.
pool.on('error', (err) => {
  console.error('[test pool] idle client error (will reconnect):', err.message);
});

// Tables that hold test-created data and should be wiped between tests.
// schema_migrations, settings, lead_pipeline_stages, lead_field_options,
// lead_resource_types, expense_categories, and any other system-of-record
// tables are deliberately omitted. CASCADE handles FK chains.
const TRUNCATE_TABLES = [
  'client_activity_log',
  'dashboard_snapshots',
  'cc_snapshots',
  'bug_report_comments',
  'bug_reports',
  'task_notes',
  'task_comments',
  'task_attachments',
  'time_entries',
  'audit_log',
  'notifications',
  'login_attempts',
  'sessions',
  'password_reset_tokens',
  'task_queue',
  'task_templates',
  'milestone_items',
  'milestones',
  'tasks',
  'lead_resources',
  'lead_activities',
  'leads',
  'finance_entries',
  'finance_data',
  'expense_receipts',
  'expenses',
  'expense_reports',
  'onboarding_checklist_items',
  'interview_scorecards',
  'interview_rounds',
  'candidate_activity',
  'candidate_comments',
  'candidate_stage_history',
  'candidates',
  'hiring_email_templates',
  'hiring_positions',
  'sows',
  'team_members',
  'teams',
  'time_off',
  'calendar_events',
  'client_nbi_contacts',
  'client_notes',
  'client_reports',
  'contacts',
  'attachments',
  'clients',
  'document_attachments',
  'documents',
  'users',
];

async function truncate() {
  const sql = `TRUNCATE ${TRUNCATE_TABLES.join(', ')} RESTART IDENTITY CASCADE`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await pool.query('SET lock_timeout = \'3s\'');
      await pool.query(sql);
      await pool.query('SET lock_timeout = 0');
      return;
    } catch (e) {
      await pool.query('SET lock_timeout = 0').catch(() => {});
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      } else {
        console.error('[truncate] failed after 3 attempts:', e.message);
        throw e;
      }
    }
  }
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
