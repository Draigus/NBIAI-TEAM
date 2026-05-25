# Production Methods — Summary

**Last compiled:** 2026-05-25 | **Entries:** 24 | **Sources:** 23
**Role associations:** producer, production_consultant

## What This Bank Knows (top 5)
- Audit-driven improvement cycles with numeric scoring outperform ad hoc bug fixing (19-dimension audit drove +0.7 improvement in one session)
- Work ordering by data-loss risk beats ordering by code aesthetics (tech debt triage pattern: data loss > architectural drift > compliance > state management)
- Fixed 4-level work item hierarchies with prerequisite enforcement (hard-block on completion, soft-warn on starting) prevent scope creep and dependency chaos
- Three-artifact client delivery (Excel planning + Word execution guide + live tracker) keeps planning, guidance, and tracking synchronised
- Autonomous execution with pre-approved plans can clear 33 bugs + 7 features in a single session — the enabling conditions are approved scope, execution authority, and test infrastructure

## Most Recent Additions
- [2026-05-25] Initial compilation from 23 Claude session handoffs spanning April-May 2026

## Coverage by Schema Section
- **Framework Comparison:** 6 frameworks documented with team size, remote-friendliness, and outcomes
- **By Team Scale:** Strong coverage at 10-25 (principal-led), moderate at 25-50 (multi-tenancy), thin at 50-100
- **By Working Model:** Strong on fully remote (NBI + Couch Heroes), no data on hybrid or co-located
- **Sprint/Cycle Length:** Evidence for audit-driven variable cycles and autonomous sessions; no fixed-length sprint data
- **Pre-Production to Production:** Approval gates, data migration gates, security gates documented
- **Live Ops Cadence:** Internal tooling cadence only (email, monitoring); no game-specific live ops data
- **Design and Iteration:** Visual design iteration process (5-7 rounds), 6 build antipatterns, LLM Wiki + AutoResearch
- **Knowledge Architecture:** Role dispatch, context efficiency, technology selection discipline

## Gaps & Open Questions
- No studio-specific sprint/cycle data from client engagements (Couch Heroes, Goals, Lighthouse)
- No hybrid or co-located working model adaptations
- No genre-specific live ops cadence (update scheduling, events, seasonal content)
- No data on scale transition pain points (25 to 50, 50 to 100 people)
- No multi-stakeholder production gate framework (NBI's implicit gate is Glen's sole approval)
- Estimation/velocity tension: milestone-based structuring vs client expectations for delivery dates
- Test infrastructure patterns are CJS/ESM-specific — need framework-agnostic generalisations

## Bank Health
- **Coherence:** High — synthesised by theme, not by source chronology
- **Provenance:** Every factual claim tagged with [source: extract_id]
- **Line count:** ~310 of 500 max — room for client studio data when available
- **Staleness risk:** Low (all sources from April-May 2026, compiled same month)
