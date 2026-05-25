---
source: claude
source_id: handoff_2026-04-09a_move_to_nine
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-09a_move_to_nine.md
ingested: 2026-05-25
topics_detected: [production-deployment, infrastructure, cloudflare-tunnel, prometheus]
relevance_score: 8
novelty_score: 8
actionability_score: 7
bank_candidates: [production_methods, personal_insights]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# WorkSage Production Architecture: PC as Server

## Key Content

Glen's PC serves as the production server for WorkSage. Architecture: Internet > worksage.nbi-consulting.com > Cloudflare DNS (CNAME to tunnel) > Cloudflare Tunnel (encrypted QUIC) > Glen's PC (localhost:8888) > PM2 > Node.js > PostgreSQL. Free Cloudflare tier. DNS moved from GoDaddy to Cloudflare nameservers. All existing DNS records (A, CNAME, MX, SRV, TXT for Microsoft 365, Framer website) auto-imported. PM2 manages both nbi-dashboard and cloudflare-tunnel processes.

Technical upgrades: migration framework (runner.js + numbered SQL files), DB pool scaled to min 5/max 50, Prometheus metrics on /metrics, retry with circuit breaker on OCR/FX/email, backup validation, response envelope with X-API-Version:2, cursor-based pagination, IndexedDB write-ahead log for crash recovery.

## Decisions / Insights

- D66: Production URL is worksage.nbi-consulting.com
- D67: Glen's PC as production server -- free, controlled, adequate for internal tool
- Cloudflare free tier provides tunnel, DNS, SSL, and DDoS protection at zero cost
- Migration framework with version tracking in schema_migrations table is essential infrastructure
- Circuit breaker pattern (3 failures, 60s reset) prevents cascading failures on external APIs
- IndexedDB WAL provides crash recovery beyond localStorage's 5-10MB limit (50MB+ quota)

## Context

This is NBI's production hosting model. The PC-as-server decision means all infrastructure is self-hosted with zero recurring cost.

## Applicability

- Cloudflare Tunnel + PM2 is a viable zero-cost hosting pattern for internal tools
- Any new service must register in PM2 and be added to the tunnel config
- Circuit breaker pattern should be applied to all external API integrations
- Migration runner pattern (numbered SQL files + version table) is the standard for schema changes
