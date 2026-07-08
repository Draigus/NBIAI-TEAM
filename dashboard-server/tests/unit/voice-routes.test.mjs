import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');

const { createVoiceRoutes } = require('../../routes/voice');

const TOKEN = 'test-internal-token';

function buildApp(workerOverrides = {}) {
  const app = express();
  app.use(express.json());
  const log = vi.fn();
  const worker = {
    ask: vi.fn().mockResolvedValue({ text: 'Spoken reply.', durationMs: 2100 }),
    warm: vi.fn().mockResolvedValue(null),
    stop: vi.fn(),
    status: vi.fn().mockReturnValue({ running: true, exchanges: 3, queued: 0, busy: false }),
    ...workerOverrides,
  };
  const createWorker = vi.fn().mockReturnValue(worker);
  app.use(createVoiceRoutes({ pool: {}, log, internalToken: TOKEN, createWorker }));
  return { app, worker, createWorker, log };
}

describe('voice routes', () => {
  let app, worker, createWorker;
  beforeEach(() => { ({ app, worker, createWorker } = buildApp()); });

  it('creates the worker once with opus 4.6 and a no-capability-claims prompt', () => {
    expect(createWorker).toHaveBeenCalledTimes(1);
    const cfg = createWorker.mock.calls[0][0];
    expect(cfg.model).toBe('claude-opus-4-6');
    expect(cfg.prewarmOnRecycle).toBe(true);
    expect(cfg.systemPrompt).toMatch(/no tools and no live access/);
    expect(cfg.systemPrompt).toMatch(/Never claim you can look something up/);
    expect(cfg.systemPrompt).not.toMatch(/do so and confirm/);
  });

  it('pre-warms the worker at route creation', () => {
    expect(worker.warm).toHaveBeenCalledTimes(1);
  });

  it('POST voice-input returns the worker reply with valid token', async () => {
    const res = await request(app)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: 'Hello Jarvis' })
      .expect(200);
    expect(res.body.response_text).toBe('Spoken reply.');
    expect(res.body.turn_ms).toBe(2100);
    expect(worker.ask).toHaveBeenCalledWith('Hello Jarvis', { freshContext: '' });
  });

  it('passes rolling context as freshContext', async () => {
    await request(app)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: 'and now?', context: [{ user: 'hi', assistant: 'hello' }] })
      .expect(200);
    const opts = worker.ask.mock.calls[0][1];
    expect(opts.freshContext).toContain('Recent conversation:');
    expect(opts.freshContext).toContain('User: hi');
    expect(opts.freshContext).toContain('Assistant: hello');
  });

  it('rejects without token', async () => {
    await request(app)
      .post('/api/internal/aios/voice-input')
      .send({ text: 'Hello' })
      .expect(401);
    expect(worker.ask).not.toHaveBeenCalled();
  });

  it('rejects wrong token', async () => {
    await request(app)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', 'wrong')
      .send({ text: 'Hello' })
      .expect(401);
  });

  it('rejects empty text', async () => {
    await request(app)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: '   ' })
      .expect(400);
    expect(worker.ask).not.toHaveBeenCalled();
  });

  it('returns a spoken fallback when the worker turn fails', async () => {
    ({ app, worker } = buildApp({ ask: vi.fn().mockRejectedValue(new Error('timed out')) }));
    const res = await request(app)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: 'Hello' })
      .expect(500);
    expect(res.body.response_text).toMatch(/trouble processing/);
  });

  it('GET voice-status reports model and worker state with valid token', async () => {
    const res = await request(app)
      .get('/api/internal/aios/voice-status')
      .set('x-nbi-internal-token', TOKEN)
      .expect(200);
    expect(res.body.model).toBe('claude-opus-4-6');
    expect(res.body.worker.exchanges).toBe(3);
  });

  it('GET voice-status rejects without token', async () => {
    await request(app).get('/api/internal/aios/voice-status').expect(401);
  });
});
