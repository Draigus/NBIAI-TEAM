# RHO Harness Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the RHO harness mechanically enforce what it claims — principal separation, write authorities, risk classification, and data integrity.

**Architecture:** 16 findings from Codex critique (M1-M10, D1-D3, D10, S1-S13) grouped into 12 implementation tasks. All lib/ file writes use the Write-to-tmp-then-cp pattern (write to `d:\tmp\<filename>` via Write tool, then `cp` into `.claude/harness/lib/`). Tests run with `node .claude/harness/tests/<test>.js`.

**Tech Stack:** Node.js (zero external deps), JSONL event storage, PreToolUse/PostToolUse hooks in `.claude/settings.json`

**Branch:** `feature/rho-hardening` (already created, branched from master at `71b47bd`)

**Revised ordering (post Codex plan review):** S13 first (stable foundation), then shell guard (closes bypass before enforcement depends on it), then enforcement (principal guard, mode enforcement, locking, risk classify), then redaction, then capture quality, then cleanup. Task 12 split into 4 sub-tasks. All hook commands Node-native (no bash parameter expansion).

---

### Task 1: S13 — Node-native hook entrypoints

**Files:**
- Modify: `.claude/settings.json` (hook definitions)
- Modify: `.claude/harness/lib/entropy-scan.js` (ensure standalone entrypoint)

**Why first:** Current hooks use `shell: "bash"` and depend on Git Bash being available. Making all hooks Node-native creates a stable foundation for everything else.

- [ ] **Step 1: Audit all hook commands in settings.json**

Read `.claude/settings.json` and list every hook command. Identify which ones use bash-specific features (pipes, redirects, bash-only syntax) vs which are already `node` invocations.

- [ ] **Step 2: Convert bash-dependent hooks to Node entrypoints**

For each hook that uses bash features, create a Node wrapper or convert to Node-native invocation. The git push hook currently uses bash — wrap it in a Node script that calls `child_process.execSync('git push origin')`.

Create `.claude/harness/lib/git-push.js`:
```js
const { execSync } = require('child_process');
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
try {
  execSync('git push origin', { cwd: PROJECT_DIR, timeout: 60000 });
} catch (e) {
  process.stderr.write('git push failed: ' + (e.message || e) + '\n');
}
```

- [ ] **Step 3: Update settings.json hook commands to use Node**

Replace `shell: "bash"` entries with Node-native commands where applicable. Ensure all hooks work on Windows without Git Bash.

- [ ] **Step 4: Test all hooks still fire**

Run a test git commit, verify push hook fires, entropy scan fires, event capture fires.

- [ ] **Step 5: Commit**
```bash
git add .claude/settings.json .claude/harness/lib/git-push.js
git commit -m "fix(harness): S13 Node-native hook entrypoints — remove bash dependency"
```

---

### Task 2: Items 1+D1+D2 — Principal-aware write guard

**Files:**
- Modify: `.claude/harness/lib/write-guard.js`
- Create: `.claude/harness/tests/test-write-guard.js`

**Key design decisions (converged with Codex):**
- `HARNESS_CADENCE=true` env var restricts guard to Recorder-only paths
- No env var = development mode (recorder + development paths allowed)
- `applier_allowed` paths NEVER pass through write-guard — they go through apply-gate.js
- `blocked` is checked FIRST, before any allowlist (Codex revision)
- Block message includes active principal

- [ ] **Step 1: Write tests for principal separation**

Create `test-write-guard.js` in temp, then cp. Tests:
1. Blocked path always blocked (regardless of principal)
2. Recorder path allowed when HARNESS_CADENCE=true
3. Applier path (changelog.md) BLOCKED when HARNESS_CADENCE=true
4. Applier path BLOCKED in development mode
5. Development path allowed in development mode
6. Development path BLOCKED when HARNESS_CADENCE=true
7. Unknown path blocked in both modes
8. Missing write-matrix.json fails closed

- [ ] **Step 2: Run tests — verify they fail**

```bash
node .claude/harness/tests/test-write-guard.js
```
Expected: failures on principal separation (current guard allows all).

- [ ] **Step 3: Implement principal-aware logic in write-guard.js**

Write updated write-guard.js to tmp, then cp. Key logic:
```js
const isCadence = process.env.HARNESS_CADENCE === 'true';
const principal = isCadence ? 'recorder' : 'development';

// BLOCKED always checked first
for (const entry of (matrix.blocked || [])) {
  if (matchGlob(relPath, entry.path)) {
    failClosed(relPath, entry.reason);
    return;
  }
}

// Principal-specific allowlist
const allowlist = isCadence
  ? (matrix.recorder_allowed || [])
  : [...(matrix.recorder_allowed || []), ...(matrix.development_allowed || [])];

for (const entry of allowlist) {
  if (matchGlob(relPath, entry.path)) {
    process.exit(0); // allowed
  }
}

// applier_allowed paths are NEVER allowed through write-guard
// They must go through apply-gate.js
failClosed(relPath, principal + ' cannot write this path — applier writes use apply-gate.js');
```

- [ ] **Step 4: Run tests — verify they pass**

- [ ] **Step 5: Commit**
```bash
git add .claude/harness/lib/write-guard.js .claude/harness/tests/test-write-guard.js
git commit -m "fix(harness): M1+D1+D2 principal-aware write guard — blocked-first, cadence/dev modes"
```

---

### Task 3: Items 3+M4 — Mode enforcement (create_only, append_only)

**Files:**
- Modify: `.claude/harness/lib/write-guard.js`
- Update: `.claude/harness/tests/test-write-guard.js`

**Key design (Codex revision):** Implement mode enforcement generically from write-matrix.json `mode` field, not as one-off path checks. Modes: `create_only` (file must not exist), `append_or_create`, `append` (file must exist), `overwrite`.

**Mode detection:** The PreToolUse hook receives `tool_name` in the hook input (`Write` or `Edit`). Additionally, for `create_only` mode, the guard resolves the full file path and checks `fs.existsSync()` — if the file exists and mode is `create_only`, block regardless of tool. This catches both Write (overwrite) and Edit (modify) to immutable files.

- [ ] **Step 1: Add mode enforcement tests**

Tests (use temp files to simulate existing/non-existing paths):
1. `create_only` path with existing file: BLOCK (proposal immutability)
2. `create_only` path with non-existing file: ALLOW
3. `append` path with existing file: ALLOW
4. `append` path with non-existing file: BLOCK
5. `overwrite` path: always ALLOW
6. `append_or_create` path: always ALLOW
7. Windows path normalisation: backslashes, drive letters, case differences

- [ ] **Step 2: Run tests — verify they fail**

- [ ] **Step 3: Implement mode checking in write-guard.js**

After principal allowlist match, check the matched entry's `mode` field:
```js
// After finding matching allowlist entry
const fullPath = path.resolve(PROJECT_DIR, filePath);
const fileExists = fs.existsSync(fullPath);

if (entry.mode === 'create_only') {
  if (fileExists) {
    failClosed(relPath, 'create_only: file already exists (immutable)');
    return;
  }
}
if (entry.mode === 'append') {
  // Existence check applies regardless of tool (Write or Edit)
  if (!fileExists) {
    failClosed(relPath, 'append: file does not exist');
    return;
  }
  // Write tool overwrites entire file — not compatible with append-only
  if (hookData.tool_name === 'Write') {
    failClosed(relPath, 'append: Write tool overwrites — use Edit for append-only files');
    return;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

- [ ] **Step 5: Commit**
```bash
git commit -m "fix(harness): M4+D3 mode enforcement — create_only proposals, append-only changelog"
```

---

### Task 4: Items 7+13 — Token-aware locking + session ID race fix

**Files:**
- Modify: `.claude/harness/lib/emit-event.js`
- Create: `.claude/harness/tests/test-locking.js`

**Key design (Codex revision):**
- `acquireLock()` returns a token (random string written into lock file)
- `releaseLock(lockPath, token)` only deletes if token still matches
- Stale lock deletion also checks token before unlinking
- Separate session lock for `getSessionId()` with try/finally
- `Atomics.wait()` replaces CPU-burning busy-wait (S5)

- [ ] **Step 1: Write locking tests**

1. acquireLock returns a token
2. releaseLock with correct token succeeds
3. releaseLock with wrong token does NOT delete lock
4. Stale lock is cleaned up only if token matches
5. Session ID creation uses lock
6. Concurrent session ID reads return same ID

- [ ] **Step 2: Run tests — verify they fail**

- [ ] **Step 3: Implement token-aware locking**

```js
function acquireLock(lockPath, ttlMs, retries) {
  ttlMs = ttlMs || 10000;
  retries = retries || 3;
  const token = crypto.randomBytes(8).toString('hex');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify({
        pid: process.pid, token: token, expires_at: Date.now() + ttlMs
      }), { flag: 'wx' });
      return token;
    } catch (e) {
      if (e.code === 'EEXIST') {
        try {
          const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (lock.expires_at < Date.now()) {
            // Stale — re-read and verify token before deleting
            const recheck = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
            if (recheck.token === lock.token) fs.unlinkSync(lockPath);
            continue;
          }
        } catch { try { fs.unlinkSync(lockPath); } catch {} continue; }
        if (attempt < retries - 1) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
        }
      } else { return null; }
    }
  }
  return null;
}

function releaseLock(lockPath, token) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (lock.token === token) fs.unlinkSync(lockPath);
  } catch {}
}
```

- [ ] **Step 4: Update getSessionId() to use lock**

```js
function getSessionId() {
  const sessionFile = path.join(DATA_DIR, '.session_id');
  const lockFile = path.join(LOCKS_DIR, 'session.lock');
  fs.mkdirSync(LOCKS_DIR, { recursive: true });
  const token = acquireLock(lockFile, 5000, 3);
  try {
    try {
      const raw = fs.readFileSync(sessionFile, 'utf8');
      const data = JSON.parse(raw);
      if (Date.now() - data.created < 4 * 3600 * 1000) return data.id;
    } catch {}
    const id = 'ses_' + ulid();
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    fs.writeFileSync(sessionFile, JSON.stringify({ id, created: Date.now() }));
    return id;
  } finally {
    if (token) releaseLock(lockFile, token);
  }
}
```

Note: The sleep fix (S5 Atomics.wait) is implemented HERE in acquireLock. Task 10 verifies it is consistent, does not re-implement.
```

- [ ] **Step 5: Run tests — verify they pass**

- [ ] **Step 6: Commit**
```bash
git commit -m "fix(harness): M8+S5+S6 token-aware locking — session race fix, CPU-safe sleep"
```

---

### Task 5: Items 8+9+10 — Redaction overhaul

**Files:**
- Modify: `.claude/harness/lib/emit-event.js`
- Create: `.claude/harness/tests/test-redaction.js`

**Key design (Codex revisions):**
- S2: Redaction fails closed — stub has only safe structural fields
- S3: Recursive object traversal replaces regex-on-JSON
- S1: client_sensitive_fields consumed — global key/path pattern matching

- [ ] **Step 1: Write redaction tests**

1. Pattern match redacts API keys in nested values
2. client_sensitive_fields redacts matching field keys
3. Missing redaction config produces minimal safe stub event
4. Corrupt redaction config produces minimal safe stub event
5. JSON structure is never broken by redaction
6. Redacted event has `redacted: true`

- [ ] **Step 2: Run tests — verify they fail**

- [ ] **Step 3: Implement recursive field-aware redaction**

```js
function redactValue(value, patterns) {
  if (typeof value !== 'string') return { value, hit: false };
  let hit = false;
  for (const re of patterns) {
    re.lastIndex = 0;
    if (re.test(value)) {
      re.lastIndex = 0;
      value = value.replace(re, '[REDACTED]');
      hit = true;
    }
  }
  return { value, hit };
}

function redactObject(obj, patterns, sensitiveKeys) {
  let anyHit = false;
  for (const key of Object.keys(obj)) {
    // Check if key matches client-sensitive field patterns
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      obj[key] = '[REDACTED]';
      anyHit = true;
      continue;
    }
    if (typeof obj[key] === 'string') {
      const { value, hit } = redactValue(obj[key], patterns);
      obj[key] = value;
      if (hit) anyHit = true;
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (redactObject(obj[key], patterns, sensitiveKeys)) anyHit = true;
    }
  }
  return anyHit;
}
```

- [ ] **Step 4: Implement fail-closed stub**

```js
function makeRedactionStub(eventId, sessionId, type, ts) {
  return {
    event_id: eventId, session_id: sessionId,
    schema_version: 1, type: type, ts: ts,
    redacted: true, redaction_error: true
  };
}
```

- [ ] **Step 5: Run tests — verify they pass**

- [ ] **Step 6: Commit**
```bash
git commit -m "fix(harness): S1+S2+S3 redaction overhaul — field-aware, fails closed, client fields"
```

---

### Task 6: Items 4+D10 — Risk classification embedded in apply-gate

**Files:**
- Create: `.claude/harness/lib/risk-classify.js`
- Modify: `.claude/harness/lib/apply-gate.js`
- Modify: `.claude/harness/config/risk-policy.json` (add changelog LOW rule for applier)
- Create: `.claude/harness/tests/test-risk-classify.js`

**Key design (Codex revision):**
- Precedence: BLOCKED_TO_APPLY > HIGH > LOW
- apply-gate.js calls risk-classify.js internally — not optional
- Canonical path matching with matchGlob
- Confidence check: < 3 evidence events forces HIGH

- [ ] **Step 1: Write risk classification tests**

1. Memory file matches LOW
2. CLAUDE.md matches HIGH
3. Harness config matches BLOCKED_TO_APPLY
4. BLOCKED > HIGH > LOW precedence when multiple rules match
5. < 3 evidence events forces HIGH regardless of target
6. Unknown target returns HIGH (fail safe)

- [ ] **Step 2: Implement risk-classify.js**

Standalone script AND importable module. Input: proposal JSON with target_file, evidence array. Output: `{ risk, matched_rule, reason }`.

- [ ] **Step 3: Embed risk-classify in apply-gate.js**

apply-gate.js calls risk-classify before performing the write. If risk != LOW, exit 1 with reason.

- [ ] **Step 4: Add changelog.md to risk-policy.json LOW rules**

```json
{ "target": ".claude/harness/changelog.md", "constraint": "append_only", "description": "Applier appends changelog entries" }
```

- [ ] **Step 5: Run tests — verify they pass**

- [ ] **Step 6: Commit**
```bash
git commit -m "fix(harness): M5+D10 deterministic risk classification — embedded in apply-gate"
```

---

### Task 7: Item 2 — Shell guard

**Files:**
- Create: `.claude/harness/lib/shell-guard.js`
- Modify: `.claude/settings.json` (add PreToolUse hook for Bash|PowerShell)
- Create: `.claude/harness/tests/test-shell-guard.js`

**Key design (converged):**
- Block recognised write primitives targeting governed paths
- Allow uncertainty generally, but fail closed when governed paths are in scope AND command has write/mutation shape
- Pattern list: `>`, `>>`, `Set-Content`, `Out-File`, `Add-Content`, `Copy-Item`, `Move-Item`, `Remove-Item`, `cp`, `mv`, `rm`, `tee`, `node -e` with `fs.write`, `python -c` with `open`/`write`
- Governed paths: `.claude/harness/config/`, `.claude/harness/lib/`

- [ ] **Step 1: Write shell guard tests**

1. `echo "x" > .claude/harness/config/test.json` — BLOCK
2. `Set-Content .claude/harness/lib/test.js` — BLOCK
3. `cp /tmp/x .claude/harness/lib/emit-event.js` — BLOCK
4. `node -e "fs.writeFileSync('.claude/harness/config/x')"` — BLOCK
5. `npm test` — ALLOW (no governed path, no write)
6. `cat .claude/harness/lib/emit-event.js` — ALLOW (read, not write)
7. `echo "x" > somefile.txt` — ALLOW (not governed path)

- [ ] **Step 2: Implement shell-guard.js**

Parse command string. Extract paths. Check if any path matches governed patterns. Check if command contains write primitives. Block only when BOTH conditions are true.

- [ ] **Step 3: Wire into settings.json**

Add PreToolUse hook for Bash and PowerShell matchers.

- [ ] **Step 4: Run tests — verify they pass**

- [ ] **Step 5: Verify normal Bash commands still work**

Run several typical commands: `git status`, `npm test`, `ls`, `cat` — all must pass without blocking.

- [ ] **Step 6: Commit**
```bash
git commit -m "fix(harness): M2 shell guard — blocks write primitives targeting governed harness paths"
```

---

### Task 8: Item 5 — Session join key (transcript parser)

**Files:**
- Modify: `.claude/harness/lib/transcript-parser.js`
- Modify: `.claude/harness/lib/emit-event.js` (write session ID to log metadata)
- Create: `.claude/harness/tests/test-transcript-parser.js`

**Key design (Codex revision):** Add `session_log_id` field derived from the session log filename. Write the active emitted session ID into session log metadata at session start for true join capability.

**Missing dependency (Codex finding):** For true join, the emitted session ID must be written into the session log. Add a function `writeSessionIdToLog()` in emit-event.js that appends `<!-- session_id: ses_XXXXX -->` to the current session log file on first event emission per session. The transcript parser reads this to join.

- [ ] **Step 1: Write tests**

1. Candidate signal includes `session_log_id` derived from filename
2. `capture_method` is set to `transcript_parser`
3. Multiple signals from same file share same session_log_id
4. If session log contains `<!-- session_id: ses_XXXXX -->`, the parser extracts and includes `emitted_session_id`

- [ ] **Step 2: Implement session_log_id in transcript-parser.js**

```js
// Derive from filename: 2026-06-14_session.md -> log_2026-06-14
const sessionLogId = 'log_' + path.basename(filePath, '.md').replace('_session', '');

// Check for emitted session ID in log content
const sidMatch = content.match(/<!-- session_id: (ses_\w+) -->/);
const emittedSessionId = sidMatch ? sidMatch[1] : null;

signals.push({
  session_log_id: sessionLogId,
  emitted_session_id: emittedSessionId,
  capture_method: 'transcript_parser',
  // ... existing fields
});
```

- [ ] **Step 3: Add writeSessionIdToLog() to emit-event.js**

On first event per session (new session ID generated), find today's session log and append `<!-- session_id: ses_XXXXX -->`. Use CLAUDE_PROJECT_DIR + session log path convention.

- [ ] **Step 4: Run tests — verify they pass**

- [ ] **Step 5: Commit**
```bash
git commit -m "fix(harness): M6 session join key — transcript signals + session ID in log metadata"
```

---

### Task 9: Item 6 — Bootstrap metadata preservation

**Files:**
- Modify: `.claude/harness/lib/emit-event.js`
- Modify: `.claude/harness/lib/bootstrap.js`

**Key design (Codex revision):** Allowlisted metadata preservation across ALL event types, not just default. Fields: `source`, `confidence`, `parse_warnings`, `source_file`, `capture_method`, `task_type_inferred`. Apply redaction after metadata is attached.

**Codex finding:** `buildEvent()` currently returns directly from every switch case. Must refactor all cases to assign to a local `event` variable, then attach metadata once after the switch, then return.

- [ ] **Step 1: Refactor buildEvent() — assign to variable, not return from cases**

Change every `case` from `return Object.assign(base, {...})` to `event = Object.assign(base, {...}); break;`. After the switch: attach metadata, then return event.

```js
function buildEvent(type, hookInput) {
  const base = { /* ... */ };
  const ti = hookInput.tool_input || {};
  let event;

  switch (type) {
    case 'tool_outcome':
      event = Object.assign(base, { tool: toolName, /* ... */ });
      break;
    case 'skill_usage':
      event = Object.assign(base, { skill: ti.skill, /* ... */ });
      break;
    // ... all other cases assign to event and break
    default:
      event = Object.assign(base, { raw: hookInput });
  }

  // Allowlisted metadata — preserved across ALL event types
  const METADATA_FIELDS = ['source', 'confidence', 'parse_warnings', 'source_file',
    'capture_method', 'task_type_inferred'];
  const metadata = {};
  for (const field of METADATA_FIELDS) {
    if (hookInput[field] !== undefined) metadata[field] = hookInput[field];
  }
  if (Object.keys(metadata).length > 0) event.metadata = metadata;

  return event;
}
```

- [ ] **Step 2: Add tests for metadata preservation across event types**

Test: tool_outcome, skill_usage, intervention, and default event types all preserve metadata fields when provided in hookInput.

- [ ] **Step 3: Verify redaction runs AFTER metadata attachment**

Confirm in main() that applyRedaction is called on the event AFTER buildEvent returns (it already is — verify, don't assume).

- [ ] **Step 4: Commit**
```bash
git commit -m "fix(harness): M7 bootstrap metadata — refactored buildEvent, allowlisted fields across all types"
```

---

### Task 10: Item 11 — ULID monotonicity (per-process)

**Files:**
- Modify: `.claude/harness/lib/emit-event.js`
- Create: `.claude/harness/tests/test-ulid.js`

**Key design (converged):** Per-process monotonicity only (documented as such). Hooks spawn separate Node processes so cross-process monotonicity is not achievable without lock-persisted ULIDs (agreed to be overkill for event telemetry). Sleep fix (S5) already done in Task 4 locking.

**Codex findings to address:**
- Handle clock rollback: `ts = Math.max(Date.now(), lastTs)`
- Handle random component overflow (carry to timestamp)
- Add tests proving lexicographic sort order

- [ ] **Step 1: Write ULID tests**

Export ulid() for testing. Tests:
1. Two sequential calls return lexicographically ordered IDs
2. Two calls in same millisecond (mock Date.now) return ordered IDs
3. Clock rollback (mock Date.now going backwards) still produces ordered IDs
4. 100 sequential calls are all unique
5. Random overflow (mock crypto.randomBytes to return all 0xFF) handles carry

- [ ] **Step 2: Implement per-process monotonic ULIDs**

```js
let lastTs = 0;
let lastRand = null;

function ulid() {
  const CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let ts = Math.max(Date.now(), lastTs); // handle clock rollback
  if (ts === lastTs && lastRand) {
    lastRand = Buffer.from(lastRand);
    let carry = true;
    for (let i = lastRand.length - 1; i >= 0 && carry; i--) {
      if (lastRand[i] < 255) { lastRand[i]++; carry = false; }
      else { lastRand[i] = 0; }
    }
    if (carry) { ts++; lastRand = crypto.randomBytes(10); } // overflow: advance timestamp
  } else {
    lastRand = crypto.randomBytes(10);
  }
  lastTs = ts;
  // ... encode timestamp + lastRand as before
}
```

- [ ] **Step 3: Run tests — verify they pass**

- [ ] **Step 4: Commit**
```bash
git commit -m "fix(harness): S4 monotonic ULIDs — per-process, handles clock rollback and overflow"
```

---

### Task 11: Items 14+15 — Entropy scan fixes

**Files:**
- Modify: `.claude/harness/lib/entropy-scan.js`
- Modify: `.claude/settings.json` (add PowerShell entropy hook)

**Key design (Codex revisions):**
- S7: Reset lastIndex inside EVERY filter callback for ALL global regexes, not just code residue
- S8: Add PowerShell commit matcher alongside Bash, using portable Node entrypoint

- [ ] **Step 1: Audit all global regexes in entropy-scan.js**

Find every `new RegExp(..., 'g')` used inside `.filter()` or `.test()`. Reset `lastIndex = 0` before each `.test()` call inside callbacks.

- [ ] **Step 2: Add PowerShell hook to settings.json**

Use Node-native command format (no bash parameter expansion — Task 1 requirement):
```json
{
  "matcher": "PowerShell",
  "if": "PowerShell(git commit *)",
  "hooks": [{
    "type": "command",
    "command": "node .claude/harness/lib/entropy-scan.js",
    "timeout": 15,
    "async": true,
    "statusMessage": "Running entropy scan..."
  }]
}
```

Note: verify the hook engine supports `PowerShell(git commit *)` condition syntax. If not, use a broader matcher and filter inside entropy-scan.js.

- [ ] **Step 3: Run existing entropy scan tests**

- [ ] **Step 4: Commit**
```bash
git commit -m "fix(harness): S7+S8 entropy scan — lastIndex fix for all global regexes, PowerShell coverage"
```

---

### Task 12: S9 — File residue checks

**Files:**
- Modify: `.claude/harness/lib/entropy-scan.js`
- Create: `.claude/harness/tests/test-entropy-residue.js`

**Spec:** Parse `git diff --name-status` output for new files (status 'A'). For each new file, check if any other changed file references it (by filename or import path). Classify as `new_unreferenced_file` (severity 2) or `new_dependency_introduced` (severity 1). Exclude common patterns: `.gitkeep`, test fixtures, config files.

- [ ] **Step 1: Write tests with sample diff output containing new files**
- [ ] **Step 2: Implement new-file detection and cross-reference**
- [ ] **Step 3: Run tests**
- [ ] **Step 4: Commit**
```bash
git commit -m "fix(harness): S9 file residue — new-file detection with cross-reference"
```

---

### Task 13: S10 — Tool outcome improvements

**Files:**
- Modify: `.claude/harness/lib/emit-event.js`

**Spec:** Capture real Claude hook payload fields. The hook input may contain:
- `tool_response` (string/object): the tool's response
- `is_error` (boolean): explicit error flag
- `response_time_ms` (number): if provided by hook engine

Classify result as: `success`, `failure`, `timeout` (if response_time_ms > 120000 or tool_response contains timeout indicators). Populate `duration_ms` from `response_time_ms` when available.

Before implementing: log one real PostToolUse hook payload to understand the actual schema. Do not assume fields exist without evidence.

- [ ] **Step 1: Capture and log a real PostToolUse hook payload**
- [ ] **Step 2: Update buildEvent tool_outcome case with actual fields**
- [ ] **Step 3: Add tests for success, failure, and timeout classification**
- [ ] **Step 4: Commit**
```bash
git commit -m "fix(harness): S10 tool outcome — real payload fields, timeout detection"
```

---

### Task 14: S11 — Transcript parser speaker scoping

**Files:**
- Modify: `.claude/harness/lib/transcript-parser.js`
- Update: `.claude/harness/tests/test-transcript-parser.js`

**Spec:** Session logs use this structure:
```
### Entry N — HH:MM
**What:** description
**Decision:** X
**Completed:** Y
```

Correction patterns should NOT match inside:
- Code fences (lines between ``` markers)
- Blockquotes (lines starting with >)
- Lines that are clearly metadata/headers (starting with **What:**, **Decision:**, etc.)

Implementation: track `inCodeFence` state while iterating lines. Skip blockquotes. Only match patterns in body text.

- [ ] **Step 1: Write tests with code fences and blockquotes containing false matches**
- [ ] **Step 2: Implement code fence and blockquote skipping**
- [ ] **Step 3: Run tests**
- [ ] **Step 4: Commit**
```bash
git commit -m "fix(harness): S11 transcript parser — skip code fences, blockquotes"
```

---

### Task 15: S12 — Bootstrap git history

**Files:**
- Modify: `.claude/harness/lib/bootstrap.js`

**Spec:** Read `git log --oneline -50` output. For each commit, emit a bootstrap event with:
- `source: 'git_history'`
- `capture_method: 'bootstrap'`
- `confidence: 'low'`
- Commit message as description
- Task domain inferred from commit prefix (feat/fix/docs/intel/harness/test)

**Idempotency:** Check `bootstrap_complete.json` for a `git_history_bootstrapped: true` flag. If set, skip. If not, run and set the flag. This prevents duplicate emissions on repeated bootstrap runs.

- [ ] **Step 1: Write tests with mock git log output**
- [ ] **Step 2: Implement git history bootstrap with idempotency check**
- [ ] **Step 3: Run tests**
- [ ] **Step 4: Commit**
```bash
git commit -m "fix(harness): S12 bootstrap git history — commit message ingestion with idempotency"
```

---

## Implementation Constraints

1. **All lib/ writes:** Write to `d:\tmp\<filename>` via Write tool, then `cp d:\tmp\<filename> .claude/harness/lib/<filename>`, then `node --check .claude/harness/lib/<filename>` to verify syntax.

2. **Test isolation:** All tests must use temp directories (pattern from test-emit-event.js). Never write to live harness data.

3. **Atomic commits:** Each task gets its own commit. Never combine tasks into one commit.

4. **Cross-vet:** After each tier (enforcement, redaction, capture quality), run the full test suite and verify no regressions.
