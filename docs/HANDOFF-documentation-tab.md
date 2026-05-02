# Handoff — Documentation Tab Build (in progress)

**Branch:** `feature/documentation-tab`
**Worktree:** `D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/documentation-tab`
**Plan:** `docs/superpowers/plans/2026-05-02-documentation-tab.md` (already on branch)
**Spec:** `docs/superpowers/specs/2026-05-02-documentation-tab.md` (already on branch)

## Done so far (commits on `feature/documentation-tab`)

| Commit | Task | What |
|---|---|---|
| `772518c` | Task 1 | Spec freeze — captured all 7 Glen-approved decisions |
| `616c4e1` | Task 2 | Migration 033 — `documents` table + `pg_trgm` extension + `body_text` shadow column + GIN trigram index for future search |
| `bd2d631` | Task 3 | Migration 034 — `document_attachments` table with `orphaned_at` for 24h grace cleanup |
| `fd1f318` | Task 4 | Migration 035 — per-user `docs_view/edit/create/upload` flags + per-client `doc_default_*` defaults |

All three migrations applied to **both** `nbi_dashboard` (prod) and `nbi_dashboard_test`. Verified directly:
- Tables `documents` and `document_attachments` present on prod
- All 8 permission columns present on `users` and `clients`

## Resume sequence (recommended subagent dispatch order)

20 tasks remain. Recommended order from the plan's Part 4:

| # | Task | Notes | Parallel-safe with |
|---|---|---|---|
| 5 | Task 5 + B1 — pure helpers | `redactNbiInternal` and `extractPlainText` in `dashboard-server/lib/redact-nbi-internal.js` with vitest. Plan steps already include the test code. | Standalone — pure functions, no DB |
| 6 | Task 6 | List / read / create endpoints in `server.js`. Depends on Task 5 (uses `redactNbiInternal`). | — |
| 7 | Task 7 + D1 | Update / delete + ETag/If-Match optimistic concurrency. Depends on Task 6. | — |
| 8 | Task 8 + H1 | Image upload + serve + `imageInScope` leak prevention. Depends on Task 6. | Could parallel with Task 7 |
| 9 | Task G1 | Attachment orphan tracking + nightly sweep cron. Depends on Tasks 6 + 8. | — |
| 10 | Task 9 | Surface `docs_*` flags via `/api/auth/me`. Independent. | Parallel-safe with everything above once 5 lands |
| 11 | Task A1 | TipTap vendor self-host script + SRI + loader. Independent. | Parallel-safe |
| 12 | Task 11 | Sidebar + view dispatcher stub. Depends on A1. | — |
| 13 | Task 12 | Tree loader + render + add-page action. Depends on Tasks 6 + 11. | — |
| 14 | Task 13 | TipTap editor pane (the big one). Depends on Tasks 11 + 12 + A1. | — |
| 15 | Task I1 | Autosave retry + localStorage backup + recovery. Depends on Task 13. | — |
| 16 | Task 14 | Slack smart-card node. Depends on Task 13. | Could parallel with I1 |
| 17 | Task F1 | Drag-to-reparent in tree. Depends on Tasks 12 + 7 (uses move endpoint). | — |
| 18 | Task J1 | Mobile + a11y + keyboard shortcuts. Depends on Task 13. | Could parallel with F1 |
| 19 | Task 15 | Contextual Docs links on Gantt + Portfolio. Depends on Task 11. | Parallel-safe with 16 |
| 20 | Task 16 | Per-user perm checkboxes in user editor. Depends on Task 9. | Parallel-safe with 15 |
| 21 | Task 17 | Seed 6 default pages on first open. Depends on Task 6. | Could run earlier |
| 22 | Task L1 | Backup coverage extension. Independent. | Parallel-safe |
| 23 | Task 18 | Playwright e2e. Depends on everything frontend. | Last |
| 24 | Task 19 | Final test pass + restart prod + handoff entry. Last. | Last |

## How to resume in a fresh session

1. Open Claude Code in the worktree:
   ```bash
   cd /d/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/documentation-tab
   ```

2. First message to the new session:
   > Resume the WorkSage Documentation Tab build. Plan is at `docs/superpowers/plans/2026-05-02-documentation-tab.md`. Handoff with progress and resume sequence is at `docs/HANDOFF-documentation-tab.md`. Tasks 1-4 are done (commits 772518c through fd1f318). Pick up from Task 5 + B1 using subagent-driven-development — those are pure helpers with vitest, parallel-safe. Then march through the rest in the order in the handoff.

3. The first thing the new session should do is invoke the `superpowers:subagent-driven-development` skill, then dispatch Task 5 + B1 in parallel.

## Things to watch when resuming

- **TipTap version pin**: the plan says 2.5.9. If a fresh `npm view @tiptap/core version` says something newer, decide before Task A1 whether to bump or stay pinned.
- **`If-Match` semantics in Task 7 + D1**: read the existing PATCH endpoint pattern in `server.js` first — there's a `buildPatchQuery` helper that handles whitelisting. The new endpoint must respect that pattern AND add the optimistic-concurrency check.
- **Image leak fix in Task 8 + H1**: don't merge Task 8 without H1 — the simple-version image endpoint without scope checking is a real leak.
- **Reviewer gates per task**: per the subagent-driven-development skill, EACH task gets two reviews (spec compliance, then code quality) before marking complete. Don't skip — Glen has flagged this skipping pattern as a problem multiple times.
- **Worktree env files**: `.env` and `.env.test` were copied from main repo to the worktree. They are gitignored. If you re-clone or move worktree, copy them over.

## DB / file-system state confirmed

- `nbi_dashboard.documents` table — exists, 0 rows
- `nbi_dashboard.document_attachments` table — exists, 0 rows
- `nbi_dashboard.users.{docs_view,docs_edit,docs_create,docs_upload}` — all present, NBI users default true
- `nbi_dashboard.clients.{doc_default_view,doc_default_edit,doc_default_create,doc_default_upload}` — all present
- `nbi_dashboard_test` — same shape as prod
- No client portal users exist on prod, so the migration 035 `UPDATE` affected 0 rows (safe)

## NOT done

- No frontend changes yet (Tasks 11+ haven't run)
- No backend endpoints yet (Tasks 5+ haven't run)
- TipTap not vendored yet (Task A1 hasn't run)
- Prod is still on `master` at commit `b471ec9`. The worktree branch is unmerged. Do not merge until Task 19 has run (full test suite + restart).

## Don't merge to master mid-build

The branch should accumulate all 20 remaining commits before merging. Avoid the 2026-05-02 mistake where the import wizard fix was merged after the first half of the work, then the second half was found broken — see `docs/HANDOFF.md` from earlier today (or the master-branch version of it).
