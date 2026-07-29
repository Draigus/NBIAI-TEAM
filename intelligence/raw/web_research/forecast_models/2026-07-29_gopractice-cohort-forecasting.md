---
source: web_research
source_id: web_2026-07-29_gopractice-cohort-forecasting
source_path: https://gopractice.io/product/forecasting-key-metrics-through-cohort-analysis/
ingested: 2026-07-29
topics_detected: [cohort_analysis, revenue_forecasting, ltv_modelling, payer_segmentation, forecasting_methodology]
relevance_score: 7
novelty_score: 5
actionability_score: 6
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# GoPractice Cohort-Based Revenue Forecasting: Step-by-Step Aggregation Framework

## Key Content

Cohort analysis is the foundational methodology for forecasting product metrics in subscription and freemium products. Its application to mobile game revenue forecasting requires a specific aggregation structure: model each acquisition cohort's revenue trajectory separately, then sum across cohorts to derive total product revenue projections. This approach is more accurate than applying a single ARPDAU to a DAU forecast because it preserves the age-dependency of monetisation behaviour.

### Core Principle: Revenue Is a Function of Cohort Age, Not Just Date

A naive revenue forecast multiplies projected DAU by an assumed ARPDAU. This fails because ARPDAU is not constant across the player base: day-1 users have fundamentally different spending profiles from day-90 users. If the game is growing (new cohorts arriving constantly), the mix of user ages changes, and a static ARPDAU assumption produces distorted projections.

The cohort method resolves this by tracking each cohort's revenue contribution through time since installation, rather than by calendar date. Each cohort's revenue at age T is predictable from historical cohorts at the same age.

### Step-by-Step Process

**Step 1: Define cohort grouping.**
Standard practice is monthly cohorts (all users who installed in January form one cohort). Weekly cohorts can be used for faster-moving games or when the first 90 days of data are critical for decision-making. Monthly cohorts are more stable because individual event spikes (a featured placement, a holiday promotion) are averaged across more users.

**Step 2: Build the historical cohort revenue matrix.**
For each historical cohort, calculate revenue per user in each month after installation:
- Month 1: revenue / cohort size
- Month 2: revenue / cohort size
- Month 3: revenue / cohort size
- Continue through available data

This matrix is the empirical basis for projecting future cohorts.

**Step 3: Identify the revenue-per-user retention curve.**
Plot revenue-per-user across months since installation. This curve will typically decline (following a pattern analogous to user retention decay; fewer active users generating less revenue as the cohort ages). The shape of this curve is more stable than absolute ARPU because it reflects the underlying player lifecycle rather than calendar-specific events.

**Step 4: Project new cohorts forward.**
Apply the historical revenue-per-user curve to new and future cohorts. The projection assumes that the monetisation dynamics observed in historical cohorts will apply to future cohorts with similar acquisition profiles.

Where a product change or live ops programme has materially altered monetisation, adjust the curve with a coefficient: for example, if a recent battle pass launch increased Month 1 revenue by 20%, apply a 1.2 multiplier to the Month 1 cell for cohorts acquired after launch date.

**Step 5: Model future cohort sizes separately.**
Projecting new cohort sizes requires a separate growth model (UA spend trajectory, organic growth rate, channel saturation). There is no universal approach. For NBI clients, acceptable inputs are: planned UA budget by month, assumed CPI by channel, and organic multiplier based on store ranking models.

**Step 6: Aggregate across all active cohorts.**
Total product revenue in any given month = sum of (revenue contribution from each active cohort at their respective age in that month). In formula terms:

```
Revenue(month M) = sum over all cohorts [Cohort(n) size x Revenue_per_user(age of cohort n in month M)]
```

This aggregation is the key mechanical step. It is most naturally implemented in a matrix spreadsheet: rows = acquisition cohorts, columns = calendar months, cells = cohort revenue contribution. Row totals = cohort lifetime revenue. Column totals = total product monthly revenue.

### Alternative Cohort Definition: Segment by First Purchase Date

Standard cohort analysis groups users by install date. An alternative is to group paying users by the date of their first purchase. This is particularly useful for modelling payer lifetime value specifically.

The practical value: install-date cohorts contain a mix of future payers and non-payers. The payer-date cohort strips out the non-payer noise and models the payer lifecycle directly.

For mobile games, this produces a payer cohort where:
- "Day 1" is the date of first IAP
- Revenue per user is tracked from that date
- Retention is tracked from that date (what percentage of first-time payers make a second purchase within 30 days, 90 days, etc.)

Combined with the install-date cohort analysis, this gives two complementary curves: one that forecasts total installs-to-revenue, and one that forecasts what happens to the paying user once they have converted.

### Segmentation for Improved Forecast Accuracy

Forecast accuracy improves significantly when the cohort matrix is segmented before aggregating. The article recommends segmenting when "the dynamics of the predicted metric in these segments is significantly different, or when the segments are governed by different laws."

Practical segmentation criteria for mobile games:
- Acquisition channel (organic vs paid, and by paid channel)
- Geographic tier (tier-1 markets behave differently from tier-3)
- Platform (iOS vs Android)

If a client's cohort data is too thin to segment (fewer than 200 users per segment per month), produce a single blended cohort curve but note the uncertainty from blending. The risk is that a channel shift in the acquisition mix will change the revenue trajectory in ways the blended model cannot predict.

### Handling Missing Long-Tail Data

For cohorts younger than 6 months, the historical matrix is incomplete; there is no observed data for months 7-12. Options:

**Option A: Extrapolation.** Apply a smoothed trend from months 1-6 (e.g. declining 15% per month based on historical decline rate). Produces a single point estimate with unquantified uncertainty.

**Option B: Analogous cohort reference.** Use a mature cohort with similar early-month behaviour as a template for the long-tail projection. This is the most defensible approach when similar cohorts exist.

**Option C: Bracket.** Apply two assumptions, an optimistic (flatter tail) and a pessimistic (steeper decline), and report revenue as a range. Recommended for client-facing deliverables where the uncertainty is material to the business decision.

## Decisions / Insights

- Build the cohort revenue matrix with rows as acquisition cohorts and columns as calendar months; column sums give monthly revenue; row sums give cohort LTV
- Segment cohort matrices by channel, geo, and platform before aggregating; blended matrices mask the 2-3x variation in revenue-per-user that channel and geo differences create
- Use the payer-date cohort (first purchase date as Day 1) in parallel with the install-date cohort to model payer lifecycle separately from funnel conversion
- Where cohorts are younger than the projection horizon, report as a range using optimistic (flat tail) and pessimistic (steeper decline) assumptions, not a point estimate
- Apply event or product-change coefficients to future cells when a known monetisation shift has occurred; a flat extrapolation ignores identifiable structural changes

## Context

Source is GoPractice, an online product management simulator and education platform. Content is aimed at senior product managers and growth analysts. The methodology is well-established in the subscription software and mobile app industry and is not proprietary to GoPractice. No validation study cited; this is a pedagogical framework presentation. The article is not specifically about games but the framework is directly applicable. Step-by-step structure and core aggregation formula confirmed present in source 2026-07-29.

## Applicability

This framework is the structural basis for any multi-period revenue forecast NBI produces for a client. The matrix spreadsheet approach is buildable in Excel with no specialist tooling.

Minimum viable implementation: 6-month IAP transaction export segmented by installation cohort, with monthly revenue per cohort computed. Produces a 6-column x N-cohort matrix from which the next 3-6 months can be projected using observed decline rates.

Limitation: accuracy degrades as the projection horizon extends beyond the historical cohort data available. For games younger than 6 months at pitch stage, this method degenerates to a genre benchmark exercise. Flag this limitation explicitly in client deliverables.
