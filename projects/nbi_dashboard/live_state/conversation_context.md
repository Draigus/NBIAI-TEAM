<!-- DEPRECATED 2026-06-09: This file is no longer separately maintained. State is now captured within session log entries. See the most recent session log for current state. decisions.md remains the only separate live state file. -->

## 2026-06-21

- Glen requested an independent tooling recommendation on whether to keep graphify in the Claude Code workflow. Loaded Brain, working profile, and intelligence brief. No code/dashboard changes.

# Conversation Context

Updated 2026-05-07

---

## 2026-05-07

### What Happened

Glen requested a full bug triage from the WorkSage bug tracker. 15 items found: 6 already at please_review, 9 open. All 9 audited against the codebase to confirm root causes before fixing.

**Bug batch (8 fixes):**
1. Task sort order non-deterministic (ORDER BY tiebreaker)
2. People filter showing unassigned children (visibleIds extended)
3. Multi-user sync destroying focus (detail panel guard in _softReRender)
4. 5-digit years accepted in dates (client + server validation)
5. CSV import dropping due dates (parseDdMmYyyy + column name variants)
6. Features/stories can't auto-calculate dates (computeDateRange + disabled inputs)
7. Date paste not normalised (global paste handler for DD/MM/YYYY)
8. Warnings not dated (since field from updatedAt)

**Code review caught 3 additional issues:** missing ORDER BY tiebreakers on 3 other endpoints, no refresh on detail panel close, sync/changes endpoint missing year validation. All fixed.

**Gantt timeline bug:** Glen reported bars not landing where dragged. Root cause: toISOString() used UTC dates (off by 1 day in BST), plus deferred re-render caused visible jump. Fixed with local date formatting and removed deferred re-render.

**Client portal bug:** Lorenza (Couch Heroes) couldn't access dashboard. Root cause: client_role was null despite role being admin. Fixed in DB. Also found localStorage cache leak where previous user's data was visible on login switch. Fixed with user-change detection.

**Playwright verification:** agent-browser couldn't handle the SPA, but Playwright works. Created verify-bug-batch.spec.js with visual confirmation of sort order, year validation, auto dates, and no JS errors. Also fixed pre-existing buildMultiSelect null crash that was breaking all e2e tests.

### Current State
- Master at commit `2c2ee03`
- 387/387 unit tests passing (33 files, 3 new)
- Playwright e2e: smoke + tasks + verification passing
- PM2: all 5 processes online
- 1 parked bug: "Hide Done Hides All Tasks" (unreproducible)
- Gantt drag fixed but needs Glen's visual confirmation
- 8 bug tracker items set to please_review with fix comments

---

## 2026-06-04 - Couch Heroes Zone Population Architecture Reviews

Glen has iterated several versions of the Couch Heroes zone population architecture document and requested hostile technical review from network engineer, CTO, and senior engineering perspectives.

Latest pass: Glen provided `C:\Users\gpbea\.codex\attachments\90ee778c-06fa-4757-a031-ea20b68eb942\pasted-text.txt`, version 3.0. v3.0 is substantially stronger and now reads like a full technical specification. Remaining issues are mostly over-specific competitor implementation claims, prototype assumptions worded as capacities, corruption/housing implementation detail that needs caveats, and a cost-table high-end arithmetic mismatch.

Final document pass: Glen provided `C:\Users\gpbea\.codex\attachments\6289f8ac-276e-4a1f-91b4-c14415605ace\pasted-text.txt`. Architecture is aligned and defensible, but final clean-up is still needed before sending: soften Palia causality, correct WoW sharding/layering history, clarify hub players are not overworld zone-server load, make corruption/housing capacity statements prototype assumptions, fix cost high-end to about `$55.9K`, and distinguish inherent DDoS severity from residual risk after Spectrum.

- 2026-06-14 code review: flagged deep-link task validation issue in dashboard-server/public/js/nbi-sidebar.js.

- 2026-06-14: Glen/Claude requested sign-off review of RHO harness Tasks 1-5 fixes: path traversal, case-insensitive matching, corrupt lock handling, redaction of sensitive field names in values, and lock failure warnings.

- 2026-06-15: Reviewing CH_AI_Tool_Strategy_v2.md sections 3-5 for arithmetic, sensitivity floor issues, fabricated claims, missing CH constraints, and score clustering. Loaded CH bank and production_methods context.

- 2026-06-15: Glen requested adversarial code review of RHO harness shell-guard.js and test-shell-guard.js for governed path write bypasses, false positives, malformed input, fail-closed behaviour, and quote parsing.

- Review evidence: node .claude/harness/tests/test-shell-guard.js passed 42/42, but custom probes showed allowed governed writes via read-only-prefix chains, shell quote removal, wrappers, variable expansion, missing write commands, and PowerShell aliases.

- 2026-06-15: Round 4 shell-guard verification: full test suite passed 94/94 and all six requested wrapper + shell-exec/git probes blocked. New nested-wrapper bypasses remain, including `sudo env ... bash -lc`, `env ... sudo bash -lc`, `sudo command git restore`, `env ... command git restore`, `sudo env -i git restore`, and `env -S "bash -lc" ...`.

- 2026-06-15: Round 7 shell-guard verification requested after adding `GIT_WRITE_SUBCOMMANDS` to `segmentHasWriteKeyword`. Targeted probes show the Round 6 quoted and `--split-string` git write bypasses now block, and read-only controls still allow. Result is FAIL because `env -Sgit restore .claude/harness/lib/write-guard.js` still returns allow/no output.

- 2026-06-16: Reviewed Task 8 M6 session join key changes. Parser tests and emit-event tests pass, but review result is FAIL due to writeSessionIdToLog race/idempotency and session-log selection edge cases.

- 2026-06-16: Glen requested round 2 verification of Task 8 M6 session join key fixes in .claude/harness/lib/emit-event.js.

- 2026-06-16: Round 2 Task 8 verification result: PASS. Evidence: harness tests green and disposable probes confirmed lock serialisation, per-session idempotency, lexicographic latest log selection, and local date prefix use.

- 2026-06-16 17:19: Glen requested review of Task 9 M7 bootstrap metadata preservation in .claude/harness/lib/emit-event.js and .claude/harness/tests/test-metadata.js. Review only, report PASS or issues.

- 2026-06-16 17:23: Task 9 review completed. PASS, no issues found. Ran metadata test and full .claude/harness test sweep successfully.

- 2026-06-16: Glen requested a review of Couch Heroes AI Tool Strategy v2 sections 6-10, specifically `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2.md` lines 814-1552 against `HANDOFF_v4.md`, checking factual claims, arithmetic, score ranges, sensitivity floors, verdict consistency, British English, em dashes, and CH-specific constraints.

- 2026-06-16: Glen asked for adversarial review of Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2.md sections 3-5.
# 2026-06-17

- Glen requested an adversarial re-review of `docs/specs/phase1-apply-gate-hardening-plan.md` after revision, mapped against 18 prior findings and checked against apply gate source/config plus parent harness design spec.

- Glen requested review of Task 12 S9 file residue changes in `.claude/harness/lib/entropy-scan.js` and `.claude/harness/tests/test-entropy-residue.js`. Supplied tests passed 4/4, but review found issues in top-level fixture exclusion, basename-collision cross-reference false positives, and rename detection dependence on git config.

- 2026-06-17: Round 3 review of phase1 apply-gate hardening plan Rev 3. Full plan and parent spec checked. Pending response maps Round 2 findings to RESOLVED/STILL OPEN and flags new critical/high issues only.

- 2026-06-17: Round 4 review of phase1 apply-gate hardening plan Rev 3b. Scope is Round 3 still-open items and new CRITICAL/HIGH only. Initial result: stale instructions remain for `--approved` and role AGENT.md `create_or_delete`, despite the Rev 3b resolution text saying both were removed/deferred.

## 2026-06-17 - Convergence check: phase1 apply gate plan
- Loaded handoff/state: existing session log and live state files present; read NBI_Brain, intelligence brief, and senior_engineer role context. using-superpowers skill path advertised in environment was missing, so continued with repo rules.
- Glen asked for final convergence check on docs/specs/phase1-apply-gate-hardening-plan.md, specifically grep for --approved and create_or_delete and verify remaining references are not actionable stale instructions.
- Finding: --approved references are traceability/explanatory only, but create_or_delete still appears in actionable implementation instructions at lines 386 and 454 for the HIGH AGENT.md rule.

- 2026-06-17: Glen requested final convergence review of docs/specs/phase1-apply-gate-hardening-plan.md after scrubbing stale --approved/create_or_delete references and verifying classifier behaviour. Need answer YES/NO on CRITICAL/HIGH implementation blockers.

- 2026-06-17 review result: phase1 apply-gate hardening plan still has stale AGENT.md/create_or_delete instructions in actionable sections. Answer to blocker question: YES, HIGH blocking finding remains.

- 2026-06-17: Glen requested Round 3 Task 12 S9 verification after the basename-collision fix. Result: PASS. Existing entropy residue tests passed 4/4. Targeted mock-repo probes confirmed `foo.js.map` no longer marks new `src/foo.js` as referenced, top-level `fixtures/` remains excluded, and pure renames are recognised via `--find-renames` without emitting new-file residue.

- 2026-06-17: Glen requested review of Task 14 S11 transcript parser speaker scoping in `.claude/harness/lib/transcript-parser.js` and `.claude/harness/tests/test-transcript-parser.js`. Supplied tests pass 12/12, but targeted probes found fence parsing issues with longer outer fences containing inner shorter fences, plus indented fence and space-prefixed blockquote edge cases.

- 2026-06-17: Glen requested Round 2 Task 14 verification after fixes for fence marker length, indented blockquotes, and whitespace-trimmed metadata headers. Result: PASS. Parser tests passed 15/15 and targeted probes confirmed nested four-backtick/three-backtick fence handling, indented blockquote skipping, space-prefixed fence skipping, and space-prefixed metadata header skipping.
- 2026-06-17 04:09: Glen requested adversarial review of Phase 1 RHO harness hardening changes in `risk-classify.js`, `risk-policy.json`, and `test-risk-classify.js`, checked against the Phase 1 apply-gate hardening plan and parent harness design spec. Review is in progress.
- 2026-06-17 Phase 1 RHO review result: tests pass 30/30, but review found critical integration risk from no-operation classification with current apply-gate, plus high-severity fail-open behaviour for unknown action strings on overlapping higher/lower rules.
## 2026-06-17 - Task 15 bootstrap git history review

Glen requested review of S12 bootstrap git history changes in `.claude/harness/lib/bootstrap.js` and `.claude/harness/tests/test-bootstrap-git.js`. Review checked domain inference, idempotency, harness prefix detection, and event metadata. Local targeted test command `node .claude\harness\tests\test-bootstrap-git.js` passed 7/7. Review findings: harness detection is too broad because it uses `lower.includes('harness')` before prefix mapping; git history is marked bootstrapped even when `git log --oneline -50` fails.

[2026-06-17 10:31:25] Round 2 Task 15 verification started: checking harness commit inference and processGitHistory failure marker behaviour.

[2026-06-17 10:35:48] Round 2 Task 15 verification completed: bootstrap git tests passed 8/8; git failure marker remains git_history_bootstrapped:false; no blocking issues found.

[2026-06-17] Task 13 S10 tool outcome review completed: PASS. Checked `.claude/harness/lib/emit-event.js` `tool_outcome` classification and `.claude/harness/tests/test-metadata.js` Group 7. Metadata tests passed 16/16, emit-event tests passed 14/14, and targeted probes covered timeout regex variants plus non-string/non-number edge cases.

## 2026-06-17 RHO apply-gate review
Glen requested adversarial review of Phase 1 RHO harness apply-gate hardening: security holes, logic bugs, spec deviations, and test gaps across apply-gate.js, proposal-utils.js, and test-apply-gate.js against the system design and phase plan.

Review in progress: confirmed multiple apply-gate hardening issues, including missing target canonical cross-check, dirty-worktree overwrite risk, knowledge_section_only bypasses, duplicate evidence counting, and frontmatter schema weakness.

- 2026-06-17: Glen requested FINAL SIGN-OFF REVIEW of the committed 15-task RHO harness hardening plan. Scope: verify plan-to-commit coverage, all tests, regressions, active hooks, and production-grade quality for .claude/harness and .claude/settings.json.

- 2026-06-17: Glen requested final sign-off attempt 2 for RHO harness. Required process: stash parallel WIP, run all suites, confirm expected pass count, restore stash, report PASS or FAIL.

- Stash/pop could not be performed because the sandbox denied writing .git/index.lock. Verification will use a HEAD export to D:\tmp as the committed-state equivalent.

- Final sign-off evidence: exact committed-state 10-suite harness run returned suites=10 passed=327 failures=0. Report PASS with caveat that git stash/pop could not be used due .git/index.lock permission denial; HEAD export was used instead.

- 2026-06-17 22:20:11 Review task started: check only new/changed apply-gate.js Round 2 fixes for bugs/regressions/incomplete fixes.

- 2026-06-17 22:22:09 Review complete: reported only new apply-gate.js Round 2 issues.

## 2026-06-18
- Glen requested code review of RHO harness Phase 5-8 implementation, focused on emit-event, anti-regression, memory-conflict, reporting, mandatory-skills config, settings hook, and locked spec consistency.

- Review outcome: tests pass, but findings include anti-regression recurrence timing/matching bugs, memory conflict slug extraction bug, incomplete reporting template, and event capture gaps.

- 2026-06-18: User requested complete adversarial review of RHO harness improvement system against locked spec. Review completed; findings include critical apply-gate/proposal incompatibility, weak hash binding, incomplete hook/principal enforcement, redaction gaps, and cadence prompt drift.

## 2026-06-18 23:24:06
Glen requested a complete RHO harness audit after 4 convergence rounds, specifically checking the listed fix areas for remaining bugs or regressions.

## 2026-06-18 23:27:44
Completed RHO harness audit and prepared findings with severity, file references, root cause, and recommended fixes.

- 2026-06-18: Glen requested FINAL AUDIT of RHO harness after R5 fixes. Scope: read every file in .claude/harness/lib and .claude/harness/config, run every test in .claude/harness/tests, check scripts/cadence/prompts/harness-improvement.md, report only actual production bugs.

- Audit result: tests green, one actual harness guard gap found for Write/Edit to .claude/settings*.json bypassing write-guard.

## 2026-06-19
Glen requested an adversarial review of Claude's strict review of 1,390 interview questions, comparing KEEP verdicts against available industry benchmark question files. Art and Engineering benchmark files were present; `d:/tmp/research_best_other_questions.md` was missing after recursive search. Review output written to `d:/tmp/codex_adversarial_review.md`; verification confirmed the file exists and has zero U+2014/U+2013 dash characters.

Glen requested CONVERGENCE ROUND 3 final review of the RHO global migration plan at `docs/superpowers/plans/2026-06-19-rho-global-migration.md`, specifically the seven R2 fixes and `resolve.js` design soundness. Output should list only remaining issues or state `CONVERGED`.

Round 3 review result: not converged. Remaining plan issues are stale source/global workflow instructions, incomplete JSONL project tagging for `proposal_status.jsonl`, Python JSON validation in Task 6.3, stale deploy wording/checkpoint about tests, and stale `data/events/...` verification path in a guard test. `resolve.js` design itself passes the requested checks.

2026-06-19: Convergence round 4 review of RHO global migration plan found one remaining documentation consistency issue: stale 'copies lib/ and config/' wording remains outside deploy script comment.

2026-06-19: Glen requested strict scoring of all 50 QA interview questions in `D:\tmp\codex_review_QA.md` using `D:\tmp\codex_scoring_prompt.md`. Output written to `D:\tmp\codex_scores_QA.md`. Verification confirmed all source IDs were scored exactly once, 50 reasons were present, distribution was 5=11 / 6=9 / 7=7 / 8=17 / 9=6, average 6.96, and no Unicode dash characters were present.

- 2026-06-19: Glen asked to score all 200 Game Design interview questions from D:\tmp\codex_review_Game_Design.md against D:\tmp\codex_scoring_prompt.md and write D:\tmp\codex_scores_Game_Design.md.

- 2026-06-19: Glen asked Codex to score all 450 Art interview questions from D:\tmp\codex_review_Art.md using D:\tmp\codex_scoring_prompt.md and write D:\tmp\codex_scores_Art.md.

## 2026-06-19 03:58:00
- Session task: score Engineering interview questions from D:\tmp using the Codex scoring rubric. Refreshed stale intelligence brief first per session-start rule.

- 2026-06-19: Glen requested impartial scoring of HR/People interview questions. Completed scoring file at D:\tmp\codex_scores_HR_People.md. D:\tmp denied Set-Content writes, but apply_patch succeeded for the requested output file.

- 2026-06-19: Glen requested impartial 1-10 scoring of 100 Leadership interview questions. Completed scoring file in D:\tmp with 72 KEEP, 28 REWORK, 0 CUT; average 7.57.

- 2026-06-19: Completed Art scoring file at D:\tmp\codex_scores_Art.md; verified 450 unique IDs, 450 scores, 450 verdicts, 450 reasons, and summary.

- 2026-06-19: Game Design scoring task completed in workspace file; D:\tmp write was blocked by Access denied despite target file not existing.

- 2026-06-19: Glen requested strict impartial scoring of the Production interview question bank. Completed D:\tmp\codex_scores_Production.md with 128 KEEP, 62 REWORK, 0 CUT after recalibrating the first pass downward to avoid inflated scoring.

## 2026-06-19 04:49:49
- Engineering scoring complete and verified. D:\tmp write attempt failed with Access denied, so deliverable is in workspace root: codex_scores_Engineering.md.

## 2026-06-19 04:52:41
- D:\tmp\codex_scores_Engineering.md is the final verified Engineering scoring deliverable.
## 2026-06-20 -- Verification State Machine Final Lock Review

Glen requested adversarial final-lock review of `docs/specs/2026-06-19-verification-state-machine-design.md`. Task: verify R1-R10 and A1-A3 are adequately revised, then identify any new HIGH/MEDIUM/LOW findings and give LOCK or REVISE verdict.

Outcome prepared: REVISE. Blocking issues found in compound command gate handling, `test:all` dual evidence mechanics, Glen approval token forge protection, bug status update gate blocking, and PM2 deploy gate surface coverage.

## 2026-06-20 -- Verification State Machine Final Lock Round 2

Glen requested a constrained review of the second revision pass for `docs/specs/2026-06-19-verification-state-machine-design.md`, focusing only on Appendix "Round 3 revisions": R1b, R8b, R9b, R10b, and N1-N5. Codex loaded the spec, current session log, senior engineer role, and required session context. Output should mark each listed item ADEQUATE/INADEQUATE, list only genuinely new issues, and give LOCK or REVISE.

- 2026-06-20: Glen requested code review of RHO harness global migration changes. Scope: .claude/harness/tests isolation/cache clearing, reporting.js and write-guard.js bug fixes, remaining path leaks, deploy.js coverage, slug consistency, and event write paths.

- 2026-06-20: Glen requested final integration review of verification state machine spec after Round 4 RHO compatibility fixes C1-C5. Required sources: full spec, git-push.js, resolve.js, write-matrix.json, shell-guard.js lines 1-100. Output must be C1-C5 adequacy, new integration issues, and LOCK/REVISE verdict.

- 2026-06-20: Final integration review completed. C1-C5 all adequate; no new RHO/state-machine integration blockers found; verdict LOCK.

- 2026-06-21: Glen requested final adversarial review of Verification State Machine Phase 2 deployment against docs/specs/2026-06-19-verification-state-machine-design.md. Scope: gates, evidence types, dirty-state nudge, fingerprint invalidation, global gate ordering, snapshot escape, Glen approval token, command detector quote awareness, bypass paths, evidence completeness, compound commands, state races.

- 2026-06-21: Glen requested a no-change audit of Claude Code per-session overhead. Inputs supplied: 23K-25K token initial context, 311 permission allow-list entries, 35 additional directories, hook fan-out by tool type, duplicate verification-posthook global/project entries, broad matchers, injected reminders, and Sonnet subagent audit on every Agent completion. Output should rank waste by token and latency impact, estimate hook token cost for a 200-tool-call session, and assess whether the Agent audit is worth the cost.

- 2026-06-21: Glen challenged the overhead-reduction recommendation and asked for a blunt guard-by-guard assessment of whether current AI safety/process guards are necessary to prevent quality regression.
