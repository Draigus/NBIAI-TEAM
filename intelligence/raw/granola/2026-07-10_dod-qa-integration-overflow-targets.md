---
source: granola
source_id: b628e74b-16c2-4ce2-8113-067960fe18c5
source_path: https://notes.granola.ai/d/b628e74b-16c2-4ce2-8113-067960fe18c5
ingested: 2026-07-10
topics_detected: [definition-of-done, qa-integration, bug-triage, production-process, jira]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Definition of Done with QA Integration: Flow, Overflow Targets, and Bug Triage

## Key Content

A ~55-person MMO studio formalised a Definition of Done process with QA integrated as a discrete block after the dev/creative cycle.

**DoD flow:**
1. Story moves backlog → sprint → tasks added → work in progress → review → done
2. Review uses a RACI chart; failure adds tasks, pass-with-comments creates mandatory carry-forward stories
3. Three-head review at review stage: creative director + product + direct lead, concurrent (not sequential)
4. Reviewers given a hard time limit to review (prevents indefinite gate hold)
5. Jira field for current DoD stage added to all features and stories for visibility

**QA block (added to right of existing flow):**
- Triggers once story reaches "done" in dev/creative cycle
- Smoke and automated tests run against the story
- Minimum bar: "if it won't run, it ain't done"
- QA pass → story done → push to merge at sprint end
- QA fail → bug raised and linked to originating story; story reopens (called overflow)

**Bug triage:**
- P0 (build breaker): top of backlog, fix immediately
- P1: reviewed against next sprint priorities

**Overflow calibration:**
- ~15% overflow is normal; healthy process signal
- 40%+ overflow = process or resourcing problem requiring audit

## Decisions / Insights

- Studio CPO decided: QA is a separate process block integrated to the right of the dev/creative DoD flow, not embedded within it.
- Studio CPO decided: three-head review runs concurrently at a single stage, not as sequential individual sign-offs.
- Studio CPO decided: reviewers have a hard time limit to prevent gate-hold without action.
- Studio CPO observed: 15% overflow is the normal calibration target; 40%+ triggers a process audit.
- Studio CPO observed: DoD stage must be visible per ticket in the project management tool for production to maintain state without chasing.

## Context

Production and art leads at a ~55-person MMO studio in active vertical slice production, July 2026. Meeting triggered by design bypassing production (going direct to VFX artists). DoD flow walkthrough conducted on shared screen with production lead, art producer, and CPO.

## Applicability

- Relevant when: a studio has no formal QA gate in its sprint cycle -- use this two-block model (dev/creative then QA) as a starting template.
- Relevant when: reviewers are holding stories indefinitely without action -- add an explicit time limit to the review stage.
- Relevant when: overflow rate reaches 40%+ -- audit whether the root cause is process (unclear DoD criteria) or resourcing (QA bandwidth).
- Relevant when: production cannot see story state without asking leads -- add a DoD stage field to all feature and story tickets.
- Relevant when: QA is finding issues late in the sprint that block merge -- move QA trigger earlier in the cycle to "done in dev" not "done in sprint."
