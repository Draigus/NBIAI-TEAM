# Research Log

Audit trail of all research activity. Each entry records what was searched, what was found, and what was promoted to raw extracts.

---

## 2026-05-25 | industry_current | Web Research Cycle

**Agent:** research_agent (manual invocation)
**Bank:** industry_current
**Brief:** industry_current.md (all categories: M&A, layoffs, funding, platform policy, regulation, technology, market data)

### Searches Executed

1. "gaming studio acquisitions closures layoffs May 2026" - multiple sources returned
2. "gaming funding rounds investment May 2026" - Astrocade Series B prominent
3. "Steam platform policy changes game developers 2026" - AI disclosure rewrite
4. "AI game development tools technology 2026" - landscape overview
5. "video game regulation legislation loot boxes 2026" - FTC enforcement + global convergence
6. "Metacore layoffs 160 redundancies May 2026" - deep dive on Supercell acquisition
7. "Astrocade $56 million Series B Sequoia gaming AI platform 2026" - deal details
8. "MercurySteam layoffs May 2026" - event details
9. "FTC loot box regulation 2026 gaming monetization rules enforcement" - settlement details
10. "Supercell acquires Metacore Merge Mansion full acquisition details 2026" - deal structure
11. "gaming industry market data revenue 2026 numbers statistics" - market sizing

**Note:** gamesindustry.biz, eurogamer.net, polygon.com, ign.com blocked by WebSearch crawler restrictions. Sourced from gamedeveloper.com, mobilegamer.biz, pocketgamer.biz, venturebeat.com, fortune.com, and others.

### Findings Kept (5 extracts)

| Extract | Relevance | Novelty | Actionability | Why kept |
|---|---|---|---|---|
| Supercell/Metacore acquisition + 160 layoffs | 8 | 7 | 7 | Major mobile M&A with specific financials (EUR 180M invested). Single-hit studio consolidation pattern. |
| Astrocade $56M Series A+B | 8 | 8 | 7 | Largest AI-gaming raise in May. Sequoia + NVIDIA + Google. Real traction numbers (5M MAU). |
| FTC $20M Genshin Impact loot box settlement | 8 | 7 | 8 | Active enforcement. Multi-jurisdiction regulatory convergence. EU June 2026 deadline. |
| Steam AI disclosure policy rewrite | 7 | 6 | 8 | Directly affects how clients ship games. Two-tier system resolves developer confusion. |
| Q2 2026 layoffs + profit-layoff paradox | 7 | 6 | 6 | 44,000+ jobs cut since 2022 vs record $195.6B revenue. Structural workforce data. |

### Findings Rejected

- **MercurySteam layoffs (12 May):** No headcount disclosed, standard post-project cycle layoffs, lower actionability. Used as supporting data in the Q2 layoffs extract instead.
- **AI tools listicles:** Multiple "top 10 AI tools for game dev 2026" articles found. Excluded per brief rules (listicles without specific data). Market stat (87% of devs using AI agents) noted but not extractable to a standalone finding.

### Suggestions for Next Cycle

- Monitor EU cancellation button requirement enforcement after 19 June 2026 deadline
- Track Astrocade creator fund launches and UGC platform competitive dynamics
- Check for Q2 earnings from major publishers (EA, Take-Two, Embracer) for updated financial data
- gamesindustry.biz blocked by WebSearch -- consider using Apify web browser actor for that domain next cycle

---

## 2026-05-25 | games_pitch_decks | Web Research Cycle (Week 1 of 4)

**Agent:** research_agent (manual invocation)
**Bank:** games_pitch_decks
**Brief:** Mobile game pitch decks (F2P, hypercasual, mid-core) -- decks that raised money, structural analyses, gaming VC perspectives, fundraising post-mortems

### Searches Executed

1. "mobile game pitch deck raised funding 2024 2025 2026" -- broad sweep, multiple aggregators returned
2. "game studio seed round pitch deck breakdown 2024 2025" -- Little Polygon post-mortem surfaced
3. "Konvoy Ventures Josh Chapman game pitch deck advice" -- fund overview but limited deck-specific content
4. "Play Ventures OR Makers Fund game studio pitch deck structure fundraising" -- Katkoff Medium piece surfaced
5. "a16z games pitch deck fundraising advice gaming startups" -- Andrew Chen LP deck publicly shared
6. "Michail Katkoff 6 steps to pitch perfect game pitch deck" -- detailed framework, but published 2020 (excluded on date)
7. "indie game studio pitch deck raised seed series A mobile f2p 2023 2024 2025" -- market context, few actual decks
8. "startersss.com best pitch decks gaming startups 2025" -- aggregator, no detailed breakdowns
9. "GDC 2024 2025 game fundraising pitch talk investors" -- GDC Pitch competition details, Della Rocca coaching
10. "reddit gamedev pitch deck raised funding" -- reddit.com blocked by WebSearch crawler
11. "Carry1st OR Homa Games OR Voodoo pitch deck raised funding mobile hypercasual" -- Homa deck and Voodoo deep dive surfaced
12. "Homa Games 19 slide pitch deck $100 million breakdown" -- 19-slide deck behind Business Insider paywall, 13-slide Series A accessible
13. "game pitch deck slides breakdown analysis raised funding mobile site:medium.com OR site:substack.com" -- Backbone (hardware, not game studio) and Voodoo Substack
14. "Naavik OR Deconstructor of Fun mobile game fundraising pitch deck" -- podcast references only, no deck content
15. "gaming VC perspective mobile game pitch deck what investors want retention D1 D7 metrics" -- GameAnalytics benchmarks, Atomico checklist
16. "The Games Fund OR London Venture Partners game studio pitch deck fundraising advice" -- Games Fund template discovered
17. "mobile game studio post-mortem fundraising how we raised pitch deck 2023 2024 2025" -- confirmed Little Polygon as primary post-mortem

**Domains fetched for deep extraction:** andrewchen.com, medium.com (Katkoff), blog.littlepolygon.com, failory.com, games.themindstudios.com, derstartupcfo.com (Homa), pitchdeckhunt.com (Tamatem), alexandre.substack.com (Voodoo), gamesfund.vc, pocketgamer.biz (Atomico), gamedeveloper.com (Della Rocca), viktori.co

**Note:** reddit.com, gamesindustry.biz blocked by WebSearch crawler. Business Insider (Homa 19-slide deck detail) paywalled.

### Findings Kept (5 extracts)

| Extract | Relevance | Novelty | Actionability | Why kept |
|---|---|---|---|---|
| a16z Games Fund One LP deck ($660M) | 8 | 7 | 7 | Publicly shared VC deck from top-tier fund. Industry framing and narrative architecture transferable to studio pitches. |
| Homa Games 13-slide Series A deck ($50M) | 9 | 7 | 8 | Real mobile hypercasual deck with documented outcome. 13 slides, platform-over-games positioning. |
| Little Polygon pitching post-mortem (2024) | 7 | 8 | 8 | Honest failure case: 50+ publishers, zero term sheets. Documents the indie funding gap ($500K-$3M dead zone). |
| The Games Fund VC pitch template | 8 | 6 | 9 | Actual gaming VC's published template. Highest actionability -- can be used directly with clients. |
| Voodoo hypercasual fundraising strategy ($200M + unicorn) | 8 | 7 | 7 | Category-defining mobile gaming business model. D1/D7/CPI benchmarks. Process-over-product thesis. |

### Findings Rejected

- **Katkoff/Play Ventures "6 Steps to Pitch Perfect":** Excellent framework (6-chapter structure: Who You Are, Co-Founders, Mission, Roadmap, Product, Investment Opportunity), with Play Ventures partners quoted. However, published July 2020 -- excluded on the 2022+ date filter. Core insight ("sell the company, not the game") captured in Homa and Voodoo extracts.
- **Atomico/PocketGamer investor checklist:** Detailed 4-category evaluation framework (Games Fit, Unit Economics, Competition, Team) with genre-specific metrics. Published ~2019. Excluded on date, but content absorbed into research notes.
- **Tamatem pitch deck:** Seed deck that raised $50K (later $11M Series B). Available on Failory and PitchDeckHunt, but the accessible version has no structural breakdown -- just a summary. The "1% of content is in Arabic" market framing is clever but the deck detail is insufficient.
- **Backbone mobile gaming deck ($40M):** Backbone is a hardware company (iPhone controller), not a game studio. Excluded on scope despite being mobile gaming adjacent.
- **SolChicks ($57M Series A):** Blockchain/NFT gaming, 2022. Excluded -- Web3 gaming thesis has collapsed since, making this an anti-example.
- **Viktori.co game pitch deck guide:** Comprehensive but generic. Author is a pitch deck consultant, not a gaming VC or studio founder. No real examples with verified funding outcomes.
- **MindStudios "Pitching Your Game in 2026":** Useful publisher-perspective article but no specific funded deck examples. Content absorbed into research notes.
- **Jason Della Rocca / Game Developer tips:** Strong tactical advice from GDC Pitch host, but no specific deck with funding outcome. Content noted for reference.

### Key Themes Emerging

1. **"Sell the company, not the game"** -- dominant thesis across all VC-perspective sources. Studios that pitch their process/platform/team raise more than those pitching a single title.
2. **The indie funding gap is real** -- $500K-$3M is a dead zone. Below $500K or above $5M are the fundable ranges.
3. **Retention metrics are table stakes** -- D1, D7, D28 retention and ARPDAU/CPI economics must be in every mobile deck. "We'll figure out monetisation later" kills deals instantly.
4. **Deck length is shrinking** -- successful decks run 10-15 slides. 30-slide decks signal over-engineering and lack of clarity.
5. **The market has bifurcated** -- 2021-era "raise on a deck alone" is dead. VCs now want playable builds with real retention data before writing cheques.

### Suggestions for Next Cycle (Week 2)

- Target Carry1st (Africa-focused mobile publisher, raised $27M+ Series B) -- their deck may be accessible
- Search for Kolibri Games or Rovio pitch materials (mid-core mobile with documented raises)
- Try Apify web browser actor for gamesindustry.biz and Business Insider (Homa 19-slide deck)
- Look for GDC Vault recordings of pitch competition finalists -- structural analysis opportunity
- Search for post-2023 mobile F2P raises specifically (MENA, Southeast Asia, Latin America studios)
- Investigate whether The Games Fund template has been updated since initial publication

---

## 2026-05-25 (Cycle 2) | industry_current | Web Research Cycle

**Agent:** research_agent (manual invocation)
**Bank:** industry_current
**Brief:** New events from last 7-14 days NOT covered in cycle 1 (Supercell/Metacore, Astrocade, FTC Genshin, Steam AI disclosure, Q2 layoffs/paradox)

### Searches Executed

1. "gaming industry news May 2026" (gamedeveloper.com, mobilegamer.biz, pocketgamer.biz, venturebeat.com) -- gamesindustry.biz blocked by crawler
2. "game studio funding acquisition May 2026" -- Grand Games $70M, Midsummer $2M bridge, Take-Two acquisition signal
3. "game industry layoffs closures studio May 2026" -- MercurySteam, 31st Union, Night Street Games, Bluepoint (Feb)
4. "Apple App Store Google Play policy changes games 2026" -- Google/Epic settlement, Fortnite global return, ASA loot box enforcement
5. "Unity Unreal engine update announcement 2026" -- Unity 6.4, Unity 7 cancelled, UE6 early access late 2026
6. "Epic Games Store news May 2026" -- free games promotions only, no strategic news
7. "Fortnite returns Apple App Store May 2026 Epic" -- global rollout 19 May, Australia excluded
8. "Take-Two GTA 6 acquisition plans Strauss Zelnick May 2026" -- iIcon conference, three-pillar capital allocation
9. "MercurySteam layoffs May 2026" -- workforce adjustment, Blades of Fire underperformance
10. "gaming AI tools announcements May 2026" -- Morgan Stanley $22B report, Roblox Cube (Feb), NVIDIA DLSS 5
11. "Morgan Stanley AI gaming $22 billion earnings potential report 2026" -- full report details
12. "Midsummer Studios Jake Solomon shutdown closure April 2026" -- $6M raised, closed without shipping
13. "Reggie Fils-Aime gaming industry warning layoffs May 2026" -- NYU talk, Nintendo anti-layoff philosophy
14. "gaming industry regulation EU UK loot box May 2026" -- ASA enforcement 26 May, EU Digital Fairness Act Q4 2026
15. "Nintendo Switch 2 preorder sales launch date May June 2026" -- 5 June launch, 3.5M units in 4 days
16. "game industry market data revenue Q1 2026 numbers report" -- Epyllion $195.6B record (2025), Newzoo $205B projection (2026)
17. "Zynga Match Factory Color Block Jam mobile gaming hit 2026" -- FY2026 mobile bookings $3.3B
18. "Polymarket Kalshi prediction markets competing mobile gaming 2026" -- Zelnick flagged as competitive threat to casual mobile
19. "31st Union layoffs 2K Project Ethos May 2026" -- PvP roguelike, undisclosed headcount
20. "Google Play Store 20 percent commission Epic settlement impact game developers" -- rollout timeline, financial impact
21. "Roblox AI Cube 3D announcement 2026 generative" -- February launch, 160K objects generated in beta
22. "Night Street Games layoffs May 2026 Last Flag" -- Imagine Dragons-funded, ~12 laid off, game underperformed
23. "Epyllion report gaming industry $195.6 billion record revenue 2025" -- Ball's annual report, funding crashed 55%
24. "Bluepoint Games Sony shutdown closure 2026" -- February closure, ~70 employees, live-service pivot failure

**Note:** gamesindustry.biz blocked by WebSearch crawler. CNBC/Morgan Stanley paywalled for full report detail. Yahoo Finance mirror provided partial data.

### Findings Kept (7 extracts)

| Extract | Relevance | Novelty | Actionability | Why kept |
|---|---|---|---|---|
| Google/Epic settlement -- Play Store commission drops to 20% | 9 | 7 | 9 | Largest structural shift in mobile platform economics. 33% fee reduction. Phased rollout through 2027. Direct impact on all mobile clients. |
| Grand Games $70M Series B (Istanbul, hybridcasual) | 8 | 7 | 7 | Counter-narrative to funding winter. 6x valuation jump in 12 months. Five autonomous studios model. Turkey mobile hub thesis. |
| Fortnite returns to App Store worldwide (19 May) | 8 | 6 | 7 | "Final battle" with Apple. Australia legal precedent. Combined with Google settlement, mobile fees being restructured in real time. |
| Morgan Stanley: AI could unlock $22B in gaming profits | 9 | 7 | 8 | First major investment bank to quantify AI cost impact. $275B market, 44% cost reduction, named winners/losers. Institutional credibility for NBI pitches. |
| UK ASA loot box advertising enforcement (26 May 2026) | 8 | 7 | 9 | Enforcement begins today. Specific disclosure requirements. EU Digital Fairness Act coming Q4 2026. Converging global regulation. |
| Take-Two: Zynga turnaround + GTA 6 acquisition signal | 7 | 6 | 7 | Mobile bookings $3.3B (+15%). Match Factory +33%. Prediction markets as competitive threat to casual. GTA 6 launch 19 Nov. |
| Midsummer Studios closure (Jake Solomon) | 7 | 7 | 6 | VC-funded indie failure case. $6M insufficient. Solomon's insight: VC demands transformational returns game studios rarely deliver. |

### Findings Rejected

- **MercurySteam layoffs (12 May):** Blades of Fire underperformance. Covered thematically by cycle 1's layoffs/paradox extract. No new structural insight.
- **31st Union / Project Ethos layoffs (8 May):** Undisclosed headcount. PvP roguelike pivot. Covered thematically by cycle 1.
- **Night Street Games layoffs (13 May):** Imagine Dragons-funded studio, ~12 laid off after Last Flag underperformed one month post-launch. Too small and niche for advisory relevance.
- **Bluepoint Games closure (Feb 2026):** Sony shut down the remake specialist (~70 employees) after cancelled live-service God of War project. Important but occurred in February -- not fresh enough for this cycle.
- **Nintendo Switch 2 launch (5 June):** Consumer hardware event. 3.5M units in 4 days. Low advisory relevance for NBI's client base.
- **Epic Games Store free games promotions:** Consumer-facing promotions with no strategic significance.
- **Roblox Cube 3D / 4D generation:** Announced February 2026, beta launched then. Interesting (160K objects generated, 64% playtime increase) but not new.
- **Unity 6.4 / Unity 7 cancellation:** March 2026 announcement. Unity 7 features folded into 6.x releases. Not fresh enough.
- **Reggie Fils-Aime NYU talk:** Interesting framing ("companies that have done mass layoffs are a red flag") but opinion/commentary rather than event with specific data.
- **Epyllion/Ball annual report ($195.6B record, funding -55%):** Published February 2026. Critical data but not fresh -- belongs in an earlier cycle.
- **Prediction markets (Polymarket/Kalshi) as mobile gaming competitor:** Cited by Zelnick. Interesting signal but speculative. Captured within Take-Two extract.

### Key Themes Emerging (Cycle 2)

1. **Mobile platform economics in structural reset.** Google dropping to 20%, Apple under "final battle" pressure, EU/UK regulation tightening. Studios should model fee reductions into 3-5 year plans.
2. **AI cost reduction thesis gaining institutional backing.** Morgan Stanley's $22B figure gives the narrative credibility. But the report's own warning -- lower barriers create new competitors -- is the more important insight for mid-tier studios.
3. **Funding bifurcation is confirmed.** Grand Games ($103M raised with chart hits) vs Midsummer ($6M raised with no shipped game). Proven metrics attract capital at premium; ambition without data attracts nothing.
4. **Regulatory convergence on loot boxes.** US (FTC enforcement), UK (ASA monitoring from today), EU (Digital Fairness Act Q4 2026). The compliance burden is becoming unavoidable.
5. **GTA 6 (19 Nov) will reshape Q4 2026.** Every publisher will avoid the launch window. This affects release scheduling for the entire industry.

### Suggestions for Next Cycle

- Deep dive on Google Play commission change impact: which studios have announced billing system changes
- Track EU Digital Fairness Act progress as Q4 2026 approaches
- Search for GDC 2026 AI adoption survey data (specific percentages of studios using AI tools)
- Monitor Apple's response to Fortnite global return and whether commission concessions follow
- Look for Newzoo or Sensor Tower Q1 2026 market data with segment breakdowns
- Track Nintendo Switch 2 launch impact on indie sales (cannibalisation vs platform growth)
