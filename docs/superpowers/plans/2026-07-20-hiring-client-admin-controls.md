# Hiring Client-Admin Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a client administrator such as Lorenza manage hiring positions belonging to their own client while ordinary client members remain read-only and position deletion remains NBI-admin-only.

**Architecture:** Introduce one frontend capability predicate matching the authenticated user model, then use it consistently when rendering the position modal. Replace the blanket NBI-admin restriction on position PATCH and JD upload with a hiring-manager guard plus an ownership check that scopes client admins to their own `client_id`. Preserve existing cross-client authority for global NBI admins.

**Tech Stack:** Express 4, PostgreSQL, traditional browser JavaScript, Vitest and Supertest, Playwright.

---

### Task 1: Lock the API permission contract with failing tests

**Files:**
- Modify: `dashboard-server/tests/unit/hiring-client-scope.test.mjs`
- Modify: `dashboard-server/tests/unit/jd-attachment.test.mjs`
- Modify: `dashboard-server/tests/unit/salary-access-control.test.mjs`

- [ ] **Step 1: Add client-admin position update tests**

Add tests which create two clients and three users: a Couch Heroes client admin, an ordinary Couch Heroes client member, and another client's admin. Assert that the Couch Heroes client admin can PATCH its own position, while the member and other client's admin receive 403.

```js
it('client admin can update a position for their own client only', async () => {
  const clientA = await createTestClient({ name: 'ClientA' });
  const clientB = await createTestClient({ name: 'ClientB' });
  const adminA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'admin' });
  const adminB = await createTestUser({ role: 'member', client_id: clientB.id, client_role: 'admin' });
  const positionA = await createTestHiringPosition({ client_id: clientA.id, title: 'Engineer' });
  const tokenA = await mintSession(adminA.id);
  const tokenB = await mintSession(adminB.id);

  await request(app).patch(`/api/hiring-positions/${positionA.id}`)
    .set('Cookie', `nbi_session=${tokenA}`).send({ seniority: 'senior' }).expect(200);
  await request(app).patch(`/api/hiring-positions/${positionA.id}`)
    .set('Cookie', `nbi_session=${tokenB}`).send({ seniority: 'lead' }).expect(403);
});
```

- [ ] **Step 2: Add client-admin JD replacement tests**

Extend the JD suite so a client admin can upload a DOCX to its own position and receives 403 for a position belonging to another client. Verify rejected temporary uploads are removed.

- [ ] **Step 3: Add advertised salary visibility test**

Assert `salary_range` remains visible to a client admin but is absent for an ordinary client member.

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```powershell
npx vitest run tests/unit/hiring-client-scope.test.mjs tests/unit/jd-attachment.test.mjs tests/unit/salary-access-control.test.mjs --fileParallelism=false
```

Expected: client-admin PATCH and JD tests fail with 403, and client-admin salary visibility fails because `salary_range` is stripped.

### Task 2: Lock the modal behaviour with a failing Playwright test

**Files:**
- Modify: `dashboard-server/tests/e2e/ats-workflow.spec.js`

- [ ] **Step 1: Add the Lorenza-equivalent browser scenario**

Create a client-scoped admin, open the client's position modal, and assert that Status, Seniority, Discipline, Salary Range, Employment Type, Location, panel controls and Description are rendered. Change Seniority and poll PostgreSQL until the value is persisted. Assert `Delete Position` is absent.

```js
test('client admin manages own hiring position without destructive controls', async ({ page }) => {
  const client = await createTestClient({ name: 'Client Hiring Admin' });
  const clientAdmin = await createTestUser({ role: 'member', client_id: client.id, client_role: 'admin' });
  const position = await createTestHiringPosition({ client_id: client.id, title: 'Lead Developer' });
  await login(page, clientAdmin);
  await page.evaluate((id) => openPositionDetail(id), position.id);
  await expect(page.locator('#positionDetailPanel select').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete Position' })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the scenario and verify RED**

Run:

```powershell
npx playwright test tests/e2e/ats-workflow.spec.js --grep "client admin manages own hiring position"
```

Expected: the editable selectors are absent because the modal uses only `_currentUser.role === 'admin'`.

### Task 3: Implement scoped hiring-position management

**Files:**
- Modify: `dashboard-server/routes/hiring.js`
- Modify: `dashboard-server/public/js/domains/nbi-hiring.js`

- [ ] **Step 1: Add server-side manager and ownership checks**

Add a local middleware predicate that accepts global NBI admins or client admins. For PATCH and JD upload, load the target position and return 403 unless a client admin's `clientId` matches `position.client_id`. Reject `client_id` and `sow_id` reassignment by client admins. Keep DELETE unchanged behind `requireNBI, requireAdmin`.

```js
function requireHiringPositionManager(req, res, next) {
  const isNbiAdmin = req.user?.role === 'admin' && !req.user?.clientId;
  const isClientManager = !!req.user?.clientId && req.user?.clientRole === 'admin';
  if (!isNbiAdmin && !isClientManager) return res.status(403).json({ error: 'Hiring position manager access required' });
  next();
}

function canManagePosition(req, position) {
  return !req.user.clientId || position.client_id === req.user.clientId;
}
```

- [ ] **Step 2: Preserve salary visibility for client admins**

In `GET /api/hiring-positions`, strip `salary_range` only when `req.user.clientId` is set and `req.user.clientRole !== 'admin'`.

- [ ] **Step 3: Render controls for client admins**

Add a frontend predicate and use it for role configuration, salary range, JD replacement, panel editing and description editing. Keep deletion conditioned on global admin.

```js
function canManageHiringPositions() {
  return !!(_currentUser && (_currentUser.role === 'admin' || isClientAdmin()));
}
```

- [ ] **Step 4: Run focused API tests and verify GREEN**

Run the Task 1 Vitest command. Expected: all focused tests pass.

- [ ] **Step 5: Run focused Playwright test and verify GREEN**

Run the Task 2 Playwright command. Expected: client admin controls render, update persists, and deletion remains hidden.

### Task 4: Full verification and handoff

**Files:**
- Modify: `projects/nbi_dashboard/session_logs/2026-07-20_session.md`

- [ ] **Step 1: Run `npm test`**

Expected: all Vitest tests pass. If the inherited hang repeats, inspect and report the precise blocking phase rather than treating it as green.

- [ ] **Step 2: Run `npm run test:all`**

Expected: unit and Playwright suites pass with zero failures.

- [ ] **Step 3: Review the diff for scope and security**

Confirm client ownership is enforced server-side, ordinary members cannot mutate positions, salary is not exposed to ordinary members, and deletion remains NBI-admin-only.

- [ ] **Step 4: Append the verified outcome to the session log**

Record root cause, changed behaviour, tests run and any unresolved environmental constraint.
