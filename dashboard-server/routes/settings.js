module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin } = ctx;

  const SETTINGS_ALLOW_LIST = new Set([
    'page_permissions', 'expense_approver', 'fx_rates', 'theme',
    'dashboard_layout', 'notification_preferences', 'hourly_rate',
    'working_hours_per_week', 'currency', 'company_name',
  ]);

  router.get('/api/settings', async (req, res) => {
    const SETTINGS_ALLOW = new Set([
      'currency', 'hourly_rate', 'hourlyRate', 'date_format', 'dateFormat',
      'timezone', 'client_priority', 'clientPriority',
    ]);
    const isExternal = !!req.user?.clientId;
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const obj = {};
    rows.forEach(r => {
      if (!isExternal || SETTINGS_ALLOW.has(r.key)) obj[r.key] = r.value;
    });
    res.json(obj);
  });

  router.put('/api/settings/:key', requireAdmin, async (req, res) => {
    if (!SETTINGS_ALLOW_LIST.has(req.params.key)) {
      return res.status(400).json({ error: `Setting key '${req.params.key}' is not recognised` });
    }
    const { value } = req.body;
    await pool.query(
      'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
      [req.params.key, JSON.stringify(value)]
    );
    res.json({ ok: true });
  });

  return router;
};
