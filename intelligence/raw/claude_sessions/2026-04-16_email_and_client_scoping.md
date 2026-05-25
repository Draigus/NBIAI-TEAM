---
source: claude
source_id: handoff_2026-04-16b_full_day
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-16b_full_day.md
ingested: 2026-05-25
topics_detected: [email-integration, client-scoping, multi-tenancy, microsoft-graph]
relevance_score: 8
novelty_score: 8
actionability_score: 7
bank_candidates: [production_methods, personal_insights]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# Email System and Client-Scoped Multi-Tenancy

## Key Content

Email integration uses Microsoft Graph API (not SMTP -- Azure Security Defaults block SMTP AUTH). Shared mailbox nbihub@nbi-consulting.com with Azure AD app permissions Mail.Send + Mail.Read. Three email features: PM daily report (08:00 weekdays), due/late ticket warnings (09:00 weekdays), and inbound email-to-task matching (polls every 10min, fuzzy matches subject to client/task). Client-scoped users (migration 026) allow external contacts to see only their client's data -- Lorenza test user created for Couch Heroes. Internal users with teams see only their team's clients + NBI OPS + Playsage. Admins unrestricted. 40+ endpoints scoped via getClientScopes().

## Decisions / Insights

- Microsoft Graph API is the only viable email transport when Azure Security Defaults are enabled
- Inbound email-to-task uses fuzzy subject matching with verify/confirm/reassign workflow
- Client scoping: external users = their client only, internal with teams = team clients + shared, admin = all
- D88: Magnus promoted to admin with systemic permissions
- D89: Warnings/alerts are user-specific (no admin firehose)
- D90: PostgreSQL DATE columns must return raw YYYY-MM-DD strings (pgTypes.setTypeParser 1082) to avoid timezone drift

## Context

This established the multi-tenancy model for WorkSage. The client scoping pattern applies to all data endpoints.

## Applicability

- All new endpoints must call getClientScopes() for data filtering
- Email sending always uses Graph API via the nbihub mailbox, never SMTP
- DATE columns need pgTypes parser to prevent timezone conversion
- External user access patterns must be tested with the Lorenza account
