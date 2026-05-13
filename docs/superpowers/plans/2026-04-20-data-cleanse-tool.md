# Data Cleanse Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub "Clear All Tasks" button with a full admin-only Data Cleanse Tool that previews dependency impacts and executes transactional deletions in FK-safe order.

**Architecture:** Server-driven dependency graph. Two endpoints (`GET /api/admin/cleanse/preview` for live row counts and cascade metadata, `POST /api/admin/cleanse` for transactional deletion). Frontend renders a full-screen modal with checkboxes, cascade indicators, and typed confirmation. File cleanup happens after transaction commit.

**Tech Stack:** Node.js/Express (server.js), PostgreSQL (`pg` pool with dedicated connection for transactions), vanilla JS frontend (nbi_project_dashboard.html), Vitest + supertest for backend tests.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `dashboard-server/server.js` (insert before line 9088) | Two new endpoints: preview + execute |
| Modify | `nbi_project_dashboard.html` line 16560-16563 | Replace danger zone button |
| Modify | `nbi_project_dashboard.html` line 18817-18824 | Remove `clearAllTasks()`, add cleanse modal logic |
| Modify | `nbi_project_dashboard.html` line 10798-10807 | Remove `finResetData()` |
| Modify | `nbi_project_dashboard.html` line 11952 | Remove finance Reset button |
| Modify | `nbi_project_dashboard.html` (modal HTML area ~line 2385) | Add cleanse modal markup |
| Create | `dashboard-server/tests/unit/cleanse.test.mjs` | Endpoint tests |
| Modify | `dashboard-server/tests/helpers/fixtures.js` | Add `createTestContact`, `createTestExpense`, `createTestSow` |

---

## Task 1: Add Missing Test Fixtures

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Add `createTestContact` fixture**

```javascript
async function createTestContact(opts = {}) {
  const name = opts.name || uniq('TestContact');
  const { rows } = await pool.query(
    `INSERT INTO contacts (client_id, name, email, phone, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [opts.client_id || null, name, opts.email || `${name}@example.invalid`, opts.phone || null, opts.role || null]
  );
  return rows[0];
}
```

- [ ] **Step 2: Add `createTestExpense` fixture**

```javascript
async function createTestExpense(opts = {}) {
  const description = opts.description || uniq('TestExpense');
  const { rows } = await pool.query(
    `INSERT INTO expenses (user_id, description, amount, currency, category, date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [opts.user_id, description, opts.amount || 100, opts.currency || 'GBP', opts.category || 'Travel', opts.date || '2026-01-15']
  );
  return rows[0];
}
```

- [ ] **Step 3: Add `createTestSow` fixture**

```javascript
async function createTestSow(opts = {}) {
  const title = opts.title || uniq('TestSoW');
  const { rows } = await pool.query(
    `INSERT INTO sows (client_id, title, status, value, currency)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [opts.client_id || null, title, opts.status || 'draft', opts.value || 10000, opts.currency || 'GBP']
  );
  return rows[0];
}
```

- [ ] **Step 4: Add `createTestClientNote` fixture**

```javascript
async function createTestClientNote(opts = {}) {
  if (!opts.client_id) throw new Error('createTestClientNote: client_id required');
  const { rows } = await pool.query(
    `INSERT INTO client_notes (client_id, content, author)
     VALUES ($1, $2, $3) RETURNING *`,
    [opts.client_id, opts.content || 'Test note content', opts.author || 'test']
  );
  return rows[0];
}
```

- [ ] **Step 5: Export the new fixtures**

Add to the `module.exports` block at the bottom of `fixtures.js`:

```javascript
module.exports = {
  uniq,
  createTestUser,
  createTestClient,
  createTestTask,
  createTestBugReport,
  createTestCandidate,
  createTestLead,
  createTestLeadStage,
  createTestTeam,
  createTestTeamMember,
  createTestAuditEntry,
  createTestContact,
  createTestExpense,
  createTestSow,
  createTestClientNote,
};
```

- [ ] **Step 6: Run tests to verify no regressions**

Run: `cd dashboard-server && npm test`
Expected: All 186+ existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/tests/helpers/fixtures.js
git commit -m "test: add fixtures for contacts, expenses, sows, client notes"
```

---

## Task 2: Backend — Preview Endpoint

**Files:**
- Modify: `dashboard-server/server.js` (insert before line 9088, the `if (require.main === module)` block)
- Create: `dashboard-server/tests/unit/cleanse.test.mjs`

- [ ] **Step 1: Write failing tests for GET /api/admin/cleanse/preview**

Create `dashboard-server/tests/unit/cleanse.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask, createTestContact, createTestLead, createTestLeadStage, createTestExpense, createTestSow, createTestClientNote, createTestBugReport } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET /api/admin/cleanse/preview', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/cleanse/preview');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects client-portal users', async () => {
    const client = await createTestClient();
    const user = await createTestUser({ role: 'admin', client_id: client.id, client_role: 'admin' });
    const token = await mintSession(user.id);
    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns category list with correct counts', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    await createTestTask({ client_id: client.id });
    await createTestTask({ client_id: client.id });
    await createTestContact({ client_id: client.id });

    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const categories = res.body.data.categories;
    expect(Array.isArray(categories)).toBe(true);

    const tasksCat = categories.find(c => c.id === 'tasks');
    expect(tasksCat).toBeDefined();
    expect(tasksCat.count).toBe(2);
    expect(tasksCat.label).toBe('Projects & Tasks');

    const clientsCat = categories.find(c => c.id === 'clients');
    expect(clientsCat).toBeDefined();
    expect(clientsCat.count).toBe(1);
    expect(clientsCat.tier).toBe('nuclear');
    expect(clientsCat.cascades).toContain('contacts');
  });

  it('returns zero counts for empty categories', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const categories = res.body.data.categories;
    const tasksCat = categories.find(c => c.id === 'tasks');
    expect(tasksCat.count).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/cleanse.test.mjs`
Expected: FAIL — route not found (404).

- [ ] **Step 3: Implement the preview endpoint**

Insert this block in `dashboard-server/server.js` immediately before the line `if (require.main === module) {` (around line 9058):

```javascript
// ==================== DATA CLEANSE (ADMIN) ====================

const CLEANSE_CATEGORIES = [
  { id: 'tasks', label: 'Projects & Tasks', tier: 'standard', tables: ['tasks'], cascades: [], nullifies: [], childQueries: { task_notes: 'SELECT count(*) FROM task_notes', task_comments: 'SELECT count(*) FROM task_comments', task_attachments: 'SELECT count(*) FROM task_attachments', time_entries: 'SELECT count(*) FROM time_entries' } },
  { id: 'leads', label: 'Leads & Pipeline', tier: 'standard', tables: ['leads'], cascades: [], nullifies: [], childQueries: { lead_resources: 'SELECT count(*) FROM lead_resources', lead_activities: 'SELECT count(*) FROM lead_activities' } },
  { id: 'contacts', label: 'Contacts', tier: 'standard', tables: ['contacts'], cascades: [], nullifies: ['leads.primary_contact_id'], childQueries: {} },
  { id: 'client_notes', label: 'Client Notes', tier: 'standard', tables: ['client_notes'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'sows', label: 'SoWs', tier: 'standard', tables: ['sows'], cascades: [], nullifies: ['tasks.sow_id', 'hiring_positions.sow_id', 'teams.sow_id'], childQueries: {} },
  { id: 'expenses', label: 'Expenses', tier: 'standard', tables: ['expenses', 'expense_reports', 'expense_receipts'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'bugs', label: 'Bug Reports', tier: 'standard', tables: ['bug_reports'], cascades: [], nullifies: [], childQueries: { bug_report_comments: 'SELECT count(*) FROM bug_report_comments' } },
  { id: 'hiring', label: 'Hiring', tier: 'standard', tables: ['hiring_positions', 'candidates'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'calendar', label: 'Calendar Events', tier: 'standard', tables: ['calendar_events'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'finance', label: 'Finance Data', tier: 'standard', tables: ['finance_data'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'notifications', label: 'Notifications', tier: 'standard', tables: ['notifications'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'audit_log', label: 'Audit Log', tier: 'standard', tables: ['audit_log'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'clients', label: 'Clients', tier: 'nuclear', tables: ['clients'], cascades: ['contacts', 'leads', 'client_notes', 'sows'], nullifies: ['tasks.client_id', 'users.client_id', 'hiring_positions.client_id', 'candidates.client_id', 'calendar_events.client_id', 'bug_reports.reporter_client_id'], childQueries: { contacts: 'SELECT count(*) FROM contacts', leads: 'SELECT count(*) FROM leads', lead_resources: 'SELECT count(*) FROM lead_resources', lead_activities: 'SELECT count(*) FROM lead_activities', client_notes: 'SELECT count(*) FROM client_notes', sows: 'SELECT count(*) FROM sows', client_activity_log: 'SELECT count(*) FROM client_activity_log' } },
];

app.get('/api/admin/cleanse/preview', requireNBI, requireAdmin, async (req, res) => {
  try {
    const categories = [];
    for (const cat of CLEANSE_CATEGORIES) {
      const countResult = await pool.query(`SELECT count(*)::int AS n FROM ${cat.tables[0]}`);
      const count = countResult.rows[0].n;
      const children = {};
      for (const [key, sql] of Object.entries(cat.childQueries)) {
        const r = await pool.query(sql);
        children[key] = r.rows[0].count ? parseInt(r.rows[0].count, 10) : 0;
      }
      categories.push({
        id: cat.id,
        label: cat.label,
        tier: cat.tier,
        count,
        cascades: cat.cascades,
        nullifies: cat.nullifies,
        children,
      });
    }
    res.json({ categories });
  } catch (e) {
    log('error', 'Cleanse', 'Preview failed', { error: e.message });
    res.status(500).json({ error: 'Failed to generate cleanse preview' });
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/cleanse.test.mjs`
Expected: All 5 tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass (no regressions).

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/cleanse.test.mjs
git commit -m "feat(cleanse): add GET /api/admin/cleanse/preview endpoint with tests"
```

---

## Task 3: Backend — Execute Endpoint

**Files:**
- Modify: `dashboard-server/server.js` (append after preview endpoint)
- Modify: `dashboard-server/tests/unit/cleanse.test.mjs`

- [ ] **Step 1: Write failing tests for POST /api/admin/cleanse**

Append to `dashboard-server/tests/unit/cleanse.test.mjs`:

```javascript
describe('POST /api/admin/cleanse', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/admin/cleanse')
      .send({ categories: ['tasks'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(401);
  });

  it('rejects wrong confirmation string', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: ['tasks'], confirmation: 'wrong' });
    expect(res.status).toBe(400);
    expect(res.body.error.message || res.body.error).toMatch(/confirmation/i);
  });

  it('rejects empty categories array', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: [], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid category IDs', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: ['tasks', 'not_real'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(400);
    expect(res.body.error.message || res.body.error).toMatch(/not_real/);
  });

  it('deletes tasks and cascades to child tables', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const task = await createTestTask();
    await pool.query('INSERT INTO task_notes (task_id, content, author) VALUES ($1, $2, $3)', [task.id, 'note', 'test']);

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: ['tasks'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted.tasks).toBe(1);

    const remaining = await pool.query('SELECT count(*)::int AS n FROM tasks');
    expect(remaining.rows[0].n).toBe(0);
    const notes = await pool.query('SELECT count(*)::int AS n FROM task_notes');
    expect(notes.rows[0].n).toBe(0);
  });

  it('nullifies FK columns when contacts deleted without leads', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    const contact = await createTestContact({ client_id: client.id });
    const stage = await createTestLeadStage();
    await createTestLead({ client_id: client.id, stage_id: stage.id, primary_contact_id: contact.id });

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: ['contacts'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);

    const leads = await pool.query('SELECT primary_contact_id FROM leads');
    expect(leads.rows[0].primary_contact_id).toBeNull();
  });

  it('deletes clients and cascades all dependent categories', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    await createTestContact({ client_id: client.id });
    await createTestClientNote({ client_id: client.id });
    const stage = await createTestLeadStage();
    await createTestLead({ client_id: client.id, stage_id: stage.id });
    const task = await createTestTask({ client_id: client.id });

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: ['clients'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted.clients).toBe(1);
    expect(res.body.data.deleted.contacts).toBe(1);
    expect(res.body.data.deleted.leads).toBe(1);

    // Task should remain but with client_id nullified
    const tasks = await pool.query('SELECT client_id FROM tasks WHERE id = $1', [task.id]);
    expect(tasks.rows[0].client_id).toBeNull();
  });

  it('returns localStorageKeys in response', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    await createTestTask();

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: ['tasks'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.localStorageKeys)).toBe(true);
    expect(res.body.data.localStorageKeys).toContain('nbi_dashboard_tasks');
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

Run: `cd dashboard-server && npx vitest run tests/unit/cleanse.test.mjs`
Expected: FAIL — POST endpoint returns 404.

- [ ] **Step 3: Implement the execute endpoint**

Append after the preview endpoint in `server.js`:

```javascript
const VALID_CATEGORY_IDS = new Set(CLEANSE_CATEGORIES.map(c => c.id));
const CLEANSE_LOCAL_STORAGE_MAP = {
  tasks: ['nbi_dashboard_tasks', 'nbi_dashboard_briefs'],
  finance: ['nbi_finance_data'],
  clients: ['nbi_dashboard_tasks', 'nbi_dashboard_briefs', 'nbi_dashboard_settings'],
  leads: [],
  contacts: [],
  client_notes: [],
  sows: [],
  expenses: [],
  bugs: [],
  hiring: [],
  calendar: [],
  notifications: [],
  audit_log: [],
};

app.post('/api/admin/cleanse', requireNBI, requireAdmin, async (req, res) => {
  const { categories, confirmation } = req.body;

  if (confirmation !== 'DELETE ALL SELECTED DATA') {
    return res.status(400).json({ error: 'Invalid confirmation string. Must be exactly: DELETE ALL SELECTED DATA' });
  }
  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'At least one category must be selected' });
  }
  const invalid = categories.filter(c => !VALID_CATEGORY_IDS.has(c));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Invalid category IDs: ${invalid.join(', ')}` });
  }

  const selected = new Set(categories);
  // If clients selected, force-include cascaded categories
  if (selected.has('clients')) {
    for (const dep of ['contacts', 'leads', 'client_notes', 'sows']) {
      selected.add(dep);
    }
  }

  // Collect attachment filenames BEFORE the transaction (for post-commit file cleanup)
  let filesToDelete = [];
  try {
    if (selected.has('tasks')) {
      const { rows } = await pool.query('SELECT filename FROM task_attachments');
      filesToDelete.push(...rows.map(r => r.filename));
    }
    if (selected.has('expenses')) {
      const { rows } = await pool.query('SELECT filename FROM expense_receipts');
      filesToDelete.push(...rows.map(r => r.filename));
    }
  } catch (e) {
    log('warn', 'Cleanse', 'Failed to pre-query filenames', { error: e.message });
  }

  const conn = await pool.connect();
  const deleted = {};
  const nullified = {};

  try {
    await conn.query('BEGIN');

    // Step 1: client_activity_log (RESTRICT FK on clients)
    if (selected.has('clients')) {
      const r = await conn.query('DELETE FROM client_activity_log');
      deleted.client_activity_log = r.rowCount;
    }

    // Step 2: NULL bug_reports.reporter_client_id (RESTRICT FK on clients)
    if (selected.has('clients')) {
      const r = await conn.query('UPDATE bug_reports SET reporter_client_id = NULL WHERE reporter_client_id IS NOT NULL');
      nullified['bug_reports.reporter_client_id'] = r.rowCount;
    }

    // Step 3: Soft-ref attachments (entity_type based)
    if (selected.has('tasks') || selected.has('bugs')) {
      const types = [];
      if (selected.has('tasks')) types.push('task');
      if (selected.has('bugs')) types.push('bug_report');
      if (types.length > 0) {
        const r = await conn.query(`DELETE FROM attachments WHERE entity_type = ANY($1)`, [types]);
        if (r.rowCount > 0) deleted.attachments = (deleted.attachments || 0) + r.rowCount;
      }
    }

    // Step 4: NULL leads.primary_contact_id (if contacts selected without leads already being deleted)
    if (selected.has('contacts') && !selected.has('leads')) {
      const r = await conn.query('UPDATE leads SET primary_contact_id = NULL WHERE primary_contact_id IS NOT NULL');
      nullified['leads.primary_contact_id'] = r.rowCount;
    }

    // Steps 5-6: lead child tables
    if (selected.has('leads')) {
      const r1 = await conn.query('DELETE FROM lead_resources');
      deleted.lead_resources = r1.rowCount;
      const r2 = await conn.query('DELETE FROM lead_activities');
      deleted.lead_activities = r2.rowCount;
    }

    // Step 7: leads
    if (selected.has('leads')) {
      const r = await conn.query('DELETE FROM leads');
      deleted.leads = r.rowCount;
    }

    // Step 8: contacts
    if (selected.has('contacts')) {
      const r = await conn.query('DELETE FROM contacts');
      deleted.contacts = r.rowCount;
    }

    // Step 9: client_notes
    if (selected.has('client_notes')) {
      const r = await conn.query('DELETE FROM client_notes');
      deleted.client_notes = r.rowCount;
    }

    // Step 10-12: NULL sow FKs
    if (selected.has('sows')) {
      const r1 = await conn.query('UPDATE tasks SET sow_id = NULL WHERE sow_id IS NOT NULL');
      nullified['tasks.sow_id'] = r1.rowCount;
      const r2 = await conn.query('UPDATE hiring_positions SET sow_id = NULL WHERE sow_id IS NOT NULL');
      nullified['hiring_positions.sow_id'] = r2.rowCount;
      const r3 = await conn.query('UPDATE teams SET sow_id = NULL WHERE sow_id IS NOT NULL');
      nullified['teams.sow_id'] = r3.rowCount;
    }

    // Step 13: sows
    if (selected.has('sows')) {
      const r = await conn.query('DELETE FROM sows');
      deleted.sows = r.rowCount;
    }

    // Step 14: tasks (CASCADE handles task_notes, task_comments, task_attachments, time_entries)
    if (selected.has('tasks')) {
      const rNotes = await conn.query('SELECT count(*)::int AS n FROM task_notes');
      const rComments = await conn.query('SELECT count(*)::int AS n FROM task_comments');
      const rAttach = await conn.query('SELECT count(*)::int AS n FROM task_attachments');
      const rTime = await conn.query('SELECT count(*)::int AS n FROM time_entries');
      const r = await conn.query('DELETE FROM tasks');
      deleted.tasks = r.rowCount;
      deleted.task_notes = rNotes.rows[0].n;
      deleted.task_comments = rComments.rows[0].n;
      deleted.task_attachments = rAttach.rows[0].n;
      deleted.time_entries = rTime.rows[0].n;
    }

    // Step 15: clients (NULL FKs first, then delete)
    if (selected.has('clients')) {
      const r1 = await conn.query('UPDATE tasks SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['tasks.client_id'] = r1.rowCount;
      const r2 = await conn.query('UPDATE users SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['users.client_id'] = r2.rowCount;
      const r3 = await conn.query('UPDATE hiring_positions SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['hiring_positions.client_id'] = r3.rowCount;
      const r4 = await conn.query('UPDATE candidates SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['candidates.client_id'] = r4.rowCount;
      const r5 = await conn.query('UPDATE calendar_events SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['calendar_events.client_id'] = r5.rowCount;
      const r = await conn.query('DELETE FROM clients');
      deleted.clients = r.rowCount;
    }

    // Step 16-18: expenses
    if (selected.has('expenses')) {
      const r1 = await conn.query('DELETE FROM expense_receipts');
      deleted.expense_receipts = r1.rowCount;
      const r2 = await conn.query('DELETE FROM expenses');
      deleted.expenses = r2.rowCount;
      const r3 = await conn.query('DELETE FROM expense_reports');
      deleted.expense_reports = r3.rowCount;
    }

    // Step 19-20: bugs
    if (selected.has('bugs')) {
      const r1 = await conn.query('DELETE FROM bug_report_comments');
      deleted.bug_report_comments = r1.rowCount;
      const r2 = await conn.query('DELETE FROM bug_reports');
      deleted.bug_reports = r2.rowCount;
    }

    // Step 21-22: hiring
    if (selected.has('hiring')) {
      const r1 = await conn.query('DELETE FROM candidates');
      deleted.candidates = r1.rowCount;
      const r2 = await conn.query('DELETE FROM hiring_positions');
      deleted.hiring_positions = r2.rowCount;
    }

    // Step 23: calendar
    if (selected.has('calendar')) {
      const r = await conn.query('DELETE FROM calendar_events');
      deleted.calendar_events = r.rowCount;
    }

    // Step 24: finance_data
    if (selected.has('finance')) {
      const r = await conn.query('DELETE FROM finance_data');
      deleted.finance_data = r.rowCount;
    }

    // Step 25: notifications
    if (selected.has('notifications')) {
      const r = await conn.query('DELETE FROM notifications');
      deleted.notifications = r.rowCount;
    }

    // Step 26: audit_log
    if (selected.has('audit_log')) {
      const r = await conn.query('DELETE FROM audit_log');
      deleted.audit_log = r.rowCount;
    }

    await conn.query('COMMIT');
  } catch (e) {
    await conn.query('ROLLBACK');
    log('error', 'Cleanse', 'Transaction failed — rolled back', { error: e.message, stack: e.stack?.split('\n').slice(0, 3).join(' | ') });
    return res.status(500).json({ error: 'Cleanse failed — all changes rolled back. ' + e.message });
  } finally {
    conn.release();
  }

  // Post-commit: delete orphaned files from uploads/
  for (const filename of filesToDelete) {
    try {
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      log('warn', 'Cleanse', 'Failed to delete file', { filename, error: e.message });
    }
  }

  // Post-commit: audit log (only if audit_log was NOT deleted)
  if (!selected.has('audit_log')) {
    await auditLog('system', null, 'cleanse', req.user?.displayName || req.user?.username, { categories: [...selected], deleted });
  } else {
    log('info', 'Cleanse', 'Data cleanse completed (audit_log was included in deletion)', { categories: [...selected], deleted });
  }

  // Compute localStorage keys to clear on client
  const localStorageKeys = [...new Set(
    [...selected].flatMap(cat => CLEANSE_LOCAL_STORAGE_MAP[cat] || [])
  )];

  res.json({ deleted, nullified, localStorageKeys });
});
```

- [ ] **Step 4: Run cleanse tests**

Run: `cd dashboard-server && npx vitest run tests/unit/cleanse.test.mjs`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/cleanse.test.mjs
git commit -m "feat(cleanse): add POST /api/admin/cleanse endpoint with transactional deletion"
```

---

## Task 4: Frontend — Modal HTML and CSS

**Files:**
- Modify: `nbi_project_dashboard.html` (insert modal markup after the existing `importModal` div, around line 2399)

- [ ] **Step 1: Add the cleanse modal HTML**

Insert after the closing `</div>` of `importModal` (after line 2399):

```html
<div class="modal-overlay" id="cleanseModal" role="dialog" aria-modal="true" aria-labelledby="cleanseModalTitle">
  <div class="modal" style="width:min(700px, calc(100vw - 32px))">
    <div class="modal__title" id="cleanseModalTitle" style="color:var(--danger)">&#9888;&#65039; Data Cleanse Tool</div>
    <p style="margin:0 0 var(--space-lg);color:var(--text-muted);font-size:0.85rem">Select data categories to permanently delete. Config data (pipeline stages, expense categories, users, teams) is always preserved.</p>
    <div id="cleanseCategories" style="display:flex;flex-direction:column;gap:var(--space-sm)"></div>
    <hr style="border:none;border-top:2px solid var(--danger);margin:var(--space-lg) 0;opacity:0.4">
    <div id="cleanseNuclear"></div>
    <div style="margin-top:var(--space-lg);display:flex;gap:var(--space-sm)">
      <button class="btn btn--ghost" data-action="cleanseSelectAll" style="font-size:0.8rem">Select All</button>
      <button class="btn btn--ghost" data-action="cleanseDeselectAll" style="font-size:0.8rem">Deselect All</button>
    </div>
    <div style="margin-top:var(--space-lg)">
      <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:var(--space-xs)">Type <strong>DELETE ALL SELECTED DATA</strong> to confirm:</label>
      <input type="text" id="cleanseConfirmInput" class="input" style="width:100%" autocomplete="off" spellcheck="false">
    </div>
    <div style="display:flex;gap:var(--space-sm);justify-content:flex-end;margin-top:var(--space-lg)">
      <button class="btn" data-action="closeCleanseModal">Cancel</button>
      <button class="btn btn--danger" id="cleanseDeleteBtn" data-action="executeDataCleanse" disabled>Permanently Delete</button>
    </div>
    <div id="cleanseProgress" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.7);border-radius:var(--radius-xl);display:none;justify-content:center;align-items:center;flex-direction:column;gap:var(--space-md)">
      <div class="spinner"></div>
      <p style="color:#fff;font-size:0.9rem">Deleting&hellip; do not close this tab</p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verify the modal renders correctly by reading surrounding context**

The modal uses the same `.modal-overlay` / `.modal` CSS classes as the import modal (lines 843-869 in the CSS). No new CSS needed. The modal is hidden by default (no `.open` class).

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cleanse): add Data Cleanse modal HTML markup"
```

---

## Task 5: Frontend — Modal Logic (Open, Render, Interact, Execute)

**Files:**
- Modify: `nbi_project_dashboard.html`
  - Replace `clearAllTasks()` (line 18817-18824) with cleanse modal functions
  - Remove `finResetData()` (line 10798-10807)
  - Replace danger zone button (line 16560-16563)
  - Remove finance Reset button from line 11952

- [ ] **Step 1: Replace danger zone button**

Replace lines 16560-16563:

```javascript
    if (isAdmin) {
      html += `<div class="settings__group"><h2 style="color:var(--danger)">Danger Zone</h2>
        <button class="btn btn--danger" data-action="clearAllTasks">Clear All Tasks</button>
      </div>`;
    }
```

With:

```javascript
    if (isAdmin) {
      html += `<div class="settings__group"><h2 style="color:var(--danger)">Danger Zone</h2>
        <button class="btn btn--danger" data-action="openCleanseModal">Data Cleanse Tool</button>
      </div>`;
    }
```

- [ ] **Step 2: Remove the finance Reset button**

In line 11952, find the ternary that renders the Reset button:

```javascript
${isFinAdmin ? `<button class="btn btn--danger" data-action="finResetData" title="Admin only — wipes all financial data" aria-label="Reset financial data (admin only)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1v5h5"/><path d="M2.5 9A5.5 5.5 0 1 0 3 4L1 6"/></svg> Reset</button>` : ''}
```

Remove it entirely (replace with empty string `''`). The `isFinAdmin` variable and the surrounding `<div>` remain unchanged — only the Reset button ternary is removed.

- [ ] **Step 3: Remove `finResetData()` function**

Delete lines 10798-10807 (the full function body):

```javascript
async function finResetData() {
  if (!_currentUser || _currentUser.role !== 'admin') {
    toast('Admin only', 'error');
    return;
  }
  if (!(await themedConfirm('Reset all financial data to defaults? This cannot be undone.'))) return;
  localStorage.removeItem('nbi_finance_data');
  renderContent();
  toast('Financial data reset to defaults');
}
```

- [ ] **Step 4: Replace `clearAllTasks()` with Data Cleanse modal functions**

Replace lines 18817-18824 (the `clearAllTasks` function) with the full cleanse modal logic:

```javascript
let _cleanseData = null;

async function openCleanseModal() {
  const modal = document.getElementById('cleanseModal');
  modal.classList.add('open');
  document.getElementById('cleanseConfirmInput').value = '';
  document.getElementById('cleanseDeleteBtn').disabled = true;
  document.getElementById('cleanseProgress').style.display = 'none';
  document.getElementById('cleanseCategories').innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted)">Loading...</div>';
  document.getElementById('cleanseNuclear').innerHTML = '';

  try {
    const resp = await fetchAPI('/api/admin/cleanse/preview');
    if (!resp.ok) throw new Error('Failed to load preview');
    const json = await resp.json();
    _cleanseData = json.data ? json.data.categories : json.categories;
    renderCleanseCategories();
  } catch (e) {
    document.getElementById('cleanseCategories').innerHTML = `<p style="color:var(--danger)">Failed to load: ${e.message}</p>`;
  }
}

function renderCleanseCategories() {
  const standard = _cleanseData.filter(c => c.tier !== 'nuclear');
  const nuclear = _cleanseData.filter(c => c.tier === 'nuclear');

  let html = '';
  for (const cat of standard) {
    const childInfo = Object.entries(cat.children || {});
    const childText = childInfo.length > 0 ? ` <span style="font-size:0.75rem;color:var(--text-muted)">(+ ${childInfo.map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`).join(', ')})</span>` : '';
    const nullText = cat.nullifies.length > 0 ? `<div style="font-size:0.72rem;color:var(--warning);margin-left:24px">Will nullify: ${cat.nullifies.join(', ')}</div>` : '';
    html += `<label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer">
      <input type="checkbox" class="cleanse-cat-checkbox" data-cat-id="${cat.id}" ${cat._locked ? 'checked disabled' : ''}>
      <span><strong>${cat.label}</strong> <span style="color:var(--text-muted)">(${cat.count} records)</span>${childText}</span>
    </label>${nullText}`;
    if (cat._locked) {
      html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-left:24px;font-style:italic">Included in client deletion</div>`;
    }
  }
  document.getElementById('cleanseCategories').innerHTML = html;

  let nucHtml = '';
  for (const cat of nuclear) {
    const childInfo = Object.entries(cat.children || {});
    const childText = childInfo.length > 0 ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-left:24px">Cascades: ${childInfo.map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`).join(', ')}</div>` : '';
    nucHtml += `<label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer;color:var(--danger)">
      <input type="checkbox" class="cleanse-cat-checkbox" data-cat-id="${cat.id}">
      <span><strong>${cat.label}</strong> <span style="color:var(--text-muted)">(${cat.count} records)</span></span>
    </label>${childText}`;
    if (cat.nullifies.length > 0) {
      nucHtml += `<div style="font-size:0.72rem;color:var(--warning);margin-left:24px">Will nullify: ${cat.nullifies.join(', ')}</div>`;
    }
  }
  document.getElementById('cleanseNuclear').innerHTML = nucHtml;

  // Wire up change listeners
  document.querySelectorAll('.cleanse-cat-checkbox').forEach(cb => {
    cb.addEventListener('change', handleCleanseCheckboxChange);
  });
}

function handleCleanseCheckboxChange(e) {
  const catId = e.target.dataset.catId;
  const checked = e.target.checked;

  if (catId === 'clients') {
    const cascadeDeps = ['contacts', 'leads', 'client_notes', 'sows'];
    document.querySelectorAll('.cleanse-cat-checkbox').forEach(cb => {
      if (cascadeDeps.includes(cb.dataset.catId)) {
        cb.checked = checked;
        cb.disabled = checked;
        const cat = _cleanseData.find(c => c.id === cb.dataset.catId);
        if (cat) cat._locked = checked;
      }
    });
    renderCleanseCategories();
  }
}

function cleanseSelectAll() {
  document.querySelectorAll('.cleanse-cat-checkbox').forEach(cb => {
    cb.checked = true;
    cb.disabled = false;
  });
  // Lock client cascade deps
  const cascadeDeps = ['contacts', 'leads', 'client_notes', 'sows'];
  document.querySelectorAll('.cleanse-cat-checkbox').forEach(cb => {
    if (cascadeDeps.includes(cb.dataset.catId)) cb.disabled = true;
  });
}

function cleanseDeselectAll() {
  _cleanseData.forEach(c => { c._locked = false; });
  document.querySelectorAll('.cleanse-cat-checkbox').forEach(cb => {
    cb.checked = false;
    cb.disabled = false;
  });
}

function closeCleanseModal() {
  document.getElementById('cleanseModal').classList.remove('open');
  _cleanseData = null;
}

async function executeDataCleanse() {
  const selected = [];
  document.querySelectorAll('.cleanse-cat-checkbox:checked').forEach(cb => {
    selected.push(cb.dataset.catId);
  });
  if (selected.length === 0) { toast('No categories selected', 'error'); return; }

  const confirmation = document.getElementById('cleanseConfirmInput').value.trim();
  if (confirmation !== 'DELETE ALL SELECTED DATA') {
    toast('Confirmation text does not match', 'error');
    return;
  }

  document.getElementById('cleanseProgress').style.display = 'flex';
  document.querySelectorAll('#cleanseModal button, #cleanseModal input, #cleanseModal .cleanse-cat-checkbox').forEach(el => { el.disabled = true; });

  try {
    const resp = await fetchAPI('/api/admin/cleanse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: selected, confirmation }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error?.message || json.error || 'Cleanse failed');

    const result = json.data || json;
    // Clear localStorage keys
    if (result.localStorageKeys) {
      result.localStorageKeys.forEach(k => localStorage.removeItem(k));
    }

    closeCleanseModal();
    renderAll();

    const totalDeleted = Object.values(result.deleted).reduce((sum, n) => sum + n, 0);
    toast(`Data cleanse complete: ${totalDeleted} records deleted across ${selected.length} categories`);
  } catch (e) {
    document.getElementById('cleanseProgress').style.display = 'none';
    document.querySelectorAll('#cleanseModal button, #cleanseModal input').forEach(el => { el.disabled = false; });
    document.getElementById('cleanseDeleteBtn').disabled = true;
    toast('Cleanse failed — nothing was deleted. ' + e.message, 'error');
  }
}
```

- [ ] **Step 5: Add confirmation input listener**

Add after the `executeDataCleanse` function (still in the same code area):

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('cleanseConfirmInput');
  if (inp) {
    inp.addEventListener('input', () => {
      document.getElementById('cleanseDeleteBtn').disabled = inp.value.trim() !== 'DELETE ALL SELECTED DATA';
    });
  }
});
```

**Note:** If the app already has a single DOMContentLoaded listener or uses a different init pattern, append this logic to that existing listener instead. Check where the app initialises — look for the main DOMContentLoaded block and add the input listener there.

- [ ] **Step 6: Verify `data-action` dispatch handles the new action names**

The app uses `data-action` delegation. The functions must be globally accessible on `window` or matched by name. Confirm that the existing dispatch mechanism calls functions by their `data-action` name. The functions `openCleanseModal`, `closeCleanseModal`, `cleanseSelectAll`, `cleanseDeselectAll`, `executeDataCleanse` must be reachable from the dispatch handler. If the dispatch calls `window[actionName]()`, the functions are already global (defined at top-level in a `<script>` block). No additional wiring needed.

- [ ] **Step 7: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(cleanse): add Data Cleanse modal logic, remove clearAllTasks and finResetData"
```

---

## Task 6: Null-State Audit

**Files:**
- Modify: `nbi_project_dashboard.html` (various view render functions)

- [ ] **Step 1: Search for task.client_id rendering**

Search the frontend for where a task's client is displayed. Look for patterns like `task.client_name`, `task.client`, or lookups by `client_id`. The task card/row should show "(no client)" when `client_id` is null and the client lookup returns undefined.

- [ ] **Step 2: Verify leads with null primary_contact_id**

Search for where `lead.primary_contact_id` or contact name is rendered in the leads view. If null, should show "(contact removed)" instead of blank.

- [ ] **Step 3: Verify tasks with null sow_id**

Search for SoW display in task detail views. If `sow_id` is null, should show "(no SoW)" or simply omit the field gracefully.

- [ ] **Step 4: Fix any views that break on null FKs**

For each case found in steps 1-3, add a null-check fallback:
- `client_id = null` → display "(no client)"
- `primary_contact_id = null` → display "(contact removed)"
- `sow_id = null` → display "(no SoW)"
- `client_id = null` on hiring positions → display "(no client)"

Pattern: `${task.client_name || '<span style="color:var(--text-muted)">(no client)</span>'}` or equivalent.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix: null-state labels for cleansed FK references across views"
```

---

## Task 7: Integration Test and Final Verification

**Files:**
- Modify: `dashboard-server/tests/unit/cleanse.test.mjs` (add edge-case tests)

- [ ] **Step 1: Add test for multi-category deletion**

Append to the test file:

```javascript
it('handles multiple categories in one request', async () => {
  const admin = await createTestUser({ role: 'admin' });
  const token = await mintSession(admin.id);
  await createTestTask();
  const stage = await createTestLeadStage();
  await createTestLead({ stage_id: stage.id });

  const res = await request(app)
    .post('/api/admin/cleanse')
    .set('Authorization', `Bearer ${token}`)
    .send({ categories: ['tasks', 'leads'], confirmation: 'DELETE ALL SELECTED DATA' });
  expect(res.status).toBe(200);
  expect(res.body.data.deleted.tasks).toBeGreaterThan(0);
  expect(res.body.data.deleted.leads).toBeGreaterThan(0);

  const t = await pool.query('SELECT count(*)::int AS n FROM tasks');
  expect(t.rows[0].n).toBe(0);
  const l = await pool.query('SELECT count(*)::int AS n FROM leads');
  expect(l.rows[0].n).toBe(0);
});
```

- [ ] **Step 2: Add test for clients forcing cascade selection**

```javascript
it('clients category forces cascade of contacts, leads, client_notes, sows', async () => {
  const admin = await createTestUser({ role: 'admin' });
  const token = await mintSession(admin.id);
  const client = await createTestClient();
  await createTestContact({ client_id: client.id });
  await createTestSow({ client_id: client.id });

  const res = await request(app)
    .post('/api/admin/cleanse')
    .set('Authorization', `Bearer ${token}`)
    .send({ categories: ['clients'], confirmation: 'DELETE ALL SELECTED DATA' });
  expect(res.status).toBe(200);
  // Even though only 'clients' was sent, contacts and sows should be deleted
  expect(res.body.data.deleted.contacts).toBe(1);
  expect(res.body.data.deleted.sows).toBe(1);
});
```

- [ ] **Step 3: Run full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 4: Manual verification**

1. Start the server: `cd dashboard-server && npx pm2 restart nbi-dashboard-staging`
2. Open `http://localhost:8887/nbi_project_dashboard.html` in browser
3. Log in as admin (`glen` / `staging2026`)
4. Navigate to Settings tab → Danger Zone
5. Verify "Data Cleanse Tool" button appears (not "Clear All Tasks")
6. Click button → modal opens with category list and live counts
7. Tick "Projects & Tasks" → verify checkbox behaviour
8. Tick "Clients" → verify Contacts, Leads, Client Notes, SoWs auto-tick and lock
9. Untick "Clients" → verify cascaded categories unlock
10. Type "DELETE ALL SELECTED DATA" → verify button enables
11. Navigate to Finances → verify no "Reset" button exists
12. Execute a cleanse on staging with some test data → verify success toast and empty state

- [ ] **Step 5: Commit final tests**

```bash
git add dashboard-server/tests/unit/cleanse.test.mjs
git commit -m "test(cleanse): add multi-category and cascade integration tests"
```

---

## Task 8: Final Commit and Cleanup

- [ ] **Step 1: Run full test suite one more time**

Run: `cd dashboard-server && npm run test:all`
Expected: All Vitest and Playwright tests pass.

- [ ] **Step 2: Squash into feature commit (optional — ask Glen)**

If Glen prefers a single feature commit:

```bash
git rebase -i HEAD~7
# Squash all into one commit with message:
# feat: Data Cleanse Tool — admin-only transactional data deletion with preview
```

Otherwise, leave the incremental commits as-is.

- [ ] **Step 3: Restart PM2 production**

```bash
npx pm2 restart nbi-dashboard
```

- [ ] **Step 4: Update live_state/work_completed.md**

Append entry documenting the Data Cleanse Tool implementation.
