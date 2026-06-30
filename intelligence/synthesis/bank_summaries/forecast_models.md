# Forecast Models -- Summary

**Last compiled:** 2026-06-30 (incremental) | **Extract count:** 34 | **Role associations:** data_analyst, game_economy_consultant, vp_product

## What This Bank Knows

- **Complete console market sizing stack:** Console-as-%-of-Steam translation framework (Switch 20-35% Nintendo-adjacent, PlayStation 10-30%, Xbox near-zero for Game Pass titles), Switch eShop chart rank-to-units benchmarks (Top 100 = 25,000+ copies; only 10% of releases reach Top 300), PlayStation player-count estimation via Gamstat trophy proxy (archived mid-2025, valid for pre-2025 comps), ARPU/ARPPU benchmarks by platform (PlayStation $21.2 ARPPU, PC $20.5, Xbox $19.2 -- 2022 vintage, directional floor). Xbox premium SAM collapses 80% for Game Pass day-and-date titles.
- **Complete PC Steam market sizing stack:** Genre-specific review-count revenue framework (Action/Shooter 50-80x through Visual Novel 15-25x, net 0.38 multiplier, lifetime curve), five-phase comp set construction methodology, tag-level viability percentile analysis. The flat Boxleiter 57x is documented as a simplified approximation.
- **Mobile F2P market sizing:** TAM/SAM/SOM framework with filter reference values (iOS 56% US revenue, NA 35% global mobile), bottom-up preferred over top-down for investor pitches.
- **Complete F2P forecasting stack:** Valeev power curve retention model, Tenjin unit economics backward-from-revenue framework, Seufert marketing P&L cash timing model. GameAnalytics 2025 retention benchmarks (11,600 games, 1.48B+ MAU); retention declining year-on-year.
- **Retention modelling depth (NEW June 2026):** Power curve fitting (logarithmic D1-D7-D30-D60-D90 decay; plateau pattern around D90; segment-specific curves recommended over a single average curve; basis for LTV sensitivity analysis). Department of Play five-phase retention model (curiosity > competence > satisfaction > meaning > identity; each phase has distinct loss patterns; D30 is the "meaning" threshold -- players who cross D30 have begun to form identity attachment; design interventions differ per phase). Segwise PLTV early-signal methodology (D7 behavioural proxy for 90-day LTV; strongest predictors: monetisation events, social engagement, feature completion rate; enables LTV segmentation from D7 without waiting for 90-day window).
- **Live client data (anonymised):** Beta metrics from a competitive F2P sports studio: 36% D1 retention, 88% CPI reduction during beta, top-3 SKUs = 66.7% of revenue. Hard currency pack pricing from 315 price points across 12 competitors.
- **Production cost estimation:** Ismail LTPF formula, genre-specific budget/revenue benchmarks, 7.8% annual cost CAGR since 2022.
- **NBI tooling documented:** AERM Enhanced Excel Simulator spec, 6-sheet daily forecast blueprint, 12-tab investor-grade valuation workbook structure.

## Most Recent Additions (2026-06-30, 3 new extracts)

- **Power curve retention fitting** -- logarithmic D1-D7-D30-D60-D90 decay model; plateau around D90; segment-specific curves outperform single-average for LTV sensitivity analysis; used by Ovans/Ofir Ozan methodology
- **Department of Play retention phases** -- five-phase player engagement arc (curiosity > competence > satisfaction > meaning > identity); D30 as the "meaning" threshold; loss by phase has distinct shape; design intervention differs per phase
- **Segwise PLTV early signals** -- D7 behaviour as 90-day LTV proxy; monetisation events, social engagement, and feature completion rate are the strongest predictors; enables LTV segmentation without waiting for 90-day window

## Gaps

- Switch 2 rank-to-units calibration: no public dataset as of June 2026; Nintendo shifted to revenue-weighted eShop ranking
- Console ARPU/ARPPU age: 2022 data predates Game Pass / PS Plus Extra subscription growth; appropriate haircut for 2025+ projections unknown
- PlayStation reach proxy for 2025+ launches: Gamstat archived; no live equivalent identified
- Genre multiplier compression: post-2020 games cluster toward lower end; compression rate unknown
- Action-roguelite collapse signal: precursor to 17-to-1 hit collapse uncharacterised
- Battle pass conversion rate (3-8%) inferred from LTO benchmarks, not direct measurement
- MMO-specific retention curves: all retention benchmarks are F2P mobile or indie PC; MMO D1-D30-D90 patterns with subscription model undocumented in primary sources
