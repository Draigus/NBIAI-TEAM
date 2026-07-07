---
source: granola
source_id: b090af79-79bf-4f9c-bf42-f4b44ad3f7d2
source_path: https://notes.granola.ai/d/b090af79-79bf-4f9c-bf42-f4b44ad3f7d2
ingested: 2026-07-07
topics_detected: [mmo-architecture, infrastructure, cloud-hosting, latency, unreal-engine]
relevance_score: 8
novelty_score: 9
actionability_score: 7
bank_candidates: [production_methods]
new_bank_suggestions: [mmo_technical_patterns]
sensitivity_class: public
extract_type: methodology
---

# MMO Infrastructure: Geo-Distributed Servers and Cloud Strategy

## Key Content

No perfect solution exists for global MMO latency. The pragmatic architecture:

**Split by data type:**
- Gameplay servers: geo-distributed for low latency (where the player is)
- Persistent data (inventory, characters, economy): centralised (e.g. US East)
- Non-gameplay transactions (inventory, shop): mask latency with caches and proxies

**Player expectation management:**
- Final Fantasy XIV model: players opt in to a specific data centre knowing the latency tradeoff; build this choice in from launch
- Australia is the hardest case; accept it as a known constraint, not a solvable problem

**Cloud hosting trade-offs:**
- AWS: automated failover built in, but vendor lock-in risk
- Third-party leased data centres: cheaper long-term, but failover must be self-configured
- Hathora: hybrid option; can fall back across providers (AWS, GCP) to avoid lock-in; worth evaluating as a middle path

**Unreal-specific requirement:**
- Unreal defaults to single-threaded server execution
- MMO server architecture requires explicitly forcing multi-threaded patterns; this must be an intentional early decision, not a retrofit

## Decisions / Insights

- Architect recommended: split deployment by data type, not geography alone -- gameplay geo-distributed, persistence centralised.
- Architect recommended: Hathora as a hybrid provider for studios that want cross-cloud fallback without managing it themselves.
- Architect identified: Unreal's single-threaded default as a structural risk for MMO servers; multi-threading must be forced early.
- Architect observed: Australian players will always have worse latency in a globally-hosted MMO; player opt-in data centre selection (FF14 model) is the honest UX response.

## Context

Technical interview with a candidate for a senior engineering role at a ~55-person MMO studio developing an Unreal-based MMO, 7 Jul 2026. Infrastructure questions were not pre-planned; candidate surfaced them as natural follow-on from server authority discussion.

## Applicability

- Relevant when: planning MMO infrastructure for a studio preparing for live service launch -- the split between geo-distributed gameplay and centralised persistence is the baseline architecture.
- Relevant when: evaluating cloud providers for a multiplayer game -- Hathora is a viable middle path between AWS lock-in and self-managed data centres.
- Relevant when: a studio is starting MMO server development on Unreal -- multi-threaded enforcement is a day-one decision; retrofitting it is expensive.
- Relevant when: advising on global player experience expectations -- Australian latency is a known unsolvable; the player-choice model (FF14) is the best UX response.
