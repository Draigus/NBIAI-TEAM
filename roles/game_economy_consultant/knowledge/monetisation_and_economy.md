# Game Economy and Monetisation -- Tier 2 Knowledge

This file contains the domain knowledge required to perform as a credible game economy and monetisation consultant. It covers monetisation models, pricing strategy, economy design, benchmarks, platform economics, and regulatory context. All ranges and benchmarks are approximate and should be validated against current market data for any given engagement.

---

## 1. Monetisation Models by Genre

### Mobile Free-to-Play (F2P)
The dominant mobile model. Revenue comes from IAP (in-app purchases) and increasingly from advertising (rewarded video, interstitials, offerwall). The core loop must function without spending, but spending must accelerate progression or provide cosmetic/status value.

**Sub-patterns by genre:**
- **Puzzle/casual (Candy Crush, Royal Match):** Low friction IAP (lives, boosters, extra moves). High install volume, low conversion, moderate ARPDAU. Ad revenue often 30-50% of total
- **Mid-core strategy (Clash of Clans, Rise of Kingdoms):** Dual currency (soft earnable + hard premium), speedups, builder/worker slots, gacha for heroes/units. Higher conversion, higher ARPPU, whale-heavy. Ad revenue minimal
- **Idle/incremental (Idle Heroes, AFK Arena):** Gacha-centric with VIP/subscription layers. Progression is the product. Very high whale concentration. Daily purchase habits driven by login rewards and limited offers
- **Battle royale mobile (PUBG Mobile, Free Fire):** Cosmetic-primary with battle pass as anchor revenue. Seasonal skins, emotes, vehicle wraps. Gacha for rare cosmetics
- **Narrative/RPG (Genshin Impact model):** Gacha character acquisition as the primary revenue driver. Pity systems (guaranteed pull after N attempts) as the de facto standard. Welkin Moon-style micro-subscriptions for daily currency drip

### MMO (Subscription + Cash Shop Hybrid)
Most modern MMOs use a hybrid model: optional subscription (or mandatory for premium content) plus a cosmetic/convenience cash shop.

**Revenue layers:**
- **Base subscription:** GBP 8-12/month. Provides access to all content or premium features
- **Cash shop cosmetics:** Mounts, skins, housing items. Must not confer gameplay advantage in subscription MMOs (pay-to-win perception is lethal)
- **Convenience items:** XP boosts, inventory expansion, fast travel tokens. Acceptable if they save time but do not create power gaps
- **Expansion packs:** GBP 30-50 per major expansion (annual or biannual cycle)
- **Premium services:** Server transfers, name changes, character boosts. High margin, low volume

**Key tension:** Subscription MMO players have zero tolerance for pay-to-win. Cash shop items must be cosmetic or minor convenience. Crossing this line causes community revolt (see: multiple MMO controversies where stat-boosting items in a sub-based game triggered mass cancellations)

### Premium + DLC (PC/Console)
Full-price upfront purchase (GBP 50-70) with post-launch DLC and potentially a cosmetic store.

**Revenue structure:**
- **Base game:** The primary revenue event. First 30 days are 60-70% of lifetime base game revenue
- **Season pass / expansion pass:** GBP 20-40 for a bundle of upcoming content drops. Sold at or near launch to capture intent
- **Individual DLC:** GBP 5-15 per content drop. Story chapters, map packs, character packs
- **Cosmetic store:** Optional layer. Works when the game has strong identity expression (character customisation, weapon skins). Controversial in full-price games if perceived as "content cut from the base game"

### Hybrid Models
Increasingly common. Examples:
- **Free-to-play base + premium expansion (Destiny 2 model):** F2P hook with paid seasonal content and expansions
- **Premium base + battle pass + cosmetic store (Fortnite before going F2P, now many AAA games):** Full-price game with live service monetisation layered on top
- **Free-to-play with subscription option (Warframe, Path of Exile model):** Core game free, subscription provides convenience/stash/cosmetic benefits

### Telegram / Web3-Adjacent
Emerging model relevant to Sarge Universe. Revenue from:
- **Direct IAP via Telegram Stars or payment bots:** Lower friction than app store, no 30% platform fee
- **NFT/token integration (where applicable):** Highly variable, regulatory minefield, and player sentiment is polarised
- **Ad-supported:** Rewarded video for in-game currency
- **Caveat:** This space is volatile. Regulatory landscape is unclear. Recommend conservative monetisation with clear value exchange

---

## 2. Pricing Psychology and Strategy

### The Pricing Ladder
Every game store needs a clear pricing ladder that serves different player segments:

| Tier | Price Range (GBP) | Target Segment | Purpose |
|---|---|---|---|
| Entry / impulse | 0.79 - 1.99 | First-time spenders, low-intent | Break the spending barrier. Conversion driver |
| Starter pack | 1.99 - 4.99 | New players, first 7 days | One-time exceptional value to create first purchase habit |
| Mid-tier | 4.99 - 9.99 | Regular spenders | Core recurring purchase. Best "value per pound" tier |
| High-tier | 19.99 - 49.99 | Committed players | Aspirational purchases, bulk currency, premium bundles |
| Whale-tier | 49.99 - 99.99 | High spenders | Maximum currency packs, exclusive bundles |

**Key principles:**
- The **first purchase** is the hardest conversion. Starter packs should offer 3-5x the normal value per pound to break the barrier
- **Bonus currency scaling** should reward higher tiers: 0% bonus at entry, 10-15% at mid, 20-30% at high, 40-60% at whale tier
- **Price anchoring:** The most expensive pack sets the perceived value ceiling. Players evaluate mid-tier value relative to the top tier
- **Charm pricing** (X.99) is standard but less important in games than in retail -- players are evaluating currency-per-pound, not the sticker price
- **Regional pricing** is essential on mobile. A price point that works in the US/UK may be 3-5x the purchasing power equivalent in Southeast Asia or Latin America. Platform stores support regional pricing tiers

### Subscription and VIP Design
Subscriptions provide predictable revenue and increase retention (sunk-cost effect).

**Monthly subscription (Welkin Moon / Regal Pass style):**
- Price: GBP 3.99 - 7.99/month
- Provides daily login currency drip (must log in to claim -- drives retention)
- Total value over 30 days should be 3-5x what buying currency directly would cost
- Conversion target: 5-15% of DAU for a well-designed monthly sub

**VIP tiers:**
- Cumulative spend thresholds unlock permanent perks
- Perks escalate: QoL at low tiers (auto-loot, queue priority), cosmetic at mid tiers, meaningful convenience at high tiers
- VIP should never gate core content -- it should make the experience smoother
- Typical tier count: 8-15 levels. Top tiers should require significant cumulative spend (hundreds or thousands of GBP)

### Offer Timing and FOMO
- **Time-limited offers** drive urgency. 24-72 hour windows perform best. Beyond 7 days, urgency collapses
- **First-purchase offers** should appear within the first session but not before the player understands the game's value proposition (typically after 5-15 minutes of play)
- **Post-loss / post-fail offers** ("Need more energy? Special deal!") are effective but ethically sensitive. Avoid targeting these at players who have already shown distress signals
- **Comeback offers** for lapsed players: 50-70% better value than normal, presented on first session after 7+ days of absence. Window: 24-48 hours
- **Seasonal offers** tied to real-world events (Christmas, Halloween, Chinese New Year) perform 20-40% above baseline when thematically integrated with game content

---

## 3. Virtual Economy Design

### Currency Architecture

**Dual-currency model (industry standard for F2P):**
- **Soft currency:** Earned through gameplay. Used for common upgrades, consumables, basic progression. Players should earn enough through normal play to feel progress, but not so much that premium currency feels pointless
- **Hard currency (premium):** Purchased with real money (or earned in small amounts through achievements/events). Used for premium items, acceleration, gacha pulls, and exclusive content. This is where monetisation happens

**Triple-currency and beyond:**
Some games add a third "event" or "seasonal" currency earned through specific activities. This is useful for gating seasonal content without disrupting the core economy, but each additional currency adds cognitive load. Beyond three, most players lose track

**Exchange rates:**
- Hard-to-soft exchange rate should be set so that buying soft currency with hard currency is possible but inefficient -- it should always feel better to earn soft currency through play
- Never allow soft-to-hard conversion. This collapses the monetisation model

### Faucet/Sink Balancing

The fundamental health metric of any virtual economy. If currency flows in faster than it flows out, inflation occurs and prices lose meaning.

**Faucets (currency sources):**
- Quest/mission rewards
- Daily login bonuses
- Achievement completions
- Event rewards
- PvP/competitive rewards
- Ad-watching rewards (mobile)
- Season pass tier rewards

**Sinks (currency drains):**
- Equipment upgrades and crafting
- Consumable purchases (potions, energy, boosters)
- Gacha/loot box pulls
- Cosmetic purchases (permanent sink -- currency leaves the economy forever)
- Repair costs / durability systems
- Auction house fees / transaction taxes
- Respec/reset costs

**Balancing rules of thumb:**
- At target engagement (median daily session), a player should earn enough soft currency to feel progression but fall 20-40% short of what they would need to progress at maximum speed
- The gap between "free progression rate" and "maximum progression rate" is the monetisation space. Too small and there is no reason to spend. Too large and free players feel punished
- Monitor the ratio of currency earned to currency spent per daily session. In a healthy economy, this ratio should be 0.6-0.8 for soft currency (slight deficit drives aspiration) and well below 1.0 for hard currency (players need to purchase)
- **Inflation indicators:** Average player currency balance increasing week-over-week with no new sinks. Prices for player-traded goods rising. Players sitting on currency with "nothing to buy"
- **Deflation indicators:** Players unable to afford basic progression items. Engagement dropping because the grind feels unrewarding. Negative sentiment about "everything being too expensive"

### Economy Modelling Approach

For any economy audit:
1. **Map all faucets** with their flow rates (per hour of play, per day, per event)
2. **Map all sinks** with their drain rates and optionality (mandatory vs discretionary)
3. **Segment by player type:** Casual (1-2 sessions/day, 10-15 min each), Core (3-5 sessions, 30+ min), Hardcore (5+ sessions, 60+ min)
4. **Run the model forward:** At each segment's engagement level, what is the daily/weekly/monthly currency balance trajectory?
5. **Identify equilibrium points:** Where does each segment's balance stabilise? Is that point in a healthy range (enough to feel progress, not enough to trivialise content)?
6. **Stress-test the economy:** What happens if a new event adds a major faucet? What if players stockpile for a predicted sale? What if a new sink is too expensive and nobody uses it?

---

## 4. Key Benchmarks and Ranges

All figures are approximate ranges based on publicly available industry data and professional experience. They vary significantly by genre, platform, region, and game maturity. Always contextualise benchmarks to the specific game.

### Conversion and Revenue Metrics

| Metric | Mobile F2P | MMO (Sub) | Premium + DLC |
|---|---|---|---|
| **Conversion rate** (% of active players who spend) | 2-5% (casual), 5-10% (mid-core), 8-15% (strategy/RPG) | 60-80% (subscription take rate among active players) | N/A (100% at purchase; DLC attach rate 20-40%) |
| **ARPDAU** (average revenue per daily active user) | USD 0.03-0.08 (casual), 0.10-0.25 (mid-core), 0.15-0.50 (strategy/RPG) | USD 0.20-0.60 (subscription revenue spread across DAU) | N/A (not a daily metric for premium) |
| **ARPPU** (average revenue per paying user, monthly) | USD 10-30 (casual), 30-80 (mid-core), 50-200+ (strategy/RPG with whales) | USD 12-15 (subscription only), 20-40 (sub + cash shop) | USD 50-70 (base game), 70-120 (base + season pass) |
| **Whale concentration** (% of revenue from top 5% of spenders) | 40-60% (casual), 60-80% (mid-core/strategy) | 15-25% (subscription-based, naturally less concentrated) | 10-20% (premium, driven by collector DLC buyers) |

### Retention Benchmarks

| Metric | Mobile F2P (Good) | Mobile F2P (Great) | PC/Console F2P | MMO |
|---|---|---|---|---|
| **D1 retention** | 35-40% | 45%+ | 30-40% | 40-50% |
| **D7 retention** | 15-20% | 22%+ | 15-25% | 25-35% |
| **D30 retention** | 5-8% | 10%+ | 8-15% | 15-25% |
| **D90 retention** | 2-4% | 5%+ | 3-8% | 10-20% |

### LTV Benchmarks (Lifetime Value per Install)

| Genre | Low | Median | High |
|---|---|---|---|
| Casual/puzzle (mobile) | USD 0.10 | 0.30-0.80 | 2.00+ |
| Mid-core strategy (mobile) | USD 0.50 | 2.00-5.00 | 15.00+ |
| RPG/gacha (mobile) | USD 1.00 | 3.00-8.00 | 25.00+ |
| MMO (PC, subscription) | USD 30 | 60-120 | 300+ |

### Payer Mix (Typical F2P Distribution)

| Segment | % of Payers | Monthly Spend | % of Revenue |
|---|---|---|---|
| Minnow | 60-70% | Under USD 10 | 10-15% |
| Dolphin | 20-25% | USD 10-50 | 20-30% |
| Whale | 8-12% | USD 50-200 | 25-35% |
| Super-whale | 1-3% | USD 200+ | 20-40% |

---

## 5. Platform Fee Structures

### Apple App Store
- **Standard fee:** 30% of all IAP revenue
- **Small Business Programme:** 15% for developers earning under USD 1M/year (resets annually)
- **Subscription fee:** 30% for year 1 of a subscription, drops to 15% from year 2 for retained subscribers
- **Requirements:** All digital goods must be purchased through Apple IAP. No links to external purchase pages. No communicating alternative pricing outside the app
- **Reader apps exception:** Some content apps (Netflix, Spotify) can link out. Games do not qualify
- **Regional pricing:** Apple provides price tier tables. Developers select a tier; Apple sets the local price. Limited flexibility for custom regional pricing

### Google Play Store
- **Standard fee:** 30% on the first USD 1M, then 15% on earnings beyond that (as of current policy -- Google has changed this multiple times)
- **Subscription fee:** 15% from day 1 for subscriptions
- **Requirements:** Similar to Apple but slightly more flexible. Third-party billing is allowed in some regions (EU, India, others) with a reduced service fee (typically 26% instead of 30%)
- **User choice billing:** Where available, developers can offer alternative payment, but Google still charges a fee (typically 4% less than standard)

### Steam
- **Revenue share:** 30% on first USD 10M, 25% on USD 10-50M, 20% on revenue above USD 50M
- **Regional pricing:** Steam provides recommended regional prices. Developers can customise, but large deviations from recommendations cause cross-region arbitrage
- **Refund policy:** Full refund within 14 days if under 2 hours played. This affects premium pricing strategy -- the first 2 hours must demonstrate value
- **MTX in premium games:** Allowed but community sentiment is hostile to aggressive monetisation in paid games. Store page reviews will reflect this
- **Free-to-play:** Fully supported. Steam takes the same cut on all IAP

### Console (Xbox, PlayStation)
- **Revenue share:** 30% standard (both Microsoft and Sony)
- **Certification requirements:** All MTX content must pass certification review. Changes to store/IAP flow require re-certification, which takes 1-3 weeks
- **First-party compliance:** Must meet platform-specific guidelines for purchase flows, refund handling, and parental controls
- **Cross-platform considerations:** If the game is cross-play, pricing must be consistent across platforms or clearly justified (platform fees make identical net revenue challenging)

### Telegram / Direct Web
- **Telegram Stars:** Telegram takes approximately 0% currently on bot payments (subject to change). Stars have their own exchange rate
- **Direct web sales:** 0% platform fee but must handle payment processing (Stripe ~2.9% + 20p per transaction)
- **Regulatory note:** Direct sales bypass platform age verification and parental controls. Developer takes on full compliance responsibility

---

## 6. Regulatory Landscape

### Loot Boxes and Randomised Purchases
The regulatory environment is shifting rapidly and varies by jurisdiction.

**Belgium:** Loot boxes with real-money purchase are classified as gambling. Games must remove paid loot boxes or withdraw from the Belgian market. FIFA Ultimate Team packs were a high-profile case.

**Netherlands:** Similar to Belgium but enforcement has been inconsistent. The Dutch Gaming Authority has taken action against several titles. Legal challenges are ongoing.

**UK:** The UK government has not classified loot boxes as gambling (as of the 2023 review) but has called for industry self-regulation, age verification, and spending limits. DCMS select committee recommendations include mandatory disclosure of odds and parental spending controls.

**EU (broader):** The European Commission is monitoring. Several member states are considering national legislation. Trend is towards mandatory odds disclosure and age-appropriate design.

**China:** Requires disclosure of loot box odds. Limits on daily/monthly purchase amounts for minors. Real-name verification required.

**US:** No federal legislation. Some state-level proposals. ESRB labels games with "in-game purchases (includes random items)". FTC has held workshops but not acted.

**Japan:** "Kompu gacha" (complete gacha -- combining random items to form sets) was banned by JARO in 2012. Standard gacha is permitted with odds disclosure (industry self-regulation).

### Age-Appropriate Design
- **UK Age Appropriate Design Code (Children's Code):** Applies to online services likely to be accessed by under-18s. Requires age-appropriate privacy and design standards, including limitations on nudge techniques that encourage children to spend
- **COPPA (US):** Applies to services directed at under-13s. Requires parental consent for data collection. Monetisation of children under 13 is heavily constrained
- **Practical implications:** If a game's audience includes a significant under-18 population, monetisation mechanics must be reviewed for age-appropriateness. Spending caps, parental controls, and odds disclosure become essential, not optional

### NBI's Position
NBI advises clients to design monetisation that would survive the strictest plausible regulation. This means:
- Disclose odds on all randomised purchases
- Implement spending caps and parental controls proactively
- Avoid mechanics that exploit cognitive biases in vulnerable populations (children, problem gamblers)
- Design loot boxes so that every pull has standalone value (no "junk" pulls designed purely to dilute odds)
- Be prepared to convert loot box systems to direct-purchase alternatives if legislation requires it

---

## 7. Battle Pass Economics

### Standard Structure
- **Season length:** 8-12 weeks (mobile), 10-16 weeks (PC/console). Shorter seasons drive more purchase events but require more content velocity
- **Tier count:** 50-100 tiers typical. More tiers = more granular reward pacing but higher risk of mid-pass fatigue
- **Price point:** GBP 7.99-12.99 for premium track. Some games offer a "premium+" tier at 2-2.5x the base price with instant tier skips or exclusive cosmetics
- **Free track value:** Should contain enough useful items (currency, consumables, occasional cosmetics) to keep free players engaged and showcase what the premium track offers

### Revenue Mathematics
- **Pass purchase rate:** 10-25% of MAU for a well-designed pass in an engaged game. Higher in games where the pass is the primary monetisation vehicle (Fortnite, Apex Legends)
- **Self-funding passes:** Many games include enough premium currency in the pass to purchase the next season's pass. This sacrifices direct revenue but dramatically increases pass purchase rates and retention. Net effect is usually revenue-positive because it increases DAU and therefore ad revenue, cosmetic purchases, and engagement
- **Tier-skip purchases:** 5-15% of pass buyers purchase tier skips. Price these at a slight premium to the per-tier value of the pass itself

### Reward Pacing
- **Tiers 1-10:** Fast unlocks (every 1-2 play sessions). Create immediate perceived value. Include at least one visually impactful cosmetic by tier 5
- **Tiers 11-40:** Standard pacing (one tier per 2-4 sessions). Mix currency, consumables, and cosmetics. Place engagement milestones every 10 tiers (exclusive item, title, effect)
- **Tiers 41-50+ (or equivalent late section):** Aspirational rewards. The best cosmetics, rarest items, and prestige indicators live here. Completion rate target: 40-60% of pass buyers should reach the final tier. If more than 70% complete it, the pass was too easy and does not drive enough engagement. If less than 30% complete it, the grind is too punishing and next-season purchase intent drops

---

## 8. A/B Testing for Monetisation

### What to Test
- **Price points:** Does a 20% price reduction increase conversion enough to offset per-unit revenue loss?
- **Bundle composition:** Does adding a cosmetic to a currency bundle increase purchase rate?
- **Offer timing:** Does showing the starter pack after the first boss fight vs after the tutorial convert better?
- **Store layout:** Does moving the best-value pack to the first position increase overall spend?
- **FOMO duration:** Do 24-hour offers convert better than 72-hour offers?

### What Not to Test
- Core economy exchange rates (too systemic -- A/B groups would have fundamentally different game experiences)
- Progression speed for paying vs non-paying (creates community perception problems if discovered)
- Anything where the two cohorts can observe each other's different experience (multiplayer pricing differences)

### Sample Size Rules of Thumb
For a typical monetisation A/B test:
- To detect a 10% relative change in conversion rate at 95% confidence / 80% power, you need approximately 15,000-25,000 users per variant (depending on base conversion rate)
- Lower base rates require larger samples. A game with 2% conversion needs far more users than one with 8% conversion
- Run for at least 7 days to capture weekly cyclicality. 14 days is better. Results collected over a weekend only are unreliable
- **Guardrail metrics:** Always monitor retention and session length alongside revenue metrics. A price change that increases short-term ARPDAU but craters D7 retention is not a win
