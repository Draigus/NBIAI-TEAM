# WorkSage Hiring Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved client-scoped Hiring Plan, headcount approval workflow, monthly GBP cost matrix and permission-safe Excel exports without replacing the existing Candidates experience.

**Architecture:** Extend `hiring_positions` as the single role record, with focused supporting tables for client settings, departments, recruiters and immutable approval events. Add a focused `hiring-plan` route plus isolated permission, cost, legacy-migration and export modules; add a separate browser module that plugs Plan, Roles and Monthly costs into the existing Hiring shell and role sidebar.

**Tech Stack:** Node.js 22, Express 4, PostgreSQL, `pg`, ExcelJS, traditional browser JavaScript, WorkSage CSS tokens, Vitest/Supertest and Playwright.

---

## File Map

### Create

- `dashboard-server/migrations/084_hiring_plan.sql`: schema, constraints, indexes, legacy approval state and immutable event tables.
- `dashboard-server/lib/hiring-legacy-parser.js`: pure parser for recognised planning lines currently embedded in position descriptions.
- `dashboard-server/scripts/backfill-hiring-plan.js`: dry-run/apply backfill with a JSON exception report.
- `dashboard-server/lib/hiring-costs.js`: one authoritative monthly cost engine used by API and Excel.
- `dashboard-server/lib/hiring-plan-permissions.js`: capability calculation and response redaction.
- `dashboard-server/lib/hiring-export.js`: permission-filtered ExcelJS workbook creation.
- `dashboard-server/routes/hiring-plan.js`: settings, departments, plan CRUD, approval, denial, history, costs and export routes.
- `dashboard-server/public/js/domains/nbi-hiring-plan.js`: Hiring Plan state, filters, Plan/Role/Monthly views, settings UI and export controls.
- `dashboard-server/tests/unit/migration-084.test.mjs`: schema and migration behaviour.
- `dashboard-server/tests/unit/hiring-legacy-parser.test.mjs`: legacy description parsing.
- `dashboard-server/tests/unit/hiring-costs.test.mjs`: rate-basis, FX, on-cost, horizon and total calculations.
- `dashboard-server/tests/unit/hiring-plan-permissions.test.mjs`: role/capability matrix and redaction.
- `dashboard-server/tests/unit/hiring-settings.test.mjs`: settings and department routes.
- `dashboard-server/tests/unit/hiring-plan-api.test.mjs`: plan read/create/update, scoping and concurrency.
- `dashboard-server/tests/unit/hiring-plan-approval.test.mjs`: approve, deny, reapproval, history and notifications.
- `dashboard-server/tests/unit/hiring-plan-costs.test.mjs`: cost endpoint and incomplete-plan behaviour.
- `dashboard-server/tests/unit/hiring-plan-export.test.mjs`: workbook contents, formats and sensitive-data absence.
- `dashboard-server/tests/e2e/hiring-plan.spec.js`: end-to-end permissions, UI workflow, navigation and visual regression.

### Modify

- `dashboard-server/server.js`: register the focused route with existing auth, audit and notification dependencies.
- `dashboard-server/routes/hiring.js`: preserve corrected general role access, accept normalised engagement aliases and keep the legacy positions API compatible.
- `dashboard-server/tests/helpers/fixtures.js`: create plan departments, settings, recruiter assignments and structured positions.
- `dashboard-server/tests/helpers/db.js`: include the new tables in test truncation in dependency-safe order.
- `dashboard-server/public/js/domains/nbi-hiring.js`: delegate the Positions destination to Hiring Plan, preserve Candidates, and extend the existing role sidebar.
- `dashboard-server/public/css/dashboard.css`: token-based table, matrix, settings and sidebar styles.
- `nbi_project_dashboard.html`: load the new Hiring Plan module after `nbi-hiring.js` and bump touched cache versions.
- `dashboard-server/tests/e2e/ats-workflow.spec.js`: keep the existing Candidates and role-sidebar regression expectations current.
- `dashboard-server/README.md`: update migration, route, module and test counts.

Unless a step says otherwise, run implementation and test commands from `dashboard-server/` inside the Hiring Plan worktree.

## Preflight Gate: Integrate the Corrected ATS Access Contract

The concurrent `codex/fix-hiring-client-admin-controls` branch contains the approved rule that every authenticated user can see in-scope candidates and edit existing role-detail fields, while only NBI administrators and the position's client administrator can close a role. This must be committed and verified in its own worktree before the feature branch absorbs it.

- [ ] **Step 1: Confirm the source branch is committed and clean**

Run from `D:\OneDrive\Claude_code\NBIAI_TEAM`:

```powershell
git -C .worktrees/fix-hiring-client-admin-controls status --short --branch
git log -1 --oneline codex/fix-hiring-client-admin-controls
```

Expected: the status contains only `## codex/fix-hiring-client-admin-controls`, and the tip commit describes the Hiring client access correction. If it is dirty, complete that branch's existing full verification and commit before continuing this plan.

- [ ] **Step 2: Merge the corrected access branch**

Run from the Hiring Plan worktree:

```powershell
git merge --no-ff codex/fix-hiring-client-admin-controls -m "merge: corrected ATS hiring access"
```

Expected: merge succeeds. Resolve conflicts in `nbi-hiring.js`, `nbi-api.js`, `hiring.js`, `ats-workflow.spec.js`, the three Hiring unit suites and `nbi_project_dashboard.html` in favour of the corrected access contract.

- [ ] **Step 3: Verify the merged access baseline**

```powershell
cd dashboard-server
npx vitest run tests/unit/hiring-client-scope.test.mjs tests/unit/salary-access-control.test.mjs tests/unit/jd-attachment.test.mjs --fileParallelism=false
npx playwright test --config=tests/e2e/playwright.config.js ats-workflow.spec.js --grep "client hiring administration|ordinary client"
```

Expected: all focused API and Playwright access tests pass.

## Task 1: Add the Hiring Plan Schema

**Files:**
- Create: `dashboard-server/migrations/084_hiring_plan.sql`
- Create: `dashboard-server/tests/unit/migration-084.test.mjs`
- Modify: `dashboard-server/tests/helpers/db.js`

- [ ] **Step 1: Write the failing migration test**

Create tests that query `information_schema` and `pg_constraint` for the new columns, tables, checks and indexes. Include this behavioural assertion:

```js
it('permits an approved legacy position without invented cost assumptions', async () => {
  const client = await createTestClient({ name: 'Legacy Client' });
  const position = await createTestHiringPosition({ client_id: client.id, title: 'Legacy Producer' });
  await pool.query("UPDATE hiring_positions SET approval_status = 'approved' WHERE id = $1", [position.id]);
  const { rows: [saved] } = await pool.query(
    'SELECT approval_status, budgeted_compensation FROM hiring_positions WHERE id = $1',
    [position.id]
  );
  expect(saved.approval_status).toBe('approved');
  expect(saved.budgeted_compensation).toBeNull();
});
```

Assert that an invalid priority, currency, approval state, requirement type, engagement type or compensation basis is rejected by PostgreSQL.

- [ ] **Step 2: Run the migration test and verify RED**

```powershell
npx vitest run tests/unit/migration-084.test.mjs --fileParallelism=false
```

Expected: FAIL because migration 084 and its columns do not exist.

- [ ] **Step 3: Add migration 084**

Create the following schema, using `NUMERIC(14,4)` for compensation and rates and `NUMERIC(7,4)` for percentages:

```sql
CREATE TABLE hiring_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  director_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX hiring_departments_client_name_uq
  ON hiring_departments (client_id, LOWER(name));

CREATE TABLE hiring_client_settings (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  coo_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  finance_director_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  fte_on_cost_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (fte_on_cost_pct >= 0),
  contractor_on_cost_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (contractor_on_cost_pct >= 0),
  psc_on_cost_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (psc_on_cost_pct >= 0),
  permitted_currencies JSONB NOT NULL DEFAULT '["GBP"]'::jsonb,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(permitted_currencies) = 'array')
);

CREATE TABLE hiring_recruiters (
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, user_id)
);
```

Add the approved planning columns to `hiring_positions`, including `requested_by_user_id`, `planning_version INTEGER NOT NULL DEFAULT 1`, and checks for `priority BETWEEN 0 AND 4`, first-of-month target dates, ISO-style three-letter currencies, valid status/type/basis values and positive rates. Normalise existing `employment_type` values with:

```sql
UPDATE hiring_positions SET employment_type = CASE employment_type
  WHEN 'permanent' THEN 'fte'
  WHEN 'contract' THEN 'contractor'
  WHEN 'freelance' THEN 'psc'
  ELSE COALESCE(employment_type, 'fte')
END;
```

Create `hiring_approval_events` with append-only event data, JSONB snapshots, actor user/name, structured denial fields and indexes on `(position_id, created_at)` and `(client_id, created_at)`. Backfill pre-existing positions to `approval_status='approved'` and insert one `legacy_imported` event per existing position with `ON CONFLICT DO NOTHING` backed by a unique partial index.

- [ ] **Step 4: Add new tables to test truncation**

Place `hiring_approval_events`, `hiring_recruiters`, `hiring_departments` and `hiring_client_settings` before `hiring_positions`/`clients` in the truncate list so foreign keys never make tests order-dependent.

- [ ] **Step 5: Run the migration test and schema-sensitive Hiring tests**

```powershell
npx vitest run tests/unit/migration-084.test.mjs tests/unit/ats-data-foundation.test.mjs tests/unit/hiring-client-scope.test.mjs --fileParallelism=false
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add dashboard-server/migrations/084_hiring_plan.sql dashboard-server/tests/unit/migration-084.test.mjs dashboard-server/tests/helpers/db.js
git commit -m "feat: add hiring plan schema"
```

## Task 2: Parse and Report Legacy Planning Data

**Files:**
- Create: `dashboard-server/lib/hiring-legacy-parser.js`
- Create: `dashboard-server/scripts/backfill-hiring-plan.js`
- Create: `dashboard-server/tests/unit/hiring-legacy-parser.test.mjs`

- [ ] **Step 1: Write failing parser tests**

Cover the exact recognised labels from `_parsePositionDesc`: `Annual Salary:`, `Monthly:`, `Original Currency:`, `Planned Start:`, `Priority:`, `Recruitment Status:` and `Type: Contract`. Include mixed narrative text and malformed currency/date cases.

```js
it('extracts recognised fields and preserves narrative lines', () => {
  const result = parseLegacyHiringDescription([
    'Own the client launch.',
    'Annual Salary: £96,000',
    'Original Currency: GBP',
    'Planned Start: September 2026',
    'Priority: 1',
    'Recruitment Status: Confirmed'
  ].join('\n'));
  expect(result.values).toMatchObject({
    budgeted_compensation: '96000',
    compensation_currency: 'GBP',
    compensation_basis: 'annual',
    target_start_month: '2026-09-01',
    priority: 1
  });
  expect(result.cleanDescription).toBe('Own the client launch.');
  expect(result.exceptions).toEqual([]);
});
```

- [ ] **Step 2: Run the parser test and verify RED**

```powershell
npx vitest run tests/unit/hiring-legacy-parser.test.mjs --fileParallelism=false
```

Expected: FAIL because `parseLegacyHiringDescription` does not exist.

- [ ] **Step 3: Implement the pure parser**

Export:

```js
module.exports = {
  parseLegacyHiringDescription,
  parseMoneyText,
  parseMonthText,
};
```

Return `{ values, cleanDescription, recognisedLines, exceptions }`. Parse only confident values; add a structured exception `{ field, input, reason }` for malformed recognised lines. Never infer a currency from the symbol alone when `Original Currency` is absent.

- [ ] **Step 4: Implement dry-run/apply backfill**

The script accepts `--apply` and `--output hiring-plan-backfill-report.json`. Default mode performs no update. It reads all positions, parses descriptions, updates only null structured fields, leaves the original `description` byte-for-byte unchanged, increments `planning_version`, and writes a JSON report containing counts plus each conflicting/unparsed role ID. The report may include `cleanDescription` as a review aid, but it never writes that value to the role. Refuse `--apply` unless `DATABASE_URL` is defined and the hostname/database are printed for confirmation in the command output.

- [ ] **Step 5: Verify parser and a dry run**

```powershell
npx vitest run tests/unit/hiring-legacy-parser.test.mjs --fileParallelism=false
node scripts/backfill-hiring-plan.js --output hiring-plan-backfill-report.json
```

Expected: tests pass; the script reports `mode: dry-run`, performs zero updates and creates a report outside tracked source paths.

- [ ] **Step 6: Commit**

```powershell
git add dashboard-server/lib/hiring-legacy-parser.js dashboard-server/scripts/backfill-hiring-plan.js dashboard-server/tests/unit/hiring-legacy-parser.test.mjs
git commit -m "feat: add hiring plan legacy backfill"
```

## Task 3: Build the Authoritative Cost Engine

**Files:**
- Create: `dashboard-server/lib/hiring-costs.js`
- Create: `dashboard-server/tests/unit/hiring-costs.test.mjs`

- [ ] **Step 1: Write failing cost tests**

Test annual, monthly and daily bases; GBP and non-GBP FX; client default and per-role on-cost; actual hired start; denied/shut-down exclusion; missing assumptions; month generation; and default sort order.

```js
it('calculates daily PSC cost in GBP pence with role on-cost override', () => {
  const result = calculateMonthlyCost({
    budgeted_compensation: '500',
    compensation_basis: 'daily',
    expected_workdays_per_month: '18',
    compensation_currency: 'EUR',
    fx_rate_to_gbp: '0.86',
    on_cost_override_pct: '5',
    employment_type: 'psc'
  }, { psc_on_cost_pct: '2' });
  expect(result).toEqual({
    paidMinor: 900000,
    baseGbpPence: 774000,
    loadedGbpPence: 812700,
    onCostPct: 5
  });
});
```

Assert `sortHiringRoles` orders by `target_start_month`, then numeric priority, then title, with null start months last.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx vitest run tests/unit/hiring-costs.test.mjs --fileParallelism=false
```

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement integer-minor-unit calculations**

Export:

```js
module.exports = {
  calculateMonthlyCost,
  buildMonthHorizon,
  buildRoleCostRow,
  buildCostMatrix,
  sortHiringRoles,
  moneyFromPence,
};
```

Convert paid amounts to minor units before FX, round GBP at the penny boundary, then apply on-cost and round again. `buildCostMatrix` returns `{ months, rows, totals, incompleteRoleIds }`. Each `totals.approved`, `totals.pending` and `totals.combined` value contains `base_gbp_pence[]`, `loaded_gbp_pence[]`, `horizon_base_gbp_pence`, `horizon_loaded_gbp_pence` and `incomplete`. Missing assumptions return `null` cells, populate `incompleteRoleIds`, and set the affected total's `incomplete=true`; they never become zero.

- [ ] **Step 4: Run tests and verify GREEN**

```powershell
npx vitest run tests/unit/hiring-costs.test.mjs --fileParallelism=false
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add dashboard-server/lib/hiring-costs.js dashboard-server/tests/unit/hiring-costs.test.mjs
git commit -m "feat: add hiring plan cost engine"
```

## Task 4: Implement Capabilities and Server-Side Redaction

**Files:**
- Create: `dashboard-server/lib/hiring-plan-permissions.js`
- Create: `dashboard-server/tests/unit/hiring-plan-permissions.test.mjs`

- [ ] **Step 1: Write failing permission tests**

Build fixtures for Department Director, COO, Finance Director, Recruiting, ordinary client member, ordinary NBI member and NBI administrator. Assert all capability flags and response key sets.

```js
it('removes every financial field for a Department Director', () => {
  const visible = redactHiringRole(fullRole, directorCapabilities);
  expect(visible).not.toHaveProperty('compensation_min');
  expect(visible).not.toHaveProperty('compensation_max');
  expect(visible).not.toHaveProperty('budgeted_compensation');
  expect(visible).not.toHaveProperty('fx_rate_to_gbp');
  expect(visible).not.toHaveProperty('on_cost_override_pct');
  expect(visible).not.toHaveProperty('monthly_costs');
});
```

Recruiting keeps `compensation_min`, `compensation_max`, `compensation_currency` and `compensation_basis`, but loses exact budget, FX, on-cost and totals.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx vitest run tests/unit/hiring-plan-permissions.test.mjs --fileParallelism=false
```

Expected: FAIL because the permission module is absent.

- [ ] **Step 3: Implement capabilities and field groups**

Export immutable field lists and these functions:

```js
module.exports = {
  OPERATIONAL_FIELDS,
  FINANCIAL_FIELDS,
  MATERIAL_FIELDS,
  resolveHiringCapabilities,
  redactHiringRole,
  redactHiringSettings,
  assertClientScope,
};
```

`resolveHiringCapabilities` takes `{ user, clientId, settings, departments, recruiterUserIds, position }`. NBI administrators receive all capabilities; client administrators can configure and close; COO can approve; Finance can edit/view financials; Recruiting sees advertised range; a Department Director can edit operational requirements only where `position.department_id` is one of their departments. The general role-edit capability from the corrected ATS branch remains separate from planning and financial capabilities.

- [ ] **Step 4: Run tests and verify GREEN**

```powershell
npx vitest run tests/unit/hiring-plan-permissions.test.mjs --fileParallelism=false
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add dashboard-server/lib/hiring-plan-permissions.js dashboard-server/tests/unit/hiring-plan-permissions.test.mjs
git commit -m "feat: enforce hiring plan capabilities"
```

## Task 5: Add Client Hiring Settings and Department APIs

**Files:**
- Create: `dashboard-server/routes/hiring-plan.js`
- Create: `dashboard-server/tests/unit/hiring-settings.test.mjs`
- Modify: `dashboard-server/tests/helpers/fixtures.js`
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Add test factories and failing route tests**

Add `createTestHiringDepartment`, `createTestHiringSettings` and `createTestHiringRecruiter`. Test:

- scoped GET for every authenticated client user;
- financial-default redaction;
- client-admin/NBI-admin configuration writes;
- ordinary-user 403;
- cross-client 403;
- same-client owner validation;
- case-insensitive duplicate department 409;
- referenced department deactivation rather than deletion.

```js
const response = await request(app)
  .patch(`/api/hiring-settings?client_id=${client.id}`)
  .set('Cookie', `nbi_session=${adminToken}`)
  .send({
    coo_user_id: coo.id,
    finance_director_user_id: finance.id,
    fte_on_cost_pct: 18.5,
    contractor_on_cost_pct: 3,
    psc_on_cost_pct: 0,
    permitted_currencies: ['GBP', 'EUR', 'USD'],
    recruiter_user_ids: [recruiter.id]
  })
  .expect(200);
expect(response.body.coo_user_id).toBe(coo.id);
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx vitest run tests/unit/hiring-settings.test.mjs --fileParallelism=false
```

Expected: FAIL with route 404.

- [ ] **Step 3: Register the focused route**

In `server.js`, immediately after the existing Hiring route, register:

```js
app.use(require('./routes/hiring-plan')({
  pool,
  log,
  isValidUuid,
  validateLength,
  auditLog,
  createNotification,
}));
```

- [ ] **Step 4: Implement settings and department endpoints**

Implement `GET/PATCH /api/hiring-settings`, `GET/POST/PATCH /api/hiring-settings/departments` and `DELETE /api/hiring-settings/departments/:id`. All client selection flows through one `resolveRequestedClientId(req)` helper. Validate that configured users belong to the selected client, except NBI users explicitly assigned through existing client contact access. Replace recruiter assignments transactionally on settings PATCH. Call `auditLog` for settings, recruiter and department changes with client, actor and changed field names.

- [ ] **Step 5: Run focused tests and existing client-user tests**

```powershell
npx vitest run tests/unit/hiring-settings.test.mjs tests/unit/client-portal-users.test.mjs --fileParallelism=false
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add dashboard-server/routes/hiring-plan.js dashboard-server/tests/unit/hiring-settings.test.mjs dashboard-server/tests/helpers/fixtures.js dashboard-server/server.js
git commit -m "feat: add client hiring settings"
```

## Task 6: Add Hiring Plan Read, Create and Update APIs

**Files:**
- Modify: `dashboard-server/routes/hiring-plan.js`
- Modify: `dashboard-server/tests/helpers/fixtures.js`
- Create: `dashboard-server/tests/unit/hiring-plan-api.test.mjs`

- [ ] **Step 1: Write failing plan API tests**

Cover:

- client scoping and NBI client filter;
- capability object in every list response;
- candidate counts grouped by existing stage;
- days-open and recruiting-status derivation;
- Department Director operational create for own department;
- role creation sets Pending and requester;
- forbidden financial input is ignored/rejected for Director and Recruiting;
- Finance financial edit;
- same-client department and manager validation;
- FTE annual-only basis, daily workday requirements and permitted-currency validation;
- `planning_version` 409 conflict;
- null-start roles sorted last;
- unauthorised fields absent, not null.

```js
const created = await request(app)
  .post('/api/hiring-plan')
  .set('Cookie', `nbi_session=${directorToken}`)
  .send({
    client_id: client.id,
    title: 'Senior Producer',
    priority: 1,
    department_id: department.id,
    description: 'Own delivery across the client programme.',
    hiring_manager_user_id: director.id,
    target_start_month: '2026-10-01',
    requirement_type: 'new',
    employment_type: 'fte'
  })
  .expect(201);
expect(created.body).toMatchObject({ approval_status: 'pending', planning_version: 1 });
expect(created.body.requested_by_user_id).toBe(director.id);
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx vitest run tests/unit/hiring-plan-api.test.mjs --fileParallelism=false
```

Expected: FAIL with missing plan routes.

- [ ] **Step 3: Implement one role query and derived status helpers**

Create `selectHiringPlanRoles(clientId)` in the route module using one roles query plus aggregate candidate counts. Select `fc.start_date AS actual_start_date` for the filled candidate. Return `{ roles, capabilities, client }`. Do not perform one query per role. Derive status as `not_started`, `recruiting`, `paused`, `hired` or `closed` from existing position/candidate state and calculate days open from `recruiting_started_at` through `closed_at` or today.

- [ ] **Step 4: Implement POST and PATCH transactionally**

POST accepts only operational fields from non-financial users and records `requested_by_user_id=req.user.id`, `approval_status='pending'`, `approval_submitted_at=NOW()`. PATCH requires `planning_version`; update with `WHERE id=$id AND planning_version=$expected`, increment on success, and return 409 plus current role on zero affected rows. Partition requested fields through `OPERATIONAL_FIELDS` and `FINANCIAL_FIELDS` before building SQL. Enforce annual basis for FTE, workdays for daily rates, enabled client currencies, active same-client managers and first-of-month target dates. Call `auditLog` for role creation and every successful planning update.

- [ ] **Step 5: Keep the legacy positions API compatible**

In `routes/hiring.js`, accept `permanent`, `contract` and `freelance` as input aliases and store `fte`, `contractor` and `psc`. Keep the corrected general role-edit and close-authority rules intact. Project structured advertised values back to `salary_range` in legacy GET responses when both numeric bounds exist.

- [ ] **Step 6: Run focused and legacy tests**

```powershell
npx vitest run tests/unit/hiring-plan-api.test.mjs tests/unit/hiring-client-scope.test.mjs tests/unit/ats-data-foundation.test.mjs tests/unit/salary-access-control.test.mjs --fileParallelism=false
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add dashboard-server/routes/hiring-plan.js dashboard-server/routes/hiring.js dashboard-server/tests/helpers/fixtures.js dashboard-server/tests/unit/hiring-plan-api.test.mjs
git commit -m "feat: add hiring plan role API"
```

## Task 7: Add Approval, Denial, Reapproval and Notifications

**Files:**
- Modify: `dashboard-server/routes/hiring-plan.js`
- Create: `dashboard-server/tests/unit/hiring-plan-approval.test.mjs`

- [ ] **Step 1: Write failing workflow tests**

Test COO approval, NBI-admin override, Finance inability to approve, structured denial reasons, required Other explanation, immutable history, approval validation, notification recipients and material versus non-material edits.

```js
it('returns an approved role to Pending after a material financial edit', async () => {
  const changed = await request(app)
    .patch(`/api/hiring-plan/${position.id}`)
    .set('Cookie', `nbi_session=${financeToken}`)
    .send({ planning_version: approvedVersion, budgeted_compensation: 105000 })
    .expect(200);
  expect(changed.body.approval_status).toBe('pending');
  const { rows } = await pool.query(
    "SELECT event_type, snapshot FROM hiring_approval_events WHERE position_id=$1 ORDER BY created_at",
    [position.id]
  );
  expect(rows.map(row => row.event_type)).toContain('reopened_for_approval');
});
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx vitest run tests/unit/hiring-plan-approval.test.mjs --fileParallelism=false
```

Expected: FAIL with approval route 404 or absent events.

- [ ] **Step 3: Implement approval and denial transactions**

Implement:

```text
POST /api/hiring-plan/:id/approve
POST /api/hiring-plan/:id/deny
GET  /api/hiring-plan/:id/history
```

Lock the role with `SELECT * FROM hiring_positions WHERE id=$1 FOR UPDATE`, verify `planning_version`, validate every operational and financial approval field plus configured COO/Finance/on-cost defaults, enforce approver capability, update state/version, set `recruiting_started_at=COALESCE(recruiting_started_at, NOW())`, and insert the immutable event before COMMIT. Denial accepts only `beyond_financial_boundaries`, `not_current_priority`, `lacks_information` or `other`; `other` requires non-empty `denial_comment`. Do not expose update/delete routes for approval events.

- [ ] **Step 4: Implement material-change reopening**

Compare normalised old/new values for `MATERIAL_FIELDS` inside PATCH. When an Approved role changes materially, set Pending, clear the current decision fields, write `reopened_for_approval` with `{ changed_fields: { field: { from, to } } }`, and preserve every previous approval event. Non-material ATS updates leave approval unchanged.

- [ ] **Step 5: Send notifications after commit**

Use `createNotification(username, type, title, message, link)` with `#hiring`. Submission/reopening targets COO and Finance; approval targets requester, hiring manager, Finance and Recruiters; denial targets requester, hiring manager and Finance. Deduplicate usernames and log individual failures without reversing the committed state. Call `auditLog` for every submission, approval, denial and reapproval transition.

- [ ] **Step 6: Run workflow and notification tests**

```powershell
npx vitest run tests/unit/hiring-plan-approval.test.mjs tests/unit/client-portal-notifications.test.mjs --fileParallelism=false
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add dashboard-server/routes/hiring-plan.js dashboard-server/tests/unit/hiring-plan-approval.test.mjs
git commit -m "feat: add headcount approval workflow"
```

## Task 8: Add the Monthly Cost API

**Files:**
- Modify: `dashboard-server/routes/hiring-plan.js`
- Create: `dashboard-server/tests/unit/hiring-plan-costs.test.mjs`

- [ ] **Step 1: Write failing endpoint tests**

Test 12/24/36 month validation, selected start month, soonest-first ordering, approved/pending/combined totals, actual hired start, denied exclusion, filtered totals, financial permission 403 and incomplete assumptions.

```js
const response = await request(app)
  .get(`/api/hiring-plan/costs?client_id=${client.id}&start_month=2026-07-01&months=24`)
  .set('Cookie', `nbi_session=${financeToken}`)
  .expect(200);
expect(response.body.rows.map(row => row.title)).toEqual([
  'July Producer',
  'September Engineer',
  'Undated Role'
]);
expect(response.body.totals.combined.loaded_gbp_pence).toHaveLength(24);
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx vitest run tests/unit/hiring-plan-costs.test.mjs --fileParallelism=false
```

Expected: FAIL with costs route 404.

- [ ] **Step 3: Implement `GET /api/hiring-plan/costs`**

Parse only 12, 24 or 36; require a first-of-month `start_month`; apply the same department, approval, recruiting, priority, engagement, manager and text filters as list view; require `canViewFinancials`; and pass roles/settings to `buildCostMatrix`. Return pence integers plus formatted GBP strings at the response boundary.

- [ ] **Step 4: Run tests and verify GREEN**

```powershell
npx vitest run tests/unit/hiring-costs.test.mjs tests/unit/hiring-plan-costs.test.mjs --fileParallelism=false
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add dashboard-server/routes/hiring-plan.js dashboard-server/tests/unit/hiring-plan-costs.test.mjs
git commit -m "feat: add hiring monthly cost API"
```

## Task 9: Add Permission-Safe Excel Exports

**Files:**
- Create: `dashboard-server/lib/hiring-export.js`
- Modify: `dashboard-server/routes/hiring-plan.js`
- Create: `dashboard-server/tests/unit/hiring-plan-export.test.mjs`

- [ ] **Step 1: Write failing workbook tests**

Load returned buffers with ExcelJS and assert sheet names, frozen panes, autofilters, date/percentage/currency number formats, role ordering, filter metadata, summary rows and exact values. Search every cell in restricted workbooks to prove forbidden budget, FX and cost values are absent.

```js
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(response.body);
expect(workbook.worksheets.map(sheet => sheet.name)).toEqual([
  'Hiring Plan', 'Monthly Costs', 'Pipeline Summary', 'Assumptions'
]);
expect(workbook.getWorksheet('Monthly Costs').views[0]).toMatchObject({ state: 'frozen' });
```

Recruiting expects `Hiring Plan` and `Pipeline Summary`; Department Director expects the same two sheets with no compensation headings.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx vitest run tests/unit/hiring-plan-export.test.mjs --fileParallelism=false
```

Expected: FAIL because the export route/module does not exist.

- [ ] **Step 3: Implement workbook builders**

Export:

```js
module.exports = {
  buildHiringPlanWorkbook,
  writeWorkbookResponse,
};
```

Build all sheets from already-redacted plan data and the shared cost matrix. Use real dates/numbers, `£#,##0.00;[Red]-£#,##0.00`, `0.00%`, frozen panes, autofilters, wrapped descriptions, stable widths, status fills and generated-at/client/filter metadata. Never build a sensitive sheet and hide it; omit it entirely.

- [ ] **Step 4: Implement `GET /api/hiring-plan/export.xlsx`**

Reuse the same scoped list/filter functions as UI endpoints. Set `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and a client/date-safe attachment filename. Audit successful export generation with client ID, filter object and visible sheet names.

- [ ] **Step 5: Run export and permission tests**

```powershell
npx vitest run tests/unit/hiring-plan-export.test.mjs tests/unit/hiring-plan-permissions.test.mjs --fileParallelism=false
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add dashboard-server/lib/hiring-export.js dashboard-server/routes/hiring-plan.js dashboard-server/tests/unit/hiring-plan-export.test.mjs
git commit -m "feat: export hiring plans to Excel"
```

## Task 10: Introduce the Hiring Plan Browser Module

**Files:**
- Create: `dashboard-server/public/js/domains/nbi-hiring-plan.js`
- Modify: `dashboard-server/public/js/domains/nbi-hiring.js`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add an E2E smoke test that fails on the old navigation**

In `hiring-plan.spec.js`, log in as a configured Finance user, switch to Hiring, and assert `Hiring Plan` exists while `Positions` does not exist as a top-level tab. Assert Candidates/Pipeline remains present.

```js
await page.evaluate(() => switchView('hiring'));
await expect(page.getByRole('tab', { name: 'Hiring Plan' })).toBeVisible();
await expect(page.getByRole('tab', { name: 'Positions' })).toHaveCount(0);
await expect(page.getByRole('tab', { name: 'Pipeline' })).toBeVisible();
```

- [ ] **Step 2: Run the smoke test and verify RED**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js --grep "Hiring Plan navigation"
```

Expected: FAIL because the top-level tab is still Positions.

- [ ] **Step 3: Add module state and API loading**

Define globals in `nbi-hiring-plan.js`:

```js
let _hiringPlanData = { roles: [], capabilities: {}, client: null };
let _hiringPlanCosts = null;
let _hiringPlanSettings = null;

function selectedHiringPlanClientId() {
  if (isClientUser()) return _currentUser.clientId;
  return window._hiringFilterClient || '';
}

function appendHiringPlanFilters(params) {
  const filters = window._hiringPlanFilters || {};
  ['department_id', 'approval_status', 'recruiting_status', 'priority', 'employment_type', 'hiring_manager_user_id', 'search'].forEach(function(key) {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.set(key, filters[key]);
    }
  });
  return params;
}

function queryStringFromParams(params) {
  const value = params.toString();
  return value ? '?' + value : '';
}

function buildHiringClientQuery() {
  const params = new URLSearchParams();
  const clientId = selectedHiringPlanClientId();
  if (clientId) params.set('client_id', clientId);
  return queryStringFromParams(params);
}

function buildHiringPlanQuery() {
  const params = new URLSearchParams();
  const clientId = selectedHiringPlanClientId();
  if (clientId) params.set('client_id', clientId);
  appendHiringPlanFilters(params);
  return queryStringFromParams(params);
}

function buildHiringCostQuery() {
  const params = new URLSearchParams();
  const clientId = selectedHiringPlanClientId();
  if (clientId) params.set('client_id', clientId);
  params.set('start_month', window._hiringCostStartMonth);
  params.set('months', String(window._hiringCostMonths || 24));
  appendHiringPlanFilters(params);
  return queryStringFromParams(params);
}

async function loadHiringPlanData() {
  const query = buildHiringPlanQuery();
  const data = await apiCall('/api/hiring-plan' + query);
  if (!data) return false;
  _hiringPlanData = data;
  _hiringPositionsData = Array.isArray(data.roles) ? data.roles : [];
  return true;
}

async function loadHiringPlanCosts() {
  const data = await apiCall('/api/hiring-plan/costs' + buildHiringCostQuery());
  if (!data) return false;
  _hiringPlanCosts = data;
  return true;
}

async function loadHiringPlanSettings() {
  const data = await apiCall('/api/hiring-settings' + buildHiringClientQuery());
  if (!data) return false;
  _hiringPlanSettings = data;
  return true;
}

function renderHiringPlanTab(container) {
  const view = window._hiringPlanView || 'plan';
  if (view === 'roles') return renderHiringPlanRolesView(container);
  if (view === 'monthly') return renderHiringPlanMonthlyView(container);
  return renderHiringPlanTableView(container);
}
```

Implement each function with `apiCall`, selected client context, active filters and explicit loading/error/empty states. `loadHiringPlanData` assigns both `_hiringPlanData.roles` and `_hiringPositionsData` so existing candidate filters and role detail functions continue using one role collection.

- [ ] **Step 4: Replace only the top-level Positions tab**

In `renderHiringView`, change `positions` to `plan`, label it `Hiring Plan`, point the summary click to `plan`, and delegate its content to `renderHiringPlanTab`. Preserve `pipeline`, `database`, `calendar`, `metrics` and `questions`. Use the corrected access branch's tab visibility rules.

- [ ] **Step 5: Load the module in order**

Add after `nbi-hiring.js`:

```html
<script src="/public/js/domains/nbi-hiring.js?v=29"></script>
<script src="/public/js/domains/nbi-hiring-plan.js?v=1"></script>
```

Ensure only one `nbi-hiring.js` tag remains.

- [ ] **Step 6: Run syntax and navigation tests**

```powershell
node --check public/js/domains/nbi-hiring.js
node --check public/js/domains/nbi-hiring-plan.js
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js --grep "Hiring Plan navigation"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add public/js/domains/nbi-hiring-plan.js public/js/domains/nbi-hiring.js ../nbi_project_dashboard.html tests/e2e/hiring-plan.spec.js
git commit -m "feat: add Hiring Plan navigation"
```

## Task 11: Build the Plan Table, Inline Editing and Role Sidebar Sections

**Files:**
- Modify: `dashboard-server/public/js/domains/nbi-hiring-plan.js`
- Modify: `dashboard-server/public/js/domains/nbi-hiring.js`
- Modify: `dashboard-server/public/css/dashboard.css`
- Modify: `dashboard-server/tests/e2e/hiring-plan.spec.js`

- [ ] **Step 1: Write failing Plan table workflow tests**

Test filters, permission-appropriate columns, Add Role, Department Director creation, inline priority/start/status edits, a 409 conflict presentation and keyboard activation. Assert Finance sees exact budget while Recruiting and Department Director do not.

- [ ] **Step 2: Run the focused E2E tests and verify RED**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js --grep "Plan table|role requirement|financial columns|stale edit"
```

Expected: FAIL because the table and controls are absent.

- [ ] **Step 3: Implement the shared control bar and Plan table**

Use semantic buttons/selects/inputs for view, department, approval, recruiting, priority, engagement, manager and search. Render stable table columns from server capabilities. Every row uses `data-position-id`, `tabindex="0"`, Enter/Space activation and `openPositionDetail(id)`. Inline edits send `{ planning_version, field: value }`, replace the saved row on success, and show a conflict banner with Reload and Overwrite commands on 409.

- [ ] **Step 4: Implement Add Role without financial leakage**

The modal includes operational fields for permitted creators and financial fields only for `canEditFinancials`. Department Directors see only departments they direct. Successful creation reloads Plan and opens the same role sidebar.

- [ ] **Step 5: Extend the existing role sidebar**

Add sections for Planning, Approval, Financial assumptions and History to `openPositionDetail`. Render/edit sections from capability flags. Approval buttons call the dedicated approval routes; denial uses the four approved reasons and requires explanation for Other. Keep JD, interview panel, candidates, interview questions, close and delete behaviours in their existing sections.

- [ ] **Step 6: Add token-based styles**

Create `.hiring-plan-*` selectors using only existing CSS variables. Use an unframed dense table, 8px-or-less control radii, sticky identifying columns, visible focus, text+icon status, validation messages and responsive overflow. Do not nest cards.

- [ ] **Step 7: Run E2E and existing sidebar regression tests**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js ats-workflow.spec.js --grep "Plan table|role requirement|financial columns|stale edit|client hiring administration"
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add public/js/domains/nbi-hiring-plan.js public/js/domains/nbi-hiring.js public/css/dashboard.css tests/e2e/hiring-plan.spec.js
git commit -m "feat: build editable hiring plan"
```

## Task 12: Add Roles View and Candidate Pipeline Links

**Files:**
- Modify: `dashboard-server/public/js/domains/nbi-hiring-plan.js`
- Modify: `dashboard-server/public/js/domains/nbi-hiring.js`
- Modify: `dashboard-server/tests/e2e/hiring-plan.spec.js`
- Modify: `dashboard-server/tests/e2e/ats-workflow.spec.js`

- [ ] **Step 1: Write failing shared-record tests**

Assert Plan and Roles show the same role count, clicking either opens `#positionDetailPanel`, clicking a pipeline summary switches to Pipeline/Candidates with `_hiringFilterPosition` set, and clicking a candidate still opens the existing candidate sidebar.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js --grep "Roles view|pipeline link|candidate sidebar"
```

Expected: FAIL because the internal Roles view and plan pipeline links are absent.

- [ ] **Step 3: Reuse role cards as an internal view**

Call the existing `renderPositionCard` from `renderHiringPlanRolesView` after applying the shared plan filters. Replace description parsing on cards with structured `priority`, `target_start_month`, `employment_type`, derived recruiting status and permission-appropriate compensation. Keep `_parsePositionDesc` only for unmigrated compatibility.

- [ ] **Step 4: Implement the filtered candidate handoff**

Add:

```js
function openCandidatesForHiringRole(positionId) {
  window._hiringFilterPosition = positionId;
  window._hiringActiveTab = 'pipeline';
  renderContent();
}
```

Render stage counts from the server aggregate and show `No candidates` when empty. Do not add stage mutation controls to Plan or Roles.

- [ ] **Step 5: Run shared-record and candidate regressions**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js ats-workflow.spec.js --grep "Roles view|pipeline link|candidate sidebar|interview wizard"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add public/js/domains/nbi-hiring-plan.js public/js/domains/nbi-hiring.js tests/e2e/hiring-plan.spec.js tests/e2e/ats-workflow.spec.js
git commit -m "feat: connect hiring roles and candidates"
```

## Task 13: Build the Monthly Cost Matrix

**Files:**
- Modify: `dashboard-server/public/js/domains/nbi-hiring-plan.js`
- Modify: `dashboard-server/public/css/dashboard.css`
- Modify: `dashboard-server/tests/e2e/hiring-plan.spec.js`

- [ ] **Step 1: Write failing matrix tests**

Seed roles starting July, September, December and null. Assert row order, sticky role columns, month horizons, base/loaded mode, Pending/Approved labels, incomplete indicators, filtered totals and role-sidebar activation from a cost cell.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js --grep "Monthly costs"
```

Expected: FAIL because the matrix is absent.

- [ ] **Step 3: Render the matrix from server values**

Render month headers with `Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' })`, and amounts with `Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`. Provide 12/24/36 segmented controls, start-month input and base/loaded toggle. Preserve the API row order; do not re-sort in the browser.

- [ ] **Step 4: Render auditable assumptions and hiring-led totals**

Each amount exposes role/month/amount/state via `aria-label`; the role link opens the sidebar assumptions section. Render Approved, Total Pending and Combined Total without finance-led labels. Show known subtotal plus `Incomplete` whenever the endpoint returns incomplete role IDs.

- [ ] **Step 5: Add stable responsive dimensions**

Use fixed/min widths for identity and month columns, sticky left columns with theme backgrounds, horizontal overflow and no viewport-scaled font sizes. Ensure hover/focus content cannot resize cells.

- [ ] **Step 6: Run matrix tests at desktop and mobile**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js --grep "Monthly costs"
```

Expected: PASS after the test explicitly checks desktop and mobile viewport sizes.

- [ ] **Step 7: Commit**

```powershell
git add public/js/domains/nbi-hiring-plan.js public/css/dashboard.css tests/e2e/hiring-plan.spec.js
git commit -m "feat: add hiring monthly cost matrix"
```

## Task 14: Build Hiring Settings and Export Controls

**Files:**
- Modify: `dashboard-server/public/js/domains/nbi-hiring-plan.js`
- Modify: `dashboard-server/public/css/dashboard.css`
- Modify: `dashboard-server/tests/e2e/hiring-plan.spec.js`

- [ ] **Step 1: Write failing UI tests**

Assert client admin can open settings, add/deactivate a department, assign COO/Finance/Recruiters, edit engagement on-cost percentages and currencies, while ordinary users cannot see the settings command. Assert the export button downloads an `.xlsx` and restricted users receive the correct workbook sheets.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js --grep "Hiring settings|Excel export"
```

Expected: FAIL because settings/export controls are absent.

- [ ] **Step 3: Implement settings panel**

Use selectors populated from in-scope users, a department table with director selectors and active toggles, percentage inputs for FTE/Contractor/PSC, a permitted-currency multiselect and Recruiting user checklist. Disable save until COO and Finance belong to the client and GBP is selected. Reload capabilities after save.

- [ ] **Step 4: Implement export download**

Build the current filter query, request `/api/hiring-plan/export.xlsx`, derive the filename from `Content-Disposition`, create a temporary object URL, click a temporary anchor and revoke the URL. Show a visible error without downloading an HTML/JSON error body.

- [ ] **Step 5: Run UI and server export tests**

```powershell
npx vitest run tests/unit/hiring-settings.test.mjs tests/unit/hiring-plan-export.test.mjs --fileParallelism=false
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js --grep "Hiring settings|Excel export"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add public/js/domains/nbi-hiring-plan.js public/css/dashboard.css tests/e2e/hiring-plan.spec.js
git commit -m "feat: add hiring settings and exports"
```

## Task 15: Verify Themes, Accessibility and Existing ATS Behaviour

**Files:**
- Modify: `dashboard-server/tests/e2e/hiring-plan.spec.js`
- Modify: `dashboard-server/public/css/dashboard.css`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add theme and overlap assertions**

Loop through `dark`, `light`, `midnight`, `nord`, `solarized`, `dracula`, `emerald` and `command`. For Plan, Monthly costs, role sidebar and Hiring Settings, assert non-transparent text/background contrast tokens, visible focus, no horizontal page overflow outside the matrix scroller, and no intersecting control bounding boxes.

- [ ] **Step 2: Run theme tests and capture screenshots**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js --grep "all themes|responsive layout" --update-snapshots
```

Expected: PASS and intentional screenshots for desktop plus mobile. Inspect every generated image rather than accepting snapshot creation as visual proof.

- [ ] **Step 3: Correct visual defects only in Hiring Plan selectors**

Fix any clipping, overlap, contrast, sticky-column or focus problems in `.hiring-plan-*`. Do not change unrelated global theme tokens unless a defect demonstrably affects existing WorkSage controls too.

- [ ] **Step 4: Bump cache versions once**

Update `dashboard.css` and `nbi-hiring-plan.js` query versions in `nbi_project_dashboard.html` after final CSS/JS edits. Do not repeatedly churn version numbers during earlier tasks.

- [ ] **Step 5: Run the complete Hiring E2E set**

```powershell
npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js ats-workflow.spec.js
```

Expected: PASS with Candidates cards, candidate sidebar, interview workflow, role sidebar, Plan, Roles, Monthly costs, Settings and exports all covered.

- [ ] **Step 6: Commit**

```powershell
git add public/css/dashboard.css ../nbi_project_dashboard.html tests/e2e/hiring-plan.spec.js
git commit -m "test: verify hiring plan themes and ATS regressions"
```

## Task 16: Documentation, Full Verification and Staging Rollout

**Files:**
- Modify: `dashboard-server/README.md`

- [ ] **Step 1: Update architecture counts and route documentation**

Record migration 084, the new route and library modules, the browser module, new test files and the Hiring Plan endpoints. Document that Candidates remains separate and that costs/exports are server-permission-filtered.

- [ ] **Step 2: Run static checks**

```powershell
node --check server.js
node --check routes/hiring.js
node --check routes/hiring-plan.js
node --check lib/hiring-costs.js
node --check lib/hiring-plan-permissions.js
node --check lib/hiring-export.js
node --check public/js/domains/nbi-hiring.js
node --check public/js/domains/nbi-hiring-plan.js
git diff --check
```

Expected: every command exits 0 with no whitespace errors.

- [ ] **Step 3: Run all unit tests**

```powershell
npm test
```

Expected: all Vitest files and tests pass with zero failures.

- [ ] **Step 4: Run all browser tests**

The Playwright configuration starts the isolated worktree server on port 8889 against `nbi_dashboard_test`. Run:

```powershell
npm run test:e2e
```

Expected: the complete Playwright suite passes with zero failures.

- [ ] **Step 5: Reconcile a known workbook manually**

Seed one annual GBP FTE, one daily EUR PSC and one Pending role. Compare the UI matrix, `/costs` response and Excel workbook for each month and the Approved/Total Pending/Combined totals. Record the expected versus actual pence values in the session log; every value must match.

- [ ] **Step 6: Run the legacy backfill dry run against staging data**

```powershell
node scripts/backfill-hiring-plan.js --output hiring-plan-backfill-staging.json
```

Expected: dry-run counts and every parsing exception are reviewed. Correct source data or explicitly shut down unusable roles; do not guess financial values.

- [ ] **Step 7: Commit documentation**

```powershell
git add README.md
git commit -m "docs: record hiring plan delivery"
```

Append verification evidence and rollout status immediately to the shared main-worktree log at `D:\OneDrive\Claude_code\NBIAI_TEAM\projects\nbi_dashboard\session_logs\2026-07-21_session.md`; do not copy or commit a divergent session log in the feature worktree.

- [ ] **Step 8: Prepare staging integration**

Use the `finishing-a-development-branch` skill. Merge to staging only after the branch is clean and every verification step above is green. Copy the ignored `D:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server\.env.staging` into the worktree's `dashboard-server\.env.staging`, apply migration 084 on staging, configure NBI and Couch Heroes through Hiring Settings, set Aris as Couch Heroes COO and Lili Zhao as Finance Director, verify their real accounts, run `node --env-file=.env.staging scripts/backfill-hiring-plan.js --apply --output hiring-plan-backfill-staging.json`, restart `nbi-dashboard-staging`, and perform the role/candidate/export smoke tests on `http://localhost:8887/nbi_project_dashboard.html`.

- [ ] **Step 9: Obtain production review**

Glen reviews the staging Hiring Plan with representative NBI and Couch Heroes data. Production merge and deployment follow only after that external-facing approval gate.
