---
source: web_research
source_id: web_2026-05-26_f2p_whale_economics_voltage
source_path: https://medium.com/building-the-metaverse/game-economics-part-3-free-to-play-games-78aa790d55ae
ingested: 2026-05-26
topics_detected: [forecast, revenue, whale, f2p, arpdau, live_events, monetisation, player_segmentation, currency_design]
relevance_score: 7
novelty_score: 6
actionability_score: 7
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# F2P Whale Economics and Economic Voltage Model (Jon Radoff)

## Key Content

A qualitative-to-quantitative framework for understanding F2P revenue distribution and live service event economics, based on operational data from games Radoff has run.

**Revenue distribution (power law, from real data):**
- Top 20% of players: 75% of revenue
- Top 1% of players: 24% of revenue
- Majority of players: $0 spent
- Top 10% of paying customers: ~60 sessions per day

**Key relationship:** Engagement precedes spending. "High engagement is the main precondition for players to make significant investments in the game -- not simply the result of spending." This means forecasting must model engagement first, then conversion, not the reverse.

**Optimisation hierarchy:** Retention -> Engagement -> Revenue (in that order, never reversed).

**Economic Voltage model:** Monetisation pressure ("voltage") varies over a player's lifetime. Typical pattern: early spike, gradual tapering during retention period, zero at churn. Sustainable games show extended retention periods with multiple monetisation spikes driven by live events. Event-driven ARPDAU multiplier cited as 2-3x during live events.

**ARPDAU range by game type:** Less than $0.10 to $1+ depending on genre and monetisation depth.

**Currency inflation management:** Multi-currency systems prevent devaluation. Games use dual-currency (soft earnable + hard/premium) at minimum. Advanced games deploy 10+ currency types: soft, hard, event currencies, guild currencies, social currencies, feature-specific currencies, VIP currencies.

**Scarcity as revenue driver:** Revenue depends on the gap between limited supply and demand, manifested through item drop rates, time-limited availability, progression-gated access, and artificial supply constraints.

## Decisions / Insights

- The 20/75 and 1/24 distribution ratios are critical inputs for any revenue forecast model. They mean a game's revenue forecast is fundamentally a forecast of whale acquisition and retention, not average-player monetisation.
- The 2-3x ARPDAU multiplier during live events provides a concrete basis for modelling seasonal event revenue. A game running events 30% of the time should model ~1.3-1.6x base ARPDAU as its blended rate.
- The engagement-first principle means retention metrics are leading indicators for revenue, not lagging. This supports the use of D1/D7/D30 retention as the primary inputs to revenue forecasting (validating the Valeev model approach).
- Multi-currency system design is an underappreciated revenue lever. Currency sink/source balance directly affects LTV ceiling.

## Context

Jon Radoff is CEO of Beamable (game backend platform) and previously ran multiple F2P games. This is Part 3 of a series on game economics. The article synthesises operational experience with industry data.

## Applicability

**Direct NBI use:** The revenue distribution ratios should be used as default assumptions in any F2P revenue model where client-specific data is unavailable. The event ARPDAU multiplier provides a basis for live service revenue projections.

**Client fit:** The qualitative frameworks (economic voltage, scarcity design, currency management) are directly useful in game economy design advisory. The quantitative benchmarks (20/75 whale distribution, 2-3x event multiplier) plug into the Tenjin unit economics model as assumption inputs.

**Limitation:** The specific ratios come from Radoff's games, which may not be representative of all genres. They should be treated as starting assumptions, not universal constants.
