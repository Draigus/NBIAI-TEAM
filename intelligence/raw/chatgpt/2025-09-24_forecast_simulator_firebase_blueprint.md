---
source: chatgpt
source_id: chatgpt_68d3feee-11bc-832f-a4c9-f4ab09b8a7c1
source_path: D:\OneDrive\CHATGPT HISTORY\conversations.json
ingested: 2026-05-25
topics_detected: [forecast-simulator, firebase, sarge-universe, data-model, cohort-forecasting]
relevance_score: 8
novelty_score: 7
actionability_score: 7
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# Sarge Forecast Simulator: Firebase/Lovable Build Blueprint

## Key Content
Production-grade blueprint for building Sarge Universe forecast simulator as a web application. Two architecture options: Firebase native (Firestore, Cloud Functions, Hosting, Analytics to BigQuery) or Lovable front-end with Firebase backend. Firestore data model: 11 top-level collections (skus, battle_pass_plans, content_drops, tournaments, ua_campaigns, retention_models, pricing_priors, scenarios, sim_runs, sim_outputs_daily, sim_rollups). Event schema for Firebase Analytics to BigQuery with 9 key events (install, session_start, battle_outcome, tournament_event, iap_begin/purchase, pass_purchase, content_drop_seen/purchase, invite_sent/joined). Five forecast engine modules: (1) Acquisition with viral k-factor from Telegram frictionless starts. (2) Retention with cohort curves per channel/geo. (3) Monetisation per SKU family. (4) Economy sinks/sources. (5) Aggregation to MAU/ARPDAU/ARPPU/LTV. Sarge-specific inputs: HQ 1-10 with 4,300+ upgrades, 98 SKUs at launch, GBP4.99/GBP19.99 passes.

## Decisions / Insights
- Glen decided: forecast simulator should be a web application (Firebase or Lovable), not just Excel
- Glen decided: Firestore as system of record with BigQuery for heavy cohort maths and Monte Carlo
- Glen observed: Telegram frictionless start justifies modelling higher viral k-factor than App Store

## Context
Created September 2025 as the technical blueprint for building Sarge's forecast simulator as a product rather than a spreadsheet.

## Applicability
- Relevant when: building web-based forecast simulators for game products
- Relevant when: designing Firestore data models for game analytics
- Relevant when: specifying event schemas for game telemetry pipelines
