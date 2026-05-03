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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';

const _dirname = path.dirname(fileURLToPath(import.meta.url));

// uploadDir mirrors dashboard-server/server.js: path.join(__dirname, 'uploads')
// From tests/unit/ that is two levels up
const uploadDir = path.join(_dirname, '..', '..', 'uploads');

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

  it('GET /api/documents?client_id=... seeds 6 default pages on first call', async () => {
    const res = await request(app)
      .get(`/api/documents?client_id=${lighthouse.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(6);
    const titles = res.body.map(d => d.title);
    expect(titles).toEqual(expect.arrayContaining(['Overview', 'Contacts', 'Risks', 'Decisions', 'Architecture', 'Notes']));
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
    // Fix 2a: verify the file actually landed on disk
    const storedName = res.body.url.split('/').pop();
    expect(fs.existsSync(path.join(uploadDir, storedName))).toBe(true);
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

    // Fix 2b: verify no orphan file was left on disk
    const dirContents = fs.readdirSync(uploadDir);
    const docFiles = dirContents.filter(f => f.startsWith(`doc_${doc.id}_`));
    expect(docFiles).toEqual([]);
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

    // Fix 2c: verify no orphan file was left on disk
    const dirContents = fs.readdirSync(uploadDir);
    const docFiles = dirContents.filter(f => f.startsWith(`doc_${doc.id}_`));
    expect(docFiles).toEqual([]);
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

  // ---- H1-4: client GET returns 404 when body_json has no image references --

  it('H1-4: client GET returns 404 when body_json has no image references', async () => {
    // Insert a doc with an empty body (no image nodes anywhere)
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, body_json, created_by, updated_by)
       VALUES ($1, 'D', $2, 't', 't') RETURNING *`,
      [lighthouse.id, JSON.stringify({ type: 'doc', content: [] })]
    );
    const docId = ins.rows[0].id;

    // Upload as admin so an attachment row and file exist
    const up = await request(app)
      .post(`/api/documents/${docId}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(up.status).toBe(201);

    // Client portal user requests the image -- body has no img refs so imageInScope returns false
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);
    const res = await request(app)
      .get(up.body.url)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(404);
  });

  // ---- T8-Insert-Fail: orphan file cleaned up when DB INSERT fails ----------

  it('T8-Insert-Fail: orphan file cleaned up when DB INSERT fails', async () => {
    // Force the INSERT to fail deterministically by adding a temporary CHECK
    // constraint that rejects this specific filename. We cannot use vi.spyOn on
    // pool.query because the test imports a different pool instance from
    // helpers/db.js; the route handler uses its own pool defined in server.js.
    // A schema-level constraint affects the actual table both pools share.
    await pool.query(
      `ALTER TABLE document_attachments
         ADD CONSTRAINT _t8_test_block_pixel CHECK (filename <> 'pixel.png')`
    );

    // Snapshot existing doc_ files before the request
    const before = fs.readdirSync(uploadDir).filter(f => f.startsWith(`doc_${doc.id}_`));

    try {
      const res = await request(app)
        .post(`/api/documents/${doc.id}/attachments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
      expect(res.status).toBe(500);
    } finally {
      await pool.query(
        `ALTER TABLE document_attachments DROP CONSTRAINT IF EXISTS _t8_test_block_pixel`
      );
    }

    // No new file should have been left behind for this doc -- the orphan
    // cleanup ran inside the INSERT catch branch in server.js.
    const after = fs.readdirSync(uploadDir).filter(f => f.startsWith(`doc_${doc.id}_`));
    expect(after).toEqual(before);
  });
});

// =============================================================================
// Documents: G1 orphan tracking
// =============================================================================

describe('Documents: G1 orphan tracking', () => {
  // 1x1 transparent PNG
  const PIXEL_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );

  let admin, adminToken, lighthouse, doc;

  const { runAttachmentSweep } = require('../../server.js');

  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    adminToken = await mintSession(admin.id);
    lighthouse = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by)
       VALUES ($1, 'G1 Doc', 'test', 'test') RETURNING *`,
      [lighthouse.id]
    );
    doc = ins.rows[0];
  });

  // G1-Upload: new attachment row has orphaned_at IS NOT NULL immediately after upload
  it('G1-Upload: POST sets orphaned_at on the new attachment row', async () => {
    const res = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      'SELECT orphaned_at FROM document_attachments WHERE document_id = $1',
      [doc.id]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].orphaned_at).not.toBeNull();
  });

  // G1-Embed: PATCH body_json referencing the image clears orphaned_at
  it('G1-Embed: PATCH body_json that references the image clears orphaned_at', async () => {
    const up = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(up.status).toBe(201);

    const storedName = up.body.url.split('/').pop();
    const body = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [
        { type: 'image', attrs: { src: up.body.url } }
      ]}]
    };

    const { rows: before } = await pool.query(
      'SELECT id, updated_at FROM documents WHERE id = $1', [doc.id]
    );
    const etag = `W/"${before[0].updated_at.toISOString()}"`;

    const patch = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ body_json: body });
    expect(patch.status).toBe(200);

    const { rows } = await pool.query(
      'SELECT orphaned_at FROM document_attachments WHERE document_id = $1 AND stored_name = $2',
      [doc.id, storedName]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].orphaned_at).toBeNull();
  });

  // G1-Remove: PATCH body_json that no longer references the image sets orphaned_at
  it('G1-Remove: PATCH body_json that omits the image sets orphaned_at', async () => {
    const up = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    const storedName = up.body.url.split('/').pop();

    // First embed the image so orphaned_at = NULL
    const embedBody = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [
        { type: 'image', attrs: { src: up.body.url } }
      ]}]
    };
    const { rows: r1 } = await pool.query('SELECT updated_at FROM documents WHERE id = $1', [doc.id]);
    await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', `W/"${r1[0].updated_at.toISOString()}"`)
      .send({ body_json: embedBody });

    // Confirm orphaned_at is now NULL
    const { rows: chk1 } = await pool.query(
      'SELECT orphaned_at FROM document_attachments WHERE document_id = $1 AND stored_name = $2',
      [doc.id, storedName]
    );
    expect(chk1[0].orphaned_at).toBeNull();

    // Now PATCH with empty body (image removed)
    const { rows: r2 } = await pool.query('SELECT updated_at FROM documents WHERE id = $1', [doc.id]);
    const patch = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', `W/"${r2[0].updated_at.toISOString()}"`)
      .send({ body_json: { type: 'doc', content: [] } });
    expect(patch.status).toBe(200);

    const { rows } = await pool.query(
      'SELECT orphaned_at FROM document_attachments WHERE document_id = $1 AND stored_name = $2',
      [doc.id, storedName]
    );
    expect(rows[0].orphaned_at).not.toBeNull();
  });

  // G1-ReAdd: re-referencing an orphaned attachment clears orphaned_at again
  it('G1-ReAdd: PATCH body_json that re-references an orphaned attachment clears orphaned_at', async () => {
    const up = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'pixel.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    const storedName = up.body.url.split('/').pop();

    // Confirm it starts orphaned
    const { rows: start } = await pool.query(
      'SELECT orphaned_at FROM document_attachments WHERE document_id = $1 AND stored_name = $2',
      [doc.id, storedName]
    );
    expect(start[0].orphaned_at).not.toBeNull();

    // PATCH to re-embed the image
    const { rows: r } = await pool.query('SELECT updated_at FROM documents WHERE id = $1', [doc.id]);
    const body = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [
        { type: 'image', attrs: { src: up.body.url } }
      ]}]
    };
    const patch = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', `W/"${r[0].updated_at.toISOString()}"`)
      .send({ body_json: body });
    expect(patch.status).toBe(200);

    const { rows } = await pool.query(
      'SELECT orphaned_at FROM document_attachments WHERE document_id = $1 AND stored_name = $2',
      [doc.id, storedName]
    );
    expect(rows[0].orphaned_at).toBeNull();
  });

  // G1-Critical: 409 path must NOT run reconciliation — live image could be wrongly orphaned
  it('G1-Critical: 409 on PATCH leaves attachment orphan state untouched', async () => {
    // Upload an image and embed it
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const up = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', png, 'pixel.png');
    expect(up.status).toBe(201);
    const storedName = up.body.url.split('/').pop();

    // First PATCH embeds the image (clears orphaned_at)
    const get1 = await request(app).get(`/api/documents/${doc.id}`).set('Authorization', `Bearer ${adminToken}`);
    const etag1 = get1.headers['etag'];
    const bodyWithImage = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: `/api/documents/${doc.id}/attachments/${storedName}` } }]
    };
    const p1 = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag1)
      .send({ body_json: bodyWithImage });
    expect(p1.status).toBe(200);

    // Confirm orphaned_at cleared
    const { rows: r1 } = await pool.query('SELECT orphaned_at FROM document_attachments WHERE document_id = $1', [doc.id]);
    expect(r1[0].orphaned_at).toBeNull();

    // Bump updated_at so etag1 is now stale
    await pool.query(`UPDATE documents SET updated_at = now() + interval '1 second' WHERE id = $1`, [doc.id]);

    // Attempt PATCH that removes the image but uses the stale ETag — must 409
    const bodyWithoutImage = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'no image' }] }] };
    const p2 = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag1)
      .send({ body_json: bodyWithoutImage });
    expect(p2.status).toBe(409);

    // Reconciliation must NOT have run on the 409 path. orphaned_at must still be NULL.
    const { rows: r2 } = await pool.query('SELECT orphaned_at FROM document_attachments WHERE document_id = $1', [doc.id]);
    expect(r2[0].orphaned_at).toBeNull();
  });

  // G1-DeleteCascade: deleting a parent removes attachment files for parent + child
  it('G1-DeleteCascade: DELETE parent removes attachment files for parent and child docs', async () => {
    // Upload image to parent doc
    const parentUp = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'parent.png', contentType: 'image/png' });
    expect(parentUp.status).toBe(201);
    const parentFile = parentUp.body.url.split('/').pop();

    // Create child doc
    const childIns = await pool.query(
      `INSERT INTO documents (client_id, parent_id, title, created_by, updated_by)
       VALUES ($1, $2, 'Child', 'test', 'test') RETURNING *`,
      [lighthouse.id, doc.id]
    );
    const childDoc = childIns.rows[0];

    // Upload image to child doc
    const childUp = await request(app)
      .post(`/api/documents/${childDoc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PIXEL_PNG, { filename: 'child.png', contentType: 'image/png' });
    expect(childUp.status).toBe(201);
    const childFile = childUp.body.url.split('/').pop();

    // Confirm both files exist on disk
    expect(fs.existsSync(path.join(uploadDir, parentFile))).toBe(true);
    expect(fs.existsSync(path.join(uploadDir, childFile))).toBe(true);

    // DELETE the parent
    const del = await request(app)
      .delete(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(204);

    // Both files should be gone
    expect(fs.existsSync(path.join(uploadDir, parentFile))).toBe(false);
    expect(fs.existsSync(path.join(uploadDir, childFile))).toBe(false);

    // Both attachment rows should be gone (FK cascade)
    const { rows } = await pool.query(
      `SELECT id FROM document_attachments WHERE stored_name = ANY($1::text[])`,
      [[parentFile, childFile]]
    );
    expect(rows.length).toBe(0);
  });

  // G1-DeleteCascade-Deep: grandchild attachments cleaned up on root delete
  it('G1-DeleteCascade-Deep: grandchild attachments are also cleaned up on parent delete', async () => {
    // Insert child under doc, then grandchild under child
    const child = await pool.query(
      `INSERT INTO documents (client_id, parent_id, title, created_by, updated_by)
       VALUES ($1, $2, 'Child', 't', 't') RETURNING id`,
      [lighthouse.id, doc.id]
    );
    const grand = await pool.query(
      `INSERT INTO documents (client_id, parent_id, title, created_by, updated_by)
       VALUES ($1, $2, 'Grand', 't', 't') RETURNING id`,
      [lighthouse.id, child.rows[0].id]
    );

    // Upload an image to the grandchild
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const up = await request(app)
      .post(`/api/documents/${grand.rows[0].id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', png, 'gc.png');
    expect(up.status).toBe(201);
    const storedName = up.body.url.split('/').pop();
    const fullPath = path.join(uploadDir, storedName);
    expect(fs.existsSync(fullPath)).toBe(true);

    // Delete the root doc — recursive CTE should collect the grandchild attachment
    const del = await request(app)
      .delete(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(204);
    expect(fs.existsSync(fullPath)).toBe(false);

    // DB row gone too
    const { rows: r } = await pool.query('SELECT id FROM document_attachments WHERE stored_name = $1', [storedName]);
    expect(r.length).toBe(0);
  });

  // G1-Sweep-Recent: attachment orphaned 23h ago is NOT swept
  it('G1-Sweep-Recent: sweep leaves attachments orphaned less than 24h ago', async () => {
    // Insert doc + attachment with orphaned_at = now() - 23 hours
    const attIns = await pool.query(
      `INSERT INTO document_attachments
         (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by, orphaned_at)
       VALUES ($1, 'recent.png', 'g1_sweep_recent.png', 'image/png', 100, 'test',
               now() - interval '23 hours')
       RETURNING id`,
      [doc.id]
    );
    const attId = attIns.rows[0].id;
    // Create the file on disk so unlink would be attempted if sweep runs
    const filePath = path.join(uploadDir, 'g1_sweep_recent.png');
    fs.writeFileSync(filePath, 'fake');

    try {
      const result = await runAttachmentSweep();
      expect(result.deleted).toBe(0);

      // Row still present
      const { rows } = await pool.query(
        'SELECT id FROM document_attachments WHERE id = $1', [attId]
      );
      expect(rows.length).toBe(1);
      // File still on disk
      expect(fs.existsSync(filePath)).toBe(true);
    } finally {
      // Cleanup
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await pool.query('DELETE FROM document_attachments WHERE id = $1', [attId]);
    }
  });

  // G1-Sweep-Old: attachment orphaned 25h ago IS swept
  it('G1-Sweep-Old: sweep removes attachments orphaned more than 24h ago', async () => {
    const attIns = await pool.query(
      `INSERT INTO document_attachments
         (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by, orphaned_at)
       VALUES ($1, 'old.png', 'g1_sweep_old.png', 'image/png', 100, 'test',
               now() - interval '25 hours')
       RETURNING id`,
      [doc.id]
    );
    const attId = attIns.rows[0].id;
    const filePath = path.join(uploadDir, 'g1_sweep_old.png');
    fs.writeFileSync(filePath, 'fake');

    try {
      const result = await runAttachmentSweep();
      expect(result.deleted).toBeGreaterThanOrEqual(1);

      // Row gone
      const { rows } = await pool.query(
        'SELECT id FROM document_attachments WHERE id = $1', [attId]
      );
      expect(rows.length).toBe(0);
      // File gone
      expect(fs.existsSync(filePath)).toBe(false);
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await pool.query('DELETE FROM document_attachments WHERE id = $1', [attId]);
    }
  });

  // G1-Sweep-Race: row preserved if orphaned_at cleared between SELECT and DELETE
  it('G1-Sweep-Race: row preserved if orphaned_at cleared between SELECT and DELETE', async () => {
    // Insert an attachment that LOOKS sweepable (orphaned_at = now() - 25h)
    const { rows: aiRows } = await pool.query(
      `INSERT INTO document_attachments
         (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by, orphaned_at)
       VALUES ($1, 'race.png', $2, 'image/png', 100, 'test', now() - interval '25 hours')
       RETURNING id, stored_name`,
      [doc.id, `doc_race_${Date.now()}.png`]
    );
    const raceId = aiRows[0].id;
    // Simulate the race: clear orphaned_at BEFORE the sweep runs.
    // The WHERE clause on the DELETE is what guards the row.
    await pool.query(`UPDATE document_attachments SET orphaned_at = NULL WHERE id = $1`, [raceId]);

    await runAttachmentSweep();

    // Row must still exist because orphaned_at was NULL when DELETE ran
    const { rows: still } = await pool.query('SELECT id FROM document_attachments WHERE id = $1', [raceId]);
    expect(still.length).toBe(1);

    // Cleanup
    await pool.query('DELETE FROM document_attachments WHERE id = $1', [raceId]);
  });

  // G1-Sweep-Mixed: only the > 24h orphan is removed
  it('G1-Sweep-Mixed: sweep removes only the attachment past the grace window', async () => {
    // Attachment 1: not orphaned (orphaned_at = NULL)
    const ins1 = await pool.query(
      `INSERT INTO document_attachments
         (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by)
       VALUES ($1, 'mix1.png', 'g1_mix_null.png', 'image/png', 100, 'test')
       RETURNING id`,
      [doc.id]
    );
    // Attachment 2: orphaned 23h ago (within grace)
    const ins2 = await pool.query(
      `INSERT INTO document_attachments
         (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by, orphaned_at)
       VALUES ($1, 'mix2.png', 'g1_mix_recent.png', 'image/png', 100, 'test',
               now() - interval '23 hours')
       RETURNING id`,
      [doc.id]
    );
    // Attachment 3: orphaned 25h ago (past grace)
    const ins3 = await pool.query(
      `INSERT INTO document_attachments
         (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by, orphaned_at)
       VALUES ($1, 'mix3.png', 'g1_mix_old.png', 'image/png', 100, 'test',
               now() - interval '25 hours')
       RETURNING id`,
      [doc.id]
    );

    const id1 = ins1.rows[0].id;
    const id2 = ins2.rows[0].id;
    const id3 = ins3.rows[0].id;

    const file3 = path.join(uploadDir, 'g1_mix_old.png');
    fs.writeFileSync(file3, 'fake');

    try {
      const result = await runAttachmentSweep();
      expect(result.deleted).toBeGreaterThanOrEqual(1);

      // Attachment 1 (null) still present
      const { rows: r1 } = await pool.query('SELECT id FROM document_attachments WHERE id = $1', [id1]);
      expect(r1.length).toBe(1);

      // Attachment 2 (23h) still present
      const { rows: r2 } = await pool.query('SELECT id FROM document_attachments WHERE id = $1', [id2]);
      expect(r2.length).toBe(1);

      // Attachment 3 (25h) gone
      const { rows: r3 } = await pool.query('SELECT id FROM document_attachments WHERE id = $1', [id3]);
      expect(r3.length).toBe(0);
      expect(fs.existsSync(file3)).toBe(false);
    } finally {
      if (fs.existsSync(file3)) fs.unlinkSync(file3);
      await pool.query(
        'DELETE FROM document_attachments WHERE id = ANY($1::uuid[])',
        [[id1, id2, id3]]
      );
    }
  });
});

// =============================================================================
// Documents: POST /api/documents/:id/move (Task F1 — drag-to-reparent)
// =============================================================================

describe('Documents: move (F1)', () => {
  let admin, adminToken, lighthouse;

  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    adminToken = await mintSession(admin.id);
    lighthouse = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
  });

  it('F1-Move: moves a root page under another root page', async () => {
    const a = (await pool.query(`INSERT INTO documents (client_id, title, sort_order, created_by, updated_by) VALUES ($1, 'A', 0, 't', 't') RETURNING *`, [lighthouse.id])).rows[0];
    const b = (await pool.query(`INSERT INTO documents (client_id, title, sort_order, created_by, updated_by) VALUES ($1, 'B', 1, 't', 't') RETURNING *`, [lighthouse.id])).rows[0];

    const res = await request(app)
      .post(`/api/documents/${b.id}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent_id: a.id, position: 0 });
    expect(res.status).toBe(200);

    const { rows } = await pool.query('SELECT parent_id, sort_order FROM documents WHERE id = $1', [b.id]);
    expect(rows[0].parent_id).toBe(a.id);
    expect(rows[0].sort_order).toBe(0);
  });

  it('F1-Reorder: reorders siblings under the same parent', async () => {
    const parent = (await pool.query(`INSERT INTO documents (client_id, title, sort_order, created_by, updated_by) VALUES ($1, 'P', 0, 't', 't') RETURNING *`, [lighthouse.id])).rows[0];
    const c1 = (await pool.query(`INSERT INTO documents (client_id, parent_id, title, sort_order, created_by, updated_by) VALUES ($1, $2, 'C1', 0, 't', 't') RETURNING *`, [lighthouse.id, parent.id])).rows[0];
    const c2 = (await pool.query(`INSERT INTO documents (client_id, parent_id, title, sort_order, created_by, updated_by) VALUES ($1, $2, 'C2', 1, 't', 't') RETURNING *`, [lighthouse.id, parent.id])).rows[0];
    const c3 = (await pool.query(`INSERT INTO documents (client_id, parent_id, title, sort_order, created_by, updated_by) VALUES ($1, $2, 'C3', 2, 't', 't') RETURNING *`, [lighthouse.id, parent.id])).rows[0];

    // Move C3 to position 0 (before C1)
    const res = await request(app)
      .post(`/api/documents/${c3.id}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent_id: parent.id, position: 0 });
    expect(res.status).toBe(200);

    const { rows } = await pool.query('SELECT id, sort_order FROM documents WHERE parent_id = $1 ORDER BY sort_order', [parent.id]);
    expect(rows.map(r => r.id)).toEqual([c3.id, c1.id, c2.id]);
  });

  it('F1-MoveToRoot: moves a child page to root level', async () => {
    const parent = (await pool.query(`INSERT INTO documents (client_id, title, sort_order, created_by, updated_by) VALUES ($1, 'P', 0, 't', 't') RETURNING *`, [lighthouse.id])).rows[0];
    const child = (await pool.query(`INSERT INTO documents (client_id, parent_id, title, sort_order, created_by, updated_by) VALUES ($1, $2, 'Child', 0, 't', 't') RETURNING *`, [lighthouse.id, parent.id])).rows[0];

    const res = await request(app)
      .post(`/api/documents/${child.id}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent_id: null, position: 0 });
    expect(res.status).toBe(200);

    const { rows } = await pool.query('SELECT parent_id FROM documents WHERE id = $1', [child.id]);
    expect(rows[0].parent_id).toBeNull();
  });

  it('F1-Cycle: rejects move into own descendant', async () => {
    const root = (await pool.query(`INSERT INTO documents (client_id, title, sort_order, created_by, updated_by) VALUES ($1, 'Root', 0, 't', 't') RETURNING *`, [lighthouse.id])).rows[0];
    const child = (await pool.query(`INSERT INTO documents (client_id, parent_id, title, sort_order, created_by, updated_by) VALUES ($1, $2, 'Child', 0, 't', 't') RETURNING *`, [lighthouse.id, root.id])).rows[0];
    const grand = (await pool.query(`INSERT INTO documents (client_id, parent_id, title, sort_order, created_by, updated_by) VALUES ($1, $2, 'Grand', 0, 't', 't') RETURNING *`, [lighthouse.id, child.id])).rows[0];

    // Try to move root under its grandchild
    const res = await request(app)
      .post(`/api/documents/${root.id}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent_id: grand.id, position: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/circular|cycle|descendant/i);
  });

  it('F1-SelfParent: rejects move to self as parent', async () => {
    const doc = (await pool.query(`INSERT INTO documents (client_id, title, sort_order, created_by, updated_by) VALUES ($1, 'Doc', 0, 't', 't') RETURNING *`, [lighthouse.id])).rows[0];

    const res = await request(app)
      .post(`/api/documents/${doc.id}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent_id: doc.id, position: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/circular|cycle|self/i);
  });

  it('F1-Auth: returns 401 for unauthenticated request', async () => {
    const doc = (await pool.query(`INSERT INTO documents (client_id, title, sort_order, created_by, updated_by) VALUES ($1, 'Doc', 0, 't', 't') RETURNING *`, [lighthouse.id])).rows[0];

    const res = await request(app)
      .post(`/api/documents/${doc.id}/move`)
      .send({ parent_id: null, position: 0 });
    expect(res.status).toBe(401);
  });
});

describe('Documents — first-open seed', () => {
  it('GET /api/documents?client_id=... seeds 6 default pages on first call', async () => {
    const u = await createTestUser({ role: 'admin' });
    const t = await mintSession(u.id);
    const c = await createTestClient({ name: 'Fresh Client', sector: 'gaming' });
    const res = await request(app)
      .get(`/api/documents?client_id=${c.id}`)
      .set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    const titles = res.body.map(d => d.title);
    expect(titles).toEqual(expect.arrayContaining(['Overview', 'Contacts', 'Risks', 'Decisions', 'Architecture', 'Notes']));
    expect(res.body.length).toBe(6);
  });

  it('Subsequent calls do not re-seed', async () => {
    const u = await createTestUser({ role: 'admin' });
    const t = await mintSession(u.id);
    const c = await createTestClient({ name: 'Fresh Client 2', sector: 'gaming' });
    await request(app).get(`/api/documents?client_id=${c.id}`).set('Authorization', `Bearer ${t}`);
    const res = await request(app).get(`/api/documents?client_id=${c.id}`).set('Authorization', `Bearer ${t}`);
    expect(res.body.length).toBe(6);
  });
});
