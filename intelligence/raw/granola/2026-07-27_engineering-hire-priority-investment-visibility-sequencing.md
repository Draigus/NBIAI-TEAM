---
source: granola
source_id: not_EC3OeA8obHYQ7G
source_path: https://notes.granola.ai/d/245370d7-8a3d-41cc-b4c0-198d74fc8ced
ingested: 2026-07-27
topics_detected: [engineering-hiring, headcount-planning, investment-readiness, org-structure, priority-sequencing]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Engineering Hire Priority Sequencing: Investment Visibility as the Primary Gate

## Key Content

When sequencing engineering hires for a studio approaching an investment round, the lead criterion is investor visibility -- what will investors see and assess during due diligence or a pitch -- not purely functional throughput.

**Priority sequencing observed at a ~55-70 person MMO studio:**
1. Lead Full Stack Developer -- gated by: investor signal. A visible engineering lead in a critical web/platform role signals team completeness to investors
2. DevOps -- gated by: throughput multiplier. Doubles build and deployment capacity for the rest of the team; highest force-multiplier per hire
3. Tech Director + Lead Gameplay Developer -- gated by: leadership completeness. Pattern: hire TD first, convert the current acting lead to confirmed interim Gameplay Lead as a cost-neutral move
4. DevOps, Build Engineer, Tools Engineer -- roughly equal priority; enable platform throughput without requiring senior leadership
5. Gameplay Engineers -- features gated on these but lower urgency than senior leads
6. Remaining Full Stack -- last, lowest leverage for investment narrative

**Backfill clarification as a common confusion point:**
When headcount appears to be growing (e.g. "two new full stack hires"), audit whether these are backfills or net new. In this case: 2 of 3 full stack slots were backfills (replacing departed staff), not additions. The third was converted from a backfill to a build engineer to better match functional need. What looked like headcount growth was structurally neutral.

**Org structure principle:** DevOps, Build, Tools, and Full Stack all run under the same lead full stack role -- not under a separate DevOps lead. This avoids a reporting layer for a tight-team structure.

## Decisions / Insights

- Studio CPO decided: Lead Full Stack hire is priority 1 because it is visible to investors and signals engineering completeness -- not because it is the most functionally urgent
- Studio CPO observed: DevOps has the highest throughput multiplier per hire; doubles build capacity for the whole team
- Studio CPO decided: when TD and Lead Gameplay are both open, hire TD first and convert the acting lead to confirmed interim -- avoids a gap while keeping headcount flat
- Studio CPO observed: apparent headcount growth is often backfill-disguised -- audit each new hire against the departure it replaces before treating it as a net add

## Context

Engineering headcount planning session at a ~55-70 person MMO studio approaching an investment round, 2026-07-27. Org chart audited role-by-role. 4 roles confirmed approved; 6 net new proposed. Fractional CTO expected to approve the plan; TD search already escalated.

## Applicability

Relevant when: advising a studio on engineering hire sequencing ahead of an investment round -- investor visibility should gate priority 1, not just functional urgency.
Relevant when: a studio headcount plan shows what looks like growth -- audit for backfills first; stated growth and net growth are frequently different numbers.
Relevant when: structuring a small engineering org -- consolidating DevOps, Build, Tools, and Full Stack under one lead role avoids reporting overhead for teams under ~80.
Relevant when: two senior engineering roles are simultaneously open -- the TD-first, interim-lead-confirmed pattern fills the leadership gap without burning an additional headcount slot.
