---
source: claude
source_id: handoff_2026-04-18_worksage_audit_sprint
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-18_worksage_audit_sprint.md
ingested: 2026-05-25
topics_detected: [vocabulary, nbiai-app-archived, security-audit, credential-management]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# WorkSage Vocabulary Reset and nbiai_app Archive

## Key Content

Glen's own words: "I don't really give a shit about the paperclip stuff. I only care about WorkSage, which I'm calling the NBI Hub." The separate Fastify + React app (projects/nbiai_app) was moved to _archive/nbiai_app/ and its PM2 process deleted. "NBI Hub" in Glen's language = WorkSage = worksage.nbi-consulting.com. The audit sprint landed 9 security commits including: safeUrl() helper blocking javascript:/data:/vbscript: in href contexts, sync endpoint scoping via getClientScopes(), bank statement leak removal from expense exports, news sidecar token authentication via timingSafeEqual, AbortController per-stage timeouts on Anthropic calls, and failover latch with 6-hour auto-reset. Critical remaining: credential rotation (secrets in OneDrive-synced path) and session cookie migration from localStorage to HttpOnly.

## Decisions / Insights

- "NBI Hub" = WorkSage = the dashboard. NOT projects/nbiai_app/ which is archived dead code
- Glen's hard verification rule: verify in a real browser against worksage.nbi-consulting.com, not curl
- Secrets in OneDrive-synced paths need rotation and relocation to non-synced directory
- safeUrl() is the correct pattern for user-controlled href contexts (blocks javascript:, allows http/https/mailto/tel)
- timingSafeEqual for internal service authentication prevents timing attacks
- Failover latches should auto-reset (6-hour cooldown) rather than staying latched permanently

## Context

This vocabulary confusion had caused wasted work in previous sessions. The distinction is now canonical.

## Applicability

- Always use "WorkSage" when discussing the dashboard -- never confuse with the archived nbiai_app
- All user-controlled URLs must go through safeUrl(), not esc()
- Internal service tokens must use timingSafeEqual comparison
- Credential rotation is a standing TODO -- secrets should not live in OneDrive-synced paths
