# NBI Hub News Aggregator: Design Specification

**Status:** Draft for review
**Author:** Claude (Opus 4.7)
**Date:** 2026-04-17
**Supersedes:** Prior design from 2026-04-16 (not persisted to disk; critique captured in `handoff_2026-04-16b_full_day.md` and in conversation context)

## 1. Purpose

A weekly editorial pulse on the games industry, surfaced as a tab in NBI Hub for game developers and NBI consultants. Not a firehose. Not a blog reader. Closer to a well-edited weekly newspaper section paired with a monthly editorial essay on major shifts. Credible sourcing wide enough that no significant story is missed, curation tight enough that opening the tab reveals what mattered.

Primary readers: NBI staff, NBI clients with Hub access, any authenticated Hub user.

Primary reading action: skim the week's hero and sections, open stories that matter, return Monday mornings.

Secondary actions: browse archive, search historical coverage, read monthly synthesis for strategic context.

## 2. Scope summary

- ~48 editorial sources plus 10 structured data sources.
- Weekly ingest and curation producing a publishable digest every Sunday night.
- Initial launch ingests the previous 30 days as the first aggregated digest.
- Monthly synthesis published on the 30th, or the last day of month when the 30th does not exist (February).
- Four fixed categories (Studios, Games, Shifts, Strategy) plus a dynamic 5th section named by Claude based on the week's highest-reported theme outside the canonical four.
- Tab embedded in the existing NBI Hub dashboard HTML. Lazy-loaded. Editorial visual language.
- Admin tooling for feed health, story merge/split, prompt editing, source management, and manual regeneration.
- Postgres full-text search across all articles and stories.

## 3. Non-goals for initial release

- Per-user reading history, bookmarks, or personalisation.
- Email digest delivery. (Reuse of the Graph API email infrastructure is feasible as a follow-up.)
- Per-client competitor filtering or watchlist alerts.
- Publishing outside of the Hub (no public pages, no embeds).
- Mobile native app.
- Podcasts, audio transcripts, or video transcription as input to clustering.
- Real-time breaking news alerts. The digest is scheduled, not streaming.
- User comments, reactions, or sharing.
- Translation of non-English sources. All sources at launch are English.
- Paid source subscriptions (The Information, Polygon Plus, etc.). If added later, requires cookie-based fetching.

## 4. Architecture

### 4.1 Service topology

New PM2 application `nbi-news` running alongside `nbi-dashboard` (port 8888) and `nbiai-api` (port 3001). Listens on port 8890.

Folder: `projects/news-aggregator/` at repo root. Node.js 20+. Fastify 4. Drizzle ORM. TypeScript.

Matches the architectural style of `nbiai-api` (the Hub service) rather than the Express monolith pattern of `dashboard-server`. Fastify's plugin system, structured error handling, and schema-driven validation are appropriate for greenfield code at this scope.

### 4.2 Request path

Browser → `dashboard-server:8888` → proxy middleware → `nbi-news:8890`.

Routes under `/api/news/*` on the dashboard proxy to `/news/*` on the news service. The dashboard's existing session cookie authenticates the request; the proxy forwards the authenticated user context via a signed internal header. The news service does not expose a public port and does not accept external traffic.

Benefits of proxy-through-dashboard over direct-from-browser:

- Single origin for the frontend, so session cookies work without CORS plumbing.
- Auth is validated once at the dashboard edge.
- News service restarts are invisible to the frontend.
- Future rate limiting and response caching can be layered at the proxy without touching the news service.

### 4.3 Data storage

Shared Postgres instance at `localhost:5432/nbi_dashboard`. Dedicated `news` schema, not a table-name prefix. All news tables live under `news.*`.

Migrations owned by the news service in `projects/news-aggregator/src/db/migrations/`. Running `npm run db:migrate` in that folder executes only news migrations.

### 4.4 LLM access

Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) as the sole Claude client.

Intended behaviour:

- In normal operation, the service uses Max Pro credentials via the Claude Code auth on disk. `ANTHROPIC_API_KEY` is not set in the process environment, so the SDK resolves to Claude Code credentials.
- A separate env var `ANTHROPIC_API_KEY_FAILOVER` holds the failover API key. Always present in `.env` but never exposed as `ANTHROPIC_API_KEY` in normal operation.
- On auth failure (§9.4), the service sets `process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY_FAILOVER` in memory, reinitialises the SDK client, retries the call, and raises a notification. The failover mode persists for the remainder of the current batch; the next scheduled batch starts clean and retries Max Pro first.

This avoids reading or editing `.env` on disk at runtime and keeps the fallback pattern explicit and testable.

### 4.5 Process model

Single Fastify process. Cron jobs run in-process via `node-cron`:

- Hourly ingest across all sources.
- Weekly digest generation at 22:00 GMT every Sunday.
- Monthly synthesis at 22:00 GMT on `min(30, lastDayOfMonth)`.
- Daily feed-health reconciliation at 06:00 GMT.

Long-running pipeline steps (clustering, curation, summarisation) execute in a worker spawn per job so the HTTP server stays responsive.

## 5. Data model

All tables in the `news` schema.

### 5.1 `news.sources`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `slug` | text unique | stable identifier |
| `name` | text | display name |
| `tier` | text | `trade`, `consumer`, `crossover`, `mobile_asia`, `analyst`, `trade_body`, `structured_data` |
| `feed_url` | text | |
| `feed_type` | text | `rss`, `atom`, `api`, `scrape` |
| `base_url` | text | for canonicalisation |
| `enabled` | boolean | default true |
| `priority_weight` | numeric | used in curation tie-breaks |
| `custom_parser_key` | text nullable | maps to per-source parser when needed |
| `last_success_at` | timestamptz | |
| `last_attempt_at` | timestamptz | |
| `consecutive_failures` | integer | default 0 |
| `created_at` | timestamptz | |

### 5.2 `news.articles`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `source_id` | uuid fk | → `sources` |
| `url` | text | original URL |
| `canonical_url` | text unique | dedup key |
| `title` | text | |
| `summary` | text | article's own description, not LLM summary |
| `body_html` | text nullable | if extracted |
| `published_at` | timestamptz | |
| `author` | text nullable | |
| `og_image_url` | text nullable | |
| `og_image_hash` | text nullable | points to `media_assets` when cached |
| `embedded_video_urls` | text[] | YouTube, Vimeo, Twitter/X |
| `language` | text | default `en` |
| `ingested_at` | timestamptz | |
| `entities` | jsonb | extracted studios, games, people, deals (set by clustering) |
| `search_vector` | tsvector | generated over title + summary + body_html |

### 5.3 `news.stories`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `digest_id` | uuid fk | → `digests` |
| `category` | text | `studios`, `games`, `shifts`, `strategy`, or dynamic slug |
| `is_dynamic_category` | boolean | default false |
| `dynamic_category_label` | text nullable | human-readable label for the 5th section |
| `rank` | integer | position within category, 1 = most significant |
| `headline` | text | LLM-written |
| `summary` | text | LLM-written, 2 to 3 sentences, British English |
| `hero_asset_id` | uuid nullable fk | → `media_assets` |
| `has_video` | boolean | default false |
| `source_count` | integer | cached count of linked articles |
| `primary_entities` | jsonb | studios, games, people the story is about |
| `created_at` | timestamptz | |
| `search_vector` | tsvector | generated over headline + summary |

### 5.4 `news.story_articles`

| column | type | notes |
|---|---|---|
| `story_id` | uuid fk | → `stories` |
| `article_id` | uuid fk | → `articles` |
| `is_primary_source` | boolean | one per story, drives default read-more link |
| | | pk (`story_id`, `article_id`) |

### 5.5 `news.digests`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `digest_type` | text | `weekly`, `launch_30day` |
| `period_start` | date | |
| `period_end` | date | |
| `published_at` | timestamptz | |
| `hero_story_id` | uuid fk | → `stories` |
| `status` | text | `draft`, `published`, `regenerating` |
| `generation_run_id` | uuid fk | → `generation_runs` |
| `created_at` | timestamptz | |

### 5.6 `news.monthly_summaries`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `month` | date | first of month |
| `published_at` | timestamptz | |
| `title` | text | LLM-written editorial headline |
| `body_markdown` | text | LLM-written editorial essay |
| `featured_story_ids` | uuid[] fk | → `stories`, typically 3 |
| `generation_run_id` | uuid fk | → `generation_runs` |

### 5.7 `news.media_assets`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `source_url` | text unique | |
| `hash` | text unique | content hash, also filename |
| `mime_type` | text | |
| `bytes` | integer | |
| `width` | integer | |
| `height` | integer | |
| `fetched_at` | timestamptz | |
| `last_served_at` | timestamptz | |
| `expired` | boolean | default false |

### 5.8 `news.feed_health`

Time-series, one row per poll per source.

| column | type | notes |
|---|---|---|
| `id` | bigserial pk | |
| `source_id` | uuid fk | → `sources` |
| `attempted_at` | timestamptz | |
| `outcome` | text | `success`, `timeout`, `http_error`, `parse_error`, `empty` |
| `http_status` | integer nullable | |
| `error_message` | text nullable | |
| `items_ingested` | integer | |
| `items_new` | integer | net new after dedup |
| `duration_ms` | integer | |

### 5.9 `news.generation_runs`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `run_type` | text | `clustering`, `curation`, `summarisation`, `monthly_synthesis`, `merge_split` |
| `digest_id` | uuid nullable fk | → `digests` |
| `monthly_summary_id` | uuid nullable fk | → `monthly_summaries` |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz nullable | |
| `llm_auth_mode` | text | `max_pro`, `api_key` |
| `failover_occurred` | boolean | default false |
| `input_token_count` | integer | |
| `output_token_count` | integer | |
| `status` | text | `running`, `completed`, `failed` |
| `error_message` | text nullable | |

### 5.10 `news.prompts`

Editable prompts with version history.

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `prompt_key` | text | `clustering`, `curation`, `summarisation`, `monthly_synthesis`, `hero_selection` |
| `version` | integer | |
| `body` | text | |
| `few_shot_examples` | jsonb nullable | |
| `is_active` | boolean | one active row per `prompt_key` |
| `created_at` | timestamptz | |
| `created_by` | uuid nullable | user id if manually edited |

### 5.11 Indexes

- `articles (canonical_url)` unique
- `articles (source_id, published_at desc)`
- `articles using gin(search_vector)`
- `stories (digest_id, category, rank)`
- `stories using gin(search_vector)`
- `feed_health (source_id, attempted_at desc)`
- `digests (period_start desc)`
- `monthly_summaries (month desc)`
- `generation_runs (started_at desc)`

## 6. Sources

### 6.1 Editorial sources

**Trade press (12)**
GamesIndustry.biz, VGC, Game Developer, MCV/DEVELOP, The Game Business (Christopher Dring), Axios Gaming, Naavik, Deconstructor of Fun, Stephen Totilo's Game File, Jason Schreier at Bloomberg, Aftermath, Paul Tassi at Forbes.

**Consumer press (7)**
Eurogamer, PC Gamer news, Polygon industry, IGN news, Kotaku news, The Verge gaming, Rock Paper Shotgun.

**IP / adaptation / entertainment crossover (3)**
Variety gaming, Hollywood Reporter gaming, WIRED gaming.

**Mobile and Asia (8)**
MobileGamer.biz, PocketGamer.biz, GameDiscoverCo (Simon Carless), Nikkei Asia gaming, SCMP gaming, data.ai public reports, Niko Partners briefings, Sensor Tower public reports.

**Analyst and investor (5)**
Hit Points (Nathan Brown), Matthew Ball, Benji-Sales, AAAA Games (Jacob Navok), Konvoy Ventures quarterly.

**Trade bodies and industry releases (3)**
ESA, UKIE, IGDA blog.

**Subtotal editorial: ~48 sources.**

### 6.2 Structured data sources

- videogamelayoffs.com
- Crunchbase gaming funding filter
- IGDB release calendar API
- Steam upcoming releases
- Epic Games Store release calendar
- Public earnings calendars for: Microsoft, Sony, Nintendo, EA, Take-Two, Ubisoft, CD Projekt, NCSoft, Tencent, NetEase

Structured data populates an optional "Trackers" layer shown within category sections during weeks where a data-driven story emerges (a layoff spike, a funding cluster, an earnings week).

### 6.3 Source configuration

Sources are seeded from `sources.seed.json` at first migration. Adding a new source post-launch is via the admin UI, which writes to `news.sources`. No code changes needed for new sources unless they require a custom parser.

## 7. Ingest layer

### 7.1 Polling

`node-cron` runs hourly. Each poll iterates enabled sources, fetches their feed, parses items, dedupes against `news.articles.canonical_url`, writes new items, updates `news.sources.last_success_at` and appends a row to `news.feed_health`.

Concurrency cap: 8 parallel fetches. Request timeout: 15 seconds. User-Agent: `NBI Hub News Aggregator (nbihub@nbi-consulting.com)`.

### 7.2 Parsing

Default parser uses `rss-parser` for RSS and ATOM. Per-source custom parsers live at `projects/news-aggregator/src/ingest/parsers/<slug>.ts` and are registered by `custom_parser_key`.

Expected per-source quirks:

- Truncated content. Many feeds provide ~150 words with a click-through link. Acceptable; title and summary are enough for clustering.
- Missing publish dates. Fallback to `ingested_at` timestamp.
- Sites serving ATOM at an RSS-looking URL. Auto-detected by parser.
- Sites rate-limiting our polls. Backoff doubles the next interval for that source up to a 24h ceiling; notification raised after 48h of continuous backoff.
- Sites requiring JavaScript for content (some Substacks behind Cloudflare). Not supported at launch; flagged at source-addition time.

### 7.3 Canonicalisation and dedup

URL canonicalisation removes tracking parameters (`utm_*`, `fbclid`, `gclid`, `ref_src`), normalises protocol and trailing slash, resolves redirects server-side for sources using link shorteners. Canonical URL is the dedup key.

Cross-source duplicates (two outlets publishing the same article via syndication) are intentionally preserved. They appear as two articles in `news.articles` but cluster into one story in `news.stories` during the weekly clustering run.

### 7.4 Enrichment

After ingest, each new article enters the enrichment queue:

1. Fetch the article page (HTML).
2. Extract Open Graph image URL, canonical URL (overrides ingest-time value if present), publish timestamp, author byline.
3. Parse embedded video URLs matching YouTube, Vimeo, or Twitter/X patterns.
4. Trigger media cache fetch for the OG image (see §8).

Enrichment runs asynchronously from ingest so slow enrichment never blocks the ingest poll.

### 7.5 Feed health monitoring

Rolling 7-day error rate per source. Sources crossing 50% error rate are auto-disabled with `enabled = false` and an admin notification raised. Admin can re-enable after investigation. Sources at 0 ingested items for 14 consecutive days are also flagged (silent failure where the feed responds but is empty).

## 8. Media caching

### 8.1 Image pipeline

OG images are fetched once per article, hashed (SHA-256 of content bytes), and stored locally at `projects/news-aggregator/media/<hash-prefix>/<hash>.<ext>`. Served via `/api/news/media/:hash.{jpg,webp,png}` through the dashboard proxy.

Three variants are generated on first request via `sharp`:

- Thumb: 400px wide, webp, quality 75.
- Card: 800px wide, webp, quality 80.
- Hero: 1600px wide, webp, quality 85.

Variants cached on disk and re-served without reprocessing.

Cache eviction: none at launch. Growth is bounded (approximately 50 new stories per week at ~100KB per story across variants). Revisit at 1GB total size.

### 8.2 Video handling

Video URLs detected during enrichment are stored as `news.articles.embedded_video_urls`. Playback is via iframe embed to the original host (YouTube, Vimeo, Twitter/X). No re-hosting.

Story-level video promotion: if the hero story has video and the curation prompt flags the story as video-centric (trailer reveal, keynote excerpt), the hero card renders the embed with autoplay off. Otherwise video is accessible from the source drawer, not surfaced in the card face.

### 8.3 Asset expiry

If `media_assets.source_url` returns 404 or a content hash mismatch on revalidation, `expired = true`. Cached file is retained and served; only revalidation stops attempting the source URL.

## 9. LLM pipeline

### 9.1 Stages

**Clustering (once per weekly batch)**
Input: all articles within the digest window (7 days, or 30 days for the launch edition).
The prompt asks Claude to extract entities (studios, games, people, deals, dollar figures) from each article and group articles sharing entity overlap into candidate stories.
Output: list of clusters, each with article IDs and shared entities. Writes `news.stories` shell rows (no headline or summary yet) and `news.story_articles` links.

**Curation (once per weekly batch, after clustering)**
Input: all clusters from clustering, plus per-cluster source count and source tier weights.
The prompt asks Claude to select the ~25-30 most significant clusters, assign each to one of the four canonical categories (Studios, Games, Shifts, Strategy), and optionally propose a dynamic 5th theme if at least 4 clusters naturally group under a non-canonical label.
Output: ordered list per category. Sets `category`, `rank`, `is_dynamic_category`, `dynamic_category_label` on `news.stories` rows. Unselected clusters are deleted.

**Summarisation (once per curated story)**
Input: the cluster's article titles, summaries, and canonical URLs.
The prompt asks Claude to write a 2 to 3 sentence summary in British English, neutral tone, citing the primary source. Includes 3 Glen-approved few-shot examples.
Output: `headline` and `summary` on the story row. Selects `hero_asset_id` from the cluster's best OG image (chosen by resolution, aspect ratio, and source priority).

**Hero selection (once per weekly batch, after summarisation)**
Input: all curated stories for the week.
The prompt asks Claude to pick the single most significant story for the hero slot.
Output: `digests.hero_story_id`.

**Monthly synthesis (once per month)**
Input: the month's four weekly digests and top stories by significance.
The prompt asks Claude to write an editorial "State of the Industry" essay identifying major movers, strategic shifts, and themes of the month. Longer form (approximately 600-900 words). Cites weekly digest stories by reference.
Output: `news.monthly_summaries` row with `title`, `body_markdown`, `featured_story_ids`.

### 9.2 Prompt storage and editing

All prompts (clustering, curation, summarisation, hero_selection, monthly_synthesis) live in `news.prompts` with version history. Initial prompts shipped in migration seed data. Admin UI allows editing the active prompt; each edit creates a new version and flips `is_active` on the previous row to false.

### 9.3 Model choice

All pipeline stages use `claude-sonnet-4-6` (or the latest Sonnet available at build time). Sonnet is the lowest-tier model with reliable editorial judgement for this task. Not downgrading to Haiku for cost reasons; the workload is low-frequency and Max Pro covers it.

### 9.4 Auth and failover

Authentication sequence on any LLM call:

1. Attempt call with current SDK client configuration (initially, Max Pro credentials resolved from Claude Code).
2. On auth failure (401/403), set `process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY_FAILOVER` in memory, initialise a new SDK client, retry the call.
3. On retry success:
   - Write `news.generation_runs.failover_occurred = true` and `llm_auth_mode = 'api_key'`.
   - Raise a non-dismissable admin notification via the Hub notification API: *"News aggregator failed over from Max Pro to API key during [run_type] at [timestamp]. Review Claude Code auth."*
   - Continue processing the current batch on API key mode. Next scheduled batch retries Max Pro first (transient failure recovery).
4. On retry failure:
   - Write the run as `status = failed`.
   - Raise an urgent admin notification: *"News aggregator both auth paths failed. No digest generated for [period]. Manual intervention required."*
5. Pre-flight healthcheck runs on service startup and 10 minutes before each scheduled batch. Pre-flight failure raises a notification before the batch job would fail at runtime.

Notifications use the existing Hub notification system; the news service calls the dashboard's notification API via its internal auth token. Admin recipients are resolved from `users.is_admin = true`.

### 9.5 Token and cost tracking

Every LLM call records input and output token counts plus the resolved auth mode in `news.generation_runs`. Admin UI shows rolling 30-day token consumption and auth mode distribution, giving visibility into whether the service is running on Max Pro or API key over time.

## 10. Frontend

### 10.1 Integration

New "News" tab added to the NBI Hub sidebar in `nbi_project_dashboard.html`. Position: between Dashboard and Workload (subject to confirmation in review).

Tab content renders in a lazy-loaded container. The News tab's JS module loads only on first click and is cached for the session. Opening any other tab does not fetch news data. Cost on non-News-tab page loads: zero bytes transferred.

### 10.2 Views

**Today (default landing view)**

- Header: digest title ("Week of 15-21 April 2026"), date, "N stories across M sources" counter.
- Hero slot: single most significant story. Large image (1600px wide max, responsive), headline, 3 to 4 sentence summary, category pill, "N sources" with expandable drawer listing all contributing articles. Monthly synthesis replaces the hero when the current digest falls within a month-synthesis window.
- Section bands: Studios, Games, Shifts, Strategy, and the dynamic 5th when applicable. Each band renders 5-8 story cards in a responsive grid (3 columns desktop, 2 columns tablet, 1 column mobile).
- Story card: image (800px), category pill, headline, 2 to 3 sentence summary, source count with drawer, publish date range, "read original" button.
- Source drawer: opens on-card as an expansion panel. Lists every article that contributed to the story cluster with outlet name, author, publish date, and a click-through link.

**Archive**

- Paginated grid of past weekly editions. Month separators. Monthly synthesis entries shown as distinct tiles.
- Clicking an edition opens its full digest in the Today-view layout.

**Search**

- Full-text search across articles and stories.
- Filters: source, category, date range, has-video.
- Results render as compact cards with snippet highlights.

**Monthly synthesis band**

- When the current or most recent week contains a monthly synthesis, a distinct band appears above the hero: serif title, 600-900 word editorial body rendered from markdown, callouts to 3 featured stories.
- On non-synthesis weeks, the band is absent.
- Previous monthly syntheses accessible from the Archive view.

### 10.3 Typography and visual language

- Headlines: serif (Playfair Display or a system-safe serif stack). Hero headline 42px desktop, 28px mobile. Section headers 28px desktop, 22px mobile. Card headlines 20px.
- Body: Hub's existing sans-serif stack.
- Whitespace: generous. Section bands separated by a viewport-height-eighth of vertical space. Story cards have 24px internal padding and 32px inter-card gap.
- Colour: neutral base, respecting the user's Hub theme (dark or light). Category pills use a small fixed palette keyed to category identity.
- Dynamic 5th section header uses a slightly muted accent colour to signal its adaptive nature.

### 10.4 Responsive breakpoints

- ≥1280px: 3-column card grid, full hero.
- 768-1279px: 2-column grid, hero constrained.
- <768px: single column, hero image reduced, monthly synthesis body collapses behind a read-more.

### 10.5 Loading and error states

- Initial load: skeleton cards matching the section grid structure. Smooth crossfade when data arrives.
- Failed API call: inline error banner with retry button. Does not block the rest of the Hub.
- Empty digest (hypothetical): placeholder "The editorial team is still assembling this week's edition" with a link to the most recent published digest.

## 11. Admin surface

Admin-only views accessible from the Settings panel in the Hub.

### 11.1 Feed health dashboard

Table of all sources with: last success timestamp, rolling 7-day error rate, items ingested in the last 7 days, enabled toggle, and "view history" link.

Sparkline per source showing poll outcomes over 30 days. Sources auto-disabled by the error-rate rule are badged and require manual re-enable.

### 11.2 Story merge/split

For the current and most recent past digests:

- Merge: select two or more stories, confirm, Claude regenerates the combined summary for the merged result.
- Split: for a story whose cluster seems mixed, select the articles belonging to a separate story, confirm, Claude regenerates both summaries.
- Each merge or split writes a `news.generation_runs` entry for audit.

### 11.3 Prompt editor

Textarea editor for each of the five prompts (clustering, curation, summarisation, hero_selection, monthly_synthesis). Shows current active version, version history, and a preview that runs the prompt on a sample input to test output quality before activating.

Saving a new version sets the new row to `is_active = true` and the previous to false. Previous versions remain in the table and can be restored.

### 11.4 Source management

Add-source form: slug, display name, tier, feed URL, feed type, priority weight, custom parser key (optional). Edit and disable existing sources. Bulk import from JSON.

### 11.5 Manual regeneration

Per-digest "Regenerate" button. Clicking re-runs clustering, curation, summarisation, and hero selection for the digest's period. Existing stories retained until the new generation succeeds; on success the old stories are replaced atomically. On failure the old digest remains untouched.

Per-story "Regenerate summary" button. Re-runs only the summarisation prompt for that story.

## 12. Search

Postgres full-text search using `to_tsvector('english', ...)` generated columns on `articles` (title + summary + body_html) and `stories` (headline + summary).

Query path: `GET /api/news/search?q=<query>&source=<slug>&category=<cat>&from=<date>&to=<date>&has_video=<bool>`.

Ranking: `ts_rank_cd` with weights biased toward title matches and a recency decay function. Returns up to 50 results per query with snippet highlights generated via `ts_headline`.

## 13. Notifications

Reuses the Hub notification system built in the email features work. The news service writes notifications via HTTP POST to the dashboard's internal notification API, authenticated with a service token.

Notification types produced by the news service:

- `news_feed_disabled`: a source was auto-disabled by the error-rate rule.
- `news_auth_failover`: Max Pro auth failed, API key used for the current run.
- `news_generation_failed`: both auth paths failed, or another unrecoverable error occurred.
- `news_digest_published`: weekly and monthly digest published (admin-visible only, optional).

All notifications target users with `is_admin = true`.

## 14. Configuration

### 14.1 Environment variables

- `PORT=8890`
- `NEWS_DB_URL=postgresql://nbiai:...@localhost:5432/nbi_dashboard`
- `NEWS_INTERNAL_TOKEN=...` (shared secret between dashboard proxy and news service)
- `DASHBOARD_NOTIFICATION_URL=http://localhost:8888/api/internal/notifications`
- `DASHBOARD_NOTIFICATION_TOKEN=...`
- `ANTHROPIC_API_KEY_FAILOVER=...` (always set; only promoted to `ANTHROPIC_API_KEY` on auth failover)
- `MEDIA_STORAGE_PATH=./media`
- `LOG_LEVEL=info`

### 14.2 PM2 configuration

`projects/news-aggregator/ecosystem.config.cjs` mirrors the `nbiai-api` configuration style. Fork mode, single instance, autorestart, 500MB max memory restart. Logs to `logs/api.log` and `logs/api-error.log`.

## 15. Security

- News service does not expose a public port.
- All requests to the news service originate from the dashboard proxy and carry the internal token.
- Dashboard proxy validates user session before forwarding.
- Admin endpoints enforce `is_admin = true` at the dashboard layer before proxying.
- OG image fetcher uses a request timeout and size cap (2MB per asset) to prevent abuse via malicious source sites.
- RSS ingest URLs are validated against the `news.sources` registry; no arbitrary URL fetching from user input.
- Markdown rendering of monthly synthesis uses a sanitised renderer with a restrictive allowlist (no script, no iframes except YouTube, Vimeo, and Twitter/X for embedded video).

## 16. Testing

- Vitest unit coverage: URL canonicalisation, dedup, entity overlap scoring, category assignment logic, date-of-month calculation (including leap years), prompt output parsing.
- Playwright E2E coverage: opening the News tab, reading a story, opening source drawer, searching, viewing monthly synthesis, admin merge/split flow.
- Integration: fixtures of sample RSS feeds (captured from real sources) exercise the ingest pipeline end-to-end without live feed dependencies in tests.
- LLM pipeline testing: golden-input and expected-output fixtures for clustering and curation. Summarisation tested against the few-shot examples to verify the model stays within voice guidelines.

## 17. Milestones

Described by deliverable and ordering. Each milestone produces something demonstrable before the next one begins.

**M1: Infrastructure and ingest**
Deliverables:
- New PM2 app `nbi-news` online, healthchecked from the dashboard proxy.
- `news` schema created, all tables migrated, indexes in place.
- Ingest running hourly for all ~48 editorial sources and 10 structured data sources.
- Feed health dashboard functional (read-only view showing source status).
- Media cache functional (OG images stored and served with three size variants).
- No user-facing news tab yet.

**M2: LLM pipeline and first digest**
Deliverables:
- Clustering, curation, summarisation, and hero selection all functional via Claude Agent SDK.
- Max Pro and API key auth modes both tested, failover logic verified by forced failure.
- First end-to-end weekly digest generated from 30 days of ingested articles (the launch edition).
- Digest inspectable via DB and raw API; not yet in the Hub.
- Glen reviews the first three stories' summaries and signs off on the prompt voice, or iterates the prompt.

**M3: Frontend**
Deliverables:
- News tab registered in Hub, lazy-loaded.
- Today view rendering: hero, four canonical section bands, dynamic 5th when applicable, story cards, source drawer.
- Typography and responsive layout complete.
- Error and loading states implemented.
- Archive view functional.
- First weekly digest visible and readable in the Hub.

**M4: Monthly synthesis and admin**
Deliverables:
- Monthly synthesis job scheduled and functional; date-of-month rule verified including leap year.
- Monthly synthesis block rendering in the Today view.
- Admin tools functional: feed health, story merge/split, prompt editor, source management, manual regeneration.
- Search view functional with filters and highlights.
- Notification integration verified for all notification types.

**M5: Polish and hardening**
Deliverables:
- Full test suite green (Vitest and Playwright).
- Edge cases validated: leap year, empty digest weeks, source additions mid-month, prompt failure mid-run, media cache growth.
- 30-day launch seed run executed cleanly.
- Performance tuning: tab open-to-first-paint measured and optimised.
- Handoff to operations: runbook for auth failures, source management, and prompt iteration.

## 18. Assumptions

- Max Pro subscription remains valid on the host machine; API key failover handles lapses.
- Postgres has capacity for `news` schema growth (estimated <500MB annualised).
- Dashboard proxy can reliably reach `localhost:8890`.
- The `node-cron` daemon remains running under PM2 (existing pattern in `nbiai-api`).
- Glen has an Anthropic API key available for the `.env` failover.
- All authenticated Hub users should see the News tab. No per-role visibility at launch.

## 19. Open questions

1. Sidebar placement of the News tab. Between Dashboard and Workload is proposed; confirm.
2. Mobile reading: is the mobile-web experience sufficient at launch, or is a native wrapper planned later?
3. Monthly synthesis is published at 22:00 GMT on the month-end day. Is that the right time, or should it align with weekday morning readership?
4. Launch edition: 30-day backfill. Some sources may have stale or malformed archives; the launch digest covers whatever ingests cleanly. Acceptable?
5. Search index granularity: query articles and stories together (as specced) or separately with a tab toggle?

## 20. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Max Pro auth lapses or rate-limits | Medium | High | Automatic API key failover with notification. |
| Claude editorial voice inconsistent across runs | Medium | Medium | Few-shot prompt with approved examples; admin prompt editor for iteration; per-story regenerate. |
| Feed breakage at scale (multiple sources simultaneously) | High | Medium | Auto-disable plus notifications; manual source management to restore. |
| LLM clustering produces nonsensical groupings | Medium | Medium | Admin merge/split UI; per-digest regenerate. |
| DB growth outpaces estimate | Low | Low | Archive tables available; search index tunable. |
| Media asset storage fills disk | Low | Medium | Size cap per asset; revisit eviction when cache exceeds 1GB. |
| Dynamic 5th section picks a poor label | Low | Low | Prompt requires minimum 4 clusters for 5th section; admin can rename the section label post-curation. |
| Monthly synthesis quality below editorial bar | Medium | Medium | Extensive prompt iteration before first publication; manual regenerate available. |
| Paid or JS-gated sources that don't return in RSS | High | Low | Scoped out at launch; revisit as a post-launch addition. |
