---
source: granola
source_id: 21d34098-2c89-49fa-8292-c3f6d804356c
source_path: https://notes.granola.ai/d/21d34098-2c89-49fa-8292-c3f6d804356c
ingested: 2026-06-22
topics_detected: [game-design, emergence, systems-design, mmo]
relevance_score: 7
novelty_score: 9
actionability_score: 6
bank_candidates: []
new_bank_suggestions: [games_design]
sensitivity_class: anonymisable
extract_type: methodology
---

# Entity/Component Emergence Architecture for Live Games

## Key Content
Design principle articulated by a senior game designer with Everwild and Microsoft credits: build for emergence via an entity/component model rather than scripting outcomes.

**Core architecture:**
- Every game entity is a collection of components (data-driven, Rimworld/Dwarf Fortress model)
- Interactions between components generate emergent behaviour without scripted paths
- Example: fox/sheep/hen/dog with three fear relationships produces endless emergent situations

**Narrative cause-and-effect, not physical simulation:**
- Events wait until players are present; world state doesn't change until the story is ready
- Prevents uncontrolled simulation drift ("the tree you can't control")
- Damage to an entity doesn't need to be stored as persistent state until the entity is resolved

**Controlling emergence:**
- Entities don't change state easily; players are the primary agents that matter
- Large world events (e.g. volcano) can be foreshadowed and held until players are in position
- Hard rules ("you don't get to do that") shatter the world illusion; soft incentives always preferred

**Key cautionary example:** Burned-house-to-bandit chain was loved, but a small group burned the entire world and ruined it for others. Containment design matters.

## Decisions / Insights
- Designer concluded: script narrative cause-and-effect, not physical simulation state
- Designer concluded: world events should be player-paced, not clock-paced
- Glen observed: uncontrolled emergent simulation at scale creates irrecoverable grief states
- Pattern recognised: the same emergent system that delights players at small scale breaks at population scale without containment design

## Context
Game design session between Glen and a senior game designer (Everwild/Rare background) advising a ~70-person MMO studio, 2026-06-22. Studio is in vertical slice phase; game features large shared-world environments with player-driven narrative consequences.

## Applicability
Relevant when: advising a studio building a live service MMO or shared-world game on how to architect its underlying systems.
Relevant when: a studio is debating scripted vs. emergent quest design and needs a conceptual framework for the trade-offs.
Relevant when: a game is showing world-state drift or unintended simulation consequences at playtesting scale.
Relevant when: evaluating a studio's technical architecture for how well it supports player-authored narrative.
