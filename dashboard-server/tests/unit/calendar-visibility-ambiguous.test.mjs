// dashboard-server/tests/unit/calendar-visibility-ambiguous.test.mjs
//
// Regression test for the production 500 on GET /api/calendar-events
// (2026-07-15, hit Stavros repeatedly): "column reference client_id is
// ambiguous". The visibility clause built by buildCalendarVisibilityClause
// used unqualified column names, which broke once migration 026 added
// client_id to users — the list query joins users u, so client_id could
// refer to ce.client_id or u.client_id.
//
// The failing branch only activates for a NON-admin user who has at least
// one assigned task with a client_id (assignedClientIds.length > 0 adds
// the ambiguous `client_id = ANY(...)` predicate). Admins short-circuit
// to TRUE, which is why the bug never hit Glen.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('calendar_events visibility clause column qualification', () => {
  it('non-admin member with assigned client tasks can list events (no ambiguous client_id 500)', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const client = await createTestClient({ name: 'Ambiguity Test Client' });
    // Assigning a client task to the member is what activates the
    // client-visibility branch of the WHERE clause.
    await createTestTask({ client_id: client.id, assignees: [member.display_name] });

    const res = await request(app)
      .get('/api/calendar-events?from=2026-07-01&to=2026-07-31')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('member sees a client-visibility event for a client they are assigned to', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const adminToken = await mintSession(admin.id);
    const member = await createTestUser({ role: 'member' });
    const memberToken = await mintSession(member.id);
    const client = await createTestClient({ name: 'Shared Client' });
    await createTestTask({ client_id: client.id, assignees: [member.display_name] });

    const create = await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Client Workshop',
        event_type: 'business',
        start_date: '2026-07-10',
        client_id: client.id,
        visibility: 'client',
      });
    expect(create.status).toBe(201);

    const res = await request(app)
      .get('/api/calendar-events?from=2026-07-01&to=2026-07-31')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.map(e => e.title)).toContain('Client Workshop');
  });

  it('single-event GET also works for a non-admin with assigned client tasks', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const adminToken = await mintSession(admin.id);
    const member = await createTestUser({ role: 'member' });
    const memberToken = await mintSession(member.id);
    const client = await createTestClient({ name: 'Detail Client' });
    await createTestTask({ client_id: client.id, assignees: [member.display_name] });

    const create = await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Client Review',
        event_type: 'business',
        start_date: '2026-07-15',
        client_id: client.id,
        visibility: 'client',
      });
    expect(create.status).toBe(201);

    const res = await request(app)
      .get(`/api/calendar-events/${create.body.id}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Client Review');
  });
});
