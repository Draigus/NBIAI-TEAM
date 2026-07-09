---
source: granola
source_id: 872337fa-b5d9-48fd-8fd9-0f87551f9b79
source_path: https://notes.granola.ai/d/872337fa-b5d9-48fd-8fd9-0f87551f9b79
ingested: 2026-07-09
topics_detected: [headcount-planning, resource-management, jira, production-process, vertical-slice]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods, client_patterns]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Scope-First Headcount Decision Framework

## Key Content

A ~55-person studio operating under a three-month vertical slice deadline established a structured decision sequence to prevent premature headcount expansion:

**Decision sequence:**
1. Scope first: can the deliverable be cut or de-scoped?
2. Prioritise: if not cut, can it be deprioritised below the vertical slice threshold?
3. Headcount: only if neither applies is a hire justified

**Headcount math formula:** workload backlog (hours) in project management tooling vs. team capacity (people × available hours) = headcount delta. Without this calculation, headcount requests are speculative.

**Supporting rules:**
- All headcount requests must be backed by Jira-derived math, not director intuition
- Feature prioritisation (MoSCoW method) must be locked by senior leadership before headcount estimates are reliable -- estimates built on unconfirmed feature scope are unreliable
- Velocity data is not reliable for approximately the first three months post-Jira implementation; estimates in that window carry higher uncertainty

**Failure mode:** directors requesting headcount before scope is fixed results in estimates that become obsolete as scope changes. The cycle is: scope changes → estimate invalid → re-hire or over-hire.

## Decisions / Insights

- Studio CPO decided: no headcount request proceeds without a scope-cut conversation first.
- Studio CPO decided: estimates must be backed by Jira workload data, not director intuition.
- Studio CPO observed: feature MoSCoW must be locked by studio leads before headcount numbers are meaningful.
- Studio CPO observed: velocity data from a newly implemented project management tool is unreliable for ~3 months; estimates in this window require explicit uncertainty flags.

## Context

Senior production meeting at a ~55-person MMO studio in active vertical slice production, July 2026. Triggered by inconsistent and inflated headcount requests from multiple department directors in the same cycle. Three-month window to primary vertical slice milestone.

## Applicability

- Relevant when: a studio presents headcount requests that haven't gone through a scope-cut conversation -- run this sequence before approving any hire.
- Relevant when: headcount estimates feel inflated or inconsistent across departments -- require Jira workload math as the justification standard.
- Relevant when: a studio is in the first three months of Jira adoption -- flag that velocity data is not yet reliable for capacity planning.
- Relevant when: feature scope is still in flux -- block headcount approval until MoSCoW is locked by the relevant decision-makers.
- Relevant when: NBI is advising on resource planning for a vertical slice -- this sequence is the standard operating procedure.
