'use strict';

const crypto = require('crypto');

function verifyInternalToken(presented, expected) {
  if (!expected || !presented || presented.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(presented, 'utf8'), Buffer.from(expected, 'utf8'));
}

function createInternalRoutes({ pool, log, broker, internalToken }) {
  const router = require('express').Router();

  function requireInternal(req, res, next) {
    if (!verifyInternalToken(req.get('x-nbi-internal-token') || '', internalToken)) {
      return res.status(401).json({ error: 'unauthorised' });
    }
    next();
  }

  router.post('/api/internal/aios/actions', requireInternal, async (req, res) => {
    const { source_system, source_id, source_timestamp, source_quote, action_type,
            title, description, proposed_action, risk_class, owner, due_date,
            confidence, approval_state, created_by_routine, idempotency_key } = req.body || {};
    if (!source_system || !action_type || !title) {
      return res.status(400).json({ error: 'source_system, action_type, and title required' });
    }
    if (!idempotency_key) {
      return res.status(400).json({ error: 'idempotency_key is required' });
    }
    const validTypes = ['task', 'draft', 'incident', 'proposal', 'risk', 'decision'];
    if (!validTypes.includes(action_type)) {
      return res.status(400).json({ error: `invalid action_type: ${action_type}` });
    }
    const validRiskClasses = ['low', 'medium', 'high', 'critical'];
    if (risk_class && !validRiskClasses.includes(risk_class)) {
      return res.status(400).json({ error: `invalid risk_class: ${risk_class}` });
    }
    const validConfidence = ['low', 'medium', 'high'];
    if (confidence && !validConfidence.includes(confidence)) {
      return res.status(400).json({ error: `invalid confidence: ${confidence}` });
    }
    const validApprovalStates = ['pending', 'approved', 'rejected', 'snoozed'];
    if (approval_state && !validApprovalStates.includes(approval_state)) {
      return res.status(400).json({ error: `invalid approval_state: ${approval_state}` });
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO aios_actions (source_system, source_id, source_timestamp, source_quote,
           action_type, title, description, proposed_action, risk_class, owner, due_date,
           confidence, approval_state, created_by_routine, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [source_system, source_id || null, source_timestamp || null, source_quote || null,
         action_type, title, description || null, proposed_action || null,
         risk_class || 'low', owner || 'glen', due_date || null,
         confidence || null, approval_state || 'pending', created_by_routine || null,
         idempotency_key || null]
      );
      res.json(rows[0]);
    } catch (err) {
      log('error', 'AIOS-internal', 'Action create failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });

  router.post('/api/internal/aios/outbound/send-and-process', requireInternal, async (req, res) => {
    const { actionId, destinationType, destinationId, text, reason } = req.body || {};
    if (!actionId || !destinationType || !destinationId || !text) {
      return res.status(400).json({ error: 'actionId, destinationType, destinationId, and text required' });
    }
    if (!broker.configured) {
      return res.status(503).json({ error: 'Outbound broker not configured -- set GLEN_SLACK_USER_ID and SLACK_BOT_TOKEN' });
    }
    try {
      const queued = await broker.queueMessage({ actionId, destinationType, destinationId, draftText: text, reason: reason || '' });
      const processed = await broker.processQueue();
      res.json({ queued: true, id: queued.id, processed });
    } catch (err) {
      log('error', 'AIOS-internal', 'Send-and-process failed', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}

function createAdminRoutes({ pool, log, requireAdmin, auditLog, broker }) {
  const router = require('express').Router();

  router.get('/api/aios/actions', requireAdmin, async (req, res) => {
    const state = req.query.state || 'pending';
    const validStates = ['pending', 'approved', 'rejected', 'snoozed'];
    if (!validStates.includes(state)) {
      return res.status(400).json({ error: `invalid state: ${state}` });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    try {
      const { rows } = await pool.query(
        'SELECT * FROM aios_actions WHERE approval_state = $1 ORDER BY created_at DESC LIMIT $2',
        [state, limit]
      );
      res.json(rows);
    } catch (err) {
      log('error', 'AIOS-admin', 'List actions failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });

  router.get('/api/aios/actions/:id', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM aios_actions WHERE id = $1', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      log('error', 'AIOS-admin', 'Get action failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });

  router.patch('/api/aios/actions/:id/approve', requireAdmin, async (req, res) => {
    const { feedback } = req.body || {};
    try {
      const { rows } = await pool.query(
        `UPDATE aios_actions SET approval_state = 'approved', feedback_signal = $2, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id, feedback || 'approved_unchanged']
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      await auditLog(req.user.username, 'aios_action_approved', { actionId: req.params.id });
      res.json(rows[0]);
    } catch (err) {
      log('error', 'AIOS-admin', 'Approve failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });

  router.patch('/api/aios/actions/:id/reject', requireAdmin, async (req, res) => {
    const { reason, feedback } = req.body || {};
    try {
      const { rows } = await pool.query(
        `UPDATE aios_actions SET approval_state = 'rejected', dismissal_reason = $2, feedback_signal = $3, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id, reason || '', feedback || 'rejected_not_worth']
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      await auditLog(req.user.username, 'aios_action_rejected', { actionId: req.params.id, reason });
      res.json(rows[0]);
    } catch (err) {
      log('error', 'AIOS-admin', 'Reject failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });

  router.patch('/api/aios/actions/:id/snooze', requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `UPDATE aios_actions SET approval_state = 'snoozed', feedback_signal = 'snoozed', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      log('error', 'AIOS-admin', 'Snooze failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });

  router.get('/api/aios/outbound/status', requireAdmin, async (req, res) => {
    try {
      res.json(await broker.getQueueStatus());
    } catch (err) {
      log('error', 'AIOS-admin', 'Queue status failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });

  return router;
}

module.exports = { createInternalRoutes, createAdminRoutes };
