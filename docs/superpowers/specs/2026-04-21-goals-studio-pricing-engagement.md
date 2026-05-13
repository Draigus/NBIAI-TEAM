# Goals Studio Pricing Engagement - Project Spec

**Client:** Goals Studio (GOALS AB), Stockholm
**Contact:** Jonas Rundberg (primary), Julius (Live Ops)
**Contract:** SOW #1, 100,000 SEK (~$10K USD)
**Period:** ~2 weeks from contract landing (~14 April 2026)
**Deadline:** Written summary delivered by ~27 April 2026 (platform submission deadline drives this)
**NBI Team:** Glen Pryer (relationship), Tom Rieger (contract), Devin Rieger (research support)

---

## Context

Goals Studio is a F2P football game launching 14 May 2026 on Steam, Epic, Xbox, PlayStation (no Switch/mobile at launch; mobile planned 2027). The game features unique generated players (not licensed), RPG progression, aging/retirement sinks, and an 80/20 skill-to-purchased-advantage ratio. They are explicitly non-P2W and non-seasonal.

**Beta performance:** 400K total players across 3 playtests, 34% D1 retention on PS5 (per Town Hall data; original claim was 50%, pending Jonas verification), 220K installs in March beta, NPS +24.6, CPI reduced to $0.43.

**Monetisation is unproven.** No real-money transactions occurred during betas (server wipes made it pointless). The economy design exists on paper but has never been validated commercially.

**Jonas's core concern:** They may be pricing too low. It is extremely difficult to raise prices post-launch (especially on console platforms). An external sanity check is needed before platform submission.

**Hard constraint:** PlayStation and Xbox require ~9 days for pricing review + buffer for feedback. Pricing must be submitted ~18 days before May 14 launch. This means NBI's recommendations need to land by end of April at the absolute latest.

---

## SOW Scope (Contracted)

From SOW #1 (8 April 2026):

> **Objective:** Provide insight into Client's regional pricing strategy based on competitive benchmarks and analysis.
>
> **Services:**
> 1. Review competitive pricing positioning in the sports and football game space, covering price point selection, currency pack structure, and initial conversion rate guidance for base and regional pricing
> 2. Conduct an assessment of current pricing plans against market norms, with recommendations on adjustments and areas of risk
>
> **Deliverable:** Written summary consolidating findings and recommendations and review of results with Client, to be conducted remotely.

---

## What Goals Studio Has Already Produced Internally

- **GOALS Pricing Matrix:** 40+ countries across Steam/Xbox/PS/Epic with current proposed pricing for all 7 HC SKUs
- **Pricing Model:** Revenue model with 3 personas, competitive HC comparison across 7 games, 4 discount-tier proposals, regional pricing proposals
- **Player Pricing:** Tier values, upgrade costs, discard values, marketplace ranges
- **Game Design Docs:** Full economy architecture (GG-Monetization), player attributes, XP system, ranked rewards, knockout mode, leaderboards
- **Beta Data:** Community sentiment report, LiveOps setup results, Town Hall metrics

---

## Competitive Set

**Primary (sports/football - direct competitors):**
- EA FC 26 (the dominant incumbent; their pricing is the industry anchor)
- eFootball (F2P football; closest business model comparison)

**Secondary (F2P competitive games - audience overlap):**
- Fortnite (Jonas mentioned their audience will overlap)
- Apex Legends (mentioned in kickoff call by Glen)
- Rocket League (Jonas mentioned as comparable)
- League of Legends (long-running F2P with mature HC economy)
- The Finals (newer F2P shooter with similar cosmetic model)
- Overwatch 2 (F2P transition, relevant pricing data)

**Weighting:** EA FC and eFootball get deepest analysis (direct genre). Others inform the range and validate positioning.

---

## Feature Breakdown

### Feature 1: Competitive HC Pricing Benchmark

Validate Goals' 7 HC SKUs against market. Answer: "Are we priced right relative to competitors?"

**Stories:**
- 1.1: Competitive set data gathering and validation
- 1.2: Base USD price point comparison (tier-by-tier)
- 1.3: Discount curve and bonus mechanics analysis
- 1.4: SKU structure audit (tier count, gaps, anchoring, value progression)
- 1.5: Platform fee impact on net revenue per SKU

### Feature 2: Regional Pricing Strategy

Validate Goals' regional pricing matrix. Answer: "Are we priced correctly in each country/platform?"

**Stories:**
- 2.1: FX rate vs actual pricing gap analysis
- 2.2: PPP and local purchasing power assessment
- 2.3: Competitor regional pricing comparison (what do EA FC/Fortnite/etc charge in same regions?)
- 2.4: Platform-specific pricing constraints (Steam suggested, PS/Xbox tier rules, Epic approach)
- 2.5: Country-by-country risk and opportunity map

### Feature 3: Risk Assessment and Recommendations

Synthesise findings into actionable guidance. Answer Jonas's question: "Are we too low?"

**Stories:**
- 3.1: Pricing ladder health check (gaps, clustering, value progression)
- 3.2: Price anchoring and psychological pricing assessment
- 3.3: "Too low?" analysis with evidence (compare Goals' effective USD/HC against market median)
- 3.4: Risk register (regulatory, sentiment, revenue leakage, platform rejection)
- 3.5: Top 5 specific adjustment recommendations with expected impact

### Feature 4: Reusable Pricing Framework (Value-Add)

Deliver a tool that outlasts the engagement. This is what earns Phase 2.

**Stories:**
- 4.1: Base-to-regional conversion methodology (reusable formula/rules Goals can apply to future SKUs)
- 4.2: Price point decision framework (how to evaluate new SKU pricing using competitive position + platform norms + PPP)
- 4.3: Phase 2 scoping (what deeper work NBI could do: live telemetry-driven elasticity, A/B test design, store optimisation)

### Feature 5: Deliverable Assembly and Client Review

Package everything for Jonas/Julius.

**Stories:**
- 5.1: Written summary consolidation
- 5.2: Executive summary (1-page, decision-ready)
- 5.3: Supporting data appendix (tables, competitor comparisons)
- 5.4: Remote review session preparation and delivery

---

## Platforms Covered

| Platform | Regional Pricing Approach | Fee Structure |
|----------|--------------------------|---------------|
| Steam | Suggested regional pricing (flexible, developer can override) | 20-30% sliding scale |
| Epic Games Store | Regional pricing similar to Steam | 12% flat |
| PlayStation | Fixed tier system, less flexible mid-stream | 30% |
| Xbox | Fixed tier system, similar to PlayStation | 30% |

---

## Key Markets (from kickoff call)

**Primary (targeted marketing):** US, Mexico, Latin America (Brazil focus), Western Europe (UK, France, Germany, Spain, Italy, Portugal, Turkey, Poland, Scandinavia)

**Secondary (global launch, no targeted marketing):** Japan, Korea, China (localised but not marketed)

**From Beta community data (top communicating countries):** UK, France, US, Italy, Turkey, Brazil, Germany, Poland, Portugal, Spain

---

## Launch Pricing Philosophy (from kickoff call)

- Start slightly high, patch down if needed (never raise post-launch)
- Non-P2W: game is ~80% skill, 20% purchased advantage
- Contiguous revenue flow, not burst-and-dead-fall
- Gradual monetisation maturation alongside audience
- World Cup (June 2026) is the first major monetisation peak
- No battle pass or seasonal resets

---

## Success Criteria

1. Jonas and Julius can confidently submit pricing to PS/Xbox certification knowing it's been externally validated
2. Every recommendation includes specific numbers (not "consider raising prices" but "SKU 3 should be $X based on Y")
3. The risk register identifies at least 3 specific countries/regions where current pricing creates material risk
4. The reusable framework is simple enough that Julius can apply it to future SKUs without NBI
5. The deliverable positions NBI for the larger engagement (WS1 full scope + WS2 live service consulting)

---

## Estimation Guidance

**Budget:** 100,000 SEK (~$10K USD)
**Target value delivery:** $15-20K (the framework is the value multiplier)
**Timeline:** ~5 working days (Tuesday 22 April to Sunday 27 April)
**Constraint:** Must be done before Goals needs to submit to platform certification

---

## Data Inputs Available

| Source | Status | Location |
|--------|--------|----------|
| Goals Pricing Matrix (40+ countries) | In hand | Clients/Goals/goals_pricing_matrix.md |
| Pricing Model (competitive analysis) | In hand | Clients/Goals/pricing_model_fresh.md |
| Player Pricing (tier values) | In hand | Clients/Goals/player_pricing.md |
| GG-Monetization (economy design) | In hand | Clients/Goals/gg-monetization.md |
| Beta Community Sentiment | In hand | Clients/Goals/beta_community_sentiment_fresh.md |
| Release LiveOps roadmap | In hand | Clients/Goals/release_liveops_fresh.md |
| Beta LiveOps setup | In hand | Clients/Goals/beta_liveops_fresh.md |
| Town Hall metrics (beta KPIs) | In hand | Clients/Goals/town_hall_260326.md |
| Game design docs (7 PDFs) | In hand | Clients/Goals/gg-*.md |
| SOW | In hand | Clients/Goals/sow_proposal.md |
| Session telemetry / ARPU model | Requested from Julius | Pending |
| Systems walkthrough with designer | Offered, may not happen given timeline | Pending |

---

## Out of Scope

- Store UX/layout recommendations (Julius handling internally)
- Live ops cadence design (Julius handling internally)
- Deep economy architecture changes
- A/B test implementation
- Post-launch telemetry analysis
- Mobile/Switch pricing (not launching on those platforms)
