---
source: web_research
source_id: web_2026-07-15_iap-pack-six-tier-price-ladder-gift-ratio
source_path: https://www.gamedeveloper.com/business/iap-packs-in-mobile-f2p-analysis-and-design
ingested: 2026-07-15
topics_detected: [forecast, iap_pricing, price_ladder, gift_ratio, whale_economics, pack_design, monetisation, f2p]
relevance_score: 8
novelty_score: 7
actionability_score: 7
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# IAP Pack Design: Six-Tier Price Ladder, Gift Ratio Formula, and Cannibalism Risk

## Key Content

**Source:** JBDev, via Game Developer (gamedeveloper.com). Practitioner-authored design analysis. No date specified; content is consistent with post-2020 F2P standards.

### The Six-Pack Standard

Industry standard IAP pack structure uses six price tiers. Six is "a low enough number to be manageable by players, but still allows meaningful choices and comparison between prices." Fewer tiers reduce revenue ceiling; more tiers introduce decision paralysis.

### Three Revenue-Driving Tiers

Of the six packs, only three generate the bulk of revenue:

**Tier 1 — Lowest ($0.99–$2.99)**
- Highest transaction volume, lowest revenue per transaction.
- Primary function: conversion point (first IAP purchase) or decoy (makes mid-tier appear better value).
- Should NOT be the top revenue generator -- if it is, the mid-tier and whale tiers are structurally broken.
- Casual/arcade games use price points closer to the low end; strategy games tolerate higher entry points.
- **Conversion insight:** Starter packs at this tier should offer the minimum viable currency bundle to enable meaningful progression -- enough to feel impactful, not enough to remove the need for follow-on purchases.

**Tier 2 — Mid-tier ($9.99–$19.99)**
- Targets dolphins (moderate spenders) and ascending minnows.
- Most effective for **reconversion** (getting a player who has already made one purchase to make another) rather than initial conversion.
- Balances perceived value with purchase frequency -- players in this tier buy 1–3 times per month.

**Tier 3 — Highest ($79.99–$99.99)**
- Exclusive whale purchases. $99.99 is the most common ceiling.
- Typically the **top revenue generator by total IAP revenue**, despite the smallest volume.
- Must offer steepest effective discount (highest gift ratio) to justify the outlay.

### Gift Ratio Formula

Gift ratio = bonus currency given beyond base amount. It is the primary mechanism for communicating value across tiers without changing nominal price.

**Standard structure:**
| Tier | Nominal Price | Gift Ratio |
|------|---------------|------------|
| Lowest | $0.99–$2.99 | 0% (baseline) |
| Mid-tier | $9.99–$19.99 | 20–40% |
| Highest | $79.99–$99.99 | 50–100%+ |

The increment between consecutive tiers reveals the monetisation philosophy. An aggressive gift ratio step (e.g., 0% at lowest, 100% at highest with small middle steps) signals whale-focused monetisation. A smoother curve signals a broader-payer strategy.

**Worked example:** A game sells 100 gems at $0.99 (baseline). The mid-tier pack at $9.99 should offer 1,200–1,400 gems (20–40% gift ratio applied to a 10x multiplier). The whale pack at $99.99 should offer 15,000–20,000 gems (50–100%+ gift ratio applied to a 100x multiplier). A player calculating per-gem value immediately sees the whale pack is 5–7x cheaper per gem.

### Psychological Pricing (Secondary Factors)

The article explicitly positions these as **secondary** to the game being enjoyable. Payers buy because they love the game, not because of psychological tricks.

- **Anchoring:** High-priced pack shown first to make mid-tier appear reasonable.
- **Decoys:** One pack intentionally poor value to push players toward the "correct" choice.
- **Loss aversion:** Time-limited offers ("72 hours only") to accelerate decision.
- **Visual stress:** Red/saturated colours, data density on offer screens -- creates perceived urgency.

These techniques improve conversion margin but cannot rescue an under-enjoyed game.

### Cannibalism and Cross-Segment Risks

**Cross-country pricing risk:** Players in high-income markets can use VPNs to purchase at T3 market prices. Revenue loss from high-spenders taking the cheaper price outweighs conversion gains from T3 market expansion. The article recommends **against cross-country price differentiation** for this reason.

**User-segmented pricing risk:** Offering lower prices to lower-spending players, if detected by the community, is perceived as penalising engaged players. Alternative: preset offers (e.g., a "welcome back" pack) that target lower spenders without revealing the differential.

### Three-Step Testing Framework

1. **Replicate competitors:** Start with price ladder shaped like a successful comparable game. Minimises risk while establishing a baseline.
2. **Benchmark via player feedback and competitor analysis:** Direct player surveys and competitor teardowns to understand perceived value gaps.
3. **Iterate via A/B testing with new cohorts:** Each experiment requires sufficient cohort size; new-user cohorts require longer to validate than re-engagement tests.

**Operational constraints:** Testing IAP pack pricing requires new-user cohorts because existing players have already anchored on current prices. This means slow iteration -- a pack change test takes weeks to months to produce LTV-meaningful data.

## Decisions / Insights

- The six-pack structure with 0%/20-40%/50-100%+ gift ratios gives NBI a reference ladder to evaluate client IAP setups. If a client's highest-tier pack offers less than 50% gift ratio, it will underperform -- whales compare per-unit cost across packs precisely.
- The "lowest tier should NOT be top revenue generator" rule is a diagnostic signal. If a client's $0.99 pack generates more total revenue than their $9.99 pack, either conversion is broken at mid-tier or the lowest pack is not functioning as a conversion tool.
- The cannibalism warning directly contradicts the Tome of Growth four-level framework recommendation for geographic pricing. The resolution: geographic pricing (Level 2) works at early scale when the player base is small and VPN arbitrage risk is low; the risk grows with scale and iOS revenue concentration. Flag this to clients above $50K/month IAP.
- Gift ratio analysis of competitor IAP packs is a free competitive intelligence technique. Any team with screenshot access to competitor IAP screens can reconstruct their gift ratio structure and infer their monetisation philosophy.

## Context

Practitioner design analysis published on Game Developer. No sample size disclosed. Framework is consistent with industry teardowns and practitioner consensus (Deconstructor of Fun, GameAnalytics). The VPN arbitrage risk point is a known industry problem with documented cases in strategy and RPG games.

## Applicability

**Direct NBI use:** Use the gift ratio table and six-tier structure as a starting diagnostic when advising clients on IAP pack design. Use the three-step testing framework to scope IAP optimisation work.

**Minimum viable implementation:** Competitor pack teardown and gift ratio calculation requires only screenshots and arithmetic. No analytics platform needed. Pack restructuring requires backend configuration.

**Limitation:** Price ranges ($0.99–$2.99 lowest, $79.99–$99.99 highest) are industry norms for mobile but differ for PC games (Steam IAPs are typically lower ceiling), console (platform-specific), and cross-platform games. Apply to mobile F2P specifically.
