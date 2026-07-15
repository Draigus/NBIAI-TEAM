---
source: web_research
source_id: web_2026-07-15_iap-pricing-four-level-geographic-behavioral-framework
source_path: https://tomeofgrowth.com/articles/game-of-pricing-four-levels-to-improve-your-iap-revenue
ingested: 2026-07-15
topics_detected: [forecast, iap_pricing, price_elasticity, localisation, a_b_testing, ltv, monetisation, behavioural_personalisation]
relevance_score: 8
novelty_score: 6
actionability_score: 7
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# IAP Pricing Maturity: Four-Level Framework from Static to Behavioural Personalisation

## Key Content

**Source:** Tome of Growth (tomeofgrowth.com). Practitioner-authored, undated but references 2024-2025 industry context.

### The Four Levels

The framework treats IAP pricing as a maturity ladder. Teams enter at Level 1 and progress as data and revenue volume justify the added complexity.

**Level 1 — Static Pricing**
A single global price, auto-converted by the platform (App Store, Google Play) using platform FX rates. Zero configuration, but fails to account for purchasing power differences across markets. This is the baseline.

**Level 2 — Geographical Pricing**
Country-specific price adjustments based on purchasing power. The methodology uses indices (Big Mac Index for a quick snapshot, World Bank PPP for accuracy, OECD for developed markets) to derive regional price multipliers relative to a US baseline. All IAPs within a region scale by the same percentage, rounded to the nearest tier.

- Typical adjustments: T3 markets (India, Southeast Asia) 30–50% reductions from US baseline. Affluent markets (Switzerland) 10–30% increases.
- Example: $4.99 US starter pack → $2.49 India, $6.99 Switzerland.
- Revenue uplift from Level 1: 10–50% in affected countries.
- Entry threshold: $5K+ monthly IAP revenue, 1–3 months stable data, presence in 3+ countries.
- Implementation time: Days to 2 weeks. First signals: within 1 month.

**Level 3 — Value-Based Localisation (A/B Testing)**
Modified content/value per region rather than just price reductions. A starter pack in India might offer more items at the regional price rather than the same items at a lower price. Requires remote configuration capability to deliver different offer structures per market.

- Test groups: 5–10% of player base initially.
- Measurement window: D90 LTV (or adjusted to the game's typical lifecycle phase).
- Monitor whole monetisation ecosystem, not isolated offers -- a better-converting starter pack can inflate mid-tier purchases, making ROI appear larger than it is.
- Additional revenue uplift over Level 2: 10–30%.
- Entry threshold: Stable monetisation metrics, remote configuration tooling.

**Level 4 — Behavioural Personalisation**
Individual-level pricing and offer targeting based on spending history, play patterns, and LTV signals. Not segment-level -- user-level randomisation.

- Evaluate via ARPU (total revenue ÷ distinct users) over defined periods.
- Maintain consistent offer frequency initially to isolate pricing impact from exposure frequency.
- Daily model updates recommended after the validation phase.
- Revenue uplift over Level 3: 5–40% depending on complexity and baseline state.
- Entry threshold: $50K+ monthly IAP revenue, proven monetisation systems, analytics infrastructure.
- Validation timeline: Initial results 4–6 weeks; meaningful validation 3–6 months.

### Price Elasticity Measurement Approach

The framework does not use an explicit elasticity formula. Instead it targets the "sweet spot" where ARPU maximises -- the point where conversion rate rises meaningfully but ARPPU declines only gradually. If discounts are too aggressive, ARPPU declines faster than conversion increases and total revenue falls.

KPIs monitored per level:
- D7 and D30 conversion rates
- ARPPU (average revenue per paying user)
- LTV at the measurement window
- ARPU (the primary composite signal)

### Genre-Specific Uplift Ranges

| Genre | Maximum Uplift Potential |
|-------|--------------------------|
| Puzzle | 5–10% (limited monetisation variety) |
| RPG / Strategy | 20–40% (diverse progression paths) |

Strategy and RPG titles benefit more because multiple IAP categories (currency, cosmetics, progression boosters) each respond differently to price changes -- the combined uplift compounds across categories.

### Starting Point Recommendation

Begin testing with the **starter pack** (lowest tier). Rationale: players at early progression cannot accurately calculate item value, making them more price-elastic than experienced players. Starter packs carry the lowest cannibalism risk (they do not compete with whale tiers) and produce the clearest conversion signal because the payer base is larger than for mid-tier or whale packs.

## Decisions / Insights

- The level structure lets NBI calibrate advice to a client's current revenue scale. A $10K/month IAP game should be at Level 2 geographic pricing; recommending Level 4 personalisation would be premature and expensive.
- "You need to test it out in your game" is the article's core caveat. No pre-testing price prediction is reliable. NBI should frame this as a testing roadmap, not a pricing prescription.
- The D90 LTV measurement window is longer than most teams expect. Pressure to show results in 2–4 weeks will produce misleading signals for monetisation changes.
- Cross-country pricing is explicitly recommended here (Level 2) while the IAP pack design analysis (GameDeveloper.com) warns against it due to VPN arbitrage. The tension resolves by scale: Level 2 is viable when revenue is concentrated in a few markets; VPN arbitrage risk rises as the game reaches global distribution with significant iOS revenue in the US. NBI should flag this tension when advising clients.

## Context

Practitioner-authored article on a game growth advisory blog. Not a peer-reviewed study. Revenue uplift ranges are illustrative from the author's client portfolio, not a large-sample meta-analysis. Treat as directional rather than precise.

## Applicability

**Direct NBI use:** Use the four-level framework as a diagnostic and roadmap tool when advising clients on IAP pricing maturity. Match level recommendation to monthly IAP revenue threshold and analytics infrastructure.

**Minimum viable implementation:** Level 2 requires only App Store Connect / Google Play Console regional pricing configuration -- no engineering work if the game uses standard IAP. Level 3 requires remote configuration (Firebase Remote Config, Braze, or equivalent). Level 4 requires a real-time analytics pipeline and likely a personalisation vendor.

**Limitation:** Uplift ranges are client-portfolio estimates from one advisory practice. Genre-specific uplift data (5–10% for puzzle vs 20–40% for RPG/strategy) is directional. A specific client's uplift will depend on their existing pricing maturity and market mix.
