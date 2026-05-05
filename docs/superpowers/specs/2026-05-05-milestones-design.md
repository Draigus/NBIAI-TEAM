# Milestones — Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Owner:** Glen Pryer

---

## Summary

Milestones are date-driven checkpoints that belong to a client. They represent key delivery gates (e.g. Alpha Playtest, Beta, Launch) and track whether the linked work is on course to hit the target date.

Milestones are NOT work items. They don't live in the project/feature/story/task hierarchy. They're a parallel entity that references work items via explicit links.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Entity model | Separate table + join table | Milestones aren't work items — they're checkpoints. Proper table gives clean queries, referential integrity, and extensibility |
| Ownership | Client-level | The client sets milestones. A milestone can pull in features/stories from any project under that client |
| Completion criteria | Explicit linking with cascade | User manually links features or stories. Selecting a feature auto-includes its entire subtree (stories + tasks) in the progress calculation |
| Status | Computed at render time | No stored status column. Walk linked items + descendants, count Done vs total, derive status from progress + date proximity |
| Management UI | Client view | Milestones section in the client sidebar area. Portfolio panel shows cross-client view |

## Data Layer

### `milestones` table

```sql
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    target_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_milestones_client ON milestones(client_id);
CREATE INDEX idx_milestones_target ON milestones(target_date);
```

### `milestone_items` join table

```sql
CREATE TABLE milestone_items (
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (milestone_id, task_id)
);

CREATE INDEX idx_milestone_items_task ON milestone_items(task_id);
```

### Status computation

Status is derived at render time from linked items + their full descendant subtrees:

1. For each linked item, collect all descendants via `parentId` chains
2. Count total items and Done items across the full set
3. Calculate percentage complete
4. Derive status:
   - **Complete** — 100% of linked items (and descendants) are Done
   - **Overdue** — target_date has passed and not Complete
   - **At Risk** — any linked item has healthState 'Red' or 'Blocked', OR less than 14 days to target_date and progress < 80%
   - **On Track** — none of the above

## API Endpoints

### `GET /api/clients/:clientId/milestones`

Returns all milestones for a client, including linked item IDs.

```json
[
    {
        "id": "uuid",
        "client_id": "uuid",
        "title": "Alpha Playtest",
        "description": "First external playtest with core gameplay loop",
        "target_date": "2026-07-15",
        "linked_item_ids": ["uuid1", "uuid2", "uuid3"],
        "created_at": "...",
        "updated_at": "..."
    }
]
```

### `POST /api/clients/:clientId/milestones`

Create a milestone. Body:

```json
{
    "title": "Alpha Playtest",
    "description": "First external playtest with core gameplay loop",
    "target_date": "2026-07-15",
    "linked_item_ids": ["uuid1", "uuid2"]
}
```

Validates:
- `title` required, non-empty
- `target_date` required, valid date
- `linked_item_ids` optional array of UUIDs; each must exist in tasks table and belong to the same client
- Client must exist

### `PUT /api/milestones/:id`

Update any combination of fields. Body is a partial object — only included fields are updated.

```json
{
    "title": "Alpha Playtest v2",
    "target_date": "2026-08-01",
    "linked_item_ids": ["uuid1", "uuid2", "uuid3"]
}
```

When `linked_item_ids` is provided, it replaces the full set (DELETE all from milestone_items, INSERT new set). This is simpler than incremental add/remove and matches the pattern of "here are the items for this milestone."

### `DELETE /api/milestones/:id`

Deletes the milestone. `ON DELETE CASCADE` handles the join table. Returns 204.

## UI — Client View

### Milestones section

When a client is selected in the sidebar, the client area shows a **Milestones** section below the existing client info. Contains:

- **Header:** "Milestones" with a "+ Add" button
- **Milestone cards** (one per milestone), each showing:
  - Title (bold)
  - Target date (formatted: "15 Jul 2026")
  - Progress bar (% of linked items + descendants that are Done)
  - Status badge: On Track (green), At Risk (amber), Overdue (red), Complete (green with tick)
  - Linked item count (e.g. "3 features, 12 tasks")
- Cards are **clickable** — opens the milestone detail panel

### Milestone detail panel

Same sliding panel pattern as queue detail (`queue-detail-panel`). Contains:

**Header:** Editable title + close button

**Body sections:**

1. **Target Date** — date picker, pre-filled
2. **Description** — textarea, pre-filled
3. **Status** — read-only computed status with progress bar and breakdown (e.g. "47 of 68 tasks complete — 69%")
4. **Linked Items** — list of currently linked features/stories with:
   - Item title, type badge (FT/ST), status badge, client/project context
   - Remove button per item
   - Each shows its own subtree progress (e.g. "8/12 tasks done")
5. **Add Items** — picker/search that shows available features and stories under this client. Selecting one adds it to the linked items list. Items already linked are shown as disabled/checked.

**Footer actions:**
- **Save** — persists changes via PUT
- **Delete** — confirms then deletes via DELETE

### Add Milestone flow

Clicking "+ Add" opens the same detail panel but empty (create mode). Save calls POST instead of PUT.

## UI — Portfolio "Upcoming Milestones" Panel

The existing `renderPfMilestones` function currently shows projects with due dates. This gets **replaced** with real milestone data:

- Fetches milestones from all clients (or filtered to `_portfolioSelectedClient`)
- Sorted by target_date ascending
- Same visual style as current: colour bar, client abbreviation, title, status text, date
- Clicking a milestone opens the milestone detail panel
- Empty state: "No milestones set" (instead of current "No projects with target dates")

The milestone data is fetched once and cached (same pattern as `_portfolioSnapshots`), refreshed on create/update/delete.

## Incremental sync

Milestones are a lightweight entity — the full set per client is small (typically under 10). No need for incremental polling. Fetch fresh on:

- Client view open
- Milestone create/update/delete
- Portfolio dashboard render (cached, invalidated on mutation)

## What this does NOT include

- Milestone dependencies (milestone A must complete before milestone B)
- Milestone templates (reusable milestone sets for new clients)
- Milestone notifications or alerts
- Gantt view integration (milestones as diamond markers on the timeline)

These can be added later if needed. The data model supports all of them.
