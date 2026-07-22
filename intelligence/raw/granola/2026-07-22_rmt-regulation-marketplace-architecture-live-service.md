---
source: granola
source_id: not_GyjlUflBirp2Ab
source_path: https://notes.granola.ai/d/66d9615e-69f3-49b5-b980-ba8151ea7f56
ingested: 2026-07-22
topics_detected: [rmt, marketplace, live-service-economy, regulation, ip-trading]
relevance_score: 9
novelty_score: 8
actionability_score: 8
bank_candidates: [forecast_models, client_couch_heroes]
new_bank_suggestions: [games_design]
sensitivity_class: internal
extract_type: methodology
---

# RMT Regulation and Marketplace Architecture for Live-Service Games

## Key Content

Two distinct marketplace models can coexist in a live-service game economy:
1. Direct store purchase: players buy assets from a partner's store page (no player-to-player trade)
2. Auction house: players trade items with a revenue cut to the studio

Regulatory boundary that determines liability:
- Player trades item for in-game currency only: no taxation, no regulatory issue
- Player trades item for real-world money (RMT): triggers IFRS-style regulation; studio becomes bank of record, liable for fraud and financial compliance

Studio's firm position: never become the bank of record for real-money player-to-player trades.

Fraud risk profile: off-ramp (converting in-game value to real-world cash) is the highest fraud vector -- not money sitting inside the closed system. Preferred architecture: closed-gate systems (Steam Wallet model -- money stays in-system and cannot be converted to external currency).

Architecture requirements for any item trading system:
- Consumable vs durable item distinction enforced in data model
- Full item provenance tracking (history of who owned what and when)
- Revenue cut mechanism on every auction house transaction

## Decisions / Insights

- Glen decided: the studio will never become the bank of record for real-money player-to-player trades -- this is a hard architectural constraint, not a preference
- Glen identified: the off-ramp is the fraud risk, not the closed economy; a Steam Wallet-style closed gate eliminates the highest risk category
- Glen confirmed: direct store purchase and auction house can coexist -- they are not mutually exclusive models
- Glen deferred: final complexity decision (whether to implement full auction house vs direct-store-only) depends on time and build stage at implementation

## Context

Design direction debrief following a game direction session at a 55-70 person studio developing a live-service MMO. CPO (Glen) clarified the marketplace architecture position after a misunderstanding about whether player-to-player trading would be permitted. COO aligned to Glen's position by end of meeting. 2026-07-22.

## Applicability

Relevant when: designing the economy and marketplace architecture for a live-service game -- the regulatory boundary (in-game currency vs real money) determines which systems require financial compliance infrastructure.
Relevant when: advising a studio on whether to implement player-to-player trading -- the bank-of-record liability analysis should precede any technical work.
Relevant when: a client studio is considering an open RMT marketplace -- the fraud risk profile (off-ramp as primary vector) and the closed-gate alternative should be presented before the decision is made.
Relevant when: building a live-service economy model for investor materials -- the dual-model (direct store + auction house) with a revenue cut is a stronger monetisation story than single-channel.
Relevant when: evaluating item systems architecture for an MMO -- consumable/durable distinction and provenance tracking are non-negotiable if any trading system is planned.
