// dashboard-server/tests/unit/attachments-scoping.test.mjs
//
// Client-scoping on the universal attachments routes (security fix, bug batch 2026-06-12).
// Before this fix, any authenticated client user could list/fetch/upload attachments
// for ANY entity UUID across clients. These tests pin the scoped behaviour:
//   - client users can only touch attachments on entities owned by their client
//   - task/project entities resolve ownership by walking to the root's client_id
//   - lead/expense entities are NBI-only
//   - file-serving routes deny client users when the filename has no attachment
//     row or the row belongs to another client
//   - NBI users are unrestricted (regression)

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

async function seedAttachment(entityType, entityId, opts = {}) {
  const { rows } = await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [entityType, entityId, opts.filename || `test-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
     opts.original_name || 'doc.txt', 10, 'text/plain', opts.uploaded_by || 'tester']
  );
  return rows[0];
}

describe('Attachments — client scoping', () => {
  it('client user can list attachments on their own client task (incl. child task via root walk)', async () => {
    const client = await createTestClient({ name: 'OwnCo' });
    const root = await createTestTask({ client_id: client.id, item_type: 'project' });
    const child = await createTestTask({ parent_id: root.id, item_type: 'feature' });
    await seedAttachment('task', child.id);
    const user = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(user.id);

    const res = await request(app).get(`/api/attachments/entity/task/${child.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('client user gets 403 listing attachments on another client task', async () => {
    const clientA = await createTestClient({ name: 'AAA' });
    const clientB = await createTestClient({ name: 'BBB' });
    const taskB = await createTestTask({ client_id: clientB.id, item_type: 'project' });
    await seedAttachment('task', taskB.id);
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(userA.id);

    const res = await request(app).get(`/api/attachments/entity/task/${taskB.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('client user: own client entity 200, other client entity 403', async () => {
    const clientA = await createTestClient({ name: 'AAA' });
    const clientB = await createTestClient({ name: 'BBB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(userA.id);

    const own = await request(app).get(`/api/attachments/entity/client/${clientA.id}`).set('Authorization', `Bearer ${token}`);
    expect(own.status).toBe(200);
    const other = await request(app).get(`/api/attachments/entity/client/${clientB.id}`).set('Authorization', `Bearer ${token}`);
    expect(other.status).toBe(403);
  });

  it('client user gets 403 on lead and expense entities', async () => {
    const client = await createTestClient({ name: 'OwnCo' });
    const user = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(user.id);

    // lead/expense are NBI-internal; denial fires before any row lookup, so a random UUID suffices
    const leadRes = await request(app).get(`/api/attachments/entity/lead/123e4567-e89b-12d3-a456-426614174000`).set('Authorization', `Bearer ${token}`);
    expect(leadRes.status).toBe(403);
    const expRes = await request(app).get(`/api/attachments/entity/expense/123e4567-e89b-12d3-a456-426614174000`).set('Authorization', `Bearer ${token}`);
    expect(expRes.status).toBe(403);
  });

  it('client user gets 403 uploading to another client task', async () => {
    const clientA = await createTestClient({ name: 'AAA' });
    const clientB = await createTestClient({ name: 'BBB' });
    const taskB = await createTestTask({ client_id: clientB.id, item_type: 'project' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(userA.id);

    const res = await request(app)
      .post(`/api/attachments/entity/task/${taskB.id}`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello'), 'evil.txt');
    expect(res.status).toBe(403);
  });

  it('client user gets 403 attaching a link to another client task', async () => {
    const clientA = await createTestClient({ name: 'AAA' });
    const clientB = await createTestClient({ name: 'BBB' });
    const taskB = await createTestTask({ client_id: clientB.id, item_type: 'project' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(userA.id);

    const res = await request(app)
      .post(`/api/attachments/entity/task/${taskB.id}/link`)
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/doc' });
    expect(res.status).toBe(403);
  });

  it('file-serving routes deny client users for other-client and unknown filenames', async () => {
    const clientA = await createTestClient({ name: 'AAA' });
    const clientB = await createTestClient({ name: 'BBB' });
    const taskB = await createTestTask({ client_id: clientB.id, item_type: 'project' });
    const att = await seedAttachment('task', taskB.id, { filename: 'scoped-test-file.bin' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(userA.id);

    const dl = await request(app).get(`/api/attachments/download/${att.filename}`).set('Authorization', `Bearer ${token}`);
    expect(dl.status).toBe(403);
    const serve = await request(app).get(`/api/attachments/${att.filename}`).set('Authorization', `Bearer ${token}`);
    expect(serve.status).toBe(403);
    const unknown = await request(app).get(`/api/attachments/download/no-such-row.bin`).set('Authorization', `Bearer ${token}`);
    expect(unknown.status).toBe(403);
  });

  it('client user can download their own client file (404 only because no physical file)', async () => {
    const client = await createTestClient({ name: 'OwnCo' });
    const task = await createTestTask({ client_id: client.id, item_type: 'project' });
    const att = await seedAttachment('task', task.id, { filename: 'own-file.bin' });
    const user = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(user.id);

    const res = await request(app).get(`/api/attachments/download/${att.filename}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).not.toBe(403); // row is in scope; 404 acceptable (no file on disk in test env)
  });

  it('NBI member remains unrestricted across clients (regression)', async () => {
    const clientB = await createTestClient({ name: 'BBB' });
    const taskB = await createTestTask({ client_id: clientB.id, item_type: 'project' });
    await seedAttachment('task', taskB.id);
    const nbi = await createTestUser({ role: 'member' });
    const token = await mintSession(nbi.id);

    const res = await request(app).get(`/api/attachments/entity/task/${taskB.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});
