import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('PATCH /api/tasks/:id — date validation', () => {
  async function createTask() {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, status, item_type) VALUES ('Test Task', 'Not started', 'task') RETURNING id`
    );
    return rows[0].id;
  }

  it('rejects a 5-digit year in due_date', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const taskId = await createTask();

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ due_date: '20266-05-07' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/year/i);
  });

  it('rejects a 5-digit year in start_date', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const taskId = await createTask();

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ start_date: '20266-01-01' });

    expect(res.status).toBe(400);
  });

  it('accepts a valid 4-digit year', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const taskId = await createTask();

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ due_date: '2026-05-07' });

    expect(res.status).toBe(200);
  });

  it('accepts an empty date (clearing a field)', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const taskId = await createTask();

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ due_date: '' });

    expect(res.status).toBe(200);
  });
});
