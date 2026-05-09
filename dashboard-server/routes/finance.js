const path = require('path');
const fs = require('fs');

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireNBI, requireAdmin, auditLog, syncConflicts, log } = ctx;

  router.get('/api/finance/seed', requireNBI, requireAdmin, async (req, res) => {
    try {
      const seedPath = path.join(__dirname, '..', 'finance-seed.json');
      if (fs.existsSync(seedPath)) {
        const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
        res.json(data);
      } else {
        res.json({ revenue: [], pipeline: [], payroll: [], targets: {}, opex: [] });
      }
    } catch(e) {
      log('error', 'Finance', 'Failed to load finance seed data', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.get('/api/finance', requireNBI, async (req, res) => {
    const { rows } = await pool.query('SELECT id, data, updated_by, updated_at FROM finance_data ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) return res.json({ data: null, version: 0 });
    res.json({ data: rows[0].data, updatedBy: rows[0].updated_by, updatedAt: rows[0].updated_at, version: rows[0].id });
  });

  router.put('/api/finance', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { data, expectedVersion } = req.body;
    if (!data) return res.status(400).json({ error: 'data required' });

    const requiredArrays = ['revenue', 'payroll'];
    const missing = requiredArrays.filter(k => !Array.isArray(data[k]));
    if (missing.length > 0) {
      log('warn', 'Finance', `BLOCKED corrupt save from ${req.user?.displayName}`, { missing: missing.join(', '), keysSent: Object.keys(data).join(', ') });
      return res.status(400).json({ error: `Finance data integrity check failed: missing ${missing.join(', ')}. This save was blocked to prevent data loss.` });
    }

    if (expectedVersion !== undefined) {
      const { rows: latest } = await pool.query('SELECT id, updated_by, updated_at FROM finance_data ORDER BY id DESC LIMIT 1');
      if (latest.length > 0 && latest[0].id !== expectedVersion) {
        syncConflicts?.inc();
        return res.status(409).json({
          error: 'Conflict: finance data was updated by another user. Please reload and try again.',
          currentVersion: latest[0].id,
          updatedBy: latest[0].updated_by,
          updatedAt: latest[0].updated_at
        });
      }
    }

    const updatedBy = req.user?.displayName || 'unknown';
    const { rows: inserted } = await pool.query('INSERT INTO finance_data (data, updated_by) VALUES ($1, $2) RETURNING id', [JSON.stringify(data), updatedBy]);
    await auditLog('finance', 'finance_data', 'update', updatedBy, { sections: Object.keys(data) });
    res.json({ ok: true, version: inserted[0].id });
  });

  return router;
};
