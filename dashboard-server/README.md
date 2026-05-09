# NBI WorkSage Dashboard

Project management dashboard for NBI Analytics Ltd. Single-page application with Express.js backend and PostgreSQL database.

**Production:** https://worksage.nbi-consulting.com
**Local:** http://localhost:8888/nbi_project_dashboard.html

## Architecture

- **Frontend:** `nbi_project_dashboard.html` — monolithic SPA with inline CSS and JS (~13,100 lines, 100% JSDoc coverage)
- **Backend:** `server.js` (orchestrator, ~550 lines) + `routes/` (29 modules) + `lib/` (13 modules) + `cron/` (1 module)
- **Database:** PostgreSQL (connection via `DATABASE_URL` env var)
- **Deployment:** PM2 process manager + Cloudflare Tunnel

## Work Item Hierarchy

Fixed 4-level hierarchy enforced in both frontend and backend:

```
Client
  └── Project (root level, parent_id = NULL)
        └── Feature
              └── Story
                    └── Task
```

Each item has an `item_type` field (`project`, `feature`, `story`, `task`). Type rules are enforced on creation, drag-and-drop, and reparenting. Items with incomplete prerequisites cannot be marked as Done (enforced server-side). Circular dependencies are detected and blocked. Deleting a prerequisite automatically cleans up references from dependent items.

## Key Features

- **Projects view** — tree, board (kanban), timeline (Gantt), calendar sub-views
- **Prerequisites system** — hard-blocks completion until dependencies are met, circular detection
- **Multi-user sync** — incremental changes with 10-second polling, optimistic concurrency, IndexedDB WAL for crash recovery
- **Leads CRM** — pipeline board with stages, ROM values, win tracking
- **Finance** — P&L statement, staff costs, opex, pipeline, FX rates (GBP/USD)
- **Expense reports** — OCR receipt upload, report workflow (draft/submitted/approved)
- **People** — workload heatmap, standup summaries, team capacity
- **7 colour themes** — Dark, Light, Midnight, Nord, Solarised, Dracula, Emerald
- **Prometheus metrics** — `/metrics` endpoint for monitoring

## Bug Tracker

User-facing bug and feature request tracker. All authenticated users can submit reports and comment; admins have full control over triage and resolution.

### Sidebar View

The Bug Tracker has its own top-level view in the sidebar navigation. It presents a sortable, filterable list of all reports with inline search. Clicking a row opens a slide-in detail panel with properties, description editing, screenshot preview, and a threaded comment section.

### Priority Levels

| Priority | Usage |
|---|---|
| `critical` | Blocks core functionality, needs immediate attention |
| `high` | Significant issue, should be addressed soon |
| `medium` | Non-blocking but notable (default for new reports) |
| `low` | Minor or cosmetic, fix when convenient |

Priority is set by admins via the detail panel. Reports can also have no priority (unset).

### Status Workflow

```
open -> in_progress -> please_review -> resolved
                                    \-> wontfix
```

- **open** — newly submitted, awaiting triage
- **in_progress** — actively being worked on
- **please_review** — fix applied, awaiting verification
- **resolved** — confirmed fixed or implemented
- **wontfix** — declined (out of scope, by design, etc.)

Reporters can move their own reports to `resolved`. Admins can set any status.

### Comment System

Each report has a threaded comment section visible in the detail panel. Any authenticated user can post comments. Users can delete their own comments; admins can delete any comment. Comment counts are shown in the list view.

### Permission Model

| Action | Admin | Reporter (own report) | Other Users |
|---|---|---|---|
| Submit report | Yes | Yes | Yes |
| View all reports | Yes | Yes | Yes |
| Change status | Any status | Can resolve own | No |
| Set priority | Yes | No | No |
| Edit description | Yes | Own only | No |
| Post comment | Yes | Yes | Yes |
| Delete comment | Any comment | Own comments | Own comments |
| Delete report | Yes | No | No |

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/bug-reports` | List all bug/feature reports |
| POST | `/api/bug-reports` | Submit a new report (with optional screenshot) |
| PATCH | `/api/bug-reports/:id` | Update report fields (status, priority, description) |
| DELETE | `/api/bug-reports/:id` | Delete a report (admin) |
| GET | `/api/bug-reports/:id/screenshot` | Retrieve the report screenshot |
| GET | `/api/bug-reports/:id/comments` | List comments for a report |
| POST | `/api/bug-reports/:id/comments` | Add a comment |
| DELETE | `/api/bug-reports/:id/comments/:commentId` | Delete a comment (own or admin) |

### Migration

Migration `010_bug_tracker_upgrade.sql` adds `priority` and `updated_at` columns to `bug_reports`, and creates the `bug_report_comments` table with a foreign key cascade on report deletion.

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
cd dashboard-server
cp .env.example .env
# Edit .env with your DATABASE_URL
npm install
node init-db.js    # Create tables
node server.js     # Start server
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | HTTP port (default: 8888) |
| `SMTP_HOST` | No | Email server for password resets and notifications |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_FROM` | No | From address (default: noreply@nbi-consulting.com) |
| `APP_URL` | No | Public URL for email links (default: http://localhost:PORT) |

### Production (PM2)

```bash
npx pm2 start ecosystem.config.js
npx pm2 save
npx pm2 startup
```

## API Overview

All endpoints require authentication via Bearer token (from `/api/auth/login`) except `/api/health` and public report share links. `/metrics` is restricted to localhost only.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns session token |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/forgot-password` | Send reset email |

### Tasks / Work Items
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | List tasks (filterable by client, status, item_type) |
| POST | `/api/tasks` | Create task (admin) |
| PATCH | `/api/tasks/:id` | Update task fields (admin) |
| DELETE | `/api/tasks/:id` | Delete task + descendants (admin) |
| GET | `/api/sync/load` | Full data load (tasks, clients, settings) |
| POST | `/api/sync/changes` | Incremental sync (upsert/delete) |
| GET | `/api/sync/poll` | Poll for other users' changes |

### Finance
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/finance` | Get current finance data |
| PUT | `/api/finance` | Save finance data (optimistic concurrency) |

### Clients
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/clients` | List clients with task counts |
| POST | `/api/clients` | Create client |
| PATCH | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check (unauthenticated) |
| GET | `/metrics` | Prometheus metrics (unauthenticated) |
| GET | `/api/audit-log` | Audit trail with pagination |
| GET | `/api/backup` | Full database backup (admin) |
| POST | `/api/restore` | Restore from backup (admin) |

## Database Schema

Key tables: `users`, `sessions`, `tasks`, `task_notes`, `clients`, `contacts`, `client_notes`, `leads`, `expenses`, `expense_reports`, `bug_reports`, `notifications`, `settings`, `finance_data`, `audit_log`, `templates`, `attachments`, `comments`, `time_entries`.

Migrations are in `migrations/` and run automatically on server start via `runner.js`.

## Default Users

| Username | Password | Role |
|---|---|---|
| glen | nbi2026 | admin |
| tom | nbi2026 | admin |
| magnus | nbi2026 | member |

## File Structure

```
dashboard-server/
  server.js              # Orchestrator (~550 lines): deps, middleware, route mounting, re-exports
  init-db.js             # Database initialisation (CREATE TABLE)
  ecosystem.config.js    # PM2 configuration
  resilience.js          # Retry + circuit breaker utilities
  lib/
    logger.js            # Structured JSON logger
    db.js                # Pool creation, pg DATE type config
    helpers.js           # Item types, business days, buildPatchQuery, UUID validation, escHtml
    email.js             # MSAL + Graph API, sendEmailAsync, email HTML builders
    auth-middleware.js    # requireAuth/Admin/NBI, scopes, token cache, brute-force
    audit.js             # auditLog, sanitiseAuditData, computeNextRepeatDate
    notifications.js     # createNotification helper
    import-parser.js     # Excel/CSV parsing, format detection, row-to-task mapping
    metrics.js           # Prometheus counters, /metrics endpoint
    slack-bot.js         # Slack event handling
    sow-extractor.js     # SoW PDF text extraction
    redact-nbi-internal.js  # Client portal content redaction
    attachment-sweep.js  # Orphaned attachment cleanup logic
  routes/
    auth.js              # Login, logout, password reset, session management
    users.js             # User CRUD, skills, deactivation
    tasks.js             # Task CRUD, bulk import, comments, attachments, status cascades
    sync.js              # Incremental sync, polling, full data load
    documents.js         # Document CRUD, versioning (ETag), client portal redaction
    clients.js           # Client CRUD, research
    milestones.js        # Milestone CRUD per client
    sows.js              # SoW CRUD + PDF upload
    teams.js             # Team CRUD + membership
    contacts.js          # Contact CRUD per client
    client-notes.js      # Client notes CRUD
    calendar.js          # Calendar events, visibility model
    leads.js             # Leads pipeline, stages, forecast, activities
    expenses.js          # Expenses, OCR receipts, reports, export
    bugs.js              # Bug reports, comments, screenshots, kanban
    hiring.js            # Positions, candidates, CV upload
    reports.js           # Client status reports, HTML/PDF generation
    resource-planning.js # Capacity, deal-readiness
    dashboard.js         # Dashboard summary, snapshots
    admin.js             # Backup/restore, cleanse, import, health, audit log
    settings.js          # Settings GET/PUT
    finance.js           # Finance data GET/PUT
    time-entries.js      # Time entry CRUD + summary
    time-off.js          # Time-off CRUD
    queue.js             # Task queue CRUD
    notifications.js     # Notification CRUD
    templates.js         # Task template CRUD
    attachments.js       # Universal attachments (any entity type)
    slack.js             # Slack events endpoint
  cron/
    index.js             # All scheduled jobs + builder functions (PM report, due warnings,
                         #   inbound email, FX rates, cleanup, dashboard snapshot)
  migrations/
    runner.js            # Migration runner (auto-applies on start)
    001-043_*.sql        # Numbered migrations
  uploads/               # File attachments (auto-created)
nbi_project_dashboard.html  # Frontend SPA
```
