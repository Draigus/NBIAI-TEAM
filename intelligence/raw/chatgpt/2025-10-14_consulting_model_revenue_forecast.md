---
source: chatgpt
source_id: chatgpt_68ede5cf-9810-8333-a4da-c56222ef7d17
source_path: D:\OneDrive\CHATGPT HISTORY\conversations.json
ingested: 2026-05-25
topics_detected: [forecast-modelling, revenue-recognition, cohort-analysis, subscription-vs-premium, consulting-deliverable]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [forecast_models, client_patterns]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Revenue Forecast Model Spec: Premium/Sequel vs Hybrid F2P+Subscription

## Key Content
Scope for a 60-month dual-path forecast model comparing Premium Sequel vs Hybrid (F2P + Subscription + Premium) paths. Requirements: cohorted by acquisition source (paid/organic/social/referrals), monthly retention/returner curves, cross-path migration (F2P to Premium, F2P to Subscription). Player segmentation into Bingers, Grazers, Long-Haulers with movement tracking and segment-specific spend. Revenue recognition mechanics: subscription ratable monthly/annual, packs recognised on delivery, MTX point-in-time, full deferred revenue rollforward. Monetisation streams: Drivers Club (monthly/annual sub), Quarterly Packs, cosmetic MTX, convenience/QoL, store discounts/tokens, vault tokens/redemption. Key model questions: at what thresholds does Hybrid beat Sequel on recognised revenue? What F2P-to-premium conversion rate by month? What tenure mix yields stable recurring revenue? What 5-7 KPIs best predict success of adding F2P/Subscription?

## Decisions / Insights
- Glen decided: NBI can deliver this type of complex revenue forecast model as a consulting engagement
- Glen decided: model must distinguish bookings vs recognised revenue vs cash receipts with full deferral schedules
- Glen observed: the model must answer "under what thresholds does Hybrid beat Sequel" as the key strategic question

## Context
Scoped October 2025 for an unnamed racing game client considering whether to add F2P/subscription to a premium sequel strategy. Demonstrates NBI's capability for complex revenue modelling work.

## Applicability
- Relevant when: a client is evaluating hybrid monetisation models (premium + F2P + subscription)
- Relevant when: building forecast models that need revenue recognition mechanics (ASC 606)
- Relevant when: modelling player tenure archetypes and their impact on revenue stability
