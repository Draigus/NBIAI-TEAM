# Handoff: News aggregator design + plan + M1 start

**Date:** 2026-04-17
**Author:** Claude (Opus 4.7)
**Session type:** design, specification, plan, begin implementation
**Reason for handoff:** context heavy after full brainstorm + spec + plan + 5 tasks; clean resume point after Task 5.

---

## Headline

The NBI Hub News Aggregator is underway. Spec and full 49-task implementation plan are committed. Tasks 1 to 5 of 49 are done: the separate `nbi-news` service is scaffolded on PM2 at port 8890, the dashboard proxies `/api/news/*` to it, the internal notifications endpoint is live, the `news` schema has all 10 tables with tsvector search columns, and 53 editorial plus structured-data sources are seeded. No user-visible change yet (News tab is added in Task 28 under milestone M3).

The next session resumes at Task 6 (URL canonicalisation) and should follow the subagent-driven-development skill to continue executing the plan.

---

## Critical documents to read when resuming

Read these in order:

1. `projects/nbi_dashboard/plans/2026-04-17-news-aggregator-design.md`. The authoritative spec. ~650 lines. Covers purpose, architecture, sources, LLM strategy, frontend, admin, non-goals, open-questions-now-resolved, risk register.
2. `projects/nbi_dashboard/plans/2026-04-17-news-aggregator-impl.md`. The 49-task implementation plan. ~4,300 lines. Organised into M1 to M5 milestones.
3. This handoff.
4. `CLAUDE.md` (already loaded by default in new sessions).
5. User memory files, specifically the new hard rules (see "Memory and feedback rules captured" below).

---

## Hard rules captured in this session

Two new cross-session feedback rules, both saved to user memory, both triggered by severe Glen pushback and both described as "HARD RULE":

**1. No scope-watering, no corner-cutting, no quality-for-effort trades.** File: `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\feedback_no_scope_watering.md`. Verbatim trigger: *"Hacky code corner cutting watering down my intention to lower the quality is completely fucking unacceptable. Under no circumstances do that during this chat or any other chat ever."* Caused by narrowing 46 sources to 10, swapping entity-extraction clustering for "LLM picks one representative", dropping Consumer tab, deferring release calendar and layoffs tracker, suggesting Ollama to save pennies on the model. Default to the quality outcome; cost and scope trims offered only after the quality version is on the table and only with real justification.

**2. Never quote timelines.** File: `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\feedback_no_timelines.md`. Verbatim trigger: *"stop quoting timelines; you're terrible at them."* Caused by cycling through 2 days → 4 weeks → 6-8 weeks on the same project within an hour. Structure work by milestone deliverables (what gets built), never by duration (weeks/days/hours). Calendar dates set by Glen are data, not estimates, and quoting those is fine.

Both rules apply to every future conversation and every project, not just the news aggregator.

---

## Design decisions locked in

Captured with Glen's explicit sign-off during spec review:

- **Service topology.** Separate PM2 app `nbi-news` at `projects/news-aggregator/`, port 8890. Fastify + Drizzle + TypeScript. Matches nbiai-api style, not the dashboard-server Express monolith pattern. Proxied through `dashboard-server:8888` at `/api/news/*`.
- **Database.** Shared Postgres at `localhost:5432/nbi_dashboard`, dedicated `news` schema. 10 tables (sources, articles, digests, stories, story_articles, monthly_summaries, media_assets, feed_health, generation_runs, prompts). tsvector generated columns on articles and stories with GIN indexes.
- **Sources.** 53 total (48 editorial + 5 editorial-ish structured + 10 earnings = actually 53 entries confirmed in the DB). Tiers: trade 12, consumer 7, crossover 3, mobile_asia 8, analyst 5, trade_body 3, structured_data 15. Full list in `projects/news-aggregator/src/sources/seed.json`.
- **LLM access.** Claude Agent SDK (`@anthropic-ai/claude-agent-sdk` at `^0.2.112`) as the sole Claude client. Primary auth is Max Pro via Claude Code credentials on disk. Fallback is API key via `ANTHROPIC_API_KEY_FAILOVER` env var, promoted in memory on auth failure. Notification sent on any failover; urgent notification if both paths fail.
- **Model.** `claude-sonnet-4-6` for all pipeline stages. Not downgrading to Haiku. Rejected because "curation and summaries are the whole point" (Glen's pushback).
- **Update cadence.** Hourly RSS ingest. Weekly digest at 22:00 UTC Sunday. Monthly synthesis at 22:00 UTC on `min(30, lastDayOfMonth)` (handles February and leap years automatically). Launch edition is a 30-day backfill run at go-live.
- **Categories.** Four fixed: Studios, Games, Shifts, Strategy. Plus a dynamic 5th named by Claude each week if at least 4 stories cluster under a non-canonical theme (e.g., "Mobile", "Asia", "Esports", "Regulation", "IP & Adaptations").
- **Frontend placement.** Top tab bar in `nbi_project_dashboard.html`, inserted between `finances` and `settings` in the `renderTabs()` array at line 3596 (Hub file). Natural ordering: admin sees News before Settings; non-admin sees News at the end. Lazy-loaded on first click.
- **Mobile behaviour.** On `<768px` the view switches to "top-news-only": hero plus a compact headline list of other stories. Section bands, dynamic 5th, and archive grid do not render.
- **Typography.** Serif headlines via Google Fonts Playfair Display for hero and section headers. Body uses the Hub's existing sans-serif stack.
- **Search.** Unified over articles and stories (single query, single result page with two sub-sections), not split tabs.

---

## Shipped this session

All commits are on `master`, pushed locally, not pushed to origin.

| Step | Commit | Summary |
|---|---|---|
| Design spec | `a5f6c18` | Initial full design (650 lines) |
| Review resolutions | `4dee2df` | Resolved all five open questions; auth failover simplified to `ANTHROPIC_API_KEY_FAILOVER` var |
| Plan | `b80c6f3` | 49-task implementation plan across 5 milestones (4,309 lines, zero em-dashes, zero timelines, zero TBD placeholders) |
| Task 1a | `dabc17e` | Scaffold nbi-news Fastify service |
| Task 1b | `ae2aa02` | Fix: restore `@anthropic-ai/claude-agent-sdk` dependency (implementer had silently dropped it; controller verified package exists at `0.2.112`, Glen's rule on corner-cutting had just been saved so the fix was fast) |
| Task 2 | `52ede9a` | `/api/news/*` proxy middleware in dashboard-server |
| Task 3 | `e84732c` | `/api/internal/notifications` endpoint in dashboard-server |
| Task 4 | `621dfd2` | Full `news` schema with Drizzle migrations (0000 auto-gen + 0001 hand-written tsvector) |
| Task 5 | `6da6561` | 53 sources seeded across 7 tiers |

Also on master before this session: existing NBI Hub work up to `9838280 handoff: 2026-04-16b full day session state`.

---

## Current system state

### PM2 processes

Run `pm2 list` to verify. Expected (as of handoff):

| id | name | port | status |
|---|---|---|---|
| 0 | nbi-dashboard | 8888 | online |
| 1 | nbiai-api | 3001 | online |
| 2 | cloudflared | n/a | online (tunnel) |
| 3 or 4 | nbi-news | 8890 | online |

The `cloudflared` process was added under PM2 during this session because the tunnel was not running at session start. It tunnels `worksage.nbi-consulting.com` to `localhost:8888`. PM2 state is persisted via `pm2 save` already executed.

**If pm2 list is empty on resume:** `pm2 resurrect` should bring them all back. If that fails, start each manually:
```
cd /d/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server && pm2 start ecosystem.config.js
cd /d/OneDrive/Claude_code/NBIAI_TEAM/projects/nbiai_app/app && pm2 start ecosystem.config.cjs
cd /d/OneDrive/Claude_code/NBIAI_TEAM/projects/news-aggregator && pm2 start ecosystem.config.cjs
pm2 start "C:/Program Files (x86)/cloudflared/cloudflared.exe" --name cloudflared -- tunnel run
pm2 save
```

### Postgres

Same DB as before: `localhost:5432/nbi_dashboard`, user `nbiai`, password `NbiAi2026!SecureDb`. New `news.*` schema with 10 tables. 53 rows in `news.sources`, 0 rows in `news.articles`.

```sql
SELECT tier, count(*) FROM news.sources GROUP BY tier ORDER BY tier;
-- analyst: 5, consumer: 7, crossover: 3, mobile_asia: 8, structured_data: 15, trade: 12, trade_body: 3
```

### Tokens and secrets

Stored in `.env` files (gitignored, not in commits):

- `projects/news-aggregator/.env` has `NEWS_INTERNAL_TOKEN=861701efc195d335641962bde3469875c3ca68f348e328f9b04787aaf7824eae`. Same value is also in `dashboard-server/.env` (added during Task 2). This is the shared secret between the two services.
- `ANTHROPIC_API_KEY_FAILOVER` is empty in `projects/news-aggregator/.env`. Needs to be populated before any Task 14+ LLM invocation that might need the fallback path. Glen to provide the key.
- Postgres URL in `NEWS_DB_URL` matches the dashboard's DB.

### File layout as of handoff

Under `projects/news-aggregator/`:
```
.env                     (gitignored, contains tokens)
.env.example
.gitignore
ecosystem.config.cjs     (PM2 fork mode, port 8890)
package.json             (drizzle, fastify, agent SDK, rss-parser, sharp, zod@4, etc.)
package-lock.json
tsconfig.json
dist/                    (build output, gitignored)
node_modules/            (gitignored)
logs/                    (pm2 logs)
src/
  config.ts              (zod-validated env loader)
  index.ts               (Fastify bootstrap, registers health + seeds sources)
  db/
    index.ts             (drizzle client, pg Pool)
    schema.ts            (10 tables in pgSchema('news'))
    migrate.ts           (migration runner)
    migrations/
      0000_tiny_hellcat.sql       (auto-generated schema + indexes)
      0001_search_vectors.sql     (hand-written tsvector)
      meta/_journal.json          (both migrations registered)
  routes/
    health.ts            (GET /health)
  sources/
    seed.json            (53 source definitions)
    registry.ts          (idempotent seeder)
```

Under `dashboard-server/`:
- `server.js` line ~941: `/api/internal/notifications` endpoint (before requireAuth)
- `server.js` line ~966: `app.use(requireAuth)` (unchanged)
- `server.js` line ~968: `/api/news/*` proxy middleware to `http://127.0.0.1:8890` with pathRewrite `/api/news -> /news`
- `.env`: has `NEWS_INTERNAL_TOKEN` appended (not committed)
- `package.json`: has `http-proxy-middleware@^3.0.5` added

---

## Notable deviations from the spec captured during implementation

Three adjustments made under "escalate when in doubt" judgment:

1. **zod bumped v3 to v4.** The Agent SDK requires zod v4 as peer. Plan specified v3.23.0. Implementer upgraded to `^4.0.0`. Safe for the minimal APIs in `src/config.ts` (`z.object`, `z.coerce.number`, `z.string().url()` exist in both versions). If a later task using Zod hits a v4 syntax issue, handle at that point.

2. **Notifications endpoint uses `role = 'admin'` and `is_active = true`.** Plan assumed `is_admin` and `active` column names. Real `users` table uses `role` varchar and `is_active` boolean. Implementer discovered this and adjusted. Correct call.

3. **`generation_runs.digestId` and `generation_runs.monthlySummaryId` are nullable UUIDs without `.references()` in the Drizzle schema.** Reason: would create a circular FK (digests references generation_runs, generation_runs references digests). Constraint is enforced logically, not at DB level. Matches spec's "nullable fk" note.

No other deviations.

---

## How to resume

1. Read `projects/nbi_dashboard/plans/2026-04-17-news-aggregator-impl.md` sections "Milestone M1: Infrastructure, ingest, media" starting at Task 6, and skim the milestone headers for context.
2. Verify services are up: `pm2 list`. If not, see "Current system state" above.
3. Confirm schema is intact: `psql $NEWS_DB_URL -c "SELECT count(*) FROM news.sources"` returns 53.
4. Resume task execution via the subagent-driven-development skill. Next task is **Task 6: URL canonicalisation (TDD)**. It is self-contained in `projects/news-aggregator/src/ingest/canonical.ts` with a unit test, no DB, no network. Small implementer dispatch with Haiku is appropriate.
5. After Task 6, proceed through 7, 8, 9, 10, 11, 12, 13 to complete M1. Each is specified in the plan with exact code and test assertions.
6. Update the TodoWrite with 49 items (Tasks 1 to 5 already completed). Full list ordering:
   - **M1:** 1 Scaffold, 2 Proxy, 3 Notifications endpoint, 4 Schema, 5 Sources, 6 Canonical, 7 Fetcher, 8 Dedup, 9 Feed health, 10 Scheduler, 11 Enrichment, 12 Media cache, 13 Media serve + cron.
   - **M2:** 14 Agent SDK wrapper + failover, 15 Prompt loader, 16 Seed prompts, 17 Clustering, 18 Curation, 19 Summarisation, 20 Hero selection, 21 Monthly synthesis, 22 Date math, 23 Weekly orchestrator, 24 Monthly orchestrator, 25 Launch orchestrator, 26 Cron wiring.
   - **M3:** 27 Digest routes, 28 News tab in renderTabs, 29 Lazy module + API client, 30 Hero, 31 Sections, 32 Monthly block, 33 Typography, 34 Responsive, 35 Archive, 36 Loading, 37 Smoke.
   - **M4:** 38 Search backend, 39 Search UI, 40 Admin feed health, 41 Admin merge/split, 42 Admin prompts, 43 Admin sources, 44 Admin regenerate.
   - **M5:** 45 Full test suite, 46 Edge cases, 47 Launch seed, 48 Runbook, 49 Deployment.

Resume checklist at the top of the new session:
```
pm2 list                                                  # expect 4 processes online
cd /d/OneDrive/Claude_code/NBIAI_TEAM
git log --oneline -10                                     # most recent should be 6da6561
psql "$(grep ^NEWS_DB_URL projects/news-aggregator/.env | cut -d= -f2-)" -c "SELECT tier, count(*) FROM news.sources GROUP BY tier"
# If all good, proceed with Task 6
```

---

## Things to watch for in upcoming tasks

- **Task 6 (URL canonicalisation).** Trivial, TDD, no integration concerns. Should fly.
- **Task 7 (RSS fetcher).** `rss-parser` API: parseString is async. Plan includes a `parseFeedAsync` variant. Captured RSS fixtures go in `tests/fixtures/rss/`.
- **Task 8 (dedup).** Requires a test DB helper (`tests/fixtures/db.ts`). The first task in M1 to actually touch the DB from test code. Ensure test isolation (TRUNCATE before each test).
- **Task 10 (ingest scheduler).** Needs `p-limit` for enrichment concurrency (installed in Task 11, not Task 10). Install it early so the scheduler's `enrichNewArticles` helper compiles.
- **Task 14 (Agent SDK wrapper).** This is the single highest-risk task in the whole plan. The SDK's actual API may differ from what the plan assumes. The plan's failover logic mutates `process.env.ANTHROPIC_API_KEY` at runtime, which requires the SDK to re-read the env var on each `query` call. If the SDK caches the key at first init, the failover logic needs to instantiate a new client. Verify SDK behaviour before shipping.
- **Task 22 (date math).** Leap year tests include 1900 (non-leap) and 2000 (leap). Must pass.
- **Task 28 (News tab).** Inserts into `nbi_project_dashboard.html` `renderTabs()` at line ~3596. Must add 'news' to both the `tabs` array and the `labels` object, and also to the `known` views array at line ~3648. Do NOT add a permission filter for 'news'.
- **Task 34 (mobile top-news-only).** The responsive CSS and the JS fork in `renderNewsSections` are both required. Screen resize triggers re-render.

---

## Open items unrelated to the news aggregator

These carried over from the previous session (`handoff_2026-04-16b_full_day.md`) and remain untouched:

- 16 items in `bug_reports` with status `please_review` awaiting Glen's UAT.
- BUG-2 (sync poll conflict detection) and BUG-5 (inbound email error handling) deferred from the 2026-04-16 code review.
- QuickBooks Time API integration blocked on Bryan's token.
- Telemetry + BI Dashboard plan exists, not started.

Do not touch these unless Glen asks.

---

## Communication protocol reminder

Glen's operating model, per memory:

- He reviews FINISHED products only. No phase gates, no intermediate approvals.
- Detailed handoffs (this file): yes, always.
- Session log after every substantive exchange: yes.
- Live state files (`projects/nbi_dashboard/live_state/`): append as work completes.
- Memory files: keep lean (index in MEMORY.md under 200 lines), split to topic files.
- No em-dashes, British English, direct style, no fluff.

---

Ready to resume. Next command in a new session should be "continue news aggregator from Task 6".
