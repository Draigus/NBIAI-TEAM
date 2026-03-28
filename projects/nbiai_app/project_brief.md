# Project Brief: NBIAI Team Web Application

**Project name:** NBIAI Team App
**Project lead:** CTO (architecture) + VP Product (spec) + UI/UX Lead (design)
**Date created:** 2026-03-28
**Last updated:** 2026-03-28
**Status:** Planning

---

## Purpose

Build a web application that serves as the operational control plane for NBI's AI agent company. Glen acts as the board operator — he gives goals to the CEO agent and the AI company executes. The app makes all agent activity visible, manageable, and auditable in real time.

This is also the template for how NBI (and future clients) can deploy their own AI company structures for any project.

---

## Architecture Decision

**Stack: Node.js + PostgreSQL + React**

Rationale:
- PostgreSQL handles complex relational data (org hierarchy, task dependencies, budget rollups) far better than serverless-friendly stores
- Node.js allows long-running agent processes — no Vercel serverless time limits
- React + Tailwind for the frontend
- Inspired by Paperclip's battle-tested architecture (github.com/paperclipai/paperclip, 35.6k stars) but built from scratch for NBI's specific needs
- Hosted on Railway or Render (not Vercel) for persistent server processes

---

## Scope

### In scope
- Command Centre dashboard (active projects, agent statuses, recent activity feed)
- Org chart view with hire/edit/manage agents
- Role detail pages (persona, job description, performance, current assignments)
- Project management view (click into project, see agent task assignments and status)
- Finance tab (revenue vs targets, payroll, pipeline forecast, NSI transition scenarios)
- Leads and clients tab (BD pipeline stages, active client health, contacts)
- Real-time agent activity updates (PostgreSQL LISTEN/NOTIFY)
- Role-based access (Glen as board, NBI team members with scoped permissions)
- Approval workflow UI (review and approve/reject external actions)
- Task assignment system (board-level goal → CEO assigns → flows down hierarchy)

### Out of scope (v1)
- Mobile app
- Client portal / external access
- Billing and payment processing
- Public API
- White-labelling for other companies

---

## Success Criteria

| Criterion | Measurement |
|---|---|
| Glen can give a goal to the CEO and see it decomposed into tasks | End-to-end task flow works |
| Every agent role is visible with status, current task, and history | Org chart and role pages functional |
| Finance tab shows real NBI revenue and payroll data | CFO agent populates it correctly |
| BD pipeline shows all active leads with stages | CMO agent manages it |
| NBI team members can log in and see relevant views | Auth and permissions working |
| No Vercel serverless timeouts — agent execution is reliable | Load tests pass |

---

## Key Architectural Decisions

| Decision | Chosen approach | Rationale |
|---|---|---|
| Backend | Node.js (Express or Fastify) | Long-running agent processes, no timeout constraints |
| Database | PostgreSQL (Drizzle ORM) | Complex relational data, battle-tested, same as Paperclip |
| Frontend | React + Tailwind CSS + shadcn/ui | Fast component development, consistent with NBI design standards |
| Real-time | PostgreSQL LISTEN/NOTIFY | Native to PostgreSQL, no extra infrastructure |
| Auth | JWT + refresh tokens | Standard, works with role-based permissions |
| Hosting | Railway or Render | Persistent Node.js processes, not serverless |
| Agent execution | Claude API via Node.js server | Long-running, reliable, full context window |

---

## Deliverables

| Deliverable | Owner | Due | Status |
|---|---|---|---|
| Feature specification (full app) | VP Product | TBD | Not started |
| UI/UX design (all screens) | UI/UX Lead | TBD | Not started |
| Technical architecture document | CTO | TBD | Not started |
| Database schema | CTO + Senior Engineer | TBD | Not started |
| Backend API | VP Engineering | TBD | Not started |
| Frontend implementation | Senior Engineer + Engineer | TBD | Not started |
| Agent execution layer | Senior Engineer | TBD | Not started |
| Auth and permissions | Senior Engineer | TBD | Not started |
| QA and testing | QA Lead + QA Engineer | TBD | Not started |
| Deployment | DevOps | TBD | Not started |

---

## Stakeholders

| Name | Role | Involvement |
|---|---|---|
| Glen Pryer | Board Operator | Final approval on all design and architecture decisions |
| Kali Pryer | Producer | Internal NBI team user; input on usability |
| Tom Rieger | Partner | NBI team user; input on HC practice needs |

---

## Reference

- Paperclip repo: github.com/paperclipai/paperclip (architecture reference — adapt, do not copy wholesale)
- Paperclip docs: agent heartbeat model, org hierarchy, issue/checkout system, budget tracking
- This project's org chart: company/org_chart.md
- All 18 role definitions: roles/
