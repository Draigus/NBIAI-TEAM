---
source: granola
source_id: 3d82f38f-4872-4964-bab2-4a00ab55a648
source_path: https://notes.granola.ai/d/3d82f38f-4872-4964-bab2-4a00ab55a648
ingested: 2026-07-02
topics_detected: [bug-management, tech-debt, sprint-cadence, mmo-development, quality-assurance]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Bug Management Cadence: Per-Sprint Triage Plus Periodic Bug Bash

## Key Content

A two-level bug management cadence for a large-team MMO, designed to prevent the end-of-project hockey-stick bug accumulation that kills live-service games.

**Level 1 -- Every sprint:**
- Triage bugs from the previous sprint at the start of sprint planning
- Pick up all breaking and serious bugs as a fixed sprint workstream
- Three parallel workstreams per sprint: feature work, bug prioritisation, tech debt
- Bugs are never deferred to "later" -- they enter the next sprint or are explicitly deprioritised with a reason

**Level 2 -- Every ~3 sprints:**
- Dedicated bug bash week: clear the accumulated backlog and address approximately 20% of outstanding tech debt
- Timing driven by data: tech director monitors bug load to determine when the bash is needed
- Early in development: may be every other sprint until the rhythm is established and bug load is understood
- Not a fixed calendar item -- data-driven trigger prevents unnecessary bashes when the backlog is clean

**Why this matters for MMO specifically:**
- MMO development is long-horizon; deferring bugs compounds exponentially
- Real example: deferring bugs in a similar project resulted in 845,000+ items to close in the final six months
- The hockey-stick pattern is well documented for single-player games; in MMO, the live-service dependency on a clean codebase makes it catastrophic

**Supporting structure:** three-workstream model (feature / bug / tech debt) prevents the "we'll do bugs next sprint" pattern from ever being rationalised as acceptable.

## Decisions / Insights

- Glen decided: three parallel workstreams per sprint (features, bugs, tech debt) as the base structure -- bugs are not a separate track but an equal-weight workstream in every sprint.
- Glen decided: bug bash cadence is data-driven (~every 3 sprints) rather than fixed-calendar -- the trigger is the tech director's read of accumulated bug load.
- Glen observed: the hockey-stick end-of-project bug pile is not a surprise when it happens; it is the predictable result of treating bugs as deferrable during active feature development.

## Context

Meeting between NBI senior advisor and CH Engineering leadership at a ~65-person MMO studio, early July 2026. Note dated Jul 6 in Granola; content relates to VS-era bug management processes. Part of a broader discussion on sprint governance, branching strategy, and engine version decisions.

## Applicability

- Relevant when: advising a studio on how to structure sprints that include bug work -- the three-workstream model (features / bugs / tech debt) gives bugs equal standing without displacing feature velocity.
- Relevant when: a studio is deferring all bug work to a "cleanup sprint" -- the hockey-stick pattern is the evidence base; the 845K figure is a specific and memorable data point.
- Relevant when: planning bug management cadence for an MMO specifically -- the long development horizon and live-service codebase dependency make bug deferral far more costly than in a single-player title.
- Relevant when: a tech director is uncertain when to trigger a bug bash -- data-driven triggering (eyeball the backlog) is simpler and more responsive than a fixed calendar entry.
