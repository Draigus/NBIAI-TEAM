'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid } = ctx;

  router.get('/api/candidates/:id/history', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    try {
      // Verify candidate exists and check ownership for client users
      const { rows: [candidate] } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

      if (req.user.clientId && candidate.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { rows } = await pool.query(
        'SELECT id, candidate_id, from_stage, to_stage, moved_by, moved_at, notes FROM candidate_stage_history WHERE candidate_id = $1 ORDER BY moved_at ASC',
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'CandidateHistory', 'Failed to get history', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
