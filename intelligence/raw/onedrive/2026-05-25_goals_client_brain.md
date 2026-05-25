---
source: onedrive
source_id: goals_client_brain_2026-05-12
source_path: Clients/Goals/CLIENT_BRAIN.md
ingested: 2026-05-25
topics_detected: [client-knowledge, f2p-football, game-economy, beta-metrics, live-ops]
relevance_score: 10
novelty_score: 7
actionability_score: 8
bank_candidates: [client_patterns, forecast_models, industry_current]
new_bank_suggestions: [client_goals]
sensitivity_class: client_scoped
extract_type: data_point
---

# PlayGOALS Beta Performance and Economy Design Data

## Key Content

PlayGOALS March 2026 beta: 220K installs, 832K 1v1 matches, 36% D1 retention overall (34% PS5, 37% Steam), 57 min avg daily playtime, 4.6 matches/day, CPI reduced from $3.61 to $0.43 (88% reduction). Discord grew 77.4% to 26,688. NPS +24.6 (40% promoters). Dual currency: hard currency (coins, real money only) and soft currency (points, gameplay earned). Marketplace 10% tax as sink. 7-tier player rarity (Basic 40-59 OVR through Mythic 95-99). Aging system: players enter at 18, age one year per two real-life weeks, retire 32-41. Revenue model: 805K MAU (3.6x beta), 10.4% payer rate, ARPU $3.38, ARPPU $32.48, projected $2.72M total. Three personas: Core FUT (20% pop, 30% paying, $46 ARPPU), Dedicated FUT (35%, 10%, $15.81), Casual FUT (45%, 2%, $7.24). Critical friction: defensive AI (2.54/5 lowest), passing system (40% cited as top disappointment), stability (36 crash bugs).

## Decisions / Insights

- GOALS decided: non-seasonal design philosophy is fixed constraint (no annual reset)
- GOALS decided: aging system is primary demand sink for economy
- NBI identified: D1 retention discrepancy -- SOW cited 50% on PlayStation, actual data shows 34%
- NBI identified: 12 open questions including MAU basis, payer rate timing, starter pack feasibility
- NBI observed: top 3 packs = 66.7% of revenue despite 14.2% of volume (heavy concentration)

## Context

CLIENT_BRAIN.md compiled 2026-05-12 from 28 source files by /compile-client skill. GOALS AB (Stockholm, Sweden), CEO Jonas Rundberg. MSA with NBI LLC signed 8 April 2026, SOW 1 at 100K SEK for pricing benchmarking. Global launch target 14 May 2026.

## Applicability

- Relevant when: benchmarking F2P sports game beta metrics (retention, CPI, engagement)
- Relevant when: designing dual-currency economies with aging/sink mechanics
- Relevant when: modelling revenue for F2P games with three-persona segmentation
- Relevant when: identifying critical UX friction points from beta community sentiment data
