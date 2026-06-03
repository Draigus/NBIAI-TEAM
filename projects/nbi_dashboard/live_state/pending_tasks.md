# Pending Tasks

Updated 2026-06-03

---

## Interview UX Redesign — Phases A + B COMPLETE

Phase A (DB + API) and Phase B (Frontend) both done. Deployed on :8888.
- **Glen UAT needed:** open candidate detail → Interviews tab. Check:
  - Compact round cards expand on click (type, date, outcome, blind score summary)
  - Decision bar at bottom (Advance/Hold/Reject buttons, notes, history)
  - "+ Add Round" button opens modal with type/schedule fields
  - Questions tab visible in Hiring page sub-tabs
  - Scorecard flow still works (deep link `#interview/{sessionId}`)
- **Next:** Phase C — Add/Edit/Delete modals + calendar integration

## Interview Tool — COMPLETE (awaiting Glen UAT)

All 9 tasks done. Scorecard, question bank tab, quality pass, E2E tests, unit test verification.
- **Note:** The scorecard flow (session-based) still works. The interview rounds UI (old system) is now retired.
- Run `npm run test:e2e` from dashboard-server/ to execute E2E tests

## Awaiting Glen UAT

All deployed on :8888 via PM2. Glen needs to test at worksage.nbi-consulting.com.
Unit tests: 632/639 pass (51 files, 7 pre-existing failures). 4 new interview E2E specs + existing specs. Branch: `feature/command-centre`.

### Innovation Items (deployed, awaiting UAT)
- **Finance entries server migration** — ad-hoc entries now persisted in PostgreSQL (was localStorage-only)
- **Client invite password display** — generated passwords shown after user creation
- **Theme token colours** — ~40 hardcoded hex values replaced with CSS custom properties
- **Client status reports** — "Generate Client Report" button shows rich modal with KPI cards and sections
- **Onboarding bridge** — default 7-item checklist created when candidate reaches onboarding stage
- **Version-based sync conflicts** — tasks track version counter; concurrent edits detected and rejected
- **Position modal focus trap** — proper focus management with restoration
- **Portfolio Needs Attention redesign** — client-grouped overdue/blocked counts, clickable rows navigate to filtered tasks view
- **CC Team by client** — pivoted to client-first grouping with team members under each client
- **CC Client Health clickable tags** — overdue/blocked tags navigate to filtered tasks view
- **Portfolio cleanup** — removed Recent Activity + Client Health panels (redundant with CC)

### Command Centre v2 — Zone-Based Layout
- Three-zone cockpit: status strip (48px), 4Cs metrics row (120px), main+rail grid
- Tabs: Dashboard (adaptive grid), Daily Briefing, System Map
- Action rail: command input, critical alerts, reasoning stream
- Keyboard shortcuts: 1/2/3 tabs, / or Ctrl+K command input, R refresh, Escape deselect
- Card selection with dim/highlight
- Responsive: 5→4→3→2→1 columns, rail collapses at <1600px

### Bug Batch — 14 Bugs (all `please_review`)
| Bug ID | Title | Fix Summary |
|--------|-------|-------------|
| caf58563 | Input Information Not Saving | Sync failure toast + beforeunload guard |
| a1ec1a84 | Mark As Repeating inconsistent | Moved checkbox to after Due Date |
| 9893cedc | Dragging end of task bar changes wrong date | ganttBarDragEnd sets both endDate and dueDate |
| a12b9c49 | Clicking Warning partially redirects | switchView runs first, then ancestor expansion |
| 3ab421ed | Clicking Alerts for Bug Fixes fails to redirect | CC rail + briefing + notification links patched |
| 1c89b060 | No Data Issue (empty pages on load) | Loading skeleton gate on initial load |
| 442e1b50 | Blocked Description incomplete | 5 editable blocker fields in both detail panels |
| a8e144aa | Search Bar doesn't work on timeline | Gantt search with ancestor/descendant visibility |
| 57b7f1e3 | Client Filter not working | Could not reproduce — needs Glen's specific steps |
| 2ecb924d | Repeating Task Checkbox position | Same fix as a1ec1a84 |
| 76f88a2a | No Email Reports | sendEmailAsync already retries; cron SQL cast fixed |
| f8eb57f6 | Reporting Page Colour Legend | Inline legend row added |
| f9f52392 | Blocker Update tracking | lastUpdated field on all 5 blocker onchange handlers |
| 82904fb3 | Milestone Text Misplacement | Label repositioned above header row |

### Bug Batch 2 — 3 Bugs (all `please_review` as of 2026-05-20)
| Bug ID | Title | Fix Summary |
|--------|-------|-------------|
| 1e6a4dfe | Ability to Delete Ticket Comments | Delete button added to task comments (author + admin) |
| 114530a5 | Dates Defaulting to First of Month | Date format validation added to standup + server sync |
| d550fd70 | Stories in Standup List | Standup filtered to item_type=task only |

### Previously Shipped (still awaiting UAT)

**Gantt Timeline Drag** — Bars land where dropped (timezone fix), dueDate synced. Glen reported initial fix still off — latest fix deployed.

**Connected Statuses** (c7e48ddf) — Parent Done/Cancelled/Blocked cascades to children. Siblings terminal → parent auto-completes.

**Prerequisites Blocked** (f5a6bff2) — Block/cancel prerequisite → dependants auto-blocked.

**Scroll Preservation** (9bb9eb1a, 2e005a41, 94b12f59) — Sync no longer resets scroll in any view. Gantt scroll preserved. Re-render skipped when detail panel open.

**Portfolio Chart Redesign** — Bar+donut layout.

**Gantt Scroll-to-Today** — Auto-scrolls to today line on first open.

**Client Portal** — Lorenza login, client filter lock, scoped views, localStorage isolation.

**Queue Detail Panel** (3dcb2dc) — Click queue items for slide-in panel.

**Client Portal Features** (8b74230) — Force password change, client admin team management, NBI admin Source column.

**News Aggregator M4** (40a3ab1) — Search subtab, Feed Health/Prompts/Sources/Stories admin panels.

**Wave 2 Quick Fixes** (9 items) — Breadcrumb hiding, date validation, Gantt label scroll, search scope, assignees, percentages, doc hyperlinks, NBI Only toggle, repeat section.

**Email Reports** — Sequential sends with retry. First live test was this morning's 08:00/09:00 cron runs.

---

## Open Bugs (not yet fixed)

| Bug ID | Priority | Title | Notes |
|--------|----------|-------|-------|
| ~~0b50308b~~ | ~~high~~ | ~~Lighthouse Filter Not Working~~ | RESOLVED 2026-05-13 — duplicate client record deleted by Glen |
| 551b8601 | unset | "+New" Useability | Needs sorting by client/project hierarchy at scale |
| 39ef99de | unset | Scoped view in timeline view | Feature request: isolate a feature/story as temporary root |
| 1cf2a501 | unset | Bug Tracker Page Scrolling Issue | FIXED — comment input moved to pinned footer, overscroll-behavior:contain added. Awaiting UAT |

---

## Branch Merge

`feature/command-centre` is 60+ commits ahead of `master`. Needs merge after UAT pass. Includes CC v2 + all bug fixes + email + infrastructure fixes + product audit improvements + intelligence pipeline.

---

## On Hold (waiting on external input)

### QuickBooks Time API Integration
- Blocked on Bryan Rasmussen's API token
- Native `time_entries` table exists for manual logging

### Slack App Icon
- Glen has the image, needs to upload at api.slack.com > Basic Information > Display Information

---

## E2E Test Health

12 Playwright E2E specs committed. Unit tests: 636/636 across 51 Vitest files (post-zombie-cleanup clean run on 2026-06-02). Test infrastructure hardened: pool error handler, keepAlive, truncate resolves tables dynamically.

## Infrastructure Health (2026-06-02)

- **Zombie processes cleared:** 154 → 21 node processes. No pre-June-1 orphans remain.
- **Test suite stable:** 51/51 files, 636/636 tests, 0 failures, 398s duration.
- **Security:** settings.local.json removed from git tracking, .gitignore updated.
- **Worktrees:** 8 orphaned directories deleted, 5 registered worktrees intact. ~2.3 GB reclaimed.
- **Knowledge:** playsage.md conflicts resolved (GDC demo + data licensing strategy).
- **Intelligence banks:** 7 banks, all stale (last compiled May 25). 145+ extracts waiting. Recompilation needed.
- **BearsLaptop duplicates:** 759 files remain across repo — reconciliation pending.

---

## Backlog — Needs Brainstorming Before Implementation

- Frontend modularisation (21,000+ line HTML monolith)
- People dashboard redesign
- Data cleanse tool
- Command Centre Phase 2 (nightly cron/Dreaming engine)
- Command Centre Phase 3 (autonomous execution engine)
