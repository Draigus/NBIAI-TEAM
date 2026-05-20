'use strict';

const fs = require('fs');
const path = require('path');

module.exports = function (ctx) {
  const router = require('express').Router();
  const {
    pool, log, requireAdmin, requireNBI,
    isValidUuid, validateLength, auditLog,
    upload, uploadDir,
    shiftForInsert, reorderInGroup,
    buildPatchQuery,
  } = ctx;

  // ==================== HIRING ====================
  //
  // The Hiring page tracks job candidates against client hiring positions.
  // Two related resources:
  //   - hiring_positions: a role NBI is helping a client fill (admin-managed)
  //   - candidates:       a person being considered for that role (any user
  //                       can create / update; only admins may delete)
  //
  // Candidates carry a kanban "stage" (sourced -> screening -> interview ->
  // offer -> hired/rejected). Each candidate may have a CV file uploaded;
  // the file lives in /uploads (same as task attachments) and is referenced
  // from candidates.cv_filename.

  // Glen's 8-stage process (bug b7a2f97f, migration 024). Linear process from
  // Find Candidate to Hired. Rejected is no longer a stage — use archived_at
  // on the row instead to take a candidate out of pipeline.
  const HIRING_STAGES = [
    'sourcing',
    'interviews',
    'offer',
    'onboarding',
    'onboarded',
  ];

  const VALID_SOURCES = ['referral', 'linkedin', 'inbound', 'agency', 'job-board', 'internal', 'other'];
  const VALID_EMPLOYMENT_TYPES = ['permanent', 'contract', 'freelance'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateAndNormaliseTags(tags) {
    if (!Array.isArray(tags)) return { error: 'tags must be an array' };
    const normalised = [...new Set(
      tags.map(t => typeof t === 'string' ? t.trim().toLowerCase() : '')
          .filter(t => t.length > 0)
    )];
    if (normalised.length > 20) return { error: 'Maximum 20 tags allowed' };
    const tooLong = normalised.find(t => t.length > 50);
    if (tooLong) return { error: 'Each tag must be 50 characters or fewer' };
    return { value: normalised };
  }

  /** GET /api/hiring-positions — List hiring positions, optionally filtered by client.
   *  Client users are auto-scoped to their own client_id. */
  router.get('/api/hiring-positions', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const scopedClientId = req.user.clientId || null;
    const { client_id } = req.query;
    const filterClientId = scopedClientId || client_id || null;
    let where = '';
    let vals = [];
    if (filterClientId) {
      if (!isValidUuid(filterClientId)) return res.status(400).json({ error: 'Invalid client_id' });
      where = 'WHERE p.client_id = $1';
      vals = [filterClientId];
    }
    try {
      const { rows } = await pool.query(`
        SELECT p.id, p.client_id, p.sow_id, p.title, p.description, p.seniority,
               p.status, p.created_at, p.updated_at,
               p.salary_range, p.employment_type, p.location, p.interview_panel,
               p.jd_filename, p.jd_original_name,
               c.name AS client_name,
               s.title AS sow_title,
               (SELECT COUNT(*)::int FROM candidates ca WHERE ca.position_id = p.id) AS candidate_count
        FROM hiring_positions p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN sows s ON p.sow_id = s.id
        ${where}
        ORDER BY c.name NULLS LAST, p.created_at DESC
      `, vals);
      res.json(rows);
    } catch (e) {
      log('error', 'Hiring', 'Failed to list positions', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/hiring-positions — Create a hiring position (admin only) */
  router.post('/api/hiring-positions', requireNBI, requireAdmin, async (req, res) => {
    const { client_id, sow_id, title, description, seniority, status } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
    const lenErr = validateLength(title, 'title');
    if (lenErr) return res.status(400).json({ error: lenErr });
    if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    if (sow_id && !isValidUuid(sow_id)) return res.status(400).json({ error: 'Invalid sow_id' });
    if (req.body.employment_type && !VALID_EMPLOYMENT_TYPES.includes(req.body.employment_type)) {
      return res.status(400).json({ error: `Invalid employment_type. Must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}` });
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, interview_panel)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          client_id || null, sow_id || null, title.trim(), description || null,
          seniority || null, status || 'open',
          req.body.salary_range || null,
          req.body.employment_type || 'permanent',
          req.body.location || null,
          req.body.interview_panel ? JSON.stringify(req.body.interview_panel) : '[]',
        ]
      );
      await auditLog('hiring_position', rows[0].id, 'create', req.user.displayName || 'unknown', { title: title.trim() });
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'Hiring', 'Failed to create position', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** PATCH /api/hiring-positions/:id — Update a hiring position (admin only) */
  router.patch('/api/hiring-positions/:id', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
    if (req.body.employment_type && !VALID_EMPLOYMENT_TYPES.includes(req.body.employment_type)) {
      return res.status(400).json({ error: `Invalid employment_type. Must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}` });
    }
    // Stringify JSONB fields so pg driver passes them as valid jsonb parameters
    const patchBody = { ...req.body };
    if (patchBody.interview_panel !== undefined) patchBody.interview_panel = JSON.stringify(patchBody.interview_panel);
    const { updates, vals, nextIdx } = buildPatchQuery(patchBody, ['client_id', 'sow_id', 'title', 'description', 'seniority', 'status', 'salary_range', 'employment_type', 'location', 'interview_panel']);
    if (req.body.title !== undefined && !String(req.body.title).trim()) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push('updated_at = NOW()');
    vals.push(req.params.id);
    try {
      const { rows } = await pool.query(
        `UPDATE hiring_positions SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
        vals
      );
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      await auditLog('hiring_position', req.params.id, 'update', req.user.displayName || 'unknown', { fields: Object.keys(req.body) });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Hiring', 'Failed to update position', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/hiring-positions/:id/jd — Upload a Job Description (DOCX or PDF). Admin only.
   *  If a JD already exists for this position the old file is deleted from disk before
   *  the new one is stored. */
  router.post('/api/hiring-positions/:id/jd', requireNBI, requireAdmin, upload.single('file'), async (req, res) => {
    if (!isValidUuid(req.params.id)) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
      return res.status(400).json({ error: 'Invalid position ID' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ];
    const allowedExts = ['.docx', '.pdf'];
    const ext = path.extname(req.file.originalname || '').toLowerCase();
    if (!allowedMimes.includes(req.file.mimetype) || !allowedExts.includes(ext)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Only DOCX and PDF files are accepted' });
    }

    try {
      const { rows: existing } = await pool.query('SELECT jd_filename FROM hiring_positions WHERE id = $1', [req.params.id]);
      if (existing.length === 0) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(404).json({ error: 'Position not found' });
      }

      if (existing[0].jd_filename) {
        const safe = path.basename(existing[0].jd_filename);
        const oldPath = path.join(uploadDir, safe);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) {}
      }

      const { rows } = await pool.query(
        'UPDATE hiring_positions SET jd_filename = $1, jd_original_name = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [req.file.filename, req.file.originalname, req.params.id]
      );
      await auditLog('hiring_position', req.params.id, 'jd_upload', req.user.displayName || 'unknown', { filename: req.file.originalname, size: req.file.size });
      res.json(rows[0]);
    } catch (e) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (err) {} }
      log('error', 'Hiring', 'Failed to upload JD', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/hiring-positions/:id/jd/preview — Serve the JD inline in the browser.
   *  IMPORTANT: This route MUST be declared before /jd (the download route) so Express
   *  does not match "preview" as the :id segment of a nested resource. */
  router.get('/api/hiring-positions/:id/jd/preview', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
    try {
      const { rows } = await pool.query('SELECT jd_filename, jd_original_name, client_id FROM hiring_positions WHERE id = $1', [req.params.id]);
      if (rows.length === 0 || !rows[0].jd_filename) return res.status(404).json({ error: 'No job description attached' });
      if (req.user.clientId && rows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const safe = path.basename(rows[0].jd_filename);
      const filePath = path.join(uploadDir, safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'JD file missing on disk' });
      const fileExt = path.extname(safe).toLowerCase();
      const mimeMap = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      res.setHeader('Content-Type', mimeMap[fileExt] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${rows[0].jd_original_name || safe}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      log('error', 'Hiring', 'Failed to preview JD', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/hiring-positions/:id/jd — Download the JD file (attachment).
   *  Client users can only download JDs for positions belonging to their client. */
  router.get('/api/hiring-positions/:id/jd', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
    try {
      const { rows } = await pool.query('SELECT jd_filename, jd_original_name, client_id FROM hiring_positions WHERE id = $1', [req.params.id]);
      if (rows.length === 0 || !rows[0].jd_filename) return res.status(404).json({ error: 'No job description attached' });
      if (req.user.clientId && rows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const safe = path.basename(rows[0].jd_filename);
      const filePath = path.join(uploadDir, safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'JD file missing on disk' });
      const friendly = rows[0].jd_original_name || safe;
      res.download(filePath, friendly);
    } catch (e) {
      log('error', 'Hiring', 'Failed to download JD', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/hiring-positions/:id — Remove a hiring position (admin only) */
  router.delete('/api/hiring-positions/:id', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
    try {
      const { rowCount } = await pool.query('DELETE FROM hiring_positions WHERE id = $1', [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      await auditLog('hiring_position', req.params.id, 'delete', req.user.displayName || 'unknown');
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Hiring', 'Failed to delete position', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/candidates — List candidates with optional filters.
   *  Client users are auto-scoped to their own client_id. */
  router.get('/api/candidates', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const scopedClientId = req.user.clientId || null;
    const { client_id, stage, position_id } = req.query;
    const filterClientId = scopedClientId || client_id || null;
    const where = [];
    const vals = [];
    let i = 1;
    if (filterClientId) {
      if (!isValidUuid(filterClientId)) return res.status(400).json({ error: 'Invalid client_id' });
      where.push(`ca.client_id = $${i++}`); vals.push(filterClientId);
    }
    if (position_id) {
      if (!isValidUuid(position_id)) return res.status(400).json({ error: 'Invalid position_id' });
      where.push(`ca.position_id = $${i++}`); vals.push(position_id);
    }
    if (stage) {
      if (!HIRING_STAGES.includes(stage)) return res.status(400).json({ error: `Invalid stage. Must be one of: ${HIRING_STAGES.join(', ')}` });
      where.push(`ca.stage = $${i++}`); vals.push(stage);
    }
    if (req.query.retention === 'expiring') {
      if (req.user.clientId) return res.status(403).json({ error: 'Retention filter is NBI-only' });
      where.push(`ca.retention_expires_at <= NOW() + INTERVAL '30 days'`);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const commentCountSql = req.user.clientId
      ? '(SELECT COUNT(*)::int FROM candidate_comments cc WHERE cc.candidate_id = ca.id AND cc.internal = false) AS comment_count'
      : '(SELECT COUNT(*)::int FROM candidate_comments cc WHERE cc.candidate_id = ca.id) AS comment_count';
    try {
      const { rows } = await pool.query(`
        SELECT ca.id, ca.position_id, ca.client_id, ca.name, ca.role, ca.linkedin_url,
               ca.cv_filename, ca.due_date, ca.stage, ca.notes, ca.position, ca.created_at, ca.updated_at,
               ca.archived_at, ca.stage_assignees,
               ca.email, ca.source, ca.source_detail, ca.tags,
               ca.consent_given, ca.consent_date, ca.retention_expires_at,
               c.name AS client_name,
               p.title AS position_title,
               (ca.cv_filename IS NOT NULL) AS has_cv,
               ${commentCountSql}
        FROM candidates ca
        LEFT JOIN clients c ON ca.client_id = c.id
        LEFT JOIN hiring_positions p ON ca.position_id = p.id
        ${whereClause}
        ORDER BY c.name NULLS LAST, ca.created_at DESC
      `, vals);
      res.json(rows);
    } catch (e) {
      log('error', 'Hiring', 'Failed to list candidates', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/candidates/poll?since=<ISO> — Lightweight polling for multi-user sync.
   *  Returns candidates updated after the given timestamp + full ID list for deletion detection. */
  router.get('/api/candidates/poll', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const since = req.query.since;
    if (!since) return res.status(400).json({ error: 'since parameter required' });
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) return res.status(400).json({ error: 'Invalid timestamp' });

    const scopedClientId = req.user.clientId || null;
    try {
      let updatedQuery, idQuery;
      const vals = [sinceDate.toISOString()];

      if (scopedClientId) {
        vals.push(scopedClientId);
        updatedQuery = `SELECT ca.*, c.name AS client_name, p.title AS position_title, (ca.cv_filename IS NOT NULL) AS has_cv
          FROM candidates ca LEFT JOIN clients c ON ca.client_id = c.id LEFT JOIN hiring_positions p ON ca.position_id = p.id
          WHERE ca.updated_at > $1 AND ca.client_id = $2`;
        idQuery = 'SELECT id FROM candidates WHERE client_id = $1';
      } else {
        updatedQuery = `SELECT ca.*, c.name AS client_name, p.title AS position_title, (ca.cv_filename IS NOT NULL) AS has_cv
          FROM candidates ca LEFT JOIN clients c ON ca.client_id = c.id LEFT JOIN hiring_positions p ON ca.position_id = p.id
          WHERE ca.updated_at > $1`;
        idQuery = 'SELECT id FROM candidates';
      }

      const [updated, allIdRows] = await Promise.all([
        pool.query(updatedQuery, vals),
        pool.query(idQuery, scopedClientId ? [scopedClientId] : []),
      ]);

      res.json({
        updated: updated.rows,
        allIds: allIdRows.rows.map(r => r.id),
      });
    } catch (e) {
      log('error', 'Hiring', 'Failed to poll candidates', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/candidates/:id — Single candidate.
   *  Client users can only view candidates belonging to their client. */
  router.get('/api/candidates/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    try {
      const { rows } = await pool.query(`
        SELECT ca.*, c.name AS client_name, p.title AS position_title,
               (ca.cv_filename IS NOT NULL) AS has_cv
        FROM candidates ca
        LEFT JOIN clients c ON ca.client_id = c.id
        LEFT JOIN hiring_positions p ON ca.position_id = p.id
        WHERE ca.id = $1
      `, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      if (req.user.clientId && rows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Hiring', 'Failed to fetch candidate', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/candidates — Create a candidate.
   *  Client users can only create candidates under their own client. */
  router.post('/api/candidates', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    let { client_id, position_id, name, role, linkedin_url, due_date, stage, notes } = req.body || {};
    if (req.user.clientId) {
      if (client_id && client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'You can only create candidates for your own client' });
      }
      client_id = req.user.clientId;
    }
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    const lenErr = validateLength(name, 'name');
    if (lenErr) return res.status(400).json({ error: lenErr });
    if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    if (position_id && !isValidUuid(position_id)) return res.status(400).json({ error: 'Invalid position_id' });
    if (stage && !HIRING_STAGES.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${HIRING_STAGES.join(', ')}` });
    }
    if (notes !== undefined) {
      const ne = validateLength(notes, 'notes');
      if (ne) return res.status(400).json({ error: ne });
    }
    const { email, source, source_detail, tags } = req.body || {};
    if (email !== undefined && email !== null && email !== '') {
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email format' });
      const emailErr = validateLength(email, 'email');
      if (emailErr) return res.status(400).json({ error: emailErr });
    }
    if (source !== undefined && source !== null && source !== '') {
      if (!VALID_SOURCES.includes(source)) return res.status(400).json({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` });
    }
    if (source_detail !== undefined) {
      const sdErr = validateLength(source_detail, 'source_detail');
      if (sdErr) return res.status(400).json({ error: sdErr });
    }
    if (tags !== undefined) {
      const tagResult = validateAndNormaliseTags(tags);
      if (tagResult.error) return res.status(400).json({ error: tagResult.error });
      req.body.tags = tagResult.value;
    }
    const targetStage = stage || 'sourcing';
    const dbClient = await pool.connect();
    let createdRow;
    try {
      await dbClient.query('BEGIN');
      await shiftForInsert(dbClient, 'candidates', 'stage', targetStage);
      const { rows } = await dbClient.query(
        `INSERT INTO candidates (client_id, position_id, name, role, linkedin_url, due_date, stage, notes, position, email, source, source_detail, tags, consent_given, consent_date, retention_expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11,$12,$13,$14, COALESCE($15, NOW() + INTERVAL '12 months')) RETURNING *`,
        [
          client_id || null,
          position_id || null,
          name.trim(),
          role || null,
          linkedin_url || null,
          due_date || null,
          targetStage,
          notes || null,
          email || null,
          source || null,
          source_detail || null,
          req.body.tags ? JSON.stringify(req.body.tags) : '[]',
          req.body.consent_given || false,
          req.body.consent_date || null,
          req.body.retention_expires_at || null,
        ]
      );
      createdRow = rows[0];
      // Record initial stage entry in transition history
      await dbClient.query(
        'INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by) VALUES ($1, $2, $3, $4)',
        [createdRow.id, null, targetStage, req.user.displayName || 'unknown']
      );
      await dbClient.query('COMMIT');
    } catch (e) {
      await dbClient.query('ROLLBACK');
      log('error', 'Hiring', 'Failed to create candidate', { error: e.message });
      return res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      dbClient.release();
    }
    await auditLog('candidate', createdRow.id, 'create', req.user.displayName || 'unknown', { name: name.trim(), client_id: client_id || null });
    res.status(201).json(createdRow);
  });

  /** PATCH /api/candidates/:id — Update a candidate.
   *  Client users can only update candidates belonging to their own client. */
  router.patch('/api/candidates/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    if (req.user.clientId) {
      const { rows: check } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (check.length === 0) return res.status(404).json({ error: 'Not found' });
      if (check[0].client_id !== req.user.clientId) return res.status(403).json({ error: 'Access denied' });
      if (req.body.client_id !== undefined && req.body.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Cannot reassign candidate to another client' });
      }
    }
    // Validate stage if present
    if (req.body.stage !== undefined && !HIRING_STAGES.includes(req.body.stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${HIRING_STAGES.join(', ')}` });
    }
    // Validate FKs if present
    if (req.body.client_id !== undefined && req.body.client_id !== null && !isValidUuid(req.body.client_id)) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }
    if (req.body.position_id !== undefined && req.body.position_id !== null && !isValidUuid(req.body.position_id)) {
      return res.status(400).json({ error: 'Invalid position_id' });
    }
    // Validate text length
    if (req.body.name !== undefined) {
      if (!String(req.body.name).trim()) return res.status(400).json({ error: 'name cannot be empty' });
      const ne = validateLength(req.body.name, 'name');
      if (ne) return res.status(400).json({ error: ne });
    }
    if (req.body.notes !== undefined) {
      const ne = validateLength(req.body.notes, 'notes');
      if (ne) return res.status(400).json({ error: ne });
    }
    // Validate new candidate fields
    if (req.body.email !== undefined && req.body.email !== null && req.body.email !== '') {
      if (!EMAIL_RE.test(req.body.email)) return res.status(400).json({ error: 'Invalid email format' });
      const emailErr = validateLength(req.body.email, 'email');
      if (emailErr) return res.status(400).json({ error: emailErr });
    }
    if (req.body.source !== undefined && req.body.source !== null && req.body.source !== '') {
      if (!VALID_SOURCES.includes(req.body.source)) return res.status(400).json({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` });
    }
    if (req.body.source_detail !== undefined) {
      const sdErr = validateLength(req.body.source_detail, 'source_detail');
      if (sdErr) return res.status(400).json({ error: sdErr });
    }
    if (req.body.tags !== undefined) {
      const tagResult = validateAndNormaliseTags(req.body.tags);
      if (tagResult.error) return res.status(400).json({ error: tagResult.error });
      // pg does not auto-cast JS arrays to jsonb — stringify so the driver sends a valid JSON string
      req.body.tags = JSON.stringify(tagResult.value);
    }
    // Text fields are stored raw; escaping happens at render time in the frontend (esc()).
    // Name is trimmed here because the POST path also trims it.
    const body = { ...req.body };
    if (body.name !== undefined && body.name !== null) body.name = String(body.name).trim();

    // Auto-stamp consent_date when consent_given is set to true without an explicit date
    if (body.consent_given === true && body.consent_date === undefined) {
      body.consent_date = new Date().toISOString();
    }

    // Stage is routed through reorderInGroup below — NOT in allowedFields here.
    // stage_assignees / onboarding_links / start_date / archived_at were added
    // by migration 024 for Glen's hiring rewrite (bug b7a2f97f). JSONB columns
    // are passed through as JS objects — pg handles the serialisation.
    const { updates, vals, nextIdx } = buildPatchQuery(body, ['client_id', 'position_id', 'name', 'role', 'linkedin_url', 'due_date', 'notes', 'stage_assignees', 'start_date', 'onboarding_links', 'archived_at', 'email', 'source', 'source_detail', 'tags', 'consent_given', 'consent_date', 'retention_expires_at']);
    const wantsReorder = (body.stage !== undefined) || (req.body.position !== undefined);
    if (updates.length === 0 && !wantsReorder) return res.status(400).json({ error: 'No valid fields to update' });

    const dbClient = await pool.connect();
    let updatedRow;
    try {
      await dbClient.query('BEGIN');

      if (wantsReorder) {
        const oldRow = await dbClient.query('SELECT stage FROM candidates WHERE id = $1', [req.params.id]);
        if (oldRow.rows.length === 0) {
          await dbClient.query('ROLLBACK');
          return res.status(404).json({ error: 'Not found' });
        }
        const targetStage = (body.stage !== undefined) ? body.stage : oldRow.rows[0].stage;
        const targetPos = (typeof req.body.position === 'number' && Number.isInteger(req.body.position))
          ? req.body.position
          : 0;
        await reorderInGroup(dbClient, 'candidates', 'stage', req.params.id, targetStage, targetPos);
        // Record stage transition if stage actually changed
        const oldStage = oldRow.rows[0].stage;
        if (body.stage !== undefined && body.stage !== oldStage) {
          await dbClient.query(
            'INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by) VALUES ($1, $2, $3, $4)',
            [req.params.id, oldStage, body.stage, req.user.displayName || 'unknown']
          );
        }
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        vals.push(req.params.id);
        await dbClient.query(
          `UPDATE candidates SET ${updates.join(', ')} WHERE id = $${nextIdx}`,
          vals
        );
      }

      const fresh = await dbClient.query('SELECT * FROM candidates WHERE id = $1', [req.params.id]);
      if (!fresh.rows[0]) {
        await dbClient.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }
      updatedRow = fresh.rows[0];
      await dbClient.query('COMMIT');
    } catch (e) {
      await dbClient.query('ROLLBACK');
      log('error', 'Hiring', 'Failed to update candidate', { error: e.message });
      return res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      dbClient.release();
    }

    await auditLog('candidate', req.params.id, 'update', req.user.displayName || 'unknown', { fields: Object.keys(req.body) });
    res.json(updatedRow);
  });

  /** DELETE /api/candidates/:id — Remove a candidate (admin only).
   *  Also deletes the CV file from disk if one is attached. */
  router.delete('/api/candidates/:id', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    try {
      const { rows } = await pool.query('SELECT cv_filename FROM candidates WHERE id = $1', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      if (rows[0].cv_filename) {
        // Strip any path components defensively before unlinking
        const safe = path.basename(rows[0].cv_filename);
        const filePath = path.join(uploadDir, safe);
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* swallow */ }
      }
      await pool.query('DELETE FROM candidates WHERE id = $1', [req.params.id]);
      await auditLog('candidate', req.params.id, 'delete', req.user.displayName || 'unknown');
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Hiring', 'Failed to delete candidate', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/candidates/:id/cv — Upload a CV file for a candidate.
   *  Reuses the shared multer instance (25 MB cap, allowlisted MIME types).
   *  Code review M6: restrict to PDF only. CVs are almost always PDFs in practice,
   *  and narrowing the MIME surface reduces the attack area (no DOCX macros, no
   *  arbitrary binary that happens to satisfy the generic allowlist).
   *  If the candidate already has a CV, the previous file is deleted from disk
   *  before the new one replaces it. */
  router.post('/api/candidates/:id/cv', upload.single('file'), async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Enforce PDF-only for CVs
    const isPdfMime = req.file.mimetype === 'application/pdf';
    const isPdfExt = /\.pdf$/i.test(req.file.originalname || '');
    if (!isPdfMime || !isPdfExt) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Only PDF CVs are accepted' });
    }
    try {
      const { rows: existing } = await pool.query('SELECT cv_filename, client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (existing.length === 0) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(404).json({ error: 'Candidate not found' });
      }
      if (req.user.clientId && existing[0].client_id !== req.user.clientId) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(403).json({ error: 'Access denied' });
      }
      // Delete old CV file if present
      if (existing[0].cv_filename) {
        const safe = path.basename(existing[0].cv_filename);
        const oldPath = path.join(uploadDir, safe);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) {}
      }
      const { rows } = await pool.query(
        'UPDATE candidates SET cv_filename = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [req.file.filename, req.params.id]
      );
      await auditLog('candidate', req.params.id, 'cv_upload', req.user.displayName || 'unknown', { filename: req.file.originalname, size: req.file.size });
      res.json({ ...rows[0], original_name: req.file.originalname, size: req.file.size });
    } catch (e) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (err) {} }
      log('error', 'Hiring', 'Failed to upload CV', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/candidates/:id/cv — Download the candidate's CV file.
   *  Client users can only download CVs for candidates belonging to their client. */
  router.get('/api/candidates/:id/cv', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    try {
      const { rows } = await pool.query('SELECT cv_filename, name, client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (rows.length === 0 || !rows[0].cv_filename) return res.status(404).json({ error: 'No CV uploaded' });
      if (req.user.clientId && rows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Defensive: strip path components, never trust the DB value to be a bare filename
      const safe = path.basename(rows[0].cv_filename);
      const filePath = path.join(uploadDir, safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'CV file missing on disk' });
      // Suggest a friendly download name based on the candidate's name + the stored extension
      const ext = path.extname(safe);
      const friendly = `${rows[0].name || 'candidate'}-CV${ext}`.replace(/[^a-zA-Z0-9_.\- ]/g, '_');
      res.download(filePath, friendly);
    } catch (e) {
      log('error', 'Hiring', 'Failed to download CV', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/candidates/:id/cv/preview — Serve the candidate's CV inline in the browser.
   *  Client users can only preview CVs for candidates belonging to their client.
   *  NOTE: declared AFTER /cv (the download route) — no routing ambiguity as /preview
   *  is a distinct literal segment, not a parameter. */
  router.get('/api/candidates/:id/cv/preview', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    try {
      const { rows } = await pool.query('SELECT cv_filename, name, client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (rows.length === 0 || !rows[0].cv_filename) return res.status(404).json({ error: 'No CV uploaded' });
      if (req.user.clientId && rows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const safe = path.basename(rows[0].cv_filename);
      const filePath = path.join(uploadDir, safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'CV file missing on disk' });
      const fileExt = path.extname(safe).toLowerCase();
      const mimeMap = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      res.setHeader('Content-Type', mimeMap[fileExt] || 'application/octet-stream');
      const friendlyName = `${rows[0].name || 'candidate'}-CV${fileExt}`.replace(/[^a-zA-Z0-9_.\- ]/g, '_');
      res.setHeader('Content-Disposition', `inline; filename="${friendlyName}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      log('error', 'Hiring', 'Failed to preview CV', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/clients/:id/hiring-count — Real count of active candidates for a client.
   *  "Active" = candidates in stages other than 'hired' or 'rejected'.
   *  Counts candidates whose client_id matches OR whose parent hiring_position belongs
   *  to the client. This covers both direct candidate-to-client links and candidates
   *  attached via a position. */
  router.get('/api/clients/:id/hiring-count', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM candidates c
         LEFT JOIN hiring_positions p ON c.position_id = p.id
         WHERE (c.client_id = $1 OR p.client_id = $1)
           AND c.stage NOT IN ('hired','rejected')`,
        [req.params.id]
      );
      res.json({ count: rows[0]?.count || 0 });
    } catch (e) {
      log('error', 'Hiring', 'Failed to compute hiring count', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
