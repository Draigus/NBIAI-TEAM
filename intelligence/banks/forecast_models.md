# Forecast Models -- Knowledge Bank

**Last compiled:** 2026-05-25 (full rebuild)
**Sources:** 25+ extracts (11 ChatGPT, 10 OneDrive, 2 Downloads, 1 Granola)
**Role associations:** data_analyst, gaming_practice_lead

## Executive Summary

NBI's forecast modelling capability spans F2P revenue projection (AERM framework applied to Sarge Universe), player retention curves, regional pricing matrices, production cost estimation, and consulting revenue forecasting. The strongest methodologies are the cohort-based daily forecast model, the AERM forecast simulator, and the 40-country regional pricing matrix. New additions include Q2 cash flow data, Sarge pitch deck economics (CPI 7-12 cents on Telegram), PlayGOALS beta metrics (36% D1 retention, CPI reduced 88%), and the 5-month LiveOps roadmap with escalating ARPPU targets.

## Methodology Comparison

| Model | Predicts | Inputs | Scale | Source |
|---|---|---|---|---|
| AERM Forecast | Revenue, DAU, ARPDAU | Retention curves, UA spend, ARPDAU, event uplifts | F2P mobile/Telegram | [source: chatgpt_6899e32a] |
| Cohort-Based Daily | DAU, revenue by day | D1/D7/D30 retention, CPI by channel, ARPDAU | Any F2P | [source: chatgpt_68efb4be] |
| Dual-Path 60-Month | Revenue recognition | Cohort sources, segment spend, deferral schedules | Premium + F2P hybrid | [source: chatgpt_68ede5cf] |
| Regional Pricing Matrix | Platform-specific pricing | FX rates, PPP adjustments, competitor indices | 40+ countries, 4 platforms | [source: goals_pricing_matrix] |
| Consulting Revenue | NBI monthly revenue | Client contracts, pipeline probability, payback | NBI operations | [source: granola_53aa4eef] |

## Revenue Projection Models

### F2P Conversion Funnels

**Sarge Universe baseline assumptions:** 200k starting MAU, 300k Month 1 installs, 5% monthly install growth, 25% monthly churn, 24% DAU/MAU ratio, 5.5% payer conversion, GBP 8 ARPPU, GBP 4.99 battle pass at 20% attach, GBP 19.99 Commander Pass from Month 3 at 2% attach [source: chatgpt_690c8b4f].

**Telegram-specific economics:** CPI of 7-12 cents (extremely low vs App Store), no 30% platform overhead. Revenue flow split: 45% Telegram / 35% Web / 20% Other for platform fee netting. Frictionless start justifies modelling higher viral k-factor [source: granola_beef5f26, chatgpt_68efb4be].

**PlayGOALS beta metrics (March 2026):** 220K installs, 832K 1v1 matches, 36% D1 retention overall (34% PS5, 37% Steam), 57 min avg daily playtime, 4.6 matches/day, CPI reduced $3.61 to $0.43 (88% reduction). Revenue model: 805K MAU, 10.4% payer rate, ARPU $3.38, ARPPU $32.48, projected $2.72M total [source: goals_town_hall_beta_metrics_2026-03-26].

**Three-persona segmentation (PlayGOALS):** Core FUT (20% pop, 30% paying, $46 ARPPU), Dedicated FUT (35%, 10%, $15.81), Casual FUT (45%, 2%, $7.24) [source: goals_client_brain_2026-05-12].

### Premium Revenue Forecasting

**Dual-path model specification:** 60-month comparison of Premium Sequel vs Hybrid (F2P + Subscription + Premium). Key question: at what thresholds does Hybrid beat Sequel on recognised revenue? Requires distinguishing bookings vs recognised revenue vs cash receipts with full deferral schedules [source: chatgpt_68ede5cf].

### Live Service Event Revenue

**Event-driven ARPDAU uplifts:** Fortnightly weekend events with 15-20% ARPDAU uplift as standard. Holiday bumps at 30%. Event flags in forecast model toggle these on/off [source: chatgpt_68efb4be].

**LiveOps roadmap (PlayGOALS):** Monthly escalating ARPPU targets: May $2.21 > June $13.19 > July $26.94 > August $31.73 (explicit "Sink" month) > September $34.62. Real-world football calendar (World Cup, Champions League) drives the entire rhythm [source: goals_release_liveops_2026-04].

### F2P Pricing Benchmarks

**Hard currency pack pricing (315 normalised price points, 12 competitors):** $0.99/100 HC is the football genre entry-level standard. Volume discount curves cluster at 15-23% industry-wide. EA has never raised USD prices on existing tiers across 8 years. USD prices on F2P currency packs are functionally permanent [source: goals_competitive_mtx_findings_2026-04-21].

**Regional pricing (40+ countries):** Goes beyond FX conversion to purchasing-power-adjusted pricing. Gulf states typically overprice relative to purchasing power. Japan/South Korea sustain higher prices. Ukraine/India/Indonesia intentionally priced below FX rate (accessibility decision) [source: goals_pricing_matrix].

## Player Forecasting

### Cohort-Based Retention

**Retention model:** Piecewise power model with D1/D7/D30 anchors. Sarge base case: 45%/22%/13%. PlayGOALS actual: 36% D1 overall (strong for F2P sports, industry average ~25-30%) [source: chatgpt_68efb4be, goals_town_hall_beta_metrics_2026-03-26].

**UA plan structure:** Tiered daily budgets declining over time (GBP 15k day 1 > GBP 8k days 2-7 > GBP 4k days 8-30 > GBP 2.5k day 31+). Organic viral K-factor 0.15 with 14-day half-life decay [source: chatgpt_68efb4be].

### ARPU Benchmarks (Mobile Strategy)

| Title | Annual Revenue | MAU | Annual ARPU | Monthly ARPU |
|---|---|---|---|---|
| Clash of Clans | $359.9M | ~97-98M | ~$3.7 | ~$0.31 |
| Boom Beach | $16.2M | ~12M | ~$1.35 | ~$0.11 |
| Last War: Survival | $1.15B | 12-15M | $77-96 | $6.4-8.0 |

25x ARPU spread explained by monetisation strategy: Clash uses battle-pass style with massive casual base dragging average down; Last War uses aggressive time-limited packs and whale-focused spend [source: chatgpt_6894b46a].

## Production Cost Estimation

### By Team Size

**Sarge Universe (GBP 10M raise):** 26 roles across three 6-month phases, 1.3x loaded factor on base salaries. Key salaries: CEO GBP 120k, CTO GBP 110k, COO GBP 95k, Lead Backend GBP 80k, Economy Designer GBP 65k. Total 18-month people cost must leave budget for UA, infrastructure, content [source: chatgpt_691f13cd].

**Budget-fitted model (GBP 271k/month ceiling):** 18 roles at UK market rates. Replacing expensive outsource contracts (PixelPlex USD 82k/month) with in-house saves ~40-50% on equivalent FTE cost [source: chatgpt_6891db64].

**PlaySage (SaaS platform):** USD 1M scenario vs USD 10M scenario with 18-month runway. 10% reserve for data/infra/legal at both levels. Buy data from Newzoo, Sensor Tower (up to 8 sources). Lean GTM: 1 sales + 1 marketing head [source: chatgpt_690b386f].

## NBI Revenue Forecasting

**Current state (Q2 2026):** Monthly revenue GBP 55k (Couch GBP 30k, Lighthouse GBP 25k, Activision GBP 5k). Operating target GBP 75-80k/month. Cash flow trajectory: GBP 0 (Feb) > GBP 17k (Mar) > GBP 25k (Apr) [source: granola_53aa4eef].

**High-confidence pipeline:** UXR/data science expansion GBP 150-250k/year, Lighthouse data manager GBP 130-150k/year, Greek fund auditing GBP 50-100k initial [source: granola_53aa4eef].

**Consulting revenue forecast model:** NBI can deliver 60-month dual-path forecast models that distinguish bookings vs recognised revenue vs cash receipts as a consulting engagement [source: chatgpt_68ede5cf].

## Valuation Models

**Data room valuation workbook:** 12-tab structure: Summary, Assumptions, Historical Financials, Normalisations, Forecast, DCF, Multiples, EV to Equity Bridge, KPIs, Evidence, Checks, Change Log. Display standards: inputs blue, outputs black, links green, checks red. Common red flag: valuing on gross receipts while collecting net [source: chatgpt_6908ac7d].

**Sarge valuation:** Formula-driven Excel with Base/Upside/Downside scenarios, 60-month horizon, DCF and multiples, sensitivity grids on exit multiple vs discount rate. Tournament GMV modelled separately from IAP with 15% take rate [source: chatgpt_690c8b4f].

## Market Sizing

**Sarge Universe TAM:** 200M on Telegram, USD 4 ARPU, CPI on Telegram USD 0.08, raising GBP 10M [source: chatgpt_690dcbec].

**Global gaming market:** $195.6B content revenue in 2025 (record high), projected $205B in 2026 (+4.6%). Mobile leads at ~$107B (52% share). Asia-Pacific leads regionally at $87.6B (46% share). Global player base: 3.6 billion [source: web_2026-05-25_gaming-layoffs-q2-paradox].

**Google Play commission reduction:** From 30% to 20% on IAP (20% + 5% only if using Google billing). For a developer generating $1M/year, an extra $100,000 stays in-house [source: web_2026-05-25b_google-epic-settlement-commission-drop].

## Open Questions

- How should forecast models account for the Google/Apple commission reduction timeline?
- What retention benchmarks are appropriate for cosy MMORPGs vs competitive F2P?
- How does Telegram's viral k-factor compare to mobile app store organic uplift in practice?

## Source Index

| ID | Source Type | Date |
|---|---|---|
| chatgpt_68efb4be | ChatGPT | 2025-10-15 |
| chatgpt_6899e32a | ChatGPT | 2025-08-11 |
| chatgpt_68d3feee | ChatGPT | 2025-09-24 |
| chatgpt_690c8b4f | ChatGPT | 2025-11-06 |
| chatgpt_690dcbec | ChatGPT | 2025-11-07 |
| chatgpt_691f13cd | ChatGPT | 2025-11-20 |
| chatgpt_6891db64 | ChatGPT | 2025-08-05 |
| chatgpt_690b386f | ChatGPT | 2025-11-05 |
| chatgpt_6908ac7d | ChatGPT | 2025-11-03 |
| chatgpt_68ede5cf | ChatGPT | 2025-10-14 |
| chatgpt_6894b46a | ChatGPT | 2025-08-07 |
| granola_53aa4eef | Granola | 2026-05-04 |
| granola_beef5f26 | Granola | 2026-03-26 |
| goals_town_hall_beta_metrics_2026-03-26 | OneDrive | 2026-03-26 |
| goals_client_brain_2026-05-12 | OneDrive | 2026-05-12 |
| goals_competitive_mtx_findings_2026-04-21 | OneDrive | 2026-04-21 |
| goals_pricing_matrix | OneDrive | 2026-04 |
| goals_release_liveops_2026-04 | OneDrive | 2026-04 |
| goals_sow_proposal_2026-03-31 | OneDrive | 2026-03-31 |
| sarge_telegram_export_2026-05-17 | Downloads | 2026-05-17 |
