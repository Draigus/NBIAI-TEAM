# Slack Bot Enhanced Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the @WorkSage Slack bot to accept client shortcode, item type, and assignee metadata in messages, with rich threaded feedback replies.

**Architecture:** Two-pass parser — pass 1 is pure (tokenise + extract candidates), pass 2 does DB resolution (client abbreviation, assignee name) with graceful degradation. Client abbreviations cached in-memory, refreshed hourly. New migration adds 3 columns to `task_queue`. Feedback builder is a separate pure function for testability.

**Tech Stack:** Node.js, Express, PostgreSQL (`pg`), Vitest, Supertest

**Spec:** `docs/superpowers/specs/2026-06-03-slack-bot-enhanced-design.md`

---

### Task 1: Database Migration

**Files:**
- Create: `dashboard-server/migrations/064_queue_metadata.sql`
- Modify: `dashboard-server/tests/fixtures/baseline-schema.sql:1000-1009`

- [ ] **Step 1: Create the migration file**

```sql
-- 064_queue_metadata.sql
-- Add client, assignee, and item type metadata to the Slack submission queue.
-- Supports the enhanced @WorkSage bot message format.

ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS assignee TEXT;
ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'task';
```

- [ ] **Step 2: Update baseline-schema.sql**

Find the `CREATE TABLE public.task_queue` block (lines 1000-1009) and add the three new columns so the test fixture matches production:

```sql
CREATE TABLE public.task_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    submitted_by text NOT NULL,
    slack_user_id text,
    slack_channel text,
    slack_message_ts text,
    client_id uuid,
    assignee text,
    item_type text DEFAULT 'task'::text,
    created_at timestamp with time zone DEFAULT now()
);
```

Also add the FK constraint near the other task_queue constraints (after line ~1717):

```sql
ALTER TABLE ONLY public.task_queue
    ADD CONSTRAINT task_queue_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
```

And add the migration entry to the `schema_migrations` data section (after the last numbered entry):

```
64	064_queue_metadata.sql	2026-06-03 00:00:00+00
```

- [ ] **Step 3: Run migration against test DB to verify**

Run: `cd dashboard-server && npm run init-db`
Expected: Migration 064 applies cleanly, no errors.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/migrations/064_queue_metadata.sql dashboard-server/tests/fixtures/baseline-schema.sql
git commit -m "feat(slack): add client_id, assignee, item_type columns to task_queue (migration 064)"
```

---

### Task 2: Enhanced Parser (Pure Function)

**Files:**
- Modify: `dashboard-server/lib/slack-bot.js:17-25` (replace `parseSlackMessage`)
- Test: `dashboard-server/tests/unit/slack-bot.test.mjs`

- [ ] **Step 1: Write failing tests for the enhanced parser**

Add these tests to `dashboard-server/tests/unit/slack-bot.test.mjs`, replacing the existing `parseSlackMessage` describe block:

```js
describe('parseSlackMessage (enhanced)', () => {
  let parseSlackMessage;
  const ABBREVS = new Set(['ch', 'lh', 'nbi', 'go', 'su', 'pl']);

  beforeEach(() => {
    ({ parseSlackMessage } = require('../../lib/slack-bot'));
  });

  it('extracts full metadata: client, type, assignee, title', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris: Fix login timeout', ABBREVS);
    expect(r.clientAbbr).toBe('CH');
    expect(r.itemType).toBe('task');
    expect(r.assigneeRaw).toBe('Aris');
    expect(r.title).toBe('Fix login timeout');
    expect(r.description).toBeNull();
  });

  it('extracts client + assignee, defaults type to null', () => {
    const r = parseSlackMessage('<@U123> LH for Magnus: Review spec', ABBREVS);
    expect(r.clientAbbr).toBe('LH');
    expect(r.itemType).toBeNull();
    expect(r.assigneeRaw).toBe('Magnus');
    expect(r.title).toBe('Review spec');
  });

  it('extracts client + type, no assignee', () => {
    const r = parseSlackMessage('<@U123> NBI feature: Build integration', ABBREVS);
    expect(r.clientAbbr).toBe('NBI');
    expect(r.itemType).toBe('feature');
    expect(r.assigneeRaw).toBeNull();
    expect(r.title).toBe('Build integration');
  });

  it('bare title with no metadata', () => {
    const r = parseSlackMessage('<@U123> Fix the broken button', ABBREVS);
    expect(r.clientAbbr).toBeNull();
    expect(r.itemType).toBeNull();
    expect(r.assigneeRaw).toBeNull();
    expect(r.title).toBe('Fix the broken button');
  });

  it('handles tokens in any order (type before client)', () => {
    const r = parseSlackMessage('<@U123> task CH for Aris: Works in any order', ABBREVS);
    expect(r.clientAbbr).toBe('CH');
    expect(r.itemType).toBe('task');
    expect(r.assigneeRaw).toBe('Aris');
    expect(r.title).toBe('Works in any order');
  });

  it('is case-insensitive for tokens', () => {
    const r = parseSlackMessage('<@U123> ch TASK For aris: Title', ABBREVS);
    expect(r.clientAbbr).toBe('ch');
    expect(r.itemType).toBe('TASK');
    expect(r.assigneeRaw).toBe('aris');
    expect(r.title).toBe('Title');
  });

  it('captures "for X" as assigneeRaw even if X is not a real user (pass 2 decides)', () => {
    const r = parseSlackMessage('<@U123> Deploy fix for production', ABBREVS);
    expect(r.assigneeRaw).toBe('production');
    expect(r.title).toBe('Deploy fix');
  });

  it('returns null title when only metadata with trailing colon', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris:', ABBREVS);
    expect(r.title).toBeNull();
  });

  it('captures greedy assignee when no colon (rest is assigneeRaw)', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris Fix login', ABBREVS);
    expect(r.clientAbbr).toBe('CH');
    expect(r.itemType).toBe('task');
    expect(r.assigneeRaw).toBe('Aris Fix login');
    expect(r.title).toBeNull();
  });

  it('extracts description from subsequent lines', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris: Fix\nDetails here\nMore info', ABBREVS);
    expect(r.title).toBe('Fix');
    expect(r.description).toBe('Details here\nMore info');
  });

  it('strips multiple bot mentions', () => {
    const r = parseSlackMessage('<@U1> <@U2> CH Fix it', ABBREVS);
    expect(r.clientAbbr).toBe('CH');
    expect(r.title).toBe('Fix it');
  });

  it('returns null title for empty message after mention removal', () => {
    const r = parseSlackMessage('<@U123>', ABBREVS);
    expect(r.title).toBeNull();
  });

  it('handles message with no mention', () => {
    const r = parseSlackMessage('Just a plain message', ABBREVS);
    expect(r.title).toBe('Just a plain message');
  });

  it('handles story type without client', () => {
    const r = parseSlackMessage('<@U123> story for Glen: User can export CSV', ABBREVS);
    expect(r.clientAbbr).toBeNull();
    expect(r.itemType).toBe('story');
    expect(r.assigneeRaw).toBe('Glen');
    expect(r.title).toBe('User can export CSV');
  });

  it('works with empty abbreviation set (no clients in DB)', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris: Fix login', new Set());
    expect(r.clientAbbr).toBeNull();
    expect(r.itemType).toBe('task');
    expect(r.title).toBe('CH Fix login');
    expect(r.assigneeRaw).toBe('Aris');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/slack-bot.test.mjs -t "parseSlackMessage (enhanced)"`
Expected: FAIL — `parseSlackMessage` doesn't accept a second argument yet.

- [ ] **Step 3: Implement the enhanced parseSlackMessage**

Replace the `parseSlackMessage` function in `dashboard-server/lib/slack-bot.js` (lines 17-25) with:

```js
const ITEM_TYPES = new Set(['project', 'feature', 'story', 'task']);

function parseSlackMessage(text, abbreviations) {
  const cleaned = (text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
  const nlIndex = cleaned.indexOf('\n');
  const firstLine = nlIndex === -1 ? cleaned : cleaned.slice(0, nlIndex).trim();
  const description = nlIndex === -1 ? null : cleaned.slice(nlIndex + 1).trim() || null;

  if (!firstLine) return { title: null, description, clientAbbr: null, itemType: null, assigneeRaw: null };

  const abbrSet = abbreviations || new Set();
  const tokens = firstLine.split(/\s+/);
  let clientAbbr = null;
  let itemType = null;
  let assigneeRaw = null;
  const remainder = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];
    const tokLower = tok.toLowerCase();

    // Strip standalone colon or trailing colon — everything after is title
    if (tok === ':') { i++; break; }
    if (tok.endsWith(':')) {
      const word = tok.slice(0, -1);
      const wordLower = word.toLowerCase();
      if (!clientAbbr && abbrSet.has(wordLower)) { clientAbbr = word; }
      else if (!itemType && ITEM_TYPES.has(wordLower)) { itemType = word; }
      else { remainder.push(word); }
      i++;
      break;
    }

    if (!clientAbbr && abbrSet.has(tokLower)) {
      clientAbbr = tok;
      i++;
      continue;
    }

    if (!itemType && ITEM_TYPES.has(tokLower)) {
      itemType = tok;
      i++;
      continue;
    }

    if (tokLower === 'for' && !assigneeRaw && i + 1 < tokens.length) {
      // Consume everything after "for" until colon or end
      i++;
      const nameParts = [];
      while (i < tokens.length) {
        const nt = tokens[i];
        if (nt === ':') { i++; break; }
        if (nt.endsWith(':')) {
          nameParts.push(nt.slice(0, -1));
          i++;
          break;
        }
        nameParts.push(nt);
        i++;
      }
      assigneeRaw = nameParts.join(' ') || null;
      break;
    }

    remainder.push(tok);
    i++;
  }

  // Anything left after the break point is also title
  while (i < tokens.length) {
    remainder.push(tokens[i]);
    i++;
  }

  const title = remainder.join(' ').trim() || null;
  return { title, description, clientAbbr, itemType, assigneeRaw };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/slack-bot.test.mjs -t "parseSlackMessage (enhanced)"`
Expected: All 15 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/lib/slack-bot.js dashboard-server/tests/unit/slack-bot.test.mjs
git commit -m "feat(slack): two-pass parser with client, type, assignee extraction"
```

---

### Task 3: Resolvers and Abbreviation Cache

**Files:**
- Modify: `dashboard-server/lib/slack-bot.js` (add new functions after `parseSlackMessage`)
- Test: `dashboard-server/tests/unit/slack-bot.test.mjs`

- [ ] **Step 1: Write failing tests for resolvers**

Add to `dashboard-server/tests/unit/slack-bot.test.mjs`:

```js
describe('resolveClient', () => {
  let resolveClient;

  beforeEach(async () => {
    ({ resolveClient } = require('../../lib/slack-bot'));
    await truncate();
    // Seed a test client
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
  });

  it('resolves a known abbreviation', async () => {
    const result = await resolveClient(pool, 'CH');
    expect(result).not.toBeNull();
    expect(result.name).toBe('Couch Heroes');
    expect(result.abbreviation).toBe('CH');
    expect(result.id).toBeDefined();
  });

  it('resolves case-insensitively', async () => {
    const result = await resolveClient(pool, 'ch');
    expect(result).not.toBeNull();
    expect(result.name).toBe('Couch Heroes');
  });

  it('returns null for unknown abbreviation', async () => {
    const result = await resolveClient(pool, 'XX');
    expect(result).toBeNull();
  });

  it('returns null for null input', async () => {
    const result = await resolveClient(pool, null);
    expect(result).toBeNull();
  });
});

describe('resolveAssignee', () => {
  let resolveAssignee;

  beforeEach(async () => {
    ({ resolveAssignee } = require('../../lib/slack-bot'));
    await truncate();
    // Seed test users
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('glen', 'Glen Pryer', 'x', 'admin', true)");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('magnus', 'Magnus Pryer', 'x', 'admin', true)");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('inactive', 'Inactive User', 'x', 'member', false)");
  });

  it('resolves exact full name match', async () => {
    const r = await resolveAssignee(pool, 'Glen Pryer');
    expect(r.resolved).toBe(true);
    expect(r.displayName).toBe('Glen Pryer');
  });

  it('resolves exact full name case-insensitively', async () => {
    const r = await resolveAssignee(pool, 'glen pryer');
    expect(r.resolved).toBe(true);
    expect(r.displayName).toBe('Glen Pryer');
  });

  it('resolves first name via prefix match', async () => {
    const r = await resolveAssignee(pool, 'Glen');
    expect(r.resolved).toBe(true);
    expect(r.displayName).toBe('Glen Pryer');
  });

  it('returns not_found for unknown name', async () => {
    const r = await resolveAssignee(pool, 'Nobody');
    expect(r.resolved).toBe(false);
    expect(r.raw).toBe('Nobody');
    expect(r.reason).toBe('not_found');
  });

  it('returns not_found for empty string', async () => {
    const r = await resolveAssignee(pool, '');
    expect(r.resolved).toBe(false);
    expect(r.reason).toBe('not_found');
  });

  it('does not match inactive users', async () => {
    const r = await resolveAssignee(pool, 'Inactive User');
    expect(r.resolved).toBe(false);
    expect(r.reason).toBe('not_found');
  });

  it('returns not_found for null input', async () => {
    const r = await resolveAssignee(pool, null);
    expect(r.resolved).toBe(false);
    expect(r.reason).toBe('not_found');
  });
});

describe('loadClientAbbreviations', () => {
  let loadClientAbbreviations;

  beforeEach(async () => {
    ({ loadClientAbbreviations } = require('../../lib/slack-bot'));
    await truncate();
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Lighthouse Studios', 'LH')");
    await pool.query("INSERT INTO clients (name) VALUES ('No Abbrev Client')");
  });

  it('returns a Set of lowercase abbreviations', async () => {
    const set = await loadClientAbbreviations(pool);
    expect(set).toBeInstanceOf(Set);
    expect(set.has('ch')).toBe(true);
    expect(set.has('lh')).toBe(true);
    expect(set.size).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/slack-bot.test.mjs -t "resolveClient"`
Expected: FAIL — `resolveClient` is not exported.

- [ ] **Step 3: Implement resolvers and cache**

Add the following functions to `dashboard-server/lib/slack-bot.js`, after `parseSlackMessage` and before `postSlackReply`:

```js
let _abbrCache = new Set();
let _abbrCacheTimer = null;

async function loadClientAbbreviations(dbPool) {
  const { rows } = await dbPool.query(
    "SELECT abbreviation FROM clients WHERE abbreviation IS NOT NULL AND abbreviation != ''"
  );
  _abbrCache = new Set(rows.map(r => r.abbreviation.toLowerCase()));
  return _abbrCache;
}

function getClientAbbreviations() {
  return _abbrCache;
}

function startAbbreviationRefresh(dbPool, intervalMs) {
  if (_abbrCacheTimer) clearInterval(_abbrCacheTimer);
  _abbrCacheTimer = setInterval(() => {
    loadClientAbbreviations(dbPool).catch(() => {});
  }, intervalMs || 3600000);
}

function stopAbbreviationRefresh() {
  if (_abbrCacheTimer) { clearInterval(_abbrCacheTimer); _abbrCacheTimer = null; }
}

async function resolveClient(dbPool, abbr) {
  if (!abbr) return null;
  const { rows } = await dbPool.query(
    'SELECT id, name, abbreviation FROM clients WHERE LOWER(abbreviation) = LOWER($1) LIMIT 1',
    [abbr]
  );
  return rows[0] || null;
}

async function resolveAssignee(dbPool, rawName) {
  if (!rawName || !rawName.trim()) return { resolved: false, raw: rawName || '', reason: 'not_found' };

  const name = rawName.trim();

  // Exact match first
  const { rows: exact } = await dbPool.query(
    'SELECT display_name FROM users WHERE LOWER(display_name) = LOWER($1) AND is_active = true LIMIT 1',
    [name]
  );
  if (exact.length === 1) return { resolved: true, displayName: exact[0].display_name };

  // First-name prefix: "Glen" matches "Glen Pryer" (but not "G" matching "Glen")
  const { rows: prefix } = await dbPool.query(
    "SELECT display_name FROM users WHERE LOWER(display_name) LIKE (LOWER($1) || ' %') AND is_active = true LIMIT 2",
    [name]
  );
  if (prefix.length === 1) return { resolved: true, displayName: prefix[0].display_name };
  if (prefix.length > 1) return { resolved: false, raw: name, reason: 'ambiguous' };

  return { resolved: false, raw: name, reason: 'not_found' };
}
```

Update the `module.exports` at the end of the file to include all new functions:

```js
module.exports = {
  verifySlackSignature, parseSlackMessage, postSlackReply, handleAppMention,
  loadClientAbbreviations, getClientAbbreviations, startAbbreviationRefresh, stopAbbreviationRefresh,
  resolveClient, resolveAssignee,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/slack-bot.test.mjs -t "resolveClient" && npx vitest run tests/unit/slack-bot.test.mjs -t "resolveAssignee" && npx vitest run tests/unit/slack-bot.test.mjs -t "loadClientAbbreviations"`
Expected: All 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/lib/slack-bot.js dashboard-server/tests/unit/slack-bot.test.mjs
git commit -m "feat(slack): add resolveClient, resolveAssignee, abbreviation cache"
```

---

### Task 4: Feedback Reply Builder

**Files:**
- Modify: `dashboard-server/lib/slack-bot.js` (add `buildSlackReply` function)
- Test: `dashboard-server/tests/unit/slack-bot.test.mjs`

- [ ] **Step 1: Write failing tests for buildSlackReply**

Add to `dashboard-server/tests/unit/slack-bot.test.mjs`:

```js
describe('buildSlackReply', () => {
  let buildSlackReply;

  beforeEach(() => {
    ({ buildSlackReply } = require('../../lib/slack-bot'));
  });

  it('builds a full success reply with all metadata', () => {
    const reply = buildSlackReply({
      title: 'Fix login timeout',
      itemType: 'task',
      clientName: 'Couch Heroes',
      assigneeName: 'Aris',
      assigneeResolved: true,
      clientResolved: true,
      queueId: 'abc-123',
    });
    expect(reply).toContain('✅ Queued: *Fix login timeout*');
    expect(reply).toContain('📋 Task');
    expect(reply).toContain('👤 Aris');
    expect(reply).toContain('🏢 Couch Heroes');
    expect(reply).toContain('🆔 abc-123');
    expect(reply).toContain('🔗');
  });

  it('flags unresolved assignee with warning', () => {
    const reply = buildSlackReply({
      title: 'Fix login timeout',
      itemType: 'task',
      clientName: 'Couch Heroes',
      assigneeName: 'Nobody',
      assigneeResolved: false,
      clientResolved: true,
      queueId: 'abc-123',
    });
    expect(reply).toContain('⚠️ "Nobody" (not matched to a user)');
    expect(reply).not.toContain('👤');
  });

  it('flags unresolved client with warning', () => {
    const reply = buildSlackReply({
      title: 'Fix login timeout',
      itemType: 'task',
      clientName: null,
      clientAbbr: 'XX',
      assigneeName: 'Aris',
      assigneeResolved: true,
      clientResolved: false,
      queueId: 'abc-123',
    });
    expect(reply).toContain('⚠️ "XX" (unknown client)');
    expect(reply).not.toContain('🏢');
  });

  it('builds minimal reply with no metadata', () => {
    const reply = buildSlackReply({
      title: 'Fix the broken button',
      itemType: 'task',
      queueId: 'abc-123',
    });
    expect(reply).toContain('✅ Queued: *Fix the broken button*');
    expect(reply).toContain('📋 Task');
    expect(reply).toContain('🆔 abc-123');
    expect(reply).not.toContain('👤');
    expect(reply).not.toContain('🏢');
  });

  it('builds error reply for empty title', () => {
    const reply = buildSlackReply({ title: null });
    expect(reply).toContain('❌');
    expect(reply).toContain('Usage:');
  });

  it('builds degraded reply with DB error warning', () => {
    const reply = buildSlackReply({
      title: 'Fix login timeout',
      itemType: 'task',
      queueId: 'abc-123',
      warnings: ['db_error'],
    });
    expect(reply).toContain('⚠️');
    expect(reply).toContain('queued without metadata');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/slack-bot.test.mjs -t "buildSlackReply"`
Expected: FAIL — `buildSlackReply` is not exported.

- [ ] **Step 3: Implement buildSlackReply**

Add to `dashboard-server/lib/slack-bot.js`, after `resolveAssignee` and before `handleAppMention`:

```js
const WORKSAGE_URL = 'https://worksage.nbi-consulting.com/nbi_project_dashboard.html';

function buildSlackReply(opts) {
  const { title, itemType, clientName, clientAbbr, assigneeName,
          assigneeResolved, clientResolved, queueId, warnings } = opts || {};

  if (!title) {
    return '❌ Couldn\'t parse a task from that message.\nUsage: @WorkSage [CH|LH|NBI] [task|story|feature] for [Name]: Title';
  }

  const lines = [];
  lines.push(`✅ Queued: *${title}*`);

  // Metadata line
  const typeName = (itemType || 'task').charAt(0).toUpperCase() + (itemType || 'task').slice(1).toLowerCase();
  const parts = [`📋 ${typeName}`];

  if (assigneeName && assigneeResolved) {
    parts.push(`👤 ${assigneeName}`);
  } else if (assigneeName && !assigneeResolved) {
    parts.push(`⚠️ "${assigneeName}" (not matched to a user)`);
  }

  if (clientName && clientResolved) {
    parts.push(`🏢 ${clientName}`);
  } else if (clientAbbr && !clientResolved) {
    parts.push(`⚠️ "${clientAbbr}" (unknown client)`);
  }

  lines.push(parts.join(' · '));

  if (warnings && warnings.includes('db_error')) {
    lines.push('⚠️ Couldn\'t look up client/assignee — queued without metadata');
  }

  if (queueId) lines.push(`🆔 ${queueId}`);
  lines.push(`🔗 ${WORKSAGE_URL}`);

  return lines.join('\n');
}
```

Add `buildSlackReply` to `module.exports`:

```js
module.exports = {
  verifySlackSignature, parseSlackMessage, postSlackReply, handleAppMention,
  loadClientAbbreviations, getClientAbbreviations, startAbbreviationRefresh, stopAbbreviationRefresh,
  resolveClient, resolveAssignee, buildSlackReply,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/slack-bot.test.mjs -t "buildSlackReply"`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/lib/slack-bot.js dashboard-server/tests/unit/slack-bot.test.mjs
git commit -m "feat(slack): add buildSlackReply feedback formatter"
```

---

### Task 5: Updated handleAppMention (Two-Pass Flow)

**Files:**
- Modify: `dashboard-server/lib/slack-bot.js:54-75` (replace `handleAppMention`)
- Test: `dashboard-server/tests/unit/slack-bot.test.mjs`

- [ ] **Step 1: Write failing tests for the updated handleAppMention**

Update the existing `handleAppMention` describe block in the test file:

```js
describe('handleAppMention (enhanced)', () => {
  let handleAppMention, loadClientAbbreviations;

  beforeEach(async () => {
    ({ handleAppMention, loadClientAbbreviations } = require('../../lib/slack-bot'));
    await truncate();
    // Seed clients and users
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('aris', 'Aris', 'x', 'member', true)");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('glen', 'Glen Pryer', 'x', 'admin', true)");
    // Prime the abbreviation cache
    await loadClientAbbreviations(pool);
  });

  it('queues a task with full metadata', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH task for Aris: Fix login timeout\nThe session expires too fast',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.title).toBe('Fix login timeout');
    expect(result.item.description).toBe('The session expires too fast');
    expect(result.item.item_type).toBe('task');
    expect(result.item.assignee).toBe('Aris');
    expect(result.item.client_id).toBeDefined();

    const { rows } = await pool.query('SELECT * FROM task_queue');
    expect(rows).toHaveLength(1);
    expect(rows[0].client_id).toBeDefined();
    expect(rows[0].assignee).toBe('Aris');
    expect(rows[0].item_type).toBe('task');
  });

  it('queues with default type when not specified', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH for Aris: Fix it',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.item.item_type).toBe('task');
  });

  it('re-merges "for X" into title when X is not a known user', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH Deploy fix for production',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.title).toBe('Deploy fix for production');
    expect(result.item.assignee).toBeNull();
  });

  it('queues with null client_id when abbreviation is unknown', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> XX for Aris: Some task',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    // XX is not a known abbreviation, so it stays in the title
    expect(result.item.client_id).toBeNull();
    expect(result.item.title).toContain('XX');
  });

  it('returns queued:false for an empty message', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT>',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(false);
  });

  it('resolves first-name assignee to full display_name', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> for Glen: Review the spec',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.assignee).toBe('Glen Pryer');
  });

  it('stores raw assignee text when not found', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH for Nobody: Some task',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.assignee).toBe('Nobody');
    expect(result.warnings).toContain('assignee_not_found');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/slack-bot.test.mjs -t "handleAppMention (enhanced)"`
Expected: FAIL — old `handleAppMention` doesn't return `item_type`, `client_id`, `assignee`.

- [ ] **Step 3: Implement updated handleAppMention**

Replace the `handleAppMention` function in `dashboard-server/lib/slack-bot.js` (lines 54-73):

```js
async function handleAppMention(event, dbPool, botToken) {
  const abbrSet = getClientAbbreviations();
  const parsed = parseSlackMessage(event.text, abbrSet);

  if (!parsed.title && !parsed.assigneeRaw) {
    const errorReply = buildSlackReply({ title: null });
    await postSlackReply(botToken, event.channel, errorReply, event.ts);
    return { queued: false };
  }

  let clientId = null;
  let clientName = null;
  let clientResolved = false;
  let assigneeName = null;
  let assigneeResolved = false;
  const warnings = [];
  let title = parsed.title;

  // Resolve client
  if (parsed.clientAbbr) {
    try {
      const client = await resolveClient(dbPool, parsed.clientAbbr);
      if (client) {
        clientId = client.id;
        clientName = client.name;
        clientResolved = true;
      }
    } catch (err) {
      warnings.push('db_error');
    }
  }

  // Resolve assignee
  if (parsed.assigneeRaw) {
    try {
      const result = await resolveAssignee(dbPool, parsed.assigneeRaw);
      if (result.resolved) {
        assigneeName = result.displayName;
        assigneeResolved = true;
      } else {
        // Re-merge "for <name>" back into the title
        const forPhrase = 'for ' + parsed.assigneeRaw;
        if (title) {
          title = title + ' ' + forPhrase;
        } else {
          title = forPhrase;
        }
        if (result.reason !== 'not_found') {
          assigneeName = parsed.assigneeRaw;
          warnings.push('assignee_' + result.reason);
        }
      }
    } catch (err) {
      warnings.push('db_error');
      if (title) {
        title = title + ' for ' + parsed.assigneeRaw;
      } else {
        title = 'for ' + parsed.assigneeRaw;
      }
    }
  }

  if (!title) {
    const errorReply = buildSlackReply({ title: null });
    await postSlackReply(botToken, event.channel, errorReply, event.ts);
    return { queued: false };
  }

  const itemType = (parsed.itemType || 'task').toLowerCase();

  const { rows } = await dbPool.query(
    `INSERT INTO task_queue (title, description, submitted_by, slack_user_id, slack_channel, slack_message_ts, client_id, assignee, item_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [title, parsed.description, `slack:${event.user}`, event.user, event.channel, event.ts,
     clientId, assigneeName, itemType]
  );
  const item = rows[0];

  const reply = buildSlackReply({
    title,
    itemType,
    clientName,
    clientAbbr: parsed.clientAbbr,
    assigneeName: assigneeName || (warnings.includes('assignee_not_found') ? parsed.assigneeRaw : null),
    assigneeResolved,
    clientResolved,
    queueId: item.id,
    warnings,
  });
  await postSlackReply(botToken, event.channel, reply, event.ts);

  return { queued: true, item, warnings };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/slack-bot.test.mjs -t "handleAppMention (enhanced)"`
Expected: All 7 tests PASS.

- [ ] **Step 5: Run the full slack-bot test suite**

Run: `cd dashboard-server && npx vitest run tests/unit/slack-bot.test.mjs`
Expected: All tests PASS (parser, resolvers, builder, handleAppMention, existing signature/reply tests).

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/lib/slack-bot.js dashboard-server/tests/unit/slack-bot.test.mjs
git commit -m "feat(slack): updated handleAppMention with two-pass resolution and rich replies"
```

---

### Task 6: Update Queue Route and Slack Route Wiring

**Files:**
- Modify: `dashboard-server/routes/queue.js:30-37` (INSERT query)
- Modify: `dashboard-server/routes/slack.js` (initialise cache)
- Modify: `dashboard-server/server.js:52,382` (import + ctx changes)

- [ ] **Step 1: Update queue.js POST handler**

In `dashboard-server/routes/queue.js`, update the INSERT query (lines 34-38) and add `item_type` validation:

Replace the existing POST handler body (lines 30-39):

```js
    const { title, description, slack_user_id, slack_channel, slack_message_ts, client_id, assignee, item_type } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
    const lenErr = validateLength(title.trim(), 'title') || (description ? validateLength(description, 'description') : null);
    if (lenErr) return res.status(400).json({ error: lenErr });
    const validTypes = ['project', 'feature', 'story', 'task'];
    const resolvedType = item_type && validTypes.includes(item_type.toLowerCase()) ? item_type.toLowerCase() : 'task';
    const { rows } = await pool.query(
      `INSERT INTO task_queue (title, description, submitted_by, slack_user_id, slack_channel, slack_message_ts, client_id, assignee, item_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title.trim(), description || null, submittedBy, slack_user_id || null, slack_channel || null, slack_message_ts || null,
       client_id || null, assignee || null, resolvedType]
    );
    res.status(201).json(rows[0]);
```

- [ ] **Step 2: Update slack route to initialise abbreviation cache**

Replace `dashboard-server/routes/slack.js` entirely:

```js
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, verifySlackSignature, handleAppMention, loadClientAbbreviations, startAbbreviationRefresh } = ctx;

  // Prime the abbreviation cache at route registration time
  loadClientAbbreviations(pool).catch(err => {
    log('warn', 'Slack', 'Failed to load client abbreviations at startup', { error: err.message });
  });
  startAbbreviationRefresh(pool, 3600000);

  router.post('/api/slack/events', async (req, res) => {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    const timestamp = req.get('x-slack-request-timestamp');
    const signature = req.get('x-slack-signature');

    if (!signingSecret) {
      log('warn', 'Slack', 'SLACK_SIGNING_SECRET not configured');
      return res.status(503).json({ error: 'Slack integration not configured' });
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (req.body?.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }

    res.json({ ok: true });

    const event = req.body?.event;
    if (event?.bot_id || event?.subtype === 'bot_message') return;
    if (event?.type !== 'app_mention' && event?.type !== 'message') return;

    try {
      await handleAppMention(event, pool, process.env.SLACK_BOT_TOKEN || '');
    } catch (err) {
      log('error', 'Slack', 'Failed to handle app_mention', { error: err.message });
    }
  });

  return router;
};
```

- [ ] **Step 3: Update server.js imports and context**

In `dashboard-server/server.js`, update line 52 to import the new exports:

```js
const { verifySlackSignature, handleAppMention, loadClientAbbreviations, startAbbreviationRefresh } = require('./lib/slack-bot');
```

Update line 382 to pass the new functions in context:

```js
app.use(require('./routes/slack')({ pool, log, verifySlackSignature, handleAppMention, loadClientAbbreviations, startAbbreviationRefresh }));
```

- [ ] **Step 4: Run the full test suite**

Run: `cd dashboard-server && npm test`
Expected: All unit tests PASS including existing queue API key tests and the new slack-bot tests.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/routes/queue.js dashboard-server/routes/slack.js dashboard-server/server.js
git commit -m "feat(slack): wire up queue metadata columns and abbreviation cache in routes"
```

---

### Task 7: Integration Tests

**Files:**
- Modify: `dashboard-server/tests/unit/slack-bot.test.mjs` (update existing supertest tests)

- [ ] **Step 1: Update the existing integration test for app_mention**

Find the `POST /api/slack/events` describe block in the test file and update the test "returns 200 and queues item for valid app_mention" to verify metadata:

```js
  it('returns 200 and queues item with metadata for valid app_mention', async () => {
    await truncate();
    // Seed client and user for resolution
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('aris', 'Aris', 'x', 'member', true)");
    // Prime abbreviation cache
    const { loadClientAbbreviations } = require('../../lib/slack-bot');
    await loadClientAbbreviations(pool);

    const body = {
      type: 'event_callback',
      event: {
        type: 'app_mention',
        text: '<@UBOTID> CH task for Aris: New task from Slack\nWith a description',
        user: 'USENDER',
        channel: 'CCHANNEL',
        ts: '111.222',
      },
    };
    const { bodyStr, ts, sig } = buildSignedRequest(body);
    const res = await request(app)
      .post('/api/slack/events')
      .set('Content-Type', 'application/json')
      .set('x-slack-request-timestamp', ts)
      .set('x-slack-signature', sig)
      .send(bodyStr);
    expect(res.status).toBe(200);

    await new Promise(r => setTimeout(r, 300));

    const { rows } = await pool.query('SELECT * FROM task_queue');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('New task from Slack');
    expect(rows[0].slack_user_id).toBe('USENDER');
    expect(rows[0].item_type).toBe('task');
    expect(rows[0].assignee).toBe('Aris');
    expect(rows[0].client_id).toBeDefined();
  });
```

- [ ] **Step 2: Add integration test for POST /api/queue with metadata**

Add to the `POST /api/queue with API key` describe block:

```js
  it('accepts submission with metadata fields', async () => {
    // Seed a client for FK reference
    const { rows: clients } = await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Test Client', 'TC') RETURNING id");
    const clientId = clients[0].id;

    const res = await request(app)
      .post('/api/queue')
      .set('X-API-Key', API_KEY)
      .send({
        title: 'Task with metadata',
        description: 'Has all fields',
        client_id: clientId,
        assignee: 'Glen Pryer',
        item_type: 'feature',
      });
    expect(res.status).toBe(201);
    expect(res.body.client_id).toBe(clientId);
    expect(res.body.assignee).toBe('Glen Pryer');
    expect(res.body.item_type).toBe('feature');
  });

  it('defaults item_type to task when not provided', async () => {
    const res = await request(app)
      .post('/api/queue')
      .set('X-API-Key', API_KEY)
      .send({ title: 'No type specified' });
    expect(res.status).toBe(201);
    expect(res.body.item_type).toBe('task');
  });

  it('rejects invalid item_type and defaults to task', async () => {
    const res = await request(app)
      .post('/api/queue')
      .set('X-API-Key', API_KEY)
      .send({ title: 'Bad type', item_type: 'epic' });
    expect(res.status).toBe(201);
    expect(res.body.item_type).toBe('task');
  });
```

- [ ] **Step 3: Run full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/tests/unit/slack-bot.test.mjs
git commit -m "test(slack): integration tests for metadata in queue route and Slack events"
```

---

### Task 8: Run Full Suite and Deploy

- [ ] **Step 1: Run the complete test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests PASS — no regressions.

- [ ] **Step 2: Run migration on production database**

Run: `cd dashboard-server && npm run init-db`
Expected: Migration 064 applies cleanly.

- [ ] **Step 3: Restart PM2**

Run: `pm2 restart nbi-dashboard`
Expected: Server restarts cleanly, no errors in `pm2 logs nbi-dashboard --lines 20`.

- [ ] **Step 4: Verify server is up**

Run: `curl -s http://localhost:8888/api/queue -H "X-API-Key: $env:QUEUE_API_KEY" | head -c 200`
Expected: Returns JSON array (possibly empty). Confirms the new columns didn't break the GET endpoint.

- [ ] **Step 5: Final commit with all changes**

Only if any unstaged changes remain. Otherwise, verify all previous commits are clean:

Run: `git status`
Expected: Clean working tree.
