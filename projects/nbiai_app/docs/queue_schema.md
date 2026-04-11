# Task Queue File Schema

**Location:** `D:\OneDrive\Claude_code\NBIAI_TEAM\queue\`
**Written by:** NBIAI App (Fastify backend)
**Read by:** Claude Desktop sessions on Glen's Max plan

---

## Overview

The file-based task queue is the bridge between the NBIAI App web frontend and Claude Desktop execution. The app writes JSON task files to `queue/inbox/`. Claude Desktop (or a scheduled script) picks them up, executes the task, and posts the result back to the app via the REST API.

## Folder Structure

```
queue/
  inbox/      ← App writes new task files here (status: inbox)
  active/     ← Claude Desktop moves tasks here when claimed (status: active)
  review/     ← Tasks awaiting Glen's review after session completes (status: review)
  done/       ← Completed tasks, archived (status: done)
  failed/     ← Failed sessions for investigation (status: failed)
  scripts/    ← Trigger scripts for Windows Task Scheduler (version controlled)
  schedules/  ← Task Scheduler XML config files (version controlled)
```

**Note:** Task JSON files themselves are gitignored (they contain session prompts and output). Only `.gitkeep` files are tracked to preserve the folder structure. `scripts/` and `schedules/` contents are version-controlled.

---

## Task File Format

Each task file is named `{task_id}.json` and lives in one of the queue subfolders.

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "assigned_to": "gaming_practice_lead",
  "model_tier": "Opus",
  "priority": "high",
  "title": "Draft Couch Heroes Q2 hiring plan",
  "description": "Full task description, including any relevant context and deliverable requirements.",
  "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "session_prompt": "...[full assembled prompt ready to paste into Claude Desktop]...",
  "created_at": "2026-03-28T10:00:00Z",
  "queued_at": "2026-03-28T10:01:00Z",
  "claimed_at": null,
  "completed_at": null,
  "result_endpoint": "POST http://localhost:3001/api/v1/queue/results",
  "status": "inbox"
}
```

---

## Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task_id` | UUID | Yes | Matches the `id` column in the `tasks` database table |
| `assigned_to` | string | Yes | Role slug of the agent responsible (e.g. `gaming_practice_lead`, `ceo`, `cfo`) |
| `model_tier` | string | Yes | `Opus`, `Sonnet`, or `Haiku` -- determines which Claude model to use in Desktop |
| `priority` | string | Yes | `critical`, `high`, `medium`, or `low` |
| `title` | string | Yes | Short task title for display and reference |
| `description` | string | Yes | Full task description and context |
| `project_id` | UUID | Yes | The project this task belongs to (matches `projects.id` in DB) |
| `session_prompt` | string | Yes | The full assembled prompt, ready to paste into Claude Desktop. Includes system context, knowledge tiers, and the specific task instruction. |
| `created_at` | ISO 8601 | Yes | When the task was created in the database |
| `queued_at` | ISO 8601 | Yes | When the task was moved to `queued` status and written to the inbox |
| `claimed_at` | ISO 8601 or null | No | Set when Claude Desktop picks up the task and moves it to `active/` |
| `completed_at` | ISO 8601 or null | No | Set when results are posted back to the app |
| `result_endpoint` | URL | Yes | The endpoint to POST results back to. Always `POST http://localhost:3001/api/v1/queue/results` |
| `status` | string | Yes | Current location: `inbox`, `active`, `review`, `done`, or `failed` |

---

## Queue Lifecycle

```
App creates task (status: backlog)
    ↓
Glen or agent assigns task (status: assigned)
    ↓
App assembles session prompt, writes JSON to queue/inbox/
Task status: queued → file written to inbox/
    ↓
Claude Desktop picks up file, moves to active/
File status field: active → task DB status: in_progress
    ↓
Claude Desktop executes, produces output
    ↓
Results POST'd to POST /api/v1/queue/results
File moved to done/ (success) or failed/ (error)
Task DB status: review (pending Glen's approval) or done
    ↓
Glen reviews (if needed), marks complete
Final status: done
```

---

## Result Payload (Sprint 2)

When Claude Desktop completes a task, it POSTs to `result_endpoint`:

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "status": "completed",
  "output": "Full text output from the Claude Desktop session...",
  "completed_at": "2026-03-28T11:30:00Z",
  "model_used": "claude-opus-4-5-20251101"
}
```

The `POST /api/v1/queue/results` endpoint is implemented in Sprint 2.

---

## Gitignore Rules

The following are added to `.gitignore`:

```
# Queue task files (contain session prompts and output -- not for version control)
queue/inbox/*.json
queue/active/*.json
queue/review/*.json
queue/done/*.json
queue/failed/*.json

# Queue folder structure is tracked via .gitkeep files
# queue/scripts/ and queue/schedules/ are fully version-controlled
```
