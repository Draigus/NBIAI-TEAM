---
source: granola
source_id: granola_0fe5dec4
source_path: granola://meetings/0fe5dec4-08c4-4c97-b546-6bce84c74268
ingested: 2026-05-30
topics_detected: [character-pipeline, lock-system, production-process, quality-gates, change-management]
relevance_score: 9
novelty_score: 9
actionability_score: 9
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# Character Pipeline Development and Three-Tier Lock System

## Key Content

Comprehensive character creation pipeline established from concept to implementation with clear approval gates and handoff points. Parallel workflow structure allows multiple departments to work simultaneously. Three-tier lock system for change management: (1) Open iteration -- full creative freedom, (2) Soft lock -- minor iterative changes allowed, (3) Hard lock -- requires formal change request with cost justification, approval from game director and production heads, must include throwaway cost analysis and impact assessment. Retrospectives planned to track costs of late-stage changes. Code consultation required at two key stages: VFX brief stage (technical feasibility) and combat brief stage (implementation requirements). Brief system creates living documents passed between departments -- each department adds requirements to shared brief before handoff. Automatic notification system planned for status changes. Quality gates include WIP checks at multiple stages, "peaks" system for quick visual validation, scale validation testing within engine during concept phase, three animation samples required (locomotion, attack, traversal). All new ideas must go through Robin (game director) first -- no direct department requests allowed. Production determines feasibility and timeline impact.

## Decisions / Insights

- [Glen] established: three-tier lock system -- open iteration, soft lock, hard lock with formal change requests
- [Glen] decided: hard lock changes require game director + production approval with throwaway cost analysis
- [Glen] decided: code consultation mandatory at VFX brief and combat brief stages
- [Glen] established: all new ideas flow through Robin first -- no direct department requests
- [Glen] decided: three animation samples required per character -- locomotion, attack, traversal
- [Glen] planned: retrospectives to track cost of late-stage changes

## Actionable Items

- David to update Confluence pages based on pipeline changes
- Template creation for standardised brief formats
- Integration with Jira for automated workflow management
- Environment pipeline development scheduled as follow-up
- Team alignment meeting for corrupted character rework
