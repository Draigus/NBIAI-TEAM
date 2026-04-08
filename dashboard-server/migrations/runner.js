/**
 * Migration Runner for NBI Dashboard
 *
 * Scans the migrations/ directory for SQL files matching NNN_*.sql,
 * tracks applied versions in a schema_migrations table, and runs
 * only unapplied migrations in order, each within a transaction.
 *
 * First-run detection: if the database already has a `tasks` table
 * (i.e. this is an existing database created before the migration
 * framework existed), migrations 001-007 are marked as applied
 * without being executed.
 *
 * @module migrations/runner
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {Function} log - Structured logger: log(level, prefix, message, data?)
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = __dirname;
const MIGRATION_PATTERN = /^(\d{3})_.*\.sql$/;
const BOOTSTRAP_VERSIONS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Run all pending migrations against the database.
 *
 * @param {import('pg').Pool} pool
 * @param {Function} log
 */
async function runMigrations(pool, log) {
  // 1. Ensure the schema_migrations table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // 2. Discover migration files on disk
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => MIGRATION_PATTERN.test(f))
    .sort();

  if (files.length === 0) {
    log('info', 'Migration', 'No migration files found');
    return;
  }

  // 3. Determine which versions are already applied
  const { rows: applied } = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  const appliedSet = new Set(applied.map(r => r.version));

  // 4. First-run detection: if `tasks` table already exists, mark 001-007 as applied
  const { rows: tableCheck } = await pool.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks'
  `);
  const isExistingDb = tableCheck.length > 0;

  if (isExistingDb) {
    const toBootstrap = BOOTSTRAP_VERSIONS.filter(v => !appliedSet.has(v));
    if (toBootstrap.length > 0) {
      for (const v of toBootstrap) {
        const matchingFile = files.find(f => {
          const m = f.match(MIGRATION_PATTERN);
          return m && parseInt(m[1], 10) === v;
        });
        const name = matchingFile || `bootstrap_${String(v).padStart(3, '0')}`;
        await pool.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [v, name]
        );
        appliedSet.add(v);
      }
      log('info', 'Migration', `Existing database detected — marked migrations ${toBootstrap.join(', ')} as already applied`);
    }
  }

  // 5. Run unapplied migrations in order
  let applied_count = 0;
  for (const file of files) {
    const match = file.match(MIGRATION_PATTERN);
    if (!match) continue;

    const version = parseInt(match[1], 10);
    if (appliedSet.has(version)) continue;

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        [version, file]
      );
      await client.query('COMMIT');
      applied_count++;
      log('info', 'Migration', `Applied migration ${file}`, { version });
    } catch (err) {
      await client.query('ROLLBACK');
      log('error', 'Migration', `Failed to apply migration ${file}`, {
        version,
        error: err.message,
        detail: err.detail || null
      });
      // Stop processing further migrations on failure
      return;
    } finally {
      client.release();
    }
  }

  if (applied_count === 0) {
    log('info', 'Migration', 'All migrations already applied');
  } else {
    log('info', 'Migration', `Migration run complete`, { applied: applied_count });
  }
}

module.exports = runMigrations;
