# CEO Consolidated Plan: NBIAI App -- No API Architecture

**Prepared by:** CEO Agent (consolidating CTO, VP Product, CFO, COO perspectives)
**Date:** 28 March 2026
**Classification:** Board-level -- for Glen Pryer
**Mandate:** Zero Anthropic API usage. Full app on Claude Max plan.

---

## Answer to Glen's Question

**Yes. The full NBIAI App -- dashboard, org chart, task management, reporting, agent coordination, the lot -- can be built without any Anthropic API calls.**

The app works. It runs on your existing Max plan. No extra cost.

---

## How It Works (Plain Terms)

The app has always had two jobs: (1) manage work and (2) execute AI agents. We are separating those two jobs:

**The web app** does job 1 only. It manages projects, tasks, roles, reports, approvals, and the org chart. It reads and writes files. It never calls Anthropic.

**Claude Desktop** does job 2. It is the execution engine. When work needs doing, you copy a prepared prompt from the app, run it in Claude Desktop on your Max plan, and paste the result back. Scheduled tasks in Claude Desktop can do this automatically while you sleep -- exactly as happened last night.

The bridge between them is a task queue: a folder of JSON files that the app writes to and Claude Desktop reads from. Simple. Clean. No API.

---

## What Changes From the Current Design

### Removed entirely

| Removed | Why |
|---|---|
| Anthropic API client and agent execution engine | Claude Desktop replaces this |
| AgentHeartbeat system | Replaced by file-based queue and cron scheduling |
| Token-level cost tracking | App no longer receives API responses with token counts |
| Budget cap automation (80%/100% hard stops) | No per-token billing to enforce against |
| API key setup and settings screens | No API key needed |
| Real-time WebSocket execution events | No live API execution to report |
| PostgreSQL on Railway | Replaced by SQLite locally |
| Railway deployment | Replaced by PM2 on Glen's machine |

### Added

| Added | Purpose |
|---|---|
| File-based task queue (queue/inbox/, queue/active/, queue/done/) | Bridge between web app and Claude Desktop |
| Queue screen in the app | Glen's daily operational hub -- see all waiting work |
| Session Log screen | Audit trail of every Claude Desktop session run |
| Post Results flow | Glen pastes Claude Desktop output back into the app |
| ClaudeDesktopSession table | Tracks every session: who ran it, what tasks, what output |
| Manual cost log | Glen logs session costs manually (£180/month subscription reference) |
| Queue Summary widget on Command Centre | Shows what is waiting, what is in progress, what completed today |
| Windows Task Scheduler + PM2 setup | Automatic session triggering and app process management |

### Changed

| Changed | Old | New |
|---|---|---|
| Database | PostgreSQL on Railway | PostgreSQL local (same database, local host) |
| Hosting | Railway (cloud) | localhost + PM2 + Tailscale for remote access |
| Task status enum | backlog, assigned, in_progress, review, done, blocked, cancelled | Same + queued (between assigned and in_progress) |
| Agent Status widget | Shows live API execution status | Shows queue summary (waiting, in progress, completed today) |
| Approvals "Approve" action | Triggered immediate API execution | Marks output as cleared; Glen acts manually |
| "Agents Active" stat card | Count of agents currently calling API | Count of sessions currently in progress |
| Role Detail "Execution Log" tab | Live API call log | Session results tab (output from completed sessions) |

### Unchanged (the majority of the design)

The design spec is not wasted. The following are valid as-is:

- All frontend screen layouts and component designs
- Auth system (login, sessions, user roles)
- Org chart view (tree and list)
- Project management (Kanban, project health)
- Task creation, editing, commenting, relations
- Finance tab (revenue, payroll, cash flow -- NBI financials, not AI costs)
- Leads and Clients tab
- Global search
- Approval workflow (data model unchanged, behaviour adapted)
- Settings (minus API key section)
- The full design spec colour system, typography, component library

Eight of the eleven original development phases are valid with minor adjustments. Three phases are replaced.

---

## The New Architecture (Technical)

```
Glen's Machine:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────────┐     ┌──────────────────────────────┐ │
│  │   Web App        │     │   Claude Desktop             │ │
│  │   (React +       │◄───►│   (Max Plan)                 │ │
│  │   Fastify)       │     │                              │ │
│  │   Port 3001      │     │   Reads queue/inbox/         │ │
│  │                  │     │   Executes as agent          │ │
│  │   Reads/writes   │     │   Writes results             │ │
│  │   NBIAI_TEAM/    │     │   Posts back to app          │ │
│  │   queue/         │     │                              │ │
│  └──────────────────┘     └──────────────────────────────┘ │
│            │                           ▲                   │
│            │                           │                   │
│            ▼                           │                   │
│  ┌──────────────────┐     ┌──────────────────────────────┐ │
│  │   PostgreSQL     │     │   Windows Task Scheduler     │ │
│  │   (local)        │     │   (triggers Claude Desktop   │ │
│  └──────────────────┘     │   sessions on cron)          │ │
│                           └──────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
            │
            │ Tailscale (remote access)
            ▼
   Glen's phone / other devices
```

**Task queue folder structure:**

```
NBIAI_TEAM/
  queue/
    inbox/        ← App writes new tasks here
    active/       ← Claude Desktop claims and moves tasks here
    review/       ← Tasks awaiting Glen's review
    done/         ← Completed tasks archive
    failed/       ← Failed sessions for investigation
    scripts/      ← Trigger scripts for Task Scheduler
    schedules/    ← Task Scheduler XML files (version controlled)
```

**Task file format (JSON):**

```json
{
  "task_id": "uuid",
  "assigned_to": "gaming_practice_lead",
  "model_tier": "Opus",
  "priority": "high",
  "title": "Draft Couch Heroes Q2 hiring plan",
  "description": "...",
  "session_prompt": "...[full assembled prompt]...",
  "created_at": "2026-03-28T10:00:00Z",
  "queued_at": "2026-03-28T10:01:00Z",
  "result_endpoint": "POST /api/v1/queue/results"
}
```

---

## Cost Model (CFO Confirmed)

| Item | Cost | Notes |
|---|---|---|
| Claude Max subscription | £180/month | Fixed. Covers all agent execution. |
| Web app hosting | £0 | Runs on Glen's machine. No external hosting. |
| SQLite database | £0 | Local file. No server. |
| Tailscale remote access | £0 | Free for personal use. |
| **Total new cost** | **£0** | Everything runs on existing subscription. |

The £180/month does not increase. The app does not add a penny to NBI's Anthropic spend.

---

## Revised Sprint Plan

### Sprint 1 (adjust current, in progress)
**Scope:** Database (PostgreSQL, local) + auth layer

**Change from current:** PostgreSQL is confirmed and unchanged. Remove Railway -- database runs locally. Remove four tables no longer needed (agent_heartbeats, agent_budgets, api_keys, model_pricing). Add two new tables (claude_desktop_sessions, cost_logs). Add queue folder structure. Remove @anthropic-ai/sdk dependency.

Auth system unchanged. Seed script simplified (remove heartbeat and budget seeding).

**Full revised brief: `projects/nbiai_app/backlog/assignment_vp_engineering_v2.md`**

### Sprint 2 (the essential loop)
**Scope:** Queue screen + task creation + Post Results flow + ClaudeDesktopSession model

This is the minimum viable product. When Sprint 2 is done, Glen can:
- Create a task in the app
- See it in the Queue screen with a prepared prompt
- Copy the prompt, run it in Claude Desktop
- Paste the result back
- See the task marked complete

The queue is live. The Paperclip loop is running. Everything after this is incremental improvement.

### Sprint 3 (visibility layer)
**Scope:** Command Centre (dashboard) + Session Log + Org Chart

Glen can see the full picture: what is queued, what has been run, who is doing what.

### Sprint 4 (project and decision layer)
**Scope:** Project Management (Kanban) + Approvals (revised async flow)

### Sprint 5 (business intelligence)
**Scope:** Finance tab + Leads and Clients + Role Detail page

### Sprint 6 (infrastructure and polish)
**Scope:** PM2 setup + Windows Task Scheduler configuration + Tailscale setup + mobile view + performance

---

## Operational Model (COO Input)

**For autonomous overnight execution:**
Windows Task Scheduler fires trigger scripts that open Claude Desktop sessions at configured times. Glen leaves his machine running. Sessions process queued tasks. Results are written to files and posted back to the app. Glen wakes up to a dashboard showing completed work.

**For manual execution:**
Glen opens the Queue screen, copies a prompt, runs it in Claude Desktop, posts results. This is the daily workflow for interactive work.

**Machine-off contingency:**
If Glen's machine is off, scheduled tasks queue up. They are not lost -- they remain in queue/inbox/ and execute when the machine is next on. Glen sees them waiting in the Queue screen on return.

**Remote access:**
Tailscale provides a secure private network connection. Glen accesses the app at his machine's Tailscale IP from phone or other devices. No public internet exposure.

---

## Immediate Actions

| Action | Owner | When |
|---|---|---|
| Update technical_architecture.md: SQLite, queue folder structure, remove API execution engine | CTO | Before Sprint 1 resumes |
| Update feature_spec.md: remove heartbeat/API sections, add Queue screen, Session Log, Post Results | VP Product | Before Sprint 2 planning |
| Revise Sprint 1 assignment for VP Engineering: PostgreSQL to SQLite | CEO | This session |
| Set canon decision: no Anthropic API in NBIAI App | CEO | This session |
| Update session handoff with new architecture | CEO | End of this session |

---

## What Glen Gets

When this is built, Glen has:

1. A proper GUI for his AI company. Org chart, projects, tasks, reports -- all visual, not text in a chat window
2. Full Paperclip-style multi-agent coordination, running on his existing Max plan
3. Autonomous overnight execution via scheduled tasks, the way it worked last night -- but now with a dashboard showing what ran and what it produced
4. Remote access from any device via Tailscale
5. Zero additional cost beyond the £180/month already being paid

This is the right architecture for NBI at this stage. If Anthropic ever makes API access available through the Max subscription, or if the business grows to the point where API costs are justified, the execution layer can be upgraded. The rest of the app stays unchanged.

---

*Consolidated by CEO Agent from CTO, VP Product, CFO, and COO input. 28 March 2026.*
*Supporting documents: cto_architecture_review_file_queue.md, vp_product_review_no_api_2026-03-28.md*
