# Handoff -- 2026-06-21 Hook Overhead Audit & Fix (Session 7)

## Session Summary

Audited per-session Claude Code overhead (hooks, context, permissions) with independent Codex (GPT-5.5) review at every step. Identified and fixed two config regressions where `if` guards were lost during the RHO harness migration, plus removed one verified duplicate hook. Also removed the graphify knowledge graph tooling (hooks, CLAUDE.md section, 56MB of files) after both Claude and Codex independently concluded it provides no value for this codebase size.

## What Changed

### 1. Graphify Removal (COMPLETE)

**Files changed:**
- `.claude/settings.json` (project): removed 2 PreToolUse hooks (Bash search reminder, Read|Glob reminder)
- `CLAUDE.md`: removed graphify section (lines 360-368)
- `.gitignore`: removed `graphify-out/` and `dashboard-server/graphify-out/` entries
- `graphify-out/`: deleted entire directory (56MB untracked -- graph.json, GRAPH_REPORT.md, cache, manifest)

**Why:** Both Claude and Codex independently assessed that for a medium-sized grep-friendly codebase (~150 meaningful files), the 25MB graph.json and 645KB GRAPH_REPORT.md cost more context than they save. The hooks fired on every Read, Glob, and Bash call, injecting ~50-100 tokens of reminder text per tool call. Behavioural evidence: near-zero actual usage despite instructions to use it.

**Safety net:** `dashboard-server/README.md` already covers architecture, hierarchy, modules, and key features.

### 2. Hook Scope Regression Fix (COMPLETE)

**File changed:** `C:\Users\gpbea\.claude\settings.json` (global)

**What was wrong:** During the RHO harness migration, `git-push.js` and `entropy-scan.js` lost their `if` guards. They fired on EVERY Bash and PowerShell command instead of only after git commits. This caused:
- `git-push.js` running full verification checks (git remote, git log, dirty state scan, evidence ledger, resolver) after every shell command
- PUSH BLOCKED messages injected into context on nearly every tool call (~50-150 tokens each, ~90 times per session)
- `entropy-scan.js` scanning `git diff HEAD~1 HEAD` after commands like `echo`, `ls`, `npm test` -- pointless
- `git-push.js` attempting `git push origin HEAD` after every shell command if verification happened to pass

**Fix applied:** Added `if` guards to all four entries:
- `"matcher": "Bash", "if": "Bash(git commit *)"` for git-push.js
- `"matcher": "Bash", "if": "Bash(git commit *)"` for entropy-scan.js
- `"matcher": "PowerShell", "if": "PowerShell(git commit *)"` for git-push.js
- `"matcher": "PowerShell", "if": "PowerShell(git commit *)"` for entropy-scan.js

**Codex review corrections incorporated:**
- Did NOT consolidate Bash + PowerShell into one `Bash|PowerShell` entry -- Codex verified that `if` guard syntax is tool-specific, existing working examples use separate entries
- Did NOT add git-push.js to `git push` commands -- the script runs `git push origin HEAD` itself, so it would double-push
- Noted that git-push.js checks dirty working-tree surfaces, not committed diff evidence -- a pre-existing design gap, not introduced by this fix

### 3. Duplicate verification-posthook.js Removal (COMPLETE)

**File changed:** `.claude/settings.json` (project)

**What was wrong:** `verification-posthook.js` was configured in BOTH global settings (matcher: `Bash|PowerShell|Edit|Write|MultiEdit|Read|WebSearch|Playwright`) AND project settings (matcher: `Bash|PowerShell`). Every Bash/PowerShell call ran it twice, producing:
- Duplicate evidence entries in the JSONL ledger (`fs.appendFileSync` -- not idempotent)
- Duplicate verification nudge messages injected into context

**History:** The project entry was added as a workaround per commit `f6a75aa` ("Global hook not firing"). The global hook now covers Bash|PowerShell.

**Fix applied:** Removed the project-level `Bash|PowerShell` verification-posthook entry. Global entry remains.

**Codex caveat:** Verify in a fresh Claude Code session that the global hook fires correctly for Bash/PowerShell. If it doesn't, re-add the project entry.

## What Was NOT Changed

All other guards remain exactly as they are. Both Claude and Codex independently assessed each guard against its incident history and concluded:

| Guard | Verdict | Incident it prevents |
|---|---|---|
| Verification state machine (commit/push/PR gates) | KEEP | Premature "done" claims (6 bugs shipped 2026-06-14, 3x on 2026-06-18) |
| Shell guard + write guard | KEEP | Governed path overwrites |
| Bank verify gate | KEEP | Unread bank commits (7 banks, restricted content leak 2026-06-11) |
| Deprecated file guard | KEEP | Writes to superseded state files |
| Client deliverable guard | KEEP | Fabricated facts (10 errors in CH report 2026-06-14) |
| Sonnet agent audit | KEEP | Unverified subagent output relayed as fact |
| Dashboard health check (Edit) | KEEP | JS errors shipped (2026-05-25, 2026-06-14) |
| Session start context (Brain, profile, memory) | KEEP | Context drift, wrong assumptions, American English |
| Entropy scan (now commit-only) | KEEP | Debug artefact accumulation |

## Estimated Per-Session Impact

- ~180 unnecessary hook executions eliminated (git-push + entropy-scan on ~90 non-commit shell commands)
- ~90 PUSH BLOCKED system-reminder injections eliminated (~4,500-13,500 tokens saved)
- ~90 duplicate verification-posthook executions eliminated
- ~100-300 graphify reminder injections eliminated (~5,000-30,000 tokens saved)
- Total estimated saving: ~15,000-45,000 tokens per session + 2-4 minutes of hook latency

## Verification Status

- Both settings files validated as correct JSON
- Hook entries verified: git-push.js and entropy-scan.js have `if` guards, verification-posthook duplicate removed
- **Settings changes take effect next session** -- current session still uses cached config
- **Next session:** confirm no PUSH BLOCKED messages after plain shell commands (e.g. `echo test`, `npm test`)
- **Next session:** confirm verification-posthook evidence ledger shows single entries per tool call, not doubles

## Outstanding Items (Not From This Session)

- 103 uncommitted files from prior sessions (client deliverables, harness runtime data, old screenshots)
- 311 permission allow entries in global settings -- ~200 are dead one-off commands. Governance cleanup, no runtime impact
- 35 additional directories -- some stale. Same category
- Sonnet agent audit fires on ALL Agent completions including low-risk Explore agents -- could be risk-gated but NOT a regression, just an efficiency opportunity
- git-push.js design gap: checks dirty working-tree surfaces, not committed diff evidence. After a clean commit with no remaining dirty files, it may push without PUSH BLOCKED even if the committed changes were never verified. Pre-existing, not introduced by this fix.

## Resume Sequence

1. Open new Claude Code session on NBIAI_TEAM
2. Run `echo test` -- confirm no PUSH BLOCKED message appears
3. Run `git status` -- confirm no PUSH BLOCKED message appears
4. If PUSH BLOCKED still appears on plain commands, the `if` guards aren't taking effect -- re-read global settings and check the entries
5. If verification-posthook is not recording evidence after Bash commands, the global hook isn't firing -- re-add the project entry
