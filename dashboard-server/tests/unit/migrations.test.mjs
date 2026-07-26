// dashboard-server/tests/unit/migrations.test.mjs
//
// Retroactive test of the migration runner. Asserts:
//   1. Every migration file on disk has exactly one row in
//      schema_migrations after globalSetup ran.
//   2. Running the runner a second time is a no-op.
//   3. The decode_html_entities function from migration 020 exists.
//
// If this test fails, the runner is double-applying migrations or
// silently skipping them — both are data integrity risks.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

const { pool } = require('../helpers/db.js');
const runMigrations = require('../../migrations/runner.js');

const noopLog = () => {};

describe('migration runner', () => {
  it('every migration file on disk has exactly one schema_migrations row UNDER ITS OWN NAME', async () => {
    // Version-only checking is blind to the exact class that hid the 072
    // collision: a renamed file whose number is already in the ledger never
    // runs, and the count still balances. 089 repaired the two historical
    // name drifts (v27 suffix, v72 rename), so names must match from now on.
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => /^\d{3}_.*\.sql$/.test(f));

    const { rows } = await pool.query('SELECT version, name FROM schema_migrations ORDER BY version');
    const byVersion = new Map(rows.map(r => [r.version, r.name]));

    for (const f of files) {
      const v = parseInt(f.match(/^(\d{3})/)[1], 10);
      const count = rows.filter(r => r.version === v).length;
      expect(count, `migration ${v} should have exactly 1 schema_migrations row`).toBe(1);
      expect(byVersion.get(v), `version ${v} must be recorded under its on-disk filename`).toBe(f);
    }
  });

  it('running the runner a second time is a no-op', async () => {
    const { rows: before } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
    await runMigrations(pool, noopLog);
    const { rows: after } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
    expect(after[0].n).toBe(before[0].n);
  });

  it('a failing migration makes the runner THROW — never a silent partial schema', async () => {
    // Regression for the 2026-07-25 defect: a failed migration was caught,
    // logged, and returned as success. server.js then booted against 18 of
    // 75 tables. The runner must throw so every caller refuses to proceed.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-broken-'));
    fs.writeFileSync(
      path.join(tmp, '999_broken_on_purpose.sql'),
      'SELECT * FROM table_that_does_not_exist_999;\n'
    );
    try {
      await expect(runMigrations(pool, noopLog, { dir: tmp }))
        .rejects.toThrow(/999_broken_on_purpose/);
      // The failed migration was rolled back, not recorded as applied.
      const { rows } = await pool.query('SELECT 1 FROM schema_migrations WHERE version = 999');
      expect(rows.length).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('decode_html_entities function exists (proves migration 020 ran)', async () => {
    const { rows } = await pool.query(
      "SELECT 1 FROM pg_proc WHERE proname = 'decode_html_entities'"
    );
    expect(rows.length).toBe(1);
  });
});
