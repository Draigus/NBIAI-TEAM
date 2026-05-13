# Command Centre — Phase 1 Design Spec

## Overview

A new page in WorkSage providing AI operating system intelligence: maturity scoring, skill/memory/brain health, connection coverage, bug intelligence, agent team heatmap, session patterns, test health, and a daily briefing with Outlook calendar integration. Internal only (Glen, Tom, Magnus).

## Phasing

| Phase | Scope | Depends on |
|---|---|---|
| **1 (this spec)** | Dashboard page + scanners + briefing tab + calendar integration | Nothing |
| **2 (future)** | Nightly analysis cron ("Dreaming engine"), Level-Up insights feed | Phase 1 |
| **3 (future)** | Autonomous execution engine (Ralph-pattern task queue, overnight code runs to worktree branches) | Phase 2 |

## Architecture

**Approach A:** Single route module + single JSONB snapshot table.

### New files

| File | Purpose |
|---|---|
| `dashboard-server/routes/command-centre.js` | Route module (factory pattern, receives ctx) |
| `dashboard-server/migrations/044_command_centre.sql` | Creates `cc_snapshots` table |

### Modified files

| File | Change |
|---|---|
| `dashboard-server/server.js` | Mount route module via `app.use()` |
| `dashboard-server/ecosystem.config.js` | Add `REPO_ROOT` env var |
| `nbi_project_dashboard.html` | Add sidebar item, `renderCommandCentre()` function, CSS block (~300 lines) |

## Database

### cc_snapshots table

```sql
CREATE TABLE cc_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cc_snapshots_date ON cc_snapshots (snapshot_date DESC);
```

### Snapshot JSONB structure

```
data: {
  four_cs: {
    context:      { score, max: 10, details[] },
    connections:  { score, max: 10, details[] },
    capabilities: { score, max: 10, details[] },
    cadence:      { score, max: 10, details[] }
  },
  skills: [{
    name, path, category, last_modified,
    file_count, has_learnings, learnings_count,
    has_evals, references_count
  }],
  memory: {
    files: [{ name, type, description, last_modified, stale_refs[] }],
    health: { total, fresh, stale, score }
  },
  connections: {
    local_mcp:  [{ name, command, status }],
    cloud_mcp:  [{ name, status }],
    buckets: {
      revenue, clients, calendar, comms,
      tasks, meetings, knowledge, research
    }
  },
  brain: {
    core: { path, last_modified, sections },
    modules: [{ name, path, last_modified }],
    roles: [{ name, has_knowledge, knowledge_freshness, last_modified }]
  },
  sessions: {
    recent: [{ date, filename, size }],
    stats: { total_this_week, avg_per_day },
    live_state: { pending_tasks_count, decisions_count, last_updated }
  },
  bugs: {
    by_status: { open, in_progress, please_review, resolved },
    by_priority: { critical, high, medium, low },
    recent_activity: []
  },
  tests: {
    last_run: { date, passed, failed, total },
    trend: [{ date, passed, failed }]
  }
}
```

### Four Cs scoring heuristics

| Pillar | Max | Scoring |
|---|---|---|
| **Context** | 10 | +3 Brain exists and <30d old, +2 CLAUDE.md >10 rules, +2 >20 memory files, +1 session logs exist, +1 live_state current, +1 >25 roles |
| **Connections** | 10 | +1-2 per bucket covered (8 buckets), bonus for verified MCP integrations |
| **Capabilities** | 10 | +1 per 5 skills (cap +4), +2 >50% skills with learnings, +2 GSD present, +1 model tiers defined, +1 bug pipeline defined |
| **Cadence** | 10 | +3 analysis cron active, +3 execution engine active, +2 Hermes/remote agent deployed, +2 scheduled routines |

Scores are heuristic and directional, not precise measurements.

## API Endpoints

All endpoints require `requireAuth` + `requireNBI` (no client portal access).

### GET /api/command-centre/snapshot

Returns latest `cc_snapshots` row. 404 if none exists.

### POST /api/command-centre/refresh

Runs all scanners, upserts snapshot for today. Returns fresh snapshot. Rate limited: 1 per 30 seconds.

### GET /api/command-centre/history?days=30

Returns array of past snapshots (date + four_cs scores only). For trend sparklines.

### GET /api/command-centre/briefing

Returns live briefing data assembled from multiple sources:

```
{
  date,
  critical: [],          // overdue + critical bugs + today's deadlines
  calendar: {
    today: [],           // Microsoft Graph /me/calendarView
    tomorrow: [],
    this_week: []
  },
  work_queue: {
    overdue: [],         // tasks table, past due_date
    due_today: [],
    due_this_week: [],
    blocked: [],         // health_state = 'blocked'
    high_priority_backlog: []
  },
  bugs: {
    critical_open: [],
    awaiting_review: [],
    hotspots: [],
    recent_fixes: []
  },
  claude_state: {
    last_session: { date, summary, pending_items },
    outstanding_work: [],   // from pending_tasks.md
    recent_decisions: [],   // from decisions.md (last 5)
    handoff_exists: boolean
  },
  client_deliveries: {
    // grouped by client, due within 14 days
  },
  knowledge_flags: {
    stale_brain_modules: [],
    stale_memory_files: [],
    dormant_roles_count
  }
}
```

The briefing endpoint is always live (not cached) because it pulls from DB and calendar.

### GET /api/command-centre/skill/:name

Returns detail for a single skill: file listing, learnings.md content, evals, references, parsed SKILL.md frontmatter. For drill-down on click.

## Scanner Functions

Eight independent scanners, all read-only, each handles its own errors:

| Scanner | Source | Reads |
|---|---|---|
| `scanSkills()` | `.claude/skills/` | Walks skill folders, reads SKILL.md frontmatter, checks for learnings.md/evals/references |
| `scanMemory()` | `~/.claude/projects/*/memory/` | Reads MEMORY.md index, parses each file's frontmatter, flags >30d old with stale refs |
| `scanConnections()` | `.mcp.json` + known cloud list | Parses MCP config, maps to 8 buckets (revenue, clients, calendar, comms, tasks, meetings, knowledge, research) |
| `scanBrain()` | `NBI_Brain.md` + `brain/` + `roles/` | Core file, extended modules, role knowledge freshness |
| `scanSessions()` | `projects/nbi_dashboard/session_logs/` + `live_state/` | Session file stats, pending tasks count, decisions count |
| `scanBugs()` | PostgreSQL `bug_reports` table | Counts by status/priority, recent activity |
| `scanTests()` | Cached test result file | Reads last test output (written by manual run or future hook) |
| `computeFourCs()` | All scanner outputs | Applies heuristic scoring |

File paths resolved from `REPO_ROOT` env var (defaults to `path.resolve(__dirname, '../../')`).

Memory staleness: a file is "stale" only if >30 days old AND references a specific file/function that no longer exists. Age alone does not make it stale.

## SPA Structure

### Sidebar

New item in the "Views" section, between "Dashboard" and "Projects":

```javascript
html += sidebarItem(svgCommandCentre, 'Command Centre', '',
  () => switchView('commandcentre'),
  currentView === 'commandcentre');
```

Gated behind `!isScoped` (NBI users only, not client portal users).

### Two-tab layout

```
┌──────────────┬─────────────────┐
│  Dashboard   │  Daily Briefing │
└──────────────┴─────────────────┘
```

Tab state stored in localStorage. Default: Dashboard.

### Dashboard tab

- Four Cs hero row: 4 score cards with animated SVG progress rings, clickable for drill-down
- 3-column responsive grid (3-col >1400px, 2-col >900px, 1-col mobile):
  - Today's Focus (situation room with prioritised items)
  - Skills Intelligence (insights: most active, stale, learning loops, gaps)
  - Brain & Memory (timeline freshness with glowing status dots)
  - Connection Map (8-bucket grid, green/amber/red)
  - Bug Intelligence (priority bar, hotspot analysis, awaiting review)
  - Agent Team (heatmap grid, 11-wide, hover tooltips, dormant count)
  - Sessions (sparkline bars, stats)
  - Test Health (big pass count, progress bar)
  - Level-Up Insights (Phase 2 placeholder)

### Daily Briefing tab

Structured card-and-list layout pulling from `/api/command-centre/briefing`:

- Critical section (pulsing red border cards)
- Today's Calendar (timeline with glowing dots, Outlook integration)
- Work Queue (3 cards: Overdue, Due This Week, Blocked) with filter chips
- Bug Status (3 cards: By Priority, Awaiting Review, Hotspot)
- Claude Session State (last session summary with progress bar, outstanding work)
- Client Deliveries (grouped by client, next 14 days)
- Knowledge Flags (stale brain modules, memory maintenance)

### Interactivity (both tabs)

- Hover on list items reveals action buttons (Open, Review, Close, Nudge, Refresh)
- Click actions link through to relevant WorkSage views or trigger API calls
- Filter chips on Work Queue (All, Overdue, Due This Week, Blocked, Client Work, AI Infrastructure)
- Expandable/collapsible card sections
- Animated SVG ring draws on page load
- Staggered card entrance animations
- Critical items pulse border animation
- Calendar timeline dots pulse for current event
- Progress bars have shimmer animation
- Click feedback on all buttons (green tick flash)
- Four Cs rings clickable for score breakdown
- Agent heatmap cells hover-scale with tooltip, click to open role
- Skills rows expandable for detail view

## CSS

~300 lines appended to the existing `<style>` block in the SPA. All colours use existing CSS variables. Key new classes:

- `.cc-grid` — responsive 3-col grid
- `.cc-card` — glassmorphic card with gradient accent `::before` and glow `::after`
- `.cc-hero` — Four Cs row
- `.cc-ring` — animated SVG ring
- `.cc-li` — interactive list item with hover-reveal
- `.cc-tag`, `.cc-chip` — pills and filters
- `.cc-tl` — calendar timeline
- `.cc-prog` — shimmer progress bar
- `.cc-spark` — sparkline bars
- `.cc-expand` — expandable animation

Theme-specific enhancements in Command theme block (enhanced glassmorphism, stronger glow).

## Calendar Integration

Uses Microsoft Graph API via `@azure/msal-node` (already a dependency) and Azure credentials in env vars. Read-only call to `/me/calendarView` for today's and this week's events.

**Auth note:** The existing MSAL config uses client credentials flow (app-level) for sending email. Calendar read requires either: (a) adding `Calendars.Read` to the app permissions in Azure AD (admin consent, reads Glen's calendar via app-level access), or (b) a delegated auth flow with user consent. Option (a) is simpler since it doesn't require interactive login. The Azure app registration needs `Calendars.Read` added as an application permission in the Azure portal.

## Test Scanner

The test scanner reads a cached result file at `dashboard-server/logs/test-results.json`. This file is written by a post-test hook or manual script (e.g., `npm test -- --reporter=json > logs/test-results.json`). Phase 2's cron can run tests nightly and write the file. If the file doesn't exist or is >7 days old, the scanner returns `{ last_run: null }` and the Test Health card shows "No recent data".

## Phase 2 Hooks

- `computeCommandCentreSnapshot()` exported as standalone function for cron import
- Cron schedule: `'0 5 * * *'` (05:00 daily UK time)
- `cc_insights` key in snapshot JSONB reserved for Level-Up analysis results
- Calendar event pre-fetch and caching in cron

## Phase 3 Hooks

- `cc_task_queue` table schema designed but migration commented out
- Dashboard placeholder card position for "Execution Queue"
- Route stub for `POST /api/command-centre/queue` commented out
- Task queue schema (for reference):

```sql
-- Phase 3: uncomment when building execution engine
-- CREATE TABLE cc_task_queue (
--   id SERIAL PRIMARY KEY,
--   title TEXT NOT NULL,
--   acceptance_criteria JSONB NOT NULL DEFAULT '[]',
--   status TEXT NOT NULL DEFAULT 'queued'
--     CHECK (status IN ('queued','running','passed','failed','skipped')),
--   priority INT NOT NULL DEFAULT 0,
--   branch TEXT,
--   progress_log TEXT DEFAULT '',
--   learnings TEXT DEFAULT '',
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   completed_at TIMESTAMPTZ
-- );
```

Autonomous runs: code changes only, always to worktree branch, never master. Glen reviews and merges.

## Design Decisions

1. **Incremental phasing** — Phase 1 ships value independently
2. **Single route module** — follows existing codebase pattern
3. **JSONB snapshot cached with manual refresh** — fast page loads, Phase 2 cron auto-refreshes
4. **Server reads repo root (read-only)** — no copies or proxies, REPO_ROOT env var
5. **Skill learnings in skill directory** — co-located with SKILL.md, scanner indexes for analytics
6. **3-column widescreen layout** — responsive fallback to 2 and 1 col
7. **Intelligence over inventory** — cards show actionable insights, not file counts
8. **Calendar via Microsoft Graph** — reuses existing Azure MSAL auth
9. **Phase 3 autonomy: code only, worktree only** — Glen merges manually
10. **Interactivity on all views** — hover actions, expandable cards, filter chips, click-through navigation

## Mockups

Visual mockups in `.superpowers/brainstorm/`:
- `cc-v4.html` — Dashboard tab (approved)
- `cc-briefing-v3b.html` — Daily Briefing tab (approved)
