---
source: onedrive
source_id: ch_production_consolidation_spec
source_path: Clients/Couch Heroes/production/CONSOLIDATION_SPEC.md
ingested: 2026-05-25
topics_detected: [production-planning, data-consolidation, sprint-planning, studio-tooling]
relevance_score: 7
novelty_score: 6
actionability_score: 7
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# Production Data Consolidation Methodology (3 Sources to 1 Plan)

## Key Content

NBI consolidated Couch Heroes' 3-week production planning from three separate sources (Design xlsx, Engineering xlsx, Miro board) into a single unified work plan (v15 Excel). The process involved: extracting all items from each source while preserving original naming (HARD RULE: never rename stories/features from source materials), mapping estimates across sources, detecting duplicates, reconciling conflicts, and producing a consolidated plan with zero data loss. The Miro board extraction alone required multiple passes with different extraction strategies (DSL format, screenshot extraction, card-by-card detail). Multiple versions tracked (v10 through v15) showing iterative refinement. Miro board analysis documented separately with epic-by-epic breakdowns across 13 epics (Player Build, World Systems, Combat, User Space, Items and Inventory, Player Economy, Quest System, Social and Multiplayer, Game Bibles, Platform, Live Game, Partner Build, Product Publishing).

## Decisions / Insights

- Glen decided: source data naming is sacrosanct; merge new data into existing names, never rewrite
- NBI observed: Miro boards require multiple extraction strategies; no single pass captures everything
- NBI observed: production data consolidation from 3 sources is a high-value repeatable service
- Glen decided: every estimate from every source must be preserved (zero data loss requirement)

## Context

Ongoing engagement with Couch Heroes (~55 employees). Work plan evolved through versions v10-v15 during May 2026. Three sources reflect the studio's distributed planning across design, engineering, and visual planning tools.

## Applicability

- Relevant when: consolidating production data from multiple studio planning tools
- Relevant when: extracting structured data from Miro boards for production tracking
- Relevant when: advising studios on single-source-of-truth production planning
