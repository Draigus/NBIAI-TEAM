# HANDOFF — Goals Studio Plan Integrity Fix (In Progress)

**Date:** 2026-04-21
**Session:** Fix fabrications in Goals Studio pricing plan, re-estimate hours, update WorkSage + Excel
**Previous handoff:** Goals Competitive MTX Scraping Pipeline (separate workstream, still valid)

---

## What Was Done This Session

### 1. Full Audit of Plan Document

Audited `docs/superpowers/plans/2026-04-21-goals-studio-pricing-plan.md` against all client materials (15+ docs in `Clients/Goals/`). Found 5 RED issues (fabricated/wrong), 4 AMBER (unverifiable), 1 YELLOW (data discrepancy).

### 2. Fixes Applied to Plan (Partial — See Remaining Below)

**Completed fixes:**
- Removed "NBI's risk framework" — replaced with methodology derived from Goals' own matrix flags
- Removed ALL "27 game launches" / "NBI portfolio data" references — replaced with specific research methods (EA/Konami quarterly reports, SteamDB, Sensor Tower, GDC publications)
- Fixed Epic revenue: 40% → ~26% with correct maths ($5.27 vs $4.19)
- Fixed kit pricing: 16,000 pts/320 coins → 16,625 pts/~333 coins with source (Content Plan sheet)
- Flagged Mech/Pulse HC pricing as GAP (not in any client doc, needs Julius)
- Removed "Glen to provide from experience" pattern everywhere — replaced with executable research methods
- Updated budget table: 50h → ~116h with team split (Glen 45h, Devin 50h, Tom 20h)
- Updated hours for: T1.0.1 (2→3h), T1.0.2 (2→5h), T1.1.1 (2.5→8h), T1.1.2 (1.5→4h), T1.1.3 (2→5h), T1.1.4 (1→2h), T1.2.1 (3→8h), T1.3.1 (2→5h), T2.1.1 (3→8h), T2.1.2 (3.5→15h)

### 3. Hour Re-Estimation (Completed in Conversation)

Presented full breakdown to Glen with rationale. Total revised estimate: ~116h. Glen confirmed 50h was "ridiculously off."

### 4. Critical Questions List (Presented to Glen, Not Filed)

23 questions whose answers are NOT in existing materials. Grouped by: Competitive Intelligence Gaps (Q1-4), Goals Internal Decisions (Q5-9), Economy Design Gaps (Q10-13), Revenue Model Assumptions (Q14-16), Platform/Technical Constraints (Q17-19), Strategic Context (Q20-23). See session log for full list.

---

## What Still Needs Doing (In Priority Order)

### A. Finish Plan Hour Updates (10 edits remaining)

These tasks still show old hour estimates in the plan document:
- T2.2.1: 1.5h → 3h
- T2.3.1: 3h → 8h
- T3.2.1: 2h → 5h
- T3.3.1: 2.5h → 7h
- T4.1.1: 1.5h → 3h
- T4.2.1: 1h → 2h
- T4.3.1: 1.5h → 3h
- T5.1.1: 3h → 10h
- T5.2.1: 1.5h → 4h
- T5.3.1: 2h → 4h

### B. Rewrite Execution Timeline Section

End of plan doc still shows old 5-day/10h-per-day schedule. Needs rewrite to reflect 116h/team allocation reality.

### C. Validate Plan Against Games/Domain Knowledge

Glen's directive: "validate against the team and games and so on." Use /games skill and gaming industry knowledge to check:
- Is the competitive set appropriate for a non-seasonal F2P football game?
- Is the economy analysis approach sound?
- Are there domain-specific issues not caught in the text audit?
- Does the seasonal vs non-seasonal distinction get proper treatment?

### D. Flag 50% D1 Retention Discrepancy

In spec (`docs/superpowers/specs/2026-04-21-goals-studio-pricing-engagement.md` line 16): "50% D1 retention on PlayStation." Town Hall data (Goals' own internal data, March 26) shows PS5 at 34%, overall beta at 36%. The 50% originates from the OLD SOW proposal (31 March, written by NBI/Tom). Needs either verification from Jonas or correction.

### E. Update WorkSage Tasks via API

All 43 tasks need PATCH updates at `http://localhost:8888/api/tasks/:id`:
- Update `estimated_hours` on all 22 leaf tasks
- Update `description` on tasks with fabricated content (T1.0.1, T1.0.2, T1.1.4, T2.1.1 especially)
- Update `success_factor` where it references fabricated sources

Client ID: `6975460f-c302-42c5-a586-1d04c5fcb929`

To find task IDs, query: `GET /api/tasks?client_id=6975460f-c302-42c5-a586-1d04c5fcb929`

### F. Regenerate Excel

File: `Clients/Goals/goals_pricing_engagement_plan.xlsx`
Script: `scripts/update_goals_fields.py` — modify with corrected data and re-run.
Needs: corrected hours, updated descriptions, revised timeline.

### G. Save Critical Questions to File

Save the 23 questions to `Clients/Goals/critical_questions.md` for tracking. Key blockers for Julius (needed IMMEDIATELY):
- Q5: Which discount curve proposal is final? (56%, 48%, 30%, or 19%)
- Q6: When exactly does pricing need to be submitted to Sony/Xbox?
- Q7: Has any pricing test been submitted previously?
- Q8: What items are in the Day 1 store?

---

## Glen's Directives (This Session — Non-Negotiable)

1. **No fabricated authority.** "NBI's framework", "27-game history", invented credentials = lying to the client.
2. **No "Glen to provide."** Every data point needs a verifiable source or a specific, executable research method. Not "Glen will know this."
3. **Hours must be realistic.** 50h for 116h of work is setting the team up to fail.
4. **All changes flow through.** Plan doc → WorkSage tasks → Excel. All three must be consistent.
5. **Validate before claiming done.** Use games/team/skills to verify domain accuracy.

---

## Key Files

| What | Where |
|---|---|
| Plan (being fixed) | `docs/superpowers/plans/2026-04-21-goals-studio-pricing-plan.md` |
| Spec | `docs/superpowers/specs/2026-04-21-goals-studio-pricing-engagement.md` |
| Client docs (15+) | `Clients/Goals/` |
| SOW | `Clients/Goals/sow_proposal.md` |
| Excel (needs regen) | `Clients/Goals/goals_pricing_engagement_plan.xlsx` |
| Import script | `scripts/import_goals_project.py` |
| Update script | `scripts/update_goals_fields.py` |
| Session log | `projects/nbi_dashboard/session_logs/2026-04-21_session_goals_studio.md` |
| Competitive research config | `Clients/Goals/competitive_research/config/regions.json` |

---

## Parallel Workstream Note

The competitive MTX scraping pipeline is a SEPARATE but RELATED workstream. It provides the data that Tasks T1.1.1, T2.1.2 need.

**STATUS: PIPELINE COMPLETE (Wave 1).** As of 2026-04-21 ~05:00:

- **365 normalised rows** across 13 competitors + EA FC 25 (YoY comparison)
- **147 citations** indexed with source URLs and capture dates
- **Verification: PASS** (0 critical issues)
- **Longitudinal data captured:** 8 years of EA FC/FIFA Points pricing history
- **All scripts re-runnable** for future data refresh

**Key findings already available for deliverable:**
1. EA has NEVER raised USD prices on existing FC Points tiers (restructure ceiling instead)
2. UFL pricing mirrors EA FC Points exactly (deliberate benchmarking)
3. Fortnite stealth price increase March 2026 via quantity reduction (~20-25%)
4. Valorant modest volume discount (13.3%) but aggressive per-item pricing ($25-75/skin)
5. NBA 2K has steepest volume discount in the set (46% at top tier)
6. Industry pattern: publishers avoid direct USD increases, prefer tier restructuring

**Files:**
- Spec: `docs/superpowers/specs/2026-04-21-goals-competitive-mtx-scraping-pipeline.md`
- Plan: `docs/superpowers/plans/2026-04-21-goals-competitive-mtx-scraping-pipeline.md`
- Data: `Clients/Goals/competitive_research/` (config/, scripts/, raw/, normalised/, output/)
- Output ready for Google Sheets: `Clients/Goals/competitive_research/output/` (6 files)

**Remaining gaps (not blocking deliverable):**
- NHL 25 / MLB The Show: console-only, not on Steam (need PSPrices scraping for full regional)
- Madden MUT Points: confirmed in-game only, community data captured (USD only)
- EA FC Mobile mid-tier pricing: some interpolated values (need direct store access to confirm)
- Full regional pricing for community-sourced titles (currently USD baseline + partial GBP/EUR/BRL)

---

## PM2 Process List (Current)

| ID | Name | Status | Port |
|----|------|--------|------|
| 0 | nbi-news | online | — |
| 1 | nbi-dashboard | online | 8888 |
| 2 | nbi-dashboard-staging | online | 8887 |
| 3 | context-monitor | online | — |
| 4 | cloudflare-tunnel | online | — |
