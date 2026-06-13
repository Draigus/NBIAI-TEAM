// dashboard-server/tests/unit/task-attachments-all.test.mjs
//
// GET /api/tasks/:id/attachments/all — aggregated attachment listing for the
// full-screen folder view (feature 4159773e). Returns attachments for the task
// AND its whole subtree, from both the universal `attachments` table and the
// legacy `task_attachments` table, with the owning task's title per row.
// Client-scoped via requireTaskAccess.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

async function seed() {
  const client = await createTestClient({ name: 'DocsCo' });
  const root = await createTestTask({ title: 'Legal project', client_id: client.id, item_type: 'project' });
  const child = await createTestTask({ title: 'Agreements story', parent_id: root.id, item_type: 'feature' });
  await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
     VALUES ('project', $1, 'root-file.pdf', 'Register.pdf', 100, 'application/pdf', 'Dino'),
            ('task', $2, 'child-file.docx', 'Agreement.docx', 200, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Dino')`,
    [root.id, child.id]);
  await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by, link_url, link_title)
     VALUES ('task', $1, NULL, NULL, NULL, 'link', 'Dino', 'https://example.com/x', 'External doc')`, [child.id]);
  await pool.query(
    `INSERT INTO task_attachments (task_id, filename, original_name, size_bytes, mime_type, uploaded_by)
     VALUES ($1, 'legacy-file.xlsx', 'OldRegister.xlsx', 300, 'application/vnd.ms-excel', 'Glen Pryer')`, [child.id]);
  return { client, root, child };
}

describe('GET /api/tasks/:id/attachments/all', () => {
  it('returns the whole subtree from both tables with task titles', async () => {
    const { root } = await seed();
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app).get(`/api/tasks/${root.id}/attachments/all`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(4);
    const names = res.body.map(r => r.original_name || r.link_title).sort();
    expect(names).toEqual(['Agreement.docx', 'External doc', 'OldRegister.xlsx', 'Register.pdf']);
    const legacy = res.body.find(r => r.original_name === 'OldRegister.xlsx');
    expect(legacy.source).toBe('legacy');
    expect(legacy.task_title).toBe('Agreements story');
    const rootFile = res.body.find(r => r.original_name === 'Register.pdf');
    expect(rootFile.task_title).toBe('Legal project');
  });

  it('scoped to the requested node when called on a child', async () => {
    const { child } = await seed();
    const u = await createTestUser({ role: 'admin' });
    const token = await mintSession(u.id);

    const res = await request(app).get(`/api/tasks/${child.id}/attachments/all`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3); // child's two universal + one legacy, not the root file
  });

  it('client users: own client 200, other client 403', async () => {
    const { root, client } = await seed();
    const other = await createTestClient({ name: 'OtherCo' });
    const ownUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const otherUser = await createTestUser({ role: 'member', client_id: other.id, client_role: 'member' });

    const okRes = await request(app).get(`/api/tasks/${root.id}/attachments/all`)
      .set('Authorization', `Bearer ${await mintSession(ownUser.id)}`);
    expect(okRes.status).toBe(200);
    const denied = await request(app).get(`/api/tasks/${root.id}/attachments/all`)
      .set('Authorization', `Bearer ${await mintSession(otherUser.id)}`);
    expect(denied.status).toBe(403);
  });
});
