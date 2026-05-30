---
source: granola
source_id: granola_b7e33ac4
source_path: granola://meetings/b7e33ac4-e678-425d-bb8a-61d6ae353219
ingested: 2026-05-30
topics_detected: [vertical-slice, game-design, multiplayer, technical-architecture, art-direction, partner-games]
relevance_score: 10
novelty_score: 9
actionability_score: 9
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: decision
---

# Vertical Slice with Robin -- Game Flow, Technical Architecture, and Art Direction

## Key Content

Comprehensive vertical slice design with Robin (game director). Full game loop: FMV intro > cave tutorial (movement, combat, weapon pickup) > meet Xiron NPC (corruption investigation, establishes lore without revealing importance) > tower traversal (platforming, combat with slimes/goblins/skeletons, corruption cleanup) > parasailing descent > weapon crafting at forge with multiple components. Multiplayer systems: guild hall with fake NPCs (real multiplayer if feasible), user space customisation (furniture, observatory), party combat with role differentiation (tank, DPS, support), cooperative puzzles, PvP arena with build selection. Downtime hub: central social area with false storefronts, essential systems (auction house, bank, mailbox, pub, merchant row), parkour racing minigame. Critical: avoid forcing players through every feature. Partner game integration: technical challenge transitioning between executables, requires middleware for character/profile handoff, cannot block critical path with purchase requirements. Major technical concerns identified: backend built like web server not MMO architecture, 60-70k packet sizes indicate scaling problems, monolithic database won't survive 100+ concurrent players, React components inappropriate for MMO backend, direct write operations without proper failover. Art direction: current aesthetic too similar to Palia/cozy games, need unique visual identity, solar punk verticality concept would provide exploration appeal, David capable but not expressing full artistic breadth.

## Decisions / Insights

- [Glen + Robin] designed: complete vertical slice game flow from FMV through crafting, multiplayer, PvP, and exploration
- [Glen] identified: backend architecture fundamentally unsuited for MMO -- web server patterns, 60-70k packets, monolithic DB
- [Glen] identified: React components inappropriate for MMO backend
- [Glen] assessed: art direction too similar to Palia/cozy games -- needs unique visual identity
- [Glen] proposed: solar punk verticality concept for distinctive exploration appeal
- [Glen + Robin] decided: avoid forcing players through every feature in vertical slice
- [Glen] identified: partner game integration requires middleware solution -- cannot use direct executable transitions
- [Glen] flagged: CTO hiring is critical priority for backend architecture

## Actionable Items

- Present vertical slice to full team for capability assessment
- Map required systems against current studio skills
- Identify technical gaps requiring senior hires
- Schedule offsite agenda focusing on production roadmap
- Address CTO hiring as critical priority
