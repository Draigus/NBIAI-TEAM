# Forecast Models -- Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 18 extracts (11 ChatGPT, 7 OneDrive/Downloads) -- June 2025 to May 2026
**Role associations:** data_analyst, gaming_practice_lead

---

## Executive Summary

This bank captures NBI's accumulated methodology for building revenue and player forecasting models for F2P games, with depth across Telegram mini-app, mobile RTS, and F2P football genres. The strongest assets are: a complete cohort-based daily forecast blueprint with exact Excel formulas, a dual-approach valuation workbook (DCF + revenue multiples), 315 normalised F2P pricing data points across 12 competitors, a purchasing-power-adjusted regional pricing matrix covering 40+ countries and 4 platforms, real beta performance data from a F2P football launch (220K installs, 36% D1 retention), and a 5-month LiveOps roadmap with monthly KPI escalation targets. New material from the Goals engagement adds the first real-world validation data for NBI's forecasting work: actual beta metrics that can be compared against model assumptions, and a concrete LiveOps revenue curve showing ARPPU progression from $2.21 to $34.62 over five months.

---

## Methodology Comparison

| Model | What It Predicts | Inputs Required | Scale | Source |
|---|---|---|---|---|
| Cohort-based daily forecast (Sarge) | DAU, revenue, ARPDAU by day | D1/D7/D30 anchors, UA budget, CPI, ARPDAU, events | Any F2P | [source: chatgpt_68efb4be] |
| AERM enhanced simulator | Revenue by SKU family, event impact, scenarios | Baseline metrics + event timeline + modifiers | Mid-core F2P | [source: chatgpt_6899e32a] |
| Valuation workbook (DCF + multiples) | Company valuation, investor return | 60-month forecast, WACC, terminal growth, comps | Any studio | [source: chatgpt_690c8b4f] |
| Revenue forecast (premium vs hybrid) | 60-month recognised revenue by path | Cohorted acquisition, segment behaviour, deferrals | Premium + F2P hybrid | [source: chatgpt_68ede5cf] |
| Headcount cost model (phased) | People cost by phase | Role list, UK salaries, loaded factor, phase gates | 18-26 roles | [source: chatgpt_691f13cd, chatgpt_6891db64] |
| Three-persona revenue model (Goals) | Revenue by player segment | MAU, payer rate, ARPPU by segment | F2P sports | [source: goals_client_brain_2026-05-12] |
| LiveOps KPI escalation model | Monthly ARPDAU/ARPPU targets | Launch date, event calendar, monetisation schedule | F2P live service | [source: goals_release_liveops_2026-04] |

---

## Revenue Projection Models

### F2P Conversion Funnels

The core F2P forecast uses cohort summation via SUMPRODUCT. Each daily cohort's remaining users are computed from the retention curve, then multiplied by ARPDAU (adjusted for events and holidays) to produce daily revenue. [source: chatgpt_68efb4be]

Key parameters from the Sarge blueprint:
- **Payer conversion:** 5.5% baseline [source: chatgpt_690c8b4f]
- **ARPPU:** GBP8 baseline [source: chatgpt_690c8b4f]
- **Battle pass:** GBP4.99 at 20% attach rate; Commander Pass GBP19.99 from Month 3 at 2% attach [source: chatgpt_690c8b4f]
- **Event uplift:** bi-weekly weekend events drive 15-20% ARPDAU uplift; holiday bumps 30% [source: chatgpt_68efb4be]
- **Platform fee netting:** weighted blend across channels (45% Telegram / 35% Web / 20% Other) [source: chatgpt_68efb4be]

Tournament GMV modelled separately from IAP with a 15% take rate. [source: chatgpt_690c8b4f]

### Three-Persona Revenue Model (Goals, Real Data)

The Goals engagement produced a three-persona segmentation with actual beta-derived parameters: [source: goals_client_brain_2026-05-12]

| Persona | Population % | Paying % | ARPPU | Revenue Share |
|---|---|---|---|---|
| Core FUT | 20% | 30% | $46.00 | Dominant |
| Dedicated FUT | 35% | 10% | $15.81 | Mid-tier |
| Casual FUT | 45% | 2% | $7.24 | Long tail |

Projected totals at 805K MAU (3.6x beta): 10.4% blended payer rate, $3.38 ARPU, $32.48 blended ARPPU, $2.72M total revenue. Critical finding: top 3 packs = 66.7% of revenue despite 14.2% of volume (heavy SKU concentration). [source: goals_client_brain_2026-05-12]

### Hybrid Monetisation

A 60-month dual-path model compares Premium Sequel vs Hybrid (F2P + Subscription + Premium). Requires modelling cross-path migration (F2P to Premium, F2P to Subscription) and three player segments: Bingers, Grazers, Long-Haulers. Revenue recognition must distinguish bookings vs recognised revenue vs cash receipts, with deferral schedules by type. The key question: "at what thresholds does Hybrid beat Sequel on recognised revenue?" [source: chatgpt_68ede5cf]

### Live Service Event Revenue

Event-driven ARPDAU modelling uses a dedicated timeline with date, uplift value, and on/off toggle. The AERM model's feature control panel with index/lookup-driven event scheduling is the gold standard. Sarge parameters: 28-day seasons, flash sales on 5-7 day cycles with 7-day cooldown per SKU group. [source: chatgpt_6899e32a]

---

## LiveOps Revenue Modelling (New: Real Engagement Data)

### Monthly KPI Escalation Model

The Goals engagement produced a 5-month LiveOps roadmap (May-Sep 2026) with concrete monthly targets: [source: goals_release_liveops_2026-04]

| Month | Theme | ARPDAU | ARPPU | Key Mechanic |
|---|---|---|---|---|
| May (Kickoff) | Launch | -- | $2.21 | $1.99 starter pack, Founder's Season |
| June (Scale-Up) | Growth | $0.40 | $13.19 | 10 core market kits, World Cup warm-up |
| July (Peak) | Maximise | $0.50 | $26.94 | World Cup matchup packs |
| August (Sink) | Drain | $0.55 | $31.73 | 30-40% End of Summer Sale (currency drain) |
| September (Maturation) | Stabilise | $0.60 | $34.62 | Ultra-premium content, whale targeting |

Key pattern: August is explicitly designed as a "Sink" month to drain hoarded soft currency before September maturation. Real-world sports calendar (World Cup, Champions League, Europa League, Transfer Deadline Day) drives the entire LiveOps rhythm. [source: goals_release_liveops_2026-04]

### Dual-Currency Economy Design

Goals uses hard currency (coins, real money only) and soft currency (points, gameplay earned). Marketplace 10% tax as sink. 7-tier player rarity (Basic 40-59 OVR through Mythic 95-99). Aging system: players enter at 18, age one year per two real-life weeks, retire 32-41. The aging system is the primary demand sink, driving replacement purchasing. Non-seasonal philosophy is a fixed design constraint. [source: goals_client_brain_2026-05-12]

---

## F2P Pricing Benchmarks (New: 315 Data Points)

### Hard Currency Pack Pricing (2026)

315 normalised price points across 12 competitors with 147 citations. [source: goals_competitive_mtx_findings_2026-04-21]

Key findings:
- **Entry-level standard:** $0.99/100 HC is the football genre floor (EA FC, UFL, eFootball all match)
- **Volume discount curves:** 15-23% industry-wide is the safe zone; steeper curves signal different audience economics (NBA 2K outlier at 86%)
- **Price permanence:** EA has NEVER raised USD prices on existing tiers across 8 years of FIFA/FC history; strategy is adding higher ceiling tiers and restructuring mid-range
- **Cross-sport consistency:** EA FC and Madden use near-identical pricing structures (same price points, same amounts within 50 points), suggesting deliberate portfolio strategy
- **Competitor positioning:** UFL (closest F2P football competitor) mirrors EA FC on first 3 tiers, caps at $79.99 vs EA FC's $149.99

### Regional Pricing Matrix

Global pricing matrix covering 40+ countries across Sony, Xbox, Steam, and Epic. Goes beyond simple FX conversion to purchasing-power-adjusted pricing. [source: goals_pricing_matrix]

Regional adjustment patterns:
- **Upward adjustment (~-5%):** Japan, South Korea can sustain higher prices relative to FX
- **Downward adjustment (~5%):** Poland, South Africa, UAE, Kuwait, Saudi Arabia, Qatar, Hungary, Singapore
- **Further review (~-15%):** Brazil, Malaysia, Thailand
- **Intentional below-FX (accessibility):** Ukraine, India, Indonesia
- **Arbitrage risk:** Platform-specific pricing (Sony vs Xbox vs Steam vs Epic) creates arbitrage if not aligned

---

## Player Forecasting

### Cohort-Based Retention (D1/D7/D30)

Retention uses a piecewise power model with three anchor points. Base assumptions: D1 45%, D7 22%, D30 13%. [source: chatgpt_68efb4be]

**Real-world validation (Goals beta, March 2026):** 220K installs, 36% D1 overall (34% PS5, 37% Steam). NBI assessed 36% D1 as strong for F2P sports (industry average ~25-30%). Key discrepancy: SOW cited 50% D1 on PlayStation; actual data showed 34%. Engagement metrics: 57 min avg daily playtime, 4.6 matches/day, 832K 1v1 matches. CPI reduced from $3.61 to $0.43 (88% reduction during beta). [source: goals_town_hall_beta_metrics_2026-03-26, goals_client_brain_2026-05-12]

Go/no-go gates should anchor hiring waves to retention and payer conversion, not timeline milestones. [source: chatgpt_690dcbec]

### LTV Curve Modelling

LTV aggregates from five forecast engine modules: (1) Acquisition with viral k-factor, (2) Retention with cohort curves per channel/geo, (3) Monetisation per SKU family, (4) Economy sinks/sources, (5) Aggregation to MAU/ARPDAU/ARPPU/LTV. [source: chatgpt_68d3feee]

### Growth Projection from Soft Launch Data

UA plan uses tiered daily budgets: GBP15k day 1, GBP8k days 2-7, GBP4k days 8-30, GBP2.5k day 31+. CPI targets: Telegram GBP0.60, Influencer GBP1.20, Web Ads GBP1.80. CPI guardrail USD2.50. Organic viral K-factor 0.15 with 14-day half-life decay. Monthly install growth 5% baseline with 300k Month 1 installs. DAU/MAU ratio 24%. [source: chatgpt_68efb4be, chatgpt_690c8b4f]

### Community Sentiment as Forecast Input

509 beta respondents provided sentiment data. NPS +24.6 (40% promoters, 15.5% detractors). Anti-P2W sentiment is the hardest community red line. Defensive AI (2.54/5, lowest metric) and passing system (40% cited as top disappointment) are critical friction points. 5v5 ranked mode demand is overwhelming across all signal types. Revenue concentration in top 3 packs (66.7%) suggests SKU rationalisation opportunity. [source: goals_beta_community_sentiment]

---

## Production Cost Estimation

### By Team Size

**GBP10M raise (26 roles, 18 months):** Three 6-month phases. 1.3x loaded factor. Key UK salaries: CEO/Game Producer GBP120k, CTO GBP110k, COO GBP95k, Head of Product GBP90k, Economy Designer GBP65k, Lead Backend GBP80k, DevOps GBP75k. [source: chatgpt_691f13cd]

**Budget-fitted (18 roles, year 1):** Fits GBP271k monthly burn. Total payroll circa GBP933k year 1. Replacing outsource contracts (PixelPlex USD82k/m, half of AAA Game Art USD46k/m) with in-house hires saved circa GBP840k. [source: chatgpt_6891db64]

**SaaS/data platform (Playsage):** Two scenarios at USD1M and USD10M with 10% reserve. Lean GTM. 18-month runway to market. [source: chatgpt_690b386f]

### By Development Phase

Phase-gating follows milestone triggers, not calendar dates. Hiring waves gate on D1/D7/D30 retention and payer conversion. Core engineering must be in-house for code ownership and investor optics. UK game dev salaries at 2024-25 market benchmarks, not generic web dev rates. [source: chatgpt_690dcbec, chatgpt_6891db64]

---

## Market Sizing

### ARPU Benchmarks (Mobile RTS/Strategy, 2024)

| Title | Annual Revenue | MAU | Annual ARPU | Monetisation Style |
|---|---|---|---|---|
| Clash of Clans | USD359.9M | ~97-98M | ~USD3.70 | Battle-pass, massive casual base |
| Boom Beach | USD16.2M | ~12M | ~USD1.35 | Light spend, older title |
| Last War: Survival | USD1.15B | 12-15M | USD77-96 | Aggressive time-limited packs |

The 25x ARPU spread between Clash and Last War is explained by different monetisation levers. Last War iOS US ARPDAU: USD2.47 (Sensor Tower). [source: chatgpt_6894b46a]

Bottom-up market sizing for Telegram: 200M TAM, USD4 ARPU, CPI USD0.08. [source: chatgpt_690dcbec]

### Sarge Universe Document Inventory

40+ documents spanning the full investment lifecycle: pitch decks, financial models (AERM Forecast, MVP cost analysis, cashflow), game design (GDD, TDD, feature lists), legal (signed agreements), operational (VDR, data room, 40-step roadmap), and BD (1,350-entry investor list). AERM framework was applied to this prospect. Many binary files need future extraction. [source: sarge_telegram_export_2026-05-17]

---

## Open Questions

- **Forecast accuracy validation.** No model has been run against actuals. The Goals beta data provides the first opportunity to validate retention and CPI assumptions. [source: chatgpt_6899e32a]
- **Subscription vs IAP crossover thresholds.** At what F2P-to-premium conversion rate does hybrid beat sequel? [source: chatgpt_68ede5cf]
- **D1 retention discrepancy.** SOW cited 50% D1 on PlayStation; actual was 34%. Need process to verify metrics before embedding in proposals. [source: goals_client_brain_2026-05-12]
- **Genre-specific cost benchmarks.** All production cost data from RTS/strategy and data platform contexts. Need RPG, casual, simulation. 
- **Non-UK salary benchmarks.** Headcount plans are UK-anchored. Need US, EU, MENA equivalents.
- **In-game currency sinks/sources modelling.** Identified as distinctive but no worked example beyond Goals aging system. [source: chatgpt_6899e32a]
- **Goals post-launch validation.** Game launched 14 May 2026. Actual post-launch data would validate or challenge the LiveOps KPI escalation model.

---

## Source Index

| Extract ID | Date | Key Topics |
|---|---|---|
| chatgpt_68efb4be | 2025-10-15 | Cohort-based daily forecast blueprint |
| chatgpt_6894b46a | 2025-08-07 | ARPU benchmarks mobile RTS |
| chatgpt_6899e32a | 2025-08-11 | AERM vs Sarge model comparison |
| chatgpt_68d3feee | 2025-09-24 | Firebase/Lovable build blueprint |
| chatgpt_691f13cd | 2025-11-20 | 26-role headcount plan GBP10M |
| chatgpt_6891db64 | 2025-08-05 | Budget-fitted headcount |
| chatgpt_68ede5cf | 2025-10-14 | Hybrid monetisation model |
| chatgpt_690b386f | 2025-11-05 | Playsage headcount plans |
| chatgpt_690c8b4f | 2025-11-06 | Valuation workbook DCF + multiples |
| chatgpt_690dcbec | 2025-11-07 | Sarge data room, go/no-go gates |
| chatgpt_6908ac7d | 2025-11-03 | 12-tab valuation model structure |
| goals_client_brain_2026-05-12 | 2026-05-12 | Beta metrics, three-persona model, economy |
| goals_competitive_mtx_findings_2026-04-21 | 2026-04-21 | 315 pricing data points, 12 competitors |
| goals_pricing_matrix | 2026-04 | Regional pricing 40+ countries, 4 platforms |
| goals_release_liveops_2026-04 | 2026-04 | 5-month LiveOps KPI roadmap |
| goals_town_hall_beta_metrics_2026-03-26 | 2026-03-26 | Beta metrics (220K installs, 36% D1) |
| goals_beta_community_sentiment | 2026-03-26 | Community sentiment (509 respondents) |
| sarge_telegram_export_2026-05-17 | 2026-05-17 | Sarge Universe document inventory |
