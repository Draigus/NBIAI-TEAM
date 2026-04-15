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
  const email = opts.email || `${username}@example.invalid`;
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
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      title,
      opts.parent_id || null,
      opts.client_id || null,
      item_type,
      status,
      opts.priority || '',
      opts.description || ''
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

module.exports = {
  uniq,
  createTestUser,
  createTestClient,
  createTestTask,
  createTestBugReport,
};
