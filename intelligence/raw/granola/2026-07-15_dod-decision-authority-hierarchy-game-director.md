---
source: granola
source_id: cda18b98-5db0-4578-b396-02897a716da9
source_path: https://notes.granola.ai/d/cda18b98-5db0-4578-b396-02897a716da9
ingested: 2026-07-15
topics_detected: [definition-of-done, decision-authority, studio-governance, production-process, milestone-readiness]
relevance_score: 8
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: decision
---

# Definition of Done: Decision Authority Hierarchy

## Key Content

Definition of done at each milestone stage requires a clear, named authority hierarchy. Without it, any senior stakeholder can reliquefy a milestone that was supposed to be locked.

**Confirmed hierarchy at one studio:**
1. **Game Director** -- owns and approves the definition of done at each stage. This is their primary authority. No vote from the Creative Director on DoD.
2. **CEO override** -- only valid for a specific investor or commercial requirement, and must be framed explicitly as "I am overriding as CEO because of [named investor/requirement]." Not available for general design disagreements.
3. **Creative Director** -- no vote on definition of done. Owns creative direction but not milestone readiness.

**Milestone stage architecture (Mural-based at this studio):**
- Stages in sequence: Ideation → Playable → MVP → Test Release → Polish → Launch Ready
- Vertical slice target tier: Playable/Orange (exceptions possible for specific investor requirements)
- "Fun" threshold for vertical slice: the studio team should be able to play it and see where the fun is going, even if not independently fun yet
- Engineering definition of done: confirmed as missing from the current architecture; must be added before milestone reviews

**Why this matters:**
- Without named authority, definition of done becomes a consensus document that anyone with seniority can reopen
- Creative Director and Game Director roles often overlap in studios; explicitly removing the Creative Director from DoD votes prevents authority confusion
- CEO override without an explicit framing ("I am overriding as CEO") is indistinguishable from a strong opinion; the explicit framing creates accountability

## Decisions / Insights

- Studio CPO decided: Game Director owns and approves definition of done at each stage; this is a formal authority assignment, not a courtesy.
- Studio CPO decided: Creative Director has no vote on definition of done; creative direction and milestone readiness are separate authorities.
- Studio CPO decided: CEO overrides definition of done only for a specific investment requirement and must frame it explicitly as an executive ask, not a design preference.
- Studio CPO identified: engineering definition of done is missing from the current milestone architecture; must be added.

## Context

Weekly strategic session between CPO and Executive Producer at a ~70-person MMO studio, 15 Jul 2026. Studio had a milestone stage architecture on digital boards (Mural) but it had not been shared with the Head of Design. The CPO was clarifying authority after observing that senior stakeholders were re-opening milestone criteria informally. Vertical slice was the immediate target milestone with an investor deadline in late September.

## Applicability

Relevant when: a studio's milestones keep slipping because senior people reopen what was supposed to be done -- establish a named DoD authority with a documented override protocol before the next milestone review.
Relevant when: a studio has both a Game Director and Creative Director -- explicitly separate their authorities; Creative Director owns vision, Game Director owns readiness; conflation of these creates paralysis.
Relevant when: a CEO keeps softening milestone definitions under investor pressure -- the "explicit executive ask" framing creates accountability for each override and prevents casual scope softening.
Relevant when: reviewing a studio's milestone framework -- check that engineering DoD is as explicitly defined as design and art DoD; it is the most commonly missing component.
