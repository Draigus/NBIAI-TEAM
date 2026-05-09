// routes/documents.js — /api/documents/* routes
// Deps: pool, log, requireAdmin, isValidUuid, auditLog, upload, fs, path, getClientScope
// Also exports extractLinksFromHtml (used by inbound-email cron and tests via server.js re-export)

'use strict';

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

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid, auditLog, upload, fs, path, getClientScope } = ctx;

  const { redactNbiInternal, extractPlainText, imageInScope, extractImageFilenames } = require('../lib/redact-nbi-internal');
  const { buildPatchQuery } = require('../lib/helpers');
  const multer = require('multer');
  const crypto = require('crypto');

  const uploadDir = path.join(__dirname, '..', 'uploads');

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

  /** GET /api/documents?client_id=:uuid
   *  Return the page tree for a client.
   *  NBI users see all pages; client portal users see only visibility='all' rows.
   *  nbiInternalBlock content is stripped from body_json before send for client users.
   *  Client users with docs_view=false receive 403. */
  router.get('/api/documents', async (req, res) => {
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
  router.get('/api/documents/:id', async (req, res) => {
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
  router.patch('/api/documents/:id', async (req, res) => {
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

    // I1: Atomic optimistic-concurrency check.
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

    // M1: If zero rows updated, distinguish concurrent-write conflict from deletion.
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

    // G1: attachment orphan reconciliation.
    if (req.body.body_json !== undefined) {
      try {
        const newFilenames = extractImageFilenames(req.body.body_json);
        const { rows: existingAtts } = await pool.query(
          `SELECT id, stored_name, orphaned_at FROM document_attachments WHERE document_id = $1`,
          [req.params.id]
        );
        const referencedIds   = existingAtts.filter(a => newFilenames.has(a.stored_name)).map(a => a.id);
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

    // D1: emit fresh ETag from the new updated_at
    res.set('ETag', `W/"${doc.updated_at.toISOString()}"`);
    res.json(doc);
  });

  /** DELETE /api/documents/:id
   *  Delete a page. Cascade to child pages is handled by FK ON DELETE CASCADE
   *  on parent_id. Returns 204 whether the doc existed or not (idempotent). */
  router.delete('/api/documents/:id', async (req, res) => {
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

    // G1: unlink files post-DELETE. Best-effort.
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
  router.post('/api/documents/:id/move', async (req, res) => {
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

  /** POST /api/documents/:id/attachments
   *  Upload an image into a document. Returns the new attachment row + url. */
  router.post('/api/documents/:id/attachments', (req, res, next) => {
    // Wrap multer to surface fileFilter / size-limit errors as JSON 400/413
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
    if (!req.user) {
      if (req.file) cleanupDocUpload(req.file.path);
      return res.status(401).json({ error: 'Auth required' });
    }

    if (!isValidUuid(req.params.id)) {
      if (req.file) cleanupDocUpload(req.file.path);
      return res.status(400).json({ error: 'Invalid id' });
    }

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
      if (doc.visibility === 'nbi_only') {
        cleanupDocUpload(req.file.path);
        return res.status(404).json({ error: 'Not found' });
      }
      if (req.user.clientId !== doc.client_id) {
        cleanupDocUpload(req.file.path);
        return res.status(404).json({ error: 'Not found' });
      }
      if (req.user.docsUpload === false) {
        cleanupDocUpload(req.file.path);
        return res.status(403).json({ error: 'No doc-upload permission' });
      }
    }

    // Persist the attachment row.
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
   *  Serve a document image file. */
  router.get('/api/documents/:id/attachments/:filename', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

    // Path traversal check
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
   *  Create a new page. */
  router.post('/api/documents', async (req, res) => {
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

  return router;
};

// Export helper so server.js can re-export it for tests
module.exports.extractLinksFromHtml = extractLinksFromHtml;
