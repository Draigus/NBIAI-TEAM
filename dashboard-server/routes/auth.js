const bcrypt = require('bcrypt');
const crypto = require('crypto');

module.exports = function(ctx) {
  const router = require('express').Router();
  const {
    pool, log, hashToken, escHtml,
    cacheToken, invalidateToken, clearTokenCache,
    SESSION_COOKIE_NAME, getSessionCookieOpts, getCookieToken,
    FAILED_LOGIN_THRESHOLD, FAILED_LOGIN_LOCKOUT, LOCKOUT_DURATION,
    getFailedLogins, recordFailedLogin, clearFailedLogins,
    sendEmailAsync, EMAIL_FROM, APP_URL, _msalClient,
    authFailures, requireAdmin, requireAuth, validatePassword,
    auditLog,
  } = ctx;

  const SESSION_EXPIRY_DAYS = ctx.SESSION_EXPIRY_DAYS;

  router.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const key = username.toLowerCase().trim();

    const failEntry = await getFailedLogins(key);
    if (failEntry && failEntry.count >= FAILED_LOGIN_LOCKOUT) {
      const elapsed = Date.now() - failEntry.lastAttempt;
      if (elapsed < LOCKOUT_DURATION) {
        const minsLeft = Math.ceil((LOCKOUT_DURATION - elapsed) / 60000);
        log('warn', 'Auth', `Account lockout active for "${key}" — ${failEntry.count} failures, ${minsLeft}min remaining`);
        return res.status(429).json({ error: `Account temporarily locked. Try again in ${minsLeft} minute${minsLeft > 1 ? 's' : ''}.`, locked: true, minsLeft });
      }
      log('info', 'Auth', `Lockout expired for "${key}", resetting counter`);
      await clearFailedLogins(key);
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [key]);
    if (rows.length === 0) {
      const count = await recordFailedLogin(key);
      const showReset = count >= FAILED_LOGIN_THRESHOLD;
      authFailures?.inc();
      log('warn', 'Auth', 'Login failed', { username: key, reason: 'unknown_user', failCount: count }, req.requestId);
      return res.status(401).json({ error: 'Invalid username or password', showReset });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const count = await recordFailedLogin(key);
      const showReset = count >= FAILED_LOGIN_THRESHOLD;
      authFailures?.inc();
      log('warn', 'Auth', 'Login failed', { username: key, reason: 'bad_password', userId: user.id, failCount: count }, req.requestId);
      return res.status(401).json({ error: 'Invalid username or password', showReset });
    }

    await clearFailedLogins(key);

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await pool.query('INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, hashedToken, expiresAt]);
    cacheToken(hashedToken, {
      id: user.id, username: user.username, displayName: user.display_name,
      role: user.role, clientId: user.client_id, clientRole: user.client_role,
      isNBI: !user.client_id, isClientAdmin: !!user.client_id && user.client_role === 'admin',
      mustChangePassword: user.must_change_password,
    });

    log('info', 'Auth', 'Login success', { username: user.username, userId: user.id }, req.requestId);
    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOpts(req));
    res.json({
      token,
      user: {
        id: user.id, username: user.username, displayName: user.display_name,
        role: user.role, clientId: user.client_id, clientRole: user.client_role,
        isNBI: !user.client_id, isClientAdmin: !!user.client_id && user.client_role === 'admin',
        mustChangePassword: user.must_change_password,
      },
      expiresAt: expiresAt.toISOString(),
    });
  });

  router.post('/api/auth/logout', async (req, res) => {
    const token = getCookieToken(req) || (req.headers.authorization || '').replace('Bearer ', '');
    if (token) {
      const hashed = hashToken(token);
      await pool.query('DELETE FROM sessions WHERE token = $1', [hashed]);
      invalidateToken(hashed);
    }
    log('info', 'Auth', 'Logout', { userId: req.user?.id || null }, req.requestId);
    res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', path: '/' });
    res.json({ ok: true });
  });

  router.get('/api/auth/me', async (req, res) => {
    const token = getCookieToken(req) || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const hashed = hashToken(token);
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.role, u.client_id, u.client_role, u.must_change_password,
              u.docs_view, u.docs_edit, u.docs_create, u.docs_upload FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`, [hashed]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Session expired' });
    res.json({ user: {
      id: rows[0].id, username: rows[0].username, displayName: rows[0].display_name,
      role: rows[0].role, clientId: rows[0].client_id, clientRole: rows[0].client_role,
      isNBI: !rows[0].client_id, isClientAdmin: !!rows[0].client_id && rows[0].client_role === 'admin',
      mustChangePassword: rows[0].must_change_password,
      docsView: rows[0].docs_view, docsEdit: rows[0].docs_edit,
      docsCreate: rows[0].docs_create, docsUpload: rows[0].docs_upload,
    } });
  });

  router.post('/api/auth/forgot-password', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username or email required' });

    const { rows } = await pool.query('SELECT id, email, display_name FROM users WHERE username = $1 OR email = $1', [username.toLowerCase().trim()]);
    if (rows.length === 0) return res.json({ ok: true, message: 'If that account exists, a reset link has been sent.' });

    const user = rows[0];
    if (!user.email) return res.json({ ok: true, message: 'If that account exists, a reset link has been sent.' });

    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);

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
    if (!_msalClient) {
      log('info', 'Auth', 'FALLBACK — Reset link generated (email send unavailable)', { userId: user.id }, req.requestId);
    }
    log('info', 'Auth', 'Password reset requested', { userId: user.id }, req.requestId);

    res.json({ ok: true, message: 'If that account exists, a reset link has been sent.' });
  });

  router.get('/api/auth/reset-token/:token', async (req, res) => {
    const hashedResetToken = hashToken(req.params.token);
    const { rows } = await pool.query(
      'SELECT t.*, u.username, u.display_name FROM password_reset_tokens t JOIN users u ON t.user_id = u.id WHERE t.token = $1 AND t.used = FALSE AND t.expires_at > NOW()',
      [hashedResetToken]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link' });
    res.json({ ok: true, displayName: rows[0].display_name });
  });

  router.post('/api/auth/reset-token/:token', async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'Password is required' });
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.message });

    const hashedResetToken = hashToken(req.params.token);
    const { rows } = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [hashedResetToken]
    );
    if (rows.length === 0) {
      log('warn', 'Auth', 'Reset token invalid or expired', {}, req.requestId);
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const resetRow = rows[0];
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, resetRow.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetRow.id]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [resetRow.user_id]);
    log('info', 'Auth', 'Password reset via token', { userId: resetRow.user_id }, req.requestId);
    if (auditLog) await auditLog('user', resetRow.user_id, 'password_reset_token', 'self');

    res.json({ ok: true, message: 'Password has been reset. You can now sign in.' });
  });

  router.post('/api/auth/reset-password', requireAuth, requireAdmin, async (req, res) => {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: 'userId and newPassword required' });
    const adminPwCheck = validatePassword(newPassword);
    if (!adminPwCheck.valid) return res.status(400).json({ error: adminPwCheck.message });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    const { rows: resetUser } = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    if (resetUser.length > 0) await clearFailedLogins(resetUser[0].username.toLowerCase());
    log('info', 'Auth', 'Admin password reset', { targetUserId: userId, adminUser: req.user?.displayName }, req.requestId);
    if (auditLog) await auditLog('user', userId, 'admin_password_reset', req.user?.displayName || 'admin');
    res.json({ ok: true });
  });

  router.post('/api/auth/clear-lockout', requireAuth, requireAdmin, async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    const key = username.toLowerCase().trim();
    const entry = await getFailedLogins(key);
    await clearFailedLogins(key);
    log('info', 'Auth', 'Lockout cleared', { username: key, by: req.user?.displayName, hadLockout: !!entry }, req.requestId);
    res.json({ ok: true, cleared: !!entry });
  });

  router.post('/api/auth/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    const changePwCheck = validatePassword(newPassword);
    if (!changePwCheck.valid) return res.status(400).json({ error: changePwCheck.message });

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      log('warn', 'Auth', 'Password change failed — wrong current password', { userId: req.user.id }, req.requestId);
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    await pool.query('UPDATE users SET must_change_password = false WHERE id = $1', [req.user.id]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.user.id]);
    log('info', 'Auth', 'Password changed', { userId: req.user.id }, req.requestId);
    if (auditLog) await auditLog('user', req.user.id, 'password_changed', req.user?.displayName || 'self');
    clearTokenCache();
    res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', path: '/' });
    res.json({ ok: true });
  });

  return router;
};
