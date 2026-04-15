# Dashboard tests

This directory holds the automated test suite for `dashboard-server`. Two test runners share the same database, fixtures, and auth helpers:

| Runner | Location | What it covers |
|---|---|---|
| **Vitest** (`*.test.mjs`) | `tests/unit/` | Server-side unit + integration tests via supertest |
| **Playwright** (`*.spec.js`) | `tests/e2e/` | Frontend end-to-end tests via real Chromium + API tests via Playwright's `request` fixture |

## Quick start

```bash
cd dashboard-server
npm install                # also installs Chromium browser via postinstall
npm test                   # vitest unit suite
npm run test:e2e           # playwright suite
npm run test:all           # both, back to back
```

The first run automatically creates `nbi_dashboard_test` if it doesn't exist, drops the public schema, loads `tests/fixtures/baseline-schema.sql`, then runs the migration runner for any newer migrations on top.

## Architecture

### Test database

Tests run against `nbi_dashboard_test` on the same local Postgres 16 instance as the dev database. The database is **wiped and re-seeded from baseline at the start of every test run** (vitest `globalSetup` and Playwright `globalSetup` both call `tests/setup/reset-db.js`), and individual data tables are **truncated between tests** by the `truncate()` helper in `tests/helpers/db.js`.

The helper file refuses to connect if `DATABASE_URL` doesn't include `nbi_dashboard_test` — a safety guard against accidentally pointing at production data.

### Why a baseline schema dump and not just the migration runner

The migration runner can't reproduce the full schema from scratch — migrations 003+ assume tables created by standalone scripts (`migrate-expenses.js`, `migrate-leads.js`, etc.) that aren't part of the runner's path. The dev database was built incrementally over time and `init-db.js` plus standalone scripts do most of the work.

To bridge this, `tests/fixtures/baseline-schema.sql` is a `pg_dump --schema-only` of the live dev DB plus the `schema_migrations` data. Loading it gives the test DB an exact replica of the production schema as of the last update, and the migration runner is then a no-op (or runs only newer migrations that arrived after the dump).

To refresh the baseline (e.g. after a new manual migration on dev), run:

```bash
export PGPASSWORD='...'
"/c/Program Files/PostgreSQL/16/bin/pg_dump.exe" -h localhost -U nbiai -d nbi_dashboard \
  --schema-only --no-owner --no-acl > dashboard-server/tests/fixtures/baseline-schema.sql
"/c/Program Files/PostgreSQL/16/bin/pg_dump.exe" -h localhost -U nbiai -d nbi_dashboard \
  --data-only --table=schema_migrations --no-owner --no-acl >> dashboard-server/tests/fixtures/baseline-schema.sql
```

For migrations added by feature work (e.g. the upcoming Kanban migration 021), the baseline does NOT need to be refreshed — the migration runner will apply the new file on top of the baseline at test time. Refresh only when you've added schema changes outside the migration runner.

### Configuration

`tests/.env.test` is gitignored. It overrides `DATABASE_URL` to point at `nbi_dashboard_test` and sets `PORT=8889` so the test server doesn't conflict with PM2's port 8888.

### Test runner config

- `dashboard-server/vitest.config.js` — single-fork serial execution, includes `tests/unit/**/*.test.mjs`, runs `tests/setup/global-setup.js` once per run, runs `tests/setup/load-env.js` once per test file before any imports
- `dashboard-server/tests/e2e/playwright.config.js` — chromium-only, single worker, no retries, boots `node server.js` as a child process via `webServer`, runs `tests/e2e/playwright.global-setup.js` once per run

### Why `.test.mjs` and `.spec.js`

Vitest 2.x requires ESM imports, but `dashboard-server/server.js` is CommonJS and we're not refactoring it. Test files use the `.mjs` extension to opt into ESM while leaving the production code alone. CJS modules are imported via `createRequire(import.meta.url)` inside test files — see any of the `tests/unit/*.test.mjs` for the pattern.

Playwright happily runs `.spec.js` as CJS so its specs use plain `require()`.

## Writing a unit test

```js
// tests/unit/feature.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });
// Don't add afterAll(end()) — see "Pool lifetime" below.

describe('my feature', () => {
  it('does the thing', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);
    const res = await request(app)
      .post('/api/whatever')
      .set('Authorization', `Bearer ${token}`)
      .send({ field: 'value' });
    expect(res.status).toBe(201);
  });
});
```

## Writing an E2E test

```js
// tests/e2e/feature.spec.js
const { test, expect } = require('@playwright/test');
const { createTestUser } = require('../helpers/fixtures');
const { mintSession } = require('../helpers/auth');
const { truncate } = require('../helpers/db');

test('user can do the thing via UI', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });

  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible' });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden' });

  // ... drive the UI ...
});

// You can also write API-only tests using Playwright's request fixture
test('API endpoint behaves correctly', async ({ request }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const token = await mintSession(user.id);
  const res = await request.get('/api/something', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
});
```

## Helpers

| Helper | Purpose |
|---|---|
| `helpers/db.js` | Shared pg `pool`, `truncate()` |
| `helpers/auth.js` | `mintSession(userId)` — returns a raw bearer token |
| `helpers/fixtures.js` | `createTestUser`, `createTestClient`, `createTestTask`, `createTestBugReport` |
| `setup/reset-db.js` | Shared full DB reset (drops public schema, loads baseline, runs migrations). Called by both vitest and Playwright global setup |
| `setup/create-test-db.js` | Standalone bootstrap to create `nbi_dashboard_test` if missing |
| `setup/load-env.js` | Vitest setupFiles entry — loads `.env.test` before any test file imports |

## Conventions

### Authentication

Tests authenticate by minting a session row directly in the test database via `mintSession(userId)`. Same pattern as the manual round-trip test during the double-escape migration. No login flow, no password hashing, no session cookies. Direct database manipulation in service of fast, deterministic tests.

For tests that need to verify the actual login flow itself (e.g. `tests/e2e/auth.spec.js`), drive the form via Playwright with `createTestUser` providing a known username + password.

### Pool lifetime

The `pool` exported from `helpers/db.js` is module-cached — every test file that imports it shares the same instance. **Do not call `pool.end()` in test files.** If you do, the first file to run will close the pool for everyone and subsequent files crash with "Cannot use a pool after calling end on the pool".

The vitest fork process exits after all tests run, which closes any open TCP connections. That's how cleanup happens.

### Database lifecycle

- **Per run**: `globalSetup` resets the schema from baseline + runs migrations
- **Per test**: `beforeEach(async () => { await truncate(); })` clears the data tables but preserves the schema and system-of-record tables
- **Truncate list**: see `helpers/db.js` `TRUNCATE_TABLES`. `schema_migrations`, `settings`, `lead_pipeline_stages`, etc. are deliberately omitted

### Fail-fast

- Playwright `retries: 0` — flaky tests are broken tests; we fix them, not retry them
- Vitest `singleFork: true` — Postgres tests run serially to avoid clobbering each other
- Adding `--bail=1` to a CI invocation is fine if/when CI is wired up

### Don't waitForLoadState('networkidle')

The dashboard polls the server periodically, so network never goes idle. Use Playwright's auto-waiting (locator timeouts, `waitForResponse`, or explicit `waitForSelector`) instead. See `tests/e2e/bugs.spec.js` for the pattern.

## Running a single test

```bash
# vitest
npm test -- tests/unit/escape.test.mjs

# playwright
npm run test:e2e -- tests/e2e/auth.spec.js
```

## Adding a new fixture

Add a factory to `helpers/fixtures.js` following the existing pattern: take an options object, fill in sane defaults, INSERT a row, return the row. Add a sanity test to `tests/unit/helpers.test.mjs` so the factory itself is covered.

## Troubleshooting

**`database "nbi_dashboard_test" does not exist`** — should be created automatically by `globalSetup`. If something blocked it, run `node tests/setup/create-test-db.js` manually.

**`Authorization header missing` in unit tests** — you forgot `.set('Authorization', \`Bearer ${token}\`)`.

**Playwright says it can't find Chromium** — run `npx playwright install chromium`.

**A test passes locally but the suite is flaky** — flaky tests are broken tests. Investigate timing, selectors, and shared state. Don't add `retries`.

**`server.js` listening on port 8888 conflicts with Playwright** — tests boot a separate server instance on `8889`. If you see a port conflict, check that PM2 isn't holding `8889` somehow, or change `PORT=8889` in `tests/.env.test`.

**`Cannot use a pool after calling end on the pool`** — somebody added `afterAll(async () => { await end(); })` to a test file. Remove it. See "Pool lifetime" above.

**`ERR_ERL_KEY_GEN_IPV6` in webServer stderr** — pre-existing express-rate-limit deprecation warning in `server.js:324`. Non-fatal, server still boots, tests still pass. Should be fixed in a follow-up.

## Out of scope

This suite intentionally does NOT cover:
- Frontend unit tests via jsdom or Vitest against extracted helpers
- CI / GitHub Actions
- ESLint, Prettier, or formatters
- The Hub app (`projects/nbiai_app/app/`)
- Cross-browser E2E (Firefox, WebKit)
- Visual regression
- Performance / load testing

If a future feature needs any of the above, propose a separate spec.

## Inventory (as of the test-infra-setup project landing)

**Unit tests (vitest)** — 16 tests across 5 files:
- `smoke.test.mjs` (1) — proves harness detects failures
- `helpers.test.mjs` (4) — sanity tests for db/auth/fixtures
- `escape.test.mjs` (3) — retroactive double-escape round-trip
- `auth.test.mjs` (5) — retroactive login/logout/protected routes
- `migrations.test.mjs` (3) — retroactive migration runner idempotency

**E2E tests (playwright)** — 7 tests across 4 files:
- `smoke.spec.js` (2) — `/api/health` and `/nbi_project_dashboard.html` load
- `auth.spec.js` (2) — login form drives end-to-end
- `tasks.spec.js` (1) — task created via fixture appears in DOM after login
- `bugs.spec.js` (2) — bug + comment reachable via API after creation

Runtime targets: vitest under 30s, playwright under 5min. Actual runtime on the test-infra-setup project landing: vitest ~7s, playwright ~10s. Both well under target.
