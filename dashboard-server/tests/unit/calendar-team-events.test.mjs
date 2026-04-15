// dashboard-server/tests/unit/calendar-team-events.test.mjs
//
// Regression tests for team calendar events (bug d4367137, 2026-04-15).
// Members can create team events only for teams they belong to; admins
// can create team events for any team. GET joins team_name for the
// frontend to render. Non-members never see private team events.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

async function createTeam(name) {
  const { rows } = await pool.query('INSERT INTO teams (name) VALUES ($1) RETURNING id', [name]);
  return rows[0].id;
}

async function addMember(teamId, userId) {
  await pool.query('INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [teamId, userId]);
}

describe('calendar_events team events', () => {
  it('member can create a team event for a team they belong to', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const teamId = await createTeam('Platform');
    await addMember(teamId, member.id);

    const res = await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Team Offsite',
        event_type: 'business',
        start_date: '2026-05-01',
        end_date: '2026-05-02',
        team_id: teamId,
        visibility: 'team',
      });
    expect(res.status).toBe(201);
    expect(res.body.team_id).toBe(teamId);
    expect(res.body.user_id).toBeNull();
  });

  it('rejects a team event when the member is not on that team', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const teamId = await createTeam('ExclusiveTeam');
    // Deliberately NOT adding member to team

    const res = await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Sneak peek',
        event_type: 'business',
        start_date: '2026-05-01',
        team_id: teamId,
      });
    expect(res.status).toBe(403);
  });

  it('admin can create a team event for any team, even without membership', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const teamId = await createTeam('AnyTeam');

    const res = await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Strategy Day',
        event_type: 'business',
        start_date: '2026-05-10',
        team_id: teamId,
      });
    expect(res.status).toBe(201);
    expect(res.body.team_id).toBe(teamId);
  });

  it('GET returns team_name joined on team events', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const teamId = await createTeam('Brand');

    await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Team Meeting',
        event_type: 'business',
        start_date: '2026-05-15',
        team_id: teamId,
      });

    const r = await request(app)
      .get('/api/calendar-events?from=2026-05-01&to=2026-05-31')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    const ev = r.body.find(e => e.title === 'Team Meeting');
    expect(ev).toBeDefined();
    expect(ev.team_id).toBe(teamId);
    expect(ev.team_name).toBe('Brand');
  });

  it('team members see the team event, non-members do not', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const member = await createTestUser({ role: 'member' });
    const outsider = await createTestUser({ role: 'member' });
    const adminTok = await mintSession(admin.id);
    const memberTok = await mintSession(member.id);
    const outsiderTok = await mintSession(outsider.id);

    const teamId = await createTeam('Alpha');
    await addMember(teamId, member.id);

    // Admin creates a private team event
    await request(app)
      .post('/api/calendar-events')
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        title: 'Private Ping',
        event_type: 'business',
        start_date: '2026-06-01',
        team_id: teamId,
        visibility: 'team',
      });

    const memberList = await request(app)
      .get('/api/calendar-events?from=2026-06-01&to=2026-06-30')
      .set('Authorization', `Bearer ${memberTok}`);
    expect(memberList.body.some(e => e.title === 'Private Ping')).toBe(true);

    const outsiderList = await request(app)
      .get('/api/calendar-events?from=2026-06-01&to=2026-06-30')
      .set('Authorization', `Bearer ${outsiderTok}`);
    expect(outsiderList.body.some(e => e.title === 'Private Ping')).toBe(false);
  });
});
