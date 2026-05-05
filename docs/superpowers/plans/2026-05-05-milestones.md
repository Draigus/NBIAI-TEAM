# Milestones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-level milestones with linked work items, a milestone detail panel, and real data powering the Portfolio "Upcoming Milestones" tile.

**Architecture:** New `milestones` + `milestone_items` tables. CRUD endpoints under `/api/clients/:clientId/milestones` and `/api/milestones/:id`. Client-side: milestones section in the client header, a sliding detail panel (reusing the queue-detail pattern), and the Portfolio tile replaced with real milestone data.

**Tech Stack:** PostgreSQL (migration), Express (server.js endpoints), vanilla JS (nbi_project_dashboard.html), Vitest (unit tests), supertest (HTTP assertions).

**Spec:** `docs/superpowers/specs/2026-05-05-milestones-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `dashboard-server/migrations/038_milestones.sql` | Schema: milestones + milestone_items tables |
| Modify | `dashboard-server/tests/helpers/db.js` | Add milestone tables to TRUNCATE_TABLES |
| Create | `dashboard-server/tests/helpers/fixtures.js` | Add `createTestMilestone` factory |
| Create | `dashboard-server/tests/unit/milestones.test.mjs` | API endpoint tests |
| Modify | `dashboard-server/server.js` | 4 API endpoints (CRUD) |
| Modify | `nbi_project_dashboard.html` | CSS, milestone cache, client header section, detail panel, portfolio tile |

---

### Task 1: Database Migration

**Files:**
- Create: `dashboard-server/migrations/038_milestones.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Milestones: client-level checkpoints with linked work items
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    target_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_client ON milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_milestones_target ON milestones(target_date);

CREATE TABLE IF NOT EXISTS milestone_items (
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (milestone_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_milestone_items_task ON milestone_items(task_id);
```

- [ ] **Step 2: Run the migration against the test database**

Run: `cd dashboard-server && node migrations/runner.js`
Expected: Migration 038 applied successfully.

- [ ] **Step 3: Verify tables exist**

Run: `cd dashboard-server && node -e "require('dotenv').config();const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT table_name FROM information_schema.tables WHERE table_name IN ('milestones','milestone_items')\").then(r=>{console.log(r.rows);p.end()})"`
Expected: Both tables listed.

- [ ] **Step 4: Commit**

```
git add dashboard-server/migrations/038_milestones.sql
git commit -m "feat: add milestones + milestone_items tables (migration 038)"
```

---

### Task 2: Test Helpers

**Files:**
- Modify: `dashboard-server/tests/helpers/db.js`
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Add milestone tables to TRUNCATE_TABLES in db.js**

In `dashboard-server/tests/helpers/db.js`, add `'milestone_items'` and `'milestones'` to the `TRUNCATE_TABLES` array. `milestone_items` must come BEFORE `milestones` (FK dependency). Insert them just above `'tasks'`:

```javascript
const TRUNCATE_TABLES = [
  'client_activity_log',
  'dashboard_snapshots',
  'bug_report_comments',
  'bug_reports',
  'task_notes',
  'audit_log',
  'notifications',
  'sessions',
  'password_reset_tokens',
  'task_queue',
  'milestone_items',
  'milestones',
  'tasks',
  // ... rest unchanged
];
```

- [ ] **Step 2: Add createTestMilestone factory to fixtures.js**

Add this function to `dashboard-server/tests/helpers/fixtures.js` before `module.exports`:

```javascript
/**
 * Create a milestone. Requires client_id.
 */
async function createTestMilestone(opts = {}) {
  if (!opts.client_id) throw new Error('createTestMilestone: client_id required');
  const title = opts.title || uniq('TestMilestone');
  const { rows } = await pool.query(
    `INSERT INTO milestones (client_id, title, description, target_date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [opts.client_id, title, opts.description || '', opts.target_date || '2026-12-31']
  );
  return rows[0];
}
```

Add `createTestMilestone` to the `module.exports` object.

- [ ] **Step 3: Commit**

```
git add dashboard-server/tests/helpers/db.js dashboard-server/tests/helpers/fixtures.js
git commit -m "test: add milestone test helpers and truncate config"
```

---

### Task 3: API Endpoint Tests

**Files:**
- Create: `dashboard-server/tests/unit/milestones.test.mjs`

- [ ] **Step 1: Write the test file**

```javascript
// dashboard-server/tests/unit/milestones.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask, createTestMilestone } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Milestones API', () => {
  let admin, adminToken, client1;

  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    adminToken = await mintSession(admin.id);
    client1 = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
  });

  // ---- LIST ----------------------------------------------------------------

  it('GET /api/clients/:clientId/milestones returns empty array initially', async () => {
    const res = await request(app)
      .get(`/api/clients/${client1.id}/milestones`)
      .set('Cookie', `sid=${adminToken}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('GET /api/clients/:clientId/milestones returns milestones with linked_item_ids', async () => {
    const ms = await createTestMilestone({ client_id: client1.id, title: 'Alpha Playtest', target_date: '2026-07-15' });
    const feat = await createTestTask({ client_id: client1.id, title: 'Core Gameplay', item_type: 'project' });
    await pool.query('INSERT INTO milestone_items (milestone_id, task_id) VALUES ($1, $2)', [ms.id, feat.id]);

    const res = await request(app)
      .get(`/api/clients/${client1.id}/milestones`)
      .set('Cookie', `sid=${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Alpha Playtest');
    expect(res.body[0].linked_item_ids).toEqual([feat.id]);
  });

  it('GET /api/clients/:clientId/milestones does not return milestones from other clients', async () => {
    const client2 = await createTestClient({ name: 'Other Studio' });
    await createTestMilestone({ client_id: client2.id, title: 'Other MS' });

    const res = await request(app)
      .get(`/api/clients/${client1.id}/milestones`)
      .set('Cookie', `sid=${adminToken}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  // ---- CREATE --------------------------------------------------------------

  it('POST /api/clients/:clientId/milestones creates a milestone', async () => {
    const res = await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Cookie', `sid=${adminToken}`)
      .send({ title: 'Beta Release', description: 'External beta', target_date: '2026-09-01' })
      .expect(201);

    expect(res.body.title).toBe('Beta Release');
    expect(res.body.description).toBe('External beta');
    expect(res.body.target_date).toContain('2026-09-01');
    expect(res.body.id).toBeTruthy();
    expect(res.body.linked_item_ids).toEqual([]);
  });

  it('POST /api/clients/:clientId/milestones creates with linked_item_ids', async () => {
    const feat = await createTestTask({ client_id: client1.id, title: 'Matchmaking', item_type: 'project' });
    const res = await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Cookie', `sid=${adminToken}`)
      .send({ title: 'Alpha', target_date: '2026-07-01', linked_item_ids: [feat.id] })
      .expect(201);

    expect(res.body.linked_item_ids).toEqual([feat.id]);
  });

  it('POST rejects missing title', async () => {
    await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Cookie', `sid=${adminToken}`)
      .send({ target_date: '2026-09-01' })
      .expect(400);
  });

  it('POST rejects missing target_date', async () => {
    await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Cookie', `sid=${adminToken}`)
      .send({ title: 'No Date' })
      .expect(400);
  });

  it('POST rejects invalid client ID', async () => {
    await request(app)
      .post('/api/clients/not-a-uuid/milestones')
      .set('Cookie', `sid=${adminToken}`)
      .send({ title: 'X', target_date: '2026-09-01' })
      .expect(400);
  });

  // ---- UPDATE --------------------------------------------------------------

  it('PUT /api/milestones/:id updates title and target_date', async () => {
    const ms = await createTestMilestone({ client_id: client1.id, title: 'Old Title', target_date: '2026-06-01' });

    const res = await request(app)
      .put(`/api/milestones/${ms.id}`)
      .set('Cookie', `sid=${adminToken}`)
      .send({ title: 'New Title', target_date: '2026-08-01' })
      .expect(200);

    expect(res.body.title).toBe('New Title');
    expect(res.body.target_date).toContain('2026-08-01');
  });

  it('PUT /api/milestones/:id replaces linked_item_ids', async () => {
    const ms = await createTestMilestone({ client_id: client1.id });
    const feat1 = await createTestTask({ client_id: client1.id, title: 'F1', item_type: 'project' });
    const feat2 = await createTestTask({ client_id: client1.id, title: 'F2', item_type: 'project' });
    await pool.query('INSERT INTO milestone_items (milestone_id, task_id) VALUES ($1, $2)', [ms.id, feat1.id]);

    const res = await request(app)
      .put(`/api/milestones/${ms.id}`)
      .set('Cookie', `sid=${adminToken}`)
      .send({ linked_item_ids: [feat2.id] })
      .expect(200);

    expect(res.body.linked_item_ids).toEqual([feat2.id]);
  });

  it('PUT returns 404 for nonexistent milestone', async () => {
    await request(app)
      .put('/api/milestones/00000000-0000-0000-0000-000000000000')
      .set('Cookie', `sid=${adminToken}`)
      .send({ title: 'X' })
      .expect(404);
  });

  // ---- DELETE --------------------------------------------------------------

  it('DELETE /api/milestones/:id removes the milestone', async () => {
    const ms = await createTestMilestone({ client_id: client1.id });

    await request(app)
      .delete(`/api/milestones/${ms.id}`)
      .set('Cookie', `sid=${adminToken}`)
      .expect(204);

    const check = await pool.query('SELECT id FROM milestones WHERE id = $1', [ms.id]);
    expect(check.rows).toHaveLength(0);
  });

  it('DELETE cascades to milestone_items', async () => {
    const ms = await createTestMilestone({ client_id: client1.id });
    const feat = await createTestTask({ client_id: client1.id, item_type: 'project' });
    await pool.query('INSERT INTO milestone_items (milestone_id, task_id) VALUES ($1, $2)', [ms.id, feat.id]);

    await request(app)
      .delete(`/api/milestones/${ms.id}`)
      .set('Cookie', `sid=${adminToken}`)
      .expect(204);

    const items = await pool.query('SELECT * FROM milestone_items WHERE milestone_id = $1', [ms.id]);
    expect(items.rows).toHaveLength(0);
  });

  it('DELETE returns 404 for nonexistent milestone', async () => {
    await request(app)
      .delete('/api/milestones/00000000-0000-0000-0000-000000000000')
      .set('Cookie', `sid=${adminToken}`)
      .expect(404);
  });

  // ---- AUTH ----------------------------------------------------------------

  it('all endpoints require authentication', async () => {
    await request(app).get(`/api/clients/${client1.id}/milestones`).expect(401);
    await request(app).post(`/api/clients/${client1.id}/milestones`).send({ title: 'X', target_date: '2026-01-01' }).expect(401);
  });

  it('POST/PUT/DELETE require admin role', async () => {
    const viewer = await createTestUser({ role: 'viewer' });
    const viewerToken = await mintSession(viewer.id);
    await request(app)
      .post(`/api/clients/${client1.id}/milestones`)
      .set('Cookie', `sid=${viewerToken}`)
      .send({ title: 'X', target_date: '2026-01-01' })
      .expect(403);
  });
});
```

- [ ] **Step 2: Run the tests — they should all fail (endpoints don't exist yet)**

Run: `cd dashboard-server && npx vitest run tests/unit/milestones.test.mjs`
Expected: All tests fail with 401/404 (no routes matched).

- [ ] **Step 3: Commit the failing tests**

```
git add dashboard-server/tests/unit/milestones.test.mjs
git commit -m "test: add milestone API endpoint tests (red)"
```

---

### Task 4: Server API Endpoints

**Files:**
- Modify: `dashboard-server/server.js` (insert after the DELETE `/api/clients/:id` block, around line 3588)

- [ ] **Step 1: Add the milestone CRUD endpoints**

Insert the following block in `server.js` after line 3588 (`app.delete('/api/clients/:id', ...)` closing brace), before the `// ==================== SOWs ====================` comment:

```javascript
// ==================== MILESTONES ====================
//
// Client-level checkpoints with linked work items.
// Milestones track delivery gates (e.g. Alpha, Beta, Launch).
// Completion status is computed client-side from linked items.

app.get('/api/clients/:clientId/milestones', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  const { clientId } = req.params;
  if (!isValidUuid(clientId)) return res.status(400).json({ error: 'Invalid client ID' });

  const { rows } = await pool.query(
    `SELECT m.*,
            COALESCE(array_agg(mi.task_id) FILTER (WHERE mi.task_id IS NOT NULL), '{}') AS linked_item_ids
     FROM milestones m
     LEFT JOIN milestone_items mi ON mi.milestone_id = m.id
     WHERE m.client_id = $1
     GROUP BY m.id
     ORDER BY m.target_date ASC`,
    [clientId]
  );
  res.json(rows);
});

app.post('/api/clients/:clientId/milestones', requireAdmin, async (req, res) => {
  const { clientId } = req.params;
  if (!isValidUuid(clientId)) return res.status(400).json({ error: 'Invalid client ID' });
  const { title, description, target_date, linked_item_ids } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  if (!target_date) return res.status(400).json({ error: 'target_date is required' });

  const client = await pool.query('SELECT id FROM clients WHERE id = $1', [clientId]);
  if (client.rows.length === 0) return res.status(404).json({ error: 'Client not found' });

  const { rows } = await pool.query(
    `INSERT INTO milestones (client_id, title, description, target_date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [clientId, title.trim(), description || '', target_date]
  );
  const ms = rows[0];

  if (Array.isArray(linked_item_ids) && linked_item_ids.length > 0) {
    const values = linked_item_ids.map((tid, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO milestone_items (milestone_id, task_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [ms.id, ...linked_item_ids]
    );
  }

  ms.linked_item_ids = linked_item_ids || [];
  res.status(201).json(ms);
});

app.put('/api/milestones/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid milestone ID' });

  const existing = await pool.query('SELECT * FROM milestones WHERE id = $1', [id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });

  const { title, description, target_date, linked_item_ids } = req.body;
  const updates = [];
  const vals = [];
  let idx = 1;

  if (title !== undefined) { updates.push(`title = $${idx++}`); vals.push(title.trim()); }
  if (description !== undefined) { updates.push(`description = $${idx++}`); vals.push(description); }
  if (target_date !== undefined) { updates.push(`target_date = $${idx++}`); vals.push(target_date); }

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`);
    vals.push(id);
    await pool.query(`UPDATE milestones SET ${updates.join(', ')} WHERE id = $${idx}`, vals);
  }

  if (Array.isArray(linked_item_ids)) {
    await pool.query('DELETE FROM milestone_items WHERE milestone_id = $1', [id]);
    if (linked_item_ids.length > 0) {
      const values = linked_item_ids.map((tid, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO milestone_items (milestone_id, task_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [id, ...linked_item_ids]
      );
    }
  }

  const { rows } = await pool.query(
    `SELECT m.*,
            COALESCE(array_agg(mi.task_id) FILTER (WHERE mi.task_id IS NOT NULL), '{}') AS linked_item_ids
     FROM milestones m
     LEFT JOIN milestone_items mi ON mi.milestone_id = m.id
     WHERE m.id = $1
     GROUP BY m.id`,
    [id]
  );
  res.json(rows[0]);
});

app.delete('/api/milestones/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid milestone ID' });

  const result = await pool.query('DELETE FROM milestones WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
  res.status(204).end();
});
```

- [ ] **Step 2: Run the milestone tests — they should all pass**

Run: `cd dashboard-server && npx vitest run tests/unit/milestones.test.mjs`
Expected: All tests pass.

- [ ] **Step 3: Run the full test suite to check for regressions**

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```
git add dashboard-server/server.js
git commit -m "feat: milestone CRUD API endpoints"
```

---

### Task 5: Run Migration on Production Database

- [ ] **Step 1: Run migration against production**

Run: `cd dashboard-server && node migrations/runner.js`
Expected: Migration 038 applied.

- [ ] **Step 2: Restart PM2**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Verify endpoints work via curl**

Run: `curl -s http://localhost:8888/api/clients/<any-client-id>/milestones` (will return 401 as expected since no auth)

---

### Task 6: Frontend — CSS for Milestone UI

**Files:**
- Modify: `nbi_project_dashboard.html` (CSS section, after the existing `.pf__milestone-*` styles around line 493)

- [ ] **Step 1: Add milestone detail panel and client milestone section CSS**

Insert after line 493 (after `.pf__milestone-abbr` styles):

```css
/* === MILESTONE DETAIL PANEL === */
.ms-detail-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: none; }
.ms-detail-panel { position: fixed; top: var(--header-h); right: 0; width: 520px; min-width: 320px; max-width: 80vw; height: calc(100dvh - var(--header-h)); background: var(--bg-raised); border-left: 1px solid var(--border-default); z-index: 201; overflow: hidden; display: none; flex-direction: column; }
.ms-detail-panel.open { display: flex; }
.ms-detail__header { padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); flex-shrink: 0; }
.ms-detail__body { padding: var(--space-lg); flex: 1; overflow-y: auto; min-height: 0; }
.ms-detail__section { margin-bottom: var(--space-lg); }
.ms-detail__section-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: var(--space-sm); font-weight: 600; }
.ms-detail__actions { padding: var(--space-md) var(--space-lg); border-top: 1px solid var(--border-default); display: flex; gap: var(--space-sm); background: var(--bg-raised); flex-shrink: 0; }
.ms-detail__linked-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--border-default); border-radius: var(--radius-md); margin-bottom: 4px; font-size: 0.78rem; }
.ms-detail__linked-item:hover { background: var(--bg-hover); }

/* === CLIENT MILESTONE CARDS === */
.client-ms-card { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 10px 12px; cursor: pointer; transition: background 0.15s; }
.client-ms-card:hover { background: var(--bg-hover); }
.client-ms-card__title { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
.client-ms-card__date { font-size: 0.7rem; color: var(--text-muted); }
.client-ms-card__bar { height: 4px; background: var(--border-subtle); border-radius: 2px; margin-top: 6px; overflow: hidden; }
.client-ms-card__fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.client-ms-card__status { font-size: 0.68rem; font-weight: 600; margin-top: 4px; }
```

Also add the mobile responsive rule (insert near the existing `.queue-detail-panel` mobile rule around line 1968):

```css
.ms-detail-panel { width: 100vw; max-width: 100vw; }
```

- [ ] **Step 2: Add the milestone detail panel HTML shells**

Insert the overlay + panel divs after the existing `queueDetailPanel` div (around line 2599):

```html
<div class="ms-detail-overlay" id="msDetailOverlay" data-action="closeMilestoneDetail"></div>
<div class="ms-detail-panel" id="msDetailPanel" role="dialog" aria-modal="true" aria-label="Milestone detail"></div>
```

- [ ] **Step 3: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat: milestone CSS and panel shells"
```

---

### Task 7: Frontend — Milestone Data Cache and API Functions

**Files:**
- Modify: `nbi_project_dashboard.html` (JS section)

- [ ] **Step 1: Add milestone cache and API functions**

Insert near the other cache variables (around line 2920, near `_portfolioSnapshots`):

```javascript
let _milestonesCache = {}; // keyed by client_id -> array of milestones

async function loadMilestones(clientId) {
  try {
    const data = await apiCall(`/api/clients/${clientId}/milestones`);
    _milestonesCache[clientId] = data || [];
  } catch (e) {
    _milestonesCache[clientId] = [];
  }
  return _milestonesCache[clientId];
}

async function loadAllMilestones() {
  const clients = Object.values(_apiClientsCache || {});
  const promises = clients.map(c => loadMilestones(c.id));
  await Promise.all(promises);
}

async function saveMilestone(clientId, milestone) {
  if (milestone.id) {
    const result = await apiCall(`/api/milestones/${milestone.id}`, { method: 'PUT', body: JSON.stringify(milestone) });
    await loadMilestones(clientId);
    return result;
  } else {
    const result = await apiCall(`/api/clients/${clientId}/milestones`, { method: 'POST', body: JSON.stringify(milestone) });
    await loadMilestones(clientId);
    return result;
  }
}

async function deleteMilestone(clientId, milestoneId) {
  await apiCall(`/api/milestones/${milestoneId}`, { method: 'DELETE' });
  await loadMilestones(clientId);
}

function computeMilestoneStatus(ms, allTasks) {
  const linked = (ms.linked_item_ids || []).map(id => allTasks.find(t => t.id === id)).filter(Boolean);
  if (linked.length === 0) return { pct: 0, total: 0, done: 0, status: 'On Track' };
  const allItems = [];
  linked.forEach(item => {
    allItems.push(item);
    const desc = getDescendants(item.id);
    desc.forEach(d => allItems.push(d));
  });
  const seen = new Set();
  const unique = allItems.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  const total = unique.length;
  const done = unique.filter(t => t.status === 'Done').length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  if (pct === 100) return { pct, total, done, status: 'Complete' };
  const now = new Date(); now.setHours(0,0,0,0);
  const target = safeParseDate(ms.target_date);
  if (target && target < now) return { pct, total, done, status: 'Overdue' };
  const hasRisk = unique.some(t => t.healthState === 'Red' || t.healthState === 'Blocked' || t.status === 'Blocked');
  const daysLeft = target ? Math.ceil((target - now) / 86400000) : 999;
  if (hasRisk || (daysLeft <= 14 && pct < 80)) return { pct, total, done, status: 'At Risk' };
  return { pct, total, done, status: 'On Track' };
}
```

- [ ] **Step 2: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat: milestone cache, API functions, and status computation"
```

---

### Task 8: Frontend — Milestones Section in Client Header

**Files:**
- Modify: `nbi_project_dashboard.html` (inside `renderClientProfileHeader` function, around line 4422)

- [ ] **Step 1: Add milestone rendering to the client header**

Find the `renderClientProfileHeader` function. After the expandable profile section closes (after the meeting notes/client notes section), but before the final closing `</div>` of the `client-header` div, add a milestones section.

Create a new function `renderClientMilestones(clientName)` that:

```javascript
function renderClientMilestones(clientName) {
  const clientObj = _apiClientsCache[clientName];
  if (!clientObj) return '';
  const milestones = _milestonesCache[clientObj.id] || [];

  let html = '<div style="margin-top:12px;border-top:1px solid var(--border-default);padding-top:12px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html += '<span style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted)">Milestones</span>';
  html += `<button class="btn btn--sm" data-action="openMilestoneDetail" data-arg0="${esc(clientObj.id)}" data-arg1="new" data-stop style="font-size:0.68rem">+ Add</button>`;
  html += '</div>';

  if (milestones.length === 0) {
    html += '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.78rem;border:1px dashed var(--border-default);border-radius:var(--radius-md)">No milestones set. Add one to track delivery gates.</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:6px">';
    milestones.forEach(ms => {
      const info = computeMilestoneStatus(ms, tasks);
      const statusCol = info.status === 'Complete' ? 'var(--success)' : info.status === 'Overdue' ? 'var(--danger)' : info.status === 'At Risk' ? 'var(--warning)' : 'var(--success)';
      const dateStr = ms.target_date ? new Date(ms.target_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      html += `<div class="client-ms-card" data-action="openMilestoneDetail" data-arg0="${esc(clientObj.id)}" data-arg1="${ms.id}" data-stop>`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center">`;
      html += `<div class="client-ms-card__title">${esc(ms.title)}</div>`;
      html += `<div class="client-ms-card__date">${dateStr}</div>`;
      html += `</div>`;
      html += `<div class="client-ms-card__bar"><div class="client-ms-card__fill" style="width:${info.pct}%;background:${statusCol}"></div></div>`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">`;
      html += `<div class="client-ms-card__status" style="color:${statusCol}">${info.status}</div>`;
      html += `<div style="font-size:0.65rem;color:var(--text-muted)">${info.done}/${info.total} items</div>`;
      html += `</div></div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}
```

Then call `renderClientMilestones(currentFilter.client)` from inside `renderClientProfileHeader`, appending its output before the closing `</div>` of the `client-header` div.

Also trigger `loadMilestones(clientObj.id)` when the client view loads. In the dashboard rendering code, when `currentFilter.client` is set, call `loadMilestones` if not already cached:

```javascript
if (currentFilter.client) {
  const clientObj = _apiClientsCache[currentFilter.client];
  if (clientObj && !_milestonesCache[clientObj.id]) {
    loadMilestones(clientObj.id).then(() => renderContent());
  }
}
```

- [ ] **Step 2: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat: milestones section in client header view"
```

---

### Task 9: Frontend — Milestone Detail Panel

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Implement openMilestoneDetail and closeMilestoneDetail**

Add the following functions:

```javascript
let _msDetailClientId = null;
let _msDetailMilestone = null;

function closeMilestoneDetail() {
  _msDetailClientId = null;
  _msDetailMilestone = null;
  const overlay = document.getElementById('msDetailOverlay');
  const panel = document.getElementById('msDetailPanel');
  if (overlay) overlay.style.display = 'none';
  if (panel) { panel.classList.remove('open'); panel.innerHTML = ''; }
  if (window._msDetailEscHandler) {
    document.removeEventListener('keydown', window._msDetailEscHandler);
    window._msDetailEscHandler = null;
  }
}

function openMilestoneDetail(clientId, milestoneIdOrNew) {
  _msDetailClientId = clientId;
  const isNew = milestoneIdOrNew === 'new';
  const milestones = _milestonesCache[clientId] || [];
  _msDetailMilestone = isNew
    ? { id: null, title: '', description: '', target_date: '', linked_item_ids: [] }
    : milestones.find(m => m.id === milestoneIdOrNew) || null;

  if (!_msDetailMilestone) return;

  const overlay = document.getElementById('msDetailOverlay');
  const panel = document.getElementById('msDetailPanel');
  if (overlay) overlay.style.display = 'block';
  if (panel) panel.classList.add('open');

  _renderMilestoneDetailPanel();

  if (window._msDetailEscHandler) document.removeEventListener('keydown', window._msDetailEscHandler);
  window._msDetailEscHandler = (e) => { if (e.key === 'Escape') closeMilestoneDetail(); };
  document.addEventListener('keydown', window._msDetailEscHandler);
}

function _renderMilestoneDetailPanel() {
  const panel = document.getElementById('msDetailPanel');
  if (!panel || !_msDetailMilestone) return;
  const ms = _msDetailMilestone;
  const isNew = !ms.id;
  const info = computeMilestoneStatus(ms, tasks);
  const statusCol = info.status === 'Complete' ? 'var(--success)' : info.status === 'Overdue' ? 'var(--danger)' : info.status === 'At Risk' ? 'var(--warning)' : 'var(--success)';

  let html = `<div class="ms-detail__header">
    <div style="flex:1"><input id="msTitle" type="text" value="${escAttr(ms.title)}" placeholder="Milestone title" style="font-size:1.1rem;font-weight:700;background:none;border:none;color:var(--text-primary);width:100%;outline:none;font-family:var(--font-display)"></div>
    <button class="btn btn--sm btn--ghost" data-action="closeMilestoneDetail">&times;</button>
  </div>`;

  html += '<div class="ms-detail__body">';

  // Target date
  html += `<div class="ms-detail__section">
    <div class="ms-detail__section-title">Target Date</div>
    <input id="msTargetDate" type="date" value="${ms.target_date || ''}" style="padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.85rem;width:100%">
  </div>`;

  // Description
  html += `<div class="ms-detail__section">
    <div class="ms-detail__section-title">Description</div>
    <textarea id="msDescription" rows="3" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem;resize:vertical;font-family:var(--font-body)">${esc(ms.description || '')}</textarea>
  </div>`;

  // Status (read-only, only for existing milestones)
  if (!isNew) {
    html += `<div class="ms-detail__section">
      <div class="ms-detail__section-title">Status</div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:0.85rem;font-weight:700;color:${statusCol}">${info.status}</span>
        <span style="font-size:0.78rem;color:var(--text-muted)">${info.done} of ${info.total} items complete — ${info.pct}%</span>
      </div>
      <div style="height:6px;background:var(--border-subtle);border-radius:3px;margin-top:8px;overflow:hidden">
        <div style="height:100%;width:${info.pct}%;background:${statusCol};border-radius:3px"></div>
      </div>
    </div>`;
  }

  // Linked items
  html += `<div class="ms-detail__section">
    <div class="ms-detail__section-title">Linked Items</div>`;
  const linked = (ms.linked_item_ids || []).map(id => tasks.find(t => t.id === id)).filter(Boolean);
  if (linked.length === 0) {
    html += '<div style="padding:8px;color:var(--text-muted);font-size:0.78rem;border:1px dashed var(--border-default);border-radius:var(--radius-md)">No items linked yet. Use the picker below to add features or stories.</div>';
  } else {
    linked.forEach(t => {
      const typeBadge = t.itemType === 'project' ? 'PR' : t.itemType === 'feature' ? 'FT' : t.itemType === 'story' ? 'ST' : 'TK';
      const desc = getDescendants(t.id);
      const allItems = [t, ...desc];
      const doneCount = allItems.filter(d => d.status === 'Done').length;
      html += `<div class="ms-detail__linked-item">
        <span style="font-size:0.62rem;font-weight:700;letter-spacing:0.06em;color:var(--text-muted);background:var(--bg-input);padding:1px 4px;border-radius:3px">${typeBadge}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span>
        <span style="font-size:0.68rem;color:var(--text-muted)">${doneCount}/${allItems.length}</span>
        <button class="btn btn--sm btn--ghost" onclick="_msRemoveLinkedItem('${t.id}')" style="font-size:0.7rem;color:var(--danger);padding:2px 4px">&times;</button>
      </div>`;
    });
  }

  // Item picker
  const clientTasks = tasks.filter(t => {
    const tc = getTaskClient(t);
    const clientObj = Object.values(_apiClientsCache || {}).find(c => c.id === _msDetailClientId);
    return clientObj && tc === clientObj.name && (t.itemType === 'project' || t.itemType === 'feature' || t.itemType === 'story') && t.status !== 'Done' && t.status !== 'Cancelled';
  });
  const alreadyLinked = new Set(ms.linked_item_ids || []);
  const available = clientTasks.filter(t => !alreadyLinked.has(t.id));

  if (available.length > 0) {
    html += `<select id="msItemPicker" onchange="_msAddLinkedItem(this.value);this.value=''" style="margin-top:8px;width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:0.82rem">`;
    html += '<option value="">+ Link a feature or story...</option>';
    available.forEach(t => {
      const typeBadge = t.itemType === 'project' ? 'PR' : t.itemType === 'feature' ? 'FT' : t.itemType === 'story' ? 'ST' : 'TK';
      html += `<option value="${t.id}">[${typeBadge}] ${esc(t.title)}</option>`;
    });
    html += '</select>';
  }
  html += '</div>';

  html += '</div>';

  // Actions
  html += `<div class="ms-detail__actions">
    <button class="btn btn--primary" onclick="_msSave()" style="flex:1">${isNew ? 'Create Milestone' : 'Save Changes'}</button>`;
  if (!isNew) {
    html += `<button class="btn btn--danger" onclick="_msDelete()">Delete</button>`;
  }
  html += `<button class="btn" onclick="closeMilestoneDetail()">Cancel</button>
  </div>`;

  panel.innerHTML = html;
}

function _msAddLinkedItem(taskId) {
  if (!taskId || !_msDetailMilestone) return;
  const ids = _msDetailMilestone.linked_item_ids || [];
  if (!ids.includes(taskId)) {
    _msDetailMilestone.linked_item_ids = [...ids, taskId];
    _renderMilestoneDetailPanel();
  }
}

function _msRemoveLinkedItem(taskId) {
  if (!_msDetailMilestone) return;
  _msDetailMilestone.linked_item_ids = (_msDetailMilestone.linked_item_ids || []).filter(id => id !== taskId);
  _renderMilestoneDetailPanel();
}

async function _msSave() {
  if (!_msDetailMilestone || !_msDetailClientId) return;
  const titleEl = document.getElementById('msTitle');
  const dateEl = document.getElementById('msTargetDate');
  const descEl = document.getElementById('msDescription');
  if (titleEl) _msDetailMilestone.title = titleEl.value;
  if (dateEl) _msDetailMilestone.target_date = dateEl.value;
  if (descEl) _msDetailMilestone.description = descEl.value;

  if (!_msDetailMilestone.title || !_msDetailMilestone.target_date) {
    alert('Title and target date are required.');
    return;
  }

  await saveMilestone(_msDetailClientId, _msDetailMilestone);
  closeMilestoneDetail();
  renderContent();
}

async function _msDelete() {
  if (!_msDetailMilestone || !_msDetailMilestone.id || !_msDetailClientId) return;
  if (!confirm('Delete this milestone? This cannot be undone.')) return;
  await deleteMilestone(_msDetailClientId, _msDetailMilestone.id);
  closeMilestoneDetail();
  renderContent();
}
```

- [ ] **Step 2: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat: milestone detail panel with CRUD and item linking"
```

---

### Task 10: Frontend — Replace Portfolio Upcoming Milestones Panel

**Files:**
- Modify: `nbi_project_dashboard.html` (replace `renderPfMilestones` function)

- [ ] **Step 1: Replace the renderPfMilestones function**

Replace the existing `renderPfMilestones` function (starts around line 5248) with a new version that uses real milestone data:

```javascript
function renderPfMilestones(panelRoots, now) {
  // Collect all milestones across cached clients
  const allMilestones = [];
  Object.entries(_milestonesCache).forEach(([clientId, milestones]) => {
    const clientObj = Object.values(_apiClientsCache || {}).find(c => c.id === clientId);
    const clientName = clientObj ? clientObj.name : '';
    milestones.forEach(ms => {
      allMilestones.push({ ...ms, _clientName: clientName });
    });
  });

  // Filter to selected client if applicable
  const filtered = _portfolioSelectedClient
    ? allMilestones.filter(ms => ms._clientName === _portfolioSelectedClient)
    : allMilestones;

  // Sort by target_date ascending
  filtered.sort((a, b) => {
    const da = safeParseDate(a.target_date) || new Date(9999, 0);
    const db = safeParseDate(b.target_date) || new Date(9999, 0);
    return da - db;
  });

  const items = filtered.slice(0, 8);

  let html = '<div class="pf__panel">';
  html += '<div class="pf__panel-hdr"><div class="pf__panel-title">UPCOMING MILESTONES</div></div>';
  html += '<div class="pf__panel-body">';

  if (items.length === 0) {
    html += '<div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-muted);font-size:0.82rem">No milestones set.</div>';
  } else {
    items.forEach(ms => {
      const info = computeMilestoneStatus(ms, tasks);
      const target = safeParseDate(ms.target_date);
      const isOverdue = target && target < now;
      const daysUntil = target ? Math.ceil((target - now) / 86400000) : null;

      const barCol = info.status === 'Complete' ? 'var(--success)' : info.status === 'Overdue' ? 'var(--danger)' : info.status === 'At Risk' ? 'var(--warning)' : 'var(--success)';
      const abbr = getClientAbbreviation(ms._clientName);
      const abbrCol = isOverdue ? 'var(--danger)' : 'var(--accent)';

      let statusText, statusCol;
      if (info.status === 'Complete') {
        statusText = 'Complete'; statusCol = 'var(--success)';
      } else if (isOverdue) {
        statusText = Math.abs(daysUntil) + 'd overdue'; statusCol = 'var(--danger)';
      } else if (daysUntil === 0) {
        statusText = 'Due today'; statusCol = 'var(--danger)';
      } else if (daysUntil === 1) {
        statusText = 'Due tomorrow'; statusCol = 'var(--warning)';
      } else if (daysUntil <= 7) {
        statusText = daysUntil + 'd left'; statusCol = 'var(--warning)';
      } else {
        statusText = 'On track'; statusCol = 'var(--success)';
      }
      const dateStr = target ? target.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
      const clientObj = Object.values(_apiClientsCache || {}).find(c => c.name === ms._clientName);
      const clientId = clientObj ? clientObj.id : '';

      html += `<div class="pf__milestone-item" data-action="openMilestoneDetail" data-arg0="${clientId}" data-arg1="${ms.id}">`;
      html += `<div class="pf__milestone-bar" style="background:${barCol}"></div>`;
      html += `<div style="flex:1;min-width:0">`;
      html += `<div class="pf__milestone-title"><span class="pf__milestone-abbr" style="color:${abbrCol}">${esc(abbr)}</span> - ${esc(ms.title)}</div>`;
      html += `<div class="pf__milestone-sub">${info.done}/${info.total} items · ${info.pct}%</div>`;
      html += `</div>`;
      html += `<div style="text-align:right">`;
      html += `<div class="pf__milestone-status" style="color:${statusCol}">${statusText}</div>`;
      html += `<div class="pf__milestone-date">${dateStr}</div>`;
      html += `</div></div>`;
    });
  }

  html += '</div></div>';
  return html;
}
```

- [ ] **Step 2: Trigger loadAllMilestones on portfolio dashboard render**

In the `renderDashboardView` function (around line 4687 where `_portfolioSnapshots` is loaded), add milestone loading:

Find the block:
```javascript
if (!_portfolioSnapshots) {
```

And after its closing brace, add:

```javascript
if (Object.keys(_milestonesCache).length === 0) {
  loadAllMilestones().then(() => renderContent());
  return '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading milestones...</div>';
}
```

- [ ] **Step 3: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat: replace portfolio milestones panel with real milestone data"
```

---

### Task 11: Integration Test and PM2 Restart

- [ ] **Step 1: Run the full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass (including the new milestone tests).

- [ ] **Step 2: Restart PM2**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Verify in browser**

Open https://worksage.nbi-consulting.com, navigate to a client view, confirm the Milestones section appears. Create a test milestone, link items, verify the Portfolio panel shows it.

- [ ] **Step 4: Final commit if any adjustments were needed**

```
git add -A
git commit -m "fix: milestone integration adjustments"
```
