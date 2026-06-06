# Granola Auto-Sync — Design Spec

**Date:** 2026-06-06
**Branch:** `feature/command-centre`
**Status:** Design approved, ready for implementation planning

---

## Problem

Granola meeting notes are only in WorkSage if manually imported. The one-time seed script (`scripts/seed-meeting-records.js`) imported 112 meetings on 2026-06-03 covering 2026-03-26 to 2026-05-22. Everything since May 22 is missing. New meetings should appear in WorkSage automatically without Claude running.

## Solution

Server-side cron job in dashboard-server that polls Granola's public REST API daily at 07:00 and inserts new meeting records into the `meeting_items` table. Cross-references Microsoft Graph calendar for attendee enrichment.

---

## Architecture

### Files

| File | Purpose |
|---|---|
| `dashboard-server/lib/granola-sync.js` | Sync logic. Exports `syncGranolaMeetings(ctx)` and all internal functions for unit testing. |
| `dashboard-server/lib/graph-calendar.js` | Extracted from command-centre.js: `fetchCalendarEvents(msalClient, startDate, endDate)`. Shared between CC route and granola-sync. |
| `dashboard-server/routes/command-centre.js` | Modified: replace inline `fetchCalendarEvents` with import from `lib/graph-calendar.js`. |
| `dashboard-server/cron/index.js` | Cron registration at 07:00 daily. |
| `dashboard-server/routes/admin.js` | Add `POST /api/admin/granola-sync` endpoint for manual trigger. |
| `dashboard-server/tests/unit/granola-sync.test.mjs` | Unit + integration tests with mocked fetch. |

No new migration needed. Uses existing `meeting_items` table (migration 061) with `source_id` unique index (migration 063) and `settings` table for high-water mark.

### Dependencies

- Granola public REST API: `https://public-api.granola.ai/v1`
- Microsoft Graph API (calendar): already integrated via MSAL in command-centre.js
- Existing libs: `meetings-intelligence.js` (for `generateItemId`)

---

## Auth & Config

### Granola API Key

- Env var: `GRANOLA_API_KEY`
- Format: `grn_*` bearer token
- Generated via: Granola desktop app > Settings > Connectors > API keys > scope: Personal notes
- If missing: cron logs `'Granola sync: GRANOLA_API_KEY not set, skipping'` at info level, returns `{ skipped: true }`. No notification, no error.

### Graph API (Calendar)

- Uses existing MSAL client credential flow (`_msalClient`) from server.js
- If MSAL not configured: sync proceeds without attendee enrichment. Logs once: `'Granola sync: MSAL not configured, skipping attendee enrichment'`

---

## High-Water Mark

Stored in the `settings` table:
- Key: `granola_last_sync`
- Value: ISO 8601 timestamp of when the sync last successfully ran

### First Run

No `granola_last_sync` exists in settings. Query:
```sql
SELECT MAX(data->>'date') FROM meeting_items WHERE section = 'meetings'
```
Result: `2026-05-22`. Use `2026-05-22T00:00:00Z` as `created_after`. First run fetches everything from May 22 onwards. Existing meetings with matching `item_id` are skipped by the upsert's WHERE guard.

### Subsequent Runs

Capture `syncStartedAt = new Date().toISOString()` before polling begins. After successful completion (zero DB errors), write this as the new HWM:
```sql
INSERT INTO settings (key, value) VALUES ('granola_last_sync', $1)
ON CONFLICT (key) DO UPDATE SET value = $1
```

The HWM tracks poll time, not meeting date. A meeting recorded May 30 but processed by Granola's AI on June 5 is picked up because `created_after` filters by note creation time in Granola's system, not meeting date.

### HWM Advancement Rule

Only advance if zero DB insert errors occurred during the run. If any insert fails, keep the old HWM so the next run retries everything. 404s (note not yet processed by Granola AI) and calendar failures do NOT block HWM advancement -- those are expected/recoverable.

---

## Sync Pipeline

### Step 1: Poll for New Notes

```
GET https://public-api.granola.ai/v1/notes?created_after={hwm}
Authorization: Bearer {GRANOLA_API_KEY}

Response: { notes: [{id, title, created_at, ...}], hasMore: boolean, cursor: string }
```

Paginate with cursor until `hasMore === false`. Collect all note stubs into a flat array.

If empty: log `'no new notes since {hwm}'`, update HWM, return `{ imported: 0 }`.

### Step 2: Fetch Full Content

For each note stub:
```
GET https://public-api.granola.ai/v1/notes/{id}
```

No `?include=transcript` -- transcripts are large (thousands of lines) and low-signal vs the AI summary. Not fetched or stored.

**Rate control:**
- Sequential requests, not parallel
- 250ms delay between each request (4 req/s, under the 5/s sustained limit)
- On HTTP 429: wait `Retry-After` header value (or 5s default), retry up to 3 times
- On 5xx or network error: log note id + error, push to `failedNotes` array, continue to next
- On 404: debug log `"note not yet processed by Granola AI"`, skip (will appear on future run)

### Step 3: Calendar Cross-Reference for Attendees

**Refactor:** Extract `fetchCalendarEvents` from `routes/command-centre.js` into `lib/graph-calendar.js`. The CC route imports from there instead. Function signature:

```js
async function fetchCalendarEvents(msalClient, startDate, endDate)
// Returns: { events: [{ title, start, end, attendees: [string], location, online_url }], error? }
```

**Batch calendar fetch:** Determine the date range of new Granola notes (earliest `created_at` to latest `created_at`), pad by -1 hour and +3 hours, make a single `fetchCalendarEvents` call for the entire range.

**Matching algorithm for each Granola note:**
1. Filter calendar events where `note.created_at` falls within `[event.start - 15min, event.end + 15min]`
2. If multiple matches: score by title word overlap (count of shared words, case-insensitive, ignoring common words like "meeting", "call", "weekly"). Pick highest score.
3. If match found: use calendar event's `attendees` array (name strings)
4. If no match: `attendees` stays as empty array

If MSAL not configured: skip entire calendar step. All attendees empty.

### Step 4: Transform

Map each Granola API note + calendar match to `meeting_items` JSONB `data` field:

| Field | Source | Detail |
|---|---|---|
| `date` | `note.created_at` | Truncate to `YYYY-MM-DD` |
| `title` | `note.title` | `trim()` |
| `attendees` | Calendar match | Array of name strings from matched calendar event. Empty array if no match. |
| `topics` | -- | Empty array. Granola REST API doesn't provide structured topics. Can be manually added via CC edit UI. |
| `summary` | `note.summary` | **Full text, not truncated.** Granola AI summaries are 500-3000 chars of structured markdown with `###` topic headers. This is the core value of the meeting record. |
| `decisions_text` | -- | Empty string. Granola summaries embed decisions within `###` topic sections, not in a discrete `## Decisions` block. Extraction would require LLM. Out of scope. |
| `context` | -- | Empty string. Same reasoning as decisions_text. |
| `source_id` | `note.id` | Full Granola note UUID. Different format from seed data (`granola_XXXXXXXX`) but `item_id` dedup prevents collision. |
| `source_path` | `note.id` | `granola://meetings/{id}` |
| `workstream` | Title + DB | Client name matching (see below) |
| `owner_name` | `note.owner.name` | New field not in seed data. Identifies the note taker. |
| `owner_email` | `note.owner.email` | New field. |

**`item_id` generation:** Uses existing `generateItemId('meetings', data)` from `lib/meetings-intelligence.js`. Produces `mtg_YYYYMMDD_slug` -- deterministic from date + title.

### Step 5: Client Matching

```js
async function matchWorkstream(title, clients) {
  const titleLower = title.toLowerCase();
  let best = null;
  for (const client of clients) {
    const nameLower = client.name.toLowerCase();
    if (titleLower.includes(nameLower)) {
      if (!best || nameLower.length > best.nameLower.length) {
        best = { nameLower, workstream: client.name };
      }
    }
  }
  return best?.workstream || null;
}
```

Dynamic -- queries `SELECT id, name FROM clients` once at sync start. No hardcoded map. New clients added to the DB are automatically matched on next sync.

Covers observed title patterns:
- "Couch Heroes, Art Producer - Fred Dossola" -> "Couch Heroes"
- "HR- Weekly meeting" -> null (no client named "HR")
- "check in [Justin Logan from Lighthouse]" -> "Lighthouse" (if client name)
- "VS Resource Planning Env Sync" -> null (unless "VS" matches a client)

### Step 6: Insert / Upsert

```sql
INSERT INTO meeting_items (item_id, section, data, source)
VALUES ($1, 'meetings', $2, 'granola_api')
ON CONFLICT (item_id) DO UPDATE SET
  data = EXCLUDED.data,
  source = EXCLUDED.source,
  updated_at = now()
WHERE meeting_items.source = 'granola_api'
```

**Upsert, not insert-only.** If Glen edits a note's summary in Granola after the initial sync, the next run picks up the change. The `WHERE source = 'granola_api'` guard prevents overwriting records that were `'compiled'` (seed import) and may have been manually enriched with topics, decisions, or other curated data.

`source` value `'granola_api'` is distinct from `'compiled'` and `'manual'`, allowing queries and UI to differentiate provenance.

### Step 7: Post-Sync

**Update meeting_metadata:**
```sql
UPDATE meeting_metadata SET
  meeting_count = (SELECT COUNT(*) FROM meeting_items WHERE section = 'meetings'),
  date_range_end = (SELECT MAX(data->>'date') FROM meeting_items WHERE section = 'meetings'),
  updated_at = now()
WHERE id = 1
```

**Advance HWM:** Only if `failedInserts.length === 0` (see error matrix).

**Notifications:**
- `imported > 0`: Notification to all admin users, type `'info'`: `"Granola sync: {N} new meeting(s) imported"`, link: `'#command-centre/meetings'`
- `imported === 0`: No notification. Info log only.
- Any errors: Warning notification: `"Granola sync: {imported} imported, {failed} failed -- check server logs"`, type `'warning'`

---

## Error Matrix

| Scenario | Behaviour | HWM advances? |
|---|---|---|
| `GRANOLA_API_KEY` missing | Info log, return `{skipped: true}` | No |
| API unreachable / DNS error | Error log + warning notification | No |
| 401 Unauthorized | Error log `"invalid or expired GRANOLA_API_KEY"` + warning notification | No |
| 429 rate limited on a note | Backoff (Retry-After or 5s), retry 3x. If still 429, add to `failedNotes`, continue. | Only if `failedNotes.length === 0` |
| 404 on individual note | Debug log `"note not yet processed"`, skip | Yes (expected) |
| 5xx on individual note | Warn log, add to `failedNotes`, continue | Only if `failedNotes.length === 0` |
| DB insert error | Error log per item, add to `failedInserts`, continue | No |
| MSAL not configured | Info log once, skip attendee enrichment | Yes |
| Calendar event not matched | Attendees empty for that meeting | Yes |

---

## Observability

### Prometheus Metrics

Via existing `prom-client` setup:
- `nbi_granola_sync_imported_total` (counter) -- incremented per successful meeting import
- `nbi_granola_sync_last_success` (gauge) -- unix timestamp of last successful run
- `nbi_granola_sync_errors_total` (counter) -- incremented per failed API request or DB error

### Structured Logging

Uses existing `log(level, category, message, meta)` pattern:
- Start: `log('info', 'GranolaSync', 'Starting', { hwm, isFirstRun })`
- Per import: `log('info', 'GranolaSync', 'Imported', { title, date, workstream, hasAttendees: bool })`
- End: `log('info', 'GranolaSync', 'Complete', { imported, skipped, failed, durationMs })`
- Errors: `log('error', 'GranolaSync', 'API failed', { noteId, status, message })`

### Command Centre Connection Status

The CC connections scan already has `{ name: 'Granola', bucket: 'meetings' }`. Update scan logic:
- `GRANOLA_API_KEY` set + `granola_last_sync` < 48h: status `'connected'`
- `GRANOLA_API_KEY` set + `granola_last_sync` 48h-7d: status `'stale'`
- `GRANOLA_API_KEY` set + `granola_last_sync` > 7d or missing: status `'error'`
- `GRANOLA_API_KEY` not set: status `'not_configured'`

---

## Cron Registration

In `cron/index.js`, after the dreaming engine block:

```js
if (cron && process.env.GRANOLA_API_KEY) {
  const { syncGranolaMeetings } = require('../lib/granola-sync');
  cron.schedule('0 7 * * *', async () => {
    log('info', 'Cron', 'Running Granola meeting sync...');
    try {
      const result = await syncGranolaMeetings({ pool, log, createNotification, _msalClient });
      log('info', 'Cron', 'Granola sync finished', result);
    } catch (e) {
      log('error', 'Cron', 'Granola sync failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Granola meeting sync scheduled for 07:00 daily');
}
```

---

## Tests

All in `tests/unit/granola-sync.test.mjs` using Vitest with mocked `global.fetch`.

### Transform Tests

| Test | Assertion |
|---|---|
| `transformNote -- standard meeting` | Granola API response matching real format (HR weekly fixture) produces correct JSONB with all fields. |
| `transformNote -- empty summary` | `summary` is empty string, not null/undefined. Other fields correct. |
| `transformNote -- title whitespace` | Leading/trailing whitespace trimmed. `item_id` slug is clean. |
| `transformNote -- with calendar attendees` | Matched calendar event attendees populate the `attendees` array. |
| `transformNote -- without calendar match` | No calendar match results in empty `attendees` array. |

### Client Matching Tests

| Test | Assertion |
|---|---|
| `matchWorkstream -- exact match in title` | "Couch Heroes, Art Producer" -> "Couch Heroes" |
| `matchWorkstream -- longest match wins` | Clients "NBI" + "NBI Analytics", title "NBI Analytics meeting" -> "NBI Analytics" |
| `matchWorkstream -- no match` | "HR Weekly Meeting" -> null |
| `matchWorkstream -- case insensitive` | "couch heroes weekly" matches "Couch Heroes" |

### Calendar Matching Tests

| Test | Assertion |
|---|---|
| `matchCalendarEvent -- time window match` | Note at 13:00, calendar event 13:00-14:00 -> matched, attendees returned |
| `matchCalendarEvent -- no overlap` | Note at 13:00, nearest event at 16:00 -> no match, empty attendees |
| `matchCalendarEvent -- multiple overlaps` | Two overlapping events; one with closer title match wins |
| `matchCalendarEvent -- edge of window` | Note at 12:46, event starts 13:00 (within 15min pad) -> matched |

### Integration Tests (mocked HTTP)

| Test | Assertion |
|---|---|
| `sync -- normal flow` | Mocked API returns 3 notes, mocked calendar returns matches. 3 DB inserts with correct data, HWM advanced, notification created. |
| `sync -- empty result` | API returns `{ notes: [], hasMore: false }`. 0 inserts, HWM advanced, no notification. |
| `sync -- first run, no HWM` | No `granola_last_sync` in settings. Asserts query for max date. Asserts `created_after` uses that date. |
| `sync -- pagination` | First page `hasMore: true` with cursor, second page `hasMore: false`. All notes from both pages imported. |
| `sync -- API error` | API returns 500. Error logged, warning notification, HWM NOT advanced. |
| `sync -- partial failure` | 3 notes, 1 returns 500. 2 imported, 1 failed, HWM NOT advanced. |
| `sync -- upsert updates granola_api source` | Existing `source='granola_api'` record with same item_id. Data updated. |
| `sync -- upsert skips compiled source` | Existing `source='compiled'` record with same item_id. Data NOT updated. |
| `sync -- MSAL not configured` | `_msalClient` is null. Attendees empty, sync succeeds. |

---

## Out of Scope

- **LLM enrichment** -- no automatic extraction of actions, decisions, topics, or people from summaries. The meeting record holds the source material. Structured extraction is manual (via CC edit UI) or a future scheduled enrichment task.
- **Transcript storage** -- not fetched. If needed later, add a `meeting_transcripts` table and a separate fetch pass.
- **Webhooks** -- Granola doesn't offer them. Daily polling is sufficient for a meeting notes archive.
- **Bidirectional sync** -- edits in WorkSage CC UI are not pushed back to Granola. WorkSage is the enrichment layer on top of Granola's raw output.
- **UI changes** -- API-synced meetings use the same `meeting_items` schema and appear identically in the CC Meetings tab. The `source` field differentiates provenance if needed for filtering later.

---

## Manual Trigger

Admin API endpoint for on-demand sync (e.g. after adding the API key, or to force-sync mid-day):

```
POST /api/admin/granola-sync
Authorization: (existing MSAL session)
Response: { imported, skipped, failed, durationMs }
```

Added to `routes/admin.js`. Calls the same `syncGranolaMeetings(ctx)` function as the cron job. Returns the result object directly. Rate-limited to 1 call per 5 minutes via a simple timestamp check (prevents accidental double-clicks hitting the Granola API repeatedly).

---

## Setup Steps (for Glen)

1. Open Granola desktop app
2. Settings > Connectors > API keys
3. Create new key, scope: Personal notes
4. Copy the `grn_*` token
5. Add `GRANOLA_API_KEY=grn_...` to `dashboard-server/.env`
6. Restart PM2: `pm2 restart nbi-dashboard`
7. First sync runs at next 07:00, or trigger immediately via Command Centre or `POST /api/admin/granola-sync`
