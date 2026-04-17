# Handoff: News aggregator M1 complete → M2 (Claude Agent SDK) next

**Date:** 2026-04-17
**Author:** Claude (Opus 4.7)
**Previous handoff:** `handoff_2026-04-17a_news_aggregator_m1_start.md`
**Reason for handoff:** clean milestone boundary. M1 shipped end to end. The
next task (Task 14 — Agent SDK wrapper with Max Pro + API key failover)
is flagged in the prior handoff as *the single highest-risk task in the
whole plan* and deserves a fresh, uncluttered context.

---

## Headline

The NBI Hub News Aggregator's M1 milestone (infrastructure, ingest,
media) is done. 708 real articles landed in `news.articles`, 173
OG images cached with WebP variants, all three `/media/:hash/:variant`
sizes serve 200s with correct `Content-Type`, and the hourly ingest cron
is wired into the Fastify boot path. 32 unit tests pass. TypeScript
typecheck is clean.

The next session resumes at **Task 14 — Claude Agent SDK wrapper with
Max Pro + API key failover**, kicking off milestone M2 (LLM pipeline
and orchestration).

---

## Shipped in this session (commits on `master`)

| Step | Commit | Summary |
|---|---|---|
| Task 6 | `b1c32ca` | URL canonicalisation for dedup (8 TDD tests) |
| Task 7 | `62d125c` | RSS/ATOM fetcher with timeout (4 tests) |
| Task 8 | `8c11542` | Article dedup on canonical URL (4 tests) |
| Task 9 | `7c62c0a` | Feed health tracking with auto-disable (6 tests) |
| Task 10 | `5217f6d` | Hourly ingest scheduler, 8-way concurrency |
| Task 11 | `5bd458c` | Article enrichment OG/canonical/video (6 tests) |
| Task 12 | `4a085e9` | Media cache with sharp variants (4 tests) |
| Task 13 | `ba68dee` | Media serving route + hourly ingest cron |
| Docs | `3e2dd6f` | work_completed.md, decisions.md, session_logs |

All commits are on `master`, local only. Not pushed to origin.

---

## Current system state

### PM2 processes
Expected at resume (run `pm2 list`):

| id | name | port | status |
|---|---|---|---|
| 0 | nbi-dashboard | 8888 | online |
| 1 | nbiai-api | 3001 | online |
| 2 | cloudflared | n/a | online |
| 3 | nbi-news | 8890 | online |

`nbi-news` was restarted after Task 13 to pick up the new code. Latest
boot log confirmed `Server listening at http://127.0.0.1:8890` and
`cron jobs scheduled: hourly ingest`.

### Postgres (`localhost:5432/nbi_dashboard`, schema `news`)
- `sources`: 53 rows (42 enabled, 11 auto-disabled — see below)
- `articles`: 708 rows with ingested_at on 2026-04-17, publishedAt
  populated from RSS
- `media_assets`: 173 rows; each has a sha256 hash and three on-disk
  variants under `projects/news-aggregator/media/{2-char-prefix}/{hash}.{thumb|card|hero}.webp`
- `feed_health`: one row per source per attempt this session
- `stories`, `digests`, `monthly_summaries`, `story_articles`,
  `generation_runs`, `prompts`: still 0 rows (all M2+)

### Files added this session
Under `projects/news-aggregator/`:
```
src/ingest/canonical.ts          URL canonicaliser (pure)
src/ingest/fetcher.ts            RSS/ATOM parse + fetch
src/ingest/dedup.ts              insert with canonical_url conflict
src/ingest/feed-health.ts        attempt logging + rolling rate + auto-disable
src/ingest/scheduler.ts          runIngestOnce with 8-way queue + p-limit(4) enrichment
src/ingest/enrichment.ts         extractMetadata + fetchAndEnrich
src/media/variants.ts            sharp thumb/card/hero
src/media/cache.ts               cacheOgImage + getVariantPath
src/routes/media.ts              GET /media/:hash/:variant
src/scheduler/cron.ts            '0 * * * *' UTC hourly ingest
src/notifications/hub.ts         POST to dashboard internal notifications
src/index.ts                     MODIFIED — registers media route + cron
tests/setup.ts                   dependency-free .env loader
tests/fixtures/db.ts             withTestDb + getOrCreateTestSource
tests/fixtures/rss/sample-gi-biz.xml
tests/fixtures/rss/sample-atom.xml
tests/fixtures/html/sample-article.html
tests/unit/canonical.test.ts     8 tests
tests/unit/fetcher.test.ts       4 tests
tests/unit/dedup.test.ts         4 tests
tests/unit/feed-health.test.ts   6 tests
tests/unit/enrichment.test.ts    6 tests
tests/unit/variants.test.ts      4 tests
vitest.config.ts                 wires tests/setup.ts
.gitignore                       MODIFIED — /media/ (was media/)
package.json                     + cheerio@^1.0.0, p-limit@^6.0.0, @types/node-cron
```

---

## Deviations from the plan (all intentional)

1. **Task 7.** Dropped the plan's sync `parseFeed` stub that threw; the
   `rss-parser` library has no sync API and the plan acknowledged this
   by telling callers to use `parseFeedAsync`. Removed the dead shim.
2. **Task 8.** `insertArticlesDedup` now returns
   `{ newCount: number, newIds: string[] }` instead of `number`. The
   IDs are required by Task 11 enrichment wiring. Updated dedup tests
   to match.
3. **Task 9.** `recordFeedAttempt` explicitly sets `attemptedAt: new Date()`.
   Schema column is NOT NULL; plan omitted.
4. **Task 11.** `fetchAndEnrich` calls `cacheOgImage` inline and returns
   `ogImageHash` on `ArticleMetadata`. Plan put it in the scheduler as
   a second step; inline is cleaner and keeps the enrichment pass atomic.
5. **Task 12.** `.gitignore` narrowed `media/` → `/media/` so
   `src/media/` tracks. The on-disk variants cache at top-level
   `./media/` is still ignored.
6. **Task 13.** No deviations.

---

## Smoke test evidence (Task 13.4)

```
articles: 708
media_assets: 173
articles_with_og_hash: 175
sample_hash: aa2e5e0a9fb7112abf94f8a5a6ff31f4712e2f3097290213321706bba298848d

direct/thumb=200 ct=image/webp bytes=12466
direct/card=200  ct=image/webp bytes=43976
direct/hero=200  ct=image/webp bytes=135810
proxy/card=401   (unauthenticated — dashboard requireAuth; correct)
```

Proxy 401 under unauthenticated curl is expected. In the News tab (M3),
the browser will carry the session cookie and the proxy will forward to
`nbi-news:8890`. Do not "fix" this by moving the proxy in front of
`requireAuth` — news content is authenticated-only per spec.

---

## Placeholder feeds to rediscover BEFORE M2 LLM work

These 11 sources auto-disabled during the smoke test because their
seed URLs 404/403/timed out. They are not bugs in our code, they are
stale placeholders in `projects/news-aggregator/src/sources/seed.json`
that need a real-feed discovery pass:

| slug | seen status | notes |
|---|---|---|
| axios-gaming | 404 | Axios Gaming newsletter; find RSS equivalent |
| forbes-tassi | 403 | Forbes blocks most scrapers; may need custom parser |
| bloomberg-schreier | 403 | Same — Bloomberg auth required |
| pc-gamer-news | 404 | URL shape changed; find current news feed |
| sensor-tower | parse error | Private data only; drop or swap for press release feed |
| aaaa-games | parse error | Site may be gone; verify |
| wired-gaming | 404 | Wired's gaming tag feed URL changed |
| benji-sales | 404 | Twitter/YouTube only; drop from RSS tier |
| niko-partners | 304 | May actually be HTTP 304; retry logic may help |
| crunchbase-gaming | 403 | Requires API key; drop or integrate properly |
| videogamelayoffs | 404 | Spreadsheet-based, not RSS; swap for Obinna Donald etc. |
| ukie | 404 | ukie.org.uk news URL changed |
| earnings-sony | 403 | Investor relations; needs custom scraper per spec §5.1 |
| earnings-take-two | parse error | Same |
| earnings-cdpr | 404 | Same |
| earnings-nintendo | 404 | Same |
| earnings-ea | 404 | Same |
| earnings-tencent | 404 | Same |
| earnings-netease | timeout | Same — slow page |
| igdb-releases | 401 | Twitch API key required |
| epic-calendar | 403 | Structured data feed; different |
| nikkei-asia-gaming | 404 | Paywalled + URL change |

This is a research task, not a coding task. Suggest handling it as a
dedicated discovery sprint (one shot, maybe 1 hour of web searching) or
deferring until Task 43 (admin sources management) ships so Glen can
update URLs himself via the UI.

**Do not let this block M2.** The 32 working feeds produce plenty of
input for LLM clustering/curation.

---

## How to resume (Task 14 — Claude Agent SDK wrapper)

### 1. Verify baseline

```
pm2 list                                            # expect 4 online
cd /d/OneDrive/Claude_code/NBIAI_TEAM
git log --oneline -12                               # most recent = 3e2dd6f
cd projects/news-aggregator && npm test             # expect 32 green
```

### 2. Pre-check the SDK reality before writing code

The plan's Task 14 makes assumptions about the `@anthropic-ai/claude-agent-sdk`
`query()` function shape that need validating against the actual
`^0.2.112` installed here:

```typescript
// Plan assumes:
for await (const m of query({
  prompt: string,
  options: {
    systemPrompt: string,
    model: 'claude-sonnet-4-6',
    maxTurns: 1,
    maxTokens: number,
    disallowedTools: string[],
  },
})) {
  messages.push(m)
}
// Then finds the last 'assistant' message and reads .message.content[0].text
// and .message.usage.{input_tokens,output_tokens}
```

**Verify these assumptions with a disposable script before shipping:**

```bash
cd /d/OneDrive/Claude_code/NBIAI_TEAM/projects/news-aggregator
node --env-file=.env ./node_modules/tsx/dist/cli.mjs -e "
const { query } = await import('@anthropic-ai/claude-agent-sdk');
let last;
for await (const m of query({
  prompt: 'Say the word banana and nothing else.',
  options: { model: 'claude-sonnet-4-6', maxTurns: 1 },
})) {
  console.log('MSG:', JSON.stringify(m).slice(0, 400));
  last = m;
}
"
```

Things to confirm:
- Actual message shape (is it `message.content[]` or flat `content`?)
- Usage field naming (`input_tokens`/`output_tokens` vs `usage.inputTokens`)
- Does the SDK read `ANTHROPIC_API_KEY` fresh on each `query()` call,
  or does it cache at import time? This is critical for the failover
  logic — if cached, the failover must reinstantiate a client, not just
  mutate `process.env`.
- Is there an explicit "use Max Pro" vs "use API key" switch, or does
  the SDK auto-detect based on presence of CLI credentials on disk?

If the plan's assumptions are wrong, adjust `src/llm/client.ts` to
match reality. Record the deviation in the commit message.

### 3. Failover logic guardrails

- `ANTHROPIC_API_KEY_FAILOVER` is empty in `.env`. Glen needs to
  populate this before the first LLM call that could fail over.
  Currently, without a failover key present, a Max Pro auth failure
  raises straight away (correct behaviour — notified via
  `notifyGenerationFailed`).
- The `failoverLatched` flag is process-scoped. On PM2 restart it
  resets. That is intentional.
- `hub-notify` swallowed errors in Task 10 also apply here — if the
  dashboard is down during a failover, the notification simply doesn't
  send. Do not make that a hard failure.

### 4. Tests for Task 14

The plan suggests mocking the SDK to unit-test the failover path. Agree
with that — we should not call real Claude during tests. Use `vi.mock`
to stub the SDK's `query` and have the first call throw an auth-shaped
error, then pass on the second. Assert:
- `failoverLatched` becomes true
- `notifyAuthFailover` was called
- the returned result has `authMode: 'api_key'` and
  `failoverOccurred: true`
- `generation_runs` row has `llmAuthMode='api_key'` and
  `failoverOccurred=true`
- a *double* failure triggers `notifyGenerationFailed` and the
  `generation_runs` row is `status='failed'`

### 5. After Task 14

Tasks 15 to 26 are M2's remaining work:
- 15 Prompt loader from DB
- 16 Seed initial prompts
- 17 Clustering (entity-graph → stories)
- 18 Curation (top 5 per category, dynamic 5th)
- 19 Summarisation (headline + summary per story)
- 20 Hero selection (one story per digest)
- 21 Monthly synthesis
- 22 Date math (week boundaries, leap-year month end)
- 23 Weekly orchestrator (cron wiring)
- 24 Monthly orchestrator
- 25 Launch orchestrator (30-day backfill at go-live)
- 26 Cron wiring complete

Each is specified in `projects/nbi_dashboard/plans/2026-04-17-news-aggregator-impl.md`.

---

## Known gotchas

- The vitest setup uses `tests/setup.ts` to load `.env`. Tests that
  access the real DB share the dev DB; `beforeEach` uses `DELETE ...
  WHERE source_id = <test>` to isolate. Do not run tests against a
  production DB that matters.
- `test-source-dedup` is a leftover test source in `news.sources`
  (slug unique). It's harmless but 404s on ingest because its
  `feed_url = https://example.com/feed`. Safe to leave or disable.
- Windows line-ending warnings on commit are expected; git is
  converting LF → CRLF on checkout. Not worth fixing.

---

## Things NOT to do

- Do not push to origin. Glen hasn't asked for it.
- Do not run `pm2 save` again — already saved.
- Do not bump zod below 4.x. The Agent SDK requires v4 as peer; a
  downgrade will break imports.
- Do not try to "fix" the 401 on `/api/news/media/...` by moving the
  proxy in front of `requireAuth`. News is auth-required by design.
- Do not retry the 11 dead seed URLs in code — that's a data task for
  a dedicated discovery pass, not an ingest bug.

---

Ready to resume. Next command in a new session: "load
handoff_2026-04-17b_news_m1_complete.md and start Task 14 with a
pre-check of the Agent SDK message shape."
