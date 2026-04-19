# WorkSage Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 verified security/integrity issues in the WorkSage backend and frontend that survived the 2026-04-18 audit sprint.

**Architecture:** All changes are in `dashboard-server/server.js` (Express backend) and `nbi_project_dashboard.html` (frontend SPA). No new files except tests. Each fix is independent and can be committed separately.

**Tech Stack:** Node.js/Express, PostgreSQL, Vitest + supertest (unit tests), vanilla JS frontend.

**Test conventions:** Tests live in `dashboard-server/tests/unit/*.test.mjs`. Use `import { describe, it, expect, beforeEach } from 'vitest'` with `createRequire` for CJS helpers. `beforeEach(async () => { await truncate(); })` resets the DB. Use `mintSession(userId)` from `tests/helpers/auth.js` for auth tokens. Use `createTestUser`, `createTestClient`, etc. from `tests/helpers/fixtures.js`. Never call `pool.end()` in tests.

---

### Task 1: B-B3 + B-B4 — Auth hardening (is_active check + session invalidation on password change)

**Files:**
- Modify: `dashboard-server/server.js:764-767` (auth/me query)
- Modify: `dashboard-server/server.js:795-798` (requireAuth query)
- Modify: `dashboard-server/server.js:1038-1053` (change-password handler)
- Test: `dashboard-server/tests/unit/auth.test.mjs`

- [ ] **Step 1: Write failing tests for is_active and change-password**

Add these tests to `dashboard-server/tests/unit/auth.test.mjs`:

```javascript
it('deactivated user is rejected by GET /api/auth/me', async () => {
  const user = await createTestUser({ role: 'admin' });
  const token = await mintSession(user.id);
  // Deactivate the user
  await pool.query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(401);
});

it('deactivated user is rejected by requireAuth middleware', async () => {
  const user = await createTestUser({ role: 'admin' });
  const token = await mintSession(user.id);
  await pool.query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);
  const res = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(401);
});

it('change-password invalidates other sessions', async () => {
  const user = await createTestUser({ role: 'admin' });
  const token1 = await mintSession(user.id);
  const token2 = await mintSession(user.id);

  // Change password using token1
  await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${token1}`)
    .send({ currentPassword: user.raw_password, newPassword: 'NewPass123!' });

  // token2 should now be invalid
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token2}`);
  expect(res.status).toBe(401);
});
```

Note: The test file already imports `request`, `createTestUser`, and `app`. Add `mintSession` and `pool` imports at the top — add these lines after line 14:

```javascript
const { mintSession } = require('../helpers/auth.js');
const { pool } = require('../helpers/db.js');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/auth.test.mjs`
Expected: 3 new tests FAIL (deactivated user still gets 200; change-password doesn't kill sessions).

- [ ] **Step 3: Fix auth/me — add is_active filter**

In `dashboard-server/server.js`, change the query at line 764-767 from:

```javascript
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.role, u.client_id FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`, [hashed]
  );
```

to:

```javascript
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.role, u.client_id FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`, [hashed]
  );
```

- [ ] **Step 4: Fix requireAuth — add is_active filter**

In `dashboard-server/server.js`, change the query at line 795-798 from:

```javascript
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.role, u.client_id FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`, [hashedToken]
    );
```

to:

```javascript
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.role, u.client_id FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`, [hashedToken]
    );
```

- [ ] **Step 5: Fix change-password — invalidate sessions + clear token cache**

In `dashboard-server/server.js`, replace lines 1050-1052:

```javascript
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
  res.json({ ok: true });
```

with:

```javascript
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [req.user.id]);
  _tokenCache.clear();
  res.json({ ok: true });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/auth.test.mjs`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/auth.test.mjs
git commit -m "fix(hub): add is_active check to auth + invalidate sessions on password change

- requireAuth and auth/me now filter WHERE u.is_active = true (B-B3)
- change-password deletes all sessions and clears token cache (B-B4)
- Three new unit tests covering both fixes"
```

---

### Task 2: B-N9 — getClientScopes deny-by-default for teamless users

**Files:**
- Modify: `dashboard-server/server.js:838-839`
- Test: `dashboard-server/tests/unit/client-scope.test.mjs`

- [ ] **Step 1: Write failing test**

Add this test to `dashboard-server/tests/unit/client-scope.test.mjs`, inside the existing `describe('Client-scoped users', ...)` block:

```javascript
  it('internal user with no team gets empty scope (not unrestricted)', async () => {
    const clientA = await createTestClient({ name: 'Client A' });
    const clientB = await createTestClient({ name: 'Client B' });

    // Internal member with NO team assignments
    const noTeam = await createTestUser({ username: 'orphan', role: 'member' });
    const noTeamToken = await mintSession(noTeam.id);

    await createTestTask({ title: 'Task A', client_id: clientA.id });
    await createTestTask({ title: 'Task B', client_id: clientB.id });

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${noTeamToken}`);
    expect(res.status).toBe(200);
    // A teamless member should see NO client tasks (deny-by-default)
    const titles = res.body.map(t => t.title);
    expect(titles).not.toContain('Task A');
    expect(titles).not.toContain('Task B');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/client-scope.test.mjs`
Expected: FAIL — teamless user currently sees all tasks (returns null = unrestricted).

- [ ] **Step 3: Fix getClientScopes**

In `dashboard-server/server.js`, change line 838-839 from:

```javascript
  // No team memberships: unrestricted (can't filter without team data)
  if (teams.length === 0) { req._clientScopes = null; return null; }
```

to:

```javascript
  // No team memberships: deny-by-default (see only ALWAYS_VISIBLE_CLIENTS)
  if (teams.length === 0) {
    const { rows: exceptions } = await pool.query(
      'SELECT id FROM clients WHERE name = ANY($1)',
      [ALWAYS_VISIBLE_CLIENTS]
    );
    const exceptionIds = exceptions.map(e => e.id);
    req._clientScopes = exceptionIds.length > 0 ? exceptionIds : ['00000000-0000-0000-0000-000000000000'];
    return req._clientScopes;
  }
```

The sentinel UUID ensures `ANY($1)` never matches if there are no ALWAYS_VISIBLE_CLIENTS, effectively returning zero results instead of an empty array (which some callers treat as "no filter").

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard-server && npx vitest run tests/unit/client-scope.test.mjs`
Expected: All tests PASS (new test + all existing scope tests).

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/client-scope.test.mjs
git commit -m "fix(hub): deny-by-default for teamless users in getClientScopes (B-N9)

Users with no team memberships now see only ALWAYS_VISIBLE_CLIENTS
instead of getting unrestricted access to all data."
```

---

### Task 3: B-B13 — Scope leads/pipeline and dashboard/summary + standalone settings endpoint

**Files:**
- Modify: `dashboard-server/server.js:4940-4944` (GET /api/settings)
- Modify: `dashboard-server/server.js:4966-5011` (GET /api/dashboard/summary)
- Modify: `dashboard-server/server.js:5240-5251` (GET /api/leads/reminders)
- Modify: `dashboard-server/server.js:5258-5283` (GET /api/leads/pipeline/summary)
- Modify: `dashboard-server/server.js:5286-5300` (GET /api/leads/pipeline/forecast)
- Test: `dashboard-server/tests/unit/client-scope.test.mjs`

- [ ] **Step 1: Write failing tests**

Add these tests inside the existing `describe('Client-scoped users', ...)` block in `client-scope.test.mjs`. They reuse the `createScopedSetup()` helper already in the file:

```javascript
  it('scoped user only sees whitelisted settings from GET /api/settings', async () => {
    const { adminToken, scopedToken } = await createScopedSetup();

    // Seed a sensitive setting and a safe one
    await pool.query("INSERT INTO settings (key, value) VALUES ('expense_approver', '\"tom\"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value");
    await pool.query("INSERT INTO settings (key, value) VALUES ('currency', '\"GBP\"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value");

    // Admin sees everything
    const adminRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body).toHaveProperty('expense_approver');
    expect(adminRes.body).toHaveProperty('currency');

    // Scoped user should NOT see expense_approver
    const scopedRes = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(scopedRes.status).toBe(200);
    expect(scopedRes.body).not.toHaveProperty('expense_approver');
    expect(scopedRes.body).toHaveProperty('currency');
  });

  it('scoped user only sees their client in leads/pipeline/summary', async () => {
    const { clientA, clientB, adminToken, scopedToken } = await createScopedSetup();

    // Create a pipeline stage + leads for both clients
    const stage = await createTestLeadStage({ name: 'Discovery' });
    try {
      await createTestLead({ client_id: clientA.id, stage_id: stage.id, title: 'Lead A' });
      await createTestLead({ client_id: clientB.id, stage_id: stage.id, title: 'Lead B' });

      const scopedRes = await request(app)
        .get('/api/leads/pipeline/summary')
        .set('Authorization', `Bearer ${scopedToken}`);
      expect(scopedRes.status).toBe(200);
      // Scoped user should see at most 1 deal (Lead A)
      const totalDeals = scopedRes.body.byStage.reduce((sum, s) => sum + s.deal_count, 0);
      expect(totalDeals).toBeLessThanOrEqual(1);
    } finally {
      await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [stage.id]);
    }
  });

  it('dashboard summary is scoped for external users', async () => {
    const { scopedToken, clientB } = await createScopedSetup();
    // Task B belongs to Client B — scoped user should not see it in summary
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${scopedToken}`);
    expect(res.status).toBe(200);
    // by_client should not include Client B
    const clientNames = res.body.by_client.map(c => c.name);
    expect(clientNames).not.toContain('Client B');
  });
```

Also add imports for `createTestLead` and `createTestLeadStage` to the fixtures import line at the top:

```javascript
const { createTestUser, createTestClient, createTestTask, createTestLead, createTestLeadStage } = require('../helpers/fixtures.js');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/client-scope.test.mjs`
Expected: 3 new tests FAIL (scoped user sees all settings, all deals, all clients in summary).

- [ ] **Step 3: Fix GET /api/settings — apply EXTERNAL_SETTINGS_ALLOW**

In `dashboard-server/server.js`, replace lines 4939-4945:

```javascript
/** GET /api/settings — Return all settings as a key-value object */
app.get('/api/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM settings');
  const obj = {};
  rows.forEach(r => { obj[r.key] = r.value; });
  res.json(obj);
});
```

with:

```javascript
/** GET /api/settings — Return settings as a key-value object (external users see only safe keys) */
app.get('/api/settings', async (req, res) => {
  const SETTINGS_ALLOW = new Set([
    'currency', 'hourly_rate', 'hourlyRate', 'date_format', 'dateFormat',
    'timezone', 'client_priority', 'clientPriority',
  ]);
  const isExternal = !!req.user?.clientId;
  const { rows } = await pool.query('SELECT key, value FROM settings');
  const obj = {};
  rows.forEach(r => {
    if (!isExternal || SETTINGS_ALLOW.has(r.key)) obj[r.key] = r.value;
  });
  res.json(obj);
});
```

- [ ] **Step 4: Fix GET /api/dashboard/summary — scope by client**

In `dashboard-server/server.js`, replace lines 4966-4969:

```javascript
app.get('/api/dashboard/summary', async (req, res) => {
  const { client_id } = req.query;
  let clientFilter = ''; let vals = [];
  if (client_id) { clientFilter = 'WHERE t.client_id = $1'; vals = [client_id]; }
```

with:

```javascript
app.get('/api/dashboard/summary', async (req, res) => {
  const scopes = await getClientScopes(req);
  let { client_id } = req.query;
  if (scopes && scopes.length === 1) client_id = scopes[0];
  let clientFilter = ''; let vals = [];
  if (client_id) { clientFilter = 'WHERE t.client_id = $1'; vals = [client_id]; }
  else if (scopes && scopes.length > 1) { clientFilter = 'WHERE t.client_id = ANY($1)'; vals = [scopes]; }
```

Also scope the `byClient` query. After line 4997 (`GROUP BY c.id, c.name ORDER BY c.name`), add a WHERE clause. Replace lines 4989-4998:

```javascript
  const byClient = await pool.query(`
    SELECT c.id, c.name,
      count(t.id) as task_count,
      count(t.id) FILTER (WHERE t.status = 'Done') as done_count,
      COALESCE(sum(t.hours_estimated), 0) as hours_estimated,
      COALESCE(sum(t.hours_spent), 0) as hours_spent
    FROM clients c
    LEFT JOIN tasks t ON t.client_id = c.id
    GROUP BY c.id, c.name ORDER BY c.name
  `);
```

with:

```javascript
  let byClientQuery = `
    SELECT c.id, c.name,
      count(t.id) as task_count,
      count(t.id) FILTER (WHERE t.status = 'Done') as done_count,
      COALESCE(sum(t.hours_estimated), 0) as hours_estimated,
      COALESCE(sum(t.hours_spent), 0) as hours_spent
    FROM clients c
    LEFT JOIN tasks t ON t.client_id = c.id`;
  let byClientVals = [];
  if (scopes) {
    byClientQuery += ' WHERE c.id = ANY($1)';
    byClientVals = [scopes];
  }
  byClientQuery += ' GROUP BY c.id, c.name ORDER BY c.name';
  const byClient = await pool.query(byClientQuery, byClientVals);
```

- [ ] **Step 5: Fix GET /api/leads/reminders — scope by client**

Replace lines 5240-5251:

```javascript
app.get('/api/leads/reminders', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT l.id, l.title, l.next_followup_date, l.next_action, l.deal_owner,
      c.name as client_name, s.name as stage_name
    FROM leads l
    LEFT JOIN clients c ON l.client_id = c.id
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    WHERE l.next_followup_date <= CURRENT_DATE AND s.is_closed = false
    ORDER BY l.next_followup_date ASC
  `);
  res.json(rows);
});
```

with:

```javascript
app.get('/api/leads/reminders', async (req, res) => {
  const scopes = await getClientScopes(req);
  let scopeFilter = '';
  let vals = [];
  if (scopes) {
    scopeFilter = ' AND l.client_id = ANY($1)';
    vals = [scopes];
  }
  const { rows } = await pool.query(`
    SELECT l.id, l.title, l.next_followup_date, l.next_action, l.deal_owner,
      c.name as client_name, s.name as stage_name
    FROM leads l
    LEFT JOIN clients c ON l.client_id = c.id
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    WHERE l.next_followup_date <= CURRENT_DATE AND s.is_closed = false${scopeFilter}
    ORDER BY l.next_followup_date ASC
  `, vals);
  res.json(rows);
});
```

- [ ] **Step 6: Fix GET /api/leads/pipeline/summary — scope by client**

Replace lines 5258-5283:

```javascript
app.get('/api/leads/pipeline/summary', async (req, res) => {
  const { sector } = req.query;
  let sectorFilter = '';
  let vals = [];
  if (sector) { sectorFilter = 'AND c.sector = $1'; vals = [sector]; }

  const byStage = await pool.query(`
    SELECT s.id, s.name, s.colour, s.sort_order, s.is_closed, s.is_won,
      count(l.id)::int as deal_count,
      COALESCE(sum(l.rom_min), 0)::numeric as total_rom_min,
      COALESCE(sum(l.rom_max), 0)::numeric as total_rom_max,
      COALESCE(sum(l.weighted_value), 0)::numeric as total_weighted
    FROM lead_pipeline_stages s
    LEFT JOIN leads l ON l.stage_id = s.id
    LEFT JOIN clients c ON l.client_id = c.id
    WHERE 1=1 ${sectorFilter}
    GROUP BY s.id, s.name, s.colour, s.sort_order, s.is_closed, s.is_won
    ORDER BY s.sort_order
  `, vals);

  // FX rates (stored in settings) let the frontend convert USD/EUR pipeline values to GBP
  const fxResult = await pool.query("SELECT value FROM settings WHERE key = 'fx_rates'");
  const fxRates = fxResult.rows.length > 0 ? fxResult.rows[0].value : { USD: 0.79, EUR: 0.86 };

  res.json({ byStage: byStage.rows, fxRates });
});
```

with:

```javascript
app.get('/api/leads/pipeline/summary', async (req, res) => {
  const scopes = await getClientScopes(req);
  const { sector } = req.query;
  let filters = [];
  let vals = [];
  let i = 1;
  if (sector) { filters.push(`c.sector = $${i}`); vals.push(sector); i++; }
  if (scopes) { filters.push(`l.client_id = ANY($${i})`); vals.push(scopes); i++; }
  const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';

  const byStage = await pool.query(`
    SELECT s.id, s.name, s.colour, s.sort_order, s.is_closed, s.is_won,
      count(l.id)::int as deal_count,
      COALESCE(sum(l.rom_min), 0)::numeric as total_rom_min,
      COALESCE(sum(l.rom_max), 0)::numeric as total_rom_max,
      COALESCE(sum(l.weighted_value), 0)::numeric as total_weighted
    FROM lead_pipeline_stages s
    LEFT JOIN leads l ON l.stage_id = s.id
    LEFT JOIN clients c ON l.client_id = c.id
    ${whereClause}
    GROUP BY s.id, s.name, s.colour, s.sort_order, s.is_closed, s.is_won
    ORDER BY s.sort_order
  `, vals);

  const fxResult = await pool.query("SELECT value FROM settings WHERE key = 'fx_rates'");
  const fxRates = fxResult.rows.length > 0 ? fxResult.rows[0].value : { USD: 0.79, EUR: 0.86 };

  res.json({ byStage: byStage.rows, fxRates });
});
```

- [ ] **Step 7: Fix GET /api/leads/pipeline/forecast — scope by client**

Replace lines 5286-5301:

```javascript
app.get('/api/leads/pipeline/forecast', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      to_char(l.expected_close_date, 'YYYY-MM') as month,
      l.currency,
      count(*) as deal_count,
      COALESCE(sum(l.weighted_value), 0) as total_weighted,
      COALESCE(sum(l.rom_max), 0) as total_rom
    FROM leads l
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    WHERE l.expected_close_date IS NOT NULL AND s.is_closed = false
    GROUP BY to_char(l.expected_close_date, 'YYYY-MM'), l.currency
    ORDER BY month
  `);
  res.json(rows);
});
```

with:

```javascript
app.get('/api/leads/pipeline/forecast', async (req, res) => {
  const scopes = await getClientScopes(req);
  let scopeFilter = '';
  let vals = [];
  if (scopes) {
    scopeFilter = ' AND l.client_id = ANY($1)';
    vals = [scopes];
  }
  const { rows } = await pool.query(`
    SELECT
      to_char(l.expected_close_date, 'YYYY-MM') as month,
      l.currency,
      count(*) as deal_count,
      COALESCE(sum(l.weighted_value), 0) as total_weighted,
      COALESCE(sum(l.rom_max), 0) as total_rom
    FROM leads l
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    WHERE l.expected_close_date IS NOT NULL AND s.is_closed = false${scopeFilter}
    GROUP BY to_char(l.expected_close_date, 'YYYY-MM'), l.currency
    ORDER BY month
  `, vals);
  res.json(rows);
});
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/client-scope.test.mjs`
Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/client-scope.test.mjs
git commit -m "fix(hub): scope leads/pipeline, dashboard/summary, and GET /api/settings (B-B13)

- GET /api/settings strips internal keys for external users
- GET /api/dashboard/summary filters by getClientScopes
- GET /api/leads/reminders filters by getClientScopes
- GET /api/leads/pipeline/summary filters by getClientScopes
- GET /api/leads/pipeline/forecast filters by getClientScopes
- Three new scope tests"
```

---

### Task 4: B-B19 — Remove OCR demo key fallback

**Files:**
- Modify: `dashboard-server/server.js:6025-6027`

- [ ] **Step 1: Fix the OCR fallback**

In `dashboard-server/server.js`, replace line 6025:

```javascript
      const ocrApiKey = process.env.OCR_API_KEY || 'helloworld'; // 'helloworld' is ocr.space's free demo key
```

with:

```javascript
      const ocrApiKey = process.env.OCR_API_KEY;
      if (!ocrApiKey) {
        log('warn', 'Receipt', 'OCR_API_KEY not set, skipping external OCR — using local Tesseract only');
        if (mime.startsWith('image/') && !mime.includes('heic')) {
          const { data } = await Tesseract.recognize(filePath, 'eng', { logger: () => {} });
          text = data.text || '';
          ocrMethod = 'tesseract-local';
        }
      }
```

Then wrap the existing ocr.space fetch block (lines 6026-6049) in an `if (ocrApiKey) {` ... `}` so it only runs when the key is present.

The result should be: no `OCR_API_KEY` env var = fall straight to local Tesseract. No employee PII leaves the server.

- [ ] **Step 2: Verify no other references to `helloworld` remain**

Run: `grep -r "helloworld" dashboard-server/`
Expected: No matches.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/server.js
git commit -m "fix(hub): remove ocr.space demo key fallback, use local Tesseract only (B-B19)

OCR_API_KEY must now be set explicitly to use external OCR.
Without it, receipt parsing falls back to local Tesseract —
no employee PII sent to third-party APIs."
```

---

### Task 5: B-C2 — Add validation to /api/restore

**Files:**
- Modify: `dashboard-server/server.js:1464-1643` (restore handler)
- Test: `dashboard-server/tests/unit/restore-validation.test.mjs` (new)

- [ ] **Step 1: Write failing tests**

Create `dashboard-server/tests/unit/restore-validation.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('POST /api/restore — input validation', () => {
  async function adminSetup() {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    return { admin, token };
  }

  it('rejects non-admin', async () => {
    const member = await createTestUser({ role: 'member' });
    const token = await mintSession(member.id);
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({ backup: { tables: {} } });
    expect(res.status).toBe(403);
  });

  it('rejects client row with invalid UUID id', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            clients: [{ id: 'not-a-uuid', name: 'Bad Client' }],
          },
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validation/i);
  });

  it('rejects client row with missing name', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            clients: [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: '' }],
          },
        },
      });
    expect(res.status).toBe(400);
  });

  it('rejects task row with invalid status', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            tasks: [{
              id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              title: 'X',
              status: 'INVALID_STATUS',
            }],
          },
        },
      });
    expect(res.status).toBe(400);
  });

  it('rejects settings row with disallowed key', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            settings: [{ key: '__proto__', value: '{}' }],
          },
        },
      });
    expect(res.status).toBe(400);
  });

  it('accepts valid backup data', async () => {
    const { token } = await adminSetup();
    const res = await request(app)
      .post('/api/restore')
      .set('Authorization', `Bearer ${token}`)
      .send({
        backup: {
          tables: {
            clients: [{
              id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              name: 'Valid Client',
              created_at: '2026-01-01T00:00:00Z',
            }],
          },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/restore-validation.test.mjs`
Expected: Tests that expect 400 will FAIL (currently returns 200 or 500).

- [ ] **Step 3: Add validation helpers before the restore endpoint**

In `dashboard-server/server.js`, add this block just before the `POST /api/restore` handler (before line 1457):

```javascript
// --- Restore validation helpers (B-C2) ---
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = new Set(['Not started', 'Planning', 'In progress', 'Done', 'Blocked', 'Cancelled']);
const SETTINGS_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

function validateRestoreClients(rows) {
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    if (!c.id || !UUID_RE.test(c.id)) return `clients[${i}].id: invalid UUID`;
    if (!c.name || typeof c.name !== 'string' || c.name.trim().length === 0) return `clients[${i}].name: required`;
    if (c.name.length > 200) return `clients[${i}].name: too long (max 200)`;
  }
  return null;
}

function validateRestoreTasks(rows) {
  for (let i = 0; i < rows.length; i++) {
    const t = rows[i];
    if (!t.id || !UUID_RE.test(t.id)) return `tasks[${i}].id: invalid UUID`;
    if (!t.title || typeof t.title !== 'string' || t.title.trim().length === 0) return `tasks[${i}].title: required`;
    if (t.title.length > 500) return `tasks[${i}].title: too long (max 500)`;
    if (t.status && !VALID_STATUSES.has(t.status)) return `tasks[${i}].status: invalid value "${t.status}"`;
    if (t.parent_id && !UUID_RE.test(t.parent_id)) return `tasks[${i}].parent_id: invalid UUID`;
    if (t.client_id && !UUID_RE.test(t.client_id)) return `tasks[${i}].client_id: invalid UUID`;
  }
  return null;
}

function validateRestoreSettings(rows) {
  for (let i = 0; i < rows.length; i++) {
    const s = rows[i];
    if (!s.key || typeof s.key !== 'string') return `settings[${i}].key: required`;
    if (!SETTINGS_KEY_RE.test(s.key)) return `settings[${i}].key: invalid format`;
  }
  return null;
}

function validateRestoreLeads(rows) {
  for (let i = 0; i < rows.length; i++) {
    const l = rows[i];
    if (!l.id || !UUID_RE.test(l.id)) return `leads[${i}].id: invalid UUID`;
    if (!l.title || typeof l.title !== 'string') return `leads[${i}].title: required`;
    if (l.client_id && !UUID_RE.test(l.client_id)) return `leads[${i}].client_id: invalid UUID`;
    if (l.stage_id && !UUID_RE.test(l.stage_id)) return `leads[${i}].stage_id: invalid UUID`;
  }
  return null;
}

function validateRestoreUsers(rows) {
  for (let i = 0; i < rows.length; i++) {
    const u = rows[i];
    if (!u.id || !UUID_RE.test(u.id)) return `users[${i}].id: invalid UUID`;
    if (u.role && !['admin', 'member'].includes(u.role)) return `users[${i}].role: invalid`;
  }
  return null;
}

function validateRestoreGenericUUID(rows, tableName) {
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].id || !UUID_RE.test(rows[i].id)) return `${tableName}[${i}].id: invalid UUID`;
  }
  return null;
}
```

- [ ] **Step 4: Wire validation into the restore handler**

In `dashboard-server/server.js`, inside `POST /api/restore`, add validation after `if (!backup || !backup.tables)` check (after line 1467), before `const conn = await pool.connect()`:

```javascript
  // Validate each table before touching the DB
  const validators = [
    ['clients', validateRestoreClients],
    ['tasks', validateRestoreTasks],
    ['settings', validateRestoreSettings],
    ['leads', validateRestoreLeads],
    ['users', validateRestoreUsers],
  ];
  for (const [table, validator] of validators) {
    if (backup.tables[table] && Array.isArray(backup.tables[table])) {
      const err = validator(backup.tables[table]);
      if (err) return res.status(400).json({ error: `Restore validation failed: ${err}` });
    }
  }
  // Validate UUID on remaining tables
  for (const table of ['task_comments', 'expenses', 'audit_log', 'bug_reports', 'bug_report_comments',
      'calendar_events', 'teams', 'team_members', 'hiring_positions', 'candidates', 'sows']) {
    if (backup.tables[table] && Array.isArray(backup.tables[table])) {
      const err = validateRestoreGenericUUID(backup.tables[table], table);
      if (err) return res.status(400).json({ error: `Restore validation failed: ${err}` });
    }
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/restore-validation.test.mjs`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/restore-validation.test.mjs
git commit -m "fix(hub): validate /api/restore input per-table before upsert (B-C2)

UUID format, required fields, status enum, and settings key
format are all checked before BEGIN. Rejects 400 with a specific
error message identifying the bad row."
```

---

### Task 6: F-B20 — Add cycle guard to getRootAncestor and getDescendants

**Files:**
- Modify: `nbi_project_dashboard.html:3003` (getRootAncestor)
- Modify: `nbi_project_dashboard.html:3005` (getDescendants)

- [ ] **Step 1: Fix getRootAncestor with visited set**

In `nbi_project_dashboard.html`, replace line 3003:

```javascript
function getRootAncestor(task) { if (!task.parentId) return task; const p = tasks.find(t => t.id === task.parentId); return p ? getRootAncestor(p) : task; }
```

with:

```javascript
function getRootAncestor(task) { const visited = new Set(); let cur = task; while (cur && cur.parentId) { if (visited.has(cur.id)) return cur; visited.add(cur.id); const p = tasks.find(t => t.id === cur.parentId); if (!p) return cur; cur = p; } return cur || task; }
```

- [ ] **Step 2: Fix getDescendants with visited set**

In `nbi_project_dashboard.html`, replace line 3005:

```javascript
function getDescendants(taskId) { const kids = getChildren(taskId); let all = [...kids]; kids.forEach(k => all.push(...getDescendants(k.id))); return all; }
```

with:

```javascript
function getDescendants(taskId, _visited) { const seen = _visited || new Set(); if (seen.has(taskId)) return []; seen.add(taskId); const kids = getChildren(taskId); let all = [...kids]; kids.forEach(k => all.push(...getDescendants(k.id, seen))); return all; }
```

- [ ] **Step 3: Verify no regressions**

The `getTaskPractice` function (line 3146) already uses a cycle guard with a visited set — these two now match that pattern. Both are pure client-side functions so no server restart needed. Verify the frontend loads and the task tree renders correctly (tree view, board view).

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "fix(hub): add cycle guards to getRootAncestor and getDescendants (F-B20)

Both now use a visited set to break infinite recursion if
task.parentId forms a cycle. Matches getTaskPractice pattern."
```

---

### Task 7: Run full test suite

- [ ] **Step 1: Run all unit tests**

Run: `cd dashboard-server && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 2: Run E2E tests if available**

Run: `cd dashboard-server && npm run test:e2e`
Expected: All tests PASS (or skip if Playwright not configured in this environment).

- [ ] **Step 3: Restart PM2 and verify site loads**

Run: `pm2 restart nbi-dashboard`
Then verify `https://worksage.nbi-consulting.com` loads correctly in a browser.
