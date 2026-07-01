---
source: granola
source_id: 3d2e8c94-45cc-4c94-89f9-6ad4865e37d6
source_path: https://notes.granola.ai/d/3d2e8c94-45cc-4c94-89f9-6ad4865e37d6
ingested: 2026-07-01
topics_detected: [mmo-architecture, instancing, seamless-zoning, rendering, performance]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: decision
---

# CH MMO: Instancing Confirmed for VS; Seamless Zoning Parked Until Mid-Production

## Key Content

Technical architecture decision on zone loading approach for the MMO vertical slice, with rationale and performance framing.

**Decision: instancing for VS1, seamless parked until mid-production:**
- Confirmed by Robin, Vardy, and engineering; no further discussion until mid-production
- Glen's estimate: instancing makes the game roughly 4x easier to build
- Downtime (social hub) runs on its own server; Farmlands and other zones are not loaded simultaneously

**Why seamless is deferred:**
- Seamless carries multiplicative compute cost: visible line-of-sight across zone boundaries means active world load for adjacent zones
- With instancing: baked backdrops handle distant vistas; no live cross-zone rendering required
- Seamless is a nice-to-have, not a VS concern per both art and design leadership

**Rendering cost hierarchy (engineering's read):**
- Biggest cost: ray casting / shadow casting (ray tracing on)
- Second: character movement at scale (~200 players in city)
- Polygon count is NOT the primary concern; occlusion culling is the correct lever
- Nanite speeds up world-building (no manual LOD meshes) even if it carries compute cost -- may be worth it given world-building is the studio's longest tent pole

**Baked lights for VS1:**
- Baking projected to improve performance by ~50%
- Gets the build comfortably within 3090/4090 targets
- Trade-off: less artist flexibility; dynamic lighting must be re-enabled post-VS
- Glen's decision: bake for VS1, rework to dynamic/Nanite/Lumen at VS3 or VS4

## Decisions / Insights

- Glen, Robin, and Vardy decided: instancing is the confirmed zone approach for VS1; seamless parked until mid-production with no exception.
- Glen decided: bake lights for VS1 to achieve ~50% performance improvement; plan to re-enable dynamic lighting at VS3 or VS4.
- Engineering concluded: polygon count is not the primary render cost -- ray tracing and shadow casting are; occlusion culling is the primary optimisation lever.
- Engineering observed: Nanite's world-building efficiency benefit (eliminating manual LOD) may justify its compute cost given world-building is the studio's most time-constrained pipeline.

## Context

Solo notes session by studio advisor (Glen) reviewing technical scope and architecture for the CH MMO vertical slice, Jul 1 2026. Captures decisions from conversations with Robin (art lead), Vardy (CEO/game director), and Rainer (senior engineer) during the Downtown Build performance discussion.

## Applicability

- Relevant when: advising on CH MMO technical architecture -- instancing is the confirmed approach; do not re-open the seamless debate for VS1.
- Relevant when: a mid-size MMO studio is making the instancing vs. seamless decision -- the 4x build complexity multiplier is a concrete framing for the production cost of seamless.
- Relevant when: optimising an Unreal Engine 5 open-world build -- ray tracing and shadow casting are the dominant costs; polygon count and Nanite are secondary concerns.
- Relevant when: a studio is debating baked vs. dynamic lighting for a vertical slice -- the ~50% performance gain from baking is significant enough to justify the flexibility trade-off for a demo context.
