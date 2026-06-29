---
source: granola
source_id: d717b5da-317e-42f6-b338-a6e7deced769
source_path: https://notes.granola.ai/d/d717b5da-317e-42f6-b338-a6e7deced769
ingested: 2026-06-26
topics_detected: [art-direction, visual-style, milestone, vertical-slice, game-design, world-building]
relevance_score: 7
novelty_score: 7
actionability_score: 7
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Art Style Lock Process: Review, Load Check, Lock for Milestone

## Key Content

A studio with two coexisting visual aesthetics (a high-tech ancient world and a post-collapse gritty world) had not formally locked the art style for the vertical slice milestone. Multiple conversations were open simultaneously about the same style questions, blocking production decisions across art, engineering, and world-building.

**Art style lock process agreed:**
1. Creative Director, Game Director, Art Director, and studio lead review all existing assets per aesthetic direction
2. Select one clear direction per zone/context
3. Pass to engineering for a quick load performance check (higher-detail assets have a different compute footprint)
4. Lock the style decision -- no further changes until end of the current milestone
5. Document locked decisions in the knowledge base for new team members

**What "lock" means in practice:**
- Decisions made in 1:1 conversations that affect style are no longer valid -- the style lock is the authority
- New team members receive the locked reference documentation; no back-channel style questions go to individual leads
- The Art Director communicates the locked direction to the relevant department in a single message, closing all open threads

**Dual-aesthetic design principle (generalised):**
- Two distinct visual registers can coexist in a game if they are defined by world-lore logic, not aesthetic preference
- Each register needs its own kit (assets, materials, colour palette) -- shared kits create hybrid reads that undermine both
- Engineering benefits can be built into the design: high-verticality architecture in one register reduces line-of-sight compute load; this is a design-engineering collaboration decision, not a post-hoc optimisation

**Anti-pattern:** treating art style as a living conversation during production. Style discussions should be concluded before sprint commitments are made; an unresolved style question is a blocked task for every discipline downstream.

## Decisions / Insights

- Studio leadership decided: schedule a formal art style lock session with Art Director, Game Director, and studio lead before the next sprint begins.
- Art Director concluded: the two aesthetic directions (ancient high-tech / post-collapse gritty) are sufficiently distinct to warrant separate kits; combining them into a single kit saves build time at the cost of visual coherence.
- Studio advisor observed: style back-and-forth between a world-building lead and a department head had been running for weeks without resolution; locking the decision requires an authority figure, not a continued conversation between peers.
- Engineering Director noted: high-verticality architecture in the ancient high-tech register provides a compute benefit by reducing line-of-sight calculations -- this is a design decision that has engineering implications and should be locked together with the visual choice.

## Context

Bi-weekly art-to-leadership sync at a ~65-person live-service MMO studio. Date: 2026-06-26. The studio had been working with two coexisting visual aesthetics for a game world: a high-tech ancient civilisation aesthetic (awe and scale) and a post-collapse repurposed-tech aesthetic (gritty, functional). Named individuals, specific game, and studio anonymised.

## Applicability

- Relevant when: a studio has unresolved art style discussions running across multiple conversations -- escalate to a formal lock session with authority to close the question; peer conversations do not resolve style debates.
- Relevant when: a game has multiple distinct visual registers (e.g. ancient/modern, fantasy/sci-fi) -- each register needs its own defined kit and locked direction before production begins.
- Relevant when: an art style decision has engineering implications (compute load, polygon budgets, material costs) -- include engineering in the lock session, not as an afterthought.
- Relevant when: a studio is approaching a vertical slice milestone with style questions still open -- lock before sprint commitments are made; every open style question is a blocked task for downstream disciplines.
- Relevant when: new team members are receiving inconsistent style guidance -- the locked decision document in the knowledge base is the single source of truth; 1:1 style conversations with leads are not authoritative.
