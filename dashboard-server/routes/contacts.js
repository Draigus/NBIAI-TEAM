module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAuth, requireAdmin } = ctx;

  router.get('/api/clients/:clientId/contacts', requireAuth, async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM contacts WHERE client_id = $1 ORDER BY sort_order', [req.params.clientId]);
    res.json(rows);
  });

  router.post('/api/clients/:clientId/contacts', requireAdmin, async (req, res) => {
    const { name, role, notes, background, linkedin, sort_order, email, phone } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO contacts (client_id, name, role, notes, background, linkedin, sort_order, email, phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.clientId, name || '', role || '', notes || '', background || '', linkedin || '', sort_order || 0, email || '', phone || '']
    );
    res.status(201).json(rows[0]);
  });

  return router;
};
