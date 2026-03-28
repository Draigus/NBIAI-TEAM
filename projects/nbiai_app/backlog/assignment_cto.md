# Task Assignment: CTO
**Assigned by:** CEO
**Date:** 2026-03-28
**Project:** NBIAI Team App
**Priority:** HIGH — blocking all engineering work

---

## Your Assignment

Design the complete technical architecture for the NBIAI app. This is Deliverable 2. Engineering cannot start without it. The architecture document must be complete enough that a senior engineer could begin implementation of any module without asking a clarifying question.

Wait for VP Product's feature spec (Deliverable 1) before finalising. You may begin the database schema and execution layer design in parallel — these are not dependent on the spec.

Reference: github.com/paperclipai/paperclip — adapt the architecture, do not copy.

---

## Stack (Already Decided — Do Not Revisit)

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js (Express or Fastify) | No serverless timeout; long-running agent calls |
| Database | PostgreSQL | Complex relational data; org hierarchy; task relations |
| ORM | Drizzle ORM | Type-safe; lightweight; PostgreSQL-first |
| Frontend | React + Tailwind + shadcn/ui | Component library; fast build |
| Auth | JWT + refresh tokens | Sessions via PostgreSQL; no external auth service |
| Real-time | PostgreSQL LISTEN/NOTIFY → WebSocket | Agent activity feed; approvals queue |
| Hosting | Railway or Render | Simple deployment; managed PostgreSQL |
| AI | Anthropic Claude API (server-side) | Node.js calls; full model tier control |

---

## Sections to Architect

### 1. Database Schema

Design the full PostgreSQL schema. Every table with:
- All columns, types, constraints, defaults
- Primary and foreign key relationships
- Indexes for performance-critical queries
- Enum types for status fields

Tables required (minimum):

**Core:**
- `users` — Glen (Board), Admin, Viewer roles; session management
- `sessions` — JWT refresh token storage
- `companies` — Company profile (single-tenant for NBI)

**Org hierarchy:**
- `roles` — All 18 defined agent roles (static config: CEO, CTO, etc.)
- `agents` — Instantiated agents (an agent is a role + persona + model tier + status)
- `agent_reports` — Reporting relationships (agent_id → reports_to_agent_id)

**Task system:**
- `projects` — Project name, status, lead agent, description
- `tasks` — Full task record: title, description, status, priority, assigned_agent_id, project_id, created_by, created_at, updated_at
- `task_relations` — blocking, blocked-by, related (task_id, related_task_id, relation_type)
- `task_comments` — Activity log per task; includes status change events
- `task_checkouts` — Atomic checkout log: which agent has a task checked out, since when

**Agent execution:**
- `agent_executions` — One record per agent run: agent_id, task_id, started_at, ended_at, status, input_tokens, output_tokens, cost_usd, log (JSONB)
- `agent_heartbeats` — Last-seen timestamp per agent; used for status display
- `agent_budgets` — Monthly cap per agent (amount_usd, current_spend, month_year)

**Approvals:**
- `approvals` — Pending/resolved approval items: type, requested_by_agent_id, content (JSONB), status (pending/approved/rejected/changes_requested), reviewer_comment, created_at, resolved_at

**Finance:**
- `revenue_items` — Contracted revenue entries: client, amount, type (monthly/one-off), start_date, end_date
- `pipeline_leads` — BD leads with stage, probability, expected_value, expected_close_date
- `payroll_items` — Staff/agent monthly costs: name, type (human/agent), monthly_cost, annual_cost, active

**Knowledge:**
- `knowledge_files` — Tier 1/2/3 files: name, tier, role_id (null for Tier 1), project_id (null unless Tier 3), content_path, last_updated

All tables must include `created_at` and `updated_at` timestamps. Use UUIDs as primary keys throughout.

---

### 2. API Design

Design the full REST API surface. Every endpoint with:
- Method and path
- Request body (fields and types)
- Response body (fields and types)
- Auth requirement
- Error responses

Group endpoints by resource:

**Auth:** POST /auth/login, POST /auth/logout, POST /auth/refresh
**Users:** GET /users, POST /users, PATCH /users/:id, DELETE /users/:id
**Agents:** GET /agents, POST /agents, PATCH /agents/:id, DELETE /agents/:id, GET /agents/:id/executions, GET /agents/:id/budget
**Projects:** GET /projects, POST /projects, PATCH /projects/:id
**Tasks:** GET /tasks, POST /tasks, PATCH /tasks/:id, POST /tasks/:id/checkout, POST /tasks/:id/checkin, GET /tasks/:id/comments, POST /tasks/:id/comments
**Executions:** GET /executions, GET /executions/:id, GET /executions/agent/:agent_id
**Approvals:** GET /approvals, GET /approvals/pending, PATCH /approvals/:id (approve/reject/request-changes)
**Finance:** GET /finance/revenue, POST /finance/revenue, GET /finance/payroll, GET /finance/pipeline, GET /finance/projection
**Settings:** GET /settings, PATCH /settings, GET /settings/api-keys, POST /settings/api-keys, DELETE /settings/api-keys/:id

---

### 3. Agent Execution Layer

Design the server-side agent execution system. This is the core of the platform — not UI.

Specify:

**Heartbeat system:**
- How agents are woken (cron schedule or task assignment trigger)
- What an "agent run" consists of: context loading order, tool availability, Claude API call structure
- How the agent receives its assignment (task record from database)
- How the agent writes its output back (execution log, task status update, any output files)
- How the heartbeat timestamp is maintained

**Context loading:**
- Tier 1 (company knowledge files): which files, how loaded, token budget
- Tier 2 (role knowledge): which role files, how determined from agent record
- Tier 3 (project knowledge): which project file, how determined from task record
- System prompt injection: role system prompt + task context + current assignment
- Estimated token footprint per tier

**Claude API integration:**
- Which SDK (Anthropic Node.js SDK — `@anthropic-ai/sdk`)
- Model selection per agent tier (Opus/Sonnet — from agent record)
- Streaming vs non-streaming (specify for each execution type)
- Tool use: which tools are available to agents server-side (file read/write, task updates, approval requests, web search if needed)
- Error handling: rate limits, API failures, context length exceeded
- Token tracking: how input/output tokens are counted and written to `agent_executions`

**Budget enforcement:**
- How the 80% alert is triggered (check before each execution)
- How the 100% hard stop is enforced (block execution, notify Glen)
- How monthly spend is reset (first of month)

**Approval gate:**
- When an agent wants to send an email, post externally, or take an external action:
  1. Agent creates an `approvals` record via internal API call
  2. Execution pauses (or completes and marks pending-approval)
  3. Glen sees item in approvals queue
  4. On approve: action executes; on reject: agent receives reason, task returns to in-progress

**Real-time updates:**
- PostgreSQL LISTEN/NOTIFY channels: `agent_activity`, `approvals_update`, `task_update`
- Node.js listens via `pg` client LISTEN; broadcasts to connected WebSocket clients
- Frontend subscribes on connect; receives real-time events without polling

---

### 4. Project Structure

Specify the Node.js project directory structure:

```
nbiai_app/
├── package.json
├── .env.example
├── drizzle.config.ts
├── src/
│   ├── index.ts              — Express/Fastify app entry point
│   ├── db/
│   │   ├── schema.ts         — Drizzle schema (all tables)
│   │   ├── migrations/       — Drizzle migration files
│   │   └── index.ts          — DB connection
│   ├── api/
│   │   ├── auth/
│   │   ├── agents/
│   │   ├── tasks/
│   │   ├── approvals/
│   │   ├── finance/
│   │   └── settings/
│   ├── execution/
│   │   ├── runner.ts         — Agent run orchestration
│   │   ├── context-loader.ts — Tier 1/2/3 context assembly
│   │   ├── claude-client.ts  — Anthropic SDK wrapper
│   │   ├── budget.ts         — Budget check and enforcement
│   │   └── heartbeat.ts      — Heartbeat scheduler
│   ├── realtime/
│   │   ├── notify.ts         — PostgreSQL LISTEN/NOTIFY
│   │   └── websocket.ts      — WebSocket server
│   ├── middleware/
│   │   ├── auth.ts           — JWT verification
│   │   └── rbac.ts           — Role-based access control
│   └── types/
│       └── index.ts          — Shared TypeScript types
└── client/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── pages/
        ├── components/
        └── hooks/
```

Confirm or amend this structure. Specify any additional files required.

---

### 5. Authentication and Security

Specify:
- JWT access token TTL (recommend 15 minutes)
- Refresh token TTL and rotation strategy
- Password hashing (bcrypt, argon2)
- RBAC: what Board, Admin, and Viewer roles can and cannot do at the API level
- Rate limiting on auth endpoints
- API key storage: how Anthropic API keys are stored (encrypted at rest; specify method)
- CORS configuration for local dev and production

---

### 6. Deployment Architecture

Specify:
- Railway or Render — which and why (make a recommendation)
- Environment variables required (list all, no values)
- Database provisioning (managed PostgreSQL on same platform)
- Build process: TypeScript compilation + Vite frontend build
- Zero-downtime deploy strategy
- Backup and recovery (daily PostgreSQL dumps minimum)

---

### 7. Development Milestones

Break the build into phases that Engineering can execute sequentially. Each phase must have:
- What gets built
- Definition of done (testable acceptance criteria)
- Which roles (Senior Engineer, Engineer, DevOps) execute it

Suggested phases:
1. Database + migrations + Drizzle setup
2. Auth API + JWT middleware
3. Core CRUD APIs (agents, projects, tasks)
4. Agent execution runner (single agent, manual trigger)
5. Real-time layer (LISTEN/NOTIFY + WebSocket)
6. Approvals workflow
7. Finance and pipeline APIs
8. React frontend — Command Centre
9. React frontend — Org Chart view
10. React frontend — remaining screens

---

## Acceptance Criteria for the Architecture Doc

- Every table defined with all columns, types, and constraints
- Every API endpoint defined with request/response shapes
- Agent execution flow described step-by-step with no gaps
- Real-time architecture specified (not "use WebSockets" — exactly how)
- Security decisions made and documented
- Development phases defined with testable acceptance criteria
- CTO self-reviews against this checklist before submitting

---

## Handoff

When complete: submit to CEO for review. CEO will review alongside VP Product's spec before passing both to VP Engineering to begin Deliverable 3 (Sprint 1 implementation).

Do not start until you have read:
- projects/nbiai_app/project_brief.md (full context)
- projects/nbiai_app/backlog/assignment_vp_product.md (what VP Product is speccing)
- company/org_chart.md (the org structure the app must represent)
- github.com/paperclipai/paperclip (reference architecture — especially the agent execution and task checkout patterns)
