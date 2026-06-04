# PlaySage Data Architecture and Sourcing Strategy

**Version:** 1.0 DRAFT
**Date:** 2026-05-19
**Author:** Glen Pryer / Claude (VP Product context)
**Status:** DESIGN — awaiting review
**Purpose:** Foundational data architecture spec for PlaySage. Feeds into PRD v2.1. Defines every data type the platform needs, where it comes from, how it's collected, and what's missing.

**Key constraint:** £0 in data licensing. PlaySage builds its own data layer from public APIs, scraping, derived intelligence, and studio partnership data. PlaySage REPLACES Sensor Tower, Gamalytic, GameDiscoverCo — it does not consume them.

---

## 1. Architecture Overview

PlaySage's data layer has six engines plus two cross-cutting systems, built on a hybrid architecture: structured pipelines for quantitative data, agent swarms for unstructured intelligence.

### 1.1 The Six Engines

| # | Engine | What it does | Storage | Update cadence |
|---|---|---|---|---|
| 1 | **Market Intelligence** | Rankings, CCU, pricing, metadata, releases across iOS/GP/Steam/PS/Xbox | PostgreSQL + DuckDB | Daily by 09:00 UTC |
| 2 | **Revenue Estimation** | Proprietary rank-to-revenue/DAU calibration models | DuckDB + model artifacts | Daily (after rankings ingest) |
| 3 | **Sentiment** | NLP pipeline: review ingestion, BERTopic topic modelling, sentiment classification | PostgreSQL (raw) + DuckDB (indices) | Daily by 09:00 UTC |
| 4 | **Forecast/Scenario** | ETS/TBATS baseline + 7 scenario types + financial modelling (P&L, cash flow, balance sheet, EBITDA) | DuckDB | On-demand + daily baseline refresh |
| 5 | **Salary/Compensation** | Global salary benchmarks by role/grade/country/city | PostgreSQL | Weekly (job boards), quarterly (gov APIs), annual (reports) |
| 6 | **Human Capital Operations** | Org health, team performance, burnout, skills, hiring, coaching, OKRs, risk | PostgreSQL | Studio-provided (event-driven via connectors) |

### 1.2 Two Cross-Cutting Systems

| System | What it does |
|---|---|
| **Cascade Engine** | Event-driven pub/sub. Modules emit events → propagation rules connect them → financial cascades check P&L supports headcount against forecast → alert escalation with context enrichment. |
| **The Sage / Chatbot** | Dual-mode: (a) structured recommendation engine with lift ranges and evidence chains, (b) conversational LLM interface over compiled knowledge with deep validation gates. |

### 1.3 Data Flow

```
COLLECTION → STORAGE → PROCESSING → CASCADE → SAGE → USER

Collection:
  Tier 1: API pipelines (Steam, IGDB, RAWG, pricing APIs, gov salary APIs)
  Tier 2: Agent swarm (news, reviews, job boards, reports, competitor features)
  Tier 3: Studio connectors (Jira, Azure Boards, Shortcut, ATS, LMS, CSV)
  Tier 4: Daily chart ranking ingest (iOS/GP/Steam — for revenue estimation)

Storage:
  PostgreSQL: transactional (users, orgs, alerts, raw reviews, HR data, salary records)
  DuckDB: analytical (kpi_daily, forecasts, sentiment indices, salary benchmarks)

Processing:
  Revenue estimation (rank → DAU/revenue calibration curves)
  Sentiment NLP (BERTopic, classification, profanity masking)
  Forecast engine (ETS/TBATS + scenario overlays + financial modelling)
  Salary normalisation (cross-source dedup, currency conversion, PPP adjustment)

Cascade:
  Event bus (module event contracts, typed payloads)
  Propagation rules engine (stateless, additive rule set)
  Financial cascades (forecast → P&L → headcount viability → runway)
  Alert composer (escalation tiers, context enrichment, noise suppression)

Sage:
  Recommendation generation (rule + heuristic + small ML ranking)
  LLM conversational layer (targeted on compiled knowledge)
  Validation gates (evidence chain required, confidence thresholds)
  Outcome logging (acceptance/rejection, realised lift tracking)
```

---

## 2. Engine 1: Market Intelligence

### 2.1 Data Types Required

| Data type | Modules that consume it | Required granularity |
|---|---|---|
| App store rankings (top charts) | Market Overview, Revenue Estimation, Foresight | Daily, per category, per country, per platform |
| Game metadata (title, publisher, genre, platforms) | All modules | Per title, updated on change |
| CCU (concurrent users) | Market Overview, Competitive Landscape, Foresight | Hourly (Steam), daily aggregate for mobile (estimated) |
| Pricing (current price, discount history, regional) | Finance/IAP, Competitive Landscape, Foresight | Daily, per platform, per region |
| Release dates and patch notes | Market Watch, Competitive Landscape, Cascade | Per release event |
| Update/version history | Competitive Landscape, Sentiment (Since Last Update) | Per update |
| Ratings and review counts | Market Overview, Sentiment | Daily |
| IAP catalogue (SKU, price, type) | Finance/IAP | Per title, updated on change |
| Store feature/featuring status | Foresight (featuring uplift) | Daily |
| Monetisation signatures (battle pass, gacha, etc.) | Competitive Landscape, Finance/IAP | Per title, detected from store page/patch notes |

### 2.2 Sources and Collection Methods

| Source | Data provided | Collection method | Free? | Rate limits | Coverage |
|---|---|---|---|---|---|
| **Steam Web API** | CCU (current), player summaries, achievements, owned games, news | REST API, free key | Yes | ~100K calls/day, ~1/sec | Steam only |
| **Steam Store API** (undocumented) | Pricing (regional), metadata, genres, Metacritic, screenshots | REST, no auth | Yes | ~200 req/5 min | Steam only |
| **SteamSpy API** | Owner estimate ranges, playtime, CCU, tags | REST, no auth | Yes | 1 req/sec, 1 req/min for /all | Steam only, degraded accuracy post-2018 |
| **IGDB API** (Twitch) | Richest cross-platform metadata: 500K+ games, covers, companies, release dates | REST (Apicalypse), Twitch OAuth2 | Yes | 4 req/sec | All platforms |
| **RAWG API** | Game metadata, Metacritic, playtime, screenshots | REST, free key | Yes | 20K req/month | All platforms |
| **CheapShark API** | PC pricing across stores, historical lows | REST, no auth | Yes | Undocumented (lenient) | PC digital stores |
| **IsThereAnyDeal API** | 30+ store pricing, historical lows, bundles | REST, free key | Yes | Dynamic | PC digital stores |
| **App Store rankings** | iOS top charts by category/country | Scrape (Crawl4AI agent) | Yes (scraping) | Self-imposed | iOS |
| **Google Play rankings** | Android top charts by category/country | Scrape (Crawl4AI agent) | Yes (scraping) | Self-imposed | Android |
| **Metacritic/OpenCritic** | Review scores, user reviews (PS/Xbox sentiment source) | Scrape (Crawl4AI agent) | Yes (scraping) | Anti-bot on Metacritic | PS, Xbox, cross-platform |
| **Publisher newsrooms** | Release announcements, press releases | RSS + agent swarm | Yes | N/A | Major publishers |
| **GiantBomb API** | Editorial content, character/lore data, historical | REST, free key | Yes | 200/resource/hr | Cross-platform |

### 2.3 Storage Schema (from data dictionary)

Primary tables: `titles`, `title_platforms`, `title_genres`, `kpi_daily`, `releases`, `patch_notes`, `content_tags`, `collision_windows`, `monetisation_signatures`, `iap_skus`, `iap_prices`, `data_sources`, `data_freshness`, `transform_runs`

---

## 3. Engine 2: Revenue Estimation (Core IP)

### 3.1 What This Engine Does

Converts publicly observable signals (chart rankings, rating velocity, review volume, CCU trends) into revenue and DAU estimates with confidence bands. This is the core intellectual property that makes PlaySage competitive without licensed data feeds.

### 3.2 Methodology

**Approach:** Platform-specific rank-to-metric calibration curves.

For each platform (iOS, Google Play, Steam), build regression models that map:
- Chart position → estimated daily downloads
- Chart position + monetisation signature → estimated daily revenue
- Rating velocity (new ratings per day) → DAU proxy
- Review volume patterns → engagement proxy

**Calibration sources (no licensing required):**
- Public company quarterly earnings (EA, Take-Two, Ubisoft, Embracer, NetEase, Tencent) — map disclosed revenue to observed chart positions for their titles during reporting periods
- Publicly disclosed download milestones (studio press releases: "10 million downloads in first week")
- Steam achievements unlock percentages (proxy for installed base and engagement)
- SteamSpy owner estimate ranges (cross-validation)
- Studio partnership actuals (when available — the flywheel)

**Model architecture:**
- Per-platform, per-category calibration curves (mobile Top Grossing behaves differently from Steam Top Sellers)
- Bayesian updating: each new calibration data point narrows confidence bands
- Seasonal adjustment layers (holiday spikes, summer dips)
- Country-level scaling factors (US as base, other markets as multipliers)

**Confidence scoring:**
- Green (≥80%): title has direct calibration data or very close analogues
- Yellow (60-79%): genre/platform has calibration data but this specific title doesn't
- Red (<60%): sparse calibration data, wide confidence bands

### 3.3 Outputs

Written to `kpi_daily` with `estimated = true` flag. Fields: `dau_proxy`, `mau_proxy`, `revenue_proxy`, `arp_dau_proxy`. All modelled metrics carry provenance detail (source, transform summary, last refresh, confidence score).

### 3.4 Historical Backfill

12-24 months needed for Foresight baseline models. Sources for backfill:
- Steam: SteamSpy historical data + Steam Charts CCU history (scrape)
- iOS/Android: historical ranking data must be collected from this point forward (no free source for historical rankings exists)
- Alternative: purchase one-time historical ranking dataset from a data broker, or begin collection now and accept limited history at launch

---

## 4. Engine 3: Sentiment

### 4.1 Data Types

| Data type | Source | Collection | Volume estimate |
|---|---|---|---|
| App Store reviews | Apple App Store RSS feeds | Scheduled pull | ~100-1,000/day per tracked title |
| Google Play reviews | Google Play (scrape) | Crawl4AI agent | ~100-1,000/day per tracked title |
| Steam reviews | Steam Web API + Store page | API + scrape | ~50-500/day per tracked title |
| Metacritic user reviews | Metacritic (scrape) | Crawl4AI agent | ~10-100/day per tracked title |
| OpenCritic user reviews | OpenCritic (scrape) | Crawl4AI agent | ~10-100/day per tracked title |
| Social media (v2) | Twitter/Reddit/Discord/YouTube | Future expansion | TBD |

### 4.2 Processing Pipeline

1. **Ingest:** Raw review text + metadata (platform, version, timestamp, rating, language)
2. **Language detection:** Filter to supported languages (EN primary, expand post-launch)
3. **Profanity masking:** Standard filter + per-title configurable word lists
4. **Sentiment classification:** Fine-tuned classifier outputting -1 to +1 score
5. **Topic modelling:** BERTopic for coherent topic clusters on short review texts
6. **Intent tagging:** Rule-based (bug report, balance complaint, value objection, delight)
7. **Aggregation:** Daily sentiment index (0-100), topic weights, volume counts
8. **Since Last Update:** Delta calculation tied to release events from Engine 1

### 4.3 Storage

`reviews_raw`, `review_topics`, `sentiment_daily_index`, `social_posts_raw` (v2)

---

## 5. Engine 4: Forecast/Scenario

### 5.1 Seven Scenario Types

| Type | Key inputs | Key outputs |
|---|---|---|
| **Live Game** | Business model, update cadence, event calendar, IAP changes, CRM levers | DAU, MAU, CCU, Revenue, ARPDAU, ARPU, ARPPU, LTV, Retention (D1-D180), Conversion |
| **Box + DLC** | Launch price, discount calendar, DLC plan, attach rates, finance inputs | Sell-in, sell-through by region, MAU, gross/net revenue, EBITDA |
| **Box** | Launch price, discount calendar, curve shape, wishlist signal | Units, gross/net revenue |
| **DLC** | Installed base, price, attach rate, DAU uplift profile | Units, attach rate, DAU uplift, cannibalization |
| **Expansion** | Editions, reactivation share, attach rate, IAP impact | Reactivation, DAU/MAU uplift, revenue |
| **Mobile Game (Live)** | Featuring, UA budget, battle pass, event cadence, regional pricing | DAU, MAU, Revenue, ARPDAU, conversion |
| **CRM/Marketing** | Channels, send volume, segments, incentive, cadence | ROAS, views, click-through, installs, users per million views |

### 5.2 Financial Modelling Layer

**Currently in PRD v2.0:** P&L (Gross → Net → EBITDA) with storefront fee schedules, publisher share, refunds, tax, UA/marketing, servers, support.

**Glen's additions (not yet in PRD):**
- **Cash flow modelling:** Operating cash flow, investment cash flow, financing cash flow. Requires: payment terms by platform (Apple Net-45, Google Net-30, Steam monthly), development cost schedule, UA spend timing.
- **Balance sheet:** Assets (cash, receivables, IP valuation), liabilities (payables, deferred revenue from battle passes/subscriptions), equity. Requires: accounting inputs that go well beyond public game data.
- **Guided financial workflow:** Step-by-step financial statement builder that asks the right questions and populates the model, rather than requiring the user to be a finance expert.

### 5.3 Financial Statement Suite

The Foresight financial layer produces three interconnected financial statements, not just P&L. Each flows into the next, and the Cascade Engine validates cross-statement consistency.

#### 5.3.1 Profit & Loss (exists in PRD v2.0)

Already specced. Structure per business model:

**F2P Live Service:**
```
Revenue
  IAP Revenue (consumables, non-consumables, subscriptions)
  Battle Pass Revenue (recognised straight-line over season)
  Ad Revenue (if applicable)
  = Gross Revenue
- Platform Fees (Apple 30%/15% small business, Google 30%/15%, Steam 30/25/20 tiered)
- Publisher Share (if applicable)
- Refunds
- Tax
  = Net Revenue
- UA / Marketing Spend
- Server / Infrastructure
- LiveOps / Support
- Development (ongoing content)
  = EBITDA
```

**Box + DLC:**
```
Revenue
  Base Game Units × Price (by platform, by region)
  DLC Units × Price × Attach Rate
  Expansion Units × Price × Attach Rate
  = Gross Revenue
- Platform Fees (tiered by store)
- Publisher Share
- Returns / Refunds
- Tax
  = Net Revenue
- UA / Marketing (front-loaded around launch)
- Manufacturing / Distribution (physical, if any)
- Server / Support
  = EBITDA
```

**First Game vs Established Studio adjustments:**
- First game: no franchise multiplier on UA efficiency, higher CPI assumptions, wider confidence bands on conversion/attach rates, no cross-promotion benefit
- Second/third game: franchise awareness coefficient on UA, established conversion benchmarks from prior titles, cross-promotion uplift, existing community base as organic acquisition channel

#### 5.3.2 Cash Flow Statement (NEW — not in PRD v2.0)

The P&L tells you if you're profitable. Cash flow tells you if you can make payroll. For game studios, these diverge significantly because of payment timing, capitalised development costs, and deferred revenue.

**Operating Cash Flow:**
```
Net Income (from P&L)
+ Adjustments for non-cash items:
  + Depreciation / Amortisation of capitalised dev costs
  + Stock-based compensation
  + Deferred revenue changes (battle pass pre-sales recognised over season)
+ Working capital changes:
  + Change in Accounts Receivable
    (Platform payment terms: Apple Net-45, Google Net-30, Steam monthly)
  + Change in Accounts Payable (vendor invoices, outsourcing)
  + Change in Accrued Expenses (salaries, bonuses earned but unpaid)
  + Change in Prepaid Expenses (UA campaigns paid upfront)
= Operating Cash Flow
```

**Investment Cash Flow:**
```
- Capitalised Development Costs (dev team salaries during production)
- Equipment / Infrastructure purchases
- Tool licences (annual prepayments)
- IP Acquisition costs (licensed IP, music, etc.)
- Studio / Office fit-out
= Investment Cash Flow
```

**Financing Cash Flow:**
```
+ Equity Raises (seed, Series A, etc.)
+ Debt Drawn (loans, lines of credit, publisher advances)
- Loan Repayments
- Dividend Payments (if any)
- Share Buybacks (if any)
= Financing Cash Flow
```

**Net Cash Position = Opening Cash + Operating + Investment + Financing**

**Data inputs required (user-provided via guided wizard):**
- Platform payment terms (defaults: Apple Net-45, Google Net-30, Steam monthly, Sony Net-60, Microsoft Net-45 — user can override)
- Development team cost schedule (monthly burn by phase: pre-production, production, live ops)
- UA spend timing (front-loaded at launch vs sustained)
- Deferred revenue schedule (battle pass season length, subscription billing cycle)
- Capitalisation policy (what % of dev costs are capitalised vs expensed)
- Existing cash position and debt

**Key output:** Runway calculation — months of cash remaining at current burn rate, factoring in revenue timing. This is the number The Sage uses for "can you afford this headcount plan?" cascade triggers.

#### 5.3.3 Balance Sheet (NEW — not in PRD v2.0)

**Assets:**
```
Current Assets:
  Cash and Cash Equivalents (from cash flow statement)
  Accounts Receivable (platform payments owed, aged by platform terms)
  Prepaid Expenses (UA campaigns, annual licences)
  Short-term Investments

Non-Current Assets:
  Capitalised Development Costs (net of amortisation)
  Property & Equipment (net of depreciation)
  Intangible Assets (IP, trademarks)
  Goodwill (if acquisitions)
  Right-of-Use Assets (office leases under IFRS 16)
= Total Assets
```

**Liabilities:**
```
Current Liabilities:
  Accounts Payable (outsourcing vendors, freelancers, tools)
  Deferred Revenue (battle pass pre-sales, subscriptions billed ahead)
  Accrued Expenses (salaries, bonuses, holiday pay accrual)
  Tax Payable
  Current Portion of Debt
  Lease Liabilities (current portion)

Non-Current Liabilities:
  Long-term Debt (publisher advances, loans)
  Lease Liabilities (non-current)
= Total Liabilities
```

**Equity:**
```
  Common Stock / Share Capital
  Additional Paid-in Capital (investor money above par)
  Retained Earnings (cumulative P&L, carried forward)
  Treasury Stock (if buybacks)
= Total Equity

Total Liabilities + Equity = Total Assets (must balance)
```

**Cascade integration:**
- When Foresight changes a revenue forecast → P&L changes → Retained Earnings changes → Balance Sheet rebalances → Cash position recalculates → Runway updates → Cascade checks headcount viability
- When HC module adds headcount → Salary costs increase → P&L changes → same cascade
- When a new equity raise is modelled → Financing cash flow changes → Cash position improves → Runway extends → previously-flagged headcount risks may clear

**Data inputs required (user-provided via guided wizard):**
- Opening balance sheet (or defaults for a seed-stage studio)
- Capitalisation policy
- Amortisation schedule for dev costs (typically 2-5 years, or revenue-proportional)
- Lease terms (office, equipment)
- Debt terms (interest rate, repayment schedule)
- Equity structure (shares outstanding, par value)

**Guided wizard approach:**
The balance sheet wizard asks progressive questions based on studio maturity:
- **Seed/Pre-revenue:** "How much cash do you have? Do you have any debt? Are you renting office space?" → generates simplified balance sheet
- **Growth/Live title:** Full balance sheet with receivables aging, deferred revenue, capitalised costs
- **Established/Multi-title:** Full balance sheet with goodwill, intangibles, complex equity structure

### 5.4 Business-Model-Specific Revenue Simulators

The PRD defines 7 scenario types. Each needs its own revenue estimation model because the economics are fundamentally different. This section specifies the simulator for each.

#### Simulator 1: F2P Live Service

**Revenue formula:**
```
Daily Revenue = DAU × Conversion Rate × ARPPPU × Purchase Frequency Factor
```

**Key model parameters:**
| Parameter | Source | Default | Override? |
|---|---|---|---|
| DAU baseline | Engine 2 (Revenue Estimation) or user upload | From rank-to-DAU model | Yes |
| Conversion rate (non-payer → payer) | Genre benchmarks or user input | Genre median (e.g. 2-5% for mid-core) | Yes |
| ARPPPU (avg revenue per paying player per period) | IAP catalogue analysis + genre benchmarks | Genre median | Yes |
| Purchase frequency | Genre benchmarks | Weekly for gacha, monthly for cosmetics | Yes |
| Battle pass attach rate | Genre benchmarks or user input | 5-15% of MAU | Yes |
| Battle pass recognition | Straight-line over season length | User sets season length | Yes |
| Subscription revenue | Monthly recurring | User sets price/tier | Yes |
| Ad revenue (if applicable) | eCPM × impressions per DAU | Genre/region defaults | Yes |

**Seasonality:** Weekly (weekend uplift), event-driven (LTM events, holiday events), annual (Christmas, Summer)

**First game vs established:**
- First game: conversion rate floored at conservative end of genre range, ARPPPU uses P25 not median, wider confidence bands
- Established: can use prior title conversion as baseline, franchise cross-promotion DAU uplift

#### Simulator 2: Box Sales (Premium)

**Revenue formula:**
```
Units(t) = Launch_Curve(t) × Price_Elasticity(price, t) × Featuring_Multiplier × Collision_Penalty
Gross Revenue = Σ Units(t) × Price(t) across all regions/platforms
```

**Launch curve shapes:**
- Front-loaded (typical AAA): 40-60% of lifetime in week 1, exponential decay
- Standard: 25-35% in week 1, moderate decay
- Long-tail (strong word-of-mouth): 15-20% in week 1, shallow decay, periodic uplift from sales

**Price elasticity:** Per-genre defaults (Box ε=-1.4 as PRD default, needs citation), applied when discounts are modelled. Floor price enforcement prevents race-to-bottom.

**Wishlist/pre-order signal:** If available, scales launch week multiplier. SteamSpy wishlist-to-sales ratio benchmarks: typically 0.2-0.5x depending on genre and marketing.

#### Simulator 3: Box + DLC

Combines Simulator 2 (base game) with DLC attach model:
```
DLC Revenue = Installed_Base(t) × Attach_Rate × DLC_Price
```
Where Installed_Base grows with base game sales but decays with player drop-off. Attach rates typically: 10-30% for substantial DLC, 3-10% for cosmetic/minor DLC. Halo effect: DLC launch reactivates base game players temporarily.

#### Simulator 4: Expansion Pack

Major content release with reactivation economics:
```
Expansion Revenue = (Active_Players × Attach_Rate + Lapsed_Players × Reactivation_Rate) × Expansion_Price
```
Editions (Standard, Deluxe, Collector's) modelled separately with different price points and attach rates.

#### Simulator 5: Mobile Game (Live)

F2P live service (Simulator 1) with mobile-specific levers:
- Featuring uplift (Apple/Google editorial featuring: +50-500% daily installs during feature window)
- UA-driven growth: CPI × budget = installs, installs × retention cascade = DAU growth
- Battle pass seasonality (2-4 week seasons typical for mobile vs 8-12 weeks for PC/console)
- Regional price tiering (purchasing power parity-adjusted IAP pricing)

#### Simulator 6: CRM/Marketing Campaign

Not a revenue model per se — models the revenue IMPACT of a marketing action:
```
Reactivated Users = Lapsed_MAU × Reach × Open_Rate × Click_Rate × Reactivation_Rate
Revenue Impact = Reactivated_Users × ARPDAU × Duration_of_Reactivation_Effect
ROAS = Revenue Impact / Campaign Cost
```

#### Simulator 7: Hybrid / Portfolio

For studios running multiple business models simultaneously (e.g. a F2P mobile game plus a premium PC title in the same franchise). Cross-title effects: cannibalization, cross-promotion, franchise awareness multiplier.

**All simulators share:**
- Confidence banding (Green/Yellow/Red based on data quality + calibration depth)
- Backtest accuracy metrics (MAPE, MAE) when historical data exists
- Transparent methodology panel ("how was this number computed?")
- Export to P&L → Cash Flow → Balance Sheet cascade

### 5.5 Integrated Trigger System (Cascade Financial Integration)

When Foresight projects a change, the Cascade Engine checks:
- Does the P&L support the current headcount at the new revenue projection?
- Does the cash flow model show runway concern at the new burn rate?
- Does the hiring plan in HC module 7.15 align with the financial forecast?
- Are server/infrastructure costs viable at the projected DAU?

These triggers fire propagation events that The Sage synthesises into actionable warnings or recommendations.

### 5.4 Data Dependencies

The forecast engine consumes outputs from ALL other engines:
- Engine 1 (Market Intelligence): baseline KPIs, rankings, pricing, releases
- Engine 2 (Revenue Estimation): DAU/revenue proxies as baseline inputs
- Engine 3 (Sentiment): sentiment_index as exogenous regressor
- Engine 5 (Salary): compensation costs for headcount planning cascades
- Engine 6 (Human Capital): headcount data for financial cascades

---

## 6. Engine 5: Salary/Compensation

### 6.1 Data Sources (Comprehensive Map)

#### Tier A: Free annual reports (download + extract)

| Report | Coverage | Frequency | Format | Access |
|---|---|---|---|---|
| Skillsearch Games & Immersive | Global, by role/region/seniority | Annual | PDF | Free download |
| 8BitPlay Gamedev Salary Pulse | Global (~1,200 respondents) | Annual | PDF | Free |
| Big Games Industry Employment Survey | 85 countries (~1,650 respondents) | Annual | PDF | Free via InvestGame.net |
| GDC Salary Report | US-focused | Annual | PDF | Free (email-gated) |
| GAME Verband Germany | Germany (343 companies) | Annual | Free | Free |
| SNJV Barometre | France | Annual | PDF | Free |
| UKIE Census | UK | Every 2-3 years | PDF | Free when published |
| IGDA Developer Satisfaction Survey | Global | Biennial | PDF | Free |
| UK Salary Transparency Spreadsheet | UK (~1,300 entries, ~50 roles, 7 seniority levels) | Ongoing | Google Sheet | Free |

#### Tier B: Job boards to scrape

| Board | Salary visible? | Anti-bot? | Coverage | Priority |
|---|---|---|---|---|
| GamesJobsDirect | Yes | Minimal | UK, US, Canada, Aus, EU | HIGH |
| Indeed | Yes (incl. estimates) | Cloudflare + rate limiting | Global | HIGH (via Apify) |
| Reed.co.uk | Yes | Low (has official API) | UK | HIGH |
| Seek.com.au | Yes | Low | APAC | HIGH |
| ZipRecruiter | Yes | Low | US, Canada | HIGH |
| RemoteGameJobs | Partial | Minimal | Global remote | MEDIUM |
| Google Jobs | When source includes it | Needs Playwright | Aggregates all boards | HIGH |
| Glassdoor | Rich data | Very hard (Cloudflare + DataDome + login) | Global | LOW (difficulty) |
| LinkedIn | Sparse salary data | Aggressive, legal risk | Global | LOW (risk) |
| StepStone | Inconsistent | Low | Germany/Austria | MEDIUM |
| Totaljobs | Decent | Low | UK | MEDIUM |

#### Tier C: Government statistical APIs

| Source | Country | Game-specific code? | Key endpoint |
|---|---|---|---|
| BLS OEWS | US | Partial (NAICS 511210) | Free API, 500 queries/day |
| Statistics Canada Job Bank | Canada | **YES (NOC 21232)** | Free, official |
| ABS / Jobs and Skills Australia | Australia | **YES (ANZSCO 261211)** | Free, official |
| ONS ASHE / NOMIS | UK | No (SOC 2136 closest) | Free, regional breakdowns |
| Eurostat SES | All EU | Partial (NACE 58.21) | Free, 4-year cycle |

#### Tier D: Salary aggregator sites

| Site | Game companies covered | Scrapeable? |
|---|---|---|
| Levels.fyi | Riot, Epic, EA, Activision, King | .md endpoints for LLM crawling |
| PayScale | Game Designer, Game Programmer | Free browsing (commercial API available) |
| Comparably | Riot, Ubisoft, EA | Moderate difficulty |
| Built In | Game developer aggregate (US city-level) | Low difficulty |

#### Jeff Day's Existing Dataset

- 5MB CSV, QA'd (FULL_DATABASE_QA_EXECUTIVE_SUMMARY.pdf)
- 80 records flagged for caution (small market countries)
- Status: **pending Glen's review before deciding carry-forward vs seed**

### 6.2 Storage

HC module 7.16 tables: `hc_comp_benchmarks`. Plus SalarySage-specific tables for the salary database, job listing records, and report extract records.

### 6.3 Processing

- Cross-source deduplication (same role/company across multiple boards)
- Currency normalisation (all to USD + local currency)
- PPP adjustment for affordability scoring
- Seniority level mapping (junior/mid/senior/lead/director/VP/C-suite harmonisation across sources)
- Confidence scoring per data point (survey report > government API > job listing > aggregator site)

---

## 7. Engine 6: Human Capital Operations

### 7.1 Data Sources

All HC data is studio-provided via connectors or CSV upload. This is NOT publicly available data.

| Data type | Source | Connector |
|---|---|---|
| Sprint/project metrics | Jira, Azure Boards, Shortcut | API connectors |
| Employee engagement surveys | Survey tools (CSV import) | CSV upload |
| Hiring pipeline | ATS systems (Greenhouse, Lever, Workable) | API connectors or CSV |
| Training/skills | LMS exports | CSV upload |
| OKRs | Internal tools | CSV or manual entry |
| Time tracking | Jira, Toggl, Clockify | API connectors |

### 7.2 Aggregation Thresholds

All people data subject to minimum group sizes to prevent individual identification. PRD specifies this but doesn't define the threshold.

### 7.3 Modules Served

7.11 Org Health Diagnostics, 7.12 Team Performance Analytics, 7.13 Burnout and Load Balance, 7.14 Skills Matrix and Staffing, 7.15 Hiring Forecast and Workforce Planning, 7.16 Compensation and Affordability, 7.17 Change Telemetry and Adoption, 7.18 Coaching Impact, 7.19 Studio Scorecards and OKRs, 7.20 Risk Register and Early Warning

---

## 8. Cross-Cutting: Cascade Engine

### 8.1 Architecture

Event-driven pub/sub with three layers:
1. **Signal Layer:** Modules emit typed events with base schema (event_id, source_module, event_type, severity, ts, payload)
2. **Propagation Layer:** Stateless rules engine subscribes to event bus, evaluates conditions, fires downstream actions
3. **Synthesis Layer:** The Sage consumes enriched events, generates cross-module recommendations

### 8.2 Financial Cascade Path (Glen's trigger system)

```
Foresight projects revenue change
  → Finance module generates P&L impact assessment
    → Cascade checks: does revised P&L support current headcount plan?
      → If NO: Sage generates warning with specific headcount/cost gap
      → If YES: Cascade checks cash flow runway at new burn rate
        → If runway < threshold: Sage generates runway alert
```

This requires Engine 4 (Forecast), Engine 5 (Salary — for compensation costs), and Engine 6 (HC — for actual headcount) to all have data. At launch without studio partnerships, this cascade can only work with user-provided financial assumptions, not observed data.

### 8.3 Cascade Controls

- Circuit breaker: max 3 propagation hops per event (prevent cascade storms)
- Cooldown: same event type suppressed for 24 hours after firing
- Deduplication: fingerprint-based event dedup within processing window
- Severity gating: only Warn and Critical events propagate beyond origin module

---

## 9. Cross-Cutting: The Sage / Chatbot

### 9.1 Dual-Mode Architecture

**Mode A: Structured Recommendations (PRD v2.0 spec)**
- Rule + heuristic + small ML ranking models
- Recommendation types: cadence_change, event_suggestion, pricing_test, bundle_design, content_tempo, best_iap, crm_campaign, volume_test_template
- Every recommendation requires: evidence chain, lift range, confidence score
- Lift ranges from: (a) collaborative filtering on comparable titles, (b) Foresight scenario delta, (c) confidence interval from data quality

**Mode B: Conversational LLM Interface (Glen's addition — NOT in PRD v2.0)**
- Targeted LLM reasoning over the compiled PlaySage knowledge set
- User asks questions in natural language, receives data-grounded answers
- Deep validation checking before surfacing responses:
  - Does the answer reference real data from the platform?
  - Are cited numbers consistent with what's in the database?
  - Is the confidence level appropriate given data quality?
  - Does the recommendation pass a Foresight scenario check before being stated?
- Quality gates: no response surfaces without evidence attribution

### 9.2 Knowledge Architecture

The Sage chatbot operates over THREE knowledge tiers:

#### Tier 1: User-Specific Data (per organisation)
Everything the studio has input or that PlaySage has computed for their titles:
- KPI data for tracked titles (from DuckDB)
- Sentiment indices and topic summaries
- Active forecasts and scenario results
- Financial statements (P&L, cash flow, balance sheet)
- Sage recommendation history and outcomes
- HC module data (org health, headcount, salary benchmarks)
- Cascade event history
- Alert history and resolution patterns

This is private per-organisation. The chatbot must NEVER leak data between organisations.

#### Tier 2: Curated Domain Knowledge Base (shared, maintained by NBI)
Expert knowledge articles written and maintained by NBI, covering:

**Production & Operations:**
- Production methodologies for game development (Scrum for games, milestone-driven, etc.)
- Sprint structure best practices by studio size and genre
- QA workflows and bug triage methodologies
- Release management and certification processes (Sony TRC, Microsoft XR, Nintendo Lotcheck)
- Post-launch operations playbooks

**Forecasting & Analytics:**
- Revenue forecasting methodologies by business model
- Cohort analysis frameworks (retention, monetisation, engagement)
- A/B testing design for games (experiment sizing, metric selection)
- KPI benchmarking frameworks (what "good" looks like by genre/platform/maturity)
- Market sizing methodologies (TAM/SAM/SOM for games)

**Live Service Operations:**
- Event cadence frameworks (LTM design, seasonal calendars, daily/weekly hooks)
- Monetisation design patterns (battle pass structure, gacha mechanics, cosmetic economies, subscription tiers)
- Economy design principles (sink/faucet balance, inflation control, premium currency architecture)
- Community management escalation frameworks
- Content pipeline planning (art, design, QA, localisation lead times)

**Financial Planning:**
- Studio financial modelling best practices
- Fundraising guidance (seed, Series A, publisher deals, platform deals)
- Cost benchmarking by studio size, geography, and development stage
- Platform fee structures and optimisation strategies
- Revenue recognition standards (IFRS 15, ASC 606 for games)

**HR / People Operations:**
- Compensation benchmarking methodology
- Hiring planning frameworks (team composition ratios by project phase)
- Onboarding best practices for game studios
- Performance review frameworks adapted for creative teams
- Burnout prevention and crunch management

This knowledge base is built and maintained by NBI. It is the "consulting brain" that makes the chatbot more than a dashboard narrator. It gives advice backed by NBI's domain expertise. **This is a competitive moat** — Sensor Tower can match the data, they cannot match 20 years of gaming consulting expertise compiled into a queryable knowledge base.

#### Tier 3: Market Intelligence (shared, auto-updated)
Public market data compiled by the agent swarm:
- Industry news summaries (from daily news agent scrapes)
- Market benchmark data (genre medians, platform trends)
- Competitor feature matrices
- Release calendar intelligence
- Salary market data

### 9.3 Validation Pipeline

Every chatbot response passes through validation before reaching the user:

```
User query
  → Intent classification (data lookup vs advice vs scenario modelling vs general knowledge)
  → Knowledge retrieval (which tier(s) are relevant?)
  → LLM generates draft response with citations
  → VALIDATION GATES:
    Gate 1: Citation check — does every claimed number trace to a real data point in the system?
    Gate 2: Consistency check — do cited numbers match what's actually in the database?
    Gate 3: Confidence check — is the response based on high-confidence data or wide estimates?
    Gate 4: Scope check — is the response within PlaySage's domain, or is it hallucinating?
    Gate 5: Privacy check — does the response leak another organisation's data?
  → If all gates pass: deliver response with confidence indicator and source attribution
  → If any gate fails: flag the specific issue, deliver partial response with explicit caveats
```

### 9.4 Infrastructure Decisions (UNRESOLVED)

| Decision | Options | Trade-offs |
|---|---|---|
| LLM provider | Claude API vs OpenAI API vs self-hosted open-source | Claude: best reasoning, highest cost. OpenAI: good, cheaper. Self-hosted: control + privacy, highest engineering burden |
| Context strategy | RAG (retrieve chunks) vs compiled context (full knowledge load) vs hybrid | RAG: scales to large knowledge base, lossy retrieval. Compiled: perfect recall, limited by context window. Hybrid: best quality, most complex |
| Inference cost model | Per-query API billing vs reserved capacity | Per-query: scales with usage but unpredictable cost. Reserved: predictable but wasteful at low usage |
| Knowledge base format | Vector DB (embeddings) vs structured markdown (brain pattern) vs graph DB | Vector: good for semantic search, loses structure. Markdown: NBI proven pattern, fits context window. Graph: best for relational queries, highest complexity |

### 9.5 Sage Chatbot Data Requirements

| Data type | Source | Purpose |
|---|---|---|
| LLM API access | Claude/OpenAI/self-hosted | Inference engine |
| Curated knowledge articles | NBI-authored, version-controlled | Tier 2 domain expertise |
| User conversation history | PostgreSQL per-org | Context continuity |
| Validation data access | DuckDB read access | Gate 1-3 (verify cited numbers) |
| Organisation data boundary | RBAC + org_id scoping | Gate 5 (privacy) |

---

## 10. Collection Architecture

### 10.1 Tier 1: API Pipelines (Scheduled, Automated)

| Pipeline | Frequency | Technology |
|---|---|---|
| Steam Web API (CCU polling) | Hourly | Cron job → PostgreSQL |
| Steam Store API (metadata, pricing) | Daily | Batch job → PostgreSQL |
| SteamSpy (owner estimates, playtime) | Daily | Batch job → DuckDB |
| IGDB (metadata, releases) | Daily | Batch job → PostgreSQL |
| RAWG (metadata, playtime) | Weekly | Batch job → PostgreSQL |
| CheapShark / IsThereAnyDeal (pricing) | Daily | Batch job → PostgreSQL |
| BLS / ONS / StatsCan / ABS / Eurostat (salary) | Quarterly | Batch job → PostgreSQL |
| App Store review RSS feeds | Every 6 hours | Pull → PostgreSQL |

### 10.2 Tier 2: Agent Swarm (Crawl4AI-powered)

| Agent | Target | Frequency | Output |
|---|---|---|---|
| News agent | 10+ industry news sites | Daily | Compiled markdown intelligence |
| App Store rankings agent | iOS top charts (all categories, key countries) | Daily | Rankings → DuckDB |
| Google Play rankings agent | Android top charts | Daily | Rankings → DuckDB |
| Review extraction agent | Google Play, Metacritic, OpenCritic | Daily | Raw reviews → PostgreSQL |
| Job board scraper agents | 6-8 priority boards | Weekly | Salary records → PostgreSQL |
| Report extraction agent | Annual salary PDFs | Annual (when published) | Structured data → PostgreSQL |
| Competitor feature agent | Store pages for tracked titles | Weekly | Feature taxonomy → PostgreSQL |
| Patch notes agent | Steam update feeds, App Store "What's New" | Daily | Patch notes → PostgreSQL |

### 10.3 Tier 3: Studio Connectors (Event-Driven)

| Connector | Data | Integration method |
|---|---|---|
| Jira | Sprint metrics, velocity, bug counts | OAuth2 API, webhook |
| Azure Boards | Work items, iteration metrics | OAuth2 API |
| Shortcut | Stories, iterations | OAuth2 API |
| ATS (Greenhouse, Lever) | Hiring pipeline stages, time-to-fill | OAuth2 API or CSV |
| LMS | Training completion, skills assessment | CSV upload |
| CSV generic | Any structured data the studio provides | File upload + schema mapping |

### 10.4 Tier 4: Revenue Estimation Inputs

| Input | Source | Frequency |
|---|---|---|
| iOS daily top charts (all categories, 20+ countries) | Scrape via Crawl4AI | Daily |
| Google Play daily top charts | Scrape via Crawl4AI | Daily |
| Steam top sellers / most played | Steam Store API + SteamSpy | Daily |
| Public company quarterly earnings | SEC EDGAR / company IR pages (agent swarm) | Quarterly |
| Studio-disclosed download milestones | Press releases (news agent) | As published |

---

## 11. Data Bootstrap Strategy

The £0 licensing constraint applies to ONGOING costs. For initial bootstrapping, Glen has identified several one-time data sources:

### 11.1 Glen's Personal Data Repositories

Glen was head of data for Xbox. Personal data exists on the D: drive and OneDrive that may include:
- Xbox platform performance data (historical)
- Game performance benchmarks from Xbox ecosystem
- Industry analysis and reports accumulated over career
- Client engagement data from NBI consulting work (anonymised)

**Preliminary scan found the following (file existence confirmed, contents not yet verified):**

| Category | Location | Key files found | PlaySage use |
|---|---|---|---|
| **Salary datasets** | Downloads/Spreadsheets/ | video_game_salaries_2025-2026_Full_Labor_Index_Package, VALIDATED_with_sources, Games_Industry_Salary_Atlas_2025, uk_games_salary_quartiles, 221119 Games Jobs (historical listings) | Direct feed into Engine 5 (Salary) and SalarySage. Multiple validated versions exist. |
| **Revenue/KPI benchmarks** | Downloads/Spreadsheets/ | video_game_revenue.xlsx, Global_Video_Game_Industry_Revenue_2000-2024.csv, Video-Game-KPI-Benchmarks-2019-24 | Calibration data for Engine 2 (Revenue Estimation). Historical benchmarks for Foresight. |
| **Investor/deal data** | Downloads/Spreadsheets/ | NBI_Game_Investors_VALIDATED (~85-102KB), 1350 investor list - SIGNAL (~1.5MB) | Feed into market intelligence. Useful for PlaySage's investor/M&A audience tier. |
| **Financial models** | OneDrive/NBI/, Downloads/ | AERM Forecast templates, 5 Year Financial Forecast template, Sarge_Headcount_Plan, Revenue Streams | Template structures for the financial statement suite. Real-world headcount planning data. |
| **Client project data** | OneDrive/NBI/couch heroes/ | Staff skill proficiency CSVs, department skill stats, risk assessments, goal setting | HC module template data. Demonstrates the data structures studios would provide. |
| **Game industry presentations** | Downloads/Presentations/ | Multiple market overview decks with revenue, player, genre data | Market sizing reference data. Visualization templates. |

**Action required:** Deep review of each dataset for: (a) NDA/confidentiality constraints, (b) data freshness, (c) format compatibility with PlaySage schema, (d) what can be used directly vs what needs transformation. Priority: salary datasets (multiple validated versions suggest Jeff's pipeline may overlap with or extend these) and KPI benchmarks (direct calibration value).

### 11.2 One-Time Sensor Tower Access

Strategy: purchase 1 month of Sensor Tower access, extract and genericise the data patterns (not the raw data — the PATTERNS: what does a top-10 mobile game's ranking trajectory look like? What's the typical revenue-to-rank relationship by category? What are the genre-level benchmarks for retention, conversion, ARPDAU?).

This gives PlaySage:
- Calibration data for the revenue estimation engine (rank-to-revenue curves)
- Genre benchmark baselines (what "good" D1/D7/D30 retention looks like)
- Market sizing data points (category TAMs)
- Feature taxonomy validation (does our monetisation signature detection match what Sensor Tower categorises?)

**Legal consideration:** Extracting patterns and benchmarks for internal model training is likely permissible. Republishing Sensor Tower's specific data points is not. The genericisation step is critical — transform raw data into model parameters, not stored facts.

**Cost:** Estimated $2,000-$5,000 for one month depending on tier. One-time investment, not ongoing.

### 11.3 Open-Source Cornerstone Data

Publicly available game performance data from verifiable sources:
- **InvestGame.net** free report archive: Newzoo, Drake Star, GameAnalytics benchmarks
- **GameAnalytics** published benchmark reports (retention curves, session data by genre — free PDFs)
- **Unity Gaming Report** (annual, free — engagement benchmarks from Unity Analytics)
- **ironSource/Unity LevelPlay** benchmark reports (ad monetisation benchmarks)
- **AppsFlyer** State of Mobile Gaming reports (UA cost benchmarks, regional CPI data)
- **Adjust** Mobile App Trends reports (retention benchmarks, fraud benchmarks)
- **Steam** directly: review data, CCU data, pricing data, achievement data (all free APIs)
- **Academic sources:** price elasticity studies for digital goods, player behaviour research

**Action required:** Compile a master list of every free industry report that contains usable benchmark data. Download, extract, structure. This becomes the initial calibration dataset before studio partnerships provide ground truth.

### 11.4 Crowdsourced / Community Data

- **GDC Vault** talk transcripts (free access to 19 years of Game Developer magazine, conference presentations with disclosed metrics)
- **Gamasutra/GameDeveloper.com** postmortem articles (devs disclosing real metrics)
- **r/gamedev** salary and revenue threads
- **Steam developer revenue disclosure** threads (verified devs sharing real numbers)
- **Mobile Dev Memo** and **Deconstructor of Fun** articles (industry analysis with disclosed data points)

These individual disclosed data points become calibration anchors for the revenue estimation engine.

---

## 12. Build Sequence

### Phase 0: Infrastructure (before any module)
- Set up Crawl4AI MCP server (Docker)
- Configure Exa free tier (1,000 semantic searches/month) + Tavily free tier (1,000/month)
- Register and test: Steam API key, IGDB/Twitch OAuth2, RAWG API key, CheapShark, IsThereAnyDeal
- Set up PostgreSQL + DuckDB dual-database architecture
- Begin daily chart ranking collection (iOS, GP, Steam) — historical data starts accumulating from day one

### Phase 1: Demo MVP (seeded dataset)
- Modules: Market Overview, Competitive Landscape, Sentiment, Foresight (90d basic), Market Watch, Alerts, The Sage, Executive Dashboard
- 50 seeded titles, 3+ genres, pre-computed data
- Revenue estimation: pre-calibrated curves for demo genres
- Financial modelling: P&L and EBITDA for Box + DLC scenarios

### Phase 2: Beta (live data)
- All 10 core modules with live data feeds
- Revenue estimation running on daily chart data with initial calibration
- Sentiment pipeline on live reviews
- Finance: add cash flow modelling
- The Sage: conversational LLM mode (Mode B)

### Phase 3: GA
- Human Capital modules (7.11-7.20) with studio connectors
- Studio partnership data flywheel activated
- Revenue estimation calibrated against partnership actuals
- Financial cascades (forecast → P&L → headcount viability)
- Balance sheet modelling
- Full Cascade Engine with all propagation rules

---

## 12. CRITIQUE — Gaps, Thin Claims, and Unresolved Problems

### CRITICAL (blocks investor credibility)

**C1: Revenue estimation methodology is the thinnest part of the entire product spec.**
The PRD says "rank-to-DAU mapping curves per platform" and "platform-specific calibration curves" but provides zero detail on: what regression model, what features beyond rank, how confidence bands are computed, what the error margins look like with zero studio partnership data, how many calibration data points are needed before estimates are credible. This is the CORE IP and it's specified in less detail than the alert system. App Annie spent years and millions building their estimation models. The spec needs: a formal methodology section with model architecture, feature set, calibration data requirements, accuracy targets per data quality tier, and a plan for what to do when accuracy is poor. Without this, the "Evidence over opinion" product principle is hollow.

**C2: Cash flow and balance sheet — NOW SPECCED in Section 5.3 of this document.**
Cash flow (operating/investment/financing) and balance sheet (assets/liabilities/equity) are now specified with line-item detail, data input requirements, guided wizard approach, and cascade integration. **Status: ADDRESSED in this spec. Must be incorporated into PRD v2.1.** Remaining gap: the guided wizard UX flow needs wireframing — how does a seed-stage studio with no CFO actually fill in balance sheet data without feeling overwhelmed?

**C3: The chatbot / conversational Sage — NOW SPECCED in Section 9 of this document.**
Three-tier knowledge architecture (user data, curated domain knowledge, market intelligence), five-gate validation pipeline, and infrastructure decision matrix now specified. **Status: PARTIALLY ADDRESSED.** The knowledge architecture and validation pipeline are defined. **Still unresolved:** LLM provider choice, context strategy (RAG vs compiled vs hybrid), inference cost model, and knowledge base format. These are blocking infrastructure decisions that affect cost, quality, and build complexity. Also unresolved: who writes and maintains the Tier 2 curated knowledge articles? This is a significant ongoing content investment — production methodologies, forecasting frameworks, live service playbooks, financial planning guides. NBI's consulting expertise IS the content, but it needs to be extracted, structured, and kept current.

**C4: Historical backfill — PARTIALLY ADDRESSED via bootstrap strategy (Section 11).**
Glen's proposed approach: one-time Sensor Tower access (~$2-5K) to extract genericised patterns + his personal Xbox data + online benchmark reports + start collecting daily rankings NOW. This softens the constraint from "£0 forever" to "£0 ongoing, small one-time bootstrap budget acceptable." **Still critical:** the one-time Sensor Tower data provides PATTERNS (what rank-to-revenue curves look like), not per-title historical time series. Foresight still needs title-level historical KPIs for backtesting. For Steam: SteamCharts/SteamSpy cover this. For mobile: either (a) accept that mobile forecast accuracy will be lower than Steam at launch, (b) find a data broker selling historical iOS/GP ranking datasets as a one-time purchase, or (c) begin collecting now and launch with however many months of history have accumulated. **Every day of delay in starting daily ranking collection costs a day of mobile forecast accuracy at launch.**

**C5: Console data is structurally absent.**
PlayStation and Xbox are listed as "supported platforms" but have: no ranking data, no download data, no revenue data, no CCU data, no review API. The PRD acknowledges console sentiment comes from Metacritic/OpenCritic only. But modules like Market Overview and Competitive Landscape display "KPIs" for PS/Xbox that literally cannot exist. Either: (a) remove console from v1 scope, (b) explicitly label all console KPIs as "Not Available — estimated from cross-platform proxy" with clear methodology, or (c) acknowledge this as a post-launch expansion dependent on studio partnerships providing console data.

### HIGH (weakens the product if unresolved)

**H1: Human Capital modules 7.11-7.20 are stub specs.**
The 10 core modules have detailed design specs, technical specs, acceptance criteria, and non-goals. The 10 HC modules have only KPIs and filters listed — no design specs, no technical specs, no acceptance criteria, no data input details, no UX flows. This is half the module count with 2% of the specification depth. Either spec them properly or explicitly defer them to a separate PRD addendum.

**H2: The Cascade Engine's financial integration assumes data that won't exist at launch.**
The cascade scenario "When a forecast projects a 60% DAU spike, can your servers handle it?" requires: server cost data, per-user infrastructure cost, support team capacity. These come from Engine 6 (HC) which requires studio connector data. Studios won't have connectors configured at launch. The financial cascade is the product's most compelling demo moment, but it can't work without studio-provided operational data. The spec needs to define: what cascades work with public data only, and which require studio data.

**H3: The "integrated triggering system" Glen described has no formal specification.**
"Check that the P&L supports the headcount based on the forecast simulation" — this is described conceptually in Cascade Engine Section 8 but has no formal propagation rules, no threshold definitions, no event schemas for financial cascade events. The PROP-005 and PROP-006 rules referenced in the Cascade doc are mentioned but not fully specified.

**H4: Aggregation thresholds for HC data are undefined.**
"All people data is subject to aggregation thresholds to avoid individual exposure." What is the threshold? 5 people? 10? This affects: what studios can actually see (a 15-person studio may have departments of 2-3 people — do they get no data?), GDPR compliance claims, and the practical value of HC modules for smaller studios.

**H5: SalarySage data quality and methodology need formal specification.**
Jeff's 5MB CSV covers "video game salaries by country, by grade, by position." But: what's the methodology for determining salary ranges? How are conflicting sources reconciled (a Skillsearch report says Lead Designer UK is £55K, a GamesJobsDirect listing says £70K, BLS OEWS says $105K equivalent — which is "right")? What confidence levels attach to each data point? How fresh is the data? The PRD's compensation module (7.16) lists KPIs (P25/P50/P75 by role and location) but doesn't specify how these percentiles are computed from heterogeneous sources.

**H6: Monetisation signature detection methodology is underspecified.**
"Detected monetisation types per title" with types: BattlePass, Gacha, LootBox, RotatingShop, etc. Detection sources: "rules, patch_notes, store_page, manual." But what rules? What keywords? What's the false positive rate? How does rule-based detection distinguish a BattlePass from a Subscription from a SeasonPass? This is a competitive feature that needs proper specification.

**H7: The PRD claims retention and conversion proxies from public data.**
Market Overview displays "estimated retention proxy (D1, D7; derived from review cadence and rating trend patterns)." The red-team review of v1.2 flagged this as technically impossible. The v2.0 PRD adds "(flagged as low-confidence)" but still includes it. Deriving retention from review cadence is a weak proxy at best. The methodology for this derivation must be specified and honestly assessed — or removed.

### MEDIUM (should be resolved before GA)

**M1: Data provenance UI treatment is still TBD.**
Referenced 6+ times in the PRD as "to be finalised in UX design pass." This is a product principle ("Transparent methodology") that has no concrete UX spec.

**M2: The Sage lift range methodology references "collaborative filtering on comparable titles" but doesn't specify what makes titles "comparable" or how the filtering works.**

**M3: Scenario interaction model says effects use "interaction coefficients" trained on "historical multi-lever outcomes where available" — but at launch there are no historical outcomes to train on.** Defaults are "conservative dampening" but the spec doesn't define what "conservative" means numerically.

**M4: Social media sentiment is out of scope for v1 but is a major gap.** Twitter/Reddit/Discord/YouTube are where sentiment crises start — by the time they hit app store reviews, the damage is done. The "post-demo expansion" framing understates the competitive importance.

**M5: RAWG free tier is 20,000 requests/month.** At full catalog scale (5,000 titles), this is 4 requests per title per month. That's insufficient for daily metadata updates. Need to plan for RAWG Business tier or shift primary metadata responsibility entirely to IGDB.

**M6: App Store review RSS feeds have undocumented rate limits and may not provide full review history.** Apple has been known to throttle or modify RSS feed availability. This is a single-point-of-failure for iOS sentiment data. Backup strategy needed.

**M7: GameRefinery ToS explicitly prohibits using their data to provide analysis services to third parties.** Even if we wanted to use them as a supplementary source later, the ToS blocks consulting use. This also means any studio that currently uses GameRefinery data cannot share it with PlaySage without violating GameRefinery's terms. This is a competitive moat FOR Sensor Tower/GameRefinery AGAINST PlaySage's partnership flywheel.

**M8: Price elasticity defaults (Box ε=-1.4, DLC ε=-1.8) are cited as "based on academic literature" but no specific papers are referenced.** These are foundational to the finance module's revenue simulations. They need citations, validation ranges, and per-genre calibration data.

---

## 13. Decision Log

| # | Decision | Date | Rationale |
|---|---|---|---|
| D1 | £0 data licensing — build from public sources | 2026-05-19 | PlaySage replaces competitors, doesn't consume them |
| D2 | Hybrid architecture (structured pipelines + agent swarms) | 2026-05-19 | Quantitative layer for dashboards, intelligence layer for Sage |
| D3 | Build proprietary revenue estimation model | 2026-05-19 | Core IP; calibrate from public company earnings + partnerships |
| D4 | PostgreSQL + DuckDB dual-database | PRD v2.0 | Transactional + analytical separation |
| D5 | Crawl4AI as primary scraping infrastructure | 2026-05-19 | Free, self-hosted, MCP server available, Firecrawl replacement |
| D6 | Jeff's salary dataset pending review before carry-forward decision | 2026-05-19 | Quality assessment needed |
| D7 | Studio partnerships still theoretical — v1 must work without them | 2026-05-19 | Cannot depend on unconfirmed data sources |

---

## 14. Open Actions (from this spec)

| # | Action | Owner | Priority | Blocked by |
|---|---|---|---|---|
| A1 | Spec the revenue estimation model formally: model architecture, feature set, calibration data requirements, accuracy targets | Data Science (Jeff Day?) | CRITICAL | Nothing — can start now |
| A2 | Decide: cash flow and balance sheet in v1 or deferred? If v1, spec the data inputs | Glen | CRITICAL | Nothing |
| A3 | Spec the conversational Sage: LLM choice, inference infra, validation pipeline, cost model | Engineering + Glen | CRITICAL | Architecture decisions |
| A4 | Resolve historical backfill for mobile: buy one-time dataset, start collecting now, or proxy from review history? | Glen | CRITICAL | £0 constraint clarity |
| A5 | Decide console data treatment: remove from v1, label as proxy, or acknowledge as post-launch | Glen | CRITICAL | Nothing |
| A6 | Spec Human Capital modules 7.11-7.20 to the same depth as core modules, or explicitly defer to separate PRD addendum | Glen + Product | HIGH | Nothing |
| A7 | Review Jeff's 5MB salary CSV and decide carry-forward vs seed | Glen + Tom Rieger | HIGH | Access to QA assessment PDF |
| A8 | Define HC aggregation thresholds (min group size for people data) | Glen + Legal | HIGH | GDPR analysis |
| A9 | Specify salary data reconciliation methodology (how to compute P25/P50/P75 from heterogeneous sources) | Jeff Day | HIGH | A7 |
| A10 | Define monetisation signature detection rules (keywords, patterns, false positive tolerance) | Product + Engineering | HIGH | Nothing |
| A11 | Cite price elasticity academic sources (Box ε=-1.4, DLC ε=-1.8) or replace with defensible defaults | Data Science | MEDIUM | Nothing |
| A12 | Migrate data dictionary v1, cascade engine doc, and decisions v3 from Downloads to project directory | Glen | LOW | Nothing |
| A13 | Begin daily chart ranking collection (iOS, GP, Steam) immediately — every day of delay is a day of lost historical data | Engineering | HIGH | Crawl4AI setup |
| A14 | Set up Crawl4AI MCP server | Engineering | HIGH | Nothing |
| A15 | Deep review of existing salary datasets in Downloads/Spreadsheets/ — compare with Jeff's 5MB CSV, identify overlaps and gaps | Glen + Jeff | HIGH | Nothing |
| A16 | Review KPI benchmark files (Video-Game-KPI-Benchmarks-2019-24, revenue data) for revenue estimation calibration value | Data Science | HIGH | Nothing |
| A17 | Audit existing financial model templates (AERM Forecast, 5 Year Forecast, Sarge Headcount) for reuse as PlaySage financial wizard templates | Glen | MEDIUM | Nothing |
| A18 | Scope one-time Sensor Tower access: what specific data to extract, how to genericise for model training, estimated cost | Glen | CRITICAL | Budget approval |
| A19 | Decide LLM provider for Sage chatbot (Claude API / OpenAI / self-hosted) | Glen + Engineering | CRITICAL | Cost modelling |
| A20 | Begin Tier 2 knowledge base authoring — production methodologies, forecasting frameworks, live service playbooks | NBI team (Glen, Tom) | HIGH | Nothing — can start now as markdown articles |
| A21 | NDA/confidentiality review of Glen's personal game data for PlaySage use | Glen + Legal | HIGH | Nothing |
| A22 | Build the 7 business-model-specific revenue simulators (Section 5.4) — each is a standalone model requiring its own spec | Data Science + Product | CRITICAL | Revenue estimation engine architecture |
| A23 | Design the guided financial wizard UX — how seed-stage studios fill in balance sheet/cash flow data without a CFO | UX + Product | HIGH | Financial statement spec (now done) |

---

## Appendix A: Data Dictionary Reference

Full data dictionary with 40+ table schemas exists at: `C:\Users\gpbea\Downloads\Code\playsage_data_dictionary_v1.md`

This should be migrated to the PlaySage project directory and version-controlled.

## Appendix B: Source Documents

| Document | Location | Version |
|---|---|---|
| PRD v2.0 | `projects/playsage/Playsage_PRD_v2.0.docx` | March 2026 |
| Cascade Engine Architecture | `C:\Users\gpbea\Downloads\playsage_cascade_engine.docx` | v1.0, Feb 2025 |
| Data Dictionary v1 | `C:\Users\gpbea\Downloads\Code\playsage_data_dictionary_v1.md` | Aug 2025 |
| Decision Document v3 | `C:\Users\gpbea\Downloads\playsage_decisions_v3.docx` | Feb 2026 |
| Mock Templates v1 | `C:\Users\gpbea\Downloads\Spreadsheets\playsage_mock_templates_v1.xlsx` | — |
| Brain: PlaySage | `brain/playsage.md` | Verified 2026-05-16 |
| Brain: SalarySage | `brain/salarysage.md` | Verified 2026-05-16 |
