# Task Queue Backend + UI

## Summary

A submission queue where team members (with permission) can create work items that land in a triage list. Glen reviews, promotes items into the work hierarchy (pre-filled creation flow), or dismisses them. First sub-project of the Slack → WorkSage pipeline — this builds the backend and UI; the Slack bot integration follows separately.

## Database

### New table: `task_queue`

```sql
CREATE TABLE task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  submitted_by TEXT NOT NULL,
  slack_user_id TEXT,
  slack_channel TEXT,
  slack_message_ts TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### User permission: `can_submit_queue`

Add column to `users` table:

```sql
ALTER TABLE users ADD COLUMN can_submit_queue BOOLEAN DEFAULT false;
```

## API Endpoints

### POST /api/queue
- Auth: requires `can_submit_queue = true` OR admin role
- Body: `{ title, description? }`
- Sets `submitted_by` from `req.user.displayName`
- Returns created item

### GET /api/queue
- Auth: admin only
- Returns all items ordered by `created_at DESC`

### DELETE /api/queue/:id
- Auth: admin only
- Deletes the item (used after promote or dismiss)

## Frontend

### Sidebar
- New "Queue" view item in the sidebar, between Bug Tracker and Settings
- Badge shows count of pending items (like bug tracker open count)
- Icon: inbox/tray symbol

### Queue View
- Simple list of queued items, newest first
- Each item card shows:
  - Title (bold)
  - Description (if present, truncated to 2 lines)
  - Submitted by + relative timestamp
  - Source channel (if from Slack, shown as a muted label)
- Two action buttons per item:
  - **Promote** — calls `addItem()` with type picker and pre-filled title/description, on successful save calls DELETE /api/queue/:id
  - **Dismiss** — confirmation toast, then DELETE /api/queue/:id

### Settings
- In the Users management section, add a "Queue submission" toggle per user
- Toggling calls PATCH /api/users/:id with `{ can_submit_queue: true/false }`

### Promote Flow
1. User clicks Promote on a queue item
2. `_pickClient()` dialog appears (reusing the existing client picker from +New)
3. After client is selected, a type picker appears (Project/Feature/Story/Task)
4. Item is created via `createTaskObject()` with title and description pre-filled
5. Detail panel opens for the new item
6. Queue item is deleted via API

## Files Changed

- `dashboard-server/migrations/037_task_queue.sql` — new table + user column
- `dashboard-server/server.js` — 3 new endpoints (POST/GET/DELETE /api/queue)
- `nbi_project_dashboard.html` — sidebar entry, queue view render, promote logic, settings toggle

## Not In Scope

- Slack bot (separate sub-project)
- Editing queued items (just promote or dismiss)
- Priority/ordering within the queue
- Assigning queue items to other people for triage
