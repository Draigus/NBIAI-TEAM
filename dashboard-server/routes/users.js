const bcrypt = require('bcrypt');
const crypto = require('crypto');

module.exports = function(ctx) {
  const router = require('express').Router();
  const {
    pool, log, requireAdmin, requireNBI, requireClientAdmin,
    isValidUuid, auditLog, invalidateUserTokens, getClientScope,
    sendEmailAsync, EMAIL_FROM, APP_URL, _msalClient,
    cacheToken, validateLength, buildPatchQuery, validatePassword,
  } = ctx;

  /** GET /api/users — List users. Admins see full details; client users see their company; members see names only. */
  router.get('/api/users', async (req, res) => {
    if (req.user.clientId) {
      // Client users see their own staff + NBI contacts assigned via client_nbi_contacts table
      const { rows } = await pool.query(
        `SELECT id, username, display_name, email, client_role, is_active FROM users WHERE client_id = $1
         UNION ALL
         SELECT u.id, u.username, u.display_name, u.email, NULL AS client_role, u.is_active
           FROM client_nbi_contacts cnc JOIN users u ON u.id = cnc.user_id
           WHERE cnc.client_id = $1 AND u.is_active = TRUE
         ORDER BY display_name`,
        [req.user.clientId]
      );
      res.json(rows);
    } else if (req.user.role === 'admin') {
      const { rows } = await pool.query('SELECT id, username, display_name, email, role, is_active, capacity_hours_per_week, resource_type_ids, created_at, client_id, client_role, docs_view, docs_edit, docs_create, docs_upload, can_submit_queue FROM users ORDER BY display_name');
      res.json(rows);
    } else {
      // Non-admins only get names (for assignee dropdowns) — no emails, roles, or capacity
      const { rows } = await pool.query('SELECT id, username, display_name FROM users WHERE is_active = TRUE ORDER BY display_name');
      res.json(rows);
    }
  });

  /** POST /api/users — Create a new user (admin or client admin) */
  router.post('/api/users', async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const isClientAdminUser = req.user?.isClientAdmin;

    // Auth: must be NBI admin or client admin
    if (!isAdmin && !isClientAdminUser) {
      return res.status(403).json({ error: 'Admin or client admin access required' });
    }

    let { username, display_name, email, password, role } = req.body;
    let client_id = req.body.client_id || null;
    let client_role = req.body.client_role || null;
    let must_change_password = false;

    // Client admin constraints
    if (isClientAdminUser) {
      // Cannot set NBI admin role
      if (role === 'admin') {
        return res.status(403).json({ error: 'Client admins cannot create NBI admin users' });
      }
      // Force role to member, client_id to own company
      role = 'member';
      client_id = req.user.clientId;
      client_role = client_role || 'member';
      must_change_password = true;

      // Generate temp password if not provided
      if (!password) {
        password = crypto.randomBytes(12).toString('base64url').slice(0, 16);
      }
    }

    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const lenErr = validateLength(username, 'name', 200) || validateLength(display_name, 'name') || validateLength(email, 'email');
    if (lenErr) return res.status(400).json({ error: lenErr });
    // Validate password complexity unless it was auto-generated (must_change_password flag)
    if (!must_change_password) {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.message });
    }
    const hash = await bcrypt.hash(password, 10);
    const cleanEmail = email && email.trim() ? email.trim() : null;
    // Check for duplicate email before insert
    if (cleanEmail) {
      const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
      if (existing.length > 0) return res.status(409).json({ error: 'Email address already in use' });
    }
    // Atomic insert — ON CONFLICT prevents race conditions
    const { rows } = await pool.query(
      `INSERT INTO users (username, display_name, email, password_hash, role, client_id, client_role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, display_name, email, role, client_id, client_role, must_change_password`,
      [username.toLowerCase().trim(), display_name || username, cleanEmail, hash, role || 'member', client_id, client_role, must_change_password]
    );
    if (rows.length === 0) return res.status(409).json({ error: 'Username already exists' });
    await auditLog('user', rows[0].id, 'create', req.user?.displayName, { username, display_name });

    // Client admin actions: log to client_activity_log and send invite email
    if (isClientAdminUser) {
      await pool.query(
        `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.clientId, 'create_user', 'user', rows[0].id, JSON.stringify({ username, display_name })]
      );
      if (cleanEmail) {
        sendEmailAsync({
          to: cleanEmail,
          subject: 'Your NBI WorkSage account has been created',
          body: `<p>Hello ${display_name || username},</p>
<p>An account has been created for you on NBI WorkSage. Your temporary password is: <strong>${password}</strong></p>
<p>You will be asked to change your password on first login.</p>`,
        });
      }
    }

    const result = { ...rows[0] };
    if (must_change_password) result.generated_password = password;
    res.status(201).json(result);
  });

  /** DELETE /api/users/:id — Delete a user and their sessions (admin only, cannot delete self) */
  router.delete('/api/users/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
    // Prevent deleting yourself
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await auditLog('user', req.params.id, 'delete', req.user?.displayName);
    res.json({ ok: true });
  });

  /** PATCH /api/users/:id — Update user profile fields (admin or client admin) */
  router.patch('/api/users/:id', async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const isClientAdminUser = req.user?.isClientAdmin;

    if (!isAdmin && !isClientAdminUser) {
      return res.status(403).json({ error: 'Admin or client admin access required' });
    }

    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
    if (req.body.is_active !== undefined && typeof req.body.is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    // Client admin constraints
    if (isClientAdminUser) {
      // Cannot change client_id
      if (req.body.client_id !== undefined) {
        return res.status(403).json({ error: 'Client admins cannot change client assignment' });
      }
      // Cannot promote to NBI admin role
      if (req.body.role === 'admin') {
        return res.status(403).json({ error: 'Client admins cannot promote to NBI admin role' });
      }
      // Verify target user belongs to the same client
      const { rows: targetRows } = await pool.query('SELECT client_id, client_role FROM users WHERE id = $1', [req.params.id]);
      if (targetRows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (targetRows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Cannot modify users outside your company' });
      }
      // Prevent last client admin self-demotion
      if (req.body.client_role && req.body.client_role !== 'admin' && req.params.id === req.user.id) {
        const { rows: adminCount } = await pool.query(
          'SELECT COUNT(*) as cnt FROM users WHERE client_id = $1 AND client_role = $2 AND is_active = true',
          [req.user.clientId, 'admin']
        );
        if (Number(adminCount[0].cnt) <= 1) {
          return res.status(400).json({ error: 'Cannot demote the last client admin — at least one admin must remain' });
        }
      }
    }

    const allowedFields = isAdmin
      ? ['role', 'display_name', 'email', 'client_id', 'is_active', 'client_role', 'docs_view', 'docs_edit', 'docs_create', 'docs_upload', 'can_submit_queue', 'capacity_hours_per_week']
      : ['display_name', 'client_role', 'is_active'];

    const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowedFields);
    if (req.body.display_name !== undefined && !req.body.display_name.trim()) {
      return res.status(400).json({ error: 'Display name cannot be empty' });
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING id, username, display_name, email, role, client_id, client_role, is_active, docs_view, docs_edit, docs_create, docs_upload`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    // Invalidate token cache entries for this user so stale role/display_name data is refreshed
    invalidateUserTokens(req.params.id);
    // When deactivating a user, kill all their sessions immediately (B-B3)
    if (req.body.is_active === false) {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
    }
    // Log client admin actions
    if (isClientAdminUser) {
      await pool.query(
        `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.clientId, 'update_user', 'user', req.params.id, JSON.stringify(req.body)]
      );
    }
    res.json(rows[0]);
  });

  /** POST /api/users/:id/deactivate — Deactivate a user (admin or client admin) */
  router.post('/api/users/:id/deactivate', async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const isClientAdminUser = req.user?.isClientAdmin;

    if (!isAdmin && !isClientAdminUser) {
      return res.status(403).json({ error: 'Admin or client admin access required' });
    }
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });

    // Client admin: verify target belongs to same client
    if (isClientAdminUser) {
      const { rows: targetRows } = await pool.query('SELECT client_id FROM users WHERE id = $1', [req.params.id]);
      if (targetRows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (targetRows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Cannot deactivate users outside your company' });
      }
    }

    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
    // Clear token cache for this user
    invalidateUserTokens(req.params.id);
    await auditLog('user', req.params.id, 'deactivate', req.user?.displayName);
    if (isClientAdminUser) {
      await pool.query(
        `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.clientId, 'deactivate_user', 'user', req.params.id, '{}']
      );
    }
    res.json({ ok: true });
  });

  /** POST /api/users/:id/reactivate — Reactivate a user (admin or client admin) */
  router.post('/api/users/:id/reactivate', async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const isClientAdminUser = req.user?.isClientAdmin;

    if (!isAdmin && !isClientAdminUser) {
      return res.status(403).json({ error: 'Admin or client admin access required' });
    }
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });

    // Client admin: verify target belongs to same client
    if (isClientAdminUser) {
      const { rows: targetRows } = await pool.query('SELECT client_id FROM users WHERE id = $1', [req.params.id]);
      if (targetRows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (targetRows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Cannot reactivate users outside your company' });
      }
    }

    await pool.query('UPDATE users SET is_active = true WHERE id = $1', [req.params.id]);
    await auditLog('user', req.params.id, 'reactivate', req.user?.displayName);
    if (isClientAdminUser) {
      await pool.query(
        `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.clientId, 'reactivate_user', 'user', req.params.id, '{}']
      );
    }
    res.json({ ok: true });
  });

  /** POST /api/users/:id/reset-password — Reset a user's password (admin or client admin) */
  router.post('/api/users/:id/reset-password', async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const isClientAdminUser = req.user?.isClientAdmin;

    if (!isAdmin && !isClientAdminUser) {
      return res.status(403).json({ error: 'Admin or client admin access required' });
    }
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });

    // Client admin: verify target belongs to same client
    if (isClientAdminUser) {
      const { rows: targetRows } = await pool.query('SELECT client_id FROM users WHERE id = $1', [req.params.id]);
      if (targetRows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (targetRows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Cannot reset password for users outside your company' });
      }
    }

    // Generate 16-char temp password
    const tempPassword = crypto.randomBytes(12).toString('base64url').slice(0, 16);
    const hash = await bcrypt.hash(tempPassword, 10);

    await pool.query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [hash, req.params.id]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
    // Clear token cache for this user
    invalidateUserTokens(req.params.id);

    // Send email with new temp password
    const { rows: userRows } = await pool.query('SELECT email, display_name, username FROM users WHERE id = $1', [req.params.id]);
    if (userRows[0]?.email) {
      sendEmailAsync({
        to: userRows[0].email,
        subject: 'Your NBI WorkSage password has been reset',
        body: `<p>Hello ${userRows[0].display_name || userRows[0].username},</p>
<p>Your password has been reset. Your temporary password is: <strong>${tempPassword}</strong></p>
<p>You will be asked to change your password on next login.</p>`,
      });
    }

    await auditLog('user', req.params.id, 'reset_password', req.user?.displayName);
    if (isClientAdminUser) {
      await pool.query(
        `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.clientId, 'reset_password', 'user', req.params.id, '{}']
      );
    }
    res.json({ ok: true, tempPassword });
  });

  // ==================== Client NBI Contacts (admin only) ====================

  /** GET /api/clients/:id/nbi-contacts — List NBI contacts assigned to a client */
  router.get('/api/clients/:id/nbi-contacts', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    const { rows } = await pool.query(
      `SELECT u.id, u.display_name, u.email
       FROM client_nbi_contacts cnc JOIN users u ON u.id = cnc.user_id
       WHERE cnc.client_id = $1
       ORDER BY u.display_name`,
      [req.params.id]
    );
    res.json(rows);
  });

  /** POST /api/clients/:id/nbi-contacts — Add an NBI contact to a client */
  router.post('/api/clients/:id/nbi-contacts', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    const { user_id } = req.body;
    if (!user_id || !isValidUuid(user_id)) return res.status(400).json({ error: 'Valid user_id required' });
    try {
      const { rows } = await pool.query(
        `INSERT INTO client_nbi_contacts (client_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (client_id, user_id) DO NOTHING
         RETURNING id, client_id, user_id, created_at`,
        [req.params.id, user_id]
      );
      if (rows.length === 0) {
        return res.status(409).json({ error: 'Contact already assigned to this client' });
      }
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23503') {
        return res.status(400).json({ error: 'Client or user not found' });
      }
      throw err;
    }
  });

  /** DELETE /api/clients/:id/nbi-contacts/:userId — Remove an NBI contact from a client */
  router.delete('/api/clients/:id/nbi-contacts/:userId', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    if (!isValidUuid(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const { rowCount } = await pool.query(
      'DELETE FROM client_nbi_contacts WHERE client_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Contact mapping not found' });
    res.json({ ok: true });
  });

  /** PATCH /api/users/:id/skills — Update a user's resource type skills (admin only) */
  router.patch('/api/users/:id/skills', requireAdmin, async (req, res) => {
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['resource_type_ids', 'capacity_hours_per_week']);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING id, display_name, resource_type_ids, capacity_hours_per_week`, vals);
    res.json(rows[0]);
  });

  return router;
};
