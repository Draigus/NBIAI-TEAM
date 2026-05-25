---
source: chatgpt
source_id: chatgpt_68efb4be-13dc-832d-81c3-bdc3fc6dc7a2
source_path: D:\OneDrive\CHATGPT HISTORY\conversations.json
ingested: 2026-05-25
topics_detected: [sarge-universe, forecast-model, dau-mau, arpu, retention-curves, ua-planning]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# Analyst-Grade Forecast Model Blueprint for F2P Game Launch

## Key Content
Complete forecast model structure for a Telegram F2P game launch with six sheets: Inputs/Overview, Retention Curve, UA Plan, Daily Forecast, Monthly Summary, Yearly Summary. Retention uses piecewise power model with D1/D7/D30 anchors (Base: 45%/22%/13%). UA plan has tiered daily budgets (GBP15k day 1, GBP8k days 2-7, GBP4k days 8-30, GBP2.5k day 31+) across channels with CPI targets (Telegram GBP0.60, Influencer GBP1.20, Web Ads GBP1.80). Organic viral K-factor 0.15 with 14-day half-life decay. Daily forecast uses cohort summation via SUMPRODUCT for DAU calculation. ARPDAU adjusted by fortnightly event flags (15-20% uplift) and holiday bumps (30%). Net revenue computed via weighted platform fee blend across Telegram/Web/Other channels.

## Decisions / Insights
- Glen decided: no rewarded video ads inside mobile launch build; ads only through browser partners
- Glen decided: weekend event cadence every two weeks with 15-20% ARPDAU uplift as standard
- Glen decided: revenue flow split at 45% Telegram / 35% Web / 20% Other for platform fee netting
- Glen observed: CPI guardrail of USD2.50 or less from GTM actions document

## Context
Created October 2025 as the detailed analytical forecast underpinning Sarge Universe launch planning. Blueprint designed for Excel implementation with exact formulas provided.

## Applicability
- Relevant when: building cohort-based daily forecast models for F2P game launches
- Relevant when: setting retention curve anchors and UA budget tiers for Telegram games
- Relevant when: modelling event-driven ARPDAU uplifts in live service forecasts
- Relevant when: computing net revenue across multiple payment platforms with different fee structures
