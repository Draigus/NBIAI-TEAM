# Meeting Provenance — Source Context for Intelligence Items

**Date:** 2026-06-03
**Status:** Design approved (v3 — post UI/UX, VP Product, and Senior Engineer review)
**Builds on:** `docs/superpowers/specs/2026-06-02-meetings-intelligence-enhancements.md`

## Problem

Items in the Meetings Intelligence tab (actions, decisions, people, etc.) float without provenance. You can see "Glen: Write Narrative Lead JD" but can't trace which meeting it came from, who was in the room, or what else was discussed.

## Solution

Store meeting-level records alongside extracted items, link items to their source meetings via LLM-assisted matching, and provide a slide-over panel that shows full meeting context without losing your place.

## 1. Data Layer

### Migration 063: Extend CHECK constraint + add partial unique index

The migration runner already wraps each file in BEGIN/COMMIT (verified in `migrations/runner.js` line 95).

```sql
-- 063_meetings_section.sql
ALTER TABLE meeting_items DROP CONSTRAINT meeting_items_section_check;
ALTER TABLE meeting_items ADD CONSTRAINT meeting_items_section_check
  CHECK (section IN ('actions','decisions','people','learnings','numbers','timeline','threads','meetings'));

-- Prevent double-importing the same Granola meeting on re-run
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_items_source_id
  ON meeting_items((data->>'source_id'))
  WHERE section = 'meetings' AND data->>'source_id' IS NOT NULL;
```

### Meeting record shape (`section = 'meetings'`)

`item_id` format: `mtg_YYYYMMDD_slug` (e.g., `mtg_20260521_hr-weekly-meeting`). Deterministic — derived from the meeting's own date and title, not the current timestamp.

```json
{
  "date": "2026-05-21",
  "title": "HR Weekly Meeting",
  "attendees": ["Glen", "Lorenza", "Aris", "Dino", "Vardis"],
  "topics": ["hiring-pipeline", "performance-management", "military-service-contracts"],
  "summary": "Daniel Casadevall approved at 95K...",
  "decisions_text": "- end Greek military service contracts...\n- approve Daniel at 95K...",
  "context": "HR Weekly meeting on 21 May 2026. Participants: Glen, Lorenza, Aris...",
  "source_id": "granola_93bc0089",
  "source_path": "granola://meetings/93bc0089-ff97-4921-9332-2a558e7d15d4",
  "workstream": "couch_heroes",
  "ingested": "2026-05-26",
  "extract_type": "decision"
}
```

Key design decisions (from Senior Engineer review):
- **`decisions_text`** not `decisions` — avoids name collision when `...r.data` spread merges JSONB onto the response object (the `decisions` key would shadow the `sections.decisions` array in client-side code).
- **`ingested`** and **`extract_type`** preserved from Granola frontmatter — useful for debugging duplicates and future filtering.
- **`source_id`** used for deduplication via partial unique index, not just `item_id`. `source_id` is globally unique from Granola; `item_id` slugs could theoretically collide on same-date similar titles.

Required fields for `meetings` section: `title`, `date`.

### Linking items to meetings

Each existing item in other sections gets `source_meeting_id` added to its JSONB data (e.g., `"source_meeting_id": "mtg_20260521_hr-weekly-meeting"`).

**Backfill strategy (LLM-assisted, high confidence):**

Analysis of the actual data (verified):
- 157 dated items need linking (actions: 56, decisions: 47, learnings: 17, numbers: 37)
- 7 items have a unique meeting on their date — auto-linkable without LLM
- 133 items have multiple meetings on the same date (e.g., April 1 had 7 meetings)
- 17 items have no meeting at all on their date (mostly pre-March 26, before Granola was active)
- 38 items without dates (people: 24, threads: 5, timeline: 9) — handled separately

The seed script runs a three-tier matching process:

1. **Exact single match (7 items):** If only one meeting exists on the item's date, link it directly. No LLM needed.

2. **LLM disambiguation (133 items):** For items with multiple same-day meetings, send a prompt to Claude with the item's full data (description, owner, workstream) and the summaries of all candidate meetings on that date. Claude returns the `item_id` of the best-matching meeting, or `"none"` if genuinely ambiguous. Grouped by date — one API call per unique date. **Validation:** every returned `item_id` must exist in the candidate list for that date. Non-matching responses treated as `"none"` and logged.

3. **Cross-date matching (17 items):** Items whose date doesn't match any meeting date. 14 of these predate all Granola records (before March 26) and are logged as "pre-dating Granola — not linkable" without attempting matching. The remaining 3 are sent to Claude with meetings from +/- 3 days. Link if confident, skip if not.

4. **People entries:** Scan all meeting attendee lists. For each person in the people section, find all meetings where their name appears. Name matching uses normalised lowercase comparison (person's `name_normalised` against lowercased attendee strings from the person registry aliases). Build `meeting_ids` array on each person entry. No LLM needed.

**Error handling:**
- API call failure: 3 retries with exponential backoff per date batch
- Partial progress: write a `backfill_progress.json` file tracking which dates have been processed. Re-run skips completed dates.
- All results logged to console with item_id, matched meeting, and confidence tier

**Estimated cost:** ~35 Claude API calls (one per unique date with items), using Haiku for cost efficiency.

### Seed script: `scripts/seed-meeting-records.js`

New script (separate from existing `seed-meeting-items.js`) with three phases:

**Phase 1 — Import meeting records:**
1. Read all files from `intelligence/raw/granola/*.md`
2. Parse YAML frontmatter (`source_id`, `source_path`, `topics_detected`, `sensitivity_class`, `ingested`, `extract_type`)
3. Parse markdown body (title from H1, Key Content → `summary`, Decisions section → `decisions_text`, Context section → `context`)
4. Extract attendees from the Context paragraph (pattern: "Participants: X, Y, Z")
5. Derive workstream from attendee domains or topics (same mapping as existing items)
6. Construct deterministic `item_id`: `mtg_{date_no_hyphens}_{title_slug}`
7. INSERT with `source = 'compiled'` via direct pool query (not `createItem()` which hardcodes `source = 'manual'`)
8. ON CONFLICT DO NOTHING (safe re-run)

**Phase 2 — Backfill item links (LLM-assisted):**
1. Load all meeting records from DB
2. Load all dated items (actions, decisions, learnings, numbers)
3. Group items by date
4. Run the three-tier matching described above
5. UPDATE each matched item: `SET data = data || '{"source_meeting_id": "mtg_..."}'::jsonb`

**Phase 3 — People meeting linkage:**
1. Load all meeting records' attendee arrays
2. Load all people entries and the person registry
3. For each person, find meetings where any alias appears in attendees
4. UPDATE each person entry: `SET data = data || '{"meeting_ids": [...]}'::jsonb`

### Updated lib (`meetings-intelligence.js`)

```js
VALID_SECTIONS: add 'meetings'
REQUIRED_FIELDS.meetings = ['title', 'date']
SECTION_SORT.meetings = "data->>'date' DESC NULLS LAST"
SECTION_PREFIX.meetings = 'mtg'
```

Also update `generateItemId()` for the `meetings` section: use `data.date` (hyphens stripped) instead of `new Date()`, and omit the random hex suffix (meetings have deterministic IDs from title + date).

Also update `getStats()` to include `meeting_record_count` via `count(*) FILTER (WHERE section = 'meetings')`. The Sources sub-tab needs this count for its label.

### API

No new endpoints. Meetings are served through existing `GET /api/meetings/compiled` (returned as `sections.meetings`). The slide-over panel reads from client-side `_mtgData`.

## 2. Frontend — Provenance Chips

### On item rows (actions, decisions, learnings, numbers)

Items with a `source_meeting_id` display a small clickable chip:

```html
<span class="cc-tag cc-tag--purple cc-mtg-src"
  onclick="_mtgOpenMeeting('mtg_20260521_hr-weekly-meeting')">
  HR Weekly Meeting &middot; 21 May
</span>
```

Uses existing `cc-tag cc-tag--purple` styling. No emojis.

To resolve the display text, the frontend looks up the meeting record from `_mtgData.sections.meetings` by matching `source_meeting_id` to the meeting's `id`. Shows `title · date` if found, or just the raw ID if the meeting record is missing.

### On people cards

People entries with `meeting_ids` show: "12 meetings" as a `cc-tag cc-tag--purple` chip. Clicking filters the Sources sub-tab to those specific meeting IDs.

### On timeline and thread items

Timeline items show the chip if linked. Threads are cross-meeting entities and are NOT linked.

### Suppression rules

- `source = 'manual'`: no provenance chip (has "Manual" badge instead)
- No `source_meeting_id`: no chip, no placeholder
- People without `meeting_ids`: no chip

## 3. Frontend — Slide-Over Panel

### Trigger

Click any meeting reference chip, or click a meeting row in the Sources sub-tab.

### Behaviour

- Slides in from right, 480px wide (100% on mobile)
- Background overlay dims current content
- Close: X button, Escape key, click outside overlay
- Scroll: panel content scrolls independently
- Focus: moves to close button on open
- Current sub-tab state fully preserved — no navigation, no state loss

### Content hierarchy

1. **Header:** title (18px bold) + date (14px muted) + close button (absolute top-right)
2. **Attendees:** as `cc-tag` chips in a flex row
3. **Workstream:** single `cc-tag cc-tag--blue` chip
4. **Topics:** small `cc-tag cc-tag--purple` chips
5. **Summary:** full Key Content paragraph — the primary content, why users opened this panel
6. **Decisions/Insights:** `decisions_text` field rendered as a bullet list (split on `\n- `)
7. **Context:** supporting text in muted colour
8. **Source reference:** "Source: granola_93bc0089" in small muted text. Not a link (Granola has no public browser URLs), but serves as lookup key for the MCP API.
9. **From This Meeting:** all items linked to this meeting via `source_meeting_id`, grouped by section with counts in headers ("3 Actions · 2 Decisions"). Each item clickable — closes panel, switches to that sub-tab, highlights the item briefly.

### CSS

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

## 4. Frontend — Sources Sub-Tab (8th tab)

### Registration

Add to the sub-tabs array after 'threads':
```js
{ id: 'sources', label: 'Sources (' + (filtered.meetings || []).length + ')' }
```

### List view

Date-descending table. Columns: Date, Meeting Title, Attendees (count), Workstream tag.

Inherits the existing filter bar — workstream dropdown narrows meetings, search text matches titles and attendee names (via `JSON.stringify` search already in `_mtgApplyFilters`).

Clicking a row opens the slide-over panel.

### Renderer

```js
function _mtgRenderSources(meetings) {
  // + Add button, edit forms, table with clickable rows
  // Same edit/add/delete pattern as other section renderers
}
```

Meetings in the Sources list are editable (pencil icon, inline form) and addable ("+ Add Meeting") using the same CRUD infrastructure as all other sections.

### Empty state

"No meeting records imported yet. Run the meeting records seed script to import from Granola extracts."

## 5. Files Modified

| File | Change |
|---|---|
| `dashboard-server/migrations/063_meetings_section.sql` | ALTER CHECK constraint, add source_id partial unique index |
| `dashboard-server/scripts/seed-meeting-records.js` | Import Granola extracts, LLM backfill, people linkage |
| `dashboard-server/lib/meetings-intelligence.js` | Add 'meetings' to constants, fix `generateItemId` for meetings, add `meeting_record_count` to `getStats` |
| `nbi_project_dashboard.html` | Provenance chips, slide-over panel, Sources sub-tab, panel CSS |
| `dashboard-server/tests/unit/meetings-intelligence.test.mjs` | Test meetings section CRUD + stats |
| `dashboard-server/tests/e2e/meetings-tab.spec.js` | Test meeting record creation via API |

## 6. Testing

- Unit: Create/read/update/delete meeting records through existing API
- Unit: Meetings appear in `GET /api/meetings/compiled` under `sections.meetings`
- Unit: `getStats` returns `meeting_record_count`
- Unit: `generateItemId` for meetings section uses `data.date` not current date
- E2E: Create a meeting record, verify it appears in API response
- Manual: Run seed script, verify 112 meeting records imported
- Manual: Verify provenance chips appear on linked items
- Manual: Click provenance chip, verify slide-over panel shows correct meeting
- Manual: Verify "From This Meeting" shows linked items with correct counts
- Manual: Verify People entries show "N meetings" chip
- Manual: Sources sub-tab lists meetings with filters working
- Verify existing sub-tabs and edit functionality unaffected

## 7. Migration Notes

- Migration 063 confirmed as next available (061 = meeting_items)
- The seed script must run AFTER migration 063 (CHECK constraint must allow 'meetings')
- Seed script uses direct pool.query INSERTs (not `createItem()` which hardcodes `source = 'manual'`)
- Safe to re-run: ON CONFLICT DO NOTHING on item_id, plus source_id partial unique index prevents Granola duplicates
- Backfill progress tracked in `backfill_progress.json` — re-run skips completed dates
- Update `meeting_metadata.meeting_count` after seeding to reflect actual row count
