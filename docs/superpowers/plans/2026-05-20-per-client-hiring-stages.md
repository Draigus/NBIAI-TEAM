# Per-Client Hiring Stages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each client to have custom hiring pipeline stages on the kanban board, with a gear icon editor for NBI admins.

**Architecture:** New `hiring_stages` JSONB column on `clients` table. Server resolves stages per client (custom or global default). Frontend caches resolved stages per client and renders kanban/detail from them. Global default updated to add `onboarded` as terminal stage.

**Tech Stack:** Node.js/Express, PostgreSQL, vanilla JS frontend (nbi_project_dashboard.html)

---

### Task 1: Database Migration

**Files:**
- Create: `dashboard-server/migrations/046_per_client_hiring_stages.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Per-client hiring stages: each client can define custom kanban stages.
-- NULL = use global default. Value is a JSONB array of {key, label} objects.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hiring_stages JSONB DEFAULT NULL;
```

- [ ] **Step 2: Run the migration**

Run: `cd dashboard-server && npm run init-db`
Expected: Migration 046 applied, no errors.

- [ ] **Step 3: Verify column exists**

Run: `node -e "require('dotenv').config(); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='clients' AND column_name='hiring_stages'\").then(r=>{console.log(r.rows);p.end()})"`
Expected: `[{ column_name: 'hiring_stages', data_type: 'jsonb' }]`

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/migrations/046_per_client_hiring_stages.sql
git commit -m "feat(hiring): add hiring_stages column to clients table"
```

---

### Task 2: Server — Global Default Update + Stage Resolution Helper

**Files:**
- Modify: `dashboard-server/routes/hiring.js:32-38`

- [ ] **Step 1: Write test for stage resolution**

Create `dashboard-server/tests/unit/hiring-stages-resolution.test.mjs`:

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

describe('Hiring stages resolution', () => {
  it('returns global default when client has no custom stages', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.isCustom).toBe(false);
    expect(res.body.stages).toEqual([
      { key: 'sourcing', label: 'Sourcing' },
      { key: 'interviews', label: 'Interviews' },
      { key: 'offer', label: 'Offer' },
      { key: 'onboarding', label: 'Onboarding' },
      { key: 'hired', label: 'Hired' },
      { key: 'onboarded', label: 'Onboarded' },
    ]);
  });

  it('returns custom stages when client has them configured', async () => {
    const customStages = [
      { key: 'cv-review', label: 'CV Review' },
      { key: 'interview', label: 'Interview' },
      { key: 'hired', label: 'Hired' },
      { key: 'onboarded', label: 'Onboarded' },
    ];
    const client = await createTestClient({ name: 'CustomCorp' });
    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [JSON.stringify(customStages), client.id]);
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.isCustom).toBe(true);
    expect(res.body.stages).toEqual(customStages);
  });

  it('client user can access their own stages', async () => {
    const client = await createTestClient({ name: 'ClientCorp' });
    const user = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(user.id);

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.stages.length).toBeGreaterThan(0);
  });

  it('client user cannot access another client stages', async () => {
    const clientA = await createTestClient({ name: 'CorpA' });
    const clientB = await createTestClient({ name: 'CorpB' });
    const user = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(user.id);

    await request(app)
      .get(`/api/clients/${clientB.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-stages-resolution.test.mjs`
Expected: FAIL — endpoint not found (404)

- [ ] **Step 3: Update global default and add GET endpoint**

In `dashboard-server/routes/hiring.js`, replace lines 32-38:

```javascript
  const DEFAULT_HIRING_STAGES = [
    { key: 'sourcing', label: 'Sourcing' },
    { key: 'interviews', label: 'Interviews' },
    { key: 'offer', label: 'Offer' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'hired', label: 'Hired' },
    { key: 'onboarded', label: 'Onboarded' },
  ];

  const HIRING_STAGES = DEFAULT_HIRING_STAGES.map(s => s.key);

  async function getStagesForClient(clientId) {
    if (!clientId) return { stages: DEFAULT_HIRING_STAGES, isCustom: false };
    const { rows } = await pool.query('SELECT hiring_stages FROM clients WHERE id = $1', [clientId]);
    if (rows.length && Array.isArray(rows[0].hiring_stages) && rows[0].hiring_stages.length >= 2) {
      return { stages: rows[0].hiring_stages, isCustom: true };
    }
    return { stages: DEFAULT_HIRING_STAGES, isCustom: false };
  }

  function stageKeysForClient(resolved) {
    return resolved.stages.map(s => s.key);
  }

  /** GET /api/clients/:id/hiring-stages */
  router.get('/api/clients/:id/hiring-stages', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    if (req.user.clientId && req.user.clientId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    try {
      const result = await getStagesForClient(req.params.id);
      res.json(result);
    } catch (e) {
      log('error', 'Hiring', 'Failed to get hiring stages', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-stages-resolution.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/hiring-stages-resolution.test.mjs
git commit -m "feat(hiring): global default update + GET /api/clients/:id/hiring-stages"
```

---

### Task 3: Server — PUT and DELETE Endpoints for Stage Configuration

**Files:**
- Modify: `dashboard-server/routes/hiring.js`
- Modify: `dashboard-server/tests/unit/hiring-stages-resolution.test.mjs`

- [ ] **Step 1: Add tests for PUT and DELETE**

Append to `hiring-stages-resolution.test.mjs`:

```javascript
describe('PUT /api/clients/:id/hiring-stages', () => {
  it('admin can save custom stages', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const stages = [
      { key: 'sourcing', label: 'Sourcing' },
      { key: 'technical', label: 'Technical Test' },
      { key: 'offer', label: 'Offer' },
      { key: 'onboarded', label: 'Onboarded' },
    ];

    const res = await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages })
      .expect(200);

    expect(res.body.stages).toEqual(stages);
  });

  it('rejects stages without onboarded as last entry', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [{ key: 'sourcing', label: 'Sourcing' }, { key: 'hired', label: 'Hired' }] })
      .expect(400);
  });

  it('rejects fewer than 2 stages', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [{ key: 'onboarded', label: 'Onboarded' }] })
      .expect(400);
  });

  it('rejects duplicate keys', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [{ key: 'a', label: 'A' }, { key: 'a', label: 'B' }, { key: 'onboarded', label: 'Onboarded' }] })
      .expect(400);
  });

  it('client user cannot save stages', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const user = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(user.id);

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [{ key: 'a', label: 'A' }, { key: 'onboarded', label: 'Onboarded' }] })
      .expect(403);
  });

  it('moves orphaned candidates to first stage when a stage is removed', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    // Set initial stages and create a candidate in 'technical'
    const initialStages = [
      { key: 'sourcing', label: 'Sourcing' },
      { key: 'technical', label: 'Technical' },
      { key: 'onboarded', label: 'Onboarded' },
    ];
    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [JSON.stringify(initialStages), client.id]);
    await pool.query(
      "INSERT INTO candidates (client_id, name, stage) VALUES ($1, 'Alice', 'technical')",
      [client.id]
    );

    // Remove 'technical' stage
    const newStages = [
      { key: 'sourcing', label: 'Sourcing' },
      { key: 'onboarded', label: 'Onboarded' },
    ];
    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: newStages })
      .expect(200);

    // Alice should now be in 'sourcing'
    const { rows } = await pool.query("SELECT stage FROM candidates WHERE name = 'Alice' AND client_id = $1", [client.id]);
    expect(rows[0].stage).toBe('sourcing');
  });
});

describe('DELETE /api/clients/:id/hiring-stages', () => {
  it('admin can reset to global default', async () => {
    const client = await createTestClient({ name: 'TestCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2',
      [JSON.stringify([{ key: 'a', label: 'A' }, { key: 'onboarded', label: 'Onboarded' }]), client.id]);

    await request(app)
      .delete(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    const { rows } = await pool.query('SELECT hiring_stages FROM clients WHERE id = $1', [client.id]);
    expect(rows[0].hiring_stages).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-stages-resolution.test.mjs`
Expected: FAIL — PUT/DELETE endpoints not found

- [ ] **Step 3: Implement PUT and DELETE endpoints**

Add to `dashboard-server/routes/hiring.js` after the GET endpoint:

```javascript
  const VALID_STAGE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  /** PUT /api/clients/:id/hiring-stages — Save custom stages (admin only) */
  router.put('/api/clients/:id/hiring-stages', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    const { stages } = req.body || {};
    if (!Array.isArray(stages) || stages.length < 2) {
      return res.status(400).json({ error: 'At least 2 stages required' });
    }
    const last = stages[stages.length - 1];
    if (!last || last.key !== 'onboarded') {
      return res.status(400).json({ error: 'Last stage must be "onboarded"' });
    }
    const keys = new Set();
    for (const s of stages) {
      if (!s.key || typeof s.key !== 'string' || !VALID_STAGE_KEY.test(s.key)) {
        return res.status(400).json({ error: `Invalid stage key: ${s.key}` });
      }
      if (!s.label || typeof s.label !== 'string' || !s.label.trim()) {
        return res.status(400).json({ error: `Empty label for key: ${s.key}` });
      }
      if (keys.has(s.key)) {
        return res.status(400).json({ error: `Duplicate stage key: ${s.key}` });
      }
      keys.add(s.key);
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      // Find candidates in stages that no longer exist and move to first stage
      const newKeys = stages.map(s => s.key);
      const firstKey = newKeys[0];
      await dbClient.query(
        `UPDATE candidates SET stage = $1, updated_at = NOW()
         WHERE client_id = $2 AND stage IS NOT NULL AND stage != ALL($3::text[])`,
        [firstKey, req.params.id, newKeys]
      );

      const cleaned = stages.map(s => ({ key: s.key, label: s.label.trim() }));
      await dbClient.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [JSON.stringify(cleaned), req.params.id]);
      await dbClient.query('COMMIT');

      await auditLog('client', req.params.id, 'update_hiring_stages', req.user.displayName || 'unknown', { stageCount: cleaned.length });
      res.json({ stages: cleaned, isCustom: true });
    } catch (e) {
      await dbClient.query('ROLLBACK');
      log('error', 'Hiring', 'Failed to save hiring stages', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      dbClient.release();
    }
  });

  /** DELETE /api/clients/:id/hiring-stages — Reset to global default (admin only) */
  router.delete('/api/clients/:id/hiring-stages', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    try {
      await pool.query('UPDATE clients SET hiring_stages = NULL WHERE id = $1', [req.params.id]);
      await auditLog('client', req.params.id, 'reset_hiring_stages', req.user.displayName || 'unknown');
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Hiring', 'Failed to reset hiring stages', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-stages-resolution.test.mjs`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/hiring-stages-resolution.test.mjs
git commit -m "feat(hiring): PUT/DELETE /api/clients/:id/hiring-stages with validation"
```

---

### Task 4: Server — Update Candidate Stage Validation to Use Per-Client Stages

**Files:**
- Modify: `dashboard-server/routes/hiring.js` (POST and PATCH candidate endpoints)
- Modify: `dashboard-server/tests/unit/hiring-client-scope.test.mjs`

- [ ] **Step 1: Add test for per-client stage validation**

Append to `dashboard-server/tests/unit/hiring-client-scope.test.mjs`:

```javascript
  it('candidate can be created with a custom stage valid for that client', async () => {
    const client = await createTestClient({ name: 'CustomCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const customStages = [
      { key: 'cv-review', label: 'CV Review' },
      { key: 'technical', label: 'Technical' },
      { key: 'onboarded', label: 'Onboarded' },
    ];
    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [JSON.stringify(customStages), client.id]);

    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Alice', client_id: client.id, stage: 'cv-review' })
      .expect(201);

    expect(res.body.stage).toBe('cv-review');
  });

  it('rejects a stage not in the client custom stages', async () => {
    const client = await createTestClient({ name: 'CustomCorp' });
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const customStages = [
      { key: 'cv-review', label: 'CV Review' },
      { key: 'onboarded', label: 'Onboarded' },
    ];
    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [JSON.stringify(customStages), client.id]);

    await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Alice', client_id: client.id, stage: 'sourcing' })
      .expect(400);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-client-scope.test.mjs`
Expected: FAIL — 'sourcing' passes validation because it's in the hardcoded list

- [ ] **Step 3: Update POST /api/candidates stage validation**

In the POST endpoint (around line 218), replace the hardcoded stage check:

```javascript
    // Resolve valid stages for the target client
    const resolved = await getStagesForClient(client_id);
    const validKeys = stageKeysForClient(resolved);
    if (stage && !validKeys.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage for this client. Must be one of: ${validKeys.join(', ')}` });
    }
    const targetStage = stage || validKeys[0];
```

Replace the line `const targetStage = stage || 'sourcing';` with the above block. Remove the old `if (stage && !HIRING_STAGES.includes(stage))` check.

- [ ] **Step 4: Update PATCH /api/candidates/:id stage validation**

In the PATCH endpoint (around line 272), replace:

```javascript
    if (req.body.stage !== undefined && !HIRING_STAGES.includes(req.body.stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${HIRING_STAGES.join(', ')}` });
    }
```

With:

```javascript
    if (req.body.stage !== undefined) {
      // Look up the candidate's client_id to resolve their stages
      const { rows: candRows } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (candRows.length === 0) return res.status(404).json({ error: 'Not found' });
      const resolved = await getStagesForClient(candRows[0].client_id);
      const validKeys = stageKeysForClient(resolved);
      if (!validKeys.includes(req.body.stage)) {
        return res.status(400).json({ error: `Invalid stage for this client. Must be one of: ${validKeys.join(', ')}` });
      }
    }
```

Note: for client users, the ownership check (lines 263-270) already does a SELECT on the candidate. To avoid a duplicate query, move the stage validation after the ownership check and reuse `check[0].client_id` when `req.user.clientId` is set.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/hiring-client-scope.test.mjs`
Expected: PASS (all tests including the new ones)

- [ ] **Step 6: Run full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/hiring-client-scope.test.mjs
git commit -m "feat(hiring): validate candidate stage against per-client stages"
```

---

### Task 5: Frontend — Stage Resolution Helper + Kanban Rendering

**Files:**
- Modify: `nbi_project_dashboard.html` (lines ~19078-19093 for constants, ~19200-19460 for kanban rendering)

- [ ] **Step 1: Add stage resolution cache and helper**

Replace the `HIRING_STAGES` and `HIRING_STAGE_LABELS` constants (lines 19080-19093) with:

```javascript
const DEFAULT_HIRING_STAGES = [
  { key: 'sourcing', label: 'Sourcing' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'offer', label: 'Offer' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'hired', label: 'Hired' },
  { key: 'onboarded', label: 'Onboarded' },
];
const HIRING_STAGES = DEFAULT_HIRING_STAGES.map(s => s.key);
const HIRING_STAGE_LABELS = Object.fromEntries(DEFAULT_HIRING_STAGES.map(s => [s.key, s.label]));

let _hiringStagesCache = {};

async function loadHiringStagesForClient(clientId) {
  if (!clientId) return { stages: DEFAULT_HIRING_STAGES, isCustom: false };
  if (_hiringStagesCache[clientId]) return _hiringStagesCache[clientId];
  try {
    const data = await apiCall('/api/clients/' + clientId + '/hiring-stages');
    if (data && Array.isArray(data.stages)) {
      _hiringStagesCache[clientId] = data;
      return data;
    }
  } catch (e) {}
  return { stages: DEFAULT_HIRING_STAGES, isCustom: false };
}

function getResolvedStageKeys(resolved) {
  return resolved.stages.map(s => s.key);
}

function getResolvedStageLabel(resolved, key) {
  const s = resolved.stages.find(st => st.key === key);
  return s ? s.label : (HIRING_STAGE_LABELS[key] || key);
}

function invalidateHiringStagesCache(clientId) {
  if (clientId) delete _hiringStagesCache[clientId];
  else _hiringStagesCache = {};
}
```

This keeps `HIRING_STAGES` and `HIRING_STAGE_LABELS` for backwards compatibility (used in filters, CSS classes, etc.) while adding the per-client resolution layer.

- [ ] **Step 2: Update renderHiringView skeleton to load stages**

Replace the skeleton block at lines 19321-19329:

```javascript
  if (!window._hiringLoaded) {
    container.innerHTML = '<div class="hiring" style="padding:24px"><div class="skeleton skeleton-card"></div>' +
      Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') +
      '<span class="visually-hidden">Loading hiring data</span></div>';
    const isScopedInit = isClientUser();
    const stageClientId = isScopedInit ? _currentUser.clientId : (window._hiringFilterClient || null);
    Promise.all([loadCandidates(), loadHiringPositions(), stageClientId ? loadHiringStagesForClient(stageClientId) : Promise.resolve()]).then(() => {
      window._hiringLoaded = true;
      if (currentView === 'hiring') renderContent();
    });
    return;
  }
```

- [ ] **Step 3: Add stage resolution after the filter/view-mode variables**

After `const viewMode = ...` (line 19336) and before `let filtered = ...` (line 19340), add:

```javascript
  const activeClientId = isScopedUser
    ? _currentUser.clientId
    : (window._hiringFilterClient || null);
  const resolvedStages = activeClientId
    ? (_hiringStagesCache[activeClientId] || { stages: DEFAULT_HIRING_STAGES, isCustom: false })
    : { stages: DEFAULT_HIRING_STAGES, isCustom: false };
  const stageKeys = getResolvedStageKeys(resolvedStages);
  const stageLabel = (key) => getResolvedStageLabel(resolvedStages, key);
```

- [ ] **Step 4: Replace stage filter dropdown**

Replace lines 19397-19399 (the stage filter dropdown):

Old:
```javascript
    html += `<select class="leads-select" onchange="window._hiringFilterStage=this.value||null;renderContent()">
        <option value="">All Stages</option>
        ${HIRING_STAGES.map(s => `<option value="${s}" ${window._hiringFilterStage===s?'selected':''}>${HIRING_STAGE_LABELS[s]}</option>`).join('')}
      </select>
```

New:
```javascript
    html += `<select class="leads-select" onchange="window._hiringFilterStage=this.value||null;renderContent()">
        <option value="">All Stages</option>
        ${stageKeys.map(s => `<option value="${s}" ${window._hiringFilterStage===s?'selected':''}>${stageLabel(s)}</option>`).join('')}
      </select>
```

- [ ] **Step 5: Replace kanban lane loop**

Replace lines 19442-19460 (the `HIRING_STAGES.forEach` kanban loop):

Old:
```javascript
    HIRING_STAGES.forEach(stage => {
      const stageCandidates = filtered.filter(c => c.stage === stage)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      html += `<section class="hiring-lane" data-stage="${stage}" role="listitem" aria-label="${esc(HIRING_STAGE_LABELS[stage])} lane, ${stageCandidates.length} candidates">
        <div class="hiring-lane__header hiring-lane__header--${stage}">
          <span>${esc(HIRING_STAGE_LABELS[stage] || stage)}</span>
          <span class="hiring-lane__count">${stageCandidates.length}</span>
        </div>
        <div class="hiring-lane__body"
             ondragover="onHiringLaneDragOver(event)"
             ondragleave="onHiringLaneDragLeave(event)"
             ondrop="onHiringLaneDrop(event, '${stage}')">`;
      if (stageCandidates.length === 0) {
        html += `<div class="hiring-lane__empty">Drop candidate here</div>`;
      } else {
        stageCandidates.forEach(c => { html += renderHiringCard(c, true); });
      }
      html += `</div></section>`;
    });
```

New:
```javascript
    stageKeys.forEach((stage, stageIdx) => {
      const colour = getStageColour(stageIdx, stageKeys.length);
      const stageCandidates = filtered.filter(c => c.stage === stage)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      html += `<section class="hiring-lane" data-stage="${stage}" role="listitem" aria-label="${esc(stageLabel(stage))} lane, ${stageCandidates.length} candidates">
        <div class="hiring-lane__header" style="color:${colour.text}">
          <span>${esc(stageLabel(stage))}</span>
          <span class="hiring-lane__count">${stageCandidates.length}</span>
        </div>
        <div class="hiring-lane__body"
             ondragover="onHiringLaneDragOver(event)"
             ondragleave="onHiringLaneDragLeave(event)"
             ondrop="onHiringLaneDrop(event, '${stage}')">`;
      if (stageCandidates.length === 0) {
        html += `<div class="hiring-lane__empty">Drop candidate here</div>`;
      } else {
        stageCandidates.forEach(c => { html += renderHiringCard(c, true, resolvedStages); });
      }
      html += `</div></section>`;
    });
```

Note: `renderHiringCard` now receives `resolvedStages` as a third parameter (see Step 7).

- [ ] **Step 6: Replace client dropdown onchange to load stages**

Replace line 19382:

Old:
```javascript
    html += `<select class="leads-select" onchange="window._hiringFilterClient=this.value||null;renderContent()">
```

New:
```javascript
    html += `<select class="leads-select" onchange="window._hiringFilterClient=this.value||null;if(this.value){loadHiringStagesForClient(this.value).then(function(){renderContent()})}else{renderContent()}">
```

- [ ] **Step 7: Update renderHiringCard to accept resolved stages**

Replace the `renderHiringCard` function signature and the two lines that reference `HIRING_STAGE_LABELS` and the `hired` stage check:

Old (line 19133):
```javascript
function renderHiringCard(c, draggable) {
```

New:
```javascript
function renderHiringCard(c, draggable, resolved) {
  const _sl = resolved
    ? (key) => getResolvedStageLabel(resolved, key)
    : (key) => HIRING_STAGE_LABELS[key] || key;
  const _sk = resolved ? getResolvedStageKeys(resolved) : HIRING_STAGES;
  const _terminalKey = _sk[_sk.length - 1];
```

Replace line 19136 (`c.stage !== 'hired'`):
Old:
```javascript
  const isLate = due && due < new Date() && c.stage !== 'hired' && !isArchived;
```
New:
```javascript
  const isLate = due && due < new Date() && c.stage !== _terminalKey && !isArchived;
```

Replace line 19149 (`c.stage === 'hired'`):
Old:
```javascript
  const archivedMarker = (isArchived || c.stage === 'hired') ? '<span style="position:absolute;bottom:4px;left:4px;color:var(--success);font-size:0.9rem;font-weight:bold" title="Hired">&#10003;</span>' : '';
```
New:
```javascript
  const archivedMarker = (isArchived || c.stage === _terminalKey) ? '<span style="position:absolute;bottom:4px;left:4px;color:var(--success);font-size:0.9rem;font-weight:bold" title="' + esc(_sl(_terminalKey)) + '">&#10003;</span>' : '';
```

Replace line 19155 (aria-label with `HIRING_STAGE_LABELS`):
Old:
```javascript
              aria-label="${esc(header)}${subheader ? ', ' + esc(subheader) : ''}${c.client_name ? ', ' + esc(c.client_name) : ''}, stage ${esc(HIRING_STAGE_LABELS[c.stage] || c.stage)}${unassigned ? ', no assignee' : ''}${isArchived ? ', archived' : ''}"
```
New:
```javascript
              aria-label="${esc(header)}${subheader ? ', ' + esc(subheader) : ''}${c.client_name ? ', ' + esc(c.client_name) : ''}, stage ${esc(_sl(c.stage))}${unassigned ? ', no assignee' : ''}${isArchived ? ', archived' : ''}"
```

Replace line 19158 (`c.stage === 'hired'` strikethrough):
Old:
```javascript
    <div class="hiring-card__name" ${c.stage === 'hired' ? 'style="text-decoration:line-through"' : ''}>${esc(header)}</div>
```
New:
```javascript
    <div class="hiring-card__name" ${c.stage === _terminalKey ? 'style="text-decoration:line-through"' : ''}>${esc(header)}</div>
```

Replace line 19162 (stage badge with CSS class):
Old:
```javascript
      <span class="hiring-stage-badge hiring-stage-badge--${c.stage}" aria-hidden="true">${HIRING_STAGE_LABELS[c.stage] || c.stage}</span>
```
New:
```javascript
      <span class="hiring-stage-badge" style="background:${getStageColour(_sk.indexOf(c.stage), _sk.length).bg};color:${getStageColour(_sk.indexOf(c.stage), _sk.length).text}" aria-hidden="true">${_sl(c.stage)}</span>
```

- [ ] **Step 8: Update "By Client" view's renderHiringCard call**

Line 19476 calls `renderHiringCard(c)` without `resolvedStages`. Update:

Old:
```javascript
      g.items.forEach(c => { html += renderHiringCard(c); });
```
New:
```javascript
      g.items.forEach(c => { html += renderHiringCard(c, false, resolvedStages); });
```

- [ ] **Step 5: Run `npm run test:all` to verify no regressions**

Run: `cd dashboard-server && npm run test:all`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(hiring): frontend stage resolution + per-client kanban columns"
```

---

### Task 6: Frontend — Update Detail Panel to Use Resolved Stages

**Files:**
- Modify: `nbi_project_dashboard.html` (openCandidateDetail function, ~line 19757+)

- [ ] **Step 1: Resolve stages in openCandidateDetail**

At the top of `openCandidateDetail`, after fetching the candidate, resolve stages:

```javascript
  const resolved = await loadHiringStagesForClient(c.client_id);
  const detailStageKeys = getResolvedStageKeys(resolved);
  const detailStageLabel = (key) => getResolvedStageLabel(resolved, key);
```

- [ ] **Step 2: Update stage navigation**

Replace `hiringNextStage`/`hiringPrevStage` calls (which use the global `HIRING_STAGES`) with inline lookups using `detailStageKeys`:

```javascript
  const stageIdx = detailStageKeys.indexOf(c.stage);
  const prev = stageIdx > 0 ? detailStageKeys[stageIdx - 1] : null;
  const next = stageIdx < detailStageKeys.length - 1 ? detailStageKeys[stageIdx + 1] : null;
```

- [ ] **Step 3: Update stage dropdown in detail panel**

Replace line 19842-19843:

Old:
```javascript
          <select id="cdStageSel" onchange="hiringStageSelectChange('${c.id}',this.value)" style="flex:1;font-weight:600;text-align:center;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
            ${HIRING_STAGES.map(s => `<option value="${s}" ${c.stage===s?'selected':''}>${HIRING_STAGE_LABELS[s]}</option>`).join('')}
          </select>
```

New:
```javascript
          <select id="cdStageSel" onchange="hiringStageSelectChange('${c.id}',this.value)" style="flex:1;font-weight:600;text-align:center;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">
            ${detailStageKeys.map(s => `<option value="${s}" ${c.stage===s?'selected':''}>${detailStageLabel(s)}</option>`).join('')}
          </select>
```

Also replace the prev/next button labels on lines 19841 and 19845:

Old (line 19841):
```javascript
          <button ... ${prev ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${prev}" title="Previous: ${HIRING_STAGE_LABELS[prev]}"` : 'disabled'}>&larr;</button>
```
New:
```javascript
          <button ... ${prev ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${prev}" title="Previous: ${detailStageLabel(prev)}"` : 'disabled'}>&larr;</button>
```

Old (line 19845):
```javascript
          <button ... ${next ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${next}" title="Next: ${HIRING_STAGE_LABELS[next]}"` : `data-action="hiringConfirmHire" data-arg0="${c.id}" title="Confirm Hired"`}>&rarr;</button>
```
New:
```javascript
          <button ... ${next ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${next}" title="Next: ${detailStageLabel(next)}"` : `data-action="hiringConfirmHire" data-arg0="${c.id}" title="Confirm ${detailStageLabel(detailStageKeys[detailStageKeys.length - 1])}"`}>&rarr;</button>
```

Also replace line 19861 (stage-specific section title):

Old:
```javascript
      ${stageSubHtml ? `<div class="candidate-detail__section" style="${disabledStyle}"><div class="candidate-detail__section-title">${esc(HIRING_STAGE_LABELS[c.stage])} details</div>${stageSubHtml}</div>` : ''}
```
New:
```javascript
      ${stageSubHtml ? `<div class="candidate-detail__section" style="${disabledStyle}"><div class="candidate-detail__section-title">${esc(detailStageLabel(c.stage))} details</div>${stageSubHtml}</div>` : ''}
```

- [ ] **Step 4: Update terminal stage confirm**

In the right arrow button, replace `data-action="hiringConfirmHire"` logic: when there's no `next` stage, the confirm action should set stage to `onboarded` (the last key in `detailStageKeys`) and archive.

Update `hiringConfirmHire` to accept the terminal stage key:

```javascript
async function hiringConfirmHire(id) {
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const resolved = await loadHiringStagesForClient(c.client_id);
  const terminalKey = resolved.stages[resolved.stages.length - 1].key;
  const terminalLabel = resolved.stages[resolved.stages.length - 1].label;
  const ok = await themedConfirm(`Close Candidate Card?\nThis will mark the candidate as ${terminalLabel} and archive the card.`, 'Close Candidate Card', 'Confirm');
  if (!ok) {
    if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
    return;
  }
  const resp = await authFetch('/api/candidates/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: terminalKey, archived_at: new Date().toISOString() })
  });
  if (resp.ok) {
    toast('Candidate archived');
    await loadCandidates();
    if (currentView === 'hiring') renderContent();
    renderSidebar();
    if (document.getElementById('candidateDetailPanel')?.classList.contains('open')) openCandidateDetail(id);
  } else {
    toast('Failed to archive', 'error');
  }
}
```

- [ ] **Step 5: Update hiringStageSelectChange**

Replace the hardcoded `'hired'` check:

```javascript
async function hiringStageSelectChange(id, newStage) {
  const c = _candidatesData.find(x => x.id === id);
  if (!c) return;
  const resolved = await loadHiringStagesForClient(c.client_id);
  const terminalKey = resolved.stages[resolved.stages.length - 1].key;
  if (newStage === terminalKey) {
    if (c.stage === terminalKey) return;
    await hiringConfirmHire(id);
    return;
  }
  await updateCandidateField(id, 'stage', newStage);
}
```

- [ ] **Step 6: Verify with `npm run test:all`**

Run: `cd dashboard-server && npm run test:all`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(hiring): detail panel uses per-client stages"
```

---

### Task 7: Frontend — Configure Stages Editor (Gear Icon)

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add gear icon to kanban header**

In `renderHiringView`, after the "By Client" toggle and before the create button (only for NBI admins when a client is selected):

```javascript
  if (!isScopedUser && isAdmin && activeClientId) {
    html += `<button class="btn btn--ghost btn--sm" data-action="openHiringStageEditor" data-arg0="${activeClientId}" title="Configure hiring stages for this client" style="font-size:1rem">&#9881;</button>`;
  }
```

- [ ] **Step 2: Implement the stage editor function**

Add `openHiringStageEditor(clientId)`:

```javascript
async function openHiringStageEditor(clientId) {
  const resolved = await loadHiringStagesForClient(clientId);
  const stages = resolved.stages.map(s => ({ ...s }));
  const clientName = Object.values(_apiClientsCache || {}).find(c => c.id === clientId)?.name || 'Client';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.id = 'hiringStageEditorOverlay';

  function renderRows() {
    return stages.map((s, i) => {
      const isTerminal = i === stages.length - 1 && s.key === 'onboarded';
      const isLast = i === stages.length - 1;
      return `<div style="display:flex;gap:6px;align-items:center;padding:4px 0" data-idx="${i}">
        <span style="cursor:${isTerminal ? 'default' : 'grab'};padding:0 4px;color:var(--text-muted)">${isTerminal ? '&#128274;' : '&#9776;'}</span>
        <input type="text" value="${esc(s.key)}" ${isTerminal ? 'disabled' : ''} placeholder="key" style="width:120px;padding:4px 8px;font-size:0.82rem;font-family:monospace;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" data-field="key" data-idx="${i}">
        <input type="text" value="${esc(s.label)}" ${isTerminal ? 'disabled' : ''} placeholder="Label" style="flex:1;padding:4px 8px;font-size:0.82rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" data-field="label" data-idx="${i}">
        ${isTerminal ? '<span style="font-size:0.7rem;color:var(--text-muted)">Terminal</span>' : `<button class="btn btn--ghost btn--sm" style="color:var(--danger)" data-action="removeStageRow" data-idx="${i}">&times;</button>`}
      </div>`;
    }).join('');
  }

  overlay.innerHTML = `
    <div class="modal" style="min-width:420px;max-width:560px">
      <div class="modal__title">Hiring Stages &mdash; ${esc(clientName)}</div>
      <div id="stageEditorRows">${renderRows()}</div>
      <button class="btn btn--sm" id="addStageBtn" style="margin-top:8px">+ Add Stage</button>
      <div style="display:flex;gap:8px;justify-content:space-between;margin-top:14px;align-items:center">
        <button class="btn btn--sm" id="resetStagesBtn" style="color:var(--text-muted)">Reset to Default</button>
        <div style="display:flex;gap:8px">
          <button class="btn" id="cancelStagesBtn">Cancel</button>
          <button class="btn btn--primary" id="saveStagesBtn">Save</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => { try { document.body.removeChild(overlay); } catch(e) {} };
  overlay.querySelector('#cancelStagesBtn').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  overlay.querySelector('#addStageBtn').onclick = () => {
    // Insert before the last (terminal) stage
    stages.splice(stages.length - 1, 0, { key: '', label: '' });
    overlay.querySelector('#stageEditorRows').innerHTML = renderRows();
  };

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="removeStageRow"]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    if (stages.length <= 2) { toast('Minimum 2 stages required', 'error'); return; }
    stages.splice(idx, 1);
    overlay.querySelector('#stageEditorRows').innerHTML = renderRows();
  });

  overlay.addEventListener('change', (e) => {
    const input = e.target;
    if (!input.dataset.field || input.dataset.idx === undefined) return;
    const idx = parseInt(input.dataset.idx, 10);
    stages[idx][input.dataset.field] = input.value.trim();
  });

  overlay.querySelector('#resetStagesBtn').onclick = async () => {
    const ok = await themedConfirm('Reset hiring stages to the global default for this client?', 'Reset Stages', 'Reset');
    if (!ok) return;
    const resp = await authFetch('/api/clients/' + clientId + '/hiring-stages', { method: 'DELETE' });
    if (resp.ok) {
      invalidateHiringStagesCache(clientId);
      toast('Stages reset to default');
      close();
      await loadCandidates();
      renderContent();
    } else {
      toast('Failed to reset stages', 'error');
    }
  };

  overlay.querySelector('#saveStagesBtn').onclick = async () => {
    // Read current values from inputs
    const rows = overlay.querySelectorAll('#stageEditorRows > div');
    const updated = [];
    rows.forEach((row, i) => {
      const keyInput = row.querySelector('[data-field="key"]');
      const labelInput = row.querySelector('[data-field="label"]');
      if (keyInput && labelInput) {
        updated.push({ key: keyInput.value.trim(), label: labelInput.value.trim() });
      }
    });

    // Client-side validation
    if (updated.length < 2) { toast('Minimum 2 stages required', 'error'); return; }
    if (updated[updated.length - 1].key !== 'onboarded') { toast('Last stage must be "onboarded"', 'error'); return; }
    if (updated.some(s => !s.key || !s.label)) { toast('All stages need a key and label', 'error'); return; }

    const resp = await authFetch('/api/clients/' + clientId + '/hiring-stages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages: updated })
    });
    if (resp.ok) {
      invalidateHiringStagesCache(clientId);
      toast('Hiring stages saved');
      close();
      await loadCandidates();
      renderContent();
    } else {
      const err = await resp.json().catch(() => ({}));
      toast(err.error || 'Failed to save stages', 'error');
    }
  };
}
```

- [ ] **Step 3: Verify action dispatch works**

No registration needed. The global action dispatch at line 3262-3277 uses `window[action]` to find the handler. Since `openHiringStageEditor` is defined at global scope, `data-action="openHiringStageEditor" data-arg0="${clientId}"` will auto-dispatch with `clientId` as the first argument.

- [ ] **Step 4: Verify visually**

Run: `npm run test:all`
Restart PM2: `pm2 restart nbi-dashboard`
Log in, go to Hiring, verify the gear icon appears next to the header when a client is selected in the dropdown. Click it, verify the editor opens with current stages.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(hiring): stage configuration editor with gear icon"
```

---

### Task 8: Dynamic Stage Colour Palette

**Files:**
- Modify: `nbi_project_dashboard.html` (add next to the stage resolution helpers from Task 5 Step 1)

- [ ] **Step 1: Add the colour palette and lookup function**

Add right after the `invalidateHiringStagesCache` function (from Task 5 Step 1):

```javascript
const STAGE_COLOUR_PALETTE = [
  { text: 'var(--text-secondary)', bg: 'var(--bg-surface)' },
  { text: '#3b82f6', bg: 'color-mix(in srgb, #3b82f6 15%, var(--bg-card))' },
  { text: '#f59e0b', bg: 'color-mix(in srgb, #f59e0b 15%, var(--bg-card))' },
  { text: '#2563eb', bg: 'color-mix(in srgb, #2563eb 15%, var(--bg-card))' },
  { text: '#8b5cf6', bg: 'color-mix(in srgb, #8b5cf6 15%, var(--bg-card))' },
  { text: '#ec4899', bg: 'color-mix(in srgb, #ec4899 15%, var(--bg-card))' },
  { text: '#10b981', bg: 'color-mix(in srgb, #10b981 15%, var(--bg-card))' },
  { text: 'var(--success)', bg: 'var(--success-bg)' },
];

function getStageColour(index, totalStages) {
  if (index === totalStages - 1) return STAGE_COLOUR_PALETTE[STAGE_COLOUR_PALETTE.length - 1];
  return STAGE_COLOUR_PALETTE[index % (STAGE_COLOUR_PALETTE.length - 1)];
}
```

This is used by Task 5 Steps 5 and 7 (kanban lanes and card badges) and Task 6 Step 1 (detail panel header badge). The terminal stage always gets the last palette entry (success green). Other stages cycle through the palette.

- [ ] **Step 2: Update the detail panel header badge**

In `openCandidateDetail`, replace line 19807:

Old:
```javascript
          <span class="hiring-stage-badge hiring-stage-badge--${c.stage}">${HIRING_STAGE_LABELS[c.stage] || c.stage}</span>
```

New:
```javascript
          <span class="hiring-stage-badge" style="background:${getStageColour(detailStageKeys.indexOf(c.stage), detailStageKeys.length).bg};color:${getStageColour(detailStageKeys.indexOf(c.stage), detailStageKeys.length).text}">${detailStageLabel(c.stage)}</span>
```

- [ ] **Step 3: Update position detail candidate table**

In `openPositionDetail`, replace lines 19523 and 19530:

Old (line 19523):
```javascript
      const stageLabel = (typeof HIRING_STAGE_LABELS !== 'undefined' && HIRING_STAGE_LABELS[c.stage]) || c.stage;
```

New:
```javascript
      const stageLabel = getResolvedStageLabel(resolvedStages, c.stage);
```

This requires `resolvedStages` to be available in `openPositionDetail`. At the top of that function, after fetching the position, add:

```javascript
  const resolvedStages = await loadHiringStagesForClient(p.client_id);
  const posStageKeys = getResolvedStageKeys(resolvedStages);
```

Old (line 19530):
```javascript
        <td><span class="hiring-stage-badge hiring-stage-badge--${c.stage}" style="font-size:0.68rem;padding:2px 7px">${esc(stageLabel)}</span></td>
```

New:
```javascript
        <td><span class="hiring-stage-badge" style="background:${getStageColour(posStageKeys.indexOf(c.stage), posStageKeys.length).bg};color:${getStageColour(posStageKeys.indexOf(c.stage), posStageKeys.length).text};font-size:0.68rem;padding:2px 7px">${esc(stageLabel)}</span></td>
```

- [ ] **Step 5: Update the position card minibar colours**

In `renderPositionCard` (line 19289), replace the hardcoded `stageColors` object:

Old:
```javascript
    const stageColors = { sourcing: 'var(--text-muted)', interviews: '#f59e0b', offer: '#2563eb', onboarding: '#10b981', hired: 'var(--success)' };
```

New:
```javascript
    const stageColors = Object.fromEntries(HIRING_STAGES.map((s, i) => [s, getStageColour(i, HIRING_STAGES.length).text]));
```

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(hiring): dynamic colour palette for stage badges and lanes"
```

---

### Task 9: Final Integration Test + Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `cd dashboard-server && npm run test:all`
Expected: All tests pass

- [ ] **Step 2: Restart PM2**

Run: `pm2 restart nbi-dashboard`

- [ ] **Step 3: Visual verification**

Create a temporary test client user (Couch Heroes), log in, verify:
- Hiring tab visible with correct stage columns
- Gear icon NOT visible (client user)
- Cards render with correct stages

Log in as NBI admin, verify:
- Default filter shows NBI Operations (empty board, correct)
- Switch to Couch Heroes in dropdown — columns change to match Couch Heroes' stages
- Gear icon visible — click it, verify editor opens
- Add a custom stage, save, verify columns update
- Reset to default, verify columns revert

Delete the temp test user after verification.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "feat(hiring): per-client hiring stages — complete"
```
