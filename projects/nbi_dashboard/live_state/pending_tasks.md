# Pending Tasks

Updated 2026-04-08 (Session B)

---

## Completed This Session

### 6-Sprint Comprehensive Improvement -- DONE
- Sprint 1: Foundation (logging, indexes, validation, error sanitisation, PM2 config)
- Sprint 2: Security (token hashing, escAttrJs XSS fixes, audit redaction, expense approver from DB, atomic user creation)
- Sprint 3: Backend performance (PATCH consolidation, N+1 fixes, poll pagination, async email, cache invalidation, FX auto-refresh)
- Sprint 4: Frontend architecture (renderAll decomposition 106→16, listener registry, undo improvement)
- Sprint 5: Frontend UX (conflict modal, offline indicator, localStorage quota, responsive fixes)
- Sprint 6: Operations (backup manifest, PATCH validation, performance timing, dead code removal)

### Mobile Overhaul -- DONE
- Header restructured with overflow menu
- Sidebar forced single-column with slide-in animation

### Excel Import Template -- DONE
- NBI_Dashboard_Import_Template_v2.xlsx with Tasks, Leads, Clients, Reference sheets

---

## Still Queued (What Would Move to 9/10)

### Architecture
- Formal migration framework (version table + numbered SQL files)
- Cursor-based pagination (replace OFFSET with keyset)
- Response envelope standardisation ({ data, error, meta })
- Native `<button>` elements replacing `<div role="button">`

### Scaling
- DB pool increase (20 → 50+ connections)
- Per-user rate limiting (replace global 120 req/min)
- Redis for distributed session/cache layer
- Read replicas for reporting queries

### Reliability
- Retry + circuit breaker for OCR, email, FX integrations
- Write-ahead log (IndexedDB for offline durability)
- Automated backup validation (test-restore on schedule)

### Monitoring
- Prometheus metrics (request latency, error rates, pool usage)
- Alerting on backup failure, DB down, error spikes

## On Hold

### Permanent Cloudflare Tunnel
- Quick tunnel works but URL changes on restart
- Needs Glen's Cloudflare account + domain

### SMTP Configuration
- Emails log to console (async, non-blocking)
- Needs Glen's SMTP provider details

### QuickBooks Time API Integration
- Blocked on Bryan Rasmussen's API token
