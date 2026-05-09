module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAuth, requireAdmin, isValidUuid, buildPatchQuery } = ctx;

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

  router.patch('/api/contacts/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid contact ID' });
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['name', 'role', 'notes', 'background', 'linkedin', 'sort_order', 'email', 'phone']);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE contacts SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
    if (rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json(rows[0]);
  });

  router.delete('/api/contacts/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid contact ID' });
    await pool.query('DELETE FROM contacts WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  return router;
};
