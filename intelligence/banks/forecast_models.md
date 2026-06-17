# Forecast Models -- Knowledge Bank

**Last compiled:** 2026-06-17 (incremental)
**Extract count:** 31
**Role associations:** data_analyst, game_economy_consultant, vp_product

---

## Executive Summary

NBI holds a complete, interlocking forecasting stack for F2P and premium games, assembled from public methodology literature, NBI client engagements, and a Telegram F2P client engagement.

**Layer 1 -- Player forecasting:** Power curve retention modelling (Valeev) generates projections from D1/D7/D30 soft-launch data. GameAnalytics 2025 benchmarks (11,600 games, 1.48B+ MAU) supply genre-specific defaults when client data is unavailable. Retention is declining year-on-year; 2023-era benchmarks will overestimate LTV. [source: web_2026-05-26_retention_curve_ltv_model, web_2026-05-26_gameanalytics_2025_retention_benchmarks]

**Layer 2 -- Revenue forecasting:** The Tenjin unit economics framework works backward from a revenue target to required player volumes, CPI budget, and ROAS. Whale distribution (top 20% = 75% of revenue) anchors conversion assumptions. NBI's own F2P sports client engagement has produced live benchmark data: 36% D1 retention, 88% CPI reduction during beta, and a 5-month ARPPU escalation roadmap from $2.21 to $34.62. [source: web_2026-05-26_f2p_unit_economics_framework, web_2026-05-26_f2p_whale_economics_voltage, goals_town_hall_beta_metrics_2026-03-26, goals_release_liveops_2026-04]

**Layer 3 -- Cash flow and live service:** Seufert's marketing P&L framework models cash timing and maximum cash at risk -- studios can mistake LTV > CPI for solvency and still run out of money. Live ops event uplift (+20-40% ARPDAU) and battle pass contribution (10-40%, up to 60% in shooters) complete the live service picture. [source: web_2026-05-26_marketing_pnl_roas_framework, web_2026-06-02_liveops_event_cadence_economics, web_2026-06-02_battle_pass_revenue_modelling]

**Layer 4 -- PC market sizing:** Genre-specific Steam review-count revenue framework (genre multipliers 15-80x, net 0.38 multiplier, lifetime curve), five-phase comp set construction, and tag-level viability percentile analysis now provide a complete bottom-up PC market sizing stack. Mobile TAM/SAM/SOM with platform/geography/genre filter reference values covers F2P mobile. [source: web_2026-06-16_steam_review_count_revenue_framework, web_2026-06-16_steam_genre_comp_analysis_framework, web_2026-06-16_steam_genre_viability_percentile_analysis, web_2026-06-16_mobile_tam_sam_som_framework]

**Layer 5 -- Console market sizing:** A console translation layer built on four interlocking tools: (1) Console-as-percentage-of-Steam revenue framework (Switch 20-35% for Nintendo-adjacent genres, PlayStation 10-30%, Xbox premium near-zero for Game Pass titles); (2) Nintendo Switch eShop chart rank-to-units benchmarks (Top 100 = 25,000+ copies in 14-day launch window; only ~10% of new releases reach Top 300); (3) PlayStation player-count estimation via Gamstat trophy data (archived mid-2025, valid for historical comps pre-2025); (4) ARPU/ARPPU benchmarks by platform (PlayStation ARPPU ~$21.2, Xbox ~$19.2, PC ~$20.5 -- 2022 vintage, directional floor). Xbox premium indie SAM collapses for Game Pass titles: 80% reduction in unit sales. [source: web_2026-06-17_console_revenue_as_pct_of_steam, web_2026-06-17_switch_eshop_chart_rank_benchmarks, web_2026-06-17_psn_trophy_proxy_gamstat, web_2026-06-17_console_arpu_arppu_benchmarks]

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
| Telegram F2P 6-Sheet Excel | Full daily/monthly/yearly F2P launch | Retention anchors, UA tiers, ARPDAU | F2P launch | NBI first-hand | chatgpt_68efb4be |
| Dual-Path 60-Month | Hybrid monetisation revenue recognition | Cohort sources, segment spend, deferral | Premium + F2P hybrid | NBI first-hand | chatgpt_68ede5cf |
| 12-Tab Valuation Workbook | Studio valuation for investors | 36-month forecast, DCF, comps | Any studio | NBI first-hand | chatgpt_6908ac7d |
| Steam Review-Count Revenue | PC revenue estimation from public data | Review count, genre, launch price | PC indie-to-mid | Industry standard | web_2026-06-16_steam_review_count_revenue_framework |
| Steam Comp Set Construction | Genre revenue bands (P25/P50/P75/P90) | SteamSpy tag data, review counts | PC indie-to-mid | Practitioner (Zukowski) | web_2026-06-16_steam_genre_comp_analysis_framework |
| Genre Viability Percentile | % of games in tag exceeding threshold | Tag-level review count data | PC indie-to-mid | Developer (Eastshade) | web_2026-06-16_steam_genre_viability_percentile_analysis |
| Mobile TAM/SAM/SOM | Addressable market by platform/geo/genre/monetisation | Public market reports + filter reference values | Mobile F2P any scale | Practitioner (Adapty) | web_2026-06-16_mobile_tam_sam_som_framework |
| Console-as-%-of-Steam | Console revenue range from a Steam baseline | Steam revenue estimate + genre | Console indie any scale | GameDiscoverCo/Carless | web_2026-06-17_console_revenue_as_pct_of_steam |
| PSN Trophy Proxy (Gamstat) | PlayStation player/purchase count estimation | PSN public trophy data; historical comps pre-2025 | PS console | Empirical (MyPS4Life calibration) | web_2026-06-17_psn_trophy_proxy_gamstat |
| Switch eShop Rank-to-Units | Switch launch window and lifetime sales estimation | eShop chart position at launch | Switch indie | Empirical (GameDiscoverCo) | web_2026-06-17_switch_eshop_chart_rank_benchmarks |
| Console ARPU/ARPPU (Newzoo 2022) | Per-user and per-payer revenue baseline by platform | Platform selection | Any platform | Newzoo 2022 vintage | web_2026-06-17_console_arpu_arppu_benchmarks |

---

## Revenue Projection Models

### F2P Conversion Funnels

The standard F2P revenue funnel: Installs -> Active Users (via retention) -> Payers (via CVR) -> Revenue (via ARPPU). Build it backward from a revenue target, not forward from assumed installs.

**Backward-from-revenue construction:** Target revenue (e.g., GBP1.2M) / ARPPU = required payers. Required payers / CVR = required acquires. Required acquires x CPI = UA budget. This forces validation of whether assumptions produce a viable business before a line of code is written. [source: web_2026-05-26_f2p_unit_economics_framework]

**Conversion to paying (CVR):** 2-8% industry range, genre-dependent. Tenjin worked example: 5%. Telegram F2P client plan: 5.5%. [source: web_2026-05-26_f2p_unit_economics_framework, chatgpt_690c8b4f]

**NBI Telegram F2P client baseline assumptions:** 200K starting MAU, 300K month-1 installs, 5% monthly install growth, 25% monthly churn, 24% DAU/MAU ratio, 5.5% payer conversion, GBP8 ARPPU, GBP4.99 battle pass at 20% attach, GBP19.99 Commander Pass from month 3 at 2% attach. [source: chatgpt_690c8b4f]

**Pricing calibration principle:** Start high, because raising prices on existing tiers is operationally and reputationally difficult. The backward funnel often reveals that a low-price strategy requires unrealistically large player volumes. [source: web_2026-05-26_f2p_unit_economics_framework]

**Tenjin worked example (45-day model):** D1 45%, D7 20%, D30 7%; ARPDAU $2.00; CVR 5%. LTV (45 days) $12.60. Marketing budget $500,000. Predicted revenue $1,200,000. Predicted profit $759,000. ROAS 251%. [source: web_2026-05-26_f2p_unit_economics_framework]

**Telegram-specific economics:** CPI 7-12 cents (extremely low vs App Store), no 30% platform overhead. Revenue flow split: 45% Telegram / 35% Web / 20% Other for platform fee netting. [source: chatgpt_68efb4be]

### Hard Currency Pack Pricing Benchmarks

315 normalised price points across 12 competitors with 147 citations (NBI research, April 2026). [source: goals_competitive_mtx_findings_2026-04-21]

- Entry-level tier at $0.99/100 HC is the genre floor
- Volume discount curves cluster at 15-23% industry-wide (NBA 2K outlier at 86%; Fortnite at 56%)
- USD prices on existing tiers are functionally permanent -- EA has not raised USD prices on existing tiers across 8 years of FIFA/FC history
- UFL mirrors EA FC on first 3 tiers, caps at $79.99 vs EA FC's $149.99

**SKU revenue concentration:** In a F2P sports title beta, top 3 packs represented 66.7% of revenue despite only 14.2% of volume. Packs were 96.9% of all revenue; cosmetic kits only 3.1%. [source: goals_town_hall_beta_metrics_2026-03-26]

### Premium Revenue Forecasting

**Break-even formula (Steam PC):**
Copies needed = Total development cost / (Game price x 0.70 x 0.88)

The 0.70 is Steam's 30% cut; 0.88 accounts for regional pricing discounts and refunds. Example: GBP50K budget at GBP14.99 requires approximately 5,417 copies; GBP150K at GBP19.99 requires approximately 12,186 copies. [source: web_2026-06-02_indie_budget_breakdown_benchmarks]

**Steam Review-Count Revenue Framework (preferred over flat Boxleiter multiplier):**

Step 1: `Estimated Units = Review Count x Genre Multiplier`

Genre multipliers (2024 vintage, post-2020 games trend toward lower end):

| Genre | Multiplier Range | Midpoint |
|---|---|---|
| Action / Shooter | 50-80x | 60x |
| Horror | 30-50x | 38x |
| RPG | 30-50x | 38x |
| Roguelite | 30-50x | 35x |
| Strategy | 25-40x | 32x |
| Simulation | 25-40x | 30x |
| Platformer | 25-40x | 30x |
| Indie / Narrative | 20-35x | 27x |
| Puzzle | 20-35x | 25x |
| Visual Novel | 15-25x | 20x |

Step 2: `Gross Revenue = Units x Launch Price`

Step 3: `Net Revenue = Gross Revenue x 0.38`

Deduction stack: x0.93 (VAT) x0.92 (returns) x0.80 (regional pricing) x0.80 (promotional discounts) x0.70 (Steam 30% cut). At the 25% revenue tier ($10M-$50M): adjust final multiplier to ~0.43.

Step 4: Lifetime projection curve:

| Time Since Launch | % of Lifetime Revenue Earned |
|---|---|
| Week 1 | ~13% |
| 3 months | ~33% |
| 1 year | ~58% |
| 2 years | ~75% |
| 4 years | ~95% |

`Lifetime Net Revenue = Current Net Revenue / (% of Lifetime at current date)`

Accuracy: works best for games with 100-10,000 reviews. Below 50 reviews: unreliable. Exclude Early Access, F2P, and viral outliers from comp sets. The flat Boxleiter 57x is a simplified approximation; this genre-specific table is more accurate for NBI client work. [source: web_2026-06-16_steam_review_count_revenue_framework]

**Boxleiter commercial viability check (simplified):** Review count x 57 to estimate unit sales. Viability requires 3-4x budget in revenue benchmarked against low/mid/high comparables. Use only when genre-specific multiplier data is unavailable. [source: web_2026-06-02_ismail_budget_viability_framework]

**Median outcome warning:** Median indie game lifetime gross revenue is GBP5,000-GBP15,000. Fewer than 180 reviews places a game in the bottom 80% of all releases. [source: web_2026-06-02_indie_budget_breakdown_benchmarks]

### Hybrid Monetisation

NBI can deliver complex dual-path forecast models comparing premium sequel vs hybrid (F2P + subscription + premium) strategies. Structural requirements: cohorted by acquisition source, monthly retention and returner curves, cross-path migration modelling, player segment archetypes (Bingers, Grazers, Long-Haulers), and full revenue recognition mechanics. Requires distinguishing ASC 606 treatment: subscription revenue ratable monthly/annual, packs on delivery, MTX point-in-time. [source: chatgpt_68ede5cf]

### Live Service Event Revenue

**ARPDAU lift during events:** +20-40% above baseline, corroborated across multiple independent sources. [source: web_2026-06-02_liveops_event_cadence_economics, web_2026-05-26_f2p_whale_economics_voltage]

**Battle pass contribution:**
- Low integration (pass bolted on): 1-15% of total revenue
- High integration (pass woven into core loop): 20-40%, up to 60% in shooters

Battle pass modelling steps: (1) Penetration: 3-8% of DAU. (2) Price: GBP5-10 mobile, GBP10-15 PC/console. (3) Pass revenue per season: DAU x CVR% x Price x Seasons/Year. (4) Validate: pass revenue should be 10-40% of total IAP. (5) Renewal decay: 55-70% in season 1, declining to 40-55% in year 2.

**Cannibalism warning:** Clash Royale showed a strong temporal correlation between battle pass introduction and a drop in total monthly revenue. Flag this risk in every battle pass recommendation. [source: web_2026-06-02_battle_pass_revenue_modelling]

### Regional Pricing

Build from platform FX rates, then apply purchasing power parity adjustments by region. Validated rules across 40+ countries and 4 platforms: Gulf states typically overprice (~5% downward adjustment). Japan and South Korea sustain higher prices. Brazil, Malaysia, Thailand need ~15% reduction. Ukraine, India, Indonesia: intentionally below FX as accessibility decision. [source: goals_pricing_matrix]

---

## Player Forecasting

### Cohort-Based Retention (D1/D7/D30)

**GameAnalytics 2025 benchmarks** (11,600 games, 1.48B+ MAU, 9 regions, 16 genres):

| Metric | Bottom 25% | Median | Top 25% | iOS Top 25% |
|---|---|---|---|---|
| D1 retention | 10-11.5% | ~18% | 26-28% | 31-33% |
| D7 retention | ~1.5% | 3.4-3.9% | 7-8% | -- |
| D28 retention | -- | -- | <3% | -- |

Session metrics: median daily playtime 22 minutes, median session length 5-6 minutes, average 4 sessions/day (midcore: 6-7). Year-on-year decline: D1 top quartile dropped 1-2 percentage points from 2023 to 2025. [source: web_2026-05-26_gameanalytics_2025_retention_benchmarks]

**Live benchmark (competitive F2P sports title, beta March 2026):** 220K total installs, 36% D1 overall (34% PS5, 37% Steam), 57 min average daily playtime, 4.6 matches/day. CPI reduced from $3.61 to $0.43 during beta (88% reduction). [source: goals_town_hall_beta_metrics_2026-03-26]

### LTV Curve Modelling

**Valeev power curve method:**
`Retention = Intercept x (Day ^ Slope)`

Steps: (1) Take D1, D3, D7 data. (2) Apply ln() to both day number and retention. (3) Run LINEST on transformed values. (4) Reverse intercept via EXP(). (5) Generate fitted curve for any future day.

**Lifetime calculation:** Sum of (Retention[N] + Retention[N+1]) / 2 for each consecutive day pair (trapezoidal area under retention curve). **LTV:** Lifetime x ARPDAU. Extrapolation unreliable beyond 3-4x the observed window. [source: web_2026-05-26_retention_curve_ltv_model]

**Whale distribution:** Top 20% of players generate 75% of revenue; top 1% generate 24%. Revenue forecasting is fundamentally a forecast of whale acquisition and retention. [source: web_2026-05-26_f2p_whale_economics_voltage]

---

## Production Cost Estimation

### By Team Size

**Ismail LTPF formula:**
`Budget = Sum(Person_Salary x Months x FTE) x 1.30`

The 30% safety margin is non-negotiable. Apply UK rates for UK engagements: GBP4,000-GBP8,000/month fully-loaded. [source: web_2026-06-02_ismail_budget_viability_framework]

**Team size to budget correlation (2022-2026):**

| Team Size | Budget Range |
|---|---|
| Solo developer | GBP5K-50K direct costs |
| 2-person team | GBP50K-150K |
| Small (3-5) | GBP100K-400K |
| Mid-size indie (6-15) | GBP300K-2M |
| Studio-backed (15-30) | GBP1M-5M |

[source: web_2026-06-02_indie_budget_breakdown_benchmarks]

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

[source: web_2026-06-02_indie_budget_breakdown_benchmarks]

### By Development Phase and Scale

**Tier benchmarks (2026):**

| Tier | Budget | Team Size |
|---|---|---|
| Indie | GBP50K-500K | 1-15 |
| Mid-tier / Triple-i | GBP5M-20M | 50-100 |
| AA | GBP20M-50M | 100-200 |
| AAA | GBP100M+ | 200-800+ |

**Cost inflation:** Development costs compound at approximately 7.8% CAGR since 2022. For any multi-year project budgeted today, inflate costs by approximately 25% over a 3-year cycle. [source: web_2026-06-02_production_cost_scaling_trends]

---

## Market Sizing

Bottom-up approaches only. Top-down ("1% of $200B") is not acceptable.

### PC Steam Market Sizing

**Step 1 -- Build the comp set (5-phase process):**

1. Define the genre precisely using Steam tag combinations (not broad genre labels). Start with a 40,000-row SteamSpy or Gamalytics export; apply tag filters (SEARCH formulas in Excel) to reduce to 30-100 comparable games.
2. Filter for minimum market signal: remove games with fewer than 10 reviews. Optionally apply 700+ follower filter (~7,000 wishlists equivalent).
3. Apply the review-count revenue framework (see Premium Revenue Forecasting above) to each comp. Calculate P25, P50, P75, P90 -- not averages (one hit game can pull the average 5-10x above the median).
4. Anchor to a realistic target: P50 = floor, P75 = realistic target, P90 = genre hit potential (useful for ceiling framing only, not financial planning).
5. Qualitative cohort validation: group 6-10 closest comps into archetypes (ugly high-earners, polished underperformers, solo dev projects, low-marketing successes). Time-box each review to 60 minutes.

[source: web_2026-06-16_steam_genre_comp_analysis_framework]

**Genre success rates (% of releases exceeding 1,000 reviews -- Q2 2024):**

Only 2.44% of all Steam releases achieve 1,000 reviews (~500 games/year from 18,000+ releases). Genre success rates:

| Genre | Success Rate |
|---|---|
| Open World Survival Craft | ~24.5% |
| Farming / Life Sim | ~20.8% |
| Co-op focused | ~21% of all hits (H1 2024) |
| Action-Roguelite | Declining sharply -- 17 hits (2023) to ~1 (H1 2024) |

Revenue concentration: published games median ~$16,222 vs self-published median ~$3,285. Top 10% of AA games capture ~83.92% of total AA revenue. [source: web_2026-06-16_steam_genre_comp_analysis_framework]

**Step 2 -- Genre viability percentile analysis:**

Operate at Steam tag level (e.g., "Metroidvania", "Cozy", "Soulslike"), not broad genre labels. For each tag:

1. Collect review count data (SteamSpy API). Apply filters: minimum 30 games per tag, maximum 2,000 games per tag, exclude Early Access.
2. Calculate revenue per game using the review-count formula.
3. Build P10/P25/P50/P75/P90 distribution. Do not report averages alone.
4. Calculate viability probability: `Viability % = Games exceeding threshold / Total games in tag`

Decision rule:

| Condition | Signal |
|---|---|
| P50 > client minimum viable AND viability % > 20% | Genre passes baseline market sizing test |
| P50 < minimum viable AND viability % < 10% | Recommend genre pivot |
| Mixed signals | Report both metrics; client decides with full visibility |

**Data currency:** The Eastshade analysis used 2021-2022 data. Fresh data runs are required per engagement. Key changes since 2022: action-roguelite saturation (2024), co-op demand surge, farming/life-sim strength. Do not apply historical viability percentages without re-running against a current dataset. [source: web_2026-06-16_steam_genre_viability_percentile_analysis]

### Mobile Market Sizing

**TAM/SAM/SOM framework (run all three calculation paths and triangulate):**

**TAM (Total Addressable Market):**
- Top-Down: `TAM = Total gaming segment revenue x Genre share %` (use Newzoo free annual report, Sensor Tower, or Statista)
- Bottom-Up (more defensible): `TAM = Total gamers in category x Annual ARPU for genre` -- each assumption separately auditable, preferred for due diligence
- Value Theory: less common for games; applicable when creating a genuinely new sub-genre

**SAM (Serviceable Addressable Market):**
`SAM = TAM x Platform Filter x Geography Filter x Genre Filter x Monetisation Filter x Demographic Filter`

Filter reference values:

| Filter | Reference Value |
|---|---|
| iOS vs Android (US revenue split) | iOS ~56% of US mobile game revenue |
| North America share of global mobile game revenue | ~35% |
| Western markets combined | ~55% |

Example (action mobile F2P, US-only, iOS): ~$90B global TAM x35% (NA) x56% (iOS) x25% (action genre) = ~$4.4B SAM.

**SOM (Serviceable Obtainable Market):**
- Top-down: `SOM = SAM x Realistic market share %` -- indie/early-stage: 0.01-0.1% of SAM in Year 1-3; above 1% requires credible UA budget or IP advantage
- Bottom-up (more credible in pitch contexts): `SOM = Reachable Installs x Conversion Rate x ARPU` where Reachable Installs = UA budget / CPI for genre in target market

Cross-validation rule: both methods should produce results within 5x. Divergence of 10x+ signals a broken assumption.

**Anti-patterns to reject in client materials:**
- "We only need 1% of a huge market" with no UA mechanism
- TAM figures applied without platform/genre filtering (inflates by 10-50x)
- CPI benchmarks from pre-2022 sources (iOS ATT fundamentally changed mobile UA costs)

[source: web_2026-06-16_mobile_tam_sam_som_framework]

### Console Market Sizing

Console market sizing requires four interlocking tools. Apply in combination: use the console-as-%-of-Steam framework to generate ranges, Gamstat for PlayStation comp validation, Switch chart benchmarks for Switch-specific sizing, and ARPU/ARPPU data for per-user sanity checks.

**Platform hierarchy for indie discoverability:**
From Devolver Digital and equivalent publisher statements: PC (Steam) > Nintendo Switch > PlayStation > Xbox. Xbox is structurally the weakest for indie premium titles due to Game Pass substitution. Games launching day-and-date on Game Pass can expect approximately 80% reduction in premium unit sales on Xbox (Christopher Dring / GamesIndustry.biz). For market sizing: Xbox premium indie SAM is near-zero for any developer also entering Game Pass -- treat as reach (brand building) not revenue. [source: web_2026-06-17_console_revenue_as_pct_of_steam]

**Console revenue as percentage of Steam (working framework):**

| Scenario | Switch | PlayStation | Xbox (no Game Pass) |
|---|---|---|---|
| Nintendo-adjacent genre (cosy, platformer, puzzle) | 20-35% | 10-20% | 5-10% |
| Action / RPG crossover | 10-20% | 15-25% | 5-15% |
| Darker / mature themed | 5-15% | 15-30% | 5-15% |
| Any title entering Game Pass | N/A | N/A | <5% premium sales |

Application: take a Steam revenue estimate (from the review-count framework), apply the appropriate row for the client's genre, generate console SAM estimates. Always report as a range with derivation disclosed -- these are planning ranges assembled from developer anecdotes and aggregate data, not published benchmarks. Anchor data point: Car Mechanic Simulator sold approximately 10% of its PC launch volume on Xbox during a comparable window (verified in GameDiscoverCo coverage). [source: web_2026-06-17_console_revenue_as_pct_of_steam]

**Sales curve shape:**
Console: sharp initial launch spike, cliff within 4-6 weeks, slow decay. PC (Steam): moderate launch, stronger sustained tail over years. Console requires concentrated launch marketing investment; PC compounds over time. Lifetime revenues may converge for genuine hits. [source: web_2026-06-17_console_revenue_as_pct_of_steam]

**Indie download share (Jan-Aug 2025, Sensor Tower / VG Insights):**
Indie downloads as share of total: 60% on Steam, 34-35% on PlayStation and Xbox. Total paid-game-implied downloads: Steam ~323M, PlayStation ~312M (~97%), Xbox ~172M (~53%). These are total-market figures; indie-specific ratios will be lower on console. [source: web_2026-06-17_console_revenue_as_pct_of_steam]

**Nintendo Switch eShop rank-to-units benchmarks:**

| eShop Chart Position | Estimated Units (14-day launch window) |
|---|---|
| Top 100 | 25,000+ copies before slowdown |
| Top 200 | 10,000-20,000 copies |
| Below Top 200 | High hundreds to low thousands |
| Average below-chart launch | Declines to <50 copies/day within one month |

Success rate: only ~10% of new Switch releases reach Top 300 within 14 days. Only ~6 new games per month exceed 10,000 units in the launch window. The 10% threshold is the single most important planning input for a Switch market entry case.

Lifetime benchmarks: realistic success threshold ~500,000 copies on Switch (vs multi-million equivalent on Steam for a hit). Typical port cost recovery + bonus outcome: 50,000-100,000 lifetime. Nintendo-adjacent genres (cartoon, cosy, family) persistently outperform; pixel art and darker-toned titles underperform relative to PC and PlayStation.

No Boxleiter equivalent exists for Switch -- Nintendo does not expose review counts, wishlist counts, or equivalent public data. Chart ranking is the only public proxy. Caveat: Nintendo shifted Switch 2 eShop from unit-count to revenue-weighted ranking -- all benchmarks above are Switch 1 legacy data. No Switch 2 calibration dataset exists as of June 2026. [source: web_2026-06-17_switch_eshop_chart_rank_benchmarks]

**PlayStation player count proxy (Gamstat):**
Gamstat.com estimated PS player/purchase counts using PSN public API trophy data: sample ~8M PSN accounts, calculate % with each game in trophy list, scale to absolute counts via Sony's December 2024 MyPS4Life calibration data. Margin of error: ±10% for titles with sufficient sample.

Critical distinction: measures player engagement, not purchases. PS Plus downloads inflate player counts without purchase revenue. For premium-only indie titles not in PS Plus, player counts approximate purchase counts.

Archive status: Gamstat stopped active data collection after the PSN API was restricted following the December 2024 calibration event. Valid for historical comp research (pre-2025 launches); does not update for 2025+ titles.

Application: pull Gamstat player counts for 3-5 comparable indie comps; verify PS Plus status for each (discard or adjust if included); use purchase-implied range to bracket PlayStation SAM. Cross-validate with the console-as-%-of-Steam framework. [source: web_2026-06-17_psn_trophy_proxy_gamstat]

**Console ARPU/ARPPU benchmarks (Newzoo, US market, Jan-Sep 2022):**

| Platform | Monthly ARPU | Monthly ARPPU | % non-paying (prior 6 months) |
|---|---|---|---|
| PC | $2.2 | $20.5 | 18% |
| PlayStation | $1.1 | $21.2 | 23% |
| Xbox | $1.2 | $19.2 | 23% |
| Nintendo Switch | Not reported | Not reported | Not reported |

PC ARPU exceeds console ARPU despite comparable ARPPU -- driven by a higher share of paying users on PC (82%) vs console (77%). Console paying users spend at rates comparable to PC; the challenge is conversion, not spend level.

Calibration note: 2022 data. Game Pass, PS Plus Extra, and Nintendo Switch Online growth has since increased the non-paying share for premium titles. Apply a conservative haircut for 2025+ projections. Treat as directional floor, not current benchmark. Nintendo Switch ARPU/ARPPU is not publicly available; use chart rank-to-units benchmarks for Switch sizing instead. [source: web_2026-06-17_console_arpu_arppu_benchmarks]

### General Market Context

**Global gaming market (2026):** Approximately $205B total. Mobile leads at ~$107B (52% share). Asia-Pacific ~$87.6B (46% share).

**Platform commission context:** Google Play reduced from 30% to 20% on IAP for qualifying developers. Steam remains at 30% (25% above $10M, 20% above $50M).

---

## Valuation Models

**12-tab investor-grade workbook structure:** (1) Summary with base/downside/upside. (2) Assumptions. (3) Historical Financials. (4) Normalisations. (5) Forecast: driver-based 36-month model. (6) DCF: unlevered FCF, WACC, terminal value, 5x5 sensitivity grids. (7) Multiples: public and transaction comps shown as range with quartile position. (8) EV to Equity Bridge. (9) KPIs and Cohorts. (10) Evidence and Sources. (11) Checks. (12) Change Log. Display standards: inputs blue, outputs black, links green, checks red until passing. [source: chatgpt_6908ac7d]

---

## Forecast Simulator Architecture (NBI Tooling)

**AERM Enhanced Excel Simulator:** Seven-module design. (1) Scenario analysis via dropdown modifiers. (2) Event/feature impact timeline. (3) Acquisition channel and user-type segmentation. (4) Unified monetisation rollup. (5) In-game currency sinks and sources. (6) Dashboard/graphs sheet. (7) Actuals integration tab. [source: chatgpt_6899e32a]

**Telegram F2P 6-Sheet Blueprint:** Inputs/Overview, Retention Curve (piecewise power model), UA Plan (tiered daily budgets by channel), Daily Forecast (cohort summation via SUMPRODUCT), Monthly Summary, Yearly Summary. [source: chatgpt_68efb4be]

---

## Open Questions

1. **Retention benchmark drift:** GameAnalytics shows D1 declining 1-2 points per year. Should NBI apply a further haircut beyond 2025 benchmarks for 2026+ projections, or hold until 2026 benchmarks publish? [source: web_2026-05-26_gameanalytics_2025_retention_benchmarks]

2. **Battle pass conversion rate:** The 3-8% conversion figure is inferred from limited-time offer benchmarks, not direct battle pass measurement. Is there a better proxy? [source: web_2026-06-02_battle_pass_revenue_modelling]

3. **Missing middle budget gap:** Projects in the GBP500K-GBP5M range are increasingly rare. Does this represent a genuine market failure or a survival-bias artefact? [source: web_2026-06-02_production_cost_scaling_trends]

4. **Genre multiplier decay:** Pre-2020 analyses used a flat 30-50x range; post-2020 games cluster toward the lower end. Is the multiplier continuing to compress, and how often should the genre table be refreshed? [source: web_2026-06-16_steam_review_count_revenue_framework]

5. **Genre viability percentage changes:** Action-roguelites collapsed from ~17 annual hits to ~1 in H1 2024. How quickly do viability percentages shift, and what signals precede the collapse? [source: web_2026-06-16_steam_genre_comp_analysis_framework]

6. **Mobile TAM freshness for emerging markets:** The SAM filter reference values are from Sensor Tower/data.ai Western-centric datasets. MENA and Southeast Asian mobile markets may be underrepresented. [source: web_2026-06-16_mobile_tam_sam_som_framework]

7. **Event burnout diminishing returns:** Live ops data confirms >80% event coverage leads to participation drop, but no source quantifies the revenue decay curve. [source: web_2026-06-02_liveops_event_cadence_economics]

8. **Google/Apple commission timeline:** How should multi-year forecast models account for ongoing commission reduction trends?

9. **Switch 2 rank-to-units calibration:** Nintendo shifted the Switch 2 eShop to revenue-weighted ranking, invalidating the Switch 1 unit-count benchmarks. No public calibration dataset existed as of June 2026. When does sufficient Switch 2 data accumulate to produce reliable rank-to-units tables? [source: web_2026-06-17_switch_eshop_chart_rank_benchmarks]

10. **Console ARPU/ARPPU age:** The Newzoo benchmark is 2022 vintage. Game Pass, PS Plus Extra, and Nintendo Switch Online subscription growth has since reduced the paying-user share for premium titles. What is the appropriate haircut for 2025+ console revenue modelling? [source: web_2026-06-17_console_arpu_arppu_benchmarks]

11. **PlayStation reach proxy post-Gamstat:** Gamstat's archive mode means no live tracking of PlayStation launches from 2025 onward. Is there a credible alternative for PlayStation player-count estimation for titles launching in 2025+? [source: web_2026-06-17_psn_trophy_proxy_gamstat]

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
| web_2026-06-02_indie_budget_breakdown_benchmarks | Indie Budget Breakdown Benchmarks | Benchmark data | Jun 2026 |
| web_2026-06-02_liveops_event_cadence_economics | Live Ops Event Cadence Economics | Methodology | Jun 2026 |
| web_2026-06-02_production_cost_scaling_trends | Production Cost Scaling Trends | Benchmark data | Jun 2026 |
| web_2026-06-02_battle_pass_revenue_modelling | Battle Pass Revenue Modelling | Benchmark data | Jun 2026 |
| web_2026-06-16_steam_review_count_revenue_framework | Steam Revenue Estimation via Review Count | Methodology | Jun 2026 -- NEW |
| web_2026-06-16_steam_genre_comp_analysis_framework | Steam Genre Comp Analysis (Zukowski) | Methodology | Jun 2026 -- NEW |
| web_2026-06-16_steam_genre_viability_percentile_analysis | Genre Viability Percentile Analysis (Eastshade) | Methodology | Jun 2026 -- NEW |
| web_2026-06-16_mobile_tam_sam_som_framework | Mobile Game TAM/SAM/SOM Framework (Adapty) | Methodology | Jun 2026 -- NEW |
| chatgpt_68efb4be | Telegram F2P Client Forecast Model Blueprint | Methodology | Oct 2025 |
| chatgpt_690c8b4f | Telegram F2P Client Valuation Workbook Structure | Methodology | Nov 2025 |
| chatgpt_6894b46a | ARPU Benchmarks for Mobile RTS Games | Benchmark data | Aug 2025 |
| chatgpt_6899e32a | Forecast Simulator Design: AERM Model Spec | Methodology | Aug 2025 |
| chatgpt_68ede5cf | Revenue Forecast Model: Hybrid Monetisation | Methodology | Oct 2025 |
| chatgpt_68d3feee | Telegram F2P Client Forecast Simulator Firebase Blueprint | Methodology | Sep 2025 |
| chatgpt_6908ac7d | Data Room Valuation Sheet Structure | Methodology | Nov 2025 |
| chatgpt_691f13cd | Telegram F2P Client Headcount Plan (GBP10M Raise) | Methodology | Nov 2025 |
| chatgpt_6891db64 | Telegram F2P Client Year-1 Headcount Plan | Benchmark data | Aug 2025 |
| goals_town_hall_beta_metrics_2026-03-26 | F2P Football Game Beta Metrics | Benchmark data | Mar 2026 |
| goals_pricing_matrix | F2P Regional Pricing Matrix 40+ Countries | Benchmark data | Apr 2026 |
| goals_competitive_mtx_findings_2026-04-21 | F2P Hard Currency Pack Pricing Benchmarks | Benchmark data | Apr 2026 |
| goals_release_liveops_2026-04 | F2P Football Game 5-Month LiveOps Roadmap | Methodology | Apr 2026 |
| web_2026-06-17_console_revenue_as_pct_of_steam | Console Revenue as Percentage of Steam -- Indie Translation Framework (GameDiscoverCo/Carless) | Methodology | Jun 2026 -- NEW |
| web_2026-06-17_switch_eshop_chart_rank_benchmarks | Nintendo Switch eShop Chart Rank-to-Units Benchmarks (GameDiscoverCo) | Benchmark data | Jun 2026 -- NEW |
| web_2026-06-17_psn_trophy_proxy_gamstat | PSN Trophy-Count as PlayStation Sales Proxy -- Gamstat Methodology | Methodology | Jun 2026 -- NEW |
| web_2026-06-17_console_arpu_arppu_benchmarks | Newzoo Console vs PC ARPU/ARPPU Benchmarks (US 2022) | Benchmark data | Jun 2026 -- NEW |
