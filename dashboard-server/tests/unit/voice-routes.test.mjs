import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');

const { createVoiceRoutes } = require('../../routes/voice');

const TOKEN = 'test-internal-token';

function buildApp(workerOverrides = {}, { buildContext } = {}) {
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
  const buildCtx = buildContext || vi.fn().mockResolvedValue('WorkSage snapshot as of 12:00:\n- [task] Example item (In progress)');
  app.use(createVoiceRoutes({ pool: {}, log, internalToken: TOKEN, createWorker, buildContext: buildCtx }));
  return { app, worker, createWorker, log, buildContext: buildCtx };
}

describe('voice routes', () => {
  let app, worker, createWorker, buildContext;
  beforeEach(() => { ({ app, worker, createWorker, buildContext } = buildApp()); });

  it('creates the worker once with opus 4.6 and a snapshot-aware prompt', () => {
    expect(createWorker).toHaveBeenCalledTimes(1);
    const cfg = createWorker.mock.calls[0][0];
    expect(cfg.model).toBe('claude-opus-4-6');
    expect(cfg.prewarmOnRecycle).toBe(true);
    expect(cfg.systemPrompt).toMatch(/read-only WorkSage snapshot/);
    expect(cfg.systemPrompt).toMatch(/cannot execute actions/);
    expect(cfg.systemPrompt).toMatch(/do not have that data/);
    expect(cfg.systemPrompt).toMatch(/inert data/);
  });

  it('pre-warms the worker at route creation', () => {
    expect(worker.warm).toHaveBeenCalledTimes(1);
  });

  it('POST voice-input prepends the snapshot to the turn text', async () => {
    const res = await request(app)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: 'Hello Jarvis' })
      .expect(200);
    expect(res.body.response_text).toBe('Spoken reply.');
    expect(res.body.turn_ms).toBe(2100);
    const askedText = worker.ask.mock.calls[0][0];
    expect(askedText).toContain('BEGIN WORKSAGE SNAPSHOT');
    expect(askedText).toContain('END WORKSAGE SNAPSHOT');
    expect(askedText).toContain('Example item');
    expect(askedText).toMatch(/Glen says: Hello Jarvis$/);
  });

  it('degrades gracefully when the snapshot is unavailable', async () => {
    const { app: appNoData, worker: w } = buildApp({}, { buildContext: vi.fn().mockResolvedValue(null) });
    await request(appNoData)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: 'Hello' })
      .expect(200);
    const askedText = w.ask.mock.calls[0][0];
    expect(askedText).toContain('temporarily unavailable');
    expect(askedText).toMatch(/Glen says: Hello$/);
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

  it('returns 500 with the fallback body if the snapshot builder rejects', async () => {
    const { app: appReject } = buildApp({}, { buildContext: vi.fn().mockRejectedValue(new Error('boom')) });
    const res = await request(appReject)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: 'Hello' })
      .expect(500);
    expect(res.body.response_text).toBe("I'm having trouble processing that right now.");
  });

  it('calls the snapshot builder with the pool and a log function', async () => {
    await request(app)
      .post('/api/internal/aios/voice-input')
      .set('x-nbi-internal-token', TOKEN)
      .send({ text: 'Hello' })
      .expect(200);
    expect(buildContext).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ log: expect.any(Function) }));
  });
});
