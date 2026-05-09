// lib/auth-middleware.js — auth middleware, session helpers, token cache, brute-force protection
const { log } = require('./logger');
const { hashToken } = require('./helpers');

const SESSION_COOKIE_NAME = 'nbi_session';
const SESSION_EXPIRY_DAYS = 7;

function getSessionCookieOpts(req) {
  return { httpOnly: true, secure: req.secure, sameSite: 'lax', path: '/', maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000 };
}

function getCookieToken(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(/nbi_session=([^;]+)/);
  return match ? match[1] : null;
}

// Brute-force protection constants
const FAILED_LOGIN_THRESHOLD = 3;
const FAILED_LOGIN_LOCKOUT = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

module.exports = function createAuthMiddleware(pool) {
  // Token cache — avoids DB query on every request
  const _tokenCache = new Map();
  const TOKEN_CACHE_TTL = 5 * 60 * 1000;

  function cacheToken(token, user) {
    _tokenCache.set(token, { user, expiresAt: Date.now() + TOKEN_CACHE_TTL });
  }
  function getCachedToken(token) {
    const entry = _tokenCache.get(token);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { _tokenCache.delete(token); return null; }
    return entry.user;
  }
  function invalidateToken(token) { _tokenCache.delete(token); }
  function invalidateUserTokens(userId) {
    for (const [key, entry] of _tokenCache) {
      if (entry.user && entry.user.id === userId) _tokenCache.delete(key);
    }
  }
  function clearTokenCache() { _tokenCache.clear(); }

  // Cleanup stale token cache entries every 10 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of _tokenCache) { if (entry.expiresAt <= now) _tokenCache.delete(token); }
    pool.query('DELETE FROM login_attempts WHERE last_attempt < NOW() - INTERVAL \'1 hour\'').catch(() => {});
  }, 10 * 60 * 1000).unref();

  // Brute-force protection: persisted to DB so counters survive PM2 restarts
  async function getFailedLogins(username) {
    const { rows } = await pool.query('SELECT fail_count, last_attempt, locked_until FROM login_attempts WHERE username = $1', [username]);
    if (rows.length === 0) return null;
    return { count: rows[0].fail_count, lastAttempt: new Date(rows[0].last_attempt).getTime(), lockedUntil: rows[0].locked_until ? new Date(rows[0].locked_until).getTime() : null };
  }
  async function recordFailedLogin(username) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
    const { rows } = await pool.query(
      `INSERT INTO login_attempts (username, fail_count, last_attempt)
       VALUES ($1, 1, NOW())
       ON CONFLICT (username) DO UPDATE SET fail_count = login_attempts.fail_count + 1, last_attempt = NOW()
       RETURNING fail_count`,
      [username]
    );
    const count = rows[0].fail_count;
    if (count >= FAILED_LOGIN_LOCKOUT) {
      await pool.query('UPDATE login_attempts SET locked_until = $1 WHERE username = $2', [lockedUntil, username]);
    }
    return count;
  }
  async function clearFailedLogins(username) {
    await pool.query('DELETE FROM login_attempts WHERE username = $1', [username]);
  }

  // Auth middleware
  async function requireAuth(req, res, next) {
    if (req.path === '/api/auth/login' || req.path === '/api/health') return next();
    if (req.path.startsWith('/api/auth/forgot') || req.path.startsWith('/api/auth/reset-token')) return next();
    if (/^\/api\/reports\/[0-9a-f]{32}(\/html|\/pdf)?$/.test(req.path)) return next();
    if (req.path === '/api/slack/events') return next();
    if (req.method === 'POST' && req.path === '/api/queue' && req.get('x-api-key')) return next();
    if (!req.path.startsWith('/api/')) return next();

    const token = getCookieToken(req) || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    try {
      const hashedToken = hashToken(token);
      const cached = getCachedToken(hashedToken);
      if (cached) { req.user = cached; return next(); }

      const { rows } = await pool.query(
        `SELECT u.id, u.username, u.display_name, u.role, u.client_id, u.client_role, u.must_change_password,
                u.docs_view, u.docs_edit, u.docs_create, u.docs_upload, u.can_submit_queue FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`, [hashedToken]
      );
      if (rows.length === 0) return res.status(401).json({ error: 'Session expired' });
      const user = {
        id: rows[0].id, username: rows[0].username, displayName: rows[0].display_name,
        role: rows[0].role, clientId: rows[0].client_id, clientRole: rows[0].client_role,
        isNBI: !rows[0].client_id, isClientAdmin: !!rows[0].client_id && rows[0].client_role === 'admin',
        mustChangePassword: rows[0].must_change_password,
        docsView: rows[0].docs_view, docsEdit: rows[0].docs_edit,
        docsCreate: rows[0].docs_create, docsUpload: rows[0].docs_upload,
        can_submit_queue: rows[0].can_submit_queue,
      };
      cacheToken(hashedToken, user);
      req.user = user;
      next();
    } catch(e) {
      log('error', 'Auth', 'Auth check failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  }

  // Client scope helpers
  async function getClientScopes(req) {
    if (req._clientScopes !== undefined) return req._clientScopes;
    if (req.user?.role === 'admin') { req._clientScopes = null; return null; }
    if (req.user?.clientId) { req._clientScopes = [req.user.clientId]; return req._clientScopes; }

    const { rows: teams } = await pool.query(
      'SELECT DISTINCT t.client_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE tm.user_id = $1 AND t.client_id IS NOT NULL',
      [req.user?.id]
    );
    const { rows: exceptions } = await pool.query('SELECT id FROM clients WHERE always_visible = true');
    const exceptionIds = exceptions.map(e => e.id);

    if (teams.length === 0) {
      req._clientScopes = exceptionIds.length > 0 ? exceptionIds : ['00000000-0000-0000-0000-000000000000'];
      return req._clientScopes;
    }

    const teamClientIds = teams.map(t => t.client_id);
    req._clientScopes = [...new Set([...teamClientIds, ...exceptionIds])];
    return req._clientScopes;
  }

  function getClientScope(req) {
    return req.user?.clientId || null;
  }

  function requireNBI(req, res, next) {
    if (req.user?.clientId) return res.status(403).json({ error: 'This feature is not available for client accounts' });
    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
  }

  function requireClientAdmin(req, res, next) {
    if (!req.user?.clientId || req.user?.clientRole !== 'admin') {
      return res.status(403).json({ error: 'Client admin access required' });
    }
    next();
  }

  async function requireTaskAccess(req, res, taskId) {
    if (!req.user?.clientId) return true;
    let currentId = taskId;
    let depth = 0;
    const MAX_DEPTH = 10;

    while (currentId && depth < MAX_DEPTH) {
      const { rows } = await pool.query('SELECT parent_id, client_id FROM tasks WHERE id = $1', [currentId]);
      if (rows.length === 0) { res.status(404).json({ error: 'Task not found' }); return false; }
      if (!rows[0].parent_id) {
        if (rows[0].client_id && rows[0].client_id !== req.user.clientId) {
          res.status(403).json({ error: 'Access denied' });
          return false;
        }
        return true;
      }
      currentId = rows[0].parent_id;
      depth++;
    }

    const { rows: last } = await pool.query('SELECT client_id FROM tasks WHERE id = $1', [currentId]);
    if (last.length > 0 && last[0].client_id && last[0].client_id !== req.user.clientId) {
      res.status(403).json({ error: 'Access denied' });
      return false;
    }
    return true;
  }

  return {
    SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS, FAILED_LOGIN_THRESHOLD, FAILED_LOGIN_LOCKOUT, LOCKOUT_DURATION,
    getSessionCookieOpts, getCookieToken,
    cacheToken, getCachedToken, invalidateToken,
    getFailedLogins, recordFailedLogin, clearFailedLogins,
    requireAuth, getClientScopes, getClientScope,
    requireNBI, requireAdmin, requireClientAdmin, requireTaskAccess,
    invalidateUserTokens, clearTokenCache,
  };
};
