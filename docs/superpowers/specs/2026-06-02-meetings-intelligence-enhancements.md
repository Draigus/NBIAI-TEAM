# Meetings Intelligence Enhancements

**Date:** 2026-06-02
**Status:** Design approved (v2 — post-critique)
**Builds on:** `docs/superpowers/specs/2026-06-01-meetings-intelligence-cc-tab.md`

## Overview

Three enhancements to the Meetings Intelligence CC tab, plus one consolidation:

1. **Editable meeting data** — Full CRUD on all 7 section types, persisted in Postgres
2. **Auto-create task from action** — One-click task creation from meeting actions
3. **Intelligence consolidation** — Remove standalone Intelligence sidebar page, merge content into CC Intel tab

## 1. Data Layer — `meeting_items` Table

### Schema

```sql
CREATE TABLE meeting_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL CHECK (section IN ('actions', 'decisions', 'people', 'learnings', 'numbers', 'timeline', 'threads')),
  data JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'compiled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_meeting_items_section ON meeting_items(section);
```

Note: `item_id` already has a UNIQUE constraint which creates an implicit index — no separate index needed.

- `item_id`: Stable human-readable slug (e.g. `act_20260521_glen_narrative-jd`). Unique across all sections.
- `section`: One of 7 section types. Discriminator for queries and validation.
- `data`: Section-specific fields as JSONB. Shape varies by section type (see Section-Specific Data Shapes below).
- `source`: `'compiled'` for items imported from JSON, `'manual'` for user-added items.

### Top-Level Metadata

Meeting-level metadata (meeting_count, date_range, original compiled_at) is stored in a separate single-row table rather than as a fake `_meta` row in `meeting_items` (which would violate the section CHECK constraint):

```sql
CREATE TABLE meeting_metadata (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  meeting_count INT NOT NULL DEFAULT 0,
  date_range_start TEXT,
  date_range_end TEXT,
  compiled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

`compiled_at` is the timestamp from the original JSON compilation — it does NOT update when users edit items. This preserves the "data freshness" signal in the UI. `updated_at` tracks metadata changes (e.g. after a recompilation merge).

### Seed: Two-Step Process

**Step 1 — SQL migration (`061_meeting_items.sql`):** Creates `meeting_items` and `meeting_metadata` tables. Drops the now-retired `meeting_action_status` table.

**Step 2 — Node.js seed script (`scripts/seed-meeting-items.js`):** Runs after migration. Reads `intelligence/compiled/meetings.json`, reads any existing overrides from `meeting_action_status` (before drop), and inserts all items into `meeting_items`. Action statuses from the old override table are merged into the JSONB `data.status` field during import. Populates `meeting_metadata` with meeting_count, date_range, and compiled_at from the JSON.

The migration SQL cannot read filesystem JSON — the seed script handles this. If `meetings.json` doesn't exist, the tables are created empty (no error).

### Migrating Existing Status Overrides

Before `meeting_action_status` is dropped, the seed script reads all existing overrides and applies them to the corresponding action items during import. Flow:
1. Read all rows from `meeting_action_status` into a map (action_id → status)
2. For each action in `meetings.json`, check if an override exists
3. If yes, set `data.status` to the override value instead of the JSON value
4. Insert into `meeting_items`
5. Drop `meeting_action_status`

### Section-Specific Data Shapes

**Actions:**
```json
{ "date": "2026-05-21", "owner": "Glen", "owner_normalised": "glen", "description": "Write Narrative Lead JD", "workstream": "couch_heroes", "source_file": "...", "status": "open" }
```

**Decisions:**
```json
{ "date": "2026-05-20", "decision": "Cosmetics-only monetisation", "rationale": "Foundational design pillar", "workstream": "couch_heroes" }
```

**People:**
```json
{ "name": "Vardis", "name_normalised": "vardis", "role": "CEO / Founder", "workstreams": ["couch_heroes"], "notes": ["Note 1", "Note 2"], "meetings_seen": 24, "last_seen": "2026-05-22" }
```

**Learnings:**
```json
{ "date": "2026-04-13", "insight": "External assessment validated audit", "context": "Pre-production confirmed", "workstream": "couch_heroes" }
```

**Numbers:**
```json
{ "date": "2026-05-04", "figure": "55K/month", "context": "Current NBI revenue", "workstream": "nbi", "category": "revenue" }
```

**Timeline:**
```json
{ "period": "March 6-18", "label": "Post-GDC Activation", "summary": "Glen returns from GDC..." }
```

**Threads:**
```json
{ "title": "CTO Hire", "status": "active", "summary": "Pipeline open...", "workstream": "couch_heroes" }
```

### Required Fields Per Section (validation on POST)

| Section | Required fields in `data` |
|---|---|
| actions | description, status |
| decisions | decision |
| people | name |
| learnings | insight |
| numbers | figure |
| timeline | period, label |
| threads | title, status |

All other fields are optional. The API returns 400 if required fields are missing on create.

### API Endpoints

**`GET /api/meetings/compiled`** — Returns all items from Postgres grouped by section, plus metadata. Same response shape as the current JSON-based endpoint: `{ meeting_count, date_range, compiled_at, sections: { actions: [...], ... } }`. Items within each section sorted by `data->>'date' DESC NULLS LAST` for dated sections (actions, decisions, learnings, numbers), by `data->>'name'` for people, by `created_at` for timeline and threads.

**`POST /api/meetings/items`** — Create a new item. Body: `{ section, item_id?, data }`. Validates required fields per section. If `item_id` is omitted, generated as `{prefix}_{YYYYMMDD}_{slug}_{4hex}` where prefix = first 3 chars of section (e.g. `act`, `dec`, `per`), date = today, slug = first 4 kebab-case words of the primary text field, and a 4-char hex random suffix prevents collisions. Source set to `'manual'`. Returns the created item.

**`PATCH /api/meetings/items/:item_id`** — Partial update. Body: `{ data: { ...fields } }`. For scalar fields, values are replaced. For array fields (specifically `notes` on people, `workstreams` on people), the client sends the complete new array — no server-side append logic. The frontend handles building the updated array before sending. Updates `updated_at`. Returns the updated item.

**`DELETE /api/meetings/items/:item_id`** — Deletes the item. Returns `{ ok: true }`.

**`GET /api/meetings/stats`** — Summary counts computed from DB via aggregate queries. Plus meeting_count, date_range, compiled_at from `meeting_metadata`.

### Recompilation Merge

When `/compile-meetings` runs in future, it produces a new `meetings.json`. A merge script reads the JSON and:
1. For each item, checks if `item_id` already exists in `meeting_items`
2. If not, inserts it with `source: 'compiled'`
3. If it exists, skips it entirely — user edits are never overwritten
4. Updates `meeting_metadata` with new meeting_count and date_range if they've grown

## 2. Frontend — Inline Editing & Add

### Edit Flow

Each rendered item gets a pencil icon. Clicking it transforms the row/card into an inline edit form — text inputs replace static text, with Save and Cancel buttons. Save applies an **optimistic update**: updates `_mtgData` locally first, re-renders immediately, then sends `PATCH /api/meetings/items/:item_id` in the background. On server failure, reverts the local change and shows an error toast.

### Add Flow

Each sub-tab gets an "+ Add" button at the top of the content area. Clicking it inserts a blank inline form at the top of the list (same form layout as edit, but empty fields). Save sends `POST /api/meetings/items` — on success, the returned item (with server-generated `item_id`) is added to `_mtgData` and the list re-renders. On failure, the form stays open with an error message.

### Delete Flow

Edit mode shows a red "Delete" link. Clicking it shows a confirmation dialog (using the existing `confirmModal`). On confirm, optimistic removal from `_mtgData`, then `DELETE /api/meetings/items/:item_id`. Revert on failure.

### Visual Indicators

Items with `source: 'manual'` display a subtle "Manual" badge to distinguish user-added entries from compiled ones.

### Section-Specific Edit Forms

| Section | Fields |
|---|---|
| Actions | date (input), owner (input), description (input), workstream (dropdown), status (dropdown: open/done/overdue) |
| Decisions | date (input), decision (input), rationale (input), workstream (dropdown) |
| People | name (input), role (input), workstream (checkboxes), notes (textarea, one per line) |
| Learnings | date (input), insight (input), context (textarea), workstream (dropdown) |
| Numbers | date (input), figure (input), context (input), workstream (dropdown), category (dropdown: revenue/compensation/investment/cost/metric) |
| Timeline | period (input), label (input), summary (textarea) |
| Threads | title (input), status (dropdown: active/resolved), summary (textarea), workstream (dropdown) |

All forms use existing CC styling (`--bg-surface`, `--border-default`, etc.). Inputs are `font-size: 14px` minimum.

### Array Field Handling (People Notes)

When editing a person's notes, the textarea shows all notes joined by newlines. On save, the textarea content is split by newlines, empty lines stripped, and the full array is sent as `data.notes`. The server replaces the entire `notes` array. Same approach for `workstreams` — checkboxes build the full array and replace on save.

## 3. Task Creation from Actions

### Trigger

Each action row gets a task-creation icon button (small clipboard/task icon) next to the status tag. Only visible on actions, not other section types.

### Workstream → Client Mapping

Resolved dynamically at render time by matching the workstream slug against client names in the loaded `clients` array (case-insensitive, underscore-to-space conversion: `couch_heroes` → match against client containing "couch heroes"). Falls back to asking the user to pick a client if no match is found.

### Flow

1. Click the task icon on an action row
2. Resolve workstream to client name via the mapping above
3. Open a parent picker showing the hierarchy for that client (projects → features → stories). This is a new lightweight picker function (`_mtgPickParent(client)`) since the existing `showAddItemPicker` doesn't accept a client filter parameter.
4. User picks a parent
5. Task is created via `createTaskObject()`:
   - `title` = action description
   - `client` = resolved client name
   - `itemType` = 'task'
   - `description` = "From meeting intelligence: [date] — [owner]"
6. `tasks.push(t); markDirty(t.id); save(); openDetail(t.id);`
7. The action's status is automatically set to `'done'` via `PATCH /api/meetings/items/:item_id`

### No New Server API

This reuses the existing client-side task creation pipeline. The only server call beyond normal task sync is the PATCH to mark the action done.

## 4. Intelligence Consolidation

### Remove

- Remove `'intelligence'` from the sidebar tabs array (line ~5756)
- Remove the `renderIntelligenceView` function (~lines 28554-28612)
- Remove the rendering branch `else if (currentView === 'intelligence')` (line ~5916)
- Keep all `.intel-*` CSS classes — they're reused by the merged CC Intel tab content

### Merge into CC Intel Tab

The standalone Intelligence view has three components the CC Intel tab doesn't fully show:

1. **Bank Health table** — Full table with capacity bars, shelf life, source counts, staleness status. Add as a collapsible section in the CC Intel tab, reusing the existing `.intel-bank-table` styles.
2. **Pipeline Activity** — Source-by-source last-run status with green/amber dots. Add below banks.
3. **Pending items** — Bank suggestions, sensitive extracts with count badge. Add as a section.

The CC Intel tab already has the intelligence brief, banks summary, and recent research. These three additions make it the single comprehensive intelligence view. The API calls (`/api/intelligence/banks`, `/api/intelligence/pipeline`) are already used by the CC Intel tab — just need to render the full detail instead of the summary.

## Files Modified

| File | Change |
|---|---|
| `dashboard-server/migrations/061_meeting_items.sql` | Create `meeting_items` + `meeting_metadata` tables, drop `meeting_action_status` |
| `dashboard-server/scripts/seed-meeting-items.js` | Import from meetings.json + migrate status overrides |
| `dashboard-server/lib/meetings-intelligence.js` | Rewrite to read/write Postgres instead of JSON file |
| `dashboard-server/routes/meetings-intelligence.js` | Add POST, PATCH, DELETE endpoints + validation |
| `dashboard-server/server.js` | No change (routes already mounted) |
| `nbi_project_dashboard.html` | Inline editing forms, add/delete UI, task creation button, parent picker, remove sidebar Intelligence, merge Intel tab content |
| `dashboard-server/tests/unit/meetings-intelligence.test.mjs` | Update tests for DB-backed CRUD |
| `dashboard-server/tests/e2e/meetings-tab.spec.js` | Add CRUD and task creation tests |

## Testing

- Unit tests: CRUD operations on `meeting_items` (create, read, update, delete, stats)
- Unit tests: Required field validation per section type
- Unit tests: Seed script imports all items from JSON, merges status overrides
- Unit tests: Item_id auto-generation with collision avoidance
- E2E: Create an item, edit it, verify persistence on refresh, delete it
- E2E: Create task from action, verify task exists, verify action marked done
- Verify existing CC tabs unaffected
- Verify Intelligence sidebar item removed and CC Intel tab has all content

## Migration Notes

- Migration 061 confirmed as next available (059 = meeting_action_status, 060 = hiring_position_discipline).
- The seed script must run AFTER the migration (table must exist). The migration creates empty tables; the seed script populates them.
- The `meeting_action_status` table is dropped in the migration SQL. The seed script reads from it first (if it exists), before the drop executes. Alternatively, the seed script handles the drop after migration if ordering is tricky — implementation detail.
- If `intelligence/compiled/meetings.json` doesn't exist, the seed script exits cleanly with an empty table.
