// dashboard-server/tests/unit/jd-attachment.test.mjs
//
// Tests for JD upload/download/preview endpoints on hiring positions,
// and CV preview endpoint on candidates.
//
//   1. POST /api/hiring-positions/:id/jd  — upload DOCX or PDF (admin only)
//   2. GET  /api/hiring-positions/:id/jd/preview — inline serving (auth required)
//   3. GET  /api/hiring-positions/:id/jd  — download (auth required)
//   4. GET  /api/candidates/:id/cv/preview — inline CV serving (auth required)

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const {
  createTestUser,
  createTestClient,
  createTestCandidate,
  createTestHiringPosition,
} = require('../helpers/fixtures.js');
const app = require('../../server.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '..', 'fixtures');
const DOCX_PATH = path.join(FIXTURES, 'test.docx');
const PDF_PATH  = path.join(FIXTURES, 'test.pdf');

beforeEach(async () => { await truncate(); });

// ---------------------------------------------------------------------------
// JD Upload
// ---------------------------------------------------------------------------

describe('POST /api/hiring-positions/:id/jd', () => {
  it('admin can upload a DOCX and it is stored in the DB', async () => {
    const admin    = await createTestUser({ role: 'admin' });
    const client   = await createTestClient({ name: 'Acme' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Dev' });
    const token    = await mintSession(admin.id);

    const res = await request(app)
      .post(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', DOCX_PATH, {
        filename: 'test.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(200);

    expect(res.body.jd_original_name).toBe('test.docx');
    expect(res.body.jd_filename).toBeTruthy();
    expect(res.body.id).toBe(position.id);
  });

  it('admin can upload a PDF', async () => {
    const admin    = await createTestUser({ role: 'admin' });
    const client   = await createTestClient({ name: 'Acme' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Dev' });
    const token    = await mintSession(admin.id);

    const res = await request(app)
      .post(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', PDF_PATH, { filename: 'test.pdf', contentType: 'application/pdf' })
      .expect(200);

    expect(res.body.jd_original_name).toBe('test.pdf');
    expect(res.body.jd_filename).toBeTruthy();
  });

  it('rejects non-DOCX/PDF files with 400', async () => {
    const admin    = await createTestUser({ role: 'admin' });
    const position = await createTestHiringPosition({ title: 'Dev' });
    const token    = await mintSession(admin.id);

    // Attach a plain text file
    const buf = Buffer.from('hello world');
    await request(app)
      .post(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', buf, { filename: 'malicious.txt', contentType: 'text/plain' })
      .expect(400);
  });

  it('non-admin NBI member gets 403', async () => {
    const member   = await createTestUser({ role: 'member' });
    const position = await createTestHiringPosition({ title: 'Dev' });
    const token    = await mintSession(member.id);

    await request(app)
      .post(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', DOCX_PATH, {
        filename: 'test.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(403);
  });

  it('returns 404 when the position does not exist', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const fakeId = '00000000-0000-0000-0000-000000000001';

    await request(app)
      .post(`/api/hiring-positions/${fakeId}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', DOCX_PATH, {
        filename: 'test.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(404);
  });
});

// ---------------------------------------------------------------------------
// JD Download
// ---------------------------------------------------------------------------

describe('GET /api/hiring-positions/:id/jd', () => {
  it('NBI user can download a JD with the original filename in Content-Disposition', async () => {
    const admin    = await createTestUser({ role: 'admin' });
    const client   = await createTestClient({ name: 'Acme' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Dev' });
    const token    = await mintSession(admin.id);

    // Upload first
    await request(app)
      .post(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', PDF_PATH, { filename: 'my-job-spec.pdf', contentType: 'application/pdf' })
      .expect(200);

    const res = await request(app)
      .get(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.headers['content-disposition']).toMatch(/my-job-spec\.pdf/);
  });

  it('returns 404 when no JD is attached', async () => {
    const admin    = await createTestUser({ role: 'admin' });
    const position = await createTestHiringPosition({ title: 'Dev' });
    const token    = await mintSession(admin.id);

    await request(app)
      .get(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(404);
  });

  it('client user can download JD for their own client position', async () => {
    const admin    = await createTestUser({ role: 'admin' });
    const client   = await createTestClient({ name: 'Acme' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Dev' });
    const adminToken = await mintSession(admin.id);
    const clientToken = await mintSession(clientUser.id);

    // Upload as admin
    await request(app)
      .post(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${adminToken}`)
      .attach('file', PDF_PATH, { filename: 'spec.pdf', contentType: 'application/pdf' })
      .expect(200);

    // Download as client user
    const res = await request(app)
      .get(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${clientToken}`)
      .expect(200);

    expect(res.headers['content-disposition']).toMatch(/spec\.pdf/);
  });

  it('client user gets 403 for another client\'s position JD', async () => {
    const admin    = await createTestUser({ role: 'admin' });
    const clientA  = await createTestClient({ name: 'ClientA' });
    const clientB  = await createTestClient({ name: 'ClientB' });
    const userA    = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const position = await createTestHiringPosition({ client_id: clientB.id, title: 'Dev' });
    const adminToken = await mintSession(admin.id);
    const userAToken = await mintSession(userA.id);

    // Upload as admin
    await request(app)
      .post(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${adminToken}`)
      .attach('file', PDF_PATH, { filename: 'spec.pdf', contentType: 'application/pdf' })
      .expect(200);

    // Attempt download as client user for a different client
    await request(app)
      .get(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${userAToken}`)
      .expect(403);
  });
});

// ---------------------------------------------------------------------------
// JD Preview
// ---------------------------------------------------------------------------

describe('GET /api/hiring-positions/:id/jd/preview', () => {
  it('returns file inline (Content-Disposition does not contain "attachment")', async () => {
    const admin    = await createTestUser({ role: 'admin' });
    const client   = await createTestClient({ name: 'Acme' });
    const position = await createTestHiringPosition({ client_id: client.id, title: 'Dev' });
    const token    = await mintSession(admin.id);

    await request(app)
      .post(`/api/hiring-positions/${position.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', PDF_PATH, { filename: 'spec.pdf', contentType: 'application/pdf' })
      .expect(200);

    const res = await request(app)
      .get(`/api/hiring-positions/${position.id}/jd/preview`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.headers['content-disposition']).toMatch(/^inline/);
    expect(res.headers['content-disposition']).not.toMatch(/attachment/);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('returns 401 when unauthenticated', async () => {
    const position = await createTestHiringPosition({ title: 'Dev' });

    await request(app)
      .get(`/api/hiring-positions/${position.id}/jd/preview`)
      .expect(401);
  });
});

// ---------------------------------------------------------------------------
// CV Preview
// ---------------------------------------------------------------------------

describe('GET /api/candidates/:id/cv/preview', () => {
  it('returns CV inline (Content-Disposition starts with inline)', async () => {
    const admin    = await createTestUser({ role: 'admin' });
    const client   = await createTestClient({ name: 'Acme' });
    const candidate = await createTestCandidate({ name: 'Alice', client_id: client.id });
    const token    = await mintSession(admin.id);

    // Upload a CV first
    await request(app)
      .post(`/api/candidates/${candidate.id}/cv`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', PDF_PATH, { filename: 'alice-cv.pdf', contentType: 'application/pdf' })
      .expect(200);

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/cv/preview`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.headers['content-disposition']).toMatch(/^inline/);
    expect(res.headers['content-disposition']).not.toMatch(/attachment/);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('returns 404 when no CV is uploaded', async () => {
    const admin     = await createTestUser({ role: 'admin' });
    const candidate = await createTestCandidate({ name: 'Bob' });
    const token     = await mintSession(admin.id);

    await request(app)
      .get(`/api/candidates/${candidate.id}/cv/preview`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const candidate = await createTestCandidate({ name: 'Carol' });

    await request(app)
      .get(`/api/candidates/${candidate.id}/cv/preview`)
      .expect(401);
  });

  it('client user can preview their own candidate CV', async () => {
    const admin     = await createTestUser({ role: 'admin' });
    const client    = await createTestClient({ name: 'Acme' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const candidate = await createTestCandidate({ name: 'Dave', client_id: client.id });
    const adminToken = await mintSession(admin.id);
    const clientToken = await mintSession(clientUser.id);

    await request(app)
      .post(`/api/candidates/${candidate.id}/cv`)
      .set('Cookie', `nbi_session=${adminToken}`)
      .attach('file', PDF_PATH, { filename: 'dave-cv.pdf', contentType: 'application/pdf' })
      .expect(200);

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/cv/preview`)
      .set('Cookie', `nbi_session=${clientToken}`)
      .expect(200);

    expect(res.headers['content-disposition']).toMatch(/^inline/);
  });

  it('client user gets 403 for another client\'s candidate CV', async () => {
    const admin     = await createTestUser({ role: 'admin' });
    const clientA   = await createTestClient({ name: 'ClientA' });
    const clientB   = await createTestClient({ name: 'ClientB' });
    const userA     = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const candidate = await createTestCandidate({ name: 'Eve', client_id: clientB.id });
    const adminToken = await mintSession(admin.id);
    const userAToken = await mintSession(userA.id);

    await request(app)
      .post(`/api/candidates/${candidate.id}/cv`)
      .set('Cookie', `nbi_session=${adminToken}`)
      .attach('file', PDF_PATH, { filename: 'eve-cv.pdf', contentType: 'application/pdf' })
      .expect(200);

    await request(app)
      .get(`/api/candidates/${candidate.id}/cv/preview`)
      .set('Cookie', `nbi_session=${userAToken}`)
      .expect(403);
  });
});
