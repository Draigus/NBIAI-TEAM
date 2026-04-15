// dashboard-server/tests/unit/kanban-position.test.mjs
//
// Server-side tests for the kanban position feature (decision D79).
//
// Sections:
//   1. Helper unit tests (shiftForInsert, reorderInGroup) — direct calls
//   2. POST integration tests — newly created rows land at position 0
//   3. PATCH integration tests — drag-to-reorder via API

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser,
  createTestBugReport,
  createTestTask,
  createTestCandidate,
  createTestLead,
  createTestLeadStage,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

// ============================================================================
// 1. Helper unit tests
// ============================================================================

describe('shiftForInsert', () => {
  it('shifts every row in the target group down by 1', async () => {
    const u = await createTestUser({ role: 'admin' });
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'A', '', 'open', 0),
              ($1, 'bug', 'B', '', 'open', 1),
              ($1, 'bug', 'C', '', 'open', 2)`,
      [u.id]
    );

    const { shiftForInsert } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await shiftForInsert(client, 'bug_reports', 'status', 'open');
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(rows.map(r => r.position)).toEqual([1, 2, 3]);
  });

  it('does not touch rows in other groups', async () => {
    const u = await createTestUser({ role: 'admin' });
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'open0',   '', 'open',     0),
              ($1, 'bug', 'closed0', '', 'resolved', 0)`,
      [u.id]
    );
    const { shiftForInsert } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await shiftForInsert(client, 'bug_reports', 'status', 'open');
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports ORDER BY title`
    );
    expect(rows).toEqual([
      { title: 'closed0', position: 0 },
      { title: 'open0',   position: 1 },
    ]);
  });

  it('rejects unknown table or group key (SQL injection guard)', async () => {
    const { shiftForInsert } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await expect(shiftForInsert(client, 'tasks; DROP TABLE users; --', 'status', 'open'))
        .rejects.toThrow(/invalid table/i);
      await expect(shiftForInsert(client, 'tasks', 'status; DROP', 'open'))
        .rejects.toThrow(/invalid column/i);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});

describe('reorderInGroup', () => {
  async function seedBugs() {
    const u = await createTestUser({ role: 'admin' });
    const ids = [];
    for (let i = 0; i < 5; i++) {
      const { rows } = await pool.query(
        `INSERT INTO bug_reports (user_id, type, title, description, status, position)
         VALUES ($1, 'bug', $2, '', 'open', $3) RETURNING id`,
        [u.id, `bug${i}`, i]
      );
      ids.push(rows[0].id);
    }
    return ids;
  }

  async function readOrder(status = 'open') {
    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = $1 ORDER BY position`,
      [status]
    );
    return rows;
  }

  it('intra-column move up: 4 → 1 shifts 1..3 down by +1', async () => {
    const ids = await seedBugs();
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[4], 'open', 1);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder()).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug4', position: 1 },
      { title: 'bug1', position: 2 },
      { title: 'bug2', position: 3 },
      { title: 'bug3', position: 4 },
    ]);
  });

  it('intra-column move down: 1 → 3 shifts 2..3 up by -1', async () => {
    const ids = await seedBugs();
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[1], 'open', 3);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder()).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug2', position: 1 },
      { title: 'bug3', position: 2 },
      { title: 'bug1', position: 3 },
      { title: 'bug4', position: 4 },
    ]);
  });

  it('same-position no-op leaves all rows untouched', async () => {
    const ids = await seedBugs();
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[2], 'open', 2);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder()).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug1', position: 1 },
      { title: 'bug2', position: 2 },
      { title: 'bug3', position: 3 },
      { title: 'bug4', position: 4 },
    ]);
  });

  it('clamps positions past the end of the column', async () => {
    const ids = await seedBugs();
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[0], 'open', 99);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder()).toEqual([
      { title: 'bug1', position: 0 },
      { title: 'bug2', position: 1 },
      { title: 'bug3', position: 2 },
      { title: 'bug4', position: 3 },
      { title: 'bug0', position: 4 },
    ]);
  });

  it('cross-column move: closes gap in old group, opens slot in new group', async () => {
    const ids = await seedBugs();
    const u = (await pool.query('SELECT id FROM users LIMIT 1')).rows[0];
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'p0', '', 'in_progress', 0),
              ($1, 'bug', 'p1', '', 'in_progress', 1)`,
      [u.id]
    );
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[2], 'in_progress', 1);
      await client.query('COMMIT');
    } finally { client.release(); }

    expect(await readOrder('open')).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug1', position: 1 },
      { title: 'bug3', position: 2 },
      { title: 'bug4', position: 3 },
    ]);
    expect(await readOrder('in_progress')).toEqual([
      { title: 'p0',   position: 0 },
      { title: 'bug2', position: 1 },
      { title: 'p1',   position: 2 },
    ]);
  });

  it('cross-column move with newPos=0 puts the card at the top', async () => {
    const ids = await seedBugs();
    const u = (await pool.query('SELECT id FROM users LIMIT 1')).rows[0];
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'r0', '', 'resolved', 0)`,
      [u.id]
    );
    const { reorderInGroup } = require('../../server.js');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reorderInGroup(client, 'bug_reports', 'status', ids[3], 'resolved', 0);
      await client.query('COMMIT');
    } finally { client.release(); }
    expect(await readOrder('resolved')).toEqual([
      { title: 'bug3', position: 0 },
      { title: 'r0',   position: 1 },
    ]);
  });
});

// ============================================================================
// 2. POST integration tests
// ============================================================================

describe('POST /api/bug-reports — inserts at position 0', () => {
  it('first bug in a status lands at position 0', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'bug', title: 'first', description: 'first' });
    expect(res.status).toBe(201);
    expect(res.body.position).toBe(0);
  });

  it('subsequent bugs push older ones down', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    for (const title of ['first', 'second', 'third']) {
      const res = await request(app)
        .post('/api/bug-reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'bug', title, description: '' });
      expect(res.status).toBe(201);
    }
    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(rows).toEqual([
      { title: 'third',  position: 0 },
      { title: 'second', position: 1 },
      { title: 'first',  position: 2 },
    ]);
  });

  it('insert into one status does not touch another status', async () => {
    const u = await createTestUser({ role: 'admin' });
    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'old-resolved', '', 'resolved', 0)`,
      [u.id]
    );
    const token = await mintSession(u.id);
    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'bug', title: 'new-open', description: '' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query(
      `SELECT title, status, position FROM bug_reports ORDER BY status, position`
    );
    expect(rows).toEqual([
      { title: 'new-open',     status: 'open',     position: 0 },
      { title: 'old-resolved', status: 'resolved', position: 0 },
    ]);
  });
});

// ============================================================================
// 3. PATCH integration tests
// ============================================================================

describe('PATCH /api/bug-reports/:id — drag-to-reorder', () => {
  async function makeBugs(token, count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
      const res = await request(app)
        .post('/api/bug-reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'bug', title: `bug${i}`, description: '' });
      ids.push(res.body.id);
    }
    // After this loop: bug_{count-1}@0 ... bug_0@count-1
    return ids;
  }

  it('intra-column move shifts others', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeBugs(token, 4);

    const res = await request(app)
      .patch(`/api/bug-reports/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ position: 0 });
    expect(res.status).toBe(200);
    expect(res.body.position).toBe(0);

    const { rows } = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(rows).toEqual([
      { title: 'bug0', position: 0 },
      { title: 'bug3', position: 1 },
      { title: 'bug2', position: 2 },
      { title: 'bug1', position: 3 },
    ]);
  });

  it('cross-column move with explicit position', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeBugs(token, 3);

    const res = await request(app)
      .patch(`/api/bug-reports/${ids[1]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress', position: 0 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.position).toBe(0);

    const open = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'open' ORDER BY position`
    );
    expect(open.rows).toEqual([
      { title: 'bug2', position: 0 },
      { title: 'bug0', position: 1 },
    ]);
    const inProgress = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'in_progress' ORDER BY position`
    );
    expect(inProgress.rows).toEqual([
      { title: 'bug1', position: 0 },
    ]);
  });

  it('status change without explicit position lands at 0 of new column', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeBugs(token, 3);

    await pool.query(
      `INSERT INTO bug_reports (user_id, type, title, description, status, position)
       VALUES ($1, 'bug', 'old-resolved', '', 'resolved', 0)`, [u.id]
    );

    const res = await request(app)
      .patch(`/api/bug-reports/${ids[1]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.position).toBe(0);

    const resolved = await pool.query(
      `SELECT title, position FROM bug_reports WHERE status = 'resolved' ORDER BY position`
    );
    expect(resolved.rows).toEqual([
      { title: 'bug1',         position: 0 },
      { title: 'old-resolved', position: 1 },
    ]);
  });

  it('PATCH with neither status nor position updates other fields', async () => {
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);
    const ids = await makeBugs(token, 2);

    const res = await request(app)
      .patch(`/api/bug-reports/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'renamed' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('renamed');
    expect(res.body.position).toBe(1);
  });
});
