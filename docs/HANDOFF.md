# HANDOFF -- AIOS Phase 1 Delivery Rail: COMPLETE AND ACCEPTED 2026-07-04 ~15:30

**PHASE 1 ACCEPTED by Glen 2026-07-04 afternoon session.** Evidence: brief delivered with buttons and correct format (Glen screenshot); button taps verified in DB (2 approves, 1 skip, More leaves pending); DM conversation accepted after two fixes -- (1) thread context + ordered answers + threaded replies (cbddb75), (2) persistent Claude sessions per conversation via --session-id/--resume, migration 077, deployed 15:22 (894b756). finish-task.js: CLEAN. Session log has full detail. Worktrees cleaned up.

**Discovery worth knowing:** migrations are applied by the SERVER STARTUP runner, not init-db.js (CLAUDE.md corrected at f66fc54).

**Next:** Phase 2 (section 7) or follow-up backlog (section 6). Sections below are the pre-acceptance state, kept for reference.

---

**Written:** 2026-07-04 ~14:30 BST (session hit context limit mid-acceptance; Glen ordered handoff)
**Session log (full detail):** `projects/nbi_dashboard/session_logs/2026-07-04_session.md`
**Supersedes:** Session F handoff (2026-07-03). Its one open item is carried in section 6 (#10: Glen owes 18 CH director ratings + review dates).

---

## 1. What this session was

Glen asked for an AIOS audit ("not getting value, not proactive, no interaction") referencing Nate Herk. Full arc completed in one session:

1. **Audit** -> root cause: the AIOS produces reports, not actions; Glen had stopped reading the morning brief entirely.
2. **Spec** (Glen-approved): `docs/superpowers/specs/2026-07-04-aios-signal-engine-design.md` -- commits `874c80c` (core: Signal Engine, signal registry, Executor, Slack rail, graduated autonomy), `cb347b8` (Component 3a Quality Gates -- Glen's trust concerns), `18d5ef5` (Component 3b Weak-Model Resilience -- Glen flagged Fable going API-only ~5 days from 2026-07-04, Opus 4.6 is the weak fallback, 4.7/4.8 banned).
3. **Phase 1 plan:** `docs/superpowers/plans/2026-07-04-aios-phase1-delivery-rail.md` (commit `4448fc6`), 8 tasks.
4. **Execution:** subagent-driven development (fresh implementer + reviewer per task, fix rounds; every task had at least one real defect caught in review, including two plan bugs). Worktree branch `worktree-aios-phase1-delivery-rail`; per-task detail in `<worktree>/.superpowers/sdd/progress.md` (worktree at `.claude/worktrees/aios-phase1-delivery-rail/`, merged, safe to remove after acceptance).
5. **Merged to master:** `c8540b1` (16 commits, 17 files, +1305/-47). Full suite **76 files / 1001 tests green**, run first-hand by the controller pre-merge.
6. **Deployed:** migration 076 applied; `nbi-slack-bot` PM2 process LIVE (Socket Mode connected).
7. **Acceptance IN PROGRESS** -- first brief run failed the new rules, fixes committed, re-run was executing when this handoff was written. Section 4 is the pickup point.

## 2. What is deployed and running RIGHT NOW

| Thing | State | Evidence |
|---|---|---|
| `nbi-dashboard` (PM2 id 2, :8888) | Restarted on merged code, healthy | HTTP 200; "Applied migration 076" in out.log at 14:00:59 |
| Migration 076 (`draft_blocks JSONB` on `aios_outbound_queue`) | APPLIED | DB verified: column PRESENT, schema_migrations version 76. NOTE: first verification raced a slow startup (test-suite pool contention) and misread MISSING -- systematic-debugging resolved it, no fix was needed |
| `nbi-slack-bot` (PM2 id 6, NEW) | LIVE, Socket Mode connected | slack-bot-out.log: "Slack bot running (Socket Mode)", model claude-opus-4-6; error log empty |
| Slack app config | Done by Glen this session | Socket Mode on, `message.im` subscribed, Interactivity on, scopes sufficient (chat:write, im:history) |
| `dashboard-server/.env` | `SLACK_APP_TOKEN` added (verified live: apps.connections.open ok:true) + `AIOS_DISPATCH_MODEL=claude-opus-4-6` | Glen explicitly ACCEPTED the token-passed-through-chat risk; not rotated; do not re-raise |
| Cadence model map | `scripts/cadence/model-map.json`: morning-brief -> **claude-opus-4-6** (bumped after first-run failure), harness-improvement -> claude-opus-4-6, default sonnet | commit `772b7ae` |
| E2E test action | Seeded, `approval_state=pending`, awaiting Glen's button tap | id `e117ee5a-fdf7-46fb-9186-422ca7bae984`, title "E2E rail test - safe to approve", source_system `test`, risk_class high |

## 3. What Phase 1 built (all merged at `c8540b1`)

- **Task 1 -- P009 fix:** `scripts/cadence/prompts/harness-improvement.md` repointed to global namespaced events via `.claude/harness/lib/resolve.js` (names EVENTS_DIR / PROJECT_DATA_DIR / GLOBAL_DATA_ROOT bound in a new step 0). Root cause was scanner blindness (reading repo-local legacy dir), NOT capture failure -- events flowed all along (57 written live during this session). Proof point: Monday 2026-07-06 09:00 harness run should report real event counts for the first time since 2026-06-20.
- **Task 2 -- model routing:** `run-cadence.ps1` gains `-Model`, `-DryRun`, model-map lookup, banned-model guard (claude-opus-4-7*/4-8* prefixes + bare `opus`, case-insensitive, plus charset guard). Incident: the haiku implementer worked in the PARENT tree by mistake; controller repaired (stray pushed parent commit `6259a55` = model-map.json only, left deliberately, merged clean as identical add/add).
- **Task 3 -- `GET /api/internal/aios/actions`:** internal-token auth, state filter, limit clamped 1..200 default 50, ordering `array_position(ARRAY['critical','high','medium','low']) ASC, created_at DESC`. The plan's original `risk_class DESC` was alphabetical (medium first, critical LAST) -- caught in review, fixed, pinned by test.
- **Task 4 -- broker Block Kit:** `draftBlocks` through `queueMessage` -> `draft_blocks` JSONB -> `processQueue` passes `blocks` to chat.postMessage (text stays fallback). Migration 076 wrapped in 074's IF-EXISTS guard (test-DB baseline records a different historical 072; unguarded ALTER would halt the chain on fresh test DBs).
- **Task 5 -- `dashboard-server/lib/claude-dispatch.js`:** headless `claude -p` via stdin (Windows argv limits), shell:true + windowsHide, async, model policy guard + charset injection guard (`/^[a-z0-9.\-\[\]]+$/i`), stdin error handler, taskkill /PID /T /F on timeout (plain kill orphans the claude child under shell:true). Live smoke: `DISPATCH-OK` from the real CLI. Two brief defects proven by the implementer: vi.mock doesn't intercept CJS require (real CLI spawned during unit tests until replaced with require-cache patch); sync throw broke `rejects` assertions.
- **Task 6 -- Slack bot:** `dashboard-server/slack-bot.js` + `lib/bot-handlers.js` + ecosystem third app + @slack/bolt ^4.7.3. Glen-only on BOTH message and button paths; fail-closed boot (SLACK_BOT_TOKEN, SLACK_APP_TOKEN, GLEN_SLACK_USER_ID, DATABASE_URL + startup assertModelAllowed); buttons `aios_approve`/`aios_skip`/`aios_more` (value = aios_actions UUID) -> approve=approved/approved_unchanged, skip=rejected/rejected_not_worth, more=SELECT only; free-form DM -> claude-dispatch (model env-only -- shell-injection surface -- prompt contains no-fabrication + read-only rules); 3500-char truncation; pg pool error handler; bot_id/subtype loop guard.
- **Task 7 -- brief prompt:** `scripts/cadence/prompts/morning-brief.md` -> decision-queue (DO max 5 with buttons / KNOW max 3 / OVERNIGHT / LEVEL-UP Mondays, empty sections suppressed) + CONTENT RULES block (source named per item; client-applicability gate; no countdown repetition; no tense-flipping of planned events; honest brevity) + named suppressions added post-leak (see 4a). `brief_blocks.json` transient, gitignored (`d7bdf8e`).
- **Final whole-branch review (Fable):** READY TO MERGE; button contract traced end-to-end clean; model ban behaviourally identical in both implementations; merge-tree dry run zero conflicts. Its live-gating findings were fixed pre-merge (`35fa14c`).

## 4. ACCEPTANCE STATE -- the next session picks this up FIRST

### 4a. First brief run FAILED the new rules; fixes committed; opus re-run pending verification

First manual run (14:03, Sonnet): DM delivered but LEAKED "Google Play Catalog Access: 18 days" and "EA deal calendar" as URGENT with no named client (Glen: "what are these?"); used invented section names, 8 items vs cap 5; **never wrote brief_blocks.json -> NO BUTTONS sent**; E2E item absent. Root cause class: weak model ignoring a complex prompt + inputs carrying URGENT labels (pending_actions.md said "URGENT if applicable"; bank summary says "TIME-CRITICAL"). This is Component 3b's predicted failure, observed live on day one.

Fixes on master:
- `772b7ae`: pending_actions Google Play entry defused; CONTENT RULES gained named suppressions (Google Play + EA calendar banned unless a named client is confirmed affected -- input urgency labels do NOT override); morning-brief model -> claude-opus-4-6.
- `576f035`: **Glen ruling: NO client currently has live Android titles or EA exposure.** Google Play entry REMOVED from pending_actions. Both items dead unless facts change.

**RESOLVED before session end: the opus-4-6 re-run SUCCEEDED (14:36, exit 0, brief committed `1ff25c8`).** Verified first-hand: Slack sent:1 with Block Kit buttons (brief_blocks.json: 23 blocks, 5 button rows, action_ids aios_approve/skip/more correct); DO capped at 5, KNOW at 3; Google Play + EA calendar suppressed per Glen's ruling; email fallback 202. The model bump fixed the format failures -- the deterministic block-builder fallback (3b pattern) was NOT needed, but remains the agreed next step if any future run regresses. Remaining unverified: Glen's visual judgement of the DM + the button tap round-trip (4b).

### 4b. Remaining acceptance evidence (plan Task 8)

- [ ] Glen receives a correct decision-queue brief with buttons on his phone (he is AWAKE and engaged -- this was happening live)
- [ ] Glen taps **Tell me more**, then **Approve** on the E2E item; verify:
  `SELECT title, approval_state, feedback_signal FROM aios_actions WHERE id='e117ee5a-fdf7-46fb-9186-422ca7bae984';` -- expect `approved / approved_unchanged`. (Temp .js must live INSIDE dashboard-server/ -- dotenv doesn't resolve from %TEMP%.)
- [ ] Glen DMs the bot "Which clients are currently active?" -- grounded answer = CH, Lighthouse, Goals, Sarge (pre-funding), Blizzard. Fabricated names = fail; debug via `pm2 logs nbi-slack-bot`.
- [ ] `node .claude/harness/lib/finish-task.js` output included before declaring Phase 1 done.

### 4c. Useful discovery

`aios_actions` already holds **50+ pending items** from 1-2 Jul Granola 1:1s (Aris, Valeria, Lorenza, Sasha, Stefano) via the pre-existing granola-sync extraction -- day-one briefs have real content. Untriaged; expect bulk skip/approve from Glen once buttons work.

## 5. Glen rulings this session (do not re-litigate)

1. **Dino has NOT departed CH.** The "departed 30 June, knowledge transfer complete" claim was false in 3 Brain files -- fixed at `4e56853`. Dino = General Counsel (NOT COO; Aris is COO), still at CH, departure expected, date unconfirmed. Origin: yesterday's bulk-applied Brain delta (session F) carried it; the delta backlog itself is corrupt (section 6 #2). Confirmed harness intervention recorded: `evt_01KWP9ZQHAHSCXD657TK` (rejection/verification) -- Monday's diagnosis will read it now P009 is fixed.
2. **No client has Android titles / EA exposure** -- Google Play + EA calendar items closed.
3. **Slack app token risk accepted** (passed through chat; connection-level; Glen: "incredibly small"). Not rotated.
4. **AIOS direction:** action-first Signal Engine + WorkSage Slack bot. Hermes deferred -- NO second machine exists. Voice = Phase 4. Combine mechanical + strategic into ONE engine (no two-pass split).
5. **Model policy:** Fable while on subscription; Opus 4.6 fallback; 4.7/4.8/bare-opus banned (now code-enforced in run-cadence.ps1 AND claude-dispatch.js). Subscription-only; no metered API without explicit approval.
6. **Brief quality bar:** Glen rejected the old briefs as "mostly useless... partially made up" -- tone/content/actions. The CONTENT RULES exist because of this; a brief that fails them fails acceptance.

## 6. Follow-up backlog (priority order)

1. **Brief assembly hardening** if the opus re-run fails format (4a decision point).
2. **brain_delta.md regeneration** against the corrected Brain -- the delta backlog kept resurfacing the wrong Dino line after Glen's 2026-07-03 correction; it is stale/corrupt (~900 lines). Real task.
3. **Admin `GET /api/aios/actions` parity** (`dashboard-server/routes/aios.js` ~line 117): negative-limit 500 + no risk ranking (same defects the internal route had). Mirror the fixes + tests.
4. **buildActionBlocks single-sourcing:** exported + tested in bot-handlers.js, no runtime caller; brief prompt hand-builds equivalent JSON. Wire it (node one-liner in the prompt) or document the duplication.
5. **Test debt:** draft_blocks string-branch test; blocks-absence assertion for plain-text sends; `Array.isArray(draftBlocks)` guard in queueMessage when the first programmatic caller lands; stdin-error handler body test.
6. Cosmetic prompt trims: T1 inert GLOBAL_DATA_ROOT preflight allowlist entry; duplicated first-run sentence in harness-improvement step 1.
7. Pre-existing, unrelated: dashboard backup cron fails nightly at 02:00 (`pg_dump` not on PATH; `cron/backups` dir missing) -- errors in error.log daily.
8. Harness proposals P003-P008 still await Glen review (P009 RESOLVED by Task 1).
9. 15+ restricted CH extracts pending Glen approval since 2026-06-11.
10. **Carried from Session F:** Glen owes 18 ratings (6 per director) + formal review date/period for the CH director review drafts (`projects/couch_heroes/deliverables/2026-07-03-director-reviews/`, committed `5245312`, gaps marked [GAP]).
11. Google OAuth credentials (connectors SETUP.md step 7) -- unlocks Gmail ingestion + calendar in brief (Phase 3-4 dependency).

## 7. Phase 2 (next major work after acceptance)

Spec complete and Glen-approved (see section 1). Components: Signal Engine (ONE nightly analysis over new Granola meetings -> aios_actions at all altitudes, graduated autonomy by confidence x risk, hard exclusions: external comms/Brain canon/money/client-facing never auto-execute); `aios_signals` registry (fingerprints e.g. `person:lili_zhao:role_start`, enrich-not-repropose, rejected stays silent); Executor (approval -> construction via headless runs with role AGENT.md knowledge: WorkSage initiative trees, deep-research briefs); Quality Gates 3a (deliverable contracts incl. generated artefacts, generate + Codex adversarial critique max 2 loops, below-bar flagged never silently shipped, post-build read-back diff); 3b (checklist state machines in Postgres, code validators, golden exemplars, graceful flagged degradation). Acceptance = the two worked examples end-to-end: Lili Zhao -> approved finance function build-out built in WorkSage; MMO combat discussion -> research offer -> finished comparison brief. Go-live watermark: only meetings after deploy (139-meeting backlog untouched). Noise caps: 3 proposal pushes/day, 10 open max, 7-day auto-snooze, graduation only by Glen UAT. **Next step: writing-plans for Phase 2.**

## 8. Environment facts

- Repo: `D:\OneDrive\Claude_code\NBIAI_TEAM` (master, NOT pushed this session beyond the post-commit hook's own pushes -- check `git status -sb`). Merged worktree removable: `.claude/worktrees/aios-phase1-delivery-rail`.
- WorkSage :8888 prod (`nbi-dashboard`), :8887 staging. Bot: `nbi-slack-bot` (PM2). Bot logs: `dashboard-server/logs/slack-bot-{out,error}.log`.
- Internal API auth header: `x-nbi-internal-token` = `AIOS_INTERNAL_TOKEN` (dashboard-server/.env, dotenvx, 19+ vars).
- Endpoints: `POST/GET /api/internal/aios/actions`; `POST /api/internal/aios/outbound/send-and-process` (accepts `blocks`).
- Button contract: `aios_approve`/`aios_skip`/`aios_more`, value = aios_actions UUID.
- Cadence: 8 Task Scheduler jobs; runner `scripts/cadence/run-cadence.ps1 -Task <name> [-Model <id>] [-DryRun]`; prompts `scripts/cadence/prompts/`; registry `company/routines.md`; history `scripts/cadence/state/routine_runs.json` (perpetually dirty in status -- cadence commits it, leave it).
- Harness events (global): `%USERPROFILE%\.claude\harness\data\NBIAI_TEAM_aeb5ed\events\<date>\<session>.jsonl`.
- Quirks: temp .js needing dashboard deps must live INSIDE dashboard-server/; PowerShell multi-line `node -e` breaks -- use single-quoted here-string -> temp file; harness evidence needs literal test paths (not loop vars); `cd x; npm test` OK since 7e0ea68.

## 9. Resume sequence

1. Read this handoff + the tail of `projects/nbi_dashboard/session_logs/2026-07-04_session.md`.
2. Check the brief re-run (4a). Report the result to Glen honestly -- he is watching this specific output.
3. Format correct -> acceptance taps (4b), DB verify, finish-task.js, declare Phase 1 done, update session log + this handoff.
4. Format wrong -> build the deterministic block-builder (4a decision point), re-run, then acceptance.
5. Then Phase 2 writing-plans or backlog per Glen's call.
