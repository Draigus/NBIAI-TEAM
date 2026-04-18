import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Dashboard snapshots', () => {
  async function setup() {
    const client = await createTestClient({ name: 'Test Client' });
    const admin = await createTestUser({ username: 'admin_snap', role: 'admin' });
    const token = await mintSession(admin.id);
    await createTestTask({ title: 'Active Task', client_id: client.id, status: 'In progress' });
    await createTestTask({ title: 'Done Task', client_id: client.id, status: 'Done' });
    await createTestTask({ title: 'Overdue Task', client_id: client.id, status: 'In progress', due_date: '2020-01-01' });
    return { client, admin, token };
  }

  it('GET /api/dashboard/snapshots returns 401 without auth', async () => {
    const res = await request(app).get('/api/dashboard/snapshots');
    expect(res.status).toBe(401);
  });

  it('GET /api/dashboard/snapshots returns empty array when no snapshots exist', async () => {
    const { token } = await setup();
    const res = await request(app)
      .get('/api/dashboard/snapshots')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.snapshots).toEqual([]);
  });

  it('GET /api/dashboard/snapshots returns inserted snapshots', async () => {
    const { token } = await setup();
    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed)
       VALUES ($1, 5, 2, 1, 3, 10.5, 40.0, 20, 5, 8)`,
      [today]
    );
    const res = await request(app)
      .get('/api/dashboard/snapshots?days=7')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.snapshots.length).toBe(1);
    expect(res.body.snapshots[0].active_projects).toBe(5);
    expect(res.body.snapshots[0].overdue_count).toBe(2);
  });

  it('days parameter is clamped to 1-365', async () => {
    const { token } = await setup();
    const res = await request(app)
      .get('/api/dashboard/snapshots?days=9999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
