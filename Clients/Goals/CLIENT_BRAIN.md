# Goals Studio -- Client Brain
### Compiled: 2026-05-12 | Sources: 28 files | Compiler: /compile-client

---

## Company Profile

- **Legal name:** GOALS AB [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Registered address:** Nybrogatan 55, 114 40 Stockholm, Sweden [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Country:** Sweden [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Product:** PlayGOALS (also referred to as "GOALS") -- a free-to-play competitive football (soccer) game [source: sow_proposal.md]
- **Business model:** Free-to-play with hard currency (coins) and soft currency (points) monetisation; no pay-to-win positioning [source: gg-monetization.md]
- **Key differentiators:** Unique player generation system (no licensed real players in base game), DNA system linking players to real footballers, aging/retirement mechanics, non-seasonal design philosophy [source: gg-overview.md] [source: sow_proposal.md]
- **Fundraising:** Town Hall (26 March 2026) included a "Fundraise update" agenda item, suggesting active fundraising [source: town_hall_260326.md]

## Product / Game

**Game name:** PlayGOALS / GOALS [source: sow_proposal.md]
**Genre:** Free-to-play competitive football (soccer) [source: gg-overview.md]
**Platforms:** Steam, Epic, PlayStation (PS4/PS5), Xbox [source: sow_proposal.md] [source: beta_community_sentiment_fresh.md]
**Stage:** Pre-launch (global launch target: 14 May 2026) [source: sow_proposal.md]
**Game format:** 1v1 and 5v5 modes [source: gg-leaderboards_rewards_and_mm.md]
**Match duration:** ~12 minutes per game [source: gg-leaderboards_rewards_and_mm.md]

### Core Mechanics

- **Unique players:** Every player in the game is unique. A DNA system allows players to inherit attributes from real-life footballers [source: gg-overview.md]
- **Aging system:** Players enter at age 18, age one year every two real-life weeks. Players retire between 32-41 years old with one year's notice. This is the primary demand sink for the economy [source: gg-overview.md]
- **Retired players:** Stored in the club. Maximum 3 retired players per squad in official modes. Retired players can be converted to Legends (soft currency cost based on rating) [source: gg-overview.md] [source: gg-monetization.md]
- **Player Exchange Tasks (PETs):** Players can submit players to complete tasks and receive rewards [source: gg-overview.md]
- **Player tiers:** Basic (40-59 OVR), Common (60-69), Uncommon (70-79), Rare (80-84), Epic (85-89), Legendary (90-94), Mythic (95-99) [source: player_pricing.md] [source: beta_liveops_fresh.md]

### Player Attributes

Six main outfield attribute categories, each with multiple sub-stats (1-99 scale, linear performance increase) [source: gg-player_attributes.md]:
- **Pace:** Acceleration, Speed
- **Shooting:** Attacking IQ, Finishing, Shot Power, Long Shots, Penalty Accuracy, Weak Foot
- **Passing:** Ground Pass, Lofted Pass, Through Pass, Crossing, Curve, Free Kick Accuracy
- **Dribbling:** Sprint Dribbling, Close Dribbling, First Touch, Agility, Balance, Skills
- **Defending:** Defensive IQ, Stand Tackle, Slide Tackle, Jockeying, Interceptions, Blocking
- **Physicality:** Jumping, Strength, Stamina, Aggression, Heading

Goalkeepers have separate attributes: Diving, Handling, Distribution, Reflexes, Awareness, Athleticism [source: gg-player_attributes.md]

### Game Modes

**Divisions (Ranked):** Div 10-1 + TOP 500 leaderboard. Strict SBMM. Seasonal rewards based on final division. Separate skill rating for 1v1 and 5v5 [source: gg-leaderboards_rewards_and_mm.md]

**Evolution (formerly Knockout):** Weekly 1v1 mode (Tuesday-Sunday). 4 divisions (Bronze/Silver/Gold/Elite) plus Knockout Division. Limited attempts. Only mode where players can earn stat upgrades. TOP 500 leaderboard based on longest streak [source: gg-leaderboards_rewards_and_mm.md] [source: gg-knockout.md]

**Ranked (Weekly):** Weekly rank system, Division 10 to Rank 1. Rankings reset weekly (Monday 09:00). Uses Ranking Points (up-only, based on games + performance). Matchmaking uses separate Skill Rating (does not reset). Soft currency rewards increase with opponent's skill rating (1.0x at 500 SR to 2.0x at 2500+ SR) [source: gg-ranked.md]

**Quick Play:** Casual 1v1 and 5v5. No skill rating impact, no rewards progression. Open matchmaking [source: gg-quick_play.md] [source: gg-leaderboards_rewards_and_mm.md]

**Tournaments:** GOALS-hosted repeatable tournaments. 4 rounds. Custom entry requirements (team rating, nationality, legends). Reward for winning claimable once per user. At least two per week [source: gg-leaderboards_rewards_and_mm.md]

**The Arena:** No leaderboard, matchmaking, or rewards [source: gg-leaderboards_rewards_and_mm.md]

### XP System

XP drives player upgrades. All players in inventory receive earned XP simultaneously. XP thresholds per tier: Basic 500K, Common 1M, Uncommon 1.5M, Rare 2.5M, Epic 4M, Legendary 5.5M, Mythic 7.5M [source: gg-xp_outlets_and_values.md]

XP sources [source: gg-xp_outlets_and_values.md]:
- Match rewards: Ranked (Win 10K/Loss 5K), Quickplay (7.5K/3.75K), Friendly/Bot (5K/2.5K) -- all multiplied by game-time fraction
- Challenges and Swaps: 500K XP per week
- Ranked tier rewards: 100K-600K XP across 5 tiers
- Tournaments: Round-based XP plus victory bonus (250K first win, 100K repeats)
- Daily first game: 50K XP bonus
- Weekly first game: 100K XP bonus

### Beta Performance (March 2026)

- **Installs:** 220K total; 48K in December alpha [source: town_hall_260326.md]
- **Matches played:** 832K 1v1 games [source: town_hall_260326.md]
- **D1 retention:** 36% overall beta; 34% on PS5; 37% on Steam (124,571 installs) [source: town_hall_260326.md]
- **Average daily playtime:** 57 minutes per user (peak ~66 min on weekends) [source: town_hall_260326.md]
- **Average matches per day:** 4.6 per user [source: town_hall_260326.md]
- **CPI:** Reduced from $3.61 to $0.43 (88% reduction) [source: town_hall_260326.md]
- **Discord:** Grew from 15,044 to 26,688 users during beta (77.4% growth) [source: town_hall_260326.md]
- **Recommendation score:** 8.0/10 average; NPS +24.6 (40% promoters, 15.5% detractors) [source: beta_community_sentiment_fresh.md]
- **Crossplay:** 82.5% stable experience [source: beta_community_sentiment_fresh.md]
- **Companion app:** Average 5.13 minutes per active user; peak 24.48% adoption by March 24 [source: town_hall_260326.md]
- **Creator programme:** 54 accepted from 180 applications; 40+ onboarded [source: town_hall_260326.md]
- **Top creators:** flokox (~266K Twitch), prinsipe (~243K Twitch), OmegaLukeGaming (~181K YouTube) [source: town_hall_260326.md]

### Community Sentiment (Beta)

**What players love** [source: beta_community_sentiment_fresh.md]:
- Input responsiveness: 3.90/5 (76% positive)
- Economic fairness / no P2W: 3.76/5 (66% positive)
- Knockout mode: 3.83/5 (66.2% satisfied) -- highest mode score
- Unique player appeal: 3.72/5; Aging strategy: 3.68/5 (62% accept it)

**Critical friction points** [source: beta_community_sentiment_fresh.md]:
- Defensive AI: 2.54/5 -- LOWEST metric (50.9% negative). CBs split, defenders abandon position, midfielders fail to hold shape
- Passing system: 203/509 respondents cited as top disappointment (39.9%). Wrong target, wrong direction, too slow
- Stability/collisions: 36 crash/freeze bugs (15% of all bugs). Ping spikes, cross-region routing issues

**Most requested features** [source: beta_community_sentiment_fresh.md]:
1. Pro Clubs / 5v5 Ranked Mode (27 upvotes + 80+ survey mentions)
2. Passing Assistance Slider (24 upvotes + 203 survey mentions)
3. 5v5 Ranked Queue with Rewards (22 upvotes + 40+ survey)
4. Custom Tournament Mode (16 upvotes)
5. In-Game Transfer/Player Market (12 upvotes + 30+ survey)

**Mode popularity** [source: town_hall_260326.md]:
- Ranked (1v1): 34.91% of time
- Private Matches: 19.70%
- Knockouts: 17.22%
- Solo/Bot: 15.21%
- Quick Play: 7.63%
- Tournaments: 5.33%

**Top regions (beta communicators):** UK (1,274), France (1,026), USA (919), Italy (762), Turkey (667), Brazil (495), Germany (460) [source: town_hall_260326.md]

## Key Contacts

| Name | Role | Notes |
|---|---|---|
| Jonas Rundberg | CEO, Goals AB | Primary client contact. Decision-maker on pricing and strategy. Risk appetite question outstanding [source: handoff_2026-04-21_goals_deliverables.md] [source: critical_questions.md] |
| Julius | Live Ops (referred to as live ops specialist) | Technical contact for pricing tables, platform submissions, and store configuration [source: critical_questions.md] [source: handoff_2026-04-21_goals_deliverables.md] |
| Frans | Design lead | Key collaborator for live service design alignment and matchmaking [source: sow_proposal.md] [source: gg-knockout.md] |

## Engagement History and Commercial Terms

### Master Services Agreement

- **Parties:** National Business Innovations LLC (NBI LLC, North Carolina) and GOALS AB [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Signed by NBI:** Tom Rieger, President and CEO [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **MSA period:** 8 April 2026 through 31 December 2026 [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Payment terms:** 15 business days after acceptance of invoice. Reverse VAT charge applies [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Work product ownership:** All work product (for which Client has paid) assigned to Client. NBI retains proprietary tools/systems unless specifically paid for [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **NDA:** Standard mutual NDA provisions covering proprietary information [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Governing law:** North Carolina [source: GOALS NBI Master Services and SOW 8 April 2026.txt]

### Statement of Work 1 (Active)

- **Objective:** Provide insight into Client's regional pricing strategy based on competitive benchmarks and analysis [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Fee:** 100,000 SEK (~$10K USD / ~116 estimated hours) [source: GOALS NBI Master Services and SOW 8 April 2026.txt] [source: handoff_2026-04-21_goals_deliverables.md]
- **Payment:** Full amount invoiced upon delivery of consolidated findings [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Period of performance:** Approximately two weeks [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Deliverable:** Written summary consolidating findings and recommendations, plus remote review with Client [source: GOALS NBI Master Services and SOW 8 April 2026.txt]
- **Scope:** Review competitive pricing positioning in sports/football space; assess current pricing plans against market norms; recommendations on adjustments and risk areas [source: GOALS NBI Master Services and SOW 8 April 2026.txt]

### Original NBI Proposal (Pre-SOW)

NBI proposed two workstreams totalling $62,940 + optional $2,500 [source: sow_proposal.md]:
- Workstream 1: Pricing Benchmarking and Monetisation Strategy ($17,500) -- competitive analysis, regional pricing framework, CRO review
- Workstream 2: Live Service Consulting ($45,440) -- content cadence, A/B testing playbook, 90-day roadmap, team workshop
- Optional: "Our Creators" Risk white paper ($2,500)
- Payment: 30% ($18,882) upfront on authorisation; remainder on deliverable acceptance

**Note:** The signed SOW 1 covers only the pricing benchmarking work at 100,000 SEK. The live service consulting workstream was not included in the signed SOW [source: GOALS NBI Master Services and SOW 8 April 2026.txt] [source: sow_proposal.md]

### Project Structure (WorkSage)

21 tasks across 5 features, tracked in WorkSage. Key deadline: platform submission by 27 April 2026 (Xbox and PlayStation pricing review ~9 days + buffer before 14 May launch) [source: handoff_2026-04-21_goals_deliverables.md]

### Deliverables Produced

- Excel project tracker (v3): `goals_pricing_engagement_plan_v3.xlsx` -- 6 sheets (Overview, Task Tracker, Timeline, Risk Register, Deliverable Structure, WorkSage Import) [source: handoff_2026-04-21_goals_deliverables.md]
- Word task guide: `Goals_Pricing_Engagement_Task_Guide.docx` -- executive summary, 21 tasks with How/Done When, risks, timeline [source: handoff_2026-04-21_goals_deliverables.md]
- Competitive MTX research pipeline: 315 normalised price points across 12 competitors, 147 citations. Quality score: 93/100 post red-team review [source: FINDINGS_SUMMARY.md] [source: RED_TEAM_REPORT.md]
- GUIDE.md for competitive research deliverable navigation [source: competitive_research/GUIDE.md]

## Domain Context

### Pricing and Economy

#### Dual Currency System

- **Hard currency (coins):** Purchased with real money only. Used for store items (kits, celebrations, Originals packs). Some player packs also available for coins [source: gg-monetization.md]
- **Soft currency (points):** Earned through gameplay and by discarding/selling players. Used for player packs, player upgrades, legend conversions, marketplace trading. Cannot be directly purchased, but HC-to-SC conversion happens via buying and discarding players [source: gg-monetization.md]
- **Marketplace fee:** 10% soft currency tax on every trade (economy drain) [source: gg-monetization.md]
- **Base conversion rate:** 25,000 points = $6 USD = 500 coins [source: pricing_model_fresh.md]

#### Hard Currency Pack Structure

6 tiers proposed (super-low 19% discount curve selected for Suggestion sheet) [source: pricing_model_fresh.md]:

| HC Amount | USD Price | Soft Currency Equivalent | Bonus |
|---|---|---|---|
| 380 | $5.99 | 19,000 | None |
| 650 | $9.99 | 32,500 | 625 + 25 bonus |
| 1,375 | $19.99 | 68,750 | 1,250 + 125 bonus |
| 2,100 | $29.99 | 105,000 | 1,900 + 200 bonus |
| 3,750 | $49.99 | 187,500 | 3,100 + 650 bonus |
| 7,750 | $99.99 | 387,500 | 6,000 + 1,750 bonus |

Multi-currency pricing submitted for EUR, JPY, and Asia USD [source: pricing_model_fresh.md]

#### Player Pricing

| Tier | Target Distribution | Store Price (points) | Discard Value | Marketplace Min-Max |
|---|---|---|---|---|
| Basic | 100,000 | 1,000 | 100 | 150-5,000 |
| Common | 50,000 | 2,500 | 250 | 300-10,000 |
| Uncommon | 20,000 | 6,500 | 650 | 800-25,000 |
| Rare | 3,333 | 30,000 | 3,000 | 3,500-125,000 |
| Epic | 250 | 250,000 | 25,000 | 30,000-1,500,000 |
| Legendary | 16 | 2,500,000 | 250,000 | 300,000-8,000,000 |
| Mythic | 1 | 20,000,000 | 2,000,000 | 2,100,000-50,000,000 |

[source: player_pricing.md]

#### Store Offers

**Launch items** [source: gg-monetization.md]:
- Player packs (soft or hard currency)
- Kits (hard currency only): home/away slots, separate GK design
- Celebrations (hard currency only): goal celebrations, team-level

**Post-launch planned** [source: gg-monetization.md]:
- Footballs, Stadiums, Stadium customisation assets
- Originals packs (real-life footballer resemblances, ~70-85+ starting rating, subject to aging)
- Celebrity packs (real-life celebrities, lower guarantees, randomised stats)
- Penalty/free kick run-ups

**Revenue model assumptions** [source: pricing_model_fresh.md]:
- MAU: 805,250 (3.6x beta installs)
- Payer rate: 10.4%
- Per-user store points value: ~1.69M
- Per-user USD value: $404.80
- Projected total revenue (805K MAU): $2.72M
- ARPU: $3.38; ARPPU: $32.48
- Revenue split: Packs 96.9%, Kits 3.1%

**Three player personas** [source: pricing_model_fresh.md]:
- Persona 1 (Core FUT, daily): 20% of population, 30% paying, ARPPU $46
- Persona 2 (Dedicated FUT, 2-3x/week): 35%, 10% paying, ARPPU $15.81
- Persona 3 (Casual FUT, few times/month): 45%, 2% paying, ARPPU $7.24

#### Economic Drivers

Store items, Swaps (player exchange with custom requirements), Tournaments (entry requirements drive player demand), Challenges (player-specific requirements), Marketplace (soft currency demand + 10% fee sink), Progression system (soft currency sink for upgrades), Legend conversion (soft currency cost for retired players) [source: gg-monetization.md]

#### Regional Pricing Matrix

Global pricing matrix covering 40+ countries across Sony, Xbox, Steam, and Epic. Benchmarked against EA FC and Arc Raiders per region. Currency-specific pricing for EUR, GBP, AUD, NZD, PLN, CHF, NOK, DKK, SEK, CZK, ZAR, UAH, TRY, ILS, RON, HUF, ARS, BRL, JPY, MXN, KRW, HKD, MYR, THB, TWD, IDR, SGD, CAD, VND, PHP, CNY, INR, and more [source: goals_pricing_matrix.md]

Notable regional flags [source: goals_pricing_matrix.md]:
- Poland, South Africa, UAE, Kuwait, Saudi Arabia, Qatar, Hungary, Singapore: flagged as needing potential downward adjustment ("Move down to ~5%" or "~0%")
- Japan, South Korea: flagged as needing upward adjustment ("Move up to ~-5%")
- Brazil, Malaysia, Thailand: flagged for further review ("Move down to ~-15%")
- Ukraine, India, Indonesia: priced below exchange rate (intentional, marked as acceptable)

#### Competitive MTX Research Findings

Research covers 12 competitors with 315 normalised price points [source: FINDINGS_SUMMARY.md]:

**Key benchmarks:**
- Entry-level tier: $0.99/100 HC is the football genre standard (EA FC, UFL, eFootball all match). Goals' entry is $5.99/380 HC -- no micro-entry tier [source: FINDINGS_SUMMARY.md]
- Volume discount curves cluster at 15-23% industry-wide. Goals' 22% aligns [source: FINDINGS_SUMMARY.md]
- EA has NEVER raised USD prices on existing tiers (8-year history). Strategy: add higher ceiling tiers, restructure mid-range, adjust non-USD currencies [source: FINDINGS_SUMMARY.md]
- UFL (closest F2P football competitor): first 3 tiers match EA FC exactly; upper tiers diverge. Caps at $79.99 vs EA FC $149.99 [source: FINDINGS_SUMMARY.md]
- USD prices on currency packs are functionally permanent across all competitors studied [source: FINDINGS_SUMMARY.md]

**Data quality:** Red team scored 93/100 after remediation. 3 critical and 5 high issues all fixed. Remaining items medium/low and non-blocking for delivery [source: RED_TEAM_REPORT.md]

### Live Operations

#### Beta LiveOps (March 9-22, 2026)

Main goals: maximise D1 and D7 retention, convert to competitive modes, test Knockout mode [source: beta_liveops_fresh.md]

Key events and mechanics [source: beta_liveops_fresh.md]:
- **Retention:** Comeback Tomorrow (1x Legendary+), Come Back Day 7 (1x Mythical), Daily login (1x Rare), Complete the Team daily (1x Epic per position), Winback (return after 3/7 days inactive)
- **Companion app:** Download reward (1x Epic), daily reward (2x Uncommon+), push notification reward (2x Rare+)
- **Community:** Wishlist reward, platform linking reward, Discord codes
- **Store:** Starter Pack (1x Rare+ 1x Uncommon+, 15K points), basic packs, kits (Pulse, Mech, National), daily free packs
- **Onboarding:** Amateur/Intermediate/Professional scenarios with progressive rewards

Beta economy data [source: town_hall_260326.md]:
- Top packs by revenue: 1 Epic+ (38.9% of revenue), 5x Rare+ International (15.6%), 1 Rare+ (12.2%)
- Top packs by volume: 10 Basic+ (42.2%), 5 Basic+ (18.4%)
- Top 3 packs = 66.7% of points spent despite 14.2% of volume
- Packs: 96.9% of revenue; Kits: 3.1%
- Top kit: Brazil (32.7% of kit volume)
- Average squad OVR climbed from 73.06 to 79.79 over beta

#### Release LiveOps Plan (May-September 2026)

5-month roadmap with escalating ARPPU targets [source: release_liveops_fresh.md]:
- **May (Kickoff):** ARPPU ~$2.21, D1 35% to D3 20%. Founder's Season, $1.99 starter pack, Daily Matchday Routines
- **June (Scale-Up):** ARPDAU $0.40, ARPPU $13.19. 10 Core Market kits, World Cup warm-up, national player packs
- **July (Peak):** ARPDAU $0.50, ARPPU $26.94. World Cup maximisation, real-time matchup packs, premium tech variants
- **August (Sink):** ARPDAU $0.55, ARPPU $31.73. Drain hoarded currency, End of Summer Sale (30-40% off), transfer window tie-ins
- **September (Maturation):** ARPDAU $0.60, ARPPU $34.62. Whale targeting, ultra-premium content

Key events: Europa League Final (May 20), Champions League Final (May 30), World Cup (June 11 to July 19 final), UEFA Super Cup (Aug 12), Transfer Deadline Day (Aug 31), Champions League return (September) [source: release_liveops_fresh.md]

Brand partnerships planned: Puma kits (May), national kits (June), stadium/decor drops (late June) [source: release_liveops_fresh.md]

#### Brand Partnership Opportunities

Natural football context enables multiple avenues [source: gg-monetization.md]:
- Stadium branding (billboards, naming rights, scoreboard)
- Branded kits and accessories (boots, gloves)
- Branded player packs and cards
- Broadcast sponsorships (replays, half-time)
- Game mode branding (e.g. "GOALS x Kings League")
- In-game music (Spotify integration, goal songs)
- Branded tokens for exclusive store items

### Market Position and Competitors

**Direct competitors benchmarked** [source: FINDINGS_SUMMARY.md]:
- EA FC 26 (primary benchmark -- same genre, same spend profile)
- UFL (closest direct competitor -- F2P football, non-seasonal)
- eFootball (F2P football, closest business model comparison)

**Broader competitive set** [source: FINDINGS_SUMMARY.md]:
- Fortnite, Apex Legends, Rocket League, Valorant (F2P cosmetic pricing references)
- NBA 2K25, Madden NFL 25, F1 24 (EA cross-sport structure)

**Goals' positioning advantages** [source: beta_community_sentiment_fresh.md] [source: sow_proposal.md]:
- Anti-P2W commitment (community's red line -- any move toward paid competitive advantage triggers immediate churn)
- Unique player system (no licensed player dependency at base level)
- Non-seasonal design (no annual reset/repurchase cycle)
- Input responsiveness praised as core strength (3.90/5)

**Community competitor references:** "GOALS is SO much better than FC. The gameplay feels rewarding, not a chore." Players explicitly cite leaving EA FC and eFootball for GOALS [source: beta_community_sentiment_fresh.md]

## Open Questions

**Q1. D1 retention discrepancy:** SOW and proposal cite "50% D1 retention on PlayStation." Town Hall data shows PS5 at 34%, overall beta at 36%. May refer to a specific daily cohort or different metric. Needs clarification from Jonas [source: critical_questions.md] [source: handoff_2026-04-21_goals_deliverables.md]

**Q2. Which discount curve proposal is final?** Pricing Model shows four proposals (56%, 48%, 30%, 19% max discount). The Suggestion sheet uses super-low (19%). Has Jonas/Julius confirmed? [source: critical_questions.md]

**Q3. Day 1 store contents:** What items are specifically available on launch day? Determines whether 380 HC ($5.99) buys a satisfying item [source: critical_questions.md]

**Q4. Originals at launch:** Which real-life footballer Originals are confirmed? Revenue share is 0.7 in the model. If not ready for Day 1, the top-end HC demand driver is missing [source: critical_questions.md]

**Q5. Soft currency earn rate per hour:** Pricing Model shows accumulation range (60K to 1.05M points) but over what timeframe? At 57 min average daily play, what's the earn rate per session? Determines HC urgency [source: critical_questions.md]

**Q6. MAU assumption basis:** Beta had 220K installs. Model projects 805K MAU (3.6x). What UA budget and retention model supports this? [source: critical_questions.md]

**Q7. 10.4% payer rate timing:** Is this a month-1 target or steady-state? If steady-state applied to month 1, revenue model overstates early revenue by 3-5x [source: critical_questions.md]

**Q8. First-purchase starter pack feasibility:** Can Goals implement a "first-purchase double" or starter pack by May 14? Store system may be static SKU lists without conditional logic [source: critical_questions.md]

**Q9. Cross-platform purchase arbitrage:** Can a PS player buy HC through Steam/Epic to avoid 30% platform cut? If yes, players will arbitrage [source: critical_questions.md]

**Q10. Loot box regulation:** Do player packs with tier guarantees (Basic+, Rare+) trigger loot box regulations in Belgium, Netherlands, or other launch markets? [source: critical_questions.md]

**Q11. Board/investor revenue targets:** Town Hall mentioned fundraise update. If investors have specific launch revenue expectations for months 1-3, this constrains pricing strategy [source: critical_questions.md]

**Q12. Jonas's risk appetite on pricing:** "Are we too low?" implies willingness to raise. But how far? Community P2W red line limits even cosmetic price increases [source: critical_questions.md]

## Decision Log

| Date | Decision | Source |
|---|---|---|
| 2026-04-14 | Platform submission deadline: 27 April 2026 (originally recorded as 28 April; corrected based on Julius statement: ~9 days review + ~18 days before 14 May launch) | [source: handoff_2026-04-21_goals_deliverables.md] |
| 2026-04-08 | MSA signed between NBI LLC and GOALS AB; SOW 1 for 100,000 SEK pricing benchmarking engagement | [source: GOALS NBI Master Services and SOW 8 April 2026.txt] |
| 2026-03-31 | NBI proposal submitted covering pricing ($17.5K) + live service consulting ($45.4K). Client selected pricing only for SOW 1 | [source: sow_proposal.md] |
| Beta period | Aging system ratified as core mechanic: one year per two real-life weeks, retirement at 32-41, max 3 retired per official squad | [source: gg-overview.md] |
| Beta period | Non-seasonal design philosophy confirmed as fixed constraint (not negotiable in engagement) | [source: sow_proposal.md] |
| Beta period | Marketplace 10% tax set as soft currency drain mechanism | [source: gg-monetization.md] |
| Beta period | Ranking points reset weekly; Skill Rating does not reset (separate systems) | [source: gg-ranked.md] |

## Source Index

| File | Type | Key Content |
|---|---|---|
| gg-overview.md | md | Game overview: unique players, DNA system, aging, retired players, PETs |
| gg-monetization.md | md | Full monetisation design: currencies, store offers, economic drivers, brand partnerships |
| gg-player_attributes.md | md | All player attributes and sub-stats with gameplay effects and controls |
| gg-quick_play.md | md | Quick Play mode: 1v1 and 5v5, lobby system, friend invites |
| gg-ranked.md | md | Ranked mode: ranking points, skill rating, matchmaking, weekly rewards by rank |
| gg-knockout.md | md | Knockout mode: divisions, attempts, leaderboard, TOP 500 rewards |
| gg-xp_outlets_and_values.md | md | XP system: tier thresholds, match rewards, challenges, daily/weekly bonuses |
| gg-leaderboards_rewards_and_mm.md | md | Divisions, Evolution, Tournaments, Quick Play, Arena -- leaderboards, rewards, matchmaking |
| goals_pricing_matrix.md | md (from xlsx) | Regional pricing matrix for 40+ countries across all platforms |
| player_pricing.md | md (from xlsx) | Player tier pricing, distribution targets, discard/marketplace values |
| pricing_model_fresh.md | md (from xlsx) | Revenue model: MAU assumptions, personas, conversion rates, cosmetics comparison, HC proposals |
| beta_liveops_fresh.md | md (from xlsx) | Beta LiveOps: retention events, companion app, challenges, tournaments, store, swaps |
| release_liveops_fresh.md | md (from xlsx) | Release LiveOps roadmap May-September 2026: weekly plans, KPI targets, event calendar |
| beta_community_sentiment_fresh.md | md (from pptx) | Beta community sentiment: survey data, friction points, feature requests, verbatim quotes |
| town_hall_260326.md | md (from pptx) | Town Hall March 26: beta metrics, retention, Discord stats, economy data, creator programme |
| sow_proposal.md | md (from docx) | NBI's monetisation and live service proposal (31 March 2026) |
| critical_questions.md | md | 23 critical questions whose answers are not in existing materials |
| handoff_2026-04-21_goals_deliverables.md | md | Session handoff: deliverables produced, verification results, file inventory, remaining work |
| GOALS NBI Master Services and SOW 8 April 2026.txt | txt | Signed MSA + SOW 1: legal terms, 100K SEK fee, reverse VAT, 2-week period |
| competitive_research/output/FINDINGS_SUMMARY.md | md | Competitive MTX findings: 12 competitors, pricing benchmarks, longitudinal trends, cross-reference |
| competitive_research/output/RED_TEAM_REPORT.md | md | Red team audit: original score 53/100, final 93/100, all critical/high issues fixed |
| competitive_research/GUIDE.md | md | Navigation guide for competitive research deliverable |
| Goals_Pricing_Engagement_Task_Guide.docx | docx | Word document task guide for team (21 tasks, risks, timeline) |
| goals_pricing_engagement_plan_v3.xlsx | xlsx | Excel project tracker v3 (6 sheets) |
| GOALS Pricing Matrix (8).xlsx | xlsx | Raw regional pricing matrix spreadsheet |
| Player pricing.xlsx | xlsx | Raw player pricing model spreadsheet |
| Pricing Model.xlsx | xlsx | Raw pricing/revenue model spreadsheet |
| BETA LiveOps setup (4).xlsx | xlsx | Raw beta LiveOps event planning spreadsheet |
