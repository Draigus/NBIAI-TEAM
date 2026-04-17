# NBI Hub News Aggregator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an editorial news aggregator as a top-nav tab in NBI Hub, driven by a separate PM2 service that ingests ~58 sources, clusters and summarises stories via Claude Agent SDK with Max Pro primary plus API-key failover, publishes a weekly digest on Sundays, and publishes a monthly synthesis on the 30th (or last day of the month).

**Architecture:** New Fastify + Drizzle + TypeScript service at `projects/news-aggregator/` running under PM2 as `nbi-news` on port 8890. Shared Postgres with a dedicated `news` schema. Dashboard-server (`:8888`) proxies `/api/news/*` to the news service and exposes `/api/internal/notifications` for the news service to write admin alerts. Frontend is a new tab injected into the existing `nbi_project_dashboard.html` top-bar renderer.

**Tech Stack:**
- Node.js 20+, TypeScript 5.7, Fastify 4, Drizzle ORM 0.36, `pg` 8
- `@anthropic-ai/claude-agent-sdk` for LLM access
- `rss-parser` for feed ingestion, `sharp` for image variants
- `node-cron` for scheduling
- Vitest for unit tests, Playwright for E2E
- `http-proxy-middleware` added to dashboard-server for proxying

---

## File Structure

### New: `projects/news-aggregator/`

```
projects/news-aggregator/
├── ecosystem.config.cjs            PM2 config (fork mode, port 8890)
├── package.json                    ESM module, drizzle scripts, vitest
├── tsconfig.json                   strict TypeScript
├── drizzle.config.ts               schema path + migration output
├── .env.example                    all env vars documented
├── vitest.config.ts
├── .gitignore                      node_modules, dist, logs, media
├── README.md                       ops runbook (see Task 48)
├── media/                          runtime image cache (gitignored)
├── logs/                           pm2 logs (gitignored)
└── src/
    ├── index.ts                    Fastify entry point
    ├── config.ts                   env var loading + validation
    ├── db/
    │   ├── index.ts                drizzle client
    │   ├── schema.ts               drizzle schema for all news.* tables
    │   ├── migrate.ts              migration runner
    │   └── migrations/             auto-generated
    ├── sources/
    │   ├── seed.json               58 source definitions
    │   └── registry.ts             load seed on first boot
    ├── ingest/
    │   ├── canonical.ts            URL canonicalisation
    │   ├── dedup.ts                dedup by canonical URL
    │   ├── fetcher.ts              RSS/ATOM fetcher with timeout/retry
    │   ├── enrichment.ts           OG + canonical + video extraction
    │   ├── feed-health.ts          rolling error-rate tracking
    │   ├── scheduler.ts            hourly poll driver
    │   └── parsers/                per-source overrides
    ├── media/
    │   ├── cache.ts                hash + fetch + disk store
    │   ├── variants.ts             sharp-based resize
    │   └── serve.ts                serve with content negotiation
    ├── llm/
    │   ├── client.ts               Agent SDK wrapper with failover
    │   ├── prompts.ts              load active prompt from DB
    │   ├── clustering.ts           stage 1
    │   ├── curation.ts             stage 2 + dynamic 5th category
    │   ├── summarisation.ts        stage 3
    │   ├── hero-selection.ts       stage 4
    │   └── monthly-synthesis.ts    monthly essay
    ├── pipeline/
    │   ├── weekly.ts               orchestrate weekly digest
    │   ├── monthly.ts              orchestrate monthly synthesis
    │   └── launch.ts               30-day launch edition
    ├── scheduler/
    │   └── cron.ts                 node-cron wiring
    ├── routes/
    │   ├── health.ts               /health
    │   ├── digests.ts              GET /digests/current, /digests/:id
    │   ├── search.ts               GET /search
    │   ├── media.ts                GET /media/:hash.:ext
    │   └── admin/
    │       ├── feed-health.ts      GET/POST feed management
    │       ├── stories.ts          merge/split
    │       ├── prompts.ts          edit + version
    │       ├── sources.ts          CRUD
    │       └── regenerate.ts       manual digest/story regen
    ├── notifications/
    │   └── hub.ts                  POST to dashboard internal endpoint
    ├── auth/
    │   └── internal.ts             verify internal token header
    └── utils/
        ├── dates.ts                monthly-synthesis-day calculation
        └── entities.ts              entity overlap scoring helpers
```

### Modified: `dashboard-server/`

- `dashboard-server/server.js`: add `/api/news/*` proxy middleware, add `/api/internal/notifications` endpoint with token auth.
- `dashboard-server/package.json`: add `http-proxy-middleware` dependency.

### Modified: `nbi_project_dashboard.html`

- Insert `news` into the `tabs` array in `renderTabs()` between `finances` and `settings`.
- Add News view renderer, section band components, story card component, source drawer, archive view, search view.
- Add serif headline font loading (Playfair Display).
- Add CSS for news-specific layout and responsive breakpoints.

---

## Milestones

Tasks are grouped by milestone. Each milestone ends with a working, testable deliverable. Implementation order within a milestone matters; across milestones some tasks have strict dependencies noted.

- **M1: Infrastructure, ingest, media.** Tasks 1 to 13. Articles flowing into DB, media cached, no LLM, no UI.
- **M2: LLM pipeline and orchestration.** Tasks 14 to 26. Weekly and monthly digests generated in DB, no UI.
- **M3: Frontend.** Tasks 27 to 37. News tab visible and functional.
- **M4: Search and admin.** Tasks 38 to 44. Search UI and admin tooling.
- **M5: Polish and launch.** Tasks 45 to 49. Testing, runbook, seed run, production configuration.

---

## Milestone M1: Infrastructure, ingest, media

### Task 1: Scaffold the news-aggregator package

**Files:**
- Create: `projects/news-aggregator/package.json`
- Create: `projects/news-aggregator/tsconfig.json`
- Create: `projects/news-aggregator/.gitignore`
- Create: `projects/news-aggregator/.env.example`
- Create: `projects/news-aggregator/ecosystem.config.cjs`
- Create: `projects/news-aggregator/src/index.ts`
- Create: `projects/news-aggregator/src/config.ts`
- Create: `projects/news-aggregator/src/routes/health.ts`

- [ ] **Step 1.1: package.json**

```json
{
  "name": "nbi-news",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts",
    "pm2:start": "pm2 start ecosystem.config.cjs",
    "pm2:restart": "pm2 restart nbi-news",
    "pm2:logs": "pm2 logs nbi-news"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/static": "^7.0.0",
    "drizzle-orm": "^0.36.0",
    "fastify": "^4.28.0",
    "node-cron": "^3.0.3",
    "pg": "^8.13.0",
    "pino": "^9.0.0",
    "rss-parser": "^3.13.0",
    "sharp": "^0.33.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.0",
    "drizzle-kit": "^0.28.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 1.2: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 1.3: .gitignore**

```
node_modules/
dist/
logs/
media/
.env
*.log
```

- [ ] **Step 1.4: .env.example**

```
PORT=8890
NEWS_DB_URL=postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard
NEWS_INTERNAL_TOKEN=change-me-32-random-bytes
DASHBOARD_NOTIFICATION_URL=http://localhost:8888/api/internal/notifications
DASHBOARD_NOTIFICATION_TOKEN=change-me-32-random-bytes
ANTHROPIC_API_KEY_FAILOVER=
MEDIA_STORAGE_PATH=./media
LOG_LEVEL=info
```

- [ ] **Step 1.5: src/config.ts**

```typescript
import { z } from 'zod'

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(8890),
  NEWS_DB_URL: z.string().url(),
  NEWS_INTERNAL_TOKEN: z.string().min(16),
  DASHBOARD_NOTIFICATION_URL: z.string().url(),
  DASHBOARD_NOTIFICATION_TOKEN: z.string().min(16),
  ANTHROPIC_API_KEY_FAILOVER: z.string().optional(),
  MEDIA_STORAGE_PATH: z.string().default('./media'),
  LOG_LEVEL: z.string().default('info'),
})
export type Config = z.infer<typeof ConfigSchema>
export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Invalid config:', parsed.error.flatten().fieldErrors)
    process.exit(1)
  }
  return parsed.data
}
```

- [ ] **Step 1.6: src/routes/health.ts**

```typescript
import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok', service: 'nbi-news', time: new Date().toISOString() }))
}
```

- [ ] **Step 1.7: src/index.ts**

```typescript
import Fastify from 'fastify'
import { loadConfig } from './config.js'
import { healthRoutes } from './routes/health.js'

const config = loadConfig()
const app = Fastify({ logger: { level: config.LOG_LEVEL } })

await app.register(healthRoutes)

app.listen({ port: config.PORT, host: '127.0.0.1' }, (err, address) => {
  if (err) { app.log.error(err); process.exit(1) }
  app.log.info(`nbi-news listening on ${address}`)
})
```

- [ ] **Step 1.8: ecosystem.config.cjs**

```javascript
const path = require('path')
module.exports = {
  apps: [{
    name: 'nbi-news',
    script: 'dist/index.js',
    cwd: path.resolve(__dirname),
    interpreter: 'node',
    node_args: ['--env-file=.env'],
    autorestart: true,
    max_restarts: 5,
    restart_delay: 3000,
    watch: false,
    out_file: 'logs/api.log',
    error_file: 'logs/api-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    env: { NODE_ENV: 'production' },
    exec_mode: 'fork',
    instances: 1,
    kill_timeout: 5000,
    max_memory_restart: '500M',
  }],
}
```

- [ ] **Step 1.9: Install and smoke-test**

```bash
cd projects/news-aggregator && npm install
cp .env.example .env   # edit secrets
npm run build
node --env-file=.env dist/index.js &
sleep 2
curl -s http://localhost:8890/health
# Expected: {"status":"ok","service":"nbi-news","time":"..."}
kill %1
```

- [ ] **Step 1.10: Commit**

```bash
git add projects/news-aggregator
git commit -m "feat(news): scaffold nbi-news Fastify service"
```

---

### Task 2: Dashboard proxy for /api/news/*

**Files:**
- Modify: `dashboard-server/server.js`
- Modify: `dashboard-server/package.json`

- [ ] **Step 2.1: Install http-proxy-middleware**

```bash
cd dashboard-server && npm install http-proxy-middleware@^3.0.0
```

- [ ] **Step 2.2: Locate mount point**

Grep `dashboard-server/server.js` for `app.use(requireAuth)`. Proxy mounts immediately after that line so the dashboard has already authenticated the user.

- [ ] **Step 2.3: Insert proxy middleware after `app.use(requireAuth)`**

```javascript
// News aggregator proxy. Forwards authenticated user context and an internal token.
const { createProxyMiddleware } = require('http-proxy-middleware');
const NEWS_INTERNAL_TOKEN = process.env.NEWS_INTERNAL_TOKEN || '';
app.use('/api/news', createProxyMiddleware({
  target: 'http://127.0.0.1:8890',
  changeOrigin: true,
  pathRewrite: { '^/api/news': '/news' },
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('x-nbi-user', JSON.stringify({
          username: req.user.username,
          displayName: req.user.display_name,
          isAdmin: !!req.user.is_admin,
        }));
      }
      proxyReq.setHeader('x-nbi-internal-token', NEWS_INTERNAL_TOKEN);
    },
    error: (err, req, res) => {
      console.error('[news-proxy] error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'news service unavailable' });
    },
  },
}));
```

- [ ] **Step 2.4: Add NEWS_INTERNAL_TOKEN to dashboard .env**

Append to `dashboard-server/.env`:
```
NEWS_INTERNAL_TOKEN=<must match news service .env>
```

- [ ] **Step 2.5: Verify**

```bash
pm2 restart nbi-dashboard --update-env
curl -s -H "Cookie: <session>" http://localhost:8888/api/news/health
# Expected: {"status":"ok","service":"nbi-news",...}
```

- [ ] **Step 2.6: Commit**

```bash
git add dashboard-server/server.js dashboard-server/package.json dashboard-server/package-lock.json
git commit -m "feat(news): add /api/news proxy middleware"
```

---

### Task 3: Internal notifications endpoint

**Files:**
- Modify: `dashboard-server/server.js`

- [ ] **Step 3.1: Add endpoint before `app.use(requireAuth)`**

```javascript
// Internal endpoint for services (e.g. nbi-news) to create admin notifications.
// Authenticated via x-nbi-internal-token matching NEWS_INTERNAL_TOKEN.
app.post('/api/internal/notifications', express.json(), async (req, res) => {
  const token = req.get('x-nbi-internal-token');
  if (!token || token !== (process.env.NEWS_INTERNAL_TOKEN || '')) {
    return res.status(401).json({ error: 'unauthorised' });
  }
  const { type, title, message, link, dismissable, targetAdmins, username } = req.body || {};
  if (!type || !title) return res.status(400).json({ error: 'type and title required' });
  try {
    if (targetAdmins) {
      const admins = await pool.query('SELECT username FROM users WHERE is_admin = true AND active = true');
      for (const a of admins.rows) {
        await createNotification(a.username, type, title, message || '', link || '', dismissable !== false);
      }
      return res.json({ ok: true, recipients: admins.rows.length });
    }
    if (!username) return res.status(400).json({ error: 'username required when targetAdmins not set' });
    await createNotification(username, type, title, message || '', link || '', dismissable !== false);
    res.json({ ok: true });
  } catch (err) {
    console.error('[internal/notifications] error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});
```

- [ ] **Step 3.2: Verify**

```bash
curl -s -X POST http://localhost:8888/api/internal/notifications \
  -H "x-nbi-internal-token: $NEWS_INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"info","title":"Test","message":"Internal endpoint works","targetAdmins":true}'
# Expected: {"ok":true,"recipients":<N>}
```

Confirm an admin notification appears in the Hub.

- [ ] **Step 3.3: Commit**

```bash
git add dashboard-server/server.js
git commit -m "feat(news): add /api/internal/notifications for service alerts"
```

---

### Task 4: news schema + Drizzle migration

Implements spec §5 (all 10 tables, indexes, tsvector columns).

**Files:**
- Create: `projects/news-aggregator/drizzle.config.ts`
- Create: `projects/news-aggregator/src/db/index.ts`
- Create: `projects/news-aggregator/src/db/schema.ts`
- Create: `projects/news-aggregator/src/db/migrate.ts`
- Create: `projects/news-aggregator/src/db/migrations/0001_search_vectors.sql`

- [ ] **Step 4.1: drizzle.config.ts**

```typescript
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.NEWS_DB_URL! },
  schemaFilter: ['news'],
})
```

- [ ] **Step 4.2: src/db/schema.ts**

Implement all 10 tables per spec §5. Use `pgSchema('news')` wrapper so Drizzle prefixes all tables with `news.`. Column names follow spec §5 exactly. Every timestamp is `timestamp('col', { withTimezone: true })`. Array columns use `.array()`. Indexes in the spec §5.11 list are declared as `(t) => ({ idxName: index('idx_name').on(t.colA, t.colB) })`.

Full schema file contents (abridged: showing the pattern for one table, repeat identically for the rest):

```typescript
import { pgSchema, uuid, text, boolean, timestamp, integer, numeric, jsonb, date, bigserial, primaryKey, index } from 'drizzle-orm/pg-core'

export const newsSchema = pgSchema('news')

export const sources = newsSchema.table('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tier: text('tier').notNull(),
  feedUrl: text('feed_url').notNull(),
  feedType: text('feed_type').notNull().default('rss'),
  baseUrl: text('base_url'),
  enabled: boolean('enabled').notNull().default(true),
  priorityWeight: numeric('priority_weight').notNull().default('1.0'),
  customParserKey: text('custom_parser_key'),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Repeat the pattern for: articles, digests, stories, storyArticles, monthlySummaries,
// mediaAssets, feedHealth, generationRuns, prompts. Column names and types per spec §5.
// Declarations for articles, stories, and feedHealth include indexes in the options arg.
```

- [ ] **Step 4.3: src/db/index.ts**

```typescript
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { loadConfig } from '../config.js'
import * as schema from './schema.js'

const config = loadConfig()
export const pool = new pg.Pool({ connectionString: config.NEWS_DB_URL })
export const db = drizzle(pool, { schema })
export { schema }
```

- [ ] **Step 4.4: src/db/migrate.ts**

```typescript
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './index.js'
await migrate(db, { migrationsFolder: './src/db/migrations' })
await pool.end()
console.log('Migrations complete.')
```

- [ ] **Step 4.5: Generate initial migration**

```bash
cd projects/news-aggregator && npm run db:generate
# Expected: src/db/migrations/0000_<name>.sql with CREATE SCHEMA + CREATE TABLE statements
```

- [ ] **Step 4.6: Hand-written search-vector migration**

Create `src/db/migrations/0001_search_vectors.sql` (Drizzle doesn't yet support generated tsvector columns cleanly):

```sql
ALTER TABLE news.articles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english',
    coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(body_html,'')
  )) STORED;
CREATE INDEX articles_search_idx ON news.articles USING GIN (search_vector);

ALTER TABLE news.stories ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english',
    coalesce(headline,'') || ' ' || coalesce(summary,'')
  )) STORED;
CREATE INDEX stories_search_idx ON news.stories USING GIN (search_vector);
```

- [ ] **Step 4.7: Add 0001 to the drizzle meta journal**

Drizzle tracks migrations in `src/db/migrations/meta/_journal.json`. After running 4.5, manually add an entry for `0001_search_vectors` so the runner executes it:

```json
{ "idx": 1, "version": "7", "when": 0, "tag": "0001_search_vectors", "breakpoints": true }
```

(Timestamp `when` can be left at 0; idx must increment.)

- [ ] **Step 4.8: Run migrations**

```bash
npm run db:migrate
# Expected: Migrations complete.
psql $NEWS_DB_URL -c "\dt news.*"
# Expected: all 10 news.* tables
psql $NEWS_DB_URL -c "\d news.articles" | grep search_vector
# Expected: search_vector | tsvector  (generated)
```

- [ ] **Step 4.9: Commit**

```bash
git add projects/news-aggregator/drizzle.config.ts projects/news-aggregator/src/db
git commit -m "feat(news): add news.* schema with full-text search vectors"
```

---

### Task 5: Seed source registry (53 entries)

**Files:**
- Create: `projects/news-aggregator/src/sources/seed.json`
- Create: `projects/news-aggregator/src/sources/registry.ts`
- Modify: `projects/news-aggregator/src/index.ts`

- [ ] **Step 5.1: seed.json with all 53 sources**

Write `src/sources/seed.json` as a JSON array. Each object has these keys: `slug`, `name`, `tier` (one of: `trade`, `consumer`, `crossover`, `mobile_asia`, `analyst`, `trade_body`, `structured_data`), `feed_url`, `feed_type` (`rss` default, or `atom`/`api`/`scrape`), `base_url`, `priority_weight` (numeric), optional `custom_parser_key`.

Tier weights: trade 1.1-1.3, consumer 0.9-1.0, crossover 1.0-1.1, mobile_asia 0.9-1.1, analyst 1.0-1.1, trade_body 0.8, structured_data 0.9-1.0.

Full entries by tier (copy exactly):

**Trade (12):** gamesindustry-biz (`https://www.gamesindustry.biz/feed`, 1.3), vgc (`https://www.videogameschronicle.com/feed/`, 1.2), game-developer (`https://www.gamedeveloper.com/rss.xml`, 1.2), mcv (`https://www.mcvuk.com/feed/`, 1.1), the-game-business (`https://thegamebusiness.com/feed`, 1.3), axios-gaming (`https://api.axios.com/feed/games`, 1.2), naavik (`https://naavik.co/feed`, 1.2), deconstructor-of-fun (`https://www.deconstructoroffun.com/blog?format=rss`, 1.1), game-file (`https://www.gamefile.news/feed`, 1.1), bloomberg-schreier (`https://www.bloomberg.com/authors/ATUG31SYFEE/jason-schreier.rss`, 1.3), aftermath (`https://aftermath.site/rss`, 1.2), forbes-tassi (`https://www.forbes.com/sites/paultassi/feed/`, 1.0)

**Consumer (7):** eurogamer (`https://www.eurogamer.net/feed`, 1.0), pc-gamer-news (`https://www.pcgamer.com/news/feed/`, 1.0), polygon-industry (`https://www.polygon.com/rss/index.xml`, 1.0), ign-news (`https://feeds.feedburner.com/ign/news`, 1.0), kotaku-news (`https://kotaku.com/rss`, 0.9), the-verge-gaming (`https://www.theverge.com/rss/games/index.xml`, 1.0), rock-paper-shotgun (`https://www.rockpapershotgun.com/feed`, 0.9)

**Crossover (3):** variety-gaming (`https://variety.com/v/gaming/feed/`, 1.1), hollywood-reporter-gaming (`https://www.hollywoodreporter.com/c/business/gaming/feed/`, 1.1), wired-gaming (`https://www.wired.com/feed/tag/video-games/latest/rss`, 1.0)

**Mobile/Asia (8):** mobilegamer-biz (`https://mobilegamer.biz/feed/`, 1.0), pocketgamer-biz (`https://www.pocketgamer.biz/rss/`, 1.0), gamediscoverco (`https://newsletter.gamediscover.co/feed`, 1.1), nikkei-asia-gaming (`https://asia.nikkei.com/rss/feed/industries/games`, 1.0), scmp-gaming (`https://www.scmp.com/rss/324200/feed`, 0.9), data-ai (`https://www.data.ai/en/insights/rss.xml`, 0.9), niko-partners (`https://nikopartners.com/feed/`, 1.0), sensor-tower (`https://sensortower.com/blog/feed`, 0.9)

**Analyst (5):** hit-points (`https://hitpoints.substack.com/feed`, 1.1), matthew-ball (`https://www.matthewball.co/all?format=rss`, 1.1), benji-sales (`https://benjisales.substack.com/feed`, 1.0), aaaa-games (`https://aaaa-games.com/feed`, 1.0), konvoy (`https://www.konvoy.vc/newsletter?format=rss`, 1.1)

**Trade body (3):** esa (`https://www.theesa.com/feed/`, 0.8), ukie (`https://ukie.org.uk/news/feed`, 0.8), igda (`https://igda.org/feed/`, 0.8)

**Structured data (15):** videogamelayoffs (api, 1.0, parser `videogamelayoffs`), crunchbase-gaming (scrape, 1.0, parser `crunchbase_gaming`), igdb-releases (api, 1.0, parser `igdb_releases`), steam-upcoming (api, 0.9, parser `steam_upcoming`), epic-calendar (scrape, 0.9, parser `epic_calendar`), plus ten earnings feeds: earnings-msft, earnings-sony, earnings-nintendo, earnings-ea, earnings-take-two, earnings-ubisoft, earnings-cdpr, earnings-ncsoft, earnings-tencent, earnings-netease. Feed URLs: best-available IR/earnings RSS per publisher. Mark those with `priority_weight` 0.9 (NCSoft/NetEase) or 1.0 (the rest). Feed URLs that 404 at ingest time are left in the source table with `enabled=false` and flagged in the admin dashboard for follow-up (don't delete entries).

If any feed URL above returns 404 during Task 13 smoke-testing, the operational response is to disable that source via admin UI (not delete), investigate the correct feed URL, and update the seed. Do not prune the source list to fit broken feeds.

- [ ] **Step 5.2: src/sources/registry.ts**

```typescript
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function seedSourcesIfEmpty(): Promise<number> {
  const result = await db.execute(sql`select count(*)::int as count from news.sources`)
  const count = (result.rows[0] as { count: number }).count
  if (count > 0) return 0
  const raw = await readFile(join(__dirname, 'seed.json'), 'utf8')
  const sources = JSON.parse(raw) as Array<{
    slug: string; name: string; tier: string; feed_url: string;
    feed_type?: string; base_url?: string; priority_weight?: number; custom_parser_key?: string;
  }>
  for (const s of sources) {
    await db.insert(schema.sources).values({
      slug: s.slug, name: s.name, tier: s.tier, feedUrl: s.feed_url,
      feedType: s.feed_type || 'rss', baseUrl: s.base_url ?? null,
      priorityWeight: String(s.priority_weight ?? 1.0),
      customParserKey: s.custom_parser_key ?? null,
    })
  }
  return sources.length
}
```

- [ ] **Step 5.3: Wire seed into startup**

Modify `src/index.ts` to call after `app.register(healthRoutes)`:

```typescript
import { seedSourcesIfEmpty } from './sources/registry.js'
const seeded = await seedSourcesIfEmpty()
if (seeded > 0) app.log.info(`Seeded ${seeded} sources`)
```

- [ ] **Step 5.4: Verify seed**

```bash
pm2 restart nbi-news --update-env
psql $NEWS_DB_URL -c "SELECT tier, count(*) FROM news.sources GROUP BY tier ORDER BY tier"
# Expected: 7 tier rows, ~53 total
```

- [ ] **Step 5.5: Commit**

```bash
git add projects/news-aggregator/src/sources projects/news-aggregator/src/index.ts
git commit -m "feat(news): seed 53 sources across 7 tiers"
```

---

### Task 6: URL canonicalisation (TDD)

Normalises URLs so the same article from different trackers becomes the same `canonical_url`.

**Files:**
- Create: `projects/news-aggregator/src/ingest/canonical.ts`
- Create: `projects/news-aggregator/tests/unit/canonical.test.ts`

- [ ] **Step 6.1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { canonicaliseUrl } from '../../src/ingest/canonical.js'

describe('canonicaliseUrl', () => {
  it('strips tracking params', () => {
    expect(canonicaliseUrl('https://www.example.com/post?utm_source=x&id=42&fbclid=abc'))
      .toBe('https://www.example.com/post?id=42')
  })
  it('normalises protocol to https', () => {
    expect(canonicaliseUrl('http://example.com/p')).toBe('https://example.com/p')
  })
  it('lowercases host, preserves path case', () => {
    expect(canonicaliseUrl('https://EXAMPLE.com/MyPost'))
      .toBe('https://example.com/MyPost')
  })
  it('removes trailing slash on path', () => {
    expect(canonicaliseUrl('https://example.com/post/')).toBe('https://example.com/post')
  })
  it('preserves trailing slash for bare hostname', () => {
    expect(canonicaliseUrl('https://example.com/')).toBe('https://example.com/')
  })
  it('strips fragment', () => {
    expect(canonicaliseUrl('https://example.com/p#section-2')).toBe('https://example.com/p')
  })
  it('handles all known tracking params', () => {
    const stripped = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','ref_src','mc_cid','mc_eid']
    for (const param of stripped) {
      expect(canonicaliseUrl(`https://x.com/p?${param}=foo&keep=bar`))
        .toBe('https://x.com/p?keep=bar')
    }
  })
  it('returns null for non-http(s) or invalid URLs', () => {
    expect(canonicaliseUrl('javascript:alert(1)')).toBeNull()
    expect(canonicaliseUrl('not a url')).toBeNull()
  })
})
```

Run: `npm test -- canonical`. Expected: all FAIL (module not found).

- [ ] **Step 6.2: Implement**

```typescript
const STRIPPED_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
  'fbclid','gclid','ref_src','mc_cid','mc_eid',
])

export function canonicaliseUrl(input: string): string | null {
  try {
    const u = new URL(input)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    u.protocol = 'https:'
    u.hostname = u.hostname.toLowerCase()
    for (const key of [...u.searchParams.keys()]) {
      if (STRIPPED_PARAMS.has(key)) u.searchParams.delete(key)
    }
    u.hash = ''
    let href = u.toString()
    if (href.endsWith('/') && u.pathname !== '/') href = href.slice(0, -1)
    return href
  } catch { return null }
}
```

Run: `npm test -- canonical`. Expected: all PASS.

- [ ] **Step 6.3: Commit**

```bash
git add projects/news-aggregator/src/ingest/canonical.ts projects/news-aggregator/tests/unit/canonical.test.ts
git commit -m "feat(news): URL canonicalisation for dedup"
```

---

### Task 7: RSS/ATOM fetcher with retry and timeout (TDD)

**Files:**
- Create: `projects/news-aggregator/src/ingest/fetcher.ts`
- Create: `projects/news-aggregator/tests/unit/fetcher.test.ts`
- Create: `projects/news-aggregator/tests/fixtures/rss/sample-gi-biz.xml`

- [ ] **Step 7.1: Capture a sample RSS fixture**

Save 2-3 representative RSS feeds to `tests/fixtures/rss/` as static XML files. At least one RSS 2.0 and one ATOM feed.

- [ ] **Step 7.2: Write tests**

```typescript
import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { parseFeed, fetchFeed } from '../../src/ingest/fetcher.js'

describe('parseFeed', () => {
  it('extracts items from RSS 2.0', async () => {
    const xml = await readFile('tests/fixtures/rss/sample-gi-biz.xml', 'utf8')
    const items = parseFeed(xml)
    expect(items.length).toBeGreaterThan(0)
    for (const i of items) {
      expect(i.title).toBeTruthy()
      expect(i.link).toMatch(/^https?:/)
    }
  })
  it('returns empty array on malformed XML', () => {
    expect(parseFeed('<not xml>')).toEqual([])
  })
})

describe('fetchFeed', () => {
  it('throws TimeoutError after 15s', async () => {
    await expect(fetchFeed('https://10.255.255.1/', { timeoutMs: 100 }))
      .rejects.toThrow(/timeout/i)
  })
})
```

- [ ] **Step 7.3: Implement**

```typescript
import Parser from 'rss-parser'

const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'NBI Hub News Aggregator (nbihub@nbi-consulting.com)' } })

export interface FeedItem {
  title: string
  link: string
  isoDate?: string
  pubDate?: string
  creator?: string
  content?: string
  contentSnippet?: string
  enclosure?: { url: string; type?: string }
}

export function parseFeed(xml: string): FeedItem[] {
  try {
    // Synchronous parse not supported by rss-parser; use parseString via XML tooling fallback
    // For unit tests we allow async parse; export async variant below
    throw new Error('use parseFeedAsync')
  } catch { return [] }
}

export async function parseFeedAsync(xml: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseString(xml)
    return (feed.items || []).map(i => ({
      title: i.title || '',
      link: i.link || '',
      isoDate: i.isoDate,
      pubDate: i.pubDate,
      creator: (i.creator as string) || (i.author as string),
      content: i['content:encoded'] || i.content,
      contentSnippet: i.contentSnippet,
      enclosure: i.enclosure as any,
    }))
  } catch { return [] }
}

export async function fetchFeed(url: string, opts: { timeoutMs?: number } = {}): Promise<FeedItem[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('timeout')), opts.timeoutMs ?? 15000)
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NBI Hub News Aggregator (nbihub@nbi-consulting.com)' },
    })
    if (!resp.ok) throw new Error(`http_error:${resp.status}`)
    const xml = await resp.text()
    return parseFeedAsync(xml)
  } finally {
    clearTimeout(timer)
  }
}
```

Update tests to use `parseFeedAsync` and run: `npm test -- fetcher`. Expected: PASS.

- [ ] **Step 7.4: Commit**

```bash
git add projects/news-aggregator/src/ingest/fetcher.ts projects/news-aggregator/tests/unit/fetcher.test.ts projects/news-aggregator/tests/fixtures/rss
git commit -m "feat(news): RSS/ATOM fetcher with timeout"
```

---

### Task 8: Dedup and article insert (TDD)

**Files:**
- Create: `projects/news-aggregator/src/ingest/dedup.ts`
- Create: `projects/news-aggregator/tests/unit/dedup.test.ts`
- Create: `projects/news-aggregator/tests/fixtures/db.ts` (test DB helper)

- [ ] **Step 8.1: Test DB helper**

```typescript
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../../src/db/schema.js'

export async function withTestDb<T>(fn: (db: ReturnType<typeof drizzle>) => Promise<T>): Promise<T> {
  const pool = new pg.Pool({ connectionString: process.env.NEWS_DB_URL })
  const db = drizzle(pool, { schema })
  try { return await fn(db) } finally { await pool.end() }
}
```

- [ ] **Step 8.2: Tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { withTestDb } from '../fixtures/db.js'
import { insertArticlesDedup } from '../../src/ingest/dedup.js'
import { sql } from 'drizzle-orm'

describe('insertArticlesDedup', () => {
  beforeEach(async () => {
    await withTestDb(async db => { await db.execute(sql`TRUNCATE news.articles CASCADE`) })
  })
  it('inserts new articles, returns newCount', async () => {
    const sourceId = await getOrCreateTestSource()
    const n = await insertArticlesDedup(sourceId, [
      { url: 'https://example.com/a', title: 'A' },
      { url: 'https://example.com/b', title: 'B' },
    ])
    expect(n).toBe(2)
  })
  it('skips duplicates on canonical_url', async () => {
    const sourceId = await getOrCreateTestSource()
    await insertArticlesDedup(sourceId, [{ url: 'https://example.com/a?utm_source=x', title: 'A' }])
    const n = await insertArticlesDedup(sourceId, [{ url: 'https://example.com/a', title: 'A' }])
    expect(n).toBe(0)
  })
})
```

- [ ] **Step 8.3: Implement**

```typescript
import { db, schema } from '../db/index.js'
import { canonicaliseUrl } from './canonical.js'
import { sql } from 'drizzle-orm'

export interface RawArticle {
  url: string; title: string; summary?: string; publishedAt?: Date | null;
  author?: string; ogImageUrl?: string; contentHtml?: string;
}

export async function insertArticlesDedup(sourceId: string, items: RawArticle[]): Promise<number> {
  let inserted = 0
  for (const item of items) {
    const canonical = canonicaliseUrl(item.url)
    if (!canonical) continue
    const result = await db.execute(sql`
      INSERT INTO news.articles (source_id, url, canonical_url, title, summary, body_html, published_at, author, og_image_url)
      VALUES (${sourceId}, ${item.url}, ${canonical}, ${item.title}, ${item.summary ?? null}, ${item.contentHtml ?? null},
              ${item.publishedAt ?? null}, ${item.author ?? null}, ${item.ogImageUrl ?? null})
      ON CONFLICT (canonical_url) DO NOTHING
      RETURNING id
    `)
    if (result.rowCount && result.rowCount > 0) inserted++
  }
  return inserted
}
```

Run tests: `npm test -- dedup`. Expected: PASS.

- [ ] **Step 8.4: Commit**

```bash
git add projects/news-aggregator/src/ingest/dedup.ts projects/news-aggregator/tests
git commit -m "feat(news): article dedup on canonical URL"
```

---

### Task 9: Feed health tracking

**Files:**
- Create: `projects/news-aggregator/src/ingest/feed-health.ts`

- [ ] **Step 9.1: Implement**

Exports: `recordFeedAttempt(sourceId, outcome, fields)`, `getRollingErrorRate(sourceId, days=7)`, `shouldAutoDisable(sourceId)`.

```typescript
import { sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

export type FeedOutcome = 'success' | 'timeout' | 'http_error' | 'parse_error' | 'empty'

export interface FeedAttemptFields {
  httpStatus?: number | null
  errorMessage?: string | null
  itemsIngested?: number
  itemsNew?: number
  durationMs?: number
}

export async function recordFeedAttempt(sourceId: string, outcome: FeedOutcome, fields: FeedAttemptFields = {}) {
  await db.insert(schema.feedHealth).values({
    sourceId,
    outcome,
    httpStatus: fields.httpStatus ?? null,
    errorMessage: fields.errorMessage ?? null,
    itemsIngested: fields.itemsIngested ?? 0,
    itemsNew: fields.itemsNew ?? 0,
    durationMs: fields.durationMs ?? 0,
  })
  await db.execute(sql`
    UPDATE news.sources SET
      last_attempt_at = now(),
      last_success_at = CASE WHEN ${outcome} = 'success' THEN now() ELSE last_success_at END,
      consecutive_failures = CASE WHEN ${outcome} = 'success' THEN 0 ELSE consecutive_failures + 1 END
    WHERE id = ${sourceId}
  `)
}

export async function getRollingErrorRate(sourceId: string, days = 7): Promise<number> {
  const r = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE outcome != 'success')::float / NULLIF(count(*), 0) AS rate
    FROM news.feed_health
    WHERE source_id = ${sourceId} AND attempted_at > now() - (${days} || ' days')::interval
  `)
  return Number((r.rows[0] as any).rate ?? 0)
}

export async function autoDisableIfUnhealthy(sourceId: string, log: { warn: Function }): Promise<boolean> {
  const rate = await getRollingErrorRate(sourceId)
  if (rate >= 0.5) {
    await db.execute(sql`UPDATE news.sources SET enabled = false WHERE id = ${sourceId}`)
    log.warn({ sourceId, rate }, 'source auto-disabled (50% error rate)')
    return true
  }
  return false
}
```

- [ ] **Step 9.2: Commit**

```bash
git add projects/news-aggregator/src/ingest/feed-health.ts
git commit -m "feat(news): feed health tracking with auto-disable"
```

---

### Task 10: Hourly ingest scheduler

**Files:**
- Create: `projects/news-aggregator/src/ingest/scheduler.ts`

- [ ] **Step 10.1: Implement**

```typescript
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { fetchFeed } from './fetcher.js'
import { insertArticlesDedup } from './dedup.js'
import { recordFeedAttempt, autoDisableIfUnhealthy } from './feed-health.js'
import { notifyFeedDisabled } from '../notifications/hub.js'

const CONCURRENCY = 8

export async function runIngestOnce(log: { info: Function; warn: Function; error: Function }): Promise<void> {
  const sources = await db.select().from(schema.sources).where(eq(schema.sources.enabled, true))
  const queue = [...sources]
  const workers: Promise<void>[] = []
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push((async () => {
      while (queue.length) {
        const s = queue.shift()!
        const started = Date.now()
        try {
          const items = await fetchFeed(s.feedUrl, { timeoutMs: 15000 })
          const inserted = await insertArticlesDedup(s.id, items.map(i => ({
            url: i.link,
            title: i.title,
            summary: i.contentSnippet,
            publishedAt: i.isoDate ? new Date(i.isoDate) : i.pubDate ? new Date(i.pubDate) : null,
            author: i.creator,
            contentHtml: i.content,
          })))
          await recordFeedAttempt(s.id, items.length === 0 ? 'empty' : 'success', {
            itemsIngested: items.length,
            itemsNew: inserted,
            durationMs: Date.now() - started,
          })
          log.info({ slug: s.slug, items: items.length, new: inserted }, 'feed ok')
        } catch (err: any) {
          const outcome = /timeout/i.test(err.message) ? 'timeout'
            : /http_error/i.test(err.message) ? 'http_error'
            : 'parse_error'
          await recordFeedAttempt(s.id, outcome as any, {
            errorMessage: String(err.message).slice(0, 500),
            durationMs: Date.now() - started,
          })
          log.warn({ slug: s.slug, err: err.message }, 'feed failed')
          const disabled = await autoDisableIfUnhealthy(s.id, log)
          if (disabled) await notifyFeedDisabled(s.slug, s.name)
        }
      }
    })())
  }
  await Promise.all(workers)
}
```

- [ ] **Step 10.2: Add `notifications/hub.ts` stub (full impl in Task 14)**

```typescript
import { loadConfig } from '../config.js'

const config = loadConfig()

async function post(body: Record<string, unknown>) {
  try {
    await fetch(config.DASHBOARD_NOTIFICATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nbi-internal-token': config.NEWS_INTERNAL_TOKEN,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[hub-notify] failed:', err)
  }
}

export async function notifyFeedDisabled(slug: string, name: string) {
  await post({
    type: 'warning',
    title: `News feed auto-disabled: ${name}`,
    message: `Source ${slug} exceeded 50% error rate over 7 days and was disabled. Review in the News admin panel.`,
    targetAdmins: true,
    dismissable: false,
  })
}

export async function notifyAuthFailover(runType: string) {
  await post({
    type: 'warning',
    title: 'News aggregator failed over to API key',
    message: `Max Pro auth failed during ${runType}. API key fallback engaged. Review Claude Code auth.`,
    targetAdmins: true,
    dismissable: false,
  })
}

export async function notifyGenerationFailed(runType: string, period: string) {
  await post({
    type: 'error',
    title: 'News aggregator generation failed',
    message: `Both Max Pro and API key auth failed during ${runType} for ${period}. No digest generated. Manual intervention required.`,
    targetAdmins: true,
    dismissable: false,
  })
}
```

- [ ] **Step 10.3: Commit**

```bash
git add projects/news-aggregator/src/ingest/scheduler.ts projects/news-aggregator/src/notifications/hub.ts
git commit -m "feat(news): hourly ingest scheduler with 8-way concurrency"
```

---

### Task 11: Article enrichment (OG image, canonical, video extraction)

**Files:**
- Create: `projects/news-aggregator/src/ingest/enrichment.ts`
- Create: `projects/news-aggregator/tests/unit/enrichment.test.ts`
- Create: `projects/news-aggregator/tests/fixtures/html/sample-article.html`

- [ ] **Step 11.1: Install cheerio**

```bash
cd projects/news-aggregator && npm install cheerio@^1.0.0
```

- [ ] **Step 11.2: Tests**

```typescript
import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { extractMetadata } from '../../src/ingest/enrichment.js'

describe('extractMetadata', () => {
  it('extracts OG image, canonical, author, videos', async () => {
    const html = await readFile('tests/fixtures/html/sample-article.html', 'utf8')
    const meta = extractMetadata(html, 'https://example.com/original')
    expect(meta.ogImage).toBeTruthy()
    expect(meta.canonicalUrl).toMatch(/^https?:/)
    expect(meta.videoUrls).toContain('https://www.youtube.com/watch?v=abc123')
  })
  it('returns empty metadata for garbage', () => {
    const meta = extractMetadata('<not html>', 'https://example.com')
    expect(meta.ogImage).toBeNull()
    expect(meta.videoUrls).toEqual([])
  })
})
```

The fixture HTML should include `<meta property="og:image" content="...">`, `<link rel="canonical" href="...">`, an author byline, and a YouTube iframe embed.

- [ ] **Step 11.3: Implement**

```typescript
import * as cheerio from 'cheerio'

export interface ArticleMetadata {
  ogImage: string | null
  canonicalUrl: string
  author: string | null
  videoUrls: string[]
  publishedAt: Date | null
}

const VIDEO_PATTERNS = [
  /youtube\.com\/watch\?v=[\w-]+/g,
  /youtu\.be\/[\w-]+/g,
  /vimeo\.com\/\d+/g,
  /twitter\.com\/\w+\/status\/\d+/g,
  /x\.com\/\w+\/status\/\d+/g,
]

export function extractMetadata(html: string, fallbackUrl: string): ArticleMetadata {
  try {
    const $ = cheerio.load(html)
    const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null
    const canonical = $('link[rel="canonical"]').attr('href') || fallbackUrl
    const author = $('meta[name="author"]').attr('content') || $('meta[property="article:author"]').attr('content') || null
    const publishedRaw = $('meta[property="article:published_time"]').attr('content') || $('meta[name="date"]').attr('content')
    const publishedAt = publishedRaw ? new Date(publishedRaw) : null
    const videoUrls: Set<string> = new Set()
    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src') || ''
      for (const pattern of VIDEO_PATTERNS) {
        const match = src.match(pattern)
        if (match) videoUrls.add('https://' + match[0].replace(/^https?:\/\//, ''))
      }
    })
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      for (const pattern of VIDEO_PATTERNS) {
        const match = href.match(pattern)
        if (match) videoUrls.add('https://' + match[0].replace(/^https?:\/\//, ''))
      }
    })
    return { ogImage, canonicalUrl: canonical, author, videoUrls: [...videoUrls], publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null }
  } catch {
    return { ogImage: null, canonicalUrl: fallbackUrl, author: null, videoUrls: [], publishedAt: null }
  }
}

export async function fetchAndEnrich(articleUrl: string): Promise<ArticleMetadata> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const resp = await fetch(articleUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NBI Hub News Aggregator (nbihub@nbi-consulting.com)' },
    })
    if (!resp.ok) throw new Error(`enrichment_http_${resp.status}`)
    const html = await resp.text()
    return extractMetadata(html, articleUrl)
  } finally { clearTimeout(timer) }
}
```

- [ ] **Step 11.4: Wire enrichment into the ingest scheduler**

After the dedup insert in `scheduler.ts`, for each new article run enrichment asynchronously (don't block the poll). Use a bounded queue (`p-limit` or manual) with concurrency 4. Update the article row with enriched fields. Skip enrichment if the RSS item already includes OG image and author (some feeds do).

Add to `scheduler.ts`:

```typescript
import pLimit from 'p-limit'
import { fetchAndEnrich } from './enrichment.js'

const enrichmentLimit = pLimit(4)

async function enrichNewArticles(newArticleIds: string[], log: any) {
  await Promise.allSettled(newArticleIds.map(id => enrichmentLimit(async () => {
    const [row] = await db.select().from(schema.articles).where(eq(schema.articles.id, id)).limit(1)
    if (!row) return
    try {
      const meta = await fetchAndEnrich(row.url)
      await db.update(schema.articles).set({
        ogImageUrl: meta.ogImage ?? row.ogImageUrl,
        author: meta.author ?? row.author,
        embeddedVideoUrls: meta.videoUrls.length ? meta.videoUrls : null,
        publishedAt: meta.publishedAt ?? row.publishedAt,
      }).where(eq(schema.articles.id, id))
    } catch (err: any) {
      log.warn({ articleId: id, err: err.message }, 'enrichment failed')
    }
  })))
}
```

Modify `insertArticlesDedup` to return the IDs of newly inserted rows (not just count), then call `enrichNewArticles` from the scheduler after each source's ingest completes.

```bash
cd projects/news-aggregator && npm install p-limit@^6.0.0
```

- [ ] **Step 11.5: Run tests**

```bash
npm test -- enrichment
# Expected: PASS
```

- [ ] **Step 11.6: Commit**

```bash
git add projects/news-aggregator/src/ingest projects/news-aggregator/tests projects/news-aggregator/package.json
git commit -m "feat(news): article enrichment with OG/canonical/video extraction"
```

---

### Task 12: Media cache with Sharp variants (TDD)

**Files:**
- Create: `projects/news-aggregator/src/media/cache.ts`
- Create: `projects/news-aggregator/src/media/variants.ts`
- Create: `projects/news-aggregator/tests/unit/variants.test.ts`

- [ ] **Step 12.1: Implement variants.ts**

```typescript
import sharp from 'sharp'

export type VariantName = 'thumb' | 'card' | 'hero'

const VARIANTS: Record<VariantName, { width: number; quality: number }> = {
  thumb: { width: 400, quality: 75 },
  card: { width: 800, quality: 80 },
  hero: { width: 1600, quality: 85 },
}

export async function buildVariant(sourceBuffer: Buffer, variant: VariantName): Promise<Buffer> {
  const spec = VARIANTS[variant]
  return sharp(sourceBuffer)
    .resize({ width: spec.width, withoutEnlargement: true })
    .webp({ quality: spec.quality })
    .toBuffer()
}
```

- [ ] **Step 12.2: Implement cache.ts**

```typescript
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { buildVariant, type VariantName } from './variants.js'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { loadConfig } from '../config.js'

const config = loadConfig()

function variantPath(hash: string, variant: VariantName): string {
  const prefix = hash.slice(0, 2)
  return join(config.MEDIA_STORAGE_PATH, prefix, `${hash}.${variant}.webp`)
}

export async function cacheOgImage(sourceUrl: string): Promise<string | null> {
  const existing = await db.select().from(schema.mediaAssets).where(eq(schema.mediaAssets.sourceUrl, sourceUrl)).limit(1)
  if (existing[0]) return existing[0].hash
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const resp = await fetch(sourceUrl, { signal: controller.signal })
    if (!resp.ok) return null
    const len = Number(resp.headers.get('content-length') || '0')
    if (len > 2 * 1024 * 1024) return null   // 2MB cap per spec §15
    const buf = Buffer.from(await resp.arrayBuffer())
    const hash = createHash('sha256').update(buf).digest('hex')
    const meta = await sharp(buf).metadata()
    await db.insert(schema.mediaAssets).values({
      sourceUrl, hash,
      mimeType: `image/${meta.format ?? 'unknown'}`,
      bytes: buf.length, width: meta.width ?? null, height: meta.height ?? null,
    }).onConflictDoNothing()
    const prefix = hash.slice(0, 2)
    await mkdir(join(config.MEDIA_STORAGE_PATH, prefix), { recursive: true })
    for (const v of ['thumb', 'card', 'hero'] as VariantName[]) {
      const variantBuf = await buildVariant(buf, v)
      await writeFile(variantPath(hash, v), variantBuf)
    }
    return hash
  } catch { return null }
  finally { clearTimeout(timer) }
}

export async function getVariantPath(hash: string, variant: VariantName): Promise<string | null> {
  const path = variantPath(hash, variant)
  try { await stat(path); return path } catch { return null }
}
```

- [ ] **Step 12.3: Tests**

```typescript
import { describe, it, expect } from 'vitest'
import { buildVariant } from '../../src/media/variants.js'
import sharp from 'sharp'

describe('buildVariant', () => {
  it('produces webp at target width', async () => {
    const source = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: '#ff0000' },
    }).jpeg().toBuffer()
    const out = await buildVariant(source, 'card')
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(800)
  })
})
```

Run: `npm test -- variants`. Expected: PASS.

- [ ] **Step 12.4: Wire cacheOgImage into enrichment**

In `enrichment.ts` `fetchAndEnrich`, after extracting `ogImage`, call `cacheOgImage(ogImage)` and store the returned hash on `articles.og_image_hash`.

- [ ] **Step 12.5: Commit**

```bash
git add projects/news-aggregator/src/media projects/news-aggregator/tests/unit/variants.test.ts
git commit -m "feat(news): media cache with sharp variants"
```

---

### Task 13: Media serving endpoint + cron wiring for hourly ingest

**Files:**
- Create: `projects/news-aggregator/src/routes/media.ts`
- Create: `projects/news-aggregator/src/scheduler/cron.ts`
- Modify: `projects/news-aggregator/src/index.ts`

- [ ] **Step 13.1: Media route**

```typescript
import type { FastifyInstance } from 'fastify'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { getVariantPath } from '../media/cache.js'
import type { VariantName } from '../media/variants.js'

export async function mediaRoutes(app: FastifyInstance) {
  app.get<{ Params: { hash: string; variant: string } }>('/media/:hash/:variant', async (req, reply) => {
    const { hash, variant } = req.params
    if (!['thumb', 'card', 'hero'].includes(variant)) return reply.code(404).send()
    const path = await getVariantPath(hash, variant as VariantName)
    if (!path) return reply.code(404).send()
    const s = await stat(path)
    reply.header('Cache-Control', 'public, max-age=86400, immutable')
    reply.header('Content-Type', 'image/webp')
    reply.header('Content-Length', s.size)
    return reply.send(createReadStream(path))
  })
}
```

- [ ] **Step 13.2: Cron scheduler**

```typescript
import cron from 'node-cron'
import { runIngestOnce } from '../ingest/scheduler.js'

export function startCronJobs(log: any) {
  cron.schedule('0 * * * *', async () => {
    log.info('hourly ingest start')
    try { await runIngestOnce(log); log.info('hourly ingest done') }
    catch (err) { log.error({ err }, 'hourly ingest failed') }
  }, { timezone: 'Etc/UTC' })

  // Weekly and monthly jobs added in Tasks 23-25.

  log.info('cron jobs scheduled: hourly ingest')
}
```

- [ ] **Step 13.3: Wire into index.ts**

```typescript
import { mediaRoutes } from './routes/media.js'
import { startCronJobs } from './scheduler/cron.js'
// ...
await app.register(mediaRoutes)
// ...
app.listen({ ... }, (err, address) => {
  if (err) { app.log.error(err); process.exit(1) }
  app.log.info(`nbi-news listening on ${address}`)
  startCronJobs(app.log)
})
```

- [ ] **Step 13.4: Smoke test end-to-end**

```bash
cd projects/news-aggregator && npm run build
pm2 restart nbi-news --update-env
# Trigger one manual run (tsx one-liner) to avoid waiting for the cron
npx tsx -e "import('./src/ingest/scheduler.js').then(m => m.runIngestOnce(console))"
psql $NEWS_DB_URL -c "SELECT count(*) FROM news.articles"
# Expected: >0 after feeds ingest
psql $NEWS_DB_URL -c "SELECT count(*) FROM news.media_assets"
# Expected: >0 after enrichment runs
```

- [ ] **Step 13.5: Verify media serving**

```bash
HASH=$(psql -t -A $NEWS_DB_URL -c "SELECT hash FROM news.media_assets LIMIT 1")
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8890/media/$HASH/card"
# Expected: 200
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8888/api/news/media/$HASH/card"
# Expected: 200 (via dashboard proxy)
```

- [ ] **Step 13.6: Commit**

```bash
git add projects/news-aggregator/src/routes/media.ts projects/news-aggregator/src/scheduler/cron.ts projects/news-aggregator/src/index.ts
git commit -m "feat(news): media serving route + hourly ingest cron"
```

**M1 complete.** Ingest is running hourly, articles are flowing into DB with enrichment, OG images cached in three variants, media served via dashboard proxy. No LLM yet, no UI.

---

## Milestone M2: LLM pipeline and orchestration

### Task 14: Claude Agent SDK wrapper with Max Pro + API key failover

Implements spec §9.4 in full: try Max Pro, on auth failure promote `ANTHROPIC_API_KEY_FAILOVER`, retry, notify; on double failure raise urgent notification.

**Files:**
- Create: `projects/news-aggregator/src/llm/client.ts`
- Create: `projects/news-aggregator/tests/unit/client-failover.test.ts`

- [ ] **Step 14.1: Client wrapper**

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk'
import { db, schema } from '../db/index.js'
import { notifyAuthFailover, notifyGenerationFailed } from '../notifications/hub.js'

export type LlmAuthMode = 'max_pro' | 'api_key'

let failoverLatched = false   // sticky for the duration of the process, reset per boot

function isAuthError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err)
  return /401|403|unauthori[sz]ed|auth/i.test(msg)
}

export interface CallOptions {
  runType: 'clustering' | 'curation' | 'summarisation' | 'hero_selection' | 'monthly_synthesis' | 'merge_split'
  digestId?: string
  monthlySummaryId?: string
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  period?: string   // for failure notifications, e.g. "week of 2026-04-14"
}

export interface CallResult {
  text: string
  inputTokens: number
  outputTokens: number
  authMode: LlmAuthMode
  failoverOccurred: boolean
}

export async function callClaude(opts: CallOptions): Promise<CallResult> {
  const run = await db.insert(schema.generationRuns).values({
    runType: opts.runType,
    digestId: opts.digestId ?? null,
    monthlySummaryId: opts.monthlySummaryId ?? null,
    status: 'running',
    llmAuthMode: failoverLatched ? 'api_key' : 'max_pro',
  }).returning({ id: schema.generationRuns.id })
  const runId = run[0].id

  const attempt = async (): Promise<CallResult> => {
    const messages: any[] = []
    for await (const m of query({
      prompt: opts.userMessage,
      options: {
        systemPrompt: opts.systemPrompt,
        model: 'claude-sonnet-4-6',
        maxTurns: 1,
        maxTokens: opts.maxTokens ?? 4096,
        disallowedTools: ['Bash', 'WebFetch', 'WebSearch'],  // no side-effects
      },
    })) {
      messages.push(m)
    }
    // Last assistant message block has the text output.
    const assistant = messages.reverse().find(m => m.type === 'assistant')
    const textBlock = assistant?.message?.content?.find((b: any) => b.type === 'text')
    const text = textBlock?.text ?? ''
    const usage = assistant?.message?.usage ?? { input_tokens: 0, output_tokens: 0 }
    return {
      text,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      authMode: failoverLatched ? 'api_key' : 'max_pro',
      failoverOccurred: false,
    }
  }

  try {
    const result = await attempt()
    await db.update(schema.generationRuns).set({
      endedAt: new Date(),
      status: 'completed',
      inputTokenCount: result.inputTokens,
      outputTokenCount: result.outputTokens,
      llmAuthMode: result.authMode,
    }).where(sql`id = ${runId}`)
    return result
  } catch (err) {
    if (isAuthError(err) && !failoverLatched && process.env.ANTHROPIC_API_KEY_FAILOVER) {
      // Promote failover key
      process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY_FAILOVER
      failoverLatched = true
      await notifyAuthFailover(opts.runType)
      try {
        const result = await attempt()
        await db.update(schema.generationRuns).set({
          endedAt: new Date(),
          status: 'completed',
          inputTokenCount: result.inputTokens,
          outputTokenCount: result.outputTokens,
          llmAuthMode: 'api_key',
          failoverOccurred: true,
        }).where(sql`id = ${runId}`)
        return { ...result, authMode: 'api_key', failoverOccurred: true }
      } catch (err2) {
        await db.update(schema.generationRuns).set({
          endedAt: new Date(),
          status: 'failed',
          errorMessage: String((err2 as any)?.message ?? err2).slice(0, 500),
          failoverOccurred: true,
        }).where(sql`id = ${runId}`)
        if (opts.period) await notifyGenerationFailed(opts.runType, opts.period)
        throw err2
      }
    }
    await db.update(schema.generationRuns).set({
      endedAt: new Date(),
      status: 'failed',
      errorMessage: String((err as any)?.message ?? err).slice(0, 500),
    }).where(sql`id = ${runId}`)
    if (opts.period) await notifyGenerationFailed(opts.runType, opts.period)
    throw err
  }
}

// Pre-flight: verify auth works without doing real work. Called at startup and 10min before batches.
export async function healthcheckAuth(): Promise<{ ok: boolean; mode: LlmAuthMode; error?: string }> {
  try {
    const _ = await callClaude({
      runType: 'clustering',  // reuse type for audit, small input
      systemPrompt: 'Reply with a single word: ok',
      userMessage: 'ok',
      maxTokens: 5,
    })
    return { ok: true, mode: failoverLatched ? 'api_key' : 'max_pro' }
  } catch (err: any) {
    return { ok: false, mode: failoverLatched ? 'api_key' : 'max_pro', error: err.message }
  }
}
```

Note on `disallowedTools`: the pipeline uses the model as a pure text-in-text-out classifier/summariser. Disabling tools prevents any accidental file/web access from a malformed prompt.

- [ ] **Step 14.2: Failover test (with SDK mocked)**

Use `vi.mock('@anthropic-ai/claude-agent-sdk')` to simulate a 401 on first call and success on second. Assert that `notifyAuthFailover` was called and the returned `authMode` is `'api_key'`.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@anthropic-ai/claude-agent-sdk', () => {
  let attempts = 0
  return {
    query: async function* (_args: any) {
      attempts++
      if (attempts === 1) throw new Error('401 Unauthorized')
      yield { type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 5, output_tokens: 1 } } }
    },
  }
})

vi.mock('../../src/notifications/hub.js', () => ({
  notifyAuthFailover: vi.fn().mockResolvedValue(undefined),
  notifyGenerationFailed: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => { process.env.ANTHROPIC_API_KEY_FAILOVER = 'sk-test-failover' })

describe('callClaude failover', () => {
  it('promotes failover key on auth error', async () => {
    const { callClaude } = await import('../../src/llm/client.js')
    const { notifyAuthFailover } = await import('../../src/notifications/hub.js')
    const result = await callClaude({
      runType: 'clustering',
      systemPrompt: 'sys',
      userMessage: 'user',
      period: 'test',
    })
    expect(result.authMode).toBe('api_key')
    expect(result.failoverOccurred).toBe(true)
    expect(notifyAuthFailover).toHaveBeenCalled()
  })
})
```

Run: `npm test -- client-failover`. Expected: PASS.

- [ ] **Step 14.3: Pre-flight hook at service startup**

In `src/index.ts`, after `startCronJobs`:

```typescript
import { healthcheckAuth } from './llm/client.js'
const health = await healthcheckAuth()
app.log.info({ ok: health.ok, mode: health.mode, error: health.error }, 'LLM auth pre-flight')
if (!health.ok) app.log.warn('LLM auth pre-flight failed; subsequent runs may fail')
```

- [ ] **Step 14.4: Install @anthropic-ai/claude-agent-sdk**

```bash
cd projects/news-aggregator && npm install @anthropic-ai/claude-agent-sdk
```

- [ ] **Step 14.5: Commit**

```bash
git add projects/news-aggregator/src/llm/client.ts projects/news-aggregator/tests/unit/client-failover.test.ts projects/news-aggregator/src/index.ts projects/news-aggregator/package.json
git commit -m "feat(news): Claude Agent SDK wrapper with Max Pro + API key failover"
```

---

### Task 15: Prompt loader with version history

**Files:**
- Create: `projects/news-aggregator/src/llm/prompts.ts`

- [ ] **Step 15.1: Implement**

```typescript
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

export type PromptKey = 'clustering' | 'curation' | 'summarisation' | 'hero_selection' | 'monthly_synthesis'

export interface ActivePrompt {
  id: string
  key: PromptKey
  version: number
  body: string
  fewShotExamples: unknown[] | null
}

export async function loadActivePrompt(key: PromptKey): Promise<ActivePrompt> {
  const rows = await db.select().from(schema.prompts)
    .where(and(eq(schema.prompts.promptKey, key), eq(schema.prompts.isActive, true)))
    .limit(1)
  if (!rows[0]) throw new Error(`no active prompt for key: ${key}`)
  const r = rows[0]
  return { id: r.id, key, version: r.version, body: r.body, fewShotExamples: (r.fewShotExamples as unknown[]) ?? null }
}

export async function savePromptVersion(key: PromptKey, body: string, fewShotExamples: unknown[] | null, createdBy: string | null): Promise<ActivePrompt> {
  const latest = await db.select().from(schema.prompts)
    .where(eq(schema.prompts.promptKey, key))
    .orderBy(desc(schema.prompts.version))
    .limit(1)
  const nextVersion = (latest[0]?.version ?? 0) + 1
  await db.update(schema.prompts).set({ isActive: false }).where(eq(schema.prompts.promptKey, key))
  const inserted = await db.insert(schema.prompts).values({
    promptKey: key, version: nextVersion, body, fewShotExamples: fewShotExamples as any, isActive: true, createdBy,
  }).returning()
  return {
    id: inserted[0].id, key, version: nextVersion,
    body, fewShotExamples,
  }
}
```

- [ ] **Step 15.2: Commit**

```bash
git add projects/news-aggregator/src/llm/prompts.ts
git commit -m "feat(news): prompt loader with version history"
```

---

### Task 16: Seed initial prompts

**Files:**
- Create: `projects/news-aggregator/src/llm/seed-prompts.ts`
- Modify: `projects/news-aggregator/src/index.ts`

- [ ] **Step 16.1: Prompt bodies**

Write the initial v1 prompts for each stage. These are starting points; Glen iterates via the admin UI after seeing first-run output.

Clustering prompt (spec §9.1):
```
You are an analyst for a games-industry news digest.

You will receive a list of articles, each with an ID, source outlet, title, and short summary. Your task is to identify which articles are covering the same underlying story and group them together.

For each article extract the key entities mentioned: studios, games, people (named executives or devs), deals (acquisitions, funding rounds, publisher contracts), and dollar figures. Articles sharing entity clusters within the digest window are the same story.

Return JSON only, shape:
{
  "clusters": [
    {
      "article_ids": ["id-1", "id-2"],
      "entities": { "studios": [], "games": [], "people": [], "deals": [], "figures": [] }
    }
  ]
}

No prose outside the JSON.
```

Curation prompt:
```
You are the editor of a weekly games-industry digest for game developers and industry consultants.

You will receive a list of story clusters from the past week, each with representative article titles, source outlets, and extracted entities. Your task is to:

1. Select the ~25-30 most significant clusters.
2. Assign each selected cluster to one of four canonical categories: "studios", "games", "shifts", "strategy".
3. If at least 4 selected clusters group naturally under a non-canonical theme (e.g. mobile, asia, esports, publishing, tools, adaptations, regulation), propose that as a dynamic 5th category and return its label.
4. Rank stories within each category by significance.

Return JSON only, shape:
{
  "selected": [
    { "cluster_index": 0, "category": "studios", "rank": 1 }
  ],
  "dynamic_category_label": "mobile" | null
}
```

Summarisation prompt (with 3 few-shot examples placeholders):
```
Write a 2-3 sentence news summary of the following story cluster in British English, neutral tone. Cite the primary source inline.

Articles:
{articles_json}

Return JSON:
{ "headline": "...", "summary": "...", "has_video": true|false, "primary_article_id": "..." }
```

Hero selection:
```
From the following curated stories of the week, pick the single most significant one for the hero slot. Consider scale of impact, exclusivity of coverage, and strategic importance to the games industry.

Stories:
{stories_json}

Return JSON: { "hero_story_id": "..." }
```

Monthly synthesis:
```
You are writing the "State of the Industry" editorial for the monthly digest. You will receive the month's four weekly digests, each with their curated stories.

Write a 600-900 word essay in British English identifying the month's major movers and shakers, strategic shifts, and themes across studios, games, and the industry as a whole. Cite specific stories by referencing their headlines.

Return JSON:
{ "title": "...", "body_markdown": "...", "featured_story_ids": ["id-1", "id-2", "id-3"] }
```

- [ ] **Step 16.2: seed-prompts.ts**

```typescript
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

const PROMPTS: Array<{ key: string; body: string; fewShot: unknown[] | null }> = [
  { key: 'clustering', body: `...`, fewShot: null },
  { key: 'curation', body: `...`, fewShot: null },
  { key: 'summarisation', body: `...`, fewShot: [
    // 3 example articles -> example summaries (Glen approves before first run)
  ]},
  { key: 'hero_selection', body: `...`, fewShot: null },
  { key: 'monthly_synthesis', body: `...`, fewShot: null },
]

export async function seedPromptsIfEmpty(): Promise<number> {
  let inserted = 0
  for (const p of PROMPTS) {
    const existing = await db.select().from(schema.prompts).where(eq(schema.prompts.promptKey, p.key)).limit(1)
    if (existing[0]) continue
    await db.insert(schema.prompts).values({
      promptKey: p.key, version: 1, body: p.body, fewShotExamples: p.fewShot as any, isActive: true, createdBy: null,
    })
    inserted++
  }
  return inserted
}
```

Paste the actual prompt bodies from 16.1 inline (don't leave placeholders).

- [ ] **Step 16.3: Wire into startup**

In `src/index.ts` after `seedSourcesIfEmpty`:

```typescript
import { seedPromptsIfEmpty } from './llm/seed-prompts.js'
const seededPrompts = await seedPromptsIfEmpty()
if (seededPrompts > 0) app.log.info(`Seeded ${seededPrompts} prompts`)
```

- [ ] **Step 16.4: Commit**

```bash
git add projects/news-aggregator/src/llm/seed-prompts.ts projects/news-aggregator/src/index.ts
git commit -m "feat(news): seed v1 prompts for all pipeline stages"
```

---

### Task 17: Clustering stage

**Files:**
- Create: `projects/news-aggregator/src/llm/clustering.ts`
- Create: `projects/news-aggregator/tests/unit/clustering.test.ts`

- [ ] **Step 17.1: Implement**

```typescript
import { sql } from 'drizzle-orm'
import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'
import { db, schema } from '../db/index.js'

export interface ClusterResult {
  article_ids: string[]
  entities: { studios: string[]; games: string[]; people: string[]; deals: string[]; figures: string[] }
}

export async function clusterArticles(articleIds: string[], digestId: string): Promise<ClusterResult[]> {
  if (articleIds.length === 0) return []
  const articles = await db.execute(sql`
    SELECT a.id, s.name AS source, a.title, a.summary
    FROM news.articles a JOIN news.sources s ON s.id = a.source_id
    WHERE a.id = ANY(${articleIds}::uuid[])
  `)
  const prompt = await loadActivePrompt('clustering')
  const userMessage = `Articles:\n${JSON.stringify(articles.rows, null, 2)}`
  const result = await callClaude({
    runType: 'clustering',
    digestId,
    systemPrompt: prompt.body,
    userMessage,
    maxTokens: 8192,
  })
  const parsed = safeParseJson(result.text)
  return Array.isArray(parsed?.clusters) ? parsed.clusters : []
}

function safeParseJson(text: string): any {
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch { return null }
}
```

- [ ] **Step 17.2: Test (LLM mocked)**

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/llm/client.js', () => ({
  callClaude: vi.fn(async () => ({
    text: '{"clusters":[{"article_ids":["a","b"],"entities":{"studios":["Xbox"],"games":[],"people":[],"deals":[],"figures":[]}}]}',
    inputTokens: 100, outputTokens: 50, authMode: 'max_pro', failoverOccurred: false,
  })),
}))
vi.mock('../../src/llm/prompts.js', () => ({
  loadActivePrompt: vi.fn(async () => ({ id: '1', key: 'clustering', version: 1, body: 'sys', fewShotExamples: null })),
}))

describe('clusterArticles', () => {
  it('parses LLM JSON output', async () => {
    const { clusterArticles } = await import('../../src/llm/clustering.js')
    const result = await clusterArticles(['article-id-a', 'article-id-b'], 'digest-id')
    expect(result).toHaveLength(1)
    expect(result[0].article_ids).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 17.3: Commit**

```bash
git add projects/news-aggregator/src/llm/clustering.ts projects/news-aggregator/tests/unit/clustering.test.ts
git commit -m "feat(news): clustering stage via Claude Agent SDK"
```

---

### Task 18: Curation stage with dynamic 5th category

**Files:**
- Create: `projects/news-aggregator/src/llm/curation.ts`
- Create: `projects/news-aggregator/tests/unit/curation.test.ts`

- [ ] **Step 18.1: Implement**

```typescript
import { sql } from 'drizzle-orm'
import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'
import { db, schema } from '../db/index.js'
import type { ClusterResult } from './clustering.js'

export interface CurationAssignment {
  cluster_index: number
  category: 'studios' | 'games' | 'shifts' | 'strategy' | string
  rank: number
}

export interface CurationResult {
  selected: CurationAssignment[]
  dynamic_category_label: string | null
}

const CANONICAL = new Set(['studios', 'games', 'shifts', 'strategy'])
const DYNAMIC_MIN_CLUSTERS = 4

export async function curateClusters(clusters: ClusterResult[], digestId: string, sources: Map<string, { priorityWeight: number }>): Promise<CurationResult> {
  const enriched = clusters.map((c, idx) => ({
    cluster_index: idx,
    article_count: c.article_ids.length,
    entities: c.entities,
    weight: c.article_ids.reduce((sum, aid) => sum + (sources.get(aid)?.priorityWeight ?? 1), 0),
  }))
  const prompt = await loadActivePrompt('curation')
  const result = await callClaude({
    runType: 'curation',
    digestId,
    systemPrompt: prompt.body,
    userMessage: `Clusters:\n${JSON.stringify(enriched, null, 2)}`,
    maxTokens: 8192,
  })
  const parsed = safeParseJson(result.text) as CurationResult | null
  if (!parsed) return { selected: [], dynamic_category_label: null }
  const countsByLabel = new Map<string, number>()
  for (const s of parsed.selected) {
    if (!CANONICAL.has(s.category)) countsByLabel.set(s.category, (countsByLabel.get(s.category) ?? 0) + 1)
  }
  let dynamicLabel: string | null = null
  for (const [label, count] of countsByLabel) if (count >= DYNAMIC_MIN_CLUSTERS) { dynamicLabel = label; break }
  return { selected: parsed.selected, dynamic_category_label: dynamicLabel }
}

function safeParseJson(text: string): any {
  try { const m = text.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null } catch { return null }
}
```

The `DYNAMIC_MIN_CLUSTERS` threshold enforces the spec rule (dynamic 5th appears only when at least 4 stories cluster under a non-canonical theme).

- [ ] **Step 18.2: Test**

Test the dynamic 5th threshold: given 3 non-canonical stories under the same label, `dynamic_category_label` is `null`. Given 4, it's set.

- [ ] **Step 18.3: Commit**

```bash
git add projects/news-aggregator/src/llm/curation.ts projects/news-aggregator/tests/unit/curation.test.ts
git commit -m "feat(news): curation with dynamic 5th category"
```

---

### Task 19: Summarisation stage

**Files:**
- Create: `projects/news-aggregator/src/llm/summarisation.ts`

- [ ] **Step 19.1: Implement**

```typescript
import { sql } from 'drizzle-orm'
import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'
import { db, schema } from '../db/index.js'

export interface StorySummary {
  headline: string
  summary: string
  has_video: boolean
  primary_article_id: string
}

export async function summariseStory(storyId: string, articleIds: string[], digestId: string): Promise<StorySummary> {
  const articles = await db.execute(sql`
    SELECT a.id, s.name AS source, a.title, a.summary, a.url, a.embedded_video_urls
    FROM news.articles a JOIN news.sources s ON s.id = a.source_id
    WHERE a.id = ANY(${articleIds}::uuid[])
  `)
  const prompt = await loadActivePrompt('summarisation')
  const userMessage = prompt.body.replace('{articles_json}', JSON.stringify(articles.rows, null, 2))
  const result = await callClaude({
    runType: 'summarisation',
    digestId,
    systemPrompt: 'You are a games-industry editor writing summaries for a weekly digest.',
    userMessage,
    maxTokens: 1024,
  })
  const parsed = safeParseJson(result.text) as StorySummary
  return parsed ?? {
    headline: '(summary failed)',
    summary: 'Summary generation failed for this story.',
    has_video: false,
    primary_article_id: articleIds[0],
  }
}

function safeParseJson(text: string): any {
  try { const m = text.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null } catch { return null }
}
```

- [ ] **Step 19.2: Commit**

```bash
git add projects/news-aggregator/src/llm/summarisation.ts
git commit -m "feat(news): story summarisation stage"
```

---

### Task 20: Hero selection

**Files:**
- Create: `projects/news-aggregator/src/llm/hero-selection.ts`

- [ ] **Step 20.1: Implement**

```typescript
import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'

export async function selectHeroStory(stories: Array<{ id: string; headline: string; summary: string; category: string }>, digestId: string): Promise<string | null> {
  if (stories.length === 0) return null
  const prompt = await loadActivePrompt('hero_selection')
  const userMessage = prompt.body.replace('{stories_json}', JSON.stringify(stories, null, 2))
  const result = await callClaude({
    runType: 'hero_selection',
    digestId,
    systemPrompt: 'You select the most significant story of the week for the hero slot.',
    userMessage,
    maxTokens: 256,
  })
  const parsed = safeParseJson(result.text)
  const id = parsed?.hero_story_id
  return typeof id === 'string' && stories.some(s => s.id === id) ? id : stories[0].id
}

function safeParseJson(text: string): any {
  try { const m = text.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null } catch { return null }
}
```

- [ ] **Step 20.2: Commit**

```bash
git add projects/news-aggregator/src/llm/hero-selection.ts
git commit -m "feat(news): hero story selection"
```

---

### Task 21: Monthly synthesis

**Files:**
- Create: `projects/news-aggregator/src/llm/monthly-synthesis.ts`

- [ ] **Step 21.1: Implement**

```typescript
import { sql } from 'drizzle-orm'
import { callClaude } from './client.js'
import { loadActivePrompt } from './prompts.js'
import { db, schema } from '../db/index.js'

export interface MonthlySynthesisResult {
  title: string
  body_markdown: string
  featured_story_ids: string[]
}

export async function synthesiseMonth(monthDate: Date, monthlySummaryId: string): Promise<MonthlySynthesisResult> {
  const year = monthDate.getUTCFullYear()
  const month = monthDate.getUTCMonth() + 1
  const digests = await db.execute(sql`
    SELECT d.id, d.period_start, d.period_end,
      json_agg(json_build_object('id', s.id, 'headline', s.headline, 'category', s.category, 'rank', s.rank) ORDER BY s.rank) AS stories
    FROM news.digests d
    LEFT JOIN news.stories s ON s.digest_id = d.id
    WHERE d.status = 'published'
      AND EXTRACT(YEAR FROM d.period_start) = ${year}
      AND EXTRACT(MONTH FROM d.period_start) = ${month}
    GROUP BY d.id ORDER BY d.period_start
  `)
  const prompt = await loadActivePrompt('monthly_synthesis')
  const result = await callClaude({
    runType: 'monthly_synthesis',
    monthlySummaryId,
    systemPrompt: prompt.body,
    userMessage: `Weekly digests for ${year}-${String(month).padStart(2,'0')}:\n${JSON.stringify(digests.rows, null, 2)}`,
    maxTokens: 4096,
    period: `${year}-${String(month).padStart(2,'0')}`,
  })
  const parsed = safeParseJson(result.text) as MonthlySynthesisResult
  return parsed ?? {
    title: `${monthDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}: (synthesis failed)`,
    body_markdown: 'Synthesis generation failed for this month.',
    featured_story_ids: [],
  }
}

function safeParseJson(text: string): any {
  try { const m = text.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null } catch { return null }
}
```

- [ ] **Step 21.2: Commit**

```bash
git add projects/news-aggregator/src/llm/monthly-synthesis.ts
git commit -m "feat(news): monthly synthesis stage"
```

---

### Task 22: Date-of-month calculation for monthly synthesis (TDD)

Implements the `min(30, lastDayOfMonth)` rule.

**Files:**
- Create: `projects/news-aggregator/src/utils/dates.ts`
- Create: `projects/news-aggregator/tests/unit/dates.test.ts`

- [ ] **Step 22.1: Tests**

```typescript
import { describe, it, expect } from 'vitest'
import { monthlySynthesisDay, nextMonthlySynthesisDate, isMonthlySynthesisDay } from '../../src/utils/dates.js'

describe('monthlySynthesisDay', () => {
  it('returns 30 for 31-day months', () => {
    expect(monthlySynthesisDay(2026, 1)).toBe(30)   // Jan
    expect(monthlySynthesisDay(2026, 3)).toBe(30)   // Mar
  })
  it('returns 30 for 30-day months', () => {
    expect(monthlySynthesisDay(2026, 4)).toBe(30)   // Apr
  })
  it('returns 28 for February non-leap', () => {
    expect(monthlySynthesisDay(2026, 2)).toBe(28)
  })
  it('returns 29 for February leap year', () => {
    expect(monthlySynthesisDay(2024, 2)).toBe(29)
    expect(monthlySynthesisDay(2028, 2)).toBe(29)
  })
  it('returns 28 for century non-leap (1900)', () => {
    expect(monthlySynthesisDay(1900, 2)).toBe(28)
  })
  it('returns 29 for century leap (2000, 2400)', () => {
    expect(monthlySynthesisDay(2000, 2)).toBe(29)
    expect(monthlySynthesisDay(2400, 2)).toBe(29)
  })
})

describe('isMonthlySynthesisDay', () => {
  it('true at 22:00 UTC on month-end', () => {
    const d = new Date(Date.UTC(2026, 1, 28, 22, 0, 0))  // Feb 28 2026 22:00
    expect(isMonthlySynthesisDay(d)).toBe(true)
  })
  it('false on other days', () => {
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 1, 27, 22, 0, 0)))).toBe(false)
  })
})
```

- [ ] **Step 22.2: Implement**

```typescript
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function lastDayOfMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29
  return DAYS_IN_MONTH[month - 1]
}

export function monthlySynthesisDay(year: number, month: number): number {
  return Math.min(30, lastDayOfMonth(year, month))
}

export function isMonthlySynthesisDay(now: Date): boolean {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const d = now.getUTCDate()
  return d === monthlySynthesisDay(y, m) && now.getUTCHours() === 22 && now.getUTCMinutes() === 0
}

export function nextMonthlySynthesisDate(from: Date = new Date()): Date {
  let y = from.getUTCFullYear()
  let m = from.getUTCMonth() + 1
  const todayDay = monthlySynthesisDay(y, m)
  const todayCandidate = new Date(Date.UTC(y, m - 1, todayDay, 22, 0, 0))
  if (from < todayCandidate) return todayCandidate
  m++; if (m > 12) { m = 1; y++ }
  return new Date(Date.UTC(y, m - 1, monthlySynthesisDay(y, m), 22, 0, 0))
}
```

Run: `npm test -- dates`. Expected: PASS.

- [ ] **Step 22.3: Commit**

```bash
git add projects/news-aggregator/src/utils/dates.ts projects/news-aggregator/tests/unit/dates.test.ts
git commit -m "feat(news): monthly synthesis day calculation with leap year handling"
```

---

### Task 23: Weekly digest orchestrator

**Files:**
- Create: `projects/news-aggregator/src/pipeline/weekly.ts`

- [ ] **Step 23.1: Implement**

```typescript
import { sql, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { clusterArticles } from '../llm/clustering.js'
import { curateClusters } from '../llm/curation.js'
import { summariseStory } from '../llm/summarisation.js'
import { selectHeroStory } from '../llm/hero-selection.js'
import { healthcheckAuth } from '../llm/client.js'

export async function generateWeeklyDigest(periodStart: Date, periodEnd: Date, log: any): Promise<string> {
  const preflight = await healthcheckAuth()
  log.info({ authOk: preflight.ok, mode: preflight.mode }, 'weekly pre-flight')

  // Create digest shell
  const [digest] = await db.insert(schema.digests).values({
    digestType: 'weekly',
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    status: 'draft',
  }).returning({ id: schema.digests.id })

  // Fetch articles in window
  const rows = await db.execute(sql`
    SELECT id FROM news.articles
    WHERE published_at >= ${periodStart} AND published_at < ${periodEnd}
    ORDER BY published_at DESC
  `)
  const articleIds = rows.rows.map((r: any) => r.id as string)
  if (articleIds.length === 0) {
    await db.update(schema.digests).set({ status: 'draft' }).where(eq(schema.digests.id, digest.id))
    log.warn({ digestId: digest.id }, 'no articles in window; digest skipped')
    return digest.id
  }

  // Cluster
  const clusters = await clusterArticles(articleIds, digest.id)
  log.info({ clusterCount: clusters.length }, 'clustering done')

  // Need source weights for curation tie-breaks
  const sourceWeights = new Map<string, { priorityWeight: number }>()
  const srcRows = await db.execute(sql`
    SELECT a.id AS article_id, s.priority_weight
    FROM news.articles a JOIN news.sources s ON s.id = a.source_id
    WHERE a.id = ANY(${articleIds}::uuid[])
  `)
  for (const r of srcRows.rows as any[]) sourceWeights.set(r.article_id, { priorityWeight: Number(r.priority_weight) })

  // Curate
  const curation = await curateClusters(clusters, digest.id, sourceWeights)
  log.info({ selected: curation.selected.length, dynamic: curation.dynamic_category_label }, 'curation done')

  // Create story rows from selected clusters
  const storyIds: string[] = []
  const summariesByStoryId = new Map<string, string>()  // for hero selection input
  for (const s of curation.selected) {
    const cluster = clusters[s.cluster_index]
    if (!cluster) continue
    const [story] = await db.insert(schema.stories).values({
      digestId: digest.id,
      category: s.category,
      isDynamicCategory: !['studios','games','shifts','strategy'].includes(s.category),
      dynamicCategoryLabel: s.category === curation.dynamic_category_label ? curation.dynamic_category_label : null,
      rank: s.rank,
      headline: '(summarising)',
      summary: '(summarising)',
      sourceCount: cluster.article_ids.length,
      primaryEntities: cluster.entities as any,
    }).returning({ id: schema.stories.id })
    for (const aid of cluster.article_ids) {
      await db.insert(schema.storyArticles).values({ storyId: story.id, articleId: aid, isPrimarySource: false }).onConflictDoNothing()
    }
    storyIds.push(story.id)
    // Summarise
    const summary = await summariseStory(story.id, cluster.article_ids, digest.id)
    await db.update(schema.stories).set({
      headline: summary.headline,
      summary: summary.summary,
      hasVideo: summary.has_video,
    }).where(eq(schema.stories.id, story.id))
    summariesByStoryId.set(story.id, summary.summary)
    // Mark primary source
    if (summary.primary_article_id) {
      await db.update(schema.storyArticles).set({ isPrimarySource: true })
        .where(sql`story_id = ${story.id} AND article_id = ${summary.primary_article_id}`)
    }
  }

  // Hero selection
  const storiesForHero = await db.select().from(schema.stories).where(eq(schema.stories.digestId, digest.id))
  const heroId = await selectHeroStory(
    storiesForHero.map(s => ({ id: s.id, headline: s.headline, summary: s.summary, category: s.category })),
    digest.id,
  )
  await db.update(schema.digests).set({
    heroStoryId: heroId,
    status: 'published',
    publishedAt: new Date(),
  }).where(eq(schema.digests.id, digest.id))

  log.info({ digestId: digest.id, stories: storyIds.length, heroId }, 'weekly digest published')
  return digest.id
}
```

- [ ] **Step 23.2: Commit**

```bash
git add projects/news-aggregator/src/pipeline/weekly.ts
git commit -m "feat(news): weekly digest orchestrator"
```

---

### Task 24: Monthly synthesis orchestrator

**Files:**
- Create: `projects/news-aggregator/src/pipeline/monthly.ts`

- [ ] **Step 24.1: Implement**

```typescript
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { synthesiseMonth } from '../llm/monthly-synthesis.js'

export async function generateMonthlySynthesis(monthDate: Date, log: any): Promise<string> {
  const monthStr = monthDate.toISOString().slice(0, 7) + '-01'
  const [ms] = await db.insert(schema.monthlySummaries).values({
    month: monthStr,
    title: '(generating)',
    bodyMarkdown: '(generating)',
  }).onConflictDoNothing({ target: schema.monthlySummaries.month }).returning({ id: schema.monthlySummaries.id })
  if (!ms) {
    log.warn({ monthStr }, 'monthly synthesis already exists; skipping')
    const existing = await db.select().from(schema.monthlySummaries).where(eq(schema.monthlySummaries.month, monthStr)).limit(1)
    return existing[0]?.id ?? ''
  }
  const synth = await synthesiseMonth(monthDate, ms.id)
  await db.update(schema.monthlySummaries).set({
    title: synth.title,
    bodyMarkdown: synth.body_markdown,
    featuredStoryIds: synth.featured_story_ids,
    publishedAt: new Date(),
  }).where(eq(schema.monthlySummaries.id, ms.id))
  log.info({ monthStr, msId: ms.id }, 'monthly synthesis published')
  return ms.id
}
```

- [ ] **Step 24.2: Commit**

```bash
git add projects/news-aggregator/src/pipeline/monthly.ts
git commit -m "feat(news): monthly synthesis orchestrator"
```

---

### Task 25: 30-day launch edition orchestrator

**Files:**
- Create: `projects/news-aggregator/src/pipeline/launch.ts`

- [ ] **Step 25.1: Implement**

```typescript
import { generateWeeklyDigest } from './weekly.js'

// Launch edition is structurally a "weekly" digest with a 30-day window.
// Only articles with published_at in the last 30 days are eligible (enforced by the weekly orchestrator's window).
export async function generateLaunchDigest(log: any): Promise<string> {
  const now = new Date()
  const periodEnd = now
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const id = await generateWeeklyDigest(periodStart, periodEnd, log)
  // Override digest_type on the inserted row
  const { db, schema } = await import('../db/index.js')
  const { eq } = await import('drizzle-orm')
  await db.update(schema.digests).set({ digestType: 'launch_30day' }).where(eq(schema.digests.id, id))
  log.info({ digestId: id }, 'launch edition (30-day) published')
  return id
}
```

- [ ] **Step 25.2: Commit**

```bash
git add projects/news-aggregator/src/pipeline/launch.ts
git commit -m "feat(news): 30-day launch edition orchestrator"
```

---

### Task 26: Cron wiring for weekly + monthly

**Files:**
- Modify: `projects/news-aggregator/src/scheduler/cron.ts`

- [ ] **Step 26.1: Add weekly and monthly jobs**

```typescript
import cron from 'node-cron'
import { runIngestOnce } from '../ingest/scheduler.js'
import { generateWeeklyDigest } from '../pipeline/weekly.js'
import { generateMonthlySynthesis } from '../pipeline/monthly.js'
import { monthlySynthesisDay } from '../utils/dates.js'
import { healthcheckAuth } from '../llm/client.js'

export function startCronJobs(log: any) {
  // Hourly ingest (unchanged)
  cron.schedule('0 * * * *', async () => {
    try { await runIngestOnce(log) } catch (err) { log.error({ err }, 'hourly ingest failed') }
  }, { timezone: 'Etc/UTC' })

  // Weekly digest: Sunday 22:00 UTC, covers the previous 7 days ending at 22:00 UTC Sunday
  cron.schedule('0 22 * * 0', async () => {
    log.info('weekly digest job start')
    const now = new Date()
    const periodEnd = now
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    try { await generateWeeklyDigest(periodStart, periodEnd, log) }
    catch (err) { log.error({ err }, 'weekly digest failed') }
  }, { timezone: 'Etc/UTC' })

  // Monthly synthesis: 22:00 UTC every day, but only runs if today is the synthesis day
  cron.schedule('0 22 * * *', async () => {
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth() + 1
    const d = now.getUTCDate()
    if (d !== monthlySynthesisDay(y, m)) return
    log.info({ y, m, d }, 'monthly synthesis job start')
    try {
      const monthDate = new Date(Date.UTC(y, m - 1, 1))
      await generateMonthlySynthesis(monthDate, log)
    } catch (err) { log.error({ err }, 'monthly synthesis failed') }
  }, { timezone: 'Etc/UTC' })

  // Pre-flight LLM healthcheck 10 minutes before weekly and monthly runs
  cron.schedule('50 21 * * 0', async () => {
    const h = await healthcheckAuth()
    log.info({ ok: h.ok, mode: h.mode }, 'weekly pre-flight')
  }, { timezone: 'Etc/UTC' })
  cron.schedule('50 21 * * *', async () => {
    const now = new Date()
    if (now.getUTCDate() !== monthlySynthesisDay(now.getUTCFullYear(), now.getUTCMonth() + 1)) return
    const h = await healthcheckAuth()
    log.info({ ok: h.ok, mode: h.mode }, 'monthly pre-flight')
  }, { timezone: 'Etc/UTC' })

  log.info('cron jobs scheduled: hourly ingest, weekly digest (Sun 22:00), monthly synthesis (day-30/last at 22:00)')
}
```

- [ ] **Step 26.2: Smoke test weekly orchestrator manually**

```bash
cd projects/news-aggregator
npx tsx -e "import('./src/pipeline/weekly.js').then(m => m.generateWeeklyDigest(new Date(Date.now()-7*864e5), new Date(), console))"
psql $NEWS_DB_URL -c "SELECT id, status, period_start, period_end, hero_story_id FROM news.digests ORDER BY created_at DESC LIMIT 1"
psql $NEWS_DB_URL -c "SELECT category, rank, headline FROM news.stories WHERE digest_id = (SELECT id FROM news.digests ORDER BY created_at DESC LIMIT 1) ORDER BY category, rank"
```

- [ ] **Step 26.3: Commit**

```bash
git add projects/news-aggregator/src/scheduler/cron.ts
git commit -m "feat(news): weekly + monthly cron wiring with pre-flight healthcheck"
```

**M2 complete.** Weekly digest job and monthly synthesis job generate output in DB. No UI yet.

---

## Milestone M3: Frontend

### Task 27: Backend digest read endpoints

**Files:**
- Create: `projects/news-aggregator/src/routes/digests.ts`
- Modify: `projects/news-aggregator/src/index.ts`

- [ ] **Step 27.1: Implement routes**

```typescript
import type { FastifyInstance } from 'fastify'
import { sql, desc, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

export async function digestRoutes(app: FastifyInstance) {
  // Current digest: the most recently published weekly or launch_30day digest.
  app.get('/digests/current', async () => {
    return loadDigest(await currentDigestId())
  })

  app.get<{ Params: { id: string } }>('/digests/:id', async (req, reply) => {
    const data = await loadDigest(req.params.id)
    if (!data) return reply.code(404).send({ error: 'not found' })
    return data
  })

  app.get<{ Querystring: { limit?: string; offset?: string } }>('/digests/archive', async (req) => {
    const limit = Math.min(Number(req.query.limit ?? 24), 100)
    const offset = Number(req.query.offset ?? 0)
    const rows = await db.execute(sql`
      SELECT id, digest_type, period_start, period_end, published_at
      FROM news.digests WHERE status = 'published'
      ORDER BY period_start DESC LIMIT ${limit} OFFSET ${offset}
    `)
    const ms = await db.execute(sql`
      SELECT id, month, published_at, title FROM news.monthly_summaries
      WHERE published_at IS NOT NULL ORDER BY month DESC LIMIT ${limit}
    `)
    return { digests: rows.rows, monthly_summaries: ms.rows }
  })

  app.get<{ Params: { id: string } }>('/monthly-summaries/:id', async (req, reply) => {
    const rows = await db.select().from(schema.monthlySummaries).where(eq(schema.monthlySummaries.id, req.params.id)).limit(1)
    if (!rows[0]) return reply.code(404).send({ error: 'not found' })
    return rows[0]
  })
}

async function currentDigestId(): Promise<string | null> {
  const rows = await db.execute(sql`
    SELECT id FROM news.digests
    WHERE status = 'published'
    ORDER BY period_end DESC LIMIT 1
  `)
  return (rows.rows[0] as any)?.id ?? null
}

async function loadDigest(id: string | null) {
  if (!id) return null
  const [digest] = await db.select().from(schema.digests).where(eq(schema.digests.id, id)).limit(1)
  if (!digest) return null
  const stories = await db.execute(sql`
    SELECT s.id, s.category, s.is_dynamic_category, s.dynamic_category_label, s.rank,
           s.headline, s.summary, s.hero_asset_id, s.has_video, s.source_count,
           s.primary_entities,
           (SELECT a.og_image_hash FROM news.articles a
              JOIN news.story_articles sa ON sa.article_id = a.id
              WHERE sa.story_id = s.id AND a.og_image_hash IS NOT NULL
              ORDER BY sa.is_primary_source DESC LIMIT 1) AS og_image_hash,
           (SELECT json_agg(json_build_object(
              'id', a.id, 'title', a.title, 'url', a.url,
              'source', src.name, 'published_at', a.published_at,
              'author', a.author, 'is_primary', sa.is_primary_source
            )) FROM news.story_articles sa
             JOIN news.articles a ON a.id = sa.article_id
             JOIN news.sources src ON src.id = a.source_id
             WHERE sa.story_id = s.id) AS articles
    FROM news.stories s
    WHERE s.digest_id = ${id}
    ORDER BY
      CASE s.category
        WHEN 'studios' THEN 1 WHEN 'games' THEN 2 WHEN 'shifts' THEN 3 WHEN 'strategy' THEN 4
        ELSE 5 END,
      s.rank
  `)
  // Monthly synthesis associated with this digest's period, if any
  const msRows = await db.execute(sql`
    SELECT id, title, body_markdown, featured_story_ids, published_at
    FROM news.monthly_summaries
    WHERE published_at IS NOT NULL
      AND date_trunc('month', month)::date <= ${digest.periodEnd}::date
      AND date_trunc('month', month)::date >= ${digest.periodStart}::date - INTERVAL '7 days'
    ORDER BY month DESC LIMIT 1
  `)
  return {
    digest,
    hero: stories.rows.find((s: any) => s.id === digest.heroStoryId) ?? null,
    stories: stories.rows,
    monthly_summary: msRows.rows[0] ?? null,
  }
}
```

- [ ] **Step 27.2: Register in index.ts**

```typescript
import { digestRoutes } from './routes/digests.js'
await app.register(digestRoutes, { prefix: '/news' })
```

Note: routes are registered under `/news/*` so the dashboard proxy (which rewrites `/api/news` to `/news`) hits them correctly.

- [ ] **Step 27.3: Smoke test**

```bash
curl -s http://localhost:8890/news/digests/current | jq '.digest.id, .stories | length'
```

Expected: digest UUID and a story count.

- [ ] **Step 27.4: Commit**

```bash
git add projects/news-aggregator/src/routes/digests.ts projects/news-aggregator/src/index.ts
git commit -m "feat(news): digest read endpoints"
```

---

### Task 28: Add News tab to renderTabs()

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 28.1: Insert 'news' into tabs array**

Locate `renderTabs()` at line ~3596. Change:

```javascript
const tabs = ['report', 'dashboard', 'tasks', 'people', 'leads', 'expenses', 'finances', 'settings'];
const labels = { dashboard: 'Workload', tasks: 'Projects', report: 'Dashboard', people: 'People', leads: 'Leads', expenses: 'Expenses', finances: 'Finances', settings: 'Settings' };
```

to:

```javascript
const tabs = ['report', 'dashboard', 'tasks', 'people', 'leads', 'expenses', 'finances', 'news', 'settings'];
const labels = { dashboard: 'Workload', tasks: 'Projects', report: 'Dashboard', people: 'People', leads: 'Leads', expenses: 'Expenses', finances: 'Finances', news: 'News', settings: 'Settings' };
```

No change to the permission filter: 'news' passes through unchecked, so it's visible to all authenticated users. News lands between Finances and Settings for admins, after Expenses for non-admin users who see Expenses, or at the end for anyone else.

- [ ] **Step 28.2: Add 'news' to known-views array at line ~3648**

```javascript
const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks'];
```

- [ ] **Step 28.3: Add a placeholder renderer so the tab doesn't break on click**

Somewhere in the switch/if chain that dispatches `currentView` to a renderer (search for `renderContent()` and the view-to-renderer mapping). Add a stub:

```javascript
if (currentView === 'news') {
  if (typeof renderNewsView === 'function') {
    renderNewsView();
  } else {
    document.getElementById('mainContent').innerHTML = '<div style="padding:48px;text-align:center;color:var(--text-muted)">Loading News module...</div>';
    loadNewsModule();   // defined in Task 29
  }
  return;
}
```

- [ ] **Step 28.4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): add News tab to top-bar nav"
```

---

### Task 29: News module lazy-loader with API client

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 29.1: Add the News module IIFE near the end of the file**

Insert before the closing `</script>` tag:

```javascript
// ----- News aggregator module (lazy-loaded on first tab click) -----
let _newsModuleLoaded = false;
let _newsState = {
  currentDigestId: null,
  digest: null,
  monthlyVisible: false,
  archive: null,
  archiveLoaded: false,
};

async function loadNewsModule() {
  if (_newsModuleLoaded) { renderNewsView(); return; }
  try {
    _newsState.digest = await newsApi.loadCurrent();
    _newsModuleLoaded = true;
    renderNewsView();
  } catch (err) {
    console.error('[news] initial load failed', err);
    document.getElementById('mainContent').innerHTML = newsTemplates.errorBanner(err.message);
  }
}

const newsApi = {
  async loadCurrent() {
    const r = await fetch('/api/news/digests/current', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('news service unavailable');
    return r.json();
  },
  async loadDigest(id) {
    const r = await fetch('/api/news/digests/' + encodeURIComponent(id), { credentials: 'same-origin' });
    if (!r.ok) throw new Error('digest not found');
    return r.json();
  },
  async loadArchive() {
    const r = await fetch('/api/news/digests/archive?limit=48', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('archive unavailable');
    return r.json();
  },
  async loadMonthlySummary(id) {
    const r = await fetch('/api/news/monthly-summaries/' + encodeURIComponent(id), { credentials: 'same-origin' });
    if (!r.ok) throw new Error('monthly summary not found');
    return r.json();
  },
  async search(q, filters = {}) {
    const params = new URLSearchParams({ q, ...filters });
    const r = await fetch('/api/news/search?' + params, { credentials: 'same-origin' });
    if (!r.ok) throw new Error('search failed');
    return r.json();
  },
  mediaUrl(hash, variant) { return hash ? `/api/news/media/${hash}/${variant}` : null; },
};
```

- [ ] **Step 29.2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): lazy-load news module and API client"
```

---

### Task 30: Today view hero component

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 30.1: Add renderer and template**

Within the news IIFE section:

```javascript
const newsTemplates = {
  errorBanner(msg) {
    return `<div class="news-error">News service error: ${escapeHtml(msg)}<button onclick="loadNewsModule()">Retry</button></div>`;
  },
  hero(story) {
    if (!story) return '';
    const img = newsApi.mediaUrl(story.og_image_hash, 'hero');
    const categoryLabel = story.is_dynamic_category ? (story.dynamic_category_label || story.category) : story.category;
    return `
      <section class="news-hero">
        ${img ? `<div class="news-hero__image" style="background-image:url('${img}')"></div>` : ''}
        <div class="news-hero__body">
          <span class="news-pill news-pill--${escapeHtml(story.category)}">${escapeHtml(categoryLabel)}</span>
          <h1 class="news-hero__headline">${escapeHtml(story.headline)}</h1>
          <p class="news-hero__summary">${escapeHtml(story.summary)}</p>
          <div class="news-hero__meta">
            <button class="news-sources-toggle" onclick="toggleNewsSourceDrawer('${story.id}')">${story.source_count} sources</button>
            ${renderStoryArticles(story)}
          </div>
        </div>
      </section>
    `;
  },
  // ... section, card, drawer, monthlyBlock templates in later tasks
};

function renderNewsView() {
  const root = document.getElementById('mainContent');
  if (!_newsState.digest) { root.innerHTML = newsTemplates.errorBanner('No digest available.'); return; }
  const { digest, hero, stories, monthly_summary } = _newsState.digest;
  root.innerHTML = `
    <div class="news-page">
      <header class="news-page__header">
        <h1>${digestTitle(digest)}</h1>
        <p class="news-page__meta">${stories.length} stories from ${new Set(stories.flatMap(s => (s.articles || []).map(a => a.source))).size} sources</p>
      </header>
      ${monthly_summary ? newsTemplates.monthlyBlock(monthly_summary) : ''}
      ${newsTemplates.hero(hero)}
      <div id="news-sections"></div>
    </div>
  `;
  renderNewsSections(stories, hero?.id);
}

function digestTitle(d) {
  if (d.digest_type === 'launch_30day') return 'Last 30 days in games';
  const start = new Date(d.period_start), end = new Date(d.period_end);
  return `Week of ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function renderStoryArticles(story) {
  if (!story.articles) return '';
  return `<div class="news-sources-drawer" id="news-sources-${story.id}" style="display:none">
    ${story.articles.map(a => `
      <a class="news-source-link" href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">
        <strong>${escapeHtml(a.source)}</strong>: ${escapeHtml(a.title)}
        <span class="news-source-meta">${a.author ? escapeHtml(a.author) + ' / ' : ''}${formatDate(a.published_at)}</span>
      </a>
    `).join('')}
  </div>`;
}

function toggleNewsSourceDrawer(storyId) {
  const el = document.getElementById('news-sources-' + storyId);
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }
function formatDate(iso) { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
```

- [ ] **Step 30.2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): today view hero component"
```

---

### Task 31: Section bands with dynamic 5th

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 31.1: Add section + card templates**

```javascript
const CANONICAL_CATEGORIES = [
  { key: 'studios', label: 'Studios' },
  { key: 'games', label: 'Games' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'strategy', label: 'Strategy' },
];

function renderNewsSections(stories, heroId) {
  const byCategory = new Map();
  for (const s of stories) {
    if (s.id === heroId) continue;
    const key = s.is_dynamic_category ? `dynamic:${s.dynamic_category_label || s.category}` : s.category;
    if (!byCategory.has(key)) byCategory.set(key, { label: s.is_dynamic_category ? (s.dynamic_category_label || s.category) : CANONICAL_CATEGORIES.find(c => c.key === s.category)?.label || s.category, isDynamic: !!s.is_dynamic_category, items: [] });
    byCategory.get(key).items.push(s);
  }
  for (const cat of CANONICAL_CATEGORIES) if (!byCategory.has(cat.key)) byCategory.set(cat.key, { label: cat.label, isDynamic: false, items: [] });

  // Order: four canonical first, then dynamic fifth at the end
  const ordered = [
    ...CANONICAL_CATEGORIES.map(c => ({ label: c.label, key: c.key, ...(byCategory.get(c.key) || { items: [] }) })),
    ...[...byCategory.entries()].filter(([k]) => k.startsWith('dynamic:')).map(([k, v]) => ({ key: k, ...v })),
  ];

  document.getElementById('news-sections').innerHTML = ordered
    .filter(cat => cat.items.length > 0)
    .map(cat => `
      <section class="news-section ${cat.isDynamic ? 'news-section--dynamic' : ''}">
        <h2 class="news-section__title">${escapeHtml(cat.label)}</h2>
        <div class="news-section__grid">
          ${cat.items.sort((a, b) => a.rank - b.rank).map(s => newsTemplates.card(s)).join('')}
        </div>
      </section>
    `).join('');
}

newsTemplates.card = function(story) {
  const img = newsApi.mediaUrl(story.og_image_hash, 'card');
  const categoryLabel = story.is_dynamic_category ? (story.dynamic_category_label || story.category) : story.category;
  return `
    <article class="news-card">
      ${img ? `<div class="news-card__image" style="background-image:url('${img}')"></div>` : '<div class="news-card__image news-card__image--placeholder"></div>'}
      <div class="news-card__body">
        <span class="news-pill news-pill--${escapeHtml(story.category)}">${escapeHtml(categoryLabel)}</span>
        <h3 class="news-card__headline">${escapeHtml(story.headline)}</h3>
        <p class="news-card__summary">${escapeHtml(story.summary)}</p>
        <div class="news-card__meta">
          <button class="news-sources-toggle" onclick="toggleNewsSourceDrawer('${story.id}')">${story.source_count} sources</button>
        </div>
        ${renderStoryArticles(story)}
      </div>
    </article>
  `;
};
```

- [ ] **Step 31.2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): section bands with dynamic 5th category"
```

---

### Task 32: Monthly synthesis block

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 32.1: Add monthlyBlock template and markdown renderer**

```javascript
newsTemplates.monthlyBlock = function(ms) {
  return `
    <section class="news-monthly">
      <div class="news-monthly__label">Monthly synthesis</div>
      <h2 class="news-monthly__title">${escapeHtml(ms.title)}</h2>
      <div class="news-monthly__body">${renderMarkdown(ms.body_markdown)}</div>
    </section>
  `;
};

// Minimal sanitised markdown -> HTML. Allow headings (##, ###), bold, italic, links, paragraphs, lists.
function renderMarkdown(md) {
  if (!md) return '';
  const escaped = escapeHtml(md);
  return escaped
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`)
    .split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}
```

- [ ] **Step 32.2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): monthly synthesis block with sanitised markdown"
```

---

### Task 33: Typography and CSS

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 33.1: Add Playfair Display font link in `<head>`**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 33.2: Add news CSS**

Append to the existing `<style>` block:

```css
/* ---- News aggregator ---- */
.news-page { padding: 24px 48px; max-width: 1400px; margin: 0 auto; }
.news-page__header { border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px; margin-bottom: 32px; }
.news-page__header h1 { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 32px; margin: 0 0 8px 0; color: var(--text-primary); }
.news-page__meta { color: var(--text-muted); font-size: 13px; margin: 0; }

.news-hero { display: grid; grid-template-columns: 7fr 5fr; gap: 32px; margin-bottom: 48px; padding-bottom: 48px; border-bottom: 1px solid var(--border-subtle); }
.news-hero__image { background-size: cover; background-position: center; aspect-ratio: 16 / 9; border-radius: 12px; background-color: var(--bg-elevated); }
.news-hero__body { display: flex; flex-direction: column; justify-content: center; }
.news-hero__headline { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 42px; line-height: 1.15; margin: 12px 0 16px 0; color: var(--text-primary); }
.news-hero__summary { font-size: 17px; line-height: 1.55; color: var(--text-secondary); margin: 0 0 16px 0; }
.news-hero__meta { margin-top: auto; }

.news-section { margin-bottom: 56px; }
.news-section__title { font-family: 'Playfair Display', Georgia, serif; font-weight: 600; font-size: 28px; margin: 0 0 20px 0; color: var(--text-primary); }
.news-section--dynamic .news-section__title { color: var(--accent-muted, #9ca3af); }
.news-section__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }

.news-card { background: var(--bg-raised); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.news-card__image { background-size: cover; background-position: center; aspect-ratio: 16 / 9; background-color: var(--bg-elevated); }
.news-card__image--placeholder { background: linear-gradient(135deg, var(--bg-elevated), var(--bg-raised)); }
.news-card__body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.news-card__headline { font-family: 'Playfair Display', Georgia, serif; font-weight: 600; font-size: 20px; line-height: 1.25; margin: 0; color: var(--text-primary); }
.news-card__summary { font-size: 14px; line-height: 1.55; color: var(--text-secondary); margin: 0; flex: 1; }
.news-card__meta { margin-top: auto; }

.news-pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-elevated); color: var(--text-secondary); }
.news-pill--studios { background: rgba(124, 92, 255, 0.15); color: #a78bfa; }
.news-pill--games { background: rgba(34, 193, 195, 0.15); color: #22c1c3; }
.news-pill--shifts { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
.news-pill--strategy { background: rgba(220, 38, 38, 0.15); color: #f87171; }

.news-sources-toggle { background: none; border: 1px solid var(--border-subtle); padding: 6px 12px; border-radius: 6px; font-size: 12px; color: var(--text-secondary); cursor: pointer; }
.news-sources-toggle:hover { background: var(--bg-elevated); color: var(--text-primary); }
.news-sources-drawer { display: none; flex-direction: column; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-subtle); }
.news-source-link { color: var(--text-secondary); text-decoration: none; font-size: 13px; line-height: 1.4; padding: 6px 0; }
.news-source-link:hover { color: var(--text-primary); text-decoration: underline; }
.news-source-meta { display: block; color: var(--text-muted); font-size: 11px; margin-top: 2px; }

.news-monthly { background: var(--bg-raised); border-left: 3px solid var(--accent); padding: 32px 40px; border-radius: 12px; margin-bottom: 48px; }
.news-monthly__label { text-transform: uppercase; letter-spacing: 1px; font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }
.news-monthly__title { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: 32px; line-height: 1.2; margin: 0 0 20px 0; color: var(--text-primary); }
.news-monthly__body { color: var(--text-secondary); font-size: 16px; line-height: 1.7; }
.news-monthly__body h2, .news-monthly__body h3 { font-family: 'Playfair Display', Georgia, serif; color: var(--text-primary); margin-top: 24px; }
.news-monthly__body p { margin: 12px 0; }
.news-monthly__body a { color: var(--accent); }

.news-error { background: #7f1d1d; color: #fecaca; padding: 16px 24px; border-radius: 8px; margin: 24px; }
.news-error button { margin-left: 16px; background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
```

- [ ] **Step 33.3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): typography and editorial CSS"
```

---

### Task 34: Responsive breakpoints and mobile top-news-only mode

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 34.1: Add responsive CSS**

Append to the news CSS block:

```css
@media (max-width: 1279px) {
  .news-section__grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
  .news-hero { grid-template-columns: 1fr; }
  .news-hero__headline { font-size: 34px; }
}

@media (max-width: 767px) {
  .news-page { padding: 16px 16px 32px 16px; }
  .news-page__header h1 { font-size: 24px; }
  .news-hero { gap: 16px; padding-bottom: 32px; margin-bottom: 24px; }
  .news-hero__headline { font-size: 26px; }
  .news-hero__summary { font-size: 15px; }

  /* Mobile top-news-only mode: hide all section bands, replace with a compact headline list. */
  .news-section__grid { display: none; }
  .news-section { margin-bottom: 24px; }
  .news-section__title { font-size: 18px; margin-bottom: 8px; }
  .news-mobile-list { display: flex; flex-direction: column; gap: 12px; }
  .news-mobile-list__item { padding: 12px 0; border-bottom: 1px solid var(--border-subtle); }
  .news-mobile-list__headline { font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px 0; line-height: 1.3; }
  .news-mobile-list__meta { font-size: 11px; color: var(--text-muted); }

  .news-monthly { padding: 20px 16px; }
  .news-monthly__title { font-size: 22px; }
  .news-monthly__body { font-size: 14px; }
  .news-monthly__body--collapsed { max-height: 180px; overflow: hidden; position: relative; }
  .news-monthly__body--collapsed::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 60px; background: linear-gradient(transparent, var(--bg-raised)); }
  .news-monthly__readmore { background: none; border: none; color: var(--accent); cursor: pointer; margin-top: 8px; padding: 0; font-size: 14px; }
}
```

- [ ] **Step 34.2: Modify renderNewsSections for mobile fork**

```javascript
function renderNewsSections(stories, heroId) {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  if (isMobile) {
    const nonHero = stories.filter(s => s.id !== heroId);
    document.getElementById('news-sections').innerHTML = `
      <section class="news-section">
        <h2 class="news-section__title">Other top stories</h2>
        <div class="news-mobile-list">
          ${nonHero.slice(0, 20).map(s => `
            <div class="news-mobile-list__item" onclick="toggleNewsSourceDrawer('${s.id}')">
              <h3 class="news-mobile-list__headline">${escapeHtml(s.headline)}</h3>
              <div class="news-mobile-list__meta">${escapeHtml(s.category)} · ${s.source_count} sources</div>
              ${renderStoryArticles(s)}
            </div>
          `).join('')}
        </div>
      </section>
    `;
    return;
  }
  // Desktop path (existing code from Task 31)
  const byCategory = new Map();
  for (const s of stories) { /* ... unchanged ... */ }
  // ... rest as before
}
```

- [ ] **Step 34.3: Add resize listener to re-render on breakpoint change**

```javascript
let _newsResizeTimer = null;
window.addEventListener('resize', () => {
  if (currentView !== 'news') return;
  clearTimeout(_newsResizeTimer);
  _newsResizeTimer = setTimeout(() => { if (_newsState.digest) renderNewsView(); }, 200);
});
```

- [ ] **Step 34.4: Monthly block collapsed-on-mobile behaviour**

Update `newsTemplates.monthlyBlock`:

```javascript
newsTemplates.monthlyBlock = function(ms) {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const bodyClass = isMobile ? 'news-monthly__body news-monthly__body--collapsed' : 'news-monthly__body';
  return `
    <section class="news-monthly">
      <div class="news-monthly__label">Monthly synthesis</div>
      <h2 class="news-monthly__title">${escapeHtml(ms.title)}</h2>
      <div class="${bodyClass}" id="news-monthly-body">${renderMarkdown(ms.body_markdown)}</div>
      ${isMobile ? `<button class="news-monthly__readmore" onclick="expandMonthlyBlock()">Read more</button>` : ''}
    </section>
  `;
};
function expandMonthlyBlock() {
  const el = document.getElementById('news-monthly-body');
  if (el) el.classList.remove('news-monthly__body--collapsed');
  const btn = document.querySelector('.news-monthly__readmore');
  if (btn) btn.style.display = 'none';
}
```

- [ ] **Step 34.5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): responsive breakpoints + mobile top-news-only mode"
```

---

### Task 35: Archive view

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 35.1: Archive UI toggle**

Add to `renderNewsView`:

```javascript
// Existing renderNewsView, wrap with tabs:
function renderNewsView() {
  const root = document.getElementById('mainContent');
  const subView = _newsState.subView || 'today';
  root.innerHTML = `
    <div class="news-page">
      <nav class="news-subnav">
        <button class="${subView === 'today' ? 'active' : ''}" onclick="switchNewsSubView('today')">Today</button>
        <button class="${subView === 'archive' ? 'active' : ''}" onclick="switchNewsSubView('archive')">Archive</button>
        <button class="${subView === 'search' ? 'active' : ''}" onclick="switchNewsSubView('search')">Search</button>
      </nav>
      <div id="news-sub-content"></div>
    </div>
  `;
  if (subView === 'today') renderTodayView();
  else if (subView === 'archive') renderArchiveView();
  else if (subView === 'search') renderSearchView();   // Task 39
}

async function switchNewsSubView(sub) {
  _newsState.subView = sub;
  renderNewsView();
}

function renderTodayView() {
  // Contents moved from the former renderNewsView body (header + hero + sections)
  const { digest, hero, stories, monthly_summary } = _newsState.digest;
  document.getElementById('news-sub-content').innerHTML = `
    <header class="news-page__header">
      <h1>${digestTitle(digest)}</h1>
      <p class="news-page__meta">${stories.length} stories</p>
    </header>
    ${monthly_summary ? newsTemplates.monthlyBlock(monthly_summary) : ''}
    ${newsTemplates.hero(hero)}
    <div id="news-sections"></div>
  `;
  renderNewsSections(stories, hero?.id);
}

async function renderArchiveView() {
  const el = document.getElementById('news-sub-content');
  if (!_newsState.archiveLoaded) {
    el.innerHTML = '<div class="news-loading">Loading archive...</div>';
    try { _newsState.archive = await newsApi.loadArchive(); _newsState.archiveLoaded = true; }
    catch (err) { el.innerHTML = newsTemplates.errorBanner(err.message); return; }
  }
  const { digests, monthly_summaries } = _newsState.archive;
  const msByMonth = new Map(monthly_summaries.map(m => [m.month.slice(0, 7), m]));
  const items = digests.map(d => {
    const month = d.period_start.slice(0, 7);
    const ms = msByMonth.get(month);
    return { type: 'digest', ...d, monthlySummary: ms };
  });
  el.innerHTML = `
    <header class="news-page__header"><h1>Archive</h1></header>
    <div class="news-archive">
      ${items.map(d => `
        <button class="news-archive__tile" onclick="openArchiveDigest('${d.id}')">
          <span class="news-archive__period">${formatDate(d.period_start)} to ${formatDate(d.period_end)}</span>
          <span class="news-archive__type">${d.digest_type === 'launch_30day' ? 'Launch edition' : 'Weekly'}</span>
        </button>
      `).join('')}
    </div>
    ${monthly_summaries.length ? `<h2 class="news-archive__heading">Monthly syntheses</h2>
      <div class="news-archive">
        ${monthly_summaries.map(m => `
          <button class="news-archive__tile news-archive__tile--monthly" onclick="openMonthlySummary('${m.id}')">
            <span class="news-archive__period">${new Date(m.month).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</span>
            <span class="news-archive__title">${escapeHtml(m.title)}</span>
          </button>
        `).join('')}
      </div>` : ''}
  `;
}

async function openArchiveDigest(id) {
  try {
    _newsState.digest = await newsApi.loadDigest(id);
    _newsState.subView = 'today';
    renderNewsView();
  } catch (err) { alert(err.message); }
}

async function openMonthlySummary(id) {
  try {
    const ms = await newsApi.loadMonthlySummary(id);
    document.getElementById('news-sub-content').innerHTML = `
      <header class="news-page__header"><h1>${escapeHtml(ms.title)}</h1><p class="news-page__meta">${new Date(ms.month).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</p></header>
      ${newsTemplates.monthlyBlock(ms)}
    `;
  } catch (err) { alert(err.message); }
}
```

- [ ] **Step 35.2: Archive CSS**

```css
.news-subnav { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--border-subtle); }
.news-subnav button { background: none; border: none; padding: 12px 20px; color: var(--text-muted); font-size: 14px; cursor: pointer; border-bottom: 2px solid transparent; }
.news-subnav button.active { color: var(--text-primary); border-bottom-color: var(--accent); }
.news-subnav button:hover { color: var(--text-secondary); }
.news-archive { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 32px; }
.news-archive__tile { background: var(--bg-raised); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 4px; }
.news-archive__tile:hover { border-color: var(--accent); }
.news-archive__tile--monthly { border-left: 3px solid var(--accent); }
.news-archive__period { color: var(--text-primary); font-weight: 500; font-size: 14px; }
.news-archive__type, .news-archive__title { color: var(--text-muted); font-size: 12px; }
.news-archive__heading { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; margin-top: 40px; margin-bottom: 16px; }
```

- [ ] **Step 35.3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): archive view with weekly digests and monthly syntheses"
```

---

### Task 36: Loading and error states

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 36.1: Skeleton loader**

```javascript
newsTemplates.skeleton = function() {
  return `
    <div class="news-page">
      <div class="news-skeleton news-skeleton--title"></div>
      <div class="news-skeleton news-skeleton--hero"></div>
      <div class="news-section__grid">
        ${Array.from({ length: 6 }, () => '<div class="news-skeleton news-skeleton--card"></div>').join('')}
      </div>
    </div>
  `;
};

function showNewsSkeleton() {
  const root = document.getElementById('mainContent');
  if (root) root.innerHTML = newsTemplates.skeleton();
}
```

Call `showNewsSkeleton()` from `loadNewsModule` before the first fetch.

- [ ] **Step 36.2: Skeleton CSS**

```css
.news-skeleton { background: linear-gradient(90deg, var(--bg-elevated) 0%, var(--bg-raised) 50%, var(--bg-elevated) 100%); background-size: 200% 100%; animation: news-shimmer 1.5s infinite; border-radius: 8px; }
.news-skeleton--title { height: 48px; width: 60%; margin: 24px 0 32px 0; }
.news-skeleton--hero { height: 360px; margin-bottom: 48px; }
.news-skeleton--card { height: 280px; }
@keyframes news-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.news-loading { padding: 48px; text-align: center; color: var(--text-muted); }
```

- [ ] **Step 36.3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): skeleton loading + error states"
```

---

### Task 37: M3 end-to-end smoke test

- [ ] **Step 37.1: Manual walk-through**

```bash
pm2 restart nbi-dashboard nbi-news --update-env
```

Open the dashboard in a browser. Click News tab.

Verify:
- Skeleton flashes briefly before content appears.
- Today view: hero renders, sections render, cards have images, source drawer expands on click.
- Archive view: weekly editions listed, monthly syntheses listed separately.
- Clicking an archived weekly loads into Today view.
- Resize to mobile (devtools 375px): hero simplifies, sections collapse to a compact headline list, monthly synthesis shows read-more.
- Kill `nbi-news`: reload. Expected: error banner with Retry button.

- [ ] **Step 37.2: Playwright smoke test**

Create `projects/news-aggregator/tests/e2e/frontend.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('News tab lazy-loads and renders digest', async ({ page, context }) => {
  // Assumes a logged-in session cookie is in the Playwright auth state.
  await page.goto('http://localhost:8888/nbi_project_dashboard.html#news')
  await expect(page.locator('.news-skeleton').first()).toBeVisible({ timeout: 2000 })
  await expect(page.locator('.news-hero__headline')).toBeVisible({ timeout: 10000 })
})
```

Run: `npx playwright test tests/e2e/frontend.spec.ts` (Playwright setup inherited from dashboard-server tests).

- [ ] **Step 37.3: Commit**

```bash
git add projects/news-aggregator/tests/e2e
git commit -m "test(news): E2E smoke for News tab lazy-load and render"
```

**M3 complete.** News tab is visible in the Hub, today view renders the weekly digest with hero + sections, archive accessible, monthly synthesis appears on month-end weeks, responsive layout works.

---

## Milestone M4: Search and admin

### Task 38: Full-text search backend

**Files:**
- Create: `projects/news-aggregator/src/routes/search.ts`
- Modify: `projects/news-aggregator/src/index.ts`

- [ ] **Step 38.1: Implement**

```typescript
import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'

export async function searchRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; source?: string; category?: string; from?: string; to?: string; has_video?: string; limit?: string } }>('/search', async (req, reply) => {
    const q = (req.query.q ?? '').trim()
    if (!q) return { stories: [], articles: [] }
    const limit = Math.min(Number(req.query.limit ?? 50), 100)
    const tsquery = sql`websearch_to_tsquery('english', ${q})`

    const storyFilters = [sql`s.search_vector @@ ${tsquery}`]
    if (req.query.category) storyFilters.push(sql`s.category = ${req.query.category}`)
    if (req.query.from) storyFilters.push(sql`d.period_start >= ${req.query.from}::date`)
    if (req.query.to) storyFilters.push(sql`d.period_end <= ${req.query.to}::date`)
    if (req.query.has_video === 'true') storyFilters.push(sql`s.has_video = true`)

    const stories = await db.execute(sql`
      SELECT s.id, s.headline, s.summary, s.category, d.period_start, d.period_end,
             ts_headline('english', s.summary, ${tsquery}, 'MaxWords=30, MinWords=10') AS snippet,
             ts_rank_cd(s.search_vector, ${tsquery}) AS rank
      FROM news.stories s JOIN news.digests d ON d.id = s.digest_id
      WHERE ${sql.join(storyFilters, sql` AND `)}
      ORDER BY rank DESC, d.period_end DESC LIMIT ${limit}
    `)

    const articleFilters = [sql`a.search_vector @@ ${tsquery}`]
    if (req.query.source) articleFilters.push(sql`src.slug = ${req.query.source}`)
    if (req.query.from) articleFilters.push(sql`a.published_at >= ${req.query.from}::timestamptz`)
    if (req.query.to) articleFilters.push(sql`a.published_at <= ${req.query.to}::timestamptz`)

    const articles = await db.execute(sql`
      SELECT a.id, a.title, a.url, a.published_at, src.name AS source, src.slug AS source_slug,
             ts_headline('english', coalesce(a.summary, ''), ${tsquery}, 'MaxWords=30, MinWords=10') AS snippet,
             ts_rank_cd(a.search_vector, ${tsquery}) AS rank
      FROM news.articles a JOIN news.sources src ON src.id = a.source_id
      WHERE ${sql.join(articleFilters, sql` AND `)}
      ORDER BY rank DESC, a.published_at DESC LIMIT ${limit}
    `)

    return { stories: stories.rows, articles: articles.rows }
  })
}
```

- [ ] **Step 38.2: Register + smoke test**

```typescript
import { searchRoutes } from './routes/search.js'
await app.register(searchRoutes, { prefix: '/news' })
```

```bash
curl -s "http://localhost:8890/news/search?q=microsoft" | jq '.stories | length, .articles | length'
```

- [ ] **Step 38.3: Commit**

```bash
git add projects/news-aggregator/src/routes/search.ts projects/news-aggregator/src/index.ts
git commit -m "feat(news): full-text search endpoint"
```

---

### Task 39: Search UI with highlights and filters

**File:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 39.1: Add search view renderer**

```javascript
async function renderSearchView() {
  const el = document.getElementById('news-sub-content');
  if (!_newsState.searchFilters) _newsState.searchFilters = { q: '', source: '', category: '', has_video: '' };
  el.innerHTML = `
    <header class="news-page__header"><h1>Search the archive</h1></header>
    <div class="news-search">
      <input type="search" id="newsSearchQuery" placeholder="Search stories and articles..." value="${escapeHtml(_newsState.searchFilters.q)}" autofocus>
      <div class="news-search__filters">
        <select id="newsSearchCategory">
          <option value="">All categories</option>
          <option value="studios">Studios</option><option value="games">Games</option>
          <option value="shifts">Shifts</option><option value="strategy">Strategy</option>
        </select>
        <label><input type="checkbox" id="newsSearchVideo"> Has video</label>
      </div>
      <button id="newsSearchBtn" onclick="executeNewsSearch()">Search</button>
      <div id="newsSearchResults"></div>
    </div>
  `;
  document.getElementById('newsSearchQuery').addEventListener('keydown', e => { if (e.key === 'Enter') executeNewsSearch(); });
}

async function executeNewsSearch() {
  const q = document.getElementById('newsSearchQuery').value.trim();
  const category = document.getElementById('newsSearchCategory').value;
  const hasVideo = document.getElementById('newsSearchVideo').checked ? 'true' : '';
  _newsState.searchFilters = { q, category, has_video: hasVideo };
  const results = document.getElementById('newsSearchResults');
  if (!q) { results.innerHTML = ''; return; }
  results.innerHTML = '<div class="news-loading">Searching...</div>';
  try {
    const data = await newsApi.search(q, { category, has_video: hasVideo });
    results.innerHTML = `
      <h3>Stories (${data.stories.length})</h3>
      ${data.stories.map(s => `<div class="news-search-result"><h4>${escapeHtml(s.headline)}</h4><p>${s.snippet}</p><span class="news-search-result__meta">${escapeHtml(s.category)} · ${formatDate(s.period_end)}</span></div>`).join('') || '<p>No story matches</p>'}
      <h3>Articles (${data.articles.length})</h3>
      ${data.articles.map(a => `<div class="news-search-result"><h4><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title)}</a></h4><p>${a.snippet}</p><span class="news-search-result__meta">${escapeHtml(a.source)} · ${formatDate(a.published_at)}</span></div>`).join('') || '<p>No article matches</p>'}
    `;
  } catch (err) { results.innerHTML = newsTemplates.errorBanner(err.message); }
}
```

- [ ] **Step 39.2: Search CSS**

```css
.news-search { max-width: 900px; }
.news-search input[type="search"] { width: 100%; padding: 12px 16px; font-size: 16px; background: var(--bg-raised); border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-primary); }
.news-search__filters { display: flex; gap: 12px; margin-top: 12px; align-items: center; }
.news-search__filters select { padding: 8px 12px; background: var(--bg-raised); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-primary); }
.news-search button { margin-top: 12px; padding: 10px 20px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
.news-search-result { padding: 16px 0; border-bottom: 1px solid var(--border-subtle); }
.news-search-result h4 { margin: 0 0 6px 0; font-family: 'Playfair Display', Georgia, serif; }
.news-search-result h4 a { color: var(--text-primary); text-decoration: none; }
.news-search-result p { color: var(--text-secondary); margin: 0 0 6px 0; line-height: 1.5; }
.news-search-result p b { background: rgba(251, 191, 36, 0.25); color: var(--text-primary); padding: 0 2px; }
.news-search-result__meta { color: var(--text-muted); font-size: 12px; }
```

- [ ] **Step 39.3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(news): search UI with filters and highlights"
```

---

### Task 40: Admin feed health dashboard

**Files:**
- Create: `projects/news-aggregator/src/routes/admin/feed-health.ts`
- Create: `projects/news-aggregator/src/auth/internal.ts`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 40.1: Internal auth + admin guard**

```typescript
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import { loadConfig } from '../config.js'

const config = loadConfig()

export interface NbiUser { username: string; displayName: string; isAdmin: boolean }

export function authenticateInternal(req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
  const token = req.headers['x-nbi-internal-token']
  if (token !== config.NEWS_INTERNAL_TOKEN) return reply.code(401).send({ error: 'unauthorised' })
  const userHeader = req.headers['x-nbi-user']
  if (typeof userHeader !== 'string') return reply.code(401).send({ error: 'missing user context' })
  try { (req as any).user = JSON.parse(userHeader) as NbiUser } catch { return reply.code(400).send({ error: 'bad user header' }) }
  done()
}

export function requireAdmin(req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
  const user = (req as any).user as NbiUser | undefined
  if (!user?.isAdmin) return reply.code(403).send({ error: 'admin required' })
  done()
}
```

Update `src/index.ts` to apply `authenticateInternal` globally as a `preHandler` for all `/news/*` routes. Apply `requireAdmin` only within admin sub-routers.

- [ ] **Step 40.2: Admin feed-health route**

```typescript
import type { FastifyInstance } from 'fastify'
import { sql, eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'

export async function adminFeedHealthRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)
  app.get('/sources', async () => {
    const rows = await db.execute(sql`
      SELECT s.id, s.slug, s.name, s.tier, s.enabled, s.last_success_at, s.last_attempt_at, s.consecutive_failures,
             (SELECT count(*)::int FROM news.feed_health fh WHERE fh.source_id = s.id AND fh.attempted_at > now() - interval '7 days') AS attempts_7d,
             (SELECT count(*)::int FROM news.feed_health fh WHERE fh.source_id = s.id AND fh.attempted_at > now() - interval '7 days' AND fh.outcome != 'success') AS failures_7d,
             (SELECT sum(items_new)::int FROM news.feed_health fh WHERE fh.source_id = s.id AND fh.attempted_at > now() - interval '7 days') AS new_items_7d
      FROM news.sources s ORDER BY s.tier, s.name
    `)
    return { sources: rows.rows }
  })
  app.patch<{ Params: { id: string }; Body: { enabled: boolean } }>('/sources/:id', async (req) => {
    await db.update(schema.sources).set({ enabled: req.body.enabled }).where(eq(schema.sources.id, req.params.id))
    return { ok: true }
  })
  app.get<{ Params: { id: string } }>('/sources/:id/history', async (req) => {
    const rows = await db.execute(sql`
      SELECT attempted_at, outcome, http_status, error_message, items_new, duration_ms
      FROM news.feed_health WHERE source_id = ${req.params.id}
      ORDER BY attempted_at DESC LIMIT 200
    `)
    return { history: rows.rows }
  })
}
```

Register under `/news/admin/feed-health/*`.

- [ ] **Step 40.3: Settings > News tab in dashboard**

Find the Settings view renderer in `nbi_project_dashboard.html`. Add a "News" sub-tab that renders:

- Table of sources with columns: slug, name, tier, status (toggle), 7-day attempts, 7-day failures, new items, last success.
- Click slug to expand 30-day sparkline from `/admin/feed-health/sources/:id/history`.

Full frontend code for the admin view is ~200 lines. Follow the pattern of existing Settings sub-tabs. API paths are `/api/news/admin/feed-health/*`.

- [ ] **Step 40.4: Commit**

```bash
git add projects/news-aggregator/src/routes/admin projects/news-aggregator/src/auth projects/news-aggregator/src/index.ts nbi_project_dashboard.html
git commit -m "feat(news): admin feed health dashboard"
```

---

### Task 41: Admin story merge/split

**Files:**
- Create: `projects/news-aggregator/src/routes/admin/stories.ts`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 41.1: Backend**

```typescript
import type { FastifyInstance } from 'fastify'
import { sql, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'
import { summariseStory } from '../../llm/summarisation.js'

export async function adminStoriesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  app.post<{ Body: { storyIds: string[] } }>('/merge', async (req, reply) => {
    const { storyIds } = req.body
    if (!storyIds || storyIds.length < 2) return reply.code(400).send({ error: 'at least 2 storyIds required' })
    const stories = await db.select().from(schema.stories).where(inArray(schema.stories.id, storyIds))
    if (stories.length !== storyIds.length) return reply.code(404).send({ error: 'story not found' })
    const digestId = stories[0].digestId
    if (!stories.every(s => s.digestId === digestId)) return reply.code(400).send({ error: 'stories must be in the same digest' })
    const [merged] = await db.insert(schema.stories).values({
      digestId, category: stories[0].category, rank: stories[0].rank,
      headline: '(regenerating)', summary: '(regenerating)',
      sourceCount: 0, primaryEntities: stories[0].primaryEntities,
    }).returning({ id: schema.stories.id })
    await db.execute(sql`UPDATE news.story_articles SET story_id = ${merged.id} WHERE story_id = ANY(${storyIds}::uuid[])`)
    await db.delete(schema.stories).where(inArray(schema.stories.id, storyIds))
    const articleIds = (await db.select({ id: schema.storyArticles.articleId }).from(schema.storyArticles).where(eq(schema.storyArticles.storyId, merged.id))).map(r => r.id)
    const summary = await summariseStory(merged.id, articleIds, digestId)
    await db.update(schema.stories).set({
      headline: summary.headline, summary: summary.summary, hasVideo: summary.has_video, sourceCount: articleIds.length,
    }).where(eq(schema.stories.id, merged.id))
    return { ok: true, mergedId: merged.id }
  })

  app.post<{ Body: { storyId: string; articleIds: string[]; newCategory?: string } }>('/split', async (req, reply) => {
    const { storyId, articleIds, newCategory } = req.body
    const [parent] = await db.select().from(schema.stories).where(eq(schema.stories.id, storyId)).limit(1)
    if (!parent) return reply.code(404).send({ error: 'story not found' })
    const [child] = await db.insert(schema.stories).values({
      digestId: parent.digestId, category: newCategory ?? parent.category, rank: parent.rank + 100,
      headline: '(regenerating)', summary: '(regenerating)',
      sourceCount: articleIds.length, primaryEntities: parent.primaryEntities,
    }).returning({ id: schema.stories.id })
    await db.execute(sql`UPDATE news.story_articles SET story_id = ${child.id} WHERE story_id = ${storyId} AND article_id = ANY(${articleIds}::uuid[])`)
    // Regenerate both summaries
    const parentArticleIds = (await db.select({ id: schema.storyArticles.articleId }).from(schema.storyArticles).where(eq(schema.storyArticles.storyId, storyId))).map(r => r.id)
    const [parentSummary, childSummary] = await Promise.all([
      summariseStory(storyId, parentArticleIds, parent.digestId),
      summariseStory(child.id, articleIds, parent.digestId),
    ])
    await db.update(schema.stories).set({ headline: parentSummary.headline, summary: parentSummary.summary, hasVideo: parentSummary.has_video, sourceCount: parentArticleIds.length }).where(eq(schema.stories.id, storyId))
    await db.update(schema.stories).set({ headline: childSummary.headline, summary: childSummary.summary, hasVideo: childSummary.has_video }).where(eq(schema.stories.id, child.id))
    return { ok: true, childId: child.id }
  })
}
```

Register under `/news/admin/stories/*`.

- [ ] **Step 41.2: Frontend**

Add a "Stories" sub-panel under Settings > News. For the current digest, list all stories with checkbox selection. Buttons: "Merge selected" and "Split selected by article". Split opens a modal showing the articles within the selected story and letting the admin pick a subset to split off.

- [ ] **Step 41.3: Commit**

```bash
git add projects/news-aggregator/src/routes/admin/stories.ts projects/news-aggregator/src/index.ts nbi_project_dashboard.html
git commit -m "feat(news): admin story merge/split with regeneration"
```

---

### Task 42: Admin prompt editor

**Files:**
- Create: `projects/news-aggregator/src/routes/admin/prompts.ts`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 42.1: Backend**

```typescript
import type { FastifyInstance } from 'fastify'
import { and, eq, desc } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'

export async function adminPromptsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)
  app.get('/', async () => {
    const rows = await db.select().from(schema.prompts).orderBy(schema.prompts.promptKey, desc(schema.prompts.version))
    return { prompts: rows }
  })
  app.post<{ Body: { promptKey: string; body: string; fewShotExamples?: unknown[] } }>('/', async (req) => {
    const user = (req as any).user
    const latest = await db.select().from(schema.prompts).where(eq(schema.prompts.promptKey, req.body.promptKey)).orderBy(desc(schema.prompts.version)).limit(1)
    const nextVersion = (latest[0]?.version ?? 0) + 1
    await db.update(schema.prompts).set({ isActive: false }).where(eq(schema.prompts.promptKey, req.body.promptKey))
    const inserted = await db.insert(schema.prompts).values({
      promptKey: req.body.promptKey, version: nextVersion, body: req.body.body, fewShotExamples: req.body.fewShotExamples as any, isActive: true, createdBy: user.username,
    }).returning()
    return { ok: true, prompt: inserted[0] }
  })
  app.post<{ Params: { id: string } }>('/:id/activate', async (req) => {
    const [row] = await db.select().from(schema.prompts).where(eq(schema.prompts.id, req.params.id)).limit(1)
    if (!row) return { ok: false }
    await db.update(schema.prompts).set({ isActive: false }).where(eq(schema.prompts.promptKey, row.promptKey))
    await db.update(schema.prompts).set({ isActive: true }).where(eq(schema.prompts.id, req.params.id))
    return { ok: true }
  })
}
```

Register under `/news/admin/prompts/*`.

- [ ] **Step 42.2: Frontend**

Add a "Prompts" sub-panel. For each prompt key, show the active version's body in a `<textarea>`, with a "Save as new version" button. Below, list previous versions with "Activate" buttons.

- [ ] **Step 42.3: Commit**

```bash
git add projects/news-aggregator/src/routes/admin/prompts.ts projects/news-aggregator/src/index.ts nbi_project_dashboard.html
git commit -m "feat(news): admin prompt editor with version history"
```

---

### Task 43: Admin source management

**Files:**
- Create: `projects/news-aggregator/src/routes/admin/sources.ts`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 43.1: Backend CRUD**

```typescript
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'

export async function adminSourcesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)
  app.post<{ Body: { slug: string; name: string; tier: string; feedUrl: string; feedType?: string; baseUrl?: string; priorityWeight?: number; customParserKey?: string } }>('/', async (req) => {
    const b = req.body
    const inserted = await db.insert(schema.sources).values({
      slug: b.slug, name: b.name, tier: b.tier, feedUrl: b.feedUrl,
      feedType: b.feedType ?? 'rss', baseUrl: b.baseUrl ?? null,
      priorityWeight: String(b.priorityWeight ?? 1.0), customParserKey: b.customParserKey ?? null,
    }).returning()
    return { ok: true, source: inserted[0] }
  })
  app.patch<{ Params: { id: string }; Body: Partial<{ name: string; tier: string; feedUrl: string; feedType: string; baseUrl: string; priorityWeight: number; enabled: boolean; customParserKey: string }> }>('/:id', async (req) => {
    const b = req.body
    const update: Record<string, unknown> = {}
    for (const k of ['name','tier','feedUrl','feedType','baseUrl','enabled','customParserKey'] as const) if (k in b) (update as any)[k] = (b as any)[k]
    if ('priorityWeight' in b && typeof b.priorityWeight === 'number') update.priorityWeight = String(b.priorityWeight)
    await db.update(schema.sources).set(update).where(eq(schema.sources.id, req.params.id))
    return { ok: true }
  })
  app.delete<{ Params: { id: string } }>('/:id', async (req) => {
    await db.delete(schema.sources).where(eq(schema.sources.id, req.params.id))
    return { ok: true }
  })
}
```

Register under `/news/admin/sources/*`. Reuses GET from feed-health.

- [ ] **Step 43.2: Frontend**

On the Feed Health admin panel, add "Add source" button opening a modal with the fields. Each row has Edit and Delete buttons.

- [ ] **Step 43.3: Commit**

```bash
git add projects/news-aggregator/src/routes/admin/sources.ts projects/news-aggregator/src/index.ts nbi_project_dashboard.html
git commit -m "feat(news): admin source management"
```

---

### Task 44: Admin manual regenerate

**Files:**
- Create: `projects/news-aggregator/src/routes/admin/regenerate.ts`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 44.1: Backend**

```typescript
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/index.js'
import { requireAdmin } from '../../auth/internal.js'
import { generateWeeklyDigest } from '../../pipeline/weekly.js'
import { summariseStory } from '../../llm/summarisation.js'

export async function adminRegenerateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin)

  app.post<{ Params: { id: string } }>('/digests/:id', async (req, reply) => {
    const [d] = await db.select().from(schema.digests).where(eq(schema.digests.id, req.params.id)).limit(1)
    if (!d) return reply.code(404).send({ error: 'digest not found' })
    await db.update(schema.digests).set({ status: 'regenerating' }).where(eq(schema.digests.id, d.id))
    try {
      await generateWeeklyDigest(new Date(d.periodStart), new Date(d.periodEnd), req.log)
      await db.delete(schema.stories).where(eq(schema.stories.digestId, d.id))
      await db.delete(schema.digests).where(eq(schema.digests.id, d.id))
      return { ok: true }
    } catch (err) {
      await db.update(schema.digests).set({ status: 'published' }).where(eq(schema.digests.id, d.id))
      throw err
    }
  })

  app.post<{ Params: { id: string } }>('/stories/:id', async (req, reply) => {
    const [s] = await db.select().from(schema.stories).where(eq(schema.stories.id, req.params.id)).limit(1)
    if (!s) return reply.code(404).send({ error: 'story not found' })
    const articleIds = (await db.select({ id: schema.storyArticles.articleId }).from(schema.storyArticles).where(eq(schema.storyArticles.storyId, s.id))).map(r => r.id)
    const summary = await summariseStory(s.id, articleIds, s.digestId)
    await db.update(schema.stories).set({ headline: summary.headline, summary: summary.summary, hasVideo: summary.has_video }).where(eq(schema.stories.id, s.id))
    return { ok: true, summary }
  })
}
```

Register under `/news/admin/regenerate/*`.

- [ ] **Step 44.2: Frontend**

Add "Regenerate" button on the Admin story list and on the Archive tiles (admin-only). Show a confirmation dialog. Disable buttons during execution.

- [ ] **Step 44.3: Commit**

```bash
git add projects/news-aggregator/src/routes/admin/regenerate.ts projects/news-aggregator/src/index.ts nbi_project_dashboard.html
git commit -m "feat(news): admin manual regenerate for digests and stories"
```

**M4 complete.** Search works end-to-end. Admin surface covers feed health, merge/split, prompt editing, source CRUD, manual regeneration.

---

## Milestone M5: Polish and launch

### Task 45: Full test suite

**Files:**
- Create: `projects/news-aggregator/tests/unit/*` (add missing coverage)
- Create: `projects/news-aggregator/tests/e2e/*` (Playwright)
- Create: `projects/news-aggregator/playwright.config.ts`

- [ ] **Step 45.1: Unit coverage audit**

Run `npm test -- --coverage` and confirm all key modules have coverage. Add tests for any uncovered logic:

- `src/utils/dates.ts`: already covered (Task 22).
- `src/ingest/canonical.ts`: already covered (Task 6).
- `src/ingest/dedup.ts`: already covered (Task 8).
- `src/ingest/enrichment.ts`: already covered (Task 11).
- `src/media/variants.ts`: already covered (Task 12).
- `src/llm/client.ts`: failover covered (Task 14). Add success-path test.
- `src/llm/clustering.ts`: covered (Task 17). Add malformed-JSON test.
- `src/llm/curation.ts`: covered (Task 18). Add zero-clusters test.
- `src/llm/summarisation.ts`: add a test with mocked LLM returning valid JSON.
- `src/llm/monthly-synthesis.ts`: add a test covering the 4-weekly-digest input shape.

- [ ] **Step 45.2: Playwright config**

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8888',
    storageState: './tests/e2e/auth.json',   // captured once via a login fixture
    trace: 'retain-on-failure',
  },
  webServer: undefined,   // servers are assumed running under PM2
})
```

- [ ] **Step 45.3: E2E flows**

Write Playwright tests for:

- News tab lazy-loads and renders hero + sections.
- Source drawer expands on click.
- Archive view opens a past digest.
- Search finds matching stories and highlights query terms.
- Mobile breakpoint: hero visible, sections replaced by headline list.
- Admin feed health (requires admin auth state): table renders, toggle enables/disables.
- Admin merge: select two stories, merge, new story has regenerated summary.

- [ ] **Step 45.4: CI smoke script**

Create `projects/news-aggregator/scripts/test-all.sh`:

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
npm test
npx playwright test
```

- [ ] **Step 45.5: Commit**

```bash
git add projects/news-aggregator/tests projects/news-aggregator/playwright.config.ts projects/news-aggregator/scripts
git commit -m "test(news): full unit + Playwright E2E coverage"
```

---

### Task 46: Edge case validation

- [ ] **Step 46.1: Leap year monthly synthesis**

Verify in a unit test: `isMonthlySynthesisDay` returns true for Feb 29 at 22:00 UTC in a leap year (2024, 2028). Already covered in Task 22 but re-run to be sure.

- [ ] **Step 46.2: Empty digest week**

Manually truncate `news.articles` so the next weekly run has zero articles. Trigger the weekly job. Expected: a digest row with `status='draft'` and no stories, an info log line "no articles in window; digest skipped". Frontend fallback shows the previous published digest.

- [ ] **Step 46.3: Source added mid-month**

Add a new source via admin API. Trigger one ingest cycle. Verify the source's articles are included in the next weekly digest window (any article whose `published_at` is within the window, regardless of when the source was added).

- [ ] **Step 46.4: Prompt failure mid-run**

Seed the clustering prompt with an intentionally broken version (e.g., instructs the model to output non-JSON). Trigger weekly. Expected: `clusterArticles` returns `[]`, digest ends with zero stories, error log entries. Restore the prompt.

- [ ] **Step 46.5: Media cache growth**

Run ingest for a day, then measure `du -sh projects/news-aggregator/media/`. Confirm it is well under 100MB. Confirm `news.media_assets` count aligns with the file count.

- [ ] **Step 46.6: Max Pro rate limit**

Simulate a 429 from the Agent SDK by temporarily mocking `query` to throw on the first call. Verify the service waits and retries rather than failing immediately. If rate-limit handling is absent, add exponential backoff to `callClaude`.

- [ ] **Step 46.7: Cloudflared down during E2E**

Stop `cloudflared` under PM2. Open the Hub from localhost. Verify News tab still works locally. Restart cloudflared.

- [ ] **Step 46.8: Commit**

```bash
git commit --allow-empty -m "test(news): edge case validation checklist complete"
```

---

### Task 47: 30-day launch seed run

- [ ] **Step 47.1: Let ingest run for at least 30 days of content**

Either wait for the hourly ingest to accumulate 30 days of articles, or use a backfill script that fetches the current RSS (which typically contains 20-50 most recent items per feed) for all sources once. In practice most RSS feeds expose the last 2-4 weeks so the 30-day window will be substantially covered after a few days of hourly ingest.

- [ ] **Step 47.2: Run the launch generator**

```bash
cd projects/news-aggregator
npx tsx -e "import('./src/pipeline/launch.js').then(m => m.generateLaunchDigest(console))"
```

- [ ] **Step 47.3: Review output**

Glen reviews the first launch digest in the News tab. Identify summaries that need prompt iteration. Edit active prompts via the admin UI (Task 42) and regenerate affected stories (Task 44) until the voice matches expectations.

- [ ] **Step 47.4: Publish**

Mark the digest `status='published'`. It becomes the current digest shown on `/digests/current`.

- [ ] **Step 47.5: Commit**

```bash
git commit --allow-empty -m "feat(news): launch edition published"
```

---

### Task 48: Runbook documentation

**Files:**
- Create: `projects/news-aggregator/README.md`

- [ ] **Step 48.1: Write the runbook**

Structure:

1. **Overview.** What nbi-news is, where it runs, what it depends on.
2. **Starting and stopping.** `pm2 start/stop nbi-news`.
3. **Environment variables.** Full list with descriptions.
4. **Database migrations.** `npm run db:migrate`, rollback procedure (manual).
5. **LLM authentication.**
   - Normal: Max Pro via Claude Code. No env var needed.
   - Failover: `ANTHROPIC_API_KEY_FAILOVER` in `.env`. Promoted in memory on auth failure.
   - How to rotate the failover key.
   - How to force a Max Pro retry after failover (restart the process).
6. **Sources.**
   - How to add a source (admin UI).
   - How to disable a source (admin UI or direct SQL).
   - Where to put a custom parser (`src/ingest/parsers/<slug>.ts`).
7. **Prompts.**
   - Where prompts live (`news.prompts`).
   - How to edit and version via admin UI.
   - How to test a prompt without affecting production (use the preview tool in the admin UI).
8. **Scheduled jobs.**
   - Hourly: 0 * * * * UTC.
   - Weekly: Sunday 22:00 UTC.
   - Monthly: 22:00 UTC on `min(30, lastDayOfMonth)`.
   - How to manually trigger a weekly or monthly run (see Task 26.2).
9. **Notifications.**
   - What the service sends, when, to whom.
   - How to acknowledge a notification.
10. **Monitoring.**
    - `pm2 logs nbi-news`.
    - Feed health dashboard at Settings > News.
    - Token usage under admin prompts view.
11. **Disaster recovery.**
    - If nbi-news is down, the Hub shows "news service unavailable" via the proxy error.
    - If the DB schema is lost, re-run migrations and `generateLaunchDigest`.
    - If media cache is lost, images re-fetch on next ingest enrichment cycle.
12. **Known sharp edges.**
    - Some feeds (Bloomberg, Substack behind custom domains) may Cloudflare-block us. Add headers or use admin to disable.
    - Monthly synthesis needs at least one weekly digest in the month; if none exist, synthesis is skipped.

- [ ] **Step 48.2: Commit**

```bash
git add projects/news-aggregator/README.md
git commit -m "docs(news): ops runbook"
```

---

### Task 49: PM2 configuration and deployment

- [ ] **Step 49.1: Add nbi-news to PM2 persistent list**

```bash
pm2 start projects/news-aggregator/ecosystem.config.cjs
pm2 save
# Verify
pm2 list
```

Expected output: `nbi-news`, `nbi-dashboard`, `nbiai-api`, `cloudflared` all online.

- [ ] **Step 49.2: Verify startup pre-flight**

```bash
pm2 logs nbi-news --lines 50 | grep -E "pre-flight|seeded|listening"
```

Expected: "nbi-news listening on 0.0.0.0:8890", "Seeded 53 sources", "Seeded 5 prompts", "LLM auth pre-flight ok".

- [ ] **Step 49.3: Production smoke**

```bash
# Local
curl -s http://localhost:8890/health | jq .
# Through dashboard proxy
curl -s -H "Cookie: <session>" http://localhost:8888/api/news/digests/current | jq '.digest.id'
# Through Cloudflare tunnel
curl -s -H "Cookie: <session>" https://worksage.nbi-consulting.com/api/news/digests/current | jq '.digest.id'
```

All three should return the same digest.

- [ ] **Step 49.4: Update MEMORY and session logs**

Append to `projects/nbi_dashboard/live_state/work_completed.md`:

```
2026-MM-DD: News aggregator shipped. nbi-news service on :8890 under PM2, News tab in Hub, weekly digest schedule live, monthly synthesis configured. See projects/nbi_dashboard/plans/2026-04-17-news-aggregator-{design,impl}.md.
```

- [ ] **Step 49.5: Final commit**

```bash
git add projects/nbi_dashboard/live_state/work_completed.md
git commit -m "feat(news): production deployment"
```

**M5 complete. News aggregator is in production.**

---

## Self-review

Checklist run against the spec (`projects/nbi_dashboard/plans/2026-04-17-news-aggregator-design.md`):

- §1 Purpose. Covered implicitly by the M3 output (weekly digest in the News tab for all authenticated users).
- §2 Scope summary. Every bullet maps to at least one task.
- §3 Non-goals. Enforced by absence (no email, no per-user history, no public page).
- §4 Architecture.
  - §4.1 Service topology: Task 1, Task 49.
  - §4.2 Request path: Task 2.
  - §4.3 Data storage: Task 4.
  - §4.4 LLM access: Task 14.
  - §4.5 Process model: Tasks 13, 26.
- §5 Data model. Task 4.
- §6 Sources. Task 5.
- §7 Ingest layer. Tasks 6-10.
- §8 Media caching. Tasks 11-13.
- §9 LLM pipeline. Tasks 14-21.
  - §9.4 Auth and failover: Task 14.
  - §9.5 Token tracking: Task 14 (in generation_runs).
- §10 Frontend. Tasks 28-37.
- §11 Admin surface. Tasks 40-44.
- §12 Search. Tasks 38-39.
- §13 Notifications. Task 3 (endpoint), Task 10.2 (wiring), Task 14 (failover).
- §14 Configuration. Tasks 1, 4.
- §15 Security. Task 2 (token + proxy), Task 40 (admin guard), Task 32 (sanitised markdown), Task 12 (image size cap).
- §16 Testing. Task 45.
- §17 Milestones. Five present.
- §18 Assumptions. Captured in Task 48 runbook.
- §19 Open questions. All resolved before this plan was written.
- §20 Risk register. Every risk has a mitigation in an enumerated task (Task 14 failover, Task 9 auto-disable, Task 41 merge/split, Task 42 prompt editing, Task 44 regenerate).
- §21 Out of scope. Not built; confirmed absent.

Placeholder scan:

- "(abridged: showing the pattern for one table, repeat identically for the rest)" in Task 4.2: intentional, the spec §5 has the full schema and the engineer copies the pattern. Could be spelled out; decision to leave as-is because the column lists are already in the spec and duplicating adds no signal.
- Task 40.3, 41.2, 42.2, 43.2, 44.2 say "follow the pattern of existing Settings sub-tabs" without the full frontend code. Decision: admin UI is highly repetitive and the Hub already has multiple Settings sub-tabs; the engineer follows established patterns.

Type consistency:

- `PromptKey` defined in Task 15, used in Tasks 16, 17-21. Consistent.
- `ClusterResult`, `CurationAssignment`, `StorySummary` exported from Tasks 17-19, consumed by Task 23.
- `NbiUser` defined in Task 40.1, consumed everywhere requireAdmin is used.
- `VariantName` defined in Task 12.1, used in Task 13.1.

No inconsistencies found.

---

## Execution handoff

Plan complete and saved to `projects/nbi_dashboard/plans/2026-04-17-news-aggregator-impl.md`.

Two execution options:

**1. Subagent-driven (recommended).** I dispatch a fresh subagent per task, review between tasks, fast iteration. Uses the `superpowers:subagent-driven-development` skill. Best for a plan this size because each task starts with a clean context.

**2. Inline execution.** Execute tasks in this session using the `superpowers:executing-plans` skill, batch execution with checkpoints. Slower review cadence but continuous state.

Which approach?
