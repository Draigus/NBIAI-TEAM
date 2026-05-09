module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, isValidUuid, log } = ctx;

  router.get('/api/templates', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM task_templates ORDER BY name');
    res.json(rows);
  });

  router.post('/api/templates', requireAdmin, async (req, res) => {
    const { name, template, recurrence } = req.body;
    if (!name || !template) return res.status(400).json({ error: 'name and template required' });
    const { rows } = await pool.query(
      'INSERT INTO task_templates (name, template, recurrence, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, JSON.stringify(template), recurrence || '', req.user?.displayName || 'unknown']
    );
    res.status(201).json(rows[0]);
  });

  router.post('/api/templates/:id/create', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template ID' });
    const { rows } = await pool.query('SELECT * FROM task_templates WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    const tmpl = rows[0].template;
    const created = [];
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      async function createFromTemplate(node, parentId) {
        const taskResult = await conn.query(
          `INSERT INTO tasks (title, parent_id, status, priority, description, assignees, hours_estimated, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'template') RETURNING id`,
          [node.title, parentId, node.status || 'Not started', node.priority || '', node.description || '', node.assignees || [], node.hoursEstimated || 0]
        );
        created.push({ id: taskResult.rows[0].id, title: node.title });
        if (node.children) {
          for (const child of node.children) {
            await createFromTemplate(child, taskResult.rows[0].id);
          }
        }
      }
      await createFromTemplate(tmpl, null);
      await conn.query('UPDATE task_templates SET last_created_at = NOW() WHERE id = $1', [req.params.id]);
      await conn.query('COMMIT');
      res.json({ ok: true, created });
    } catch (err) {
      await conn.query('ROLLBACK');
      log('error', 'Templates', 'Template instantiation failed, rolled back', { error: err.message });
      res.status(500).json({ error: 'Template creation failed' });
    } finally {
      conn.release();
    }
  });

  router.delete('/api/templates/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template ID' });
    await pool.query('DELETE FROM task_templates WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  return router;
};
