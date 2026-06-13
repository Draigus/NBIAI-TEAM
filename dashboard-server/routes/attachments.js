const fs = require('fs');
const path = require('path');

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, requireNBI, upload, log, isValidUuid, auditLog, requireTaskAccess } = ctx;

  const uploadDir = path.join(__dirname, '..', 'uploads');

  const VALID_ENTITY_TYPES = ['client', 'project', 'task', 'lead', 'expense'];

  /**
   * Client-scoping guard (security fix 2026-06-12). NBI users are unrestricted.
   * Client users may only touch attachments on entities owned by their client:
   *   - task/project: ownership via the root ancestor's client_id (requireTaskAccess walk)
   *   - client: must be their own client id
   *   - lead/expense: NBI-internal, always denied for client users
   * Returns true if allowed; otherwise sends the error response and returns false.
   */
  async function checkEntityAccess(req, res, entityType, entityId) {
    if (!req.user || !req.user.clientId) return true;
    if (entityType === 'task' || entityType === 'project') {
      return requireTaskAccess(req, res, entityId);
    }
    if (entityType === 'client') {
      if (entityId !== req.user.clientId) { res.status(403).json({ error: 'Access denied' }); return false; }
      return true;
    }
    res.status(403).json({ error: 'Access denied' });
    return false;
  }

  /**
   * File-serving guard for client users: the filename must belong to an
   * attachments row on an entity within their client scope. Unknown filenames
   * are denied for client users (files outside the attachments table are
   * NBI-internal, e.g. expense receipts).
   */
  async function checkFileAccess(req, res, filename) {
    if (!req.user || !req.user.clientId) return true;
    const { rows } = await pool.query('SELECT entity_type, entity_id FROM attachments WHERE filename = $1 LIMIT 1', [filename]);
    if (rows.length > 0) return checkEntityAccess(req, res, rows[0].entity_type, rows[0].entity_id);
    // Legacy task_attachments rows (pre-universal-table uploads) are still
    // served from the same uploads dir — scope them via their task.
    const { rows: legacy } = await pool.query('SELECT task_id FROM task_attachments WHERE filename = $1 LIMIT 1', [filename]);
    if (legacy.length > 0) return checkEntityAccess(req, res, 'task', legacy[0].task_id);
    res.status(403).json({ error: 'Access denied' });
    return false;
  }

  /** GET /api/attachments/verify-matches — List all auto-matched email attachments needing verification */
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

  /** GET /api/attachments/entity/:type/:id — List all attachments for an entity */
  router.get('/api/attachments/entity/:type/:id', async (req, res) => {
    if (!VALID_ENTITY_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Invalid entity type' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid entity ID' });
    if (!(await checkEntityAccess(req, res, req.params.type, req.params.id))) return;
    const { rows } = await pool.query(
      'SELECT * FROM attachments WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [req.params.type, req.params.id]
    );
    res.json(rows);
  });

  /** POST /api/attachments/entity/:type/:id — Upload a file attachment to an entity */
  router.post('/api/attachments/entity/:type/:id', upload.single('file'), async (req, res) => {
    if (!VALID_ENTITY_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Invalid entity type' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid entity ID' });
    if (!(await checkEntityAccess(req, res, req.params.type, req.params.id))) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) { /* best effort */ } }
      return;
    }
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { rows } = await pool.query(
      `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.type, req.params.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.user?.displayName || 'unknown']
    );
    res.status(201).json(rows[0]);
  });

  /** GET /api/attachments/download/:filename — Download an attachment file (with path traversal protection) */
  router.get('/api/attachments/download/:filename', async (req, res) => {
    if (!(await checkFileAccess(req, res, req.params.filename))) return;
    const filePath = path.resolve(uploadDir, req.params.filename);
    if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) return res.status(403).json({ error: 'Forbidden' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath);
  });

  /** DELETE /api/attachments/verify-matches — Bulk-delete all auto-matched email attachments needing verification */
  router.delete('/api/attachments/verify-matches', requireNBI, async (req, res) => {
    const result = await pool.query("DELETE FROM attachments WHERE uploaded_by LIKE '%verify match%'");
    res.json({ ok: true, deleted: result.rowCount });
  });

  /** PATCH /api/attachments/:id/confirm — Confirm an auto-matched email attachment (remove verify flag) */
  router.patch('/api/attachments/:id/confirm', requireNBI, async (req, res) => {
    const { rows } = await pool.query(
      "UPDATE attachments SET uploaded_by = REPLACE(uploaded_by, ' - verify match', '') WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
    res.json(rows[0]);
  });

  /** PATCH /api/attachments/:id/reassign — Move an attachment to a different entity */
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

  /** DELETE /api/attachments/:id — Remove an attachment record. Admin or the uploader only. */
  router.delete('/api/attachments/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid attachment ID' });
    const { rows } = await pool.query('SELECT filename, link_url, uploaded_by, entity_type, entity_id FROM attachments WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
    const row = rows[0];
    // Client users must also be in scope for the owning entity (a display-name
    // match on uploaded_by alone must not allow cross-client deletes)
    if (!(await checkEntityAccess(req, res, row.entity_type, row.entity_id))) return;
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
   * Attach a link (URL) to any entity instead of a file.
   */
  router.post('/api/attachments/entity/:type/:id/link', async (req, res) => {
    if (!VALID_ENTITY_TYPES.includes(req.params.type)) return res.status(400).json({ error: 'Invalid entity type' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid entity ID' });
    if (!(await checkEntityAccess(req, res, req.params.type, req.params.id))) return;
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

  /** GET /api/attachments/:filename — Serve an uploaded file. Path traversal is prevented.
   *  IMPORTANT: This catch-all must be defined AFTER specific /api/attachments/* routes. */
  router.get('/api/attachments/:filename', async (req, res) => {
    if (!(await checkFileAccess(req, res, req.params.filename))) return;
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

  return router;
};
