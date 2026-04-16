# Inbound Email-to-Task Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poll the nbihub@nbi-consulting.com inbox via Graph API every 5 minutes, match emails to clients/tasks by subject line, and store the email body + attachments + URL links against the matched task.

**Architecture:** A `processInboundEmails()` function queries Graph API for unread messages, runs a fuzzy matching pipeline against clients and tasks in PostgreSQL, saves email body as HTML files and downloads attachments to the existing `uploads/` directory, creates `attachments` records via direct DB inserts (same schema as the upload endpoints), and marks processed emails as read. A cron job calls this every 5 minutes.

**Tech Stack:** Node.js, PostgreSQL, Microsoft Graph API (Mail.Read already granted), node-cron, vitest

**Spec:** `projects/nbi_dashboard/plans/2026-04-16-inbound-email-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/tests/unit/email-matching.test.mjs` | Create | Unit tests for subject-line matching (client + task fuzzy match) |
| `dashboard-server/tests/unit/email-inbound.test.mjs` | Create | Integration tests for the full inbound processing pipeline |
| `dashboard-server/server.js` | Modify | Add `matchSubjectToTask()`, `processInboundEmails()`, cron job, exports |

---

## Task 1: Subject-line matching logic (TDD)

**Files:**
- Create: `dashboard-server/tests/unit/email-matching.test.mjs`
- Modify: `dashboard-server/server.js` (add `matchSubjectToTask` function + export)

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/email-matching.test.mjs`:

```javascript
// dashboard-server/tests/unit/email-matching.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const { matchSubjectToTask } = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('matchSubjectToTask', () => {
  it('matches exact client name in subject and falls back to most recent project', async () => {
    const client = await createTestClient({ name: 'Lighthouse Games' });
    const project = await createTestTask({ title: 'LH Rebranding', client_id: client.id, item_type: 'project', status: 'In progress' });

    const result = await matchSubjectToTask('Lighthouse Games - some feedback');
    expect(result.taskId).toBe(project.id);
    expect(result.clientId).toBe(client.id);
    expect(result.confidence).toBe('high');
  });

  it('matches deeper in the hierarchy when feature title appears in subject', async () => {
    const client = await createTestClient({ name: 'Sumo Digital Ltd' });
    const project = await createTestTask({ title: 'Sumo Hiring', client_id: client.id, item_type: 'project', status: 'In progress' });
    const feature = await createTestTask({ title: 'Character Design', client_id: client.id, item_type: 'feature', parent_id: project.id, status: 'In progress' });

    const result = await matchSubjectToTask('Sumo Digital Ltd - Character Design review');
    expect(result.taskId).toBe(feature.id);
    expect(result.confidence).toBe('high');
  });

  it('case-insensitive matching', async () => {
    const client = await createTestClient({ name: 'Epic games' });
    const project = await createTestTask({ title: 'Epic Onboarding', client_id: client.id, item_type: 'project', status: 'In progress' });

    const result = await matchSubjectToTask('EPIC GAMES - onboarding docs');
    expect(result.taskId).toBe(project.id);
    expect(result.confidence).toBe('high');
  });

  it('returns low confidence when no exact client match but partial match exists', async () => {
    const client = await createTestClient({ name: 'Lighthouse Games' });
    const project = await createTestTask({ title: 'LH Project', client_id: client.id, item_type: 'project', status: 'In progress' });

    const result = await matchSubjectToTask('Lighthouse new assets');
    expect(result.taskId).toBe(project.id);
    expect(result.confidence).toBe('low');
  });

  it('returns null taskId when no client matches at all', async () => {
    await createTestClient({ name: 'Totally Different' });

    const result = await matchSubjectToTask('Random unrelated email');
    expect(result.taskId).toBeNull();
    expect(result.confidence).toBe('none');
  });

  it('skips Done and Cancelled tasks when matching', async () => {
    const client = await createTestClient({ name: 'Hello Games' });
    await createTestTask({ title: 'Old Project', client_id: client.id, item_type: 'project', status: 'Done' });
    const active = await createTestTask({ title: 'New Project', client_id: client.id, item_type: 'project', status: 'In progress' });

    const result = await matchSubjectToTask('Hello Games - update');
    expect(result.taskId).toBe(active.id);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/email-matching.test.mjs`
Expected: FAIL - `matchSubjectToTask` is not exported.

- [ ] **Step 3: Implement `matchSubjectToTask` in server.js**

Insert after the `buildPmReportEmails` function and its cron job (after the PM Daily Report cron block, around line 7569), BEFORE the due/late warnings section:

```javascript
// ==================== INBOUND EMAIL MATCHING ====================

/**
 * Match an email subject line to a client and task.
 * Returns { taskId, clientId, confidence: 'high'|'low'|'none', matchedClient, matchedTask }
 */
async function matchSubjectToTask(subject) {
  if (!subject || !subject.trim()) return { taskId: null, clientId: null, confidence: 'none', matchedClient: null, matchedTask: null };

  const subjectLower = subject.toLowerCase().trim();

  // Step 1: Score all clients against the subject
  const { rows: clients } = await pool.query('SELECT id, name FROM clients ORDER BY name');

  let bestClient = null;
  let bestClientScore = 0;
  let confidence = 'none';

  for (const client of clients) {
    const clientLower = client.name.toLowerCase();

    // Exact substring match (highest score)
    if (subjectLower.includes(clientLower)) {
      const score = clientLower.length; // longer match = better
      if (score > bestClientScore) {
        bestClient = client;
        bestClientScore = score;
        confidence = 'high';
      }
      continue;
    }

    // Partial word match: check what fraction of client name words appear in subject
    const clientWords = clientLower.split(/\s+/);
    const matchedWords = clientWords.filter(w => w.length > 2 && subjectLower.includes(w));
    const ratio = matchedWords.length / clientWords.length;
    if (ratio >= 0.5) {
      const score = matchedWords.join('').length; // total matched chars
      if (score > bestClientScore) {
        bestClient = client;
        bestClientScore = score;
        confidence = ratio >= 1.0 ? 'high' : 'low';
      }
    }
  }

  if (!bestClient) return { taskId: null, clientId: null, confidence: 'none', matchedClient: null, matchedTask: null };

  // Step 2: Find the best matching task under this client
  const { rows: tasks } = await pool.query(`
    SELECT id, title, item_type, parent_id, updated_at
    FROM tasks
    WHERE client_id = $1 AND status NOT IN ('Done', 'Cancelled')
    ORDER BY updated_at DESC
  `, [bestClient.id]);

  if (tasks.length === 0) {
    return { taskId: null, clientId: bestClient.id, confidence, matchedClient: bestClient.name, matchedTask: null };
  }

  // Strip the client name from the subject to get the remainder for task matching
  const clientLower = bestClient.name.toLowerCase();
  let remainder = subjectLower.replace(clientLower, '').replace(/^[\s\-:]+|[\s\-:]+$/g, '').trim();

  // Score tasks by title match against the remainder
  let bestTask = null;
  let bestTaskScore = 0;

  if (remainder.length > 0) {
    for (const task of tasks) {
      const titleLower = task.title.toLowerCase();
      // Exact substring match
      if (remainder.includes(titleLower) || titleLower.includes(remainder)) {
        const score = Math.min(titleLower.length, remainder.length);
        if (score > bestTaskScore) {
          bestTask = task;
          bestTaskScore = score;
        }
        continue;
      }
      // Word overlap
      const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2);
      const matchCount = titleWords.filter(w => remainder.includes(w)).length;
      if (matchCount > 0 && matchCount > bestTaskScore) {
        bestTask = task;
        bestTaskScore = matchCount;
      }
    }
  }

  // Fall back to most recently updated project for this client
  if (!bestTask) {
    bestTask = tasks.find(t => t.item_type === 'project') || tasks[0];
  }

  return {
    taskId: bestTask.id,
    clientId: bestClient.id,
    confidence,
    matchedClient: bestClient.name,
    matchedTask: bestTask.title,
  };
}
```

- [ ] **Step 4: Export `matchSubjectToTask`**

At the bottom of server.js (after line 7747), add:

```javascript
module.exports.matchSubjectToTask = matchSubjectToTask;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/email-matching.test.mjs`
Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/email-matching.test.mjs
git commit -m "feat: subject-line matching for inbound email — client + task fuzzy match"
```

---

## Task 2: Inbound email processing pipeline (TDD)

**Files:**
- Create: `dashboard-server/tests/unit/email-inbound.test.mjs`
- Modify: `dashboard-server/server.js` (add `processOneInboundEmail` function + export)

This task builds the core processing function that takes a single Graph API message object and stores it. We test it with mock message objects, but it does real DB inserts.

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/email-inbound.test.mjs`:

```javascript
// dashboard-server/tests/unit/email-inbound.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const { processOneInboundEmail } = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('processOneInboundEmail', () => {
  it('saves email body as HTML attachment on matched task', async () => {
    const client = await createTestClient({ name: 'Bossa Studios' });
    const project = await createTestTask({ title: 'Bossa Onboarding', client_id: client.id, item_type: 'project', status: 'In progress' });

    const mockMessage = {
      id: 'msg-001',
      subject: 'Bossa Studios - contract review',
      from: { emailAddress: { address: 'someone@bossa.com', name: 'Someone' } },
      body: { contentType: 'html', content: '<p>Here is the <a href="https://example.com/contract">contract link</a>.</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T10:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    expect(result.matched).toBe(true);
    expect(result.taskId).toBe(project.id);

    // Check attachment was created
    const { rows: attachments } = await pool.query(
      "SELECT * FROM attachments WHERE entity_type = 'task' AND entity_id = $1 ORDER BY created_at",
      [project.id]
    );
    // Should have: 1 HTML body file + 1 extracted link
    const htmlAttachment = attachments.find(a => a.mime_type === 'text/html');
    expect(htmlAttachment).toBeTruthy();
    expect(htmlAttachment.uploaded_by).toBe('nbihub (email)');

    const linkAttachment = attachments.find(a => a.link_url);
    expect(linkAttachment).toBeTruthy();
    expect(linkAttachment.link_url).toBe('https://example.com/contract');
    expect(linkAttachment.link_title).toBe('contract link');
  });

  it('flags low-confidence matches and creates a notification', async () => {
    const admin = await createTestUser({ username: 'admin1', role: 'admin' });
    const client = await createTestClient({ name: 'Lighthouse Games' });
    const project = await createTestTask({ title: 'LH Work', client_id: client.id, item_type: 'project', status: 'In progress' });

    const mockMessage = {
      id: 'msg-002',
      subject: 'Lighthouse new thing',
      from: { emailAddress: { address: 'test@example.com', name: 'Tester' } },
      body: { contentType: 'html', content: '<p>Some content</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T11:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    expect(result.confidence).toBe('low');

    // Check attachment has verify marker
    const { rows: attachments } = await pool.query(
      "SELECT uploaded_by FROM attachments WHERE entity_type = 'task' AND entity_id = $1",
      [project.id]
    );
    expect(attachments[0].uploaded_by).toContain('verify match');
  });

  it('returns matched=false when no client matches at all', async () => {
    const mockMessage = {
      id: 'msg-003',
      subject: 'Completely unrelated email',
      from: { emailAddress: { address: 'spam@example.com', name: 'Spam' } },
      body: { contentType: 'html', content: '<p>Nothing relevant</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T12:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    expect(result.matched).toBe(false);
  });

  it('extracts multiple URL links from email body', async () => {
    const client = await createTestClient({ name: 'Team17' });
    const project = await createTestTask({ title: 'Team17 Project', client_id: client.id, item_type: 'project', status: 'In progress' });

    const mockMessage = {
      id: 'msg-004',
      subject: 'Team17 - resource links',
      from: { emailAddress: { address: 'pm@team17.com', name: 'PM' } },
      body: { contentType: 'html', content: '<p>See <a href="https://docs.google.com/doc/123">the spec</a> and <a href="https://figma.com/file/abc">designs</a>.</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T13:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    const { rows: links } = await pool.query(
      "SELECT link_url, link_title FROM attachments WHERE entity_type = 'task' AND entity_id = $1 AND link_url IS NOT NULL",
      [project.id]
    );
    expect(links).toHaveLength(2);
    expect(links.map(l => l.link_url).sort()).toEqual([
      'https://docs.google.com/doc/123',
      'https://figma.com/file/abc',
    ]);
  });

  it('skips emails from nbihub itself to prevent loops', async () => {
    const mockMessage = {
      id: 'msg-005',
      subject: 'NBI Hub test',
      from: { emailAddress: { address: 'nbihub@nbi-consulting.com', name: 'NBI Hub' } },
      body: { contentType: 'html', content: '<p>Bounce</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T14:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    expect(result.skipped).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/email-inbound.test.mjs`
Expected: FAIL - `processOneInboundEmail` is not exported.

- [ ] **Step 3: Implement `processOneInboundEmail` in server.js**

Insert after `matchSubjectToTask`:

```javascript
// ==================== INBOUND EMAIL PROCESSING ====================

/**
 * Extract <a href="...">text</a> links from HTML.
 * Returns [{url, title}].
 */
function extractLinksFromHtml(html) {
  const links = [];
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const url = match[1].trim();
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      links.push({ url, title: title.slice(0, 255) || url });
    }
  }
  return links;
}

/**
 * Process a single inbound email message from Graph API.
 * opts.skipGraphApi = true to skip marking as read + downloading attachments (for testing).
 * Returns { matched, skipped, taskId, confidence, error }
 */
async function processOneInboundEmail(message, opts = {}) {
  const fromAddr = message.from?.emailAddress?.address || '';
  const emailFrom = process.env.EMAIL_FROM || 'nbihub@nbi-consulting.com';

  // Skip emails from ourselves
  if (fromAddr.toLowerCase() === emailFrom.toLowerCase()) {
    return { skipped: true, reason: 'self' };
  }

  const subject = message.subject || '(no subject)';
  const bodyHtml = message.body?.content || '';
  const senderName = message.from?.emailAddress?.name || fromAddr;

  // Step 1: Match subject to client/task
  const match = await matchSubjectToTask(subject);

  if (!match.taskId) {
    log('warn', 'InboundEmail', 'No match for email', { subject, from: fromAddr });
    return { matched: false, confidence: 'none', subject };
  }

  const uploadedBy = match.confidence === 'high'
    ? 'nbihub (email)'
    : 'nbihub (email - verify match)';

  // Step 2: Save email body as HTML file
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString('hex');
  const htmlFilename = `${timestamp}-${randomHex}.html`;
  const htmlPath = path.join(uploadDir, htmlFilename);
  const originalName = `Email from ${senderName} - ${subject.slice(0, 100)}.html`;

  fs.writeFileSync(htmlPath, bodyHtml, 'utf8');
  const htmlSize = Buffer.byteLength(bodyHtml, 'utf8');

  await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
     VALUES ('task', $1, $2, $3, $4, 'text/html', $5)`,
    [match.taskId, htmlFilename, originalName, htmlSize, uploadedBy]
  );

  // Step 3: Extract and store URL links
  const links = extractLinksFromHtml(bodyHtml);
  for (const link of links) {
    await pool.query(
      `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by, link_url, link_title)
       VALUES ('task', $1, NULL, NULL, NULL, 'link', $2, $3, $4)`,
      [match.taskId, uploadedBy, link.url, link.title]
    );
  }

  // Step 4: Download file attachments via Graph API (if any)
  if (message.hasAttachments && !opts.skipGraphApi) {
    try {
      const token = await _getGraphToken();
      const attRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${emailFrom}/messages/${message.id}/attachments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (attRes.ok) {
        const attData = await attRes.json();
        for (const att of (attData.value || [])) {
          if (att['@odata.type'] !== '#microsoft.graph.fileAttachment') continue;
          if (!att.contentBytes) continue;
          const attSize = att.size || 0;
          if (attSize > 25 * 1024 * 1024) {
            log('warn', 'InboundEmail', 'Skipping oversized attachment', { name: att.name, size: attSize });
            continue;
          }
          const ext = path.extname(att.name || '.bin');
          const attFilename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
          const attPath = path.join(uploadDir, attFilename);
          fs.writeFileSync(attPath, Buffer.from(att.contentBytes, 'base64'));

          await pool.query(
            `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
             VALUES ('task', $1, $2, $3, $4, $5, $6)`,
            [match.taskId, attFilename, att.name, attSize, att.contentType || 'application/octet-stream', uploadedBy]
          );
        }
      }
    } catch (e) {
      log('error', 'InboundEmail', 'Failed to download attachments', { messageId: message.id, error: e.message });
    }
  }

  // Step 5: Create notification for low-confidence matches
  if (match.confidence === 'low') {
    const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin' AND is_active = true");
    for (const admin of admins) {
      await createNotification(
        admin.username, 'email', 'Email auto-matched (low confidence)',
        `"${subject}" from ${senderName} was matched to ${match.matchedClient} / ${match.matchedTask}. Please verify.`,
        null, true
      );
    }
  }

  // Step 6: Mark email as read in Graph API
  if (!opts.skipGraphApi) {
    try {
      const token = await _getGraphToken();
      await fetch(
        `https://graph.microsoft.com/v1.0/users/${emailFrom}/messages/${message.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        }
      );
    } catch (e) {
      log('error', 'InboundEmail', 'Failed to mark email as read', { messageId: message.id, error: e.message });
    }
  }

  log('info', 'InboundEmail', 'Processed email', {
    subject, from: fromAddr, taskId: match.taskId,
    client: match.matchedClient, task: match.matchedTask,
    confidence: match.confidence, links: links.length,
  });

  return { matched: true, taskId: match.taskId, confidence: match.confidence, client: match.matchedClient, task: match.matchedTask };
}
```

- [ ] **Step 4: Export `processOneInboundEmail` and `extractLinksFromHtml`**

At the bottom of server.js:

```javascript
module.exports.processOneInboundEmail = processOneInboundEmail;
module.exports.extractLinksFromHtml = extractLinksFromHtml;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/email-inbound.test.mjs`
Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/email-inbound.test.mjs
git commit -m "feat: inbound email processing — match, store body/links/attachments, notify"
```

---

## Task 3: Inbox polling cron job + full integration

**Files:**
- Modify: `dashboard-server/server.js` (add `processInboundEmails` orchestrator + cron job)

- [ ] **Step 1: Add the `processInboundEmails` orchestrator**

Insert after `processOneInboundEmail`:

```javascript
/**
 * Poll nbihub inbox for unread emails and process each.
 * Called by the cron job every 5 minutes.
 */
async function processInboundEmails() {
  if (!_msalClient) {
    log('info', 'InboundEmail', 'Graph API not configured, skipping inbox poll');
    return;
  }

  const token = await _getGraphToken();
  const emailFrom = process.env.EMAIL_FROM || 'nbihub@nbi-consulting.com';

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${emailFrom}/mailFolders/Inbox/messages?$filter=isRead%20eq%20false&$select=id,subject,from,body,hasAttachments,receivedDateTime&$top=20&$orderby=receivedDateTime%20asc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API inbox poll failed ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const messages = data.value || [];

  if (messages.length === 0) return;

  log('info', 'InboundEmail', `Processing ${messages.length} unread email(s)`);

  let processed = 0;
  let matched = 0;
  let skipped = 0;

  for (const msg of messages) {
    try {
      const result = await processOneInboundEmail(msg);
      if (result.skipped) skipped++;
      else if (result.matched) matched++;
      processed++;
    } catch (e) {
      log('error', 'InboundEmail', 'Failed to process email', { messageId: msg.id, subject: msg.subject, error: e.message });
      // Mark as read anyway to prevent infinite retry loops
      try {
        await fetch(
          `https://graph.microsoft.com/v1.0/users/${emailFrom}/messages/${msg.id}`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true })
          }
        );
      } catch (_) { /* swallow */ }
    }
  }

  log('info', 'InboundEmail', `Inbox poll complete: ${processed} processed, ${matched} matched, ${skipped} skipped`);
}
```

- [ ] **Step 2: Add the cron job**

Insert after the due/late warnings cron block (after line ~7585):

```javascript
// Inbound Email Polling — every 5 minutes
if (cron) {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await processInboundEmails();
    } catch (e) {
      log('error', 'Cron', 'Inbound email poll failed', { error: e.message });
    }
  });
  log('info', 'Cron', 'Inbound email polling scheduled every 5 minutes');
}
```

- [ ] **Step 3: Export `processInboundEmails`**

At the bottom of server.js:

```javascript
module.exports.processInboundEmails = processInboundEmails;
```

- [ ] **Step 4: Run full test suite**

Run: `cd dashboard-server && npx vitest run`
Expected: All tests pass (existing 88 + ~11 new = ~99 total).

- [ ] **Step 5: Restart PM2 and verify logs**

```bash
pm2 restart nbi-dashboard --update-env
pm2 logs nbi-dashboard --lines 20 --nostream
```

Expected in logs:
- `Inbound email polling scheduled every 5 minutes`

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/server.js
git commit -m "feat: inbound email polling cron — every 5 minutes, processes unread emails"
```

---

## Task 4: End-to-end test + final commit

**Files:**
- No new files

- [ ] **Step 1: Send a test email to nbihub@nbi-consulting.com**

Use the existing Graph API to send a test email from Glen to nbihub:

```bash
cd dashboard-server && node -e "
require('dotenv').config();
const msal = require('@azure/msal-node');
const cca = new msal.ConfidentialClientApplication({
  auth: { clientId: process.env.AZURE_CLIENT_ID, authority: 'https://login.microsoftonline.com/' + process.env.AZURE_TENANT_ID, clientSecret: process.env.AZURE_CLIENT_SECRET }
});
async function test() {
  const token = await cca.acquireTokenByClientCredential({ scopes: ['https://graph.microsoft.com/.default'] });
  const res = await fetch('https://graph.microsoft.com/v1.0/users/' + process.env.EMAIL_FROM + '/sendMail', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token.accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: 'Lighthouse Games - test inbound email',
        body: { contentType: 'HTML', content: '<p>Test email with a <a href=\"https://example.com/test-doc\">document link</a>.</p>' },
        toRecipients: [{ emailAddress: { address: 'nbihub@nbi-consulting.com' } }]
      }, saveToSentItems: false
    })
  });
  console.log(res.ok ? 'Test email sent to nbihub' : 'Failed: ' + res.status);
}
test();
"
```

- [ ] **Step 2: Wait 5 minutes for the cron to fire, or manually trigger**

```bash
cd dashboard-server && node -e "
require('dotenv').config();
const { processInboundEmails } = require('./server.js');
processInboundEmails().then(() => console.log('Done')).catch(e => console.error(e));
"
```

- [ ] **Step 3: Verify the attachment was created**

```bash
cd dashboard-server && node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\"SELECT original_name, mime_type, uploaded_by, link_url, link_title FROM attachments WHERE uploaded_by LIKE 'nbihub%' ORDER BY created_at DESC LIMIT 10\").then(r => {
  console.log('Inbound email attachments:');
  r.rows.forEach(a => console.log(' ', a.original_name || a.link_title, '|', a.mime_type, '|', a.uploaded_by, a.link_url ? '| ' + a.link_url : ''));
  pool.end();
});
"
```

Expected output should show:
- An HTML body file (`Email from ... - Lighthouse Games - test inbound email.html`)
- A link attachment (`document link | link | nbihub (email) | https://example.com/test-doc`)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: inbound email-to-task system

- Polls nbihub@nbi-consulting.com inbox every 5 minutes via Graph API
- Fuzzy matches subject line to clients and tasks (deep hierarchy matching)
- Stores email body as HTML file, extracts URL links, downloads file attachments
- Low-confidence matches flagged with notification to admins
- Self-email loop prevention
- 11 new tests (matching + processing pipeline)"
```
