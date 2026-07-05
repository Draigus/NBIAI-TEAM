# HANDOFF -- AIOS approval routing COMPLETE + CC integration + edit. Next: Phase 3 widen inputs (2026-07-06 ~00:00 BST)

**Supersedes** the 2026-07-05 ~16:30 handoff (3be4a3a). Session log: `projects/nbi_dashboard/session_logs/2026-07-05_session_b.md`. No background tasks running.

## 1. CURRENT STATE (all verified)

1. **Master at `ee5a453`.** 10 commits this session (395f22d through ee5a453). All AIOS approval client-routing work.
2. **Deployed:** nbi-dashboard + nbi-slack-bot restarted, both online, health 200. Migration 080 applied.
3. **Tests:** 88 unit test files / 1143 tests green. E2e: 93 passed, 1 skipped, 0 failures.
4. **Verified in Playwright:** AIOS Queue page loads, action cards render with Approve/Edit/Skip/Snooze, routing modal opens with client dropdown (25 clients), project cascade works, edit modal opens with editable title/description, save returns to list. CC AIOS tab shows Action Queue. Zero JS errors throughout.

## 2. WHAT WAS BUILT

### Approval Client-Routing (Glen directive 2026-07-05 16:20)
- **Migration 080:** `awaiting_routing` added to `execution_state` CHECK constraint
- **Slack flow:** Approve sets `awaiting_routing` instead of executing. Bot posts client dropdown (`aios_route_client`). On selection: zero/one initiatives auto-route; multiple shows project dropdown (`aios_route_project`). Stale routing guard checks `execution_state` before acting. Shared `executeAndReport` function handles execution + error marking.
- **Dashboard AIOS Queue page:** `#aios` view, sidebar entry after Bug Tracker (admin-only). Tab bar: Pending / Awaiting Routing / In Progress / Completed / Failed. Action cards with Approve / Edit / Skip / Snooze buttons. Routing modal with client select, project cascade, editable title/description. 30-second polling.
- **CC integration:** Action Queue section at bottom of Command Centre AIOS tab. Same card rendering, routing modal works from CC via dynamic overlay creation.
- **API endpoints:** `PATCH /approve` now sets `awaiting_routing` for recipe actions (backdoor closed). New: `PATCH /approve-and-route` (with optional title/description), `PATCH /route`, `PATCH /edit`, `GET /routing/clients`, `GET /routing/projects`. `GET /actions` supports `execution_state` filter.
- **Edit feature:** Edit button on pending/awaiting_routing cards. Opens edit-only modal (title + description, Save button). `PATCH /edit` endpoint. Save closes modal and refreshes list.

### Files changed (12 + 3 new)
- `migrations/080_aios_routing.sql` (new)
- `lib/execute-and-report.js` (new)
- `lib/bot-handlers.js` (4 new functions + approve modification)
- `slack-bot.js` (2 new action handlers, approve flow replaced)
- `routes/aios.js` (approve modified, 5 new endpoints)
- `public/js/views/nbi-aios-queue.js` (new, ~380 lines)
- `public/js/nbi-sidebar.js` (sidebar entry, known route, view case)
- `public/js/views/nbi-settings.js` (RBAC pages array)
- `public/js/nbi-command.js` (Action Queue in CC AIOS tab)
- `nbi_project_dashboard.html` (script tag, cache-busts)
- `tests/unit/bot-handlers-routing.test.mjs` (new, 10 tests)
- `tests/unit/execute-and-report.test.mjs` (new, 4 tests)
- `tests/unit/aios-routes.test.mjs` (10 new tests)

### Design docs
- Spec: `docs/superpowers/specs/2026-07-05-aios-approval-routing-design.md`
- Plan: `docs/superpowers/plans/2026-07-05-aios-approval-routing.md`

## 3. NEXT: Phase 3 -- Widen AIOS Inputs

Plan: `docs/superpowers/plans/2026-07-05-aios-phase3-widen-inputs.md`

The handoff from the previous session describes Phase 3:
> Worktree `.worktrees/aios-phase3-widen-inputs/` is currently on branch `fix/aios-phase2-audit` (now fully merged) -- switch back: `git checkout feature/aios-phase3-widen-inputs; git rebase master` (or recreate from master). Tasks 1/4/5 independent; 2->3 sequential; 6 last (registers signal-engine in Task Scheduler). Audit lesson: trace every cross-file contract yourself; do not trust subagent integration claims.

**Before starting Phase 3:**
1. Read the Phase 3 plan in full
2. Check if the existing worktree is usable or needs recreation (it was on `fix/aios-phase2-audit` which is now merged)
3. The `fix/aios-phase2-audit` branch can be deleted: `git branch -d fix/aios-phase2-audit`

## 4. OPEN ITEMS CARRIED

1. **Glen iterating pending actions:** Glen has Edit/Skip/Approve/Snooze buttons on all pending actions. He can triage the wrong ones now.
2. **18 pending signal-engine actions:** Glen was cleared to approve these in the previous handoff. They now go through the routing flow instead of auto-executing.
3. **Three stale approved null-recipe actions from 3 July:** executor correctly ignores them (null recipe).
4. **Worktree `.worktrees/aios-approval-routing`:** removal timed out (OneDrive sync). Delete manually: `git worktree remove .worktrees/aios-approval-routing --force`
5. **Worktree `.worktrees/aios-phase3-widen-inputs`:** needs branch switch or recreation (see section 3).
6. Codex round-1 completeness pass never ran. Use `'' | codex exec "..."` pattern.
7. Harness proposals P003-P008, 15+ restricted CH extracts, Google OAuth credentials, EU Withdrawal Button -- all carried from previous handoff.
8. `docs/HANDOFF_MAPS_SORT.md` untracked -- personal maps sorting task, not AIOS.

## 5. ENVIRONMENT

- Cache-bust versions: nbi-aios-queue.js?v=3, nbi-sidebar.js?v=7, nbi-command.js?v=2
- Playwright MCP browser_check is NOT recognised by the harness verification gate as evidence. Only `npm run test:e2e` satisfies the e2e_test requirement. Known gap.
- The `openAiosRouting` and `openAiosEdit` functions dynamically create the overlay/panel divs if they don't exist (needed for CC context where the standalone AIOS Queue page hasn't rendered them).
- `mergeRoutingIntoRecipe` clears `client_slug` when `clientId` is set, preventing the executor from re-resolving from the slug.
- `handleButtonAction` approve uses `CASE WHEN execution_recipe IS NOT NULL THEN 'awaiting_routing' ELSE execution_state END` in a single query (no two-query round-trip).
