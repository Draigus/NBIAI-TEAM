---
source: granola
source_id: granola_936d0c2d
source_path: granola://meeting/936d0c2d-1fe3-4259-b89c-25a21ffe460f
ingested: 2026-06-12
topics_detected: [build-pipeline, version-control, design-leadership, onboarding, studio-ops]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: decision
---

# Couch Heroes: Build Pipeline Overhaul and Design Leadership Restructure

## Key Content

Persistent build launching next week: always-on, one sprint behind, on its own branch. Any studio member can access at any time, not just during playtests. Prior state: approximately 40 staff could not participate in playtests due to a broken falling-through state, and no working build existed outside QA. Expected effect: a silent morale boost and accountability pressure (animators will see store-bought placeholder assets still in place).

Merge day: moving to once per sprint, not ad hoc commits to main. Perforce can lock and unlock merge authority for a defined window (not Fridays). Engineers fix collisions in their own branch before merging; a build manager oversees on merge day. No more working directly on main.

Build manager decision: short-term use existing DevOps hire; medium-term hire a dedicated branch and build manager engineer. Add to staffing plan, target approximately six months out.

Design leadership restructure: Simon Woodruff (Head of Design, 30 years in industry, credits include Sea of Thieves, Sonic the Hedgehog, Simon the Sorcerer) starts Monday. Robin shifts to game director role only, no pay or authority reduction. Previous Vardy-Robin design discussions produced little output back to the team; Glen now joining to drive tangible outputs.

## Decisions / Insights

- [Mustafa] agreed: present merge day plan at next Product Council with a clear decision, invite feedback after
- [Glen] confirmed: contractor machine budget is 3,600 GBP for the lead backend developer offer (not 4K)
- [Glen] decided: add dedicated build manager engineer to staffing plan, revisit in six months
- [Glen] observed: an always-on build creates silent accountability pressure without a single direct conversation being required

## Context

1:1 between Glen Pryer and Mustafa (Couch Heroes Head of Tech), 12 June 2026 at 11am. Focused on engineering infrastructure decisions and the incoming design leadership restructure.

## Applicability

Relevant when: Mustafa presents the merge day proposal at Product Council and needs to recall the agreed framing.
Relevant when: the build manager role comes up in staffing review discussions (approximately Q4 2026).
Relevant when: advising another studio on the morale and accountability effects of an always-on build environment.
Relevant when: tracking the Simon Woodruff onboarding and the Robin game director transition at CH.
