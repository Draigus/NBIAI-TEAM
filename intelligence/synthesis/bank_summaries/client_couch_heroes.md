---
bank: client_couch_heroes
summary_generated: 2026-06-30
source_bank_lines: 560
source_bank_extracts: 97
---

# Client: Couch Heroes -- Bank Summary

**Bank:** `intelligence/banks/client_couch_heroes.md` | **Last compiled:** 2026-06-30 (incremental, 6 new + 2 carry-forward) | **Full bank:** ~560 lines

## What This Bank Knows

- **Studio state June 2026:** ~70 employees, GBP 30k/month NBI engagement. Cosy byte-punk MMORPG targeting late 2028. POG deadline end August 2026. Wednesday is formalised merge day; ClickUp is interim SOT pending Confluence templating; UGS adoption pending; RMT store 90% complete. Studio health: art dept 7.5-8/10 (from 3), broader studio 6/10 (from 2.5-3).
- **Hiring snapshot (authoritative June 2026):** Hrops signed; Gary/Simon/Fred (Art Producer) onboarding. Daniel start 1 July (PSC). CTO: Chris Southall (Simon Woodruff referral) is lead candidate; senior technical candidate (CTO-level) also interviewed 2026-06-24. SDET and junior/mid tester hires needed. Systems designer hire blocked until design pillars are locked; UI/UX and narrative designer are priority 1.
- **Strategic decisions confirmed:** Self-publish (no publisher). Investor profile = blue-chip dividend-yield seekers, not gaming VC. Xbox front page ~200x download multiplier. Sub-studio model discussed, not decided. Rania's start triggers fundraise materials activation.
- **Governance (61 documented decisions):** OKR thresholds (1 week = green, 4 months = red), two-layer status model, PM role under Aris needed immediately, scope governance (full estimate before cuts, ad hoc cuts in writing only), VS three purposes (demo + pipeline validation + investor material), IT/security as prerequisite for funding rounds and insurance.
- **Game design depth:** Synergistic combat locked as non-negotiable core pillar (spell interaction system already in GDD: wet + lightning = critical hit); rune cosmology settled (all runes from start, staggered by biome; tutorial: lightning + healing pair). Crack-stack combat (7 levels), weapon mastery soft class system, class-agnostic armour (AC 1-30, skill-gated debuffs), shark-tooth MMO macro tempo, double RNG loot, Forge system (roughness-map texture approach), 4-minute zone density rule.
- **World lore and cosmology (formally locked Jun 29-30 2026):** Digit One (first human to digitalise himself; created Darwin/world engine, The Ardents, and Drisden/antagonist; disappeared through Portal Peak). Four Ardents: Sara (creation/life), Nero (data integrity), Agni (defence), Merivia (information/transport). The Fracturing: Drisden exploited collapse; Digit One fractured the universe to stop him (~98% casualties). 64-glyph proto-language magic system (combinations predetermined, progression-unlocked). Factions (Hogwarts cooperative model): Weavers/Wardens/Keepers/Seekers. Dual visual eras: mythcore (pre-Fracturing) and gridcore (post-Fracturing). VS1 is systems-first; narrative delivery in VS2+.
- **MMO positioning confirmed:** Between Palia (smaller/casual) and vanilla WoW (too large/demanding). Systems-heavy, design-led, highly social. Not a "hostage game." Zone scale: 200 players/zone, up to 100 in open-world combat. Cross-game entitlement is secondary, not the product thesis.
- **Publishing and data sovereignty:** Tencent (Level Infinite) is sole data controller; all telemetry routes through GCP owned by Tencent; PII stripped before studio delivery; Level Infinite login gate required for all players. US military watchlist exposure (TikTok-style operational split plausible at scale). Do not design monetisation that depends on demographic targeting CH does not control. Negotiate for demographic enrichment delivery as a contract term.
- **A/B live balance testing (in development Jun 2026):** Server-side balance variable adjustment via web UI without a client patch. Enables simultaneous A/B splits across player segments. Compresses tune-observe-iterate from weeks to hours. Designers act without engineering dependency once built.
- **Art style (locked Jun 2026):** Mythcore (ancient golden era, grand architecture) and gridcore (post-Fracturing, cobbled-together) are the two formal visual registers. Each needs its own asset kit -- shared kits create hybrid reads. Formal lock process: Art Director + Game Director + studio lead sign-off; engineering load check; locked in a single authoritative document. Density gradient: mythcore density decreases with distance from civilisation centre.
- **Backend architecture patterns (validated June 2026):** Hybrid topology (not microservices, not monolith); UDP for movement/combat, TCP/WebSocket for economy/social; three-tier persistence (sharding, spanning, persistent shard); SQL for transactional, NoSQL for flexible data; strongly server-authoritative; C++ for movement servers, Go/.NET for backend services.
- **Contractor workforce policy:** Dead contracts closed immediately (without prejudice by default). Vacation rate-uplift baked into day rate; contractors notify (not request). Handbook version pinned at signing. Multi-jurisdiction: UK/Germany/Netherlands/Cyprus/Greece/US. UK Skilled Worker Visa 2026 minimum: GBP 41,700; PhD holders ~GBP 37,000.

## Most Recent Additions (2026-06-30, 6 new + 2 carry-forward)

- **Tencent (Level Infinite) data sovereignty** (carry-forward from Jun 22) -- sole data controller; GCP routing; PII stripped; Level Infinite login gate; US watchlist risk; analytics strategy must not depend on demographic data CH does not control
- **Art style lock milestone** (carry-forward from Jun 26) -- mythcore/gridcore dual registers locked; each needs own kit; formal lock process with AD/GD/studio lead sign-off; density gradient rule
- **A/B balance testing without patch** -- server-side value delivery; true A/B player splits; designers independent of engineering; in development Jun 2026
- **World lore and cosmology locked** -- Digit One, four Ardents, Drisden antagonist, The Fracturing (~98% casualties), 64-glyph magic system, four cooperative factions; VS1 systems-first; narrative in VS2+
- **Contractor dead contracts policy** -- multi-jurisdiction; immediate closure; rate-uplift model; handbook version pinning; UK visa minimums documented
- **Systems designer role typology** -- blocked until pillars locked; two sub-types (gameplay systems vs world/emergence systems); world/emergence is the differentiating hire; UI/UX and narrative designer priority first

## Gaps

- VFX Lead discrepancy: prior entry "Kalen | GBP 75k" (granola_c3205cb8) vs current "Fred" (not_3bUR2wWsPQvo8n_hiring) -- resolution unknown
- CTO outcome 2026-06-24 interview: candidate details and assessment are restricted; no compiled outcome
- LRP content: three domains agreed (revenue, production quality, investor confidence) but no content yet documented
- Series B timeline: still TBC pending Rania start and fundraise materials activation
- Restricted extracts: 21 total skipped across all compilations -- highest-value people decisions (HR, terminations, full CTO shortlist) remain excluded
- Environment art outsource bid: ordered, result not yet in bank
- Combat milestone stages: producers tasked with delivery; result not yet compiled
- Spell synergy Miro board content: Vardis to share; not yet in bank
- Tencent demographic enrichment negotiation: outcome not yet documented
- A/B testing system build: in development -- no completion or first-result date documented
