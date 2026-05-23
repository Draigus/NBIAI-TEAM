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

  // --- Finance Entries (ad-hoc income/expense items) ---

  router.get('/api/finance/entries', requireNBI, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, name, amount, category, type, tag, entry_date AS date, created_by, created_at AS "createdAt" FROM finance_entries ORDER BY created_at DESC'
      );
      res.json(rows);
    } catch (e) {
      log('error', 'Finance', 'Failed to list entries', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.post('/api/finance/entries', requireNBI, async (req, res) => {
    try {
      const { name, amount, category, type, tag, date } = req.body;
      if (!name || amount === undefined || amount === null) return res.status(400).json({ error: 'name and amount required' });
      const { rows } = await pool.query(
        `INSERT INTO finance_entries (name, amount, category, type, tag, entry_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, amount, category, type, tag, entry_date AS date, created_by, created_at AS "createdAt"`,
        [name, parseFloat(amount), category || 'expense', type || 'one-off', tag || null, date || null, req.user?.displayName || 'unknown']
      );
      await auditLog('finance', rows[0].id, 'create', req.user?.displayName, { name, amount, category });
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'Finance', 'Failed to create entry', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.post('/api/finance/entries/bulk', requireNBI, async (req, res) => {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ error: 'entries array required' });
      const inserted = [];
      for (const e of entries) {
        if (!e.name || e.amount === undefined) continue;
        const { rows } = await pool.query(
          `INSERT INTO finance_entries (name, amount, category, type, tag, entry_date, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, name, amount, category, type, tag, entry_date AS date, created_by, created_at AS "createdAt"`,
          [e.name, parseFloat(e.amount), e.category || 'expense', e.type || 'one-off', e.tag || null, e.date || null, req.user?.displayName || 'unknown']
        );
        inserted.push(rows[0]);
      }
      res.status(201).json({ ok: true, count: inserted.length, entries: inserted });
    } catch (e) {
      log('error', 'Finance', 'Failed to bulk create entries', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.delete('/api/finance/entries/:id', requireNBI, async (req, res) => {
    try {
      const { rowCount } = await pool.query('DELETE FROM finance_entries WHERE id = $1', [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Entry not found' });
      await auditLog('finance', req.params.id, 'delete', req.user?.displayName, {});
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Finance', 'Failed to delete entry', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
