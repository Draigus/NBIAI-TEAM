---
source: granola
source_id: granola_5fdd8c18
source_path: granola://meetings/5fdd8c18-6b57-4132-b1d2-a3ab93f825a3
ingested: 2026-05-25
topics_detected: [production-methodology, epic-structure, gate-system, development-pipeline, estimation]
relevance_score: 10
novelty_score: 9
actionability_score: 10
bank_candidates: [client_couch_heroes, production_methods, client_patterns]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# Offsite Day 2 — Production Framework, Epic Structure, and 6-Stage Development Pipeline

## Key Content

Content and feature epics merged — one epic per domain to avoid misleading completion tracking. Hierarchy defined: Epic (domain) then Feature (3-6 months, multi-discipline) then Story (one sprint, one person) then Task (1-2 days). "Digi Isle" removed as Jira container, replaced by 9 zone features plus 1 lore/overarching story feature. UX/UI embedded within player-facing features, not standalone epic. Vertical slice tracked as Jira fixed version/release filter, not an epic. 14 agreed epics: Player Build, World Systems, Combat, User Spaces and Mini Games, Items and Inventory, Player Economy, Quest System, Social and Multiplayer, Platform, Live Game (new — telemetry/analytics/live ops), Business Development/Partner Build, Publishing, Game Bibles, RMT. Production phases: Pre-production then Early Production then Mid Production then Late Production then Alpha. Gates use tier system (T0-T3+). Key finding: team is in early production, not mid-production. Most systems have prototype code but lack GDDs/TDDs. 6-stage development pipeline: Ideation then R&D then GDD/Brief then Prototype then MVP then Player Ready. Player progression estimated at 60 days designer / 20 days engineer / 20 days UI to reach MVP. Skill system: 90 days designer / 30 days engineer / 25 days UI.

## Decisions / Insights

- [All leads] decided: merge content and feature epics — one per domain to prevent misleading progress tracking
- [Glen] decided: vertical slice is a release filter, not an epic — prevents structural confusion in Jira
- [Glen] decided: 6-stage development pipeline (Ideation through Player Ready) as standard process
- [Glen] observed: team confirmed in early production despite believing mid-production — documentation gaps are the blocker
- [Glen] observed: multiple team members bypassing design approval process — ownership and approval chains needed
- [Glen] decided: combat design must be locked before any further engineering work

## Context

Offsite day 2 on 28 April 2026. Two sessions (morning and afternoon). Covered both retrospective of day 1 and deep production planning. Progress State System (formerly "board and gate") formally defined.

## Applicability

- Relevant when: establishing epic/feature/story/task hierarchy for MMO game development
- Relevant when: designing stage-gate production pipelines for studios transitioning from prototype to production
- Relevant when: diagnosing production maturity gaps (teams believing they are further along than reality)
- Relevant when: structuring Jira for game development with vertical slice as a release filter
- Relevant when: estimating system development effort by discipline (designer/engineer/UI splits)
