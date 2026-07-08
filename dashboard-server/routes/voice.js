'use strict';

const crypto = require('crypto');

function verifyInternalToken(presented, expected) {
  if (!expected || !presented || presented.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(presented, 'utf8'), Buffer.from(expected, 'utf8'));
}

function createVoiceRoutes({ pool, log, internalToken, dispatch }) {
  const router = require('express').Router();

  function requireInternal(req, res, next) {
    if (!verifyInternalToken(req.get('x-nbi-internal-token') || '', internalToken)) {
      return res.status(401).json({ error: 'unauthorised' });
    }
    next();
  }

  router.post('/api/internal/aios/voice-input', requireInternal, async (req, res) => {
    const { text, context } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const contextBlock = (context || [])
      .map(ex => `User: ${ex.user}\nAssistant: ${ex.assistant}`)
      .join('\n\n');

    const prompt = [
      'You are the NBI AIOS voice assistant. Respond conversationally and concisely (1-3 sentences).',
      'You have access to the AIOS action queue, signals, and work items.',
      'If the user asks to approve, reject, or act on something, do so and confirm.',
      'If you cannot fulfil a request, say so honestly.',
      '',
      contextBlock ? `Recent conversation:\n${contextBlock}\n` : '',
      `User says: ${text.trim()}`,
    ].filter(Boolean).join('\n');

    try {
      const result = await dispatch({
        prompt,
        model: 'claude-fable-5',
        cwd: process.cwd(),
        timeoutMs: 30000,
      });

      const responseText = (result.text || '').trim();
      log('info', 'Voice', 'Voice input processed', {
        input: text.substring(0, 100),
        responseLength: responseText.length,
      });

      res.json({
        response_text: responseText || 'I heard you but could not generate a response.',
        action_id: null,
      });
    } catch (err) {
      log('error', 'Voice', 'Voice dispatch failed', { error: err.message });
      res.status(500).json({
        response_text: "I'm having trouble processing that right now.",
        action_id: null,
      });
    }
  });

  return router;
}

module.exports = { createVoiceRoutes };
