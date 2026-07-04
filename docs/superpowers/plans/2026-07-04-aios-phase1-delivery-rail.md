# AIOS Phase 1: Delivery and Response Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Output reaches Glen on his phone with one-tap responses: fix the P009 event scanner path, add per-task model routing to cadence, extend the AIOS API and broker for Block Kit delivery, build the WorkSage Slack bot (Socket Mode, Glen-only), and rewrite the morning brief as a decision queue.

**Architecture:** Everything flows through the existing `aios_actions` table and outbound broker. A new standalone PM2 process (`nbi-slack-bot`) runs a Bolt Socket Mode app: Block Kit buttons update `aios_actions` state directly via the shared Postgres pool; free-form DMs dispatch to headless Claude via a new `claude-dispatch` lib. The morning brief cadence prompt is rewritten to read pending actions and deliver them with buttons.

**Tech Stack:** Node.js, Express 4, PostgreSQL (`pg`), `@slack/bolt` (new dep), `@slack/web-api` (existing), Vitest, PM2, PowerShell (cadence runner), headless `claude -p`.

**Spec:** `docs/superpowers/specs/2026-07-04-aios-signal-engine-design.md` (Phase 1 section)

**Worktree rule:** Tasks 3 to 6 touch more than 3 files in `dashboard-server/`. Execute this plan in a worktree per the using-git-worktrees skill.

**Environment facts the engineer needs:**

- Repo root: `D:\OneDrive\Claude_code\NBIAI_TEAM`. Dashboard server: `dashboard-server/` (PM2 apps `nbi-dashboard` on :8888, `nbi-dashboard-staging` on :8887).
- Existing env vars in `dashboard-server/.env`: `AIOS_INTERNAL_TOKEN`, `GLEN_SLACK_USER_ID`, `SLACK_BOT_TOKEN`, `DATABASE_URL`. New vars this plan adds: `SLACK_APP_TOKEN` (Glen creates, Task 8), `AIOS_DISPATCH_MODEL` (optional override).
- Latest migration is `075_configurable_hierarchy.sql`; this plan adds `076`.
- Harness runtime data lives at `%USERPROFILE%\.claude\harness\data\<slug>\events\<YYYY-MM-DD>\<session>.jsonl`. The slug for this repo is `NBIAI_TEAM_aeb5ed` (computed by `.claude/harness/lib/resolve.js` from basename + md5-hash-prefix of the cwd). Verified live 2026-07-04: events ARE being written (57 events in today's file); the diagnosis prompt reads the wrong path.
- Model policy (hard rules): never `claude-opus-4-7*`, never `claude-opus-4-8*`, never bare `opus`. Fallback tier is `claude-opus-4-6`. Cadence default stays `claude-sonnet-4-6` for mechanical tasks.
- Run all `npm` commands from `dashboard-server/`. Verification evidence rule: harness evidence detection needs the literal command in one Bash/PowerShell call (`cd dashboard-server; npm test` style is fine since 7e0ea68).

---

## Task 1: Fix P009 -- harness-improvement scanner reads the wrong events path

**Files:**
- Modify: `scripts/cadence/prompts/harness-improvement.md`

Root cause (verified 2026-07-04): the prompt tells the cadence run to scan `.claude/harness/data/events/` (repo-relative, flat legacy layout) and to check `.claude/harness/data/last_diagnosis.json`. The event writer (`emit-event.js` via global hooks) writes to the GLOBAL namespaced path `%USERPROFILE%\.claude\harness\data\NBIAI_TEAM_aeb5ed\events\<date>\<session>.jsonl`. The scanner has been reading a stale legacy folder, which produced the false "zero events for 10 days" finding in HARNESS_HEALTH.md.

- [ ] **Step 1: Add a path-resolution preamble to the prompt**

In `scripts/cadence/prompts/harness-improvement.md`, immediately before the line `1. Check ...` (currently line 31), insert:

```markdown
0. Resolve the harness data root FIRST. Run via Bash:
   `node -e "const R=require('./.claude/harness/lib/resolve');console.log(JSON.stringify({events:R.EVENTS_DIR,data:R.PROJECT_DATA_DIR}))"`
   Call the two values EVENTS_DIR and DATA_DIR for the rest of this prompt. Events live
   in date subdirectories: EVENTS_DIR/YYYY-MM-DD/<session_id>.jsonl. Do NOT read the
   repo-local `.claude/harness/data/` directory; it is a stale legacy copy.
```

- [ ] **Step 2: Repoint the read paths**

Replace (exact old text, currently lines 31-33):

```markdown
1. Check `.claude/harness/data/last_diagnosis.json` for the previous run date. If missing, this is the first run — process all available events.
```
with:
```markdown
1. Check `DATA_DIR/last_diagnosis.json` (resolved in step 0) for the previous run date. If missing, this is the first run — process all available events.
```

Replace:
```markdown
2. List all `.jsonl` files in `.claude/harness/data/events/` dated after the last diagnosis. Read each file, parse each line as JSON. Skip and count malformed records.
```
with:
```markdown
2. List all `.jsonl` files under `EVENTS_DIR/<date>/` for every date after the last diagnosis (the directory layout is one subdirectory per day, one JSONL file per session). Read each file, parse each line as JSON. Skip and count malformed records.
```

- [ ] **Step 3: Repoint the remaining path references**

Search the file for every other occurrence of `.claude/harness/data/` (the write-prohibition list around line 187, the 90-day cleanup section around line 288, and the `last_diagnosis.json` write instruction around line 312). Replace each with the `EVENTS_DIR`/`DATA_DIR` names defined in step 0, keeping the surrounding sentence intact. The write-prohibition line becomes:

```markdown
You may NOT write to: EVENTS_DIR/** (the global event ledger), .claude/harness/proposals/**, .claude/harness/HARNESS_HEALTH.md.
```

- [ ] **Step 4: Verify the resolved path sees the missing events**

Run from repo root:
```powershell
node -e "const R=require('./.claude/harness/lib/resolve');const fs=require('fs');const days=fs.readdirSync(R.EVENTS_DIR);console.log('days:',days.length,'latest:',days.sort().slice(-3).join(', '))"
```
Expected: `days:` count of 20+, latest including `2026-07-04` (or the current date). This proves the diagnosis scanner will now see the events the writer produces.

- [ ] **Step 5: Commit**

```bash
git add scripts/cadence/prompts/harness-improvement.md
git commit -m "fix(harness): P009 - repoint diagnosis scanner to global namespaced events path"
```

---

## Task 2: Per-task model routing in the cadence runner

**Files:**
- Modify: `scripts/cadence/run-cadence.ps1`
- Create: `scripts/cadence/model-map.json`

The runner currently hardcodes `--model claude-sonnet-4-6` (line 48). The Signal Engine (Phase 2) and any quality-critical cadence task need a stronger model; Glen's model policy bans 4.7/4.8/bare-opus outright.

- [ ] **Step 1: Create the model map**

Create `scripts/cadence/model-map.json`:

```json
{
  "_comment": "Per-task model routing for cadence runs. Tasks not listed use default. Banned patterns are enforced by run-cadence.ps1 regardless of this file.",
  "default": "claude-sonnet-4-6",
  "tasks": {
    "morning-brief": "claude-sonnet-4-6",
    "harness-improvement": "claude-opus-4-6"
  }
}
```

- [ ] **Step 2: Add -Model parameter, map lookup, and banned-model guard to the runner**

In `scripts/cadence/run-cadence.ps1`, replace the param block:

```powershell
param(
    [Parameter(Mandatory = $true)][string]$Task
)
```
with:
```powershell
param(
    [Parameter(Mandatory = $true)][string]$Task,
    [string]$Model = '',
    [switch]$DryRun
)
```

After the line `"[$(Get-Date -Format o)] cadence task '$Task' starting" | Out-File $log -Encoding utf8` (the line that initialises the log with an overwrite -- inserting BEFORE it would get our warnings clobbered) insert:

```powershell
# --- Model resolution: explicit -Model beats model-map.json beats default ---
$modelMapFile = Join-Path $repo 'scripts\cadence\model-map.json'
if (-not $Model) {
    $Model = 'claude-sonnet-4-6'
    if (Test-Path $modelMapFile) {
        try {
            $map = Get-Content $modelMapFile -Raw | ConvertFrom-Json
            if ($map.tasks.$Task) { $Model = $map.tasks.$Task }
            elseif ($map.default) { $Model = $map.default }
        } catch {
            "[$(Get-Date -Format o)] WARN: model-map.json unreadable, using default" | Out-File $log -Append -Encoding utf8
        }
    }
}
# --- Banned model guard (Glen's standing rules: no 4.7, no 4.8, no bare opus alias) ---
$banned = @('claude-opus-4-7', 'claude-opus-4-8')
foreach ($b in $banned) {
    if ($Model.StartsWith($b)) {
        "[$(Get-Date -Format o)] FATAL: model '$Model' is banned by policy" | Out-File $log -Append -Encoding utf8
        exit 1
    }
}
if ($Model -eq 'opus') {
    "[$(Get-Date -Format o)] FATAL: bare 'opus' alias is banned by policy" | Out-File $log -Append -Encoding utf8
    exit 1
}
if ($DryRun) {
    Write-Output "DRYRUN task=$Task model=$Model prompt=$promptFile"
    exit 0
}
```

Then replace the invocation line:
```powershell
& claude -p $prompt --model claude-sonnet-4-6 --permission-mode bypassPermissions 2>&1 |
```
with:
```powershell
& claude -p $prompt --model $Model --permission-mode bypassPermissions 2>&1 |
```

Note: with this insertion point the log is already initialised, so the block's `-Append` writes land correctly, and the `$DryRun`/banned-model exits happen before the `& claude` invocation on the next line.

- [ ] **Step 3: Verify with dry runs**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task morning-brief -DryRun
```
Expected: `DRYRUN task=morning-brief model=claude-sonnet-4-6 prompt=...`

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task harness-improvement -DryRun
```
Expected: `DRYRUN task=harness-improvement model=claude-opus-4-6 ...`

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task morning-brief -Model claude-opus-4-8 -DryRun
```
Expected: exit code 1, no DRYRUN line (banned guard fires before dry-run output). Check `$LASTEXITCODE` is 1.

- [ ] **Step 4: Commit**

```bash
git add scripts/cadence/run-cadence.ps1 scripts/cadence/model-map.json
git commit -m "feat(cadence): per-task model routing with banned-model guard and -DryRun"
```

---

## Task 3: Internal GET endpoint for pending actions

**Files:**
- Modify: `dashboard-server/routes/aios.js`
- Test: `dashboard-server/tests/unit/aios-routes.test.mjs`

The morning brief cadence run and the bot need to LIST pending actions with the internal token. Today only admin (session-cookie) routes can list; cadence runs have no session.

- [ ] **Step 1: Write the failing tests**

Append to the `describe('AIOS internal routes (cadence)')` block in `dashboard-server/tests/unit/aios-routes.test.mjs`:

```javascript
  it('GET /api/internal/aios/actions lists pending actions with valid token', async () => {
    pool._push({ rows: [{ id: 'a-1', title: 'Draft to Jen', approval_state: 'pending' }], rowCount: 1 });
    const res = await request(app)
      .get('/api/internal/aios/actions?state=pending&limit=10')
      .set('x-nbi-internal-token', 'test-internal-token')
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Draft to Jen');
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain('approval_state = $1');
    expect(pool.query.mock.calls[0][1]).toEqual(['pending', 10]);
  });

  it('GET /api/internal/aios/actions rejects without token', async () => {
    await request(app).get('/api/internal/aios/actions').expect(401);
  });

  it('GET /api/internal/aios/actions rejects invalid state', async () => {
    await request(app)
      .get('/api/internal/aios/actions?state=deleted')
      .set('x-nbi-internal-token', 'test-internal-token')
      .expect(400);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/aios-routes.test.mjs`
Expected: the three new tests FAIL with 404 (route not registered).

- [ ] **Step 3: Implement the route**

In `dashboard-server/routes/aios.js`, inside `createInternalRoutes`, after the `POST /api/internal/aios/actions` handler and before the `POST /api/internal/aios/outbound/send-and-process` handler, add:

```javascript
  router.get('/api/internal/aios/actions', requireInternal, async (req, res) => {
    const state = req.query.state || 'pending';
    const validStates = ['pending', 'approved', 'rejected', 'snoozed'];
    if (!validStates.includes(state)) {
      return res.status(400).json({ error: `invalid state: ${state}` });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    try {
      const { rows } = await pool.query(
        `SELECT * FROM aios_actions WHERE approval_state = $1
         ORDER BY risk_class DESC, created_at DESC LIMIT $2`,
        [state, limit]
      );
      res.json(rows);
    } catch (err) {
      log('error', 'AIOS-internal', 'List actions failed', { error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server; npx vitest run tests/unit/aios-routes.test.mjs`
Expected: ALL tests in the file PASS (pre-existing plus 3 new).

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/routes/aios.js dashboard-server/tests/unit/aios-routes.test.mjs
git commit -m "feat(aios): internal GET endpoint for pending actions (cadence + bot consumers)"
```

---

## Task 4: Block Kit support in the outbound broker

**Files:**
- Create: `dashboard-server/migrations/076_aios_outbound_blocks.sql`
- Modify: `dashboard-server/lib/outbound-broker.js`
- Modify: `dashboard-server/routes/aios.js` (pass-through)
- Test: `dashboard-server/tests/unit/outbound-broker.test.mjs`

The broker sends plain text only. Decision-queue delivery needs interactive Block Kit blocks (buttons). Slack rule: when `blocks` are provided, `text` remains the notification fallback.

- [ ] **Step 1: Write the migration**

Create `dashboard-server/migrations/076_aios_outbound_blocks.sql`:

```sql
-- 076_aios_outbound_blocks.sql
-- Optional Block Kit payload for Slack DMs. When present, sent as `blocks`
-- with draft_text as the notification fallback text.
ALTER TABLE aios_outbound_queue ADD COLUMN draft_blocks JSONB;
```

- [ ] **Step 2: Write the failing tests**

Append to `dashboard-server/tests/unit/outbound-broker.test.mjs` (match the file's existing mock style; it constructs the broker with a `_slackClient` mock and a mock pool):

```javascript
describe('Block Kit support', () => {
  it('queueMessage stores draft_blocks when provided', async () => {
    const pool = makeMockPool();
    pool._push({ rows: [{ id: 'q-blocks-1' }], rowCount: 1 });
    const broker = createBroker({ pool, log: vi.fn(), slackBotToken: 't', glenSlackUserId: 'U123', _slackClient: makeMockSlack() });
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'hello' } }];
    await broker.queueMessage({ actionId: 'a-1', destinationType: 'slack_dm', destinationId: 'U123', draftText: 'hello', draftBlocks: blocks });
    const insertCall = pool.query.mock.calls.find(c => c[0].includes('INSERT INTO aios_outbound_queue'));
    expect(insertCall[0]).toContain('draft_blocks');
    expect(insertCall[1]).toContainEqual(JSON.stringify(blocks));
  });

  it('processQueue passes blocks to chat.postMessage when present', async () => {
    const pool = makeMockPool();
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'hi' } }];
    pool._push({ rowCount: 0 });                      // stale claim recovery
    pool._push({ rows: [{ id: 'q-1', action_id: 'a-1', destination_id: 'U123', draft_text: 'hi', draft_blocks: blocks }], rowCount: 1 }); // claim
    pool._push({ rows: [{ count: '0' }], rowCount: 1 }); // rate limit check
    pool._push({ rowCount: 1 });                      // mark sent
    const slack = makeMockSlack();
    const broker = createBroker({ pool, log: vi.fn(), slackBotToken: 't', glenSlackUserId: 'U123', _slackClient: slack });
    await broker.processQueue();
    expect(slack.chat.postMessage).toHaveBeenCalledWith(expect.objectContaining({ channel: 'U123', text: 'hi', blocks }));
  });
});
```

If the existing test file lacks `makeMockPool`/`makeMockSlack` helpers with these names, reuse whatever equivalent helpers it defines -- the assertions are what matter. The BEGIN/COMMIT transaction queries in `processQueue` go through `pool.connect()`; check how the existing tests mock the client and follow that pattern for the claim query.

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/outbound-broker.test.mjs`
Expected: new tests FAIL (`draft_blocks` not in INSERT; `blocks` not passed).

- [ ] **Step 4: Implement**

In `dashboard-server/lib/outbound-broker.js`:

`queueMessage` signature and INSERT become:

```javascript
  async function queueMessage({ actionId, destinationType, destinationId, draftText, draftBlocks, reason }) {
    if (!actionId) throw new Error('actionId is required -- no orphan sends');
    if (!configured && destinationType === 'slack_dm') {
      throw new Error('Broker not configured: GLEN_SLACK_USER_ID or SLACK_BOT_TOKEN missing');
    }
    const v = validateDestination(destinationType, destinationId);
    if (!v.valid) throw new Error(v.reason);

    const { rows } = await pool.query(
      `INSERT INTO aios_outbound_queue (action_id, destination_type, destination_id, draft_text, draft_blocks, reason)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [actionId, destinationType, destinationId, draftText, draftBlocks ? JSON.stringify(draftBlocks) : null, reason || '']
    );
    log('info', 'OutboundBroker', 'Queued', { id: rows[0].id, type: destinationType, actionId, hasBlocks: Boolean(draftBlocks) });
    return { id: rows[0].id };
  }
```

In `processQueue`, replace the `slack.chat.postMessage` call:

```javascript
          const msg = {
            channel: item.destination_id,
            text: item.draft_text,
            unfurl_links: false,
            unfurl_media: false,
          };
          if (item.draft_blocks) {
            msg.blocks = typeof item.draft_blocks === 'string' ? JSON.parse(item.draft_blocks) : item.draft_blocks;
          }
          const result = await slack.chat.postMessage(msg);
```

In `dashboard-server/routes/aios.js`, `POST /api/internal/aios/outbound/send-and-process`: accept and pass `blocks`:

```javascript
    const { actionId, destinationType, destinationId, text, blocks, reason } = req.body || {};
```
and
```javascript
      const queued = await broker.queueMessage({ actionId, destinationType, destinationId, draftText: text, draftBlocks: blocks, reason: reason || '' });
```

- [ ] **Step 5: Run the full unit suite**

Run: `cd dashboard-server; npm test`
Expected: ALL green (new tests pass, no regressions in aios-routes or broker suites).

- [ ] **Step 6: Apply the migration and commit**

The migration runner executes on server startup (`runMigrations(pool, log)` in server.js). Do NOT run `node migrations/runner.js` directly (it has no CLI entry point). Apply by restarting the production process AFTER the full unit suite is green (Gate 2 requires verified server surfaces before pm2 restart -- the `npm test` run in step 5 provides that evidence):

```powershell
pm2 restart nbi-dashboard; Start-Sleep -Seconds 5; pm2 logs nbi-dashboard --lines 30 --nostream
```
Expected: migration 076 applied line in the log, server healthy, dashboard still serving (`curl -s -o NUL -w "%{http_code}" http://localhost:8888/nbi_project_dashboard.html` returns 200).

```bash
git add dashboard-server/migrations/076_aios_outbound_blocks.sql dashboard-server/lib/outbound-broker.js dashboard-server/routes/aios.js dashboard-server/tests/unit/outbound-broker.test.mjs
git commit -m "feat(aios): Block Kit blocks support in outbound broker and send endpoint"
```

---

## Task 5: claude-dispatch lib (headless Claude from Node)

**Files:**
- Create: `dashboard-server/lib/claude-dispatch.js`
- Test: `dashboard-server/tests/unit/claude-dispatch.test.mjs`

The bot needs to run headless Claude for free-form questions. Prompt goes via stdin (Windows arg-length limits make argv unsafe for long prompts). Model policy enforced here too.

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/claude-dispatch.test.mjs`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const spawnMock = vi.fn();
vi.mock('child_process', () => ({ spawn: (...args) => spawnMock(...args) }));

const { EventEmitter } = require('events');

function makeFakeChild({ stdout = 'answer text', code = 0 } = {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = { write: vi.fn(), end: vi.fn() };
  child.kill = vi.fn();
  setImmediate(() => {
    child.stdout.emit('data', Buffer.from(stdout));
    child.emit('close', code);
  });
  return child;
}

describe('claude-dispatch', () => {
  let dispatch;
  beforeEach(async () => {
    vi.resetModules();
    spawnMock.mockReset();
    ({ dispatch } = await import('../../lib/claude-dispatch.js'));
  });

  it('spawns claude with the model and returns stdout', async () => {
    spawnMock.mockReturnValue(makeFakeChild({ stdout: 'The answer.' }));
    const result = await dispatch({ prompt: 'question', model: 'claude-opus-4-6', cwd: 'D:/repo' });
    expect(result.text).toBe('The answer.');
    const [cmd, args, opts] = spawnMock.mock.calls[0];
    expect(args).toContain('--model');
    expect(args[args.indexOf('--model') + 1]).toBe('claude-opus-4-6');
    expect(opts.cwd).toBe('D:/repo');
  });

  it('writes the prompt to stdin', async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    await dispatch({ prompt: 'my long prompt', model: 'claude-opus-4-6', cwd: '.' });
    expect(child.stdin.write).toHaveBeenCalledWith('my long prompt');
    expect(child.stdin.end).toHaveBeenCalled();
  });

  it('rejects banned models without spawning', async () => {
    await expect(dispatch({ prompt: 'q', model: 'claude-opus-4-8', cwd: '.' })).rejects.toThrow(/banned/);
    await expect(dispatch({ prompt: 'q', model: 'opus', cwd: '.' })).rejects.toThrow(/banned/);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('rejects on non-zero exit', async () => {
    spawnMock.mockReturnValue(makeFakeChild({ stdout: '', code: 1 }));
    await expect(dispatch({ prompt: 'q', model: 'claude-opus-4-6', cwd: '.' })).rejects.toThrow(/exit 1/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/claude-dispatch.test.mjs`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement**

Create `dashboard-server/lib/claude-dispatch.js`:

```javascript
'use strict';

const { spawn } = require('child_process');

const BANNED_PREFIXES = ['claude-opus-4-7', 'claude-opus-4-8'];
const DEFAULT_TIMEOUT_MS = 120000;

function assertModelAllowed(model) {
  if (!model) throw new Error('model is required');
  if (model === 'opus') throw new Error("bare 'opus' alias is banned by policy");
  for (const p of BANNED_PREFIXES) {
    if (model.startsWith(p)) throw new Error(`model '${model}' is banned by policy`);
  }
}

/**
 * Run headless Claude with the prompt on stdin.
 * Returns { text, durationMs }. Rejects on banned model, timeout, or non-zero exit.
 */
function dispatch({ prompt, model, cwd, timeoutMs = DEFAULT_TIMEOUT_MS, extraArgs = [] }) {
  assertModelAllowed(model);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const args = ['-p', '--model', model, '--permission-mode', 'bypassPermissions', ...extraArgs];
    // shell: true so Windows resolves the `claude` npm shim (claude.cmd)
    const child = spawn('claude', args, { cwd, shell: true, windowsHide: true });

    let out = '';
    let err = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`claude dispatch timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(`claude dispatch exit ${code}: ${err.slice(0, 500)}`));
      }
      resolve({ text: out.trim(), durationMs: Date.now() - started });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

module.exports = { dispatch, assertModelAllowed };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server; npx vitest run tests/unit/claude-dispatch.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Live smoke test (one-off, cheap)**

```powershell
cd dashboard-server; node -e "require('./lib/claude-dispatch').dispatch({ prompt: 'Reply with exactly: DISPATCH-OK', model: 'claude-sonnet-4-6', cwd: process.env.REPO_ROOT || '..' , timeoutMs: 90000 }).then(r => console.log(r.text)).catch(e => { console.error(e.message); process.exit(1); })"
```
Expected: output containing `DISPATCH-OK`. This proves the Windows shim resolution and stdin path work against the real CLI.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/lib/claude-dispatch.js dashboard-server/tests/unit/claude-dispatch.test.mjs
git commit -m "feat(aios): claude-dispatch lib - headless Claude via stdin with model policy guard"
```

---

## Task 6: WorkSage Slack bot (Socket Mode)

**Files:**
- Create: `dashboard-server/lib/bot-handlers.js` (pure logic, unit-testable)
- Create: `dashboard-server/slack-bot.js` (process entry)
- Modify: `dashboard-server/ecosystem.config.js`
- Modify: `dashboard-server/package.json` (add `@slack/bolt`)
- Test: `dashboard-server/tests/unit/bot-handlers.test.mjs`

Design: Bolt Socket Mode app in its OWN PM2 process (`nbi-slack-bot`) so a bot crash never touches the dashboard. It shares the database via its own `pg` pool. Glen-only: every inbound event is checked against `GLEN_SLACK_USER_ID`. Buttons: `aios_approve`, `aios_skip`, `aios_more` with the action UUID as `value`. In Phase 1, approve records state only (the Executor arrives in Phase 2); the confirmation message says so honestly.

- [ ] **Step 1: Install the dependency**

```powershell
cd dashboard-server; npm install @slack/bolt@^4
```
Expected: `@slack/bolt` added to package.json dependencies, install clean.

- [ ] **Step 2: Write the failing tests for bot-handlers**

Create `dashboard-server/tests/unit/bot-handlers.test.mjs`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  isAuthorised, buildActionBlocks, handleButtonAction, buildDispatchPrompt, truncateForSlack
} = require('../../lib/bot-handlers');

function makeMockPool(rows = []) {
  return { query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }) };
}

describe('isAuthorised', () => {
  it('accepts only Glen in a DM', () => {
    expect(isAuthorised({ user: 'U_GLEN', channel_type: 'im' }, 'U_GLEN')).toBe(true);
    expect(isAuthorised({ user: 'U_OTHER', channel_type: 'im' }, 'U_GLEN')).toBe(false);
    expect(isAuthorised({ user: 'U_GLEN', channel_type: 'channel' }, 'U_GLEN')).toBe(false);
    expect(isAuthorised({ user: 'U_GLEN', channel_type: 'im' }, '')).toBe(false);
  });
});

describe('buildActionBlocks', () => {
  it('renders title with approve/skip/more buttons carrying the action id', () => {
    const blocks = buildActionBlocks({ id: 'act-1', title: 'Draft to Jen MacLean', action_type: 'draft', risk_class: 'medium' });
    const buttons = blocks.find(b => b.type === 'actions').elements;
    expect(buttons.map(b => b.action_id)).toEqual(['aios_approve', 'aios_skip', 'aios_more']);
    expect(buttons.every(b => b.value === 'act-1')).toBe(true);
    const section = blocks.find(b => b.type === 'section');
    expect(section.text.text).toContain('Draft to Jen MacLean');
  });
});

describe('handleButtonAction', () => {
  it('approve updates approval_state and feedback_signal', async () => {
    const pool = makeMockPool([{ id: 'act-1', title: 'T', approval_state: 'approved' }]);
    const result = await handleButtonAction({ pool, verb: 'approve', actionId: 'act-1' });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("approval_state = 'approved'");
    expect(sql).toContain('feedback_signal');
    expect(params).toEqual(['act-1']);
    expect(result.ok).toBe(true);
    expect(result.message).toContain('Approved');
  });

  it('skip sets rejected with rejected_not_worth', async () => {
    const pool = makeMockPool([{ id: 'act-1', approval_state: 'rejected' }]);
    await handleButtonAction({ pool, verb: 'skip', actionId: 'act-1' });
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain("approval_state = 'rejected'");
    expect(sql).toContain("'rejected_not_worth'");
  });

  it('more returns detail without mutating state', async () => {
    const pool = makeMockPool([{ id: 'act-1', title: 'T', description: 'Why it matters', proposed_action: 'Do X', source_quote: 'quote', source_system: 'granola' }]);
    const result = await handleButtonAction({ pool, verb: 'more', actionId: 'act-1' });
    expect(pool.query.mock.calls[0][0]).toContain('SELECT');
    expect(result.message).toContain('Why it matters');
    expect(result.message).toContain('Do X');
  });

  it('unknown action id reports not found', async () => {
    const pool = makeMockPool([]);
    const result = await handleButtonAction({ pool, verb: 'approve', actionId: 'nope' });
    expect(result.ok).toBe(false);
  });
});

describe('buildDispatchPrompt', () => {
  it('wraps the question with grounding and style rules', () => {
    const p = buildDispatchPrompt('What is the CH budget status?');
    expect(p).toContain('NBI_Brain.md');
    expect(p).toContain('What is the CH budget status?');
    expect(p).toMatch(/British English/);
    expect(p).toMatch(/never fabricate|do not fabricate|Never fabricate/i);
  });
});

describe('truncateForSlack', () => {
  it('caps at 3500 chars with ellipsis marker', () => {
    const long = 'x'.repeat(5000);
    const t = truncateForSlack(long);
    expect(t.length).toBeLessThanOrEqual(3500);
    expect(t.endsWith('[truncated]')).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/bot-handlers.test.mjs`
Expected: FAIL (module does not exist).

- [ ] **Step 4: Implement bot-handlers**

Create `dashboard-server/lib/bot-handlers.js`:

```javascript
'use strict';

// Pure logic for the Slack bot: authorisation, block building, button handling,
// dispatch prompt construction. No Bolt imports here -- keeps it unit-testable.

const SLACK_TEXT_CAP = 3500;

function isAuthorised(event, glenSlackUserId) {
  if (!glenSlackUserId) return false;
  return event.user === glenSlackUserId && event.channel_type === 'im';
}

function buildActionBlocks(action) {
  const risk = action.risk_class ? ` · risk: ${action.risk_class}` : '';
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${action.title}*\n_${action.action_type}${risk}_` },
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'Approve' }, style: 'primary', action_id: 'aios_approve', value: action.id },
        { type: 'button', text: { type: 'plain_text', text: 'Skip' }, action_id: 'aios_skip', value: action.id },
        { type: 'button', text: { type: 'plain_text', text: 'Tell me more' }, action_id: 'aios_more', value: action.id },
      ],
    },
  ];
}

async function handleButtonAction({ pool, verb, actionId }) {
  if (verb === 'approve') {
    const { rows } = await pool.query(
      `UPDATE aios_actions SET approval_state = 'approved', feedback_signal = 'approved_unchanged', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [actionId]
    );
    if (rows.length === 0) return { ok: false, message: 'Action not found (already handled elsewhere?)' };
    return { ok: true, message: `Approved: ${rows[0].title}. Recorded. (Execution engine lands in Phase 2 -- this records your decision.)` };
  }
  if (verb === 'skip') {
    const { rows } = await pool.query(
      `UPDATE aios_actions SET approval_state = 'rejected', feedback_signal = 'rejected_not_worth', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [actionId]
    );
    if (rows.length === 0) return { ok: false, message: 'Action not found (already handled elsewhere?)' };
    return { ok: true, message: `Skipped: ${rows[0].title}.` };
  }
  if (verb === 'more') {
    const { rows } = await pool.query('SELECT * FROM aios_actions WHERE id = $1', [actionId]);
    if (rows.length === 0) return { ok: false, message: 'Action not found.' };
    const a = rows[0];
    const parts = [
      `*${a.title}*`,
      a.description ? `Why: ${a.description}` : null,
      a.proposed_action ? `Proposed: ${a.proposed_action}` : null,
      a.source_quote ? `Source quote: "${a.source_quote}"` : null,
      `Source: ${a.source_system}${a.source_id ? ' / ' + a.source_id : ''}`,
    ].filter(Boolean);
    return { ok: true, message: parts.join('\n') };
  }
  return { ok: false, message: `Unknown verb: ${verb}` };
}

function buildDispatchPrompt(question) {
  return [
    'You are the NBI AIOS Slack bot answering a direct message from Glen Pryer.',
    'Ground your answer: read NBI_Brain.md first, and any brain/ module or intelligence/banks/ file the topic requires.',
    'Rules: British English, never use em dashes, be direct and concise (this is a Slack message, aim under 2500 characters).',
    'Never fabricate. If you cannot verify a fact from the repo or Brain, say "unverified" rather than guessing.',
    'Do not write to session logs or any repo file. Read-only research, then answer.',
    '',
    `Glen's message: ${question}`,
  ].join('\n');
}

function truncateForSlack(text) {
  if (text.length <= SLACK_TEXT_CAP) return text;
  return text.slice(0, SLACK_TEXT_CAP - 11) + '[truncated]';
}

module.exports = { isAuthorised, buildActionBlocks, handleButtonAction, buildDispatchPrompt, truncateForSlack };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server; npx vitest run tests/unit/bot-handlers.test.mjs`
Expected: PASS (all tests).

- [ ] **Step 6: Implement the process entry**

Create `dashboard-server/slack-bot.js`:

```javascript
'use strict';

// NBI AIOS Slack bot -- Socket Mode, Glen-only.
// Runs as its own PM2 process (nbi-slack-bot) so bot crashes never touch the dashboard.

require('dotenv').config();
const path = require('path');
const { App } = require('@slack/bolt');
const { Pool } = require('pg');
const { dispatch } = require('./lib/claude-dispatch');
const {
  isAuthorised, handleButtonAction, buildDispatchPrompt, truncateForSlack
} = require('./lib/bot-handlers');

const GLEN_ID = process.env.GLEN_SLACK_USER_ID || '';
const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..');
const DISPATCH_MODEL = process.env.AIOS_DISPATCH_MODEL || 'claude-opus-4-6';

function log(level, msg, extra) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, src: 'slack-bot', msg, ...extra }));
}

if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN || !GLEN_ID) {
  log('error', 'Missing SLACK_BOT_TOKEN, SLACK_APP_TOKEN, or GLEN_SLACK_USER_ID -- refusing to start');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// --- Button actions ---
for (const verb of ['approve', 'skip', 'more']) {
  app.action(`aios_${verb}`, async ({ ack, body, action, client }) => {
    await ack();
    const userId = body.user && body.user.id;
    if (userId !== GLEN_ID) {
      log('warn', 'Button press from non-Glen user ignored', { userId });
      return;
    }
    try {
      const result = await handleButtonAction({ pool, verb, actionId: action.value });
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: body.message && body.message.ts, text: result.message });
      log('info', 'Button handled', { verb, actionId: action.value, ok: result.ok });
    } catch (err) {
      log('error', 'Button handling failed', { verb, error: err.message });
      await client.chat.postMessage({ channel: body.channel.id, text: `That failed: ${err.message}` });
    }
  });
}

// --- Free-form DMs ---
app.message(async ({ message, say }) => {
  if (message.subtype || message.bot_id) return; // ignore edits, joins, bot echoes
  if (!isAuthorised(message, GLEN_ID)) {
    log('warn', 'DM from unauthorised user ignored', { user: message.user, channel_type: message.channel_type });
    return;
  }
  const question = (message.text || '').trim();
  if (!question) return;

  log('info', 'Dispatching DM to headless Claude', { chars: question.length });
  await say('On it -- give me up to a minute.');
  try {
    const result = await dispatch({
      prompt: buildDispatchPrompt(question),
      model: DISPATCH_MODEL,
      cwd: REPO_ROOT,
      timeoutMs: 180000,
    });
    await say(truncateForSlack(result.text || '(empty response)'));
    log('info', 'DM answered', { durationMs: result.durationMs });
  } catch (err) {
    log('error', 'Dispatch failed', { error: err.message });
    await say(`I could not answer that: ${err.message}`);
  }
});

(async () => {
  await app.start();
  log('info', 'Slack bot running (Socket Mode)', { model: DISPATCH_MODEL, repo: REPO_ROOT });
})();
```

- [ ] **Step 7: Add the PM2 app entry**

In `dashboard-server/ecosystem.config.js`, add a third entry to the `apps` array (after the staging entry):

```javascript
  }, {
    name: 'nbi-slack-bot',
    script: 'slack-bot.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: { NODE_ENV: 'production', REPO_ROOT: require('path').resolve(__dirname, '..') },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/slack-bot-error.log',
    out_file: './logs/slack-bot-out.log',
    merge_logs: true
  }]
```

(The closing `}]` replaces the existing final `}]` -- keep the two existing apps unchanged.)

- [ ] **Step 8: Run the full unit suite and commit**

Run: `cd dashboard-server; npm test`
Expected: ALL green.

```bash
git add dashboard-server/lib/bot-handlers.js dashboard-server/slack-bot.js dashboard-server/ecosystem.config.js dashboard-server/package.json dashboard-server/package-lock.json dashboard-server/tests/unit/bot-handlers.test.mjs
git commit -m "feat(aios): WorkSage Slack bot - Socket Mode, Glen-only, Block Kit actions, headless dispatch"
```

Note: the bot cannot START until Glen completes the Slack app setup in Task 8 (Socket Mode needs `SLACK_APP_TOKEN`). Code-complete is fine here; live verification is Task 8.

---

## Task 7: Morning brief becomes a decision queue

**Files:**
- Modify: `scripts/cadence/prompts/morning-brief.md`

The brief is rewritten to be action-first: it reads pending `aios_actions`, renders them as DO items with buttons, and only then adds KNOW/OVERNIGHT context. Keep the existing guards, health check, email fallback, and commit steps.

- [ ] **Step 1: Rewrite the prompt file**

Replace the STEPS section of `scripts/cadence/prompts/morning-brief.md` (keep the GUARDS section at the top unchanged) with:

```markdown
STEPS:
1. Fetch pending actions. Run via Bash:
   ```
   node -e "
     const dotenv = require('dotenv');
     dotenv.config({ path: 'dashboard-server/.env' });
     (async () => {
       const res = await fetch('http://localhost:8888/api/internal/aios/actions?state=pending&limit=20', {
         headers: { 'x-nbi-internal-token': process.env.AIOS_INTERNAL_TOKEN }
       });
       console.log(JSON.stringify(await res.json(), null, 2));
     })().catch(e => { console.error(e.message); process.exit(1); });
   "
   ```
   If the request fails, note "WorkSage unreachable" and continue with an information-only brief.

2. Build the brief in this exact structure (suppress any empty section entirely):

   **DO** (maximum 5, ordered by risk_class then age): one line per pending action --
   title, one-line why (from description), due date if set. These get Block Kit buttons in step 6.

   **KNOW** (maximum 3): only items requiring awareness for TODAY, drawn from
   intelligence/synthesis/intelligence_brief.md inputs (compilation_log, bank summaries,
   brain/pending_actions.md). Each item must name why it is actionable now. No general news.

   **OVERNIGHT**: what the system did since the last brief -- cadence run outcomes from
   scripts/cadence/state/routine_runs.json (failures prominently, with what was attempted),
   actions auto-created, banks recompiled. One line each.

   **LEVEL-UP** (Mondays only): read the most recent 7 days of
   projects/nbi_dashboard/session_logs/ and propose AT MOST ONE automation opportunity:
   what repeated manual pattern was observed (with evidence), what to build, effort S/M/L.
   "No strong candidate this week" is a valid and preferred output over a forced idea.

3. WorkSage health: run `curl -s -o NUL -w "%{http_code}" http://localhost:8888/nbi_project_dashboard.html` via Bash. 200 = UP, otherwise put "WorkSage DOWN" at the very top of the brief.

4. Pipeline pulse: apply the .claude/skills/pipeline/SKILL.md status rules (OVERDUE >30d, AT RISK 14-30d). Surface overdue/at-risk leads as DO items if a concrete next step exists, otherwise one KNOW line.

5. Write the full brief (markdown) to intelligence/synthesis/intelligence_brief.md.

6. SEND via Slack with buttons. Build a Block Kit payload: for each DO item that has an aios_action id, a section block with the title and why, followed by an actions block with three buttons -- action_id "aios_approve" / "aios_skip" / "aios_more", each with value set to the action UUID, Approve styled primary. Cap the total payload at 45 blocks (Slack limit is 50). KNOW/OVERNIGHT/LEVEL-UP render as plain section blocks. Then send via Bash:
   ```
   node -e "
     const fs = require('fs');
     const dotenv = require('dotenv');
     dotenv.config({ path: 'dashboard-server/.env' });
     const token = process.env.AIOS_INTERNAL_TOKEN;
     const glenId = process.env.GLEN_SLACK_USER_ID;
     if (!token || !glenId) { console.error('Missing AIOS_INTERNAL_TOKEN or GLEN_SLACK_USER_ID'); process.exit(1); }
     const blocks = JSON.parse(fs.readFileSync('scripts/cadence/state/brief_blocks.json', 'utf8'));
     const briefText = fs.readFileSync('intelligence/synthesis/intelligence_brief.md', 'utf8').slice(0, 3000);
     const date = new Date().toISOString().slice(0, 10);
     const base = 'http://localhost:8888';
     const headers = { 'Content-Type': 'application/json', 'x-nbi-internal-token': token };
     (async () => {
       const actionRes = await fetch(base + '/api/internal/aios/actions', {
         method: 'POST', headers,
         body: JSON.stringify({ source_system: 'cadence', source_id: 'morning-brief', action_type: 'task', title: 'Morning Brief - ' + date, approval_state: 'approved', created_by_routine: 'morning-brief', idempotency_key: 'cadence:morning-brief:' + date })
       });
       const action = await actionRes.json();
       if (!action.id) { console.error('Action create failed:', JSON.stringify(action)); process.exit(1); }
       const sendRes = await fetch(base + '/api/internal/aios/outbound/send-and-process', {
         method: 'POST', headers,
         body: JSON.stringify({ actionId: action.id, destinationType: 'slack_dm', destinationId: glenId, text: briefText, blocks, reason: 'Morning brief (decision queue)' })
       });
       console.log('Slack DM:', JSON.stringify(await sendRes.json()));
     })().catch(err => { console.error('Slack send error:', err.message); process.exit(1); });
   "
   ```
   Write the blocks JSON to scripts/cadence/state/brief_blocks.json BEFORE running this (overwrite each run; the file is transient state, commit-ignored by the state directory convention -- do not git add it).
   If the broker or Slack fails, report the exact error but do not abort.

7. SEND via email (fallback, unchanged): `node C:\Users\gpbea\.claude\connectors\cli.js msgraph sendEmail --to Gpryer@nbi-consulting.com --subject "NBI Morning Brief - {date}" --body "<HTML brief>"`. If it fails, report the error but do not abort.

8. Commit: `git add intelligence/synthesis/intelligence_brief.md scripts/cadence/state/routine_runs.json` then `git commit -m "intel(brief): daily brief {YYYY-MM-DD} [cadence]"`. Never add brief_blocks.json.

9. Final output: one line confirming brief written, Slack sent (or exact error), email sent (or exact error), commit hash.
```

- [ ] **Step 2: Verify the prompt references real endpoints**

Cross-check by grep: the endpoints named in the prompt must exist in `dashboard-server/routes/aios.js`:

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM; findstr /c:"api/internal/aios/actions" /c:"send-and-process" dashboard-server\routes\aios.js
```
Expected: both `router.get('/api/internal/aios/actions'` (Task 3) and `router.post('/api/internal/aios/outbound/send-and-process'` present.

- [ ] **Step 3: Commit**

```bash
git add scripts/cadence/prompts/morning-brief.md
git commit -m "feat(cadence): morning brief rewritten as decision queue with Block Kit buttons"
```

---

## Task 8: Glen-side Slack setup and end-to-end verification

**Files:** none (operational). This task requires Glen at the keyboard for the Slack app config, then joint verification.

- [ ] **Step 1: Glen configures the Slack app (browser, ~10 minutes)**

At https://api.slack.com/apps, open the existing WorkSage bot app (the one whose bot token is `SLACK_BOT_TOKEN`):

1. **Socket Mode** (left nav) -> Enable Socket Mode. Create an app-level token when prompted: name `nbi-bot-socket`, scope `connections:write`. Copy the `xapp-...` token.
2. **Event Subscriptions** -> Enable. Under "Subscribe to bot events" add `message.im`. Save.
3. **Interactivity & Shortcuts** -> toggle ON (with Socket Mode enabled, no request URL is needed).
4. **OAuth & Permissions** -> confirm bot token scopes include `chat:write`, `im:history`, `im:read`, `im:write`. If any were added, click "Reinstall to Workspace".
5. Add to `dashboard-server/.env`: `SLACK_APP_TOKEN=xapp-...` and (optional) `AIOS_DISPATCH_MODEL=claude-opus-4-6`.

- [ ] **Step 2: Start the bot and verify startup**

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server; pm2 start ecosystem.config.js --only nbi-slack-bot; Start-Sleep -Seconds 5; pm2 logs nbi-slack-bot --lines 20 --nostream
```
Expected: `Slack bot running (Socket Mode)` in the log, no crash loop (`pm2 list` shows stable uptime).

- [ ] **Step 3: Free-form DM smoke test (Glen, from phone or desktop)**

Glen DMs the bot: `Which clients are currently active?`
Expected: "On it" acknowledgement within seconds, then a grounded answer naming the active clients from the Brain within ~1 to 2 minutes. If the bot answers with fabricated clients or errors, stop and debug via `pm2 logs nbi-slack-bot` before proceeding.

- [ ] **Step 4: Seed a test action and verify the button round-trip**

PowerShell note: multi-line `node -e "..."` with embedded quotes breaks under PowerShell quoting. Write the script to a temp file via a single-quoted here-string (the closing `'@` must be at column 0) and run it:

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
$seed = @'
require('dotenv').config();
(async () => {
  const res = await fetch('http://localhost:8888/api/internal/aios/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-nbi-internal-token': process.env.AIOS_INTERNAL_TOKEN },
    body: JSON.stringify({ source_system: 'test', action_type: 'task', title: 'E2E rail test - safe to approve', description: 'Verifies the button round-trip. No side effects.', idempotency_key: 'test:rail:' + Date.now() })
  });
  console.log(JSON.stringify(await res.json()));
})();
'@
Set-Content -Path "$env:TEMP\seed-action.js" -Value $seed -Encoding utf8
node "$env:TEMP\seed-action.js"
```

Then run the morning brief manually:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task morning-brief
```
Expected, in order:
1. Glen receives the Slack DM brief **on his phone** with the test action as a DO item with three buttons. **Glen confirms receipt out loud/in chat -- this is the acceptance evidence the spec requires.**
2. Glen taps **Approve**. Bot replies in thread confirming.
3. Verify the state change landed (same here-string pattern):
```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
$check = @'
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT title, approval_state, feedback_signal FROM aios_actions WHERE source_system = 'test' ORDER BY created_at DESC LIMIT 1")
  .then(r => { console.log(r.rows[0]); pool.end(); });
'@
Set-Content -Path "$env:TEMP\check-action.js" -Value $check -Encoding utf8
node "$env:TEMP\check-action.js"
```
Expected: `approval_state: 'approved', feedback_signal: 'approved_unchanged'`.

- [ ] **Step 5: Verify P009 end-to-end**

Run the harness improvement cadence once, manually, and confirm it reports real event counts instead of zero:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task harness-improvement
```
Expected: the run's HARNESS_HEALTH.md rewrite shows events found for the post-2026-06-20 period (the events exist -- verified 2026-07-04). If it still reports zero, the prompt path fix regressed; debug from the run log in `scripts/cadence/logs/`.

- [ ] **Step 6: Final suite and session log**

```powershell
cd dashboard-server; npm test
```
Expected: all green. Then append the verification evidence (commands run, Glen's receipt confirmation, DB state output) to today's session log, and run `node .claude/harness/lib/finish-task.js` from repo root and include its output before claiming Phase 1 done.

---

## Out of Scope for This Plan (Phase 2+, per spec)

- The Signal Engine nightly analysis, `aios_signals` registry, and Executor (Phase 2)
- Granola post-processing, stale-lead drafts, intelligence-to-proposal routing (Phases 2-3)
- The 14:00 nudge and Monday level-up beyond the brief section stub (Phase 3)
- Voice (Phase 4)

## Dependency Notes

- Task 8 step 1 is the only step requiring Glen live. Everything before it is buildable and unit-testable without him.
- Tasks 1 and 2 are independent of Tasks 3-7 and can run in any order.
- Task order 3 -> 4 -> 5 -> 6 -> 7 is dependency-ordered: routes before broker blocks (7 uses both), dispatch before bot, everything before the brief rewrite that consumes it.
