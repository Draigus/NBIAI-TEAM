---
source: granola
source_id: not_AX0Z5GPApGumbx
source_path: https://notes.granola.ai/d/fef7b73e-0069-40ca-81b4-776a4c82d2b2
ingested: 2026-07-31
topics_detected: [qa, bug-prioritization, jira, scoring-models, game-production]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Bug Priority Index: Repro Rate × Impact Score With Weighted Multiplier

## Key Content

Simple severity labels (P0/P1/P2) lose nuance when a game-breaking bug has low repro rate and a minor annoyance reproduces reliably. A weighted scoring index solves this.

**Scoring model:**
- Score each bug on **repro rate** (1-10): how consistently it reproduces
- Score each bug on **gameplay impact** (1-10): how severely it affects the play experience
- Apply a **1.3× multiplier** to impact, so game-breaking bugs surface even when repro rate is low
- Combined priority score = repro rate + (impact × 1.3)
- Higher combined score = higher priority

**Example:** A crash on save that reproduces 1-in-10 times scores: 3 + (10 × 1.3) = 16. A persistent minor UI misalignment that reproduces every time scores: 10 + (2 × 1.3) = 12.6. The save crash ranks higher.

**Implementation:** Export via saved JQL query in Jira into Excel template. May be achievable natively within Jira without export.

**Decision point:** discuss with test lead whether the multiplier weight is correct for the specific project (1.3 is a starting point, not fixed).

## Decisions / Insights

- QA lead proposed: score bugs on repro rate and gameplay impact (1-10 each), weight impact higher so game-breaking bugs surface even with low repro
- CPO endorsed: combined score gives a nuanced, defensible priority ranking vs. flat severity buckets
- QA lead noted: severity field should be reinstated in Jira (was removed from ClickUp early in production, causing loss of structured triage)

## Context

1:1 between CPO and QA lead at a ~60-person UK/Cyprus MMO studio, July 2026. Studio migrating from ClickUp to Jira and redesigning QA workflow. Single QA person covering work that needs a team of ~20; scaling plan in progress. Discussion generated around defensible bug prioritization in the context of an expanding bug backlog.

## Applicability

Relevant when: setting up QA workflow in Jira for a growing studio -- the weighted index provides a defensible, automated priority ranking without requiring manual triage judgment per bug.
Relevant when: advising a studio where critical bugs are getting buried under high-volume minor issues -- the impact multiplier corrects this.
Relevant when: building a bug triage process that must scale to external QA vendors -- a numeric score is portable across teams and tools.
Relevant when: QA tooling audit for a studio transitioning from a simpler task manager (ClickUp, Notion) to Jira -- severity field reinstatement is consistently skipped and causes triage loss.
