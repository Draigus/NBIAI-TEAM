'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { log } = ctx;
  const retiredMsg = { error: 'This endpoint has been retired. Use /api/interview-configs instead.' };
  const warn = (method, path) => { log('warn', 'Hiring', `Retired endpoint hit: ${method} ${path}`); };

  router.get('/api/candidates/:id/interviews', (req, res) => { warn('GET', req.path); res.status(410).json(retiredMsg); });
  router.post('/api/candidates/:id/interviews', (req, res) => { warn('POST', req.path); res.status(410).json(retiredMsg); });
  router.patch('/api/candidates/:id/interviews/:roundId', (req, res) => { warn('PATCH', req.path); res.status(410).json(retiredMsg); });
  router.delete('/api/candidates/:id/interviews/:roundId', (req, res) => { warn('DELETE', req.path); res.status(410).json(retiredMsg); });
  router.get('/api/candidates/:id/interviews/:roundId/scorecards', (req, res) => { warn('GET', req.path); res.status(410).json(retiredMsg); });
  router.post('/api/candidates/:id/interviews/:roundId/scorecards', (req, res) => { warn('POST', req.path); res.status(410).json(retiredMsg); });
  router.patch('/api/candidates/:id/interviews/:roundId/scorecards/:scId', (req, res) => { warn('PATCH', req.path); res.status(410).json(retiredMsg); });
  router.post('/api/candidates/:id/interviews/:roundId/scorecards/:scId/submit', (req, res) => { warn('POST', req.path); res.status(410).json(retiredMsg); });

  return router;
};
