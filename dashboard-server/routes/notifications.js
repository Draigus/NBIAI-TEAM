module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, requireNBI, createNotification, log } = ctx;

  router.get('/api/notifications', async (req, res) => {
    const username = req.user?.username || '';
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE username = $1 ORDER BY created_at DESC LIMIT 50', [username]
    );
    const unread = rows.filter(n => !n.is_read).length;
    res.json({ notifications: rows, unread });
  });

  router.post('/api/notifications', requireAdmin, async (req, res) => {
    const { username, type, title, message, link } = req.body;
    if (!username || !title) return res.status(400).json({ error: 'username and title required' });
    await createNotification(username, type || 'info', title, message || '', link || '');
    res.status(201).json({ ok: true });
  });

  router.post('/api/notifications/read', async (req, res) => {
    const username = req.user?.username || '';
    const { ids, force } = req.body;
    const dismissFilter = force ? '' : ' AND (dismissable IS NULL OR dismissable = true)';
    if (ids && ids.length > 0) {
      await pool.query(`UPDATE notifications SET is_read = true WHERE id = ANY($1) AND username = $2${dismissFilter}`, [ids, username]);
    } else {
      await pool.query(`UPDATE notifications SET is_read = true WHERE username = $1${dismissFilter}`, [username]);
    }
    res.json({ ok: true });
  });

  router.delete('/api/notifications', async (req, res) => {
    const username = req.user?.username || '';
    await pool.query('DELETE FROM notifications WHERE username = $1 AND is_read = true', [username]);
    res.json({ ok: true });
  });

  router.post('/api/notifications/clear-all', async (req, res) => {
    const username = req.user?.username || '';
    await pool.query('DELETE FROM notifications WHERE username = $1', [username]);
    res.json({ ok: true });
  });

  router.post('/api/notifications/system', requireNBI, requireAdmin, async (req, res) => {
    const { title, message } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
    const { rowCount: sent } = await pool.query(
      `INSERT INTO notifications (username, type, title, message, link, dismissable)
       SELECT username, 'system', $1, $2, '', false FROM users WHERE is_active = true`,
      [title, message]
    );
    log('info', 'Notifications', `System message sent to ${sent} users`, { title });
    res.json({ sent });
  });

  return router;
};
