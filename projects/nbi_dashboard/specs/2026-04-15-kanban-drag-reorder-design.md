# Kanban drag-to-reorder — design spec

**Date:** 2026-04-15
**Status:** Approved by Glen — ready for implementation plan
**Scope:** All four Kanban boards (Tasks, Bug Tracker, Hiring, Leads)

---

## 1. Problem

Today, every Kanban board on the dashboard orders cards within a column by some arbitrary field (creation date, name, stage default). There's no way to tell the system "I'm going to work on these in this specific order." Cards can be moved between columns (status / stage changes) via drag-and-drop on three of the four boards, but there is no concept of ordering within a column, and the Bug Tracker board has no drag support at all.

Glen wants the Kanban column to **be** the work queue: whatever order the cards sit in is the order he's going to tackle them. This is distinct from the existing `priority` enum (Urgent / High / Medium / Low, or critical / high / medium / low on bugs), which classifies how much the *client* cares — the badge colour. The drag order is the team's execution order.

This fits Glen's existing operating principle, recorded in the project memory: **prioritisation = order of operations, not filtering.** Every issue gets worked; the question is in what order. The drag position answers that question directly.

---

## 2. User-facing behaviour

### Columns are work queues
- Every Kanban column displays cards sorted by a new `position` field.
- Position 0 is the top of the column — the next thing to work on.
- The existing `priority` enum is untouched. It still drives the coloured badge on the card but no longer influences card order.

### Dragging
- Cards are draggable on all four boards (Tasks, Bug Tracker, Hiring, Leads). Bug Tracker currently has no drag support; this change adds it.
- Dragging a card **within** its current column changes its position in that column.
- Dragging a card **across** columns drops it at the exact position where it was released in the target column. If you release it between cards 2 and 3, it lands as position 3.
- Dropping past the end of a column clamps to the end.

### New cards
- Newly created cards (any of the four boards) land at **position 0** — the top of their column. Everything below shifts down by 1. The rationale is that new items need triage; putting them where you'll see them first is the natural default.

### Status / stage changes from outside the Kanban
- If a card's status or stage is changed via a form edit, the detail panel, or the API from any path that isn't a drag drop, the card lands at **position 0** of its new column. Same as new-card behaviour.
- The rationale: any status change is effectively "this card just joined this column" from a queue perspective, and Glen wants to see new arrivals at the top.

### Shared order
- There is a single canonical order per column across all users. If Glen reorders the bug tracker, Magnus logs in and sees Glen's order.
- Any authenticated user who can edit a card can also reorder it.
- Two users dragging simultaneously → Postgres transactions serialize, last commit wins. The frontend refetches after every drag so users converge within a second or so.

### Filters
- Filters (type, status, priority, assignee, etc.) still work on top of the drag-ordered column.
- Drag still works while a filter is active. The drop index is computed against the full unfiltered column list, not just the visible cards, so that positions remain consistent when filters are cleared.

---

## 3. Data model

### New column

One new column on each of four tables:

```sql
ALTER TABLE tasks        ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bug_reports  ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE candidates   ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads        ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
```

`position` is only meaningful within a **group**:

| Table | Group key |
|---|---|
| `tasks` | `status` |
| `bug_reports` | `status` |
| `candidates` | `stage` |
| `leads` | `stage_id` |

### Indexes

```sql
CREATE INDEX idx_tasks_status_position       ON tasks (status, position);
CREATE INDEX idx_bug_reports_status_position ON bug_reports (status, position);
CREATE INDEX idx_candidates_stage_position   ON candidates (stage, position);
CREATE INDEX idx_leads_stage_position        ON leads (stage_id, position);
```

These support the common query `SELECT ... WHERE status = ? ORDER BY position` and make the shift-by-one UPDATEs cheap.

### Migration 021 — backfill

For each of the four tables, for each group (status or stage), order existing rows by `created_at DESC` and assign dense integer positions starting at 0. This places the newest existing row at position 0, matching the going-forward "new cards at top" rule so old and new data feel consistent.

SQL sketch:
```sql
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) - 1 AS new_pos
  FROM bug_reports
)
UPDATE bug_reports SET position = numbered.new_pos
FROM numbered WHERE bug_reports.id = numbered.id;
```

Repeat for each table with its appropriate group key.

---

## 4. Storage model — dense integers

Positions are **dense integers**, 0-indexed within a group, with no gaps on insert or move. On every reorder, the server renumbers the affected column in a single transaction:

- **Move up** (position 7 → position 2): shift positions 2..6 down by +1, set moved card to 2.
- **Move down** (position 2 → position 7): shift positions 3..7 up by -1, set moved card to 7.
- **Cross-column**: shift the old column's cards above the vacated slot up by -1; shift the new column's cards from the target position onwards down by +1; set the moved card's `status`/`stage` and `position`.

**Why dense integers and not fractional ranks:** For this app's column sizes (bug tracker max ~80, hiring ~30, leads ~30, tasks per status ~200), the O(n) UPDATEs are invisible. The code is boring, easy to debug, easy to eyeball in the DB, and matches the existing `sort_order` pattern in `contacts` / `lead_pipeline_stages` / `expense_categories`. If we ever hit performance issues we can migrate to a LexoRank-style column then.

**Deletes do not renumber.** A deleted card leaves a gap in the sequence. This is harmless — SQL `ORDER BY position` doesn't care about gaps, and the next insert or move fills or shifts around them naturally. The alternative (renumber on delete) adds complexity and extra failure modes for zero benefit.

---

## 5. API

### Extending existing PATCH endpoints

All four tables already have a `PATCH /api/<table>/:id` endpoint. This change extends those endpoints rather than adding new ones. The PATCH body may now include:

```json
{
  "status": "in_progress",   // optional: move to a different column
  "position": 3              // optional: target index in that column
}
```

### Server-side reorder logic

Runs inside a single Postgres transaction per request:

1. Fetch the card's current `status`/`stage` and `position`.
2. If `status` (or `stage`) is changing, shift the **old column** above the vacated slot:
   `UPDATE ... SET position = position - 1 WHERE <group> = <old_group> AND position > <old_position>`
3. Shift the **target column** from the new position onwards:
   `UPDATE ... SET position = position + 1 WHERE <group> = <new_group> AND position >= <new_position> AND id != :id`
4. Update the moved card's `status`/`stage` and `position` to the new values.
5. Write an audit log entry: `{ action: 'reorder', old_status, old_position, new_status, new_position }`.

### POST endpoints — insert at position 0

All four POST endpoints that create a new row in one of these tables need to:
1. Shift all cards in the target column down by +1 (`position = position + 1 WHERE <group> = <target_group>`).
2. Insert the new row with `position = 0`.

Also wrapped in a transaction with the INSERT.

### Any other status / stage change path

Any code path that changes `status` or `stage` outside of the drag path (form edits, status change buttons, detail panel dropdowns, API clients) must run the same "insert at position 0 of the new column" shift. In practice this means the server's reorder logic in step 3 above defaults `new_position` to `0` when the client sends a `status`/`stage` change without an explicit `position`.

---

## 6. Frontend

### Render order

Each Kanban render loop already groups cards by status/stage. The change: before rendering each group, sort it by `position` ascending. A new `.sort((a, b) => (a.position || 0) - (b.position || 0))` added at the top of each loop.

### Drag handlers

**Hiring Kanban** — already has cross-column drag handlers (`onHiringCardDragStart`, `onHiringLaneDrop`, etc.). Extend the drop handler to compute a target position within the lane, not just the lane ID.

**Leads Kanban and Tasks Kanban** — same pattern, extend existing handlers.

**Bug Tracker Kanban** — currently no drag support. Add:
- `draggable="true"` on each card
- `ondragstart` / `ondragend` on the card
- `ondragover` / `ondragleave` / `ondrop` on the lane body
- Same visual feedback (card opacity, lane highlight)

### Drop position calculation

The drop handler needs to compute which slot in the target column the card was released into. Technique:

1. On `dragover`, the lane body iterates its child cards and checks each card's bounding rect against `event.clientY`.
2. For each card, if `clientY < (rect.top + rect.height / 2)`, the drop would land above that card. Otherwise, below it.
3. An insertion-line element is rendered between cards to show the target slot.
4. On `drop`, the detected slot index is converted to an absolute position in the underlying data array. If a filter is active, the index is translated by walking the full unfiltered data array until `filterVisibleCount === detectedSlot`.

The client then sends `PATCH /api/<table>/:id` with `{ status, position }`.

### Optimistic update + refetch

After a successful drag, the frontend optimistically reorders its in-memory list and re-renders, then kicks off a refetch to converge on the server state. If the PATCH fails, the optimistic change is rolled back and a toast is shown.

---

## 7. Edge cases

| Situation | Behaviour |
|---|---|
| Two users drag simultaneously | Server transactions serialize. Last commit wins. Frontend refetches after each drag so both users converge within ~1s. |
| Drop position > column length | Clamped to the column's current length (end of column). |
| Card deleted from column | Row removed. Gap left in position sequence. Harmless. Next insert fills or shifts around it. |
| Status/stage changed via form or API (not drag) | Card lands at position 0 in its new column. Old column shifts up. Same as new-card behaviour. |
| Legacy row missing a position | Impossible after migration 021 — all rows get a position. |
| Filter active while dragging | Drop index is computed against the full unfiltered column via the technique in section 6. Positions remain consistent when filters are cleared. |
| Drag on "dead" columns (Resolved, Won't Fix, Rejected, Hired) | Works. Probably irrelevant but cheap to support and keeps behaviour uniform. Disable later if it proves annoying. |
| Bulk task import / bulk candidate import | Each imported row goes through the same "insert at position 0" logic. Consequence: after importing N rows, they appear in **reverse import order** (last imported at top). For N imported rows this does N shifts — fine for realistic import sizes (< 100 rows). If import order ever needs to be preserved, we can add a bulk-aware path later that inserts the imported batch contiguously at the top. |

---

## 8. Out of scope

- Reordering the columns themselves (moving "Please Review" before "In Progress").
- Per-user views or per-user card orders — shared order only.
- Keyboard reordering (arrow keys to move cards) — mouse/touch only for v1.
- Auto-sorting a column (e.g. "sort all by priority enum on click") — drag-order is the single sort key.
- A table/list view sorted by `position` — existing list views keep their current sort options.

---

## 9. Rollout sequence

Three code commits plus a deliverable note, in strict order:

**W1 — migration + POST insert-at-0**
- Migration 021 adds the `position` column, indexes, and backfills existing rows.
- POST handlers for tasks / bug_reports / candidates / leads updated to insert at position 0 with shift.
- Safe to deploy alone: the new column exists, the shift logic works, PATCH-based drag still doesn't do anything position-related because the frontend doesn't send `position` yet.

**W2 — PATCH reorder logic**
- PATCH handlers for all four tables accept the new `position` field and run the reorder transaction.
- Status/stage change without an explicit `position` defaults to `position = 0` in the new column.
- Safe to deploy alone: new API behaviour is additive; frontend still doesn't drag anything.

**W3 — frontend drag wiring**
- Bug Tracker gains full drag support.
- All four Kanbans get intra-column drop zones, drop-position computation, sort-by-position on render.
- Optimistic reorder + refetch pattern added.
- This is the commit that visibly activates the feature.

**W4 — deliverable note**
- Short markdown writeup in `projects/nbi_dashboard/deliverables/` with before/after screenshots of each board, confirmation that the round-trip works, row counts from the migration, and any gotchas discovered.

---

## 10. Testing plan

For each of the four boards:

1. **Backfill sanity** — after migration 021, query `SELECT status, position, created_at FROM bug_reports ORDER BY status, position` and confirm rows are dense and ordered newest-first within each status.
2. **New card lands at top** — create a new card via the UI, confirm it appears at position 0 in its column and all previously-position-0 cards shifted down.
3. **Within-column drag up** — drag a card from position 5 to position 2; confirm other cards shifted down; confirm the server row matches the UI.
4. **Within-column drag down** — drag a card from position 2 to position 5; confirm other cards shifted up; confirm round-trip.
5. **Cross-column drag** — drag a card from column A position 3 to column B position 1; confirm old column closed the gap and new column accepted at the correct position.
6. **Status change via form** — open a card, change its status via the detail panel, confirm it lands at position 0 of the new column.
7. **Two-user race** — simulate two drags in quick succession via the API; confirm Postgres serialization; confirm the frontend refetch converges.
8. **Drag while filtered** — filter the bug tracker to `type=bug`, drag a bug into a new slot, clear the filter, confirm the bug is in the expected absolute position.

Tests executed manually in the browser + `psql` sanity queries. No automated test suite exists for this app (verified earlier today).

---

## 11. Open questions

None. All product decisions resolved:
- Scope: all four boards ✓
- Priority model: enum stays as client need, position is work queue ✓
- New cards: top of column ✓
- Cross-column drop: exact drop position ✓
- Storage: dense integer, renumber on move ✓
- Shared order: yes, last-write-wins ✓
- Deletes: do not renumber ✓
- Status change via form: reset to position 0 ✓
- Drag on dead columns: enabled ✓

---

## 12. Decision record — for the live state log

This spec corresponds to decision **D79** in `projects/nbi_dashboard/live_state/decisions.md`:

> **D79: Kanban drag-to-reorder on all four boards**
> Every Kanban card (Tasks, Bug Tracker, Hiring, Leads) gains a `position` integer column scoped by status/stage. Drag-to-reorder within a column sets the work queue order. Existing `priority` enum is untouched and remains the "client need" classification shown as a badge. New cards land at position 0. Status changes outside the drag path also land at position 0. Order is shared across users. Storage is dense integer, renumbered on every move. Approved via brainstorming session 15 April.
