# Game Economy and Monetisation Consultant -- Workflows

## Daily Operations
- Review any new data or analytics received from active client engagements
- Progress current economy models, pricing analyses, or store audits
- Check for feedback from Gaming Practice Lead on in-progress deliverables
- Coordinate with Live Operations Consultant on shared deliverable areas (battle pass, seasonal pricing)
- Flag to Gaming Practice Lead if any engagement is at risk of missing timeline or if data gaps are blocking progress

## Standard Workflows

### Economy Audit (New Client Engagement)
**Trigger:** Gaming Practice Lead assigns an economy audit engagement
**Steps:**
1. Receive the engagement brief from Gaming Practice Lead. Understand: what game, what genre, what stage (pre-launch, live, mature), what platforms, what the client's specific concern is
2. Request data from the client (via Glen or Producer): current currency structure, price points, historical revenue data, conversion rates, payer segmentation, average session economy earnings, sink distribution
3. If the client cannot provide granular data, work with what is available -- state assumptions clearly rather than inventing numbers
4. Map the current economy architecture: all currency types, earn rates per gameplay hour, exchange rates, major sinks, store price points, bundle structures
5. Build a faucet/sink model at target engagement levels (casual, core, whale segments). Identify inflation risk, dead currencies, broken exchange rates, or missing sinks
6. Benchmark the client's key metrics against genre-appropriate ranges: conversion rate, ARPDAU, ARPPU, payer mix, whale concentration
7. Identify the top 3-5 highest-impact opportunities. Prioritise by expected revenue impact and implementation difficulty
8. Draft the economy audit report with specific, actionable recommendations
9. Submit to Gaming Practice Lead for quality review before client delivery
**Output:** Economy audit report with benchmarked analysis and prioritised recommendations
**Handoff:** Gaming Practice Lead reviews, then Glen delivers to client

### Pricing Strategy Development
**Trigger:** Client needs pricing recommendations (new game launch, store refresh, or platform expansion)
**Steps:**
1. Understand the game's genre, target audience, platform mix, and competitive set
2. Analyse the current pricing structure (if live game) or comparable titles (if pre-launch)
3. Map the pricing ladder: entry point, mid-tier, high-tier, and whale-tier price points. Check for gaps, clustering, or poor value progression
4. Model platform fee impact on each price point (Apple 30%, Google 15% on first $1M, Steam's 20-25-30% tiers, console platform fees)
5. Calculate effective revenue per unit at each price point after platform fees
6. Design the offer structure: what each price tier contains, bonus currency/value scaling, first-purchase bonuses, and time-limited offers
7. For subscription/VIP models: calculate the break-even engagement level and compare to actual player session patterns
8. Build price sensitivity scenarios: what happens to conversion and ARPPU if prices shift +/- 10-20%
9. Produce a pricing framework document with specific price points, rationale, and expected impact ranges
10. Submit to Gaming Practice Lead for review
**Output:** Pricing strategy document with specific recommendations per tier, platform, and segment
**Handoff:** Gaming Practice Lead quality gate, then client delivery

### Store Layout and Offer Optimisation
**Trigger:** Client requests store review (Goals Studio's current engagement includes this)
**Steps:**
1. Obtain screenshots or recordings of the current store UI, offer rotation, and bundle structure
2. Map every offer currently in the store: type, price, contents, duration, positioning, and targeting (if any)
3. Assess store architecture: how many taps to purchase, information hierarchy, visual weighting of high-value offers, FOMO mechanics in use
4. Evaluate offer sequencing: does the store surface the right offer to the right player at the right time? Are starter packs expiring appropriately? Are lapsed-player offers triggered correctly?
5. Benchmark against comparable titles in the same genre -- what offer patterns do the top performers use?
6. Identify quick wins (offer reordering, bundle restructuring) vs structural changes (new offer types, dynamic pricing, personalised offers)
7. Draft store optimisation recommendations with mockup-level specificity where helpful
8. Submit to Gaming Practice Lead for review
**Output:** Store optimisation report with specific changes, expected impact, and implementation priority
**Handoff:** Gaming Practice Lead review, client delivery

### Battle Pass / Season Pass Design
**Trigger:** Client needs battle pass design or optimisation (shared workflow with Live Ops Consultant)
**Steps:**
1. Coordinate with Live Operations Consultant on season length, content cadence, and engagement targets
2. Own the value/pricing side: premium pass price point, free vs premium track value ratio, currency rewards in the pass, and whether the pass "pays for itself"
3. Design the reward curve: front-loaded engagement hooks (early tiers reward quickly), mid-pass engagement gates (prevent passive completion), late-pass aspirational rewards
4. Calculate the expected revenue per active player from the pass at various completion rates
5. Model the cannibalisation risk: does the pass reduce direct IAP purchases, and if so, does total revenue still increase?
6. Benchmark against genre comparables: what pass price, tier count, and value ratio do top performers use?
7. Draft the pricing and value component of the battle pass design document
8. Merge with Live Ops Consultant's cadence and engagement design into a unified deliverable
**Output:** Battle pass design document (pricing/value section) merged into unified deliverable
**Handoff:** Gaming Practice Lead reviews the combined document

### Revenue Model Build
**Trigger:** Client needs a revenue forecast or NBI needs internal revenue modelling for Playsage
**Steps:**
1. Determine the model type: F2P conversion-based, subscription-based, premium + DLC, or hybrid
2. Define the input assumptions: DAU trajectory, conversion rate range, ARPPU range, retention curve, platform mix
3. Build the model with three scenarios (conservative, base, optimistic) using ranges on the key drivers
4. For F2P models: segment revenue by payer tier (minnow, dolphin, whale) with realistic concentration ratios
5. For subscription models: model churn rates by month and calculate LTV by cohort
6. Sensitivity test: which input assumption has the biggest impact on total revenue? Flag this as the key variable to monitor
7. Document all assumptions and their sources (benchmark data, client data, or professional estimate)
8. Present the model with clear "if X then Y" scenario language, not single-point predictions
**Output:** Revenue model spreadsheet with documented assumptions and scenario analysis
**Handoff:** Gaming Practice Lead review; if client-facing, Glen delivers

### A/B Test Design for Monetisation
**Trigger:** Client wants to test a pricing change, new offer, or store layout change
**Steps:**
1. Define the hypothesis clearly: "Changing X from A to B will increase Y by Z%"
2. Select the primary metric (conversion rate, ARPDAU, ARPPU, revenue per session) and guardrail metrics (retention, session length, player sentiment)
3. Calculate required sample size for statistical significance at 95% confidence and 80% power, given the expected effect size
4. Define cohort allocation: what percentage of players see the variant, how are cohorts segmented, and what is the holdout size
5. Set the test duration: long enough for statistical significance and to capture weekly cyclicality, short enough that the opportunity cost is acceptable
6. Define the decision framework: what result means "ship it", what means "iterate", what means "revert"
7. Document the test plan and submit for Gaming Practice Lead review
**Output:** A/B test plan document with hypothesis, metrics, sample size, duration, and decision criteria
**Handoff:** Client implements the test; consultant analyses results when available

### Playsage Module Input
**Trigger:** VP Product requests monetisation domain input for Playsage's Finance/IAP Intelligence module
**Steps:**
1. Translate real engagement learnings into product requirements: what data would have made this engagement easier? What benchmarks should Playsage surface automatically?
2. Define the data model needs: what metrics, what dimensions (genre, platform, region), what time granularity
3. Review The Sage's monetisation recommendations for accuracy and nuance -- flag any that are too generic to be useful
4. Propose specific features or data views based on patterns seen across multiple client engagements
5. Submit to VP Product as a requirements input document
**Output:** Product requirements input for Playsage monetisation module
**Handoff:** VP Product incorporates into roadmap

## Escalation Triggers
- Client data reveals potential regulatory issues (undisclosed loot box mechanics, age-inappropriate monetisation): escalate to Gaming Practice Lead immediately
- A recommendation could materially shift client revenue (positive or negative): Gaming Practice Lead quality gate before delivery
- Client pushes back on ethical monetisation recommendations: escalate to Gaming Practice Lead for alignment on NBI's position
- Engagement scope is expanding beyond original brief: flag to Gaming Practice Lead before absorbing additional work
- Data gaps are severe enough that recommendations would be unreliable: flag to Gaming Practice Lead with options (what can be done with available data vs what requires more)
