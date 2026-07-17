// dashboard-server/routes/views.js
// Foundation 2: saved views CRUD. Ownership: users manage their own
// views; admins may additionally create/patch/delete shared views.
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid } = ctx;

  const SECTION_RE = /^[a-z_]{2,50}$/;

  router.get('/api/views', async (req, res) => {
    const section = req.query.section;
    if (!section || !SECTION_RE.test(section)) return res.status(400).json({ error: 'section is required' });
    try {
      const { rows } = await pool.query(
        `SELECT * FROM user_views WHERE section = $1 AND (user_id = $2 OR is_shared = true)
         ORDER BY is_shared DESC, name ASC`,
        [section, req.user.id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'Views', 'Failed to list views', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.post('/api/views', async (req, res) => {
    const { section, name, config } = req.body || {};
    const isDefault = !!req.body?.is_default;
    const isShared = !!req.body?.is_shared;
    if (!section || !SECTION_RE.test(section)) return res.status(400).json({ error: 'Valid section is required' });
    if (!name || typeof name !== 'string' || name.length > 100) return res.status(400).json({ error: 'name (max 100 chars) is required' });
    if (!config || typeof config !== 'object' || Array.isArray(config)) return res.status(400).json({ error: 'config object is required' });
    if (isShared && req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create shared views' });
    try {
      if (isDefault) {
        await pool.query('UPDATE user_views SET is_default = false WHERE user_id = $1 AND section = $2', [req.user.id, section]);
      }
      const { rows } = await pool.query(
        `INSERT INTO user_views (user_id, section, name, config, is_default, is_shared)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.user.id, section, name.trim(), JSON.stringify(config), isDefault, isShared]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'A view with that name already exists for this section' });
      log('error', 'Views', 'Failed to create view', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.patch('/api/views/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid view ID' });
    const updates = [];
    const params = [];
    let i = 1;
    if (req.body?.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.length > 100) return res.status(400).json({ error: 'Invalid name' });
      updates.push(`name = $${i++}`); params.push(req.body.name.trim());
    }
    if (req.body?.config !== undefined) {
      if (typeof req.body.config !== 'object' || Array.isArray(req.body.config)) return res.status(400).json({ error: 'Invalid config' });
      updates.push(`config = $${i++}`); params.push(JSON.stringify(req.body.config));
    }
    if (req.body?.is_default !== undefined) { updates.push(`is_default = $${i++}`); params.push(!!req.body.is_default); }
    if (updates.length === 0) return res.status(400).json({ error: 'No updatable fields supplied' });
    updates.push(`updated_at = now()`);
    try {
      // Owner check baked into WHERE; admins may also patch shared views
      const ownerClause = req.user.role === 'admin' ? '(user_id = $' + i + ' OR is_shared = true)' : 'user_id = $' + i;
      params.push(req.user.id);
      const idIdx = ++i;
      params.push(req.params.id);
      if (req.body?.is_default) {
        const { rows: target } = await pool.query('SELECT section FROM user_views WHERE id = $1', [req.params.id]);
        if (target[0]) await pool.query('UPDATE user_views SET is_default = false WHERE user_id = $1 AND section = $2', [req.user.id, target[0].section]);
      }
      const { rows } = await pool.query(
        `UPDATE user_views SET ${updates.join(', ')} WHERE ${ownerClause} AND id = $${idIdx} RETURNING *`, params
      );
      if (rows.length === 0) return res.status(404).json({ error: 'View not found' });
      res.json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'A view with that name already exists for this section' });
      log('error', 'Views', 'Failed to update view', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.delete('/api/views/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid view ID' });
    try {
      const ownerClause = req.user.role === 'admin' ? '(user_id = $1 OR is_shared = true)' : 'user_id = $1';
      const { rowCount } = await pool.query(
        `DELETE FROM user_views WHERE ${ownerClause} AND id = $2`, [req.user.id, req.params.id]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'View not found' });
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Views', 'Failed to delete view', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
