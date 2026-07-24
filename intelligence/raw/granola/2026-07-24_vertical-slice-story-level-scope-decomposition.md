---
source: granola
source_id: not_6x2qVT5iMSaKzn
source_path: https://notes.granola.ai/d/029d8973-a1d9-4747-8ce2-d1c4dcb3e4d7
ingested: 2026-07-24
topics_detected: [scope, vertical-slice, estimation, production-planning]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Vertical Slice Scope Decomposition: Epic Level Is Insufficient for Accurate Estimates

## Key Content

A common failure mode in vertical slice planning: scoping at the epic level and presenting that as an estimate. Epics do not reveal the hidden depth of tasks underneath them.

**The "make me a cow" analogy:**
- Epic level: "make me a cow" -- leads can nod to this
- Story level: "make me 40,000 cows" -- the actual scale becomes visible and bids become meaningful

**Why story-level is the minimum for VS estimates:**
- Leads cannot make accurate bids from epic-level breakdowns
- Story level exposes dependencies, cross-discipline handoffs, and hidden complexity
- Without story-level detail, a lead will size to the best case; the estimate will be wrong in the same direction every time

**Two parallel tracks for VS planning (correct approach):**
1. Cut list decomposed to story level -- each story has an owner, estimate, and dependency
2. Back-end reprioritisation with the technical producer -- identify what is truly blocking vs what can ship at reduced fidelity or be deferred
   - Chat/social features: already exist; do not need full-feature treatment for VS
   - Infrastructure at reduced fidelity is a valid VS call; hiding the gap is not

**Who drives the pipeline workback after story-level cut list is done:** producers, not CPO or department heads. The CPO and art director setting scope is a temporary emergency -- as soon as scope is cut and clear, producers must own the workback.

**AI-generated Gantt charts caveat:** auto-generated project plans from AI tools typically do not account for cuts, polish time, or debug time. They reflect a best-case sequence, not a realistic delivery model. A producer must review and adjust before any schedule is communicated.

## Decisions / Insights

- Studio leadership decided: scope cut must reach story level before any accurate estimate is possible -- epic-level scoping is insufficient
- Studio leadership decided: two parallel tracks (cut list to story level + back-end reprioritisation) run simultaneously, not sequentially
- Studio leadership observed: AI-generated project plans missing cut/polish/debug time will produce optimistic schedules that fail in execution
- Studio leadership decided: producers own the pipeline workback once scope is defined -- not the CPO or department heads

## Context

1:1 between embedded CPO and engineering lead at a ~55-70 person MMO studio. 2026-07-24. Studio targeting September for investor showcase vertical slice. Scope had been sized at epic level; story-level decomposition identified as necessary to produce reliable estimates. Separate back-end reprioritisation session scheduled with technical producer.

## Applicability

Relevant when: a studio presents vertical slice scope at epic level and claims it is estimated -- push to story level before accepting any bid as reliable.
Relevant when: assessing a studio's production planning maturity -- inability to scope below epic level is a risk flag for vertical slice delivery.
Relevant when: a studio is using AI tools to generate project plans -- require a producer review pass to add cut/polish/debug buffers before using the output.
Relevant when: a studio has both front-end and back-end scope problems -- run the cut list and back-end reprioritisation in parallel, not sequentially.
