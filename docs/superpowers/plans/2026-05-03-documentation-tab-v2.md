# Documentation Tab v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add right-click context menu (Rename, Add subpage, Hide, Delete) and hidden-page soft-archive to the Documentation tab.

**Architecture:** New `hidden` boolean column on `documents` table. Server filters hidden pages from users without `docs_edit` permission. Frontend renders a single global context menu div, positioned on right-click. Hidden pages render greyed-out for admin users, invisible to read-only users. Toolbar wrap was already shipped in v1 — no work needed.

**Tech Stack:** Node.js/Express, PostgreSQL, vanilla JS (monolithic HTML), TipTap editor, Vitest (unit), Playwright (e2e)

**Spec:** `docs/superpowers/specs/2026-05-03-documentation-tab-v2-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/migrations/036_document_hidden.sql` | Create | Add `hidden` column to `documents` table |
| `dashboard-server/server.js` | Modify (lines 4199-4208, 4219-4242, 4306-4308) | GET filtering, GET/:id blocking, PATCH accepting `hidden` |
| `nbi_project_dashboard.html` | Modify (lines 11585-11600, 11711-11753, CSS ~2367) | Context menu, hidden styling, inline rename, hidden banner |
| `dashboard-server/tests/unit/documents.test.mjs` | Modify | Tests for hidden filtering and PATCH hidden |
| `dashboard-server/tests/e2e/documents.spec.js` | Modify | E2E for context menu + hide/unhide flow |

---

## Task 1: Migration — Add `hidden` Column

**Files:**
- Create: `dashboard-server/migrations/036_document_hidden.sql`
- Test: `dashboard-server/tests/unit/migrations.test.mjs` (existing — auto-validates all migrations parse)

- [ ] **Step 1: Write the migration file**

```sql
-- 036_document_hidden.sql
-- Add hidden (soft-archive) flag to documents table.
-- Hidden pages are invisible to users without docs_edit permission.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Run the migration test to confirm it parses**

Run: `cd dashboard-server && npx vitest run tests/unit/migrations.test.mjs`
Expected: PASS — all migration files parse without SQL syntax errors.

- [ ] **Step 3: Apply the migration to the local database**

Run: `cd dashboard-server && node init-db.js`
Expected: Output shows migration 036 applied successfully.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/migrations/036_document_hidden.sql
git commit -m "feat(docs): add hidden column to documents table (036)"
```

---

## Task 2: Server — Filter Hidden Pages on GET List

**Files:**
- Modify: `dashboard-server/server.js:4199-4208`
- Test: `dashboard-server/tests/unit/documents.test.mjs`

- [ ] **Step 1: Write failing tests for hidden filtering**

Append to `dashboard-server/tests/unit/documents.test.mjs`, inside the existing `describe('Documents — list/read/create')` block:

```javascript
  // ---- HIDDEN FILTERING ---------------------------------------------------

  it('GET /api/documents excludes hidden pages for client users without docs_edit', async () => {
    // Create a page, then mark it hidden
    const page = await pool.query(
      `INSERT INTO documents (client_id, title, hidden, created_by, updated_by)
       VALUES ($1, 'Secret Page', true, 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );
    // Also create a visible page
    await pool.query(
      `INSERT INTO documents (client_id, title, hidden, created_by, updated_by)
       VALUES ($1, 'Public Page', false, 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );

    // Client user with docs_view only (no docs_edit)
    const clientUser = await createTestUser({
      role: 'member', client_id: lighthouse.id, docs_view: true, docs_edit: false
    });
    const clientToken = await mintSession(clientUser.id);

    const res = await request(app)
      .get(`/api/documents?client_id=${lighthouse.id}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    const titles = res.body.map(d => d.title);
    expect(titles).not.toContain('Secret Page');
    expect(titles).toContain('Public Page');
  });

  it('GET /api/documents includes hidden pages (with hidden field) for client users with docs_edit', async () => {
    await pool.query(
      `INSERT INTO documents (client_id, title, hidden, created_by, updated_by)
       VALUES ($1, 'Secret Page', true, 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );

    const editUser = await createTestUser({
      role: 'member', client_id: lighthouse.id, docs_view: true, docs_edit: true
    });
    const editToken = await mintSession(editUser.id);

    const res = await request(app)
      .get(`/api/documents?client_id=${lighthouse.id}`)
      .set('Authorization', `Bearer ${editToken}`);
    expect(res.status).toBe(200);
    const secret = res.body.find(d => d.title === 'Secret Page');
    expect(secret).toBeDefined();
    expect(secret.hidden).toBe(true);
  });

  it('GET /api/documents includes hidden pages for NBI admin users', async () => {
    await pool.query(
      `INSERT INTO documents (client_id, title, hidden, created_by, updated_by)
       VALUES ($1, 'Secret Page', true, 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );

    const res = await request(app)
      .get(`/api/documents?client_id=${lighthouse.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const secret = res.body.find(d => d.title === 'Secret Page');
    expect(secret).toBeDefined();
    expect(secret.hidden).toBe(true);
  });

  it('GET /api/documents excludes children of hidden pages for view-only client users', async () => {
    const parent = await pool.query(
      `INSERT INTO documents (client_id, title, hidden, created_by, updated_by)
       VALUES ($1, 'Hidden Parent', true, 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );
    await pool.query(
      `INSERT INTO documents (client_id, title, parent_id, hidden, created_by, updated_by)
       VALUES ($1, 'Child of Hidden', $2, false, 'test', 'test')`,
      [lighthouse.id, parent.rows[0].id]
    );

    const clientUser = await createTestUser({
      role: 'member', client_id: lighthouse.id, docs_view: true, docs_edit: false
    });
    const clientToken = await mintSession(clientUser.id);

    const res = await request(app)
      .get(`/api/documents?client_id=${lighthouse.id}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    const titles = res.body.map(d => d.title);
    expect(titles).not.toContain('Hidden Parent');
    expect(titles).not.toContain('Child of Hidden');
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs`
Expected: FAIL — the new tests fail because the server doesn't filter hidden pages yet.

- [ ] **Step 3: Implement hidden filtering in GET /api/documents**

In `dashboard-server/server.js`, modify the GET /api/documents handler (starting at line 4199):

Replace the current query and response block (lines 4199-4208):

```javascript
  // Determine if this user can see hidden pages
  const canSeeHidden = !isClientUser || req.user.docsEdit === true;

  const { rows } = await pool.query(
    `SELECT id, parent_id, task_id, title, body_json, visibility, hidden, sort_order, updated_at, updated_by
       FROM documents WHERE client_id = $1 ${visibilityClause}
       ORDER BY parent_id NULLS FIRST, sort_order, created_at`,
    [clientId]
  );

  let out;
  if (!canSeeHidden) {
    // Build a set of hidden page IDs (explicitly hidden)
    const hiddenIds = new Set(rows.filter(r => r.hidden).map(r => r.id));
    // Walk ancestors: if any ancestor is hidden, exclude this row
    function hasHiddenAncestor(row) {
      let cur = row;
      while (cur.parent_id) {
        if (hiddenIds.has(cur.parent_id)) return true;
        cur = rows.find(r => r.id === cur.parent_id);
        if (!cur) break;
      }
      return false;
    }
    out = rows.filter(r => !r.hidden && !hasHiddenAncestor(r));
  } else {
    out = rows;
  }

  if (isClientUser) {
    out = out.map(r => ({ ...r, body_json: redactNbiInternal(r.body_json) }));
  }
  res.json(out);
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs`
Expected: PASS — all tests including the new hidden filtering tests.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/documents.test.mjs
git commit -m "feat(docs): filter hidden pages from GET /api/documents for view-only users"
```

---

## Task 3: Server — Block Hidden Page Access on GET Single + PATCH Accept Hidden

**Files:**
- Modify: `dashboard-server/server.js:4219-4242` (GET /:id) and `4306-4308` (PATCH allowedFields)
- Test: `dashboard-server/tests/unit/documents.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to the same describe block in `documents.test.mjs`:

```javascript
  // ---- GET SINGLE + HIDDEN --------------------------------------------------

  it('GET /api/documents/:id returns 404 for hidden doc when user lacks docs_edit', async () => {
    const doc = await pool.query(
      `INSERT INTO documents (client_id, title, hidden, created_by, updated_by)
       VALUES ($1, 'Hidden', true, 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );

    const clientUser = await createTestUser({
      role: 'member', client_id: lighthouse.id, docs_view: true, docs_edit: false
    });
    const clientToken = await mintSession(clientUser.id);

    const res = await request(app)
      .get(`/api/documents/${doc.rows[0].id}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/documents/:id returns hidden doc for user with docs_edit', async () => {
    const doc = await pool.query(
      `INSERT INTO documents (client_id, title, hidden, created_by, updated_by)
       VALUES ($1, 'Hidden', true, 'test', 'test') RETURNING id`,
      [lighthouse.id]
    );

    const editUser = await createTestUser({
      role: 'member', client_id: lighthouse.id, docs_view: true, docs_edit: true
    });
    const editToken = await mintSession(editUser.id);

    const res = await request(app)
      .get(`/api/documents/${doc.rows[0].id}`)
      .set('Authorization', `Bearer ${editToken}`);
    expect(res.status).toBe(200);
    expect(res.body.hidden).toBe(true);
  });

  // ---- PATCH HIDDEN ---------------------------------------------------------

  it('PATCH /api/documents/:id accepts hidden field for NBI admin', async () => {
    const doc = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by)
       VALUES ($1, 'Page', 'test', 'test') RETURNING id, updated_at`,
      [lighthouse.id]
    );
    const etag = `W/"${doc.rows[0].updated_at.toISOString()}"`;

    const res = await request(app)
      .patch(`/api/documents/${doc.rows[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('If-Match', etag)
      .send({ hidden: true });
    expect(res.status).toBe(200);
    expect(res.body.hidden).toBe(true);
  });

  it('PATCH /api/documents/:id accepts hidden field for client users WITH docs_edit', async () => {
    const doc = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by)
       VALUES ($1, 'Page', 'test', 'test') RETURNING id, updated_at`,
      [lighthouse.id]
    );
    const etag = `W/"${doc.rows[0].updated_at.toISOString()}"`;

    const editUser = await createTestUser({
      role: 'member', client_id: lighthouse.id, docs_view: true, docs_edit: true
    });
    const editToken = await mintSession(editUser.id);

    const res = await request(app)
      .patch(`/api/documents/${doc.rows[0].id}`)
      .set('Authorization', `Bearer ${editToken}`)
      .set('If-Match', etag)
      .send({ hidden: true });
    expect(res.status).toBe(200);
    expect(res.body.hidden).toBe(true);
  });

  it('PATCH /api/documents/:id returns 403 for client users WITHOUT docs_edit', async () => {
    const doc = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by)
       VALUES ($1, 'Page', 'test', 'test') RETURNING id, updated_at`,
      [lighthouse.id]
    );
    const etag = `W/"${doc.rows[0].updated_at.toISOString()}"`;

    const viewUser = await createTestUser({
      role: 'member', client_id: lighthouse.id, docs_view: true, docs_edit: false
    });
    const viewToken = await mintSession(viewUser.id);

    const res = await request(app)
      .patch(`/api/documents/${doc.rows[0].id}`)
      .set('Authorization', `Bearer ${viewToken}`)
      .set('If-Match', etag)
      .send({ hidden: true });
    // Non-edit client users are rejected at the permission gate (line 4288) before allowedFields
    expect(res.status).toBe(403);
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs`
Expected: FAIL — GET returns hidden docs to view-only users, PATCH doesn't accept hidden.

- [ ] **Step 3: Implement GET /:id hidden blocking**

In `dashboard-server/server.js`, in the GET /api/documents/:id handler, after the existing `visibility === 'nbi_only'` check (line 4232-4234), add a similar check for hidden pages. Also add `hidden` to the SELECT.

Modify the SELECT (line 4219-4224) to include `hidden`:

```javascript
  const { rows } = await pool.query(
    `SELECT id, client_id, parent_id, task_id, title, body_json, visibility, hidden,
            sort_order, updated_at, updated_by
       FROM documents WHERE id = $1`,
    [req.params.id]
  );
```

After the `nbi_only` visibility check (line 4232-4234), add:

```javascript
  // Hidden pages: return 404 to client users without docs_edit (same pattern as nbi_only)
  if (isClientUser && doc.hidden && req.user.docsEdit !== true) {
    return res.status(404).json({ error: 'Not found' });
  }
```

- [ ] **Step 4: Implement PATCH accepting hidden field**

In `dashboard-server/server.js`, modify the `allowedFields` (line 4306-4308). Per spec, any user with `docs_edit` can toggle hidden:

```javascript
  const allowedFields = isClientUser
    ? (req.user.docsEdit
        ? ['title', 'body_json', 'parent_id', 'task_id', 'sort_order', 'hidden']
        : ['title', 'body_json', 'parent_id', 'task_id', 'sort_order'])
    : ['title', 'body_json', 'parent_id', 'task_id', 'sort_order', 'visibility', 'hidden'];
```

Also add `hidden` to the RETURNING clause (line 4392):

```javascript
      RETURNING id, client_id, parent_id, task_id, title, body_json, visibility, hidden,
                sort_order, updated_at, updated_by`,
```

And to the recheck SELECT (line 4401-4404):

```javascript
    const { rows: recheck } = await pool.query(
      `SELECT id, client_id, parent_id, task_id, title, body_json, visibility, hidden,
              sort_order, updated_at, updated_by
         FROM documents WHERE id = $1`,
      [req.params.id]
    );
```

Add validation for the `hidden` field (after the `visibility` validation block, around line 4356):

```javascript
  // hidden: must be boolean
  if (req.body.hidden !== undefined) {
    if (typeof req.body.hidden !== 'boolean') {
      return res.status(400).json({ error: 'hidden must be a boolean' });
    }
  }
```

- [ ] **Step 5: Run tests to confirm they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/documents.test.mjs
git commit -m "feat(docs): GET/:id blocks hidden for view-only users, PATCH accepts hidden field"
```

---

## Task 4: Frontend — Context Menu Component

**Files:**
- Modify: `nbi_project_dashboard.html` (CSS block ~line 2367, JS ~line 11554-11600)

- [ ] **Step 1: Add CSS for the context menu**

In the CSS section of `nbi_project_dashboard.html`, after the `.docs__tb-sep` rule (around line 2371), add:

```css
.docs__ctx-menu { position: fixed; z-index: 1000; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.3); padding: 4px 0; min-width: 160px; display: none; }
.docs__ctx-menu--open { display: block; }
.docs__ctx-item { display: block; width: 100%; padding: 6px 12px; background: none; border: none; text-align: left; color: var(--text-primary); font-size: 0.82rem; cursor: pointer; }
.docs__ctx-item:hover { background: var(--bg-hover); }
.docs__ctx-item--danger { color: var(--danger); border-top: 1px solid var(--border-default); margin-top: 4px; padding-top: 10px; }
.docs__ctx-item--danger:hover { background: color-mix(in srgb, var(--danger) 10%, transparent); }
```

- [ ] **Step 2: Add the global context menu HTML**

In `_docsRender()` (line 11554), just before the closing `el.innerHTML = html;` assignment (line 11573), append the context menu div after the closing `</div>` of `.docs`:

```javascript
  html += '</div>';
  html += '<div class="docs__ctx-menu" id="docsCtxMenu" role="menu">'
    + '<button class="docs__ctx-item" role="menuitem" data-action="rename">Rename</button>'
    + '<button class="docs__ctx-item" role="menuitem" data-action="addchild">Add subpage</button>'
    + '<button class="docs__ctx-item" role="menuitem" data-action="hide">Hide</button>'
    + '<button class="docs__ctx-item docs__ctx-item--danger" role="menuitem" data-action="delete">Delete</button>'
    + '</div>';
  el.innerHTML = html;
```

Note: Remove the existing `el.innerHTML = html;` line and replace the whole tail of the function.

- [ ] **Step 3: Add contextmenu event listener on tree items**

After the `_docsRender` function completes (after `_docsRenderEditorPane()` on line 11574), add an event delegation setup. Insert a new function and call it:

```javascript
function _docsBindContextMenu() {
  const treeCol = document.getElementById('docsTreeCol');
  if (!treeCol) return;
  treeCol.addEventListener('contextmenu', (e) => {
    const li = e.target.closest('.docs__tree-li');
    if (!li) return;
    e.preventDefault();
    const docId = li.dataset.docId;
    _docsShowCtxMenu(e.clientX, e.clientY, docId);
  });
}
```

Call `_docsBindContextMenu()` at the end of `_docsRender`, after `_docsRenderEditorPane()`.

- [ ] **Step 4: Add show/hide/dismiss logic for context menu**

```javascript
let _docsCtxTarget = null;

function _docsShowCtxMenu(x, y, docId) {
  _docsCtxTarget = docId;
  const menu = document.getElementById('docsCtxMenu');
  if (!menu) return;

  // Update Hide/Unhide label based on page's hidden state
  const doc = _docsState.tree.find(d => d.id === docId);
  const hideBtn = menu.querySelector('[data-action="hide"]');
  if (hideBtn && doc) {
    hideBtn.textContent = doc.hidden ? 'Unhide' : 'Hide';
  }

  // Position with viewport clamping
  menu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 160) + 'px';
  menu.classList.add('docs__ctx-menu--open');
}

function _docsHideCtxMenu() {
  const menu = document.getElementById('docsCtxMenu');
  if (menu) menu.classList.remove('docs__ctx-menu--open');
  _docsCtxTarget = null;
}
```

- [ ] **Step 5: Add click-outside and Escape dismissal**

```javascript
document.addEventListener('click', (e) => {
  if (!e.target.closest('.docs__ctx-menu')) _docsHideCtxMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') _docsHideCtxMenu();
});
```

These two listeners should be registered once, at module level (near the other docs event handlers).

- [ ] **Step 6: Add action handler for context menu buttons**

```javascript
document.addEventListener('click', (e) => {
  const item = e.target.closest('.docs__ctx-item');
  if (!item) return;
  const action = item.dataset.action;
  const docId = _docsCtxTarget;
  _docsHideCtxMenu();
  if (!docId) return;
  switch (action) {
    case 'rename': _actDocsInlineRename(docId); break;
    case 'addchild': _actDocsAddPage(docId); break;
    case 'hide': _actDocsToggleHidden(docId); break;
    case 'delete': _actDocsDeleteById(docId); break;
  }
});
```

- [ ] **Step 7: Implement _actDocsDeleteById (wraps existing delete logic)**

```javascript
async function _actDocsDeleteById(docId) {
  if (!confirm('Delete this page and all its sub-pages?')) return;
  await authFetch('/api/documents/' + encodeURIComponent(docId), { method: 'DELETE' });
  if (_docsState.selectedDocId === docId) _docsState.selectedDocId = null;
  await _docsLoadTree(); renderContent();
}
```

- [ ] **Step 8: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(docs): add right-click context menu on tree items"
```

---

## Task 5: Frontend — Inline Rename in Tree

**Files:**
- Modify: `nbi_project_dashboard.html` (JS section)

- [ ] **Step 1: Implement _actDocsInlineRename**

This replaces the tree item's title `<span>` with an `<input>`, saves on Enter/blur, cancels on Escape:

```javascript
function _actDocsInlineRename(docId) {
  const li = document.querySelector(`.docs__tree-li[data-doc-id="${docId}"]`);
  if (!li) return;
  const row = li.querySelector('.docs__tree-row');
  const span = row.querySelector('span');
  if (!span) return;

  const currentTitle = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'docs__tree-rename';
  input.value = currentTitle;
  input.style.cssText = 'font-size:inherit;padding:1px 4px;border:1px solid var(--accent);border-radius:3px;background:var(--bg-input);color:var(--text-primary);width:100%;outline:none;';
  span.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;
  async function save() {
    if (saved) return;
    saved = true;
    const newTitle = input.value.trim() || currentTitle;
    // Restore span
    const newSpan = document.createElement('span');
    newSpan.textContent = newTitle;
    input.replaceWith(newSpan);
    // PATCH title to server
    if (newTitle !== currentTitle) {
      const doc = _docsState.tree.find(d => d.id === docId);
      const etag = _docsState.selectedDocId === docId ? _docsState.lastEtag : null;
      const headers = { 'Content-Type': 'application/json' };
      if (etag) headers['If-Match'] = etag;
      else {
        // Fetch fresh ETag for this doc
        const fresh = await authFetch('/api/documents/' + encodeURIComponent(docId));
        if (fresh && fresh.ok) headers['If-Match'] = fresh.headers.get('ETag');
      }
      const resp = await authFetch('/api/documents/' + encodeURIComponent(docId), {
        method: 'PATCH', headers: headers, body: JSON.stringify({ title: newTitle }),
      });
      if (resp && resp.ok) {
        const etag = resp.headers.get('ETag');
        if (etag && _docsState.selectedDocId === docId) _docsState.lastEtag = etag;
      }
      await _docsLoadTree();
      // Re-render tree without full page re-render
      const treeCol = document.getElementById('docsTreeCol');
      if (treeCol) {
        const tree = _docsBuildTree(_docsState.tree);
        treeCol.innerHTML = '<button class="docs__add-root" onclick="_actDocsAddPage(null)">+ New page</button>' + _docsRenderTreeNodes(tree, 0);
      }
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { saved = true; const s = document.createElement('span'); s.textContent = currentTitle; input.replaceWith(s); }
  });
  input.addEventListener('blur', save);
}
```

- [ ] **Step 2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(docs): inline rename from context menu"
```

---

## Task 6: Frontend — Hidden Page Toggle + Styling

**Files:**
- Modify: `nbi_project_dashboard.html` (CSS and JS)

- [ ] **Step 1: Add CSS for hidden page styling**

After the context menu CSS (added in Task 4), add:

```css
.docs__tree-li--hidden > .docs__tree-row { opacity: 0.4; font-style: italic; }
.docs__tree-li--hidden .docs__tree-hidden-label { font-size: 0.68rem; color: var(--text-muted); margin-left: 4px; }
.docs__hidden-banner { background: color-mix(in srgb, var(--warning) 12%, transparent); border: 1px solid var(--warning); padding: 8px 12px; margin-bottom: 8px; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--warning); }
```

- [ ] **Step 2: Implement _actDocsToggleHidden**

```javascript
async function _actDocsToggleHidden(docId) {
  const doc = _docsState.tree.find(d => d.id === docId);
  if (!doc) return;
  // Need the ETag for this doc
  const freshResp = await authFetch('/api/documents/' + encodeURIComponent(docId));
  if (!freshResp || !freshResp.ok) { toast('Could not load page', 'error'); return; }
  const etag = freshResp.headers.get('ETag');

  const resp = await authFetch('/api/documents/' + encodeURIComponent(docId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'If-Match': etag },
    body: JSON.stringify({ hidden: !doc.hidden }),
  });
  if (resp && resp.ok) {
    if (_docsState.selectedDocId === docId) {
      _docsState.lastEtag = resp.headers.get('ETag');
    }
    await _docsLoadTree();
    renderContent();
  } else {
    toast('Failed to update visibility', 'error');
  }
}
```

- [ ] **Step 3: Modify _docsRenderTreeNodes to show hidden styling**

In `_docsRenderTreeNodes` (line 11585), modify the tree node rendering to add a hidden class and label. The function needs to accept a `parentHidden` flag that propagates down:

Replace the current `_docsRenderTreeNodes` function signature and body:

```javascript
function _docsRenderTreeNodes(nodes, depth, parentHidden) {
  if (nodes.length === 0 && depth === 0) return '<div class="docs__tree-empty">No pages yet</div>';
  if (nodes.length === 0) return '';
  let html = '<ul class="docs__tree-list">';
  nodes.forEach((n, idx) => {
    const sel = n.id === _docsState.selectedDocId;
    const isHidden = n.hidden || parentHidden;
    const lock = n.visibility === 'nbi_only' ? '<span class="docs__tree-lock" title="NBI internal only">&#x1f512;</span>' : '';
    const hiddenLabel = n.hidden ? '<span class="docs__tree-hidden-label">&#x1f441; (hidden)</span>' : (parentHidden ? '<span class="docs__tree-hidden-label">(inherited)</span>' : '');
    html += '<li class="docs__tree-li' + (sel ? ' docs__tree-li--selected' : '') + (isHidden ? ' docs__tree-li--hidden' : '') + '" style="padding-left:' + (depth * 12) + 'px" draggable="true" role="treeitem" aria-selected="' + (sel ? 'true' : 'false') + '" data-doc-id="' + escAttrJs(n.id) + '" data-doc-parent="' + escAttrJs(n.parent_id || '') + '" data-doc-idx="' + idx + '" ondragstart="_docsDragStart(event)" ondragover="_docsDragOver(event)" ondragleave="_docsDragLeave(event)" ondrop="_docsDrop(event)">';
    html += '<button class="docs__tree-row" onclick="_actDocsSelectPage(\'' + escAttrJs(n.id) + '\')">' + lock + '<span>' + esc(n.title) + '</span>' + hiddenLabel + '</button>';
    html += '<button class="docs__tree-add" title="Add child page" onclick="event.stopPropagation();_actDocsAddPage(\'' + escAttrJs(n.id) + '\')">+</button>';
    html += '</li>';
    if (n.children.length) html += _docsRenderTreeNodes(n.children, depth + 1, isHidden);
  });
  html += '</ul>';
  return html;
}
```

- [ ] **Step 4: Update all call sites of _docsRenderTreeNodes to pass parentHidden=false**

There are three call sites:
1. In `_docsRender` (line 11569): `_docsRenderTreeNodes(tree, 0)` → `_docsRenderTreeNodes(tree, 0, false)`
2. In `_actDocsSelectPage` (line 11023): same pattern → add `, false`
3. In `_actDocsTitleInput` (line 12050): same pattern → add `, false`

- [ ] **Step 5: Add hidden banner in editor pane**

In `_docsRenderEditorPane` (line 11711), after the recovery banner HTML and before the title row, add a hidden banner when viewing a hidden doc:

After the recovery banner line (line 11745) and before the `'<div class="docs__title-row">'` line, insert:

```javascript
    + (doc.hidden ? '<div class="docs__hidden-banner">This page is hidden from non-admin users.</div>' : '')
```

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(docs): hidden page toggle, tree styling, and editor banner"
```

---

## Task 7: E2E Test — Context Menu + Hide/Unhide Flow

**Files:**
- Modify: `dashboard-server/tests/e2e/documents.spec.js`

- [ ] **Step 1: Add E2E test for context menu and hide**

Append a new test to the existing describe block:

```javascript
  test('right-click shows context menu, hide/unhide toggles page visibility', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(2000);

    const clientId = client.id;
    await page.evaluate((cid) => {
      _apiClientsCache['E2E Client'] = { id: cid, name: 'E2E Client' };
      _docsState.clientId = cid;
      switchView('documentation');
    }, clientId);

    await page.waitForSelector('.docs__hdr', { timeout: 25000 });

    // Create a page
    await page.locator('.docs__add-root').click();
    await page.waitForSelector('.docs__title', { timeout: 10000 });
    const titleInput = page.locator('.docs__title');
    await titleInput.fill('Context Menu Test');
    await page.waitForTimeout(1000);

    // Right-click the tree item
    const treeItem = page.locator('.docs__tree-li').first();
    await treeItem.click({ button: 'right' });

    // Context menu should appear
    await expect(page.locator('#docsCtxMenu')).toHaveClass(/docs__ctx-menu--open/);

    // Click Hide
    await page.locator('.docs__ctx-item[data-action="hide"]').click();
    await page.waitForTimeout(1500);

    // Page should now have hidden styling
    await expect(page.locator('.docs__tree-li--hidden')).toBeVisible();

    // Right-click again — label should say "Unhide"
    const hiddenItem = page.locator('.docs__tree-li').first();
    await hiddenItem.click({ button: 'right' });
    await expect(page.locator('.docs__ctx-item[data-action="hide"]')).toContainText('Unhide');

    // Click Unhide
    await page.locator('.docs__ctx-item[data-action="hide"]').click();
    await page.waitForTimeout(1500);

    // Hidden styling should be gone
    await expect(page.locator('.docs__tree-li--hidden')).toHaveCount(0);
  });

  test('right-click rename allows inline title editing', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(user.username);
    await page.locator('#loginPass').fill(user.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(2000);

    const clientId = client.id;
    await page.evaluate((cid) => {
      _apiClientsCache['E2E Client'] = { id: cid, name: 'E2E Client' };
      _docsState.clientId = cid;
      switchView('documentation');
    }, clientId);

    await page.waitForSelector('.docs__hdr', { timeout: 25000 });

    // Create a page
    await page.locator('.docs__add-root').click();
    await page.waitForSelector('.docs__title', { timeout: 10000 });

    // Right-click and choose Rename
    const treeItem = page.locator('.docs__tree-li').first();
    await treeItem.click({ button: 'right' });
    await page.locator('.docs__ctx-item[data-action="rename"]').click();

    // Should see an inline input
    const renameInput = page.locator('.docs__tree-rename');
    await expect(renameInput).toBeVisible();
    await renameInput.fill('Renamed Page');
    await renameInput.press('Enter');

    // Wait for save
    await page.waitForTimeout(1500);

    // Tree should show the new title
    await expect(page.locator('.docs__tree-row span').first()).toContainText('Renamed Page');
  });
```

- [ ] **Step 2: Run the full test suite**

Run: `cd dashboard-server && npm run test:all`
Expected: PASS — all unit and e2e tests green.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/e2e/documents.spec.js
git commit -m "test(docs): e2e for context menu, hide/unhide, and inline rename"
```

---

## Task 8: Toolbar Wrap — Verify Already Done

**Files:** None to change.

The toolbar already has `flex-wrap: wrap` in the CSS (line 2367 of `nbi_project_dashboard.html`):

```css
.docs__toolbar { display: flex; gap: 4px; ... flex-wrap: wrap; align-items: center; ... }
```

- [ ] **Step 1: Verify visually that all toolbar buttons are visible at narrow widths**

Open https://worksage.nbi-consulting.com, navigate to Documentation tab, resize the browser to ~600px wide. All toolbar buttons (Bold through NBI) should wrap to a second row rather than being clipped.

- [ ] **Step 2: No commit needed — already shipped in v1**

---

## Task 9: Final Verification + Deploy

- [ ] **Step 1: Run full test suite**

Run: `cd dashboard-server && npm run test:all`
Expected: All unit tests and all e2e tests pass.

- [ ] **Step 2: Restart PM2**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Verify in browser**

Open https://worksage.nbi-consulting.com, navigate to Documentation tab:
1. Right-click a page — context menu appears with Rename, Add subpage, Hide, Delete
2. Click Hide — page goes greyed-out with eye icon
3. Click the same page — editor shows "hidden from non-admin users" banner
4. Right-click again — menu shows "Unhide"
5. Click Unhide — page returns to normal

- [ ] **Step 4: Final commit (squash/merge or leave as feature commits)**

```bash
git log --oneline -7
```

Review the commit chain is clean. If working in a worktree, merge to master.
