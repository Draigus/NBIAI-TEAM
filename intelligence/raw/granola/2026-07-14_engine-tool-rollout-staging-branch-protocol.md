---
source: granola
source_id: 9fe60479-28c1-4fb5-bfa9-416be859d187
source_path: https://notes.granola.ai/d/9fe60479-28c1-4fb5-bfa9-416be859d187
ingested: 2026-07-14
topics_detected: [source-control, engine-rollout, ugs, branching-strategy, pipeline-operations, production-methods]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Major Engine Tool Rollout: Staging Branch Verification Protocol

## Key Content

A ~55-person MMO studio completed a major tooling rollout (Unreal Game Sync, UGS) that caused disruption because a month of accumulated work was merged into the UGS branch without per-team verification before pushing to all leads.

Root cause: the rollout branch had accumulated changes over an extended period; those changes were not verified against each discipline's active work before the studio-wide push.

Corrected protocol for future major engine or tool rollouts:
1. Merge changes to a staging branch first, not the main/live branch
2. Each lead team verifies the staging branch against their active work
3. Issues resolved before the staging branch is pushed studio-wide

Additional discipline-specific considerations:
- VFX teams have complex cross-engine dependencies; VFX lead should be included in staging verification for any change touching shaders, particles, or rendering
- The staging branch also serves as an integration test: if one discipline's work breaks in staging, the blast radius is contained

Leads were instructed to try the UGS tool this week and send feedback to the Head of Tech; Head of Tech to report back at next week's sync.

## Decisions / Insights

- Studio Head of Tech acknowledged: the rollout failure was caused by merging to the live branch without a staging verification step; committed to applying the staging protocol going forward.
- Studio leadership decided: VFX lead is a required participant in staging verification for any merge with cross-engine dependencies, given VFX complexity.
- Studio leadership decided: engine version stays on UE5 dot releases (targeting 5.8, 5.9, 5.9.x); UE6 requires a full game rewrite (two different programming languages) and is not viable before launch.

## Context

Directors and Leads Weekly Sync at a ~55-person MMO studio, 14 Jul 2026. UGS had been rolled out the previous week; most leads had downloaded and run the editor but some had not yet used it. The rollout issues were identified in retrospect during this meeting.

## Applicability

Relevant when: a studio is planning a major engine, source-control, or tool rollout -- a staging branch with per-team lead verification is the minimum viable process before studio-wide deployment.
Relevant when: a rollout has already caused disruption -- the retrospective diagnosis of "merged too much, too fast, without per-team checks" is the most common root cause; staging protocol is the standard fix.
Relevant when: a team with complex engine dependencies (VFX, rendering, shaders) is part of a rollout -- they require explicit inclusion in staging verification, not just assumed pass-through.
Relevant when: advising on engine version strategy for a mid-production studio -- "stay on dot versions, no major version jump mid-production" is the standard recommendation; UE6 in particular requires a full rewrite.
