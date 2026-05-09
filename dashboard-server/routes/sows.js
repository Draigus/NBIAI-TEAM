const fs = require('fs');
const path = require('path');

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, isValidUuid, upload, auditLog, log, validateLength } = ctx;

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

  const { extractWorkPackage } = require('../lib/sow-extractor');
  const multer = require('multer');

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
   */
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

  /** GET /api/sows/:id — Single SoW including the full filtered work_package_text */
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

  /**
   * POST /api/sows — Create a SoW manually (no file upload).
   * Admin only.
   */
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

  /**
   * POST /api/sows/upload — Upload a SoW PDF, extract & filter, persist text only.
   * Admin only.
   */
  router.post('/api/sows/upload', requireAdmin, (req, res, next) => {
    // Wrap multer to surface fileFilter / size errors as JSON
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
      // Drop the buffer immediately — never keep the original file in memory
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
      // Return without work_package_text (client fetches via GET /api/sows/:id)
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

  /**
   * PATCH /api/sows/:id — Update SoW metadata.
   * work_package_text is intentionally NOT updatable via PATCH. Admin only.
   */
  router.patch('/api/sows/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid SoW ID' });
    const { updates, vals, nextIdx } = ctx.buildPatchQuery(req.body, ['title', 'start_date', 'end_date', 'status']);
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
