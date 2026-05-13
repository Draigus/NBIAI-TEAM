# Server Modularisation Task 11 — Extract 8 Route Groups

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 8 route groups from the monolithic `server.js` into individual files under `routes/`, following the established `module.exports = function(ctx) { router }` pattern, leaving all 387 tests green.

**Architecture:** Each route file exports a factory function that receives a `ctx` object containing its dependencies (pool, middleware, helpers, etc.) and returns an Express Router. `server.js` mounts the returned router with `app.use(require('./routes/X')(ctx))`. No route logic, paths, or response shapes change — this is a pure structural extraction. All dependencies that were closed over from module scope in `server.js` are now passed explicitly through `ctx`.

**Tech Stack:** Node.js, Express 4 Router, existing `lib/` helpers, `bcrypt`, `crypto`, `fs`, `path`, `multer`.

---

## Preconditions

- Working directory: `D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server/dashboard-server`
- `routes/auth.js` has **already been written** in this session (do NOT recreate it)
- Run `npm test` at start to confirm baseline is 387 passing — if not, stop and report
- Do NOT commit — Glen reviews and commits

## File Map

| File | Action | server.js lines removed |
|---|---|---|
| `routes/auth.js` | **Already done** — skip | ~262–561 |
| `routes/users.js` | Create | ~563–855 + 7881–7888 |
| `routes/clients.js` | Create | ~2109–2260 |
| `routes/milestones.js` | Create | ~2262–2367 |
| `routes/sows.js` | Create | ~2369–2615 |
| `routes/teams.js` | Create | ~2617–2867 |
| `routes/calendar.js` | Create | ~1829–2107 |
| `routes/attachments.js` | Create | ~1653–1827 |
| `server.js` | Remove extracted blocks, add 7 mount lines | net ~−1050 lines |

**ctx shape for each route file:**

```
users:       { pool, log, bcrypt (local require), crypto (local require),
               hashToken, requireAdmin, requireNBI, requireClientAdmin,
               requireAuth, isValidUuid, auditLog, invalidateUserTokens,
               getClientScope, sendEmailAsync, EMAIL_FROM, APP_URL, _msalClient,
               cacheToken, getCachedToken, validateLength, buildPatchQuery }
clients:     { pool, requireAdmin, getClientScopes, isValidUuid, auditLog,
               log, validateLength, buildPatchQuery }
milestones:  { pool, requireAdmin, isValidUuid }
sows:        { pool, requireAdmin, isValidUuid, log, auditLog,
               validateLength, buildPatchQuery, extractWorkPackage }
teams:       { pool, requireAdmin, isValidUuid, auditLog, log,
               validateLength, buildPatchQuery }
calendar:    { pool, requireAdmin, isValidUuid, auditLog, log,
               getClientScopes }
attachments: { pool, requireAdmin, requireNBI, upload, fs (local require),
               path (local require), log, isValidUuid, auditLog,
               requireTaskAccess, uploadDir }
```

> Note: `bcrypt`, `crypto`, `fs`, `path` are Node built-ins or already required at the top of `server.js`. In route files, `require` them at the top of the module (before `module.exports`), NOT from `ctx`.

---

## Task 1: Confirm baseline

- [ ] **Step 1: Run the test suite**

```bash
cd "D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server/dashboard-server"
npm test
```

Expected: 387 tests pass, 0 failures. If anything fails, stop — do not proceed.

---

## Task 2: Create `routes/users.js`

**Files:**
- Create: `routes/users.js`
- Modify: `server.js` (remove users block + skills route, add mount line)

The users block spans two non-contiguous sections:
1. Lines ~563–855: the main user management routes (`GET /api/users` through `POST /api/users/:id/reset-password`)
2. Lines ~7881–7888: `PATCH /api/users/:id/skills` (near the end of server.js)

Both must be removed from `server.js` and placed in the route file.

- [ ] **Step 1: Create `routes/users.js`**

```javascript
const bcrypt = require('bcrypt');
const crypto = require('crypto');

module.exports = function(ctx) {
  const router = require('express').Router();
  const {
    pool, log, requireAdmin, requireAuth,
    isValidUuid, auditLog, invalidateUserTokens,
    sendEmailAsync, validateLength, buildPatchQuery,
  } = ctx;

  router.get('/api/users', async (req, res) => {
    if (req.user.role === 'admin') {
      const { rows } = await pool.query('SELECT id, username, display_name, email, role, is_active, capacity_hours_per_week, resource_type_ids, created_at, client_id, client_role, docs_view, docs_edit, docs_create, docs_upload, can_submit_queue FROM users ORDER BY display_name');
      res.json(rows);
    } else if (req.user.clientId) {
      const { rows } = await pool.query(
        'SELECT id, username, display_name, email, client_role, is_active FROM users WHERE client_id = $1 ORDER BY display_name',
        [req.user.clientId]
      );
      res.json(rows);
    } else {
      const { rows } = await pool.query('SELECT id, username, display_name FROM users WHERE is_active = TRUE ORDER BY display_name');
      res.json(rows);
    }
  });

  router.post('/api/users', async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const isClientAdminUser = req.user?.isClientAdmin;

    if (!isAdmin && !isClientAdminUser) {
      return res.status(403).json({ error: 'Admin or client admin access required' });
    }

    let { username, display_name, email, password, role } = req.body;
    let client_id = req.body.client_id || null;
    let client_role = req.body.client_role || null;
    let must_change_password = false;

    if (isClientAdminUser) {
      if (role === 'admin') {
        return res.status(403).json({ error: 'Client admins cannot create NBI admin users' });
      }
      role = 'member';
      client_id = req.user.clientId;
      client_role = client_role || 'member';
      must_change_password = true;

      if (!password) {
        password = crypto.randomBytes(12).toString('base64url').slice(0, 16);
      }
    }

    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const lenErr = validateLength(username, 'name', 200) || validateLength(display_name, 'name') || validateLength(email, 'email');
    if (lenErr) return res.status(400).json({ error: lenErr });
    const hash = await bcrypt.hash(password, 10);
    const cleanEmail = email && email.trim() ? email.trim() : null;
    if (cleanEmail) {
      const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
      if (existing.length > 0) return res.status(409).json({ error: 'Email address already in use' });
    }
    const { rows } = await pool.query(
      `INSERT INTO users (username, display_name, email, password_hash, role, client_id, client_role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, display_name, email, role, client_id, client_role, must_change_password`,
      [username.toLowerCase().trim(), display_name || username, cleanEmail, hash, role || 'member', client_id, client_role, must_change_password]
    );
    if (rows.length === 0) return res.status(409).json({ error: 'Username already exists' });
    await auditLog('user', rows[0].id, 'create', req.user?.displayName, { username, display_name });

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

    res.status(201).json(rows[0]);
  });

  router.delete('/api/users/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await auditLog('user', req.params.id, 'delete', req.user?.displayName);
    res.json({ ok: true });
  });

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

    if (isClientAdminUser) {
      if (req.body.client_id !== undefined) {
        return res.status(403).json({ error: 'Client admins cannot change client assignment' });
      }
      if (req.body.role === 'admin') {
        return res.status(403).json({ error: 'Client admins cannot promote to NBI admin role' });
      }
      const { rows: targetRows } = await pool.query('SELECT client_id, client_role FROM users WHERE id = $1', [req.params.id]);
      if (targetRows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (targetRows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Cannot modify users outside your company' });
      }
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
    invalidateUserTokens(req.params.id);
    if (req.body.is_active === false) {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
    }
    if (isClientAdminUser) {
      await pool.query(
        `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.clientId, 'update_user', 'user', req.params.id, JSON.stringify(req.body)]
      );
    }
    res.json(rows[0]);
  });

  router.post('/api/users/:id/deactivate', async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const isClientAdminUser = req.user?.isClientAdmin;

    if (!isAdmin && !isClientAdminUser) {
      return res.status(403).json({ error: 'Admin or client admin access required' });
    }
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });

    if (isClientAdminUser) {
      const { rows: targetRows } = await pool.query('SELECT client_id FROM users WHERE id = $1', [req.params.id]);
      if (targetRows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (targetRows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Cannot deactivate users outside your company' });
      }
    }

    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
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

  router.post('/api/users/:id/reactivate', async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const isClientAdminUser = req.user?.isClientAdmin;

    if (!isAdmin && !isClientAdminUser) {
      return res.status(403).json({ error: 'Admin or client admin access required' });
    }
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });

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

  router.post('/api/users/:id/reset-password', async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const isClientAdminUser = req.user?.isClientAdmin;

    if (!isAdmin && !isClientAdminUser) {
      return res.status(403).json({ error: 'Admin or client admin access required' });
    }
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });

    if (isClientAdminUser) {
      const { rows: targetRows } = await pool.query('SELECT client_id FROM users WHERE id = $1', [req.params.id]);
      if (targetRows.length === 0) return res.status(404).json({ error: 'User not found' });
      if (targetRows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Cannot reset password for users outside your company' });
      }
    }

    const tempPassword = crypto.randomBytes(12).toString('base64url').slice(0, 16);
    const hash = await bcrypt.hash(tempPassword, 10);

    await pool.query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [hash, req.params.id]);
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
    invalidateUserTokens(req.params.id);

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

  router.patch('/api/users/:id/skills', requireAdmin, async (req, res) => {
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['resource_type_ids', 'capacity_hours_per_week']);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING id, display_name, resource_type_ids, capacity_hours_per_week`, vals);
    res.json(rows[0]);
  });

  return router;
};
```

- [ ] **Step 2: Remove users block from `server.js` and add mount line**

In `server.js`, remove these two blocks (use exact content matching, not line numbers — line numbers shift after auth removal):

Block 1: from `// ==================== USER MANAGEMENT ====================` to the closing `});` of `POST /api/users/:id/reset-password` (just before `// ==================== AUDIT LOG ====================`).

Block 2: the `PATCH /api/users/:id/skills` route near the bottom of the file (the block starting `/** PATCH /api/users/:id/skills` and ending `});`).

Add this line to the `// ==================== MODULAR ROUTES ====================` block:

```javascript
app.use(require('./routes/users')({ pool, log, requireAdmin, requireAuth, isValidUuid, auditLog, invalidateUserTokens, sendEmailAsync, validateLength, buildPatchQuery }));
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 387 pass.

---

## Task 3: Create `routes/attachments.js`

**Files:**
- Create: `routes/attachments.js`
- Modify: `server.js` (remove attachments block, add mount line)

Note: `uploadDir` is defined in `server.js` as `const uploadDir = path.join(__dirname, 'uploads')`. Pass it through ctx. `fs` and `path` must be `require`d at the top of the route file.

The attachments block also includes one task-specific alias route (`POST /api/tasks/:id/attachments/link`) — include it in this file.

- [ ] **Step 1: Create `routes/attachments.js`**

```javascript
const fs = require('fs');
const path = require('path');

module.exports = function(ctx) {
  const router = require('express').Router();
  const {
    pool, requireAdmin, requireNBI, upload,
    log, isValidUuid, auditLog, requireTaskAccess, uploadDir,
  } = ctx;

  const VALID_ENTITY_TYPES = ['client', 'project', 'task', 'lead', 'expense'];

  router.get('/api/attachments/verify-matches', requireNBI, async (req, res) => {
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

  router.get('/api/attachments/entity/:type/:id', async (req, res) => {
    if (!VALID_ENTITY_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Invalid entity type' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid entity ID' });
    const { rows } = await pool.query(
      'SELECT * FROM attachments WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [req.params.type, req.params.id]
    );
    res.json(rows);
  });

  router.post('/api/attachments/entity/:type/:id', upload.single('file'), async (req, res) => {
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

  router.get('/api/attachments/download/:filename', (req, res) => {
    const filePath = path.resolve(uploadDir, req.params.filename);
    if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) return res.status(403).json({ error: 'Forbidden' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath);
  });

  router.get('/api/attachments/:filename', (req, res) => {
    const filePath = path.resolve(uploadDir, req.params.filename);
    if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    const ext = path.extname(filePath).toLowerCase();
    const safeInline = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!safeInline.includes(ext)) {
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath);
  });

  router.delete('/api/attachments/verify-matches', requireNBI, async (req, res) => {
    const result = await pool.query("DELETE FROM attachments WHERE uploaded_by LIKE '%verify match%'");
    res.json({ ok: true, deleted: result.rowCount });
  });

  router.patch('/api/attachments/:id/confirm', requireNBI, async (req, res) => {
    const { rows } = await pool.query(
      "UPDATE attachments SET uploaded_by = REPLACE(uploaded_by, ' - verify match', '') WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
    res.json(rows[0]);
  });

  router.patch('/api/attachments/:id/reassign', requireNBI, async (req, res) => {
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

  router.delete('/api/attachments/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid attachment ID' });
    const { rows } = await pool.query('SELECT filename, link_url, uploaded_by FROM attachments WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
    const row = rows[0];
    const isAdmin = req.user.role === 'admin';
    const isUploader = row.uploaded_by && row.uploaded_by === req.user.displayName;
    if (!isAdmin && !isUploader) {
      return res.status(403).json({ error: 'Only the uploader or an admin can delete this attachment' });
    }
    if (!row.link_url && row.filename) {
      const filePath = path.resolve(uploadDir, row.filename);
      if (filePath.startsWith(path.resolve(uploadDir) + path.sep) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM attachments WHERE id = $1', [req.params.id]);
    await auditLog('attachment', req.params.id, 'delete', req.user?.displayName);
    res.json({ ok: true });
  });

  router.post('/api/attachments/entity/:type/:id/link', async (req, res) => {
    if (!VALID_ENTITY_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Invalid entity type' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid entity ID' });
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
       VALUES ($1,$2,NULL,NULL,NULL,'link',$3,$4,$5) RETURNING *`,
      [req.params.type, req.params.id, req.user?.displayName || 'unknown', linkUrl, linkTitle]
    );
    await auditLog('attachment', rows[0].id, 'create_link', req.user?.displayName, { entity_type: req.params.type, entity_id: req.params.id, url: linkUrl });
    res.status(201).json(rows[0]);
  });

  router.post('/api/tasks/:id/attachments/link', async (req, res) => {
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

  return router;
};
```

- [ ] **Step 2: Remove attachments block from `server.js` and add mount line**

Remove from `server.js`: everything from `// ==================== UNIVERSAL ATTACHMENTS ====================` through the closing `});` of `POST /api/tasks/:id/attachments/link` (just before `// ==================== CALENDAR EVENTS ====================`).

Also remove the `const VALID_ENTITY_TYPES` line that was at the top of that block.

Add to the modular routes block:

```javascript
app.use(require('./routes/attachments')({ pool, requireAdmin, requireNBI, upload, log, isValidUuid, auditLog, requireTaskAccess, uploadDir }));
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 387 pass.

---

## Task 4: Create `routes/calendar.js`

**Files:**
- Create: `routes/calendar.js`
- Modify: `server.js` (remove calendar block, add mount line)

The calendar block includes constants, a helper function (`buildCalendarVisibilityClause`), and the 5 CRUD routes. The helper function must live inside the route factory so it can access `pool` and `log` from `ctx`.

- [ ] **Step 1: Create `routes/calendar.js`**

```javascript
module.exports = function(ctx) {
  const router = require('express').Router();
  const {
    pool, requireAdmin, isValidUuid, auditLog, log,
  } = ctx;

  const VALID_EVENT_TYPES = ['vacation', 'sick_leave', 'bank_holiday', 'firm_closed', 'uto', 'business', 'other'];
  const ADMIN_ONLY_EVENT_TYPES = ['firm_closed'];
  const VALID_EVENT_VISIBILITY = ['private', 'team', 'client', 'public'];

  async function buildCalendarVisibilityClause(req, startParamIdx) {
    if (req.user?.role === 'admin') return { clause: 'TRUE', params: [], nextIdx: startParamIdx };
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
    params.push(req.user?.id || null);
    const ownerIdx = i++;
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

  router.get('/api/calendar-events', async (req, res) => {
    const { from, to } = req.query;
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!from || !to || !dateRe.test(from) || !dateRe.test(to)) {
      return res.status(400).json({ error: 'from and to (YYYY-MM-DD) are required' });
    }
    try {
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
      if (req.query.team_id) {
        if (!isValidUuid(req.query.team_id)) return res.status(400).json({ error: 'Invalid team_id' });
        try {
          const memberRows = await pool.query(
            'SELECT user_id FROM team_members WHERE team_id = $1',
            [req.query.team_id]
          );
          const memberIds = memberRows.rows.map(r => r.user_id);
          if (memberIds.length === 0) {
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

  router.get('/api/calendar-events/:id', async (req, res) => {
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

  router.post('/api/calendar-events', async (req, res) => {
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
      userId = null;
    } else if (req.body?.user_id && req.body.user_id !== userId) {
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

  router.patch('/api/calendar-events/:id', async (req, res) => {
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

  router.delete('/api/calendar-events/:id', async (req, res) => {
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

  return router;
};
```

- [ ] **Step 2: Remove calendar block from `server.js` and add mount line**

Remove from `server.js`: everything from the comment block starting `// ==================== CALENDAR EVENTS ====================` (including the `firm_closed` comment above the constants) through `app.delete('/api/calendar-events/:id'` closing `});` (just before `// ==================== CLIENTS ====================`).

This includes: the `VALID_EVENT_TYPES`, `ADMIN_ONLY_EVENT_TYPES`, `VALID_EVENT_VISIBILITY` consts, the `buildCalendarVisibilityClause` function, and all 5 route handlers.

Add to the modular routes block:

```javascript
app.use(require('./routes/calendar')({ pool, requireAdmin, isValidUuid, auditLog, log }));
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 387 pass.

---

## Task 5: Create `routes/clients.js`

**Files:**
- Create: `routes/clients.js`
- Modify: `server.js` (remove clients block, add mount line)

Note: `validateLength` is needed by `POST /api/clients`. The `buildPatchQuery` helper is needed for `PATCH /api/clients/:id`.

- [ ] **Step 1: Create `routes/clients.js`**

```javascript
module.exports = function(ctx) {
  const router = require('express').Router();
  const {
    pool, requireAdmin, getClientScopes, isValidUuid,
    auditLog, log, validateLength, buildPatchQuery,
  } = ctx;

  router.get('/api/clients', async (req, res) => {
    const scopes = await getClientScopes(req);
    if (scopes) {
      const { rows } = await pool.query(
        `SELECT c.*, COALESCE(tc.cnt, 0)::int as task_count
         FROM clients c
         LEFT JOIN (SELECT client_id, count(*) as cnt FROM tasks GROUP BY client_id) tc ON tc.client_id = c.id
         WHERE c.id = ANY($1) ORDER BY c.name`,
        [scopes]
      );
      return res.json(rows);
    }
    const { rows } = await pool.query(`
      SELECT c.*, COALESCE(tc.cnt, 0)::int as task_count
      FROM clients c
      LEFT JOIN (SELECT client_id, count(*) as cnt FROM tasks GROUP BY client_id) tc ON tc.client_id = c.id
      ORDER BY c.name
    `);
    res.json(rows);
  });

  router.get('/api/clients/:id', async (req, res) => {
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

  router.post('/api/clients', requireAdmin, async (req, res) => {
    const { name, description, founded, headquarters, employees, revenue, website, linkedin_company, nbi_relationship, sector, studio_size, contract_value, current_studio_project, abbreviation, practice_area } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const lenErr = validateLength(name, 'name');
    if (lenErr) return res.status(400).json({ error: lenErr });
    const VALID_PRACTICES = ['gaming', 'organisational_performance'];
    if (!practice_area || !VALID_PRACTICES.includes(practice_area)) {
      return res.status(400).json({ error: `practice_area is required and must be one of: ${VALID_PRACTICES.join(', ')}` });
    }
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

  router.patch('/api/clients/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
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

  router.post('/api/clients/:id/research', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    const { rows: clientRows } = await pool.query('SELECT id, name, website FROM clients WHERE id = $1', [req.params.id]);
    if (clientRows.length === 0) return res.status(404).json({ error: 'Client not found' });
    const client = clientRows[0];

    const result = {
      researched: true,
      fields: {},
      unverified: [],
      note: 'Research pipeline not yet integrated with search API. No fields populated. This is a v1 placeholder that keeps the API stable for frontend integration.',
      inputs: { name: client.name, website: client.website || null },
      ranAt: new Date().toISOString(),
      ranBy: req.user?.displayName || 'unknown'
    };

    try {
      await pool.query(
        'UPDATE clients SET research_data = $1, research_updated_at = NOW(), updated_at = NOW() WHERE id = $2',
        [JSON.stringify(result), req.params.id]
      );
      await auditLog('client', req.params.id, 'research', req.user?.displayName || 'unknown', { fieldsCount: Object.keys(result.fields).length, placeholder: true });
    } catch (e) {
      log('error', 'ClientResearch', 'Failed to persist research result', { error: e.message, clientId: req.params.id });
    }

    res.json(result);
  });

  router.delete('/api/clients/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    await pool.query('UPDATE tasks SET client_id = NULL, updated_at = NOW() WHERE client_id = $1', [req.params.id]);
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  return router;
};
```

- [ ] **Step 2: Remove clients block from `server.js` and add mount line**

Remove from `server.js`: everything from `// ==================== CLIENTS ====================` through the closing `});` of `DELETE /api/clients/:id` (just before `// ==================== MILESTONES ====================`).

Add to the modular routes block:

```javascript
app.use(require('./routes/clients')({ pool, requireAdmin, getClientScopes, isValidUuid, auditLog, log, validateLength, buildPatchQuery }));
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 387 pass.

---

## Task 6: Create `routes/milestones.js`

**Files:**
- Create: `routes/milestones.js`
- Modify: `server.js` (remove milestones block, add mount line)

- [ ] **Step 1: Create `routes/milestones.js`**

```javascript
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, isValidUuid } = ctx;

  router.get('/api/clients/:clientId/milestones', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { clientId } = req.params;
    if (!isValidUuid(clientId)) return res.status(400).json({ error: 'Invalid client ID' });

    const { rows } = await pool.query(
      `SELECT m.*,
              COALESCE(array_agg(mi.task_id) FILTER (WHERE mi.task_id IS NOT NULL), '{}') AS linked_item_ids
       FROM milestones m
       LEFT JOIN milestone_items mi ON mi.milestone_id = m.id
       WHERE m.client_id = $1
       GROUP BY m.id
       ORDER BY m.target_date ASC`,
      [clientId]
    );
    res.json(rows);
  });

  router.post('/api/clients/:clientId/milestones', requireAdmin, async (req, res) => {
    const { clientId } = req.params;
    if (!isValidUuid(clientId)) return res.status(400).json({ error: 'Invalid client ID' });
    const { title, description, target_date, linked_item_ids } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    if (!target_date) return res.status(400).json({ error: 'target_date is required' });

    const client = await pool.query('SELECT id FROM clients WHERE id = $1', [clientId]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Client not found' });

    const { rows } = await pool.query(
      `INSERT INTO milestones (client_id, title, description, target_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [clientId, title.trim(), description || '', target_date]
    );
    const ms = rows[0];

    if (Array.isArray(linked_item_ids) && linked_item_ids.length > 0) {
      const values = linked_item_ids.map((tid, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO milestone_items (milestone_id, task_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [ms.id, ...linked_item_ids]
      );
    }

    ms.linked_item_ids = linked_item_ids || [];
    res.status(201).json(ms);
  });

  router.put('/api/milestones/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid milestone ID' });

    const existing = await pool.query('SELECT * FROM milestones WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });

    const { title, description, target_date, linked_item_ids } = req.body;
    const updates = [];
    const vals = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); vals.push(title.trim()); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); vals.push(description); }
    if (target_date !== undefined) { updates.push(`target_date = $${idx++}`); vals.push(target_date); }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      vals.push(id);
      await pool.query(`UPDATE milestones SET ${updates.join(', ')} WHERE id = $${idx}`, vals);
    }

    if (Array.isArray(linked_item_ids)) {
      await pool.query('DELETE FROM milestone_items WHERE milestone_id = $1', [id]);
      if (linked_item_ids.length > 0) {
        const values = linked_item_ids.map((tid, i) => `($1, $${i + 2})`).join(', ');
        await pool.query(
          `INSERT INTO milestone_items (milestone_id, task_id) VALUES ${values} ON CONFLICT DO NOTHING`,
          [id, ...linked_item_ids]
        );
      }
    }

    const { rows } = await pool.query(
      `SELECT m.*,
              COALESCE(array_agg(mi.task_id) FILTER (WHERE mi.task_id IS NOT NULL), '{}') AS linked_item_ids
       FROM milestones m
       LEFT JOIN milestone_items mi ON mi.milestone_id = m.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [id]
    );
    res.json(rows[0]);
  });

  router.delete('/api/milestones/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid milestone ID' });

    const result = await pool.query('DELETE FROM milestones WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.status(204).end();
  });

  return router;
};
```

- [ ] **Step 2: Remove milestones block from `server.js` and add mount line**

Remove from `server.js`: everything from `// ==================== MILESTONES ====================` through the closing `});` of `DELETE /api/milestones/:id` (just before `// ==================== SOWs ====================`).

Add to the modular routes block:

```javascript
app.use(require('./routes/milestones')({ pool, requireAdmin, isValidUuid }));
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 387 pass.

---

## Task 7: Create `routes/sows.js`

**Files:**
- Create: `routes/sows.js`
- Modify: `server.js` (remove sows block, add mount line)

The sows block has a local multer instance (`sowUpload`) and requires `./lib/sow-extractor`. Both must move into the route file. Note: `multer` itself is a separate `require` at module level here (not passed through `ctx` — we only pass the `upload` disk-storage instance for attachments). For sows we instantiate our own memory-storage multer inside the file.

- [ ] **Step 1: Create `routes/sows.js`**

```javascript
const multer = require('multer');

module.exports = function(ctx) {
  const router = require('express').Router();
  const {
    pool, requireAdmin, isValidUuid, log, auditLog, validateLength, buildPatchQuery,
  } = ctx;

  const { extractWorkPackage } = require('../lib/sow-extractor');

  const sowUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') return cb(null, true);
      cb(new Error('Only PDF files are accepted for SoW upload'));
    }
  });

  router.get('/api/sows', async (req, res) => {
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

  router.get('/api/sows/:id', async (req, res) => {
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

  router.post('/api/sows', requireAdmin, async (req, res) => {
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

  router.post('/api/sows/upload', requireAdmin, (req, res, next) => {
    sowUpload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
      next();
    });
  }, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are accepted' });
    }
    const { client_id, title, force } = req.body || {};
    if (!client_id || !isValidUuid(client_id)) {
      return res.status(400).json({ error: 'Valid client_id required' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title required' });
    }
    const lenErr = validateLength(title, 'title');
    if (lenErr) return res.status(400).json({ error: lenErr });

    const skipFilter = force === 'true' || force === true;
    let extracted;
    try {
      extracted = await extractWorkPackage(req.file.buffer);
    } catch (e) {
      log('error', 'SoW', 'Extraction failed', { error: e.message, client_id, title: title.trim() });
      return res.status(400).json({ error: 'Failed to parse PDF: ' + e.message });
    } finally {
      if (req.file) req.file.buffer = null;
    }

    if (skipFilter && extracted && extracted.rawText) {
      extracted.text = extracted.rawText;
      extracted.stats = { ...extracted.stats, forced: true };
    }

    if (!extracted || !extracted.text || !extracted.text.trim()) {
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
        canForce: filteredCount > 0,
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
      res.status(201).json({ ...created, extraction_stats: extracted.stats || {} });
    } catch (e) {
      log('error', 'SoW', 'Failed to insert SoW', {
        error: e.message,
        client_id,
        title: title.trim(),
        uploader: req.user.displayName
      });
      res.status(500).json({ error: 'An internal error occurred saving the SoW' });
    }
  });

  router.patch('/api/sows/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid SoW ID' });
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

  router.delete('/api/sows/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid SoW ID' });
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

  return router;
};
```

- [ ] **Step 2: Remove sows block from `server.js` and add mount line**

Remove from `server.js`: everything from `// ==================== SOWs ====================` through the closing `});` of `DELETE /api/sows/:id` (just before `// ==================== TEAMS ====================`).

This includes: the `const { extractWorkPackage }` require, the `sowUpload` multer instance, and all 6 route handlers.

Add to the modular routes block:

```javascript
app.use(require('./routes/sows')({ pool, requireAdmin, isValidUuid, log, auditLog, validateLength, buildPatchQuery }));
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 387 pass.

---

## Task 8: Create `routes/teams.js`

**Files:**
- Create: `routes/teams.js`
- Modify: `server.js` (remove teams block, add mount line)

- [ ] **Step 1: Create `routes/teams.js`**

```javascript
module.exports = function(ctx) {
  const router = require('express').Router();
  const {
    pool, requireAdmin, isValidUuid, auditLog, log, validateLength, buildPatchQuery,
  } = ctx;

  const VALID_TEAM_ROLES = ['lead', 'member'];

  router.get('/api/teams', async (req, res) => {
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

  router.get('/api/teams/:id', async (req, res) => {
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

  router.post('/api/teams', requireAdmin, async (req, res) => {
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

  router.patch('/api/teams/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    if ('name' in req.body && !String(req.body.name || '').trim()) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }
    if (req.body.client_id && !isValidUuid(req.body.client_id)) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }
    if (req.body.sow_id && !isValidUuid(req.body.sow_id)) {
      return res.status(400).json({ error: 'Invalid sow_id' });
    }
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

  router.delete('/api/teams/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
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

  router.post('/api/teams/:id/members', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    const { user_id, role } = req.body || {};
    if (!user_id || !isValidUuid(user_id)) return res.status(400).json({ error: 'Valid user_id required' });
    const memberRole = role && VALID_TEAM_ROLES.includes(role) ? role : 'member';
    try {
      const { rows: teamRows } = await pool.query('SELECT id FROM teams WHERE id = $1', [req.params.id]);
      if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });
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

  router.patch('/api/teams/:id/members/:user_id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    if (!isValidUuid(req.params.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
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

  router.delete('/api/teams/:id/members/:user_id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    if (!isValidUuid(req.params.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
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

  return router;
};
```

- [ ] **Step 2: Remove teams block from `server.js` and add mount line**

Remove from `server.js`: everything from `// ==================== TEAMS ====================` through the closing `});` of `DELETE /api/teams/:id/members/:user_id` (just before `// ==================== CONTACTS ====================`).

This includes the `const VALID_TEAM_ROLES` constant and all 8 route handlers.

Add to the modular routes block:

```javascript
app.use(require('./routes/teams')({ pool, requireAdmin, isValidUuid, auditLog, log, validateLength, buildPatchQuery }));
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 387 pass.

---

## Task 9: Wire `routes/auth.js` into `server.js`

`routes/auth.js` was written earlier but not yet wired in. The auth routes currently still exist in `server.js` (lines ~262–561). This task removes them and adds the mount.

**Important:** The auth routes straddle a structural boundary. The pre-auth routes (login, logout, me, forgot-password, reset-token) are public (no `requireAuth`). The post-auth routes (reset-password, clear-lockout, change-password) appear **after** `app.use(requireAuth)` at line ~485. The route file handles this correctly since `requireAdmin` is passed through ctx and applied per-handler.

There is also a `// All routes below this line require a valid auth token` + `app.use(requireAuth)` line at ~484–485 that must be **kept in server.js**.

- [ ] **Step 1: Remove auth block from `server.js`**

In `server.js`, remove:
- The comment block `// ==================== AUTH ====================` and the JSDoc above `app.post('/api/auth/login'`
- All 9 route handlers: login, logout, me, forgot-password, reset-token GET, reset-token POST, reset-password, clear-lockout, change-password
- Do NOT remove: `// All routes below this line require a valid auth token`, `app.use(requireAuth)`, the news proxy block, or the internal notifications endpoint

- [ ] **Step 2: Add auth mount line (before `requireAuth`)**

The auth router must be mounted **before** `app.use(requireAuth)` so the public endpoints (login, forgot-password, reset-token) work without authentication.

Add this line immediately before `// All routes below this line require a valid auth token`:

```javascript
app.use(require('./routes/auth')({
  pool, log, hashToken, escHtml,
  cacheToken, invalidateToken, clearTokenCache,
  SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS, getSessionCookieOpts, getCookieToken,
  FAILED_LOGIN_THRESHOLD, FAILED_LOGIN_LOCKOUT, LOCKOUT_DURATION,
  getFailedLogins, recordFailedLogin, clearFailedLogins,
  sendEmailAsync, EMAIL_FROM, APP_URL, _msalClient,
  authFailures, requireAdmin,
}));
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 387 pass.

---

## Task 10: Final verification

- [ ] **Step 1: Run the full test suite one last time**

```bash
npm test
```

Expected: exactly 387 tests pass, 0 failures, 0 skipped.

- [ ] **Step 2: Verify server.js is shorter**

```bash
wc -l "D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server/dashboard-server/server.js"
```

Expected: noticeably fewer than 9134 lines (roughly ~7900–8100 after extracting ~1100+ lines).

- [ ] **Step 3: Verify all 18 route files exist**

```bash
ls "D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server/dashboard-server/routes/"
```

Expected: `auth.js attachments.js calendar.js client-notes.js clients.js contacts.js finance.js milestones.js notifications.js queue.js settings.js slack.js sows.js teams.js templates.js time-entries.js time-off.js users.js`

- [ ] **Step 4: Report to Glen — do NOT commit**

Glen reviews the diff before committing.

---

## Self-Review

**Spec coverage:**
- auth.js: already written — covered by Task 9 (wire-in only)
- users.js: Task 2 covers all 7 routes including the distant skills PATCH
- attachments.js: Task 3 covers all 10 routes including the task-alias link route
- calendar.js: Task 4 covers all 5 routes plus the visibility helper function
- clients.js: Task 5 covers all 6 routes
- milestones.js: Task 6 covers all 4 routes
- sows.js: Task 7 covers all 6 routes including the memory-upload path
- teams.js: Task 8 covers all 8 routes
- server.js cleanup: each task removes its block and adds a mount line
- Final green test run: Task 10

**Placeholder scan:** No TBDs, TODOs, or vague instructions. Every step has the exact code to write.

**Type consistency:** All ctx destructuring names match the names used in server.js and the existing route files. `buildPatchQuery`, `validateLength`, `isValidUuid`, `auditLog` are all consistent with existing patterns in `routes/client-notes.js`, `routes/finance.js`, etc.

**Ordering concern:** Attachments (Task 3) must be mounted **after** `requireAuth` because it uses `req.user`. The existing modular routes block is already after `app.use(requireAuth)` — new mount lines go in the same block. Auth (Task 9) is the only one mounted **before** `requireAuth`.
