// dashboard-server/tests/helpers/fixtures.js
//
// Factory functions for creating test data. Each factory inserts a
// row into the test DB and returns it. Sane defaults for unspecified
// fields. No shared global state — every test creates its own data.
//
// Add new factories here as feature plans need them. Keep field lists
// in sync with the server-side validation in server.js.

const bcrypt = require('bcrypt');
const { pool } = require('./db');

let _seq = 0;
function uniq(prefix) {
  _seq++;
  return `${prefix}_${Date.now()}_${_seq}`;
}

/**
 * Create a user. Returns { id, username, display_name, email, role, raw_password }.
 * raw_password is included so the test can use it for login flows.
 */
async function createTestUser(opts = {}) {
  const username = opts.username || uniq('testuser');
  const display_name = opts.display_name || `Test User ${_seq}`;
  const email = 'email' in opts ? opts.email : `${username}@example.invalid`;
  const role = opts.role || 'admin';
  const raw_password = opts.password || 'test_password_123';
  const password_hash = await bcrypt.hash(raw_password, 4); // low cost for speed

  const { rows } = await pool.query(
    `INSERT INTO users (username, display_name, email, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, username, display_name, email, role`,
    [username, display_name, email, role, password_hash]
  );
  return { ...rows[0], raw_password };
}

/**
 * Create a client.
 */
async function createTestClient(opts = {}) {
  const name = opts.name || uniq('TestClient');
  const { rows } = await pool.query(
    `INSERT INTO clients (name, description, sector)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, opts.description || '', opts.sector || null]
  );
  return rows[0];
}

/**
 * Create a task. Requires no parent — creates a top-level project by default.
 */
async function createTestTask(opts = {}) {
  const title = opts.title || uniq('TestTask');
  const item_type = opts.item_type || 'project';
  const status = opts.status || 'Not started';
  const due_date = opts.due_date || '';
  const assignees = opts.assignees || [];
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, description, due_date, assignees)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      title,
      opts.parent_id || null,
      opts.client_id || null,
      item_type,
      status,
      opts.priority || '',
      opts.description || '',
      due_date,
      assignees
    ]
  );
  return rows[0];
}

/**
 * Create a bug report. Requires user_id (the reporter).
 */
async function createTestBugReport(opts) {
  if (!opts || !opts.user_id) throw new Error('createTestBugReport: user_id required');
  const title = opts.title || uniq('TestBug');
  const type = opts.type || 'bug';
  const status = opts.status || 'open';
  const { rows } = await pool.query(
    `INSERT INTO bug_reports (user_id, type, title, description, status, priority)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [opts.user_id, type, title, opts.description || '', status, opts.priority || null]
  );
  return rows[0];
}

/**
 * Create a candidate row. Stage defaults to 'sourced' (matches schema default).
 */
async function createTestCandidate(opts = {}) {
  const name = opts.name || uniq('TestCandidate');
  const stage = opts.stage || 'sourced';
  const { rows } = await pool.query(
    `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      opts.client_id || null,
      opts.position_id || null,
      name,
      opts.role || null,
      opts.linkedin_url || null,
      opts.due_date || null,
      stage,
      opts.notes || null,
    ]
  );
  return rows[0];
}

/**
 * Create a lead row. stage_id is required (FK to lead_pipeline_stages.id).
 */
async function createTestLead(opts = {}) {
  if (!opts.stage_id) throw new Error('createTestLead: stage_id required');
  const title = opts.title || uniq('TestLead');
  const { rows } = await pool.query(
    `INSERT INTO leads (client_id, title, work_type, service_line, stage_id, priority, currency, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      opts.client_id || null,
      title,
      opts.work_type || null,
      opts.service_line || null,
      opts.stage_id,
      opts.priority || null,
      opts.currency || 'GBP',
      opts.created_by || 'test',
    ]
  );
  return rows[0];
}

/**
 * Create a lead_pipeline_stages row. Note: lead_pipeline_stages is NOT in
 * the truncate list (system-of-record). Tests that create a stage should
 * delete it themselves at the end of the test (use try/finally).
 */
async function createTestLeadStage(opts = {}) {
  const name = opts.name || uniq('TestStage');
  const sort_order = opts.sort_order || 0;
  const colour = opts.colour || '#666666';
  const { rows } = await pool.query(
    `INSERT INTO lead_pipeline_stages (name, sort_order, colour, is_closed, is_won)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, sort_order, colour, !!opts.is_closed, !!opts.is_won]
  );
  return rows[0];
}

async function createTestTeam(opts = {}) {
  const name = opts.name || uniq('TestTeam');
  const { rows } = await pool.query(
    `INSERT INTO teams (name, description, client_id, colour)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, opts.description || '', opts.client_id || null, opts.colour || '#3b82f6']
  );
  return rows[0];
}

async function createTestTeamMember(opts) {
  const { rows } = await pool.query(
    `INSERT INTO team_members (team_id, user_id, role)
     VALUES ($1, $2, $3) RETURNING *`,
    [opts.team_id, opts.user_id, opts.role || 'member']
  );
  return rows[0];
}

async function createTestAuditEntry(opts) {
  if (opts.created_at) {
    const { rows } = await pool.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        opts.entity_type || 'task',
        opts.entity_id,
        opts.action || 'update',
        opts.changed_by || 'test',
        opts.changes ? JSON.stringify(opts.changes) : null,
        opts.created_at
      ]
    );
    return rows[0];
  }
  const { rows } = await pool.query(
    `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      opts.entity_type || 'task',
      opts.entity_id,
      opts.action || 'update',
      opts.changed_by || 'test',
      opts.changes ? JSON.stringify(opts.changes) : null
    ]
  );
  return rows[0];
}

module.exports = {
  uniq,
  createTestUser,
  createTestClient,
  createTestTask,
  createTestBugReport,
  createTestCandidate,
  createTestLead,
  createTestLeadStage,
  createTestTeam,
  createTestTeamMember,
  createTestAuditEntry,
};
