# Docs PATCH/DELETE Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply seven code-review fixes (C1, I1, I2, I3, M1, M3, M4) to the PATCH and DELETE document handlers in server.js, then add eight new tests to documents.test.mjs to verify the security and correctness properties.

**Architecture:** All server-side changes are in a single handler section (~140 lines) of the monolithic `server.js`. Tests are appended inside the existing `'Documents: update/delete/move'` describe block in `documents.test.mjs`. No new files, no new dependencies. Single commit covers everything.

**Tech Stack:** Node.js + Express 4, PostgreSQL (`pg`), Vitest + Supertest for unit tests.

---

## Scope

This plan covers exactly the six items listed in the code review:

| Issue | Description | File | Lines |
|-------|-------------|------|-------|
| C1 | Scope guards before ETag; redact 409 body for client users | server.js | PATCH handler |
| I1 | Atomic UPDATE WHERE updated_at | server.js | PATCH handler |
| I2 | Descendant-cycle CTE check | server.js | PATCH handler |
| I3 | Subsumed by C1 (redaction) | server.js | PATCH handler |
| M1 | Explicit RETURNING projection | server.js | PATCH handler |
| M3 | 8 new tests | documents.test.mjs | After line 453 |
| M4 | Cross-client DELETE returns 204 | server.js | DELETE handler |

---

## File Map

| File | What changes |
|------|-------------|
| `dashboard-server/server.js` | PATCH handler (~lines 4227-4396): reorder guards, atomic UPDATE, cycle CTE, explicit RETURNING, redact 409. DELETE handler (~lines 4398-4424): change cross-client 404 to 204. |
| `dashboard-server/tests/unit/documents.test.mjs` | Append 8 new tests inside existing `'Documents: update/delete/move'` describe block. |

---

## Current state (read before editing)

The previous agent session already applied **C1, I1, I2, M1** changes to the PATCH handler. Verify by reading `server.js` lines 4227-4396 before making any edit. If those fixes are already present, skip Task 1 and go straight to Task 2 (M4) and Task 3 (tests).

Checklist for "already applied":
- Scope guards appear BEFORE the `if (ifMatch !== currentEtag)` block
- UPDATE SQL contains `AND updated_at = $${idx + 1}`
- RETURNING clause lists explicit columns (not `*`)
- A `WITH RECURSIVE descendants` CTE block exists inside the parent_id check
- The 409 response uses `redactNbiInternal` for client users

---

## Task 1: Fix PATCH handler (C1 + I1 + I2 + I3 + M1)

> Skip if the checklist above shows all fixes already present.

**Files:**
- Modify: `dashboard-server/server.js` — PATCH handler section only

- [ ] **Step 1.1: Read the current handler**

Read `server.js` lines 4227-4396. Confirm the current order and which fixes are missing.

- [ ] **Step 1.2: Apply the full corrected PATCH handler**

Replace everything from the `/** PATCH /api/documents/:id` comment through the closing `});` with the following. Do NOT touch anything outside these bounds.

```js
/** PATCH /api/documents/:id
 *  Update one page. Requires If-Match header (D1 optimistic concurrency).
 *  Returns 428 if If-Match is missing; 409 (with current doc in body) if stale.
 *  On body_json change also writes body_text for full-text indexing (B1).
 *  Client portal users need docsEdit permission; they cannot set visibility='nbi_only'.
 *
 *  Security note: scope guards run BEFORE the ETag comparison so a client-A user
 *  sending a stale If-Match for client-B's doc gets 404, not a 409 that leaks the
 *  doc body. */
app.patch('/api/documents/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  // D1: If-Match is mandatory; 428 Precondition Required if absent
  const ifMatch = req.headers['if-match'];
  if (!ifMatch) return res.status(428).json({ error: 'If-Match header required for optimistic concurrency' });

  // Parse and validate the If-Match value upfront (I1: used in WHERE clause later)
  const etagMatch = ifMatch.match(/^W\/"(.+)"$/);
  if (!etagMatch) return res.status(400).json({ error: 'Malformed If-Match header' });
  const ifMatchTs = new Date(etagMatch[1]);
  if (isNaN(ifMatchTs.getTime())) return res.status(400).json({ error: 'Malformed If-Match header' });

  // Fetch current doc (still needed for scope guards and cycle detection)
  const { rows } = await pool.query(
    `SELECT id, client_id, parent_id, task_id, title, body_json, visibility,
            sort_order, updated_at, updated_by
       FROM documents WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const current = rows[0];

  // C1: Scope guards run BEFORE ETag comparison to prevent existence/content disclosure.
  // A client user on the wrong client, or requesting an nbi_only doc, gets 404 regardless
  // of whether their If-Match is fresh or stale.
  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== current.client_id) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (isClientUser && current.visibility === 'nbi_only') {
    return res.status(404).json({ error: 'Not found' });
  }
  if (isClientUser && req.user.docsEdit === false) {
    return res.status(403).json({ error: 'No doc-edit permission' });
  }

  // D1: compare If-Match against the current ETag (after scope guards)
  // RFC 7232 specifies 412 for a failed precondition, but we return 409 here
  // because the frontend conflict modal needs a uniform shape with the current
  // doc state regardless of whether the mismatch was stale-client or concurrent write.
  // C1/I3: redact the body in the 409 response for client portal users.
  const currentEtag = `W/"${current.updated_at.toISOString()}"`;
  if (ifMatch !== currentEtag) {
    const safeCurrentForClient = isClientUser
      ? { ...current, body_json: redactNbiInternal(current.body_json) }
      : current;
    return res.status(409).json({ error: 'Conflict', current: safeCurrentForClient });
  }

  // Build standard field updates via the shared helper (prevents SQL injection)
  const allowedFields = isClientUser
    ? ['title', 'body_json', 'parent_id', 'task_id', 'sort_order']
    : ['title', 'body_json', 'parent_id', 'task_id', 'sort_order', 'visibility'];

  const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowedFields);
  let idx = nextIdx;

  // Special handling layered on top of buildPatchQuery output -----------------

  // parent_id: validate uuid, reject self-reference, and reject descendant cycle (I2)
  if (req.body.parent_id !== undefined && req.body.parent_id !== null) {
    if (!isValidUuid(req.body.parent_id)) {
      return res.status(400).json({ error: 'Invalid parent_id' });
    }
    if (req.body.parent_id === req.params.id) {
      return res.status(400).json({ error: 'circular: a document cannot be its own parent' });
    }
    // I2: descendant-cycle check. Only run when parent_id is actually changing.
    if (req.body.parent_id !== current.parent_id) {
      const cycleCheck = await pool.query(
        `WITH RECURSIVE descendants AS (
           SELECT id FROM documents WHERE id = $1
           UNION ALL
           SELECT d.id FROM documents d
           INNER JOIN descendants ON d.parent_id = descendants.id
         )
         SELECT 1 FROM descendants WHERE id = $2 LIMIT 1`,
        [req.params.id, req.body.parent_id]
      );
      if (cycleCheck.rows.length > 0) {
        return res.status(400).json({ error: 'circular: cannot move under a descendant' });
      }
    }
  }

  // task_id: validate uuid if provided
  if (req.body.task_id !== undefined && req.body.task_id !== null) {
    if (!isValidUuid(req.body.task_id)) {
      return res.status(400).json({ error: 'Invalid task_id' });
    }
  }

  // visibility: NBI users only; must be one of the allowed values
  if (req.body.visibility !== undefined) {
    if (!['all', 'nbi_only'].includes(req.body.visibility)) {
      return res.status(400).json({ error: "visibility must be 'all' or 'nbi_only'" });
    }
    if (isClientUser) {
      return res.status(403).json({ error: 'Client users cannot set visibility' });
    }
  }

  // body_json: also compute and write body_text for full-text indexing (B1).
  // dropNbiInternal: false. Write-time indexing keeps NBI-internal content so
  // NBI users can search across all content including internal sections.
  if (req.body.body_json !== undefined) {
    const bodyText = extractPlainText(req.body.body_json, { dropNbiInternal: false });
    updates.push(`body_text = $${idx}`);
    vals.push(bodyText);
    idx++;
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  // Append audit columns
  const author = req.user.username || req.user.displayName || 'unknown';
  updates.push(`updated_at = now()`);
  updates.push(`updated_by = $${idx}`);
  vals.push(author);
  idx++;

  // I1: Atomic optimistic-concurrency check. The WHERE clause includes the
  // original updated_at so two concurrent PATCHes with the same If-Match
  // cannot both succeed. The second will match zero rows.
  vals.push(req.params.id);
  vals.push(ifMatchTs);
  const { rows: updated } = await pool.query(
    `UPDATE documents SET ${updates.join(', ')}
      WHERE id = $${idx} AND updated_at = $${idx + 1}
      RETURNING id, client_id, parent_id, task_id, title, body_json, visibility,
                sort_order, updated_at, updated_by`,
    vals
  );

  // M1: RETURNING uses explicit projection (no body_text, no body_version).
  // If zero rows were updated, distinguish between a true concurrent-write conflict
  // and the doc having been deleted between our SELECT and UPDATE.
  if (!updated[0]) {
    const { rows: recheck } = await pool.query(
      `SELECT id, client_id, parent_id, task_id, title, body_json, visibility,
              sort_order, updated_at, updated_by
         FROM documents WHERE id = $1`,
      [req.params.id]
    );
    if (recheck.length === 0) return res.status(404).json({ error: 'Not found' });
    const conflict = recheck[0];
    const safeConflict = isClientUser
      ? { ...conflict, body_json: redactNbiInternal(conflict.body_json) }
      : conflict;
    return res.status(409).json({ error: 'Conflict', current: safeConflict });
  }

  const doc = updated[0];
  // D1: emit fresh ETag from the new updated_at so client can track the new version
  res.set('ETag', `W/"${doc.updated_at.toISOString()}"`);
  res.json(doc);
});
```

- [ ] **Step 1.3: Run tests to verify no regressions**

```bash
cd dashboard-server && npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: all previously-passing tests still pass (at minimum the 12 in `'Documents: update/delete/move'`). Zero new failures.

---

## Task 2: Fix DELETE handler (M4)

**Files:**
- Modify: `dashboard-server/server.js` — DELETE handler only

- [ ] **Step 2.1: Locate the DELETE handler**

Read `server.js` lines 4398-4424. Find this block:

```js
const isClientUser = !!req.user.clientId;
if (isClientUser && req.user.clientId !== doc.client_id) {
  return res.status(404).json({ error: 'Not found' });
}
```

- [ ] **Step 2.2: Change 404 to 204 for cross-client DELETE**

Replace the cross-client guard so it returns 204 (silent no-op) instead of 404. This closes the existence-disclosure: a client cannot enumerate UUIDs by getting 404 vs 204.

Change the block from:

```js
const isClientUser = !!req.user.clientId;
if (isClientUser && req.user.clientId !== doc.client_id) {
  return res.status(404).json({ error: 'Not found' });
}
if (isClientUser && req.user.docsEdit === false) {
  return res.status(403).json({ error: 'No doc-edit permission' });
}
```

To:

```js
const isClientUser = !!req.user.clientId;
// M4: cross-client DELETE is a silent no-op (204) rather than 404.
// Returning 404 would let a client enumerate doc existence by sending
// DELETE requests against guessed UUIDs. The doc is not deleted.
if (isClientUser && req.user.clientId !== doc.client_id) {
  return res.status(204).end();
}
if (isClientUser && req.user.docsEdit === false) {
  return res.status(403).json({ error: 'No doc-edit permission' });
}
```

- [ ] **Step 2.3: Run tests to confirm no regressions**

```bash
cd dashboard-server && npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: all previously-passing tests still pass.

---

## Task 3: Add 8 new tests (M3)

**Files:**
- Modify: `dashboard-server/tests/unit/documents.test.mjs` — append inside existing `'Documents: update/delete/move'` describe block, before the final `});`

- [ ] **Step 3.1: Locate insertion point**

Read `documents.test.mjs` lines 450-454. The file ends with:

```js
  });
});
```

The inner `});` closes the last `it(...)`. The outer `});` closes the describe block. Insert the new tests between those two lines, i.e. after the `  });` on the second-to-last line and before the final `});`.

- [ ] **Step 3.2: Write the 8 new tests**

Append the following block immediately before the final `});` that closes the `'Documents: update/delete/move'` describe:

```js
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
```

- [ ] **Step 3.3: Run full test suite**

```bash
cd dashboard-server && npm test -- --reporter=verbose 2>&1 | tail -40
```

Expected output (approximate):
```
 PASS  tests/unit/documents.test.mjs
  Documents — list/read/create (9 tests)
  Documents: update/delete/move (20 tests)

Test Files  X passed
Tests       268 passed
```

All 268 tests green (260 pre-existing + 8 new). Zero failures.

---

## Task 4: Commit

- [ ] **Step 4.1: Stage both changed files**

```bash
cd dashboard-server && git add server.js tests/unit/documents.test.mjs
```

- [ ] **Step 4.2: Create the commit**

```bash
git commit -m "$(cat <<'EOF'
fix(docs): security + race + cycle fixes on PATCH/DELETE

- C1: scope guards (cross-client/nbi_only/docsEdit) now run BEFORE ETag
  comparison in PATCH so client-A cannot see client-B's doc body in a 409
- C1/I3: 409 body's current.body_json is redacted via redactNbiInternal for
  client portal users, matching the GET-by-id redaction pattern
- I1: UPDATE WHERE clause includes updated_at = ifMatchTs for atomic
  optimistic-concurrency; a concurrent write that bumps updated_at returns
  zero rows, triggering a re-SELECT and 409 rather than a silent lost-update
- I2: descendant-cycle CTE check added when parent_id is being changed; a
  move that would create a cycle returns 400 circular: cannot move under a descendant
- I3: subsumed by C1 redaction step (same code path handles both)
- M1: UPDATE RETURNING now lists explicit columns instead of RETURNING *;
  body_text and body_version are never returned in client-facing responses
- M3: 8 new tests (T-Sec-C1a, T-Sec-C1b, T-Sec-C1c, T-Race-I1, T-Cycle-I2,
  T-Etag-Malformed, T-Shape-M1, T-Delete-M4)
- M4: cross-client DELETE returns 204 (silent no-op) instead of 404 to
  prevent existence-disclosure via delete enumeration
EOF
)"
```

- [ ] **Step 4.3: Verify commit was created**

```bash
git log --oneline -3
```

Expected: the new commit appears at the top.

---

## Self-Review Checklist

Run these questions against the finished code before reporting done:

- [ ] Are scope guards genuinely before the `if (ifMatch !== currentEtag)` block?
- [ ] Does the UPDATE WHERE clause contain `AND updated_at = $${idx + 1}`?
- [ ] Is `redactNbiInternal` applied to `current.body_json` for client users in ALL 409 paths (both the pre-UPDATE guard and the post-UPDATE re-SELECT path)?
- [ ] Does the descendant CTE correctly use `$1 = req.params.id` (the doc being moved) and `$2 = req.body.parent_id` (proposed parent)?
- [ ] Does `RETURNING` use an explicit column list with no `body_text` or `body_version`?
- [ ] Do all 8 new tests pass?
- [ ] Do the original 12 `'Documents: update/delete/move'` tests still pass?
- [ ] No British-English violations in new code or comments (use "authorise", not "authorize")?
- [ ] No em dashes anywhere in new code?
