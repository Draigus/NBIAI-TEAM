# NBI WorkSage Dashboard

Project management dashboard for NBI Analytics Ltd. Single-page application with Express.js backend and PostgreSQL database.

**Production:** https://worksage.nbi-consulting.com
**Local:** http://localhost:8888/nbi_project_dashboard.html

## Architecture

- **Frontend:** `nbi_project_dashboard.html` — monolithic SPA with inline CSS and JS (~12,800 lines)
- **Backend:** `server.js` — Express.js REST API (~4,900 lines)
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

Each item has an `item_type` field (`project`, `feature`, `story`, `task`). Type rules are enforced on creation, drag-and-drop, and reparenting. Items with incomplete prerequisites cannot be marked as Done.

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

All endpoints require authentication via Bearer token (from `/api/auth/login`) except `/api/health` and `/metrics`.

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
  server.js              # Main Express server
  init-db.js             # Database initialisation (CREATE TABLE)
  ecosystem.config.js    # PM2 configuration
  resilience.js          # Retry + circuit breaker utilities
  backup-validate.js     # Backup integrity checker
  migrations/
    runner.js            # Migration runner (auto-applies on start)
    001-008_*.sql        # Numbered migrations
  uploads/               # File attachments (auto-created)
nbi_project_dashboard.html  # Frontend SPA
```
