---
source: granola
source_id: not_li7bX7ksDDB9cP
source_path: https://notes.granola.ai/d/41b87125-bb98-4de5-96ed-270af0c8bc73
ingested: 2026-06-15
topics_detected: [vision-framework, game-design, mmo-progression, proximity-chat, new-hire-onboarding]
relevance_score: 9
novelty_score: 9
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# CH Simon Woodroffe (Head of Design, Day 1): Vision Framework, MMO Systems, Progression

## Key Content

Simon Woodroffe started as Head of Design at Couch Heroes on 15 June 2026. Deliberately in observation mode: not changing anything for ~30 days, building trust and rapport before suggesting changes.

**Vision-to-execution framework:** Glen's production schema — vision direction → pillars → player promises → value creation → table stakes. Simon immediately aligned, describing the same structure as a "why/why/why/how/how/how" onion diagram from Rare. Table stakes (combat, crafting, zones, quests) are givens; the "how" is what makes CH distinct. Plan: Glen, Simon, Robin meet weekly for two weeks to flesh this out, then expand the group.

**Proximity chat:** Simon has implemented spatial chat four times (Improbable, Rare, Epic). Agreed framing: "is the juice worth the squeeze?" Works best when baked into core game flow; half-hearted implementation gets ignored. Toxicity risk manageable — culture and audience matter more than the feature. Improbable approach: voice API transcribed to text, auto-flagged keywords, shadow-banned from public channels before manual review. UE's native spatial audio implementation is improving.

**Armor system design:** Class-agnostic, AC scale 1–30 (Light 1–10, Medium 10–20, Heavy 20–30). Wearing heavy without skill investment = movement debuffs. Skill tree unlocks armor mobility and synergies. Key intent: side-grades and player choice, not stat gates. Builds multi-dimensional theory-crafting (Skyrim-esque flexibility). Weapon type matters vs. armour: maces beat plate, edged weapons better vs. leather/chain.

**MMO progression/tempo:** Macro tempo = shark-tooth rhythm — deliberate "farming holiday" dips before hard zones (borrowed from FF14 and Wildstar). High micro tempo all the time = Call of Duty exhaustion. Early magic teaser: Fireball scroll at level 3–4, 80% backfire risk at level 3, 5% at level 10 — preferred over greyed-out gates (agency + risk vs reward). Player fantasy checkpoints every ~5–6 beats.

## Decisions / Insights

- [Glen/Simon] agreed: vision-to-execution framework is the shared operating model — pillars derive from vision, player promises derive from pillars, table stakes are non-negotiable but undifferentiated
- [Glen/Simon] agreed: proximity chat framing is "is the juice worth the squeeze?" — not a binary yes/no, weighted by technical/networking/money/cognitive cost
- [Simon] decided: observe-only for ~30 days before suggesting changes — same pattern Glen used in first 45 days
- [Glen/Simon] designed: class-agnostic armor system with skill-gated mobility debuffs rather than class restrictions — expands build theory-crafting space
- [Glen] observed: MMO macro tempo needs shark-tooth rhythm; continuous high micro-tempo = exhaustion
- [Glen] proposed: early Fireball scroll teaser (high backfire risk at low level) as superior to level-gated ability unlock — preserves player agency

## Context

First 1:1 between Glen Pryer and Simon Woodroffe (Head of Design, Couch Heroes), Simon's first day at the studio, 15 June 2026. Wide-ranging onboarding and alignment conversation covering vision framework, key design systems, and MMO design philosophy.

## Applicability

Relevant when: onboarding a senior creative lead — observation-only period for ~30 days before suggesting changes is a validated approach for earning trust without disrupting existing work.
Relevant when: designing an MMO's class/progression system — class-agnostic armor with skill-investment debuffs creates build diversity without gating content.
Relevant when: evaluating proximity/spatial chat for an MMO — the "juice vs. squeeze" heuristic and the four-implementation pattern from Simon is directly deployable in client conversations.
Relevant when: structuring MMO session pacing — macro tempo shark-tooth rhythm (dip before hard zone) borrows proven patterns from FF14 and Wildstar.
Relevant when: designing early-game ability teasers — risk-gated access (high backfire at low level) is superior to invisible level gates for preserving player agency.
