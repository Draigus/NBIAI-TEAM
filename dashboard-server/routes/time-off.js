module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, isValidUuid } = ctx;

  router.get('/api/users/:userId/time-off', async (req, res) => {
    if (!isValidUuid(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const { rows } = await pool.query(
      'SELECT * FROM time_off WHERE user_id = $1 ORDER BY start_date',
      [req.params.userId]
    );
    res.json(rows);
  });

  router.get('/api/time-off', async (req, res) => {
    const { from, to } = req.query;
    let where = []; let vals = []; let i = 1;
    if (from) { where.push(`end_date >= $${i}`); vals.push(from); i++; }
    if (to) { where.push(`start_date <= $${i}`); vals.push(to); i++; }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT t.*, u.display_name FROM time_off t LEFT JOIN users u ON u.id = t.user_id ${whereClause} ORDER BY t.start_date`,
      vals
    );
    res.json(rows);
  });

  router.post('/api/users/:userId/time-off', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const { start_date, end_date, label } = req.body;
    if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date are required' });
    if (new Date(end_date) < new Date(start_date)) return res.status(400).json({ error: 'end_date must be >= start_date' });
    const { rows } = await pool.query(
      'INSERT INTO time_off (user_id, start_date, end_date, label) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.userId, start_date, end_date, label || '']
    );
    res.status(201).json(rows[0]);
  });

  router.delete('/api/time-off/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid time-off ID' });
    const { rowCount } = await pool.query('DELETE FROM time_off WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  return router;
};
