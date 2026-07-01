---
source: web_research
source_id: web_2026-07-01_solar-engine-first-purchase-conversion-funnel
source_path: https://blog.solar-engine.com/en-blog/docs/From-Player-to-Payer-The-Guide-to-Cracking-FirstPurchase-Conversion-in-Mobile-Games
ingested: 2026-07-01
topics_detected: [forecast, iap, first_purchase, payer_conversion, retention_lift, monetisation, funnel, benchmarks]
relevance_score: 7
novelty_score: 6
actionability_score: 7
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# First-Purchase Conversion Funnel: Benchmarks and Friction Points

## Key Content

**Source:** Solar Engine Blog. Published, last modified 2026-03-05. No named author.
**Caveat:** Solar Engine is a mobile analytics platform vendor. Numbers may reflect their client base rather than industry-wide data. Treat benchmarks as indicative rather than canonical.

### Conversion Rate Benchmarks

| Performance Tier | First-Purchase Conversion Rate |
|-----------------|-------------------------------|
| Typical mobile game | 2-5% |
| Top performer | 5-8% |

A case study in the article improved from 3.2% to 5.8% through offer timing and checkout optimisation -- consistent with these benchmarks.

### The Reach Problem: 55% Never See an Offer

The most actionable single statistic: **approximately 55% of users never see an IAP offer at all**, primarily due to tutorial-skipping behaviour and mistimed offer triggers. This means first-purchase conversion rate is a compound metric:

```
Observed conversion = Reach rate × Click-through rate × Purchase completion rate
```

A game at 3% observed conversion with 45% reach is performing at 6.7% among users who actually see offers. Understanding which component of the funnel is broken determines the correct intervention.

### Friction Points With Specific Measurements

Three measured friction points in the purchase funnel:

1. **Price hesitation:** 68% of users who viewed an IAP item did not purchase. The item was examined but value perception was insufficient to close.
2. **Payment abandonment:** 43% of users who initiated checkout abandoned before completing payment. This is a UX/checkout friction issue, not a pricing issue.
3. **Offer timing:** Optimal IAP trigger moments are difficulty obstacles, resource depletion, and meaningful progression milestones -- not tutorial completion or fixed time intervals.

### First-Purchaser Retention Premium

**First purchasers show 2-3x higher Day-7 and Day-30 retention than non-payers.**

This is both a selection effect (committed players are more likely to pay) and a causal effect (the payment act creates psychological investment). The practical implication: getting a player to make any first purchase, even a $0.99 starter pack, materially improves their predicted retention and LTV.

For payer LTV modelling: payer cohorts should be modelled separately from non-payer cohorts. Blending them understates payer LTV and overstates non-payer contribution.

### Case Study Metrics (Card Game)

| Optimisation Element | Before | After | Delta |
|---------------------|--------|-------|-------|
| Offer exposure rate | 40% | 80% | +100% reach |
| First-purchase conversion | 3.2% | 5.8% | +81% |
| Price point | ¥30 | ¥6 | reduced |
| Post-purchase ARPPU | baseline | +40% | higher per-payer revenue |
| Day-2 retention | baseline | +15pp | quality signal |

The price reduction from ¥30 to ¥6 increased total payer count while the ARPPU increase (from subsequent purchases) compensated for the lower entry price. This is consistent with the "starter pack to whale pipeline" model.

## Decisions / Insights

- The 55% reach gap is the highest-leverage intervention point for most games before any pricing optimisation. If half the audience never sees an offer, conversion rate improvements to the existing funnel are operating on 45% of the potential base.
- Separating price hesitation (68% view-to-pass rate) from payment abandonment (43% checkout abandonment) directs the fix: price hesitation requires value communication or price testing; payment abandonment requires checkout simplification (fewer steps, Apple Pay / Google Pay, save payment method).
- The 2-3x retention premium for first purchasers means that the IAP first-purchase problem is also a retention problem. Solving first-purchase conversion improves D7/D30 retention in the same cohort.
- For NBI modelling: when building a payer LTV estimate, use separate retention curves for payer and non-payer cohorts. The blended LTV will understate payer contribution, leading to under-investment in payer-segment features.

## Context

Solar Engine is an analytics platform focused on mobile game monetisation. Their client base skews towards casual and mid-casual games in Asian markets (the case study uses JPY pricing). The benchmarks may not fully represent Western or midcore game audiences.

The 2-3x retention premium for first purchasers is consistent with what other practitioners report (devtodev, GameAnalytics) and is the most reliable finding here.

## Applicability

**Direct NBI use:** Use the reach-rate framework (55% never see offers) as a diagnostic question when reviewing client monetisation. Ask: what is your offer exposure rate? If below 70%, the conversion rate problem is upstream of pricing.

**Minimum viable implementation:** Any analytics platform can report "percentage of DAU who saw an IAP prompt" vs "percentage who purchased." If the client's platform does not track offer exposure separately from purchases, that is the first instrumentation gap to fix.

**Limitation:** Vendor-generated benchmarks. The 55% reach figure and specific friction percentages (68%, 43%) are from Solar Engine's client base and are not independently published. Use as directional guidance, not hard targets.
