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

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate, end } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });
afterAll(async () => { await end(); });

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
});
