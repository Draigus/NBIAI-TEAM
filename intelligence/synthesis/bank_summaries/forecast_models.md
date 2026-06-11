# Forecast Models -- Summary

**Last compiled:** 2026-06-11 (full rebuild) | **Extract count:** 23 | **Role associations:** data_analyst, game_economy_consultant, vp_product

## What This Bank Knows

- **Complete F2P forecasting stack:** Three interlocking layers -- Valeev power curve retention model (D1/D3/D7 inputs, Excel-buildable in under an hour), Tenjin unit economics backward-from-revenue framework, and Seufert marketing P&L cash timing model. Use all three together for any F2P client engagement involving UA planning or investor modelling.
- **Industry benchmarks with sourcing:** GameAnalytics 2025 data (11,600 games, 1.48B+ MAU) gives genre and platform-specific D1/D7/D28 retention defaults. Retention is declining year-on-year; 2023-era inputs overestimate LTV. Mobile RTS ARPU benchmarks (Clash $3.70/year to Last War $77-96/year) quantify the 25x spread from monetisation strategy differences.
- **Live client data (anonymised):** Beta metrics from a competitive F2P sports studio: 36% D1 retention, 88% CPI reduction during beta, top-3 SKUs = 66.7% of revenue. A 5-month post-launch ARPPU escalation roadmap ($2.21 to $34.62) with explicit currency sink mechanics. Hard currency pack pricing benchmarks from 315 price points across 12 competitors.
- **Production cost estimation:** Ismail LTPF formula (Budget = team salaries x 1.30) plus Boxleiter Number viability check for premium PC games. Genre-specific budget/revenue benchmarks. 7.8% annual cost CAGR since 2022 -- inflate multi-year budgets by ~25% over 3 years. UK salary benchmarks from a documented 26-role GBP10M-raise studio plan.
- **NBI tooling documented:** AERM Enhanced Excel Simulator spec (7 modules, client-ready), Sarge 6-sheet daily forecast blueprint, Firebase web app architecture for production-grade simulators, and a 12-tab investor-grade valuation workbook structure with display standards and common red flags.

## Most Recent Additions (this rebuild)

- Valeev power curve method and Tenjin unit economics framework (foundational methodology, first formal documentation)
- Seufert marketing P&L cash timing model -- cash at risk concept new to the bank
- GameAnalytics 2025 retention benchmarks (11,600 games dataset, year-on-year decline noted)
- Ismail LTPF budget viability framework and Boxleiter Number method
- Genre-specific cost/revenue table and 7.8% cost CAGR trend data
- Live ops event cadence economics (three-layer calendar, +20-40% ARPDAU uplift benchmarks)
- Battle pass modelling framework including cannibalism risk and renewal decay model
- F2P sports studio live benchmarks (beta metrics, pricing benchmarks, LiveOps roadmap) -- all anonymised

## Gaps

- No benchmark data for PC/console live service games (Fortnite, Destiny 2) -- all event uplift data is mobile-centric
- No validated Telegram-specific retention or CPI benchmark dataset; Sarge assumptions are internal targets only
- Battle pass conversion rate (3-8%) inferred from LTO benchmarks, not direct measurement
- Event ARPDAU diminishing returns curve is not quantified -- only the qualitative burnout warning exists
- Regional pricing adjustment factors not yet empirically validated against post-launch revenue data
