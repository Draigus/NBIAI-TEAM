# WorkSage Documentation Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Confluence-style documentation system to WorkSage where NBI staff and configured client portal users can author, browse, and share rich-text pages organised in a tree, with section-level NBI-only redaction enforced server-side, image upload, and Slack permalink smart cards.

**Architecture:** TipTap (ProseMirror) loaded as ESM modules from a CDN — no build step. ProseMirror JSON stored in a new `documents` table; per-doc tree via self-referential `parent_id`; per-doc visibility flag plus a custom `nbiInternalBlock` node that the server strips for client users before sending. Image upload reuses the existing `uploads/` directory via a new `document_attachments` table. Per-user permission flags on `users` (read / edit / create / upload), pre-populated from per-client defaults. Slack permalink paste auto-converts to a styled card; live thread fetch is deferred to v2.

**Tech Stack:** Node.js + Express, PostgreSQL (`pg`), TipTap 2.x via esm.sh, Vitest + Supertest for backend tests, Playwright for e2e, vanilla JS frontend.

---

## File Structure

| File | Created / Modified | Responsibility |
|---|---|---|
| `dashboard-server/migrations/033_documents.sql` | Create | `documents` table with self-ref hierarchy, body_json, visibility, optional task_id link |
| `dashboard-server/migrations/034_document_attachments.sql` | Create | Per-doc image attachments table |
| `dashboard-server/migrations/035_documentation_perms.sql` | Create | Per-user permission flags + per-client defaults |
| `dashboard-server/server.js` | Modify | New endpoints under `/api/documents/*`, redaction helper, sync/load extension to surface client doc-perms |
| `dashboard-server/lib/redact-nbi-internal.js` | Create | Pure function that walks ProseMirror JSON and strips `nbiInternalBlock` nodes; covered by unit tests |
| `dashboard-server/tests/unit/documents.test.mjs` | Create | Endpoint tests (CRUD, visibility, perms, redaction round-trip, image upload) |
| `dashboard-server/tests/unit/redact-nbi-internal.test.mjs` | Create | Unit tests for the pure redaction helper |
| `dashboard-server/tests/e2e/documents.spec.js` | Create | Playwright cover of the editor: bold / italic / underline / link / image / NBI block / save / cross-user redaction |
| `nbi_project_dashboard.html` | Modify | New `'documentation'` view, sidebar item, contextual link wiring on Gantt + Portfolio, TipTap loader, custom node definitions, tree component, editor pane, smart-link parser, autosave indicator, permission UI in Settings → Users |
| `docs/superpowers/specs/2026-05-02-documentation-tab.md` | Create | Frozen spec capturing the design decisions Glen approved on 2026-05-02 |

## Self-imposed scope limits

**In scope (v1):**
- Tree CRUD with drag-to-reparent, drag-to-reorder
- Rich-text editing: bold / italic / underline / strikethrough / headings (H1-H3) / bulleted + numbered lists / blockquote / inline code / horizontal rule
- Hyperlinks (paste, type, or toolbar; rendered with target=_blank)
- Image upload via toolbar button, drag-and-drop into the editor, or paste from clipboard. Stored in `uploads/`, served via `/api/documents/:id/attachments/:filename`
- NBI-internal block node — coloured panel for NBI users; server strips it from payload sent to client users
- Page-level visibility flag (`'all'` vs `'nbi_only'`)
- Slack permalink → smart-link card (channel + message id parsed from URL, "Open in Slack" button)
- Task reference smart link (`@T1.1.1` → live status pill)
- Per-user permission flags (`docs_view`, `docs_edit`, `docs_create`, `docs_upload`)
- Per-client defaults that pre-populate new client portal user accounts
- Autosave on every edit (debounced 800 ms) + visible "Saved 2s ago" indicator
- Sidebar item ("Documentation"), Gantt client-header link, Portfolio per-client link
- Empty-state seed: six pages (Overview / Contacts / Risks / Decisions / Architecture / Notes) on first open per client

**Deferred to v2:**
- Live Slack thread fetch (Tier 2 — needs Slack Web API integration)
- Slack channel pull-into-doc
- Templates beyond the seeded set
- Page version history / restore
- Comments on doc pages
- @mentions → notifications
- Search across docs
- PDF / Word export
- Concurrent editing / OT / CRDT (v1 = single-author, last-write-wins same as the rest of the dashboard)

---

## Task 1: Spec freeze

**Files:**
- Create: `docs/superpowers/specs/2026-05-02-documentation-tab.md`

- [ ] **Step 1: Write the spec document**

Capture the seven Glen-approved design decisions verbatim:

```markdown
# Documentation Tab Spec — 2026-05-02

## Design decisions (Glen-approved)

1. Audience: NBI staff + configured client portal users.
2. Editor: TipTap (ProseMirror) loaded via ESM imports from a CDN. No build step.
3. Visibility: page-level flag (`all` / `nbi_only`) AND block-level via a custom `nbiInternalBlock` node. Server-side strip when serving to client users — redacted content never leaves the server.
4. Permissions: per-user flags (`docs_view`, `docs_edit`, `docs_create`, `docs_upload`) on `users`. Per-client defaults pre-populate new client-portal user accounts. NBI staff get all flags true by default.
5. Slack: tier 1 smart-link cards (paste a Slack permalink, get a styled card with channel + msg id + "Open in Slack" button). Click opens the deep link. Live thread fetch deferred to v2.
6. Image upload: toolbar / drag-drop / clipboard-paste into the editor. Stored in `uploads/`. Served via authenticated `/api/documents/:id/attachments/:filename`. 5 MB cap, jpg/png/gif/webp.
7. Entry points: sidebar "Documentation" item + contextual link on every Gantt client header + contextual link on each Portfolio per-client section.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-02-documentation-tab.md
git commit -m "docs(documentation): freeze v1 spec from 2026-05-02 brainstorm"
```

---

## Task 2: Migration — `documents` table

**Files:**
- Create: `dashboard-server/migrations/033_documents.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 033_documents.sql
-- Tree of rich-text pages scoped to a client. Each row stores a
-- ProseMirror JSON document body. Hierarchy via parent_id self-ref.
-- Optional task_id link for "Feature breakdown" pages that target a
-- specific Project / Feature / Story / Task.
--
-- Visibility:
--   'all'      — visible to NBI staff AND client portal users in scope
--   'nbi_only' — visible to NBI staff only; client users never receive
--                this row from the API.
--
-- Body-level NBI redaction lives inside body_json (the nbiInternalBlock
-- node type) and is stripped server-side by lib/redact-nbi-internal.js
-- before send to client users.

CREATE TABLE documents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  parent_id   uuid                 REFERENCES documents(id) ON DELETE CASCADE,
  task_id     uuid                 REFERENCES tasks(id) ON DELETE SET NULL,
  title       text        NOT NULL DEFAULT 'Untitled',
  body_json   jsonb       NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  visibility  text        NOT NULL DEFAULT 'all'
              CHECK (visibility IN ('all','nbi_only')),
  sort_order  integer     NOT NULL DEFAULT 0,
  created_by  text        NOT NULL,
  updated_by  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_client    ON documents(client_id);
CREATE INDEX idx_documents_parent    ON documents(parent_id);
CREATE INDEX idx_documents_task      ON documents(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_documents_visibility ON documents(visibility);
```

- [ ] **Step 2: Apply to dev DB**

Run:
```bash
PGPASSWORD='NbiAi2026!SecureDb' "/c/Program Files/PostgreSQL/16/bin/psql.exe" \
  -h localhost -U nbiai -d nbi_dashboard \
  -f dashboard-server/migrations/033_documents.sql
```
Expected: `CREATE TABLE` then four `CREATE INDEX` lines.

- [ ] **Step 3: Apply to test DB**

Run:
```bash
PGPASSWORD='NbiAi2026!SecureDb' "/c/Program Files/PostgreSQL/16/bin/psql.exe" \
  -h localhost -U nbiai -d nbi_dashboard_test \
  -f dashboard-server/migrations/033_documents.sql
```
Expected: same output.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/migrations/033_documents.sql
git commit -m "feat(docs): migration 033 - documents tree table"
```

---

## Task 3: Migration — `document_attachments` table

**Files:**
- Create: `dashboard-server/migrations/034_document_attachments.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 034_document_attachments.sql
-- Image uploads embedded into documents. Files stored on disk under
-- uploads/ — same directory as task_attachments — but indexed via this
-- table so we can scope visibility, enforce size limits, and clean up
-- when a document is deleted.

CREATE TABLE document_attachments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  filename      text        NOT NULL,
  stored_name   text        NOT NULL UNIQUE,
  mime_type     text        NOT NULL,
  size_bytes    integer     NOT NULL,
  uploaded_by   text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_document_attachments_doc ON document_attachments(document_id);
```

- [ ] **Step 2: Apply to dev + test DBs**

Run:
```bash
for DB in nbi_dashboard nbi_dashboard_test; do
  PGPASSWORD='NbiAi2026!SecureDb' "/c/Program Files/PostgreSQL/16/bin/psql.exe" \
    -h localhost -U nbiai -d "$DB" \
    -f dashboard-server/migrations/034_document_attachments.sql
done
```
Expected: two `CREATE TABLE` + two `CREATE INDEX` lines.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/migrations/034_document_attachments.sql
git commit -m "feat(docs): migration 034 - document_attachments table"
```

---

## Task 4: Migration — permission flags on `users` and `clients`

**Files:**
- Create: `dashboard-server/migrations/035_documentation_perms.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 035_documentation_perms.sql
-- Per-user permission flags for the Documentation tab. NBI staff
-- (role='admin' or 'member') get all four set to true via the DEFAULT.
-- Client portal users get the per-client default values applied at
-- account creation; an NBI admin can override on any individual user.
--
-- Per-client defaults live on the clients row: when a new client portal
-- user is created the four flags copy from doc_default_*.

ALTER TABLE users  ADD COLUMN IF NOT EXISTS docs_view    boolean NOT NULL DEFAULT true;
ALTER TABLE users  ADD COLUMN IF NOT EXISTS docs_edit    boolean NOT NULL DEFAULT true;
ALTER TABLE users  ADD COLUMN IF NOT EXISTS docs_create  boolean NOT NULL DEFAULT true;
ALTER TABLE users  ADD COLUMN IF NOT EXISTS docs_upload  boolean NOT NULL DEFAULT true;

-- Client portal users default to read-only until an NBI admin opens it up.
UPDATE users SET docs_edit = false, docs_create = false, docs_upload = false
WHERE client_id IS NOT NULL;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS doc_default_view    boolean NOT NULL DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS doc_default_edit    boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS doc_default_create  boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS doc_default_upload  boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply to dev + test DBs**

Run:
```bash
for DB in nbi_dashboard nbi_dashboard_test; do
  PGPASSWORD='NbiAi2026!SecureDb' "/c/Program Files/PostgreSQL/16/bin/psql.exe" \
    -h localhost -U nbiai -d "$DB" \
    -f dashboard-server/migrations/035_documentation_perms.sql
done
```
Expected: 8 `ALTER TABLE` + 1 `UPDATE` per DB.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/migrations/035_documentation_perms.sql
git commit -m "feat(docs): migration 035 - per-user + per-client doc perms"
```

---

## Task 5: Server — redaction helper (TDD)

**Files:**
- Create: `dashboard-server/lib/redact-nbi-internal.js`
- Create: `dashboard-server/tests/unit/redact-nbi-internal.test.mjs`

- [ ] **Step 1: Write the failing test file**

```js
// dashboard-server/tests/unit/redact-nbi-internal.test.mjs
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { redactNbiInternal } = require('../../lib/redact-nbi-internal');

describe('redactNbiInternal', () => {
  it('returns the doc unchanged when no nbiInternalBlock nodes exist', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }
    ]};
    expect(redactNbiInternal(doc)).toEqual(doc);
  });

  it('drops a top-level nbiInternalBlock entirely (no placeholder)', () => {
    const doc = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'visible' }] },
      { type: 'nbiInternalBlock', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'SECRET' }] }
      ]},
      { type: 'paragraph', content: [{ type: 'text', text: 'after' }] }
    ]};
    const out = redactNbiInternal(doc);
    expect(out.content).toHaveLength(2);
    expect(out.content[0].content[0].text).toBe('visible');
    expect(out.content[1].content[0].text).toBe('after');
    expect(JSON.stringify(out)).not.toContain('SECRET');
  });

  it('drops nested nbiInternalBlock nodes anywhere in the tree', () => {
    const doc = { type: 'doc', content: [
      { type: 'bulletList', content: [
        { type: 'listItem', content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'public' }] }
        ]},
        { type: 'listItem', content: [
          { type: 'nbiInternalBlock', content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'PRIVATE' }] }
          ]}
        ]}
      ]}
    ]};
    const out = redactNbiInternal(doc);
    expect(JSON.stringify(out)).not.toContain('PRIVATE');
    // The list item that contained only the redacted block becomes empty;
    // we keep it so list numbering is preserved (mirrors how Confluence
    // handles redacted blocks).
    expect(out.content[0].content).toHaveLength(2);
    expect(out.content[0].content[1].content).toEqual([]);
  });

  it('returns null for null/undefined input without throwing', () => {
    expect(redactNbiInternal(null)).toBeNull();
    expect(redactNbiInternal(undefined)).toBeUndefined();
  });

  it('does not mutate the input doc', () => {
    const doc = { type: 'doc', content: [
      { type: 'nbiInternalBlock', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'x' }] }
      ]}
    ]};
    const before = JSON.stringify(doc);
    redactNbiInternal(doc);
    expect(JSON.stringify(doc)).toBe(before);
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run: `cd dashboard-server && npx vitest run tests/unit/redact-nbi-internal.test.mjs`
Expected: FAIL — module `../../lib/redact-nbi-internal` not found.

- [ ] **Step 3: Write the helper**

```js
// dashboard-server/lib/redact-nbi-internal.js
//
// Strip every `nbiInternalBlock` node from a ProseMirror JSON document.
// Used server-side before sending a doc body to a client portal user so
// the redacted content never leaves the server. Pure, no I/O.

/**
 * Recursively walk a ProseMirror node and remove any nbiInternalBlock
 * children. Containers (bulletList, listItem, etc.) are kept even if
 * their nbi-only child was removed — the server doesn't try to "tidy"
 * empty parents because that can change list numbering.
 *
 * Returns a NEW object — input is never mutated.
 *
 * @param {object|null|undefined} node
 * @returns {object|null|undefined}
 */
function redactNbiInternal(node) {
  if (node == null) return node;
  if (!Array.isArray(node.content)) return { ...node };
  const filtered = node.content
    .filter(child => child && child.type !== 'nbiInternalBlock')
    .map(child => redactNbiInternal(child));
  return { ...node, content: filtered };
}

module.exports = { redactNbiInternal };
```

- [ ] **Step 4: Verify the tests pass**

Run: `cd dashboard-server && npx vitest run tests/unit/redact-nbi-internal.test.mjs`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/lib/redact-nbi-internal.js dashboard-server/tests/unit/redact-nbi-internal.test.mjs
git commit -m "feat(docs): server-side nbi-internal block redaction helper + tests"
```

---

## Task 6: Server — list / read / create endpoints (TDD)

**Files:**
- Modify: `dashboard-server/server.js` — add four endpoints
- Create: `dashboard-server/tests/unit/documents.test.mjs`

- [ ] **Step 1: Write the failing test scaffold**

```js
// dashboard-server/tests/unit/documents.test.mjs
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

  it('GET /api/documents?client_id=... returns an empty tree initially', async () => {
    const res = await request(app)
      .get(`/api/documents?client_id=${lighthouse.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('POST /api/documents creates a top-level page with default empty body', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: lighthouse.id, title: 'Overview' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Overview');
    expect(res.body.data.parent_id).toBeNull();
    expect(res.body.data.body_json).toEqual({ type: 'doc', content: [] });
    expect(res.body.data.visibility).toBe('all');
  });

  it('POST /api/documents creates a child page under a given parent_id', async () => {
    const parent = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by) VALUES ($1,'Parent','test','test') RETURNING id`,
      [lighthouse.id]);
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: lighthouse.id, title: 'Child', parent_id: parent.rows[0].id });
    expect(res.status).toBe(201);
    expect(res.body.data.parent_id).toBe(parent.rows[0].id);
  });

  it('POST /api/documents rejects when client_id is missing', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Floating' });
    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.error).toMatch(/client_id/i);
  });

  it('GET /api/documents/:id returns the full body for an NBI user', async () => {
    const body = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Visible' }] },
      { type: 'nbiInternalBlock', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'NBI ONLY' }] }]
      }
    ]};
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, body_json, created_by, updated_by) VALUES ($1,'D',$2,'t','t') RETURNING id`,
      [lighthouse.id, body]);
    const res = await request(app)
      .get(`/api/documents/${ins.rows[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body.data.body_json)).toContain('NBI ONLY');
  });

  it('GET /api/documents/:id strips nbiInternalBlock for client portal users', async () => {
    const body = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Visible' }] },
      { type: 'nbiInternalBlock', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'NBI ONLY' }] }]
      }
    ]};
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, body_json, created_by, updated_by) VALUES ($1,'D',$2,'t','t') RETURNING id`,
      [lighthouse.id, body]);
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);
    const res = await request(app)
      .get(`/api/documents/${ins.rows[0].id}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body.data.body_json)).not.toContain('NBI ONLY');
  });

  it('GET /api/documents/:id returns 404 for nbi_only docs requested by client users', async () => {
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, visibility, created_by, updated_by) VALUES ($1,'Internal','nbi_only','t','t') RETURNING id`,
      [lighthouse.id]);
    const clientUser = await createTestUser({ role: 'member', client_id: lighthouse.id });
    const clientToken = await mintSession(clientUser.id);
    const res = await request(app)
      .get(`/api/documents/${ins.rows[0].id}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs`
Expected: 7 fail (404 / Cannot GET / etc).

- [ ] **Step 3: Add the endpoints to server.js**

Find the `// ==================== TASKS ====================` section in `dashboard-server/server.js` (search for it). Insert above it:

```js
// ==================== DOCUMENTS ====================

const { redactNbiInternal } = require('./lib/redact-nbi-internal');

/** GET /api/documents?client_id=:uuid — return the page tree for a client.
 *  Internal users with scope see all pages; client portal users see only
 *  visibility='all' rows. nbiInternalBlock content is stripped from each
 *  body_json before send when the requester is a client user. */
app.get('/api/documents', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const clientId = req.query.client_id;
  if (!clientId || !isValidUuid(clientId)) return res.status(400).json({ error: 'client_id query param required' });

  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== clientId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (isClientUser && req.user.docs_view === false) {
    return res.status(403).json({ error: 'No doc-view permission' });
  }

  const visibilityClause = isClientUser ? `AND visibility = 'all'` : '';
  const { rows } = await pool.query(
    `SELECT id, parent_id, task_id, title, body_json, visibility, sort_order, updated_at, updated_by
       FROM documents WHERE client_id = $1 ${visibilityClause}
       ORDER BY parent_id NULLS FIRST, sort_order, created_at`,
    [clientId]
  );
  const out = isClientUser
    ? rows.map(r => ({ ...r, body_json: redactNbiInternal(r.body_json) }))
    : rows;
  res.json(out);
});

/** GET /api/documents/:id — return one page. Same redaction + visibility
 *  rules as the list endpoint. */
app.get('/api/documents/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const doc = rows[0];

  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== doc.client_id) return res.status(404).json({ error: 'Not found' });
  if (isClientUser && doc.visibility === 'nbi_only') return res.status(404).json({ error: 'Not found' });
  if (isClientUser && req.user.docs_view === false) return res.status(403).json({ error: 'No doc-view permission' });

  if (isClientUser) doc.body_json = redactNbiInternal(doc.body_json);
  res.json(doc);
});

/** POST /api/documents — create a new page. NBI users create freely;
 *  client users need docs_create=true and must target their own client. */
app.post('/api/documents', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { client_id, parent_id, task_id, title, visibility } = req.body || {};
  if (!client_id || !isValidUuid(client_id)) return res.status(400).json({ error: 'client_id required' });
  if (parent_id && !isValidUuid(parent_id)) return res.status(400).json({ error: 'Invalid parent_id' });
  if (task_id && !isValidUuid(task_id)) return res.status(400).json({ error: 'Invalid task_id' });

  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== client_id) return res.status(403).json({ error: 'Forbidden' });
  if (isClientUser && !req.user.docs_create) return res.status(403).json({ error: 'No doc-create permission' });
  if (isClientUser && visibility === 'nbi_only') return res.status(403).json({ error: 'Client users cannot create NBI-only docs' });

  const safeVis = visibility === 'nbi_only' ? 'nbi_only' : 'all';
  const { rows } = await pool.query(
    `INSERT INTO documents (client_id, parent_id, task_id, title, visibility, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
    [client_id, parent_id || null, task_id || null, (title || 'Untitled').slice(0, 255), safeVis, req.user.username || req.user.displayName || 'unknown']
  );
  res.status(201).json(rows[0]);
});
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/documents.test.mjs
git commit -m "feat(docs): GET/POST /api/documents with NBI redaction"
```

---

## Task 7: Server — update / delete / move endpoints (TDD)

**Files:**
- Modify: `dashboard-server/server.js`
- Modify: `dashboard-server/tests/unit/documents.test.mjs`

- [ ] **Step 1: Append failing tests**

Add to the bottom of `documents.test.mjs`, inside a new describe:

```js
describe('Documents — update/delete/move', () => {
  let admin, adminToken, lighthouse, doc;
  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    adminToken = await mintSession(admin.id);
    lighthouse = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by) VALUES ($1,'X','t','t') RETURNING *`,
      [lighthouse.id]);
    doc = ins.rows[0];
  });

  it('PATCH /api/documents/:id updates title', async () => {
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Renamed');
  });

  it('PATCH /api/documents/:id updates body_json', async () => {
    const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'new' }] }] };
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body_json: body });
    expect(res.status).toBe(200);
    expect(res.body.data.body_json).toEqual(body);
  });

  it('PATCH /api/documents/:id reparents to a sibling', async () => {
    const sib = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by) VALUES ($1,'Sib','t','t') RETURNING id`,
      [lighthouse.id]);
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent_id: sib.rows[0].id });
    expect(res.status).toBe(200);
    expect(res.body.data.parent_id).toBe(sib.rows[0].id);
  });

  it('PATCH /api/documents/:id rejects circular parent', async () => {
    // Circular: parent_id = own id
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ parent_id: doc.id });
    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.error).toMatch(/circular/i);
  });

  it('DELETE /api/documents/:id removes the doc and cascades children', async () => {
    const child = await pool.query(
      `INSERT INTO documents (client_id, parent_id, title, created_by, updated_by) VALUES ($1,$2,'Child','t','t') RETURNING id`,
      [lighthouse.id, doc.id]);
    const res = await request(app)
      .delete(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    const { rowCount } = await pool.query('SELECT 1 FROM documents WHERE id = $1', [child.rows[0].id]);
    expect(rowCount).toBe(0);
  });

  it('Client portal user without docs_edit cannot PATCH', async () => {
    const ro = await createTestUser({ role: 'member', client_id: lighthouse.id });
    await pool.query('UPDATE users SET docs_edit = false WHERE id = $1', [ro.id]);
    const tok = await mintSession(ro.id);
    const res = await request(app)
      .patch(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ title: 'Mine now' });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs`
Expected: 6 fail under the new describe.

- [ ] **Step 3: Add the three endpoints**

Insert after the POST handler in `server.js`:

```js
/** PATCH /api/documents/:id — partial update of title / body_json / parent_id /
 *  task_id / visibility / sort_order. NBI users edit anything they have scope
 *  for; client portal users need docs_edit=true and cannot change visibility. */
app.patch('/api/documents/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const doc = rows[0];

  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== doc.client_id) return res.status(404).json({ error: 'Not found' });
  if (isClientUser && doc.visibility === 'nbi_only') return res.status(404).json({ error: 'Not found' });
  if (isClientUser && !req.user.docs_edit) return res.status(403).json({ error: 'No doc-edit permission' });

  const allowed = ['title', 'body_json', 'parent_id', 'task_id', 'sort_order'];
  if (!isClientUser) allowed.push('visibility');
  const updates = [];
  const vals = [];
  let i = 1;
  for (const key of allowed) {
    if (req.body[key] === undefined) continue;
    if (key === 'parent_id' && req.body[key] !== null) {
      if (!isValidUuid(req.body[key])) return res.status(400).json({ error: 'Invalid parent_id' });
      if (req.body[key] === doc.id) return res.status(400).json({ error: 'Circular parent_id' });
    }
    if (key === 'task_id' && req.body[key] !== null && !isValidUuid(req.body[key])) {
      return res.status(400).json({ error: 'Invalid task_id' });
    }
    if (key === 'visibility' && !['all','nbi_only'].includes(req.body[key])) {
      return res.status(400).json({ error: 'Invalid visibility' });
    }
    if (key === 'body_json') {
      vals.push(JSON.stringify(req.body[key]));
    } else {
      vals.push(req.body[key]);
    }
    updates.push(`${key} = $${i++}`);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push(`updated_at = now()`);
  updates.push(`updated_by = $${i++}`);
  vals.push(req.user.username || req.user.displayName || 'unknown');
  vals.push(req.params.id);
  const { rows: out } = await pool.query(`UPDATE documents SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, vals);
  res.json(out[0]);
});

/** DELETE /api/documents/:id — cascade-deletes children (FK ON DELETE
 *  CASCADE). Client portal users need docs_edit=true; NBI admins can
 *  always delete. */
app.delete('/api/documents/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(204).end();
  const doc = rows[0];

  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== doc.client_id) return res.status(404).json({ error: 'Not found' });
  if (isClientUser && !req.user.docs_edit) return res.status(403).json({ error: 'No doc-edit permission' });

  await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs`
Expected: all 13 pass.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/documents.test.mjs
git commit -m "feat(docs): PATCH + DELETE /api/documents with perm checks"
```

---

## Task 8: Server — image upload + serve endpoints (TDD)

**Files:**
- Modify: `dashboard-server/server.js`
- Modify: `dashboard-server/tests/unit/documents.test.mjs`

- [ ] **Step 1: Append failing tests**

```js
describe('Documents — attachments', () => {
  let admin, adminToken, lighthouse, doc;
  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    adminToken = await mintSession(admin.id);
    lighthouse = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
    const ins = await pool.query(
      `INSERT INTO documents (client_id, title, created_by, updated_by) VALUES ($1,'D','t','t') RETURNING *`,
      [lighthouse.id]);
    doc = ins.rows[0];
  });

  it('POST /api/documents/:id/attachments accepts a small PNG and returns a URL', async () => {
    // 1x1 transparent PNG
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const res = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', png, 'pixel.png');
    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(new RegExp(`/api/documents/${doc.id}/attachments/.+\\.png$`));
    expect(res.body.data.filename).toBe('pixel.png');
  });

  it('POST /api/documents/:id/attachments rejects files over 5 MB', async () => {
    const huge = Buffer.alloc(5 * 1024 * 1024 + 1);
    const res = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', huge, 'big.png');
    expect([400, 413]).toContain(res.status);
  });

  it('POST /api/documents/:id/attachments rejects non-image mime types', async () => {
    const exe = Buffer.from('not-an-image');
    const res = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', exe, 'malware.exe');
    expect(res.status).toBe(400);
  });

  it('GET /api/documents/:id/attachments/:filename serves the file', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const up = await request(app)
      .post(`/api/documents/${doc.id}/attachments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', png, 'pixel.png');
    const url = up.body.data.url;
    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs -t Attachments`
Expected: 4 fail.

- [ ] **Step 3: Implement the endpoints**

Insert after the DELETE handler in server.js:

```js
const ALLOWED_DOC_MIME = new Set(['image/jpeg','image/png','image/gif','image/webp']);
const docUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `doc_${req.params.id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_DOC_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only jpg/png/gif/webp images are allowed'));
  }
});

/** POST /api/documents/:id/attachments — upload an image into a document. */
app.post('/api/documents/:id/attachments', docUpload.single('file'), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!req.file) return res.status(400).json({ error: 'No file or unsupported type' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  // Permission: the requester must have access to the doc.
  const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const doc = rows[0];
  const isClientUser = !!req.user.clientId;
  if (isClientUser && (req.user.clientId !== doc.client_id || !req.user.docs_upload)) {
    fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'No doc-upload permission' });
  }

  const { rows: ins } = await pool.query(
    `INSERT INTO document_attachments (document_id, filename, stored_name, mime_type, size_bytes, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.user.username || 'unknown']
  );
  res.status(201).json({
    id: ins[0].id,
    filename: ins[0].filename,
    url: `/api/documents/${req.params.id}/attachments/${req.file.filename}`,
    mime_type: ins[0].mime_type,
    size_bytes: ins[0].size_bytes
  });
});

/** GET /api/documents/:id/attachments/:filename — serve a doc image. */
app.get('/api/documents/:id/attachments/:filename', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid id' });

  // Visibility: the requester must have access to the doc.
  const { rows } = await pool.query('SELECT client_id, visibility FROM documents WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const doc = rows[0];
  const isClientUser = !!req.user.clientId;
  if (isClientUser && req.user.clientId !== doc.client_id) return res.status(404).json({ error: 'Not found' });
  if (isClientUser && doc.visibility === 'nbi_only') return res.status(404).json({ error: 'Not found' });

  const safeName = path.basename(req.params.filename);
  const fullPath = path.resolve(uploadDir, safeName);
  if (!fullPath.startsWith(path.resolve(uploadDir) + path.sep)) return res.status(400).json({ error: 'Bad path' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File missing' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(fullPath);
});
```

- [ ] **Step 4: Run, confirm pass**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs -t Attachments`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/documents.test.mjs
git commit -m "feat(docs): document image upload + serve endpoints"
```

---

## Task 9: Server — surface doc perms via /api/auth/me and sync/load

**Files:**
- Modify: `dashboard-server/server.js` (search `'/api/auth/me'`)

- [ ] **Step 1: Append the four flags to the /api/auth/me response**

Find the `app.get('/api/auth/me', ...)` handler. The query currently returns user fields; extend it to include the doc flags. Replace the SELECT with:

```js
const { rows } = await pool.query(
  `SELECT id, username, display_name, email, role, client_id, client_role, must_change_password,
          docs_view, docs_edit, docs_create, docs_upload
     FROM users WHERE id = $1`,
  [req.user.id]
);
```

And whatever object is returned to the client, append:

```js
docs_view: rows[0].docs_view,
docs_edit: rows[0].docs_edit,
docs_create: rows[0].docs_create,
docs_upload: rows[0].docs_upload,
```

- [ ] **Step 2: Append a regression test**

```js
it('GET /api/auth/me returns doc permission flags', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.docs_view).toBe(true);
  expect(res.body.data.docs_edit).toBe(true);
});
```

- [ ] **Step 3: Run vitest**

Expected: still all green.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/documents.test.mjs
git commit -m "feat(docs): surface docs_* permission flags via /api/auth/me"
```

---

## Task 10: Frontend — TipTap loader

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add TipTap import shim near the top of the existing `<script>` block**

Search for `// ===== APP STATE =====` (or similar early-script-block marker). Above it, add:

```html
<script type="module" id="tiptapLoader">
// Lazy TipTap loader. The Documentation tab calls window.loadTiptap()
// which resolves once Editor + the extensions we use are ready.
// Imported from esm.sh so we can run dependency-free.
let _tiptapPromise = null;
window.loadTiptap = function() {
  if (_tiptapPromise) return _tiptapPromise;
  _tiptapPromise = (async () => {
    const [core, starter, underline, link, image, placeholder] = await Promise.all([
      import('https://esm.sh/@tiptap/core@2.5.9'),
      import('https://esm.sh/@tiptap/starter-kit@2.5.9'),
      import('https://esm.sh/@tiptap/extension-underline@2.5.9'),
      import('https://esm.sh/@tiptap/extension-link@2.5.9'),
      import('https://esm.sh/@tiptap/extension-image@2.5.9'),
      import('https://esm.sh/@tiptap/extension-placeholder@2.5.9'),
    ]);
    return {
      Editor: core.Editor,
      Node: core.Node,
      mergeAttributes: core.mergeAttributes,
      StarterKit: starter.default,
      Underline: underline.default,
      Link: link.default,
      Image: image.default,
      Placeholder: placeholder.default,
    };
  })();
  return _tiptapPromise;
};
</script>
```

- [ ] **Step 2: Verify it loads**

Open `http://localhost:8888/nbi_project_dashboard.html` in DevTools console. Run `await loadTiptap()`. Expected: returns an object with Editor, StarterKit, etc.

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(docs): TipTap ESM loader shim"
```

---

## Task 11: Frontend — sidebar item + view dispatcher

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add a `'documentation'` view to the dispatcher**

Find `else if (currentView === 'reporting') renderReportingView(content);` (recently added). Insert directly below it:

```js
  else if (currentView === 'documentation') renderDocumentationView(content);
```

- [ ] **Step 2: Add the sidebar item**

Find `html += sidebarItem(svgReport, 'Reporting', '', () => switchView('reporting'), currentView==='reporting');` and insert below it:

```js
  html += sidebarItem(svgReport, 'Documentation', '', () => switchView('documentation'), currentView==='documentation');
```

- [ ] **Step 3: Stub renderDocumentationView**

Append (near other render functions):

```js
let _docsState = { clientId: null, tree: [], selectedDocId: null, dirty: false, lastSavedAt: null };

async function renderDocumentationView(el) {
  el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted)">Loading documentation editor...</div>';
  await loadTiptap();
  // Picks default client if none selected. Lighthouse Games when present.
  if (!_docsState.clientId) {
    const candidate = Object.values(_apiClientsCache || {}).find(c => c && c.name === 'Lighthouse Games');
    _docsState.clientId = candidate ? candidate.id : (Object.values(_apiClientsCache || {})[0]?.id || null);
  }
  if (!_docsState.clientId) { el.innerHTML = '<div style="padding:32px;color:var(--text-muted)">No clients yet — create one in Settings → Users to get started.</div>'; return; }
  await _docsLoadTree();
  _docsRender(el);
}
```

- [ ] **Step 4: Verify the sidebar entry shows up**

Reload http://localhost:8888/nbi_project_dashboard.html. Click "Documentation". Expected: page changes URL to `#documentation` and shows the loading spinner. (No editor yet — that's Task 13.)

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(docs): sidebar Documentation item + view dispatcher stub"
```

---

## Task 12: Frontend — `_docsLoadTree` and tree render

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Implement the tree loader + renderer**

Append to the same script block:

```js
async function _docsLoadTree() {
  if (!_docsState.clientId) return;
  const data = await apiCall('/api/documents?client_id=' + encodeURIComponent(_docsState.clientId));
  _docsState.tree = data || [];
  // Auto-select first page if none selected (or selected page disappeared)
  if (!_docsState.selectedDocId || !_docsState.tree.find(d => d.id === _docsState.selectedDocId)) {
    _docsState.selectedDocId = _docsState.tree[0]?.id || null;
  }
}

/** Render the docs view shell: client picker (top), tree (left), editor (right). */
function _docsRender(el) {
  const clients = Object.values(_apiClientsCache || {}).filter(c => c && c.id && c.name).sort((a,b) => a.name.localeCompare(b.name));
  const tree = _docsBuildTree(_docsState.tree);
  let html = '<div class="docs">';
  html += '<div class="docs__hdr">';
  html += '<div class="docs__hdr-title">Documentation</div>';
  html += '<select class="docs__client-select" onchange="_actDocsSelectClient(this.value)">';
  clients.forEach(c => { html += `<option value="${esc(c.id)}" ${c.id === _docsState.clientId ? 'selected' : ''}>${esc(c.name)}</option>`; });
  html += '</select>';
  html += '<div class="docs__hdr-status" id="docsSavedIndicator">' + _docsSavedLabel() + '</div>';
  html += '</div>';

  html += '<div class="docs__split">';
  html += '<div class="docs__tree">';
  html += `<button class="docs__add-root" onclick="_actDocsAddPage(null)">+ New page</button>`;
  html += _docsRenderTreeNodes(tree, 0);
  html += '</div>';
  html += '<div class="docs__pane" id="docsEditorPane"></div>';
  html += '</div>';
  html += '</div>';
  el.innerHTML = html;
  _docsRenderEditorPane();
}

function _docsBuildTree(flat) {
  const byParent = {};
  flat.forEach(d => { (byParent[d.parent_id || '_root'] = byParent[d.parent_id || '_root'] || []).push(d); });
  Object.values(byParent).forEach(arr => arr.sort((a,b) => (a.sort_order - b.sort_order) || a.title.localeCompare(b.title)));
  function build(parentId) {
    return (byParent[parentId || '_root'] || []).map(d => ({ ...d, children: build(d.id) }));
  }
  return build(null);
}

function _docsRenderTreeNodes(nodes, depth) {
  if (nodes.length === 0) return '<div class="docs__tree-empty">No pages yet</div>';
  let html = '<ul class="docs__tree-list">';
  nodes.forEach(n => {
    const sel = n.id === _docsState.selectedDocId;
    const lock = n.visibility === 'nbi_only' ? '<span class="docs__tree-lock" title="NBI internal only">🔒</span>' : '';
    html += `<li class="docs__tree-li ${sel ? 'docs__tree-li--selected' : ''}" style="padding-left:${depth * 12}px">`;
    html += `<button class="docs__tree-row" onclick="_actDocsSelectPage('${escAttrJs(n.id)}')">${lock}<span>${esc(n.title)}</span></button>`;
    html += `<button class="docs__tree-add" title="Add child page" onclick="event.stopPropagation();_actDocsAddPage('${escAttrJs(n.id)}')">+</button>`;
    html += `</li>`;
    if (n.children.length) html += _docsRenderTreeNodes(n.children, depth + 1);
  });
  html += '</ul>';
  return html;
}

function _docsSavedLabel() {
  if (_docsState.dirty) return '<span style="color:var(--warning)">Saving...</span>';
  if (_docsState.lastSavedAt) {
    const secs = Math.round((Date.now() - _docsState.lastSavedAt) / 1000);
    return `<span style="color:var(--text-muted)">Saved ${secs}s ago</span>`;
  }
  return '';
}

async function _actDocsSelectClient(id) { _docsState.clientId = id; _docsState.selectedDocId = null; await _docsLoadTree(); renderContent(); }
async function _actDocsSelectPage(id) { _docsState.selectedDocId = id; renderContent(); }
async function _actDocsAddPage(parentId) {
  const data = await apiCall('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: _docsState.clientId, parent_id: parentId, title: 'Untitled' })
  });
  if (data?.id) { _docsState.selectedDocId = data.id; await _docsLoadTree(); renderContent(); }
}
```

- [ ] **Step 2: Stub the editor pane (filled in Task 13)**

```js
function _docsRenderEditorPane() {
  const el = document.getElementById('docsEditorPane');
  if (!el) return;
  if (!_docsState.selectedDocId) {
    el.innerHTML = '<div class="docs__pane-empty">Pick a page from the tree on the left, or click <strong>+ New page</strong> to start.</div>';
    return;
  }
  el.innerHTML = '<div class="docs__pane-empty">Editor coming in next task.</div>';
}
```

- [ ] **Step 3: Add the docs CSS**

Find the `.reporting {` block (added recently). Insert below it:

```css
/* ============ DOCUMENTATION TAB ============ */
.docs { display: flex; flex-direction: column; height: calc(100vh - 60px); }
.docs__hdr { display: flex; align-items: center; gap: 12px; padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border-subtle); }
.docs__hdr-title { font-size: 1.05rem; font-weight: 700; letter-spacing: 0.04em; color: var(--text-primary); }
.docs__client-select { padding: 4px 10px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.82rem; min-width: 200px; }
.docs__hdr-status { margin-left: auto; font-size: 0.74rem; }
.docs__split { display: flex; flex: 1; min-height: 0; }
.docs__tree { width: 280px; flex-shrink: 0; overflow-y: auto; border-right: 1px solid var(--border-subtle); padding: var(--space-sm); }
.docs__tree-list { list-style: none; margin: 0; padding: 0; }
.docs__tree-li { display: flex; align-items: center; gap: 4px; }
.docs__tree-row { flex: 1; background: none; border: none; color: var(--text-primary); padding: 4px 8px; text-align: left; font-size: 0.82rem; cursor: pointer; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.docs__tree-row:hover { background: var(--bg-hover); }
.docs__tree-li--selected .docs__tree-row { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent-text); }
.docs__tree-add { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0 6px; font-size: 0.9rem; opacity: 0; transition: opacity 0.12s; }
.docs__tree-li:hover .docs__tree-add { opacity: 1; }
.docs__tree-add:hover { color: var(--accent-text); }
.docs__tree-lock { font-size: 0.7rem; }
.docs__tree-empty { padding: 16px 8px; color: var(--text-muted); font-size: 0.78rem; }
.docs__add-root { width: 100%; padding: 6px 10px; background: var(--bg-input); border: 1px dashed var(--border-default); border-radius: var(--radius-md); color: var(--text-secondary); cursor: pointer; font-size: 0.78rem; margin-bottom: 8px; }
.docs__add-root:hover { background: var(--bg-hover); color: var(--text-primary); }
.docs__pane { flex: 1; overflow-y: auto; padding: var(--space-lg) var(--space-xl); min-width: 0; }
.docs__pane-empty { color: var(--text-muted); font-size: 0.92rem; padding: 60px 0; text-align: center; }
```

- [ ] **Step 4: Verify**

Refresh and click Documentation. You should see a Lighthouse Games tree with no pages, the "+ New page" button at the top of the tree, and the "Pick a page..." stub in the right pane. Click "+ New page" — a new page appears, gets selected, and the editor pane shows the next-task stub.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(docs): tree loader + render + add-page action"
```

---

## Task 13: Frontend — TipTap editor pane (the rich one)

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Replace `_docsRenderEditorPane` with the real implementation**

```js
let _docsTiptapEditor = null;
let _docsAutosaveTimer = null;
let _docsSavedTimer = null;

async function _docsRenderEditorPane() {
  const el = document.getElementById('docsEditorPane');
  if (!el) return;
  if (!_docsState.selectedDocId) {
    el.innerHTML = '<div class="docs__pane-empty">Pick a page from the tree on the left, or click <strong>+ New page</strong> to start.</div>';
    return;
  }
  // Tear down any previous editor
  if (_docsTiptapEditor) { _docsTiptapEditor.destroy(); _docsTiptapEditor = null; }

  // Fetch full doc body
  const doc = await apiCall('/api/documents/' + encodeURIComponent(_docsState.selectedDocId));
  if (!doc) { el.innerHTML = '<div class="docs__pane-empty">Could not load page.</div>'; return; }

  // Build the pane: title input, toolbar, editor mount point
  const visBadge = doc.visibility === 'nbi_only' ? '<span class="docs__vis-badge" title="NBI staff only">🔒 NBI ONLY</span>' : '';
  el.innerHTML = `
    <div class="docs__title-row">
      <input class="docs__title" value="${esc(doc.title)}" oninput="_actDocsTitleInput(this.value)">
      ${visBadge}
      <button class="docs__vis-toggle" onclick="_actDocsToggleVis()">${doc.visibility === 'nbi_only' ? 'Make visible to client' : 'Mark as NBI only'}</button>
      <button class="docs__del-btn" onclick="_actDocsDelete()">Delete</button>
    </div>
    <div class="docs__toolbar" id="docsToolbar"></div>
    <div class="docs__editor" id="docsEditor"></div>
  `;

  const T = await loadTiptap();

  // Custom node: nbiInternalBlock — coloured panel, "NBI ONLY" ribbon
  const NbiInternalBlock = T.Node.create({
    name: 'nbiInternalBlock',
    group: 'block',
    content: 'block+',
    defining: true,
    parseHTML() { return [{ tag: 'div[data-nbi-internal="true"]' }]; },
    renderHTML({ HTMLAttributes }) {
      return ['div', T.mergeAttributes(HTMLAttributes, { 'data-nbi-internal': 'true', 'class': 'docs-nbi-block' }), 0];
    },
    addCommands() {
      return {
        toggleNbiInternal: () => ({ commands, state }) => {
          const { from, to } = state.selection;
          if (from === to) return commands.wrapIn('nbiInternalBlock');
          return commands.wrapIn('nbiInternalBlock');
        },
      };
    },
  });

  _docsTiptapEditor = new T.Editor({
    element: document.getElementById('docsEditor'),
    extensions: [
      T.StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      T.Underline,
      T.Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      T.Image.configure({ inline: false }),
      T.Placeholder.configure({ placeholder: 'Type your notes here...' }),
      NbiInternalBlock,
    ],
    content: doc.body_json || { type: 'doc', content: [] },
    onUpdate: () => { _docsState.dirty = true; _docsScheduleSave(); _docsUpdateSavedIndicator(); },
  });

  _docsRenderToolbar();
}

function _docsRenderToolbar() {
  const el = document.getElementById('docsToolbar');
  if (!el || !_docsTiptapEditor) return;
  const E = _docsTiptapEditor;
  const btn = (label, action, isActiveFn) => {
    const active = isActiveFn ? isActiveFn() : false;
    return `<button class="docs__tb-btn ${active ? 'docs__tb-btn--active' : ''}" onclick="${action}">${label}</button>`;
  };
  el.innerHTML = [
    btn('<b>B</b>', '_docsTb(\'bold\')', () => E.isActive('bold')),
    btn('<i>I</i>', '_docsTb(\'italic\')', () => E.isActive('italic')),
    btn('<u>U</u>', '_docsTb(\'underline\')', () => E.isActive('underline')),
    btn('<s>S</s>', '_docsTb(\'strike\')', () => E.isActive('strike')),
    `<span class="docs__tb-sep"></span>`,
    btn('H1', '_docsTb(\'h1\')', () => E.isActive('heading', { level: 1 })),
    btn('H2', '_docsTb(\'h2\')', () => E.isActive('heading', { level: 2 })),
    btn('H3', '_docsTb(\'h3\')', () => E.isActive('heading', { level: 3 })),
    btn('• List', '_docsTb(\'ul\')', () => E.isActive('bulletList')),
    btn('1. List', '_docsTb(\'ol\')', () => E.isActive('orderedList')),
    btn('"', '_docsTb(\'blockquote\')', () => E.isActive('blockquote')),
    btn('</>', '_docsTb(\'code\')', () => E.isActive('code')),
    `<span class="docs__tb-sep"></span>`,
    btn('🔗 Link', '_docsTb(\'link\')'),
    btn('🖼 Image', '_docsTb(\'image\')'),
    `<span class="docs__tb-sep"></span>`,
    btn('🔒 NBI', '_docsTb(\'nbi\')', () => E.isActive('nbiInternalBlock')),
  ].join('');
}

function _docsTb(name) {
  const E = _docsTiptapEditor; if (!E) return;
  const c = E.chain().focus();
  switch (name) {
    case 'bold': c.toggleBold().run(); break;
    case 'italic': c.toggleItalic().run(); break;
    case 'underline': c.toggleUnderline().run(); break;
    case 'strike': c.toggleStrike().run(); break;
    case 'h1': c.toggleHeading({ level: 1 }).run(); break;
    case 'h2': c.toggleHeading({ level: 2 }).run(); break;
    case 'h3': c.toggleHeading({ level: 3 }).run(); break;
    case 'ul': c.toggleBulletList().run(); break;
    case 'ol': c.toggleOrderedList().run(); break;
    case 'blockquote': c.toggleBlockquote().run(); break;
    case 'code': c.toggleCode().run(); break;
    case 'link': {
      const prev = E.getAttributes('link').href || '';
      const url = prompt('Link URL', prev || 'https://');
      if (url === null) return;
      if (url === '') c.unsetLink().run();
      else c.extendMarkRange('link').setLink({ href: url }).run();
      break;
    }
    case 'image': _docsInsertImage(); break;
    case 'nbi': c.toggleNbiInternal().run(); break;
  }
  _docsRenderToolbar();
}

async function _docsInsertImage() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/gif,image/webp';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f);
    const resp = await authFetch(`/api/documents/${_docsState.selectedDocId}/attachments`, { method: 'POST', body: fd });
    if (!resp.ok) { toast('Image upload failed', 'error'); return; }
    const data = await resp.json();
    const url = (data?.data?.url) || data?.url;
    if (url) _docsTiptapEditor.chain().focus().setImage({ src: url, alt: f.name }).run();
  };
  inp.click();
}

function _docsScheduleSave() {
  clearTimeout(_docsAutosaveTimer);
  _docsAutosaveTimer = setTimeout(_docsSaveNow, 800);
}

async function _docsSaveNow() {
  if (!_docsTiptapEditor || !_docsState.selectedDocId) return;
  const body = _docsTiptapEditor.getJSON();
  await apiCall('/api/documents/' + encodeURIComponent(_docsState.selectedDocId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body_json: body }),
  });
  _docsState.dirty = false;
  _docsState.lastSavedAt = Date.now();
  _docsUpdateSavedIndicator();
}

function _docsUpdateSavedIndicator() {
  const el = document.getElementById('docsSavedIndicator');
  if (el) el.innerHTML = _docsSavedLabel();
  clearTimeout(_docsSavedTimer);
  _docsSavedTimer = setTimeout(_docsUpdateSavedIndicator, 1000);
}

async function _actDocsTitleInput(value) {
  // Title autosaves on blur (cheap field, no need to debounce as fast as body)
  clearTimeout(_docsAutosaveTimer);
  _docsAutosaveTimer = setTimeout(async () => {
    await apiCall('/api/documents/' + encodeURIComponent(_docsState.selectedDocId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: value }),
    });
    await _docsLoadTree();
    // Re-render only the tree column to avoid blowing away the editor
    const el = document.querySelector('.docs__tree');
    if (el) el.outerHTML = (function(){ const tree = _docsBuildTree(_docsState.tree); return `<div class="docs__tree"><button class="docs__add-root" onclick="_actDocsAddPage(null)">+ New page</button>${_docsRenderTreeNodes(tree, 0)}</div>`; })();
  }, 600);
}

async function _actDocsToggleVis() {
  const doc = _docsState.tree.find(d => d.id === _docsState.selectedDocId);
  if (!doc) return;
  await apiCall('/api/documents/' + encodeURIComponent(doc.id), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visibility: doc.visibility === 'nbi_only' ? 'all' : 'nbi_only' }),
  });
  await _docsLoadTree(); renderContent();
}

async function _actDocsDelete() {
  if (!confirm('Delete this page and all its sub-pages?')) return;
  await authFetch('/api/documents/' + encodeURIComponent(_docsState.selectedDocId), { method: 'DELETE' });
  _docsState.selectedDocId = null;
  await _docsLoadTree(); renderContent();
}
```

- [ ] **Step 2: Add the editor + toolbar CSS**

Append to the docs CSS block:

```css
.docs__title-row { display: flex; align-items: center; gap: 12px; margin-bottom: var(--space-md); }
.docs__title { flex: 1; font-size: 1.6rem; font-weight: 700; background: transparent; border: none; color: var(--text-primary); padding: 4px 0; }
.docs__title:focus { outline: none; border-bottom: 1px solid var(--accent); }
.docs__vis-badge { background: color-mix(in srgb, var(--purple) 18%, transparent); color: var(--purple); padding: 3px 8px; border-radius: 10px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em; }
.docs__vis-toggle, .docs__del-btn { padding: 4px 10px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 0.74rem; cursor: pointer; }
.docs__vis-toggle:hover { color: var(--accent-text); }
.docs__del-btn:hover { color: var(--danger); border-color: var(--danger); }
.docs__toolbar { display: flex; gap: 4px; padding: 6px 8px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-md); margin-bottom: 12px; flex-wrap: wrap; align-items: center; position: sticky; top: 0; z-index: 5; }
.docs__tb-btn { background: transparent; border: 1px solid transparent; color: var(--text-secondary); padding: 3px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.78rem; }
.docs__tb-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.docs__tb-btn--active { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent-text); border-color: var(--accent-border); }
.docs__tb-sep { width: 1px; height: 18px; background: var(--border-subtle); margin: 0 4px; }
.docs__editor { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: var(--space-md) var(--space-lg); min-height: 400px; }
.docs__editor .ProseMirror { outline: none; min-height: 380px; color: var(--text-primary); line-height: 1.6; font-size: 0.92rem; }
.docs__editor .ProseMirror p { margin: 0.6em 0; }
.docs__editor .ProseMirror h1 { font-size: 1.6rem; margin-top: 0.8em; }
.docs__editor .ProseMirror h2 { font-size: 1.3rem; margin-top: 0.7em; }
.docs__editor .ProseMirror h3 { font-size: 1.05rem; margin-top: 0.6em; }
.docs__editor .ProseMirror ul, .docs__editor .ProseMirror ol { padding-left: 1.4em; }
.docs__editor .ProseMirror blockquote { border-left: 3px solid var(--accent-border); padding-left: 12px; color: var(--text-secondary); margin: 0.6em 0; }
.docs__editor .ProseMirror code { background: var(--bg-input); padding: 1px 4px; border-radius: 3px; font-size: 0.86em; }
.docs__editor .ProseMirror img { max-width: 100%; height: auto; border-radius: 6px; border: 1px solid var(--border-subtle); display: block; margin: 0.4em 0; }
.docs__editor .ProseMirror a { color: var(--accent-text); text-decoration: underline; }
.docs__editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: var(--text-muted); pointer-events: none; height: 0; }
/* NBI internal block — coloured panel for NBI users (client users never receive this content). */
.docs__editor .docs-nbi-block { background: color-mix(in srgb, var(--purple) 8%, transparent); border-left: 3px solid var(--purple); padding: 10px 14px; margin: 0.6em 0; border-radius: 0 6px 6px 0; position: relative; }
.docs__editor .docs-nbi-block::before { content: '🔒 NBI ONLY'; position: absolute; top: -10px; left: 8px; background: var(--purple); color: #fff; font-size: 0.58rem; font-weight: 700; padding: 2px 8px; border-radius: 8px; letter-spacing: 0.06em; }
```

- [ ] **Step 3: Verify in browser**

Refresh, go to Documentation. Pick a page (or add one). Type some text. Click Bold, Italic, Underline. Click "+ Image" and upload a small PNG — it should embed. Click 🔒 NBI — selected text wraps in a purple-bordered panel. Wait 1-2s — "Saved Ns ago" should update.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(docs): TipTap editor pane with toolbar, NBI-block node, autosave, image upload"
```

---

## Task 14: Frontend — Slack permalink smart card

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add a Link transform that detects Slack URLs**

In the editor extension list (Task 13), wrap `T.Link` in a paste handler that detects Slack permalinks and inserts a custom `slackCard` node instead:

```js
const SlackCard = T.Node.create({
  name: 'slackCard',
  group: 'block',
  atom: true,
  addAttributes() { return { url: { default: '' }, channel: { default: '' }, msgId: { default: '' } }; },
  parseHTML() { return [{ tag: 'div[data-slack-card]' }]; },
  renderHTML({ HTMLAttributes }) {
    const { url, channel, msgId } = HTMLAttributes;
    return ['div', T.mergeAttributes(HTMLAttributes, { 'data-slack-card': 'true', 'class': 'docs-slack-card' }),
      ['div', { class: 'docs-slack-card__head' }, '#' + (channel || 'slack')],
      ['div', { class: 'docs-slack-card__body' }, msgId ? `Message ${msgId}` : 'Open in Slack'],
      ['a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'docs-slack-card__btn' }, 'Open ↗']
    ];
  },
});

// Add SlackCard to the extensions array passed to new T.Editor(...)
```

And register a paste rule that converts pasted Slack URLs:

```js
_docsTiptapEditor.view.dom.addEventListener('paste', (e) => {
  const text = (e.clipboardData || window.clipboardData).getData('text');
  const m = text && text.match(/^https?:\/\/([\w-]+)\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)$/);
  if (m) {
    e.preventDefault();
    const channel = m[2];
    const msgId = m[3];
    _docsTiptapEditor.chain().focus().insertContent({
      type: 'slackCard',
      attrs: { url: text, channel, msgId },
    }).run();
  }
}, true);
```

- [ ] **Step 2: Add Slack card CSS**

```css
.docs-slack-card { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: color-mix(in srgb, #4A154B 10%, transparent); border: 1px solid color-mix(in srgb, #4A154B 35%, var(--border-default)); border-radius: var(--radius-md); margin: 0.5em 0; }
.docs-slack-card__head { font-weight: 700; color: #4A154B; font-size: 0.82rem; }
.docs-slack-card__body { flex: 1; color: var(--text-secondary); font-size: 0.78rem; }
.docs-slack-card__btn { background: #4A154B; color: #fff; padding: 4px 10px; border-radius: var(--radius-sm); text-decoration: none; font-size: 0.74rem; font-weight: 600; }
```

- [ ] **Step 3: Verify**

In a doc editor, paste a Slack URL like `https://foo.slack.com/archives/C123/p1234567890`. A purple Slack card should appear instead of the raw link.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(docs): Slack permalink smart card via TipTap custom node"
```

---

## Task 15: Frontend — contextual links (Gantt + Portfolio)

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Gantt client header — add Docs link beside the depth buttons**

Find the section in `renderGanttView` where `depthBtns` is built (the const declared with the P/F/S/T `<button>`s). Append a docs link inside the same span:

```js
const depthBtns = `<span style="display:inline-flex;gap:2px;margin-left:6px;vertical-align:middle;flex-shrink:0">
  <button class="gantt__depth-btn" data-stop onclick="event.stopPropagation();_actGanttClientDepth('${cAttr}',0)" title="Show projects only">P</button>
  <button class="gantt__depth-btn" data-stop onclick="event.stopPropagation();_actGanttClientDepth('${cAttr}',1)" title="Show through features">F</button>
  <button class="gantt__depth-btn" data-stop onclick="event.stopPropagation();_actGanttClientDepth('${cAttr}',2)" title="Show through stories">S</button>
  <button class="gantt__depth-btn" data-stop onclick="event.stopPropagation();_actGanttClientDepth('${cAttr}',9)" title="Expand everything down to tasks">T</button>
  <span class="gantt__divider"></span>
  <button class="gantt__depth-btn gantt__depth-btn--docs" data-stop onclick="event.stopPropagation();_actDocsOpenForClient('${cAttr}')" title="Open documentation for this client">📄 Docs</button>
</span>`;
```

Then add the action:

```js
function _actDocsOpenForClient(clientName) {
  const c = Object.values(_apiClientsCache || {}).find(x => x && x.name === clientName);
  if (!c) return;
  _docsState.clientId = c.id;
  _docsState.selectedDocId = null;
  switchView('documentation');
}
```

And the divider CSS:

```css
.gantt__divider { width: 1px; height: 14px; background: var(--border-subtle); margin: 0 2px; align-self: center; }
.gantt__depth-btn--docs { background: color-mix(in srgb, var(--accent) 8%, transparent); border-color: var(--accent-border); color: var(--accent-text); }
.gantt__depth-btn--docs:hover { background: color-mix(in srgb, var(--accent) 16%, transparent); }
```

- [ ] **Step 2: Portfolio per-client — add a Docs button on each `pf__client` card**

Find `renderPfSidebar` (around line 4833-ish). At the end of each client-card render block, add:

```js
html += `<button class="pf__client-docs" onclick="event.stopPropagation();_actDocsOpenForClient('${escAttrJs(clientName)}')" title="Open documentation">📄 Docs</button>`;
```

CSS:
```css
.pf__client-docs { display: block; margin-top: 6px; width: 100%; padding: 3px 8px; background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 0.66rem; cursor: pointer; }
.pf__client-docs:hover { color: var(--accent-text); border-color: var(--accent-border); }
```

- [ ] **Step 3: Verify**

Refresh. On Gantt, each client header should have a "📄 Docs" button after T. Click → routes to Documentation tab with that client selected. On Portfolio sidebar, each client card has a "📄 Docs" button at the bottom.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(docs): contextual Docs links on Gantt + Portfolio client headers"
```

---

## Task 16: Frontend — Settings UI for per-user doc perms

**Files:**
- Modify: `nbi_project_dashboard.html` (find the existing user-management UI)

- [ ] **Step 1: Locate the user-edit modal**

Search for `// Render the user edit modal` or the UI that calls `PATCH /api/users/:id`. It's where Glen edits an individual user.

- [ ] **Step 2: Add four checkbox rows**

Inside the user-edit form, after the existing role / permissions rows, add:

```js
html += `<div class="user-edit__section"><div class="user-edit__section-title">Documentation</div>`;
html += `<label class="user-edit__cb"><input type="checkbox" ${user.docs_view ? 'checked' : ''} onchange="_actUserDocPerm('${user.id}','docs_view',this.checked)"> Can view documentation</label>`;
html += `<label class="user-edit__cb"><input type="checkbox" ${user.docs_edit ? 'checked' : ''} onchange="_actUserDocPerm('${user.id}','docs_edit',this.checked)"> Can edit pages</label>`;
html += `<label class="user-edit__cb"><input type="checkbox" ${user.docs_create ? 'checked' : ''} onchange="_actUserDocPerm('${user.id}','docs_create',this.checked)"> Can create pages</label>`;
html += `<label class="user-edit__cb"><input type="checkbox" ${user.docs_upload ? 'checked' : ''} onchange="_actUserDocPerm('${user.id}','docs_upload',this.checked)"> Can upload images</label>`;
html += `</div>`;

// Action:
async function _actUserDocPerm(userId, field, value) {
  await apiCall('/api/users/' + encodeURIComponent(userId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value })
  });
}
```

- [ ] **Step 3: Update the server-side users PATCH whitelist**

In `server.js`, find the `app.patch('/api/users/:id'` handler and add `docs_view`, `docs_edit`, `docs_create`, `docs_upload` to its allowed-fields array.

- [ ] **Step 4: Verify**

Open Settings → Users → edit a client portal user → Documentation section shows four checkboxes. Toggle one. Refresh. Confirm the new value persisted.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html dashboard-server/server.js
git commit -m "feat(docs): per-user doc-permission checkboxes in user editor"
```

---

## Task 17: Server — bulk seed of starter pages on first open

**Files:**
- Modify: `dashboard-server/server.js`
- Modify: `dashboard-server/tests/unit/documents.test.mjs`

- [ ] **Step 1: Append a failing test**

```js
describe('Documents — first-open seed', () => {
  it('GET /api/documents?client_id=... seeds 6 default pages on first call', async () => {
    const u = await createTestUser({ role: 'admin' });
    const t = await mintSession(u.id);
    const c = await createTestClient({ name: 'Fresh Client', sector: 'gaming' });
    const res = await request(app)
      .get(`/api/documents?client_id=${c.id}`)
      .set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    const titles = res.body.data.map(d => d.title);
    expect(titles).toEqual(expect.arrayContaining(['Overview','Contacts','Risks','Decisions','Architecture','Notes']));
    expect(res.body.data.length).toBe(6);
  });

  it('Subsequent calls do not re-seed', async () => {
    const u = await createTestUser({ role: 'admin' });
    const t = await mintSession(u.id);
    const c = await createTestClient({ name: 'Fresh Client 2', sector: 'gaming' });
    await request(app).get(`/api/documents?client_id=${c.id}`).set('Authorization', `Bearer ${t}`);
    const res = await request(app).get(`/api/documents?client_id=${c.id}`).set('Authorization', `Bearer ${t}`);
    expect(res.body.data.length).toBe(6);
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs -t first-open`
Expected: 2 fail (length 0 / arrays don't contain expected titles).

- [ ] **Step 3: Add the seed in the GET handler**

In `app.get('/api/documents', ...)` (Task 6), after computing the visibility clause but BEFORE the SELECT query, add:

```js
// Seed defaults for NBI users on first open
if (!isClientUser) {
  const existing = await pool.query('SELECT 1 FROM documents WHERE client_id = $1 LIMIT 1', [clientId]);
  if (existing.rowCount === 0) {
    const defaults = ['Overview','Contacts','Risks','Decisions','Architecture','Notes'];
    for (let i = 0; i < defaults.length; i++) {
      await pool.query(
        `INSERT INTO documents (client_id, title, sort_order, created_by, updated_by) VALUES ($1,$2,$3,$4,$4)`,
        [clientId, defaults[i], i, req.user.username || 'system']
      );
    }
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `cd dashboard-server && npx vitest run tests/unit/documents.test.mjs`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/documents.test.mjs
git commit -m "feat(docs): seed 6 default pages on first GET for a client"
```

---

## Task 18: Playwright e2e — full editor smoke test

**Files:**
- Create: `dashboard-server/tests/e2e/documents.spec.js`

- [ ] **Step 1: Write the spec**

```js
const { test, expect } = require('@playwright/test');

test.describe('Documentation tab', () => {
  test('admin can create, type, bold, image-upload, NBI-mark, save', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/nbi_project_dashboard.html#documentation`);
    // Adjust auth steps to match the test fixture's login flow
    await page.evaluate(() => { document.cookie = 'nbi_session=test_admin_token; path=/'; });
    await page.reload();
    await page.click('text=Documentation');
    await page.click('text=+ New page');
    const titleInput = page.locator('.docs__title');
    await titleInput.fill('e2e test page');
    await page.click('.ProseMirror');
    await page.keyboard.type('Hello world');
    await page.click('.docs__tb-btn:has-text("B")');
    await page.keyboard.type(' bolded');
    // Save indicator
    await expect(page.locator('#docsSavedIndicator')).toContainText('Saved', { timeout: 5000 });
    // NBI block
    await page.click('.ProseMirror');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.click('.docs__tb-btn:has-text("NBI")');
    await page.keyboard.type('secret');
    await expect(page.locator('.docs-nbi-block')).toContainText('secret');
  });
});
```

- [ ] **Step 2: Run e2e**

Run: `npm run test:e2e -- documents.spec.js`
Expected: 1 passed (or fix the fixture login if it needs adjustment).

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/e2e/documents.spec.js
git commit -m "test(docs): playwright e2e for the editor + NBI block flow"
```

---

## Task 19: Final pass — restart prod + handoff entry

**Files:**
- Modify: `projects/nbi_dashboard/live_state/work_completed.md`

- [ ] **Step 1: Run the full test suite**

Run: `cd dashboard-server && npm test`
Expected: all green (existing 226 + new doc tests).

- [ ] **Step 2: Restart prod**

Run: `pm2 restart nbi-dashboard`
Then: `curl -s https://worksage.nbi-consulting.com/api/health` → `{"status":"ok",...}`

- [ ] **Step 3: Add an entry to live_state/work_completed.md**

```markdown
## 2026-05-02 (Documentation tab v1)

198. **Documentation tab shipped.** New sidebar item + contextual links on Gantt + Portfolio. Per-client tree of rich-text pages built with TipTap (loaded via ESM from a CDN, zero build step). Server-side enforced page-level visibility (`all` / `nbi_only`) AND block-level redaction via a custom `nbiInternalBlock` node — redacted content never leaves the server. Per-user permissions (`docs_view`, `docs_edit`, `docs_create`, `docs_upload`) configurable in Settings → Users; new client portal users default to read-only until an NBI admin opens it up. Image upload (5 MB cap, jpg/png/gif/webp) embeds inline. Slack permalink paste auto-converts to a styled card. Six default pages (Overview / Contacts / Risks / Decisions / Architecture / Notes) seed on first open per client. Migrations 033 (documents), 034 (document_attachments), 035 (perms). Vitest + Playwright cover.
```

- [ ] **Step 4: Commit**

```bash
git add projects/nbi_dashboard/live_state/work_completed.md
git commit -m "docs(docs-tab): live state entry for Documentation v1"
```

---

## Self-review

**Spec coverage:** Every requirement Glen settled in the brainstorm has a task that implements it (Tasks 1-19 cover audience, editor, redaction, perms, Slack, image upload, entry points, seeding, tests, deploy).

**Placeholder scan:** No "TBD" / "implement later" / "similar to Task N". Each step shows the exact code or command.

**Type consistency:** `_docsState` shape, `nbiInternalBlock` node name, `docs_view`/`docs_edit`/`docs_create`/`docs_upload` field names are consistent across migration, server, and frontend.

**Risks called out in the plan body:** TipTap CDN load (~200 KB first paint, cached after); ProseMirror JSON storage means `psql` grep needs server-side rendering; live Slack thread is v2; concurrent editing not handled (last-write-wins).

---

Plan complete and saved to `docs/superpowers/plans/2026-05-02-documentation-tab.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

---

# Part 2 — Architectural decisions and risk mitigations

This section addresses every risk flagged above with a concrete approach rather than a hand-wave. Each subsection ends with the tasks (Part 3) it adds or modifies.

## A. TipTap distribution: pin, integrity, fallback

**Problem.** `import('https://esm.sh/@tiptap/core@2.5.9')` is a CDN call on first paint. Three failure modes: esm.sh down, version drift on the upstream package, supply-chain compromise (silent script swap).

**Decisions:**

1. **Pin major.minor.patch** for every TipTap module. Never use `@latest` or `@^2`. Versions are listed in one place — a `TIPTAP_VERSIONS` constant — so bumps are a single edit.
2. **Self-host the bundles** under `dashboard-server/public/vendor/tiptap/` as a fallback. The loader tries esm.sh first (faster cold start, edge-cached); if that fails or takes >1500ms, it falls back to the local copy. Local copy is checked into git (~250KB after gzip — acceptable for a one-time addition).
3. **Subresource integrity (SRI) hashes** computed once, stored alongside `TIPTAP_VERSIONS`. Any drift on esm.sh is rejected by the browser; we fall back to the local copy.
4. **Lazy load** — TipTap modules are not requested until the user navigates to the Documentation tab. The loader is a window-level promise; first navigation triggers it, subsequent navigations are instant.
5. **Loading state** — while in-flight, the editor pane shows a real skeleton (title bar shape + toolbar shape + 4 fake paragraph lines) rather than a "Loading..." string. Glen 2026-05-02: skeletons not text spinners.

**Affects:** Task 10 (loader) gets rewritten. **New Task A1** (vendor self-host + SRI generation script).

## B. Search across docs — extract plain text on every save

**Problem.** Body is JSON. `psql -c "SELECT ... WHERE body_json ILIKE '%foo%'"` works against the JSON serialisation but matches `"text"` keys + node names too. Useless.

**Decision.** Maintain a **`body_text` column** on `documents` that holds the plain-text extraction of `body_json`. Updated by a tiny extractor (`extractText(node)` walks the ProseMirror tree, joins all `text` content, returns string). Trigger or application-level — application-level keeps it visible and testable.

```sql
ALTER TABLE documents ADD COLUMN body_text text NOT NULL DEFAULT '';
CREATE INDEX idx_documents_body_text_trgm ON documents USING gin (body_text gin_trgm_ops);
```

Plus enable `pg_trgm` extension if not already. `body_text` is recomputed on every PATCH that changes `body_json` (server-side, in the same transaction). Search becomes `SELECT id, title FROM documents WHERE body_text % $1 OR title % $1`.

**Server-side redaction implication.** The plain-text extraction excludes `nbiInternalBlock` content too — extractor uses the same recursive walker as the redactor (in fact, same helper, parameterised). So a client user search will never surface NBI-only text.

**Affects:** Migration 033 gains the column. The redaction helper module also exports `extractPlainText(node, { dropNbiInternal: bool })`. **New Task B1** (extractor + tests + integration into PATCH).

## C. Slack v2 architecture sketch — so v1 doesn't paint into a corner

**Problem.** "Tier 1 link cards now, live thread fetch in v2" is fine, but only if the v1 schema supports tier 2 without a destructive migration.

**Decisions:**

1. **`slackCard` node attributes already cover v2.** v1 stores `{ url, channel, msgId }`. v2 adds optional `cachedTitle`, `cachedAuthor`, `cachedAvatarUrl`, `cachedFetchedAt` — additive on the JSON node, no schema migration.
2. **A new `slack_workspaces` table** in the **v2** plan (not built in v1) will hold the OAuth token per Slack workspace + the bot user id. Rows keyed by workspace_id. Each `documents.client_id` can have an associated workspace_id (a single Slack workspace per client makes sense — Couch Heroes has their workspace, Lighthouse has theirs).
3. **Endpoint contract for v2** is decided now: `GET /api/slack/preview?url=...` — server resolves the workspace from the URL host, looks up the token, calls Slack's `conversations.history` with the message ID, caches result for 1 hour. Client never sees the token.
4. **v1 link card UI doesn't change** when v2 lands — the card just gets a richer body when cached fields exist, same DOM otherwise.

**Affects:** No v1 task changes. Documents this in the spec so v2 work doesn't surprise.

## D. Concurrent edit conflict — `If-Match` + 409 + diff prompt

**Problem.** Two NBI users edit the same page. Last save wins, first user's changes silently lost.

**Decision.** Introduce optimistic concurrency on `documents.updated_at`:

1. **GET /api/documents/:id returns `ETag: "<updated_at_ms>"` header.**
2. **PATCH /api/documents/:id requires `If-Match` header** matching the most recent updated_at the client knows about.
3. **Server: if `If-Match` doesn't match current `updated_at`, return 409 Conflict** with body `{ current_updated_at, current_updated_by, current_body_json }`.
4. **Frontend on 409**: shows a modal with three buttons:
   - **Reload (lose my changes)** — fetch fresh and replace editor content
   - **Overwrite** — re-PATCH with `If-Match: *` (force)
   - **Compare** — opens a side-by-side diff viewer so the user can manually merge

This ALSO covers the case where the user has the doc open in two browser tabs.

**Affects:** Server PATCH endpoint adds the check. Frontend adds the conflict modal. **New Task D1.**

## E. List endpoint — metadata only, body on selection

**Problem.** A client with 100 doc pages, average body 30KB JSON, returns 3MB on every list call. Unacceptable.

**Decision.** Restructure the list endpoint to return **only the tree shape** — no `body_json`, no `body_text`. The full doc (including body) is fetched on `GET /api/documents/:id` when the user selects a page.

```sql
SELECT id, parent_id, task_id, title, visibility, sort_order, updated_at, updated_by
  FROM documents WHERE client_id = $1 [...]
```

Frontend caches the body of viewed pages in memory for the session so re-selecting a page doesn't re-fetch.

**Affects:** Task 6's list endpoint code changes. Test list-doesn't-include-body. Frontend `_docsLoadTree` doesn't store body; `_docsRenderEditorPane` GETs the body when called.

## F. Drag-to-reparent in the tree

**Problem.** Glen explicitly listed this in v1 scope; my plan stubbed it.

**Decision.** Use HTML5 drag-and-drop with these UX rules:

1. Each tree row has `draggable="true"`.
2. On `dragstart`, store the dragged page id on `dataTransfer`.
3. On `dragover` against a tree row, compute drop intent from cursor Y within the row:
   - Top 25% → "drop above" (sibling, before)
   - Middle 50% → "drop into" (becomes a child)
   - Bottom 25% → "drop below" (sibling, after)
4. Render a 2px accent-coloured **drop indicator line** for above/below, or a glowing border for "into".
5. Forbidden drops (drop a page into one of its own descendants) — visual indicator turns red, drop is rejected.
6. On drop, PATCH `parent_id` (and recompute sort_order of siblings via batch update).

**Affects:** **New Task F1** (drag-drop wiring + cycle detection + sort_order rebalancing endpoint).

## G. Attachment lifecycle — orphan files

**Problem.** `document_attachments.row` cascade-deletes on doc delete, but the FILE on disk stays. Same when a user removes an image from the body — the file isn't referenced anywhere in the body JSON anymore but the row + file persist.

**Decisions:**

1. **On `DELETE /api/documents/:id`**, the server lists the doc's attachments BEFORE the cascade runs and unlinks the files from `uploads/` after the row delete commits.
2. **On `PATCH /api/documents/:id`** that changes `body_json`, the server compares attachment URLs in the new body vs the row set, and for any attachment row whose URL no longer appears in the body, sets `orphaned_at = now()`. A nightly cron sweeps `orphaned_at IS NOT NULL AND orphaned_at < now() - 24 hours` and deletes the row + file.
3. **24-hour grace** is intentional — covers undo / "I removed it by accident, let me Ctrl+Z."

**Affects:** Migration 034 gets `orphaned_at timestamptz NULL`. **New Task G1** (orphan tracking on PATCH + cron sweep + delete-cascade file cleanup).

## H. Image visibility — direct-URL leak through NBI blocks

**Problem.** A doc visible to clients contains an embedded image inside an NBI-internal block. Server strips the block before sending the body to the client → client never sees the image URL in the body. **But** if the client somehow guesses the URL (or sees it from a previous NBI version, or intercepts it), the image is served because the URL handler only checks doc-level visibility.

**Decision.** The `GET /api/documents/:id/attachments/:filename` handler additionally checks that the requesting user has access to the **specific image** as it appears in the doc body. For client portal users, the server fetches the doc body, walks for `image` nodes referencing this filename, and confirms the image lives in a non-NBI scope. If not, return 404.

**Implementation: `imageInScope(body, filename, { redactNbi: bool })`** — tiny helper, returns boolean. Used by the attachment GET when caller is a client user.

**Affects:** Task 8's image-serve endpoint changes. **New test in Task 8** for the leak case.

## I. Autosave failure recovery

**Problem.** Network drops during typing → autosave fails → user keeps editing → all unsaved changes lost on reload.

**Decisions:**

1. **Retry queue.** Failed autosave is requeued with exponential backoff (1s, 2s, 5s, 10s, 30s).
2. **Local persistence.** Every successful in-memory edit ALSO writes to localStorage under `nbi_docs_unsaved_<docId>` — a JSON blob containing `{ body_json, attempted_at }`. Cleared on successful server save.
3. **On editor open**, the loader checks for an unsaved blob for that doc id. If present AND newer than the server's `updated_at`, prompt: "You have unsaved local changes from N minutes ago. Restore?"
4. **Saved indicator** stays "Saving..." through retries; flips to red "**Save failed — retrying**" after 3 consecutive failures so the user knows.

**Affects:** Task 13's autosave logic gets the retry + localStorage layer. **New Task I1** for the unsaved-recovery prompt on doc open.

## J. Mobile + accessibility + keyboard shortcuts

**Problem.** Not addressed in original plan.

**Decisions:**

1. **Mobile (≤ 768px wide):** tree collapses into a hamburger drawer. The editor takes the full width. Toolbar wraps to two rows. Touch targets 36px minimum.
2. **Keyboard shortcuts:**
   - Ctrl+B / I / U — bold / italic / underline (TipTap built-in)
   - Ctrl+K — insert / edit link (custom binding)
   - Ctrl+S — force save now (bypass debounce)
   - Ctrl+Shift+I — toggle NBI internal block on selection
   - Esc when in editor → blur (gives focus back to the page)
3. **ARIA:** every toolbar button has `aria-label`. The tree is `role="tree"`, each item `role="treeitem"`. Selected page has `aria-selected="true"`. Live region for save state announcements ("Saved" / "Save failed").
4. **Focus management:** clicking a tree item moves focus to the editor's contenteditable area. Tab order: client picker → tree (arrow keys nav) → toolbar → editor.

**Affects:** Task 13 toolbar gains aria-label + shortcut handlers. **New Task J1** (mobile responsive layout + a11y audit checklist).

## K. CSP and esm.sh

**Problem.** If we ever add a CSP, `import` from `https://esm.sh` needs explicit allowlisting.

**Decision.** Today the dashboard has no CSP. The vendor self-host (decision A.2) is the long-term answer — once the local fallback is wired, we can add a CSP that only allows `script-src 'self'` and the loader skips the esm.sh attempt entirely. **Task A1 ships the local fallback in v1; turning off the CDN call is a one-line config when CSP is added.**

## L. Backups

**Problem.** Existing nightly backup script exports tasks/clients/users/etc. New tables + uploads dir need coverage.

**Decision.** **New Task L1** — extend the backup script's table list to include `documents` and `document_attachments`, and confirm the `uploads/` directory tarball coverage (it's already in `uploadManifest` — just needs a verification check that the document-attached files are included).

## M. NBI redaction edge cases

**Problem cases:**
- Marks (bold/italic/underline) inside an `nbiInternalBlock` — handled, my walker filters by node type, marks ride along inside text nodes.
- Images inside an NBI block — handled by H above.
- Empty `nbiInternalBlock` shells (user opens a block then deletes its contents) — server-side normaliser strips empty NBI blocks on PATCH.
- Page marked `visibility=nbi_only` AND containing `nbiInternalBlock` nodes — the page is filtered at list level so client never sees it; redactor doesn't run.

**Affects:** Task 5's redactor gains an "also drop empty NBI blocks" path. Test added.

## N. Migration safety

**Problem.** Migration 035 sets `docs_edit=false` for every existing client portal user.

**Decision.** Spelled out in the migration comment. Today there are 0 client portal users with any doc-related state, so the migration is safe. Worth flagging in the changelog.

## O. Permission resolution order

**Problem.** Per-user flags exist, per-client defaults exist. Which wins?

**Decision.** **Per-user flags always win.** Per-client defaults are *applied at user creation time* — they pre-populate the per-user row but become independent immediately after. Editing the per-client default does NOT retroactively change existing users. Glen's call to confirm; Confluence works this way.

**Affects:** Spec captures this. Server logic: on `POST /api/users` for a client portal user, copy `clients.doc_default_*` → `users.docs_*` once.

## P. Versioning of the editor schema

**Problem.** TipTap version bumps can change the JSON schema (rare, but possible — e.g. moving from heading attribute `level` to a new field). Stored docs would render wrong.

**Decision.** Every document gets a `body_version integer DEFAULT 1` column. Bumping TipTap to a new major version triggers a one-time migration script that walks every doc and applies a transformation. v1 ships at `body_version = 1`.

**Affects:** Migration 033 gains the column. Frontend writes the version on every save.

---

# Part 3 — New tasks added (A1, B1, D1, F1, G1, H1, I1, J1, L1)

These slot between the existing tasks. Numbered with letters to avoid renumbering 1-19.

## Task A1: TipTap self-host + version pin + SRI

**Files:**
- Create: `dashboard-server/scripts/build-tiptap-vendor.js` — pulls every pinned TipTap module from esm.sh once, computes SHA-384 SRI hashes, writes `dashboard-server/public/vendor/tiptap/manifest.json`.
- Create: `dashboard-server/public/vendor/tiptap/*.js` — the bundled modules.
- Create: `dashboard-server/public/vendor/tiptap/manifest.json` — `{ "core": { "version": "2.5.9", "sri": "sha384-..." }, ... }`.
- Modify: `nbi_project_dashboard.html` — `loadTiptap()` reads the manifest, attempts esm.sh with SRI, falls back to local on failure.

**Steps:**
- [ ] Write the vendor build script (Node + fetch + crypto.subtle for SHA-384).
- [ ] Run it once: `node dashboard-server/scripts/build-tiptap-vendor.js` — produces 6 .js files + manifest.
- [ ] Commit the vendor files (gitignore exclusion for the script's working tmp dir).
- [ ] Update Task 10's loader to use the manifest, attempt CDN with `crossorigin="anonymous"` and `integrity` attribute, fall back to local on `error` or 1500ms timeout.
- [ ] Manual test: load with browser DevTools "Offline" mode → editor still loads from local.
- [ ] Manual test: load with esm.sh allowed → loads from CDN, devtools shows the integrity attribute.

## Task B1: Plain-text extractor + body_text column

**Files:**
- Modify: `dashboard-server/migrations/033_documents.sql` — add `body_text text NOT NULL DEFAULT ''` column and `pg_trgm` extension + GIN index.
- Modify: `dashboard-server/lib/redact-nbi-internal.js` — export `extractPlainText(node, opts)` alongside `redactNbiInternal`.
- Modify: `dashboard-server/server.js` — the PATCH handler, on `body_json` change, computes `body_text = extractPlainText(body, { dropNbiInternal: false })` and writes both columns in the same UPDATE.
- Modify: `dashboard-server/tests/unit/redact-nbi-internal.test.mjs` — add tests for `extractPlainText` (handles paragraphs, lists, headings, drops NBI when flag set).

**Steps:**
- [ ] Write `extractPlainText` and tests.
- [ ] Update migration 033 with new column + extension + index. Re-run on dev/test DBs.
- [ ] Update server PATCH to write `body_text` in the same query.
- [ ] Add an integration test: PATCH a body with NBI block, query body_text, confirm NBI text NOT present (extractor uses dropNbiInternal=true on read paths, false on write — write-time keeps it for NBI-only search).

## Task D1: Optimistic concurrency (If-Match / 409 / conflict UI)

**Files:**
- Modify: `dashboard-server/server.js` — GET emits `ETag`, PATCH checks `If-Match`.
- Modify: `nbi_project_dashboard.html` — store ETag from GET, send on PATCH, handle 409 with a 3-button modal.
- Modify: `dashboard-server/tests/unit/documents.test.mjs` — tests for the conflict path.

**Steps:**
- [ ] Add a test: two PATCHes with the same If-Match → second returns 409 with current state in body.
- [ ] Implement server-side ETag/If-Match.
- [ ] Frontend: track `_docsState.lastEtag`, send `If-Match`, on 409 show conflict modal with the three buttons (Reload / Overwrite / Compare).
- [ ] Compare implementation: side-by-side diff using a simple line-by-line plain-text diff against `extractPlainText` of both versions.

## Task F1: Drag-to-reparent in the tree

**Files:**
- Modify: `nbi_project_dashboard.html` — tree row drag handlers, drop indicator rendering, sort_order rebalance call.
- Modify: `dashboard-server/server.js` — new endpoint `POST /api/documents/:id/move` taking `{ parent_id, position }` to atomically reparent + reorder.

**Steps:**
- [ ] Server: add `POST /api/documents/:id/move` that runs in a transaction — sets `parent_id`, then renumbers siblings of the new parent so that the moved doc lands at the requested position.
- [ ] Server: cycle detection — refuse if new parent is in the moved doc's descendant set.
- [ ] Frontend: HTML5 dragstart/dragover/dragleave/drop on tree rows.
- [ ] Frontend: drop indicator (line above/below or border on item) based on cursor Y within the row.
- [ ] Frontend: post-drop, call /move, then `_docsLoadTree()` and re-render.
- [ ] Tests: server-side move tests (basic, reorder, reparent, cycle rejection).

## Task G1: Attachment orphan tracking + cleanup

**Files:**
- Modify: `dashboard-server/migrations/034_document_attachments.sql` — add `orphaned_at timestamptz NULL`.
- Modify: `dashboard-server/server.js` — on PATCH body_json, mark unreferenced attachments as orphaned. On DELETE document, list attachments and unlink files post-commit.
- Create: `dashboard-server/lib/attachment-sweep.js` — pure function that takes (now, attachments) and returns the list to physically delete (orphaned_at < now - 24h).
- Modify: `dashboard-server/server.js` — register a cron at 03:30 daily that runs the sweep.

**Steps:**
- [ ] Tests for attachment-sweep helper (boundary at 24h, multiple files, none-to-delete).
- [ ] Migration 034 update + apply.
- [ ] Server PATCH change: extract image URLs from body, diff against attachments, set orphaned_at on missing.
- [ ] Server DELETE change: pre-cascade list + post-cascade fs.unlinkSync.
- [ ] Cron registration (mirror existing cron blocks in server.js).

## Task H1: Image-in-NBI-block leak prevention

**Files:**
- Modify: `dashboard-server/lib/redact-nbi-internal.js` — export `imageInScope(body, filename, { dropNbiInternal })`.
- Modify: `dashboard-server/server.js` — image-serve handler calls `imageInScope` for client portal users; 404 if not.
- Modify: `dashboard-server/tests/unit/documents.test.mjs` — add a test where a client user attempts to GET an image URL that lives in an NBI block.

**Steps:**
- [ ] Test: image URL inside NBI block → client GET returns 404.
- [ ] Test: same URL outside NBI block → client GET returns 200.
- [ ] Implement `imageInScope` (walk JSON, collect image src strings, with/without redacted blocks).
- [ ] Wire into image GET handler.

## Task I1: Autosave retry queue + localStorage backup + recovery prompt

**Files:**
- Modify: `nbi_project_dashboard.html` — `_docsScheduleSave` becomes a queue with retry; `_docsRenderEditorPane` checks localStorage on open.

**Steps:**
- [ ] State machine: idle → debounce → in-flight → success | retry (with backoff).
- [ ] Every onUpdate writes `localStorage.setItem('nbi_docs_unsaved_' + id, JSON.stringify({ body_json, ts }))`.
- [ ] On successful PATCH, `localStorage.removeItem(...)`.
- [ ] On editor open, if unsaved blob exists AND blob.ts > server doc.updated_at, show recovery banner with Restore / Discard buttons.
- [ ] Saved indicator: green "Saved Ns ago" → orange "Saving..." → red "Save failed — retrying" after 3 fails.

## Task J1: Mobile responsive + accessibility

**Files:**
- Modify: `nbi_project_dashboard.html` — CSS @media block + ARIA additions.

**Steps:**
- [ ] @media (max-width: 768px): tree collapses behind a hamburger button at top-left of `docs__hdr`. Toolbar wraps to multiple rows. Touch targets 36px+.
- [ ] aria-label on every toolbar button.
- [ ] role="tree" / role="treeitem" / aria-selected on tree.
- [ ] aria-live="polite" region for "Saved" / "Save failed" announcements.
- [ ] Keyboard shortcuts: bind Ctrl+S, Ctrl+K, Ctrl+Shift+I in the editor's `onCreate` callback.

## Task L1: Backup coverage

**Files:**
- Modify: `dashboard-server/backup.js` (the existing backup script).

**Steps:**
- [ ] Add `documents` and `document_attachments` to the table-export list.
- [ ] Verify `uploadManifest` covers `doc_*` filenames (no code change expected — existing scan picks them up — but add a test).
- [ ] Run a backup, restore to a scratch DB, confirm round-trip preserves doc bodies + linked attachments.

---

# Part 4 — Updated task ordering for subagent execution

Recommended execution order (subagent-driven mode):

1. Task 1 — spec freeze (no code, fast)
2. Task 2, 3, 4 — three migrations (parallel-safe; I'd dispatch them in parallel via the dispatching-parallel-agents skill)
3. Task 5, B1 — pure helper modules with TDD (parallel-safe; same skill)
4. Task 6 — list / read / create endpoints
5. Task 7 — update / delete / move endpoints
6. Task D1 — optimistic concurrency (extends Task 7's PATCH)
7. Task 8, H1 — image upload + leak prevention (sequential — H1 extends Task 8)
8. Task G1 — attachment orphan tracking
9. Task 9 — surface perms via /api/auth/me
10. Task A1 — TipTap vendor + loader (independent of server work)
11. Task 10 — TipTap loader stub (subsumes most of A1; merge into A1 in execution)
12. Task 11, 12 — sidebar + tree UI (sequential)
13. Task 13 — TipTap editor pane (the big one)
14. Task I1 — autosave retry + recovery (extends Task 13)
15. Task 14 — Slack smart card
16. Task F1 — drag-to-reparent
17. Task J1 — mobile + a11y
18. Task 15, 16 — entry points + perms UI (parallel-safe)
19. Task 17 — first-open seed
20. Task L1 — backup coverage
21. Task 18 — Playwright e2e
22. Task 19 — final restart + handoff

Total: 26 tasks. Parallelisable subsets flagged for the dispatching-parallel-agents skill.

---

# Part 5 — What I deliberately left out of v1

- **Page version history.** No `documents_versions` table. Means no "restore to last week's version." Adding later is purely additive (new table, body_version on the parent) so v1 is forward-compatible.
- **Real-time collaboration.** No Yjs / Liveblocks. Optimistic concurrency (D1) covers two-writer races but not cursor presence.
- **Templates.** v2 — design captured but no v1 task.
- **PDF export.** Generate-on-the-fly server-side from JSON — easy v2 add via `puppeteer` or similar; v1 ships without.
- **Comments / @mentions / reactions.** v2.
- **Cross-doc search.** v1 has the `body_text` column ready; the search UI itself is v2.
- **Internationalisation.** Strings are English-only. Any tooling for i18n adds churn out of proportion to value here.

These are explicit non-goals so a v2 scope conversation has a clear starting point.

