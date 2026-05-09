module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, isValidUuid, requireTaskAccess } = ctx;

  router.get('/api/tasks/:id/time-entries', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
    const allowed = await requireTaskAccess(req, res, req.params.id);
    if (!allowed) return;
    const { rows } = await pool.query('SELECT * FROM time_entries WHERE task_id = $1 ORDER BY date DESC, created_at DESC', [req.params.id]);
    res.json(rows);
  });

  router.post('/api/tasks/:id/time-entries', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
    const allowed = await requireTaskAccess(req, res, req.params.id);
    if (!allowed) return;
    const { hours, description, date } = req.body;
    if (!hours || hours <= 0) return res.status(400).json({ error: 'hours required (> 0)' });
    const userName = req.user?.displayName || 'Unknown';
    const entryDate = date || new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      'INSERT INTO time_entries (task_id, user_name, description, hours, date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, userName, description || '', hours, entryDate]
    );
    await pool.query('UPDATE tasks SET hours_spent = COALESCE((SELECT SUM(hours) FROM time_entries WHERE task_id = $1), 0), updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.status(201).json(rows[0]);
  });

  router.delete('/api/time-entries/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid time entry ID' });
    const { rows } = await pool.query('SELECT task_id, user_name FROM time_entries WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Time entry not found' });
    const isOwner = rows[0].user_name === (req.user?.displayName || req.user?.display_name || req.user?.username);
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Can only delete your own time entries' });
    await pool.query('DELETE FROM time_entries WHERE id = $1', [req.params.id]);
    if (rows.length > 0) {
      await pool.query('UPDATE tasks SET hours_spent = COALESCE((SELECT SUM(hours) FROM time_entries WHERE task_id = $1), 0), updated_at = NOW() WHERE id = $1', [rows[0].task_id]);
    }
    res.json({ ok: true });
  });

  router.get('/api/time-entries/summary', async (req, res) => {
    const { from, to } = req.query;
    let dateFilter = '';
    const params = [];
    if (from) { params.push(from); dateFilter += ` AND te.date >= $${params.length}`; }
    if (to) { params.push(to); dateFilter += ` AND te.date <= $${params.length}`; }
    const { rows } = await pool.query(`
      SELECT te.user_name, t.client_id, c.name as client_name,
             SUM(te.hours) as total_hours, COUNT(*) as entry_count
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE 1=1 ${dateFilter}
      GROUP BY te.user_name, t.client_id, c.name
      ORDER BY te.user_name, c.name
    `, params);
    res.json(rows);
  });

  return router;
};
