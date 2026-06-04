'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { requireNBI, pool } = ctx;
  const mi = require('../lib/meetings-intelligence');

  router.get('/api/meetings/compiled', requireNBI, async (req, res) => {
    try {
      const data = await mi.getAll(pool);
      res.json(data);
    } catch (err) {
      console.error('meetings compiled error:', err);
      res.status(500).json({ error: 'Failed to load meetings data' });
    }
  });

  router.get('/api/meetings/stats', requireNBI, async (req, res) => {
    try {
      const stats = await mi.getStats(pool);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load stats' });
    }
  });

  router.post('/api/meetings/items', requireNBI, async (req, res) => {
    const { section, item_id, data } = req.body;
    if (!section || !data) return res.status(400).json({ error: 'section and data are required' });
    if (!mi.VALID_SECTIONS.includes(section)) return res.status(400).json({ error: 'Invalid section: ' + section });
    const valErr = mi.validateRequired(section, data);
    if (valErr) return res.status(400).json({ error: valErr });
    try {
      const item = await mi.createItem(pool, section, data, item_id || undefined);
      res.status(201).json(item);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Item ID already exists' });
      console.error('meetings create error:', err);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  router.patch('/api/meetings/items/:item_id', requireNBI, async (req, res) => {
    const { item_id } = req.params;
    const { data } = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data object is required' });
    try {
      const updated = await mi.updateItem(pool, item_id, data);
      if (!updated) return res.status(404).json({ error: 'Item not found' });
      res.json(updated);
    } catch (err) {
      console.error('meetings update error:', err);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  router.delete('/api/meetings/items/:item_id', requireNBI, async (req, res) => {
    try {
      const deleted = await mi.deleteItem(pool, req.params.item_id);
      if (!deleted) return res.status(404).json({ error: 'Item not found' });
      res.json({ ok: true });
    } catch (err) {
      console.error('meetings delete error:', err);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  return router;
};
