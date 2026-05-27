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

---

## 2026-05-26 | forecast_models | Web Research Cycle (Week 1)

**Agent:** research_agent (manual invocation)
**Bank:** forecast_models
**Brief:** Revenue and player forecasting methodologies with documented, replicable methodology. Sub-domains: revenue projection (F2P funnels, ARPDAU, whale economics), player growth/retention forecasting (cohort analysis, LTV curves, D1/D7/D30), production cost estimation, market sizing, live service event revenue modelling.

### Searches Executed

1. "mobile game LTV prediction model methodology cohort analysis D1 D7 D30 retention forecasting 2024 2025 2026" -- multiple Medium articles, AppsFlyer guide, arxiv paper
2. "ARPDAU revenue forecasting model free-to-play mobile game conversion funnel whale economics methodology 2024 2025 2026" -- Tenjin, Radoff, GameAnalytics, Beamable
3. "Eric Seufert Mobile Dev Memo LTV model attribution monetisation forecasting methodology" -- two key Seufert articles (LTV spreadsheet, marketing P&L)
4. "game development cost estimation model production budget team size genre platform methodology 2024 2025 2026" -- multiple generic guides, no replicable models
5. "GameAnalytics retention benchmarks 2025 2026 mobile game D1 D7 D30 genre methodology report" -- 2025 and 2026 reports found, investgame.net summaries
6. "live service game event revenue model battle pass seasonal event ARPDAU spike methodology forecasting 2024 2025" -- GameRefinery, Games Alchemy, Singular
7. "Deconstructor of Fun mobile game revenue model unit economics methodology ARPDAU LTV framework 2024 2025 2026" -- marketing predictions article, no standalone model
8. "Sensor Tower data.ai mobile game revenue forecast methodology bottom-up model genre ARPDAU retention benchmarks 2025 2026" -- State of Gaming data, methodology overview
9. "mobile game market sizing methodology TAM SAM SOM genre platform intersection indie developer forecast framework 2024 2025 2026" -- generic TAM/SAM/SOM guides, market size reports

**Deep fetches:** mobiledevmemo.com (Seufert LTV spreadsheet, marketing P&L), medium.com (Valeev retention model, Radoff F2P economics), tenjin.com (unit economics), beamable.com (F2P financial model), gamerefinery.com (seasonal events), gamesalchemy.substack.com (Meta Pass), gameanalytics.com (2026 benchmarks -- gated), gamedevreports.substack.com (2025 benchmarks summary), byyd.me (Sensor Tower summary), investgame.net (GameAnalytics 2026 PDF -- binary, unreadable)

**Note:** gamesindustry.biz blocked by WebSearch crawler. GameAnalytics 2026 full report behind registration gate. investgame.net PDF was binary/image-based carousel, not extractable.

### Findings Kept (5 extracts)

| Extract | Relevance | Novelty | Actionability | Why kept |
|---|---|---|---|---|
| Retention curve LTV model (Valeev) | 8 | 6 | 9 | Replicable power-curve methodology. Exact formulas for retention fitting + trapezoidal LTV calculation. Works with D1/D3/D7 soft-launch data. |
| F2P unit economics framework (Tenjin) | 9 | 6 | 9 | Complete bottom-up financial model with worked example ($1.2M scenario). Backward-from-revenue approach ideal for investor decks. Google Sheets template available. |
| Marketing P&L / ROAS framework (Seufert) | 8 | 7 | 8 | Cash-at-risk and projected receivables methodology. Cohort stacking model. Answers "how much capital do I need for UA?" -- critical for indie studios. |
| F2P whale economics + economic voltage (Radoff) | 7 | 6 | 7 | Operational data: top 20% = 75% revenue, top 1% = 24%. Event ARPDAU multiplier of 2-3x. Multi-currency design framework. |
| GameAnalytics 2025 retention benchmarks | 8 | 5 | 8 | 11,600 games, 1.48B MAU. D1/D7/D28 by genre, platform, region, percentile. Industry-standard reference for calibrating LTV models. |

### Findings Rejected

- **Beamable F2P Financial Model:** Google Sheets template exists and is referenced frequently, but the blog post exposes zero methodology. It is a black-box spreadsheet with no documentation of formulas or assumptions. Excluded per brief (no black-box tools).
- **GameRefinery seasonal events article:** Two case studies (Whiteout Survival +50% daily revenue, Clash of Clans +300%) but no modelling framework, no systematic methodology. Anecdotal only.
- **Games Alchemy Meta Pass (Substack):** Design philosophy for progression systems. No quantitative data, no revenue modelling, no forecasting methodology. Purely conceptual.
- **Seufert "Two Methods for Modeling LTV with a Spreadsheet":** The page is a teaser/announcement for a SlideShare presentation and downloadable spreadsheet from Slush 2013. No methodology exposed on the page itself. The underlying methodology is captured in the Valeev extract (same approach).
- **Generic TAM/SAM/SOM guides (Adapty, CharliA, HG Insights):** Standard market sizing frameworks with no gaming-specific methodology. The approach is well-known; what NBI needs is gaming-specific market data to feed into it, not the framework itself.
- **Production cost estimation articles (Oski, Juego Studios, Koderspedia, WhimsyGames):** All are "how much does game development cost" listicles with broad ranges ($50K-$400M). No replicable estimation model, no formula, no methodology. Just ranges by genre/complexity. Excluded per brief (no generic advice).
- **Sensor Tower State of Gaming / State of Mobile:** Market-level revenue data ($82B IAP, $94B total gaming) but no methodology documentation. Their panel-based estimation approach is described at a high level but the actual model is proprietary.
- **Funmetric "Predicting Players LTV in F2P" (Medium):** Referenced CALTV deep learning approach. Excluded -- requires large datasets (10M+ events) and ML infrastructure that NBI's indie-to-mid-tier clients will not have.
- **AppQuantum "Using Predictive Analytics in Mobile Gaming":** Generic overview of prediction approaches without replicable methodology. Marketing content.

### Key Themes Emerging

1. **Three models form a complete forecasting stack.** Valeev (retention curve -> LTV), Tenjin (unit economics -> revenue target validation), Seufert (cash flow -> UA capital requirements). Used together, these go from "I have D1/D7 data" to "here's how much capital I need and when it comes back."
2. **Retention benchmarks are declining industry-wide.** D1 top quartile dropped 1-2pp from 2023 to 2025. Models built on older benchmarks will overestimate LTV. NBI should use 2025 data as baseline with conservative haircut.
3. **Production cost estimation has no good public models.** Every source found was a listicle with ranges. This sub-domain needs a different research approach -- perhaps GDC talks or consulting frameworks rather than blog posts.
4. **Live service event modelling is poorly documented.** The Radoff 2-3x ARPDAU multiplier is the only concrete number found. The GameRefinery case studies are anecdotal. This sub-domain also needs deeper research.
5. **The whale distribution (20/75, 1/24) is the most important assumption in any F2P revenue model.** It determines whether a game's economics work at indie scale. NBI should validate these ratios against actual client data when available.

### Suggestions for Next Cycle (Week 2)

- **Production cost estimation:** Search GDC Vault for talks on game budgeting methodology. Look for Rami Ismail's cost framework. Search for post-mortems with detailed budget breakdowns.
- **Live service event revenue:** Search for specific battle pass revenue contribution data (% of total IAP from pass vs direct purchase). Look for MachineZone/Scopely/Supercell operational data from GDC talks.
- **Market sizing by genre/platform:** Access Newzoo or Sensor Tower genre-level revenue data. Look for Niko Partners MENA/SEA market sizing methodology docs.
- **Retention curve validation:** Search for academic validation of power curve vs exponential vs Weibull retention models. Which fit best for which genres?
- **Try Apify web browser actor** for GameAnalytics 2026 full report (behind registration gate) and gamesindustry.biz articles on forecasting methodology.

---

## 2026-05-26 (Cycle 3) | industry_current | Web Research Cycle

**Agent:** research_agent (manual invocation)
**Bank:** industry_current
**Brief:** New events from last 7 days NOT covered in cycles 1-2 (Supercell/Metacore, Astrocade, FTC Genshin, Steam AI disclosure, Q2 layoffs, Google/Epic settlement, Grand Games, Fortnite App Store return, Morgan Stanley AI report, UK ASA enforcement, Take-Two/Zynga, Midsummer closure)

### Searches Executed

1. "gaming industry news May 20-26 2026 latest" -- Bungie/Destiny 2 sunset, PS Plus price increase, Warhammer Skulls
2. "game studio funding round acquisition deal May 2026" -- Reforged Studios $30M, Scopely/Loom Games $1B (Feb), SHIFT UP/UNBOUND (March)
3. "Bungie layoffs Destiny 2 development end May 2026" -- Bloomberg report, third layoff wave, Monument of Triumph details
4. "PlayStation Plus price increase May 2026 details" -- $1-2/month increase for new subscribers, Essential/Extra/Premium affected
5. "Reforged Studios $30 million funding gaming IP platform 2026" -- MEP Capital, indie IP consolidation model
6. "Nintendo Switch 2 launch sales numbers June 2026" -- 3.5M units in 4 days, 19.86M in first fiscal year (historical, not new)
7. "gaming regulation legislation May 2026 new laws" -- US state sweeps casino bans, prediction market regulation (gambling, not video games)
8. "Unreal Engine Unity engine update announcement May 2026" -- UE6 reveal at RLCS Paris Major 24 May
9. '"Unreal Engine 6" announced revealed May 2026 features details' -- multithreading overhaul, Verse language, UEFN merge, 2028-2029 timeline
10. "Summer Game Fest 2026 announcements schedule" -- June 5-8, 60+ indie titles, Valve teaser
11. "PlayStation State of Play June 2026 announcements" -- June 2, 60+ minutes, Wolverine deep dive
12. "game industry layoffs studio closures news this week May 2026" -- Survios (May 1), Spiders (Apr 30), Mattel (May 22)
13. "Bungie layoffs significant number Destiny 2 sunset Marathon details headcount" -- third wave, 850 employees in 2024, previous rounds data
14. "Spiders studio GreedFall closure May 2026 details" -- Nacon liquidation, 18 years, STJV union statement
15. "Mattel gaming layoffs May 2026" -- 65 employees, $160M Mattel163 full buyout from NetEase
16. "Valve announcement Summer Game Fest 2026 Steam" -- Steam Machine/Frame hardware rumour, HLX project speculation
17. "Survios VR studio layoffs May 2026" -- majority of dev team let go, VR pioneer effectively shuttered
18. "AI gaming tools announcements partnerships May 2026" -- no major new deals found beyond existing coverage
19. "game industry OR gaming news deals acquisitions funding site:pocketgamer.biz May 2026" -- Q1 M&A $7.7B report, 52 deals
20. "Xbox Games Showcase 2026 announcements June" -- June 7, Gears of War E-Day Direct
21. "mobile gaming news deals May 20-26 2026" -- NetEase 520 conference, Sensor Tower consolidation
22. "NetEase 520 conference 2026 announcements details games" -- 40+ games, Marvel Rivals, Once Human, Sea of Remnants
23. "Savvy Games Group Moonton acquisition $6 billion 2026" -- March 20 deal, ByteDance divestiture, 1.5B downloads/110M MAU
24. "Scopely Loom Games acquisition billion 2026" -- $1B valuation, 20-person Istanbul studio, Pixel Flow
25. "gaming industry Q1 2026 M&A $7.7 billion deals report" -- Aream & Co vs Drake Star data, revenue benchmarks
26. "Drake Star gaming report Q1 2026 M&A deals May" -- 51 deals, $100B+ (inc. Paramount/WBD $110B), private financings $785M
27. "Apple Epic Supreme Court App Store commission gaming May 2026" -- SCOTUS denied Apple stay (May 6), Apple filed for full review (May 21)
28. "gaming venture capital investment Q1 Q2 2026 report data" -- VC early-stage gaming at post-pandemic low despite $300B total tech VC
29. "Warhammer Skulls 2026 announcements Dawn of War IV May" -- May 21 event, Dawn of War IV Sept 17 release

**Deep fetches:** shacknews.com (Bungie details), eteknix.com (Bungie financial data), techtimes.com (Bungie layoff history + Marathon metrics), pocketgamer.biz (Q1 M&A data), drakestar.com (Q1 deal breakdown), cinelinx.com (UE6 technical details), winbuzzer.com (UE6), kitguru.net (UE6), kotaku.com (Bungie/Destiny 2)

**Note:** gamesindustry.biz still blocked by WebSearch crawler. Bloomberg paywalled for full Bungie reporting. Most UE6 articles had minimal technical substance beyond the teaser announcement.

### Findings Kept (4 extracts)

| Extract | Relevance | Novelty | Actionability | Why kept |
|---|---|---|---|---|
| Bungie Destiny 2 sunset + third layoff wave | 8 | 7 | 7 | Major live-service shutdown with $766M Sony write-downs across two fiscal years. Third layoff wave at a $3.6B acquisition. Marathon underperforming (59% concurrent player decline). |
| Unreal Engine 6 announcement (24 May) | 8 | 8 | 7 | First official UE6 reveal. Multithreading overhaul, Verse language, UEFN merge. Preview builds 2027-2028. Affects studio technology planning. |
| Q1 2026 gaming M&A: $7.7B across 52 deals | 8 | 7 | 8 | Concrete market data with deal-level breakdown. Console revenue ($21.7B) overtook mobile IAP ($20.5B) for first time. Saudi capital dominated ($7B+ of $7.7B). VC early-stage gaming at post-pandemic low. |
| Reforged Studios $30M indie IP platform | 7 | 6 | 7 | New mid-market consolidation model: buy proven indie IP and extend lifecycles. Non-endemic PE capital. Alternative exit path for indie studios. |

### Findings Rejected

- **PlayStation Plus price increase (May 20):** $1-2/month for new subscribers in select regions. Consumer pricing change with no strategic implications for game studios or NBI advisory. Low actionability.
- **Spiders/Nacon studio closure (late April/May 1):** French AA RPG studio liquidated after 18 years. Interesting "RPG middle class disappearing" narrative and STJV union statement blaming Nacon mismanagement. Excluded on freshness -- dates to April 29-May 1, outside the 7-day window.
- **Survios VR shutdown (May 1):** Pioneer VR studio effectively shuttered, majority of dev team let go. VR market contraction signal (joins Polyarc mass layoffs in March). Excluded: low advisory relevance for NBI's client base and just outside the 7-day window.
- **Mattel gaming layoffs (May 22):** 65 employees at El Segundo HQ, part of ongoing restructuring ($200M cost savings target). IP licensing play (Mattel163 buyout from NetEase). Excluded: too peripheral to core gaming advisory.
- **Summer Game Fest / Xbox Showcase / PS State of Play schedules:** Consumer events not yet occurred (June 2-8). No advisory-relevant data until after they happen.
- **Warhammer Skulls 2026 (May 21):** Dawn of War IV release date (Sept 17), Boltgun 2, Darktide DLC. Consumer game announcements with no strategic or market data.
- **NetEase 520 Conference (May 20):** 40+ games showcased. Consumer content roadmaps for existing titles. No M&A, funding, or policy data.
- **Apple vs Epic Supreme Court escalation (May 6-21):** SCOTUS denied Apple's stay, Apple filed for full review of contempt finding. Extends existing coverage (Fortnite return, Google settlement already captured). Incremental legal development rather than new event.
- **Valve/Steam Machine rumours:** Speculative based on Summer Game Fest teaser. No confirmed announcement. Excluded per brief rules (no vague trend pieces).
- **SHIFT UP/UNBOUND acquisition:** March 2026 announcement, outside the 7-day window.
- **Scopely/Loom Games $1B:** February 2026 deal, outside window. Captured as supporting data in Q1 M&A extract.

### Key Themes Emerging (Cycle 3)

1. **Live-service economics under severe stress.** Bungie's $766M in write-downs on a $3.6B acquisition is the clearest signal yet that premium live-service valuations were unsustainable. The Destiny 2 sunset + Marathon underperformance is a dual failure.
2. **Console revenue overtaking mobile IAP for the first time** is a structural shift driven by Switch 2, not a cyclical blip. Mobile downloads declining even as IAP holds above $20B suggests the mobile market has hit a ceiling.
3. **Saudi capital is the dominant force in gaming M&A.** Savvy Games Group + Scopely accounted for $7B+ of the $7.7B Q1 total. This concentration of capital in a single sovereign fund reshapes the acquirer landscape.
4. **Mid-market indie IP consolidation is emerging as a new category** between full studio acquisitions and organic growth. Reforged's $30M platform model offers indie studios an alternative to closure.
5. **UE6 announcement resets the engine planning clock.** Studios committing to UE5 for 2026-2027 titles are safe, but anyone planning 2028+ projects needs to factor UE6 migration costs and the Verse language transition.

### Suggestions for Next Cycle

- Track Bungie layoff headcount when disclosed -- third wave numbers will clarify the scale of Sony's restructuring
- Monitor Summer Game Fest (June 5) and Xbox Showcase (June 7) for any M&A or strategic announcements alongside game reveals
- Follow Apple Supreme Court response to Epic -- full review decision expected Q3 2026
- Check for Newzoo/Sensor Tower Q1 2026 mobile market reports with genre breakdowns (mobile download decline context)
- Track Switch 2 software attach rate data to understand whether console > mobile is sustained or launch-driven
- Monitor Discord IPO timing and valuation -- would be the first major gaming-adjacent IPO in years

---

## 2026-05-27 | production_methods | Web Research Cycle (Week 1)

**Agent:** research_agent (manual invocation)
**Bank:** production_methods
**Brief:** Game studio production frameworks for teams of 20-100 people. Sub-domains: sprint/milestone planning, remote-first production, pre-production to production transitions, live ops cadence, Shape Up adaptations, vertical slice milestone gates.

### Searches Executed

1. "game studio production methodology 20-50 person team sprint milestone planning creative engineering coordination 2024 2025 2026" -- mostly generic Scrum/agile guides, GS-Studio blog, Codecks sprint guide
2. "Shape Up methodology game development studio adaptation basecamp alternative agile games 2024 2025" -- extensive Shape Up documentation but zero game studio adoption examples found
3. "remote first game studio production process hybrid team 40-80 people workflow 2024 2025 2026" -- generic remote work guides (AWS, Perforce, Gamixlabs), no studio-specific methodology
4. "GDC production track talk game development process small studio post-mortem agile alternative 2023 2024 2025" -- Game Developer best production talks list, GDC Vault links, Class Central GDC index
5. "Supergiant Games Hades production process team size workflow how they make games" -- two strong sources (Game Developer interview, Kotaku feature)
6. "vertical slice milestone gate game development pre-production to production transition framework indie mid-size studio" -- Rami Ismail LTPF milestones page, Tono Game Consultants, askagamedev Tumblr
7. "site:gamedeveloper.com production process studio team workflow methodology post-mortem 2024 2025" -- Designing a Production Process series, CSA article, various post-mortems
8. "Larian Studios Baldur's Gate 3 production process team structure" -- 400+ people, excluded per brief (too large)
9. "Coffee Stain Studios Satisfactory Deep Rock Galactic production methodology" -- minimal methodology detail, redirected to Ghost Ship Games
10. '"game production" "we stopped using scrum" OR "ditched agile" OR "moved away from sprints"' -- zero results
11. "Codecks game development project management tool" -- Codecks feature overview, adoption data (up to 100-person teams)
12. "indie game studio production post-mortem team 20-60 people 2023 2024 2025" -- Inevitable Studios 2024 lessons, generic guides
13. "Ghost Ship Games Deep Rock Galactic production process remote team workflow live ops update cadence" -- team size (~40-54), seasonal cadence, open development model
14. "game development production methodology kanban cooldown cycle creative engineering coordination mid-size studio" -- Tono Kanban guide, generic Kanban articles
15. "Dodge Roll Games OR Team Cherry development methodology" -- both too small (<10 people), excluded
16. "game studio remote distributed team production process 50-100 people 2024 2025 GDC" -- generic remote work articles, Codecks collaboration guide
17. "vertical slice pre-production transition gate criteria team 20-100 people 2023 2024 2025" -- Walla Walla Studio article (404), Tim Cain 9-stage framework
18. "live service game update cadence scheduling season pass content pipeline production methodology indie mid-size studio 2024 2025" -- Magic Media overview, Hades II 6-8 week cadence reference

**Deep fetches:** gamedeveloper.com (Designing a Production Process Part 1, Supergiant Hades interview, CSA article), ltpf.ramiismail.com (milestones), kotaku.com (Supergiant anti-crunch), tonogameconsultants.com (Kanban in game dev), gameworldobserver.com (Tim Cain 9 stages), creativedenmark.com (Ghost Ship Games), codecks.io (sprint guide, collaboration guide), inevitablestudios.com (2024 lessons), robert.zubek.net (production practice PDF -- binary, unreadable)

**Note:** gamesindustry.biz blocked by WebSearch crawler. Walla Walla Studio vertical slice article returned 404. Robert Zubek's production practice PDF (SomaSim) was binary/image-based, not extractable. Shape Up has zero documented game studio adoptions despite extensive general documentation. Reddit blocked by WebSearch crawler.

### Findings Kept (5 extracts)

| Extract | Relevance | Novelty | Actionability | Why kept |
|---|---|---|---|---|
| Rami Ismail LTPF Milestone Framework | 8 | 6 | 9 | Complete 4-phase framework with gate criteria for 6-10 person teams. Most widely referenced indie milestone system. Directly usable as publisher milestone definitions. |
| Supergiant Games Hades monthly milestone cadence | 8 | 7 | 7 | 17-person team. Monthly cadence with phase gates (code-open, code-locked, polish, ship). Anti-crunch policies with proven outcomes. "Ripple effect" test for scope changes. |
| Ghost Ship Games open development + live-ops | 7 | 6 | 7 | 40-54 person team. Crunch-free 6+ year development. 4-6 month seasonal cadence. "Develop by doing, not talking." Information-sharing stand-ups vs task-assignment stand-ups. |
| Tim Cain 9-stage production framework | 7 | 7 | 7 | "Beautiful Corner" concept: small polished area proving visual quality before committing to full production. Horizontal Slice for connectivity testing. 30+ years experience distilled. |
| Critical Stage Analysis (CSA) by Wolfgang Hamann | 7 | 7 | 8 | Monthly 3-question feedback framework replacing postmortems. 2-4 hours per cycle. Accountability chains. Insertable into any existing methodology without disruption. |

### Findings Rejected

- **Larian Studios / Baldur's Gate 3:** Quality-first philosophy and story-first team structure are well-documented, but the studio grew to 400+ people across 7 global offices. Excluded per brief (too large for NBI's 20-100 person client range).
- **LucasArts Star Wars: First Assault sprint methodology:** Detailed 2-week sprint structure with physical boards, ~20 person team. However, the project was cancelled (never shipped), and the methodology was developed within LucasArts (large studio infrastructure). Useful as a reference but not as a proven exemplar.
- **Dodge Roll Games (Enter the Gungeon):** Team of ~5 people. Too small for the brief's 20-100 person range. No formal methodology documented beyond "handcraft rooms then procedurally connect them."
- **Team Cherry (Hollow Knight):** 3 people, no formal methodology ("What is Jira?"). Interesting anti-process stance but inapplicable at the brief's target scale.
- **Inevitable Studios 2024 lessons:** Small team, no specific headcount disclosed. Useful pain points (animation pipeline debt, scope management) but no replicable methodology framework.
- **Codecks sprint planning guide:** Competent synthesis of sprint methodology adapted for games, but it is product documentation from a tool vendor, not a studio's documented experience. The game-specific adaptations (phase-based cadence, milestone alignment) are captured in other extracts.
- **Tono Game Consultants Kanban guide:** Useful Kanban positioning (stabilisation complement to Scrum/Waterfall) and V*R prioritisation formula, but no specific studio case studies or team-size evidence. The author lists credits (Halo Infinite, Minecraft, Pokemon Go) but does not detail how Kanban was applied there.
- **Shape Up methodology:** Extensively documented by Basecamp with clear game-relevant properties (6-week cycles, shaping, betting table, cooldown). However, zero documented game studio adoptions were found despite extensive searching. Cannot include as a game production methodology without evidence of game studio use.
- **Generic remote work guides (AWS, Perforce, Gamixlabs, Treeobit):** Tool-focused or generic advice. No specific studio methodology, team sizes, or outcomes documented.
- **Coffee Stain Studios:** Decentralised model with lean teams, but no production methodology documentation found beyond general company description.

### Key Themes Emerging

1. **Monthly milestone cadence is the sweet spot for small-to-mid studios.** Both Supergiant (17 people) and the CSA framework converge on monthly cycles. This is shorter than traditional publisher milestones (quarterly) but longer than Scrum sprints (2 weeks). The monthly rhythm allows meaningful creative iteration while maintaining production discipline.

2. **Phase gates within milestones solve the creative-engineering coordination problem.** Supergiant's pattern (code-open early, code-locked mid, polish late) creates a natural handoff sequence that does not require heavyweight cross-department meetings. This is more organic than Scrum ceremonies and more structured than pure Kanban.

3. **Anti-crunch is a production methodology choice, not just a culture statement.** Supergiant's mandatory PTO, Ghost Ship's 6+ years crunch-free, and both studios' commercial success directly challenge the "crunch is necessary" assumption. The methodology implication: if your process requires crunch, the process is broken, not the team.

4. **The Beautiful Corner is an underused de-risking tool.** Tim Cain's concept fills a gap between prototype and vertical slice that most frameworks skip. For studios pitching to publishers, a Beautiful Corner is cheaper than a vertical slice and proves visual ambition earlier.

5. **Shape Up has no documented game studio adoption.** Despite its theoretical fit (6-week cycles, creative autonomy, cooldown periods), no game studio has publicly documented using Shape Up. This is a gap worth monitoring but not a recommendation NBI can make yet.

6. **Postmortems are structurally flawed; continuous feedback is better.** CSA's monthly 3-question format with accountability chains is more actionable than end-of-project postmortems where the team has already disbanded.

### Suggestions for Next Cycle (Week 2)

- **Search for GDC Vault talks on production at 30-80 person studios** -- specific talk titles and speakers, not just the conference schedule
- **Search for Klei Entertainment (Don't Starve, Oxygen Not Included) production methodology** -- ~40 person studio with multiple shipped titles and live-ops experience
- **Search for Motion Twin (Dead Cells) flat hierarchy and production process** -- anarcho-syndicalist co-op model, ~20 people, live-ops success
- **Search for Iron Gate (Valheim) and Coffee Stain publishing relationship** -- small team with massive commercial success, production under publisher support
- **Search for "Shape Up" game development adoption** on Reddit (via Apify web browser actor, since Reddit is blocked) -- may find practitioner discussions not indexed by WebSearch
- **Search for Remedy Entertainment (Control, Alan Wake 2) production methodology** -- ~300 people but may have documented AA-scale processes from earlier in their history
- **Search for pre-production to production transition failures** -- studios that shipped late or over budget due to skipping vertical slice or extending pre-production too long
- **Try Apify web browser actor for GDC Vault** to access production track talk transcripts and slides behind the paywall
