# Handoff: ATS Visual Redesign — 2026-05-21

## What was done this session

### Implemented and deployed (all committed, PM2 restarted, 553/553 tests green)

**Security: Client salary access control**
- `dashboard-server/routes/hiring.js` line 253: `req.user.clientId ? rows.map(({ salary_range, ...rest }) => rest) : rows`
- `nbi_project_dashboard.html` line 19498: `!isClientUser() && p.salary_range` guard on position cards
- `nbi_project_dashboard.html` line 19864: `!isClientUser() && p.salary_range` guard on position detail panel
- 3 tests in `tests/unit/salary-access-control.test.mjs`
- Commits: `2758e23`, `291eb6d`

**Salary backfill**
- `dashboard-server/scripts/backfill-salaries.js` — reads `Clients/Couch Heroes/hr_hiring/Merged_Hiring_Plan_final_v2.xlsx`
- Excel column 4 = title (UPPERCASE), column 5 = annual salary (numeric)
- 29/30 positions updated (UI/UX Lead skipped — salary 0 in source)
- Normalisation handles: `(HIRED)` stripping, `enviro→environment`, case-insensitive matching
- Commit: `961f3dc`

**CSS overhaul (Task 4)**
- Full replacement of hiring CSS block (lines 2106-2265) with new styles
- Key changes: card name 0.85→0.95rem, labels 0.72→0.78rem, inputs 0.85→0.9rem
- Panel widths: 520→600px (candidate), 560→600px (position)
- New classes: `hiring-card--action-red/amber/grey`, `--archived`, `--stale`
- Tab system: `candidate-detail__stage-bar`, `__tabs`, `__tab`, `__tab-content`
- Minibar: 4→8px height, 80→140px width
- Stage editor drag handle CSS: `.se-drag-handle`, `.se-dragging`

**Kanban cards (Task 5)**
- `renderHiringCard` replaced (~line 19302): action-state left border, days-in-stage counter
- Tags/GDPR/comments removed from card surface (detail panel only)
- Action classes: red (unassigned/overdue), grey (archived/onboarded)

**Tabbed candidate panel (Task 6)**
- New function `buildCandidateStageBarHtml` at line 20350
- New function `switchCandidateTab` at line 20373
- `openCandidateDetail` replaced at line 20679: stage bar pinned, 4 tabs (Profile | Interviews | Activity | Settings)

**Metrics (Task 7)**
- `loadHiringMetrics` replaced (~line 19217): summary stat cards grid, pipeline funnel with conversion rate percentages between bars

**Stage editor (Task 8)**
- `openStageEditor` updated (~line 20089): drag handles on rows, drag-and-drop reorder with terminal row protection
- `addStageEditorRow` updated (~line 20189): includes drag handle

**Position cards (Task 9)**
- Salary hiding for client users already done in Task 2
- Minibar sizing handled by CSS Task 4

### Commits (oldest first)
```
2758e23 security: strip salary_range from positions API for client users
291eb6d security: hide salary fields from client user views
961f3dc data: backfill salary_range from Couch Heroes Excel hiring plan
b1fdfc9 fix: 3 bug tracker issues + test infrastructure overhaul
6b7e72f fix: client scope ordering, blocker clearing, repeating task dates, ATS stage editor
2e79e52 chore: ATS hiring metrics, brain update, refreshed screenshots, news-aggregator config
```

## Glen's Feedback — Visual Redesign Direction

Glen reviewed the deployed changes and the reference articles. His direction:

1. **Keep dark theme** — but colour differentiation must be clean and intentional
2. **References are for STRUCTURE** — what belongs on a card, what screens exist, sizing, spacing
3. The current implementation has the right backend but the UI "doesn't feel like a proper ATS"

### Reference articles (screenshot captures in repo root: ats-ref-*.png)
- https://www.eleken.co/blog-posts/applicant-tracking-system-design-how-to-make-recruitment-better-for-everyone
- https://www.mindk.com/blog/creating-an-applicant-tracking-system/

### Key patterns to implement from references

**Card content (from Hirerise/Bridge screenshots):**
- Candidate avatar (coloured initials circle) — prominent, not tiny
- Name (large, bold), Role (secondary), Client name
- Source badge (LinkedIn/Referral/Agency/etc)
- CV indicator
- Comment count
- Assignee faces (overlapping avatar circles)
- Days-in-stage counter
- All of this laid out with clear hierarchy, not crammed

**New screens needed:**
- **Database/Search view** — searchable table with all candidates, sortable columns, filter chips, avatar + name + role + stage badge + source + days + last activity columns
- **Calendar/Scheduling view** — interview scheduling with date picker + time slot matcher showing candidate and interviewer availability (not just a calendar grid)

**Spacing and sizing:**
- Cards need more padding and breathing room
- Lanes need more gap between them
- Detail panel sections need whitespace between them
- Position cards need larger, clearer pipeline bars

**Position listings:**
- Status progress bars showing pipeline distribution (not tiny minibars)
- Salary, location, seniority, employment type all visible
- JD attachment indicator

**Interview scheduling (from MindK Bridge screenshot):**
- Date picker on left side
- Available time slots on right showing candidate timezone + interviewer timezone
- Interviewer avatars at top
- Green/blue blocks for available slots

## Mockup file
- `dashboard-server/public/ats-mockup.html` — standalone mockup (v2 with 5 views: Pipeline, Positions, Database, Calendar, Metrics). NOT production code. Glen hasn't approved visuals — needs rebuild following reference patterns more closely.

## Next Steps

1. **Rebuild the hiring UI** in `nbi_project_dashboard.html` following the reference structural patterns:
   - Richer candidate cards (avatars, source badges, assignee faces, more info)
   - Database/search view (new tab in hiring view)
   - Calendar/scheduling view (new tab)
   - More generous spacing throughout
   - Clean colour differentiation within dark theme
2. Glen wants to see a finished product, not phase gates — just build it and show him.

## Current State
- Branch: `feature/command-centre`
- Tests: 553/553 green (41 files)
- PM2: running on :8888
- All migrations applied (046-050)
