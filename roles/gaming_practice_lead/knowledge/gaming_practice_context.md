# Gaming Practice Context -- Tier 2 Knowledge

**Loaded by:** Gaming Practice Lead and all four specialist consultants
**Purpose:** Foundation-level gaming industry knowledge for NBI consulting work
**Model:** Progressive expertise -- this file provides the base. Engagement-specific knowledge accumulates in memory files over time through client work.

Last updated: 2026-03-28

---

## 1. The Full Games Lifecycle

NBI advises across the entire lifecycle. Every stage has distinct consulting needs, client mindset, and deliverable types. The Practice Lead must know where a client sits in this lifecycle and what that means for the engagement.

### 1.1 Concept (Duration: 2-8 weeks)

**What happens:** The studio defines what the game is. Core fantasy, target audience, genre positioning, platform targets, and initial business model hypothesis. Often driven by a creative lead or small core team. May be speculative (studio exploring ideas) or directed (publisher brief, sequel mandate, IP adaptation).

**Consulting needs at this stage:**
- Market validation: is there an audience for this game? How crowded is the genre? What is the competitive landscape?
- Business model assessment: does the proposed monetisation approach fit the genre-platform combination?
- Feasibility check: can this studio build this game with the team and budget they have?
- Audience definition: who is the player? What are their expectations? What are their spending patterns?

**What to watch for:**
- Studios that fall in love with a concept before validating it commercially. Creative passion is essential but it must intersect with market reality
- Scope ambition that bears no relation to the team's size, budget, or experience
- Concept documents that describe features without explaining the player experience
- Missing platform strategy: "we will be on everything" is not a platform strategy

**Key deliverables:** Market validation report, audience analysis, competitive landscape, concept feasibility assessment, initial business model framework

### 1.2 Pre-Production (Duration: 3-12 months)

**What happens:** The concept becomes a plan. The team builds the Game Design Document and Technical Design Document. Key pillars are prototyped. The vertical slice (or equivalent proof-of-concept) is produced. The production plan is created. The team is assembled or expanded. Technology choices are locked.

**This is the highest-leverage consulting stage.** Decisions made in pre-production lock in 60-80% of the game's eventual cost, timeline, and quality ceiling. A flawed GDD drives months of wasted production. A wrong engine choice creates years of technical debt. An unrealistic production plan fails predictably.

**Consulting needs at this stage:**
- GDD review: is the design document complete, coherent, and producible?
- TDD review: is the technical approach sound? Does the architecture support the design ambitions?
- Production planning: is the schedule realistic? Are the milestones achievable? Is the team staffed correctly?
- Monetisation design: is the economy designed to be sustainable, fair, and profitable?
- Organisational design: does the team structure match the game's production needs?

**What to watch for:**
- GDDs that describe systems in isolation without explaining how they interact. The game is the system of systems, not the individual features
- Vertical slices that demonstrate technology but not gameplay. A beautiful tech demo that is not fun to play is a warning sign, not a proof point
- Production plans that assume 100% team utilisation with zero buffer. Real development has illness, iteration, blocked dependencies, and discovery work
- Teams that skip pre-production because "we know what we are building." They do not. Nobody does until they have prototyped it

**Key deliverables:** GDD assessment, TDD assessment, production plan review, economy design framework, team capability audit, risk register

### 1.3 Production (Duration: 12-36+ months)

**What happens:** The game is built. This is where money is spent, teams are at full capacity, and the plan meets reality. Production is a managed conflict between creative ambition, technical constraints, budget limits, and schedule pressure.

**Consulting needs at this stage:**
- Production health checks: is the project on track? Are milestones being hit? Is the team healthy?
- Scope management: what should be cut if the schedule slips? What is core vs nice-to-have?
- Technical oversight: is the build pipeline healthy? Are builds stable? Is technical debt being managed?
- Mid-production pivots: when the market shifts or playtests reveal problems, how does the game adapt?

**What to watch for:**
- Feature creep disguised as "polish." The difference between polish (making existing features better) and creep (adding new features) must be clear to everyone on the team
- Crunch as a plan. If the only way the schedule works is sustained overtime, the schedule is wrong. Crunch should be a short-term emergency measure, not a production strategy
- Build instability that nobody owns. If the game crashes regularly in internal builds and nobody is specifically tasked with build health, production velocity will collapse
- The "90% done, 90% to go" problem. Most games feel 90% done for months because the last 10% of features take 50% of the effort. Bug fixing, balancing, optimisation, and cert preparation are almost always underestimated

**Key deliverables:** Production health assessment, scope prioritisation framework, milestone review, build health report, team workload analysis

### 1.4 Alpha

**What happens:** The game is feature-complete (all planned features are implemented, even if unpolished). The focus shifts to integration, bug fixing, balancing, and performance. Internal playtesting intensifies. The game is playable end-to-end but rough.

**Alpha criteria (general -- studios vary):**
- All core gameplay loops functional
- All major systems integrated (progression, economy, social, etc.)
- All content types represented (not necessarily all content, but all content pipelines proven)
- Playable on target platforms
- No blocking defects (may have many non-blocking defects)

**Consulting needs:** Alpha readiness assessment, bug triage methodology, balancing approach, performance benchmarking against target hardware

### 1.5 Beta

**What happens:** The game is content-complete and undergoing polish, optimisation, and external testing. Closed beta (selected players) or open beta (anyone) depending on the game's strategy. For live-service games, beta is also a critical monetisation test -- this is where the studio learns whether players will spend.

**Beta is the last chance to change anything significant before launch.** After beta, changes are limited to bug fixes, balance adjustments, and minor polish. Structural changes to systems, economy, or content are extremely risky.

**Consulting needs:** Beta analysis (player behaviour, spend patterns, retention curves), economy tuning, live ops readiness assessment, launch plan review

**What to watch for:**
- Studios that treat beta as a marketing event rather than a testing phase. Beta exists to find problems. If the studio is not prepared to act on what beta reveals, it is a demo, not a beta
- Economy red flags in beta: if paying players are churning faster than free players, the monetisation is punitive. If nobody is spending, the value proposition is not landing. If whales are the only spenders, the economy is not broad enough
- Retention cliffs in beta data. If there is a massive drop at hour 2 or day 3, there is a FTUE problem or a content pacing problem that will not fix itself at launch

### 1.6 Certification (Console only)

**What happens:** Console games must pass certification (cert) from the platform holder (Microsoft, Sony, Nintendo) before they can be released. Cert tests compliance with platform technical requirements (TCRs/TRCs), not game quality. Cert failure delays launch.

**Typical cert timeline:** 2-6 weeks per submission. Failed cert requires fixes and resubmission, adding 2-6 more weeks per cycle.

**Common cert failures:**
- Save/load issues (corrupted saves, lost progress)
- Controller disconnect handling
- User account switching not handled correctly
- Network error states not handled gracefully
- Memory leaks or crashes under specific conditions
- Accessibility non-compliance (increasingly required)
- Missing or incorrect age ratings (PEGI/ESRB content)

**Consulting needs:** Cert readiness checklist, TCR/TRC compliance audit, cert submission planning

### 1.7 Launch

**What happens:** The game goes live. For premium games, this is the peak moment -- launch window sales drive the majority of lifetime revenue. For F2P games, launch is the start of the revenue lifecycle, not the peak.

**Launch considerations by business model:**
- **Premium (buy-to-play):** Launch week is everything. Marketing spend peaks, review embargoes lift, metacritic score is set. Day-1 bugs are reputation-defining. Price point must be validated pre-launch
- **F2P:** Launch is the start of a long optimisation process. Day-1 retention, day-7 retention, and first-purchase conversion are the critical early metrics. The game will iterate rapidly in the first 30-90 days. The launch version is the minimum viable product, not the final product
- **Games as a Service (GaaS):** Launch is the first season. The live ops content pipeline must already be producing content for Season 2 before Season 1 launches. If there is a content gap after launch, players leave and they rarely come back

**Consulting needs:** Launch readiness review, go-to-market plan, day-1 through day-30 monitoring plan, incident response planning

### 1.8 Live Operations (Duration: Months to years)

**What happens:** The game is live and being operated as a service. New content is released on a cadence (seasons, updates, events). The economy is tuned based on real player data. Bugs are fixed in live. The community is managed. The game competes for player attention against every other game on the market every day.

**Live ops is where most F2P revenue is generated.** A game can have a mediocre launch and still succeed if live ops is strong. A game can have a great launch and die within 6 months if live ops fails.

**Live ops consulting is the most data-intensive domain NBI covers.** Effective live ops advice requires access to real player data: DAU, MAU, retention curves, ARPDAU, conversion rates, session length, feature engagement, content completion rates, churn analysis.

**Consulting needs:** Live ops strategy, content cadence planning, event design, economy rebalancing, retention improvement, re-engagement campaigns, seasonal planning, community health assessment

**What to watch for:**
- Content treadmill burnout: the team cannot produce content fast enough to maintain the cadence. This is a production problem that manifests as a live ops failure
- Economy inflation: over time, F2P economies tend to inflate as the studio gives away more currency to retain players. If not managed, this erodes the value of purchases and destroys LTV
- Audience stagnation: the game stops acquiring new players and relies entirely on existing players spending more. This is a death spiral -- you cannot extract enough from a shrinking audience to sustain the game

### 1.9 Sunset

**What happens:** The game reaches end of life. Player population has declined to the point where continued operation is not economically viable. The studio must manage the wind-down: communicating with remaining players, disabling purchases (often legally required in advance of shutdown), potentially open-sourcing or creating an offline mode, and preserving the game's legacy.

**Consulting needs:** Sunset planning, player communication strategy, legal/regulatory compliance (refund obligations, consumer protection), team transition planning, IP preservation

---

## 2. Genre Frameworks

Each genre has distinct economics, design patterns, audience expectations, and consulting implications. The Practice Lead must know what makes each genre unique and adjust every recommendation accordingly.

### 2.1 MMO / MMORPG

**Core characteristics:** Persistent world, social systems, guild/clan mechanics, long-term progression (hundreds of hours), content-heavy, community-dependent. High production and operational cost. High player investment (emotional and time).

**Business models:** Subscription (traditional, declining), F2P with cosmetic monetisation (dominant), hybrid (buy-to-play with cosmetic shop), buy-to-play with expansions.

**Key metrics:** Monthly active users (MAU), daily active users (DAU), concurrent users (CCU), average revenue per paying user (ARPPU), average session length, social feature engagement (guild participation, group content completion), content completion rate, churn rate by content tier.

**Consulting considerations:**
- Content velocity is the central challenge. MMO players consume content far faster than studios can produce it. Every MMO engagement must address the content pipeline
- Economy design is critical and complex. MMO economies have multiple currencies, crafting systems, player-to-player trading, and long progression arcs. Small balance changes cascade across the entire system
- Social systems drive retention more than content. A player with friends stays. A solo player churns. Social system health is a leading indicator
- Server architecture decisions are effectively permanent. Sharding, megaserver, or instancing models cannot be easily changed post-launch
- Community management is a core competency, not a support function. An MMO community can be the game's greatest asset or its biggest liability

**NBI relevance:** Couch Heroes is an MMO engagement. Glen is fractional studio head. Deep MMO expertise is actively required.

### 2.2 Mobile Free-to-Play

**Core characteristics:** Short session length (2-15 minutes), energy/stamina systems, aggressive monetisation, rapid iteration, UA-driven growth, data-driven optimisation. High volume, low individual player investment. The game is a funnel, not an experience.

**Business models:** F2P with IAP (in-app purchases), F2P with ads (rewarded video, interstitials), hybrid (IAP + ads). Subscription models emerging for premium mobile.

**Key metrics:** Day-1/7/30 retention, ARPDAU (average revenue per daily active user), LTV (lifetime value), CPI (cost per install), ROAS (return on ad spend), conversion rate (free to first payer), session count per day, session length, IAP price point distribution.

**Consulting considerations:**
- Monetisation design is the engagement. On mobile F2P, the economy IS the game design. You cannot separate them. Every system, every progression curve, every friction point exists in relationship to the monetisation model
- UA economics determine viability. If CPI exceeds D30 LTV, the game cannot scale profitably. This math must work before marketing spend scales
- First-time user experience (FTUE) determines D1 retention, which determines everything else. If 50% of players quit in the first 5 minutes, no amount of late-game content matters
- Platform store economics: Apple and Google take 30% (15% for small developers in some programmes). This is a non-trivial factor in pricing and margin calculations
- A/B testing is the methodology. Mobile F2P studios make decisions with data, not intuition. If a consulting recommendation cannot be tested, it is less useful

**NBI relevance:** Sarge Universe is a mobile MMO. Goals Studio involves mobile store review. Mobile F2P literacy is essential.

### 2.3 Racing

**Core characteristics:** Pick-up-and-play accessibility, strong brand/IP dependency (licensed cars, real tracks), multiplayer-dependent (online or couch), high visual fidelity expectations, seasonal content tied to real motorsport calendars.

**Business models:** Premium (buy-to-play), premium with DLC (car packs, track packs), F2P with cosmetic/vehicle gacha (mobile), subscription (rare, emerging).

**Consulting considerations:**
- IP licensing is a major cost centre and constraint. Licensed vehicles must be depicted accurately. Licensing agreements restrict modifications, damage models, and sometimes competitive context (brand X car cannot lose to brand Y car in marketing materials)
- Multiplayer infrastructure quality is everything. Racing games with lag or desync are unplayable. Netcode quality is a core technical requirement, not a nice-to-have
- Seasonal content cadence often tied to real-world motorsport seasons, creating fixed content deadlines
- Accessibility spectrum is wide: arcade racers (broad audience) to simulation racers (niche, demanding). Consulting approach differs dramatically between them

### 2.4 Strategy / Clash-Style / 4X

**Core characteristics:** Deep systems, long session length, base-building, resource management, PvP and/or PvE, alliance/clan mechanics, long player lifecycles (months to years). Highly competitive metagame. Strategically demanding -- players who succeed invest significant cognitive effort.

**Business models:** F2P with speedup/resource IAP (dominant on mobile), premium with DLC (PC strategy), F2P with cosmetic monetisation (emerging).

**Key metrics:** Alliance participation rate, PvP engagement rate, speedup spend per player, resource conversion rates, player power curve (distribution across the player base), time-to-max (how long to reach endgame without spending).

**Consulting considerations:**
- Pay-to-win tension is the central design challenge. Strategy game monetisation often sells power (stronger troops, faster building, better equipment). If paying players dominate non-paying players too easily, the non-paying base (which provides content for the paying base) churns. The game collapses from the bottom
- Alliance systems drive retention. A player in an active alliance has 3-5x the retention of a solo player. Alliance health is the most important KPI after revenue
- Metagame health determines longevity. If one strategy dominates, the game becomes stale. Regular balance patches and new content must keep the metagame evolving
- Long player lifecycles mean high LTV potential but also high churn cost. Losing a 6-month player is losing years of potential revenue

### 2.5 Battle Royale

**Core characteristics:** Large-scale multiplayer (20-150 players per match), last-player/team-standing win condition, looting/scavenging mechanics, shrinking play area, quick match resolution (15-25 minutes), high skill expression, spectator-friendly (streaming/esports).

**Business models:** F2P with cosmetic monetisation and battle pass (dominant), premium (declining). Battle pass is the defining monetisation innovation of the genre.

**Key metrics:** Matches played per day, match completion rate, battle pass purchase rate, battle pass completion rate, squad play rate (solo vs group), skill-based matchmaking effectiveness, queue times.

**Consulting considerations:**
- Matchmaking is the product. If new players are consistently destroyed by experienced players, they quit and never return. SBMM (skill-based matchmaking) is technically complex and politically contentious (skilled players dislike it) but essential for retention
- The battle pass model requires a precise content pipeline. Every season needs enough new content to fill the pass, and the studio must commit to a cadence (typically 8-12 weeks per season) indefinitely
- Anti-cheat is a business-critical system. Cheating in competitive multiplayer destroys the experience for everyone. The studio's anti-cheat investment directly determines player trust
- Streaming and content creators are a primary marketing channel. The game must be watchable, not just playable

### 2.6 Idle / Incremental / Clicker

**Core characteristics:** Minimal active gameplay, automated progression, offline earnings, prestige/reset mechanics, extremely long player lifecycles, low production cost, high accessibility.

**Business models:** F2P with ads (primary revenue for many), F2P with IAP (speedups, auto-play, cosmetics), hybrid.

**Key metrics:** Retention (D1/7/30/90 -- lifecycle is very long), ad impressions per session, ad revenue per DAU, prestige cycle length, offline return rate, session frequency.

**Consulting considerations:**
- The economy IS the game. There is almost no "gameplay" in the traditional sense. The systems design, progression curves, and prestige mechanics are the entire player experience. Economy consultancy is effectively game design consultancy in this genre
- Ad mediation optimisation can meaningfully move revenue. Choosing the right ad networks, waterfall configuration, and ad placement timing is a specialised skill
- Production cost is low but lifetime operational cost can be high if the studio supports the game long-term. Content updates are cheap individually but the expectation of regular updates is indefinite
- Crossover with Telegram gaming platforms is growing. Telegram-native idle games have different distribution and monetisation dynamics (crypto integration, Telegram Stars, bot-based gameplay)

### 2.7 Other Genres NBI Should Be Literate In

**Survival/crafting:** Persistent worlds, player-built content, base building, PvP servers. Monetisation typically premium with cosmetic DLC. Server community health is the key operational challenge. Examples: Rust, Ark, Palworld.

**Roguelike/roguelite:** Procedurally generated content, permadeath, meta-progression between runs. Typically premium or premium with DLC. Low live-ops burden but high design complexity. Indie-dominant genre. Examples: Hades, Slay the Spire, Dead Cells.

**Puzzle/casual:** Short sessions, simple mechanics, broad audience, ad-dominant monetisation. Very data-driven. UA efficiency is the primary business challenge. Examples: Candy Crush, Royal Match.

**Simulation:** Deep systems, niche audiences, long play sessions. Premium or premium with DLC/expansion. Community modding is often essential for longevity. Examples: Cities: Skylines, Euro Truck Simulator, Farming Simulator.

---

## 3. Platform Landscape

Each platform has distinct economics, technical requirements, audience demographics, and business considerations. The Practice Lead must advise clients on platform-specific implications.

### 3.1 Steam (PC)

**Revenue share:** 30% (drops to 25% above $10M, 20% above $50M in game revenue).
**Audience:** Core and enthusiast gamers. Higher tolerance for complexity, longer sessions, willingness to pay premium prices. Strong indie discovery. Community-driven (reviews, forums, workshops).
**Discovery:** Algorithm-driven (queue, recommendations, tags), wishlists (critical leading indicator), Steam sales events (visibility opportunity), user reviews (overwhelmingly positive/positive/mixed/negative affects visibility algorithmically).
**Technical requirements:** No formal certification. Valve requires basic functionality (game must launch, no malware). Steamworks SDK integration for achievements, cloud saves, multiplayer. Linux/Steam Deck compatibility increasingly important (Proton compatibility layer).
**Key considerations for consulting:**
- Wishlist count before launch is the strongest predictor of first-week sales. The marketing plan must be built around wishlist accumulation
- Steam refund policy (under 2 hours played) means the first 2 hours of the game must be compelling
- Early Access is a valid development and business model on Steam but requires careful management. The EA community will make or break the game based on the studio's communication and update cadence
- Price point expectations: $30-70 for AA-AAA, $10-30 for indie. F2P on Steam carries a stigma it does not carry on mobile
- Steam Deck compatibility is a meaningful sales driver. Games that are "Verified" for Deck get an algorithmic boost

### 3.2 Xbox (Console + PC via Microsoft Store/Game Pass)

**Revenue share:** 30% standard (12% for games brought to Xbox via ID@Xbox in some programmes).
**Audience:** Mainstream to core gamers. Strong social/multiplayer orientation. Game Pass has fundamentally changed buying behaviour -- many Xbox players expect to access games through subscription rather than purchase.
**Game Pass impact:** Game Pass deals can provide significant upfront revenue (lump sum payment) but cannibalise retail sales. The economics must be modelled carefully: Game Pass payment vs projected retail revenue, audience reach vs revenue per player, discovery benefit vs devaluation of the product.
**Technical requirements:** Xbox certification (TCRs -- Technical Certification Requirements). Must pass Microsoft's cert process. Xbox Live integration required for multiplayer. Smart Delivery for cross-generation support.
**Key considerations for consulting:**
- Game Pass has become the default way many Xbox players access new games. A client's launch strategy must have a clear Game Pass position: pursuing a deal, or planning for retail sales knowing many potential buyers will wait for Game Pass inclusion
- Cross-play expectations are high. Xbox players expect to play with PC players (at minimum) and increasingly with PlayStation players. Cross-play is a technical and political challenge
- Achievement system integration is expected and should be designed intentionally, not bolted on
- ID@Xbox programme provides indie studios with development kits and certification fee waivers

### 3.3 PlayStation (Console)

**Revenue share:** 30%.
**Audience:** Core gamers with strong single-player and narrative preferences. PlayStation has the strongest first-party single-player brand. Multiplayer is important but single-player quality is the platform's identity.
**Technical requirements:** PlayStation certification (TRCs -- Technical Requirements Checklist). Sony's cert process. PSN integration required. DualSense controller features (haptic feedback, adaptive triggers) are a differentiation opportunity.
**Key considerations for consulting:**
- PlayStation's audience tends to value production quality and polish more than other platforms. A game that is acceptable on Steam may not meet PlayStation player expectations
- PS Plus (Essential/Extra/Premium tiers) is Sony's subscription response to Game Pass. Different tier economics and player behaviour than Game Pass
- DualSense features can be a genuine differentiator if used well. Studios that invest in haptics and adaptive triggers see positive review sentiment
- Japan market access: PlayStation has stronger presence in Japan than Xbox. Games targeting Japanese audiences should prioritise PlayStation

### 3.4 iOS (Apple App Store)

**Revenue share:** 30% (15% for developers earning under $1M/year via App Store Small Business Programme).
**Audience:** Broadest audience of any platform. From casual puzzle players to mid-core RPG players. Skews toward higher spending per player than Android (in Western markets).
**Technical requirements:** App Store Review Guidelines (content, privacy, functionality). App Tracking Transparency (ATT) framework -- fundamentally changed mobile UA by limiting tracking. StoreKit 2 for in-app purchases. iOS version support requirements.
**Key considerations for consulting:**
- ATT has made mobile UA significantly harder and more expensive since 2021. Player acquisition strategies must account for limited tracking. SKAdNetwork (SKAN) is the primary attribution mechanism and it provides far less data than the old model
- App Store featuring can drive massive installs but Apple's featuring is editorial (relationship-driven) not algorithmic. Studios that invest in the Apple relationship (using new Apple tech, high production quality, Apple Arcade consideration) get more featuring
- Subscription monetisation is growing on iOS. Apple takes 30% in year 1, 15% in year 2+ for auto-renewing subscriptions
- Privacy requirements are increasingly strict. Apps must declare all data collection in App Store privacy labels. Non-compliance causes rejection
- Price tier structure: IAPs must use Apple's price tier system. The studio does not set exact prices -- they choose a tier, and Apple determines the local price in each currency

### 3.5 Android (Google Play Store)

**Revenue share:** 30% (15% for the first $1M of annual revenue).
**Audience:** Largest mobile audience by install base. Broader economic range than iOS -- significant player bases in markets with lower spending (India, Southeast Asia, Brazil, MENA). Higher install volumes, lower average revenue per install than iOS (in Western markets).
**Technical requirements:** Google Play policies (content, privacy, billing). Google Play Billing Library for IAPs. Android version fragmentation (must support a range of devices and OS versions).
**Key considerations for consulting:**
- Device fragmentation is the central technical challenge. Thousands of device models with varying capabilities. A game that runs well on a flagship Samsung phone may crash on a budget device that represents 30% of the target market
- Alternative distribution: APK sideloading is possible on Android. Third-party stores exist (Samsung Galaxy Store, Amazon Appstore, Huawei AppGallery). Some studios distribute outside Google Play to avoid the revenue share
- Google Play's 15% rate on the first $1M is more generous than Apple's equivalent programme for most small developers
- Android-first markets (India, Indonesia, Brazil) have distinct player behaviour: lower ARPU but massive volume. Monetisation strategies for these markets differ significantly from US/EU

### 3.6 Telegram

**Revenue share:** Varies by integration method. Telegram Stars (in-app currency) involves Telegram's commission. Crypto/TON blockchain payments have different economics.
**Audience:** Growing gaming audience, particularly in CIS, MENA, and Southeast Asia. Younger demographic. High overlap with crypto/web3 audience. Social-first platform -- games spread through group chats and channels.
**Technical requirements:** Telegram Bot API and/or Telegram Mini Apps framework. TWA (Telegram Web Apps) for more complex games. TON blockchain integration for crypto-based games. HTML5-based (no native app distribution).
**Key considerations for consulting:**
- This is an emerging platform with rapidly evolving economics. Best practices are not established. The Practice Lead should approach Telegram engagements with more uncertainty than established platforms
- Distribution is social and viral. Telegram games spread through groups, channels, and referral mechanics. Traditional UA does not apply. Growth strategy is community strategy
- Crypto/TON integration creates new monetisation models (play-to-earn, NFT-based, token economics) but also regulatory complexity and audience segmentation (crypto-native vs mainstream)
- Production quality expectations are lower than mobile app stores. HTML5 games with simpler graphics can succeed. The bar is fun and social mechanics, not visual fidelity
- Idle and clicker games have found strong product-market fit on Telegram. The platform's notification system and asynchronous nature suit games that reward periodic check-ins

**NBI relevance:** Sarge Universe is targeting mobile but Telegram is increasingly relevant for mobile MMO distribution. Platform literacy is essential for advising clients on multi-platform strategy.

---

## 4. What Good Game Documents Look Like

### 4.1 Game Design Document (GDD)

A GDD is not a wish list. It is an engineering specification for a creative product. A good GDD enables a developer who has never spoken to the designer to build the correct feature. A bad GDD forces the developer to guess, and they will guess wrong.

**Essential sections (the absence of any of these is a gap):**

1. **Game overview:** What is this game in one paragraph? Genre, platform, target audience, core fantasy, business model. The elevator pitch, but written for the development team
2. **Core gameplay loop:** What does the player do moment-to-moment? Minute-to-minute? Session-to-session? Day-to-day? Each timescale should be described explicitly. If the designer cannot articulate the core loop at every timescale, the design is incomplete
3. **Systems design:** Each game system (combat, crafting, progression, social, economy, etc.) described with: purpose (why it exists), mechanics (how it works), relationships to other systems (what it affects and what affects it), edge cases (what happens at the extremes)
4. **Progression design:** How does the player advance? What are the progression axes (power, cosmetic, skill, content access)? What is the progression pace at each stage? What is the endgame? How does progression interact with monetisation?
5. **Economy design:** All currencies (hard, soft, premium), sources and sinks, pricing model, value exchange (what does the player get for spending?), economy health metrics, anti-inflation mechanisms. This section must be quantified, not just described
6. **Content plan:** What content types exist? How much content is needed for launch? What is the content production pipeline? What is the live content cadence post-launch? Content is the fuel for retention -- the GDD must plan for it
7. **Monetisation design:** What is sold? At what price points? Through what UX flows? What is the free-to-paid conversion strategy? What are the ethical guardrails? How does monetisation interact with gameplay? (For premium games: DLC strategy, edition strategy, MTX if any)
8. **Platform considerations:** What does each target platform require or enable? Platform-specific features, input methods, performance targets, cert requirements
9. **Target audience:** Who is the player? Demographics, psychographics, genre familiarity, spending behaviour, platform preference. "Gamers aged 18-35" is not an audience definition
10. **Competitive analysis:** What games compete for this audience's attention? What does this game do differently or better? Where are the gaps in the market?
11. **Accessibility:** How does the game accommodate players with different abilities? Remapping, colour-blind modes, subtitle options, difficulty settings. Increasingly a cert requirement, not just a nice-to-have
12. **Localisation:** What languages at launch? What localisation approach (full, partial, text-only)? Cultural considerations for different markets?

**Red flags in GDDs:**
- Systems described in isolation without explaining interactions
- No quantification of the economy (just words, no numbers)
- "We will balance this in testing" appearing repeatedly (means the designer has not done the work)
- Feature lists without player experience descriptions (what the player DOES, not what the game HAS)
- Missing progression endgame (what happens when the player has done everything?)
- No content plan or an unrealistic content plan

### 4.2 Technical Design Document (TDD)

**Essential sections:**

1. **Architecture overview:** High-level system architecture. Client-server model, service decomposition, data flow diagrams. An architect should be able to read this section and understand the system
2. **Tech stack:** Engine, language(s), key frameworks, third-party services, infrastructure providers. With justification for each choice (why this engine, not that one?)
3. **Networking and multiplayer:** Netcode model (client-authoritative, server-authoritative, hybrid), tick rate, latency handling, matchmaking architecture, anti-cheat approach
4. **Data architecture:** Database schema design, data pipeline, analytics event taxonomy, GDPR compliance approach, data retention policy
5. **Scalability plan:** How does the system handle 10x, 100x the launch player count? What are the scaling limits? What costs scale linearly vs sublinearly?
6. **Build and deployment:** CI/CD pipeline, build times (current and target), deployment process, rollback capability, feature flagging
7. **Performance targets:** Frame rate, load times, memory budget, network bandwidth, battery usage (mobile). Per platform
8. **Security:** Authentication, authorisation, data encryption, server-side validation, exploit mitigation
9. **Third-party integrations:** Platform SDKs, analytics (what provider, what events), ad networks (mobile), payment providers, social features

---

## 5. How to Assess a Studio's Health and Readiness

### 5.1 The Health Assessment Framework

Studio health is assessed across six dimensions. Each dimension is rated GREEN (healthy), AMBER (concerns), or RED (critical issues).

**1. Team**
- Are the right roles filled? (Programming, art, design, production, QA at minimum)
- Are there key-person dependencies? (One person who, if they left, would halt the project)
- What is the experience level? (First game vs shipped multiple titles)
- Is the team size appropriate for the scope? (10 people cannot build an MMO)
- Are there obvious hiring gaps?
- What is team morale/health? (Overtime patterns, turnover, glassdoor signals)

**2. Process**
- What development methodology? (Scrum, Kanban, waterfall, ad hoc)
- Are sprints healthy? (Consistent velocity, reasonable scope, retrospectives happening)
- Is there a production plan with milestones?
- How is quality managed? (QA process, bug triage, regression testing)
- How are decisions documented and communicated?

**3. Technology**
- Is the engine choice appropriate for the game?
- Are build times acceptable? (>30 minutes is a red flag for iteration speed)
- Is there a CI/CD pipeline?
- What is the technical debt situation?
- Are there architectural risks? (Single points of failure, scaling limitations)

**4. Product**
- Is the game fun? (The fundamental question)
- Is the design documented and complete?
- Does the scope match the budget and timeline?
- Is the game differentiated in its market?
- Are there clear success metrics defined?

**5. Financial**
- What is the runway? (How many months of operation can the studio fund?)
- What is the monthly burn rate?
- Is the revenue model viable? (CPI vs LTV for F2P, market size vs price point for premium)
- What is the funding stage? (Self-funded, seed, Series A, publisher-funded)

**6. Organisation**
- Is the reporting structure clear? (Everyone knows who they report to and who makes which decisions)
- Is decision-making authority defined? (Who can greenlight a feature change? Who approves scope cuts?)
- Are there communication problems? (Silos, information not flowing, conflicting direction from leadership)
- Is studio culture supporting or hindering development? (Fear of failure, blame culture, no psychological safety)

### 5.2 Calibrating by Client Type

**Indie CEO (team of 5-30, first or second game, self-funded or seed-funded):**
- Expects direct, practical advice they can implement immediately
- Often wearing multiple hats -- the CEO is also the lead designer and the producer
- Budget-sensitive. Consulting advice must be achievable within their resource constraints
- Process maturity expectations are lower. "You should implement Scrum" is less useful than "here are the three production habits that will make the biggest difference for a team your size"
- Relationship is personal. The indie CEO is betting their career and often their savings on this game. Respect that investment. Be honest but not dismissive

**AA Studio Director (team of 50-200, multiple shipped titles, publisher-funded or self-sustaining):**
- Expects strategic depth and data-driven recommendations
- Has existing processes and infrastructure -- advice must integrate with what exists, not assume a blank slate
- Often dealing with publisher relationship dynamics (funding milestones, approval gates, creative constraints)
- Department-level problems: the issue is usually not that nobody knows what to do, but that departments are not aligned or that an organisational structure is creating friction
- Deliverables should be structured for internal circulation -- the director needs to present the findings to their own leadership and teams

**AAA Publisher VP (portfolio-level, overseeing multiple studios and titles):**
- Expects strategic framing that survives their internal approval chain
- Thinking in portfolio terms: how does this title fit the slate? What is the risk profile? What is the ROI case?
- Data and benchmarks are the language. Every recommendation must be supported by industry data
- Political awareness matters. The VP is operating in a large organisation with competing priorities. Advice that is technically correct but politically impossible is useless
- Deliverables must be executive-grade: concise executive summary, detailed appendix, clear investment thesis

---

## 6. Key Industry Benchmarks

These benchmarks provide baseline references. They vary significantly by genre, platform, and market. Always contextualise benchmarks -- a D1 retention of 35% is poor for a casual puzzle game and excellent for a hardcore strategy game.

### 6.1 Retention Benchmarks (Mobile F2P)

| Metric | Casual | Mid-Core | Hardcore |
|---|---|---|---|
| Day 1 | 40-50% | 30-40% | 25-35% |
| Day 7 | 18-25% | 12-18% | 10-15% |
| Day 30 | 8-12% | 5-8% | 4-7% |
| Day 90 | 3-5% | 2-4% | 2-3% |

### 6.2 Monetisation Benchmarks (Mobile F2P)

| Metric | Low | Median | High |
|---|---|---|---|
| Conversion rate (free to payer) | 1-2% | 2-5% | 5-10% |
| ARPDAU (all players) | $0.05-0.10 | $0.10-0.30 | $0.30-0.80 |
| ARPPU (monthly, paying only) | $10-20 | $20-50 | $50-150 |
| D7 LTV | $0.30-0.80 | $0.80-2.00 | $2.00-5.00 |
| D30 LTV | $0.80-2.00 | $2.00-5.00 | $5.00-15.00 |

### 6.3 UA Benchmarks (Mobile)

| Metric | Low | Median | High |
|---|---|---|---|
| CPI (iOS, US) | $1.00-2.00 | $2.00-5.00 | $5.00-15.00+ |
| CPI (Android, US) | $0.50-1.50 | $1.50-3.50 | $3.50-10.00+ |
| CPI (iOS, casual) | $0.50-1.00 | $1.00-2.00 | $2.00-4.00 |
| CPI (iOS, mid-core) | $2.00-5.00 | $5.00-10.00 | $10.00-20.00+ |
| D7 ROAS target | 8-12% | 12-20% | 20-35% |
| D30 ROAS target | 20-30% | 30-50% | 50-80% |

### 6.4 Steam/PC Benchmarks

| Metric | Indie | AA | AAA |
|---|---|---|---|
| Median lifetime revenue | $5K-50K | $500K-5M | $5M-100M+ |
| Wishlist to first-week sale conversion | 10-20% | 15-25% | 20-40% |
| Positive review threshold for visibility | >70% positive | >80% positive | >80% positive |
| Median playtime | 2-10 hours | 10-30 hours | 20-60 hours |
| Refund rate (under 2hrs) | 5-15% | 5-10% | 3-8% |

### 6.5 Development Cost Benchmarks

| Scope | Team Size | Duration | Budget Range |
|---|---|---|---|
| Small indie | 3-10 | 12-24 months | $100K-1M |
| Large indie | 10-30 | 18-36 months | $1M-5M |
| AA | 30-100 | 24-48 months | $5M-30M |
| AAA | 100-500+ | 36-72 months | $30M-300M+ |
| Mobile F2P (mid-core) | 10-50 | 12-24 months | $1M-10M |
| Mobile F2P (casual) | 5-20 | 6-18 months | $200K-3M |
| Live ops annual cost (mid-size) | 15-50 | Ongoing | $2M-10M/year |

### 6.6 Platform Fee Summary

| Platform | Standard Rate | Small Dev Rate | Notes |
|---|---|---|---|
| Steam | 30% (25% >$10M, 20% >$50M) | Same | Tiered by lifetime revenue on Steam |
| Xbox | 30% | 12% via ID@Xbox (some titles) | Game Pass deals are separate economics |
| PlayStation | 30% | N/A (negotiable for large titles) | PS Plus deals negotiated individually |
| iOS App Store | 30% | 15% (under $1M/year) | 15% on year 2+ auto-renewing subscriptions |
| Google Play | 30% | 15% (first $1M/year) | Alternative billing in some regions reduces to 26% |
| Telegram | Varies | Varies | Stars currency, TON blockchain, still evolving |

---

## 7. NBI's Consulting Methodology

### 7.1 Core Principle: Applied, Not Advisory

NBI does not produce reports that sit on a shelf. Every deliverable must be directly actionable by the client's team. "You should improve retention" is not a deliverable. "Here are the five specific changes to your day-3 through day-7 experience, with implementation specs, expected impact, and a priority order" is a deliverable.

### 7.2 Engagement Archetypes

**Strategic Advisory:** The client does not know how to proceed. The engagement produces direction: a strategic plan, a go-to-market framework, a product vision, or a business model design. Deliverables are frameworks and plans, not implementations.

**Remediation:** The client has made a mess. The engagement diagnoses the problem (which is often not the problem the client thinks it is), then prescribes specific corrective actions. Deliverables include a diagnostic report, a remediation plan, and often hands-on implementation support.

**Targeted Tactical:** The client needs a specific deliverable. IAP pricing review. GDD assessment. Org design. Cert readiness audit. The scope is narrow and well-defined. The engagement produces the specific deliverable requested, but the Practice Lead should always note if the narrow scope misses a bigger problem.

**Fractional Leadership:** The client needs an ongoing leadership presence. NBI fills a C-level or director-level role on an embedded basis. The engagement is open-ended. Deliverables are continuous -- decisions, direction, mentorship, process establishment. This is the highest-touch engagement type.

**Due Diligence / Investor Support:** An investor or publisher needs to assess a studio or game. The engagement produces a structured assessment covering team, product, technology, market, and financials. The audience is the investor, not the studio.

### 7.3 The NBI Customisation Rule

Every piece of consulting output must be customised to the specific client. The customisation dimensions are:

1. **Genre:** What genre is the client's game? Apply genre-specific frameworks, benchmarks, and design patterns
2. **Platform:** What platform(s)? Apply platform-specific economics, technical requirements, and audience expectations
3. **Stage:** Where in the lifecycle? Apply stage-appropriate depth and recommendations
4. **Client type:** Indie CEO, AA director, AAA VP? Adjust language, strategic level, and deliverable format
5. **Client maturity:** First game or twentieth? Adjust assumptions about baseline knowledge and process maturity
6. **Specific situation:** What is unique about this client's circumstances? Every client has something unusual. Find it and address it

Generic consulting output is a failure. If the client's name could be replaced with another client's name and the deliverable would still make sense, it has not been customised enough.

---

## 8. Progressive Knowledge Model

This Tier 2 file is the foundation. It will grow over time as NBI executes consulting engagements. The knowledge accumulation follows this pattern:

**Foundation (this file):** Genre frameworks, platform landscape, lifecycle stages, document assessment, studio health, benchmarks, methodology. Loaded at every instantiation.

**Engagement memory files (accumulated over time):** Each completed engagement produces a structured memory file containing: client context, what was done, what was learned, new benchmarks, framework refinements, what worked, what to do differently. These accumulate in the Practice Lead's memory and are loaded as relevant context for future engagements.

**Domain-specific deepening:** As the specialist consultants execute engagements, they develop deeper domain knowledge (economy models, live ops playbooks, production frameworks, org design patterns). This knowledge feeds back up to the Practice Lead and enriches the foundation.

The Practice Lead should never feel that their knowledge is "complete." The gaming industry evolves constantly. New platforms emerge (Telegram gaming barely existed 18 months ago). New monetisation models appear (battle pass did not exist before 2017). New genres form (the auto-battler genre was created in 2019). The Practice Lead's value is in being current, not just comprehensive.
