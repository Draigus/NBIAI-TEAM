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
const { log } = require('./lib/logger');
const { createPool } = require('./lib/db');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');

const { rateLimit } = require('express-rate-limit');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
let archiver;
try { archiver = require('archiver'); } catch (e) { /* archiver optional — expense report ZIP export disabled */ }
const { withRetry, CircuitBreaker } = require('./resilience');
const { validateBackup } = require('./backup-validate');
const { verifySlackSignature, handleAppMention } = require('./lib/slack-bot');
const runMigrations = require('./migrations/runner');
let cron, runBackup;
try { cron = require('node-cron'); runBackup = require('./backup'); }
catch (e) { /* logged after logger init below */ }

const {
  ITEM_TYPES, VALID_CHILD_TYPE, VALID_PARENT_TYPE, inferItemType,
  addBusinessDays, businessDaysBetween,
  buildPatchQuery,
  POSITION_TABLES, shiftForInsert, reorderInGroup,
  isValidUuid, UUID_RE, validateLength, MAX_LENGTHS,
  hashToken, escHtml,
} = require('./lib/helpers');

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
const pool = createPool(DB_URL);

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Cloudflare tunnel) for correct IP in rate limiter

// ==================== AUTH MIDDLEWARE ====================
const {
  SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS, FAILED_LOGIN_THRESHOLD, FAILED_LOGIN_LOCKOUT, LOCKOUT_DURATION,
  getSessionCookieOpts, getCookieToken,
  cacheToken, getCachedToken, invalidateToken,
  getFailedLogins, recordFailedLogin, clearFailedLogins,
  requireAuth, getClientScopes, getClientScope,
  requireNBI, requireAdmin, requireClientAdmin, requireTaskAccess,
  invalidateUserTokens, clearTokenCache,
} = require('./lib/auth-middleware')(pool);

// ==================== EMAIL ====================
const {
  sendEmailAsync, setEmailCounter, EMAIL_FROM, APP_URL, _msalClient,
  buildEmailHtml, buildEmailTable, buildEmailSection,
} = require('./lib/email');

// ==================== CONFIG CACHE ====================
const _configCache = {};
const CONFIG_CACHE_TTL = 5 * 60 * 1000;

async function getCached(key, fetcher) {
  const entry = _configCache[key];
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  const data = await fetcher();
  _configCache[key] = { data, expiresAt: Date.now() + CONFIG_CACHE_TTL };
  return data;
}
function invalidateCache(key) { delete _configCache[key]; }

setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(_configCache)) { if (_configCache[key].expiresAt <= now) delete _configCache[key]; }
}, 10 * 60 * 1000).unref();

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
    "script-src 'self' 'unsafe-inline' cdn.sheetjs.com cdnjs.cloudflare.com cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
    "font-src 'self' fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' api.frankfurter.dev open.er-api.com cdn.jsdelivr.net; " +
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
  max: 200,
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
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    if (req.path === '/api/slack/events') req.rawBody = buf.toString('utf8');
  },
}));   // Allow large payloads for sync/restore
app.use((req, res, next) => {
  const ms = req.path.startsWith('/api/restore') || req.path.startsWith('/api/backup') ? 120000 : 30000;
  req.setTimeout(ms);
  res.setTimeout(ms);
  next();
});

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
const { setupMetrics } = require('./lib/metrics');
const { syncConflicts, authFailures, ocrRequests, emailSends } = setupMetrics(app, pool);
setEmailCounter(emailSends);

/** GET / -- Serve the dashboard HTML from the parent directory (single-page app entry point) */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'nbi_project_dashboard.html'));
});
/** GET /nbi_project_dashboard.html -- Alias for the dashboard entry point */
app.get('/nbi_project_dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'nbi_project_dashboard.html'));
});

// ==================== AUTH (modular) ====================
app.use(require('./routes/auth')({ pool, log, hashToken, escHtml, cacheToken, invalidateToken, clearTokenCache, SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS, getSessionCookieOpts, getCookieToken, FAILED_LOGIN_THRESHOLD, FAILED_LOGIN_LOCKOUT, LOCKOUT_DURATION, getFailedLogins, recordFailedLogin, clearFailedLogins, sendEmailAsync, EMAIL_FROM, APP_URL, _msalClient, authFailures, requireAdmin, requireAuth }));

// Internal endpoint for services (e.g. nbi-news) to create admin notifications.
// Authenticated via x-nbi-internal-token matching DASHBOARD_NOTIFICATION_TOKEN
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
      const { rowCount } = await pool.query(
        `INSERT INTO notifications (username, type, title, message, link, dismissable)
         SELECT username, $1, $2, $3, $4, $5 FROM users WHERE role = 'admin' AND is_active = true`,
        [type, title, message || '', link || '', dismissable !== false]
      );
      return res.json({ ok: true, recipients: rowCount });
    }
    if (!username) return res.status(400).json({ error: 'username required when targetAdmins not set' });
    await createNotification(username, type, title, message || '', link || '', dismissable !== false);
    res.json({ ok: true });
  } catch (err) {
    log('error', 'internal/notifications', 'error', err);
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
          isAdmin: req.user.role === 'admin',
        }));
      }
      proxyReq.setHeader('x-nbi-internal-token', NEWS_INTERNAL_TOKEN);
    },
    error: (err, req, res) => {
      log('error', 'news-proxy', 'error', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'news service unavailable' });
    },
  },
}));

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
    log('error', 'getExpenseApprover', 'settings lookup failed', e.message);
  }
  return process.env.EXPENSE_APPROVER_USERNAME || null;
}

/**
 * Strip sensitive fields from audit data before persisting.
 * @param {Object} data - The raw audit data object
 * @returns {Object} Data with password/token fields redacted
 */
// ==================== AUDIT ====================
const { auditLog, sanitiseAuditData, computeNextRepeatDate } = require('./lib/audit')(pool);
const { createNotification } = require('./lib/notifications')(pool);

// ==================== MODULAR ROUTES ====================
app.use(require('./routes/users')({ pool, log, requireAdmin, requireNBI, requireClientAdmin, isValidUuid, auditLog, invalidateUserTokens, getClientScope, sendEmailAsync, EMAIL_FROM, APP_URL, _msalClient, cacheToken, validateLength, buildPatchQuery }));
app.use(require('./routes/settings')({ pool, requireAdmin }));
app.use(require('./routes/finance')({ pool, requireNBI, requireAdmin, auditLog, syncConflicts, log }));
app.use(require('./routes/time-entries')({ pool, isValidUuid, requireTaskAccess }));
app.use(require('./routes/time-off')({ pool, requireAdmin, isValidUuid }));
app.use(require('./routes/queue')({ pool, requireAdmin, log, isValidUuid, validateLength }));
app.use(require('./routes/contacts')({ pool, requireAuth, requireAdmin }));
app.use(require('./routes/client-notes')({ pool, requireAdmin, getClientScopes, buildPatchQuery }));
app.use(require('./routes/notifications')({ pool, requireAdmin, requireNBI, createNotification, log }));
app.use(require('./routes/templates')({ pool, requireAdmin, isValidUuid, log }));
app.use(require('./routes/slack')({ pool, log, verifySlackSignature, handleAppMention }));

/**
 * GET /api/audit-log
 * Paginated audit log with optional filters by entity_type, action, or free-text search.
 * Joins to tasks table to enrich entries with task titles where applicable.
 */
app.get('/api/audit-log', requireNBI, requireAdmin, async (req, res) => {
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

/** GET /api/seed-data — Return seed CSV data for initial bootstrap (admin only).
 *  Seed data is loaded from seed-data.csv if it exists, otherwise returns empty. */
app.get('/api/seed-data', requireNBI, requireAdmin, async (req, res) => {
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
app.get('/api/backup', requireNBI, requireAdmin, async (req, res) => {
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
app.post('/api/restore', requireAdmin, async (req, res) => {
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
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
  const { rows } = await pool.query('SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC', [req.params.id]);
  res.json(rows);
});

/** POST /api/tasks/:id/comments — Add a comment to a task */
app.post('/api/tasks/:id/comments', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
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
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
  const { rows } = await pool.query('SELECT author FROM task_comments WHERE id = $1 AND task_id = $2', [req.params.commentId, req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
  const isOwner = rows[0].author === (req.user?.displayName || req.user?.display_name);
  if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Can only delete your own comments' });
  await pool.query('DELETE FROM task_comments WHERE id = $1 AND task_id = $2', [req.params.commentId, req.params.id]);
  res.json({ ok: true });
});

// ==================== IMPORT PARSER ====================
const { detectImportFormat, parseExcelFile, parseCSVFile, mapRowsToTasks } = require('./lib/import-parser');

/**
 * GET /api/import/scan-downloads
 * Scans the user's Downloads folder for importable Excel/CSV files.
 * Returns file list with detected format, size, modification date.
 */
app.get('/api/import/scan-downloads', requireAdmin, async (req, res) => {
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
    async function scanDir(dir, prefix) {
      let entries;
      try { entries = fs.readdirSync(dir); } catch(e) { return; }
      for (const name of entries) {
        if (name.startsWith('~$')) continue;
        const fullPath = path.join(dir, name);
        let stat;
        try { stat = fs.statSync(fullPath); } catch(e) { continue; }
        // Recurse into known subdirectories only (one level deep)
        if (stat.isDirectory() && !prefix && knownSubdirs.includes(name)) { await scanDir(fullPath, name); continue; }
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
            const parsed = await parseExcelFile(fullPath, true);
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

    await scanDir(downloadsDir, '');
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
app.post('/api/import/parse-file', requireAdmin, async (req, res) => {
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
      const parsed = await parseExcelFile(fullPath);
      if (parsed.sheets.length === 0) return res.status(400).json({ error: 'Empty spreadsheet' });
      const targetSheet = sheet ? parsed.sheets.find(s => s.name === sheet) : parsed.sheets[0];
      if (!targetSheet) return res.status(400).json({ error: 'Sheet not found' });
      const format = detectImportFormat(targetSheet.headers);
      const mapped = mapRowsToTasks(format.format, targetSheet.headers, targetSheet.rows || targetSheet.sample);
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

// ==================== TASK ATTACHMENTS ====================

/** GET /api/tasks/:id/attachments — List file attachments for a task */
app.get('/api/tasks/:id/attachments', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
  const { rows } = await pool.query('SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY created_at DESC', [req.params.id]);
  res.json(rows);
});

/** POST /api/tasks/:id/attachments — Upload a file attachment to a task (max 25MB) */
app.post('/api/tasks/:id/attachments', upload.single('file'), async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const author = req.user?.displayName || 'unknown';
  const { rows } = await pool.query(
    'INSERT INTO task_attachments (task_id, filename, original_name, size_bytes, mime_type, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.params.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, author]
  );
  await auditLog('attachment', rows[0].id, 'create', author, { task_id: req.params.id, filename: req.file.originalname });
  res.status(201).json(rows[0]);
});

/** DELETE /api/tasks/:id/attachments/:attachmentId — Remove an attachment and delete the file from disk */
app.delete('/api/tasks/:id/attachments/:attachmentId', async (req, res) => {
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
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

app.use(require('./routes/attachments')({ pool, requireAdmin, requireNBI, upload, log, isValidUuid, auditLog }));

/**
 * POST /api/tasks/:id/attachments/link
 * Convenience alias for adding a link attachment to a task. Mirrors the
 * universal endpoint above so the task detail panel does not need to know the
 * generic /entity/task/:id form.
 */
app.post('/api/tasks/:id/attachments/link', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
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
app.use(require('./routes/calendar')({ pool, requireAdmin, isValidUuid, getClientScopes, auditLog, log }));

// ==================== CLIENTS ====================

app.use(require('./routes/clients')({ pool, requireAdmin, getClientScopes, isValidUuid, auditLog, log, validateLength, buildPatchQuery }));

// ==================== MILESTONES (modular) ====================
app.use(require('./routes/milestones')({ pool, requireAdmin, isValidUuid }));

// ==================== SOWs (modular) ====================
app.use(require('./routes/sows')({ pool, requireAdmin, isValidUuid, upload, auditLog, log, validateLength, buildPatchQuery }));

// ==================== TEAMS (modular) ====================

app.use(require('./routes/teams')({ pool, requireAdmin, isValidUuid, auditLog, log, validateLength, buildPatchQuery }));


// ==================== CONTACTS ====================

/** PATCH /api/contacts/:id — Update a contact's details */
app.patch('/api/contacts/:id', requireAdmin, async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid contact ID' });
  const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['name', 'role', 'notes', 'background', 'linkedin', 'sort_order', 'email', 'phone']);
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE contacts SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
  if (rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
  res.json(rows[0]);
});

/** DELETE /api/contacts/:id — Remove a contact (admin only) */
app.delete('/api/contacts/:id', requireAdmin, async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid contact ID' });
  await pool.query('DELETE FROM contacts WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ==================== DOCUMENTS ====================

const { redactNbiInternal, extractPlainText, imageInScope, extractImageFilenames } = require('./lib/redact-nbi-internal');
const { pickFilesToDelete } = require('./lib/attachment-sweep');

/** GET /api/documents?client_id=:uuid
 *  Return the page tree for a client.
 *  NBI users see all pages; client portal users see only visibility='all' rows.
 *  nbiInternalBlock content is stripped from body_json before send for client users.
 *  Client users with docs_view=false receive 403. */
app.get('/api/documents', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const clientId = req.query.client_id;
  if (!clientId || !isValidUuid(clientId)) {
    return res.status(400).json({ error: 'client_id query param required' });
  }

  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== clientId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (isClientUser && req.user.docsView === false) {
    return res.status(403).json({ error: 'No doc-view permission' });
  }

  const visibilityClause = isClientUser ? `AND visibility = 'all'` : '';

  if (!isClientUser) {
    const existing = await pool.query('SELECT 1 FROM documents WHERE client_id = $1 LIMIT 1', [clientId]);
    if (existing.rowCount === 0) {
      const defaults = ['Overview', 'Contacts', 'Risks', 'Decisions', 'Architecture', 'Notes'];
      for (let i = 0; i < defaults.length; i++) {
        await pool.query(
          `INSERT INTO documents (client_id, title, sort_order, created_by, updated_by) VALUES ($1,$2,$3,$4,$4)`,
          [clientId, defaults[i], i, req.user.username || 'system']
        );
      }
    }
  }

  // Determine if this user can see hidden pages
  const canSeeHidden = !isClientUser || req.user.docsEdit === true;

  const { rows } = await pool.query(
    `SELECT id, parent_id, task_id, title, body_json, visibility, hidden, sort_order, updated_at, updated_by
       FROM documents WHERE client_id = $1 ${visibilityClause}
       ORDER BY parent_id NULLS FIRST, sort_order, created_at`,
    [clientId]
  );

  let out;
  if (!canSeeHidden) {
    // Build a set of hidden page IDs (explicitly hidden)
    const hiddenIds = new Set(rows.filter(r => r.hidden).map(r => r.id));
    // Walk ancestors: if any ancestor is hidden, exclude this row
    function hasHiddenAncestor(row) {
      let cur = row;
      while (cur.parent_id) {
        if (hiddenIds.has(cur.parent_id)) return true;
        cur = rows.find(r => r.id === cur.parent_id);
        if (!cur) break;
      }
      return false;
    }
    out = rows.filter(r => !r.hidden && !hasHiddenAncestor(r));
  } else {
    out = rows;
  }

  if (isClientUser) {
    out = out.map(r => ({ ...r, body_json: redactNbiInternal(r.body_json) }));
  }
  res.json(out);
});

/** GET /api/documents/:id
 *  Return one page. Same redaction and visibility rules as the list endpoint.
 *  Client users requesting a nbi_only doc receive 404 (not 403) to avoid
 *  existence disclosure. */
app.get('/api/documents/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  const { rows } = await pool.query(
    `SELECT id, client_id, parent_id, task_id, title, body_json, visibility, hidden,
            sort_order, updated_at, updated_by
       FROM documents WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const doc = rows[0];

  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== doc.client_id) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (isClientUser && doc.visibility === 'nbi_only') {
    return res.status(404).json({ error: 'Not found' });
  }
  // Hidden pages: return 404 to client users without docs_edit (same pattern as nbi_only)
  if (isClientUser && doc.hidden && req.user.docsEdit !== true) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (isClientUser && req.user.docsView === false) {
    return res.status(403).json({ error: 'No doc-view permission' });
  }

  if (isClientUser) doc.body_json = redactNbiInternal(doc.body_json);
  // D1: emit a weak ETag derived from updated_at so clients can detect concurrent edits
  res.set('ETag', `W/"${doc.updated_at.toISOString()}"`);
  res.json(doc);
});

/** PATCH /api/documents/:id
 *  Update one page. Requires If-Match header (D1 optimistic concurrency).
 *  Returns 428 if If-Match is missing; 409 (with current doc in body) if stale.
 *  On body_json change also writes body_text for full-text indexing (B1).
 *  Client portal users need docsEdit permission; they cannot set visibility='nbi_only'.
 *
 *  Security note: scope guards run BEFORE the ETag comparison so a client-A user
 *  sending a stale If-Match for client-B's doc gets 404, not a 409 that leaks the
 *  doc body. */
app.patch('/api/documents/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  // D1: If-Match is mandatory; 428 Precondition Required if absent
  const ifMatch = req.headers['if-match'];
  if (!ifMatch) return res.status(428).json({ error: 'If-Match header required for optimistic concurrency' });

  // Parse and validate the If-Match value upfront (I1: used in WHERE clause later)
  const etagMatch = ifMatch.match(/^W\/"(.+)"$/);
  if (!etagMatch) return res.status(400).json({ error: 'Malformed If-Match header' });
  const ifMatchTs = new Date(etagMatch[1]);
  if (isNaN(ifMatchTs.getTime())) return res.status(400).json({ error: 'Malformed If-Match header' });

  // Fetch current doc (still needed for scope guards and cycle detection)
  const { rows } = await pool.query(
    `SELECT id, client_id, parent_id, task_id, title, body_json, visibility, hidden,
            sort_order, updated_at, updated_by
       FROM documents WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const current = rows[0];

  // C1: Scope guards run BEFORE ETag comparison to prevent existence/content disclosure.
  // A client user on the wrong client, or requesting an nbi_only doc, gets 404 regardless
  // of whether their If-Match is fresh or stale.
  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== current.client_id) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (isClientUser && current.visibility === 'nbi_only') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (isClientUser && req.user.docsEdit === false) {
    return res.status(403).json({ error: 'No doc-edit permission' });
  }

  // D1: compare If-Match against the current ETag (after scope guards)
  // RFC 7232 specifies 412 for a failed precondition, but we return 409 here
  // because the frontend conflict modal needs a uniform shape with the current
  // doc state regardless of whether the mismatch was stale-client or concurrent write.
  // C1/I3: redact the body in the 409 response for client portal users.
  const currentEtag = `W/"${current.updated_at.toISOString()}"`;
  if (ifMatch !== currentEtag) {
    const safeCurrentForClient = isClientUser
      ? { ...current, body_json: redactNbiInternal(current.body_json) }
      : current;
    return res.status(409).json({ error: 'Conflict', current: safeCurrentForClient });
  }

  // Build standard field updates via the shared helper (prevents SQL injection)
  const allowedFields = isClientUser
    ? (req.user.docsEdit
        ? ['title', 'body_json', 'parent_id', 'task_id', 'sort_order', 'hidden']
        : ['title', 'body_json', 'parent_id', 'task_id', 'sort_order'])
    : ['title', 'body_json', 'parent_id', 'task_id', 'sort_order', 'visibility', 'hidden'];

  const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowedFields);
  let idx = nextIdx;

  // Special handling layered on top of buildPatchQuery output -----------------

  // parent_id: validate uuid, reject self-reference, and reject descendant cycle (I2)
  if (req.body.parent_id !== undefined && req.body.parent_id !== null) {
    if (!isValidUuid(req.body.parent_id)) {
      return res.status(400).json({ error: 'Invalid parent_id' });
    }
    if (req.body.parent_id === req.params.id) {
      return res.status(400).json({ error: 'circular: a document cannot be its own parent' });
    }
    // I2: descendant-cycle check. Only run when parent_id is actually changing.
    if (req.body.parent_id !== current.parent_id) {
      const cycleCheck = await pool.query(
        `WITH RECURSIVE descendants AS (
           SELECT id FROM documents WHERE id = $1
           UNION ALL
           SELECT d.id FROM documents d
           INNER JOIN descendants ON d.parent_id = descendants.id
         )
         SELECT 1 FROM descendants WHERE id = $2 LIMIT 1`,
        [req.params.id, req.body.parent_id]
      );
      if (cycleCheck.rows.length > 0) {
        return res.status(400).json({ error: 'circular: cannot move under a descendant' });
      }
    }
  }

  // task_id: validate uuid if provided
  if (req.body.task_id !== undefined && req.body.task_id !== null) {
    if (!isValidUuid(req.body.task_id)) {
      return res.status(400).json({ error: 'Invalid task_id' });
    }
  }

  // visibility: NBI users only; must be one of the allowed values
  if (req.body.visibility !== undefined) {
    if (!['all', 'nbi_only'].includes(req.body.visibility)) {
      return res.status(400).json({ error: "visibility must be 'all' or 'nbi_only'" });
    }
    if (isClientUser) {
      return res.status(403).json({ error: 'Client users cannot set visibility' });
    }
  }

  // hidden: must be boolean
  if (req.body.hidden !== undefined) {
    if (typeof req.body.hidden !== 'boolean') {
      return res.status(400).json({ error: 'hidden must be a boolean' });
    }
  }

  // body_json: also compute and write body_text for full-text indexing (B1).
  // dropNbiInternal: false. Write-time indexing keeps NBI-internal content so
  // NBI users can search across all content including internal sections.
  if (req.body.body_json !== undefined) {
    const bodyText = extractPlainText(req.body.body_json, { dropNbiInternal: false });
    updates.push(`body_text = $${idx}`);
    vals.push(bodyText);
    idx++;
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  // Append audit columns
  const author = req.user.username || req.user.displayName || 'unknown';
  updates.push(`updated_at = now()`);
  updates.push(`updated_by = $${idx}`);
  vals.push(author);
  idx++;

  // I1: Atomic optimistic-concurrency check. The WHERE clause includes the
  // original updated_at so two concurrent PATCHes with the same If-Match
  // cannot both succeed. The second will match zero rows.
  // Comparison is truncated to millisecond precision because the ETag is
  // emitted via Date.toISOString() (3-digit ms), whereas Postgres timestamptz
  // stores microseconds. Without date_trunc the WHERE never matches its own
  // freshly-emitted ETag.
  vals.push(req.params.id);
  vals.push(ifMatchTs);
  const { rows: updated } = await pool.query(
    `UPDATE documents SET ${updates.join(', ')}
      WHERE id = $${idx}
        AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $${idx + 1}::timestamptz)
      RETURNING id, client_id, parent_id, task_id, title, body_json, visibility, hidden,
                sort_order, updated_at, updated_by`,
    vals
  );

  // M1: RETURNING uses explicit projection (no body_text, no body_version).
  // If zero rows were updated, distinguish between a true concurrent-write conflict
  // and the doc having been deleted between our SELECT and UPDATE.
  if (!updated[0]) {
    const { rows: recheck } = await pool.query(
      `SELECT id, client_id, parent_id, task_id, title, body_json, visibility, hidden,
              sort_order, updated_at, updated_by
         FROM documents WHERE id = $1`,
      [req.params.id]
    );
    if (recheck.length === 0) return res.status(404).json({ error: 'Not found' });
    const conflict = recheck[0];
    const safeConflict = isClientUser
      ? { ...conflict, body_json: redactNbiInternal(conflict.body_json) }
      : conflict;
    return res.status(409).json({ error: 'Conflict', current: safeConflict });
  }

  const doc = updated[0];

  // G1: attachment orphan reconciliation. Runs ONLY on a successful UPDATE
  // (after the I1 atomic-concurrency check has confirmed no concurrent write).
  // Wrapped in try/catch so reconciliation failure does not break the
  // already-committed doc edit; the worst case is stale orphan state which
  // the next legitimate PATCH will repair.
  if (req.body.body_json !== undefined) {
    try {
      const newFilenames = extractImageFilenames(req.body.body_json);
      const { rows: existingAtts } = await pool.query(
        `SELECT id, stored_name, orphaned_at FROM document_attachments WHERE document_id = $1`,
        [req.params.id]
      );
      const referencedIds   = existingAtts.filter(a => newFilenames.has(a.stored_name)).map(a => a.id);
      // Clock-reset semantics: the orphan_at clock starts fresh each time an
      // image becomes unreferenced. Re-adding a previously-orphaned image clears
      // it; subsequent removal restarts the 24h grace window. This is intentional.
      const unreferencedIds = existingAtts.filter(a => !newFilenames.has(a.stored_name) && a.orphaned_at === null).map(a => a.id);
      if (referencedIds.length) {
        await pool.query(
          `UPDATE document_attachments SET orphaned_at = NULL WHERE id = ANY($1::uuid[])`,
          [referencedIds]
        );
      }
      if (unreferencedIds.length) {
        await pool.query(
          `UPDATE document_attachments SET orphaned_at = now() WHERE id = ANY($1::uuid[])`,
          [unreferencedIds]
        );
      }
    } catch (err) {
      log('warn', 'Documents', 'Attachment reconciliation failed for ' + req.params.id, { err: err.message });
    }
  }

  // D1: emit fresh ETag from the new updated_at so client can track the new version
  res.set('ETag', `W/"${doc.updated_at.toISOString()}"`);
  res.json(doc);
});

/** DELETE /api/documents/:id
 *  Delete a page. Cascade to child pages is handled by FK ON DELETE CASCADE
 *  on parent_id. Returns 204 whether the doc existed or not (idempotent). */
app.delete('/api/documents/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  // Fetch to apply scope guards before deleting
  const { rows } = await pool.query(
    `SELECT id, client_id FROM documents WHERE id = $1`,
    [req.params.id]
  );
  // Idempotent: missing doc returns 204 (nothing to delete)
  if (rows.length === 0) return res.status(204).end();
  const doc = rows[0];

  const isClientUser = !!req.user.clientId;
  // M4: cross-client DELETE is a silent no-op (204) rather than 404.
  // Returning 404 would let a client enumerate doc existence by sending
  // DELETE requests against guessed UUIDs. The doc is not deleted.
  if (isClientUser && req.user.clientId !== doc.client_id) {
    return res.status(204).end();
  }
  if (isClientUser && req.user.docsEdit === false) {
    return res.status(403).json({ error: 'No doc-edit permission' });
  }

  // G1: collect attachment filenames for this doc AND all descendants before
  // the CASCADE wipes the document_attachments rows.
  const { rows: atts } = await pool.query(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM documents WHERE id = $1
       UNION ALL
       SELECT d.id FROM documents d
       INNER JOIN descendants ON d.parent_id = descendants.id
     )
     SELECT da.stored_name FROM document_attachments da
     INNER JOIN descendants ON da.document_id = descendants.id`,
    [req.params.id]
  );

  await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);

  // G1: unlink files post-DELETE. Best-effort -- log per-file failures but
  // do not fail the request because the DB row is already gone.
  await Promise.all(atts.map(async a => {
    try {
      await fs.promises.unlink(path.join(uploadDir, a.stored_name));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log('warn', 'Documents', `Failed to unlink ${a.stored_name} during doc delete: ${err.message}`);
      }
    }
  }));

  res.status(204).end();
});

/** POST /api/documents/:id/move
 *  Atomically reparent + reorder a document page (F1: drag-to-reparent).
 *  Body: { parent_id: uuid|null, position: int }
 *  Runs in a transaction: cycle detection, set parent_id, renumber siblings. */
app.post('/api/documents/:id/move', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  const { parent_id, position } = req.body || {};
  if (parent_id !== null && parent_id !== undefined && !isValidUuid(parent_id)) {
    return res.status(400).json({ error: 'Invalid parent_id' });
  }
  const pos = typeof position === 'number' ? Math.max(0, Math.floor(position)) : 0;
  const newParent = parent_id || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [doc] } = await client.query(
      'SELECT id, client_id, parent_id FROM documents WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!doc) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

    const isClientUser = !!req.user.clientId;
    if (isClientUser && req.user.clientId !== doc.client_id) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }
    if (isClientUser && req.user.docsEdit === false) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No doc-edit permission' });
    }

    // Cycle detection: self-parent or moving into own descendant
    if (newParent === doc.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Circular reference: cannot be own parent' });
    }
    if (newParent) {
      const { rows: descs } = await client.query(
        `WITH RECURSIVE descendants AS (
           SELECT id FROM documents WHERE parent_id = $1
           UNION ALL
           SELECT d.id FROM documents d INNER JOIN descendants ON d.parent_id = descendants.id
         )
         SELECT id FROM descendants WHERE id = $2`,
        [doc.id, newParent]
      );
      if (descs.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Circular reference: target is a descendant' });
      }
    }

    // Get current siblings at the target parent (excluding the moved doc)
    const sibQuery = newParent
      ? `SELECT id FROM documents WHERE client_id = $1 AND parent_id = $2 AND id != $3 ORDER BY sort_order, title`
      : `SELECT id FROM documents WHERE client_id = $1 AND parent_id IS NULL AND id != $2 ORDER BY sort_order, title`;
    const sibParams = newParent ? [doc.client_id, newParent, doc.id] : [doc.client_id, doc.id];
    const { rows: siblings } = await client.query(sibQuery, sibParams);

    // Insert the moved doc at the requested position
    const clamped = Math.min(pos, siblings.length);
    siblings.splice(clamped, 0, { id: doc.id });

    // Renumber all siblings
    for (let i = 0; i < siblings.length; i++) {
      await client.query(
        'UPDATE documents SET sort_order = $1, parent_id = CASE WHEN id = $2 THEN $3 ELSE parent_id END WHERE id = $4',
        [i, doc.id, newParent, siblings[i].id]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    log('error', 'Documents', `Move failed: ${err.message}`);
    res.status(500).json({ error: 'Move failed' });
  } finally {
    client.release();
  }
});

// ==================== DOCUMENT ATTACHMENTS ====================

const ALLOWED_DOC_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/** Multer instance for document image uploads.
 *  Images only, 5 MB cap, stored in the shared uploadDir. */
const docUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const suffix = Math.random().toString(36).slice(2, 8);
      cb(null, `doc_${req.params.id}_${Date.now()}_${suffix}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_DOC_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only jpg/png/gif/webp images are allowed'));
  }
});

/** Safely remove a multer-saved file, logging but not throwing on failure. */
function cleanupDocUpload(filePath) {
  try { fs.unlinkSync(filePath); } catch (e) { console.error('doc upload cleanup failed:', e.message); }
}

/** POST /api/documents/:id/attachments
 *  Upload an image into a document. Returns the new attachment row + url.
 *
 *  Scope guards (in order):
 *    401 -- not authenticated
 *    400 -- invalid doc UUID
 *    400 -- no file or unsupported mime type (multer fileFilter rejection)
 *    404 -- doc not found
 *    404 -- client user trying to upload to an nbi_only doc
 *    404 -- client user targeting another client's doc
 *    403 -- client user with docsUpload=false
 *
 *  On any rejection after multer has saved the file to disk, the file is
 *  deleted before responding so we do not accumulate orphaned uploads.
 *
 *  Note: mime type is validated from the client-supplied header only.
 *  Magic-byte sniffing is deferred to Task G1. */
app.post('/api/documents/:id/attachments', (req, res, next) => {
  // Wrap multer to surface fileFilter / size-limit errors as JSON 400/413
  // rather than letting them propagate to the default error handler (500).
  docUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large (max 5 MB)' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  // 401 -- must be authenticated
  if (!req.user) {
    if (req.file) cleanupDocUpload(req.file.path);
    return res.status(401).json({ error: 'Auth required' });
  }

  // 400 -- validate doc UUID
  if (!isValidUuid(req.params.id)) {
    if (req.file) cleanupDocUpload(req.file.path);
    return res.status(400).json({ error: 'Invalid id' });
  }

  // 400 -- multer may not have saved a file if fileFilter rejected it
  if (!req.file) {
    return res.status(400).json({ error: 'No file or unsupported type' });
  }

  // Fetch doc for scope checks
  let doc;
  try {
    const { rows } = await pool.query(
      'SELECT id, client_id, visibility FROM documents WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      cleanupDocUpload(req.file.path);
      return res.status(404).json({ error: 'Not found' });
    }
    doc = rows[0];
  } catch (err) {
    cleanupDocUpload(req.file.path);
    log('error', 'Documents', `SELECT failed during upload to ${req.params.id}: ${err.message}`);
    return res.status(500).json({ error: 'Database error' });
  }

  const isClientUser = !!req.user.clientId;
  if (isClientUser) {
    // nbi_only docs are invisible to client users
    if (doc.visibility === 'nbi_only') {
      cleanupDocUpload(req.file.path);
      return res.status(404).json({ error: 'Not found' });
    }
    // Cross-client access is a 404 (not 403) to avoid client enumeration
    if (req.user.clientId !== doc.client_id) {
      cleanupDocUpload(req.file.path);
      return res.status(404).json({ error: 'Not found' });
    }
    // Explicit denial of upload permission
    if (req.user.docsUpload === false) {
      cleanupDocUpload(req.file.path);
      return res.status(403).json({ error: 'No doc-upload permission' });
    }
  }

  // Persist the attachment row.
  // G1: orphaned_at is set at upload time so an unembedded attachment
  // (e.g. user uploads then closes tab without saving) eventually gets
  // swept by the 03:30 cron after the 24h grace window. PATCH body_json
  // clears this when the attachment URL is referenced.
  let ins;
  try {
    const result = await pool.query(
      `INSERT INTO document_attachments
         (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by, orphaned_at)
       VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING *`,
      [
        req.params.id,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        req.user.username || 'unknown'
      ]
    );
    ins = result.rows;
  } catch (err) {
    cleanupDocUpload(req.file.path);
    log('error', 'Documents', `INSERT failed for upload to ${req.params.id}: ${err.message}`);
    return res.status(500).json({ error: 'Database error' });
  }

  res.status(201).json({
    id:         ins[0].id,
    filename:   ins[0].filename,
    url:        `/api/documents/${req.params.id}/attachments/${req.file.filename}`,
    mime_type:  ins[0].mime_type,
    size_bytes: ins[0].size_bytes
  });
});

/** GET /api/documents/:id/attachments/:filename
 *  Serve a document image file.
 *
 *  Scope guards (in order):
 *    401 -- not authenticated
 *    400 -- invalid doc UUID
 *    400 -- path traversal detected (param resolves outside uploadDir)
 *    404 -- doc not found
 *    404 -- client user: cross-client or nbi_only doc
 *    403 -- client user: docsView=false
 *    H1  -- client user: image only in nbiInternalBlock -> 404
 *    404 -- file missing on disk */
app.get('/api/documents/:id/attachments/:filename', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  // Path traversal check: resolve the raw param (Express decodes %2F etc.) and
  // confirm it stays inside uploadDir. Do NOT use path.basename first -- that
  // strips the traversal and defeats the check.
  const fullPath = path.resolve(uploadDir, req.params.filename);
  if (!fullPath.startsWith(path.resolve(uploadDir) + path.sep)) {
    return res.status(400).json({ error: 'Bad path' });
  }

  // Fetch doc for scope checks (include body_json for H1 check)
  const { rows } = await pool.query(
    'SELECT client_id, visibility, body_json FROM documents WHERE id = $1',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const doc = rows[0];

  const isClientUser = !!req.user.clientId;
  if (isClientUser) {
    if (req.user.clientId !== doc.client_id) return res.status(404).json({ error: 'Not found' });
    if (doc.visibility === 'nbi_only')        return res.status(404).json({ error: 'Not found' });
    if (req.user.docsView === false)           return res.status(403).json({ error: 'No doc-view permission' });

    // H1: if the image is only referenced inside an nbiInternalBlock, deny it.
    // Use the stored filename (basename of the resolved path) for the scope check.
    const storedName = path.basename(fullPath);
    if (!imageInScope(doc.body_json, storedName, { dropNbiInternal: true })) {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File missing' });

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(fullPath);
});

/** POST /api/documents
 *  Create a new page. NBI users create freely; client users need docsCreate=true
 *  and must target their own client. Client users cannot set visibility='nbi_only'. */
app.post('/api/documents', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { client_id, parent_id, task_id, title, visibility } = req.body || {};
  if (!client_id || !isValidUuid(client_id)) {
    return res.status(400).json({ error: 'client_id required' });
  }
  if (parent_id && !isValidUuid(parent_id)) {
    return res.status(400).json({ error: 'Invalid parent_id' });
  }
  if (task_id && !isValidUuid(task_id)) {
    return res.status(400).json({ error: 'Invalid task_id' });
  }

  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== client_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (isClientUser && req.user.docsCreate === false) {
    return res.status(403).json({ error: 'No doc-create permission' });
  }
  if (isClientUser && visibility === 'nbi_only') {
    return res.status(403).json({ error: 'Client users cannot create NBI-only docs' });
  }

  const safeVis = visibility === 'nbi_only' ? 'nbi_only' : 'all';
  const author = req.user.username || req.user.displayName || 'unknown';
  const { rows } = await pool.query(
    `INSERT INTO documents (client_id, parent_id, task_id, title, visibility, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
    [client_id, parent_id || null, task_id || null, String(title || 'Untitled').slice(0, 255), safeVis, author]
  );
  res.status(201).json(rows[0]);
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
        ORDER BY t.created_at, t.title, t.id
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
      ORDER BY t.created_at, t.title, t.id
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

/** POST /api/tasks — Create a new task (all authenticated users). Client users are scoped to their own client. Enforces hierarchy: project > feature > story > task. */
app.post('/api/tasks', async (req, res) => {
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
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });

  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;

  // Client users cannot change client_id on tasks
  if (req.user?.clientId && req.body.client_id !== undefined) {
    delete req.body.client_id;
  }

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
  // Reject out-of-range years (e.g. 5-digit years typed into date inputs)
  const dateFields = ['start_date', 'end_date', 'due_date'];
  for (const df of dateFields) {
    const val = req.body[df];
    if (val !== undefined && val !== null && val !== '') {
      const yearMatch = String(val).match(/^(\d+)-/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (year < 1900 || year > 2099) {
          return res.status(400).json({ error: `Invalid year in ${df}: ${year}. Must be between 1900 and 2099.` });
        }
      }
    }
  }
  // Reject start_date > end_date (use both incoming values, or fall back to existing below)
  if (req.body.start_date && req.body.end_date && req.body.start_date > req.body.end_date) {
    return res.status(400).json({ error: 'start_date must be before or equal to end_date' });
  }
  // Text fields are stored raw; escaping happens at render time in the frontend (esc()).
  // Status is routed through reorderInGroup below — NOT in allowedFields.
  const allowedFields = ['title', 'parent_id', 'client_id', 'item_type', 'priority', 'health_state', 'description', 'assignees', 'hours_estimated', 'hours_spent', 'due_date', 'start_date', 'end_date', 'dependencies', 'collaborations', 'success_factor', 'repeat_rule', 'blocker_info', 'practice_area', 'sow_id', 'work_type', 'risks', 'mitigations', 'documentation_link'];
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

  // Connected Statuses: bidirectional cascade for Done/Cancelled/Blocked
  // Downward: parent status pushes to all descendants
  const CASCADE_STATUSES = ['Done', 'Cancelled', 'Blocked'];
  if (req.body.status && CASCADE_STATUSES.includes(req.body.status) && (!oldTask || oldTask.status !== req.body.status)) {
    const hasKids = (await pool.query('SELECT 1 FROM tasks WHERE parent_id = $1 LIMIT 1', [req.params.id])).rows.length > 0;
    if (hasKids) {
      try {
        const { rows: cascaded } = await pool.query(`
          WITH RECURSIVE descendants AS (
            SELECT id FROM tasks WHERE parent_id = $1
            UNION ALL
            SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_id = d.id
          )
          UPDATE tasks SET status = $2, updated_at = NOW()
          WHERE id IN (SELECT id FROM descendants) AND status != $2
          RETURNING id
        `, [req.params.id, req.body.status]);
        if (cascaded.length > 0) {
          await auditLog('task', req.params.id, 'cascade_status_down', req.user?.displayName, { status: req.body.status, count: cascaded.length });
        }
      } catch (e) {
        log('warn', 'Tasks', 'Downward status cascade failed', { error: e.message });
      }
    }
  }

  // Upward: when a task becomes Done/Cancelled, check if ALL siblings are terminal — if so, auto-complete parent
  if (req.body.status && ['Done', 'Cancelled'].includes(req.body.status) && updatedTask.parent_id) {
    try {
      let parentId = updatedTask.parent_id;
      while (parentId) {
        const { rows: siblings } = await pool.query(
          'SELECT id, status FROM tasks WHERE parent_id = $1', [parentId]
        );
        const allTerminal = siblings.length > 0 && siblings.every(s => s.status === 'Done' || s.status === 'Cancelled');
        if (!allTerminal) break;
        const allDone = siblings.every(s => s.status === 'Done');
        const newStatus = allDone ? 'Done' : 'Cancelled';
        const { rows: [parent] } = await pool.query(
          'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 AND status != $1 RETURNING id, parent_id',
          [newStatus, parentId]
        );
        if (!parent) break;
        await auditLog('task', parentId, 'cascade_status_up', req.user?.displayName, { status: newStatus });
        parentId = parent.parent_id;
      }
    } catch (e) {
      log('warn', 'Tasks', 'Upward status cascade failed', { error: e.message });
    }
  }

  // Prerequisites cascade: when task becomes Blocked/Cancelled, block its dependants
  if (req.body.status && ['Blocked', 'Cancelled'].includes(req.body.status) && (!oldTask || oldTask.status !== req.body.status)) {
    try {
      const { rows: dependants } = await pool.query(`
        UPDATE tasks SET status = 'Blocked', updated_at = NOW()
        WHERE $1 = ANY(dependencies) AND status NOT IN ('Done', 'Cancelled', 'Blocked')
        RETURNING id
      `, [req.params.id]);
      if (dependants.length > 0) {
        await auditLog('task', req.params.id, 'cascade_block_dependants', req.user?.displayName, { count: dependants.length });
      }
    } catch (e) {
      log('warn', 'Tasks', 'Prerequisite block cascade failed', { error: e.message });
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
app.delete('/api/tasks/:id', requireAdmin, async (req, res) => {
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
app.post('/api/tasks/bulk', requireAdmin, async (req, res) => {
  const { tasks: taskList } = req.body;
  if (!Array.isArray(taskList)) return res.status(400).json({ error: 'tasks array required' });
  if (taskList.length === 0) return res.status(400).json({ error: 'tasks array must not be empty' });
  if (taskList.length > 500) return res.status(400).json({ error: 'Too many tasks (max 500 per batch)' });
  for (let i = 0; i < taskList.length; i++) {
    const t = taskList[i];
    if (!t.title || typeof t.title !== 'string' || !t.title.trim()) return res.status(400).json({ error: `tasks[${i}].title: required` });
    if (t.title.length > 500) return res.status(400).json({ error: `tasks[${i}].title: too long (max 500)` });
    if (t.status && !VALID_STATUSES.has(t.status)) return res.status(400).json({ error: `tasks[${i}].status: invalid value "${t.status}"` });
    if (t.client_id && !isValidUuid(t.client_id)) return res.status(400).json({ error: `tasks[${i}].client_id: invalid UUID` });
    if (t.item_type && !ITEM_TYPES.includes(t.item_type)) return res.status(400).json({ error: `tasks[${i}].item_type: invalid value "${t.item_type}"` });
  }

  // Auto-repair orphan parent links for hierarchy imports. The Backlog Builder
  // template uses prefix-based _temp_ids (P1, F1, S1.1, T1.1.1, T2.4.3, etc.).
  // Two cases need rescuing:
  //   1. _temp_parent_id is BLANK on the row (source CSV omitted it).
  //   2. _temp_parent_id points at a sibling that is not in the batch — e.g.
  //      a story row with empty title gets dropped by the mapper, and its
  //      child tasks then reference a parent the linker can't find.
  // In both cases we derive the parent from the prefix convention:
  //   "S{X}.{Y}"     -> parent is "F{X}"
  //   "T{X}.{Y}.{Z}" -> parent is "S{X}.{Y}", falling back to "F{X}" if the
  //                     story is also missing.
  const tempIdSet = new Set(taskList.filter(t => t._temp_id).map(t => t._temp_id));
  for (const t of taskList) {
    const needsRepair = !t._temp_parent_id || !tempIdSet.has(t._temp_parent_id);
    if (!needsRepair) continue;
    const id = t._temp_id || '';
    let m;
    if ((m = id.match(/^S(\d+)\.\d+$/))) {
      const feat = `F${m[1]}`;
      if (tempIdSet.has(feat)) t._temp_parent_id = feat;
    } else if ((m = id.match(/^T(\d+)\.(\d+)\.\d+$/))) {
      const story = `S${m[1]}.${m[2]}`;
      const feat = `F${m[1]}`;
      if (tempIdSet.has(story)) t._temp_parent_id = story;
      else if (tempIdSet.has(feat)) t._temp_parent_id = feat;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve `client` (free-text name like "Lighthouse Games") -> client_id UUID.
    // We cache lookups by name so we hit the DB at most once per distinct name.
    const nameCache = {};
    for (let i = 0; i < taskList.length; i++) {
      const t = taskList[i];
      if (t.client_id) continue;
      const rawName = t.client && String(t.client).trim();
      if (!rawName) continue;
      if (!(rawName in nameCache)) {
        const { rows } = await client.query('SELECT id FROM clients WHERE LOWER(name) = LOWER($1) LIMIT 1', [rawName]);
        nameCache[rawName] = rows.length ? rows[0].id : null;
      }
      const resolved = nameCache[rawName];
      if (!resolved) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `tasks[${i}].client: unknown client name "${rawName}" (no matching row in clients table)` });
      }
      t.client_id = resolved;
    }

    const created = [];
    const idMap = {};
    const rowByTempId = {};
    for (const t of taskList) {
      const status = t.status || 'Not started';
      await shiftForInsert(client, 'tasks', 'status', status);
      const { rows } = await client.query(
        `INSERT INTO tasks (title, client_id, status, priority, health_state, description, assignees,
                             hours_estimated, hours_spent, due_date, planner_task_id, source, item_type,
                             start_date, end_date, success_factor, practice_area, collaborations, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,0) RETURNING *`,
        [t.title, t.client_id || null, status, t.priority || '', t.health_state || '',
         t.description || '', t.assignees || [], t.hours_estimated || 0, t.hours_spent || 0,
         t.due_date || '', t.planner_task_id || '', t.source || 'import', t.item_type || 'task',
         t.start_date || '', t.end_date || '', t.success_factor || '', t.practice_area || '',
         t.collaborations || '']
      );
      if (t._temp_id) { idMap[t._temp_id] = rows[0].id; rowByTempId[t._temp_id] = rows[0]; }
      created.push(rows[0]);
    }

    // Second pass: set parent_ids and inherit client_id from parents that have one.
    // Iterate in input order so a deeper child can pick up a client_id that was
    // resolved on its parent in this same loop.
    const clientByTempId = Object.fromEntries(taskList.filter(t => t._temp_id).map(t => [t._temp_id, t.client_id || null]));
    for (const t of taskList) {
      if (!t._temp_parent_id || !idMap[t._temp_parent_id]) continue;
      const realId = idMap[t._temp_id];
      const realParentId = idMap[t._temp_parent_id];
      const inherited = !t.client_id && clientByTempId[t._temp_parent_id] ? clientByTempId[t._temp_parent_id] : null;
      if (inherited) {
        await client.query('UPDATE tasks SET parent_id = $1, client_id = $2 WHERE id = $3', [realParentId, inherited, realId]);
        clientByTempId[t._temp_id] = inherited; // Propagate one level deeper next iteration
      } else {
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

        // Clamp out-of-range years on date fields (same rule as PATCH)
        for (const dk of ['dueDate', 'due_date', 'startDate', 'start_date', 'endDate', 'end_date']) {
          const dv = t[dk];
          if (dv) {
            const ym = String(dv).match(/^(\d+)-/);
            if (ym && (parseInt(ym[1], 10) < 1900 || parseInt(ym[1], 10) > 2099)) t[dk] = '';
          }
        }

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
             practice_area=$20, sow_id=$21, work_type=$22,
             updated_at=NOW()
             WHERE id=$23`,
            [t.title, parentId, clientId, itemType, t.status || 'Not started', t.priority || '',
             t.healthState || t.health_state || '', t.description || '', t.assignees || [],
             t.hoursEstimated || t.hours_estimated || 0, t.hoursSpent || t.hours_spent || 0,
             t.dueDate || t.due_date || '', t.startDate || t.start_date || '', t.endDate || t.end_date || '',
             t.dependencies || [],
             t.collaborations || null, t.successFactor || t.success_factor || null,
             t.repeatRule || t.repeat_rule || null, t.blockerInfo || t.blocker_info || null,
             t.practiceArea || t.practice_area || null,
             t.sowId || t.sow_id || null,
             t.workType || t.work_type || null,
             t.id]
          );
        } else {
          // Insert new task
          const { rows } = await conn.query(
            `INSERT INTO tasks (id, title, parent_id, client_id, item_type, status, priority, health_state,
             description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, dependencies, source, created_at,
             collaborations, success_factor, repeat_rule, blocker_info, practice_area, sow_id, work_type, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW()) RETURNING id`,
            [t.id, t.title, parentId, clientId, itemType, t.status || 'Not started', t.priority || '',
             t.healthState || t.health_state || '', t.description || '', t.assignees || [],
             t.hoursEstimated || t.hours_estimated || 0, t.hoursSpent || t.hours_spent || 0,
             t.dueDate || t.due_date || '', t.startDate || t.start_date || '', t.endDate || t.end_date || '',
             t.dependencies || [], t.source || 'sync',
             t.createdAt || t.created_at || new Date().toISOString(),
             t.collaborations || null, t.successFactor || t.success_factor || null,
             t.repeatRule || t.repeat_rule || null, t.blockerInfo || t.blocker_info || null,
             t.practiceArea || t.practice_area || null,
             t.sowId || t.sow_id || null,
             t.workType || t.work_type || null]
          );
          idMap[t.id] = rows[0].id;
          existingTaskMap.set(rows[0].id, new Date()); // Register in map for subsequent batch references
        }

        // Sync task notes: append-only to avoid wiping notes added by other users
        if (Array.isArray(t.notes) && t.notes.length > 0) {
          const taskDbId = idMap[t.id] || t.id;
          const existing = await conn.query('SELECT text, created_at FROM task_notes WHERE task_id = $1', [taskDbId]);
          const existingSet = new Set(existing.rows.map(r => r.text + '|' + new Date(r.created_at).toISOString()));
          for (const n of t.notes) {
            if (n.text || n.time) {
              const ts = n.time || n.created_at || new Date().toISOString();
              const key = (n.text || '') + '|' + new Date(ts).toISOString();
              if (!existingSet.has(key)) {
                await conn.query('INSERT INTO task_notes (task_id, text, created_at) VALUES ($1, $2, $3)',
                  [taskDbId, n.text || '', ts]);
              }
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
 * internal-with-team users see their team's clients + always_visible clients +
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
    allIds = await pool.query('SELECT id FROM tasks');
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
      `SELECT id FROM tasks WHERE client_id = ANY($1)${idNullClause}`,
      [scopes]
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

  // Client visibility scoping (bug 4af29301): filter tasks and clients by
  // the user's team memberships. Admins see everything; internal users with
  // teams see their team's clients + exceptions + null-client tasks;
  // internal users with no teams see only exceptions + null-client tasks;
  // G5 external users see only their own client.
  const scopes = await getClientScopes(req);
  const isExternal = !!req.user?.clientId;

  let tasks;
  if (scopes === null) {
    tasks = await pool.query(`
      SELECT t.*, c.name as client_name,
        (SELECT json_agg(json_build_object('text', n.text, 'time', n.created_at) ORDER BY n.created_at)
         FROM task_notes n WHERE n.task_id = t.id) as notes
      FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
      ORDER BY t.created_at, t.title, t.id
    `);
  } else {
    const nullClause = isExternal ? '' : ' OR t.client_id IS NULL';
    tasks = await pool.query(`
      SELECT t.*, c.name as client_name,
        (SELECT json_agg(json_build_object('text', n.text, 'time', n.created_at) ORDER BY n.created_at)
         FROM task_notes n WHERE n.task_id = t.id) as notes
      FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.client_id = ANY($1)${nullClause}
      ORDER BY t.created_at, t.title, t.id
    `, [scopes]);
  }

  let clients;
  if (scopes === null) {
    clients = await pool.query(`
      SELECT c.*,
        (SELECT json_agg(json_build_object('name', ct.name, 'role', ct.role, 'notes', ct.notes, 'background', ct.background, 'linkedin', ct.linkedin) ORDER BY ct.sort_order)
         FROM contacts ct WHERE ct.client_id = c.id) as contacts
      FROM clients c ORDER BY c.name
    `);
  } else {
    clients = await pool.query(`
      SELECT c.*,
        (SELECT json_agg(json_build_object('name', ct.name, 'role', ct.role, 'notes', ct.notes, 'background', ct.background, 'linkedin', ct.linkedin) ORDER BY ct.sort_order)
         FROM contacts ct WHERE ct.client_id = c.id) as contacts
      FROM clients c WHERE c.id = ANY($1) ORDER BY c.name
    `, [scopes]);
  }

  // Settings are returned to the browser, so external users (G5) must see
  // only UI-relevant keys. fx_rates, expense_approver, feature flags, and
  // anything else internal is stripped for external accounts.
  const EXTERNAL_SETTINGS_ALLOW = new Set([
    'currency', 'hourly_rate', 'hourlyRate', 'date_format', 'dateFormat',
    'timezone', 'client_priority', 'clientPriority',
  ]);
  const settings = await pool.query('SELECT key, value FROM settings');
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
    workType: r.work_type || null,
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
      abbreviation: r.abbreviation || null,
      contacts: r.contacts || [],
    };
  });

  res.json({
    tasks: frontendTasks,
    clientBriefs: frontendBriefs,
    settings: settingsObj,
    knownClients: clients.rows.map(r => r.name),
  });
});

// ==================== TASK NOTES ====================

/** POST /api/tasks/:taskId/notes — Add a quick note to a task (also bumps the task's updated_at) */
app.post('/api/tasks/:taskId/notes', requireAdmin, async (req, res) => {
  const { text, author } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  const { rows } = await pool.query(
    'INSERT INTO task_notes (task_id, text, author) VALUES ($1, $2, $3) RETURNING *',
    [req.params.taskId, text, author || (req.user && req.user.display_name) || 'Unknown']
  );
  // Update task's updated_at
  await pool.query('UPDATE tasks SET updated_at = NOW() WHERE id = $1', [req.params.taskId]);
  res.status(201).json(rows[0]);
});

// ==================== DASHBOARD AGGREGATES ====================
app.use(require('./routes/dashboard')({ pool, log, getClientScopes }));

/**
 * Compute a daily KPI snapshot from current task state.
 * Returns an object with all dashboard_snapshots columns (except id/created_at).
 */
async function computeDashboardSnapshot() {
  const today = new Date().toISOString().slice(0, 10);
  const { rows: [snap] } = await pool.query(`
    SELECT
      count(*) FILTER (WHERE parent_id IS NULL AND title IS NOT NULL AND trim(title) != 'New Task'
                        AND status NOT IN ('Done','Cancelled')) as active_projects,
      count(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('Done','Cancelled')) as overdue_count,
      count(*) FILTER (WHERE health_state = 'Blocked' AND status NOT IN ('Done','Cancelled')) as blocked_count,
      count(*) FILTER (WHERE health_state = 'Red' AND status NOT IN ('Done','Cancelled')) as at_risk_count,
      COALESCE(sum(hours_spent) FILTER (WHERE true), 0) as hours_spent,
      COALESCE(sum(hours_estimated) FILTER (WHERE true), 0) as hours_estimated,
      count(*) FILTER (WHERE status NOT IN ('Done','Cancelled')) as tasks_planned,
      count(*) FILTER (WHERE created_at::date = $1::date) as tasks_added,
      count(*) FILTER (WHERE status = 'Done') as tasks_completed,
      count(DISTINCT title) FILTER (WHERE (due_date < CURRENT_DATE OR health_state = 'Red')
                                     AND status NOT IN ('Done','Cancelled')
                                     AND parent_id IS NULL AND title IS NOT NULL AND trim(title) != 'New Task') as problem_projects
    FROM tasks
  `, [today]);

  const activeProjects = parseInt(snap.active_projects) || 0;
  const problemProjects = parseInt(snap.problem_projects) || 0;

  let activeLeadsCount = 0;
  try {
    const { rows: [lc] } = await pool.query(
      `SELECT count(*) as cnt FROM leads l
       JOIN lead_pipeline_stages s ON l.stage_id = s.id
       WHERE s.is_closed = false`
    );
    activeLeadsCount = parseInt(lc.cnt) || 0;
  } catch (e) { /* leads table may not exist in test env */ }

  return {
    snapshot_date: today,
    active_projects: activeProjects,
    overdue_count: parseInt(snap.overdue_count) || 0,
    blocked_count: parseInt(snap.blocked_count) || 0,
    at_risk_count: parseInt(snap.at_risk_count) || 0,
    hours_spent: parseFloat(snap.hours_spent).toFixed(1),
    hours_estimated: parseFloat(snap.hours_estimated).toFixed(1),
    tasks_planned: parseInt(snap.tasks_planned) || 0,
    tasks_added: parseInt(snap.tasks_added) || 0,
    tasks_completed: parseInt(snap.tasks_completed) || 0,
    on_track_count: Math.max(0, activeProjects - problemProjects),
    active_leads_count: activeLeadsCount,
  };
}

// ==================== LEADS TRACKER ====================
app.use(require('./routes/leads')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, buildPatchQuery, getCached, invalidateCache, getClientScopes, sendEmailAsync, APP_URL, shiftForInsert, reorderInGroup }));

// ==================== EXPENSE REPORTS + RECEIPT OCR + EXPENSE REPORT SUBMISSIONS ====================
app.use(require('./routes/expenses')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, buildPatchQuery, invalidateCache, upload, uploadDir, ocrRequests, ocrBreaker, pdfParse, sharp, Tesseract, archiver, getExpenseApprover, sendEmailAsync, EMAIL_FROM, APP_URL, createNotification }));

// ==================== BUG / FEATURE REPORTS ====================
app.use(require('./routes/bugs')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, createNotification, upload, shiftForInsert, reorderInGroup }));

// ==================== HIRING ====================
app.use(require('./routes/hiring')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, upload, uploadDir, shiftForInsert, reorderInGroup, buildPatchQuery }));

// ==================== CLIENT STATUS REPORTS ====================
app.use(require('./routes/reports')({ pool, log, requireAdmin, requireNBI, isValidUuid, auditLog, escHtml }));

// ==================== RESOURCE PLANNING ====================
app.use(require('./routes/resource-planning')({ pool, requireAdmin, requireNBI, addBusinessDays }));

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
      let sent = 0;
      for (const user of users) {
        try {
          await createNotification(
            user.username,
            'expense_reminder',
            'Expense Report Reminder',
            `Hi ${user.display_name}, please submit your expense report for this month. Go to Expenses to create or update your report.`,
            '/nbi_project_dashboard.html#expenses',
            false
          );
          sent++;
        } catch (e) {
          log('warn', 'Cron', `Expense reminder failed for ${user.username}`, { error: e.message });
        }
      }
      log('info', 'Cron', `Expense reminders sent to ${sent}/${users.length} users`);
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

  // Group by user (a lead can lead multiple teams)
  const byUser = {};
  for (const row of leads) {
    if (!row.email) continue;
    if (!byUser[row.user_id]) {
      byUser[row.user_id] = { username: row.username, name: row.display_name, email: row.email, clientIds: new Set() };
    }
    if (row.client_id) byUser[row.user_id].clientIds.add(row.client_id);
  }

  // Admins always get a portfolio-wide report (all clients), even when team
  // leads exist. Team leads still get their client-scoped reports alongside.
  const { rows: admins } = await pool.query(`
    SELECT id AS user_id, username, display_name, email
    FROM users WHERE role = 'admin' AND is_active = true AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  `);
  const { rows: allClients } = await pool.query(`SELECT id FROM clients`);
  const allClientIds = allClients.map(c => c.id);
  for (const admin of admins) {
    if (!byUser[admin.user_id]) {
      byUser[admin.user_id] = { username: admin.username, name: admin.display_name, email: admin.email, clientIds: new Set(allClientIds) };
    } else {
      for (const cid of allClientIds) byUser[admin.user_id].clientIds.add(cid);
    }
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

    // 5. Not started (past start date)
    const { rows: notStarted } = await pool.query(`
      SELECT id, title, start_date, assignees, priority
      FROM tasks WHERE start_date != '' AND start_date < $1
        AND status = 'Not started' AND client_id = ANY($2)
      ORDER BY start_date ASC
    `, [today, clientIds]);

    // 6. Lead activity updates
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
    if (changes.length === 0 && overdue.length === 0 && dueSoon.length === 0 && blocked.length === 0 && notStarted.length === 0 && leadUpdates.length === 0) continue;

    // Build summary bar
    const summaryParts = [];
    if (changes.length > 0) summaryParts.push(`${changes.length} change${changes.length === 1 ? '' : 's'}`);
    if (dueSoon.length > 0) summaryParts.push(`${dueSoon.length} due this week`);
    if (overdue.length > 0) summaryParts.push(`${overdue.length} overdue`);
    if (blocked.length > 0) summaryParts.push(`${blocked.length} blocked`);
    if (notStarted.length > 0) summaryParts.push(`${notStarted.length} not started`);
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

    // Not Started (past start date)
    if (notStarted.length > 0) {
      const cols = [
        { label: 'Task', key: 'title' },
        { label: 'Start Date', key: 'start_date' },
        { label: 'Priority', key: 'priority' },
        { label: 'Assignee', key: '_assigneeStr' },
      ];
      const rows = notStarted.map(tk => ({ ...tk, priority: tk.priority || '-', _assigneeStr: (tk.assignees || []).join(', ') || 'Unassigned' }));
      sectionsHtml += buildEmailSection('Not Started (past start date)', '#f59e0b', buildEmailTable(cols, rows));
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

  if (match.taskId && fromAddr) {
    const { rows: senderRows } = await pool.query(
      'SELECT client_id FROM users WHERE email = $1 AND is_active = true',
      [fromAddr.toLowerCase()]
    );
    if (senderRows.length > 0 && senderRows[0].client_id) {
      let currentId = match.taskId;
      let depth = 0;
      let rootClientId = null;
      while (currentId && depth < 10) {
        const { rows: t } = await pool.query('SELECT parent_id, client_id FROM tasks WHERE id = $1', [currentId]);
        if (t.length === 0) break;
        if (!t[0].parent_id) { rootClientId = t[0].client_id; break; }
        currentId = t[0].parent_id;
        depth++;
      }
      if (rootClientId && rootClientId !== senderRows[0].client_id) {
        log('warn', 'InboundEmail', 'Client user email rejected — task belongs to different client', {
          sender: fromAddr, taskId: match.taskId, senderClient: senderRows[0].client_id, taskClient: rootClientId
        });
        return { matched: false, reason: 'client_scope_mismatch' };
      }
    }
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

// Inbound Email Polling — DISABLED per Glen 2026-05-08: created 64k spam notifications
// from bounce-back emails. Functions retained in code but cron disabled.
// if (cron) {
//   cron.schedule('*/10 * * * *', async () => {
//     try {
//       await processInboundEmails();
//     } catch (e) {
//       log('error', 'Cron', 'Inbound email poll failed', { error: e.message });
//     }
//   }, CRON_TZ);
//   log('info', 'Cron', 'Inbound email polling scheduled every 10 minutes');
// }

// Daily dashboard snapshot at 00:05 UTC
if (cron) {
  cron.schedule('5 0 * * *', async () => {
    try {
      const snap = await computeDashboardSnapshot();
      await pool.query(
        `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed, on_track_count, active_leads_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (snapshot_date) DO NOTHING`,
        [snap.snapshot_date, snap.active_projects, snap.overdue_count, snap.blocked_count, snap.at_risk_count, snap.hours_spent, snap.hours_estimated, snap.tasks_planned, snap.tasks_added, snap.tasks_completed, snap.on_track_count, snap.active_leads_count]
      );
      log('info', 'Cron', 'Dashboard snapshot recorded', { date: snap.snapshot_date });
    } catch (e) {
      log('error', 'Cron', 'Dashboard snapshot failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Dashboard snapshot scheduled for 00:05 daily (Europe/London)');
}

// G1: Orphaned attachment sweep
async function runAttachmentSweep() {
  try {
    const { rows: candidates } = await pool.query(
      `SELECT id, stored_name, orphaned_at
         FROM document_attachments
         WHERE orphaned_at IS NOT NULL`
    );
    const toDelete = pickFilesToDelete(new Date(), candidates);
    if (toDelete.length === 0) {
      log('info', 'Cron', 'Attachment sweep: nothing to remove');
      return { deleted: 0 };
    }
    // Unlink files first; if the unlink fails (other than ENOENT) we still
    // delete the DB row because the row is the source of truth and a
    // missing file just means a manual cleanup happened earlier.
    await Promise.all(toDelete.map(async f => {
      try {
        await fs.promises.unlink(path.join(uploadDir, f.stored_name));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          log('warn', 'Cron', `Sweep unlink failed for ${f.stored_name}: ${err.message}`);
        }
      }
    }));
    const ids = toDelete.map(f => f.id);
    const result = await pool.query(
      `DELETE FROM document_attachments
         WHERE id = ANY($1::uuid[])
           AND orphaned_at IS NOT NULL
           AND orphaned_at < now() - interval '24 hours'`,
      [ids]
    );
    if (result.rowCount !== toDelete.length) {
      log('warn', 'Cron',
        `Sweep race detected: ${toDelete.length} candidates, ${result.rowCount} deleted (rest cleared by concurrent PATCH)`);
    }
    log('info', 'Cron', `Attachment sweep deleted ${result.rowCount} orphans`);
    return { deleted: result.rowCount };
  } catch (err) {
    log('error', 'Cron', `Attachment sweep failed: ${err.message}`);
    return { deleted: 0, error: err.message };
  }
}
if (cron) {
  cron.schedule('30 3 * * *', runAttachmentSweep, CRON_TZ);
  log('info', 'Cron', 'Attachment sweep scheduled for 03:30 daily (Europe/London)');
}

// Bootstrap today's snapshot on startup if it doesn't exist yet
(async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query('SELECT 1 FROM dashboard_snapshots WHERE snapshot_date = $1', [today]);
    if (rows.length === 0) {
      const snap = await computeDashboardSnapshot();
      await pool.query(
        `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed, on_track_count, active_leads_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (snapshot_date) DO NOTHING`,
        [snap.snapshot_date, snap.active_projects, snap.overdue_count, snap.blocked_count, snap.at_risk_count, snap.hours_spent, snap.hours_estimated, snap.tasks_planned, snap.tasks_added, snap.tasks_completed, snap.on_track_count, snap.active_leads_count]
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

// ==================== DATA CLEANSE (ADMIN) ====================

const CLEANSE_CATEGORIES = [
  { id: 'tasks', label: 'Projects & Tasks', tier: 'standard', tables: ['tasks'], cascades: [], nullifies: [], childQueries: { task_notes: 'SELECT count(*) FROM task_notes', task_comments: 'SELECT count(*) FROM task_comments', task_attachments: 'SELECT count(*) FROM task_attachments', time_entries: 'SELECT count(*) FROM time_entries' } },
  { id: 'leads', label: 'Leads & Pipeline', tier: 'standard', tables: ['leads'], cascades: [], nullifies: [], childQueries: { lead_resources: 'SELECT count(*) FROM lead_resources', lead_activities: 'SELECT count(*) FROM lead_activities' } },
  { id: 'contacts', label: 'Contacts', tier: 'standard', tables: ['contacts'], cascades: [], nullifies: ['leads.primary_contact_id'], childQueries: {} },
  { id: 'client_notes', label: 'Client Notes', tier: 'standard', tables: ['client_notes'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'sows', label: 'SoWs', tier: 'standard', tables: ['sows'], cascades: [], nullifies: ['tasks.sow_id', 'hiring_positions.sow_id', 'teams.sow_id'], childQueries: {} },
  { id: 'expenses', label: 'Expenses', tier: 'standard', tables: ['expenses', 'expense_reports', 'expense_receipts'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'bugs', label: 'Bug Reports', tier: 'standard', tables: ['bug_reports'], cascades: [], nullifies: [], childQueries: { bug_report_comments: 'SELECT count(*) FROM bug_report_comments' } },
  { id: 'hiring', label: 'Hiring', tier: 'standard', tables: ['hiring_positions', 'candidates'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'calendar', label: 'Calendar Events', tier: 'standard', tables: ['calendar_events'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'finance', label: 'Finance Data', tier: 'standard', tables: ['finance_data'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'notifications', label: 'Notifications', tier: 'standard', tables: ['notifications'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'audit_log', label: 'Audit Log', tier: 'standard', tables: ['audit_log'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'clients', label: 'Clients', tier: 'nuclear', tables: ['clients'], cascades: ['contacts', 'leads', 'client_notes', 'sows'], nullifies: ['tasks.client_id', 'users.client_id', 'hiring_positions.client_id', 'candidates.client_id', 'calendar_events.client_id', 'bug_reports.reporter_client_id'], childQueries: { contacts: 'SELECT count(*) FROM contacts', leads: 'SELECT count(*) FROM leads', lead_resources: 'SELECT count(*) FROM lead_resources', lead_activities: 'SELECT count(*) FROM lead_activities', client_notes: 'SELECT count(*) FROM client_notes', sows: 'SELECT count(*) FROM sows', client_activity_log: 'SELECT count(*) FROM client_activity_log' } },
];

app.get('/api/admin/cleanse/preview', requireNBI, requireAdmin, async (req, res) => {
  try {
    const categories = [];
    for (const cat of CLEANSE_CATEGORIES) {
      const countResult = await pool.query(`SELECT count(*)::int AS n FROM ${cat.tables[0]}`);
      const count = countResult.rows[0].n;
      const children = {};
      for (const [key, sql] of Object.entries(cat.childQueries)) {
        const r = await pool.query(sql);
        children[key] = r.rows[0].count ? parseInt(r.rows[0].count, 10) : 0;
      }
      categories.push({
        id: cat.id,
        label: cat.label,
        tier: cat.tier,
        count,
        cascades: cat.cascades,
        nullifies: cat.nullifies,
        children,
      });
    }
    res.json({ categories });
  } catch (e) {
    log('error', 'Cleanse', 'Preview failed', { error: e.message });
    res.status(500).json({ error: 'Failed to generate cleanse preview' });
  }
});

const VALID_CATEGORY_IDS = new Set(CLEANSE_CATEGORIES.map(c => c.id));
const CLEANSE_LOCAL_STORAGE_MAP = {
  tasks: ['nbi_dashboard_tasks', 'nbi_dashboard_briefs'],
  finance: ['nbi_finance_data'],
  clients: ['nbi_dashboard_tasks', 'nbi_dashboard_briefs', 'nbi_dashboard_settings'],
  leads: [],
  contacts: [],
  client_notes: [],
  sows: [],
  expenses: [],
  bugs: [],
  hiring: [],
  calendar: [],
  notifications: [],
  audit_log: [],
};

app.post('/api/admin/cleanse', requireNBI, requireAdmin, async (req, res) => {
  const { categories, confirmation } = req.body;

  if (confirmation !== 'DELETE ALL SELECTED DATA') {
    return res.status(400).json({ error: 'Invalid confirmation string. Must be exactly: DELETE ALL SELECTED DATA' });
  }
  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'At least one category must be selected' });
  }
  const invalid = categories.filter(c => !VALID_CATEGORY_IDS.has(c));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Invalid category IDs: ${invalid.join(', ')}` });
  }

  const selected = new Set(categories);
  if (selected.has('clients')) {
    for (const dep of ['contacts', 'leads', 'client_notes', 'sows']) {
      selected.add(dep);
    }
  }

  let filesToDelete = [];
  try {
    if (selected.has('tasks')) {
      const { rows } = await pool.query('SELECT filename FROM task_attachments');
      filesToDelete.push(...rows.map(r => r.filename));
    }
    if (selected.has('expenses')) {
      const { rows } = await pool.query('SELECT filename FROM expense_receipts');
      filesToDelete.push(...rows.map(r => r.filename));
    }
  } catch (e) {
    log('warn', 'Cleanse', 'Failed to pre-query filenames', { error: e.message });
  }

  const conn = await pool.connect();
  const deleted = {};
  const nullified = {};

  try {
    await conn.query('BEGIN');

    if (selected.has('clients')) {
      const r = await conn.query('DELETE FROM client_activity_log');
      deleted.client_activity_log = r.rowCount;
    }

    if (selected.has('clients')) {
      const r = await conn.query('UPDATE bug_reports SET reporter_client_id = NULL WHERE reporter_client_id IS NOT NULL');
      nullified['bug_reports.reporter_client_id'] = r.rowCount;
    }

    if (selected.has('tasks') || selected.has('bugs') || selected.has('clients')) {
      const types = [];
      if (selected.has('tasks')) types.push('task', 'project');
      if (selected.has('bugs')) types.push('bug_report');
      if (selected.has('clients')) types.push('client');
      if (types.length > 0) {
        const r = await conn.query('DELETE FROM attachments WHERE entity_type = ANY($1)', [types]);
        if (r.rowCount > 0) deleted.attachments = (deleted.attachments || 0) + r.rowCount;
      }
    }

    if (selected.has('contacts') && !selected.has('leads')) {
      const r = await conn.query('UPDATE leads SET primary_contact_id = NULL WHERE primary_contact_id IS NOT NULL');
      nullified['leads.primary_contact_id'] = r.rowCount;
    }

    if (selected.has('leads')) {
      const r1 = await conn.query('DELETE FROM lead_resources');
      deleted.lead_resources = r1.rowCount;
      const r2 = await conn.query('DELETE FROM lead_activities');
      deleted.lead_activities = r2.rowCount;
    }

    if (selected.has('leads')) {
      const r = await conn.query('DELETE FROM leads');
      deleted.leads = r.rowCount;
    }

    if (selected.has('contacts')) {
      const r = await conn.query('DELETE FROM contacts');
      deleted.contacts = r.rowCount;
    }

    if (selected.has('client_notes')) {
      const r = await conn.query('DELETE FROM client_notes');
      deleted.client_notes = r.rowCount;
    }

    if (selected.has('sows')) {
      const r1 = await conn.query('UPDATE tasks SET sow_id = NULL WHERE sow_id IS NOT NULL');
      nullified['tasks.sow_id'] = r1.rowCount;
      const r2 = await conn.query('UPDATE hiring_positions SET sow_id = NULL WHERE sow_id IS NOT NULL');
      nullified['hiring_positions.sow_id'] = r2.rowCount;
      const r3 = await conn.query('UPDATE teams SET sow_id = NULL WHERE sow_id IS NOT NULL');
      nullified['teams.sow_id'] = r3.rowCount;
    }

    if (selected.has('sows')) {
      const r = await conn.query('DELETE FROM sows');
      deleted.sows = r.rowCount;
    }

    if (selected.has('tasks')) {
      const rNotes = await conn.query('DELETE FROM task_notes');
      deleted.task_notes = rNotes.rowCount;
      const rComments = await conn.query('DELETE FROM task_comments');
      deleted.task_comments = rComments.rowCount;
      const rAttach = await conn.query('DELETE FROM task_attachments');
      deleted.task_attachments = rAttach.rowCount;
      const rTime = await conn.query('DELETE FROM time_entries');
      deleted.time_entries = rTime.rowCount;
      const rSnap = await conn.query('DELETE FROM dashboard_snapshots');
      deleted.dashboard_snapshots = rSnap.rowCount;
      const r = await conn.query('DELETE FROM tasks');
      deleted.tasks = r.rowCount;
    }

    if (selected.has('clients')) {
      const r1 = await conn.query('UPDATE tasks SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['tasks.client_id'] = r1.rowCount;
      const r2 = await conn.query('UPDATE users SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['users.client_id'] = r2.rowCount;
      const r3 = await conn.query('UPDATE hiring_positions SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['hiring_positions.client_id'] = r3.rowCount;
      const r4 = await conn.query('UPDATE candidates SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['candidates.client_id'] = r4.rowCount;
      const r5 = await conn.query('UPDATE calendar_events SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['calendar_events.client_id'] = r5.rowCount;
      const r6 = await conn.query('DELETE FROM client_reports');
      deleted.client_reports = r6.rowCount;
      const r7 = await conn.query('UPDATE teams SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['teams.client_id'] = r7.rowCount;
      const r = await conn.query('DELETE FROM clients');
      deleted.clients = r.rowCount;
    }

    if (selected.has('expenses')) {
      const r1 = await conn.query('DELETE FROM expense_receipts');
      deleted.expense_receipts = r1.rowCount;
      const r2 = await conn.query('DELETE FROM expenses');
      deleted.expenses = r2.rowCount;
      const r3 = await conn.query('DELETE FROM expense_reports');
      deleted.expense_reports = r3.rowCount;
    }

    if (selected.has('bugs')) {
      const r1 = await conn.query('DELETE FROM bug_report_comments');
      deleted.bug_report_comments = r1.rowCount;
      const r2 = await conn.query('DELETE FROM bug_reports');
      deleted.bug_reports = r2.rowCount;
    }

    if (selected.has('hiring')) {
      const r1 = await conn.query('DELETE FROM candidates');
      deleted.candidates = r1.rowCount;
      const r2 = await conn.query('DELETE FROM hiring_positions');
      deleted.hiring_positions = r2.rowCount;
    }

    if (selected.has('calendar')) {
      const r = await conn.query('DELETE FROM calendar_events');
      deleted.calendar_events = r.rowCount;
    }

    if (selected.has('finance')) {
      const r = await conn.query('DELETE FROM finance_data');
      deleted.finance_data = r.rowCount;
    }

    if (selected.has('notifications')) {
      const r = await conn.query('DELETE FROM notifications');
      deleted.notifications = r.rowCount;
    }

    if (selected.has('audit_log')) {
      const r = await conn.query('DELETE FROM audit_log');
      deleted.audit_log = r.rowCount;
    }

    await conn.query('COMMIT');
  } catch (e) {
    await conn.query('ROLLBACK');
    log('error', 'Cleanse', 'Transaction failed — rolled back', { error: e.message, stack: e.stack?.split('\n').slice(0, 3).join(' | ') });
    return res.status(500).json({ error: 'Cleanse failed — all changes rolled back. ' + e.message });
  } finally {
    conn.release();
  }

  for (const filename of filesToDelete) {
    try {
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      log('warn', 'Cleanse', 'Failed to delete file', { filename, error: e.message });
    }
  }

  if (!selected.has('audit_log')) {
    await auditLog('system', null, 'cleanse', req.user?.displayName || req.user?.username, { categories: [...selected], deleted });
  } else {
    log('info', 'Cleanse', 'Data cleanse completed (audit_log was included in deletion)', { categories: [...selected], deleted });
  }

  const localStorageKeys = [...new Set(
    [...selected].flatMap(cat => CLEANSE_LOCAL_STORAGE_MAP[cat] || [])
  )];

  res.json({ deleted, nullified, localStorageKeys });
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
    if (cron) { try { cron.getTasks().forEach(t => t.stop()); } catch(e) {} }
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
module.exports.requireNBI = requireNBI;
module.exports.requireAdmin = requireAdmin;
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
module.exports.detectImportFormat = detectImportFormat;
module.exports.mapRowsToTasks = mapRowsToTasks;
module.exports.runAttachmentSweep = runAttachmentSweep;
