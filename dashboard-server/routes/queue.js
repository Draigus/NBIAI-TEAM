const crypto = require('crypto');

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, log, isValidUuid, validateLength } = ctx;

  router.get('/api/queue', requireAdmin, async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM task_queue ORDER BY created_at DESC');
    res.json(rows);
  });

  router.post('/api/queue', async (req, res) => {
    let submittedBy = null;
    const apiKey = req.get('x-api-key');
    const expectedKey = process.env.QUEUE_API_KEY;
    if (apiKey) {
      if (!expectedKey || apiKey.length !== expectedKey.length ||
          !crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      submittedBy = req.body?.submitted_by || 'api-key';
    } else {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });
      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && !req.user.can_submit_queue) {
        return res.status(403).json({ error: 'Queue submission not enabled for this account' });
      }
      submittedBy = req.user.displayName || 'Unknown';
    }
    const { title, description, slack_user_id, slack_channel, slack_message_ts, client_id, assignee, item_type } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
    const lenErr = validateLength(title.trim(), 'title') || (description ? validateLength(description, 'description') : null);
    if (lenErr) return res.status(400).json({ error: lenErr });
    if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    const validTypes = ['project', 'feature', 'story', 'task'];
    const resolvedType = item_type && validTypes.includes(item_type.toLowerCase()) ? item_type.toLowerCase() : 'task';
    const { rows } = await pool.query(
      `INSERT INTO task_queue (title, description, submitted_by, slack_user_id, slack_channel, slack_message_ts, client_id, assignee, item_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title.trim(), description || null, submittedBy, slack_user_id || null, slack_channel || null, slack_message_ts || null,
       client_id || null, assignee || null, resolvedType]
    );
    res.status(201).json(rows[0]);
  });

  router.delete('/api/queue/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
    await pool.query('DELETE FROM task_queue WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  return router;
};
