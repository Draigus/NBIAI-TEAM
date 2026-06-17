---
source: granola
source_id: not_Vn1AdPFNDQgWTj
source_path: https://notes.granola.ai/d/0bcb37af-db7d-4d0b-8131-3dbf9eb44515
ingested: 2026-06-17
topics_detected: [estimation, min-max, producer-methodology, credibility, planning]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Min/Max Estimation Theory: Why Maximum-Based Planning Destroys Credibility

## Key Content

Pre-session analysis with Valeria ahead of engineering estimations call, CH, 17 June 2026.

**Why min/max instead of single numbers:**
Single numbers from teams with limited production experience are unreliable. Ranges reveal actual understanding. Narrow gap (e.g., 2-4 days) = task is well-understood. Wide gap (e.g., 2-400 days) = team is either scared or has no documentation to estimate from. Wide gaps are the diagnostic signal: ask the estimator to *narrate* what fills that space. Answers surface hidden risks, blockers, and dependencies — e.g., Hannah's 15-day max at CH traced to Mustafa not responding for a week; removing that blocker collapsed her estimate to 4-6 days.

**Why max-based planning fails:**
Showing leads the max figure produces confusion, not caution. Michael: "Why would you plan the max on everything? That doesn't make any sense." Robin: eyeballed it immediately as fake. Leads stop trusting the entire planning exercise. Max numbers destroy the room's relationship with the data.

**The working benchmark:** min + 15-20% — believable enough that leads engage with it as a real problem signal, not so inflated they dismiss the exercise.

**Prototype kits vs full kits:** ensure the plan explicitly distinguishes. Prototype kits unblock bottlenecks (e.g., world builder roadblock at CH) and can materially reduce estimates elsewhere. Missing from CH's current plan.

## Decisions / Insights

- [Glen/Valeria] decided: switch from max-based to min+20% figures in the estimation spreadsheet
- [Glen] observed: max-based planning destroys lead credibility in the planning exercise before any conversation happens
- [Glen] concluded: min+15-20% is the practical benchmark — signal is clear, number is believable
- [Glen] observed: wide min/max gaps are not estimation errors, they are documentation gaps — trace back to GDD owner
- [Michael] flagged: prototype kits vs full kits not distinguished in current plan; prototype kits would materially change numbers

## Context

Pre-call prep between Glen and Valeria (CH Head of Production), 17 June 2026, ahead of engineering estimations session with Mustafa. Note captures Glen's rationale for the estimation methodology, triggered by Valeria's concern that the pivot table using max values had already prompted sceptical reactions from Robin and Michael.

## Applicability

Relevant when: presenting estimation data to senior leads — never show raw maximums; use min+20% to keep the room engaged with the data.
Relevant when: estimation ranges are extremely wide (10-20x ratio) — treat as a documentation gap, not an estimation problem; ask the estimator to narrate what fills the space.
Relevant when: a studio has not distinguished prototype-quality kits from production-quality kits in their plan — the difference can halve or double estimates for dependent work.
Relevant when: a team member's estimate is driven by a dependency (another person's response time, a tool being unavailable) — removing the blocker collapses the estimate without needing re-estimation.
