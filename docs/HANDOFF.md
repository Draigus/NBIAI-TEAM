# HANDOFF -- AIOS Phase 2 Audit Fixes: CODE COMPLETE, VERIFICATION IN FLIGHT (2026-07-05 ~14:50 BST)

**Session model note:** This session started on Opus 4.6 by accident; Glen switched to Fable 5 mid-session and ruled: **Fable is THE model, 4.6 is last-resort only, flag to Glen if a session is ever running on 4.6** (decisions.md 2026-07-05, memory feedback_no_opus_47.md updated). All audit-fix work below was done on Fable.

**Session log (full detail):** `projects/nbi_dashboard/session_logs/2026-07-05_session.md`
**Supersedes:** the 2026-07-04 Phase 1/Phase 2 handoff. Phase 1 ACCEPTED. Phase 2 MERGED+LIVE but with defects now fixed on a branch awaiting merge (below).

---

## 1. WHERE THINGS STAND RIGHT NOW

1. **Phase 2 Signal Engine is LIVE on master and ran for real:** 10 meetings analysed, 18 signals, 18 aios_actions pending (8 people / 4 product / 3 business / 2 process / 1 risk; 17 task_create + 1 initiative_build). Tencent GBP 350K milestone surfaced as new intelligence not in the Brain.
2. **Glen must NOT tap Approve on those 18 actions yet.** The deployed (master) executor still has the 401 bug -- every approval would mark the action failed. The fix is committed on `fix/aios-phase2-audit` but NOT yet merged/deployed. (Failure is graceful, nothing breaks, but don't burn the queue.)
3. **Audit (Glen-ordered, because Phase 2/3 was coordinated on 4.6):** Codex GPT-5.5 review of the Phase 2 diff + independent Fable re-review. 6 confirmed code defects + 2 Phase 3 plan defects. ALL EIGHT FIXED. Zero deferred.
4. **A full `npm test` run in the fix worktree was IN FLIGHT when this handoff was written** (background task, started ~14:38, takes 10-17 min; earlier runs hit transient test-DB deadlocks when run concurrently with other work -- if it failed with deadlock 40P01, just rerun). Targeted suites already green: work-item-create 9/9, executor-audit-fixes 8/8, executor 5/5, executor-recipes 7/7, signal-engine-cli 8/8.
5. **Phase 3 has NOT started executing.** Plan exists and was corrected post-audit. Worktree exists but is currently checked out on the FIX branch.

## 2. THE AUDIT FINDINGS AND FIXES (all confirmed against code, all fixed)

Branch: `fix/aios-phase2-audit` in worktree `.worktrees/aios-phase3-widen-inputs/` (yes, the dir name says phase3 -- the branch was switched in place to avoid a 10-minute OneDrive worktree creation; branch names are what matter).

Commits on the branch: `2866192` (findings 1-3), `b758923` (findings 4-6). Plus on master: `cee1932` (plans + decisions), `987a05c` (brain_delta regen), `02fa189` (admin API parity + backup path + broker tests), `7b64aa4` (jsonb fix).

| # | Finding (evidence) | Fix |
|---|---|---|
| 1 | P1: executor recipes POST session-authed `/api/tasks` with internal token -> 401 always. `requireAuth` (lib/auth-middleware.js:78) has no internal-token bypass; internal routes mount before it (server.js:377) | Extracted `lib/work-item-create.js` from routes/tasks.js POST (1:1 port, validation single-sourced). New `POST /api/internal/aios/work-items` in routes/aios.js internal router (requireInternal, actor 'aios-executor', auditLog passed at server.js:374). tasks.js POST is now a thin wrapper (scope checks stay in route). Executor + buildInitiativePrompt point at the internal endpoint |
| 2 | P1: codex critique `execSync` interpolated research-brief text into a cmd.exe string (`\"` escaping unsafe on Windows) | Critique prompt written to `os.tmpdir()/aios-codex-critique-<uuid>.md`; `buildCodexCritiqueCommand(path)` is static apart from the controlled path; unlink in finally |
| 3 | P2: task_create sent `item_type:'task'` with no parent; roots must be initiative (tasks.js rule), so all 17 pending commitments would fail post-auth-fix | Deterministic parent resolution in executor: `resolveClientId` (name-LIKE; **clients table has NO slug column**), `resolveInboxParentId` find-or-creates an "AIOS Inbox" initiative per client (or global, client_id NULL). `isDescendantOrder` is `pi < ci` so task-directly-under-initiative is valid |
| 4 | P2: slack-bot immediate-executor catch left rows stuck `in_progress` (cron fetches only `pending`); log lied about retry | Catch now best-effort `markExecutionState(..., 'failed', {error})`, honest log |
| 5 | P2: `materially_new` on a rejected signal only enriched -- no visible re-raise | processSignal restructured: shared `createActionForSignal()`; rejected+materially_new -> enrich + NEW action + linkAction (status back to 'proposed'), returns `{action:'reraised'}` |
| 6 | P2: watermark = wall-clock, meetings filtered by meeting DATE -> late-imported meetings skipped forever | `fetchNewMeetings` filters `created_at > watermark` (import time), rows carry `_imported_at`, CLI fetch-meetings outputs `{meetings, max_imported_at}`; prompt Step 4 passes `--ts <max_imported_at>`, NEVER advances on empty runs, never wall-clock |
| 7 | Phase 3 plan invented `msgraph sendEmail --draft` -- msgraph.js has ONLY `sendEmail` (POST /sendMail, sends immediately). Would have SENT unpersonalised emails to BD contacts | Plan Task 3 rewritten: add `createDraft` (POST /users/{user}/messages -> Drafts folder) to `C:\Users\gpbea\.claude\connectors\lib\msgraph.js` (its OWN git repo; CLI auto-discovers exports at cli.js:89), live smoke test that draft lands in Drafts NOT Sent |
| 8 | Phase 3 plan used `bank:`/`lead:` fingerprint prefixes -- `validateFingerprint` only accepts person/topic/business/risk/process | Plan corrected: `business:lead_<uuid>:followup`, signal-type-matched prefixes for bank items, bank slug goes in source_id |

## 3. RESUME SEQUENCE (do in this order)

1. Check the full-suite result: background task output `C:\Users\gpbea\AppData\Local\Temp\claude\...\tasks\bmiw7mnfp.output` (or just rerun `cd .worktrees/aios-phase3-widen-inputs/dashboard-server; npm test`). Known pre-existing failure NOT ours: `ats-data-foundation.test.mjs` fails on missing relations in a stale test DB when run in some orders; the 40P01 deadlock is transient contention -- rerun. Gate: all AIOS-touched suites green + no NEW failures vs the 2026-07-05 baseline.
2. Merge: `cd D:\OneDrive\Claude_code\NBIAI_TEAM; git merge fix/aios-phase2-audit` (master has cee1932 ahead; expect clean merge -- fix branch touched server files, master commit touched docs only).
3. Deploy: `pm2 restart nbi-dashboard` then `pm2 restart nbi-slack-bot` (bot loads executor + bot-handlers at require time). No new migrations in the fix batch.
4. Live round-trip: seed an approved test action and run one executor cycle (temp .js INSIDE dashboard-server/, dotenv quirk):
   - INSERT INTO aios_actions (source_system, action_type, title, approval_state, execution_state, execution_recipe, idempotency_key, created_by_routine) VALUES ('test','task','E2E executor test','approved','pending','{"type":"task_create"}','test:executor2:'+epoch,'test')
   - run `runExecutorCycle` (see 2026-07-04 handoff pattern) -> expect success:true, a real task created under a global "AIOS Inbox" initiative -- verify in the dashboard UI (Glen sees it), then delete the test rows + the test task.
5. Tell Glen the 18 actions are safe to Approve. The 1 initiative_build (contractor vacation policy) will do a full headless build on approval -- watch `pm2 logs nbi-slack-bot`.
6. `node .claude/harness/lib/finish-task.js` before claiming the fix batch done. Update session log.
7. THEN resume Phase 3 execution: switch worktree back (`git checkout feature/aios-phase3-widen-inputs; git rebase master` or recreate branch from master), plan at `docs/superpowers/plans/2026-07-05-aios-phase3-widen-inputs.md` (6 tasks; Task 3 now includes the connectors createDraft step + separate commit in the connectors repo). Tasks 1/4/5 independent; 2->3 sequential; 6 last. Glen chose subagent-driven, but NOTE: the audit's root lesson is that fragmented subagents produced untested integration points -- controller must trace every cross-file contract itself (this session's fixes were done inline for exactly that reason).

## 4. GLEN RULINGS THIS SESSION (do not re-litigate)

1. **Fable 5 is THE model.** 4.6 only when Fable genuinely unavailable; 4.7/4.8 remain banned. Flag to Glen if a session is on 4.6.
2. **Audit before resuming Phase 3** -- done; fix-all, no deferring (per standing no-deferred-bugs rule).
3. **The 18 pending actions wait for the deploy** before any Approve taps.
4. Backlog items 1-4 from the 2026-07-04 handoff are DONE (admin API parity, brain_delta regenerated 969->30 lines with corrupt Dino=COO entry gone + 4 open items carried, backup cron path `cron/backups` -> `../backups`, broker test debt) -- commits `02fa189`, `987a05c`.

## 5. ENVIRONMENT FACTS / QUIRKS (beyond the standing ones in the 2026-07-04 handoff)

- Fix worktree: `.worktrees/aios-phase3-widen-inputs/` on branch `fix/aios-phase2-audit`, node_modules installed, .env + .env.test copied.
- `settings.value` is **jsonb** -- always `JSON.stringify` values (`7b64aa4`).
- `meeting_items.created_at` exists (migration 061) -- that's the watermark axis now. Current stored watermark `2026-07-05T13:49` wall-clock transitions cleanly to created_at semantics.
- NEVER `require('./slack-bot.js')` to syntax-check -- it boots a real Socket Mode bot against production Slack. Use `node --check`. (Happened this session; killed within seconds; prod bot PM2 id 6 unaffected.)
- Codex CLI review output does NOT reliably land in tmpcodex_*.md when run via `codex review --base` from Bash -- read the command's stdout.
- `.claude/connectors` is its own git repo (last commit `4449131`); commits there are separate from NBIAI_TEAM.
- Signal Engine watermark currently at ~2026-07-05T13:49; engine has processed everything up to the 2 Jul meetings. Next Granola sync 07:00 imports new meetings; signal-engine cadence is NOT yet in Task Scheduler (Phase 3 Task 6 registers it).
- Morning brief tomorrow (Mon 07:30) will show the 18 DO items (capped at 5) with buttons + LEVEL-UP section; harness-improvement runs Mon 09:00 and should report real event counts (P009 fixed in Phase 1).

## 6. OPEN ITEMS CARRIED (unchanged from before unless noted)

1. Phase 3 execution (plan ready, corrected).
2. buildActionBlocks single-sourcing; stdin-error handler test; Array.isArray guard in queueMessage (test debt from Phase 1 -- partially cleared by 02fa189).
3. Harness proposals P003-P008 await Glen; 15+ restricted CH extracts await Glen (23+ days).
4. Glen owes 18 CH director ratings + review dates.
5. Google OAuth credentials (unlocks Gmail ingestion + gmail createDraft path; msgraph createDraft is the working substitute meanwhile).
6. brain_delta open items: EU Withdrawal Button (URGENT gate), VDR ~22 Jul, bank splits decision, restricted extracts.
7. Phase 1 residue: `.claude/worktrees/aios-phase1-delivery-rail/` dir still lock-held on disk, delete manually.
