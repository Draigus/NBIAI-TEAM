---
source: granola
source_id: 556d34a7-c3d2-412f-8aa5-59dd660974d7
source_path: https://notes.granola.ai/d/556d34a7-c3d2-412f-8aa5-59dd660974d7
ingested: 2026-06-26
topics_detected: [definition-of-done, production, game-director, quality-bar, milestone, vertical-slice]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Multi-Discipline Definition of Done: Game Director Ownership Model

## Key Content

A live-service studio entering production had siloed definitions of done per discipline: art had 9 stages, code had 8 stages, audio was undefined. The stages were sequential and over-engineered relative to the actual game pipeline. No unified view existed.

**The fix: Game Director owns and consolidates all DoD.**

- Each discipline (art, engineering, QA, audio) proposes their own craft-level stages as inputs
- Game Director consolidates into one unified structure -- a single Miro board covering all disciplines
- Creative Director and other senior leads are consulted but do not have a deciding vote
- Executive Producer arbitrates if quality level conflicts with timeline

**Collapsed stage targets:**
- Code DoD: 4 stages (not playable / playable / feature complete / scalable)
- Art DoD: ~3-4 realistic stages rather than 9 -- maps to the actual game pipeline, not aspirational serialisation
- Audio DoD: sample / board sounds / approved sample / compiled system; music adds complexity and needs its own branch
- QA DoD: merged under the contracted QA model with separate review and playtest builds (see QA extract)

**Anti-pattern identified:** art DoD tiers collapsed to the stages where work actually hands off, not where it theoretically could. Nine-stage art DoDs exist because leads model a fully shipped pipeline rather than the actual handoff points between disciplines.

**Outcome format:** one unified board visible to all disciplines, replacing the current siloed boards.

## Decisions / Insights

- Studio advisor decided: Game Director owns the DoD across all disciplines -- leads supply proposals, Game Director consolidates and signs off; no committee ownership.
- Studio advisor concluded: the over-engineering of art DoD stages is a symptom of the same estimate-inflation pattern; collapsing to 3-4 stages aligned with actual handoffs fixes both the stage count and the estimate quality.
- Game Director decided: to embed audio DoD in the unified Miro board alongside other disciplines, not in a separate tool.
- Studio advisor observed: QA independence is critical -- QA lead was under-resourced and under-heard in the existing structure; the DoD must give QA a defined voice rather than treating QA as a consumer of the engineering DoD.

## Context

1:1 between studio advisor (Glen) and Game Director at a ~65-person live-service MMO studio entering early production. Date: 2026-06-26. The studio was approaching a vertical slice milestone with no unified quality standard across disciplines. Named individuals and specific studio anonymised.

## Applicability

- Relevant when: a studio has department-owned definitions of done that are inconsistent across art, engineering, and QA -- consolidation under the Game Director is the fix.
- Relevant when: art estimates are inflating because leads are modelling a fully-shipped 9-stage pipeline rather than the 3-4 handoff stages relevant to the current milestone.
- Relevant when: a vertical slice milestone needs a quality target that all disciplines can commit to -- the unified DoD is the artefact that makes that commitment legible.
- Relevant when: QA is being squeezed by schedule pressure without a formal quality gate -- a defined QA DoD stage gives the QA lead a structural argument for time and resources.
- Relevant when: a studio is transitioning from a Creative Director-led quality model to one where the Game Director holds quality accountability -- the DoD consolidation is the mechanism for transferring that authority.
