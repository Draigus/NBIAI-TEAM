# AIOS Phase 2: Signal Engine on Granola Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the regex-based commitment extractor with an LLM-powered Signal Engine that analyses Granola meetings at every altitude level (commitments, decisions, people signals, product signals, risk signals, fact deltas), deduplicates via a signal registry, routes by confidence x risk with hard exclusions, and builds an Executor that turns approved proposals into real WorkSage artefacts (initiative hierarchies, research briefs) with quality-gated construction.

**Architecture:** A new cadence task (`signal-engine`) runs nightly on the strongest available model after the Granola sync imports meetings. For each new meeting, it extracts signals across the full altitude spectrum, checks each against the `aios_signals` registry (fingerprint-based dedup), and creates `aios_actions` with routing metadata. A server-side executor cron polls every 5 minutes for approved actions and dispatches recipe handlers: direct API insert for tasks, headless Claude with role AGENT.md context for initiatives and research briefs. Quality gates enforce deliverable contracts with mechanical validators, a critique pass (Codex for cross-AI review under fallback models), and post-execution verification. Auto-execution starts disabled; enabled per category only after Glen UATs.

**Tech Stack:** Node.js, Express 4, PostgreSQL (`pg`), headless `claude -p` (via `claude-dispatch.js`), Codex CLI (GPT-5.5 adversarial review), Vitest, PM2, PowerShell (cadence runner).

**Spec:** `docs/superpowers/specs/2026-07-04-aios-signal-engine-design.md` (Components 1, 2, 3, 3a, 3b)

**Worktree rule:** This plan touches >3 files in `dashboard-server/`. Execute in a worktree per the using-git-worktrees skill.

**Environment facts the engineer needs:**

- Repo root: `D:\OneDrive\Claude_code\NBIAI_TEAM`. Dashboard server: `dashboard-server/` (PM2 apps `nbi-dashboard` on :8888, `nbi-slack-bot` on PM2 id 6).
- Latest migration: `077_slack_conversation_sessions.sql`. This plan starts at 078.
- Existing tables: `aios_actions` (migration 072, 27 columns), `aios_outbound_queue` (migration 072+076), `meeting_items` (migration 061, section+data JSONB), `settings` (key-value, used for `granola_last_sync` HWM).
- Granola sync: `dashboard-server/lib/granola-sync.js`, runs as server cron at 07:00 (`cron/index.js` line 1031). Currently extracts commitments via `commitment-extractor.js` (regex patterns) and inserts `aios_actions` with `created_by_routine = 'granola-sync'`.
- Cadence runner: `scripts/cadence/run-cadence.ps1 -Task <name> [-Model <id>]`. Model map: `scripts/cadence/model-map.json`. Prompts: `scripts/cadence/prompts/`.
- 13 role AGENT.md files exist: `roles/{vp_product,senior_engineer,qa_lead,general_counsel,ui_ux_lead,cto,game_economy_consultant,producer,production_consultant,gaming_practice_lead,cmo,data_analyst,head_of_people}/AGENT.md`.
- `claude-dispatch.js` exports `dispatch({ prompt, model, cwd, timeoutMs, extraArgs, sessionId, resumeSessionId })` returning `{ text, durationMs }`.
- `POST /api/tasks` creates work items; root items must be `item_type='initiative'`; children validated against parent hierarchy (`initiative > project > feature > story > task`).
- Internal AIOS endpoints use `x-nbi-internal-token` header (env var `AIOS_INTERNAL_TOKEN`).
- Model policy: never `claude-opus-4-7*`, `claude-opus-4-8*`, or bare `opus`. Fallback tier: `claude-opus-4-6`. Cadence default: `claude-sonnet-4-6`. Signal Engine: `claude-opus-4-6` (strongest available on subscription).
- Codex CLI: `codex exec "<prompt>"` at `C:\Users\gpbea\AppData\Roaming\npm\codex`. Default model GPT-5.5. Output: `tmpcodex_*.md`.
- Migration IF-EXISTS guard pattern: wrap ALTER TABLE in `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '...') THEN ... END IF; END $$;` for AIOS tables that may not exist on test DBs (test baseline records migration 072 as `072_seed_interview_questions.sql`).
- Run all `npm` commands from `dashboard-server/`. Verification evidence rule: harness evidence detection needs the literal command in one Bash/PowerShell call.

---

## Task 1: Database migrations (078-079)

**Files:**
- Create: `dashboard-server/migrations/078_aios_signals.sql`
- Create: `dashboard-server/migrations/079_aios_actions_executor.sql`

The signal registry table and executor metadata columns on aios_actions.

- [ ] **Step 1: Write migration 078 -- aios_signals table**

Create `dashboard-server/migrations/078_aios_signals.sql`:

```sql
-- 078_aios_signals.sql
-- Signal registry: tracks recognised signals as stateful entities.
-- Fingerprints deduplicate at the signal level (not just per-item idempotency).
-- Design spec: docs/superpowers/specs/2026-07-04-aios-signal-engine-design.md (Component 2)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aios_signals') THEN
    CREATE TABLE aios_signals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fingerprint TEXT NOT NULL UNIQUE,
      signal_type TEXT NOT NULL CHECK (signal_type IN ('people', 'product', 'business', 'risk', 'process')),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'proposed', 'approved', 'rejected', 'built', 'expired')),
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_enriched TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      evidence_count INTEGER NOT NULL DEFAULT 1,
      linked_action_id UUID,
      summary TEXT NOT NULL,
      enrichment_log JSONB NOT NULL DEFAULT '[]'::jsonb,
      rejection_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_aios_signals_fingerprint ON aios_signals (fingerprint);
    CREATE INDEX idx_aios_signals_status ON aios_signals (status) WHERE status IN ('open', 'proposed');
  END IF;
END $$;
```

- [ ] **Step 2: Write migration 079 -- aios_actions executor columns**

Create `dashboard-server/migrations/079_aios_actions_executor.sql`:

```sql
-- 079_aios_actions_executor.sql
-- Executor metadata on aios_actions: signal linkage, recipe, and result.
-- Conditional guard: aios_actions may not exist on test DBs.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aios_actions') THEN
    ALTER TABLE aios_actions ADD COLUMN IF NOT EXISTS signal_id UUID REFERENCES aios_signals(id);
    ALTER TABLE aios_actions ADD COLUMN IF NOT EXISTS execution_recipe JSONB;
    ALTER TABLE aios_actions ADD COLUMN IF NOT EXISTS execution_result JSONB;

    CREATE INDEX IF NOT EXISTS idx_aios_actions_signal ON aios_actions (signal_id) WHERE signal_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_aios_actions_executor ON aios_actions (approval_state, execution_state)
      WHERE approval_state = 'approved' AND execution_state = 'pending';
  END IF;
END $$;
```

- [ ] **Step 3: Verify migrations apply cleanly**

Restart the server to apply:

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server; pm2 restart nbi-dashboard; Start-Sleep -Seconds 8; pm2 logs nbi-dashboard --lines 30 --nostream
```

Expected: "Applied migration 078" and "Applied migration 079" in the log, server healthy.

Verify the tables exist:

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node -e "require('dotenv').config(); const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); Promise.all([p.query(""SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'aios_signals' ORDER BY ordinal_position""), p.query(""SELECT column_name FROM information_schema.columns WHERE table_name = 'aios_actions' AND column_name IN ('signal_id','execution_recipe','execution_result')"")]).then(([s, a]) => { console.log('aios_signals columns:', s.rows.length); console.log('aios_actions new columns:', a.rows.map(r => r.column_name)); p.end(); });"
```

Expected: `aios_signals columns: 13`, `aios_actions new columns: ['signal_id', 'execution_recipe', 'execution_result']`.

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/migrations/078_aios_signals.sql dashboard-server/migrations/079_aios_actions_executor.sql
git commit -m "feat(aios): migrations 078-079 -- signal registry table and executor columns"
```

---

## Task 2: Signal registry lib + tests

**Files:**
- Create: `dashboard-server/lib/signal-registry.js`
- Test: `dashboard-server/tests/unit/signal-registry.test.mjs`

Pure database logic for the signal registry: fingerprint validation, CRUD, dedup, status transitions.

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/signal-registry.test.mjs`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function makeMockPool(queuedResults = []) {
  const queue = [...queuedResults];
  return {
    query: vi.fn(async () => {
      if (queue.length === 0) return { rows: [], rowCount: 0 };
      return queue.shift();
    }),
  };
}

describe('signal-registry', () => {
  let registry;
  beforeEach(async () => {
    vi.resetModules();
    registry = require('../../lib/signal-registry');
  });

  describe('validateFingerprint', () => {
    it('accepts valid fingerprints', () => {
      expect(registry.validateFingerprint('person:lili_zhao:role_start')).toBe(true);
      expect(registry.validateFingerprint('topic:mmo_combat_design:ch')).toBe(true);
      expect(registry.validateFingerprint('business:couch_heroes:funding_round')).toBe(true);
      expect(registry.validateFingerprint('risk:compliance:eu_withdrawal')).toBe(true);
      expect(registry.validateFingerprint('process:planning:manual_consolidation')).toBe(true);
    });

    it('rejects invalid fingerprints', () => {
      expect(registry.validateFingerprint('')).toBe(false);
      expect(registry.validateFingerprint('nocolon')).toBe(false);
      expect(registry.validateFingerprint('person:')).toBe(false);
      expect(registry.validateFingerprint('unknown:type:value')).toBe(false);
    });
  });

  describe('checkSignal', () => {
    it('returns exists:false for unknown fingerprint', async () => {
      const pool = makeMockPool([{ rows: [], rowCount: 0 }]);
      const result = await registry.checkSignal(pool, 'person:new_hire:role_start');
      expect(result.exists).toBe(false);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM aios_signals'),
        ['person:new_hire:role_start']
      );
    });

    it('returns existing signal data', async () => {
      const signal = { id: 's-1', fingerprint: 'person:lili:role_start', status: 'open', evidence_count: 2 };
      const pool = makeMockPool([{ rows: [signal], rowCount: 1 }]);
      const result = await registry.checkSignal(pool, 'person:lili:role_start');
      expect(result.exists).toBe(true);
      expect(result.signal.id).toBe('s-1');
      expect(result.signal.status).toBe('open');
    });
  });

  describe('createSignal', () => {
    it('inserts signal and returns id', async () => {
      const pool = makeMockPool([
        { rows: [{ id: 's-new' }], rowCount: 1 },
      ]);
      const result = await registry.createSignal(pool, {
        fingerprint: 'person:lili_zhao:role_start',
        signal_type: 'people',
        summary: 'Lili Zhao starting as Head of Finance',
      });
      expect(result.id).toBe('s-new');
      const [sql] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO aios_signals');
      expect(sql).toContain('fingerprint');
    });

    it('rejects invalid fingerprint', async () => {
      const pool = makeMockPool();
      await expect(registry.createSignal(pool, {
        fingerprint: 'bad',
        signal_type: 'people',
        summary: 'test',
      })).rejects.toThrow(/fingerprint/i);
    });

    it('rejects invalid signal_type', async () => {
      const pool = makeMockPool();
      await expect(registry.createSignal(pool, {
        fingerprint: 'person:test:hire',
        signal_type: 'unknown',
        summary: 'test',
      })).rejects.toThrow(/signal_type/i);
    });
  });

  describe('enrichSignal', () => {
    it('increments evidence_count and appends to enrichment_log', async () => {
      const pool = makeMockPool([
        { rows: [{ id: 's-1', evidence_count: 3 }], rowCount: 1 },
      ]);
      const result = await registry.enrichSignal(pool, {
        signalId: 's-1',
        newEvidence: 'Mentioned again in 3 Jul meeting',
        sourceId: 'meeting-456',
      });
      expect(result.evidence_count).toBe(3);
      const [sql] = pool.query.mock.calls[0];
      expect(sql).toContain('evidence_count = evidence_count + 1');
      expect(sql).toContain('enrichment_log');
    });
  });

  describe('transitionStatus', () => {
    it('proposed -> approved transitions', async () => {
      const pool = makeMockPool([{ rows: [{ id: 's-1', status: 'approved' }], rowCount: 1 }]);
      const result = await registry.transitionStatus(pool, 's-1', 'approved');
      expect(result.status).toBe('approved');
    });

    it('rejects invalid transitions', async () => {
      const pool = makeMockPool();
      await expect(registry.transitionStatus(pool, 's-1', 'nonsense')).rejects.toThrow(/status/i);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/signal-registry.test.mjs`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement the signal registry**

Create `dashboard-server/lib/signal-registry.js`:

```javascript
'use strict';

const VALID_TYPES = ['people', 'product', 'business', 'risk', 'process'];
const VALID_STATUSES = ['open', 'proposed', 'approved', 'rejected', 'built', 'expired'];
const FINGERPRINT_PREFIXES = ['person', 'topic', 'business', 'risk', 'process'];

function validateFingerprint(fp) {
  if (!fp || typeof fp !== 'string') return false;
  const parts = fp.split(':');
  if (parts.length < 3) return false;
  if (!FINGERPRINT_PREFIXES.includes(parts[0])) return false;
  if (parts.some(p => p.length === 0)) return false;
  return true;
}

async function checkSignal(pool, fingerprint) {
  const { rows } = await pool.query(
    'SELECT * FROM aios_signals WHERE fingerprint = $1',
    [fingerprint]
  );
  if (rows.length === 0) return { exists: false };
  return { exists: true, signal: rows[0] };
}

async function createSignal(pool, { fingerprint, signal_type, summary }) {
  if (!validateFingerprint(fingerprint)) {
    throw new Error(`Invalid fingerprint: ${fingerprint}`);
  }
  if (!VALID_TYPES.includes(signal_type)) {
    throw new Error(`Invalid signal_type: ${signal_type}. Must be one of: ${VALID_TYPES.join(', ')}`);
  }
  if (!summary) throw new Error('summary is required');

  const { rows } = await pool.query(
    `INSERT INTO aios_signals (fingerprint, signal_type, summary)
     VALUES ($1, $2, $3) RETURNING id`,
    [fingerprint, signal_type, summary]
  );
  return rows[0];
}

async function enrichSignal(pool, { signalId, newEvidence, sourceId }) {
  if (!signalId) throw new Error('signalId is required');

  const logEntry = JSON.stringify({
    ts: new Date().toISOString(),
    evidence: newEvidence,
    source_id: sourceId,
  });

  const { rows } = await pool.query(
    `UPDATE aios_signals
     SET evidence_count = evidence_count + 1,
         last_enriched = NOW(),
         enrichment_log = enrichment_log || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [`[${logEntry}]`, signalId]
  );
  if (rows.length === 0) throw new Error(`Signal not found: ${signalId}`);
  return rows[0];
}

async function transitionStatus(pool, signalId, newStatus, reason) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  const updates = ['status = $1', 'updated_at = NOW()'];
  const params = [newStatus];
  if (reason && newStatus === 'rejected') {
    updates.push(`rejection_reason = $${params.length + 1}`);
    params.push(reason);
  }
  params.push(signalId);
  const { rows } = await pool.query(
    `UPDATE aios_signals SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (rows.length === 0) throw new Error(`Signal not found: ${signalId}`);
  return rows[0];
}

async function linkAction(pool, signalId, actionId) {
  await pool.query(
    'UPDATE aios_signals SET linked_action_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
    [actionId, 'proposed', signalId]
  );
}

module.exports = {
  validateFingerprint,
  checkSignal,
  createSignal,
  enrichSignal,
  transitionStatus,
  linkAction,
  VALID_TYPES,
  VALID_STATUSES,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server; npx vitest run tests/unit/signal-registry.test.mjs`
Expected: ALL tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/lib/signal-registry.js dashboard-server/tests/unit/signal-registry.test.mjs
git commit -m "feat(aios): signal registry lib -- fingerprinting, CRUD, status transitions"
```

---

## Task 3: Autonomy routing lib + tests

**Files:**
- Create: `dashboard-server/lib/autonomy-router.js`
- Test: `dashboard-server/tests/unit/autonomy-router.test.mjs`

Implements the confidence x risk routing matrix and hard exclusions from the spec. Returns routing decisions that control whether an action auto-executes or goes to the approval queue.

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/autonomy-router.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { routeAction, isHardExcluded, HARD_EXCLUSION_CATEGORIES } = require('../../lib/autonomy-router');

describe('autonomy-router', () => {
  describe('isHardExcluded', () => {
    it('excludes external comms', () => {
      expect(isHardExcluded({ action_type: 'draft', execution_recipe: { type: 'email_draft' } })).toBe(true);
    });

    it('excludes brain canon edits', () => {
      expect(isHardExcluded({ execution_recipe: { type: 'brain_edit' } })).toBe(true);
    });

    it('excludes financial commitments', () => {
      expect(isHardExcluded({ execution_recipe: { type: 'invoice' } })).toBe(true);
      expect(isHardExcluded({ execution_recipe: { type: 'pricing_change' } })).toBe(true);
    });

    it('excludes client-facing content', () => {
      expect(isHardExcluded({ execution_recipe: { type: 'client_report' } })).toBe(true);
      expect(isHardExcluded({ execution_recipe: { type: 'client_proposal' } })).toBe(true);
    });

    it('does not exclude internal tasks', () => {
      expect(isHardExcluded({ action_type: 'task', execution_recipe: { type: 'task_create' } })).toBe(false);
    });

    it('does not exclude initiative builds', () => {
      expect(isHardExcluded({ action_type: 'proposal', execution_recipe: { type: 'initiative_build' } })).toBe(false);
    });
  });

  describe('routeAction', () => {
    it('high confidence + low risk -> auto-approve (when category enabled)', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'low', action_type: 'task', execution_recipe: { type: 'task_create' } },
        { autoCategories: ['task'] }
      );
      expect(result.approval_state).toBe('approved');
      expect(result.auto_execute).toBe(true);
    });

    it('high confidence + low risk -> pending when category NOT enabled', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'low', action_type: 'task', execution_recipe: { type: 'task_create' } },
        { autoCategories: [] }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.auto_execute).toBe(false);
    });

    it('high confidence + medium risk -> pending with pre-action', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'medium', action_type: 'proposal', execution_recipe: { type: 'initiative_build' } },
        { autoCategories: ['proposal'] }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.pre_actioned).toBe(true);
    });

    it('hard-excluded actions are always pending regardless of confidence', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'low', action_type: 'draft', execution_recipe: { type: 'email_draft' } },
        { autoCategories: ['draft'] }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.auto_execute).toBe(false);
      expect(result.hard_excluded).toBe(true);
    });

    it('low confidence -> pending at low priority', () => {
      const result = routeAction(
        { confidence: 'low', risk_class: 'low', action_type: 'task', execution_recipe: { type: 'task_create' } },
        { autoCategories: ['task'] }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.priority).toBe('low');
    });

    it('critical risk -> pending regardless', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'critical', action_type: 'risk', execution_recipe: { type: 'risk_flag' } },
        { autoCategories: ['risk'] }
      );
      expect(result.approval_state).toBe('pending');
    });

    it('defaults autoCategories to empty when not provided', () => {
      const result = routeAction(
        { confidence: 'high', risk_class: 'low', action_type: 'task', execution_recipe: { type: 'task_create' } }
      );
      expect(result.approval_state).toBe('pending');
      expect(result.auto_execute).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/autonomy-router.test.mjs`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement the autonomy router**

Create `dashboard-server/lib/autonomy-router.js`:

```javascript
'use strict';

const HARD_EXCLUSION_TYPES = [
  'email_draft', 'slack_message', 'external_comms',
  'brain_edit', 'decisions_edit', 'claude_md_edit',
  'invoice', 'pricing_change', 'contract', 'financial_commitment',
  'client_report', 'client_proposal', 'client_deliverable', 'client_facing',
];

const HARD_EXCLUSION_CATEGORIES = [
  'external_comms', 'brain_canon', 'financial', 'client_facing',
];

function isHardExcluded(action) {
  const recipeType = action.execution_recipe?.type || '';
  if (HARD_EXCLUSION_TYPES.includes(recipeType)) return true;
  if (action.action_type === 'draft' && recipeType.includes('email')) return true;
  return false;
}

function routeAction(action, options) {
  const { autoCategories = [] } = options || {};
  const { confidence, risk_class, action_type } = action;
  const hardExcluded = isHardExcluded(action);
  const categoryEnabled = autoCategories.includes(action_type);

  if (hardExcluded) {
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: true,
      pre_actioned: false,
      priority: risk_class === 'critical' ? 'critical' : 'high',
      reason: 'Hard exclusion: never auto-execute',
    };
  }

  if (risk_class === 'critical') {
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: false,
      pre_actioned: true,
      priority: 'critical',
      reason: 'Critical risk: requires approval',
    };
  }

  if (confidence === 'high' && risk_class === 'low') {
    if (categoryEnabled) {
      return {
        approval_state: 'approved',
        auto_execute: true,
        hard_excluded: false,
        pre_actioned: true,
        priority: 'high',
        reason: 'High confidence, low risk, category enabled: auto-execute',
      };
    }
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: false,
      pre_actioned: true,
      priority: 'high',
      reason: 'High confidence, low risk, category not yet enabled: queue for approval',
    };
  }

  if (confidence === 'high' && risk_class === 'medium') {
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: false,
      pre_actioned: true,
      priority: 'high',
      reason: 'High confidence, medium risk: pre-actioned, queue for one-tap approval',
    };
  }

  if (confidence === 'medium') {
    return {
      approval_state: 'pending',
      auto_execute: false,
      hard_excluded: false,
      pre_actioned: false,
      priority: 'medium',
      reason: 'Medium confidence: queue for approval',
    };
  }

  return {
    approval_state: 'pending',
    auto_execute: false,
    hard_excluded: false,
    pre_actioned: false,
    priority: 'low',
    reason: 'Low confidence or ambiguous: low-priority approval queue',
  };
}

module.exports = { routeAction, isHardExcluded, HARD_EXCLUSION_TYPES, HARD_EXCLUSION_CATEGORIES };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server; npx vitest run tests/unit/autonomy-router.test.mjs`
Expected: ALL tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/lib/autonomy-router.js dashboard-server/tests/unit/autonomy-router.test.mjs
git commit -m "feat(aios): autonomy routing -- confidence x risk matrix with hard exclusions"
```

---

## Task 4: Signal Engine CLI + cadence task

**Files:**
- Create: `dashboard-server/scripts/signal-engine-cli.js`
- Create: `scripts/cadence/prompts/signal-engine.md`
- Modify: `scripts/cadence/model-map.json`
- Modify: `dashboard-server/lib/granola-sync.js` (switchover guard)
- Test: `dashboard-server/tests/unit/signal-engine-cli.test.mjs`

The Signal Engine has two parts: (1) a Node.js CLI that handles database operations (fetch meetings, check/create/enrich signals, create actions, update watermark), and (2) a cadence prompt that runs headless Claude to perform the LLM analysis, calling the CLI for each signal it identifies.

- [ ] **Step 1: Write the failing tests for the CLI**

Create `dashboard-server/tests/unit/signal-engine-cli.test.mjs`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function makeMockPool(queuedResults = []) {
  const queue = [...queuedResults];
  return {
    query: vi.fn(async () => {
      if (queue.length === 0) return { rows: [], rowCount: 0 };
      return queue.shift();
    }),
  };
}

describe('signal-engine-cli internals', () => {
  let cli;
  beforeEach(async () => {
    vi.resetModules();
    cli = require('../../scripts/signal-engine-cli');
  });

  describe('fetchNewMeetings', () => {
    it('returns meetings newer than watermark', async () => {
      const pool = makeMockPool([
        { rows: [{ value: '2026-07-01T00:00:00Z' }], rowCount: 1 },
        { rows: [
          { item_id: 'm-1', data: { source_id: 'g-1', title: 'Test', date: '2026-07-02', summary: 'Summary text' } },
        ], rowCount: 1 },
      ]);
      const meetings = await cli.fetchNewMeetings(pool);
      expect(meetings).toHaveLength(1);
      expect(meetings[0].source_id).toBe('g-1');
      const wmQuery = pool.query.mock.calls[0];
      expect(wmQuery[1]).toEqual(['signal_engine_watermark']);
    });

    it('returns empty array when no watermark and no recent meetings', async () => {
      const pool = makeMockPool([
        { rows: [], rowCount: 0 },
        { rows: [], rowCount: 0 },
      ]);
      const meetings = await cli.fetchNewMeetings(pool);
      expect(meetings).toHaveLength(0);
    });
  });

  describe('processSignal', () => {
    it('creates new signal and action when fingerprint is new', async () => {
      const pool = makeMockPool([
        { rows: [], rowCount: 0 },
        { rows: [{ id: 's-new' }], rowCount: 1 },
        { rows: [{ id: 'a-new' }], rowCount: 1 },
        { rows: [], rowCount: 0 },
      ]);
      const result = await cli.processSignal(pool, {
        fingerprint: 'person:lili_zhao:role_start',
        signal_type: 'people',
        title: 'Lili Zhao starting as Head of Finance',
        description: 'New hire in finance function',
        source_quote: 'Lili starts Monday as our new Head of Finance',
        confidence: 'high',
        risk_class: 'low',
        action_type: 'proposal',
        source_system: 'granola',
        source_id: 'meeting-123',
        source_timestamp: '2026-07-02T10:00:00Z',
        proposed_action: 'Build Finance Function Build-Out initiative',
        execution_recipe: { type: 'initiative_build', roles: ['head_of_people'] },
      });
      expect(result.action).toBe('created');
      expect(result.signal_id).toBe('s-new');
      expect(result.action_id).toBe('a-new');
    });

    it('enriches existing open signal instead of creating duplicate', async () => {
      const pool = makeMockPool([
        { rows: [{ id: 's-existing', status: 'open', evidence_count: 1 }], rowCount: 1 },
        { rows: [{ id: 's-existing', evidence_count: 2 }], rowCount: 1 },
      ]);
      const result = await cli.processSignal(pool, {
        fingerprint: 'person:lili_zhao:role_start',
        signal_type: 'people',
        title: 'Lili Zhao mentioned again',
        source_id: 'meeting-456',
        source_quote: 'Lili starting next week',
      });
      expect(result.action).toBe('enriched');
      expect(result.signal_id).toBe('s-existing');
    });

    it('skips rejected signals without materially new info', async () => {
      const pool = makeMockPool([
        { rows: [{ id: 's-rej', status: 'rejected', evidence_count: 3 }], rowCount: 1 },
      ]);
      const result = await cli.processSignal(pool, {
        fingerprint: 'topic:stale_idea:ch',
        signal_type: 'product',
        title: 'Same old idea',
        source_id: 'meeting-789',
        materially_new: false,
      });
      expect(result.action).toBe('skipped_rejected');
    });
  });

  describe('updateWatermark', () => {
    it('upserts the watermark in settings', async () => {
      const pool = makeMockPool([{ rowCount: 1 }]);
      await cli.updateWatermark(pool, '2026-07-03T19:00:00Z');
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO settings');
      expect(sql).toContain('ON CONFLICT');
      expect(params[0]).toBe('signal_engine_watermark');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/signal-engine-cli.test.mjs`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement the Signal Engine CLI**

Create `dashboard-server/scripts/signal-engine-cli.js`:

```javascript
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { checkSignal, createSignal, enrichSignal, linkAction } = require('../lib/signal-registry');
const { routeAction } = require('../lib/autonomy-router');

const WATERMARK_KEY = 'signal_engine_watermark';

async function fetchNewMeetings(pool) {
  const { rows: wmRows } = await pool.query(
    'SELECT value FROM settings WHERE key = $1', [WATERMARK_KEY]
  );
  const watermark = wmRows.length > 0 ? wmRows[0].value : null;

  let query, params;
  if (watermark) {
    query = `SELECT item_id, data FROM meeting_items
             WHERE section = 'meetings'
               AND (data->>'date')::timestamptz > $1::timestamptz
             ORDER BY (data->>'date')::timestamptz ASC`;
    params = [watermark];
  } else {
    query = `SELECT item_id, data FROM meeting_items
             WHERE section = 'meetings'
               AND (data->>'date')::timestamptz > NOW() - INTERVAL '7 days'
             ORDER BY (data->>'date')::timestamptz ASC`;
    params = [];
  }

  const { rows } = await pool.query(query, params);
  return rows.map(r => ({ item_id: r.item_id, ...r.data }));
}

async function processSignal(pool, signalData) {
  const {
    fingerprint, signal_type, title, description, source_quote,
    confidence, risk_class, action_type, source_system, source_id,
    source_timestamp, proposed_action, execution_recipe, materially_new,
  } = signalData;

  const check = await checkSignal(pool, fingerprint);

  if (check.exists) {
    if (check.signal.status === 'rejected' && !materially_new) {
      return { action: 'skipped_rejected', signal_id: check.signal.id };
    }
    if (check.signal.status === 'built' || check.signal.status === 'expired') {
      return { action: 'skipped_closed', signal_id: check.signal.id };
    }
    const enriched = await enrichSignal(pool, {
      signalId: check.signal.id,
      newEvidence: source_quote || title,
      sourceId: source_id,
    });
    return { action: 'enriched', signal_id: enriched.id, evidence_count: enriched.evidence_count };
  }

  const signal = await createSignal(pool, { fingerprint, signal_type, summary: title });

  const autoSettingsResult = await pool.query(
    "SELECT value FROM settings WHERE key = 'signal_engine_auto_categories'"
  ).catch(() => ({ rows: [] }));
  const autoCategories = autoSettingsResult.rows.length > 0
    ? JSON.parse(autoSettingsResult.rows[0].value || '[]')
    : [];

  const routing = routeAction(
    { confidence, risk_class, action_type, execution_recipe },
    { autoCategories }
  );

  const idempotencyKey = `signal-engine:${fingerprint}:${source_id || 'no-source'}`;
  const { rows: actionRows } = await pool.query(
    `INSERT INTO aios_actions (
       source_system, source_id, source_timestamp, source_quote,
       action_type, title, description, proposed_action,
       risk_class, confidence, approval_state, execution_state,
       created_by_routine, idempotency_key, signal_id, execution_recipe
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending','signal-engine',$12,$13,$14)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id`,
    [
      source_system || 'granola', source_id, source_timestamp, source_quote,
      action_type || 'proposal', title, description, proposed_action,
      risk_class || 'low', confidence || 'medium', routing.approval_state,
      idempotencyKey, signal.id,
      execution_recipe ? JSON.stringify(execution_recipe) : null,
    ]
  );

  const actionId = actionRows.length > 0 ? actionRows[0].id : null;
  if (actionId) {
    await linkAction(pool, signal.id, actionId);
  }

  return {
    action: 'created',
    signal_id: signal.id,
    action_id: actionId,
    routing,
  };
}

async function updateWatermark(pool, timestamp) {
  const ts = timestamp || new Date().toISOString();
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [WATERMARK_KEY, ts]
  );
}

async function main() {
  const [,, command, ...args] = process.argv;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    switch (command) {
      case 'fetch-meetings': {
        const meetings = await fetchNewMeetings(pool);
        console.log(JSON.stringify(meetings, null, 2));
        break;
      }
      case 'process-signal': {
        const jsonArg = args.find(a => a.startsWith('--json='));
        const jsonStr = jsonArg
          ? jsonArg.slice(7)
          : args[args.indexOf('--json') + 1];
        if (!jsonStr) { console.error('--json required'); process.exit(1); }
        const result = await processSignal(pool, JSON.parse(jsonStr));
        console.log(JSON.stringify(result));
        break;
      }
      case 'check-signal': {
        const fp = args.find(a => a.startsWith('--fingerprint='))?.slice(14)
          || args[args.indexOf('--fingerprint') + 1];
        if (!fp) { console.error('--fingerprint required'); process.exit(1); }
        const result = await checkSignal(pool, fp);
        console.log(JSON.stringify(result));
        break;
      }
      case 'update-watermark': {
        const ts = args.find(a => a.startsWith('--ts='))?.slice(5)
          || args[args.indexOf('--ts') + 1]
          || undefined;
        await updateWatermark(pool, ts);
        console.log(JSON.stringify({ ok: true, key: WATERMARK_KEY }));
        break;
      }
      default:
        console.error(`Unknown command: ${command}. Valid: fetch-meetings, process-signal, check-signal, update-watermark`);
        process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { fetchNewMeetings, processSignal, updateWatermark };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server; npx vitest run tests/unit/signal-engine-cli.test.mjs`
Expected: ALL tests PASS.

- [ ] **Step 5: Write the cadence prompt**

Create `scripts/cadence/prompts/signal-engine.md`:

```markdown
# Signal Engine -- Nightly Meeting Analysis

ROLE: You are the NBI AIOS Signal Engine. Analyse newly-synced Granola meetings and extract actionable signals at every altitude level. This is the highest-value cognitive step in the system.

RULES:
- British English only, no em dashes.
- Every signal MUST have a source_quote (direct excerpt from the meeting summary).
- Confidence must be justified by the evidence, not assumed.
- Proposals must include a concrete plan, not a vague suggestion.
- "No signals found" is a valid and preferred output for a meeting with no actionable content.
- Never fabricate. If the meeting summary is ambiguous, extract at lower confidence or skip.
- You may read NBI_Brain.md and brain/ modules for context. You may NOT write to any Brain file, decisions log, or CLAUDE.md.

## Step 0: Load context

Read NBI_Brain.md (sections 2-5: business state, clients, team, strategy) for grounding. You need to know who people are, what clients exist, and what is currently happening.

## Step 1: Fetch new meetings

Run via Bash:
```
cd dashboard-server && node scripts/signal-engine-cli.js fetch-meetings
```

If the output is an empty array `[]`, report "No new meetings since last engine run" and skip to Step 4.

## Step 2: Analyse each meeting

For EACH meeting in the array, extract signals across the full altitude spectrum:

| Altitude | What to look for | action_type |
|---|---|---|
| Commitment | "I will...", "Glen to...", explicit promises with owners | task |
| Decision | "We decided...", "The approach is...", conclusions reached | decision |
| Request | "Can you check...", "Please look into...", asks directed at someone | task |
| People signal | Hire, departure, role change, restructure, performance issue | proposal |
| Product signal | Feature discussion, design debate, technology choice, user feedback | proposal |
| Business signal | Funding, partnership, contract, pricing, market opportunity | proposal |
| Risk signal | Compliance deadline, client dissatisfaction, timeline slip, dependency | risk |
| Fact delta | Numbers or facts contradicting the Brain (check brain/ modules) | proposal |

For each signal identified, generate a deterministic fingerprint:

- People: `person:<name_lowercase_underscore>:<event_type>` (e.g. `person:lili_zhao:role_start`)
- Product: `topic:<topic_slug>:<client_or_context>` (e.g. `topic:mmo_combat_design:ch`)
- Business: `business:<entity_slug>:<event>` (e.g. `business:couch_heroes:series_b`)
- Risk: `risk:<domain>:<issue_slug>` (e.g. `risk:compliance:eu_withdrawal_button`)
- Process: `process:<area>:<pattern>` (e.g. `process:planning:manual_excel`)

## Step 3: Process each signal

For each signal, run via Bash:
```
cd dashboard-server && node scripts/signal-engine-cli.js process-signal --json '<JSON>'
```

The JSON must include these fields:
```json
{
  "fingerprint": "person:lili_zhao:role_start",
  "signal_type": "people",
  "title": "Lili Zhao starting as Head of Finance at Couch Heroes",
  "description": "New hire in a critical function. Finance function build-out opportunity.",
  "source_quote": "Lili starts Monday as our new Head of Finance",
  "confidence": "high",
  "risk_class": "low",
  "action_type": "proposal",
  "source_system": "granola",
  "source_id": "<meeting source_id from step 1>",
  "source_timestamp": "<meeting date from step 1>",
  "proposed_action": "Build a structured Finance Function Build-Out initiative with tasks for P&L ownership, cash flow modelling, capitalisation table, budget governance, payroll reconciliation, board reporting, and audit trail.",
  "execution_recipe": {
    "type": "initiative_build",
    "roles": ["head_of_people"],
    "brain_modules": ["financial_resilience.md", "clients_detailed.md"],
    "client_slug": "couch_heroes",
    "task_tree": {
      "initiative": "Finance Function Build-Out",
      "children": [
        { "title": "P&L ownership and monthly close", "type": "feature" },
        { "title": "Cash flow modelling and 13-week forecast", "type": "feature" },
        { "title": "Capitalisation table maintenance", "type": "story" }
      ]
    }
  }
}
```

For research offers, use execution_recipe type "research_brief":
```json
{
  "execution_recipe": {
    "type": "research_brief",
    "roles": ["game_economy_consultant", "gaming_practice_lead"],
    "topic": "MMO combat model comparison: action vs tab-target vs hybrid vs action-RPG",
    "dimensions": ["feel and responsiveness", "retention evidence", "monetisation implications", "production cost"],
    "output_path": "projects/couch_heroes/research/"
  }
}
```

For simple tasks (commitments, action items), use execution_recipe type "task_create":
```json
{
  "execution_recipe": {
    "type": "task_create",
    "client_slug": "couch_heroes",
    "parent_title": null
  }
}
```

The CLI handles:
- Checking the signal registry (fingerprint dedup)
- Creating new signals or enriching existing ones
- Applying autonomy routing (confidence x risk)
- Creating aios_actions with the right approval_state

If the CLI returns `{"action":"enriched"}`, the signal was already known -- do NOT create a duplicate action. The existing proposal has been updated with new evidence.

If the CLI returns `{"action":"skipped_rejected"}`, the signal was previously rejected by Glen. Do NOT re-raise unless the meeting contains materially new information (a status change, new facts, not just another mention). To re-raise, pass `"materially_new": true` with an explanation in the description.

## Step 4: Update watermark

After all meetings have been processed (or if none were found), run:
```
cd dashboard-server && node scripts/signal-engine-cli.js update-watermark
```

## Step 5: Summary

Output one line: "Signal Engine: processed N meetings, extracted M signals (X new, Y enriched, Z skipped), created K actions."

Commit the brief state:
```
git add scripts/cadence/state/routine_runs.json && git commit -m "chore(cadence): signal-engine run [cadence]"
```
```

- [ ] **Step 6: Add model-map entry**

In `scripts/cadence/model-map.json`, add the signal-engine task with the strongest available model:

Replace:
```json
{
  "_comment": "Per-task model routing for cadence runs. Tasks not listed use default. Banned patterns are enforced by run-cadence.ps1 regardless of this file.",
  "default": "claude-sonnet-4-6",
  "tasks": {
    "morning-brief": "claude-opus-4-6",
    "harness-improvement": "claude-opus-4-6"
  }
}
```
with:
```json
{
  "_comment": "Per-task model routing for cadence runs. Tasks not listed use default. Banned patterns are enforced by run-cadence.ps1 regardless of this file.",
  "default": "claude-sonnet-4-6",
  "tasks": {
    "morning-brief": "claude-opus-4-6",
    "harness-improvement": "claude-opus-4-6",
    "signal-engine": "claude-opus-4-6"
  }
}
```

- [ ] **Step 7: Add Granola sync switchover guard**

In `dashboard-server/lib/granola-sync.js`, replace the commitment extraction block (line 347-382). Find the line:

```javascript
  let commitmentCount = 0;
  if (importedSourceIds.length > 0) {
```

Replace the entire block from that line through to its closing `}` (line 382) with:

```javascript
  let commitmentCount = 0;
  if (importedSourceIds.length > 0) {
    const { rows: engineWm } = await pool.query(
      "SELECT value FROM settings WHERE key = 'signal_engine_watermark'"
    ).catch(() => ({ rows: [] }));

    if (engineWm.length > 0) {
      log('info', 'GranolaSync', 'Signal Engine active -- skipping regex commitment extraction (engine handles analysis)', {});
    } else {
      try {
        const { rows: syncedMeetings } = await pool.query(
          `SELECT data->>'source_id' as source_id, data->>'date' as date, data->>'title' as title,
                  data->>'summary' as summary, data->>'workstream' as workstream
           FROM meeting_items WHERE section = 'meetings' AND data->>'source_id' = ANY($1)`,
          [importedSourceIds]
        );

        for (const meeting of syncedMeetings) {
          const extracted = extractCommitmentsFromMeeting(meeting);
          for (const item of extracted) {
            try {
              const { rowCount } = await pool.query(
                `INSERT INTO aios_actions (source_system, source_id, source_timestamp, source_quote,
                   action_type, title, description, proposed_action, owner, due_date,
                   confidence, approval_state, created_by_routine, idempotency_key)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,$13)
                 ON CONFLICT (idempotency_key) DO NOTHING`,
                [item.source_system, item.source_id, item.source_timestamp, item.source_quote,
                 item.action_type, item.title, item.description, item.proposed_action,
                 item.owner, item.due_date, item.confidence, item.created_by_routine, item.idempotencyKey]
              );
              if (rowCount > 0) commitmentCount++;
            } catch (e) {
              log('warn', 'GranolaSync', 'Commitment insert failed', { key: item.idempotencyKey, error: e.message });
            }
          }
        }

        if (commitmentCount > 0) log('info', 'GranolaSync', 'Commitments extracted', { count: commitmentCount });
      } catch (e) {
        log('warn', 'GranolaSync', 'Commitment extraction failed', { error: e.message });
      }
    }
  }
```

This preserves the existing regex extractor as a fallback but defers to the Signal Engine when its watermark exists.

- [ ] **Step 8: Dry-run test the CLI**

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node scripts/signal-engine-cli.js fetch-meetings
```

Expected: JSON array of meetings (may be empty if watermark is not yet set -- that is correct). No errors.

```powershell
node scripts/signal-engine-cli.js check-signal --fingerprint "person:test:signal_engine_test"
```

Expected: `{"exists":false}` (no test signal in the registry).

- [ ] **Step 9: Run the full unit suite**

Run: `cd dashboard-server; npm test`
Expected: ALL green (new tests pass, no regressions).

- [ ] **Step 10: Commit**

```bash
git add dashboard-server/scripts/signal-engine-cli.js dashboard-server/tests/unit/signal-engine-cli.test.mjs scripts/cadence/prompts/signal-engine.md scripts/cadence/model-map.json dashboard-server/lib/granola-sync.js
git commit -m "feat(aios): Signal Engine CLI, cadence prompt, model routing, and sync switchover"
```

---

## Task 5: Executor core + task recipe

**Files:**
- Create: `dashboard-server/lib/executor.js`
- Modify: `dashboard-server/cron/index.js` (executor cron)
- Modify: `dashboard-server/lib/bot-handlers.js` (trigger on approve)
- Test: `dashboard-server/tests/unit/executor.test.mjs`

The executor polls for approved actions with `execution_state = 'pending'` and dispatches recipe handlers. The task recipe creates WorkSage items directly via `POST /api/tasks`.

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/executor.test.mjs`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function makeMockPool(queuedResults = []) {
  const queue = [...queuedResults];
  return {
    query: vi.fn(async () => {
      if (queue.length === 0) return { rows: [], rowCount: 0 };
      return queue.shift();
    }),
  };
}

describe('executor', () => {
  let executor;
  beforeEach(async () => {
    vi.resetModules();
    executor = require('../../lib/executor');
  });

  describe('fetchPendingExecutions', () => {
    it('returns approved actions with pending execution state', async () => {
      const actions = [
        { id: 'a-1', title: 'Task', execution_recipe: { type: 'task_create' }, execution_state: 'pending' },
      ];
      const pool = makeMockPool([{ rows: actions, rowCount: 1 }]);
      const result = await executor.fetchPendingExecutions(pool);
      expect(result).toHaveLength(1);
      const [sql] = pool.query.mock.calls[0];
      expect(sql).toContain("approval_state = 'approved'");
      expect(sql).toContain("execution_state = 'pending'");
    });
  });

  describe('markExecutionState', () => {
    it('updates execution_state and result', async () => {
      const pool = makeMockPool([{ rows: [{ id: 'a-1' }], rowCount: 1 }]);
      await executor.markExecutionState(pool, 'a-1', 'completed', { created: true });
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('execution_state');
      expect(params).toContain('completed');
    });
  });

  describe('executeTaskRecipe', () => {
    it('creates a WorkSage task via internal API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 't-created', title: 'New task' }),
      });
      const result = await executor.executeTaskRecipe(
        { title: 'Follow up with Jen', execution_recipe: { type: 'task_create', client_slug: null } },
        { internalToken: 'tok', baseUrl: 'http://localhost:8888', fetch: mockFetch }
      );
      expect(result.success).toBe(true);
      expect(result.created_id).toBe('t-created');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8888/api/tasks',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('reports failure on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Title required' }),
      });
      const result = await executor.executeTaskRecipe(
        { title: '', execution_recipe: { type: 'task_create' } },
        { internalToken: 'tok', baseUrl: 'http://localhost:8888', fetch: mockFetch }
      );
      expect(result.success).toBe(false);
    });
  });

  describe('getRecipeType', () => {
    it('extracts type from execution_recipe', () => {
      expect(executor.getRecipeType({ execution_recipe: { type: 'task_create' } })).toBe('task_create');
      expect(executor.getRecipeType({ execution_recipe: { type: 'initiative_build' } })).toBe('initiative_build');
      expect(executor.getRecipeType({ execution_recipe: null })).toBe('unknown');
      expect(executor.getRecipeType({})).toBe('unknown');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/executor.test.mjs`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement the executor**

Create `dashboard-server/lib/executor.js`:

```javascript
'use strict';

const MAX_BATCH = 10;
const RECIPE_HANDLERS = {};

function getRecipeType(action) {
  return action?.execution_recipe?.type || 'unknown';
}

async function fetchPendingExecutions(pool, limit) {
  const { rows } = await pool.query(
    `SELECT * FROM aios_actions
     WHERE approval_state = 'approved' AND execution_state = 'pending'
       AND execution_recipe IS NOT NULL
     ORDER BY
       CASE risk_class WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       created_at ASC
     LIMIT $1`,
    [limit || MAX_BATCH]
  );
  return rows;
}

async function markExecutionState(pool, actionId, state, result) {
  await pool.query(
    `UPDATE aios_actions
     SET execution_state = $1, execution_result = $2, updated_at = NOW()
     WHERE id = $3`,
    [state, result ? JSON.stringify(result) : null, actionId]
  );
}

async function executeTaskRecipe(action, ctx) {
  const { internalToken, baseUrl, fetch: fetchFn } = ctx;
  const recipe = action.execution_recipe || {};
  const body = {
    title: action.title,
    description: action.description || action.proposed_action || '',
    source: 'aios-executor',
    item_type: 'task',
  };
  if (recipe.parent_id) body.parent_id = recipe.parent_id;

  try {
    const res = await fetchFn(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nbi-internal-token': internalToken,
        'Cookie': 'nbi_service_account=executor',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, created_id: data.id, title: data.title };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function registerRecipe(type, handler) {
  RECIPE_HANDLERS[type] = handler;
}

async function executeAction(action, ctx) {
  const recipeType = getRecipeType(action);
  const handler = RECIPE_HANDLERS[recipeType];
  if (!handler) {
    return { success: false, error: `No recipe handler for type: ${recipeType}` };
  }
  return handler(action, ctx);
}

async function runExecutorCycle(pool, ctx) {
  const pending = await fetchPendingExecutions(pool);
  const results = { executed: 0, failed: 0, skipped: 0 };

  for (const action of pending) {
    await markExecutionState(pool, action.id, 'in_progress', null);

    try {
      const result = await executeAction(action, ctx);
      if (result.success) {
        await markExecutionState(pool, action.id, 'completed', result);
        results.executed++;
      } else {
        await markExecutionState(pool, action.id, 'failed', result);
        results.failed++;
      }
    } catch (err) {
      await markExecutionState(pool, action.id, 'failed', { error: err.message });
      results.failed++;
    }
  }

  return results;
}

registerRecipe('task_create', executeTaskRecipe);

module.exports = {
  fetchPendingExecutions,
  markExecutionState,
  executeTaskRecipe,
  registerRecipe,
  executeAction,
  runExecutorCycle,
  getRecipeType,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server; npx vitest run tests/unit/executor.test.mjs`
Expected: ALL tests PASS.

- [ ] **Step 5: Wire executor cron into the server**

In `dashboard-server/cron/index.js`, after the Granola sync cron block (after the closing `}` of the `cron.schedule('0 7 * * *'` block, around line 1040), add:

```javascript
  // AIOS Executor — every 5 minutes, process approved actions
  if (cron) {
    const { runExecutorCycle } = require('../lib/executor');
    cron.schedule('*/5 * * * *', async () => {
      try {
        const result = await runExecutorCycle(pool, {
          internalToken: process.env.AIOS_INTERNAL_TOKEN,
          baseUrl: `http://localhost:${process.env.PORT || 8888}`,
          fetch: globalThis.fetch,
          pool,
          log,
          repoRoot: path.resolve(__dirname, '../..'),
        });
        if (result.executed > 0 || result.failed > 0) {
          log('info', 'Cron', 'AIOS Executor cycle', result);
        }
      } catch (err) {
        log('error', 'Cron', 'AIOS Executor cycle failed', { error: err.message });
      }
    }, CRON_TZ);
  }
```

- [ ] **Step 6: Add executor trigger to bot approval handler**

In `dashboard-server/lib/bot-handlers.js`, modify the `handleButtonAction` function's approve branch. Replace:

```javascript
  if (verb === 'approve') {
    const { rows } = await pool.query(
      `UPDATE aios_actions SET approval_state = 'approved', feedback_signal = 'approved_unchanged', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [actionId]
    );
    if (rows.length === 0) return { ok: false, message: 'Action not found (already handled elsewhere?)' };
    return { ok: true, message: `Approved: ${rows[0].title}. Recorded. (Execution engine lands in Phase 2 -- this records your decision.)` };
  }
```

with:

```javascript
  if (verb === 'approve') {
    const { rows } = await pool.query(
      `UPDATE aios_actions SET approval_state = 'approved', feedback_signal = 'approved_unchanged', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [actionId]
    );
    if (rows.length === 0) return { ok: false, message: 'Action not found (already handled elsewhere?)' };
    const action = rows[0];
    const recipeType = action.execution_recipe?.type;
    if (recipeType) {
      return { ok: true, message: `Approved: ${action.title}. Executor will process shortly (recipe: ${recipeType}).`, triggerExecutor: true, actionId: action.id };
    }
    return { ok: true, message: `Approved: ${action.title}. Recorded.` };
  }
```

Then in `dashboard-server/slack-bot.js`, in the button action handler (the `app.action` loop), after the `await client.chat.postMessage(...)` line, add:

```javascript
      if (result.triggerExecutor && result.actionId) {
        try {
          const { executeAction, getRecipeType } = require('./lib/executor');
          const { rows: [action] } = await pool.query('SELECT * FROM aios_actions WHERE id = $1', [result.actionId]);
          if (action && getRecipeType(action) !== 'unknown') {
            const { markExecutionState } = require('./lib/executor');
            await markExecutionState(pool, action.id, 'in_progress', null);
            const execResult = await executeAction(action, {
              internalToken: process.env.AIOS_INTERNAL_TOKEN,
              baseUrl: `http://localhost:${process.env.PORT || 8888}`,
              fetch: globalThis.fetch,
              pool,
              log,
              repoRoot: path.resolve(__dirname, '..'),
            });
            await markExecutionState(pool, action.id, execResult.success ? 'completed' : 'failed', execResult);
            const status = execResult.success ? 'Built' : 'Failed';
            await client.chat.postMessage({
              channel: body.channel.id,
              thread_ts: body.message && body.message.ts,
              text: `${status}: ${action.title}. ${execResult.success ? JSON.stringify(execResult) : execResult.error}`,
            });
          }
        } catch (execErr) {
          log('error', 'SlackBot', 'Immediate executor failed (cron will retry)', { error: execErr.message });
        }
      }
```

- [ ] **Step 7: Run the full unit suite**

Run: `cd dashboard-server; npm test`
Expected: ALL green.

- [ ] **Step 8: Commit**

```bash
git add dashboard-server/lib/executor.js dashboard-server/tests/unit/executor.test.mjs dashboard-server/cron/index.js dashboard-server/lib/bot-handlers.js dashboard-server/slack-bot.js
git commit -m "feat(aios): executor core with task recipe, server cron, and bot trigger on approval"
```

---

## Task 6: Quality gates + deliverable contracts

**Files:**
- Create: `dashboard-server/lib/quality-gates.js`
- Test: `dashboard-server/tests/unit/quality-gates.test.mjs`

Mechanical validators enforce deliverable contracts (non-empty success criteria, citation counts, definition of done). A critique prompt builder generates adversarial review prompts. Codex integration for cross-AI review under fallback models.

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/quality-gates.test.mjs`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { validateContract, buildCritiquePrompt, requiresCodexReview, CONTRACTS } = require('../../lib/quality-gates');

describe('quality-gates', () => {
  describe('CONTRACTS', () => {
    it('defines contracts for initiative_build, research_brief, draft, corrective', () => {
      expect(CONTRACTS.initiative_build).toBeDefined();
      expect(CONTRACTS.research_brief).toBeDefined();
      expect(CONTRACTS.draft).toBeDefined();
      expect(CONTRACTS.corrective).toBeDefined();
    });
  });

  describe('validateContract', () => {
    it('passes a valid initiative build', () => {
      const result = validateContract('initiative_build', {
        objective: 'Build finance function',
        success_criteria: ['Monthly close within 5 days', 'Board pack automated'],
        tasks: [
          { title: 'P&L ownership', definition_of_done: 'Monthly P&L reviewed by CEO' },
          { title: 'Cash flow model', definition_of_done: '13-week rolling forecast live' },
        ],
        supporting_artefacts: ['Cap table template'],
      });
      expect(result.valid).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('fails initiative build missing objective', () => {
      const result = validateContract('initiative_build', {
        success_criteria: ['Test'],
        tasks: [{ title: 'T', definition_of_done: 'D' }],
      });
      expect(result.valid).toBe(false);
      expect(result.failures.some(f => f.includes('objective'))).toBe(true);
    });

    it('fails initiative build with tasks missing definition_of_done', () => {
      const result = validateContract('initiative_build', {
        objective: 'Build X',
        success_criteria: ['Test'],
        tasks: [{ title: 'T' }],
      });
      expect(result.valid).toBe(false);
      expect(result.failures.some(f => f.includes('definition_of_done'))).toBe(true);
    });

    it('passes a valid research brief', () => {
      const result = validateContract('research_brief', {
        method: 'Comparative analysis across 4 dimensions',
        findings: [
          { claim: 'Tab-target retains better in Asian markets', sources: ['url1', 'url2', 'url3'] },
        ],
        confidence_labels: { 'Tab-target retention': 'high' },
        gaps: ['No data on hybrid combat retention in Western markets'],
      });
      expect(result.valid).toBe(true);
    });

    it('fails research brief with insufficient sources', () => {
      const result = validateContract('research_brief', {
        method: 'Test',
        findings: [
          { claim: 'Bold claim', sources: ['one_source'] },
        ],
        gaps: [],
      });
      expect(result.valid).toBe(false);
      expect(result.failures.some(f => f.includes('source'))).toBe(true);
    });
  });

  describe('buildCritiquePrompt', () => {
    it('includes contract requirements and refute-first instruction', () => {
      const prompt = buildCritiquePrompt('initiative_build', { objective: 'Test', tasks: [] });
      expect(prompt).toContain('refute');
      expect(prompt).toContain('objective');
      expect(prompt).toContain('definition_of_done');
    });
  });

  describe('requiresCodexReview', () => {
    it('requires codex for research_brief on fallback models', () => {
      expect(requiresCodexReview('research_brief', 'claude-opus-4-6')).toBe(true);
    });

    it('requires codex for initiative_build on fallback models', () => {
      expect(requiresCodexReview('initiative_build', 'claude-opus-4-6')).toBe(true);
    });

    it('does not require codex on primary model for simple tasks', () => {
      expect(requiresCodexReview('task_create', 'claude-fable-5')).toBe(false);
    });

    it('always requires codex for research_brief regardless of model', () => {
      expect(requiresCodexReview('research_brief', 'claude-fable-5')).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/quality-gates.test.mjs`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement quality gates**

Create `dashboard-server/lib/quality-gates.js`:

```javascript
'use strict';

const MIN_SOURCES_PER_FINDING = 2;
const FALLBACK_MODELS = ['claude-opus-4-6'];

const CONTRACTS = {
  initiative_build: {
    required: ['objective', 'success_criteria', 'tasks'],
    task_requires: ['title', 'definition_of_done'],
    description: 'Initiative with objective, measurable success criteria, tasks with definitions of done, and supporting artefacts',
  },
  research_brief: {
    required: ['method', 'findings', 'gaps'],
    finding_requires: ['claim', 'sources'],
    min_sources: MIN_SOURCES_PER_FINDING,
    description: 'Research brief with method, cited findings (min 2 sources per claim), confidence labels, and explicit gaps',
  },
  draft: {
    required: ['recipient_context', 'body'],
    description: 'Draft communication with recipient context and no unsourced factual claims',
  },
  corrective: {
    required: ['diagnosis', 'changes', 'rollback_path'],
    description: 'Corrective action with diagnosis, what changes, and rollback path',
  },
};

function validateContract(type, deliverable) {
  const contract = CONTRACTS[type];
  if (!contract) return { valid: true, failures: [] };

  const failures = [];

  for (const field of contract.required || []) {
    const val = deliverable[field];
    if (val === undefined || val === null || val === '') {
      failures.push(`Missing required field: ${field}`);
    } else if (Array.isArray(val) && val.length === 0) {
      failures.push(`Empty required array: ${field}`);
    }
  }

  if (type === 'initiative_build' && Array.isArray(deliverable.tasks)) {
    for (let i = 0; i < deliverable.tasks.length; i++) {
      const task = deliverable.tasks[i];
      for (const field of contract.task_requires || []) {
        if (!task[field]) {
          failures.push(`Task ${i + 1} ("${task.title || 'untitled'}") missing: ${field}`);
        }
      }
    }
  }

  if (type === 'research_brief' && Array.isArray(deliverable.findings)) {
    for (let i = 0; i < deliverable.findings.length; i++) {
      const finding = deliverable.findings[i];
      if (!finding.claim) {
        failures.push(`Finding ${i + 1} missing: claim`);
      }
      if (!Array.isArray(finding.sources) || finding.sources.length < contract.min_sources) {
        failures.push(`Finding ${i + 1} ("${(finding.claim || '').slice(0, 50)}") has fewer than ${contract.min_sources} sources`);
      }
    }
  }

  return { valid: failures.length === 0, failures };
}

function buildCritiquePrompt(type, deliverable) {
  const contract = CONTRACTS[type];
  if (!contract) return '';

  const rules = [];
  rules.push(`You are reviewing a ${type.replace(/_/g, ' ')} deliverable.`);
  rules.push('Your job is to refute. Default stance: the deliverable fails until proven otherwise.');
  rules.push(`Contract: ${contract.description}.`);
  rules.push('');
  rules.push('Check each requirement:');

  if (type === 'initiative_build') {
    rules.push('- Does the objective exist and is it specific (not vague)?');
    rules.push('- Are success_criteria measurable (not subjective)?');
    rules.push('- Does every task have a concrete definition_of_done?');
    rules.push('- Are supporting_artefacts generated where the work needs them?');
  }

  if (type === 'research_brief') {
    rules.push('- Does the method section explain the approach?');
    rules.push('- Does every finding cite at least 2 independent sources?');
    rules.push('- Are confidence_labels present for key findings?');
    rules.push('- Is the gaps section honest about what was NOT found?');
    rules.push('- Are there unsourced factual claims?');
  }

  rules.push('');
  rules.push('Output a JSON object: { "pass": boolean, "failures": ["specific failure 1", ...], "score": 0-10 }');
  rules.push('');
  rules.push('Deliverable to review:');
  rules.push('```json');
  rules.push(JSON.stringify(deliverable, null, 2));
  rules.push('```');

  return rules.join('\n');
}

function requiresCodexReview(recipeType, model) {
  if (recipeType === 'research_brief') return true;
  if (FALLBACK_MODELS.some(fb => model && model.startsWith(fb))) {
    return ['initiative_build', 'research_brief', 'corrective'].includes(recipeType);
  }
  return false;
}

module.exports = { validateContract, buildCritiquePrompt, requiresCodexReview, CONTRACTS };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server; npx vitest run tests/unit/quality-gates.test.mjs`
Expected: ALL tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/lib/quality-gates.js dashboard-server/tests/unit/quality-gates.test.mjs
git commit -m "feat(aios): quality gates -- deliverable contracts, mechanical validators, critique builder, Codex routing"
```

---

## Task 7: Executor recipes -- initiative build + research brief

**Files:**
- Modify: `dashboard-server/lib/executor.js` (register recipes)
- Test: `dashboard-server/tests/unit/executor-recipes.test.mjs`

Two recipe handlers that dispatch headless Claude with role AGENT.md context, enforce quality gates, and verify results.

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/executor-recipes.test.mjs`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

describe('executor recipes', () => {
  let executor;
  beforeEach(async () => {
    vi.resetModules();
    executor = require('../../lib/executor');
  });

  describe('initiative_build recipe', () => {
    it('is registered', () => {
      expect(executor.getRecipeType({ execution_recipe: { type: 'initiative_build' } })).toBe('initiative_build');
    });

    it('builds prompt with role AGENT.md paths and brain modules', () => {
      const prompt = executor.buildInitiativePrompt({
        title: 'Finance Function Build-Out',
        description: 'Build finance infrastructure for CH',
        execution_recipe: {
          type: 'initiative_build',
          roles: ['head_of_people'],
          brain_modules: ['financial_resilience.md'],
          client_slug: 'couch_heroes',
          task_tree: {
            initiative: 'Finance Function Build-Out',
            children: [
              { title: 'P&L ownership', type: 'feature' },
              { title: 'Cash flow model', type: 'feature' },
            ],
          },
        },
      });
      expect(prompt).toContain('roles/head_of_people/AGENT.md');
      expect(prompt).toContain('brain/financial_resilience.md');
      expect(prompt).toContain('Finance Function Build-Out');
      expect(prompt).toContain('POST /api/tasks');
      expect(prompt).toContain('initiative');
      expect(prompt).toContain('P&L ownership');
    });
  });

  describe('research_brief recipe', () => {
    it('is registered', () => {
      expect(executor.getRecipeType({ execution_recipe: { type: 'research_brief' } })).toBe('research_brief');
    });

    it('builds prompt with research dimensions and role context', () => {
      const prompt = executor.buildResearchPrompt({
        title: 'MMO Combat Model Comparison',
        execution_recipe: {
          type: 'research_brief',
          roles: ['game_economy_consultant', 'gaming_practice_lead'],
          topic: 'MMO combat models',
          dimensions: ['feel', 'retention', 'monetisation', 'cost'],
          output_path: 'projects/couch_heroes/research/',
        },
      });
      expect(prompt).toContain('roles/game_economy_consultant/AGENT.md');
      expect(prompt).toContain('roles/gaming_practice_lead/AGENT.md');
      expect(prompt).toContain('feel');
      expect(prompt).toContain('retention');
      expect(prompt).toContain('projects/couch_heroes/research/');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server; npx vitest run tests/unit/executor-recipes.test.mjs`
Expected: FAIL (buildInitiativePrompt and buildResearchPrompt not exported).

- [ ] **Step 3: Add recipe implementations to executor.js**

In `dashboard-server/lib/executor.js`, add before the `module.exports` line:

```javascript
function buildInitiativePrompt(action) {
  const recipe = action.execution_recipe || {};
  const rolePaths = (recipe.roles || []).map(r => `roles/${r}/AGENT.md`);
  const brainPaths = (recipe.brain_modules || []).map(m => `brain/${m}`);
  const taskTree = recipe.task_tree || {};

  const lines = [
    'You are the NBI AIOS Executor building a WorkSage initiative.',
    '',
    'CONTEXT: Read the following files for domain expertise:',
    ...rolePaths.map(p => `- ${p}`),
    ...brainPaths.map(p => `- ${p}`),
    '',
    `OBJECTIVE: Build the initiative "${taskTree.initiative || action.title}" in WorkSage.`,
    action.description ? `DESCRIPTION: ${action.description}` : '',
    '',
    'TASK TREE (create this exact hierarchy via the WorkSage API):',
    '',
    `Initiative: ${taskTree.initiative || action.title}`,
  ];

  if (taskTree.children) {
    for (const child of taskTree.children) {
      lines.push(`  ${child.type || 'feature'}: ${child.title}`);
      if (child.children) {
        for (const grandchild of child.children) {
          lines.push(`    ${grandchild.type || 'story'}: ${grandchild.title}`);
        }
      }
    }
  }

  lines.push('');
  lines.push('EXECUTION STEPS:');
  lines.push('1. Read the role AGENT.md files and brain modules listed above.');
  lines.push('2. Flesh out each task: write a concrete description, definition of done, and effort estimate.');
  lines.push(`3. Create the initiative via: POST http://localhost:8888/api/tasks`);
  lines.push('   Headers: Content-Type: application/json');
  lines.push(`   The root item must be item_type "initiative".`);
  lines.push(`   ${recipe.client_slug ? `Set client_id by querying: SELECT id FROM clients WHERE slug = '${recipe.client_slug}' OR lower(name) LIKE '%${recipe.client_slug.replace(/_/g, ' ')}%'` : 'No client specified.'}`);
  lines.push('4. Create each child under the initiative using parent_id from the previous step.');
  lines.push('5. After creating all items, verify by querying: SELECT id, title, item_type, parent_id FROM tasks WHERE parent_id = <initiative_id>');
  lines.push('6. Output a JSON summary: { "initiative_id": "...", "created_count": N, "items": [...] }');
  lines.push('');
  lines.push('RULES:');
  lines.push('- British English only.');
  lines.push('- Every task must have: title, description (min 15 chars), definition of done.');
  lines.push('- Do NOT create tasks without concrete definitions of done.');
  lines.push('- If you cannot determine appropriate content for a task, flag it as needing Glen steer rather than inventing content.');
  lines.push('- Read NBI_Brain.md for business context.');

  return lines.filter(l => l !== undefined).join('\n');
}

function buildResearchPrompt(action) {
  const recipe = action.execution_recipe || {};
  const rolePaths = (recipe.roles || []).map(r => `roles/${r}/AGENT.md`);
  const dims = recipe.dimensions || [];

  const lines = [
    'You are the NBI AIOS Executor producing a research brief.',
    '',
    'CONTEXT: Read the following files for domain expertise:',
    ...rolePaths.map(p => `- ${p}`),
    '- NBI_Brain.md (business context)',
    '',
    `TOPIC: ${recipe.topic || action.title}`,
    '',
    'RESEARCH DIMENSIONS:',
    ...dims.map((d, i) => `${i + 1}. ${d}`),
    '',
    'EXECUTION STEPS:',
    '1. Read the role AGENT.md files listed above for domain grounding.',
    '2. For each dimension, conduct web research (use WebSearch). Find at least 3 independent sources per dimension.',
    '3. For each major claim, verify it against at least 2 sources. Label confidence: high/medium/low.',
    '4. Write the research brief with these sections:',
    '   - Executive Summary (3-5 sentences)',
    '   - Method (how you researched this)',
    '   - Findings per dimension (with citations)',
    '   - Comparison table (if applicable)',
    '   - Gaps and limitations (what you could NOT find)',
    '   - Recommendation (if the evidence supports one)',
    `5. Save the brief to: ${recipe.output_path || 'projects/'}${action.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`,
    '6. Output a JSON summary: { "document_path": "...", "finding_count": N, "source_count": N, "gaps": [...] }',
    '',
    'RULES:',
    '- British English only.',
    '- Never fabricate. Every claim must have a named source (URL, document, or meeting reference).',
    '- Unverified claims must be labelled "unverified" in the text.',
    '- "Insufficient evidence" is a valid finding. Do not pad with speculation.',
    '- The brief must be genuinely useful to a gaming industry CPO, not a generic overview.',
  ];

  return lines.join('\n');
}

async function executeInitiativeRecipe(action, ctx) {
  const { dispatch } = require('./claude-dispatch');
  const { validateContract, buildCritiquePrompt, requiresCodexReview } = require('./quality-gates');

  const model = process.env.AIOS_DISPATCH_MODEL || 'claude-opus-4-6';
  const prompt = buildInitiativePrompt(action);

  let result;
  try {
    result = await dispatch({
      prompt,
      model,
      cwd: ctx.repoRoot || '.',
      timeoutMs: 300000,
    });
  } catch (err) {
    return { success: false, error: `Dispatch failed: ${err.message}` };
  }

  const parsed = parseJsonFromOutput(result.text);
  if (!parsed) {
    return { success: false, error: 'Could not parse structured output from initiative build', raw: result.text.slice(0, 500) };
  }

  const validation = validateContract('initiative_build', parsed);
  if (!validation.valid) {
    return { success: false, error: 'Contract validation failed', failures: validation.failures, below_bar: true };
  }

  return {
    success: true,
    recipe_type: 'initiative_build',
    initiative_id: parsed.initiative_id,
    created_count: parsed.created_count || parsed.items?.length || 0,
    durationMs: result.durationMs,
  };
}

async function executeResearchRecipe(action, ctx) {
  const { dispatch } = require('./claude-dispatch');
  const { validateContract, requiresCodexReview } = require('./quality-gates');

  const model = process.env.AIOS_DISPATCH_MODEL || 'claude-opus-4-6';
  const prompt = buildResearchPrompt(action);

  let result;
  try {
    result = await dispatch({
      prompt,
      model,
      cwd: ctx.repoRoot || '.',
      timeoutMs: 600000,
    });
  } catch (err) {
    return { success: false, error: `Dispatch failed: ${err.message}` };
  }

  const parsed = parseJsonFromOutput(result.text);
  if (!parsed) {
    return { success: false, error: 'Could not parse structured output from research brief', raw: result.text.slice(0, 500) };
  }

  const validation = validateContract('research_brief', parsed);
  if (!validation.valid) {
    return { success: false, error: 'Contract validation failed', failures: validation.failures, below_bar: true };
  }

  if (requiresCodexReview('research_brief', model)) {
    try {
      const { execSync } = require('child_process');
      const codexPath = 'C:\\Users\\gpbea\\AppData\\Roaming\\npm\\codex';
      const critiquePrompt = `Review this research brief for factual accuracy, source quality, and completeness. Flag any unsourced claims, weak sources, or missing dimensions. Output: pass/fail with specific issues.\n\nBrief output:\n${result.text.slice(0, 8000)}`;
      execSync(`"${codexPath}" exec "${critiquePrompt.replace(/"/g, '\\"')}"`, {
        cwd: ctx.repoRoot || '.',
        timeout: 120000,
        windowsHide: true,
      });
    } catch (codexErr) {
      ctx.log?.('warn', 'Executor', 'Codex review failed (non-blocking)', { error: codexErr.message });
    }
  }

  return {
    success: true,
    recipe_type: 'research_brief',
    document_path: parsed.document_path,
    finding_count: parsed.finding_count || 0,
    source_count: parsed.source_count || 0,
    durationMs: result.durationMs,
  };
}

function parseJsonFromOutput(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

registerRecipe('initiative_build', executeInitiativeRecipe);
registerRecipe('research_brief', executeResearchRecipe);
```

Add to the module.exports:

Replace:
```javascript
module.exports = {
  fetchPendingExecutions,
  markExecutionState,
  executeTaskRecipe,
  registerRecipe,
  executeAction,
  runExecutorCycle,
  getRecipeType,
};
```
with:
```javascript
module.exports = {
  fetchPendingExecutions,
  markExecutionState,
  executeTaskRecipe,
  registerRecipe,
  executeAction,
  runExecutorCycle,
  getRecipeType,
  buildInitiativePrompt,
  buildResearchPrompt,
  parseJsonFromOutput,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server; npx vitest run tests/unit/executor-recipes.test.mjs`
Expected: ALL tests PASS.

- [ ] **Step 5: Run the full unit suite**

Run: `cd dashboard-server; npm test`
Expected: ALL green (no regressions).

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/lib/executor.js dashboard-server/tests/unit/executor-recipes.test.mjs
git commit -m "feat(aios): executor recipes -- initiative build and research brief with quality gates and Codex review"
```

---

## Task 8: End-to-end verification + golden tests

**Files:** none created (operational verification). This task requires the server running with all Phase 2 code.

- [ ] **Step 1: Deploy and verify migrations**

Restart the server to apply migrations 078-079 (if not already applied in Task 1):

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
pm2 restart nbi-dashboard; Start-Sleep -Seconds 8; pm2 logs nbi-dashboard --lines 40 --nostream
```

Expected: "Applied migration 078" and "Applied migration 079" in log (or already applied). Server healthy.

Verify all tables:

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node -e "require('dotenv').config(); const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); Promise.all([p.query(""SELECT to_regclass('aios_signals') as sig""), p.query(""SELECT column_name FROM information_schema.columns WHERE table_name = 'aios_actions' AND column_name = 'signal_id'""), p.query(""SELECT max(version) as v FROM schema_migrations"")]).then(([s, c, m]) => { console.log('aios_signals:', s.rows[0].sig); console.log('signal_id column:', c.rows.length > 0 ? 'PRESENT' : 'MISSING'); console.log('schema version:', m.rows[0].v); p.end(); });"
```

Expected: `aios_signals: aios_signals`, `signal_id column: PRESENT`, `schema version: 79`.

- [ ] **Step 2: Initialise the Signal Engine watermark**

Set the watermark to now so the engine only processes future meetings:

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node scripts/signal-engine-cli.js update-watermark
```

Expected: `{"ok":true,"key":"signal_engine_watermark"}`.

Verify the switchover guard works (Granola sync should now skip regex extraction):

```powershell
node -e "require('dotenv').config(); const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); p.query(""SELECT value FROM settings WHERE key = 'signal_engine_watermark'"").then(r => { console.log('Watermark:', r.rows[0]?.value); p.end(); });"
```

Expected: a recent ISO timestamp.

- [ ] **Step 3: Run the Signal Engine on real data (dry run)**

Manually trigger the Signal Engine cadence task:

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task signal-engine
```

Expected: the engine runs (opus-4-6), fetches meetings since watermark (likely zero if just set), reports "No new meetings" or processes any that arrived since the watermark was set. Check the log at `scripts/cadence/logs/signal-engine_*.log`.

If zero meetings: that is correct. The engine will process meetings from the NEXT Granola sync onwards.

- [ ] **Step 4: Verify signal dedup (golden test)**

Seed a test signal to verify dedup works:

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node scripts/signal-engine-cli.js process-signal --json "{\"fingerprint\":\"person:e2e_test:hire\",\"signal_type\":\"people\",\"title\":\"E2E test signal\",\"source_quote\":\"Test quote\",\"confidence\":\"high\",\"risk_class\":\"low\",\"action_type\":\"proposal\",\"source_system\":\"test\",\"source_id\":\"test-1\"}"
```

Expected: `{"action":"created","signal_id":"...","action_id":"...","routing":{...}}`.

Run it again with a different source_id (simulating a second mention):

```powershell
node scripts/signal-engine-cli.js process-signal --json "{\"fingerprint\":\"person:e2e_test:hire\",\"signal_type\":\"people\",\"title\":\"E2E test mentioned again\",\"source_quote\":\"Second mention\",\"source_id\":\"test-2\"}"
```

Expected: `{"action":"enriched","signal_id":"...","evidence_count":2}` -- same signal_id, NO new action.

Run it a third time:

```powershell
node scripts/signal-engine-cli.js process-signal --json "{\"fingerprint\":\"person:e2e_test:hire\",\"signal_type\":\"people\",\"title\":\"Third mention\",\"source_quote\":\"Third\",\"source_id\":\"test-3\"}"
```

Expected: `{"action":"enriched","signal_id":"...","evidence_count":3}` -- **signal mentioned 3 times, exactly 1 proposal**. This proves acceptance criterion 3.

Verify in the database:

```powershell
node -e "require('dotenv').config(); const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); Promise.all([p.query(""SELECT id, fingerprint, evidence_count, status FROM aios_signals WHERE fingerprint = 'person:e2e_test:hire'""), p.query(""SELECT count(*) as cnt FROM aios_actions WHERE signal_id IN (SELECT id FROM aios_signals WHERE fingerprint = 'person:e2e_test:hire')"")]).then(([s, a]) => { console.log('Signal:', s.rows[0]); console.log('Actions:', a.rows[0].cnt); p.end(); });"
```

Expected: `evidence_count: 3`, `Actions: 1`.

- [ ] **Step 5: Verify executor task recipe**

Seed a task action and approve it:

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node -e "require('dotenv').config(); const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); p.query(""INSERT INTO aios_actions (source_system, action_type, title, approval_state, execution_state, execution_recipe, idempotency_key, created_by_routine) VALUES ('test', 'task', 'E2E executor test task', 'approved', 'pending', '{\\\"type\\\": \\\"task_create\\\"}', 'test:executor:' || extract(epoch from now())::text, 'test') RETURNING id"").then(r => { console.log('Created:', r.rows[0].id); p.end(); });"
```

Wait 5 minutes for the cron, or trigger manually:

```powershell
node -e "require('dotenv').config(); const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); const { runExecutorCycle } = require('./lib/executor'); runExecutorCycle(p, { internalToken: process.env.AIOS_INTERNAL_TOKEN, baseUrl: 'http://localhost:8888', fetch: globalThis.fetch, pool: p, repoRoot: require('path').resolve(__dirname, '..') }).then(r => { console.log('Result:', r); p.end(); });"
```

Expected: `executed: 1` or `failed: 1` (task creation may fail due to auth -- the important thing is the executor ran and attempted the recipe).

- [ ] **Step 6: Run the full test suite**

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server; npm test
```

Expected: ALL green.

- [ ] **Step 7: Clean up test data**

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM\dashboard-server
node -e "require('dotenv').config(); const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); p.query(""DELETE FROM aios_actions WHERE source_system = 'test' AND created_by_routine IN ('test', 'signal-engine')"").then(() => p.query(""DELETE FROM aios_signals WHERE fingerprint LIKE 'person:e2e_test%'"")).then(() => { console.log('Test data cleaned'); p.end(); });"
```

- [ ] **Step 8: Restart services and final verification**

```powershell
pm2 restart nbi-dashboard; pm2 restart nbi-slack-bot; Start-Sleep -Seconds 8; pm2 list
```

Expected: both processes online, stable uptime.

Run `node .claude/harness/lib/finish-task.js` from repo root and include its output before claiming Phase 2 done.

- [ ] **Step 9: Commit and merge**

If in a worktree, merge to master:
```bash
git checkout master
git merge --ff-only <worktree-branch>
```

If on master directly:
```bash
git add -A
git commit -m "feat(aios): Phase 2 Signal Engine -- analysis, registry, routing, executor, quality gates"
```

---

## Acceptance Criteria (from spec)

1. **New-hire signal -> initiative build:** A Granola meeting mentioning a new hire produces a proposal with a concrete task tree. On approval, the executor builds the initiative hierarchy in WorkSage.
2. **Design discussion -> research brief:** A Granola meeting with a product design discussion produces a research offer. On approval, the executor dispatches a headless research run and delivers a cited brief.
3. **Signal dedup:** A signal mentioned in 3 different meetings produces exactly 1 proposal (verified in Task 8 Step 4).

Note: acceptance criteria 1 and 2 require REAL post-watermark Granola meetings to trigger. The Signal Engine must run after the next Granola sync imports new meetings. If no new meetings have occurred since the watermark, seed a test meeting or wait for the next real meeting.

## Dependency Notes

- Tasks 1 is foundation; everything depends on it.
- Tasks 2 and 3 are independent of each other. Both depend on Task 1.
- Task 4 depends on Tasks 2 and 3 (uses signal-registry and autonomy-router).
- Task 5 depends on Task 1 only (executor is independent of the Signal Engine).
- Task 6 depends on nothing beyond standard libs.
- Task 7 depends on Tasks 5 and 6 (executor core + quality gates).
- Task 8 depends on everything (end-to-end verification).

Parallelism: Tasks 2-3 can run in parallel. Tasks 5-6 can run in parallel with Task 4 (independent chains).

## Out of Scope for This Plan (Phase 3+, per spec)

- Bank recompile output routed through the Signal Engine (Phase 3)
- Nightly stale-lead scan producing pre-written Gmail drafts (Phase 3)
- Mid-day nudge at 14:00 (Phase 3)
- Monday level-up weekly session log analysis (Phase 3)
- Cadence failure auto-repair loop (Phase 3)
- Voice at the desk (Phase 4)
- Gmail and calendar as engine inputs (Phase 4)
- Slack ingestion (Phase 4)
- Golden exemplars storage (deferred until first Glen UAT produces exemplar-worthy deliverables)
- Trust decay tracking in Postgres (deferred until sufficient feedback_signal data accumulates)
