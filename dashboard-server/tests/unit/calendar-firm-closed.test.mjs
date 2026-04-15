// dashboard-server/tests/unit/calendar-firm-closed.test.mjs
//
// Regression tests for the new admin-only firm_closed event type
// (D92, 2026-04-15). Members can create vacation/sick_leave/uto, but
// only admins can create or edit firm_closed (Christmas shutdown,
// company-wide offsite, etc.). Distinct from bank_holiday which is
// UK statutory and anyone can create.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('calendar_events firm_closed event type', () => {
  it('rejects a non-admin POST with firm_closed', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const res = await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Sneaky closure',
        event_type: 'firm_closed',
        start_date: '2026-04-20',
        visibility: 'public',
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('accepts an admin POST with firm_closed', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const res = await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Christmas shutdown',
        event_type: 'firm_closed',
        start_date: '2026-12-24',
        end_date: '2026-12-31',
        visibility: 'public',
      });
    expect(res.status).toBe(201);
    expect(res.body.event_type).toBe('firm_closed');
    expect(res.body.start_date).toBe('2026-12-24');
    expect(res.body.end_date).toBe('2026-12-31');
  });

  it('rejects a non-admin PATCH that tries to set event_type=firm_closed', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    // Member creates a regular vacation first
    const created = await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Personal day',
        event_type: 'vacation',
        start_date: '2026-05-01',
        visibility: 'team',
      });
    expect(created.status).toBe(201);
    // Member tries to upgrade it to a firm closure
    const updated = await request(app)
      .patch(`/api/calendar-events/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ event_type: 'firm_closed' });
    expect(updated.status).toBe(403);
  });

  it('still accepts regular member event types (vacation, sick_leave, uto)', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    for (const eventType of ['vacation', 'sick_leave', 'uto', 'bank_holiday']) {
      const res = await request(app)
        .post('/api/calendar-events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test ' + eventType,
          event_type: eventType,
          start_date: '2026-06-15',
          visibility: 'team',
        });
      expect(res.status, `event_type ${eventType} should succeed for member`).toBe(201);
    }
  });
});
