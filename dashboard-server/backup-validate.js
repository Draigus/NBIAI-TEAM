/**
 * Backup validation: verify backup integrity and completeness.
 *
 * Supports both backup formats produced by backup.js:
 *   - .sql  — pg_dump plain-format dumps (primary path). Tables and row
 *             counts are read from the COPY ... FROM stdin; blocks.
 *   - .json — the Node fallback dump ({ tables: { name: rows[] } }).
 */
const fs = require('fs');
const path = require('path');

const EXPECTED_TABLES = ['tasks', 'clients', 'users', 'settings', 'leads', 'expenses', 'audit_log', 'documents', 'document_attachments'];

/**
 * Parse a plain-format pg_dump. A COPY block looks like
 * `COPY public."name" (cols) FROM stdin;` followed by one line per row and
 * a terminating `\.` line. Returns { counts, unterminated, complete }:
 *   counts       — { tableName: rowCount }
 *   unterminated — name of a COPY block still open at EOF (truncated dump), or null
 *   complete     — whether pg_dump's closing "database dump complete" marker is present
 * A dump that matches expected row counts but is truncated mid-block is NOT
 * restorable — structural checks must gate before count comparison.
 */
function parseSqlDumpCounts(sql) {
  const counts = {};
  const lines = sql.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    if (current === null) {
      const m = line.match(/^COPY\s+(?:[\w"]+\.)?"?(\w+)"?\s*\([^)]*\)\s+FROM\s+stdin;/i);
      if (m) { current = m[1]; counts[current] = counts[current] || 0; }
    } else if (line === '\\.') {
      current = null;
    } else {
      counts[current]++;
    }
  }
  const complete = /--\s*PostgreSQL database dump complete/i.test(sql);
  return { counts, unterminated: current, complete };
}

/** Compare a { table: backupCount } map against live DB counts. */
async function compareCounts(backupCounts, pool, issues) {
  if (!pool) return;
  for (const table of EXPECTED_TABLES) {
    if (!(table in backupCounts)) continue;
    try {
      const { rows } = await pool.query(`SELECT count(*)::int as cnt FROM ${table}`);
      const dbCount = rows[0].cnt;
      const backupCount = backupCounts[table];
      const diff = Math.abs(dbCount - backupCount);
      if (diff > 5 && diff > dbCount * 0.1) {
        issues.push(`${table}: DB has ${dbCount} rows, backup has ${backupCount} (>10% difference)`);
      }
    } catch (e) {
      // Table might not exist yet
    }
  }
}

async function validateBackup(backupPath, pool, log) {
  const issues = [];

  if (path.extname(backupPath).toLowerCase() === '.sql') {
    let sql;
    try {
      sql = fs.readFileSync(backupPath, 'utf8');
    } catch (e) {
      return { valid: false, issues: ['Backup file unreadable: ' + e.message] };
    }
    const { counts, unterminated, complete } = parseSqlDumpCounts(sql);
    if (Object.keys(counts).length === 0) {
      return { valid: false, issues: ['SQL dump contains no COPY data blocks'] };
    }
    // Structural integrity gates BEFORE count comparison: a dump truncated
    // mid-write can still match live row counts, but it is not restorable.
    if (unterminated) {
      return { valid: false, issues: [`SQL dump is truncated: COPY block for "${unterminated}" never terminates`] };
    }
    if (!complete) {
      return { valid: false, issues: ['SQL dump is missing the "database dump complete" marker (truncated?)'] };
    }
    for (const table of EXPECTED_TABLES) {
      if (!(table in counts)) issues.push(`Missing table: ${table}`);
    }
    await compareCounts(counts, pool, issues);
    return { valid: issues.length === 0, issues };
  }

  // JSON fallback backup
  let backup;
  try {
    const raw = fs.readFileSync(backupPath, 'utf8');
    backup = JSON.parse(raw);
  } catch (e) {
    return { valid: false, issues: ['Backup file is not valid JSON: ' + e.message] };
  }

  if (!backup.tables) {
    return { valid: false, issues: ['Backup missing "tables" key'] };
  }
  for (const table of EXPECTED_TABLES) {
    if (!backup.tables[table]) {
      issues.push(`Missing table: ${table}`);
    }
  }
  const jsonCounts = {};
  for (const table of EXPECTED_TABLES) {
    if (backup.tables[table]) {
      jsonCounts[table] = Array.isArray(backup.tables[table]) ? backup.tables[table].length : 0;
    }
  }
  await compareCounts(jsonCounts, pool, issues);

  return { valid: issues.length === 0, issues };
}

module.exports = { validateBackup, EXPECTED_TABLES, parseSqlDumpCounts };
