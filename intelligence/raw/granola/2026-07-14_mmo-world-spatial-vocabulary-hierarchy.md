---
source: granola
source_id: 9fe60479-28c1-4fb5-bfa9-416be859d187
source_path: https://notes.granola.ai/d/9fe60479-28c1-4fb5-bfa9-416be859d187
ingested: 2026-07-14
topics_detected: [mmo-design, world-building, spatial-hierarchy, nomenclature, game-design, wow-reference]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# MMO World Spatial Vocabulary: WoW Zone Hierarchy as a Cross-Discipline Reference Model

## Key Content

A level design lead with 23 years of MMO experience (WoW) presented the WoW spatial hierarchy as a shared vocabulary reference for a new MMO studio whose disciplines were using zone, region, subzone, and area interchangeably:

**WoW hierarchy (six tiers):**
- **Zone**: large area with its own dedicated team and biome (e.g. Elwynn Forest). Each zone has a theme, spawn rules, and potentially its own weather.
- **Subzone**: area within a zone with its own personality; may have its own biome and atmospheric treatment (e.g. Northshire Valley within Elwynn Forest).
- **POI (Point of Interest)**: specific encounter or landmark within a subzone (e.g. Northshire Vineyard, Northshire Abbey). The smallest named location players interact with.
- **Hub**: friendly service area within a zone or subzone (vendors, trainers, fast travel nodes). Not a POI -- no encounter content.
- **Instance**: private dungeon or encounter space, physically separate from public traversable world.
- **City**: treated at zone scale; requires a dedicated team; has all sub-tiers within it.

**Why shared vocabulary matters for systems:**
- Weather and atmosphere systems need to know whether they operate at zone or subzone level; the answer determines data table structure and performance budget
- Spawn tables, event triggers, and NPC schedules need a consistent tier reference to avoid per-designer implementation variance
- Without shared terms, a designer saying "zone" and an engineer saying "zone" may be talking about different scales -- producing the wrong system granularity

## Decisions / Insights

- Studio design leadership decided: align on WoW hierarchy as the reference vocabulary; goal is not to replicate WoW's scale but to have a shared spatial vocabulary across disciplines.
- Studio leadership identified: current terminology (region, zone, subzone, area) was being used interchangeably across disciplines -- a standardisation session is required before world systems are designed further.
- Level design lead observed: consistent naming lets world systems be discussed and designed at the right altitude; a weather system designed at the wrong tier creates either massive over-engineering or under-granularity.

## Context

Directors and Leads Weekly Sync at a ~55-person MMO studio, 14 Jul 2026. The studio was building its first MMO and had inherited ad-hoc spatial terminology from its designers and engineers. The Head of Level Design presented the WoW hierarchy as a reference to establish alignment; the Head of Design was separately working on a unified spatial hierarchy document.

## Applicability

Relevant when: advising a studio building its first MMO -- establishing a shared spatial vocabulary (with a known reference like WoW's hierarchy) before world systems are designed is a prerequisite, not an optional alignment exercise.
Relevant when: a studio's world team and engineering team are designing systems at different spatial granularities -- the diagnostic is whether they agree on what "zone" means; if not, the hierarchy needs to be published and ratified.
Relevant when: a design lead is presenting world design to a mixed audience of designers and engineers -- a reference model (WoW, EverQuest, FFXIV) gives engineers a concrete mental model faster than an abstract definition.
Relevant when: a studio is building weather, spawn, or event systems for an open-world MMO -- the system architecture depends on knowing which spatial tier the system operates at; this cannot be retrofitted after data tables are built.
