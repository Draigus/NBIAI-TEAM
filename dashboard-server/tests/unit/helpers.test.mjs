// dashboard-server/tests/unit/helpers.test.mjs
//
// Sanity check that the test helpers themselves work. Catches the
// "fixture factory broken" class of bug before it cascades into
// every other test failing for the wrong reason.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser,
  createTestBugReport,
  createTestCandidate,
  createTestLead,
  createTestLeadStage,
} = require('../helpers/fixtures.js');

beforeEach(async () => { await truncate(); });
// No afterAll(end()) — the pool is shared across test files and is
// cleaned up when the vitest fork process terminates.

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

  it('createTestLeadStage inserts a lead pipeline stage and returns it', async () => {
    const stage = await createTestLeadStage({ name: 'Qualified-' + Date.now() });
    expect(stage.id).toBeTruthy();
    expect(stage.name).toMatch(/^Qualified-/);
    const { rows } = await pool.query('SELECT name FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    expect(rows[0].name).toBe(stage.name);
    // Cleanup so the next test doesn't leak a stage row (lead_pipeline_stages is NOT truncated)
    await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
  });

  it('createTestCandidate inserts a candidate row with sane defaults', async () => {
    const c = await createTestCandidate({ name: 'Alice', stage: 'screening' });
    expect(c.id).toBeTruthy();
    expect(c.name).toBe('Alice');
    expect(c.stage).toBe('screening');
    const { rows } = await pool.query('SELECT name, stage FROM candidates WHERE id = $1', [c.id]);
    expect(rows[0]).toEqual({ name: 'Alice', stage: 'screening' });
  });

  it('createTestLead inserts a lead row, requires a stage_id', async () => {
    const stage = await createTestLeadStage({ name: 'New-' + Date.now() });
    try {
      const lead = await createTestLead({ title: 'Big Deal', stage_id: stage.id });
      expect(lead.id).toBeTruthy();
      expect(lead.title).toBe('Big Deal');
      expect(lead.stage_id).toBe(stage.id);
      const { rows } = await pool.query('SELECT title FROM leads WHERE id = $1', [lead.id]);
      expect(rows[0].title).toBe('Big Deal');
    } finally {
      await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });
});
