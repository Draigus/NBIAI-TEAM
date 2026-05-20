'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid, validateLength } = ctx;

  // GET /api/candidates/:id/comments
  router.get('/api/candidates/:id/comments', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    try {
      const { rows: [candidate] } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
      if (req.user.clientId && candidate.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const isClientUser = !!req.user.clientId;
      let query = 'SELECT * FROM candidate_comments WHERE candidate_id = $1';
      if (isClientUser) query += ' AND internal = false';
      query += ' ORDER BY created_at ASC';

      const { rows } = await pool.query(query, [req.params.id]);
      res.json(rows);
    } catch (e) {
      log('error', 'CandidateComments', 'Failed to list comments', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // POST /api/candidates/:id/comments
  router.post('/api/candidates/:id/comments', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });

    const { body: commentBody } = req.body || {};
    if (!commentBody || !commentBody.trim()) return res.status(400).json({ error: 'Comment body required' });
    const lenErr = validateLength(commentBody, 'body', 5000);
    if (lenErr) return res.status(400).json({ error: lenErr });

    try {
      const { rows: [candidate] } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
      if (req.user.clientId && candidate.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const isClientUser = !!req.user.clientId;
      const internal = isClientUser ? false : (req.body.internal === true);

      const { rows } = await pool.query(
        `INSERT INTO candidate_comments (candidate_id, author, author_user_id, body, internal)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.id, req.user.displayName || 'Unknown', req.user.id, commentBody.trim(), internal]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'CandidateComments', 'Failed to create comment', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // DELETE /api/candidates/:id/comments/:commentId
  router.delete('/api/candidates/:id/comments/:commentId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.commentId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const { rows: [comment] } = await pool.query(
        'SELECT author_user_id FROM candidate_comments WHERE id = $1 AND candidate_id = $2',
        [req.params.commentId, req.params.id]
      );
      if (!comment) return res.status(404).json({ error: 'Comment not found' });

      const isAdmin = req.user.role === 'admin';
      if (comment.author_user_id !== req.user.id && !isAdmin) {
        return res.status(403).json({ error: 'Only the author or admin can delete this comment' });
      }

      await pool.query('DELETE FROM candidate_comments WHERE id = $1', [req.params.commentId]);
      res.json({ ok: true });
    } catch (e) {
      log('error', 'CandidateComments', 'Failed to delete comment', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
