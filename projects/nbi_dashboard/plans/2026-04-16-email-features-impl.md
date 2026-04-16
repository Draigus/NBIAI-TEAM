# Email Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two daily email cron jobs (PM Report + Due/Late Warnings) using the existing Microsoft Graph API transport.

**Architecture:** Two new cron jobs in server.js (after line 7293), both calling `sendEmailAsync` (line 211). Shared utility functions (`buildEmailHtml`, `addBusinessDays`, `businessDaysBetween`) defined near the email section (~line 220). Test fixtures extended for `due_date`, `assignees`, teams.

**Tech Stack:** Node.js, PostgreSQL, vitest, Microsoft Graph API (already wired), node-cron (already installed)

**Spec:** `projects/nbi_dashboard/plans/2026-04-16-email-features-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/tests/helpers/fixtures.js` | Modify | Extend `createTestTask` with `due_date`/`assignees`, add `createTestTeam`/`createTestTeamMember`/`createTestAuditEntry` |
| `dashboard-server/tests/unit/business-days.test.mjs` | Create | Unit tests for `addBusinessDays` and `businessDaysBetween` |
| `dashboard-server/tests/unit/email-pm-report.test.mjs` | Create | Integration tests for PM report query + email assembly |
| `dashboard-server/tests/unit/email-due-warnings.test.mjs` | Create | Integration tests for due/late warning query + trigger logic |
| `dashboard-server/server.js` | Modify | Add utility functions (~line 220), add cron jobs (after line 7293), export utilities for tests |

---

## Task 1: Extend test fixtures

**Files:**
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Add `due_date` and `assignees` to `createTestTask`**

Replace the existing `createTestTask` function (lines 56-75) with:

```javascript
async function createTestTask(opts = {}) {
  const title = opts.title || uniq('TestTask');
  const item_type = opts.item_type || 'project';
  const status = opts.status || 'Not started';
  const due_date = opts.due_date || '';
  const assignees = opts.assignees || [];
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, parent_id, client_id, item_type, status, priority, description, due_date, assignees)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      title,
      opts.parent_id || null,
      opts.client_id || null,
      item_type,
      status,
      opts.priority || '',
      opts.description || '',
      due_date,
      assignees
    ]
  );
  return rows[0];
}
```

- [ ] **Step 2: Add `createTestTeam`, `createTestTeamMember`, `createTestAuditEntry`**

Add these three functions before `module.exports`:

```javascript
async function createTestTeam(opts = {}) {
  const name = opts.name || uniq('TestTeam');
  const { rows } = await pool.query(
    `INSERT INTO teams (name, description, client_id, colour)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, opts.description || '', opts.client_id || null, opts.colour || '#3b82f6']
  );
  return rows[0];
}

async function createTestTeamMember(opts) {
  const { rows } = await pool.query(
    `INSERT INTO team_members (team_id, user_id, role)
     VALUES ($1, $2, $3) RETURNING *`,
    [opts.team_id, opts.user_id, opts.role || 'member']
  );
  return rows[0];
}

async function createTestAuditEntry(opts) {
  const { rows } = await pool.query(
    `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      opts.entity_type || 'task',
      opts.entity_id,
      opts.action || 'update',
      opts.changed_by || 'test',
      opts.changes ? JSON.stringify(opts.changes) : null
    ]
  );
  return rows[0];
}
```

- [ ] **Step 3: Update `module.exports`**

```javascript
module.exports = {
  uniq,
  createTestUser,
  createTestClient,
  createTestTask,
  createTestBugReport,
  createTestCandidate,
  createTestLead,
  createTestLeadStage,
  createTestTeam,
  createTestTeamMember,
  createTestAuditEntry,
};
```

- [ ] **Step 4: Run existing tests to verify no regressions**

Run: `cd dashboard-server && npx vitest run tests/unit/helpers.test.mjs`
Expected: All existing helper tests PASS (the new default params are backward-compatible).

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/tests/helpers/fixtures.js
git commit -m "feat(tests): extend fixtures with due_date, assignees, teams, audit entries"
```

---

## Task 2: Business-day utilities (TDD)

**Files:**
- Create: `dashboard-server/tests/unit/business-days.test.mjs`
- Modify: `dashboard-server/server.js` (~line 220, after `sendEmailAsync`)

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/business-days.test.mjs`:

```javascript
// dashboard-server/tests/unit/business-days.test.mjs
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { addBusinessDays, businessDaysBetween } = require('../../server.js');

describe('addBusinessDays', () => {
  it('adds 5 business days from Monday = next Monday', () => {
    // 2026-04-13 is a Monday
    expect(addBusinessDays('2026-04-13', 5)).toBe('2026-04-20');
  });

  it('adds 1 business day from Friday = next Monday', () => {
    // 2026-04-17 is a Friday
    expect(addBusinessDays('2026-04-17', 1)).toBe('2026-04-20');
  });

  it('adds 0 business days returns same date', () => {
    expect(addBusinessDays('2026-04-14', 0)).toBe('2026-04-14');
  });

  it('skips weekends when counting forward', () => {
    // 2026-04-16 is Thursday, +3 = next Tuesday (skip Sat+Sun)
    expect(addBusinessDays('2026-04-16', 3)).toBe('2026-04-21');
  });
});

describe('businessDaysBetween', () => {
  it('same day = 0', () => {
    expect(businessDaysBetween('2026-04-14', '2026-04-14')).toBe(0);
  });

  it('Monday to Friday = 4', () => {
    expect(businessDaysBetween('2026-04-13', '2026-04-17')).toBe(4);
  });

  it('Friday to next Monday = 1 (skips weekend)', () => {
    expect(businessDaysBetween('2026-04-17', '2026-04-20')).toBe(1);
  });

  it('negative when b < a', () => {
    expect(businessDaysBetween('2026-04-17', '2026-04-14')).toBe(-3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/business-days.test.mjs`
Expected: FAIL — `addBusinessDays` and `businessDaysBetween` are not exported from server.js.

- [ ] **Step 3: Implement the utilities in server.js**

Add after `sendEmailAsync` (after line ~218 in server.js), before the `// ==================== CACHING LAYER ====================` comment:

```javascript
// ==================== BUSINESS-DAY UTILITIES ====================

/** Add N business days to a YYYY-MM-DD string. Skips weekends. */
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

/** Count business days between two YYYY-MM-DD strings. Negative if b < a. */
function businessDaysBetween(a, b) {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  const sign = db >= da ? 1 : -1;
  const start = sign === 1 ? da : db;
  const end = sign === 1 ? db : da;
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count * sign;
}
```

- [ ] **Step 4: Export the utilities**

At the bottom of server.js (after the existing `module.exports.reorderInGroup` line), add:

```javascript
module.exports.addBusinessDays = addBusinessDays;
module.exports.businessDaysBetween = businessDaysBetween;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/business-days.test.mjs`
Expected: All 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/business-days.test.mjs
git commit -m "feat: add addBusinessDays + businessDaysBetween utilities with tests"
```

---

## Task 3: Email HTML template helper

**Files:**
- Modify: `dashboard-server/server.js` (after business-day utilities, before CACHING LAYER)

- [ ] **Step 1: Add `buildEmailHtml` function**

Insert after the business-day utilities:

```javascript
/**
 * Build a branded HTML email wrapper.
 * @param {string} title — email heading
 * @param {string} bodyHtml — inner HTML content (sections, tables, etc.)
 * @returns {string} complete HTML document
 */
function buildEmailHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5">
<div style="max-width:640px;margin:0 auto;background:#fff">
  <div style="background:#1e293b;padding:16px 24px">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">${title}</h1>
  </div>
  <div style="padding:24px">${bodyHtml}</div>
  <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
    Sent from NBI Hub &middot; <a href="${APP_URL}/nbi_project_dashboard.html" style="color:#64748b">Open Dashboard</a>
  </div>
</div>
</body></html>`;
}

/** Build an HTML table from rows. cols = [{label, key, style?}], rows = objects */
function buildEmailTable(cols, rows) {
  const thStyle = 'padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:13px;color:#64748b';
  const tdStyle = 'padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px';
  const header = cols.map(c => `<th style="${thStyle}">${c.label}</th>`).join('');
  const body = rows.map(r =>
    '<tr>' + cols.map(c => `<td style="${tdStyle}${c.style ? ';' + c.style : ''}">${r[c.key] ?? ''}</td>`).join('') + '</tr>'
  ).join('');
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0">${header ? `<tr>${header}</tr>` : ''}${body}</table>`;
}

/** Section heading with optional coloured left border */
function buildEmailSection(title, colour, contentHtml) {
  if (!contentHtml) return '';
  return `<div style="margin:20px 0;border-left:4px solid ${colour};padding-left:16px">
    <h2 style="margin:0 0 8px;font-size:15px;color:#1e293b">${title}</h2>
    ${contentHtml}
  </div>`;
}
```

- [ ] **Step 2: Export `buildEmailHtml` for tests**

At the bottom of server.js, add:

```javascript
module.exports.buildEmailHtml = buildEmailHtml;
module.exports.buildEmailTable = buildEmailTable;
module.exports.buildEmailSection = buildEmailSection;
```

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/server.js
git commit -m "feat: add buildEmailHtml, buildEmailTable, buildEmailSection helpers"
```

---

## Task 4: Due/Late Warning System — cron job (TDD)

**Files:**
- Create: `dashboard-server/tests/unit/email-due-warnings.test.mjs`
- Modify: `dashboard-server/server.js` (after line 7293, new cron job)

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/email-due-warnings.test.mjs`:

```javascript
// dashboard-server/tests/unit/email-due-warnings.test.mjs
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const { buildDueWarningEmails } = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('buildDueWarningEmails', () => {
  it('returns empty array when no tasks are due or late', async () => {
    const user = await createTestUser({ username: 'alice' });
    await createTestTask({ assignees: ['alice'], due_date: '2099-01-01', status: 'In progress' });
    const emails = await buildDueWarningEmails('2026-04-16');
    expect(emails).toEqual([]);
  });

  it('sends one email per assignee consolidating all their due/late tickets', async () => {
    const alice = await createTestUser({ username: 'alice', email: 'alice@example.invalid' });
    const client = await createTestClient({ name: 'Acme' });
    // One due today, one 1 day late
    await createTestTask({ title: 'Due Today', assignees: ['alice'], due_date: '2026-04-16', status: 'In progress', client_id: client.id });
    await createTestTask({ title: 'Late 1d', assignees: ['alice'], due_date: '2026-04-15', status: 'In progress', client_id: client.id });

    const emails = await buildDueWarningEmails('2026-04-16');
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('alice@example.invalid');
    expect(emails[0].html).toContain('Due Today');
    expect(emails[0].html).toContain('Late 1d');
  });

  it('skips Done and Cancelled tasks', async () => {
    await createTestUser({ username: 'bob', email: 'bob@example.invalid' });
    await createTestTask({ title: 'Finished', assignees: ['bob'], due_date: '2026-04-10', status: 'Done' });
    await createTestTask({ title: 'Killed', assignees: ['bob'], due_date: '2026-04-10', status: 'Cancelled' });

    const emails = await buildDueWarningEmails('2026-04-16');
    expect(emails).toEqual([]);
  });

  it('skips users with no email address', async () => {
    await createTestUser({ username: 'nomail', email: null });
    await createTestTask({ title: 'Overdue', assignees: ['nomail'], due_date: '2026-04-10', status: 'In progress' });

    const emails = await buildDueWarningEmails('2026-04-16');
    expect(emails).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/email-due-warnings.test.mjs`
Expected: FAIL — `buildDueWarningEmails` is not exported.

- [ ] **Step 3: Implement `buildDueWarningEmails` in server.js**

Add before the cron schedule section (~line 7290, just above the `// ==================== ERROR HANDLING ====================` or before the first `cron.schedule` block — find the right insertion point after existing cron jobs):

```javascript
// ==================== EMAIL CRON: DUE/LATE WARNINGS ====================

/**
 * Build warning emails for tasks that are due today or overdue.
 * Returns an array of { to, subject, html } mail option objects.
 * Exported for testing — the cron job calls this then sends each.
 */
async function buildDueWarningEmails(todayStr) {
  const today = todayStr || new Date().toISOString().slice(0, 10);

  // All active tasks where due_date <= today
  const { rows: tasks } = await pool.query(`
    SELECT t.id, t.title, t.due_date, t.status, t.priority, t.assignees,
           c.name AS client_name
    FROM tasks t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE t.due_date != '' AND t.due_date <= $1
      AND t.status NOT IN ('Done', 'Cancelled')
    ORDER BY t.due_date ASC
  `, [today]);

  if (tasks.length === 0) return [];

  // Collect all unique assignee usernames
  const allAssignees = [...new Set(tasks.flatMap(t => t.assignees || []))];
  if (allAssignees.length === 0) return [];

  // Fetch email addresses for those users
  const { rows: users } = await pool.query(
    'SELECT username, email, display_name FROM users WHERE username = ANY($1) AND email IS NOT NULL AND is_active = true',
    [allAssignees]
  );
  const emailMap = Object.fromEntries(users.map(u => [u.username, { email: u.email, name: u.display_name }]));

  // Group tasks by assignee
  const byAssignee = {};
  for (const task of tasks) {
    for (const assignee of (task.assignees || [])) {
      if (!emailMap[assignee]) continue;
      if (!byAssignee[assignee]) byAssignee[assignee] = [];
      byAssignee[assignee].push(task);
    }
  }

  // Build one email per assignee
  const emails = [];
  for (const [username, userTasks] of Object.entries(byAssignee)) {
    const { email, name } = emailMap[username];
    const overdue = userTasks.filter(t => t.due_date < today);
    const dueToday = userTasks.filter(t => t.due_date === today);

    let sectionsHtml = '';
    if (overdue.length > 0) {
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Client', key: 'client_name' },
        { label: 'Due', key: 'due_date' },
        { label: 'Days Late', key: '_daysLate', style: 'color:#dc2626;font-weight:600' },
      ];
      const rows = overdue.map(t => ({
        ...t,
        _daysLate: businessDaysBetween(t.due_date, today)
      }));
      sectionsHtml += buildEmailSection(`Overdue (${overdue.length})`, '#dc2626', buildEmailTable(cols, rows));
    }
    if (dueToday.length > 0) {
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Client', key: 'client_name' },
        { label: 'Priority', key: 'priority' },
      ];
      sectionsHtml += buildEmailSection(`Due Today (${dueToday.length})`, '#f59e0b', buildEmailTable(cols, dueToday));
    }

    const total = userTasks.length;
    const subject = `NBI Hub — ${total} ticket${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} attention`;
    emails.push({
      to: email,
      subject,
      html: buildEmailHtml(subject, `<p>Hi ${name || username},</p>${sectionsHtml}`),
    });
  }

  return emails;
}
```

- [ ] **Step 4: Export `buildDueWarningEmails` for tests**

At the bottom of server.js:

```javascript
module.exports.buildDueWarningEmails = buildDueWarningEmails;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/email-due-warnings.test.mjs`
Expected: All 4 tests PASS.

- [ ] **Step 6: Add the cron job**

After the last existing `cron.schedule` block (after the FX rate job, ~line 7293), add:

```javascript
// Due & Late Ticket Warnings — 09:00 weekdays
if (cron) {
  cron.schedule('0 9 * * 1-5', async () => {
    log('info', 'Cron', 'Running due/late ticket warning emails');
    try {
      const emails = await buildDueWarningEmails();
      for (const mail of emails) sendEmailAsync(mail);
      log('info', 'Cron', `Due/late warnings: ${emails.length} email(s) queued`);
    } catch (e) {
      log('error', 'Cron', 'Due/late warning job failed', { error: e.message });
    }
  });
  log('info', 'Cron', 'Due/late ticket warnings scheduled for 09:00 weekdays');
}
```

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/email-due-warnings.test.mjs
git commit -m "feat: due/late ticket warning emails — daily 09:00 weekday cron"
```

---

## Task 5: PM Report System — cron job (TDD)

**Files:**
- Create: `dashboard-server/tests/unit/email-pm-report.test.mjs`
- Modify: `dashboard-server/server.js` (new cron job + query function)

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/email-pm-report.test.mjs`:

```javascript
// dashboard-server/tests/unit/email-pm-report.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const {
  createTestUser, createTestClient, createTestTask,
  createTestTeam, createTestTeamMember, createTestAuditEntry,
} = require('../helpers/fixtures.js');
const { buildPmReportEmails } = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('buildPmReportEmails', () => {
  it('returns empty array when lead has no team changes', async () => {
    const lead = await createTestUser({ username: 'pm1', email: 'pm1@example.invalid' });
    const client = await createTestClient({ name: 'Acme' });
    const team = await createTestTeam({ name: 'Acme Team', client_id: client.id });
    await createTestTeamMember({ team_id: team.id, user_id: lead.id, role: 'lead' });

    // No audit entries, no due tasks
    const emails = await buildPmReportEmails('2026-04-16', '2026-04-15T08:00:00Z', '2026-04-16T08:00:00Z');
    expect(emails).toEqual([]);
  });

  it('includes changed tickets in the report', async () => {
    const lead = await createTestUser({ username: 'pm2', email: 'pm2@example.invalid' });
    const client = await createTestClient({ name: 'Beta' });
    const team = await createTestTeam({ name: 'Beta Team', client_id: client.id });
    await createTestTeamMember({ team_id: team.id, user_id: lead.id, role: 'lead' });

    const task = await createTestTask({ title: 'Build API', client_id: client.id, status: 'In progress' });
    await createTestAuditEntry({
      entity_type: 'task', entity_id: task.id, action: 'update',
      changed_by: 'dev1', changes: { status: { from: 'Not started', to: 'In progress' } },
    });

    const emails = await buildPmReportEmails('2026-04-16', '2026-04-15T08:00:00Z', '2026-04-16T08:00:00Z');
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('pm2@example.invalid');
    expect(emails[0].html).toContain('Build API');
  });

  it('includes overdue and upcoming-due tasks', async () => {
    const lead = await createTestUser({ username: 'pm3', email: 'pm3@example.invalid' });
    const client = await createTestClient({ name: 'Gamma' });
    const team = await createTestTeam({ name: 'Gamma Team', client_id: client.id });
    await createTestTeamMember({ team_id: team.id, user_id: lead.id, role: 'lead' });

    await createTestTask({ title: 'Overdue Item', client_id: client.id, due_date: '2026-04-10', status: 'In progress' });
    await createTestTask({ title: 'Due Soon', client_id: client.id, due_date: '2026-04-17', status: 'In progress' });

    const emails = await buildPmReportEmails('2026-04-16', '2026-04-15T08:00:00Z', '2026-04-16T08:00:00Z');
    expect(emails).toHaveLength(1);
    expect(emails[0].html).toContain('Overdue Item');
    expect(emails[0].html).toContain('Due Soon');
  });

  it('skips team leads with no email', async () => {
    const lead = await createTestUser({ username: 'nomail_pm', email: null });
    const client = await createTestClient({ name: 'Delta' });
    const team = await createTestTeam({ name: 'Delta Team', client_id: client.id });
    await createTestTeamMember({ team_id: team.id, user_id: lead.id, role: 'lead' });

    await createTestTask({ title: 'Late', client_id: client.id, due_date: '2026-04-01', status: 'In progress' });

    const emails = await buildPmReportEmails('2026-04-16', '2026-04-15T08:00:00Z', '2026-04-16T08:00:00Z');
    expect(emails).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/email-pm-report.test.mjs`
Expected: FAIL — `buildPmReportEmails` is not exported.

- [ ] **Step 3: Implement `buildPmReportEmails` in server.js**

Add just before `buildDueWarningEmails`:

```javascript
// ==================== EMAIL CRON: PM DAILY REPORT ====================

/**
 * Build PM report emails for team leads.
 * @param {string} todayStr - YYYY-MM-DD
 * @param {string} windowStart - ISO timestamp for audit_log window start
 * @param {string} windowEnd - ISO timestamp for audit_log window end
 * @returns {Array<{to, subject, html}>}
 */
async function buildPmReportEmails(todayStr, windowStart, windowEnd) {
  const today = todayStr || new Date().toISOString().slice(0, 10);

  // Default window: previous business day 08:00 to today 08:00
  // Monday: window starts Friday 08:00
  if (!windowStart || !windowEnd) {
    const now = new Date();
    const todayDate = new Date(today + 'T08:00:00');
    const dow = todayDate.getDay();
    const daysBack = dow === 1 ? 3 : 1; // Monday = 3 days back (from Friday)
    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - daysBack);
    windowStart = startDate.toISOString();
    windowEnd = todayDate.toISOString();
  }

  const fiveAhead = addBusinessDays(today, 5);

  // Get all team leads with their teams and client scopes
  const { rows: leads } = await pool.query(`
    SELECT u.id AS user_id, u.username, u.display_name, u.email,
           t.id AS team_id, t.name AS team_name, t.client_id
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.role = 'lead' AND u.is_active = true
  `);

  if (leads.length === 0) return [];

  // Group by user (a lead can lead multiple teams)
  const byUser = {};
  for (const row of leads) {
    if (!row.email) continue;
    if (!byUser[row.user_id]) {
      byUser[row.user_id] = { username: row.username, name: row.display_name, email: row.email, clientIds: new Set() };
    }
    if (row.client_id) byUser[row.user_id].clientIds.add(row.client_id);
  }

  const emails = [];
  for (const [userId, lead] of Object.entries(byUser)) {
    const clientIds = [...lead.clientIds];
    if (clientIds.length === 0) continue;

    // 1. Changed tickets (from audit_log)
    const { rows: changes } = await pool.query(`
      SELECT al.entity_id, al.action, al.changes, al.changed_by, al.created_at,
             t.title, t.status
      FROM audit_log al
      JOIN tasks t ON t.id::text = al.entity_id::text
      WHERE al.entity_type = 'task'
        AND al.created_at >= $1 AND al.created_at < $2
        AND t.client_id = ANY($3)
      ORDER BY al.created_at DESC
    `, [windowStart, windowEnd, clientIds]);

    // 2. Overdue tasks
    const { rows: overdue } = await pool.query(`
      SELECT id, title, due_date, assignees, status, priority
      FROM tasks WHERE due_date != '' AND due_date < $1
        AND status NOT IN ('Done', 'Cancelled') AND client_id = ANY($2)
      ORDER BY due_date ASC
    `, [today, clientIds]);

    // 3. Due within 5 business days
    const { rows: dueSoon } = await pool.query(`
      SELECT id, title, due_date, assignees, status, priority
      FROM tasks WHERE due_date != '' AND due_date >= $1 AND due_date <= $2
        AND status NOT IN ('Done', 'Cancelled') AND client_id = ANY($3)
      ORDER BY due_date ASC
    `, [today, fiveAhead, clientIds]);

    // 4. Blocked tasks
    const { rows: blocked } = await pool.query(`
      SELECT id, title, due_date, assignees, status
      FROM tasks WHERE status = 'Blocked' AND client_id = ANY($1)
    `, [clientIds]);

    // 5. Lead activity updates
    const { rows: leadUpdates } = await pool.query(`
      SELECT la.activity_type, la.description, la.performed_by, la.created_at,
             l.title AS lead_title
      FROM lead_activities la
      JOIN leads l ON l.id = la.lead_id
      WHERE la.created_at >= $1 AND la.created_at < $2
        AND l.client_id = ANY($3)
      ORDER BY la.created_at DESC
    `, [windowStart, windowEnd, clientIds]);

    // If nothing to report, skip
    if (changes.length === 0 && overdue.length === 0 && dueSoon.length === 0 && blocked.length === 0 && leadUpdates.length === 0) continue;

    // Build summary bar
    const summaryParts = [];
    if (changes.length > 0) summaryParts.push(`${changes.length} change${changes.length === 1 ? '' : 's'}`);
    if (dueSoon.length > 0) summaryParts.push(`${dueSoon.length} due this week`);
    if (overdue.length > 0) summaryParts.push(`${overdue.length} overdue`);
    if (blocked.length > 0) summaryParts.push(`${blocked.length} blocked`);
    if (leadUpdates.length > 0) summaryParts.push(`${leadUpdates.length} lead update${leadUpdates.length === 1 ? '' : 's'}`);
    const summaryHtml = `<p style="background:#f1f5f9;padding:12px 16px;border-radius:6px;font-size:14px;color:#475569">${summaryParts.join(' &middot; ')}</p>`;

    let sectionsHtml = summaryHtml;

    // Overdue & Blocked
    if (overdue.length > 0 || blocked.length > 0) {
      const items = [...overdue.map(t => ({ ...t, _reason: `${businessDaysBetween(t.due_date, today)}d late` })),
                     ...blocked.map(t => ({ ...t, _reason: 'Blocked' }))];
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Assignee', key: '_assigneeStr' },
        { label: 'Due', key: 'due_date' },
        { label: 'Issue', key: '_reason', style: 'color:#dc2626;font-weight:600' },
      ];
      const rows = items.map(t => ({ ...t, _assigneeStr: (t.assignees || []).join(', ') }));
      sectionsHtml += buildEmailSection('Overdue & Blocked', '#dc2626', buildEmailTable(cols, rows));
    }

    // Due this week
    if (dueSoon.length > 0) {
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Assignee', key: '_assigneeStr' },
        { label: 'Due', key: 'due_date' },
        { label: 'Status', key: 'status' },
      ];
      const rows = dueSoon.map(t => ({ ...t, _assigneeStr: (t.assignees || []).join(', ') }));
      sectionsHtml += buildEmailSection('Due This Week', '#f59e0b', buildEmailTable(cols, rows));
    }

    // Changes
    if (changes.length > 0) {
      // Group by task
      const byTask = {};
      for (const c of changes) {
        if (!byTask[c.entity_id]) byTask[c.entity_id] = { title: c.title, entries: [] };
        byTask[c.entity_id].entries.push(c);
      }
      let changesHtml = '';
      for (const [taskId, { title, entries }] of Object.entries(byTask)) {
        changesHtml += `<div style="margin:8px 0"><strong>${title}</strong> &mdash; ${entries.length} change${entries.length === 1 ? '' : 's'}<ul style="margin:4px 0;padding-left:20px">`;
        for (const e of entries) {
          const changeData = typeof e.changes === 'string' ? JSON.parse(e.changes) : e.changes;
          const desc = changeData ? Object.entries(changeData).map(([k, v]) =>
            typeof v === 'object' && v.from !== undefined ? `${k}: ${v.from} → ${v.to}` : `${k}: ${JSON.stringify(v)}`
          ).join(', ') : e.action;
          const time = new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          changesHtml += `<li style="font-size:13px;color:#475569">${desc} (by ${e.changed_by}, ${time})</li>`;
        }
        changesHtml += '</ul></div>';
      }
      sectionsHtml += buildEmailSection('Changes Since Last Report', '#3b82f6', changesHtml);
    }

    // Lead updates
    if (leadUpdates.length > 0) {
      const cols = [
        { label: 'Lead', key: 'lead_title' },
        { label: 'Activity', key: 'activity_type' },
        { label: 'By', key: 'performed_by' },
        { label: 'When', key: '_time' },
      ];
      const rows = leadUpdates.map(la => ({
        ...la,
        _time: new Date(la.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      }));
      sectionsHtml += buildEmailSection('Lead Updates', '#8b5cf6', buildEmailTable(cols, rows));
    }

    const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const subject = `NBI Hub — Daily Report for ${lead.name || lead.username} — ${dateLabel}`;
    emails.push({
      to: lead.email,
      subject,
      html: buildEmailHtml(subject, `<p>Hi ${lead.name || lead.username},</p>${sectionsHtml}`),
    });
  }

  return emails;
}
```

- [ ] **Step 4: Export `buildPmReportEmails`**

At the bottom of server.js:

```javascript
module.exports.buildPmReportEmails = buildPmReportEmails;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/email-pm-report.test.mjs`
Expected: All 4 tests PASS.

- [ ] **Step 6: Add the cron job**

Insert before the due/late warning cron job:

```javascript
// PM Daily Report — 08:00 weekdays
if (cron) {
  cron.schedule('0 8 * * 1-5', async () => {
    log('info', 'Cron', 'Running PM daily report emails');
    try {
      const emails = await buildPmReportEmails();
      for (const mail of emails) sendEmailAsync(mail);
      log('info', 'Cron', `PM reports: ${emails.length} email(s) queued`);
    } catch (e) {
      log('error', 'Cron', 'PM report job failed', { error: e.message });
    }
  });
  log('info', 'Cron', 'PM daily report scheduled for 08:00 weekdays');
}
```

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/email-pm-report.test.mjs
git commit -m "feat: PM daily report emails — 08:00 weekday cron with change/due/blocked digest"
```

---

## Task 6: Full test suite run + bug tracker update

**Files:**
- No new files

- [ ] **Step 1: Run the full test suite**

Run: `cd dashboard-server && npm run test:all`
Expected: All tests pass (existing 86 + new ~16 = ~102 total).

- [ ] **Step 2: Restart PM2 and verify startup logs**

```bash
pm2 restart nbi-dashboard --update-env
pm2 logs nbi-dashboard --lines 20 --nostream
```

Expected in logs:
- `Email configured: Graph API as nbihub@nbi-consulting.com`
- `PM daily report scheduled for 08:00 weekdays`
- `Due/late ticket warnings scheduled for 09:00 weekdays`

- [ ] **Step 3: Update bug tracker — set both items to `please_review`**

```sql
UPDATE bug_reports SET status = 'please_review' WHERE id IN (
  'ae561c32-bd6c-41bd-9f04-b5efd728cb4a',
  'f3a5e888-968c-4c64-ad68-c852e3296691'
);
```

Insert pipeline-compliant comments for each:

For `ae561c32` (PM Report):
```sql
INSERT INTO bug_report_comments (bug_report_id, author, text)
VALUES ('ae561c32-bd6c-41bd-9f04-b5efd728cb4a', 'Glen Pryer',
'Done. The dashboard now sends a daily digest email to team leads every weekday at 08:00. The email shows what tickets changed since the last report, any tickets due in the next five working days, anything overdue, and anything blocked. Weekend changes roll into Monday''s email. The email comes from nbihub@nbi-consulting.com via Microsoft Graph API. Please test by checking the PM report email arrives tomorrow morning at 08:00 for any user who is a team lead with a team that has a client assigned.');
```

For `f3a5e888` (Due/Late Warnings):
```sql
INSERT INTO bug_report_comments (bug_report_id, author, text)
VALUES ('f3a5e888-968c-4c64-ad68-c852e3296691', 'Glen Pryer',
'Done. The dashboard now sends a daily warning email to ticket assignees every weekday at 09:00. If a person has any tickets that are due today or overdue, they get one email listing all of them grouped by severity. The email comes from nbihub@nbi-consulting.com via Microsoft Graph API. Please test by creating a task with a due date of today, assigning it to yourself, and checking for the warning email at 09:00 tomorrow.');
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: PM report + due/late warning email systems

- PM daily report: 08:00 weekdays to team leads (changes, due, blocked)
- Due/late warnings: 09:00 weekdays to assignees (consolidated per user)
- Microsoft Graph API transport via nbihub@nbi-consulting.com
- Business-day utilities (addBusinessDays, businessDaysBetween)
- Branded HTML email template helpers
- 16 new tests (business-days, pm-report, due-warnings)"
```
