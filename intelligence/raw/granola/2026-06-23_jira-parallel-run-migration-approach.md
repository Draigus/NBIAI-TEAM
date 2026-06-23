---
source: granola
source_id: 7db28d3a-f798-4023-8be4-7437f3bae224
source_path: https://notes.granola.ai/d/7db28d3a-f798-4023-8be4-7437f3bae224
ingested: 2026-06-23
topics_detected: [jira, migration, tooling, production, project-management]
relevance_score: 7
novelty_score: 6
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Jira Migration: Parallel Running and Backlog Pruning Approach

## Key Content

A second Jira implementation candidate (Amplitude Studio background, 5 years focused on art team tooling) proposed a phased approach distinct from the "requirements-first, train-then-go" model:

**Four phases:**
1. Discovery -- requirements from all levels, constraints, constraints on cross-team visibility
2. Design/Development -- prototype on Jira instance, Confluence integration planned in parallel
3. Implementation/Migration -- run Jira alongside existing tool (ClickUp) until feature parity is validated; prune backlog rather than lift-and-shift
4. Evaluation/Scaling -- add-ons, advanced automation, ScriptRunner

**Key differentiators from approach 1 (Jo):**
- Parallel running: Jira goes live alongside ClickUp; teams validate parity before full cutover rather than switching cold
- Backlog pruning: existing ClickUp backlog is curated during migration, not imported wholesale -- reduces noise and technical debt in the new system
- Confluence woven in from the start (not an afterthought)
- Labels dropped entirely at Amplitude; aligns with Glen's preference for no labels at scale

**Timeline target:** core structure and primary containers within 1-2 months; 70-80% implementation by month 3. Hard milestone is September (vertical slice).

**ScriptRunner:** flagged by Glen as non-negotiable for automation beyond native Jira capability. Candidate had limited add-on experience but open to research.

**Overlap with approach 1:** both favour components over labels, standardisation over team autonomy, and a minimalist custom field policy.

## Decisions / Insights

- Candidate concluded: parallel running reduces cutover risk by validating parity before the old tool is removed
- Glen observed: backlog pruning during migration prevents ClickUp technical debt migrating into Jira
- Pattern recognised: both experienced Jira administrators independently arrived at the same labels-are-dangerous conclusion
- Glen decided: ScriptRunner is a non-negotiable requirement for the engagement, regardless of candidate chosen

## Context

Jira admin candidate interview (Quentin, Amplitude Studio background) for a ~65-person MMO studio migrating from ClickUp to Jira, June 2026. This was the second interview in a multi-candidate process. September is the hard deadline for a basic working Jira setup tied to the vertical slice milestone.

## Applicability

Relevant when: advising a studio on a Jira migration -- the parallel-run approach reduces risk but extends the transition period; present as a trade-off.
Relevant when: a studio has a bloated backlog in its current tool -- recommend pruning during migration rather than lifting and shifting.
Relevant when: scoping a Jira implementation engagement -- ScriptRunner budget should be included from day one if automation is needed.
Relevant when: a studio is choosing between multiple Jira consultants -- this methodology (vs. the requirements-first approach) is a meaningful differentiator to evaluate.
