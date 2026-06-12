---
source: granola
source_id: granola_75160e95
source_path: granola://meeting/75160e95-88e4-4030-8616-241b5cc07e2e
ingested: 2026-06-12
topics_detected: [engineering-process, ai-usage-policy, sprint-management, context-switching, tech-leadership]
relevance_score: 8
novelty_score: 8
actionability_score: 7
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Engineering Pipeline Patterns: Context-Switching Risk and AI Policy at a Mid-Sized Studio

## Key Content

Backend-first then gameplay handoff is the standard delivery pattern; parallel work is the exception. Key risk: P1 backend work completing mid-sprint while the gameplay engineer is deep in a lower-priority task. Engineers resist context-switching mid-delivery. Mitigation: assign smaller fill tasks while waiting on dependencies, not large new work items.

Code handoff protocol: before switching off a task, the engineer must comment code and write a summary of progress, blockers, and stopping point. Hard gates in tools build reliance on the tool rather than the habit; without the gate, the habit disappears.

AI usage policy: blanket prohibition does not work (teams use tools regardless). Agreed approach: teach smart usage (prompt well, red-team the output, review before shipping). Pipeline quality review at 1 to 3 months to assess impact.

Estimation table root cause: tasks had been merged to story level, hiding backend/gameplay sequencing. Separated into explicit backend and gameplay sub-tasks to surface dependency structure.

## Decisions / Insights

- [Glen/Dino] agreed: smart AI usage policy with structured review cycle over blanket prohibition
- [Glen] observed: hard gates in Jira train tool reliance, not engineering discipline
- [Glen] concluded: mandatory code handoff comments required before any context-switch
- [Dino] identified: smaller fill tasks during dependency waits prevent engineers from embedding in wrong-priority work

## Context

Discussed in 1:1 between Glen Pryer and Dino Kandiloros (CH General Counsel with cross-functional visibility), 11 June 2026 at Couch Heroes. Studio has approximately 55 staff and runs Perforce and Jira for engineering.

## Applicability

Relevant when: advising a studio managing parallel workstreams with dependency risk between backend and gameplay layers.
Relevant when: a studio's technical lead is resistant to AI tool adoption and needs a managed rollout approach.
Relevant when: a client's Jira estimation is hiding sequencing issues between engineering disciplines.
Relevant when: coaching a studio on code handoff protocols to reduce sprint-to-sprint knowledge loss.
