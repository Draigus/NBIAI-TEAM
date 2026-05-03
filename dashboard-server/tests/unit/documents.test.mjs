// dashboard-server/tests/unit/documents.test.mjs
//
// TDD tests for Task 6: GET /api/documents (list), GET /api/documents/:id,
// and POST /api/documents (create).
//
// Response shape follows the raw codebase convention (no .data envelope):
//   GET list  -> res.body is an array
//   GET one   -> res.body is a plain document object
//   POST      -> res.body is the newly created document object (status 201)
//
// Tests also cover:
//   - requireAuth loading docs_* flags (test 8 — docs_view=false -> 403)
//   - NBI redaction: nbiInternalBlock stripped for client users
//   - Visibility enforcement: nbi_only docs return 404 to client users

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Documents — list/read/create', () => {
  let admin, adminToken, lighthouse;

  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    adminToken = await mintSession(admin.id);
    lighthouse = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
  });

  // ---- LIST ----------------------------------------------------------------

  it('GET /api/documents?client_id=... returns an empty array initially', async () => {
    const res = await request(app)
      .get(`/api/documents?client_id=${lighthouse.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // ---- CREATE --------------------------------------------------------------

  it('POST /api/documents creates a top-level page with default empty body', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: lighthouse.id, title: 'Overview' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Overview');
    expect(res.body.parent_id).toBeNull();
    expect(res.body.body_json).toEqual({ type: 'doc', content: [] });
    expect(res.body.visibility).toBe('all');
  });

  it('POST /api/documents creates a child page under a given parent_id', async () => {
    const parent = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by)
       VALUES ($1, 'Parent', 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: lighthouse.id, title: 'Child', parent_id: parent.rows[0].id });
    expect(res.status).toBe(201);
    expect(res.body.parent_id).toBe(parent.rows[0].id);
  });

  it('POST /api/documents rejects when client_id is missing', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Floating' });
    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.error).toMatch(/client_id/i);
  });

  // ---- READ (GET by id) ----------------------------------------------------

  it('GET /api/documents/:id returns full body including nbiInternalBlock for NBI users', async () => {
    const body = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Visible' }] },
        { type: 'nbiInternalBlock', content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'NBI ONLY' }] }
        ]}
      ]
    };
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, body_json, created_by, updated_by)
       VALUES ($1, 'D', $2, 't', 't') RETURNING id`,
      [lighthouse.id, JSON.stringify(body)]
    );
    const res = await request(app)
      .get(`/api/documents/${ins.rows[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body.body_json)).toContain('NBI ONLY');
  });

  it('GET /api/documents/:id strips nbiInternalBlock for client portal users', async () => {
    const body = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Visible' }] },
        { type: 'nbiInternalBlock', content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'NBI ONLY' }] }
        ]}
      ]
    };
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, body_json, created_by, updated_by)
       VALUES ($1, 'D', $2, 't', 't') RETURNING id`,
      [lighthouse.id, JSON.stringify(body)]
    );
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);
    const res = await request(app)
      .get(`/api/documents/${ins.rows[0].id}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body.body_json)).not.toContain('NBI ONLY');
  });

  it('GET /api/documents/:id returns 404 for nbi_only docs requested by client users', async () => {
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, visibility, created_by, updated_by)
       VALUES ($1, 'Internal', 'nbi_only', 't', 't') RETURNING id`,
      [lighthouse.id]
    );
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);
    const res = await request(app)
      .get(`/api/documents/${ins.rows[0].id}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(404);
  });

  // ---- docs_view=false permission ------------------------------------------

  it('GET /api/documents returns 403 for client users with docs_view=false', async () => {
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    // Explicitly disable docs_view for this user
    await pool.query('UPDATE users SET docs_view = false WHERE id = $1', [clientUser.id]);
    const clientToken = await mintSession(clientUser.id);
    const res = await request(app)
      .get(`/api/documents?client_id=${lighthouse.id}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/documents returns 403 for client users with docs_create=false', async () => {
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    await pool.query('UPDATE users SET docs_create = false WHERE id = $1', [clientUser.id]);
    const clientToken = await mintSession(clientUser.id);
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ client_id: lighthouse.id, title: 'Should fail' });
    expect(res.status).toBe(403);
  });
});

// =============================================================================
// Documents — update / delete (Task 7 + D1 ETag/If-Match + B1 body_text)
// =============================================================================

describe('Documents — update/delete/move', () => {
  let admin, adminToken, lighthouse, doc;

  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    adminToken = await mintSession(admin.id);
    lighthouse = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
    // Insert a base doc for each test to operate on
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by)
       VALUES ($1, 'Original Title', 'test', 'test') RETURNING *`,
      [lighthouse.id]
    );
    doc = ins.rows[0];
  });

  // ---- T7-1: PATCH updates title -------------------------------------------

  it('PATCH /api/documents/:id updates title', async () => {
    // First GET to obtain a valid ETag
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag = getRes.headers['etag'];
    expect(etag).toBeTruthy();

    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ title: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Renamed');
    // Fresh ETag should be present after successful update
    expect(res.headers['etag']).toBeTruthy();
  });

  // ---- T7-2: PATCH updates body_json ----------------------------------------

  it('PATCH /api/documents/:id updates body_json', async () => {
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag = getRes.headers['etag'];

    const newBody = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] };
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ body_json: newBody });
    expect(res.status).toBe(200);
    expect(res.body.body_json).toEqual(newBody);
  });

  // ---- T7-3: PATCH reparents to a sibling ----------------------------------

  it('PATCH /api/documents/:id reparents to a sibling', async () => {
    // Create a sibling doc
    const sibIns = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by)
       VALUES ($1, 'Sibling', 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );
    const siblingId = sibIns.rows[0].id;

    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag = getRes.headers['etag'];

    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ parent_id: siblingId });
    expect(res.status).toBe(200);
    expect(res.body.parent_id).toBe(siblingId);
  });

  // ---- T7-4: PATCH rejects circular parent_id = own id --------------------

  it('PATCH /api/documents/:id rejects circular parent_id = own id', async () => {
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag = getRes.headers['etag'];

    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ parent_id: doc.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/circular/i);
  });

  // ---- T7-5: DELETE cascades to children ----------------------------------

  it('DELETE /api/documents/:id cascades to children', async () => {
    // Insert a child doc referencing the parent
    const childIns = await pool.query(
      `INSERT INTO documents (client_id, parent_id, title, created_by, updated_by)
       VALUES ($1, $2, 'Child Doc', 'test', 'test') RETURNING id`,
      [lighthouse.id, doc.id]
    );
    const childId = childIns.rows[0].id;

    const res = await request(app)
      .delete(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);

    // Child should also be gone (FK ON DELETE CASCADE)
    const { rows } = await pool.query('SELECT id FROM documents WHERE id = $1', [childId]);
    expect(rows.length).toBe(0);
  });

  // ---- T7-6: Client portal user with docs_edit=false cannot PATCH ---------

  it('PATCH /api/documents/:id returns 403 for client portal user with docs_edit=false', async () => {
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    await pool.query('UPDATE users SET docs_edit = false WHERE id = $1', [clientUser.id]);
    const clientToken = await mintSession(clientUser.id);

    // Client users also need a valid ETag; GET works for them (docs_view default true)
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${clientToken}`);
    const etag = getRes.headers['etag'];

    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .set('If-Match', etag)
      .send({ title: 'Hacked' });
    expect(res.status).toBe(403);
  });

  // ---- D1-1: GET emits ETag; PATCH with that ETag succeeds ----------------

  it('D1: GET emits ETag header; PATCH with If-Match that ETag returns 200', async () => {
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    const etag = getRes.headers['etag'];
    expect(etag).toMatch(/^W\//);

    const patchRes = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ title: 'Updated via ETag' });
    expect(patchRes.status).toBe(200);
  });

  // ---- D1-2: PATCH without If-Match returns 428 ----------------------------

  it('D1: PATCH without If-Match header returns 428', async () => {
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No header' });
    expect(res.status).toBe(428);
  });

  // ---- D1-3: Two PATCHes with same If-Match — second returns 409 ----------

  it('D1: second PATCH with same If-Match returns 409 with current doc in body', async () => {
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag = getRes.headers['etag'];

    // First PATCH — updates the doc, bumping updated_at
    const first = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ title: 'First Update' });
    expect(first.status).toBe(200);

    // Second PATCH with the original (now stale) ETag
    const second = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ title: 'Second Update' });
    expect(second.status).toBe(409);
    // Body should carry the current state of the doc so the frontend can display a conflict modal
    expect(second.body.current).toBeDefined();
    expect(second.body.current.title).toBe('First Update');
  });

  // ---- D1-4: Stale If-Match returns 409 -----------------------------------
  // RFC 7232 specifies 412 for a failed precondition, but we return 409 here
  // because the frontend conflict modal consumes this path and needs a uniform
  // shape regardless of whether the mismatch was due to a stale client or a
  // concurrent write. 409 carries the current state in the body; 412 does not.

  it('D1: PATCH with stale If-Match returns 409 with current doc', async () => {
    const staleEtag = 'W/"2000-01-01T00:00:00.000Z"';
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', staleEtag)
      .send({ title: 'Should Conflict' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/conflict/i);
    expect(res.body.current).toBeDefined();
    expect(res.body.current.id).toBe(doc.id);
  });

  // ---- B1-1: body_text is computed on PATCH and keeps NBI-internal text --

  it('B1: PATCH body_json writes body_text including NBI-internal content', async () => {
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag = getRes.headers['etag'];

    const bodyWithNbi = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Public paragraph' }] },
        {
          type: 'nbiInternalBlock',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NBI secret text' }] }]
        }
      ]
    };

    const patchRes = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ body_json: bodyWithNbi });
    expect(patchRes.status).toBe(200);

    // Query body_text directly — write-time indexing keeps NBI-internal content
    const { rows } = await pool.query('SELECT body_text FROM documents WHERE id = $1', [doc.id]);
    expect(rows[0].body_text).toContain('Public paragraph');
    expect(rows[0].body_text).toContain('NBI secret text');
  });

  // ---- B1-2: body_text updates on every body_json PATCH -------------------

  it('B1: body_text reflects the latest body_json after consecutive PATCHes', async () => {
    // First PATCH
    const get1 = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag1 = get1.headers['etag'];

    const body1 = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Version one' }] }] };
    const patch1 = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag1)
      .send({ body_json: body1 });
    expect(patch1.status).toBe(200);

    // Second PATCH using the fresh ETag from the first response
    const etag2 = patch1.headers['etag'];
    const body2 = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Version two' }] }] };
    const patch2 = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag2)
      .send({ body_json: body2 });
    expect(patch2.status).toBe(200);

    // body_text should reflect the SECOND body, not the first
    const { rows } = await pool.query('SELECT body_text FROM documents WHERE id = $1', [doc.id]);
    expect(rows[0].body_text).toContain('Version two');
    expect(rows[0].body_text).not.toContain('Version one');
  });
});
