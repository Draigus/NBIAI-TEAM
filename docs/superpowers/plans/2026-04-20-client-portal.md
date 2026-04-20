# Client Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow NBI clients to log into WorkSage with scoped accounts, see only their data, collaborate fully within their scope, and optionally manage their own team members.

**Architecture:** Extend the existing single-file backend (`server.js`) and frontend (`nbi_project_dashboard.html`) with new middleware functions, endpoint scoping, and UI states. No new services or external dependencies. A single migration adds columns and one new table. Test-first with vitest unit tests against the real test DB.

**Tech Stack:** Node/Express, PostgreSQL, bcrypt, vitest + supertest, Playwright (E2E), single-page HTML/JS/CSS frontend.

**Spec:** `docs/superpowers/specs/2026-04-20-client-portal-design.md`

---

## File Map

| File | Responsibility | Change type |
|---|---|---|
| `dashboard-server/migrations/031_client_portal.sql` | Schema: client_role, must_change_password, bug report fields, activity log table, role normalisation | Create |
| `dashboard-server/tests/fixtures/baseline-schema.sql` | Test DB schema snapshot | Update (after migration) |
| `dashboard-server/tests/helpers/fixtures.js` | Test factories: add client_role, must_change_password support to createTestUser | Modify |
| `dashboard-server/server.js` | All backend logic: middleware, endpoints, scoping | Modify |
| `dashboard-server/tests/unit/client-portal-middleware.test.mjs` | Tests for requireAdmin, requireNBI, requireClientAdmin, requireTaskAccess | Create |
| `dashboard-server/tests/unit/client-portal-users.test.mjs` | Tests for user create/edit by client admin, temp password, deactivation | Create |
| `dashboard-server/tests/unit/client-portal-isolation.test.mjs` | Tests for data isolation: sync, tasks, bug reports, attachments, users | Create |
| `dashboard-server/tests/unit/client-portal-auth.test.mjs` | Tests for must_change_password, login response fields, token cache | Create |
| `nbi_project_dashboard.html` | Frontend: tab visibility, client filter lock, password modal, team mgmt UI, header | Modify |

---

## Task 1: Database Migration

**Files:**
- Create: `dashboard-server/migrations/031_client_portal.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 031_client_portal.sql
-- Client Portal: user model extensions, bug report scoping, audit logging

-- Normalise role values: frontend sent 'user', server defaults to 'member'
UPDATE users SET role = 'member' WHERE role = 'user';

-- Add client_role to users (member or admin, only meaningful when client_id is set)
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_role TEXT DEFAULT NULL;

-- Add must_change_password flag for forced password change on first login
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Add source and reporter_client_id to bug_reports for client-submitted reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS reporter_client_id UUID REFERENCES clients(id);

-- Client activity audit log
CREATE TABLE IF NOT EXISTS client_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_activity_client ON client_activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_user ON client_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_created ON client_activity_log(created_at);

-- Constraint: client_role only valid when client_id is set
ALTER TABLE users ADD CONSTRAINT chk_client_role_requires_client
  CHECK (client_role IS NULL OR client_id IS NOT NULL);
```

- [ ] **Step 2: Run the migration against the dev database**

```bash
cd dashboard-server && node init-db.js
```

Expected: Migration 031 applies cleanly. No errors.

- [ ] **Step 3: Regenerate the test baseline schema**

```bash
cd dashboard-server && pg_dump --schema-only --no-owner nbi_dashboard_test > tests/fixtures/baseline-schema.sql
```

- [ ] **Step 4: Add client_activity_log to the TRUNCATE list in tests/helpers/db.js**

In `dashboard-server/tests/helpers/db.js`, add `'client_activity_log'` to the `TRUNCATE_TABLES` array, before `'bug_report_comments'`:

```javascript
const TRUNCATE_TABLES = [
  'client_activity_log',
  'dashboard_snapshots',
  'bug_report_comments',
  // ... rest unchanged
];
```

- [ ] **Step 5: Run existing tests to verify no regression**

```bash
cd dashboard-server && npm test
```

Expected: All existing tests pass. The migration adds columns with defaults and creates a new table — no existing behaviour changes.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/migrations/031_client_portal.sql dashboard-server/tests/fixtures/baseline-schema.sql dashboard-server/tests/helpers/db.js
git commit -m "feat(db): add client portal migration — client_role, must_change_password, activity log"
```

---

## Task 2: Update Test Fixtures

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Extend createTestUser to support client_role and must_change_password**

In `dashboard-server/tests/helpers/fixtures.js`, update the `createTestUser` function:

```javascript
async function createTestUser(opts = {}) {
  const username = opts.username || uniq('testuser');
  const display_name = opts.display_name || `Test User ${_seq}`;
  const email = 'email' in opts ? opts.email : `${username}@example.invalid`;
  const role = opts.role || 'admin';
  const raw_password = opts.password || 'test_password_123';
  const password_hash = await bcrypt.hash(raw_password, 4);
  const client_id = opts.client_id || null;
  const client_role = opts.client_role || null;
  const must_change_password = opts.must_change_password || false;

  const { rows } = await pool.query(
    `INSERT INTO users (username, display_name, email, role, password_hash, is_active, client_id, client_role, must_change_password)
     VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8)
     RETURNING id, username, display_name, email, role, client_id, client_role, must_change_password`,
    [username, display_name, email, role, password_hash, client_id, client_role, must_change_password]
  );
  return { ...rows[0], raw_password };
}
```

- [ ] **Step 2: Run existing tests to verify no regression**

```bash
cd dashboard-server && npm test
```

Expected: All existing tests pass. The new parameters are all optional with defaults matching the old behaviour.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/tests/helpers/fixtures.js
git commit -m "feat(tests): extend createTestUser with client_role and must_change_password"
```

---

## Task 3: Extract requireAdmin Middleware + Rename requireInternal to requireNBI

**Files:**
- Modify: `dashboard-server/server.js`
- Create: `dashboard-server/tests/unit/client-portal-middleware.test.mjs`

- [ ] **Step 1: Write tests for requireAdmin and requireNBI**

Create `dashboard-server/tests/unit/client-portal-middleware.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('requireAdmin middleware', () => {
  it('admin can delete a task', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const task = await createTestTask({ title: 'To delete' });

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('member cannot delete a task (403)', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const task = await createTestTask({ title: 'Undeletable' });

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('requireNBI (renamed from requireInternal)', () => {
  it('NBI member can access finance endpoint', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);

    const res = await request(app)
      .get('/api/finance')
      .set('Authorization', `Bearer ${token}`);
    // 200 or empty result — not 403
    expect(res.status).not.toBe(403);
  });

  it('client user gets 403 on finance endpoint', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .get('/api/finance')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('client user gets 403 on expense endpoint', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests — they should pass for the requireNBI tests (requireInternal already works), and pass for requireAdmin (inline checks already work)**

```bash
cd dashboard-server && npx vitest run tests/unit/client-portal-middleware.test.mjs
```

Expected: All tests pass — the existing inline admin checks and requireInternal already enforce these rules. This is a baseline before refactoring.

- [ ] **Step 3: Extract requireAdmin middleware in server.js**

Near line ~892 (after `requireInternal`), add the new middleware:

```javascript
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
```

Then find-and-replace all inline admin checks. These look like:
```javascript
if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
```

Replace each occurrence with a call to the middleware on the route definition. For example:

Before:
```javascript
app.post('/api/users', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
```

After:
```javascript
app.post('/api/users', requireAdmin, async (req, res) => {
```

Apply this to all endpoints that currently have inline admin checks **except** POST /api/tasks and PATCH /api/tasks (those change to requireAuth in a later task). Key endpoints:
- DELETE /api/tasks/:id
- POST /api/users
- DELETE /api/users/:id
- PATCH /api/users/:id
- POST /api/auth/reset-password (admin reset)
- POST /api/clients
- PATCH /api/clients/:id
- DELETE /api/clients/:id

**Do NOT change** POST /api/tasks or PATCH /api/tasks in this step — those are handled in Task 5.

- [ ] **Step 4: Rename requireInternal to requireNBI**

In `server.js`, rename the function definition:

Before:
```javascript
function requireInternal(req, res, next) {
```

After:
```javascript
function requireNBI(req, res, next) {
```

Then find-and-replace all usages of `requireInternal` with `requireNBI` across the entire file. There are 50+ usages. Also update the module.exports at the bottom if `requireInternal` is exported:

Before:
```javascript
module.exports.requireInternal = requireInternal;
```

After:
```javascript
module.exports.requireNBI = requireNBI;
```

- [ ] **Step 5: Run all tests**

```bash
cd dashboard-server && npm test
```

Expected: All existing tests pass. This is a pure refactor — no behaviour change.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/client-portal-middleware.test.mjs
git commit -m "refactor: extract requireAdmin middleware, rename requireInternal to requireNBI"
```

---

## Task 4: Extend requireAuth + Add requireClientAdmin + requireTaskAccess

**Files:**
- Modify: `dashboard-server/server.js`
- Modify: `dashboard-server/tests/unit/client-portal-middleware.test.mjs`

- [ ] **Step 1: Write tests for new auth fields and middleware**

Append to `client-portal-middleware.test.mjs`:

```javascript
describe('requireAuth attaches client fields', () => {
  it('req.user includes clientRole for client users', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.clientRole).toBe('admin');
    expect(res.body.user.isNBI).toBe(false);
    expect(res.body.user.isClientAdmin).toBe(true);
  });

  it('req.user.isNBI is true for internal users', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.isNBI).toBe(true);
    expect(res.body.user.isClientAdmin).toBe(false);
  });

  it('login response includes clientRole and mustChangePassword', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({
      role: 'member', client_id: client.id, client_role: 'member', must_change_password: true
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: clientUser.username, password: clientUser.raw_password });
    expect(res.status).toBe(200);
    expect(res.body.user.clientRole).toBe('member');
    expect(res.body.user.mustChangePassword).toBe(true);
  });
});

describe('requireClientAdmin', () => {
  it('client admin can access client admin endpoints', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const token = await mintSession(clientAdmin.id);

    // Test by hitting the user list endpoint (client admin should see their company's users)
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('regular client member cannot create users (403)', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientMember = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientMember.id);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newuser', display_name: 'New', email: 'new@test.com', password: 'Test1234!' });
    expect(res.status).toBe(403);
  });
});

describe('requireTaskAccess', () => {
  it('client user can access tasks belonging to their client', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);
    const task = await createTestTask({ title: 'My task', client_id: client.id });

    const res = await request(app)
      .get(`/api/tasks/${task.id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    // 200 or empty array — not 403
    expect(res.status).toBe(200);
  });

  it('client user cannot access tasks belonging to another client (403)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);
    const taskB = await createTestTask({ title: 'Other task', client_id: clientB.id });

    const res = await request(app)
      .get(`/api/tasks/${taskB.id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('NBI user can access any task regardless of client', async () => {
    const clientB = await createTestClient({ name: 'ClientB' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const taskB = await createTestTask({ title: 'Any task', client_id: clientB.id });

    const res = await request(app)
      .get(`/api/tasks/${taskB.id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('requireTaskAccess walks parent chain to root', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    // Create a parent under clientB, then a child under it
    const parent = await createTestTask({ title: 'Parent', client_id: clientB.id, item_type: 'project' });
    const child = await createTestTask({ title: 'Child', parent_id: parent.id, client_id: clientB.id, item_type: 'feature' });

    // Client A user cannot access child even though child has its own client_id — root is clientB
    const res = await request(app)
      .get(`/api/tasks/${child.id}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests — they should fail (new fields and middleware don't exist yet)**

```bash
cd dashboard-server && npx vitest run tests/unit/client-portal-middleware.test.mjs
```

Expected: New tests fail. Existing tests from Task 3 still pass.

- [ ] **Step 3: Extend requireAuth to attach client fields**

In `server.js`, modify the `requireAuth` function. Update the SQL query (line ~821) to also fetch `client_role` and `must_change_password`:

```javascript
const { rows } = await pool.query(
  `SELECT u.id, u.username, u.display_name, u.role, u.client_id, u.client_role, u.must_change_password FROM sessions s
   JOIN users u ON s.user_id = u.id
   WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`, [hashedToken]
);
```

Update the user object construction (line ~826):

```javascript
const user = {
  id: rows[0].id,
  username: rows[0].username,
  displayName: rows[0].display_name,
  role: rows[0].role,
  clientId: rows[0].client_id,
  clientRole: rows[0].client_role,
  isNBI: !rows[0].client_id,
  isClientAdmin: !!rows[0].client_id && rows[0].client_role === 'admin',
  mustChangePassword: rows[0].must_change_password,
};
```

Do the same for:
1. The login endpoint response (line ~761 cacheToken call, and line ~766 response body)
2. The `/api/auth/me` endpoint (line ~790 SQL query and ~795 response body)

For login (line ~761):
```javascript
cacheToken(hashedToken, {
  id: user.id, username: user.username, displayName: user.display_name,
  role: user.role, clientId: user.client_id, clientRole: user.client_role,
  isNBI: !user.client_id, isClientAdmin: !!user.client_id && user.client_role === 'admin',
  mustChangePassword: user.must_change_password,
});
```

For login response (line ~766):
```javascript
res.json({
  token,
  user: {
    id: user.id, username: user.username, displayName: user.display_name,
    role: user.role, clientId: user.client_id, clientRole: user.client_role,
    isNBI: !user.client_id, isClientAdmin: !!user.client_id && user.client_role === 'admin',
    mustChangePassword: user.must_change_password,
  },
  expiresAt: expiresAt.toISOString(),
});
```

For `/api/auth/me` (line ~790-795):
```javascript
const { rows } = await pool.query(
  `SELECT u.id, u.username, u.display_name, u.role, u.client_id, u.client_role, u.must_change_password FROM sessions s
   JOIN users u ON s.user_id = u.id
   WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`, [hashed]
);
if (rows.length === 0) return res.status(401).json({ error: 'Session expired' });
res.json({ user: {
  id: rows[0].id, username: rows[0].username, displayName: rows[0].display_name,
  role: rows[0].role, clientId: rows[0].client_id, clientRole: rows[0].client_role,
  isNBI: !rows[0].client_id, isClientAdmin: !!rows[0].client_id && rows[0].client_role === 'admin',
  mustChangePassword: rows[0].must_change_password,
}});
```

- [ ] **Step 4: Add requireClientAdmin middleware**

Near the other middleware functions:

```javascript
function requireClientAdmin(req, res, next) {
  if (!req.user?.clientId || req.user?.clientRole !== 'admin') {
    return res.status(403).json({ error: 'Client admin access required' });
  }
  next();
}
```

- [ ] **Step 5: Add requireTaskAccess helper**

Near the other middleware functions:

```javascript
async function requireTaskAccess(req, res, taskId) {
  if (!req.user?.clientId) return true; // NBI users always pass

  let currentId = taskId;
  let depth = 0;
  const MAX_DEPTH = 10;

  while (currentId && depth < MAX_DEPTH) {
    const { rows } = await pool.query('SELECT parent_id, client_id FROM tasks WHERE id = $1', [currentId]);
    if (rows.length === 0) { res.status(404).json({ error: 'Task not found' }); return false; }

    if (!rows[0].parent_id) {
      // Root task — check client_id
      if (rows[0].client_id && rows[0].client_id !== req.user.clientId) {
        res.status(403).json({ error: 'Access denied' });
        return false;
      }
      return true;
    }
    currentId = rows[0].parent_id;
    depth++;
  }
  // If we hit max depth without finding root, check the last task's client_id
  const { rows: last } = await pool.query('SELECT client_id FROM tasks WHERE id = $1', [currentId]);
  if (last.length > 0 && last[0].client_id && last[0].client_id !== req.user.clientId) {
    res.status(403).json({ error: 'Access denied' });
    return false;
  }
  return true;
}
```

- [ ] **Step 6: Apply requireTaskAccess to task comment, time-entry, and attachment endpoints**

Find the GET /api/tasks/:id/comments endpoint and add the access check at the top of the handler:

```javascript
app.get('/api/tasks/:id/comments', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
  // ... rest of existing handler
```

Apply the same pattern to:
- POST /api/tasks/:id/comments
- GET /api/tasks/:id/time-entries (if exists)
- POST /api/tasks/:id/time-entries (if exists)
- POST /api/tasks/:id/attachments
- DELETE /api/tasks/:id/attachments/:attachmentId

- [ ] **Step 7: Run tests**

```bash
cd dashboard-server && npx vitest run tests/unit/client-portal-middleware.test.mjs
```

Expected: All tests pass.

- [ ] **Step 8: Run full test suite**

```bash
cd dashboard-server && npm test
```

Expected: All existing tests still pass.

- [ ] **Step 9: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/client-portal-middleware.test.mjs
git commit -m "feat: add requireClientAdmin, requireTaskAccess, extend requireAuth with client fields"
```

---

## Task 5: Task Endpoint Scoping (POST/PATCH open to all, client_id mutation block)

**Files:**
- Modify: `dashboard-server/server.js`
- Modify: `dashboard-server/tests/unit/client-scope.test.mjs`

- [ ] **Step 1: Write tests for the changed behaviour**

Append to `dashboard-server/tests/unit/client-scope.test.mjs`:

```javascript
describe('Client portal — task endpoint changes', () => {
  it('client user can create tasks via POST /api/tasks within their scope', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Client task', item_type: 'project' });
    expect(res.status).toBe(201);
    expect(res.body.client_id).toBe(clientA.id);
  });

  it('client user cannot create tasks for another client', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Sneaky', item_type: 'project', client_id: clientB.id });
    expect(res.status).toBe(403);
  });

  it('client user cannot change client_id on a task via PATCH', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientUser = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);
    const task = await createTestTask({ title: 'My task', client_id: clientA.id });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ client_id: clientB.id });
    // Should either ignore the field or 403
    if (res.status === 200) {
      // Field was stripped — verify client_id didn't change
      const { rows } = await pool.query('SELECT client_id FROM tasks WHERE id = $1', [task.id]);
      expect(rows[0].client_id).toBe(clientA.id);
    } else {
      expect(res.status).toBe(403);
    }
  });

  it('admin can still change client_id on a task (regression)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const task = await createTestTask({ title: 'Admin task', client_id: clientA.id });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ client_id: clientB.id });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests — new tests should fail**

```bash
cd dashboard-server && npx vitest run tests/unit/client-scope.test.mjs
```

Expected: New tests fail (POST /api/tasks returns 403 for non-admin, PATCH similar).

- [ ] **Step 3: Change POST /api/tasks from admin-only to requireAuth**

In `server.js`, find POST /api/tasks (~line 3903). Remove the inline admin check:

Before:
```javascript
app.post('/api/tasks', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
```

After:
```javascript
app.post('/api/tasks', async (req, res) => {
```

The existing `getClientScopes` call on the next line already handles client scoping correctly.

- [ ] **Step 4: Change PATCH /api/tasks/:id from admin-only to requireAuth, add client_id stripping**

In `server.js`, find PATCH /api/tasks/:id (~line 3985). Remove the inline admin check and add client_id protection:

Before:
```javascript
app.patch('/api/tasks/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
```

After:
```javascript
app.patch('/api/tasks/:id', async (req, res) => {
```

Then, after the existing scope check but before the `buildPatchQuery` or field processing, add:

```javascript
  // Client users cannot change client_id on tasks
  if (req.user?.clientId && req.body.client_id !== undefined) {
    delete req.body.client_id;
  }
```

Also add the `requireTaskAccess` check after fetching the old task:

```javascript
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
```

- [ ] **Step 5: Run tests**

```bash
cd dashboard-server && npx vitest run tests/unit/client-scope.test.mjs
```

Expected: All tests pass including the new ones.

- [ ] **Step 6: Run full test suite**

```bash
cd dashboard-server && npm test
```

Expected: All tests pass. Note: the existing test "scoped user cannot create tasks for other clients" should now hit the scope check (403) instead of the admin check (403) — same result.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/client-scope.test.mjs
git commit -m "feat: open POST/PATCH tasks to all authenticated users, block client_id mutation for client users"
```

---

## Task 6: User Management — Client Scoping + Client Admin Endpoints

**Files:**
- Modify: `dashboard-server/server.js`
- Create: `dashboard-server/tests/unit/client-portal-users.test.mjs`

- [ ] **Step 1: Write tests for user scoping and client admin features**

Create `dashboard-server/tests/unit/client-portal-users.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET /api/users scoping', () => {
  it('client user sees only users from their company', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member', display_name: 'UserA' });
    const userB = await createTestUser({ role: 'member', client_id: clientB.id, client_role: 'member', display_name: 'UserB' });
    const token = await mintSession(userA.id);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const names = res.body.map(u => u.display_name);
    expect(names).toContain('UserA');
    expect(names).not.toContain('UserB');
  });

  it('admin still sees all users (regression)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const admin = await createTestUser({ role: 'admin' });
    await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member', display_name: 'ClientUserA' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe('POST /api/users — client admin user creation', () => {
  it('client admin can create a user in their company', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newmember', display_name: 'New Member', email: 'new@testcorp.com', password: 'Temp1234abcd5678' });
    expect(res.status).toBe(201);
    expect(res.body.client_id).toBe(client.id);
    // must_change_password should be set
    const { rows } = await pool.query('SELECT must_change_password FROM users WHERE id = $1', [res.body.id]);
    expect(rows[0].must_change_password).toBe(true);
  });

  it('client admin cannot set role to admin (NBI level)', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'hacker', display_name: 'Hacker', email: 'h@test.com', password: 'Temp1234!', role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('client admin cannot create user for a different client', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'admin' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'sneaky', display_name: 'Sneaky', email: 's@test.com', password: 'Temp1234!', client_id: clientB.id });
    // Server should force client_id to the admin's own client_id or reject
    if (res.status === 201) {
      expect(res.body.client_id).toBe(clientA.id); // forced to own client
    } else {
      expect(res.status).toBe(403);
    }
  });

  it('regular client member cannot create users (403)', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientMember = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientMember.id);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'nope', display_name: 'Nope', email: 'n@test.com', password: 'Temp1234!' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/users/:id/deactivate', () => {
  it('client admin can deactivate a user in their company', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const target = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .post(`/api/users/${target.id}/deactivate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const { rows } = await pool.query('SELECT is_active FROM users WHERE id = $1', [target.id]);
    expect(rows[0].is_active).toBe(false);
  });

  it('client admin cannot deactivate a user from another company (403)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'admin' });
    const target = await createTestUser({ role: 'member', client_id: clientB.id, client_role: 'member' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .post(`/api/users/${target.id}/deactivate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/users/:id/reset-password', () => {
  it('client admin can reset password for a user in their company', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const target = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .post(`/api/users/${target.id}/reset-password`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    // must_change_password should be set
    const { rows } = await pool.query('SELECT must_change_password FROM users WHERE id = $1', [target.id]);
    expect(rows[0].must_change_password).toBe(true);
  });
});

describe('PATCH /api/users/:id — client admin constraints', () => {
  it('client admin can change client_role', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const target = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .patch(`/api/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ client_role: 'admin' });
    expect(res.status).toBe(200);
  });

  it('client admin cannot change client_id (403)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'admin' });
    const target = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .patch(`/api/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ client_id: clientB.id });
    expect(res.status).toBe(403);
  });

  it('client admin cannot promote to NBI admin role (403)', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const target = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .patch(`/api/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('last client admin cannot demote themselves', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
    const token = await mintSession(clientAdmin.id);

    const res = await request(app)
      .patch(`/api/users/${clientAdmin.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ client_role: 'member' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests — they should fail**

```bash
cd dashboard-server && npx vitest run tests/unit/client-portal-users.test.mjs
```

Expected: All fail — the scoping and new endpoints don't exist yet.

- [ ] **Step 3: Modify GET /api/users to scope for client users**

In `server.js`, find `GET /api/users` (~line 1099). Modify the handler:

```javascript
app.get('/api/users', async (req, res) => {
  if (req.user.role === 'admin') {
    const { rows } = await pool.query('SELECT id, username, display_name, email, role, is_active, capacity_hours_per_week, resource_type_ids, created_at, client_id, client_role FROM users ORDER BY display_name');
    res.json(rows);
  } else if (req.user.clientId) {
    // Client users: only see users from their company
    const { rows } = await pool.query(
      'SELECT id, username, display_name, email, client_role, is_active FROM users WHERE client_id = $1 ORDER BY display_name',
      [req.user.clientId]
    );
    res.json(rows);
  } else {
    const { rows } = await pool.query('SELECT id, username, display_name FROM users WHERE is_active = true ORDER BY display_name');
    res.json(rows);
  }
});
```

- [ ] **Step 4: Modify POST /api/users to support client admin creation**

Replace the existing `POST /api/users` handler. The middleware changes from `requireAdmin` to a custom check:

```javascript
app.post('/api/users', async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const isClientAdmin = req.user?.isClientAdmin;

  if (!isAdmin && !isClientAdmin) return res.status(403).json({ error: 'Admin or client admin required' });

  // Client admin constraints
  if (isClientAdmin) {
    if (req.body.role === 'admin') return res.status(403).json({ error: 'Cannot create NBI admin accounts' });
    if (req.body.client_id && req.body.client_id !== req.user.clientId) return res.status(403).json({ error: 'Cannot create users for other companies' });
  }

  const { username, display_name, email } = req.body;
  const role = isClientAdmin ? 'member' : (req.body.role || 'member');
  const client_id = isClientAdmin ? req.user.clientId : (req.body.client_id || null);
  const client_role = req.body.client_role || (client_id ? 'member' : null);
  const must_change_password = !!client_id; // Client users always need to change password

  // Generate temp password for client users, use provided password for NBI
  let raw_password = req.body.password;
  if (client_id && !raw_password) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    raw_password = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  if (!username || !raw_password) return res.status(400).json({ error: 'Username and password required' });
  const lenErr = validateLength(username, 'name', 200) || validateLength(display_name, 'name') || validateLength(email, 'email');
  if (lenErr) return res.status(400).json({ error: lenErr });

  const hash = await bcrypt.hash(raw_password, 10);
  const cleanEmail = email && email.trim() ? email.trim() : null;

  if (cleanEmail) {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email address already in use' });
  }

  const { rows } = await pool.query(
    `INSERT INTO users (username, display_name, email, password_hash, role, client_id, client_role, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (username) DO NOTHING
     RETURNING id, username, display_name, email, role, client_id, client_role, must_change_password`,
    [username.toLowerCase().trim(), display_name || username, cleanEmail, hash, role, client_id, client_role, must_change_password]
  );
  if (rows.length === 0) return res.status(409).json({ error: 'Username already exists' });

  await auditLog('user', rows[0].id, 'create', req.user?.displayName, { username, display_name, client_id, client_role });

  // Send invite email for client users
  if (client_id && cleanEmail) {
    const clientName = (await pool.query('SELECT name FROM clients WHERE id = $1', [client_id])).rows[0]?.name || 'your company';
    sendEmailAsync({
      to: cleanEmail,
      subject: `Your WorkSage account has been created`,
      body: `Hello ${display_name || username},\n\nAn account has been created for you on WorkSage for ${clientName}.\n\nUsername: ${username.toLowerCase().trim()}\nTemporary Password: ${raw_password}\n\nPlease log in at ${process.env.APP_URL || 'https://worksage.nbi-consulting.com'}/nbi_project_dashboard.html and change your password immediately.\n\nYou will be required to change your password on first login.`,
    });
  }

  // Log to client activity log if created by client admin
  if (isClientAdmin) {
    await pool.query(
      `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'invite_user', 'user', $3, $4)`,
      [req.user.id, req.user.clientId, rows[0].id, JSON.stringify({ username, display_name, client_role })]
    );
  }

  res.status(201).json(rows[0]);
});
```

- [ ] **Step 5: Modify PATCH /api/users/:id to support client admin**

Replace the existing `PATCH /api/users/:id` handler:

```javascript
app.patch('/api/users/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });

  const isAdmin = req.user?.role === 'admin';
  const isClientAdmin = req.user?.isClientAdmin;

  if (!isAdmin && !isClientAdmin) return res.status(403).json({ error: 'Admin or client admin required' });

  // Client admin constraints
  if (isClientAdmin) {
    // Can only modify users in their own company
    const { rows: target } = await pool.query('SELECT client_id FROM users WHERE id = $1', [req.params.id]);
    if (target.length === 0) return res.status(404).json({ error: 'User not found' });
    if (target[0].client_id !== req.user.clientId) return res.status(403).json({ error: 'Cannot modify users from another company' });

    // Cannot change client_id or promote to NBI admin
    if (req.body.client_id !== undefined) return res.status(403).json({ error: 'Cannot change client assignment' });
    if (req.body.role === 'admin') return res.status(403).json({ error: 'Cannot assign NBI admin role' });

    // Prevent last admin self-demotion
    if (req.body.client_role === 'member' || req.body.client_role === null) {
      const { rows: admins } = await pool.query(
        "SELECT id FROM users WHERE client_id = $1 AND client_role = 'admin' AND is_active = true",
        [req.user.clientId]
      );
      if (admins.length <= 1 && admins[0]?.id === req.params.id) {
        return res.status(400).json({ error: 'Cannot demote the last admin for this company' });
      }
    }
  }

  if (req.body.is_active !== undefined && typeof req.body.is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active must be a boolean' });
  }

  const allowedFields = isAdmin
    ? ['role', 'display_name', 'email', 'client_id', 'is_active', 'client_role']
    : ['display_name', 'client_role', 'is_active']; // client admin: limited fields

  const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowedFields);
  if (req.body.display_name !== undefined && !req.body.display_name.trim()) {
    return res.status(400).json({ error: 'Display name cannot be empty' });
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  vals.push(req.params.id);
  const { rows } = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING id, username, display_name, email, role, client_id, client_role, is_active`, vals);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  // Invalidate token cache
  for (const [key, entry] of _tokenCache) {
    if (entry.user && entry.user.id === req.params.id) _tokenCache.delete(key);
  }

  // Deactivation: kill sessions
  if (req.body.is_active === false) {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
  }

  // Client activity log
  if (isClientAdmin) {
    await pool.query(
      `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'change_role', 'user', $3, $4)`,
      [req.user.id, req.user.clientId, req.params.id, JSON.stringify(req.body)]
    );
  }

  res.json(rows[0]);
});
```

- [ ] **Step 6: Add deactivate/reactivate endpoints**

```javascript
app.post('/api/users/:id/deactivate', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
  const isAdmin = req.user?.role === 'admin';
  const isClientAdmin = req.user?.isClientAdmin;
  if (!isAdmin && !isClientAdmin) return res.status(403).json({ error: 'Admin or client admin required' });

  if (isClientAdmin) {
    const { rows: target } = await pool.query('SELECT client_id FROM users WHERE id = $1', [req.params.id]);
    if (target.length === 0) return res.status(404).json({ error: 'User not found' });
    if (target[0].client_id !== req.user.clientId) return res.status(403).json({ error: 'Cannot deactivate users from another company' });
  }

  await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
  for (const [key, entry] of _tokenCache) {
    if (entry.user && entry.user.id === req.params.id) _tokenCache.delete(key);
  }

  if (isClientAdmin) {
    await pool.query(
      `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id)
       VALUES ($1, $2, 'deactivate_user', 'user', $3)`,
      [req.user.id, req.user.clientId, req.params.id]
    );
  }

  res.json({ ok: true });
});

app.post('/api/users/:id/reactivate', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
  const isAdmin = req.user?.role === 'admin';
  const isClientAdmin = req.user?.isClientAdmin;
  if (!isAdmin && !isClientAdmin) return res.status(403).json({ error: 'Admin or client admin required' });

  if (isClientAdmin) {
    const { rows: target } = await pool.query('SELECT client_id FROM users WHERE id = $1', [req.params.id]);
    if (target.length === 0) return res.status(404).json({ error: 'User not found' });
    if (target[0].client_id !== req.user.clientId) return res.status(403).json({ error: 'Cannot reactivate users from another company' });
  }

  await pool.query('UPDATE users SET is_active = true WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
```

- [ ] **Step 7: Add password reset endpoint for client admins**

```javascript
app.post('/api/users/:id/reset-password', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
  const isAdmin = req.user?.role === 'admin';
  const isClientAdmin = req.user?.isClientAdmin;
  if (!isAdmin && !isClientAdmin) return res.status(403).json({ error: 'Admin or client admin required' });

  if (isClientAdmin) {
    const { rows: target } = await pool.query('SELECT client_id, email, display_name FROM users WHERE id = $1', [req.params.id]);
    if (target.length === 0) return res.status(404).json({ error: 'User not found' });
    if (target[0].client_id !== req.user.clientId) return res.status(403).json({ error: 'Cannot reset password for users from another company' });
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const tempPassword = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const hash = await bcrypt.hash(tempPassword, 10);

  await pool.query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [hash, req.params.id]);
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);
  for (const [key, entry] of _tokenCache) {
    if (entry.user && entry.user.id === req.params.id) _tokenCache.delete(key);
  }

  const { rows: user } = await pool.query('SELECT email, display_name FROM users WHERE id = $1', [req.params.id]);
  if (user[0]?.email) {
    sendEmailAsync({
      to: user[0].email,
      subject: 'Your WorkSage password has been reset',
      body: `Hello ${user[0].display_name},\n\nYour password has been reset by your administrator.\n\nNew temporary password: ${tempPassword}\n\nPlease log in and change your password immediately.`,
    });
  }

  if (isClientAdmin) {
    await pool.query(
      `INSERT INTO client_activity_log (user_id, client_id, action, target_type, target_id)
       VALUES ($1, $2, 'reset_password', 'user', $3)`,
      [req.user.id, req.user.clientId, req.params.id]
    );
  }

  res.json({ ok: true });
});
```

- [ ] **Step 8: Modify POST /api/auth/change-password to clear must_change_password**

Find the change-password handler (~line 1077). After the password update query, add:

```javascript
  await pool.query('UPDATE users SET must_change_password = false WHERE id = $1', [req.user.id]);
```

Add this line after `await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);` (line ~1089).

- [ ] **Step 9: Run tests**

```bash
cd dashboard-server && npx vitest run tests/unit/client-portal-users.test.mjs
```

Expected: All tests pass.

- [ ] **Step 10: Run full test suite**

```bash
cd dashboard-server && npm test
```

Expected: All tests pass.

- [ ] **Step 11: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/client-portal-users.test.mjs
git commit -m "feat: client admin user management — create, deactivate, reset password, role changes"
```

---

## Task 7: Bug Report + Attachment Endpoint Scoping

**Files:**
- Modify: `dashboard-server/server.js`
- Create: `dashboard-server/tests/unit/client-portal-isolation.test.mjs`

- [ ] **Step 1: Write tests for bug report and attachment scoping**

Create `dashboard-server/tests/unit/client-portal-isolation.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestBugReport } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Bug reports — client scoping', () => {
  it('client user can submit a bug report', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Something broken', type: 'bug', description: 'Details here' });
    expect(res.status).toBe(201);
    expect(res.body.source).toBe('client');
    expect(res.body.reporter_client_id).toBe(client.id);
  });

  it('client user only sees their companys bug reports', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const admin = await createTestUser({ role: 'admin' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const userB = await createTestUser({ role: 'member', client_id: clientB.id, client_role: 'member' });

    // Create bugs from different sources
    await createTestBugReport({ user_id: admin.id, title: 'Internal bug' });
    await pool.query('UPDATE bug_reports SET source = $1 WHERE title = $2', ['internal', 'Internal bug']);

    await createTestBugReport({ user_id: userA.id, title: 'ClientA bug' });
    await pool.query('UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE title = $3', ['client', clientA.id, 'ClientA bug']);

    await createTestBugReport({ user_id: userB.id, title: 'ClientB bug' });
    await pool.query('UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE title = $3', ['client', clientB.id, 'ClientB bug']);

    const tokenA = await mintSession(userA.id);
    const res = await request(app)
      .get('/api/bug-reports')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const titles = res.body.map(r => r.title);
    expect(titles).toContain('ClientA bug');
    expect(titles).not.toContain('ClientB bug');
    expect(titles).not.toContain('Internal bug');
  });

  it('admin still sees all bug reports (regression)', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const clientUser = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });

    await createTestBugReport({ user_id: admin.id, title: 'Admin bug' });
    await createTestBugReport({ user_id: clientUser.id, title: 'Client bug' });
    await pool.query('UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE title = $3', ['client', client.id, 'Client bug']);

    const token = await mintSession(admin.id);
    const res = await request(app)
      .get('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Sync/load — user array filtering', () => {
  it('client user sync/load does not return users from other companies', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member', display_name: 'AliceA' });
    await createTestUser({ role: 'member', client_id: clientB.id, client_role: 'member', display_name: 'BobB' });
    await createTestUser({ role: 'admin', display_name: 'AdminNBI' });
    const token = await mintSession(userA.id);

    const res = await request(app)
      .get('/api/sync/load')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Check that the users array (if present) doesn't include other companies
    if (res.body.users) {
      const names = res.body.users.map(u => u.displayName || u.display_name);
      expect(names).not.toContain('BobB');
      expect(names).not.toContain('AdminNBI');
    }
  });
});

describe('Attachment endpoints — auth required', () => {
  it('unauthenticated request to GET /api/attachments/test.txt returns 401', async () => {
    const res = await request(app).get('/api/attachments/test.txt');
    expect(res.status).toBe(401);
  });

  it('unauthenticated request to GET /api/attachments/download/test.txt returns 401', async () => {
    const res = await request(app).get('/api/attachments/download/test.txt');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests — they should fail**

```bash
cd dashboard-server && npx vitest run tests/unit/client-portal-isolation.test.mjs
```

Expected: Bug report tests fail (403 from requireNBI). Attachment tests fail (200 instead of 401).

- [ ] **Step 3: Change all bug report endpoints from requireNBI to requireAuth with scoping**

In `server.js`, for each bug report endpoint:

**GET /api/bug-reports** (~line 6321): Change `requireInternal` (now `requireNBI`) to no middleware, add scoping logic:

```javascript
app.get('/api/bug-reports', async (req, res) => {
  // ... existing filter params
  let whereClause = 'WHERE 1=1';
  const params = [];

  // Client scoping
  if (req.user?.clientId) {
    params.push(req.user.clientId);
    whereClause += ` AND reporter_client_id = $${params.length}`;
  }

  // ... rest of existing filter logic, using params array
```

**POST /api/bug-reports** (~line 6343): Remove `requireNBI`, add source/reporter_client_id:

After inserting the bug report, if the user is a client user, set `source` and `reporter_client_id`:

```javascript
app.post('/api/bug-reports', async (req, res) => {
  // ... existing validation
  const source = req.user?.clientId ? 'client' : 'internal';
  const reporter_client_id = req.user?.clientId || null;
  // Include in INSERT query
```

**All other bug report endpoints**: Remove `requireNBI`. For read endpoints (GET comments, screenshot), add a check that the bug report's `reporter_client_id` matches the user's `clientId`. For DELETE, change to `requireAdmin`.

For `POST /api/bug-reports/:id/notify-review`: Keep as `requireNBI` (NBI-only feature).

- [ ] **Step 4: Add requireAuth to attachment endpoints that currently have none**

For each attachment endpoint without auth, add the `requireAuth` check. Since `requireAuth` is applied as global middleware via `app.use(requireAuth)`, these routes already pass through it — verify by checking if `app.use(requireAuth)` exists. If not, add explicit auth checks.

Check how the app applies middleware. If it's applied globally before routes, the attachment endpoints are already protected. If not, add per-route.

- [ ] **Step 5: Filter users in sync/load for client users**

In `server.js`, find the sync/load endpoint (~line 4889). After the existing data assembly, add user filtering:

```javascript
// Filter users for client-scoped users
if (isExternal && req.user?.clientId) {
  // Only return users from the same company
  const { rows: companyUsers } = await pool.query(
    'SELECT id, username, display_name FROM users WHERE client_id = $1 AND is_active = true',
    [req.user.clientId]
  );
  // Replace the users section of the response
  // ... (depends on how users are currently returned in sync/load)
}
```

- [ ] **Step 6: Run tests**

```bash
cd dashboard-server && npx vitest run tests/unit/client-portal-isolation.test.mjs
```

Expected: All tests pass.

- [ ] **Step 7: Run full test suite**

```bash
cd dashboard-server && npm test
```

Expected: All tests pass. Pay special attention to the existing `client-scope.test.mjs` test "scoped user gets 403 on bug tracker endpoints" — this test expects 403 from `requireNBI` but bug reports are now open to client users. **Update this existing test** to reflect the new behaviour: client users now get 200 on bug reports, not 403.

- [ ] **Step 8: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/client-portal-isolation.test.mjs dashboard-server/tests/unit/client-scope.test.mjs
git commit -m "feat: bug report + attachment scoping, sync/load user filtering for client portal"
```

---

## Task 8: Email Forwarding Client Scope Check

**Files:**
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Add client scope check to processOneInboundEmail**

In `server.js`, find the `processOneInboundEmail` function (~line 8373). After it matches a task (after `matchSubjectToTask` returns), add:

```javascript
// Client scope check: if sender is a client user, verify task belongs to their client
if (taskId) {
  const senderEmail = message.from?.emailAddress?.address;
  if (senderEmail) {
    const { rows: senderUser } = await pool.query(
      'SELECT client_id FROM users WHERE email = $1 AND is_active = true',
      [senderEmail.toLowerCase()]
    );
    if (senderUser.length > 0 && senderUser[0].client_id) {
      // Sender is a client user — walk task to root and check client_id
      let currentId = taskId;
      let depth = 0;
      let rootClientId = null;
      while (currentId && depth < 10) {
        const { rows: t } = await pool.query('SELECT parent_id, client_id FROM tasks WHERE id = $1', [currentId]);
        if (t.length === 0) break;
        if (!t[0].parent_id) { rootClientId = t[0].client_id; break; }
        currentId = t[0].parent_id;
        depth++;
      }
      if (rootClientId && rootClientId !== senderUser[0].client_id) {
        log('warn', 'Email', 'Client user email rejected — task belongs to different client', {
          sender: senderEmail, taskId, senderClient: senderUser[0].client_id, taskClient: rootClientId
        });
        return { matched: false, reason: 'client_scope_mismatch' };
      }
    }
  }
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd dashboard-server && npm test
```

Expected: All tests pass. Email tests may not directly test this path (they mock Graph API), but no regression.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/server.js
git commit -m "feat: add client scope check to inbound email forwarding"
```

---

## Task 9: Frontend — Tab Visibility, Client Filter Lock, Header

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add helper functions**

Near the top of the JS section (after `_currentUser` declaration ~line 2593), add:

```javascript
function isClientUser() { return !!_currentUser?.clientId; }
function isClientAdmin() { return _currentUser?.clientRole === 'admin'; }
```

- [ ] **Step 2: Update sidebar rendering — unhide Bug Tracker and Settings, add News**

In the sidebar rendering (~lines 3772-3800):

1. Find the Bug Tracker section (~line 3794). Change from `if (!isScoped)` to always show:

Before:
```javascript
  if (!isScoped) {
    const bugOpenCount = ...
    html += sidebarItem(svgBugs, 'Bug Tracker', bugOpenCount || '', () => switchView('bugs'), currentView==='bugs');
  }
```

After:
```javascript
  {
    const bugOpenCount = ((_bugReportsData && _bugReportsData.reports) || []).filter(r => r.status === 'open' || r.status === 'in_progress').length;
    html += sidebarItem(svgBugs, 'Bug Tracker', bugOpenCount || '', () => switchView('bugs'), currentView==='bugs');
  }
```

2. Find the Settings section (~line 3798). Same change — remove `if (!isScoped)`:

Before:
```javascript
  if (!isScoped) {
    html += sidebarItem(svgSettings, 'Settings', '', () => switchView('settings'), currentView==='settings');
  }
```

After:
```javascript
  html += sidebarItem(svgSettings, 'Settings', '', () => switchView('settings'), currentView==='settings');
```

3. Add a News sidebar entry before Bug Tracker:

```javascript
  const svgNews = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h3"/></svg>';
  html += sidebarItem(svgNews, 'News', '', () => switchView('news'), currentView==='news');
```

- [ ] **Step 3: Lock client filter for client users**

Find the `load()` function or wherever `currentFilter.client` is initialised after sync/load returns. Add after user data is populated:

```javascript
if (isClientUser()) {
  // Lock filter to their client — cannot be changed
  const clientName = _currentUser.clientId && _apiClientsCache
    ? Object.values(_apiClientsCache).find(c => c.id === _currentUser.clientId)?.name
    : null;
  if (clientName) currentFilter.client = clientName;
}
```

Find the client filter dropdown in Projects view (~line 5942-5979) and wrap it:

```javascript
if (!isClientUser()) {
  // Show client filter dropdown (existing code)
}
```

- [ ] **Step 4: Show company name in header for client users**

Find the header rendering area where the user's name is displayed. Add a company name display:

```javascript
if (isClientUser() && _apiClientsCache) {
  const company = Object.values(_apiClientsCache).find(c => c.id === _currentUser.clientId);
  if (company) {
    // Show company name in header title area
    headerTitleEl.textContent = company.name;
  }
}
```

- [ ] **Step 5: Update role dropdowns from 'user' to 'member'**

Find line ~16505 and change:
```html
<option value="user">User</option>
```
to:
```html
<option value="member">Member</option>
```

Find line ~18194 and change all `value="user"` to `value="member"` and `u.role==='user'` to `u.role==='member'`.

- [ ] **Step 6: Test in browser**

Start the dev server and verify:
- Log in as NBI admin: all tabs visible, no changes
- (If a test client user exists): log in as client user, verify only allowed tabs show, client filter is locked

```bash
cd dashboard-server && pm2 restart nbi-dashboard
```

Open https://worksage.nbi-consulting.com in browser and verify.

- [ ] **Step 7: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(frontend): client portal tab visibility, filter lock, header, role normalisation"
```

---

## Task 10: Frontend — First Login Password Change Modal

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add the password change modal HTML**

After the login screen HTML, add a full-screen modal. Find the login screen element (`#loginScreen`) and add after it:

```html
<div id="forcePasswordChangeModal" style="display:none;position:fixed;inset:0;z-index:10000;background:var(--bg-base);display:none;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:32px;max-width:400px;width:90%">
    <h2 style="margin:0 0 8px;font-size:1.2rem;color:var(--text-primary)">Change Your Password</h2>
    <p style="margin:0 0 20px;font-size:0.85rem;color:var(--text-muted)">You must change your temporary password before continuing.</p>
    <input type="password" id="fpwCurrent" placeholder="Current (temporary) password" style="display:block;width:100%;box-sizing:border-box;padding:8px 12px;margin-bottom:10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem">
    <input type="password" id="fpwNew" placeholder="New password (min 6 characters)" style="display:block;width:100%;box-sizing:border-box;padding:8px 12px;margin-bottom:10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem">
    <input type="password" id="fpwConfirm" placeholder="Confirm new password" style="display:block;width:100%;box-sizing:border-box;padding:8px 12px;margin-bottom:16px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem">
    <div id="fpwError" style="color:var(--status-overdue);font-size:0.82rem;margin-bottom:10px;display:none"></div>
    <button id="fpwSubmit" class="btn btn--primary" style="width:100%">Change Password</button>
  </div>
</div>
```

- [ ] **Step 2: Add the password change logic**

In the JS section, after the login flow and `_currentUser` is set:

```javascript
function checkForcePasswordChange() {
  if (_currentUser?.mustChangePassword) {
    document.getElementById('forcePasswordChangeModal').style.display = 'flex';
    document.getElementById('fpwSubmit').onclick = async () => {
      const current = document.getElementById('fpwCurrent').value;
      const newPw = document.getElementById('fpwNew').value;
      const confirm = document.getElementById('fpwConfirm').value;
      const errorEl = document.getElementById('fpwError');

      if (!current || !newPw || !confirm) { errorEl.textContent = 'All fields required'; errorEl.style.display = 'block'; return; }
      if (newPw.length < 6) { errorEl.textContent = 'Password must be at least 6 characters'; errorEl.style.display = 'block'; return; }
      if (newPw !== confirm) { errorEl.textContent = 'Passwords do not match'; errorEl.style.display = 'block'; return; }

      try {
        const res = await authFetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
        });
        if (res.ok) {
          _currentUser.mustChangePassword = false;
          document.getElementById('forcePasswordChangeModal').style.display = 'none';
          // Re-login since change-password invalidates sessions
          window.location.reload();
        } else {
          const data = await res.json();
          errorEl.textContent = data.error || 'Password change failed';
          errorEl.style.display = 'block';
        }
      } catch (e) {
        errorEl.textContent = 'Network error';
        errorEl.style.display = 'block';
      }
    };
    return true; // Modal is showing — don't proceed to app
  }
  return false;
}
```

Then call `checkForcePasswordChange()` right after `_currentUser` is set in both the login handler and the init/`/api/auth/me` check. If it returns true, don't call `showApp()`.

- [ ] **Step 3: Test in browser**

Create a test client user with `must_change_password = true` via the database, log in, and verify the modal appears and works.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(frontend): first-login forced password change modal"
```

---

## Task 11: Frontend — Settings Tab Scoping + Team Management UI

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Scope Settings tab content for client users**

Find the Settings tab rendering (~line 16452). Wrap the admin-only sections:

```javascript
// Show Account tab for everyone
if (tab === 'account') {
  // Existing account settings (password change, display name)
  // ... keep as-is
}

// Team tab — only for admin or client admin
if (tab === 'team' && (isAdmin || isClientAdmin())) {
  if (isAdmin) {
    // Existing NBI admin user management (keep current code)
  } else if (isClientAdmin()) {
    // Client admin team management UI
    html += renderClientTeamManagement();
  }
}

// Config, Data, Changelog — NBI only
if (!isClientUser()) {
  // Existing config/data/changelog tabs
}
```

- [ ] **Step 2: Build the client team management UI**

```javascript
function renderClientTeamManagement() {
  let html = '<div class="settings__group"><h2>Team Management</h2>';
  html += '<div id="clientTeamList" style="margin-bottom:12px">Loading...</div>';
  html += `<div style="border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-md);background:var(--bg-surface)">
    <div style="font-size:0.82rem;font-weight:600;margin-bottom:8px">Invite Team Member</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end">
      <input id="inviteDisplayName" placeholder="Display Name" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:140px">
      <input id="inviteEmail" placeholder="Email" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:180px">
      <select id="inviteRole" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem">
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button class="btn btn--sm btn--primary" onclick="inviteClientUser()">Invite</button>
    </div>
  </div>`;
  html += '</div>';
  return html;
}

async function loadClientTeamList() {
  const res = await authFetch('/api/users');
  if (!res.ok) return;
  const users = await res.json();
  const container = document.getElementById('clientTeamList');
  if (!container) return;

  container.innerHTML = users.map(u => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
      <span style="flex:1;font-size:0.85rem">${esc(u.display_name)}</span>
      <span style="font-size:0.75rem;color:var(--text-muted)">${esc(u.email || '')}</span>
      <span style="font-size:0.75rem;padding:2px 6px;border-radius:3px;background:${u.is_active ? 'var(--bg-surface)' : 'var(--status-overdue)'};color:${u.is_active ? 'var(--text-muted)' : '#fff'}">${u.is_active ? (u.client_role || 'member') : 'Inactive'}</span>
      ${u.id !== _currentUser.id ? `
        <button class="btn btn--sm" onclick="toggleClientUserActive('${u.id}', ${!u.is_active})">${u.is_active ? 'Deactivate' : 'Reactivate'}</button>
        <button class="btn btn--sm" onclick="resetClientUserPassword('${u.id}')">Reset PW</button>
      ` : ''}
    </div>
  `).join('');
}

async function inviteClientUser() {
  const display_name = document.getElementById('inviteDisplayName').value.trim();
  const email = document.getElementById('inviteEmail').value.trim();
  const client_role = document.getElementById('inviteRole').value;
  if (!display_name || !email) { showToast('Name and email required', 'error'); return; }

  const username = email.split('@')[0].toLowerCase();
  const res = await authFetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, display_name, email, client_role }),
  });
  if (res.ok) {
    showToast(`User created. Invite email sent to ${email}.`);
    document.getElementById('inviteDisplayName').value = '';
    document.getElementById('inviteEmail').value = '';
    loadClientTeamList();
  } else {
    const data = await res.json();
    showToast(data.error || 'Failed to create user', 'error');
  }
}

async function toggleClientUserActive(userId, activate) {
  const endpoint = activate ? 'reactivate' : 'deactivate';
  if (!activate && !confirm('Deactivate this user? They will be logged out immediately.')) return;
  const res = await authFetch(`/api/users/${userId}/${endpoint}`, { method: 'POST' });
  if (res.ok) { showToast(activate ? 'User reactivated' : 'User deactivated'); loadClientTeamList(); }
  else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
}

async function resetClientUserPassword(userId) {
  if (!confirm('Reset this user\'s password? They will receive a new temporary password by email.')) return;
  const res = await authFetch(`/api/users/${userId}/reset-password`, { method: 'POST' });
  if (res.ok) { showToast('Password reset. New temporary password sent by email.'); }
  else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); }
}
```

- [ ] **Step 3: Replace the existing user creation form in Settings > Team**

Find the existing "Add New User" form (~lines 16495-16510). Replace it with the new flow:

```javascript
if (tab === 'team' && isAdmin) {
  // ... existing user list (keep)
  html += `<div style="border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-md);background:var(--bg-surface)">
    <div style="font-size:0.82rem;font-weight:600;margin-bottom:8px">Add New User</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px">
      <select id="newUserType" onchange="toggleClientUserFields()" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem">
        <option value="internal">Internal (NBI)</option>
        <option value="client">Client</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end">
      <input id="newUserName" placeholder="Display Name" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:140px">
      <input id="newUserEmail" placeholder="Email" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:160px">
      <div id="internalUserFields">
        <input id="newUserUsername" placeholder="Username" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:120px">
        <input id="newUserPw" type="password" placeholder="Password" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;width:120px">
        <select id="newUserRole" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem"><option value="member">Member</option><option value="admin">Admin</option></select>
      </div>
      <div id="clientUserFields" style="display:none">
        <select id="newUserClientScope" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem"><option value="">Select company...</option>${Object.values(_apiClientsCache).map(c => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('')}</select>
        <select id="newUserClientRole" style="padding:6px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem"><option value="member">Member</option><option value="admin">Admin</option></select>
      </div>
      <button class="btn btn--sm btn--primary" data-action="_actWithLoading" data-pass-el data-arg0="createUser">Create</button>
    </div>
  </div>`;
}
```

Update the `createUser` handler to read the type selector and submit accordingly.

- [ ] **Step 4: Test in browser**

Log in as admin, go to Settings > Team, verify the new Internal/Client selector works. Create a test client user. Log in as that user and verify tab scoping.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(frontend): settings scoping, client team management UI, user creation form replacement"
```

---

## Task 12: Frontend — Bug Tracker Source Column + Portfolio Scoping

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add Source column to Bug Tracker for NBI admins**

Find the bug tracker list rendering. Add a "Source" column that shows "Internal" or the client company name. Only show this column for NBI admin users:

```javascript
if (!isClientUser()) {
  // Add Source column header and cell
  headerRow += '<th>Source</th>';
  // In each row:
  const source = bug.source === 'client' ? (bug.reporter_client_name || 'Client') : 'Internal';
  row += `<td>${esc(source)}</td>`;
}
```

- [ ] **Step 2: Lock Portfolio sidebar for client users**

In the Portfolio view sidebar rendering, filter to show only the client user's company:

```javascript
if (isClientUser()) {
  // Only show their client card in the sidebar
  const myClient = Object.values(_apiClientsCache).find(c => c.id === _currentUser.clientId);
  // Render only this client's card
} else {
  // Existing: render all client cards
}
```

- [ ] **Step 3: Test in browser**

Verify Bug Tracker shows Source column for admin, doesn't show for client user. Verify Portfolio sidebar filtering.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(frontend): bug tracker source column, portfolio sidebar scoping for client users"
```

---

## Task 13: Final Verification + PM2 Restart

**Files:** None (verification only)

- [ ] **Step 1: Run full unit test suite**

```bash
cd dashboard-server && npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run E2E tests**

```bash
cd dashboard-server && npm run test:e2e
```

Expected: All E2E tests pass.

- [ ] **Step 3: Restart PM2**

```bash
pm2 restart nbi-dashboard
```

- [ ] **Step 4: Verify in browser as NBI admin**

Log into https://worksage.nbi-consulting.com as admin. Verify:
- All tabs visible
- Settings > Team has Internal/Client selector
- Bug Tracker has Source column
- All existing features work normally

- [ ] **Step 5: Create a test client user via Settings > Team**

Create a client user for an existing client company. Verify the invite email is sent (or logged if Graph API not configured).

- [ ] **Step 6: Log in as the client user**

- Verify forced password change modal appears
- Change password
- Verify only allowed tabs are visible (Portfolio, Projects, People, News, Bug Tracker, Settings)
- Verify client filter is locked
- Verify Portfolio shows only their client
- Verify People shows only their company's users
- Submit a test bug report and verify it appears in the Bug Tracker

- [ ] **Step 7: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: client portal — complete implementation"
```
