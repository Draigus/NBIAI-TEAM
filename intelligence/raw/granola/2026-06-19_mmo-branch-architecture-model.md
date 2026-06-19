---
source: granola
source_id: 9e7a43df-19fc-4989-9958-db7437f63cc6
source_path: https://notes.granola.ai/d/9e7a43df-19fc-4989-9958-db7437f63cc6
ingested: 2026-06-19
topics_detected: [branch-management, perforce, devops, mmo, source-control]
relevance_score: 7
novelty_score: 8
actionability_score: 7
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# MMO Branch Architecture Model and Branch Manager Role

## Key Content
MMO studios require a significantly more complex branch architecture than box games or live-ops mobile titles, because multiple large systems (UI, combat, QA, world) must be developed in parallel without blocking each other.

**Branch hierarchy**:
- **Main**: merge target only, never coded on directly. All merges approved by branch manager.
- **Dev**: sandbox. Merges to dev are permissive; breaking dev is acceptable. Parallel work lands here.
- **Feature branches** (UI, combat, world etc.): isolated per system, allow parallel development without cross-contamination.
- **Stable**: one sprint behind main. Pulled from main at end of sprint. Never has in-progress work.

**Branch manager role**: dedicated person (or devops hire) who owns merge approval into main, kicks back anything that breaks build, and manages the operational flow of all branch activity. Without this role, merges become ad hoc and the studio loses visibility over what is actually in the codebase.

The gap in studios new to Perforce: teams know how to use GitHub's pull-request-as-review model but not how to configure Perforce's equivalent. Perforce is more scalable than GitHub for large teams but must be set up correctly. Helix (Perforce's UI layer) is the tool for making QA and non-engineers able to interact with the build system.

## Decisions / Insights
- Glen decided: the devops hire must have deep Perforce expertise to configure the branch management infrastructure correctly.
- Glen observed: ad hoc merging to main, without a branch manager, is a "pure red problem" -- the studio is flying blind.
- Pattern recognised: studios transitioning from GitHub to Perforce lose the PR review mechanism if they don't actively replicate it in the Perforce configuration.
- Glen decided: branch manager should be a required approver gate for any merge to main; QA lead is a secondary approver gate from a quality perspective.

## Context
1:1 with QA Lead, 2026-06-19. Studio transitioned from GitHub to Perforce. The previous branch review mechanism (a lead engineer approving PRs) was not replicated in the Perforce setup, creating an unmanaged merge environment. A devops hire is being sourced specifically to fix this.

## Applicability
Relevant when: advising a studio transitioning from GitHub to Perforce on what infrastructure they need to replicate the PR review model.
Relevant when: a studio's QA lead or production lead has no visibility into what changes are in any given build.
Relevant when: a studio is planning to scale its team and needs to understand what branch architecture is required before that scaling begins.
Relevant when: a devops hire is being specified and Perforce branch management expertise needs to be a priority requirement.
