# Handoff — Documentation Tab Build (in progress)

**Branch:** `feature/documentation-tab`
**Worktree:** `D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/documentation-tab`
**Plan:** `docs/superpowers/plans/2026-05-02-documentation-tab.md` (now committed on this branch)
**Spec:** `docs/superpowers/specs/2026-05-02-documentation-tab.md` (already on branch)

## Done so far (commits on `feature/documentation-tab`)

| Commit | Task | What |
|---|---|---|
| `772518c` | Task 1 | Spec freeze — captured all 7 Glen-approved decisions |
| `616c4e1` | Task 2 | Migration 033 — `documents` table + `pg_trgm` + `body_text` shadow column + GIN trigram index |
| `bd2d631` | Task 3 | Migration 034 — `document_attachments` with `orphaned_at` for 24h grace cleanup |
| `fd1f318` | Task 4 | Migration 035 — per-user `docs_view/edit/create/upload` flags + per-client defaults |
| `a7f54dd` | docs | Earlier handoff |
| `22be075` | docs | Plan file copied onto branch (was missing from commit 772518c despite that commit's message claiming it landed) |
| `b1b3fcc` | Task 5 + B1 helpers | `lib/redact-nbi-internal.js` exports `redactNbiInternal` + `extractPlainText`. 13 vitest cases. |
| `3b04e53` | Task 5 polish | Removed em dashes from JSDoc; softened shallow-copy non-mutation claim. |
| `66f5107` | Task 6 | Three endpoints (`GET /api/documents`, `GET /api/documents/:id`, `POST /api/documents`). Extends `requireAuth` to load `docs_view/edit/create/upload` onto `req.user` as camelCase (`docsView`, `docsCreate`, etc). 8 new tests. |
| `118d598` | Task 6 fix | Removed `afterAll(end)` from `documents.test.mjs` that was killing the shared pg pool for every subsequent test file. Suite back to green. |
| `4dc53f1` | Task 6 polish | Code-review fixes: explicit projection on GET-by-id (was `SELECT *`, leaked `body_text`), `String(title)` coercion, cache-eviction warning comment in `requireAuth`, plus the parallel `docs_create=false` denial test. |

**Tip of branch: `4dc53f1`. Master tip: `b471ec9` (untouched — DO NOT merge until Task 19).**

All three migrations applied to **both** `nbi_dashboard` (prod) and `nbi_dashboard_test`.

**Full vitest suite: 248 passing across 27 files at `4dc53f1`.**

## Resume sequence

13 tasks remain. Recommended order:

| # | Task | Notes | Parallel-safe with |
|---|---|---|---|
| 1 | Task 7 + D1 | Update/delete/move + ETag/If-Match optimistic concurrency. **Plus the deferred B1 integration test.** Depends on Task 6. | — |
| 2 | Task 8 + H1 | Image upload + serve + `imageInScope` leak prevention. Depends on Task 6. | Could parallel with Task 7 if implementer is careful with server.js merge surface |
| 3 | Task G1 | Attachment orphan tracking + nightly sweep cron. Depends on Tasks 6 + 8. | — |
| 4 | Task 9 | Surface `docs_*` flags via `/api/auth/me`. **Note:** the requireAuth-side surfacing already happened in Task 6 (`66f5107`), so Task 9 is now JUST the `/api/auth/me` exposure. | Independent |
| 5 | Task A1 | TipTap vendor self-host script + SRI + loader. | Parallel-safe |
| 6 | Task 11 | Sidebar + view dispatcher stub. Depends on A1. | — |
| 7 | Task 12 | Tree loader + render + add-page action. Depends on Tasks 6 + 11. | — |
| 8 | Task 13 | TipTap editor pane (the big one). Depends on 11 + 12 + A1. | — |
| 9 | Task I1 | Autosave retry + localStorage backup + recovery. Depends on Task 13. | — |
| 10 | Task 14 | Slack smart-card node. Depends on Task 13. | Could parallel with I1 |
| 11 | Task F1 | Drag-to-reparent in tree. Depends on 12 + 7 (uses move endpoint). | — |
| 12 | Task J1 | Mobile + a11y + keyboard shortcuts. Depends on Task 13. | Could parallel with F1 |
| 13 | Task 15 | Contextual Docs links on Gantt + Portfolio. Depends on Task 11. | Parallel-safe with 14 |
| 14 | Task 16 | Per-user perm checkboxes in user editor. Depends on Task 9. | Parallel-safe with 15 |
| 15 | Task 17 | Seed 6 default pages on first open. Depends on Task 6. | Could run earlier |
| 16 | Task L1 | Backup coverage extension. Independent. | Parallel-safe |
| 17 | Task 18 | Playwright e2e. Depends on everything frontend. | Last |
| 18 | Task 19 | Final test pass + restart prod + handoff entry. Last. | Last |

## How to resume

1. Open Claude Code in the worktree:
   ```bash
   cd /d/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/documentation-tab
   ```

2. First message:
   > Resume the WorkSage Documentation Tab build. Plan: `docs/superpowers/plans/2026-05-02-documentation-tab.md`. Handoff: `docs/HANDOFF-documentation-tab.md`. Tasks 1-6 done (branch tip `4dc53f1`, 248/248 vitest passing). Pick up from Task 7 + D1 + the deferred B1 integration test, using `superpowers:subagent-driven-development`.

## Things to watch when resuming Task 7 + D1

- **Task 7 = update / delete / move endpoints.** PATCH, DELETE, plus a "move" endpoint (reparent + reorder).
- **D1 = ETag / If-Match optimistic concurrency.** GET response should include an `ETag` header, PATCH should require `If-Match`, mismatch = 409 Conflict with the current state in the body. Frontend will use this for the conflict modal in Task 13.
- **Deferred B1 integration test** (plan line 2115): "PATCH a body with NBI block, query `body_text`, confirm NBI text NOT present." This requires Task 7's PATCH endpoint, AND requires the PATCH handler to compute `body_text = extractPlainText(body, { dropNbiInternal: false })` on every body_json update and write both columns in the same UPDATE. The B1 spec (plan lines 2103-2115) is clear about this.
- **`buildPatchQuery` helper exists in server.js** for safe field whitelisting on PATCH endpoints. Use it; don't roll your own. The new endpoint must use this AND add the optimistic-concurrency check.
- **Cache eviction**: PATCH on a doc body doesn't need user-cache eviction. But Task 16 (per-user perm UI) WILL need to add `docs_*` to the `allowedFields` in PATCH `/api/users/:id` AND ensure the existing eviction loop still runs. The new comment in `requireAuth` (commit `4dc53f1`) calls this out.

## Things to watch generally

- **TipTap version pin**: plan says 2.5.9. Decide before Task A1 whether to bump or stay pinned.
- **Image leak fix in Task 8 + H1**: don't merge Task 8 without H1 — the simple-version image endpoint without scope checking is a real leak.
- **Reviewer gates per task**: per the subagent-driven-development skill, EACH task gets two reviews (spec compliance, then code quality) before marking complete. Don't skip — Glen has flagged this skipping pattern as a problem multiple times.
- **Verify implementer claims about test counts.** This session's Task 6 dispatch had the implementer falsely claim "66 failures are pre-existing" — they were actually freshly introduced by code the implementer wrote. Always run the full suite at the prior commit before accepting a "pre-existing failures" claim. The fix took 2 lines once the lie was detected.
- **Worktree env files**: `.env` and `.env.test` were copied from main repo to the worktree. They are gitignored.

## DB / file-system state confirmed

- `nbi_dashboard.documents` — exists, 0 rows (production), test DB shape matches.
- `nbi_dashboard.document_attachments` — exists, 0 rows.
- `nbi_dashboard.users.{docs_view,docs_edit,docs_create,docs_upload}` — all present, NBI users default true.
- `nbi_dashboard.clients.{doc_default_view,doc_default_edit,doc_default_create,doc_default_upload}` — all present.

## NOT done yet

- No PATCH / DELETE / move endpoints (Task 7).
- No image upload (Task 8).
- No `body_text` integration in PATCH (Task B1 server portion).
- No frontend changes (Tasks 11+).
- TipTap not vendored (Task A1).
- Prod still on `master` at `b471ec9`. Worktree branch unmerged. **Do not merge until Task 19.**

## Don't merge to master mid-build

The branch should accumulate all remaining commits before merging. Avoid the 2026-05-02 mistake where the import wizard fix was merged after the first half of the work, then the second half was found broken.
