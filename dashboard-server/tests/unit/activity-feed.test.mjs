// dashboard-server/tests/unit/activity-feed.test.mjs
//
// Tests for the GET /api/activity endpoint.
// Verifies that the activity feed returns humanised audit log entries
// with pagination, filtering, and NBI-only access control.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const app = require('../../server.js');
const { mintSession } = require('../helpers/auth');
const { createTestUser } = require('../helpers/fixtures');

let token;

beforeAll(async () => {
  const admin = await createTestUser({ role: 'admin' });
  token = await mintSession(admin.id);
});

describe('GET /api/activity', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/activity');
    expect(res.status).toBe(401);
  });

  it('returns entries array with pagination fields', async () => {
    const res = await request(app)
      .get('/api/activity')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entries');
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body).toHaveProperty('hasMore');
  });

  it('entries have humanised summary fields', async () => {
    const res = await request(app)
      .get('/api/activity?limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (res.body.entries.length > 0) {
      const entry = res.body.entries[0];
      expect(entry).toHaveProperty('summary');
      expect(entry).toHaveProperty('actor');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('entityType');
      expect(entry).toHaveProperty('createdAt');
      expect(typeof entry.summary).toBe('string');
      expect(entry.summary.length).toBeGreaterThan(0);
    }
  });

  it('respects limit parameter', async () => {
    const res = await request(app)
      .get('/api/activity?limit=2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBeLessThanOrEqual(2);
  });

  it('filters by entity_type', async () => {
    const res = await request(app)
      .get('/api/activity?entity_type=task')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    for (const entry of res.body.entries) {
      expect(entry.entityType).toBe('task');
    }
  });

  it('supports cursor-based pagination', async () => {
    const first = await request(app)
      .get('/api/activity?limit=2')
      .set('Authorization', `Bearer ${token}`);
    if (first.body.nextCursor) {
      const second = await request(app)
        .get(`/api/activity?limit=2&cursor=${first.body.nextCursor}`)
        .set('Authorization', `Bearer ${token}`);
      expect(second.status).toBe(200);
      if (first.body.entries.length > 0 && second.body.entries.length > 0) {
        expect(second.body.entries[0].id).not.toBe(first.body.entries[0].id);
      }
    }
  });
});
