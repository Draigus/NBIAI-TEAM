# Dashboard test infrastructure — design spec

**Date:** 2026-04-15
**Status:** Approved by Glen via brainstorming session (this is a consolidation of decisions made interactively)
**Worktree:** `.claude/worktrees/test-infra-setup` (branch: `test-infra-setup`)

---

## 1. Problem

The dashboard codebase has zero automated tests. Every change is verified manually with curl, psql queries, and browser smoke testing. This worked at small scale, but at the current size (~7000 lines server, ~15000 lines frontend, 180+ shipped features) it is unsustainable:

- Today's double-escape migration shipped because I caught a missed call site (line 6804) by full grep sweep. A "no write path escapes user text" test would have caught it automatically.
- Every refactor is manual-verify, so refactors are avoided, so technical debt accumulates.
- Subagents cannot work in parallel without me reviewing every edit by eye.
- The cost of regression in shipped features is borne entirely by the user (Magnus, Glen) rather than caught in CI.

The fix is to stand up an automated test suite — server-side unit tests AND frontend end-to-end tests — that future features can be written test-first against, and that retroactively covers the most critical existing behaviour.

This spec defines the test infrastructure project. It deliberately precedes the Kanban drag-to-reorder feature (which has its own approved spec at `projects/nbi_dashboard/specs/2026-04-15-kanban-drag-reorder-design.md`) so that the Kanban work can be implemented test-first against this infrastructure.

---

## 2. Stack

**Server-side unit tests:**
- **Vitest** as the test runner. Modern, fast, ESM/CJS-friendly, Jest-compatible API, built-in concurrency control.
- **supertest** for wrapping the Express app and making HTTP requests in-process (no long-running server needed for unit tests).
- **pg** (already a dependency) directly against a dedicated test database.
- Serial execution via Vitest single-fork pool to avoid Postgres concurrency conflicts.

**Frontend end-to-end tests:**
- **Playwright** as the E2E runner.
- Chromium only (no need for cross-browser coverage on this app).
- Boots the Express app **in-process** on a free port (8889 by default, configurable) against `nbi_dashboard_test`. PM2's port 8888 keeps running normally.
- Tests share `tests/helpers/fixtures.js` and `tests/helpers/auth.js` with the server unit tests — no duplicated setup code.

**Test database:**
- Separate physical Postgres database `nbi_dashboard_test` on the existing local Postgres 16 instance.
- `beforeAll` runs all migrations from scratch via the existing `migrations/runner.js`.
- `beforeEach` truncates the data tables but keeps the schema (fast reset between tests).
- A bootstrap script creates the database if it doesn't exist on first run, so `npm install && npm test` Just Works on a fresh clone.

**Configuration:**
- `dashboard-server/.env.test` — gitignored — holds `DATABASE_URL=postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard_test` and `TEST_PORT=8889`.
- `dashboard-server/vitest.config.js` — Vitest config: serial mode, global setup, env file loading.
- `dashboard-server/tests/e2e/playwright.config.js` — Playwright config: chromium project, baseURL from env, retries off (a flaky test is a broken test).

---

## 3. File structure

```
dashboard-server/
├─ tests/
│  ├─ README.md                    ← test conventions doc (covers both Vitest + Playwright)
│  ├─ .env.test                    ← gitignored; DATABASE_URL points to nbi_dashboard_test
│  ├─ setup/
│  │  ├─ create-test-db.js         ← CREATE DATABASE nbi_dashboard_test if missing
│  │  ├─ global-setup.js           ← Vitest globalSetup: bootstrap DB + run migrations + seed
│  │  └─ global-teardown.js        ← Vitest globalTeardown: shut down pool
│  ├─ helpers/
│  │  ├─ db.js                     ← shared pg pool, truncate(), reset()
│  │  ├─ auth.js                   ← mintSession(userId) → raw token (sha256-hashed in DB)
│  │  ├─ fixtures.js               ← createTestUser, createTestTask, createTestBug, etc.
│  │  └─ server.js                 ← startTestServer(), stopTestServer() for Playwright
│  ├─ unit/                        ← Vitest + supertest
│  │  ├─ smoke.test.js             ← deliberately failing test, then fixed — proves harness detects failures
│  │  ├─ escape.test.js            ← retroactive: double-escape round-trip
│  │  ├─ auth.test.js              ← retroactive: login/logout flow
│  │  └─ migrations.test.js        ← retroactive: runner idempotency
│  └─ e2e/                         ← Playwright
│     ├─ playwright.config.js
│     ├─ auth.spec.js              ← retroactive: critical login/logout flow
│     ├─ tasks.spec.js             ← retroactive: critical task CRUD
│     └─ bugs.spec.js              ← retroactive: critical bug report flow
├─ vitest.config.js
├─ package.json                    ← new scripts: test, test:watch, test:e2e, test:all
└─ .gitignore                      ← new entries: .env.test, tests/.coverage, tests/.tmp
```

---

## 4. Test conventions

### Authentication

Tests authenticate by minting a session row directly in the test database and using the raw token in `Authorization: Bearer ...` headers. Same pattern that worked during the double-escape round-trip earlier today.

```js
import { mintSession } from '../helpers/auth.js';
import { createTestUser } from '../helpers/fixtures.js';

const user = await createTestUser({ role: 'admin' });
const token = await mintSession(user.id);
const res = await request(app)
  .post('/api/bug-reports')
  .set('Authorization', `Bearer ${token}`)
  .send({ type: 'bug', title: 'test bug' });
```

No login flow. No password handling. No session cookie. Direct database manipulation in service of fast, deterministic tests.

### Fixtures

Factory functions in `tests/helpers/fixtures.js`:

```js
createTestUser({ role: 'admin' | 'member', display_name?, email?, ... })
createTestClient({ name, ... })
createTestTask({ user_id, title, status?, ... })
createTestBugReport({ user_id, type?, title, status?, ... })
createTestCandidate({ name, stage?, ... })
createTestLead({ title, stage_id?, ... })
```

Each factory inserts a row, returns the row, and uses sane defaults for unspecified fields. No shared global state. Each test creates exactly the data it needs.

### Database lifecycle

```js
beforeAll: bootstrap DB (idempotent), run migrations to head, start test pool
beforeEach: truncate data tables (preserves schema, settings, system rows)
afterAll: end pool
```

The truncate list is curated — it omits `schema_migrations`, `settings`, `lead_pipeline_stages`, and other system-of-record tables that are migration-managed. Re-seeding settings between tests would force every test to reload them, which is slow and pointless.

### Fail-fast

- Vitest `--bail=1` on CI / `npm run test:ci` so the first failure stops the run
- Playwright `retries: 0` — flaky tests are broken tests; we fix them, not retry them
- `npm test` (interactive) doesn't bail so the developer sees the full picture

---

## 5. Success criteria

The test infrastructure project is **done** when:

1. `npm install && npm test` from a fresh clone runs the Vitest unit suite green in under 30 seconds, with zero manual setup steps. The DB bootstrap, migration, and pool startup all happen automatically.
2. `npm run test:e2e` runs the Playwright E2E suite green in under 5 minutes.
3. `npm run test:all` runs both back-to-back.
4. **Six retroactive tests pass:**
   - **Unit:** `smoke.test.js` (one assertion proving the harness works)
   - **Unit:** `escape.test.js` (POST a bug report with `can't "quoted" & <tag>`, GET it back, assert raw text in both response and DB)
   - **Unit:** `auth.test.js` (login → token → authed request → logout → 401)
   - **Unit:** `migrations.test.js` (run migration runner twice on a fresh DB, assert second run is a no-op and `schema_migrations` has each row exactly once)
   - **E2E:** `auth.spec.js` (Playwright drives the login form, asserts dashboard loads, logs out)
   - **E2E:** `tasks.spec.js` (Playwright creates a task via the UI, asserts it appears in the list, deletes it)
   - **E2E:** `bugs.spec.js` (Playwright submits a bug report via the form, asserts it appears in the bug tracker)
5. `tests/README.md` documents the patterns: how to write a Vitest unit test, how to write a Playwright E2E test, how to use fixtures, how to use the auth helper, how to add a new test file. ~5 pages.
6. `.env.test` exists, is gitignored, and is documented in the README.
7. The implementation work happens in the `test-infra-setup` worktree and merges to master as a single feature branch.

---

## 6. Out of scope

- **Frontend unit tests** beyond what Playwright covers. No jsdom, no Vitest-against-extracted-modules. Pure JS helper extraction is reserved for future incremental refactors as needed.
- **CI / GitHub Actions / any continuous integration pipeline.** Tests run locally on demand. CI is a separate decision for a future sprint.
- **Linting / formatting tooling.** No ESLint, no Prettier, no Husky. One change at a time.
- **Hub app tests.** The Hub already has manual QA coverage and lives in a separate workspace. Adding tests there is a separate project.
- **Cross-browser E2E.** Chromium only.
- **Visual regression testing.** No screenshot comparison. If a regression is visible enough to matter, the assertion-driven Playwright tests will catch the structural change.
- **Performance / load testing.** Out of scope.
- **Security / fuzz testing.** Out of scope.
- **Refactoring server.js.** The test suite must work with `server.js` as-is. If supertest needs the Express `app` exported, we'll add the export at the bottom of the file as a single-line change. No structural reorganisation.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Tests are flaky | Fix the test, don't retry. Playwright `retries: 0`. Vitest serial. |
| Test DB state leaks between tests | `beforeEach` truncate, `beforeAll` migrate. Tests can't depend on order. |
| Playwright Chromium binary download fails on Glen's machine | `postinstall` script runs `npx playwright install chromium`. Documented in README. If it fails, README explains the manual fallback. |
| `server.js` doesn't export the Express `app` | Add `if (require.main !== module) module.exports = app;` at the bottom of `server.js` so it can be imported by tests without starting the listener. One-line change. |
| Migration runner isn't designed for repeat-on-fresh-DB | `runner.js` already handles bootstrap detection. Verified during read in earlier sessions. |
| Test DB doesn't exist on first run | `setup/create-test-db.js` connects to the `postgres` admin database and runs `CREATE DATABASE nbi_dashboard_test` if missing. Idempotent. |
| Concurrent dev work and test runs clash | Test DB is `nbi_dashboard_test`, dev DB is `nbi_dashboard`. PM2 keeps serving 8888, tests use 8889. Zero overlap. |
| Tests slow down enough that nobody runs them | Target runtime: unit suite < 30s, E2E suite < 5min. Revisit if exceeded. |

---

## 8. Rollout

**Single worktree:** `.claude/worktrees/test-infra-setup` on branch `test-infra-setup`.

**Single feature branch.** When the implementation plan is fully executed and all six retroactive tests pass, merge `test-infra-setup` to `master` as a fast-forward or non-fast-forward merge depending on commit cleanliness.

**No deployment.** This change is dev-only. PM2 doesn't need to restart. The running app is unaffected.

**One side-effect on Glen's machine:** the first `npm install` after merge will download Playwright's Chromium binary (~200MB). Documented in the merge commit message and `tests/README.md`.

---

## 9. After this lands

The Kanban drag-to-reorder spec (`2026-04-15-kanban-drag-reorder-design.md`) is then implemented in a fresh worktree (`kanban-drag-reorder`) branched off updated `master`, and every server-side task in that plan is written **test-first** using the infrastructure delivered here. Frontend drag-and-drop becomes Playwright spec coverage, not a manual smoke test.

This pattern continues for every subsequent feature: brainstorm → spec → plan → worktree → test-first implementation → merge.
