// dashboard-server/tests/unit/escape.test.mjs
//
// Retroactive test for the double-escape fix shipped in commits
// 203dad6 (W1) and abac7f2 (W2) on 2026-04-15.
//
// Asserts that user-supplied text containing escape-prone characters
// (apostrophe, quote, ampersand, angle brackets) round-trips through
// the API and the database without being HTML-entity-encoded.
//
// If this test ever fails, somebody has reintroduced server-side
// escaping on a write path. Find the culprit and revert.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });
// No afterAll(end()) — the pool is shared across test files and is
// cleaned up when the vitest fork process terminates.

const NASTY_TITLE = `can't "quoted" & <tag>`;
const NASTY_DESC = `apostrophes: can't\nquotes: "hello"\nampersand: A & B\nbrackets: <div>x</div>`;

describe('double-escape regression', () => {
  it('POST /api/bug-reports stores raw user text and returns it raw', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'bug',
        title: NASTY_TITLE,
        description: NASTY_DESC,
        page: '/test',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(NASTY_TITLE);
    expect(res.body.description).toBe(NASTY_DESC);

    // And the DB row matches
    const { rows } = await pool.query(
      'SELECT title, description FROM bug_reports WHERE id = $1',
      [res.body.id]
    );
    expect(rows[0].title).toBe(NASTY_TITLE);
    expect(rows[0].description).toBe(NASTY_DESC);
  });

  it('PATCH /api/bug-reports/:id does not re-escape on update', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const created = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'bug', title: 'initial', description: 'initial' });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .patch(`/api/bug-reports/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: NASTY_TITLE, description: NASTY_DESC });

    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe(NASTY_TITLE);
    expect(updated.body.description).toBe(NASTY_DESC);

    const { rows } = await pool.query(
      'SELECT title, description FROM bug_reports WHERE id = $1',
      [created.body.id]
    );
    expect(rows[0].title).toBe(NASTY_TITLE);
    expect(rows[0].description).toBe(NASTY_DESC);
  });

  it('POST /api/bug-reports/:id/comments stores comment text raw', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const bug = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'bug', title: 'parent', description: 'parent' });

    const COMMENT = `It's "still" broken & the <dropdown> doesn't work`;
    const comment = await request(app)
      .post(`/api/bug-reports/${bug.body.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: COMMENT });

    expect(comment.status).toBe(201);
    expect(comment.body.text).toBe(COMMENT);

    const { rows } = await pool.query(
      'SELECT text FROM bug_report_comments WHERE id = $1',
      [comment.body.id]
    );
    expect(rows[0].text).toBe(COMMENT);
  });
});
