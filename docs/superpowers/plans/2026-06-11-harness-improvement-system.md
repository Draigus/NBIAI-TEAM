# Self-Healing Harness Improvement System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the RHO-inspired self-healing harness improvement system that captures failure signals from every session, diagnoses patterns weekly, proposes harness updates, and applies them through tiered approval gates.

**Architecture:** Two-principal separation (Recorder/Proposer + Applier) enforced by CLAUDE.md rules and a PreToolUse write-guard hook. Capture hooks emit structured events to JSONL files. A weekly cadence routine (headless Claude session) runs diagnosis, proposal generation, and reporting. Low-risk additive changes auto-apply; high-risk structural changes require Glen's review; governance changes require Glen to manually apply.

**Tech Stack:** Node.js (built-in modules only — zero npm dependencies), Claude Code hooks (`.claude/settings.json`), cadence prompts (headless `claude -p` via Task Scheduler), JSON config files, JSONL data files.

**Spec:** `docs/specs/2026-06-08-harness-improvement-system-design.md` (locked, 790 lines, 12 sections)

---

## Scope Note

The spec describes a tightly coupled pipeline: CAPTURE → DIAGNOSE → PROPOSE → APPLY → MONITOR. Each phase depends on the previous. This plan implements the full pipeline in one sequence. Natural break points if context limits become an issue:

- **After Task 8:** Capture infrastructure complete and testable (events accumulating in JSONL)
- **After Task 13:** Weekly routine ready, full cycle operational
- **After Task 16:** Integrated, registered, verified

---

## File Structure

### New files

```
.claude/harness/
  config/
    write-matrix.json            # Role-to-path enforcement rules (spec §2.4)
    redaction.json               # Do-not-log patterns (spec §3.4)
    failure-codes.json           # Enumerated failure codes (spec §4.5)
    risk-policy.json             # LOW/HIGH/BLOCKED_TO_APPLY rules (spec §5.2)
    entropy-checks.json          # Fast/slow scan patterns (spec §7.1-7.2)
    section-boundaries.json      # Markdown section rules for constraints (spec §2.3)
  lib/
    emit-event.js                # Core: ULID gen, session mgmt, redaction, atomic JSONL append
    write-guard.js               # PreToolUse: enforce write matrix on harness paths
    entropy-scan.js              # PostToolUse: fast entropy scan on git diffs
    transcript-parser.js         # Session-end: scan logs for candidate interventions
    bootstrap.js                 # One-time: normalise historical data into events
  data/
    events/
      .gitkeep
    .locks/
      .gitignore                 # *.lock
    .session_id                  # (git-ignored) current session ULID
  proposals/
    .gitkeep
  tests/
    test-emit-event.js
    test-write-guard.js
    test-entropy-scan.js
  changelog.md                   # Append-only apply history (Applier-written)
  HARNESS_HEALTH.md              # Weekly generated health report (Recorder-written)
  .gitignore                     # .locks/, .session_id

.claude/skills/harness-intervention/
  SKILL.md                       # /harness intervention command

scripts/cadence/prompts/
  harness-improvement.md         # Weekly routine prompt (THE brain)
```

### Modified files

```
.claude/settings.json            # Add capture hooks + write guard
CLAUDE.md                        # Add harness principal rules (Section B addendum)
company/routines.md              # Add harness-improvement entry
scripts/cadence/register-tasks.ps1  # Add harness-improvement task registration
```

---

### Task 1: Directory scaffold and data files

**Files:**
- Create: `.claude/harness/config/` (directory)
- Create: `.claude/harness/lib/` (directory)
- Create: `.claude/harness/data/events/.gitkeep`
- Create: `.claude/harness/data/.locks/.gitignore`
- Create: `.claude/harness/proposals/.gitkeep`
- Create: `.claude/harness/tests/` (directory)
- Create: `.claude/harness/changelog.md`
- Create: `.claude/harness/HARNESS_HEALTH.md`
- Create: `.claude/harness/.gitignore`

- [ ] **Step 1: Create directory structure**

Run:
```powershell
$base = "d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness"
New-Item -ItemType Directory -Force "$base\config"
New-Item -ItemType Directory -Force "$base\lib"
New-Item -ItemType Directory -Force "$base\data\events"
New-Item -ItemType Directory -Force "$base\data\.locks"
New-Item -ItemType Directory -Force "$base\proposals"
New-Item -ItemType Directory -Force "$base\tests"
```

Expected: Directories created without error.

- [ ] **Step 2: Create .gitkeep files**

Write empty files:
- `.claude/harness/data/events/.gitkeep` (empty)
- `.claude/harness/proposals/.gitkeep` (empty)

- [ ] **Step 3: Create .gitignore for locks and session state**

Write `.claude/harness/.gitignore`:
```
data/.locks/*.lock
data/.session_id
```

Write `.claude/harness/data/.locks/.gitignore`:
```
*.lock
```

- [ ] **Step 4: Create scaffold changelog.md**

Write `.claude/harness/changelog.md`:
```markdown
# Harness Improvement Changelog

Append-only record of every applied harness change. Written by the Applier principal.

---
```

- [ ] **Step 5: Create scaffold HARNESS_HEALTH.md**

Write `.claude/harness/HARNESS_HEALTH.md`:
```markdown
# Harness Health Report

Generated weekly by the Recorder principal. Will be populated after the first diagnosis cycle.

**Status:** Awaiting first diagnosis run.
```

- [ ] **Step 6: Commit scaffold**

```bash
git add .claude/harness/
git commit -m "feat(harness): directory scaffold and data files"
```

---

### Task 2: Configuration files

**Files:**
- Create: `.claude/harness/config/write-matrix.json`
- Create: `.claude/harness/config/redaction.json`
- Create: `.claude/harness/config/failure-codes.json`
- Create: `.claude/harness/config/risk-policy.json`
- Create: `.claude/harness/config/entropy-checks.json`
- Create: `.claude/harness/config/section-boundaries.json`

- [ ] **Step 1: Write write-matrix.json**

This is the role-to-path write matrix from spec §2.4. Read by `write-guard.js`.

Write `.claude/harness/config/write-matrix.json`:
```json
{
  "_comment": "Role-to-path write matrix. Enforced by write-guard.js PreToolUse hook. Spec §2.4.",
  "recorder_allowed": [
    { "path": ".claude/harness/data/**", "mode": "append_or_create" },
    { "path": ".claude/harness/proposals/**", "mode": "create_only" },
    { "path": ".claude/harness/HARNESS_HEALTH.md", "mode": "overwrite" }
  ],
  "applier_allowed": [
    { "path": ".claude/harness/changelog.md", "mode": "append" }
  ],
  "blocked": [
    { "path": ".claude/harness/config/**", "reason": "BLOCKED_TO_APPLY: governance config" },
    { "path": ".claude/harness/lib/**", "reason": "BLOCKED_TO_APPLY: harness engine code" }
  ]
}
```

- [ ] **Step 2: Write redaction.json**

Do-not-log patterns from spec §3.4. Read by `emit-event.js`.

Write `.claude/harness/config/redaction.json`:
```json
{
  "_comment": "Redaction patterns applied at event capture time. Spec §3.4.",
  "patterns": [
    "(?:API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)\\s*[:=]\\s*['\"]?[^\\s'\"]+",
    "postgres://[^\\s]+",
    "DATABASE_URL\\s*=\\s*[^\\s]+",
    "AZURE_CLIENT_SECRET\\s*=\\s*[^\\s]+",
    "GRANOLA_API_KEY\\s*=\\s*[^\\s]+",
    "Bearer\\s+[A-Za-z0-9._~+/=-]+"
  ],
  "client_sensitive_fields": {
    "_comment": "Per-client field patterns. Values matching these in event descriptions are redacted.",
    "couch_heroes": ["salary_amount", "compensation_details", "bank_details"],
    "lighthouse": ["revenue_figures", "player_count"]
  },
  "retention_days": {
    "raw_events": 90,
    "proposals": -1,
    "changelog": -1
  }
}
```

- [ ] **Step 3: Write failure-codes.json**

Enumerated failure codes from spec §4.5.

Write `.claude/harness/config/failure-codes.json`:
```json
{
  "_comment": "Enumerated failure codes for anti-regression tracking. Spec §4.5. Extensible via BLOCKED_TO_APPLY proposals only.",
  "codes": {
    "verification": [
      "verification_skipped",
      "verification_insufficient",
      "false_positive_verification"
    ],
    "skill_routing": [
      "mandatory_skill_skipped",
      "wrong_skill_selected",
      "skill_instruction_gap"
    ],
    "context_memory": [
      "context_not_loaded",
      "stale_memory_trusted",
      "context_overload"
    ],
    "role": [
      "role_not_dispatched",
      "role_knowledge_gap"
    ],
    "tool_execution": [
      "tool_misuse",
      "tool_failure_no_recovery",
      "test_mock_misuse"
    ],
    "permission_safety": [
      "unsafe_action_not_caught",
      "approval_gate_missed"
    ],
    "entropy": [
      "code_residue_left",
      "test_integrity_weakened",
      "docs_drift",
      "architecture_violation"
    ],
    "harness_meta": [
      "redaction_miss",
      "bad_path_classification",
      "manual_edit_collision",
      "log_parse_corruption",
      "proposal_applied_without_review"
    ]
  }
}
```

- [ ] **Step 4: Write risk-policy.json**

Risk classification rules from spec §5.2. Read by the weekly routine prompt (Claude interprets this during diagnosis).

Write `.claude/harness/config/risk-policy.json`:
```json
{
  "_comment": "Deterministic risk classification. Spec §5.2. Read by weekly routine prompt.",
  "LOW": {
    "description": "Auto-apply by Applier",
    "rules": [
      { "target": ".claude/skills/**/SKILL.md", "constraint": "additive_only", "description": "Adding checks/sections to existing skills" },
      { "target": "roles/*/AGENT.md", "constraint": "knowledge_section_only", "description": "Adding knowledge entries to role files" },
      { "target": "memory/feedback_*.md", "constraint": "frontmatter_schema_required", "description": "Creating new feedback memories with harness_rho tag" },
      { "target": "memory/MEMORY.md", "constraint": "index_entry_only", "description": "Adding index entries" },
      { "action": "flag_stale_memory", "description": "Flagging stale memories for review" },
      { "action": "update_last_verified", "description": "Updating last_verified dates on brain modules" }
    ]
  },
  "HIGH": {
    "description": "Glen approves, then Applier executes",
    "rules": [
      { "target": "CLAUDE.md", "description": "Structural edits including mandatory skill table rows" },
      { "target": ".claude/hooks/**", "description": "Hook behaviour changes" },
      { "action": "routine_schedule_change", "description": "Routine schedule changes" },
      { "action": "role_dispatch_change", "description": "Role dispatch routing table changes" },
      { "target": ".claude/skills/**", "action": "create_or_delete", "description": "Skill creation or deletion" },
      { "target": "roles/*/AGENT.md", "constraint": "full_edit", "description": "Full AGENT.md edits beyond knowledge sections" },
      { "condition": "confidence_below_70", "description": "Any proposal with fewer than 3 supporting evidence events" }
    ]
  },
  "BLOCKED_TO_APPLY": {
    "description": "Glen applies manually from generated diff",
    "rules": [
      { "target": ".claude/harness/config/**", "description": "Risk policy, redaction rules, failure codes" },
      { "target": ".claude/harness/lib/**", "description": "Decision logic or engine code" },
      { "action": "remove_hard_rule", "description": "Removing any HARD RULE from CLAUDE.md or feedback memories" },
      { "action": "disable_mandatory_skill", "description": "Disabling a mandatory skill invocation" },
      { "action": "remove_approval_gate", "description": "Removing an approval gate" },
      { "action": "any_redaction_change", "description": "Any redaction rule change including tightening or loosening" },
      { "action": "self_weakening", "description": "Proposals that reduce verification or loosen permission boundaries" }
    ]
  }
}
```

- [ ] **Step 5: Write entropy-checks.json**

Fast/slow scan patterns from spec §7.1-7.2. Read by `entropy-scan.js`.

Write `.claude/harness/config/entropy-checks.json`:
```json
{
  "_comment": "Entropy scan patterns. Fast scan <15s per session. Slow scan weekly. Spec §7.1-7.2.",
  "fast_scan": {
    "code_residue": [
      { "name": "console.log", "regex": "^\\+.*console\\.log\\(", "flags": "gm", "severity_one": 1, "severity_many": 2, "threshold": 3 },
      { "name": "debugger", "regex": "^\\+.*\\bdebugger\\b", "flags": "gm", "severity_one": 2, "severity_many": 3, "threshold": 1 },
      { "name": "TODO added", "regex": "^\\+.*\\bTODO\\b", "flags": "gm", "severity_one": 1, "severity_many": 2, "threshold": 3 },
      { "name": "commented-out code", "regex": "^\\+\\s*//\\s*(const|let|var|function|if|for|while|return)\\b", "flags": "gm", "severity_one": 1, "severity_many": 2, "threshold": 5 }
    ],
    "test_integrity": {
      "weakened_assertions": "^-.*\\b(expect|assert|toBe|toEqual|toMatch|toThrow)\\b",
      "added_skips": "^\\+.*\\b(\\.skip|\\.todo|xit\\(|xdescribe\\()\\b",
      "severity": 3
    },
    "file_residue": {
      "temp_patterns": ["^_tmp", "^tmp_", "\\.bak$", "\\.debug\\.", "^debug-", "\\.log$"],
      "severity": 1
    },
    "dependency_hygiene": {
      "new_require": "^\\+.*\\brequire\\(",
      "new_import": "^\\+.*\\bimport\\b",
      "severity": 1
    }
  },
  "slow_scan": {
    "_comment": "Slow scan checks are defined in the weekly routine prompt, not here. They require heuristic analysis by Claude, not regex matching."
  }
}
```

- [ ] **Step 6: Write section-boundaries.json**

Markdown section rules for constraint checking from spec §2.3.

Write `.claude/harness/config/section-boundaries.json`:
```json
{
  "_comment": "Markdown heading patterns for knowledge_section_only constraint. Spec §2.3.",
  "knowledge_section_headings": [
    "## Domain Knowledge",
    "## Known Issues",
    "## Common Patterns",
    "## Reference Data",
    "## Industry Context",
    "## Technical Notes"
  ],
  "heading_level_boundary": "##",
  "_usage": "A diff hunk is 'knowledge_section_only' if ALL changed lines fall between a matching heading and the next heading of equal or higher level (# or ##). Nested headings (###, ####) within the section are included. Fail closed: if section boundaries are ambiguous, classify as HIGH."
}
```

- [ ] **Step 7: Commit all configs**

```bash
git add .claude/harness/config/
git commit -m "feat(harness): configuration files for write matrix, redaction, risk policy, failure codes, entropy checks, section boundaries"
```

---

### Task 3: Core utility — emit-event.js

**Files:**
- Create: `.claude/harness/lib/emit-event.js`

This is the core capture utility. All hooks call this to write events. Handles ULID generation, session ID management, redaction, and atomic JSONL append with file locking. Zero external dependencies.

- [ ] **Step 1: Write emit-event.js**

Write `.claude/harness/lib/emit-event.js`:
```javascript
#!/usr/bin/env node
'use strict';
// emit-event.js — Core event capture utility for the harness improvement system.
// Called by PostToolUse/PreToolUse hooks. Reads hook JSON from stdin, builds a
// structured event, applies redaction, appends atomically to session JSONL.
// Usage: <hook_stdin> | node .claude/harness/lib/emit-event.js <event_type>
// Zero external dependencies — Node.js built-ins only.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const HARNESS_DIR = path.join(PROJECT_DIR, '.claude', 'harness');
const DATA_DIR = path.join(HARNESS_DIR, 'data');
const EVENTS_DIR = path.join(DATA_DIR, 'events');
const LOCKS_DIR = path.join(DATA_DIR, '.locks');
const REDACTION_PATH = path.join(HARNESS_DIR, 'config', 'redaction.json');

// --- ULID generation (timestamp + random, no deps) ---
function ulid() {
  const CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const ts = Date.now();
  let encoded = '';
  let t = ts;
  for (let i = 9; i >= 0; i--) {
    encoded = CHARS[t % 32] + encoded;
    t = Math.floor(t / 32);
  }
  const rand = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    encoded += CHARS[rand[i] % 32];
  }
  return encoded;
}

// --- Session ID management ---
function getSessionId() {
  const sessionFile = path.join(DATA_DIR, '.session_id');
  try {
    const raw = fs.readFileSync(sessionFile, 'utf8');
    const data = JSON.parse(raw);
    if (Date.now() - data.created < 4 * 3600 * 1000) return data.id;
  } catch { /* missing or stale — generate new */ }

  const id = 'ses_' + ulid();
  fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
  fs.writeFileSync(sessionFile, JSON.stringify({ id, created: Date.now() }));
  return id;
}

// --- Redaction ---
function loadRedactionPatterns() {
  try {
    const cfg = JSON.parse(fs.readFileSync(REDACTION_PATH, 'utf8'));
    return (cfg.patterns || []).map(p => new RegExp(p, 'gi'));
  } catch {
    return [];
  }
}

function applyRedaction(eventObj, patterns) {
  if (!patterns.length) return { event: eventObj, redacted: false };
  let json = JSON.stringify(eventObj);
  let redacted = false;
  for (const re of patterns) {
    re.lastIndex = 0;
    if (re.test(json)) {
      re.lastIndex = 0;
      json = json.replace(re, '[REDACTED]');
      redacted = true;
    }
  }
  const event = JSON.parse(json);
  if (redacted) event.redacted = true;
  return { event, redacted };
}

// --- File locking ---
function acquireLock(lockPath, ttlMs, retries) {
  ttlMs = ttlMs || 10000;
  retries = retries || 3;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify({
        pid: process.pid,
        expires_at: Date.now() + ttlMs
      }), { flag: 'wx' });
      return true;
    } catch (e) {
      if (e.code === 'EEXIST') {
        try {
          const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (lock.expires_at < Date.now()) {
            fs.unlinkSync(lockPath);
            continue;
          }
        } catch {
          try { fs.unlinkSync(lockPath); } catch {}
          continue;
        }
        if (attempt < retries - 1) {
          const deadline = Date.now() + 1000;
          while (Date.now() < deadline) { /* busy-wait 1s */ }
        }
      } else {
        return false;
      }
    }
  }
  return false;
}

function releaseLock(lockPath) {
  try { fs.unlinkSync(lockPath); } catch {}
}

// --- Event construction ---
function buildEvent(type, hookInput) {
  const ts = new Date().toISOString();
  const base = {
    event_id: 'evt_' + ulid(),
    session_id: getSessionId(),
    schema_version: 1,
    type: type,
    ts: ts,
    redacted: false
  };

  const ti = hookInput.tool_input || {};
  const toolName = hookInput.tool_name || '';
  const isError = hookInput.is_error === true;

  switch (type) {
    case 'tool_outcome':
      return Object.assign(base, {
        tool: toolName,
        command_summary: String(ti.command || ti.file_path || ti.pattern || ti.skill || '').slice(0, 200),
        result: isError ? 'failure' : 'success',
        recovery_action: null,
        duration_ms: null
      });

    case 'skill_usage':
      return Object.assign(base, {
        skill: ti.skill || '',
        action: 'invoked',
        task_type: null,
        mandatory: null,
        skip_reason: null
      });

    case 'context_pressure':
      return Object.assign(base, {
        event: ti.event || 'unknown',
        context_pct: ti.context_pct || null,
        files_in_context: ti.files_in_context || null,
        banks_loaded: ti.banks_loaded || []
      });

    case 'role_dispatch':
      return Object.assign(base, {
        role: ti.role || '',
        trigger: ti.trigger || '',
        task_domain: ti.task_domain || '',
        intervention_followed: false
      });

    case 'entropy_signal':
      return Object.assign(base, {
        category: hookInput.category || '',
        severity: hookInput.severity || 0,
        file: hookInput.file || '',
        detail: hookInput.detail || '',
        scan_tier: hookInput.scan_tier || 'fast'
      });

    case 'intervention':
      return Object.assign(base, {
        severity: hookInput.severity || 'correction',
        harness_component: hookInput.harness_component || '',
        description: hookInput.description || '',
        task_context: hookInput.task_context || '',
        avoidable: hookInput.avoidable || false,
        existing_rule_missed: hookInput.existing_rule_missed || null,
        proposed_fix: hookInput.proposed_fix || null,
        confirmed: hookInput.confirmed || false,
        capture_method: hookInput.capture_method || 'explicit_command'
      });

    default:
      return Object.assign(base, { raw: hookInput });
  }
}

// --- Main ---
function main() {
  const eventType = process.argv[2];
  if (!eventType) process.exit(0);

  let stdin = '';
  try { stdin = fs.readFileSync(0, 'utf8'); } catch {}

  let hookInput = {};
  try { hookInput = JSON.parse(stdin); } catch {}

  const event = buildEvent(eventType, hookInput);
  const patterns = loadRedactionPatterns();
  const { event: redacted } = applyRedaction(event, patterns);

  const dateStr = redacted.ts.slice(0, 10);
  const eventDir = path.join(EVENTS_DIR, dateStr);
  fs.mkdirSync(eventDir, { recursive: true });

  const outFile = path.join(eventDir, redacted.session_id + '.jsonl');
  const lockFile = path.join(LOCKS_DIR, 'write.lock');
  fs.mkdirSync(LOCKS_DIR, { recursive: true });

  if (acquireLock(lockFile)) {
    try {
      fs.appendFileSync(outFile, JSON.stringify(redacted) + '\n');
    } finally {
      releaseLock(lockFile);
    }
  }
}

try { main(); } catch { /* never break the hook chain */ }
```

- [ ] **Step 2: Verify the script parses without error**

Run:
```bash
node -c ".claude/harness/lib/emit-event.js"
```

Expected: No output (syntax OK).

- [ ] **Step 3: Commit**

```bash
git add .claude/harness/lib/emit-event.js
git commit -m "feat(harness): core event writer — ULID, session mgmt, redaction, atomic JSONL append"
```

---

### Task 4: Test emit-event.js

**Files:**
- Create: `.claude/harness/tests/test-emit-event.js`

- [ ] **Step 1: Write test script**

Write `.claude/harness/tests/test-emit-event.js`:
```javascript
#!/usr/bin/env node
'use strict';
// Integration test for emit-event.js. Runs the script with mock stdin and
// verifies JSONL output. Run: node .claude/harness/tests/test-emit-event.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..', '..');
const EMIT = path.join(PROJECT_DIR, '.claude', 'harness', 'lib', 'emit-event.js');
const DATA_DIR = path.join(PROJECT_DIR, '.claude', 'harness', 'data');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

function cleanup() {
  const sessionFile = path.join(DATA_DIR, '.session_id');
  try { fs.unlinkSync(sessionFile); } catch {}
}

console.log('Test: emit-event.js');

// Test 1: tool_outcome event
console.log('\n--- tool_outcome ---');
const mockInput = JSON.stringify({
  tool_name: 'Bash',
  tool_input: { command: 'npm test' },
  is_error: false
});

cleanup();
try {
  execSync(`echo '${mockInput.replace(/'/g, "'\\''")}' | node "${EMIT}" tool_outcome`, {
    cwd: PROJECT_DIR,
    env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: PROJECT_DIR }),
    timeout: 10000
  });
} catch (e) {
  console.error('Execution failed:', e.message);
}

const today = new Date().toISOString().slice(0, 10);
const eventsDir = path.join(DATA_DIR, 'events', today);
const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.jsonl'));
assert(files.length > 0, 'JSONL file created');

if (files.length > 0) {
  const content = fs.readFileSync(path.join(eventsDir, files[0]), 'utf8').trim();
  const lines = content.split('\n');
  const event = JSON.parse(lines[lines.length - 1]);
  assert(event.type === 'tool_outcome', 'Event type is tool_outcome');
  assert(event.tool === 'Bash', 'Tool name is Bash');
  assert(event.command_summary === 'npm test', 'Command summary captured');
  assert(event.result === 'success', 'Result is success');
  assert(event.event_id.startsWith('evt_'), 'Event ID has correct prefix');
  assert(event.session_id.startsWith('ses_'), 'Session ID has correct prefix');
  assert(event.schema_version === 1, 'Schema version is 1');
}

// Test 2: tool_outcome with error
console.log('\n--- tool_outcome (error) ---');
const errorInput = JSON.stringify({
  tool_name: 'Bash',
  tool_input: { command: 'npm test' },
  is_error: true
});
try {
  execSync(`echo '${errorInput.replace(/'/g, "'\\''")}' | node "${EMIT}" tool_outcome`, {
    cwd: PROJECT_DIR,
    env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: PROJECT_DIR }),
    timeout: 10000
  });
} catch {}
const content2 = fs.readFileSync(path.join(eventsDir, files[0]), 'utf8').trim();
const lastEvent = JSON.parse(content2.split('\n').pop());
assert(lastEvent.result === 'failure', 'Error input produces failure result');

// Test 3: skill_usage event
console.log('\n--- skill_usage ---');
const skillInput = JSON.stringify({
  tool_name: 'Skill',
  tool_input: { skill: 'systematic-debugging' }
});
try {
  execSync(`echo '${skillInput.replace(/'/g, "'\\''")}' | node "${EMIT}" skill_usage`, {
    cwd: PROJECT_DIR,
    env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: PROJECT_DIR }),
    timeout: 10000
  });
} catch {}
const content3 = fs.readFileSync(path.join(eventsDir, files[0]), 'utf8').trim();
const skillEvent = JSON.parse(content3.split('\n').pop());
assert(skillEvent.type === 'skill_usage', 'Skill usage event type correct');
assert(skillEvent.skill === 'systematic-debugging', 'Skill name captured');

// Test 4: Session ID persistence
console.log('\n--- session ID persistence ---');
assert(lastEvent.session_id === skillEvent.session_id, 'Same session ID across calls');

// Summary
console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: Run test**

Run:
```bash
node .claude/harness/tests/test-emit-event.js
```

Expected: All assertions PASS.

- [ ] **Step 3: Clean up test data**

Remove test events (they have test session IDs):
```bash
rm -rf .claude/harness/data/events/$(date +%Y-%m-%d)
rm -f .claude/harness/data/.session_id
```

- [ ] **Step 4: Commit**

```bash
git add .claude/harness/tests/test-emit-event.js
git commit -m "test(harness): emit-event integration tests"
```

---

### Task 5: Write guard — write-guard.js + hook wiring

**Files:**
- Create: `.claude/harness/lib/write-guard.js`
- Modify: `.claude/settings.json` (add PreToolUse hook for Write|Edit)

- [ ] **Step 1: Write write-guard.js**

Write `.claude/harness/lib/write-guard.js`:
```javascript
#!/usr/bin/env node
'use strict';
// write-guard.js — PreToolUse hook that blocks writes to harness governance files.
// Reads write-matrix.json. Only fires on paths within .claude/harness/.
// Paths outside harness scope are not affected (apply allowlist is enforced by
// CLAUDE.md rules and the weekly routine prompt, not by this hook).

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MATRIX_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'write-matrix.json');

function matchGlob(filePath, pattern) {
  const re = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*');
  return new RegExp('^' + re + '$').test(filePath);
}

function main() {
  let stdin = '';
  try { stdin = fs.readFileSync(0, 'utf8'); } catch { process.exit(0); }

  let hookData = {};
  try { hookData = JSON.parse(stdin); } catch { process.exit(0); }

  const filePath = (hookData.tool_input || {}).file_path || '';
  if (!filePath) process.exit(0);

  const norm = filePath.replace(/\\/g, '/');
  const marker = '.claude/harness/';
  const idx = norm.indexOf(marker);
  if (idx === -1) process.exit(0);

  const relPath = norm.slice(idx);

  let matrix;
  try { matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8')); }
  catch { process.exit(0); }

  for (const entry of (matrix.recorder_allowed || [])) {
    if (matchGlob(relPath, entry.path)) process.exit(0);
  }
  for (const entry of (matrix.applier_allowed || [])) {
    if (matchGlob(relPath, entry.path)) process.exit(0);
  }

  for (const entry of (matrix.blocked || [])) {
    if (matchGlob(relPath, entry.path)) {
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: 'HARNESS_WRITE_DENIED: ' + entry.reason + ' — path: ' + relPath
      }));
      process.exit(0);
    }
  }

  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'HARNESS_WRITE_DENIED: path ' + relPath + ' is not in any allowlist entry in write-matrix.json.'
  }));
}

try { main(); } catch { /* never break hook chain */ }
```

- [ ] **Step 2: Add write-guard hook to settings.json**

Read the current `.claude/settings.json`. Add this entry to the `hooks.PreToolUse` array:

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "node \"${CLAUDE_PROJECT_DIR:-.}/.claude/harness/lib/write-guard.js\"",
      "shell": "bash",
      "timeout": 5
    }
  ]
}
```

Add it after the existing `Read|Glob` PreToolUse entry. Do NOT remove any existing entries.

- [ ] **Step 3: Verify hook parses**

Run:
```bash
node -c .claude/harness/lib/write-guard.js
```

Then verify settings.json is valid JSON:
```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('Valid JSON')"
```

Expected: Both pass.

- [ ] **Step 4: Commit**

```bash
git add .claude/harness/lib/write-guard.js .claude/settings.json
git commit -m "feat(harness): write guard hook — blocks writes to harness config and lib"
```

---

### Task 6: Test write-guard.js

**Files:**
- Create: `.claude/harness/tests/test-write-guard.js`

- [ ] **Step 1: Write test script**

Write `.claude/harness/tests/test-write-guard.js`:
```javascript
#!/usr/bin/env node
'use strict';
// Tests write-guard.js by feeding mock hook JSON via stdin.
// Run: node .claude/harness/tests/test-write-guard.js

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..', '..');
const GUARD = path.join(PROJECT_DIR, '.claude', 'harness', 'lib', 'write-guard.js');
const env = Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: PROJECT_DIR });

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

function runGuard(filePath) {
  const input = JSON.stringify({ tool_input: { file_path: filePath } });
  try {
    const out = execSync(`echo '${input.replace(/'/g, "'\\''")}' | node "${GUARD}"`, {
      cwd: PROJECT_DIR, env, timeout: 5000, encoding: 'utf8'
    });
    return out.trim() ? JSON.parse(out.trim()) : null;
  } catch (e) {
    if (e.stdout) return JSON.parse(e.stdout.trim());
    return null;
  }
}

console.log('Test: write-guard.js\n');

// Allowed: data directory
console.log('--- Allowed paths ---');
let r = runGuard(path.join(PROJECT_DIR, '.claude/harness/data/events/2026-06-11/ses_test.jsonl'));
assert(r === null, 'data/events/ path allowed (no output)');

r = runGuard(path.join(PROJECT_DIR, '.claude/harness/proposals/2026-W24/RHO-test.json'));
assert(r === null, 'proposals/ path allowed');

r = runGuard(path.join(PROJECT_DIR, '.claude/harness/HARNESS_HEALTH.md'));
assert(r === null, 'HARNESS_HEALTH.md allowed');

r = runGuard(path.join(PROJECT_DIR, '.claude/harness/changelog.md'));
assert(r === null, 'changelog.md allowed');

// Blocked: config directory
console.log('\n--- Blocked paths ---');
r = runGuard(path.join(PROJECT_DIR, '.claude/harness/config/risk-policy.json'));
assert(r && r.decision === 'block', 'config/risk-policy.json blocked');
assert(r && r.reason.includes('HARNESS_WRITE_DENIED'), 'Block message correct');

r = runGuard(path.join(PROJECT_DIR, '.claude/harness/lib/emit-event.js'));
assert(r && r.decision === 'block', 'lib/emit-event.js blocked');

// Not harness: no restriction
console.log('\n--- Non-harness paths ---');
r = runGuard(path.join(PROJECT_DIR, 'dashboard-server/server.js'));
assert(r === null, 'Non-harness path not restricted');

r = runGuard(path.join(PROJECT_DIR, '.claude/skills/tdd/SKILL.md'));
assert(r === null, 'Skills path not restricted by write guard');

console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: Run test**

Run:
```bash
node .claude/harness/tests/test-write-guard.js
```

Expected: All assertions PASS.

- [ ] **Step 3: Commit**

```bash
git add .claude/harness/tests/test-write-guard.js
git commit -m "test(harness): write guard tests — allowed, blocked, and non-harness paths"
```

---

### Task 7: Capture hooks — tool_outcome and skill_usage

**Files:**
- Modify: `.claude/settings.json` (add PostToolUse hooks)

- [ ] **Step 1: Add tool_outcome capture hook**

Add this entry to the `hooks.PostToolUse` array in `.claude/settings.json`:

```json
{
  "matcher": "Bash|PowerShell|Agent|Edit|Write",
  "hooks": [
    {
      "type": "command",
      "command": "node \"${CLAUDE_PROJECT_DIR:-.}/.claude/harness/lib/emit-event.js\" tool_outcome",
      "shell": "bash",
      "timeout": 5,
      "async": true,
      "statusMessage": "Capturing harness event..."
    }
  ]
}
```

This captures tool outcomes for the high-signal tools. `async: true` ensures zero latency impact on the main session.

- [ ] **Step 2: Add skill_usage capture hook**

Add this entry to the `hooks.PostToolUse` array in `.claude/settings.json`:

```json
{
  "matcher": "Skill",
  "hooks": [
    {
      "type": "command",
      "command": "node \"${CLAUDE_PROJECT_DIR:-.}/.claude/harness/lib/emit-event.js\" skill_usage",
      "shell": "bash",
      "timeout": 5,
      "async": true,
      "statusMessage": "Logging skill invocation..."
    }
  ]
}
```

- [ ] **Step 3: Verify settings.json is valid**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('Valid JSON')"
```

Expected: "Valid JSON"

- [ ] **Step 4: Manual smoke test**

Run any Bash command in the session. Check that a JSONL file appeared:
```bash
ls .claude/harness/data/events/$(date +%Y-%m-%d)/
```

Expected: A `ses_*.jsonl` file exists.

Read the last line:
```bash
tail -1 .claude/harness/data/events/$(date +%Y-%m-%d)/ses_*.jsonl
```

Expected: Valid JSON with `"type": "tool_outcome"`.

- [ ] **Step 5: Commit**

```bash
git add .claude/settings.json
git commit -m "feat(harness): capture hooks for tool_outcome and skill_usage events"
```

---

### Task 8: Entropy scan — entropy-scan.js + hook wiring

**Files:**
- Create: `.claude/harness/lib/entropy-scan.js`
- Modify: `.claude/settings.json` (extend git commit PostToolUse)

- [ ] **Step 1: Write entropy-scan.js**

Write `.claude/harness/lib/entropy-scan.js`:
```javascript
#!/usr/bin/env node
'use strict';
// entropy-scan.js — Fast entropy scan on the last git commit's diff.
// Checks for code residue, test integrity weakening, file residue.
// Emits entropy_signal events via emit-event.js. Target: <15 seconds.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CHECKS_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'entropy-checks.json');
const EMIT_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'lib', 'emit-event.js');
const TREND_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'entropy_trend.jsonl');

function main() {
  let checks;
  try { checks = JSON.parse(fs.readFileSync(CHECKS_PATH, 'utf8')); }
  catch { return; }

  let diff;
  try {
    diff = execSync('git diff HEAD~1 HEAD', {
      cwd: PROJECT_DIR, encoding: 'utf8', timeout: 10000
    });
  } catch { return; }

  if (!diff || diff.length < 10) return;

  const lines = diff.split('\n');
  const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
  const removedLines = lines.filter(l => l.startsWith('-') && !l.startsWith('---'));
  const signals = [];

  // Code residue
  const fast = checks.fast_scan || {};
  for (const check of (fast.code_residue || [])) {
    const re = new RegExp(check.regex, check.flags || 'gm');
    const hits = addedLines.filter(l => re.test(l));
    re.lastIndex = 0;
    if (hits.length > 0) {
      const sev = hits.length > (check.threshold || 3) ? (check.severity_many || 2) : (check.severity_one || 1);
      signals.push({
        category: 'code',
        severity: sev,
        detail: check.name + ': ' + hits.length + ' instances in added lines',
        scan_tier: 'fast'
      });
    }
  }

  // Test integrity
  const ti = fast.test_integrity || {};
  const testDiffSections = [];
  let inTestFile = false;
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      inTestFile = /\.(test|spec)\.|\/tests\//.test(line);
    }
    if (inTestFile) testDiffSections.push(line);
  }

  if (testDiffSections.length > 0) {
    const weakened = ti.weakened_assertions
      ? testDiffSections.filter(l => l.startsWith('-') && new RegExp(ti.weakened_assertions).test(l))
      : [];
    const skips = ti.added_skips
      ? testDiffSections.filter(l => l.startsWith('+') && new RegExp(ti.added_skips).test(l))
      : [];
    if (weakened.length > 0 || skips.length > 0) {
      signals.push({
        category: 'test',
        severity: ti.severity || 3,
        detail: 'Test integrity: ' + weakened.length + ' assertions removed, ' + skips.length + ' skips added',
        scan_tier: 'fast'
      });
    }
  }

  // File residue
  const fr = fast.file_residue || {};
  const newFiles = lines
    .filter(l => l.startsWith('diff --git'))
    .map(l => { const m = l.match(/ b\/(.+)$/); return m ? m[1] : ''; })
    .filter(f => f && (fr.temp_patterns || []).some(p => new RegExp(p, 'i').test(path.basename(f))));
  if (newFiles.length > 0) {
    signals.push({
      category: 'file_residue',
      severity: fr.severity || 1,
      detail: 'Possible temp/debug files: ' + newFiles.join(', '),
      scan_tier: 'fast'
    });
  }

  // Emit signals via emit-event.js
  for (const sig of signals) {
    try {
      const payload = JSON.stringify(sig);
      execSync('node "' + EMIT_PATH + '" entropy_signal', {
        cwd: PROJECT_DIR,
        input: payload,
        encoding: 'utf8',
        timeout: 5000
      });
    } catch { /* don't break commit flow */ }
  }

  // Append to entropy trend
  if (signals.length > 0) {
    const score = signals.reduce((s, sig) => s + sig.severity, 0);
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      score: score,
      signal_count: signals.length,
      categories: [...new Set(signals.map(s => s.category))]
    });
    try {
      fs.mkdirSync(path.dirname(TREND_PATH), { recursive: true });
      fs.appendFileSync(TREND_PATH, entry + '\n');
    } catch {}
  }
}

try { main(); } catch { /* never break hook chain */ }
```

- [ ] **Step 2: Wire entropy scan into the existing git commit hook**

In `.claude/settings.json`, the existing PostToolUse entry for `Bash` has `"if": "Bash(git commit *)"`. Add a second hook to that entry's `hooks` array:

```json
{
  "type": "command",
  "command": "node \"${CLAUDE_PROJECT_DIR:-.}/.claude/harness/lib/entropy-scan.js\"",
  "shell": "bash",
  "timeout": 15,
  "async": true,
  "statusMessage": "Running entropy scan..."
}
```

This runs AFTER the existing auto-push hook, asynchronously.

- [ ] **Step 3: Verify syntax**

```bash
node -c .claude/harness/lib/entropy-scan.js
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('Valid JSON')"
```

- [ ] **Step 4: Commit**

```bash
git add .claude/harness/lib/entropy-scan.js .claude/settings.json
git commit -m "feat(harness): entropy fast scan on git commits — code residue, test integrity, file residue"
```

---

### Task 9: Test entropy-scan.js

**Files:**
- Create: `.claude/harness/tests/test-entropy-scan.js`

- [ ] **Step 1: Write test script**

Write `.claude/harness/tests/test-entropy-scan.js`:
```javascript
#!/usr/bin/env node
'use strict';
// Tests entropy-scan.js pattern matching against mock diffs.
// Does NOT require a real git repo — tests the scan logic directly.
// Run: node .claude/harness/tests/test-entropy-scan.js

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..', '..');
const CHECKS_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'entropy-checks.json');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS: ' + msg); }
  else { failed++; console.error('  FAIL: ' + msg); }
}

const checks = JSON.parse(fs.readFileSync(CHECKS_PATH, 'utf8'));

console.log('Test: entropy check patterns\n');

// Test code residue patterns against sample diff lines
const codeResidueTests = [
  { line: '+  console.log("debug");', name: 'console.log', shouldMatch: true },
  { line: '+  debugger;', name: 'debugger', shouldMatch: true },
  { line: '+  // TODO: fix this', name: 'TODO added', shouldMatch: true },
  { line: '+  // const oldVar = 5;', name: 'commented-out code', shouldMatch: true },
  { line: '+  const x = 5;', name: 'console.log', shouldMatch: false },
  { line: '-  console.log("removed");', name: 'console.log', shouldMatch: false }
];

console.log('--- Code residue patterns ---');
for (const t of codeResidueTests) {
  const check = checks.fast_scan.code_residue.find(c => c.name === t.name);
  if (!check) { assert(false, 'Pattern not found: ' + t.name); continue; }
  const re = new RegExp(check.regex, check.flags || 'gm');
  const matches = re.test(t.line);
  assert(matches === t.shouldMatch, t.name + ' ' + (t.shouldMatch ? 'matches' : 'rejects') + ': ' + t.line.trim());
}

// Test test integrity patterns
console.log('\n--- Test integrity patterns ---');
const ti = checks.fast_scan.test_integrity;
const weakenedRe = new RegExp(ti.weakened_assertions);
assert(weakenedRe.test('-  expect(result).toBe(5)'), 'Detects removed assertion');
assert(!weakenedRe.test('+  expect(result).toBe(5)'), 'Ignores added assertion');

const skipRe = new RegExp(ti.added_skips);
assert(skipRe.test('+  it.skip("disabled test")'), 'Detects added .skip');
assert(skipRe.test('+  xit("disabled")'), 'Detects xit');
assert(!skipRe.test('-  it.skip("was disabled")'), 'Ignores removed skip');

console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 2: Run test**

Run:
```bash
node .claude/harness/tests/test-entropy-scan.js
```

Expected: All assertions PASS.

- [ ] **Step 3: Commit**

```bash
git add .claude/harness/tests/test-entropy-scan.js
git commit -m "test(harness): entropy scan pattern matching tests"
```

---

### Task 10: /harness intervention skill

**Files:**
- Create: `.claude/skills/harness-intervention/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Write `.claude/skills/harness-intervention/SKILL.md`:
```markdown
---
name: harness-intervention
description: "Flag an intervention during a session — Glen corrected the approach, redirected, or rejected output. Creates a confirmed intervention event in the harness capture layer. Use when: Glen correction, intervention, approach rejected, wrong approach, redirect, stop doing that, harness flag, log correction, capture feedback."
user-invocable: true
---

# Harness Intervention

Capture an explicit intervention event — Glen corrected, redirected, or rejected the current approach.

This creates a `confirmed: true` intervention event in `.claude/harness/data/events/` for the current session. The weekly diagnosis routine uses these events to identify harness gaps and propose improvements.

## When to use

- Glen says "no", "stop", "don't do that", "that's wrong"
- Glen redirects the approach ("actually, do X instead")
- Glen rejects output ("this isn't what I asked for")
- You realise an existing rule/skill/memory should have prevented the mistake

## Steps

1. **Classify severity:**
   - `correction` — Glen corrected a specific detail or approach
   - `redirect` — Glen changed the direction entirely
   - `rejection` — Glen rejected the output

2. **Identify the harness component that failed:**
   - `context` — relevant information wasn't loaded
   - `skill_routing` — wrong skill or skill not invoked
   - `verification` — output wasn't verified properly
   - `memory` — stale or missing memory caused the error
   - `permission` — action should have required approval
   - `tool_use` — wrong tool or tool used incorrectly
   - `role_dispatch` — relevant role not loaded

3. **Check for existing rules:**
   - Search CLAUDE.md, feedback memories, and active skill files
   - Did an existing rule already cover this case?
   - If yes, record which rule was missed

4. **Write the event by running:**

```bash
node "${CLAUDE_PROJECT_DIR:-.}/.claude/harness/lib/emit-event.js" intervention <<'EVENTJSON'
{
  "severity": "<correction|redirect|rejection>",
  "harness_component": "<context|skill_routing|verification|memory|permission|tool_use|role_dispatch>",
  "description": "<What Glen said/did, in plain English>",
  "task_context": "<What task was being worked on>",
  "avoidable": <true|false>,
  "existing_rule_missed": "<filename or null>",
  "proposed_fix": "<What harness change would prevent this>",
  "confirmed": true,
  "capture_method": "explicit_command"
}
EVENTJSON
```

5. **Acknowledge to Glen:** "Logged harness intervention: [one-line summary]. The weekly diagnosis will incorporate this."

## Do NOT use for

- Glen asking a question (not a correction)
- Glen providing new information (not correcting existing behaviour)
- Technical errors (tool failures, network issues) — those are captured automatically
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/harness-intervention/
git commit -m "feat(harness): /harness intervention skill for explicit correction capture"
```

---

### Task 11: Transcript parser — candidate signal extraction

**Files:**
- Create: `.claude/harness/lib/transcript-parser.js`

- [ ] **Step 1: Write transcript-parser.js**

Write `.claude/harness/lib/transcript-parser.js`:
```javascript
#!/usr/bin/env node
'use strict';
// transcript-parser.js — Scans session log files for correction indicators.
// Outputs candidate_signal events to candidate_signals.jsonl.
// Called by the weekly routine or manually.
// Usage: node .claude/harness/lib/transcript-parser.js [session-log-path]
// If no path given, scans the most recent session log.

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LOGS_DIR = path.join(PROJECT_DIR, 'projects', 'nbi_dashboard', 'session_logs');
const SIGNALS_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'candidate_signals.jsonl');

const CORRECTION_PATTERNS = [
  { pattern: /\b(no[, ]+not that|don't do that|stop doing|that's wrong|that's not right)\b/gi, severity: 'correction' },
  { pattern: /\b(you need to (fucking )?fix|what the fuck|how dare you)\b/gi, severity: 'rejection' },
  { pattern: /\b(actually[, ]+do .+ instead|no[, ]+I (want|need|meant))\b/gi, severity: 'redirect' },
  { pattern: /\b(that's not what I asked|I said .+ not)\b/gi, severity: 'rejection' },
  { pattern: /\b(wrong approach|missed the point|you're not listening)\b/gi, severity: 'rejection' }
];

function findSessionLog(targetPath) {
  if (targetPath) return targetPath;
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    return files.length > 0 ? path.join(LOGS_DIR, files[0]) : null;
  } catch { return null; }
}

function extractSignals(content, filePath) {
  const signals = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, severity } of CORRECTION_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(' ').slice(0, 300);
        signals.push({
          source_file: path.basename(filePath),
          source_line: i + 1,
          matched_text: match[0],
          severity: severity,
          context: context,
          confidence: 'low',
          confirmed: false,
          ts: new Date().toISOString()
        });
        break;
      }
    }
  }

  return signals;
}

function main() {
  const targetPath = process.argv[2] || null;
  const logPath = findSessionLog(targetPath);
  if (!logPath || !fs.existsSync(logPath)) {
    console.log('No session log found');
    process.exit(0);
  }

  const content = fs.readFileSync(logPath, 'utf8');
  const signals = extractSignals(content, logPath);

  if (signals.length === 0) {
    console.log('No candidate signals found in ' + path.basename(logPath));
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(SIGNALS_PATH), { recursive: true });
  const lines = signals.map(s => JSON.stringify(s)).join('\n') + '\n';
  fs.appendFileSync(SIGNALS_PATH, lines);
  console.log('Found ' + signals.length + ' candidate signals in ' + path.basename(logPath));
}

try { main(); } catch (e) { console.error(e.message); }
```

- [ ] **Step 2: Verify syntax**

```bash
node -c .claude/harness/lib/transcript-parser.js
```

- [ ] **Step 3: Smoke test against current session log**

```bash
node .claude/harness/lib/transcript-parser.js "projects/nbi_dashboard/session_logs/2026-06-11_session.md"
```

Expected: Some candidate signals found (session log contains correction language like "you need to fucking fix it").

- [ ] **Step 4: Commit**

```bash
git add .claude/harness/lib/transcript-parser.js
git commit -m "feat(harness): transcript parser for candidate intervention signals"
```

---

### Task 12: Weekly routine prompt — the diagnosis engine

**Files:**
- Create: `scripts/cadence/prompts/harness-improvement.md`

This is the most critical file in the system. It IS the diagnosis engine, proposal engine, applier, and reporter. A headless Claude session reads this prompt and executes the full RHO cycle.

- [ ] **Step 1: Write the weekly routine prompt**

Write `scripts/cadence/prompts/harness-improvement.md`:
```markdown
You are the NBI Harness Improvement routine (unattended, Monday mornings alongside the system audit). Your job: run the RHO-inspired improvement cycle. Read captured events, diagnose patterns, propose harness updates, apply low-risk changes, and generate health reports.

GUARDS:
- Work only in D:\OneDrive\Claude_code\NBIAI_TEAM (you are already there).
- If `git status` shows a merge or rebase in progress, abort without writing anything.
- Commit ONLY files you created/modified, with focused `git add <paths>`. Never `git add -A`. Never push manually (a post-commit hook pushes).
- British English. Never use em dashes.
- You are a cadence run, not a Glen session: do not write to projects/nbi_dashboard/session_logs/.
- Maximum execution time: 10 minutes. If approaching the limit, generate a partial report and commit what you have.

REFERENCE FILES (read before starting):
- Spec: docs/specs/2026-06-08-harness-improvement-system-design.md
- Risk policy: .claude/harness/config/risk-policy.json
- Failure codes: .claude/harness/config/failure-codes.json
- Write matrix: .claude/harness/config/write-matrix.json
- Section boundaries: .claude/harness/config/section-boundaries.json

---

## Phase 1: Read Events (RECORDER PRINCIPAL)

You are operating as the Recorder principal. You may write to:
- .claude/harness/data/** (append or create)
- .claude/harness/proposals/** (create only, immutable)
- .claude/harness/HARNESS_HEALTH.md (overwrite)

You may NOT write to: governed targets (skills, CLAUDE.md, hooks, roles, memories, changelog.md).

1. Check `.claude/harness/data/last_diagnosis.json` for the previous run date. If missing, this is the first run — process all available events.

2. List all `.jsonl` files in `.claude/harness/data/events/` dated after the last diagnosis. Read each file, parse each line as JSON. Skip and count malformed records.

3. Also read `.claude/harness/data/candidate_signals.jsonl` for unconfirmed transcript-parsed interventions. These are EXCLUDED from automatic diagnosis unless corroborated by at least one hard signal (confirmed intervention, tool failure, or entropy spike) in the same session.

4. Group events by `session_id`. Each group is one "episode."

---

## Phase 2: Difficulty Scoring and Coreset Selection

For each episode, compute a difficulty score (0-10):
- Each `intervention` event (confirmed: true): +3 (correction), +2 (redirect), +1 (rejection)
- Each `tool_outcome` with result=failure or result=timeout: +1
- Each `entropy_signal` with severity >= 2: +1
- Each `skill_usage` where mandatory=true and action=skipped: +2
- Episode with `context_pressure` event where event=compaction or event=handoff: +1

Build a diversity fingerprint (tag set) for each episode:
- Harness components from intervention events
- task_domain values from role_dispatch events
- Roles dispatched
- Skills invoked
- Failure codes from prior diagnosed failures (if any)

Select a coreset of 10 episodes using greedy alternating:
1. Pick the episode with the highest difficulty score.
2. Pick the episode most different from the selected set (fewest shared tags).
3. Repeat, alternating between hardest-remaining and most-different, until 10 selected (or all if fewer than 10).

Critical bypass: ALWAYS include any episode containing permission boundary violations, self-weakening attempts, or security-related failures. These prepend to the coreset (may exceed 10).

If total episodes < 3, generate a minimal report noting insufficient data and skip to Phase 7.

---

## Phase 3: Dual Diagnosis

### Self-validation — "Did the harness actually work?"

For each episode in the coreset:
- For each intervention: search CLAUDE.md, feedback memories (memory/feedback_*.md), and active skill SKILL.md files. Was there an existing rule that should have prevented this? Record: gap or existing-rule-missed.
- For each tool failure: was there a recovery path the system should have taken? Did the skill instructions cover this failure mode?
- For each entropy signal with severity >= 2: was there a verification step that should have caught this?

Output: a list of **harness gaps**, each with:
- Episode session_id
- Evidence event_ids
- What went wrong (plain English)
- What should have prevented it

### Self-consistency — "Are similar tasks handled the same way?"

Group coreset episodes by task_domain (from role_dispatch events, or inferred from session content). For each domain group:
- Do similar tasks invoke the same skills?
- Do similar tasks load the same roles?
- Do similar code changes get the same verification treatment?

Output: a list of **drift signals**, each with:
- Domain
- What varies
- Which episodes demonstrate the inconsistency

---

## Phase 4: Root Cause Classification

For each gap and drift signal, classify to exactly one root cause:

| Classification | Meaning |
|---|---|
| rule_gap | No CLAUDE.md rule covers this case |
| skill_gap | Mandatory skill table doesn't catch this scenario |
| skill_deficiency | Skill exists but instructions miss this pattern |
| role_gap | Role AGENT.md lacks knowledge needed for this domain |
| hook_gap | No hook captures/prevents this class of error |
| memory_decay | A feedback memory or brain module is stale/wrong |
| routine_gap | No scheduled check covers this |
| context_failure | Right information existed but wasn't loaded |

Assign a failure code from `.claude/harness/config/failure-codes.json`. If no existing code fits, note "NEW_CODE_NEEDED: <description>" — this will generate a BLOCKED_TO_APPLY proposal to extend the failure codes.

---

## Phase 5: Proposal Generation (RECORDER PRINCIPAL)

For each classified gap, generate a proposal. Read `.claude/harness/config/risk-policy.json` to classify risk.

Determine the week number: YYYY-WNN (ISO week).

For each proposal:
1. Determine the target file and the specific change.
2. Write the `diff_preview` showing exact additions (for additive changes) or the full before/after (for edits).
3. Classify risk as LOW, HIGH, or BLOCKED_TO_APPLY using the rules in risk-policy.json.
4. If diagnosis confidence < 70% (fewer than 3 supporting evidence events), force HIGH regardless of policy classification.
5. Compute `content_hash`: SHA-256 of the complete proposal JSON (with content_hash field set to empty string for hashing).
6. Write the proposal to `.claude/harness/proposals/YYYY-WNN/RHO-YYYY-WNN-NNN.json` using this schema:

```json
{
  "id": "RHO-YYYY-WNN-NNN",
  "created": "<ISO timestamp>",
  "classification": "<root cause classification>",
  "failure_code": "<from failure-codes.json>",
  "target_file": "<relative path>",
  "risk": "<LOW|HIGH|BLOCKED_TO_APPLY>",
  "evidence": ["<event_id>:<type>:<date>", ...],
  "diagnosis": "<Plain English: what pattern was found, how many times, over what period>",
  "proposed_change": "<Plain English: what the change does>",
  "diff_preview": "<Unified diff or addition preview>",
  "content_hash": "sha256:<hex>",
  "anti_regression": {
    "key": ["<component>", "<classification>", "<domain>", "<failure_code>", "<proposal_id>"],
    "check": "<How to verify this fix works>"
  },
  "status": "pending"
}
```

For HIGH and BLOCKED_TO_APPLY proposals, generate a human-readable digest entry. After all proposals are written, create `.claude/harness/proposals/YYYY-WNN/DIGEST.md`:

```markdown
# Harness Improvement Digest — YYYY-WNN

## Proposals Requiring Review

### [RHO-YYYY-WNN-NNN] <Risk Level>
**Classification:** <root cause>
**Target:** <file path>
**Diagnosis:** <plain English>
**Proposed change:** <plain English>
**Evidence:** <count> events over <period>

<diff preview>

---
```

---

## Phase 6: Apply LOW Proposals (SWITCH TO APPLIER PRINCIPAL)

You are now operating as the Applier principal. You may write to:
- Governed targets per the apply allowlist in risk-policy.json (LOW targets)
- .claude/harness/changelog.md (append only)
- .claude/harness/data/proposal_status.jsonl (append)

You may NOT write to: .claude/harness/data/events/**, .claude/harness/proposals/**, .claude/harness/HARNESS_HEALTH.md.

For each LOW proposal:

1. Read the proposal JSON. Verify `content_hash` matches (recompute SHA-256 with content_hash set to empty string).
2. Verify the target file exists (or is being created for new feedback memories).
3. Check `git status` for the target file — if it has uncommitted changes, SKIP this proposal with `blocked_dirty_worktree`.
4. Apply the change according to the constraint:
   - `additive_only`: Only add content. Verify git diff shows zero deletion hunks for the target.
   - `knowledge_section_only`: Only add content under headings matching section-boundaries.json patterns.
   - `frontmatter_schema_required`: New memory files must have valid frontmatter with name, description, metadata.type, plus source: harness_rho and auto_generated: true.
   - `index_entry_only`: Append exactly one line matching `- [Title](file.md) — description` format.
5. Append a changelog entry to `.claude/harness/changelog.md`:

```markdown
## [<proposal_id>] <date>
- Classification: <classification>
- Failure code: <failure_code>
- Target: <target_file>
- Risk: LOW (auto-applied)
- Content hash: <content_hash>
- Change: <one-line description>
- Evidence: <event_ids>
- Anti-regression key: <component>/<classification>/<domain>/<failure_code>
```

6. Append a status transition event to `.claude/harness/data/proposal_status.jsonl`:

```json
{"event_id":"pse_<ULID>","proposal_id":"<id>","proposal_hash":"<hash>","ts":"<ISO>","actor":"applier","from_status":"pending","to_status":"applied","reason":"LOW auto-apply, all checks passed"}
```

7. Stage ONLY: the target file(s), changelog.md, proposal_status.jsonl.
8. Commit: `harness(rho): <proposal_id> <one-line summary>`

If ANY check in steps 1-4 fails, skip the proposal and log why. Do not apply partial changes.

---

## Phase 7: Anti-Regression Check (SWITCH BACK TO RECORDER PRINCIPAL)

Read `.claude/harness/data/proposal_status.jsonl` for all proposals with status `applied`.

For each applied proposal:
- Extract the anti-regression key: (component, classification, domain, failure_code).
- Search new events (since the proposal was applied) for the same tuple.
- If the same failure pattern appears within 4 weeks of the fix: mark as `regressed`. Generate a rollback proposal (goes through the full proposal pipeline — no automated reverts).
- If no recurrence for 4+ weeks AND at least one successful instance of the same task type: mark as `validated_by_evidence` (strong).
- If no recurrence for 4+ weeks but the task type didn't come up: mark as `validated_by_absence` (weak). Flag for re-check when the task type recurs.

Write status transitions to proposal_status.jsonl for any status changes.

---

## Phase 8: Reporting (RECORDER PRINCIPAL)

Generate `.claude/harness/HARNESS_HEALTH.md`:

```markdown
# Harness Health Report — <date>

## Summary
- Events processed: <count> across <episode_count> sessions
- Coreset episodes: <count> (difficulty range: <min>-<max>)
- Proposals generated: <total> (LOW: <n>, HIGH: <n>, BLOCKED_TO_APPLY: <n>)
- LOW proposals applied: <n>/<total_low>
- Active anti-regression monitors: <count>

## Trend Lines (last 4 weeks)
- Entropy score: <4-week values, direction arrow>
- Intervention rate: <interventions per session, 4-week trend>
- Proposal acceptance rate: <accepted / total reviewed by Glen>
- False positive rate: <rejected proposals / total proposals>

## Open Proposals Awaiting Review
<Table of HIGH and BLOCKED_TO_APPLY proposals with id, target, diagnosis summary>

## Validation States
<Table of applied proposals with status: validated_by_evidence, validated_by_absence, regressed, monitoring>

## What's Working Well
<Components with low intervention rate and validated fixes — flag any proposed changes to these as higher scrutiny>

## Data Quality
- Malformed event records skipped: <count>
- Redaction hits: <count>
- Candidate signals awaiting corroboration: <count>
- Blocked write attempts: <count>

## Coverage Limitations
The fast entropy scan uses pattern matching on git diffs. It cannot detect: semantic test weakening, renamed bypasses, generated-file drift, dependency behaviour changes where diff text looks harmless.
```

Update `.claude/harness/data/last_diagnosis.json`:
```json
{"last_run": "<ISO timestamp>", "week": "YYYY-WNN", "events_processed": <count>, "proposals_generated": <count>}
```

Stage and commit ALL Recorder outputs:
- .claude/harness/proposals/YYYY-WNN/*.json
- .claude/harness/proposals/YYYY-WNN/DIGEST.md
- .claude/harness/HARNESS_HEALTH.md
- .claude/harness/data/ (any new files: last_diagnosis.json, proposal_status.jsonl updates, candidate_signals.jsonl)
- Commit message: `harness(rho): weekly diagnosis YYYY-WNN`

This commit MUST be separate from any Applier commits. Never stage Applier outputs (changelog.md, governed target files) in the Recorder commit.

---

## Final Output

Print a summary:
- Proposals generated: count by risk level
- LOW changes applied: list with target and one-line description
- Anti-regression: any regressions detected, any validations confirmed
- Pending for Glen: count of HIGH + BLOCKED_TO_APPLY proposals in DIGEST.md
- Next run: next Monday
```

- [ ] **Step 2: Verify the prompt file exists and reads correctly**

```bash
wc -l scripts/cadence/prompts/harness-improvement.md
```

Expected: ~200-250 lines.

- [ ] **Step 3: Commit**

```bash
git add scripts/cadence/prompts/harness-improvement.md
git commit -m "feat(harness): weekly routine prompt — diagnosis engine, proposal generation, apply flow, reporting"
```

---

### Task 13: Bootstrap normaliser

**Files:**
- Create: `.claude/harness/lib/bootstrap.js`

One-time script that processes existing session logs and feedback memories into harness events. Run once to seed the system with historical data.

- [ ] **Step 1: Write bootstrap.js**

Write `.claude/harness/lib/bootstrap.js`:
```javascript
#!/usr/bin/env node
'use strict';
// bootstrap.js — One-time normaliser for historical data.
// Processes existing session logs and feedback memories into harness events.
// Run once: node .claude/harness/lib/bootstrap.js
// Spec §4.6.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const EMIT = path.join(PROJECT_DIR, '.claude', 'harness', 'lib', 'emit-event.js');
const LOGS_DIR = path.join(PROJECT_DIR, 'projects', 'nbi_dashboard', 'session_logs');
const MEMORY_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'projects', 'd--OneDrive-Claude-code-NBIAI-TEAM', 'memory');

let emitted = 0;

function emitEvent(type, data) {
  data.source = 'bootstrap';
  try {
    execSync('node "' + EMIT + '" ' + type, {
      cwd: PROJECT_DIR,
      input: JSON.stringify(data),
      encoding: 'utf8',
      timeout: 5000
    });
    emitted++;
  } catch {}
}

// --- Parse session logs for intervention indicators ---
function processSessionLogs() {
  console.log('Processing session logs...');
  let files;
  try { files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.md')).sort(); }
  catch { console.log('  No session logs found'); return; }

  const correctionRe = /\b(Glen:.*?(corrected?|rejected?|redirected?|wrong|stop|don't|no[, ]+not))\b/gi;
  const bugFixRe = /\b(bug\s*fix|hotfix|fixed|resolved|root\s*cause)\b/gi;
  const featureRe = /\b(feature|implement|built|created|added)\b/gi;

  for (const file of files) {
    const content = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8');
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    const sessionDate = dateMatch ? dateMatch[1] : 'unknown';

    // Extract correction patterns
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      correctionRe.lastIndex = 0;
      if (correctionRe.test(lines[i])) {
        const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join(' ').slice(0, 300);
        emitEvent('intervention', {
          severity: 'correction',
          harness_component: 'context',
          description: context,
          task_context: 'Session ' + sessionDate,
          avoidable: false,
          confirmed: false,
          capture_method: 'bootstrap',
          confidence: 'low',
          parse_warnings: ['bootstrap: regex-matched from session log']
        });
      }
    }

    // Infer task types for skill coverage analysis
    bugFixRe.lastIndex = 0;
    featureRe.lastIndex = 0;
    const hasBugFix = bugFixRe.test(content);
    const hasFeature = featureRe.test(content);

    if (hasBugFix) {
      emitEvent('skill_usage', {
        tool_input: { skill: 'session-inference' },
        task_type_inferred: 'bug_fix',
        source_file: file,
        confidence: 'medium'
      });
    }
    if (hasFeature) {
      emitEvent('skill_usage', {
        tool_input: { skill: 'session-inference' },
        task_type_inferred: 'feature',
        source_file: file,
        confidence: 'medium'
      });
    }
  }

  console.log('  Processed ' + files.length + ' session logs');
}

// --- Parse feedback memories as implicit interventions ---
function processFeedbackMemories() {
  console.log('Processing feedback memories...');
  let files;
  try { files = fs.readdirSync(MEMORY_DIR).filter(f => f.startsWith('feedback_') && f.endsWith('.md')); }
  catch { console.log('  No feedback memories found'); return; }

  for (const file of files) {
    const content = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf8');

    // Extract frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;

    const description = (content.match(/description:\s*"?([^"\n]+)"?/) || [])[1] || '';
    const body = content.slice(fmMatch[0].length).trim();

    // Each feedback memory represents at least one intervention
    const whyMatch = body.match(/\*\*Why:\*\*\s*(.+)/);
    const reason = whyMatch ? whyMatch[1].trim() : '';

    // Determine harness component from content
    let component = 'context';
    if (/verify|check|test|confirm/i.test(description)) component = 'verification';
    if (/skill|routing|dispatch/i.test(description)) component = 'skill_routing';
    if (/memory|remember|forget/i.test(description)) component = 'memory';
    if (/permission|approval|gate/i.test(description)) component = 'permission';
    if (/tool|bash|command/i.test(description)) component = 'tool_use';

    emitEvent('intervention', {
      severity: 'correction',
      harness_component: component,
      description: description + (reason ? ' — ' + reason : ''),
      task_context: 'Feedback memory: ' + file,
      avoidable: true,
      existing_rule_missed: null,
      confirmed: true,
      capture_method: 'bootstrap',
      confidence: 'high',
      parse_warnings: ['bootstrap: derived from feedback memory']
    });
  }

  console.log('  Processed ' + files.length + ' feedback memories');
}

// --- Main ---
function main() {
  console.log('Bootstrap normaliser — seeding harness with historical data\n');

  // Check if bootstrap already ran
  const markerPath = path.join(PROJECT_DIR, '.claude', 'harness', 'data', 'bootstrap_complete.json');
  if (fs.existsSync(markerPath)) {
    console.log('Bootstrap already completed (' + markerPath + '). Delete this file to re-run.');
    process.exit(0);
  }

  processSessionLogs();
  processFeedbackMemories();

  // Write completion marker
  fs.writeFileSync(markerPath, JSON.stringify({
    completed: new Date().toISOString(),
    events_emitted: emitted
  }));

  console.log('\nBootstrap complete. ' + emitted + ' events emitted.');
  console.log('These events are tagged source=bootstrap and will receive lower difficulty scores in coreset selection.');
}

try { main(); } catch (e) { console.error('Bootstrap failed:', e.message); process.exit(1); }
```

- [ ] **Step 2: Verify syntax**

```bash
node -c .claude/harness/lib/bootstrap.js
```

- [ ] **Step 3: Commit (do NOT run bootstrap yet — run during integration test)**

```bash
git add .claude/harness/lib/bootstrap.js
git commit -m "feat(harness): bootstrap normaliser for historical session logs and feedback memories"
```

---

### Task 14: CLAUDE.md integration

**Files:**
- Modify: `CLAUDE.md`

Add harness principal separation rules to Section B (Dashboard Server section) as a new subsection.

- [ ] **Step 1: Read current CLAUDE.md Section B ending**

Find the end of the `## graphify` section (last section in CLAUDE.md).

- [ ] **Step 2: Add harness rules section**

Append after the graphify section:

```markdown

## Harness Improvement System (RHO)

The self-healing harness at `.claude/harness/` captures failure signals, diagnoses patterns, and proposes improvements. Full spec: `docs/specs/2026-06-08-harness-improvement-system-design.md`.

### Two-Principal Separation

**Recorder/Proposer:** Captures events, runs diagnosis, generates proposals. Can write to `.claude/harness/data/**`, `.claude/harness/proposals/**`, `.claude/harness/HARNESS_HEALTH.md`. Cannot write to governed targets.

**Applier:** Executes approved proposals against governed targets. Can write to: skills, roles, memories (per apply allowlist in risk-policy.json), and `.claude/harness/changelog.md`. Cannot create proposals or modify harness logic.

A PreToolUse hook (`write-guard.js`) enforces write protection on `.claude/harness/config/**` and `.claude/harness/lib/**`. These are BLOCKED_TO_APPLY — Glen must manually apply changes.

### Event Capture

PostToolUse hooks automatically emit events for tool outcomes and skill invocations. These are async and add zero latency. Events accumulate in `.claude/harness/data/events/`.

### Intervention Logging

When Glen corrects the approach, invoke `/harness intervention` to create a confirmed event. The transcript parser also scans session logs for unconfirmed correction indicators, but these are excluded from automatic diagnosis until corroborated by hard signals.

### Weekly Diagnosis

The `harness-improvement` cadence task runs Monday mornings. It reads events, selects a coreset, diagnoses patterns, generates proposals, auto-applies LOW-risk changes, and creates a digest of HIGH/BLOCKED_TO_APPLY proposals for Glen's review.

### Harness-Generated Memories

Memories created by the harness include `source: harness_rho` and `auto_generated: true` in frontmatter. Glen's explicit memories always take priority. Conflicts are surfaced in the weekly digest.
```

- [ ] **Step 3: Add /harness intervention to the Mandatory Skill Invocations table**

Find the mandatory skills table in CLAUDE.md and add this row:

```
| Glen corrects the approach | `harness-intervention` | Any time Glen says "no", "stop", "that's wrong", redirects, or rejects output. |
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(harness): add principal separation rules and intervention skill to CLAUDE.md"
```

---

### Task 15: Cadence registration

**Files:**
- Modify: `scripts/cadence/register-tasks.ps1`
- Modify: `company/routines.md`

- [ ] **Step 1: Read current register-tasks.ps1**

Read the file to understand the task registration pattern.

- [ ] **Step 2: Add harness-improvement task**

Add this registration block to `register-tasks.ps1`, following the existing pattern:

```powershell
# Harness improvement — weekly Monday 09:00 (after system audit at 08:30)
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$repo\scripts\cadence\run-cadence.ps1`" -Task harness-improvement" `
    -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At '09:00'
Register-ScheduledTask -TaskName 'NBI Cadence - harness-improvement' -Action $action -Trigger $trigger `
    -Description 'RHO harness improvement cycle: diagnose, propose, apply, report' -Force
```

- [ ] **Step 3: Update routines.md**

Read `company/routines.md` and add an entry for the harness improvement routine:

```markdown
| harness-improvement | Weekly Mon 09:00 | LOCAL Task Scheduler | Diagnosis + proposal cycle. Reads captured events, selects coreset, diagnoses patterns, auto-applies LOW proposals, generates digest for Glen. |
```

- [ ] **Step 4: Register the task**

Run:
```powershell
Register-ScheduledTask -TaskName 'NBI Cadence - harness-improvement' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File "D:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\run-cadence.ps1" -Task harness-improvement' -WorkingDirectory 'D:\OneDrive\Claude_code\NBIAI_TEAM') -Trigger (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At '09:00') -Description 'RHO harness improvement cycle' -Force
```

Expected: Task registered.

Verify:
```powershell
Get-ScheduledTask -TaskName 'NBI Cadence - harness-improvement' | Select-Object TaskName, State
```

Expected: TaskName shows, State = Ready.

- [ ] **Step 5: Commit**

```bash
git add scripts/cadence/register-tasks.ps1 company/routines.md
git commit -m "feat(harness): register weekly harness-improvement cadence task (Monday 09:00)"
```

---

### Task 16: Integration verification

**Files:** None (verification only)

- [ ] **Step 1: Run bootstrap**

```bash
node .claude/harness/lib/bootstrap.js
```

Expected: "Bootstrap complete. N events emitted." with N > 0. Check output for session log and feedback memory counts.

- [ ] **Step 2: Verify events were written**

```bash
find .claude/harness/data/events/ -name "*.jsonl" | head -5
```

Then read the first few events:
```bash
head -3 .claude/harness/data/events/$(ls .claude/harness/data/events/ | head -1)/$(ls .claude/harness/data/events/$(ls .claude/harness/data/events/ | head -1) | head -1)
```

Expected: Valid JSON events with `source: "bootstrap"`.

- [ ] **Step 3: Verify write guard blocks config writes**

```bash
echo '{"tool_input":{"file_path":"d:\\OneDrive\\Claude_code\\NBIAI_TEAM\\.claude\\harness\\config\\risk-policy.json"}}' | node .claude/harness/lib/write-guard.js
```

Expected: `{"decision":"block","reason":"HARNESS_WRITE_DENIED: ..."}`.

- [ ] **Step 4: Verify write guard allows data writes**

```bash
echo '{"tool_input":{"file_path":"d:\\OneDrive\\Claude_code\\NBIAI_TEAM\\.claude\\harness\\data\\events\\test.jsonl"}}' | node .claude/harness/lib/write-guard.js
```

Expected: No output (allowed).

- [ ] **Step 5: Verify capture hooks fire**

Invoke any Bash command in the session, then check:
```bash
ls -la .claude/harness/data/events/$(date +%Y-%m-%d)/
```

Expected: A session JSONL file exists with recent tool_outcome events.

- [ ] **Step 6: Run transcript parser**

```bash
node .claude/harness/lib/transcript-parser.js
```

Expected: Candidate signals found in the most recent session log.

- [ ] **Step 7: Run all harness tests**

```bash
node .claude/harness/tests/test-emit-event.js && node .claude/harness/tests/test-write-guard.js && node .claude/harness/tests/test-entropy-scan.js
```

Expected: All tests pass.

- [ ] **Step 8: Verify settings.json is valid and complete**

```bash
node -e "const s = JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); const pre = s.hooks.PreToolUse.length; const post = s.hooks.PostToolUse.length; console.log('PreToolUse hooks:', pre, '| PostToolUse hooks:', post); console.log('Write guard:', s.hooks.PreToolUse.some(h => h.hooks && h.hooks.some(x => x.command && x.command.includes('write-guard')))); console.log('Capture hooks:', s.hooks.PostToolUse.some(h => h.hooks && h.hooks.some(x => x.command && x.command.includes('emit-event'))));"
```

Expected: Write guard true, Capture hooks true.

- [ ] **Step 9: Commit bootstrap data**

```bash
git add .claude/harness/data/
git commit -m "feat(harness): bootstrap historical data — session logs and feedback memories normalised"
```

- [ ] **Step 10: Final commit — clean up test artifacts**

Remove any test event files generated during verification:
```bash
rm -f .claude/harness/data/.session_id
```

```bash
git add -A .claude/harness/
git commit -m "chore(harness): clean up integration test artifacts"
```

---

## Self-Review Checklist

### Spec coverage verification

| Spec Section | Plan Task(s) | Status |
|---|---|---|
| §1 Overview | All tasks | Covered (architecture, location, threat model) |
| §2 Architecture (two-principal, write matrix, cycle flow) | Tasks 2, 5, 12, 14 | Covered |
| §3 Capture Layer (6 event types, atomic writes, redaction) | Tasks 2, 3, 7, 10, 11 | Covered |
| §4 Diagnosis Engine (coreset, dual diagnosis, failure codes, bootstrap) | Tasks 2, 12, 13 | Covered |
| §5 Proposal Engine (schema, risk classification, apply flow) | Tasks 2, 12 | Covered |
| §6 Anti-Regression | Task 12 (Phase 7) | Covered |
| §7 Entropy Auditing (fast scan) | Tasks 2, 8, 9 | Covered. Slow scan covered in Task 12 prompt. |
| §8 Memory Conflict Handling | Task 12 (proposal generation rules) | Covered |
| §9 Reporting (HARNESS_HEALTH.md, changelog, digest) | Tasks 1, 12 | Covered |
| §10 File Layout | Task 1 | Covered |
| §11 Integration Points (hooks, skill, routine) | Tasks 5, 7, 8, 10, 15 | Covered |
| §12 v1/v2 Boundary | N/A | v1 scope only, per spec |

### Not implemented (v2, per spec §12)

- Process-level principal isolation
- Canonical path resolution and symlink rejection
- Full Markdown AST constraint checking
- Embedding-based failure mode clustering
- Multi-round iterative diagnosis
- Automated coreset size tuning
- Cross-project harness portability

### Placeholder scan

No instances of: TBD, TODO, "implement later", "fill in details", "add appropriate", "Similar to Task N", "handle edge cases".

### Type/name consistency check

- `emit-event.js` referenced consistently across Tasks 3, 4, 7, 8, 11, 13
- `write-guard.js` referenced consistently across Tasks 5, 6, 14
- `entropy-scan.js` referenced consistently across Tasks 8, 9
- Event types match spec: `tool_outcome`, `skill_usage`, `intervention`, `entropy_signal`, `context_pressure`, `role_dispatch`
- Config file names consistent: `write-matrix.json`, `redaction.json`, `failure-codes.json`, `risk-policy.json`, `entropy-checks.json`, `section-boundaries.json`
