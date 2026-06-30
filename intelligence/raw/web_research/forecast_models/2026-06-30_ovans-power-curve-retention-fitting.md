---
source: web_research
source_id: web_2026-06-30_ovans-power-curve-retention-fitting
source_path: https://investgame.net/news/pdf/game-analytics-100-the-retention-curve/
ingested: 2026-06-30
topics_detected: [forecast, retention, cohort, curve_fitting, power_law, ltv, dau_projection, validation]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Power-Law Retention Curve Fitting: Russell Ovans / GameAnalytics 100

## Key Content

Source: Russell Ovans, Ph.D. (retired Director of Analytics, East Side Games). Published via GameAnalytics and InvestGame. This is the most thoroughly documented technical treatment of the power-curve retention model available for free.

**Core model:**

```
r(n) = a * n^b
```

Where:
- n = days since install (integer, n >= 1)
- a = coefficient approximately equal to Day-1 retention rate
- b = exponent, negative value (typically -0.4 to -0.6), governs decay rate
- r(0) = 1.0 by definition (all users present on install day)

**Fitting the curve with Excel (minimum inputs: D1, D3, D7):**

Step 1: Create a column of ln(day_numbers) and a column of ln(retention_values)
Step 2: Apply `=LINEST(ln_retention_column, ln_day_column)` -- returns [slope b, ln(a)]
Step 3: Recover a with `=EXP(intercept_result)`
Step 4: Forward-project any day N with `=a_cell * POWER(N, b_cell)`

Worked example from paper: observed D1=0.40, D3=0.23, D7=0.16 yields fitted curve r(n) = 0.396 * n^(-0.472).

**Fitting via Tableau:** Plot retention vs day_since_install as scatter chart, apply Power trend line from Analytics panel. Example output: r(n) = 0.372 * n^(-0.442), R²=0.99592, p<0.0001.

**Validation targets:** R² > 0.99, p < 0.05. If fit is weaker, check for platform or region mixing in the cohort -- mixed cohorts degrade fit.

**Forward projection from r(n) = 0.4 * n^(-0.5) example:**

| Day | Retention |
|-----|-----------|
| D1  | 40.0%     |
| D7  | 15.1%     |
| D30 | 7.3%      |
| D90 | 4.2%      |
| D180| 3.0%      |

**DAU projection from a constant daily install rate:**

DAU on day N = sum of (r(n) * installs_per_day) for all cohort ages n = 0 to N.

Example: 100 daily installs with r(n)=0.4*n^(-0.5) yields DAU on day 7 = ~260 active users (not 100 * 15.1%, because older cohorts are still active).

**LTV from retention curve:**

```
Player_Duration_to_day_N = sum of r(n) for n=0 to N
LTV_N = ARPDAU * Player_Duration_N
```

**Cohort age requirement:** The b exponent stabilises after the cohort is 90 days old. Curves fitted on D1-D7 data alone will underestimate the decay rate because the long tail is unobserved. Use D1-D7 fit as directional only; validate with D30 and D60 actuals.

**Why power law, not exponential:** An exponential model r(n) = a * e^(b*n) forces the curve to approach zero faster than observed behaviour. Real game retention has a persistent core audience (hardcore / habitual players) who remain for months or years. The power function's slower-decaying tail matches this "long tail of loyalists" better than exponential, consistently producing R² > 0.99 vs R² of 0.92-0.95 for exponential on the same data.

## Decisions / Insights

- The coefficient a directly approximates D1 retention, making it intuitive: a game with D1=30% will have a ≈ 0.28-0.32. This gives a quick sanity check when reviewing client-submitted data.
- Three data points (D1, D3, D7) are sufficient to fit the curve; adding D14 and D30 tightens the long-tail projection.
- DAU projections require summing across all active cohort ages -- the common error of applying a single retention rate to a daily install number substantially underestimates active users.
- The power model never reaches exactly zero, implying a small permanent base -- this matches the "core user" population seen in long-running live service games.

## Context

Russell Ovans, Ph.D., is a computer scientist who served as Director of Analytics at East Side Games. His book "Game Analytics: Retention and Monetization in Free-to-Play Mobile Games" (2024, ISBN 9780986941825) is the fullest treatment of this methodology. The InvestGame republication (investgame.net/news/pdf/) provides the paper version. The methodology is validated across real East Side Games datasets.

Note: the Valeev Medium article (already in bank as web_2026-05-26_retention_curve_ltv_model) covers the same underlying formula via Google Sheets. This Ovans extract adds: (1) R² validation targets and interpretation, (2) Tableau fitting path, (3) DAU projection formula, (4) the theoretical justification for power vs exponential, and (5) the 90-day cohort stability threshold.

## Applicability

**Direct NBI use:** This is the reference document for retention curve methodology. Use when clients ask "how did you build this model?" -- the Ovans/GameAnalytics provenance gives it institutional credibility. The R² validation step (run it on the client's own data) should be a standard output in any retention model deliverable.

**Minimum viable implementation:** Excel or Google Sheets, D1/D3/D7 data, LINEST function. No Python, no data science hire required.

**Limitation:** Works for mobile games with daily-active metrics. Less validated for PC/console games with weekly or monthly engagement patterns. The 90-day cohort requirement means soft-launch projections should carry explicit uncertainty bands.
