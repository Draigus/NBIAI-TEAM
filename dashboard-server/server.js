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

const { detectImportFormat, mapRowsToTasks } = require('./lib/import-parser');

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
const { pickFilesToDelete } = require('./lib/attachment-sweep');
app.use(require('./routes/documents')({ pool, log, isValidUuid, auditLog, upload, fs, path, getClientScope }));


// ==================== TASKS ====================
app.use(require('./routes/tasks')({ pool, log, isValidUuid, validateLength, auditLog, buildPatchQuery, createNotification, getClientScopes, reorderInGroup, shiftForInsert, requireAdmin, requireTaskAccess, computeNextRepeatDate, ITEM_TYPES, VALID_CHILD_TYPE }));

// ==================== DATA SYNC ====================
app.use(require('./routes/sync')({ pool, log, auditLog, createNotification, getClientScopes, computeNextRepeatDate, ITEM_TYPES }));

// ==================== ADMIN (modular) ====================
app.use(require('./routes/admin')({ pool, log, fs, path, requireNBI, requireAdmin, isValidUuid, auditLog, upload, pdfParse, uploadDir }));

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
