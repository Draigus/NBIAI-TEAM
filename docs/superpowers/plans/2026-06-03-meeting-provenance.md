# Meeting Provenance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link every meeting intelligence item to its source meeting record, with a slide-over panel showing full meeting context and a Sources sub-tab browsing all 112 meetings.

**Architecture:** Meeting records stored as `section = 'meetings'` in the existing `meeting_items` table. Items linked via `source_meeting_id` in their JSONB data. LLM-assisted backfill for the 133 items with ambiguous date matches. Slide-over panel overlays current view without navigation. Sources sub-tab as 8th tab with same CRUD patterns.

**Tech Stack:** Express 4, PostgreSQL (via `pg`), vanilla JS SPA monolith, Vitest (`.test.mjs`, ESM), Playwright E2E, Anthropic SDK for LLM backfill.

**Spec:** `docs/superpowers/specs/2026-06-03-meeting-provenance.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `dashboard-server/migrations/063_meetings_section.sql` | Create | ALTER CHECK constraint + source_id partial unique index |
| `dashboard-server/scripts/seed-meeting-records.js` | Create | Phase 1: import 112 Granola extracts. Phase 2: LLM backfill. Phase 3: people linkage |
| `dashboard-server/lib/meetings-intelligence.js` | Modify | Add 'meetings' to constants, fix generateItemId, add meeting_record_count to getStats |
| `nbi_project_dashboard.html` | Modify | Provenance chips, slide-over panel, Sources sub-tab, CSS |
| `dashboard-server/tests/unit/meetings-intelligence.test.mjs` | Modify | Add meetings section tests |
| `dashboard-server/tests/e2e/meetings-tab.spec.js` | Modify | Add meeting record CRUD test |

### Granola Extract Formats (two patterns the seed script must handle)

**Pattern A (old, ~10% of files, March 26-27):** Frontmatter has `meeting_id`, `title`, `date`, `participants`, `domain`, `client`.

**Pattern B (new, ~90% of files, March 27+):** Frontmatter has `source_id`, `source_path`, `ingested`, `topics_detected`, `sensitivity_class`, `extract_type`. Title from H1 heading. Date from filename prefix. Participants parsed from `## Context` section.

---

## Task 1: Migration 062 — Extend CHECK Constraint

**Files:**
- Create: `dashboard-server/migrations/063_meetings_section.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 063_meetings_section.sql
-- Allow 'meetings' as a section type + prevent duplicate Granola imports

ALTER TABLE meeting_items DROP CONSTRAINT meeting_items_section_check;
ALTER TABLE meeting_items ADD CONSTRAINT meeting_items_section_check
  CHECK (section IN ('actions','decisions','people','learnings','numbers','timeline','threads','meetings'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_items_source_id
  ON meeting_items((data->>'source_id'))
  WHERE section = 'meetings' AND data->>'source_id' IS NOT NULL;
```

- [ ] **Step 2: Apply migration**

Run: `pm2 restart nbi-dashboard && sleep 5`
Then verify with a script:
```js
// Verify CHECK constraint includes 'meetings'
pool.query("SELECT conname, consrc FROM pg_constraint WHERE conname = 'meeting_items_section_check'")
```

- [ ] **Step 3: Commit**

```
git add dashboard-server/migrations/063_meetings_section.sql
git commit -m "feat(meetings): migration 062 — allow meetings section type"
```

---

## Task 2: Lib Updates — Add Meetings to Constants

**Files:**
- Modify: `dashboard-server/lib/meetings-intelligence.js`

- [ ] **Step 1: Add 'meetings' to VALID_SECTIONS (line 5)**

Change:
```js
const VALID_SECTIONS = ['actions', 'decisions', 'people', 'learnings', 'numbers', 'timeline', 'threads'];
```
to:
```js
const VALID_SECTIONS = ['actions', 'decisions', 'people', 'learnings', 'numbers', 'timeline', 'threads', 'meetings'];
```

- [ ] **Step 2: Add meetings to REQUIRED_FIELDS (line 14)**

After `threads: ['title', 'status']` add:
```js
  threads: ['title', 'status'],
  meetings: ['title', 'date']
```

- [ ] **Step 3: Add meetings to SECTION_SORT (line 24)**

After `threads: "created_at DESC"` add:
```js
  threads: "created_at DESC",
  meetings: "data->>'date' DESC NULLS LAST"
```

- [ ] **Step 4: Add meetings to SECTION_PREFIX (line 27)**

Change:
```js
const SECTION_PREFIX = { actions: 'act', decisions: 'dec', people: 'per', learnings: 'lrn', numbers: 'num', timeline: 'tl', threads: 'thr' };
```
to:
```js
const SECTION_PREFIX = { actions: 'act', decisions: 'dec', people: 'per', learnings: 'lrn', numbers: 'num', timeline: 'tl', threads: 'thr', meetings: 'mtg' };
```

- [ ] **Step 5: Fix generateItemId for meetings section (lines 29-37)**

Replace the entire `generateItemId` function:

```js
function generateItemId(section, data) {
  const prefix = SECTION_PREFIX[section] || section.slice(0, 3);
  const dateStr = section === 'meetings' && data.date
    ? data.date.replace(/-/g, '')
    : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const text = data.description || data.decision || data.name || data.insight || data.figure || data.title || data.label || 'item';
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 4).join('-');
  if (section === 'meetings') return `${prefix}_${dateStr}_${slug}`;
  const rand = crypto.randomBytes(2).toString('hex');
  return `${prefix}_${dateStr}_${slug}_${rand}`;
}
```

Key change: meetings use deterministic IDs (date + slug, no random suffix) so re-seeding produces the same IDs.

- [ ] **Step 6: Add meeting_record_count to getStats (line 83)**

After `count(*) FILTER (WHERE section = 'threads') AS thread_count` add:
```sql
      count(*) FILTER (WHERE section = 'threads') AS thread_count,
      count(*) FILTER (WHERE section = 'meetings') AS meeting_record_count
```

And in the return object (after `thread_count`):
```js
    thread_count: parseInt(counts.thread_count) || 0,
    meeting_record_count: parseInt(counts.meeting_record_count) || 0
```

- [ ] **Step 7: Run existing tests**

Run: `cd dashboard-server && npx vitest run tests/unit/meetings-intelligence.test.mjs`
Expected: All 12 tests still pass.

- [ ] **Step 8: Add meeting section tests**

Append to the describe block in `tests/unit/meetings-intelligence.test.mjs`:

```js
  it('POST /api/meetings/items creates a meeting record', async () => {
    const res = await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'meetings', data: { title: 'Test Meeting', date: '2026-04-15', attendees: ['Glen', 'Aris'], summary: 'Test summary' } })
      .expect(201);
    expect(res.body.id).toMatch(/^mtg_20260415_test-meeting$/);
    expect(res.body.title).toBe('Test Meeting');
    expect(res.body.source).toBe('manual');
  });

  it('GET /api/meetings/compiled includes meetings section', async () => {
    await seedItem('meetings', 'mtg_20260415_test', { title: 'Test', date: '2026-04-15', summary: 'S' });
    const res = await request(app)
      .get('/api/meetings/compiled')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.sections.meetings).toHaveLength(1);
    expect(res.body.sections.meetings[0].id).toBe('mtg_20260415_test');
  });

  it('GET /api/meetings/stats includes meeting_record_count', async () => {
    await seedItem('meetings', 'mtg_test_1', { title: 'M1', date: '2026-04-15' });
    await seedItem('meetings', 'mtg_test_2', { title: 'M2', date: '2026-04-16' });
    const res = await request(app)
      .get('/api/meetings/stats')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.meeting_record_count).toBe(2);
  });

  it('generateItemId for meetings uses data.date and is deterministic', async () => {
    const res1 = await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'meetings', data: { title: 'Deterministic Test', date: '2026-05-01' } })
      .expect(201);
    expect(res1.body.id).toBe('mtg_20260501_deterministic-test');
  });
```

- [ ] **Step 9: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/meetings-intelligence.test.mjs`
Expected: All 16 tests pass.

- [ ] **Step 10: Commit**

```
git add dashboard-server/lib/meetings-intelligence.js dashboard-server/tests/unit/meetings-intelligence.test.mjs
git commit -m "feat(meetings): add meetings section type to lib with tests"
```

---

## Task 3: Seed Script — Import Meeting Records

**Files:**
- Create: `dashboard-server/scripts/seed-meeting-records.js`

This is the largest task. The script has three phases: import, LLM backfill, and people linkage. Phase 2 (LLM) is expensive and slow, so it's separated and can be run independently.

- [ ] **Step 1: Write the seed script — Phase 1 (import)**

```js
// dashboard-server/scripts/seed-meeting-records.js
// Imports Granola meeting extracts into meeting_items (section='meetings'),
// then runs LLM-assisted backfill to link existing items to meetings,
// then links people entries to meetings via attendee matching.
//
// Safe to re-run: ON CONFLICT DO NOTHING on item_id.
// Run with: node scripts/seed-meeting-records.js [--skip-backfill] [--skip-people]

'use strict';
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const GRANOLA_DIR = path.resolve(__dirname, '../../intelligence/raw/granola');
const REGISTRY_PATH = path.resolve(__dirname, '../../intelligence/compiled/person_registry.json');
const PROGRESS_PATH = path.resolve(__dirname, '../backfill_progress.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const skipBackfill = process.argv.includes('--skip-backfill');
const skipPeople = process.argv.includes('--skip-people');

function parseGranolaFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);

  // Split frontmatter from body
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) return null;
  const fmBlock = fmMatch[1];
  const body = fmMatch[2];

  // Parse frontmatter key-value pairs
  const fm = {};
  fmBlock.split('\n').forEach(line => {
    const m = line.match(/^(\w[\w_]*):\s*(.+)$/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      fm[m[1]] = val;
    }
  });

  // Extract date from filename prefix (reliable across both patterns)
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : (fm.date || null);

  // Extract title: Pattern A has fm.title, Pattern B uses H1 heading
  const h1Match = body.match(/^# (.+)$/m);
  const title = fm.title || (h1Match ? h1Match[1].trim() : filename.replace(/\.md$/, ''));

  // Extract attendees: Pattern A has fm.participants, Pattern B parses from Context
  let attendees = [];
  if (Array.isArray(fm.participants)) {
    attendees = fm.participants;
  } else if (typeof fm.participants === 'string') {
    attendees = fm.participants.split(',').map(s => s.trim());
  } else {
    const ctxMatch = body.match(/(?:Participants?|Attendees?):\s*([^\n.]+)/i);
    if (ctxMatch) attendees = ctxMatch[1].split(',').map(s => s.trim().replace(/\.$/, ''));
  }

  // Extract topics
  const topics = Array.isArray(fm.topics_detected) ? fm.topics_detected
    : Array.isArray(fm.domain) ? fm.domain : [];

  // Extract body sections
  const sections = {};
  let currentSection = null;
  let currentLines = [];
  body.split('\n').forEach(line => {
    if (line.startsWith('## ')) {
      if (currentSection) sections[currentSection] = currentLines.join('\n').trim();
      currentSection = line.replace('## ', '').trim();
      currentLines = [];
    } else if (currentSection) {
      currentLines.push(line);
    }
  });
  if (currentSection) sections[currentSection] = currentLines.join('\n').trim();

  // Map sections to data fields
  const summary = sections['Key Content'] || sections['Intelligence Value'] || '';
  const decisionsText = sections['Decisions / Insights'] || sections['Decisions'] || '';
  const context = sections['Context'] || '';

  // Source IDs
  const sourceId = fm.source_id || (fm.meeting_id ? 'granola_' + fm.meeting_id.slice(0, 8) : null);
  const sourcePath = fm.source_path || (fm.meeting_id ? 'granola://meetings/' + fm.meeting_id : null);

  // Workstream from client field or best guess from topics
  let workstream = fm.client || null;
  if (!workstream) {
    const topicStr = topics.join(' ').toLowerCase();
    if (topicStr.includes('couch') || topicStr.includes('ch-') || topicStr.includes('studio')) workstream = 'couch_heroes';
    else if (topicStr.includes('lighthouse') || topicStr.includes('dsa')) workstream = 'lighthouse';
    else if (topicStr.includes('sarge')) workstream = 'sarge';
    else if (topicStr.includes('playgoals') || topicStr.includes('goals')) workstream = 'playgoals';
    else workstream = 'nbi';
  }

  // Build item_id: mtg_YYYYMMDD_slug (deterministic)
  const dateStr = date ? date.replace(/-/g, '') : '00000000';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 4).join('-');
  const itemId = `mtg_${dateStr}_${slug}`;

  return {
    itemId,
    data: {
      date,
      title,
      attendees,
      topics,
      summary,
      decisions_text: decisionsText,
      context,
      source_id: sourceId,
      source_path: sourcePath,
      workstream,
      ingested: fm.ingested || null,
      extract_type: fm.extract_type || null
    }
  };
}

async function phase1Import() {
  console.log('=== PHASE 1: Import meeting records ===');
  if (!fs.existsSync(GRANOLA_DIR)) {
    console.log('No granola directory found. Skipping.');
    return 0;
  }

  const files = fs.readdirSync(GRANOLA_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} Granola extract files`);

  let imported = 0, skipped = 0, errors = 0;
  for (const file of files) {
    try {
      const parsed = parseGranolaFile(path.join(GRANOLA_DIR, file));
      if (!parsed) { skipped++; continue; }

      await pool.query(
        `INSERT INTO meeting_items (item_id, section, data, source)
         VALUES ($1, 'meetings', $2, 'compiled')
         ON CONFLICT (item_id) DO NOTHING`,
        [parsed.itemId, JSON.stringify(parsed.data)]
      );
      imported++;
    } catch (err) {
      console.error(`  ERROR ${file}: ${err.message}`);
      errors++;
    }
  }

  console.log(`Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}`);

  // Update meeting_metadata count
  const { rows } = await pool.query("SELECT count(*) as c FROM meeting_items WHERE section = 'meetings'");
  const totalMeetings = parseInt(rows[0].c);
  await pool.query(
    `UPDATE meeting_metadata SET meeting_count = $1, updated_at = now() WHERE id = 1`,
    [totalMeetings]
  );
  console.log(`Updated meeting_metadata.meeting_count = ${totalMeetings}`);

  return imported;
}

async function phase2Backfill() {
  if (skipBackfill) { console.log('=== PHASE 2: Skipped (--skip-backfill) ==='); return; }
  console.log('=== PHASE 2: LLM-assisted backfill ===');

  // Load progress file
  let progress = {};
  try { progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8')); } catch { /* fresh start */ }

  // Load all meetings
  const { rows: meetingRows } = await pool.query(
    "SELECT item_id, data FROM meeting_items WHERE section = 'meetings'"
  );
  const meetingsByDate = {};
  meetingRows.forEach(r => {
    const d = r.data.date;
    if (!d) return;
    if (!meetingsByDate[d]) meetingsByDate[d] = [];
    meetingsByDate[d].push({ id: r.item_id, ...r.data });
  });

  // Load all dated items (not meetings, not people/threads/timeline)
  const { rows: itemRows } = await pool.query(
    "SELECT item_id, section, data FROM meeting_items WHERE section IN ('actions','decisions','learnings','numbers') AND data->>'source_meeting_id' IS NULL"
  );

  // Group items by date
  const itemsByDate = {};
  itemRows.forEach(r => {
    const d = r.data.date;
    if (!d) return;
    if (!itemsByDate[d]) itemsByDate[d] = [];
    itemsByDate[d].push({ item_id: r.item_id, section: r.section, ...r.data });
  });

  let linked = 0, ambiguous = 0, noMatch = 0;

  for (const [date, items] of Object.entries(itemsByDate)) {
    if (progress[date]) { linked += progress[date].linked || 0; continue; }

    const meetings = meetingsByDate[date];

    if (!meetings || meetings.length === 0) {
      // Tier 3: no meeting on this date
      // Check if date predates all Granola records
      const allDates = Object.keys(meetingsByDate).sort();
      if (allDates.length > 0 && date < allDates[0]) {
        console.log(`  ${date}: ${items.length} items predate Granola (earliest: ${allDates[0]})`);
      } else {
        console.log(`  ${date}: ${items.length} items, no meeting found within range`);
      }
      noMatch += items.length;
      progress[date] = { status: 'no_match', linked: 0 };
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
      continue;
    }

    if (meetings.length === 1) {
      // Tier 1: exact single match
      const meetingId = meetings[0].id;
      for (const item of items) {
        await pool.query(
          `UPDATE meeting_items SET data = data || $2::jsonb, updated_at = now() WHERE item_id = $1`,
          [item.item_id, JSON.stringify({ source_meeting_id: meetingId })]
        );
        linked++;
      }
      console.log(`  ${date}: ${items.length} items -> ${meetingId} (single match)`);
      progress[date] = { status: 'single_match', linked: items.length };
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
      continue;
    }

    // Tier 2: LLM disambiguation
    console.log(`  ${date}: ${items.length} items, ${meetings.length} candidate meetings — calling LLM...`);
    try {
      const result = await llmDisambiguate(items, meetings, date);
      let dateLinked = 0;
      for (const [itemId, meetingId] of Object.entries(result)) {
        if (meetingId === 'none') { ambiguous++; continue; }
        // Validate meetingId is in candidates
        if (!meetings.some(m => m.id === meetingId)) {
          console.log(`    WARNING: LLM returned invalid meeting ID ${meetingId} for ${itemId} — skipping`);
          ambiguous++;
          continue;
        }
        await pool.query(
          `UPDATE meeting_items SET data = data || $2::jsonb, updated_at = now() WHERE item_id = $1`,
          [itemId, JSON.stringify({ source_meeting_id: meetingId })]
        );
        linked++;
        dateLinked++;
      }
      console.log(`    Linked: ${dateLinked}/${items.length}`);
      progress[date] = { status: 'llm', linked: dateLinked };
    } catch (err) {
      console.error(`    LLM ERROR for ${date}: ${err.message}`);
      progress[date] = { status: 'error', error: err.message, linked: 0 };
    }
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
  }

  console.log(`Backfill complete: ${linked} linked, ${ambiguous} ambiguous, ${noMatch} no match`);
}

async function llmDisambiguate(items, meetings, date) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();

  const meetingSummaries = meetings.map(m =>
    `MEETING_ID: ${m.id}\nTitle: ${m.title}\nAttendees: ${(m.attendees || []).join(', ')}\nTopics: ${(m.topics || []).join(', ')}\nSummary: ${(m.summary || '').slice(0, 500)}`
  ).join('\n---\n');

  const itemDescriptions = items.map(i =>
    `ITEM_ID: ${i.item_id}\nSection: ${i.section}\nDescription: ${i.description || i.decision || i.insight || i.figure || ''}\nOwner: ${i.owner || ''}\nWorkstream: ${i.workstream || ''}`
  ).join('\n---\n');

  const prompt = `You are matching meeting intelligence items to the meetings they came from.

DATE: ${date}

MEETINGS ON THIS DATE:
${meetingSummaries}

ITEMS TO MATCH:
${itemDescriptions}

For each ITEM_ID, determine which MEETING_ID it most likely came from based on topic relevance, attendee overlap, and content similarity. If you cannot confidently determine the source meeting, return "none".

Return ONLY a JSON object mapping item_id to meeting_id (or "none"). Example:
{"act_20260401_glen_offer": "mtg_20260401_glen-aris-graham", "dec_20260401_riley": "none"}`;

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });
      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`    Retry ${attempt + 1} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

async function phase3People() {
  if (skipPeople) { console.log('=== PHASE 3: Skipped (--skip-people) ==='); return; }
  console.log('=== PHASE 3: People — meeting linkage ===');

  // Load person registry for alias matching
  let registry = {};
  try { registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); } catch { console.log('No person registry found'); }

  // Build alias -> normalised name map
  const aliasMap = {};
  for (const [norm, entry] of Object.entries(registry)) {
    aliasMap[entry.display.toLowerCase()] = norm;
    (entry.aliases || []).forEach(a => { aliasMap[a.toLowerCase()] = norm; });
  }

  // Load all meeting records
  const { rows: meetingRows } = await pool.query(
    "SELECT item_id, data FROM meeting_items WHERE section = 'meetings'"
  );

  // Build normalised name -> meeting IDs map
  const personMeetings = {};
  meetingRows.forEach(r => {
    const attendees = r.data.attendees || [];
    attendees.forEach(name => {
      const norm = aliasMap[name.toLowerCase()];
      if (norm) {
        if (!personMeetings[norm]) personMeetings[norm] = new Set();
        personMeetings[norm].add(r.item_id);
      }
    });
  });

  // Load all people items
  const { rows: peopleRows } = await pool.query(
    "SELECT item_id, data FROM meeting_items WHERE section = 'people'"
  );

  let updated = 0;
  for (const person of peopleRows) {
    const norm = person.data.name_normalised || person.data.name?.toLowerCase().replace(/\s+/g, '_');
    const meetingIds = personMeetings[norm];
    if (meetingIds && meetingIds.size > 0) {
      await pool.query(
        `UPDATE meeting_items SET data = data || $2::jsonb, updated_at = now() WHERE item_id = $1`,
        [person.item_id, JSON.stringify({ meeting_ids: Array.from(meetingIds).sort() })]
      );
      updated++;
      console.log(`  ${person.data.name}: ${meetingIds.size} meetings`);
    }
  }
  console.log(`Updated ${updated} people entries with meeting_ids`);
}

async function run() {
  const imported = await phase1Import();
  if (imported > 0) await phase2Backfill();
  await phase3People();
  await pool.end();
  console.log('Done.');
}

run().catch(err => { console.error('Seed failed:', err); process.exit(1); });
```

- [ ] **Step 2: Run Phase 1 only (import meeting records)**

Run: `cd dashboard-server && node scripts/seed-meeting-records.js --skip-backfill --skip-people`
Expected: ~112 meetings imported, meeting_metadata updated.

- [ ] **Step 3: Verify meeting records in DB**

```js
pool.query("SELECT count(*) FROM meeting_items WHERE section = 'meetings'")
// Expected: ~112
pool.query("SELECT item_id, data->>'title' as title FROM meeting_items WHERE section = 'meetings' ORDER BY data->>'date' LIMIT 5")
// Expected: earliest meetings with titles
```

- [ ] **Step 4: Run full script (including LLM backfill)**

Run: `cd dashboard-server && node scripts/seed-meeting-records.js`
Expected: Phase 1 skips (already imported), Phase 2 runs LLM calls (~35 batches), Phase 3 links people.

This will take a few minutes due to API calls. Monitor console output for progress.

- [ ] **Step 5: Verify backfill results**

```js
pool.query("SELECT count(*) FILTER (WHERE data->>'source_meeting_id' IS NOT NULL) as linked, count(*) FILTER (WHERE data->>'source_meeting_id' IS NULL) as unlinked FROM meeting_items WHERE section IN ('actions','decisions','learnings','numbers')")
// Expected: majority linked
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/scripts/seed-meeting-records.js
git commit -m "feat(meetings): seed script — import 112 meetings, LLM backfill, people linkage"
```

---

## Task 4: Frontend — Provenance Chips on All Renderers

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add provenance chip helper function**

After the `_mtgBadge` function (search for `function _mtgBadge`), add:

```js
function _mtgSrcChip(item) {
  if (item.source === 'manual' || !item.source_meeting_id) return '';
  var mtg = (_mtgData && _mtgData.sections && _mtgData.sections.meetings || []).find(function(m) { return m.id === item.source_meeting_id; });
  if (!mtg) return '';
  var label = (mtg.title || '').length > 30 ? mtg.title.slice(0, 28) + '...' : mtg.title;
  return ' <span class="cc-tag cc-tag--purple cc-mtg-src" onclick="event.stopPropagation();_mtgOpenMeeting(\'' + esc(item.source_meeting_id) + '\')">' + esc(label) + ' &middot; ' + esc(mtg.date || '') + '</span>';
}

function _mtgPeopleMtgChip(item) {
  if (!item.meeting_ids || !item.meeting_ids.length) return '';
  return ' <span class="cc-tag cc-tag--purple cc-mtg-src" onclick="event.stopPropagation();_mtgFilterSources(\'' + esc(item.id) + '\')">' + item.meeting_ids.length + ' meetings</span>';
}
```

- [ ] **Step 2: Add provenance chips to Actions renderer**

In `_mtgRenderActions`, on the description cell (line with `esc(a.description || '')`), add `_mtgSrcChip(a)` after `_mtgBadge(a)`:

Change:
```js
    h += '<td>' + esc(a.description || '') + _mtgBadge(a) + '</td>';
```
to:
```js
    h += '<td>' + esc(a.description || '') + _mtgBadge(a) + _mtgSrcChip(a) + '</td>';
```

- [ ] **Step 3: Add provenance chips to Decisions renderer**

Change:
```js
    h += '<td>' + esc(d.decision || '') + _mtgBadge(d) + '</td>';
```
to:
```js
    h += '<td>' + esc(d.decision || '') + _mtgBadge(d) + _mtgSrcChip(d) + '</td>';
```

- [ ] **Step 4: Add meeting count chip to People renderer**

In `_mtgRenderPeople`, after the person name line, add the people meeting chip:

Change:
```js
    h += '<strong style="color:var(--accent)">' + esc(p.name) + '</strong>' + _mtgBadge(p);
```
to:
```js
    h += '<strong style="color:var(--accent)">' + esc(p.name) + '</strong>' + _mtgBadge(p) + _mtgPeopleMtgChip(p);
```

- [ ] **Step 5: Add provenance chips to Learnings renderer**

Change:
```js
    h += '<strong>' + esc(l.insight) + '</strong>' + _mtgBadge(l);
```
to:
```js
    h += '<strong>' + esc(l.insight) + '</strong>' + _mtgBadge(l) + _mtgSrcChip(l);
```

- [ ] **Step 6: Add provenance chips to Numbers renderer**

Change:
```js
      h += '<td>' + esc(n.context || '') + _mtgBadge(n) + '</td>';
```
to:
```js
      h += '<td>' + esc(n.context || '') + _mtgBadge(n) + _mtgSrcChip(n) + '</td>';
```

- [ ] **Step 7: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(meetings): provenance chips on actions, decisions, people, learnings, numbers"
```

---

## Task 5: Frontend — Slide-Over Panel

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add slide-over panel CSS**

After the existing `.cc-mtg-task-icon:hover` CSS rule, add:

```css
.cc-mtg-panel-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; }
.cc-mtg-panel { position:fixed; top:0; right:0; bottom:0; width:480px; background:var(--bg-raised); border-left:1px solid var(--border-default); z-index:1001; overflow-y:auto; padding:20px 24px; animation:ccSlideIn 0.2s ease; }
@keyframes ccSlideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
.cc-mtg-panel-title { font-size:18px; font-weight:700; margin-bottom:4px; }
.cc-mtg-panel-date { font-size:14px; color:var(--text-secondary); margin-bottom:12px; }
.cc-mtg-panel-section { margin-top:16px; }
.cc-mtg-panel-section h4 { font-size:13px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:8px; }
.cc-mtg-panel-close { position:absolute; top:16px; right:16px; background:none; border:none; color:var(--text-secondary); font-size:20px; cursor:pointer; padding:4px 8px; }
.cc-mtg-panel-close:hover { color:var(--text-primary); }
.cc-mtg-src { cursor:pointer; font-size:11px; }
.cc-mtg-src:hover { opacity:0.8; }
.cc-mtg-linked-item { padding:4px 0; font-size:13px; cursor:pointer; color:var(--text-secondary); }
.cc-mtg-linked-item:hover { color:var(--accent); }
@media(max-width:600px) { .cc-mtg-panel { width:100%; } }
```

- [ ] **Step 2: Add slide-over panel JS functions**

After the `_mtgMarkActionDone` function (before `// ==================== EMBEDDED CLAUDE CHAT`), add:

```js
// ——— MEETING SLIDE-OVER PANEL ———

function _mtgOpenMeeting(meetingId) {
  var mtg = (_mtgData && _mtgData.sections && _mtgData.sections.meetings || []).find(function(m) { return m.id === meetingId; });
  if (!mtg) { toast('Meeting record not found', 'error'); return; }

  // Remove any existing panel
  var old = document.getElementById('mtgPanelOverlay');
  if (old) old.remove();

  var h = '<div class="cc-mtg-panel-overlay" id="mtgPanelOverlay" onclick="if(event.target===this)_mtgClosePanel()">';
  h += '<div class="cc-mtg-panel">';
  h += '<button class="cc-mtg-panel-close" id="mtgPanelClose" onclick="_mtgClosePanel()" title="Close">&times;</button>';

  // Header
  h += '<div class="cc-mtg-panel-title">' + esc(mtg.title || '') + '</div>';
  h += '<div class="cc-mtg-panel-date">' + esc(mtg.date || '') + '</div>';

  // Attendees
  if (mtg.attendees && mtg.attendees.length) {
    h += '<div style="margin-bottom:12px">';
    mtg.attendees.forEach(function(a) { h += '<span class="cc-tag" style="margin:0 4px 4px 0">' + esc(a) + '</span>'; });
    h += '</div>';
  }

  // Workstream + Topics
  if (mtg.workstream) h += '<span class="cc-tag cc-tag--blue" style="margin-right:4px">' + esc(mtg.workstream.replace(/_/g, ' ')) + '</span>';
  if (mtg.topics && mtg.topics.length) {
    mtg.topics.forEach(function(t) { h += '<span class="cc-tag cc-tag--purple" style="margin:0 4px 4px 0;font-size:11px">' + esc(t) + '</span>'; });
  }

  // Summary
  if (mtg.summary) {
    h += '<div class="cc-mtg-panel-section"><h4>Summary</h4>';
    h += '<div style="font-size:14px;line-height:1.6">' + esc(mtg.summary).replace(/\n/g, '<br>') + '</div></div>';
  }

  // Decisions
  if (mtg.decisions_text) {
    h += '<div class="cc-mtg-panel-section"><h4>Decisions</h4><ul style="padding-left:16px;font-size:14px">';
    mtg.decisions_text.split('\n').filter(function(l) { return l.trim(); }).forEach(function(l) {
      h += '<li style="margin-bottom:4px">' + esc(l.replace(/^[-*]\s*/, '').replace(/^\[.*?\]\s*/, '')) + '</li>';
    });
    h += '</ul></div>';
  }

  // Context
  if (mtg.context) {
    h += '<div class="cc-mtg-panel-section"><h4>Context</h4>';
    h += '<div style="font-size:13px;color:var(--text-secondary)">' + esc(mtg.context) + '</div></div>';
  }

  // Source reference
  if (mtg.source_id) {
    h += '<div style="margin-top:12px;font-size:12px;color:var(--text-secondary)">Source: ' + esc(mtg.source_id) + '</div>';
  }

  // Linked items — find all items that reference this meeting
  var linkedSections = {};
  var sectionNames = ['actions', 'decisions', 'learnings', 'numbers'];
  sectionNames.forEach(function(sec) {
    var items = (_mtgData.sections[sec] || []).filter(function(i) { return i.source_meeting_id === meetingId; });
    if (items.length) linkedSections[sec] = items;
  });

  var linkedKeys = Object.keys(linkedSections);
  if (linkedKeys.length) {
    h += '<div class="cc-mtg-panel-section"><h4>From This Meeting</h4>';
    var countParts = linkedKeys.map(function(k) { return linkedSections[k].length + ' ' + k; });
    h += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">' + countParts.join(' &middot; ') + '</div>';
    linkedKeys.forEach(function(sec) {
      linkedSections[sec].forEach(function(item) {
        var label = item.description || item.decision || item.insight || item.figure || item.title || '';
        h += '<div class="cc-mtg-linked-item" onclick="_mtgClosePanel();_mtgSwitchSub(\'' + sec + '\')">' + esc(label.slice(0, 80)) + '</div>';
      });
    });
    h += '</div>';
  }

  h += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', h);

  // Focus close button
  setTimeout(function() { var btn = document.getElementById('mtgPanelClose'); if (btn) btn.focus(); }, 100);

  // Escape key handler
  document.addEventListener('keydown', _mtgPanelEscape);
}

function _mtgClosePanel() {
  var el = document.getElementById('mtgPanelOverlay');
  if (el) el.remove();
  document.removeEventListener('keydown', _mtgPanelEscape);
}

function _mtgPanelEscape(e) {
  if (e.key === 'Escape') _mtgClosePanel();
}

function _mtgFilterSources(personId) {
  var person = (_mtgData.sections.people || []).find(function(p) { return p.id === personId; });
  if (!person || !person.meeting_ids) return;
  _mtgFilters._personMeetingIds = person.meeting_ids;
  _mtgSwitchSub('sources');
}
```

- [ ] **Step 3: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(meetings): slide-over meeting panel with linked items"
```

---

## Task 6: Frontend — Sources Sub-Tab

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add 'sources' to sub-tabs array**

Change the subTabs array (line ~24462):
```js
    { id: 'threads', label: 'Threads (' + filtered.threads.length + ')' }
```
to:
```js
    { id: 'threads', label: 'Threads (' + filtered.threads.length + ')' },
    { id: 'sources', label: 'Sources (' + (filtered.meetings || []).length + ')' }
```

- [ ] **Step 2: Add meetings to _mtgApplyFilters**

In `_mtgApplyFilters`, add after the threads line:
```js
    threads: (sections.threads || []).filter(matchNoStatus),
    meetings: (sections.meetings || []).filter(function(m) {
      if (!matchWs(m)) return false;
      if (!matchQ(m)) return false;
      if (f._personMeetingIds) return f._personMeetingIds.indexOf(m.id) >= 0;
      return true;
    })
```

- [ ] **Step 3: Add sources to _mtgRenderSubTab**

In `_mtgRenderSubTab`, add after the threads line:
```js
  if (_mtgSubTab === 'sources') return _mtgRenderSources(filtered.meetings);
```

- [ ] **Step 4: Write _mtgRenderSources function**

Add after `_mtgRenderThreads`:

```js
function _mtgRenderSources(meetings) {
  var h = '<button class="cc-btn-sm cc-mtg-add-btn" onclick="_mtgStartAdd()">+ Add Meeting</button>';
  if (_mtgAddingSection === 'meetings') h += _mtgEditFormHtml(null, 'meetings', { date: new Date().toISOString().slice(0,10), attendees: [], topics: [], workstream: 'nbi' });
  if (_mtgFilters._personMeetingIds) {
    h += '<div style="margin-bottom:10px;font-size:13px;color:var(--text-secondary)">Filtered to meetings for this person <button class="cc-btn-sm" onclick="delete _mtgFilters._personMeetingIds;_mtgRender()">Clear</button></div>';
  }
  if (!meetings.length && !_mtgAddingSection) return h + '<div class="cc-panel-empty">No meeting records found.</div>';
  h += '<table class="cc-tbl"><thead><tr><th>Date</th><th>Meeting</th><th>Attendees</th><th>Workstream</th><th></th></tr></thead><tbody>';
  meetings.forEach(function(m) {
    if (_mtgEditingId === m.id) { h += '<tr><td colspan="5">' + _mtgEditFormHtml(m.id, 'meetings', m) + '</td></tr>'; return; }
    h += '<tr style="cursor:pointer" onclick="_mtgOpenMeeting(\'' + esc(m.id) + '\')">';
    h += '<td style="white-space:nowrap">' + esc(m.date || '') + '</td>';
    h += '<td>' + esc(m.title || '') + _mtgBadge(m) + '</td>';
    h += '<td style="font-size:12px;color:var(--text-secondary)">' + (m.attendees ? m.attendees.length : 0) + '</td>';
    h += '<td><span class="cc-tag cc-tag--blue">' + esc((m.workstream || '').replace(/_/g, ' ')) + '</span></td>';
    h += '<td><span class="cc-mtg-edit-icon" onclick="event.stopPropagation();_mtgStartEdit(\'' + esc(m.id) + '\')" title="Edit">&#9998;</span></td>';
    h += '</tr>';
  });
  h += '</tbody></table>';
  return h;
}
```

- [ ] **Step 5: Add meetings to the edit form fields function**

In `_mtgEditFormFields`, the `meetings` section is already handled (the spec added it during the enhancements). But verify — if not present, add:

```js
  } else if (section === 'meetings') {
    h += _mtgFieldHtml('Date', 'date', data.date, 'text');
    h += _mtgFieldHtml('Title', 'title', data.title, 'text');
    h += _mtgFieldHtml('Attendees (comma-separated)', 'attendees', (data.attendees || []).join(', '), 'text');
    h += _mtgFieldHtml('Workstream', 'workstream', data.workstream, 'select', ws);
    h += _mtgFieldHtml('Summary', 'summary', data.summary, 'textarea');
  }
```

Also update `_mtgReadFormData` to handle `attendees` the same way as `workstreams`:
```js
    if (key === 'attendees') {
      data[key] = val.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
    }
```

- [ ] **Step 6: Verify in browser**

Restart PM2: `pm2 restart nbi-dashboard`
Open CC > Meetings. Verify:
- Sources sub-tab appears with meeting count
- Meeting list renders with date, title, attendees count, workstream
- Clicking a meeting row opens slide-over panel
- Panel shows full content, attendees, decisions, linked items
- Close button, Escape, click-outside all dismiss the panel
- Provenance chips appear on linked items in other sub-tabs
- People entries show "N meetings" chip

- [ ] **Step 7: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(meetings): Sources sub-tab with meeting list and edit support"
```

---

## Task 7: E2E Tests + Full Verification

**Files:**
- Modify: `dashboard-server/tests/e2e/meetings-tab.spec.js`

- [ ] **Step 1: Add meeting record CRUD test**

Append to the test file:

```js
  test('meeting record CRUD lifecycle', async ({ request }) => {
    const user = await createTestUser({ role: 'admin' });
    const token = await mintSession(user.id);

    const create = await request.post('/api/meetings/items', {
      headers: { Cookie: `nbi_session=${token}`, 'Content-Type': 'application/json' },
      data: { section: 'meetings', data: { title: 'E2E Test Meeting', date: '2026-04-15', attendees: ['Glen', 'Aris'], summary: 'Test summary' } },
    });
    expect(create.status()).toBe(201);
    const mtg = await create.json();
    expect(mtg.id).toMatch(/^mtg_20260415_e2e-test-meeting$/);

    const compiled = await request.get('/api/meetings/compiled', {
      headers: { Cookie: `nbi_session=${token}` },
    });
    const body = await compiled.json();
    expect(body.sections.meetings.some(m => m.id === mtg.id)).toBe(true);

    await request.delete('/api/meetings/items/' + mtg.id, {
      headers: { Cookie: `nbi_session=${token}` },
    }).then(r => expect(r.status()).toBe(200));
  });
```

- [ ] **Step 2: Run unit tests**

Run: `cd dashboard-server && npx vitest run tests/unit/meetings-intelligence.test.mjs`
Expected: All tests pass.

- [ ] **Step 3: Run E2E tests**

Run smoke first to warm server: `cd dashboard-server && npx playwright test --config tests/e2e/playwright.config.js tests/e2e/smoke.spec.js`
Then: `cd dashboard-server && npx playwright test --config tests/e2e/playwright.config.js tests/e2e/meetings-tab.spec.js`
Expected: All tests pass.

- [ ] **Step 4: Restart PM2 and visual verification**

Run: `pm2 restart nbi-dashboard`
Open http://localhost:8888/nbi_project_dashboard.html

Verify checklist:
1. CC > Meetings > Sources tab shows ~112 meeting records
2. Clicking a meeting row opens slide-over panel with full content
3. Panel shows attendees, summary, decisions, context, linked items
4. Close panel via X, Escape, or click outside
5. Actions tab: provenance chips ("Meeting Title · Date") on linked actions
6. Decisions tab: provenance chips on linked decisions
7. People tab: "N meetings" chip on people entries
8. Learnings/Numbers tabs: provenance chips on linked items
9. Click provenance chip → slide-over opens for correct meeting
10. Sources tab: workstream filter works, search works
11. Sources tab: edit/add/delete meetings works
12. All existing functionality (edit, add, delete, task creation, status cycling) unaffected

- [ ] **Step 5: Commit all remaining changes**

```
git add dashboard-server/tests/e2e/meetings-tab.spec.js
git commit -m "test(meetings): add meeting record CRUD E2E test"
```

---

## Summary

| Task | What | Key Detail |
|---|---|---|
| 1 | Migration 062 | ALTER CHECK constraint + source_id unique index |
| 2 | Lib updates | Add 'meetings' to all constants, fix generateItemId, update getStats |
| 3 | Seed script | 3-phase: import 112 files, LLM backfill 157 items, people linkage |
| 4 | Provenance chips | _mtgSrcChip on actions/decisions/learnings/numbers, _mtgPeopleMtgChip on people |
| 5 | Slide-over panel | 480px right panel, Escape/click-outside close, linked items with counts |
| 6 | Sources sub-tab | 8th tab, meeting list, click-to-panel, edit/add/delete support |
| 7 | Tests + verification | Unit tests for meetings CRUD, E2E, full visual checklist |
