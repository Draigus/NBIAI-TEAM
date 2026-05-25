'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { requireNBI } = ctx;
  const intel = require('../lib/intelligence');

  router.get('/api/intelligence/brief', requireNBI, (req, res) => {
    const brief = intel.readBrief();
    if (!brief) return res.status(404).json({ error: 'No intelligence brief found' });
    res.json(brief);
  });

  router.get('/api/intelligence/banks', requireNBI, (req, res) => {
    res.json(intel.readBanks());
  });

  router.get('/api/intelligence/research', requireNBI, (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json(intel.readResearchLog(limit));
  });

  router.get('/api/intelligence/pipeline', requireNBI, (req, res) => {
    const state = intel.readPipelineState();
    if (!state) return res.status(404).json({ error: 'No pipeline state found' });
    res.json(state);
  });

  router.get('/api/intelligence/extract/:source/:filename', requireNBI, (req, res) => {
    const { source, filename } = req.params;
    const allowed = ['claude_sessions', 'chatgpt', 'onedrive', 'downloads', 'gmail', 'granola', 'slack', 'web_research'];
    if (!allowed.includes(source)) return res.status(400).json({ error: 'Invalid source' });
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const extract = intel.readExtract(source, filename);
    if (!extract) return res.status(404).json({ error: 'Extract not found' });
    res.json(extract);
  });

  return router;
};
