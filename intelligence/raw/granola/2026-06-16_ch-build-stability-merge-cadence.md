---
source: granola
source_id: not_3bUR2wWsPQvo8n
source_path: https://notes.granola.ai/d/b8d5e490-62a4-4d7e-b9a9-250decc98fa1
ingested: 2026-06-16
topics_detected: [build-stability, branching-strategy, perforce, ci-cd, qa-environments]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# CH Build Stability: Merge Day Cadence and QA Environment Structure

## Key Content

CH has formalised its build stability framework at the Directors/Leads sync, 16 June 2026.

**Merge day rule:** Every Wednesday, end of sprint. All stable branches reviewed then merged to main on merge day only. No direct merges to main on Perforce outside this cadence. Goal: stable, playable build by Friday each sprint.

**Environment structure now complete:**
- Playtest environment: ready; Hannah (QA lead) gets full control after a walkthrough scheduled for tomorrow
- QA environment: complete, same walkthrough
- Single launcher with environment picker coming soon (Mustafa building)
- UGS (Unity Gaming Services equivalent — Unreal context suggests this is Perforce-adjacent tooling) rollout targeting next week; enables studio-wide build access

**Branching strategy beyond merge day:** Deferred to next week. Hannah to be included in all branching discussions going forward.

**Technical progress:** RMT store 90% done; in-game store and Unreal tool complete, under review. Game launcher speed fix in progress (flagged slow by Simon). CPU profiling improvements underway (Michael, ~2 weeks).

## Decisions / Insights

- [Glen/Mustafa] decided: merge day = every Wednesday, end of sprint; no direct-to-main merges on Perforce
- [Glen] stated: target is stable, playable build by Friday each sprint
- [Mustafa] committed: single launcher with environment picker coming; UGS studio-wide access targeting next week
- [Glen] decided: Hannah (QA) to be kept in the loop on all branching discussions going forward
- [Glen] observed: branching strategy beyond merge day deferred — getting the cadence right first before adding complexity

## Context

Directors and leads weekly sync, Couch Heroes, 16 June 2026. Build stability decisions driven by QA environment completion and the arrival of new team members (Simon flagged slow launcher as first-day observation; taken seriously). Mustafa owns the technical implementation; Hannah owns QA access.

## Applicability

Relevant when: stabilising a studio's build process during active development — a single fixed merge day prevents continuous-integration chaos without blocking individual branch work.
Relevant when: setting up QA independence — giving QA lead full environment control (not dependent on engineering) removes a common blocker in indie/AA studios.
Relevant when: advising on Perforce-based studios — merge day cadence is a practical substitute for CI/CD gate systems when teams lack automated testing infrastructure.
Relevant when: onboarding new hires who flag obvious issues — launcher speed flagged by Simon on day one was treated as valid signal, not dismissed; this models good feedback culture.
