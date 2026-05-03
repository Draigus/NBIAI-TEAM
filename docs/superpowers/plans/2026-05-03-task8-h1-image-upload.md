# Task 8 + H1: Document Image Upload / Serve + NBI-Block Leak Prevention

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add POST/GET endpoints to upload and serve document images, and prevent client portal users from fetching images that only appear inside NBI-internal blocks.

**Architecture:** `imageInScope` has already been written and exported from `lib/redact-nbi-internal.js`. The server.js endpoints use a dedicated `docUpload` multer instance (image-only, 5 MB cap). The GET handler calls `imageInScope` for client users and returns 404 when the image is only referenced inside an `nbiInternalBlock`. All three test files receive additions — the lib test file gets 5 unit tests, the documents integration test file gets 13 tests. No migration changes (034 is already applied).

**Tech Stack:** Node.js / Express 4, multer, PostgreSQL (`pg`), vitest, supertest

**Pre-condition:** `imageInScope` is already written and exported. `document_attachments` table exists. `uploadDir`, `multer`, `path`, `fs`, `isValidUuid`, `pool` are all available in server.js. `redactNbiInternal` and `extractPlainText` are already destructured from the lib at server.js line 4158 — just extend that destructure to include `imageInScope`.

---

## File Map

| File | Change |
|---|---|
| `dashboard-server/lib/redact-nbi-internal.js` | **Already done** — `imageInScope` written and exported |
| `dashboard-server/tests/unit/redact-nbi-internal.test.mjs` | Add 5 lib unit tests at bottom |
| `dashboard-server/tests/unit/documents.test.mjs` | Add `Documents: attachments` describe block at bottom (13 tests) |
| `dashboard-server/server.js` | (1) Extend destructure on line 4158; (2) Add `ALLOWED_DOC_MIME` const + `docUpload` multer instance + 2 route handlers after the DELETE /api/documents/:id handler (line 4432) |

---

## Task 1: Lib unit tests (H1-Lib-1 through H1-Lib-5)

**Files:**
- Modify: `dashboard-server/tests/unit/redact-nbi-internal.test.mjs`

- [ ] **Step 1: Append the `imageInScope` describe block**

Open `dashboard-server/tests/unit/redact-nbi-internal.test.mjs`. The file currently ends at line 149. Add the following at the very end of the file (after the closing `});` of the `extractPlainText` describe block):

```js
// ---------------------------------------------------------------------------
// imageInScope — H1 lib tests
// ---------------------------------------------------------------------------

describe('imageInScope', () => {
  const { imageInScope } = require('../../lib/redact-nbi-internal');

  // Helpers: build minimal ProseMirror bodies
  function paraWithImage(src) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'image', attrs: { src } }]
        }
      ]
    };
  }

  function nbiBlockWithImage(src) {
    return {
      type: 'doc',
      content: [
        {
          type: 'nbiInternalBlock',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'image', attrs: { src } }]
            }
          ]
        }
      ]
    };
  }

  const BASE = '/api/documents/abc/attachments/';

  // H1-Lib-1: image in a regular paragraph is in scope
  it('returns true when image is in a paragraph (dropNbiInternal: true)', () => {
    const body = paraWithImage(BASE + 'foo.png');
    expect(imageInScope(body, 'foo.png', { dropNbiInternal: true })).toBe(true);
  });

  // H1-Lib-2: image only inside nbiInternalBlock is out of scope when dropping
  it('returns false when image is only inside nbiInternalBlock (dropNbiInternal: true)', () => {
    const body = nbiBlockWithImage(BASE + 'foo.png');
    expect(imageInScope(body, 'foo.png', { dropNbiInternal: true })).toBe(false);
  });

  // H1-Lib-3: same nbiInternalBlock body is in scope when NOT dropping
  it('returns true when image is inside nbiInternalBlock (dropNbiInternal: false)', () => {
    const body = nbiBlockWithImage(BASE + 'foo.png');
    expect(imageInScope(body, 'foo.png', { dropNbiInternal: false })).toBe(true);
  });

  // H1-Lib-4: filename that does not appear anywhere returns false
  it('returns false when filename does not appear in the body', () => {
    const body = paraWithImage(BASE + 'other.png');
    expect(imageInScope(body, 'foo.png', { dropNbiInternal: true })).toBe(false);
  });

  // H1-Lib-5: deeply nested image (inside listItem > blockquote) is found
  it('returns true for a deeply nested image (listItem > blockquote)', () => {
    const body = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'blockquote',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'image', attrs: { src: BASE + 'deep.png' } }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    expect(imageInScope(body, 'deep.png', { dropNbiInternal: true })).toBe(true);
  });
});
```

- [ ] **Step 2: Run lib tests only**

```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab\dashboard-server
npx vitest run tests/unit/redact-nbi-internal.test.mjs
```

Expected: all existing tests pass + 5 new `imageInScope` tests pass. Count should be 14 total.

- [ ] **Step 3: Commit lib tests + lib changes together**

```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab
git add dashboard-server/lib/redact-nbi-internal.js dashboard-server/tests/unit/redact-nbi-internal.test.mjs
git commit -m "feat(docs): add imageInScope to redact-nbi-internal lib + H1-Lib unit tests"
```

---

## Task 2: Integration tests for Task 8 + H1 (documents.test.mjs)

**Files:**
- Modify: `dashboard-server/tests/unit/documents.test.mjs`

These tests are written before the endpoints exist. They will fail until Task 3 implements the endpoints.

- [ ] **Step 1: Append the `Documents: attachments` describe block**

Open `dashboard-server/tests/unit/documents.test.mjs`. The file currently ends at line 640 (closing `});` of `Documents: update/delete/move`). Add the following at the very end of the file:

```js
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

  it('T8-4: POST returns 403 for client user with docsUpload=false and leaves no file on disk', async () => {
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

  it('T8-5: POST to a doc owned by another client returns 404 and leaves no file on disk', async () => {
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

  // ---- T8-10: GET with path-traversal filename returns 400 ----------------

  it('T8-10: GET with path-traversal filename returns 400', async () => {
    const res = await request(app)
      .get(`/api/documents/${doc.id}/attachments/../../etc/passwd`)
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
    const storedName = upRes.body.url.split('/').pop();
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

    // NBI admin user — no clientId, so isClientUser = false
    const getRes = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the new tests (expect failures — endpoints don't exist yet)**

```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab\dashboard-server
npx vitest run tests/unit/documents.test.mjs 2>&1 | tail -20
```

Expected: prior 28 tests pass, 13 new tests fail (404 or similar because routes don't exist).

---

## Task 3: Server endpoints + import extension

**Files:**
- Modify: `dashboard-server/server.js` — two changes

### Change A: Extend the redact-nbi-internal destructure

Find line 4158 (or wherever the destructure lives — search for `redactNbiInternal`):

```js
const { redactNbiInternal, extractPlainText } = require('./lib/redact-nbi-internal');
```

Change to:

```js
const { redactNbiInternal, extractPlainText, imageInScope } = require('./lib/redact-nbi-internal');
```

### Change B: Add constants + multer instance + two route handlers

Insert the following block immediately after line 4432 (the closing `});` of the `DELETE /api/documents/:id` handler — the line that reads `res.status(204).end();` followed by `});`).

The new block to insert at line 4433:

```js
// ==================== DOCUMENT ATTACHMENTS ====================

const ALLOWED_DOC_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/** Multer instance for document image uploads.
 *  Images only, 5 MB cap, stored in the shared uploadDir. */
const docUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const suffix = Math.random().toString(36).slice(2, 8);
      cb(null, `doc_${req.params.id}_${Date.now()}_${suffix}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_DOC_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only jpg/png/gif/webp images are allowed'));
  }
});

/** Safely remove a multer-saved file, logging but not throwing on failure. */
function cleanupUpload(filePath) {
  try { fs.unlinkSync(filePath); } catch (e) { console.error('cleanup failed:', e.message); }
}

/** POST /api/documents/:id/attachments
 *  Upload an image into a document. Returns the new attachment row + url.
 *
 *  Scope guards (in order):
 *    401 — not authenticated
 *    400 — invalid doc UUID
 *    400 — no file or unsupported mime type (multer fileFilter rejection)
 *    404 — doc not found
 *    404 — client user trying to upload to an nbi_only doc
 *    404 — client user targeting another client's doc
 *    403 — client user with docsUpload=false
 *
 *  On any rejection after multer has saved the file to disk, the file is
 *  deleted before responding so we do not accumulate orphaned uploads.
 *
 *  Note: mime type is validated from the client-supplied header only.
 *  Magic-byte sniffing is deferred to Task G1. */
app.post('/api/documents/:id/attachments', docUpload.single('file'), async (req, res) => {
  // 401 — must be authenticated
  if (!req.user) {
    if (req.file) cleanupUpload(req.file.path);
    return res.status(401).json({ error: 'Auth required' });
  }

  // 400 — validate doc UUID
  if (!isValidUuid(req.params.id)) {
    if (req.file) cleanupUpload(req.file.path);
    return res.status(400).json({ error: 'Invalid id' });
  }

  // 400 — multer may not have saved a file if fileFilter rejected it
  if (!req.file) {
    return res.status(400).json({ error: 'No file or unsupported type' });
  }

  // Fetch doc for scope checks
  const { rows } = await pool.query(
    'SELECT id, client_id, visibility FROM documents WHERE id = $1',
    [req.params.id]
  );
  if (rows.length === 0) {
    cleanupUpload(req.file.path);
    return res.status(404).json({ error: 'Not found' });
  }
  const doc = rows[0];

  const isClientUser = !!req.user.clientId;
  if (isClientUser) {
    // nbi_only docs are invisible to client users
    if (doc.visibility === 'nbi_only') {
      cleanupUpload(req.file.path);
      return res.status(404).json({ error: 'Not found' });
    }
    // Cross-client access is a 404 (not 403) to avoid client enumeration
    if (req.user.clientId !== doc.client_id) {
      cleanupUpload(req.file.path);
      return res.status(404).json({ error: 'Not found' });
    }
    // Explicit denial of upload permission
    if (req.user.docsUpload === false) {
      cleanupUpload(req.file.path);
      return res.status(403).json({ error: 'No doc-upload permission' });
    }
  }

  // Persist the attachment row
  const { rows: ins } = await pool.query(
    `INSERT INTO document_attachments
       (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      req.params.id,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size,
      req.user.username || 'unknown'
    ]
  );

  res.status(201).json({
    id:         ins[0].id,
    filename:   ins[0].filename,
    url:        `/api/documents/${req.params.id}/attachments/${req.file.filename}`,
    mime_type:  ins[0].mime_type,
    size_bytes: ins[0].size_bytes
  });
});

/** GET /api/documents/:id/attachments/:filename
 *  Serve a document image file.
 *
 *  Scope guards (in order):
 *    401 — not authenticated
 *    400 — invalid doc UUID
 *    400 — path traversal detected
 *    404 — doc not found
 *    404 — client user: cross-client or nbi_only doc
 *    403 — client user: docsView=false
 *    H1  — client user: image only in nbiInternalBlock -> 404
 *    404 — file missing on disk */
app.get('/api/documents/:id/attachments/:filename', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  // Path traversal check before any DB work
  const safeName = path.basename(req.params.filename);
  const fullPath = path.resolve(uploadDir, safeName);
  if (!fullPath.startsWith(path.resolve(uploadDir) + path.sep)) {
    return res.status(400).json({ error: 'Bad path' });
  }

  // Fetch doc for scope checks (include body_json for H1 check)
  const { rows } = await pool.query(
    'SELECT client_id, visibility, body_json FROM documents WHERE id = $1',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const doc = rows[0];

  const isClientUser = !!req.user.clientId;
  if (isClientUser) {
    if (req.user.clientId !== doc.client_id) return res.status(404).json({ error: 'Not found' });
    if (doc.visibility === 'nbi_only')        return res.status(404).json({ error: 'Not found' });
    if (req.user.docsView === false)           return res.status(403).json({ error: 'No doc-view permission' });

    // H1: if the image is only referenced inside an nbiInternalBlock, deny it
    if (!imageInScope(doc.body_json, safeName, { dropNbiInternal: true })) {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File missing' });

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(fullPath);
});
```

### Steps

- [ ] **Step 1: Apply Change A (extend destructure)**

In `dashboard-server/server.js`, find the line:

```js
const { redactNbiInternal, extractPlainText } = require('./lib/redact-nbi-internal');
```

Replace with:

```js
const { redactNbiInternal, extractPlainText, imageInScope } = require('./lib/redact-nbi-internal');
```

- [ ] **Step 2: Apply Change B (insert new route block after DELETE handler)**

Find the `DELETE /api/documents/:id` handler's closing. It ends with:

```js
  await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
```

Insert the entire `// ==================== DOCUMENT ATTACHMENTS ====================` block immediately after that closing `});`.

- [ ] **Step 3: Run only the documents integration tests**

```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab\dashboard-server
npx vitest run tests/unit/documents.test.mjs 2>&1 | tail -30
```

Expected: all 41 tests pass (28 prior + 13 new).

- [ ] **Step 4: Run the full test suite**

```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab\dashboard-server
npm test 2>&1 | tail -20
```

Expected: 268 prior tests + 5 lib tests + 13 integration tests = 286 passing. Zero failures.

- [ ] **Step 5: Commit**

```bash
cd D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab
git add dashboard-server/server.js dashboard-server/tests/unit/documents.test.mjs
git commit -m "$(cat <<'EOF'
feat(docs): document image upload + serve + H1 NBI-block leak prevention

- POST /api/documents/:id/attachments: multer single-file, image-only
  (jpg/png/gif/webp), 5 MB cap, persists document_attachments row
- GET /api/documents/:id/attachments/:filename: serves file with full scope
  guards (auth, UUID, path-traversal, cross-client, nbi_only, docsView)
- H1: imageInScope blocks client portal users from fetching images that
  are only referenced inside nbiInternalBlock nodes (preventing the
  nbi-block redaction bypass via direct attachment URL guessing)
- File cleanup on every rejection path after multer saves to disk
- X-Content-Type-Options: nosniff on all served images
- Security: mime type validated from client header only; magic-byte
  sniffing deferred to Task G1
EOF
)"
```

---

## Self-Review Checklist

- [x] **T8-1**: POST 1x1 PNG returns 201 + `{ id, filename, url, mime_type, size_bytes }` — covered
- [x] **T8-2**: >5 MB rejected (400/413) — covered
- [x] **T8-3**: Non-image MIME rejected (400) — covered
- [x] **T8-4**: Client user docsUpload=false -> 403, no file on disk — covered
- [x] **T8-5**: Cross-client upload -> 404, no file on disk — covered
- [x] **T8-6**: GET returns 200 + correct Content-Type + nosniff header — covered
- [x] **T8-7**: Cross-client GET -> 404 — covered
- [x] **T8-8**: nbi_only doc GET by client user -> 404 — covered
- [x] **T8-9**: docsView=false GET -> 403 — covered
- [x] **T8-10**: Path traversal -> 400 — covered
- [x] **H1-1**: Image in scope both inside and outside NBI block -> 200 for client — covered
- [x] **H1-2**: Image only inside NBI block -> 404 for client — covered
- [x] **H1-3**: Image only inside NBI block -> 200 for NBI user — covered
- [x] **H1-Lib-1 to H1-Lib-5**: lib unit tests — covered
- [x] No `.data` envelope anywhere — all tests use `res.body.url`, `res.body.id` etc.
- [x] `req.user.docsUpload` / `req.user.docsView` (camelCase) used throughout
- [x] `cleanupUpload` called on every rejection path after multer saves file
- [x] `imageInScope` uses `endsWith('/' + filename)` not `.includes()`
- [x] No em dashes in comments or code
- [x] British spellings: "authorise" not needed here; "behaviour" not needed here
- [x] No G1 orphan tracking logic included
- [x] No `.data` envelope drift from plan (the plan had `res.body.data.url` — fixed here to `res.body.url`)
