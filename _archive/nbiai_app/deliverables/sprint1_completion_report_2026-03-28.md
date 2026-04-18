# Sprint 1 Completion Report -- NBIAI App

**Prepared by:** VP Engineering (via CEO Agent session)
**Date:** 28 March 2026
**Sprint scope:** Database schema + auth layer + local environment setup

---

## Sprint 1 Completion Status

Sprint 1 is **functionally complete at the code level**. All schema, auth, and infrastructure work has been applied. Local setup requires PostgreSQL provisioning and a `db:migrate` run to create the tables in the actual database -- those are environment setup steps, not code gaps.

---

## Completion Checklist vs Sprint 1 Criteria

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Fastify server starts, responds at `localhost:3001/api/v1/health` | Code complete | Requires `npm run build && npm run pm2:start` |
| 2 | All 21 database tables created with correct schemas, constraints, indexes | Code complete | Schema v2 applied. Run `npm run db:migrate` to create |
| 3 | Seed data: 1 company, 1 board user, 18 roles, 18 agents, 17 reporting relationships | Code complete | Board user added. Run `npm run db:seed` |
| 4 | Board user can log in via `POST /api/v1/auth/login` and receive a valid JWT | Code complete | Auth routes unchanged from v1 |
| 5 | Token refresh works with rotation and replay detection | Code complete | sessions table, SHA-256 hashing, replay detection in place |
| 6 | Logout invalidates the session | Code complete | Sessions revoked on logout |
| 7 | Auth middleware blocks unauthenticated requests with 401 | Code complete | `requireAuth` middleware in `src/middleware/auth.ts` |
| 8 | RBAC middleware blocks unauthorised requests with 403 | Code complete | `requireRole` + RBAC constants in `src/middleware/rbac.ts` |
| 9 | Rate limiting prevents brute-force login attempts | Code complete | Auth routes: 10/minute. Global: 100/minute |
| 10 | PM2 manages the server process and restarts on failure | Code complete | `ecosystem.config.js` created. Run `npm run pm2:start` |
| 11 | Queue folder structure committed to NBIAI_TEAM repository | **Done** | `queue/inbox|active|review|done|failed|scripts|schedules/` created |
| 12 | `docs/local_setup.md` documents the full local setup process | **Done** | Full guide at `projects/nbiai_app/docs/local_setup.md` |
| 13 | Session cleanup job runs on schedule via node-cron | Code complete | Cleanup job in auth.ts (`node-cron` added to package.json) |

---

## What Changed from v1 to v2

### Schema changes applied (2026-03-28)
- **Removed 4 tables:** `agent_heartbeats`, `agent_budgets`, `api_keys`, plus `model_pricing` was never in schema
- **Added 2 tables:** `claude_desktop_sessions`, `cost_logs`
- **Updated `task_status` enum:** Added `queued` between `assigned` and `in_progress`
- **Updated `agent_executions`:** Removed `input_tokens`, `output_tokens`, `cost_usd` (no per-token billing)
- **Added 2 enums:** `claude_session_status`, `session_trigger`
- **Added 3 columns to `tasks`:** `queued_at`, `session_id`, `session_prompt`
- **Total tables:** 21 (was 23, removed 4, added 2)

### Execution layer changes
- `execution/claude-client.ts` -- stubbed (no API calls)
- `execution/budget.ts` -- stubbed (no per-token billing)
- `execution/heartbeat.ts` -- stubbed (no API-driven heartbeats)
- `execution/runner.ts` -- stubbed (queue-based execution in Sprint 2)
- `routes/executions.ts` -- `POST /trigger` returns 501 Not Implemented
- `routes/settings.ts` -- removed api-keys and budgets endpoints
- `routes/executions.ts` -- removed `inputTokens`, `outputTokens`, `costUsd` from SELECT queries

### Dependencies
- Removed: `@anthropic-ai/sdk`
- Added: `pm2`, `pino`, `node-cron` (explicit rather than transitive)
- Updated: `package.json` with PM2 scripts (`pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:logs`)

### Infrastructure
- `ecosystem.config.js` -- PM2 configuration (autorestart, log paths, env vars)
- `.env.example` -- removed API key variables, added `BOARD_USER_PASSWORD`
- `.gitignore` (repo root) -- created, excludes queue JSON files, .env, logs
- `logs/` directory -- created for PM2 log output

---

## What Sprint 2 Adds (the essential loop)

Sprint 1 delivers: database, auth, server infrastructure.

Sprint 2 delivers the **minimum viable product** -- the queue loop that makes the whole architecture work:

1. Glen creates a task in the app
2. App assembles a session prompt, writes a JSON file to `queue/inbox/`, task status → `queued`
3. Glen (or Task Scheduler) opens Claude Desktop and runs the queued prompt
4. Glen pastes the result back via the Queue screen
5. App moves the task to `done`, stores the output

When Sprint 2 is complete, the Paperclip loop is live.

---

## Actions Required Before Sprint 2 Planning

| Action | Owner | Status |
|--------|-------|--------|
| Provision local PostgreSQL (create `nbiai` database and user) | DevOps / Glen | **Required first** |
| Run `npm install` (installs updated dependencies) | DevOps | Required |
| Create `.env` from `.env.example` with real values | DevOps / Glen | Required |
| Run `npm run db:migrate` (creates 21 tables) | DevOps | Required |
| Run `npm run db:seed` (creates company, user, roles, agents) | DevOps | Required |
| Run `npm run build && npm run pm2:start` (start server) | DevOps | Required |
| Verify health check: `GET localhost:3001/api/v1/health` | DevOps | Required |
| Log in as glen@nbi.gg with BOARD_USER_PASSWORD | Glen | Smoke test |

Once the smoke test passes, Sprint 1 is formally closed and Sprint 2 planning can begin.

---

*Report filed by VP Engineering. Sprint 1 code work complete 28 March 2026.*
*Sprint 2 brief: `projects/nbiai_app/backlog/assignment_vp_engineering_sprint2.md`*
