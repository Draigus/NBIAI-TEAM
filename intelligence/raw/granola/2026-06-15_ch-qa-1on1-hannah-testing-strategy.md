---
source: granola
source_id: not_mK8Dh4Jc0Et6h4
source_path: https://notes.granola.ai/d/1f552fbe-dde5-423e-a329-99e25d54a074
ingested: 2026-06-15
topics_detected: [qa-strategy, test-planning, build-stability, staffing, performance-benchmarks]
relevance_score: 8
novelty_score: 8
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# CH 1:1 Hannah (QA): Testing Strategy, Performance Benchmarks, Build Stability

## Key Content

Hannah Pickard is CH's QA lead. QA estimates described as more granular than expected; Graham and Valeria appreciated the detail.

**Buffer guidance:** Per-feature buffer column (not a blanket 30% on total). Buffer must include looped regression testing through to end of chain. 30% average realistic for now given team size and tooling gaps; expected to drop once TestRail and automation are live. Glen wants the buffer visible, not hidden in headline numbers.

**Sprint model:** QA integrated into every sprint. Priority feature identified per sprint; bugs go to sprint or backlog. Sprint cannot close unless QA declares bug bar was met. Only Glen can override, and sparingly.

**Performance benchmarks (provisional):**
- Tier 5 (min-spec): 60fps, 3-second zone load, zero rubber-banding
- Tier 4 (min-spec): 40fps, 20-second zone load, rubber-banding minimal (1–3 instances; anything over 3 inches = bug)
- Prototype: 25–30fps, up to 1-minute zone load acceptable

**Build machine blocker (critical):** DevOps can only run one build at a time due to build machine pricing/capacity. Mustafa told Hannah this ~8 months ago. Glen was unaware; intends to fix immediately. Hannah to request build machine spec from Mustafa for budget allocation.

**Staffing plan:** Performance testing to be outsourced (one person profiling on three setups is too slow). New roles needed: Senior SDET (writes engine/platform-level test automation, tracks low-level bugs through merges — critical for MMO root-cause debugging). Junior/mid tester (test plan volume). Hannah wants at least one hire with MMO experience.

## Decisions / Insights

- [Glen] decided: sprint cannot close without QA sign-off on the bug bar — only Glen overrides, and sparingly
- [Glen] decided: build machine constraint must be resolved immediately — Glen to allocate budget once Mustafa provides spec
- [Glen] decided: performance testing to be outsourced rather than run solo by Hannah
- [Hannah] decided: per-feature buffer column, not a single blanket percentage
- [Glen] observed: if a testing workload is not on the estimate sheet, it won't count toward staffing or outsource contracts — visibility is non-negotiable
- [Glen] mandated: Confluence page documenting every build process and branch location, maintained by engineering

## Context

1:1 between Glen Pryer and Hannah Pickard (QA lead, Couch Heroes), 15 June 2026. Part of Glen's series of lead 1:1s during the estimation and production planning phase. Graham and Valeria have already reviewed Hannah's estimate sheet.

## Applicability

Relevant when: establishing QA integration into sprint cadence for a studio that has run testing as an afterthought.
Relevant when: setting up per-feature buffer columns in estimation sheets — prevents total-level sandbagging and hidden regression cost.
Relevant when: diagnosing MMO build pipeline constraints — single build machine is a critical bottleneck at studio scale.
Relevant when: scoping QA headcount and outsourcing needs for an MMO with complex systems (SDET is specifically needed for merge-triggered low-level bug detection).
Relevant when: defining performance benchmarks for an MMO prototype — these tier definitions give a concrete reference for what "good enough to test" looks like.
