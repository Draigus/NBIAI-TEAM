/**
 * Backup validation: verify backup integrity and completeness.
 */
const fs = require('fs');
const path = require('path');

const EXPECTED_TABLES = ['tasks', 'clients', 'users', 'settings', 'leads', 'expenses', 'audit_log'];

async function validateBackup(backupPath, pool, log) {
  const issues = [];

  // 1. File exists and is valid JSON
  let backup;
  try {
    const raw = fs.readFileSync(backupPath, 'utf8');
    backup = JSON.parse(raw);
  } catch (e) {
    return { valid: false, issues: ['Backup file is not valid JSON: ' + e.message] };
  }

  // 2. Check expected table keys
  if (!backup.tables) {
    return { valid: false, issues: ['Backup missing "tables" key'] };
  }
  for (const table of EXPECTED_TABLES) {
    if (!backup.tables[table]) {
      issues.push(`Missing table: ${table}`);
    }
  }

  // 3. Compare row counts against DB
  if (pool) {
    for (const table of EXPECTED_TABLES) {
      if (!backup.tables[table]) continue;
      try {
        const { rows } = await pool.query(`SELECT count(*)::int as cnt FROM ${table}`);
        const dbCount = rows[0].cnt;
        const backupCount = Array.isArray(backup.tables[table]) ? backup.tables[table].length : 0;
        if (Math.abs(dbCount - backupCount) > dbCount * 0.1) {
          issues.push(`${table}: DB has ${dbCount} rows, backup has ${backupCount} (>10% difference)`);
        }
      } catch (e) {
        // Table might not exist yet
      }
    }
  }

  // 4. Check upload manifest
  if (!backup.uploadManifest) {
    issues.push('Missing uploadManifest');
  }

  return { valid: issues.length === 0, issues };
}

module.exports = { validateBackup, EXPECTED_TABLES };
