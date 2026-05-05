# Queue Detail Panel — Design Spec

## Goal

Replace the current Promote/Dismiss buttons on queue items with a full detail panel that lets Glen fill in all task card fields before promoting. The panel should render the complete detail form for the selected item type, identical to the existing task detail panel.

## Interaction Flow

1. Glen clicks a queue item in the Submission Queue list
2. Side panel slides in from the right (same `detail-panel` component style)
3. Top section shows:
   - **Title** (editable input, pre-filled from queue item)
   - **Description** (editable textarea, pre-filled)
   - **Source info** (read-only: submitted_by, timestamp, Slack channel — styled as metadata)
4. Below that:
   - **Client** dropdown (required — populated from contracted clients)
   - **Item Type** picker (project/feature/story/task — required)
5. Once Client and Item Type are both selected, the **full detail form for that item type** renders below — same fields and sections as `openDetailOverlay` shows for an existing task of that type (status, priority, health, assignee, due date, hours estimated, practice area, etc.)
6. Bottom action bar:
   - **Promote** button (disabled until Client + Item Type selected) — creates the task with all filled fields, deletes the queue item, opens the new task's detail view
   - **Dismiss** button — confirmation dialog, then deletes queue item

## Architecture

- **No server changes.** All form state lives client-side until Promote is clicked.
- **No new database tables or migrations.** Queue items stay in `task_queue` as-is.
- **Reuse existing rendering.** The detail form for the selected item type should reuse the same field rendering functions used by `openDetailOverlay` (e.g., `detailSelect`, `assigneeSelectHtml`, etc.). This avoids duplicating field definitions and keeps the forms in sync.

## Implementation Approach

Create a `openQueueDetail(queueId)` function that:

1. Finds the queue item from `_queueData`
2. Renders the side panel with the queue-specific header (source info + client/type pickers)
3. On client/type selection, builds a temporary task object via `createTaskObject` (not yet persisted) and renders the full detail fields for it
4. Field changes update the temporary task object in memory
5. Promote: pushes the temporary task to `tasks[]`, calls `markDirty`/`save`, deletes the queue item via API, refreshes the queue view
6. Dismiss: same as current `_actDismissQueueItem`

## Fields by Item Type

All item types share the same detail panel fields. The existing `openDetailOverlay` already handles differences by type (e.g., projects show client picker, child items inherit client). The queue detail panel inherits this behaviour automatically by reusing the same rendering logic.

## Styling

- Same `detail-panel` CSS classes as the existing task detail panel
- Source info section styled with muted text and a subtle divider separating it from the editable fields
- Client and Item Type dropdowns styled consistently with other detail panel dropdowns

## What This Does NOT Include

- No changes to the queue API endpoints
- No changes to the Slack bot
- No changes to the task_queue database schema
- No new permissions or auth changes
