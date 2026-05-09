module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, buildPatchQuery } = ctx;

  router.get('/api/clients/:clientId/notes', async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM client_notes WHERE client_id = $1 ORDER BY meeting_date DESC NULLS LAST, created_at DESC',
      [req.params.clientId]
    );
    res.json(rows);
  });

  router.get('/api/notes', async (req, res) => {
    const { rows } = await pool.query(`
      SELECT n.*, c.name as client_name
      FROM client_notes n JOIN clients c ON n.client_id = c.id
      ORDER BY n.meeting_date DESC NULLS LAST, n.created_at DESC
    `);
    res.json(rows);
  });

  router.post('/api/clients/:clientId/notes', requireAdmin, async (req, res) => {
    const { title, content, source, source_id, source_url, meeting_date, author } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const { rows } = await pool.query(
      `INSERT INTO client_notes (client_id, title, content, source, source_id, source_url, meeting_date, author)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.clientId, title, content || '', source || 'manual', source_id || '', source_url || '',
       meeting_date || null, author || (req.user && req.user.display_name) || 'Unknown']
    );
    res.status(201).json(rows[0]);
  });

  router.patch('/api/notes/:id', requireAdmin, async (req, res) => {
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['title', 'content', 'source', 'meeting_date', 'author']);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push('updated_at = NOW()');
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE client_notes SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
    if (rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(rows[0]);
  });

  router.delete('/api/notes/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM client_notes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  return router;
};
