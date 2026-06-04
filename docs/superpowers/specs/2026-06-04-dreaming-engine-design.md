# Dreaming Engine — AIOS Command Centre Phase 2

**Date:** 2026-06-04
**Status:** Approved
**Depends on:** Phase 1 (complete — 6 scanners, 12 endpoints, Four Cs scoring)
**Supersedes:** 2026-05-13-command-centre-phase2-design.md (draft, never implemented)
**Prior decisions:** D1-D7 from 2026-05-11 all apply

## What This Is

A nightly analysis cron ("Dreaming engine") that runs deterministic analysis over the database and filesystem while nobody is using the system. It writes structured findings into the `cc_snapshots` table. When Glen opens the Command Centre in the morning, the Work tab shows what the system figured out overnight — bugs piling up, tasks stalling, achievements earned, brain claims that no longer match reality.

## What It Is Not

- Not Phase 3 (autonomous code execution). The Dreaming engine reads and analyses. It never writes code, creates branches, or modifies files.
- Not an LLM call. All analysis is deterministic — SQL queries, file reads, date arithmetic, pattern matching. No API calls to Claude or any model. Free, fast, predictable.

## Architecture

### Module structure

```
dashboard-server/cron/dreaming/
  index.js                — orchestrator: runs analysers, merges results, writes to snapshot
  bug-velocity.js         — [P1] open/close rates, backlog growth, stale bugs
  task-velocity.js        — [P1] throughput, stalled tasks, stuck-in-progress
  achievements.js         — [P1] positive signals: momentum, completions, milestones
  capacity-pressure.js    — per-person utilisation, overload detection
  memory-staleness.js     — broken refs, old files
  brain-coherence.js      — Brain claims vs DB reality
  skill-coverage.js       — unused skills, missing learnings
```

Priority order: bug-velocity, task-velocity, achievements are P1 (most valuable day-to-day). The remaining four are P2 (still critical, still built in this phase).

### Orchestrator (index.js)

Receives the standard cron `ctx` object (pool, log, fs, path). Runs each analyser sequentially — no parallelism needed since total runtime is <5 seconds. Each analyser call is wrapped in try/catch so one failure does not kill the batch. Assembles the `data.dreaming` object and upserts into today's `cc_snapshots` row.

Exported as `runDreamingEngine(ctx)` for direct invocation from tests or manual trigger.

### Each analyser

Exports a single async function: `async function analyse(ctx)` returning `{ insights: Insight[], trends?: object }`.

Pure read-only functions — query DB and read files, return structured data, never write to DB or filesystem.

### Cron registration

One new line in `dashboard-server/cron/index.js`:

```js
cron.schedule('0 3 * * *', () => runDreamingEngine(ctx), CRON_TZ);
```

03:00 Europe/London daily. After the 02:00 backup, before the 03:30 attachment sweep.

### What it produces

A `dreaming` key inside the existing `cc_snapshots.data` JSONB blob:

```json
{
  "dreaming": {
    "generated_at": "2026-06-04T02:00:00.000Z",
    "duration_ms": 1842,
    "analysers_run": 7,
    "analysers_failed": 0,
    "insights": [
      {
        "id": "deterministic-hash-for-dedup",
        "category": "risk|drift|stale|gap|achievement|pattern",
        "severity": "info|warning|critical",
        "title": "Bug backlog growing",
        "body": "12 bugs opened in the last 7 days, only 3 closed.",
        "evidence": ["bug_reports:open:12", "bug_reports:closed:3"],
        "action": "Prioritise bug triage",
        "related_4c": "context|connections|capabilities|cadence|null"
      }
    ],
    "trends": {
      "bugs_velocity": {
        "opened_7d": 12,
        "closed_7d": 3,
        "net": 9,
        "opened_prior_7d": 8,
        "closed_prior_7d": 10,
        "trend": "worsening"
      },
      "task_velocity": {
        "completed_7d": 14,
        "added_7d": 22,
        "net": -8,
        "completed_prior_7d": 18,
        "trend": "worsening"
      },
      "capacity_pressure": {
        "avg_util_pct": 87,
        "over_capacity_count": 2,
        "trend": "stable"
      },
      "test_health": {
        "pass_rate": 99.1,
        "total_tests": 682,
        "failed_tests": 6,
        "trend": "stable"
      }
    },
    "stale_report": {
      "memory_files": [{"name": "foo", "days_stale": 45, "broken_refs": true}],
      "brain_modules": [{"name": "brand_website", "days_stale": 44}],
      "skills_without_learnings": ["skill-a", "skill-b"],
      "roles_without_knowledge": ["role-x"]
    },
    "cross_refs": {
      "brain_db_drift": [
        {
          "type": "client_mismatch",
          "detail": "Playsage exists in DB but not in NBI_Brain.md",
          "source": "clients table vs brain/clients_detailed.md"
        }
      ],
      "orphaned_decisions": []
    }
  }
}
```

## Analysis Functions

### 1. Bug Velocity (bug-velocity.js) — P1

Queries `bug_reports` for the last 7 and 30 days. Calculates:
- Open/close rates (7d window vs prior 7d)
- Net backlog direction (growing/shrinking/stable)
- Bugs open >14 days still unresolved
- Please-review queue depth (items waiting for team closure)

Insight categories: `risk` (backlog growing), `pattern` (consistent closure rate), `achievement` (backlog shrinking).

### 2. Task Velocity (task-velocity.js) — P1

Queries `tasks` table for status changes. Calculates:
- Tasks completed vs added in last 7 days
- Per-client breakdown of movement
- Tasks in-progress >14 days (stalled)
- Projects with zero status changes in 7 days

Insight categories: `risk` (stalled projects), `pattern` (throughput trends), `gap` (clients with no movement).

### 3. Achievements (achievements.js) — P1

Positive signals only:
- Bugs closing faster than opening (momentum)
- Projects reaching >80% completion this week
- Team members who cleared their overdue backlog
- Test count increases (new tests added)
- Clients with all items on track (zero overdue, zero blocked)

Insight category: `achievement`. Severity: always `info`.

### 4. Capacity Pressure (capacity-pressure.js)

Reuses the utilisation calculation from `routes/resource-planning.js`:
- `capacity_hours_per_week` from users table
- Active task count per assignee
- Time-off entries for the current week

Flags:
- Individuals >100% utilisation
- Individuals >150% utilisation (critical)
- Uneven distribution (one person at 180% while another at 10%)
- Aggregate team utilisation trend

Insight categories: `risk` (overloaded), `pattern` (uneven distribution).

### 5. Memory Staleness (memory-staleness.js)

Reads memory files from the auto-memory directory. Checks:
- Files >90 days old (using the updated staleness logic from Phase 1 bug fix)
- Files with broken file references (referenced paths that no longer exist)
- Files whose `description` field references entities not in the DB

Populates `stale_report.memory_files`.

Insight categories: `stale` (old files), `drift` (broken references).

### 6. Brain Coherence (brain-coherence.js)

Reads `NBI_Brain.md` and `brain/` modules. Cross-references against DB:
- Client names in brain vs `clients` table (missing/extra)
- Team roster in brain vs `users` table (missing/extra)
- Dates and deadlines mentioned in brain that have passed
- Service offerings vs actual project types in use

Populates `cross_refs.brain_db_drift`.

Insight categories: `drift` (mismatch), `stale` (passed deadlines).

### 7. Skill Coverage (skill-coverage.js)

Scans `.claude/skills/` directory. Checks:
- Skills with no `learnings.md`
- Skills with no `evals/` directory
- Skills not referenced in any recent session log (last 14 days)

Populates `stale_report.skills_without_learnings` and `stale_report.roles_without_knowledge`.

Insight categories: `gap` (missing learnings), `stale` (unused skills).

## Insight ID Generation

Each insight gets a deterministic ID based on its category + title + key evidence values. This allows deduplication across consecutive nights — if the same insight appears two nights in a row, the frontend can show "2nd night" instead of duplicating.

```js
const id = crypto.createHash('md5')
  .update(category + ':' + title + ':' + evidence.sort().join(','))
  .digest('hex')
  .slice(0, 12);
```

## Trends Calculation

Each trend compares a 7-day window to the prior 7 days:

| Trend | Source table | Current window | Prior window | Direction logic |
|---|---|---|---|---|
| bugs_velocity | bug_reports | last 7d opens/closes | prior 7d | net improving if closed > opened |
| task_velocity | tasks | last 7d completed/added | prior 7d | improving if completed > added |
| capacity_pressure | tasks + users | this week avg utilisation | last week | improving if avg decreasing |
| test_health | test-results.json | current pass rate | prior snapshot | improving if pass rate increasing |

Direction values: `improving`, `worsening`, `stable` (within 10% of prior).

## Frontend Changes

The Work tab (`_ccRenderWorkTab`) gains three new sections below the existing calendar/blocked tasks, rendered from `_ccBriefing.dreaming` (the briefing endpoint will pass through the dreaming data from the latest snapshot).

### 1. Overnight Insights

Cards grouped by severity — critical first (red left border), then warnings (amber), then info (blue). Each card shows:
- Category badge (Cx/Co/Ca/Cd for the related Four C, or category initial)
- Title (bold)
- Body text
- Evidence as small inline badges
- Action button (if action is present)

If no dreaming data exists yet: "Overnight analysis will appear here after the first nightly run."

### 2. Trends

Four compact cards in a row, one per trend metric:
- Metric name and current value
- Directional arrow (up-green for improving, down-red for worsening, dash-grey for stable)
- 7d vs prior 7d comparison text

### 3. Stale Report

Collapsible section. Header shows total count of stale items. Expanded shows:
- Memory files needing attention (with age and broken ref indicator)
- Brain modules needing verification (with age)
- Skills without learnings
- Roles without knowledge

## Briefing Endpoint Change

`GET /api/command-centre/briefing` will read `data.dreaming` from the latest `cc_snapshots` row and include it in the response, so the Work tab has access to dreaming data without a separate API call.

## Files

### New files

| File | Purpose |
|---|---|
| `dashboard-server/cron/dreaming/index.js` | Orchestrator — runs all analysers, merges, writes snapshot |
| `dashboard-server/cron/dreaming/bug-velocity.js` | Bug backlog analysis |
| `dashboard-server/cron/dreaming/task-velocity.js` | Task throughput analysis |
| `dashboard-server/cron/dreaming/achievements.js` | Positive signal detection |
| `dashboard-server/cron/dreaming/capacity-pressure.js` | Utilisation analysis |
| `dashboard-server/cron/dreaming/memory-staleness.js` | Memory file health |
| `dashboard-server/cron/dreaming/brain-coherence.js` | Brain vs DB drift |
| `dashboard-server/cron/dreaming/skill-coverage.js` | Skill gap detection |
| `dashboard-server/tests/unit/dreaming.test.mjs` | Unit tests for all analysers |

### Modified files

| File | Change |
|---|---|
| `dashboard-server/cron/index.js` | Import dreaming module, register `0 3 * * *` cron |
| `dashboard-server/routes/command-centre.js` | Briefing endpoint passes through `data.dreaming` |
| `nbi_project_dashboard.html` | Work tab renders overnight insights, trends, stale report |

## Testing Strategy

- Unit tests per analyser using mock pool + mock filesystem
- Each analyser test verifies: correct insight categories, correct severity levels, correct trend direction calculation, empty-data handling (no crashes on zero rows)
- Integration test: `runDreamingEngine(ctx)` against test database, verify output shape matches schema
- Manual verification: run `runDreamingEngine` once via `node -e`, check Work tab shows insights

## Runtime

Expected <5 seconds total. All local queries + file reads, no external API calls. The 7 analysers run sequentially (no connection pool pressure). Failure of any single analyser is logged and skipped.
