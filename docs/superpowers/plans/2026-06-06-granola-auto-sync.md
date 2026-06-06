# Granola Auto-Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically sync Granola meeting notes into WorkSage's `meeting_items` table via a daily server-side cron job, with calendar cross-referencing for attendee enrichment.

**Architecture:** A new `lib/granola-sync.js` module contains all sync logic — API polling, transform, calendar matching, client matching, upsert. A shared `lib/graph-calendar.js` is extracted from command-centre.js for calendar access. Cron registration at 07:00 daily in `cron/index.js`. Manual trigger via `POST /api/admin/granola-sync`.

**Tech Stack:** Node.js, Express, PostgreSQL (`pg`), Granola REST API, Microsoft Graph API (calendar), prom-client, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-06-granola-auto-sync.md`

---

### Task 1: Extract `fetchCalendarEvents` into shared lib

Pure refactor. Move the calendar helper out of the command-centre route into a shared module so both the CC route and the granola sync can use it.

**Files:**
- Create: `dashboard-server/lib/graph-calendar.js`
- Modify: `dashboard-server/routes/command-centre.js:384-417`

- [ ] **Step 1: Create `lib/graph-calendar.js`**

```js
// dashboard-server/lib/graph-calendar.js
'use strict';

async function fetchCalendarEvents(msalClient, startDate, endDate) {
  if (!msalClient) return { events: [], error: 'MSAL not configured' };
  try {
    const tokenResult = await msalClient.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });
    if (!tokenResult || !tokenResult.accessToken) return { events: [], error: 'Token acquisition failed' };

    const userEmail = process.env.CC_CALENDAR_USER || 'gpryer@nbi-consulting.com';
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$orderby=start/dateTime&$top=50&$select=subject,start,end,location,attendees,onlineMeeting,webLink`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${tokenResult.accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!resp.ok) {
      const body = await resp.text();
      return { events: [], error: `Graph API ${resp.status}: ${body.slice(0, 200)}` };
    }
    const data = await resp.json();
    return {
      events: (data.value || []).map(ev => ({
        title: ev.subject,
        start: ev.start.dateTime,
        end: ev.end.dateTime,
        location: ev.location?.displayName || '',
        attendees: (ev.attendees || []).map(a => a.emailAddress?.name || a.emailAddress?.address || ''),
        online_url: ev.onlineMeeting?.joinUrl || ev.webLink || '',
      })),
    };
  } catch (e) {
    return { events: [], error: e.message };
  }
}

module.exports = { fetchCalendarEvents };
```

- [ ] **Step 2: Update command-centre.js to import from shared lib**

In `dashboard-server/routes/command-centre.js`, at the top of the `module.exports = function (ctx)` body (around line 8), add:

```js
const { fetchCalendarEvents: fetchCalendarEventsFromLib } = require('../lib/graph-calendar');
```

Then replace the entire `fetchCalendarEvents` function definition (lines 384-417) with:

```js
  // ——— CALENDAR HELPER ———
  async function fetchCalendarEvents(startDate, endDate) {
    return fetchCalendarEventsFromLib(_msalClient, startDate, endDate);
  }
```

This preserves the existing call sites — they all call `fetchCalendarEvents(startDate, endDate)` without passing `msalClient`.

- [ ] **Step 3: Run existing tests to verify no regression**

Run: `cd dashboard-server && npx vitest run`
Expected: All existing tests pass. No behaviour changed.

- [ ] **Step 4: Commit**

```
git add dashboard-server/lib/graph-calendar.js dashboard-server/routes/command-centre.js
git commit -m "refactor: extract fetchCalendarEvents into shared lib/graph-calendar.js"
```

---

### Task 2: `matchWorkstream` — client matching from title

**Files:**
- Create: `dashboard-server/lib/granola-sync.js` (start with just this function)
- Create: `dashboard-server/tests/unit/granola-sync.test.mjs` (start with just these tests)

- [ ] **Step 1: Write failing tests for `matchWorkstream`**

Create `dashboard-server/tests/unit/granola-sync.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { matchWorkstream } = require('../../lib/granola-sync');

const CLIENTS = [
  { id: '1', name: 'Couch Heroes' },
  { id: '2', name: 'Lighthouse' },
  { id: '3', name: 'NBI' },
  { id: '4', name: 'NBI Analytics' },
];

describe('matchWorkstream', () => {
  it('matches exact client name in title', () => {
    expect(matchWorkstream('Couch Heroes, Art Producer - Fred Dossola', CLIENTS)).toBe('Couch Heroes');
  });

  it('longest match wins', () => {
    expect(matchWorkstream('NBI Analytics meeting', CLIENTS)).toBe('NBI Analytics');
  });

  it('returns null when no match', () => {
    expect(matchWorkstream('HR Weekly Meeting', CLIENTS)).toBeNull();
  });

  it('case insensitive', () => {
    expect(matchWorkstream('couch heroes weekly sync', CLIENTS)).toBe('Couch Heroes');
  });

  it('matches partial title containing client', () => {
    expect(matchWorkstream('check in with Lighthouse team', CLIENTS)).toBe('Lighthouse');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: FAIL — `Cannot find module '../../lib/granola-sync'`

- [ ] **Step 3: Implement `matchWorkstream`**

Create `dashboard-server/lib/granola-sync.js`:

```js
'use strict';

function matchWorkstream(title, clients) {
  const titleLower = title.toLowerCase();
  let best = null;
  for (const client of clients) {
    const nameLower = client.name.toLowerCase();
    if (titleLower.includes(nameLower)) {
      if (!best || nameLower.length > best.length) {
        best = { length: nameLower.length, workstream: client.name };
      }
    }
  }
  return best ? best.workstream : null;
}

module.exports = { matchWorkstream };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```
git add dashboard-server/lib/granola-sync.js dashboard-server/tests/unit/granola-sync.test.mjs
git commit -m "feat(granola-sync): matchWorkstream with tests"
```

---

### Task 3: `matchCalendarEvent` — calendar cross-reference

**Files:**
- Modify: `dashboard-server/lib/granola-sync.js`
- Modify: `dashboard-server/tests/unit/granola-sync.test.mjs`

- [ ] **Step 1: Write failing tests for `matchCalendarEvent`**

Append to `dashboard-server/tests/unit/granola-sync.test.mjs`:

```js
const { matchCalendarEvent } = require('../../lib/granola-sync');

const STOP_WORDS = new Set(['meeting', 'call', 'weekly', 'sync', 'check', 'in', 'with', 'the', 'a', 'an']);

describe('matchCalendarEvent', () => {
  const calEvents = [
    { title: 'HR Weekly Meeting', start: '2026-06-04T12:00:00', end: '2026-06-04T13:00:00', attendees: ['Glen Pryer', 'Lorenza Menna'] },
    { title: '1:1 with Dino', start: '2026-06-04T10:00:00', end: '2026-06-04T11:00:00', attendees: ['Glen Pryer', 'Dino Kandiloros'] },
    { title: 'GCP Migration Discussion', start: '2026-06-04T09:00:00', end: '2026-06-04T10:00:00', attendees: ['Glen Pryer', 'Justin Logan'] },
  ];

  it('matches event within time window', () => {
    const result = matchCalendarEvent('2026-06-04T12:30:00', 'HR- Weekly meeting', calEvents);
    expect(result).toEqual(['Glen Pryer', 'Lorenza Menna']);
  });

  it('returns empty array when no time overlap', () => {
    const result = matchCalendarEvent('2026-06-04T16:00:00', 'Random Meeting', calEvents);
    expect(result).toEqual([]);
  });

  it('picks best title match when multiple events overlap', () => {
    const overlapping = [
      { title: 'HR Weekly Meeting', start: '2026-06-04T12:00:00', end: '2026-06-04T13:30:00', attendees: ['Glen', 'Lorenza'] },
      { title: 'GCP Migration Planning', start: '2026-06-04T12:00:00', end: '2026-06-04T13:30:00', attendees: ['Glen', 'Justin'] },
    ];
    const result = matchCalendarEvent('2026-06-04T12:30:00', 'GCP migration timeline and infrastructure costs', overlapping);
    expect(result).toEqual(['Glen', 'Justin']);
  });

  it('matches within 15min pad before event start', () => {
    const result = matchCalendarEvent('2026-06-04T09:50:00', '1:1 with Dino', calEvents);
    expect(result).toEqual(['Glen Pryer', 'Dino Kandiloros']);
  });

  it('returns empty array when events list is empty', () => {
    const result = matchCalendarEvent('2026-06-04T12:30:00', 'Something', []);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: matchCalendarEvent tests FAIL — `matchCalendarEvent is not a function`

- [ ] **Step 3: Implement `matchCalendarEvent`**

Add to `dashboard-server/lib/granola-sync.js` before `module.exports`:

```js
const TITLE_STOP_WORDS = new Set(['meeting', 'call', 'weekly', 'sync', 'check', 'in', 'with', 'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'on', 'at']);

function titleWords(title) {
  return title.toLowerCase().split(/[\s\-:,./()]+/).filter(w => w.length > 1 && !TITLE_STOP_WORDS.has(w));
}

function titleOverlapScore(a, b) {
  const wordsA = new Set(titleWords(a));
  const wordsB = titleWords(b);
  let score = 0;
  for (const w of wordsB) {
    if (wordsA.has(w)) score++;
  }
  return score;
}

function matchCalendarEvent(noteCreatedAt, noteTitle, calendarEvents) {
  if (!calendarEvents || calendarEvents.length === 0) return [];

  const noteTime = new Date(noteCreatedAt).getTime();
  const PAD_MS = 15 * 60 * 1000;

  const candidates = calendarEvents.filter(ev => {
    const evStart = new Date(ev.start).getTime();
    const evEnd = new Date(ev.end).getTime();
    return noteTime >= (evStart - PAD_MS) && noteTime <= (evEnd + PAD_MS);
  });

  if (candidates.length === 0) return [];
  if (candidates.length === 1) return candidates[0].attendees || [];

  let best = candidates[0];
  let bestScore = titleOverlapScore(noteTitle, best.title);
  for (let i = 1; i < candidates.length; i++) {
    const score = titleOverlapScore(noteTitle, candidates[i].title);
    if (score > bestScore) {
      bestScore = score;
      best = candidates[i];
    }
  }
  return best.attendees || [];
}
```

Update `module.exports`:

```js
module.exports = { matchWorkstream, matchCalendarEvent };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```
git add dashboard-server/lib/granola-sync.js dashboard-server/tests/unit/granola-sync.test.mjs
git commit -m "feat(granola-sync): matchCalendarEvent with title scoring"
```

---

### Task 4: `transformNote` — Granola API response to meeting_items JSONB

**Files:**
- Modify: `dashboard-server/lib/granola-sync.js`
- Modify: `dashboard-server/tests/unit/granola-sync.test.mjs`

- [ ] **Step 1: Write failing tests for `transformNote`**

Append to test file:

```js
const { transformNote } = require('../../lib/granola-sync');

describe('transformNote', () => {
  const baseNote = {
    id: '03a27e7d-bf68-4838-a8ba-fde37a8c4f3a',
    title: 'HR- Weekly meeting',
    created_at: '2026-06-04T12:00:00.000Z',
    owner: { name: 'Glen Pryer', email: 'gpryer@nbi-consulting.com' },
    summary: '### New ATS Tool Introduction\n\n- Introducing custom-built ATS system\n- Replaces current Google Docs workflow\n\n### Current Recruiting Pipeline Status\n\n- Ellis in offer stage for HR Ops role',
  };

  it('transforms standard meeting note', () => {
    const result = transformNote(baseNote, [], []);
    expect(result.data.date).toBe('2026-06-04');
    expect(result.data.title).toBe('HR- Weekly meeting');
    expect(result.data.summary).toBe(baseNote.summary);
    expect(result.data.source_id).toBe('03a27e7d-bf68-4838-a8ba-fde37a8c4f3a');
    expect(result.data.source_path).toBe('granola://meetings/03a27e7d-bf68-4838-a8ba-fde37a8c4f3a');
    expect(result.data.owner_name).toBe('Glen Pryer');
    expect(result.data.owner_email).toBe('gpryer@nbi-consulting.com');
    expect(result.data.attendees).toEqual([]);
    expect(result.data.topics).toEqual([]);
    expect(result.data.decisions_text).toBe('');
    expect(result.data.context).toBe('');
    expect(result.data.workstream).toBeNull();
    expect(result.item_id).toMatch(/^mtg_20260604_/);
  });

  it('does not truncate summary', () => {
    const longSummary = '### Topic\n\n' + 'x'.repeat(5000);
    const note = { ...baseNote, summary: longSummary };
    const result = transformNote(note, [], []);
    expect(result.data.summary).toBe(longSummary);
    expect(result.data.summary.length).toBe(5011);
  });

  it('trims title whitespace', () => {
    const note = { ...baseNote, title: '  HR- Weekly meeting  ' };
    const result = transformNote(note, [], []);
    expect(result.data.title).toBe('HR- Weekly meeting');
  });

  it('empty summary becomes empty string', () => {
    const note = { ...baseNote, summary: null };
    const result = transformNote(note, [], []);
    expect(result.data.summary).toBe('');
  });

  it('matches workstream from client list', () => {
    const clients = [{ id: '1', name: 'Couch Heroes' }];
    const note = { ...baseNote, title: 'Couch Heroes, Art Producer interview' };
    const result = transformNote(note, clients, []);
    expect(result.data.workstream).toBe('Couch Heroes');
  });

  it('populates attendees from calendar match', () => {
    const calEvents = [
      { title: 'HR Weekly Meeting', start: '2026-06-04T11:45:00', end: '2026-06-04T13:00:00', attendees: ['Glen Pryer', 'Lorenza Menna'] },
    ];
    const result = transformNote(baseNote, [], calEvents);
    expect(result.data.attendees).toEqual(['Glen Pryer', 'Lorenza Menna']);
  });

  it('handles missing owner gracefully', () => {
    const note = { ...baseNote, owner: undefined };
    const result = transformNote(note, [], []);
    expect(result.data.owner_name).toBe('');
    expect(result.data.owner_email).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: transformNote tests FAIL — `transformNote is not a function`

- [ ] **Step 3: Implement `transformNote`**

Add to `dashboard-server/lib/granola-sync.js`:

```js
const { generateItemId } = require('./meetings-intelligence');

function transformNote(note, clients, calendarEvents) {
  const title = (note.title || '').trim();
  const createdAt = note.created_at || new Date().toISOString();
  const date = createdAt.slice(0, 10);
  const summary = note.summary || '';
  const owner = note.owner || {};

  const attendees = matchCalendarEvent(createdAt, title, calendarEvents);
  const workstream = matchWorkstream(title, clients);

  const data = {
    date,
    title,
    attendees,
    topics: [],
    summary,
    decisions_text: '',
    context: '',
    source_id: note.id,
    source_path: `granola://meetings/${note.id}`,
    workstream,
    owner_name: owner.name || '',
    owner_email: owner.email || '',
  };

  const item_id = generateItemId('meetings', data);

  return { item_id, data };
}
```

Update `module.exports`:

```js
module.exports = { matchWorkstream, matchCalendarEvent, transformNote };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: All 17 tests PASS

- [ ] **Step 5: Commit**

```
git add dashboard-server/lib/granola-sync.js dashboard-server/tests/unit/granola-sync.test.mjs
git commit -m "feat(granola-sync): transformNote maps API response to meeting_items JSONB"
```

---

### Task 5: Granola API helpers — `fetchWithRetry`, `fetchGranolaNotes`, `fetchNoteDetail`

**Files:**
- Modify: `dashboard-server/lib/granola-sync.js`
- Modify: `dashboard-server/tests/unit/granola-sync.test.mjs`

- [ ] **Step 1: Write failing tests for API helpers**

Append to test file:

```js
const { fetchWithRetry, fetchGranolaNotes, fetchNoteDetail } = require('../../lib/granola-sync');

describe('fetchWithRetry', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('returns parsed JSON on 200', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: 'ok' }) }));
    const result = await fetchWithRetry('https://example.com/test', { Authorization: 'Bearer grn_test' });
    expect(result).toEqual({ data: 'ok' });
  });

  it('retries on 429 up to 3 times then throws', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 429, headers: { get: () => null } }));
    await expect(fetchWithRetry('https://example.com/test', { Authorization: 'Bearer grn_test' }, { maxRetries: 3, baseDelayMs: 1 }))
      .rejects.toThrow('429');
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('throws on 401 without retry', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401 }));
    await expect(fetchWithRetry('https://example.com/test', { Authorization: 'Bearer grn_bad' }, { maxRetries: 3, baseDelayMs: 1 }))
      .rejects.toThrow('401');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns null on 404', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    const result = await fetchWithRetry('https://example.com/test', { Authorization: 'Bearer grn_test' });
    expect(result).toBeNull();
  });
});

describe('fetchGranolaNotes', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('collects notes across paginated responses', async () => {
    const page1 = { notes: [{ id: 'a', title: 'A' }], hasMore: true, cursor: 'cur1' };
    const page2 = { notes: [{ id: 'b', title: 'B' }], hasMore: false, cursor: null };
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });

    const notes = await fetchGranolaNotes('grn_test', '2026-06-01T00:00:00Z');
    expect(notes).toEqual([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toContain('cursor=cur1');
  });

  it('returns empty array when no notes', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ notes: [], hasMore: false }) }));
    const notes = await fetchGranolaNotes('grn_test', '2026-06-01T00:00:00Z');
    expect(notes).toEqual([]);
  });
});

describe('fetchNoteDetail', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('returns note object on success', async () => {
    const note = { id: 'abc', title: 'Test', summary: 'Sum' };
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(note) }));
    const result = await fetchNoteDetail('grn_test', 'abc');
    expect(result).toEqual(note);
  });

  it('returns null on 404', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    const result = await fetchNoteDetail('grn_test', 'missing');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: New tests FAIL — functions not exported

- [ ] **Step 3: Implement API helpers**

Add to `dashboard-server/lib/granola-sync.js` before `module.exports`:

```js
const GRANOLA_BASE = 'https://public-api.granola.ai/v1';
const RATE_DELAY_MS = 250;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, headers, opts = {}) {
  const { maxRetries = 3, baseDelayMs = 5000 } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await sleep(baseDelayMs * Math.pow(2, attempt - 1));
    const resp = await fetch(url, { headers });
    if (resp.ok) return resp.json();
    if (resp.status === 404) return null;
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(`Granola API ${resp.status}: invalid or expired GRANOLA_API_KEY`);
    }
    if (resp.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(resp.headers.get('Retry-After') || '0', 10);
      if (retryAfter > 0) await sleep(retryAfter * 1000);
      continue;
    }
    lastErr = new Error(`Granola API ${resp.status}`);
  }
  throw lastErr;
}

async function fetchGranolaNotes(apiKey, createdAfter) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const allNotes = [];
  let cursor = null;

  do {
    let url = `${GRANOLA_BASE}/notes?created_after=${encodeURIComponent(createdAfter)}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    const data = await fetchWithRetry(url, headers);
    if (!data) break;
    allNotes.push(...(data.notes || []));
    cursor = data.hasMore ? data.cursor : null;
  } while (cursor);

  return allNotes;
}

async function fetchNoteDetail(apiKey, noteId) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  await sleep(RATE_DELAY_MS);
  return fetchWithRetry(`${GRANOLA_BASE}/notes/${noteId}`, headers);
}
```

Update `module.exports`:

```js
module.exports = { matchWorkstream, matchCalendarEvent, transformNote, fetchWithRetry, fetchGranolaNotes, fetchNoteDetail };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: All 27 tests PASS

- [ ] **Step 5: Commit**

```
git add dashboard-server/lib/granola-sync.js dashboard-server/tests/unit/granola-sync.test.mjs
git commit -m "feat(granola-sync): API helpers with retry, pagination, rate limiting"
```

---

### Task 6: `syncGranolaMeetings` orchestrator + integration tests

**Files:**
- Modify: `dashboard-server/lib/granola-sync.js`
- Modify: `dashboard-server/tests/unit/granola-sync.test.mjs`

- [ ] **Step 1: Write failing integration tests**

Append to test file. These tests mock `pool.query` and `global.fetch` to test the full sync flow without a real DB or API:

```js
const { syncGranolaMeetings } = require('../../lib/granola-sync');

function makeMockPool(queryResults = {}) {
  const calls = [];
  return {
    query: vi.fn(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('granola_last_sync') && sql.startsWith('SELECT')) {
        return queryResults.hwm || { rows: [] };
      }
      if (sql.includes("MAX(data->>'date')")) {
        return queryResults.maxDate || { rows: [{ max: '2026-05-22' }] };
      }
      if (sql.includes('SELECT id, name FROM clients')) {
        return queryResults.clients || { rows: [{ id: '1', name: 'Couch Heroes' }] };
      }
      if (sql.includes('INSERT INTO meeting_items')) {
        return queryResults.insert || { rowCount: 1 };
      }
      if (sql.includes('UPDATE meeting_metadata')) {
        return { rowCount: 1 };
      }
      if (sql.includes('INSERT INTO settings')) {
        return { rowCount: 1 };
      }
      if (sql.includes("role = 'admin'")) {
        return queryResults.admins || { rows: [{ username: 'glen' }] };
      }
      return { rows: [], rowCount: 0 };
    }),
    _calls: calls,
  };
}

function makeGranolaNote(id, title, date) {
  return {
    id, title,
    created_at: `${date}T12:00:00.000Z`,
    owner: { name: 'Glen Pryer', email: 'gpryer@nbi-consulting.com' },
    summary: `### ${title}\n\nSummary content for ${title}`,
  };
}

describe('syncGranolaMeetings', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.GRANOLA_API_KEY;
  afterEach(() => { global.fetch = originalFetch; process.env.GRANOLA_API_KEY = originalEnv; });

  it('skips when GRANOLA_API_KEY not set', async () => {
    delete process.env.GRANOLA_API_KEY;
    const pool = makeMockPool();
    const log = vi.fn();
    const result = await syncGranolaMeetings({ pool, log, createNotification: vi.fn(), _msalClient: null });
    expect(result.skipped).toBe(true);
    expect(log).toHaveBeenCalledWith('info', 'GranolaSync', expect.stringContaining('not set'), expect.anything());
  });

  it('imports new notes on first run (no HWM)', async () => {
    process.env.GRANOLA_API_KEY = 'grn_test';
    const note1 = makeGranolaNote('aaa', 'Couch Heroes Weekly', '2026-06-03');
    const note2 = makeGranolaNote('bbb', 'HR Meeting', '2026-06-04');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ notes: [{ id: 'aaa' }, { id: 'bbb' }], hasMore: false }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(note1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(note2) });

    const pool = makeMockPool();
    const log = vi.fn();
    const createNotification = vi.fn();
    const result = await syncGranolaMeetings({ pool, log, createNotification, _msalClient: null });

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(0);
    const inserts = pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO meeting_items'));
    expect(inserts.length).toBe(2);
    expect(createNotification).toHaveBeenCalledWith('glen', 'info', expect.stringContaining('2 new meeting'), expect.anything(), '#command-centre/meetings', expect.anything());
  });

  it('uses existing HWM on subsequent runs', async () => {
    process.env.GRANOLA_API_KEY = 'grn_test';
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ notes: [], hasMore: false }) });

    const pool = makeMockPool({ hwm: { rows: [{ value: '2026-06-05T07:00:00.000Z' }] } });
    const log = vi.fn();
    const result = await syncGranolaMeetings({ pool, log, createNotification: vi.fn(), _msalClient: null });

    expect(result.imported).toBe(0);
    const fetchUrl = global.fetch.mock.calls[0][0];
    expect(fetchUrl).toContain('created_after=2026-06-05T07%3A00%3A00.000Z');
  });

  it('does not advance HWM on partial failure', async () => {
    process.env.GRANOLA_API_KEY = 'grn_test';
    const note1 = makeGranolaNote('aaa', 'Good Meeting', '2026-06-03');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ notes: [{ id: 'aaa' }, { id: 'bbb' }], hasMore: false }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(note1) })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const pool = makeMockPool();
    const log = vi.fn();
    const result = await syncGranolaMeetings({ pool, log, createNotification: vi.fn(), _msalClient: null });

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(1);
    const hwmWrites = pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO settings'));
    expect(hwmWrites.length).toBe(0);
  });

  it('does not overwrite compiled source records', async () => {
    process.env.GRANOLA_API_KEY = 'grn_test';
    const note1 = makeGranolaNote('aaa', 'Existing Compiled Meeting', '2026-06-03');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ notes: [{ id: 'aaa' }], hasMore: false }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(note1) });

    const pool = makeMockPool();
    const log = vi.fn();
    await syncGranolaMeetings({ pool, log, createNotification: vi.fn(), _msalClient: null });

    const insertCall = pool.query.mock.calls.find(c => c[0].includes('INSERT INTO meeting_items'));
    expect(insertCall[0]).toContain("WHERE meeting_items.source = 'granola_api'");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: syncGranolaMeetings tests FAIL — `syncGranolaMeetings is not a function`

- [ ] **Step 3: Implement `syncGranolaMeetings`**

Add to `dashboard-server/lib/granola-sync.js` before `module.exports`:

```js
const { fetchCalendarEvents } = require('./graph-calendar');

async function syncGranolaMeetings(ctx) {
  const { pool, log, createNotification, _msalClient } = ctx;
  const apiKey = process.env.GRANOLA_API_KEY;

  if (!apiKey) {
    log('info', 'GranolaSync', 'GRANOLA_API_KEY not set, skipping', {});
    return { skipped: true };
  }

  const syncStartedAt = new Date().toISOString();
  const startTime = Date.now();

  // Determine HWM
  const { rows: hwmRows } = await pool.query("SELECT value FROM settings WHERE key = 'granola_last_sync'");
  let hwm;
  let isFirstRun = false;
  if (hwmRows.length > 0 && hwmRows[0].value) {
    hwm = hwmRows[0].value;
  } else {
    isFirstRun = true;
    const { rows: maxRows } = await pool.query("SELECT MAX(data->>'date') as max FROM meeting_items WHERE section = 'meetings'");
    const maxDate = maxRows[0]?.max || '2026-01-01';
    hwm = `${maxDate}T00:00:00.000Z`;
  }

  log('info', 'GranolaSync', 'Starting', { hwm, isFirstRun });

  // Step 1: Poll for new notes
  let noteStubs;
  try {
    noteStubs = await fetchGranolaNotes(apiKey, hwm);
  } catch (e) {
    log('error', 'GranolaSync', 'Failed to poll notes', { error: e.message });
    try {
      const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin' AND is_active = true");
      for (const admin of admins) {
        await createNotification(admin.username, 'warning', 'Granola sync failed', e.message, '#command-centre/meetings', false);
      }
    } catch (_) {}
    return { imported: 0, failed: 0, error: e.message };
  }

  if (noteStubs.length === 0) {
    log('info', 'GranolaSync', 'No new notes', { hwm });
    await pool.query("INSERT INTO settings (key, value) VALUES ('granola_last_sync', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [syncStartedAt]);
    return { imported: 0, failed: 0, skipped: 0, durationMs: Date.now() - startTime };
  }

  // Step 2: Fetch full content for each note
  const notes = [];
  const failedNotes = [];
  for (const stub of noteStubs) {
    try {
      const detail = await fetchNoteDetail(apiKey, stub.id);
      if (detail) notes.push(detail);
    } catch (e) {
      log('warn', 'GranolaSync', 'Failed to fetch note detail', { noteId: stub.id, error: e.message });
      failedNotes.push(stub.id);
    }
  }

  // Step 3: Calendar cross-reference
  let calendarEvents = [];
  if (_msalClient && notes.length > 0) {
    try {
      const dates = notes.map(n => new Date(n.created_at)).sort((a, b) => a - b);
      const padStart = new Date(dates[0].getTime() - 60 * 60 * 1000);
      const padEnd = new Date(dates[dates.length - 1].getTime() + 3 * 60 * 60 * 1000);
      const calResult = await fetchCalendarEvents(_msalClient, padStart, padEnd);
      calendarEvents = calResult.events || [];
      if (calResult.error) log('warn', 'GranolaSync', 'Calendar fetch issue', { error: calResult.error });
    } catch (e) {
      log('warn', 'GranolaSync', 'Calendar cross-reference failed', { error: e.message });
    }
  } else if (!_msalClient) {
    log('info', 'GranolaSync', 'MSAL not configured, skipping attendee enrichment', {});
  }

  // Step 4+5: Transform + client matching
  const { rows: clients } = await pool.query('SELECT id, name FROM clients');

  // Step 6: Upsert into DB
  let imported = 0;
  const failedInserts = [];
  for (const note of notes) {
    try {
      const { item_id, data } = transformNote(note, clients, calendarEvents);
      await pool.query(
        `INSERT INTO meeting_items (item_id, section, data, source)
         VALUES ($1, 'meetings', $2, 'granola_api')
         ON CONFLICT (item_id) DO UPDATE SET
           data = EXCLUDED.data,
           source = EXCLUDED.source,
           updated_at = now()
         WHERE meeting_items.source = 'granola_api'`,
        [item_id, JSON.stringify(data)]
      );
      imported++;
      log('info', 'GranolaSync', 'Imported', { title: data.title, date: data.date, workstream: data.workstream, hasAttendees: data.attendees.length > 0 });
    } catch (e) {
      log('error', 'GranolaSync', 'DB insert failed', { noteId: note.id, error: e.message });
      failedInserts.push(note.id);
    }
  }

  // Step 7: Post-sync
  try {
    await pool.query(`UPDATE meeting_metadata SET
      meeting_count = (SELECT COUNT(*) FROM meeting_items WHERE section = 'meetings'),
      date_range_end = (SELECT MAX(data->>'date') FROM meeting_items WHERE section = 'meetings'),
      updated_at = now()
    WHERE id = 1`);
  } catch (e) {
    log('warn', 'GranolaSync', 'Failed to update meeting_metadata', { error: e.message });
  }

  // Only advance HWM if zero insert failures and zero fetch failures
  if (failedInserts.length === 0 && failedNotes.length === 0) {
    await pool.query("INSERT INTO settings (key, value) VALUES ('granola_last_sync', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [syncStartedAt]);
  }

  const durationMs = Date.now() - startTime;

  // Notifications
  try {
    const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin' AND is_active = true");
    if (imported > 0 && failedNotes.length === 0 && failedInserts.length === 0) {
      for (const admin of admins) {
        await createNotification(admin.username, 'info', `Granola sync: ${imported} new meeting(s) imported`, '', '#command-centre/meetings', false);
      }
    } else if (failedNotes.length > 0 || failedInserts.length > 0) {
      const totalFailed = failedNotes.length + failedInserts.length;
      for (const admin of admins) {
        await createNotification(admin.username, 'warning', `Granola sync: ${imported} imported, ${totalFailed} failed -- check server logs`, '', '#command-centre/meetings', false);
      }
    }
  } catch (e) {
    log('warn', 'GranolaSync', 'Failed to create notification', { error: e.message });
  }

  log('info', 'GranolaSync', 'Complete', { imported, skipped: noteStubs.length - notes.length - failedNotes.length, failed: failedNotes.length + failedInserts.length, durationMs });

  return { imported, failed: failedNotes.length + failedInserts.length, durationMs };
}
```

After the HWM advancement and before the notification block, add metrics increments:

```js
  // Metrics
  try {
    const promClient = require('prom-client');
    const imported_ctr = promClient.register.getSingleMetric('nbi_granola_sync_imported_total');
    const last_success = promClient.register.getSingleMetric('nbi_granola_sync_last_success');
    const errors_ctr = promClient.register.getSingleMetric('nbi_granola_sync_errors_total');
    if (imported_ctr) imported_ctr.inc(imported);
    if (errors_ctr && (failedNotes.length + failedInserts.length) > 0) errors_ctr.inc(failedNotes.length + failedInserts.length);
    if (last_success && failedInserts.length === 0 && failedNotes.length === 0) last_success.set(Date.now() / 1000);
  } catch (_) {}
```

Update `module.exports`:

```js
module.exports = { matchWorkstream, matchCalendarEvent, transformNote, fetchWithRetry, fetchGranolaNotes, fetchNoteDetail, syncGranolaMeetings };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/granola-sync.test.mjs`
Expected: All 31 tests PASS

- [ ] **Step 5: Commit**

```
git add dashboard-server/lib/granola-sync.js dashboard-server/tests/unit/granola-sync.test.mjs
git commit -m "feat(granola-sync): syncGranolaMeetings orchestrator with full pipeline"
```

---

### Task 7: Cron registration, admin endpoint, metrics, CC status

**Files:**
- Modify: `dashboard-server/cron/index.js`
- Modify: `dashboard-server/routes/admin.js`
- Modify: `dashboard-server/lib/metrics.js`
- Modify: `dashboard-server/routes/command-centre.js` (connection scanner)

- [ ] **Step 1: Add Prometheus metrics**

In `dashboard-server/lib/metrics.js`, before the `return` statement (line 61), add:

```js
  const granolaImported = new promClient.Counter({ name: 'nbi_granola_sync_imported_total', help: 'Granola meetings imported' });
  const granolaLastSuccess = new promClient.Gauge({ name: 'nbi_granola_sync_last_success', help: 'Timestamp of last successful Granola sync' });
  const granolaErrors = new promClient.Counter({ name: 'nbi_granola_sync_errors_total', help: 'Granola sync errors' });
```

Update the `return` statement to include the new metrics:

```js
  return { syncConflicts, authFailures, ocrRequests, emailSends, granolaImported, granolaLastSuccess, granolaErrors };
```

- [ ] **Step 2: Register cron job**

In `dashboard-server/cron/index.js`, after the hiring stall reminders block (after line 1026), before the `return` statement, add:

```js
// Granola meeting sync — 07:00 daily
if (cron && process.env.GRANOLA_API_KEY) {
  const { syncGranolaMeetings } = require('../lib/granola-sync');
  cron.schedule('0 7 * * *', async () => {
    log('info', 'Cron', 'Running Granola meeting sync...');
    try {
      const result = await syncGranolaMeetings({ pool, log, createNotification, _msalClient: ctx._msalClient });
      log('info', 'Cron', 'Granola sync finished', result);
    } catch (e) {
      log('error', 'Cron', 'Granola sync failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Granola meeting sync scheduled for 07:00 daily');
}
```

Note: `_msalClient` is not currently in the cron module's `ctx`. Check the cron factory call in `server.js` to see what's passed. If `_msalClient` is not available, pass `null` — the sync will proceed without attendee enrichment, which is the correct fallback per spec. The admin endpoint (Task 7, Step 3) has direct access to `_msalClient` from its route context.

- [ ] **Step 3: Add admin manual-trigger endpoint**

In `dashboard-server/routes/admin.js`, after the last route definition and before `return router`, add:

```js
let lastGranolaSyncTrigger = 0;
router.post('/api/admin/granola-sync', requireNBI, requireAdmin, async (req, res) => {
  const now = Date.now();
  if (now - lastGranolaSyncTrigger < 5 * 60 * 1000) {
    return res.status(429).json({ error: 'Granola sync can only be triggered once every 5 minutes' });
  }
  lastGranolaSyncTrigger = now;
  try {
    const { syncGranolaMeetings } = require('../lib/granola-sync');
    const result = await syncGranolaMeetings({ pool, log, createNotification: ctx.createNotification, _msalClient: ctx._msalClient || null });
    res.json(result);
  } catch (e) {
    log('error', 'Admin', 'Manual Granola sync failed', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});
```

Check what `ctx` provides in the admin route — it has `pool`, `log`, `requireNBI`, `requireAdmin`. It may not have `createNotification` or `_msalClient`. Inspect the route registration in `server.js` to confirm and add those to the context if needed.

- [ ] **Step 4: Update CC connection scanner for Granola status**

In `dashboard-server/routes/command-centre.js`, in the `scanConnections()` function, after the `KNOWN_CLOUD_MCPS.forEach` loop (around line 163), add Granola-specific status logic:

```js
    // Granola sync status override
    if (process.env.GRANOLA_API_KEY) {
      try {
        const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'granola_last_sync'");
        if (rows.length > 0 && rows[0].value) {
          const lastSync = new Date(rows[0].value);
          const ageMs = Date.now() - lastSync.getTime();
          const ageH = ageMs / (1000 * 60 * 60);
          if (ageH < 48) {
            result.buckets.meetings = { status: 'connected', sources: ['Granola (API sync)'], lastSync: rows[0].value };
          } else if (ageH < 168) {
            result.buckets.meetings = { status: 'stale', sources: ['Granola (API sync)'], lastSync: rows[0].value };
          } else {
            result.buckets.meetings = { status: 'error', sources: ['Granola (API sync)'], lastSync: rows[0].value };
          }
        } else {
          result.buckets.meetings = { status: 'connected', sources: ['Granola (API key set, awaiting first sync)'] };
        }
      } catch (_) {}
    }
```

Note: `scanConnections` is currently synchronous. Since we're adding a DB query, either make it async or use a cached value. The simplest approach: make `scanConnections` async and await it at its call site. Check where it's called and update the caller to `await scanConnections()`.

- [ ] **Step 5: Run all tests to verify no regressions**

Run: `cd dashboard-server && npx vitest run`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```
git add dashboard-server/lib/metrics.js dashboard-server/cron/index.js dashboard-server/routes/admin.js dashboard-server/routes/command-centre.js
git commit -m "feat(granola-sync): cron registration, admin endpoint, metrics, CC status"
```

---

### Task 8: Wire up `_msalClient` and `createNotification` to cron + admin contexts

This task ensures the sync can actually access MSAL and notifications from the cron and admin route contexts. The exact changes depend on what `server.js` passes to each module.

**Files:**
- Modify: `dashboard-server/server.js` (cron context and admin route context)

- [ ] **Step 1: Check what server.js passes to cron and admin route factories**

Read the relevant sections of `server.js` where `require('./cron/index')` and `require('./routes/admin')` are called. Identify whether `_msalClient` and `createNotification` are in those contexts.

- [ ] **Step 2: Add `_msalClient` and `createNotification` to contexts if missing**

If the cron factory call doesn't include `_msalClient`, add it:

```js
// In server.js where cron module is initialised:
const cronFns = require('./cron/index')({ ..., _msalClient });
```

If the admin route factory call doesn't include `createNotification` or `_msalClient`, add them:

```js
// In server.js where admin routes are mounted:
app.use(require('./routes/admin')({ ..., createNotification, _msalClient }));
```

- [ ] **Step 3: Run full test suite**

Run: `cd dashboard-server && npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```
git add dashboard-server/server.js
git commit -m "feat(granola-sync): wire _msalClient and createNotification into cron + admin contexts"
```

---

### Task 9: End-to-end verification

**Files:** None created/modified. Verification only.

- [ ] **Step 1: Run full test suite**

Run: `cd dashboard-server && npm run test:all`
Expected: All unit tests and e2e tests pass.

- [ ] **Step 2: Verify server starts cleanly**

Run: `cd dashboard-server && node server.js`

Watch logs for:
- `Granola meeting sync scheduled for 07:00 daily` (if `GRANOLA_API_KEY` is set in .env)
- No errors related to granola-sync, graph-calendar, or metrics

If `GRANOLA_API_KEY` is not yet set, that's expected — the cron just won't register.

- [ ] **Step 3: Test manual trigger (once API key is configured)**

After Glen adds `GRANOLA_API_KEY` to `.env` and restarts PM2:

```
curl -X POST http://localhost:8888/api/admin/granola-sync -H "Cookie: <session>"
```

Expected: JSON response with `{ imported: N, failed: 0, durationMs: ... }` where N matches the number of new Granola meetings since May 22.

- [ ] **Step 4: Final commit with all files**

```
git add -A
git status  # verify only expected files
git commit -m "feat: Granola auto-sync — daily cron + calendar enrichment + manual trigger"
```
