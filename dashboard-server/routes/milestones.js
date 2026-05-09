module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, isValidUuid } = ctx;

  // ==================== MILESTONES ====================
  //
  // Client-level checkpoints with linked work items.
  // Milestones track delivery gates (e.g. Alpha, Beta, Launch).
  // Completion status is computed client-side from linked items.

  router.get('/api/clients/:clientId/milestones', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { clientId } = req.params;
    if (!isValidUuid(clientId)) return res.status(400).json({ error: 'Invalid client ID' });

    const { rows } = await pool.query(
      `SELECT m.*,
              COALESCE(array_agg(mi.task_id) FILTER (WHERE mi.task_id IS NOT NULL), '{}') AS linked_item_ids
       FROM milestones m
       LEFT JOIN milestone_items mi ON mi.milestone_id = m.id
       WHERE m.client_id = $1
       GROUP BY m.id
       ORDER BY m.target_date ASC`,
      [clientId]
    );
    res.json(rows);
  });

  router.post('/api/clients/:clientId/milestones', requireAdmin, async (req, res) => {
    const { clientId } = req.params;
    if (!isValidUuid(clientId)) return res.status(400).json({ error: 'Invalid client ID' });
    const { title, description, target_date, linked_item_ids } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    if (!target_date) return res.status(400).json({ error: 'target_date is required' });

    const client = await pool.query('SELECT id FROM clients WHERE id = $1', [clientId]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Client not found' });

    const { rows } = await pool.query(
      `INSERT INTO milestones (client_id, title, description, target_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [clientId, title.trim(), description || '', target_date]
    );
    const ms = rows[0];

    if (Array.isArray(linked_item_ids) && linked_item_ids.length > 0) {
      const values = linked_item_ids.map((tid, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO milestone_items (milestone_id, task_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [ms.id, ...linked_item_ids]
      );
    }

    ms.linked_item_ids = linked_item_ids || [];
    res.status(201).json(ms);
  });

  router.put('/api/milestones/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid milestone ID' });

    const existing = await pool.query('SELECT * FROM milestones WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });

    const { title, description, target_date, linked_item_ids } = req.body;
    const updates = [];
    const vals = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); vals.push(title.trim()); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); vals.push(description); }
    if (target_date !== undefined) { updates.push(`target_date = $${idx++}`); vals.push(target_date); }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      vals.push(id);
      await pool.query(`UPDATE milestones SET ${updates.join(', ')} WHERE id = $${idx}`, vals);
    }

    if (Array.isArray(linked_item_ids)) {
      await pool.query('DELETE FROM milestone_items WHERE milestone_id = $1', [id]);
      if (linked_item_ids.length > 0) {
        const values = linked_item_ids.map((tid, i) => `($1, $${i + 2})`).join(', ');
        await pool.query(
          `INSERT INTO milestone_items (milestone_id, task_id) VALUES ${values} ON CONFLICT DO NOTHING`,
          [id, ...linked_item_ids]
        );
      }
    }

    const { rows } = await pool.query(
      `SELECT m.*,
              COALESCE(array_agg(mi.task_id) FILTER (WHERE mi.task_id IS NOT NULL), '{}') AS linked_item_ids
       FROM milestones m
       LEFT JOIN milestone_items mi ON mi.milestone_id = m.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [id]
    );
    res.json(rows[0]);
  });

  router.delete('/api/milestones/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid milestone ID' });

    const result = await pool.query('DELETE FROM milestones WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.status(204).end();
  });

  return router;
};
