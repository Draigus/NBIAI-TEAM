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
  'retype_undo_tokens',
  'tasks',
  'lead_resources',
  'lead_activities',
  'leads',
  'meeting_items',
  'meeting_metadata',
  'finance_entries',
  'finance_data',
  'expense_receipts',
  'expenses',
  'expense_reports',
  'onboarding_checklist_items',
  'interview_scorecards',
  'interview_rounds',
  'hiring_decisions',
  'interview_decisions',
  'interview_scores',
  'interview_sessions',
  'interview_config_questions',
  'position_question_templates',
  'interview_configs',
  'interview_question_bank',
  'candidate_activity',
  'candidate_comments',
  'candidate_stage_history',
  'candidates',
  'hiring_email_templates',
  'hiring_approval_events',
  'hiring_recruiters',
  'hiring_departments',
  'hiring_client_settings',
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
  // Filter to tables that actually exist — if a migration didn't run (e.g.
  // baseline is stale), truncating a missing table would crash every test.
  if (!truncate._resolved) {
    const { rows } = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );
    const existing = new Set(rows.map(r => r.tablename));
    truncate._tables = TRUNCATE_TABLES.filter(t => existing.has(t));
    truncate._resolved = true;
  }
  if (truncate._tables.length === 0) return;
  const sql = `TRUNCATE ${truncate._tables.join(', ')} RESTART IDENTITY CASCADE`;
  try {
    await pool.query(sql);
  } catch (e) {
    // Retry once — fire-and-forget ops from a prior test may hold locks.
    await new Promise(r => setTimeout(r, 200));
    await pool.query(sql);
  }
}

// POOL LIFECYCLE CONTRACT: this pool is shared by ALL test files in the
// suite. Vitest runs unit files sequentially in a single fork (singleFork:
// true) and this file is CJS, so Node's require cache hands every test file
// the same pool instance. NEVER end the pool from a test file — the first
// file to do so breaks every file that runs after it ("Cannot use a pool
// after calling end on the pool"). The pool is closed implicitly when the
// fork exits at the end of the run. An idempotent end() helper used to live
// here; it was removed because afterAll(end()) in one file (retype.test.mjs)
// silently killed 44 downstream test files.

module.exports = { pool, truncate };
