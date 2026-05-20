'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid } = ctx;

  // ==================== ONBOARDING CHECKLIST ====================
  //
  // Per-candidate onboarding checklist. Items are ordered by sort_order.
  // Auto-populate from position onboarding_template happens in hiring.js
  // when a candidate is moved to the 'onboarding' stage.

  // Reusable candidate ownership check. Returns the candidate row on success,
  // writes an error response and returns null on failure.
  async function verifyCandidateAccess(req, res, candidateId) {
    const { rows: [candidate] } = await pool.query(
      'SELECT client_id FROM candidates WHERE id = $1',
      [candidateId]
    );
    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return null;
    }
    if (req.user.clientId && candidate.client_id !== req.user.clientId) {
      res.status(403).json({ error: 'Access denied' });
      return null;
    }
    return candidate;
  }

  /** GET /api/candidates/:id/onboarding — List checklist items for a candidate. */
  router.get('/api/candidates/:id/onboarding', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    const candidate = await verifyCandidateAccess(req, res, req.params.id);
    if (!candidate) return;

    const { rows } = await pool.query(
      'SELECT * FROM onboarding_checklist_items WHERE candidate_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [req.params.id]
    );
    res.json(rows);
  });

  /** POST /api/candidates/:id/onboarding — Add a checklist item. */
  router.post('/api/candidates/:id/onboarding', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    const candidate = await verifyCandidateAccess(req, res, req.params.id);
    if (!candidate) return;

    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Auto-increment sort_order: MAX existing + 1
    const { rows: [maxRow] } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM onboarding_checklist_items WHERE candidate_id = $1',
      [req.params.id]
    );
    const sort_order = maxRow.max_order + 1;

    const { rows: [item] } = await pool.query(
      'INSERT INTO onboarding_checklist_items (candidate_id, title, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, title.trim(), sort_order]
    );
    res.status(201).json(item);
  });

  /** PATCH /api/candidates/:id/onboarding/:itemId — Update an item. */
  router.patch('/api/candidates/:id/onboarding/:itemId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    if (!isValidUuid(req.params.itemId)) return res.status(400).json({ error: 'Invalid item ID' });

    const candidate = await verifyCandidateAccess(req, res, req.params.id);
    if (!candidate) return;

    // Verify item belongs to this candidate
    const { rows: [existing] } = await pool.query(
      'SELECT * FROM onboarding_checklist_items WHERE id = $1 AND candidate_id = $2',
      [req.params.itemId, req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const updates = [];
    const vals = [];
    let idx = 1;

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
        return res.status(400).json({ error: 'title must be a non-empty string' });
      }
      updates.push(`title = $${idx++}`);
      vals.push(req.body.title.trim());
    }

    if (req.body.sort_order !== undefined) {
      updates.push(`sort_order = $${idx++}`);
      vals.push(req.body.sort_order);
    }

    if (req.body.completed !== undefined) {
      updates.push(`completed = $${idx++}`);
      vals.push(!!req.body.completed);

      if (req.body.completed === true || req.body.completed === 'true') {
        // Mark completed — auto-set timestamp and actor
        updates.push(`completed_at = NOW()`);
        updates.push(`completed_by = $${idx++}`);
        vals.push(req.user.displayName || 'unknown');
      } else {
        // Un-complete — clear the audit fields
        updates.push(`completed_at = NULL`);
        updates.push(`completed_by = NULL`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    vals.push(req.params.itemId);
    const { rows: [updated] } = await pool.query(
      `UPDATE onboarding_checklist_items SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    res.json(updated);
  });

  /** DELETE /api/candidates/:id/onboarding/:itemId — Remove a checklist item. */
  router.delete('/api/candidates/:id/onboarding/:itemId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    if (!isValidUuid(req.params.itemId)) return res.status(400).json({ error: 'Invalid item ID' });

    const candidate = await verifyCandidateAccess(req, res, req.params.id);
    if (!candidate) return;

    const { rowCount } = await pool.query(
      'DELETE FROM onboarding_checklist_items WHERE id = $1 AND candidate_id = $2',
      [req.params.itemId, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Item not found' });

    res.json({ deleted: true });
  });

  return router;
};
