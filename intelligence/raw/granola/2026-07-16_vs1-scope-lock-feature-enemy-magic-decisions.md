---
source: granola
source_id: 96168d25-a0b5-4079-a9ae-6e6a0aa2fe63
source_path: https://notes.granola.ai/d/96168d25-a0b5-4079-a9ae-6e6a0aa2fe63
ingested: 2026-07-16
topics_detected: [vertical-slice, feature-prioritisation, scope-lock, mmo-development, combat-design, magic-system]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: decision
---

# VS1 Scope Lock: Feature, Enemy, and Magic System Decisions

## Key Content

Full scope lock for a multiplayer MMO vertical slice agreed across CPO, EP, and Game Director in a structured triage session:

**Non-negotiable VS1 features:** communication system, inventory, item core, consumables, partner loop, online services backend, skill system (3 paths, ~5 skills with limited GUI), loot auto-distribution to party (not yet built; flagged as required for demo loop), art Bible (blocking brand Bible work).

**Enemies:** 4-enemy target (3.5 minimum); wolves and goblins up the mountain, corrupted guardian at summit (scripted collapse, not a true fight), Carapax or skeleton in dungeon (either works alone; skeleton is backup). Each enemy must have unique combat behaviour -- non-negotiable. Slime parked pending team discussion.

**Combat abilities:** 4 fixed for VS1; if all complete with VFX/audio/collision, 2 additional acceptable. PVP too glitchy for VS1 fix; ranged combat (bows/guns) pushed to VS4.

**Magic:** consumable scrolls for VS1 (not a full system). Scripted encounter: wizard hands player a scroll, player fires one fireball, destroys corrupted guardian, blows hole in tower. Existing VFX prototype, cast animation, and audio library assets confirmed available. VS2 target: 5 fully animated spells (lightning, fireball, earthquake, rain of fire, digital wall).

**Cut or deferred:** character creation Possible to Cut (impression of choice via slides is sufficient), mounts/pets deferred, faction reputation/FTUE/accessibility Possible to Cut. Professions: fishing and forge only for VS1; Simon to design full profession list for sequencing into VS2/VS3.

## Decisions / Insights

- Studio CPO decided: magic must be demonstrable in VS1 via scripted scroll encounter; deferral not acceptable for investor experience goal.
- Studio CPO decided: 4 enemies minimum with unique combat behaviour each; enemy variety without behavioural uniqueness does not count.
- Game Director confirmed: scripted fireball encounter is buildable within scope pending asset origin check (Marketplace vs. original build).
- Studio CPO decided: loot auto-distribution to party must be in VS1 to demo the core partner loop; gap flagged and added to scope.
- Studio EP assigned: Head of Design to produce full profession designs (each profession is self-contained pure design work) for VS2/VS3 planning.

## Context

Three-way scope lock session on 16 Jul 2026 between CPO, EP/Game Director, and Head of Design at a ~70-person MMO studio approaching its first investor-facing vertical slice milestone. Session ran through enemies, magic system, combat abilities, and feature triage in sequence. Robin Jubber facilitated scope discipline; Vardis (CEO) was present. Pre-agreed: CPO would push back hard on anything off-pillar.

## Applicability

Relevant when: running a VS scope lock session for a multiplayer game -- use a "non-negotiable/possible to cut" triage framework and document the cut list explicitly; every deferred item needs a target milestone, not just a "later" designation.
Relevant when: deciding whether to build a full system vs. a scripted approximation for an investor demo -- a scripted encounter using existing assets (VFX, audio, animation) can satisfy an investor experience goal without building the full system.
Relevant when: advising a studio on feature sequencing for a vertical slice -- loot distribution and partner loop mechanics are often forgotten until late; identify the core demo loop early and verify all components exist.
Relevant when: managing a game director who produces large design documents -- compress to 3-4 pages for session use; full doc can be preserved, but the session artifact must be synthesised and prescriptive.
