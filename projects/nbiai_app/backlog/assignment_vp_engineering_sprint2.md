# Assignment: VP Engineering -- Sprint 2

**From:** CEO Agent
**To:** VP Engineering Agent
**Date:** 28 Mar 2026
**Version:** 1
**Priority:** Critical
**Project:** NBIAI Team App
**Status:** Active -- begin after Sprint 1 smoke test passes

---

## Sprint 2 Goal

Build the **essential loop** -- the minimum viable product that makes the no-API architecture work end-to-end.

When Sprint 2 is done, Glen can:
1. Create a task in the NBIAI App
2. See it in the Queue screen with a prepared prompt
3. Copy the prompt, run it in Claude Desktop
4. Paste the result back into the app
5. See the task marked complete with the output stored

That is the Paperclip loop live. Everything after Sprint 2 is incremental improvement.

---

## Entry Condition

Sprint 2 begins after Sprint 1 smoke test passes:
- `GET localhost:3001/api/v1/health` returns `{"status":"ok"}`
- Glen can log in as glen@nbi.gg

---

## Required Reading

All Sprint 1 documents remain binding. Read the following additions for Sprint 2:

| Document | Path |
|----------|------|
| Queue Schema | `projects/nbiai_app/docs/queue_schema.md` |
| No-API Build Plan | `projects/nbiai_app/deliverables/ceo_no_api_build_plan_2026-03-28.md` |
| Sprint 1 Completion Report | `projects/nbiai_app/deliverables/sprint1_completion_report_2026-03-28.md` |
| CTO Architecture Review | `projects/nbiai_app/deliverables/cto_architecture_review_file_queue.md` |
| VP Product No-API Review | `projects/nbiai_app/deliverables/vp_product_review_no_api_2026-03-28.md` |
| Design Spec | `projects/nbiai_app/deliverables/design_spec.md` |

---

## Task 1: Queue API Routes

**Assign to:** Senior Engineer
**Scope:** The four API endpoints that power the queue lifecycle

### POST /api/v1/queue/create
Creates a task and queues it in one step. Writes the JSON task file to `queue/inbox/`.

**Request body:**
```json
{
  "projectId": "uuid",
  "assignedAgentId": "uuid",
  "title": "string (max 500 chars)",
  "description": "string",
  "priority": "critical | high | medium | low",
  "modelTier": "Opus | Sonnet | Haiku"
}
```

**Behaviour:**
1. Validate the agent and project belong to the authenticated company
2. Create the task record in the database (status: `assigned`)
3. Assemble the session prompt (see Prompt Assembly below)
4. Write the JSON task file to `queue/inbox/{task_id}.json`
5. Update task status to `queued`, set `queued_at = now()`
6. Return the created task with the session prompt

**Prompt Assembly:**
The session prompt is assembled from:
- Agent persona (read from `{NBIAI_REPO_PATH}/roles/{agent_slug}/persona.md`)
- Agent responsibilities (read from `{NBIAI_REPO_PATH}/roles/{agent_slug}/responsibilities.md`)
- System prompt (read from `{NBIAI_REPO_PATH}/roles/{agent_slug}/prompts/system_prompt.md`)
- Tier 1 knowledge files (all files in `company/knowledge/`)
- Task title, description, project context

Prompt format:
```
## Identity

{persona content}

## Responsibilities

{responsibilities content}

## Company Context

{tier 1 knowledge}

## Task

**Project:** {project name}
**Title:** {task title}

{task description}

---
Produce your output directly. No preamble. No meta-commentary.
```

**Acceptance criteria:**
- Task created in DB with status `queued`
- JSON file written to `queue/inbox/{task_id}.json` with correct schema (see queue_schema.md)
- `session_prompt` field populated in both the file and the DB task record
- `queued_at` timestamp set
- Returns 201 with the full task object

---

### GET /api/v1/queue
Returns the current queue state for the Queue screen dashboard.

**Response:**
```json
{
  "data": {
    "inbox": [ ...task summaries... ],
    "active": [ ...task summaries... ],
    "review": [ ...task summaries... ],
    "completedToday": [ ...task summaries... ],
    "counts": {
      "inbox": 3,
      "active": 1,
      "review": 2,
      "completedToday": 5
    }
  }
}
```

Each task summary includes: `id`, `title`, `priority`, `assignedAgentName`, `modelTier`, `queuedAt`, `status`

**Behaviour:** Reads the database (not the filesystem). The filesystem queue folder is the bridge to Claude Desktop; the DB is the app's source of truth.

**Acceptance criteria:**
- Returns correct counts matching actual task statuses
- `completedToday` includes tasks completed in the last 24 hours

---

### GET /api/v1/queue/:taskId/prompt
Returns the assembled session prompt for a specific queued task.

**Use case:** Glen opens the Queue screen, clicks a task, and copies the prompt to paste into Claude Desktop.

**Behaviour:**
- Returns 404 if task not found or not in `queued`/`active` status
- Returns the `session_prompt` field from the task record
- Also returns task metadata (title, assigned agent, model tier, priority)

**Acceptance criteria:**
- Returns 200 with prompt for queued/active tasks
- Returns 404 for tasks in other statuses
- Returns 404 if task doesn't belong to the authenticated company

---

### POST /api/v1/queue/results
Glen pastes Claude Desktop output back into the app.

**Request body:**
```json
{
  "taskId": "uuid",
  "sessionId": "uuid (optional -- creates a new session record if not provided)",
  "status": "completed | failed",
  "output": "Full text output from Claude Desktop",
  "modelUsed": "claude-opus-4-5-20251101 (optional)",
  "completedAt": "ISO 8601 (optional, defaults to now)"
}
```

**Behaviour:**
1. Validate task belongs to the company and is in `queued` or `in_progress` status
2. Create or update a `claude_desktop_sessions` record
3. Update the task: `output = body.output`, `status = 'review'` (needs Glen's sign-off) or `'done'` (if auto-approved)
4. Move the queue file from `active/` to `review/` or `done/`
5. Write an `activity_log` entry: `task_completed` or `task_failed`
6. Return the updated task

**Note on session creation:** If `sessionId` is not provided, create a new `claude_desktop_sessions` record with `trigger = 'manual'`, `status = 'completed'`, link it to the task.

**Acceptance criteria:**
- Task status updated correctly
- `claude_desktop_sessions` record created or updated
- Queue file moved to `review/` or `done/`
- Activity log entry written
- Returns the updated task

---

## Task 2: Queue Screen (Frontend)

**Assign to:** UI/UX Designer + Senior Engineer (frontend)
**Depends on:** Task 1

**Scope:** The Queue screen at `/queue` -- Glen's daily operational hub.

Reference: design_spec.md (Queue screen, screen 4).

### Layout

```
Queue Screen
┌─────────────────────────────────────────────────────────┐
│ Queue                          [+ New Task]             │
├─────────────────────────────────────────────────────────┤
│ Summary bar:                                            │
│ [3 Waiting] [1 In Progress] [2 In Review] [5 Done today]│
├──────────────┬──────────────┬───────────────────────────┤
│ INBOX        │ IN REVIEW    │ COMPLETED TODAY            │
│ 3 tasks      │ 2 tasks      │ 5 tasks                   │
│              │              │                           │
│ [Task card]  │ [Task card]  │ [Task card]               │
│ [Task card]  │ [Task card]  │ [Task card]               │
│ [Task card]  │              │ [Task card]               │
└──────────────┴──────────────┴───────────────────────────┘
```

### Task Card
Each card shows:
- Task title
- Agent name and model tier badge (Opus/Sonnet/Haiku)
- Priority indicator (coloured dot: red=critical, amber=high, grey=medium/low)
- Time queued ("queued 2h ago")
- **[Copy Prompt]** button (for inbox/active tasks)
- **[Post Results]** button (for active tasks)
- **[View Output]** button (for review/done tasks)

### New Task Modal (triggered by [+ New Task] button)
- Project selector (dropdown, required)
- Agent selector (dropdown, shows active agents with model tier)
- Title (text input, required)
- Description (textarea, required)
- Priority selector
- [Create and Queue] button

On submit: calls `POST /api/v1/queue/create`, refreshes the queue on success.

### Copy Prompt Flow
1. Glen clicks [Copy Prompt] on an inbox task
2. The session prompt is copied to clipboard
3. Toast: "Prompt copied. Paste into Claude Desktop to run this task."
4. Task status moves to `in_progress` (or stays `queued` until results are posted -- TBD)

### Post Results Modal (triggered by [Post Results] button)
- Task title shown at top (read-only)
- Large textarea: "Paste Claude Desktop output here"
- Status selector: Completed / Failed
- [Submit] button

On submit: calls `POST /api/v1/queue/results`, refreshes queue, shows success toast.

### Data fetching
- Polls `GET /api/v1/queue` every 10 seconds via React Query
- Manual refresh button

**Acceptance criteria:**
- Queue screen loads and shows correct counts
- [+ New Task] creates a task and it appears in the inbox
- [Copy Prompt] copies the correct prompt to clipboard
- [Post Results] successfully posts output and moves task to review/done
- 10-second polling keeps counts updated

---

## Task 3: ClaudeDesktopSession Management

**Assign to:** Senior Engineer
**Depends on:** Task 1 (POST /queue/results creates sessions)

**Scope:** Session Log screen at `/sessions` and the session management API.

### GET /api/v1/sessions
Paginated list of Claude Desktop sessions.

**Query params:** `limit`, `cursor`, `agentId`, `status`, `trigger`

**Each session includes:** `id`, `label`, `agentId`, `agentName`, `status`, `trigger`, `scheduledFor`, `startedAt`, `completedAt`, `notes`, `taskCount` (number of tasks in this session)

### GET /api/v1/sessions/:id
Full session record with linked tasks.

### PATCH /api/v1/sessions/:id
Update session notes (board and admin only).

### Session Log Screen (/sessions)
Reference: design_spec.md (Session Log screen, screen 5).

A table/list view showing:
- Session label
- Date/time
- Trigger (Manual / Scheduled)
- Status badge
- Tasks processed count
- Duration (if completed)
- Notes
- [View] link to session detail

Session detail shows: all tasks in the session with their output previews.

**Acceptance criteria:**
- Sessions created by POST /queue/results appear in the session log
- Session detail shows linked tasks
- Notes can be updated

---

## Sprint 2 Completion Criteria

Sprint 2 is complete when ALL of the following are true:

1. `POST /api/v1/queue/create` creates a task and writes a JSON file to `queue/inbox/`
2. `GET /api/v1/queue` returns accurate queue counts
3. `GET /api/v1/queue/:taskId/prompt` returns the assembled prompt
4. `POST /api/v1/queue/results` accepts pasted output, updates task, creates session record
5. Queue screen (`/queue`) renders correctly with all cards and counts
6. [+ New Task] flow completes: task created, appears in inbox
7. [Copy Prompt] copies the correct prompt to clipboard
8. [Post Results] flow completes: output saved, task moves to review/done
9. Session log (`/sessions`) shows sessions created by the results endpoint
10. Queue polling refreshes counts every 10 seconds

**CEO quality gate:** When the above criteria are all met, notify CEO for the 8/10 quality review before Sprint 2 is formally closed.

---

## Task Ordering

```
Task 1 (Queue API Routes) -- independent, start immediately
Task 2 (Queue Screen) -- depends on Task 1 API being available
Task 3 (Session Management) -- depends on Task 1 (results endpoint creates sessions)
```

**Recommended execution:**
- Day 1-2: Task 1 (all four API endpoints)
- Day 2-4: Task 2 (Queue screen, in parallel with Task 3)
- Day 3-4: Task 3 (Session Log screen and API)
- Day 4-5: Integration testing, edge cases, CEO quality review
- Day 5: Sprint 2 complete, Sprint 3 planning

---

## Escalation Protocol

Unchanged from Sprint 1:
- Technical decision not in specs: escalate to CTO
- Feature or UX question: escalate to VP Product
- Do not sit on a blocker for more than 4 hours

---

*Issued by CEO Agent, 28 March 2026.*
*This brief is active after Sprint 1 smoke test passes.*
