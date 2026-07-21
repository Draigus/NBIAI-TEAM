// dashboard-server/tests/unit/migration-084.test.mjs
//
// Asserts the hiring plan schema landed: planning/compensation columns on
// hiring_positions, the hiring_departments / hiring_client_settings /
// hiring_recruiters tables, the append-only hiring_approval_events history,
// and every check constraint that guards the new fields. The global setup
// applies migration 084 before this file runs.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const {
  createTestUser,
  createTestClient,
  createTestHiringPosition,
} = require('../helpers/fixtures.js');

beforeEach(async () => { await truncate(); });

// Await a query and assert Postgres rejected it with the given SQLSTATE.
// 23514 = check_violation, 23505 = unique_violation.
async function expectSqlError(promise, code) {
  let err = null;
  try { await promise; } catch (e) { err = e; }
  expect(err, 'expected the query to be rejected by PostgreSQL').not.toBeNull();
  expect(err.code).toBe(code);
}

function insertPosition(fields) {
  const cols = Object.keys(fields);
  const params = cols.map((_, i) => `$${i + 2}`);
  return pool.query(
    `INSERT INTO hiring_positions (title${cols.length ? ', ' + cols.join(', ') : ''})
     VALUES ($1${params.length ? ', ' + params.join(', ') : ''}) RETURNING *`,
    ['Constraint Probe', ...cols.map(c => fields[c])]
  );
}

describe('migration 084 — hiring plan schema', () => {
  it('is recorded in schema_migrations', async () => {
    const { rows } = await pool.query(
      'SELECT version FROM schema_migrations WHERE version = 84'
    );
    expect(rows.length).toBe(1);
  });

  it('adds the planning columns to hiring_positions with correct types', async () => {
    const { rows } = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default,
              numeric_precision, numeric_scale, character_maximum_length
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'hiring_positions'`
    );
    const byName = Object.fromEntries(rows.map(r => [r.column_name, r]));

    const expectations = [
      ['department_id', 'uuid'],
      ['priority', 'smallint'],
      ['target_start_month', 'date'],
      ['requirement_type', 'text'],
      ['approval_status', 'text'],
      ['approval_submitted_at', 'timestamp with time zone'],
      ['requested_by_user_id', 'uuid'],
      ['hiring_manager_user_id', 'uuid'],
      ['compensation_min', 'numeric'],
      ['compensation_max', 'numeric'],
      ['budgeted_compensation', 'numeric'],
      ['compensation_currency', 'character'],
      ['compensation_basis', 'text'],
      ['expected_workdays_per_month', 'numeric'],
      ['fx_rate_to_gbp', 'numeric'],
      ['fx_rate_effective_date', 'date'],
      ['fx_rate_source_note', 'text'],
      ['on_cost_override_pct', 'numeric'],
      ['recruiting_started_at', 'timestamp with time zone'],
      ['planning_version', 'integer'],
    ];
    for (const [name, type] of expectations) {
      expect(byName[name], `hiring_positions.${name} must exist`).toBeDefined();
      expect(byName[name].data_type, `hiring_positions.${name} type`).toBe(type);
    }

    // Precision on money-like and percentage columns
    for (const col of ['compensation_min', 'compensation_max', 'budgeted_compensation',
                       'expected_workdays_per_month', 'fx_rate_to_gbp']) {
      expect(Number(byName[col].numeric_precision), `${col} precision`).toBe(14);
      expect(Number(byName[col].numeric_scale), `${col} scale`).toBe(4);
    }
    expect(Number(byName.on_cost_override_pct.numeric_precision)).toBe(7);
    expect(Number(byName.on_cost_override_pct.numeric_scale)).toBe(4);
    expect(Number(byName.compensation_currency.character_maximum_length)).toBe(3);

    // approval_status: NOT NULL, defaults to 'pending' for new rows
    expect(byName.approval_status.is_nullable).toBe('NO');
    expect(byName.approval_status.column_default).toMatch(/pending/);

    // planning_version: NOT NULL DEFAULT 1
    expect(byName.planning_version.is_nullable).toBe('NO');
    expect(byName.planning_version.column_default).toMatch(/^1/);
  });

  it('creates the hiring_departments, hiring_client_settings, hiring_recruiters and hiring_approval_events tables', async () => {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('hiring_departments', 'hiring_client_settings',
                            'hiring_recruiters', 'hiring_approval_events')`
    );
    const names = rows.map(r => r.table_name).sort();
    expect(names).toEqual([
      'hiring_approval_events',
      'hiring_client_settings',
      'hiring_departments',
      'hiring_recruiters',
    ]);
  });

  it('creates the expected indexes', async () => {
    const expected = [
      ['hiring_departments', 'hiring_departments_client_name_uq'],
      ['hiring_approval_events', 'hiring_approval_events_position_created_idx'],
      ['hiring_approval_events', 'hiring_approval_events_client_created_idx'],
      ['hiring_approval_events', 'hiring_approval_events_legacy_imported_uq'],
    ];
    for (const [table, idx] of expected) {
      const { rows } = await pool.query(
        `SELECT indexdef FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
        [table, idx]
      );
      expect(rows.length, `${idx} must exist on ${table}`).toBe(1);
    }
    // The legacy_imported guard must be a UNIQUE partial index
    const { rows: [legacy] } = await pool.query(
      `SELECT indexdef FROM pg_indexes
       WHERE indexname = 'hiring_approval_events_legacy_imported_uq'`
    );
    expect(legacy.indexdef).toMatch(/UNIQUE/);
    expect(legacy.indexdef).toMatch(/legacy_imported/);
  });

  describe('check constraints on hiring_positions', () => {
    it('rejects an out-of-range priority and accepts 0-4', async () => {
      await expectSqlError(insertPosition({ priority: 5 }), '23514');
      await expectSqlError(insertPosition({ priority: -1 }), '23514');
      const { rows } = await insertPosition({ priority: 4 });
      expect(rows[0].priority).toBe(4);
    });

    it('rejects a target_start_month that is not the first of the month', async () => {
      await expectSqlError(insertPosition({ target_start_month: '2026-08-15' }), '23514');
      const { rows } = await insertPosition({ target_start_month: '2026-08-01' });
      // pg returns DATE columns as strings in this project's configuration
      const value = rows[0].target_start_month;
      const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
      expect(iso).toBe('2026-08-01');
    });

    it('rejects an invalid requirement_type', async () => {
      await expectSqlError(insertPosition({ requirement_type: 'expansion' }), '23514');
      const { rows } = await insertPosition({ requirement_type: 'backfill' });
      expect(rows[0].requirement_type).toBe('backfill');
    });

    it('rejects an invalid approval state', async () => {
      await expectSqlError(insertPosition({ approval_status: 'maybe' }), '23514');
      const { rows } = await insertPosition({ approval_status: 'denied' });
      expect(rows[0].approval_status).toBe('denied');
    });

    it('rejects an invalid engagement type', async () => {
      await expectSqlError(insertPosition({ employment_type: 'intern' }), '23514');
      const { rows } = await insertPosition({ employment_type: 'psc' });
      expect(rows[0].employment_type).toBe('psc');
    });

    it('rejects an invalid currency', async () => {
      await expectSqlError(insertPosition({ compensation_currency: 'gbp' }), '23514');
      await expectSqlError(insertPosition({ compensation_currency: 'G1P' }), '23514');
      const { rows } = await insertPosition({ compensation_currency: 'EUR' });
      expect(rows[0].compensation_currency).toBe('EUR');
    });

    it('rejects an invalid compensation basis', async () => {
      await expectSqlError(insertPosition({ compensation_basis: 'weekly' }), '23514');
      const { rows } = await insertPosition({ compensation_basis: 'daily' });
      expect(rows[0].compensation_basis).toBe('daily');
    });

    it('rejects compensation_min greater than compensation_max', async () => {
      await expectSqlError(
        insertPosition({ compensation_min: 90000, compensation_max: 50000 }), '23514'
      );
      const { rows } = await insertPosition({ compensation_min: 50000, compensation_max: 90000 });
      expect(Number(rows[0].compensation_min)).toBe(50000);
    });

    it('rejects non-positive budgeted_compensation, workdays and fx rate', async () => {
      await expectSqlError(insertPosition({ budgeted_compensation: 0 }), '23514');
      await expectSqlError(insertPosition({ expected_workdays_per_month: 0 }), '23514');
      await expectSqlError(insertPosition({ fx_rate_to_gbp: 0 }), '23514');
    });

    it('rejects a negative on-cost override', async () => {
      await expectSqlError(insertPosition({ on_cost_override_pct: -1 }), '23514');
      const { rows } = await insertPosition({ on_cost_override_pct: 0 });
      expect(Number(rows[0].on_cost_override_pct)).toBe(0);
    });
  });

  describe('hiring_departments', () => {
    it('enforces case-insensitive unique department names per client', async () => {
      const client = await createTestClient({ name: 'Dept Client' });
      await pool.query(
        'INSERT INTO hiring_departments (client_id, name) VALUES ($1, $2)',
        [client.id, 'Design']
      );
      await expectSqlError(
        pool.query(
          'INSERT INTO hiring_departments (client_id, name) VALUES ($1, $2)',
          [client.id, 'design']
        ),
        '23505'
      );
      // Same name under a different client is fine
      const other = await createTestClient({ name: 'Other Dept Client' });
      const { rows } = await pool.query(
        'INSERT INTO hiring_departments (client_id, name) VALUES ($1, $2) RETURNING *',
        [other.id, 'Design']
      );
      expect(rows[0].is_active).toBe(true);
    });
  });

  describe('hiring_client_settings', () => {
    it('rejects negative on-cost percentages and non-array permitted_currencies', async () => {
      const client = await createTestClient({ name: 'Settings Client' });
      await expectSqlError(
        pool.query(
          'INSERT INTO hiring_client_settings (client_id, fte_on_cost_pct) VALUES ($1, $2)',
          [client.id, -5]
        ),
        '23514'
      );
      await expectSqlError(
        pool.query(
          'INSERT INTO hiring_client_settings (client_id, permitted_currencies) VALUES ($1, $2)',
          [client.id, JSON.stringify('GBP')]
        ),
        '23514'
      );
      const { rows } = await pool.query(
        'INSERT INTO hiring_client_settings (client_id) VALUES ($1) RETURNING *',
        [client.id]
      );
      expect(rows[0].permitted_currencies).toEqual(['GBP']);
      expect(Number(rows[0].fte_on_cost_pct)).toBe(0);
    });
  });

  describe('hiring_recruiters', () => {
    it('enforces one row per (client, user)', async () => {
      const client = await createTestClient({ name: 'Recruiter Client' });
      const user = await createTestUser({ role: 'member' });
      await pool.query(
        'INSERT INTO hiring_recruiters (client_id, user_id) VALUES ($1, $2)',
        [client.id, user.id]
      );
      await expectSqlError(
        pool.query(
          'INSERT INTO hiring_recruiters (client_id, user_id) VALUES ($1, $2)',
          [client.id, user.id]
        ),
        '23505'
      );
    });
  });

  describe('hiring_approval_events', () => {
    it('rejects invalid event types and denial reasons', async () => {
      const client = await createTestClient({ name: 'Events Client' });
      const position = await createTestHiringPosition({ client_id: client.id });
      await expectSqlError(
        pool.query(
          'INSERT INTO hiring_approval_events (position_id, client_id, event_type) VALUES ($1, $2, $3)',
          [position.id, client.id, 'cancelled']
        ),
        '23514'
      );
      await expectSqlError(
        pool.query(
          `INSERT INTO hiring_approval_events (position_id, client_id, event_type, denial_reason)
           VALUES ($1, $2, 'denied', 'because')`,
          [position.id, client.id]
        ),
        '23514'
      );
      const { rows } = await pool.query(
        `INSERT INTO hiring_approval_events
           (position_id, client_id, event_type, from_approval_status, to_approval_status,
            denial_reason, denial_comment)
         VALUES ($1, $2, 'denied', 'pending', 'denied', 'not_current_priority', 'Deferred to Q4')
         RETURNING *`,
        [position.id, client.id]
      );
      expect(rows[0].denial_reason).toBe('not_current_priority');
    });

    it('permits repeated lifecycle events but only one legacy_imported per position', async () => {
      const client = await createTestClient({ name: 'Legacy Events Client' });
      const position = await createTestHiringPosition({ client_id: client.id });
      const insertEvent = (type) => pool.query(
        'INSERT INTO hiring_approval_events (position_id, client_id, event_type) VALUES ($1, $2, $3)',
        [position.id, client.id, type]
      );
      await insertEvent('submitted');
      await insertEvent('submitted'); // history is append-only, duplicates fine
      await insertEvent('legacy_imported');
      await expectSqlError(insertEvent('legacy_imported'), '23505');

      // The migration's own backfill pattern must be a no-op on conflict
      await pool.query(
        `INSERT INTO hiring_approval_events (position_id, client_id, event_type)
         VALUES ($1, $2, 'legacy_imported')
         ON CONFLICT (position_id) WHERE event_type = 'legacy_imported' DO NOTHING`,
        [position.id, client.id]
      );
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM hiring_approval_events
         WHERE position_id = $1 AND event_type = 'legacy_imported'`,
        [position.id]
      );
      expect(rows[0].n).toBe(1);
    });
  });

  describe('approval status semantics', () => {
    it('defaults new positions to pending with planning_version 1', async () => {
      const client = await createTestClient({ name: 'Defaults Client' });
      const position = await createTestHiringPosition({ client_id: client.id, title: 'New Role' });
      expect(position.approval_status).toBe('pending');
      expect(position.planning_version).toBe(1);
    });

    it('permits an approved legacy position without invented cost assumptions', async () => {
      const client = await createTestClient({ name: 'Legacy Client' });
      const position = await createTestHiringPosition({ client_id: client.id, title: 'Legacy Producer' });
      await pool.query("UPDATE hiring_positions SET approval_status = 'approved' WHERE id = $1", [position.id]);
      const { rows: [saved] } = await pool.query(
        'SELECT approval_status, budgeted_compensation FROM hiring_positions WHERE id = $1',
        [position.id]
      );
      expect(saved.approval_status).toBe('approved');
      expect(saved.budgeted_compensation).toBeNull();
    });
  });
});
