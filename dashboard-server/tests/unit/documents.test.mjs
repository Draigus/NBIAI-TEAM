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
// Documents: update / delete (Task 7 + D1 ETag/If-Match + B1 body_text)
// =============================================================================

describe('Documents: update/delete/move', () => {
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

  // ---- D1-3: Two PATCHes with same If-Match: second returns 409 ----------

  it('D1: second PATCH with same If-Match returns 409 with current doc in body', async () => {
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag = getRes.headers['etag'];

    // First PATCH: updates the doc, bumping updated_at
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

    // Query body_text directly. Write-time indexing keeps NBI-internal content
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

  // ---- T-Sec-C1a: client-A PATCHing client-B's doc with stale ETag -> 404 ---

  it('T-Sec-C1a: client-A user PATCHing client-B doc with stale If-Match gets 404, no leak', async () => {
    // doc is owned by lighthouse (client-A). Create a separate client and user.
    const goals = await createTestClient({ name: 'Goals', sector: 'gaming' });
    const goalsUser = await createTestUser({ role: 'member', client_id: goals.id });
    const goalsToken = await mintSession(goalsUser.id);

    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${goalsToken}`)
      .set('If-Match', 'W/"2000-01-01T00:00:00.000Z"')
      .send({ title: 'Attempted leak' });

    expect(res.status).toBe(404);
    expect(res.body.current).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Original Title');
  });

  // ---- T-Sec-C1b: client user PATCHing nbi_only doc with stale ETag -> 404 --

  it('T-Sec-C1b: client user PATCHing nbi_only doc with stale If-Match gets 404, no leak', async () => {
    const nbiOnlyIns = await pool.query(
      `INSERT INTO documents (client_id, title, visibility, created_by, updated_by)
       VALUES ($1, 'NBI Secret', 'nbi_only', 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);

    const res = await request(app)
      .patch(`/api/documents/${nbiOnlyIns.rows[0].id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .set('If-Match', 'W/"2000-01-01T00:00:00.000Z"')
      .send({ title: 'Attempted' });

    expect(res.status).toBe(404);
    expect(res.body.current).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('NBI Secret');
  });

  // ---- T-Sec-C1c: 409 body for client user has body_json redacted -----------

  it('T-Sec-C1c: 409 body for client user has nbiInternalBlock stripped', async () => {
    const bodyWithNbi = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Public content' }] },
        { type: 'nbiInternalBlock', content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'NBI ONLY SECRET' }] }
        ]}
      ]
    };
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, body_json, visibility, created_by, updated_by)
       VALUES ($1, 'Public Doc', $2, 'all', 'test', 'test') RETURNING id`,
      [lighthouse.id, JSON.stringify(bodyWithNbi)]
    );
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);

    // Stale ETag -- scope guards pass (correct client, all visibility) but ETag fails -> 409
    const res = await request(app)
      .patch(`/api/documents/${ins.rows[0].id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .set('If-Match', 'W/"2000-01-01T00:00:00.000Z"')
      .send({ title: 'Conflict attempt' });

    expect(res.status).toBe(409);
    expect(res.body.current).toBeDefined();
    expect(JSON.stringify(res.body.current.body_json)).not.toContain('NBI ONLY SECRET');
  });

  // ---- T-Race-I1: silent lost-update is prevented via WHERE updated_at -------

  it('T-Race-I1: stale updated_at in WHERE clause prevents silent lost-update', async () => {
    // Capture ETag before the bump
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag = getRes.headers['etag'];

    // Simulate a concurrent write by bumping updated_at directly in the DB
    await pool.query(
      `UPDATE documents SET updated_at = now() + interval '1 second' WHERE id = $1`,
      [doc.id]
    );

    // PATCH with the original (now stale) ETag must return 409
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ title: 'Should conflict' });

    expect(res.status).toBe(409);
    expect(res.body.current).toBeDefined();
  });

  // ---- T-Cycle-I2: descendant cycle is rejected -------------------------------

  it('T-Cycle-I2: PATCH parent_id to a descendant returns 400 with circular error', async () => {
    // doc = root. Create child with parent = doc.
    const childIns = await pool.query(
      `INSERT INTO documents (client_id, parent_id, title, created_by, updated_by)
       VALUES ($1, $2, 'Child', 'test', 'test') RETURNING id`,
      [lighthouse.id, doc.id]
    );
    const childId = childIns.rows[0].id;

    // Get ETag for doc
    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const etag = getRes.headers['etag'];

    // Attempt to set doc's parent to its own child -> cycle
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ parent_id: childId });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/circular|cycle|descendant/i);
  });

  // ---- T-Etag-Malformed: PATCH with bad If-Match -> 400 ----------------------

  it('T-Etag-Malformed: PATCH with malformed If-Match header returns 400', async () => {
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', 'not-an-etag')
      .send({ title: 'Bad header' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/malformed|if-match/i);
  });

  // ---- T-Shape-M1: 409 current body has same keys as GET-by-id ---------------

  it('T-Shape-M1: 409 body current field has same key set as GET-by-id', async () => {
    const expectedKeys = ['id', 'client_id', 'parent_id', 'task_id', 'title', 'body_json',
      'visibility', 'sort_order', 'updated_at', 'updated_by'];

    const getRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    const getKeys = Object.keys(getRes.body).sort();

    const conflictRes = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', 'W/"2000-01-01T00:00:00.000Z"')
      .send({ title: 'Shape check' });
    expect(conflictRes.status).toBe(409);
    const conflictKeys = Object.keys(conflictRes.body.current).sort();

    expect(getKeys).toEqual(expectedKeys.slice().sort());
    expect(conflictKeys).toEqual(expectedKeys.slice().sort());
    expect(getKeys).not.toContain('body_text');
    expect(getKeys).not.toContain('body_version');
    expect(conflictKeys).not.toContain('body_text');
    expect(conflictKeys).not.toContain('body_version');
  });

  // ---- T-Delete-M4: client-A DELETEing client-B doc -> 204 -------------------

  it('T-Delete-M4: client-A user DELETEing a client-B doc returns 204 (silent no-op)', async () => {
    // doc is owned by lighthouse. Goals user tries to delete it.
    const goals = await createTestClient({ name: 'Goals2', sector: 'gaming' });
    const goalsUser = await createTestUser({ role: 'member', client_id: goals.id });
    const goalsToken = await mintSession(goalsUser.id);

    const res = await request(app)
      .delete(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${goalsToken}`);

    expect(res.status).toBe(204);

    // The doc must still exist -- it was NOT deleted
    const { rows } = await pool.query('SELECT id FROM documents WHERE id = $1', [doc.id]);
    expect(rows.length).toBe(1);
  });
});

// =============================================================================
// Documents: attachments (Task 8 + H1)
// =============================================================================

describe('Documents: attachments', () => {
  // 1x1 transparent PNG (valid image file)
  const PIXEL_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );

  let admin, adminToken, lighthouse, doc;

  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    adminToken = await mintSession(admin.id);
    lighthouse = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by)
       VALUES ($1, 'Img Doc', 'test', 'test') RETURNING *`,
      [lighthouse.id]
    );
    doc = ins.rows[0];
  });

  // ---- T8-1: POST accepts a small PNG and returns a URL --------------------

  it('T8-1: POST /api/documents/:id/attachments accepts a 1x1 PNG and returns row + URL', async () => {
    const res = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.filename).toBe('pixel.png');
    expect(res.body.mime_type).toBe('image/png');
    expect(res.body.size_bytes).toBeGreaterThan(0);
    expect(res.body.url).toMatch(new RegExp(`/api/documents/${doc.id}/attachments/.+\\.png$`));
  });

  // ---- T8-2: POST rejects files over 5 MB ---------------------------------

  it('T8-2: POST rejects files over 5 MB', async () => {
    const huge = Buffer.alloc(5 * 1024 * 1024 + 1, 0x41);
    const res = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', huge, { filename: 'big.png', contentType: 'image/png' });
    expect([400, 413]).toContain(res.status);
  });

  // ---- T8-3: POST rejects non-image MIME types ----------------------------

  it('T8-3: POST rejects non-image mime type (application/octet-stream)', async () => {
    const exe = Buffer.from('MZ-not-an-image');
    const res = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', exe, { filename: 'malware.exe', contentType: 'application/octet-stream' });
    expect(res.status).toBe(400);
  });

  // ---- T8-4: POST returns 403 for client user with docsUpload=false --------
  // File must NOT remain on disk after rejection.

  it('T8-4: POST returns 403 for client user with docsUpload=false and leaves no row in DB', async () => {
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    await pool.query('UPDATE users SET docs_upload = false WHERE id = $1', [clientUser.id]);
    const clientToken = await mintSession(clientUser.id);

    const res = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${clientToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(res.status).toBe(403);

    // No rows should have been inserted
    const { rows } = await pool.query(
      'SELECT id FROM document_attachments WHERE document_id = $1',
      [doc.id]
    );
    expect(rows.length).toBe(0);
  });

  // ---- T8-5: POST to doc owned by another client returns 404 ---------------
  // File must NOT remain on disk after rejection.

  it('T8-5: POST to a doc owned by another client returns 404 and leaves no row in DB', async () => {
    const goals = await createTestClient({ name: 'Goals', sector: 'gaming' });
    const goalsUser = await createTestUser({ role: 'member', client_id: goals.id });
    const goalsToken = await mintSession(goalsUser.id);

    const res = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${goalsToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(res.status).toBe(404);

    const { rows } = await pool.query(
      'SELECT id FROM document_attachments WHERE document_id = $1',
      [doc.id]
    );
    expect(rows.length).toBe(0);
  });

  // ---- T8-6: GET serves the uploaded image with correct headers ------------

  it('T8-6: GET serves the uploaded image with Content-Type image/png and nosniff header', async () => {
    const upRes = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(upRes.status).toBe(201);
    const url = upRes.body.url;

    const getRes = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-type']).toMatch(/image\/png/);
    expect(getRes.headers['x-content-type-options']).toBe('nosniff');
  });

  // ---- T8-7: GET by cross-client user returns 404 -------------------------

  it('T8-7: GET by cross-client user returns 404', async () => {
    const upRes = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(upRes.status).toBe(201);
    const url = upRes.body.url;

    const goals = await createTestClient({ name: 'Goals3', sector: 'gaming' });
    const goalsUser = await createTestUser({ role: 'member', client_id: goals.id });
    const goalsToken = await mintSession(goalsUser.id);

    const getRes = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${goalsToken}`);
    expect(getRes.status).toBe(404);
  });

  // ---- T8-8: GET by client user on nbi_only doc returns 404 ---------------

  it('T8-8: GET image on nbi_only doc returns 404 for client user', async () => {
    // Create an nbi_only doc with an attachment
    const nbiIns = await pool.query(
      `INSERT INTO documents (client_id, title, visibility, created_by, updated_by)
       VALUES ($1, 'NBI Internal', 'nbi_only', 'test', 'test') RETURNING *`,
      [lighthouse.id]
    );
    const nbiDoc = nbiIns.rows[0];

    const upRes = await request(app)
      .post(`/api/documents/${nbiDoc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(upRes.status).toBe(201);
    const url = upRes.body.url;

    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);

    const getRes = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(getRes.status).toBe(404);
  });

  // ---- T8-9: GET by client user with docsView=false returns 403 -----------

  it('T8-9: GET image returns 403 for client user with docsView=false', async () => {
    const upRes = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(upRes.status).toBe(201);
    const url = upRes.body.url;

    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    await pool.query('UPDATE users SET docs_view = false WHERE id = $1', [clientUser.id]);
    const clientToken = await mintSession(clientUser.id);

    const getRes = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(getRes.status).toBe(403);
  });

  // ---- T8-10: GET with URL-encoded path-traversal filename returns 400 -----
  // Express decodes %2F in route params, so the handler receives '../etc/passwd'
  // with a slash. path.resolve(uploadDir, '../etc/passwd') escapes uploadDir,
  // triggering the startsWith guard and returning 400.

  it('T8-10: GET with URL-encoded path-traversal filename returns 400', async () => {
    const res = await request(app)
      .get(`/api/documents/${doc.id}/attachments/..%2Fetc%2Fpasswd`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  // ---- H1-1: image in scope both inside and outside NBI block -> 200 ------

  it('H1-1: client GET returns 200 when image is referenced both inside and outside nbiInternalBlock', async () => {
    const upRes = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(upRes.status).toBe(201);
    const url = upRes.body.url;

    // Body references the image in BOTH a paragraph AND an nbiInternalBlock
    const body = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'image', attrs: { src: url } }]
        },
        {
          type: 'nbiInternalBlock',
          content: [
            { type: 'paragraph', content: [{ type: 'image', attrs: { src: url } }] }
          ]
        }
      ]
    };
    await pool.query(
      'UPDATE documents SET body_json = $1 WHERE id = $2',
      [JSON.stringify(body), doc.id]
    );

    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);

    const getRes = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(getRes.status).toBe(200);
  });

  // ---- H1-2: image only inside NBI block -> 404 for client user -----------

  it('H1-2: client GET returns 404 when image is only inside nbiInternalBlock', async () => {
    const upRes = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(upRes.status).toBe(201);
    const url = upRes.body.url;

    // Body references image ONLY inside an nbiInternalBlock
    const body = {
      type: 'doc',
      content: [
        {
          type: 'nbiInternalBlock',
          content: [
            { type: 'paragraph', content: [{ type: 'image', attrs: { src: url } }] }
          ]
        }
      ]
    };
    await pool.query(
      'UPDATE documents SET body_json = $1 WHERE id = $2',
      [JSON.stringify(body), doc.id]
    );

    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);

    const getRes = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(getRes.status).toBe(404);
  });

  // ---- H1-3: image only inside NBI block -> 200 for NBI user ---------------

  it('H1-3: NBI user GET returns 200 even when image is only inside nbiInternalBlock', async () => {
    const upRes = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(upRes.status).toBe(201);
    const url = upRes.body.url;

    // Body references image ONLY inside an nbiInternalBlock
    const body = {
      type: 'doc',
      content: [
        {
          type: 'nbiInternalBlock',
          content: [
            { type: 'paragraph', content: [{ type: 'image', attrs: { src: url } }] }
          ]
        }
      ]
    };
    await pool.query(
      'UPDATE documents SET body_json = $1 WHERE id = $2',
      [JSON.stringify(body), doc.id]
    );

    // NBI admin user -- no clientId, so isClientUser = false
    const getRes = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
  });
});
