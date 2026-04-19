# Handoff — Portfolio Dashboard Redesign v2 (2026-04-18)

**Session purpose:** Redesign WorkSage's landing page from a dense tactical/operational view to an executive portfolio dashboard. Glen directed: one card per client, all projects shown, actionable drill-down on red/blocked items.

**Previous handoff loaded:** `handoff_2026-04-18_desktop_migration_complete.md`

**HEAD at session end:** Uncommitted changes on `master` — all changes in `nbi_project_dashboard.html` only.

---

## 1. What was done

### 1a. Research phase
- Loaded UI/UX Lead persona from `roles/ui_ux_lead/`
- Web research on executive portfolio dashboard best practices (BirdView PSA, ClearPoint, Klipfolio, Smartsheet, NN/g progressive disclosure, IxDF)
- Key finding: WorkSage was trying to be 4 tools in one (executive dashboard, PM tool, back-office admin, ops/dev tooling). Average failing exec dashboard shows 30-40 metrics. Best practice: 3-5 actionable numbers, client-level RAG cards, exceptions only, progressive disclosure.

### 1b. Portfolio dashboard implementation

**New CSS added** (~50 lines, after tactical dashboard CSS around line 367):
- `.portfolio-strip` — metrics bar (reuses tactical-metric pattern)
- `.portfolio-card` — client cards with RAG left-border, expand/collapse, progress bar
- `.portfolio-project` — project rows inside cards with health dots, progress bars, flag badges
- Responsive breakpoints for mobile

**New JS:**
- `_expandedPortfolioCards` — Set for tracking card expansion state (line ~2309)
- `togglePortfolioCard(clientName)` — expand/collapse handler (line ~4230)
- `renderPortfolioDashboard()` — the main function (line ~4241), contains:

**Metrics strip (6 items):**
Active Projects | Overdue | Blocked | At Risk | Hours Spent | Hours Est.

**Nearly Complete section:**
Projects 60-99% done, sorted by completion %, top 6. Shows client name, project title, progress bar.

**Upcoming Milestones section:**
Root tasks with due dates in next 14 days, colour-coded by urgency (red <=2d, amber <=5d, muted otherwise). Top 6.

**Client cards (collapsed):**
- RAG health dot (worst health across all client tasks)
- Client name
- Stats: X active, Y overdue, Z blocked, W at risk (only non-zero shown)
- Progress bar with %
- Expand arrow

**Client cards (expanded):**
- Hours summary: hrs spent, hrs est, burn %
- "Needs Attention" panel (red-tinted box): lists every blocked/at-risk/overdue task with:
  - Reason badge: BLOCKED, AT RISK, Xd overdue (or combinations)
  - Parent project name
  - Task title (clickable → detail overlay)
  - Assignee
- Project list: all projects sorted active-first, each with health dot, flag badges (late/blocked/at risk), progress bar, done/total count + %

### 1c. Routing changes

| What | Before | After |
|---|---|---|
| Sidebar "Dashboard" | → `report` view | → `dashboard` view (portfolio) |
| Sidebar "Workload" | → `dashboard` view | Removed (renamed to "Dashboard") |
| Sidebar "Report" (old report view) | Shown | Commented out of sidebar |
| Tab bar | Included `report` tab | `report` removed from tabs array |
| `LEGACY_ROUTES` | `{ incomplete: 'tasks', changelog: 'settings' }` | Added `report: 'dashboard'` — old #report URLs redirect |
| Default landing view | `currentView = 'dashboard'` (unchanged) | Now shows portfolio view |

### 1d. What was commented out (NOT deleted)

- `renderTacticalDashboard()` call in `renderDashboard()` (line ~4025): `// html += renderTacticalDashboard();`
- Standup loading code in `renderDashboard()` (lines ~4029-4033)
- Report sidebar item (line ~3456): `// html += sidebarItem(svgReport, 'Report', ...)`
- The entire `renderTacticalDashboard()` function body is UNTOUCHED — still in the file, just not called

---

## 2. What Glen still wants (not yet done)

1. **PlayGoals → NBI OPS**: Move PlayGoals project under NBI OPS client. This is a data change in the database, not a UI change. Glen said "put PlayGoals inside NBI ops, and then holistically rename that in NBI."

2. **Further refinement**: Glen was about to review the v2 dashboard. He may have feedback on:
   - Card layout/density
   - Whether the "Needs Attention" drill-down is useful enough
   - Whether "Nearly Complete" and "Upcoming Milestones" sections are valuable
   - Whether the metrics strip has the right numbers

3. **Old report view**: Currently accessible via direct URL `#report` but redirects to dashboard. Glen hasn't said whether to keep or fully remove it. Code is intact.

---

## 3. Server state

- **WorkSage (nbi-dashboard):** PM2 process ID 3, port 8888, online. Last restarted during this session (restart count: 16).
- **News aggregator (nbi-news):** PM2 process ID 2, online.

---

## 4. Git state

- **Branch:** `master`
- **HEAD:** `17d6153` (unchanged from session start)
- **Uncommitted changes:** `nbi_project_dashboard.html` only (all portfolio dashboard work)
- **No new commits made this session** — Glen hasn't asked to commit yet
- **Untracked:** `docs/`, session handoff/log files from earlier sessions

---

## 5. Key file locations

| What | Where |
|---|---|
| Dashboard HTML (all changes) | `nbi_project_dashboard.html` |
| Portfolio CSS | Lines ~369-417 (`.portfolio-*` classes) |
| Portfolio JS function | `renderPortfolioDashboard()` at line ~4241 |
| Toggle function | `togglePortfolioCard()` at line ~4230 |
| State variable | `_expandedPortfolioCards` at line ~2309 |
| Commented-out tactical call | Line ~4025 in `renderDashboard()` |
| Routing changes | `LEGACY_ROUTES` at line ~3803, tabs at line ~3784, sidebar at line ~3455 |
| Session log | `projects/nbi_dashboard/session_logs/2026-04-18_session_security_fixes.md` |
| Previous handoff | `projects/nbi_dashboard/session_handoffs/handoff_2026-04-18_desktop_migration_complete.md` |

---

## 6. Design decisions and Glen's exact requirements

- "One card per client" — confirmed correct approach
- "All active projects per client, not just the top three" — show everything
- "Comment it out and not delete it" — revert safety net, no code deletion
- "Total items doesn't matter... 47% complete as aggregate doesn't tell me anything" — removed aggregate % complete from strip
- "Hours spent and estimated hours committed is good" — kept in strip
- "Next milestones or soon completed projects is good" — added Nearly Complete + Upcoming Milestones
- "Simple red dot without being able to workflow down to figure out what the red is or why is useless" — added Needs Attention panel with reason badges
- "When I click open the client, it should give a summary of the reds as well" — Needs Attention panel shows all blocked/at-risk/overdue per client with task-level detail
