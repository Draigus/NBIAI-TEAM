# Gaming Industry Context

**Tier 1 knowledge -- loaded by all gaming consulting roles and any agent working on gaming client deliverables.**

Last updated: 2026-03-28

---

## Why This File Exists

NBI is a gaming consultancy. Every consulting agent needs baseline knowledge of the gaming industry landscape: genres, platforms, business models, and key terminology. This file provides that foundation. Deep domain-specific knowledge lives in each role's Tier 2 knowledge file. This file provides the cross-cutting context that every gaming-facing agent shares.

---

## Platform Landscape

### PC

| Platform | Key Characteristics | Revenue Share | Update Process |
|---|---|---|---|
| Steam (Valve) | Largest PC storefront. Community features (reviews, forums, workshop). Seasonal sales drive massive volume spikes. Wishlists are a key pre-launch metric | 30% (sliding to 20% above $50M) | No certification. Developer pushes updates directly. Hotfixes can ship within hours |
| Epic Games Store | Smaller catalogue, aggressive developer terms. Exclusivity deals for timed exclusives | 12% flat | No certification. Similar to Steam |
| GOG | DRM-free focus. Smaller, niche audience. Strong for classic and indie titles | 30% | No certification |

### Console

| Platform | Key Characteristics | Revenue Share | Update Process |
|---|---|---|---|
| PlayStation (Sony) | Largest console install base globally. PS Plus tiers drive engagement. Strong in EU and Japan | 30% | Certification required (TRC). Typically 5-10 business days. Patches need separate cert |
| Xbox (Microsoft) | Game Pass is the dominant strategy. Strong in NA and UK. PC/Xbox cross-buy ecosystem | 30% | Certification required (XR). Typically 5-10 business days. ID@Xbox for indie |
| Nintendo Switch | Unique hybrid form factor. Family audience skew. eShop discoverability is limited | 30% | Certification required. Typically 5-10 business days |

### Mobile

| Platform | Key Characteristics | Revenue Share | Update Process |
|---|---|---|---|
| iOS (Apple App Store) | Premium audience. Higher ARPDAU vs Android. Strict review process. ATT privacy changes reduced UA targeting | 30% (15% for Small Business Programme under $1M/yr) | App Review required. Typically 24-48 hours. Reject rate is non-trivial |
| Android (Google Play) | Largest global install base. Lower ARPDAU but higher volume. More open ecosystem | 30% (15% for first $1M/yr) | Review typically 1-3 days. Less strict than Apple |
| Telegram | Emerging platform. Telegram Mini Apps enable games inside the messaging app. Crypto/TON integration common. Rapidly growing in CIS and emerging markets | Variable (TON ecosystem) | No formal review. Deploy as web app |

### Cross-Platform Considerations

- **Cross-play**: Increasingly expected by players. Technical and business challenges (platform holders resist cross-store purchase recognition)
- **Cross-progression**: Save data that follows the player across platforms. Critical for live games
- **Storefront parity**: Platform holders often require pricing and content parity. Discounting on one platform may require matching on others

---

## Genre Frameworks

### Mobile F2P (Free-to-Play)

**Business model**: Free download, monetised through IAP (in-app purchases) and ads
**Key genres**: Puzzle (Candy Crush), Strategy (Clash of Clans, Clash Royale), RPG (Genshin Impact, AFK Arena), Casual (Subway Surfers), Simulation (Township)
**Consulting relevance**: Economy design, IAP pricing, store layout, retention mechanics, live ops cadence, UA strategy
**Key metrics**: D1/D7/D30 retention, ARPDAU, conversion rate, LTV, CPI, ROAS
**Typical engagement**: IAP pricing review, store optimisation, economy balancing, battle pass design

### MMO / Live Service

**Business model**: Subscription, F2P + cash shop, or hybrid (buy-to-play + cash shop)
**Key titles**: World of Warcraft, Final Fantasy XIV, Guild Wars 2, Elder Scrolls Online, RuneScape
**Consulting relevance**: Content pipeline, raid/dungeon release cadence, economy (virtual currency inflation is a serious problem), community management, guild/social systems, churn at content droughts
**Key metrics**: MAU, concurrent users, subscription retention, content consumption rate, economy health indicators
**Typical engagement**: Live ops strategy, content cadence planning, economy audit, community strategy

### Racing

**Business model**: Premium, premium + DLC, or F2P (mobile)
**Key titles**: Forza Horizon/Motorsport, Gran Turismo, Need for Speed, Mario Kart, Real Racing (mobile)
**Consulting relevance**: DLC strategy, season pass design, vehicle unlock progression, microtransaction design (cosmetics vs performance), esports/competitive structure
**Key metrics**: Depends on model. Premium: attach rate for DLC, completion rate. F2P: standard mobile metrics

### Strategy / Builder (Clash-style)

**Business model**: F2P + IAP (typically timers, speed-ups, premium currency, gacha/chest mechanics)
**Key titles**: Clash of Clans, Clash Royale, Rise of Kingdoms, Lords Mobile, Top War
**Consulting relevance**: Economy design (dual/triple currency systems), progression pacing, alliance/clan mechanics, PvP balancing, whale management, timer economics
**Key metrics**: ARPDAU (often very high), D1/D7/D30 retention, whale concentration, clan activity rates, PvP participation

### Battle Royale

**Business model**: F2P + cosmetic MTX (battle pass is the primary monetisation)
**Key titles**: Fortnite, PUBG, Apex Legends, Warzone
**Consulting relevance**: Battle pass design, seasonal content cadence, cosmetic pipeline, crossover/collaboration strategy, anti-cheat, matchmaking
**Key metrics**: DAU, concurrent, session length, battle pass attach rate, cosmetic conversion

### Premium / Narrative

**Business model**: Upfront purchase, potentially + DLC/expansion
**Key titles**: Baldur's Gate 3, God of War, The Last of Us, Cyberpunk 2077
**Consulting relevance**: Launch strategy, DLC planning, pricing, platform exclusivity deals, review management, post-launch support planning
**Key metrics**: Units sold, review scores (Metacritic/OpenCritic), refund rates, DLC attach rate, completion rate

### Idle / Incremental

**Business model**: F2P + IAP (typically boosters, auto-play, offline earnings multipliers)
**Key titles**: Idle Heroes, AFK Arena, Cookie Clicker, Adventure Capitalist
**Consulting relevance**: Extremely maths-heavy progression systems, prestige mechanics, monetisation through time acceleration, simple UI requiring less art investment
**Key metrics**: D1/D7/D30 retention (often very high D1 but steep falloff), session frequency, IAP conversion

---

## Business Models

| Model | Description | NBI Consulting Angle |
|---|---|---|
| Free-to-Play (F2P) | Free download, monetised via IAP and/or ads | Economy design, pricing, store layout, retention |
| Premium | One-time purchase | Launch strategy, pricing, DLC planning |
| Premium + DLC | Base game purchase + paid content packs | DLC cadence, pricing, attach rate optimisation |
| Subscription | Monthly fee (MMOs, Game Pass) | Retention, content cadence, churn reduction |
| Hybrid | Combination (e.g., buy-to-play + cash shop) | Complex economy balancing, fair monetisation |
| Ad-supported | Revenue from in-game advertising | Ad placement, rewarded ads, frequency capping |

---

## Key Industry Terminology

| Term | Definition |
|---|---|
| GDD | Game Design Document. Describes the game's design: mechanics, systems, narrative, UI |
| TDD | Technical Design Document. Describes the technical implementation of a specific system or feature |
| Live ops | Ongoing content and event delivery for a live game post-launch |
| MTX | Microtransactions. In-game purchases, typically cosmetic or convenience |
| IAP | In-app purchase. The mobile term for MTX |
| ARPDAU | Average Revenue Per Daily Active User |
| ARPPU | Average Revenue Per Paying User |
| LTV | Lifetime Value. Total revenue expected from a player over their lifetime |
| CPI | Cost Per Install. UA metric |
| ROAS | Return on Ad Spend. UA profitability metric |
| UA | User Acquisition. Getting players to download/buy the game |
| ASO | App Store Optimisation. Improving discoverability in mobile app stores |
| DAU/MAU | Daily/Monthly Active Users |
| D1/D7/D30 | Retention at day 1, 7, 30 after install |
| Whale | High-spending player (typically top 1-2% of payers generating 50%+ of revenue) |
| Gacha | Randomised reward mechanic (loot boxes, card packs). Regulated in some jurisdictions |
| Soft launch | Limited market release to test and iterate before global launch |
| Cert/Certification | Console platform review process before a build can be published |
| Greenlight | Internal or publisher decision gate to proceed to the next development phase |
| Crunch | Extended overtime periods, typically before milestones or launch. Industry-wide problem |
| GaaS | Games as a Service. Business model built around ongoing content and monetisation |

---

## NBI's Consulting Positioning in This Landscape

NBI is the only advisory partner that delivers across the full games lifecycle -- from raising capital to live services. The AI team must embody this positioning:

- **Not just analysts.** NBI produces deliverables, not just data. A monetisation review includes the analysis AND the recommended changes AND the projected impact
- **Not just strategists.** NBI implements. A production methodology engagement includes the framework AND the JIRA configuration AND the training for the studio
- **Studio-native.** NBI speaks the language of game developers, not management consultants. "Ship" not "deliver." "Sprint" not "iteration cycle." "Live ops" not "post-launch service management"
- **Cross-functional.** A client's problem rarely fits in one box. A monetisation issue might be caused by a production problem (content cadence too slow) or an org design problem (no economy designer on the team). The AI consulting team must connect the dots

---

*This file provides baseline context. Deep domain knowledge lives in each consulting role's Tier 2 knowledge file. Tactical, client-specific knowledge accumulates through project engagements in Tier 3 and memory files.*
