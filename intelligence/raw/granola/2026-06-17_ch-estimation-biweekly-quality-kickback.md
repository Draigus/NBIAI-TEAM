---
source: granola
source_id: not_VAlGkyKnb8xGcs
source_path: https://notes.granola.ai/d/5dbca34d-9cac-40b7-ae43-12f5881a5622
ingested: 2026-06-17
topics_detected: [estimation, sprint-review, documentation-discipline, engineering-visibility, production-governance]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Engineering Visibility and Documentation Discipline: Bi-Weekly Framing + Kick-It-Back Rule

## Key Content

Two production interventions introduced at CH engineering estimations session, 17 June 2026 (Glen, Mustafa, Graham/Valeria):

**Bi-weekly update framing reform:**
Current bi-weeklies show videos with no context — team zones out. Required change: every update item must state *what was built* AND *why it matters to the game*. Example: "Built memory leak pipeline monitor, prevents a Payday 3-style crash on launch." Goal: condition the team to articulate impact, not just output. Creates healthy cross-discipline FOMO. Longer-term direction: move toward proper sprint reviews with build playthroughs and cross-team feedback.

**Kick-it-back documentation rule:**
Engineers must not estimate or commit to work without sufficient documentation. If a TDD cannot be written from what's provided, reject the story before sprint commitment — not on day one of the sprint. Escalation path: flag to tech producer (Valeria), who escalates to design for prioritisation. To be formalised in Jira workflow (Graham).

**Estimation pivot table findings:**
- Gameplay engineering load roughly 2x backend load at CH
- Stories exceeding 10 working days (one sprint) must be split into deliverable-sized chunks or reclassified as epics/features
- Large min/max gaps signal insufficient design detail — tag and trace back to Robin (GDD owner) for prioritisation

## Decisions / Insights

- [Glen/Valeria] decided: bi-weekly updates must include "why it matters to the game" framing per item
- [Glen/Graham] decided: kick-it-back is a formal rule — no sprint commitment without sufficient documentation; formalised in Jira
- [Glen] observed: gameplay engineering load at CH is roughly double backend — informs resource planning
- [Glen] observed: stories exceeding 10 working days are likely mis-scoped epics, not stories
- [Mustafa] observed: many original estimates were "ridiculous" — engineers were inexperienced and scared, not deliberately gaming; goal is building the muscle

## Context

Engineering estimations review session, Couch Heroes, 17 June 2026. Attendees: Glen Pryer, Mustafa (Head of Tech), Graham Monk (engineer), Valeria Trofimova (Head of Production). Continuation of the June 16 estimation cadence; this session focused on pivot table review and process reform rather than raw numbers.

## Applicability

Relevant when: bi-weekly update meetings are losing the room — reframe each item from output to impact to restore engagement.
Relevant when: sprint planning is being disrupted mid-sprint by late-breaking "I don't know how to do this" — formalise pre-commitment documentation gates.
Relevant when: estimation ranges are inflated and credibility is low — separate role groups into their own review calls and focus only on outlier lines.
Relevant when: a studio is building estimation culture from scratch — diagnose fear/inexperience as the root cause before treating it as bad-faith padding.
