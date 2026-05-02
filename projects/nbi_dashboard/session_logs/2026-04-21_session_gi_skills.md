# Session Log — 2026-04-21 — Game Investment Skills Build

## Session Start
- **Loaded from:** `docs/HANDOFF.md` (2026-04-21 skill research session)
- **Starting state:** /games router + 25 reference skills installed. /gi architecture planned. Ready to build first custom skill: `market-context`
- **Goal:** Guided Q&A with Glen to build the market-context skill, then iterate through remaining /gi skills

---

## Log

### Entry 1 — Session opened
- Read handoff, confirmed build order: market-context -> forecast-simulation -> live-service-metrics -> pitch-deck-gaming -> data-room-gaming
- Starting guided Q&A for market-context skill

### Entry 2 — Brainstorming Q&A
- **Direction:** Both — helping studios raise AND evaluating for investment
- **Output format:** Full blueprint leading to deliverables (TAM/SAM/SOM, comp tables, pitch decks, forecasts)
- **Key decision: Scrap the 5-skill split.** Glen chose one comprehensive `/gi` skill covering the full pipeline
- **Intake:** 4 profiling questions (direction, game model, stage, deliverable)
- **Frameworks:** All five — AERM funnel, cohort LTV, TAM/SAM/SOM, comp analysis, lifecycle projection
- **AERM correction:** Stands for Acquisition, Engagement, Retention, Monetisation (not Annual Expected Revenue Model as handoff stated)
- **Data approach:** Baked-in real benchmarks by platform/game type + mandatory live pulse check with cited sources every run
- **Deliverable formats:** All (brief, deck, forecast, comp table, data room, due diligence) — routed by engagement

### Entry 3 — Architecture decision: Three Layers
- Layer 1: Knowledge Base (benchmarks, 13 categories)
- Layer 2: Frameworks (5 analytical methodologies)
- Layer 3: Deliverable Templates (6 output formats)
- Glen approved Approach C over linear pipeline and hub-and-spoke alternatives

### Entry 4 — Layer 1 categories critique
- Original 8 categories reviewed against Glen's EA forecast files and existing skills
- Added 5 missing categories: geographic market data, platform economics, lifecycle revenue curves, seasonality patterns, studio unit economics
- Total: 13 categories, each segmented by platform and game type

### Entry 5 — Design approved, spec written
- Full design spec written to `docs/superpowers/specs/2026-04-21-gi-skill-design.md`
- Self-review passed: no placeholders, no contradictions, no ambiguity
- Glen approved: "it looks good. Go ahead and build it."

### Entry 6 — Architecture restructured to router pattern
- Glen clarified: "/gi should be a router, not loading everything into context every chat"
- Restructured to match `/games` pattern:
  - `.claude/skills/gi/SKILL.md` — lightweight router (~50 lines)
  - `.claude/reference-skills/game-investment/` — 5 reference files loaded on demand
- Files: INDEX.md, frameworks.md, deliverables.md, quality-gate.md, benchmarks.md

### Entry 7 — Benchmarks populated via parallel research
- Dispatched 4 parallel research agents:
  - Group A: Market sizing + geo + platform economics (categories 1, 9, 10)
  - Group B: Player metrics (categories 3, 4, 5, 6)
  - Group C: Financial data + transactions (categories 2, 7, 8, 13)
  - Group D: Lifecycle patterns (categories 11, 12)
- All 4 agents completed successfully with cited data
- Assembled into benchmarks.md (~500 lines, 13 categories, all sourced)

### Entry 8 — Verification passed
- All 6 files exist on disk
- Router correctly references reference-skills path
- Framework cross-references match benchmark categories
- All 13 categories present in benchmarks.md
- Spec exists at expected path

## Summary — What Was Built

| File | Purpose | Lines |
|---|---|---|
| `.claude/skills/gi/SKILL.md` | Router (lightweight, in skills listing) | ~50 |
| `.claude/reference-skills/game-investment/INDEX.md` | Index of reference files | ~20 |
| `.claude/reference-skills/game-investment/frameworks.md` | 5 analytical frameworks | ~100 |
| `.claude/reference-skills/game-investment/deliverables.md` | 6 deliverable templates | ~100 |
| `.claude/reference-skills/game-investment/quality-gate.md` | Pulse check + quality gate + anti-patterns | ~60 |
| `.claude/reference-skills/game-investment/benchmarks-market.md` | Market sizing, geographic, platform economics | ~80 |
| `.claude/reference-skills/game-investment/benchmarks-player.md` | Retention, monetisation, engagement, UA costs | ~200 |
| `.claude/reference-skills/game-investment/benchmarks-financial.md` | Multiples, comps, dev costs, unit economics | ~200 |
| `.claude/reference-skills/game-investment/benchmarks-lifecycle.md` | Lifecycle curves, seasonality | ~80 |
| `docs/superpowers/specs/2026-04-21-gi-skill-design.md` | Design spec (historical) | ~145 |

### Entry 9 — Optimisation pass
- Glen reviewed and pushed back on oversteering toward minimal context at expense of quality
- Removed 5 individual framework files (oversteered), kept frameworks.md combined (~100 lines, not worth splitting)
- Kept benchmarks split into 4 files (worth it — saves 300+ lines on most engagements)
- Removed redundant INDEX.md read from router flow — routing table already has exact filenames
- Added natural-language trigger phrases to description ("what's this studio worth", "build a deck for a client", etc.)
- Memory updated: project_gi_skill.md + MEMORY.md index entry

### Entry 10 — Session closed
- `/gi` skill complete and ready for real engagement testing
- Next: test with Sarge Universe pitch deck or similar client work

## Key Decisions

1. One comprehensive `/gi` skill instead of 5 separate skills
2. Router architecture (like `/games`) — only router in context per-conversation
3. AERM = Acquisition, Engagement, Retention, Monetisation (funnel framework, not document format)
4. Baked-in benchmarks + mandatory pulse check every run
5. Three-layer architecture: knowledge base / frameworks / deliverable templates
6. Benchmarks split 4 ways by consumer; frameworks stay combined — balance context savings with simplicity
7. Don't oversteer on optimisation — quality of output when triggered matters more than shaving lines
