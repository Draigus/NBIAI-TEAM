# Session Handoff -- 2026-04-09a (Move to 9/10)

## Session Overview
Executed the "Move to 9" plan -- 9 architectural improvements across 4 sprints. All items from the "What Would Move It to 9" list implemented. Full integration test suite (15 tests) passes. Every sprint committed with rollback points.

## Server State
- **Port:** 8888 (PM2, auto-restart, Windows boot persistence)
- **PM2 config:** `dashboard-server/ecosystem.config.js`
- **Server:** `dashboard-server/server.js` (4,732 lines, was 4,511)
- **Frontend:** `nbi_project_dashboard.html` (12,441 lines, was 12,334)
- **DB pool:** min 5, max 50 (was min 2, max 20)
- **Rate limiting:** per-user 60 req/min (was global 120 req/min)
- **Metrics:** `http://localhost:8888/metrics` (Prometheus format)

## What Was Built

### Sprint 1 -- Backend Infrastructure (commit 4f587b8)

**1A. Migration Framework**
- `dashboard-server/migrations/runner.js` -- scans for numbered SQL files, tracks applied versions in `schema_migrations` table
- 7 SQL migration files (001-007) covering all schema, indexes, seeds
- First-run detection: existing DB has all migrations marked as applied
- Replaces inline auto-migration IIFE in server.js

**1B. DB Pool + Per-User Rate Limiting**
- Pool: min 5, max 50 connections (was 2/20)
- Per-user rate limiting keyed by `hashToken(bearerToken)` or IP fallback
- 60 req/min per user (was 120 global)
- Auth limiter unchanged (30 req/15min on login)

**1C. Prometheus Metrics**
- `prom-client` dependency added
- `nbi_http_request_duration_seconds` histogram (method, route, status)
- `nbi_http_requests_total` counter
- `nbi_db_pool_connections` gauge (total, idle, waiting -- polled every 15s)
- Custom counters: sync_conflicts, auth_failures, ocr_requests, email_sends
- Unauthenticated `/metrics` endpoint

**1D. Retry + Circuit Breaker**
- `dashboard-server/resilience.js` with `withRetry()` (exponential backoff) and `CircuitBreaker` class
- OCR.space: circuit breaker (3 failures, 60s reset) + retry (2 attempts, 2s backoff)
- Frankfurter FX: circuit breaker (3 failures, 300s reset) + retry (3 attempts, 1s backoff) + 10s timeout
- Email: retry (2 attempts, 2s backoff)
- Prometheus counters incremented on retry/failure

**1E. Backup Validation**
- `dashboard-server/backup-validate.js` -- validates JSON integrity, table completeness (7 tables), row count drift (>10% triggers warning), upload manifest presence
- Backup cron validates after each run, creates admin notification on failure
- Restore endpoint expanded to handle all 7 tables (was 4)
- User passwords never restored (safety)
- Audit log restore is append-only

### Sprint 2 -- Response Envelope + Cursor Pagination (commit 55a3134)

**2A. Response Envelope**
- Server middleware wraps responses in `{ data, error, meta }` when client sends `X-API-Version: 2`
- v1 responses completely unchanged (backward compat)
- Pagination fields (`total`, `limit`, `offset`, `nextCursor`, `hasMore`) promoted to `meta`
- Frontend `apiCall()` helper auto-unwraps v2 envelope
- 37 GET endpoints migrated from `authFetch()` to `apiCall()`
- 76 complex calls left on `authFetch()` (writes, sync, uploads, auth)

**2B. Cursor-Based Pagination**
- GET /api/audit-log: cursor on `created_at` DESC
- GET /api/leads: cursor on `created_at` DESC
- GET /api/tasks: cursor on `updated_at` ASC
- All return `nextCursor` + `hasMore`
- OFFSET kept as fallback for backward compatibility

### Sprint 3 -- Frontend Resilience (commit 43fea49)

**3A. IndexedDB Write-Ahead Log**
- `nbi_dashboard` IndexedDB with `wal` and `data_cache` object stores
- WAL entries track dirty/deleted tasks with timestamps
- Dual-write: save() writes to both localStorage AND IndexedDB
- WAL recovery on startup: checks for uncommitted changes, merges with timestamp comparison
- WAL cleared after successful sync
- Full tasks + settings cached in IndexedDB (50MB+ quota vs 5-10MB localStorage)
- Toast notification when changes recovered from previous session

**3B. Native Button Elements**
- 6 `<div role="button">` converted to native `<button>`:
  - Sidebar toggle (static HTML)
  - sidebarItem() function (dynamic)
  - 3 inline sidebar items (NBI Portfolio, client filters, health filters)
  - Standup collapsible section
- `role="button"`, `tabindex="0"`, and `onkeydown` handlers removed (native on buttons)
- CSS reset added for button elements in sidebar context

### Sprint 4 -- Integration Testing
- 15-test suite: health, login (admin+member), page load, Prometheus metrics, tasks (v1+v2+cursor), clients, leads, finance, sync poll, backup, non-admin write block, input validation, migration status, error log check
- All 15 pass
- Zero error log entries

## Git Commit History
```
43fea49 Sprint 3: IndexedDB write-ahead log + native button elements
55a3134 Sprint 2: Response envelope standardisation + cursor-based pagination
4f587b8 Sprint 1: Migration framework, pool scaling, Prometheus, retry/circuit breaker, backup validation
beb086e Dashboard: 6-sprint comprehensive improvement (audit 6.6 to 7.3)
```

## Rollback Points
- Pre-Sprint 1: `beb086e` + `backups/pre_sprint1_2026-04-08.json`
- Pre-Sprint 2: `4f587b8`
- Pre-Sprint 3: `55a3134`
- Current: `43fea49`

## New Files Created
- `dashboard-server/migrations/runner.js`
- `dashboard-server/migrations/001_initial_schema.sql` through `007_notifications_index.sql`
- `dashboard-server/resilience.js`
- `dashboard-server/backup-validate.js`
- `dashboard-server/ecosystem.config.js`

## New Dependencies
- `prom-client` (^15.1.3) -- Prometheus metrics

## Production Deployment (added post-sprints)

### Cloudflare Tunnel Setup
- **Product name:** NBI WorkSage
- **URL:** https://worksage.nbi-consulting.com/nbi_project_dashboard.html
- **Tunnel name:** nbi-worksage
- **Tunnel ID:** 2d70956e-f293-44e0-b333-a3a7482ab253
- **Credentials:** `C:\Users\gpbea\.cloudflared\2d70956e-f293-44e0-b333-a3a7482ab253.json`
- **Config:** `C:\Users\gpbea\.cloudflared\config.yml`
- **DNS:** CNAME `worksage.nbi-consulting.com` -> tunnel UUID
- **Managed by:** PM2 (process name: `cloudflare-tunnel`)
- **Cost:** Free (Cloudflare free tier)

### DNS Change
- Domain: nbi-consulting.com (registered at GoDaddy)
- Nameservers changed from `ns65/ns66.domaincontrol.com` to `amos/geen.ns.cloudflare.com`
- All existing DNS records (A, CNAME, MX, SRV, TXT) auto-imported by Cloudflare
- Framer website (www CNAME) preserved
- Microsoft 365 records (autodiscover, enterprise*, lyncdiscover, sip) preserved

### PM2 Processes
```
pm2 status
┌──────────────────────┬──────┬────────┐
│ name                 │ id   │ status │
├──────────────────────┼──────┼────────┤
│ nbi-dashboard        │ 0    │ online │
│ cloudflare-tunnel    │ 1    │ online │
└──────────────────────┴──────┴────────┘
```

### Architecture
```
Internet -> worksage.nbi-consulting.com
         -> Cloudflare DNS (CNAME to tunnel)
         -> Cloudflare Tunnel (encrypted QUIC)
         -> Glen's PC (localhost:8888)
         -> PM2 -> Node.js server
         -> PostgreSQL (localhost:5432)
```

## File Locations
- Dashboard HTML: `nbi_project_dashboard.html` (root, 12,441 lines)
- Server: `dashboard-server/server.js` (4,732 lines)
- Migrations: `dashboard-server/migrations/`
- Resilience: `dashboard-server/resilience.js`
- Backup validation: `dashboard-server/backup-validate.js`
- PM2 config: `dashboard-server/ecosystem.config.js`
- Cloudflare config: `C:\Users\gpbea\.cloudflared\config.yml`
- Tunnel credentials: `C:\Users\gpbea\.cloudflared\*.json`
