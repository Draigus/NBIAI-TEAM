// dashboard-server/tests/unit/sync.test.mjs
//
// Regression test for the sync endpoint's malformed array literal bug.
//
// Symptom: PM2 logs showed "malformed array literal: \"{{}}\"" every
// 10-30 seconds from POST /api/sync/changes because the frontend was
// occasionally sending task.assignees or task.dependencies as [[]]
// (a nested empty array) instead of []. Postgres text[] columns reject
// the literal that shape produces.
//
// Fix: server-side normalisation in the sync loop that flattens + filters
// string values and logs a warning when a bad shape was observed, so we
// keep visibility into the frontend source while the server stops failing.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('POST /api/sync/changes — array field normalisation', () => {
  it('accepts nested empty arrays without 500 (the [[]] bug)', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    // Pre-create a task so the upsert hits the UPDATE path
    const { rows: created } = await pool.query(
      `INSERT INTO tasks (title, status, item_type, assignees, dependencies)
       VALUES ('existing', 'Not started', 'project', '{}', '{}')
       RETURNING id, updated_at`
    );
    const taskId = created[0].id;
    const taskUpdatedAt = created[0].updated_at;

    const res = await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        changes: [
          {
            action: 'upsert',
            entity: 'task',
            data: {
              id: taskId,
              title: 'existing (edited)',
              status: 'Not started',
              item_type: 'project',
              assignees: [[]],          // ← the bad shape
              dependencies: [[]],       // ← the bad shape
              _serverUpdatedAt: taskUpdatedAt,
            },
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(1);

    const { rows } = await pool.query(
      `SELECT title, assignees, dependencies FROM tasks WHERE id = $1`,
      [taskId]
    );
    expect(rows[0].title).toBe('existing (edited)');
    expect(rows[0].assignees).toEqual([]);
    expect(rows[0].dependencies).toEqual([]);
  });

  it('accepts well-formed arrays unchanged', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const { rows: created } = await pool.query(
      `INSERT INTO tasks (title, status, item_type, assignees, dependencies)
       VALUES ('t', 'Not started', 'project', '{}', '{}')
       RETURNING id, updated_at`
    );

    const res = await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        changes: [
          {
            action: 'upsert',
            entity: 'task',
            data: {
              id: created[0].id,
              title: 't',
              status: 'Not started',
              item_type: 'project',
              assignees: ['alice', 'bob'],
              dependencies: [],
              _serverUpdatedAt: created[0].updated_at,
            },
          },
        ],
      });

    expect(res.status).toBe(200);
    const { rows } = await pool.query(
      `SELECT assignees, dependencies FROM tasks WHERE id = $1`,
      [created[0].id]
    );
    expect(rows[0].assignees).toEqual(['alice', 'bob']);
    expect(rows[0].dependencies).toEqual([]);
  });

  it('drops non-string entries during normalisation', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const { rows: created } = await pool.query(
      `INSERT INTO tasks (title, status, item_type, assignees)
       VALUES ('t', 'Not started', 'project', '{}')
       RETURNING id, updated_at`
    );

    const res = await request(app)
      .post('/api/sync/changes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        changes: [
          {
            action: 'upsert',
            entity: 'task',
            data: {
              id: created[0].id,
              title: 't',
              status: 'Not started',
              item_type: 'project',
              // Mixed garbage: nested, non-strings, numbers, nulls
              assignees: ['real-user', null, [['nested']], 42, ''],
              _serverUpdatedAt: created[0].updated_at,
            },
          },
        ],
      });

    expect(res.status).toBe(200);
    const { rows } = await pool.query(
      `SELECT assignees FROM tasks WHERE id = $1`,
      [created[0].id]
    );
    // After flatten + string-only filter + empty-string drop:
    expect(rows[0].assignees).toEqual(['real-user', 'nested']);
  });
});
