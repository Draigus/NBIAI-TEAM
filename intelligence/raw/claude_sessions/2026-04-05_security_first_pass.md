---
source: claude
source_id: handoff_2026-04-05a_leads_expenses_qa
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-05a_leads_expenses_qa.md
ingested: 2026-05-25
topics_detected: [security, crm-design, data-driven-config]
relevance_score: 7
novelty_score: 7
actionability_score: 7
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# CRM Design Decisions and Security Discovery

## Key Content

Glen's CRM/Leads tracker decisions reveal his management philosophy: everything data-driven with no hardcoded values (D3), deal owners limited to Glen and Tom only (D5), win probability always manual never auto-calculated (D6), closed deals always visible (D9), no Excel import for leads -- manual entry only (D10). Security review discovered the Express static middleware was exposing the entire parent directory including CLAUDE.md, .env, and all project files. Path traversal on attachments had no validation. User CRUD and backup/restore had no admin role checks. These were all fixed.

## Decisions / Insights

- Glen insists on manual control over probability estimates -- he does not trust algorithmic scoring
- Deal ownership is deliberately restricted to principals (Glen/Tom), not delegated to analysts
- "Everything data-driven" = pipeline stages, field options, resource types, sectors all from DB, never code
- Security must be reviewed after every major feature build -- the static middleware exposure was critical
- Glen prefers manual data entry for leads over bulk import -- he wants to touch each entry

## Context

First CRM feature build. Also the first serious security review, which found multiple critical issues.

## Applicability

- Any new feature with configurable options should store them in the database, not hardcode
- Security reviews must check static file serving, path traversal, and RBAC on every endpoint
- Glen's control preference means auto-calculated fields should always have a manual override
