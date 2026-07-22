# Client: Couch Heroes -- Knowledge Bank

**Last compiled:** 2026-07-22 (incremental)
**Sources:** 140 extracts (103 Granola, 9 Gmail, 6 Slack, 10 OneDrive, 9 ChatGPT, 1 Downloads) -- 10 new since 2026-07-17 (all Granola 2026-07-20 to 2026-07-22); 2 carry-forward extracts from 2026-07-14 pending identification
**Role associations:** producer, production_consultant, head_of_people, gaming_practice_lead

---

## Executive Summary

Couch Heroes (CH Game Development UK Ltd) is NBI's largest active client at GBP 30k/month. The studio has approximately 55-70 employees across UK and Greece (55 cited in July 1 briefing; ~70 cited mid-June; discrepancy may reflect counting methodology or headcount changes), building a cosy byte-punk MMORPG targeting late 2028 launch. Glen serves as fractional CPO, leading a production transformation. The vertical slice has been reframed as POG (Proof of Game) with five formal objectives; the VS estimation was formally committed July 1 2026 at T4 floor, ±10% buffer. Simon Woodruff (Head of Design) is through observation mode; vision pillar format is locked (headline+subheading+story, mandatory red-team). OKR thresholds agreed; Wednesday is formalised merge day; tooling migration timeline set (Jul: Confluence/ClickUp; Aug: Confluence company-wide; Sep: Jira). CTO search active; Chris Southall (Simon referral) is lead candidate. Investor strategy confirmed: blue-chip dividend-yield investors. VDR in preparation; combat at 13 months (Nadir) is the VS critical path blocker. Studio health has recovered materially (art 3/10 to 7.5-8; studio 2.5-3 to 6). World lore and cosmology locked June 29-30. CPO scope formally defined: HR, Finance, IT, Legal, PM -- producers own the game, CPO covers everything else. Budget governance established for new Finance hire (Lili, started July 1): two-house model (game dev vs studio ops), 5 macro codes, L&D split (central HR + departmental), petty cash at director level only, AI tools excluded from petty cash. Performance composite dashboard (Slack+Jira+Perforce) approved to surface the 30/55 effective output gap; visibility-first, leads only, no HR escalation direct from signal. HR People Ops Specialist started July 6 2026.

**New (2026-07-06):** Forced art direction lock session convened; Glen is sole unlock authority -- future art direction proposals submitted as formal alternatives only, existing lock not reopened for debate. VS proxy (Tier 1) confirmed as correct VS1 quality target; ~1:1.8 proxy-to-finished ratio; skunkworks icon parallel track agreed with Graeme (EP) and Art Director. Tutorial Cave kick-off: single-player zone confirmed from start area through to portal (Robin to confirm if all the way to Portal Peak); telemetry-triggered prompts replace rigid click-through tutorial; investor-facing VS demo walked live by Creative Director. GDD-first pipeline declared non-negotiable: engineering kicks back any request without a design document; escalation to CPO if engineering is pushed; Glen to address dev team directly by EOD 7 July 2026. Concept art repositioned as a support function -- assets approved by relevant lead are not sent back to concept; AI art policy conversation scheduled with Art Director.

**New (2026-07-07, carry-forward):** NPE single-player design locked (four-stakeholder sign-off: Glen, Vardis, David, Robin): Tutorial Cave fully instanced single-player; Portal Peak also single-player phased with cloud cover as instance boundary; balloon down into open multiplayer valley after Portal Peak completion; two balloon rides (mechanic introduction + Downtime city flyover reveal on completion); Drifters Cross faction owns balloon mechanic in-world. Concept-first gate for new art work: mandatory concept pass required before any new character or environment art work begins (artists had been bypassing to AI generation or direct 3D build); concept team right-sized from 5 to 2 (highest output, most versatile, AI-friendly); gate applies to new work forward only -- approved assets already in build not sent back retrospectively.

**New (2026-07-08):** Brand identity priority sequence agreed with Larisa (graphic designer/social media, 8 Jul 2026): identity → persona → brand bible → web presence → player segmentation → community management plan; community execution deferred until gameplay content and campaign cadence are in place; Larisa reporting directly to CPO for brand work (continues reporting to Art Director for other work); concept artists at ~35% capacity available for brand briefs; next step: brand walkthrough Tuesday 14 Jul 2026. Game design pillar craft session (8 Jul 2026, multi-session process begun): 20-candidate generation method per pillar before selection; "choice of words is a choice of worlds" -- engineering interprets wording literally; candidate lines that survived session testing: "Crafting the journey is its own reward" (strongest reaction, covered questing/builds/fishing/all player types), "Identity isn't chosen, it's practiced" and "Your habits are your hero" (player identity/reputation pillar candidates); no final selections made in-session; session attendees: CPO, CEO/Creative Director, senior creative lead.

**New (2026-07-10, carry-forward):** AI 3D asset pipeline validated -- 90% AI + human refinement pass model adopted as standard operating model; Tripo demonstrated live (Unreal-ready 3D model delivered ~70 minutes after concept meeting); AI specialist role confirmed as two separate hires (code AI vs art AI distinct skill sets); peer advocacy without personal adoption identified as compliance risk. Formal Definition of Done process added to sprint cycle: QA integrated as a discrete process block right of dev/creative cycle; three-head concurrent review (creative director + product + direct lead); 15% overflow normal calibration, 40%+ triggers audit; Jira DoD stage field added to all features and stories.

**New (2026-07-11):** Post-VS leads trip to Greece planned for late September 2026 -- transition ritual from vertical slice delivery into next phase. Three-session structure: AI studio layout, financial reality (intentionally partially ambiguous to preserve productive pressure), growth rhythm co-creation. Budget estimate ~€10k for 6-person leads from distributed UK/EU locations. Glen preference: Greece preferred over UK for timing and atmosphere.

**New (2026-07-15):** DoD authority formally clarified: Game Director owns the Definition of Done; Creative Director has no vote on DoD; CEO override must be explicitly framed as CEO authority (not directorial opinion); engineering DoD was confirmed as missing from current milestone architecture. Two-axis player archetype framework agreed (CPO and Head of Design): solo/group axis plus no-impact/high-impact axis produces four quadrants covering all player motivation profiles; current pillar language diagnosed as skewing cozy/casual (cosmetics-motivated casual raiders dominate); Pokemon (archetype balance model) adopted as benchmark target; pillar alignment session with full leadership required before pillars are locked. World persistence model agreed (CPO and Head of Design): semantic state model based on the apophenia principle (Tynan Sylvester/RimWorld -- players construct narrative from emergent state, not authored sequences); Head of Design brings validated implementation from prior project (300,000 entities <0.001ms); agreed as the viable technical path for CH's "living world where actions matter" pillar.

**New (2026-07-16):** VS1 scope locked in a triage session (CPO, EP/Game Director, Head of Design, Vardis CEO present): 4-enemy minimum with unique combat behaviour per enemy (wolves/goblins up the mountain, corrupted guardian at summit, Carapax or skeleton backup in dungeon); magic demonstrable via scripted scroll encounter in VS1 (wizard hands scroll, player fires fireball, destroys corrupted guardian); loot auto-distribution to party added to scope as a gap required for the demo loop; Head of Design to produce full profession designs for VS2/VS3. CPO design session established item provenance philosophy: items must accumulate history and be improvable via essence absorption rather than replaced seasonally; signed vs unsigned crafting as player agency. Systemic design principles formalised drawing on Blizzard/UCLA and Xbox experience: verbs-and-rules model, kill-tag to last hit, body-fly distance 300 yards, toxicity R-value modelling. COO and CPO agreed in-principle direction for live service monetisation: CS:GO-modelled secondary market for earned items, two-currency architecture, revenue share back to partner games; explicitly not NFT/crypto; pending live service document formalisation; Gamescom (late August) as pitch-ready deadline.

**New (2026-07-17):** Creative leadership alignment 2x2 session run (CPO facilitating): two senior creative roles mapped on Choice/impact vs Cozy and Solo vs Group axes; misalignment found between positions; coloured-dot boundary exercise agreed as follow-on to be run same afternoon. VS1 scope cut finalised using two-bucket method (must be in build / must not be in build): PVP/arena/range combat/loot distribution/mount pets/character creation deferred; core item/entitlement/consumables/equipment inventory retained. Game Director operating model formally agreed for Robin Jubber: monthly department touchpoints, directional questions only ("How do you feel about the direction of the game?"), findings brought to Product Council; hands-on design work fully transfers to Simon Woodruff. Scope change gate incident: late-night investor-driven magic abilities scope addition was announced directly to team without Product Council gate; Art Director blindsided; fix agreed -- all scope changes must go through Product Council before team announcement, regardless of origin. Three-tier AI governance framework presented to Art Director and adopted as studio policy: Tier 1 Private/In-House (LLaMA local, ComfyUI local -- IP-safe), Tier 2 Public Frontier (Claude/ChatGPT/Gemini -- restrict to non-IP unless enterprise accounts), Tier 3 Industry-Specific (Tripo, Meshy -- audit data handling before adoption); sub-team sentiment mapped by discipline.

**New (2026-07-20 to 2026-07-22):** Production meeting 20 Jul identified animation velocity as a project-critical risk (4 animations in 6 months; ~2031 projection at current rate); outsource blitz (Keywords, Virtuos, Evolution Recruitment) active mitigation. QA direct-to-engineer bug pinging replaced by EP-triaged spreadsheet; weekly build cadence target set. IR35 contractor compliance reform decided 21 Jul (Glen, Aris, Lorenza, Ellis): daily rate billing, 216 billable days/year, effective end of August. VS1 scope further tightened in directors and leads sync 21 Jul: UE5.8 upgrade complete; T-pose NPC animation bug and GPU bottleneck are active risks; all DoDs locked by 23 Jul. Key VS1 design decisions: currency "bits" confirmed; bazaar district replaces single auction house; double jump removed in favour of fast ledge grab; guild house UI mock-ups required for VS1. AI IP incident 22 Jul: team member loaded CH creative direction documents into a personal AI tool; all new AI access grants paused; enterprise-only AI policy and DPO engagement required. RMT marketplace architecture confirmed: CH will never be bank of record for real-money trades; closed-gate Steam Wallet model; consumable/durable distinction and provenance tracking are non-negotiable. Design alignment session 22 Jul (Glen and Robin): pillar three-component structure (is/is-not/failure signals), feature-to-pillar mapping as a gate, resonance as systemic DoD, day/night cycle as first base layer, consensual PVP zones only at launch.

---

## Company Profile

**Entity:** CH Game Development UK Ltd (Greek-headquartered, UK entity established 2026) [source: ch_uk_company_guidance_2026-03-26]
**Size:** ~70 employees as of mid-June 2026; ~55 cited in July 1 briefing context [source: granola_301693b4, granola_28f30e99, 5d50bc6a]
**Working model:** 100% remote
**Funding:** $5M round closed May 2026; $10M next target; GBP 10-15M raised to date. Vardy family companies (~23.8B conglomerate) significant backers. Cap table full; 2-3 more raises expected. Non-games funding source (~$13-14B fund) also backing. Funding is not a current constraint [source: granola_301693b4, granola_5694690e, granola_5148908e].
**Investor strategy:** Target blue-chip dividend-yield investors (stable returns), not gaming VC flippers. Xbox front page generates approximately 200x download multiplier vs organic [source: not_Ua643ajeN9C1f7_publisher].
**Publisher strategy:** Self-publish confirmed. Sub-studio model (IP licensing) discussed; not decided [source: not_Ua643ajeN9C1f7_publisher].
**Greece operations:** Digital Nomad Visa 7% tax for 8 years; 5% flat dividend tax; 22% corp tax. 30% video game tax credit in legislative process [source: granola_54a02074, granola_c67dc278]. Greece gaming campus: Vardis met Athens Mayor; Ellinikon site under discussion; all plans before 20 July summer blackout [source: granola_688a29e4, granola_d0c199fc].
**External legal:** Saybrook Legal engaged April 2026; Mishcon for contract templates [source: ch_downloads_recent_2026-05, granola_93bc0089].
**Game launch target:** Late 2028 [source: granola_301693b4].

**C-suite composition at ~55 staff (July 1 2026):** Founder CEO (Vardis), COO (Aris), CPO (Glen fractional), CTO (search active), Head of HR under CPO [source: 022a922c].

**Tencent (Level Infinite) publishing terms:** Sole data controller for all player telemetry. All telemetry via GCP; PII stripped before studio delivery. Login gate required. US military watchlist exposure: TikTok-style forced split plausible at scale. Do not build monetisation dependent on demographic targeting CH does not control. Negotiate demographic enrichment as a contract term [source: 2026-06-22_tencent-data-sovereignty-publishing-terms].

---

## Key People and Dynamics

**Vardis (CEO/Creative Director):** Receptive to feedback. Tendency to converge too quickly in group settings. Post-AMA: game-first, platform-second confirmed studio-wide mandate [source: ch_offsite_working_doc_2026-04-27, granola_bad498ba].

**Aris (COO):** Makes operational decisions and informs Glen post-facto. Owns IT/security, OKR tracking, headcount planning. PM role reporting to Aris confirmed as needed immediately [source: ch_offsite_working_doc_2026-04-27, not_Ua643ajeN9C1f7_okr].

**Robin Jubber (Creative Director/Game Director):** Restructured to individual contributor game director -- codify Vardis's vision, align art and animation, direct the game. No longer managing junior staff. Robin and Simon as peers [source: granola_936d0c2d, granola_bad498ba]. Self-assesses combat depth at 6-7/10. Rune system well-suited to pairing mechanics [source: granola_f181174b]. Operating model formally agreed 17 Jul 2026 (Decision #79): monthly department touchpoints, directional questions only, findings to Product Council; all hands-on design work transferred to Simon Woodruff. Transitioning from multi-hat role to pure Game Director mandate.

**Simon Woodruff (Head of Design):** Started 15 June 2026. Simon the Sorcerer creator (age 16), Sea of Thieves, Sonic, Epic R&D. Immediately aligned with Glen's vision-to-execution framework. Implemented spatial chat (proximity voice) four times previously. Simon's CTO referral (Chris Southall) is the lead search candidate. Two-in-a-box interim structure with Robin pending formal transition meeting (Glen to lead; Lorenza to brief Simon on staff beforehand) [source: not_a14oJDQNm4jRpN, not_li7bX7ksDDB9cP, not_RvwYJRgRr1iCq8].

**Graeme Monk (Executive Producer):** [spelling adjudicated by Glen 2026-07-04 — "Graham" in earlier compilations is the same person, wrong spelling] Hired ~20 years experience. Behavioural concerns: aggressive change-language in first weeks, suggested treating Aris/Vardis as "advisors." Glen documenting all 1:1s from day 3; shared with Lorenza. 30-day review with Vardis if behaviour continues. Parallel EP pipeline started as SOP risk mitigation. Graeme leading Confluence templating [source: granola_688a29e4, granola_09f36b66, not_ireYPwXIKrrsWd_scurve, not_3bUR2wWsPQvo8n_docs].

**Dino (General Counsel, departure date unconfirmed):** Knowledge transfer completed. Assessed studio as approximately 3 months from strong fundraising position [source: not_ireYPwXIKrrsWd_vdr]. GLEN ADJUDICATION 2026-07-03: Dino was General Counsel, NOT COO (Aris is COO; the 2026-06-18 "COO" relabel was wrong; do not resurface Dino as COO). GLEN ADJUDICATION 2026-07-04: "departed 30 June" was wrong; departure expected but date unconfirmed.

**Lorenza Menna (Head of HR):** Salary raised EUR 4,300/month + EUR 2,900 one-off. Flies to Greece July for leadership framework Day 1 session with Glen [source: granola_28f30e99].

**Lili (Head of Finance):** Started July 1 2026. First priority: cash flow and burn projections. Budget governance model (two-house) briefed on day one by Glen [source: granola_301693b4, 5d50bc6a].

**David Luong (Director of Art):** Formal coaching plan required for confidentiality breach. Ella's recurring underperformance flagged as leadership failure [source: granola_93bc0089, granola_28f30e99].

**Alan/Alon (Animation Lead):** On PIP; expected outcome termination. Toxic behaviour affecting ~6 people. David pipelining backfill [source: granola_28f30e99, granola_48ceec22].

**Fred Dossola (Art Producer):** Greenlit 5 June 2026. Sony cinematics/CIG background. "Orthodontist approach" -- 6-month incremental pipeline tweaks, never nuclear overhauls [source: granola_861b2342].

**Rania:** Incoming hire; joining triggers immediate activation of fundraise materials [source: not_Ua643ajeN9C1f7_publisher].

**Valeria Trofimova (Head of Production):** 1:1s moved to Thursdays. Manages master estimation spreadsheet; Glen builds Gantt charts from lead percentage breakdowns [source: not_J9HC1OjWMHxMkt, granola_4ea13f1e].

**Mustafa (Head of Tech):** Not CTO. Single launcher owner for the persistent build. UGS adoption in progress [source: granola_dc715a3c, not_3bUR2wWsPQvo8n_build].

**Hannah Pickard (QA Lead):** Hard authority to block gate progression. Sprint cannot close unless Hannah declares bug bar met. Sole QA resource -- SDET and junior/mid tester hires needed [source: granola_b82e3b84, granola_48ceec22, not_mK8Dh4Jc0Et6h4].

**Performance benchmarks (Hannah):** Tier 5 (target): 60fps, 3-sec zone load, zero rubber-banding. Tier 4 (acceptable): 40fps, 20-sec zone load, rubber-banding under 3. Prototype: 25-30fps, up to 1-min zone load.

**Gary Platner (Head of Level Design):** US-based, 23 years WoW. Onboarding week of 16 June 2026 [source: granola_54a02074].

**Sasha Krieger (Lead Character Art):** Strong personal opposition to AI for art. Working on the Forge system. [source: not_2BwqeNVXtJl16E].

**Maria Cibej (Narrative Designer):** Role conflict with Yorgos (quest design overlap). Head of Narrative hire needed [source: granola_73ec7e87].

---

## Their Game

**Genre/aesthetic:** Cosy byte-punk MMORPG [source: ch_offsite_pre_decisions_2026-04-27]
**Monetisation:** Free-to-install, paid subscription (expansions + in-game currency stipend), cosmetics marketplace. No stat gear [source: granola_301693b4]
**Platform:** Unified account, cross-play PC+mobile at launch [source: ch_offsite_pre_decisions_2026-04-27]
**Target engagement:** 5-15 hours/week; zone size 30-70 players [source: granola_6652283e]
**Design references:** WoW (systems/feel), Guild Wars 2 (hitbox combat), ESO (live service), FFXIV (community) [source: granola_bad498ba]

### Vision-to-Execution Framework

Glen and Simon's shared operating model: vision direction > pillars > player promises > value creation > table stakes. Table stakes (combat, crafting, zones, quests) are non-negotiable but undifferentiated. Vision documents per game section flow to systems, then to Confluence tasks [source: not_li7bX7ksDDB9cP].

**Three-tier structure:** (1) Pillars: define design intent; (2) Player Promises: translate to player-facing experience; (3) Systems and Content: deliver the promises. Published on Confluence home page.

**Pillar format (locked Jul 1 2026):** Each pillar: headline + subheading + story (player experiencing the pillar). Mandatory is/is-not clause, do/don't examples, meaningful-opposite test ("good level design" fails -- no meaningful opposite). Red-team by leadership mandatory before studio-wide rollout. Pillars must be locked before AMA; mandatory deadline set after three requests [source: 2026-07-01_ch-game-vision-pillar-framework].

**Current diagnosis:** Build reads as "generic" due to documentation failure, not design failure. Five conflicting pillar versions in circulation -- retirement to single locked version is immediate goal.

**Game design pillar craft session (8 Jul 2026):** Multi-session process begun; no final pillar selections made in this session. Method: 20+ candidate lines generated per pillar before selection; generation and selection are separate stages. Key insight: "choice of words is a choice of worlds" -- engineering teams interpret pillar wording literally and build systems against it (example: "every adventure should feel different" was misread as implying full procedural generation). Candidates that survived session testing: "Crafting the journey is its own reward" (strongest reaction; covered questing, builds, fishing, all player types); "Identity isn't chosen, it's practiced" and "Your habits are your hero" (player identity/reputation pillar candidates). Pillar splitting test: if one pillar contains two separable ideas each covering >10 min of distinct gameplay, consider splitting. Attendees: CPO, CEO/Creative Director, senior creative lead. Multiple sessions expected before final selection. [source: 2026-07-08_game-design-pillar-craft]

**Confirmed differentiators:** Combat: tab/skill-based with ground-based directional vectors. Crafting: collaborative construction (friend's presence boosts completion chance by ~20%).

### Game Design Direction

**Synergistic combat (non-negotiable, locked 24 Jun 2026):** Spell interaction system already designed in GDD (wet + lightning = critical hit). Social-combat framing routes through Robin and Simon, not directly to the combat lead. Producers delivering combat stages, blockers, timeline [source: granola_f181174b].

**Rune cosmology (settled 24 Jun 2026):** All runes exist from start; spell unlocks staggered by island/biome. Tutorial pair: lightning + healing. Further biomes add access [source: granola_f181174b].

**Art style lock:** Two visual registers: mythcore (pre-Fracturing -- grand, ruins, high civilisation) and gridcore (post-Fracturing -- improvised, repurposed). Each register needs its own asset kit. Formal lock process: Art Director + Game Director + studio lead sign-off per zone [source: 2026-06-26_ch-art-style-lock-milestone].

**A/B live balance testing (in development Jun 2026):** Server-side variable delivery without client patch. Compresses tune-observe-iterate from weeks to hours. Designers act without engineering dependency once built [source: 2026-06-30_ch-ab-testing-live-balance-no-patch].

### World Lore and Cosmology (locked Jun 29-30 2026)

**Origin:** Digit One (first human to digitalise himself) created the world engine (Darwin), The Ardents (Sara/creation, Nero/data integrity, Agni/defence, Merivia/information+transport), and Drisden (failed prototype antagonist). Digit One disappeared through Portal Peak. The Fracturing: Drisden exploited structural collapse; Digit One fractured the universe to stop him (~98% casualties). Mythcore = pre-Fracturing; gridcore = post-Fracturing.

**Magic system:** 64-symbol proto-language ("glyphs"). Combinations predetermined; unlock via progression.

**Factions:** Weavers, Wardens, Keepers, Seekers (Hogwarts cooperative model -- not competitive). Narrative roadmap: VS1 is systems-first; narrative in VS2+. [source: 2026-06-30_ch-mmo-world-lore-cosmology]

### MMO Positioning and Scale

Between Palia (smaller, casual) and vanilla WoW (too large). "Not a hostage game" -- settled design principle. Zone capacity: 200-300 players (median 200), sharding at 100+ concurrent combat cluster. 4-minute distraction density ceiling in any zone. Cross-game entitlement is secondary feature, not core product [source: granola_5148908e, granola_42497026].

**Two-axis player archetype framework (agreed CPO + Head of Design, 15 Jul 2026, Decision #71):** Current pillar language skews cozy/casual -- it attracts cosmetics-motivated players and casual raiders but underrepresents high-impact and social-competitive profiles. Two-axis framework: (1) solo preference vs group preference; (2) no-impact content (cosmetics, exploration, crafting) vs high-impact content (competitive, pvp, raid). Four quadrants: solo/no-impact (tourist/solo adventurer), solo/high-impact (competitive solo/ladder climber), group/no-impact (social crafter/guildie), group/high-impact (raider/pvp guild). CH's target: balanced coverage across all four quadrants, not dominance in one. Cautionary case: WoW as a single-quadrant game (group/high-impact) that initially succeeded but drove away three quadrants over time; late-stage broadening was expensive and never fully recovered casual-solo cohort. Pokemon model adopted as archetype balance benchmark: each generation deliberately attracts all four quadrants from the same content; design asks "which quadrant does this feature serve?" before shipping. Pillar alignment session with full leadership is required before final pillar selections are made -- current candidates must be tested against the four-quadrant model to confirm adequate coverage. Pillar language change recommended: retire any single-author onboarding documents that encode archetype bias ("pillar language skews cozy/casual" is a documentation problem as much as a design problem). [source: 2026-07-15_mmo-player-archetype-multi-axis-design-framework, 2026-07-15_pillar-language-archetype-bias-precision-testing]

### World Persistence Model

**Semantic state model and apophenia principle (agreed CPO + Head of Design, 15 Jul 2026, Decision #72):** CH's "living world where actions matter" pillar requires a persistence architecture where player actions produce lasting, observable world change. Two approaches compared: per-entity simulation (every entity tracks its own full state -- computationally expensive, produces emergent complexity but at prohibitive scale) vs semantic state model (regions and systems carry tagged state rather than per-entity simulation; player actions modify tags, systems respond to tag combinations). Agreed approach: semantic state model using the apophenia principle (Tynan Sylvester, RimWorld -- players naturally construct coherent narrative from emergent state changes without needing authored sequences; the system creates the appearance of a living world without scripted storytelling). Head of Design has implemented this model on a prior project: validated at 300,000 entities at <0.001ms per tick -- performance profile is acceptable for CH's zone capacity targets. Next steps: Head of Design to produce a technical brief defining the semantic tag taxonomy, region state change events, and the player-observable signal layer; brief to CPO before design document is written. [source: 2026-07-15_world-persistence-apophenia-semantic-state-model]

### Item Provenance and Identity (Jul 2026)

**Item history as core philosophy (CPO design session, 16 Jul 2026):** Items must accumulate history over their lifetime: who made them, who looted them first, what they have killed, how many times they have been used. Stats become the record of a life rather than a static attribute sheet [source: 2026-07-16_mmo-item-provenance-identity-history-system].

**Gear improvability over replaceability:** The alternative to seasonal gear replacement is essence absorption -- the player reforges a newly found item's abilities into an existing beloved item, preserving the valued item and absorbing its properties. Analogies: Game of Thrones Ice/Oathkeeper; a granddaughter inheriting and reforging her grandmother's axe. Items are not disposable; they are improved [source: 2026-07-16_mmo-item-provenance-identity-history-system].

**Signed vs unsigned crafting (player agency):** Crafting for the auction house produces unsigned/generic items. Crafting for a specific friend produces a signed item (Hattori Hanzo sword analogy). Famous-maker items can have world-state consequences: low-level enemies react differently to a weapon forged by a legendary blacksmith. This serves both market-motivated and relationship-motivated players simultaneously [source: 2026-07-16_mmo-item-provenance-identity-history-system].

**Multi-dimensional item value:** The system must support five simultaneous value dimensions: resource value, market value, aesthetic value, sentimental value, and legendary value. No single dimension dominates [source: 2026-07-16_mmo-item-provenance-identity-history-system].

### Systemic Design Principles (Jul 2026)

**Systemic emergence model (CPO design session, 16 Jul 2026):** Design verbs and rules consistently; outputs of one system feed the next. Sea of Thieves is the reference model. Only simulate what is noticeable and interesting -- not everything needs simulation, only what players will perceive and engage with [source: 2026-07-16_mmo-systemic-emergence-toxicity-culture-engineering].

**Viral moment architecture:** Kill-tag is assigned to the last hit (not most damage dealt) -- this enables unexpected weapons to claim kills and creates shareable, unexpected spectacle. Body-fly distance on death is 300 yards, designed specifically for shareable moments. Leroy Jenkins and the Corrupted Blood Plague are cited as model emergent iconic events: unscripted, emergent, memorable, and community-forming [source: 2026-07-16_mmo-systemic-emergence-toxicity-culture-engineering].

**Toxicity R-value modelling:** Toxic behaviour spreads like a virus: 5% toxic population infects 8%, cascades. R-value modelling was conducted at Blizzard with UCLA researchers and refined at Xbox. Key findings: culture is set by early audience and by what gets highlighted; Broken Windows theory applies to game communities; the Sea of Thieves Pirate Code megaphone announcement dramatically reduced toxic events; shadow-muting is an effective tool; infamy systems backfire because approximately 8% of players will race to the top of any negative scale; forcing removal of player autonomy (Fortnite forced-concert model) spiked toxicity. CPO drawing on direct Blizzard/UCLA and Xbox experience [source: 2026-07-16_mmo-systemic-emergence-toxicity-culture-engineering].

### Combat System

**Pressure system (crack stacks):** 1-7 cracks; detonation creates stuns (Level 2: flinch, Level 5: stagger, Level 7: knockdown). Heavy attacks break blocks. Co-op: one player builds, another detonates [source: granola_7724d8e4].

**Weapons as soft class layer:** Maces (stun), axes (bleed), swords (crit), daggers (high DPS). Mastery unlocks over time. Level cap: 60 [source: granola_fd4d524b, granola_42497026].

**Player archetypes:** 30-35% non-combat-primary; crafting/social classes require equivalent depth [source: granola_fd4d524b].

**Enemy AI:** Tag-based, 5 D&D attributes with 3 tiers = 15+ archetypes. Modifiers add identity [source: granola_7724d8e4].

**Armour:** Class-agnostic AC scale 1-30. Wearing heavy without skill investment = movement debuffs. Side-grades, not stat gates [source: not_li7bX7ksDDB9cP].

**PVP:** Zone cloning; no mixed PVE/PVP. Cosmetic-only rewards. Loot: double RNG, per-player masking, responsive weighting after 500+ kills without target item [source: granola_42497026, granola_fd4d524b].

### Level and World Design

**Shortal Peak principles (Jul 1 2026):** White-box boss room and summit library first (anchor spaces dictate proportions). Linear onboarding = intentional VS design. Corruption = beauty-vs-defilement, restrained. Player objective in VS: reconnaissance + partial cleanup + escape. Tower needs to be twice as wide. Summit library = primary Digit One narrative anchor [source: 2026-06-30_ch-shortal-peak-layout-review].

### New Player Experience (NPE)

**NPE single-player instancing and balloon world reveal (locked 7 Jul 2026):** The first 30-60 minutes of the game are single-player only, locked with four-stakeholder sign-off (Glen, Vardis, David, Robin). Tutorial Cave: fully isolated single-player instance; no other players visible; emotional intent is isolation and mystery; solves the MMO launch population problem ("200 players killing the same boar"). Portal Peak: cave exit to a hilltop, also single-player phased; cloud cover provides the natural instance boundary; players never revisit (one-time experience). World entry mechanic: after Portal Peak, players balloon down into the open multiplayer valley. Two balloon rides: first introduces the mechanic; second is a completion reward on Portal Peak that flies players over Downtime city before landing (the locked world reveal, incorporating Gary's flyover concept). Drifters Cross faction owns the balloon mechanic with in-world narrative logic. Robin to communicate to Gary; Gary to proceed on this basis. [source: 2026-07-07_ch-npe-single-player-instancing]

**Concept-first gate for new art work (Jul 2026):** Mandatory concept pass required before any new character or environment art work begins. Root cause of prior bypass: artists going directly to AI generation or direct-to-3D builds, cutting the concept team out upstream. Concept team right-sized from 5 to 2 (keeping highest-output, most versatile, AI-friendly artists); one additional artist reclassified to creative/marketing (brand assets, pitch decks). Gate is for new work forward only -- assets already approved by the relevant lead are not sent back for retrospective concept sign-off (see concept as support function in Production Approach). A smaller concept team with a clear gating mandate outperforms a larger team without one. [source: 2026-07-07_ch-concept-first-gate-new-work]

---

### Brand and Marketing

**Brand identity priority sequence (agreed 8 Jul 2026 with Larisa):** Current state: no consistent brand across website, presentations, logo, and game art; logo has retro/arcade aesthetic that does not match game art; brand colour (purple) chosen for personal rather than strategic reasons; LinkedIn used for recruiting only; Discord paused with no content cadence. Agreed priority sequence: (1) brand identity -- colour, tone, visual language; (2) brand persona -- voice, dark humour, quippish tone; (3) brand bible -- locks identity and persona for all teams including incoming UI designer; (4) web presence -- website rebuild and LinkedIn strategy after bible; (5) player segmentation -- full market segment study (internal exploratory work exists but is not complete); (6) community management plan -- build now, execute when gameplay content and campaign cadence are in place. Key decisions: Larisa reports to CPO for brand direction, continues reporting to Art Director for other work. Concept artists at ~35% capacity available for brand briefs. Reference quality benchmark: old Blizzard website as the visual identity standard. Next step: brand and platform walkthrough Tuesday 14 Jul 2026, 2-3pm (Larisa to prepare historical brand materials, community plan, pitch decks, and platform walkthrough). [source: 2026-07-08_ch-brand-identity-buildout]

---

### RMT Store and Weapon Forging

RMT store ~90% complete as of 16 June 2026. Weapon forging: 4-component weapons (pommel, hilt, tang, blade). Permanent creator attribution. Single texture with roughness adjustment for material variety -- enables cosmetic monetisation without texture overhead [source: not_3bUR2wWsPQvo8n_build, granola_a2aa92f3, not_2BwqeNVXtJl16E].

---

## Production Approach

**POG (Proof of Game):** Five objectives: (1) prove studio can build the game; (2) create investment material; (3) force legitimate estimation; (4) establish velocity awareness; (5) define headcount gaps. Quality tiers: Prototype > MVP > Polish > Ship. VS must satisfy both internal pipeline validation and investor material simultaneously [source: granola_03a27e7d, not_3bUR2wWsPQvo8n_scope].

**VS estimation commit (Jul 1 2026):** T4 proxy-kit quality floor. ±10% buffer. Production-problem caveats absorbed by EP and Glen, not team leads. Post-lock changes require formal Change Request approved by Glen [source: 2026-07-01_vs-estimation-commit-protocol].

**Scope governance:** Full estimate must precede any scope cuts. Sequence: (1) calculate total hours; (2) evaluate outsource/headcount; (3) only then consider cuts. Ad hoc cut ideas in writing to Glen or Robin only [source: not_3bUR2wWsPQvo8n_scope].

**Actual state:** Early production, not mid-production. Art ahead; core systems lag [source: granola_50612dd7, granola_09f36b66].

**Art asset management:** No centralised CMS for WIP assets. Biweekly output view: team leads compile what was built, by whom, renders folder link. Approved assets organised by team lead. High output buys tolerance for rough edges; low output does not [source: not_9qoMQqGw4HJ8jk_asset_tracking].

**VS critical path:** Combat design at 13 months (Nadir). Resolution required before VS is investor-presentable: scope reduction or additional Nadir resource. Environment art red flag: 4,622 days for three zones (~385/zone); outsourced bid commissioned before confronting Michael directly [source: not_ireYPwXIKrrsWd_vdr, not_J9HC1OjWMHxMkt].

**Build cadence:** Wednesday is weekly merge day. Engineers fix collisions in own branch before merging. All builds route through Mustafa as single launcher owner [source: not_3bUR2wWsPQvo8n_build, granola_936d0c2d].

**Documentation SOT:** ClickUp is confirmed interim SOT. Tooling migration timeline: July (10 Confluence seats, ClickUp live); August (Confluence company-wide, Jira integration begins, ClickUp wind-down); September (Jira company-wide). Selective ClickUp-to-Jira import. Johanna (incoming producer) to own migration [source: not_3bUR2wWsPQvo8n_docs, 2026-07-01_ch-confluence-jira-clickup-migration].

**QA integration and Definition of Done (Jul 2026):** Formal DoD process formalised with QA as a discrete block integrated right of the dev/creative cycle. DoD flow: backlog → sprint → tasks → WIP → review → done. Review uses a RACI chart; failure adds tasks, pass-with-comments creates carry-forward stories. Three-head review runs concurrently at a single stage (Creative Director + Product + Direct Lead) with a hard time limit to prevent indefinite gate-hold. Jira DoD stage field added to all feature and story tickets for production visibility. QA block triggers once story reaches "done" in dev/creative cycle: smoke and automated tests, minimum bar "if it won't run, it ain't done," pass pushes to merge, fail reopens as overflow. Bug triage: P0 (build breaker) top of backlog; P1 reviewed against next sprint priorities. Overflow calibration: 15% overflow is a healthy process signal; 40%+ triggers a process or resourcing audit. Sprint cannot close without QA declaring bug bar met. Per-feature buffer columns; build machine constraint must be resolved [source: not_mK8Dh4Jc0Et6h4, 2026-07-10_dod-qa-integration-overflow-targets].

**DoD decision authority hierarchy (15 Jul 2026, Decision #70):** Game Director owns the Definition of Done for all features and stories. Creative Director has no vote on DoD -- if a Creative Director challenges a DoD entry, that is a creative direction concern to be raised separately, not a mechanism to block DoD sign-off. CEO override of a DoD is legitimate authority but must be explicitly framed as "I am exercising CEO authority to override this" -- without explicit framing, it is ambiguous whether a CEO comment is direction or opinion, causing process failures downstream. Engineering DoD was confirmed as missing from current milestone architecture: no agreed minimum technical bar exists for engineering to call a feature done (distinct from QA pass/fail). Engineering DoD criteria must be defined and added to the sprint cycle. [source: 2026-07-15_dod-decision-authority-hierarchy-game-director]

**VS1 scope lock (16 Jul 2026):** Formal triage session with CPO, EP/Game Director, Head of Design, and Vardis (CEO) present. Items categorised as non-negotiable or possible to cut.

Non-negotiable: communication system, inventory, item core, consumables, partner loop, online services backend, skill system (3 paths, approximately 5 skills per path, limited GUI), loot auto-distribution to party (identified as a gap required for the demo loop -- added to scope in this session), art Bible (blocking brand Bible work) [source: 2026-07-16_vs1-scope-lock-feature-enemy-magic-decisions].

Enemies: 4-enemy target (3.5 minimum). Wolves and goblins up the mountain; corrupted guardian at the summit (scripted collapse, not a true fight); Carapax or skeleton in the dungeon (either works; skeleton as backup). Each enemy must have unique combat behaviour. Slime parked [source: 2026-07-16_vs1-scope-lock-feature-enemy-magic-decisions].

Combat abilities: 4 fixed; if all complete with VFX/audio/collision, 2 additional acceptable. PVP too glitchy for VS1. Ranged combat (bows/guns) pushed to VS4 [source: 2026-07-16_vs1-scope-lock-feature-enemy-magic-decisions].

Magic for VS1: consumable scrolls only. Scripted encounter: wizard hands player a scroll, player fires fireball, destroys corrupted guardian, blows hole in the tower. Existing VFX prototype, cast animation, and audio library confirmed available. VS2 target: 5 fully animated spells (lightning, fireball, earthquake, rain of fire, digital wall) [source: 2026-07-16_vs1-scope-lock-feature-enemy-magic-decisions].

Possible to cut / deferred: character creation (slides give impression of choice); mounts/pets deferred; faction reputation, FTUE, and accessibility flagged as possible to cut; professions scoped to fishing and forge only for VS1; Head of Design to produce full profession list design for VS2/VS3 planning [source: 2026-07-16_vs1-scope-lock-feature-enemy-magic-decisions].

**AI policy by discipline:** Code -- AI for cleanup/review only. Design -- research, ideation, red-teaming only. Art -- concepting, colour options, prop ideas acceptable [source: granola_dc715a3c].

**AI 3D asset pipeline (Jul 2026):** 90% AI + human refinement pass adopted as the studio's operating model. Every asset still requires a human pass (ideation, colour direction, prompt ownership, final polish). Tripo demonstrated live: Unreal Engine-ready 3D model delivered approximately 70 minutes after a concept meeting. PBR textures achievable in ~3 hours vs days by hand. Peer advocacy without personal adoption is a known compliance risk -- an environment artist who championed AI adoption for others resisted it for their own work; requires direct direction and supervision. AI specialist hire: code AI and art AI are distinct skill sets requiring separate hires (code: pipeline automation, engine-level workflows; art: prompt ownership, style consistency, AI output QA) [source: 2026-07-10_ai-3d-asset-pipeline-tripo-human-pass].

**GDD-first engineering gate (Jul 6 2026):** Non-negotiable: no feature or system built without a design document. Engineering instruction: if no GDD entry, kick back the request immediately. Escalation: if engineering is pushed to build without a GDD, escalate to CPO (not resolve internally). Pipeline sequence is fixed: Creative Director vision → Game Director direction → GDD → TDD → build. R&D Confluence section: all plugin and technology evaluations documented with findings, pros/cons, decision, and action points (prevents repeated evaluation of the same tool -- documented case: one plugin evaluated 4-5 times with no recorded decision). Glen to address the development team directly by EOD 7 July 2026; announcement is not delegated to leads. [source: 2026-07-06_ch-gdd-first-engineering-gate]

**Forced art direction lock (Jul 2026):** Art direction lock session convened after chronic drift across multiple milestone cycles. The forced process: all decision-makers convene in one session; options presented side by side; binary decision made in the room; documented lock issued with Glen as sole named unlock authority. All future art direction proposals must be submitted as formal alternatives for a new decision -- the room is not reopened for debate. Skunkworks icon parallel track agreed with Graeme (EP) and Art Director: one near-complete building in isolation as a pitch asset, without blocking the Tier-1 pipeline. [source: 2026-07-02_art-style-lock-forcing-mechanism, 2026-07-02_vertical-slice-proxy-vs-finished-ratio]

**Tutorial Cave zone design (Jul 6 2026):** Single-player experience confirmed from start area through to portal entry; multiplayer begins after. Tutorial design: telemetry-triggered prompts (e.g. player pauses at a gap, then receives a prompt) replace rigid click-through tutorial; experienced players must not be blocked. Investor-facing VS walked through live by Creative Director -- organic discoverability is a player experience concern, not a stakeholder demo concern. Art must-haves locked before handoff. Robin to confirm scope of single-player zone (proposal: all the way to Portal Peak). Handoff prerequisites: Miro sign-off frame; all docs consolidated into one folder; Confluence page per zone. [source: 2026-07-06_ch-tutorial-ftu-adaptive-design]

**Concept art as support function (Jul 6 2026):** Glen decided: concept art is a support function, not a pipeline gatekeeper. Assets already approved by the relevant lead or director are not sent back to concept for sign-off regardless of concept team involvement. Concept redirected to new briefs in parallel. Root cause: concept team felt cut out of process -- the friction is structural, not a creative conflict. AI art policy gap: no formal policy exists; AI reference material in use. Glen to initiate AI art policy conversation with Art Director. [source: 2026-07-06_ch-concept-art-support-not-gate]

**OKR framework:** 1 week late = green; 4 months late = red. Two-layer: internal buffer vs external flag when buffer consumed. LRP covers three domains: revenue, production quality, investor confidence [source: not_Ua643ajeN9C1f7_okr].

**Technical architecture decisions (locked Jul 1 2026):**
- Instancing confirmed for VS1; seamless parked until mid-production (~4x easier to build; seamless carries multiplicative compute cost) [source: 2026-07-01_mmo-instancing-vs-seamless-decision]
- Baked lights locked for VS1 (~50% performance improvement, within RTX 3090/4090 targets); dynamic lighting re-enabled at VS3/VS4
- Persistence IS/IS-NOT defined: phasing ruled out (architecturally incompatible with co-op). "Players define their own endgame" agreed framing [source: 2026-07-01_mmo-persistence-is-not-definition]

**MMO backend patterns (validated Jun 2026):** Hybrid server topology; UDP for high-frequency gameplay, TCP/WebSocket for transactions/social; three-tier persistence (sharding, spanning, persistent shard); SQL for economy, NoSQL for flexible data; strongly server-authoritative; C++ for performance-critical movement, Go/.NET for backend services [source: granola_3cadc973].

**Contractor compliance (multi-jurisdiction, Jun 2026):** Dead contracts closed immediately without prejudice. Rate-uplift model: uplift baked into day rate as self-funded vacation buffer. Handbook version-pinned at signing. UK Skilled Worker Visa 2026 minimum: GBP 41,700/year [source: 2026-06-30_contractor-dead-contracts-vacation-rate-uplift].

### Budget Governance (established July 1 2026, briefed to Lili on day one)

**Two-house model:** Game dev budget and studio ops budget deliberately separated. Intentional friction is a discipline mechanism for a founder-CEO learning to run a business alongside making a game -- not a problem to eliminate [source: 5d50bc6a, 022a922c].

**Macro budget codes (5):** Operations, Art/Game, Marketing/Brand/PR, Game Development, CTO.

**L&D split:** Studio-wide L&D under HR budget (centrally owned). Departmental training: separate line item per Head of Department with direct spend authority up to a threshold tied to performance process. Leaders authorise training within threshold without escalating.

**Petty cash:** Director level only. Must be recorded. AI tools excluded -- any AI spend involving IP routes through IT and legal regardless of spend size. Licensed or revenue-share purchases through IT procurement. Cautionary example: director petty-cashed three machines at full retail (~$15K) vs ~$5K via IT procurement.

**Hardware refresh cycle:** 18 months; critical roles first, based on runway. Under-18-month refresh requires director approval [source: 5d50bc6a].

**CPO scope definition (July 1 2026):** CPO owns HR, Finance, IT, Legal, Project Management. Producers focus exclusively on the game. CPO does not own game content, milestones, or scope decisions. Studio board view: top deliveries, headcount adds, health metrics.

**Marketing:** Kept deliberately lean -- two people through development; PR engaged pre-launch; community starting ~6 months before launch.

**BD model:** Portal strategy (hire people to chase games into infrastructure), not outbound sales. More viable for a single-game studio [source: 022a922c].

**Art team flag:** 30/55 staff ratio flagged as structurally too high. Fix model: replace underperformers with veterans, cost-neutral through lower junior headcount -- maintains output quality without net headcount reduction [source: 022a922c].

---

## Performance and Studio Health

**Underperformance rate:** ~13 of 55 staff (25%). Unsustainable at this studio size [source: granola_28f30e99].

**Effective output gap:** Studio getting approximately 30/55 staff equivalent in actual output. This is a structural problem, not individual performance. Expectation: visibility alone pushes effective output to 40-45 equivalent; remaining gap addressed through targeted performance process [source: a8cca6f4].

**Studio health trajectory (15 June 2026):** Art department from 3/10 to 7.5-8. Broader studio from 2.5-3 to 6. Communication "much improved" [source: not_2BwqeNVXtJl16E].

**Performance composite dashboard (approved Jul 2 2026):**
Three signals: (1) Slack activity (presence, thread engagement, response times); (2) Jira task delivery per sprint (completed vs committed); (3) Perforce check-ins (commit frequency, volume). Composite index gives more reliable picture than any single signal (Slack alone is misleading for engineers in deep work or back-to-back meetings).

Not shared company-wide -- avoids us-vs-them dynamic and metric gaming. Flags trigger a lead or manager 1:1 follow-up, not automatic action or HR process. Built in-house; Jira integration requires project admin coordination; Perforce check-ins already trackable; Slack via existing workspace tooling [source: a8cca6f4].

**Leadership framework:** Root cause of most performance issues is absent director/lead expectations for coaching and feedback. Lorenza and Glen building skeleton framework in Greece (July); Graeme and Glen fleshing out in London immediately after [source: granola_28f30e99].

**Quad assessment:** Identifies weak links, loose cannons, steady performers, champions. Due 19 June before FTE conversions [source: granola_28f30e99].

---

## CTO Search

CTO remains the most critical leadership gap. Chris Southall (Simon Woodruff referral) is lead candidate; Vardis interviews first.

| Candidate | Background | Status |
|---|---|---|
| Chris Southall | Simon Woodruff referral | Lead candidate; Vardis interviews first [source: not_3bUR2wWsPQvo8n_hiring] |
| Senior technical candidate | (anonymised) | Interviewed 2026-06-24 [source: granola_5148908e, granola_3cadc973] |
| Otto | Remedy, Guerrilla Games, 20+ years | Shortlist [source: granola_4005eb22] |
| Xbox layoff pool (July 2026) | Senior multiplayer engineers, AAA pedigree | Fallback pipeline; Jim Horth (data/analytics) specifically identified [source: 2026-07-01_xbox-layoffs-talent-pool-july-2026] |
| Pair | Battlefield/Frostbite engineer at DICE | Prior shortlist; current standing unclear [source: granola_93bc0089] |
| Torbjorn | Frostbite background | Prior shortlist; current standing unclear [source: granola_54a02074] |
| Truu | -- | Passed (prior studio launch issues) [source: not_3bUR2wWsPQvo8n_hiring] |
| Maurizio de Pascale | IO Interactive/Ubisoft | Concerns re CH blueprint over-reliance [source: granola_0dcf8a54] |

---

## Hiring Wave (June 2026)

~17 hires completed, ~18 more planned.

| Candidate | Role | Status |
|---|---|---|
| Simon Woodruff | Head of Design | Onboarding [source: granola_bad498ba] |
| Graeme Monk | Executive Producer | Onboarded; documentation in progress [source: granola_688a29e4] |
| Gary Platner | Head of Level Design | Onboarding week of 16 June 2026 |
| Hrops | Lead Gameplay Developer | Signed [source: not_3bUR2wWsPQvo8n_hiring] |
| Daniel Casadevall | Lead Full Stack | Started July 1; signing as PSC through wife's company [source: not_3bUR2wWsPQvo8n_hiring] |
| Fred (VFX Lead) | VFX Lead | Offer meeting Friday 20 June; contract edits under review |
| Fred Dossola | Art Producer | Offer accepted; Lorenza drafting contract [source: granola_861b2342] |
| Sean | Tech Producer | Top candidate; ready for offer [source: not_4nWBkRC4r7TVRQ_hiring] |
| Andre | Tech Producer | Interviewed 17 June |
| Ivan | Senior UI/UX Artist | Art test sent; strong [source: not_3bUR2wWsPQvo8n_hiring] |
| Michael/Michel | Senior Network Engineer | Started late May; Rainbow Six Siege background [source: granola_e5678c68] |
| Lili | Head of Finance | Started July 1 [source: granola_301693b4] |
| HR People Ops Specialist | HR Ops | Started July 6 2026 [source: granola_d0c199fc] |
| Pete | Senior Environment Artist | US contractor headcount limit blocks; exploring relocation |
| Narrative Lead | Narrative | JD being written by Glen [source: granola_73ec7e87] |
| Tech Animation Lead | Animation | Open; David pipelining backfill for Alon |
| Systems Designer | Design | Blocked until pillars locked; priority after UI/UX and narrative designer [source: 2026-06-30_systems-designer-role-definition-mmo] |
| Senior SDET | QA | Engine/platform test automation, MMO root-cause debugging [source: not_mK8Dh4Jc0Et6h4] |
| Junior/Mid Tester | QA | MMO experience preferred |

---

## Fundraising and VDR

**VDR preparation (18 June 2026):** Active. Sections: corporate governance, financials, IP, HR, personnel, legal. Three investor-facing documents: (1) Financial plan and forecast; (2) Pitch deck; (3) Due diligence deck.

**Critical VS blocker:** Combat at 13 months (Nadir critical path). Scope reduction or additional Nadir resource required before VS is investor-presentable.

**Investor credibility signals:** Gary Platner (23-year MMO/WoW veteran), Simon Woodruff (Sonic/Simon the Sorcerer credits), combined with CTO hire = primary investor narrative anchors.

**Fundraise horizon:** Dino's assessment: approximately 3 months from strong fundraising position as of June 18 [source: not_ireYPwXIKrrsWd_vdr].

**Live service secondary market model (Jul 2026, in principle):** Strategic planning session 16 Jul 2026 (COO and CPO). Agreed in-principle direction: players can trade earned items for virtual currency redeemable across the developer's game ecosystem. Modelled on the CS:GO skin economy. Explicitly NOT NFT or crypto -- no blockchain, no speculation narrative. CS:GO framing (skill-based, legacy items, community value) is the positioning; Web3 framing is actively avoided [source: 2026-07-16_live-service-earned-items-secondary-market-non-nft-model].

Two-currency architecture: in-game currency (earned through play, no real-world value) plus virtual currency (purchased with real money, used for MTX and secondary market trades). Revenue streams: transaction fee (banker's fee) on all item trades; revenue share back to partner games whose items are traded. COO observation: revenue share to partner games turns the secondary market into a BD tool and the strongest incentive for ecosystem partnerships [source: 2026-07-16_live-service-earned-items-secondary-market-non-nft-model].

Critical guardrail: must never be perceived as NFT or crypto. Design and comms must pre-empt this framing before it takes hold externally [source: 2026-07-16_live-service-earned-items-secondary-market-non-nft-model].

Dependencies: live service structure and item economy must align with game pillars before finalising. Pillar-first, then economy [source: 2026-07-16_live-service-earned-items-secondary-market-non-nft-model].

Gamescom (late August) as the pitch-ready deadline. Pre-deck prerequisites: financials pinned (Lili to consolidate including headcount backlog), raise amount and valuation agreed internally, spend plan defined, investor target list built, brand identity stabilised [source: 2026-07-16_live-service-earned-items-secondary-market-non-nft-model].

---

## Current Engagement

**NBI role:** Fractional CPO covering production, hiring, org design, coaching, game direction, GTM [source: chatgpt_68821eb7]
**Revenue:** GBP 30k/month to NBI [source: granola_53aa4eef]
**POG deadline:** End of August 2026 [source: granola_c3205cb8]
**Series B fundraising:** $10M target; Rania's start triggers fundraise materials activation [source: granola_301693b4]
**DICE Athens:** Glen attending July and September [source: granola_9e2c57bb]
**Greece working session July:** Day 1 Glen + Lorenza (leadership framework); Day 2 Glen + Lorenza + Aris (legal/ops)

---

## Decisions Made

1. F2P with cosmetic monetisation -- no stat gear [source: ch_offsite_pre_decisions_2026-04-27]
2. Self-publish core distribution; targeted capability partnerships
3. Closed beta at POG; Founder's Pack carries beta access
4. Unified account, cross-play PC+mobile at launch
5. POG (Proof of Game) = vertical slice framing; 5 formal objectives [source: granola_03a27e7d]
6. POG deadline end of August 2026 [source: granola_c3205cb8]
7. QA has hard authority to block gate progression [source: granola_b82e3b84]
8. All UK hires moving to FTE contracts [source: granola_301693b4]
9. Alon (Animation Lead) to be terminated; backfill first [source: granola_4005eb22]
10. Weapons are tools, not classes; soft class system via weapon mastery [source: granola_fd4d524b]
11. PVP through zone cloning; no mixed PVE/PVP spaces [source: granola_42497026]
12. Double RNG loot with per-player masking -- prevents datamining [source: granola_fd4d524b]
13. 4-minute distraction density ceiling in any zone [source: granola_42497026]
14. Wednesday = formalised weekly merge day [source: granola_936d0c2d]
15. AI policy by discipline: code cleanup only; design research/ideation; art concepting accepted [source: granola_dc715a3c]
16. WorkSage Hub = primary store for sensitive CH legal/HR/finance docs [source: granola_75160e95]
17. Leadership framework to be built July (Greece + London) [source: granola_28f30e99]
18. Design references locked: WoW, GW2, ESO, FFXIV [source: granola_bad498ba]
19. Robin = individual contributor game director; Simon manages design team [source: granola_936d0c2d]
20. Game-first, platform-second -- confirmed studio-wide mandate [source: granola_bad498ba]
21. Parallel EP pipeline started as SOP risk mitigation [source: granola_688a29e4]
22. Outsourced environment art bid commissioned before confronting Michael on 4,622-day estimate
23. Vertical slice scope cut from ~1/3 of full game to 4-6 month deliverable [source: not_J9HC1OjWMHxMkt]
24. Glen present in all team estimation review calls [source: not_J9HC1OjWMHxMkt]
25. Sprint cannot close without QA sign-off [source: not_mK8Dh4Jc0Et6h4]
26. Per-feature QA buffer columns in estimates -- hidden buffers not acceptable [source: not_mK8Dh4Jc0Et6h4]
27. Class-agnostic armour with skill-gated mobility debuffs [source: not_li7bX7ksDDB9cP]
28. Vision-to-execution framework (vision > pillars > player promises > table stakes) is shared operating model [source: not_li7bX7ksDDB9cP]
29. MMO macro tempo = shark-tooth rhythm; early Fireball scroll preferred over level-gated ability unlock [source: not_li7bX7ksDDB9cP]
30. No publisher engaged or planned [source: not_Ua643ajeN9C1f7_publisher]
31. Investor profile targets dividend-yield seekers, not gaming VC flippers [source: not_Ua643ajeN9C1f7_publisher]
32. OKR thresholds: 1 week late = green; 4 months late = red. Two-layer model [source: not_Ua643ajeN9C1f7_okr]
33. PM role under Aris needed immediately [source: not_Ua643ajeN9C1f7_okr]
34. Zero-deliverables first month for Simon Woodruff [source: not_a14oJDQNm4jRpN]
35. Pillar/promise/systems framework to be published studio-wide on Confluence home page [source: not_RvwYJRgRr1iCq8]
36. VDR preparation underway; three investor-facing documents in preparation [source: not_ireYPwXIKrrsWd_vdr]
37. Combat at 13 months (Nadir critical path) requires resolution before VS investor-presentable [source: not_ireYPwXIKrrsWd_vdr]
38. Synergistic combat non-negotiable; social-combat framing through Robin/Simon [source: granola_f181174b]
39. Rune cosmology settled: all runes from start; staggered by island/biome [source: granola_f181174b]
40. CH MMO positioned between Palia and vanilla WoW; "not a hostage game" settled [source: granola_5148908e]
41. Tencent = sole data controller; do not design monetisation dependent on demographic targeting CH cannot control [source: 2026-06-22_tencent-data-sovereignty-publishing-terms]
42. Mythcore and gridcore = two locked visual registers; each needs own asset kit [source: 2026-06-26_ch-art-style-lock-milestone]
43. A/B live balance testing without client patch: system in development [source: 2026-06-30_ch-ab-testing-live-balance-no-patch]
44. World lore and cosmology locked Jun 29-30 2026 [source: 2026-06-30_ch-mmo-world-lore-cosmology]
45. Dead contracts closed immediately; rate-uplift model; handbook version-pinned at signing [source: 2026-06-30_contractor-dead-contracts-vacation-rate-uplift]
46. Systems designer hire blocked until pillars locked; UI/UX then narrative designer first [source: 2026-06-30_systems-designer-role-definition-mmo]
47. Vision pillar format locked: headline + subheading + story; mandatory meaningful-opposite test; red-team before rollout [source: 2026-07-01_ch-game-vision-pillar-framework]
48. Shortal Peak principles: white-box boss room and summit library first; linear onboarding intentional; restrained corruption; tower twice as wide [source: 2026-06-30_ch-shortal-peak-layout-review]
49. Tooling migration timeline: July/August/September phases; Johanna owns migration [source: 2026-07-01_ch-confluence-jira-clickup-migration]
50. Instancing confirmed for VS1; seamless parked until mid-production [source: 2026-07-01_mmo-instancing-vs-seamless-decision]
51. Baked lights locked for VS1; dynamic lighting at VS3/VS4 [source: 2026-07-01_mmo-instancing-vs-seamless-decision]
52. Persistence IS/IS-NOT formally defined; phasing ruled out; "players define their own endgame" agreed [source: 2026-07-01_mmo-persistence-is-not-definition]
53. VS estimation formally committed July 1 2026: T4 floor, ±10% buffer, formal CR gate post-lock [source: 2026-07-01_vs-estimation-commit-protocol]
54. Budget governance established (two-house model): 5 macro codes; petty cash at director level only; AI tools through IT/legal regardless of spend size; hardware refresh 18-month cycle [source: 5d50bc6a]
55. CPO scope formally defined: HR, Finance, IT, Legal, PM. Producers own the game; CPO owns everything else [source: 022a922c]
56. Marketing lean through development (2 people); PR pre-launch; community ~6 months before launch [source: 022a922c]
57. BD = portal strategy (inbound via infrastructure), not outbound sales [source: 022a922c]
58. Art team at 30/55 structurally too high; fix via veteran replacements (cost-neutral through lower junior headcount) [source: 022a922c]
59. Performance composite dashboard approved (Slack+Jira+Perforce); leads only, not company-wide; flags trigger 1:1, not HR process [source: a8cca6f4]
60. Forced art direction lock session convened July 2026; Glen is sole named unlock authority; all future proposals submitted as formal alternatives -- the room is not reopened for debate [source: 2026-07-02_art-style-lock-forcing-mechanism]
61. VS proxy (Tier 1 state with base colour) confirmed as correct VS1 quality target; skunkworks icon parallel track agreed with Graeme (EP) and Art Director [source: 2026-07-02_vertical-slice-proxy-vs-finished-ratio]
62. Tutorial Cave: single-player zone confirmed from start area through to portal entry; multiplayer begins after; telemetry-triggered prompts replace rigid click-through tutorial [source: 2026-07-06_ch-tutorial-ftu-adaptive-design]
63. Investor-facing VS demo walked through live by Creative Director; organic discoverability is a player-facing concern, not a stakeholder demo concern [source: 2026-07-06_ch-tutorial-ftu-adaptive-design]
64. Concept art repositioned as support function; assets approved by relevant lead or director are not sent back to concept regardless of concept team involvement [source: 2026-07-06_ch-concept-art-support-not-gate]
65. GDD-first pipeline non-negotiable: engineering kicks back requests without GDD; escalation to CPO if engineering is pushed; R&D Confluence section required for all plugin evaluations [source: 2026-07-06_ch-gdd-first-engineering-gate]
66. Glen to address dev team directly on GDD requirement by EOD 7 July 2026; announcement not delegated to leads [source: 2026-07-06_ch-gdd-first-engineering-gate]
67. NPE locked: Tutorial Cave + Portal Peak are single-player only; two balloon rides; Drifters Cross owns balloon mechanic; Downtime city flyover as world reveal on Portal Peak completion [source: 2026-07-07_ch-npe-single-player-instancing]
68. Concept-first gate for new art work: mandatory concept pass before any new character or environment art begins; concept team right-sized from 5 to 2; gate applies to new work only, not approved assets already in build [source: 2026-07-07_ch-concept-first-gate-new-work]
69. Brand identity priority sequence agreed: identity → persona → brand bible → web presence → player segmentation → community plan (execution deferred until gameplay content exists); Larisa reports to CPO for brand direction; concept artists at ~35% capacity available for brand briefs [source: 2026-07-08_ch-brand-identity-buildout]
70. Pillar craft method adopted: 20+ candidate lines per pillar before selection; generation and selection are separate stages; "choice of words is a choice of worlds"; multiple pillar-crafting sessions expected; no final selections in session of 8 Jul 2026 [source: 2026-07-08_game-design-pillar-craft]
71. AI 3D asset pipeline adopted as standard operating model: 90% AI + human refinement pass; Tripo validated live (~70 min to Unreal-ready model); AI specialist role requires two separate hires (code AI and art AI distinct skill sets) [source: 2026-07-10_ai-3d-asset-pipeline-tripo-human-pass]
72. Formal Definition of Done adopted with QA as discrete process block: three-head concurrent review (hard time limit), 15% overflow = healthy, 40%+ = audit trigger; Jira DoD stage field required on all feature and story tickets [source: 2026-07-10_dod-qa-integration-overflow-targets]
73. Post-VS leads trip to Greece, late September 2026: three-session structure (AI studio layout, financial reality with intentional partial ambiguity, growth rhythm co-creation); ~€10k budget for 6-person distributed group [source: 2026-07-10_post-milestone-leads-trip-alignment]
74. VS1 scope lock: magic must be demonstrable via scripted scroll encounter; 4-enemy minimum with unique combat behaviour per enemy; loot auto-distribution added to VS1 scope; Head of Design to produce full profession designs for VS2/VS3 planning [source: 2026-07-16_vs1-scope-lock-feature-enemy-magic-decisions]
75. Item provenance philosophy: items must accumulate history; gear improvability via essence absorption is the alternative to seasonal replacement; signed vs unsigned crafting as player agency serving both market and relationship players [source: 2026-07-16_mmo-item-provenance-identity-history-system]
76. Systemic design architecture confirmed: verbs-and-rules model adopted; kill-tag to last hit and body-fly distance 300 yards as specific implementation decisions; toxicity R-value approach from Blizzard/UCLA adopted for community design [source: 2026-07-16_mmo-systemic-emergence-toxicity-culture-engineering]
77. Live service secondary market (in principle): CS:GO-modelled earned-item secondary market; two-currency architecture; revenue share to partner games; explicitly not NFT/crypto; pending live service document formalisation [source: 2026-07-16_live-service-earned-items-secondary-market-non-nft-model]
78. Creative leadership 2x2 alignment session run 17 Jul 2026 (CPO facilitating): two senior creative roles mapped on Choice/impact vs Cozy (X) and Solo vs Group (Y) axes; genuine misalignment found between positions after open discussion; coloured-dot boundary exercise scheduled same afternoon to map tolerance zones beyond stated positions [source: not_qzZxF63HD9velR]
79. Robin Jubber operating model formally agreed 17 Jul 2026: monthly department touchpoints, directional questions only, findings to Product Council -- all hands-on design work transfers to Simon Woodruff; structural guardrails (monthly cadence + "directional questions only" rule) to counteract GD pull-back into design; "don't let meetings happen to you" as scheduling principle [source: not_odHxNAyfUCclXM]
80. Scope change communication gate adopted 17 Jul 2026: all scope changes must go through Product Council before team announcement, regardless of origin; incident: investor-driven magic abilities scope addition announced directly to team without Product Council gate; Art Director blindsided; morale impact followed the surprise, not the change itself [source: not_S2aqeqlWzBXtVY]
81. VS1 scope cut finalised 17 Jul 2026 using two-bucket method (must be in build / must not be in build): Cut -- PVP combat, arena, range combat, loot distribution, mount pets, character creation; Retained -- core item/entitlement system, consumables, equipment inventory; player progression simplified to "illusion of levelling" for VS context [source: not_qzZxF63HD9velR]
82. Three-tier AI governance framework adopted 17 Jul 2026 (presented to Art Director): Tier 1 Private/In-House (LLaMA local, ComfyUI local -- IP-safe, no data leaves studio); Tier 2 Public Frontier (Claude/ChatGPT/Gemini -- restrict to non-IP unless enterprise data isolation confirmed); Tier 3 Industry-Specific (Tripo, Meshy -- audit data handling before adoption, assume vendor training risk); sub-team sentiment: env art/animation pro-AI, VFX mostly pro, tech art mixed, character art sceptical, concept art opposed; triggered by Head of Finance licence audit discovering undisclosed AI spend [source: not_S2aqeqlWzBXtVY]
83. VS1 scope cut confirmed 21 Jul 2026 (directors and leads sync): PVP/arena, ranged combat, UX Bible, mounts/pets, automatic loot distribution, character customisation, faction reputation, tutorial, and FMV all deferred; one less map to build; UE5.8 upgrade complete; T-pose and GPU bottleneck are the two active technical risks; all DoDs locked by 23 Jul 2026 deadline [source: not_q2JjcZ90725rEe]
84. Contractor IR35 compliance reform decided 21 Jul 2026 (Glen, Aris, Lorenza, Ellis): shift to daily rate billing; 216 billable days per year; monthly soft cap 20 days; minimum 44 days per quarter or right of immediate termination; activity monitoring is audit-index only, never surveillance; effective end of August 2026 [source: not_5KyFjy7zJi04TS]
85. Currency unit confirmed as "bits" (hundreds denomination; marble-style visual; Source energy lore tie-in); auction house replaced by bazaar district (categorical stalls, home-listed items route automatically); double jump removed and replaced by ledge grab (must be fast and fluid; in place within 5 months); guild house UI mock-ups required for VS1 without back-end [source: not_q7ALevcXtg3TSw]
86. Bug triage spreadsheet adopted with EP triaging in standups, replacing direct-to-engineer bug pinging; weekly build cadence target (working toward daily with Mustafa); animation velocity (4 animations in 6 months) confirmed as project-critical risk; outsource blitz (Keywords, Virtuos, Evolution Recruitment) is the active mitigation [source: not_9nQcKcphTysGNd]
87. CH will never become the bank of record for real-money player-to-player trades; closed-gate Steam Wallet-style architecture is the firm position; off-ramp identified as the highest fraud vector; consumable/durable item distinction and full provenance tracking are non-negotiable architecture requirements for any trading system [source: not_GyjlUflBirp2Ab]
88. All new AI access grants to the CH game team paused until policy formalised (22 Jul 2026, COO and CPO); enterprise-only access policy for work tasks; DPO required for GDPR/PII/COPPA intersections; Granola transcripts and design discussions flagged as open legal question requiring DPO review [source: not_BnJG1zZhVGts0U_ai-ip]
89. Contractor backfill cost model formalised: two-month fully loaded cost per role (one month notice payout + one month overlap); per-backfill explicit overlap/no-overlap decision and incremental day-rate delta required before proceeding; Wave 1/2/3 prioritisation framework adopted for concurrent replacement programmes [source: not_BnJG1zZhVGts0U]
90. Pillar design methodology agreed 22 Jul 2026 (Glen and Robin): 5-10 pillars; three-component structure per pillar (is / is not / failure signals); feature-to-pillar mapping is a gate not a guideline -- unmapped features are cut or deferred; Steam tag thought experiment adopted as a fast market positioning check [source: not_Gpvov9xIRnEUle]
91. Resonance agreed as the definition of done for systemic features; complex is acceptable, complicated is always a design failure; day/night cycle adopted as the first base layer; seasons deferred until day/night is stable; player-driven discovery (wikis, knowledge sharing) is part of the intended gameplay loop [source: not_Gpvov9xIRnEUle]
92. PVP launch scope agreed 22 Jul 2026: open-world consensual zones only; structured PVP (arenas, ranked modes) deferred as a separate product pipeline; Sea of Thieves "Safer Seas" adopted as the cautionary playerbase-splitting case; 25-35% MMO PVP engagement rate established as the planning benchmark [source: not_Gpvov9xIRnEUle]

---

## Open Items

- **CTO hire** -- Chris Southall (Simon referral) lead candidate; Vardis interviews first. Xbox July 2026 layoff pool as fallback.
- **POG delivery** end of August 2026 -- scope cut to 4-6 months pending estimate cleanup
- **Combat scope/resource (Nadir)** -- 13-month critical path; resolution required before VS investor-presentable
- **VDR preparation** -- three investor docs in progress
- **Performance dashboard** -- build composite Slack+Jira+Perforce index; coordinate with Jira project admin; deploy to leads only
- **Art team thinning** -- veteran replacement plan for 30/55 overweight ratio; cost-neutral approach
- **Environment art bid** -- outsource bid commissioned; Michael confrontation pending bid results
- **Build machine** -- Mustafa to provide spec; budget allocation
- **SDET hire** -- engine/platform test automation, MMO root-cause debugging
- **PM role under Aris** -- needed immediately
- **Rania start** -- triggers fundraise materials activation
- **Series B fundraising** ($10M)
- **Lili onboarding** -- cash flow and burn projections first priority; budget governance model briefed day one
- **Leadership framework** -- Greece July (Lorenza + Glen), London immediately after (Graeme + Glen)
- **Greece gaming campus prospectus** -- before 20 July blackout
- **Pete (Senior Environment Artist)** -- US contractor headcount limit; relocation to Greece or UK
- **Alon backfill** -- David pipelining Tech Animation Lead
- **Maria narrative pipeline** -- Head of Narrative JD being written
- **Parallel EP pipeline** -- active risk mitigation; Graeme 30-day review
- **Vision framework / pillar locking** -- mandatory deadline set; five conflicting versions to retire; AMA gate
- **Simon formal transition** -- dedicated Robin-to-Simon handover meeting (Glen to lead)
- **Mustafa reward conversation** -- Glen to initiate
- **Quad assessment** -- due 19 June before FTE conversions
- **QA vendor** -- performance testing outsource active; Hannah sole resource
- **Sasha -- Forge design doc** -- Robin to walk her through it
- **DICE Athens** -- July and September (Glen attending)
- **Combat milestone structure** -- producers to deliver stages, blockers, timeline; lead designer to discrete named milestones
- **Vardis to share spell synergy Miro board and ClickUp status effects doc**
- **Persistence IS/IS-NOT** -- distribute definition before any further design document use
- **NPE design** -- locked 7 Jul 2026 (Decision #67); Robin to communicate to Gary to proceed on balloon + Portal Peak basis
- **Concept-first gate** -- locked 8 Jul 2026 (Decision #68); concept team at 2; gate active for new work forward only
- **AI art policy** -- Glen to initiate conversation with Art Director; no formal policy exists; AI reference material in use
- **GDD-first announcement** -- Glen to address dev team directly by EOD 7 July 2026; not delegated to leads
- **Skunkworks icon** -- one near-complete building in isolation as pitch asset; agreed with Graeme and Art Director; progress TBC
- **Brand identity buildout** -- priority sequence agreed (Decision #69); next: Larisa brand walkthrough 14 Jul 2026 2-3pm
- **Game design pillars** -- pillar craft sessions ongoing; 20-candidate method adopted; no final selections yet; next session TBC
- **DoD authority hierarchy** -- Game Director owns DoD, Creative Director has no vote; engineering DoD criteria missing and must be defined (Decision #70, 15 Jul 2026)
- **Two-axis archetype framework** -- adopted; pillar language diagnosed as skewing cozy/casual; pillar alignment session with full leadership required before final pillar selections; Pokemon balance model as benchmark (Decision #71, 15 Jul 2026)
- **World persistence semantic state model** -- agreed as viable path; Head of Design to produce technical brief on tag taxonomy, region state events, and player-observable signal layer (Decision #72, 15 Jul 2026)
- **2 carry-forward extracts from 2026-07-14** -- identity pending; 2 additional CH-tagged extracts from 2026-07-14 granola batch not yet compiled
- **Community management plan** -- Larisa to build plan now; execution deferred until gameplay content and campaign cadence in place
- **Post-VS leads trip (Greece, late September 2026)** -- transition ritual; three-session structure (AI studio layout, financial reality with intentional partial ambiguity, growth rhythm co-creation); 6 leads; ~€10k; Glen preference Greece over UK [source: 2026-07-10_post-milestone-leads-trip-alignment]
- **Live service document** -- formalise secondary market model; two-currency architecture and partner revenue share direction agreed in principle (Decision #77); document required before economy is finalised; must align with game pillars [source: 2026-07-16_live-service-earned-items-secondary-market-non-nft-model]
- **Gamescom pitch deck** -- late August deadline; prerequisites: financials consolidated by Lili (including headcount backlog), raise amount and valuation agreed internally, spend plan defined, investor target list built, brand identity stabilised [source: 2026-07-16_live-service-earned-items-secondary-market-non-nft-model]
- **Coloured-dot boundary exercise** -- follow-on to 2x2 creative alignment session; scheduled afternoon 17 Jul 2026; run with Game Director, Creative Director, Head of Design simultaneously (Decision #78)
- **Robin GD operating model rollout** -- monthly touchpoint cadence to be implemented; Robin to own schedule proactively; first monthly department review cycle TBC (Decision #79)
- **Product Council scope gate** -- formal gate process to be documented; Product Council must be the first gate for all scope changes before team announcement (Decision #80)
- **AI governance policy document** -- companion IP policy required: what constitutes studio IP, when prompts count as sharing IP, approved tool list per discipline; framework adopted (Decision #82) but policy document not yet written
- **UE5.8 technical risks** -- T-pose NPC animation bug (Matt investigating, fix expected w/c 28 Jul) and GPU/CPU bottleneck (Stefano and Andrea investigating); lighting decision outstanding (baked vs Lumen mega lights, target GPU RTX 3060, testing begins w/c 28 Jul) [source: not_q2JjcZ90725rEe]
- **All DoDs locked 23 Jul 2026** -- combat feel/game feel DoD was missing as of 21 Jul; deadline set; must move to Confluence as permanent canonical record [source: not_q2JjcZ90725rEe]
- **Art contractor blitz** -- Belgrade texture artist (Wayfinder background) in pipeline; headcount financials not yet approved; pipeline exists [source: not_q2JjcZ90725rEe]
- **AI tool request governance** -- formal submission process active (leads submit requests to Fred and Glen); no self-provisioning [source: not_q2JjcZ90725rEe]
- **IR35 contractor reform rollout** -- Lorenza to run vacation accrual report first; Lili owns finance mechanics; Ellis keeps contracts coherent; only ~3 contractors on current Mishcon template; IP clauses need updating simultaneously; Q&A roundtable for contractors; effective end of August 2026 [source: not_5KyFjy7zJi04TS]
- **Double jump removal** -- ledge grab replacement must be fast and fluid; target in place within 5 months; Robin to verify no level design gaps require double jump; full team alignment by end of week (Panos and Seth flagged) [source: not_q7ALevcXtg3TSw]
- **Guild house UI mock-ups** -- required for VS1 without back-end systems (investor visual context) [source: not_q7ALevcXtg3TSw]
- **UX/UI hire** -- shortlist Matt and Alexandra (AC background, scripting skills); Glen meets both before decision [source: not_q7ALevcXtg3TSw]
- **Animation outsource blitz** -- Keywords, Virtuos, Evolution Recruitment, MPG, Arctic 7 in scope; contractor blitz is only path to VS1 animation readiness [source: not_9nQcKcphTysGNd]
- **Bug triage process** -- EP monitoring direct-to-engineer bug rate; triage spreadsheet live; migrates to Jira when Jira is ready [source: not_9nQcKcphTysGNd]
- **Jira/Perforce integration** -- free Perforce plugin evaluated first; open-source bridge as fallback (maintenance risk flagged) [source: not_9nQcKcphTysGNd]
- **AI IP governance incident** -- all new AI access grants paused; enterprise-only policy to be formalised; DPO required for GDPR/PII/COPPA; Granola transcripts flagged as open legal question [source: not_BnJG1zZhVGts0U_ai-ip]
- **RMT marketplace architecture document** -- closed-gate architecture position agreed; full complexity decision (auction house vs direct-store) deferred to implementation stage; consumable/durable item distinction and provenance tracking required in data model [source: not_GyjlUflBirp2Ab]
- **Pillar design completion** -- three-component structure (is/is-not/failure signals) and feature-to-pillar mapping gate agreed 22 Jul; Glen and Robin independent pillar documents showed significant overlap; pillar alignment session with full creative leadership still required before final selections [source: not_Gpvov9xIRnEUle]

---

## New Entries -- 2026-07-22

### Extract 1: CH VS1 Major Scope Cuts, UE5.8 Upgrade, and DOD Lock (2026-07-21)

Directors and leads weekly sync 21 Jul 2026. VS1 scope has been materially cut: PVP/arena, ranged combat, UX Bible, mounts/pets, automatic loot distribution, character customisation, faction reputation, tutorial, and FMV all deferred. UE5.8 upgrade completed 21 Jul; two active risk items remain -- T-pose animation bug affecting all NPCs (Matt investigating, fix expected next week) and GPU bottleneck under CPU load (Stefano and Andrea investigating). Lighting decision outstanding: baked vs Lumen mega lights; target GPU is RTX 3060; testing begins the following week. All Definitions of Done (including game feel/combat DOD, which was missing) locked by deadline 23 July 2026; DoD is permanent, not VS1-only, and will move to Confluence as canonical record. AI tool requests from all leads now require formal submission to Fred and Glen. Short-term art contractors being sourced (Belgrade-based texture artist with Wayfinder background willing to wait one month); headcount financials not yet approved. [source: not_q2JjcZ90725rEe]

### Extract 2: CH Contractor IR35 Compliance Reform -- Day Rate Model (2026-07-21)

Couch Heroes was paying contractors for time off (vacation, bereavement leave), which is non-compliant with UK IR35 frameworks. Decision (Glen, Aris, Lorenza, Ellis): shift to daily rate billing based on actual days worked. Model: 260 working days minus 36 vacation minus 8 sick = 216 billable days annually; monthly soft cap 20 days, 18 expected average; days beyond 20 require manager pre-approval; minimum threshold 44 days per quarter (80% of 18/month baseline) with immediate termination right on breach. Bank holidays and vacation concepts removed for contractors. Contractors invoice in arrears; payment 7-14 days after invoice with lead manager approval required. HiBob overtime approval flow proposed for pre-approval of extra days; activity monitoring (Slack/Jira/Perforce) is an audit index only -- not surveillance, and must never be communicated to staff as such. Effective date: end of August 2026. Lorenza to run vacation accrual report first; Lili owns finance mechanics; Ellis keeps contracts coherent. Only ~3 contractors on current Mishcon template; IP clauses require updating simultaneously with new contracts. [source: not_5KyFjy7zJi04TS]

### Extract 3: CH VS1 Economy, Social Hub, and Core Feature Decisions (2026-07-21)

Priority session between Glen, Robin, and Vardis 21 Jul 2026. Currency unit confirmed as "bits" (hundreds denomination, marble-style visual with bronze/silver/gold-red; Source energy lore tie-in; "bits/kilobits/megabits" naming rejected as too literal). VS1 economy: simple buy/sell store only; full gains/drains system deferred to VS3. Auction house replaced by bazaar district: categorical stalls (weapons, armour, clothing, materials); players list items from home and items route automatically to relevant stall; rationale is reduced render load (Iron Forge problem), simpler onboarding, and foot traffic atmosphere; bank/storage remains VS1 non-negotiable. Double jump removed; replaced by ledge grab and recovery (must be fast and fluid, not Uncharted-slow); target: in place within 5 months; Robin to verify no level design gaps require double jump in interim; full team alignment on removal to be communicated by end of week (Panos and Seth flagged as having strong opinions). Guild house UI mock-ups required for VS1 even without back-end systems (investor visual context; retention framing: guilds increase retention ~75% in this genre). UX/UI hire shortlist: Matt and Alexandra (Assassin's Creed background, scripting skills); Glen meets both before decision. [source: not_q7ALevcXtg3TSw]

### Extract 4: CH Production QA Build Cadence, Bug Triage, and Animation Velocity (2026-07-20)

Production meeting 20 Jul 2026 (Glen, Graeme EP, Sean Samborski Producer, Fatima Dossola). Two active builds: stable QA build (behind) and current dev build (frequently broken). QA lead was pinging engineers directly multiple times daily, breaking engineering flow. Fix decided: bug triage spreadsheet with EP triaging in standups; migrates to Jira when ready; EP meeting QA 1-on-1 to align on process; EP monitoring whether direct-to-engineer bug rate drops. Build cadence target: weekly (working toward daily with Mustafa). Jira/Perforce integration goal: auto-lock assets on checkout; block task closure until P4 check-in confirmed; free Perforce Jira plugin evaluated first; open-source bridge API as fallback (maintenance risk flagged). Animation velocity gap flagged as project-critical risk: 4 animations delivered in 6 months from a team of 1.5 animators; at current rate VS completion projects to ~2031. Mitigation: outsource blitz; Keywords and Virtuos identified as AAA-grade options (Keywords ~30-40% more expensive); Evolution Recruitment, MPG, and Arctic 7 also in scope. NBI Associate Producer joining to cover operational gaps (document upkeep, meeting coordination, EP support). Hiring list at 12 open roles; not to be shared externally. [source: not_9nQcKcphTysGNd]

### Extract 5: Studio Contractor Backfill Cost Model and Wave Prioritisation (2026-07-22, anonymised)

Operations sync 22 Jul 2026 (COO, Head of People, Finance lead, CPO). Standard backfill cost model: one month notice payout plus one month dual-contractor overlap equals two months fully loaded cost per role; overlap is a decision, not a default. Per-backfill checklist required before actioning: (1) overlap or no overlap with justification; (2) incremental day-rate delta between departing and incoming (replacements are often more junior-to-senior). Wave prioritisation framework for concurrent replacement programmes: Wave 1 critical/milestone-tied, Wave 2 timing-negotiable, Wave 3 fiscally conditional on funding or revenue milestone. Recruiting vendor model analysis: fixed monthly retainer (~$15K/month) vs contingency (~15% of salary); at 8 roles averaging $60K, contingency totals ~$72K vs retainer ~$105K over the same period; retainer only wins at sustained high volume. [source: not_BnJG1zZhVGts0U]

### Extract 6: Studio AI Tool Governance -- Enterprise vs Personal Accounts and IP Risk (2026-07-22)

Operations sync 22 Jul 2026. Incident: a CH team member loaded company creative direction documents into a personal AI tool. Risk identified: IP fed into personal (non-enterprise) AI tools may lose copyright protection on literary works and design elements; two active Oregon-based actor lawsuits exploiting this gap as of July 2026. Critical distinction: enterprise Claude/ChatGPT accounts keep IP within the enterprise tenant with "do not use for training" policy; personal accounts do not. Google Drive/Gemini integration assessed as a legal grey area requiring DPO guidance, not immediate prohibition. Immediate governance actions decided (COO and CPO): pause all new AI access grants to the game team until policy formalised; require all team members to enable "do not use for training" in tool settings; establish enterprise-only access policy for work tasks; bring in DPO expertise for GDPR, PII, and COPPA intersections; treat Granola meeting transcripts and design discussions as an open legal question requiring DPO review. [source: not_BnJG1zZhVGts0U_ai-ip]

### Extract 7: RMT Regulation and Marketplace Architecture for Live-Service Economy (2026-07-22)

Design direction debrief 22 Jul 2026 (Glen CPO, Aris COO). Two marketplace models confirmed as coexistable: direct store purchase (partner store page, no player-to-player trade) and auction house (player-to-player trade with revenue cut to studio). Regulatory boundary that determines liability: player trades item for in-game currency only requires no financial compliance; player trades item for real money triggers IFRS-style regulation and makes studio the bank of record. Firm position decided: CH will never become the bank of record for real-money player-to-player trades (hard architectural constraint). Fraud profile: the off-ramp (converting in-game value to real-world cash) is the highest fraud vector; preferred architecture is a closed gate (Steam Wallet model -- money stays in-system, cannot be converted externally). Architecture requirements for any trading system: consumable vs durable item distinction enforced in data model; full item provenance tracking; revenue cut mechanism on every auction house transaction. Final complexity decision (full auction house vs direct store only) deferred to implementation stage based on time and build progress. [source: not_GyjlUflBirp2Ab]

### Extract 8: MMO Game Pillar Design Methodology -- Structure, Framing, and Feature Alignment (2026-07-22)

Two-hour design alignment session 22 Jul 2026 (Glen CPO and Robin Game Director). Pillar count agreed: 5-10 pillars per game; fewer loses nuance, more creates navigation overhead. Three-component structure required per pillar: (1) what it is (positive definition); (2) what it is not (anti-definition, sets the Overton window); (3) failure signals (observable indicators the pillar has been violated in a feature). Feature-to-pillar mapping rule adopted as a gate: every feature must map to at least one pillar; features that cannot be mapped are red flags for cut or deferral; features mapping to multiple pillars deliver disproportionate value per unit of scope. Language risk noted: reductive "what it is not" language can be over-applied by teams (example: "no numbers games" misread as "never show numbers") -- intent is Overton window setting, not hard prohibition. Steam tag thought experiment agreed as a fast market positioning check: feed game lore or design document to an AI and infer the resulting Steam tag list to surface implied genre positioning. Ideation process gap identified in founder-led studios: unilateral idea distribution to individuals without shared context causes divergent priority models; fix is a single shared ideation channel for all creative leads. [source: not_Gpvov9xIRnEUle]

### Extract 9: Systemic Design Philosophy -- Resonance, Complex vs Complicated, and Layered Systems (2026-07-22)

Same two-hour design alignment session 22 Jul 2026 (Glen CPO and Robin Game Director). Resonance defined and agreed as the correct definition of done for systemic features: a gameplay moment that lands, surprises, and is worth retelling to another player; a rough emergent moment players share beats a flawless scripted moment they do not. Complex vs complicated distinction adopted: complex (many interacting elements players can reason through) is acceptable and desirable; complicated (too many inputs for players to infer cause from effect) is always a design failure. Test: if a player cannot infer what caused an outcome, the system has too many inputs. Layered systems approach: begin with a small set of simple, readable systems and add layers incrementally -- do not design all layers upfront. Day/night cycle adopted as the archetype for base layers: one state change can be applied to anything sensitive (animal behaviour, herb spawning, visibility, NPC schedules) producing emergent content without dedicated feature work; seasons are a later layer. Player-driven discovery (wikis, emergent knowledge sharing) agreed as part of the intended gameplay loop in a systemic MMO, not a failure of tutorial design. Reference example: lightning plus metal weapon in a goblin camp produces emergent electrocution from intersecting rules without a dedicated "stealing mechanic." [source: not_Gpvov9xIRnEUle]

### Extract 10: MMO PVP Design -- Consensual Zones and Playerbase Splitting Risk (2026-07-22)

Same design alignment session 22 Jul 2026. PVP engagement benchmark established: historically 25-35% of MMO players engage with PVP content; this is the planning baseline for PVP investment. Agreed launch approach: open-world consensual PVP zones only; do not invest in structured PVP mechanics (arenas, ranked modes, dedicated PVP progression) at launch. Rationale: structured PVP is a separate game requiring a separate balancing and content pipeline that competes with the core game for resources during the period when core needs most investment. Sea of Thieves "Safer Seas" identified as the cautionary playerbase-splitting case: introduced to satisfy PVE players, it split the playerbase and satisfied neither side fully; lesson is to design better consensual opt-in mechanics, not separate modes. Zone-based consent preferred over interaction-level consent: zone choice is legible; interaction-level consent creates friction and ambiguity. [source: not_Gpvov9xIRnEUle]

---

## Source Index

| ID | Source Type | Date | Extract Type |
|---|---|---|---|
| 5d50bc6a | Granola | 2026-07-01 | methodology |
| 022a922c | Granola | 2026-07-01 | methodology |
| a8cca6f4 | Granola | 2026-07-02 | methodology |
| 2026-07-02_art-style-lock-forcing-mechanism | Granola | 2026-07-02 | methodology -- NEW |
| 2026-07-02_vertical-slice-proxy-vs-finished-ratio | Granola | 2026-07-02 | methodology -- NEW |
| 2026-07-06_ch-tutorial-ftu-adaptive-design | Granola | 2026-07-06 | decision -- NEW |
| 2026-07-06_ch-concept-art-support-not-gate | Granola | 2026-07-06 | decision -- NEW |
| 2026-07-06_ch-gdd-first-engineering-gate | Granola | 2026-07-06 | methodology -- NEW |
| 2026-07-07_ch-npe-single-player-instancing | Granola | 2026-07-07 | decision -- NEW (carry-forward) |
| 2026-07-07_ch-concept-first-gate-new-work | Granola | 2026-07-07 | decision -- NEW (carry-forward) |
| 2026-07-08_ch-brand-identity-buildout | Granola | 2026-07-08 | decision -- NEW |
| 2026-07-08_game-design-pillar-craft | Granola | 2026-07-08 | methodology -- NEW (anonymised) |
| 2026-07-10_ai-3d-asset-pipeline-tripo-human-pass | Granola | 2026-07-10 | methodology -- NEW (carry-forward, internal) |
| 2026-07-10_dod-qa-integration-overflow-targets | Granola | 2026-07-10 | methodology -- NEW (carry-forward, anonymised) |
| 2026-07-10_post-milestone-leads-trip-alignment | Granola | 2026-07-10 | methodology -- NEW (anonymised) |
| 2026-07-15_dod-decision-authority-hierarchy-game-director | Granola | 2026-07-15 | decision -- NEW |
| 2026-07-15_mmo-player-archetype-multi-axis-design-framework | Granola | 2026-07-15 | methodology -- NEW |
| 2026-07-15_world-persistence-apophenia-semantic-state-model | Granola | 2026-07-15 | methodology -- NEW |
| 2026-07-16_vs1-scope-lock-feature-enemy-magic-decisions | Granola | 2026-07-16 | decision -- NEW |
| 2026-07-16_mmo-item-provenance-identity-history-system | Granola | 2026-07-16 | methodology -- NEW |
| 2026-07-16_mmo-systemic-emergence-toxicity-culture-engineering | Granola | 2026-07-16 | methodology -- NEW |
| 2026-07-16_live-service-earned-items-secondary-market-non-nft-model | Granola | 2026-07-16 | decision -- NEW |
| not_Ua643ajeN9C1f7_okr | Granola | 2026-06-16 | decision |
| not_Ua643ajeN9C1f7_publisher | Granola | 2026-06-16 | decision |
| not_3bUR2wWsPQvo8n_scope | Granola | 2026-06-16 | decision |
| not_3bUR2wWsPQvo8n_build | Granola | 2026-06-16 | decision |
| not_3bUR2wWsPQvo8n_hiring | Granola | 2026-06-16 | action_item |
| not_3bUR2wWsPQvo8n_docs | Granola | 2026-06-16 | decision |
| not_a14oJDQNm4jRpN | Granola | 2026-06-17 | decision |
| not_VAlGkyKnb8xGcs | Granola | 2026-06-17 | methodology |
| not_9qoMQqGw4HJ8jk_asset_tracking | Granola | 2026-06-18 | insight |
| not_RvwYJRgRr1iCq8 | Granola | 2026-06-18 | decision |
| not_ireYPwXIKrrsWd_vdr | Granola | 2026-06-18 | data_point |
| not_4nWBkRC4r7TVRQ_hiring | Granola | 2026-06-18 | action_item |
| granola_f181174b | Granola | 2026-06-24 | decision |
| granola_5148908e | Granola | 2026-06-24 | decision |
| granola_3cadc973 | Granola | 2026-06-24 | insight (anonymised) |
| 2026-06-22_tencent-data-sovereignty-publishing-terms | Granola | 2026-06-22 | methodology |
| 2026-06-26_ch-art-style-lock-milestone | Granola | 2026-06-26 | methodology |
| 2026-06-30_ch-ab-testing-live-balance-no-patch | Granola | 2026-06-30 | insight |
| 2026-06-30_ch-mmo-world-lore-cosmology | Granola | 2026-06-30 | decision |
| 2026-06-30_contractor-dead-contracts-vacation-rate-uplift | Granola | 2026-06-30 | methodology |
| 2026-06-30_systems-designer-role-definition-mmo | Granola | 2026-06-30 | insight |
| 2026-06-30_ch-shortal-peak-layout-review | Granola | 2026-06-30 | decision |
| 2026-07-01_ch-game-vision-pillar-framework | Granola | 2026-07-01 | methodology |
| 2026-07-01_ch-confluence-jira-clickup-migration | Granola | 2026-07-01 | decision |
| 2026-07-01_mmo-instancing-vs-seamless-decision | Granola | 2026-07-01 | decision |
| 2026-07-01_mmo-persistence-is-not-definition | Granola | 2026-07-01 | decision |
| 2026-07-01_vs-estimation-commit-protocol | Granola | 2026-07-01 | decision |
| 2026-07-01_xbox-layoffs-talent-pool-july-2026 | Granola | 2026-07-01 | insight |
| granola_50612dd7 | Granola | 2026-04-13 | insight |
| granola_b3eed99d | Granola | 2026-04-09 | insight |
| granola_5fdd8c18 | Granola | 2026-04-28 | methodology |
| granola_e5678c68 | Granola | 2026-05-05 | decision |
| granola_0dcf8a54 | Granola | 2026-05-05 | contact |
| granola_89fd69cd | Granola | 2026-05-07 | decision |
| granola_c3205cb8 | Granola | 2026-05-12 | decision |
| granola_a2aa92f3 | Granola | 2026-05-20 | decision |
| granola_6652283e | Granola | 2026-05-20 | contact |
| granola_93bc0089 | Granola | 2026-05-21 | decision |
| granola_4005eb22 | Granola | 2026-05-21 | decision |
| granola_b82e3b84 | Granola | 2026-05-22 | decision |
| granola_6abbe520 | Granola | 2026-05-22 | decision |
| granola_301693b4 | Granola | 2026-05-22 | decision |
| granola_53aa4eef | Granola | (prior) | data_point |
| granola_7724d8e4 | Granola | 2026-06-02 | decision |
| granola_09a5ad16 | Granola | 2026-06-02 | insight |
| granola_4ea13f1e | Granola | 2026-06-02 | methodology |
| granola_42497026 | Granola | 2026-06-03 | decision |
| granola_54a02074 | Granola | 2026-06-03 | insight |
| granola_c67dc278 | Granola | 2026-06-04 | insight |
| granola_dc715a3c | Granola | 2026-06-04 | decision |
| granola_03a27e7d | Granola | 2026-06-04 | insight |
| granola_2786539f | Granola | 2026-06-05 | insight |
| granola_861b2342 | Granola | 2026-06-05 | exemplar |
| granola_37ee112c | Granola | 2026-06-08 | insight |
| granola_73ec7e87 | Granola | 2026-06-08 | decision |
| granola_bad498ba | Granola | 2026-06-08 | insight |
| granola_2dc99779 | Granola | 2026-06-09 | insight |
| granola_d0c199fc | Granola | 2026-06-09 | decision |
| granola_fd4d524b | Granola | 2026-06-10 | decision |
| granola_f7d8e883 | Granola | 2026-06-10 | exemplar |
| granola_75160e95 | Granola | 2026-06-11 | decision |
| granola_688a29e4 | Granola | 2026-06-11 | decision |
| granola_48ceec22 | Granola | 2026-06-11 | decision |
| granola_09f36b66 | Granola | 2026-06-12 | insight |
| granola_936d0c2d | Granola | 2026-06-12 | decision |
| granola_9e2c57bb | Granola | 2026-06-12 | insight |
| granola_28f30e99 | Granola | 2026-06-12 | insight |
| not_J9HC1OjWMHxMkt | Granola | 2026-06-15 | decision |
| not_mK8Dh4Jc0Et6h4 | Granola | 2026-06-15 | decision |
| not_2BwqeNVXtJl16E | Granola | 2026-06-15 | insight |
| not_li7bX7ksDDB9cP | Granola | 2026-06-15 | decision |
| gmail_composite_hiring_wave | Gmail | 2026-05-25 | insight |
| gmail_19dfdf4dd46d86f7 | Gmail | 2026-05-25 | insight |
| gmail_19e3b1c434f765ba | Gmail | 2026-05-25 | decision |
| gmail_19df7a1b8aa33db5 | Gmail | 2026-05-25 | insight |
| gmail_19df79fb4b8683c3 | Gmail | 2026-05-25 | decision |
| gmail_19e505e5c54726bd | Gmail | 2026-05-25 | data_point |
| gmail_19d304740468c085 | Gmail | 2026-05-25 | data_point |
| gmail_19e5da7716409103 | Gmail | 2026-05-26 | data_point |
| gmail_19bd68df4acebc2a | Gmail | 2026-05-26 | insight |
| slack_aris-dm_2026-05-25_hiring | Slack | 2026-05-25 | data_point |
| slack_lorenza-dm_2026-05-25_contracts | Slack | 2026-05-25 | decision |
| slack_production-council_2026-05-25_escalation | Slack | 2026-05-25 | insight |
| slack_production-council_2026-05-25_process | Slack | 2026-05-25 | decision |
| slack_robin-dm_2026-05-25_design | Slack | 2026-05-25 | insight |
| ch_offsite_pre_decisions_2026-04-27 | OneDrive | 2026-04-27 | decision |
| ch_org_structure_2026-04-26 | OneDrive | 2026-04-26 | insight |
| ch_partner_portals_creative_brief_2026-05-11 | OneDrive | 2026-05-11 | insight |
| ch_production_consolidation_spec | OneDrive | 2026-05 | methodology |
| ch_uk_company_guidance_2026-03-26 | OneDrive | 2026-03-26 | methodology |
| ch_studio_business_items_2026-04 | OneDrive | 2026-04 | methodology |
| ch_offsite_working_doc_2026-04-27 | OneDrive | 2026-04-27 | methodology |
| chatgpt_68821eb7 | ChatGPT | 2025-07-24 | decision |
| chatgpt_68fa2c70 | ChatGPT | 2025-10-23 | methodology |
| chatgpt_68fbb0a4 | ChatGPT | 2025-10-24 | data_point |
| chatgpt_69025031 | ChatGPT | 2025-10-29 | methodology |
| chatgpt_69034e5d | ChatGPT | 2025-10-30 | insight |
| chatgpt_6907ec33 | ChatGPT | 2025-11-02 | methodology |
| chatgpt_69437062 | ChatGPT | 2025-12-18 | methodology |
| chatgpt_6967809b | ChatGPT | 2026-01-14 | insight |
| ch_downloads_recent_2026-05 | Downloads | 2026-05 | insight |
| not_qzZxF63HD9velR | Granola | 2026-07-17 | methodology |
| not_odHxNAyfUCclXM | Granola | 2026-07-17 | methodology |
| not_S2aqeqlWzBXtVY | Granola | 2026-07-17 | methodology |
| not_9nQcKcphTysGNd | Granola | 2026-07-20 | methodology -- NEW |
| not_q2JjcZ90725rEe | Granola | 2026-07-21 | decision -- NEW |
| not_5KyFjy7zJi04TS | Granola | 2026-07-21 | decision -- NEW (client_scoped) |
| not_q7ALevcXtg3TSw | Granola | 2026-07-21 | decision -- NEW |
| not_BnJG1zZhVGts0U | Granola | 2026-07-22 | methodology -- NEW (anonymised, backfill cost model) |
| not_BnJG1zZhVGts0U_ai-ip | Granola | 2026-07-22 | methodology -- NEW (AI IP risk, same session as above) |
| not_GyjlUflBirp2Ab | Granola | 2026-07-22 | methodology -- NEW (RMT marketplace architecture) |
| not_Gpvov9xIRnEUle | Granola | 2026-07-22 | methodology -- NEW (pillar methodology, systemic design, PVP design -- 3 extracts from same session) |

**Restricted (skipped -- 12):** granola_15eb6a83, granola_0aea306a, granola_18d9cac4, granola_5694690e, granola_308ec3c6, granola_6d2e7219, granola_967bcd05, granola_458acb14, granola_42d0d543, not_RESTRICTED_1, not_RESTRICTED_2, not_RESTRICTED_3

**Restricted (2026-06-16):** 2026-06-15_lighthouse-stavros-contract-jira-sync.md (sensitivity: restricted)

**Restricted (2026-06-17):** 2026-06-17_ch-cto-search-pipeline-june-17.md (named CTO candidates with assessments, restricted); 2026-06-17_ch-hr-terminations-june-17.md (termination decisions, restricted)

**Restricted (2026-06-18):** Active HR proceedings (Charlie/Ella/Yorgos/Anthony) and team capability assessments with exits -- restricted, Glen approval required.

**Restricted (2026-06-24):** CTO candidate identity, recruiter firm, and individual assessment details -- anonymised extract compiled instead.

**Not for CH bank:** granola_80731373 (Lighthouse), granola_9123b844 (production_methods), granola_54f4bdbc (production_methods), not_zBxoXexM2abxz9 (production_methods only). 2026-06-30 non-CH extracts: audience-first-game-design, lighthouse-status-deck, xbox-franchise-safety, mmo-narrative-breadcrumb, ch-creative-director-dual-mode, nbi-ai-readiness, nbi-bd-pipeline (various banks).
