---
source: granola
source_id: 2f0c341b-0d0c-4614-b618-3bce6746349c
source_path: https://notes.granola.ai/d/2f0c341b-0d0c-4614-b618-3bce6746349c
ingested: 2026-07-08
topics_detected: [task-estimation, sprint-planning, story-points, complexity, production-process]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Task Estimation: Hours + Complexity Matrix (Replacing Story Points)

## Key Content

A ~55-person studio abandoned story points in favour of a two-axis estimation system after years of gaming Fibonacci cards and abstract point assignments.

**System:**
- Axis 1 -- Size: hours (actual estimated duration, not abstract points)
- Axis 2 -- Complexity: descriptive label -- simple / easy / medium / difficult / impossible
- Together: creates a risk-matrix-like combination; similar to t-shirt duration sizing crossed with a complexity scale

**Buffer heuristics:**
- Complexity 8/10 → automatic 20% buffer
- Complexity 9/10 → automatic 25%+ buffer (or double; "you really don't know what it is")
- XL + high complexity → do not size at all; research-only sprint first, no deliverables expected

**Failure modes of current alternatives:**
- Story points: too easily gamed; Fibonacci cards invite abstraction rather than genuine estimation
- Hours alone: people use them to represent complexity abstractly, removing fidelity
- More parameters = more gam-ability; simpler systems are harder to game

**Key patterns:**
- Small + high complexity = worst to estimate
- Large + high complexity = easier; trajectory becomes visible as you move through it
- Last 15% and polish phase = effectively infinite complexity; treat as a separate phase
- XL engineering tasks often cannot be decomposed before a research sprint; design and art tasks almost always can be

**Implementation decision:** build system into Jira architecture now; do not switch it on mid-project (avoids ~3 weeks of re-estimation overhead during vertical slice).

## Decisions / Insights

- Studio leadership decided: abandon story points in favour of hours + descriptive complexity label.
- Studio leadership observed: the failure mode of story points is structural ambiguity -- people read off the card rather than genuinely estimating.
- Studio leadership decided: XL + high complexity tasks are not sized; broken down in a research-only sprint with no deliverables expected.
- Studio leadership observed: "As soon as you get up to polish, that number is infinite" -- polish complexity is unestimatable and should be treated as a separate phase.
- Studio leadership decided: build the new estimation system into Jira now but do not switch it on during the current vertical slice to avoid re-estimation overhead.

## Context

Planning session between CPO and EP at a ~55-person MMO studio, 8 Jul 2026. The studio had been using hours, with partial experiments with Fibonacci story points. Context: initial vertical slice estimates were drastically off (environment art went from 1,600 days to 800 days after one conversation), illustrating how easily estimates shift when the system lacks rigour.

## Applicability

- Relevant when: a studio's sprint estimates are consistently wrong and the team is suspected of gaming story points -- hours + complexity label is the corrective system.
- Relevant when: advising a studio on task sizing for an active vertical slice -- build the system in, but delay switching it on to avoid disruption.
- Relevant when: an engineering team has XL tasks that cannot be decomposed -- research-only sprint pattern is the standard intervention.
- Relevant when: a team's polish estimates are being rolled into feature estimates -- treat polish as a separate phase with effectively infinite complexity.
- Relevant when: a studio's estimation parameters have grown complex enough to invite gaming -- fewer, clearer parameters reduce the gaming surface.
