---
source: granola
source_id: 8850fa28-a4b2-43f2-a8ce-0a26e31f3de6
source_path: https://notes.granola.ai/d/8850fa28-a4b2-43f2-a8ce-0a26e31f3de6
ingested: 2026-07-15
topics_detected: [mmo-design, world-state, persistence, apophenia, server-architecture, game-design]
relevance_score: 9
novelty_score: 9
actionability_score: 8
bank_candidates: [client_couch_heroes]
new_bank_suggestions: [games_design, mmo_technical_patterns]
sensitivity_class: anonymisable
extract_type: methodology
---

# World Persistence via Semantic State Model: Illusion Over Simulation

## Key Content

The engineering instinct for a "living world" is to simulate everything. The correct approach is to simulate only what players can perceive -- using semantic tags, heat maps, and bucketed state to produce the illusion of persistence at a fraction of the compute cost.

**Apophenia principle (Tynan Sylvester / RimWorld):** Players project meaning onto stimuli that have no internal state. Four trees rotated randomly feel like infinite variety. A corpse near a corruption zone reads as "something was eaten." Minecraft chickens feel like they have personalities; they don't. Design to what players perceive, not to what the simulation contains.

**Concrete implementation examples (from a prior project verifying this approach):**
- Blood mushrooms spawn in regions tagged with "combat occurred" -- players read the world's history with no stored event log
- Corruption tag applied to a zone: all entities in it change behaviour from a single data flag (not individual entity AI changes)
- NPC dialogue driven by world-state buckets: "the village was attacked last week" emerges from a flag, not a memory system
- Community bridge rebuild: players contribute resources to a "developing" authored change location; individual contributions are aggregated, not tracked
- Corruption-as-infinite-foe: dynamic quest density and reward scaling ramp up as corruption spreads; players self-regulate without a hard cap needing to trigger

**Verified at scale:** A small team simulated 300,000 entity populations in under 0.001ms on a custom server using this bucketed approach. The engineering team had initially said it was impossible.

## Decisions / Insights

- Head of Design decided: world persistence is achieved through illusion of persistence, not simulation of persistence; semantic tags on regions, heat maps, and bucketed state replace per-entity memory systems.
- Head of Design observed: engineers' initial instinct on this approach was that it couldn't be done; a small dedicated team proved otherwise at 300,000-population scale in <0.001ms.
- Studio CPO and Head of Design agreed: this model is the viable path for a shared MMO world where player actions visibly matter without prohibitive server load.

## Context

1:1 between Head of Design and CPO at a ~70-person MMO studio, 15 Jul 2026. The Head of Design had worked on a prior project where this approach was developed and tested; he was bringing it forward as the proposed solution for the current studio's "living world where actions matter" pillar. Engineers at the prior project had initially rejected the approach before a small team proved it viable at scale.

## Applicability

Relevant when: designing a shared-world MMO that needs player actions to visibly affect the game world -- semantic tagging of regions is cheaper, more scalable, and equally legible to players than per-entity simulation.
Relevant when: an engineering team pushes back on world persistence as computationally infeasible -- the bucketed semantic model has been validated at 300,000 entity scale in <0.001ms; challenge the "impossible" claim.
Relevant when: pitching a social MMO to investors and they ask how the "living world" actually works -- the semantic state model gives a concrete, tested technical answer that isn't hand-waving.
Relevant when: a studio is spending server budget on simulating what players cannot perceive -- audit each simulated system against the apophenia test: "would players notice if this was random/bucketed instead of simulated?"
