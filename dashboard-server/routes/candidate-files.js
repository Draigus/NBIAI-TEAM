'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid, auditLog, upload, uploadDir, fs, path } = ctx;

  /** GET /api/candidates/:id/files — list all files + URLs for a candidate. */
  router.get('/api/candidates/:id/files', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    const { rows: [candidate] } = await pool.query('SELECT id, client_id FROM candidates WHERE id = $1', [req.params.id]);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    if (req.user.clientId && candidate.client_id !== req.user.clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM candidate_files WHERE candidate_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  });

  /** POST /api/candidates/:id/files — upload a file (multipart) for a candidate. */
  router.post('/api/candidates/:id/files', upload.single('file'), async (req, res) => {
    if (!req.user) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(401).json({ error: 'Auth required' });
    }
    if (!isValidUuid(req.params.id)) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const { rows: [candidate] } = await pool.query('SELECT id, client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (!candidate) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(404).json({ error: 'Candidate not found' });
      }
      if (req.user.clientId && candidate.client_id !== req.user.clientId) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(403).json({ error: 'Access denied' });
      }

      const title = req.body.title || req.file.originalname;
      const actor = req.user.displayName || req.user.username || 'unknown';
      const { rows } = await pool.query(
        `INSERT INTO candidate_files (candidate_id, file_type, title, filename, stored_name, mime_type, size_bytes, uploaded_by)
         VALUES ($1, 'upload', $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.params.id, title, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, actor]
      );

      await pool.query(
        `INSERT INTO candidate_activity (candidate_id, event_type, detail, actor)
         VALUES ($1, 'file_uploaded', $2, $3)`,
        [req.params.id, 'Uploaded: ' + req.file.originalname, actor]
      );

      res.status(201).json(rows[0]);
    } catch (e) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch (err) {}
      log('error', 'CandidateFiles', 'Upload failed', { error: e.message });
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  /** POST /api/candidates/:id/files/url — add a URL link for a candidate. */
  router.post('/api/candidates/:id/files/url', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    const { url, title } = req.body || {};
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'url is required' });
    }

    try {
      const { rows: [candidate] } = await pool.query('SELECT id, client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
      if (req.user.clientId && candidate.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const actor = req.user.displayName || req.user.username || 'unknown';
      const safeTitle = (title && title.trim()) || url.trim();
      const { rows } = await pool.query(
        `INSERT INTO candidate_files (candidate_id, file_type, title, url, uploaded_by)
         VALUES ($1, 'url', $2, $3, $4) RETURNING *`,
        [req.params.id, safeTitle.slice(0, 500), url.trim().slice(0, 2000), actor]
      );

      await pool.query(
        `INSERT INTO candidate_activity (candidate_id, event_type, detail, actor)
         VALUES ($1, 'file_uploaded', $2, $3)`,
        [req.params.id, 'Link added: ' + safeTitle.slice(0, 200), actor]
      );

      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'CandidateFiles', 'URL add failed', { error: e.message });
      res.status(500).json({ error: 'Failed to add link' });
    }
  });

  /** GET /api/candidates/:id/files/:fileId/download — download an uploaded file. */
  router.get('/api/candidates/:id/files/:fileId/download', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.fileId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const { rows: [file] } = await pool.query(
      'SELECT cf.*, c.client_id FROM candidate_files cf JOIN candidates c ON c.id = cf.candidate_id WHERE cf.id = $1 AND cf.candidate_id = $2',
      [req.params.fileId, req.params.id]
    );
    if (!file) return res.status(404).json({ error: 'Not found' });
    if (file.file_type !== 'upload') return res.status(400).json({ error: 'Not a file upload' });
    if (req.user.clientId && file.client_id !== req.user.clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join(uploadDir, path.basename(file.stored_name));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing from disk' });

    res.setHeader('Content-Disposition', 'attachment; filename="' + (file.filename || 'download').replace(/"/g, '') + '"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(path.resolve(filePath));
  });

  /** DELETE /api/candidates/:id/files/:fileId — remove a file or URL. */
  router.delete('/api/candidates/:id/files/:fileId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.fileId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const { rows: [file] } = await pool.query(
      'SELECT cf.*, c.client_id FROM candidate_files cf JOIN candidates c ON c.id = cf.candidate_id WHERE cf.id = $1 AND cf.candidate_id = $2',
      [req.params.fileId, req.params.id]
    );
    if (!file) return res.status(204).end();
    if (req.user.clientId && file.client_id !== req.user.clientId) {
      return res.status(204).end();
    }

    await pool.query('DELETE FROM candidate_files WHERE id = $1', [req.params.fileId]);

    if (file.file_type === 'upload' && file.stored_name) {
      const filePath = path.join(uploadDir, path.basename(file.stored_name));
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
    }

    res.status(204).end();
  });

  return router;
};
