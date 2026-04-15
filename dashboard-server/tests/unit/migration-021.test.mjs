// dashboard-server/tests/unit/migration-021.test.mjs
//
// Asserts the position column exists on all four kanban tables after
// migration 021 has been applied (which the global setup already ran).
// Also asserts the indexes exist and the column is dense within each
// group for any seed data the test creates.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const {
  createTestUser,
  createTestBugReport,
  createTestTask,
  createTestCandidate,
  createTestLead,
  createTestLeadStage,
} = require('../helpers/fixtures.js');

beforeEach(async () => { await truncate(); });

describe('migration 021 — kanban position column', () => {
  it('adds a NOT NULL position column on tasks, bug_reports, candidates, leads', async () => {
    const tables = ['tasks', 'bug_reports', 'candidates', 'leads'];
    for (const table of tables) {
      const { rows } = await pool.query(
        `SELECT column_name, is_nullable, data_type, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'position'`,
        [table]
      );
      expect(rows.length, `${table}.position must exist`).toBe(1);
      expect(rows[0].data_type).toBe('integer');
      expect(rows[0].is_nullable).toBe('NO');
      expect(rows[0].column_default).toMatch(/^0/);
    }
  });

  it('creates a (group, position) index on each kanban table', async () => {
    const expected = [
      ['tasks', 'idx_tasks_status_position'],
      ['bug_reports', 'idx_bug_reports_status_position'],
      ['candidates', 'idx_candidates_stage_position'],
      ['leads', 'idx_leads_stage_position'],
    ];
    for (const [table, idx] of expected) {
      const { rows } = await pool.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
        [table, idx]
      );
      expect(rows.length, `${idx} must exist on ${table}`).toBe(1);
    }
  });

  it('migration 021 is recorded in schema_migrations', async () => {
    const { rows } = await pool.query(
      `SELECT version FROM schema_migrations WHERE version = 21`
    );
    expect(rows.length).toBe(1);
  });

  it('newly-inserted rows default position to 0', async () => {
    const u = await createTestUser({ role: 'admin' });
    const bug = await createTestBugReport({ user_id: u.id });
    const task = await createTestTask();
    const cand = await createTestCandidate();
    expect(bug.position).toBe(0);
    expect(task.position).toBe(0);
    expect(cand.position).toBe(0);

    const stage = await createTestLeadStage();
    try {
      const lead = await createTestLead({ stage_id: stage.id });
      expect(lead.position).toBe(0);
      await pool.query('DELETE FROM leads WHERE stage_id = $1', [stage.id]);
    } finally {
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });

  it('backfill assigns dense positions newest-first within a group', async () => {
    const u = await createTestUser({ role: 'admin' });
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, created_at, position)
       VALUES ($1, 'bug', 'oldest', '', 'open', NOW() - INTERVAL '3 days', 99),
              ($1, 'bug', 'middle', '', 'open', NOW() - INTERVAL '2 days', 99),
              ($1, 'bug', 'newest', '', 'open', NOW() - INTERVAL '1 day',  99)`,
      [u.id]
    );

    await pool.query(`
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) - 1 AS new_pos
        FROM bug_reports
      )
      UPDATE bug_reports SET position = numbered.new_pos
      FROM numbered WHERE bug_reports.id = numbered.id;
    `);

    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(rows).toEqual([
      { title: 'newest', position: 0 },
      { title: 'middle', position: 1 },
      { title: 'oldest', position: 2 },
    ]);
  });
});
