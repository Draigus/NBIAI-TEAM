# Client: Couch Heroes -- Knowledge Bank

**Last compiled:** 2026-07-06 (incremental)
**Sources:** 111 extracts (78 Granola, 9 Gmail, 6 Slack, 10 OneDrive, 9 ChatGPT, 1 Downloads) -- 5 new since 2026-07-02 (2 carry-forward from 2026-07-02, 3 new 2026-07-06)
**Role associations:** producer, production_consultant, head_of_people, gaming_practice_lead

---

## Executive Summary

Couch Heroes (CH Game Development UK Ltd) is NBI's largest active client at GBP 30k/month. The studio has approximately 55-70 employees across UK and Greece (55 cited in July 1 briefing; ~70 cited mid-June; discrepancy may reflect counting methodology or headcount changes), building a cosy byte-punk MMORPG targeting late 2028 launch. Glen serves as fractional CPO, leading a production transformation. The vertical slice has been reframed as POG (Proof of Game) with five formal objectives; the VS estimation was formally committed July 1 2026 at T4 floor, ±10% buffer. Simon Woodruff (Head of Design) is through observation mode; vision pillar format is locked (headline+subheading+story, mandatory red-team). OKR thresholds agreed; Wednesday is formalised merge day; tooling migration timeline set (Jul: Confluence/ClickUp; Aug: Confluence company-wide; Sep: Jira). CTO search active; Chris Southall (Simon referral) is lead candidate. Investor strategy confirmed: blue-chip dividend-yield investors. VDR in preparation; combat at 13 months (Nadir) is the VS critical path blocker. Studio health has recovered materially (art 3/10 to 7.5-8; studio 2.5-3 to 6). World lore and cosmology locked June 29-30. CPO scope formally defined: HR, Finance, IT, Legal, PM -- producers own the game, CPO covers everything else. Budget governance established for new Finance hire (Lili, started July 1): two-house model (game dev vs studio ops), 5 macro codes, L&D split (central HR + departmental), petty cash at director level only, AI tools excluded from petty cash. Performance composite dashboard (Slack+Jira+Perforce) approved to surface the 30/55 effective output gap; visibility-first, leads only, no HR escalation direct from signal. HR People Ops Specialist started July 6 2026.

**New (2026-07-06):** Forced art direction lock session convened; Glen is sole unlock authority -- future art direction proposals submitted as formal alternatives only, existing lock not reopened for debate. VS proxy (Tier 1) confirmed as correct VS1 quality target; ~1:1.8 proxy-to-finished ratio; skunkworks icon parallel track agreed with Graeme (EP) and Art Director. Tutorial Cave kick-off: single-player zone confirmed from start area through to portal (Robin to confirm if all the way to Portal Peak); telemetry-triggered prompts replace rigid click-through tutorial; investor-facing VS demo walked live by Creative Director. GDD-first pipeline declared non-negotiable: engineering kicks back any request without a design document; escalation to CPO if engineering is pushed; Glen to address dev team directly by EOD 7 July 2026. Concept art repositioned as a support function -- assets approved by relevant lead are not sent back to concept; AI art policy conversation scheduled with Art Director.

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

**Robin Jubber (Creative Director/Game Director):** Restructured to individual contributor game director -- codify Vardis's vision, align art and animation, direct the game. No longer managing junior staff. Robin and Simon as peers [source: granola_936d0c2d, granola_bad498ba]. Self-assesses combat depth at 6-7/10. Rune system well-suited to pairing mechanics [source: granola_f181174b].

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

### Combat System

**Pressure system (crack stacks):** 1-7 cracks; detonation creates stuns (Level 2: flinch, Level 5: stagger, Level 7: knockdown). Heavy attacks break blocks. Co-op: one player builds, another detonates [source: granola_7724d8e4].

**Weapons as soft class layer:** Maces (stun), axes (bleed), swords (crit), daggers (high DPS). Mastery unlocks over time. Level cap: 60 [source: granola_fd4d524b, granola_42497026].

**Player archetypes:** 30-35% non-combat-primary; crafting/social classes require equivalent depth [source: granola_fd4d524b].

**Enemy AI:** Tag-based, 5 D&D attributes with 3 tiers = 15+ archetypes. Modifiers add identity [source: granola_7724d8e4].

**Armour:** Class-agnostic AC scale 1-30. Wearing heavy without skill investment = movement debuffs. Side-grades, not stat gates [source: not_li7bX7ksDDB9cP].

**PVP:** Zone cloning; no mixed PVE/PVP. Cosmetic-only rewards. Loot: double RNG, per-player masking, responsive weighting after 500+ kills without target item [source: granola_42497026, granola_fd4d524b].

### Level and World Design

**Shortal Peak principles (Jul 1 2026):** White-box boss room and summit library first (anchor spaces dictate proportions). Linear onboarding = intentional VS design. Corruption = beauty-vs-defilement, restrained. Player objective in VS: reconnaissance + partial cleanup + escape. Tower needs to be twice as wide. Summit library = primary Digit One narrative anchor [source: 2026-06-30_ch-shortal-peak-layout-review].

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

**QA integration:** Embedded in every sprint. Sprint cannot close unless QA declares bug bar met. Per-feature buffer columns; 30% average realistic. Build machine constraint must be resolved [source: not_mK8Dh4Jc0Et6h4].

**AI policy by discipline:** Code -- AI for cleanup/review only. Design -- research, ideation, red-teaming only. Art -- concepting, colour options, prop ideas acceptable [source: granola_dc715a3c].

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
- **Tutorial Cave zone scope** -- Robin to confirm single-player zone extends all the way to Portal Peak (proposal pending)
- **AI art policy** -- Glen to initiate conversation with Art Director; no formal policy exists; AI reference material in use
- **GDD-first announcement** -- Glen to address dev team directly by EOD 7 July 2026; not delegated to leads
- **Skunkworks icon** -- one near-complete building in isolation as pitch asset; agreed with Graeme and Art Director; progress TBC

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

**Restricted (skipped -- 12):** granola_15eb6a83, granola_0aea306a, granola_18d9cac4, granola_5694690e, granola_308ec3c6, granola_6d2e7219, granola_967bcd05, granola_458acb14, granola_42d0d543, not_RESTRICTED_1, not_RESTRICTED_2, not_RESTRICTED_3

**Restricted (2026-06-16):** 2026-06-15_lighthouse-stavros-contract-jira-sync.md (sensitivity: restricted)

**Restricted (2026-06-17):** 2026-06-17_ch-cto-search-pipeline-june-17.md (named CTO candidates with assessments, restricted); 2026-06-17_ch-hr-terminations-june-17.md (termination decisions, restricted)

**Restricted (2026-06-18):** Active HR proceedings (Charlie/Ella/Yorgos/Anthony) and team capability assessments with exits -- restricted, Glen approval required.

**Restricted (2026-06-24):** CTO candidate identity, recruiter firm, and individual assessment details -- anonymised extract compiled instead.

**Not for CH bank:** granola_80731373 (Lighthouse), granola_9123b844 (production_methods), granola_54f4bdbc (production_methods), not_zBxoXexM2abxz9 (production_methods only). 2026-06-30 non-CH extracts: audience-first-game-design, lighthouse-status-deck, xbox-franchise-safety, mmo-narrative-breadcrumb, ch-creative-director-dual-mode, nbi-ai-readiness, nbi-bd-pipeline (various banks).
