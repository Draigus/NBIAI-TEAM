'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { log } = ctx;
  const warn = (method, path) => { log('warn', 'Hiring', `Retired endpoint hit: ${method} ${path}`); };

  // Return empty data instead of 410 — stale cached JS calls these and toasts the error.
  router.get('/api/candidates/:id/interviews', (req, res) => { warn('GET', req.path); res.json([]); });
  router.post('/api/candidates/:id/interviews', (req, res) => { warn('POST', req.path); res.json({}); });
  router.patch('/api/candidates/:id/interviews/:roundId', (req, res) => { warn('PATCH', req.path); res.json({}); });
  router.delete('/api/candidates/:id/interviews/:roundId', (req, res) => { warn('DELETE', req.path); res.status(204).end(); });
  router.get('/api/candidates/:id/interviews/:roundId/scorecards', (req, res) => { warn('GET', req.path); res.json([]); });
  router.post('/api/candidates/:id/interviews/:roundId/scorecards', (req, res) => { warn('POST', req.path); res.json({}); });
  router.patch('/api/candidates/:id/interviews/:roundId/scorecards/:scId', (req, res) => { warn('PATCH', req.path); res.json({}); });
  router.post('/api/candidates/:id/interviews/:roundId/scorecards/:scId/submit', (req, res) => { warn('POST', req.path); res.json({}); });

  return router;
};
