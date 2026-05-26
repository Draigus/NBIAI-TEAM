---
source: web_research
source_id: web_2026-05-26_retention_curve_ltv_model
source_path: https://medium.com/@r_valeev/how-to-make-retention-model-and-calculate-ltv-for-mobile-game-8e166c2f07d3
ingested: 2026-05-26
topics_detected: [forecast, retention, ltv, arpdau, cohort, power_curve, methodology]
relevance_score: 8
novelty_score: 6
actionability_score: 9
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Retention Curve LTV Model for Mobile Games (Valeev)

## Key Content

A replicable, spreadsheet-based methodology for calculating LTV from early retention data using power curve fitting. The core formula is:

**Retention = Intercept x (Day ^ Slope)**

Process: (1) Take raw retention data (D1, D3, D7 minimum). (2) Apply logarithmic transformation using ln() to both day and retention values, converting the non-linear relationship to linear form. (3) Use Excel/Sheets LINEST function on transformed values to extract slope and intercept coefficients. (4) Reverse the intercept transformation via EXP(). (5) Generate the fitted retention curve for any future day.

**Lifetime calculation:** The area under the retention curve from D0 to the target day, computed via trapezoidal rule -- sum of (Retention[Day_N] + Retention[Day_N+1]) / 2 for each consecutive day pair. This cumulative sum equals total engagement days per user.

**LTV calculation:** Two methods offered. Simple: LTV = Lifetime x ARPDAU (assumes constant ARPDAU -- acknowledged as inaccurate). Better: calculate daily revenue contributions from active returning users, then sum across the retention curve.

Worked example with strategy game data: Lifetime = 1.43 days, ARPDAU = $0.065, LTV7 = $0.09295.

## Decisions / Insights

- Power curve fitting is the industry-standard approach for retention modelling because retention decay follows a power law, not exponential decay. This matters for projections beyond observed data.
- The model explicitly requires only D1/D3/D7 data to generate a usable forecast -- exactly the data available in soft launch.
- The "area under the curve" approach to lifetime is more rigorous than simply multiplying average retention by days. It captures the shape of the decay curve.
- Key caveat: "paying users is highly dependent on many factors, including the genre of the game, the user's country, the speed of their progress, and your paywalls." The model provides directional estimates to be refined with post-launch data.

## Context

Author is Ruslan Valeev, a mobile game analytics practitioner. The article is undated but references current industry practices. The methodology is standard across the mobile analytics community and aligns with approaches documented by GameAnalytics, Singular, and AppsFlyer.

## Applicability

**Direct NBI use:** This is the foundational retention-to-LTV model NBI should use in client revenue forecasts. Can be built in Excel/Sheets in under an hour. Requires only soft-launch retention data (D1/D3/D7) plus an ARPDAU assumption (which can be benchmarked from GameAnalytics data by genre).

**Client fit:** Ideal for indie-to-mid-tier clients in soft launch or pre-launch who need LTV projections for investor decks or UA budget planning. No large dataset required -- works with a single cohort of a few hundred users.

**Limitations:** The power curve extrapolation becomes unreliable beyond 3-4x the observed window (i.e., D7 data should not be extrapolated past D30 without validation). Genre-specific ARPDAU assumptions introduce the largest error margin.
