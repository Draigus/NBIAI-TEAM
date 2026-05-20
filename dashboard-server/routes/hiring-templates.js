'use strict';

function resolvePlaceholders(text, data) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : match;
  });
}

module.exports = function (ctx) {
  const router = require('express').Router();
  const {
    pool, log, requireAdmin, requireNBI,
    isValidUuid, validateLength,
    sendEmailAsync, EMAIL_FROM,
    buildPatchQuery,
  } = ctx;

  // ==================== EMAIL TEMPLATES ====================

  /**
   * GET /api/hiring-templates?client_id=
   * List templates. Returns global (client_id IS NULL) + client-specific rows.
   * Client users are auto-scoped to their own client_id.
   */
  router.get('/api/hiring-templates', requireNBI, async (req, res) => {
    try {
      const clientId = req.query.client_id || null;

      // Client users can only see templates for their own client
      const scopedClientId = req.user.role === 'client'
        ? (req.user.clientId || null)
        : (clientId && isValidUuid(clientId) ? clientId : null);

      let rows;
      if (scopedClientId) {
        const result = await pool.query(
          `SELECT * FROM hiring_email_templates
           WHERE client_id IS NULL OR client_id = $1
           ORDER BY created_at DESC`,
          [scopedClientId]
        );
        rows = result.rows;
      } else {
        const result = await pool.query(
          `SELECT * FROM hiring_email_templates
           ORDER BY created_at DESC`
        );
        rows = result.rows;
      }

      res.json(rows);
    } catch (err) {
      log.error({ err }, 'GET /api/hiring-templates failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/hiring-templates
   * Admin only. Body: { client_id, name, subject, body, trigger_stage }
   */
  router.post('/api/hiring-templates', requireAdmin, async (req, res) => {
    try {
      const { client_id, name, subject, body, trigger_stage } = req.body;

      if (!name || !subject || !body) {
        return res.status(400).json({ error: 'name, subject, and body are required' });
      }

      const nameErr = validateLength(name, 'name', 200);
      if (nameErr) return res.status(400).json({ error: nameErr });

      const subjectErr = validateLength(subject, 'subject', 500);
      if (subjectErr) return res.status(400).json({ error: subjectErr });

      if (client_id && !isValidUuid(client_id)) {
        return res.status(400).json({ error: 'Invalid client_id' });
      }

      const { rows } = await pool.query(
        `INSERT INTO hiring_email_templates (client_id, name, subject, body, trigger_stage)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [client_id || null, name, subject, body, trigger_stage || null]
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      log.error({ err }, 'POST /api/hiring-templates failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PATCH /api/hiring-templates/:id
   * Admin only. Allowed fields: client_id, name, subject, body, trigger_stage
   */
  router.patch('/api/hiring-templates/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid id' });

      const { updates, vals, nextIdx } = buildPatchQuery(
        req.body,
        ['client_id', 'name', 'subject', 'body', 'trigger_stage']
      );

      if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE hiring_email_templates SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${nextIdx} RETURNING *`,
        vals
      );

      if (!rows.length) return res.status(404).json({ error: 'Template not found' });
      res.json(rows[0]);
    } catch (err) {
      log.error({ err }, 'PATCH /api/hiring-templates/:id failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/hiring-templates/:id
   * Admin only.
   */
  router.delete('/api/hiring-templates/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid id' });

      const { rows } = await pool.query(
        'DELETE FROM hiring_email_templates WHERE id = $1 RETURNING id',
        [id]
      );

      if (!rows.length) return res.status(404).json({ error: 'Template not found' });
      res.json({ ok: true });
    } catch (err) {
      log.error({ err }, 'DELETE /api/hiring-templates/:id failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/hiring-templates/:id/send
   * NBI only. Body: { candidate_id }
   * Resolves placeholders and sends via sendEmailAsync.
   */
  router.post('/api/hiring-templates/:id/send', requireNBI, async (req, res) => {
    try {
      const { id } = req.params;
      const { candidate_id } = req.body;

      if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid template id' });
      if (!candidate_id || !isValidUuid(candidate_id)) {
        return res.status(400).json({ error: 'candidate_id is required and must be a valid UUID' });
      }

      // Fetch template
      const { rows: templateRows } = await pool.query(
        'SELECT * FROM hiring_email_templates WHERE id = $1',
        [id]
      );
      if (!templateRows.length) return res.status(404).json({ error: 'Template not found' });
      const template = templateRows[0];

      // Fetch candidate with JOINs
      const { rows: candidateRows } = await pool.query(
        `SELECT ca.*, c.name AS client_name, p.title AS position_title, p.salary_range, p.location
         FROM candidates ca
         LEFT JOIN clients c ON ca.client_id = c.id
         LEFT JOIN hiring_positions p ON ca.position_id = p.id
         WHERE ca.id = $1`,
        [candidate_id]
      );
      if (!candidateRows.length) return res.status(404).json({ error: 'Candidate not found' });
      const candidate = candidateRows[0];

      if (!candidate.email) {
        return res.status(400).json({ error: 'Candidate has no email address' });
      }

      const data = {
        candidate_name: candidate.name,
        candidate_email: candidate.email,
        role: candidate.role || '',
        client_name: candidate.client_name || '',
        stage: candidate.stage || '',
        position_title: candidate.position_title || '',
        salary_range: candidate.salary_range || '',
        location: candidate.location || '',
        start_date: candidate.start_date || '',
        sender_name: req.user.displayName || req.user.display_name || req.user.email || '',
      };

      const resolvedSubject = resolvePlaceholders(template.subject, data);
      const resolvedBody = resolvePlaceholders(template.body, data);

      sendEmailAsync({
        from: EMAIL_FROM,
        to: candidate.email,
        replyTo: req.user.email,
        subject: resolvedSubject,
        text: resolvedBody,
      });

      res.json({ ok: true, to: candidate.email, subject: resolvedSubject });
    } catch (err) {
      log.error({ err }, 'POST /api/hiring-templates/:id/send failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
