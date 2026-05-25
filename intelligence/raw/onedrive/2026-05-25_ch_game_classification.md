---
source: onedrive
source_id: ch_game_classification_2026-04
source_path: Clients/Couch Heroes/build_inputs/game_classification.md
ingested: 2026-05-25
topics_detected: [game-feature-taxonomy, mmorpg-systems, production-backlog, work-breakdown]
relevance_score: 7
novelty_score: 7
actionability_score: 6
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: [game_feature_taxonomy]
sensitivity_class: client_scoped
extract_type: methodology
---

# MMORPG Feature Classification Framework (1,200+ Items)

## Key Content

Comprehensive game feature classification for a cosy byte-punk MMORPG with 1,203 items across Game Feature List and TDD (Technical Design Document) sources. Classification uses two axes: type (System/Feature/Content/Platform/LiveService) and layer (Foundation/Core/Feature/Presentation/Polish). 180 items flagged as low-confidence classifications needing human review. Major epic categories: Player Progression (XP, achievements, factions, tutorials, professions), World Systems (corruption/restoration, movement, navigation, day-night, weather), Combat (framework, targeting, hit processing, abilities, AI, PvP, UX/telemetry), User Space & Minigames (housing, decoration), Items & Inventory (item core, inventory, equipment, loot distribution, trading, auction house, forge), Quest System (backend/tooling, events, multiplayer, types, narrative), Social & Multiplayer (chat, friends, co-op, raids, guilds, mail, notifications), UX/UI (HUD, framework, controls, accessibility), Platform (account, auth, privacy, dashboards, quest tracking, certification, payment, online services, launcher).

## Decisions / Insights

- Glen/NBI decided: classification framework uses type x layer matrix to enable prioritisation and gate assignment
- Glen/NBI observed: 180/1,203 items (15%) had low-confidence classifications, targeted for offsite review
- Glen/NBI decided: confidence scoring (high/medium/low) with explicit needs_review_reason enables batch triage
- Glen/NBI observed: TDD items map 1:1 to feature-level Game items but at System type (architectural view of same features)

## Context

Built as input to Couch Heroes offsite (Apr 27-30, 2026). Classification derived from CH_WorkSage_import_v1.xlsx MASTER sheet. Used to structure the feature sweep sessions (Day 1 Sessions 3-4) where leadership reviewed flagged items.

## Applicability

- Relevant when: building production backlogs for MMORPGs or complex multiplayer games
- Relevant when: designing classification frameworks for large feature sets (1,000+ items)
- Relevant when: preparing work breakdown structures for studio leadership review sessions
