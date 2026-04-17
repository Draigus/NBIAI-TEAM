# Handoff: News aggregator M2 + M3 shipped → M4 (search + admin) next

**Date:** 2026-04-17
**Author:** Claude (Opus 4.7)
**Previous handoff:** `handoff_2026-04-17b_news_m1_complete.md`
**Reason for handoff:** clean milestone boundary. M2 (LLM pipeline +
orchestrators + cron) and M3 (frontend) both shipped end to end, with a
real 30-day launch backfill published to the database. The next
meaningful chunk of work is M4 (search + admin UI) and M5 (polish +
launch), which want a fresh context.

---

## Headline

The news aggregator is **functionally live**. Glen's API key is in
`.env`, the SDK wrapper auth path is verified, the weekly + monthly +
hourly cron schedules are registered, a real 30-day launch digest is
published in the database (30 stories across 4 canonical categories +
"adaptations" as the dynamic 5th, $0.79 actual cost), and the News tab
is wired into the dashboard with hero, sections, archive, and the
monthly synthesis surface ready for when the first monthly fires.

The next session resumes at **Task 37 UAT** (Glen clicks the News tab
and signs off) then **Task 38 — full-text search backend** to kick off
milestone M4.

---

## Shipped in this session

16 commits on `master` (local only; not pushed to origin):

| Commit | What |
|---|---|
| `f43b2f8` | **refactor**: replace @anthropic-ai/claude-agent-sdk with raw @anthropic-ai/sdk (M2 Task 14 revised) |
| `87a5086` | Task 15 + 16: prompt loader + seed v1 prompts for 5 stages |
| `665d271` | Task 17: clustering + shared safeParseJson |
| `b84657a` | Task 18: curation with dynamic 5th |
| `5e54378` | Task 19: summarisation |
| `019369d` | Task 20: hero selection |
| `d5a9304` | Task 21: monthly synthesis |
| `27536ff` | Task 22: date utils (leap year, weekly window, monthly day) |
| `3d5f0b3` | Task 23: weekly digest orchestrator |
| `872de49` | Task 24: monthly synthesis orchestrator |
| `95710a0` | Task 25: launch edition (30-day backfill) |
| `05723ee` | Task 26: cron wiring (weekly + monthly + pre-flights) |
| `712d45d` | **docs**: log M2 completion |
| `793f410` | **fix**: smoke-test fixes (streaming, uuid[] cast, dotenv override, empty-cluster guard, maxTokens bump) |
| `6d332a7` | Task 27: digest read endpoints (/news/digests/*) |
| `8bec485` | Tasks 28-36: frontend — News tab, hero, sections, archive, monthly block, CSS, responsive |

---

## Current system state

### PM2 processes
At handoff, `pm2 list` should show:

| id | name | port | status |
|---|---|---|---|
| 0 | nbi-dashboard | 8888 | online |
| 1 | nbiai-api | 3001 | online |
| 2 | cloudflared | n/a | online |
| 3 | nbi-news | 8890 | online |

nbi-news was restarted after every code change this session. The last
restart log should show:

```
LLM auth pre-flight { ok: true, mode: 'primary' }
cron jobs scheduled: hourly ingest, weekly digest (Sun 22:00 UTC),
  monthly synthesis (min(30, last-day-of-month) 22:00 UTC), pre-flights 21:50
```

### Postgres (`localhost:5432/nbi_dashboard`, schema `news`)
- `sources`: 53 rows (42 enabled, 11 auto-disabled — unchanged from M1 handoff)
- `articles`: 723 rows (hourly ingest has added 15 since M1 completion)
- `media_assets`: 173+ rows
- `feed_health`: growing (hourly cron)
- `prompts`: **5 rows** (clustering, curation, summarisation,
  hero_selection, monthly_synthesis) all version=1, is_active=true.
  `summarisation` has 3 few-shot examples in its `few_shot_examples` jsonb.
- `digests`: **1 row** — `id = c709f1c1-f02a-4646-badd-7aabb10b2e10`,
  `digest_type = launch_30day`, `status = published`,
  period 2026-03-18 to 2026-04-17, `hero_story_id` set
- `stories`: 30 rows for that digest (9 studios, 8 games, 6 shifts,
  3 strategy, 4 adaptations-as-dynamic-5th)
- `story_articles`: ~147 rows linking stories to their contributing articles
- `monthly_summaries`: 0 rows (no monthly fired yet — next trigger is
  30 April 22:00 UTC)
- `generation_runs`: ~35 rows from the smoke test (clustering +
  curation + 30 summaries + hero_selection + 2 healthchecks)

### Files added or modified this session

```
projects/news-aggregator/package.json              # sdk swap + dotenv add
projects/news-aggregator/package-lock.json         # regenerated
projects/news-aggregator/.env                      # ANTHROPIC_API_KEY populated (redacted in git)
projects/news-aggregator/.env.example              # added ANTHROPIC_API_KEY=
projects/news-aggregator/src/index.ts              # dotenv/config + override, news routes + seed prompts wiring
projects/news-aggregator/src/llm/client.ts         # raw @anthropic-ai/sdk, primary/failover, streaming
projects/news-aggregator/src/llm/json-utils.ts     # safeParseJson<T> shared
projects/news-aggregator/src/llm/prompts.ts        # loadActivePrompt, savePromptVersion, listPromptVersions
projects/news-aggregator/src/llm/seed-prompts.ts   # v1 bodies for 5 stages, 3 few-shot examples for summarisation
projects/news-aggregator/src/llm/clustering.ts     # maxTokens 32768 (streaming)
projects/news-aggregator/src/llm/curation.ts       # client-side dynamic 5th threshold recomputation
projects/news-aggregator/src/llm/summarisation.ts
projects/news-aggregator/src/llm/hero-selection.ts
projects/news-aggregator/src/llm/monthly-synthesis.ts
projects/news-aggregator/src/pipeline/weekly.ts    # full orchestration + empty-cluster guard
projects/news-aggregator/src/pipeline/monthly.ts   # check-then-insert (month col is indexed, not unique)
projects/news-aggregator/src/pipeline/launch.ts    # 30-day weekly + digest_type flip
projects/news-aggregator/src/utils/dates.ts        # leap year, weeklyDigestPeriod, monthlySynthesisDay
projects/news-aggregator/src/routes/digests.ts     # /news/digests/current + /archive + /:id + /monthly-summaries/:id
projects/news-aggregator/src/scheduler/cron.ts     # weekly + monthly + 2 pre-flight schedules
projects/news-aggregator/tests/unit/prompts.test.ts
projects/news-aggregator/tests/unit/clustering.test.ts
projects/news-aggregator/tests/unit/curation.test.ts
projects/news-aggregator/tests/unit/dates.test.ts
projects/news-aggregator/tests/unit/client-failover.test.ts  # mock rewired to stream()+finalMessage()

nbi_project_dashboard.html                          # News tab + CSS block + 400-line news module

projects/nbi_dashboard/live_state/work_completed.md # M2 + smoke test entries
projects/nbi_dashboard/session_logs/2026-04-17_task14_llm_client.md
```

Test count: **79 unit tests across 11 files, all green.** TypeScript
typecheck clean via `npm run build`.

---

## Critical architecture decisions (read before touching anything)

### 1. Raw Anthropic SDK, not Agent SDK
The Agent SDK (`@anthropic-ai/claude-agent-sdk`) was the plan's Task 14
choice because it routed through Max Pro subscription billing. The
reality: the Agent SDK IS the Claude Code CLI under the hood and
injects the full harness (~13K tokens of built-in tool schemas, slash
commands, skills, agents) into every system prompt, **even with
`settingSources: []` and `allowedTools: []`**. A weekly digest of ~32
LLM calls would have burned ~420K overhead tokens on top of real
content — genuinely dangerous against Max Pro's 5-hour window.

Glen's call (2026-04-17 ~10:00 UTC): rip it out. Replace with raw
`@anthropic-ai/sdk ^0.90.0`. Pay per token in USD, accept the cost.
Confirmed cost on the 30-day backfill: **$0.79 for 34 LLM calls, 137K
input / 25K output tokens.** A typical weekly is projected around
$1-2 at Sonnet 4.6 rates.

### 2. Streaming-only request path
Non-streaming `messages.create()` is hard-capped to a 10-minute SDK
timeout. Clustering on a 500+ article backfill can exceed that. All
calls go through `client.messages.stream({ ... }).finalMessage()`.
Works for any request size, one code path, no timeout risk.

### 3. dotenv override at boot
`process.env.ANTHROPIC_API_KEY` showed up as an empty string in PM2's
saved dump file (historical contamination from earlier pre-key shells).
Node's `--env-file` flag respects pre-existing env over the file, so
the .env key was silently ignored. Fix: `dotenv.config({ override: true })`
as the very first statement in `src/index.ts`. If you ever see
"No API key available for mode=primary" despite .env being set, this
is why — but it's fixed and shouldn't recur.

### 4. Array literal trick for uuid[] parameters
Drizzle's `sql\`...ANY(${jsArray}::uuid[])\`` serialises JS arrays as
Postgres records, which don't cast to uuid[]. Three files use a
manual array literal workaround:
```ts
const idArray = `{${articleIds.join(',')}}`
await db.execute(sql`SELECT ... WHERE a.id = ANY(${idArray}::uuid[])`)
```
Safe because IDs come from our DB (no injection risk). If you add more
raw SQL queries with array params, use this pattern.

### 5. Empty-cluster guard in weekly pipeline
If clustering returns zero clusters (LLM truncation, parse failure,
sparse input), the weekly digest is left as `status = 'draft'` instead
of publishing empty. Detected by `clusters.length === 0` after
`clusterArticles()`. The stop_reason warning in `client.ts` makes this
visible in logs.

### 6. `llmAuthMode` enum
`'max_pro' | 'api_key'` from the original plan is now
`'primary' | 'failover'`. Both names describe "same SDK, which key".
The only `generation_runs` rows using old names are the early
healthcheck rows from 2026-04-17 02:26 — they're harmless but will
show `max_pro` in reports. Can be migrated with
`UPDATE news.generation_runs SET llm_auth_mode='primary' WHERE
llm_auth_mode='max_pro'` if Glen wants clean reports later.

---

## Smoke test evidence (Task 26 + Task 27)

Command:
```bash
node scratch-smoke-launch.mjs   # deleted; can be reconstructed from launch.ts import
```

Timing: **508 seconds wall clock (~8.5 min)** for the full 30-day
backfill (586 articles → 147 clusters → 30 selected stories + hero).
Stage breakdown:
- Clustering: 1 call, 86K in / 8K out, ~4 min
- Curation: 1 call, 7K in / 2K out, ~20 s
- Summarisation: 30 calls, avg 600 in / 170 out, ~3 min
- Hero selection: 1 call, 5K in / 50 out, ~5 s

Hero pick: "Xbox Game Pass 'too expensive for players'" — genuinely
the most significant story in the window. Dynamic 5th emerged
legitimately: "adaptations" (GTA 6 trailer, Super Mario movie, Street
Fighter film, Bloodborne animation, Call of Duty film).

Read endpoint evidence:
```bash
curl -s http://localhost:8890/news/digests/current | jq '.stories | length'
# 30
curl -s http://localhost:8890/news/digests/archive?limit=10 | jq '.digests[0]'
# { id: "c709f1c1...", digest_type: "launch_30day", ... }
```

---

## How to resume

### 1. Verify baseline
```
pm2 list                                            # expect 4 online
cd /d/OneDrive/Claude_code/NBIAI_TEAM
git log --oneline -18                               # head = 8bec485
cd projects/news-aggregator && npm test             # expect 79 green
curl -s http://localhost:8890/news/digests/current | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.stories.length, 'stories')"
# expect: 30 stories
```

### 2. Close out Task 37 (Glen UAT)
Task 37 is literally "Glen loads the dashboard, clicks News, confirms
it renders." Ask him if he's done that yet. If there's a visual bug,
fix it before starting M4. Common things to sanity-check if it looks
wrong:
- `/api/news/digests/current` returns 401 (expected when not logged in);
  viewing in authenticated dashboard session is required
- CSS variable fallbacks: I used `var(--text, #111)` etc. with
  hardcoded fallbacks. If a style looks wrong in dark mode, the
  var might need to be added to both light + dark theme blocks
- OG images 404: verify `/api/news/media/<hash>/card` returns 200
  for a real hash. The proxy chain must pass auth cookies through.

### 3. Task 38 — Full-text search backend

Plan lines ~3512-3585. Spec calls for:
- Postgres tsvector columns on `articles.title||summary` and
  `stories.headline||summary` (already added in 0001_search_vectors.sql
  per the M1 migration)
- `GET /news/search?q=...&category=...&source=...&from=...&to=...`
- Return story matches + article matches, with ranked highlights via
  `ts_headline`
- Default sort: `ts_rank` DESC, tie-break on recency

Implementation: new file `src/routes/search.ts`, registered at
`/news/search` in `src/index.ts`. Add pagination (`limit`, `offset`).

### 4. Task 39 — Search UI
Plan lines ~3586-3660. New sub-tab on the News page ("Search"). Text
input, optional filters in a dropdown. Renders results as article-style
rows with source + date + highlighted snippet. Reuses
`newsApi.search()` which is ALREADY stubbed in the module — just
doesn't have a UI entry point yet.

### 5. Tasks 40-44 — Admin UI (feed health, merge/split, prompt editor, source management, regenerate)

These are all new admin views behind a "News admin" sub-tab visible
only when `isAdmin`. Biggest lift is Task 42 (prompt editor) because
it needs the versioning UI that calls `savePromptVersion()` we
already built.

### 6. Task 45-49 — M5 polish (full test suite, edge cases, 30-day launch seed run, runbook, PM2 deployment)

Task 47 is interesting — the plan's "30-day launch seed run". We
already did this as the smoke test, so 47 may reduce to "document
what was done."

---

## Gating items to flag for Glen

1. **UAT not yet done.** Frontend is committed but Glen hasn't
   clicked the News tab. If something looks wrong, fix before
   starting M4.

2. **Weekly cron will fire Sunday 22:00 UTC** (20 April 2026 at time
   of writing). It will produce a real weekly digest covering
   13-19 April. Expected cost: ~$1.50. No action needed unless Glen
   wants to disable it for QA:
   ```bash
   # Disable cron entirely
   NEWS_SKIP_LLM_HEALTHCHECK=1 pm2 restart nbi-news --update-env
   # ... or comment out the weekly schedule in src/scheduler/cron.ts
   ```

3. **Monthly cron fires 30 April 2026 22:00 UTC.** First time only
   one weekly will have accumulated, so the "State of the Industry"
   essay may be thin. This is fine — monthlies gain depth after a
   couple of weekly digests exist.

4. **Failover key.** Glen populated `ANTHROPIC_API_KEY_FAILOVER` with
   the same value as the primary key. That's functionally a no-op
   failover (if the primary fails, the failover will also fail),
   but it's fine for now. When he wants real redundancy, use a key
   from a different Anthropic organisation or a separate billing
   source.

5. **11 auto-disabled source feeds.** Unchanged from M1 handoff.
   Forbes, Bloomberg, PC Gamer, Wired, Axios Gaming, Sensor Tower,
   Benji Sales, Niko Partners, Crunchbase, videogamelayoffs, Ukie,
   all earnings scrapers, IGDB, Epic Calendar, Nikkei Asia Gaming.
   Research task for Glen or Task 43 (admin sources UI) to fix URLs.
   32 working feeds produce plenty of input.

---

## Known gotchas

- **dotenv override is load-order sensitive.** The `import 'dotenv/config'`
  + `dotenv.config({override:true})` sequence at the top of
  `src/index.ts` MUST run before any module that reads
  `process.env.ANTHROPIC_API_KEY`. The `config.loadConfig()` call
  happens after, so it's safe. If you add a new top-level import that
  reads env at import time, the key may not be loaded yet — put it
  after the dotenv lines.

- **PM2 env contamination.** `pm2 save` + `pm2 resurrect` persists the
  dump's environment, including empty-string vars from the shell that
  ran `pm2 save`. If anything env-related breaks after a PM2 kill, do
  `pm2 kill && unset ANTHROPIC_API_KEY && pm2 resurrect && pm2 start ecosystem.config.cjs --only nbi-news`.

- **`generation_runs` rows accumulate.** The healthcheck writes one
  row on every nbi-news boot. Over weeks this will add up. Clean up
  is a Task 44/49 follow-up — either a cron `DELETE WHERE run_type = 'clustering' AND input_token_count < 20` or a separate `run_type = 'healthcheck'` label.

- **`scratch-smoke-launch.mjs` was deleted after use.** To re-run the
  launch backfill (e.g. for QA with fresh data), write a one-liner:
  ```bash
  node -e "import('./dist/pipeline/launch.js').then(m => m.generateLaunchDigest({info:console.log,warn:console.warn,error:console.error}))"
  ```

- **News tab is visible to everyone.** No permission filter on
  `'news'` in renderTabs(). Spec §2.1 says news is
  authenticated-only, which it is (via the dashboard auth middleware).
  If Glen wants admin-only, add `if (t === 'news') return hasPageAccess('news')` and define `news` in the permissions config.

- **Windows line-ending warnings on commit are expected.** Git is
  converting LF ↔ CRLF. Not worth fixing.

---

## Things NOT to do

- Do not push to origin. Glen hasn't asked for it.
- Do not re-run `generateLaunchDigest` unless Glen asks — there's
  already one live in the DB and a second would conflict on
  `digest_type='launch_30day'` displayed-as-current.
- Do not downgrade the clustering maxTokens below 16384 — any large
  backfill will silently truncate.
- Do not replace `dotenv.config({override:true})` with
  `process.loadEnvFile` — the latter is stricter about an existing
  env and re-introduces the empty-string problem.
- Do not try to make the monthly synthesis fire manually before
  April 30. Only one weekly will have accumulated (the one firing
  on Sunday 20 April); a monthly run will produce a thin essay.
  Better to wait for the scheduled run.
- Do not disable the weekly cron for QA without also clearing
  `ANTHROPIC_API_KEY_FAILOVER` back to empty — otherwise a failed
  test could silently drain API credit.
- Do not swap streaming back to non-streaming even for "small" calls.
  One code path is simpler than two.

---

Ready to resume. Next command in a new session: "load
handoff_2026-04-17c_news_m2_m3_complete.md and start Task 38
(full-text search backend) — but first check with Glen whether UAT
on the News tab is done."
