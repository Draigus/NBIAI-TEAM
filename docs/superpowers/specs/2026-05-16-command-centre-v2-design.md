# Command Centre v2 — Full Spec

> **Status:** Draft for Glen's review
> **Depends on:** CC v1 (shipped 2026-05-16, feature/command-centre branch)
> **AI Team Review:** VP Product, CTO, Data Analyst — all reviewed, gaps incorporated

## Vision

Transform the Command Centre from an operational project tracker into Glen's daily business nerve centre. Every question a CEO asks in the first 10 minutes of the day — "Are we billing on track? Which clients need attention? What did I miss from yesterday's meetings? Where are the risks?" — should be answerable without leaving this view.

## UX Structure: Persistent Header + Tabbed Panels

The v1 layout (4 scrollable rows) doesn't scale to 11 feature areas. v2 uses:

**Persistent Header (always visible, no scrolling):**
- Row 1: Fires strip (collapsed, shows count + top 2 fires inline) + 4 key stats (open tasks, overdue, blocked, due today)

**Tab Bar (below header):**
Five tabs. Each panel fills the remaining viewport height with its own scroll context.

| Tab | Content | Data Source |
|-----|---------|-------------|
| **Work** | Client bars, velocity, bugs, project milestones | tasks, clients, bug_reports |
| **Pipeline** | Leads funnel, follow-ups, deal velocity, pipeline value | leads, lead_activities, contacts |
| **Money** | Revenue vs target, invoices, contract dates, burn rate | finance_data, sows, clients.contract_value |
| **AIOS** | Four Cs deep view, active monitoring, improvement actions, AI assessment | cc_snapshots, scanners, cc_ai_assessments |
| **Comms** | Email backlog, Granola actions, meeting follow-ups | MCP proxied → granola_actions table, calendar |

Default tab: **Work** (most frequently needed).

---

## Feature Specifications

### F1. Leads / Follow-up Tracking (Pipeline tab)

**Data source:** `leads` table + `lead_activities` + `lead_pipeline_stages`

**Panel layout:**
- **Pipeline funnel** — leads grouped by stage, with counts and weighted value per stage
- **Stale leads** — leads where `last_contacted` > 14 days ago AND `completed_at` IS NULL
- **Upcoming follow-ups** — leads with `next_followup_date` in next 7 days, sorted by date
- **Pipeline summary tiles** — total pipeline value (weighted), conversion rate, avg deal velocity

**New endpoint:** `GET /api/command-centre/pipeline`

```sql
-- Pipeline by stage
SELECT s.name, s.position, COUNT(*) as count,
  SUM(l.weighted_value) as weighted_total
FROM leads l JOIN lead_pipeline_stages s ON l.stage_id = s.id
WHERE l.completed_at IS NULL
GROUP BY s.name, s.position ORDER BY s.position;

-- Stale leads
SELECT l.*, c.name as contact_name
FROM leads l LEFT JOIN contacts c ON l.primary_contact_id = c.id
WHERE l.completed_at IS NULL
  AND (l.last_contacted IS NULL OR l.last_contacted < NOW() - INTERVAL '14 days')
ORDER BY l.last_contacted NULLS FIRST;

-- Follow-ups due
SELECT l.*, c.name as contact_name
FROM leads l LEFT JOIN contacts c ON l.primary_contact_id = c.id
WHERE l.next_followup_date IS NOT NULL
  AND l.next_followup_date <= NOW() + INTERVAL '7 days'
  AND l.completed_at IS NULL
ORDER BY l.next_followup_date;
```

**Actions:** "Mark contacted" (updates last_contacted), "Snooze follow-up" (pushes next_followup_date), "Open lead" (navigates to Leads view with lead selected).

---

### F2. AI Weekly Assessment (AIOS tab)

**Architecture:** Scheduled cloud routine (runs weekly, e.g. Sunday evening). Routine reads session logs, git history, task completion data, and calls Claude API to generate structured assessment. Writes to `cc_ai_assessments` table.

**New table:**
```sql
CREATE TABLE cc_ai_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_date DATE NOT NULL UNIQUE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Assessment structure (JSONB):**
```json
{
  "period": "2026-05-10 to 2026-05-16",
  "work_summary": "Completed 14 tasks across 3 clients...",
  "skills_used": [{"name": "brainstorming", "count": 3}, ...],
  "skills_suggested": ["Consider using gsd-debug for the recurring PM2 issues"],
  "automations_suggested": ["The weekly CH standup extraction could be a cloud routine"],
  "patterns_detected": ["67% of your blocked items are on Lighthouse — consider a priority call"],
  "efficiency_score": 7.2,
  "comparison_to_last_week": "+12% tasks completed, -2 fires"
}
```

**Panel layout:** Card with the latest assessment. Expandable sections for each category. "Generate now" button for on-demand refresh.

**Technical note (CTO):** LLM calls must NOT be in the HTTP request cycle. The routine writes to DB; the server serves cached results. A `last_generated_at` timestamp is visible in the panel so Glen knows when the assessment is from.

---

### F3. Granola Meeting Notes → Actions (Comms tab)

**Architecture:** Scheduled cloud routine. Reads Granola meeting notes via MCP, extracts action items using LLM, writes to `granola_actions` table.

**New table:**
```sql
CREATE TABLE granola_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id TEXT NOT NULL,
  meeting_title TEXT,
  meeting_date TIMESTAMPTZ,
  action_title TEXT NOT NULL,
  action_context TEXT,
  suggested_type TEXT DEFAULT 'task',
  status TEXT DEFAULT 'pending',
  task_id UUID REFERENCES tasks(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
```

**Panel layout:**
- Grouped by meeting (most recent first)
- Each action: title, context quote, suggested type (task/story), approve/reject/edit buttons
- "Approve" creates a work item in the tasks table and links it via task_id
- Status flow: pending → approved/rejected

**Dependency:** Requires Granola MCP proxy infrastructure (cloud routine pattern shared with F2).

---

### F4. Token Usage Tracking — DESCOPED

**CTO verdict:** No viable programmatic data source. Claude Code doesn't expose per-session usage. Anthropic billing API is account-level only. Descoped from v2. Revisit when/if Claude Code adds usage telemetry.

---

### F5. Active AIOS Monitoring (AIOS tab)

**Data source:** Existing scanners (skills, memory, brain, connections, sessions, roles) + cc_snapshots history.

**Panel layout (replaces current Row 4 strip):**
- **Four Cs detail cards** — each C gets a card with score ring, trend sparkline (from cc_snapshots history), and specific actions
- **Actionable recommendations** — generated from scanner data:
  - Brain modules with `last_verified` > 30 days → "Verify brain/clients_detailed.md"
  - Skills with 0 learnings and 0 evals → "Run evals for skill X"
  - Connections with status 'missing' or 'partial' → "Configure X connection"
  - Memory files referencing moved/deleted targets → "Update memory file X"
  - Roles with no AGENT.md or stale knowledge → "Refresh role X"
- **History chart** — Four Cs scores over last 30 days (line chart from cc_snapshots)

**New endpoint:** `GET /api/command-centre/aios-detail` — returns expanded scanner data + recommendations + 30-day history.

---

### F6. Project Overview (Work tab)

**Data source:** tasks, clients, milestones, milestone_items, sows

**Panel section (within Work tab):**
- **Per-client project health** — client name, total tasks, % complete, overdue count, days since last activity, risk indicator (red/amber/green based on overdue % and blocked count)
- **Milestones timeline** — upcoming milestones across all clients, days until due, completion %
- **Contract status** — from sows table: client, SOW title, start/end dates, days remaining, status badge

**Actions:** Click client → navigates to Projects view filtered by client. Click milestone → opens milestone detail.

---

### F7. Financial Pulse (Money tab)

**Data source:** `finance_data` (JSONB), `clients.contract_value`, `sows`, `expenses`

**Panel layout:**
- **Revenue tile** — monthly revenue vs target (from finance_data JSONB)
- **Contract values** — per-client contract_value from clients table, total active contract value
- **SOW status** — active SOWs with end dates, flagging any expiring within 60 days
- **Expense summary** — if expenses data exists, show monthly spend
- **Invoicing status** — if invoice data exists in finance_data JSONB, show outstanding amounts by age (30/60/90+)

**Note:** finance_data is a single JSONB row — the finances view already parses this. The CC panel should reuse whatever structure the finances view uses rather than creating a parallel interpretation.

---

### F8. Client Health Signals (Work tab, integrated)

**Data source:** tasks, calendar_events, clients, sows, lead_activities

**Metrics per client (shown as columns or badges on the client work bars):**
- **Days since last touchpoint** — MAX of: last task update, last calendar event with client name, last lead_activity. Red if > 14 days, amber if > 7 days.
- **Contract expiry** — from sows.end_date. Red badge if < 60 days.
- **Risk score** — composite of: overdue %, blocked %, days since touchpoint. Displayed as a coloured dot (green/amber/red).

---

### F9. Team Workload (Work tab, section)

**Data source:** tasks (assignee field), team_members, users, time_entries

**Panel section:**
- **Assignee workload bars** — per-person task count (in-progress + todo), grouped by client
- **Time logged this week** — from time_entries, hours per person
- **Capacity alerts** — anyone with > 15 active tasks or 0 tasks (overloaded / idle)
- **Single point of failure** — any client where > 80% of tasks are assigned to one person

---

### F10. Comms Debt (Comms tab)

**Data source:** Gmail MCP (via cloud routine → DB table), Slack MCP (via cloud routine)

**Architecture:** Same scheduled routine pattern as F2/F3. Cloud routine reads Gmail/Slack via MCP, identifies unanswered threads, writes to a `comms_queue` table.

**New table:**
```sql
CREATE TABLE comms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  thread_id TEXT,
  from_name TEXT,
  from_email TEXT,
  subject TEXT,
  snippet TEXT,
  received_at TIMESTAMPTZ,
  age_days INT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Panel layout:**
- Unanswered emails sorted by age (oldest first)
- Each row: sender, subject, age badge (coloured by urgency), snooze/reply buttons
- Slack threads needing response (if Slack MCP proxy is built)

**Dependency:** Same cloud routine infrastructure as F2/F3.

---

### F11. Pipeline Analytics Depth (Pipeline tab, extended)

**Data source:** leads, lead_activities, lead_pipeline_stages

**Metrics:**
- **Conversion rate** — leads that moved from first stage to "Won" / total leads created, over trailing 90 days
- **Deal velocity** — average days from lead creation to completion (won or lost)
- **Weighted pipeline value** — SUM of (rom_min + rom_max) / 2 * win_probability for all active leads
- **Pipeline trend** — weekly new leads vs closed leads (bar chart)

---

### F12. Handoff Hub (Work tab, section)

**Data source:** File system scan of `projects/*/session_handoffs/` directories. Each handoff is a markdown file with structured content: what was done, what's next, branch state, critical files.

**Panel layout:**
- **Per-project cards** — one card per project that has handoff files, showing:
  - Project name (derived from directory)
  - Last handoff date + title
  - "What's next" summary (extracted from the handoff's next-steps section)
  - Branch name if mentioned
  - "Resume" button → could trigger a prompt template or just navigate to the handoff file
- Sorted by most recent handoff first
- Collapsed by default, expand to see full handoff content

**New endpoint:** `GET /api/command-centre/handoffs` — scans the repo's project directories for handoff files, parses frontmatter/headers, returns structured summaries.

**Why this matters:** Glen works across multiple projects (NBI Hub, Couch Heroes, Playsage, etc.) and each has its own Claude Code session context. The handoff hub shows exactly where each project was left off, eliminating the "where was I?" friction when switching contexts.

---

## Infrastructure Requirements

### Shared: Scheduled Routine Pattern (CTO recommendation)

Features F2, F3, and F10 all need the same infrastructure:
1. Cloud routine (Claude Code scheduled task) that runs on a cadence
2. Routine reads from external source (session logs, Granola MCP, Gmail MCP)
3. Routine writes structured results to a typed DB table
4. Server reads from that table and serves to the CC frontend
5. Each table has `created_at` for staleness checking
6. CC panel shows "Last synced: X hours ago" with manual refresh option

**New table for routine health:**
```sql
CREATE TABLE routine_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  records_written INT DEFAULT 0
);
```

### cc_snapshots Pruning

Add a scheduled job to prune cc_snapshots older than 90 days. Current growth: 1 row/day, ~1KB JSONB payload. Not urgent but prevents unbounded growth as JSONB payloads grow with new features.

---

## Build Phases

### Phase 1: Quick Wins (no new infrastructure)
- F1: Leads / follow-up tracking (new endpoint + Pipeline tab)
- F5: Active AIOS monitoring (extend existing scanners + AIOS tab)
- F6: Project overview (new queries + Work tab section)
- F8: Client health signals (extend client work bars)
- F9: Team workload (new section in Work tab)
- F11: Pipeline analytics (extend F1 endpoint)
- F12: Handoff hub (file scan + Work tab section)
- **UX:** Implement the tabbed panel layout (persistent header + 5 tabs)

### Phase 2: Financial Integration
- F7: Financial pulse (parse finance_data JSONB + Money tab)

### Phase 3: Cloud Routine Infrastructure
- Build the routine_runs table + routine health monitoring
- F2: AI weekly assessment (routine + AIOS tab section)
- F3: Granola notes → actions (routine + Comms tab)
- F10: Comms debt (routine + Comms tab)

### Descoped
- F4: Token usage tracking — no viable data source

---

## Design References

- v1 mockup: `docs/superpowers/specs/cc-mockup-v6.html`
- v1 spec: `docs/superpowers/specs/2026-05-16-command-centre-redesign.md`
- v1 plan: `docs/superpowers/plans/2026-05-16-command-centre-redesign.md`
