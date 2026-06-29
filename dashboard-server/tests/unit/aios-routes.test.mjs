import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const express = require('express');
const request = require('supertest');

function makeMockPool() {
  const q = [];
  return {
    query: vi.fn().mockImplementation(() => Promise.resolve(q.shift() || { rows: [], rowCount: 0 })),
    _push: (r) => q.push(r),
  };
}

function buildApp(pool, opts = {}) {
  const app = express();
  app.use(express.json());
  const log = vi.fn();
  const requireAdmin = (req, res, next) => { req.user = { username: 'glen', role: 'admin' }; next(); };
  const auditLog = vi.fn().mockResolvedValue();
  const broker = {
    configured: opts.brokerConfigured !== false,
    validateDestination: vi.fn().mockReturnValue({ valid: true }),
    queueMessage: vi.fn().mockResolvedValue({ id: 'q-1' }),
    processQueue: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
    getQueueStatus: vi.fn().mockResolvedValue({ pending: 0, sent: 5 }),
  };
  const internalToken = 'test-internal-token';

  const { createInternalRoutes, createAdminRoutes } = require('../../routes/aios');
  app.use(createInternalRoutes({ pool, log, broker, internalToken }));
  app.use(createAdminRoutes({ pool, log, requireAdmin, auditLog, broker }));
  return { app, broker };
}

describe('AIOS internal routes (cadence)', () => {
  let pool, app;
  beforeEach(() => { pool = makeMockPool(); ({ app } = buildApp(pool)); });

  it('POST /api/internal/aios/actions creates an action with valid token', async () => {
    pool._push({ rows: [{ id: 'a-1', title: 'Morning Brief' }], rowCount: 1 });
    const res = await request(app)
      .post('/api/internal/aios/actions')
      .set('x-nbi-internal-token', 'test-internal-token')
      .send({ source_system: 'cadence', action_type: 'task', title: 'Morning Brief', idempotency_key: 'test:1' })
      .expect(200);
    expect(res.body.id).toBe('a-1');
  });

  it('POST /api/internal/aios/actions rejects without token', async () => {
    await request(app)
      .post('/api/internal/aios/actions')
      .send({ source_system: 'cadence', action_type: 'task', title: 'Test', idempotency_key: 'test:2' })
      .expect(401);
  });

  it('POST /api/internal/aios/actions rejects invalid action_type', async () => {
    const res = await request(app)
      .post('/api/internal/aios/actions')
      .set('x-nbi-internal-token', 'test-internal-token')
      .send({ source_system: 'cadence', action_type: 'invalid_type', title: 'Test', idempotency_key: 'test:3' })
      .expect(400);
    expect(res.body.error).toContain('invalid action_type');
  });

  it('POST /api/internal/aios/actions rejects missing required fields', async () => {
    await request(app)
      .post('/api/internal/aios/actions')
      .set('x-nbi-internal-token', 'test-internal-token')
      .send({ source_system: 'cadence' })
      .expect(400);
  });

  it('POST /api/internal/aios/actions rejects missing idempotency_key', async () => {
    const res = await request(app)
      .post('/api/internal/aios/actions')
      .set('x-nbi-internal-token', 'test-internal-token')
      .send({ source_system: 'cadence', action_type: 'task', title: 'Test' })
      .expect(400);
    expect(res.body.error).toContain('idempotency_key');
  });

  it('POST /api/internal/aios/actions rejects invalid risk_class', async () => {
    const res = await request(app)
      .post('/api/internal/aios/actions')
      .set('x-nbi-internal-token', 'test-internal-token')
      .send({ source_system: 'cadence', action_type: 'task', title: 'Test', idempotency_key: 'test:4', risk_class: 'extreme' })
      .expect(400);
    expect(res.body.error).toContain('invalid risk_class');
  });

  it('POST /api/internal/aios/actions rejects invalid confidence', async () => {
    const res = await request(app)
      .post('/api/internal/aios/actions')
      .set('x-nbi-internal-token', 'test-internal-token')
      .send({ source_system: 'cadence', action_type: 'task', title: 'Test', idempotency_key: 'test:5', confidence: 'very_high' })
      .expect(400);
    expect(res.body.error).toContain('invalid confidence');
  });

  it('POST /api/internal/aios/outbound/send-and-process queues and processes', async () => {
    const res = await request(app)
      .post('/api/internal/aios/outbound/send-and-process')
      .set('x-nbi-internal-token', 'test-internal-token')
      .send({ actionId: 'a-1', destinationType: 'slack_dm', destinationId: 'U_GLEN', text: 'Brief' })
      .expect(200);
    expect(res.body.queued).toBe(true);
    expect(res.body.processed.sent).toBe(1);
  });

  it('POST /api/internal/aios/outbound/send-and-process returns 503 when broker unconfigured', async () => {
    const { app: unconfiguredApp } = buildApp(pool, { brokerConfigured: false });
    const res = await request(unconfiguredApp)
      .post('/api/internal/aios/outbound/send-and-process')
      .set('x-nbi-internal-token', 'test-internal-token')
      .send({ actionId: 'a-1', destinationType: 'slack_dm', destinationId: 'U_GLEN', text: 'Brief' })
      .expect(503);
    expect(res.body.error).toContain('not configured');
  });

  it('POST /api/internal/aios/outbound/send-and-process rejects missing fields', async () => {
    await request(app)
      .post('/api/internal/aios/outbound/send-and-process')
      .set('x-nbi-internal-token', 'test-internal-token')
      .send({ actionId: 'a-1' })
      .expect(400);
  });
});

describe('AIOS admin routes (Glen UI)', () => {
  let pool, app;
  beforeEach(() => { pool = makeMockPool(); ({ app } = buildApp(pool)); });

  it('GET /api/aios/actions returns pending actions', async () => {
    pool._push({ rows: [{ id: 'a1', title: 'Test', approval_state: 'pending' }] });
    const res = await request(app).get('/api/aios/actions').expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /api/aios/actions rejects invalid state', async () => {
    const res = await request(app).get('/api/aios/actions?state=bogus').expect(400);
    expect(res.body.error).toContain('invalid state');
  });

  it('PATCH /api/aios/actions/:id/approve updates state', async () => {
    pool._push({ rows: [{ id: 'a1', approval_state: 'approved' }], rowCount: 1 });
    const res = await request(app).patch('/api/aios/actions/a1/approve').expect(200);
    expect(res.body.approval_state).toBe('approved');
  });

  it('PATCH /api/aios/actions/:id/reject updates state', async () => {
    pool._push({ rows: [{ id: 'a1', approval_state: 'rejected' }], rowCount: 1 });
    const res = await request(app)
      .patch('/api/aios/actions/a1/reject')
      .send({ reason: 'Not needed' })
      .expect(200);
    expect(res.body.approval_state).toBe('rejected');
  });

  it('PATCH /api/aios/actions/:id/approve returns 404 for missing action', async () => {
    pool._push({ rows: [], rowCount: 0 });
    await request(app).patch('/api/aios/actions/nonexistent/approve').expect(404);
  });

  it('GET /api/aios/outbound/status returns queue counts', async () => {
    const res = await request(app).get('/api/aios/outbound/status').expect(200);
    expect(res.body).toHaveProperty('sent');
  });
});
