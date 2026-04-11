# Live Operations -- Tier 2 Knowledge

This file contains the domain knowledge required to perform as a credible live operations consultant. It covers live ops frameworks, KPI definitions, content cadence benchmarks, event design patterns, retention mechanics, community management, platform-specific update processes, and lifecycle management. All ranges and benchmarks are approximate and should be validated against current market data for any given engagement.

---

## 1. Live Ops Frameworks by Genre

### Mobile Free-to-Play (Casual/Puzzle)
**Cadence:** High frequency, low complexity. These games run on a treadmill of content and events because session depth is shallow.
- **Daily:** Rotating daily challenges, daily rewards, new daily puzzle/level
- **Weekly:** New level packs or themed challenges. Weekly leaderboards reset
- **Bi-weekly:** Minor update with new mechanics, power-ups, or QoL fixes
- **Monthly:** Seasonal event or themed content drop. New world/chapter
- **Quarterly:** Major feature addition, anniversary event, or collaboration
- **Content velocity:** 20-50 new levels per week (puzzle), 2-4 new event types per quarter
- **Team implication:** Dedicated live ops team of 3-8 people. Level design can be semi-automated. Event frameworks should be templated for fast iteration

### Mobile Free-to-Play (Mid-core/Strategy)
**Cadence:** Medium frequency, medium-high complexity. These games have deeper progression systems, so content needs to serve both new players and veterans.
- **Daily:** Alliance wars/raids reset, daily quests, shop rotation
- **Weekly:** New unit/hero rotation, weekly tournament, alliance event
- **Bi-weekly:** Minor balance patch, new equipment/items
- **Monthly:** New hero/commander release, major event (solo or alliance-based), balance overhaul
- **Quarterly:** New game mode, major content expansion, seasonal battle pass
- **Content velocity:** 1-2 new characters per month, 1 major event per month, 1 major feature per quarter
- **Team implication:** Live ops team of 5-15 people. Hero/unit design requires balance testing. Events need 2-4 week lead time for art and QA

### MMO (PC/Console)
**Cadence:** Lower frequency, very high complexity. Each content drop is substantial. Players expect quality and depth, not just volume.
- **Daily:** Daily quests, dungeon/raid lockout resets, crafting resets
- **Weekly:** Weekly boss rotations, PvP season milestones, community challenges
- **Monthly:** Minor patch with balance changes, QoL improvements, bug fixes
- **Quarterly:** Major content patch -- new zones, dungeons, raids, story chapters. This is the heartbeat of an MMO's live service
- **Annually:** Expansion pack. New level cap, new class/race (sometimes), new endgame systems. The single biggest revenue and retention event
- **Content velocity:** 1 major patch per quarter minimum. Expansions annually or biannually. Going more than 4-5 months without meaningful content risks significant player attrition
- **Team implication:** Full development team (50-200+ people for AAA). Content patches require full production pipeline. Expansion planning starts 12-18 months before release

### Battle Royale
**Cadence:** High frequency of cosmetic/seasonal content, medium frequency of gameplay updates.
- **Daily:** Daily challenges, shop rotation (cosmetics)
- **Weekly:** Weekly challenges (part of battle pass progression), LTM (limited-time mode) rotation
- **Bi-weekly:** New cosmetic sets, collaboration skins
- **Seasonal (8-12 weeks):** New battle pass, map changes, new weapon/item, balance overhaul. The season launch is the primary retention and revenue event
- **Content velocity:** New battle pass every 8-12 weeks. Map changes every 1-2 seasons. New weapons/items every 2-4 weeks. LTMs rotate weekly-bi-weekly
- **Team implication:** Large team (50-100+) with dedicated cosmetic pipeline, separate from gameplay development. Map changes are the most resource-intensive

### Idle/Incremental
**Cadence:** Very high frequency of small updates. The game's progression IS the content, so new systems and numbers must drip constantly.
- **Daily:** Daily deals, daily dungeons, daily login rewards
- **Weekly:** New hero/character banner (gacha), weekly events
- **Bi-weekly:** Minor balance adjustments, new equipment tier
- **Monthly:** Major event, new game mode or progression system, new hero class
- **Quarterly:** Anniversary or milestone event, major progression overhaul
- **Content velocity:** 2-4 new heroes/characters per month, 1-2 new systems per quarter. The gacha cycle IS the content cadence
- **Team implication:** Relatively small team (10-30) can sustain this cadence because content is systems-driven, not asset-heavy

### Racing
**Cadence:** Seasonal structure with car/track releases as the primary content pillar.
- **Daily:** Daily races, daily challenges
- **Weekly:** Time trial leaderboards, weekly tournament
- **Monthly:** New car release, new track (or track variant), seasonal event
- **Quarterly:** Major seasonal update with new game mode, car class, or championship structure
- **Content velocity:** 1-2 new cars per month, 1 new track per quarter, seasonal championships
- **Team implication:** Car and track production are the bottleneck. Each car requires licensing (if real brands), modelling, balancing. Tracks require extensive testing

### Narrative / Story-Driven Live Service
**Cadence:** Less frequent but higher-impact content drops. Quality over quantity. Story content cannot be rushed without destroying the product.
- **Weekly:** Community challenges, photo mode contests, smaller side content
- **Monthly:** Story episode or chapter. This is the core content drop
- **Quarterly:** Major story arc conclusion, new region/area, new gameplay systems
- **Content velocity:** 1 major story chapter per month is aggressive. Many narrative live services target 1 per 6-8 weeks
- **Team implication:** Writing, voice acting, cinematic production, and QA all create bottleneck. Plan content 6-12 months ahead

---

## 2. KPI Definitions and Healthy Ranges

### Player Base Metrics

**DAU (Daily Active Users)**
- Definition: Unique players who open the game and complete at least one meaningful action in a calendar day
- "Meaningful action" matters -- just opening the app and closing it should not count if your analytics can distinguish
- Healthy trajectory: Stable or growing after initial post-launch decay. Spikes on content drops and events. Seasonal patterns are normal (dips in summer, spikes around holidays)

**MAU (Monthly Active Users)**
- Definition: Unique players with at least one session in a 30-day rolling window
- DAU/MAU ratio (stickiness): Indicates how often monthly players come back daily
  - Casual games: 15-25% (players dip in and out)
  - Mid-core: 20-35%
  - Hardcore/MMO: 30-50%
  - Social/competitive: 25-40%
  - A ratio above 50% is exceptional and typically only seen in deeply habit-forming games

**CCU (Concurrent Users)**
- Definition: Players online simultaneously at a given moment
- Useful for capacity planning and measuring peak engagement
- Peak CCU typically occurs 8-10pm local time on weekday evenings, with secondary peaks on weekend afternoons
- CCU-to-DAU ratio varies by genre: 5-15% for session-based games, 15-30% for always-online games

### Retention Metrics

**Day-N Retention (D1, D3, D7, D14, D30, D60, D90)**
- Definition: Percentage of players who installed/registered on day 0 who return on exactly day N
- This is "classic" retention. Some studios use "rolling" retention (returned on day N or any day after), which always produces higher numbers. Always clarify which definition a client is using

| Metric | Mobile Casual (Good) | Mobile Casual (Great) | Mobile Mid-core (Good) | Mobile Mid-core (Great) | PC/Console F2P | MMO |
|---|---|---|---|---|---|---|
| D1 | 35% | 45%+ | 30% | 40%+ | 30-40% | 40-50% |
| D7 | 15% | 22%+ | 12% | 18%+ | 15-25% | 25-35% |
| D30 | 5% | 10%+ | 4% | 8%+ | 8-15% | 15-25% |
| D90 | 2% | 5%+ | 1.5% | 4%+ | 3-8% | 10-20% |

**Churn Rate**
- Definition: Percentage of active players who become inactive in a given period
- "Inactive" must be defined: typically 7+ days without a session (mobile) or 14+ days (PC/console)
- Monthly churn rate healthy ranges: 3-8% for mature MMOs, 10-20% for mobile mid-core, 15-30% for mobile casual
- Churn is not inherently bad -- all games lose players. The question is whether acquisition and reactivation replace the losses

### Session Metrics

**Sessions per Day**
- Casual: 2-4 sessions
- Mid-core: 3-6 sessions
- Hardcore/MMO: 2-4 sessions (but longer each)
- Idle/incremental: 5-10+ short check-ins

**Session Length (Average)**
- Casual: 5-10 minutes
- Mid-core: 10-20 minutes
- Battle royale: 15-25 minutes (match-length dependent)
- MMO: 30-90 minutes
- Idle: 2-5 minutes per check-in

**Session Depth**
- More useful than length alone. Measures what players DO in a session: battles completed, quests finished, items crafted, levels attempted
- A session where a player logged in, collected daily rewards, and left is very different from a session where they played three matches -- even if both lasted 5 minutes

### Revenue Metrics (Live Ops Relevant)

**ARPDAU (Average Revenue Per Daily Active User)**
- Definition: Total daily revenue / DAU
- The single most-tracked daily revenue metric for F2P games
- Ranges: see Economy Consultant's knowledge file for detailed genre benchmarks
- Live ops impact: Events and limited-time offers can spike ARPDAU 20-50% above baseline. A healthy game shows consistent baseline ARPDAU with event-driven peaks

**Revenue per Event**
- Track revenue during event periods vs baseline
- A well-designed event should lift ARPDAU 15-30% without cannibalising post-event revenue (the "hangover" effect)
- If ARPDAU drops below baseline after every event, players are deferring purchases to event periods -- the event economy may be too generous

---

## 3. Event Design Patterns

### Limited-Time Challenge Event
- **Duration:** 3-7 days
- **Loop:** Player completes themed objectives (kill X enemies, collect Y items, reach Z score) to earn event points. Points unlock milestone rewards
- **Reward structure:** Linear milestones with escalating value. Top milestone should require dedicated effort but be achievable by core players
- **Best for:** Engagement spikes, retention pulls, introducing new content/mechanics
- **Watch out for:** If milestones are too easy, players finish early and disengage. If too hard, participation drops

### Tournament / Competitive Event
- **Duration:** 3-14 days
- **Loop:** Player competes on a ranked leaderboard (score, time, win/loss). Rewards based on final ranking tier
- **Reward structure:** Tiered -- everyone who participates gets something, top performers get exclusive rewards. Sweet spot: top 10% get unique cosmetic, top 30% get premium currency, everyone gets basic rewards
- **Best for:** Competitive games, driving session depth, community excitement
- **Watch out for:** Leaderboard manipulation/cheating. Whale advantage if power-based. New player exclusion if no skill-based matchmaking

### Collaborative / Guild Event
- **Duration:** 7-14 days
- **Loop:** Guild/alliance collectively works toward shared goals. Individual contributions aggregate. Guild milestones unlock shared rewards
- **Reward structure:** Shared milestones + individual contribution ranking within the guild
- **Best for:** Social engagement, guild recruitment, reducing churn (social bonds reduce individual churn)
- **Watch out for:** Inactive guild members free-riding. Small guilds feeling unable to compete. Guild drama when rewards are shared

### Seasonal / Holiday Event
- **Duration:** 2-4 weeks
- **Loop:** Themed content with temporary mechanics (snowball fights, pumpkin collection, fireworks). Event currency earned through themed activities, spent in event shop
- **Reward structure:** Event shop with varied prices. Limited-time exclusive items create FOMO. Returning seasonal items build tradition
- **Best for:** Universal appeal (every player knows Christmas), brand visibility, content variety
- **Watch out for:** Cultural sensitivity (not all players celebrate the same holidays). Production cost of themed assets. Feeling repetitive if the same event returns unchanged

### Progressive / Narrative Event
- **Duration:** 3-6 weeks
- **Loop:** Multi-chapter event with escalating story and difficulty. New chapter unlocks weekly or bi-weekly
- **Reward structure:** Chapter completion rewards + cumulative series reward for completing all chapters
- **Best for:** Narrative games, keeping players engaged over weeks (not just a burst), building lore
- **Watch out for:** Players who miss early chapters feel excluded. Content production is heavy. Pacing must be carefully tuned

### Comeback / Re-engagement Event
- **Duration:** 7-14 days (targeted at lapsed players only)
- **Loop:** Lapsed player returns and receives a special welcome-back campaign: catch-up rewards, boosted progression, exclusive offers
- **Trigger:** Player has been inactive for 14+ days (mobile) or 30+ days (PC/console)
- **Reward structure:** Front-loaded -- the first session back must feel rewarding. Gradually taper over the event period
- **Best for:** Reactivating churned players, offsetting natural attrition
- **Watch out for:** Active players feeling punished for loyalty (why do lapsed players get better rewards?). Solution: offer loyalty rewards to active players during the same period

---

## 4. Retention Mechanics

### Daily Login Rewards
- **Design:** Escalating rewards over a 7, 14, or 28-day cycle. Best item on the final day
- **Psychology:** Sunk-cost -- the further into the streak, the more painful it is to break it
- **Best practice:** Do not make the final reward so valuable that missing one day feels devastating. Players who miss a day should be able to resume progress, perhaps with a slightly reduced reward
- **Anti-pattern:** "Miss one day and start over from day 1." This feels punitive and causes players to quit rather than restart
- **Advanced:** Progressive login calendars where rewards improve month-over-month for consistently active players

### Streak Systems
- **Design:** Consecutive daily actions (complete a quest, win a match, play a session) build a streak counter. Multipliers or bonus rewards increase with streak length
- **Effective at:** Habit formation. A 7-day streak creates a routine. A 30-day streak creates an identity
- **Danger zone:** Streaks that are too punishing to break. If a player on a 45-day streak misses one day and loses everything, they are more likely to quit than restart. Implement "streak shields" (one free miss per week) or "streak freeze" items (purchasable with soft or hard currency)

### Comeback Mechanics
- **Purpose:** Reduce the barrier for lapsed players to return
- **Catch-up mechanics:** Rested XP (bonus XP after time away), resource gifts on return, temporary boosts
- **Content recap:** "Here is what happened while you were away" summary for story/live event content
- **Social pull:** "Your guild missed you" notification. "Your friend [name] is online" push notification (use sparingly -- push notification abuse accelerates uninstalls)
- **Re-engagement campaigns:** Email, push notification, or ad retargeting after 7, 14, and 30 days of inactivity. Each touchpoint should offer a reason to return, not just "come back"

### Long-Term Progression Hooks
- **Prestige/rebirth systems:** Reset progress in exchange for permanent bonuses and cosmetic prestige indicators. Extends the progression runway indefinitely
- **Collection completion:** Achievements, badges, collections that take months or years to complete. Appeals to completionists and provides always-available goals
- **Seasonal rank progression:** Ranked seasons that reset periodically. Players climb back each season, with cosmetic rewards marking their peak rank. Provides recurring motivation
- **Mastery systems:** Deep specialisation trees that unlock after base progression is complete. Gives veterans something to optimise long after they have "finished" the main content

---

## 5. Community Management

### Platform Strategy by Game Type

**PC MMO/Live Service:** Discord is the primary community hub. Reddit for broader discussion. Twitter/X for announcements. Official forums if the game is large enough to sustain them.

**Mobile F2P:** Facebook groups (especially for older demographics in strategy games). Discord for core community. Reddit less relevant for casual. In-game community features (chat, guilds) are the primary touchpoint.

**Console:** Reddit, Twitter/X, and platform-specific communities (PS Blog, Xbox Wire). Discord growing. In-game social features vary widely.

**Cross-platform:** Discord as the unifying hub. Platform-specific channels within Discord for technical issues.

### Dev Communication Best Practices

**Patch notes that work:**
- Lead with the "why." Players accept nerfs and changes when they understand the reasoning
- Categorise clearly: bug fixes, balance changes, new features, QoL improvements
- Acknowledge known issues even if they are not fixed yet. "We know X is broken and are working on it" is infinitely better than silence
- Use the community's language. If players call a mechanic "the cheese strat," the patch notes can reference that name

**Community updates:**
- Weekly or bi-weekly cadence minimum for active live games
- Can be brief. A 200-word "what we are working on" post is better than silence
- Never promise dates for unconfirmed features. "We are exploring X" is fine. "X is coming in March" sets an expectation that may not be met

**Crisis communication:**
- Acknowledge the problem immediately (within hours, not days)
- Do not blame players, do not blame a third party. Own it
- Provide a timeline for resolution if possible, or a timeline for the next update if not
- Follow up when resolved. Post-mortem for major incidents
- Compensation (in-game currency, items) is expected for significant outages or game-breaking bugs. The amount matters less than the acknowledgement

### Community Health Indicators
- **Positive indicators:** Active Discord with constructive discussion, fan content creation, community-organised events, high app store rating with recent positive reviews, content creators actively covering the game
- **Warning indicators:** Increasing toxicity in chat/forums, decline in community-generated content, rising frequency of "is this game dead?" posts, app store rating declining, prominent content creators leaving
- **Critical indicators:** Organised review bombing, hashtag campaigns, refund demands, mainstream press coverage of community anger, content creators making "why I quit" videos

---

## 6. Platform-Specific Update Processes

### iOS (App Store)
- **Review time:** Typically 24-48 hours, but can take up to 7 days during peak periods (Christmas, major Apple events)
- **Expedited review:** Available for critical bug fixes. Apple grants these selectively -- do not abuse
- **OTA content updates:** If the game loads content from a server (events, configurations, balance data), these do not require a store update. Design live ops systems to be server-configurable wherever possible
- **Forced updates:** Can require players to update before playing. Use sparingly -- forced updates during a live event cause player frustration
- **A/B testing:** App Store does not natively support A/B testing of the binary. Server-side configuration flags are the standard approach

### Android (Google Play)
- **Review time:** Typically faster than iOS. Often under 24 hours for established developers
- **Staged rollout:** Google Play supports staged rollouts (5%, 10%, 50%, 100%). Use this for major updates to catch issues before full deployment
- **OTA content updates:** Same principle as iOS -- server-configurable content avoids store review
- **Multiple APK support:** Can target different device configurations. Useful for performance-heavy content

### Steam (PC)
- **No review process for updates.** Developers push updates directly. This is a major advantage for live ops agility
- **Beta branches:** Steam supports multiple build branches. Use for PTR (public test realm), beta testing, and staged rollouts
- **Depot system:** Large games can update specific depots (chunks of content) without re-downloading the entire game
- **Steam Events:** Steam's built-in event system can announce updates, sales, and events directly in the client. Integrate with the content calendar
- **Steam Seasonal Sales:** Major sales (Summer Sale, Winter Sale, Autumn Sale) drive significant traffic. Plan content drops and events to coincide with sale visibility

### Console (Xbox/PlayStation)
- **Certification required:** Every update must pass platform certification. Budget 1-3 weeks for certification turnaround
- **Certification cost:** Some platforms charge for certification of patches (though policies vary and have become more developer-friendly)
- **Hotfix process:** Critical fixes can go through expedited certification, but this is not instant. Always have a server-side mitigation plan for game-breaking issues
- **Live ops implication:** Console update cadence is slower than PC or mobile. Plan for less frequent but larger patches. Use server-side configuration for anything that needs to change quickly (event triggers, balance numbers, shop content)
- **Cross-play considerations:** If the game is cross-play, all platforms must be on the same version. The slowest certification process (usually console) gates the update cadence for all platforms

### Telegram
- **No certification.** Bot updates deploy instantly
- **Content updates:** Server-side, instant deployment
- **Limitation:** UI capabilities are constrained by Telegram's bot and webapp framework. Complex live ops features may need creative workarounds
- **Advantage:** Zero friction for updates. Can ship changes multiple times per day if needed

---

## 7. Post-Launch Lifecycle Reference

### Soft Launch
- **Purpose:** Validate KPIs before spending on global acquisition. Prove that the game retains, monetises, and engages at levels that justify scaling
- **Typical markets:** Canada, Australia, Philippines, Nordics (English-speaking, representative demographics, not too large)
- **Duration:** 4-12 weeks minimum. Some games soft-launch for 6+ months with multiple iteration cycles
- **Key gates:**
  - D1 retention above genre threshold (see benchmarks above)
  - D7 retention above genre threshold
  - Monetisation conversion rate in expected range
  - No critical technical issues at scale
  - Session metrics healthy
- **Decision framework:** If metrics hit targets, proceed to global launch. If metrics are close, iterate (1-2 more cycles). If metrics are significantly below targets, reassess the game's viability before investing more

### Global Launch (First 2 Weeks)
- The highest DAU the game will ever have (unless it goes viral later)
- **Priority 1:** Technical stability. Server outages on day 1 are the fastest way to kill a game
- **Priority 2:** First-time user experience. New players are forming their opinion in the first 5 minutes
- **Priority 3:** Immediate live ops. Have the first event ready to deploy within 48 hours. Give day-1 players something to come back for on day 2
- **Priority 4:** Community management. Day-1 community tone sets the long-term culture. Be present, responsive, and proactive

### First 30 Days
- The retention cliff. Most player loss happens here
- **Week 1-2:** Onboarding to core loop. Players must understand and enjoy the core gameplay loop
- **Week 2-3:** Social discovery. Guilds, friends, multiplayer. Social bonds are the strongest retention mechanism
- **Week 3-4:** First major engagement event or content drop. Gives players a reason to stay beyond the initial content
- **Key metric:** D30 retention. If this hits genre targets, the game has a viable live service foundation

### First 90 Days
- Transition from "launch mode" to "live ops mode"
- First battle pass or seasonal structure should begin
- First major content update should land
- Community should be established on primary platform
- Revenue should be trending toward sustainable run-rate (not just launch spike)
- **Key decision:** Is the DAU trajectory sustainable? Is revenue covering live ops costs? If yes, invest in year-1 roadmap. If no, reassess scope

### Year 1
- Establish the seasonal rhythm: players should know what to expect and when
- 3-4 major content updates
- Content pipeline at sustainable velocity (not crunch)
- Community culture established
- Revenue run-rate predictable with event-driven peaks
- Begin planning for mature-phase challenges: content fatigue, veteran vs new player tension, economy inflation

### Mature Service (Year 2+)
- Growth slows or reverses. Focus shifts to serving the engaged core
- New player acquisition becomes harder and more expensive. Onboarding improvements become critical -- the tutorial that worked at launch may be wrong for players discovering the game 2 years later
- Revenue per user may need to increase as DAU naturally declines (deeper monetisation, not more aggressive -- there is a difference)
- Content must serve both veterans (who have seen everything) and new players (who are overwhelmed)
- Community becomes self-sustaining if managed well. Player-created content, community events, and social structures carry more weight

### Sunset Planning
Not every game should run forever. Indicators that sunset should be discussed:
- DAU declining month-over-month for 6+ months with no response to content drops or events
- Revenue no longer covering live ops costs (or will not within 6 months)
- Team cannot be sustained at the required headcount
- Core technology is end-of-life (platform deprecation, engine obsolescence)

**Sunset approach:**
- Communicate early and honestly. Surprise shutdowns destroy studio reputation
- Give players time (3-6 months minimum between announcement and shutdown)
- Offer migration paths (account transfers, rewards in the next game) where possible
- Preserve the game's legacy (community archive, offline mode if feasible)
- Final event or "farewell season" to give the community closure
