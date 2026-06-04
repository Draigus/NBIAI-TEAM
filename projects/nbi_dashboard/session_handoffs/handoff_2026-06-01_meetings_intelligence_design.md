# Handoff: Meetings Intelligence CC Tab — Design Complete, Ready to Build

**Date:** 2026-06-01
**Branch:** `feature/command-centre`
**Status:** Spec + plan written, critiqued, and fixed. Seed data generation is the next action before execution.

---

## What Was Done This Session

### 1. News Feed Fix (carried from May 26 session)

**Root cause:** The news aggregator's weekly digest pipeline was failing because LLM clustering returned hallucinated/malformed article UUIDs. Two failures in logs (May 10 FK violation, May 24 invalid UUID).

**Fix:** `projects/news-aggregator/src/llm/clustering.ts` — after LLM returns clusters, intersect returned article_ids against the known-good input set. Bad IDs silently dropped.

**Result:** Manual digest for May 18-25 generated successfully (67 clusters → 30 stories). Service rebuilt and restarted. Next Sunday's automated run should work.

### 2. Granola Meeting Consolidation (v1 + v2 rebuild)

**v1 (May 26):** Read 142 Granola meetings via 15 MCP API calls. 7 batches returned as oversized files (50-75KB each), only 2KB preview visible. Output: static HTML at `projects/nbi_dashboard/deliverables/2026-05-26-granola-consolidation.html` — ~60% coverage.

**v2 (Jun 1):** Dispatched 7 parallel extraction agents to read all persisted output files in full. Complete rebuild with 142/142 meetings, zero truncation. All 7 agents returned successfully with exhaustive structured extractions (actions, decisions, insights, people, numbers).

**Key data now captured that was missing from v1:**
- Dino exit planning (3-month notice, Sophia as replacement MD, Riley legal at 150K/yr)
- EMI/equity structurally impossible (20+ vehicle corporate structure)
- NBI cash flow crisis ($24K short, "five alarm fire", $60K/month costs)
- Full candidate interviews: Chaitanya Gaggar, Simon Woodroffe, Nia Kiigan, Neil Jones, James Relph, Sergii Fedorov
- All salary negotiations: Graham 120K→135K→145K, Nia 230K→250K, Gary $150K→$216K, Simon 180K+3%
- AI consulting market opportunity ($50B+ spending, 95% failure rate)
- EUR 11M total CH investment (6M seed + 5M convertible)

### 3. Meetings Intelligence CC Tab — Design + Plan

Glen: "make this a page in the command centre. Do it properly, not an iframe."

**Brainstorming decisions:**
- Data source: Intelligence pipeline (read compiled JSON, not live Granola API)
- Sections: All 7 (actions, decisions, people, learnings, numbers, timeline, threads)
- Interactivity: Filter + search + edit action status (write back to Postgres)

**Spec written, self-critiqued (9 issues found), all fixed in v2:**
1. Bootstrap path defined (generate seed JSON from consolidation data)
2. Stable slug IDs instead of fragile content hashes
3. Workstream classification via participant-domain mapping
4. Person normalisation via canonical registry
5. Empty states for all scenarios
6. Explicit "not live" UX (compiled timestamp + info line)
7. In-memory caching with fs.watch invalidation
8. ~600 line estimate for frontend (bounded, not pushing modularisation)
9. EMI equity issue documented as known limitation

**Plan written, self-critiqued (9 issues found), all fixed in v2:**
1. Seed data generation made a prerequisite (done in current session)
2. Test files corrected to `.test.mjs` (ESM) matching vitest config
3. Route test pattern corrected (no `createTestApp`, uses `makeRouter` + supertest)
4. Status merge happens BEFORE return (not after filtering)
5. Client-side filtering (single fetch, no server round-trips per filter change)
6. `esc()` dependency verified (line 5279)
7. CSS variables corrected (`--border-default`, `--purple-bg`, etc. — verified across all 5 themes)
8. CSS task moved before renderers (Task 4, not Task 8)
9. E2E Playwright test added (Task 8)

---

## Files Created/Modified

### New Files
| File | Purpose |
|---|---|
| `docs/superpowers/specs/2026-06-01-meetings-intelligence-cc-tab.md` | Design spec (v2, post-critique) |
| `docs/superpowers/plans/2026-06-01-meetings-intelligence-cc-tab.md` | Implementation plan (v2, post-critique) |
| `projects/nbi_dashboard/deliverables/2026-05-26-granola-consolidation.html` | Complete meeting consolidation (v2, 142/142 meetings) |

### Modified Files
| File | Change |
|---|---|
| `projects/news-aggregator/src/llm/clustering.ts` | Input-set filtering for LLM-returned article IDs |
| `intelligence/synthesis/intelligence_brief.md` | Updated by cloud routine (Jun 1 brief) |
| `nbi_project_dashboard.html` | CC portfolio redesign (client-grouped Needs Attention, team by client, clickable health tags, hidden panels removed) |

---

## What Needs To Happen Next

### Immediate: Generate Seed Data (BEFORE plan execution)

The plan has a prerequisite: `intelligence/compiled/meetings.json` and `intelligence/compiled/person_registry.json` must exist. The person registry is defined in the plan (Task 2 of spec). The meetings.json must be generated from the consolidation data.

**Best approach:** The next session should:
1. Read the consolidation HTML
2. Generate `meetings.json` matching the spec schema (slug IDs, normalised names, workstream tags)
3. Generate `person_registry.json` (already defined in the plan)
4. Commit both files
5. Then execute the 9-task plan

The 7 extraction agent outputs are in the persisted tool results directory:
```
C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\3c65f783-40ed-49d5-acbf-c98f57315c01\tool-results\
```
These contain the raw structured extractions from all 142 meetings and can be used as source material.

### Plan Execution (9 tasks)

| Task | What | Estimated Effort |
|---|---|---|
| 1 | DB migration (059_meeting_action_status) | 2 min |
| 2 | Server lib + unit tests (.test.mjs, ESM) | 15 min |
| 3 | Server routes + mount in server.js | 10 min |
| 4 | Frontend CSS (before renderers) | 5 min |
| 5 | Frontend tab registration + data loading | 10 min |
| 6 | Frontend stats strip + sub-tabs + client-side filters | 15 min |
| 7 | Frontend 7 renderers + status editing | 15 min |
| 8 | E2E Playwright test | 10 min |
| 9 | Full verification (unit + E2E + visual) | 10 min |

### Other Outstanding Items

- **Intelligence banks critically overdue** — 145+ extracts unintegrated, 6 days stale. Recompilation needed.
- **5 bank suggestions pending** — consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database, competitor_watch
- **Massive UAT backlog** — CC v2, 17 bugs (all `please_review`), innovation items. Branch 60+ commits ahead of master.
- **News feed** — Fixed and generating digests. Weekly automation should work from next Sunday.

---

## Server State

- **PM2 nbi-dashboard:** Online on :8888
- **PM2 nbi-news:** Online on :8890, cron scheduled, weekly digest working
- **Tests:** 600/600 unit (last run May 25). E2E suite exists (13 Playwright specs).
- **Branch:** `feature/command-centre` — significantly ahead of master

---

## Key Context for Next Session

- The consolidation HTML (`2026-05-26-granola-consolidation.html`) is the **authoritative source** for what the meetings.json should contain. All actions, decisions, people, learnings, numbers, timeline, and threads are there.
- The plan is designed for **subagent-driven-development** — each task dispatched to a fresh agent.
- Tests must be `.test.mjs` (ESM with `import`), NOT `.test.js` (CJS). Vitest config at `dashboard-server/vitest.config.js` specifies `tests/unit/**/*.test.mjs`.
- CSS uses `--border-default` (NOT `--border-primary`), `--text-secondary`, `--bg-surface`, `--purple`, `--purple-bg`. All verified across all 5 dashboard themes.
- `esc()` exists at line 5279 of `nbi_project_dashboard.html`.
- The CC tab architecture: `_ccValidTabs` array (line 22757), tabs array in `_ccRenderPage()` (line 22927), conditional render branch (line 22942-22947).
