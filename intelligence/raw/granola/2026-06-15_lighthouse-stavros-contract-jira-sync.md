---
source: granola
source_id: not_Y7ABzYXliQDr15
source_path: https://notes.granola.ai/d/c3c11655-8ad4-4e4d-906a-b65372b46161
ingested: 2026-06-15
topics_detected: [embedded-consultant-resourcing, contract-rate, jira-integration, etl-pipeline, client-delivery]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [client_patterns, personal_insights]
new_bank_suggestions: []
sensitivity_class: restricted
extract_type: decision
---

# Lighthouse Weekly Sync (JF/GP): Stavros Contract Resourcing Decision and Jira Integration

## Key Content

Weekly sync between James Frith (Lighthouse Studios) and Glen Pryer, 15 June 2026.

**Build status:** Back in ETL/build mode; dashboards will be patchy. Root cause is upstream — production (Rachel) has not committed to what is fixed or when. Legal/PII scare from the prior week resolved: lawyers confirmed no PII is collected, data can be held internally, infrastructure unchanged. Cost ~2 days of scrambling across both teams.

**Stavros resourcing (critical decision pending):**
Stavros is significantly over-levelled for the analyst rate currently billed at Lighthouse. Glen is absorbing the rate difference and cannot sustain it indefinitely. Two options: (1) gross up the contract rate with Lighthouse, or (2) shift Stavros to a paying client where his level is properly compensated. Decision target: align before MS31 (July 10), decide by July 15. Glen raising with Justin Logan the same day.

**Jira integration:**
James working with Rachel to get bulk upload access in Jira (Claude-based process). Once confirmed, Glen can reshape the export file to any schema needed. Glen wants a weekly export for internal progress tracking without requiring direct Jira access. Sprint view exists in Glen's tooling but not yet enabled for Lighthouse. Plan: James shares sprint schema once upload is live; Glen enables it the next morning. First upload to be reviewed together the following week.

## Decisions / Insights

- [Glen] decided: Stavros resourcing must be resolved by July 15 — two options (rate gross-up vs. client shift); decision involves Justin Logan
- [Glen] observed: absorbing the rate differential for an over-levelled embedded analyst is not sustainable — this needs a commercial fix, not a workaround
- [Glen/James] agreed: weekly Jira export is the integration model — Glen reshapes export to any schema, no direct Jira access required
- [James] decided: chase Rachel for delivery commitment on what's fixed and by when before setting milestone targets
- [Glen] decided: sprint view will be enabled for Lighthouse the morning after James shares the sprint schema

## Context

Recurring weekly sync between Glen Pryer (NBI) and James Frith (Manager of Analytics, Lighthouse Studios), 15 June 2026. Lighthouse is an active embedded engagement — Amir, Ruan, and Stavros are NBI analysts embedded full-time at Lighthouse under a three-year contract. Stavros's skill level has diverged upward from the contracted analyst rate.

## Applicability

Relevant when: an embedded NBI analyst is delivering at a level above the contracted rate — commercial realignment options are gross-up (retain the client) or reassignment (protect NBI's margin).
Relevant when: a client's internal project management tool (Jira) needs to integrate with NBI's WorkSage — weekly export + schema reshape is the proven lightweight bridge.
Relevant when: a client's production team is blocking analytics work by not committing to a delivery schedule — the escalation path runs through the client-side analytics manager to production.
Relevant when: a legal/PII concern arises on a data analytics engagement — NBI's precedent is: lawyers resolve it, no infrastructure change, cost is downtime rather than liability.
