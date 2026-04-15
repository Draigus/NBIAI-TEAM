// dashboard-server/tests/unit/helpers.test.mjs
//
// Sanity check that the test helpers themselves work. Catches the
// "fixture factory broken" class of bug before it cascades into
// every other test failing for the wrong reason.

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate, end } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestBugReport } = require('../helpers/fixtures.js');

beforeEach(async () => { await truncate(); });
afterAll(async () => { await end(); });

describe('helpers', () => {
  it('createTestUser inserts a row and returns it', async () => {
    const user = await createTestUser({ role: 'admin' });
    expect(user.id).toBeTruthy();
    expect(user.role).toBe('admin');
    expect(user.raw_password).toBe('test_password_123');

    const { rows } = await pool.query('SELECT username FROM users WHERE id = $1', [user.id]);
    expect(rows).toHaveLength(1);
  });

  it('mintSession creates a usable session row', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    expect(token).toMatch(/^test_/);

    const { rows } = await pool.query(
      'SELECT user_id, expires_at FROM sessions WHERE user_id = $1',
      [user.id]
    );
    expect(rows).toHaveLength(1);
    expect(new Date(rows[0].expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('createTestBugReport inserts a row tied to a user', async () => {
    const user = await createTestUser();
    const bug = await createTestBugReport({ user_id: user.id, title: 'sample' });
    expect(bug.id).toBeTruthy();
    expect(bug.title).toBe('sample');
    expect(bug.status).toBe('open');
  });

  it('truncate clears tables between tests', async () => {
    // After beforeEach truncate, the users table should be empty
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
    expect(rows[0].n).toBe(0);
  });
});
