---
source: granola
source_id: b058801b-c193-486f-a824-be3c89e598f8
source_path: https://notes.granola.ai/d/b058801b-c193-486f-a824-be3c89e598f8
ingested: 2026-07-16
topics_detected: [mmo-design, item-design, gear-philosophy, player-ownership, crafting-systems]
relevance_score: 9
novelty_score: 9
actionability_score: 8
bank_candidates: [client_couch_heroes]
new_bank_suggestions: [games_design]
sensitivity_class: client_scoped
extract_type: methodology
---

# MMO Item Provenance and Identity: History as the Stat

## Key Content

A reframe of gear philosophy for MMO design: items should carry history, not just stats. The stat is the narrative output; the provenance is the identity.

**Provenance data on items:** who made it, who looted it first, what it has killed, how many times it has been used. A fishing pole that caught 433,000 bass has a story; a sword forged by the server's most famous blacksmith is identifiable. Stats become the record of a life, not just a mechanical attribute.

**Gear improvability over replaceability:** players can reforge a new item's abilities into an existing beloved item -- the valued item is preserved, the desirable properties are absorbed. Framed as "essence": keep the sword, absorb the properties. Analogy: Game of Thrones -- Ice melted into Oathkeeper; the essence persists. Philosophical anchor: granddaughter's axe (replace the head and handle; it's still granddaughter's axe).

**Item signing as a player choice:** crafting for the auction house -- unsigned, generic. Crafting for a friend -- signed; it becomes a Hattori Hanzo sword. Famous-maker items can have world effects: low-level enemies may react differently to a legendary blacksmith's weapon.

**Multi-dimensional item value:** resource value, market value, aesthetic value, sentimental value, legendary value. Different players hold items for different reasons; the system should support all five simultaneously.

## Decisions / Insights

- Studio CPO concluded: items must accumulate history over time; a reset-to-zero gear model violates the ownership contract with the player.
- Studio CPO concluded: gear improvability (essence absorption) is the alternative to seasonal gear replacement; the attachment to a specific item should be architecturally supported, not fought by the system.
- Studio CPO concluded: signed vs. unsigned as player agency -- the same crafting system serves market players (unsigned) and relationship players (signed) without forcing one model on both.
- Studio CPO observed: a legendary blacksmith's reputation should have world-state consequences; the game should know who made things, and the world should respond accordingly.

## Context

Design session notes by studio CPO at a ~70-person MMO studio, 16 Jul 2026. Session covered the full genre framing for the studio's MMO in development, with item design as a core discussion. CPO working through the contrast between coercive MMO design (seasonal gear resets, gear-as-carrot) and a design model that honours player investment. Session preceded a pillar lock meeting with full studio leadership.

## Applicability

Relevant when: designing the gear and progression system for an MMO or long-session RPG -- define whether gear is a carrot (reset regularly) or an identity (accumulated history); the choice shapes all downstream crafting, trading, and monetisation design.
Relevant when: advising a studio on live service design -- essence absorption and item signing are mechanically specific alternatives to seasonal gear replacement; both preserve player attachment while allowing new gear to enter the economy.
Relevant when: reviewing a game's economy for investor presentation -- multi-dimensional item value (resource, market, aesthetic, sentimental, legendary) is a stronger economy story than single-axis loot tables.
Relevant when: a studio is designing crafting systems -- signed vs. unsigned as player choice costs nothing extra and serves two distinct player motivations (market and relationship) from a single crafting action.
