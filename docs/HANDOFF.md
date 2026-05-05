# HANDOFF: 2026-05-05 Session 4+6 — Portfolio Review, Milestones, Bug Fixes

## Session Summary

Portfolio dashboard review with Glen (layout changes, data cleanup), then built milestones feature overnight, then live bug triage with the team.

---

## What Was Built / Changed

### Portfolio Dashboard Review (committed `8878854`)
- **Removed Work Types tile**, Project Timeline now spans full width (`pf__panel--wide`)
- **Deleted duplicate Lighthouse Studios** client record from DB (was empty, only Lighthouse Games has data)
- **Closing Soon breadcrumb**: shows `Client / Project / Feature` instead of just `Client / Feature` — `parentTitle` added to timeline row objects
- **Sidebar scroll preserved** on client selection — saves/restores `.pf__sidebar` scrollTop in `renderContent()`
- **Timeline label column** widened from 180px to 280px
- **Needs Attention panel**: overflow changed to `overflow-y: auto`, owner shown in red at title-level font size
- **Data cleanup**: Devon→Devin (43 tasks), all assignees normalised to user display_names (Amir→Amir Didar, Tom→Tom Rieger, Devin→Devin Rieger — 166 tasks total), Stavros added to all 43 Goals Studio tasks

### Milestones Feature (6 commits, `e98eb6e..b898546`)
- **Migration 038**: `milestones` + `milestone_items` tables with FK cascades and indexes
- **API**: 4 CRUD endpoints — `GET/POST /api/clients/:clientId/milestones`, `PUT/DELETE /api/milestones/:id`
- **Tests**: 16 tests all passing in `tests/unit/milestones.test.mjs`
- **Frontend**: CSS, HTML shells, JS cache (`_milestonesCache`), `loadMilestones`, `saveMilestone`, `deleteMilestone`, `computeMilestoneStatus`
- **Client header**: `renderClientMilestones(clientName)` shows milestone cards with progress bars and status badges
- **Milestone detail panel**: sliding panel (same pattern as queue detail) with title/date/description editing, linked items picker, save/delete
- **Portfolio tile**: `renderPfMilestones` replaced with real milestone data from cache
- **Spec**: `docs/superpowers/specs/2026-05-05-milestones-design.md`
- **Plan**: `docs/superpowers/plans/2026-05-05-milestones.md`

### Bug Fixes (committed `fe81a7c` + additional)
1. **Rate limit bumped** from 60 to 200 req/min — users were hitting "too many requests" (line 575 in server.js)
2. **Sync re-render deferred** when user has input focus — prevents date field truncation and focus jumping (`_softReRender` now checks `document.activeElement`)
3. **Timeline progress** uses hours spent/estimated instead of task-count completion. Falls back to Done/total when no hours data. Uses global `getDescendants` for consistency with detail view.
4. **Parent date rollup**: features/projects with children no longer use `dueDate` as fallback — only `startDate`/`endDate`, rolling up from children when cleared
5. **Internal users promoted to admin** — 7 members promoted. The `member` role was silently dropping their sync changes because the sync endpoint's client-name resolution fails for non-admins when client names don't match exactly. **THIS IS A TEMPORARY FIX — proper fix needed.**

---

## Open Bugs (from team feedback, not yet fixed)

### BUG: Members can't sync task updates (CRITICAL — temp-fixed)
**Root cause**: `POST /api/sync/changes` (server.js line 5789-5794) silently drops task upserts from non-admins when the client name can't be resolved to an ID. The `rejectedOutOfScope` counter increments but the client gets `{ ok: true }` — no error surfaced.
**Temp fix**: All internal users promoted to admin role.
**Proper fix needed**: 
- Members (internal, `client_id IS NULL`) should be able to sync task upserts without admin role
- The client-name-to-ID resolution should not be admin-gated for existing clients
- Any rejected change MUST return an error the client can display — never silently drop

### BUG: People filter shows wrong tasks
**Status**: Not yet investigated in detail. Likely related to `normaliseAssignees` fuzzy matching (line 11262) creating false positive matches. Now that all assignees are normalised to full display names, this function may be merging names it shouldn't.
**Where**: `renderPeopleView` in nbi_project_dashboard.html, line 11286+

### BUG: Can't drag pre-existing tasks into a story
**Status**: Not yet diagnosed. Glen reports an error when dragging. The `onDrop` handler (line 9225) enforces `VALID_CHILD_TYPE` — `story → task` should be valid. Need the actual error message to diagnose. Could be an `itemType` mismatch on pre-existing tasks.

### BUG: Timeline progress still showing 0% for some items
**Status**: Debug logging added (search `[TL-DEBUG]` in nbi_project_dashboard.html ~line 5705). Code switched to `getDescendants` (global) but still showing 0% for "Engineering - Infrastructure". Need browser console output to diagnose. **Remove the debug console.log before shipping.**

### BUG: Calendar endpoint broken
**Visible in logs**: `column reference "client_id" is ambiguous` — repeated errors in PM2 logs for calendar events. Likely needs qualified column reference in the calendar JOIN query.

---

## Other Open Items

### Portfolio Review — Future Work
- **KPI Strip**: Glen questioned whether the 6 metrics earn their space. "Work Types Active" references a removed tile.
- **Progress Status donut**: Glen wants a better visualisation. Not a fan of the donut.
- **Completing Soon**: was empty — threshold is 60-99% complete.

### From Prior Sessions
- Slack app icon — Glen has the image, upload at api.slack.com
- Docs mobile responsive layout (1 open bug)
- SoW layer in hierarchy (large, needs brainstorm)
- Telemetry + BI Analytics Dashboard (plan exists)
- Real research backend (Brave/Tavily/Anthropic)
- QuickBooks Time API (blocked on Bryan's token)
- Couch Heroes fresh import (Glen handling)

---

## Memory Notes
- **Marie**: Third-party contractor, tracked in assignees but no user account (memory file created)
- **Lighthouse Studios**: Deleted — duplicate of Lighthouse Games
- All internal users now admin role (was member, which blocked sync)

---

## Config
- **Live URL**: https://worksage.nbi-consulting.com
- **Ports**: 8888 (prod), 8887 (staging), 8889 (test)
- **PM2**: nbi-dashboard, nbi-dashboard-staging, nbi-news, cloudflare-tunnel, context-monitor
- **Tests**: `npm test` (vitest), `npm run test:e2e` (playwright), `npm run test:all` (both)
- **Branch**: master
- **Rate limit**: 200 req/min (was 60)
