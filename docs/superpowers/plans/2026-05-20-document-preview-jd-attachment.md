# Document Preview + JD Attachments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove requirements from positions, add JD file attachments with DOCX/PDF preview modal, bulk-attach 28 existing Couch Heroes JDs.

**Architecture:** Migration 047 drops `requirements` and adds `jd_filename`/`jd_original_name`. JD upload/download/preview endpoints added to `hiring.js` following the existing CV upload pattern. A reusable `openDocumentPreview()` function in the SPA renders DOCX via mammoth.js (lazy-loaded) and PDF via iframe. Bulk-attach script copies files to `uploadDir` and updates position rows.

**Tech Stack:** Node.js + Express, PostgreSQL, multer (existing), mammoth.js (new vendor script), monolithic SPA.

**Spec:** `docs/superpowers/specs/2026-05-20-document-preview-jd-attachment.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `dashboard-server/migrations/047_jd_attachment.sql` | Create | Drop `requirements`, add `jd_filename` + `jd_original_name` |
| `dashboard-server/routes/hiring.js` | Modify | Remove `requirements` from GET/POST/PATCH positions, add JD upload/download/preview endpoints, add CV preview endpoint |
| `dashboard-server/public/vendor/mammoth.browser.min.js` | Create | mammoth.js vendor script for DOCX-to-HTML conversion |
| `dashboard-server/tests/unit/jd-attachment.test.mjs` | Create | Tests for JD upload, download, preview, requirements removal |
| `dashboard-server/scripts/bulk-attach-jds.js` | Create | One-time script to attach existing Couch Heroes JDs |
| `nbi_project_dashboard.html` | Modify | Remove requirements UI, add JD section to position detail, add `openDocumentPreview()`, add preview buttons to CV and JD sections |

---

## Task 1: Migration 047

**Files:**
- Create: `dashboard-server/migrations/047_jd_attachment.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 047_jd_attachment.sql
-- Drop requirements (never populated, replaced by JD attachments)
-- Add JD file attachment columns to hiring_positions

ALTER TABLE hiring_positions DROP COLUMN IF EXISTS requirements;

ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS jd_filename TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS jd_original_name TEXT;
```

- [ ] **Step 2: Run the migration**

```
cd dashboard-server && npm run init-db
```

- [ ] **Step 3: Commit**

```
git add dashboard-server/migrations/047_jd_attachment.sql
git commit -m "feat(ats): migration 047 — drop requirements, add JD attachment columns"
```

---

## Task 2: Server — Remove Requirements from Position API

**Files:**
- Modify: `dashboard-server/routes/hiring.js`

- [ ] **Step 1: Remove `requirements` from GET positions SELECT**

At line 74, change:
```
p.salary_range, p.employment_type, p.location, p.requirements, p.interview_panel,
```
to:
```
p.salary_range, p.employment_type, p.location, p.interview_panel,
```

- [ ] **Step 2: Remove `requirements` from POST positions INSERT**

At line 104, change the INSERT columns from:
```sql
INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, requirements, interview_panel)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
```
to:
```sql
INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, interview_panel)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
```

Remove the `requirements` parameter from the array (the `JSON.stringify(req.body.requirements)` line at ~112). Update `interview_panel` parameter index from `$11` to `$10`.

- [ ] **Step 3: Remove `requirements` from PATCH positions**

At line ~132, remove:
```javascript
    if (patchBody.requirements !== undefined) patchBody.requirements = JSON.stringify(patchBody.requirements);
```

At line ~134, remove `'requirements'` from the `buildPatchQuery` allowed fields list:
```javascript
const { updates, vals, nextIdx } = buildPatchQuery(patchBody, ['client_id', 'sow_id', 'title', 'description', 'seniority', 'status', 'salary_range', 'employment_type', 'location', 'interview_panel']);
```

- [ ] **Step 4: Run existing tests**

```
cd dashboard-server && npx vitest run tests/unit/ats-data-foundation.test.mjs
```

The "Enriched hiring positions" tests that send `requirements` in POST/PATCH will still pass — the server just ignores unknown fields in `buildPatchQuery`. But the test that asserts `res.body.requirements` will fail because the column is dropped. Update the test:

In `ats-data-foundation.test.mjs`, in the `'POST creates position with new fields'` test, remove:
```javascript
    expect(res.body.requirements).toEqual(['React', 'Node.js', 'PostgreSQL']);
```

Remove the `requirements` field from the POST `.send()` body in that test. In the `'PATCH updates position fields'` test, change:
```javascript
      .send({ salary_range: '£50k-£65k', requirements: ['Playwright', 'CI/CD'] })
```
to:
```javascript
      .send({ salary_range: '£50k-£65k' })
```
And remove the `requirements` assertion.

- [ ] **Step 5: Run tests to verify they pass**

```
cd dashboard-server && npm test
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/ats-data-foundation.test.mjs
git commit -m "feat(ats): remove requirements from position API"
```

---

## Task 3: Server — JD Upload, Download, and Preview Endpoints

**Files:**
- Modify: `dashboard-server/routes/hiring.js`
- Create: `dashboard-server/tests/unit/jd-attachment.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `dashboard-server/tests/unit/jd-attachment.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestHiringPosition } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

// Create a minimal valid DOCX file for testing (a DOCX is a ZIP with specific XML structure)
// We'll use a real tiny file created on disk
const testDocxPath = path.join(__dirname, '..', 'fixtures', 'test.docx');
const testPdfPath = path.join(__dirname, '..', 'fixtures', 'test.pdf');

describe('JD attachment', () => {
  it('POST uploads a DOCX file and stores filename', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'TestCo' });
    const pos = await createTestHiringPosition({ title: 'Engineer', client_id: client.id });

    const res = await request(app)
      .post(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', testDocxPath)
      .expect(200);

    expect(res.body.jd_filename).toBeTruthy();
    expect(res.body.jd_original_name).toBe('test.docx');
  });

  it('rejects non-DOCX/PDF files', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const pos = await createTestHiringPosition({ title: 'Designer' });

    const txtPath = path.join(__dirname, '..', 'fixtures', 'test.txt');
    fs.writeFileSync(txtPath, 'plain text');

    await request(app)
      .post(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', txtPath)
      .expect(400);

    fs.unlinkSync(txtPath);
  });

  it('non-admin cannot upload JD', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const pos = await createTestHiringPosition({ title: 'Analyst' });

    await request(app)
      .post(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', testDocxPath)
      .expect(403);
  });

  it('GET downloads the JD with original filename', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const pos = await createTestHiringPosition({ title: 'PM' });

    // Upload first
    await request(app)
      .post(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', testDocxPath)
      .expect(200);

    const res = await request(app)
      .get(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.headers['content-disposition']).toContain('test.docx');
  });

  it('GET /jd/preview returns file without attachment disposition', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const pos = await createTestHiringPosition({ title: 'QA' });

    await request(app)
      .post(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .attach('file', testDocxPath)
      .expect(200);

    const res = await request(app)
      .get(`/api/hiring-positions/${pos.id}/jd/preview`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    const disp = res.headers['content-disposition'] || '';
    expect(disp).not.toContain('attachment');
  });

  it('returns 404 when no JD attached', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const pos = await createTestHiringPosition({ title: 'NoJD' });

    await request(app)
      .get(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(404);
  });

  it('client user can download JD for their client positions', async () => {
    const client = await createTestClient({ name: 'ClientJD' });
    const admin = await createTestUser({ role: 'admin' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const pos = await createTestHiringPosition({ title: 'Dev', client_id: client.id });

    // Admin uploads
    const adminToken = await mintSession(admin.id);
    await request(app)
      .post(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${adminToken}`)
      .attach('file', testDocxPath)
      .expect(200);

    // Client user downloads
    const clientToken = await mintSession(clientUser.id);
    await request(app)
      .get(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${clientToken}`)
      .expect(200);
  });

  it('client user cannot download JD for another client', async () => {
    const clientA = await createTestClient({ name: 'JdClientA' });
    const clientB = await createTestClient({ name: 'JdClientB' });
    const admin = await createTestUser({ role: 'admin' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const pos = await createTestHiringPosition({ title: 'Ops', client_id: clientB.id });

    const adminToken = await mintSession(admin.id);
    await request(app)
      .post(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${adminToken}`)
      .attach('file', testDocxPath)
      .expect(200);

    const tokenA = await mintSession(userA.id);
    await request(app)
      .get(`/api/hiring-positions/${pos.id}/jd`)
      .set('Cookie', `nbi_session=${tokenA}`)
      .expect(403);
  });
});
```

- [ ] **Step 2: Create test fixture files**

Create the directory `dashboard-server/tests/fixtures/` if it doesn't exist.

Create a minimal valid DOCX for testing. A DOCX is a ZIP file with specific XML. The simplest approach: use Node to create one with `archiver` or just create a tiny one by copying a known valid file. For the test, we can create a minimal one:

```javascript
// dashboard-server/tests/fixtures/create-test-docx.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const output = fs.createWriteStream(path.join(__dirname, 'test.docx'));
const archive = archiver('zip');
archive.pipe(output);
archive.append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>', { name: '[Content_Types].xml' });
archive.append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>', { name: '_rels/.rels' });
archive.append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Test job description content.</w:t></w:r></w:p></w:body></w:document>', { name: 'word/document.xml' });
archive.finalize();
```

Run this once to create `tests/fixtures/test.docx`. Also create `tests/fixtures/test.pdf`:
```javascript
fs.writeFileSync(path.join(__dirname, 'tests/fixtures/test.pdf'), '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF');
```

- [ ] **Step 3: Run tests — expect failures (404)**

```
cd dashboard-server && npx vitest run tests/unit/jd-attachment.test.mjs
```

- [ ] **Step 4: Add JD upload endpoint to `hiring.js`**

Add BEFORE the DELETE position endpoint (before `router.delete('/api/hiring-positions/:id'`). These routes are for position sub-resources and must be declared before the `:id` catch-all DELETE:

```javascript
  /** POST /api/hiring-positions/:id/jd — Upload a job description file (admin only) */
  router.post('/api/hiring-positions/:id/jd', requireNBI, requireAdmin, upload.single('file'), async (req, res) => {
    if (!isValidUuid(req.params.id)) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
      return res.status(400).json({ error: 'Invalid position ID' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ];
    const allowedExts = ['.docx', '.pdf'];
    const ext = path.extname(req.file.originalname || '').toLowerCase();
    if (!allowedMimes.includes(req.file.mimetype) || !allowedExts.includes(ext)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Only DOCX and PDF files are accepted' });
    }

    try {
      const { rows: existing } = await pool.query('SELECT jd_filename FROM hiring_positions WHERE id = $1', [req.params.id]);
      if (existing.length === 0) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(404).json({ error: 'Position not found' });
      }

      if (existing[0].jd_filename) {
        const safe = path.basename(existing[0].jd_filename);
        const oldPath = path.join(uploadDir, safe);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) {}
      }

      const { rows } = await pool.query(
        'UPDATE hiring_positions SET jd_filename = $1, jd_original_name = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [req.file.filename, req.file.originalname, req.params.id]
      );
      await auditLog('hiring_position', req.params.id, 'jd_upload', req.user.displayName || 'unknown', { filename: req.file.originalname, size: req.file.size });
      res.json(rows[0]);
    } catch (e) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (err) {} }
      log('error', 'Hiring', 'Failed to upload JD', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/hiring-positions/:id/jd — Download the position's job description */
  router.get('/api/hiring-positions/:id/jd', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
    try {
      const { rows } = await pool.query('SELECT jd_filename, jd_original_name, client_id FROM hiring_positions WHERE id = $1', [req.params.id]);
      if (rows.length === 0 || !rows[0].jd_filename) return res.status(404).json({ error: 'No job description attached' });
      if (req.user.clientId && rows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const safe = path.basename(rows[0].jd_filename);
      const filePath = path.join(uploadDir, safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'JD file missing on disk' });
      const friendly = rows[0].jd_original_name || safe;
      res.download(filePath, friendly);
    } catch (e) {
      log('error', 'Hiring', 'Failed to download JD', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/hiring-positions/:id/jd/preview — Serve JD file inline for preview (no download header) */
  router.get('/api/hiring-positions/:id/jd/preview', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid position ID' });
    try {
      const { rows } = await pool.query('SELECT jd_filename, jd_original_name, client_id FROM hiring_positions WHERE id = $1', [req.params.id]);
      if (rows.length === 0 || !rows[0].jd_filename) return res.status(404).json({ error: 'No job description attached' });
      if (req.user.clientId && rows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const safe = path.basename(rows[0].jd_filename);
      const filePath = path.join(uploadDir, safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'JD file missing on disk' });
      const ext = path.extname(safe).toLowerCase();
      const mimeMap = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${rows[0].jd_original_name || safe}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      log('error', 'Hiring', 'Failed to preview JD', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 5: Add CV preview endpoint**

Add after the existing CV download endpoint (after `router.get('/api/candidates/:id/cv', ...)`):

```javascript
  /** GET /api/candidates/:id/cv/preview — Serve CV file inline for preview (no download header) */
  router.get('/api/candidates/:id/cv/preview', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    try {
      const { rows } = await pool.query('SELECT cv_filename, name, client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (rows.length === 0 || !rows[0].cv_filename) return res.status(404).json({ error: 'No CV uploaded' });
      if (req.user.clientId && rows[0].client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const safe = path.basename(rows[0].cv_filename);
      const filePath = path.join(uploadDir, safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'CV file missing on disk' });
      const ext = path.extname(safe).toLowerCase();
      const mimeMap = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${rows[0].name || 'candidate'}-CV${ext}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      log('error', 'Hiring', 'Failed to preview CV', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 6: Add `jd_filename` and `jd_original_name` to GET positions SELECT**

In the GET positions SELECT (around line 74), add after `p.interview_panel,`:
```
p.jd_filename, p.jd_original_name,
```

- [ ] **Step 7: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/jd-attachment.test.mjs
```

Expected: all 8 tests pass.

- [ ] **Step 8: Run full test suite**

```
cd dashboard-server && npm test
```

- [ ] **Step 9: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/jd-attachment.test.mjs dashboard-server/tests/fixtures/
git commit -m "feat(ats): JD upload/download/preview endpoints + CV preview"
```

---

## Task 4: mammoth.js Vendor Script

**Files:**
- Create: `dashboard-server/public/vendor/mammoth.browser.min.js`

- [ ] **Step 1: Download mammoth.js browser build**

```
cd dashboard-server/public/vendor && npx -y mammoth@1.8.0 --help
```

Actually, download the browser bundle directly:
```powershell
Invoke-WebRequest -Uri "https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js" -OutFile "d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\public\vendor\mammoth.browser.min.js"
```

- [ ] **Step 2: Verify the file exists and is reasonable size**

```powershell
(Get-Item "d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\public\vendor\mammoth.browser.min.js").Length
```

Expected: ~100-150KB.

- [ ] **Step 3: Commit**

```
git add dashboard-server/public/vendor/mammoth.browser.min.js
git commit -m "vendor: add mammoth.js 1.8.0 browser build for DOCX preview"
```

---

## Task 5: Frontend — Document Preview Modal + JD/CV UI

**Files:**
- Modify: `nbi_project_dashboard.html`

This task adds the reusable preview modal, wires it into the position detail panel (JD section replacing requirements), and adds a preview button to the candidate CV section.

- [ ] **Step 1: Add `openDocumentPreview()` function**

Add near the other hiring helper functions (after the comment/tag helpers, before `openCreateCandidateModal`):

```javascript
let _mammothLoaded = false;
function _ensureMammoth() {
  if (_mammothLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/public/vendor/mammoth.browser.min.js';
    s.onload = () => { _mammothLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load mammoth.js'));
    document.head.appendChild(s);
  });
}

async function openDocumentPreview(previewUrl, downloadUrl, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg-overlay, rgba(0,0,0,0.88));z-index:300;display:flex;align-items:center;justify-content:center';
  overlay.id = 'docPreviewOverlay';

  const modal = document.createElement('div');
  modal.style.cssText = 'width:min(800px,90vw);height:85vh;background:var(--bg-raised);border-radius:var(--radius-md,8px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5)';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border-default);flex-shrink:0;background:var(--bg-surface)';
  header.innerHTML = `<span style="font-weight:600;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;margin-right:12px">${esc(filename || 'Document')}</span>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <a href="${downloadUrl}" class="btn btn--sm btn--primary" download style="text-decoration:none">Download</a>
      <button class="btn btn--ghost btn--sm" id="docPreviewClose" style="font-size:1.1rem">&times;</button>
    </div>`;

  const body = document.createElement('div');
  body.style.cssText = 'flex:1;overflow:auto;padding:24px 32px;min-height:0';

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => { try { document.body.removeChild(overlay); } catch(e){} document.removeEventListener('keydown', escH); };
  const escH = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', escH);
  overlay.querySelector('#docPreviewClose').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  if (ext === 'pdf') {
    body.style.padding = '0';
    body.innerHTML = `<iframe src="${previewUrl}" style="width:100%;height:100%;border:none"></iframe>`;
  } else if (ext === 'docx') {
    body.innerHTML = '<div style="color:var(--text-muted);padding:20px">Loading document…</div>';
    try {
      await _ensureMammoth();
      const resp = await fetch(previewUrl, { credentials: 'include' });
      if (!resp.ok) throw new Error('Fetch failed');
      const arrayBuffer = await resp.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      body.innerHTML = `<div class="doc-preview-content" style="font-size:0.9rem;line-height:1.6;color:var(--text-primary)">${result.value}</div>`;
    } catch (e) {
      body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
        <div style="font-size:1.1rem;margin-bottom:12px">Preview unavailable for this document</div>
        <a href="${downloadUrl}" class="btn btn--primary" download style="text-decoration:none">Download instead</a>
      </div>`;
    }
  } else {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
      <div style="font-size:1.1rem;margin-bottom:12px">Preview not supported for .${esc(ext)} files</div>
      <a href="${downloadUrl}" class="btn btn--primary" download style="text-decoration:none">Download instead</a>
    </div>`;
  }
}
```

- [ ] **Step 2: Remove requirements section from position detail panel**

In `openPositionDetail`, find and remove the entire requirements section — both the admin version (with add/remove UI) and the non-admin version (read-only list). This is the block that starts with:
```javascript
      ${isAdmin ? `<div style="margin-bottom:var(--space-lg)">
        <div class="position-detail__info-label" style="margin-bottom:4px">Requirements</div>
```
and the corresponding non-admin fallback. Remove both branches.

Also remove the helper functions `positionAddRequirement` and `positionRemoveRequirement`.

- [ ] **Step 3: Add JD section to position detail panel**

Replace the removed requirements section with the JD section. In the admin branch:

```javascript
      ${isAdmin ? `<div style="margin-bottom:var(--space-lg)">
        <div class="position-detail__info-label" style="margin-bottom:4px">Job Description</div>
        ${p.jd_filename
          ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:0.82rem;font-weight:500">${esc(p.jd_original_name || p.jd_filename)}</span>
              <button class="btn btn--sm" onclick="openDocumentPreview('/api/hiring-positions/${p.id}/jd/preview','/api/hiring-positions/${p.id}/jd','${esc(p.jd_original_name || '')}')">Preview</button>
              <a href="/api/hiring-positions/${p.id}/jd" class="btn btn--sm" download style="text-decoration:none">Download</a>
              <label class="btn btn--sm" style="cursor:pointer">Replace<input type="file" accept=".docx,.pdf" style="display:none" onchange="uploadPositionJD('${p.id}',this)"></label>
            </div>`
          : `<div style="display:flex;align-items:center;gap:8px">
              <span style="color:var(--text-muted);font-size:0.82rem">No job description attached</span>
              <label class="btn btn--sm btn--primary" style="cursor:pointer">Upload<input type="file" accept=".docx,.pdf" style="display:none" onchange="uploadPositionJD('${p.id}',this)"></label>
            </div>`
        }
      </div>` : (p.jd_filename ? `<div style="margin-bottom:var(--space-lg)">
        <div class="position-detail__info-label" style="margin-bottom:4px">Job Description</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:0.82rem;font-weight:500">${esc(p.jd_original_name || p.jd_filename)}</span>
          <button class="btn btn--sm" onclick="openDocumentPreview('/api/hiring-positions/${p.id}/jd/preview','/api/hiring-positions/${p.id}/jd','${esc(p.jd_original_name || '')}')">Preview</button>
          <a href="/api/hiring-positions/${p.id}/jd" class="btn btn--sm" download style="text-decoration:none">Download</a>
        </div>
      </div>` : '')}
```

- [ ] **Step 4: Add `uploadPositionJD` helper function**

```javascript
async function uploadPositionJD(positionId, input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);
  const resp = await authFetch(`/api/hiring-positions/${positionId}/jd`, {
    method: 'POST',
    body: formData,
  });
  if (resp.ok) {
    toast('Job description uploaded');
    await loadHiringPositions();
    if (currentView === 'hiring') renderContent();
    const panel = document.getElementById('positionDetailPanel');
    if (panel && panel.classList.contains('open')) openPositionDetail(positionId);
  } else {
    const err = await resp.json().catch(() => ({}));
    toast(err.error || 'Failed to upload', 'error');
  }
}
```

- [ ] **Step 5: Add Preview button to candidate CV section**

In `buildCandidateProfileHtml`, find the CV section. Currently it has Download and Upload/Replace buttons. Add a Preview button between the filename and Download:

Change the CV display from:
```javascript
${c.cv_filename ? `<span class="candidate-cv__name">${esc(c.cv_filename)}</span><button class="btn btn--sm" data-action="downloadCandidateCV" data-arg0="${c.id}">Download</button>` : ...}
```
to:
```javascript
${c.cv_filename ? `<span class="candidate-cv__name">${esc(c.cv_filename)}</span><button class="btn btn--sm" onclick="openDocumentPreview('/api/candidates/${c.id}/cv/preview','/api/candidates/${c.id}/cv','${esc(c.cv_filename)}')">Preview</button><button class="btn btn--sm" data-action="downloadCandidateCV" data-arg0="${c.id}">Download</button>` : ...}
```

- [ ] **Step 6: Add a document icon indicator on position cards with JDs**

In `renderPositionCard`, after the existing card content, add a subtle icon for positions with a JD attached:

```javascript
const jdIndicator = p.jd_filename ? '<span style="position:absolute;top:6px;right:8px;font-size:0.7rem;color:var(--text-muted)" title="Job description attached">&#128196;</span>' : '';
```

Include `${jdIndicator}` in the card HTML (inside the `position-card` div, which already has `position: relative`).

- [ ] **Step 7: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(ats): document preview modal + JD section in position detail"
```

---

## Task 6: Bulk-Attach Existing JDs

**Files:**
- Create: `dashboard-server/scripts/bulk-attach-jds.js`

- [ ] **Step 1: Create the bulk-attach script**

```javascript
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const uploadDir = path.join(__dirname, '..', 'uploads');
const jdDir = path.resolve(__dirname, '..', '..', 'Clients', 'Couch Heroes', 'Job Descriptions');

// Explicit mapping: JD filename (without _JD.docx suffix) → position title in DB
// Built from comparing the 28 JD files against the 30 Couch Heroes positions
const TITLE_MAP = {
  'Art_Producer': 'Art Producer',
  'Associate_Producer': 'Assoc Producer',
  'Audio_Lead': 'Audio Lead',
  'CTO': null, // No CTO position? Check — yes there is
  'DevOps_Engineer': null, // No DevOps position in DB
  'Game_Design_Lead': 'Game Design Lead',
  'Game_Designer': null, // No exact match — "Mid General Designer"? No, different role
  'Head_of_Finance': 'Head of Finance',
  'HR_Operations': 'HR Operations',
  'IT_Lead': 'IT Lead',
  'JIRA_Admin_Contractor': 'Jira Admin Contractor',
  'Lead_Animator': 'Lead Animator',
  'Lead_Concept_Artist': 'Lead Concept Artist',
  'Lead_Full_Stack_Developer': 'Lead Full Stack Developer',
  'Lead_Gameplay_Developer': 'Lead Gameplay Developer',
  'Lead VFX Artist': null, // Separate file, no "Lead VFX Artist" position
  'QA_Specialist': 'Mid QA Tester',
  'Senior_Character_Modeller': 'Sr Character Modeler',
  'Senior_Environment_Artist': 'Snr Environment Artist',
  'Senior_Level_Designer': 'Senior Level Designer',
  'Senior_Lighting_Artist': 'Snr Lighting Artist',
  'Senior_Network_Engineer': 'Snr Network Engineer',
  'Senior_Technical_Artist': 'Snr Technical Artist',
  'Senior_UI_UX_Designer': 'UI/UX Lead (New Role)',
  'Senior_VFX_Artist': 'Sr VFX Artist',
  'Tech_Producer': 'Tech Producer',
  'Technical_Animator': 'Technical Animator',
};

async function main() {
  if (!fs.existsSync(jdDir)) {
    console.error('JD directory not found:', jdDir);
    process.exit(1);
  }

  // Get Couch Heroes client ID
  const { rows: clients } = await pool.query("SELECT id FROM clients WHERE name ILIKE '%couch%' LIMIT 1");
  if (clients.length === 0) { console.error('Couch Heroes client not found'); process.exit(1); }
  const clientId = clients[0].id;

  // Get all Couch Heroes positions
  const { rows: positions } = await pool.query('SELECT id, title FROM hiring_positions WHERE client_id = $1', [clientId]);
  const positionByTitle = {};
  positions.forEach(p => { positionByTitle[p.title] = p.id; });

  const files = fs.readdirSync(jdDir).filter(f => f.endsWith('.docx') && !f.startsWith('Copy of') && !f.startsWith('HANDOFF'));

  let attached = 0;
  let skipped = 0;
  const unmatched = [];

  for (const file of files) {
    // Derive the map key from filename
    let key = file.replace(/_JD.*\.docx$/i, '').replace(/_JD\.docx$/i, '').replace(/\.docx$/i, '');

    const positionTitle = TITLE_MAP[key];
    if (positionTitle === undefined) {
      // Not in map — try exact title match
      const directMatch = positionByTitle[key.replace(/_/g, ' ')];
      if (!directMatch) {
        unmatched.push(`${file} → no mapping for key "${key}"`);
        skipped++;
        continue;
      }
      // Direct match found
      const posId = directMatch;
      await attachFile(posId, file);
      attached++;
      console.log(`  ✓ ${file} → ${key.replace(/_/g, ' ')}`);
      continue;
    }
    if (positionTitle === null) {
      console.log(`  — ${file} → explicitly skipped (no matching position)`);
      skipped++;
      continue;
    }
    const posId = positionByTitle[positionTitle];
    if (!posId) {
      unmatched.push(`${file} → mapped to "${positionTitle}" but position not found`);
      skipped++;
      continue;
    }
    await attachFile(posId, file);
    attached++;
    console.log(`  ✓ ${file} → ${positionTitle}`);
  }

  console.log(`\nDone: ${attached} attached, ${skipped} skipped`);
  if (unmatched.length > 0) {
    console.log('Unmatched:');
    unmatched.forEach(u => console.log(`  ! ${u}`));
  }
  await pool.end();
}

async function attachFile(positionId, originalFilename) {
  const src = path.join(jdDir, originalFilename);
  const ext = path.extname(originalFilename);
  const storedName = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
  const dest = path.join(uploadDir, storedName);
  fs.copyFileSync(src, dest);
  await pool.query(
    'UPDATE hiring_positions SET jd_filename = $1, jd_original_name = $2, updated_at = NOW() WHERE id = $3',
    [storedName, originalFilename, positionId]
  );
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the script**

```
cd dashboard-server && node scripts/bulk-attach-jds.js
```

Review the output. Fix any mapping errors. Re-run if needed.

- [ ] **Step 3: Verify in the UI**

Open the Positions view, click a position that should have a JD (e.g. Technical Animator). Verify:
- JD filename appears in the Job Description section
- Preview button opens the mammoth.js modal with readable content
- Download button downloads the original .docx file

- [ ] **Step 4: Commit**

```
git add dashboard-server/scripts/bulk-attach-jds.js
git commit -m "feat(ats): bulk-attach 28 Couch Heroes JD files to positions"
```

---

## Task 7: Verification

- [ ] **Step 1: Run full test suite**

```
cd dashboard-server && npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run E2E tests**

```
cd dashboard-server && npm run test:e2e
```

Expected: all Playwright specs pass.

- [ ] **Step 3: Restart PM2 and verify visually**

```
pm2 restart nbi-dashboard
```

Verify at http://localhost:8888/nbi_project_dashboard.html:
- Position detail: no requirements section, JD section shows attached file with Preview/Download/Replace
- Preview modal: DOCX renders as readable HTML, wide centered modal, download button works, Escape closes
- Candidate detail: CV section has Preview button, clicking it opens the preview modal
- Position cards: document icon on cards with JDs attached
- Positions with no JD show "No job description attached" + Upload button

- [ ] **Step 4: Commit any fixes**
