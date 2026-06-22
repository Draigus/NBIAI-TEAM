---
source: granola
source_id: granola_0aea306a
source_path: granola://meetings/0aea306a-e6e9-4158-8f5a-b3237f81700a
ingested: 2026-06-11
topics_detected: [lighthouse-tencent, gcp-migration, publisher-data-control, analytics-strategy]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [client_patterns, forecast_models]
new_bank_suggestions: [publisher-leverage-playbook]
sensitivity_class: internal
extract_type: decision
---

# Lighthouse: Tencent Forcing Snowflake→GCP Migration — Strategy and Costs

## Key Content

Tencent requiring Lighthouse to migrate from Snowflake to GCP, framed as GDPR/PII compliance. Legal team wants all data routed through Tencent's infrastructure first, with PII stripped before studio receives raw data; no direct telemetry access. Cost breakdown: ~$90k total ($56k already spent on Snowflake build over 6 months, $30–40k to rebuild in GCP). Snowflake system must stay live through transition as fallback. GCP constraints: raw data minus PII only, no data egress from GCP ecosystem, custom dashboard must use Tencent's "Data Brain" or Google Analytics/Looker at significant cost. Justin's negotiation position: contract may require Tencent to disclose migration requirement and potentially reimburse $90k. Key SLA requirements to demand: near real-time data velocity guarantees, complete raw data access timeline, dedicated GCP workspace with structural control. Studio views this as Tencent positioning for eventual acquisition — best outcome for studio team may be transition to Tencent employment; studio data function would likely be eliminated post-acquisition.

## Decisions / Insights

- [Justin] decided: pushback is firm — raw data access is non-negotiable
- [Glen] concluded: itemised $90k cost breakdown needed as negotiation leverage with Tencent
- [Glen/Justin] concluded: Snowflake stays live until GCP port complete, despite Tencent urgency
- [Glen] observed: data-hiding via legal compliance framing is a classic publisher acquisition positioning move

## Context

Check-in call, Glen Pryer and Justin Logan (Director of Live Games, Lighthouse Studios), 5 June 2026. Part of ongoing Lighthouse embedded analytics engagement (Amir, Ruan, Stavros).

## Applicability

- Relevant when: advising a studio on publisher-mandated infrastructure changes (evaluate true cost and contract leverage)
- Relevant when: negotiating data-access SLAs with a Chinese publisher in a Western studio context
- Relevant when: preparing a cost-recovery bill against a publisher for compliance-mandated rework
- Relevant when: structuring analytics deliverables where publisher controls the data pipeline
