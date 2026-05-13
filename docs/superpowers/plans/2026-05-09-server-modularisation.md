# Server Modularisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `dashboard-server/server.js` (10,696 lines, 204 routes) into focused modules without changing the API surface, breaking tests, or altering deployment.

**Architecture:** server.js becomes a thin orchestrator (~250 lines) that creates shared dependencies (pool, app, log, middleware), mounts Express routers from `routes/`, and re-exports everything tests need. Route modules receive shared deps via a context object. Shared helpers move to `lib/`. Cron jobs move to `cron/`.

**Tech Stack:** Node.js/Express 4 (CommonJS), PostgreSQL (pg), Vitest, PM2

**Branch:** `modularise-server` (tag `pre-modularise` as restore point)

**Critical constraint:** 24 test files import from `require('../../server.js')` — both `app` and named exports like `buildDueWarningEmails`, `shiftForInsert`, `reorderInGroup`, `mapRowsToTasks`, etc. server.js MUST continue to export all of these. The strategy: each module exports its functions, server.js re-exports them all.

---

## File Structure

After modularisation, the `dashboard-server/` directory will look like:

```
dashboard-server/
  server.js              (~250 lines — orchestrator, mounts routers, re-exports)
  lib/
    context.js           (~30 lines — shared deps factory: pool, log, email, upload, etc.)
    db.js                (~60 lines — pool creation, pg type config)
    logger.js            (~25 lines — structured JSON logger)
    email.js             (~120 lines — MSAL, Graph API, sendEmailAsync, email HTML builders)
    auth-middleware.js    (~180 lines — requireAuth, requireAdmin, requireNBI, requireClientAdmin, scope helpers, session/cookie, brute-force)
    helpers.js           (~120 lines — buildPatchQuery, isValidUuid, validateLength, escHtml, hashToken, business day utils)
    kanban.js             (~100 lines — POSITION_TABLES, shiftForInsert, reorderInGroup)
    upload.js            (~30 lines — multer config)
    metrics.js           (~60 lines — Prometheus setup, counters, middleware)
    import-parser.js     (~250 lines — detectImportFormat, parseExcelFile, parseCSVFile, mapRowsToTasks)
    audit.js             (~80 lines — auditLog, sanitiseAuditData, computeNextRepeatDate)
    notifications.js     (~20 lines — createNotification helper)
    slack-bot.js         (existing — no changes)
    resilience.js        (existing — no changes, already separate)
    backup-validate.js   (existing — no changes, already separate)
    redact-nbi-internal.js (existing — no changes)
    attachment-sweep.js  (existing — no changes)
  routes/
    auth.js              (~250 lines — login, logout, me, forgot-password, reset-token, change-password)
    users.js             (~250 lines — user CRUD, deactivate, reactivate, reset-password, skills)
    tasks.js             (~650 lines — task CRUD, bulk, notes, sync/changes, sync/poll, sync/load)
    clients.js           (~200 lines — client CRUD, research)
    milestones.js        (~100 lines — milestone CRUD per client)
    sows.js              (~200 lines — SoW CRUD + PDF upload)
    teams.js             (~180 lines — team CRUD + members)
    contacts.js          (~50 lines — contact CRUD per client)
    client-notes.js      (~60 lines — client notes CRUD)
    documents.js         (~400 lines — document CRUD, attachments, move, permissions)
    calendar.js          (~200 lines — calendar events CRUD + visibility)
    leads.js             (~500 lines — leads pipeline, config, stages, resources, activities, reminders, forecast)
    expenses.js          (~500 lines — expenses, categories, expense reports, receipts, OCR, export)
    bugs.js              (~300 lines — bug reports, comments, screenshots, kanban, notifications)
    hiring.js            (~300 lines — positions, candidates, CV upload)
    finance.js           (~50 lines — finance data GET/PUT)
    notifications.js     (~80 lines — notification CRUD, system notifications)
    templates.js         (~70 lines — task template CRUD + create-from-template)
    attachments.js       (~150 lines — universal attachments, verify-matches, confirm, reassign)
    time-entries.js      (~60 lines — time entry CRUD + summary)
    time-off.js          (~50 lines — time-off CRUD)
    reports.js           (~250 lines — client status reports, HTML/PDF generation)
    resource-planning.js (~80 lines — capacity, deal-readiness)
    dashboard.js         (~100 lines — dashboard summary, snapshots)
    settings.js          (~30 lines — settings GET/PUT)
    admin.js             (~250 lines — backup, restore, seed, audit-log, cleanse, health, import)
    queue.js             (~50 lines — task queue CRUD)
    slack.js             (~40 lines — Slack events endpoint)
  cron/
    index.js             (~50 lines — registers all cron jobs, receives context)
    backup.js            (~30 lines — nightly backup + validation)
    pm-report.js         (~220 lines — daily PM report email builder)
    due-warnings.js      (~180 lines — due/late task warning emails)
    fx-rates.js          (~30 lines — daily FX rate refresh)
    expense-reminder.js  (~20 lines — monthly expense reminder)
    cleanup.js           (~30 lines — PDF cleanup, attachment sweep)
    inbound-email.js     (~200 lines — inbound email matching + processing)
```

## Shared Context Pattern

Every route module and cron job receives a `ctx` object:

```javascript
// lib/context.js
module.exports = function createContext({ pool, log, app, upload, sendEmailAsync, ... }) {
  return { pool, log, app, upload, sendEmailAsync, ... };
};
```

Route modules export a function that receives ctx and returns an Express Router:

```javascript
// routes/example.js
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log } = ctx;
  router.get('/api/example', async (req, res) => { ... });
  return router;
};
```

server.js mounts them:

```javascript
const ctx = { pool, log, app, upload, sendEmailAsync, ... };
app.use(require('./routes/auth')(ctx));
app.use(require('./routes/users')(ctx));
// ... etc
```

---

## Execution Strategy

The plan is structured in waves. Each wave is independently committable and testable. If tests break at any wave, we stop and fix before continuing.

**Wave 1 (Tasks 1-3):** Extract shared helpers — zero route changes, zero test impact
**Wave 2 (Tasks 4-8):** Extract small, independent route groups — low coupling, easy to verify
**Wave 3 (Tasks 9-13):** Extract medium-complexity route groups — more dependencies
**Wave 4 (Tasks 14-17):** Extract the big ones — tasks/sync, documents, cron jobs
**Wave 5 (Task 18):** Slim down server.js to orchestrator, final cleanup

Each task follows the same pattern:
1. Create the new file with the extracted code
2. Wire it into server.js (require + mount)
3. Remove the code from server.js
4. Run `npm test` — all 387 must pass
5. Commit

---

## Task 1: Extract lib/logger.js

**Files:**
- Create: `dashboard-server/lib/logger.js`
- Modify: `dashboard-server/server.js` — lines 81-102

- [ ] **Step 1: Create lib/logger.js**

```javascript
// dashboard-server/lib/logger.js
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function log(level, prefix, message, data) {
  if (LOG_LEVELS[level] > LOG_LEVEL) return;
  const entry = { ts: new Date().toISOString(), level, prefix, message };
  if (data) entry.data = data;
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

module.exports = { log, LOG_LEVELS, LOG_LEVEL };
```

- [ ] **Step 2: Replace logger in server.js**

At line 81, replace the logger block with:
```javascript
// ==================== STRUCTURED LOGGER ====================
const { log } = require('./lib/logger');
```

Remove lines 82-99 (the LOG_LEVELS, LOG_LEVEL, and log function).

- [ ] **Step 3: Run tests**

```bash
cd dashboard-server && npm test
```

Expected: 387 passed

- [ ] **Step 4: Commit**

```bash
git add lib/logger.js server.js
git commit -m "refactor: extract lib/logger.js from server.js"
```

---

## Task 2: Extract lib/db.js

**Files:**
- Create: `dashboard-server/lib/db.js`
- Modify: `dashboard-server/server.js` — lines 34-46, 130-146

- [ ] **Step 1: Create lib/db.js**

```javascript
// dashboard-server/lib/db.js
const { Pool, types: pgTypes } = require('pg');
const { log } = require('./logger');

// Return Postgres DATE columns (OID 1082) as raw 'YYYY-MM-DD' strings
pgTypes.setTypeParser(1082, v => v);

function createPool(connectionString) {
  const pool = new Pool({
    connectionString,
    min: 5,
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000
  });
  pool.on('error', (err) => log('error', 'Pool', 'Unexpected error on idle client', { error: err.message }));
  return pool;
}

module.exports = { createPool };
```

- [ ] **Step 2: Replace pool creation in server.js**

Replace the pg import (lines 35-45) and pool creation (lines 137-146) with:
```javascript
const { createPool } = require('./lib/db');
// ... (keep PORT, DB_URL check as-is)
const pool = createPool(DB_URL);
```

Remove the `const { Pool, types: pgTypes } = require('pg');` line and the pgTypes.setTypeParser line and the Pool construction block.

- [ ] **Step 3: Run tests**

```bash
cd dashboard-server && npm test
```

Expected: 387 passed

- [ ] **Step 4: Commit**

```bash
git add lib/db.js server.js
git commit -m "refactor: extract lib/db.js — pool creation and pg DATE config"
```

---

## Task 3: Extract lib/helpers.js

**Files:**
- Create: `dashboard-server/lib/helpers.js`
- Modify: `dashboard-server/server.js` — lines 69-79, 257-327, 378-549

This extracts: ITEM_TYPES, inferItemType, buildPatchQuery, POSITION_TABLES, kanban helpers, isValidUuid, validateLength, hashToken, escHtml, addBusinessDays, businessDaysBetween, circuit breakers.

- [ ] **Step 1: Create lib/helpers.js**

```javascript
// dashboard-server/lib/helpers.js

// ==================== ITEM TYPE HIERARCHY ====================
const ITEM_TYPES = ['project', 'feature', 'story', 'task'];
const VALID_CHILD_TYPE = { project: 'feature', feature: 'story', story: 'task', task: null };
const VALID_PARENT_TYPE = { project: null, feature: 'project', story: 'feature', task: 'story' };

function inferItemType(parentType) {
  if (!parentType) return 'project';
  return VALID_CHILD_TYPE[parentType] || 'task';
}

// ==================== BUSINESS-DAY UTILITIES ====================

function addBusinessDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  let remaining = n;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d.toISOString().slice(0, 10);
}

function businessDaysBetween(a, b) {
  const start = new Date(a + 'T12:00:00');
  const end = new Date(b + 'T12:00:00');
  if (end <= start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// ==================== QUERY HELPERS ====================

const SAFE_COL = /^[a-z_][a-z0-9_]*$/;

function buildPatchQuery(body, allowedFields) {
  const updates = []; const vals = []; let i = 1;
  for (const f of allowedFields) {
    if (!SAFE_COL.test(f)) throw new Error(`Invalid column name: ${f}`);
    if (body[f] !== undefined) { updates.push(`${f} = $${i}`); vals.push(body[f]); i++; }
  }
  return { updates, vals, nextIdx: i };
}

// ==================== KANBAN POSITION HELPERS ====================

const POSITION_TABLES = {
  tasks:        { groupCol: 'status' },
  bug_reports:  { groupCol: 'status' },
  candidates:   { groupCol: 'stage' },
  leads:        { groupCol: 'stage_id' },
};

function _validatePositionTable(table, groupCol) {
  if (!POSITION_TABLES[table]) throw new Error(`Invalid table for position helper: ${table}`);
  if (POSITION_TABLES[table].groupCol !== groupCol) {
    throw new Error(`Invalid column for position helper on ${table}: ${groupCol}`);
  }
}

async function shiftForInsert(client, table, groupCol, groupVal) {
  _validatePositionTable(table, groupCol);
  await client.query(
    `UPDATE ${table} SET position = position + 1 WHERE ${groupCol} = $1`,
    [groupVal]
  );
}

async function reorderInGroup(client, table, groupCol, rowId, newGroup, newPos) {
  _validatePositionTable(table, groupCol);
  if (!Number.isInteger(newPos) || newPos < 0) {
    throw new Error(`reorderInGroup: newPos must be a non-negative integer, got ${newPos}`);
  }

  const cur = await client.query(
    `SELECT ${groupCol} AS grp, position FROM ${table} WHERE id = $1 FOR UPDATE`,
    [rowId]
  );
  if (cur.rows.length === 0) throw new Error(`reorderInGroup: row not found ${rowId}`);
  const oldGroup = cur.rows[0].grp;
  const oldPos = cur.rows[0].position;
  const sameGroup = oldGroup === newGroup
    || (oldGroup != null && newGroup != null && String(oldGroup) === String(newGroup));

  const lengthRes = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${groupCol} = $1`,
    [newGroup]
  );
  const targetLen = lengthRes.rows[0].n;
  const maxPos = sameGroup ? Math.max(0, targetLen - 1) : targetLen;
  const clampedPos = Math.min(newPos, maxPos);

  if (sameGroup && clampedPos === oldPos) return;

  if (sameGroup) {
    if (clampedPos < oldPos) {
      await client.query(
        `UPDATE ${table} SET position = position + 1
         WHERE ${groupCol} = $1 AND position >= $2 AND position < $3 AND id <> $4`,
        [oldGroup, clampedPos, oldPos, rowId]
      );
    } else {
      await client.query(
        `UPDATE ${table} SET position = position - 1
         WHERE ${groupCol} = $1 AND position > $2 AND position <= $3 AND id <> $4`,
        [oldGroup, oldPos, clampedPos, rowId]
      );
    }
  } else {
    await client.query(
      `UPDATE ${table} SET position = position - 1
       WHERE ${groupCol} = $1 AND position > $2`,
      [oldGroup, oldPos]
    );
    await client.query(
      `UPDATE ${table} SET position = position + 1
       WHERE ${groupCol} = $1 AND position >= $2 AND id <> $3`,
      [newGroup, clampedPos, rowId]
    );
  }

  await client.query(
    `UPDATE ${table} SET ${groupCol} = $1, position = $2, updated_at = NOW() WHERE id = $3`,
    [newGroup, clampedPos, rowId]
  );
}

// ==================== VALIDATION ====================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(s) { return typeof s === 'string' && UUID_RE.test(s); }

const MAX_LENGTHS = { title: 500, description: 10000, notes: 5000, name: 200, email: 254, body: 50000 };

function validateLength(value, field, max) {
  if (typeof value === 'string' && value.length > (max || MAX_LENGTHS[field] || 10000)) {
    return `${field} exceeds maximum length of ${max || MAX_LENGTHS[field] || 10000} characters`;
  }
  return null;
}

// ==================== CRYPTO / ESCAPE ====================

const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = {
  ITEM_TYPES, VALID_CHILD_TYPE, VALID_PARENT_TYPE, inferItemType,
  addBusinessDays, businessDaysBetween,
  buildPatchQuery,
  POSITION_TABLES, shiftForInsert, reorderInGroup,
  isValidUuid, validateLength, MAX_LENGTHS,
  hashToken, escHtml,
};
```

- [ ] **Step 2: Replace helpers in server.js**

At the top of server.js (after the logger require), add:
```javascript
const {
  ITEM_TYPES, VALID_CHILD_TYPE, VALID_PARENT_TYPE, inferItemType,
  addBusinessDays, businessDaysBetween,
  buildPatchQuery,
  POSITION_TABLES, shiftForInsert, reorderInGroup,
  isValidUuid, validateLength, MAX_LENGTHS,
  hashToken, escHtml,
} = require('./lib/helpers');
```

Remove the corresponding blocks from server.js:
- Lines 69-79 (ITEM_TYPES section)
- Lines 257-327 (business day utilities + email template builders — NOTE: only business day utils move here; email builders move in a later task)
- Lines 378-549 (HELPERS section: buildPatchQuery, kanban helpers, UUID, validateLength, hashToken, escHtml)

Remove the `const crypto = require('crypto');` import from server.js (line 48) since helpers.js now owns it. BUT KEEP IT if other code in server.js still uses crypto directly — check first. The session token generation in auth routes uses `crypto.randomBytes`, so we must keep the crypto import in server.js for now.

- [ ] **Step 3: Run tests**

```bash
cd dashboard-server && npm test
```

Expected: 387 passed. Particularly watch:
- `kanban-position.test.mjs` (imports shiftForInsert, reorderInGroup)
- `business-days.test.mjs` (imports addBusinessDays, businessDaysBetween)
- `import-due-dates.test.mjs` (imports mapRowsToTasks — NOT moved yet, stays in server.js)

- [ ] **Step 4: Commit**

```bash
git add lib/helpers.js server.js
git commit -m "refactor: extract lib/helpers.js — query builders, kanban, validation, business days"
```

---

## Task 4: Extract lib/email.js

**Files:**
- Create: `dashboard-server/lib/email.js`
- Modify: `dashboard-server/server.js` — lines 190-325

This extracts: MSAL config, Graph API email sending, buildEmailHtml, buildEmailTable, buildEmailSection, sendEmailAsync.

- [ ] **Step 1: Create lib/email.js**

Extract the full MSAL setup (lines 190-255), the three email builder functions (buildEmailHtml ~line 294, buildEmailTable ~line 311, buildEmailSection ~line 322), and the withRetry import for sendEmailAsync. The module receives `log` as a dependency.

```javascript
// dashboard-server/lib/email.js
const { withRetry } = require('../resilience');

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || '';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'nbihub@nbi-consulting.com';

let _msalClient = null;
if (AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET) {
  const msal = require('@azure/msal-node');
  _msalClient = new msal.ConfidentialClientApplication({
    auth: {
      clientId: AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
      clientSecret: AZURE_CLIENT_SECRET
    }
  });
}

// ... (copy _getGraphToken, _sendViaGraph, sendEmailAsync, buildEmailHtml, buildEmailTable, buildEmailSection verbatim from server.js)

module.exports = {
  sendEmailAsync, EMAIL_FROM, _msalClient,
  buildEmailHtml, buildEmailTable, buildEmailSection,
};
```

The `sendEmailAsync` function needs access to `log` and the Prometheus `emailSends` counter. Pass `log` via module-level require from `./logger`. For `emailSends`, accept it as an optional parameter or use a setter function.

- [ ] **Step 2: Replace in server.js** — require email.js, remove the extracted blocks

- [ ] **Step 3: Run tests** — `npm test` — 387 passed

- [ ] **Step 4: Commit**

```bash
git add lib/email.js server.js
git commit -m "refactor: extract lib/email.js — MSAL, Graph API, email builders"
```

---

## Task 5: Extract lib/auth-middleware.js

**Files:**
- Create: `dashboard-server/lib/auth-middleware.js`
- Modify: `dashboard-server/server.js` — lines 151-188 (session/cookie), lines 728-960 (auth middleware + scope helpers)

This extracts: getSessionCookieOpts, getCookieToken, brute-force protection (getFailedLogins, recordFailedLogin, clearFailedLogins), requireAuth, requireAdmin, requireNBI, requireClientAdmin, requireTaskAccess, getClientScope, getClientScopes, token cache.

The module receives `pool`, `log`, and session config as parameters.

- [ ] **Step 1: Create lib/auth-middleware.js** — extract all auth middleware functions

- [ ] **Step 2: Replace in server.js** — require and destructure

- [ ] **Step 3: Run tests** — 387 passed. Watch auth.test.mjs, client-portal-*.test.mjs, client-scope.test.mjs

- [ ] **Step 4: Commit**

```bash
git add lib/auth-middleware.js server.js
git commit -m "refactor: extract lib/auth-middleware.js — auth, scopes, brute-force"
```

---

## Task 6: Extract lib/audit.js

**Files:**
- Create: `dashboard-server/lib/audit.js`
- Modify: `dashboard-server/server.js` — lines ~1507-1600

Extracts: sanitiseAuditData, computeNextRepeatDate, auditLog function.

- [ ] **Step 1: Create lib/audit.js** — receives pool, log

- [ ] **Step 2: Replace in server.js**

- [ ] **Step 3: Run tests** — 387 passed

- [ ] **Step 4: Commit**

```bash
git add lib/audit.js server.js
git commit -m "refactor: extract lib/audit.js — audit logging, repeat date computation"
```

---

## Task 7: Extract lib/notifications.js

**Files:**
- Create: `dashboard-server/lib/notifications.js`
- Modify: `dashboard-server/server.js` — line ~2815

Extracts: createNotification helper function.

- [ ] **Step 1: Create lib/notifications.js**

```javascript
// dashboard-server/lib/notifications.js
module.exports = function createNotifications(pool) {
  async function createNotification(username, type, title, message, link, dismissable) {
    const dismissableVal = dismissable === undefined ? true : dismissable;
    await pool.query(
      'INSERT INTO notifications (username, type, title, message, link, dismissable) VALUES ($1, $2, $3, $4, $5, $6)',
      [username, type, title, message, link || null, dismissableVal]
    );
  }
  return { createNotification };
};
```

- [ ] **Step 2: Replace in server.js**

- [ ] **Step 3: Run tests** — 387 passed

- [ ] **Step 4: Commit**

```bash
git add lib/notifications.js server.js
git commit -m "refactor: extract lib/notifications.js"
```

---

## Task 8: Extract lib/import-parser.js

**Files:**
- Create: `dashboard-server/lib/import-parser.js`
- Modify: `dashboard-server/server.js` — lines ~2132-2630

Extracts: detectImportFormat, parseExcelFile, parseCSVFile, mapRowsToTasks.

- [ ] **Step 1: Create lib/import-parser.js** — copy verbatim, keep ExcelJS require

- [ ] **Step 2: Replace in server.js**

- [ ] **Step 3: Run tests** — 387 passed. Watch import-due-dates.test.mjs, import-hierarchy.test.mjs

- [ ] **Step 4: Commit**

```bash
git add lib/import-parser.js server.js
git commit -m "refactor: extract lib/import-parser.js — CSV/Excel parsing and task mapping"
```

---

## Task 9: Extract lib/metrics.js

**Files:**
- Create: `dashboard-server/lib/metrics.js`
- Modify: `dashboard-server/server.js` — lines ~656-718

Extracts: Prometheus setup, custom counters, metrics endpoint, timing middleware.

- [ ] **Step 1: Create lib/metrics.js** — returns middleware + counters

- [ ] **Step 2: Replace in server.js** — mount metrics middleware

- [ ] **Step 3: Run tests** — 387 passed

- [ ] **Step 4: Commit**

```bash
git add lib/metrics.js server.js
git commit -m "refactor: extract lib/metrics.js — Prometheus counters and timing"
```

---

## Task 10: Extract small route groups (Wave 2)

Extract these independent, low-coupling route groups in a single task since they're all small and follow the same pattern:

**Files to create:**
- `routes/settings.js` (~30 lines — GET/PUT /api/settings)
- `routes/finance.js` (~50 lines — GET/PUT /api/finance)
- `routes/time-entries.js` (~60 lines — CRUD /api/tasks/:id/time-entries, /api/time-entries)
- `routes/time-off.js` (~50 lines — CRUD /api/users/:id/time-off, /api/time-off)
- `routes/queue.js` (~50 lines — CRUD /api/queue)
- `routes/contacts.js` (~50 lines — CRUD /api/clients/:clientId/contacts)
- `routes/client-notes.js` (~60 lines — CRUD /api/clients/:clientId/notes, /api/notes)
- `routes/notifications.js` (~80 lines — CRUD /api/notifications)
- `routes/templates.js` (~70 lines — CRUD /api/templates)
- `routes/slack.js` (~40 lines — POST /api/slack/events)

Each route file follows the pattern:
```javascript
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, requireAuth, requireAdmin, requireNBI } = ctx;
  // ... routes ...
  return router;
};
```

- [ ] **Step 1: Create all 10 route files**

- [ ] **Step 2: Mount in server.js and remove extracted routes**

- [ ] **Step 3: Run tests** — 387 passed

- [ ] **Step 4: Commit**

```bash
git add routes/ server.js
git commit -m "refactor: extract 10 small route groups to routes/"
```

---

## Task 11: Extract medium route groups (Wave 3)

**Files to create:**
- `routes/auth.js` (~250 lines — all /api/auth/* routes)
- `routes/users.js` (~250 lines — all /api/users/* routes including skills)
- `routes/clients.js` (~200 lines — /api/clients/* CRUD + research)
- `routes/milestones.js` (~100 lines — /api/clients/:id/milestones/*)
- `routes/sows.js` (~200 lines — /api/sows/*)
- `routes/teams.js` (~180 lines — /api/teams/* + members)
- `routes/calendar.js` (~200 lines — /api/calendar-events/* + visibility)
- `routes/attachments.js` (~150 lines — /api/attachments/*)

- [ ] **Step 1: Create all 8 route files**

- [ ] **Step 2: Mount in server.js and remove extracted routes**

- [ ] **Step 3: Run tests** — 387 passed. Watch auth.test.mjs, client-portal-*.test.mjs, calendar-*.test.mjs, milestones.test.mjs

- [ ] **Step 4: Commit**

```bash
git add routes/ server.js
git commit -m "refactor: extract 8 medium route groups — auth, users, clients, calendar, teams"
```

---

## Task 12: Extract large route groups (Wave 3 continued)

**Files to create:**
- `routes/leads.js` (~500 lines — all leads CRM routes)
- `routes/expenses.js` (~500 lines — expenses, reports, receipts, OCR, export)
- `routes/bugs.js` (~300 lines — bug reports, comments, screenshots)
- `routes/hiring.js` (~300 lines — positions, candidates, CV)
- `routes/reports.js` (~250 lines — client status reports, HTML/PDF generation)
- `routes/resource-planning.js` (~80 lines — capacity, deal-readiness)
- `routes/dashboard.js` (~100 lines — dashboard summary, snapshots)

- [ ] **Step 1: Create all 7 route files**

- [ ] **Step 2: Mount in server.js and remove extracted routes**

- [ ] **Step 3: Run tests** — 387 passed

- [ ] **Step 4: Commit**

```bash
git add routes/ server.js
git commit -m "refactor: extract 7 large route groups — leads, expenses, bugs, hiring, reports"
```

---

## Task 13: Extract documents route group

Documents is the most complex route group due to optimistic concurrency (ETag), cycle detection, and multi-layered permissions. Extracted separately for focus.

**Files:**
- Create: `routes/documents.js` (~400 lines)
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Create routes/documents.js** — extract all /api/documents/* routes including attachments, move, permissions

- [ ] **Step 2: Mount in server.js**

- [ ] **Step 3: Run tests** — 387 passed. Watch documents.test.mjs specifically

- [ ] **Step 4: Commit**

```bash
git add routes/documents.js server.js
git commit -m "refactor: extract routes/documents.js — CRUD, attachments, ETag concurrency"
```

---

## Task 14: Extract tasks + sync routes

The biggest extraction. `PATCH /api/tasks/:id` is ~358 lines. `POST /api/sync/changes` is ~390 lines. These have deep coupling to each other and to helpers (auditLog, reorderInGroup, createNotification, sendEmailAsync).

**Files:**
- Create: `routes/tasks.js` (~650 lines — task CRUD, bulk, notes)
- Create: `routes/sync.js` (~620 lines — sync/changes, sync/poll, sync/load)
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Create routes/tasks.js** — extract GET/POST/PATCH/DELETE /api/tasks/*, /api/tasks/bulk, /api/tasks/:id/notes

- [ ] **Step 2: Create routes/sync.js** — extract POST /api/sync/changes, GET /api/sync/poll, GET /api/sync/load

- [ ] **Step 3: Mount in server.js**

- [ ] **Step 4: Run tests** — 387 passed. Watch sync.test.mjs, kanban-position.test.mjs, sort-order.test.mjs, date-validation.test.mjs

- [ ] **Step 5: Commit**

```bash
git add routes/tasks.js routes/sync.js server.js
git commit -m "refactor: extract routes/tasks.js and routes/sync.js — CRUD, bulk, sync engine"
```

---

## Task 15: Extract routes/admin.js

**Files:**
- Create: `routes/admin.js` (~250 lines — backup, restore, seed, audit-log, cleanse, health, import routes)
- Modify: `dashboard-server/server.js`

Extracts: GET /api/health, GET /api/backup, POST /api/restore, GET /api/seed-data, GET /api/finance/seed, GET /api/audit-log, GET/POST /api/admin/cleanse, GET/POST /api/import/*

- [ ] **Step 1: Create routes/admin.js**

- [ ] **Step 2: Mount in server.js**

- [ ] **Step 3: Run tests** — 387 passed. Watch cleanse.test.mjs, restore-validation.test.mjs

- [ ] **Step 4: Commit**

```bash
git add routes/admin.js server.js
git commit -m "refactor: extract routes/admin.js — backup, restore, cleanse, import, health"
```

---

## Task 16: Extract cron jobs

**Files:**
- Create: `dashboard-server/cron/index.js` (~50 lines — scheduler registry)
- Create: `dashboard-server/cron/pm-report.js` (~220 lines — buildPmReportEmails)
- Create: `dashboard-server/cron/due-warnings.js` (~180 lines — buildDueWarningEmails + not-started)
- Create: `dashboard-server/cron/inbound-email.js` (~200 lines — matchSubjectToTask, processOneInboundEmail, processInboundEmails, extractLinksFromHtml)
- Create: `dashboard-server/cron/fx-rates.js` (~30 lines)
- Create: `dashboard-server/cron/cleanup.js` (~30 lines — PDF cleanup + attachment sweep schedule)
- Modify: `dashboard-server/server.js`

These are large blocks (~800 lines total) containing the email builder functions that tests import directly.

- [ ] **Step 1: Create cron/ modules**

- [ ] **Step 2: Create cron/index.js** — receives ctx, registers all schedules

- [ ] **Step 3: Replace cron blocks in server.js with single require**

```javascript
if (cron) {
  require('./cron')(ctx, cron);
}
```

- [ ] **Step 4: Run tests** — 387 passed. Watch email-pm-report.test.mjs, email-due-warnings.test.mjs, email-inbound.test.mjs, email-matching.test.mjs

- [ ] **Step 5: Commit**

```bash
git add cron/ server.js
git commit -m "refactor: extract cron/ — PM reports, due warnings, inbound email, FX, cleanup"
```

---

## Task 17: Slim server.js to orchestrator

By this point, server.js should be ~250 lines: dependency loading, shared dep creation, middleware mounting, router mounting, error handler, startup, and re-exports.

**Files:**
- Modify: `dashboard-server/server.js` — final cleanup

- [ ] **Step 1: Verify server.js line count**

```bash
wc -l dashboard-server/server.js
```

Target: under 400 lines. If over, identify remaining extractable blocks.

- [ ] **Step 2: Verify all re-exports still work**

Check that server.js still exports everything tests need:
```javascript
module.exports = app;
module.exports.getClientScope = getClientScope;
module.exports.getClientScopes = getClientScopes;
// ... (all 20+ named exports)
```

- [ ] **Step 3: Run full test suite**

```bash
cd dashboard-server && npm test
```

Expected: 387 passed, 0 failed

- [ ] **Step 4: Run e2e tests if server is running**

```bash
cd dashboard-server && npm run test:e2e
```

- [ ] **Step 5: Final commit**

```bash
git add server.js
git commit -m "refactor: server.js is now a thin orchestrator (~300 lines)"
```

---

## Task 18: Verification and documentation

- [ ] **Step 1: Verify line counts**

```bash
wc -l dashboard-server/server.js
find dashboard-server/routes -name '*.js' | xargs wc -l
find dashboard-server/lib -name '*.js' | xargs wc -l
find dashboard-server/cron -name '*.js' | xargs wc -l
```

- [ ] **Step 2: Run full test suite one final time**

```bash
cd dashboard-server && npm run test:all
```

- [ ] **Step 3: Verify PM2 startup works**

```bash
cd dashboard-server && node server.js
```

(Should start on :8888 with no errors, then Ctrl+C)

- [ ] **Step 4: Update README.md** — add a "Directory Structure" section listing the new modules

- [ ] **Step 5: Final commit and update handoff**

```bash
git add -A
git commit -m "docs: update README with modular directory structure"
```

---

## Execution Notes

- **Wave order matters.** Tasks 1-9 (lib/) must complete before Tasks 10-16 (routes/ and cron/) because route modules depend on the extracted helpers.
- **Test after every task.** Not after every wave — after every task. One failing test means stop and fix before continuing.
- **Re-exports are the safety net.** server.js re-exports everything from the modules so tests don't need to change their imports. If a test fails with "X is not a function", the re-export is missing.
- **No API changes.** No route paths, methods, request bodies, or response shapes change. This is purely an internal restructuring.
- **No new dependencies.** Everything uses Express Router, which is already available.
- **Rollback:** `git checkout pre-modularise` restores the entire repo to pre-modularisation state.
