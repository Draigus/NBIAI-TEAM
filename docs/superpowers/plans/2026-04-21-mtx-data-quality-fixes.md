# MTX Pipeline Data Quality Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 6 data quality issues found in audit, making the CSV match the FINDINGS and eliminating junk rows.

**Architecture:** Three root causes in normalise.js, then doc updates. All fixes are in the normalisation layer; raw data is correct.

**Tech Stack:** Node.js (normalise.js), Markdown (FINDINGS, RED_TEAM, GUIDE)

---

## Root Cause Analysis

| Issue | Root Cause | Fix Location |
|---|---|---|
| 47 NBA 2K battle pass rows | normaliseSteamAPI doesn't filter items without points_amount | normalise.js:66 |
| Rocket League/Valorant 0 amounts | Coin extraction missing `tier.credits` and `tier.vp` fields | normalise.js:145 |
| 239 rows missing tier | NAME_CANON runs AFTER getCompetitorConfig — config lookup uses raw name "EA SPORTS FC 26" which doesn't match config "EA FC 26" | normalise.js:69-74 |
| 239 rows missing monetisation_philosophy | Same root cause as tier — config not found | normalise.js:69-74 |
| GUIDE.md wrong row count | Not updated after multi-currency fix | GUIDE.md:33,73 |
| FINDINGS tables cite data not in CSV | Downstream of Rocket League/Valorant 0-amount bug | Auto-fixes with issue #2 |

---

### Task 1: Fix normalise.js — filter non-currency Steam DLC

**Files:** Modify `scripts/normalise.js:53-99` (normaliseSteamAPI function)

- [ ] **Step 1:** In normaliseSteamAPI, after `if (!item.price_in_cents && item.price_in_cents !== 0) continue;`, add: `if (!item.points_amount) continue;` — skips battle passes, bonus offers, and other non-currency DLC.

- [ ] **Step 2:** Run `node scripts/normalise.js` — NBA 2K25 should drop from 54 to 7 rows (community only). Total should drop by 47.

### Task 2: Fix normalise.js — canonicalise before config lookup

**Files:** Modify `scripts/normalise.js:66-74` (normaliseSteamAPI function)

- [ ] **Step 1:** Move `const canonName = NAME_CANON[rawName] || rawName;` BEFORE the `getCompetitorConfig` call. Pass `canonName` to `getCompetitorConfig` instead of `rawName`.

- [ ] **Step 2:** Add `'NBA 2K25 (2K Games)': 'NBA 2K25'` to NAME_CANON (already exists). Verify "NBA 2K25" matches config "NBA 2K26" via the regex fallback... it won't because regex is broken for "2K26". Add `'NBA 2K25': 'NBA 2K25'` entry to competitors.json as a separate competitor (tier 2, gacha_power) OR fix the regex.

**Decision:** Add "NBA 2K25" as an alias lookup. Simplest: add to NAME_CANON `'NBA 2K25': 'NBA 2K25'` (identity, just for config lookup) and update getCompetitorConfig to also try partial word matching. Actually simpler: just ensure the config lookup works by adding a NAME_CANON entry that maps to the config name: the config has "NBA 2K26", so `'NBA 2K25': 'NBA 2K25'` won't help. Instead, update competitors.json to use "NBA 2K25" as name (since the data IS 2K25), or add a second entry.

**Cleanest fix:** Add `aliases` support or just change the config name from "NBA 2K26" to "NBA 2K25" since that's what the actual data represents.

- [ ] **Step 3:** Run normalise.js — all rows should now have tier and monetisation_philosophy populated.

### Task 3: Fix normalise.js — add credits/vp to coin extraction

**Files:** Modify `scripts/normalise.js:145` (normaliseCommunityData function)

- [ ] **Step 1:** Add `tier.credits` and `tier.vp` to the coin extraction chain.

- [ ] **Step 2:** Run normalise.js — Rocket League should show 500/1100/3000/6500, Valorant should show 475/1000/2050/3650/5350/11000.

### Task 4: Run pipeline + verify

- [ ] **Step 1:** Run `node scripts/normalise.js` — check total rows, per-competitor summary
- [ ] **Step 2:** Run `node scripts/verify.js` — must PASS
- [ ] **Step 3:** Run `node scripts/output-export.js` — 8 files
- [ ] **Step 4:** Spot-check CSV: grep for Rocket League, Valorant, NBA 2K25, EA FC 26 — verify tier, hc_amount, monetisation_philosophy populated

### Task 5: Update GUIDE.md row count

- [ ] **Step 1:** Update line 33 and 73 with actual row count from Task 4

### Task 6: Update FINDINGS + RED_TEAM row counts

- [ ] **Step 1:** Update FINDINGS header data coverage line
- [ ] **Step 2:** Update RED_TEAM verification stats
- [ ] **Step 3:** Verify FINDINGS Section 1 tables now match CSV data

### Task 7: Update session log

- [ ] **Step 1:** Append all fixes to session log
