---
source: granola
source_id: 2124125f-ceb3-4643-b1b6-57a008f59380
source_path: https://notes.granola.ai/d/2124125f-ceb3-4643-b1b6-57a008f59380
ingested: 2026-07-14
topics_detected: [mmo-design, world-state, persistence, shared-world, phasing, game-design-pillars]
relevance_score: 9
novelty_score: 9
actionability_score: 8
bank_candidates: [client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: decision
---

# CH MMO World State Model: Shared World, Per-Player Layer, and Permanence Tiers

## Key Content

Three pillar alignment documents (from three different leadership authors) had divergent positions on world state. The following positions were agreed or proposed in a design alignment session:

**Shared vs per-player world:**
- Physical state of the world is communal: one shared world per realm shard
- Personal layer is per-player: reputation, NPC dialogue, faction standing, pricing
- Permanent divergence of the open world (phasing) is to be avoided
- Instancing is acceptable only when temporary and narratively excused

**World change model (restore, not rebuild):**
- Players can change the world but never its shape; no freeform building by players
- World changes occur only at authored locations (e.g. a broken bridge that can be collectively rebuilt)
- Proposed permanence tiers for authored changes:
  - **Permanent**: the change is locked once triggered (e.g. a gate opened by a major story event)
  - **Developing**: changes accumulate over time toward a final state (e.g. a settlement being built up collectively)
  - **Maintainable**: the change persists but requires ongoing player effort to sustain (e.g. a protected area that degrades without upkeep)
  - **Transient**: temporary change; resets on a defined cycle (e.g. a weather event, a raid boss respawn window)

**Tonal zoning:**
- Vardis's vision examples skew dark/intense; Head of Design's examples skew cozy/gentle
- Proposed resolution: tonal zoning with consent -- each area has its own tone baseline, and players know the tone of the area before they commit
- Glen's position: tonal zoning should be an explicit pillar, not treated as a design footnote

## Decisions / Insights

- Head of Design proposed: permanence tiers (permanent, developing, maintainable, transient) as the classification system for authored world changes.
- Studio CPO agreed: tonal zoning is an explicit pillar, not a style guideline.
- Head of Design decided: phasing (permanent divergence in the open world) is to be avoided; instancing is acceptable only as a temporary, narratively justified mechanism.
- Studio design leadership agreed: player agency over world shape is ruled out; only authored change locations exist.

## Context

1:1 between Head of Design (Simon Woodruff) and CPO (Glen Pryer) at Couch Heroes, 14 Jul 2026. Three pillar documents existed with divergent positions; Simon was drafting a unified hybrid document. The pillar content was not to be shared with CEO or Game Director prior to the group alignment session (Glen's instruction: wants raw reactions in the group session, not pre-aligned positions).

## Applicability

Relevant when: reviewing CH's game design direction -- the permanence tier model (permanent/developing/maintainable/transient) is the decided framework for authored world changes in the CH MMO.
Relevant when: designing world systems for CH -- phasing is ruled out; instancing must be temporary and narratively excused.
Relevant when: preparing investor materials about CH's game -- the "restore, not rebuild" player agency model and the shared-world-with-personal-layer architecture are the confirmed design pillars.
Relevant when: the CH pillar alignment session is being prepared -- the three divergences (shared vs per-player, restore vs rebuild, tonal range) are the specific points requiring time-boxed resolution; tonal zoning has been proposed as an explicit pillar.
