// dashboard-server/tests/unit/correlation-id.test.mjs
//
// Tests for the request correlation ID middleware.
// Verifies that every response carries an X-Request-Id header,
// that client-supplied IDs are echoed back, and that missing
// IDs are auto-generated as valid UUIDs.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const app = require('../../server.js');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('correlation ID middleware', () => {
  it('auto-generates X-Request-Id when none is supplied', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(UUID_RE);
  });

  it('echoes back a client-supplied X-Request-Id', async () => {
    const customId = 'test-trace-abc-123';
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', customId);
    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('generates unique IDs across requests', async () => {
    const res1 = await request(app).get('/api/health');
    const res2 = await request(app).get('/api/health');
    expect(res1.headers['x-request-id']).not.toBe(res2.headers['x-request-id']);
  });
});
