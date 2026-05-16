# Command Centre Redesign — Design Spec

## Problem

The current Command Centre has a frontend shell (~813 lines) but zero backend endpoints. Content is empty, graphic design is poor (too dark/gloomy, no visual hierarchy, looks like a student project), interactivity is 3/10. It needs to become Glen's daily operational command post.

## What It Must Answer (in order)

1. **What's on fire?** — Critical/overdue/stalled items across all clients
2. **What's the state of client work?** — Done vs to-do per client, velocity trend
3. **What needs my response?** — Emails, meeting note tasks, blocked items
4. **What should I improve?** — WorkSage platform ideas, client delivery opportunities
5. **Is the AI infrastructure healthy?** — AIOS Four Cs, dispatch, brain freshness, connections

## Two Views

### Command View (build first)
Live operational dashboard. Auto-refreshes. Dense widescreen layout — 4 horizontal rows, minimal scrolling.

### Morning Brief (build second)
Narrative-style daily summary. Separate spec when we get there.

---

## Command View Layout

### Row 1: Fires + Summary Stats
**Left (~70%):** Alert list of cross-client problems. Each item has:
- Severity badge (CRITICAL / OVERDUE / STALE / BLOCKS)
- Description with context
- Client name
- "Open →" deep link to the relevant view (bug, task, client)

Sources: overdue tasks (due_date < today), critical bugs (priority = critical/urgent), stale leads (no activity > 5 days), known blockers from pending_actions.

**Right (~30%):** 6 stat tiles in a 2x3 grid:
- Open Tasks (count across all clients)
- Overdue (count + oldest age)
- Blocked on Me (count + which clients)
- Due Today (count + this week)
- Tests (pass count + status)
- AIOS Health (Four Cs composite score)

### Row 2: Client Work Balance + Charts
**Left (50%):** Stacked horizontal bars per client showing done / in-progress / to-do. Each bar is clickable (deep link to client view). Shows "X/Y — Z remaining" per client.

**Right (50%), split into two cards:**
- **Weekly Velocity:** Bar chart of tasks completed per week (last 4 weeks). Current week shown as dashed/partial. Warning text if velocity dipped with reason.
- **Bug Breakdown:** Priority stacked bar (critical/high/medium/low) + 7-day trend mini chart. Tag summary below.

### Row 3: Email Queue + Granola Tasks + Improvements (3 equal columns)
**Column 1 — Emails to Address:**
- Pulled from Gmail via MCP. Filtered to actionable (needs Glen's response).
- Each row: sender, subject (truncated), age tag (colour-coded by staleness), snooze + reply buttons.
- Sorted oldest-first. Max 4-5 visible, "+N more" link.

**Column 2 — Meeting Notes → Tasks:**
- Source: Granola MCP. Previous day's meeting transcripts.
- AI extracts action items and converts to draft stories/tasks.
- Grouped by meeting (source + time shown).
- Each task: title, extracted quote, type tag (Story/Task/Investigation).
- Action buttons: Edit, Reject, Approve → WorkSage (creates work item via API).

**Column 3 — Suggested Improvements:**
- Two subsections: "WorkSage Platform" and "Client Opportunities".
- Platform suggestions: features that would improve Glen's daily workflow. Each has effort/impact note + "Add to backlog" button.
- Client opportunities: proactive delivery ideas surfaced from meeting notes, stale deliverables, client requests. Each has "Create task" button.
- Source: AI analysis of meeting notes, stale items, gap detection.

### Row 4: AIOS Health Strip (compact, single line)
Single horizontal bar containing:
- Four Cs ring gauges (inline, small)
- Key stats: dispatch roles, brain freshness, cloud routines, test count, memory files
- Connection status pills (green/amber/red per service)

---

## Design Language

### Palette (GitHub Dark base)
- Base: #0d1117
- Card: #161b22
- Inset/row: #0d1117 (same as base, creates depth via border)
- Border: #30363d
- Text primary: #e6edf3
- Text secondary: #8b949e
- Text muted: #484f58

### Status Colours
- Green: #3fb950 (healthy, done, passing)
- Amber: #d29922 (warning, stale, in progress)
- Red: #f85149 (critical, overdue, failed)
- Blue: #58a6ff (informational, links, in review)
- Purple: #a371f7 (suggestions, improvements)

### Typography
- Body: 14-15px, system font stack
- Card titles: 0.82-0.9rem, weight 600
- Row items: 0.78-0.84rem
- Metadata: 0.65-0.7rem, secondary colour
- Stats: 1.1-1.6rem, weight 800

### Interactivity
- Every row item is a deep link (click → navigate to relevant view)
- Hover: border highlight, action buttons fade in
- Inline actions: Snooze, Reply, Edit, Reject, Approve, Add to backlog, Create task
- Auto-refresh: poll every 30s, live indicator in header
- Tab persistence: localStorage

### Visual Polish (Phase 2)
The initial build focuses on structure + data. A follow-on pass will add:
- Gradient fills on charts
- Subtle card depth/shadow
- Refined chart rendering (smoother, more detail)
- Micro-animations (number transitions, bar fills)
- Typography refinement
- Personality and texture beyond flat GitHub Dark

---

## Backend Endpoints Needed

### GET /api/command-centre/snapshot
Returns the Command View data. Aggregates from existing DB tables + file system.

```json
{
  "fires": [{ "severity", "title", "client", "type", "link_id", "age_days" }],
  "stats": { "open_tasks", "overdue", "blocked_on_glen", "due_today", "due_this_week", "tests_passing", "tests_total", "aios_score" },
  "client_work": {
    "clients": [{ "name", "done", "in_progress", "todo", "total" }]
  },
  "velocity": {
    "weeks": [{ "label", "completed", "is_current" }]
  },
  "bugs": {
    "total", "by_priority": { "critical", "high", "medium", "low" },
    "trend_7d": [int],
    "in_review": int
  },
  "aios": {
    "four_cs": { "context", "connections", "capabilities", "cadence" },
    "dispatch_active": int, "dispatch_total": int,
    "brain_fresh": int, "brain_total": int,
    "routines_running": int, "routines_total": int,
    "tests": { "passing", "total" },
    "memory_files": int,
    "connections": [{ "name", "status" }]
  }
}
```

Data sources:
- `fires`: work_items WHERE (due_date < NOW AND status != 'Done') OR (bug_reports WHERE priority IN ('critical','urgent')), brain/pending_actions.md for known blockers
- `stats`: aggregated from work_items + bug_reports
- `client_work`: work_items grouped by client, counted by status
- `velocity`: work_items WHERE status changed to 'Done' in last 28 days, grouped by week
- `bugs`: bug_reports table
- `aios`: file system reads (brain/*.md dates, roles/*/AGENT.md existence, memory files count) + PM2 status for routines + test results cache

### GET /api/command-centre/emails
Proxies Gmail MCP to return actionable emails.

```json
{
  "emails": [{ "id", "from", "subject", "age_days", "severity", "thread_id" }]
}
```

Requires: Gmail MCP connection. Filter logic: unread OR flagged, from known contacts or clients, excluding newsletters/automated.

### GET /api/command-centre/granola
Fetches yesterday's meeting notes from Granola MCP and extracts tasks.

```json
{
  "meetings": [{
    "title", "date", "time",
    "tasks": [{ "title", "source_quote", "type", "suggested_client" }]
  }]
}
```

Requires: Granola MCP connection. Task extraction via LLM prompt against transcript.

### POST /api/command-centre/granola/:taskIndex/approve
Creates a work item in the dashboard from an approved Granola task.

### POST /api/command-centre/granola/:taskIndex/reject
Marks a Granola task as rejected (not imported).

### GET /api/command-centre/improvements
Returns AI-generated improvement suggestions.

```json
{
  "platform": [{ "title", "description", "effort", "impact" }],
  "client": [{ "title", "description", "client", "source" }]
}
```

Source: analysis of stale items, meeting notes patterns, known gaps.

---

## Scope Boundaries

**In scope (this spec):**
- Command View — all 4 rows
- Backend endpoints for snapshot, emails, granola, improvements
- Deep links to existing views
- Inline actions (approve/reject/snooze/reply)
- Auto-refresh
- Responsive down to 1200px

**Out of scope:**
- Morning Brief view (separate spec)
- Visual polish pass (Phase 2 after structure works)
- Granola webhook (currently MCP pull; webhook is a future improvement)
- Email sending from CC (Reply button opens Gmail, doesn't compose inline)

## Reference

- Current CC code: `nbi_project_dashboard.html` lines ~19,736-20,374 (JS) + ~2,635-2,818 (CSS)
- Mockup: `docs/superpowers/specs/cc-mockup-v6.html`
- Server: `dashboard-server/server.js`
