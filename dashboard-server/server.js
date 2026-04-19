/**
 * NBI Project Dashboard — Express API Server
 *
 * Backend for the NBI Project Dashboard, providing REST APIs for task management,
 * client CRM, leads pipeline, time tracking, expense reports, finance data,
 * user authentication, and data synchronisation.
 *
 * Dependencies:
 *   - PostgreSQL (via pg Pool) for persistent storage
 *   - bcrypt for password hashing
 *   - multer for file uploads (attachments, receipts, contracts)
 *   - @azure/msal-node for Microsoft Graph API email sending (optional, requires Azure AD app)
 *   - pdf-parse for contract text extraction (optional)
 *   - compression for gzip response compression
 *   - express-async-errors for automatic async error forwarding
 *
 * Environment variables:
 *   PORT            — HTTP port (default: 8888)
 *   DATABASE_URL    — PostgreSQL connection string
 *   AZURE_CLIENT_ID/TENANT_ID/CLIENT_SECRET/EMAIL_FROM — Microsoft Graph API email config
 *   APP_URL         — Base URL for reset links
 *
 * Usage:
 *   node server.js
 *   (or via PM2: pm2 start ecosystem.config.js)
 *
 * @module dashboard-server
 */

// ==================== DEPENDENCIES ====================

require('dotenv').config({ path: require('path').join(__dirname, '.env') }); // Load .env from server directory
require('express-async-errors'); // Must be imported before express to patch async route handlers
const express = require('express');
const compression = require('compression');
const { Pool, types: pgTypes } = require('pg');
// Return Postgres DATE columns (OID 1082) as raw 'YYYY-MM-DD' strings
// instead of JS Date objects. The default pg driver parses DATE as local
// midnight then serialises via toISOString(), which shifts the date
// backwards in every timezone west of UTC and forwards in every timezone
// east of UTC. For the calendar_events table in particular that turned
// '2026-04-16' into '2026-04-15T23:00:00.000Z' on the BST dev box and
// silently dropped events off the calendar grid. String pass-through is
// the canonical fix — the frontend already treats DATE values as YYYY-MM-DD
// anywhere it builds a date cell key.
pgTypes.setTypeParser(1082, v => v);
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
let archiver;
try { archiver = require('archiver'); } catch (e) { /* archiver optional — expense report ZIP export disabled */ }
const { withRetry, CircuitBreaker } = require('./resilience');
const { validateBackup } = require('./backup-validate');
const runMigrations = require('./migrations/runner');
let cron, runBackup;
try { cron = require('node-cron'); runBackup = require('./backup'); }
catch (e) { /* logged after logger init below */ }

// ==================== ITEM TYPE HIERARCHY ====================
const ITEM_TYPES = ['project', 'feature', 'story', 'task'];
const VALID_CHILD_TYPE = { project: 'feature', feature: 'story', story: 'task', task: null };
const VALID_PARENT_TYPE = { project: null, feature: 'project', story: 'feature', task: 'story' };

/** Infer item_type from the parent's type. If no parent, default to 'project'. */
function inferItemType(parentType) {
  if (!parentType) return 'project';
  return VALID_CHILD_TYPE[parentType] || 'task';
}

// ==================== STRUCTURED LOGGER ====================
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

/**
 * Structured JSON logger. Writes to stdout (info/debug/warn) or stderr (error).
 * @param {'error'|'warn'|'info'|'debug'} level - Log severity
 * @param {string} prefix - Module/section tag (e.g. 'Auth', 'Sync', 'Tasks')
 * @param {string} message - Human-readable log message
 * @param {Object} [data] - Optional structured data to include in the log entry
 */
function log(level, prefix, message, data) {
  if (LOG_LEVELS[level] > LOG_LEVEL) return;
  const entry = { ts: new Date().toISOString(), level, prefix, message };
  if (data) entry.data = data;
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

// Log deferred optional-deps warning now that logger is available
if (!cron || !runBackup) log('warn', 'System', 'Optional deps node-cron/backup not found — scheduled tasks disabled');

// ==================== FILE UPLOAD CONFIG ====================

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/** Multer instance — stores files with timestamped random names to avoid collisions */
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'text/csv', 'text/plain',
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + path.extname(file.originalname))
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_UPLOAD_TYPES.has(file.mimetype)) return cb(null, true);
    cb(new Error(`File type ${file.mimetype} not allowed. Accepted: images, PDFs, spreadsheets, documents.`));
  }
});

// ==================== CONSTANTS & CONFIG ====================

const PORT = process.env.PORT || 8888;
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { log('error', 'Server', 'FATAL: DATABASE_URL not set. Create a .env file — see .env.example'); process.exit(1); }
const SESSION_EXPIRY_DAYS = 7;

/** PostgreSQL connection pool — min 5 idle connections, max 50 */
const pool = new Pool({
  connectionString: DB_URL,
  min: 5,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000
});
pool.on('error', (err) => log('error', 'Pool', 'Unexpected error on idle client', { error: err.message }));

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Cloudflare tunnel) for correct IP in rate limiter

const SESSION_COOKIE_NAME = 'nbi_session';
function getSessionCookieOpts(req) {
  return { httpOnly: true, secure: req.secure, sameSite: 'lax', path: '/', maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000 };
}
function getCookieToken(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(/nbi_session=([^;]+)/);
  return match ? match[1] : null;
}

// Brute-force protection: track failed logins in memory (resets on restart)
const _failedLogins = {}; // { username: { count, lastAttempt } }
const FAILED_LOGIN_THRESHOLD = 3;  // Show "forgot password" link after this many failures
const FAILED_LOGIN_LOCKOUT = 5;    // Lock account for LOCKOUT_DURATION after this many failures
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Email config — Microsoft Graph API (OAuth2 client credentials)
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || '';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'nbihub@nbi-consulting.com';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

/** MSAL confidential client for Graph API token acquisition */
let _msalClient = null;
if (AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET) {
  const msal = require('@azure/msal-node');
  _msalClient = new msal.ConfidentialClientApplication({
    auth: {
      clientId: AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
      clientSecret: AZURE_CLIENT_SECRET
    }
  });
  log('info', 'Server', `Email configured: Graph API as ${EMAIL_FROM}`);
}

/** Acquire a Graph API access token (cached internally by MSAL) */
async function _getGraphToken() {
  if (!_msalClient) throw new Error('MSAL client not configured');
  const result = await _msalClient.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default']
  });
  if (!result || !result.accessToken) throw new Error('Failed to acquire Graph API token');
  return result.accessToken;
}

/** Send email via Microsoft Graph API — POST /users/{sender}/sendMail */
async function _sendViaGraph(mailOptions) {
  const token = await _getGraphToken();
  const toRecipients = (Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to])
    .map(addr => ({ emailAddress: { address: addr } }));
  const body = {
    message: {
      subject: mailOptions.subject,
      body: { contentType: mailOptions.html ? 'HTML' : 'Text', content: mailOptions.html || mailOptions.text || '' },
      toRecipients
    },
    saveToSentItems: false
  };
  const sender = mailOptions.from || EMAIL_FROM;
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${sender}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API ${res.status}: ${errText}`);
  }
}

/** Fire-and-forget email send with retry — logs failures but never blocks the request */
function sendEmailAsync(mailOptions) {
  if (!_msalClient) {
    log('info', 'Email', 'Graph API not configured, logging email', { to: mailOptions.to, subject: mailOptions.subject });
    return;
  }
  withRetry(() => _sendViaGraph(mailOptions), { maxAttempts: 2, backoffMs: 2000, log })
    .then(() => { log('info', 'Email', 'Email sent via Graph API', { to: mailOptions.to }); emailSends?.inc({ status: 'success' }); })
    .catch(err => { log('error', 'Email', 'Failed after retries', { to: mailOptions.to, error: err.message }); emailSends?.inc({ status: 'failure' }); });
}

// ==================== BUSINESS-DAY UTILITIES ====================

/** Add N business days to a YYYY-MM-DD string. Skips weekends. */
function addBusinessDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  let remaining = n;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d.toISOString().slice(0, 10);
}

/** Count business days between two YYYY-MM-DD strings. Negative if b < a. */
function businessDaysBetween(a, b) {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  const sign = db >= da ? 1 : -1;
  const start = sign === 1 ? da : db;
  const end = sign === 1 ? db : da;
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count * sign;
}

/**
 * Build a branded HTML email wrapper.
 * @param {string} title — email heading
 * @param {string} bodyHtml — inner HTML content (sections, tables, etc.)
 * @returns {string} complete HTML document
 */
function buildEmailHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5">
<div style="max-width:640px;margin:0 auto;background:#fff">
  <div style="background:#1e293b;padding:16px 24px">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">${title}</h1>
  </div>
  <div style="padding:24px">${bodyHtml}</div>
  <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
    Sent from NBI Hub &middot; <a href="${APP_URL}/nbi_project_dashboard.html" style="color:#64748b">Open Dashboard</a>
  </div>
</div>
</body></html>`;
}

/** Build an HTML table from rows. cols = [{label, key, style?}], rows = objects */
function buildEmailTable(cols, rows) {
  const thStyle = 'padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:13px;color:#64748b';
  const tdStyle = 'padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px';
  const header = cols.map(c => `<th style="${thStyle}">${c.label}</th>`).join('');
  const body = rows.map(r =>
    '<tr>' + cols.map(c => `<td style="${tdStyle}${c.style ? ';' + c.style : ''}">${escHtml(String(r[c.key] ?? ''))}</td>`).join('') + '</tr>'
  ).join('');
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0">${header ? `<tr>${header}</tr>` : ''}${body}</table>`;
}

/** Section heading with optional coloured left border */
function buildEmailSection(title, colour, contentHtml) {
  if (!contentHtml) return '';
  return `<div style="margin:20px 0;border-left:4px solid ${colour};padding-left:16px">
    <h2 style="margin:0 0 8px;font-size:15px;color:#1e293b">${title}</h2>
    ${contentHtml}
  </div>`;
}

// ==================== CACHING LAYER ====================
// Auth token cache — avoids DB query on every request
const _tokenCache = new Map();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Store a user object against their auth token with a TTL */
function cacheToken(token, user) {
  _tokenCache.set(token, { user, expiresAt: Date.now() + TOKEN_CACHE_TTL });
}
/** Retrieve a cached user by token, returning null if expired or missing */
function getCachedToken(token) {
  const entry = _tokenCache.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { _tokenCache.delete(token); return null; }
  return entry.user;
}
/** Remove a token from cache (e.g. on logout) */
function invalidateToken(token) { _tokenCache.delete(token); }

// Config cache — leads config, expense categories, rarely change
const _configCache = {};
const CONFIG_CACHE_TTL = 5 * 60 * 1000;

/**
 * Generic cache-aside helper. Returns cached data if fresh, otherwise calls
 * the fetcher function, stores the result, and returns it.
 * @param {string} key - Cache key
 * @param {Function} fetcher - Async function that produces the data
 */
async function getCached(key, fetcher) {
  const entry = _configCache[key];
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  const data = await fetcher();
  _configCache[key] = { data, expiresAt: Date.now() + CONFIG_CACHE_TTL };
  return data;
}
/** Evict a specific key from the config cache (e.g. after admin changes) */
function invalidateCache(key) { delete _configCache[key]; }

// Cleanup stale cache entries and failed login records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of _tokenCache) { if (entry.expiresAt <= now) _tokenCache.delete(token); }
  for (const key of Object.keys(_configCache)) { if (_configCache[key].expiresAt <= now) delete _configCache[key]; }
  // Evict failed login entries older than 1 hour to prevent unbounded growth
  const ONE_HOUR = 60 * 60 * 1000;
  for (const key of Object.keys(_failedLogins)) {
    if (now - _failedLogins[key].lastAttempt > ONE_HOUR) delete _failedLogins[key];
  }
}, 10 * 60 * 1000).unref(); // unref() allows graceful shutdown without this timer blocking exit

// ==================== HELPERS ====================

/**
 * Build a parameterised SET clause for PATCH endpoints.
 * Only includes fields present in both the request body and the allow-list.
 * Used by all PATCH handlers to avoid inline query building.
 * @param {Object} body - Request body
 * @param {string[]} allowedFields - Whitelist of column names
 * @returns {{ updates: string[], vals: any[], nextIdx: number }}
 */
function buildPatchQuery(body, allowedFields) {
  // Validate column names against a strict pattern to prevent SQL injection
  const SAFE_COL = /^[a-z_][a-z0-9_]*$/;
  const updates = []; const vals = []; let i = 1;
  for (const f of allowedFields) {
    if (!SAFE_COL.test(f)) throw new Error(`Invalid column name: ${f}`);
    if (body[f] !== undefined) { updates.push(`${f} = $${i}`); vals.push(body[f]); i++; }
  }
  return { updates, vals, nextIdx: i };
}

// =============================================================================
// Kanban position helpers (migration 021 / decision D79)
// =============================================================================

// Whitelist of (table -> groupCol) pairs that are valid for the position
// helpers. New kanban boards must be added here. The helpers refuse to
// operate on anything outside this list, which prevents SQL injection via
// the dynamic identifier interpolation.
const POSITION_TABLES = {
  tasks:        { groupCol: 'status' },
  bug_reports:  { groupCol: 'status' },
  candidates:   { groupCol: 'stage' },
  leads:        { groupCol: 'stage_id' },
};

function _validatePositionTable(table, groupCol) {
  if (!POSITION_TABLES[table]) throw new Error(`Invalid table for position helper: ${table}`);
  if (POSITION_TABLES[table].groupCol !== groupCol) {
    throw new Error(`Invalid column for position helper on ${table}: ${groupCol}`);
  }
}

/**
 * Shift every row in the target group down by 1 to make room for an INSERT
 * at position 0. MUST be called inside an active transaction (caller passes
 * the pg client). Caller then runs the actual INSERT with position = 0.
 *
 * @param {pg.PoolClient} client - active transaction client
 * @param {string} table - one of POSITION_TABLES keys
 * @param {string} groupCol - the group key column
 * @param {*} groupVal - the group value to shift
 */
async function shiftForInsert(client, table, groupCol, groupVal) {
  _validatePositionTable(table, groupCol);
  await client.query(
    `UPDATE ${table} SET position = position + 1 WHERE ${groupCol} = $1`,
    [groupVal]
  );
}

/**
 * Move a row to a new (group, position) inside an active transaction.
 *
 * Steps:
 *   1. Fetch the row's current group + position (FOR UPDATE).
 *   2. Compute target column length and clamp newPos.
 *   3. If group + position unchanged: no-op.
 *   4. If group changed: shift old group above the vacated slot up by -1.
 *   5. Shift target group from clampedPos onwards down by +1 (excluding rowId).
 *   6. UPDATE the row's group + position + updated_at.
 */
async function reorderInGroup(client, table, groupCol, rowId, newGroup, newPos) {
  _validatePositionTable(table, groupCol);
  if (!Number.isInteger(newPos) || newPos < 0) {
    throw new Error(`reorderInGroup: newPos must be a non-negative integer, got ${newPos}`);
  }

  const cur = await client.query(
    `SELECT ${groupCol} AS grp, position FROM ${table} WHERE id = $1 FOR UPDATE`,
    [rowId]
  );
  if (cur.rows.length === 0) throw new Error(`reorderInGroup: row not found ${rowId}`);
  const oldGroup = cur.rows[0].grp;
  const oldPos = cur.rows[0].position;
  const sameGroup = oldGroup === newGroup
    || (oldGroup != null && newGroup != null && String(oldGroup) === String(newGroup));

  const lengthRes = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${groupCol} = $1`,
    [newGroup]
  );
  const targetLen = lengthRes.rows[0].n;
  // Same-group: moved row is already counted, valid range 0..len-1.
  // Cross-group: moved row not yet in target, valid range 0..len.
  const maxPos = sameGroup ? Math.max(0, targetLen - 1) : targetLen;
  const clampedPos = Math.min(newPos, maxPos);

  if (sameGroup && clampedPos === oldPos) return;

  if (sameGroup) {
    if (clampedPos < oldPos) {
      // Move up: shift [clampedPos .. oldPos-1] down by +1
      await client.query(
        `UPDATE ${table} SET position = position + 1
         WHERE ${groupCol} = $1 AND position >= $2 AND position < $3 AND id <> $4`,
        [oldGroup, clampedPos, oldPos, rowId]
      );
    } else {
      // Move down: shift (oldPos .. clampedPos] up by -1
      await client.query(
        `UPDATE ${table} SET position = position - 1
         WHERE ${groupCol} = $1 AND position > $2 AND position <= $3 AND id <> $4`,
        [oldGroup, oldPos, clampedPos, rowId]
      );
    }
  } else {
    // Cross-column: close gap in old group
    await client.query(
      `UPDATE ${table} SET position = position - 1
       WHERE ${groupCol} = $1 AND position > $2`,
      [oldGroup, oldPos]
    );
    // Open slot in new group
    await client.query(
      `UPDATE ${table} SET position = position + 1
       WHERE ${groupCol} = $1 AND position >= $2 AND id <> $3`,
      [newGroup, clampedPos, rowId]
    );
  }

  await client.query(
    `UPDATE ${table} SET ${groupCol} = $1, position = $2, updated_at = NOW() WHERE id = $3`,
    [newGroup, clampedPos, rowId]
  );
}

/** UUID v4 format regex for parameter validation */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(s) { return typeof s === 'string' && UUID_RE.test(s); }

/** Input length limits — prevents oversized payloads reaching the DB */
const MAX_LENGTHS = { title: 500, description: 10000, notes: 5000, name: 200, email: 254, body: 50000 };

/**
 * Validate that a string does not exceed the maximum allowed length.
 * @param {*} value - The value to check
 * @param {string} field - Field name (used for error message and MAX_LENGTHS lookup)
 * @param {number} [max] - Override max length; falls back to MAX_LENGTHS[field] or 10000
 * @returns {string|null} Error message if exceeded, null if valid
 */
function validateLength(value, field, max) {
  if (typeof value === 'string' && value.length > (max || MAX_LENGTHS[field] || 10000)) {
    return `${field} exceeds maximum length of ${max || MAX_LENGTHS[field] || 10000} characters`;
  }
  return null;
}

/** Hash a session token with SHA-256 before storing or looking up in the DB */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Escape HTML special characters to prevent XSS in server-rendered pages.
 * Used in the public client report HTML endpoint.
 * @param {string} str - Raw string to escape
 * @returns {string} Escaped string safe for HTML interpolation
 */
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Circuit breakers for external APIs
const ocrBreaker = new CircuitBreaker('OCR.space', { failureThreshold: 3, resetTimeout: 60000, log });
const fxBreaker = new CircuitBreaker('Frankfurter', { failureThreshold: 3, resetTimeout: 300000, log });

// Prevent unhandled async rejections from crashing the server
process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Server', 'Unhandled rejection', { reason: reason?.message || String(reason) });
});

// ==================== MIDDLEWARE ====================

// Security: disable X-Powered-By header (reveals server technology)
app.disable('x-powered-by');

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content-Security-Policy: restrict script/style sources
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' cdn.sheetjs.com cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
    "font-src fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' api.frankfurter.dev open.er-api.com; " +
    "frame-src 'self' blob:; " +
    "object-src 'none'"
  );
  // Cache-Control: no caching for API responses, static files use Express defaults
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  next();
});

// Rate limiting — per-user (keyed by auth token hash or IP).
// Checks Bearer header first (legacy), then cookie (F-C2), then
// Cloudflare's cf-connecting-ip (unspoofable), then raw TCP peer (B-B5).
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return hashToken(auth.slice(7));
    const cookieToken = getCookieToken(req);
    if (cookieToken) return hashToken(cookieToken);
    return req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '127.0.0.1';
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
  message: { error: 'Too many requests. Please slow down.' }
});
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many requests. Please try again later.' } });
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot', authLimiter);
app.use('/api/auth/reset', authLimiter);

app.use(compression({ threshold: 1024 })); // Only compress responses > 1KB
app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.use(express.json({ limit: '10mb' }));   // Allow large payloads for sync/restore

// ==================== RESPONSE ENVELOPE (v2) ====================
// When client sends X-API-Version: 2, responses are wrapped in { data, error, meta }
// When omitted (v1), responses are unchanged for backward compatibility
app.use((req, res, next) => {
  if (req.headers['x-api-version'] !== '2') return next();
  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400) {
      return origJson({
        data: null,
        error: { message: body?.error || body?.message || 'Unknown error', code: res.statusCode },
        meta: { serverTime: new Date().toISOString() }
      });
    }
    // For paginated responses, extract meta from the body
    const meta = { serverTime: new Date().toISOString() };
    if (body?.total !== undefined) meta.total = body.total;
    if (body?.limit !== undefined) meta.limit = body.limit;
    if (body?.offset !== undefined) meta.offset = body.offset;
    if (body?.nextCursor !== undefined) meta.nextCursor = body.nextCursor;
    if (body?.hasMore !== undefined) meta.hasMore = body.hasMore;
    return origJson({ data: body, error: null, meta });
  };
  next();
});

// ==================== PROMETHEUS METRICS ====================
let promClient;
try { promClient = require('prom-client'); } catch(e) { log('warn', 'Metrics', 'prom-client not installed, /metrics disabled'); }

if (promClient) {
  promClient.collectDefaultMetrics({ prefix: 'nbi_' });

  const httpDuration = new promClient.Histogram({
    name: 'nbi_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
  });

  const httpRequests = new promClient.Counter({
    name: 'nbi_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  });

  const dbPoolGauge = new promClient.Gauge({
    name: 'nbi_db_pool_connections',
    help: 'Database connection pool stats',
    labelNames: ['state']
  });

  // Request timing middleware
  app.use((req, res, next) => {
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      const route = req.route?.path || req.path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
      end({ method: req.method, route, status: res.statusCode });
      httpRequests.inc({ method: req.method, route, status: res.statusCode });
    });
    next();
  });

  // Pool stats every 15 seconds
  setInterval(() => {
    dbPoolGauge.set({ state: 'total' }, pool.totalCount);
    dbPoolGauge.set({ state: 'idle' }, pool.idleCount);
    dbPoolGauge.set({ state: 'waiting' }, pool.waitingCount);
  }, 15000).unref();

  // Metrics endpoint — restricted to localhost for Prometheus scraping.
  // Uses req.socket.remoteAddress (raw TCP peer) instead of req.ip so that
  // trust-proxy / X-Forwarded-For cannot bypass the localhost gate (B-B25).
  app.get('/metrics', async (req, res) => {
    const ip = req.socket.remoteAddress;
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
      return res.status(403).json({ error: 'Metrics available from localhost only' });
    }
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  });
}

// Custom counters for specific events (only available when promClient is loaded)
const syncConflicts = promClient ? new promClient.Counter({ name: 'nbi_sync_conflicts_total', help: 'Sync conflict count' }) : null;
const authFailures = promClient ? new promClient.Counter({ name: 'nbi_auth_failures_total', help: 'Auth failure count' }) : null;
const ocrRequests = promClient ? new promClient.Counter({ name: 'nbi_ocr_requests_total', help: 'OCR request count', labelNames: ['status'] }) : null;
const emailSends = promClient ? new promClient.Counter({ name: 'nbi_email_sends_total', help: 'Email send count', labelNames: ['status'] }) : null;

/** GET / -- Serve the dashboard HTML from the parent directory (single-page app entry point) */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'nbi_project_dashboard.html'));
});
/** GET /nbi_project_dashboard.html -- Alias for the dashboard entry point */
app.get('/nbi_project_dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'nbi_project_dashboard.html'));
});

// ==================== AUTH ====================

/**
 * POST /api/auth/login
 * Authenticate with username/email + password. Returns a bearer token.
 * Tracks failed attempts and suggests password reset after repeated failures.
 */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const key = username.toLowerCase().trim();

  // Account lockout: block login after FAILED_LOGIN_LOCKOUT consecutive failures
  const failEntry = _failedLogins[key];
  if (failEntry && failEntry.count >= FAILED_LOGIN_LOCKOUT) {
    const elapsed = Date.now() - failEntry.lastAttempt;
    if (elapsed < LOCKOUT_DURATION) {
      const minsLeft = Math.ceil((LOCKOUT_DURATION - elapsed) / 60000);
      log('warn', 'Auth', `Account lockout active for "${key}" — ${failEntry.count} failures, ${minsLeft}min remaining`);
      return res.status(429).json({ error: `Account temporarily locked. Try again in ${minsLeft} minute${minsLeft > 1 ? 's' : ''}.`, locked: true, minsLeft });
    }
    // Lockout expired — reset counter
    log('info', 'Auth', `Lockout expired for "${key}", resetting counter`);
    delete _failedLogins[key];
  }

  // Allow login by either username or email address
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [key]);
  if (rows.length === 0) {
      if (Object.keys(_failedLogins).length > 10000) { for (const k of Object.keys(_failedLogins).slice(0, 5000)) delete _failedLogins[k]; }
    if (!_failedLogins[key]) _failedLogins[key] = { count: 0, lastAttempt: 0 };
    _failedLogins[key].count++;
    _failedLogins[key].lastAttempt = Date.now();
    const showReset = _failedLogins[key].count >= FAILED_LOGIN_THRESHOLD;
    authFailures?.inc();
    return res.status(401).json({ error: 'Invalid username or password', showReset });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    if (!_failedLogins[key]) _failedLogins[key] = { count: 0, lastAttempt: 0 };
    _failedLogins[key].count++;
    _failedLogins[key].lastAttempt = Date.now();
    const showReset = _failedLogins[key].count >= FAILED_LOGIN_THRESHOLD;
    authFailures?.inc();
    return res.status(401).json({ error: 'Invalid username or password', showReset });
  }

  // Successful login — clear failed attempts
  delete _failedLogins[key];

  // Create session — store SHA-256 hash in DB, return plaintext to client
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await pool.query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, hashedToken, expiresAt]);
  // Cache under hashed key
  cacheToken(hashedToken, { id: user.id, username: user.username, displayName: user.display_name, role: user.role, clientId: user.client_id });

  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOpts(req));
  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role, clientId: user.client_id },
    expiresAt: expiresAt.toISOString(),
  });
});

/** POST /api/auth/logout — Invalidate the current session token */
app.post('/api/auth/logout', async (req, res) => {
  const token = getCookieToken(req) || (req.headers.authorization || '').replace('Bearer ', '');
  if (token) {
    const hashed = hashToken(token);
    await pool.query('DELETE FROM sessions WHERE token = $1', [hashed]);
    invalidateToken(hashed);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.json({ ok: true });
});

/** GET /api/auth/me — Return the currently authenticated user's profile */
app.get('/api/auth/me', async (req, res) => {
  const token = getCookieToken(req) || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const hashed = hashToken(token);
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.role, u.client_id FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`, [hashed]
  );
  if (rows.length === 0) return res.status(401).json({ error: 'Session expired' });
  res.json({ user: { id: rows[0].id, username: rows[0].username, displayName: rows[0].display_name, role: rows[0].role, clientId: rows[0].client_id } });
});

/**
 * Authentication middleware — protects all /api/ routes.
 * Skips login, health check, password reset, and static file routes.
 * Checks the token cache first to avoid a DB query on every request.
 */
async function requireAuth(req, res, next) {
  // Public routes that bypass authentication
  if (req.path === '/api/auth/login' || req.path === '/api/health') return next();
  if (req.path.startsWith('/api/auth/forgot') || req.path.startsWith('/api/auth/reset-token')) return next();
  // Public shareable report routes — share tokens are 32 hex chars (B-B1)
  if (/^\/api\/reports\/[0-9a-f]{32}(\/html|\/pdf)?$/.test(req.path)) return next();
  if (!req.path.startsWith('/api/')) return next();

  const token = getCookieToken(req) || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const hashedToken = hashToken(token);
    // Check cache first (keyed by hashed token)
    const cached = getCachedToken(hashedToken);
    if (cached) { req.user = cached; return next(); }

    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.role, u.client_id FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`, [hashedToken]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Session expired' });
    const user = { id: rows[0].id, username: rows[0].username, displayName: rows[0].display_name, role: rows[0].role, clientId: rows[0].client_id };
    cacheToken(hashedToken, user);
    req.user = user;
    next();
  } catch(e) {
    log('error', 'Auth', 'Auth check failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
}
/** Exception client names that are always visible to all internal users */
const ALWAYS_VISIBLE_CLIENTS = ['NBI OPS', 'Playsage'];

/**
 * Return allowed client IDs for the current user, or null if unrestricted.
 *
 * - Admin (role=admin, no client_id): null (sees everything)
 * - External (client_id set): [client_id] (G5 single-client scope)
 * - Internal member with teams: team clients + exception clients + null-client tasks
 * - Internal member with no teams: null (sees everything — can't restrict without team data)
 *
 * Result is cached on req._clientScopes to avoid re-querying per request.
 */
async function getClientScopes(req) {
  if (req._clientScopes !== undefined) return req._clientScopes;

  // Admin: unrestricted
  if (req.user?.role === 'admin') { req._clientScopes = null; return null; }

  // External (G5): single client
  if (req.user?.clientId) { req._clientScopes = [req.user.clientId]; return req._clientScopes; }

  // Internal member: resolve team memberships
  const { rows: teams } = await pool.query(
    'SELECT DISTINCT t.client_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE tm.user_id = $1 AND t.client_id IS NOT NULL',
    [req.user?.id]
  );

  if (teams.length === 0) {
    const { rows: exceptions } = await pool.query(
      'SELECT id FROM clients WHERE name = ANY($1)',
      [ALWAYS_VISIBLE_CLIENTS]
    );
    const exceptionIds = exceptions.map(e => e.id);
    req._clientScopes = exceptionIds.length > 0 ? exceptionIds : ['00000000-0000-0000-0000-000000000000'];
    return req._clientScopes;
  }

  const teamClientIds = teams.map(t => t.client_id);

  // Add exception clients
  const { rows: exceptions } = await pool.query(
    'SELECT id FROM clients WHERE name = ANY($1)',
    [ALWAYS_VISIBLE_CLIENTS]
  );
  const exceptionIds = exceptions.map(e => e.id);

  req._clientScopes = [...new Set([...teamClientIds, ...exceptionIds])];
  return req._clientScopes;
}

/** Synchronous backward-compat wrapper — returns single client_id for G5 users, null otherwise */
function getClientScope(req) {
  return req.user?.clientId || null;
}

/** Middleware: block client-scoped users from internal-only endpoints */
function requireInternal(req, res, next) {
  if (req.user?.clientId) return res.status(403).json({ error: 'This feature is not available for client accounts' });
  next();
}

/**
 * POST /api/auth/forgot-password
 * Request a password reset email. Always returns success to prevent username enumeration.
 * If Microsoft Graph API email is not configured, the reset link is logged to the console as a fallback.
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username or email required' });

  const { rows } = await pool.query('SELECT id, email, display_name FROM users WHERE username = $1 OR email = $1', [username.toLowerCase().trim()]);
  // Always return success to prevent username enumeration
  if (rows.length === 0) return res.json({ ok: true, message: 'If that account exists, a reset link has been sent.' });

  const user = rows[0];
  if (!user.email) return res.json({ ok: true, message: 'If that account exists, a reset link has been sent.' });

  // Invalidate any existing tokens for this user
  await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);

  // Generate reset token (expires in 1 hour)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = hashToken(resetToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, hashedResetToken, expiresAt]);

  const resetUrl = `${APP_URL}/nbi_project_dashboard.html#reset-password/${resetToken}`;

  sendEmailAsync({
    from: EMAIL_FROM,
    to: user.email,
    subject: 'NBI Dashboard — Password Reset',
    text: `Hi ${user.display_name},\n\nSomeone requested a password reset for your NBI Dashboard account.\n\nClick here to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.\n\nNBI Dashboard`,
    html: `<p>Hi ${escHtml(user.display_name)},</p><p>Someone requested a password reset for your NBI Dashboard account.</p><p><a href="${escHtml(resetUrl)}" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Reset Password</a></p><p style="color:#666;font-size:0.85em">This link expires in 1 hour. If you did not request this, you can ignore this email.</p><p>NBI Dashboard</p>`
  });
  if (!_mailTransport) {
    log('info', 'Auth', `FALLBACK — Reset link for ${user.email}: ${resetUrl}`);
  }

  res.json({ ok: true, message: 'If that account exists, a reset link has been sent.' });
});

/** GET /api/auth/reset-token/:token — Validate a password reset token (public) */
app.get('/api/auth/reset-token/:token', async (req, res) => {
  const hashedResetToken = hashToken(req.params.token);
  const { rows } = await pool.query(
    'SELECT t.*, u.username, u.display_name FROM password_reset_tokens t JOIN users u ON t.user_id = u.id WHERE t.token = $1 AND t.used = FALSE AND t.expires_at > NOW()',
    [hashedResetToken]
  );
  if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link' });
  res.json({ ok: true, displayName: rows[0].display_name });
});

/** POST /api/auth/reset-token/:token — Set a new password using a valid reset token (public) */
app.post('/api/auth/reset-token/:token', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const hashedResetToken = hashToken(req.params.token);
  const { rows } = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
    [hashedResetToken]
  );
  if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link' });

  const resetRow = rows[0];
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, resetRow.user_id]);
  await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetRow.id]);
  // Invalidate all existing sessions
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [resetRow.user_id]);

  res.json({ ok: true, message: 'Password has been reset. You can now sign in.' });
});

// Internal endpoint for services (e.g. nbi-news) to create admin notifications.
// Authenticated via x-nbi-internal-token matching DASHBOARD_NOTIFICATION_TOKEN
// (the token the news sidecar presents on its way IN). The previous
// implementation expected NEWS_INTERNAL_TOKEN (the token this server
// presents on its way OUT to the sidecar) — a token-confusion bug that
// made rotation unsafe and defeated the separation of the two secrets
// (audit finding N-C3). Comparison is timing-safe and refuses empty
// values — the old `!==` bypassed auth when both sides were '' because
// NEWS_INTERNAL_TOKEN was unset in the environment (audit finding B-B6).
app.post('/api/internal/notifications', async (req, res) => {
  const presented = req.get('x-nbi-internal-token') || '';
  const expected = process.env.DASHBOARD_NOTIFICATION_TOKEN || '';
  if (!expected || !presented || presented.length !== expected.length) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  const a = Buffer.from(presented, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (!require('crypto').timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  const { type, title, message, link, dismissable, targetAdmins, username } = req.body || {};
  if (!type || !title) return res.status(400).json({ error: 'type and title required' });
  try {
    if (targetAdmins) {
      const admins = await pool.query('SELECT username FROM users WHERE role = \'admin\' AND is_active = true');
      for (const a of admins.rows) {
        await createNotification(a.username, type, title, message || '', link || '', dismissable !== false);
      }
      return res.json({ ok: true, recipients: admins.rows.length });
    }
    if (!username) return res.status(400).json({ error: 'username required when targetAdmins not set' });
    await createNotification(username, type, title, message || '', link || '', dismissable !== false);
    res.json({ ok: true });
  } catch (err) {
    console.error('[internal/notifications] error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// All routes below this line require a valid auth token
app.use(requireAuth);

// News aggregator proxy. Forwards authenticated user context and an internal token.
const { createProxyMiddleware } = require('http-proxy-middleware');
const NEWS_INTERNAL_TOKEN = process.env.NEWS_INTERNAL_TOKEN || '';
app.use('/api/news', createProxyMiddleware({
  target: 'http://127.0.0.1:8890',
  changeOrigin: true,
  pathRewrite: (path) => '/news' + path,
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('x-nbi-user', JSON.stringify({
          username: req.user.username,
          displayName: req.user.display_name,
          // req.user carries `role` (populated by requireAuth), not `is_admin` —
          // the latter never exists, so the previous `!!req.user.is_admin`
          // evaluated to false for everyone and silently killed any admin-only
          // feature on the news sidecar.
          isAdmin: req.user.role === 'admin',
        }));
      }
      proxyReq.setHeader('x-nbi-internal-token', NEWS_INTERNAL_TOKEN);
    },
    error: (err, req, res) => {
      console.error('[news-proxy] error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'news service unavailable' });
    },
  },
}));

/** POST /api/auth/reset-password — Admin-only: forcibly reset any user's password */
app.post('/api/auth/reset-password', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) return res.status(400).json({ error: 'userId and newPassword required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  // Invalidate all sessions for that user
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  // Also clear any failed login counters for this user
  const { rows: resetUser } = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
  if (resetUser.length > 0) delete _failedLogins[resetUser[0].username.toLowerCase()];
  res.json({ ok: true });
});

/** POST /api/auth/clear-lockout — Admin-only: clear failed login counter for a user */
app.post('/api/auth/clear-lockout', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const key = username.toLowerCase().trim();
  const had = !!_failedLogins[key];
  delete _failedLogins[key];
  res.json({ ok: true, cleared: had });
});

/** POST /api/auth/change-password — Change your own password (requires current password) */
app.post('/api/auth/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.user.id]);
  _tokenCache.clear();
  res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.json({ ok: true });
});

// ==================== USER MANAGEMENT ====================

/** GET /api/users — List users. Admins see full details; members see only id, display_name, username. */
app.get('/api/users', async (req, res) => {
  if (req.user.role === 'admin') {
    const { rows } = await pool.query('SELECT id, username, display_name, email, role, is_active, capacity_hours_per_week, resource_type_ids, created_at FROM users ORDER BY display_name');
    res.json(rows);
  } else {
    // Non-admins only get names (for assignee dropdowns) — no emails, roles, or capacity
    const { rows } = await pool.query('SELECT id, username, display_name FROM users WHERE is_active = TRUE ORDER BY display_name');
    res.json(rows);
  }
});

/** POST /api/users — Create a new user (admin only) */
app.post('/api/users', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { username, display_name, email, password, role } = req.body;
  const client_id = req.body.client_id || null;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const lenErr = validateLength(username, 'name', 200) || validateLength(display_name, 'name') || validateLength(email, 'email');
  if (lenErr) return res.status(400).json({ error: lenErr });
  const hash = await bcrypt.hash(password, 10);
  const cleanEmail = email && email.trim() ? email.trim() : null;
  // Check for duplicate email before insert
  if (cleanEmail) {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email address already in use' });
  }
  // Atomic insert — ON CONFLICT prevents race conditions
  const { rows } = await pool.query(
    `INSERT INTO users (username, display_name, email, password_hash, role, client_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (username) DO NOTHING
     RETURNING id, username, display_name, email, role, client_id`,
    [username.toLowerCase().trim(), display_name || username, cleanEmail, hash, role || 'member', client_id]
  );
  if (rows.length === 0) return res.status(409).json({ error: 'Username already exists' });
  await auditLog('user', rows[0].id, 'create', req.user?.displayName, { username, display_name });
  res.status(201).json(rows[0]);
});

/** DELETE /api/users/:id — Delete a user and their sessions (admin only, cannot delete self) */
app.delete('/api/users/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  // Prevent deleting yourself
  if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  await auditLog('user', req.params.id, 'delete', req.user?.displayName);
  res.json({ ok: true });
});

/** PATCH /api/users/:id — Update user profile fields: role, display_name, email, client_id (admin only) */
app.patch('/api/users/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['role', 'display_name', 'email', 'client_id']);
  if (req.body.display_name !== undefined && !req.body.display_name.trim()) {
    return res.status(400).json({ error: 'Display name cannot be empty' });
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING id, username, display_name, email, role, client_id`, vals);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  // Invalidate token cache entries for this user so stale role/display_name data is refreshed
  for (const [key, entry] of _tokenCache) {
    if (entry.user && entry.user.id === req.params.id) _tokenCache.delete(key);
  }
  res.json(rows[0]);
});

// ==================== AUDIT LOG ====================

/**
 * Look up the expense approver username from DB settings or env.
 * Returns null when neither source is configured — callers must handle
 * that case (typically by falling back to a broadcast to admins).
 * The old hardcoded 'tom' fallback (audit finding B-B11) silently
 * misdirected approval notifications to whichever user happened to
 * have that username after a DB hiccup.
 */
async function getExpenseApprover() {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'expense_approver'");
    if (rows[0]?.value) return rows[0].value;
  } catch (e) {
    console.error('[getExpenseApprover] settings lookup failed:', e.message);
  }
  return process.env.EXPENSE_APPROVER_USERNAME || null;
}

/**
 * Strip sensitive fields from audit data before persisting.
 * @param {Object} data - The raw audit data object
 * @returns {Object} Data with password/token fields redacted
 */
function sanitiseAuditData(data) {
  if (!data || typeof data !== 'object') return data;
  const sanitised = { ...data };
  const REDACT_FIELDS = ['password', 'token', 'reset_token', 'secret', 'api_key', 'password_hash', 'newPassword', 'currentPassword'];
  for (const field of REDACT_FIELDS) {
    if (sanitised[field]) sanitised[field] = '[REDACTED]';
  }
  return sanitised;
}

/**
 * Write an entry to the audit log. Sensitive fields are automatically
 * redacted via sanitiseAuditData(). Failures are logged but do not throw.
 * @param {string} entityType - e.g. 'task', 'lead', 'expense', 'user'
 * @param {string} entityId - UUID of the affected entity
 * @param {string} action - 'create', 'update', or 'delete'
 * @param {string} changedBy - Display name of the actor
 * @param {Object} [changes] - Object describing what changed (old/new values)
 * @param {import('pg').PoolClient} [conn] - Optional DB connection (for use within transactions)
 */
/**
 * Compute the next due date for a repeating task, given its repeat_rule and a base date.
 * @param {Object} rule - { type: 'daily'|'weekly'|'yearly', daysOfWeek?, everyNWeeks?, dates? }
 * @param {Date} from - The reference "now" date
 * @returns {string|null} ISO date string (YYYY-MM-DD) or null if rule is invalid
 */
function computeNextRepeatDate(rule, from) {
  if (!rule || typeof rule !== 'object' || !rule.type) return null;
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  const toIso = d => d.toISOString().slice(0, 10);

  if (rule.type === 'daily') {
    base.setDate(base.getDate() + 1);
    return toIso(base);
  }

  if (rule.type === 'weekly') {
    const days = Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0
      ? rule.daysOfWeek.map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6).sort((a, b) => a - b)
      : [];
    if (days.length === 0) {
      // Fallback: same day next week
      base.setDate(base.getDate() + 7);
      return toIso(base);
    }
    // Find the next matching day after today
    for (let i = 1; i <= 14; i++) {
      const cand = new Date(base);
      cand.setDate(cand.getDate() + i);
      if (days.includes(cand.getDay())) return toIso(cand);
    }
    return null;
  }

  if (rule.type === 'yearly') {
    const dates = Array.isArray(rule.dates) ? rule.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
    if (dates.length === 0) return null;
    // Find the earliest date strictly after today, possibly in next year(s)
    const todayMs = base.getTime();
    let best = null;
    for (const ds of dates) {
      const d = new Date(ds + 'T00:00:00');
      // Try this year and next year — pick whichever is the first > today
      for (let yearOffset = 0; yearOffset <= 2; yearOffset++) {
        const cand = new Date(d.getFullYear() + yearOffset, d.getMonth(), d.getDate());
        if (cand.getTime() > todayMs && (!best || cand < best)) { best = cand; break; }
      }
    }
    return best ? toIso(best) : null;
  }

  return null;
}

async function auditLog(entityType, entityId, action, changedBy, changes, conn) {
  const db = conn || pool;
  try {
    const sanitised = changes ? sanitiseAuditData(changes) : null;
    await db.query(
      'INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changes) VALUES ($1, $2, $3, $4, $5)',
      [entityType, entityId, action, changedBy || 'system', sanitised ? JSON.stringify(sanitised) : null]
    );
  } catch (e) {
    log('warn', 'Audit', 'Failed to log', { error: e.message });
  }
}

/**
 * GET /api/audit-log
 * Paginated audit log with optional filters by entity_type, action, or free-text search.
 * Joins to tasks table to enrich entries with task titles where applicable.
 */
app.get('/api/audit-log', requireInternal, async (req, res) => {
  // Admin only — the audit log contains change deltas, assignee names, and
  // reporter metadata that are not safe for regular members to read.
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const cursor = req.query.cursor || null; // ISO timestamp for cursor-based pagination
    const offset = parseInt(req.query.offset) || 0;
    const entityType = req.query.entity_type || null;
    const action = req.query.action || null;
    // Cap search length to avoid slow ILIKE queries
    const search = req.query.search ? String(req.query.search).slice(0, 200) : null;

    let where = [];
    let vals = [];
    let i = 1;
    if (entityType) { where.push(`a.entity_type = $${i}`); vals.push(entityType); i++; }
    if (action) { where.push(`a.action = $${i}`); vals.push(action); i++; }
    if (search) { where.push(`(a.changed_by ILIKE $${i} OR t.title ILIKE $${i})`); vals.push('%' + search + '%'); i++; }

    // Cursor-based: filter rows older than the cursor timestamp
    if (cursor) {
      where.push(`a.created_at < $${i}`);
      vals.push(cursor);
      i++;
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Fetch limit + 1 to determine hasMore without a separate count query
    const fetchLimit = limit + 1;
    vals.push(fetchLimit);
    let paginationClause;
    if (cursor) {
      // Cursor mode: no OFFSET
      paginationClause = `LIMIT $${i}`;
    } else {
      // Offset mode (backward compat): LIMIT + OFFSET
      vals.push(offset);
      paginationClause = `LIMIT $${i} OFFSET $${i + 1}`;
    }

    const { rows } = await pool.query(`
      SELECT a.*, t.title as entity_title
      FROM audit_log a
      LEFT JOIN tasks t ON a.entity_id = t.id AND a.entity_type = 'task'
      ${whereClause}
      ORDER BY a.created_at DESC
      ${paginationClause}
    `, vals);

    const hasMore = rows.length > limit;
    const entries = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && entries.length > 0 ? entries[entries.length - 1].created_at : null;

    // Count query only for non-cursor mode (backward compat) or first page
    const filterVals = cursor
      ? vals.slice(0, -1).filter((_, idx) => idx < i - 2) // exclude cursor and fetchLimit
      : vals.slice(0, -2).filter((_, idx) => idx < where.length - (cursor ? 1 : 0));
    const countWhereFilters = [];
    let ci = 1;
    if (entityType) { countWhereFilters.push(`a.entity_type = $${ci}`); ci++; }
    if (action) { countWhereFilters.push(`a.action = $${ci}`); ci++; }
    if (search) { countWhereFilters.push(`(a.changed_by ILIKE $${ci} OR t.title ILIKE $${ci})`); ci++; }
    const countWhere = countWhereFilters.length > 0 ? 'WHERE ' + countWhereFilters.join(' AND ') : '';
    const countVals = [];
    if (entityType) countVals.push(entityType);
    if (action) countVals.push(action);
    if (search) countVals.push('%' + search + '%');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_log a LEFT JOIN tasks t ON a.entity_id = t.id AND a.entity_type = 'task' ${countWhere}`,
      countVals
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({ entries, total, limit, offset, nextCursor, hasMore });
  } catch (err) {
    log('error', 'Audit', 'Query error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch audit log', entries: [], total: 0 });
  }
});

// ==================== HEALTH CHECK ====================

/** GET /api/health — Lightweight DB connectivity check (unauthenticated) */
app.get('/api/health', async (req, res) => {
  const checks = { db: 'unknown', news: 'unknown' };
  let anyFailed = false;
  try {
    await pool.query('SELECT 1');
    checks.db = 'connected';
  } catch (e) {
    checks.db = 'connection failed';
    anyFailed = true;
    log('error', 'Health', 'DB connectivity check failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
  }
  try {
    const newsResp = await fetch('http://127.0.0.1:8890/health', { signal: AbortSignal.timeout(3000) });
    checks.news = newsResp.ok ? 'ok' : `http ${newsResp.status}`;
  } catch (e) {
    checks.news = 'unreachable';
    anyFailed = true;
  }
  res.status(anyFailed ? 503 : 200).json({ status: anyFailed ? 'degraded' : 'ok', ...checks });
});

/** GET /api/finance/seed — Return finance seed data for initial bootstrap (admin only). */
app.get('/api/finance/seed', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const seedPath = path.join(__dirname, 'finance-seed.json');
    if (fs.existsSync(seedPath)) {
      const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
      res.json(data);
    } else {
      res.json({ revenue: [], pipeline: [], payroll: [], targets: {}, opex: [] });
    }
  } catch(e) {
    log('error', 'Finance', 'Failed to load finance seed data', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** GET /api/seed-data — Return seed CSV data for initial bootstrap (admin only).
 *  Seed data is loaded from seed-data.csv if it exists, otherwise returns empty. */
app.get('/api/seed-data', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const seedPath = path.join(__dirname, 'seed-data.csv');
    if (fs.existsSync(seedPath)) {
      const csv = fs.readFileSync(seedPath, 'utf-8');
      res.json({ csv });
    } else {
      res.json({ csv: null, message: 'No seed data file found. Place seed-data.csv in the server directory.' });
    }
  } catch(e) {
    log('error', 'Sync', 'Failed to load seed data', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== DATABASE BACKUP / RESTORE ====================

/**
 * GET /api/backup
 * Export all dashboard data as a JSON download (admin only).
 * Includes tasks, clients, comments, notes, finance data, users, and settings.
 */
app.get('/api/backup', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const tasks = await pool.query('SELECT * FROM tasks ORDER BY created_at');
    const clients = await pool.query('SELECT * FROM clients ORDER BY name');
    const comments = await pool.query('SELECT * FROM task_comments ORDER BY created_at');
    const notes = await pool.query('SELECT * FROM task_notes ORDER BY created_at');
    const finance = await pool.query('SELECT data FROM finance_data ORDER BY id DESC LIMIT 1');
    const users = await pool.query('SELECT id, username, display_name, email, role, created_at FROM users ORDER BY id');
    const settings = await pool.query('SELECT * FROM settings');
    const leads = await pool.query('SELECT * FROM leads ORDER BY created_at');
    const expenses = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
    const auditLog = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10000');
    const bugReports = await pool.query('SELECT id, user_id, type, title, description, page, status, priority, created_at, updated_at FROM bug_reports ORDER BY created_at DESC');
    const bugComments = await pool.query('SELECT * FROM bug_report_comments ORDER BY created_at');
    // SoWs — work_package_text is already filtered (pricing/legal stripped) so safe to include in backups
    const sows = await pool.query('SELECT * FROM sows ORDER BY created_at');
    const calendarEvents = await pool.query('SELECT * FROM calendar_events ORDER BY created_at');
    // Teams + memberships
    const teams = await pool.query('SELECT * FROM teams ORDER BY created_at');
    const teamMembers = await pool.query('SELECT * FROM team_members ORDER BY created_at');
    // Hiring tables (positions first because candidates may FK them)
    const hiringPositions = await pool.query('SELECT * FROM hiring_positions ORDER BY created_at');
    const candidates = await pool.query('SELECT * FROM candidates ORDER BY created_at');

    // Add uploads manifest to backup
    const uploadsDir = path.join(__dirname, 'uploads');
    let uploadManifest = [];
    try {
      if (fs.existsSync(uploadsDir)) {
        uploadManifest = fs.readdirSync(uploadsDir).map(f => {
          const stat = fs.statSync(path.join(uploadsDir, f));
          return { name: f, size: stat.size, modified: stat.mtime.toISOString() };
        });
      }
    } catch (e) { /* ignore */ }

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.displayName || 'unknown',
      tables: {
        tasks: tasks.rows,
        clients: clients.rows,
        task_comments: comments.rows,
        task_notes: notes.rows,
        finance_data: finance.rows[0]?.data || null,
        users: users.rows,
        settings: settings.rows,
        leads: leads.rows,
        expenses: expenses.rows,
        audit_log: auditLog.rows,
        bug_reports: bugReports.rows,
        bug_report_comments: bugComments.rows,
        sows: sows.rows,
        calendar_events: calendarEvents.rows,
        teams: teams.rows,
        team_members: teamMembers.rows,
        hiring_positions: hiringPositions.rows,
        candidates: candidates.rows,
      },
      uploadManifest,
    };
    res.setHeader('Content-Disposition', `attachment; filename="nbi-dashboard-backup-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(backup);
  } catch(e) {
    log('error', 'Backup', 'Failed to export backup', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

const VALID_STATUSES = new Set(['Not started', 'Planning', 'In progress', 'Done', 'Blocked', 'Cancelled']);
const SETTINGS_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

function validateRestoreClients(rows) {
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    if (!c.id || !UUID_RE.test(c.id)) return `clients[${i}].id: invalid UUID`;
    if (!c.name || typeof c.name !== 'string' || c.name.trim().length === 0) return `clients[${i}].name: required`;
    if (c.name.length > 200) return `clients[${i}].name: too long (max 200)`;
  }
  return null;
}

function validateRestoreTasks(rows) {
  for (let i = 0; i < rows.length; i++) {
    const t = rows[i];
    if (!t.id || !UUID_RE.test(t.id)) return `tasks[${i}].id: invalid UUID`;
    if (!t.title || typeof t.title !== 'string' || t.title.trim().length === 0) return `tasks[${i}].title: required`;
    if (t.title.length > 500) return `tasks[${i}].title: too long (max 500)`;
    if (t.status && !VALID_STATUSES.has(t.status)) return `tasks[${i}].status: invalid value "${t.status}"`;
    if (t.parent_id && !UUID_RE.test(t.parent_id)) return `tasks[${i}].parent_id: invalid UUID`;
    if (t.client_id && !UUID_RE.test(t.client_id)) return `tasks[${i}].client_id: invalid UUID`;
  }
  return null;
}

function validateRestoreSettings(rows) {
  for (let i = 0; i < rows.length; i++) {
    const s = rows[i];
    if (!s.key || typeof s.key !== 'string') return `settings[${i}].key: required`;
    if (!SETTINGS_KEY_RE.test(s.key)) return `settings[${i}].key: invalid format`;
  }
  return null;
}

function validateRestoreLeads(rows) {
  for (let i = 0; i < rows.length; i++) {
    const l = rows[i];
    if (!l.id || !UUID_RE.test(l.id)) return `leads[${i}].id: invalid UUID`;
    if (!l.title || typeof l.title !== 'string') return `leads[${i}].title: required`;
    if (l.client_id && !UUID_RE.test(l.client_id)) return `leads[${i}].client_id: invalid UUID`;
    if (l.stage_id && !UUID_RE.test(l.stage_id)) return `leads[${i}].stage_id: invalid UUID`;
  }
  return null;
}

function validateRestoreUsers(rows) {
  for (let i = 0; i < rows.length; i++) {
    const u = rows[i];
    if (!u.id || !UUID_RE.test(u.id)) return `users[${i}].id: invalid UUID`;
    if (u.role && !['admin', 'member'].includes(u.role)) return `users[${i}].role: invalid`;
  }
  return null;
}

function validateRestoreGenericUUID(rows, tableName) {
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].id || !UUID_RE.test(rows[i].id)) return `${tableName}[${i}].id: invalid UUID`;
  }
  return null;
}

/**
 * POST /api/restore
 * Restore dashboard data from a backup JSON payload (admin only).
 * Uses a transaction — rolls back entirely on any error.
 * Restores clients first since tasks have a foreign key dependency on them.
 * Handles all 7 core tables: clients, tasks, users (metadata only), settings, leads, expenses, audit_log (append-only).
 */
app.post('/api/restore', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { backup } = req.body;
  if (!backup || !backup.tables) return res.status(400).json({ error: 'Invalid backup format' });

  const validators = [
    ['clients', validateRestoreClients],
    ['tasks', validateRestoreTasks],
    ['settings', validateRestoreSettings],
    ['leads', validateRestoreLeads],
    ['users', validateRestoreUsers],
  ];
  for (const [table, validator] of validators) {
    if (backup.tables[table] && Array.isArray(backup.tables[table])) {
      const err = validator(backup.tables[table]);
      if (err) return res.status(400).json({ error: `Restore validation failed: ${err}` });
    }
  }
  for (const table of ['task_comments', 'expenses', 'audit_log', 'bug_reports', 'bug_report_comments',
      'calendar_events', 'teams', 'team_members', 'hiring_positions', 'candidates', 'sows']) {
    if (backup.tables[table] && Array.isArray(backup.tables[table])) {
      const err = validateRestoreGenericUUID(backup.tables[table], table);
      if (err) return res.status(400).json({ error: `Restore validation failed: ${err}` });
    }
  }

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    // Restore clients first (tasks depend on them)
    if (backup.tables.clients) {
      for (const c of backup.tables.clients) {
        await conn.query('INSERT INTO clients (id, name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2', [c.id, c.name, c.created_at]);
      }
    }

    // Restore tasks
    if (backup.tables.tasks) {
      for (const t of backup.tables.tasks) {
        await conn.query(`INSERT INTO tasks (id, title, parent_id, client_id, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, source, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          ON CONFLICT (id) DO UPDATE SET title=$2, parent_id=$3, client_id=$4, status=$5, priority=$6, health_state=$7, description=$8, assignees=$9, hours_estimated=$10, hours_spent=$11, due_date=$12, start_date=$13, end_date=$14, source=$15, updated_at=$17`,
          [t.id, t.title, t.parent_id, t.client_id, t.status, t.priority, t.health_state, t.description, t.assignees, t.hours_estimated, t.hours_spent, t.due_date, t.start_date || '', t.end_date || '', t.source, t.created_at, t.updated_at]);
      }
    }

    // Restore comments
    if (backup.tables.task_comments) {
      for (const c of backup.tables.task_comments) {
        await conn.query('INSERT INTO task_comments (id, task_id, author, text, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING', [c.id, c.task_id, c.author, c.text, c.created_at]);
      }
    }

    // Restore finance data
    if (backup.tables.finance_data) {
      await conn.query('INSERT INTO finance_data (data, updated_by) VALUES ($1, $2)', [JSON.stringify(backup.tables.finance_data), 'restore']);
    }

    // Restore users — metadata only (display_name, role, is_active). NEVER restore password hashes.
    if (backup.tables.users) {
      for (const u of backup.tables.users) {
        await conn.query(`UPDATE users SET display_name = COALESCE($2, display_name), role = COALESCE($3, role), is_active = COALESCE($4, is_active) WHERE id = $1`,
          [u.id, u.display_name, u.role, u.is_active]);
      }
    }

    // Restore settings (ON CONFLICT key DO UPDATE)
    if (backup.tables.settings) {
      for (const s of backup.tables.settings) {
        await conn.query('INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, COALESCE($3, NOW())) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = COALESCE($3, NOW())',
          [s.key, typeof s.value === 'string' ? s.value : JSON.stringify(s.value), s.updated_at]);
      }
    }

    // Restore leads (ON CONFLICT id DO UPDATE)
    if (backup.tables.leads) {
      for (const l of backup.tables.leads) {
        await conn.query(`INSERT INTO leads (id, client_id, title, work_type, service_line, stage_id, priority, currency, rom_min, rom_max, rom_text, win_probability, deal_owner, lead_source, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          ON CONFLICT (id) DO UPDATE SET client_id=$2, title=$3, work_type=$4, service_line=$5, stage_id=$6, priority=$7, currency=$8, rom_min=$9, rom_max=$10, rom_text=$11, win_probability=$12, deal_owner=$13, lead_source=$14, notes=$15, updated_at=$17`,
          [l.id, l.client_id, l.title, l.work_type, l.service_line, l.stage_id, l.priority, l.currency, l.rom_min, l.rom_max, l.rom_text, l.win_probability, l.deal_owner, l.lead_source, l.notes, l.created_at, l.updated_at]);
      }
    }

    // Restore expenses (ON CONFLICT id DO UPDATE)
    if (backup.tables.expenses) {
      for (const e of backup.tables.expenses) {
        await conn.query(`INSERT INTO expenses (id, user_id, date, amount, currency, category_id, description, status, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (id) DO UPDATE SET user_id=$2, date=$3, amount=$4, currency=$5, category_id=$6, description=$7, status=$8, notes=$9, updated_at=$11`,
          [e.id, e.user_id, e.date, e.amount, e.currency, e.category_id, e.description, e.status, e.notes, e.created_at, e.updated_at]);
      }
    }

    // Audit log — append-only, never overwrite existing entries
    if (backup.tables.audit_log) {
      for (const a of backup.tables.audit_log) {
        await conn.query('INSERT INTO audit_log (id, entity_type, entity_id, action, changed_by, changes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
          [a.id, a.entity_type, a.entity_id, a.action, a.changed_by, a.changes ? JSON.stringify(a.changes) : null, a.created_at]);
      }
    }

    // Bug reports (must come before comments due to FK dependency)
    if (backup.tables.bug_reports) {
      for (const b of backup.tables.bug_reports) {
        await conn.query(
          `INSERT INTO bug_reports (id, user_id, type, title, description, page, status, priority, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [b.id, b.user_id, b.type, b.title, b.description, b.page, b.status, b.priority, b.created_at, b.updated_at]
        );
      }
    }
    if (backup.tables.bug_report_comments) {
      for (const c of backup.tables.bug_report_comments) {
        await conn.query(
          `INSERT INTO bug_report_comments (id, report_id, author, text, created_at)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
          [c.id, c.report_id, c.author, c.text, c.created_at]
        );
      }
    }

    // Calendar events
    if (backup.tables.calendar_events) {
      for (const ev of backup.tables.calendar_events) {
        await conn.query(
          `INSERT INTO calendar_events (id, user_id, title, event_type, start_date, end_date, client_id, visibility, description, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE SET title=$3, event_type=$4, start_date=$5, end_date=$6, client_id=$7, visibility=$8, description=$9, updated_at=$11`,
          [ev.id, ev.user_id, ev.title, ev.event_type, ev.start_date, ev.end_date, ev.client_id, ev.visibility, ev.description, ev.created_at, ev.updated_at]
        );
      }
    }

    // Teams + memberships (depend on clients/sows/users which are restored above)
    if (backup.tables.teams) {
      for (const t of backup.tables.teams) {
        await conn.query(
          `INSERT INTO teams (id, name, description, client_id, sow_id, colour, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, client_id=$4, sow_id=$5, colour=$6, updated_at=$8`,
          [t.id, t.name, t.description, t.client_id, t.sow_id, t.colour, t.created_at, t.updated_at]
        );
      }
    }
    if (backup.tables.team_members) {
      for (const tm of backup.tables.team_members) {
        await conn.query(
          `INSERT INTO team_members (id, team_id, user_id, role, created_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [tm.id, tm.team_id, tm.user_id, tm.role, tm.created_at]
        );
      }
    }

    // Hiring positions (must come before candidates due to FK; safe re-run via ON CONFLICT)
    if (backup.tables.hiring_positions) {
      for (const p of backup.tables.hiring_positions) {
        await conn.query(
          `INSERT INTO hiring_positions (id, client_id, sow_id, title, description, seniority, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO UPDATE SET client_id=$2, sow_id=$3, title=$4, description=$5, seniority=$6, status=$7, updated_at=$9`,
          [p.id, p.client_id, p.sow_id, p.title, p.description, p.seniority, p.status, p.created_at, p.updated_at]
        );
      }
    }
    if (backup.tables.candidates) {
      for (const ca of backup.tables.candidates) {
        await conn.query(
          `INSERT INTO candidates (id, position_id, client_id, name, role, linkedin_url, cv_filename, due_date, stage, notes, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO UPDATE SET position_id=$2, client_id=$3, name=$4, role=$5, linkedin_url=$6, cv_filename=$7, due_date=$8, stage=$9, notes=$10, updated_at=$12`,
          [ca.id, ca.position_id, ca.client_id, ca.name, ca.role, ca.linkedin_url, ca.cv_filename, ca.due_date, ca.stage, ca.notes, ca.created_at, ca.updated_at]
        );
      }
    }

    // SoWs (must come before tasks if tasks reference sow_id, but tasks restore is above; safe because sow_id allows NULL)
    if (backup.tables.sows) {
      for (const s of backup.tables.sows) {
        await conn.query(
          `INSERT INTO sows (id, client_id, title, start_date, end_date, status, work_package_text, extraction_stats, uploaded_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE SET title=$3, start_date=$4, end_date=$5, status=$6, work_package_text=$7, extraction_stats=$8, updated_at=$11`,
          [s.id, s.client_id, s.title, s.start_date, s.end_date, s.status, s.work_package_text, s.extraction_stats ? (typeof s.extraction_stats === 'string' ? s.extraction_stats : JSON.stringify(s.extraction_stats)) : null, s.uploaded_by, s.created_at, s.updated_at]
        );
      }
    }

    await conn.query('COMMIT');
    await auditLog('system', 'backup', 'restore', req.user?.displayName, { exportedAt: backup.exportedAt });
    res.json({ ok: true, message: 'Backup restored successfully' });
  } catch(e) {
    await conn.query('ROLLBACK');
    log('error', 'Backup', 'Failed to restore backup', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    conn.release();
  }
});

// ==================== TASK COMMENTS ====================

/** GET /api/tasks/:id/comments — List all comments on a task, oldest first */
app.get('/api/tasks/:id/comments', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const { rows } = await pool.query('SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC', [req.params.id]);
  res.json(rows);
});

/** POST /api/tasks/:id/comments — Add a comment to a task */
app.post('/api/tasks/:id/comments', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
  const author = req.user?.displayName || 'Unknown';
  const { rows } = await pool.query(
    'INSERT INTO task_comments (task_id, author, text) VALUES ($1, $2, $3) RETURNING *',
    [req.params.id, author, text.trim()]
  );
  await auditLog('comment', rows[0].id, 'create', author, { task_id: req.params.id, text: text.trim() });
  res.status(201).json(rows[0]);
});

/** DELETE /api/tasks/:id/comments/:commentId — Remove a comment from a task (owner or admin) */
app.delete('/api/tasks/:id/comments/:commentId', async (req, res) => {
  const { rows } = await pool.query('SELECT author FROM task_comments WHERE id = $1 AND task_id = $2', [req.params.commentId, req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
  const isOwner = rows[0].author === (req.user?.displayName || req.user?.display_name);
  if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Can only delete your own comments' });
  await pool.query('DELETE FROM task_comments WHERE id = $1 AND task_id = $2', [req.params.commentId, req.params.id]);
  res.json({ ok: true });
});

// ==================== DOWNLOADS SCANNER & FILE IMPORT ====================

/**
 * Detect the import format from CSV/XLSX column headers.
 * Matches known patterns (Planner, MS Project, NBI CSV, CH Artifacts, etc.).
 * @param {string[]} headers - Column header names from the first row
 * @returns {{ format: string, label: string }} Identified format key and human-readable label
 */
function detectImportFormat(headers) {
  const h = headers.map(x => String(x || '').toLowerCase().trim());
  // Microsoft Planner XLSX export
  if (h.includes('task id') && h.includes('bucket name') && h.includes('progress'))
    return { format: 'planner', label: 'Microsoft Planner Export' };
  // MS Project export
  if (h.includes('name') && h.includes('duration') && (h.includes('start_date') || h.includes('start date')) && (h.includes('finish_date') || h.includes('finish date')))
    return { format: 'ms-project', label: 'Microsoft Project Export' };
  // CH Artifacts Project Plan
  if (h.includes('ref') && h.includes('artifact name') && h.includes('legal basis / driver'))
    return { format: 'ch-artifacts', label: 'Couch Heroes Artifacts Plan' };
  // Glen work list / Slack list (our CSV format)
  if (h.includes('task') && h.includes('status') && h.includes('priority'))
    return { format: 'nbi-csv', label: 'NBI Task List (CSV)' };
  // NBI dashboard export
  if (h.includes('task') && h.includes('client') && h.includes('health state'))
    return { format: 'nbi-export', label: 'NBI Dashboard Export' };
  // Generic — has something task-like
  if (h.includes('task') || h.includes('task name') || h.includes('name') || h.includes('title'))
    return { format: 'generic', label: 'Generic Task List' };
  return { format: 'unknown', label: 'Unknown Format' };
}

/**
 * Parse an Excel file and return headers, sample rows, and sheet metadata.
 * @param {string} filePath - Absolute path to the .xlsx/.xls file
 * @param {boolean} headersOnly - If true, reads only first 5 rows (fast scan for format detection)
 * @returns {{ sheetNames: string[], sheets: Object[] }} Parsed sheet data with headers, row counts, and samples
 */
function parseExcelFile(filePath, headersOnly) {
  const opts = { cellDates: true };
  if (headersOnly) opts.sheetRows = 5;
  const wb = XLSX.readFile(filePath, opts);
  const sheets = wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
    const dataRows = rows.filter(r => r.some(c => c != null && String(c).trim() !== ''));
    if (dataRows.length === 0) return null;
    const headers = dataRows[0].map(x => String(x || '').trim());
    // When doing headers-only scan, we don't know the real row count
    const rowCount = headersOnly ? -1 : dataRows.length - 1;
    return { name, headers, rowCount, sample: dataRows.slice(1, 6) };
  }).filter(Boolean);
  return { sheetNames: wb.SheetNames, sheets };
}

/**
 * Parse a CSV file using a basic state-machine parser (handles quoted fields).
 * @param {string} filePath - Absolute path to the .csv file
 * @returns {{ headers: string[], rowCount: number, rows: string[][] }|null} Parsed data, or null if empty
 */
function parseCSVFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  let row = [], cell = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i+1] === '"') { cell += '"'; i++; } else { inQuote = false; }
      } else { cell += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ''; }
      else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i+1] === '\n') i++;
        row.push(cell.trim()); cell = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
      } else { cell += ch; }
    }
  }
  row.push(cell.trim());
  if (row.some(c => c !== '')) rows.push(row);
  if (rows.length === 0) return null;
  const headers = rows[0];
  return { headers, rowCount: rows.length - 1, rows: rows.slice(1) };
}

/**
 * GET /api/import/scan-downloads
 * Scans the user's Downloads folder for importable Excel/CSV files.
 * Returns file list with detected format, size, modification date.
 */
app.get('/api/import/scan-downloads', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  try {
    const files = [];

    // Only scan these known subdirectories (avoid scanning dozens of unrelated folders)
    const knownSubdirs = ['msteams dload', 'Spreadsheets', 'expense'];

    /**
     * Scan a directory for importable files (.xlsx, .xls, .csv).
     * @param {string} dir - Absolute path to scan
     * @param {string} prefix - Display prefix for nested paths (e.g. 'subfolder/')
     */
    function scanDir(dir, prefix) {
      let entries;
      try { entries = fs.readdirSync(dir); } catch(e) { return; }
      for (const name of entries) {
        if (name.startsWith('~$')) continue;
        const fullPath = path.join(dir, name);
        let stat;
        try { stat = fs.statSync(fullPath); } catch(e) { continue; }
        // Recurse into known subdirectories only (one level deep)
        if (stat.isDirectory() && !prefix && knownSubdirs.includes(name)) { scanDir(fullPath, name); continue; }
        const ext = path.extname(name).toLowerCase();
        if (!['.csv', '.xlsx', '.xls'].includes(ext)) continue;
        const relPath = prefix ? prefix + '/' + name : name;
        let format = { format: 'unknown', label: 'Unknown' };
        let sheetCount = 1;
        let rowCount = 0;
        let planName = '';
        try {
          if (ext === '.csv') {
            const parsed = parseCSVFile(fullPath);
            if (parsed) { format = detectImportFormat(parsed.headers); rowCount = parsed.rowCount; }
          } else {
            const parsed = parseExcelFile(fullPath, true);
            if (parsed.sheets.length > 0) {
              format = detectImportFormat(parsed.sheets[0].headers);
              sheetCount = parsed.sheetNames.length;
              rowCount = parsed.sheets[0].rowCount;
            }
            // Extract Planner plan name from parsed sheets
            // Plan name sheet layout: Row 0 = ["Plan name", "<actual name>"], Row 1 = ["Plan ID", "<id>"]
            if (parsed.sheetNames.includes('Plan name')) {
              const pnSheet = parsed.sheets.find(s => s.name === 'Plan name');
              if (pnSheet && pnSheet.headers[0] === 'Plan name' && pnSheet.headers[1]) {
                planName = String(pnSheet.headers[1]);
              }
            }
          }
        } catch(e) { /* skip unparseable files */ }
        files.push({
          name: relPath, ext, folder: prefix || '',
          size: stat.size,
          modified: stat.mtime.toISOString(),
          format: format.format,
          formatLabel: format.label,
          sheetCount, rowCount, planName,
        });
      }
    }

    scanDir(downloadsDir, '');
    files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json({ dir: downloadsDir, files });
  } catch(e) {
    log('error', 'Import', 'Cannot read Downloads folder', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/**
 * POST /api/import/parse-file
 * Parse a specific file from Downloads and return full preview data.
 * Body: { filename: string, sheet?: string }
 */
app.post('/api/import/parse-file', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { filename, sheet } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });
  // Security: allow files from Downloads or one subdirectory deep, no path traversal
  const parts = filename.replace(/\\/g, '/').split('/');
  if (parts.length > 2 || parts.some(p => p === '..' || p === '.')) return res.status(400).json({ error: 'Invalid path' });
  const safeParts = parts.map(p => path.basename(p));
  const safeName = safeParts.join('/');
  const fullPath = path.join(os.homedir(), 'Downloads', ...safeParts);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });

  try {
    const ext = path.extname(safeName).toLowerCase();
    if (ext === '.csv') {
      const parsed = parseCSVFile(fullPath);
      if (!parsed) return res.status(400).json({ error: 'Empty CSV' });
      const format = detectImportFormat(parsed.headers);
      const mapped = mapRowsToTasks(format.format, parsed.headers, parsed.rows);
      res.json({
        filename: safeName, type: 'csv',
        format: format.format, formatLabel: format.label,
        headers: parsed.headers,
        totalRows: parsed.rowCount,
        preview: mapped.slice(0, 10),
        tasks: mapped,
      });
    } else {
      const parsed = parseExcelFile(fullPath);
      if (parsed.sheets.length === 0) return res.status(400).json({ error: 'Empty spreadsheet' });
      const targetSheet = sheet ? parsed.sheets.find(s => s.name === sheet) : parsed.sheets[0];
      if (!targetSheet) return res.status(400).json({ error: 'Sheet not found' });
      const format = detectImportFormat(targetSheet.headers);
      const mapped = mapRowsToTasks(format.format, targetSheet.headers, targetSheet.sample.length < targetSheet.rowCount
        ? (() => {
            // Re-read all rows for full import
            const wb = XLSX.readFile(fullPath, { cellDates: true });
            const ws = wb.Sheets[targetSheet.name];
            const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
            return allRows.slice(1).filter(r => r.some(c => c != null && String(c).trim() !== ''));
          })()
        : targetSheet.sample
      );
      res.json({
        filename: safeName, type: 'xlsx',
        format: format.format, formatLabel: format.label,
        headers: targetSheet.headers,
        sheets: parsed.sheetNames,
        activeSheet: targetSheet.name,
        totalRows: targetSheet.rowCount,
        preview: mapped.slice(0, 10),
        tasks: mapped,
      });
    }
  } catch(e) {
    log('error', 'Import', 'File parse failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/**
 * Map parsed spreadsheet rows to the dashboard task structure based on detected format.
 * Handles NBI CSV, CH Artifacts, MS Project, Planner, and generic formats.
 * @param {string} format - Format key from detectImportFormat (e.g. 'planner', 'nbi-csv')
 * @param {string[]} headers - Column header names
 * @param {string[][]} rows - Data rows (each row is an array of cell values)
 * @returns {Object[]} Array of task objects ready for bulk import
 */
function mapRowsToTasks(format, headers, rows) {
  const ci = (name) => headers.findIndex(h => String(h || '').toLowerCase().trim() === name.toLowerCase().trim());
  const ciAny = (...names) => { for (const n of names) { const i = ci(n); if (i >= 0) return i; } return -1; };
  const get = (row, idx) => idx >= 0 && row[idx] != null ? String(row[idx]).trim() : '';

  /** Map varied status strings to canonical dashboard status values */
  function normaliseStatus(s) {
    if (!s) return 'Not started';
    const lower = s.toLowerCase().trim();
    const map = { 'not started': 'Not started', 'in progress': 'In progress', 'in-progress': 'In progress',
      planning: 'Planning', drafted: 'Drafted', done: 'Done', completed: 'Done',
      cancelled: 'Cancelled', canceled: 'Cancelled', complete: 'Done' };
    return map[lower] || 'Not started';
  }
  /** Map varied priority strings (P1-P4, named) to canonical dashboard priority values */
  function normalisePriority(p) {
    if (!p) return '';
    const lower = p.toLowerCase().trim();
    const map = { p1: 'Critical ACT', critical: 'Critical ACT', urgent: 'Critical ACT',
      p2: 'High', high: 'High', important: 'High',
      p3: 'Medium', medium: 'Medium', p4: 'Low', low: 'Low' };
    return map[lower] || p;
  }

  switch (format) {
    case 'nbi-csv':
    case 'nbi-export': {
      const iTask = ciAny('task', 'task name', 'title');
      const iParent = ci('parent task');
      const iStatus = ci('status');
      const iPriority = ci('priority');
      const iDesc = ci('description');
      const iAssignee = ciAny('assignee', 'assigned to');
      const iHealth = ci('health state');
      const iClient = ci('client');
      const iHoursEst = ciAny('hours estimated', 'hours est');
      const iHoursSpent = ci('hours spent');
      const iDue = ciAny('due date', 'due');
      return rows.map(r => ({
        title: get(r, iTask),
        parentTitle: get(r, iParent),
        status: normaliseStatus(get(r, iStatus)),
        priority: normalisePriority(get(r, iPriority)),
        description: get(r, iDesc),
        assignees: get(r, iAssignee) ? get(r, iAssignee).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [],
        healthState: get(r, iHealth),
        client: get(r, iClient),
        hoursEstimated: parseFloat(get(r, iHoursEst)) || 0,
        hoursSpent: parseFloat(get(r, iHoursSpent)) || 0,
        dueDate: get(r, iDue),
      })).filter(t => t.title);
    }

    case 'ch-artifacts': {
      const iRef = ci('ref');
      const iPriority = ci('priority');
      const iName = ci('artifact name');
      const iDesc = ci('description');
      const iDriver = ciAny('legal basis / driver', 'legal basis');
      const iDeadline = ciAny('deadline / trigger', 'deadline');
      const iOwner = ci('owner');
      const iStatus = ci('status');
      const iDeps = ci('dependencies');
      const iNotes = ci('notes');
      return rows.map(r => {
        const ref = get(r, iRef);
        const name = get(r, iName);
        if (!name || name.startsWith('PRIORITY')) return null; // Skip section headers
        const desc = [get(r, iDesc), get(r, iDriver) ? 'Legal basis: ' + get(r, iDriver) : '', get(r, iNotes)].filter(Boolean).join('\n\n');
        return {
          title: ref ? `[${ref}] ${name}` : name,
          parentTitle: '',  // Parent resolution happens in the frontend during import
          status: normaliseStatus(get(r, iStatus)),
          priority: normalisePriority(get(r, iPriority)),
          description: desc,
          assignees: get(r, iOwner) ? get(r, iOwner).split(/[+,;]/).map(s => s.trim()).filter(Boolean) : [],
          healthState: '',
          client: 'Couch Heroes',
          hoursEstimated: 0,
          hoursSpent: 0,
          dueDate: '',
          deadlineTrigger: get(r, iDeadline),
          dependencies: get(r, iDeps),
        };
      }).filter(Boolean);
    }

    case 'ms-project': {
      const iName = ciAny('name', 'task name');
      const iDuration = ci('duration');
      const iStart = ciAny('start_date', 'start date', 'start');
      const iFinish = ciAny('finish_date', 'finish date', 'finish');
      const iResource = ciAny('resource_names', 'resource names', 'resources');
      return rows.map(r => {
        const name = get(r, iName);
        if (!name) return null;
        const startRaw = get(r, iStart);
        const endRaw = get(r, iFinish);
        // Parse date strings like "January 1, 2026 8:00 AM"
        const parseDate = (s) => { if (!s) return ''; try { const d = new Date(s); return isNaN(d) ? '' : d.toISOString().split('T')[0]; } catch(e) { return ''; } };
        return {
          title: name,
          parentTitle: '',
          status: 'Not started',
          priority: '',
          description: get(r, iDuration) ? 'Duration: ' + get(r, iDuration) : '',
          assignees: get(r, iResource) ? get(r, iResource).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [],
          healthState: '',
          client: 'Couch Heroes',
          hoursEstimated: 0,
          hoursSpent: 0,
          startDate: parseDate(startRaw),
          endDate: parseDate(endRaw),
          dueDate: parseDate(endRaw),
        };
      }).filter(Boolean);
    }

    case 'planner': {
      const iName = ciAny('task name', 'name');
      const iBucket = ci('bucket name');
      const iProgress = ci('progress');
      const iPriority = ci('priority');
      const iAssigned = ci('assigned to');
      const iStartDate = ci('start date');
      const iDueDate = ci('due date');
      const iLate = ci('late');
      const iDesc = ci('description');
      const iTaskId = ci('task id');
      const iLabels = ci('labels');
      return rows.map(r => {
        const name = get(r, iName);
        if (!name) return null;
        const progress = get(r, iProgress).toLowerCase();
        const status = progress === 'completed' ? 'Done' : progress === 'in progress' ? 'In progress' : 'Not started';
        const labels = get(r, iLabels).toLowerCase();
        let health = '';
        if (labels.includes('blocked')) health = 'Blocked';
        else if (get(r, iLate) === 'true') health = 'Red';
        else if (labels.includes('on hold') || labels.includes('review')) health = 'Yellow';
        return {
          title: name,
          parentTitle: get(r, iBucket),
          status,
          priority: normalisePriority(get(r, iPriority)),
          description: get(r, iDesc).replace(/_x000d_/g, ''),
          assignees: get(r, iAssigned) ? get(r, iAssigned).split(';').map(s => s.trim()).filter(Boolean) : [],
          healthState: health,
          client: '',
          hoursEstimated: 0,
          hoursSpent: 0,
          startDate: get(r, iStartDate),
          dueDate: get(r, iDueDate),
          plannerTaskId: get(r, iTaskId),
        };
      }).filter(Boolean);
    }

    default: {
      // Generic: try to find task/name/title column
      const iName = ciAny('task', 'task name', 'name', 'title', 'item', 'subject');
      const iStatus = ciAny('status', 'state', 'progress');
      const iAssigned = ciAny('assignee', 'assigned to', 'owner', 'resource');
      const iDesc = ciAny('description', 'details', 'notes');
      const iPriority = ciAny('priority', 'importance');
      const iDue = ciAny('due date', 'due', 'deadline', 'finish date', 'end date');
      return rows.map(r => {
        const name = get(r, iName);
        if (!name) return null;
        return {
          title: name,
          parentTitle: '',
          status: normaliseStatus(get(r, iStatus)),
          priority: normalisePriority(get(r, iPriority)),
          description: get(r, iDesc),
          assignees: get(r, iAssigned) ? get(r, iAssigned).split(/[,;]/).map(s => s.trim()).filter(Boolean) : [],
          healthState: '',
          client: '',
          hoursEstimated: 0,
          hoursSpent: 0,
          dueDate: get(r, iDue),
        };
      }).filter(Boolean);
    }
  }
}

// ==================== CONTRACT UPLOAD & TASK EXTRACTION ====================

// pdf-parse is loaded at the top as a core dependency (used for contract text extraction)

/**
 * POST /api/contract/extract
 * Upload a PDF or text file and extract deliverables, milestones, and tasks
 * using regex pattern matching. Returns the extracted items plus a raw text preview.
 * The uploaded file is deleted after processing.
 */
app.post('/api/contract/extract', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  let text = '';
  try {
    if (req.file.mimetype === 'application/pdf' && pdfParse) {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else {
      // Plain text or fallback
      text = fs.readFileSync(req.file.path, 'utf8');
    }
  } catch(e) {
    log('error', 'Import', 'Contract file parse failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    return res.status(500).json({ error: 'An internal error occurred' });
  }

  // Extract potential tasks, milestones, deliverables using regex heuristics
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  const extracted = [];
  const patterns = [
    /(?:deliverable|milestone|task|action|objective|requirement|phase)\s*[\d.:)\-]*\s*(.+)/i, // Labelled items
    /^\d+[.)]\s+(.+)/,                                    // Numbered lists (e.g. "1. ..." or "1) ...")
    /^[\u2022\u2023\u25CF\u25CB\-\*]\s+(.+)/,              // Bullet-pointed items (Unicode + ASCII bullets)
    /(?:shall|must|will)\s+(.{15,})/i,                     // Contractual obligation language
    /(?:due|deadline|by)\s+(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4})/i, // Date references
  ];

  lines.forEach((line, i) => {
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) {
        const title = (m[1] || line).substring(0, 120).trim();
        if (title.length > 10 && !extracted.find(e => e.title === title)) {
          // Try to find a date in the line
          const dateMatch = line.match(/(\d{1,2}[\s\/\-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s\/\-]\d{2,4})/i);
          extracted.push({
            title,
            type: line.match(/milestone/i) ? 'milestone' : line.match(/deliverable/i) ? 'deliverable' : 'task',
            dueDate: dateMatch ? dateMatch[1] : '',
            sourceLine: i + 1,
          });
        }
        break;
      }
    }
  });

  // Uploaded file is retained in uploads/ for project attachment

  res.json({
    filename: req.file.originalname,
    storedFilename: req.file.filename,  // For attaching to project after import
    totalLines: lines.length,
    extracted,
    rawPreview: text.substring(0, 2000),
  });
});

// ==================== TIME TRACKING ====================

/** GET /api/tasks/:id/time-entries — List time entries for a task, newest first */
app.get('/api/tasks/:id/time-entries', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const { rows } = await pool.query('SELECT * FROM time_entries WHERE task_id = $1 ORDER BY date DESC, created_at DESC', [req.params.id]);
  res.json(rows);
});

/** POST /api/tasks/:id/time-entries — Log time against a task. Also recalculates the task's hours_spent total. */
app.post('/api/tasks/:id/time-entries', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const { hours, description, date } = req.body;
  if (!hours || hours <= 0) return res.status(400).json({ error: 'hours required (> 0)' });
  const userName = req.user?.displayName || 'Unknown';
  const entryDate = date || new Date().toISOString().slice(0, 10);
  const { rows } = await pool.query(
    'INSERT INTO time_entries (task_id, user_name, description, hours, date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.params.id, userName, description || '', hours, entryDate]
  );
  // Recalculate the parent task's total hours from all time entries
  await pool.query('UPDATE tasks SET hours_spent = COALESCE((SELECT SUM(hours) FROM time_entries WHERE task_id = $1), 0), updated_at = NOW() WHERE id = $1', [req.params.id]);
  res.status(201).json(rows[0]);
});

/** DELETE /api/time-entries/:id — Delete a time entry and recalculate the parent task's hours (owner or admin) */
app.delete('/api/time-entries/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid time entry ID' });
  const { rows } = await pool.query('SELECT task_id, user_name FROM time_entries WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Time entry not found' });
  const isOwner = rows[0].user_name === (req.user?.displayName || req.user?.display_name || req.user?.username);
  if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Can only delete your own time entries' });
  await pool.query('DELETE FROM time_entries WHERE id = $1', [req.params.id]);
  if (rows.length > 0) {
    await pool.query('UPDATE tasks SET hours_spent = COALESCE((SELECT SUM(hours) FROM time_entries WHERE task_id = $1), 0), updated_at = NOW() WHERE id = $1', [rows[0].task_id]);
  }
  res.json({ ok: true });
});

/**
 * GET /api/time-entries/summary
 * Aggregate time entries grouped by user and client, with optional date range filter.
 * Used for utilisation reporting.
 */
app.get('/api/time-entries/summary', async (req, res) => {
  const { from, to } = req.query;
  let dateFilter = '';
  const params = [];
  if (from) { params.push(from); dateFilter += ` AND te.date >= $${params.length}`; }
  if (to) { params.push(to); dateFilter += ` AND te.date <= $${params.length}`; }
  const { rows } = await pool.query(`
    SELECT te.user_name, t.client_id, c.name as client_name,
           SUM(te.hours) as total_hours, COUNT(*) as entry_count
    FROM time_entries te
    JOIN tasks t ON te.task_id = t.id
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE 1=1 ${dateFilter}
    GROUP BY te.user_name, t.client_id, c.name
    ORDER BY te.user_name, c.name
  `, params);
  res.json(rows);
});

// ==================== NOTIFICATIONS ====================

/** GET /api/notifications — Fetch the latest 50 notifications for the current user, plus unread count */
app.get('/api/notifications', async (req, res) => {
  const username = req.user?.username || '';
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE username = $1 ORDER BY created_at DESC LIMIT 50', [username]
  );
  const unread = rows.filter(n => !n.is_read).length;
  res.json({ notifications: rows, unread });
});

/** POST /api/notifications — Create a notification (admin only) */
app.post('/api/notifications', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { username, type, title, message, link } = req.body;
  if (!username || !title) return res.status(400).json({ error: 'username and title required' });
  await createNotification(username, type || 'info', title, message || '', link || '');
  res.status(201).json({ ok: true });
});

/** POST /api/notifications/read — Mark specific notifications (by ids array) or all as read.
 *  Non-dismissable notifications (e.g. expense reminders) are skipped unless force=true. */
app.post('/api/notifications/read', async (req, res) => {
  const username = req.user?.username || '';
  const { ids, force } = req.body;
  const dismissFilter = force ? '' : ' AND (dismissable IS NULL OR dismissable = true)';
  if (ids && ids.length > 0) {
    await pool.query(`UPDATE notifications SET is_read = true WHERE id = ANY($1) AND username = $2${dismissFilter}`, [ids, username]);
  } else {
    // No ids provided — mark all dismissable as read
    await pool.query(`UPDATE notifications SET is_read = true WHERE username = $1${dismissFilter}`, [username]);
  }
  res.json({ ok: true });
});

/**
 * Insert a notification for a specific user.
 * Called internally by other endpoints (e.g. task assignment, status changes).
 * @param {string} username - Target user's username
 * @param {string} type - Notification category (e.g. 'assignment', 'status_change')
 * @param {string} title - Short summary
 * @param {string} [message] - Longer description
 * @param {string} [link] - URL to navigate to when the notification is clicked
 */
async function createNotification(username, type, title, message, link, dismissable = true) {
  await pool.query('INSERT INTO notifications (username, type, title, message, link, dismissable) VALUES ($1,$2,$3,$4,$5,$6)',
    [username, type, title, message || '', link || '', dismissable]);
}

/** POST /api/notifications/system — Send a system-wide notification to all active users (admin only) */
app.post('/api/notifications/system', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
  const { rows: users } = await pool.query('SELECT username FROM users WHERE is_active = true');
  for (const user of users) {
    await createNotification(user.username, 'system', title, message, null, false);
  }
  log('info', 'Notifications', `System message sent to ${users.length} users`, { title });
  res.json({ sent: users.length });
});

// ==================== TASK TEMPLATES ====================

/** GET /api/templates — List all saved task templates */
app.get('/api/templates', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM task_templates ORDER BY name');
  res.json(rows);
});

/** POST /api/templates — Save a new task template (template field is a JSON task tree) */
app.post('/api/templates', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, template, recurrence } = req.body;
  if (!name || !template) return res.status(400).json({ error: 'name and template required' });
  const { rows } = await pool.query(
    'INSERT INTO task_templates (name, template, recurrence, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, JSON.stringify(template), recurrence || '', req.user?.displayName || 'unknown']
  );
  res.status(201).json(rows[0]);
});

/**
 * POST /api/templates/:id/create
 * Instantiate a template — recursively creates tasks from the template's JSON tree.
 * Each node can have { title, status, priority, description, assignees, hoursEstimated, children }.
 */
app.post('/api/templates/:id/create', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { rows } = await pool.query('SELECT * FROM task_templates WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Template not found' });
  const tmpl = rows[0].template;
  const created = [];

  /**
   * Recursively insert a task node and its children from a template tree.
   * @param {Object} node - Template node with title, status, priority, children, etc.
   * @param {string|null} parentId - UUID of the parent task (null for root)
   */
  async function createFromTemplate(node, parentId) {
    const taskResult = await pool.query(
      `INSERT INTO tasks (title, parent_id, status, priority, description, assignees, hours_estimated, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'template') RETURNING id`,
      [node.title, parentId, node.status || 'Not started', node.priority || '', node.description || '', node.assignees || [], node.hoursEstimated || 0]
    );
    created.push({ id: taskResult.rows[0].id, title: node.title });
    if (node.children) {
      for (const child of node.children) {
        await createFromTemplate(child, taskResult.rows[0].id);
      }
    }
  }
  await createFromTemplate(tmpl, null);
  await pool.query('UPDATE task_templates SET last_created_at = NOW() WHERE id = $1', [req.params.id]);
  res.json({ ok: true, created });
});

/** DELETE /api/templates/:id — Remove a saved template (admin only) */
app.delete('/api/templates/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  await pool.query('DELETE FROM task_templates WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ==================== TASK ATTACHMENTS ====================

/** GET /api/tasks/:id/attachments — List file attachments for a task */
app.get('/api/tasks/:id/attachments', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const { rows } = await pool.query('SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY created_at DESC', [req.params.id]);
  res.json(rows);
});

/** POST /api/tasks/:id/attachments — Upload a file attachment to a task (max 25MB) */
app.post('/api/tasks/:id/attachments', upload.single('file'), async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const author = req.user?.displayName || 'unknown';
  const { rows } = await pool.query(
    'INSERT INTO task_attachments (task_id, filename, original_name, size_bytes, mime_type, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.params.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, author]
  );
  await auditLog('attachment', rows[0].id, 'create', author, { task_id: req.params.id, filename: req.file.originalname });
  res.status(201).json(rows[0]);
});

/** GET /api/attachments/:filename — Serve an uploaded file. Path traversal is prevented. */
app.get('/api/attachments/:filename', (req, res) => {
  const filePath = path.resolve(uploadDir, req.params.filename);
  // Security: resolved path must stay within the uploads directory
  if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  // Security: force download for non-image, non-PDF files to prevent XSS via uploaded HTML/SVG
  const ext = path.extname(filePath).toLowerCase();
  const safeInline = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (!safeInline.includes(ext)) {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
});

/** DELETE /api/tasks/:id/attachments/:attachmentId — Remove an attachment and delete the file from disk */
app.delete('/api/tasks/:id/attachments/:attachmentId', async (req, res) => {
  const { rows } = await pool.query('SELECT filename FROM task_attachments WHERE id = $1 AND task_id = $2', [req.params.attachmentId, req.params.id]);
  if (rows.length > 0) {
    const filePath = path.join(uploadDir, rows[0].filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await pool.query('DELETE FROM task_attachments WHERE id = $1', [req.params.attachmentId]);
  }
  res.json({ ok: true });
});

// ==================== UNIVERSAL ATTACHMENTS ====================
// Generic file attachments for any entity type (client, project, task)

const VALID_ENTITY_TYPES = ['client', 'project', 'task', 'lead', 'expense'];

/** GET /api/attachments/verify-matches — List all auto-matched email attachments needing verification */
app.get('/api/attachments/verify-matches', requireInternal, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT a.id, a.entity_type, a.entity_id, a.original_name, a.uploaded_by, a.created_at,
           CASE WHEN a.entity_type = 'task' THEN (SELECT title FROM tasks WHERE id = a.entity_id)
                WHEN a.entity_type = 'client' THEN (SELECT name FROM clients WHERE id = a.entity_id)
                ELSE NULL END as entity_name
    FROM attachments a
    WHERE a.uploaded_by LIKE '%verify match%'
    ORDER BY a.created_at DESC
    LIMIT 50
  `);
  res.json(rows);
});

/** GET /api/attachments/entity/:type/:id — List all attachments for an entity */
app.get('/api/attachments/entity/:type/:id', async (req, res) => {
  if (!VALID_ENTITY_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Invalid entity type' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid entity ID' });
  const { rows } = await pool.query(
    'SELECT * FROM attachments WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
    [req.params.type, req.params.id]
  );
  res.json(rows);
});

/** POST /api/attachments/entity/:type/:id — Upload a file attachment to an entity */
app.post('/api/attachments/entity/:type/:id', upload.single('file'), async (req, res) => {
  if (!VALID_ENTITY_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Invalid entity type' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid entity ID' });
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const { rows } = await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.type, req.params.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.user?.displayName || 'unknown']
  );
  res.status(201).json(rows[0]);
});

/** GET /api/attachments/download/:filename — Download an attachment file (with path traversal protection) */
app.get('/api/attachments/download/:filename', (req, res) => {
  const filePath = path.resolve(uploadDir, req.params.filename);
  if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) return res.status(403).json({ error: 'Forbidden' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

/** PATCH /api/attachments/:id/confirm — Confirm an auto-matched email attachment (remove verify flag) */
app.patch('/api/attachments/:id/confirm', requireInternal, async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE attachments SET uploaded_by = REPLACE(uploaded_by, ' - verify match', '') WHERE id = $1 RETURNING *",
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
  res.json(rows[0]);
});

/** PATCH /api/attachments/:id/reassign — Move an attachment to a different entity */
app.patch('/api/attachments/:id/reassign', requireInternal, async (req, res) => {
  const { entityType, entityId } = req.body;
  if (!['client', 'project', 'task', 'lead'].includes(entityType)) return res.status(400).json({ error: 'Invalid entity type' });
  if (!isValidUuid(entityId)) return res.status(400).json({ error: 'Invalid entity ID' });
  const { rows } = await pool.query(
    "UPDATE attachments SET entity_type = $1, entity_id = $2, uploaded_by = REPLACE(uploaded_by, ' - verify match', '') WHERE id = $3 RETURNING *",
    [entityType, entityId, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
  res.json(rows[0]);
});

/** DELETE /api/attachments/:id — Remove an attachment record. For file attachments the file on disk is also removed; link attachments simply delete the row. Admin or the uploader only. */
app.delete('/api/attachments/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid attachment ID' });
  const { rows } = await pool.query('SELECT filename, link_url, uploaded_by FROM attachments WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
  const row = rows[0];
  // Admin or the original uploader only
  const isAdmin = req.user.role === 'admin';
  const isUploader = row.uploaded_by && row.uploaded_by === req.user.displayName;
  if (!isAdmin && !isUploader) {
    return res.status(403).json({ error: 'Only the uploader or an admin can delete this attachment' });
  }
  // Only attempt to delete a file if this is a file attachment (no link_url, has filename)
  if (!row.link_url && row.filename) {
    const filePath = path.resolve(uploadDir, row.filename);
    if (filePath.startsWith(path.resolve(uploadDir) + path.sep) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await pool.query('DELETE FROM attachments WHERE id = $1', [req.params.id]);
  await auditLog('attachment', req.params.id, 'delete', req.user?.displayName);
  res.json({ ok: true });
});

/**
 * POST /api/attachments/entity/:type/:id/link
 * Attach a link (URL) to any entity instead of a file. Used for Sharepoint or
 * any other external resource. Body: { url: string, title?: string }.
 */
app.post('/api/attachments/entity/:type/:id/link', async (req, res) => {
  if (!VALID_ENTITY_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Invalid entity type' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid entity ID' });
  const { url, title } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });
  // Basic URL validation — must be http/https
  let parsed;
  try { parsed = new URL(url.trim()); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'URL must use http or https' });
  }
  const linkUrl = parsed.toString();
  const linkTitle = (title && typeof title === 'string') ? title.trim().slice(0, 255) : null;
  const { rows } = await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by, link_url, link_title)
     VALUES ($1,$2,NULL,NULL,NULL,'link',$3,$4,$5) RETURNING *`,
    [req.params.type, req.params.id, req.user?.displayName || 'unknown', linkUrl, linkTitle]
  );
  await auditLog('attachment', rows[0].id, 'create_link', req.user?.displayName, { entity_type: req.params.type, entity_id: req.params.id, url: linkUrl });
  res.status(201).json(rows[0]);
});

/**
 * POST /api/tasks/:id/attachments/link
 * Convenience alias for adding a link attachment to a task. Mirrors the
 * universal endpoint above so the task detail panel does not need to know the
 * generic /entity/task/:id form.
 */
app.post('/api/tasks/:id/attachments/link', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const { url, title } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });
  let parsed;
  try { parsed = new URL(url.trim()); } catch (e) { return res.status(400).json({ error: 'Invalid URL' }); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'URL must use http or https' });
  }
  const linkUrl = parsed.toString();
  const linkTitle = (title && typeof title === 'string') ? title.trim().slice(0, 255) : null;
  const { rows } = await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by, link_url, link_title)
     VALUES ('task',$1,NULL,NULL,NULL,'link',$2,$3,$4) RETURNING *`,
    [req.params.id, req.user?.displayName || 'unknown', linkUrl, linkTitle]
  );
  await auditLog('attachment', rows[0].id, 'create_link', req.user?.displayName, { task_id: req.params.id, url: linkUrl });
  res.status(201).json(rows[0]);
});

// ==================== CALENDAR EVENTS ====================
// Personal/team/business calendar events that show up in the calendar view
// alongside tasks. Visibility model:
//   private  — only the owner (and admin)
//   team     — everyone in the team
//   client   — team plus anyone whose assigned tasks share the event's client
//   public   — everyone
// Event types: vacation, sick_leave, bank_holiday, uto, business, other.

// firm_closed (2026-04-15, Glen): admin-only event type representing an
// NBI-wide closure (Christmas shutdown, offsite, etc.). Distinct from
// bank_holiday which is UK statutory. Enforced as admin-only in POST /PATCH.
const VALID_EVENT_TYPES = ['vacation', 'sick_leave', 'bank_holiday', 'firm_closed', 'uto', 'business', 'other'];
const ADMIN_ONLY_EVENT_TYPES = ['firm_closed'];
const VALID_EVENT_VISIBILITY = ['private', 'team', 'client', 'public'];

/**
 * Build the WHERE clause (and params) that enforces visibility for the
 * current user. Admins see everything. Regular users see:
 *   - their own events, regardless of visibility
 *   - any event marked team or public
 *   - any client-scoped event whose client_id matches a client the user is
 *     assigned to via at least one task (assignees array contains displayName)
 */
async function buildCalendarVisibilityClause(req, startParamIdx) {
  if (req.user?.role === 'admin') return { clause: 'TRUE', params: [], nextIdx: startParamIdx };
  // Resolve the user's assigned clients via tasks.assignees.
  // Failure is logged (code review M9) but tolerated — a DB hiccup here should degrade
  // to "no client matches" rather than bring the calendar view down.
  let assignedClientIds = [];
  let memberTeamIds = [];
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT client_id FROM tasks WHERE $1 = ANY(assignees) AND client_id IS NOT NULL`,
      [req.user?.displayName || '']
    );
    assignedClientIds = rows.map(r => r.client_id);
  } catch (e) {
    log('warn', 'Calendar', 'Failed to resolve assigned clients for visibility; falling back to owner/team/public only', {
      error: e.message,
      user: req.user?.displayName
    });
  }
  // Resolve teams this user belongs to — needed so team events (user_id is
  // null, team_id set) are visible to every member of that team.
  try {
    const { rows } = await pool.query(
      `SELECT team_id FROM team_members WHERE user_id = $1`,
      [req.user?.id || null]
    );
    memberTeamIds = rows.map(r => r.team_id);
  } catch (e) {
    log('warn', 'Calendar', 'Failed to resolve team memberships for visibility', { error: e.message });
  }

  const params = [];
  let i = startParamIdx;
  // Owner clause
  params.push(req.user?.id || null);
  const ownerIdx = i++;
  // Visibility list — applies only to events WITHOUT a team_id. An event
  // that's tagged to a team is only visible to that team's members, even
  // if visibility is 'team' or 'public'. This matches the user-mental
  // model: tagging an event to a team means "this is team-private".
  params.push(['team', 'public']);
  const visListIdx = i++;
  let clause = `(user_id = $${ownerIdx} OR (team_id IS NULL AND visibility = ANY($${visListIdx}::text[]))`;
  if (assignedClientIds.length > 0) {
    params.push(assignedClientIds);
    const clientListIdx = i++;
    clause += ` OR (visibility = 'client' AND client_id = ANY($${clientListIdx}::uuid[]))`;
  }
  if (memberTeamIds.length > 0) {
    params.push(memberTeamIds);
    const teamListIdx = i++;
    clause += ` OR team_id = ANY($${teamListIdx}::uuid[])`;
  }
  clause += ')';
  return { clause, params, nextIdx: i };
}

/** GET /api/calendar-events?from=YYYY-MM-DD&to=YYYY-MM-DD&user_id=&client_id= — List events with visibility enforcement */
app.get('/api/calendar-events', async (req, res) => {
  const { from, to } = req.query;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !dateRe.test(from) || !dateRe.test(to)) {
    return res.status(400).json({ error: 'from and to (YYYY-MM-DD) are required' });
  }
  try {
    // Date range overlap: an event overlaps [from, to] when
    //   start_date <= to AND COALESCE(end_date, start_date) >= from
    const params = [from, to];
    let i = 3;
    let where = `(ce.start_date <= $2::date AND COALESCE(ce.end_date, ce.start_date) >= $1::date)`;

    if (req.query.user_id) {
      if (!isValidUuid(req.query.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
      params.push(req.query.user_id);
      where += ` AND ce.user_id = $${i++}`;
    }
    if (req.query.client_id) {
      if (!isValidUuid(req.query.client_id)) return res.status(400).json({ error: 'Invalid client_id' });
      params.push(req.query.client_id);
      where += ` AND ce.client_id = $${i++}`;
    }
    // team_id filter — return all events from any user in the given team.
    // The team filter takes precedence over user_id when both are supplied.
    if (req.query.team_id) {
      if (!isValidUuid(req.query.team_id)) return res.status(400).json({ error: 'Invalid team_id' });
      // Resolve the team's member user ids first
      try {
        const memberRows = await pool.query(
          'SELECT user_id FROM team_members WHERE team_id = $1',
          [req.query.team_id]
        );
        const memberIds = memberRows.rows.map(r => r.user_id);
        if (memberIds.length === 0) {
          // Team has no members — return an empty list rather than running ANY([]) which is awkward
          return res.json([]);
        }
        params.push(memberIds);
        where += ` AND ce.user_id = ANY($${i++}::uuid[])`;
      } catch (e) {
        log('error', 'Calendar', 'Failed to resolve team members for filter', { error: e.message });
        return res.status(500).json({ error: 'An internal error occurred' });
      }
    }

    const vis = await buildCalendarVisibilityClause(req, i);
    const sql = `
      SELECT ce.*, u.display_name AS user_display_name, c.name AS client_name, t.name AS team_name
      FROM calendar_events ce
      LEFT JOIN users u ON u.id = ce.user_id
      LEFT JOIN clients c ON c.id = ce.client_id
      LEFT JOIN teams t ON t.id = ce.team_id
      WHERE ${where} AND ${vis.clause}
      ORDER BY ce.start_date ASC, ce.created_at ASC
    `;
    const { rows } = await pool.query(sql, [...params, ...vis.params]);
    res.json(rows);
  } catch (e) {
    log('error', 'Calendar', 'Failed to list calendar events', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** GET /api/calendar-events/:id — Fetch one event, respecting visibility */
app.get('/api/calendar-events/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid event ID' });
  try {
    const vis = await buildCalendarVisibilityClause(req, 2);
    const { rows } = await pool.query(
      `SELECT ce.*, u.display_name AS user_display_name, c.name AS client_name, t.name AS team_name
       FROM calendar_events ce
       LEFT JOIN users u ON u.id = ce.user_id
       LEFT JOIN clients c ON c.id = ce.client_id
       LEFT JOIN teams t ON t.id = ce.team_id
       WHERE ce.id = $1 AND ${vis.clause}`,
      [req.params.id, ...vis.params]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (e) {
    log('error', 'Calendar', 'Failed to fetch calendar event', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** POST /api/calendar-events — Create a new event. Regular users create for themselves;
 *  admins may target any user. If team_id is provided the event is a team event —
 *  user_id becomes null and the event applies to all members of that team.
 *  Non-admins can only create team events for teams they are a member of. */
app.post('/api/calendar-events', async (req, res) => {
  const { title, event_type, start_date, end_date, client_id, visibility, description, team_id } = req.body || {};
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title is required' });
  if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) return res.status(400).json({ error: 'Invalid event_type' });
  if (ADMIN_ONLY_EVENT_TYPES.includes(event_type) && req.user?.role !== 'admin') {
    return res.status(403).json({ error: `Only admins can create ${event_type} events` });
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!start_date || !dateRe.test(start_date)) return res.status(400).json({ error: 'start_date (YYYY-MM-DD) is required' });
  if (end_date && !dateRe.test(end_date)) return res.status(400).json({ error: 'Invalid end_date' });
  if (end_date && end_date < start_date) return res.status(400).json({ error: 'end_date must be on or after start_date' });
  const vis = visibility && VALID_EVENT_VISIBILITY.includes(visibility) ? visibility : 'team';
  if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
  if (team_id && !isValidUuid(team_id)) return res.status(400).json({ error: 'Invalid team_id' });

  // Team event path — user_id is null, team_id points to the target team
  let userId = req.user?.id;
  let teamId = null;
  if (team_id) {
    teamId = team_id;
    const { rows: teamRows } = await pool.query('SELECT id FROM teams WHERE id = $1', [team_id]);
    if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });
    if (req.user?.role !== 'admin') {
      const { rows: membership } = await pool.query(
        'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
        [team_id, req.user?.id]
      );
      if (membership.length === 0) return res.status(403).json({ error: 'Only team members or admins can create team events' });
    }
    userId = null; // team event — not tied to a single user
  } else if (req.body?.user_id && req.body.user_id !== userId) {
    // Admin creating for another specific user
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Only admin can create events for other users' });
    if (!isValidUuid(req.body.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
    userId = req.body.user_id;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO calendar_events (user_id, team_id, title, event_type, start_date, end_date, client_id, visibility, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [userId, teamId, title.trim().slice(0, 255), event_type, start_date, end_date || null, client_id || null, vis, description || null]
    );
    await auditLog('calendar_event', rows[0].id, 'create', req.user?.displayName, { title, event_type, team_id: teamId });
    res.status(201).json(rows[0]);
  } catch (e) {
    log('error', 'Calendar', 'Failed to create calendar event', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** PATCH /api/calendar-events/:id — Update an event. Owner or admin only. */
app.patch('/api/calendar-events/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid event ID' });
  const { rows: existing } = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [req.params.id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Event not found' });
  const ev = existing[0];
  if (req.user?.role !== 'admin' && ev.user_id !== req.user?.id) {
    return res.status(403).json({ error: 'Only the owner or an admin can edit this event' });
  }

  const allowed = ['title', 'event_type', 'start_date', 'end_date', 'client_id', 'visibility', 'description', 'team_id'];
  const updates = [];
  const params = [];
  let i = 1;
  for (const k of allowed) {
    if (k in req.body) {
      if (k === 'event_type' && req.body[k] && !VALID_EVENT_TYPES.includes(req.body[k])) return res.status(400).json({ error: 'Invalid event_type' });
      if (k === 'event_type' && ADMIN_ONLY_EVENT_TYPES.includes(req.body[k]) && req.user?.role !== 'admin') {
        return res.status(403).json({ error: `Only admins can set event_type to ${req.body[k]}` });
      }
      if (k === 'visibility' && req.body[k] && !VALID_EVENT_VISIBILITY.includes(req.body[k])) return res.status(400).json({ error: 'Invalid visibility' });
      if ((k === 'start_date' || k === 'end_date') && req.body[k] && !/^\d{4}-\d{2}-\d{2}$/.test(req.body[k])) return res.status(400).json({ error: `Invalid ${k}` });
      if (k === 'client_id' && req.body[k] && !isValidUuid(req.body[k])) return res.status(400).json({ error: 'Invalid client_id' });
      if (k === 'team_id' && req.body[k] && !isValidUuid(req.body[k])) return res.status(400).json({ error: 'Invalid team_id' });
      updates.push(`${k} = $${i++}`);
      params.push(req.body[k] === '' ? null : req.body[k]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  updates.push(`updated_at = NOW()`);
  params.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE calendar_events SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    await auditLog('calendar_event', req.params.id, 'update', req.user?.displayName, req.body);
    res.json(rows[0]);
  } catch (e) {
    log('error', 'Calendar', 'Failed to update calendar event', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** DELETE /api/calendar-events/:id — Delete an event. Owner or admin only. Returns 404 on missing. */
app.delete('/api/calendar-events/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid event ID' });
  const { rows: existing } = await pool.query('SELECT user_id FROM calendar_events WHERE id = $1', [req.params.id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Event not found' });
  if (req.user?.role !== 'admin' && existing[0].user_id !== req.user?.id) {
    return res.status(403).json({ error: 'Only the owner or an admin can delete this event' });
  }
  await pool.query('DELETE FROM calendar_events WHERE id = $1', [req.params.id]);
  await auditLog('calendar_event', req.params.id, 'delete', req.user?.displayName);
  res.json({ ok: true });
});

// ==================== FINANCE DATA ====================

/** GET /api/finance — Return the latest version of the finance data JSON blob with version for conflict detection */
app.get('/api/finance', requireInternal, async (req, res) => {
  const { rows } = await pool.query('SELECT id, data, updated_by, updated_at FROM finance_data ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) return res.json({ data: null, version: 0 });
  res.json({ data: rows[0].data, updatedBy: rows[0].updated_by, updatedAt: rows[0].updated_at, version: rows[0].id });
});

/** PUT /api/finance — Save finance data as a new versioned row (append-only for history).
 *  Admin-only: finance data modifications require admin privileges.
 *  Supports optimistic concurrency: pass expectedVersion (the id from GET) to detect conflicts.
 *  If another user saved between your read and write, returns 409 Conflict. */
app.put('/api/finance', requireInternal, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { data, expectedVersion } = req.body;
  if (!data) return res.status(400).json({ error: 'data required' });

  // Data integrity check: reject saves missing critical arrays (prevents corruption from partial saves)
  const requiredArrays = ['revenue', 'payroll'];
  const missing = requiredArrays.filter(k => !Array.isArray(data[k]));
  if (missing.length > 0) {
    log('warn', 'Finance', `BLOCKED corrupt save from ${req.user?.displayName}`, { missing: missing.join(', '), keysSent: Object.keys(data).join(', ') });
    return res.status(400).json({ error: `Finance data integrity check failed: missing ${missing.join(', ')}. This save was blocked to prevent data loss.` });
  }

  // Optimistic concurrency check
  if (expectedVersion !== undefined) {
    const { rows: latest } = await pool.query('SELECT id, updated_by, updated_at FROM finance_data ORDER BY id DESC LIMIT 1');
    if (latest.length > 0 && latest[0].id !== expectedVersion) {
      syncConflicts?.inc();
      return res.status(409).json({
        error: 'Conflict: finance data was updated by another user. Please reload and try again.',
        currentVersion: latest[0].id,
        updatedBy: latest[0].updated_by,
        updatedAt: latest[0].updated_at
      });
    }
  }

  const updatedBy = req.user?.displayName || 'unknown';
  const { rows: inserted } = await pool.query('INSERT INTO finance_data (data, updated_by) VALUES ($1, $2) RETURNING id', [JSON.stringify(data), updatedBy]);
  await auditLog('finance', 'finance_data', 'update', updatedBy, { sections: Object.keys(data) });
  res.json({ ok: true, version: inserted[0].id });
});

// ==================== CLIENTS ====================

/** GET /api/clients — List all clients with their task count (used for client selector and CRM list) */
app.get('/api/clients', async (req, res) => {
  const scopes = await getClientScopes(req);
  if (scopes) {
    const { rows } = await pool.query(
      'SELECT c.*, (SELECT count(*) FROM tasks t WHERE t.client_id = c.id)::int as task_count FROM clients c WHERE c.id = ANY($1) ORDER BY c.name',
      [scopes]
    );
    return res.json(rows);
  }
  const { rows } = await pool.query(`
    SELECT c.*,
      (SELECT count(*) FROM tasks t WHERE t.client_id = c.id) as task_count
    FROM clients c ORDER BY c.name
  `);
  res.json(rows);
});

/** GET /api/clients/:id — Get a single client with its contacts (single query) */
app.get('/api/clients/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
  const { rows } = await pool.query(`
    SELECT c.*,
      COALESCE(
        (SELECT json_agg(row_to_json(ct.*) ORDER BY ct.sort_order)
         FROM contacts ct WHERE ct.client_id = c.id),
        '[]'::json
      ) AS contacts
    FROM clients c WHERE c.id = $1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

/** POST /api/clients — Create a new client record */
app.post('/api/clients', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, description, founded, headquarters, employees, revenue, website, linkedin_company, nbi_relationship, sector, studio_size, contract_value, current_studio_project, abbreviation, practice_area } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const lenErr = validateLength(name, 'name');
  if (lenErr) return res.status(400).json({ error: lenErr });
  // G2 / decision D84: practice_area is MANDATORY and must be one of the
  // two valid slugs. "general" is rejected going forward. The second slug
  // was renamed from organisational_health → organisational_performance
  // in migration 025 per Glen's decision to reframe as Performance.
  const VALID_PRACTICES = ['gaming', 'organisational_performance'];
  if (!practice_area || !VALID_PRACTICES.includes(practice_area)) {
    return res.status(400).json({ error: `practice_area is required and must be one of: ${VALID_PRACTICES.join(', ')}` });
  }
  // Abbreviation must be 1-6 uppercase alphanumeric characters if provided
  const abbr = abbreviation ? String(abbreviation).trim().toUpperCase() : null;
  if (abbr && !/^[A-Z0-9]{1,6}$/.test(abbr)) {
    return res.status(400).json({ error: 'Abbreviation must be 1-6 letters or digits' });
  }
  const { rows } = await pool.query(
    `INSERT INTO clients (name, description, founded, headquarters, employees, revenue, website, linkedin_company, nbi_relationship, sector, studio_size, contract_value, current_studio_project, abbreviation, practice_area)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [name, description || '', founded || '', headquarters || '', employees || '', revenue || '', website || '', linkedin_company || '', nbi_relationship || '', sector || null, studio_size != null ? parseInt(studio_size, 10) || null : null, contract_value != null ? parseFloat(contract_value) || null : null, current_studio_project || null, abbr, practice_area]
  );
  res.status(201).json(rows[0]);
});

/** PATCH /api/clients/:id — Update client fields */
app.patch('/api/clients/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  // Normalise the abbreviation to uppercase and validate shape before building the patch
  if (req.body.abbreviation !== undefined) {
    if (req.body.abbreviation === '' || req.body.abbreviation === null) {
      req.body.abbreviation = null;
    } else {
      const abbr = String(req.body.abbreviation).trim().toUpperCase();
      if (!/^[A-Z0-9]{1,6}$/.test(abbr)) {
        return res.status(400).json({ error: 'Abbreviation must be 1-6 letters or digits' });
      }
      req.body.abbreviation = abbr;
    }
  }
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['name', 'description', 'founded', 'headquarters', 'employees', 'revenue', 'website', 'linkedin_company', 'nbi_relationship', 'sector', 'studio_size', 'contract_value', 'current_studio_project', 'practice_area', 'abbreviation']);
  if (req.body.name !== undefined && !req.body.name.trim()) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  updates.push(`updated_at = NOW()`);
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE clients SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

/**
 * POST /api/clients/:id/research — Trigger client portfolio research.
 *
 * v1 placeholder: there is no real search-API integration yet, so this returns
 * an empty `fields` set and a `note` explaining the situation. The endpoint
 * still records the attempt by writing the structured result to
 * clients.research_data and bumping research_updated_at, so the audit trail
 * and the "Last researched" UI work end-to-end. NEVER populate fields the
 * system cannot verify — empty is always safer than wrong.
 *
 * When a real research backend is wired in, only fields with high-confidence
 * verification should appear in `fields`; everything else stays in
 * `unverified` for human review. The DB write and response shape stay stable.
 *
 * Admin only.
 */
app.post('/api/clients/:id/research', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
  const { rows: clientRows } = await pool.query('SELECT id, name, website FROM clients WHERE id = $1', [req.params.id]);
  if (clientRows.length === 0) return res.status(404).json({ error: 'Client not found' });
  const client = clientRows[0];

  // v1 stub: no real research integration yet. Return zero verified fields so
  // the frontend never receives hallucinated data.
  const result = {
    researched: true,
    fields: {},
    unverified: [],
    note: 'Research pipeline not yet integrated with search API. No fields populated. This is a v1 placeholder that keeps the API stable for frontend integration.',
    inputs: { name: client.name, website: client.website || null },
    ranAt: new Date().toISOString(),
    ranBy: req.user?.displayName || 'unknown'
  };

  // Persist the structured result for audit/history. We store the full result
  // (including the note and timestamps) so future iterations can diff against it.
  try {
    await pool.query(
      'UPDATE clients SET research_data = $1, research_updated_at = NOW(), updated_at = NOW() WHERE id = $2',
      [JSON.stringify(result), req.params.id]
    );
    await auditLog('client', req.params.id, 'research', req.user?.displayName || 'unknown', { fieldsCount: Object.keys(result.fields).length, placeholder: true });
  } catch (e) {
    log('error', 'ClientResearch', 'Failed to persist research result', { error: e.message, clientId: req.params.id });
    // Still return the result so the frontend can show the placeholder note
  }

  res.json(result);
});

/** DELETE /api/clients/:id — Remove a client (admin only, cascades to tasks) */
app.delete('/api/clients/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  // Unlink tasks from this client before deleting
  await pool.query('UPDATE tasks SET client_id = NULL, updated_at = NOW() WHERE client_id = $1', [req.params.id]);
  await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ==================== SOWs ====================
//
// Statements of Work sit between Client and Project (task) in the hierarchy.
// CRITICAL SECURITY MODEL:
//  - Original SoW PDF is NEVER written to disk. Multer holds the upload in
//    memory only, the extractor filters out pricing & legal content, and the
//    buffer is dropped immediately after extraction.
//  - Only the filtered work_package_text is persisted in the DB.
//  - All authenticated users may READ work-package text; only admins may
//    create, upload, update, or delete SoWs.

const { extractWorkPackage } = require('./lib/sow-extractor');

/** Memory-only multer instance for SoW uploads — buffer never touches disk */
const sowUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are accepted for SoW upload'));
  }
});

/**
 * GET /api/sows — List SoWs.
 * Optional ?client_id=<uuid> filter. Returns metadata only — work_package_text
 * is intentionally excluded from list responses to keep payloads small.
 * Includes a project (task) count subquery.
 */
app.get('/api/sows', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { client_id } = req.query;
  let where = '';
  let vals = [];
  if (client_id) {
    if (!isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    where = 'WHERE s.client_id = $1';
    vals = [client_id];
  }
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.client_id, s.title, s.start_date, s.end_date, s.status,
             s.created_at, s.updated_at, s.uploaded_by, s.extraction_stats,
             (SELECT COUNT(*)::int FROM tasks WHERE sow_id = s.id) AS task_count,
             c.name AS client_name
      FROM sows s LEFT JOIN clients c ON s.client_id = c.id
      ${where}
      ORDER BY c.name, s.created_at DESC
    `, vals);
    res.json(rows);
  } catch (e) {
    log('error', 'SoW', 'Failed to list SoWs', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** GET /api/sows/:id — Single SoW including the full filtered work_package_text */
app.get('/api/sows/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid SoW ID' });
  try {
    const { rows } = await pool.query(`
      SELECT s.*, c.name AS client_name
      FROM sows s LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    log('error', 'SoW', 'Failed to fetch SoW', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/**
 * POST /api/sows — Create a SoW manually (no file upload).
 * Used for placeholder SoWs the user wants to populate later via PATCH.
 * Admin only.
 */
app.post('/api/sows', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { client_id, title, start_date, end_date, status } = req.body || {};
  if (!client_id || !isValidUuid(client_id)) return res.status(400).json({ error: 'Valid client_id required' });
  if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
  const lenErr = validateLength(title, 'title');
  if (lenErr) return res.status(400).json({ error: lenErr });
  try {
    const { rows } = await pool.query(
      `INSERT INTO sows (client_id, title, start_date, end_date, status, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [client_id, title.trim(), start_date || null, end_date || null, status || 'active', req.user.displayName || 'unknown']
    );
    await auditLog('sow', rows[0].id, 'create', req.user.displayName, { client_id, title: title.trim() });
    res.status(201).json(rows[0]);
  } catch (e) {
    log('error', 'SoW', 'Failed to create SoW', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/**
 * POST /api/sows/upload — Upload a SoW PDF, extract & filter, persist text only.
 *
 * The uploaded buffer lives ONLY in memory and is explicitly nulled after
 * extraction. The original file is never written to disk. The extractor strips
 * all pricing and legal content before any data is persisted.
 *
 * Multipart fields:
 *   file       — PDF (required, max 10 MB)
 *   client_id  — UUID of client (required)
 *   title      — Title for the SoW (required)
 *
 * Admin only.
 */
app.post('/api/sows/upload', (req, res, next) => {
  // Wrap multer to surface fileFilter / size errors as JSON
  sowUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    next();
  });
}, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'Only PDF files are accepted' });
  }
  const { client_id, title } = req.body || {};
  if (!client_id || !isValidUuid(client_id)) {
    return res.status(400).json({ error: 'Valid client_id required' });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title required' });
  }
  const lenErr = validateLength(title, 'title');
  if (lenErr) return res.status(400).json({ error: lenErr });

  let extracted;
  try {
    extracted = await extractWorkPackage(req.file.buffer);
  } catch (e) {
    log('error', 'SoW', 'Extraction failed', { error: e.message, client_id, title: title.trim() });
    return res.status(400).json({ error: 'Failed to parse PDF: ' + e.message });
  } finally {
    // Drop the buffer immediately — never keep the original file in memory
    if (req.file) req.file.buffer = null;
  }

  if (!extracted || !extracted.text || !extracted.text.trim()) {
    // Surface filter stats so the user can tell *why* the PDF was rejected (code review M8).
    // extraction_stats include filteredParagraphs, keptParagraphs, and filteredReasons[].
    const stats = (extracted && extracted.stats) || {};
    const reasons = Array.isArray(stats.filteredReasons) ? stats.filteredReasons : [];
    const filteredCount = Number(stats.filteredParagraphs || 0);
    const keptCount = Number(stats.keptParagraphs || 0);
    let hint;
    if (filteredCount > 0 && keptCount === 0) {
      hint = `All ${filteredCount} paragraph${filteredCount === 1 ? '' : 's'} were filtered out by the pricing/legal filter. If this PDF only contains pricing or legal content, upload a scope-only variant.`;
    } else if (filteredCount === 0 && keptCount === 0) {
      hint = 'The PDF parsed but contained no extractable text. It may be a scanned image — try exporting to text first.';
    } else {
      hint = 'No work package content was recognised.';
    }
    return res.status(400).json({
      error: 'Could not extract any work package content',
      hint,
      stats: { filteredParagraphs: filteredCount, keptParagraphs: keptCount, reasons: reasons.slice(0, 10) }
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO sows (client_id, title, work_package_text, extraction_stats, uploaded_by, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, client_id, title, start_date, end_date, status, created_at, updated_at, uploaded_by, extraction_stats`,
      [client_id, title.trim(), extracted.text, JSON.stringify(extracted.stats || {}), req.user.displayName || 'unknown']
    );
    const created = rows[0];
    await auditLog('sow', created.id, 'upload', req.user.displayName, {
      client_id,
      title: title.trim(),
      stats: extracted.stats || {}
    });
    // Return without work_package_text (client fetches via GET /api/sows/:id)
    res.status(201).json({ ...created, extraction_stats: extracted.stats || {} });
  } catch (e) {
    // Include client_id and title in logs so failures are diagnosable (code review H5)
    log('error', 'SoW', 'Failed to insert SoW', {
      error: e.message,
      client_id,
      title: title.trim(),
      uploader: req.user.displayName
    });
    res.status(500).json({ error: 'An internal error occurred saving the SoW' });
  }
});

/**
 * PATCH /api/sows/:id — Update SoW metadata.
 * work_package_text is intentionally NOT updatable via PATCH — it is locked
 * after upload to prevent tampering with the filtered content. Admin only.
 */
app.patch('/api/sows/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid SoW ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['title', 'start_date', 'end_date', 'status']);
  if (req.body.title !== undefined && !String(req.body.title).trim()) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  updates.push('updated_at = NOW()');
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE sows SET ${updates.join(', ')} WHERE id = $${nextIdx}
       RETURNING id, client_id, title, start_date, end_date, status, created_at, updated_at, uploaded_by, extraction_stats`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await auditLog('sow', req.params.id, 'update', req.user.displayName, { fields: Object.keys(req.body) });
    res.json(rows[0]);
  } catch (e) {
    log('error', 'SoW', 'Failed to update SoW', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/**
 * DELETE /api/sows/:id — Remove a SoW.
 * Tasks linked via sow_id are unlinked automatically (ON DELETE SET NULL).
 * Admin only.
 */
app.delete('/api/sows/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid SoW ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { rowCount } = await pool.query('DELETE FROM sows WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    await auditLog('sow', req.params.id, 'delete', req.user.displayName);
    res.json({ ok: true });
  } catch (e) {
    log('error', 'SoW', 'Failed to delete SoW', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== TEAMS ====================
//
// Teams group users around a Client and (optionally) a specific SoW. A team
// marker enables three downstream behaviours:
//   - calendar filtering shows every team member's events in one view
//   - events scoped to a team auto-include every member
//   - the team a project's client/SoW belongs to is shown on the task panel
//
// Visibility model: any authenticated user can list and read teams. Mutations
// (create / update / delete / membership changes) are admin-only.
const VALID_TEAM_ROLES = ['lead', 'member'];

/**
 * GET /api/teams — List all teams with member count and client / SoW names.
 * Optional ?client_id=<uuid> filter restricts to a single client.
 */
app.get('/api/teams', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { client_id, include } = req.query;
  const includeMembers = include === 'members';
  let where = '';
  let vals = [];
  if (client_id) {
    if (!isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    where = 'WHERE t.client_id = $1';
    vals = [client_id];
  }
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.name, t.description, t.client_id, t.sow_id, t.colour,
             t.created_at, t.updated_at,
             c.name AS client_name,
             s.title AS sow_title,
             (SELECT COUNT(*)::int FROM team_members WHERE team_id = t.id) AS member_count
      FROM teams t
      LEFT JOIN clients c ON c.id = t.client_id
      LEFT JOIN sows s ON s.id = t.sow_id
      ${where}
      ORDER BY c.name NULLS LAST, t.name
    `, vals);
    // Optionally join member display names. Used by the calendar modal so
    // team events can be fanned out to every team member's roster row
    // without a second round-trip (bug d4367137).
    if (includeMembers && rows.length > 0) {
      const ids = rows.map(r => r.id);
      const { rows: memberRows } = await pool.query(
        `SELECT tm.team_id, u.display_name
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.team_id = ANY($1::uuid[])`,
        [ids]
      );
      const byTeam = {};
      memberRows.forEach(m => {
        if (!byTeam[m.team_id]) byTeam[m.team_id] = [];
        byTeam[m.team_id].push(m.display_name);
      });
      rows.forEach(r => { r.member_display_names = byTeam[r.id] || []; });
    }
    res.json(rows);
  } catch (e) {
    log('error', 'Teams', 'Failed to list teams', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/**
 * GET /api/teams/:id — Single team with members array.
 * Each member entry includes user_id, display_name, username, role.
 */
app.get('/api/teams/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
  try {
    const { rows: teamRows } = await pool.query(`
      SELECT t.id, t.name, t.description, t.client_id, t.sow_id, t.colour,
             t.created_at, t.updated_at,
             c.name AS client_name,
             s.title AS sow_title
      FROM teams t
      LEFT JOIN clients c ON c.id = t.client_id
      LEFT JOIN sows s ON s.id = t.sow_id
      WHERE t.id = $1
    `, [req.params.id]);
    if (!teamRows[0]) return res.status(404).json({ error: 'Not found' });
    const { rows: memberRows } = await pool.query(`
      SELECT tm.id AS membership_id, tm.user_id, tm.role, tm.created_at,
             u.display_name, u.username
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = $1
      ORDER BY (tm.role = 'lead') DESC, u.display_name
    `, [req.params.id]);
    res.json({ ...teamRows[0], members: memberRows });
  } catch (e) {
    log('error', 'Teams', 'Failed to fetch team', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/**
 * POST /api/teams — Create a team. Admin only.
 * Body: { name, description?, client_id?, sow_id?, colour? }
 */
app.post('/api/teams', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, description, client_id, sow_id, colour } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
  const lenErr = validateLength(name, 'name');
  if (lenErr) return res.status(400).json({ error: lenErr });
  if (description) {
    const dErr = validateLength(description, 'description');
    if (dErr) return res.status(400).json({ error: dErr });
  }
  if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
  if (sow_id && !isValidUuid(sow_id)) return res.status(400).json({ error: 'Invalid sow_id' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO teams (name, description, client_id, sow_id, colour)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [String(name).trim(), description || null, client_id || null, sow_id || null, colour || null]
    );
    await auditLog('team', rows[0].id, 'create', req.user.displayName, { name: String(name).trim(), client_id, sow_id });
    res.status(201).json(rows[0]);
  } catch (e) {
    log('error', 'Teams', 'Failed to create team', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/**
 * PATCH /api/teams/:id — Update team metadata. Admin only.
 * Allowed fields: name, description, client_id, sow_id, colour.
 */
app.patch('/api/teams/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if ('name' in req.body && !String(req.body.name || '').trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }
  if (req.body.client_id && !isValidUuid(req.body.client_id)) {
    return res.status(400).json({ error: 'Invalid client_id' });
  }
  if (req.body.sow_id && !isValidUuid(req.body.sow_id)) {
    return res.status(400).json({ error: 'Invalid sow_id' });
  }
  // Normalise empties to NULL so client/sow can be cleared
  const body = { ...req.body };
  ['client_id', 'sow_id', 'description', 'colour'].forEach(k => {
    if (body[k] === '') body[k] = null;
  });
  if (body.name !== undefined) body.name = String(body.name).trim();
  const { updates, vals, nextIdx } = buildPatchQuery(body, ['name', 'description', 'client_id', 'sow_id', 'colour']);
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  updates.push('updated_at = NOW()');
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE teams SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await auditLog('team', req.params.id, 'update', req.user.displayName, { fields: Object.keys(req.body) });
    res.json(rows[0]);
  } catch (e) {
    log('error', 'Teams', 'Failed to update team', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** DELETE /api/teams/:id — Remove a team. Members are removed via ON DELETE CASCADE. Admin only. */
app.delete('/api/teams/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { rowCount } = await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    await auditLog('team', req.params.id, 'delete', req.user.displayName);
    res.json({ ok: true });
  } catch (e) {
    log('error', 'Teams', 'Failed to delete team', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/**
 * POST /api/teams/:id/members — Add a user to the team. Admin only.
 * Body: { user_id, role? }
 */
app.post('/api/teams/:id/members', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { user_id, role } = req.body || {};
  if (!user_id || !isValidUuid(user_id)) return res.status(400).json({ error: 'Valid user_id required' });
  const memberRole = role && VALID_TEAM_ROLES.includes(role) ? role : 'member';
  try {
    // Verify team exists
    const { rows: teamRows } = await pool.query('SELECT id FROM teams WHERE id = $1', [req.params.id]);
    if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });
    // Verify user exists
    const { rows: userRows } = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const { rows } = await pool.query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [req.params.id, user_id, memberRole]
    );
    await auditLog('team_member', rows[0].id, 'create', req.user.displayName, { team_id: req.params.id, user_id, role: memberRole });
    res.status(201).json(rows[0]);
  } catch (e) {
    log('error', 'Teams', 'Failed to add team member', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** PATCH /api/teams/:id/members/:user_id — Change a member's role. Admin only. */
app.patch('/api/teams/:id/members/:user_id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
  if (!isValidUuid(req.params.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { role } = req.body || {};
  if (!role || !VALID_TEAM_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_TEAM_ROLES.join(', ')}` });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3 RETURNING *`,
      [role, req.params.id, req.params.user_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Membership not found' });
    await auditLog('team_member', rows[0].id, 'update', req.user.displayName, { team_id: req.params.id, user_id: req.params.user_id, role });
    res.json(rows[0]);
  } catch (e) {
    log('error', 'Teams', 'Failed to update team member role', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** DELETE /api/teams/:id/members/:user_id — Remove a member from a team. Admin only. */
app.delete('/api/teams/:id/members/:user_id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
  if (!isValidUuid(req.params.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [req.params.id, req.params.user_id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Membership not found' });
    await auditLog('team_member', req.params.id, 'delete', req.user.displayName, { team_id: req.params.id, user_id: req.params.user_id });
    res.json({ ok: true });
  } catch (e) {
    log('error', 'Teams', 'Failed to remove team member', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== CONTACTS ====================

/** GET /api/clients/:clientId/contacts — List contacts for a client, sorted by display order */
app.get('/api/clients/:clientId/contacts', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM contacts WHERE client_id = $1 ORDER BY sort_order', [req.params.clientId]);
  res.json(rows);
});

/** POST /api/clients/:clientId/contacts — Add a contact person to a client */
app.post('/api/clients/:clientId/contacts', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, role, notes, background, linkedin, sort_order, email, phone } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO contacts (client_id, name, role, notes, background, linkedin, sort_order, email, phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.params.clientId, name || '', role || '', notes || '', background || '', linkedin || '', sort_order || 0, email || '', phone || '']
  );
  res.status(201).json(rows[0]);
});

/** PATCH /api/contacts/:id — Update a contact's details */
app.patch('/api/contacts/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid contact ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['name', 'role', 'notes', 'background', 'linkedin', 'sort_order', 'email', 'phone']);
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE contacts SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
  if (rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
  res.json(rows[0]);
});

/** DELETE /api/contacts/:id — Remove a contact (admin only) */
app.delete('/api/contacts/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid contact ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  await pool.query('DELETE FROM contacts WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ==================== CLIENT NOTES ====================

/** GET /api/clients/:clientId/notes — List notes/meeting records for a client, newest meeting first */
app.get('/api/clients/:clientId/notes', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM client_notes WHERE client_id = $1 ORDER BY meeting_date DESC NULLS LAST, created_at DESC',
    [req.params.clientId]
  );
  res.json(rows);
});

/** GET /api/notes — List all client notes across all clients (for global notes view) */
app.get('/api/notes', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT n.*, c.name as client_name
    FROM client_notes n JOIN clients c ON n.client_id = c.id
    ORDER BY n.meeting_date DESC NULLS LAST, n.created_at DESC
  `);
  res.json(rows);
});

/** POST /api/clients/:clientId/notes — Create a note (meeting record, manual note, or synced from Granola) */
app.post('/api/clients/:clientId/notes', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { title, content, source, source_id, source_url, meeting_date, author } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const { rows } = await pool.query(
    `INSERT INTO client_notes (client_id, title, content, source, source_id, source_url, meeting_date, author)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.clientId, title, content || '', source || 'manual', source_id || '', source_url || '',
     meeting_date || null, author || 'Glen']
  );
  res.status(201).json(rows[0]);
});

/** PATCH /api/notes/:id — Update a client note */
app.patch('/api/notes/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['title', 'content', 'source', 'meeting_date', 'author']);
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  updates.push('updated_at = NOW()');
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE client_notes SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
  if (rows.length === 0) return res.status(404).json({ error: 'Note not found' });
  res.json(rows[0]);
});

/** DELETE /api/notes/:id — Remove a client note (admin only) */
app.delete('/api/notes/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  await pool.query('DELETE FROM client_notes WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ==================== TASKS ====================

/**
 * GET /api/tasks
 * List tasks with optional filters: client_id, status, assignee.
 * Includes inline task notes as a JSON aggregate and the client name via join.
 */
app.get('/api/tasks', async (req, res) => {
  let { client_id, status, assignee, limit, offset, cursor } = req.query;
  const scopes = await getClientScopes(req);
  if (scopes && scopes.length === 1) { client_id = scopes[0]; } // G5: force single client
  else if (scopes && !client_id) { /* Team visibility: filter applied below */ }
  let where = []; let vals = []; let i = 1;
  if (client_id) { where.push(`t.client_id = $${i}`); vals.push(client_id); i++; }
  else if (scopes && scopes.length > 1) { where.push(`(t.client_id = ANY($${i}) OR t.client_id IS NULL)`); vals.push(scopes); i++; }
  if (status) { where.push(`t.status = $${i}`); vals.push(status); i++; }
  if (assignee) { where.push(`$${i} = ANY(t.assignees)`); vals.push(assignee); i++; }

  // Cursor-based: filter tasks with updated_at before the cursor timestamp
  if (cursor) {
    where.push(`t.updated_at > $${i}`);
    vals.push(cursor);
    i++;
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  // Pagination: default to all rows for backwards compat, but support limit/offset/cursor
  if (cursor || limit) {
    // Paginated mode — use cursor or offset
    const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
    const parsedOffset = parseInt(offset) || 0;
    const fetchLimit = parsedLimit + 1; // Fetch one extra to determine hasMore

    vals.push(fetchLimit);
    let paginationClause;
    if (cursor) {
      paginationClause = `LIMIT $${i}`;
    } else {
      vals.push(parsedOffset);
      paginationClause = `LIMIT $${i} OFFSET $${i + 1}`;
    }

    // Count query uses only filter params (no cursor, limit, or offset)
    const countFilterWhere = [];
    const countVals = [];
    let ci = 1;
    if (client_id) { countFilterWhere.push(`t.client_id = $${ci}`); countVals.push(client_id); ci++; }
    if (status) { countFilterWhere.push(`t.status = $${ci}`); countVals.push(status); ci++; }
    if (assignee) { countFilterWhere.push(`$${ci} = ANY(t.assignees)`); countVals.push(assignee); ci++; }
    const countWhere = countFilterWhere.length > 0 ? 'WHERE ' + countFilterWhere.join(' AND ') : '';

    const [{ rows }, countResult] = await Promise.all([
      pool.query(`
        SELECT t.*, c.name as client_name,
          s.title AS sow_title, s.status AS sow_status,
          (SELECT json_agg(json_build_object('id', n.id, 'text', n.text, 'author', n.author, 'created_at', n.created_at) ORDER BY n.created_at)
           FROM task_notes n WHERE n.task_id = t.id) as notes
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN sows s ON s.id = t.sow_id
        ${whereClause}
        ORDER BY t.created_at
        ${paginationClause}
      `, vals),
      pool.query(`SELECT count(*) FROM tasks t LEFT JOIN clients c ON t.client_id = c.id ${countWhere}`, countVals)
    ]);

    const hasMore = rows.length > parsedLimit;
    const taskRows = hasMore ? rows.slice(0, parsedLimit) : rows;
    const nextCursor = hasMore && taskRows.length > 0 ? taskRows[taskRows.length - 1].updated_at : null;

    res.json({
      rows: taskRows,
      total: parseInt(countResult.rows[0].count),
      limit: parsedLimit,
      offset: parsedOffset,
      nextCursor,
      hasMore
    });
  } else {
    // No pagination — return all rows (backward compat)
    const { rows } = await pool.query(`
      SELECT t.*, c.name as client_name,
        s.title AS sow_title, s.status AS sow_status,
        (SELECT json_agg(json_build_object('id', n.id, 'text', n.text, 'author', n.author, 'created_at', n.created_at) ORDER BY n.created_at)
         FROM task_notes n WHERE n.task_id = t.id) as notes
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN sows s ON s.id = t.sow_id
      ${whereClause}
      ORDER BY t.created_at
    `, vals);
    res.json(rows);
  }
});

/** GET /api/tasks/:id — Get a single task with notes, client name and SoW title */
app.get('/api/tasks/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const { rows } = await pool.query(`
    SELECT t.*, c.name as client_name,
      s.title AS sow_title, s.status AS sow_status,
      (SELECT json_agg(json_build_object('id', n.id, 'text', n.text, 'author', n.author, 'created_at', n.created_at) ORDER BY n.created_at)
       FROM task_notes n WHERE n.task_id = t.id) as notes
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    LEFT JOIN sows s ON s.id = t.sow_id
    WHERE t.id = $1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

/** POST /api/tasks — Create a new task (admin only). Enforces hierarchy: project > feature > story > task. */
app.post('/api/tasks', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  let { title, parent_id, client_id, item_type, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, planner_task_id, source } = req.body;
  const scopes = await getClientScopes(req);
  if (scopes && client_id && !scopes.includes(client_id)) return res.status(403).json({ error: 'Cannot create tasks for other clients' });
  if (scopes && scopes.length === 1 && !client_id) client_id = scopes[0]; // Default for G5 users
  if (!title) return res.status(400).json({ error: 'Title required' });
  const lenErr = validateLength(title, 'title') || validateLength(description, 'description');
  if (lenErr) return res.status(400).json({ error: lenErr });

  // Validate status against the canonical enum (matches frontend STATUSES constant).
  const VALID_STATUSES = ['Not started', 'In progress', 'Planning', 'Drafted', 'In Review', 'Blocked', 'Done', 'Cancelled'];
  if (status !== undefined && status !== null && status !== '' && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  // Coerce and validate numeric hour fields up-front so bad input returns 400, not 500.
  let parsedHoursEst = 0;
  if (hours_estimated !== undefined && hours_estimated !== null && hours_estimated !== '') {
    parsedHoursEst = Number(hours_estimated);
    if (!Number.isFinite(parsedHoursEst) || parsedHoursEst < 0) {
      return res.status(400).json({ error: 'hours_estimated must be a non-negative number' });
    }
  }
  let parsedHoursSpent = 0;
  if (hours_spent !== undefined && hours_spent !== null && hours_spent !== '') {
    parsedHoursSpent = Number(hours_spent);
    if (!Number.isFinite(parsedHoursSpent) || parsedHoursSpent < 0) {
      return res.status(400).json({ error: 'hours_spent must be a non-negative number' });
    }
  }

  // Reject start_date after end_date
  if (start_date && end_date && start_date > end_date) {
    return res.status(400).json({ error: 'start_date must be before or equal to end_date' });
  }

  // Infer or validate item_type based on parent hierarchy
  let resolvedType;
  if (parent_id) {
    const parentResult = await pool.query('SELECT item_type FROM tasks WHERE id = $1', [parent_id]);
    if (parentResult.rows.length > 0) {
      const expectedType = VALID_CHILD_TYPE[parentResult.rows[0].item_type];
      if (!expectedType) return res.status(400).json({ error: `Cannot create children under a ${parentResult.rows[0].item_type}` });
      resolvedType = item_type || expectedType;
      if (resolvedType !== expectedType) return res.status(400).json({ error: `Expected ${expectedType} under ${parentResult.rows[0].item_type}, got ${resolvedType}` });
    }
  } else {
    resolvedType = item_type || 'project';
  }
  if (!ITEM_TYPES.includes(resolvedType)) return res.status(400).json({ error: `Invalid item_type: ${resolvedType}` });

  const targetStatus = status || 'Not started';
  const dbClient = await pool.connect();
  let createdRow;
  try {
    await dbClient.query('BEGIN');
    await shiftForInsert(dbClient, 'tasks', 'status', targetStatus);
    const { rows } = await dbClient.query(
      `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, planner_task_id, source, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,0) RETURNING *`,
      [title, parent_id || null, client_id || null, resolvedType, targetStatus, priority || '', health_state || '', description || '',
       assignees || [], parsedHoursEst, parsedHoursSpent, due_date || '', start_date || '', end_date || '', dependencies || [], planner_task_id || '', source || 'manual']
    );
    createdRow = rows[0];
    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK');
    log('error', 'Tasks', 'POST failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to create task' });
  } finally {
    dbClient.release();
  }
  await auditLog('task', createdRow.id, 'create', req.user?.displayName, { title, item_type: resolvedType });
  res.status(201).json(createdRow);
});

/**
 * PATCH /api/tasks/:id
 * Update task fields. Compares old and new values to build a detailed
 * audit trail entry showing exactly what changed.
 */
app.patch('/api/tasks/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const lenErr = validateLength(req.body.title, 'title') || validateLength(req.body.description, 'description');
  if (lenErr) return res.status(400).json({ error: lenErr });
  // Validate item_type if provided
  if (req.body.item_type && !ITEM_TYPES.includes(req.body.item_type)) {
    return res.status(400).json({ error: `Invalid item_type: ${req.body.item_type}. Must be one of: ${ITEM_TYPES.join(', ')}` });
  }
  // Validate status enum (matches frontend STATUSES constant)
  const VALID_STATUSES = ['Not started', 'In progress', 'Planning', 'Drafted', 'In Review', 'Blocked', 'Done', 'Cancelled'];
  if (req.body.status !== undefined && req.body.status !== null && req.body.status !== '' && !VALID_STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  // Coerce and validate numeric hour fields up-front
  if (req.body.hours_estimated !== undefined && req.body.hours_estimated !== null && req.body.hours_estimated !== '') {
    const h = Number(req.body.hours_estimated);
    if (!Number.isFinite(h) || h < 0) {
      return res.status(400).json({ error: 'hours_estimated must be a non-negative number' });
    }
    req.body.hours_estimated = h;
  }
  if (req.body.hours_spent !== undefined && req.body.hours_spent !== null && req.body.hours_spent !== '') {
    const h = Number(req.body.hours_spent);
    if (!Number.isFinite(h) || h < 0) {
      return res.status(400).json({ error: 'hours_spent must be a non-negative number' });
    }
    req.body.hours_spent = h;
  }
  // Reject start_date > end_date (use both incoming values, or fall back to existing below)
  if (req.body.start_date && req.body.end_date && req.body.start_date > req.body.end_date) {
    return res.status(400).json({ error: 'start_date must be before or equal to end_date' });
  }
  // Text fields are stored raw; escaping happens at render time in the frontend (esc()).
  // Status is routed through reorderInGroup below — NOT in allowedFields.
  const allowedFields = ['title', 'parent_id', 'client_id', 'item_type', 'priority', 'health_state', 'description', 'assignees', 'hours_estimated', 'hours_spent', 'due_date', 'start_date', 'end_date', 'dependencies', 'collaborations', 'success_factor', 'repeat_rule', 'blocker_info', 'practice_area', 'sow_id'];
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowedFields);
  if (req.body.title !== undefined && !req.body.title.trim()) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }
  const wantsReorder = (req.body.status !== undefined) || (req.body.position !== undefined);
  if (updates.length === 0 && !wantsReorder) return res.status(400).json({ error: 'No valid fields to update' });
  // Fetch old values before update for audit trail
  const oldResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  const oldTask = oldResult.rows[0];
  const scopes = await getClientScopes(req);
  if (scopes && oldTask && !scopes.includes(oldTask.client_id)) return res.status(403).json({ error: 'Cannot edit tasks for other clients' });

  // If this update sets status to In progress / In Review / Done, validate that all
  // mandatory fields are present (merged old + new). Leaf tasks only — skip if the task
  // has children. Description must be at least 15 characters when provided.
  // Client is inherited from parent chain on the frontend, so walk ancestors.
  const ACTIVE_STATUSES = ['In progress', 'In Review', 'Done'];
  if (req.body.status && ACTIVE_STATUSES.includes(req.body.status) && oldTask) {
    // Skip validation for parent items (rollups, not leaf work)
    const { rows: childRows } = await pool.query('SELECT 1 FROM tasks WHERE parent_id = $1 LIMIT 1', [req.params.id]);
    if (childRows.length === 0) {
      const merged = { ...oldTask, ...req.body };
      // Resolve effective client by walking the parent chain if not directly set
      let effectiveClientId = merged.client_id;
      if (!effectiveClientId) {
        const { rows: ancestorRows } = await pool.query(`
          WITH RECURSIVE ancestors AS (
            SELECT id, parent_id, client_id FROM tasks WHERE id = $1
            UNION ALL
            SELECT t.id, t.parent_id, t.client_id FROM tasks t
            INNER JOIN ancestors a ON t.id = a.parent_id
          )
          SELECT client_id FROM ancestors WHERE client_id IS NOT NULL LIMIT 1
        `, [req.params.id]);
        if (ancestorRows.length > 0) effectiveClientId = ancestorRows[0].client_id;
      }
      const missing = [];
      if (!merged.hours_estimated || Number(merged.hours_estimated) <= 0) missing.push('Hours estimated');
      if (!merged.priority || String(merged.priority).trim() === '') missing.push('Priority');
      if (!Array.isArray(merged.assignees) || merged.assignees.length === 0) missing.push('Assignee');
      if (!merged.due_date || String(merged.due_date).trim() === '') missing.push('Due date');
      if (!effectiveClientId) missing.push('Client');
      const desc = (merged.description || '').toString().trim();
      if (desc.length < 15) missing.push('Description (min 15 chars)');
      if (missing.length > 0) {
        return res.status(400).json({
          error: `Cannot set status to "${req.body.status}" — missing mandatory fields: ${missing.join(', ')}`,
          missingFields: missing
        });
      }
    }
  }
  // If description is being set on its own, still enforce the 15-char minimum
  // (allow empty/clear, but reject 1-14 char values)
  if (req.body.description !== undefined) {
    const d = (req.body.description || '').toString().trim();
    if (d.length > 0 && d.length < 15) {
      return res.status(400).json({ error: 'Description must be at least 15 characters' });
    }
  }

  // Server-side prerequisite enforcement: block Done if prerequisites are incomplete
  if (req.body.status === 'Done' && oldTask && Array.isArray(oldTask.dependencies) && oldTask.dependencies.length > 0) {
    const { rows: prereqs } = await pool.query(
      "SELECT id, title, status FROM tasks WHERE id = ANY($1::uuid[]) AND status != 'Done'",
      [oldTask.dependencies]
    );
    if (prereqs.length > 0) {
      return res.status(400).json({
        error: 'Cannot mark as Done — incomplete prerequisites',
        incompletePrereqs: prereqs.map(p => ({ id: p.id, title: p.title, status: p.status }))
      });
    }
  }

  // Server-side circular dependency prevention (single recursive CTE, replaces O(M*N) loop — code review H3)
  if (Array.isArray(req.body.dependencies) && req.body.dependencies.length > 0) {
    // Self-dependency check first (cheap)
    if (req.body.dependencies.some(d => d === req.params.id)) {
      return res.status(400).json({ error: 'A task cannot depend on itself' });
    }
    // Walk the transitive closure of all proposed dependencies in one query and see if the
    // current task appears anywhere in the reachable set. If it does, adding these dependencies
    // would create a cycle.
    const { rows: reachRows } = await pool.query(`
      WITH RECURSIVE dep_closure(task_id, depth) AS (
        SELECT unnest($1::uuid[]), 1
        UNION
        SELECT dep_id::uuid, dc.depth + 1
        FROM dep_closure dc
        JOIN tasks t ON t.id = dc.task_id
        CROSS JOIN LATERAL unnest(COALESCE(t.dependencies, ARRAY[]::text[])) AS dep_id
        WHERE dc.depth < 500
      )
      SELECT 1 FROM dep_closure WHERE task_id = $2::uuid LIMIT 1
    `, [req.body.dependencies, req.params.id]);
    if (reachRows.length > 0) {
      return res.status(400).json({ error: 'Circular dependency detected — this would create a cycle' });
    }
  }
  // Run reorder + field updates atomically
  const txnClient = await pool.connect();
  let updatedTask;
  try {
    await txnClient.query('BEGIN');

    if (wantsReorder) {
      const targetStatus = (req.body.status !== undefined && req.body.status !== '')
        ? req.body.status
        : (oldTask ? oldTask.status : 'Not started');
      const targetPos = (typeof req.body.position === 'number' && Number.isInteger(req.body.position))
        ? req.body.position
        : 0;
      await reorderInGroup(txnClient, 'tasks', 'status', req.params.id, targetStatus, targetPos);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      vals.push(req.params.id);
      await txnClient.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${nextIdx}`, vals);
    }

    const fresh = await txnClient.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!fresh.rows[0]) {
      await txnClient.query('ROLLBACK');
      txnClient.release();
      return res.status(404).json({ error: 'Not found' });
    }
    updatedTask = fresh.rows[0];
    await txnClient.query('COMMIT');
  } catch (err) {
    await txnClient.query('ROLLBACK');
    log('error', 'Tasks', 'PATCH failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to update task' });
  } finally {
    txnClient.release();
  }

  // Build detailed change log against the freshly-updated row
  const changes = {};
  const allFields = [...allowedFields, 'status', 'position'];
  for (const f of allFields) {
    if (req.body[f] !== undefined && oldTask) {
      const oldVal = oldTask[f];
      const newVal = updatedTask[f];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[f] = { from: oldVal, to: newVal };
      }
    }
  }
  if (Object.keys(changes).length > 0) {
    await auditLog('task', req.params.id, 'update', req.user?.displayName, changes);
  }

  // Feature 3: cascade Cancelled status from a project to all descendants
  if (req.body.status === 'Cancelled' && updatedTask.item_type === 'project' && (!oldTask || oldTask.status !== 'Cancelled')) {
    try {
      const { rows: cascaded } = await pool.query(`
        WITH RECURSIVE descendants AS (
          SELECT id FROM tasks WHERE parent_id = $1
          UNION ALL
          SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
        )
        UPDATE tasks SET status = 'Cancelled', updated_at = NOW()
        WHERE id IN (SELECT id FROM descendants) AND status != 'Cancelled'
        RETURNING id
      `, [req.params.id]);
      if (cascaded.length > 0) {
        await auditLog('task', req.params.id, 'cascade_cancel', req.user?.displayName, { count: cascaded.length, ids: cascaded.map(r => r.id) });
      }
    } catch (e) {
      log('warn', 'Tasks', 'Cascade cancel failed', { error: e.message });
    }
  }

  // Feature 2: clone next instance of a repeating task when marked Done or Cancelled
  try {
    const TERMINAL_STATUSES = ['Done', 'Cancelled'];
    const newTerminal = req.body.status && TERMINAL_STATUSES.includes(req.body.status);
    const wasTerminal = oldTask && TERMINAL_STATUSES.includes(oldTask.status);
    if (newTerminal && !wasTerminal && updatedTask.repeat_rule) {
      const nextDate = computeNextRepeatDate(updatedTask.repeat_rule, new Date());
      if (nextDate) {
        const cloneSql = `INSERT INTO tasks
          (title, parent_id, client_id, item_type, status, priority, health_state, description, assignees,
           hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, planner_task_id, source,
           collaborations, success_factor, repeat_rule)
          VALUES ($1,$2,$3,$4,'Not started',$5,$6,$7,$8,$9,0,$10,'','',$11,'','repeat',$12,$13,$14)
          RETURNING id`;
        const cloneVals = [
          updatedTask.title, updatedTask.parent_id, updatedTask.client_id, updatedTask.item_type,
          updatedTask.priority || '', updatedTask.health_state || '', updatedTask.description || '',
          updatedTask.assignees || [], updatedTask.hours_estimated || 0, nextDate, updatedTask.dependencies || [],
          updatedTask.collaborations || null, updatedTask.success_factor || null, updatedTask.repeat_rule
        ];
        const cloneRes = await pool.query(cloneSql, cloneVals);
        await auditLog('task', cloneRes.rows[0].id, 'repeat_clone', req.user?.displayName, { source_task_id: req.params.id, due_date: nextDate });
      }
    }
  } catch (e) {
    log('warn', 'Tasks', 'Repeat clone failed', { error: e.message });
  }

  // Feature 6: notify internal assignees tagged as blockers when task is set to Blocked
  try {
    if (req.body.status === 'Blocked' && updatedTask.blocker_info && Array.isArray(updatedTask.blocker_info.internal)) {
      const internalNames = updatedTask.blocker_info.internal.filter(n => n && typeof n === 'string');
      if (internalNames.length > 0) {
        const { rows: matchedUsers } = await pool.query(
          'SELECT username, display_name FROM users WHERE display_name = ANY($1) OR username = ANY($1)',
          [internalNames]
        );
        for (const u of matchedUsers) {
          if (u.username && u.username !== req.user?.username) {
            await createNotification(
              u.username, 'warning',
              `Task blocking on you`,
              `Task "${updatedTask.title}" is blocking on you.`,
              '/nbi_project_dashboard.html#workload'
            );
          }
        }
      }
    }
  } catch (e) {
    log('warn', 'Tasks', 'Blocker notification failed', { error: e.message });
  }

  // Notify assignees of meaningful task changes (skip position/updated_at noise)
  try {
    const changedFields = Object.keys(changes).filter(k => !['position', 'updated_at'].includes(k));
    // Batch lookup: one query for all assignees instead of one per assignee
    const assigneeNames = (updatedTask.assignees || []).filter(a => a !== req.user?.displayName);
    if (assigneeNames.length > 0 && changedFields.length > 0) {
      const { rows: assigneeUsers } = await pool.query(
        'SELECT username, display_name FROM users WHERE display_name = ANY($1) AND is_active = true',
        [assigneeNames]
      );
      for (const u of assigneeUsers) {
        await createNotification(
          u.username, 'info', 'Task updated',
          `"${updatedTask.title}" was updated: ${changedFields.join(', ')}`,
          updatedTask.id, true
        );
      }
    }
  } catch (e) {
    log('warn', 'Tasks', 'Assignee change notification failed', { error: e.message });
  }

  res.json(updatedTask);
});

/** DELETE /api/tasks/:id — Delete a task and all descendants (admin only). Uses a transaction for atomicity. */
app.delete('/api/tasks/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  // Fetch the task before deletion so we can notify assignees
  const { rows: preDeleteRows } = await pool.query('SELECT title, assignees FROM tasks WHERE id = $1', [req.params.id]);
  const taskToDelete = preDeleteRows[0] || null;
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    // Collect all IDs to delete (target + descendants) BEFORE deleting
    const { rows: deletedRows } = await conn.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE id = $1
        UNION ALL
        SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
      )
      SELECT id FROM descendants
    `, [req.params.id]);
    const deletedIds = deletedRows.map(r => r.id);

    // Cascade-delete all descendants first, then the item itself
    await conn.query(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE parent_id = $1
        UNION ALL
        SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
      )
      DELETE FROM tasks WHERE id IN (SELECT id FROM descendants)
    `, [req.params.id]);
    await conn.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);

    // Clean up orphaned dependency references: remove deleted IDs from other tasks' dependencies arrays
    if (deletedIds.length > 0) {
      await conn.query(`
        UPDATE tasks SET dependencies = (
          SELECT COALESCE(array_agg(d), '{}') FROM unnest(dependencies) d WHERE d != ALL($1::text[])
        ), updated_at = NOW()
        WHERE dependencies && $1::text[]
      `, [deletedIds]);
    }

    await conn.query('COMMIT');
    // Audit log after successful delete
    await auditLog('task', req.params.id, 'delete', req.user?.displayName);
    res.json({ ok: true });

    // Notify assignees the task was deleted (fire-and-forget, outside the transaction)
    if (taskToDelete && Array.isArray(taskToDelete.assignees) && taskToDelete.assignees.length > 0) {
      try {
        // Batch lookup: one query for all assignees instead of one per assignee
        const assigneeNames = taskToDelete.assignees.filter(a => a);
        if (assigneeNames.length > 0) {
          const { rows: assigneeUsers } = await pool.query(
            'SELECT username, display_name FROM users WHERE display_name = ANY($1) AND is_active = true',
            [assigneeNames]
          );
          for (const u of assigneeUsers) {
            if (u.username === req.user?.username) continue;
            await createNotification(
              u.username, 'warning', 'Task deleted',
              `Task "${taskToDelete.title}" was deleted by ${req.user?.displayName || 'an admin'}.`,
              null, true
            );
          }
        }
      } catch (notifErr) {
        log('warn', 'Tasks', 'Delete notification failed', { error: notifErr.message });
      }
    }
  } catch (e) {
    await conn.query('ROLLBACK');
    throw e;
  } finally {
    conn.release();
  }
});

/**
 * POST /api/tasks/bulk
 * Bulk-create tasks from an import. Uses a two-pass approach:
 * first pass inserts all tasks to get real IDs, second pass resolves
 * parent relationships using a temp_id -> real_id mapping.
 */
app.post('/api/tasks/bulk', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { tasks: taskList } = req.body;
  if (!Array.isArray(taskList)) return res.status(400).json({ error: 'tasks array required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    const idMap = {};
    for (const t of taskList) {
      const status = t.status || 'Not started';
      await shiftForInsert(client, 'tasks', 'status', status);
      const { rows } = await client.query(
        `INSERT INTO tasks (title, client_id, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, planner_task_id, source, item_type, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0) RETURNING *`,
        [t.title, t.client_id || null, status, t.priority || '', t.health_state || '',
         t.description || '', t.assignees || [], t.hours_estimated || 0, t.hours_spent || 0,
         t.due_date || '', t.planner_task_id || '', t.source || 'import', t.item_type || 'task']
      );
      if (t._temp_id) idMap[t._temp_id] = rows[0].id;
      created.push(rows[0]);
    }
    // Second pass: set parent_ids
    for (const t of taskList) {
      if (t._temp_parent_id && idMap[t._temp_parent_id]) {
        const realId = idMap[t._temp_id];
        const realParentId = idMap[t._temp_parent_id];
        await client.query('UPDATE tasks SET parent_id = $1 WHERE id = $2', [realParentId, realId]);
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ count: created.length });
  } catch (e) {
    await client.query('ROLLBACK');
    log('error', 'Tasks', 'Bulk task creation failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    client.release();
  }
});

// ==================== DATA SYNC ====================

/**
 * POST /api/sync/changes
 * Incremental sync: apply a list of change operations (upsert/delete) to tasks.
 * Also syncs client briefs and contacts if provided.
 * Runs in a transaction with a client name -> ID cache to avoid repeated lookups.
 */
app.post('/api/sync/changes', async (req, res) => {
  // Any authenticated user may sync their task changes. Previously this was
  // admin-only, which silently blocked every member's local edit (Magnus
  // report C.9 "Ticket Not Marked as Blocked" was a symptom of this —
  // her Blocked status never reached the server so it reverted on reload).
  // Client briefs remain admin-only because they carry client metadata.
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const isAdmin = req.user.role === 'admin';
  const { changes } = req.body;
  // Silently drop client-brief updates from non-admins instead of rejecting the whole sync
  const briefList = isAdmin ? req.body.client_briefs : null;
  if ((!Array.isArray(changes) || changes.length === 0) && !briefList) return res.json({ ok: true, applied: 0 });

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    // Build client name->id cache
    const clientRows = (await conn.query('SELECT id, name FROM clients')).rows;
    const clientMap = {};
    clientRows.forEach(r => { clientMap[r.name] = r.id; });

    let applied = 0;
    let rejectedOutOfScope = 0;
    const idMap = {}; // frontend_id -> db_id (for new tasks)

    // Scope gate for the write path. Admin passes through; everyone else
    // may only touch tasks whose client_id is in their scope. External (G5)
    // users can never touch null-client tasks; internal-with-team users
    // can. Out-of-scope changes are silently dropped from the batch and
    // surfaced to the client via rejectedOutOfScope in the response.
    const scopes = await getClientScopes(req);
    const isExternal = !!req.user?.clientId;
    const scopeSet = scopes ? new Set(scopes) : null;
    const clientInScope = (clientId) => {
      if (scopeSet === null) return true;
      if (clientId == null) return !isExternal;
      return scopeSet.has(clientId);
    };

    // Batch-fetch existing task states to avoid N+1 queries in the loop.
    // Also fetch client_ids of any tasks being deleted so we can scope-check them.
    const upsertIds = changes.filter(ch => ch.action === 'upsert' && ch.entity === 'task' && ch.data?.id).map(ch => ch.data.id);
    const deleteIds = changes.filter(ch => ch.action === 'delete' && ch.entity === 'task' && ch.id).map(ch => ch.id);
    const existingTaskMap = new Map();
    const existingFullMap = new Map(); // full row, used for post-processing transitions
    const deleteClientMap = new Map();
    if (upsertIds.length > 0) {
      const { rows: existingRows } = await conn.query('SELECT * FROM tasks WHERE id = ANY($1::uuid[])', [upsertIds]);
      existingRows.forEach(r => { existingTaskMap.set(r.id, r.updated_at); existingFullMap.set(r.id, r); });
    }
    if (scopeSet !== null && deleteIds.length > 0) {
      const { rows: delRows } = await conn.query('SELECT id, client_id FROM tasks WHERE id = ANY($1::uuid[])', [deleteIds]);
      delRows.forEach(r => deleteClientMap.set(r.id, r.client_id));
    }
    // Track per-task transitions to process after the main upsert loop (cascade cancel, repeat clones, blocker notifications)
    const postProcessTransitions = [];

    for (const ch of changes) {
      const t = ch.data || {};

      if (ch.action === 'upsert' && ch.entity === 'task') {
        // Defensive normalisation: Postgres text[] columns must receive a flat
        // 1-D array of strings. The frontend has been observed sending [[]]
        // (nested empty array) which Postgres parses as the invalid array
        // literal "{{}}". Flatten + filter-string + log when we had to fix it,
        // so we keep visibility into frontend sources still producing bad data
        // while the server stops throwing.
        const normaliseStringArray = (val, fieldName) => {
          if (val == null) return [];
          if (!Array.isArray(val)) return [];
          // Fast path: already flat 1-D string array
          const isFlat = val.every(x => typeof x === 'string');
          if (isFlat) return val;
          // Flatten recursively and keep only non-empty strings
          const flat = val.flat(Infinity).filter(x => typeof x === 'string' && x.length > 0);
          log('warn', 'Sync', 'Normalised non-flat array field', {
            taskId: t.id, field: fieldName, before: val, after: flat
          });
          return flat;
        };
        t.assignees = normaliseStringArray(t.assignees, 'assignees');
        t.dependencies = normaliseStringArray(t.dependencies, 'dependencies');

        // Resolve client name to ID. Auto-creation of clients (the old
        // INSERT ... ON CONFLICT path) is restricted to admins — otherwise
        // any caller could manufacture client rows by picking novel names.
        let clientId = null;
        if (t.client && clientMap[t.client]) {
          clientId = clientMap[t.client];
        } else if (t.client && isAdmin && typeof t.client === 'string' && t.client.trim().length > 0 && t.client.length <= 200) {
          const cr = await conn.query('INSERT INTO clients (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id', [t.client.trim()]);
          clientId = cr.rows[0].id;
          clientMap[t.client] = clientId;
        } else if (t.client) {
          // Non-admin referenced an unknown client name: drop the row rather
          // than create it. Surface via rejectedOutOfScope so the client can
          // warn the user.
          rejectedOutOfScope++;
          continue;
        }

        // Scope gate: reject writes whose resolved clientId is outside the
        // user's scope. For updates we also require the task's OLD clientId
        // to be in scope (so a scoped user can't steal a task by patching
        // its client_id to their own).
        if (!clientInScope(clientId)) { rejectedOutOfScope++; continue; }
        if (existingTaskMap.has(t.id)) {
          const oldClientId = existingFullMap.get(t.id)?.client_id ?? null;
          if (!clientInScope(oldClientId)) { rejectedOutOfScope++; continue; }
        }

        // Resolve parentId (might be a frontend temp ID or a DB UUID)
        let parentId = t.parentId || t.parent_id || null;
        if (parentId && idMap[parentId]) parentId = idMap[parentId];

        // Validate item_type — sanitise to a known value
        const rawType = t.itemType || t.item_type || 'task';
        const itemType = ITEM_TYPES.includes(rawType) ? rawType : 'task';

        // Check if task exists (pre-fetched above, or created within this batch)
        const serverUpdatedAt = existingTaskMap.get(t.id) || null;
        const taskExists = serverUpdatedAt !== null;

        if (taskExists) {
          // Conflict detection: if another user updated this task after the client last loaded it,
          // skip this update to avoid overwriting their changes. Client picks up the newer version on next poll.
          const clientKnownAt = t._serverUpdatedAt;
          if (clientKnownAt && serverUpdatedAt && new Date(clientKnownAt) < new Date(serverUpdatedAt)) {
            continue;
          }

          // Update existing task
          await conn.query(
            `UPDATE tasks SET title=$1, parent_id=$2, client_id=$3, item_type=$4, status=$5, priority=$6,
             health_state=$7, description=$8, assignees=$9, hours_estimated=$10, hours_spent=$11,
             due_date=$12, start_date=$13, end_date=$14, dependencies=$15,
             collaborations=$16, success_factor=$17, repeat_rule=$18, blocker_info=$19,
             practice_area=$20, sow_id=$21,
             updated_at=NOW()
             WHERE id=$22`,
            [t.title, parentId, clientId, itemType, t.status || 'Not started', t.priority || '',
             t.healthState || t.health_state || '', t.description || '', t.assignees || [],
             t.hoursEstimated || t.hours_estimated || 0, t.hoursSpent || t.hours_spent || 0,
             t.dueDate || t.due_date || '', t.startDate || t.start_date || '', t.endDate || t.end_date || '',
             t.dependencies || [],
             t.collaborations || null, t.successFactor || t.success_factor || null,
             t.repeatRule || t.repeat_rule || null, t.blockerInfo || t.blocker_info || null,
             t.practiceArea || t.practice_area || null,
             t.sowId || t.sow_id || null,
             t.id]
          );
        } else {
          // Insert new task
          const { rows } = await conn.query(
            `INSERT INTO tasks (id, title, parent_id, client_id, item_type, status, priority, health_state,
             description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, source, created_at,
             collaborations, success_factor, repeat_rule, blocker_info, practice_area, sow_id, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,NOW()) RETURNING id`,
            [t.id, t.title, parentId, clientId, itemType, t.status || 'Not started', t.priority || '',
             t.healthState || t.health_state || '', t.description || '', t.assignees || [],
             t.hoursEstimated || t.hours_estimated || 0, t.hoursSpent || t.hours_spent || 0,
             t.dueDate || t.due_date || '', t.startDate || t.start_date || '', t.endDate || t.end_date || '',
             t.dependencies || [], t.source || 'sync',
             t.createdAt || t.created_at || new Date().toISOString(),
             t.collaborations || null, t.successFactor || t.success_factor || null,
             t.repeatRule || t.repeat_rule || null, t.blockerInfo || t.blocker_info || null,
             t.practiceArea || t.practice_area || null,
             t.sowId || t.sow_id || null]
          );
          idMap[t.id] = rows[0].id;
          existingTaskMap.set(rows[0].id, new Date()); // Register in map for subsequent batch references
        }

        // Sync task notes if present
        if (Array.isArray(t.notes) && t.notes.length > 0) {
          const taskDbId = idMap[t.id] || t.id;
          // Delete existing notes and re-insert (notes are small, append-only)
          await conn.query('DELETE FROM task_notes WHERE task_id = $1', [taskDbId]);
          for (const n of t.notes) {
            if (n.text || n.time) {
              await conn.query('INSERT INTO task_notes (task_id, text, created_at) VALUES ($1, $2, $3)',
                [taskDbId, n.text || '', n.time || n.created_at || new Date().toISOString()]);
            }
          }
        }
        const changedBy = req.user ? req.user.displayName : 'system';
        await auditLog('task', idMap[t.id] || t.id,
          taskExists ? 'update' : 'create',
          changedBy, { title: t.title, status: t.status, healthState: t.healthState || t.health_state }, conn);

        // Capture state transitions for post-processing (cancel cascade, repeat clones, blocker notifications)
        if (taskExists) {
          const oldRow = existingFullMap.get(t.id);
          if (oldRow) {
            postProcessTransitions.push({
              id: t.id,
              oldStatus: oldRow.status,
              newStatus: t.status,
              itemType,
              repeatRule: t.repeatRule || t.repeat_rule || oldRow.repeat_rule || null,
              blockerInfo: t.blockerInfo || t.blocker_info || null,
              title: t.title || oldRow.title,
              snapshot: { ...oldRow,
                title: t.title,
                priority: t.priority || '',
                health_state: t.healthState || t.health_state || '',
                description: t.description || '',
                assignees: t.assignees || [],
                hours_estimated: t.hoursEstimated || t.hours_estimated || 0,
                client_id: clientId,
                parent_id: parentId,
                item_type: itemType,
                collaborations: t.collaborations || null,
                success_factor: t.successFactor || t.success_factor || null,
                repeat_rule: t.repeatRule || t.repeat_rule || null,
                dependencies: t.dependencies || []
              }
            });
          }
        }
        applied++;

      } else if (ch.action === 'delete' && ch.entity === 'task') {
        // Scope gate for deletes. Admins pass through. Others may only
        // delete tasks whose client_id is in their scope.
        if (scopeSet !== null) {
          const existingClientId = deleteClientMap.get(ch.id);
          if (existingClientId === undefined) {
            // Task not found or not visible: treat as out of scope.
            rejectedOutOfScope++; continue;
          }
          if (!clientInScope(existingClientId)) { rejectedOutOfScope++; continue; }
        }
        const changedBy = req.user ? req.user.displayName : 'system';
        await auditLog('task', ch.id, 'delete', changedBy, null, conn);
        await conn.query('DELETE FROM tasks WHERE id = $1', [ch.id]);
        applied++;
      }
    }

    // Sync client briefs if provided
    if (briefList && typeof briefList === 'object') {
      for (const [name, brief] of Object.entries(briefList)) {
        await conn.query(
          `INSERT INTO clients (name, description, founded, headquarters, employees, revenue, website, linkedin_company, nbi_relationship)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (name) DO UPDATE SET description=$2, founded=$3, headquarters=$4, employees=$5, revenue=$6, website=$7, linkedin_company=$8, nbi_relationship=$9, updated_at=NOW()`,
          [name, brief.description || '', brief.founded || '', brief.headquarters || '',
           brief.employees || '', brief.revenue || '', brief.website || '',
           brief.linkedin || '', brief.nbiRelationship || '']
        );
        // Sync contacts
        if (Array.isArray(brief.contacts)) {
          const clientRow = await conn.query('SELECT id FROM clients WHERE name = $1', [name]);
          if (clientRow.rows.length > 0) {
            const cid = clientRow.rows[0].id;
            await conn.query('DELETE FROM contacts WHERE client_id = $1', [cid]);
            for (let i = 0; i < brief.contacts.length; i++) {
              const ct = brief.contacts[i];
              await conn.query(
                'INSERT INTO contacts (client_id, name, role, notes, background, linkedin, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
                [cid, ct.name || '', ct.role || '', ct.notes || '', ct.background || '', ct.linkedin || '', i]
              );
            }
          }
        }
      }
    }

    // Post-process state transitions (cancel cascade, repeat clones, blocker notifications)
    const blockerNotifications = []; // run after COMMIT
    for (const tr of postProcessTransitions) {
      const TERMINAL = ['Done', 'Cancelled'];
      // Cancel cascade for project-type items
      if (tr.newStatus === 'Cancelled' && tr.oldStatus !== 'Cancelled' && tr.itemType === 'project') {
        try {
          const { rows: cascaded } = await conn.query(`
            WITH RECURSIVE descendants AS (
              SELECT id FROM tasks WHERE parent_id = $1
              UNION ALL
              SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
            )
            UPDATE tasks SET status = 'Cancelled', updated_at = NOW()
            WHERE id IN (SELECT id FROM descendants) AND status != 'Cancelled'
            RETURNING id
          `, [tr.id]);
          if (cascaded.length > 0) {
            await auditLog('task', tr.id, 'cascade_cancel', req.user?.displayName || 'system', { count: cascaded.length }, conn);
          }
        } catch (e) {
          log('warn', 'Sync', 'Cascade cancel failed', { error: e.message });
        }
      }

      // Repeat clone when transitioning into Done or Cancelled
      if (TERMINAL.includes(tr.newStatus) && !TERMINAL.includes(tr.oldStatus) && tr.repeatRule) {
        try {
          const nextDate = computeNextRepeatDate(tr.repeatRule, new Date());
          if (nextDate) {
            const snap = tr.snapshot;
            const cloneRes = await conn.query(
              `INSERT INTO tasks
                (title, parent_id, client_id, item_type, status, priority, health_state, description, assignees,
                 hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, source,
                 collaborations, success_factor, repeat_rule)
                VALUES ($1,$2,$3,$4,'Not started',$5,$6,$7,$8,$9,0,$10,'','',$11,'repeat',$12,$13,$14)
                RETURNING id`,
              [snap.title, snap.parent_id, snap.client_id, snap.item_type, snap.priority || '',
               snap.health_state || '', snap.description || '', snap.assignees || [],
               snap.hours_estimated || 0, nextDate, snap.dependencies || [],
               snap.collaborations || null, snap.success_factor || null, tr.repeatRule]
            );
            await auditLog('task', cloneRes.rows[0].id, 'repeat_clone', req.user?.displayName || 'system', { source_task_id: tr.id, due_date: nextDate }, conn);
          }
        } catch (e) {
          log('warn', 'Sync', 'Repeat clone failed', { error: e.message });
        }
      }

      // Blocker notifications: queue for after COMMIT (createNotification uses pool, not conn)
      if (tr.newStatus === 'Blocked' && tr.oldStatus !== 'Blocked' && tr.blockerInfo && Array.isArray(tr.blockerInfo.internal)) {
        const internalNames = tr.blockerInfo.internal.filter(n => n && typeof n === 'string');
        if (internalNames.length > 0) {
          blockerNotifications.push({ taskId: tr.id, taskTitle: tr.title, names: internalNames });
        }
      }
    }

    await conn.query('COMMIT');

    // Send blocker notifications (after the transaction has committed)
    let notificationsSent = 0;
    for (const bn of blockerNotifications) {
      try {
        const { rows: matchedUsers } = await pool.query(
          'SELECT username, display_name FROM users WHERE display_name = ANY($1) OR username = ANY($1)',
          [bn.names]
        );
        for (const u of matchedUsers) {
          if (u.username && u.username !== req.user?.username) {
            await createNotification(
              u.username, 'warning',
              `Task blocking on you`,
              `Task "${bn.taskTitle}" is blocking on you.`,
              '/nbi_project_dashboard.html#workload'
            );
            notificationsSent++;
          }
        }
      } catch (e) {
        log('warn', 'Sync', 'Blocker notify failed', { error: e.message });
      }
    }

    res.json({ ok: true, applied, idMap, rejectedOutOfScope, notificationsSent });
  } catch (e) {
    await conn.query('ROLLBACK');
    log('error', 'Sync', 'Incremental sync failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/sync/poll?since=<ISO timestamp>
 * Lightweight polling endpoint — returns tasks updated after the given timestamp
 * plus the full list of current task IDs (so the client can detect deletions).
 *
 * Scoped by getClientScopes: admins and internal-no-team users see everything;
 * internal-with-team users see their team's clients + ALWAYS_VISIBLE_CLIENTS +
 * null-client tasks (internal work); G5 external users see only their own
 * client's tasks and never null-client tasks.
 */
app.get('/api/sync/poll', async (req, res) => {
  const since = req.query.since;
  if (!since) return res.status(400).json({ error: 'since parameter required' });

  const sinceDate = new Date(since);
  if (isNaN(sinceDate.getTime())) return res.status(400).json({ error: 'Invalid timestamp' });

  const scopes = await getClientScopes(req);
  const isExternal = !!req.user?.clientId;

  let updated, allIds;
  if (scopes === null) {
    // Unrestricted
    updated = await pool.query(`
      SELECT t.*, c.name as client_name
      FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.updated_at > $1
      ORDER BY t.updated_at
      LIMIT 501
    `, [sinceDate.toISOString()]);
    allIds = await pool.query('SELECT id FROM tasks WHERE updated_at > $1', [sinceDate.toISOString()]);
  } else {
    // Scoped. External users never see null-client tasks.
    const nullClause = isExternal ? '' : ' OR t.client_id IS NULL';
    updated = await pool.query(`
      SELECT t.*, c.name as client_name
      FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.updated_at > $1 AND (t.client_id = ANY($2)${nullClause})
      ORDER BY t.updated_at
      LIMIT 501
    `, [sinceDate.toISOString(), scopes]);
    const idNullClause = isExternal ? '' : ' OR client_id IS NULL';
    allIds = await pool.query(
      `SELECT id FROM tasks WHERE updated_at > $1 AND (client_id = ANY($2)${idNullClause})`,
      [sinceDate.toISOString(), scopes]
    );
  }
  const currentIds = allIds.rows.map(r => r.id);

  const hasMore = updated.rows.length > 500;
  const capped = hasMore ? updated.rows.slice(0, 500) : updated.rows;

  const updatedTasks = capped.map(r => ({
    id: r.id,
    title: r.title,
    parentId: r.parent_id,
    client: r.client_name || '',
    status: r.status,
    priority: r.priority || '',
    healthState: r.health_state || '',
    description: r.description || '',
    collaborations: r.collaborations || '',
    successFactor: r.success_factor || '',
    repeatRule: r.repeat_rule || null,
    blockerInfo: r.blocker_info || null,
    assignees: r.assignees || [],
    hoursEstimated: r.hours_estimated || 0,
    hoursSpent: r.hours_spent || 0,
    dueDate: r.due_date || '',
    startDate: r.start_date || '',
    endDate: r.end_date || '',
    dependencies: r.dependencies || [],
    practiceArea: r.practice_area || null,
    position: r.position || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  res.json({
    updated: updatedTasks,
    currentIds,
    hasMore,
    serverTime: new Date().toISOString(),
  });
});

// PUT /api/sync/tasks — REMOVED (B-B16). Was a destructive full-replace
// that DELETE FROM tasks then re-inserted everything. No frontend caller
// existed; the incremental POST /api/sync/changes replaced it. Keeping
// this comment so git blame shows the removal was intentional.

// Client briefs are still writable via POST /api/sync/changes (admin-only,
// scope-checked). The brief upsert block that lived here was a duplicate
// of the one in POST /api/sync/changes and is not preserved.

/* eslint-disable-next-line no-unused-vars -- placeholder to keep line numbers stable for any in-flight references */
void 0; // B-B16 removal anchor

/**
 * GET /api/sync/load
 * Bootstrap endpoint — loads all tasks, clients, contacts, and settings in one call.
 * Maps DB column names (snake_case) to frontend format (camelCase).
 * Used on initial dashboard load to avoid multiple round-trips.
 */
app.get('/api/sync/load', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const tasks = await pool.query(`
    SELECT t.*, c.name as client_name,
      (SELECT json_agg(json_build_object('text', n.text, 'time', n.created_at) ORDER BY n.created_at)
       FROM task_notes n WHERE n.task_id = t.id) as notes
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
    ORDER BY t.created_at
  `);

  const clients = await pool.query(`
    SELECT c.*,
      (SELECT json_agg(json_build_object('name', ct.name, 'role', ct.role, 'notes', ct.notes, 'background', ct.background, 'linkedin', ct.linkedin) ORDER BY ct.sort_order)
       FROM contacts ct WHERE ct.client_id = c.id) as contacts
    FROM clients c ORDER BY c.name
  `);

  // Settings are returned to the browser, so external users (G5) must see
  // only UI-relevant keys. fx_rates, expense_approver, feature flags, and
  // anything else internal is stripped for external accounts.
  const EXTERNAL_SETTINGS_ALLOW = new Set([
    'currency', 'hourly_rate', 'hourlyRate', 'date_format', 'dateFormat',
    'timezone', 'client_priority', 'clientPriority',
  ]);
  const settings = await pool.query('SELECT key, value FROM settings');
  const isExternal = !!req.user?.clientId;
  const settingsObj = {};
  settings.rows.forEach(r => {
    if (!isExternal || EXTERNAL_SETTINGS_ALLOW.has(r.key)) settingsObj[r.key] = r.value;
  });

  // Map tasks back to frontend format
  const taskIdMap = {};
  tasks.rows.forEach(r => { taskIdMap[r.id] = r; });

  const frontendTasks = tasks.rows.map(r => ({
    id: r.id,
    title: r.title,
    parentId: r.parent_id,
    client: r.client_name || '',
    status: r.status,
    priority: r.priority || '',
    healthState: r.health_state || '',
    description: r.description || '',
    collaborations: r.collaborations || '',
    successFactor: r.success_factor || '',
    repeatRule: r.repeat_rule || null,
    blockerInfo: r.blocker_info || null,
    assignees: r.assignees || [],
    hoursEstimated: r.hours_estimated || 0,
    hoursSpent: r.hours_spent || 0,
    dueDate: r.due_date || '',
    startDate: r.start_date || '',
    endDate: r.end_date || '',
    dependencies: r.dependencies || [],
    itemType: r.item_type || 'task',
    practiceArea: r.practice_area || null,
    position: r.position || 0,
    notes: r.notes || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    plannerTaskId: r.planner_task_id || '',
    sowId: r.sow_id || null,
  }));

  // Map client briefs to frontend format
  const frontendBriefs = {};
  clients.rows.forEach(r => {
    frontendBriefs[r.name] = {
      name: r.name,
      description: r.description || '',
      founded: r.founded || '',
      headquarters: r.headquarters || '',
      employees: r.employees || '',
      revenue: r.revenue || '',
      website: r.website || '',
      linkedinCompany: r.linkedin_company || '',
      nbiRelationship: r.nbi_relationship || '',
      practiceArea: r.practice_area || null,
      contacts: r.contacts || [],
    };
  });

  const scopes = await getClientScopes(req);
  let finalTasks = frontendTasks;
  let finalBriefs = frontendBriefs;
  let finalKnownClients = clients.rows;
  if (scopes) {
    const scopeSet = new Set(scopes);
    // Filter tasks to only those belonging to scoped clients. External (G5)
    // users never see null-client tasks (those are NBI-internal work, not
    // theirs). Internal-with-team users keep seeing null-client tasks.
    // The previous expression `r.client_id && scopeSet.has(r.client_id) || !r.client_id`
    // parses as (A && B) || C, which exposed every null-client task to every
    // scoped user regardless of their type — audit finding B-C6.
    const scopedTaskIds = new Set(tasks.rows.filter(r => {
      if (r.client_id) return scopeSet.has(r.client_id);
      return !isExternal;
    }).map(r => r.id));
    finalTasks = frontendTasks.filter(t => scopedTaskIds.has(t.id));
    finalKnownClients = clients.rows.filter(c => scopeSet.has(c.id));
    finalBriefs = {};
    finalKnownClients.forEach(r => { finalBriefs[r.name] = frontendBriefs[r.name]; });
  }

  res.json({
    tasks: finalTasks,
    clientBriefs: finalBriefs,
    settings: settingsObj,
    knownClients: finalKnownClients.map(r => r.name),
  });
});

// ==================== TASK NOTES ====================

/** POST /api/tasks/:taskId/notes — Add a quick note to a task (also bumps the task's updated_at) */
app.post('/api/tasks/:taskId/notes', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { text, author } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  const { rows } = await pool.query(
    'INSERT INTO task_notes (task_id, text, author) VALUES ($1, $2, $3) RETURNING *',
    [req.params.taskId, text, author || 'Glen']
  );
  // Update task's updated_at
  await pool.query('UPDATE tasks SET updated_at = NOW() WHERE id = $1', [req.params.taskId]);
  res.status(201).json(rows[0]);
});

// ==================== SETTINGS ====================

/** GET /api/settings — Return settings as a key-value object (external users see only safe keys) */
app.get('/api/settings', async (req, res) => {
  const SETTINGS_ALLOW = new Set([
    'currency', 'hourly_rate', 'hourlyRate', 'date_format', 'dateFormat',
    'timezone', 'client_priority', 'clientPriority',
  ]);
  const isExternal = !!req.user?.clientId;
  const { rows } = await pool.query('SELECT key, value FROM settings');
  const obj = {};
  rows.forEach(r => {
    if (!isExternal || SETTINGS_ALLOW.has(r.key)) obj[r.key] = r.value;
  });
  res.json(obj);
});

/** PUT /api/settings/:key — Upsert a single setting (admin only, stored as JSON) */
const SETTINGS_ALLOW_LIST = new Set([
  'page_permissions', 'expense_approver', 'fx_rates', 'theme',
  'dashboard_layout', 'notification_preferences', 'hourly_rate',
  'working_hours_per_week', 'currency', 'company_name',
]);
app.put('/api/settings/:key', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!SETTINGS_ALLOW_LIST.has(req.params.key)) {
    return res.status(400).json({ error: `Setting key '${req.params.key}' is not recognised` });
  }
  const { value } = req.body;
  await pool.query(
    'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
    [req.params.key, JSON.stringify(value)]
  );
  res.json({ ok: true });
});

// ==================== DASHBOARD AGGREGATES ====================

/**
 * GET /api/dashboard/summary
 * Compute dashboard statistics: task counts by status and health,
 * hours totals, breakdowns by client, and breakdowns by assignee.
 * Optionally filtered by client_id.
 */
app.get('/api/dashboard/summary', async (req, res) => {
  const scopes = await getClientScopes(req);
  let { client_id } = req.query;
  if (scopes && scopes.length === 1) client_id = scopes[0];
  let clientFilter = ''; let vals = [];
  if (client_id) { clientFilter = 'WHERE t.client_id = $1'; vals = [client_id]; }
  else if (scopes && scopes.length > 1) { clientFilter = 'WHERE t.client_id = ANY($1)'; vals = [scopes]; }

  const stats = await pool.query(`
    SELECT
      count(*) as total_tasks,
      count(*) FILTER (WHERE status = 'Not started') as not_started,
      count(*) FILTER (WHERE status = 'In progress') as in_progress,
      count(*) FILTER (WHERE status = 'Planning') as planning,
      count(*) FILTER (WHERE status = 'Done') as done,
      count(*) FILTER (WHERE status = 'Blocked') as blocked,
      count(*) FILTER (WHERE status = 'Cancelled') as cancelled,
      count(*) FILTER (WHERE health_state = 'Red') as health_red,
      count(*) FILTER (WHERE health_state = 'Yellow') as health_yellow,
      count(*) FILTER (WHERE health_state = 'Green') as health_green,
      count(*) FILTER (WHERE health_state = 'Blocked') as health_blocked,
      COALESCE(sum(hours_estimated), 0) as total_hours_estimated,
      COALESCE(sum(hours_spent), 0) as total_hours_spent
    FROM tasks t ${clientFilter}
  `, vals);

  let byClientQuery = `
    SELECT c.id, c.name,
      count(t.id) as task_count,
      count(t.id) FILTER (WHERE t.status = 'Done') as done_count,
      COALESCE(sum(t.hours_estimated), 0) as hours_estimated,
      COALESCE(sum(t.hours_spent), 0) as hours_spent
    FROM clients c
    LEFT JOIN tasks t ON t.client_id = c.id`;
  let byClientVals = [];
  if (scopes) {
    byClientQuery += ' WHERE c.id = ANY($1)';
    byClientVals = [scopes];
  }
  byClientQuery += ' GROUP BY c.id, c.name ORDER BY c.name';
  const byClient = await pool.query(byClientQuery, byClientVals);

  const byAssignee = await pool.query(`
    SELECT unnest(assignees) as assignee, count(*) as task_count,
      count(*) FILTER (WHERE status = 'In progress') as active_count
    FROM tasks t ${clientFilter}
    GROUP BY assignee ORDER BY task_count DESC
  `, vals);

  res.json({
    stats: stats.rows[0],
    by_client: byClient.rows,
    by_assignee: byAssignee.rows,
  });
});

/**
 * Compute a daily KPI snapshot from current task state.
 * Returns an object with all dashboard_snapshots columns (except id/created_at).
 */
async function computeDashboardSnapshot() {
  const today = new Date().toISOString().slice(0, 10);
  const { rows: taskRows } = await pool.query(`
    SELECT t.status, t.health_state, t.due_date, t.hours_spent, t.hours_estimated,
           t.parent_id, t.created_at::date as created_date, t.title
    FROM tasks t
  `);

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const roots = taskRows.filter(r => !r.parent_id && r.title && r.title.trim() !== 'New Task');
  const activeRoots = roots.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const overdue = taskRows.filter(r => r.due_date && r.status !== 'Done' && r.status !== 'Cancelled' && new Date(r.due_date) < now);
  const blocked = taskRows.filter(r => r.health_state === 'Blocked' && r.status !== 'Done' && r.status !== 'Cancelled');
  const atRisk = taskRows.filter(r => r.health_state === 'Red' && r.status !== 'Done' && r.status !== 'Cancelled');
  const hrsSpent = taskRows.reduce((s, r) => s + (parseFloat(r.hours_spent) || 0), 0);
  const hrsEst = taskRows.reduce((s, r) => s + (parseFloat(r.hours_estimated) || 0), 0);

  const activeTasks = taskRows.filter(r => r.status !== 'Done' && r.status !== 'Cancelled');
  const addedToday = taskRows.filter(r => r.created_date === today);
  const completedToday = taskRows.filter(r => r.status === 'Done');

  return {
    snapshot_date: today,
    active_projects: activeRoots.length,
    overdue_count: overdue.length,
    blocked_count: blocked.length,
    at_risk_count: atRisk.length,
    hours_spent: hrsSpent.toFixed(1),
    hours_estimated: hrsEst.toFixed(1),
    tasks_planned: activeTasks.length,
    tasks_added: addedToday.length,
    tasks_completed: completedToday.length,
  };
}

/**
 * GET /api/dashboard/snapshots?days=56
 * Returns daily KPI snapshots for the last N days (default 56 = 8 weeks).
 * Used for week-over-week trend deltas and the Work Completed chart.
 */
app.get('/api/dashboard/snapshots', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const days = Math.min(Math.max(parseInt(req.query.days) || 56, 1), 365);
  try {
    const { rows } = await pool.query(
      `SELECT snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count,
              hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed
       FROM dashboard_snapshots
       WHERE snapshot_date >= CURRENT_DATE - $1::integer
       ORDER BY snapshot_date ASC`,
      [days]
    );
    res.json({ snapshots: rows });
  } catch (e) {
    log('error', 'API', 'Dashboard snapshots query failed', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== LEADS TRACKER ====================
// CRM pipeline for tracking sales opportunities, from initial contact through to close.
// Supports configurable stages, resource requirements, activity logging, and revenue forecasting.

// --- Config endpoints (pipeline stages, resource types, field options) ---

/**
 * GET /api/leads/config
 * Return cached pipeline configuration: stages, resource types, and field option dropdowns.
 * Cache is invalidated whenever an admin modifies any config item.
 */
app.get('/api/leads/config', async (req, res) => {
  const config = await getCached('leads_config', async () => {
    const stages = await pool.query('SELECT * FROM lead_pipeline_stages ORDER BY sort_order');
    const resourceTypes = await pool.query('SELECT * FROM lead_resource_types WHERE is_active = true ORDER BY sort_order');
    const fieldOptions = await pool.query('SELECT * FROM lead_field_options WHERE is_active = true ORDER BY field_name, sort_order');
    const options = {};
    fieldOptions.rows.forEach(r => {
      if (!options[r.field_name]) options[r.field_name] = [];
      options[r.field_name].push({ id: r.id, value: r.value, sort_order: r.sort_order });
    });
    return { stages: stages.rows, resourceTypes: resourceTypes.rows, fieldOptions: options };
  });
  res.json(config);
});

/** POST /api/leads/stages — Create a new pipeline stage (admin only) */
app.post('/api/leads/stages', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, sort_order, colour, is_closed, is_won } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query(
    'INSERT INTO lead_pipeline_stages (name, sort_order, colour, is_closed, is_won) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, sort_order || 0, colour || '#666666', is_closed || false, is_won || false]
  );
  await auditLog('lead_config', rows[0].id, 'create', req.user.displayName, { type: 'stage', name });
  invalidateCache('leads_config');
  res.status(201).json(rows[0]);
});

/** PATCH /api/leads/stages/:id — Update a pipeline stage (admin only) */
app.patch('/api/leads/stages/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['name', 'sort_order', 'colour', 'is_closed', 'is_won']);
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE lead_pipeline_stages SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
  if (!rows[0]) return res.status(404).json({ error: 'Stage not found' });
  await auditLog('lead_config', req.params.id, 'update', req.user.displayName, req.body);
  invalidateCache('leads_config');
  res.json(rows[0]);
});

/** DELETE /api/leads/stages/:id — Remove a stage (blocked if leads still reference it) */
app.delete('/api/leads/stages/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const count = await pool.query('SELECT count(*) FROM leads WHERE stage_id = $1', [req.params.id]);
  if (parseInt(count.rows[0].count) > 0) return res.status(409).json({ error: 'Cannot delete stage with existing leads. Move leads first.' });
  await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [req.params.id]);
  await auditLog('lead_config', req.params.id, 'delete', req.user.displayName, { type: 'stage' });
  invalidateCache('leads_config');
  res.json({ ok: true });
});

/** POST /api/leads/resource-types — Create a resource type (e.g. "Analyst", "Designer") */
app.post('/api/leads/resource-types', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query(
    'INSERT INTO lead_resource_types (name, sort_order) VALUES ($1,$2) RETURNING *',
    [name, sort_order || 0]
  );
  await auditLog('lead_config', rows[0].id, 'create', req.user.displayName, { type: 'resource_type', name });
  invalidateCache('leads_config');
  res.status(201).json(rows[0]);
});

/** PATCH /api/leads/resource-types/:id — Update a resource type */
app.patch('/api/leads/resource-types/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['name', 'sort_order', 'is_active']);
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE lead_resource_types SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
  invalidateCache('leads_config');
  res.json(rows[0]);
});

/** DELETE /api/leads/resource-types/:id — Soft-delete if in use, hard-delete otherwise */
app.delete('/api/leads/resource-types/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const count = await pool.query('SELECT count(*) FROM lead_resources WHERE resource_type_id = $1', [req.params.id]);
  if (parseInt(count.rows[0].count) > 0) {
    // Soft-delete instead
    await pool.query('UPDATE lead_resource_types SET is_active = false WHERE id = $1', [req.params.id]);
    return res.json({ ok: true, soft_deleted: true });
  }
  await pool.query('DELETE FROM lead_resource_types WHERE id = $1', [req.params.id]);
  invalidateCache('leads_config');
  res.json({ ok: true });
});

/** POST /api/leads/field-options — Add a dropdown option for a lead field (e.g. work_type, service_line) */
app.post('/api/leads/field-options', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { field_name, value, sort_order } = req.body;
  if (!field_name || !value) return res.status(400).json({ error: 'field_name and value required' });
  const { rows } = await pool.query(
    'INSERT INTO lead_field_options (field_name, value, sort_order) VALUES ($1,$2,$3) RETURNING *',
    [field_name, value, sort_order || 0]
  );
  await auditLog('lead_config', rows[0].id, 'create', req.user.displayName, { type: 'field_option', field_name, value });
  invalidateCache('leads_config');
  res.status(201).json(rows[0]);
});

/** PATCH /api/leads/field-options/:id — Update a field option value (admin only) */
app.patch('/api/leads/field-options/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { value, sort_order } = req.body;
  if (!value) return res.status(400).json({ error: 'value required' });
  const { rows } = await pool.query('UPDATE lead_field_options SET value = $1, sort_order = COALESCE($2, sort_order) WHERE id = $3 RETURNING *', [value, sort_order, req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Option not found' });
  invalidateCache('leads_config');
  res.json(rows[0]);
});

/** DELETE /api/leads/field-options/:id — Remove a field option */
app.delete('/api/leads/field-options/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  await pool.query('DELETE FROM lead_field_options WHERE id = $1', [req.params.id]);
  invalidateCache('leads_config');
  res.json({ ok: true });
});

// --- Leads CRUD ---

/**
 * GET /api/leads
 * Paginated lead listing with filters: stage, client, owner, priority, sector, free-text search.
 * Includes joined stage, client, contact, and resource data.
 * Sorted by stage order, then priority, then creation date.
 */
app.get('/api/leads', async (req, res) => {
  let { stage_id, client_id, owner, priority, sector, search, sort, limit: qLimit, offset: qOffset, cursor } = req.query;
  const scopes = await getClientScopes(req);
  if (scopes && scopes.length === 1) { client_id = scopes[0]; }
  let where = []; let vals = []; let i = 1;

  if (stage_id) { where.push(`l.stage_id = $${i}`); vals.push(stage_id); i++; }
  if (client_id) { where.push(`l.client_id = $${i}`); vals.push(client_id); i++; }
  else if (scopes && scopes.length > 1) { where.push(`l.client_id = ANY($${i})`); vals.push(scopes); i++; }
  if (owner) { where.push(`l.deal_owner = $${i}`); vals.push(owner); i++; }
  if (priority) { where.push(`l.priority = $${i}`); vals.push(parseInt(priority)); i++; }
  if (sector) { where.push(`c.sector = $${i}`); vals.push(sector); i++; }
  if (search) {
    where.push(`(l.title ILIKE $${i} OR c.name ILIKE $${i} OR l.work_type ILIKE $${i} OR l.notes ILIKE $${i} OR l.location ILIKE $${i} OR l.deal_owner ILIKE $${i})`);
    vals.push('%' + search + '%'); i++;
  }

  // Cursor-based: filter leads created before the cursor timestamp
  if (cursor) {
    where.push(`l.created_at < $${i}`);
    vals.push(cursor);
    i++;
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const limit = Math.min(parseInt(qLimit) || 200, 500);
  const offset = parseInt(qOffset) || 0;

  // Fetch limit + 1 to determine hasMore
  const fetchLimit = limit + 1;
  vals.push(fetchLimit);
  let paginationClause;
  if (cursor) {
    paginationClause = `LIMIT $${i}`;
  } else {
    vals.push(offset);
    paginationClause = `LIMIT $${i} OFFSET $${i + 1}`;
  }

  const { rows } = await pool.query(`
    SELECT l.*, l.weighted_value,
      c.name as client_name, c.sector as client_sector,
      s.name as stage_name, s.colour as stage_colour, s.sort_order as stage_sort_order,
      s.is_closed, s.is_won,
      ct.name as primary_contact_name, ct.email as primary_contact_email, ct.phone as primary_contact_phone,
      (SELECT json_agg(json_build_object('resource_type_id', lr.resource_type_id, 'quantity', lr.quantity, 'notes', lr.notes,
        'resource_name', rt.name) ORDER BY rt.sort_order)
       FROM lead_resources lr JOIN lead_resource_types rt ON lr.resource_type_id = rt.id WHERE lr.lead_id = l.id) as resources
    FROM leads l
    LEFT JOIN clients c ON l.client_id = c.id
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    LEFT JOIN contacts ct ON l.primary_contact_id = ct.id
    ${whereClause}
    ORDER BY s.sort_order, l.position, l.created_at DESC
    ${paginationClause}
  `, vals);

  const hasMore = rows.length > limit;
  const leads = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && leads.length > 0 ? leads[leads.length - 1].created_at : null;

  // Count query (uses only filter params, not cursor/limit/offset)
  const countFilterWhere = [];
  const countVals = [];
  let ci = 1;
  if (stage_id) { countFilterWhere.push(`l.stage_id = $${ci}`); countVals.push(stage_id); ci++; }
  if (client_id) { countFilterWhere.push(`l.client_id = $${ci}`); countVals.push(client_id); ci++; }
  if (owner) { countFilterWhere.push(`l.deal_owner = $${ci}`); countVals.push(owner); ci++; }
  if (priority) { countFilterWhere.push(`l.priority = $${ci}`); countVals.push(parseInt(priority)); ci++; }
  if (sector) { countFilterWhere.push(`c.sector = $${ci}`); countVals.push(sector); ci++; }
  if (search) { countFilterWhere.push(`(l.title ILIKE $${ci} OR c.name ILIKE $${ci} OR l.work_type ILIKE $${ci} OR l.notes ILIKE $${ci} OR l.location ILIKE $${ci} OR l.deal_owner ILIKE $${ci})`); countVals.push('%' + search + '%'); ci++; }
  const countWhere = countFilterWhere.length > 0 ? 'WHERE ' + countFilterWhere.join(' AND ') : '';

  const countResult = await pool.query(
    `SELECT count(*) FROM leads l LEFT JOIN clients c ON l.client_id = c.id JOIN lead_pipeline_stages s ON l.stage_id = s.id LEFT JOIN contacts ct ON l.primary_contact_id = ct.id ${countWhere}`,
    countVals
  );

  res.json({ leads, total: parseInt(countResult.rows[0].count), limit, offset, nextCursor, hasMore });
});

/** GET /api/leads/reminders — Return open leads whose follow-up date is today or overdue */
app.get('/api/leads/reminders', async (req, res) => {
  const scopes = await getClientScopes(req);
  let scopeFilter = '';
  let vals = [];
  if (scopes) {
    scopeFilter = ' AND l.client_id = ANY($1)';
    vals = [scopes];
  }
  const { rows } = await pool.query(`
    SELECT l.id, l.title, l.next_followup_date, l.next_action, l.deal_owner,
      c.name as client_name, s.name as stage_name
    FROM leads l
    LEFT JOIN clients c ON l.client_id = c.id
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    WHERE l.next_followup_date <= CURRENT_DATE AND s.is_closed = false${scopeFilter}
    ORDER BY l.next_followup_date ASC
  `, vals);
  res.json(rows);
});

/**
 * GET /api/leads/pipeline/summary
 * Aggregate pipeline view: deal count, ROM range, and weighted value per stage.
 * Grouped by currency. Also returns FX rates from settings for GBP conversion.
 */
app.get('/api/leads/pipeline/summary', async (req, res) => {
  const scopes = await getClientScopes(req);
  const { sector } = req.query;
  let filters = [];
  let vals = [];
  let i = 1;
  if (sector) { filters.push(`c.sector = $${i}`); vals.push(sector); i++; }
  if (scopes) { filters.push(`l.client_id = ANY($${i})`); vals.push(scopes); i++; }
  const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';

  const byStage = await pool.query(`
    SELECT s.id, s.name, s.colour, s.sort_order, s.is_closed, s.is_won,
      count(l.id)::int as deal_count,
      COALESCE(sum(l.rom_min), 0)::numeric as total_rom_min,
      COALESCE(sum(l.rom_max), 0)::numeric as total_rom_max,
      COALESCE(sum(l.weighted_value), 0)::numeric as total_weighted
    FROM lead_pipeline_stages s
    LEFT JOIN leads l ON l.stage_id = s.id
    LEFT JOIN clients c ON l.client_id = c.id
    ${whereClause}
    GROUP BY s.id, s.name, s.colour, s.sort_order, s.is_closed, s.is_won
    ORDER BY s.sort_order
  `, vals);

  const fxResult = await pool.query("SELECT value FROM settings WHERE key = 'fx_rates'");
  const fxRates = fxResult.rows.length > 0 ? fxResult.rows[0].value : { USD: 0.79, EUR: 0.86 };

  res.json({ byStage: byStage.rows, fxRates });
});

/** GET /api/leads/pipeline/forecast — Monthly revenue forecast from open deals with expected close dates */
app.get('/api/leads/pipeline/forecast', async (req, res) => {
  const scopes = await getClientScopes(req);
  let scopeFilter = '';
  let vals = [];
  if (scopes) {
    scopeFilter = ' AND l.client_id = ANY($1)';
    vals = [scopes];
  }
  const { rows } = await pool.query(`
    SELECT
      to_char(l.expected_close_date, 'YYYY-MM') as month,
      l.currency,
      count(*) as deal_count,
      COALESCE(sum(l.weighted_value), 0) as total_weighted,
      COALESCE(sum(l.rom_max), 0) as total_rom
    FROM leads l
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    WHERE l.expected_close_date IS NOT NULL AND s.is_closed = false${scopeFilter}
    GROUP BY to_char(l.expected_close_date, 'YYYY-MM'), l.currency
    ORDER BY month
  `, vals);
  res.json(rows);
});

/**
 * GET /api/leads/:id
 * Full lead detail: includes client info, resources, recent activities, and client contacts.
 */
app.get('/api/leads/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID' });
  const { rows } = await pool.query(`
    SELECT l.*, l.weighted_value,
      c.name as client_name, c.sector as client_sector,
      c.description as client_description, c.website as client_website,
      c.headquarters as client_hq, c.linkedin_company as client_linkedin,
      c.nbi_relationship as client_nbi_relationship,
      s.name as stage_name, s.colour as stage_colour, s.is_closed, s.is_won,
      ct.name as primary_contact_name, ct.email as primary_contact_email, ct.phone as primary_contact_phone,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', lr.id, 'lead_id', lr.lead_id, 'resource_type_id', lr.resource_type_id,
          'quantity', lr.quantity, 'notes', lr.notes, 'resource_name', rt.name
        ) ORDER BY rt.sort_order)
        FROM lead_resources lr JOIN lead_resource_types rt ON lr.resource_type_id = rt.id
        WHERE lr.lead_id = l.id),
        '[]'::json
      ) AS resources,
      COALESCE(
        (SELECT json_agg(row_to_json(la.*) ORDER BY la.created_at DESC)
         FROM (SELECT * FROM lead_activities WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 50) la),
        '[]'::json
      ) AS activities,
      COALESCE(
        (SELECT json_agg(row_to_json(cc.*) ORDER BY cc.name)
         FROM contacts cc WHERE cc.client_id = l.client_id),
        '[]'::json
      ) AS client_contacts
    FROM leads l
    LEFT JOIN clients c ON l.client_id = c.id
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    LEFT JOIN contacts ct ON l.primary_contact_id = ct.id
    WHERE l.id = $1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
  res.json(rows[0]);
});

/**
 * POST /api/leads
 * Create a new lead/opportunity. Also inserts resource requirements and
 * a "created" activity log entry. Runs in a transaction.
 */
app.post('/api/leads', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { client_id, title, work_type, service_line, stage_id, priority, currency,
    rom_min, rom_max, rom_text, win_probability, primary_contact_id, deal_owner,
    lead_source, est_start_date, expected_close_date, last_contacted,
    next_followup_date, next_action, location, notes, time_estimate, resources } = req.body;

  if (!title) return res.status(400).json({ error: 'Title required' });
  if (!stage_id) return res.status(400).json({ error: 'Stage required' });
  const lenErr = validateLength(title, 'title') || validateLength(notes, 'notes');
  if (lenErr) return res.status(400).json({ error: lenErr });

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    // Shift all leads in the target stage down by 1 so the new lead lands at position 0
    await shiftForInsert(conn, 'leads', 'stage_id', stage_id);
    const { rows } = await conn.query(
      `INSERT INTO leads (client_id, title, work_type, service_line, stage_id, priority, currency,
        rom_min, rom_max, rom_text, win_probability, primary_contact_id, deal_owner,
        lead_source, est_start_date, expected_close_date, last_contacted,
        next_followup_date, next_action, location, notes, time_estimate, created_by, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,0) RETURNING *`,
      [client_id || null, title, work_type || null, service_line || null, stage_id,
        priority || null, currency || 'GBP',
        rom_min || null, rom_max || null, rom_text || null, win_probability || null,
        primary_contact_id || null, deal_owner || null, lead_source || null,
        est_start_date || null, expected_close_date || null, last_contacted || null,
        next_followup_date || null, next_action || null, location || null,
        notes || null, time_estimate || null, req.user?.displayName || 'unknown']
    );

    const leadId = rows[0].id;

    // Insert resources if provided
    if (Array.isArray(resources)) {
      for (const r of resources) {
        if (r.resource_type_id) {
          await conn.query(
            'INSERT INTO lead_resources (lead_id, resource_type_id, quantity, notes) VALUES ($1,$2,$3,$4)',
            [leadId, r.resource_type_id, r.quantity || 1, r.notes || null]
          );
        }
      }
    }

    // Create activity entry
    await conn.query(
      'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4)',
      [leadId, 'created', `Lead created: ${title}`, req.user?.displayName || 'unknown']
    );

    await conn.query('COMMIT');
    await auditLog('lead', leadId, 'create', req.user?.displayName, { title, stage_id, client_id });

    // Return full lead with joins
    const full = await pool.query(`
      SELECT l.*, l.weighted_value, c.name as client_name, s.name as stage_name, s.colour as stage_colour
      FROM leads l LEFT JOIN clients c ON l.client_id = c.id
      JOIN lead_pipeline_stages s ON l.stage_id = s.id WHERE l.id = $1
    `, [leadId]);
    res.status(201).json(full.rows[0]);
  } catch (e) {
    await conn.query('ROLLBACK');
    log('error', 'Leads', 'Lead creation failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    conn.release();
  }
});

/**
 * PATCH /api/leads/:id
 * Update lead fields. Detects stage and priority changes and creates
 * activity log entries for them automatically.
 */
app.patch('/api/leads/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  // stage_id is routed through reorderInGroup below — NOT in patchFields.
  const patchFields = ['client_id', 'title', 'work_type', 'service_line', 'priority',
    'currency', 'rom_min', 'rom_max', 'rom_text', 'win_probability',
    'primary_contact_id', 'deal_owner', 'lead_source',
    'est_start_date', 'expected_close_date', 'last_contacted',
    'next_followup_date', 'next_action', 'location', 'notes', 'time_estimate',
    'completed_at', 'practice_area'];

  const sanitisedBody = { ...req.body };
  for (const f of patchFields) {
    if (sanitisedBody[f] === '') sanitisedBody[f] = null;
  }
  const { updates, vals, nextIdx } = buildPatchQuery(sanitisedBody, patchFields);
  if (req.body.title !== undefined && !req.body.title.trim()) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }
  const wantsReorder = (req.body.stage_id !== undefined) || (req.body.position !== undefined);
  if (updates.length === 0 && !wantsReorder) return res.status(400).json({ error: 'No valid fields to update' });

  // Fetch old values for change detection + activity logging
  const oldResult = await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
  if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
  const oldLead = oldResult.rows[0];

  // Run reorder + field update atomically
  const conn = await pool.connect();
  let updatedRow;
  try {
    await conn.query('BEGIN');

    if (wantsReorder) {
      const targetStage = (req.body.stage_id !== undefined && req.body.stage_id !== '')
        ? req.body.stage_id
        : oldLead.stage_id;
      const targetPos = (typeof req.body.position === 'number' && Number.isInteger(req.body.position))
        ? req.body.position
        : 0;
      await reorderInGroup(conn, 'leads', 'stage_id', req.params.id, targetStage, targetPos);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      vals.push(req.params.id);
      await conn.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = $${nextIdx}`, vals);
    }

    const fresh = await conn.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    updatedRow = fresh.rows[0];
    await conn.query('COMMIT');
  } catch (err) {
    await conn.query('ROLLBACK');
    log('error', 'Leads', 'PATCH failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to update lead' });
  } finally {
    conn.release();
  }

  // Build change log against the freshly-updated row (includes stage_id/position)
  const changes = {};
  const allFields = [...patchFields, 'stage_id', 'position'];
  for (const f of allFields) {
    if (sanitisedBody[f] !== undefined || (f === 'position' && req.body.position !== undefined) || (f === 'stage_id' && req.body.stage_id !== undefined)) {
      const oldVal = oldLead[f];
      const newVal = updatedRow[f];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[f] = { from: oldVal, to: newVal };
      }
    }
  }

  if (changes.stage_id) {
    // Look up stage names for the activity entry
    const oldStage = await pool.query('SELECT name FROM lead_pipeline_stages WHERE id = $1', [changes.stage_id.from]);
    const newStage = await pool.query('SELECT name FROM lead_pipeline_stages WHERE id = $1', [changes.stage_id.to]);
    const desc = `Stage changed from ${oldStage.rows[0]?.name || '?'} to ${newStage.rows[0]?.name || '?'}`;
    await pool.query(
      'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4)',
      [req.params.id, 'stage_change', desc, req.user?.displayName || 'unknown']
    );
  }
  if (changes.priority) {
    await pool.query(
      'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4)',
      [req.params.id, 'priority_change', `Priority changed from ${changes.priority.from || 'none'} to ${changes.priority.to || 'none'}`, req.user?.displayName || 'unknown']
    );
  }

  if (Object.keys(changes).length > 0) {
    await auditLog('lead', req.params.id, 'update', req.user?.displayName, changes);
  }

  // Return full lead with joins
  const full = await pool.query(`
    SELECT l.*, l.weighted_value, c.name as client_name, c.sector as client_sector,
      s.name as stage_name, s.colour as stage_colour, s.is_closed, s.is_won
    FROM leads l LEFT JOIN clients c ON l.client_id = c.id
    JOIN lead_pipeline_stages s ON l.stage_id = s.id WHERE l.id = $1
  `, [req.params.id]);
  res.json(full.rows[0]);
});

/** DELETE /api/leads/:id — Delete a lead and its related resources/activities (admin only) */
app.delete('/api/leads/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const lead = await pool.query('SELECT title FROM leads WHERE id = $1', [req.params.id]);
  await auditLog('lead', req.params.id, 'delete', req.user.displayName, { title: lead.rows[0]?.title });
  await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// --- Lead Resources ---

/**
 * PUT /api/leads/:id/resources
 * Replace all resource requirements for a lead (delete + re-insert in a transaction).
 * Each resource specifies a type and quantity (e.g. 2 x Analyst, 1 x Designer).
 */
app.put('/api/leads/:id/resources', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { resources } = req.body;
  if (!Array.isArray(resources)) return res.status(400).json({ error: 'resources array required' });

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    await conn.query('DELETE FROM lead_resources WHERE lead_id = $1', [req.params.id]);
    for (const r of resources) {
      if (r.resource_type_id) {
        await conn.query(
          'INSERT INTO lead_resources (lead_id, resource_type_id, quantity, notes) VALUES ($1,$2,$3,$4)',
          [req.params.id, r.resource_type_id, r.quantity || 1, r.notes || null]
        );
      }
    }
    await conn.query('COMMIT');
    res.json({ ok: true, count: resources.length });
  } catch (e) {
    await conn.query('ROLLBACK');
    log('error', 'Leads', 'Lead resources update failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    conn.release();
  }
});

// --- Lead Activities ---

/** GET /api/leads/:id/activities — Activity timeline for a lead, newest first */
app.get('/api/leads/:id/activities', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json(rows);
});

/** POST /api/leads/:id/activities — Log a manual activity (call, email, meeting, etc.) against a lead */
app.post('/api/leads/:id/activities', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { activity_type, description } = req.body;
  if (!activity_type || !description) return res.status(400).json({ error: 'activity_type and description required' });
  const { rows } = await pool.query(
    'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.params.id, activity_type, description, req.user?.displayName || 'unknown']
  );
  res.status(201).json(rows[0]);
});

// ==================== EXPENSE REPORTS ====================
// Expense tracking with approval workflow: employees submit expenses (pending),
// admins approve/reject them. Receipts can be attached as file uploads.

/** GET /api/expenses/categories — List active expense categories */
app.get('/api/expenses/categories', requireInternal, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM expense_categories WHERE is_active = TRUE ORDER BY sort_order, name');
  res.json(rows);
});

/** POST /api/expenses/categories — Create an expense category (admin only) */
app.post('/api/expenses/categories', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query('INSERT INTO expense_categories (name) VALUES ($1) RETURNING *', [name.trim()]);
  invalidateCache('expense_categories');
  res.status(201).json(rows[0]);
});

/** DELETE /api/expenses/categories/:id — Remove an expense category (admin only, checks references) */
app.delete('/api/expenses/categories/:id', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const refs = await pool.query('SELECT count(*)::int AS count FROM expenses WHERE category_id = $1', [req.params.id]);
  if (refs.rows[0].count > 0) return res.status(400).json({ error: `Cannot delete: ${refs.rows[0].count} expenses use this category. Reassign them first.` });
  await pool.query('DELETE FROM expense_categories WHERE id = $1', [req.params.id]);
  invalidateCache('expense_categories');
  res.json({ ok: true });
});

/**
 * GET /api/expenses
 * List expenses. Non-admin users only see their own; admins see all.
 * Filterable by user_id, status, and date range.
 */
app.get('/api/expenses', requireInternal, async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const { user_id, status, from_date, to_date } = req.query;

  let where = [];
  let vals = [];
  let i = 1;

  // Non-admin users can only see their own
  if (!isAdmin) {
    where.push(`e.user_id = $${i}`); vals.push(req.user.id); i++;
  } else if (user_id) {
    where.push(`e.user_id = $${i}`); vals.push(user_id); i++;
  }
  if (status) { where.push(`e.status = $${i}`); vals.push(status); i++; }
  if (from_date) { where.push(`e.date >= $${i}`); vals.push(from_date); i++; }
  if (to_date) { where.push(`e.date <= $${i}`); vals.push(to_date); i++; }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const { rows } = await pool.query(`
    SELECT e.*, u.display_name AS employee_name, c.name AS category_name,
      (SELECT count(*) FROM expense_receipts r WHERE r.expense_id = e.id)::int AS receipt_count,
      er.title AS report_title
    FROM expenses e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN expense_categories c ON e.category_id = c.id
    LEFT JOIN expense_reports er ON e.report_id = er.id
    ${whereClause}
    ORDER BY e.date DESC, e.created_at DESC
  `, vals);
  res.json({ expenses: rows });
});

/**
 * GET /api/expenses/summary
 * Admin-only aggregate view: totals by employee and by category.
 * NB: This route must be defined before the :id route to avoid path conflicts.
 */
app.get('/api/expenses/summary', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { from_date, to_date } = req.query;

  let where = [];
  let vals = [];
  let i = 1;
  if (from_date) { where.push(`e.date >= $${i}`); vals.push(from_date); i++; }
  if (to_date) { where.push(`e.date <= $${i}`); vals.push(to_date); i++; }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const byEmployee = await pool.query(`
    SELECT u.display_name, e.status, count(*)::int AS count, sum(e.amount)::numeric AS total
    FROM expenses e JOIN users u ON e.user_id = u.id
    ${whereClause}
    GROUP BY u.display_name, e.status ORDER BY u.display_name
  `, vals);

  const byCategory = await pool.query(`
    SELECT COALESCE(c.name, 'Uncategorised') AS category, count(*)::int AS count, sum(e.amount)::numeric AS total
    FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id
    ${whereClause}
    GROUP BY c.name ORDER BY total DESC
  `, vals);

  res.json({ byEmployee: byEmployee.rows, byCategory: byCategory.rows });
});

/** GET /api/expenses/:id — Get a single expense with its receipt attachments. Access: own or admin. */
app.get('/api/expenses/:id', requireInternal, async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid expense ID' });
  const { rows } = await pool.query(`
    SELECT e.*, u.display_name AS employee_name, c.name AS category_name,
      er.title AS report_title, er.status AS report_status
    FROM expenses e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN expense_categories c ON e.category_id = c.id
    LEFT JOIN expense_reports er ON e.report_id = er.id
    WHERE e.id = $1
  `, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
  const expense = rows[0];

  // Access check: own expense or admin
  if (req.user.role !== 'admin' && expense.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const receipts = await pool.query('SELECT * FROM expense_receipts WHERE expense_id = $1 ORDER BY created_at', [req.params.id]);
  expense.receipts = receipts.rows;
  res.json(expense);
});

/** POST /api/expenses — Submit a new expense (always created as "pending") */
app.post('/api/expenses', requireInternal, async (req, res) => {
  const { date, amount, currency, category_id, description, notes, vat_amount } = req.body;
  if (!date || amount == null) return res.status(400).json({ error: 'Date and amount are required' });
  const lenErr = validateLength(description, 'description') || validateLength(notes, 'notes');
  if (lenErr) return res.status(400).json({ error: lenErr });
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ error: 'Amount must be a valid positive number' });
  const parsedVat = vat_amount != null ? parseFloat(vat_amount) : null;
  if (parsedVat !== null && (isNaN(parsedVat) || parsedVat < 0)) return res.status(400).json({ error: 'VAT amount must be a valid positive number' });

  const { rows } = await pool.query(
    `INSERT INTO expenses (user_id, date, amount, currency, category_id, description, notes, vat_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.user.id, date, amount, currency || 'GBP', category_id || null, description || null, notes || null, parsedVat]
  );
  await auditLog('expense', rows[0].id, 'create', req.user.displayName, { amount, date, description, vat_amount: parsedVat });
  res.status(201).json(rows[0]);
});

/**
 * PATCH /api/expenses/:id
 * Update an expense. Owners can only edit pending expenses; admins can also change status.
 * When an admin changes status, reviewed_by and reviewed_at are set automatically.
 */
app.patch('/api/expenses/:id', requireInternal, async (req, res) => {
  // Validate UUID format to prevent 500 errors from invalid IDs
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  const check = await pool.query('SELECT user_id, status FROM expenses WHERE id = $1', [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
  const expense = check.rows[0];

  const isAdmin = req.user && req.user.role === 'admin';
  const isOwner = expense.user_id === req.user.id;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Access denied' });

  // Only admin can change status; owners can only edit pending expenses
  if (!isAdmin && expense.status !== 'pending') {
    return res.status(400).json({ error: 'Cannot edit an expense that has been reviewed' });
  }

  // Validate amount if provided
  if (req.body.amount !== undefined && (isNaN(req.body.amount) || parseFloat(req.body.amount) <= 0)) {
    return res.status(400).json({ error: 'Amount must be a valid positive number' });
  }

  // Text fields are stored raw; escaping happens at render time in the frontend (esc()).
  const allowed = ['date', 'amount', 'currency', 'category_id', 'description', 'notes', 'vat_amount'];
  // Admin-only fields. reviewed_by and reviewed_at are NOT in the allow-list
  // (audit finding B-C3) — admins could otherwise forge the audit trail by
  // setting reviewed_by to any string or backdating reviewed_at, defeating
  // the legal control on reimbursements. Both are always server-stamped
  // below when status changes.
  if (isAdmin) allowed.push('status');

  const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowed);
  let idx = nextIdx;
  // Auto-set review fields when admin changes status. These are always
  // server-stamped; any reviewed_by/reviewed_at in the body is ignored.
  if (isAdmin && req.body.status && req.body.status !== expense.status) {
    updates.push(`reviewed_by = $${idx}`); vals.push(req.user.displayName); idx++;
    updates.push(`reviewed_at = $${idx}`); vals.push(new Date().toISOString()); idx++;
  }
  updates.push(`updated_at = $${idx}`); vals.push(new Date().toISOString()); idx++;

  if (updates.length <= 1) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
  await auditLog('expense', req.params.id, 'update', req.user.displayName, req.body);
  res.json(rows[0]);
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense and its receipt files from disk.
 * Owners can only delete pending expenses; admins can delete any.
 */
app.delete('/api/expenses/:id', requireInternal, async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid expense ID' });
  const check = await pool.query('SELECT user_id, status FROM expenses WHERE id = $1', [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
  const expense = check.rows[0];

  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin && expense.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (!isAdmin && expense.status !== 'pending') return res.status(400).json({ error: 'Cannot delete a reviewed expense' });

  // Delete receipt files
  const receipts = await pool.query('SELECT filename FROM expense_receipts WHERE expense_id = $1', [req.params.id]);
  for (const r of receipts.rows) {
    const filePath = path.resolve(uploadDir, r.filename);
    if (filePath.startsWith(path.resolve(uploadDir) + path.sep) && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
  await auditLog('expense', req.params.id, 'delete', req.user.displayName);
  res.json({ ok: true });
});

/** POST /api/expenses/:id/receipts — Upload a receipt image/PDF for an expense */
app.post('/api/expenses/:id/receipts', requireInternal, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Check ownership
  const check = await pool.query('SELECT user_id FROM expenses WHERE id = $1', [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin && check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const { rows } = await pool.query(
    `INSERT INTO expense_receipts (expense_id, filename, original_name, size_bytes, mime_type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.params.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.user.displayName]
  );
  res.status(201).json(rows[0]);
});

/** DELETE /api/expenses/:id/receipts/:receiptId — Remove a receipt and delete the file from disk */
app.delete('/api/expenses/:id/receipts/:receiptId', requireInternal, async (req, res) => {
  const check = await pool.query('SELECT e.user_id FROM expenses e JOIN expense_receipts r ON r.expense_id = e.id WHERE r.id = $1 AND e.id = $2', [req.params.receiptId, req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Receipt not found' });
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin && check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const receipt = await pool.query('SELECT filename FROM expense_receipts WHERE id = $1', [req.params.receiptId]);
  if (receipt.rows.length > 0) {
    const filePath = path.resolve(uploadDir, receipt.rows[0].filename);
    if (filePath.startsWith(path.resolve(uploadDir) + path.sep) && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM expense_receipts WHERE id = $1', [req.params.receiptId]);
  }
  res.json({ ok: true });
});

// ==================== RECEIPT OCR & PARSING ====================

/**
 * Extract structured data from receipt text using regex patterns.
 * Identifies amounts, dates, currency, vendor name, and VAT.
 * @param {string} text - Raw OCR text from the receipt image
 * @returns {{date: string|null, amount: number|null, currency: string, description: string, vendor: string, vat_amount: number|null}}
 */
function extractReceiptFields(text) {
  const result = { date: null, amount: null, currency: 'GBP', description: '', vendor: '', vat_amount: null };
  if (!text) return result;

  // Extract all amounts — the largest is usually the total
  const amountMatches = [];
  // Pattern 1: currency symbol + number
  for (const m of text.matchAll(/[\u00a3\$\u20ac]\s*([\d,]+\.?\d{0,2})/gi)) {
    amountMatches.push({ value: parseFloat(m[1].replace(/,/g, '')), raw: m[0] });
  }
  // Pattern 2: "total/amount/due" label + number
  for (const m of text.matchAll(/(?:total|amount|grand total|sum|balance|due|subtotal)[:\s]*[\u00a3\$\u20ac]?\s*([\d,]+\.\d{2})/gi)) {
    amountMatches.push({ value: parseFloat(m[1].replace(/,/g, '')), isTotal: true, raw: m[0] });
  }
  // Prefer labelled totals, otherwise take the largest amount
  const totals = amountMatches.filter(a => a.isTotal);
  if (totals.length > 0) result.amount = Math.max(...totals.map(a => a.value));
  else if (amountMatches.length > 0) result.amount = Math.max(...amountMatches.map(a => a.value));

  // Extract date — try multiple formats
  const datePatterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,       // DD/MM/YYYY or MM/DD/YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,        // YYYY-MM-DD
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i, // 5 Mar 2026
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{4})/i, // Mar 5, 2026
  ];
  const monthMap = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) {
      if (m[2] && monthMap[m[2].toLowerCase().slice(0,3)] !== undefined) {
        // "5 Mar 2026" format
        result.date = `${m[3]}-${String(monthMap[m[2].toLowerCase().slice(0,3)]).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
      } else if (m[1] && monthMap[m[1].toLowerCase().slice(0,3)] !== undefined) {
        // "Mar 5, 2026" format
        result.date = `${m[3]}-${String(monthMap[m[1].toLowerCase().slice(0,3)]).padStart(2,'0')}-${m[2].padStart(2,'0')}`;
      } else if (m[1].length === 4) {
        // YYYY-MM-DD
        result.date = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
      } else {
        // DD/MM/YYYY (UK format)
        result.date = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
      }
      break;
    }
  }
  if (!result.date) result.date = new Date().toISOString().slice(0, 10);

  // Currency — only set from explicit text mentions, not symbols (OCR misreads £ as $ too often)
  if (/\bUSD\b|United States Dollar/i.test(text)) result.currency = 'USD';
  else if (/\bGBP\b|British Pound|Sterling/i.test(text)) result.currency = 'GBP';
  else if (/\bEUR\b|\bEuro\b/i.test(text)) result.currency = 'EUR';
  else if (/\bSEK\b|Swedish Kron/i.test(text)) result.currency = 'SEK';
  else result.currency = null; // Let user pick from dropdown

  // Vendor — first substantial line (skip very short lines, numbers-only lines)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && !/^\d+[\.\d]*$/.test(l) && !/^[-=*_]+$/.test(l));
  if (lines.length > 0) result.vendor = lines[0].substring(0, 120);

  // Itemisation — extract labelled amounts (fare, tip, tax, subtotal, etc.)
  const items = [];
  const itemPatterns = [
    /(?:fare|base\s*fare|ride|trip)[:\s]*[\u00a3\$\u20ac]?\s*([\d,]+\.\d{2})/gi,
    /(?:tip|gratuity)[:\s]*[\u00a3\$\u20ac]?\s*([\d,]+\.\d{2})/gi,
    /(?:tax|vat|gst)[:\s]*[\u00a3\$\u20ac]?\s*([\d,]+\.\d{2})/gi,
    /(?:subtotal|sub[\s-]total)[:\s]*[\u00a3\$\u20ac]?\s*([\d,]+\.\d{2})/gi,
    /(?:discount|promo)[:\s]*-?[\u00a3\$\u20ac]?\s*([\d,]+\.\d{2})/gi,
    /(?:service\s*(?:fee|charge)|booking\s*fee|delivery)[:\s]*[\u00a3\$\u20ac]?\s*([\d,]+\.\d{2})/gi,
  ];
  for (const pat of itemPatterns) {
    for (const m of text.matchAll(pat)) {
      const label = m[0].split(/[\u00a3\$\u20ac\d]/)[0].replace(/[:\s]+$/, '').trim();
      items.push(`${label}: ${result.currency === 'USD' ? '$' : result.currency === 'EUR' ? '\u20ac' : '\u00a3'}${m[1]}`);
    }
  }

  // Extract VAT/tax amount specifically
  const vatPattern = /(?:tax|vat|gst)[:\s]*[\u00a3\$\u20ac]?\s*([\d,]+\.\d{2})/gi;
  const vatMatches = [];
  for (const m of text.matchAll(vatPattern)) {
    vatMatches.push(parseFloat(m[1].replace(/,/g, '')));
  }
  if (vatMatches.length > 0) result.vat_amount = Math.max(...vatMatches);

  // Description — itemised breakdown if found, otherwise line items with amounts
  if (items.length > 0) {
    result.description = (result.vendor ? result.vendor + ' — ' : '') + items.join(', ');
  } else {
    const itemLines = lines.filter(l => /[\u00a3\$\u20ac]?\s*\d+\.\d{2}/.test(l) && l.length > 5).slice(0, 5);
    if (itemLines.length > 0) result.description = itemLines.join('; ').substring(0, 300);
    else result.description = result.vendor;
  }

  return result;
}

/** POST /api/expenses/from-receipt — Upload a receipt, OCR/extract fields, create expense + attach receipt */
app.post('/api/expenses/from-receipt', requireInternal, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Extend timeout for OCR processing (can take 10-30s on first run)
  req.setTimeout(120000);
  res.setTimeout(120000);

  const filePath = path.resolve(uploadDir, req.file.filename);
  let text = '';
  let extracted = { date: new Date().toISOString().slice(0, 10), amount: null, currency: 'GBP', description: '', vendor: '' };
  let ocrMethod = 'none';

  try {
    const mime = req.file.mimetype || '';
    if (mime === 'application/pdf') {
      // PDF — extract text layer locally first (faster, no API call)
      const buffer = fs.readFileSync(filePath);
      const pdf = await pdfParse(buffer);
      text = pdf.text || '';
      ocrMethod = 'pdf-parse';
      log('info', 'Receipt', `PDF extracted ${text.length} chars from ${req.file.originalname}`);
      // If PDF had no text layer, fall through to OCR.space
      if (text.trim().length < 10) {
        log('info', 'Receipt', 'PDF text layer empty, falling through to OCR.space');
        text = '';
      }
    }

    // For images or PDFs with no text — use OCR.space free API
    if (!text && (mime.startsWith('image/') || mime === 'application/pdf')) {
      log('info', 'Receipt', `Sending to OCR.space (${req.file.originalname}, ${mime}, ${(fs.statSync(filePath).size/1024).toFixed(0)}KB)`);

      // Resize images to under 1MB for OCR.space free tier limit
      let ocrBuffer;
      let ocrMime = mime;
      if (mime.startsWith('image/')) {
        const fileBuffer = fs.readFileSync(filePath);
        if (fileBuffer.length > 900 * 1024) {
          log('info', 'Receipt', 'Resizing image for OCR.space (>900KB)');
          ocrBuffer = await sharp(fileBuffer).resize(1600, null, { withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
          ocrMime = 'image/jpeg';
          log('info', 'Receipt', `Resized: ${(fileBuffer.length/1024).toFixed(0)}KB -> ${(ocrBuffer.length/1024).toFixed(0)}KB`);
        } else {
          ocrBuffer = fileBuffer;
        }
      } else {
        ocrBuffer = fs.readFileSync(filePath);
      }

      const base64 = ocrBuffer.toString('base64');
      const ocrBody = new URLSearchParams();
      ocrBody.append('base64Image', `data:${ocrMime};base64,${base64}`);
      ocrBody.append('language', 'eng');
      ocrBody.append('isTable', 'true');
      ocrBody.append('OCREngine', '2'); // Engine 2 is better for receipts
      ocrBody.append('scale', 'true');

      const ocrApiKey = process.env.OCR_API_KEY;
      if (!ocrApiKey) {
        log('warn', 'Receipt', 'OCR_API_KEY not set, skipping external OCR');
        if (mime.startsWith('image/') && !mime.includes('heic')) {
          const { data } = await Tesseract.recognize(filePath, 'eng', { logger: () => {} });
          text = data.text || '';
          ocrMethod = 'tesseract-local';
        }
      } else {
        const ocrResp = await ocrBreaker.fire(() => withRetry(
          () => fetch('https://api.ocr.space/parse/image', { method: 'POST', headers: { 'apikey': ocrApiKey }, body: ocrBody, signal: AbortSignal.timeout(30000) }),
          { maxAttempts: 2, backoffMs: 2000, log }
        ));
        if (ocrResp.ok) {
          const ocrResult = await ocrResp.json();
          if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
            text = ocrResult.ParsedResults[0].ParsedText || '';
            ocrMethod = 'ocr.space';
            log('info', 'Receipt', `OCR.space extracted ${text.length} chars`);
          } else {
            log('warn', 'Receipt', 'OCR.space returned no results', { error: ocrResult.ErrorMessage || 'unknown' });
            ocrMethod = 'ocr.space-empty';
          }
        } else {
          log('warn', 'Receipt', 'OCR.space HTTP error', { status: ocrResp.status });
          if (mime.startsWith('image/') && !mime.includes('heic')) {
            log('info', 'Receipt', 'Falling back to local Tesseract');
            const { data } = await Tesseract.recognize(filePath, 'eng', { logger: () => {} });
            text = data.text || '';
            ocrMethod = 'tesseract-fallback';
          }
        }
      }
    } else if (!text) {
      // Plain text file
      text = fs.readFileSync(filePath, 'utf8');
      ocrMethod = 'text';
    }

    if (text) {
      extracted = extractReceiptFields(text);
      log('info', 'Receipt', 'Extracted fields', { extracted });
    }
  } catch(e) {
    log('warn', 'Receipt', 'Extraction error', { error: e.message });
    ocrMethod = 'error: ' + e.message.substring(0, 100);
  }

  // Fall back to filename if no vendor extracted
  if (!extracted.vendor && req.file.originalname) {
    extracted.vendor = 'Receipt: ' + req.file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  }

  // Use user's last expense currency as default if OCR couldn't determine it
  let currency = extracted.currency;
  if (!currency) {
    const lastExp = await pool.query('SELECT currency FROM expenses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    currency = (lastExp.rows[0] && lastExp.rows[0].currency) || 'GBP';
  }

  // Create the expense
  const { rows } = await pool.query(
    `INSERT INTO expenses (user_id, date, amount, currency, description, notes, status, vat_amount)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING *`,
    [req.user.id, extracted.date, extracted.amount || 0, currency,
     extracted.vendor || 'Receipt upload', extracted.description || 'Auto-created from receipt upload',
     extracted.vat_amount]
  );
  const expense = rows[0];

  // Attach the receipt file
  await pool.query(
    `INSERT INTO expense_receipts (expense_id, filename, original_name, size_bytes, mime_type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [expense.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.user.displayName]
  );

  // Return expense with extracted data and raw text so frontend can show what was read
  res.status(201).json({ ...expense, extracted: { ...extracted, rawText: text.substring(0, 500), ocrMethod }, receipt: { original_name: req.file.originalname, size_bytes: req.file.size } });
});

// ==================== BUG / FEATURE REPORTS ====================

/** GET /api/bug-reports — List all bug/feature reports (visible to all authenticated users) */
app.get('/api/bug-reports', requireInternal, async (req, res) => {
  let where = [];
  let vals = [];
  let i = 1;
  const { status, type, priority } = req.query;
  if (status) { where.push(`b.status = $${i}`); vals.push(status); i++; }
  if (type) { where.push(`b.type = $${i}`); vals.push(type); i++; }
  if (priority) { where.push(`b.priority = $${i}`); vals.push(priority); i++; }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const { rows } = await pool.query(`
    SELECT b.id, b.user_id, b.type, b.title, b.description, b.page,
           b.status, b.priority, b.position, b.created_at, b.updated_at,
           (b.screenshot IS NOT NULL) AS has_screenshot,
           u.display_name AS reporter_name,
           (SELECT COUNT(*) FROM bug_report_comments c WHERE c.report_id = b.id)::int AS comment_count
    FROM bug_reports b LEFT JOIN users u ON b.user_id = u.id
    ${whereClause} ORDER BY b.status, b.position, b.created_at DESC
  `, vals);
  res.json({ reports: rows });
});

/** POST /api/bug-reports — Submit a new bug or feature report */
app.post('/api/bug-reports', requireInternal, async (req, res) => {
  const { type, title, description, page, screenshot, priority } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  const descErr = validateLength(description, 'description');
  if (descErr) return res.status(400).json({ error: descErr });
  const validTypes = ['bug', 'feature'];
  const rType = validTypes.includes(type) ? type : 'bug';
  // Priority is optional at creation; admins can set it later. Non-admin submissions cannot set it.
  const validPriorities = ['critical', 'high', 'medium', 'low'];
  let safePriority = null;
  if (priority !== undefined && priority !== null && priority !== '') {
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
    }
    // Only admins can set priority at creation time. Members get their priority silently dropped.
    if (req.user.role === 'admin') safePriority = priority;
  }
  // Limit screenshot base64 payload to ~5MB (safety valve against oversized uploads)
  const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
  const safeScreenshot = (screenshot && screenshot.length <= MAX_SCREENSHOT_BYTES) ? screenshot : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Shift everything in the target column ('open' is the default for new bugs) down by 1
    await shiftForInsert(client, 'bug_reports', 'status', 'open');
    const { rows } = await client.query(
      `INSERT INTO bug_reports (user_id, type, title, description, page, screenshot, priority, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0) RETURNING *`,
      [req.user.id, rType, title.trim(), description || null, page || null, safeScreenshot, safePriority]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    log('error', 'BugReports', 'POST failed', { error: err.message });
    res.status(500).json({ error: 'Failed to create bug report' });
  } finally {
    client.release();
  }
});

/** PATCH /api/bug-reports/:id — Update status, priority, title, and/or description.
 *  Permissions: admin can change anything; reporter can change status, title, and description on own reports. */
app.patch('/api/bug-reports/:id', requireInternal, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
  const { status, description, priority, title } = req.body;
  if (!status && description === undefined && priority === undefined && title === undefined && req.body.position === undefined) {
    return res.status(400).json({ error: 'status, title, description, priority, or position required' });
  }

  const isAdmin = req.user.role === 'admin';

  // Look up the report to check ownership and get reporter info for notifications
  const { rows: existing } = await pool.query(
    `SELECT b.user_id, b.title, b.status AS old_status, b.priority AS old_priority, u.username AS reporter_username
     FROM bug_reports b LEFT JOIN users u ON b.user_id = u.id WHERE b.id = $1`,
    [req.params.id]
  );
  if (existing.length === 0) return res.status(404).json({ error: 'Report not found' });
  const report = existing[0];
  const isReporter = req.user.id === report.user_id;

  // Priority: admin only
  if (priority !== undefined && !isAdmin) {
    return res.status(403).json({ error: 'Only admins can set priority' });
  }
  // Status: admin or reporter
  if (status && !isAdmin && !isReporter) {
    return res.status(403).json({ error: 'Only the reporter or an admin can change status' });
  }
  // Description: admin or reporter
  if (description !== undefined && !isAdmin && !isReporter) {
    return res.status(403).json({ error: 'Only the reporter or an admin can edit the description' });
  }
  // Title: admin or reporter
  if (title !== undefined && !isAdmin && !isReporter) {
    return res.status(403).json({ error: 'Only the reporter or an admin can edit the title' });
  }

  const sets = ['updated_at = NOW()'];
  const vals = [];
  let idx = 1;

  if (status) {
    const validStatuses = ['open', 'in_progress', 'please_review', 'resolved', 'wontfix'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    // Status is routed through reorderInGroup below — do NOT add to sets
  }
  if (priority !== undefined) {
    const validPriorities = ['critical', 'high', 'medium', 'low', null];
    if (priority !== null && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: critical, high, medium, low` });
    }
    sets.push(`priority = $${idx++}`);
    vals.push(priority);
  }
  if (title !== undefined) {
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title cannot be empty' });
    const titleErr = validateLength(title, 'title');
    if (titleErr) return res.status(400).json({ error: titleErr });
    sets.push(`title = $${idx++}`);
    vals.push(String(title).trim());
  }
  if (description !== undefined) {
    const descErr = validateLength(description, 'description');
    if (descErr) return res.status(400).json({ error: descErr });
    sets.push(`description = $${idx++}`);
    vals.push(description);
  }

  // Position / status routed through the reorder helper inside a transaction
  const wantsReorder = (status !== undefined) || (req.body.position !== undefined);
  const newPosition = req.body.position;

  const client = await pool.connect();
  let resultRow;
  try {
    await client.query('BEGIN');

    if (wantsReorder) {
      const targetStatus = status || report.old_status;
      const targetPos = (typeof newPosition === 'number' && Number.isInteger(newPosition))
        ? newPosition
        : 0;
      await reorderInGroup(client, 'bug_reports', 'status', req.params.id, targetStatus, targetPos);
    }

    if (vals.length > 0) {
      vals.push(req.params.id);
      await client.query(`UPDATE bug_reports SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    } else if (sets.length > 1) {
      // sets has only updated_at if no body fields — only worth touching if reorder didn't already update_at
      // (reorderInGroup already updates updated_at, so skip this when wantsReorder)
      if (!wantsReorder) {
        await client.query(`UPDATE bug_reports SET updated_at = NOW() WHERE id = $1`, [req.params.id]);
      }
    }

    const fresh = await client.query('SELECT * FROM bug_reports WHERE id = $1', [req.params.id]);
    resultRow = fresh.rows[0];
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    log('error', 'BugReports', 'PATCH failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to update bug report' });
  } finally {
    client.release();
  }

  await auditLog('bug_report', req.params.id, 'update', req.user?.displayName || 'unknown', {
    status, priority,
    description: description !== undefined,
    title: title !== undefined,
    position: newPosition !== undefined ? newPosition : undefined,
  });

  // Send notifications for status and priority changes
  const notifyUser = report.reporter_username;
  if (notifyUser && notifyUser !== req.user.username) {
    try {
      if (status && status !== report.old_status) {
        const statusLabels = { in_progress: 'In Progress', please_review: 'Please Review', resolved: 'Resolved', wontfix: "Won't Fix", open: 'Open' };
        await createNotification(notifyUser, status === 'resolved' ? 'success' : 'info',
          `Report ${statusLabels[status] || status}`,
          `"${report.title}" has been updated to ${statusLabels[status] || status}.`,
          '/nbi_project_dashboard.html#bugs');
      }
      if (priority !== undefined && priority !== report.old_priority) {
        await createNotification(notifyUser, 'info', 'Priority updated',
          `"${report.title}" priority set to ${priority || 'unset'}.`,
          '/nbi_project_dashboard.html#bugs');
      }
    } catch (e) { log('error', 'BugReports', 'Failed to send notification', { error: e.message }); }
  }

  res.json(resultRow);
});

/** POST /api/bug-reports/:id/notify-review — Send a notification to the report submitter (admin only) */
app.post('/api/bug-reports/:id/notify-review', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
  try {
    const { rows } = await pool.query(
      `SELECT b.title, b.user_id, u.username FROM bug_reports b LEFT JOIN users u ON b.user_id = u.id WHERE b.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const { title, username } = rows[0];
    if (username) {
      await createNotification(
        username, 'info', 'Your report needs review',
        `"${title}" has been updated to Please Review. Click to add details or mark as resolved.`,
        '/nbi_project_dashboard.html#bugs'
      );
    }
    res.json({ ok: true });
  } catch (e) {
    log('error', 'BugReports', 'Failed to send review notification', { error: e.message });
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/** GET /api/bug-reports/:id/comments — List comments for a bug report */
app.get('/api/bug-reports/:id/comments', requireInternal, async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
  const { rows } = await pool.query(
    'SELECT * FROM bug_report_comments WHERE report_id = $1 ORDER BY created_at ASC',
    [req.params.id]
  );
  res.json(rows);
});

/** POST /api/bug-reports/:id/comments — Add a comment to a bug report */
app.post('/api/bug-reports/:id/comments', requireInternal, async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
  const textErr = validateLength(text, 'text');
  if (textErr) return res.status(400).json({ error: textErr });
  const author = req.user?.displayName || req.user?.display_name || 'Unknown';
  const { rows } = await pool.query(
    'INSERT INTO bug_report_comments (report_id, author, text) VALUES ($1, $2, $3) RETURNING *',
    [req.params.id, author, text.trim()]
  );
  await pool.query('UPDATE bug_reports SET updated_at = NOW() WHERE id = $1', [req.params.id]);
  await auditLog('bug_comment', rows[0].id, 'create', author, { report_id: req.params.id, text: text.trim() });

  // Notify the reporter (if commenter is not the reporter) and admin (if commenter is not admin)
  try {
    const { rows: rpt } = await pool.query(
      `SELECT b.user_id, b.title, u.username AS reporter_username
       FROM bug_reports b LEFT JOIN users u ON b.user_id = u.id WHERE b.id = $1`,
      [req.params.id]
    );
    if (rpt.length > 0) {
      const { reporter_username, title } = rpt[0];
      if (reporter_username && reporter_username !== req.user.username) {
        await createNotification(reporter_username, 'info', 'New comment on your report',
          `${author} commented on "${title}".`, '/nbi_project_dashboard.html#bugs');
      }
      // Notify admin if commenter is not admin
      if (req.user.role !== 'admin') {
        const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin' AND username != $1", [req.user.username]);
        for (const a of admins) {
          await createNotification(a.username, 'info', 'New bug report comment',
            `${author} commented on "${title}".`, '/nbi_project_dashboard.html#bugs');
        }
      }
    }
  } catch (e) { log('error', 'BugComments', 'Failed to send comment notification', { error: e.message }); }

  res.status(201).json(rows[0]);
});

/** DELETE /api/bug-reports/:id/comments/:commentId — Delete a comment (own or admin) */
app.delete('/api/bug-reports/:id/comments/:commentId', requireInternal, async (req, res) => {
  if (!isValidUuid(req.params.id) || !isValidUuid(req.params.commentId)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  const { rows } = await pool.query(
    'SELECT author FROM bug_report_comments WHERE id = $1 AND report_id = $2',
    [req.params.commentId, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
  const isOwner = rows[0].author === (req.user?.displayName || req.user?.display_name);
  if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Can only delete your own comments' });
  await pool.query('DELETE FROM bug_report_comments WHERE id = $1 AND report_id = $2',
    [req.params.commentId, req.params.id]
  );
  res.json({ ok: true });
});

/** DELETE /api/bug-reports/:id — Delete a report (admin only) */
app.delete('/api/bug-reports/:id', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
  await pool.query('DELETE FROM bug_reports WHERE id = $1', [req.params.id]);
  await auditLog('bug_report', req.params.id, 'delete', req.user?.displayName || 'unknown', {});
  res.json({ ok: true });
});

/** GET /api/bug-reports/:id/screenshot — Serve the screenshot image */
app.get('/api/bug-reports/:id/screenshot', requireInternal, async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
  const { rows } = await pool.query('SELECT screenshot FROM bug_reports WHERE id = $1', [req.params.id]);
  if (rows.length === 0 || !rows[0].screenshot) return res.status(404).json({ error: 'No screenshot' });
  const data = rows[0].screenshot;
  // Screenshot is stored as base64 data URL
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'Invalid screenshot format' });
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(match[1])) return res.status(400).json({ error: 'Invalid image type' });
  const buffer = Buffer.from(match[2], 'base64');
  res.setHeader('Content-Type', match[1]);
  res.send(buffer);
});

// ==================== HIRING ====================
//
// The Hiring page tracks job candidates against client hiring positions.
// Two related resources:
//   - hiring_positions: a role NBI is helping a client fill (admin-managed)
//   - candidates:       a person being considered for that role (any user
//                       can create / update; only admins may delete)
//
// Candidates carry a kanban "stage" (sourced -> screening -> interview ->
// offer -> hired/rejected). Each candidate may have a CV file uploaded;
// the file lives in /uploads (same as task attachments) and is referenced
// from candidates.cv_filename.

// Glen's 8-stage process (bug b7a2f97f, migration 024). Linear process from
// Find Candidate to Hired. Rejected is no longer a stage — use archived_at
// on the row instead to take a candidate out of pipeline.
const HIRING_STAGES = [
  'find_candidate',
  'upload_cv',
  'conduct_interviews',
  'background_check',
  'establish_start_date',
  'send_offer_letter',
  'onboard_candidate',
  'hired',
];

/** GET /api/hiring-positions — List hiring positions, optionally filtered by client */
app.get('/api/hiring-positions', requireInternal, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { client_id } = req.query;
  let where = '';
  let vals = [];
  if (client_id) {
    if (!isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    where = 'WHERE p.client_id = $1';
    vals = [client_id];
  }
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.client_id, p.sow_id, p.title, p.description, p.seniority,
             p.status, p.created_at, p.updated_at,
             c.name AS client_name,
             s.title AS sow_title,
             (SELECT COUNT(*)::int FROM candidates ca WHERE ca.position_id = p.id) AS candidate_count
      FROM hiring_positions p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN sows s ON p.sow_id = s.id
      ${where}
      ORDER BY c.name NULLS LAST, p.created_at DESC
    `, vals);
    res.json(rows);
  } catch (e) {
    log('error', 'Hiring', 'Failed to list positions', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** POST /api/hiring-positions — Create a hiring position (admin only) */
app.post('/api/hiring-positions', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { client_id, sow_id, title, description, seniority, status } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
  const lenErr = validateLength(title, 'title');
  if (lenErr) return res.status(400).json({ error: lenErr });
  if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
  if (sow_id && !isValidUuid(sow_id)) return res.status(400).json({ error: 'Invalid sow_id' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [client_id || null, sow_id || null, title.trim(), description || null, seniority || null, status || 'open']
    );
    await auditLog('hiring_position', rows[0].id, 'create', req.user.displayName || 'unknown', { title: title.trim() });
    res.status(201).json(rows[0]);
  } catch (e) {
    log('error', 'Hiring', 'Failed to create position', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** PATCH /api/hiring-positions/:id — Update a hiring position (admin only) */
app.patch('/api/hiring-positions/:id', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['client_id', 'sow_id', 'title', 'description', 'seniority', 'status']);
  if (req.body.title !== undefined && !String(req.body.title).trim()) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  updates.push('updated_at = NOW()');
  vals.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE hiring_positions SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await auditLog('hiring_position', req.params.id, 'update', req.user.displayName || 'unknown', { fields: Object.keys(req.body) });
    res.json(rows[0]);
  } catch (e) {
    log('error', 'Hiring', 'Failed to update position', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** DELETE /api/hiring-positions/:id — Remove a hiring position (admin only) */
app.delete('/api/hiring-positions/:id', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
  try {
    const { rowCount } = await pool.query('DELETE FROM hiring_positions WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    await auditLog('hiring_position', req.params.id, 'delete', req.user.displayName || 'unknown');
    res.json({ ok: true });
  } catch (e) {
    log('error', 'Hiring', 'Failed to delete position', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** GET /api/candidates — List candidates with optional filters */
app.get('/api/candidates', requireInternal, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { client_id, stage, position_id } = req.query;
  const where = [];
  const vals = [];
  let i = 1;
  if (client_id) {
    if (!isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    where.push(`ca.client_id = $${i++}`); vals.push(client_id);
  }
  if (position_id) {
    if (!isValidUuid(position_id)) return res.status(400).json({ error: 'Invalid position_id' });
    where.push(`ca.position_id = $${i++}`); vals.push(position_id);
  }
  if (stage) {
    if (!HIRING_STAGES.includes(stage)) return res.status(400).json({ error: `Invalid stage. Must be one of: ${HIRING_STAGES.join(', ')}` });
    where.push(`ca.stage = $${i++}`); vals.push(stage);
  }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const { rows } = await pool.query(`
      SELECT ca.id, ca.position_id, ca.client_id, ca.name, ca.role, ca.linkedin_url,
             ca.cv_filename, ca.due_date, ca.stage, ca.notes, ca.position, ca.created_at, ca.updated_at,
             c.name AS client_name,
             p.title AS position_title,
             (ca.cv_filename IS NOT NULL) AS has_cv
      FROM candidates ca
      LEFT JOIN clients c ON ca.client_id = c.id
      LEFT JOIN hiring_positions p ON ca.position_id = p.id
      ${whereClause}
      ORDER BY c.name NULLS LAST, ca.created_at DESC
    `, vals);
    res.json(rows);
  } catch (e) {
    log('error', 'Hiring', 'Failed to list candidates', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** GET /api/candidates/:id — Single candidate */
app.get('/api/candidates/:id', requireInternal, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
  try {
    const { rows } = await pool.query(`
      SELECT ca.*, c.name AS client_name, p.title AS position_title,
             (ca.cv_filename IS NOT NULL) AS has_cv
      FROM candidates ca
      LEFT JOIN clients c ON ca.client_id = c.id
      LEFT JOIN hiring_positions p ON ca.position_id = p.id
      WHERE ca.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    log('error', 'Hiring', 'Failed to fetch candidate', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** POST /api/candidates — Create a candidate (any authenticated user) */
app.post('/api/candidates', requireInternal, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { client_id, position_id, name, role, linkedin_url, due_date, stage, notes } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  const lenErr = validateLength(name, 'name');
  if (lenErr) return res.status(400).json({ error: lenErr });
  if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
  if (position_id && !isValidUuid(position_id)) return res.status(400).json({ error: 'Invalid position_id' });
  if (stage && !HIRING_STAGES.includes(stage)) {
    return res.status(400).json({ error: `Invalid stage. Must be one of: ${HIRING_STAGES.join(', ')}` });
  }
  if (notes !== undefined) {
    const ne = validateLength(notes, 'notes');
    if (ne) return res.status(400).json({ error: ne });
  }
  const targetStage = stage || 'find_candidate';
  const dbClient = await pool.connect();
  let createdRow;
  try {
    await dbClient.query('BEGIN');
    await shiftForInsert(dbClient, 'candidates', 'stage', targetStage);
    const { rows } = await dbClient.query(
      `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0) RETURNING *`,
      [
        client_id || null,
        position_id || null,
        name.trim(),
        role || null,
        linkedin_url || null,
        due_date || null,
        targetStage,
        notes || null
      ]
    );
    createdRow = rows[0];
    await dbClient.query('COMMIT');
  } catch (e) {
    await dbClient.query('ROLLBACK');
    log('error', 'Hiring', 'Failed to create candidate', { error: e.message });
    return res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    dbClient.release();
  }
  await auditLog('candidate', createdRow.id, 'create', req.user.displayName || 'unknown', { name: name.trim(), client_id: client_id || null });
  res.status(201).json(createdRow);
});

/** PATCH /api/candidates/:id — Update a candidate (any authenticated user) */
app.patch('/api/candidates/:id', requireInternal, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
  // Validate stage if present
  if (req.body.stage !== undefined && !HIRING_STAGES.includes(req.body.stage)) {
    return res.status(400).json({ error: `Invalid stage. Must be one of: ${HIRING_STAGES.join(', ')}` });
  }
  // Validate FKs if present
  if (req.body.client_id !== undefined && req.body.client_id !== null && !isValidUuid(req.body.client_id)) {
    return res.status(400).json({ error: 'Invalid client_id' });
  }
  if (req.body.position_id !== undefined && req.body.position_id !== null && !isValidUuid(req.body.position_id)) {
    return res.status(400).json({ error: 'Invalid position_id' });
  }
  // Validate text length
  if (req.body.name !== undefined) {
    if (!String(req.body.name).trim()) return res.status(400).json({ error: 'name cannot be empty' });
    const ne = validateLength(req.body.name, 'name');
    if (ne) return res.status(400).json({ error: ne });
  }
  if (req.body.notes !== undefined) {
    const ne = validateLength(req.body.notes, 'notes');
    if (ne) return res.status(400).json({ error: ne });
  }
  // Text fields are stored raw; escaping happens at render time in the frontend (esc()).
  // Name is trimmed here because the POST path also trims it.
  const body = { ...req.body };
  if (body.name !== undefined && body.name !== null) body.name = String(body.name).trim();

  // Stage is routed through reorderInGroup below — NOT in allowedFields here.
  // stage_assignees / onboarding_links / start_date / archived_at were added
  // by migration 024 for Glen's hiring rewrite (bug b7a2f97f). JSONB columns
  // are passed through as JS objects — pg handles the serialisation.
  const { updates, vals, nextIdx } = buildPatchQuery(body, ['client_id', 'position_id', 'name', 'role', 'linkedin_url', 'due_date', 'notes', 'stage_assignees', 'start_date', 'onboarding_links', 'archived_at']);
  const wantsReorder = (body.stage !== undefined) || (req.body.position !== undefined);
  if (updates.length === 0 && !wantsReorder) return res.status(400).json({ error: 'No valid fields to update' });

  const dbClient = await pool.connect();
  let updatedRow;
  try {
    await dbClient.query('BEGIN');

    if (wantsReorder) {
      const oldRow = await dbClient.query('SELECT stage FROM candidates WHERE id = $1', [req.params.id]);
      if (oldRow.rows.length === 0) {
        await dbClient.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }
      const targetStage = (body.stage !== undefined) ? body.stage : oldRow.rows[0].stage;
      const targetPos = (typeof req.body.position === 'number' && Number.isInteger(req.body.position))
        ? req.body.position
        : 0;
      await reorderInGroup(dbClient, 'candidates', 'stage', req.params.id, targetStage, targetPos);
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      vals.push(req.params.id);
      await dbClient.query(
        `UPDATE candidates SET ${updates.join(', ')} WHERE id = $${nextIdx}`,
        vals
      );
    }

    const fresh = await dbClient.query('SELECT * FROM candidates WHERE id = $1', [req.params.id]);
    if (!fresh.rows[0]) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }
    updatedRow = fresh.rows[0];
    await dbClient.query('COMMIT');
  } catch (e) {
    await dbClient.query('ROLLBACK');
    log('error', 'Hiring', 'Failed to update candidate', { error: e.message });
    return res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    dbClient.release();
  }

  await auditLog('candidate', req.params.id, 'update', req.user.displayName || 'unknown', { fields: Object.keys(req.body) });
  res.json(updatedRow);
});

/** DELETE /api/candidates/:id — Remove a candidate (admin only).
 *  Also deletes the CV file from disk if one is attached. */
app.delete('/api/candidates/:id', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
  try {
    const { rows } = await pool.query('SELECT cv_filename FROM candidates WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (rows[0].cv_filename) {
      // Strip any path components defensively before unlinking
      const safe = path.basename(rows[0].cv_filename);
      const filePath = path.join(uploadDir, safe);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* swallow */ }
    }
    await pool.query('DELETE FROM candidates WHERE id = $1', [req.params.id]);
    await auditLog('candidate', req.params.id, 'delete', req.user.displayName || 'unknown');
    res.json({ ok: true });
  } catch (e) {
    log('error', 'Hiring', 'Failed to delete candidate', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** POST /api/candidates/:id/cv — Upload a CV file for a candidate.
 *  Reuses the shared multer instance (25 MB cap, allowlisted MIME types).
 *  Code review M6: restrict to PDF only. CVs are almost always PDFs in practice,
 *  and narrowing the MIME surface reduces the attack area (no DOCX macros, no
 *  arbitrary binary that happens to satisfy the generic allowlist).
 *  If the candidate already has a CV, the previous file is deleted from disk
 *  before the new one replaces it. */
app.post('/api/candidates/:id/cv', requireInternal, upload.single('file'), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) {
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    return res.status(400).json({ error: 'Invalid candidate ID' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Enforce PDF-only for CVs
  const isPdfMime = req.file.mimetype === 'application/pdf';
  const isPdfExt = /\.pdf$/i.test(req.file.originalname || '');
  if (!isPdfMime || !isPdfExt) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(400).json({ error: 'Only PDF CVs are accepted' });
  }
  try {
    const { rows: existing } = await pool.query('SELECT cv_filename FROM candidates WHERE id = $1', [req.params.id]);
    if (existing.length === 0) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(404).json({ error: 'Candidate not found' });
    }
    // Delete old CV file if present
    if (existing[0].cv_filename) {
      const safe = path.basename(existing[0].cv_filename);
      const oldPath = path.join(uploadDir, safe);
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) {}
    }
    const { rows } = await pool.query(
      'UPDATE candidates SET cv_filename = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [req.file.filename, req.params.id]
    );
    await auditLog('candidate', req.params.id, 'cv_upload', req.user.displayName || 'unknown', { filename: req.file.originalname, size: req.file.size });
    res.json({ ...rows[0], original_name: req.file.originalname, size: req.file.size });
  } catch (e) {
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (err) {} }
    log('error', 'Hiring', 'Failed to upload CV', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** GET /api/candidates/:id/cv — Download the candidate's CV file */
app.get('/api/candidates/:id/cv', requireInternal, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
  try {
    const { rows } = await pool.query('SELECT cv_filename, name FROM candidates WHERE id = $1', [req.params.id]);
    if (rows.length === 0 || !rows[0].cv_filename) return res.status(404).json({ error: 'No CV uploaded' });
    // Defensive: strip path components, never trust the DB value to be a bare filename
    const safe = path.basename(rows[0].cv_filename);
    const filePath = path.join(uploadDir, safe);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'CV file missing on disk' });
    // Suggest a friendly download name based on the candidate's name + the stored extension
    const ext = path.extname(safe);
    const friendly = `${rows[0].name || 'candidate'}-CV${ext}`.replace(/[^a-zA-Z0-9_.\- ]/g, '_');
    res.download(filePath, friendly);
  } catch (e) {
    log('error', 'Hiring', 'Failed to download CV', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

/** GET /api/clients/:id/hiring-count — Real count of active candidates for a client.
 *  "Active" = candidates in stages other than 'hired' or 'rejected'.
 *  Counts candidates whose client_id matches OR whose parent hiring_position belongs
 *  to the client. This covers both direct candidate-to-client links and candidates
 *  attached via a position. */
app.get('/api/clients/:id/hiring-count', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM candidates c
       LEFT JOIN hiring_positions p ON c.position_id = p.id
       WHERE (c.client_id = $1 OR p.client_id = $1)
         AND c.stage NOT IN ('hired','rejected')`,
      [req.params.id]
    );
    res.json({ count: rows[0]?.count || 0 });
  } catch (e) {
    log('error', 'Hiring', 'Failed to compute hiring count', { error: e.message });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== EXPENSE REPORT SUBMISSIONS ====================
// Expense reports group individual expenses into a submittable package.
// Statuses: draft → submitted → approved/rejected
// Submitting notifies Tom Rieger via in-app notification + email.

/**
 * GET /api/expense-reports
 * List expense reports.
 * - Admins see all reports.
 * - The expense approver (Tom) sees submitted/approved/rejected reports from everyone.
 * - Other users only see their own reports.
 * Each report includes expense count and total amount.
 */
app.get('/api/expense-reports', requireInternal, async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const approverUsername = await getExpenseApprover();
  const isApprover = req.user && req.user.username === approverUsername;
  let where = [];
  let vals = [];
  let i = 1;

  if (!isAdmin && !isApprover) {
    // Regular users: only own reports
    where.push(`r.user_id = $${i}`); vals.push(req.user.id); i++;
  } else if (isApprover && !isAdmin) {
    // Expense approver: own reports + submitted/approved/rejected from others
    where.push(`(r.user_id = $${i} OR r.status IN ('submitted', 'approved', 'rejected'))`);
    vals.push(req.user.id); i++;
  }
  // Admins: no filter (see all)

  const { status } = req.query;
  if (status) { where.push(`r.status = $${i}`); vals.push(status); i++; }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const { rows } = await pool.query(`
    SELECT r.*, u.display_name AS employee_name,
      (SELECT count(*) FROM expenses e WHERE e.report_id = r.id)::int AS expense_count,
      (SELECT COALESCE(sum(e.amount), 0) FROM expenses e WHERE e.report_id = r.id)::numeric AS total_amount
    FROM expense_reports r
    LEFT JOIN users u ON r.user_id = u.id
    ${whereClause}
    ORDER BY r.created_at DESC
  `, vals);
  res.json({ reports: rows });
});

/** POST /api/expense-reports — Create a new expense report (draft) */
app.post('/api/expense-reports', requireInternal, async (req, res) => {
  const { title, notes } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

  const { rows } = await pool.query(
    `INSERT INTO expense_reports (user_id, title, notes) VALUES ($1, $2, $3) RETURNING *`,
    [req.user.id, title.trim(), notes || null]
  );
  await auditLog('expense_report', rows[0].id, 'create', req.user.displayName, { title });
  res.status(201).json(rows[0]);
});

/**
 * GET /api/expense-reports/:id
 * Get a single expense report with its expenses. Access: own or admin.
 */
app.get('/api/expense-reports/:id', requireInternal, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.*, u.display_name AS employee_name
    FROM expense_reports r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.id = $1
  `, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  const report = rows[0];

  const approverUsername = await getExpenseApprover();
  const isApprover = req.user && req.user.username === approverUsername;
  if (req.user.role !== 'admin' && report.user_id !== req.user.id && !isApprover) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Fetch expenses in this report
  const expenses = await pool.query(`
    SELECT e.*, c.name AS category_name,
      (SELECT count(*) FROM expense_receipts r WHERE r.expense_id = e.id)::int AS receipt_count
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    WHERE e.report_id = $1
    ORDER BY e.date DESC, e.created_at DESC
  `, [req.params.id]);
  report.expenses = expenses.rows;

  // Also compute totals by currency
  const totals = await pool.query(`
    SELECT currency, sum(amount)::numeric AS total, count(*)::int AS count
    FROM expenses WHERE report_id = $1 GROUP BY currency
  `, [req.params.id]);
  report.totals_by_currency = totals.rows;

  res.json(report);
});

/**
 * PATCH /api/expense-reports/:id
 * Update report title/notes. Only draft reports can be edited by their owner.
 * Admins can also update status (for approve/reject flow).
 */
app.patch('/api/expense-reports/:id', requireInternal, async (req, res) => {
  const check = await pool.query('SELECT user_id, status FROM expense_reports WHERE id = $1', [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  const report = check.rows[0];

  const isAdmin = req.user && req.user.role === 'admin';
  const approverUser = await getExpenseApprover();
  const isApprover = req.user && req.user.username === approverUser;
  const isOwner = report.user_id === req.user.id;
  const canReview = isAdmin || isApprover;
  if (!canReview && !isOwner) return res.status(403).json({ error: 'Access denied' });
  if (!canReview && report.status !== 'draft') {
    return res.status(400).json({ error: 'Cannot edit a submitted report' });
  }

  // Validate status enum if provided
  const VALID_REPORT_STATUSES = ['draft', 'submitted', 'approved', 'rejected'];
  if (req.body.status && !VALID_REPORT_STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_REPORT_STATUSES.join(', ')}` });
  }

  const allowed = ['title', 'notes'];
  // reviewed_by and reviewed_at are NOT in the allow-list (audit finding
  // B-C3) — they are always server-stamped from req.user below so the
  // audit trail on approval cannot be forged by a reviewer.
  if (canReview) allowed.push('status', 'review_notes');

  const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowed);
  let idx = nextIdx;
  // Auto-set review fields when reviewer changes status. Always server-stamped.
  if (canReview && req.body.status && req.body.status !== report.status) {
    if (req.body.status === 'approved' || req.body.status === 'rejected') {
      updates.push(`reviewed_by = $${idx}`); vals.push(req.user.displayName); idx++;
      updates.push(`reviewed_at = $${idx}`); vals.push(new Date().toISOString()); idx++;
    }
    // If reviewer approves report, also approve all its expenses
    if (req.body.status === 'approved') {
      await pool.query(`UPDATE expenses SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE report_id = $2`, [req.user.displayName, req.params.id]);
    }
    // If reviewer rejects, set report back so owner can fix
    if (req.body.status === 'rejected') {
      await pool.query(`UPDATE expenses SET status = 'pending', updated_at = NOW() WHERE report_id = $1`, [req.params.id]);
    }
  }
  updates.push(`updated_at = $${idx}`); vals.push(new Date().toISOString()); idx++;

  if (updates.length <= 1) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE expense_reports SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
  await auditLog('expense_report', req.params.id, 'update', req.user.displayName, req.body);
  res.json(rows[0]);
});

/**
 * POST /api/expense-reports/:id/submit
 * Submit an expense report for review. Changes status to 'submitted'.
 * Notifies Tom Rieger via in-app notification and email.
 */
app.post('/api/expense-reports/:id/submit', requireInternal, async (req, res) => {
  const check = await pool.query(`
    SELECT r.*, u.display_name AS employee_name
    FROM expense_reports r LEFT JOIN users u ON r.user_id = u.id
    WHERE r.id = $1
  `, [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  const report = check.rows[0];

  if (report.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (report.status !== 'draft') {
    return res.status(400).json({ error: 'Report has already been submitted' });
  }

  // Check report has expenses
  const expCount = await pool.query('SELECT count(*)::int AS count FROM expenses WHERE report_id = $1', [req.params.id]);
  if (expCount.rows[0].count === 0) {
    return res.status(400).json({ error: 'Cannot submit an empty report. Add expenses first.' });
  }

  // Get total for notification message
  const totals = await pool.query(`
    SELECT currency, sum(amount)::numeric AS total, count(*)::int AS count
    FROM expenses WHERE report_id = $1 GROUP BY currency
  `, [req.params.id]);
  const totalStr = totals.rows.map(t => `${t.currency} ${parseFloat(t.total).toFixed(2)} (${t.count} item${t.count > 1 ? 's' : ''})`).join(', ');

  // Update report status
  await pool.query(`UPDATE expense_reports SET status = 'submitted', submitted_at = NOW(), updated_at = NOW() WHERE id = $1`, [req.params.id]);

  // Auto-dismiss any pending expense_reminder notifications for this user
  await pool.query(`UPDATE notifications SET is_read = true WHERE username = $1 AND type = 'expense_reminder' AND is_read = false`, [req.user.username]);

  // Build the review URL
  const reportUrl = `${APP_URL}/nbi_project_dashboard.html#expenses/report/${req.params.id}`;

  // In-app notification to the designated expense approver. If no approver
  // is configured (settings or env), broadcast to all admins instead so the
  // report doesn't disappear silently. The old path fell back to 'tom' as
  // a hardcoded username (audit finding B-B11) which misdirected approvals
  // whenever settings lookup failed.
  const approverUsername = await getExpenseApprover();
  const approverEmail = process.env.EXPENSE_APPROVER_EMAIL || 'trieger@nbi-consulting.com';
  try {
    if (approverUsername) {
      await createNotification(
        approverUsername,
        'expense_report',
        `Expense Report: ${report.title}`,
        `${report.employee_name || 'An employee'} submitted an expense report (${totalStr}). Click to review.`,
        reportUrl
      );
      log('info', 'Notification', `Approver ${approverUsername} notified about expense report "${report.title}"`);
    } else {
      const admins = await pool.query("SELECT username FROM users WHERE role = 'admin' AND is_active = true");
      for (const a of admins.rows) {
        await createNotification(
          a.username,
          'expense_report',
          `Expense Report: ${report.title}`,
          `${report.employee_name || 'An employee'} submitted an expense report (${totalStr}). No approver is configured — review as admin.`,
          reportUrl
        );
      }
      log('info', 'Notification', `No approver configured; broadcast expense report "${report.title}" to ${admins.rows.length} admin(s)`);
    }
  } catch(e) {
    log('warn', 'Notification', 'Failed to notify approver', { error: e.message });
  }

  // Email notification to expense approver (fire-and-forget)
  const emailHtml = `
    <h2>Expense Report Submitted for Review</h2>
    <p><strong>${report.employee_name || 'An employee'}</strong> has submitted an expense report.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Report:</td><td>${report.title}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Total:</td><td>${totalStr}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Submitted:</td><td>${new Date().toLocaleString('en-GB')}</td></tr>
    </table>
    <p><a href="${reportUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Review Expense Report</a></p>
    <p style="color:#666;font-size:0.85em">NBI Project Dashboard</p>
  `;
  sendEmailAsync({
    from: EMAIL_FROM,
    to: approverEmail,
    subject: `Expense Report: ${report.title} — ${report.employee_name || 'Employee'}`,
    html: emailHtml
  });

  await auditLog('expense_report', req.params.id, 'submit', req.user.displayName, { title: report.title, total: totalStr });
  res.json({ ok: true, status: 'submitted', reportUrl });
});

/**
 * POST /api/expense-reports/:id/expenses
 * Add one or more expenses to a report. Body: { expense_ids: [...] }
 * Only draft reports. Expenses must belong to the same user and not be in another report.
 */
app.post('/api/expense-reports/:id/expenses', requireInternal, async (req, res) => {
  const check = await pool.query('SELECT user_id, status FROM expense_reports WHERE id = $1', [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  const report = check.rows[0];

  if (report.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (report.status !== 'draft') {
    return res.status(400).json({ error: 'Cannot modify a submitted report' });
  }

  const { expense_ids } = req.body;
  if (!expense_ids || !Array.isArray(expense_ids) || expense_ids.length === 0) {
    return res.status(400).json({ error: 'expense_ids array required' });
  }
  if (expense_ids.some(id => !isValidUuid(id))) {
    return res.status(400).json({ error: 'All expense_ids must be valid UUIDs' });
  }

  // Validate all expenses belong to the user and are unassigned
  const placeholders = expense_ids.map((_, i) => `$${i + 1}`).join(',');
  const expenses = await pool.query(
    `SELECT id, user_id, report_id FROM expenses WHERE id IN (${placeholders})`,
    expense_ids
  );

  // Check all requested IDs were found
  const foundIds = new Set(expenses.rows.map(e => e.id));
  const missing = expense_ids.filter(id => !foundIds.has(id));
  if (missing.length > 0) return res.status(400).json({ error: `Expenses not found: ${missing.join(', ')}` });

  const errors = [];
  for (const exp of expenses.rows) {
    if (exp.user_id !== report.user_id) errors.push(`Expense ${exp.id} belongs to another user`);
    if (exp.report_id && exp.report_id !== req.params.id) errors.push(`Expense ${exp.id} is already in another report`);
  }
  if (errors.length > 0) return res.status(400).json({ error: errors.join('; ') });

  // Assign expenses to this report (placeholders offset by 1 for report_id at $1)
  const updatePlaceholders = expense_ids.map((_, i) => `$${i + 2}`).join(',');
  await pool.query(
    `UPDATE expenses SET report_id = $1, updated_at = NOW() WHERE id IN (${updatePlaceholders})`,
    [req.params.id, ...expense_ids]
  );

  res.json({ ok: true, added: expense_ids.length });
});

/**
 * DELETE /api/expense-reports/:id/expenses/:expenseId
 * Remove an expense from a report (sets report_id to NULL). Only draft reports.
 */
app.delete('/api/expense-reports/:id/expenses/:expenseId', requireInternal, async (req, res) => {
  const check = await pool.query('SELECT user_id, status FROM expense_reports WHERE id = $1', [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  const report = check.rows[0];

  if (report.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (report.status !== 'draft') {
    return res.status(400).json({ error: 'Cannot modify a submitted report' });
  }

  await pool.query('UPDATE expenses SET report_id = NULL, updated_at = NOW() WHERE id = $1 AND report_id = $2', [req.params.expenseId, req.params.id]);
  res.json({ ok: true });
});

/**
 * DELETE /api/expense-reports/:id
 * Delete a draft expense report. Unlinks all its expenses (sets report_id to NULL).
 */
app.delete('/api/expense-reports/:id', requireInternal, async (req, res) => {
  const check = await pool.query('SELECT user_id, status FROM expense_reports WHERE id = $1', [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  const report = check.rows[0];

  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin && report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (!isAdmin && report.status !== 'draft') {
    return res.status(400).json({ error: 'Cannot delete a submitted report' });
  }

  // Unlink expenses first
  await pool.query('UPDATE expenses SET report_id = NULL, updated_at = NOW() WHERE report_id = $1', [req.params.id]);
  await pool.query('DELETE FROM expense_reports WHERE id = $1', [req.params.id]);
  await auditLog('expense_report', req.params.id, 'delete', req.user.displayName);
  res.json({ ok: true });
});

/**
 * GET /api/expense-reports/:id/export
 * Export a report as a ZIP containing CSV + all receipt files.
 */
app.get('/api/expense-reports/:id/export', requireInternal, async (req, res) => {
  const check = await pool.query(`
    SELECT r.*, u.display_name AS employee_name
    FROM expense_reports r LEFT JOIN users u ON r.user_id = u.id
    WHERE r.id = $1
  `, [req.params.id]);
  if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  const report = check.rows[0];

  // Get expenses
  const expResult = await pool.query(`
    SELECT e.*, c.name AS category_name
    FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id
    WHERE e.report_id = $1 ORDER BY e.date
  `, [req.params.id]);
  const expenses = expResult.rows;

  // Get all receipts for these expenses
  const expIds = expenses.map(e => e.id);
  let receipts = [];
  if (expIds.length > 0) {
    const ph = expIds.map((_, i) => `$${i + 1}`).join(',');
    const rcptResult = await pool.query(`SELECT * FROM expense_receipts WHERE expense_id IN (${ph})`, expIds);
    receipts = rcptResult.rows;
  }

  // Build CSV
  const csvRows = [['Date', 'Description', 'Category', 'Amount (GBP)', 'VAT', 'Currency', 'Receipt', 'Status'].join(',')];
  let grandTotal = 0, vatTotal = 0;
  expenses.forEach(e => {
    const amt = parseFloat(e.amount) || 0;
    const vat = parseFloat(e.vat_amount) || 0;
    grandTotal += amt;
    vatTotal += vat;
    const desc = (e.description || '').replace(/[\t\n\r]/g, ' ').replace(/"/g, '""');
    const cat = (e.category_name || '').replace(/"/g, '""');
    const hasReceipt = receipts.some(r => r.expense_id === e.id) ? 'Yes' : 'No';
    csvRows.push([
      (e.date ? new Date(e.date).toISOString().slice(0, 10) : ''),
      `"${desc}"`,
      `"${cat}"`,
      amt.toFixed(2),
      vat ? vat.toFixed(2) : '',
      e.currency || 'GBP',
      hasReceipt,
      e.status || ''
    ].join(','));
  });
  csvRows.push('');
  csvRows.push(['', '', 'TOTAL', grandTotal.toFixed(2), vatTotal.toFixed(2)].join(','));
  csvRows.push(['', '', 'Expenses', expenses.length].join(','));
  csvRows.push(['', '', 'With receipts', receipts.length].join(','));
  const csvContent = '\uFEFF' + csvRows.join('\r\n');

  // Build ZIP with archiver (loaded at startup)
  if (!archiver) return res.status(500).json({ error: 'archiver module not installed — ZIP export unavailable' });
  const archive = archiver('zip', { zlib: { level: 9 } });

  const safeName = (report.title || 'Expense_Report').replace(/[^a-zA-Z0-9-_ ]/g, '');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.zip"`);
  archive.pipe(res);

  // Add CSV
  archive.append(Buffer.from(csvContent, 'utf-8'), { name: `${safeName}.csv` });

  // Add receipt files
  const uploadsDir = path.join(__dirname, 'uploads');
  for (const rcpt of receipts) {
    const filePath = path.join(uploadsDir, rcpt.filename);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: `receipts/${rcpt.original_name || rcpt.filename}` });
    }
  }

  // Bank statements intentionally NOT included in the export. The previous
  // implementation dumped every *REDACTED*.pdf in uploads/ into every
  // expense-report ZIP — which meant one employee's export contained every
  // other employee's redacted bank statements (audit finding B-B20). Today
  // this is a latent leak because only Glen uses the system, but it would
  // fire the moment a second employee submits a report.
  // To re-enable, add a bank_statements table keyed by user_id, associate
  // redacted PDFs at upload time, and filter here on user_id = report.user_id.
  archive.finalize();
});

// ==================== CLIENT STATUS REPORTS ====================

/** POST /api/clients/:id/reports -- Generate a client status report snapshot.
 *  Admin-only: generates a public share token that bypasses auth, so creation is gated.
 *  UUID-validated, audit-logged (code review M5). */
app.post('/api/clients/:id/reports', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only -- public share tokens are gated' });
  const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
  if (clientResult.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
  const client = clientResult.rows[0];

  // Gather all task data for this client
  const tasksResult = await pool.query(
    `SELECT t.*, c.name as client_name FROM tasks t
     LEFT JOIN clients c ON t.client_id = c.id
     WHERE t.client_id = $1 ORDER BY t.created_at`, [req.params.id]
  );
  const clientTasks = tasksResult.rows;

  // Compute KPIs
  const total = clientTasks.length;
  const done = clientTasks.filter(t => t.status === 'Done').length;
  const inProgress = clientTasks.filter(t => t.status === 'In progress').length;
  const blocked = clientTasks.filter(t => t.health_state === 'Blocked').length;
  const overdue = clientTasks.filter(t => t.due_date && t.status !== 'Done' && t.status !== 'Cancelled' && new Date(t.due_date) < new Date()).length;
  const hrsSpent = clientTasks.reduce((s, t) => s + (t.hours_spent || 0), 0);
  const hrsEst = clientTasks.reduce((s, t) => s + (t.hours_estimated || 0), 0);
  const completePct = total > 0 ? Math.round(done / total * 100) : 0;

  // Group by status
  const statusBreakdown = {};
  clientTasks.forEach(t => { statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1; });

  // Group by project (root tasks)
  const projects = clientTasks.filter(t => !t.parent_id).map(p => {
    const kids = clientTasks.filter(t => t.parent_id === p.id);
    const pDone = kids.filter(k => k.status === 'Done').length;
    return { title: p.title, status: p.status, health: p.health_state, total: kids.length + 1, done: pDone, pct: kids.length > 0 ? Math.round(pDone / kids.length * 100) : (p.status === 'Done' ? 100 : 0) };
  });

  // Build report data
  const reportData = {
    clientName: client.name,
    generatedAt: new Date().toISOString(),
    generatedBy: req.user?.displayName || 'system',
    kpis: { total, done, inProgress, blocked, overdue, hrsSpent: Math.round(hrsSpent * 10) / 10, hrsEst: Math.round(hrsEst * 10) / 10, completePct },
    statusBreakdown,
    projects,
    blockedTasks: clientTasks.filter(t => t.health_state === 'Blocked').map(t => ({ title: t.title, status: t.status, assignees: t.assignees })),
    overdueTasks: clientTasks.filter(t => t.due_date && t.status !== 'Done' && t.status !== 'Cancelled' && new Date(t.due_date) < new Date()).map(t => ({ title: t.title, dueDate: t.due_date, assignees: t.assignees })),
  };

  // Save with share token. 30-day expiry (was 90 -- code review M5 recommended shorter default).
  const shareToken = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const { rows } = await pool.query(
    `INSERT INTO client_reports (client_id, client_name, share_token, report_data, generated_by, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, share_token, created_at`,
    [req.params.id, client.name, shareToken, JSON.stringify(reportData), req.user?.displayName || 'system', expiresAt]
  );

  // Audit so we have a record of every public share token ever created
  await auditLog('client_report', rows[0].id, 'create', req.user?.displayName, {
    client_id: req.params.id,
    client_name: client.name,
    expires_at: expiresAt
  });

  res.status(201).json({
    id: rows[0].id,
    shareToken: rows[0].share_token,
    shareUrl: `/api/reports/${rows[0].share_token}/html`,
    pdfUrl: `/api/reports/${rows[0].share_token}/pdf`,
    createdAt: rows[0].created_at,
  });
});

/** GET /api/clients/:id/reports — List past reports for a client */
app.get('/api/clients/:id/reports', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, share_token, generated_by, created_at FROM client_reports WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20',
    [req.params.id]
  );
  res.json(rows);
});

/** DELETE /api/reports/:id/revoke — Revoke a share token (admin only, B-B7) */
app.delete('/api/reports/:id/revoke', requireInternal, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { rowCount } = await pool.query('DELETE FROM client_reports WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Report not found' });
  res.json({ ok: true });
});

/** GET /api/reports/:token — Public JSON data (no auth required) */
app.get('/api/reports/:token', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM client_reports WHERE share_token = $1', [req.params.token]);
  if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  if (rows[0].expires_at && new Date(rows[0].expires_at) < new Date()) return res.status(410).json({ error: 'Report expired' });
  res.json(rows[0].report_data);
});

/** GET /api/reports/:token/html — Public styled HTML report page (no auth required).
 *  Adds X-Robots-Tag and Referrer-Policy headers + meta tags so tokens don't leak
 *  via search indexing or the Referer header (security audit M10). */
app.get('/api/reports/:token/html', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM client_reports WHERE share_token = $1', [req.params.token]);
  if (rows.length === 0) return res.status(404).send('Report not found');
  if (rows[0].expires_at && new Date(rows[0].expires_at) < new Date()) return res.status(410).send('Report expired');

  // Tell search engines not to index and tell browsers not to send a Referer on outbound links
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.set('Referrer-Policy', 'no-referrer');

  const d = rows[0].report_data;
  const date = new Date(d.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusColours = { Done: '#22c55e', 'In progress': '#3b82f6', 'Not started': '#6b7280', 'In Review': '#f59e0b', Blocked: '#a855f7', Planning: '#06b6d4', Drafted: '#8b5cf6', Cancelled: '#ef4444' };

  // All user-supplied data is escaped via escHtml() to prevent XSS in this public endpoint
  let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
  <meta name="referrer" content="no-referrer">
  <title>${escHtml(d.clientName)} — Status Report</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,-apple-system,sans-serif;background:#0a0a0a;color:#e8e8e8;line-height:1.6;padding:40px 20px}
    .container{max-width:900px;margin:0 auto}
    .header{border-bottom:2px solid #2a2a2a;padding-bottom:24px;margin-bottom:32px}
    .header h1{font-size:1.8rem;font-weight:700;margin-bottom:4px}
    .header .meta{color:#999;font-size:0.85rem}
    .brand{color:#0066FF;font-size:0.75rem;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px}
    .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px;margin-bottom:32px}
    .kpi{background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:16px;text-align:center}
    .kpi .value{font-size:1.6rem;font-weight:700}
    .kpi .label{font-size:0.72rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-top:4px}
    .section{margin-bottom:32px}
    .section h2{font-size:0.8rem;color:#999;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px}
    .bar{display:flex;height:20px;border-radius:4px;overflow:hidden;background:#1e1e1e;margin-bottom:6px}
    .bar-seg{min-width:2px}
    table{width:100%;border-collapse:collapse;font-size:0.85rem}
    th{text-align:left;padding:8px 12px;border-bottom:2px solid #2a2a2a;color:#999;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px}
    td{padding:8px 12px;border-bottom:1px solid #1e1e1e}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:600}
    .pct-bar{width:100%;height:6px;background:#1e1e1e;border-radius:3px;overflow:hidden}
    .pct-fill{height:100%;background:#22c55e;border-radius:3px}
    .footer{margin-top:48px;padding-top:24px;border-top:1px solid #2a2a2a;color:#666;font-size:0.75rem;text-align:center}
    @media(max-width:600px){.kpi-grid{grid-template-columns:repeat(2,1fr)}}
  </style></head><body><div class="container">
  <div class="header"><div class="brand">NBI Analytics</div><h1>${escHtml(d.clientName)}</h1><div class="meta">Status Report &mdash; ${escHtml(date)} &mdash; Prepared by ${escHtml(d.generatedBy)}</div></div>`;

  // KPIs (numeric values are safe but escaped defensively)
  html += `<div class="kpi-grid">
    <div class="kpi"><div class="value">${escHtml(String(d.kpis.total))}</div><div class="label">Total Tasks</div></div>
    <div class="kpi"><div class="value" style="color:#22c55e">${escHtml(String(d.kpis.completePct))}%</div><div class="label">Complete</div></div>
    <div class="kpi"><div class="value" style="color:#3b82f6">${escHtml(String(d.kpis.inProgress))}</div><div class="label">In Progress</div></div>
    <div class="kpi"><div class="value" style="color:${d.kpis.overdue > 0 ? '#ef4444' : '#22c55e'}">${escHtml(String(d.kpis.overdue))}</div><div class="label">Overdue</div></div>
    <div class="kpi"><div class="value" style="color:${d.kpis.blocked > 0 ? '#a855f7' : '#22c55e'}">${escHtml(String(d.kpis.blocked))}</div><div class="label">Blocked</div></div>
    <div class="kpi"><div class="value">${escHtml(String(d.kpis.hrsSpent))}h</div><div class="label">Hours Spent</div></div>
  </div>`;

  // Status breakdown bar
  html += `<div class="section"><h2>Status Breakdown</h2><div class="bar">`;
  Object.entries(d.statusBreakdown).forEach(([status, count]) => {
    const pct = (count / d.kpis.total) * 100;
    html += `<div class="bar-seg" style="width:${pct}%;background:${statusColours[status] || '#666'}" title="${escHtml(status)}: ${count} (${Math.round(pct)}%)"></div>`;
  });
  html += `</div><div style="display:flex;flex-wrap:wrap;gap:12px;font-size:0.78rem;color:#999">`;
  Object.entries(d.statusBreakdown).forEach(([status, count]) => {
    html += `<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${statusColours[status] || '#666'};margin-right:4px"></span>${escHtml(status)}: ${count}</span>`;
  });
  html += `</div></div>`;

  // Projects
  if (d.projects.length > 0) {
    html += `<div class="section"><h2>Projects</h2><table><thead><tr><th>Project</th><th>Status</th><th>Health</th><th>Progress</th><th>Tasks</th></tr></thead><tbody>`;
    d.projects.forEach(p => {
      html += `<tr><td><strong>${escHtml(p.title)}</strong></td><td><span class="badge" style="background:${statusColours[p.status] || '#666'}20;color:${statusColours[p.status] || '#666'}">${escHtml(p.status)}</span></td>`;
      html += `<td>${escHtml(p.health || '-')}</td><td><div class="pct-bar"><div class="pct-fill" style="width:${p.pct}%"></div></div><span style="font-size:0.7rem;color:#999">${p.pct}%</span></td><td>${p.total}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // Blocked tasks
  if (d.blockedTasks.length > 0) {
    html += `<div class="section"><h2>Blocked Items</h2><table><thead><tr><th>Task</th><th>Status</th><th>Assigned To</th></tr></thead><tbody>`;
    d.blockedTasks.forEach(t => { html += `<tr><td>${escHtml(t.title)}</td><td>${escHtml(t.status)}</td><td>${escHtml((t.assignees || []).join(', ') || '-')}</td></tr>`; });
    html += `</tbody></table></div>`;
  }

  // Overdue tasks
  if (d.overdueTasks.length > 0) {
    html += `<div class="section"><h2>Overdue Items</h2><table><thead><tr><th>Task</th><th>Due Date</th><th>Assigned To</th></tr></thead><tbody>`;
    d.overdueTasks.forEach(t => { html += `<tr><td>${escHtml(t.title)}</td><td style="color:#ef4444">${escHtml(t.dueDate)}</td><td>${escHtml((t.assignees || []).join(', ') || '-')}</td></tr>`; });
    html += `</tbody></table></div>`;
  }

  html += `<div class="footer">Generated by NBI Analytics Dashboard &mdash; ${escHtml(date)}</div></div></body></html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/** GET /api/reports/:token/pdf — Public PDF download (no auth required) */
app.get('/api/reports/:token/pdf', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM client_reports WHERE share_token = $1', [req.params.token]);
  if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  if (rows[0].expires_at && new Date(rows[0].expires_at) < new Date()) return res.status(410).json({ error: 'Report expired' });

  const d = rows[0].report_data;
  const date = new Date(d.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${d.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_Status_Report_${date.replace(/\s/g, '_')}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(10).fillColor('#0066FF').text('NBI ANALYTICS', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(22).fillColor('#1a1a1a').text(d.clientName);
  doc.fontSize(12).fillColor('#666').text(`Status Report — ${date}`);
  doc.fontSize(10).fillColor('#999').text(`Prepared by ${d.generatedBy}`);
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
  doc.moveDown(1);

  // KPIs
  doc.fontSize(14).fillColor('#1a1a1a').text('Key Metrics');
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#333');
  doc.text(`Total Tasks: ${d.kpis.total}    Complete: ${d.kpis.completePct}%    In Progress: ${d.kpis.inProgress}    Overdue: ${d.kpis.overdue}    Blocked: ${d.kpis.blocked}`);
  doc.text(`Hours Spent: ${d.kpis.hrsSpent}h / ${d.kpis.hrsEst}h estimated`);
  doc.moveDown(1);

  // Projects table
  if (d.projects.length > 0) {
    doc.fontSize(14).fillColor('#1a1a1a').text('Projects');
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#999');
    doc.text('PROJECT', 50, doc.y, { width: 200, continued: true });
    doc.text('STATUS', 260, doc.y, { width: 80, continued: true });
    doc.text('PROGRESS', 350, doc.y, { width: 80, continued: true });
    doc.text('TASKS', 440, doc.y);
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
    doc.moveDown(0.3);

    d.projects.forEach(p => {
      if (doc.y > 720) { doc.addPage(); }
      doc.fontSize(9).fillColor('#333');
      doc.text(p.title.substring(0, 35), 50, doc.y, { width: 200, continued: true });
      doc.text(p.status, 260, doc.y, { width: 80, continued: true });
      doc.text(`${p.pct}%`, 350, doc.y, { width: 80, continued: true });
      doc.text(`${p.total}`, 440, doc.y);
      doc.moveDown(0.2);
    });
    doc.moveDown(1);
  }

  // Blocked items
  if (d.blockedTasks.length > 0) {
    if (doc.y > 650) doc.addPage();
    doc.fontSize(14).fillColor('#1a1a1a').text('Blocked Items');
    doc.moveDown(0.5);
    d.blockedTasks.forEach(t => {
      doc.fontSize(9).fillColor('#333').text(`• ${t.title} — ${(t.assignees || []).join(', ') || 'Unassigned'}`);
    });
    doc.moveDown(1);
  }

  // Overdue items
  if (d.overdueTasks.length > 0) {
    if (doc.y > 650) doc.addPage();
    doc.fontSize(14).fillColor('#1a1a1a').text('Overdue Items');
    doc.moveDown(0.5);
    d.overdueTasks.forEach(t => {
      doc.fontSize(9).fillColor('#cc0000').text(`• ${t.title} — due ${t.dueDate}`);
    });
    doc.moveDown(1);
  }

  // Footer
  doc.fontSize(8).fillColor('#999').text(`Generated by NBI Analytics Dashboard — ${date}`, 50, 770, { align: 'center', width: 495 });

  doc.end();
});

// ==================== RESOURCE PLANNING ====================

/** GET /api/resource-planning/capacity — Per-user weekly capacity vs committed hours (8 weeks forward) */
app.get('/api/resource-planning/capacity', async (req, res) => {
  const weeks = parseInt(req.query.weeks) || 8;
  const users = (await pool.query('SELECT id, username, display_name, capacity_hours_per_week, resource_type_ids FROM users ORDER BY display_name')).rows;
  const activeTasks = (await pool.query(
    `SELECT t.assignees, t.hours_estimated, t.start_date, t.end_date, t.due_date, t.status, t.created_at
     FROM tasks t WHERE t.status NOT IN ('Done', 'Cancelled')`
  )).rows;

  // Build week ranges starting from current Monday
  // JS getDay(): 0=Sun, 1=Mon..6=Sat. Offset formula maps any day back to its Monday.
  const now = new Date(); now.setHours(0,0,0,0);
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday wraps to previous Monday
  const startMonday = new Date(now); startMonday.setDate(now.getDate() + mondayOffset);

  const weekRanges = [];
  for (let w = 0; w < weeks; w++) {
    const wStart = new Date(startMonday); wStart.setDate(startMonday.getDate() + w * 7);
    const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
    weekRanges.push({ start: wStart, end: wEnd, label: wStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
  }

  // For each user, calculate committed hours per week
  // Build name variants for partial-match (e.g. "Glen" matches "Glen Pryer")
  const userNameVariants = {};
  users.forEach(u => {
    const dn = (u.display_name || '').toLowerCase();
    const parts = dn.split(/\s+/);
    userNameVariants[u.id] = [dn, ...parts]; // full name + each word
  });
  const result = users.map(u => {
    const variants = userNameVariants[u.id] || [];
    const userWeeks = weekRanges.map(wr => {
      let committed = 0;
      activeTasks.forEach(t => {
        if (!t.assignees) return;
        // Match if any assignee string matches this user's display name or first name (case-insensitive)
        const matched = t.assignees.some(a => {
          const al = a.toLowerCase().trim();
          return al === (u.display_name || '').toLowerCase() || variants.includes(al) || al.startsWith(variants[0]) || variants[0].startsWith(al);
        });
        if (!matched) return;
        // Determine task's active date range
        const taskStart = t.start_date ? new Date(t.start_date + 'T00:00:00') : new Date(t.created_at);
        const taskEnd = t.end_date ? new Date(t.end_date + 'T00:00:00') : t.due_date ? new Date(t.due_date + 'T00:00:00') : new Date(taskStart.getTime() + 14 * 24 * 60 * 60 * 1000); // default 2 weeks
        // Check overlap with this week
        if (taskEnd < wr.start || taskStart > wr.end) return;
        // Distribute hours evenly across the task's active weeks
        const taskWeeks = Math.max(1, Math.ceil((taskEnd - taskStart) / (7 * 24 * 60 * 60 * 1000)));
        const hrsPerWeek = (t.hours_estimated || 0) / taskWeeks;
        committed += hrsPerWeek;
      });
      const capacity = u.capacity_hours_per_week || 40;
      return {
        label: wr.label,
        start: wr.start.toISOString().slice(0,10),
        committed: Math.round(committed * 10) / 10,
        capacity,
        utilisation: capacity > 0 ? Math.round(committed / capacity * 100) : 0,
      };
    });
    return {
      id: u.id, name: u.display_name, username: u.username,
      capacityPerWeek: u.capacity_hours_per_week || 40,
      resourceTypeIds: u.resource_type_ids || [],
      weeks: userWeeks,
    };
  });

  res.json({ users: result, weekLabels: weekRanges.map(w => w.label) });
});

/** GET /api/resource-planning/deal-readiness/:leadId — Check if we can staff a lead's required roles */
app.get('/api/resource-planning/deal-readiness/:leadId', async (req, res) => {
  // Get lead's resource requirements
  const resources = (await pool.query(
    `SELECT lr.resource_type_id, lr.quantity, rt.name as role_name
     FROM lead_resources lr JOIN lead_resource_types rt ON lr.resource_type_id = rt.id
     WHERE lr.lead_id = $1`, [req.params.leadId]
  )).rows;

  if (resources.length === 0) return res.json({ canStaff: true, readiness: [], message: 'No resource requirements defined' });

  // Get all users with their resource type mappings
  const users = (await pool.query('SELECT id, display_name, resource_type_ids, capacity_hours_per_week FROM users')).rows;

  const readiness = resources.map(r => {
    // Find users who have this resource type in their skills
    const qualified = users.filter(u => (u.resource_type_ids || []).includes(r.resource_type_id));
    return {
      role: r.role_name,
      needed: r.quantity,
      available: qualified.length,
      canFill: qualified.length >= r.quantity,
      users: qualified.map(u => ({ id: u.id, name: u.display_name })),
    };
  });

  const canStaff = readiness.every(r => r.canFill);
  res.json({ canStaff, readiness });
});

/** PATCH /api/users/:id/skills — Update a user's resource type skills (admin only) */
app.patch('/api/users/:id/skills', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['resource_type_ids', 'capacity_hours_per_week']);
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING id, display_name, resource_type_ids, capacity_hours_per_week`, vals);
  res.json(rows[0]);
});

// ==================== SCHEDULED TASKS ====================
const CRON_TZ = { timezone: 'Europe/London' };

// Daily database backup at 2:00 AM (only if node-cron + backup module are available)
if (cron && runBackup) {
  cron.schedule('0 2 * * *', async () => {
    log('info', 'Cron', 'Running scheduled database backup...');
    try {
      await runBackup();
      // Validate the latest backup
      const backupDir = path.join(__dirname, 'backups');
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
      if (files.length > 0) {
        const result = await validateBackup(path.join(backupDir, files[0]), pool, log);
        if (!result.valid) {
          log('error', 'Backup', 'Backup validation failed', { issues: result.issues });
          // Notify admin
          try { await pool.query("INSERT INTO notifications (username, type, title, message, link) VALUES ('glen', 'warning', 'Backup Validation Failed', $1, '/nbi_project_dashboard.html#settings')", [result.issues.join('; ')]); } catch(e) {}
        } else {
          log('info', 'Backup', 'Backup validated successfully');
        }
      }
    } catch (e) { log('error', 'Backup', 'Backup failed', { error: e.message }); }
  }, CRON_TZ);
}

// Weekly cleanup of orphaned contract PDFs older than 90 days (B-B17)
if (cron) {
  cron.schedule('0 3 * * 0', async () => {
    try {
      const uploadsDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) return;
      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
      let removed = 0;
      for (const f of fs.readdirSync(uploadsDir)) {
        if (!f.endsWith('.pdf')) continue;
        const fp = path.join(uploadsDir, f);
        const stat = fs.statSync(fp);
        if (stat.mtimeMs < cutoff) { fs.unlinkSync(fp); removed++; }
      }
      if (removed > 0) log('info', 'Cron', `Cleaned up ${removed} orphaned PDF(s) older than 90 days`);
    } catch (e) { log('warn', 'Cron', 'PDF cleanup failed', { error: e.message }); }
  }, CRON_TZ);
}

// Monthly expense report reminder — 25th of every month at 9:00 AM
if (cron) {
  cron.schedule('0 9 25 * *', async () => {
    log('info', 'Cron', 'Sending monthly expense report reminders');
    try {
      const { rows: users } = await pool.query('SELECT username, display_name FROM users WHERE is_active = true');
      for (const user of users) {
        await createNotification(
          user.username,
          'expense_reminder',
          'Expense Report Reminder',
          `Hi ${user.display_name}, please submit your expense report for this month. Go to Expenses to create or update your report.`,
          '/nbi_project_dashboard.html#expenses',
          false  // non-dismissable — stays until a report is submitted
        );
      }
      log('info', 'Cron', `Expense reminders sent to ${users.length} users`);
    } catch(e) {
      log('error', 'Cron', 'Failed to send expense reminders', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Monthly expense reminder scheduled for 25th at 09:00');
}

// Daily FX rate auto-refresh at 6:00 AM
if (cron) {
  cron.schedule('0 6 * * *', async () => {
    try {
      const resp = await fxBreaker.fire(() => withRetry(
        () => fetch('https://api.frankfurter.dev/latest?from=GBP&to=USD,EUR,SEK', { signal: AbortSignal.timeout(10000) }),
        { maxAttempts: 3, backoffMs: 1000, log }
      ));
      if (resp.ok) {
        const data = await resp.json();
        const rates = {};
        for (const [currency, rate] of Object.entries(data.rates)) rates[currency] = 1 / rate;
        await pool.query(
          "INSERT INTO settings (key, value) VALUES ('fx_rates', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
          [JSON.stringify(rates)]
        );
        invalidateCache('fx_rates');
        log('info', 'FX', 'Exchange rates updated', rates);
      } else {
        log('warn', 'FX', 'Frankfurter API returned non-OK status', { status: resp.status });
      }
    } catch (e) {
      log('error', 'FX', 'Failed to fetch exchange rates', { err: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Daily FX rate refresh scheduled for 06:00');
}

// ==================== EMAIL CRON: PM DAILY REPORT ====================

/**
 * Build PM report emails for team leads.
 * @param {string} todayStr - YYYY-MM-DD
 * @param {string} windowStart - ISO timestamp for audit_log window start
 * @param {string} windowEnd - ISO timestamp for audit_log window end
 * @returns {Array<{to, subject, html}>}
 */
async function buildPmReportEmails(todayStr, windowStart, windowEnd) {
  const today = todayStr || new Date().toISOString().slice(0, 10);

  // Default window: previous business day 08:00 to today 08:00
  // Monday: window starts Friday 08:00
  if (!windowStart || !windowEnd) {
    const todayDate = new Date(today + 'T08:00:00');
    const dow = todayDate.getDay();
    const daysBack = dow === 1 ? 3 : 1; // Monday = 3 days back (from Friday)
    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - daysBack);
    windowStart = startDate.toISOString();
    windowEnd = todayDate.toISOString();
  }

  const fiveAhead = addBusinessDays(today, 5);

  // Get all team leads with their teams and client scopes
  const { rows: leads } = await pool.query(`
    SELECT u.id AS user_id, u.username, u.display_name, u.email,
           t.id AS team_id, t.name AS team_name, t.client_id
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.role = 'lead' AND u.is_active = true
  `);

  if (leads.length === 0) return [];

  // Group by user (a lead can lead multiple teams)
  const byUser = {};
  for (const row of leads) {
    if (!row.email) continue;
    if (!byUser[row.user_id]) {
      byUser[row.user_id] = { username: row.username, name: row.display_name, email: row.email, clientIds: new Set() };
    }
    if (row.client_id) byUser[row.user_id].clientIds.add(row.client_id);
  }

  const emails = [];
  for (const [userId, lead] of Object.entries(byUser)) {
    const clientIds = [...lead.clientIds];
    if (clientIds.length === 0) continue;

    // 1. Changed tickets (from audit_log)
    const { rows: changes } = await pool.query(`
      SELECT al.entity_id, al.action, al.changes, al.changed_by, al.created_at,
             tk.title, tk.status
      FROM audit_log al
      JOIN tasks tk ON tk.id = al.entity_id::uuid
      WHERE al.entity_type = 'task'
        AND al.created_at >= $1 AND al.created_at < $2
        AND tk.client_id = ANY($3)
      ORDER BY al.created_at DESC
    `, [windowStart, windowEnd, clientIds]);

    // 2. Overdue tasks
    const { rows: overdue } = await pool.query(`
      SELECT id, title, due_date, assignees, status, priority
      FROM tasks WHERE due_date != '' AND due_date < $1
        AND status NOT IN ('Done', 'Cancelled') AND client_id = ANY($2)
      ORDER BY due_date ASC
    `, [today, clientIds]);

    // 3. Due within 5 business days
    const { rows: dueSoon } = await pool.query(`
      SELECT id, title, due_date, assignees, status, priority
      FROM tasks WHERE due_date != '' AND due_date >= $1 AND due_date <= $2
        AND status NOT IN ('Done', 'Cancelled') AND client_id = ANY($3)
      ORDER BY due_date ASC
    `, [today, fiveAhead, clientIds]);

    // 4. Blocked tasks
    const { rows: blocked } = await pool.query(`
      SELECT id, title, due_date, assignees, status
      FROM tasks WHERE status = 'Blocked' AND client_id = ANY($1)
    `, [clientIds]);

    // 5. Lead activity updates
    const { rows: leadUpdates } = await pool.query(`
      SELECT la.activity_type, la.description, la.performed_by, la.created_at,
             l.title AS lead_title
      FROM lead_activities la
      JOIN leads l ON l.id = la.lead_id
      WHERE la.created_at >= $1 AND la.created_at < $2
        AND l.client_id = ANY($3)
      ORDER BY la.created_at DESC
    `, [windowStart, windowEnd, clientIds]);

    // If nothing to report, skip
    if (changes.length === 0 && overdue.length === 0 && dueSoon.length === 0 && blocked.length === 0 && leadUpdates.length === 0) continue;

    // Build summary bar
    const summaryParts = [];
    if (changes.length > 0) summaryParts.push(`${changes.length} change${changes.length === 1 ? '' : 's'}`);
    if (dueSoon.length > 0) summaryParts.push(`${dueSoon.length} due this week`);
    if (overdue.length > 0) summaryParts.push(`${overdue.length} overdue`);
    if (blocked.length > 0) summaryParts.push(`${blocked.length} blocked`);
    if (leadUpdates.length > 0) summaryParts.push(`${leadUpdates.length} lead update${leadUpdates.length === 1 ? '' : 's'}`);
    const summaryHtml = `<p style="background:#f1f5f9;padding:12px 16px;border-radius:6px;font-size:14px;color:#475569">${summaryParts.join(' &middot; ')}</p>`;

    let sectionsHtml = summaryHtml;

    // Overdue & Blocked
    if (overdue.length > 0 || blocked.length > 0) {
      const items = [...overdue.map(tk => ({ ...tk, _reason: `${businessDaysBetween(tk.due_date, today)}d late` })),
                     ...blocked.map(tk => ({ ...tk, _reason: 'Blocked' }))];
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Assignee', key: '_assigneeStr' },
        { label: 'Due', key: 'due_date' },
        { label: 'Issue', key: '_reason', style: 'color:#dc2626;font-weight:600' },
      ];
      const rows = items.map(tk => ({ ...tk, _assigneeStr: (tk.assignees || []).join(', ') }));
      sectionsHtml += buildEmailSection('Overdue & Blocked', '#dc2626', buildEmailTable(cols, rows));
    }

    // Due this week
    if (dueSoon.length > 0) {
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Assignee', key: '_assigneeStr' },
        { label: 'Due', key: 'due_date' },
        { label: 'Status', key: 'status' },
      ];
      const rows = dueSoon.map(tk => ({ ...tk, _assigneeStr: (tk.assignees || []).join(', ') }));
      sectionsHtml += buildEmailSection('Due This Week', '#f59e0b', buildEmailTable(cols, rows));
    }

    // Changes
    if (changes.length > 0) {
      const byTask = {};
      for (const c of changes) {
        if (!byTask[c.entity_id]) byTask[c.entity_id] = { title: c.title, entries: [] };
        byTask[c.entity_id].entries.push(c);
      }
      let changesHtml = '';
      for (const [taskId, { title, entries }] of Object.entries(byTask)) {
        changesHtml += `<div style="margin:8px 0"><strong>${title}</strong> &mdash; ${entries.length} change${entries.length === 1 ? '' : 's'}<ul style="margin:4px 0;padding-left:20px">`;
        for (const e of entries) {
          const changeData = typeof e.changes === 'string' ? JSON.parse(e.changes) : e.changes;
          const desc = changeData ? Object.entries(changeData).map(([k, v]) =>
            typeof v === 'object' && v.from !== undefined ? `${k}: ${v.from} \u2192 ${v.to}` : `${k}: ${JSON.stringify(v)}`
          ).join(', ') : e.action;
          const time = new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          changesHtml += `<li style="font-size:13px;color:#475569">${desc} (by ${e.changed_by}, ${time})</li>`;
        }
        changesHtml += '</ul></div>';
      }
      sectionsHtml += buildEmailSection('Changes Since Last Report', '#3b82f6', changesHtml);
    }

    // Lead updates
    if (leadUpdates.length > 0) {
      const cols = [
        { label: 'Lead', key: 'lead_title' },
        { label: 'Activity', key: 'activity_type' },
        { label: 'By', key: 'performed_by' },
        { label: 'When', key: '_time' },
      ];
      const rows = leadUpdates.map(la => ({
        ...la,
        _time: new Date(la.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      }));
      sectionsHtml += buildEmailSection('Lead Updates', '#8b5cf6', buildEmailTable(cols, rows));
    }

    const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const subject = `NBI Hub \u2014 Daily Report for ${lead.name || lead.username} \u2014 ${dateLabel}`;
    emails.push({
      to: lead.email,
      subject,
      html: buildEmailHtml(subject, `<p>Hi ${lead.name || lead.username},</p>${sectionsHtml}`),
    });
  }

  return emails;
}

// PM Daily Report — 08:00 weekdays
if (cron) {
  cron.schedule('0 8 * * 1-5', async () => {
    log('info', 'Cron', 'Running PM daily report emails');
    try {
      const emails = await buildPmReportEmails();
      for (const mail of emails) sendEmailAsync(mail);
      log('info', 'Cron', `PM reports: ${emails.length} email(s) queued`);
    } catch (e) {
      log('error', 'Cron', 'PM report job failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'PM daily report scheduled for 08:00 weekdays');
}

// ==================== INBOUND EMAIL MATCHING ====================

/**
 * Match an email subject line to a client and task.
 * Returns { taskId, clientId, confidence: 'high'|'low'|'none', matchedClient, matchedTask }
 */
async function matchSubjectToTask(subject) {
  if (!subject || !subject.trim()) return { taskId: null, clientId: null, confidence: 'none', matchedClient: null, matchedTask: null };

  const subjectLower = subject.toLowerCase().trim();

  // Step 1: Score all clients against the subject
  const { rows: clients } = await pool.query('SELECT id, name FROM clients ORDER BY name');

  let bestClient = null;
  let bestClientScore = 0;
  let confidence = 'none';

  for (const client of clients) {
    const clientLower = client.name.toLowerCase();

    // Exact substring match (highest score)
    if (subjectLower.includes(clientLower)) {
      const score = clientLower.length; // longer match = better
      if (score > bestClientScore) {
        bestClient = client;
        bestClientScore = score;
        confidence = 'high';
      }
      continue;
    }

    // Partial word match: check what fraction of client name words appear in subject
    const clientWords = clientLower.split(/\s+/);
    const matchedWords = clientWords.filter(w => w.length > 2 && subjectLower.includes(w));
    const ratio = matchedWords.length / clientWords.length;
    if (ratio >= 0.5) {
      const score = matchedWords.join('').length;
      if (score > bestClientScore) {
        bestClient = client;
        bestClientScore = score;
        confidence = ratio >= 1.0 ? 'high' : 'low';
      }
    }
  }

  if (!bestClient) return { taskId: null, clientId: null, confidence: 'none', matchedClient: null, matchedTask: null };

  // Step 2: Find the best matching task under this client
  const { rows: tasks } = await pool.query(`
    SELECT id, title, item_type, parent_id, updated_at
    FROM tasks
    WHERE client_id = $1 AND status NOT IN ('Done', 'Cancelled')
    ORDER BY updated_at DESC
  `, [bestClient.id]);

  if (tasks.length === 0) {
    return { taskId: null, clientId: bestClient.id, confidence, matchedClient: bestClient.name, matchedTask: null };
  }

  // Strip the client name from the subject to get the remainder for task matching
  const clientLower = bestClient.name.toLowerCase();
  let remainder = subjectLower.replace(clientLower, '').replace(/^[\s\-:]+|[\s\-:]+$/g, '').trim();

  // Score tasks by title match against the remainder
  let bestTask = null;
  let bestTaskScore = 0;

  if (remainder.length > 0) {
    for (const task of tasks) {
      const titleLower = task.title.toLowerCase();
      if (remainder.includes(titleLower) || titleLower.includes(remainder)) {
        const score = Math.min(titleLower.length, remainder.length);
        if (score > bestTaskScore) {
          bestTask = task;
          bestTaskScore = score;
        }
        continue;
      }
      const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2);
      const matchCount = titleWords.filter(w => remainder.includes(w)).length;
      if (matchCount > 0 && matchCount > bestTaskScore) {
        bestTask = task;
        bestTaskScore = matchCount;
      }
    }
  }

  // Fall back to most recently updated project for this client
  if (!bestTask) {
    bestTask = tasks.find(t => t.item_type === 'project') || tasks[0];
  }

  return {
    taskId: bestTask.id,
    clientId: bestClient.id,
    confidence,
    matchedClient: bestClient.name,
    matchedTask: bestTask.title,
  };
}

// ==================== INBOUND EMAIL PROCESSING ====================

/**
 * Extract <a href="...">text</a> links from HTML.
 * Returns [{url, title}].
 */
function extractLinksFromHtml(html) {
  const links = [];
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const url = match[1].trim();
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      links.push({ url, title: title.slice(0, 255) || url });
    }
  }
  return links;
}

/**
 * Process a single inbound email message from Graph API.
 * opts.skipGraphApi = true to skip marking as read + downloading attachments (for testing).
 * Returns { matched, skipped, taskId, confidence, error }
 */
async function processOneInboundEmail(message, opts = {}) {
  const fromAddr = message.from?.emailAddress?.address || '';
  const emailFrom = process.env.EMAIL_FROM || 'nbihub@nbi-consulting.com';

  // Skip emails from ourselves
  if (fromAddr.toLowerCase() === emailFrom.toLowerCase()) {
    return { skipped: true, reason: 'self' };
  }

  const subject = message.subject || '(no subject)';
  const bodyHtml = message.body?.content || '';
  const senderName = message.from?.emailAddress?.name || fromAddr;

  // Step 1: Match subject to client/task
  const match = await matchSubjectToTask(subject);

  // Fallback: if client matched but no task, attach to the client entity
  const entityType = match.taskId ? 'task' : (match.clientId ? 'client' : null);
  const entityId = match.taskId || match.clientId;

  if (!entityId) {
    log('warn', 'InboundEmail', 'No match for email', { subject, from: fromAddr });
    return { matched: false, confidence: 'none', subject };
  }

  const uploadedBy = match.confidence === 'high'
    ? 'nbihub (email)'
    : 'nbihub (email - verify match)';

  // Step 2: Save email body as HTML file
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString('hex');
  const htmlFilename = `${timestamp}-${randomHex}.html`;
  const htmlPath = path.join(uploadDir, htmlFilename);
  const originalName = `Email from ${senderName} - ${subject.slice(0, 100)}.html`;

  fs.writeFileSync(htmlPath, bodyHtml, 'utf8');
  const htmlSize = Buffer.byteLength(bodyHtml, 'utf8');

  await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, 'text/html', $6)`,
    [entityType, entityId, htmlFilename, originalName, htmlSize, uploadedBy]
  );

  // Step 3: Extract and store URL links
  const links = extractLinksFromHtml(bodyHtml);
  for (const link of links) {
    await pool.query(
      `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by, link_url, link_title)
       VALUES ($1, $2, NULL, NULL, NULL, 'link', $3, $4, $5)`,
      [entityType, entityId, uploadedBy, link.url, link.title]
    );
  }

  // Step 4: Download file attachments via Graph API (if any)
  if (message.hasAttachments && !opts.skipGraphApi) {
    try {
      const token = await _getGraphToken();
      const attRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${emailFrom}/messages/${message.id}/attachments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (attRes.ok) {
        const attData = await attRes.json();
        for (const att of (attData.value || [])) {
          if (att['@odata.type'] !== '#microsoft.graph.fileAttachment') continue;
          if (!att.contentBytes) continue;
          const attSize = att.size || 0;
          if (attSize > 25 * 1024 * 1024) {
            log('warn', 'InboundEmail', 'Skipping oversized attachment', { name: att.name, size: attSize });
            continue;
          }
          const ext = path.extname(att.name || '.bin');
          const attFilename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
          const attPath = path.join(uploadDir, attFilename);
          fs.writeFileSync(attPath, Buffer.from(att.contentBytes, 'base64'));

          await pool.query(
            `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [entityType, entityId, attFilename, att.name, attSize, att.contentType || 'application/octet-stream', uploadedBy]
          );
        }
      }
    } catch (e) {
      log('error', 'InboundEmail', 'Failed to download attachments', { messageId: message.id, error: e.message });
    }
  }

  // Step 5: Create notification for low-confidence matches
  if (match.confidence === 'low') {
    const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin' AND is_active = true");
    for (const admin of admins) {
      await createNotification(
        admin.username, 'email', 'Email auto-matched (low confidence)',
        `"${subject}" from ${senderName} was matched to ${match.matchedClient} / ${match.matchedTask}. Please verify.`,
        entityId, true
      );
    }
  }

  // Step 6: Mark email as read in Graph API
  if (!opts.skipGraphApi) {
    try {
      const token = await _getGraphToken();
      await fetch(
        `https://graph.microsoft.com/v1.0/users/${emailFrom}/messages/${message.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        }
      );
    } catch (e) {
      log('error', 'InboundEmail', 'Failed to mark email as read', { messageId: message.id, error: e.message });
    }
  }

  log('info', 'InboundEmail', 'Processed email', {
    subject, from: fromAddr, entityType, entityId,
    client: match.matchedClient, task: match.matchedTask,
    confidence: match.confidence, links: links.length,
  });

  return { matched: true, taskId: match.taskId, entityType, entityId, confidence: match.confidence, client: match.matchedClient, task: match.matchedTask };
}

/**
 * Poll nbihub inbox for unread emails and process each.
 * Called by the cron job every 5 minutes.
 */
async function processInboundEmails() {
  if (!_msalClient) {
    log('info', 'InboundEmail', 'Graph API not configured, skipping inbox poll');
    return;
  }

  const token = await _getGraphToken();
  const emailFrom = process.env.EMAIL_FROM || 'nbihub@nbi-consulting.com';

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${emailFrom}/mailFolders/Inbox/messages?$filter=isRead%20eq%20false&$select=id,subject,from,body,hasAttachments,receivedDateTime&$top=20&$orderby=receivedDateTime%20asc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API inbox poll failed ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const messages = data.value || [];

  if (messages.length === 0) return;

  log('info', 'InboundEmail', `Processing ${messages.length} unread email(s)`);

  let processed = 0;
  let matched = 0;
  let skipped = 0;

  for (const msg of messages) {
    try {
      const result = await processOneInboundEmail(msg);
      if (result.skipped) skipped++;
      else if (result.matched) matched++;
      processed++;
    } catch (e) {
      log('error', 'InboundEmail', 'Failed to process email', { messageId: msg.id, subject: msg.subject, error: e.message });
      // Mark as read anyway to prevent infinite retry loops
      try {
        await fetch(
          `https://graph.microsoft.com/v1.0/users/${emailFrom}/messages/${msg.id}`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true })
          }
        );
      } catch (_) { /* swallow */ }
    }
  }

  log('info', 'InboundEmail', `Inbox poll complete: ${processed} processed, ${matched} matched, ${skipped} skipped`);
}

// ==================== EMAIL CRON: DUE/LATE WARNINGS ====================

/**
 * Build warning emails for tasks that are due today or overdue.
 * Returns an array of { to, subject, html } mail option objects.
 * Exported for testing — the cron job calls this then sends each.
 */
async function buildDueWarningEmails(todayStr) {
  const today = todayStr || new Date().toISOString().slice(0, 10);

  // All active tasks where due_date <= today
  const { rows: tasks } = await pool.query(`
    SELECT t.id, t.title, t.due_date, t.status, t.priority, t.assignees,
           c.name AS client_name
    FROM tasks t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE t.due_date != '' AND t.due_date <= $1
      AND t.status NOT IN ('Done', 'Cancelled')
    ORDER BY t.due_date ASC
  `, [today]);

  if (tasks.length === 0) return [];

  // Collect all unique assignee usernames
  const allAssignees = [...new Set(tasks.flatMap(t => t.assignees || []))];
  if (allAssignees.length === 0) return [];

  // Fetch email addresses for those users
  const { rows: users } = await pool.query(
    'SELECT username, email, display_name FROM users WHERE display_name = ANY($1) AND email IS NOT NULL AND is_active = true',
    [allAssignees]
  );
  const emailMap = Object.fromEntries(users.map(u => [u.display_name, { email: u.email, name: u.display_name }]));

  // Group tasks by assignee
  const byAssignee = {};
  for (const task of tasks) {
    for (const assignee of (task.assignees || [])) {
      if (!emailMap[assignee]) continue;
      if (!byAssignee[assignee]) byAssignee[assignee] = [];
      byAssignee[assignee].push(task);
    }
  }

  // Build one email per assignee
  const emails = [];
  for (const [username, userTasks] of Object.entries(byAssignee)) {
    const { email, name } = emailMap[username];
    const overdue = userTasks.filter(t => t.due_date < today);
    const dueToday = userTasks.filter(t => t.due_date === today);

    let sectionsHtml = '';
    if (overdue.length > 0) {
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Client', key: 'client_name' },
        { label: 'Due', key: 'due_date' },
        { label: 'Days Late', key: '_daysLate', style: 'color:#dc2626;font-weight:600' },
      ];
      const rows = overdue.map(t => ({
        ...t,
        _daysLate: businessDaysBetween(t.due_date, today)
      }));
      sectionsHtml += buildEmailSection(`Overdue (${overdue.length})`, '#dc2626', buildEmailTable(cols, rows));
    }
    if (dueToday.length > 0) {
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Client', key: 'client_name' },
        { label: 'Priority', key: 'priority' },
      ];
      sectionsHtml += buildEmailSection(`Due Today (${dueToday.length})`, '#f59e0b', buildEmailTable(cols, dueToday));
    }

    const total = userTasks.length;
    const subject = `NBI Hub \u2014 ${total} ticket${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} attention`;
    emails.push({
      to: email,
      subject,
      html: buildEmailHtml(subject, `<p>Hi ${name || username},</p>${sectionsHtml}`),
    });
  }

  return emails;
}

// Due & Late Ticket Warnings — 09:00 weekdays
if (cron) {
  cron.schedule('0 9 * * 1-5', async () => {
    log('info', 'Cron', 'Running due/late ticket warning emails');
    try {
      const emails = await buildDueWarningEmails();
      for (const mail of emails) sendEmailAsync(mail);
      log('info', 'Cron', `Due/late warnings: ${emails.length} email(s) queued`);
    } catch (e) {
      log('error', 'Cron', 'Due/late warning job failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Due/late ticket warnings scheduled for 09:00 weekdays');
}

// Inbound Email Polling — every 10 minutes (reduced from 5 to avoid Graph API 429 throttling)
if (cron) {
  cron.schedule('*/10 * * * *', async () => {
    try {
      await processInboundEmails();
    } catch (e) {
      log('error', 'Cron', 'Inbound email poll failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Inbound email polling scheduled every 10 minutes');
}

// Daily dashboard snapshot at 00:05 UTC
if (cron) {
  cron.schedule('5 0 * * *', async () => {
    try {
      const snap = await computeDashboardSnapshot();
      await pool.query(
        `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (snapshot_date) DO NOTHING`,
        [snap.snapshot_date, snap.active_projects, snap.overdue_count, snap.blocked_count, snap.at_risk_count, snap.hours_spent, snap.hours_estimated, snap.tasks_planned, snap.tasks_added, snap.tasks_completed]
      );
      log('info', 'Cron', 'Dashboard snapshot recorded', { date: snap.snapshot_date });
    } catch (e) {
      log('error', 'Cron', 'Dashboard snapshot failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Dashboard snapshot scheduled for 00:05 daily (Europe/London)');
}

// Bootstrap today's snapshot on startup if it doesn't exist yet
(async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query('SELECT 1 FROM dashboard_snapshots WHERE snapshot_date = $1', [today]);
    if (rows.length === 0) {
      const snap = await computeDashboardSnapshot();
      await pool.query(
        `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (snapshot_date) DO NOTHING`,
        [snap.snapshot_date, snap.active_projects, snap.overdue_count, snap.blocked_count, snap.at_risk_count, snap.hours_spent, snap.hours_estimated, snap.tasks_planned, snap.tasks_added, snap.tasks_completed]
      );
      log('info', 'Startup', 'Bootstrapped dashboard snapshot', { date: today });
    }
  } catch (e) {
    log('warn', 'Startup', 'Dashboard snapshot bootstrap failed', { error: e.message });
  }
})();

// ==================== ERROR HANDLING ====================
// IMPORTANT: Must be registered AFTER all route definitions so it catches errors from every endpoint.

/**
 * Global error handler -- catches unhandled errors from async route handlers
 * (forwarded automatically by express-async-errors). Logs the first 3 lines
 * of the stack trace and returns a generic 500 response.
 */
app.use((err, req, res, next) => {
  log('error', 'Server', 'Unhandled error', { error: err.message, stack: err.stack?.split('\n').slice(0, 3).join(' | ') });
  if (!res.headersSent) {
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// ==================== STARTUP ====================

/**
 * Graceful shutdown -- close the HTTP server then drain the DB pool.
 * Forces exit after 10 seconds if the shutdown hangs.
 * @param {string} signal - The signal that triggered shutdown (e.g. 'SIGTERM', 'SIGINT')
 */
// Side-effects below are gated so that test runners (supertest / Playwright)
// can `require('./server')` to get the Express app without binding a port,
// running migrations, or installing signal handlers. The `app` export at the
// bottom of this file is the only public API for tests.
if (require.main === module) {
  function gracefulShutdown(signal) {
    log('info', 'Server', `${signal} received, shutting down gracefully`);
    server.close(() => {
      pool.end().then(() => {
        log('info', 'Server', 'DB pool closed. Goodbye.');
        process.exit(0);
      });
    });
    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => { log('error', 'Server', 'Forced exit after timeout'); process.exit(1); }, 10000).unref();
  }
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Run versioned migrations (replaces inline auto-migration block)
  runMigrations(pool, log).catch(err => log('error', 'Migration', 'Migration runner failed', { error: err.message }));

  // Bind to 0.0.0.0 so the dashboard is accessible from other devices on the local network
  var server = app.listen(PORT, '0.0.0.0', () => {
    // Enumerate local IPv4 addresses for the "share this URL" message
    const nets = os.networkInterfaces();
    const ips = [];
    for (const iface of Object.values(nets)) {
      for (const net of iface) {
        if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
      }
    }
    const maskedUrl = DB_URL.replace(/:([^@]+)@/, ':****@');
    log('info', 'Server', `NBI Dashboard Server running on port ${PORT}`, {
      local: `http://localhost:${PORT}/nbi_project_dashboard.html`,
      network: ips.length > 0 ? `http://${ips[0]}:${PORT}/nbi_project_dashboard.html` : null,
      api: `http://localhost:${PORT}/api/health`,
      db: maskedUrl
    });
  });
}

// Export the Express app so supertest/Playwright can import it without
// triggering the listener block above. Tests do: const app = require('../../server');
module.exports = app;
module.exports.getClientScope = getClientScope;
module.exports.getClientScopes = getClientScopes;
module.exports.requireInternal = requireInternal;
module.exports.shiftForInsert = shiftForInsert;
module.exports.reorderInGroup = reorderInGroup;
module.exports.addBusinessDays = addBusinessDays;
module.exports.businessDaysBetween = businessDaysBetween;
module.exports.buildEmailHtml = buildEmailHtml;
module.exports.buildEmailTable = buildEmailTable;
module.exports.buildEmailSection = buildEmailSection;
module.exports.buildDueWarningEmails = buildDueWarningEmails;
module.exports.buildPmReportEmails = buildPmReportEmails;
module.exports.matchSubjectToTask = matchSubjectToTask;
module.exports.processOneInboundEmail = processOneInboundEmail;
module.exports.processInboundEmails = processInboundEmails;
module.exports.extractLinksFromHtml = extractLinksFromHtml;
