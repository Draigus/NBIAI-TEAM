# HANDOFF -- AIOS Phase 3 (Widen Inputs) MERGED + E2E mostly done. Remainder: schtasks, nudge send-path test, draft approval E2E (2026-07-06 ~03:40 BST)

**Supersedes** the 2026-07-06 ~00:00 handoff (6d227a9). Session log: `projects/nbi_dashboard/session_logs/2026-07-06_session.md`. No background tasks running at handoff time.

## 1. CURRENT STATE (all verified)

1. **Master at `60fcf11`** (= d2a5621 Phase 3 merge + one cadence state commit from the live lead-scan run). 10 Phase 3 commits merged fast-forward from `feature/aios-phase3-widen-inputs`. NOT yet pushed to origin.
2. **Connectors repo** (`C:\Users\gpbea\.claude\connectors`, own git): `986bcb9` adds `createDraft` to `lib/msgraph.js`. Live-verified: returns `isDraft: true`, lands in Drafts folder, never sends.
3. **Azure**: app bff14f81 (NBI Hub Dashboard) now has **Mail.ReadWrite (Application)** granted with admin consent (done 2026-07-06 via Playwright with Glen logged in). Two smoke-test drafts sit in Glen's Drafts folder ("AIOS draft smoke test..."), safe to delete.
4. **Tests on merged master**: `npm test` 89 files / 1151 tests green. `npm run test:e2e` 93 passed / 1 skipped / 0 failed. PM2 `nbi-dashboard` restarted 03:15, health `/api/health` 200, "All migrations already applied", zero startup errors. No new migrations this phase.
5. **Live lead-scan E2E PASSED** (03:21 run, log `scripts/cadence/logs/lead-scan_2026-07-06_0321.log`): 13 stale leads found, 5 draft actions created (cap respected), 8 not actioned, 0 dupes. Verified in DB: all 5 `pending`/`pending`, Mike Palin correctly has NO email (no fabrication). All 999 days stale because `last_contacted` is NULL across the pipeline.

## 2. WHAT PHASE 3 SHIPPED (commits 6d227a9..d2a5621)

- **Task 1** (df7999f): `scripts/cadence/prompts/recompile-banks.md` step 5 routes client-relevant brain-delta items through `signal-engine-cli.js process-signal`. Brain discrepancies get NO execution_recipe (brain_edit had no handler -- fixed in final review).
- **Task 2** (9f97bfc): `dashboard-server/scripts/lead-scan-cli.js` (find-stale + build-draft commands) + 4 unit tests + `scripts/cadence/prompts/lead-scan.md` (nightly, max 5 drafts, enriched/skipped_duplicate dedupe) + model-map entry. Plan bug fixed: build-draft JSON arg is argv[3].
- **Task 3** (connectors 986bcb9; worktree 403d164 + 30511c4): `createDraft` in msgraph.js; `email_draft` executor recipe. `buildDraftCommand` returns an **argv array** consumed by `execFileSync` (no shell, injection class eliminated). No-recipient drafts return success with a note, no execution. `email_draft` is in the autonomy router's HARD_EXCLUSION_TYPES -- can never auto-execute.
- **Task 4** (71ef09b + 84c9a61): `scripts/cadence/prompts/midday-nudge.md` -- delta-only Slack DM at 14:00, suppressed when empty, max 4 items. Send script runs from repo root (morning-brief pattern) with token/action.id guards. `nudge_blocks.json`/`nudge_text.txt` gitignored.
- **Task 5** (1fd05e9): `scripts/cadence/run-cadence.ps1` retries once after 10s; on second failure creates an incident aios_action (idempotency `cadence-failure:<task>:<date>`); WARN when AIOS_INTERNAL_TOKEN unset.
- **Task 6a** (43cd5b5): `company/routines.md` registers signal-engine / lead-scan / midday-nudge.
- **Final-review fixes** (d2a5621): dotenv require path `require('./dashboard-server/node_modules/dotenv')` in midday-nudge AND morning-brief repo-root send scripts (repo root has no dotenv -- was mechanically broken); brain_edit recipe dropped; `>= 14` staleness boundary; runner logging; lead-scan prompt wording (omit `to` when no email).

Method: subagent-driven development, per-task adversarial review + fix cycles, final whole-branch review (Fable) verdict "Ready to merge -- Yes" after fixes. Design docs: plan `docs/superpowers/plans/2026-07-05-aios-phase3-widen-inputs.md`, spec `docs/superpowers/specs/2026-07-04-aios-signal-engine-design.md`.

## 3. REMAINING WORK (in order)

1. **Register the 3 Task Scheduler entries** (plan Task 6 step 4, exact commands):
   ```powershell
   schtasks /Create /TN "NBI\signal-engine" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\run-cadence.ps1 -Task signal-engine" /SC DAILY /ST 19:30 /F
   schtasks /Create /TN "NBI\lead-scan" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\run-cadence.ps1 -Task lead-scan" /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 20:00 /F
   schtasks /Create /TN "NBI\midday-nudge" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\run-cadence.ps1 -Task midday-nudge" /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 14:00 /F
   ```
   Verify: `schtasks /Query /TN "NBI\lead-scan"` etc. Existing 7 NBI tasks use the same pattern.
2. **Midday-nudge send-path test.** A manual run at night only proves suppression (delta window opens 07:30; nothing after it yet). Options: (a) wait for Monday 14:00 scheduled run with real delta -- the 5 lead drafts created 03:2x today do NOT count (before 07:30), but anything created after 07:30 Monday does; (b) to force a test: create any aios_action after 07:30, then `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task midday-nudge` and confirm Glen gets ONE Slack DM with buttons. Optionally run the suppression check any morning before new actions: log should end "No delta -- suppressed".
3. **Draft approval E2E (acceptance criterion 1, second half).** Glen approves ONE of the 5 pending lead drafts (AIOS Queue page `#aios` or Slack). Flow: Approve -> routing modal (pick client or "AIOS Inbox (no client)") -> executor cron (5 min) runs email_draft -> verify a draft appears in Glen's Drafts addressed to that contact with `[Glen: personalise this before sending]` in the body, and `execution_state='completed'` with the Graph message id in `execution_result`. NOTE: Tom Rieger draft's address `triegier@nbi-consulting.com` looks misspelt (rieger vs riegier) -- Glen check before sending. The 999-days-stale titles are correct behaviour (NULL last_contacted); populating `last_contacted` on leads would make future scans meaningful.
4. **Morning-brief send verification Monday 07:30**: d2a5621 changed its dotenv require -- the send block should now run without agent improvisation. Check Monday's log for a clean single-pass send.
5. **Worktree/branch cleanup** (removal timed out on OneDrive twice):
   ```
   git worktree remove .worktrees/aios-phase3-widen-inputs --force   # or: git worktree prune + manually delete the dir
   git branch -d feature/aios-phase3-widen-inputs
   ```
   Also delete leftover empty dirs in `.worktrees/`: `aios-approval-routing`, and assess `ats-wizard`, `aios-phase2-signal-engine` (branch fully merged? check), `spa-modularise`. The phase3 worktree dir contains only gitignored `.superpowers/sdd/` scratch (task briefs/reports/ledger) -- content is mirrored in the session log; safe to delete.
6. **Push master to origin** (10+ commits ahead). All surfaces verified this session (unit + e2e evidence recorded).
7. **Commit the session log** and this handoff.

## 4. OPEN ITEMS CARRIED

1. **5 pending lead drafts** await Glen triage (item 3 above). 18 pending signal-engine actions from before also still queue through routing.
2. **2 smoke-test drafts** in Glen's Drafts -- delete.
3. Harness proposals P003-P008, 15+ restricted CH extracts, Google OAuth credentials (Gmail input still blocked -- Phase 4), EU Withdrawal Button -- carried.
4. Codex adversarial pass never ran this phase (cross-AI review was Claude-only; final review was same-model). If Glen wants Codex: `codex review --base 6d227a9` on master covers the whole phase.
5. Deliverable PNGs modified by e2e screenshot tests (pre-existing dirty state) + `docs/HANDOFF_MAPS_SORT.md` untracked (maps task COMPLETE, file can be archived/deleted).
6. Phase 4 (out of scope, from plan): voice, Gmail input, calendar, Slack ingestion, Gmail drafts switch.

## 5. ENVIRONMENT / GOTCHAS FOR NEXT SESSION

- Cadence runner hardcodes `$repo` to the main checkout (`run-cadence.ps1:15`) -- worktree prompts are invisible to it until merged. Model-map: lead-scan + midday-nudge on `claude-sonnet-4-6`.
- Repo-root `node -e` scripts must require dotenv via `./dashboard-server/node_modules/dotenv`. Blocks that `cd dashboard-server` first use plain `require('dotenv')`.
- DB session timezone is Europe/London (verified live) -- the 07:30 nudge boundary is correct as written.
- `.superpowers/` is gitignored; SDD ledger/briefs/reports lived in the phase3 worktree only.
- The e2e "1 skipped" is pre-existing (was 1 skipped in the previous handoff too).
- Lead-scan runs headless claude ~9 min; its prompt commits `routine_runs.json` (hence 60fcf11).
- Graph app token cache: new Azure permissions can take up to ~1h on cached tokens; fresh requests picked it up immediately this session.
