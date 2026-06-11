---
source: granola
source_id: granola_80731373
source_path: granola://meetings/80731373-d5ad-47b7-83d6-8795c98f4ad9
ingested: 2026-06-11
topics_detected: [lighthouse-tencent, gcp-migration, analytics-infrastructure, data-engineering]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [client_patterns, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# Lighthouse GCP Migration — Technical Scope, Sequencing, and Parallel Workstream

## Key Content

Solo planning session on GCP migration technical details. Tencent forced Snowflake→GCP move; not required to use Tencent's Databrain event storage stack (just needs to run on GCP — simplifies scope considerably). Key technical costs: no analog to Snowflake's dynamic tables in BigQuery — requires dedicated orchestration layer from scratch (~2+ weeks infra work). dbt is not native to GCP; Dataform is — need to evaluate quickly; risk of losing declarative table maintenance, falling back to manual merge/upsert. Backend (Fedge and Lewis's team) currently sends data via AWS Firehose → S3 → Snowflake; new GCP ingestion path needed. Ron has extensive GCP experience; Glen has none. Sequencing: ETL work blocked until new GCP infra ready. Playtest dates unchanged (internal next week; TC playtests August, September, November). Parallel workstream while infra rebuilds: write SQL and stub empty schemas now (~60–70% completable), build dashboards from front end working backward using stubbed data. Minimal rework once real telemetry flows. Snowflake stays live until GCP port complete but has a hard clock (Tencent pushing for days; realistic target weeks). ~40 uninstrumented events, ~20 events still buggy.

## Decisions / Insights

- [Glen] confirmed: not required to use Databrain; just need GCP runtime — scope significantly smaller
- [Glen/Ron] decided: parallel workstream — write SQL stubs and front-end dashboards while infra rebuilds
- [Glen] concluded: dbt vs Dataform evaluation is the critical early technical decision
- [Glen] decided: Snowflake stays live as fallback; calculate all build spend to bill back to Tencent
- [Glen] decided: Mags to document milestone deliverables per playtest date while backlog is reorganised

## Context

Solo planning session, 4 June 2026. Glen's technical debrief on GCP migration requirements after Justin's directive.

## Applicability

- Relevant when: migrating analytics infrastructure from Snowflake to BigQuery under publisher pressure
- Relevant when: choosing between dbt and Dataform for a GCP-native data transformation layer
- Relevant when: maintaining delivery timelines during forced infrastructure migrations (parallel stub strategy)
- Relevant when: calculating publisher-mandated migration costs for billing back to the commissioning party
