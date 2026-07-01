---
source: granola
source_id: 3d2e8c94-45cc-4c94-89f9-6ad4865e37d6
source_path: https://notes.granola.ai/d/3d2e8c94-45cc-4c94-89f9-6ad4865e37d6
ingested: 2026-07-01
topics_detected: [mmo-design, persistence, world-state, co-op, scope-control]
relevance_score: 8
novelty_score: 8
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: decision
---

# CH MMO Persistence: Is/Is-Not Definition to Prevent Scope Creep

## Key Content

A formal is/is-not definition for "persistence" in the CH MMO, established to prevent aspirational language from triggering unbounded scope.

**Persistence IS (allowed and achievable):**
- Database-driven player state: reputation, NPC dialogue state, cosmetic client state
- Player-dug mines and similar world changes that expand possibility space dynamically
- Day/night cycles and server-side world state changes
- "Players define their own endgame" -- player-chosen goals, not a fixed end-game structure

**Persistence IS NOT (explicitly ruled out):**
- Phasing that creates divergent world states for different players -- breaks co-op play
- Any persistence mechanic that means two players in the same zone see different versions of the world
- Open-ended promises like "players shape the world" without a concrete is/is-not definition

**Why this definition was needed:**
- Aspirational language in design documents ("persistent world," "players shape the world") was triggering scope creep in the studio
- Teams were designing systems based on their interpretation of persistence, not a shared definition
- Phasing specifically was being proposed repeatedly and consuming design thinking despite being architecturally incompatible with the co-op model

## Decisions / Insights

- Glen and game director decided: phasing that creates divergent world states is explicitly ruled out; the is/is-not definition must be written and distributed before any further use of the word "persistence" in design documents.
- Glen concluded: aspirational persistence language without definition is a scope-creep vector; any design principle that can be interpreted to mean phasing must be given an explicit "does not mean X" clause.
- Glen observed: "players define their own endgame" is the correct agreed framing -- it is achievable and preserves player agency without requiring divergent world states.

## Context

Solo notes session by studio advisor (Glen) reviewing game design scope at a ~65-person MMO studio during vertical slice production, Jul 1 2026. The persistence definition arose from repeated design proposals that relied on phasing, which the engineering team had flagged as incompatible with the co-op architecture.

## Applicability

- Relevant when: advising on CH MMO design -- phasing is out; database-driven state is in; refer to this definition before interpreting any "persistence" or "living world" language in CH design documents.
- Relevant when: an MMO studio is using aspirational language ("living world," "player-shaped world") in design documentation without a formal definition -- the is/is-not framing is a direct remedy.
- Relevant when: a studio's co-op architecture is threatened by a proposed persistence feature -- the phasing test (do two players in the same zone see different things?) is a quick architectural compatibility check.
- Relevant when: scoping a vertical slice for an MMO -- agreeing the persistence definition early prevents design work being done on features that are architecturally impossible.
