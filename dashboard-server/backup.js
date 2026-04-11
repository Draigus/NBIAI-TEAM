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
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, 'backups');
const RETENTION_DAYS = 30;

/** Parse a PostgreSQL connection string into components */
function parseDbUrl(url) {
  const m = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!m) throw new Error('Cannot parse DATABASE_URL');
  return { user: m[1], password: m[2], host: m[3], port: m[4], database: m[5] };
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
    // Set password via env var so pg_dump doesn't prompt
    const env = { ...process.env, PGPASSWORD: db.password };
    const cmd = `pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} --no-owner --no-acl`;

    console.log(`[Backup] Starting backup to ${filename}...`);
    const output = execSync(cmd, { env, maxBuffer: 100 * 1024 * 1024 }); // 100MB buffer
    fs.writeFileSync(filepath, output);

    const sizeMB = (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2);
    console.log(`[Backup] Complete: ${filename} (${sizeMB} MB)`);

    // Prune old backups
    pruneOldBackups();

    return filepath;
  } catch (e) {
    console.error('[Backup] pg_dump failed:', e.message);
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

    const backup = {
      exportedAt: new Date().toISOString(),
      version: 2,
      tables: {
        tasks: tasks.rows,
        clients: clients.rows,
        users: users.rows,
        settings: settings.rows,
        leads: leads.rows,
        expenses: expenses.rows,
        audit_log: auditLog.rows,
      }
    };

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    const sizeMB = (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2);
    console.log(`[Backup] JSON backup complete: ${filename} (${sizeMB} MB)`);
    pool.end();
    return filepath;
  }).catch(e => {
    console.error('[Backup] JSON backup failed:', e.message);
    pool.end();
    return null;
  });
}

/** Delete backup files older than RETENTION_DAYS */
function pruneOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('nbi_dashboard_'));
  let pruned = 0;
  files.forEach(f => {
    const fp = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(fp);
    if (stat.mtimeMs < cutoff) { fs.unlinkSync(fp); pruned++; }
  });
  if (pruned > 0) console.log(`[Backup] Pruned ${pruned} old backup(s)`);
}

// Allow standalone execution
if (require.main === module) {
  runBackup();
}

module.exports = runBackup;
