---
source: granola
source_id: granola_f41b006d
source_path: granola://meetings/f41b006d-fc3f-403e-9da4-d42ca12d97f9
ingested: 2026-05-30
topics_detected: [feature-status, development-pipeline, estimation, combat, quest-system, technical-architecture]
relevance_score: 9
novelty_score: 7
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# Offsite Day 2 Part 2 -- Feature Status Mapping, Estimates, and System Reviews

## Key Content

Continuation of offsite day 2. Confirmed team in early production, not mid-production. Most systems have prototype code but lack GDDs/TDDs. Many features built ad-hoc for investor demos and need proper redesign for scalability. 6-stage development pipeline colour-coded: Ideation (yellow) > R&D (orange) > GDD/Brief (grey) > Prototype (light blue) > MVP (dark blue) > Player Ready (green). Most features in grey/orange despite some working code. Player Build epic estimates: player progression 60 days designer / 20 days engineer / 20 days UI, skill system 90 days designer / 30 days engineer / 25 days UI, achievements 21 days designer / minimal engineering / 5 days UI. Quest system: 13 quest types designed, backend tooling/events/multiplayer quests all need TDDs, narrative content requires dedicated writing team, in-game cinematics system needed. Combat framework: needs design lock before further engineering, range combat/magic/AI behaviour as separate features, PVP still in ideation. Technical decisions: partner portal requires middleware for game-to-game transitions, user space and housing need major rework, inventory/equipment functional but lack documentation. Corruption system split into 8 different types as separate features.

## Decisions / Insights

- [Glen] confirmed: most features in grey/orange stage despite having prototype code -- documentation gaps are the blocker
- [Glen] decided: combat design must be locked before further engineering work
- [Glen] estimated: player progression 60d designer / 20d engineer / 20d UI for MVP
- [Glen] estimated: skill system 90d designer / 30d engineer / 25d UI for MVP
- [Glen] identified: 13 quest types designed but backend tooling/events/multiplayer all need TDDs
- [Glen] identified: partner portal requires middleware solution for game-to-game transitions
- [Glen] decided: corruption system split into 8 separate features for proper tracking
- [Glen] flagged: multiple team members bypassing design approval process

## Actionable Items

- Mustafa and Robin to collaborate on TDDs for core systems
- Robin to create briefs for corruption system variants
- Sasha and Robin to align on garment system design and documentation
- All leads to review and refine estimates with teams next week
- Establish clear design approval process to prevent unauthorised work
