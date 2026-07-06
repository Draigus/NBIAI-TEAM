---
source: granola
source_id: 6a3d909c-e6d2-4653-b77f-bbbb8f5a7464
source_path: https://notes.granola.ai/d/6a3d909c-e6d2-4653-b77f-bbbb8f5a7464
ingested: 2026-07-06
topics_detected: [tutorial-design, first-time-user, onboarding, adaptive-ux, instanced-zones, vertical-slice]
relevance_score: 7
novelty_score: 8
actionability_score: 7
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Adaptive Telemetry-Driven Tutorial Design for MMO First-Time Experience

## Key Content

Tutorial design approach for an MMO vertical slice targeting investor audiences:

**FTU zone design principles:**
- Instanced single-player start area through to portal/world entry; multiplayer begins after
- No rigid click-through tutorial; prompts fire on observed player behaviour (e.g. player pauses 12 seconds at a gap, then gets a prompt)
- Investor/studio-facing vertical slice walked through live by the creative director -- not experienced organically
- Player-facing tutorialisation stays minimal; experienced players must not be blocked

**Structural design goals for a tutorial zone:**
- Contrast as the structural driver: enclosed/tense/dark interior vs. open expanse outside
- Named locations throughout (entrance, roads, encounter spaces) feed into UI and map system
- Art must-haves locked before handoff: rock sets, stylised water, crystals, era-specific props, breakable walls
- Breakable walls: no regrowth needed in instanced space (reduces scope without sacrificing player experience)

**Handoff readiness protocol:**
- Miro board with frames and a sign-off section; stakeholders formally approve before moving on
- All narrative, art, and audio docs consolidated into a single folder before art handoff begins
- Dedicated Confluence page per zone: logs changes with rationale going forward

## Decisions / Insights

- Glen decided: single-player experience confirmed from start area all the way to portal entry; multiplayer begins after.
- Glen decided: telemetry-based triggers replace rigid click-through tutorials; experienced players must not be blocked.
- Glen concluded: investor-facing VS is walked through live by the creative director; organic discoverability is a player-facing concern, not a stakeholder demo concern.
- Robin to confirm: scope of single-player zone (proposal: all the way to Portal Peak).

## Context

Tutorial Cave kick-off meeting at a ~55-person MMO studio, 6 Jul 2026. Attendees included design lead, art producer, head of level design, game director, executive producer, QA lead, head of production, and discipline leads. Meeting established design intent, art requirements, and handoff protocol for the game's first POI.

## Applicability

- Relevant when: designing a tutorial or FTU zone for a multiplayer game that will also be demoed to investors -- the investor walkthrough and player experience have different requirements and must not be conflated.
- Relevant when: briefing an art team on a new zone -- listing must-haves vs. nice-to-haves with explicit rationale prevents scope creep and rollback disputes later.
- Relevant when: handing off a zone design to art -- a Miro sign-off frame and consolidated doc folder are the minimum viable artefacts to prevent revisit cycles.
- Relevant when: designing tutorials for games with mixed player skill levels -- telemetry-triggered prompts let novices get help while veterans move unimpeded.
