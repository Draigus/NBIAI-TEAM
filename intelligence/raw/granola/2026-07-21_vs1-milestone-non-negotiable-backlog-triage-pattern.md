---
source: granola
source_id: not_q2JjcZ90725rEe
source_path: https://notes.granola.ai/d/59d9c690-d94a-43a1-8dee-6cac9572e92f
ingested: 2026-07-21
topics_detected: [scope-triage, backlog, non-negotiables, milestone-planning, vs1, production-methodology]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# VS1 Milestone Triage: Non-Negotiable Prioritization Sprint Pattern

## Key Content

Pattern for rapidly reducing scope ahead of a vertical slice milestone when the original feature set exceeds the delivery window.

**Process:** Run a "first-pass non-negotiable prioritization" with leads and directors. For each feature, determine: is this non-negotiable for the investor build or not? Deferring to later versions (VS2, VS3) is the explicit framing -- not cutting, staged.

**Categories used:**
- Non-negotiable for VS1 (core demo loop, social hub, economy basics, navigation)
- Deferred to VS2 (integration cleanup, some economy systems, party co-op)
- Deferred to VS3 (full economy, trading, advanced guild UI)
- Cut or PTC (Possible to Cut): features needing further design clarification before a binary decision

**Execution:** Triage leads directly into production; production team receives the prioritized list and works from it. Sends one output (the production-ready priority list), not a meeting report.

**Unblocking downstream work:** Scope triage directly unblocks art direction (Art Bible), roadmap drafting, and headcount finalization -- all of which were blocked on the feature list.

## Decisions / Insights

- Pattern: scope triage done at the directors/leads level unlocks production, art direction, and financial planning in one step.
- Staging deferred features (VS2/VS3/VS4) rather than cutting outright maintains team morale and signals a roadmap exists beyond the investor build.
- "PTC" (Possible to Cut) is a holding category for features needing design clarity before a binary decision -- avoids premature cuts.
- DODs are set as permanent studio standards, not VS1-only, so the investment in alignment persists beyond the milestone.

## Context

Derived anonymised from a weekly leads and directors sync at a ~55-person MMO studio, 21 Jul 2026, with approximately 8 weeks to a major investor demonstration milestone. Studio had previously been scoping across a full feature set without a hard prioritization gate.

## Applicability

Relevant when: a studio is 6-10 weeks from an investor vertical slice and the feature list exceeds the window -- run a non-negotiable triage with all leads in a single meeting.
Relevant when: a client's roadmap is blocked on feature prioritization -- the triage output directly enables roadmap drafting, art direction, and headcount approvals.
Relevant when: designing a milestone gate process -- non-negotiables sprint + DOD lock is a clean two-step to align the full studio before a delivery crunch.
Relevant when: advising a studio on deferred scope communication -- "staged to VS2/3/4" is the right framing; "cut" damages team morale without adding precision.
