# ATS Spec D: Per-Client Custom Stages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each client to have its own hiring pipeline stages. When no custom stages are set, the global default applies. NBI admins configure stages via a gear icon editor. All stage-dependent logic (kanban, validation, detail panel, metrics, notifications, onboarding auto-populate) resolves dynamically from the client's configuration.

**Architecture:** Migration 050 adds `hiring_stages JSONB` to `clients`. A `getStagesForClient(clientId)` helper in `hiring.js` resolves stages (custom or global default). All hardcoded `HIRING_STAGES` validation points switch to this helper. New endpoints: GET/PUT/DELETE on `/api/clients/:id/hiring-stages`. Frontend caches resolved stages per client and re-renders on change.

**Tech Stack:** Node.js + Express 4, PostgreSQL, Vitest + supertest, monolithic SPA.

**Spec:** `docs/superpowers/specs/2026-05-20-ats-spec-d-per-client-stages.md` + `docs/superpowers/specs/2026-05-20-per-client-hiring-stages-design.md`

---

## Spec D Deltas Applied

The deltas from Spec D modify how Specs A-C features interact with custom stages:

| Delta | Resolution | Task |
|-------|-----------|------|
| D1: Stage history compatibility | No change needed — `candidate_stage_history` stores free-text keys | N/A |
| D2: Stall thresholds for custom stages | Default 10 days for unrecognised stage keys, `stall_days` field optional | Task 5 |
| D3: Rejection terminal stage | `getStagesForClient()` resolves terminal key dynamically | Task 3 |
| D4: Interview rounds always visible | Already visible regardless of stage | N/A |
| D5: Email template trigger_stage | Templates scoped by client_id — uses that client's keys | N/A |
| D6: Onboarding `is_onboarding` flag | Stage objects gain `is_onboarding` boolean; auto-populate checks it | Task 3, 6 |
| D7: Metrics stage label resolution | Frontend resolves labels from cached stages | Task 6 |
| D8: Scorecard criteria | Per-position, not per-stage — no change needed | N/A |

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `dashboard-server/migrations/050_per_client_stages.sql` | Create | `hiring_stages JSONB` on `clients` |
| `dashboard-server/routes/hiring.js` | Modify | Add `getStagesForClient()` helper, replace all hardcoded `HIRING_STAGES` validation with dynamic resolution, add GET/PUT/DELETE hiring-stages endpoints |
| `dashboard-server/cron/index.js` | Modify | Update stall check to use `stall_days` from custom stages |
| `dashboard-server/tests/unit/per-client-stages.test.mjs` | Create | Tests for custom stages CRUD, dynamic validation, stage editor |
| `nbi_project_dashboard.html` | Modify | `getHiringStagesForClient()` cache, dynamic kanban rendering, stage editor UI, detail panel stage resolution |

---

## Task 1: Migration 050

**Files:**
- Create: `dashboard-server/migrations/050_per_client_stages.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 050_per_client_stages.sql
-- Per-client custom hiring stages

ALTER TABLE clients ADD COLUMN IF NOT EXISTS hiring_stages JSONB DEFAULT NULL;
```

- [ ] **Step 2: Apply to test and prod**

```
cd dashboard-server && npm run init-db
```
```javascript
node -e "require('dotenv').config();const {Pool}=require('pg');const fs=require('fs');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(fs.readFileSync('migrations/050_per_client_stages.sql','utf8')).then(()=>{console.log('050 applied');p.end()}).catch(e=>{console.error(e);p.end()})"
```

- [ ] **Step 3: Commit**

```
git add dashboard-server/migrations/050_per_client_stages.sql
git commit -m "feat(ats): migration 050 — per-client hiring_stages JSONB"
```

---

## Task 2: `getStagesForClient` Helper + Stages API Endpoints

**Files:**
- Modify: `dashboard-server/routes/hiring.js`
- Create: `dashboard-server/tests/unit/per-client-stages.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `dashboard-server/tests/unit/per-client-stages.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('Per-client hiring stages', () => {
  it('GET returns global default when client has no custom stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'DefaultCo' });

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.isCustom).toBe(false);
    expect(res.body.stages).toHaveLength(5);
    expect(res.body.stages[0].key).toBe('sourcing');
    expect(res.body.stages[4].key).toBe('onboarded');
  });

  it('PUT saves custom stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'CustomCo' });

    const customStages = [
      { key: 'cv-review', label: 'CV Review' },
      { key: 'technical', label: 'Technical Interview' },
      { key: 'culture-fit', label: 'Culture Fit' },
      { key: 'onboarded', label: 'Onboarded' },
    ];

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: customStages })
      .expect(200);

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.isCustom).toBe(true);
    expect(res.body.stages).toHaveLength(4);
    expect(res.body.stages[0].key).toBe('cv-review');
  });

  it('PUT rejects stages without terminal onboarded', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'BadCo' });

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [{ key: 'sourcing', label: 'Sourcing' }, { key: 'hired', label: 'Hired' }] })
      .expect(400);
  });

  it('PUT rejects fewer than 2 stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'TinyCo' });

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [{ key: 'onboarded', label: 'Onboarded' }] })
      .expect(400);
  });

  it('PUT rejects duplicate keys', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'DupCo' });

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [{ key: 'sourcing', label: 'A' }, { key: 'sourcing', label: 'B' }, { key: 'onboarded', label: 'Onboarded' }] })
      .expect(400);
  });

  it('DELETE resets to global default', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'ResetCo' });

    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [
      JSON.stringify([{ key: 'custom', label: 'Custom' }, { key: 'onboarded', label: 'Onboarded' }]),
      client.id,
    ]);

    await request(app)
      .delete(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.isCustom).toBe(false);
  });

  it('non-admin cannot PUT stages', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const client = await createTestClient({ name: 'NoPerm' });

    await request(app)
      .put(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stages: [{ key: 'a', label: 'A' }, { key: 'onboarded', label: 'Onboarded' }] })
      .expect(403);
  });

  it('client user can GET stages for their own client', async () => {
    const client = await createTestClient({ name: 'ClientStages' });
    const user = await createTestUser({ role: 'member', client_id: client.id, client_role: 'member' });
    const token = await mintSession(user.id);

    const res = await request(app)
      .get(`/api/clients/${client.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.stages).toBeDefined();
  });

  it('client user cannot GET stages for another client', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    const user = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(user.id);

    await request(app)
      .get(`/api/clients/${clientB.id}/hiring-stages`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });
});
```

- [ ] **Step 2: Add `getStagesForClient` helper and default stages constant to `hiring.js`**

After `HIRING_STAGES` (which stays as the global default array), add:

```javascript
  const DEFAULT_STAGES = HIRING_STAGES.map(key => ({
    key,
    label: STAGE_LABELS[key] || key,
    ...(key === 'onboarding' ? { is_onboarding: true } : {}),
  }));

  async function getStagesForClient(clientId) {
    if (!clientId) return { stages: DEFAULT_STAGES, isCustom: false };
    try {
      const { rows: [client] } = await pool.query('SELECT hiring_stages FROM clients WHERE id = $1', [clientId]);
      if (client && client.hiring_stages && Array.isArray(client.hiring_stages) && client.hiring_stages.length > 0) {
        return { stages: client.hiring_stages, isCustom: true };
      }
    } catch (e) {
      log('error', 'Hiring', 'Failed to get stages for client', { clientId, error: e.message });
    }
    return { stages: DEFAULT_STAGES, isCustom: false };
  }
```

- [ ] **Step 3: Add stages API endpoints**

Add these BEFORE the existing position endpoints (before `router.get('/api/hiring-positions', ...)`):

```javascript
  const STAGE_KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  // GET /api/clients/:id/hiring-stages
  router.get('/api/clients/:id/hiring-stages', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    if (req.user.clientId && req.user.clientId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await getStagesForClient(req.params.id);
    res.json(result);
  });

  // PUT /api/clients/:id/hiring-stages — save custom stages (admin only)
  router.put('/api/clients/:id/hiring-stages', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    const { stages } = req.body || {};
    if (!Array.isArray(stages) || stages.length < 2) {
      return res.status(400).json({ error: 'At least 2 stages required' });
    }
    const lastStage = stages[stages.length - 1];
    if (!lastStage || lastStage.key !== 'onboarded') {
      return res.status(400).json({ error: 'Last stage must have key "onboarded"' });
    }
    const keys = new Set();
    for (const s of stages) {
      if (!s.key || !s.label || !s.label.trim()) {
        return res.status(400).json({ error: 'Each stage must have a non-empty key and label' });
      }
      if (!STAGE_KEY_RE.test(s.key)) {
        return res.status(400).json({ error: `Invalid stage key "${s.key}". Use lowercase letters, numbers, and hyphens only.` });
      }
      if (keys.has(s.key)) {
        return res.status(400).json({ error: `Duplicate stage key "${s.key}"` });
      }
      keys.add(s.key);
    }

    try {
      // Move candidates from removed stages to the first stage
      const { rows: [existing] } = await pool.query('SELECT hiring_stages FROM clients WHERE id = $1', [req.params.id]);
      if (existing && existing.hiring_stages && Array.isArray(existing.hiring_stages)) {
        const oldKeys = new Set(existing.hiring_stages.map(s => s.key));
        const newKeys = new Set(stages.map(s => s.key));
        const removedKeys = [...oldKeys].filter(k => !newKeys.has(k));
        if (removedKeys.length > 0) {
          const firstKey = stages[0].key;
          await pool.query(
            'UPDATE candidates SET stage = $1 WHERE client_id = $2 AND stage = ANY($3)',
            [firstKey, req.params.id, removedKeys]
          );
        }
      }

      await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [JSON.stringify(stages), req.params.id]);
      res.json({ ok: true, stages });
    } catch (e) {
      log('error', 'Hiring', 'Failed to save custom stages', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // DELETE /api/clients/:id/hiring-stages — reset to default (admin only)
  router.delete('/api/clients/:id/hiring-stages', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    try {
      await pool.query('UPDATE clients SET hiring_stages = NULL WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Hiring', 'Failed to reset stages', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });
```

- [ ] **Step 4: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/per-client-stages.test.mjs
```

- [ ] **Step 5: Run full suite**

```
cd dashboard-server && npm test
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/per-client-stages.test.mjs
git commit -m "feat(ats): per-client stages API — GET/PUT/DELETE with validation"
```

---

## Task 3: Dynamic Stage Validation in Candidate CRUD

**Files:**
- Modify: `dashboard-server/routes/hiring.js`
- Modify: `dashboard-server/tests/unit/per-client-stages.test.mjs`

This replaces the 5 hardcoded `HIRING_STAGES.includes(stage)` checks with dynamic validation against the candidate's client's configured stages.

- [ ] **Step 1: Write failing tests**

Append to `per-client-stages.test.mjs`:

```javascript
describe('Dynamic stage validation', () => {
  it('POST accepts custom stage key for client with custom stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'CustomValidation' });

    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [
      JSON.stringify([{ key: 'cv-review', label: 'CV Review' }, { key: 'technical', label: 'Technical' }, { key: 'onboarded', label: 'Onboarded' }]),
      client.id,
    ]);

    const res = await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Custom Stage Alice', client_id: client.id, stage: 'cv-review' })
      .expect(201);

    expect(res.body.stage).toBe('cv-review');
  });

  it('POST rejects standard stage key if not in client custom stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'CustomReject' });

    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [
      JSON.stringify([{ key: 'pipeline', label: 'Pipeline' }, { key: 'onboarded', label: 'Onboarded' }]),
      client.id,
    ]);

    await request(app)
      .post('/api/candidates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Bad Stage Bob', client_id: client.id, stage: 'sourcing' })
      .expect(400);
  });

  it('PATCH validates stage against client custom stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'PatchCustom' });

    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [
      JSON.stringify([{ key: 'review', label: 'Review' }, { key: 'offer', label: 'Offer' }, { key: 'onboarded', label: 'Onboarded' }]),
      client.id,
    ]);

    const candidate = await createTestCandidate({ name: 'Patch Test', client_id: client.id, stage: 'review' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'offer' })
      .expect(200);

    expect(res.body.stage).toBe('offer');
  });

  it('rejection enforcement uses dynamic terminal stage', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'TerminalCustom' });

    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [
      JSON.stringify([{ key: 'pipeline', label: 'Pipeline' }, { key: 'onboarded', label: 'Onboarded' }]),
      client.id,
    ]);

    const candidate = await createTestCandidate({ name: 'Terminal Test', client_id: client.id, stage: 'onboarded' });

    // Archiving at terminal stage should NOT require rejection
    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString() })
      .expect(200);
  });

  it('onboarding auto-populate uses is_onboarding flag from custom stages', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'OnboardCustom' });

    await pool.query('UPDATE clients SET hiring_stages = $1 WHERE id = $2', [
      JSON.stringify([
        { key: 'pipeline', label: 'Pipeline' },
        { key: 'setup', label: 'Setup & Onboarding', is_onboarding: true },
        { key: 'onboarded', label: 'Onboarded' },
      ]),
      client.id,
    ]);

    const { rows: [pos] } = await pool.query(
      `INSERT INTO hiring_positions (client_id, title, onboarding_template) VALUES ($1, 'Dev', $2) RETURNING *`,
      [client.id, JSON.stringify([{ title: 'Custom item 1' }, { title: 'Custom item 2' }])]
    );

    const candidate = await createTestCandidate({ name: 'Onboard Custom', client_id: client.id, position_id: pos.id, stage: 'pipeline' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'setup' })
      .expect(200);

    const { rows: items } = await pool.query('SELECT * FROM onboarding_checklist_items WHERE candidate_id = $1 ORDER BY sort_order', [candidate.id]);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Custom item 1');
  });
});
```

- [ ] **Step 2: Replace hardcoded stage validation with dynamic resolution**

In hiring.js, the following lines validate stages against the hardcoded `HIRING_STAGES`:

1. **GET `/api/candidates` filter** (~line 307): `if (!HIRING_STAGES.includes(stage))`
2. **POST `/api/candidates`** (~line 426): `if (stage && !HIRING_STAGES.includes(stage))`
3. **PATCH `/api/candidates/:id`** (~line 510): `if (req.body.stage !== undefined && !HIRING_STAGES.includes(req.body.stage))`

For each, replace the hardcoded check with a dynamic lookup. The candidate's `client_id` determines which stages are valid.

**For GET filter (line ~307):** The client filter is already available as `filterClientId`. Use it:
```javascript
    if (stage) {
      const resolved = await getStagesForClient(filterClientId);
      const validKeys = resolved.stages.map(s => s.key);
      if (!validKeys.includes(stage)) return res.status(400).json({ error: `Invalid stage. Must be one of: ${validKeys.join(', ')}` });
      where.push(`ca.stage = $${i++}`); vals.push(stage);
    }
```

**For POST (line ~426):** The `client_id` is available from the request body:
```javascript
    if (stage) {
      const resolved = await getStagesForClient(client_id);
      const validKeys = resolved.stages.map(s => s.key);
      if (!validKeys.includes(stage)) {
        return res.status(400).json({ error: `Invalid stage. Must be one of: ${validKeys.join(', ')}` });
      }
    }
```

**For PATCH (line ~510):** Need to fetch the candidate's `client_id` first. This is already fetched for client-scoped users at line ~477. For NBI users, it's not yet available. Add a `candidateClientId` lookup:
```javascript
    let candidateClientId = req.user.clientId || null;
    if (!candidateClientId && (req.body.stage !== undefined || req.body.archived_at)) {
      const { rows: [cRow] } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (cRow) candidateClientId = cRow.client_id;
    }
    if (req.body.stage !== undefined) {
      const resolved = await getStagesForClient(candidateClientId);
      const validKeys = resolved.stages.map(s => s.key);
      if (!validKeys.includes(req.body.stage)) {
        return res.status(400).json({ error: `Invalid stage. Must be one of: ${validKeys.join(', ')}` });
      }
    }
```

**For rejection enforcement (line ~572):** Replace `const terminalStage = HIRING_STAGES[HIRING_STAGES.length - 1]` with:
```javascript
      const resolved = await getStagesForClient(candidateClientId);
      const terminalStage = resolved.stages[resolved.stages.length - 1].key;
```

**For onboarding auto-populate:** Change the hardcoded `body.stage === 'onboarding'` check to use the `is_onboarding` flag:
```javascript
        // Check if the target stage has is_onboarding flag
        const stageResolved = await getStagesForClient(candidateClientId);
        const targetStageObj = stageResolved.stages.find(s => s.key === body.stage);
        if (body.stage !== undefined && body.stage !== oldStage && targetStageObj && targetStageObj.is_onboarding) {
```

Note: The `candidateClientId` variable needs to be accessible inside the transaction block. Place the lookup early enough in the handler.

- [ ] **Step 3: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/per-client-stages.test.mjs
```

- [ ] **Step 4: Run full suite**

```
cd dashboard-server && npm test
```

- [ ] **Step 5: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/per-client-stages.test.mjs
git commit -m "feat(ats): dynamic stage validation from per-client configuration"
```

---

## Task 4: Update Stall Reminders for Custom Stages

**Files:**
- Modify: `dashboard-server/cron/index.js`

- [ ] **Step 1: Update `checkHiringStalls` to use `stall_days` from custom stages**

In the stall check function, after fetching the candidate and computing `days_in_stage`, look up the client's custom stages and check for a `stall_days` field on the stage object:

Replace:
```javascript
      const threshold = STALL_THRESHOLDS[cand.stage] || DEFAULT_STALL_DAYS;
```

With:
```javascript
      let threshold = STALL_THRESHOLDS[cand.stage] || DEFAULT_STALL_DAYS;
      // Check for custom stall_days on the client's stage configuration
      if (cand.client_id) {
        try {
          const { rows: [clientRow] } = await pool.query('SELECT hiring_stages FROM clients WHERE id = $1', [cand.client_id]);
          if (clientRow && clientRow.hiring_stages && Array.isArray(clientRow.hiring_stages)) {
            const stageObj = clientRow.hiring_stages.find(s => s.key === cand.stage);
            if (stageObj && typeof stageObj.stall_days === 'number') {
              threshold = stageObj.stall_days;
            }
          }
        } catch (e) { /* use default threshold */ }
      }
```

- [ ] **Step 2: Commit**

```
git add dashboard-server/cron/index.js
git commit -m "feat(ats): stall reminders respect custom stall_days per stage"
```

---

## Task 5: Frontend — Dynamic Stage Resolution + Stage Editor

**Files:**
- Modify: `nbi_project_dashboard.html`

This is the largest frontend task. It needs to:
1. Add `getHiringStagesForClient(clientId)` with per-client caching
2. Update `renderHiringView` to use resolved stages for kanban rendering
3. Update `openCandidateDetail` and its helpers to use resolved stages
4. Add the stage editor (gear icon + inline editor panel)

- [ ] **Step 1: Add stage resolution cache and helper**

Near the existing `HIRING_STAGES` and `HIRING_STAGE_LABELS` constants, add:

```javascript
const _hiringStagesCache = {};

async function getHiringStagesForClient(clientId) {
  if (!clientId) return HIRING_STAGES.map(key => ({ key, label: HIRING_STAGE_LABELS[key] || key, ...(key === 'onboarding' ? { is_onboarding: true } : {}) }));
  if (_hiringStagesCache[clientId]) return _hiringStagesCache[clientId];
  try {
    const data = await apiCall(`/api/clients/${clientId}/hiring-stages`);
    if (data && data.stages) {
      _hiringStagesCache[clientId] = data.stages;
      return data.stages;
    }
  } catch (e) { /* fallback to default */ }
  return HIRING_STAGES.map(key => ({ key, label: HIRING_STAGE_LABELS[key] || key, ...(key === 'onboarding' ? { is_onboarding: true } : {}) }));
}

function getResolvedStageLabel(stages, key) {
  const s = stages.find(s => s.key === key);
  return s ? s.label : key;
}

function invalidateStagesCache(clientId) {
  if (clientId) delete _hiringStagesCache[clientId];
  else Object.keys(_hiringStagesCache).forEach(k => delete _hiringStagesCache[k]);
}
```

- [ ] **Step 2: Update kanban rendering to use resolved stages**

In `renderHiringView`, the kanban section currently iterates `HIRING_STAGES.forEach(stage => {...})`. Change to:

Before the kanban rendering, resolve the stages for the active client:
```javascript
    const activeClientId = window._hiringFilterClient || null;
    const resolvedStages = await getHiringStagesForClient(activeClientId);
```

Then replace `HIRING_STAGES.forEach(stage => {` with:
```javascript
    resolvedStages.forEach(stageObj => {
      const stage = stageObj.key;
      const stageLabel = stageObj.label;
```

And replace references to `HIRING_STAGE_LABELS[stage]` with `stageLabel` in the kanban lane header.

Note: `renderHiringView` is synchronous. Making it async to support `await getHiringStagesForClient` requires changing the function signature. The simplest approach: preload the stages before calling `renderContent()`. Add a `_resolvedHiringStages` global that's set when the client filter changes, and read it synchronously in `renderHiringView`.

Actually the cleaner approach: cache the stages on client filter change, and read from cache synchronously:

```javascript
let _resolvedHiringStages = null;

// Call this when the client filter changes or on initial load
async function resolveAndCacheHiringStages() {
  const clientId = window._hiringFilterClient || null;
  _resolvedHiringStages = await getHiringStagesForClient(clientId);
}
```

Then in `renderHiringView`, use `_resolvedHiringStages || DEFAULT_STAGES`.

- [ ] **Step 3: Update detail panel stage helpers**

The `buildCandidateStageHtml` function uses `HIRING_STAGES` for the stage dropdown and `hiringPrevStage`/`hiringNextStage` helpers. These need to use the candidate's client's resolved stages.

Pass `resolvedStages` as a parameter to `buildCandidateStageHtml`. In `openCandidateDetail`, resolve stages before building the panel:
```javascript
  const candidateStages = await getHiringStagesForClient(c.client_id);
```

Then pass `candidateStages` to the stage builder.

- [ ] **Step 4: Add stage editor UI**

Add a gear icon next to the kanban header (visible to admins only):
```javascript
${isAdmin ? `<button class="btn btn--ghost btn--sm" onclick="openStageEditor('${activeClientId}')" title="Configure stages" style="font-size:1rem">&#9881;</button>` : ''}
```

Add the editor function:
```javascript
async function openStageEditor(clientId) {
  if (!clientId) { toast('Select a client first', 'error'); return; }
  const data = await apiCall(`/api/clients/${clientId}/hiring-stages`);
  const stages = data.stages || [];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="modal" style="min-width:400px;max-width:560px">
    <div class="modal__title">Configure Hiring Stages</div>
    <div id="stageEditorList" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
      ${stages.map((s, i) => {
        const isTerminal = i === stages.length - 1 && s.key === 'onboarded';
        const isOnboarding = !!s.is_onboarding;
        return `<div class="stage-editor-row" style="display:flex;gap:6px;align-items:center" data-idx="${i}">
          <input type="text" value="${esc(s.key)}" class="se-key" style="width:120px;padding:4px 6px;font-size:0.82rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" ${isTerminal ? 'disabled' : ''} placeholder="key">
          <input type="text" value="${esc(s.label)}" class="se-label" style="flex:1;padding:4px 6px;font-size:0.82rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" placeholder="Label">
          <label style="display:flex;align-items:center;gap:3px;font-size:0.68rem;color:var(--text-muted);white-space:nowrap" title="Onboarding stage"><input type="checkbox" class="se-onboarding" ${isOnboarding ? 'checked' : ''}> Onboard</label>
          ${isTerminal ? '' : `<button class="btn btn--ghost btn--sm" style="color:var(--danger)" onclick="this.closest('.stage-editor-row').remove()">×</button>`}
        </div>`;
      }).join('')}
    </div>
    <button class="btn btn--sm" onclick="addStageEditorRow()" style="margin-bottom:12px">+ Add Stage</button>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" id="seCancel">Cancel</button>
      ${data.isCustom ? '<button class="btn" id="seReset">Reset to Default</button>' : ''}
      <button class="btn btn--primary" id="seSave">Save</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const close = () => { try { document.body.removeChild(overlay); } catch(e){} };
  overlay.querySelector('#seCancel').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  if (overlay.querySelector('#seReset')) {
    overlay.querySelector('#seReset').onclick = async () => {
      const resp = await authFetch(`/api/clients/${clientId}/hiring-stages`, { method: 'DELETE' });
      if (resp.ok) { toast('Stages reset to default'); invalidateStagesCache(clientId); close(); await resolveAndCacheHiringStages(); renderContent(); }
      else toast('Failed to reset', 'error');
    };
  }

  overlay.querySelector('#seSave').onclick = async () => {
    const rows = overlay.querySelectorAll('.stage-editor-row');
    const newStages = [];
    for (const row of rows) {
      const key = row.querySelector('.se-key').value.trim();
      const label = row.querySelector('.se-label').value.trim();
      const isOnboarding = row.querySelector('.se-onboarding')?.checked || false;
      if (!key || !label) { toast('All stages need a key and label', 'error'); return; }
      const entry = { key, label };
      if (isOnboarding) entry.is_onboarding = true;
      newStages.push(entry);
    }
    const resp = await authFetch(`/api/clients/${clientId}/hiring-stages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages: newStages }),
    });
    if (resp.ok) { toast('Stages saved'); invalidateStagesCache(clientId); close(); await resolveAndCacheHiringStages(); renderContent(); }
    else { const err = await resp.json().catch(() => ({})); toast(err.error || 'Failed to save', 'error'); }
  };
}

function addStageEditorRow() {
  const list = document.getElementById('stageEditorList');
  if (!list) return;
  const terminalRow = list.querySelector('.stage-editor-row:last-child');
  const newRow = document.createElement('div');
  newRow.className = 'stage-editor-row';
  newRow.style.cssText = 'display:flex;gap:6px;align-items:center';
  newRow.innerHTML = `<input type="text" class="se-key" style="width:120px;padding:4px 6px;font-size:0.82rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" placeholder="key">
    <input type="text" class="se-label" style="flex:1;padding:4px 6px;font-size:0.82rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" placeholder="Label">
    <label style="display:flex;align-items:center;gap:3px;font-size:0.68rem;color:var(--text-muted);white-space:nowrap"><input type="checkbox" class="se-onboarding"> Onboard</label>
    <button class="btn btn--ghost btn--sm" style="color:var(--danger)" onclick="this.closest('.stage-editor-row').remove()">×</button>`;
  list.insertBefore(newRow, terminalRow);
}
```

- [ ] **Step 5: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(ats): dynamic stage resolution, per-client kanban, stage editor UI"
```

---

## Task 6: Verification

- [ ] **Step 1: Run full test suite**

```
cd dashboard-server && npm test
```

- [ ] **Step 2: Run E2E tests**

```
cd dashboard-server && npm run test:e2e
```

- [ ] **Step 3: Restart PM2 and verify**

```
pm2 restart nbi-dashboard
```

Verify:
- Default client (no custom stages): kanban shows 5 standard lanes
- Set custom stages via gear icon: kanban re-renders with new lanes
- Candidate PATCH with custom stage key: succeeds
- Candidate PATCH with removed stage key: 400
- Rejection enforcement uses dynamic terminal stage
- Stage editor: add/remove/reorder stages, save, reset to default
- Onboarding auto-populate triggers on `is_onboarding` flag, not hardcoded stage name
- Metrics labels resolve from custom stage config
