'use strict';

const DEFAULT_CRITERIA = [
  { name: 'Technical competence', rating: null, notes: '' },
  { name: 'Communication', rating: null, notes: '' },
  { name: 'Culture fit', rating: null, notes: '' },
  { name: 'Problem solving', rating: null, notes: '' },
];

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'];
const VALID_OUTCOMES = ['pass', 'fail', 'on-hold'];
const VALID_RECOMMENDATIONS = ['strong-hire', 'hire', 'no-hire', 'strong-no-hire'];

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, requireAdmin, requireNBI, isValidUuid, auditLog, buildPatchQuery } = ctx;

  /**
   * Verify the requesting user can access the given candidate.
   * Returns the candidate row on success, or null (after sending a response) on failure.
   */
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

  // ==========================================================================
  // Interview Rounds
  // ==========================================================================

  /** GET /api/candidates/:id/interviews — list rounds ordered by round_number ASC */
  router.get('/api/candidates/:id/interviews', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      const { rows } = await pool.query(
        'SELECT * FROM interview_rounds WHERE candidate_id = $1 ORDER BY round_number ASC',
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'InterviewRounds', 'Failed to list rounds', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/candidates/:id/interviews — create a round (NBI only) */
  router.post('/api/candidates/:id/interviews', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    const { title, scheduled_at, duration_minutes, location } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title required' });

    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      // Auto-increment round_number inside a transaction to avoid races.
      // Lock the candidate row (not the aggregate) so concurrent inserts
      // for the same candidate serialise at the row level.
      const client = await pool.connect();
      let row;
      try {
        await client.query('BEGIN');
        // Lock the candidate row to serialise concurrent round inserts
        await client.query('SELECT id FROM candidates WHERE id = $1 FOR UPDATE', [req.params.id]);
        const { rows: [maxRow] } = await client.query(
          'SELECT COALESCE(MAX(round_number), 0) AS max_n FROM interview_rounds WHERE candidate_id = $1',
          [req.params.id]
        );
        const nextNumber = maxRow.max_n + 1;
        const { rows } = await client.query(
          `INSERT INTO interview_rounds (candidate_id, round_number, title, scheduled_at, duration_minutes, location)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [
            req.params.id,
            nextNumber,
            title.trim(),
            scheduled_at || null,
            duration_minutes || null,
            location || null,
          ]
        );
        await client.query('COMMIT');
        row = rows[0];
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      await auditLog('interview_round', row.id, 'create', req.user.displayName || 'unknown', { title: title.trim() });
      res.status(201).json(row);
    } catch (e) {
      log('error', 'InterviewRounds', 'Failed to create round', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** PATCH /api/candidates/:id/interviews/:roundId — update a round */
  router.patch('/api/candidates/:id/interviews/:roundId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.roundId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const { status, outcome } = req.body || {};
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (outcome !== undefined && outcome !== null && !VALID_OUTCOMES.includes(outcome)) {
      return res.status(400).json({ error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')} or null` });
    }

    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      const { updates, vals, nextIdx } = buildPatchQuery(req.body, [
        'title', 'scheduled_at', 'duration_minutes', 'location',
        'status', 'outcome', 'outcome_notes',
      ]);
      if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      updates.push('updated_at = NOW()');
      vals.push(req.params.roundId);
      vals.push(req.params.id);

      const { rows } = await pool.query(
        `UPDATE interview_rounds SET ${updates.join(', ')}
         WHERE id = $${nextIdx} AND candidate_id = $${nextIdx + 1}
         RETURNING *`,
        vals
      );
      if (!rows[0]) return res.status(404).json({ error: 'Interview round not found' });

      res.json(rows[0]);
    } catch (e) {
      log('error', 'InterviewRounds', 'Failed to update round', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/candidates/:id/interviews/:roundId — delete a round (admin only) */
  router.delete('/api/candidates/:id/interviews/:roundId', requireNBI, requireAdmin, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.roundId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      const { rows } = await pool.query(
        'DELETE FROM interview_rounds WHERE id = $1 AND candidate_id = $2 RETURNING id',
        [req.params.roundId, req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Interview round not found' });

      await auditLog('interview_round', req.params.roundId, 'delete', req.user.displayName || 'unknown', {});
      res.json({ ok: true });
    } catch (e) {
      log('error', 'InterviewRounds', 'Failed to delete round', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // ==========================================================================
  // Scorecards
  // ==========================================================================

  /** GET /api/candidates/:id/interviews/:roundId/scorecards — list with visibility rules */
  router.get('/api/candidates/:id/interviews/:roundId/scorecards', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.roundId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      // Verify the round exists and belongs to this candidate
      const { rows: [round] } = await pool.query(
        'SELECT id FROM interview_rounds WHERE id = $1 AND candidate_id = $2',
        [req.params.roundId, req.params.id]
      );
      if (!round) return res.status(404).json({ error: 'Interview round not found' });

      const isAdmin = req.user.role === 'admin';
      const isClientUser = !!req.user.clientId;
      const userId = req.user.id;

      let rows;

      if (isAdmin) {
        // Admin sees ALL scorecards
        const result = await pool.query(
          'SELECT * FROM interview_scorecards WHERE round_id = $1 ORDER BY created_at ASC',
          [req.params.roundId]
        );
        rows = result.rows;
      } else if (isClientUser) {
        // Client users see only submitted
        const result = await pool.query(
          'SELECT * FROM interview_scorecards WHERE round_id = $1 AND submitted_at IS NOT NULL ORDER BY created_at ASC',
          [req.params.roundId]
        );
        rows = result.rows;
      } else {
        // NBI user: check if they have a scorecard for this round
        const { rows: [ownCard] } = await pool.query(
          'SELECT id, submitted_at FROM interview_scorecards WHERE round_id = $1 AND interviewer_user_id = $2',
          [req.params.roundId, userId]
        );

        if (!ownCard) {
          // Not on panel — see only submitted
          const result = await pool.query(
            'SELECT * FROM interview_scorecards WHERE round_id = $1 AND submitted_at IS NOT NULL ORDER BY created_at ASC',
            [req.params.roundId]
          );
          rows = result.rows;
        } else if (!ownCard.submitted_at) {
          // On panel but NOT yet submitted — anti-anchoring: only own draft
          const result = await pool.query(
            'SELECT * FROM interview_scorecards WHERE round_id = $1 AND interviewer_user_id = $2',
            [req.params.roundId, userId]
          );
          rows = result.rows;
        } else {
          // On panel AND submitted — own card plus all submitted
          const result = await pool.query(
            `SELECT * FROM interview_scorecards
             WHERE round_id = $1
               AND (submitted_at IS NOT NULL OR interviewer_user_id = $2)
             ORDER BY created_at ASC`,
            [req.params.roundId, userId]
          );
          rows = result.rows;
        }
      }

      res.json(rows);
    } catch (e) {
      log('error', 'Scorecards', 'Failed to list scorecards', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/candidates/:id/interviews/:roundId/scorecards — create scorecard (NBI only) */
  router.post('/api/candidates/:id/interviews/:roundId/scorecards', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.roundId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      // Verify round exists and belongs to this candidate
      const { rows: [round] } = await pool.query(
        'SELECT id FROM interview_rounds WHERE id = $1 AND candidate_id = $2',
        [req.params.roundId, req.params.id]
      );
      if (!round) return res.status(404).json({ error: 'Interview round not found' });

      // Determine criteria: use position's scorecard_criteria if set, else default template
      let criteria = DEFAULT_CRITERIA;
      const { rows: [candidateRow] } = await pool.query(
        'SELECT position_id FROM candidates WHERE id = $1',
        [req.params.id]
      );
      if (candidateRow && candidateRow.position_id) {
        const { rows: [position] } = await pool.query(
          'SELECT scorecard_criteria FROM hiring_positions WHERE id = $1',
          [candidateRow.position_id]
        );
        if (position && position.scorecard_criteria && Array.isArray(position.scorecard_criteria)) {
          criteria = position.scorecard_criteria;
        }
      }

      const { rows } = await pool.query(
        `INSERT INTO interview_scorecards (round_id, interviewer_name, interviewer_user_id, criteria)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          req.params.roundId,
          req.user.displayName || 'Unknown',
          req.user.id,
          JSON.stringify(criteria),
        ]
      );

      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'A scorecard already exists for this interviewer in this round' });
      }
      log('error', 'Scorecards', 'Failed to create scorecard', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** PATCH /api/candidates/:id/interviews/:roundId/scorecards/:scId — update (author only, not after submit) */
  router.patch('/api/candidates/:id/interviews/:roundId/scorecards/:scId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (
      !isValidUuid(req.params.id) ||
      !isValidUuid(req.params.roundId) ||
      !isValidUuid(req.params.scId)
    ) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    if (req.body.recommendation !== undefined && !VALID_RECOMMENDATIONS.includes(req.body.recommendation)) {
      return res.status(400).json({ error: `Invalid recommendation. Must be one of: ${VALID_RECOMMENDATIONS.join(', ')}` });
    }

    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      const { rows: [sc] } = await pool.query(
        'SELECT id, interviewer_user_id, submitted_at FROM interview_scorecards WHERE id = $1 AND round_id = $2',
        [req.params.scId, req.params.roundId]
      );
      if (!sc) return res.status(404).json({ error: 'Scorecard not found' });

      if (sc.submitted_at) {
        return res.status(403).json({ error: 'Scorecard is locked after submission' });
      }
      if (sc.interviewer_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the scorecard author can edit it' });
      }

      // Stringify criteria for pg jsonb
      const patchBody = { ...req.body };
      if (patchBody.criteria !== undefined) {
        patchBody.criteria = JSON.stringify(patchBody.criteria);
      }

      const { updates, vals, nextIdx } = buildPatchQuery(patchBody, [
        'overall_rating', 'recommendation', 'strengths', 'concerns', 'criteria',
      ]);
      if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      updates.push('updated_at = NOW()');
      vals.push(req.params.scId);

      const { rows } = await pool.query(
        `UPDATE interview_scorecards SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
        vals
      );

      res.json(rows[0]);
    } catch (e) {
      log('error', 'Scorecards', 'Failed to update scorecard', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/candidates/:id/interviews/:roundId/scorecards/:scId/submit — submit a scorecard */
  router.post('/api/candidates/:id/interviews/:roundId/scorecards/:scId/submit', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (
      !isValidUuid(req.params.id) ||
      !isValidUuid(req.params.roundId) ||
      !isValidUuid(req.params.scId)
    ) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      const { rows: [sc] } = await pool.query(
        'SELECT id, interviewer_user_id, overall_rating, recommendation, submitted_at FROM interview_scorecards WHERE id = $1 AND round_id = $2',
        [req.params.scId, req.params.roundId]
      );
      if (!sc) return res.status(404).json({ error: 'Scorecard not found' });

      if (sc.interviewer_user_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the scorecard author can submit it' });
      }
      if (sc.submitted_at) {
        return res.status(409).json({ error: 'Scorecard already submitted' });
      }
      if (!sc.overall_rating || !sc.recommendation) {
        return res.status(400).json({ error: 'overall_rating and recommendation must be set before submitting' });
      }

      const { rows } = await pool.query(
        'UPDATE interview_scorecards SET submitted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
        [req.params.scId]
      );

      res.json(rows[0]);
    } catch (e) {
      log('error', 'Scorecards', 'Failed to submit scorecard', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/candidates/:id/interviews/:roundId/scorecards/:scId — admin only */
  router.delete('/api/candidates/:id/interviews/:roundId/scorecards/:scId', requireNBI, requireAdmin, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (
      !isValidUuid(req.params.id) ||
      !isValidUuid(req.params.roundId) ||
      !isValidUuid(req.params.scId)
    ) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;

      const { rows } = await pool.query(
        'DELETE FROM interview_scorecards WHERE id = $1 AND round_id = $2 RETURNING id',
        [req.params.scId, req.params.roundId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Scorecard not found' });

      res.json({ ok: true });
    } catch (e) {
      log('error', 'Scorecards', 'Failed to delete scorecard', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
