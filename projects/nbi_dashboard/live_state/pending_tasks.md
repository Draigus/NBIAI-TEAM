# Pending Tasks

Updated 2026-04-09 (Session C)

---

## Completed This Session

### Move-to-9 Improvement Plan -- DONE
- Sprint 1: Migration framework, DB pool 50, Prometheus metrics, retry/circuit breaker, backup validation
- Sprint 2: Response envelope (v2 header), cursor-based pagination (audit, leads, tasks)
- Sprint 3: IndexedDB WAL, native button elements
- Sprint 4: Integration testing (15/15 pass)

### Production Deployment -- DONE
- Cloudflare account created, nbi-consulting.com added
- Nameservers changed from GoDaddy to Cloudflare
- Named tunnel `nbi-worksage` created (ID: 2d70956e-f293-44e0-b333-a3a7482ab253)
- DNS CNAME route: worksage.nbi-consulting.com -> tunnel
- Tunnel running via PM2 (auto-restart, boot persistence)
- Waiting on DNS propagation

---

## Active

### DNS Propagation
- Nameservers changed from ns65/ns66.domaincontrol.com to amos/geen.ns.cloudflare.com
- Waiting for propagation (typically 15-30 min, up to 24h)
- worksage.nbi-consulting.com will be live once propagated
- Monitoring every 5 minutes

## On Hold

### SMTP Configuration
- Emails log to console (async, non-blocking)
- Needs Glen's SMTP provider details

### QuickBooks Time API Integration
- Blocked on Bryan Rasmussen's API token

### Excel Import Template
- NBI_Dashboard_Import_Template_v2.xlsx ready
- Needs Glen to populate with real project data and test import
