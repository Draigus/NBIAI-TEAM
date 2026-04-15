// dashboard-server/tests/unit/calendar-date.test.mjs
//
// Regression test for the pg DATE column timezone bug that was silently
// dropping every calendar event off the monthly grid.
//
// Before the fix, pg's default DATE parser converted a pure DATE column
// into a JS Date at local midnight then serialised via toISOString() as
// UTC. On a BST box (UTC+1), '2026-04-16' came out as
// '2026-04-15T23:00:00.000Z' in the JSON response. The frontend then did
// `new Date(ev.start_date + 'T00:00:00')` which concatenated onto an
// already-ISO string and produced Invalid Date, silently dropping the
// event from the render loop.
//
// The fix: `pgTypes.setTypeParser(1082, v => v)` at the top of server.js
// makes DATE columns return as raw YYYY-MM-DD strings, which is what the
// frontend has always expected.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Calendar DATE columns — raw string pass-through', () => {
  it('GET /api/calendar-events returns start_date as YYYY-MM-DD, not an ISO timestamp', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    // Insert a pure DATE row directly into the DB
    await pool.query(
      `INSERT INTO calendar_events (user_id, title, event_type, start_date, end_date, visibility)
       VALUES ($1, 'Drunk day', 'uto', '2026-04-16', '2026-04-16', 'public')`,
      [u.id]
    );

    const res = await request(app)
      .get('/api/calendar-events?from=2026-03-25&to=2026-05-07')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    const ev = res.body[0];
    expect(ev.title).toBe('Drunk day');
    // The whole point of the fix: this must be a bare YYYY-MM-DD string,
    // NOT an ISO timestamp. The frontend calendar builder assumes raw DATE.
    expect(ev.start_date).toBe('2026-04-16');
    expect(ev.end_date).toBe('2026-04-16');
    // Must NOT contain a time component — that's the regression signal.
    expect(ev.start_date).not.toMatch(/T\d{2}:/);
    expect(ev.end_date).not.toMatch(/T\d{2}:/);
  });

  it('DATE round-trip via POST → GET preserves the calendar day', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    // Create via API (same path Glen used)
    const created = await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Round trip',
        event_type: 'vacation',
        start_date: '2026-04-16',
        end_date: '2026-04-16',
        visibility: 'public',
      });
    expect(created.status).toBe(201);
    expect(created.body.start_date).toBe('2026-04-16');

    // Fetch list and verify the same string comes back
    const list = await request(app)
      .get('/api/calendar-events?from=2026-04-01&to=2026-04-30')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);
    expect(list.body[0].start_date).toBe('2026-04-16');
  });
});
