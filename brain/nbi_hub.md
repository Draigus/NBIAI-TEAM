---
last_verified: 2026-06-24
---

# NBI Hub and News Aggregator

**Last Updated:** 2026-06-24

---

## NBI Hub (WorkSage) - Internal Dashboard

### What It Is

NBI Hub is an internal project management dashboard being actively built to replace paid PM tools (ClickUp, Jira). The long-term goal is a fully self-hosted, NBI-owned system for tracking projects, tasks, people, bugs, hiring, and leads across the business.

### Naming

"NBI Hub" and "WorkSage" refer to the same application. Glen's vocabulary: "NBI Hub" is the business name, "WorkSage" is the product/brand name. Both refer to the dashboard-server + nbi_project_dashboard.html application.

**WorkSage and PlaySage:** PlaySage is the macro software suite -- the long-term passive income product. WorkSage is a set of modules that will eventually become PlaySage. They share the same codebase; WorkSage is the current state, PlaySage is the destination. See `brain/playsage.md` for the product roadmap.

**ALSO NOT:** `projects/nbiai_app/` - that is a separate React + Fastify application (port 3001, database `nbiai`, PM2 name `nbiai-api`) built from the Paperclip framework. Glen has explicitly stated he does not care about that codebase. Treat it as archived unless he revives it. If any task mentions "Hub" or "NBI Hub", default to WorkSage unless the user explicitly points at `nbiai_app`.

### Architecture

| Component | Detail |
|---|---|
| Frontend | `nbi_project_dashboard.html` - modular SPA (~361-line shell) + `dashboard.css` + 31 JS modules in `public/js/` (12 core + 4 domains + 15 views; no IIFEs, no build step, global scope via `<script>` tags) |
| Backend | `dashboard-server/server.js` (~615-line orchestrator) + `routes/` (42 modules) + `lib/` (21 modules) + `cron/` (1 module) - Express on Node.js |
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

870 tests across 90 test files (69 unit/integration via Vitest + 21 Playwright E2E spec files). Test infrastructure landed 15 April 2026.

### Features Built

| Feature | View Type | Description |
|---|---|---|
| Dashboard | Overview | Main landing page with summary panels, metrics, and activity feed |
| Workload | Chart/grid | Team workload visualisation showing task distribution |
| Projects | Board (kanban) | Kanban-style project board with drag-and-drop |
| Projects | Tree | Hierarchical tree view of projects and sub-tasks |
| Projects | Timeline (Gantt) | Gantt chart with drag-to-reschedule, search, scroll-to-today |
| Portfolio | Chart | Bar+donut portfolio overview with client breakdown |
| People | Calendar/roster | Team calendar showing availability, leave, and roster |
| People | Monthly calendar | Month-view calendar for scheduling |
| Reports | Dashboard | Reporting and analytics views with colour legends |
| Bug Tracker | Kanban + detail | Bug tracking with kanban columns, slide-in detail panel with comments |
| Hiring | Kanban | Recruitment pipeline with kanban stages |
| Leads | Kanban | Sales/client lead pipeline with kanban columns |
| News | Feed | News aggregation tab (powered by the news-aggregator sidecar) |
| Command Centre | Tabbed cockpit | Zone-based layout: status strip, 4Cs metrics, tabs (Dashboard/Briefing/System Map), action rail |
| Client Portal | Scoped views | External client login (e.g. Lorenza/Lighthouse), client-filtered data, force password change, team management |
| Email Reports | Cron | Automated email reports via node-cron with retry logic |
| WorkSage Chat | Panel | Embedded AI chat panel (PlaySage-branded) with conversation memory, skills, auto-expanding panel |

### Current State

The dashboard is live on real project data and in daily use. 73 migrations applied. Multi-user sync model with incremental polling every 10s, optimistic concurrency, and IndexedDB WAL for crash recovery. Connected status cascading (parent/child), prerequisite blocking, and scroll preservation are all shipped. Client portal with scoped views for external users (e.g. Lorenza at Couch Heroes) is live.

### Access

| Environment | URL | Port |
|---|---|---|
| Production | `worksage.nbi-consulting.com` (Cloudflare tunnel) | 8888 |
| Staging | localhost only | 8887 |

Requires Azure AD authentication. Client portal users authenticate via local credentials with force-password-change on first login.

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
