# Goals Studio Pricing Engagement — Implementation Plan (v2)

> **For agentic workers:** This is a consulting delivery plan. Tasks are analytical/research work executed by a human team (with AI support). Use this plan to track progress in the NBI Hub.

**Goal:** Deliver a written pricing summary with competitive benchmarks, regional recommendations, and risk assessment for Goals Studio's May 14 launch — within 5 working days.

**Architecture:** Foundation (map HC economy) → Competitive benchmark (where Goals sits vs market) → Regional analysis (country-by-country) → Synthesis (recommendations + scenarios) → Deliverable (written summary + review call)

**Budget:** 100,000 SEK (~$10K USD) | ~116 billable hours | 8-10 working days (or 5 days with significant AI research support)

**Framing principle:** Goals' internal team (Jonas, Julius) are competent. They built a 40-country matrix with PPP columns, FX deviations, and competitive data across 7 games. NBI's value is NOT re-doing their work. NBI's value is: (a) independent external validation that gives them confidence to submit to platforms, (b) insights their internal position prevents them from seeing (competitive context, market norm deviations, pricing psychology), and (c) specific recommendations with modelled impact ranges they cannot produce without genre benchmarks.

---

## Hour Budget Allocation

| Feature | Hours | % of Budget |
|---------|-------|-------------|
| F1: Competitive HC Pricing Benchmark | 38h | 33% |
| F2: Regional Pricing Strategy | 34h | 29% |
| F3: Risk Assessment, Scenarios & Recommendations | 16h | 14% |
| F4: Value-Add (Framework + World Cup) | 8h | 7% |
| F5: Deliverable Assembly & Client Review | 18h | 16% |
| **Total** | **~116h** | **100%** |

**Team allocation:**
- Glen (~45h): Strategic synthesis, scenario modelling, final deliverable authoring, quality review, client call
- Devin (~50h): Competitive store research, country categorisation, regional pricing data gathering, data verification
- Tom (~20h): Commercial positioning, internal review, Phase 2 framing, contract/legal check

**Buffer strategy:** Feature 4 is conditional — only delivered if F1-3 complete cleanly. If any feature runs over, F4 scope is reduced first. Core contracted deliverable (F1-3 + F5) totals ~106h.

**Budget implication:** 116h exceeds the original 50h estimate by 2.3x. At the contracted 100,000 SEK, the effective rate drops significantly. Options: (a) AI handles Devin's research workload to bring calendar time to 5 days, (b) negotiate timeline extension with Goals, (c) reduce scope of Feature 2 regional coverage to top 10 markets only. Decision required before Day 1.

---

## Feature 1: Competitive HC Pricing Benchmark

**Objective:** Show Goals where they sit relative to the sports/football F2P market. Extend their existing competitive analysis with insights their internal position doesn't give them.

**What NBI adds that Goals can't do internally:** Independent cross-genre validation, pricing psychology assessment, conversion rate benchmarks derived from primary research of comparable live titles, and the confidence that an external expert agrees (or disagrees) with their conclusions.

---

### Story 1.0: Foundation — Map the HC Economy

**Purpose:** Before comparing prices, establish exactly what Goals' HC buys and what the player value chain looks like. This is the prerequisite for everything else.

---

#### Task 1.0.1: Map HC → Value Chain

**What:** Document the complete path from real money to in-game value in Goals.

**How:**
1. From GG-Monetization and the Pricing Model data, establish:
   - **Hard Currency (Coins):** Purchased with real money only. Used for: kits, celebrations, and as an accelerator to soft currency (buy players → discard → get points)
   - **Soft Currency (Points):** Earned through gameplay. Used for: player packs, upgrades, legend conversions, marketplace
   - **Conversion:** 25,000 points = 500 coins = $6.00 USD (from Pricing Model, Sheet: Conversion rates)
   - Therefore: 1 HC coin = 50 points = $0.012 USD at base rate
2. Map what each HC tier ACTUALLY buys:
   - Source for item pricing: Goals' Content Plan (Pricing Model spreadsheet) shows Internal Kits at 16,625 points ($3.99), Partnership Kits at 29,125 points ($6.99), Celebrations at 29,167 points ($7.00)
   - Convert to HC: Internal Kit = 16,625 / 50 = ~333 coins. Partnership Kit = 29,125 / 50 = ~583 coins. Celebration = 29,167 / 50 = ~583 coins.
   - 380 HC ($5.99): buys 1 Internal Kit (333 coins) with 47 coins left over. Nothing else affordable.
   - 650 HC ($9.99): buys 1 Internal Kit (333 coins) + remainder of 317 coins (not enough for a second kit or celebration)
   - **GAP: Mech and Pulse kit HC pricing is NOT documented in any client material.** The beta sold these for soft currency only. Their HC pricing at launch needs to be confirmed with Julius.
3. Map item categories and their HC costs (from Pricing Model Content Plan):
   - Internal Kits: ~333 HC (source: 16,625 pts / 50)
   - Partnership Kits: ~583 HC (source: 29,125 pts / 50)
   - Celebrations: ~583 HC (source: 29,167 pts / 50)
   - Player packs (via HC → points): varies by tier — see Standard Packs in Pricing Model
   - **UNRESOLVED:** Specific HC prices for Mech, Pulse, National kit categories. These tiers appear in beta community data but without confirmed launch pricing.
4. Key finding: Document the "minimum meaningful purchase" — what's the cheapest satisfying thing a new player can buy with HC? Currently the entry tier (380 HC / $5.99) buys exactly 1 Internal Kit with minimal leftover. This is a tight fit — any price increase at the entry tier could push the cheapest item out of reach.

**Done when:** Complete HC value chain documented. Every store item category mapped to HC cost with documented source. Gaps flagged for Julius. "Minimum meaningful purchase" identified and costed.

**Estimated hours:** 3h

---

#### Task 1.0.2: Establish Payer Persona Benchmarks

**What:** Using Goals' 3-persona model (from their Pricing Model) and industry benchmarks, establish what healthy conversion and ARPPU look like for this game.

**How:**
1. Goals' personas (from their Pricing Model, Sheet: Overview):
   - Persona 1 (Core FUT — every day): 20% of players, 30% pay, ARPPU $46
   - Persona 2 (Dedicated — 2-3x/week): 35% of players, 10% pay, ARPPU $15.81
   - Persona 3 (Casual — few times/month): 45% of players, 2% pay, ARPPU $7.24
   - Overall payer rate: 10.4% | Overall ARPU: $3.38 | Overall ARPPU: $32.48
2. Benchmark these against verifiable sources:
   - **Research method:** Pull published conversion and ARPPU data from:
     - eFootball public earnings (Konami quarterly reports disclose mobile/console revenue and DAU — derive ARPPU)
     - EA FC 25/26 public filings (EA quarterly earnings disclose Ultimate Team revenue and player counts)
     - Sensor Tower / data.ai reports on F2P sports category (if accessible)
     - GDC talks with published benchmarks (search for F2P monetisation presentations with cited data)
   - **What we're comparing:** Goals' 10.4% payer rate against actual published data from comparable titles — NOT against vague "industry norms"
   - **NOTE:** Goals' own Pricing Model (Sheet: Context) includes a "Gemini deep research check" with alternate figures: Persona 1 paying 30% with ARPPU $25-$40, Persona 2 paying 15% with ARPPU $10-$15, Persona 3 paying 3% with ARPPU $5-$10. These are lower than Goals' model assumes. Source of Gemini figures needs to be verified.
3. Assess: Is Goals' 10.4% overall payer rate realistic for launch? Compare against the published data gathered above. If published F2P sports payer rates are materially lower, Goals' revenue model overstates early revenue and the pricing strategy needs to account for a slower conversion ramp.
4. **Critical question:** Is 10.4% a month-1 assumption or a steady-state target? The plan and revenue model don't specify the timeframe. If it's steady-state applied to month 1, the model overstates early revenue. This needs clarification from Jonas/Julius.
5. **Seasonless economy implication:** Goals has no seasonal resets, no battle pass, no FOMO-driven wipes. This means their HC pack ladder must do ALL the conversion work that seasonal games distribute across time-limited events. Compare directly: EA FC resets squads annually (forcing re-spend); eFootball is non-seasonal (closer model to Goals). In non-seasonal economies, the HC ladder needs to be more compelling at each tier because there is no artificial urgency driving purchases. This should factor into whether their discount curve is aggressive enough to drive ongoing conversion without seasonal pressure.

**Done when:** Goals' payer assumptions benchmarked against published data from comparable titles (with cited sources). Clear assessment of whether their conversion/ARPPU targets are realistic at launch. If unrealistic, document the implication for pricing strategy.

**Estimated hours:** 5h

---

### Story 1.1: Competitive Pricing Position

**Purpose:** Show Goals exactly where their HC pricing sits relative to the market — not by re-doing their competitive data, but by synthesising it into a clear positioning statement they can't write themselves.

---

#### Task 1.1.1: Build Normalised Price Position Map

**What:** Using Goals' existing competitive data (which they've already gathered for 7 games), create a normalised view that shows positioning at each tier.

**How:**
1. Goals already has the raw data in their Pricing Model (Sheet "Softhard currency comparison"). NBI's job is NOT to re-gather this data. NBI's job is to interpret it.
2. Create a "position map" for each tier showing Goals' effective USD/HC against the competitive range:
   - At entry ($5-6): Goals = $0.01576/HC. Where does this sit vs range?
   - At mid ($20): Goals = $0.01454/HC. Position?
   - At top ($100): Goals = $0.01290/HC. Position?
3. For each tier, calculate market: minimum, median, maximum, and Goals' position as percentile
4. Visual: Goals should see "You are at the Xth percentile of the market at each tier" — this is the answer to "are we too low?"
5. Spot-check 2-3 competitor prices to confirm Goals' data is still current (quick store verification, not full re-research). If EA FC or Fortnite changed prices since Goals' data was gathered, note the update.

**Done when:** Position map complete showing Goals' percentile at each tier. Clear one-line answer: "Goals is at the [X]th percentile of market pricing — [below/at/above] median."

**Estimated hours:** 8h

---

#### Task 1.1.2: Discount Curve Comparison

**What:** Compare Goals' bonus/discount scaling against competitors. Assess whether the value incentive to buy larger packs is appropriate.

**How:**
1. Goals' discount curve (already calculated from their data):
   - Tier 1 ($5.99): 0% discount (base)
   - Tier 2 ($9.99): ~2.5% discount
   - Tier 3 ($19.99): ~7.7%
   - Tier 4 ($29.99): ~9.4%
   - Tier 5 ($49.99): ~15.4%
   - Tier 6 ($99.99): ~18.1%
2. Compare max discount to competitors:
   - EA FC: ~39% at top tier (very aggressive)
   - Fortnite: ~24%
   - Apex: ~13%
   - Goals: ~18%
3. Assessment questions:
   - Is 18% max discount enough to incentivise whale spending at the top tier?
   - Is the jump from tier to tier consistent enough to feel "fair"?
   - Is there a clear "best value" tier that most players should gravitate toward?
   - Compared to the market: Goals is between Apex (conservative) and Fortnite (moderate). This is a defensible position for a new launch — don't over-discount before you have data on player willingness.
4. Key principle: New launches should be MORE conservative on discounts (closer to Goals' current curve) because you can always increase discounts later but can never reduce them without backlash.

**Done when:** Curve comparison documented. Assessment of whether Goals' discount progression is appropriate for a new launch. Specific recommendation if any tier's discount should change.

**Estimated hours:** 4h

---

#### Task 1.1.3: SKU Structure and Entry Point Audit

**What:** Assess the structural health of Goals' 6-tier HC ladder. Special focus on the entry point and first-purchase experience.

**How:**
1. Goals' current structure:
   - $5.99 / $9.99 / $19.99 / $29.99 / $49.99 / $99.99 (6 tiers)
2. Compare tier count to competitors:
   - EA FC: 8 tiers (starts at $0.99)
   - Fortnite: 4 tiers (starts at $7.99)
   - Apex: 6 tiers (starts at $4.99)
3. Entry point analysis:
   - Goals starts at $5.99. EA FC starts at $0.99. Apex at $4.99.
   - Question: Does $5.99 create first-purchase friction?
   - From Task 1.0.1: What can $5.99 (380 HC) buy? If the answer is "1 national kit with leftover coins that can't buy anything else," that's a satisfying entry purchase. If 380 HC can't buy any complete item, the entry tier has a conversion problem.
   - Counter-argument: Lower entry tiers ($0.99-$2.99) have high platform fee overhead (30% of $0.99 = $0.30 net revenue). For a small studio, the transaction cost may not justify it.
4. Structural gaps:
   - Gap between $9.99 and $19.99 (100% price jump) — is there a missing $14.99 tier?
   - Gap between $49.99 and $99.99 (100% price jump) — should there be a $69.99 or $79.99?
   - These gaps are standard in the industry (Fortnite, Apex have similar jumps). Not necessarily a problem.
5. Whale ceiling:
   - $99.99 is the top tier. Whales who want to spend more must purchase multiple times.
   - Is this intentional? (Yes — it avoids a single $250 "whale pack" that looks predatory)
   - What's the maximum a whale could spend per day/week? (No purchase limits documented in the game design docs)
   - Recommendation: No purchase limits + $99.99 ceiling = whale-friendly without optically aggressive pricing. This is correct for their anti-P2W positioning.

**Done when:** Structure audit complete. Entry point assessment with recommendation. Whale ceiling analysis documented. Any structural gaps identified with recommendation (add tier / leave as-is / remove tier).

**Estimated hours:** 5h

---

#### Task 1.1.4: Platform Fee Impact and Net Revenue Table

**What:** Calculate actual net revenue per SKU per platform. Identify any margin issues.

**How:**
1. Build table:

| SKU | Gross | Steam Net (30%) | Epic Net (12%) | PS/Xbox Net (30%) |
|-----|-------|-----------------|----------------|-------------------|
| 380 HC | $5.99 | $4.19 | $5.27 | $4.19 |
| 650 HC | $9.99 | $6.99 | $8.79 | $6.99 |
| 1,375 HC | $19.99 | $14.00 | $17.59 | $14.00 |
| 2,100 HC | $29.99 | $21.00 | $26.39 | $21.00 |
| 3,750 HC | $49.99 | $35.00 | $43.99 | $35.00 |
| 7,750 HC | $99.99 | $70.00 | $87.99 | $70.00 |

2. Assessment: All tiers are well above minimum viable margin. The $5.99 entry netting $4.19 is healthy (unlike a hypothetical $0.99 tier netting $0.69).
3. Epic advantage: Goals nets ~26% more per transaction on Epic vs Steam/PS/Xbox at the same price ($5.27 vs $4.19 on a $5.99 item). This could inform promotional strategy (drive purchases through Epic where possible).
4. Note for regional analysis: These are USD nets. Regional pricing on consoles uses "wholesale" rates that may differ from simply applying 30% to local prices. Goals' matrix already has PS wholesale prices — verify alignment.

**Done when:** Net revenue table complete. Any margin concerns flagged. Epic revenue advantage quantified.

**Estimated hours:** 2h

---

### Story 1.2: Conversion Rate and Elasticity Context

**Purpose:** Provide the conversion/revenue modelling context that turns a static price comparison into actionable strategy.

---

#### Task 1.2.1: Price Elasticity Scenario Modelling

**What:** Model what happens to projected revenue if Goals adjusts prices +/- 10-20% at key tiers.

**How:**
1. Use Goals' own revenue model (Pricing Model, Sheet "Overview"):
   - 805,250 MAU, 10.4% payer rate, $32.48 ARPPU = $2.72M total revenue
2. Model scenarios:
   - **Scenario A: Raise all prices 10%**
     - Assume conversion drops 5-15% (elasticity assumption for F2P games: moderate)
     - Net revenue change: +10% price × (100% - X% conversion drop) = range
   - **Scenario B: Raise all prices 20%**
     - Assume conversion drops 10-25%
     - Net revenue change: calculate range
   - **Scenario C: Raise entry tier only (from $5.99 to $6.99)**
     - Assume entry conversion drops 5-10% but mid/high tiers unaffected
     - Revenue impact: primarily affects first-time buyers
   - **Scenario D: Keep prices, steepen discount curve**
     - Same base price, but top tier gets 25% discount instead of 18%
     - Attracts more whale spending at top, neutral on entry conversion
3. Present as impact ranges (conservative/optimistic), not point estimates.
4. Key insight to surface: "If your conversion rate target (10.4%) is optimistic for month 1, lowering prices won't help — you need time and content to build conversion. Therefore, launching at a slightly higher price point and reducing later is the correct strategy."
5. Core pricing principle (from Glen, stated in kickoff call): Launch high, patch down. Never the reverse. Console platforms make price increases nearly impossible post-launch.

**Done when:** 4 scenarios modelled with revenue impact ranges. Clear recommendation on which scenario maximises launch revenue while preserving future flexibility.

**Estimated hours:** 8h

---

### Story 1.3: Promotional and First-Purchase Pricing

**Purpose:** Address the gap identified in critique — static HC packs are not the whole monetisation picture. First-purchase incentives and promotional pricing drive early conversion.

---

#### Task 1.3.1: First-Purchase and Starter Pack Recommendations

**What:** Provide recommendations on first-time buyer incentives that drive conversion without discounting the core HC ladder.

**How:**
1. Industry standard: Most F2P games offer a one-time "Starter Pack" or "First Purchase Double" that dramatically increases first-purchase conversion.
   - EA FC: "Welcome Pack" and various one-time offers
   - Fortnite: "Starter Pack" ($3.99, cosmetics + 600 V-Bucks)
   - Apex: "Champion Edition" and "Starter Pack"
2. Goals' current approach: From Beta LiveOps data, they had a "Starter Pack" at 15,000 points (soft currency, not HC). No HC-specific first-purchase offer documented.
3. Recommendations to include:
   - **First Purchase Bonus:** Double HC on first-ever purchase at any tier. Research needed: verify what EA FC, Fortnite, Apex, eFootball currently offer as first-purchase incentives and what published data exists on conversion uplift. Do NOT cite specific conversion improvement percentages without a source.
   - **Limited Starter Pack:** A one-time $3.99 offer (below the normal $5.99 entry) containing 500 HC + 1 Rare+ player + 1 exclusive kit. Creates urgency, breaks the first-purchase barrier, and introduces players to the HC economy.
   - **World Cup Launch Bundle** (if timing allows): Tied to June event, limited availability, higher value per dollar than standard packs. Creates FOMO without permanently discounting.
4. Framing: These are NOT changes to the core HC ladder (which is what the SOW covers). These are complementary offers that improve conversion on the core ladder. Position as value-add observation.

**Done when:** 2-3 specific first-purchase recommendations documented with rationale and expected conversion impact. Clearly framed as complementary to the core pricing (not scope creep).

**Estimated hours:** 5h

---

## Feature 2: Regional Pricing Strategy

**Objective:** Validate Goals' 40+ country pricing matrix. NBI adds: competitive regional context, PPP-adjusted analysis, and platform compliance verification they can't get from their own spreadsheet.

**What NBI adds:** Goals built their matrix using exchange rates and some PPP data. They CANNOT benchmark their regional pricing against what EA FC actually charges in Turkey or Brazil — that requires platform store access or competitor intelligence. NBI provides this.

---

### Story 2.1: Regional Deviation and Risk Identification

**Purpose:** Flag countries where Goals' pricing creates material risk (too high = player backlash, too low = revenue leakage, misaligned = platform rejection).

---

#### Task 2.1.1: Categorise All Countries by Risk Level

**What:** Using Goals' existing deviation data (already calculated in their matrix), categorise every country into green/amber/red.

**How:**
1. Goals' Pricing Matrix already calculates "Difference to currency exchange" for each country. Use this directly — don't recalculate.
2. Categorise using deviation thresholds (defined for this engagement based on Goals' pricing matrix data patterns and the "Recommendation" column Goals themselves already populated):
   - **Green (proceed as-is):** Deviation <15% from FX AND Goals' own matrix marks "YES"
   - **Amber (review recommended):** Deviation 15-25% OR Goals' matrix marks "!" or "?" OR misaligned with competitor pricing in that market
   - **Red (change required):** Deviation >25% OR Goals' matrix explicitly recommends a price move OR large player market (top 10 beta communicators) with >15% over-pricing
3. From Goals' data, expected categorisation:
   - Red candidates: Poland (+25%), Switzerland (+26%), Ukraine (-26%), possibly Turkey, Brazil
   - Amber candidates: South Africa, Czech Republic, Norway, Denmark
   - Green: Most of Western Europe (EUR countries at +18% are borderline amber)
4. For each Red country, assess:
   - How large is the player base? (Cross-reference with Beta community data: UK 1,274, France 1,026, Turkey 667, Brazil 495, Poland 392)
   - What's the risk severity? (Large player base + over-priced = high severity)
5. Special attention to the EUR zone: Goals prices EUR at the same level across all EUR countries (€5.99 base). But PPP within the EUR zone varies significantly (Germany vs Portugal vs Greece). This is standard practice (platform limitations), but flag if any EUR country has extreme PPP deviation.

**Done when:** Every country categorised (green/amber/red). Red countries have specific risk descriptions. Output is a ranked priority list for deeper analysis.

**Estimated hours:** 8h

---

#### Task 2.1.2: Competitor Regional Pricing for Red/Amber Markets

**What:** For the 5-10 countries flagged as red/amber, determine what EA FC and Fortnite charge. This is the intelligence Goals cannot access internally.

**How:**
1. For each red/amber country, research:
   - EA FC equivalent base tier pricing on PS Store and Steam in that region
   - Fortnite V-Bucks pricing in that region (Epic Games Store)
2. Sources:
   - PlayStation Store regional pricing: Accessible via web store with region selection
   - Steam: SteamDB provides historical and current pricing by region
   - Epic: Regional pricing visible through store
3. For each market, build a comparison:
   - Country | Goals proposed | EA FC actual | Fortnite actual | Market median | Goals position (above/below/at)
4. Focus on the highest-risk markets first:
   - **Brazil:** Large player base, low PPP, critical for WC engagement
   - **Turkey:** 5th largest beta community, extreme PPP differential
   - **Poland:** Large beta community, Goals is +25% above FX
   - **Russia/CIS:** If launching there — extreme currency volatility
5. Note: If direct store access is blocked by region-locking, use SteamDB or documented third-party sources. Cite all sources.

**Done when:** Competitor pricing gathered for all red/amber countries. Goals' position vs EA FC documented per market. Specific countries where Goals is significantly above or below EA FC identified.

**Estimated hours:** 15h (Primary source: SteamDB for Steam pricing, PS Store web scraping for console pricing. If direct access fails, use documented third-party pricing databases. This is the single largest research task in the engagement.)

---

### Story 2.2: Platform Compliance and Submission Guidance

**Purpose:** Ensure Goals' pricing will pass PS/Xbox review without rejection or delay.

---

#### Task 2.2.1: Verify Platform Tier Compliance

**What:** Confirm that Goals' proposed prices for PS and Xbox align with valid platform tier selections.

**How:**
1. Goals' matrix already has PS wholesale and Xbox pricing columns. Verify these are valid tier selections by cross-referencing with:
   - Goals' own "Copy of PS4_PS5 Digital" sheet in the Pricing Matrix
   - Goals' "Xbox wholesale pricing" sheet
2. For any price that doesn't align to a standard platform tier, flag it — Sony/Xbox will reject non-standard pricing.
3. Key question for Julius: Have they already submitted a test pricing configuration? If yes, did it pass? If no, this verification is critical path.
4. Document the submission checklist:
   - All prices must be in valid platform tiers
   - Regional pricing must cover all territories where the game is available
   - Any currency not supported by the platform needs a USD fallback
   - Review period: ~9 days (from Julius's kickoff call statement)
5. Timeline implication: If NBI delivers recommendations by Sunday April 27, Goals has until ~May 5 to submit. That gives them 1+ week to implement changes and submit.

**Done when:** Platform compliance verified or issues flagged. Submission timeline documented. Any blockers escalated to Julius immediately.

**Estimated hours:** 3h

---

### Story 2.3: Country-Specific Recommendations

**Purpose:** Provide specific price adjustment recommendations for each red/amber country.

---

#### Task 2.3.1: Write Country Recommendation Cards

**What:** For each red/amber country, write a "recommendation card" with the specific pricing change needed.

**How:**
1. For each country requiring action, document:
   - **Country:** [Name]
   - **Current proposed price:** [X local currency] (= $Y USD equivalent)
   - **Issue:** [Over-priced by Z% vs FX / Misaligned with EA FC by W% / PPP unaffordable]
   - **Recommended price:** [A local currency] (= $B USD equivalent)
   - **Rationale:** [EA FC charges C in this market / PPP suggests D / Platform tier constraint means E]
   - **Revenue impact:** [If player base is ~N, this change affects ~$M of annual revenue]
   - **Risk if unchanged:** [Player perception / Platform rejection / Competitive disadvantage]
2. Prioritise cards by: player base size × deviation severity
3. Group by action type:
   - "Reduce price" (over-priced markets)
   - "Can increase" (under-priced markets where revenue is being left on table)
   - "Platform tier adjustment" (price needs rounding to valid tier)
4. Expected output: 8-12 country cards covering all red and amber markets.

**Done when:** All red/amber countries have specific, actionable recommendation cards. Each card is self-contained — Julius can implement it without reading the full report.

**Estimated hours:** 8h

---

## Feature 3: Risk Assessment, Scenarios & Recommendations

**Objective:** Synthesise all analysis into clear, specific, actionable guidance with modelled impact.

---

### Story 3.1: "Are We Too Low?" — The Central Answer

**Purpose:** Directly address Jonas's core concern with evidence.

---

#### Task 3.1.1: Build the Definitive Position Statement

**What:** Using all Feature 1 analysis, write the one paragraph that answers Jonas's question.

**How:**
1. From Task 1.1.1: Goals' percentile position at each tier (below/at/above median)
2. From Task 1.0.2: Whether Goals' conversion/ARPPU targets are realistic
3. From Task 1.2.1: Scenario modelling showing impact of price changes
4. Synthesise into a clear statement:
   - "Goals' base HC pricing is at the [X]th percentile of the competitive set. This means [interpretation]. Given your 80/20 skill-to-purchase ratio and anti-P2W positioning, this is [appropriate/low/high] because [reason]."
   - "Your payer conversion target of 10.4% is [realistic/aggressive] for month 1. At realistic month-1 conversion of [Y%], your current pricing yields [Z revenue]. At 10% higher pricing with [slightly reduced] conversion, you would yield [W revenue]."
5. Conclude with: "Our recommendation is [specific — e.g., 'maintain current base pricing but steepen the discount curve at top tier' OR 'increase base tier from $5.99 to $6.49 across all platforms']"
6. Core principle (from kickoff call): "You can always reduce prices post-launch. You cannot raise them." This is a platform constraint, not just strategy — Sony/Xbox re-certification for price increases is slow and generates press coverage.

**Done when:** One clear paragraph answering "are we too low?" with specific evidence and a specific recommendation. No hedging — take a position.

**Estimated hours:** 4h

---

### Story 3.2: Risk Register

**Purpose:** Document all identified pricing risks before launch, ranked by severity.

---

#### Task 3.2.1: Compile and Rank Risks

**What:** Full risk register from all analysis.

**How:**
Document each risk with: Description | Severity | Likelihood | Markets Affected | Mitigation

Expected risks (derived from analysis):
1. **P2W perception at high price points** — Community data shows "pay to win" is the #1 cited quit reason. If premium packs feel like they buy wins, pricing is irrelevant because players leave.
   - Severity: Critical | Likelihood: Medium (80/20 design mitigates, but perception ≠ reality)
   - Mitigation: Frame all HC purchases as time-saving/cosmetic, never competitive advantage. Ensure store messaging emphasises "customise" not "dominate."

2. **Post-launch price increase impossibility** — If current prices prove too low, raising them on console is extremely difficult (requires re-certification, player backlash, press coverage).
   - Severity: High | Likelihood: Medium
   - Mitigation: Launch at the upper end of the acceptable range. Use the "introductory pricing" frame explicitly so future adjustments are expected.

3. **Over-pricing in price-sensitive markets** (Turkey, Brazil, Poland) — Large player bases with low purchasing power. Over-pricing = low conversion = missed World Cup revenue.
   - Severity: High | Likelihood: High (Poland already +25% above FX)
   - Mitigation: Implement country-specific adjustments per Story 2.3 recommendations.

4. **Platform pricing rejection** — Sony/Xbox reject submitted pricing, causing delay past the May 14 launch window.
   - Severity: Critical | Likelihood: Low (if tier compliance verified)
   - Mitigation: Task 2.2.1 verification. Submit 2+ weeks early.

5. **Discount curve too shallow for launch** — New game needs to incentivise initial spending. 18% max discount may not drive enough whale commitment early.
   - Severity: Medium | Likelihood: Medium
   - Mitigation: Consider steepening top-tier discount to 22-25% for first 90 days, then normalise.

6. **Missing entry-tier conversion** — $5.99 minimum may be too high for first-time buyers who need a low-risk trial purchase.
   - Severity: Medium | Likelihood: Medium
   - Mitigation: First-purchase bonus (Story 1.3) addresses this without adding a micro-tier.

7. **Originals/Celebrity pack pricing gap** — Premium HC-only items (documented in GG-Monetization) have no pricing framework. When these launch post-Day 1, Goals needs a method to price them.
   - Severity: Low (not launch-critical) | Likelihood: N/A
   - Mitigation: Feature 4 framework covers this. Flag for Phase 2 detailed work.

8. **Netherlands regulatory risk for player packs** — Player packs that grant athletes with meaningful attribute variance (even within the 80/20 model) may be classified as gambling-adjacent under Dutch Kansspelautoriteit rulings. EA FC has been fined in NL for similar mechanics.
   - Severity: High (NL is a launch market, EUR pricing) | Likelihood: Medium (depends on how packs are classified)
   - Mitigation: Legal review of pack mechanic before NL launch. Consider offering cosmetic-only packs in NL, or ensure pack contents are predetermined/visible before purchase. Research required: verify current KSA enforcement stance on F2P sports games.

9. **South Korea drop rate disclosure requirement** — Korean law mandates disclosure of exact probabilities for all randomised item purchases. Non-compliance blocks the Korean launch.
   - Severity: High (legal requirement) | Likelihood: Certain (if launching in KR)
   - Mitigation: Confirm drop rate disclosure is built into the pack UI before KR submission. Goals' player tier distribution (in player_pricing data) provides the rates — ensure they are displayed in-game.

10. **Non-seasonal demand sustainability** — Without seasonal resets or a battle pass, there is no guaranteed per-player spend floor per quarter. Player aging is a sink but is gradual and predictable, leading to flat rather than pulsing revenue. This is the fundamental tradeoff of the anti-P2W positioning.
    - Severity: Medium (long-term revenue risk, not launch-blocking) | Likelihood: High
    - Mitigation: Plan regular cosmetic refresh cadence (monthly kit/celebration drops), leverage real-world football events as demand drivers, use mode variety to drive squad depth demand. This is Phase 2 work but should be acknowledged in the deliverable.

**Done when:** Minimum 10 risks documented with full detail. Ranked by severity × likelihood. Top 3 have specific, actionable mitigation steps.

**Estimated hours:** 5h

---

### Story 3.3: Top 5 Recommendations

**Purpose:** The five highest-impact actions Goals should take before platform submission.

---

#### Task 3.3.1: Write Top 5 Recommendations

**What:** Five specific, numbered, actionable recommendations.

**How:**
Each recommendation must include:
- **What to change:** Exact specification
- **Why:** Evidence from analysis
- **Revenue impact:** Conservative-to-optimistic range (from scenario modelling)
- **Implementation:** What Goals does (which cells in their matrix, which platform to resubmit)
- **Risk if skipped:** What happens

The 5 recommendations will be determined by analysis, but expected candidates:
1. [Pricing position adjustment] — e.g., "Increase/maintain base tier at $X" based on competitive position finding
2. [Regional correction] — e.g., "Reduce Poland/Turkey/Brazil pricing by X%" based on country analysis
3. [Discount curve adjustment] — e.g., "Increase top-tier discount from 18% to 22%" if whale incentive is weak
4. [First-purchase incentive] — e.g., "Implement first-purchase double bonus" to drive conversion
5. [Launch framing] — e.g., "Label current pricing as 'Launch Pricing' to preserve future flexibility"

Each must pass the test: "Would a studio economy designer respect this and act on it immediately?"

**Done when:** 5 recommendations written in full format. No vague advice. Every number is specific. Every impact range is stated.

**Estimated hours:** 7h

---

## Feature 4: Value-Add (Conditional — Time Permitting)

**Objective:** Deliver supplementary tools that demonstrate NBI's strategic depth and position Phase 2. ONLY executed if F1-3 complete within budget.

---

### Story 4.1: Reusable Regional Pricing Methodology

---

#### Task 4.1.1: Write the "How to Price a New SKU" Guide

**What:** One-page methodology Goals can use for any future SKU without NBI.

**How:**
1. Document the steps NBI used in this engagement, simplified for internal use:
   - Step 1: Set USD base price (anchor against EA FC equivalent)
   - Step 2: Convert to local currencies using current FX
   - Step 3: Check PPP factor (provide lookup table)
   - Step 4: Compare against EA FC in that market (±15% is acceptable)
   - Step 5: Round to nearest platform tier
   - Step 6: Verify discount curve is maintained
2. Include one worked example: "Pricing a new Celebration at $7.00 USD for the Brazil market"
3. Include the PPP factor table for all launch markets
4. Position as: "This is the manual method. Phase 2 builds a model that does this automatically using your live data."

**Done when:** One-page document that Julius can follow. Worked example included.

**Estimated hours:** 3h

---

### Story 4.2: World Cup Pricing Opportunity Notes

---

#### Task 4.2.1: Write World Cup Quick-Hit Observations

**What:** 3-5 tactical pricing observations for the June World Cup window.

**How:**
1. From the Release LiveOps data, Goals already plans:
   - National kits by country
   - World Cup themed events
   - Peak monetisation in July
2. NBI adds:
   - National bundle pricing guidance: Price national kits at a premium during group stage (emotional spending) and discount during knockout (losing teams = fire sale)
   - Time-limited HC pack: Consider a "World Cup Coin Pack" at slightly better value than standard (e.g., 10% bonus) that's only available during the tournament — drives urgency
   - ARPPU peak expectations: Research what published data exists on revenue spikes during major sporting events in comparable F2P titles (EA FC during World Cup 2022, eFootball during tournaments). Do NOT cite multiplier ranges without a verifiable source.
3. Keep this SHORT. Half a page. It's a teaser for the live service consulting engagement, not a full plan.

**Done when:** 3-5 bullet points with specific, actionable World Cup pricing tactics. Clearly positioned as "what we'd build out fully in Phase 2."

**Estimated hours:** 2h

---

### Story 4.3: Phase 2 Positioning

---

#### Task 4.3.1: Write "What's Next" Section

**What:** Brief section positioning the larger engagement.

**How:**
1. Natural next steps (frame as recommendations, not a sales pitch):
   - Post-launch telemetry review (2-3 weeks after May 14): Real data replaces estimates
   - A/B test design: Optimise conversion at each tier using live cohorts
   - Store optimisation: Offer sequencing, time-limited promotion design, personalised pricing
   - World Cup monetisation strategy: Full tactical plan for the June peak
   - Ongoing live service consulting: Content cadence, engagement frameworks, team coaching
2. Close with: "We recommend a check-in call 2-3 weeks post-launch to review initial transaction data and scope the next phase."
3. Do NOT include NBI's internal pricing for Phase 2 in the client document.

**Done when:** Half-page "What's Next" section. Helpful, not salesy. Positions naturally.

**Estimated hours:** 3h

---

## Feature 5: Deliverable Assembly & Client Review

**Objective:** Package everything into the contracted deliverable.

---

### Story 5.1: Written Summary Document

---

#### Task 5.1.1: Assemble the Written Summary

**What:** Create the final client-facing document.

**How:**
Document structure:
1. **Executive Summary** (1 page) — headline finding, top 5 recs, immediate action needed
2. **Section 1: Your Competitive Position** — where Goals sits vs market (Feature 1 findings)
3. **Section 2: Regional Pricing Assessment** — country risk map + recommendation cards (Feature 2)
4. **Section 3: Pricing Scenarios** — what-if modelling showing revenue impact of adjustments (Story 1.2)
5. **Section 4: Risk Register** — all identified risks with mitigation (Story 3.2)
6. **Section 5: Recommendations** — top 5 specific changes (Story 3.3)
7. **Section 6: Pricing Framework** — reusable methodology for future SKUs (Feature 4, if completed)
8. **Section 7: World Cup Opportunities** — quick-hit tactical observations (Feature 4, if completed)
9. **Section 8: Next Steps** — Phase 2 positioning
10. **Appendix: Supporting Data** — full comparison tables, country matrix, competitor data

Style: British English. No em dashes. Direct, specific, numbers-backed. 12-18 pages total. Written for Jonas (strategic) and Julius (practitioner) simultaneously.

**Done when:** Complete document draft. All sections populated with real findings. Internally consistent. Ready for internal review.

**Estimated hours:** 10h

---

### Story 5.2: Internal Review and Polish

---

#### Task 5.2.1: Quality Gate — Internal Review

**What:** Glen and Tom review before it goes to client.

**How:**
1. Glen reviews for:
   - Domain accuracy (do the recommendations make sense for this game?)
   - Tone (does it demonstrate expertise without being condescending?)
   - Completeness (does it answer Jonas's core questions?)
2. Tom reviews for:
   - Commercial positioning (does it set up Phase 2 naturally?)
   - NBI brand consistency
   - Any contractual/legal issues
3. Address all feedback and produce final version.
4. Send to Jonas/Julius 24h before the review call.

**Done when:** Final document approved by Glen and Tom. Sent to client. Call scheduled.

**Estimated hours:** 4h

---

### Story 5.3: Remote Review Session

---

#### Task 5.3.1: Conduct Client Review Call

**What:** 30-45 minute call walking Jonas/Julius through findings and recommendations.

**How:**
Agenda:
- 5 min: Recap scope and methodology
- 10 min: Top 5 recommendations (start with highest impact)
- 10 min: Regional pricing highlights (red countries, what needs to change)
- 5 min: Pricing framework overview
- 5 min: Next steps / Phase 2
- 10 min: Q&A

Prepared answers for likely questions:
- "Should we delay launch?" → No. These are configuration changes, not architecture.
- "What if platforms reject?" → Built within their tier systems. Low risk if compliance verified.
- "How confident are you?" → State honestly per finding. Data-backed = high. Scenario-based = moderate.
- "Can we change later?" → Down only without backlash. Hence "launch high, patch down."

Follow-up within 24h: summary email, adjusted recommendations if needed, confirmed next steps.

**Done when:** Call completed. Follow-up sent. Phase 2 interest level documented.

**Estimated hours:** 4h (prep + call + follow-up)

---

## Execution Model

**Total effort:** ~116h across 3 people. This is NOT a 5-day sprint at the realistic estimates.

**Two options for delivery:**

### Option A: AI-Assisted (5 Calendar Days)

AI handles the bulk of Devin's research workload (competitive store scraping, country categorisation, data gathering). Human team focuses on synthesis, judgement, and deliverable writing.

| Day | Glen | Devin | Tom | AI |
|-----|------|-------|-----|-----|
| **Day 1** | T1.0.1, T1.0.2 (8h) | Verify AI research outputs | — | T1.1.1 data gathering, T2.1.1 country categorisation |
| **Day 2** | T1.1.2, T1.1.3, T1.2.1 start (12h) | T2.1.2 store verification (8h) | — | T1.1.4, continue T2.1.2 scraping |
| **Day 3** | T1.2.1 finish, T1.3.1 (10h) | T2.1.2 finish, T2.2.1 (10h) | — | T2.3.1 card drafts for review |
| **Day 4** | T3.1.1, T3.2.1, T3.3.1 (16h) | QA + data verification | T4.3.1 (3h) | T4.1.1, T4.2.1 drafts |
| **Day 5** | T5.1.1, T5.2.1 (14h) | Support | T5.2.1 review (2h) | — |
| **Day 6** | T5.3.1 call (4h) | — | — | — |

### Option B: Full Human (8-10 Calendar Days)

No AI research support. Team works at realistic pace. Delivery slips to ~6 May. May conflict with platform submission deadline.

| Phase | Duration | Team |
|-------|----------|------|
| Foundation + Competitive (F1) | 3 days | Glen (synthesis), Devin (research) |
| Regional (F2) | 3 days | Devin (research), Glen (review) |
| Synthesis + Recs (F3) | 2 days | Glen |
| Value-add (F4) | 1 day | Glen + Tom |
| Deliverable (F5) | 2 days | Glen + Tom |

**Decision required before starting.**

---

## Dependencies and Blockers

| Dependency | Status | Fallback |
|------------|--------|----------|
| Goals' Pricing Matrix data | In hand | N/A |
| HC-to-item value mapping | Derive from docs (Task 1.0.1) | Ask Julius to confirm if unclear |
| **Which discount curve is final** | **UNKNOWN — BLOCKER** | **Cannot proceed with T1.1.2 until confirmed** |
| **Platform submission deadline** | **UNKNOWN — BLOCKER** | **Cannot plan timeline until confirmed** |
| **Day 1 store contents** | **UNKNOWN — needed for T1.0.1** | Ask Julius |
| Competitor regional pricing | Research needed (Task 2.1.2) | SteamDB + PS Store web access |
| Platform tier validation | Partially in hand (matrix has PS wholesale) | Ask Julius to confirm valid tiers |
| Session telemetry from Julius | Requested, pending | Proceed without — note limitation in deliverable |
| Call scheduling with Jonas | Not confirmed | Send availability request Day 1 |
| Published conversion/ARPPU data | Research needed (Task 1.0.2) | EA/Konami quarterly reports, Sensor Tower |

---

## Quality Gates

1. **Before Day 1 starts:** Julius confirms discount curve choice, submission deadline, and Day 1 store contents. Without these, Tasks 1.0.1 and 1.1.2 cannot start properly.
2. **End of Day 1:** Can we answer "what does each HC tier buy?" If not, escalate to Julius immediately.
3. **End of Day 2:** Competitive position map draft complete. Do we know where Goals sits vs market?
4. **End of Day 3 (CRITICAL):** Glen reviews draft top 5 recommendations. Go/no-go on direction before synthesis.
5. **End of Day 4:** Full deliverable content complete (pending assembly). Feature 4 status: complete or cut.
6. **Day 5:** Final document to Glen/Tom for review. Send to client by end of Day 5 or first thing Day 6.
