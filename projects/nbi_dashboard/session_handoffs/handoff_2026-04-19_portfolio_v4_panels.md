# Handoff: Portfolio Dashboard v4 Panels — 2026-04-19

**Session focus:** Rewriting the 4 main Portfolio Dashboard panels to match Glen's reference design image, plus bottom row constraints and team workload filtering.

**Branch:** master
**Latest commits:**
- `6d716b9` — donut leader-line geometry + sizing polish
- `309a86a` — v4 panels match reference image sizing and detail
- `c1622ff` — v4 panels rewrite (match reference design)
- `5610b57` — Portfolio Dashboard v4 (new panels, KPI strip, work_type field)

**PM2 status:** nbi-dashboard running (pid changes on restart), port 8888. Restart after any nbi_project_dashboard.html change: `pm2 restart nbi-dashboard`

**Tests:** 128 vitest, all green. Run with `cd dashboard-server && npx vitest run`.

---

## Permissions & Settings

`.claude/settings.local.json` has `"defaultMode": "dontAsk"` — all tools auto-approved. No permission prompts for bash, read, edit, write, glob, grep, or any MCP tool. The new CLI session will inherit this from the project settings file. No manual setup needed.

Key allowed patterns already in place:
- `Bash(pm2 restart:*)`, `Bash(pm2 logs:*)`, `Bash(pm2 start:*)`
- `Bash(npx vitest:*)`, `Bash(npm run:*)`
- `Bash(git add:*)`, `Bash(git commit -m ':*)`, `Bash(git log *)`
- `Bash(curl -s http://localhost:8888/*)` 
- `Bash(sed -i '...' nbi_project_dashboard.html)` (specific patterns)
- `Bash(git worktree *)`, `Bash(git branch *)`, `Bash(git checkout *)`
- `PowerShell(*)` (unrestricted)

Model is set to `claude-opus-4-6`.

There is a PostToolUse hook on Agent calls that injects a no-fabrication guardrail reminder. This is intentional — see `memory/feedback_no_fabricated_analysis.md`.

---

## Prompt for New CLI Session

Paste this to pick up where we left off:

```
Read the handoff at projects/nbi_dashboard/session_handoffs/handoff_2026-04-19_portfolio_v4_panels.md

This is a continuation session. The Portfolio Dashboard v4 panels were rewritten to match a reference design image. Glen has NOT yet reviewed in Chrome. 

Current state:
- 4 main panels (donut, milestones, timeline, work types) rewritten with SVG leader lines, collision avoidance, proper sizing
- Bottom row constrained to 300px, team workload filtered to active users
- Responsive breakpoints at 1024px and 768px
- 128 vitest tests passing, PM2 running on port 8888
- Latest commit: 6d716b9

Glen will review in Chrome and compare against his reference design image. Be ready for immediate fixes based on his feedback. The acceptance criterion is pixel-level parity with the design image.

Read CLAUDE.md, the memory files at C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\memory\MEMORY.md, and live_state files before starting any work.
```

---

## What Was Built

### 1. Progress Status (Donut Chart) — `renderPfProgressStatus()` line ~4580

SVG donut chart with 6 status buckets: COMPLETED (green #22c55e), IN PROGRESS (cyan #06b6d4), PLANNING (blue #3b82f6), NOT STARTED (grey #94a3b8), WAITING ON CLIENT (yellow #f59e0b), BLOCKED (red #ef4444).

**SVG geometry:**
- viewBox `0 0 640 460`, center at (320, 230), radius 110, stroke-width 42
- outerR = 135 (radius + half stroke + 4px gap)
- Labels split into left/right groups by `Math.cos(midAngle) >= 0`
- Each group **sorted by dotY** (ascending) before label assignment — prevents leader line crossing
- Labels evenly spaced vertically with 85px spacing, centred at cy=230
- Leader lines: dot on arc edge (3.5px coloured circle) → angled first leg to elbow → horizontal second leg to label text
- Elbow X fixed at 80 (left) or 560 (right); elbow Y = labelY (guarantees horizontal second segment)
- Line style: #4dd0e1, 1.2px stroke, 0.65 opacity
- Percentage text: font-size 28, weight 700, segment colour
- Category text: font-size 15, weight 700, #94a3b8, letter-spacing 0.5, 22px below percentage

**Edge cases handled:**
- 0 segments: "No tasks found" empty state
- 1 segment: gap=0, single label centred at cy
- All segments on one side: other side's spaceLabels returns early

### 2. Upcoming Milestones — `renderPfMilestones()` line ~4669

Shows root-level projects (not sub-tasks) with target dates, sorted overdue-first then by date.

**Data source:** `panelRoots` filtered to active, mapped with `dueDate || endDate` fallback. Null guard on `safeParseDate()` return. Progress % calculated from descendants (done / total).

**Per-item layout:**
- 4px coloured left bar (red=overdue, yellow=within 7d, green=on track)
- Client abbreviation (bold, coloured) + " - " + project title (0.88rem, weight 600)
- Subtitle: "Client Name · Work Type" (workType shown conditionally, omitted if empty)
- Right column: status text + date
  - "Xd overdue" (red) / "Due today" (red) / "Due tomorrow" (yellow) / "Xd left" (yellow, 2-7d) / "On track" (green, >7d)
  - Date in "17 Apr" format (en-GB)

**CSS classes:** `.pf__milestone-item`, `.pf__milestone-bar`, `.pf__milestone-title`, `.pf__milestone-abbr`, `.pf__milestone-sub`, `.pf__milestone-status`, `.pf__milestone-date`

### 3. Project Timeline — `renderPfTimeline()` line ~4738

Simple horizontal bar chart. No zoom, no scroll, no Gantt controls.

**Layout:**
- 160px left column for project names (0.82rem, weight 600)
- Remaining width divided proportionally by month (days in month / total days)
- Month headers: current month 1.1rem/700 (bright), others 0.85rem/600 (muted)
- Months shown in uppercase 3-letter format (JAN, FEB, MAR...)
- Rows: 42px min-height, alternating zebra backgrounds (odd rows rgba white 0.02)
- Bars: 26px height, #00e5ff, 0.95 opacity, 3px border-radius
- Click opens detail overlay via `data-action="openDetailOverlay"`

**Data:** Root tasks with both startDate AND endDate (or dueDate). Sorted by start date. Global range from earliest start to latest end, rounded to month boundaries.

### 4. Work Types — `renderPfWorkTypes()` line ~4805

Horizontal bar chart showing work type categories.

**Data source:** Counts from root tasks' `workType` field, merged with configured categories from `_leadsConfig.fieldOptions.work_type`. Categories with 0 projects still shown (with 0-width bar).

**Layout:**
- Labels: 140px, right-aligned, 0.85rem, weight 700
- Bars: 28px height, #00e5ff, 0.95 opacity
- X-axis: up to 6 evenly-spaced number labels below bars
- CSS: `.pf__wt-row`, `.pf__wt-label`, `.pf__wt-bar-track`, `.pf__wt-bar`, `.pf__wt-axis`

**Dependency:** `_leadsConfig` loaded async at line 4189 via `loadLeadsConfig()`. On first render, config may be null (shows "No work type categories configured"). Re-renders when config loads.

### 5. Bottom Row

4-column grid (`.pf__bottom--v4`), max-height 300px per panel, panel body max-height 240px with overflow-y scroll.

**Panels:** Completing Soon, Upcoming Milestones (14-day window), Team Workload, Needs Attention.

### 6. Team Workload — `renderPfTeamWorkload()` line ~4916

Filtered to `_cachedTeamMembers` (active users from the API). Archived users (Jeff, Jessica, Denise) and client contacts (Lorenza, Valeria) excluded. Falls back to showing all assignees if `_cachedTeamMembers` hasn't loaded yet.

### 7. Event Delegation — lines 2437-2455

New `data-action` click delegation system. Any element with `data-action="functionName"` triggers `window[functionName]()` on click. Arguments via `data-arg0`, `data-arg1`, etc. Used by milestones and timeline rows.

---

## Responsive Breakpoints

| Viewport | Behaviour |
|---|---|
| Widescreen (>1024px) | Sidebar left, 2x2 panel grid, 4-col bottom row |
| Tablet (<=1024px) | Sidebar full-width, 2x2 panels, 2-col bottom row |
| Mobile (<=768px) | KPI strip wraps 2-col, panels single column, bottom single column, scaled-down milestone/work-type fonts |

---

## Known Data Gaps (not code bugs)

1. **Work Types bars at 0%** — Most/all root tasks lack `workType` field. Panel shows category names from `_leadsConfig` but bars are empty. Fix: assign `workType` on root tasks via the detail overlay "Work Type" dropdown.

2. **Timeline may show few rows** — Only root tasks with BOTH `startDate` AND `endDate` (or `dueDate`) appear. Many projects lack `startDate`. Fix: populate start dates on root tasks.

3. **Milestones subtitle missing work type** — Subtitle shows "Client" instead of "Client · Work Type" when `workType` is empty on the task. Same fix as #1.

---

## Reference Design Image

Glen provided a reference design image showing the exact target layout. Key design principles:
- UPPERCASE panel titles
- Large percentage labels on the donut (28px in SVG viewBox)
- Leader lines with horizontal second segment (no zigzag)
- Cyan (#00e5ff) bars throughout timeline and work types
- Right-aligned work type labels
- Milestone items with coloured left bar + client abbreviation
- Current month highlighted larger in timeline headers
- Bottom row constrained to 300px max

**Glen's instruction:** "I'm going to be gauging your success on the image I uploaded... if dimensions or details are missing that will again be failing." Parity with the reference is the acceptance criterion.

---

## What the Next Session Should Do

1. **Glen's Chrome review** — Glen has not yet reviewed the live dashboard in browser. He will compare against the reference image and flag discrepancies. Be ready for surgical CSS/JS fixes.

2. **Populate workType data** — The Work Types and Milestones panels will look sparse until root tasks have workType assigned. Consider a bulk-update script or UI workflow.

3. **Populate startDate** — Timeline needs startDate on root tasks. Same consideration.

4. **Remaining todo items from Glen's backlog** — See `live_state/pending_tasks.md` for G1-G5 and the broader feature backlog.

---

## File Locations

- Dashboard HTML: `nbi_project_dashboard.html` (19,400+ lines, single-file app)
- Panel functions: lines ~4580-4940
- Panel CSS: lines ~370-500
- Server: `dashboard-server/server.js`
- Tests: `dashboard-server/tests/`
- Live state: `projects/nbi_dashboard/live_state/`
- Session logs: `projects/nbi_dashboard/session_logs/`
- Handoffs: `projects/nbi_dashboard/session_handoffs/`

---

## Environment

- Node/PM2 on Windows 11, bash shell
- Port 8888 (dashboard), 8890 (news aggregator)
- Public URL: worksage.nbi-consulting.com (Cloudflare tunnel)
- DB: PostgreSQL (local)
- All changes on `master` branch (no feature branch for this work — Glen's directive for <3 file changes)
