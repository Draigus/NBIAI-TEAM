# Documentation Tab G1 Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply seven code-review follow-up fixes (one Critical, three Important, four Minor) to the `feature/documentation-tab` worktree, then ship a single commit that leaves the test suite at 318+ / 318+ green.

**Architecture:** All changes are in-place edits to the existing monolithic `server.js`, two `lib/` helpers, and two test files. No new files are created. Order is: lib fixes first (pure functions, easy to verify in isolation), then server.js production changes, then tests.

**Tech Stack:** Node.js + Express 4, PostgreSQL (`pg`), Vitest (unit), Supertest (integration). Worktree: `D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab\dashboard-server`.

---

## File Map

| File | What changes |
|---|---|
| `lib/redact-nbi-internal.js` | Important 3: strip `?` and `#` from image filenames in `_collectImageNames` |
| `lib/attachment-sweep.js` | Minor 1: JSDoc boundary note on `pickFilesToDelete` |
| `server.js` | Critical: move reconciliation block; Important 1: tighten sweep DELETE; Important 2: async unlinks in DELETE handler and sweep |
| `tests/unit/redact-nbi-internal.test.mjs` | 3 new query-string/fragment tests in `extractImageFilenames` describe block |
| `tests/unit/documents.test.mjs` | G1-Critical test, G1-Sweep-Race test, G1-Sweep-Old try/finally wrap, G1-DeleteCascade-Deep test, Minor 2 comment inside reconciliation block (in server.js) |

---

### Task 1: Important 3 — Strip query strings and fragments in `_collectImageNames`

**Files:**
- Modify: `lib/redact-nbi-internal.js` (function `_collectImageNames`, lines ~153-162)

- [ ] **Step 1: Write the three failing tests** in `tests/unit/redact-nbi-internal.test.mjs`, appended after the last test in the `extractImageFilenames` describe block (after line 234, before the closing `}`):

```js
  it('extractImageFilenames strips query strings', () => {
    const body = { type: 'doc', content: [
      { type: 'image', attrs: { src: '/api/documents/abc/attachments/foo.png?v=2' } }
    ]};
    expect(extractImageFilenames(body).has('foo.png')).toBe(true);
  });

  it('extractImageFilenames strips URL fragments', () => {
    const body = { type: 'doc', content: [
      { type: 'image', attrs: { src: '/api/documents/abc/attachments/foo.png#anchor' } }
    ]};
    expect(extractImageFilenames(body).has('foo.png')).toBe(true);
  });

  it('extractImageFilenames strips both query and fragment', () => {
    const body = { type: 'doc', content: [
      { type: 'image', attrs: { src: '/api/documents/abc/attachments/foo.png?v=2#a' } }
    ]};
    expect(extractImageFilenames(body).has('foo.png')).toBe(true);
  });
```

- [ ] **Step 2: Run the three new tests to confirm they FAIL**

```bash
cd "D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab\dashboard-server"
npx vitest run tests/unit/redact-nbi-internal.test.mjs
```

Expected: the three new tests fail (the existing ones pass).

- [ ] **Step 3: Implement the fix** in `lib/redact-nbi-internal.js` — replace the `_collectImageNames` function body:

```js
function _collectImageNames(node, out) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'image' && node.attrs && typeof node.attrs.src === 'string') {
    const name = node.attrs.src.split('/').pop();
    if (name) {
      // Strip query string and fragment so '/foo.png?v=2' and '/foo.png#anchor'
      // both yield 'foo.png' to match the stored filename in the DB.
      const clean = name.split('?')[0].split('#')[0];
      if (clean) out.add(clean);
    }
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) _collectImageNames(child, out);
  }
}
```

- [ ] **Step 4: Run the test file to confirm all pass**

```bash
npx vitest run tests/unit/redact-nbi-internal.test.mjs
```

Expected: all tests in the file pass.

---

### Task 2: Minor 1 — JSDoc boundary note on `pickFilesToDelete`

**Files:**
- Modify: `lib/attachment-sweep.js` (JSDoc comment block, lines ~13-17)

- [ ] **Step 1: Add the boundary note** to the existing JSDoc, inserting after `@returns`:

```js
/**
 * @param {Date} now
 * @param {Array<{ id: string, stored_name: string, orphaned_at: Date | null }>} attachments
 * @returns {Array<{ id: string, stored_name: string }>}
 * Returns rows where `orphaned_at` is strictly more than ORPHAN_GRACE_MS in
 * the past (boundary at exactly 24h is excluded — `<`, not `<=`).
 */
```

No new test needed — the logic is unchanged and already tested.

---

### Task 3: Critical — Move reconciliation block after the successful UPDATE

**Files:**
- Modify: `server.js` (PATCH /api/documents/:id handler, lines ~4344-4430)

This is the highest-risk change. The block at lines 4350-4378 runs DB queries against `document_attachments` before the main `UPDATE documents` at line 4400. If the UPDATE matches zero rows (stale ETag → 409), the reconciliation has already committed, leaving stale orphan state. Fix: delete the original block, re-insert it after `const doc = updated[0]` (line 4427) and before `res.set('ETag', ...)` (line 4429).

- [ ] **Step 1: Write the failing regression test** — append to the `Documents: G1 orphan tracking` describe block (after the G1-ReAdd test, before the G1-DeleteCascade test) in `tests/unit/documents.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the new test to confirm it FAILS** (it will pass until the fix is applied, because the current code runs reconciliation before the UPDATE — the orphan state will be incorrectly set on the 409 path):

```bash
npx vitest run tests/unit/documents.test.mjs -t "G1-Critical"
```

Expected: FAIL — `orphaned_at` is not null when it should be (the bug is live).

- [ ] **Step 3: Remove the original reconciliation block** from `server.js` (lines 4350-4378). Delete exactly this block (leaving the `body_text` computation at 4344-4348 intact):

```js
    // G1: attachment orphan reconciliation. Diff old vs new image set:
    //   - filenames now in body that were previously orphaned -> clear orphaned_at
    //   - filenames in DB but not in new body -> set orphaned_at = now() if NULL
    // Only runs when body_json is being updated. Wrapped in try/catch so an
    // attachment-side error does not fail the user's PATCH.
    try {
      const newFilenames = extractImageFilenames(req.body.body_json);
      const { rows: existingAtts } = await pool.query(
        `SELECT id, stored_name, orphaned_at FROM document_attachments WHERE document_id = $1`,
        [req.params.id]
      );
      const referencedIds   = existingAtts.filter(a => newFilenames.has(a.stored_name)).map(a => a.id);
      const unreferencedIds = existingAtts.filter(a => !newFilenames.has(a.stored_name) && a.orphaned_at === null).map(a => a.id);
      if (referencedIds.length) {
        await pool.query(
          `UPDATE document_attachments SET orphaned_at = NULL WHERE id = ANY($1::uuid[])`,
          [referencedIds]
        );
      }
      if (unreferencedIds.length) {
        await pool.query(
          `UPDATE document_attachments SET orphaned_at = now() WHERE id = ANY($1::uuid[])`,
          [unreferencedIds]
        );
      }
    } catch (err) {
      log('warn', 'Documents', 'Attachment reconciliation failed for ' + req.params.id, { err: err.message });
    }
```

- [ ] **Step 4: Insert the reconciliation block after `const doc = updated[0]`** (after line 4427, before `res.set('ETag', ...)`). Include Minor 2 comment above the `unreferencedIds` filter:

```js
  const doc = updated[0];

  // G1: attachment orphan reconciliation. Runs ONLY on a successful UPDATE
  // (after the I1 atomic-concurrency check has confirmed no concurrent write).
  // Wrapped in try/catch so reconciliation failure does not break the
  // already-committed doc edit; the worst case is stale orphan state which
  // the next legitimate PATCH will repair.
  if (req.body.body_json !== undefined) {
    try {
      const newFilenames = extractImageFilenames(req.body.body_json);
      const { rows: existingAtts } = await pool.query(
        `SELECT id, stored_name, orphaned_at FROM document_attachments WHERE document_id = $1`,
        [req.params.id]
      );
      const referencedIds   = existingAtts.filter(a => newFilenames.has(a.stored_name)).map(a => a.id);
      // Clock-reset semantics: the orphan_at clock starts fresh each time an
      // image becomes unreferenced. Re-adding a previously-orphaned image clears
      // it; subsequent removal restarts the 24h grace window. This is intentional.
      const unreferencedIds = existingAtts.filter(a => !newFilenames.has(a.stored_name) && a.orphaned_at === null).map(a => a.id);
      if (referencedIds.length) {
        await pool.query(
          `UPDATE document_attachments SET orphaned_at = NULL WHERE id = ANY($1::uuid[])`,
          [referencedIds]
        );
      }
      if (unreferencedIds.length) {
        await pool.query(
          `UPDATE document_attachments SET orphaned_at = now() WHERE id = ANY($1::uuid[])`,
          [unreferencedIds]
        );
      }
    } catch (err) {
      log('warn', 'Documents', 'Attachment reconciliation failed for ' + req.params.id, { err: err.message });
    }
  }

  // D1: emit fresh ETag from the new updated_at so client can track the new version
  res.set('ETag', `W/"${doc.updated_at.toISOString()}"`);
  res.json(doc);
```

- [ ] **Step 5: Run the G1-Critical test to confirm it now PASSES**

```bash
npx vitest run tests/unit/documents.test.mjs -t "G1-Critical"
```

Expected: PASS.

- [ ] **Step 6: Run the full documents test file to confirm no regressions**

```bash
npx vitest run tests/unit/documents.test.mjs
```

Expected: all tests pass.

---

### Task 4: Important 1 — Tighten sweep DELETE WHERE clause

**Files:**
- Modify: `server.js` (`runAttachmentSweep` function, lines ~9757-9759)

- [ ] **Step 1: Write the failing race test** — append to the `Documents: G1 orphan tracking` describe block (after G1-Sweep-Mixed, before the closing `}`):

```js
  it('G1-Sweep-Race: row preserved if orphaned_at cleared between SELECT and DELETE', async () => {
    // Insert an attachment that LOOKS sweepable (orphaned_at = now() - 25h)
    const { rows: ai } = await pool.query(
      `INSERT INTO document_attachments
         (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by, orphaned_at)
       VALUES ($1, 'race.png', $2, 'image/png', 100, 'test', now() - interval '25 hours')
       RETURNING id, stored_name`,
      [doc.id, `doc_race_${Date.now()}.png`]
    );
    // Simulate the race: clear orphaned_at BEFORE the sweep runs.
    // The WHERE clause on the DELETE is what guards the row.
    await pool.query(`UPDATE document_attachments SET orphaned_at = NULL WHERE id = $1`, [ai.rows[0].id]);

    await runAttachmentSweep();

    // Row must still exist because orphaned_at was NULL when DELETE ran
    const { rows: still } = await pool.query('SELECT id FROM document_attachments WHERE id = $1', [ai.rows[0].id]);
    expect(still.length).toBe(1);

    // Cleanup
    await pool.query('DELETE FROM document_attachments WHERE id = $1', [ai.rows[0].id]);
  });
```

- [ ] **Step 2: Run the race test to confirm it FAILS**

```bash
npx vitest run tests/unit/documents.test.mjs -t "G1-Sweep-Race"
```

Expected: FAIL — the current DELETE has no orphaned_at guard so it deletes the row even though orphaned_at was cleared.

- [ ] **Step 3: Replace the sweep DELETE in `server.js`** — find this block in `runAttachmentSweep` (around line 9757):

```js
    const ids = toDelete.map(f => f.id);
    await pool.query(`DELETE FROM document_attachments WHERE id = ANY($1::uuid[])`, [ids]);
    log('info', 'Cron', `Attachment sweep deleted ${toDelete.length} orphans`);
    return { deleted: toDelete.length };
```

Replace with:

```js
    const ids = toDelete.map(f => f.id);
    const result = await pool.query(
      `DELETE FROM document_attachments
         WHERE id = ANY($1::uuid[])
           AND orphaned_at IS NOT NULL
           AND orphaned_at < now() - interval '24 hours'`,
      [ids]
    );
    if (result.rowCount !== toDelete.length) {
      log('warn', 'Cron',
        `Sweep race detected: ${toDelete.length} candidates, ${result.rowCount} deleted (rest cleared by concurrent PATCH)`);
    }
    log('info', 'Cron', `Attachment sweep deleted ${result.rowCount} orphans`);
    return { deleted: result.rowCount };
```

- [ ] **Step 4: Run the race test to confirm it now PASSES**

```bash
npx vitest run tests/unit/documents.test.mjs -t "G1-Sweep-Race"
```

Expected: PASS.

- [ ] **Step 5: Run full documents test file to confirm no regressions**

```bash
npx vitest run tests/unit/documents.test.mjs
```

Expected: all tests pass.

---

### Task 5: Important 2 — Switch to async unlinks

**Files:**
- Modify: `server.js` (DELETE /api/documents/:id handler lines ~4478-4486, and `runAttachmentSweep` lines ~9749-9755)

No new test needed — the functional behaviour is identical; the change is async I/O.

- [ ] **Step 1: Replace the sync unlink loop in the DELETE handler** — find this block (around line 4478):

```js
  for (const a of atts) {
    try {
      fs.unlinkSync(path.join(uploadDir, a.stored_name));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log('warn', 'Documents', `Failed to unlink ${a.stored_name} during doc delete: ${err.message}`);
      }
    }
  }
```

Replace with:

```js
  await Promise.all(atts.map(async a => {
    try {
      await fs.promises.unlink(path.join(uploadDir, a.stored_name));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log('warn', 'Documents', `Failed to unlink ${a.stored_name} during doc delete: ${err.message}`);
      }
    }
  }));
```

- [ ] **Step 2: Replace the sync unlink loop in `runAttachmentSweep`** — find this block (around line 9749):

```js
    for (const f of toDelete) {
      try { fs.unlinkSync(path.join(uploadDir, f.stored_name)); }
      catch (err) {
        if (err.code !== 'ENOENT') {
          log('warn', 'Cron', `Sweep unlink failed for ${f.stored_name}: ${err.message}`);
        }
      }
    }
```

Replace with:

```js
    await Promise.all(toDelete.map(async f => {
      try {
        await fs.promises.unlink(path.join(uploadDir, f.stored_name));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          log('warn', 'Cron', `Sweep unlink failed for ${f.stored_name}: ${err.message}`);
        }
      }
    }));
```

- [ ] **Step 3: Run the full documents test file to confirm no regressions**

```bash
npx vitest run tests/unit/documents.test.mjs
```

Expected: all tests pass.

---

### Task 6: Minor 3 — Wrap G1-Sweep-Old in try/finally

**Files:**
- Modify: `tests/unit/documents.test.mjs` (G1-Sweep-Old test body, around lines 1285-1308)

- [ ] **Step 1: Wrap the G1-Sweep-Old test body** — find the test:

```js
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

    const result = await runAttachmentSweep();
    expect(result.deleted).toBeGreaterThanOrEqual(1);

    // Row gone
    const { rows } = await pool.query(
      'SELECT id FROM document_attachments WHERE id = $1', [attId]
    );
    expect(rows.length).toBe(0);
    // File gone
    expect(fs.existsSync(filePath)).toBe(false);
  });
```

Replace with:

```js
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
```

- [ ] **Step 2: Run to confirm test still passes**

```bash
npx vitest run tests/unit/documents.test.mjs -t "G1-Sweep-Old"
```

Expected: PASS.

---

### Task 7: Minor 4 — G1-DeleteCascade-Deep test

**Files:**
- Modify: `tests/unit/documents.test.mjs` (append after G1-DeleteCascade test, before G1-Sweep-Recent)

- [ ] **Step 1: Add the deep-cascade test** after the existing `G1-DeleteCascade` test:

```js
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
```

- [ ] **Step 2: Run the new test to confirm it passes**

```bash
npx vitest run tests/unit/documents.test.mjs -t "G1-DeleteCascade-Deep"
```

Expected: PASS (the recursive CTE already handles this).

---

### Task 8: Full suite run and commit

- [ ] **Step 1: Run the complete test suite**

```bash
cd "D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab\dashboard-server"
npm test
```

Expected: 318+ tests passing, 0 failing.

- [ ] **Step 2: Confirm all new tests are present** — verify the following test names appear in the output:
  - `G1-Critical: 409 on PATCH leaves attachment orphan state untouched`
  - `G1-Sweep-Race: row preserved if orphaned_at cleared between SELECT and DELETE`
  - `extractImageFilenames strips query strings`
  - `extractImageFilenames strips URL fragments`
  - `extractImageFilenames strips both query and fragment`
  - `G1-DeleteCascade-Deep: grandchild attachments are also cleaned up on parent delete`

- [ ] **Step 3: Commit** (do NOT amend `76428a6` — create a new commit)

```bash
cd "D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab"
git add dashboard-server/server.js \
        dashboard-server/lib/redact-nbi-internal.js \
        dashboard-server/lib/attachment-sweep.js \
        dashboard-server/tests/unit/documents.test.mjs \
        dashboard-server/tests/unit/redact-nbi-internal.test.mjs
git commit -m "$(cat <<'EOF'
fix(docs): G1 hardening — reconciliation order, sweep race, async unlink, query-string parse

- Critical: move G1 reconciliation block to after the I1 UPDATE success path so a 409 (stale ETag) can no longer commit orphan state changes against a doc that was not actually written
- Important 1: tighten sweep DELETE WHERE clause to re-check orphaned_at IS NOT NULL AND < now() - 24h so a concurrent PATCH that clears orphaned_at between SELECT and DELETE preserves the DB row
- Important 2: replace fs.unlinkSync loops with Promise.all + fs.promises.unlink in both the DELETE handler and runAttachmentSweep to avoid blocking the event loop
- Important 3: strip query strings and URL fragments in _collectImageNames so '/foo.png?v=2' correctly matches stored filename 'foo.png', preventing false orphaning of live images

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Verify commit SHA**

```bash
git log --oneline -3
```

Expected: new commit on top of `76428a6`.

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Critical: reconciliation runs before UPDATE → move it after | Task 3 |
| G1-Critical regression test | Task 3, Step 1 |
| Important 1: sweep DELETE tightened | Task 4 |
| G1-Sweep-Race test | Task 4, Step 1 |
| Important 2: async unlinks in DELETE handler | Task 5, Step 1 |
| Important 2: async unlinks in sweep | Task 5, Step 2 |
| Important 3: strip `?` and `#` in `_collectImageNames` | Task 1 |
| 3 query-string tests | Task 1, Step 1 |
| Minor 1: JSDoc boundary note | Task 2 |
| Minor 2: clock-reset comment | Task 3, Step 4 |
| Minor 3: G1-Sweep-Old try/finally | Task 6 |
| Minor 4: G1-DeleteCascade-Deep test | Task 7 |
| Single commit (not amend) | Task 8 |
| Suite must reach 318+ | Task 8, Step 1 |

**Placeholder scan:** No TBDs. All code blocks are complete and self-contained.

**Type consistency:** `runAttachmentSweep` returns `{ deleted: result.rowCount }` — matches the existing `expect(result.deleted).toBeGreaterThanOrEqual(1)` assertions in G1-Sweep-Old and G1-Sweep-Mixed. `result.rowCount` is a number from `pg` query result, always defined on DELETE.
