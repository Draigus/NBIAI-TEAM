# HANDOFF — Goals MTX Pipeline Red Team Complete

**Date:** 2026-04-21
**Session:** Red team, source cross-validation, remediation, domain review, cross-reference
**Commits this session:** `19debee`, `39e4435`, `13607ae`

---

## What Was Done

### 1. Red Team + Source Cross-Validation
- Read all 7 output files and all raw source JSONs
- Cross-validated 4 key claims against raw data (EA never raised USD, UFL mirrors EA FC, Fortnite stealth increase, Madden identical to EA FC)
- Identified 3 critical, 5 high, 5 medium, 3 low issues
- **Original score: 53/100**

### 2. Remediation (all critical + high fixed)
- **normalise.js:** Added `REGION_CURRENCY` map (infer currency from Steam region), `NAME_CANON` map (canonicalise competitor names), exclude stale FUT.gg FC Points tiers, added `lp_amount`/`v_bucks` field extraction, soft currency SKU type detection prep
- **FINDINGS_SUMMARY.md:** Rewrote fabricated F1 table with verified data, corrected UFL "maps 1:1" claim, corrected Fortnite reduction range and removed "stealth" editorialising, recalculated Fortnite volume discount, relabelled Section 9 as "Data Observations", added methodology section, added Source Key table with inline citations on every claim across all 10 sections
- **cross_competitor_comparison.json:** Corrected Fortnite reduction range in two locations
- **competitors.json:** F1 monetisation_philosophy corrected to `cosmetic_plus_progression`

### 3. Domain Review
- Loaded `game-economy-design` skill — validated pricing benchmarks against two-currency model, price anchoring, power-selling principles
- Loaded `balance-check` reference skill — competitive set validated for economy balance domain
- Loaded `gi` skill with quality gate — comp table passed GI Output Quality Gate, no anti-patterns triggered
- Added scope notes for soft currency gap and power-to-cosmetic ratio

### 4. Citation Work
- Added Source Key table mapping 14 raw data files to short keys ([S-FC26], [C-UFL], [L-EA], etc.)
- Added inline source citations to every claim in all 10 sections of FINDINGS_SUMMARY.md
- Live-verified 10 highest-impact citation URLs (6 live, 3 dead with backup citations documented, 1 auth-gated)
- Spot-checked all numerical claims against raw JSON files personally

### 5. Cross-Reference vs Goals' Internal Data
- Read `goals_pricing_matrix.md` (from GOALS Pricing Matrix (8).xlsx)
- Goals has 6 HC tiers: 380/$5.99 through 7,750/$99.99 across 40+ countries
- Added Section 9 cross-reference table comparing Goals' structure against NBI findings
- **Key finding:** Goals missing $0.99 micro-entry tier that every football competitor offers
- Goals' 22% volume discount aligns with industry 15-23% cluster

### 6. Guide Written
- `Clients/Goals/competitive_research/GUIDE.md` — how to read findings, use CSV, re-run pipeline, add competitors

---

## Final State

| Metric | Value |
|---|---|
| Score | 53 → 86+ (post cross-reference, not formally re-scored) |
| Normalised rows | 356 |
| Competitors | 12 (canonical names) |
| Empty price_usd | 0 |
| Verification | PASS (0 critical/high/medium, 2 low expected gaps) |
| Citations | 147 indexed, 10 live-verified |
| Sections with inline citations | 10/10 |
| Commits | 3 this session |

---

## File Locations

| What | Where |
|---|---|
| Findings (main deliverable) | `Clients/Goals/competitive_research/output/FINDINGS_SUMMARY.md` |
| Red team report | `Clients/Goals/competitive_research/output/RED_TEAM_REPORT.md` |
| Usage guide | `Clients/Goals/competitive_research/GUIDE.md` |
| CSV (for Sheets) | `Clients/Goals/competitive_research/output/current_snapshot.csv` |
| Citations index | `Clients/Goals/competitive_research/output/citations.csv` |
| Normalise script | `Clients/Goals/competitive_research/scripts/normalise.js` |
| Verify script | `Clients/Goals/competitive_research/scripts/verify.js` |
| Export script | `Clients/Goals/competitive_research/scripts/output-export.js` |
| Goals internal pricing | `Clients/Goals/goals_pricing_matrix.md` |
| Goals pricing model | `Clients/Goals/pricing_model_fresh.md` |
| Session log | `projects/nbi_dashboard/session_logs/2026-04-21_session_red_team.md` |

---

## What Remains

### Would push score to 90+
1. **Multi-currency normalisation** — normalise.js only extracts one currency type per community JSON file. UFL has LP (hard) + CP (soft) tiers in the same file; only LP comes through. Need to iterate over all `*_purchase_tiers` keys.
2. **Formal re-score** after cross-reference section was added — the Goals internal data cross-reference materially strengthens analytical rigour but the RED_TEAM_REPORT scoring wasn't updated to reflect it.

### Nice to have
3. **Live store verification via browser** — use `agent-browser` to screenshot current PS Store / Steam Store prices for top 5 competitors
4. **Regional pricing comparison** — cross-reference Goals' 40-country pricing matrix against EA FC's 12-region Steam pricing to find over/under-priced regions
5. **Soft currency benchmark section** — once multi-currency normalisation works, add UFL CP pricing comparison to findings

---

## Git Log (This Session)

```
13607ae feat(goals): cross-reference vs Goals internal pricing + SC prep
39e4435 docs(goals): competitive MTX pipeline usage guide
19debee fix(goals): red team remediation — MTX pipeline score 53 → 86
```

## Previous Session Commits (pipeline build)
```
e53aee2 docs: final handoff — pipeline complete, red team next session
41bbcc2 docs(goals): competitive MTX findings summary for deliverable
8bf2d7e feat(goals): complete MTX pipeline — verification + output export
```
