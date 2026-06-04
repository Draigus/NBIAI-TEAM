# Meetings Intelligence Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make meetings intelligence editable (full CRUD in Postgres), add task creation from actions, consolidate intelligence into the CC, and remove the standalone Intelligence sidebar page.

**Architecture:** Replace the read-only JSON file with a JSONB-backed `meeting_items` table. The lib rewrites from file-reader to DB CRUD. Frontend gets inline edit forms with optimistic updates. The standalone Intelligence sidebar view merges into the CC Intel tab.

**Tech Stack:** Express 4, PostgreSQL (via `pg`), vanilla JS SPA monolith, Vitest (`.test.mjs`, ESM), Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-06-02-meetings-intelligence-enhancements.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/migrations/061_meeting_items.sql` | Create | DDL for meeting_items + meeting_metadata tables, drop meeting_action_status |
| `dashboard-server/scripts/seed-meeting-items.js` | Create | Import meetings.json into meeting_items, migrate status overrides |
| `dashboard-server/lib/meetings-intelligence.js` | Rewrite | DB-backed CRUD: getAll, create, update, delete, getStats, generateItemId |
| `dashboard-server/routes/meetings-intelligence.js` | Rewrite | POST/PATCH/DELETE endpoints + validation, rewrite GET to use DB |
| `dashboard-server/tests/unit/meetings-intelligence.test.mjs` | Rewrite | DB-backed CRUD tests via supertest |
| `nbi_project_dashboard.html` | Modify | Inline edit forms, add/delete, task creation, sidebar removal, Intel merge |
| `dashboard-server/tests/e2e/meetings-tab.spec.js` | Modify | CRUD + task creation E2E tests |

---

## Task 1: Migration — Create Tables

**Files:**
- Create: `dashboard-server/migrations/061_meeting_items.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 061_meeting_items.sql
-- Meetings intelligence: JSONB-backed CRUD tables, replaces read-only JSON + meeting_action_status

CREATE TABLE IF NOT EXISTS meeting_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL CHECK (section IN ('actions', 'decisions', 'people', 'learnings', 'numbers', 'timeline', 'threads')),
  data JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'compiled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_items_section ON meeting_items(section);

CREATE TABLE IF NOT EXISTS meeting_metadata (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  meeting_count INT NOT NULL DEFAULT 0,
  date_range_start TEXT,
  date_range_end TEXT,
  compiled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Note: `meeting_action_status` is NOT dropped in this SQL — the seed script (Task 2) reads from it first, then drops it after migrating overrides.

- [ ] **Step 2: Restart PM2 to apply migration**

Run: `pm2 restart nbi-dashboard && sleep 4`
Then verify: run a node script checking `SELECT column_name FROM information_schema.columns WHERE table_name='meeting_items'`
Expected: `['id', 'item_id', 'section', 'data', 'source', 'created_at', 'updated_at']`

- [ ] **Step 3: Commit**

```
git add dashboard-server/migrations/061_meeting_items.sql
git commit -m "feat(meetings): add meeting_items + meeting_metadata tables"
```

---

## Task 2: Seed Script — Import JSON + Migrate Overrides

**Files:**
- Create: `dashboard-server/scripts/seed-meeting-items.js`

- [ ] **Step 1: Write the seed script**

```js
// dashboard-server/scripts/seed-meeting-items.js
// One-time import: reads meetings.json, migrates status overrides, populates meeting_items + meeting_metadata.
// Safe to re-run: skips items that already exist (ON CONFLICT DO NOTHING).

'use strict';
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const MEETINGS_JSON = path.resolve(__dirname, '../../intelligence/compiled/meetings.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // 1. Read existing status overrides before we drop the table
  let overrides = new Map();
  try {
    const { rows } = await pool.query('SELECT action_id, status FROM meeting_action_status');
    rows.forEach(r => overrides.set(r.action_id, r.status));
    console.log(`Read ${overrides.size} status overrides from meeting_action_status`);
  } catch {
    console.log('No meeting_action_status table found (already migrated or fresh install)');
  }

  // 2. Read meetings.json
  if (!fs.existsSync(MEETINGS_JSON)) {
    console.log('No meetings.json found — tables created empty.');
    await pool.end();
    return;
  }
  const data = JSON.parse(fs.readFileSync(MEETINGS_JSON, 'utf8'));
  const sections = data.sections || {};

  // 3. Insert all items
  let inserted = 0, skipped = 0;
  const SECTION_NAMES = ['actions', 'decisions', 'people', 'learnings', 'numbers', 'timeline', 'threads'];
  for (const section of SECTION_NAMES) {
    const items = sections[section] || [];
    for (const item of items) {
      const itemId = item.id;
      if (!itemId) { skipped++; continue; }

      // Build data object: everything except the 'id' field (which becomes item_id)
      const itemData = { ...item };
      delete itemData.id;

      // Apply status override for actions
      if (section === 'actions' && overrides.has(itemId)) {
        itemData.status = overrides.get(itemId);
      }

      try {
        await pool.query(
          `INSERT INTO meeting_items (item_id, section, data, source)
           VALUES ($1, $2, $3, 'compiled')
           ON CONFLICT (item_id) DO NOTHING`,
          [itemId, section, JSON.stringify(itemData)]
        );
        inserted++;
      } catch (err) {
        console.error(`Failed to insert ${itemId}:`, err.message);
      }
    }
  }
  console.log(`Inserted ${inserted} items, skipped ${skipped}`);

  // 4. Populate metadata
  await pool.query(
    `INSERT INTO meeting_metadata (id, meeting_count, date_range_start, date_range_end, compiled_at)
     VALUES (1, $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       meeting_count = $1, date_range_start = $2, date_range_end = $3, compiled_at = $4, updated_at = now()`,
    [
      data.meeting_count || 0,
      data.date_range ? data.date_range.start : null,
      data.date_range ? data.date_range.end : null,
      data.compiled_at || null
    ]
  );
  console.log('Metadata populated');

  // 5. Drop old meeting_action_status table
  try {
    await pool.query('DROP TABLE IF EXISTS meeting_action_status');
    console.log('Dropped meeting_action_status table');
  } catch (err) {
    console.log('Could not drop meeting_action_status:', err.message);
  }

  await pool.end();
  console.log('Done.');
}

run().catch(err => { console.error('Seed failed:', err); process.exit(1); });
```

- [ ] **Step 2: Run the seed script**

Run: `cd dashboard-server && node scripts/seed-meeting-items.js`
Expected output:
```
Read N status overrides from meeting_action_status
Inserted ~195 items, skipped 0
Metadata populated
Dropped meeting_action_status table
Done.
```

- [ ] **Step 3: Verify data in DB**

Run a node script:
```js
// Count by section
pool.query("SELECT section, count(*) FROM meeting_items GROUP BY section ORDER BY section")
```
Expected: actions ~56, decisions ~47, people ~24, learnings ~17, numbers ~37, timeline ~9, threads ~5

- [ ] **Step 4: Commit**

```
git add dashboard-server/scripts/seed-meeting-items.js
git commit -m "feat(meetings): seed script imports JSON into meeting_items table"
```

---

## Task 3: Rewrite Lib — DB-Backed CRUD

**Files:**
- Rewrite: `dashboard-server/lib/meetings-intelligence.js`
- Rewrite: `dashboard-server/tests/unit/meetings-intelligence.test.mjs`
- Modify: `dashboard-server/tests/helpers/db.js` (add `meeting_items`, `meeting_metadata` to truncate list)

- [ ] **Step 1: Rewrite the lib**

```js
// dashboard-server/lib/meetings-intelligence.js
'use strict';

const crypto = require('crypto');

const VALID_SECTIONS = ['actions', 'decisions', 'people', 'learnings', 'numbers', 'timeline', 'threads'];

const REQUIRED_FIELDS = {
  actions: ['description', 'status'],
  decisions: ['decision'],
  people: ['name'],
  learnings: ['insight'],
  numbers: ['figure'],
  timeline: ['period', 'label'],
  threads: ['title', 'status']
};

const SECTION_SORT = {
  actions: "data->>'date' DESC NULLS LAST",
  decisions: "data->>'date' DESC NULLS LAST",
  learnings: "data->>'date' DESC NULLS LAST",
  numbers: "data->>'date' DESC NULLS LAST",
  people: "data->>'name' ASC",
  timeline: "created_at ASC",
  threads: "created_at DESC"
};

const SECTION_PREFIX = { actions: 'act', decisions: 'dec', people: 'per', learnings: 'lrn', numbers: 'num', timeline: 'tl', threads: 'thr' };

function generateItemId(section, data) {
  const prefix = SECTION_PREFIX[section] || section.slice(0, 3);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const text = data.description || data.decision || data.name || data.insight || data.figure || data.title || data.label || 'item';
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 4).join('-');
  const rand = crypto.randomBytes(2).toString('hex');
  return `${prefix}_${dateStr}_${slug}_${rand}`;
}

function validateRequired(section, data) {
  const required = REQUIRED_FIELDS[section];
  if (!required) return null;
  const missing = required.filter(f => !data[f] && data[f] !== 0);
  if (missing.length) return `Missing required fields: ${missing.join(', ')}`;
  return null;
}

async function getAll(pool) {
  const { rows: metaRows } = await pool.query('SELECT * FROM meeting_metadata WHERE id = 1');
  const meta = metaRows[0] || { meeting_count: 0, date_range_start: null, date_range_end: null, compiled_at: null };

  const sections = {};
  for (const section of VALID_SECTIONS) {
    const order = SECTION_SORT[section] || 'created_at DESC';
    const { rows } = await pool.query(
      `SELECT item_id, section, data, source, created_at, updated_at FROM meeting_items WHERE section = $1 ORDER BY ${order}`,
      [section]
    );
    sections[section] = rows.map(r => ({ id: r.item_id, source: r.source, ...r.data }));
  }

  return {
    meeting_count: meta.meeting_count,
    date_range: meta.date_range_start ? { start: meta.date_range_start, end: meta.date_range_end } : null,
    compiled_at: meta.compiled_at,
    sections
  };
}

async function getStats(pool) {
  const { rows: metaRows } = await pool.query('SELECT * FROM meeting_metadata WHERE id = 1');
  const meta = metaRows[0] || {};

  const { rows } = await pool.query(`
    SELECT
      count(*) FILTER (WHERE section = 'actions') AS action_count,
      count(*) FILTER (WHERE section = 'actions' AND data->>'status' = 'open') AS open_actions,
      count(*) FILTER (WHERE section = 'actions' AND data->>'status' = 'done') AS done_actions,
      count(*) FILTER (WHERE section = 'actions' AND data->>'status' = 'overdue') AS overdue_actions,
      count(*) FILTER (WHERE section = 'decisions') AS decision_count,
      count(*) FILTER (WHERE section = 'people') AS people_count,
      count(*) FILTER (WHERE section = 'learnings') AS learning_count,
      count(*) FILTER (WHERE section = 'numbers') AS number_count,
      count(*) FILTER (WHERE section = 'threads') AS thread_count
    FROM meeting_items
  `);
  const counts = rows[0] || {};

  return {
    meeting_count: meta.meeting_count || 0,
    date_range: meta.date_range_start ? { start: meta.date_range_start, end: meta.date_range_end } : null,
    compiled_at: meta.compiled_at || null,
    action_count: parseInt(counts.action_count) || 0,
    open_actions: parseInt(counts.open_actions) || 0,
    done_actions: parseInt(counts.done_actions) || 0,
    overdue_actions: parseInt(counts.overdue_actions) || 0,
    decision_count: parseInt(counts.decision_count) || 0,
    people_count: parseInt(counts.people_count) || 0,
    learning_count: parseInt(counts.learning_count) || 0,
    number_count: parseInt(counts.number_count) || 0,
    thread_count: parseInt(counts.thread_count) || 0
  };
}

async function createItem(pool, section, data, itemId) {
  if (!VALID_SECTIONS.includes(section)) throw new Error('Invalid section: ' + section);
  const err = validateRequired(section, data);
  if (err) throw new Error(err);
  const id = itemId || generateItemId(section, data);
  const { rows } = await pool.query(
    `INSERT INTO meeting_items (item_id, section, data, source)
     VALUES ($1, $2, $3, 'manual')
     RETURNING item_id, section, data, source, created_at, updated_at`,
    [id, section, JSON.stringify(data)]
  );
  const r = rows[0];
  return { id: r.item_id, section: r.section, source: r.source, ...r.data };
}

async function updateItem(pool, itemId, dataUpdates) {
  const { rows } = await pool.query(
    `UPDATE meeting_items SET data = data || $2::jsonb, updated_at = now()
     WHERE item_id = $1
     RETURNING item_id, section, data, source, created_at, updated_at`,
    [itemId, JSON.stringify(dataUpdates)]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return { id: r.item_id, section: r.section, source: r.source, ...r.data };
}

async function deleteItem(pool, itemId) {
  const { rowCount } = await pool.query('DELETE FROM meeting_items WHERE item_id = $1', [itemId]);
  return rowCount > 0;
}

module.exports = { getAll, getStats, createItem, updateItem, deleteItem, generateItemId, validateRequired, VALID_SECTIONS, REQUIRED_FIELDS };
```

- [ ] **Step 2: Rewrite the test file**

```js
// dashboard-server/tests/unit/meetings-intelligence.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

async function seedItem(section, itemId, data) {
  await pool.query(
    `INSERT INTO meeting_items (item_id, section, data, source) VALUES ($1, $2, $3, 'compiled')`,
    [itemId, section, JSON.stringify(data)]
  );
}

async function seedMeta(count, start, end, compiled) {
  await pool.query(
    `INSERT INTO meeting_metadata (id, meeting_count, date_range_start, date_range_end, compiled_at)
     VALUES (1, $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET meeting_count=$1, date_range_start=$2, date_range_end=$3, compiled_at=$4`,
    [count, start, end, compiled]
  );
}

describe('meetings-intelligence CRUD', () => {
  let token;
  beforeEach(async () => {
    const user = await createTestUser({ role: 'admin' });
    token = await mintSession(user.id);
  });

  it('GET /api/meetings/compiled returns empty when no data', async () => {
    const res = await request(app)
      .get('/api/meetings/compiled')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.sections.actions).toEqual([]);
    expect(res.body.meeting_count).toBe(0);
  });

  it('GET /api/meetings/compiled returns seeded data', async () => {
    await seedMeta(3, '2026-03-06', '2026-05-22', '2026-06-01T12:00:00Z');
    await seedItem('actions', 'act_test_1', { date: '2026-05-21', description: 'Test action', status: 'open', workstream: 'nbi' });
    await seedItem('decisions', 'dec_test_1', { date: '2026-05-20', decision: 'Test decision', workstream: 'nbi' });

    const res = await request(app)
      .get('/api/meetings/compiled')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.meeting_count).toBe(3);
    expect(res.body.sections.actions).toHaveLength(1);
    expect(res.body.sections.actions[0].id).toBe('act_test_1');
    expect(res.body.sections.actions[0].description).toBe('Test action');
    expect(res.body.sections.decisions).toHaveLength(1);
  });

  it('POST /api/meetings/items creates an item', async () => {
    const res = await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'actions', data: { description: 'New action', status: 'open' } })
      .expect(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.description).toBe('New action');
    expect(res.body.source).toBe('manual');
  });

  it('POST /api/meetings/items validates required fields', async () => {
    await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'actions', data: { description: 'Missing status' } })
      .expect(400);
  });

  it('POST /api/meetings/items rejects invalid section', async () => {
    await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'invalid', data: { x: 1 } })
      .expect(400);
  });

  it('PATCH /api/meetings/items/:id updates fields', async () => {
    await seedItem('actions', 'act_patch_test', { description: 'Original', status: 'open', workstream: 'nbi' });

    const res = await request(app)
      .patch('/api/meetings/items/act_patch_test')
      .set('Cookie', `nbi_session=${token}`)
      .send({ data: { status: 'done' } })
      .expect(200);
    expect(res.body.status).toBe('done');
    expect(res.body.description).toBe('Original');
  });

  it('PATCH /api/meetings/items/:id returns 404 for missing item', async () => {
    await request(app)
      .patch('/api/meetings/items/nonexistent')
      .set('Cookie', `nbi_session=${token}`)
      .send({ data: { status: 'done' } })
      .expect(404);
  });

  it('DELETE /api/meetings/items/:id removes item', async () => {
    await seedItem('actions', 'act_del_test', { description: 'To delete', status: 'open' });

    await request(app)
      .delete('/api/meetings/items/act_del_test')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    const { rows } = await pool.query("SELECT * FROM meeting_items WHERE item_id = 'act_del_test'");
    expect(rows).toHaveLength(0);
  });

  it('DELETE /api/meetings/items/:id returns 404 for missing item', async () => {
    await request(app)
      .delete('/api/meetings/items/nonexistent')
      .set('Cookie', `nbi_session=${token}`)
      .expect(404);
  });

  it('GET /api/meetings/stats returns correct counts', async () => {
    await seedMeta(10, '2026-03-06', '2026-05-22', null);
    await seedItem('actions', 'a1', { description: 'A1', status: 'open' });
    await seedItem('actions', 'a2', { description: 'A2', status: 'done' });
    await seedItem('decisions', 'd1', { decision: 'D1' });

    const res = await request(app)
      .get('/api/meetings/stats')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.meeting_count).toBe(10);
    expect(res.body.action_count).toBe(2);
    expect(res.body.open_actions).toBe(1);
    expect(res.body.done_actions).toBe(1);
    expect(res.body.decision_count).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail (lib not yet wired to routes)**

Run: `cd dashboard-server && npx vitest run tests/unit/meetings-intelligence.test.mjs`
Expected: Some tests may pass (the lib functions work), but routes still use old code.

- [ ] **Step 4: Commit lib + tests**

```
git add dashboard-server/lib/meetings-intelligence.js dashboard-server/tests/unit/meetings-intelligence.test.mjs
git commit -m "feat(meetings): rewrite lib for DB-backed CRUD with tests"
```

---

## Task 4: Rewrite Routes — Full CRUD API

**Files:**
- Rewrite: `dashboard-server/routes/meetings-intelligence.js`

- [ ] **Step 1: Rewrite the routes file**

```js
// dashboard-server/routes/meetings-intelligence.js
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { requireNBI, pool } = ctx;
  const mi = require('../lib/meetings-intelligence');

  router.get('/api/meetings/compiled', requireNBI, async (req, res) => {
    try {
      const data = await mi.getAll(pool);
      res.json(data);
    } catch (err) {
      console.error('meetings compiled error:', err);
      res.status(500).json({ error: 'Failed to load meetings data' });
    }
  });

  router.get('/api/meetings/stats', requireNBI, async (req, res) => {
    try {
      const stats = await mi.getStats(pool);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load stats' });
    }
  });

  router.post('/api/meetings/items', requireNBI, async (req, res) => {
    const { section, item_id, data } = req.body;
    if (!section || !data) return res.status(400).json({ error: 'section and data are required' });
    if (!mi.VALID_SECTIONS.includes(section)) return res.status(400).json({ error: 'Invalid section: ' + section });
    const valErr = mi.validateRequired(section, data);
    if (valErr) return res.status(400).json({ error: valErr });
    try {
      const item = await mi.createItem(pool, section, data, item_id || undefined);
      res.status(201).json(item);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Item ID already exists' });
      console.error('meetings create error:', err);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  router.patch('/api/meetings/items/:item_id', requireNBI, async (req, res) => {
    const { item_id } = req.params;
    const { data } = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data object is required' });
    try {
      const updated = await mi.updateItem(pool, item_id, data);
      if (!updated) return res.status(404).json({ error: 'Item not found' });
      res.json(updated);
    } catch (err) {
      console.error('meetings update error:', err);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  router.delete('/api/meetings/items/:item_id', requireNBI, async (req, res) => {
    try {
      const deleted = await mi.deleteItem(pool, req.params.item_id);
      if (!deleted) return res.status(404).json({ error: 'Item not found' });
      res.json({ ok: true });
    } catch (err) {
      console.error('meetings delete error:', err);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  return router;
};
```

- [ ] **Step 2: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/meetings-intelligence.test.mjs`
Expected: All tests PASS.

- [ ] **Step 3: Restart PM2 and verify API**

Run: `pm2 restart nbi-dashboard && sleep 4`
Then: hit `GET /api/meetings/compiled` (via curl or browser) — should return DB-backed data.

- [ ] **Step 4: Commit**

```
git add dashboard-server/routes/meetings-intelligence.js
git commit -m "feat(meetings): rewrite routes for full CRUD API"
```

---

## Task 5: Frontend — Inline Editing Forms

**Files:**
- Modify: `nbi_project_dashboard.html`

This is the largest frontend task. It adds:
- Edit (pencil) icon on every item
- Inline edit forms for all 7 section types
- Save/Cancel with optimistic update
- Delete with confirmation
- "+ Add" button on each sub-tab
- "Manual" badge for user-added items

- [ ] **Step 1: Add CSS for edit forms**

Find the existing Meetings Intelligence CSS block (search for `/* Meetings Intelligence Tab */`) and add after the existing meetings CSS:

```css
/* Meetings Intelligence — Edit Forms */
.cc-mtg-edit-row { background:var(--bg-surface); border:1px solid var(--border-default); border-radius:6px; padding:10px 14px; margin-bottom:8px; }
.cc-mtg-edit-row input, .cc-mtg-edit-row select, .cc-mtg-edit-row textarea { background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border-default); border-radius:4px; padding:5px 8px; font-size:14px; font-family:inherit; width:100%; box-sizing:border-box; margin-bottom:6px; }
.cc-mtg-edit-row textarea { min-height:60px; resize:vertical; }
.cc-mtg-edit-row label { font-size:12px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px; display:block; margin-bottom:2px; }
.cc-mtg-edit-actions { display:flex; gap:6px; margin-top:8px; align-items:center; }
.cc-mtg-edit-actions .cc-btn-sm { min-width:60px; }
.cc-mtg-edit-actions .del { color:var(--danger); cursor:pointer; font-size:12px; margin-left:auto; }
.cc-mtg-edit-actions .del:hover { text-decoration:underline; }
.cc-mtg-add-btn { margin-bottom:12px; }
.cc-mtg-badge { font-size:10px; font-weight:700; padding:1px 6px; border-radius:3px; background:rgba(188,140,255,0.15); color:var(--purple); margin-left:6px; vertical-align:middle; }
.cc-mtg-edit-icon { cursor:pointer; opacity:0.4; font-size:13px; margin-left:6px; transition:opacity .15s; }
.cc-mtg-edit-icon:hover { opacity:1; }
.cc-mtg-task-icon { cursor:pointer; opacity:0.5; font-size:14px; margin-left:4px; transition:opacity .15s; }
.cc-mtg-task-icon:hover { opacity:1; color:var(--accent); }
```

- [ ] **Step 2: Add edit form generator functions**

After the existing `_mtgRenderThreads` function (search for `// ==================== EMBEDDED CLAUDE CHAT`), add before that comment:

```js
// ——— MEETINGS EDIT FORMS ———
var _mtgEditingId = null;
var _mtgAddingSection = null;

function _mtgFieldHtml(label, name, value, type, options) {
  var h = '<label>' + esc(label) + '</label>';
  if (type === 'select' && options) {
    h += '<select data-field="' + name + '">';
    options.forEach(function(o) {
      h += '<option value="' + esc(o) + '"' + (value === o ? ' selected' : '') + '>' + esc(o) + '</option>';
    });
    h += '</select>';
  } else if (type === 'textarea') {
    h += '<textarea data-field="' + name + '">' + esc(value || '') + '</textarea>';
  } else {
    h += '<input type="text" data-field="' + name + '" value="' + esc(value || '') + '">';
  }
  return h;
}

function _mtgEditFormFields(section, data) {
  var h = '';
  if (section === 'actions') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Owner', 'owner', data.owner, 'text');
    h += _mtgFieldHtml('Description', 'description', data.description, 'text');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ['couch_heroes','lighthouse','nbi','sarge','playgoals']);
    h += _mtgFieldHtml('Status', 'status', data.status, 'select', ['open','done','overdue']);
  } else if (section === 'decisions') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Decision', 'decision', data.decision, 'text');
    h += _mtgFieldHtml('Rationale', 'rationale', data.rationale, 'text');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ['couch_heroes','lighthouse','nbi','sarge','playgoals']);
  } else if (section === 'people') {
    h += _mtgFieldHtml('Name', 'name', data.name, 'text');
    h += _mtgFieldHtml('Role', 'role', data.role, 'text');
    h += _mtgFieldHtml('Workstream', 'workstream', (data.workstreams || []).join(', '), 'text');
    h += _mtgFieldHtml('Notes (one per line)', 'notes', (data.notes || []).join('\n'), 'textarea');
  } else if (section === 'learnings') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Insight', 'insight', data.insight, 'text');
    h += _mtgFieldHtml('Context', 'context', data.context, 'textarea');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ['couch_heroes','lighthouse','nbi','sarge','playgoals']);
  } else if (section === 'numbers') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Figure', 'figure', data.figure, 'text');
    h += _mtgFieldHtml('Context', 'context', data.context, 'text');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ['couch_heroes','lighthouse','nbi','sarge','playgoals']);
    h += _mtgFieldHtml('Category', 'category', data.category, 'select', ['revenue','compensation','investment','cost','metric']);
  } else if (section === 'timeline') {
    h += _mtgFieldHtml('Period', 'period', data.period, 'text');
    h += _mtgFieldHtml('Label', 'label', data.label, 'text');
    h += _mtgFieldHtml('Summary', 'summary', data.summary, 'textarea');
  } else if (section === 'threads') {
    h += _mtgFieldHtml('Title', 'title', data.title, 'text');
    h += _mtgFieldHtml('Status', 'status', data.status, 'select', ['active','resolved']);
    h += _mtgFieldHtml('Summary', 'summary', data.summary, 'textarea');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ['couch_heroes','lighthouse','nbi','sarge','playgoals']);
  }
  return h;
}

function _mtgReadFormData(formEl) {
  var data = {};
  formEl.querySelectorAll('[data-field]').forEach(function(el) {
    var key = el.getAttribute('data-field');
    var val = el.value;
    if (key === 'notes') {
      data[key] = val.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
    } else if (key === 'workstream' && _mtgSubTab === 'people') {
      data.workstreams = val.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
    } else {
      data[key] = val;
    }
  });
  return data;
}

function _mtgStartEdit(itemId) {
  _mtgEditingId = itemId;
  _mtgAddingSection = null;
  _mtgRender();
}

function _mtgCancelEdit() {
  _mtgEditingId = null;
  _mtgAddingSection = null;
  _mtgRender();
}

function _mtgSaveEdit(itemId) {
  var formEl = document.getElementById('mtgEditForm_' + itemId.replace(/[^a-zA-Z0-9]/g, '_'));
  if (!formEl) return;
  var data = _mtgReadFormData(formEl);
  // Optimistic update
  if (_mtgData && _mtgData.sections) {
    var section = _mtgSubTab;
    var arr = _mtgData.sections[section] || [];
    var item = arr.find(function(a) { return a.id === itemId; });
    if (item) Object.assign(item, data);
  }
  _mtgEditingId = null;
  _mtgRender();
  authFetch('/api/meetings/items/' + encodeURIComponent(itemId), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: data })
  }).then(function(r) {
    if (!r.ok) { toast('Failed to save edit', 'error'); _mtgFetchAll(); }
  });
}

function _mtgStartAdd() {
  _mtgAddingSection = _mtgSubTab;
  _mtgEditingId = null;
  _mtgRender();
}

function _mtgSaveAdd() {
  var formEl = document.getElementById('mtgAddForm');
  if (!formEl) return;
  var data = _mtgReadFormData(formEl);
  var section = _mtgAddingSection;
  _mtgAddingSection = null;
  authFetch('/api/meetings/items', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: section, data: data })
  }).then(function(r) {
    if (!r.ok) { toast('Failed to add item', 'error'); return; }
    return r.json();
  }).then(function(item) {
    if (!item) return;
    if (_mtgData && _mtgData.sections) {
      if (!_mtgData.sections[section]) _mtgData.sections[section] = [];
      _mtgData.sections[section].unshift(item);
    }
    _mtgRender();
  });
}

function _mtgDeleteItem(itemId) {
  if (!confirm('Delete this item?')) return;
  if (_mtgData && _mtgData.sections) {
    var section = _mtgSubTab;
    _mtgData.sections[section] = (_mtgData.sections[section] || []).filter(function(a) { return a.id !== itemId; });
  }
  _mtgEditingId = null;
  _mtgRender();
  authFetch('/api/meetings/items/' + encodeURIComponent(itemId), { method: 'DELETE' }).then(function(r) {
    if (!r.ok) { toast('Failed to delete', 'error'); _mtgFetchAll(); }
  });
}

function _mtgEditFormHtml(itemId, section, data) {
  var safeId = itemId ? itemId.replace(/[^a-zA-Z0-9]/g, '_') : 'new';
  var h = '<div class="cc-mtg-edit-row" id="mtgEditForm_' + safeId + '">';
  h += _mtgEditFormFields(section, data);
  h += '<div class="cc-mtg-edit-actions">';
  if (itemId) {
    h += '<button class="cc-btn-sm" onclick="_mtgSaveEdit(\'' + esc(itemId) + '\')">Save</button>';
    h += '<button class="cc-btn-sm" onclick="_mtgCancelEdit()">Cancel</button>';
    h += '<span class="del" onclick="_mtgDeleteItem(\'' + esc(itemId) + '\')">Delete</span>';
  } else {
    h += '<button class="cc-btn-sm" onclick="_mtgSaveAdd()">Save</button>';
    h += '<button class="cc-btn-sm" onclick="_mtgCancelEdit()">Cancel</button>';
  }
  h += '</div></div>';
  return h;
}
```

- [ ] **Step 3: Update all 7 renderers to include edit icons and inline forms**

Replace the `_mtgRenderActions` function (and similarly update all other renderers). The pattern for each renderer:
1. Add "+ Add" button at top
2. If `_mtgAddingSection === thisSection`, show blank edit form
3. For each item, if `_mtgEditingId === item.id`, show edit form instead of display row
4. Otherwise show the normal display with a pencil edit icon and source badge

Example — replace `_mtgRenderActions`:

```js
function _mtgRenderActions(actions) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Action</button>';
  if (_mtgAddingSection === 'actions') {
    h += _mtgEditFormHtml(null, 'actions', { date: new Date().toISOString().slice(0, 10), status: 'open', workstream: 'nbi' });
  }
  if (!actions.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No actions match your filters.</div>';
  h += '<table class="cc-tbl"><thead><tr><th>Date</th><th>Owner</th><th>Action</th><th>Workstream</th><th>Status</th><th></th></tr></thead><tbody>';
  actions.forEach(function(a) {
    if (_mtgEditingId === a.id) {
      h += '<tr><td colspan="6">' + _mtgEditFormHtml(a.id, 'actions', a) + '</td></tr>';
      return;
    }
    var cls = a.status === 'done' ? 'cc-tag--green' : a.status === 'overdue' ? 'cc-tag--red' : 'cc-tag--yellow';
    h += '<tr><td style="white-space:nowrap">' + esc(a.date || '') + '</td>';
    h += '<td>' + esc(a.owner || '') + '</td>';
    h += '<td>' + esc(a.description || '') + (a.source === 'manual' ? '<span class="cc-mtg-badge">Manual</span>' : '') + '</td>';
    h += '<td><span class="cc-tag cc-tag--blue">' + esc((a.workstream || '').replace(/_/g, ' ')) + '</span></td>';
    h += '<td><span class="cc-tag ' + cls + '" style="cursor:pointer" onclick="_mtgCycleStatus(\'' + esc(a.id) + '\',\'' + esc(a.status) + '\')">' + esc(a.status) + '</span></td>';
    h += '<td><span class="cc-mtg-edit-icon" onclick="_mtgStartEdit(\'' + esc(a.id) + '\')" title="Edit">&#9998;</span>';
    h += '<span class="cc-mtg-task-icon" onclick="_mtgCreateTask(\'' + esc(a.id) + '\')" title="Create task">&#128203;</span></td></tr>';
  });
  h += '</tbody></table>';
  return h;
}
```

Apply the same pattern to all other renderers (`_mtgRenderDecisions`, `_mtgRenderPeople`, `_mtgRenderLearnings`, `_mtgRenderNumbers`, `_mtgRenderTimeline`, `_mtgRenderThreads`):
- Add "+ Add [Type]" button at top
- Show add form if `_mtgAddingSection` matches
- Show edit form if `_mtgEditingId` matches
- Add pencil icon to each item (no task icon except on actions)
- Add "Manual" badge for `source === 'manual'`

- [ ] **Step 4: Update `_mtgCycleStatus` to use the new PATCH endpoint**

Replace the existing `_mtgCycleStatus`:

```js
function _mtgCycleStatus(id, current) {
  var next = current === 'open' ? 'done' : current === 'done' ? 'overdue' : 'open';
  if (_mtgData && _mtgData.sections) {
    var a = _mtgData.sections.actions.find(function(x) { return x.id === id; });
    if (a) a.status = next;
    _mtgRender();
  }
  authFetch('/api/meetings/items/' + encodeURIComponent(id), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { status: next } })
  }).then(function(r) {
    if (!r.ok) { toast('Failed to update status', 'error'); _mtgFetchAll(); }
  });
}
```

- [ ] **Step 5: Verify in browser**

Restart PM2: `pm2 restart nbi-dashboard`
Open CC > Meetings. Verify:
- Pencil icons appear on all items
- Clicking pencil shows inline edit form
- Save/Cancel work
- "+ Add" button shows blank form
- Delete works with confirmation
- "Manual" badge appears on manually added items

- [ ] **Step 6: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(meetings): inline edit, add, delete for all 7 section types"
```

---

## Task 6: Frontend — Task Creation from Actions

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add `_mtgCreateTask` function and parent picker**

Add after the `_mtgDeleteItem` function:

```js
// ——— TASK CREATION FROM ACTIONS ———
var _WS_CLIENT_MAP = null;
function _mtgResolveClient(workstream) {
  if (!_WS_CLIENT_MAP) {
    _WS_CLIENT_MAP = {};
    var allClients = typeof getAllClients === 'function' ? getAllClients() : [];
    allClients.forEach(function(c) {
      var slug = c.toLowerCase().replace(/\s+/g, '_');
      _WS_CLIENT_MAP[slug] = c;
    });
  }
  return _WS_CLIENT_MAP[workstream] || null;
}

function _mtgCreateTask(actionId) {
  var action = null;
  if (_mtgData && _mtgData.sections && _mtgData.sections.actions) {
    action = _mtgData.sections.actions.find(function(a) { return a.id === actionId; });
  }
  if (!action) { toast('Action not found', 'error'); return; }

  var client = _mtgResolveClient(action.workstream || '');
  if (!client) {
    _pickClient('Select client for this task').then(function(c) {
      if (c) _mtgDoCreateTask(action, c);
    });
    return;
  }
  _mtgDoCreateTask(action, client);
}

function _mtgDoCreateTask(action, client) {
  // Find parent candidates for this client
  var candidates = tasks.filter(function(t) {
    return getTaskClient(t) === client && ['project', 'feature', 'story'].indexOf(getItemType(t)) >= 0;
  }).sort(function(a, b) { return a.title.localeCompare(b.title); });

  if (candidates.length === 0) {
    // No parents — create as top-level task
    var t = createTaskObject({
      title: action.description || 'Meeting action',
      client: client,
      itemType: 'task',
      description: 'From meeting intelligence: ' + (action.date || '') + ' — ' + (action.owner || '')
    });
    tasks.push(t);
    markDirty(t.id);
    save(); renderSidebarCounts(); renderContent();
    openDetail(t.id);
    _mtgMarkActionDone(action.id);
    return;
  }

  // Show picker modal
  var html = '<div class="modal-overlay open" id="mtgParentPickerModal" role="dialog" aria-modal="true" onclick="if(event.target===this)this.remove()">';
  html += '<div class="modal" style="max-width:500px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  html += '<h2 style="margin:0">Create task under...</h2>';
  html += '<button class="btn btn--ghost" onclick="document.getElementById(\'mtgParentPickerModal\').remove()">&times;</button></div>';
  html += '<div style="max-height:400px;overflow-y:auto;border:1px solid var(--border-default);border-radius:6px">';
  candidates.forEach(function(c) {
    var indent = getItemType(c) === 'project' ? 0 : getItemType(c) === 'feature' ? 1 : 2;
    html += '<div class="picker-row" style="padding-left:' + (12 + indent * 16) + 'px;cursor:pointer" onclick="_mtgFinishCreateTask(\'' + esc(action.id) + '\',\'' + esc(c.id) + '\',\'' + esc(client) + '\')">';
    html += '<span style="font-size:11px;color:var(--text-secondary);margin-right:6px">' + esc(getItemType(c)) + '</span> ' + esc(c.title);
    html += '</div>';
  });
  html += '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function _mtgFinishCreateTask(actionId, parentId, client) {
  var modal = document.getElementById('mtgParentPickerModal');
  if (modal) modal.remove();

  var action = _mtgData.sections.actions.find(function(a) { return a.id === actionId; });
  if (!action) return;

  var t = createTaskObject({
    title: action.description || 'Meeting action',
    parentId: parentId,
    client: client,
    itemType: 'task',
    description: 'From meeting intelligence: ' + (action.date || '') + ' — ' + (action.owner || '')
  });
  tasks.push(t);
  markDirty(t.id);
  save(); renderSidebarCounts(); renderContent();
  openDetail(t.id);
  _mtgMarkActionDone(actionId);
}

function _mtgMarkActionDone(actionId) {
  if (_mtgData && _mtgData.sections) {
    var a = _mtgData.sections.actions.find(function(x) { return x.id === actionId; });
    if (a) a.status = 'done';
  }
  authFetch('/api/meetings/items/' + encodeURIComponent(actionId), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { status: 'done' } })
  });
}
```

The task icon was already added in `_mtgRenderActions` (Task 5, Step 3) via the clipboard icon calling `_mtgCreateTask`.

- [ ] **Step 2: Verify task creation**

Restart PM2. Open CC > Meetings > Actions tab. Click the clipboard icon on an action. Verify:
- Parent picker appears with projects/features/stories for that client
- Selecting a parent creates a task and opens its detail panel
- Action status changes to "done"

- [ ] **Step 3: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(meetings): task creation from actions with parent picker"
```

---

## Task 7: Intelligence Consolidation

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Remove sidebar Intelligence tab**

At line ~5810, change:
```js
const tabs = ['dashboard', 'tasks', 'workload', 'people', 'leads', 'expenses', 'finances', 'news', 'intelligence', 'settings'];
```
to:
```js
const tabs = ['dashboard', 'tasks', 'workload', 'people', 'leads', 'expenses', 'finances', 'news', 'settings'];
```

Also remove the labels entry — change:
```js
const labels = { dashboard: 'Portfolio', tasks: 'Projects', workload: 'Workload', report: 'Report', people: 'People', leads: 'Leads', expenses: 'Expenses', finances: 'Finances', news: 'News', intelligence: 'Intelligence', settings: 'Settings' };
```
to:
```js
const labels = { dashboard: 'Portfolio', tasks: 'Projects', workload: 'Workload', report: 'Report', people: 'People', leads: 'Leads', expenses: 'Expenses', finances: 'Finances', news: 'News', settings: 'Settings' };
```

Remove the permission check at line ~5816:
```js
if (t === 'intelligence') return _currentUser && _currentUser.role === 'admin';
```

Remove the rendering branch at line ~5970:
```js
else if (currentView === 'intelligence') renderIntelligenceView(content);
```

- [ ] **Step 2: Remove `renderIntelligenceView` function**

Delete the function at lines ~28554-28612 (the entire `function renderIntelligenceView(container) { ... }` block).

- [ ] **Step 3: Enhance CC Intel tab with full bank health, pipeline, and pending**

The CC Intel tab (`_ccRenderIntelTab` at line ~23661) already fetches banks and pipeline data. It shows a summary bank table but missing: shelf life column, last compiled column, and the full KPI strip. It also doesn't show pending items.

Update `_ccRenderIntelTab` to add these sections. The standalone view's bank table rendering (now deleted) had the fuller columns. Add them to the CC Intel tab's bank table: add `<th>Last Compiled</th><th>Shelf Life</th>` columns and their `<td>` cells.

Also add a Pending section after Pipeline:
```js
if (pipeline && pipeline.pending && pipeline.pending.length) {
  h += '<div class="cc-intel-pipeline"><div class="cc-intel-hdr"><span class="cc-intel-title">Pending Actions</span><span class="cc-intel-count">(' + pipeline.pending.length + ')</span></div>';
  h += '<div style="padding:12px 16px">';
  pipeline.pending.forEach(function(p) {
    h += '<div style="padding:6px 0;font-size:13px;color:var(--text-secondary);border-bottom:1px solid rgba(42,46,61,0.4)">' + p + '</div>';
  });
  h += '</div></div>';
}
```

- [ ] **Step 4: Verify**

Restart PM2. Verify:
- Intelligence tab no longer appears in the sidebar
- CC > Intel tab shows full bank health table, pipeline activity, and pending items
- All existing CC tabs still work

- [ ] **Step 5: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(intel): consolidate intelligence into CC, remove sidebar page"
```

---

## Task 8: E2E Tests

**Files:**
- Modify: `dashboard-server/tests/e2e/meetings-tab.spec.js`

- [ ] **Step 1: Update E2E tests for CRUD**

Replace the E2E test file:

```js
const { test, expect } = require('@playwright/test');
const { createTestUser } = require('../helpers/fixtures');
const { mintSession } = require('../helpers/auth');

test.describe('Meetings Intelligence CRUD', () => {

  test('create, read, update, delete an item', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    // Create
    const create = await request.post('/api/meetings/items', {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { section: 'actions', data: { description: 'E2E test action', status: 'open', workstream: 'nbi' } },
    });
    expect(create.status()).toBe(201);
    const item = await create.json();
    expect(item.id).toBeTruthy();
    expect(item.description).toBe('E2E test action');

    // Read
    const read = await request.get('/api/meetings/compiled', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(read.status()).toBe(200);
    const compiled = await read.json();
    expect(compiled.sections.actions.some(a => a.id === item.id)).toBe(true);

    // Update
    const update = await request.patch('/api/meetings/items/' + item.id, {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { data: { status: 'done' } },
    });
    expect(update.status()).toBe(200);
    const updated = await update.json();
    expect(updated.status).toBe('done');

    // Delete
    const del = await request.delete('/api/meetings/items/' + item.id, {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(del.status()).toBe(200);
  });

  test('rejects invalid section', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const res = await request.post('/api/meetings/items', {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { section: 'bogus', data: { x: 1 } },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects missing required fields', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const res = await request.post('/api/meetings/items', {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { section: 'actions', data: { description: 'no status field' } },
    });
    expect(res.status()).toBe(400);
  });

  test('stats endpoint returns counts', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const res = await request.get('/api/meetings/stats', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    expect(res.status()).toBe(200);
    const stats = await res.json();
    expect(typeof stats.action_count).toBe('number');
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `cd dashboard-server && npx playwright test --config tests/e2e/playwright.config.js tests/e2e/meetings-tab.spec.js`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```
git add dashboard-server/tests/e2e/meetings-tab.spec.js
git commit -m "test(meetings): update E2E tests for CRUD operations"
```

---

## Task 9: Full Verification

- [ ] **Step 1: Run full unit test suite**

Run: `cd dashboard-server && npx vitest run`
Expected: All tests pass including new meetings-intelligence tests. No regressions.

- [ ] **Step 2: Run E2E suite (meetings only)**

Run: `cd dashboard-server && npx playwright test --config tests/e2e/playwright.config.js tests/e2e/meetings-tab.spec.js`
Expected: All tests pass.

- [ ] **Step 3: Restart PM2 and visual check**

Run: `pm2 restart nbi-dashboard`
Open http://localhost:8888/nbi_project_dashboard.html

Verify:
1. CC > Meetings: all 7 sub-tabs render data from DB
2. Edit: click pencil, modify a field, save — data persists on page refresh
3. Add: click "+ Add", fill form, save — new item appears with "Manual" badge
4. Delete: edit an item, click Delete, confirm — item removed
5. Task creation: click clipboard icon on action, pick parent, task created, action marked done
6. CC > Intel: bank health table, pipeline activity, pending items all show
7. Sidebar: Intelligence tab no longer visible
8. All other CC tabs (Work, Pipeline, Money, AIOS, Comms) unaffected

- [ ] **Step 4: Final PM2 restart**

Run: `pm2 restart nbi-dashboard`

---

## Summary

| Task | What | Key Detail |
|---|---|---|
| 1 | DB migration | meeting_items + meeting_metadata tables |
| 2 | Seed script | Import JSON, migrate status overrides, drop old table |
| 3 | Lib rewrite | DB-backed CRUD: getAll, create, update, delete, getStats |
| 4 | Routes rewrite | POST/PATCH/DELETE endpoints with validation |
| 5 | Frontend editing | Inline edit forms, add/delete, optimistic updates, Manual badge |
| 6 | Task creation | Parent picker, workstream→client mapping, auto-mark done |
| 7 | Intel consolidation | Remove sidebar page, merge bank/pipeline/pending into CC Intel |
| 8 | E2E tests | CRUD lifecycle + validation tests |
| 9 | Verification | Full test suite + visual check |
