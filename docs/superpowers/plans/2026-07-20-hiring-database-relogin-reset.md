# Hiring Database Re-login Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure candidates remain visible after re-login and make scoped Hiring role fields editable to every authenticated user, while reserving role closure for NBI and client administrators.

**Architecture:** Keep candidate API scoping unchanged because production checks show the records are present and already client-scoped. Reset transient Database filters at the successful authentication boundary, expose candidate and position views to all authenticated users, and use separate edit and close capabilities in the role modal. Allow any authenticated user to PATCH and replace a JD within their existing client scope, but reject `status: closed` unless the user is an NBI admin or the position's client admin.

**Tech Stack:** Express-served browser JavaScript, Playwright, PostgreSQL test fixtures.

---

### Task 1: Lock the authentication-boundary regression with a failing browser test

**Files:**
- Modify: `dashboard-server/tests/e2e/ats-workflow.spec.js`

- [x] **Step 1: Add a Glen-equivalent re-login scenario**

Create an NBI admin and active candidate, log in, open Hiring Database, then set a stale `position_id` filter and log out through `handleLogout()`. Log back in through the existing login form without reloading the page. Assert that `window._hiringDbFilters` is empty and the candidate row is visible again.

```js
test('successful re-login clears retained Hiring Database filters', async ({ page }) => {
  await truncate();
  const admin = await createTestUser({ role: 'admin', display_name: 'Hiring Database Admin' });
  const client = await createTestClient({ name: 'Hiring Database Client' });
  const candidate = await createTestCandidate({ client_id: client.id, name: 'Visible Candidate', stage: 'sourcing' });

  await login(page, admin);
  await page.evaluate(() => {
    window._hiringActiveTab = 'database';
    window._hiringDbFilters = { position_id: '00000000-0000-0000-0000-000000000001' };
    renderContent();
  });
  await expect(page.getByText(candidate.name, { exact: true })).toHaveCount(0);

  await page.evaluate(() => handleLogout());
  await page.waitForSelector('#loginScreen', { state: 'visible' });
  await page.locator('#loginUser').fill(admin.username);
  await page.locator('#loginPass').fill(admin.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden' });
  await page.evaluate(() => { window._hiringActiveTab = 'database'; renderContent(); });

  expect(await page.evaluate(() => window._hiringDbFilters)).toEqual({});
  await expect(page.getByText(candidate.name, { exact: true })).toBeVisible();
});
```

- [x] **Step 2: Run the focused scenario and verify RED**

Run:

```powershell
npx playwright test tests/e2e/ats-workflow.spec.js --grep "successful re-login clears retained Hiring Database filters"
```

Expected: FAIL because `handleLogin()` currently retains `_hiringDbFilters` and the candidate remains filtered out.

### Task 2: Lock the empty-filter recovery behaviour with a failing browser test

**Files:**
- Modify: `dashboard-server/tests/e2e/ats-workflow.spec.js`

- [x] **Step 1: Add the zero-match recovery scenario**

Set a position filter that matches no candidates and assert that the Database tab names the empty filtered state, renders the hidden position filter as a chip, and restores the candidate row when `Clear filters` is pressed.

```js
test('zero matching candidates explains active filters and offers recovery', async ({ page }) => {
  await login(page, admin);
  await page.evaluate((positionId) => {
    window._hiringActiveTab = 'database';
    window._hiringDbFilters = { position_id: positionId };
    renderContent();
  }, position.id);
  await expect(page.getByText('No candidates match the current filters.')).toBeVisible();
  await expect(page.locator('.ats-filter-chips')).toContainText(position.title);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText(candidate.name, { exact: true })).toBeVisible();
});
```

- [x] **Step 2: Run the focused scenario and verify RED**

Run the same Playwright file with `--grep "zero matching candidates"`.

Expected: FAIL because the position chip, explicit zero-match row and clear action do not exist.

### Task 3: Reset transient Database state and render a recoverable empty result

**Files:**
- Modify: `dashboard-server/public/js/domains/nbi-hiring.js`
- Modify: `dashboard-server/public/js/nbi-api.js`
- Modify: `nbi_project_dashboard.html`
- Modify: `dashboard-server/tests/e2e/ats-workflow.spec.js`

- [x] **Step 1: Add the focused reset function**

Add a global Hiring-domain function which creates a fresh filter object and restores the default Database sort and needs-action flag.

```js
function resetHiringDatabaseState() {
  window._hiringDbFilters = {};
  window._hiringDbNeedsAction = false;
  window._hiringDbSort = 'days_desc';
}
```

- [x] **Step 2: Invoke the reset after successful authentication**

Immediately after assigning `_currentUser` in `handleLogin()`, invoke `resetHiringDatabaseState()` when the Hiring domain has loaded.

```js
_currentUser = data.user;
if (typeof resetHiringDatabaseState === 'function') resetHiringDatabaseState();
```

- [x] **Step 3: Expose position filters and render the zero-match row**

Resolve the selected position title into an `ats-chip`. When `filtered.length === 0`, render one six-column row containing `No candidates match the current filters.` and a `Clear filters` button that calls `resetHiringDatabaseState(); renderContent()`.

```js
var selectedPosition = positions.find(function(p) { return p.id === filters.position_id; });
if (filters.position_id) chipsHtml += '<span class="ats-chip" ...>' + esc(selectedPosition ? selectedPosition.title : 'Position filter') + ' ...</span>';

if (filtered.length === 0) {
  html += '<tr><td colspan="6" class="ats-db-empty">No candidates match the current filters. ' +
    '<button type="button" class="btn" onclick="resetHiringDatabaseState();renderContent()">Clear filters</button></td></tr>';
}
```

- [x] **Step 4: Advance the Hiring script cache version**

Change the Hiring domain script query from `?v=28` to `?v=29` and update the existing app-shell assertion to expect v29.

- [x] **Step 5: Run both focused scenarios and verify GREEN**

Run:

```powershell
npx playwright test tests/e2e/ats-workflow.spec.js --grep "successful re-login clears retained Hiring Database filters|zero matching candidates"
```

Expected: both scenarios pass.

### Task 4: Apply the corrected Hiring capability matrix

**Files:**
- Modify: `dashboard-server/tests/unit/hiring-client-scope.test.mjs`
- Modify: `dashboard-server/tests/unit/salary-access-control.test.mjs`
- Modify: `dashboard-server/tests/unit/jd-attachment.test.mjs`
- Modify: `dashboard-server/tests/e2e/ats-workflow.spec.js`
- Modify: `dashboard-server/routes/hiring.js`
- Modify: `dashboard-server/public/js/domains/nbi-hiring.js`

- [x] **Step 1: Write failing API capability tests**

Change the ordinary client-member PATCH expectation from 403 to 200 for editable fields, then add explicit 403 cases for ordinary client and NBI members attempting `status: closed`. Require ordinary client and NBI members to see `salary_range`, allow ordinary users to upload a JD within scope, and retain the cross-client 403 case.

- [x] **Step 2: Run the focused API tests and verify RED**

Run:

```powershell
npx vitest run tests/unit/hiring-client-scope.test.mjs tests/unit/salary-access-control.test.mjs tests/unit/jd-attachment.test.mjs --fileParallelism=false
```

Expected: ordinary-user field edits, salary visibility and JD uploads fail under the current admin-only guards.

- [x] **Step 3: Write the failing ordinary-user browser scenario**

Create a client member, position and candidate. Assert Database and Positions tabs are visible; the candidate is visible in Database; the position modal renders editable Status, Seniority, Discipline, Salary Range, Employment Type, Location, Job Description, Interview Panel and Description fields; a normal field change persists; and the Status select has no selectable `closed` option.

- [x] **Step 4: Run the browser scenario and verify RED**

Run the ATS workflow file with `--grep "ordinary client user sees candidates"`.

Expected: FAIL because the tabs and editable role controls are hidden from ordinary client users.

- [x] **Step 5: Implement separate edit and close capabilities**

Make the frontend edit capability true for every authenticated user and add a separate close predicate for NBI admins and client admins. Show Hiring tabs and scoped filters to ordinary users. Render `Closed` in the Status select only for users with close authority, while preserving a disabled selected value when an ordinary user views an already-closed role.

Change the position PATCH and JD middleware to require authentication rather than administrator status, keep `canManagePosition` client ownership checks, reject `status: closed` for non-admins, retain cross-client reassignment protection, return salary range to all scoped users, and leave deletion NBI-admin-only.

- [x] **Step 6: Run focused API and browser tests and verify GREEN**

Re-run the three unit files and the ordinary-user Playwright scenario. Require all focused cases to pass.

### Task 5: Verify, integrate and release

**Files:**
- Modify: `projects/nbi_dashboard/session_logs/2026-07-20_session.md`
- Modify: `projects/nbi_dashboard/session_logs/2026-07-21_session.md`

- [x] **Step 1: Run the complete unit suite**

Run `npm test` from `dashboard-server/` and require all tests to pass.

- [x] **Step 2: Run the complete browser suite**

Run `npm run test:e2e` from `dashboard-server/` and require all Playwright scenarios to pass apart from declared skips.

- [ ] **Step 3: Visually inspect the Database tab**

Capture the populated Database view and the filtered zero-match state at Glen's screenshot width. Confirm the table is visible, the empty message is readable, the active position is named and the clear action restores rows.

- [ ] **Step 4: Commit and merge the isolated worktree**

Commit only the plan, source, test and session-log changes. Preserve existing generated screenshot modifications. Merge the branch into the main working tree without disturbing unrelated local changes.

- [ ] **Step 5: Restart and verify WorkSage**

Restart staging first, verify health and bundle v29, then restart production and verify the public health endpoint and HTML bundle reference. Re-run the Glen-authenticated candidate-list check and require active candidate rows to render after the login boundary.

- [ ] **Step 6: Record the diagnosis and release evidence**

Append the confirmed root cause, corrected capability matrix, tests, deployment state and production verification to the 20 and 21 July session logs.
