# Forecast Models -- Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 11 extracts from ChatGPT conversations (June 2025 -- January 2026)
**Role associations:** data_analyst, gaming_practice_lead

---

## Executive Summary

This bank captures NBI's accumulated methodology for building revenue and player forecasting models for F2P games, with particular depth in Telegram mini-app and mobile RTS genres. The strongest assets are a complete cohort-based daily forecast blueprint with exact Excel formulas, a dual-approach valuation workbook (DCF + revenue multiples), and a reusable forecast simulator design spec that merges the best of two real models (Sarge Universe and AERM/Apex). Supporting material includes ARPU benchmarks across mobile RTS titles, phased headcount planning at two investment levels, and a hybrid monetisation framework comparing premium sequel vs F2P+subscription paths. Every methodology here has been built for real client work, not theoretical.

---

## Methodology Comparison

| Model | What It Predicts | Inputs Required | Scale | Documented Accuracy | Source |
|---|---|---|---|---|---|
| Cohort-based daily forecast (Sarge blueprint) | DAU, revenue, ARPDAU by day | D1/D7/D30 retention anchors, UA budget tiers, CPI by channel, ARPDAU, event calendar | Any F2P | N/A (projection model) | [source: chatgpt_68efb4be] |
| AERM enhanced simulator | Revenue by SKU family, event impact, scenario outcomes | Baseline metrics + event timeline + scenario modifiers | Mid-core F2P | N/A (scenario model) | [source: chatgpt_6899e32a] |
| Valuation workbook (DCF + multiples) | Company valuation, investor return | 60-month forecast, WACC, terminal growth, comps | Any game studio | N/A (valuation) | [source: chatgpt_690c8b4f] |
| Revenue forecast (premium vs hybrid) | 60-month recognised revenue by path | Cohorted acquisition, segment behaviour, deferral schedules | Premium + F2P hybrid | N/A (comparison model) | [source: chatgpt_68ede5cf] |
| Headcount cost model (phased) | People cost by phase | Role list, UK salaries, loaded factor, phase gates | 18-26 roles | N/A (budget model) | [source: chatgpt_691f13cd, chatgpt_6891db64] |

---

## Revenue Projection Models

### F2P Conversion Funnels

The core F2P forecast structure uses cohort summation via SUMPRODUCT for daily active user calculation. Each daily cohort's remaining users are computed from the retention curve, then multiplied by ARPDAU (adjusted for events and holidays) to produce daily revenue. [source: chatgpt_68efb4be]

Key parameters from the Sarge blueprint:
- **Payer conversion:** 5.5% baseline [source: chatgpt_690c8b4f]
- **ARPPU:** GBP8 baseline [source: chatgpt_690c8b4f]
- **Battle pass:** GBP4.99 at 20% attach rate; Commander Pass GBP19.99 from Month 3 at 2% attach [source: chatgpt_690c8b4f]
- **Event uplift:** bi-weekly weekend events drive 15-20% ARPDAU uplift; holiday bumps 30% [source: chatgpt_68efb4be]
- **Platform fee netting:** weighted blend across channels (45% Telegram / 35% Web / 20% Other) [source: chatgpt_68efb4be]

Tournament GMV is modelled separately from IAP with a 15% take rate. [source: chatgpt_690c8b4f]

### Premium Revenue Forecasting

No dedicated premium-only model exists yet. The hybrid model (below) includes a premium sequel path as one of two comparison scenarios. [See Hybrid Monetisation]

### Hybrid Monetisation

A 60-month dual-path model compares Premium Sequel vs Hybrid (F2P + Subscription + Premium). The hybrid path requires modelling cross-path migration (F2P to Premium, F2P to Subscription) and three player segments: Bingers, Grazers, and Long-Haulers with movement tracking and segment-specific spend patterns. [source: chatgpt_68ede5cf]

Revenue recognition must distinguish bookings vs recognised revenue vs cash receipts, with full deferral schedules: subscription ratable monthly/annual, packs recognised on delivery, MTX point-in-time. The key strategic question the model must answer: "at what thresholds does Hybrid beat Sequel on recognised revenue?" [source: chatgpt_68ede5cf]

Monetisation streams in the hybrid model: Drivers Club (monthly/annual sub), Quarterly Packs, cosmetic MTX, convenience/QoL items, store discounts/tokens, vault tokens/redemption. [source: chatgpt_68ede5cf]

### Live Service Event Revenue

Event-driven ARPDAU modelling uses a dedicated timeline where each event has a date, uplift value, and on/off toggle. The AERM model's feature control panel with index/lookup-driven event scheduling is the gold standard for realism. [source: chatgpt_6899e32a]

Sarge-specific event parameters: 28-day seasons, flash sales on 5-7 day cycles with 7-day cooldown per SKU group, bi-weekly weekend events. [source: chatgpt_6899e32a]

---

## Player Forecasting

### Cohort-Based Retention (D1/D7/D30)

Retention uses a piecewise power model with three anchor points. Base assumptions: D1 45%, D7 22%, D30 13%. [source: chatgpt_68efb4be]

For web-app builds, the forecast simulator should handle cohort retention curves per acquisition channel and per geography, since Telegram frictionless starts justify modelling a higher viral k-factor than App Store installs. [source: chatgpt_68d3feee]

Go/no-go gates should anchor hiring waves to D1/D7/D30 retention and payer conversion, not to timeline milestones. [source: chatgpt_690dcbec]

### LTV Curve Modelling

LTV computation aggregates from five forecast engine modules: (1) Acquisition with viral k-factor, (2) Retention with cohort curves per channel/geo, (3) Monetisation per SKU family, (4) Economy sinks/sources, (5) Aggregation to MAU/ARPDAU/ARPPU/LTV. [source: chatgpt_68d3feee]

The 5-7 KPIs that best predict success of adding F2P/Subscription are an open question from the hybrid model scope. [source: chatgpt_68ede5cf]

### Growth Projection from Soft Launch Data

UA plan uses tiered daily budgets: GBP15k day 1, GBP8k days 2-7, GBP4k days 8-30, GBP2.5k day 31+. CPI targets by channel: Telegram GBP0.60, Influencer GBP1.20, Web Ads GBP1.80. CPI guardrail of USD2.50 or less. Organic viral K-factor 0.15 with 14-day half-life decay. [source: chatgpt_68efb4be]

Monthly install growth assumed at 5% baseline with 300k Month 1 installs. DAU/MAU ratio assumed at 24%. [source: chatgpt_690c8b4f]

---

## Production Cost Estimation

### By Team Size

Two headcount models exist at different investment levels:

**GBP10M raise (26 roles, 18 months):** Three 6-month phases. Phase 1 focuses on core engineering and leadership. Phase 2 brings full team online. Phase 3 scales community, support, and content. Uses 1.3x loaded factor on base salaries. Key UK salary benchmarks: CEO/Game Producer GBP120k, CTO GBP110k, COO GBP95k, Head of Product GBP90k, Economy Designer GBP65k, Lead Backend GBP80k, Backend GBP70k, DevOps GBP75k, Senior Data Engineer GBP75k, Head of Marketing GBP80k, QA Lead GBP55k. [source: chatgpt_691f13cd]

**Budget-fitted (18 roles, year 1):** Fits within GBP271k monthly burn ceiling. Total internal payroll circa GBP933k year 1. Key insight: replacing expensive outsource contracts (PixelPlex USD82k/m, half of AAA Game Art USD46k/m) with in-house hires saved circa GBP840k while improving code ownership and investor optics. [source: chatgpt_6891db64]

**SaaS/data platform (Playsage):** Two scenarios at USD1M and USD10M with 10% reserve for data/infra/legal at both levels. Lean GTM with 1 sales head and 1 marketing head in year one. 18-month runway to market, 24 months to full-featured. [source: chatgpt_690b386f]

### By Genre

No genre-specific cost models beyond the RTS/strategy data points above. [See Open Questions]

### By Development Phase

Phase-gating for cost models follows milestone triggers, not calendar dates. Hiring waves gate on D1/D7/D30 retention and payer conversion data. [source: chatgpt_690dcbec]

Core engineering and game dev roles must be in-house for code ownership and investor optics. UK game dev salaries must be at 2024-25 market benchmarks, not generic web dev rates. [source: chatgpt_6891db64]

---

## Market Sizing

### ARPU Benchmarks (Mobile RTS/Strategy, 2024)

| Title | Annual Revenue | MAU | Annual ARPU | Monthly ARPU | Monetisation Style |
|---|---|---|---|---|---|
| Clash of Clans | USD359.9M | ~97-98M | ~USD3.7 | ~USD0.31 | Battle-pass, massive casual base drags average down |
| Boom Beach | USD16.2M | ~12M | ~USD1.35 | ~USD0.11 | Legacy Supercell title |
| Last War: Survival | USD1.15B | 12-15M | USD77-96 | USD6.4-8.0 | Aggressive time-limited packs, whale-focused |

Last War iOS US ARPDAU: USD2.47 (Sensor Tower). The 25x ARPU spread between Clash and Last War is explained by different monetisation levers: high MAU drags ARPU down for Clash; scale and monetisation strategy are inversely related. All figures exclude ad revenue, web-shop spend, and third-party Android stores. [source: chatgpt_6894b46a]

Bottom-up market sizing for Telegram: 200M TAM, USD4 ARPU, CPI USD0.08. [source: chatgpt_690dcbec]

---

## Open Questions

- **Genre-specific cost benchmarks.** All production cost data comes from RTS/strategy and data platform contexts. Need benchmarks for RPG, casual, and simulation genres.
- **Forecast accuracy validation.** No model has been run against actuals yet. The actuals integration module in the simulator design spec is unbuilt. [source: chatgpt_6899e32a]
- **Subscription vs IAP crossover thresholds.** The hybrid model identifies the key question but no answer exists yet: at what F2P-to-premium conversion rate does hybrid beat sequel? [source: chatgpt_68ede5cf]
- **Web-app simulator status.** The Firebase/Lovable build blueprint exists but it is unclear whether this was ever built beyond the spec. [source: chatgpt_68d3feee]
- **Non-UK salary benchmarks.** Headcount plans are UK-anchored. Need equivalent benchmarks for US, EU, and MENA for international client work.
- **In-game currency sinks/sources modelling.** Identified as a distinctive feature of the enhanced simulator but no worked example exists yet. [source: chatgpt_6899e32a]

---

## Source Index

| Extract ID | Date | Key Topics |
|---|---|---|
| chatgpt_68efb4be | 2025-10-15 | Cohort-based daily forecast blueprint, retention curve, UA budget tiers |
| chatgpt_6894b46a | 2025-08-07 | ARPU benchmarks for mobile RTS (Clash, Last War, Boom Beach) |
| chatgpt_6899e32a | 2025-08-11 | AERM vs Sarge model comparison, enhanced simulator spec |
| chatgpt_68d3feee | 2025-09-24 | Firebase/Lovable build blueprint, Firestore data model |
| chatgpt_691f13cd | 2025-11-20 | 26-role headcount plan for GBP10M raise |
| chatgpt_6891db64 | 2025-08-05 | Budget-fitted headcount, in-house vs outsource savings |
| chatgpt_68ede5cf | 2025-10-14 | Hybrid monetisation model, revenue recognition, player segments |
| chatgpt_690b386f | 2025-11-05 | Playsage headcount at USD1M and USD10M |
| chatgpt_690c8b4f | 2025-11-06 | Valuation workbook, DCF + multiples, scenario toggles |
| chatgpt_690dcbec | 2025-11-07 | Sarge data room assumptions, go/no-go gates |
| chatgpt_6908ac7d | 2025-11-03 | 12-tab valuation model structure, EV to equity bridge |
