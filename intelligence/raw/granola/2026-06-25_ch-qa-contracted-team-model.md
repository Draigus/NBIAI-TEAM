---
source: granola
source_id: 4df4fb05-9d0d-432c-b270-4498f84b6c6e
source_path: https://notes.granola.ai/d/4df4fb05-9d0d-432c-b270-4498f84b6c6e
ingested: 2026-06-26
topics_detected: [qa, testing, contracted-team, build-pipeline, review-build, playtest-build, testrail]
relevance_score: 8
novelty_score: 8
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# QA Scaling Model: Contracted Team with Separate Review and Playtest Builds

## Key Content

A ~65-person live-service studio had a single in-house QA person who was overwhelmed and under-resourced. The 260-day QA estimate for the vertical slice was treated as evidence of under-resourcing rather than over-scoping -- the estimate was structurally sound, the scale reflected a one-person model, not an inflated number.

**Target state model:**
- 30-person contracted QA team (not in-house hires)
- Three builds per week (Monday, Wednesday, Friday or similar cadence)
- TestRail for test case management and regression tracking
- Automated regression layer built over time alongside the manual QA team

**Two-build pipeline (immediately actionable):**
- Review build: tested against a new sprint commit cadence; not stable by default; used to catch regressions early
- Playtest build: runs two sprints behind the current review build; already tested and patched; used for playtesting and stakeholder sessions
- Rationale: mixing review and playtest means bugs from the current sprint contaminate stakeholder confidence; separation protects the playtest experience

**Near-term fix (before contracted team is in place):**
- Schedule a dedicated meeting: QA lead + Engineering Director + Executive Producer + Head of Production
- Define the test scope per build type before scaling -- scope clarity is the prerequisite for resourcing decisions
- Branch strategy is an enabler: dev / stage / playtest branches minimum; a dedicated branch manager is distinct from a devops role

**Anti-pattern:** treating QA as a consumer of engineering quality rather than an independent voice with defined gates. QA independence requires structural protection -- QA lead should have a direct reporting line and a defined DoD stage, not just reactive bug tickets.

## Decisions / Insights

- Studio advisor decided: contracted QA team of 30 is the target; near-term step is to scope the test scope per build type before hiring.
- Studio advisor concluded: separate review and playtest builds must be established before scaling QA; mixing them undermines both the testing signal and the stakeholder experience.
- Engineering Director decided: a dedicated branch manager is needed alongside devops; the two roles have different accountability (code quality vs. infrastructure).
- Studio advisor observed: the 260-day QA estimate from the QA lead was structurally credible -- the problem was modelling a one-person team, not inflated hours. The fix is the contracted team model, not re-estimating.

## Context

Product Council meeting at a ~65-person live-service MMO studio. Participants: studio advisor, Engineering Director, Executive Producer, Head of Production, Game Director. Date: 2026-06-25. Corroborated by VS timeline planning session on 2026-06-26. Named individuals and specific studio anonymised.

## Applicability

- Relevant when: a studio has a single QA person and is approaching a milestone -- contracted QA team of 15-30 is the right model; in-house hiring at this stage is too slow and too expensive.
- Relevant when: a studio's builds are contaminating playtests with current-sprint bugs -- implement the two-build pipeline (review vs. playtest) immediately; no infrastructure investment required, only branch discipline.
- Relevant when: a QA estimate looks implausibly large -- check whether the lead modelled a one-person team vs. a contracted team; the estimate scale changes dramatically.
- Relevant when: advising on test tooling -- TestRail for test management is appropriate once the team reaches 10+ testers; below that, a shared spreadsheet is sufficient.
- Relevant when: a studio is setting up a branch strategy for the first time -- dev / stage / playtest is the minimum viable structure; assign branch manager accountability separately from devops.
