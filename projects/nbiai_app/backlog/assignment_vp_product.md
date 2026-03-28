# Task Assignment: VP Product
**Assigned by:** CEO
**Date:** 2026-03-28
**Project:** NBIAI Team App
**Priority:** HIGH — blocking all engineering work

---

## Your Assignment

Write the full feature specification for the NBIAI app. This is Deliverable 1. Engineering cannot start without it. Design cannot finalise without it.

The spec must be complete enough that a senior engineer could build any screen without asking a single clarifying question.

---

## What the App Is

A Paperclip-style control plane for NBI's AI agent company. Node.js + PostgreSQL + React. Hosted on Railway/Render.

Glen is the board operator. He gives goals to the CEO. The CEO assigns work down the org hierarchy. Every agent's activity is visible in real time. Glen approves external-facing actions before they execute.

Reference: github.com/paperclipai/paperclip — adapt the architecture, do not copy the UI.

---

## Sections to Specify (Minimum)

### 1. Authentication and User Management
- Login/logout flow
- User roles: Board (Glen), Admin (NBI team), Viewer (read-only)
- Session management and JWT refresh
- First-time setup (create company, set board user)

### 2. Command Centre (Dashboard — Home Screen)
- Active projects widget: name, status (Green/Amber/Red), lead agent, last update
- Agent status feed: which agents are active, idle, running, or blocked right now
- Activity feed: recent actions across all agents (last 24 hours)
- Approvals queue: pending actions awaiting Glen's sign-off
- Quick stats: open tasks, agents active, goals in progress

### 3. Org Chart View
- Visual tree hierarchy matching company/org_chart.md
- Each node shows: role name, model tier, status (active/idle/paused), current task
- Click a node to open Role Detail page
- "Hire" button to add a new agent to a role
- "Edit" to modify an existing agent's persona or config
- "Pause / Terminate" controls

### 4. Role Detail Page
- Persona summary (name, role, model tier, reports to, direct reports)
- Current assignment and task status
- Task history (last 10 completed tasks with outcomes)
- Performance metrics (tasks completed, average completion time, escalations)
- Knowledge files loaded (Tier 1, Tier 2, Tier 3)
- System prompt viewer (read-only)

### 5. Project Management View
- Projects list with status, lead, last update
- Click into a project: see all tasks, each task's assigned agent, status, and last update
- Task detail: description, assigned agent, status, comments/activity log
- Create new task (assigned to a role)
- Task states: backlog, assigned, in progress, blocked, review, done

### 6. Task System
- Task creation (board or CEO can create; CEO can assign to direct reports who cascade)
- Checkout model: atomic task claiming (one agent per task at a time)
- Status transitions with required comments on block or escalation
- Task relations: blocking, blocked-by, related
- Priority levels: critical, high, medium, low

### 7. Agent Execution Layer (what happens under the hood — visible in the UI)
- Agent heartbeat: agents wake on a schedule or when assigned a task
- Execution log: what the agent read, what it produced, how long it ran, tokens used
- Cost tracking per agent per task (input tokens, output tokens, cost in USD)
- Monthly budget cap per agent with alert at 80% and hard stop at 100%

### 8. Finance Tab
- Revenue dashboard: contracted revenue vs target (monthly and YTD)
- Payroll summary: all staff with monthly and annual costs
- Cash flow projection: 3-month rolling
- NSI transition scenarios: current, partial, full transition
- Pipeline revenue: probability-weighted forecast from active BD leads

### 9. Leads and Clients Tab
- BD pipeline: all leads by stage (Identification → Qualification → Outreach → Discovery → Proposal → Close)
- Lead card: company, contact, stage, last contact date, next action, owner
- Active clients: health status (Green/Amber/Red), engagement type, Glen's role, next milestone
- Quick view of overdue follow-ups

### 10. Approvals Workflow
- Pending approvals queue on dashboard and dedicated page
- Each approval item: what it is, who requested it, full content (e.g. draft email), context
- Approve / Request changes / Reject with optional comment
- Approved items execute immediately; rejected items return to the requesting agent with reason

### 11. Settings
- Company profile (name, logo, contact details)
- Agent library (all defined roles with their configs)
- Knowledge base viewer (Tier 1, Tier 2, Tier 3 files — read only)
- User management (add/remove NBI team members, assign roles)
- Budget management (set per-agent monthly caps)
- API key management (Anthropic key and any other integrations)

---

## Acceptance Criteria for the Spec

- Every screen described with: purpose, all visible elements, all user actions, all states (empty, loading, error, populated)
- Every data object defined: fields, types, relationships
- Every workflow described end-to-end: trigger, steps, output, edge cases
- No TBDs, no "to be determined", no vague descriptions
- An engineer reads this and never has to ask "what does this mean?"
- VP Product self-reviews against this checklist before submitting

---

## Handoff

When complete: submit to CEO for review. CEO will flag any gaps before passing to CTO for architecture and UI/UX Lead for design.

Do not start until you have read:
- projects/nbiai_app/project_brief.md (full context)
- github.com/paperclipai/paperclip (reference architecture — read the README and docs)
- company/org_chart.md (the org structure the app must represent)
- company/policies/approval_gates.md (the approval system the app must enforce)
