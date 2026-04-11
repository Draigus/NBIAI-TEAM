# CTO Architecture Review: File-Based Task Queue Redesign

**Author:** CTO
**Date:** 2026-03-28
**Version:** 1.0
**Status:** Submitted to CEO and Glen Pryer for decision
**Subject:** Architectural redesign mandated by zero Anthropic API constraint

---

## Executive Summary

Glen has mandated that the NBIAI App makes no calls to the Anthropic API. All AI agent execution happens through Claude Desktop sessions on Glen's Max plan. This is not a minor adjustment; it removes the beating heart of the original architecture (Section 3 of technical_architecture.md v1.0) and replaces it with a file-based task queue that Claude Desktop sessions poll manually or on a schedule.

The rest of the application -- the database, the API, the frontend, the authentication layer, the approvals workflow -- survives intact. The change is surgical: remove the server-side execution engine, add a file-based queue that Claude Desktop reads and writes.

This review specifies the replacement in full. A senior engineer can begin implementation from this document without asking a clarifying question.

---

## 1. What Changes

### 1.1 What Gets Removed

The following components from technical_architecture.md v1.0 are **entirely removed**:

**Section 3 -- Agent Execution Layer (complete removal):**
- `src/execution/runner.ts` -- the 13-step execution run (Section 3.2). This is gone. Claude Desktop replaces it.
- `src/execution/context-loader.ts` -- Tier 1/2/3 context assembly with token budgets (Section 3.3). Gone. Claude Desktop reads the files directly from `D:\OneDrive\Claude_code\NBIAI_TEAM\`.
- `src/execution/claude-client.ts` -- the `@anthropic-ai/sdk` wrapper (Section 3.4). Gone.
- `src/execution/tools/` -- all 11 server-side agent tools (Section 3.5). Gone. Replaced by Claude Desktop writing to task files.
- The in-memory FIFO execution queue with concurrency control. Gone.
- The `node-cron` heartbeat scheduler that woke agents every 5 minutes. Replaced by a Windows Task Scheduler or Claude Desktop Projects scheduled prompt.

**Database tables made redundant:**
- `agent_executions` -- tracked API call input/output tokens, cost_usd, model_used. No longer meaningful since no API calls are made from the app. **Replaced** by a simplified `queue_executions` table (see Section 2.5 below) that records Claude Desktop session outcomes.
- `agent_budgets` -- monthly API cost caps. No longer needed. Glen's Max plan has no per-token cost. **Remove this table entirely.**
- `api_keys` -- AES-256-GCM encrypted Anthropic API keys. No longer needed. **Remove this table entirely.**

**Environment variables removed:**
```
ANTHROPIC_API_KEY              # Removed entirely
MAX_CONCURRENT_EXECUTIONS      # No longer relevant
HEARTBEAT_INTERVAL_MINUTES     # No longer relevant
DEFAULT_AGENT_BUDGET_USD       # No longer relevant
API_KEY_ENCRYPTION_SECRET      # No longer needed (was only for api_keys table)
```

**Package dependencies removed:**
```
@anthropic-ai/sdk              # The Anthropic Node.js SDK -- removed entirely
```

**Phase 4 from the original milestones (Agent Execution Runner) is removed in full.**

### 1.2 Database: SQLite vs PostgreSQL

**Recommendation: Switch to SQLite.**

**Justification:**

The original PostgreSQL choice was justified by three requirements: Railway hosting (managed Postgres is trivial on Railway), real-time LISTEN/NOTIFY for WebSocket events, and multi-user concurrency under agent execution load. All three justifications weaken or disappear under the new constraint:

| Factor | PostgreSQL | SQLite |
|---|---|---|
| Hosting requirement | Requires a running server (Railway, VPS, or local installation) | A single `.db` file. Runs anywhere Node.js runs. |
| Real-time layer | LISTEN/NOTIFY is elegant but ties us to Postgres | File polling or SQLite WAL mode supports simple polling with no extra infrastructure |
| Concurrency | Handles high concurrent write load well | Handles low concurrent write load fine. The new architecture has one writer (Claude Desktop) and one reader (the web app). Write contention is negligible. |
| Setup complexity | Requires connection strings, pg user management, schema migrations against a live server | `better-sqlite3` opens a local file. The file lives at `D:\OneDrive\Claude_code\NBIAI_TEAM\db\nbiai.db`. Zero server dependency. |
| Backup | Railway managed backups | Git-tracked or OneDrive-synced file. One file to copy. |
| Local dev | Requires Docker or a local Postgres install | Nothing to install beyond `npm ci` |
| Cost | Railway Pro: ~£20/month minimum | £0 |

The decisive factor is this: the app is now a local-first tool. There is no Railway deployment. The app runs on Glen's machine (or a machine on Glen's local network, accessed via Tailscale). Running a PostgreSQL server for a single-user, local-first app with low write volume is unnecessary infrastructure overhead. SQLite with WAL mode supports everything we need.

**Migration path from the original schema:** All 23 tables port directly to SQLite. The only changes are:
- PostgreSQL enum types become `TEXT` with CHECK constraints in SQLite (Drizzle ORM handles this transparently with its SQLite dialect)
- `gen_random_uuid()` becomes `randomUUID()` from Node's `crypto` module, called at the application layer
- `LISTEN/NOTIFY` is replaced by a polling endpoint the frontend calls every 5 seconds (see Section 2.5)

**ORM:** Drizzle ORM supports SQLite natively via `drizzle-orm/better-sqlite3`. The schema file changes are minimal. The migration toolchain (`drizzle-kit generate`, `drizzle-kit migrate`) works identically.

### 1.3 Hosting: Local vs Cloud

**Recommendation: Local (localhost) with Tailscale for remote access.**

**Justification:**

The no-API constraint makes cloud hosting actively problematic, not just unnecessary. A cloud-hosted app (Railway, Render, Vercel) would need to either:
(a) make Anthropic API calls itself (prohibited), or
(b) read a task queue from a file share accessible to both the cloud and Glen's local machine (complex, slow, fragile)

Neither is acceptable. The file-based task queue lives on Glen's local machine at `D:\OneDrive\Claude_code\NBIAI_TEAM\`. Claude Desktop sessions on Glen's Max plan read and write those files. The web app reads the same files or the SQLite database. Everything must be co-located.

**Deployment target:** The Fastify server runs on Glen's Windows machine. The React frontend is served as static files from the same Fastify process. Glen accesses it at `http://localhost:3001` from his local browser.

**Remote access:** Tailscale provides a zero-config VPN. Install Tailscale on Glen's machine and on any other device (phone, tablet, second laptop) that needs access. The app is then accessible at Glen's Tailscale IP (e.g. `http://100.x.x.x:3001`) from any device on the Tailscale network. No public internet exposure. No certificates needed for internal use (though a Tailscale HTTPS cert can be added trivially if needed).

**Why not a home server or NAS?** Glen could run the app on a separate always-on machine (NUC, NAS). This is valid but is an operational choice Glen makes after the app is built. The architecture supports it without code changes; the Fastify server just runs on a different hostname.

**Process management:** Use PM2 to run the Fastify process. `pm2 start dist/index.js --name nbiai-app` keeps it alive across crashes and starts it on Windows startup.

---

## 2. The File-Based Task Queue

### 2.1 Folder Structure

The task queue lives inside the existing `NBIAI_TEAM` repo. This ensures it is version-controlled, synced via OneDrive, and readable by Claude Desktop sessions that already have access to the repo.

```
D:\OneDrive\Claude_code\NBIAI_TEAM\
└── queue\
    ├── inbox\          # Tasks waiting to be picked up by Claude Desktop
    ├── active\         # Tasks currently being worked on (Claude Desktop has claimed them)
    ├── review\         # Tasks completed by Claude Desktop, awaiting Glen's review in the app
    ├── done\           # Approved/resolved tasks, archived here
    ├── failed\         # Tasks that errored or were rejected
    └── .schema\        # JSON Schema file documenting task file format (not processed)
```

**Why this structure:** The folder names map directly to the task lifecycle. A task file moves through folders as it progresses. The web app watches all folders. Claude Desktop operates exclusively in `inbox` (claiming tasks) and `active` + `review` (writing results). Glen operates in `review` (approving/rejecting via the web app UI, which then moves the file).

**File naming convention:**

```
{task_id}_{agent_slug}_{priority}_{yyyymmdd_hhmmss}.json

Example:
7f3a2b1c_cto_high_20260328_143022.json
```

The `task_id` is the UUID from the `tasks` database table. The `agent_slug` is the role slug (e.g. `cto`, `senior_engineer`, `qa_lead`). The priority and timestamp allow for visual triage without opening the file. File names are constructed by the web app when it creates a task in the queue.

### 2.2 Task File Format

Each task file is a JSON document. The format is the contract between the web app (which writes inbox files) and Claude Desktop sessions (which read them and write results back).

```json
{
  "schema_version": "1.0",
  "task_id": "7f3a2b1c-4d5e-4f6a-b7c8-9d0e1f2a3b4c",
  "agent_slug": "cto",
  "agent_name": "CTO",
  "project_id": "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "project_slug": "nbiai-app",
  "priority": "high",
  "title": "Review authentication middleware for replay attack vulnerability",
  "description": "The current refresh token rotation logic does not handle concurrent refresh requests from multiple tabs. When two tabs call /auth/refresh simultaneously, one succeeds and one receives a 401, triggering a logout. Investigate and propose a fix.",
  "context": {
    "tier1_paths": [
      "company/knowledge/company_overview.md",
      "company/org_chart.md",
      "company/policies/approval_gates.md"
    ],
    "tier2_paths": [
      "roles/cto/knowledge/",
      "roles/cto/responsibilities.md"
    ],
    "tier3_paths": [
      "projects/nbiai_app/project_charter.md",
      "projects/nbiai_app/knowledge/"
    ],
    "related_task_ids": ["3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f"],
    "previous_output": null
  },
  "approval_required": false,
  "requires_glen_review": false,
  "created_at": "2026-03-28T14:30:22Z",
  "created_by": "glen",
  "due_at": null,
  "result": null,
  "error": null,
  "claimed_at": null,
  "completed_at": null,
  "session_notes": null
}
```

**Field definitions:**

| Field | Type | Written by | Purpose |
|---|---|---|---|
| `schema_version` | string | Web app | Version of this file format. Allows forward compatibility. |
| `task_id` | UUID | Web app | Foreign key to `tasks` table in the SQLite database. |
| `agent_slug` | string | Web app | Matches `roles.slug` in the database and the `roles/` folder name. |
| `agent_name` | string | Web app | Display name for the session prompt. |
| `project_id` | UUID | Web app | Foreign key to `projects` table. |
| `project_slug` | string | Web app | Used to construct knowledge file paths. |
| `priority` | string | Web app | `critical`, `high`, `medium`, or `low`. |
| `title` | string | Web app | Short task title. |
| `description` | string | Web app | Full task brief. May be multi-paragraph. |
| `context.tier1_paths` | array | Web app | Relative paths from repo root for Tier 1 knowledge files. |
| `context.tier2_paths` | array | Web app | Relative paths for Tier 2 knowledge. Trailing `/` means all files in directory. |
| `context.tier3_paths` | array | Web app | Relative paths for Tier 3 knowledge. |
| `context.related_task_ids` | array | Web app | UUIDs of related tasks. Claude Desktop reads these from the database or fetches their task files. |
| `context.previous_output` | string or null | Web app | If this is a re-run or continuation, the previous output is included here. |
| `approval_required` | boolean | Web app | If true, Claude Desktop must not act on external communications without Glen's sign-off. |
| `requires_glen_review` | boolean | Web app | If true, task moves to `review/` folder; Glen must approve before `done/`. |
| `created_at` | ISO 8601 | Web app | Task creation timestamp. |
| `created_by` | string | Web app | `"glen"` or an `agent_slug`. |
| `due_at` | ISO 8601 or null | Web app | Optional deadline. |
| `result` | string or null | **Claude Desktop** | The agent's output. Written in-place when Claude Desktop completes the task. |
| `error` | string or null | **Claude Desktop** | Error description if the session failed. |
| `claimed_at` | ISO 8601 or null | **Claude Desktop** | Set when Claude Desktop moves the file to `active/`. |
| `completed_at` | ISO 8601 or null | **Claude Desktop** | Set when Claude Desktop writes the result and moves the file to `review/` or `done/`. |
| `session_notes` | string or null | **Claude Desktop** | Any additional notes, reasoning, or caveats from the session. Glen sees this in the web app. |

### 2.3 How Claude Desktop Sessions Pick Up Tasks

Claude Desktop sessions do not poll automatically. They are triggered one of two ways:

**Manual trigger:** Glen opens Claude Desktop, opens the relevant Project (e.g. the "NBIAI Team -- CTO" project), and pastes or types a prompt. The session prompt template is below.

**Scheduled trigger (Windows Task Scheduler):** A scheduled task runs a small script that opens the relevant Claude Desktop project with a pre-formed prompt. This replaces the original `node-cron` heartbeat. See Section 3.

**Session prompt template for processing the task queue:**

```
You are {agent_name}, the {agent_role_title} at NBI Analytics.

Before you begin, read the following files to load your context:
- D:\OneDrive\Claude_code\NBIAI_TEAM\{system_prompt_path}
- D:\OneDrive\Claude_code\NBIAI_TEAM\{persona_path}
- D:\OneDrive\Claude_code\NBIAI_TEAM\company\knowledge\company_overview.md
- D:\OneDrive\Claude_code\NBIAI_TEAM\company\org_chart.md
- D:\OneDrive\Claude_code\NBIAI_TEAM\company\policies\approval_gates.md

Then check for work by reading the task queue:
- D:\OneDrive\Claude_code\NBIAI_TEAM\queue\inbox\

Find any task files with agent_slug = "{agent_slug}".

For each task you find (process one at a time in priority order -- critical first, then high, medium, low):

1. Read the full task file at D:\OneDrive\Claude_code\NBIAI_TEAM\queue\inbox\{filename}.json
2. Load the knowledge files listed in context.tier2_paths and context.tier3_paths
3. Move the file to D:\OneDrive\Claude_code\NBIAI_TEAM\queue\active\ by editing claimed_at to the current timestamp
4. Complete the task described in the title and description fields
5. Write your output into the result field of the task file
6. Write any notes, caveats, or reasoning into session_notes
7. Set completed_at to the current timestamp
8. If requires_glen_review is true: move the file to D:\OneDrive\Claude_code\NBIAI_TEAM\queue\review\
   If requires_glen_review is false: move the file to D:\OneDrive\Claude_code\NBIAI_TEAM\queue\done\
9. Update the database record: write the result back to the tasks table by calling POST /api/v1/queue/results
   (The API endpoint accepts { task_id, result, session_notes, status })
   Use http://localhost:3001/api/v1/queue/results with the internal service token stored at
   D:\OneDrive\Claude_code\NBIAI_TEAM\queue\.service_token

If you find no tasks for agent_slug "{agent_slug}", respond: "Queue empty for {agent_slug}. No work to do."
```

**Critical design note on the API write-back:** Claude Desktop writes results both to the task file (which the web app polls by watching the filesystem) and to the database via a lightweight internal API endpoint. The API endpoint is the authoritative record; the file is the transport mechanism. The endpoint `POST /api/v1/queue/results` requires a static service token (a 64-byte hex string stored in `queue/.service_token` and in the Fastify environment config). This token is never shown in the web UI and never used for authentication of Glen's browser session.

### 2.4 How Results Get Written Back

Claude Desktop writes results in three steps, all during the same session:

**Step 1: Update the task file in-place**

Claude Desktop edits the JSON file at `queue/active/{filename}.json`:
- Sets `result` to the output text
- Sets `session_notes` if applicable
- Sets `completed_at` to the current ISO 8601 timestamp

**Step 2: Move the file to the correct output folder**

- If `requires_glen_review: true` -- move to `queue/review/`
- If `requires_glen_review: false` -- move to `queue/done/`
- If the session encountered an error -- set `error` field and move to `queue/failed/`

**Step 3: Call the write-back endpoint**

```
POST http://localhost:3001/api/v1/queue/results
Authorization: Bearer {service_token}
Content-Type: application/json

{
  "task_id": "7f3a2b1c-4d5e-4f6a-b7c8-9d0e1f2a3b4c",
  "result": "...",
  "session_notes": "...",
  "status": "review",
  "completed_at": "2026-03-28T15:12:44Z"
}
```

The Fastify handler for this endpoint:
1. Validates the service token
2. Updates `tasks.output`, `tasks.status`, `tasks.completed_at`, `tasks.updated_at` in the SQLite database
3. Writes an `activity_log` row (`event_type: 'task_completed'` or `event_type: 'task_failed'`)
4. Writes a `task_comments` row (type: `'system'`, content: `"Agent completed task via Claude Desktop session"`)
5. If `status: 'review'`, creates a row in the `approvals` table with `approval_type: 'other'`, `status: 'pending'`
6. Returns `200 OK`

The frontend polls `GET /api/v1/tasks/{id}` every 10 seconds when a task detail page is open, so it picks up the result without WebSocket infrastructure.

### 2.5 How the Web App Reads Task Status

**Primary mechanism: SQLite database polling via REST API.**

The frontend uses React Query with a 10-second refetch interval on task list and task detail queries. This replaces the PostgreSQL LISTEN/NOTIFY and WebSocket real-time layer from the original architecture. For an internal tool with one user, 10-second polling is acceptable. It is operationally simpler and removes all WebSocket infrastructure.

**Secondary mechanism: filesystem watcher (optional, for snappier UX).**

The Fastify server can use `chokidar` to watch `D:\OneDrive\Claude_code\NBIAI_TEAM\queue\` for file moves. When a file appears in `review/` or `done/`, it triggers a database update and emits a lightweight Server-Sent Events (SSE) message to the browser. SSE is simpler than WebSocket for one-way server-to-client updates and does not require a persistent PostgreSQL connection. This is optional for v1.

**Dashboard aggregate:** The Command Centre dashboard calls a single `GET /api/v1/dashboard/summary` endpoint that returns counts across all task statuses, agent statuses, pending approvals, and recent activity. This is a read-only SQL query with no real-time dependency. The frontend refetches it every 30 seconds.

---

## 3. The Scheduling Layer

### 3.1 How Agent Sessions Are Triggered

Claude Desktop does not have a built-in scheduler. Scheduled execution is handled by **Windows Task Scheduler** invoking a small Node.js or PowerShell script that uses the Claude Desktop CLI (if Anthropic provides one) or opens a named project with a pre-formed prompt.

At the time of writing (2026-03-28), Claude Desktop does not expose a CLI for programmatic session invocation. The practical scheduling mechanism is one of two approaches:

**Approach A: Windows Task Scheduler + AutoHotkey (interim, available now)**

A Windows Task Scheduler task runs a PowerShell script on schedule. The script:
1. Checks if there are any `.json` files in `queue/inbox/` for the target agent slug
2. If yes, opens Claude Desktop to the correct project and injects the session prompt via AutoHotkey keystrokes
3. If no, exits silently

This is inelegant but works today without waiting for Anthropic to provide a CLI.

**Approach B: Claude Desktop Projects with scheduled prompts (when available)**

If Anthropic adds scheduled prompt support to Claude Desktop Projects (which is a natural product direction given the Max plan positioning), this becomes a first-class configuration. The project's scheduled prompt would be the template from Section 2.3 above.

**Recommendation:** Build Approach A for v1. It is deterministic and controllable. When Anthropic provides a better mechanism, swap it out with no changes to the queue or database layer.

### 3.2 Cron Schedule

Each agent role that performs regular work gets a scheduled task. The schedule is defined by role tier and work frequency:

| Agent(s) | Schedule | Rationale |
|---|---|---|
| CEO | Daily at 08:00 | Morning review of backlog, task assignment, status check |
| COO, CTO, CMO, CFO | Daily at 08:30 | After CEO has assigned work |
| VP Engineering, VP Product | Daily at 09:00 | After leadership has reviewed |
| Senior Engineer, Engineer, QA Lead, QA Engineer | Every 4 hours (09:00, 13:00, 17:00, 21:00) | IC work cadence |
| DevOps | Daily at 09:00 | Infrastructure work |
| Data Analyst, Tech Writer | Daily at 10:00 | Typically receive work from leadership in the morning |
| UI/UX Lead, UI/UX Designer | Daily at 09:30 | Design work typically follows product direction |
| Head of People, Producer | Daily at 10:00 | Operational cadence |
| Data Engineer | Daily at 09:00 | Data pipeline work |

**Windows Task Scheduler entries** are stored as XML files in `D:\OneDrive\Claude_code\NBIAI_TEAM\queue\schedules\`. One `.xml` per agent. This makes the schedules version-controlled and importable on any Windows machine with `schtasks /create /xml`.

**Example schedule XML (CTO, daily 08:30):**

```xml
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2026-03-29T08:30:00</StartBoundary>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Actions>
    <Exec>
      <Command>node</Command>
      <Arguments>D:\OneDrive\Claude_code\NBIAI_TEAM\queue\scripts\trigger_agent.js --agent cto</Arguments>
    </Exec>
  </Actions>
</Task>
```

**`trigger_agent.js`** is a script stored in `queue/scripts/` that:
1. Reads `queue/inbox/` and filters for files matching `agent_slug: "cto"`
2. If files exist, writes the session prompt to a temp file at `queue/scripts/.prompt_cto.txt`
3. Calls `POST /api/v1/queue/session-log` to record that a session was triggered (audit trail)
4. Invokes the Claude Desktop automation (AutoHotkey or CLI when available)

### 3.3 Failed Session Recovery

Failures fall into three categories:

**Category 1: Claude Desktop session errors (Claude produced an error or partial output)**

Claude Desktop writes an `error` field in the task file and moves it to `queue/failed/`. The web app displays failed tasks in a "Failed Tasks" view on the dashboard. Glen can:
- Retry the task (web app moves the file back to `queue/inbox/` and clears `error`, `claimed_at`, `completed_at`)
- Mark it as cancelled (moves to `done/` with `status: 'cancelled'`)
- Edit the task description and retry

**Category 2: Orphaned active tasks (the session was interrupted before completion)**

A task file stuck in `queue/active/` with a `claimed_at` more than 2 hours old is considered orphaned. The Fastify server runs a cleanup job every 30 minutes (using `node-cron` for this lightweight internal job, not for agent execution) that:
1. Scans `queue/active/` for files where `claimed_at < now - 2 hours`
2. Moves orphaned files back to `queue/inbox/`
3. Clears `claimed_at` on the file
4. Updates `tasks.status` back to `'assigned'` in the database
5. Writes an `activity_log` row: `event_type: 'task_orphaned'`

Glen sees a notification in the web app. He can retry or cancel.

**Category 3: Schedule trigger failures (Windows Task Scheduler did not fire)**

The `trigger_agent.js` script writes a row to `queue/.schedule_log.jsonl` (newline-delimited JSON) every time it runs, whether or not tasks were found. The web app exposes a `GET /api/v1/queue/schedule-log` endpoint. Glen can see at a glance which agents ran on schedule. A missing entry is visible immediately.

Additionally, the Fastify server exposes `GET /api/v1/queue/health` which reports:
- Oldest file in `inbox/` (with `claimed_at: null`)
- Count of files in each folder
- Count of orphaned active files
- Last run time per agent slug (derived from `.schedule_log.jsonl`)

This gives Glen a single-endpoint operational view of the queue health without navigating the filesystem.

---

## 4. What Stays Unchanged

### 4.1 Architecture Components That Survive Intact

The following sections of technical_architecture.md v1.0 are **valid without modification:**

| Section | Status | Notes |
|---|---|---|
| Section 1: Database Schema | Valid with two table removals and one addition | `agent_budgets` and `api_keys` tables removed. `queue_executions` table added (see below). All other 21 tables unchanged. |
| Section 2: API Design | Valid with additions | All existing endpoints unchanged. Three new internal endpoints added (`/queue/results`, `/queue/session-log`, `/queue/health`). |
| Section 4: Project Structure | Valid | File and directory layout unchanged. The `src/execution/` directory is removed. `src/queue/` directory is added. |
| Section 5: Authentication and Security | Valid entirely | JWT, Argon2id, RBAC, rate limiting, refresh token rotation, replay detection -- all unchanged. The service token for queue write-back is an addition, not a replacement. |
| Section 6.5: Zero-Downtime Deployment | Not applicable (local hosting) | Replaced by PM2 process management. |
| Section 7, Phases 1-3, 5-11 (minus Phase 4) | Valid with Phase 4 replacement | Phase 4 is replaced (see Section 5 below). |

### 4.2 Database Tables That Remain Unchanged

All 21 surviving tables from the original 23:

`companies`, `users`, `sessions`, `roles`, `agents`, `agent_reports`, `projects`, `tasks`, `task_relations`, `task_comments`, `task_checkouts`, `agent_heartbeats`, `approvals`, `revenue_items`, `pipeline_leads`, `payroll_items`, `knowledge_files`, `activity_log`, `clients`

**`agent_heartbeats` note:** This table remains but its semantics change. Rather than tracking API call liveness, it now records the last time Claude Desktop processed a task for the agent. The `trigger_agent.js` script calls `POST /api/v1/queue/session-log` which updates `agent_heartbeats.last_seen_at` and `status_message`. The dashboard agent status feed remains meaningful.

**`task_checkouts` note:** The partial unique index enforcing single-agent checkout still applies. When Claude Desktop claims a task (moves file to `active/`), it calls `POST /api/v1/queue/claim` (a new internal endpoint) which performs the atomic checkout insert. This preserves the checkout integrity guarantee from the original design.

**New table: `queue_sessions`**

Replaces the audit function of `agent_executions` without the API-specific fields (tokens, cost, model):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `agent_id` | UUID | FK -> agents(id) |
| `task_id` | UUID | FK -> tasks(id), nullable |
| `status` | TEXT | 'triggered', 'claimed', 'completed', 'failed', 'orphaned' |
| `triggered_at` | TIMESTAMPTZ | When the schedule script ran |
| `claimed_at` | TIMESTAMPTZ | When Claude Desktop claimed the task |
| `completed_at` | TIMESTAMPTZ | When the result was written |
| `error_message` | TEXT | Nullable |
| `session_notes` | TEXT | Claude Desktop's notes field |
| `created_at` | TIMESTAMPTZ | |

**`agent_executions` removal caveat:** The original CEO review (ceo_review.md, line 49) praised the `agent_executions` table as "the primary audit trail for all agent activity." That audit function is not lost; it is moved to `queue_sessions` and the task file JSON itself (which is version-controlled in the repo). The file is a richer audit record than a database row was, because it contains the full input context paths, the complete result, and session notes in a human-readable format.

---

## 5. Revised Build Phases

### Phases From Original Architecture: Validity Assessment

| Original Phase | Title | Status |
|---|---|---|
| Phase 1 | Database and Foundation | **Valid.** Switch Postgres to SQLite. Remove `agent_budgets` and `api_keys` tables. Add `queue_sessions` table. |
| Phase 2 | Authentication | **Valid entirely.** No changes. |
| Phase 3 | Core CRUD APIs | **Valid.** Add three internal queue endpoints: `/queue/claim`, `/queue/results`, `/queue/session-log`. |
| Phase 4 | Agent Execution Runner | **Replaced.** See Phase 4R below. |
| Phase 5 | Real-Time Layer | **Replaced.** WebSocket + LISTEN/NOTIFY replaced by polling + optional SSE + chokidar filesystem watcher. |
| Phase 6 | Approvals Workflow | **Valid entirely.** Approvals are still created by the queue write-back endpoint when `requires_glen_review: true`. |
| Phase 7 | Finance and Pipeline APIs | **Valid entirely.** |
| Phase 8 | React Frontend -- Command Centre and Org Chart | **Valid with minor change.** Remove agent execution trigger from UI. Add queue health widget to Command Centre. |
| Phase 9 | React Frontend -- Projects, Tasks, Approvals | **Valid entirely.** |
| Phase 10 | React Frontend -- Finance, Clients, Settings | **Valid with minor change.** Remove API Key Management page from Settings (no api_keys table). Remove budget management (no agent_budgets table). Add Queue Status page to Settings. |
| Phase 11 | Integration, Polish, and Deployment | **Replaced.** Railway deployment replaced by local PM2 setup. Add Windows Task Scheduler configuration. |

### New Phases

**Phase 4R: File-Based Task Queue Infrastructure**

Replaces Phase 4 entirely.

**What gets built:**
- `queue/` folder structure in the `NBIAI_TEAM` repo (inbox, active, review, done, failed, scripts, schedules)
- `queue/scripts/trigger_agent.js` -- reads inbox, checks for agent tasks, invokes Claude Desktop automation
- `queue/.service_token` -- generated 64-byte hex string (gitignored, documented in setup guide)
- `POST /api/v1/queue/claim` -- atomic task checkout from Claude Desktop
- `POST /api/v1/queue/results` -- write-back endpoint for Claude Desktop session results
- `POST /api/v1/queue/session-log` -- schedule trigger audit log
- `GET /api/v1/queue/health` -- queue operational health endpoint
- Orphaned task cleanup job (node-cron, every 30 minutes, in Fastify process)
- `queue_sessions` Drizzle schema and migration
- Windows Task Scheduler XML files for all 18 agent roles in `queue/schedules/`
- Session prompt template file at `queue/scripts/session_prompt_template.txt`

**Assigned to:** Senior Engineer (API endpoints, queue logic, Drizzle schema), DevOps (Windows Task Scheduler setup, PM2 configuration, AutoHotkey script for Claude Desktop invocation)

**Acceptance criteria:**
- [ ] `queue/inbox/` exists and is accessible from a Claude Desktop session via the MCP filesystem tool
- [ ] A manually crafted task JSON file in `queue/inbox/` is visible and readable by Claude Desktop
- [ ] `POST /api/v1/queue/claim` performs an atomic checkout (concurrent claim attempts result in 409 for the second)
- [ ] `POST /api/v1/queue/results` updates `tasks.output`, `tasks.status`, `task_comments`, `activity_log`, and `queue_sessions` in a single transaction
- [ ] A task with `requires_glen_review: true` creates a pending approval row on write-back
- [ ] Orphaned task cleanup correctly identifies files in `active/` with `claimed_at > 2 hours` and moves them back to `inbox/`
- [ ] `GET /api/v1/queue/health` returns accurate counts for each folder and the oldest inbox item age
- [ ] Windows Task Scheduler fires `trigger_agent.js --agent cto` at 08:30 and the schedule log captures the run
- [ ] End-to-end test: Glen creates a task via web UI -> file appears in `queue/inbox/` -> manual Claude Desktop session claims it, writes result, calls write-back -> task appears as completed in web UI within 10-second poll interval

**Phase 5R: Polling-Based Status Updates**

Replaces Phase 5 (Real-Time Layer).

**What gets built:**
- React Query configuration with 10-second refetch intervals on task list, task detail, and approvals endpoints
- `GET /api/v1/dashboard/summary` response includes `queue_health` block (inbox count, active count, review count, oldest item age)
- Optional: `chokidar` filesystem watcher on `queue/` in the Fastify process, broadcasting SSE events to connected browsers when files move between folders
- Optional: SSE endpoint at `GET /api/v1/events` using `@fastify/sse` or a lightweight SSE plugin

**Assigned to:** Engineer

**Acceptance criteria:**
- [ ] Task status changes appear in the web UI within 10 seconds of the database write
- [ ] No WebSocket infrastructure is present in the codebase
- [ ] Queue health metrics appear on the Command Centre dashboard
- [ ] Dashboard refetches correctly after browser tab is backgrounded and restored

**Phase 11R: Local Deployment and Operations Setup**

Replaces Phase 11 (Railway deployment).

**What gets built:**
- PM2 ecosystem config (`ecosystem.config.js`) for running the Fastify server on Windows
- `npm run setup` script that: generates `.service_token`, creates the `queue/` folder structure, seeds the SQLite database, imports Windows Task Scheduler XML files via `schtasks`
- Tailscale setup guide (Tier 3 knowledge doc, not a code artefact)
- `GET /api/v1/health` updated to check SQLite connectivity and queue folder accessibility
- Error boundary components, loading states, 404 page (from original Phase 11, unchanged)

**Assigned to:** DevOps (PM2, setup script, Task Scheduler import), Senior Engineer (health check, error polish)

**Acceptance criteria:**
- [ ] `npm run setup` runs on a fresh Windows machine and produces a working application accessible at `http://localhost:3001`
- [ ] `pm2 start ecosystem.config.js` keeps the server alive after a process crash (verified by killing the Node process)
- [ ] PM2 starts the server automatically on Windows login (via `pm2 startup`)
- [ ] Tailscale device can access the app at the Tailscale IP on port 3001 (verified from a second device)
- [ ] `GET /api/v1/health` reports SQLite status and queue folder accessibility
- [ ] All 18 Windows Task Scheduler tasks are imported and visible in Task Scheduler after setup

---

## 6. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Claude Desktop has no CLI; automated invocation relies on AutoHotkey UI automation | High | Build AutoHotkey script in Phase 4R. Accept this as a known fragility. When Anthropic ships a CLI or API trigger for Max plan, swap it in. The queue and database layer are unchanged. |
| Claude Desktop session interrupted mid-task (power loss, app crash) | Medium | Orphaned task cleanup (2-hour timeout, moves back to inbox). File is not lost; it is in `active/` and can be manually recovered. |
| Task file corrupted by a partial write from Claude Desktop | Low | Task files are small JSON. Partial writes are rare on local NTFS. The web app validates JSON on read and moves corrupt files to `failed/` with an error log entry. |
| OneDrive sync conflicts on queue files | Medium | Set `queue/inbox/`, `queue/active/` to sync-excluded in OneDrive settings if conflicts occur. These are transient working files; the database is the source of truth. Only `queue/done/` and `queue/failed/` benefit from OneDrive history. |
| Claude Desktop session reads stale knowledge files | Low | Files are read fresh from disk at session start. OneDrive sync latency is typically under 30 seconds. For tasks that cannot tolerate stale context, Glen triggers the session manually after confirming sync. |
| Single-user constraint: the architecture assumes one human operator | Accepted | This is intentional. Glen is the sole user. The architecture is correct for this use case. Multi-user support can be added later by adding auth tokens to the queue claim endpoint and assigning session identities. |

---

**Submitted to:** CEO, Glen Pryer
**Next step:** Glen approves the architecture change. VP Engineering updates sprint planning to replace Phase 4 and Phase 5 with Phase 4R, Phase 5R, and Phase 11R. Senior Engineer begins Phase 1 modifications (SQLite migration, table removals).
