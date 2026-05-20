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
const multer = require('multer');
const fs = require('fs');

const { rateLimit } = require('express-rate-limit');
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
  // Skip CSP for standalone static pages (e.g. travel guide with external map tiles)
  if (!req.path.startsWith('/public/athens-guide')) {
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
  }
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
  validate: false,
  message: { error: 'Too many requests. Please slow down.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.ip || '127.0.0.1',
  standardHeaders: true, legacyHeaders: false, validate: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});
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
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '..', 'nbi_project_dashboard.html'));
});
/** GET /nbi_project_dashboard.html -- Alias for the dashboard entry point */
app.get('/nbi_project_dashboard.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

// ==================== AUDIT ====================
const { auditLog, computeNextRepeatDate } = require('./lib/audit')(pool);
const { createNotification } = require('./lib/notifications')(pool);

// ==================== MODULAR ROUTES ====================
app.use(require('./routes/users')({ pool, log, requireAdmin, requireNBI, requireClientAdmin, isValidUuid, auditLog, invalidateUserTokens, getClientScope, sendEmailAsync, EMAIL_FROM, APP_URL, _msalClient, cacheToken, validateLength, buildPatchQuery }));
app.use(require('./routes/settings')({ pool, requireAdmin }));
app.use(require('./routes/finance')({ pool, requireNBI, requireAdmin, auditLog, syncConflicts, log }));
app.use(require('./routes/time-entries')({ pool, isValidUuid, requireTaskAccess }));
app.use(require('./routes/time-off')({ pool, requireAdmin, isValidUuid }));
app.use(require('./routes/queue')({ pool, requireAdmin, log, isValidUuid, validateLength }));
app.use(require('./routes/contacts')({ pool, requireAuth, requireAdmin, isValidUuid, buildPatchQuery }));
app.use(require('./routes/client-notes')({ pool, requireAdmin, getClientScopes, buildPatchQuery }));
app.use(require('./routes/notifications')({ pool, requireAdmin, requireNBI, createNotification, log }));
app.use(require('./routes/templates')({ pool, requireAdmin, isValidUuid, log }));
app.use(require('./routes/slack')({ pool, log, verifySlackSignature, handleAppMention }));

const { detectImportFormat, mapRowsToTasks } = require('./lib/import-parser');

// ==================== UNIVERSAL ATTACHMENTS ====================
// Generic file attachments for any entity type (client, project, task)

app.use(require('./routes/attachments')({ pool, requireAdmin, requireNBI, upload, log, isValidUuid, auditLog }));

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


// ==================== DOCUMENTS ====================
const { pickFilesToDelete } = require('./lib/attachment-sweep');
app.use(require('./routes/documents')({ pool, log, isValidUuid, auditLog, upload, fs, path, getClientScope }));


// ==================== TASKS ====================
app.use(require('./routes/tasks')({ pool, log, isValidUuid, validateLength, auditLog, buildPatchQuery, createNotification, getClientScopes, reorderInGroup, shiftForInsert, requireAdmin, requireTaskAccess, computeNextRepeatDate, ITEM_TYPES, VALID_CHILD_TYPE, upload, fs, path, uploadDir }));

// ==================== DATA SYNC ====================
app.use(require('./routes/sync')({ pool, log, auditLog, createNotification, getClientScopes, computeNextRepeatDate, ITEM_TYPES }));

// ==================== ADMIN (modular) ====================
app.use(require('./routes/admin')({ pool, log, fs, path, requireNBI, requireAdmin, isValidUuid, auditLog, upload, pdfParse, uploadDir }));

// ==================== DASHBOARD AGGREGATES ====================
app.use(require('./routes/dashboard')({ pool, log, getClientScopes }));

// ==================== COMMAND CENTRE ====================
app.use(require('./routes/command-centre')({ pool, log, requireNBI, _msalClient }));


// ==================== LEADS TRACKER ====================
app.use(require('./routes/leads')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, buildPatchQuery, getCached, invalidateCache, getClientScopes, sendEmailAsync, APP_URL, shiftForInsert, reorderInGroup }));

// ==================== EXPENSE REPORTS + RECEIPT OCR + EXPENSE REPORT SUBMISSIONS ====================
app.use(require('./routes/expenses')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, buildPatchQuery, invalidateCache, upload, uploadDir, ocrRequests, ocrBreaker, pdfParse, sharp, Tesseract, archiver, getExpenseApprover, sendEmailAsync, EMAIL_FROM, APP_URL, createNotification }));

// ==================== BUG / FEATURE REPORTS ====================
app.use(require('./routes/bugs')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, createNotification, upload, shiftForInsert, reorderInGroup }));

// ==================== HIRING ====================
app.use(require('./routes/hiring')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, upload, uploadDir, shiftForInsert, reorderInGroup, buildPatchQuery, createNotification, sendEmailAsync, EMAIL_FROM }));
app.use(require('./routes/candidate-history')({ pool, log, isValidUuid }));
app.use(require('./routes/candidate-comments')({ pool, log, isValidUuid, validateLength }));
app.use(require('./routes/interview-rounds')({ pool, log, requireAdmin, requireNBI, isValidUuid, auditLog, buildPatchQuery }));

// ==================== CLIENT STATUS REPORTS ====================
app.use(require('./routes/reports')({ pool, log, requireAdmin, requireNBI, isValidUuid, auditLog, escHtml }));

// ==================== RESOURCE PLANNING ====================
app.use(require('./routes/resource-planning')({ pool, requireAdmin, requireNBI, addBusinessDays }));



// ==================== CRON JOBS ====================
const cronExports = require('./cron')({
  cron, pool, log, fs, path, runBackup, validateBackup, createNotification,
  invalidateCache, fxBreaker, withRetry, sendEmailAsync, EMAIL_FROM, APP_URL,
  buildEmailHtml, buildEmailTable, buildEmailSection, addBusinessDays,
  businessDaysBetween, pickFilesToDelete, uploadDir
});
const { computeDashboardSnapshot, buildPmReportEmails, buildDueWarningEmails,
        matchSubjectToTask, processOneInboundEmail, processInboundEmails,
        extractLinksFromHtml, runAttachmentSweep } = cronExports;

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

  // WebSocket: Claude chat (F13)
  const attachChat = require('./routes/chat');
  attachChat(server, { pool, log });
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
