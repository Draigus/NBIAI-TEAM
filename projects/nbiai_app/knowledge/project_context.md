# NBIAI App -- Project Context (Tier 3 Knowledge)

Last updated: 2026-03-28

---

## What This App Is

The NBIAI App is an internal management application for operating NBI's AI agent team. It provides a dashboard for monitoring agent executions, managing roles and projects, tracking approvals, overseeing finances (AI spend), managing the client pipeline, and configuring the system. It is the operational backbone for the AI company structure defined in this repository.

This is not a client-facing product. It is an internal tool for Glen Pryer and the NBI AI team to run the agent organisation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js + Fastify |
| Database | PostgreSQL (Supabase-compatible) |
| ORM | Drizzle ORM |
| Auth | bcryptjs password hashing, JWT (15-min access tokens in-memory, 30-day refresh tokens), AES-256-GCM API key encryption |
| Frontend | React + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| AI SDK | @anthropic-ai/sdk (server-side only) |
| Hosting target | Railway |
| Design | Dark theme, #0A0A0F base, #4F6EF7 Electric Indigo accent |

**Standing technical decisions (do not revisit):**
- bcryptjs, not argon2 -- argon2 fails on Windows without native build tools
- Access tokens stored in-memory, not localStorage (XSS mitigation)
- British English only, no em dashes

---

## Current Sprint Status

**Sprint 1: Complete.** Full-stack application built and all critical/high bugs resolved.

**Sprint 2: Not yet started.** Blocked on 8 conditions from the C-suite charter review (see `deliverables/csuite_charter_review.md`). Key blockers remaining:
- VP Product to deliver reconciled feature spec within 3 working days
- Agent status enum resolution (CEO flagged)
- Verification that all High bugs from Sprint 1 are resolved

Sprint 2 scope includes:
- 2 Critical + 13 High PRD gaps from the validation report
- `pipeline_lead_stage_history` schema migration (funnel analytics blocked)
- `/finance/summary` and `/finance/agent-costs` aggregate endpoints
- Settings screen: Agent Library and Knowledge Base sub-sections (unspecced -- VP Product must act)
- `/api/v1/pipeline?overdue=true` backend filter

---

## Application Structure

All code lives in `projects/nbiai_app/app/`.

**Backend (`src/`):**
- `db/schema.ts` -- 22 tables, 16 enums
- `db/migrations/` -- generated Drizzle migrations
- `db/seed.ts` -- idempotent seed data (NBI Analytics company, 18 roles, 18 agents, 6 projects, Tier 1 knowledge, sample revenue)
- `lib/crypto.ts` -- password hashing, API key encryption, refresh token hashing
- `lib/validate.ts` -- Zod schemas for all endpoints
- `middleware/auth.ts`, `middleware/rbac.ts` -- JWT auth + role-based access control
- Routes: auth, agents, tasks, projects, approvals, finance, clients, settings, users, dashboard, executions
- `execution/runner.ts` -- 16-step agent orchestrator
- `execution/context-loader.ts` -- Tier 1/2/3 context assembly from repo files
- `execution/claude-client.ts` -- Anthropic SDK wrapper (model mapping: opus to claude-opus-4-6, sonnet to claude-sonnet-4-6, haiku to claude-haiku-4-5-20251001)
- `execution/budget.ts` -- 80% alert threshold, 100% hard stop, monthly reset
- `realtime/` -- PostgreSQL LISTEN/NOTIFY on 7 channels, WebSocket with JWT auth

**Frontend (`client/src/`):**
- 12 routes: Login, Setup (3-step wizard), Dashboard, OrgChart (pan/zoom tree), RoleDetail (6 tabs), Projects, ProjectDetail, TaskDetail, Finance (5 tabs), Approvals (master/detail), Clients (kanban+table), Settings (6 tabs)
- `lib/api.ts` -- all paths at `/api/v1/`
- `hooks/useAuth.ts` -- session restoration via refresh token on reload

---

## Key Deliverables Produced

All stored in `projects/nbiai_app/deliverables/`:

| Deliverable | Owner | Status |
|---|---|---|
| `feature_spec.md` | VP Product | Complete |
| `technical_architecture.md` | CTO | Complete |
| `design_spec.md` | UI/UX Lead | Complete |
| `ceo_review.md` | CEO | Complete -- 7 contradictions resolved, 11 binding decisions |
| `test_plan.md` | QA Lead | Complete -- 103 test cases |
| `bug_report.md` | QA Lead | Complete -- 24 bugs (2 Critical, 8 High, 9 Medium, 5 Low) |
| `prd_validation_report.md` | VP Product | Complete -- 65% fidelity, 2 Critical gaps, 13 High gaps |
| `engineering_integration_brief.md` | VP Engineering | Complete -- 25-item checklist, 15 known gaps |
| `analytics_requirements.md` | Data Analyst | Complete -- 26 metrics, schema gap flagged |
| `reporting_dashboard_spec.md` | Data Analyst | Complete -- 8 widgets, weekly CEO report format |
| `cfo_cost_model.md` | CFO | Complete -- $297/month moderate use, $1,000/month recommended cap |
| `people_assessment.md` | Head of People | Complete |
| `ux_competitive_research.md` | UI/UX Designer | Complete -- 8 competitors analysed |
| `ux_improvements.md` | UI/UX Designer | Complete -- 36 improvements |
| `csuite_charter_review.md` | C-suite | Complete -- approved with conditions, 16 binding conditions |

---

## Known Technical Debt

| Item | Impact | Priority |
|---|---|---|
| `pipeline_lead_stage_history` table missing | Funnel analytics impossible | High |
| `finance.agentCosts()` mapped to temp endpoint | CFO cost attribution incomplete | Medium |
| `clients.overdue()` filter not implemented in backend | Overdue follow-ups screen broken | Medium |
| Settings: Agent Library + Knowledge Base screens unspecced | Engineering cannot build these screens | High |
| Refresh tokens in localStorage | Should move to httpOnly cookie (backend changes required) | Medium |

---

## Known Issues

- 24 bugs were identified by QA in Sprint 1. All Critical (2) and High (8) bugs were resolved. 9 Medium and 5 Low bugs remain open -- see `deliverables/bug_report.md` for the full list.
- PRD validation found 65% fidelity between the feature spec and the implementation -- 2 Critical and 13 High gaps remain for Sprint 2.
- The Data Analyst role flagged that analytics work is blocked without a Data Engineer role (approved for creation but not yet built).

---

## Decisions Pending from Glen

1. Approve $1,000/month AI spend cap (CFO recommendation, endorsed by COO and CTO)
2. Approve Data Engineer role creation (CEO, COO, CTO all flagged as needed)
3. Set max tool calls per agent execution (recommended: 10)
