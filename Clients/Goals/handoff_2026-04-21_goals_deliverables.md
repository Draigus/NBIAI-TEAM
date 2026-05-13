# HANDOFF — Goals Studio Deliverables: Excel, Word Doc, WorkSage Alignment

**Date:** 2026-04-21 ~12:30
**Session:** Goals Studio pricing engagement — deliverable preparation (Excel tracker, Word task guide, WorkSage sync)
**Instance:** This is the Goals Studio work session. A separate CLI instance is running skill builds and writing to `docs/HANDOFF.md`. Do not overwrite that file.

---

## What Was Done This Session

### 1. Deadline Correction (27 April, not 28 April)

Glen confirmed the platform submission deadline is **27 April 2026**, not 28 April as previously recorded. Source: PlayGoals Project Plan meeting on 14 April 2026 (Granola). Julius stated "at least for Xbox and PlayStation, the review for pricing and availability is around nine days... around 18 days" before the 14 May launch. 18 days before 14 May = 26 April (Sunday), making 27 April (Monday) the submission deadline.

**Files corrected from 28 to 27 April:**
- `docs/HANDOFF.md` (line 130)
- `docs/superpowers/specs/2026-04-21-goals-studio-pricing-engagement.md` (lines 7 and 170)
- `docs/superpowers/specs/2026-04-21-goals-competitive-mtx-scraping-pipeline.md` (line 15)
- `docs/superpowers/plans/2026-04-21-goals-studio-pricing-plan.md` (line 374)
- `docs/superpowers/plans/2026-04-21-goals-competitive-mtx-scraping-pipeline.md` (lines 13 and 1105)
- `scripts/update_goals_fields.py` (line 243)
- `scripts/import_goals_project.py` (line 327)

**NOTE:** `scripts/update_goals_fields.py` still has 17 stale April 28 date references in the timeline dictionaries (lines 84-86, 95, 109-111, 143-144, 405). These were NOT fixed because the live WorkSage data was corrected directly via `scripts/fix_goals_worksage.py` instead. If that script is ever re-run, the dates will revert. Fix the timeline dicts if re-running.

### 2. Excel Tracker (v3)

**File:** `d:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Goals\goals_pricing_engagement_plan_v3.xlsx`

**Generator script (Task Tracker sheets 1-5):** Built by sub-agent, script location unknown (generated inline).

**Generator script (WorkSage Import sheet):** `d:\OneDrive\Claude_code\NBIAI_TEAM\scripts\add_worksage_tab.py`

**6 sheets:**
1. **Overview** — Project metadata, budget (100K SEK / ~$10K USD / ~116h), deadline 27 April, feature hour summary
2. **Task Tracker** — All 21 tasks with ID, feature, story, title, hours, status, priority, dependencies, notes
3. **Timeline** — Day-by-day execution (Option A: AI-Assisted, 6 days)
4. **Risk Register** — All 10 risks with severity, likelihood, markets, mitigation
5. **Deliverable Structure** — 10-section document outline for the final client deliverable
6. **WorkSage Import** — Full 43-row hierarchy (1 project + 5 features + 14 stories + 21 tasks) with every WorkSage field: `_temp_id`, `_temp_parent_id`, `item_type`, `title`, `description`, `status`, `priority`, `hours_estimated`, `assignees`, `client_id`, `practice_area`, `start_date`, `due_date`, `success_factor`, `notes`

**Columns widened** to prevent excessive word wrap (description=120, success_factor=90, title=55). Row heights fixed at 30px.

### 3. Word Document (Task Guide)

**File:** `d:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Goals\Goals_Pricing_Engagement_Task_Guide.docx`

**Generator script:** `d:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Goals\generate_task_guide.py`

**Contents:**
- Title page (NBI Analytics Ltd, April 2026, deadline 27 April, client Goals AB)
- Executive Summary with budget table and engagement architecture table
- All 5 Features with page breaks between them
- All 21 tasks, each with: Estimated Hours, What, How (numbered with sub-bullets), Done When
- Net revenue table for Task 1.1.4
- Appendix A: All 10 risks with full detail
- Appendix B: Day-by-day execution timeline, dependencies table, 6 quality gates

**Styling:** Calibri throughout, dark blue heading hierarchy, alternating row shading on tables, bold labels.

### 4. WorkSage Live Data Sync

**Fix script:** `d:\OneDrive\Claude_code\NBIAI_TEAM\scripts\fix_goals_worksage.py`

**What it fixed (43/43 items, 0 errors):**
- Project hours: 50h → 116h
- Project due date: 2026-04-28 → 2026-04-27
- All Feature 5 items (F5, S5.1-S5.3, T5.1.1-T5.3.1): dates moved from April 28 to April 26-27
- All 21 tasks: assignees cleared (were Glen Pryer / Devin Rieger / Tom Rieger)
- All feature and story hours updated to match plan v2
- All 21 task success factors rewritten in clean language (no person names, no jargon)
- Project description: "NBI team: Glen Pryer..." → "NBI team: To be assigned by team lead"
- T1.0.1 description: "GG-Monetization" → "Goals Studio Monetisation Design Doc"

### 5. Quality Fixes Applied Across All Three Outputs

**Glen's feedback, applied to all three:**

| Issue | Word Doc | Excel | WorkSage |
|---|---|---|---|
| No person assignments | Removed Owner: field from all tasks | Assignees column emptied | Assignees array cleared |
| Hours as estimates | Label changed to "Estimated Hours:" | Column header is "hours_estimated" | Field name is hours_estimated |
| GG- → Goals Studio | All refs replaced | All refs replaced | All refs replaced |
| 27 April deadline | All refs corrected | All dates within deadline | All dates within deadline |
| Acronyms spelled out on first use | 14 acronyms expanded | N/A (data fields) | N/A (data fields) |

**Acronyms expanded in Word doc (first occurrence only, then acronym used thereafter):**
HC, F2P, PPP, FX, ARPPU, ARPU, DAU, MAU, GDC, FOMO, FUT, SKU, P2W, SOW

---

## Verification Results

### Three-Way Alignment Check (all passed)
- 21/21 tasks in WorkSage, Excel, and Word doc
- Task hours: 116h total across all three
- Project deadline: 27 April 2026 across all three
- No GG- references in any output
- No person assignments in any output
- No April 28 dates in any output

### WorkSage Audit (all clean)
- 0 items with GG- references
- 0 items with April 28 dates
- 0 items with assignees
- 0 items with person names in descriptions
- All 21 task hours match plan v2

---

## File Inventory

| File | Purpose | Generator Script |
|---|---|---|
| `Clients/Goals/goals_pricing_engagement_plan_v3.xlsx` | Excel project tracker (6 sheets) | `scripts/add_worksage_tab.py` (sheet 6 only) |
| `Clients/Goals/Goals_Pricing_Engagement_Task_Guide.docx` | Word task guide for team | `Clients/Goals/generate_task_guide.py` |
| `scripts/add_worksage_tab.py` | Adds/rebuilds WorkSage Import sheet in Excel | Run after any plan changes |
| `scripts/fix_goals_worksage.py` | One-time fix: dates, hours, assignees, descriptions in WorkSage | Already run, kept for reference |
| `scripts/import_goals_project.py` | Original bulk import script (43 items) | Already run, has stale 28 Apr refs |
| `scripts/update_goals_fields.py` | Original field update script | Already run, has stale 28 Apr refs |
| `scripts/update_goals_tasks_smart.py` | SMART description rewrite script | Already run |
| `docs/superpowers/plans/2026-04-21-goals-studio-pricing-plan.md` | Source plan (v2, 678 lines) | Manual |
| `docs/superpowers/specs/2026-04-21-goals-studio-pricing-engagement.md` | Engagement spec | Manual |

---

## What's Not Done / Remaining

### A. Competitive MTX Pipeline Red Team Fixes
The red team report (`Clients/Goals/competitive_research/output/RED_TEAM_REPORT.md`) scored 53/100 with 3 critical, 5 high issues. Audit items 1-8 need fixing before any client delivery. See `projects/nbi_dashboard/session_logs/2026-04-21_session_red_team.md` for details.

### B. D1 Retention Discrepancy
Spec line 14 says "50% D1 retention on PS" but Town Hall slides show 34% on PS5. Needs Jonas verification or correction. Not yet flagged in the spec.

### C. WorkSage Parent Hour Rollups
Feature and story hours in WorkSage may not auto-sum from children. The fix script set them explicitly to plan values, but if tasks are re-estimated, parent hours won't update automatically.

### D. Old Excel Files
`goals_pricing_engagement_plan.xlsx` (v1) and `goals_pricing_engagement_plan_v2.xlsx` still exist. Consider deleting to avoid confusion. v3 is the current version.

### E. Stale Scripts
`scripts/update_goals_fields.py` and `scripts/import_goals_project.py` both have April 28 dates baked in. They were superseded by `fix_goals_worksage.py` but still exist. If anyone re-runs them, dates will revert.

---

## Key Context for Next Session

- **Deadline:** 27 April 2026 (platform cert submission). Project starts 22 April (tomorrow).
- **Client:** Goals AB — Jonas Rundberg (CEO), Julius (Live Ops)
- **Budget:** 100,000 SEK (~$10K USD), ~116 estimated hours
- **The Word doc and Excel are ready for Glen to review and share with the team.**
- **WorkSage is live and current** at `worksage.nbi-consulting.com` — all 43 items clean.
- **The plan document** (`docs/superpowers/plans/2026-04-21-goals-studio-pricing-plan.md`) is the source of truth for task content. Excel and Word doc are generated from it.
- **Granola meeting transcript** from 14 April was pasted into this session by Glen (not saved to a file). Contains the full PlayGoals kickoff call. Key details extracted into the plan and specs.

---

## Session Log

Session log at: `projects/nbi_dashboard/session_logs/2026-04-21_session_goals_studio.md` (entries 1-4 from prior session, not updated this session — update if continuing).
