/**
 * NBI Dashboard — Automated Database Backup
 *
 * Runs pg_dump against the configured DATABASE_URL and saves a timestamped SQL file
 * to the backups/ directory. Prunes files older than 30 days.
 *
 * Can be run standalone: node backup.js
 * Or scheduled via node-cron from server.js (daily at 2am).
 */

require('dotenv').config();
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, 'backups');
const RETENTION_DAYS = 30;

/**
 * Locate pg_dump. The PM2 service environment does not carry the
 * PostgreSQL bin directory on PATH, so a bare `pg_dump` fails and every
 * nightly backup silently degraded to the 9-table JSON fallback. Try
 * PATH first, then the standard Windows install locations (highest
 * version wins). Returns a quoted invocable command, or null.
 */
let _pgDumpCmd;
function resolvePgDump() {
  if (_pgDumpCmd !== undefined) return _pgDumpCmd;
  const candidates = ['pg_dump'];
  const pgRoot = 'C:\\Program Files\\PostgreSQL';
  try {
    const versions = fs.readdirSync(pgRoot)
      .filter(d => /^\d+$/.test(d))
      .sort((a, b) => Number(b) - Number(a));
    for (const v of versions) candidates.push(path.join(pgRoot, v, 'bin', 'pg_dump.exe'));
  } catch (e) { /* PostgreSQL not installed at the default location */ }
  for (const c of candidates) {
    try {
      execFileSync(c, ['--version'], { stdio: 'pipe' });
      _pgDumpCmd = c;
      return _pgDumpCmd;
    } catch (e) { /* try next */ }
  }
  _pgDumpCmd = null;
  return null;
}

/** Parse a PostgreSQL connection string into components. Uses the WHATWG
 *  URL parser so encoded characters and query parameters are handled;
 *  components are passed to pg_dump as argv entries, never shell text. */
function parseDbUrl(url) {
  let u;
  try { u = new URL(url); } catch (e) { throw new Error('Cannot parse DATABASE_URL'); }
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error('Cannot parse DATABASE_URL');
  const database = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!u.hostname || !database) throw new Error('Cannot parse DATABASE_URL');
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port || '5432',
    database,
  };
}

/** Run a database backup and return the output filename */
function runBackup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('[Backup] DATABASE_URL not set'); return null; }

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const db = parseDbUrl(dbUrl);
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `nbi_dashboard_${stamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  try {
    const pgDump = resolvePgDump();
    if (!pgDump) throw new Error('pg_dump not found on PATH or in C:\\Program Files\\PostgreSQL');
    // Set password via env var so pg_dump doesn't prompt. All other URL
    // components travel as argv entries — no shell interpolation. pg_dump
    // writes the file itself (-f): buffering the dump through Node stdout
    // caps the backup at maxBuffer and silently degrades to the 9-table
    // JSON fallback once the database outgrows it.
    const env = { ...process.env, PGPASSWORD: db.password };
    const args = ['-h', db.host, '-p', String(db.port), '-U', db.user, '-d', db.database, '--no-owner', '--no-acl', '-f', filepath];

    console.log(`[Backup] Starting backup to ${filename}...`);
    execFileSync(pgDump, args, { env, stdio: 'pipe' });
    if (!fs.existsSync(filepath) || fs.statSync(filepath).size === 0) {
      throw new Error('pg_dump completed but produced no output file');
    }

    const sizeMB = (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2);
    console.log(`[Backup] Complete: ${filename} (${sizeMB} MB)`);

    // Prune old backups
    pruneOldBackups();

    return filepath;
  } catch (e) {
    console.error('[Backup] pg_dump failed:', e.message);
    // Clean up the partial .sql file pg_dump may have created mid-write —
    // leaving it looks like a valid backup to anyone browsing the directory.
    try { if (fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch (_) {}
    // Fallback: use Node pg to dump as JSON (works even without pg_dump installed)
    return runJsonBackup(stamp);
  }
}

/** Fallback backup using Node — dumps all tables as JSON */
function runJsonBackup(stamp) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const filename = `nbi_dashboard_${stamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  console.log(`[Backup] pg_dump unavailable, falling back to JSON backup...`);

  return pool.query('SELECT * FROM tasks ORDER BY created_at').then(async (tasks) => {
    const clients = await pool.query('SELECT * FROM clients ORDER BY name');
    const users = await pool.query('SELECT id, username, display_name, email, role, created_at FROM users ORDER BY id');
    const settings = await pool.query('SELECT * FROM settings');
    const leads = await pool.query('SELECT * FROM leads ORDER BY created_at');
    const expenses = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    const auditLog = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10000');

    const documents = await pool.query('SELECT * FROM documents ORDER BY created_at');
    const docAttachments = await pool.query('SELECT * FROM document_attachments ORDER BY created_at');

    const backup = {
      exportedAt: new Date().toISOString(),
      version: 3,
      tables: {
        tasks: tasks.rows,
        clients: clients.rows,
        users: users.rows,
        settings: settings.rows,
        leads: leads.rows,
        expenses: expenses.rows,
        audit_log: auditLog.rows,
        documents: documents.rows,
        document_attachments: docAttachments.rows,
      }
    };

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    const sizeMB = (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2);
    console.log(`[Backup] JSON backup complete: ${filename} (${sizeMB} MB)`);
    pruneOldBackups();
    pool.end();
    return filepath;
  }).catch(e => {
    console.error('[Backup] JSON backup failed:', e.message);
    // Same partial-file rule as the SQL path: never leave a half-written
    // file wearing the normal backup filename.
    try { if (fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch (_) {}
    pool.end();
    return null;
  });
}

/** Delete backup files older than RETENTION_DAYS. Never throws: pruning
 *  runs after a successful backup, and a locked file (OneDrive sync, AV
 *  scan — this directory lives under OneDrive) must not void the backup
 *  that was just written by bubbling into the caller's failure path. */
function pruneOldBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('nbi_dashboard_'));
    let pruned = 0;
    files.forEach(f => {
      try {
        const fp = path.join(BACKUP_DIR, f);
        if (fs.statSync(fp).mtimeMs < cutoff) { fs.unlinkSync(fp); pruned++; }
      } catch (e) { /* locked or already gone — leave for the next pass */ }
    });
    if (pruned > 0) console.log(`[Backup] Pruned ${pruned} old backup(s)`);
  } catch (e) {
    console.error('[Backup] Prune failed (non-fatal):', e.message);
  }
}

// Allow standalone execution
if (require.main === module) {
  runBackup();
}

module.exports = runBackup;
