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
  it('every migration file on disk has exactly one schema_migrations row', async () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => /^\d{3}_.*\.sql$/.test(f));
    const versions = files.map(f => parseInt(f.match(/^(\d{3})/)[1], 10));

    const { rows } = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
    const applied = rows.map(r => r.version);

    for (const v of versions) {
      const count = applied.filter(a => a === v).length;
      expect(count, `migration ${v} should have exactly 1 schema_migrations row`).toBe(1);
    }
  });

  it('running the runner a second time is a no-op', async () => {
    const { rows: before } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
    await runMigrations(pool, noopLog);
    const { rows: after } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
    expect(after[0].n).toBe(before[0].n);
  });

  it('decode_html_entities function exists (proves migration 020 ran)', async () => {
    const { rows } = await pool.query(
      "SELECT 1 FROM pg_proc WHERE proname = 'decode_html_entities'"
    );
    expect(rows.length).toBe(1);
  });
});
