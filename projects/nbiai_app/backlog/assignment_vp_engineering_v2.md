# Assignment: VP Engineering -- Sprint 1 (Revised)

**From:** CEO Agent
**To:** VP Engineering Agent
**Date:** 28 Mar 2026
**Version:** 2 -- supersedes assignment_vp_engineering.md
**Priority:** Critical
**Project:** NBIAI Team App
**Status:** Active -- begin immediately

---

## What Changed from Version 1

Two architectural decisions have been confirmed since the original assignment was issued.

**1. No Anthropic API.** The NBIAI App makes zero calls to the Anthropic API. Claude Desktop sessions (on Glen's Max plan) are the execution engine. The web app manages work and displays results. It never calls Anthropic directly. Full rationale: `projects/nbiai_app/deliverables/ceo_no_api_build_plan_2026-03-28.md`.

**2. Local deployment, not Railway.** The app runs on Glen's machine. PostgreSQL runs locally. PM2 manages the server process. Tailscale provides remote access. Railway is not used.

Everything else from the original brief remains valid. PostgreSQL is confirmed. Drizzle ORM is confirmed. The full tech stack is confirmed. The schema changes and removed items are listed below.

---

## Required Reading

Read all four documents before assigning a single task:

| Document | Path | Notes |
|---|---|---|
| Feature Specification | `projects/nbiai_app/deliverables/feature_spec.md` | Primary spec. Note the VP Product no-API review supersedes some sections |
| Technical Architecture | `projects/nbiai_app/deliverables/technical_architecture.md` | Primary architecture. Note the CTO no-API review supersedes the execution layer sections |
| UI/UX Design Specification | `projects/nbiai_app/deliverables/design_spec.md` | Unchanged. All colour tokens, components, layouts valid as-is |
| CEO Review | `projects/nbiai_app/deliverables/ceo_review.md` | 7 contradiction resolutions still binding |

Also read both no-API reviews:

| Document | Path |
|---|---|
| CTO No-API Architecture Review | `projects/nbiai_app/deliverables/cto_architecture_review_file_queue.md` |
| VP Product No-API Feature Review | `projects/nbiai_app/deliverables/vp_product_review_no_api_2026-03-28.md` |

**Where documents conflict:** The no-API reviews take precedence over the original architecture and feature spec for any item they address. For everything they do not address, the original documents stand.

---

## Schema Changes for Sprint 1

The following changes apply to the database schema. Implement these instead of the original schema for the affected tables and enums.

### Tables to remove entirely from Sprint 1 schema

| Table | Reason |
|---|---|
| `agent_heartbeats` | Heartbeat system removed. No API-driven execution |
| `agent_budgets` | Per-token budget enforcement removed. No API billing |
| `api_keys` | No Anthropic API key to store. Encryption module deferred |
| `model_pricing` | No per-token pricing to reference |

These four tables do not need to exist in Sprint 1. Remove them from the schema files and migrations.

### Tables to add in Sprint 1 schema

**ClaudeDesktopSession** -- records each Claude Desktop session used to execute tasks:

| Column | Type | Constraints |
|---|---|---|
| id | uuid | primary key, default gen_random_uuid() |
| label | varchar(200) | not null |
| agent_id | uuid | nullable, FK to agents(id) |
| status | claude_session_status enum | not null, default 'pending' |
| trigger | session_trigger enum | not null |
| scheduled_for | timestamptz | nullable |
| started_at | timestamptz | nullable |
| completed_at | timestamptz | nullable |
| notes | text | nullable |
| created_by_user_id | uuid | not null, FK to users(id) |
| created_at | timestamptz | not null, default now() |
| updated_at | timestamptz | not null, default now() |

**CostLog** -- manually logged session costs:

| Column | Type | Constraints |
|---|---|---|
| id | uuid | primary key, default gen_random_uuid() |
| session_id | uuid | not null, FK to claude_desktop_sessions(id) |
| agent_id | uuid | nullable, FK to agents(id) |
| period_month | date | not null |
| cost_usd | decimal(10,2) | not null |
| notes | varchar(500) | nullable |
| created_by_user_id | uuid | not null, FK to users(id) |
| created_at | timestamptz | not null, default now() |

### New enums to add

```sql
-- Add to enums.ts
claude_session_status: 'pending' | 'in_progress' | 'completed' | 'failed'
session_trigger: 'manual' | 'scheduled'
```

### Columns to add to existing tables

**tasks table -- add three columns:**

| Column | Type | Constraints |
|---|---|---|
| queued_at | timestamptz | nullable |
| session_id | uuid | nullable, FK to claude_desktop_sessions(id) |
| session_prompt | text | nullable |

### Enums to update

**task_status enum -- add 'queued':**

```
backlog | assigned | queued | in_progress | review | done | blocked | cancelled
```

Insert 'queued' between 'assigned' and 'in_progress'.

### Columns to remove from existing tables

**agents table -- remove:**
- `monthly_budget_cap_usd`
- `current_month_spend_usd`

**agent_executions table -- remove:**
- `input_tokens`
- `output_tokens`
- `cost_usd`

**companies table -- remove:**
- `anthropic_api_key_encrypted`

### Count of tables after changes

Original: 23 tables. Remove 4, add 2. Sprint 1 schema: **21 tables**.

---

## Sprint 1 Task Breakdown

### Task 1: Project Scaffold and Configuration

**Assign to:** Senior Engineer

**Scope:** Same as original brief with one change. Remove `@anthropic-ai/sdk` from the server dependencies. It is not used. Everything else in Task 1 is unchanged.

**Updated package.json server dependencies:** `fastify`, `@fastify/cors`, `@fastify/websocket`, `@fastify/rate-limit`, `drizzle-orm`, `drizzle-kit`, `pg`, `argon2`, `jose`, `node-cron`, `zod`, `pino`, `pino-pretty`, `dotenv`, `tsx`, `pm2`

**Updated .env.example -- remove these variables:**
- `ANTHROPIC_API_KEY`
- `API_KEY_ENCRYPTION_SECRET`
- `DEFAULT_AGENT_BUDGET_USD`

**Updated .env.example -- retain all others from original spec.**

**Acceptance criteria:** Same as original brief.

---

### Task 2: Database Schema and Migrations

**Assign to:** Senior Engineer

**Depends on:** Task 1

**Scope:** Implement the full schema with the changes listed in the Schema Changes section above.

- 21 tables (not 23 -- four removed, two added)
- Updated task_status enum (add 'queued')
- Two new enums: claude_session_status, session_trigger
- Updated columns on tasks, agents, agent_executions, companies as specified above
- All other tables from the original CTO schema are unchanged

**Deliverables:**
- 21 Drizzle schema files
- 1 updated enums file (16 enum types total: original 14 minus none, plus 2 new)
- Generated migration SQL
- Working migration script

**Acceptance criteria:**
- `npm run db:migrate` creates all 21 tables without errors
- All 16 enum types exist in the database
- tasks table includes queued_at, session_id, session_prompt columns
- tasks table status enum includes 'queued'
- claude_desktop_sessions and cost_logs tables exist with correct schemas
- agents table does NOT have monthly_budget_cap_usd or current_month_spend_usd
- companies table does NOT have anthropic_api_key_encrypted

---

### Task 3: Seed Script

**Assign to:** Engineer

**Depends on:** Task 2

**Scope:** Same as original brief with these changes:

- Remove step 6 (agent budgets) -- agent_budgets table does not exist
- Remove step 7 (agent heartbeats) -- agent_heartbeats table does not exist

**Updated seed sequence:**
1. Company record
2. Board user (Argon2id password hash)
3. 18 role records (same list as original brief)
4. 18 agent records (status: idle)
5. Agent reporting relationships (same hierarchy as original brief)

**No budget records. No heartbeat records.**

**Updated role list -- one change from original brief:** VP Engineering model tier is `sonnet` (not `opus`). The role file has been updated to reflect this. The seed must match.

**Acceptance criteria:**
- `npm run db:seed` creates 1 company, 1 board user, 18 roles, 18 agents, 17 reporting relationships
- Running seed twice does not create duplicates
- VP Engineering agent has model_tier `sonnet`
- All other agents match the model tiers in the original brief
- No budget records. No heartbeat records.

---

### Task 4 (Revised): Local Environment Setup

**Assign to:** DevOps

**Replaces:** Original Task 4 (Railway deployment). Railway is not used.

**Scope:**

1. **PostgreSQL local setup:**
   - Verify PostgreSQL is installed on Glen's machine (or install if not present)
   - Create the `nbiai` database and `nbiai` user with appropriate permissions
   - Document the setup steps in `projects/nbiai_app/docs/local_setup.md`

2. **Environment configuration:**
   - Create `.env` from `.env.example` with real values for the local environment
   - Generate secure values for `JWT_SECRET` (64-byte hex, use `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
   - Set `DATABASE_URL` to the local PostgreSQL connection string
   - Store `.env` securely -- it must never be committed to git (verify `.gitignore` covers it)

3. **PM2 configuration:**
   - Create `ecosystem.config.js` at the project root for PM2 process management:
     - App name: `nbiai-api`
     - Script: `dist/index.js` (built output)
     - Env file: `.env`
     - Restart policy: on failure, max 5 restarts
     - Log file locations: `logs/api.log` and `logs/api-error.log`
   - Create `npm run pm2:start`, `npm run pm2:stop`, `npm run pm2:restart`, `npm run pm2:logs` scripts in package.json
   - Document PM2 usage in `projects/nbiai_app/docs/local_setup.md`

4. **Startup verification:**
   - Run `npm run db:migrate` against local PostgreSQL and verify it completes
   - Run `npm run db:seed` and verify seed data
   - Start the server with `npm run dev` and verify health check at `localhost:3001/api/v1/health`
   - Start with PM2 and verify it restarts automatically after a manual process kill

5. **Tailscale note:**
   - Document that Tailscale provides remote access. Glen accesses the app at his machine's Tailscale IP.
   - No additional configuration required from DevOps -- Tailscale is already installed and configured on Glen's machine.

**Deliverables:**
- Local PostgreSQL configured with nbiai database
- .env file with secure values (not committed)
- ecosystem.config.js committed to repo
- PM2 npm scripts in package.json
- docs/local_setup.md covering setup and PM2 usage

**Acceptance criteria:**
- `GET http://localhost:3001/api/v1/health` returns `{ "status": "ok" }`
- Database contains all seed data
- PM2 restarts the process after a kill
- `docs/local_setup.md` is clear enough for a new engineer to set up the project from scratch

---

### Task 5: Authentication -- Core Endpoints

**Assign to:** Senior Engineer

**Depends on:** Tasks 1, 2, 3

**Scope:** Unchanged from original brief. Implement login, refresh, and logout endpoints exactly as specified in the original assignment.

**Acceptance criteria:** Unchanged from original brief.

---

### Task 6: Authentication -- Middleware and Rate Limiting

**Assign to:** Engineer

**Depends on:** Task 5

**Scope:** Unchanged from original brief. Auth middleware, RBAC middleware, rate limiting, session cleanup job.

**One change:** Remove `node-cron` session cleanup job from this task -- it already appears in the original spec. The job should remain. This note is just to confirm: session cleanup via node-cron is kept even though we removed the heartbeat cron. Legitimate operational need.

**Acceptance criteria:** Unchanged from original brief.

---

### Task 7 (Revised): Queue Folder Structure

**Assign to:** Engineer

**Replaces:** Original Task 7 (API key encryption). API key encryption is not needed -- there is no Anthropic API key to store.

**Scope:**

Create the file-based task queue folder structure in the NBIAI_TEAM repository. This is the bridge between the web app and Claude Desktop sessions.

1. **Create the folder structure:**
```
D:\OneDrive\Claude_code\NBIAI_TEAM\queue\
  inbox\        (app writes pending tasks here)
  active\       (Claude Desktop moves tasks here when picked up)
  review\       (tasks awaiting Glen's review after session completes)
  done\         (completed tasks, archived)
  failed\       (failed sessions for investigation)
  scripts\      (trigger scripts for Windows Task Scheduler)
  schedules\    (Task Scheduler XML config files, version controlled)
```

2. **Create a .gitkeep file in each folder** so the folder structure is tracked by git but the task files themselves are gitignored (add `queue/inbox/*.json`, `queue/active/*.json`, etc. to .gitignore -- but NOT `queue/scripts/` or `queue/schedules/`).

3. **Define the task file JSON schema** and document it in `projects/nbiai_app/docs/queue_schema.md`:

```json
{
  "task_id": "uuid",
  "assigned_to": "role_slug (e.g. gaming_practice_lead)",
  "model_tier": "Opus | Sonnet | Haiku",
  "priority": "critical | high | medium | low",
  "title": "Task title",
  "description": "Full task description",
  "project_id": "uuid (from database)",
  "session_prompt": "Full assembled prompt ready to paste into Claude Desktop",
  "created_at": "ISO8601",
  "queued_at": "ISO8601",
  "claimed_at": null,
  "completed_at": null,
  "result_endpoint": "POST http://localhost:3001/api/v1/queue/results",
  "status": "inbox | active | review | done | failed"
}
```

4. **Create `queue/scripts/README.md`** documenting how trigger scripts will work (to be built in Sprint 6).

**Deliverables:**
- Queue folder structure created in NBIAI_TEAM repo
- .gitignore updated to exclude task JSON files but include folder structure and scripts
- queue_schema.md documenting the task file format
- queue/scripts/README.md

**Acceptance criteria:**
- All five queue subfolders exist in the repo
- .gitignore correctly excludes task JSON files but tracks .gitkeep files
- queue_schema.md documents all fields with types and descriptions
- The queue folder structure is committed to git

---

## Sprint 1 Completion Criteria

Sprint 1 is complete when ALL of the following are true:

1. The Fastify server starts and responds to the health check endpoint at `localhost:3001/api/v1/health`
2. All 21 database tables are created with correct schemas, constraints, and indexes
3. Seed data is populated: 1 company, 1 board user, 18 roles, 18 agents, 17 reporting relationships
4. The board user can log in with `POST /api/v1/auth/login` and receive a valid JWT
5. Token refresh works with rotation and replay detection
6. Logout invalidates the session
7. Auth middleware blocks unauthenticated requests with 401
8. RBAC middleware blocks unauthorised requests with 403
9. Rate limiting prevents brute-force login attempts
10. PM2 manages the server process and restarts on failure
11. Queue folder structure is committed to the NBIAI_TEAM repository
12. `docs/local_setup.md` documents the full local setup process
13. Session cleanup job runs on schedule via node-cron

**Removed from original:** Railway deployment criterion (item 11 in original). That is replaced by PM2 + local setup above.

---

## Task Ordering

```
Task 1 (Scaffold)
  |
  |-- Task 2 (Schema) -- depends on Task 1
  |     |
  |     |-- Task 3 (Seed) -- depends on Task 2
  |     |     |
  |     |     |-- Task 5 (Auth Endpoints) -- depends on 1, 2, 3
  |     |           |
  |     |           |-- Task 6 (Auth Middleware) -- depends on Task 5
  |     |
  |     |-- Task 4 (Local Setup) -- can begin immediately, runs alongside
  |
  |-- Task 7 (Queue Structure) -- depends on Task 1 only, can run in parallel
```

**Recommended execution:**
- Day 1-2: Senior Engineer: Task 1. DevOps: Task 4 (local PostgreSQL setup). Engineer: Task 7 (queue folder structure).
- Day 2-3: Senior Engineer: Task 2 (schema). DevOps: environment and PM2 config.
- Day 3-4: Engineer: Task 3 (seed). DevOps: migrate and seed local database.
- Day 4-6: Senior Engineer: Task 5 (auth endpoints). Engineer: Task 6 (middleware).
- Day 6: Full Sprint 1 completion check against all 13 criteria.

---

## Escalation Protocol

Unchanged from original brief:
- Technical decision not in the specs: escalate to CTO
- Feature or UX question: escalate to VP Product
- Do not sit on a blocker for more than 4 hours

---

## Reporting

Status update at end of each day during Sprint 1:
- Tasks completed
- Tasks in progress
- Blockers or decisions needed
- Revised estimate if anything has slipped

---

**This assignment supersedes assignment_vp_engineering.md in full.**

**CEO Agent**
28 Mar 2026
