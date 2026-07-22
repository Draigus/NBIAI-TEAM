---
source: granola
source_id: not_Gpvov9xIRnEUle
source_path: https://notes.granola.ai/d/ade90db8-de64-4723-a3f0-d8528c914bac
ingested: 2026-07-22
topics_detected: [pvp, mmo-design, playerbase, live-service, game-design]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: [games_design]
sensitivity_class: internal
extract_type: insight
---

# MMO PVP Design Patterns: Consensual Zones and Playerbase Splitting Risk

## Key Content

PVP engagement benchmark: historically 25-35% of MMO players engage with PVP content. This is a stable figure across a wide range of titles and should inform how much development investment PVP systems receive at launch.

Recommended launch approach: open-world consensual PVP zones only. Do not invest in structured PVP mechanics (arenas, ranked modes, dedicated PVP progression) at launch. Reason: structured PVP is a separate game requiring a separate balancing and content pipeline; it competes with the core game for resources during the period when the core game needs the most investment.

Playerbase splitting cautionary tale: Sea of Thieves "Safer Seas" mode (PVE-only variant). Intended to satisfy players who wanted PVE without PVP pressure. Outcome: split the playerbase into two groups, satisfying neither side fully. The PVP community lost opponents; the PVE community felt like a second-class product. The feature solved a symptom (PVP friction) rather than the cause (poor consensual opt-in design).

Design principle: PVP should be opt-in at the world level (zone choice) not at the interaction level (individual consent prompts). Zone-based consent is legible; interaction-level consent creates friction and ambiguity.

## Decisions / Insights

- Game Director recommended: launch with consensual open-world PVP zones; do not invest in structured PVP mechanics in the vertical slice or launch window
- CPO aligned: structured PVP is a second product that competes with the first product's resources -- defer until the core game is stable
- Pattern identified: Sea of Thieves "Safer Seas" is a clear cautionary tale for playerbase splitting via PVE/PVP mode separation -- the lesson is to design better opt-in mechanics, not separate modes
- Benchmark established: 25-35% PVP engagement rate across MMOs is the planning baseline for PVP content investment decisions

## Context

Two-hour design alignment session between CPO (Glen) and the Game Director of a 55-70 person MMO studio. PVP architecture discussion arising from broader game design pillar alignment session. Both parties reached consensus on the consensual-zones approach for launch. 2026-07-22.

## Applicability

Relevant when: advising a studio on PVP scope for an MMO launch -- the 25-35% engagement benchmark and the consensual zones recommendation are directly deployable as a scoping position.
Relevant when: a client is considering a PVE-only mode or PVP-optional toggle as a way to address player friction -- present the Sea of Thieves cautionary tale before the decision is made.
Relevant when: a studio is over-investing in structured PVP (arenas, ranked modes) at the expense of core game development -- the "second product" framing is a useful reframe for prioritisation conversations.
Relevant when: designing the PVP architecture for a live-service MMO -- zone-based consent is the recommended pattern over interaction-level consent.
