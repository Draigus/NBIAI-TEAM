# HANDOFF: PlaySage Data Architecture and Consolidated PRD Session

**Date:** 2026-05-19
**Session purpose:** Build PlaySage Data Architecture and Sourcing Strategy spec. Evolved into comprehensive document extraction and consolidated PRD preparation.
**Next session:** Consolidate all findings into a single authoritative PRD v3.0.

---

## What was accomplished

1. **Data Architecture Spec written:** [2026-05-19-data-architecture-spec.md](2026-05-19-data-architecture-spec.md) — covers 6 engines, 2 cross-cutting systems, complete source mapping, collection architecture, build sequence, 23 open actions, and brutal critique (5 critical, 7 high, 8 medium gaps).

2. **Comprehensive document extraction:** All 77+ PlaySage files across Downloads, OneDrive, and project directories were identified. The most critical were extracted by 4 parallel agents. Findings below.

3. **Key decisions made by Glen this session:**
   - £0 ongoing data licensing — PlaySage REPLACES Sensor Tower, Gamalytic, GameDiscoverCo
   - Build proprietary revenue estimation model from public signals
   - Hybrid architecture (structured pipelines + agent swarms) — Approach C
   - PlaySage restart (not just NBI intelligence layer)
   - Jeff's salary dataset pending review before carry-forward
   - Studio partnerships still theoretical — v1 must work without them
   - One-time Sensor Tower access (~$2-5K) acceptable for bootstrapping calibration data
   - Cash flow and balance sheet added to financial modelling suite
   - Conversational Sage chatbot with curated knowledge base and validation gates
   - 7 business-model-specific revenue simulators needed

---

## CRITICAL DISCREPANCIES between documents

These MUST be resolved before consolidated PRD v3.0:

### 1. Tech Stack (CONFLICTING)

| Source | Frontend | Backend | Database | Other |
|---|---|---|---|---|
| Brain module (playsage.md) | Next.js App Router + Tailwind + shadcn/ui | Supabase | PostgreSQL (Supabase) | — |
| PRD v2.0 | Not specified (references FastAPI) | FastAPI | PostgreSQL + DuckDB | — |
| Q&A document (Glen's decisions) | **Lovable** | **FastAPI (Python)** | **Postgres + DuckDB + Redis + S3 + OpenSearch** | PostHog self-hosted |
| Block A v1.1 | Not specified | Not specified | Postgres + DuckDB | S3 ingest pipeline |

**The brain module is WRONG.** Glen decided on Lovable + FastAPI in the Q&A session. This needs to be reconciled — is Lovable still the choice, or has it changed since September 2025?

### 2. Raise Amount (THREE DIFFERENT NUMBERS)

| Source | Amount |
|---|---|
| Brain module / Decision Doc v3 | $10M |
| Investor Deck v1.0 (Oct 2025) | GBP 2.5M seed |
| Full Investor Deck (Playsage.pptx) | GBP 500K seed |

### 3. Pricing (FOUR DIFFERENT STRUCTURES)

| Source | Starter/Entry | Mid | Enterprise |
|---|---|---|---|
| Brain / Decision Doc v3 | $1,500/month | $5,000/month (Pro) | $12K-20K/month |
| Prospectus v1.6 | $300-600/seat/month (Individual) | $18K-60K ARR (Team) | $60K-250K ARR |
| Competitor Report | $500-1,500/seat/month | — | — |
| Product Plan v3.1 | 2 core modules + SSO (Standard) | All core modules (Standard) | All + HC pack |
| Investor Deck | — | Growth ~GBP 60K ACV | Enterprise ~GBP 120K ACV |

### 4. Platform Coverage (CONFLICTING)

| Source | Platforms |
|---|---|
| Brain module | iOS, Google Play, Steam (console "planned") |
| PRD v2.0 | iOS, GP, Steam primary. PS/Xbox for releases + Metacritic sentiment only |
| Q&A (Glen's decision) | 5 platforms: Steam, PS, Xbox, iOS, GP — all in v1 with mocked console data |
| Block A | Steam, Epic, Microsoft Store, PS, Xbox, Nintendo Switch, iOS, GP (8 platforms) |

### 5. Module Names (changed across versions)

| Volume I (Sep 2025) | PRD v2.0 (Mar 2026) | Product Plan v3.1 |
|---|---|---|
| Marketwatch | Market Overview | Market Overview |
| Arena | Competitive Landscape | Competitive Landscape |
| Pulse | Sentiment Intelligence | Sentiment Analysis |
| Foresight | Foresight | Foresight |
| Launch Control | Market Watch: Release Radar | Market Watch: Releases |
| Watchtower | Alerts and Subscriptions | Alerts |
| The Sage | The Sage | The Sage |
| Sight | Executive Dashboard | Executive Dashboard |
| Merchant | Finance and IAP Pricing Intelligence | IAP Index |
| — | API and Integrations | API Access |
| Playermap | DROPPED | DROPPED |
| OrgSight | NBI Human Capital (10 modules) | Human Capital pack |

### 6. The Sage LLM Backend

| Source | Decision |
|---|---|
| Q&A (Glen's decision) | OpenAI ChatGPT API for demo, self-hosted open-weight for v1 |
| This session (Glen) | Conversational chatbot on curated knowledge with validation gates — LLM provider unresolved |

### 7. Sentiment Sources

| Source | What's included |
|---|---|
| PRD v2.0 | App stores + Steam reviews. Reddit/Discord/YouTube "post-demo expansion" |
| Q&A (Glen's decision) | App Store, GP, Steam, Reddit, Discord, X/Twitter, YouTube — ALL in v1 |
| Product Plan v3.1 | Same as Q&A — Reddit, Discord, YouTube included |

### 8. Demo Scope

| Source | Genres | Titles |
|---|---|---|
| Brain module | 4 genres, 12 real + 38 synthetic | Specific 12 titles listed |
| Q&A (Glen's decision) | 5 genres (Shooter, Adventure, RPG, Battle Royale, Strategy) | 60+ approved titles |

---

## DROPPED FEATURES (were in earlier versions, absent from v2.0)

These need explicit keep/drop decisions for v3.0:

1. **Playermap module** — audience overlap, clustering, lookalike exports. Complete module dropped.
2. **Alert backtest-before-save** — "every rule can be back-tested before saving." Dropped.
3. **A/B test plan generator** from The Sage — "ready-to-run test plans." Dropped.
4. **Audience overlap factor** in collision scoring — collision used to factor in audience overlap from Playermap.
5. **"Find safer windows" button** in Release Radar — one-click alternative window finder.
6. **Versioned overrides with audit trail** in Finance module — with "pricing reversals reduced by 50%+" KPI.
7. **Alert dedupe and cooldowns as first-class features** — with false-positive rate target <10%.
8. **Bronze/Silver/Gold medallion data architecture** — replaced by Postgres + DuckDB.
9. **GraphQL API** — replaced by REST-only FastAPI.
10. **WebSocket for real-time alerts** — not in v2.0.
11. **Feature flag framework** — mentioned once in v2.0 but no specification.
12. **Lifecycle Stage as global filter** — dropped entirely.
13. **Bottom-up freemium viewer motion** — "read-only viewer and upsell to authoring seats." Dropped from GTM.
14. **4-tier packaging** (Core/Growth/Pro/Add-on) — replaced by 3-tier.
15. **OrgSight** (simpler people module) — replaced by 10 HC modules.
16. **Design tokens specification** — colours, typography, spacing. No longer specified.
17. **Component inventory** — cards, tables, filters with props. No longer specified.
18. **Telegram and WebGL platforms** — dropped.
19. **Casual, Match, Puzzle, Idle genres** — dropped from seeded set.
20. **Country-level IAP affordability** — explicitly deferred to post-v1.

---

## UNIQUE CONTENT found only in specific documents

### Only in Q&A document:
- Role-per-module mapping (which persona uses which module)
- Business model profile system (first-run wizard orients tools)
- 20 European languages for ingestion
- Release signal monitoring from 15+ GTM channels (Telegram, Poki, TikTok, Twitch, etc.)
- Survey module (import-only v1, micro-panel v1.1)
- Auto-title creation when credible release signals appear
- SMS alerts via AWS SNS
- PostHog for product analytics
- Docker Compose offline demo (not Electron, not static)

### Only in Master Metrics v1 (81 metrics):
- 46 metrics not in any other document including Activation (5), Ads (5), Economy (3), LiveOps (5), Progression (2), Quality (8), Social (4)
- DAU threshold: 120 seconds session duration OR purchase event
- Reactivation inactivity period: 14 days default

### Only in FORESIGHT FORECAST SIMULATOR MODEL.txt (450 lines):
- Battle Pass revenue formula
- Cosmetic revenue formula
- Band construction: Low = 10th-20th percentile, High = 80th-90th percentile, capped at 5th-95th
- Diminishing returns rule for stacked levers
- Expert panel definition (Lead Forecast Scientist, Game Economist, Live Ops Director, Marketing/UA Lead, Market Analyst)
- Revenue recognition per IFRS 15

### Only in Data Dictionary xlsx (53 tables, 336 fields):
- Guardian module table schemas (hc_* with pulse scores, workflow metrics, burnout indicators)
- Finance tables: storefront_fees_defaults, storefront_fee_overrides, refund_rates, tax_rates, publisher_share_models
- 9 storefront fee schedules with specific tiered rates
- Price elasticity defaults: base_game = -1.4, DLC = -1.8

### Only in Foresight Metrics Data Sheet v3.1 (64 tables):
- cfg_rank_to_units_curve (the revenue estimation lookup table)
- cfg_price_elasticity, cfg_revrec_rule, cfg_fee_schedule as config tables
- Full simulation framework (sim_scenario, sim_scenario_param, sim_run, sim_output_metric)
- Battle pass daily, subscription daily, MTX sales daily fact tables
- Payer funnel (first/second/third payer rates)
- LTV cohort daily
- Data quality check catalogue
- ETL audit trail

### Only in Block A v1.1:
- OKR targets: 50 WAU by Q2, backtest MAPE ≤15% at 30d by Q3
- ICP detail: mid-market studio, 100-500 staff, EU/UK
- Component-level module architecture (catalog service, KPI loader, trend engine, etc.)
- 20 module-specific acceptance tests (5 per module)
- Schema registry as Q1 deliverable
- Quarterly build roadmap (Q1 Foundations, Q2 Analyst workflows, Q3 LLM assist)

### Only in Investor Decks:
- Leadership: Tom Rieger (President), Glen Pryer (MD), Bryan Rasmussen (CFO)
- Pilot commitment: Sarge Studios
- Sales funnel: 60 outreach → 18 discovery → 9 pilots → 5+ paid annuals
- Sales motion: Discovery → 2hr Evidence Session → 14-day pilot → Annual contract
- GBP 25K-120K estimated ACV
- Market stats: $189B global games, 170M+ Steam MAU, ~$2.2B game analytics market at 17% CAGR

### Only in Lighthouse Games proposal:
- Real client work proving the forecast methodology at GBP 24,750
- Five-year monthly models: Premium/Sequel vs Hybrid (Premium Y1, F2P+Sub Y2)
- Player segments: Bingers, Grazers, Long Haulers
- Revenue recognition: Bookings, Recognised Revenue, Deferred Revenue roll forward, Cash receipts
- Top sensitivities ranked: Retention L6M, Payer Conversion, Subscription Attach, Price Elasticity

### Only in Microsoft Planner exports:
- Team: Glen Pryer, Magnus Pryer, Tom Rieger, Jeff Day, Devin Rieger, Jessica Williams, Amir Didar
- Active work: Claude front-end development (Devin), Historical Data Source (Devin), Base Models (Devin + Tom)
- Amir built: Battle Pass Modeller, Liveops Modeller, Revenue Cannibalization Matrix, Python forecast functions
- Completed: Twitch scrape, Reddit scrape, YouTube analysis, BigQuery data loading
- GDC 2026 was attended (hotel, travel, salary demo completed)

---

## Glen's existing data repositories (scanned)

| Category | Location | Key files |
|---|---|---|
| Salary datasets | Downloads/Spreadsheets/ | video_game_salaries_2025-2026_Full_Labor_Index_Package, VALIDATED versions, UK quartiles, Games Jobs historical |
| Revenue/KPI benchmarks | Downloads/Spreadsheets/ | video_game_revenue, Global_Revenue_2000-2024, Video-Game-KPI-Benchmarks-2019-24 |
| Investor data | Downloads/Spreadsheets/ | NBI_Game_Investors_VALIDATED, 1350 investor list |
| Financial models | OneDrive/NBI/, Downloads/ | AERM Forecast, 5 Year Financial Forecast, Sarge Headcount Plan |
| Client project data | OneDrive/NBI/couch heroes/ | Staff skill CSVs, risk assessments, goal setting |
| Game industry presentations | Downloads/Presentations/ | Multiple market overview decks |

Glen also mentioned he has extensive game data on the D: drive from his time as head of data for Xbox. This has not been inventoried yet.

---

## Document locations for consolidated PRD work

### Authoritative (latest version of each type):
| Document | Path |
|---|---|
| PRD v2.0 | projects/playsage/Playsage_PRD_v2.0.docx |
| Cascade Engine v1.0 | C:\Users\gpbea\Downloads\playsage_cascade_engine.docx |
| Data Dictionary xlsx | C:\Users\gpbea\Downloads\Spreadsheets\Playsage_Data_Dictionary_20250908_123058.xlsx |
| Foresight Metrics v3.1 | C:\Users\gpbea\Downloads\Spreadsheets\Playsage_Foresight_Metrics_Data_Sheet_v3_1.xlsx |
| Master Metrics v1 | C:\Users\gpbea\Downloads\Spreadsheets\Playsage_Master_Metrics_v1.xlsx |
| Data Dictionary v1 md | C:\Users\gpbea\Downloads\Code\playsage_data_dictionary_v1.md |
| Decisions v3 | C:\Users\gpbea\Downloads\playsage_decisions_v3.docx |
| Financial Summary v4.2 | C:\Users\gpbea\Downloads\Documents\Playsage_Financial_Summary_Positioning_5Y_v4_2_portrait.docx |
| Prospectus v1.6 | C:\Users\gpbea\Downloads\Documents\Playsage_Prospectus_v1.6_Restored_Clean.docx |
| Competitor Report | C:\Users\gpbea\Downloads\Documents\Playsage_Competitor_Pricing_and_Positioning_Report_v1_0_1.docx |
| Product Plan v3.1 | C:\Users\gpbea\Downloads\Documents\Playsage_Product_Plan_v3.1_20250912_033239.docx |
| Block A v1.1 | C:\Users\gpbea\Downloads\Documents\Playsage_Product_Plan_v1.0_20250912_BlockA_v1.1.docx |
| Base Document v1.4 | C:\Users\gpbea\Downloads\Documents\Playsage_Product_Plan_Base_Document_v1.4.docx |
| Q&A document | C:\Users\gpbea\Downloads\Playsage qna 1.docx |
| Foresight System Prompt | C:\Users\gpbea\Downloads\Documents\FORESIGHT FORECAST SIMULATOR MODEL.txt |
| Spec Part 1 (Features) | C:\Users\gpbea\Downloads\Documents\Playsage_Spec_Part1_Exec_and_Features_20250908_182726.docx |
| Spec Part 2 (Design) | C:\Users\gpbea\Downloads\Documents\Playsage_Spec_Part2_Miro_and_Design_20250908_182726.pdf |
| Spec Part 3 (Finance/Data) | C:\Users\gpbea\Downloads\Documents\Playsage_Spec_Part3_Finance_and_Data_20250908_182726.pdf |
| Spec Part 4 (Offline/Reviews) | C:\Users\gpbea\Downloads\Documents\Playsage_Spec_Part4_Offline_Reviews_Trace_20250908_182726.pdf |
| Mock Templates | C:\Users\gpbea\Downloads\Spreadsheets\playsage_mock_templates_v1.xlsx |
| Investor Deck v1.0 | C:\Users\gpbea\Downloads\Presentations\Playsage_Investor_Deck_v1.0_20251010.pptx |
| Planner: PlaySage tasks | C:\Users\gpbea\Downloads\msteams dload\Playsage.xlsx |
| Planner: Foresight tasks | C:\Users\gpbea\Downloads\msteams dload\Playsage Foresight.xlsx |

### Also produced this session:
| Document | Path |
|---|---|
| Data Architecture Spec v1 | projects/playsage/specs/2026-05-19-data-architecture-spec.md |
| This handoff | projects/playsage/specs/HANDOFF_data_architecture_session.md |

---

## Next session priorities

1. **Resolve the 8 critical discrepancies** (tech stack, raise amount, pricing, platforms, etc.) — Glen needs to make decisions on each
2. **Decide on dropped features** — keep/drop for v3.0 for each of the 20 items listed
3. **Consolidate into PRD v3.0** — single authoritative document incorporating all unique content from all 20+ source documents
4. **Update brain/playsage.md** — currently out of date vs Glen's actual decisions
5. **Update data architecture spec** with Foresight system prompt formulas, Master Metrics catalogue, Data Dictionary xlsx schemas, and all unique findings
6. **Migrate key files** from Downloads to projects/playsage/ for version control
