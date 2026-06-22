# Verification State Machine -- Design Spec

**Date:** 2026-06-19 (revised 2026-06-20)
**Status:** LOCKED (2026-06-20) -- 4 Codex adversarial rounds (27 items, all ADEQUATE, RHO integration verified)
**Scope:** Mechanical enforcement system to prevent unverified work from reaching downstream actions (commits, deploys, status updates)
**Parent context:** CLAUDE.md Quality Non-Negotiables, RHO harness improvement system
**Revision basis:** R1-R10 + A1-A3 (round 2), R1b-N5 + R10c (round 3), C1-C5 (round 4 -- RHO compatibility)

---

## 1. Problem

The model's #1 failure mode is declaring work complete without verification. 14 documented incidents across 82 days. 27 HARD RULES in prompt/memory have not fixed it.

**Root cause (converged analysis, Claude + Codex):** Closure bias plus weak state binding. The model completes an implementation path, its conversational objective shifts to summarising success, and the edit becomes a proxy for completion. Verification is a separate obligation that gets dropped under context load, tool friction, or the desire to provide a clean answer. Prompt rules fail because they are memory constraints, not control constraints -- they rely on the same model that is failing to enforce them at the exact moment of failure.

**Architectural constraint:** Claude Code has no outbound-message hook. The model's text output is not interceptable. No design can mechanically prevent a false completion claim in chat.

**What IS achievable:** Mechanically prevent the downstream DAMAGE (unverified commits, deploys, status updates) while making the upstream CLAIM harder, more visible, and auditable.

**Success criteria:** The system prevents unverified commits/deploys/status changes, continuously reminds the model of dirty state, requires evidence for approved completion paths, and detects violations fast.

---

## 2. Architecture -- Five Layers

### Dependency Direction (architectural correction)

```
git-fingerprint -> surface-classifier -> [evidence-ledger] -> resolver -> gate
```

Each layer depends only on layers to its left. No cycles. The resolver COMPUTES satisfaction from the live git fingerprint and the evidence ledger -- there is no cached "clean" state to manage or invalidate.

---

### Layer 1: Diff-Based Dirty-State Tracker + Surface Classifier

**Purpose:** Track which code surfaces have unverified changes. Uses actual git diff, not just Edit/Write hook events, so shell edits, formatters, generators, and migrations are all captured.

**State file:** `R.PROJECT_DATA_DIR/verification_state.json` (per-project via resolve.js)

```json
{
  "surfaces": {
    "server": {
      "dirty": true,
      "files": ["dashboard-server/routes/tasks.js", "dashboard-server/lib/auth-middleware.js"],
      "fingerprint": "a1b2c3d4e5f6..."
    },
    "frontend": {
      "dirty": false,
      "files": [],
      "fingerprint": null
    }
  },
  "scan_head": "abc1234"
}
```

**Surface fingerprint (R3):** A hex digest computed from `sha256(sorted([filepath + ":" + blobHash, ...]))`. For tracked modified files, `blobHash` comes from `git hash-object <file>` (working tree content). For committed unchanged files, from `git ls-tree HEAD`. For untracked files, from `git hash-object <file>`. This is content-based: if a file is edited back to its original content, the fingerprint returns to its clean state. Timestamps are not used for evidence validity.

**Surface categories and file patterns (R4 + R5):**

| Surface | File patterns |
|---|---|
| `server` | `dashboard-server/routes/**`, `dashboard-server/lib/**`, `dashboard-server/server.js`, `dashboard-server/cron/**`, `dashboard-server/scripts/**`, `dashboard-server/*.js` |
| `frontend` | `nbi_project_dashboard.html`, `dashboard-server/public/js/**`, `dashboard-server/public/css/**` |
| `tests` | `dashboard-server/tests/**` |
| `migrations` | `dashboard-server/migrations/**` |
| `config` | `dashboard-server/package.json`, `dashboard-server/package-lock.json`, `dashboard-server/ecosystem.config.js` |
| `docs` | `*.md`, `docs/**`, `brain/**`, `roles/**` |
| `client_deliverables` | `Clients/**` |
| `intelligence` | `intelligence/**` |
| `harness` | `.claude/harness/**` |

`dashboard-server/*.js` in the server surface catches top-level JS files (init-db.js, etc.) not matched by more specific patterns. Files matching multiple surfaces are assigned to the most specific match (longest prefix wins). Root `*.md` files (CLAUDE.md, README.md) match the docs surface. Files matching NO surface are unclassified and not gated -- this is by design. RHO can detect recurring unclassified changes and propose surface map updates.

**Not tracked:** `.env*` files are typically gitignored and invisible to `git diff`/`git ls-files --others --exclude-standard`. Environment config changes are a deployment concern outside the scope of this system.

**Scan mechanism:** After every file-affecting tool call, the hook runs:
1. `git diff --name-only` (modified tracked files)
2. `git diff --cached --name-only` (staged files)
3. `git ls-files --others --exclude-standard` (new untracked files)
4. Categorises each changed file into surfaces
5. Computes content fingerprint per dirty surface
6. Writes updated state file

**Scan modes (R2):**

- **Async scan:** PostToolUse on Edit/Write/Bash/PowerShell. Zero latency impact. Feeds Layer 5 nudges and reminders. For Bash/PowerShell, only scans if the command is not obviously read-only (skip for `grep`, `cat`, `ls`, `git log`, `git status`, `git diff`, `echo`).
- **Synchronous rescan:** Runs INSIDE every Layer 4 blocking gate, immediately before the gate decision. Ensures gates act on current state, never on a stale async cache. The async scan is a performance optimisation; the synchronous rescan is the enforcement path.

**No clearSurface() (architectural correction):** Dirty state is never explicitly cleared. The resolver (Layer 3) computes satisfaction by comparing current fingerprints against evidence fingerprints in the ledger. When code is committed, the next scan produces a new (clean) fingerprint, and the cycle resets naturally.

---

### Layer 2: Evidence Ledger

**Purpose:** Record structured verification evidence with content fingerprints to determine whether evidence covers the current state.

**Ledger file:** `R.PROJECT_DATA_DIR/evidence_ledger.jsonl` (per-project via resolve.js)

Each line is a verification record:

```json
{
  "id": "EV-20260619-100200-unit",
  "ts": "2026-06-19T10:02:00Z",
  "type": "unit_test",
  "command": {
    "raw": "npm test",
    "resolved": "npx vitest run",
    "cwd": "d:/OneDrive/Claude_code/NBIAI_TEAM/dashboard-server"
  },
  "exit_code": 0,
  "git_head": "abc1234",
  "branch": "master",
  "surface_fingerprints": {
    "server": "a1b2c3d4e5f6...",
    "frontend": "f6g7h8i9j0k1..."
  },
  "surfaces_covered": ["server", "frontend", "migrations"],
  "result_summary": "767/767 passed",
  "session_id": "ses_01ABCD"
}
```

**Semantic command detection (R8):** Evidence detection resolves the actual command and working directory rather than substring matching. The detector:

1. Splits compound commands at shell combinators (`&&`, `||`, `;`) into segments
2. Resolves the working directory from any `cd` prefix or the current tool working directory
3. Matches each segment against canonical command signatures, not substrings
4. Rejects matches inside strings, comments, or echo/printf arguments

For **evidence detection**, the last execution-relevant segment determines the evidence type. For **gate detection**, ALL segments are checked -- if any segment triggers a gate, the applicable gate logic runs. If ANY gate in the compound command blocks, the entire command is blocked. See Layer 4 compound command handling.

| Canonical command | Evidence type | Surfaces covered |
|---|---|---|
| `npm test` / `npx vitest run` (cwd is dashboard-server/) | `unit_test` | server, frontend, migrations, tests |
| `npm run test:e2e` / `npx playwright test` (cwd is dashboard-server/) | `e2e_test` | server, frontend |
| `npm run test:all` (cwd is dashboard-server/) | `unit_test` + `e2e_test` | (emits TWO records -- see R9) |
| Playwright MCP tools (navigate + snapshot/console) | `browser_check` | frontend |
| `curl` targeting `localhost:8888` | `health_check` | server |
| WebSearch tool | `web_search` | client_deliverables |
| Read tool on `intelligence/banks/**` | `bank_read` | intelligence |

**test:all dual emission (R9, revised R9b):** When `npm run test:all` is detected, the hook emits TWO evidence records with the same timestamp, git_head, and fingerprints but separate IDs (e.g., `EV-...-unit` and `EV-...-e2e`). Exit code semantics: when `test:all` exits 0, both phases passed -- emit both records with `exit_code: 0`. When it exits non-zero, the failing phase is ambiguous from a single exit code -- emit both records with `exit_code: 1` (conservative, neither satisfies requirements). For granular evidence of partial success, run `npm test` and `npm run test:e2e` as separate commands.

**Structured browser evidence (R7):** Browser verification must include structured metadata, not just a single tool-call record:

```json
{
  "type": "browser_check",
  "browser_evidence": {
    "url": "http://localhost:8888/nbi_project_dashboard.html",
    "action": "navigate + snapshot",
    "console_errors": 0,
    "assertion": "Dashboard loaded, kanban visible, no JS errors"
  },
  "surface_fingerprints": { "frontend": "..." }
}
```

Minimum for a valid `browser_check`: navigate + snapshot OR navigate + console_messages. A single Playwright tool call (e.g., `browser_navigate` alone) does NOT constitute a `browser_check`. The evidence must show the page was loaded AND inspected.

**Evidence validity (R3):** Evidence is valid if `surface_fingerprints[surface]` matches the current fingerprint for that surface. Content-based, not timestamp-based. If code is modified after tests run, fingerprints diverge and evidence is stale. If code is edited back to the tested state, fingerprints match again and evidence is valid.

Evidence with `exit_code != 0` is recorded but does NOT satisfy any requirement.

Evidence is append-only within its retention window. Validity is computed at resolution time by fingerprint comparison. **Retention:** Records older than 7 days are pruned during cleanup (at scan time or finish-task invocation). After pruning, only remaining records are candidates for fingerprint matching. Stale-but-matching evidence that survives retention is valid -- the fingerprint proves the code state is unchanged.

---

### Layer 3: Required-Verification Resolver

**Purpose:** Given the current surface fingerprints and evidence ledger, determine what verification is required and what is missing.

**Verification requirements config:** `.claude/harness/config/verification-requirements.json`

```json
{
  "requirements": {
    "server": {
      "required": ["unit_test"],
      "description": "Server code changes require npm test to pass"
    },
    "frontend": {
      "required": ["unit_test", "e2e_test|browser_check"],
      "description": "Frontend changes require npm test AND either e2e tests or a Playwright browser check"
    },
    "migrations": {
      "required": ["unit_test"],
      "description": "Migration changes require npm test (which applies migrations to test DB)"
    },
    "config": {
      "required": ["unit_test"],
      "description": "Config changes (package.json, ecosystem.config.js) require npm test to verify nothing broke"
    },
    "tests": {
      "required": ["unit_test"],
      "description": "Test file changes require running the tests they define"
    },
    "client_deliverables": {
      "required": ["web_search"],
      "description": "Client deliverables require factual claims verified from current-session sources"
    },
    "intelligence": {
      "required": ["bank_read"],
      "description": "Intelligence bank changes require reading actual bank content"
    },
    "docs": {
      "required": [],
      "description": "Documentation changes do not require verification"
    },
    "harness": {
      "required": ["unit_test"],
      "description": "Harness code changes require harness tests to pass"
    }
  }
}
```

**Key change (R6):** `tests` surface now requires `unit_test`. Test file changes must be verified by running the tests. `required: []` was unsafe -- broken or misconfigured tests undermine the evidence system by allowing future verification to produce misleading results.

**Resolver behaviour (architectural correction):**

The resolver does NOT read cached "clean"/"dirty" state. It:

1. Takes the current surface fingerprints (from a synchronous scan or the latest async cache, depending on caller)
2. For each surface with a non-null fingerprint (uncommitted changes exist):
   a. Looks up requirements for that surface
   b. Searches the evidence ledger for entries where `surface_fingerprints[surface]` matches the current fingerprint AND `exit_code == 0`
   c. Checks whether all required evidence types are present among valid entries
3. Returns the resolution

The `|` operator in requirements means "any one of these types satisfies this requirement."

```
resolve(currentFingerprints, evidenceLedger) -> {
  all_satisfied: boolean,
  surfaces: {
    server: {
      dirty: true,
      fingerprint: "a1b2c3...",
      required: ["unit_test"],
      satisfied: ["unit_test"],
      missing: [],
      evidence_ids: ["EV-..."]
    },
    frontend: {
      dirty: true,
      fingerprint: "f6g7h8...",
      required: ["unit_test", "e2e_test|browser_check"],
      satisfied: ["unit_test"],
      missing: ["e2e_test|browser_check"],
      evidence_ids: ["EV-..."]
    }
  },
  summary: "Missing: frontend e2e or browser check. Run npm run test:e2e or verify in browser."
}
```

---

### Layer 4: Tool Gates

**Purpose:** Mechanically block downstream actions when verification requirements are not met.

**All gates run a synchronous rescan (R2)** before making their decision. The gate sequence is:

1. Synchronous `scanDirtyState()` -- fresh git-fingerprint scan
2. `getValidEvidence(currentFingerprints)` -- filter ledger against current fingerprints
3. `resolve(currentFingerprints, validEvidence)` -- compute satisfaction
4. Gate decision based on resolution

---

**Compound command handling (R1b + R8b):**

Gate detection scans ALL segments of a compound command (split by `&&`, `||`, `;`). If any segment triggers a gate, the applicable gate logic runs. If ANY gate in the compound command would block, the entire command is blocked.

Special case: if a compound command contains both a `git commit -m "snapshot:..."` AND a `git push`, the push gate detects the pending snapshot commit from the command text itself (not from git log, since the commit hasn't executed yet) and blocks the entire command. This prevents the model from atomically creating and pushing a snapshot commit in a single tool call.

---

**Gate 1: Git commit (R1 -- all commits, not just feat/fix)**

Hook: PreToolUse on `Bash|PowerShell`
Trigger: command resolves to `git commit` (semantic detection -- see R8)

Action:
1. Run synchronous rescan + resolver
2. If ALL non-doc surfaces are clean (no dirty surfaces with requirements): pass through
3. If dirty non-doc surfaces exist:
   a. If `all_satisfied`: pass through
   b. If commit message starts with `snapshot:`: pass through (local-only escape hatch)
   c. If valid Glen approval token exists (see R10 below): pass through, consume token
   d. Otherwise: `{"decision": "block", "reason": "VERIFICATION GATE: <resolver.summary>"}`

The `snapshot:` prefix replaces the old feat/fix-only gating. ANY commit is gated when non-doc surfaces are dirty. `snapshot:` commits are allowed through the commit gate but are blocked at the push gate (Gate 5). This eliminates the previous bypass where the model could use `chore:` or `wip:` prefixes to avoid the gate.

---

**Gate 2: PM2 restart (deployment)**

Hook: PreToolUse on `Bash|PowerShell`
Trigger: command resolves to `pm2 restart` (semantic detection)

Action:
1. Synchronous rescan + resolver for `server` and `config` surfaces
2. If server or config surface is dirty and not satisfied: `{"decision": "block", "reason": "DEPLOY GATE: Server/config code has unverified changes. Run npm test before deploying."}`

---

**Gate 3: PR creation**

Hook: PreToolUse on `Bash|PowerShell`
Trigger: command resolves to `gh pr create` (semantic detection)

Action: Same as Gate 1 full resolver check. No `snapshot:` escape -- PRs must be fully verified.

---

**Gate 4: Bug tracker status update**

Hook: PreToolUse on `Bash|PowerShell`
Trigger: command resolves to `curl` targeting `/api/bug` with `please_review` (semantic detection)

Action: Resolver check, `{"decision": "block"}` if unverified. The pattern match for curl targeting a specific API path with a specific status string is precise enough to enforce mechanically.

---

**Gate 5: Git push (NEW -- R1)**

Hook: PreToolUse on `Bash|PowerShell`
Trigger: command resolves to `git push` (semantic detection)

Action:
1. Check for any `snapshot:` commits on the current branch that haven't been squashed or amended: `git log origin/HEAD..HEAD --oneline` filtered for `snapshot:` prefix
2. If `snapshot:` commits found: `{"decision": "block", "reason": "PUSH GATE: Branch contains snapshot: commits that must be squashed or amended before pushing. Commits: <list>"}`
3. If no `snapshot:` commits: run full resolver check -- pushing with dirty unverified surfaces is also blocked

For branches without an upstream: use `git log --oneline` against the merge-base with the default branch.

**CRITICAL: RHO git-push.js integration (C1):**

The RHO harness runs `git-push.js` as an async PostToolUse hook on every Bash/PowerShell command. This hook executes `git push origin HEAD` directly, bypassing PreToolUse gates entirely. Without integration, a `snapshot:` commit would be auto-pushed before Gate 5 ever fires.

**Required fix:** `git-push.js` must `require('./verification-resolver')` and run the same checks as Gate 5 before executing `git push`:
1. Check for `snapshot:` commits on the branch (block if found)
2. Run the resolver against current fingerprints (block if dirty unverified surfaces)
3. Only execute `git push origin HEAD` if both checks pass
4. If blocked, emit a `systemMessage` explaining why and exit without pushing

This makes git-push.js verification-aware. The PreToolUse Gate 5 catches explicit model `git push` commands; the PostToolUse git-push.js integration catches the auto-push path. Both enforce the same rules.

---

**Glen approval mechanism (R10)**

Replaces the `[verified-by-glen]` commit message bypass. Glen's approval is an out-of-band token file that the model cannot create.

**Token file:** `R.PROJECT_DATA_DIR/glen_approval.json` (per-project via resolve.js)

```json
{
  "approved_at": "2026-06-19T10:05:00Z",
  "surfaces": ["server", "frontend"],
  "expires_at": "2026-06-19T10:35:00Z",
  "reason": "Verified in production browser"
}
```

**Creation:** Glen runs `node .claude/harness/lib/glen-approve.js` directly in a terminal window (not through Claude Code). The script checks `process.stdin.isTTY === true` before proceeding (rejects piped input), then prompts interactively via readline for surfaces and reason.

**Three-level write enforcement (R10b):**

1. **Write-guard** (write-matrix.json): add `R.PROJECT_DATA_DIR/glen_approval.json` pattern to the blocked list, blocking Edit/Write tool writes. Note: write-guard currently allows all `data/**` via recorder_allowed -- the glen_approval block must be checked BEFORE the data/** allowlist (blocked is already checked first in write-guard.js, so adding to blocked list is sufficient).
2. **Shell-guard** (extended): add `glen_approval.json` as a specifically governed path (exact filename match, not data-wide), blocking shell-mediated writes (echo >, cp, Set-Content, node -e fs.writeFileSync, etc.). Shell-guard currently governs `config/` and `lib/` only -- extending it to cover this specific data/ path is a required implementation step. Do NOT govern all of `data/` -- RHO needs unrestricted data writes.
3. **TTY guard**: glen-approve.js MUST verify `process.stdin.isTTY === true` at startup and exit with a non-zero code if stdin is not a real terminal. This prevents the model from piping input via `echo "server\nVerified" | node glen-approve.js`. The readline prompt is the UX mechanism; the TTY check is the security boundary.

All three levels must be in place before R10 is mechanically enforced. Write-guard alone is insufficient because the model can bypass it via Bash/PowerShell shell writes to data/ paths. The interactive readline alone is insufficient because stdin can be piped.

**Expiry:** Tokens expire after 30 minutes. The gate checks expiry before accepting.

**Consumption:** After a successful gated commit using the token, the gate deletes the token file (single-use).

---

### Layer 5: Response Discipline (Model-Compliance Layer)

**Architectural separation (correction):** This layer contains ONLY model-compliance-dependent mechanisms. Nothing in Layer 5 is enforcement. Layers 1-4 handle enforcement mechanically. Layer 5 makes it EASIER for the model to do the right thing and HARDER to skip verification, but cannot PREVENT skipping.

---

**5a. State injection after code edits**

PostToolUse on Edit/Write (existing hook, extended): After any code file edit, inject the current verification state as `hookSpecificOutput`:

```
VERIFICATION STATE: surfaces dirty: [server, frontend]. Required: npm test + (e2e or browser check). Do not claim completion until verification passes.
```

Uses the async scan result (not a synchronous rescan -- nudges do not need enforcement-grade freshness).

---

**5b. verification-before-completion skill rewrite**

The skill reads the evidence ledger, runs the resolver, and either:
- Produces a structured evidence block with evidence IDs (if all satisfied)
- Refuses to produce completion language (if not satisfied), outputting: "I changed the code, but verification is incomplete. Missing: [resolver.summary]"

The skill is the approved path to completion claims. If the model invokes it, it gets mechanically honest output. If the model skips it, Layer 4 gates catch it at commit/deploy time.

---

**5c. finish-task command**

`node .claude/harness/lib/finish-task.js` -- CLI entry point.

CLAUDE.md instruction: "Before claiming any task complete, run `node .claude/harness/lib/finish-task.js` and include its output in your response."

Output when satisfied:

```
TASK COMPLETION REPORT
======================
Dirty surfaces: server, frontend
Evidence:
  - EV-20260619-100200-unit: npm test, 767/767 passed (server, frontend, migrations, tests)
  - EV-20260619-100500-e2e: npm run test:e2e, 19/19 passed (server, frontend)
Fingerprints: server a1b2c3 MATCH, frontend f6g7h8 MATCH
Resolver: ALL SATISFIED
Status: VERIFIED -- safe to commit and claim complete.
```

Output when not satisfied:

```
TASK COMPLETION REPORT
======================
Dirty surfaces: server, frontend
Evidence:
  - EV-20260619-100200-unit: npm test, 767/767 passed (server)
Fingerprints: server a1b2c3 MATCH, frontend f6g7h8 NO EVIDENCE
Resolver: MISSING frontend e2e or browser check
Status: NOT VERIFIED -- run npm run test:e2e or verify in browser before claiming complete.
```

Model-compliance-dependent (the model must choose to run the command). But creates a clear, auditable, mechanical path to honest completion claims.

---

**5d. Transcript auditor (future)**

A cadence-triggered script that scans session logs for completion language without a corresponding evidence block. Captures violations as intervention events for the weekly RHO diagnosis. Detection mechanism, not prevention. Lower priority -- implement after Layers 1-4 are stable.

---

## 3. Implementation Plan

**All modules use `const R = require('./resolve')` for path resolution.** State files use `R.PROJECT_DATA_DIR`, config files use `R.CONFIG_DIR`, git commands use `R.PROJECT_DIR`.

### Module: `.claude/harness/lib/verification-state.js`

Core functions:
- `scanDirtyState()` -- runs git diff (cwd: `R.PROJECT_DIR`), categorises files into surfaces, computes content fingerprints, writes state file to `R.PROJECT_DATA_DIR/verification_state.json`
- `readState()` -- reads and returns current cached state (for async/nudge paths)
- `computeFingerprint(files)` -- computes sha256 of sorted `filepath:blobHash` pairs
- `classifySurface(filePath)` -- maps a file path to its surface category (longest prefix match), loads surface-map.json from `R.CONFIG_DIR`

No `clearSurface()`. Dirty state clears naturally when code is committed and the next scan produces a clean fingerprint.

### Module: `.claude/harness/lib/evidence-ledger.js`

Core functions:
- `recordEvidence(type, command, exitCode, resultSummary, surfaceFingerprints)` -- appends to `R.PROJECT_DATA_DIR/evidence_ledger.jsonl`
- `recordBrowserEvidence(url, action, consoleErrors, assertion, surfaceFingerprints)` -- structured browser evidence (R7)
- `readLedger()` -- reads all entries, applies 7-day retention
- `getValidEvidence(currentFingerprints)` -- filters to entries where fingerprints match current state AND exit_code == 0
- `generateEvidenceId(type)` -- produces `EV-YYYYMMDD-HHMMSS-type` ID

### Module: `.claude/harness/lib/command-detector.js` (NEW -- R8)

Core functions:
- `parseCommand(rawCommand)` -- splits at shell combinators into segments, rejects quoted/echoed matches
- `resolveWorkingDirectory(rawCommand, defaultCwd)` -- detects `cd` prefixes, returns resolved cwd
- `detectEvidenceType(rawCommand, cwd)` -- returns `{type, surfacesCovered}` or null; returns array for `test:all` (R9). Uses last execution-relevant segment.
- `isGateTarget(rawCommand)` -- scans ALL segments; returns array of `{gate: "commit"|"push"|"pm2"|"pr"|"bugstatus", metadata}` or empty array. Detects compound gate scenarios (e.g., commit + push in same command).

### Module: `.claude/harness/lib/verification-resolver.js`

Core functions:
- `loadRequirements()` -- reads `R.CONFIG_DIR/verification-requirements.json`
- `resolve(currentFingerprints, evidenceLedger)` -- computes satisfaction for all dirty surfaces by fingerprint comparison
- `formatSummary(resolution)` -- produces human-readable summary of missing requirements

### Script: `.claude/harness/lib/finish-task.js`

CLI entry point. Runs synchronous scan, reads ledger, resolves, outputs structured completion report.

### Script: `.claude/harness/lib/glen-approve.js` (NEW -- R10)

Interactive CLI for Glen to create approval tokens. Checks `process.stdin.isTTY === true` first (exits with error if piped). Prompts for surfaces and reason via readline. Writes token with 30-minute expiry.

### Config: `.claude/harness/config/verification-requirements.json`

Requirements mapping as defined in Layer 3.

### Config: `.claude/harness/config/surface-map.json` (NEW)

Surface-to-glob mapping extracted from Layer 1, machine-readable for the classifier:

```json
{
  "server": ["dashboard-server/routes/**", "dashboard-server/lib/**", "dashboard-server/server.js", "dashboard-server/cron/**", "dashboard-server/scripts/**", "dashboard-server/*.js"],
  "frontend": ["nbi_project_dashboard.html", "dashboard-server/public/js/**", "dashboard-server/public/css/**"],
  "tests": ["dashboard-server/tests/**"],
  "migrations": ["dashboard-server/migrations/**"],
  "config": ["dashboard-server/package.json", "dashboard-server/package-lock.json", "dashboard-server/ecosystem.config.js"],
  "docs": ["*.md", "docs/**", "brain/**", "roles/**"],
  "client_deliverables": ["Clients/**"],
  "intelligence": ["intelligence/**"],
  "harness": [".claude/harness/**"]
}
```

### Modification: `.claude/harness/lib/git-push.js` (C1 -- CRITICAL)

Add verification resolver integration before `git push origin HEAD`:
1. `require('./verification-resolver')` and `require('./verification-state')`
2. Run synchronous scan + resolver
3. Check for `snapshot:` commits via `git log`
4. Block push (emit systemMessage, exit 0) if snapshot commits found or dirty unverified surfaces
5. Only execute `git push origin HEAD` if both checks pass

### Extension: write-matrix.json (C3)

Add to `blocked` list (before recorder_allowed `data/**` -- blocked is checked first by write-guard.js):
```json
{ "path": ".claude/harness/data/**/glen_approval.json", "reason": "BLOCKED: Glen approval token -- model cannot create" }
```

### Extension: shell-guard.js (C3)

Add `glen_approval.json` to governed paths in `isGovernedPath()`. Exact filename match only -- do NOT govern all of `data/`.

### Hook changes: global `~/.claude/settings.json`

- Add PostToolUse hooks for `scanDirtyState()` async + evidence recording (via command-detector)
- Add PreToolUse gates: git commit (Gate 1), pm2 restart (Gate 2), gh pr create (Gate 3), bug status curl (Gate 4), git push (Gate 5)
- Reorder PostToolUse: evidence recording BEFORE git-push.js (git-push.js must see current evidence)

### Deploy sequencing (C4)

1. Write all new modules, config, and tests to source repo (`.claude/harness/` in NBIAI_TEAM)
2. Commit to source repo (Glen approves -- lib/** and config/** are BLOCKED_TO_APPLY)
3. Run `node .claude/harness/deploy.js` to deploy to global `~/.claude/harness/`
4. Update global settings.json hooks
5. Verification data files in `data/<project-slug>/` survive all deployments -- deploy.js never touches `data/`

### Skill change: `verification-before-completion`

Rewrite to read evidence ledger, run resolver with current fingerprints, produce structured evidence block or refusal.

### CLAUDE.md change

Add instruction: "Before claiming any task complete, run `node .claude/harness/lib/finish-task.js` and include its output in your response."

---

## 4. What This Does NOT Do

- Does not prevent the model from saying "done" in chat text (architecturally impossible -- no outbound-message hook)
- Does not verify that the RIGHT tests ran for the specific change (evidence type matching is surface-level, not semantic)
- Does not handle verification of non-dashboard work (Astinus, etc.) without extending the surface map and requirements config
- Does not handle multi-session state (state file is per-worktree, not per-session)
- Does not guarantee the model invokes verification-before-completion or finish-task (Layer 5 is model-compliance-dependent)
- Does not prevent the model from using `snapshot:` commits strategically to defer verification (but the push gate catches this before code reaches remote)
- Does not gate `git rebase` or `git cherry-pick` (these reorganise existing commits; gating them would require tracking content through rebase operations, which is out of scope)
- Does not track `.env*` file changes (gitignored files are invisible to git-based scanning)
- Files matching no surface category are unclassified and not gated (surface map covers known code paths only)

---

## 5. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Model uses `snapshot:` to defer verification indefinitely | Push gate blocks (both PreToolUse Gate 5 and PostToolUse git-push.js). `snapshot:` commits accumulate visibly in git log. RHO weekly diagnosis can detect pattern. |
| RHO auto-push bypasses verification gates | git-push.js requires verification resolver before pushing (C1). Both explicit pushes (Gate 5) and auto-pushes (git-push.js) enforce the same rules. |
| Cross-project evidence contamination | All verification data under `R.PROJECT_DATA_DIR` (per-project slug). Global hooks fire per-project with isolated state (C2). |
| deploy.js wipes verification modules | All modules committed to source first, then deployed. Data survives -- deploy.js never touches `data/` (C4). |
| Synchronous rescan in gates adds latency | `git diff`/`ls-tree`/`hash-object` are fast (<100ms for this repo size). Acceptable for enforcement paths that fire infrequently. |
| Fingerprint collision (SHA-256) | Negligible probability for this use case. Not a practical risk. |
| Stale async scan between tool calls | Synchronous rescan in gates catches the current state. Async staleness only affects Layer 5 nudges, where approximate state is acceptable. |
| Model bypasses by avoiding recognised commit prefixes | ALL commits are gated when non-doc surfaces are dirty (R1). No prefix-based escape except `snapshot:`, which is push-blocked. |
| Evidence ledger grows large | 7-day retention. Older entries are irrelevant for current verification. |
| Config drift in verification-requirements.json | Under `.claude/harness/config/` (BLOCKED_TO_APPLY). Changes require Glen's approval via apply-gate. |
| Glen approval token forged by model | Three-level enforcement: write-guard blocks Edit/Write, shell-guard blocks shell writes, TTY guard rejects piped stdin (`process.stdin.isTTY` check). All three required. |
| Command detection false positives | Semantic detection (R8) plus context-aware parsing reduces these. Fail-safe: false positive means unnecessary evidence recorded (no damage -- evidence validity is still checked by fingerprint). |
| Command detection false negatives | Fail-safe: false negative means state stays dirty. No damage -- the model just needs to run the verification command again or in a way the detector recognises. |
| `test:all` partial failure | Dual emission (R9b): exit 0 emits both records as passed; exit non-zero emits both as failed (conservative). For granular partial evidence, run tests separately. |
| `git rebase` or `git cherry-pick` bypass | Out of scope (see section 4). These operations reorganise existing commits. The next scan after rebase completes will re-evaluate dirty state from scratch. |

---

## 6. Testing

Each module gets unit tests following the existing harness test patterns:

- `test-verification-state.js` -- scan categorisation, fingerprint computation, surface classification (longest-prefix matching), state file read/write, async vs synchronous scan paths
- `test-evidence-ledger.js` -- recording, fingerprint-based validity filtering, dual emission for test:all (R9), structured browser evidence (R7), 7-day retention, evidence ID generation
- `test-command-detector.js` -- semantic command parsing, working directory resolution, shell combinator stripping, rejection of quoted/echoed matches, gate target detection, edge cases (compound commands, cd chains, PowerShell syntax)
- `test-verification-resolver.js` -- requirement matching with fingerprint comparison, `|` operator handling, test surface requirements (R6), summary generation, all-clean fast path, mixed dirty/clean surfaces
- `test-finish-task.js` -- CLI output formatting, resolver integration, both satisfied and unsatisfied paths
- `test-glen-approve.js` -- token creation, expiry validation, consumption (deletion after use), write-guard integration

---

## 7. Relationship to RHO

This system is complementary to RHO, not part of it:

- RHO captures failures AFTER they happen (retrospective)
- The verification state machine PREVENTS downstream damage (proactive)
- RHO's weekly diagnosis can analyse verification gate blocks and evidence patterns to propose improvements to the requirements config
- The transcript auditor (Layer 5d) feeds back into RHO's intervention detection
- `snapshot:` commit accumulation patterns are detectable by RHO diagnosis

The verification state modules live in `.claude/harness/lib/` alongside RHO modules. The config lives in `.claude/harness/config/`. Both are governed by the same write-matrix and apply-gate.

### 7.1 RHO Global Harness Integration Requirements (Codex compatibility review, 2026-06-20)

The RHO harness has been migrated to global (`~/.claude/harness/`) via a source-deploy model. All verification state machine modules must integrate with this architecture.

**resolve.js dependency:** All new modules MUST `require('./resolve')` and use its exports for path resolution:
- `R.PROJECT_DATA_DIR` for per-project data files (verification_state.json, evidence_ledger.jsonl, glen_approval.json)
- `R.HARNESS_DIR` for harness root
- `R.CONFIG_DIR` for config files
- `R.PROJECT_DIR` for project root (used by git commands in scanDirtyState)

**Per-project data isolation (C2):** Verification state, evidence, and approval tokens are per-project. Global hooks fire across all Claude Code projects. Without per-project isolation, one project's dirty state would contaminate another's evidence ledger. All data files use `R.PROJECT_DATA_DIR` (= `data/<project-slug>/`), never `data/` root.

**git-push.js integration (C1):** See Gate 5 section. git-push.js must call the verification resolver before executing `git push origin HEAD`. This is the CRITICAL integration point -- without it, the entire push gate design is bypassed by auto-push.

**deploy.js sequencing (C4):** `deploy.js` deletes and replaces `lib/`, `config/`, and `tests/` directories. Data is never touched. Implementation sequence:
1. Write all new modules/config/tests to source repo (`.claude/harness/` in NBIAI_TEAM)
2. Commit to source repo
3. Run `node .claude/harness/deploy.js` to deploy to global `~/.claude/harness/`
4. Verification data files in `data/<project-slug>/` survive all deployments

**write-matrix extension (C3):** Before enabling the Glen approval mechanism:
1. Add `glen_approval.json` pattern to write-matrix.json `blocked` list (blocks Edit/Write)
2. Extend shell-guard.js `isGovernedPath()` to match `glen_approval.json` specifically (blocks shell writes)
3. Both must be deployed before any gate references the approval token

**Hook ordering (C5):** After implementation, global settings.json hook order:

PreToolUse (enforcement path):
1. write-guard.js (blocks writes to protected paths)
2. shell-guard.js (blocks shell writes to protected paths)
3. **Verification gates** (git commit, pm2 restart, gh pr create, bug status, git push)
4. bank-verify-gate (project-specific)
5. Other project-specific guards

PostToolUse (evidence and automation):
1. Evidence recording + dirty-state scan (new)
2. emit-event.js (tool_outcome, skill_usage, detect_secondary)
3. **git-push.js** (verification-aware auto-push -- MUST run after evidence recording)
4. entropy-scan.js
5. Other project-specific hooks

---

## Appendix: Revision Changelog

All revisions from Codex adversarial review round 2:

| ID | Finding | Resolution in this revision |
|---|---|---|
| R1 | Gate only feat/fix commits allows bypass via chore/wip | ALL commits gated when non-doc surfaces dirty. `snapshot:` prefix for local-only escapes. New push gate (Gate 5) blocks pushing `snapshot:` commits. |
| R2 | Async scans in gates could act on stale state | Synchronous rescan inside every blocking gate. Async scans only for Layer 5 nudges. |
| R3 | Timestamp-based evidence validity is raceable | Content fingerprints (sorted filepath:blobHash, SHA-256). Evidence validity by fingerprint match, not timestamp comparison. |
| R4 | Surface map misses dashboard-server/*.js and scripts/ | Added `dashboard-server/*.js` and `dashboard-server/scripts/**` to server surface. |
| R5 | Config paths (package.json, .env*) are ambiguous | All config paths explicitly prefixed with `dashboard-server/`. |
| R6 | Tests surface has required: [] -- broken tests undetected | Tests surface now requires `unit_test`. |
| R7 | Browser evidence is a single unstructured tool call | Structured browser evidence: URL + action + console error count + assertion. Minimum two tool calls (navigate + inspect). |
| R8 | Substring command matching is fragile | Semantic command detection: parse command, resolve cwd, reject quoted/echoed matches. New `command-detector.js` module. |
| R9 | test:all only emits one evidence type | Dual emission: `npm run test:all` produces both `unit_test` and `e2e_test` records. |
| R10 | [verified-by-glen] text bypass is model-forgeable | Out-of-band approval token file. Interactive CLI Glen runs directly. Write-guard blocks model creation. 30-minute expiry, single-use. |
| A1 | clearSurface() creates state to manage and invalidate | Removed. Resolver computes satisfaction from live fingerprint + ledger. No cached clean state. |
| A2 | Dependency direction unclear | Explicit: git-fingerprint -> surface-classifier -> evidence-ledger -> resolver -> gate. No cycles. |
| A3 | Layer 5 mixes enforcement with compliance | Separated. Layers 1-4 are mechanical enforcement. Layer 5 is explicitly model-compliance-dependent, labelled as such. |

### Round 3 revisions (Codex final lock review, 2026-06-20)

| ID | Finding | Resolution |
|---|---|---|
| R1b | Compound commands bypass snapshot push blocking | Gate detection scans ALL segments. If any segment triggers a gate, the entire command is subject to that gate. Snapshot + push in same command is explicitly blocked. |
| R8b | "Process final segment" is unsafe for gates | Evidence detection uses last segment; gate detection uses ALL segments. Explicitly separated in Layer 2 and Layer 4. |
| R9b | test:all dual emission assumes per-phase exit codes | Simplified: exit 0 = both records pass; exit non-zero = both records fail (conservative). Separate commands for granular evidence. |
| R10b | Token forgeable via shell writes to data/ | Three-level enforcement: write-guard (Edit/Write), shell-guard (extended to glen_approval.json), interactive readline. All three required. |
| N1 | Gate 4 warns not blocks -- contradicts scope | Changed to block. Pattern match is precise enough for mechanical enforcement. |
| N2 | Gate 2 misses config surface for PM2 restart | Gate 2 now checks both server and config surfaces. |
| N3 | .env* in config surface but gitignored -- invisible | Removed .env* from config surface. Added to limitations. |
| N4 | Surface-map prose vs JSON disagree on root *.md | Added `*.md` to docs surface in both prose and JSON. Defined unclassified file behaviour (not gated, by design). |
| N5 | "Never deleted" contradicts "7-day retention" | Clarified: append-only within retention window; records pruned after 7 days. |
| R10c | readline is not a security boundary -- stdin can be piped | TTY guard: `process.stdin.isTTY === true` check at startup, exit on non-TTY. TTY is the security boundary, readline is the UX. |

### Round 4 revisions (Codex RHO compatibility review, 2026-06-20)

| ID | Finding | Resolution |
|---|---|---|
| C1 | CRITICAL: RHO git-push.js auto-push bypasses verification push gate | git-push.js must `require('./verification-resolver')` and run snapshot + resolver checks before executing `git push origin HEAD`. Both Gate 5 (PreToolUse) and git-push.js (PostToolUse) enforce the same rules. |
| C2 | HIGH: Verification data at data/ root conflicts with per-project isolation | All data files moved to `R.PROJECT_DATA_DIR` (per-project slug via resolve.js). verification_state.json, evidence_ledger.jsonl, glen_approval.json are all per-project. |
| C3 | HIGH: Write-matrix/shell-guard don't protect glen_approval.json yet | Add glen_approval.json to write-matrix blocked list AND shell-guard governed paths (exact filename, not data-wide). Both must be deployed before approval tokens are enabled. |
| C4 | HIGH: deploy.js deletes lib/config/tests before copying | Source-first implementation: commit to repo, then deploy. Data survives -- deploy.js never touches data/. |
| C5 | MEDIUM: Hook ordering unsafe while auto-push is unfixed | After C1: evidence recording before git-push.js in PostToolUse order. Verification gates before bank-verify in PreToolUse order. |
