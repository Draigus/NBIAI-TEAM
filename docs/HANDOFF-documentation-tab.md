# Handoff — Documentation Tab Build (in progress)

**Branch:** `feature/documentation-tab`
**Worktree:** `D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\documentation-tab`
**Branch tip (verified by `git log -1`):** `9d6104e` (2026-05-03 05:17:41 +0100)
**Master tip (untouched):** `b471ec9`
**Plan:** `docs/superpowers/plans/2026-05-02-documentation-tab.md` (committed on this branch)
**Spec:** `docs/superpowers/specs/2026-05-02-documentation-tab.md` (committed on this branch)

---

## ⚠️ READ THIS FIRST: Model Provenance

The previous controller session was **Opus 4.7** against Glen's hard rule (`feedback_no_opus_47.md` — always pin `claude-opus-4-6[1m]`).

**What was authored by which model (verifiable in `Co-Authored-By` lines of each commit):**

| Commit | Author of code | What it does |
|---|---|---|
| `b96ca5b` | Sonnet 4.6 (sub-agent) | Initial Task 7 + D1 + B1 server work + 12 tests |
| `4db5124` | Sonnet 4.6 (sub-agent) | Em-dash style fix |
| `e8e2fc7` | Sonnet 4.6 (sub-agent) | Security + race + cycle fixes (C1, I1, I2, I3, M1, M3, M4) |
| `23c413e` | Sonnet 4.6 (sub-agent) | imageInScope lib + 5 unit tests |
| `e6373a5` | Sonnet 4.6 (sub-agent) | Image upload + serve endpoints + H1 wiring + 13 tests |
| `a116f76` | Sonnet 4.6 (sub-agent) | Orphan-on-DB-error fix + disk-cleanup tests |
| `76428a6` | Sonnet 4.6 (sub-agent) | Task G1 attachment orphan tracking + 03:30 cron + 25 tests |
| `9d6104e` | Sonnet 4.6 (sub-agent) | G1 hardening (reconciliation order, sweep race, async unlink, query-string parse) |

**What the 4.7 controller personally edited** (NOT delegated to Sonnet):

1. **`dashboard-server/server.js:4374`** — added `date_trunc('milliseconds', ...)` to the PATCH UPDATE WHERE clause to fix a Postgres-microsecond vs JS-millisecond precision mismatch that caused all fresh-ETag PATCHes to 409 incorrectly. Diagnosed via `superpowers:systematic-debugging`. Verified by 7 then-failing tests turning green.

2. **`dashboard-server/tests/unit/documents.test.mjs:1014, 1028`** — replaced a `vi.spyOn(pool, 'query')` approach with a temporary `ALTER TABLE ... ADD CONSTRAINT _t8_test_block_pixel CHECK (filename <> 'pixel.png')` approach in the T8-Insert-Fail test. Root cause: server.js and tests/helpers/db.js each construct their own `Pool` instance, so a spy on the test pool never reaches the handler.

3. **`dashboard-server/tests/unit/documents.test.mjs:16`** — removed `vi` from `import { describe, it, expect, beforeEach } from 'vitest'` after the spy approach was abandoned. Cleanup-only.

These three edits are mechanically simple and were each verified by the test suite landing green. But Glen's hard rule is "no 4.7 ever" — a 4.6 reviewer should sanity-check them before the branch merges.

**Higher-risk 4.7 outputs to also re-review:**
- The implementer briefs (every "Pre-flight findings" section in this conversation's task dispatches) were written by 4.7. They include design judgements (e.g., "set orphaned_at = now() at upload time" as a quality bump on plan G1, "use raw req.params.filename + path.resolve + startsWith for traversal protection rather than basename"). The Sonnet implementers acted on those briefs. If a brief decision was wrong, the resulting code would mechanically encode the wrong choice.
- Reviewer prompts (the "Pre-loaded concerns" sections fed to the spec/code-quality reviewers) were also written by 4.7.

---

## Current state — verified by direct measurement

- **Vitest suite (run from `dashboard-server/` via `npm test`):** **319 passed across 28 files.** Confirmed at 2026-05-03 05:20 by direct run.
- **All migrations 033, 034, 035 already applied** to both `nbi_dashboard` (prod) and `nbi_dashboard_test`.
- **Master at `b471ec9` — branch unmerged.** Do not merge until Task 19.
- **No frontend changes** in this branch yet (Tasks 11+ are still TODO).
- **No code on production server** running this branch's behaviour. Prod is untouched at master.

## Tasks complete (per the master plan at `docs/superpowers/plans/2026-05-02-documentation-tab.md`)

| Plan task | Status | Commit(s) | Notes |
|---|---|---|---|
| Task 1 — Spec freeze | ✅ | `772518c` (earlier session) | Spec at `docs/superpowers/specs/2026-05-02-documentation-tab.md` |
| Task 2 — Migration 033 (documents) | ✅ | `616c4e1` (earlier session) | Already includes `body_text` + `pg_trgm` + GIN index — plan claim of "add later" was stale |
| Task 3 — Migration 034 (document_attachments) | ✅ | `bd2d631` (earlier session) | Already includes `orphaned_at` — plan claim of "add later" was stale |
| Task 4 — Migration 035 (perm flags) | ✅ | `fd1f318` (earlier session) | Per-user `docs_view/edit/create/upload` + per-client defaults |
| Task 5 — Server: redaction helper | ✅ | `b1b3fcc`, `3b04e53` (earlier session) | `redactNbiInternal` + `extractPlainText` exports |
| Task 6 — Server: list / read / create endpoints | ✅ | `66f5107`, `118d598`, `4dc53f1` (earlier session) | GET-list, GET-by-id, POST. Established no-`.data`-envelope convention |
| Task 7 — Server: update / delete endpoints | ✅ | `b96ca5b`, `4db5124`, `e8e2fc7` | PATCH + DELETE. Reparent via PATCH parent_id is in scope; the dedicated `/move` reorder endpoint is task F1 (not done) |
| Task 8 — Server: image upload + serve | ✅ | `e6373a5`, `a116f76` | POST `/attachments`, GET `/attachments/:filename`. Multer wrapped to map size/MIME errors to 400/413. File cleanup on every rejection path including DB error |
| B1 — body_text plain-text shadow column | ✅ | `b96ca5b` | `extractPlainText` invoked on PATCH body_json change with `dropNbiInternal: false` so write-time index keeps NBI-internal text |
| D1 — ETag/If-Match optimistic concurrency | ✅ (server only) | `b96ca5b`, `e8e2fc7` | GET emits `W/"<iso8601>"`. PATCH requires If-Match; missing → 428; mismatch → 409 with redacted current. Atomic via `WHERE date_trunc('milliseconds', updated_at) = ...`. **Frontend D1 (modal, ETag tracking on client) deferred to Task 13.** |
| H1 — image-in-NBI-block leak prevention | ✅ | `23c413e`, `e6373a5` | `imageInScope(body, filename, { dropNbiInternal })` walks JSON, matches via `endsWith('/' + filename)`. Wired into image GET handler for client portal users only |
| G1 — attachment orphan tracking + sweep | ✅ | `76428a6`, `9d6104e` | `orphaned_at` set at upload AND on PATCH-with-image-removed. Cron at `30 3 * * *` Europe/London. `runAttachmentSweep` exported for tests. DELETE handler uses recursive CTE for descendants and async unlink |

## Tasks remaining (in dependency order)

| # | Task | Depends on | Notes |
|---|---|---|---|
| 1 | Task 9 — surface `docs_*` flags via `/api/auth/me` | Task 6 | Most of the wiring already happened in Task 6 (`requireAuth` already loads `docsView/Edit/Create/Upload` onto `req.user` as camelCase). Task 9 is now JUST exposing those four flags in the `/api/auth/me` response. Should be 1 small commit + ~3 tests. |
| 2 | Task A1 — TipTap self-host + version pin + SRI | None | Plan pins TipTap 2.5.9; decide whether to bump or stay before vendoring. Independent — can run in parallel with Task 9. |
| 3 | Task 11 — Frontend sidebar + view dispatcher | A1 | Sidebar entry between Projects and People; `_docsLoadTree` stub. |
| 4 | Task 12 — Frontend tree loader + render + add-page action | 6 + 11 | Per-client tree, drag handlers stub for F1. |
| 5 | Task 13 — Frontend TipTap editor pane (the big one) | 11 + 12 + A1 | Includes the D1 conflict modal (Reload / Overwrite / Compare) and frontend autosave loop. |
| 6 | Task I1-FE — autosave retry + localStorage backup + recovery prompt | 13 | (Distinct from Task 7's I1 lost-update fix — confusing naming, Plan calls this "I1" too.) |
| 7 | Task 14 — Frontend Slack permalink smart card | 13 | Could parallel with I1-FE. |
| 8 | Task F1 — drag-to-reparent in tree (server `POST /api/documents/:id/move` + frontend) | 12 + 7 | Server endpoint with transactional renumbering of siblings. |
| 9 | Task J1 — mobile responsive + a11y + keyboard shortcuts | 13 | Could parallel with F1. |
| 10 | Task 15 — contextual Docs links on Gantt + Portfolio | 11 | Parallel-safe with 14. |
| 11 | Task 16 — per-user perm checkboxes in user editor | 9 | Parallel-safe with 15. **Watch:** Task 16 must add `docs_*` to `/api/users/:id` PATCH `allowedFields` AND ensure the existing user-cache eviction loop still runs (per the `requireAuth` comment at server.js around line 818). |
| 12 | Task 17 — bulk seed of starter pages on first open | 6 | Could run earlier — independent of frontend. |
| 13 | Task L1 — backup coverage extension | None | Independent. |
| 14 | Task 18 — Playwright e2e — full editor smoke test | All frontend | Last before Task 19. |
| 15 | Task 19 — final pass: restart prod + handoff entry | All | Master merge happens here. **Do not merge before this.** |

---

## How to resume

1. **First — switch the controller model** to `claude-opus-4-6[1m]`. Type `/model claude-opus-4-6[1m]` before doing anything else. Bare `/model opus` resolves to 4.7.

2. Open Claude Code in the worktree:
   ```bash
   cd /d/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/documentation-tab
   ```

3. **Validate the branch state matches this handoff** before doing any work:
   ```bash
   git log --oneline -10
   # Tip MUST be 9d6104e. If it isn't, stop and reconcile.

   cd dashboard-server && npm test
   # Must show 319 passed across 28 files. If lower, something has regressed.
   ```

4. **Sanity-check the three 4.7 edits** (read by hand, not by sub-agent):
   - `dashboard-server/server.js:4370-4380` — the WHERE clause with `date_trunc('milliseconds', ...)`. Confirm both LHS and RHS truncate to the same precision and the cast `$N::timestamptz` is correct.
   - `dashboard-server/tests/unit/documents.test.mjs:1006-1036` — the T8-Insert-Fail test. Confirm the `ALTER TABLE ADD CONSTRAINT` is in a `try`, the `DROP CONSTRAINT IF EXISTS` is in `finally`, the constraint name is unique, and the assertion is `expect(res.status).toBe(500)` followed by a directory-snapshot equality check.
   - `dashboard-server/tests/unit/documents.test.mjs:16` — the import line. Confirm `vi` is NOT in the destructure (since `vi.spyOn` was removed).

5. **Optionally re-run the spec + code-quality reviewer agents** on the cumulative diff `b471ec9..9d6104e` to get a 4.6 second opinion on the 4.7-orchestrated decisions before continuing.

6. **Resume from Task 9** (the trivially-small `/api/auth/me` exposure of the four `docs_*` flags). Use `superpowers:subagent-driven-development` to drive it.

7. After Task 9, **decide whether to proceed serially through 11-19 or to batch-parallel-dispatch where the dependency table above allows.** Glen's operating model is "team builds, Glen does UAT at the end" — no phase gates between batches.

---

## Things to watch when resuming

- **TipTap version pin (Task A1).** Plan says 2.5.9. Decide before vendoring whether to bump to current (3.x) — breaking-change check needed.
- **Image leak fix in Task 8 + H1: don't merge Task 8 without H1.** Already addressed — H1 is wired into the GET handler at `server.js:4603` inside the `if (isClientUser)` block. Verified by spec + code-quality review.
- **Reviewer gates per task:** per `superpowers:subagent-driven-development`, EACH task gets two reviews (spec compliance, then code quality) before marking complete. Glen has flagged skipping this pattern multiple times.
- **Verify implementer claims about test counts personally.** This branch's history includes one case (b96ca5b implementer's first run) where the agent's "all guards in place" was caught having a real Critical security flaw in code review (the C1 leak), and one case (76428a6 implementer's first run) where the agent's "DONE" was caught having a real Critical data-loss flaw in code review (the PATCH reconciliation order). Always run the suite yourself; always read the diff yourself; always feed pre-loaded concerns to reviewers so they don't miss subtle paths.
- **Never edit a committed migration.** Migrations 033, 034, 035 already shipped to prod. Plan claims of "modify migration N" are stale and must be ignored.
- **Worktree env files:** `.env` and `.env.test` were copied from main repo to the worktree at session start. They are gitignored.
- **Plan typos/drift the controller has caught and corrected:**
  - Plan B1 step 4 says "confirm NBI text NOT present in body_text" — actually false; spec is `dropNbiInternal: false` on write so body_text DOES contain NBI internal text for NBI-only search. Test asserts presence accordingly.
  - Plan G1 says "modify migration 034 to add orphaned_at" — column was there from the start. No migration edit happened.
  - Plan task 7 example tests use `res.body.data.X` envelope. Codebase convention from Task 6 is RAW response objects. All Task 7+ tests use raw shape.
  - Plan task 7 example PATCH code builds the WHERE clause inline. Codebase has `buildPatchQuery` at server.js:367 — current implementation uses it.
  - Plan task 8 example tests also use `res.body.data.url`. Same fix.
  - Plan task 8 example POST code uses snake_case `req.user.docs_upload`. requireAuth surfaces these as camelCase (`docsUpload`). All Task 7+ code uses camelCase.

---

## Open concerns parked as follow-ups (not blocking)

These are real but non-critical issues identified during code review that we agreed to defer:

1. **`updated_at` monotonicity at sub-millisecond resolution.** The PATCH UPDATE uses `date_trunc('milliseconds', ...)` for the optimistic-concurrency WHERE. Two writes that both complete inside the same millisecond would both see the same truncated `updated_at` and could potentially both succeed. Mitigation: change `updated_at = now()` in the SET clause to `updated_at = greatest(now(), updated_at + interval '1 millisecond')` so each UPDATE guarantees a millisecond increment. Trivial change. See `e8e2fc7` commit message for the original deferral note.

2. **Magic-byte sniffing of uploads.** Currently MIME is validated from the client-supplied `Content-Type` header only. A server-side magic-byte sniff (e.g. via `file-type` package) would catch a renamed-extension malicious file. Note in `e6373a5` commit message; not in scope for G1.

3. **DELETE existence-disclosure asymmetry on attachments.** `GET /api/documents/:id/attachments/:filename` for an NBI user with a valid doc id will serve any file in `uploadDir` whose stored_name they can guess (the H1 `imageInScope` check only runs for client portal users). Matches the existing `/api/attachments/:filename` permissiveness. Could be tightened with `WHERE document_id = $1 AND stored_name = $2` on the doc-attachment GET. Code reviewer flagged as Minor.

4. **G1 PATCH reconciliation logs `'warn'` on failure but doesn't surface to the user.** If reconciliation fails, the doc UPDATE has already succeeded; the user sees 200 but the orphan state is stale. Glen needs to decide whether to leave logging-only (current) or add a separate response field.

---

## DB / file-system state confirmed

- `nbi_dashboard.documents` — exists, columns match migration 033 (with `body_text` + `body_version` + `pg_trgm` GIN index).
- `nbi_dashboard.document_attachments` — exists, columns match migration 034 (with `orphaned_at` + partial index).
- `nbi_dashboard.users.{docs_view,docs_edit,docs_create,docs_upload}` — present, NBI users default true.
- `nbi_dashboard.clients.{doc_default_view,doc_default_edit,doc_default_create,doc_default_upload}` — present.
- `dashboard-server/uploads/` — directory exists, shared with legacy `task_attachments`.
- 03:30 daily cron registered in-process (visible in startup logs as "Attachment sweep scheduled for 03:30 daily (Europe/London)") but **only on the running server.js instance.** Worktree branch is not running on prod or staging — cron only fires when the process is up.

## NOT done yet

- Task 9 — `/api/auth/me` doesn't yet expose the four `docs_*` flags. requireAuth loads them onto `req.user` but the auth response doesn't surface them.
- All frontend tasks (10-18, F1, I1-FE, J1).
- TipTap not yet vendored (Task A1).
- Per-user perm checkboxes in user editor (Task 16).
- Seed-on-first-open (Task 17).
- Playwright e2e (Task 18).
- Final pass + master merge (Task 19).
- Prod still on master at `b471ec9`. Worktree branch unmerged. **Do not merge until Task 19.**

## Don't merge to master mid-build

Glen's directive: accumulate ALL remaining commits before merging. Avoid the 2026-05-02 mistake where the import wizard was merged after the first half of the work, then the second half was found broken.

---

## Process notes for the resuming session

- **Skill invocations honoured this session:** `superpowers:subagent-driven-development` (every task batch), `superpowers:systematic-debugging` (twice — for the date_trunc precision bug and the two-pool spy bug), `superpowers:verification-before-completion` (before each commit). `superpowers:writing-plans` was NOT invoked because this session was executing an existing plan, not authoring one.
- **Sub-agent dispatch pattern used:** general-purpose agent on Sonnet 4.6 for implementer; general-purpose on Opus for spec reviewer; superpowers:code-reviewer on Opus for code quality reviewer. Each task batch followed: implement → spec review → fix any spec gaps → code-quality review → fix any quality gaps → re-verify suite → commit. Two batches needed re-fix rounds (Task 7 + D1 + B1 had to fix C1/I1/I2/I3/M1/M3/M4 in `e8e2fc7`; G1 had to fix Critical reconciliation order + Important sweep race / async unlink / query-string parse in `9d6104e`).
- **Hooks fired multiple times this session:** PreToolUse skill gates reminded me to invoke skills before code edits; PostToolUse no-fabrication guardrails reminded me to verify sub-agent numbers personally. Both helpful.
- **Live state file updated:** `projects/nbi_dashboard/live_state/work_completed.md` has entries 197 + 198. Entry 199 for the G1 work was not written before this handoff — should be added by the resuming session if continuity is to be preserved through compaction.

---

## TL;DR

Branch `feature/documentation-tab` at tip `9d6104e`. 319/319 vitest. All server-side work for Tasks 1-8 + B1 + D1 + H1 + G1 landed via Sonnet 4.6 implementers. Three small surgical edits were made by the controller running on Opus 4.7 — listed at the top of this file with exact line references. **Switch to `claude-opus-4-6[1m]`** before continuing. Resume from Task 9.
