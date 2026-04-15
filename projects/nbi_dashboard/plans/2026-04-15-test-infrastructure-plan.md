# Test Infrastructure Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. This plan is executed inline in the current session, not via subagents, because the worktree-PM2-DB state is too coupled to safely hand off mid-stream.

**Goal:** Stand up a working server-side unit test suite (Vitest + supertest) and a working frontend E2E suite (Playwright + chromium) for `dashboard-server`, with six retroactive tests proving the harness catches real regressions.

**Architecture:** Vitest runs unit tests in-process via supertest against a dedicated Postgres test database (`nbi_dashboard_test`). Playwright drives a real Chromium against the same Express app booted in-process on port 8889. Both share `tests/helpers/{db,auth,fixtures,server}.js`. Tests are serial; `beforeAll` migrates the schema, `beforeEach` truncates data tables. `npm test` runs unit; `npm run test:e2e` runs Playwright; `npm run test:all` runs both.

**Tech Stack:** Node.js, Express 4, Postgres 16 (existing); Vitest 2, supertest 7, @playwright/test 1.49, dotenv (already present).

**Worktree:** `.claude/worktrees/test-infra-setup` on branch `test-infra-setup`. All work happens in this worktree. PM2 keeps serving the production code from main checkout on port 8888 unaffected.

**Important note on tests:** This project has zero existing tests. Each task that adds production-meaningful code includes a real assertion that exercises the code. The tests written in Tasks 8-10 and 15-17 are the deliverables, not scaffolding.

---

## File structure (target end state)

```
dashboard-server/
├─ vitest.config.js                 ← NEW
├─ package.json                     ← MODIFIED (devDeps, scripts)
├─ .gitignore                       ← MODIFIED (.env.test, tests/.tmp)
├─ server.js                        ← MODIFIED (one-line app export at bottom)
├─ tests/                           ← NEW directory
│  ├─ README.md                     ← NEW
│  ├─ .env.test                     ← NEW (gitignored)
│  ├─ setup/
│  │  ├─ create-test-db.js          ← NEW
│  │  ├─ global-setup.js            ← NEW
│  │  └─ global-teardown.js         ← NEW
│  ├─ helpers/
│  │  ├─ db.js                      ← NEW
│  │  ├─ auth.js                    ← NEW
│  │  ├─ fixtures.js                ← NEW
│  │  └─ server.js                  ← NEW
│  ├─ unit/
│  │  ├─ smoke.test.js              ← NEW
│  │  ├─ helpers.test.js            ← NEW (sanity tests for helpers)
│  │  ├─ escape.test.js             ← NEW (retroactive)
│  │  ├─ auth.test.js               ← NEW (retroactive)
│  │  └─ migrations.test.js         ← NEW (retroactive)
│  └─ e2e/
│     ├─ playwright.config.js       ← NEW
│     ├─ smoke.spec.js              ← NEW
│     ├─ auth.spec.js               ← NEW (retroactive)
│     ├─ tasks.spec.js              ← NEW (retroactive)
│     └─ bugs.spec.js               ← NEW (retroactive)
```

---

## Working assumptions

- **Working directory:** all commands assume cwd is `D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup` unless prefixed otherwise.
- **DB credentials:** `postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/...` (already in `dashboard-server/.env`).
- **psql binary:** `/c/Program Files/PostgreSQL/16/bin/psql.exe` (verified earlier today).
- **PM2 status during this work:** the production `nbi-dashboard` process keeps running on port 8888 against `nbi_dashboard`. The test suite uses port 8889 against `nbi_dashboard_test`. Zero overlap.

---

## Task 1: Install Vitest and supertest, set up `.env.test`

**Files:**
- Modify: `dashboard-server/package.json`
- Create: `dashboard-server/.env.test`
- Modify: `dashboard-server/.gitignore` (or `.gitignore` at repo root, whichever applies)

- [ ] **Step 1: Install devDependencies**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm install --save-dev vitest@^2.1.0 supertest@^7.0.0
```

Expected: `npm WARN`-level output, no errors, new `devDependencies` block in `package.json`.

- [ ] **Step 2: Verify the install landed**

```bash
cat package.json | grep -E 'vitest|supertest'
```

Expected output: two lines showing both packages under `devDependencies`.

- [ ] **Step 3: Create `dashboard-server/.env.test`**

Write the file with these exact contents:

```
DATABASE_URL=postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard_test
ADMIN_DATABASE_URL=postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/postgres
PORT=8889
NODE_ENV=test
LOG_LEVEL=error
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=test@example.invalid
APP_URL=http://localhost:8889
```

- [ ] **Step 4: Update `.gitignore`**

Check whether `.gitignore` lives in `dashboard-server/` or at the repo root:

```bash
ls /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/.gitignore /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server/.gitignore 2>&1
```

Append to whichever exists (or create a new one in `dashboard-server/` if neither covers it):

```
# Test infrastructure
dashboard-server/.env.test
dashboard-server/tests/.tmp/
dashboard-server/tests/.coverage/
dashboard-server/test-results/
dashboard-server/playwright-report/
```

- [ ] **Step 5: Verify `.env.test` is ignored**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git status --short dashboard-server/.env.test
```

Expected: empty output (file is untracked AND ignored, so it doesn't appear). If it appears with `??`, the gitignore rule didn't match — fix the path before committing.

- [ ] **Step 6: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/package.json dashboard-server/package-lock.json .gitignore
# (or dashboard-server/.gitignore depending on which file you edited)
git commit -m "test: install vitest and supertest, add .env.test"
```

---

## Task 2: Bootstrap the test database

**Files:**
- Create: `dashboard-server/tests/setup/create-test-db.js`

- [ ] **Step 1: Write `create-test-db.js`**

```javascript
// dashboard-server/tests/setup/create-test-db.js
//
// Creates the nbi_dashboard_test database if it does not already exist.
// Idempotent — safe to run multiple times. Called automatically by
// vitest globalSetup before any tests run.
//
// Connects to the `postgres` admin database (not nbi_dashboard) so
// that CREATE DATABASE doesn't run inside an existing connection to
// the target.

require('dotenv').config({ path: __dirname + '/../.env.test' });

const { Client } = require('pg');

const ADMIN_URL = process.env.ADMIN_DATABASE_URL;
const TEST_URL = process.env.DATABASE_URL;

if (!ADMIN_URL || !TEST_URL) {
  throw new Error('create-test-db: ADMIN_DATABASE_URL and DATABASE_URL must be set in .env.test');
}

// Pull the database name out of the test URL
const match = TEST_URL.match(/\/([^/?]+)(?:\?|$)/);
if (!match) throw new Error('create-test-db: could not parse database name from DATABASE_URL');
const dbName = match[1];

async function main() {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  try {
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      // pg does not allow $1 substitution for identifiers; dbName is internal config, not user input
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[create-test-db] Created ${dbName}`);
    } else {
      console.log(`[create-test-db] ${dbName} already exists`);
    }
  } finally {
    await admin.end();
  }
}

main().catch(err => {
  console.error('[create-test-db] FAILED:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run it manually and verify**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
node tests/setup/create-test-db.js
```

Expected output: `[create-test-db] Created nbi_dashboard_test` (first run) or `[create-test-db] nbi_dashboard_test already exists` (subsequent runs).

- [ ] **Step 3: Confirm the database exists in Postgres**

```bash
export PGPASSWORD='NbiAi2026!SecureDb'
"/c/Program Files/PostgreSQL/16/bin/psql.exe" -h localhost -p 5432 -U nbiai -d postgres -c "SELECT datname FROM pg_database WHERE datname = 'nbi_dashboard_test';"
```

Expected: one row containing `nbi_dashboard_test`.

- [ ] **Step 4: Run the script a second time to verify idempotency**

```bash
node tests/setup/create-test-db.js
```

Expected output: `[create-test-db] nbi_dashboard_test already exists`.

- [ ] **Step 5: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/setup/create-test-db.js
git commit -m "test: add create-test-db.js bootstrap script"
```

---

## Task 3: Database helper module

**Files:**
- Create: `dashboard-server/tests/helpers/db.js`

- [ ] **Step 1: Write `helpers/db.js`**

```javascript
// dashboard-server/tests/helpers/db.js
//
// Shared Postgres pool for the test suite. All tests should import
// `pool` from here rather than creating their own connection.
//
// Also exposes truncate() which clears the data tables between tests
// while preserving the schema and the system-of-record tables.

require('dotenv').config({ path: __dirname + '/../.env.test' });

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('helpers/db.js: DATABASE_URL not set — is .env.test present?');
}

if (!process.env.DATABASE_URL.includes('nbi_dashboard_test')) {
  throw new Error(
    `helpers/db.js: REFUSING to connect — DATABASE_URL points to "${process.env.DATABASE_URL}". ` +
    `Tests are only allowed to touch nbi_dashboard_test.`
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Tables that hold test-created data and should be wiped between tests.
// Order matters for FK constraints — children before parents.
// schema_migrations, settings, lead_pipeline_stages, lead_field_options,
// lead_resource_types, expense_categories, hiring stage tables, and any
// other system-of-record tables are deliberately omitted.
const TRUNCATE_TABLES = [
  'bug_report_comments',
  'bug_reports',
  'task_notes',
  'audit_log',
  'notifications',
  'sessions',
  'password_reset_tokens',
  'tasks',
  'lead_resources',
  'lead_activities',
  'leads',
  'expenses',
  'expense_reports',
  'candidates',
  'hiring_positions',
  'team_members',
  'teams',
  'calendar_events',
  'client_notes',
  'client_reports',
  'contacts',
  'clients',
  'users',
];

async function truncate() {
  // CASCADE handles any tables not explicitly listed
  await pool.query(`TRUNCATE ${TRUNCATE_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

async function end() {
  await pool.end();
}

module.exports = { pool, truncate, end };
```

- [ ] **Step 2: Verify the helper file parses cleanly**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
node --check tests/helpers/db.js && echo "OK"
```

Expected: `OK`.

- [ ] **Step 3: Quick sanity check that pool can connect to the test DB**

```bash
node -e "
require('dotenv').config({ path: 'tests/.env.test' });
const { pool, end } = require('./tests/helpers/db');
pool.query('SELECT current_database() AS db').then(r => {
  console.log('connected to:', r.rows[0].db);
  return end();
}).catch(e => { console.error(e.message); process.exit(1); });
"
```

Expected: `connected to: nbi_dashboard_test`. If it errors with "database does not exist", run Task 2 first.

- [ ] **Step 4: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/helpers/db.js
git commit -m "test: add db helper with safety guard against non-test DBs"
```

---

## Task 4: Vitest global setup + Vitest config + npm scripts + export Express app

**Files:**
- Create: `dashboard-server/tests/setup/global-setup.js`
- Create: `dashboard-server/tests/setup/global-teardown.js`
- Create: `dashboard-server/vitest.config.js`
- Modify: `dashboard-server/package.json` (add `test` and `test:watch` scripts)
- Modify: `dashboard-server/server.js` (export `app` at bottom)

- [ ] **Step 1: Write `tests/setup/global-setup.js`**

```javascript
// dashboard-server/tests/setup/global-setup.js
//
// Vitest globalSetup hook. Runs once before any test in the suite.
//
// Responsibilities:
//   1. Ensure the test database exists (delegates to create-test-db.js)
//   2. Run all migrations against the test database to bring the schema
//      to head, using the existing dashboard-server/migrations/runner.js
//
// Returns a teardown function that vitest will call after all tests.

require('dotenv').config({ path: __dirname + '/../.env.test' });

const { execSync } = require('child_process');
const path = require('path');

module.exports = async function globalSetup() {
  console.log('[vitest globalSetup] Bootstrapping test DB...');

  // 1. Ensure the database exists
  execSync('node ' + path.join(__dirname, 'create-test-db.js'), { stdio: 'inherit' });

  // 2. Run migrations against the test DB
  const { Pool } = require('pg');
  const runMigrations = require('../../migrations/runner');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Migration runner expects a (level, prefix, message, data?) logger
  const log = (level, prefix, message, data) => {
    if (level === 'error') console.error(`[migrate] ${prefix}: ${message}`, data || '');
  };
  await runMigrations(pool, log);
  await pool.end();

  console.log('[vitest globalSetup] Done.');

  // Vitest accepts a teardown returned from globalSetup
  return async () => {
    console.log('[vitest globalTeardown] Closing pools.');
  };
};
```

- [ ] **Step 2: Write `tests/setup/global-teardown.js`** (placeholder for now; the inline teardown returned from globalSetup handles cleanup, but Vitest also accepts a separate file path)

```javascript
// dashboard-server/tests/setup/global-teardown.js
//
// Currently a no-op — globalSetup returns its own teardown function.
// This file exists so a future migration to file-based teardown is
// trivial without changing vitest.config.js.

module.exports = async function globalTeardown() {
  // intentional no-op
};
```

- [ ] **Step 3: Write `vitest.config.js`**

```javascript
// dashboard-server/vitest.config.js
//
// Vitest configuration for the dashboard-server unit suite.
//
// Key settings:
//   - Serial execution (single-fork pool) so Postgres tests don't
//     clobber each other.
//   - globalSetup runs once before all tests (bootstraps test DB +
//     migrates schema).
//   - Test files match tests/unit/**/*.test.js only — Playwright
//     specs in tests/e2e are run by playwright, not vitest.
//   - 30s timeout per test (DB ops can be slow on Windows).

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    globalSetup: ['./tests/setup/global-setup.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['default'],
  },
});
```

- [ ] **Step 4: Add npm scripts**

Open `dashboard-server/package.json` and update the `scripts` block to:

```json
"scripts": {
  "start": "node server.js",
  "init-db": "node init-db.js",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 5: Export Express `app` from server.js**

Open `dashboard-server/server.js` and find the line near the bottom:

```javascript
const server = app.listen(PORT, '0.0.0.0', () => {
```

Wrap the entire `app.listen(...)` block in a guard so the listener only starts when the file is run directly (not when supertest imports it):

```javascript
// Bind to 0.0.0.0 so the dashboard is accessible from other devices on the local network
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    // (rest of the listener body unchanged)
  });
}

// Export the Express app so supertest can call it without binding a port.
// Tests import this via: const app = require('../../server');
module.exports = app;
```

The `server` variable was used for graceful shutdown — that block also moves inside the `if (require.main === module)` guard. Confirm by reading the surrounding ~20 lines and adjusting the guard's closing brace to wrap everything that depends on `server`.

- [ ] **Step 6: Verify server.js still parses**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
node --check server.js && echo "OK"
```

Expected: `OK`.

- [ ] **Step 7: Confirm PM2 production server (running from main checkout) is still alive**

```bash
pm2 list | grep nbi-dashboard
```

Expected: `online` status. The worktree change has not been picked up by PM2 because PM2 reads from main checkout, not the worktree.

- [ ] **Step 8: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/vitest.config.js dashboard-server/tests/setup/global-setup.js dashboard-server/tests/setup/global-teardown.js dashboard-server/package.json dashboard-server/server.js
git commit -m "test: vitest config, global setup, npm scripts, export app from server.js"
```

---

## Task 5: Smoke test — deliberately fail first, then fix

**Files:**
- Create: `dashboard-server/tests/unit/smoke.test.js`

- [ ] **Step 1: Write a deliberately failing smoke test**

```javascript
// dashboard-server/tests/unit/smoke.test.js
//
// Smoke test for the test harness itself. Proves Vitest is wired up,
// global setup ran, and the test runner can both pass AND fail
// assertions correctly.

const { describe, it, expect } = require('vitest');

describe('smoke', () => {
  it('1 + 1 should equal 2 (deliberately wrong first to verify failures are detected)', () => {
    expect(1 + 1).toBe(3); // INTENTIONAL FAILURE — fix in next step
  });
});
```

- [ ] **Step 2: Run the test and verify the failure is reported**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm test
```

Expected: Vitest output shows `1 failed`. The failure message should mention `expected 2 to be 3`. The `[vitest globalSetup] Bootstrapping test DB...` line should appear before the test results — proving the global setup ran.

If the failure is NOT detected, fix the harness before continuing.

- [ ] **Step 3: Fix the smoke test**

Replace the body of the assertion:

```javascript
it('1 + 1 should equal 2', () => {
  expect(1 + 1).toBe(2);
});
```

(Update the test name to drop the "deliberately wrong" parenthetical.)

- [ ] **Step 4: Run the test again and verify pass**

```bash
npm test
```

Expected: `1 passed`. Output should still show globalSetup ran first.

- [ ] **Step 5: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/unit/smoke.test.js
git commit -m "test: smoke test verifying vitest harness detects failures"
```

---

## Task 6: Auth helper

**Files:**
- Create: `dashboard-server/tests/helpers/auth.js`

- [ ] **Step 1: Write `helpers/auth.js`**

```javascript
// dashboard-server/tests/helpers/auth.js
//
// Test authentication helper. Mints a valid session row directly in
// the test DB (bypassing the login flow) and returns the raw token
// for use in Authorization: Bearer ... headers.
//
// Same pattern as the round-trip test during the double-escape
// migration earlier today, formalised as a reusable helper.

const crypto = require('crypto');
const { pool } = require('./db');

/**
 * Hash a token the same way server.js does. Must stay in sync with
 * `function hashToken` near line 269 of server.js.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Mint a session for the given user. Returns the raw (unhashed) token
 * suitable for use in an Authorization header. The hashed version is
 * written to the sessions table.
 *
 * @param {string} userId - UUID of an existing row in the users table
 * @param {object} options
 * @param {number} options.expiresInMinutes - default 60
 * @returns {Promise<string>} raw bearer token
 */
async function mintSession(userId, options = {}) {
  const expiresInMinutes = options.expiresInMinutes || 60;
  const rawToken = `test_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const hashed = hashToken(rawToken);
  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
    [userId, hashed, String(expiresInMinutes)]
  );
  return rawToken;
}

module.exports = { mintSession, hashToken };
```

- [ ] **Step 2: Syntax check**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
node --check tests/helpers/auth.js && echo "OK"
```

Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/helpers/auth.js
git commit -m "test: add auth helper for minting test sessions"
```

---

## Task 7: Fixtures

**Files:**
- Create: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Write `helpers/fixtures.js`**

```javascript
// dashboard-server/tests/helpers/fixtures.js
//
// Factory functions for creating test data. Each factory inserts a
// row into the test DB and returns it. Sane defaults for unspecified
// fields. No shared global state — every test creates its own data.
//
// Add new factories here as feature plans need them. Keep field lists
// in sync with the server-side validation in server.js.

const bcrypt = require('bcrypt');
const { pool } = require('./db');

let _seq = 0;
function uniq(prefix) {
  _seq++;
  return `${prefix}_${Date.now()}_${_seq}`;
}

/**
 * Create a user. Returns { id, username, display_name, email, role, raw_password }.
 * raw_password is included so the test can use it for login flows.
 */
async function createTestUser(opts = {}) {
  const username = opts.username || uniq('testuser');
  const display_name = opts.display_name || `Test User ${_seq}`;
  const email = opts.email || `${username}@example.invalid`;
  const role = opts.role || 'admin';
  const raw_password = opts.password || 'test_password_123';
  const password_hash = await bcrypt.hash(raw_password, 4); // low cost for speed

  const { rows } = await pool.query(
    `INSERT INTO users (username, display_name, email, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, username, display_name, email, role`,
    [username, display_name, email, role, password_hash]
  );
  return { ...rows[0], raw_password };
}

/**
 * Create a client.
 */
async function createTestClient(opts = {}) {
  const name = opts.name || uniq('TestClient');
  const { rows } = await pool.query(
    `INSERT INTO clients (name, description, sector)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, opts.description || '', opts.sector || null]
  );
  return rows[0];
}

/**
 * Create a task. Requires no parent — creates a top-level project by default.
 */
async function createTestTask(opts = {}) {
  const title = opts.title || uniq('TestTask');
  const item_type = opts.item_type || 'project';
  const status = opts.status || 'Not started';
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      title,
      opts.parent_id || null,
      opts.client_id || null,
      item_type,
      status,
      opts.priority || '',
      opts.description || ''
    ]
  );
  return rows[0];
}

/**
 * Create a bug report. Requires user_id (the reporter).
 */
async function createTestBugReport(opts) {
  if (!opts || !opts.user_id) throw new Error('createTestBugReport: user_id required');
  const title = opts.title || uniq('TestBug');
  const type = opts.type || 'bug';
  const status = opts.status || 'open';
  const { rows } = await pool.query(
    `INSERT INTO bug_reports (user_id, type, title, description, status, priority)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [opts.user_id, type, title, opts.description || '', status, opts.priority || null]
  );
  return rows[0];
}

module.exports = {
  uniq,
  createTestUser,
  createTestClient,
  createTestTask,
  createTestBugReport,
};
```

- [ ] **Step 2: Syntax check**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
node --check tests/helpers/fixtures.js && echo "OK"
```

Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/helpers/fixtures.js
git commit -m "test: add fixture factories for user, client, task, bug report"
```

---

## Task 8: Helpers sanity test

**Files:**
- Create: `dashboard-server/tests/unit/helpers.test.js`

- [ ] **Step 1: Write the test**

```javascript
// dashboard-server/tests/unit/helpers.test.js
//
// Sanity check that the test helpers themselves work. Catches the
// "fixture factory broken" class of bug before it cascades into
// every other test failing for the wrong reason.

const { describe, it, expect, beforeEach, afterAll } = require('vitest');
const { pool, truncate, end } = require('../helpers/db');
const { mintSession } = require('../helpers/auth');
const { createTestUser, createTestBugReport } = require('../helpers/fixtures');

beforeEach(async () => { await truncate(); });
afterAll(async () => { await end(); });

describe('helpers', () => {
  it('createTestUser inserts a row and returns it', async () => {
    const user = await createTestUser({ role: 'admin' });
    expect(user.id).toBeTruthy();
    expect(user.role).toBe('admin');
    expect(user.raw_password).toBe('test_password_123');

    const { rows } = await pool.query('SELECT username FROM users WHERE id = $1', [user.id]);
    expect(rows).toHaveLength(1);
  });

  it('mintSession creates a usable session row', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    expect(token).toMatch(/^test_/);

    const { rows } = await pool.query(
      'SELECT user_id, expires_at FROM sessions WHERE user_id = $1',
      [user.id]
    );
    expect(rows).toHaveLength(1);
    expect(new Date(rows[0].expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('createTestBugReport inserts a row tied to a user', async () => {
    const user = await createTestUser();
    const bug = await createTestBugReport({ user_id: user.id, title: 'sample' });
    expect(bug.id).toBeTruthy();
    expect(bug.title).toBe('sample');
    expect(bug.status).toBe('open');
  });

  it('truncate clears tables between tests', async () => {
    // After beforeEach truncate, the users table should be empty
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
    expect(rows[0].n).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm test
```

Expected: `5 passed` (smoke + 4 helpers tests). Each helpers test should run in <1 second.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/unit/helpers.test.js
git commit -m "test: sanity tests for db, auth, fixtures helpers"
```

---

## Task 9: Retroactive unit test — double-escape round-trip

**Files:**
- Create: `dashboard-server/tests/unit/escape.test.js`

- [ ] **Step 1: Write the test**

```javascript
// dashboard-server/tests/unit/escape.test.js
//
// Retroactive test for the double-escape fix shipped in commits
// 203dad6 (W1) and abac7f2 (W2) on 2026-04-15.
//
// Asserts that user-supplied text containing escape-prone characters
// (apostrophe, quote, ampersand, angle brackets) round-trips through
// the API and the database without being HTML-entity-encoded.
//
// If this test ever fails, somebody has reintroduced server-side
// escaping on a write path. Find the culprit and revert.

const { describe, it, expect, beforeEach, afterAll } = require('vitest');
const request = require('supertest');
const app = require('../../server');
const { pool, truncate, end } = require('../helpers/db');
const { mintSession } = require('../helpers/auth');
const { createTestUser } = require('../helpers/fixtures');

beforeEach(async () => { await truncate(); });
afterAll(async () => { await end(); });

const NASTY_TITLE = `can't "quoted" & <tag>`;
const NASTY_DESC = `apostrophes: can't\nquotes: "hello"\nampersand: A & B\nbrackets: <div>x</div>`;

describe('double-escape regression', () => {
  it('POST /api/bug-reports stores raw user text and returns it raw', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'bug',
        title: NASTY_TITLE,
        description: NASTY_DESC,
        page: '/test',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(NASTY_TITLE);
    expect(res.body.description).toBe(NASTY_DESC);

    // And the DB row matches
    const { rows } = await pool.query(
      'SELECT title, description FROM bug_reports WHERE id = $1',
      [res.body.id]
    );
    expect(rows[0].title).toBe(NASTY_TITLE);
    expect(rows[0].description).toBe(NASTY_DESC);
  });

  it('PATCH /api/bug-reports/:id does not re-escape on update', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const created = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'bug', title: 'initial', description: 'initial' });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .patch(`/api/bug-reports/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: NASTY_TITLE, description: NASTY_DESC });

    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe(NASTY_TITLE);
    expect(updated.body.description).toBe(NASTY_DESC);

    const { rows } = await pool.query(
      'SELECT title, description FROM bug_reports WHERE id = $1',
      [created.body.id]
    );
    expect(rows[0].title).toBe(NASTY_TITLE);
    expect(rows[0].description).toBe(NASTY_DESC);
  });

  it('POST /api/bug-reports/:id/comments stores comment text raw', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const bug = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'bug', title: 'parent', description: 'parent' });

    const COMMENT = `It's "still" broken & the <dropdown> doesn't work`;
    const comment = await request(app)
      .post(`/api/bug-reports/${bug.body.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: COMMENT });

    expect(comment.status).toBe(201);
    expect(comment.body.text).toBe(COMMENT);

    const { rows } = await pool.query(
      'SELECT text FROM bug_report_comments WHERE id = $1',
      [comment.body.id]
    );
    expect(rows[0].text).toBe(COMMENT);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm test
```

Expected: `8 passed` (5 from before + 3 escape tests). If any escape test fails, the production code on master has regressed since the double-escape migration earlier today — investigate before continuing.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/unit/escape.test.js
git commit -m "test: retroactive double-escape round-trip coverage"
```

---

## Task 10: Retroactive unit test — auth flow

**Files:**
- Create: `dashboard-server/tests/unit/auth.test.js`

- [ ] **Step 1: Write the test**

```javascript
// dashboard-server/tests/unit/auth.test.js
//
// Retroactive test of the auth flow: login with valid creds, hit a
// protected endpoint, logout, hit it again and get 401.
//
// Covers the most basic security guarantee of the app. If this fails,
// either auth is broken or somebody made an authenticated route public.

const { describe, it, expect, beforeEach, afterAll } = require('vitest');
const request = require('supertest');
const app = require('../../server');
const { truncate, end } = require('../helpers/db');
const { createTestUser } = require('../helpers/fixtures');

beforeEach(async () => { await truncate(); });
afterAll(async () => { await end(); });

describe('auth flow', () => {
  it('valid login returns a token', async () => {
    const user = await createTestUser({ role: 'admin' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('invalid login returns 401', async () => {
    const user = await createTestUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: 'wrong_password' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me with valid token returns the user', async () => {
    const user = await createTestUser({ role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    const token = login.body.token;

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe(user.username);
  });

  it('GET /api/auth/me without a token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout invalidates the token', async () => {
    const user = await createTestUser({ role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.raw_password });
    const token = login.body.token;

    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const after = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm test
```

Expected: `13 passed` (8 from before + 5 auth tests).

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/unit/auth.test.js
git commit -m "test: retroactive auth flow coverage"
```

---

## Task 11: Retroactive unit test — migration runner idempotency

**Files:**
- Create: `dashboard-server/tests/unit/migrations.test.js`

- [ ] **Step 1: Write the test**

```javascript
// dashboard-server/tests/unit/migrations.test.js
//
// Retroactive test of the migration runner. Asserts:
//   1. Running the runner against an already-migrated database is a
//      no-op (no new rows in schema_migrations).
//   2. Every migration file on disk has exactly one row in
//      schema_migrations after a clean run.
//
// If this test fails, the runner is double-applying migrations or
// silently skipping them — both are data integrity risks.

const { describe, it, expect, beforeEach, afterAll } = require('vitest');
const fs = require('fs');
const path = require('path');
const { pool, truncate, end } = require('../helpers/db');
const runMigrations = require('../../migrations/runner');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

afterAll(async () => { await end(); });

const noopLog = () => {};

describe('migration runner', () => {
  it('every migration file on disk has exactly one schema_migrations row after globalSetup', async () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => /^\d{3}_.*\.sql$/.test(f));
    const versions = files.map(f => parseInt(f.match(/^(\d{3})/)[1], 10));

    const { rows } = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
    const applied = rows.map(r => r.version);

    for (const v of versions) {
      const count = applied.filter(a => a === v).length;
      expect(count, `migration ${v} should have exactly 1 schema_migrations row`).toBe(1);
    }
  });

  it('running the runner a second time is a no-op', async () => {
    const { rows: before } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
    await runMigrations(pool, noopLog);
    const { rows: after } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
    expect(after[0].n).toBe(before[0].n);
  });

  it('decode_html_entities function exists (proves migration 020 ran)', async () => {
    const { rows } = await pool.query(
      "SELECT 1 FROM pg_proc WHERE proname = 'decode_html_entities'"
    );
    expect(rows.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm test
```

Expected: `16 passed` (13 from before + 3 migration tests).

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/unit/migrations.test.js
git commit -m "test: retroactive migration runner idempotency coverage"
```

---

## Task 12: Install Playwright + Chromium

**Files:**
- Modify: `dashboard-server/package.json` (devDeps + postinstall + new scripts)

- [ ] **Step 1: Install @playwright/test**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm install --save-dev @playwright/test@^1.49.0
```

Expected: install completes. The package will be in devDependencies.

- [ ] **Step 2: Install the Chromium browser binary**

```bash
npx playwright install chromium
```

Expected: ~150-200MB download, completes with no errors. On Glen's machine this is one-time.

- [ ] **Step 3: Add postinstall hook + new scripts to package.json**

Update the `scripts` block to:

```json
"scripts": {
  "start": "node server.js",
  "init-db": "node init-db.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:all": "npm run test && npm run test:e2e",
  "postinstall": "playwright install chromium --with-deps || true"
}
```

The `|| true` on `postinstall` makes it non-fatal — if Chromium installation fails (e.g. no network), `npm install` still succeeds and the user can install Chromium manually.

- [ ] **Step 4: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/package.json dashboard-server/package-lock.json
git commit -m "test: install playwright with chromium-only browser"
```

---

## Task 13: Test server harness for Playwright

**Files:**
- Create: `dashboard-server/tests/helpers/server.js`

- [ ] **Step 1: Write `helpers/server.js`**

```javascript
// dashboard-server/tests/helpers/server.js
//
// Boots the Express app in-process for Playwright E2E tests.
// Listens on TEST_PORT (default 8889) against nbi_dashboard_test.
//
// Used by playwright.config.js as a webServer via global setup.

require('dotenv').config({ path: __dirname + '/../.env.test' });

let server = null;

async function startTestServer() {
  if (server) return server;

  // Force the test env BEFORE requiring server.js so the right
  // DATABASE_URL is in scope when the pg pool is created.
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('nbi_dashboard_test')) {
    throw new Error('startTestServer: DATABASE_URL must point to nbi_dashboard_test');
  }

  const app = require('../../server');
  const port = parseInt(process.env.PORT || '8889', 10);

  return new Promise((resolve, reject) => {
    server = app.listen(port, '127.0.0.1', err => {
      if (err) return reject(err);
      console.log(`[test-server] listening on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function stopTestServer() {
  if (!server) return;
  return new Promise(resolve => {
    server.close(() => {
      server = null;
      resolve();
    });
  });
}

module.exports = { startTestServer, stopTestServer };
```

- [ ] **Step 2: Syntax check**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
node --check tests/helpers/server.js && echo "OK"
```

Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/helpers/server.js
git commit -m "test: in-process express boot helper for playwright"
```

---

## Task 14: Playwright config

**Files:**
- Create: `dashboard-server/tests/e2e/playwright.config.js`

- [ ] **Step 1: Write the config**

```javascript
// dashboard-server/tests/e2e/playwright.config.js
//
// Playwright config for the dashboard E2E suite.
//
// Boots the Express app via the webServer block (Playwright handles
// startup and waits for the server to respond). Uses a single
// chromium project. Retries are zero — flaky tests are broken tests.

const { defineConfig } = require('@playwright/test');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

const TEST_PORT = parseInt(process.env.PORT || '8889', 10);
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '**/*.spec.js',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 5000,
    navigationTimeout: 10000,
  },
  webServer: {
    command: 'node ' + path.join(__dirname, '..', '..', 'server.js'),
    url: BASE_URL + '/api/health',
    timeout: 30000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
    },
    cwd: path.join(__dirname, '..', '..'),
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

- [ ] **Step 2: Verify Playwright finds the config**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npx playwright test --list --config=tests/e2e/playwright.config.js
```

Expected: `Listing tests:` followed by `Total: 0 tests` (no specs yet, but the config loaded).

- [ ] **Step 3: Wire the npm script to the config path**

Update `package.json`:

```json
"test:e2e": "playwright test --config=tests/e2e/playwright.config.js",
```

- [ ] **Step 4: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/e2e/playwright.config.js dashboard-server/package.json
git commit -m "test: playwright config with chromium-only single-worker setup"
```

---

## Task 15: Playwright smoke test

**Files:**
- Create: `dashboard-server/tests/e2e/smoke.spec.js`

- [ ] **Step 1: Write the smoke spec**

```javascript
// dashboard-server/tests/e2e/smoke.spec.js
//
// Proves Playwright + chromium + the test server boot work end-to-end.
// If this passes, the harness is ready for real E2E tests.

const { test, expect } = require('@playwright/test');

test('app loads and shows the login form', async ({ page }) => {
  await page.goto('/nbi_project_dashboard.html');
  // Login form is the first thing visible to an unauthenticated user
  await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 });
});

test('GET /api/health returns 200 ok', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});
```

- [ ] **Step 2: Run the smoke test**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm run test:e2e
```

Expected: `2 passed`. Playwright spins up the test server, runs both tests, shuts the server down.

If the test fails because the login form selector doesn't match, look at `nbi_project_dashboard.html` for the actual login input — the test assertion is the brittle bit and the rest is fine.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/e2e/smoke.spec.js
git commit -m "test: playwright smoke spec proving end-to-end boot works"
```

---

## Task 16: Retroactive E2E test — auth flow

**Files:**
- Create: `dashboard-server/tests/e2e/auth.spec.js`

- [ ] **Step 1: Write the spec**

```javascript
// dashboard-server/tests/e2e/auth.spec.js
//
// Retroactive E2E test of the login → dashboard → logout flow.
// Uses the API to create a test user (since Playwright shares the
// test DB), then drives the UI through Playwright.

const { test, expect } = require('@playwright/test');
const { createTestUser } = require('../helpers/fixtures');
const { truncate, end } = require('../helpers/db');

test.afterAll(async () => { await end(); });

test('user can log in, see the dashboard, and log out', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });

  await page.goto('/nbi_project_dashboard.html');

  // Fill login form
  await page.locator('input[name="username"], input[placeholder*="ser" i]').first().fill(user.username);
  await page.locator('input[type="password"]').first().fill(user.raw_password);
  await page.locator('button:has-text("Log in"), button:has-text("Login"), button[type="submit"]').first().click();

  // After login, the main app shell should be visible.
  // Look for the sidebar, the header, or any element that only appears post-login.
  await expect(page.locator('text=' + user.display_name).first()).toBeVisible({ timeout: 10000 });

  // Logout — find the logout button (could be in a profile menu)
  // If a direct button isn't present, hit the API endpoint and reload.
  const logoutBtn = page.locator('button:has-text("Log out"), button:has-text("Logout")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.first().click();
  } else {
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') } });
      localStorage.removeItem('token');
      location.reload();
    });
  }

  // After logout, login form is visible again
  await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 });
});
```

- [ ] **Step 2: Run the test**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm run test:e2e
```

Expected: `3 passed` (smoke + 2 + auth flow). If the login selectors don't match the actual HTML, inspect `nbi_project_dashboard.html` and adjust.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/e2e/auth.spec.js
git commit -m "test: retroactive E2E auth flow"
```

---

## Task 17: Retroactive E2E test — task CRUD

**Files:**
- Create: `dashboard-server/tests/e2e/tasks.spec.js`

- [ ] **Step 1: Write the spec**

```javascript
// dashboard-server/tests/e2e/tasks.spec.js
//
// Retroactive E2E test that creates a task via the API (faster than
// driving the form), then verifies it appears in the rendered task
// list, then opens its detail panel.
//
// This is a "feature alive" smoke check, not exhaustive CRUD coverage.

const { test, expect } = require('@playwright/test');
const { createTestUser, createTestTask } = require('../helpers/fixtures');
const { truncate, end } = require('../helpers/db');
const { mintSession } = require('../helpers/auth');

test.afterAll(async () => { await end(); });

test('newly created task appears on the tasks view', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const token = await mintSession(user.id);
  const task = await createTestTask({ title: 'E2E test project', item_type: 'project' });

  // Inject the auth token into localStorage so the dashboard considers us logged in
  await page.goto('/nbi_project_dashboard.html');
  await page.evaluate(t => { localStorage.setItem('token', t); }, token);
  await page.reload();

  // The task title should appear in the rendered DOM somewhere
  await expect(page.locator(`text=${task.title}`).first()).toBeVisible({ timeout: 15000 });
});
```

- [ ] **Step 2: Run the test**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm run test:e2e
```

Expected: `4 passed`. If the task title isn't found, the dashboard may not be loading tasks until you click the Tasks view explicitly — adjust the spec to navigate first.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/e2e/tasks.spec.js
git commit -m "test: retroactive E2E task creation visibility"
```

---

## Task 18: Retroactive E2E test — bug report submission

**Files:**
- Create: `dashboard-server/tests/e2e/bugs.spec.js`

- [ ] **Step 1: Write the spec**

```javascript
// dashboard-server/tests/e2e/bugs.spec.js
//
// Retroactive E2E test that submits a bug report via the API and
// verifies it shows up on the Bug Tracker view.

const { test, expect } = require('@playwright/test');
const request = require('supertest');
const { createTestUser, createTestBugReport } = require('../helpers/fixtures');
const { truncate, end } = require('../helpers/db');
const { mintSession } = require('../helpers/auth');

test.afterAll(async () => { await end(); });

test('bug report appears in the bug tracker view after submission', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const token = await mintSession(user.id);
  const bug = await createTestBugReport({
    user_id: user.id,
    title: 'E2E sample bug',
    description: 'created by playwright spec',
    type: 'bug',
  });

  await page.goto('/nbi_project_dashboard.html');
  await page.evaluate(t => { localStorage.setItem('token', t); }, token);

  // Navigate directly to the bug tracker view via the hash route
  await page.goto('/nbi_project_dashboard.html#bugs');

  await expect(page.locator(`text=${bug.title}`).first()).toBeVisible({ timeout: 15000 });
});
```

- [ ] **Step 2: Run the test**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
npm run test:e2e
```

Expected: `5 passed`.

- [ ] **Step 3: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/e2e/bugs.spec.js
git commit -m "test: retroactive E2E bug tracker visibility"
```

---

## Task 19: tests/README.md

**Files:**
- Create: `dashboard-server/tests/README.md`

- [ ] **Step 1: Write the README**

```markdown
# Dashboard tests

This directory holds the automated test suite for `dashboard-server`. Two test runners share the same database and helpers:

| Runner | Location | What it covers |
|---|---|---|
| **Vitest** | `tests/unit/**/*.test.js` | Server-side unit + integration tests via supertest |
| **Playwright** | `tests/e2e/**/*.spec.js` | Frontend end-to-end tests via real Chromium |

## Quick start

```bash
cd dashboard-server
npm install                # also installs Chromium browser via postinstall
npm test                   # vitest unit suite
npm run test:e2e           # playwright E2E suite
npm run test:all           # both, back to back
```

The first run creates the test database (`nbi_dashboard_test`) automatically.

## Test database

Tests run against `nbi_dashboard_test` on the same local Postgres 16 instance as the dev database. The database is **wiped and re-migrated at the start of each test run** by `tests/setup/global-setup.js`, and individual data tables are **truncated between tests** by `tests/helpers/db.js` `truncate()`.

The helper file refuses to connect if `DATABASE_URL` doesn't include `nbi_dashboard_test` — a safety guard against accidentally pointing at production data.

Configuration lives in `tests/.env.test` (gitignored). The first run will fail with a clear error if the file is missing.

## Writing a unit test

```js
const { describe, it, expect, beforeEach, afterAll } = require('vitest');
const request = require('supertest');
const app = require('../../server');
const { truncate, end } = require('../helpers/db');
const { mintSession } = require('../helpers/auth');
const { createTestUser } = require('../helpers/fixtures');

beforeEach(async () => { await truncate(); });
afterAll(async () => { await end(); });

describe('my feature', () => {
  it('does the thing', async () => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);
    const res = await request(app)
      .post('/api/whatever')
      .set('Authorization', `Bearer ${token}`)
      .send({ ... });
    expect(res.status).toBe(201);
  });
});
```

## Writing an E2E test

```js
const { test, expect } = require('@playwright/test');
const { createTestUser } = require('../helpers/fixtures');
const { truncate, end } = require('../helpers/db');
const { mintSession } = require('../helpers/auth');

test.afterAll(async () => { await end(); });

test('user can do the thing', async ({ page }) => {
  await truncate();
  const user = await createTestUser({ role: 'admin' });
  const token = await mintSession(user.id);

  await page.goto('/nbi_project_dashboard.html');
  await page.evaluate(t => localStorage.setItem('token', t), token);
  await page.reload();

  // ... drive the UI ...
  await expect(page.locator('text=Expected text')).toBeVisible();
});
```

## Helpers

| Helper | Purpose |
|---|---|
| `helpers/db.js` | Shared pg pool, `truncate()`, `end()` |
| `helpers/auth.js` | `mintSession(userId)` — returns a raw bearer token |
| `helpers/fixtures.js` | `createTestUser`, `createTestClient`, `createTestTask`, `createTestBugReport`, etc. |
| `helpers/server.js` | (Used internally by Playwright config) — boots the Express app on port 8889 |

## Adding a new fixture

Add a factory to `helpers/fixtures.js` following the existing pattern: take an options object, fill in sane defaults, INSERT a row, return the row. Add a sanity test to `tests/unit/helpers.test.js` so the factory itself is covered.

## Running a single test

```bash
# vitest
npm test -- tests/unit/escape.test.js

# playwright
npm run test:e2e -- tests/e2e/auth.spec.js
```

## Troubleshooting

**`database "nbi_dashboard_test" does not exist`** — run `node tests/setup/create-test-db.js` once. Subsequent runs are automatic.

**`Authorization header missing` in unit tests** — you forgot `.set('Authorization', \`Bearer ${token}\`)`.

**Playwright says it can't find Chromium** — run `npx playwright install chromium`.

**A test passes locally but the suite is flaky** — flaky tests are broken tests. Investigate timing, selectors, and shared state. Don't add `retries`.

**`server.js` listening on port 8888 conflicts with Playwright** — tests run on `8889`. If you see a port conflict, check that PM2 isn't holding `8889` somehow, or change `PORT=8889` in `tests/.env.test`.

## Out of scope

This suite intentionally does NOT cover:
- Frontend unit tests via jsdom or Vitest against extracted helpers
- CI / GitHub Actions
- ESLint, Prettier, or formatters
- The Hub app (`projects/nbiai_app/app/`)
- Cross-browser E2E
- Visual regression
- Performance / load testing

If a future feature needs any of the above, propose a separate spec.
```

- [ ] **Step 2: Commit**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add dashboard-server/tests/README.md
git commit -m "test: README documenting conventions for both runners"
```

---

## Task 20: Final integration check + live state updates

**Files:**
- Modify: `projects/nbi_dashboard/live_state/decisions.md`
- Modify: `projects/nbi_dashboard/live_state/work_completed.md`
- Create: `projects/nbi_dashboard/session_logs/2026-04-15_session.md` (append to existing if present)

- [ ] **Step 1: Final integration check from a clean state**

Wipe the test DB to simulate a fresh-clone first run, then run the full suite:

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup/dashboard-server
export PGPASSWORD='NbiAi2026!SecureDb'
"/c/Program Files/PostgreSQL/16/bin/psql.exe" -h localhost -p 5432 -U nbiai -d postgres -c "DROP DATABASE IF EXISTS nbi_dashboard_test;"
npm run test:all
```

Expected: 16 unit tests pass, 5 E2E tests pass. Total runtime < 6 minutes (30s + 5min). The `[create-test-db] Created nbi_dashboard_test` line appears.

If anything fails, fix it and re-run. Do not skip this step — the success criterion is "works from a clean clone."

- [ ] **Step 2: Capture timing**

Note the actual runtime of the unit suite and the E2E suite. Will go in the deliverable note.

- [ ] **Step 3: Update `live_state/decisions.md`**

Append after the existing D78 entry:

```markdown
### D80: Build automated test suite (server unit + frontend E2E)
Glen approved building a real test suite as a predecessor to the Kanban drag-to-reorder feature, after pushing back on my too-fast deferral of frontend tests. Stack: Vitest + supertest for server-side, Playwright + chromium for E2E. Six retroactive tests cover existing shipped behaviour (double-escape round-trip, auth flow, migration idempotency, plus E2E smoke for auth/tasks/bugs). Pattern going forward: every server-side feature is written test-first, every drag-and-drop or major UI behaviour gets a Playwright spec. Spec at projects/nbi_dashboard/specs/2026-04-15-test-infrastructure-design.md, plan at projects/nbi_dashboard/plans/2026-04-15-test-infrastructure-plan.md.
```

- [ ] **Step 4: Update `live_state/work_completed.md`**

Append after the existing items:

```markdown
182. **Test infrastructure (commits TBD-on-merge)** -- Vitest + supertest unit suite, Playwright + chromium E2E suite, shared test DB lifecycle, fixture factories, auth helper, six retroactive tests covering double-escape round-trip, login/logout/protected-routes, migration runner idempotency, plus three E2E flows (auth, task visibility, bug visibility). tests/README.md documents conventions. npm test runs unit suite green in <30s, npm run test:e2e runs E2E green in <5min, npm run test:all runs both. Lays the foundation for test-first development on the next sprint (Kanban drag-to-reorder).
```

- [ ] **Step 5: Append to today's session log**

Open `projects/nbi_dashboard/session_logs/2026-04-15_session.md` and append a section:

```markdown
## Test infrastructure project (worktree: test-infra-setup)

Built dashboard-server test suite from scratch. Spec at projects/nbi_dashboard/specs/2026-04-15-test-infrastructure-design.md, plan at projects/nbi_dashboard/plans/2026-04-15-test-infrastructure-plan.md.

Runtime achieved:
- Unit suite: <fill in actual ms from Step 2>
- E2E suite: <fill in actual ms from Step 2>

All 21 tests passing. Six are retroactive coverage of shipped code:
- escape.test.js — double-escape round-trip (POST/PATCH/comment POST + DB)
- auth.test.js — login, /api/auth/me, logout, 401 paths
- migrations.test.js — runner idempotency + decode_html_entities exists
- auth.spec.js — Playwright login → dashboard → logout
- tasks.spec.js — Playwright task visibility
- bugs.spec.js — Playwright bug tracker visibility

Worktree ready to merge to master.
```

- [ ] **Step 6: Commit live state updates**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git add projects/nbi_dashboard/live_state/decisions.md projects/nbi_dashboard/live_state/work_completed.md projects/nbi_dashboard/session_logs/2026-04-15_session.md
git commit -m "test: live state + session log for test infrastructure project"
```

- [ ] **Step 7: Show Glen the commit list and ask for merge approval**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/.claude/worktrees/test-infra-setup
git log --oneline test-infra-setup ^master
```

Then prompt: "Test infrastructure complete. <N> commits on `test-infra-setup` ready to merge. Run `git merge test-infra-setup` from main checkout?"

---

## Task 21: Merge to master

**Worktree action.** Run from the **main checkout**, not the worktree:

- [ ] **Step 1: Switch to main checkout**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM
git status
```

Expected: branch master, clean working tree (the only modified files are the .claude/settings.local.json and worktree symlinks that always show up).

- [ ] **Step 2: Merge `test-infra-setup` into master**

```bash
git merge test-infra-setup --no-ff -m "Merge test-infra-setup: server unit suite (Vitest) + E2E suite (Playwright)"
```

Expected: clean merge with no conflicts. Master is now ahead of `1fd785f` by ~21 commits.

- [ ] **Step 3: Install fresh dependencies in main checkout**

```bash
cd dashboard-server
npm install
```

Expected: vitest, supertest, @playwright/test installed; Chromium browser downloads via postinstall.

- [ ] **Step 4: Run the full suite from main checkout**

```bash
npm run test:all
```

Expected: same 21 passing tests. This proves the worktree work survived the merge intact.

- [ ] **Step 5: Confirm PM2 production server still healthy**

```bash
curl -s -o /dev/null -w "local: %{http_code}\n" http://localhost:8888/api/health
curl -s -o /dev/null -w "prod:  %{http_code}\n" https://worksage.nbi-consulting.com/api/health
pm2 list | grep nbi-dashboard
```

Expected: 200 / 200 / online.

- [ ] **Step 6: Remove the worktree**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM
git worktree remove .claude/worktrees/test-infra-setup
git branch -d test-infra-setup
```

Expected: worktree removed, branch deleted (the merge made it safe to delete).

- [ ] **Step 7: Tell Glen test infrastructure is live and ready for the Kanban project**

---

## Self-review checklist

After the implementation completes, walk through this:

- [ ] All 21 tests passing on a fresh test DB
- [ ] Both `npm test` and `npm run test:e2e` work without manual steps
- [ ] `tests/README.md` documents the patterns
- [ ] `.env.test` is gitignored and never committed
- [ ] `server.js` change is minimal (one `if (require.main === module)` guard + `module.exports = app`)
- [ ] PM2 production server unaffected throughout
- [ ] `test-infra-setup` worktree removed cleanly post-merge
- [ ] Live state files updated with D80 + work item 182

If any item is unchecked, the project is not done.
