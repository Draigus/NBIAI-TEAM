# Competitive MTX Pricing Research — Key Findings

**Generated:** 2026-04-21 (updated post-red-team review)
**Data coverage:** 12 competitors, 356 normalised price points, 147 citations
**Verification:** PASS (0 critical, 0 high, 0 medium issues)

---

## Methodology

**Data sources:** Steam Store API (primary, 299 rows across 12 regions) and community trackers/store pages (secondary, 57 rows, USD only). All data captured on 2026-04-21 — a single-day snapshot. Longitudinal data (EA FC Points 2018-2026) sourced from fifauteam.com and fifplay.com archives.

**Coverage skew:** EA-published titles (FC 26, FC 25, F1 24, Madden, Apex) account for 74% of rows due to Steam API regional coverage. Non-EA competitors have USD-only community data. This reflects data availability, not analytical weighting — cross-competitor comparisons in this document use USD baseline figures throughout.

**EA FC 25 inclusion:** 96 rows of EA FC 25 regional pricing are included for year-on-year comparison, not as a current competitor. In spreadsheet analysis, filter by competitor name to separate current vs historical data.

**Console-only gaps:** NHL 25 and MLB The Show 25 are console-exclusive with no Steam DLC. Their pricing is not captured in this dataset. This is expected and does not affect the analysis (both are Tier 3 context-only titles).

### Source Key

All claims in this document are traceable to the following source files. Inline references use the short key in brackets.

| Key | Source File | Type | Coverage |
|---|---|---|---|
| [S-FC26] | `raw/steam_api/3405690_ea_fc_26.json` | Steam Store API | EA FC 26, 12 regions |
| [S-FC25] | `raw/steam_api/2669320_ea_fc_25.json` | Steam Store API | EA FC 25, 12 regions |
| [S-F1] | `raw/steam_api/2488620_f1_24.json` | Steam Store API | F1 24 PitCoins, 12 regions |
| [S-NBA] | `raw/steam_api/2878980_nba_2k25.json` | Steam Store API | NBA 2K25, 12 regions |
| [C-APEX] | `raw/community/apex_item_store_2026-04-21.json` | Community tracker | Apex Legends coins + shop |
| [C-FN] | `raw/community/fortnite_gg_shop_2026-04-21.json` | Community tracker | Fortnite V-Bucks + shop |
| [C-UFL] | `raw/community/ufl_pricing_research_2026-04-21.json` | Multi-source research | UFL LP/CP tiers, 28 URLs |
| [C-MAD] | `raw/community/madden_mut_pricing_2026-04-21.json` | Xbox/PS Store | Madden Points, 8 tiers |
| [C-VAL] | `raw/community/valorant_pricing_2026-04-21.json` | Community tracker | Valorant VP tiers |
| [C-RL] | `raw/community/rocket_league_pricing_2026-04-21.json` | Community tracker | Rocket League credits |
| [C-EF] | `raw/community/efootball_pricing_2026-04-21.json` | Community tracker | eFootball coins |
| [C-FCM] | `raw/community/ea_fc_mobile_pricing_2026-04-21.json` | Community tracker | EA FC Mobile |
| [L-EA] | `raw/steamdb/pricing_history_ea_fc_longitudinal.json` | Historical archive | EA FC/FIFA Points 2018-2026 |
| [L-CHG] | `raw/steamdb/competitor_price_changes.json` | Historical archive | Cross-competitor price changes |

---

## 1. HC Pack Pricing Benchmarks (USD)

### Entry-Level Tier ($0.99-$4.99)

| Competitor | Smallest Pack | Price | HC/$ | Source |
|---|---|---|---|---|
| EA FC 26 | 100 FC Points | $0.99 | 101 | [S-FC26] |
| EA FC Mobile | 40 FC Points | $0.39 | 103 | [C-FCM] |
| UFL | 100 LP | $0.99 | 101 | [C-UFL] |
| eFootball | 100 coins | $0.99 | 101 | [C-EF] |
| Fortnite | 50 V-Bucks | $0.99 | 51 | [C-FN] |
| Apex Legends | 500 coins | $4.99 | 100 | [C-APEX] |
| Rocket League | 500 credits | $4.99 | 100 | [C-RL] |
| Valorant | 475 VP | $4.99 | 95 | [C-VAL] |
| NBA 2K25 | 5,000 VC | $1.99 | 2,513 | [S-NBA] |
| Madden NFL 25 | 500 points | $4.99 | 100 | [C-MAD] |
| F1 24 | 2,000 PitCoins | $1.99 | 1,005 | [S-F1] |

**Observation:** Most games cluster at $0.99 or $4.99 entry points. EA FC, UFL, and eFootball are identical at 100 HC/$0.99. Fortnite's $0.99/50 VB "Exact Amount Pack" is a convenience micro-pack, not a standard entry tier; its practical entry point is $8.99/800 VB.

### Top Tier ($79.99-$149.99)

| Competitor | Largest Pack | Price | HC/$ | Volume Discount vs Entry | Source |
|---|---|---|---|---|---|
| EA FC 26 | 18,500 FC Points | $149.99 | 123 | ~22% | [S-FC26] |
| UFL | 9,500 LP | $79.99 | 119 | ~18% | [C-UFL] |
| eFootball | 12,000 coins | $99.99 | 120 | ~19% | [C-EF] |
| Fortnite | 12,500 V-Bucks | $89.99 | 139 | ~56% (vs $8.99/800 VB base tier) | [C-FN] |
| Apex Legends | 11,500 coins | $99.99 | 115 | ~15% | [C-APEX] |
| Rocket League | 6,500 credits | $49.99 | 130 | ~30% | [C-RL] |
| Valorant | 11,000 VP | $99.99 | 110 | ~16% | [C-VAL] |
| NBA 2K25 | 700,000 VC | $149.99 | 4,667 | ~86% | [S-NBA] |
| Madden NFL 25 | 18,500 points | $149.99 | 123 | ~23% | [C-MAD] |

**Observation:** Volume discounts cluster in 15-23% range for most titles. NBA 2K is the outlier (86% — extremely steep curve). Fortnite's 56% discount (measured against its practical $8.99 base tier, not the $0.99 micro-pack) sits between the cluster and NBA 2K. Madden and EA FC are nearly identical (confirming EA's consistent cross-sport pricing). UFL's discount curve (18%) is slightly below EA FC's (22%).

---

## 2. EA Cross-Sport Pricing Consistency

EA FC and Madden use **near-identical pricing structures** — same price points, same tier amounts (with minor variation) [S-FC26] [C-MAD]:

| Price Point | EA FC 26 | Madden 25 |
|---|---|---|
| $4.99 | 500 pts | 500 pts |
| $9.99 | 1,050 pts | 1,050 pts |
| $14.99 | 1,600 pts | 1,600 pts |
| $24.99 | 2,800 pts | 2,800 pts |
| $49.99 | 5,900 pts | 5,850 pts |
| $74.99 | — | 8,900 pts |
| $99.99 | 12,000 pts | 12,000 pts |
| $149.99 | 18,500 pts | 18,500 pts |

Differences: Madden has a $74.99 tier that EA FC lacks. Madden has no $0.99/100-point entry tier. At $49.99, Madden gives 5,850 points vs EA FC's 5,900 (50 points less). [C-MAD]

**F1 24 (PitCoins) uses different price points entirely:** $1.99/2K, $4.19/5K, $8.99/11K, $18.99/24K, $34.99/50K [S-F1]. F1 shares the same design philosophy (tiered currency packs with volume discounts) but at dramatically lower price points than FC/Madden. This likely reflects F1's smaller in-game economy and lower average transaction expectations.

**Implication for Goals:** EA FC and Madden pricing is a deliberate cross-portfolio strategy — tested and optimised. F1 shows EA adapts the structure's price scale to the game's economy size, not a one-size-fits-all approach. Goals should benchmark against EA FC/Madden (same genre, same spend profile), not F1.

---

## 3. Longitudinal Trends (EA FC Points 2018-2026) [L-EA]

- **FIFA 19:** 8 tiers, max $39.99 (4,600 pts) [L-EA, yearly_data[0]]
- **FIFA 20-22:** 9 tiers, added 12,000 tier at $99.99 [L-EA, yearly_data[1-3]]
- **FIFA 23-FC 26:** 8 tiers, current structure (max $149.99 for 18,500 pts) [L-EA, yearly_data[4-7]]

**EA has NEVER increased the USD price of an existing tier** [L-EA, key_findings]. Their strategy:
1. Add higher-ceiling tiers (pushing max from $39.99 → $99.99 → $149.99) [L-EA, evolution_summary]
2. Restructure mid-range tiers (removed 250/750/2200/4600, added 2800/5900/18500) [L-EA, yearly_data[4], structural_changes]
3. Raise non-USD currencies when FX moves against them (GBP, AUD, CAD adjusted June 2023) [L-EA, yearly_data[4], mid_year_change_details]

**Implication for Goals:** "Start slightly high" philosophy is validated. EA demonstrates you CAN add new tiers later but you CANNOT raise existing tier prices.

---

## 4. UFL — Closest Direct Competitor [C-UFL]

UFL's pricing **matches EA FC at the entry level, then diverges** [C-UFL, lp_purchase_tiers]:
- 6 LP tiers: 100/$0.99 through 9,500/$79.99
- First 3 tiers match EA FC exactly (100/$0.99, 500/$4.99, 1,050/$9.99) [C-UFL vs S-FC26]
- Tiers 4-6 diverge: UFL jumps to $19.99/2,150 LP, $39.99/4,500 LP, $79.99/9,500 LP — whereas EA FC has $14.99/1,600, $24.99/2,800, $49.99/5,900 at equivalent positions
- UFL uses fewer, wider-spaced upper tiers — covering $0.99-$79.99 in 6 tiers vs EA FC's $0.99-$149.99 in 8 tiers
- Volume discount curve (18%) slightly below EA FC (22%) [C-UFL, lp_per_dollar_analysis]

**UFL's economy changed significantly in Season 25-26** (Sep 2025) [C-UFL, monetisation_model + release_timeline]:
- Moved from skin upgrades to pack-based card acquisition
- Now closer to EA FC Ultimate Team model
- Added Legendary tier cards, Mastery progression
- Team Pass (battle pass): 1,000 LP (~$9.99) standard, 2,000 LP (~$19.99) elite [C-UFL, team_pass_pricing]

**Implication for Goals:** UFL priced at or slightly below EA FC. Goals should price at parity or slightly above UFL (since Goals has the "new, non-P2W" positioning advantage).

---

## 5. F2P Cosmetic Pricing Ceiling (Valorant) [C-VAL]

Valorant represents the **upper bound** of what competitive F2P players accept for cosmetics [C-VAL, item_shop_pricing]:
- Individual skins: $15-25 (Select to Deluxe editions)
- Premium skins: $25-50 (Premium/Exclusive editions)
- Ultra-tier bundles: $70-100+
- Volume discount on VP: only 13.5% at max tier (deliberately NOT rewarding bulk buys) [C-VAL, discount_progression]

**Implication for Goals:** If Goals' cosmetics (kits, celebrations) are priced in the $3-7 range (as their internal model shows), they are positioned well BELOW the proven ceiling. Room exists to go higher if cosmetic quality warrants it.

---

## 6. Industry Pricing Change Patterns [L-EA] [L-CHG] [C-FN]

| Publisher | Strategy for Price Increases | Example | Source |
|---|---|---|---|
| EA | Raise ceiling, restructure tiers, adjust non-USD currencies | 18,500 tier added FIFA 23; GBP raised June 2023 | [L-EA] |
| Epic (Fortnite) | Keep $ price, reduce HC quantity (publicly announced) | March 2026: reductions ranged from 7% ($89.99 tier) to 20% ($8.99 tier); $44.99 tier unchanged | [C-FN] |
| Riot (Valorant) | No changes to VP pricing; raise item prices in VP instead | Skin bundle prices have increased over time | [C-VAL] |
| Respawn (Apex) | Adjust non-USD only; decouple Battle Pass from premium currency | June 2023 regional; Season 22 pass change | [C-APEX] [L-CHG] |
| 2K (NBA) | No documented USD changes; rely on new modes to expand spend surface | VC consistent but cross-mode spending grows | [S-NBA] [L-CHG] |

**Universal pattern:** No publisher in this dataset has raised the USD sticker price on a currency pack [L-CHG]. They restructure tiers, add new ceiling tiers, reduce currency quantities, or raise non-USD regional currencies instead.

**Implication for Goals:** Once you set a USD price tier, it is functionally permanent. Jonas's instinct ("cannot raise prices post-launch") is correct and supported by every competitor's behaviour.

---

## 7. Platform Observations [S-FC26] [S-F1]

- **Turkey:** Multiple games (EA FC, F1) price in USD rather than TRY (no regional discount) [S-FC26, region=tr] [S-F1, region=tr]
- **Sweden:** EA FC prices in EUR on Steam (not SEK) [S-FC26, region=se]
- **Korea:** EA FC 26 geo-restricted (no pricing data returned) [S-FC26, region=kr]
- **Indonesia:** All titles have pricing available (large market, all platforms serve it) [S-FC26, region=id]
- **Console vs PC:** EA FC pricing is identical across Steam/PS/Xbox in the same region [S-FC26 vs C-UFL, cross-platform note]

---

## 8. Gaps, Confidence Notes, and Citation Health

### Data Gaps

| Gap | Impact | Workaround |
|---|---|---|
| NHL/MLB pricing | Low (Tier 3, context only) | Console-only; need PSPrices scraping |
| Madden regional pricing | Low | Community data confirms USD identical to EA FC |
| EA FC Mobile mid-tier exact prices | Medium | Endpoints confirmed, mid-tiers interpolated |
| UFL full GBP/EUR tier pricing | Medium | USD confirmed; GBP starter packs found (£3.99-£32.99) |
| All community data is USD-primary | Medium for regional analysis | Steam API covers 12 regions for EA titles; others need store access |

### Citation Health (verified 2026-04-21)

6 of 10 highest-impact citation URLs verified live with matching content. Issues found:

| Citation | Status | Action |
|---|---|---|
| fortnite.com V-Bucks repricing announcement | 403 (removed/gated) | Claim supported by gamerant.com, talkesport.com, lootbar.gg coverage (all in citation index) |
| ea.com FIFA 23 pricing update | Content overwritten with FC 26 material | Claim supported by dexerto.com, earlygame.com coverage (both in citation index) |
| apexitemstore.com | 403 (possible anti-bot) | Apex data also sourced from apexlegends.fandom.com and wiki.gg (both in citation index) |

All affected claims have at least two independent backup citations in the citation index. No findings depend solely on a dead URL.

---

## 9. Cross-Reference: NBI Findings vs Goals' Internal Pricing

Goals' own pricing matrix (`GOALS Pricing Matrix (8).xlsx`) defines a 6-tier HC structure. Cross-referencing against this dataset:

| Dimension | Goals (Internal) | Industry Benchmark (This Dataset) | Assessment |
|---|---|---|---|
| Number of tiers | 6 | 6-8 (EA FC: 8, UFL: 6, Madden: 8) | Within range |
| Entry price | **$5.99** / 380 HC | **$0.99** / 100 HC (EA FC, UFL, eFootball) | **Gap: Goals has no micro-entry tier.** Every football competitor offers $0.99. |
| Top tier | $99.99 / 7,750 HC | $79.99-$149.99 (UFL: $79.99, EA FC: $149.99) | Within range; between UFL and EA FC |
| Volume discount | ~22% (63.4 HC/$ entry → 77.5 HC/$ top) | 15-23% cluster | Aligned with industry norm |
| Regional coverage | 40+ countries (Sony + Xbox pricing) | 12 Steam regions (EA titles) | Goals has broader regional coverage than this dataset |
| Regional strategy | Benchmarks against EA FC + Arc Raiders per region | EA FC is the industry standard template [S-FC26] | Aligned |
| HC/$ at entry | 63.4 HC/$ ($5.99/380) | 95-101 HC/$ (EA FC, UFL, Valorant at $4.99-$0.99) | Goals' effective rate is lower, but different price point |

**Key finding from cross-reference:** Goals' pricing aligns with industry norms on volume discount curve (22%) and regional strategy (EA FC template). The notable gap is the absence of a $0.99 micro-entry tier, which every direct football competitor (EA FC [S-FC26], UFL [C-UFL], eFootball [C-EF]) offers as a low-friction first purchase.

---

## 10. Data Observations (for deliverable discussion)

The following observations emerge from the data. They are not pricing recommendations — pricing decisions require additional inputs (willingness-to-pay research, player demographics, Goals' revenue model, regional launch strategy) that are outside this dataset's scope.

**Scope note:** This benchmark covers hard currency (HC) pack pricing only. Two economy design topics are not addressed here but matter for Goals' full monetisation strategy: (a) soft currency purchasing (e.g. UFL's CP packs at $0.99-$8.99 [C-UFL, cp_purchase_tiers]) and (b) the interaction between Goals' "80/20 skill-to-purchased-advantage" positioning and its HC pricing — a unique position between EA FC's full gacha power and Fortnite/Valorant's pure cosmetic models.

1. **The market anchor for football MTX pricing is EA FC's tier structure.** UFL's entry tiers already match it [C-UFL vs S-FC26]. Other football titles (eFootball) cluster around the same entry points [C-EF].
2. **Volume discount curves in the genre cluster at 15-23%** at the max tier [Section 1 top-tier table]. NBA 2K (86%) is the outlier [S-NBA]; most titles stay conservative.
3. **The $0.99/100 HC entry point is the genre standard** — used by EA FC [S-FC26], UFL [C-UFL], and eFootball [C-EF]. Apex and Rocket League start at $4.99 [C-APEX] [C-RL].
4. **USD prices on currency packs are functionally permanent.** Every competitor in this dataset has found ways to adjust value rather than raise USD sticker prices [L-EA] [L-CHG] [C-FN]. Jonas's instinct on this is well-supported.
5. **EA FC's regional pricing matrix is the most data-rich template** in the genre, covering 12 Steam regions with consistent cross-platform parity [S-FC26, 96 rows across 12 regions].
6. **Ceiling tiers can be added later.** EA FC demonstrated this by adding the $99.99 tier in FIFA 20 and the $149.99 tier in FIFA 23, without disrupting existing tiers [L-EA, evolution_summary].
