# Handoff -- 2026-06-22 Push Gate Fix + Accumulated State

> **STALE** -- This handoff was fully executed in session 2026-06-22_session_2.
> All 5 commit batches committed and pushed. PostgreSQL restarted. Tests: 65/69 pass.
> See `projects/nbi_dashboard/session_logs/2026-06-22_session_2.md` for details.

## What Happened This Session

PUSH BLOCKED system-reminder was appearing on every tool call, making the session unusable. Root causes: a `snapshot:` commit on HEAD, and the push gate checking ALL dirty surfaces instead of just pushed surfaces. Fixed across 4 commits with 3 rounds of Codex adversarial review.

## What's Pushed (GitHub is current)

4 commits on master, all pushed:

| Commit | What |
|---|---|
| `ec327fa` | Gitignored harness runtime data (.claude/harness/data/), untracked settings.json, committed 54 pending files (candidate-files route, 25 rework scripts, frontend changes, session state) |
| `d69592a` | Push gate v1: scoped verification to committed surfaces only |
| `0620f05` | Push gate v2: Codex-reviewed multi-requirement fix, fail-closed, narrowed gitignore |
| `cf3c03e` | Push gate v3: aligned PreToolUse + PostToolUse policies, fail-closed snapshots, git -c regex fix. **Codex PASS** |

## Files Changed (key ones)

- `.claude/harness/lib/git-push.js` -- PostToolUse auto-push gate rewritten. Scoped to pushed surfaces, snapshot fail-closed, aligned policy with verification-gate.js
- `.claude/harness/lib/verification-gate.js` -- PreToolUse gate: gatePush() scoped to pushed surfaces, getPushedSurfaces() extracted, checkSnapshotInCommand() regex updated for git -c/-C variants
- `.gitignore` -- added: `.claude/harness/data/`, `.claude/harness/.claude/`, `**/graphify-out/`, `dashboard-server/projects/nbi_dashboard/`, `codex_*.md`, `tmpcodex_*.md`, `.claude/settings.json.pre-rho-migration`, `*.docx` (uncommitted)
- `.claude/harness/data/*` -- 7 files removed from tracking (git rm --cached)
- `.claude/settings.json` -- removed from tracking (was gitignored but tracked)
- `dashboard-server/routes/candidate-files.js` -- new route (hiring)
- `dashboard-server/scripts/rework-*.js` -- 30 interview question rework scripts across all disciplines

## What's NOT Pushed (dirty working tree)

### Must do first: restart PostgreSQL
The test DB has deadlocked connections from running npm test 5+ times in parallel background tasks this session. `pg_terminate_backend` fails with permission denied. Fix:
```
net stop postgresql-x64-16
net start postgresql-x64-16
```
Then verify: `cd dashboard-server && npm test`

### After DB restart, commit in this order:

**Commit 1: .gitignore + docs (no verification needed)**
```
git add .gitignore AGENTS.md CLAUDE.md NBI_Brain.md brain/clients_detailed.md dashboard-server/README.md docs/HANDOFF.md projects/nbi_dashboard/live_state/decisions.md projects/nbi_dashboard/session_logs/2026-06-21_session.md
```

**Commit 2: Granola transcripts (38 files, no verification needed)**
```
git add intelligence/raw/granola/
```

**Commit 3: Untracked scripts (4 art rework + extract)**
```
git add dashboard-server/scripts/rework-art-b2-r2.js dashboard-server/scripts/rework-art-b2-r3.js dashboard-server/scripts/rework-art-r1.js dashboard-server/scripts/rework-art-r2.js
```

**Commit 4: Clients/ deliverables (27 .md/.html files)**
```
git add Clients/
```

**Commit 5: Server code changes -- REQUIRES npm test + REVIEW**
These include BOTH pre-existing changes from prior sessions AND changes Codex made during its audit run. Codex ran `codex exec` with `sandbox: workspace-write` and made 6 snapshot commits adding logging features. Those commits were reset (undone) but the code changes remain in the working tree. Review before committing:

Pre-existing (from prior sessions):
- `dashboard-server/routes/interview.js` -- question bank logging
- `dashboard-server/server.js` -- mount order changes

Codex additions (review carefully):
- `dashboard-server/routes/attachments.js` -- mutation logging (+2 lines)
- `dashboard-server/routes/auth.js` -- auth operation logging (+25 lines)
- `dashboard-server/routes/client-notes.js` -- mutation logging (+8 lines)
- `dashboard-server/routes/contacts.js` -- mutation logging (+8 lines)
- `dashboard-server/routes/milestones.js` -- mutation logging (+8 lines)
- `dashboard-server/routes/queue.js` -- mutation logging (+4 lines)
- `dashboard-server/routes/settings.js` -- settings change logging (+6 lines)
- `dashboard-server/routes/users.js` -- user operation logging (+12 lines)
- `dashboard-server/routes/hiring-templates.js` -- logging fix
- `dashboard-server/routes/time-off.js` -- logging addition
- `dashboard-server/server.js` -- access logging middleware (+24 lines)

**Potentially hallucinated by Codex (check if these changes make sense):**
- `dashboard-server/cron/dreaming/brain-coherence.js` -- new file?
- `dashboard-server/cron/dreaming/index.js` -- new file?
- `dashboard-server/cron/dreaming/skill-coverage.js` -- new file?
- `dashboard-server/cron/index.js` -- modified
- `dashboard-server/lib/granola-sync.js` -- modified
- `dashboard-server/lib/slack-bot.js` -- modified
- `dashboard-server/routes/command-centre.js` -- modified

Untracked test files from Codex (in dashboard-server/tests/unit/):
- `access-logging.test.mjs`
- `auth-logging.test.mjs`
- `settings-logging.test.mjs`
- `route-logging-coverage.test.mjs`
- `request-id-propagation.test.mjs`

## Harness Design Decisions Made

1. **Push gate scoped to pushed surfaces** -- untracked working-tree files in non-pushed surfaces don't block pushes. Both PreToolUse (verification-gate.js) and PostToolUse (git-push.js) enforce identical policy.
2. **Fail closed** -- if pushed surfaces can't be determined (both diff attempts fail), push blocks. Snapshot check also fails closed on comparison failure.
3. **Clean pushed surfaces pass** -- the commit gate (PreToolUse on git commit) is primary enforcement. The push gate is defence-in-depth. Clean surfaces rely on the commit gate having verified them.
4. **Harness data gitignored** -- `.claude/harness/data/` contains runtime artefacts (events, sessions, entropy). Not source code. Fixes fingerprint instability from emit-event PostToolUse hook.
5. **Codex limitation noted** -- running `codex exec` with `sandbox: workspace-write` allows Codex to make commits. Future audits should use `approval: suggest` or read-only sandbox.

## Codex Review Summary

3 adversarial rounds, escalating thoroughness:
- Round 1: 5 findings (1 HIGH, 3 MEDIUM, 1 LOW) on v1 push gate
- Round 2: PASS on multi-requirement fix, accepted time-only limitation
- Round 3: PASS on aligned v3 gates with git -c regex fix

Accepted limitation: clean-surface evidence check uses type+recency, not content fingerprint. The commit gate prevents the scenario where evidence is for different content. Bypass paths are snapshot (caught) or external terminal (out of scope).
