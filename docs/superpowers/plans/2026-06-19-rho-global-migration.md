# RHO Harness Global Migration Plan (v2 -- post-Codex R1 convergence)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the RHO harness from project-local (`NBIAI_TEAM/.claude/harness/`) to global (`~/.claude/harness/`) so it fires for every Claude Code project, not just NBIAI_TEAM.

**Architecture:** Source-deploy model. The NBIAI_TEAM repo retains `.claude/harness/` as the git-tracked source of truth. A deploy script copies lib/, config/, and tests/ to the global `~/.claude/harness/` runtime location. All lib modules use a shared `resolve.js` utility for path resolution: `HARNESS_DIR` from `process.env.HARNESS_DIR || __dirname/..` (overridable for tests), `PROJECT_DIR` from `CLAUDE_PROJECT_DIR || process.cwd()`. Per-project data (events, session ID, bootstrap marker, dedup state) lives under `data/<project-slug>/`. Global data (entropy trend, blocked writes, proposals, diagnosis state) lives at `data/` root with project fields on entries. Hooks move from project `settings.json` to global `settings.json`. Non-harness project-specific hooks stay in project settings.

**Tech Stack:** Node.js (built-in modules only -- no external deps), Claude Code hooks system, JSON config

**Key Design Decisions (informed by Codex R1 adversarial review):**

1. **Source-deploy model** -- repo is source of truth, global is runtime install. Preserves git history, rollback, diffability. (Codex #1)
2. **`HARNESS_DIR` env override** -- `process.env.HARNESS_DIR || path.resolve(__dirname, '..')`. Tests set `HARNESS_DIR` to a temp dir for isolation. (Codex #15)
3. **Collision-resistant project slug** -- `basename + '_' + md5(resolvedPath).slice(0,6)`. Handles same-name dirs, spaces, special chars. (Codex #5)
4. **Per-project data isolation** -- session_id, bootstrap marker, dedup state, events all under `data/<slug>/`. No cross-project corruption. (Codex #6, #7)
5. **Shared resolve.js** -- DRY path resolution. Single module required by all lib files. Testable in isolation.
6. **git-push safety** -- Global hook checks for remote `origin` before pushing. Skips if no remote. (Codex #9)
7. **Write-guard protects global settings.json** -- Explicit check for `~/.claude/settings.json` path. (Codex #10)
8. **Migrate existing data** -- Copy current events and proposals to global under NBIAI_TEAM slug. (Codex #2)
9. **Backup before destructive steps** -- Back up both settings.json files before editing. (Codex #17)
10. **Remove project hooks BEFORE adding global** -- Eliminates duplicate-fire window. (Codex #14)
11. **Fresh-session verification BEFORE deleting project-local** -- Don't delete rollback source until proven working. (Codex #18, #29)

---

## File Map

### Files to CREATE (global location `C:/Users/gpbea/.claude/harness/`)

```
~/.claude/harness/
  lib/
    resolve.js         (NEW -- shared path resolution utility)
    anti-regression.js (14 modules total including resolve.js)
    apply-gate.js
    bootstrap.js
    emit-event.js
    entropy-scan.js
    git-push.js
    memory-conflict.js
    proposal-utils.js
    reporting.js
    risk-classify.js
    shell-guard.js
    transcript-parser.js
    write-guard.js
  config/              (all config files from source, including section-boundaries.json)
  tests/               (all test files, updated for HARNESS_DIR override)
  data/
    NBIAI_TEAM_<hash>/  (migrated from project-local)
      events/
      .session_id
      bootstrap_complete.json
      .entropy_dedup.json
    entropy_trend.jsonl     (migrated, entries tagged with project field)
    blocked_writes.jsonl    (migrated, entries tagged)
    candidate_signals.jsonl (migrated)
    last_diagnosis.json     (migrated)
    proposal_status.jsonl   (migrated)
    .locks/
  proposals/           (migrated from project-local)
  changelog.md         (migrated)
```

### Files to CREATE (in project repo)

- `NBIAI_TEAM/.claude/harness/lib/resolve.js` -- also added to source of truth
- `NBIAI_TEAM/.claude/harness/deploy.js` -- deploy script

### Files to MODIFY (in SOURCE repo, then deployed to global)

All 13 existing lib modules -- switch to `require('./resolve')` for paths.
Both guards -- add global harness path protection.

### Files to MODIFY (project-level)

- `NBIAI_TEAM/.claude/settings.json` -- remove harness hooks (FIRST)
- `C:/Users/gpbea/.claude/settings.json` -- add harness hooks with absolute paths (SECOND)
- `NBIAI_TEAM/CLAUDE.md` -- update harness location references
- Memory files referencing harness paths

### Files NOT deleted

- `NBIAI_TEAM/.claude/harness/` -- KEPT as git-tracked source of truth. Not deleted.

---

## Batch 1: Create resolve.js + Deploy Script + Scaffold Global

### Task 1.0: Back up settings files

- [ ] **Step 1: Back up both settings.json files**

```powershell
Copy-Item "C:\Users\gpbea\.claude\settings.json" "C:\Users\gpbea\.claude\settings.json.pre-rho-migration" -Force
Copy-Item "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.json" "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.json.pre-rho-migration" -Force
```

### Task 1.1: Create resolve.js (shared path resolution)

**Files:**
- Create: `D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness/lib/resolve.js` (source of truth)

- [ ] **Step 1: Write resolve.js**

```javascript
#!/usr/bin/env node
'use strict';
// resolve.js -- Shared path resolution for global harness modules.
// All lib modules require this for HARNESS_DIR, PROJECT_DIR, PROJECT_SLUG, etc.
// HARNESS_DIR: overridable via env for test isolation.
// PROJECT_SLUG: collision-resistant (basename + short hash of resolved absolute path).

const path = require('path');
const crypto = require('crypto');

const HARNESS_DIR = process.env.HARNESS_DIR || path.resolve(__dirname, '..');
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const resolved = path.resolve(PROJECT_DIR);
const base = path.basename(resolved).replace(/[^a-zA-Z0-9_-]/g, '_') || 'root';
const hash = crypto.createHash('md5')
  .update(resolved.replace(/\\/g, '/').toLowerCase())
  .digest('hex').slice(0, 6);
const PROJECT_SLUG = base + '_' + hash;

const DATA_DIR = path.join(HARNESS_DIR, 'data');
const PROJECT_DATA_DIR = path.join(DATA_DIR, PROJECT_SLUG);
const EVENTS_DIR = path.join(PROJECT_DATA_DIR, 'events');
const CONFIG_DIR = path.join(HARNESS_DIR, 'config');
const LOCKS_DIR = path.join(DATA_DIR, '.locks');
const PROPOSALS_DIR = path.join(HARNESS_DIR, 'proposals');

module.exports = {
  HARNESS_DIR,
  PROJECT_DIR,
  PROJECT_SLUG,
  DATA_DIR,
  PROJECT_DATA_DIR,
  EVENTS_DIR,
  CONFIG_DIR,
  LOCKS_DIR,
  PROPOSALS_DIR,
};
```

- [ ] **Step 2: Verify syntax**

```powershell
node --check "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\lib\resolve.js"
```

### Task 1.2: Create deploy script

**Files:**
- Create: `D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness/deploy.js`

- [ ] **Step 1: Write deploy.js**

```javascript
#!/usr/bin/env node
'use strict';
// deploy.js -- Deploys harness from repo source to global ~/.claude/harness/.
// Copies lib/, config/, and tests/. Data and proposals are NOT deployed
// (those are runtime state).
// Usage: node .claude/harness/deploy.js

const fs = require('fs');
const path = require('path');
const os = require('os');

const SRC = path.resolve(__dirname);
const DST = path.join(os.homedir(), '.claude', 'harness');

const DEPLOY_DIRS = ['lib', 'config', 'tests'];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dst) {
  ensureDir(dst);
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const dstPath = path.join(dst, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

// Create global structure
ensureDir(path.join(DST, 'data'));
ensureDir(path.join(DST, 'proposals'));

// Deploy lib and config
for (const dir of DEPLOY_DIRS) {
  const srcDir = path.join(SRC, dir);
  const dstDir = path.join(DST, dir);
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, dstDir);
    console.log('Deployed ' + dir + '/ (' + fs.readdirSync(dstDir).length + ' files)');
  }
}

// Copy changelog if present
const cl = path.join(SRC, 'changelog.md');
if (fs.existsSync(cl)) {
  fs.copyFileSync(cl, path.join(DST, 'changelog.md'));
  console.log('Deployed changelog.md');
}

console.log('Global harness deployed to ' + DST);
```

- [ ] **Step 2: Verify syntax and run**

```powershell
node --check "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\deploy.js"
node "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\deploy.js"
```

### Task 1.3: Migrate existing data and proposals

- [ ] **Step 1: Determine project slug for NBIAI_TEAM**

```powershell
node -e "const c=require('crypto');const r='D:/OneDrive/Claude_code/NBIAI_TEAM';const b='NBIAI_TEAM';const h=c.createHash('md5').update(r.toLowerCase()).digest('hex').slice(0,6);console.log(b+'_'+h)"
```

Note the output slug (e.g., `NBIAI_TEAM_a3f2b1`).

- [ ] **Step 2: Create project data directory and migrate events**

```powershell
$slug = "<output from step 1>"
New-Item -ItemType Directory -Force "C:\Users\gpbea\.claude\harness\data\$slug\events"
Copy-Item -Path "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\data\events\*" -Destination "C:\Users\gpbea\.claude\harness\data\$slug\events\" -Recurse -Force
```

- [ ] **Step 3: Migrate per-project state files**

```powershell
Copy-Item "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\data\.session_id" "C:\Users\gpbea\.claude\harness\data\$slug\.session_id" -Force -ErrorAction SilentlyContinue
Copy-Item "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\data\bootstrap_complete.json" "C:\Users\gpbea\.claude\harness\data\$slug\bootstrap_complete.json" -Force -ErrorAction SilentlyContinue
Copy-Item "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\data\.entropy_dedup.json" "C:\Users\gpbea\.claude\harness\data\$slug\.entropy_dedup.json" -Force -ErrorAction SilentlyContinue
```

- [ ] **Step 4: Migrate global-scoped data files with project tagging**

Existing JSONL data is all from NBIAI_TEAM (the only project that had the harness). For new cross-project use, each JSONL entry needs a `project` field. Inject it during migration:

```powershell
$slug = "<output from step 1>"
$jsonlFiles = @('entropy_trend.jsonl','blocked_writes.jsonl','candidate_signals.jsonl')
foreach ($f in $jsonlFiles) {
  $src = "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\data\$f"
  $dst = "C:\Users\gpbea\.claude\harness\data\$f"
  if (Test-Path $src) {
    Get-Content $src | ForEach-Object {
      $obj = $_ | ConvertFrom-Json
      $obj | Add-Member -NotePropertyName "project" -NotePropertyValue $slug -Force
      $obj | ConvertTo-Json -Compress
    } | Set-Content $dst -Encoding utf8
  }
}
# Non-JSONL files: copy as-is
$plainFiles = @('last_diagnosis.json')
foreach ($f in $plainFiles) {
  $src = "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\data\$f"
  if (Test-Path $src) { Copy-Item $src "C:\Users\gpbea\.claude\harness\data\$f" -Force }
}
# proposal_status.jsonl is also JSONL -- tag with project
$psSrc = "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\data\proposal_status.jsonl"
$psDst = "C:\Users\gpbea\.claude\harness\data\proposal_status.jsonl"
if (Test-Path $psSrc) {
  Get-Content $psSrc | ForEach-Object {
    $obj = $_ | ConvertFrom-Json
    $obj | Add-Member -NotePropertyName "project" -NotePropertyValue $slug -Force
    $obj | ConvertTo-Json -Compress
  } | Set-Content $psDst -Encoding utf8
}
```

- [ ] **Step 5: Migrate proposals**

```powershell
Copy-Item -Path "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\proposals\*" -Destination "C:\Users\gpbea\.claude\harness\proposals\" -Force -ErrorAction SilentlyContinue
```

- [ ] **Step 6: Verify migration**

```powershell
Get-ChildItem "C:\Users\gpbea\.claude\harness" -Recurse | Measure-Object | Select-Object Count
Get-ChildItem "C:\Users\gpbea\.claude\harness\data\$slug\events" -Directory | Measure-Object | Select-Object Count
```

### CODEX CHECKPOINT: Batch 1 Review

Run `codex exec "Audit the global harness at C:/Users/gpbea/.claude/harness/. Verify: (1) resolve.js exists in lib/ with HARNESS_DIR env override, collision-resistant slug (basename+hash), and all path constants, (2) deploy.js exists at source and copies lib/, config/, and tests/, (3) all 14 lib modules present (13 original + resolve.js), (4) all config files present including section-boundaries.json, (5) data migration preserved existing events under the project slug directory, (6) proposals migrated, (7) settings.json backups exist. Report any missing files or structural issues."` and iterate until clean.

---

## Batch 2: Update Lib Modules -- Switch to resolve.js

**IMPORTANT: Edit SOURCE files in the repo first, then deploy to global. Source is the working copy, global is the deployed runtime. (Codex R2 fix)**

The fundamental change: every lib module switches from inline `PROJECT_DIR + '.claude/harness'` to `require('./resolve')`. The resolve.js module provides HARNESS_DIR (from env or __dirname), PROJECT_DIR (from CLAUDE_PROJECT_DIR or cwd), PROJECT_SLUG (collision-resistant), and all derived paths.

**Pattern for every module:**

Replace this (varies slightly per file):
```javascript
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const HARNESS_DIR = path.join(PROJECT_DIR, '.claude', 'harness');
const DATA_DIR = path.join(HARNESS_DIR, 'data');
const EVENTS_DIR = path.join(DATA_DIR, 'events');
```

With this:
```javascript
const R = require('./resolve');
```

Then replace references: `HARNESS_DIR` → `R.HARNESS_DIR`, `DATA_DIR` → `R.DATA_DIR`, etc.
Keep `PROJECT_DIR` for project-scoped operations (git commands, session log reading, memory file access, apply-gate targets). Use `R.PROJECT_DIR` for those.

### Task 2.1: Update emit-event.js

**Files:**
- Modify: `D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness/lib/emit-event.js` (SOURCE first)

- [ ] **Step 1: Add resolve.js require, replace path block (lines 17-23)**

Replace the 7-line path block with:
```javascript
const R = require('./resolve');
const REDACTION_PATH = path.join(R.CONFIG_DIR, 'redaction.json');
const MANDATORY_SKILLS_PATH = path.join(R.CONFIG_DIR, 'mandatory-skills.json');
```

Then replace all references throughout the file:
- `EVENTS_DIR` → `R.EVENTS_DIR`
- `DATA_DIR` → `R.DATA_DIR` (but use `R.PROJECT_DATA_DIR` for per-project files like .session_id)
- `LOCKS_DIR` → `R.LOCKS_DIR`
- `PROJECT_DIR` → `R.PROJECT_DIR` (for project-scoped reads)

- [ ] **Step 2: Update .session_id path to per-project**

Find where `.session_id` is read/written (uses DATA_DIR). Change to:
```javascript
path.join(R.PROJECT_DATA_DIR, '.session_id')
```

This ensures each project gets its own session ID. (Codex #6)

- [ ] **Step 3: Add project fields to event records**

In the event object construction, add:
```javascript
project: R.PROJECT_SLUG,
project_dir: R.PROJECT_DIR,
```

- [ ] **Step 4: Ensure EVENTS_DIR is created (mkdirSync recursive)**

Verify the existing `mkdirSync(EVENTS_DIR, { recursive: true })` call now creates the project-namespaced path.

- [ ] **Step 5: Verify syntax**

```powershell
node --check "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\lib\emit-event.js"
```

### Task 2.2: Update entropy-scan.js

- [ ] **Step 1: Replace path block with resolve.js**

```javascript
const R = require('./resolve');
const CHECKS_PATH = path.join(R.CONFIG_DIR, 'entropy-checks.json');
const EMIT_PATH = path.join(__dirname, 'emit-event.js');
const TREND_PATH = path.join(R.DATA_DIR, 'entropy_trend.jsonl');
const DEDUP_PATH = path.join(R.PROJECT_DATA_DIR, '.entropy_dedup.json');
```

- [ ] **Step 2: Keep `cwd: R.PROJECT_DIR` for all execSync calls**

- [ ] **Step 3: Verify syntax**

### Task 2.3: Update bootstrap.js

- [ ] **Step 1: Replace path block**

```javascript
const R = require('./resolve');
const EMIT = path.join(__dirname, 'emit-event.js');
const LOGS_DIR = path.join(R.PROJECT_DIR, 'projects', 'nbi_dashboard', 'session_logs');
const MEMORY_DIR = path.join(R.PROJECT_DIR, 'memory');
```

- [ ] **Step 2: Update bootstrap marker to per-project (Codex #7)**

```javascript
const markerPath = path.join(R.PROJECT_DATA_DIR, 'bootstrap_complete.json');
```

- [ ] **Step 3: Verify syntax**

### Task 2.4: Update anti-regression.js

- [ ] **Step 1: Replace path block**

```javascript
const R = require('./resolve');
```

Use `R.PROPOSALS_DIR`, `R.EVENTS_DIR`, `path.join(R.DATA_DIR, 'proposal_status.jsonl')`.

- [ ] **Step 2: Verify syntax**

### Task 2.5: Update apply-gate.js

- [ ] **Step 1: Add resolve.js, keep PROJECT_DIR for apply targets**

```javascript
const R = require('./resolve');
```

Update harness-internal paths (section-boundaries, events dir) to use `R.*`.
Keep `path.resolve(R.PROJECT_DIR, canonical)` and `cwd: R.PROJECT_DIR` for apply operations.

- [ ] **Step 2: Verify syntax**

### Task 2.6: Update proposal-utils.js

- [ ] **Step 1: Replace path block**

```javascript
const R = require('./resolve');
```

Use `R.EVENTS_DIR`, `R.PROPOSALS_DIR`, `path.join(R.DATA_DIR, 'proposal_status.jsonl')`.

- [ ] **Step 2: Verify syntax**

### Task 2.7: Update reporting.js

- [ ] **Step 1: Replace path block**

```javascript
const R = require('./resolve');
```

Use `R.DATA_DIR`, `R.PROPOSALS_DIR`, `path.join(R.HARNESS_DIR, 'HARNESS_HEALTH.md')`.

- [ ] **Step 2: Verify syntax**

### Task 2.8: Update risk-classify.js

- [ ] **Step 1: Replace path block**

```javascript
const R = require('./resolve');
const POLICY_PATH = path.join(R.CONFIG_DIR, 'risk-policy.json');
```

- [ ] **Step 2: Verify syntax**

### Task 2.9: Update transcript-parser.js

- [ ] **Step 1: Replace path block**

```javascript
const R = require('./resolve');
const LOGS_DIR = path.join(R.PROJECT_DIR, 'projects', 'nbi_dashboard', 'session_logs');
const SIGNALS_PATH = path.join(R.DATA_DIR, 'candidate_signals.jsonl');
```

- [ ] **Step 2: Verify syntax**

### Task 2.10: Update memory-conflict.js

No harness paths to change. Keep as-is.

### Task 2.11: Update git-push.js (Codex #8, #9)

- [ ] **Step 1: Fix __dirname fallback and add safety checks**

Current fallback `path.resolve(__dirname, '..', '..', '..')` resolves wrong at global location. Replace with:

```javascript
const R = require('./resolve');
const { execSync } = require('child_process');

// Safety: only push if project has remote 'origin' (Codex #9)
try {
  const remotes = execSync('git remote', { cwd: R.PROJECT_DIR, encoding: 'utf8', timeout: 5000 });
  if (!remotes.split('\n').map(r => r.trim()).includes('origin')) {
    process.exit(0); // No origin remote, skip push
  }
} catch { process.exit(0); }

try {
  execSync('git push origin HEAD', { cwd: R.PROJECT_DIR, timeout: 60000, stdio: 'inherit' });
} catch (e) {
  process.stderr.write('git push failed: ' + (e.message || e) + '\n');
  process.exit(1);
}
```

- [ ] **Step 2: Verify syntax**

### Task 2.12: Verify syntax on all source files, then deploy to global

- [ ] **Step 1: Verify syntax on all 14 source files**

```powershell
Get-ChildItem "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\lib\*.js" | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: $($_.Name)" } }
```

- [ ] **Step 2: Deploy source to global**

```powershell
node "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\deploy.js"
```

### CODEX CHECKPOINT: Batch 2 Review

Run `codex exec "Review all 14 lib modules at C:/Users/gpbea/.claude/harness/lib/ for the global migration. Check every file for: (1) uses require('./resolve') for HARNESS_DIR/PROJECT_DIR/PROJECT_SLUG/paths, (2) no leftover 'PROJECT_DIR + .claude/harness' constructions, (3) per-project data (session_id, bootstrap marker, dedup state, events) uses PROJECT_DATA_DIR, (4) global data (entropy_trend, blocked_writes, proposals) uses DATA_DIR root, (5) git-push.js checks for remote origin before pushing, (6) PROJECT_DIR still used for project-scoped ops. Also read resolve.js and verify the slug uses basename+hash, HARNESS_DIR is env-overridable. Report every issue."` and fix all issues.

---

## Batch 3: Update Guards for Global Path Protection

### Task 3.1: Update shell-guard.js -- governed patterns

**Files:**
- Modify: `D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness/lib/shell-guard.js` (SOURCE first, then deploy)

The shell-guard does string matching on command text. It needs to catch writes to BOTH the global harness path and any project-local `.claude/harness/` path.

- [ ] **Step 1: Add global path resolution using __dirname (NOT os.homedir -- Codex #20)**

Find (lines 24-31):
```javascript
const fs = require('fs');

const GOVERNED_PATTERNS = [
  '.claude/harness/config/',
  '.claude/harness/lib/',
  '.claude/settings.json',
  '.claude/settings.local.json'
];
```

Replace with:
```javascript
const fs = require('fs');
const path = require('path');

// Use __dirname to find the global harness root, consistent with resolve.js
const GLOBAL_HARNESS = path.resolve(__dirname, '..')
  .replace(/\\/g, '/').toLowerCase();

// Also protect the global settings.json (Codex #10)
const GLOBAL_SETTINGS = path.join(path.resolve(__dirname, '..', '..'), 'settings.json')
  .replace(/\\/g, '/').toLowerCase();
const GLOBAL_SETTINGS_LOCAL = path.join(path.resolve(__dirname, '..', '..'), 'settings.local.json')
  .replace(/\\/g, '/').toLowerCase();

const GOVERNED_PATTERNS = [
  // Project-local patterns (relative)
  '.claude/harness/config/',
  '.claude/harness/lib/',
  '.claude/settings.json',
  '.claude/settings.local.json',
  // Global patterns (absolute, normalised via __dirname)
  GLOBAL_HARNESS + '/config/',
  GLOBAL_HARNESS + '/lib/',
  GLOBAL_SETTINGS,
  GLOBAL_SETTINGS_LOCAL,
];
```

- [ ] **Step 2: Update the `logBlockedAttempt` function to use global data dir**

Find (lines 276-285):
```javascript
function logBlockedAttempt(reason) {
  try {
    var PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    var blockedPath = require('path').join(PROJECT_DIR, '.claude', 'harness', 'data', 'blocked_writes.jsonl');
```

Replace with:
```javascript
function logBlockedAttempt(reason) {
  try {
    var harnessDir = path.resolve(__dirname, '..');
    var blockedPath = path.join(harnessDir, 'data', 'blocked_writes.jsonl');
```

- [ ] **Step 3: Verify syntax**

```powershell
node --check "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\lib\shell-guard.js"
```

### Task 3.2: Update write-guard.js -- matrix path, blocked writes, and global settings protection

**Files:**
- Modify: `D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness/lib/write-guard.js` (SOURCE first, then deploy)

- [ ] **Step 1: Replace path resolution**

Find (lines 31-32):
```javascript
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MATRIX_PATH = path.join(PROJECT_DIR, '.claude', 'harness', 'config', 'write-matrix.json');
```

Replace with:
```javascript
const HARNESS_DIR = path.resolve(__dirname, '..');
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MATRIX_PATH = path.join(HARNESS_DIR, 'config', 'write-matrix.json');
```

- [ ] **Step 2: Update blocked writes log path (line ~50)**

```javascript
    var blockedPath = path.join(HARNESS_DIR, 'data', 'blocked_writes.jsonl');
```

- [ ] **Step 3: Add global harness and global settings.json detection (Codex #10, #11)**

The write-guard must intercept writes to:
1. Global harness config/lib (absolute paths like `C:/Users/gpbea/.claude/harness/config/...`)
2. Global `~/.claude/settings.json` (absolute path)

Add a normalisation step early in the main flow:

```javascript
const globalHarnessNorm = HARNESS_DIR.replace(/\\/g, '/').toLowerCase();
const globalSettingsNorm = path.join(HARNESS_DIR, '..', 'settings.json')
  .replace(/\\/g, '/').toLowerCase();
const globalSettingsLocalNorm = path.join(HARNESS_DIR, '..', 'settings.local.json')
  .replace(/\\/g, '/').toLowerCase();

function isGlobalHarnessPath(absPath) {
  const norm = absPath.replace(/\\/g, '/').toLowerCase();
  if (norm.startsWith(globalHarnessNorm + '/')) {
    // Map absolute global path to relative .claude/harness/... namespace
    return '.claude/harness/' + norm.slice(globalHarnessNorm.length + 1);
  }
  return null;
}

function isGlobalSettingsPath(absPath) {
  const norm = absPath.replace(/\\/g, '/').toLowerCase();
  return norm === globalSettingsNorm || norm === globalSettingsLocalNorm;
}
```

Then in the main path-checking flow, check `isGlobalHarnessPath(filePath)` and if it returns a relative path, run it through the matrix check. If `isGlobalSettingsPath(filePath)`, check against cadence_governed rules.

- [ ] **Step 4: Verify syntax**

```powershell
node --check "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\lib\write-guard.js"
```

### Task 3.2b: Deploy updated guards to global

- [ ] **Step 1: Deploy source to global**

```powershell
node "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\deploy.js"
```

### Task 3.3: Test guards with global paths (against DEPLOYED global copies)

- [ ] **Step 1: Test shell-guard blocks global config writes**

```bash
echo '{"tool_input":{"command":"cp evil.js C:/Users/gpbea/.claude/harness/config/risk-policy.json"}}' | node "C:/Users/gpbea/.claude/harness/lib/shell-guard.js"
```

Expected: `{"decision":"block","reason":"SHELL_WRITE_DENIED: write command targeting governed harness path"}`

- [ ] **Step 2: Test shell-guard blocks global lib writes**

```bash
echo '{"tool_input":{"command":"cp evil.js C:/Users/gpbea/.claude/harness/lib/emit-event.js"}}' | node "C:/Users/gpbea/.claude/harness/lib/shell-guard.js"
```

Expected: `{"decision":"block",...}`

- [ ] **Step 3: Test shell-guard allows global data writes**

```bash
echo '{"tool_input":{"command":"cp event.jsonl C:/Users/gpbea/.claude/harness/data/NBIAI_TEAM_abc123/events/test.jsonl"}}' | node "C:/Users/gpbea/.claude/harness/lib/shell-guard.js"
```

Expected: no output (allowed -- data/ is not governed)

- [ ] **Step 4: Test write-guard blocks global config writes**

```bash
echo '{"tool_input":{"file_path":"C:/Users/gpbea/.claude/harness/config/risk-policy.json"},"tool_name":"Edit"}' | node "C:/Users/gpbea/.claude/harness/lib/write-guard.js"
```

Expected: `{"decision":"block",...}`

- [ ] **Step 5: Run existing guard tests**

```powershell
cd "C:\Users\gpbea\.claude\harness"
node tests/test-write-guard.js
```

### CODEX CHECKPOINT: Batch 3 Review

Run `codex exec "Review shell-guard.js and write-guard.js at C:/Users/gpbea/.claude/harness/lib/ for the global migration. Verify: (1) both guards protect GLOBAL harness paths (C:/Users/gpbea/.claude/harness/config/ and lib/), (2) both guards STILL protect project-local .claude/harness/ paths, (3) blocked writes log goes to global data dir, (4) write-matrix.json paths still resolve correctly for the write-guard, (5) no bypasses introduced by the path changes. Think adversarially about path normalisation edge cases. Report every issue."` and fix all issues.

---

## Batch 4: Migrate Hooks from Project to Global Settings

**IMPORTANT: Remove project hooks FIRST, then add global hooks. This eliminates the duplicate-fire window (Codex #14).**

**Hook ordering (Codex #13):** Claude Code fires global hooks and project hooks for the same event. Global hooks fire in array order. PreToolUse harness guards (shell-guard, write-guard) should come BEFORE GSD guards (gsd-prompt-guard, gsd-read-guard, gsd-workflow-guard) in global PreToolUse -- a harness block prevents the tool from running at all, which is the correct precedence. PostToolUse harness capture (emit-event) should come AFTER GSD hooks -- capture what actually happened after GSD context monitoring.

### Task 4.0: Remove harness hooks from project settings FIRST (Codex #14)

**Files:**
- Modify: `D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/settings.json`

- [ ] **Step 1: Read current project settings.json and write the exact post-removal JSON**

The resulting project settings.json PostToolUse array keeps ONLY:
1. `Bash(git commit *)` entry with ONLY the intelligence bank commit warning (remove git-push and entropy-scan sub-hooks)
2. `PowerShell(git commit *)` entry with ONLY the intelligence bank commit warning
3. `Edit` matcher with dashboard health check
4. `Agent` matcher with subagent audit prompt

The resulting PreToolUse array keeps ONLY:
1. `Bash|PowerShell` with bank-verify-gate.js
2. `Bash` with graphify suggestion
3. `Read|Glob` with graphify suggestion
4. `Write|Edit|NotebookEdit` with deprecated file guard
5. `Write|Edit` with client deliverable guard

REMOVED from PostToolUse:
- `Bash|PowerShell|Agent|Edit|Write|Read|Grep|Glob` emit-event.js tool_outcome
- `Skill` emit-event.js skill_usage
- `Read|Write|Edit` emit-event.js detect_secondary

REMOVED from PreToolUse:
- `Bash|PowerShell` shell-guard.js
- `Write|Edit` write-guard.js

- [ ] **Step 2: Validate JSON**

```powershell
node -e "JSON.parse(require('fs').readFileSync('D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/settings.json','utf8')); console.log('Valid')"
```

### Task 4.1: Add harness hooks to global settings.json

**Files:**
- Modify: `C:/Users/gpbea/.claude/settings.json`

- [ ] **Step 1: Read current global settings.json**

Read `C:/Users/gpbea/.claude/settings.json` to understand current hook structure. Note existing GSD hooks in PreToolUse and PostToolUse.

- [ ] **Step 2: Add PostToolUse harness hooks**

Add to the existing `hooks.PostToolUse` array in global settings.json:

```json
{
  "matcher": "Bash",
  "if": "Bash(git commit *)",
  "hooks": [
    {
      "type": "command",
      "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/gpbea/.claude/harness/lib/git-push.js\"",
      "timeout": 60,
      "async": true,
      "statusMessage": "Pushing to GitHub..."
    },
    {
      "type": "command",
      "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/gpbea/.claude/harness/lib/entropy-scan.js\"",
      "timeout": 15,
      "async": true,
      "statusMessage": "Running entropy scan..."
    }
  ]
},
{
  "matcher": "PowerShell",
  "if": "PowerShell(git commit *)",
  "hooks": [
    {
      "type": "command",
      "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/gpbea/.claude/harness/lib/git-push.js\"",
      "timeout": 60,
      "async": true,
      "statusMessage": "Pushing to GitHub..."
    },
    {
      "type": "command",
      "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/gpbea/.claude/harness/lib/entropy-scan.js\"",
      "timeout": 15,
      "async": true,
      "statusMessage": "Running entropy scan..."
    }
  ]
},
{
  "matcher": "Bash|PowerShell|Agent|Edit|Write|Read|Grep|Glob",
  "hooks": [
    {
      "type": "command",
      "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/gpbea/.claude/harness/lib/emit-event.js\" tool_outcome",
      "timeout": 5,
      "async": true,
      "statusMessage": "Capturing harness event..."
    }
  ]
},
{
  "matcher": "Skill",
  "hooks": [
    {
      "type": "command",
      "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/gpbea/.claude/harness/lib/emit-event.js\" skill_usage",
      "timeout": 5,
      "async": true,
      "statusMessage": "Logging skill invocation..."
    }
  ]
},
{
  "matcher": "Read|Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/gpbea/.claude/harness/lib/emit-event.js\" detect_secondary",
      "timeout": 5,
      "async": true
    }
  ]
}
```

- [ ] **Step 3: Add PreToolUse harness hooks**

Add to the existing `hooks.PreToolUse` array in global settings.json:

```json
{
  "matcher": "Bash|PowerShell",
  "hooks": [
    {
      "type": "command",
      "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/gpbea/.claude/harness/lib/shell-guard.js\"",
      "timeout": 5
    }
  ]
},
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/gpbea/.claude/harness/lib/write-guard.js\"",
      "timeout": 5
    }
  ]
}
```

### Task 4.2: Verify JSON validity after both settings changes

(Task 4.0 already handles the project settings removal. No duplicate removal needed here -- Codex R2 fix.)

- [ ] **Step 1: Validate both settings files**

```powershell
node -e "JSON.parse(require('fs').readFileSync('D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/settings.json','utf8')); console.log('Project settings: valid')"
node -e "JSON.parse(require('fs').readFileSync('C:/Users/gpbea/.claude/settings.json','utf8')); console.log('Global settings: valid')"
```

### Task 4.3: Verify hooks fire correctly

- [ ] **Step 1: Test global emit-event hook fires**

In any project directory, run a simple Read tool call and check that an event file appears in `~/.claude/harness/data/<project-slug>/events/`.

- [ ] **Step 2: Test global shell-guard fires**

Attempt a blocked shell command and verify it gets blocked by the global hook.

- [ ] **Step 3: Test project-specific hooks still fire**

In NBIAI_TEAM, make an Edit to a dashboard file and verify the dashboard health check hook fires.

### CODEX CHECKPOINT: Batch 4 Review

Run `codex exec "Review the hook migration in both settings.json files. Global: C:/Users/gpbea/.claude/settings.json. Project: D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/settings.json. Verify: (1) ALL 7 harness hooks are in global settings with correct absolute paths, (2) NO harness hooks remain in project settings, (3) ALL non-harness project-specific hooks (dashboard health, subagent audit, intelligence bank warning, bank-verify-gate, graphify, deprecated file guard, client deliverable guard) are preserved in project settings, (4) JSON is valid in both files, (5) hook ordering is sensible (PreToolUse guards before PostToolUse capture). Report every issue."` and fix all issues.

---

## Batch 5: Update Tests for Global Resolution (Codex #15, #16)

### Task 5.1: Update ALL test files for HARNESS_DIR override

**Files:**
- Modify: All test files in `D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness/tests/` (SOURCE first, then deploy)

**Key principle (Codex #15):** Tests that set `CLAUDE_PROJECT_DIR` to a temp dir expect harness config/data under that temp dir. But with `HARNESS_DIR = __dirname/..`, the lib modules now look at the global harness for config/data, not the temp dir. Fix: tests must ALSO set `HARNESS_DIR` to a temp harness dir when they need isolation.

- [ ] **Step 1: Update test pattern for isolation**

Each test that creates a fake project structure must also set `HARNESS_DIR`:

```javascript
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
// Create fake harness structure in temp
fs.mkdirSync(path.join(tmpDir, 'config'), { recursive: true });
fs.mkdirSync(path.join(tmpDir, 'data', 'events'), { recursive: true });
fs.mkdirSync(path.join(tmpDir, 'lib'), { recursive: true });
// Copy config files needed
fs.copyFileSync(
  path.join(path.resolve(__dirname, '..'), 'config', 'redaction.json'),
  path.join(tmpDir, 'config', 'redaction.json')
);
// Set both env vars
process.env.HARNESS_DIR = tmpDir;
process.env.CLAUDE_PROJECT_DIR = fakeProjectDir;
```

- [ ] **Step 2: Comprehensive test file update list (Codex #16)**

ALL test files that reference harness paths or set CLAUDE_PROJECT_DIR:

1. **test-emit-event.js** -- REAL_PROJECT_DIR, config path, live events dir. Set HARNESS_DIR.
2. **test-entropy-scan.js** -- PROJECT_DIR, CHECKS_PATH. Set HARNESS_DIR.
3. **test-entropy-residue.js** -- CLAUDE_PROJECT_DIR env. Set HARNESS_DIR.
4. **test-apply-gate.js** -- CLAUDE_PROJECT_DIR override. Set HARNESS_DIR.
5. **test-write-guard.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.
6. **test-anti-regression.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.
7. **test-event-enrichment.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.
8. **test-locking.js** -- TEMP_ROOT, REAL_PROJECT_DIR. Set HARNESS_DIR.
9. **test-memory-conflict.js** -- CLAUDE_PROJECT_DIR. No HARNESS_DIR needed (project-only module).
10. **test-metadata.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.
11. **test-redaction.js** -- REAL_PROJECT_DIR, LIB_PATH. Set HARNESS_DIR.
12. **test-bootstrap-git.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.
13. **test-proposal-format.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.
14. **test-reporting.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.
15. **test-transcript-parser.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.
16. **test-risk-classify.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.
17. **test-ulid.js** -- CLAUDE_PROJECT_DIR. Set HARNESS_DIR.

For each: read the test, add `process.env.HARNESS_DIR = <temp harness dir>` alongside existing `CLAUDE_PROJECT_DIR` override, and update any `path.resolve(__dirname, '..', '..', '...')` to `path.resolve(__dirname, '..')`.

- [ ] **Step 3: Run all tests**

```powershell
cd "C:\Users\gpbea\.claude\harness"
Get-ChildItem tests/test-*.js | ForEach-Object {
  Write-Host "Running $($_.Name)..."
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: $($_.Name)" }
  else { Write-Host "PASS" }
  Write-Host ""
}
```

All must pass. Fix failures before proceeding.

- [ ] **Step 4: Update tests in SOURCE repo, then redeploy**

Edit all test files in `D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness/tests/` (source first), then:

```powershell
node "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\deploy.js"
```

### CODEX CHECKPOINT: Batch 5 Review

Run `codex exec "Run all test files at C:/Users/gpbea/.claude/harness/tests/ and report results. For each test: (1) does it set HARNESS_DIR to a temp dir for isolation? (2) does it still pass? Report pass/fail for each file and root cause for any failures. Also verify that no test writes to the REAL global harness data directory during testing."` and fix all issues.

---

## Batch 6: Fresh-Session Verification + Documentation + Cleanup

**CRITICAL: Verify in a fresh session BEFORE any destructive cleanup (Codex #29).**

### Task 6.0: Fresh-session verification (BEFORE cleanup)

- [ ] **Step 1: Start a fresh Claude Code session in NBIAI_TEAM**

Close this session. Open a new one in the NBIAI_TEAM project.

- [ ] **Step 2: Verify event capture**

Run a simple Read tool call. Check `~/.claude/harness/data/<NBIAI_TEAM_slug>/events/` for a new event file.

- [ ] **Step 3: Verify shell-guard blocks global config writes**

Try: `cp test.js C:/Users/gpbea/.claude/harness/config/test.json`
Expected: BLOCKED

- [ ] **Step 4: Verify write-guard blocks global lib writes**

Try to Edit `C:/Users/gpbea/.claude/harness/lib/emit-event.js`
Expected: BLOCKED

- [ ] **Step 5: Verify project-specific hooks still fire**

Edit a dashboard file and confirm the dashboard health check hook fires.

- [ ] **Step 6: Test in a DIFFERENT project**

Open a Claude Code session in Astinus or foundry-vtt. Verify events land under a different project slug.

**IF ANY VERIFICATION FAILS:** Restore from backups:
```powershell
Copy-Item "C:\Users\gpbea\.claude\settings.json.pre-rho-migration" "C:\Users\gpbea\.claude\settings.json" -Force
Copy-Item "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.json.pre-rho-migration" "D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\settings.json" -Force
```

### Task 6.1: Update CLAUDE.md harness section

- [ ] **Step 1: Update harness location and model**

Key changes to the harness section:
- Runtime location: `~/.claude/harness/` (global, all projects)
- Source of truth: `NBIAI_TEAM/.claude/harness/` (git-tracked, deploy to global via `node .claude/harness/deploy.js`)
- Hooks: global `~/.claude/settings.json`
- Event data: project-namespaced under `~/.claude/harness/data/<project-slug>/`
- To update harness: edit source in repo, commit, run deploy.js

### Task 6.2: Update memory files

- [ ] **Step 1: Update project_shell_guard_gaps.md** -- note guards now protect global paths too
- [ ] **Step 2: Update project_nbiai_team.md** -- RHO now global, source-deploy model
- [ ] **Step 3: Update project_rho_purpose.md** -- note global migration

### Task 6.3: Clean up global settings (Codex #21, #25)

**Only after fresh-session verification passes.**

- [ ] **Step 1: Update additionalDirectories**

Replace project-local harness directory entries with global ones:

Remove:
- `D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\config`
- `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\config`
- `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\tests`
- `d:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\lib`
- `D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\lib`
- `D:\OneDrive\Claude_code\NBIAI_TEAM\.claude\harness\.claude\harness\lib`

Add:
- `C:\Users\gpbea\.claude\harness\lib`
- `C:\Users\gpbea\.claude\harness\config`
- `C:\Users\gpbea\.claude\harness\tests`

(Note: `C:\Users\gpbea` already in additionalDirectories provides broad access. These explicit entries ensure Edit/Write tools can target harness files without permission prompts. -- Codex #22)

- [ ] **Step 2: Remove stale Bash permissions (Codex #25)**

Remove ALL entries matching these patterns from the global allow list:
```
Bash(cp d:/tmp/*.js .claude/harness/lib/...)
Bash(cp d:/tmp/*.js "d:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness/...)
Bash(cp d:/tmp/*.json .claude/harness/config/...)
Bash(node .claude/harness/...)
Bash(cp .claude/harness/...)
Bash(mv .claude/harness/...)
Bash(rm -rf ... .claude/harness/...)
Bash(rm -f ... .claude/harness/...)
```

Count before and after to confirm cleanup scope.

- [ ] **Step 3: Validate JSON**

```powershell
node -e "JSON.parse(require('fs').readFileSync('C:/Users/gpbea/.claude/settings.json','utf8')); console.log('Valid')"
```

### Task 6.4: Commit source changes

**Note: The project-local `.claude/harness/` is NOT deleted (Codex #1). It stays as the git-tracked source of truth.**

- [ ] **Step 1: Commit**

```bash
git add .claude/harness/lib/resolve.js .claude/harness/deploy.js .claude/harness/lib/*.js .claude/harness/tests/*.js .claude/settings.json CLAUDE.md
git commit -m "refactor: migrate RHO harness to global (~/.claude/harness/)

Source-deploy model: repo is source of truth, global is runtime.
- Added resolve.js (shared path resolution, HARNESS_DIR env override)
- Added deploy.js (copies lib/, config/, and tests/ to global)
- All lib modules use resolve.js for paths
- Event data project-namespaced via collision-resistant slug
- Guards protect both global and project-local paths
- git-push checks for remote origin before pushing
- Hooks moved from project to global settings.json
- Tests updated with HARNESS_DIR isolation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### CODEX CHECKPOINT: Batch 6 Final Audit

Run `codex exec "Full audit of the RHO harness global migration. Check: (1) Source of truth at D:/OneDrive/Claude_code/NBIAI_TEAM/.claude/harness/ contains resolve.js and deploy.js, (2) Global runtime at C:/Users/gpbea/.claude/harness/ has all 14 lib modules and all config files, (3) Global settings.json has all 7 harness hooks with correct absolute paths and they are ordered BEFORE GSD hooks in PreToolUse, (4) Project settings.json has NO harness hooks but retains all project-specific hooks, (5) All lib modules use require('./resolve') for paths, (6) Guards protect global paths including global settings.json, (7) git-push.js checks for remote origin, (8) Stale Bash permissions and additionalDirectories cleaned from global settings, (9) CLAUDE.md documents the source-deploy model, (10) No test writes to real global harness data. This is the FINAL sign-off -- be exhaustive."` and fix every issue found.

---

## Post-Migration Summary

After all batches complete and pass Codex review:

- **Source:** `NBIAI_TEAM/.claude/harness/` (git-tracked, commit changes here)
- **Runtime:** `~/.claude/harness/` (deployed via `node .claude/harness/deploy.js`)
- **Deploy after changes:** Edit source, commit, run deploy.js
- **Events:** `~/.claude/harness/data/<project-slug>/events/YYYY-MM-DD/`
- **Guards:** Protect both global and project-local harness paths
- **Rollback:** Restore from `.pre-rho-migration` backup files if needed
