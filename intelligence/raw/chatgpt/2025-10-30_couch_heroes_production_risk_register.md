---
source: chatgpt
source_id: chatgpt_69034e5d-5c84-832d-b32c-5666d87cd706
source_path: D:\OneDrive\CHATGPT HISTORY\conversations.json
ingested: 2026-05-25
topics_detected: [couch-heroes, production-risk, single-producer, mmo-lite, studio-operations]
relevance_score: 10
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: insight
---

# Production Risk Assessment: 50-Person Studio with Single Producer

## Key Content
Fifteen production risks identified for a ~50-person studio building an MMO-lite with a single producer. Top risks in priority order: (1) Single-producer bottleneck causing decision latency and missed handoffs. (2) Product-platform scope coupling where game and platform compete for same capacity without hard slice boundaries. (3) Integration and release instability across UE5 client, dedicated servers, patcher, and microservices. (4) Server topology uncertainty with sharding, layering, instancing creating unpredictable CCU distribution. (5) Cross-discipline content pipeline fragility. (6) Implicit dependency mapping discovered late. (7) QA under-resourcing with no test matrices. (8) Telemetry and KPI blindness. (9) Partner integration volatility. (10) Cross-play compliance deferral risk.

## Decisions / Insights
- Glen observed: one producer cannot sustainably coordinate game content, platform work, backend services, build pipelines, playtests, partners, and vendors simultaneously
- Glen observed: platform work starves playable arc when both compete for same engineering and art capacity without firm slice boundaries
- Glen observed: milestone optics vs reality drift is a credibility risk when capture builds diverge from true build health
- Glen observed: decision rights and governance ambiguity causes re-litigation of approved work and stealth branches

## Context
Produced October 2025 during NBI's assessment of Couch Heroes' production setup. Glen requested problems only, no mitigations. This formed part of the diagnostic that led to the SoW engagement.

## Applicability
- Relevant when: assessing production health of a 30-60 person game studio with thin production staffing
- Relevant when: scoping NBI consulting engagements around production methodology
- Relevant when: advising studios that are simultaneously building a game and a platform
- Relevant when: identifying red flags in MMO-lite or live-service production pipelines
