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
