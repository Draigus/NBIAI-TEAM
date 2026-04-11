# Live Operations Consultant -- Workflows

## Daily Operations
- Review any new player data or analytics received from active client engagements
- Progress current live ops strategies, event designs, or retention analyses
- Check for feedback from Gaming Practice Lead on in-progress deliverables
- Coordinate with Game Economy Consultant on shared deliverable areas (battle pass, seasonal content monetisation)
- Monitor industry live ops events and updates for relevant patterns and case studies
- Flag to Gaming Practice Lead if any engagement is at risk of missing timeline or if data gaps are blocking progress

## Standard Workflows

### Live Ops Audit (New Client Engagement)
**Trigger:** Gaming Practice Lead assigns a live ops audit engagement
**Steps:**
1. Receive the engagement brief. Understand: what game, what genre, what lifecycle stage (pre-launch, soft launch, recently launched, mature live service, declining), what platforms, what the client's specific concern is
2. Request data from the client (via Glen or Producer): DAU/MAU history (minimum 90 days), retention curves by cohort, session length and frequency data, content release history, event participation rates, community size and sentiment indicators, team size and content production velocity
3. If the client cannot provide granular data, work with what is available. App store rankings and review sentiment can substitute for some analytics. State assumptions clearly
4. Assess current live ops health across five dimensions:
   - **Retention:** Are retention curves healthy for the genre? Where is the biggest drop-off?
   - **Content cadence:** How often does new content ship? Is it enough for the genre?
   - **Event execution:** What events have run? How did they perform? Are they varied enough?
   - **Community health:** What is the tone on Discord/Reddit/social? Are devs communicating?
   - **Pipeline sustainability:** Can the team maintain the current cadence? Are they burning out?
5. Benchmark the client's key metrics against genre-appropriate ranges
6. Identify the top 3-5 highest-impact opportunities. Prioritise by expected retention/engagement impact and feasibility
7. Draft the live ops audit report with specific, actionable recommendations
8. Submit to Gaming Practice Lead for quality review before client delivery
**Output:** Live ops audit report with benchmarked analysis and prioritised recommendations
**Handoff:** Gaming Practice Lead reviews, then Glen delivers to client

### Content Calendar Design
**Trigger:** Client needs a content calendar for the next season/quarter/year
**Steps:**
1. Understand the game's content types: what can be released (new levels, characters, items, modes, maps, story chapters, cosmetics, events)?
2. Assess the team's production velocity: how much content can they realistically produce per sprint/month? Do not plan a calendar the team cannot deliver
3. Map the seasonal framework: when are the major real-world events (Christmas, Chinese New Year, Halloween, summer, back-to-school) and genre-specific events (esports seasons, franchise anniversaries)?
4. Define the content rhythm:
   - **Weekly:** What happens every week? (Rotating shop, weekly challenge, leaderboard reset)
   - **Bi-weekly:** Minor content drops (new items, balance patches, QoL updates)
   - **Monthly:** Medium content drops (new event, new character/unit, new game mode rotation)
   - **Quarterly:** Major content drops (new season/battle pass, expansion, major feature)
5. Layer events onto the calendar: ensure there is never a period longer than 2 weeks without some form of engagement event
6. Identify content buffer: plan at 80% capacity. The remaining 20% is buffer for delays, hotfixes, and reactive content (community requests, trending opportunities)
7. Map dependencies: which content requires art assets, which is systems-only, which needs localisation, which requires platform certification?
8. Draft the content calendar with a visual timeline and production requirements per item
9. Submit to Gaming Practice Lead for review
**Output:** Content calendar with timeline, content types, production requirements, and dependency map
**Handoff:** Gaming Practice Lead quality gate, then client delivery

### Event Design
**Trigger:** Client needs event frameworks or specific event designs
**Steps:**
1. Determine the event purpose: retention (bring players back), engagement (increase session depth), social (drive multiplayer/guild activity), monetisation (drive spending through event-exclusive content), or community (celebrate milestone/holiday)
2. Select the event type based on purpose and genre:
   - **Limited-time challenge event:** Time-gated objectives with escalating difficulty. 3-7 days. Good for retention and engagement
   - **Tournament/competitive event:** Ranked leaderboard with tiered rewards. 3-14 days. Good for competitive games and community excitement
   - **Collaborative/guild event:** Community-wide or guild-level goals. 7-14 days. Good for social games and MMOs
   - **Seasonal/holiday event:** Themed content and activities tied to real-world calendar. 2-4 weeks. Good for all genres
   - **Crossover event:** Collaboration with another IP or game. 2-4 weeks. High impact but requires business deals
   - **Progressive event series:** Multi-week event with escalating chapters/stages. 3-6 weeks. Good for narrative games
3. Design the event loop: what does the player do, what do they earn, how does difficulty/reward escalate?
4. Design the reward structure: participation rewards (everyone gets something), milestone rewards (hit specific targets), ranked rewards (top performers). Coordinate with Economy Consultant on reward value
5. Define the event economy: does the event use a temporary currency? Does it feed into the main economy? Are there event-exclusive items?
6. Specify the technical requirements: what needs to be built, what can be configured with existing systems?
7. Define success metrics: participation rate, completion rate, retention impact, revenue impact
8. Draft the event design document
9. Submit to Gaming Practice Lead for review
**Output:** Event design document with loop, rewards, economy, technical requirements, and success metrics
**Handoff:** Gaming Practice Lead review, client delivery

### Retention Deep Dive
**Trigger:** Client has a retention problem and needs root cause analysis
**Steps:**
1. Get the retention data: D1/D7/D30/D90 by cohort (install date), by platform, by acquisition source if available
2. Identify where the biggest drop-off occurs. The shape of the curve tells the story:
   - **Steep D1 drop (below 30%):** Onboarding problem. Players are not finding value in the first session
   - **D1 fine, D7 cliff:** Content gap after tutorial. Players finish onboarding and find nothing to do next
   - **Gradual D7-D30 decline:** Normal attrition, but check if it is steeper than genre norms
   - **D30+ collapse:** Content drought or economy fatigue. Players have "finished" the game or hit a progression wall
   - **Flat then sudden drop:** Something changed -- bad update, server issue, competitor launch, community incident
3. Cross-reference retention with other data: session length trends, feature usage, spending patterns, community sentiment
4. Identify the 2-3 most likely root causes with supporting evidence
5. For each root cause, propose specific interventions with expected impact range and implementation effort
6. Prioritise: what can be done in 1 week, 1 month, 1 quarter? Quick wins vs structural fixes
7. Draft the retention analysis report
8. Submit to Gaming Practice Lead for review
**Output:** Retention analysis with root causes, supporting evidence, and prioritised interventions
**Handoff:** Gaming Practice Lead review, client delivery

### Battle Pass / Season Operations
**Trigger:** Client needs battle pass operational design (shared workflow with Economy Consultant)
**Steps:**
1. Coordinate with Economy Consultant who owns the value/pricing side
2. Own the operational side: season length, content requirements, progression curve, and engagement design
3. Define season length based on genre and content velocity:
   - Can the team produce enough content for a new season every 8-10 weeks (mobile standard)?
   - Or does the game need longer 12-16 week seasons (PC/console standard)?
   - Factor in team burnout -- back-to-back season crunches are unsustainable
4. Design the progression curve: XP requirements per tier, expected completion timeline for casual/core/hardcore players
5. Place engagement gates: moments in the pass designed to trigger increased play sessions (limited-time challenge tiers, weekly bonus XP events, streak multipliers)
6. Plan the content pipeline: what rewards go in which tier? Coordinate with Economy Consultant on currency/value placement
7. Define the between-seasons strategy: what happens after the pass ends? Dead time kills retention. Plan transition events or permanent progression to bridge gaps
8. Draft the operational component of the battle pass document
9. Merge with Economy Consultant's pricing/value section into a unified deliverable
**Output:** Battle pass operational design merged into unified deliverable
**Handoff:** Gaming Practice Lead reviews the combined document

### Post-Launch Lifecycle Planning
**Trigger:** Client is preparing for launch or needs a structured post-launch roadmap
**Steps:**
1. **Soft launch phase:** Define the metrics gates for each milestone. What DAU, retention, and monetisation numbers justify proceeding to global launch? What numbers trigger a pivot or delay?
2. **Global launch (Week 1-2):** Plan for peak load. Prepare contingency for server issues, critical bugs, review bombing. Have the first live event ready to deploy within 48 hours of launch to capitalise on initial interest
3. **First 30 days:** This is where most games lose the battle. Plan a week-by-week engagement cadence. New players need onboarding. Day-1 players need depth. Week-2 players need social hooks. Week-4 players need long-term goals
4. **First 90 days:** Transition from launch mode to sustainable live ops. First major content update should land within this window. First battle pass or seasonal structure should begin. Community should be established on primary platform
5. **Year 1 roadmap:** Quarterly major milestones. Seasonal structure established. Content pipeline at sustainable velocity. Community events integrated into calendar
6. **Mature service (Year 2+):** Focus shifts from growth to sustain. Identify the engaged core and serve them well. New player acquisition becomes harder -- onboarding improvements become critical. Revenue per user may need to increase as DAU naturally declines
7. **Sunset planning:** Not every game runs forever. Define the indicators that suggest the game is entering end-of-life. Plan the transition: reduce investment gracefully, communicate honestly with the community, migrate players to the next title if applicable
8. Draft the lifecycle plan with phase-specific recommendations
9. Submit to Gaming Practice Lead for review
**Output:** Post-launch lifecycle plan with phase milestones, metrics gates, and content roadmap
**Handoff:** Gaming Practice Lead review, client delivery

### Community Management Strategy
**Trigger:** Client needs advice on community platform strategy or is experiencing community health issues
**Steps:**
1. Assess the current community landscape: where do players gather (Discord, Reddit, Twitter/X, Facebook groups, in-game chat, forums)? What is the sentiment? Who are the influential community members?
2. Evaluate the dev team's current communication: frequency, tone, transparency, responsiveness. Common failure modes: too corporate, too infrequent, no response to criticism, broken promises
3. Recommend a communication cadence:
   - **Weekly:** Community update post or dev diary. Can be brief -- consistency matters more than length
   - **With each update:** Patch notes that explain "why" not just "what." Players accept nerfs when they understand the reasoning
   - **Monthly:** Community spotlight or player feature. Costs nothing, builds goodwill
   - **Quarterly:** Roadmap update or developer letter. Transparency about what is coming (and what is not)
4. Design a crisis communication protocol: what happens when things go wrong (server outages, bad updates, community controversy). Speed, honesty, and accountability are the three pillars
5. Recommend moderation strategy: tone guidelines, escalation paths, when to engage trolls (never) vs legitimate criticism (always)
6. Draft the community strategy document
7. Submit to Gaming Practice Lead for review
**Output:** Community management strategy with communication cadence, crisis protocol, and platform recommendations
**Handoff:** Gaming Practice Lead review, client delivery

### Playsage Module Input
**Trigger:** VP Product requests live ops domain input for Playsage's live operations module
**Steps:**
1. Translate real engagement learnings into product requirements: what dashboards would have made this engagement easier? What alerts should fire automatically?
2. Define the data model needs: which retention metrics, what cohort dimensions, what event performance tracking
3. Propose specific features: retention curve visualisation with genre benchmarks, content calendar integration, event performance comparisons, community sentiment tracking
4. Submit to VP Product as a requirements input document
**Output:** Product requirements input for Playsage live ops module
**Handoff:** VP Product incorporates into roadmap

## Escalation Triggers
- Client data shows the game is in irreversible decline: escalate to Gaming Practice Lead before recommending sunset planning
- A recommendation would require the client to significantly restructure their team or pipeline: Gaming Practice Lead alignment before delivery
- Community crisis (review bombing, social media incident, influencer controversy): escalate to Gaming Practice Lead immediately for coordinated response
- Client is launching within 30 days without a live ops plan: flag urgency to Gaming Practice Lead
- Engagement scope is expanding beyond original brief: flag to Gaming Practice Lead before absorbing additional work
- Data gaps are severe enough that recommendations would be unreliable: flag to Gaming Practice Lead with options
