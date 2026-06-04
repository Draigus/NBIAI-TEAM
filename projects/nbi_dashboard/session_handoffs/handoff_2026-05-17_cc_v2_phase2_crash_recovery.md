# Handoff: CC v2 Phase 2 Crash Recovery — 2026-05-17

## What Happened

Previous session crashed mid-work due to an oversized image in context (recurring issue). This handoff captures the full state so a fresh session can pick up cleanly.

## Branch State

- **Branch:** `feature/command-centre`
- **Last commit:** `9e618db` — `feat(cc): floating Claude chat panel (F13) — WebSocket client, streaming messages, dashboard context`
- **Uncommitted tracked changes:** NONE (clean working tree for tracked files)
- **Untracked files:** ~30 CC screenshots (`cc-*.png`), Couch Heroes production files, some untracked session logs/handoffs, scroll spec docs

## What Was Completed Before the Crash

### CC v2 Phase 1 (fully shipped, all committed)
All 7 tasks from Phase 1 plan executed and committed:
- `262c2b4` — v2 tabbed UX shell (persistent header + 5-tab layout)
- `76b1a6b` — Pipeline endpoint + tab (F1+F11) — funnel, stale leads, follow-ups, analytics
- `4db006c` — AIOS detail endpoint + tab (F5) — Four Cs deep view, recommendations, 30-day history
- `faf1d4e` — Project health + client signals (F6+F8) — milestones, SOW status, risk scores
- `a09e302` — Team workload endpoint + section (F9) — assignee bars, time, capacity alerts, SPOF
- `713ebb5` — Handoff hub endpoint + section (F12) — file scan, parsed summaries, resume buttons
- Plus layout fixes: `fe47048` (SQL assignees + layout rework), `fb71dba` (dense 3-column widescreen)

### CC v2 Phase 2 (fully shipped, all committed)
All 4 tasks from Phase 2 plan executed and committed:
- `9aa8ca2` — Financial pulse endpoint (F7) — revenue, costs, margins, pipeline KPIs
- `babdfe9` — Money tab frontend (F7) — KPI tiles, revenue bars, cost breakdown, contracts
- `1f69897` — WebSocket chat server (F13) — Claude CLI spawner with dashboard context
- `9e618db` — Floating Claude chat panel (F13) — WebSocket client, streaming messages, dashboard context

### Also completed across recent sessions
- Sidebar toggle CSS specificity fix (uncommitted but deployed to PM2)
- Gantt sticky header fix
- 408/408 Vitest tests passing (34 files)

## What's Deployed but NOT Committed

**Sidebar toggle fix** — CSS specificity fix in `nbi_project_dashboard.html` lines 307 and 309. Removed `button.sidebar__toggle` from combined reset selector. Verified across all 8 themes via Playwright. Deployed to PM2 but not yet committed. Previous handoff: `handoff_2026-05-16_sidebar_toggle_specificity_fix.md`.

## Server State

- **PM2 `nbi-dashboard`** on port 8888 — should be running with all Phase 2 code
- **Production URL:** https://worksage.nbi-consulting.com
- **`ws` npm package** installed for WebSocket chat (F13)
- **WebSocket path:** `/ws/chat` — Claude CLI spawner via `routes/chat.js`

## Test State

- **Vitest:** 408 tests passing across 34 files (last confirmed in session 2)
- **Playwright E2E:** Not run since Phase 2 changes — recommend running `npm run test:e2e`
- **Chat tests:** No dedicated unit tests for `routes/chat.js` (WebSocket-based, skipped in Phase 2 plan)

## What the Previous Session Was Working On

The session that crashed had completed all Phase 2 tasks and was likely doing one of:
1. Glen UAT review of Phase 2 features (Money tab, chat panel)
2. Visual verification via screenshots (explains the oversized image that crashed it)
3. Starting Phase 3 planning or addressing Glen's feedback

## CC v2 Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| F1. Pipeline tracking | SHIPPED (Phase 1) | Funnel, stale leads, follow-ups |
| F5. AIOS deep view | SHIPPED (Phase 1) | Four Cs, recommendations, history |
| F6. Project health | SHIPPED (Phase 1) | Milestones, SOW status, risk scores |
| F7. Money tab | SHIPPED (Phase 2) | KPI tiles, revenue bars, cost breakdown |
| F8. Client signals | SHIPPED (Phase 1) | Part of F6 |
| F9. Team workload | SHIPPED (Phase 1) | Assignee bars, capacity alerts |
| F11. Pipeline analytics | SHIPPED (Phase 1) | Part of F1 |
| F12. Handoff hub | SHIPPED (Phase 1) | File scan, parsed summaries |
| F13. Embedded Claude chat | SHIPPED (Phase 2) | WebSocket + floating panel |
| F2. AI Weekly Assessment | NOT STARTED | Needs cloud routine + cc_ai_assessments table |
| F3. Granola Notes Integration | NOT STARTED | Needs Granola MCP + actions table |
| F4. Token/Cost Tracking | NOT STARTED | Needs billing API integration |
| F10. Active AIOS Monitoring | NOT STARTED | Real-time agent status |

## Outstanding Items Awaiting Glen UAT

Everything listed in `live_state/pending_tasks.md` plus:
- CC v2 Phase 1 — all tabs (Work, Pipeline, AIOS)
- CC v2 Phase 2 — Money tab + Claude chat panel
- Sidebar toggle fix
- 14 bugs at `please_review` status
- Previously shipped features (connected statuses, prerequisites, scroll, portfolio, Gantt, client portal, news aggregator)

## Open Bugs (not yet fixed)

| Bug ID | Priority | Title |
|--------|----------|-------|
| 0b50308b | high | Lighthouse Filter Not Working |
| 551b8601 | unset | "+New" Useability |
| 39ef99de | unset | Scoped view in timeline view |
| 1cf2a501 | unset | Bug Tracker Page Scrolling Issue |

## What the Chat Panel Screenshot Shows

The user's screenshot shows the floating Claude chat panel with a "Hi Claude" message sent, and Claude's process exiting with code 1. This means the Claude CLI integration (F13) is hitting an error — likely:
1. `claude` CLI not found in PATH from PM2's environment
2. Missing `--allowedTools` or permission issue in headless mode
3. The `--bare` flag or `--no-session-persistence` flag not supported in the installed CLI version

**This needs debugging before Glen can use the chat feature.** The WebSocket connects fine (the panel renders and accepts input), but the spawned Claude process fails immediately.

## Recommended Next Steps

1. **Debug the Claude chat exit code 1** — check PM2 logs (`pm2 logs nbi-dashboard --lines 50`) for the stderr output from the Claude CLI spawn. Fix the spawn args in `routes/chat.js`.
2. **Commit the sidebar toggle fix** — it's verified but uncommitted.
3. **Run `npm run test:e2e`** — hasn't run since Phase 2 changes.
4. **Glen UAT** on Money tab and all CC v2 features.
5. **Decide on Phase 3** — F2 (AI Weekly Assessment), F3 (Granola), F4 (Token tracking), F10 (Active monitoring) are all unbuilt.

## Key File Locations

- CC v2 spec: `docs/superpowers/specs/2026-05-16-command-centre-v2-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-05-16-command-centre-v2-phase1.md`
- Phase 2 plan: `docs/superpowers/plans/2026-05-17-command-centre-v2-phase2.md`
- CC route: `dashboard-server/routes/command-centre.js`
- Chat route: `dashboard-server/routes/chat.js`
- Frontend: `nbi_project_dashboard.html` (CC section starts ~line 19634)
- CC tests: `dashboard-server/tests/unit/command-centre.test.mjs`
- Live state: `projects/nbi_dashboard/live_state/`
- Session handoffs index: `projects/nbi_dashboard/session_handoffs/INDEX.md`
