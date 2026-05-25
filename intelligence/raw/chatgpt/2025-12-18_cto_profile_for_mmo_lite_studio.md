---
source: chatgpt
source_id: chatgpt_69437062-2884-832b-9e95-5ad3cd3da6e7
source_path: D:\OneDrive\CHATGPT HISTORY\conversations.json
ingested: 2026-05-25
topics_detected: [couch-heroes, cto-hiring, game-studio-leadership, mmo-lite, entitlements, live-service]
relevance_score: 9
novelty_score: 7
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: [studio_staffing_models]
sensitivity_class: client_scoped
extract_type: methodology
---

# CTO Profile for MMO-Lite Studio with Non-Games C-Level Leadership

## Key Content
Detailed CTO archetype for a studio building an MMO-lite platform game (70-100 players per shard, cross-game entitlements, multi-mode gameplay) with junior engineering staff (4 backend, 5 client devs) and C-level leaders who have never built a game. Required shape: hybrid Live-Service Game + Platform CTO, not a general web CTO or pure engine CTO. Must-haves: shipped at least one online sessioned game with real ops, owned a live economy surface with audit trails, built service contracts with schema versioning and idempotency, proven ability to uplift junior teams. Key capability areas: (A) scaling simulation with profiling culture and perf budgets, (B) entitlements as a financial ledger with idempotent partner operations, (C) single extensible gameplay framework to prevent multi-mode sprawl, (D) live operations with environments, CI/CD, observability, incident process. Team organisation: three outcomes (Online Services/Platform, Game/Networking, DevOps/Quality).

Interview screening questions: "Show me an incident postmortem you wrote", "Describe exact perf tests for player caps", "How did you design auditable entitlement grants/revokes", "How did you keep multi-mode from becoming three games", "What standards stuck on a junior team".

## Decisions / Insights
- Glen decided: the CTO must be a translator of risk into decisions using 1-page decision memos with options, tradeoffs, cost, and player impact
- Glen decided: with junior staff, CTO output is leads, standards, and predictable delivery, not hero coding
- Glen observed: "no new replicated feature without perf budget" should be an early, boring CTO decision that saves the studio later
- Glen observed: entitlement systems must be treated as financial ledgers even when no money is involved yet

## Context
Produced December 2025 for Couch Heroes, which was searching for a CTO to lead engineering for their MMO-lite platform game.

## Applicability
- Relevant when: helping a game studio hire a CTO, especially one with non-games founders
- Relevant when: assessing whether a CTO candidate fits a live-service platform game
- Relevant when: advising on engineering team structure for a 9-person dev team building an MMO-lite
- Relevant when: screening interview questions for game studio technical leadership
