# Forecast Models -- Knowledge Bank

**Last compiled:** 2026-06-11 (full rebuild)
**Extract count:** 23
**Role associations:** data_analyst, game_economy_consultant, vp_product

---

## Executive Summary

NBI holds a complete, interlocking forecasting stack for F2P and premium games, assembled from public methodology literature, NBI client engagements, and Sarge Universe planning work.

**Layer 1 -- Player forecasting:** Power curve retention modelling (Valeev) generates projections from D1/D7/D30 soft-launch data. GameAnalytics 2025 benchmarks (11,600 games, 1.48B+ MAU) supply genre-specific defaults when client data is unavailable. Retention is declining year-on-year; 2023-era benchmarks will overestimate LTV. [source: web_2026-05-26_retention_curve_ltv_model, web_2026-05-26_gameanalytics_2025_retention_benchmarks]

**Layer 2 -- Revenue forecasting:** The Tenjin unit economics framework works backward from a revenue target to required player volumes, CPI budget, and ROAS. Whale distribution (top 20% = 75% of revenue) anchors conversion assumptions. NBI's own F2P sports client engagement has produced live benchmark data: 36% D1 retention, 88% CPI reduction during beta, and a 5-month ARPPU escalation roadmap from $2.21 to $34.62. [source: web_2026-05-26_f2p_unit_economics_framework, web_2026-05-26_f2p_whale_economics_voltage, goals_town_hall_beta_metrics_2026-03-26, goals_release_liveops_2026-04]

**Layer 3 -- Cash flow and live service:** Seufert's marketing P&L framework models cash timing and maximum cash at risk -- studios can mistake LTV > CPI for solvency and still run out of money. Live ops event uplift (+20-40% ARPDAU) and battle pass contribution (10-40%, up to 60% in shooters) complete the live service picture. [source: web_2026-05-26_marketing_pnl_roas_framework, web_2026-06-02_liveops_event_cadence_economics, web_2026-06-02_battle_pass_revenue_modelling]

**Production budgets:** Ismail's LTPF formula plus the Boxleiter viability check are the primary tools for indie-to-mid-tier clients. Genre benchmarks and a 7.8% annual cost CAGR (compounding since 2022) provide calibration. The "missing middle" (GBP500K-GBP5M) is where NBI's budget advisory adds most value. [source: web_2026-06-02_ismail_budget_viability_framework, web_2026-06-02_indie_budget_breakdown_benchmarks, web_2026-06-02_production_cost_scaling_trends]

**NBI-built tooling:** A 6-sheet Excel daily forecast model, a 12-tab investor-grade valuation workbook, an AERM-enhanced simulator spec, a Firebase web-app blueprint, and UK salary benchmarks for a 26-role studio headcount plan are all documented and replicable. [source: chatgpt_68efb4be, chatgpt_690c8b4f, chatgpt_6899e32a, chatgpt_68d3feee, chatgpt_691f13cd]

---

## Methodology Comparison

| Model | Predicts | Inputs Required | Scale | Authority | Source |
|---|---|---|---|---|---|
| Valeev Power Curve | Retention at any future day | D1, D3, D7 retention | Any | Industry standard | web_2026-05-26_retention_curve_ltv_model |
| Tenjin Unit Economics | Revenue, profit, ROAS | Retention, ARPDAU, CPI, budget | F2P any stage | Widely adopted | web_2026-05-26_f2p_unit_economics_framework |
| Seufert Marketing P&L | Cash timing, cash at risk | LTV curve, CPI, acquisition rate | UA-stage F2P | Authoritative | web_2026-05-26_marketing_pnl_roas_framework |
| Ismail LTPF | Dev budget + commercial viability | Team roles, salaries, duration | Indie 1-30 people | Respected indie | web_2026-06-02_ismail_budget_viability_framework |
| Kevuru Formula | Quick cost sanity check | Hourly rate, team size, months | Any | Cross-validation | web_2026-06-02_production_cost_scaling_trends |
| AERM Enhanced Simulator | Multi-scenario F2P with events | Scenario modifiers, event timeline | F2P any stage | NBI first-hand | chatgpt_6899e32a |
| Sarge 6-Sheet Excel | Full daily/monthly/yearly F2P launch | Retention anchors, UA tiers, ARPDAU | F2P launch | NBI first-hand | chatgpt_68efb4be |
| Dual-Path 60-Month | Hybrid monetisation revenue recognition | Cohort sources, segment spend, deferral | Premium + F2P hybrid | NBI first-hand | chatgpt_68ede5cf |
| 12-Tab Valuation Workbook | Studio valuation for investors | 36-month forecast, DCF, comps | Any studio | NBI first-hand | chatgpt_6908ac7d |

---

## Revenue Projection Models

### F2P Conversion Funnels

The standard F2P revenue funnel: Installs -> Active Users (via retention) -> Payers (via CVR) -> Revenue (via ARPPU). Build it backward from a revenue target, not forward from assumed installs.

**Backward-from-revenue construction:** Target revenue (e.g., GBP1.2M) / ARPPU = required payers. Required payers / CVR = required acquires. Required acquires x CPI = UA budget. This forces validation of whether assumptions produce a viable business before a line of code is written. [source: web_2026-05-26_f2p_unit_economics_framework]

**Conversion to paying (CVR):** 2-8% industry range, genre-dependent. Tenjin worked example: 5%. Sarge Universe plan: 5.5%. [source: web_2026-05-26_f2p_unit_economics_framework, chatgpt_690c8b4f]

**Sarge Universe baseline assumptions:** 200K starting MAU, 300K month-1 installs, 5% monthly install growth, 25% monthly churn, 24% DAU/MAU ratio, 5.5% payer conversion, GBP8 ARPPU, GBP4.99 battle pass at 20% attach, GBP19.99 Commander Pass from month 3 at 2% attach. [source: chatgpt_690c8b4f]

**Pricing calibration principle:** Start high, because raising prices on existing tiers is operationally and reputationally difficult. The backward funnel often reveals that a low-price strategy requires unrealistically large player volumes. [source: web_2026-05-26_f2p_unit_economics_framework]

**Tenjin worked example (45-day model):** D1 45%, D7 20%, D30 7%; ARPDAU $2.00; CVR 5%. LTV (45 days) $12.60. Marketing budget $500,000. Predicted revenue $1,200,000. Predicted profit $759,000. ROAS 251%. [source: web_2026-05-26_f2p_unit_economics_framework]

**Telegram-specific economics:** CPI 7-12 cents (extremely low vs App Store), no 30% platform overhead. Revenue flow split: 45% Telegram / 35% Web / 20% Other for platform fee netting. Frictionless start justifies modelling a higher viral k-factor. [source: chatgpt_68efb4be]

### Hard Currency Pack Pricing Benchmarks

315 normalised price points across 12 competitors with 147 citations (NBI research, April 2026, for a competitive F2P sports studio). [source: goals_competitive_mtx_findings_2026-04-21]

- Entry-level tier at $0.99/100 HC is the genre floor; launching without a micro-entry tier is a documented gap
- Volume discount curves cluster at 15-23% industry-wide (NBA 2K outlier at 86%; Fortnite at 56%)
- USD prices on existing tiers are functionally permanent -- EA has not raised USD prices on existing tiers across 8 years of FIFA/FC history; competitors add higher ceiling tiers rather than raising existing ones
- UFL (closest F2P football competitor) mirrors EA FC on first 3 tiers, caps at $79.99 vs EA FC's $149.99

**SKU revenue concentration:** In a F2P sports title beta, top 3 packs represented 66.7% of revenue despite only 14.2% of volume. Packs were 96.9% of all revenue; cosmetic kits only 3.1%. Build fewer, better-positioned SKUs. [source: goals_town_hall_beta_metrics_2026-03-26]

### Premium Revenue Forecasting

**Break-even formula (Steam PC):**
Copies needed = Total development cost / (Game price x 0.70 x 0.88)

The 0.70 is Steam's 30% cut; 0.88 accounts for regional pricing discounts and refunds (~12% effective reduction). Example: GBP50K budget at GBP14.99 requires approximately 5,417 copies; GBP150K at GBP19.99 requires approximately 12,186 copies. [source: web_2026-06-02_indie_budget_breakdown_benchmarks]

**Boxleiter commercial viability check:** Multiply a comparable game's Steam review count by 57 to estimate unit sales. Viability requires the pitched game to credibly generate 3-4x its budget in revenue, benchmarked against low/mid/high comparables. Three-tier assessment: low (70% of break-even units), middle (125%), high (300%). If the game cannot credibly outperform the low comparable, it should not proceed at that budget. [source: web_2026-06-02_ismail_budget_viability_framework]

**Median outcome warning:** Median indie game lifetime gross revenue is GBP5,000-GBP15,000. Fewer than 180 reviews places a game in the bottom 80% of all releases. These numbers belong in every first-time studio viability conversation. [source: web_2026-06-02_indie_budget_breakdown_benchmarks]

### Hybrid Monetisation

NBI can deliver complex dual-path forecast models comparing premium sequel vs hybrid (F2P + subscription + premium) strategies. Structural requirements: cohorted by acquisition source (paid/organic/social/referral), monthly retention and returner curves, cross-path migration modelling, player segment archetypes (Bingers, Grazers, Long-Haulers), and full revenue recognition mechanics. The key strategic question: at what conversion thresholds does the hybrid path beat the premium sequel on recognised revenue? Requires distinguishing ASC 606 treatment: subscription revenue ratable monthly/annual, packs on delivery, MTX point-in-time. [source: chatgpt_68ede5cf]

### Live Service Event Revenue

**ARPDAU lift during events:** +20-40% above baseline, corroborated across multiple independent sources. [source: web_2026-06-02_liveops_event_cadence_economics, web_2026-05-26_f2p_whale_economics_voltage]

**Blended effective ARPDAU:** If events cover approximately 60% of calendar days (consistent with top mobile games running 73-89 events per month per AppMagic 2025), multiply baseline ARPDAU by approximately 1.12-1.24 for the blended rate. Sarge Universe used 15-20% uplift on fortnightly weekend events and 30% on holidays. [source: web_2026-06-02_liveops_event_cadence_economics, chatgpt_68efb4be]

**Radoff operational data:** 2-3x ARPDAU multiplier during live events specifically, with a voltage pattern of early spike, gradual taper, zero at churn. Multiple monetisation spikes from live events sustain the revenue curve beyond static model predictions. [source: web_2026-05-26_f2p_whale_economics_voltage]

**Optimal event cadence by genre:**

| Genre | Events/Month | Notes |
|---|---|---|
| Casual/Puzzle | 15-25 | Overlapping layers |
| Mid-core (RPG, Strategy) | 8-15 | Distinct events with longer arcs |
| Competitive/Shooter | 4-8 | Major events + continuous ranked seasons |
| Hyper-casual with LiveOps | 4-6 | Lightweight recurring formats |

The 72-hour weekend event (Friday to Sunday) is the gold standard: maximum engagement aligns with leisure patterns while maintaining urgency. [source: web_2026-06-02_liveops_event_cadence_economics]

**Battle pass contribution:**
- Low integration (pass bolted on): 1-15% of total revenue
- High integration (pass woven into core loop): 20-40%, up to 60% in shooters
- Classification depends on whether the pass is the primary content delivery mechanism

Battle pass modelling steps: (1) Penetration: 3-8% of DAU. (2) Price: GBP5-10 mobile, GBP10-15 PC/console. (3) Pass revenue per season: DAU x CVR% x Price x Seasons/Year (typically 4-6). (4) Validate: pass revenue should be 10-40% of total IAP. (5) Renewal decay: 55-70% in season 1, declining to 40-55% in year 2; below 55% signals design refresh needed. [source: web_2026-06-02_battle_pass_revenue_modelling]

**Cannibalism warning:** Clash Royale showed a strong temporal correlation between battle pass introduction and a drop in total monthly revenue. Adding a pass without expanding economy spending depth cannibalises existing IAP. Flag this risk in every battle pass recommendation. [source: web_2026-06-02_battle_pass_revenue_modelling]

**F2P sports live ops progression (competitive F2P sports studio, 2026 launch):** Monthly ARPPU escalation target: approximately $2.21 at launch, rising to $13.19 (month 2), $26.94 (month 3), $31.73 (month 4 -- explicit currency "Sink" month using 30-40% off end-of-summer sale to drain hoarded soft currency), $34.62 (month 5 -- whale targeting and ultra-premium content). Starter pack at $1.99 as first-purchase conversion mechanism. Real-world sports calendar (World Cup, Champions League finals, Transfer Deadline Day) drives the entire event rhythm. [source: goals_release_liveops_2026-04]

### Regional Pricing

Build from platform FX rates, then apply purchasing power parity adjustments by region. Validated rules across 40+ countries and 4 platforms (Sony, Xbox, Steam, Epic): Gulf states (UAE, Kuwait, Saudi, Qatar) typically overprice relative to purchasing power (~5% downward adjustment). Japan and South Korea sustain higher prices relative to FX. Brazil, Malaysia, Thailand need further reduction (~15%). Ukraine, India, Indonesia: intentionally below FX as an accessibility decision, not an error. Cross-platform pricing must be aligned to avoid arbitrage. [source: goals_pricing_matrix]

---

## Player Forecasting

### Cohort-Based Retention (D1/D7/D30)

**GameAnalytics 2025 benchmarks -- use as defaults when client data is unavailable** (11,600 games, 1.48B+ MAU, 9 regions, 16 genres):

| Metric | Bottom 25% | Median | Top 25% | iOS Top 25% |
|---|---|---|---|---|
| D1 retention | 10-11.5% | ~18% | 26-28% | 31-33% |
| D7 retention | ~1.5% | 3.4-3.9% | 7-8% | -- |
| D28 retention | -- | -- | <3% | -- |

Session metrics: median daily playtime 22 minutes, median session length 5-6 minutes, average 4 sessions/day (midcore: 6-7). [source: web_2026-05-26_gameanalytics_2025_retention_benchmarks]

**Year-on-year decline:** D1 top quartile dropped 1-2 percentage points from 2023 to 2025. LTV models built on 2023 benchmarks will overestimate; apply a conservative haircut for 2026+ projections. [source: web_2026-05-26_gameanalytics_2025_retention_benchmarks]

**Platform split matters:** iOS top quartile D1 runs 31-33% vs Android 25-27%. Platform mix in a forecast directly affects LTV projections. iOS users retain better and typically monetise higher. [source: web_2026-05-26_gameanalytics_2025_retention_benchmarks]

**Genre is the biggest determinant:** A puzzle game at 25% D1 is at median; a strategy game at 25% D1 is in the top quartile. Always use genre-appropriate benchmarks. [source: web_2026-05-26_gameanalytics_2025_retention_benchmarks]

**Regional variance:** Middle East shows best retention (D1 22.6%, D7 4.9%, D28 1.5%). Africa and Asia worst. North America lowest session frequency (3.67/day). MENA mobile may be undervalued in Western-centric forecasts. [source: web_2026-05-26_gameanalytics_2025_retention_benchmarks]

**Live benchmark (competitive F2P sports title, beta March 2026):** 220K total installs, 36% D1 overall (34% PS5, 37% Steam), 57 min average daily playtime, 4.6 matches/day. The 36% D1 is strong for F2P sports (industry average approximately 25-30%). CPI reduced from $3.61 to $0.43 during beta (88% reduction). [source: goals_town_hall_beta_metrics_2026-03-26]

**Sarge Universe retention targets** (Telegram F2P, internal, not industry benchmarks): D1 45%, D7 22%, D30 13%. K-factor 0.15 with 14-day half-life decay. [source: chatgpt_68efb4be]

### LTV Curve Modelling

**Valeev power curve method (recommended primary tool):**

Retention = Intercept x (Day ^ Slope)

Steps: (1) Take D1, D3, D7 retention data. (2) Apply ln() to both day number and retention values. (3) Run LINEST on transformed values to extract slope and intercept. (4) Reverse intercept via EXP(). (5) Generate the fitted curve for any future day.

**Lifetime (engagement days per user):** Sum of (Retention[N] + Retention[N+1]) / 2 for each consecutive day pair -- the trapezoidal area under the retention curve. More rigorous than multiplying average retention by days because it captures the decay shape.

**LTV calculation:** Simple: Lifetime x ARPDAU. Better: sum daily revenue contributions from active returning users across the curve. Worked example: strategy game data, Lifetime 1.43 days, ARPDAU $0.065, LTV7 $0.093. [source: web_2026-05-26_retention_curve_ltv_model]

**Extrapolation limit:** Unreliable beyond 3-4x the observed window. D7 data should not be extrapolated past D30 without validation. [source: web_2026-05-26_retention_curve_ltv_model]

**Engagement-first principle:** High engagement is the main precondition for significant player investment, not a result of it. Model retention first, derive revenue from it -- never the reverse. [source: web_2026-05-26_f2p_whale_economics_voltage]

**Whale distribution as modelling input:** Top 20% of players generate 75% of revenue; top 1% generate 24%. Revenue forecasting is fundamentally a forecast of whale acquisition and retention, not average-player monetisation. [source: web_2026-05-26_f2p_whale_economics_voltage]

### ARPU Benchmarks by Genre

**Mobile strategy/RTS (2024):**

| Title | Annual Revenue | MAU | Annual ARPU | Monthly ARPU |
|---|---|---|---|---|
| Clash of Clans | $359.9M | ~97-98M | ~$3.70 | ~$0.31 |
| Boom Beach | $16.2M | ~12M | ~$1.35 | ~$0.11 |
| Last War: Survival | $1.15B | 12-15M | $77-96 | $6.40-8.00 |

The 25x ARPU spread within the same genre: Clash's massive casual base drags the average down; Last War runs aggressive time-limited packs with a smaller but heavier-spending user base. All figures exclude ad revenue and web-shop spend. [source: chatgpt_6894b46a]

**General ARPDAU range:** Under $0.10 to over $1.00 depending on genre and monetisation depth. [source: web_2026-05-26_f2p_whale_economics_voltage]

### Growth Projection from Soft Launch

**Cash timing model (Seufert):** LTV > CPI is necessary but not sufficient. Cash timing can bankrupt a profitable studio.

Per-user Projected Receivable = Total LTV - Revenue received to date.
Cash at Risk = Peak Cumulative Spend - Peak Cumulative Revenue received.

Worked example (CPI $1, 1,000 users/day, 90-day LTV of $1): $20,000 total spend, but only $10,530 actual capital required. Limited campaign (20 days): break-even day 100, 180-day margin 14.3%. Continuous campaign (360 days): break-even day 257, margin 8.6%. Continuous campaigns require far more working capital than per-cohort economics imply. [source: web_2026-05-26_marketing_pnl_roas_framework]

**Sarge UA tier structure:** GBP15K day 1, GBP8K days 2-7, GBP4K days 8-30, GBP2.5K day 31+. CPI targets: Telegram GBP0.60, Influencer GBP1.20, Web Ads GBP1.80. CPI guardrail USD2.50 or less. [source: chatgpt_68efb4be]

---

## Production Cost Estimation

### By Team Size

**Ismail LTPF formula:**
Budget = Sum(Person_Salary x Months x FTE) x 1.30

The 30% safety margin is non-negotiable -- scope creep, delays, unforeseen costs. Apply as a fixed multiplier. Salary defaults in the framework ($1,600-$2,200/month) reflect developing-world or junior rates. UK fully-loaded rates: GBP4,000-GBP8,000/month. Always apply UK rates for UK client engagements. [source: web_2026-06-02_ismail_budget_viability_framework]

**Kevuru quick-check formula:**
Cost = (Hourly_Rate x 8) x (Team_Size x 20) x Months

Example: GBP40/hr x 8 hrs x 10 people x 20 days x 6 months = GBP384,000. Use to cross-validate the Ismail calculation; both methods should produce comparable results. [source: web_2026-06-02_production_cost_scaling_trends]

**Team size to budget correlation (2022-2026 data):**

| Team Size | Budget Range | Typical Timeline |
|---|---|---|
| Solo developer | GBP5K-50K direct costs | -- |
| 2-person team | GBP50K-150K | -- |
| Small (3-5) | GBP100K-400K | 1-2 years |
| Mid-size indie (6-15) | GBP300K-2M | 2-4 years |
| Studio-backed (15-30) | GBP1M-5M | -- |

[source: web_2026-06-02_indie_budget_breakdown_benchmarks]

**Sarge Universe UK salary benchmarks (26-role studio, 2025):** CEO/Game Producer GBP120K, CTO GBP110K, COO GBP95K, Head of Product GBP90K, Lead Backend Engineer GBP80K, Head of Marketing GBP80K, DevOps GBP75K, Senior Data Engineer GBP75K, Backend Engineer GBP70K, Economy Designer GBP65K, QA Lead GBP55K. Loaded factor: 1.3x (30% UK employer on-costs applied uniformly). Economy Designer is a distinct senior role, not merged into game design. [source: chatgpt_691f13cd]

**In-house vs outsource:** Replacing expensive outsource contracts with in-house hires can save 40-50% on equivalent FTE cost. Core engineering and game dev roles should be in-house for code ownership and investor optics. [source: chatgpt_6891db64]

### By Genre

**Genre-specific cost and revenue benchmarks (Steam PC, 2022-2026):**

| Genre | Budget Range | Revenue Potential |
|---|---|---|
| Factory/Automation | GBP80K-300K | GBP200K-500K+ |
| Roguelites | GBP40K-200K | GBP100K-300K |
| Survival Crafting | GBP100K-400K | GBP100K-350K |
| Colony Sim/Management | GBP60K-250K | GBP150K-400K |
| City Builders | GBP60K-250K | GBP75K-250K |
| Metroidvanias | GBP30K-150K | GBP50K-150K |
| Story-Driven/Narrative | GBP40K-200K | GBP25K-100K |
| Visual Novels | GBP15K-80K | GBP10K-40K |

Factory/Automation and Colony Sim have the best budget-to-revenue ratios. Story-Driven and Visual Novels have the worst. [source: web_2026-06-02_indie_budget_breakdown_benchmarks]

**Budget allocation by department:** Art and animation 25-40% (single largest cost centre). Programming 20-35%. Marketing 10-20%. Audio 5-15%. QA 5-10%. [source: web_2026-06-02_indie_budget_breakdown_benchmarks]

### By Development Phase and Scale

**Tier benchmarks (2026):**

| Tier | Budget | Team Size |
|---|---|---|
| Indie | GBP50K-500K | 1-15 |
| Mid-tier / Triple-i | GBP5M-20M | 50-100 |
| AA | GBP20M-50M | 100-200 |
| AAA | GBP100M+ | 200-800+ |

The "missing middle" (GBP500K-GBP5M) is increasingly rare. NBI clients frequently fall into this gap -- too large for bootstrap, too small for publisher-level investment. Accurate budget estimation here adds the most value. [source: web_2026-06-02_production_cost_scaling_trends]

**Cost inflation:** Development costs compound at approximately 7.8% CAGR since 2022 (global spend: ~$37B in 2022 to ~$50B by 2026). US fully-loaded developer compensation: ~$95K/year in 2022 to ~$115K/year in 2026 (~5% CAGR). Senior engineers and technical artists saw ~8%/year. UK rates approximately 15-20% lower; Eastern Europe 40-60% lower. For any multi-year project budgeted today, inflate costs by approximately 25% over a 3-year cycle. [source: web_2026-06-02_production_cost_scaling_trends]

**Marketing cost benchmarks:** GTA V -- $150M dev, $115M marketing (77% of dev). Call of Duty: Modern Warfare 2 -- $50M dev, $200M marketing (400% of dev). General rule: marketing budget = 20-100% of development budget. [source: web_2026-06-02_production_cost_scaling_trends]

---

## Market Sizing

Bottom-up approaches only. Top-down ("1% of $200B") is not acceptable.

**Boxleiter Number method (premium PC):** Count Steam reviews on 3 comparables (low/mid/high). Multiply by 57. Calculate required revenue at target price. If the game cannot credibly outperform the low comparable, do not proceed at that budget. [source: web_2026-06-02_ismail_budget_viability_framework]

**Regional pricing construction:** Build from platform FX, apply purchasing power parity adjustments (see Regional Pricing under Revenue Projection). [source: goals_pricing_matrix]

**Sarge Universe Telegram TAM:** 200M users on Telegram, USD4 ARPU, CPI approximately USD0.08. [source: chatgpt_68efb4be]

**Global gaming market (2026):** Approximately $205B total. Mobile leads at ~$107B (52% share). Asia-Pacific ~$87.6B (46% share). [source: web_2026-05-29_global-gaming-revenue-205b (from existing bank)]

**Platform commission context:** Google Play reduced from 30% to 20% on IAP for qualifying developers post-Epic settlement. For a developer at $1M/year, approximately $100,000 more stays in-house. Steam remains at 30% (25% above $10M, 20% above $50M). [source: web_2026-05-25b_google-epic-settlement-commission-drop (from existing bank)]

---

## Valuation Models

**12-tab investor-grade workbook structure:** (1) Summary with base/downside/upside. (2) Assumptions with named ranges and sources. (3) Historical Financials with gross-to-net reconciliation. (4) Normalisations with add-backs. (5) Forecast: driver-based 36-month model. (6) DCF: unlevered FCF, WACC, terminal value, 5x5 sensitivity grids on exit multiple vs discount rate and multiple vs revenue. (7) Multiples: public and transaction comps shown as range with quartile position -- never single cherry-picked comparators. (8) EV to Equity Bridge: less net debt, preferred liquidation, TSM dilution. (9) KPIs and Cohorts. (10) Evidence and Sources. (11) Checks: balance checks red until passing. (12) Change Log.

Display standards: inputs blue, outputs black, links green, checks red until passing. Every number in PDF must tie to a visible cell. [source: chatgpt_6908ac7d]

**Common investor red flags:** Valuing on gross receipts while collecting net. Forward revenue without showing drivers. Ignoring refunds and platform fees. Cherry-picked single comparators. [source: chatgpt_6908ac7d]

**Sarge Universe valuation workbook:** Formula-driven Excel, 60-month horizon, 3 scenarios (base/upside/downside via toggle), DCF and multiples. Tournament GMV modelled separately from IAP at 15% take rate. Sensitivity grids on exit multiple vs discount rate. Revenue recognition includes deferral mechanics for durable vs consumable purchases. [source: chatgpt_690c8b4f]

---

## Forecast Simulator Architecture (NBI Tooling)

**AERM Enhanced Excel Simulator:** Seven-module design. (1) Scenario analysis: Low/Med/High percentage modifier toggles via dropdown -- modifiers applied to baseline assumptions, not separate models. (2) Event/feature impact timeline: date, uplift value, on/off toggle per event. (3) Acquisition channel and user-type segmentation. (4) Unified monetisation rollup: battle pass, direct store, lootboxes, durable deferment, credits economy. (5) In-game currency sinks and sources tracking -- a differentiating feature that impresses clients. (6) Dashboard/graphs sheet: weekly and monthly summaries. (7) Actuals integration: forecast vs real data comparison tab. This is a client-ready product with a control panel and documentation. [source: chatgpt_6899e32a]

**Sarge 6-Sheet Excel Blueprint:** Inputs/Overview, Retention Curve (piecewise power model with D1/D7/D30 anchors), UA Plan (tiered daily budgets by channel), Daily Forecast (cohort summation via SUMPRODUCT), Monthly Summary, Yearly Summary. Daily forecast uses event flags (fortnightly weekends 15-20% uplift, holidays 30%). Net revenue computed via weighted platform fee blend. Sarge-specific parameters: 28-day seasons, GBP4.99 base battle pass (20% attach), GBP19.99 Commander Pass from month 3 (2% attach), 98 SKUs at launch, flash sales on 5-7 day cycles with 7-day cooldown per SKU group. [source: chatgpt_68efb4be]

**Firebase Web Application Blueprint:** For production-grade simulators beyond Excel. Firestore as system of record, BigQuery for cohort maths and Monte Carlo. Five forecast engine modules: Acquisition (viral k-factor for Telegram frictionless starts), Retention (cohort curves per channel and geo), Monetisation (per SKU family), Economy (sinks/sources), Aggregation (to MAU/ARPDAU/ARPPU/LTV). Eleven Firestore collections: SKUs, battle pass plans, content drops, tournaments, UA campaigns, retention models, pricing priors, scenarios, sim runs, sim daily outputs, sim rollups. [source: chatgpt_68d3feee]

---

## Open Questions

1. **Retention benchmark drift:** GameAnalytics shows D1 declining 1-2 points per year. Should NBI apply a further haircut beyond 2025 benchmarks for 2026 projections, or hold until 2026 benchmarks publish? [source: web_2026-05-26_gameanalytics_2025_retention_benchmarks]

2. **Battle pass conversion rate:** The 3-8% conversion figure is inferred from limited-time offer benchmarks, not direct battle pass measurement. Studios keep this data proprietary. Is there a better proxy? [source: web_2026-06-02_battle_pass_revenue_modelling]

3. **Missing middle budget gap:** Projects in the GBP500K-GBP5M range are increasingly rare. Does this represent a genuine market failure or a survival-bias artefact in the data? [source: web_2026-06-02_production_cost_scaling_trends]

4. **Telegram-specific unit economics:** Sarge modelled a viral k-factor justified by Telegram frictionless starts, but there is no public benchmark dataset for Telegram F2P retention or CPI. How should NBI calibrate this for future Telegram game clients? [source: chatgpt_68d3feee, chatgpt_68efb4be]

5. **Event burnout diminishing returns:** Live ops data confirms that >80% event coverage leads to participation drop, but no source quantifies the revenue decay curve. When does the event ARPDAU multiplier begin to invert? [source: web_2026-06-02_liveops_event_cadence_economics]

6. **Regional pricing empirical validation:** The 40-country pricing matrix is NBI's first live output of this type. As the F2P sports title completes its first post-launch months, actual regional revenue data will validate or challenge the purchasing power adjustment factors. Collect and feed back into the bank. [source: goals_pricing_matrix]

7. **Google/Apple commission timeline:** How should multi-year forecast models account for the ongoing commission reduction trends across platforms? [source: existing bank]

---

## Source Index

| Source ID | Title | Type | Date |
|---|---|---|---|
| web_2026-05-26_retention_curve_ltv_model | Retention Curve LTV Model (Valeev) | Methodology | May 2026 |
| web_2026-05-26_f2p_unit_economics_framework | F2P Unit Economics Framework (Tenjin) | Methodology | May 2026 |
| web_2026-05-26_marketing_pnl_roas_framework | Marketing P&L Framework (Seufert) | Methodology | May 2026 |
| web_2026-05-26_f2p_whale_economics_voltage | F2P Whale Economics and Voltage Model (Radoff) | Methodology | May 2026 |
| web_2026-05-26_gameanalytics_2025_retention_benchmarks | GameAnalytics 2025 Retention Benchmarks | Benchmark data | May 2026 |
| web_2026-06-02_ismail_budget_viability_framework | Ismail LTPF Budget Viability Framework | Methodology | Jun 2026 |
| web_2026-06-02_indie_budget_breakdown_benchmarks | Indie Budget Breakdown Benchmarks (Steam Page Analyzer) | Benchmark data | Jun 2026 |
| web_2026-06-02_liveops_event_cadence_economics | Live Ops Event Cadence Economics | Methodology | Jun 2026 |
| web_2026-06-02_production_cost_scaling_trends | Production Cost Scaling Trends (Ziva) | Benchmark data | Jun 2026 |
| web_2026-06-02_battle_pass_revenue_modelling | Battle Pass Revenue Modelling (multi-source) | Benchmark data | Jun 2026 |
| chatgpt_68efb4be | Sarge Universe Forecast Model Blueprint | Methodology | Oct 2025 |
| chatgpt_690c8b4f | Sarge Universe Valuation Workbook Structure | Methodology | Nov 2025 |
| chatgpt_6894b46a | ARPU Benchmarks for Mobile RTS Games | Benchmark data | Aug 2025 |
| chatgpt_6899e32a | Forecast Simulator Design: AERM Model Spec | Methodology | Aug 2025 |
| chatgpt_68ede5cf | Revenue Forecast Model Spec: Hybrid Monetisation (client anonymised) | Methodology | Oct 2025 |
| chatgpt_68d3feee | Sarge Forecast Simulator Firebase Blueprint | Methodology | Sep 2025 |
| chatgpt_6908ac7d | Data Room Valuation Sheet Structure | Methodology | Nov 2025 |
| chatgpt_691f13cd | Sarge Universe Headcount Plan (GBP10M Raise) | Methodology | Nov 2025 |
| chatgpt_6891db64 | Sarge Universe Year-1 Headcount Plan (Budget-Fitted) | Benchmark data | Aug 2025 |
| goals_town_hall_beta_metrics_2026-03-26 | F2P Football Game Beta Metrics (anonymised) | Benchmark data | Mar 2026 |
| goals_pricing_matrix | F2P Regional Pricing Matrix 40+ Countries (anonymised) | Benchmark data | Apr 2026 |
| goals_competitive_mtx_findings_2026-04-21 | F2P Hard Currency Pack Pricing Benchmarks (anonymised) | Benchmark data | Apr 2026 |
| goals_release_liveops_2026-04 | F2P Football Game 5-Month LiveOps Roadmap (anonymised) | Methodology | Apr 2026 |
