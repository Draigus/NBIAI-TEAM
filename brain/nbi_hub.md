# NBI Hub and News Aggregator

**Last Updated:** 2026-04-20

---

## NBI Hub (WorkSage) - Internal Dashboard

### What It Is

NBI Hub is an internal project management dashboard being actively built to replace paid PM tools (ClickUp, Jira). The long-term goal is a fully self-hosted, NBI-owned system for tracking projects, tasks, people, bugs, hiring, and leads across the business.

### Naming

"NBI Hub" and "WorkSage" refer to the same application. Glen's vocabulary: "NBI Hub" is the business name, "WorkSage" is the product/brand name. Both refer to the dashboard-server + nbi_project_dashboard.html application.

**CRITICAL:** NBI Hub / WorkSage is NOT PlaySage. PlaySage is the customer-facing gaming industry intelligence SaaS product (see `brain/playsage.md`). These are completely separate things with no shared codebase.

**ALSO NOT:** `projects/nbiai_app/` - that is a separate React + Fastify application (port 3001, database `nbiai`, PM2 name `nbiai-api`) built from the Paperclip framework. Glen has explicitly stated he does not care about that codebase. Treat it as archived unless he revives it. If any task mentions "Hub" or "NBI Hub", default to WorkSage unless the user explicitly points at `nbiai_app`.

### Architecture

| Component | Detail |
|---|---|
| Frontend | `nbi_project_dashboard.html` - single-page HTML with inline JS/CSS (~8k lines) |
| Backend | `dashboard-server/server.js` - Express on Node.js |
| Database | PostgreSQL (`nbi_dashboard` on port 5432) |
| PM2 process name | `nbi-dashboard` |
| Port | 8888 |
| Public access | Cloudflare tunnel to `worksage.nbi-consulting.com` |
| News sidecar | `projects/news-aggregator/` (`nbi-news` on port 8890, proxied from `/api/news/*`) |

### Tech Stack (from package.json)

| Category | Technologies |
|---|---|
| Runtime | Node.js with Express 4.x |
| Database | PostgreSQL via `pg` driver |
| Authentication | `bcrypt` for password hashing, `@azure/msal-node` for Azure AD integration |
| File handling | `multer` (uploads), `archiver` (zip export), `sharp` (image processing) |
| PDF | `pdfkit` (generation), `pdf-parse` (reading) |
| OCR | `tesseract.js` for optical character recognition |
| Spreadsheets | `xlsx` for Excel file handling |
| Scheduling | `node-cron` for scheduled tasks |
| Security | `express-rate-limit`, `compression`, `dotenv` |
| Monitoring | `prom-client` (Prometheus metrics) |
| Proxy | `http-proxy-middleware` (proxies to news aggregator) |
| Error handling | `express-async-errors` |

### Test Infrastructure

| Framework | Purpose |
|---|---|
| Vitest 2.x | Unit and integration tests (`npm test`) |
| Playwright 1.x | End-to-end browser tests (`npm run test:e2e`) |
| Supertest 7.x | HTTP endpoint testing |
| Combined run | `npm run test:all` runs Vitest then Playwright |

23+ tests currently in place. Test infrastructure was landed on 15 April 2026.

### Features Built

| Feature | View Type | Description |
|---|---|---|
| Dashboard | Overview | Main landing page with summary panels, metrics, and activity feed |
| Workload | Chart/grid | Team workload visualisation showing task distribution |
| Projects | Board (kanban) | Kanban-style project board with drag-and-drop |
| Projects | Tree | Hierarchical tree view of projects and sub-tasks |
| People | Calendar/roster | Team calendar showing availability, leave, and roster |
| People | Monthly calendar | Month-view calendar for scheduling |
| Reports | Dashboard | Reporting and analytics views |
| Bug Tracker | Kanban | Bug tracking with kanban columns for status workflow |
| Hiring | Kanban | Recruitment pipeline with kanban stages |
| Leads | Kanban | Sales/client lead pipeline with kanban columns |
| News | Feed | News aggregation tab (powered by the news-aggregator sidecar) |

### Current State

The dashboard is actively being built and is functional but contains mock/test data that needs replacing with real NBI projects and tasks. The current focus has been on building out all the views and interaction patterns. The next phase is populating with real data and making it the actual daily driver for NBI project management.

### Access

Available at `worksage.nbi-consulting.com` via Tailscale/Cloudflare tunnel. Requires authentication.

---

## News Aggregator

### What It Is

A modular news aggregation service that feeds the NBI Hub's News tab. Lives in `projects/news-aggregator/` as a separate service.

### Architecture

| Component | Detail |
|---|---|
| Runtime | Node.js with TypeScript (ESM modules) |
| Framework | Fastify 4.x |
| Database | PostgreSQL via `pg` driver + Drizzle ORM |
| PM2 process name | `nbi-news` |
| Port | 8890 |
| Proxied at | `/api/news/*` from the main dashboard server |

### Tech Stack (from package.json)

| Category | Technologies |
|---|---|
| Language | TypeScript 5.x, compiled via `tsc`, dev via `tsx` |
| Web framework | Fastify 4.x |
| ORM | Drizzle ORM with Drizzle Kit for migrations |
| AI | Anthropic Claude SDK (`@anthropic-ai/sdk`) for content summarisation |
| RSS | `rss-parser` for feed ingestion |
| Scraping | `cheerio` for HTML parsing |
| Image processing | `sharp` for image resizing/optimisation |
| Scheduling | `node-cron` for periodic feed fetching |
| Concurrency | `p-limit` for rate-limiting parallel requests |
| Validation | `zod` for schema validation |
| Logging | `pino` structured logging |
| Config | `dotenv` for environment variables |
| Testing | Vitest 2.x |

### Current State

The news aggregator is functional as a generic news feed service. It was originally built with Opus 4.7, which Glen found to be poor quality and required significant refactoring to bring up to standard.

### Planned Expansion

Glen wants to go beyond generic news aggregation. The vision includes:

- **Game launches** - tracking and surfacing new game releases
- **DLC releases** - monitoring downloadable content drops across the industry
- **Dashboard-style elements** - not just a text feed, but visual widgets and data panels alongside the news articles
- **Industry-specific curation** - tailored to gaming industry relevance rather than broad tech/business news

The goal is to make the News tab a genuinely useful industry intelligence surface for Glen's daily work, not just a generic RSS reader.
