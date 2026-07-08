'use strict';

const crypto = require('crypto');

const VOICE_MODEL = 'claude-opus-4-6';

const SYSTEM_PROMPT = [
  'You are the NBI AIOS voice assistant. Respond conversationally and concisely (1-3 sentences).',
  'Your replies are spoken aloud by TTS, so use plain prose: no markdown, no lists, no code.',
  'You can answer questions and discuss the AIOS, but you cannot yet execute actions;',
  'if asked to approve, reject, or change something, say you will flag it for Glen rather than claiming it is done.',
  'If you cannot answer a request, say so honestly.',
].join('\n');

function verifyInternalToken(presented, expected) {
  if (!expected || !presented || presented.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(presented, 'utf8'), Buffer.from(expected, 'utf8'));
}

function buildContextBlock(context) {
  const block = (context || [])
    .map(ex => `User: ${ex.user}\nAssistant: ${ex.assistant}`)
    .join('\n\n');
  return block ? `Recent conversation:\n${block}` : '';
}

function createVoiceRoutes({ pool, log, internalToken, createWorker }) {
  const router = require('express').Router();

  const worker = createWorker({
    model: VOICE_MODEL,
    cwd: process.cwd(),
    systemPrompt: SYSTEM_PROMPT,
    turnTimeoutMs: 60000,
    log,
  });

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

    try {
      const result = await worker.ask(text.trim(), {
        freshContext: buildContextBlock(context),
      });

      const responseText = result.text;
      log('info', 'Voice', 'Voice input processed', {
        input: text.substring(0, 100),
        responseLength: responseText.length,
        turnMs: result.durationMs,
      });

      res.json({
        response_text: responseText || 'I heard you but could not generate a response.',
        action_id: null,
        turn_ms: result.durationMs,
      });
    } catch (err) {
      log('error', 'Voice', 'Voice worker turn failed', { error: err.message });
      res.status(500).json({
        response_text: "I'm having trouble processing that right now.",
        action_id: null,
      });
    }
  });

  router.get('/api/internal/aios/voice-status', requireInternal, (req, res) => {
    res.json({ model: VOICE_MODEL, worker: worker.status() });
  });

  return router;
}

module.exports = { createVoiceRoutes };
