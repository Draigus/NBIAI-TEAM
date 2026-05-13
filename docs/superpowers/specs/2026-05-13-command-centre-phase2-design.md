# Command Centre Phase 2 — Dreaming Engine

**Date:** 2026-05-13
**Status:** Draft for Glen review
**Depends on:** Phase 1 (complete, merged to master 2026-05-13)
**Prior decisions:** D1-D7 from 2026-05-11 all apply

## What This Is

Phase 1 built the dashboard and scanners — they run on demand when Glen clicks "Refresh Scan" or loads the page. The scanners are fast but shallow: they count files, check dates, parse frontmatter. They can't do the deeper analysis that requires cross-referencing multiple data sources or running expensive computations.

Phase 2 adds a **nightly analysis cron** ("Dreaming engine") that runs overnight and writes its findings into the `cc_snapshots` table. When Glen opens the Command Centre in the morning, the Daily Briefing tab shows what the system figured out while he slept.

The name "Dreaming" is deliberate — this is the system processing the day's activity, consolidating patterns, and surfacing things Glen should know about. It runs when nobody is using the system, so it can take its time.

## What It Is Not

- Not Phase 3 (autonomous code execution). The Dreaming engine reads and analyses. It never writes code, creates branches, or modifies files.
- Not an LLM call. Phase 2 is deterministic analysis — SQL queries, file diffing, date arithmetic, pattern matching. No API calls to Claude or any other model. This keeps it free, fast, and predictable. (Phase 3 is where LLM calls live.)

## Architecture

### Where it runs

A new cron job in `dashboard-server/cron/index.js`, scheduled at **03:00 Europe/London** (after the 02:00 backup, before the 06:00 FX update). Runs as part of the existing PM2 process — no new services.

### What it produces

A `dreaming` key inside the existing `cc_snapshots.data` JSONB blob, alongside the existing `four_cs`, `skills`, `memory`, `connections`, `brain`, `sessions`, `bugs`, `tests` keys. The morning briefing renderer reads this key to populate new insight sections.

```
data.dreaming: {
  generated_at: ISO timestamp,
  duration_ms: number,
  insights: [
    {
      id: string (deterministic hash for dedup),
      category: 'drift' | 'stale' | 'gap' | 'risk' | 'achievement' | 'pattern',
      severity: 'info' | 'warning' | 'critical',
      title: string,
      body: string,
      evidence: string[] (file paths, bug IDs, metric values),
      action: string | null (suggested next step),
      related_4c: 'context' | 'connections' | 'capabilities' | 'cadence' | null
    }
  ],
  trends: {
    bugs_velocity: { opened_7d, closed_7d, net, trend: 'improving' | 'worsening' | 'stable' },
    task_velocity: { completed_7d, added_7d, net, trend },
    capacity_pressure: { avg_util_pct, over_capacity_count, trend },
    test_health: { pass_rate_7d_avg, flaky_tests: string[], trend }
  },
  stale_report: {
    memory_files: [{ name, days_stale, references_broken: boolean }],
    brain_modules: [{ name, days_stale }],
    skills_without_learnings: string[],
    roles_without_knowledge: string[]
  },
  cross_refs: {
    brain_memory_drift: [{ brain_claim, memory_contradicts, files }],
    orphaned_decisions: [{ decision, source_file, no_longer_matches }]
  }
}
```

### New files

| File | Purpose |
|---|---|
| `dashboard-server/cron/dreaming.js` | Dreaming engine module — exported as `runDreamingEngine(ctx)` |
| `dashboard-server/tests/unit/dreaming.test.mjs` | Unit tests for insight generation logic |

### Modified files

| File | Change |
|---|---|
| `dashboard-server/cron/index.js` | Import dreaming module, register 03:00 cron job |
| `nbi_project_dashboard.html` | Briefing tab renders `data.dreaming` insights + trends |

## Analysis Functions

Each function runs as part of the nightly sweep. All are read-only (DB queries + filesystem reads). Each returns an array of insight objects.

### 1. Bug Velocity Analysis

Queries `bug_reports` for the last 7 and 30 days. Calculates open/close rates, identifies if the backlog is growing or shrinking, flags any bugs older than 14 days still open.

```
Insight example:
  category: 'risk'
  title: 'Bug backlog growing'
  body: '12 bugs opened in the last 7 days, only 3 closed. Backlog increased by 9.'
  action: 'Prioritise bug triage — the Please Review lane has 77 items.'
```

### 2. Task Velocity Analysis

Queries `tasks` table for created_at and status changes in the last 7 days. Computes throughput (tasks completed vs added), identifies projects with no movement (stalled), and flags tasks that have been "In progress" for more than 14 days.

```
Insight example:
  category: 'pattern'
  title: 'Lighthouse Games: 3 tasks stalled >14 days'
  body: 'Phase 1 Telemetery Final Review / QA, Play game and test, ...'
  action: 'Check if these are blocked or just deprioritised.'
```

### 3. Capacity Pressure Analysis

Uses the same prorated capacity calculation from the People view. Identifies team members consistently over 100% utilisation, flags upcoming weeks where aggregate capacity exceeds supply, detects uneven distribution (one person at 180% while another is at 10%).

```
Insight example:
  category: 'risk'
  title: 'Stavros at 147% this week, 163% next week'
  body: '58.8 prorated hours against 40h capacity. 18 overlapping tasks.'
  action: 'Redistribute or defer 3-4 tasks to bring below 100%.'
```

### 4. Memory Staleness Scan

Reads memory files from the auto-memory directory. Checks each file's `metadata.type` and `description` against the current codebase state. Identifies:
- Files not updated in >30 days referencing specific code paths
- Files whose referenced entities (functions, files, clients) no longer exist
- Duplicate or near-duplicate memories

### 5. Brain Coherence Check

Reads `NBI_Brain.md` and `brain/` modules. Cross-references claims against the current state:
- Client list in Brain vs `clients` table
- Team roster in Brain vs `users` table
- Service offerings vs actual project types
- Dates and deadlines that have passed

```
Insight example:
  category: 'drift'
  title: 'Brain lists 6 clients, database has 7'
  body: 'Playsage exists in the database but is not mentioned in NBI_Brain.md.'
  action: 'Add Playsage to Section 4 of the Brain, or remove the client record.'
```

### 6. Skill Coverage Analysis

Scans `.claude/skills/` and checks each skill's learnings file, eval criteria, and usage patterns (from session logs). Identifies skills with no learnings, skills that haven't been invoked in recent sessions, and gaps where common tasks don't map to any skill.

### 7. Achievement Detection

Positive insights — things that went well. Detects:
- Bugs closed faster than opened (momentum)
- Projects that reached >80% completion this week
- Team members who cleared their overdue backlog
- Test count increases
- New features merged

## Trends Object

The `trends` object tracks 7-day rolling metrics and compares to the prior 7 days to determine trend direction. These feed the 4Cs metrics on the Dashboard tab and provide sparkline data for the morning briefing.

| Trend | Source | Calculation |
|---|---|---|
| `bugs_velocity` | `bug_reports` | COUNT by created_at/updated_at in last 7d vs prior 7d |
| `task_velocity` | `tasks` | COUNT by status change to Done in last 7d |
| `capacity_pressure` | `tasks` + `users` | AVG of per-person weekly utilisation |
| `test_health` | vitest + playwright last-run results | Pass rate from stored test results |

## Briefing Tab Changes

The Daily Briefing tab currently shows: calendar, blocked tasks, workload by client. Phase 2 adds:

1. **Overnight Insights** section — rendered from `data.dreaming.insights`, grouped by severity (critical first, then warnings, then info). Each insight is a card with title, body, evidence links, and an optional action button.
2. **Trends** section — four compact cards showing the trend metrics with directional arrows and 7-day comparison.
3. **Stale Report** — collapsible section showing items that need attention (stale memories, outdated brain claims).

These sections appear below the existing calendar and blocked tasks sections, so Phase 1 content is preserved.

## Cron Schedule

```
03:00 Europe/London — Dreaming engine
  1. Read current cc_snapshot for today (or create if none)
  2. Run all 7 analysis functions
  3. Merge results into data.dreaming
  4. Upsert snapshot
  5. Log duration and insight count
```

Expected runtime: <5 seconds (all local queries + file reads, no external API calls).

## Testing Strategy

- Unit tests for each analysis function using mock data (tasks, bugs, files)
- Integration test: run full `runDreamingEngine()` against test database, verify snapshot shape
- Manual verification: run once, check briefing tab shows insights

## What Glen Reviews Tomorrow

1. **Analysis functions 1-7**: Are these the right things to analyse overnight? Missing anything? Over-engineering anything?
2. **Insight format**: Is the category/severity/title/body/action structure useful, or does he want a different shape?
3. **Briefing placement**: Overnight Insights below calendar/blocked tasks — or should they be first?
4. **Trends**: Are the four trend metrics (bugs, tasks, capacity, tests) the right ones?
5. **Anything that should wait for Phase 3**: Any analysis here that actually needs LLM reasoning and should be deferred?
