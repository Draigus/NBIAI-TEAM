# Arthrea Coordination Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Node CLI that enables Claude and Codex to coordinate on the Arthrea worldbuilding ecosystem through a shared append-only event ledger with schema validation, conflict detection, and advisory AI-to-AI collaboration.

**Architecture:** Two git repos - `Arthrea_Coordination` (shared state: JSONL ledger, projections, registry, schemas) and `Arthrea_Coordination_Bridge` (TypeScript CLI implementation). Single authoritative `events.jsonl` ledger with rebuildable projection files. Global file lock for write safety. ULID-based event IDs.

**Tech Stack:** TypeScript, Node.js 22, commander (CLI), ajv + ajv-formats (schema validation), yaml (registry), ulid (event IDs, monotonicFactory), dotenv (env vars), vitest (tests)

**Spec:** `docs/superpowers/specs/2026-06-06-arthrea-coordination-bridge-design.md`

---

### Task 1: Bridge Project Scaffold

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\package.json`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\tsconfig.json`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\.env.example`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\.gitignore`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\bin\arthrea-bridge`

- [ ] **Step 1: Create the bridge repo directory**

```bash
mkdir "D:\OneDrive\Arthrea_Coordination_Bridge"
cd "D:\OneDrive\Arthrea_Coordination_Bridge"
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "arthrea-coordination-bridge",
  "version": "1.0.0",
  "description": "Claude-Codex coordination bridge for the Arthrea worldbuilding ecosystem",
  "type": "module",
  "main": "dist/cli.js",
  "bin": {
    "arthrea-bridge": "bin/arthrea-bridge"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1",
    "commander": "^13.1.0",
    "dotenv": "^16.4.7",
    "ulid": "^2.3.0",
    "yaml": "^2.7.1"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.1"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 4: Create .env.example**

```
ARTHREA_COORDINATION_ROOT=D:\OneDrive\Arthrea_Coordination
ARTHREA_AGENT=claude
# No API keys. Advisory commands use codex exec (ChatGPT login).
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.env
*.lock
```

- [ ] **Step 6: Create bin/arthrea-bridge**

```bash
#!/usr/bin/env node
import('../dist/cli.js');
```

- [ ] **Step 7: Install dependencies**

```bash
cd "D:\OneDrive\Arthrea_Coordination_Bridge"
npm install
```

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json .env.example .gitignore bin/arthrea-bridge package-lock.json
git commit -m "chore: scaffold bridge project with TypeScript + CLI dependencies"
```

---

### Task 2: Core Types

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\types.ts`

- [ ] **Step 1: Create types.ts with all core interfaces**

```typescript
export interface BridgeEvent {
  event_id: string;
  schema_version: number;
  event_type: string;
  timestamp: string;
  agent: string;
  summary: string;
  payload: Record<string, unknown>;
  related_events?: string[];
  supersedes?: string | null;
  metadata?: EventMetadata;
}

export interface EventMetadata {
  bridge_version: string;
  dry_run: boolean;
}

export interface WriteResponse {
  event_id: string;
  event_type: string;
  written_files: string[];
  warnings: string[];
  conflicts: string[];
  git_commit: string | null;
  state_snapshot: Record<string, unknown>;
}

export interface ErrorResponse {
  error: true;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LockContent {
  agent: string;
  pid: number;
  machine: string;
  command: string;
  created_at: string;
  expires_at: string;
  token: string;
}

export interface ProjectionMeta {
  last_event_id: string;
  event_count: number;
  ledger_size_bytes: number;
  rebuilt_at: string;
}

export interface BridgeConfig {
  coordination_root: string;
  agent: string;
  lock_ttl_ms: number;
  lock_retries: number;
  lock_retry_delay_ms: number;
}
// auto_commit removed from v1 - not implemented, would be misleading
// openai_api_key_env removed - v1 uses Codex CLI (ChatGPT login), no API keys

export interface AgentEntry {
  display_name: string;
  capabilities: string[];
  default_model?: string;
  advisory_defaults?: {
    provider: string;
    target_model?: string;
    note?: string;
  };
  is_human?: boolean;
  note?: string;
}

export interface ProjectEntry {
  path: string;
  role: string;
  primary_agent?: string;
  safety: string;
}

export interface Registry {
  agents: Record<string, AgentEntry>;
  projects: Record<string, ProjectEntry>;
  sources: Record<string, unknown>;
}

export interface DoctorCheck {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  details?: Record<string, unknown>;
}

export const BRIDGE_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;

export const EVENT_TYPES = [
  'handoff.published',
  'review.requested',
  'review.published',
  'task.created',
  'task.claimed',
  'task.updated',
  'task.released',
  'decision.recorded',
  'question.asked',
  'question.resolved',
  'patch.proposed',
  'peer.critique.completed',
  'peer.critique.failed',
  'peer.review.completed',
  'peer.review.failed',
  'peer.brainstorm.completed',
  'peer.brainstorm.failed',
  'event.corrected',
  'snapshot.created',
  'projections.rebuilt',
] as const;

export type EventType = typeof EVENT_TYPES[number];

export const PROJECTION_FILES: Record<string, string[]> = {
  'tasks.jsonl': ['task.created', 'task.claimed', 'task.updated', 'task.released'],
  'decisions.jsonl': ['decision.recorded'],
  'open_questions.jsonl': ['question.asked', 'question.resolved'],
  'reviews.jsonl': ['review.requested', 'review.published'],
  'handoffs.jsonl': ['handoff.published'],
  'patches.jsonl': ['patch.proposed'],
};

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CONFLICT_TASK_ALREADY_CLAIMED: 'CONFLICT_TASK_ALREADY_CLAIMED',
  CONFLICT_QUESTION_ALREADY_RESOLVED: 'CONFLICT_QUESTION_ALREADY_RESOLVED',
  LOCK_TIMEOUT: 'LOCK_TIMEOUT',
  STALE_LOCK_RECOVERED: 'STALE_LOCK_RECOVERED',
  ONEDRIVE_CONFLICT_DETECTED: 'ONEDRIVE_CONFLICT_DETECTED',
  COORDINATION_ROOT_NOT_FOUND: 'COORDINATION_ROOT_NOT_FOUND',
  SCHEMA_NOT_FOUND: 'SCHEMA_NOT_FOUND',
  ADVISORY_CALL_FAILED: 'ADVISORY_CALL_FAILED',
  ADVISORY_NOT_AVAILABLE: 'ADVISORY_NOT_AVAILABLE',
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  AGENT_NOT_REGISTERED: 'AGENT_NOT_REGISTERED',
  GLEN_AGENT_REQUIRES_HUMAN_FLAG: 'GLEN_AGENT_REQUIRES_HUMAN_FLAG',
  PROVIDER_MODEL_MISMATCH: 'PROVIDER_MODEL_MISMATCH',
  PROJECTIONS_STALE: 'PROJECTIONS_STALE',
  CONFLICT_TASK_NOT_CLAIMED: 'CONFLICT_TASK_NOT_CLAIMED',
  CONFLICT_TASK_OWNED_BY_OTHER: 'CONFLICT_TASK_OWNED_BY_OTHER',
} as const;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add core TypeScript types for events, config, registry, and errors"
```

---

### Task 3: Event ID Generation

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\ledger\event-id.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\ledger\event-id.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { generateEventId } from '../../src/ledger/event-id.js';

describe('generateEventId', () => {
  it('returns a string starting with evt_', () => {
    const id = generateEventId();
    expect(id).toMatch(/^evt_/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateEventId()));
    expect(ids.size).toBe(100);
  });

  it('generates sortable IDs (later call > earlier call)', () => {
    const id1 = generateEventId();
    const id2 = generateEventId();
    expect(id2 > id1).toBe(true);
  });

  it('has consistent length', () => {
    const id = generateEventId();
    expect(id.length).toBe(4 + 26); // evt_ + 26-char ULID
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ledger/event-id.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Implement event-id.ts**

```typescript
import { monotonicFactory } from 'ulid';

const ulid = monotonicFactory();

export function generateEventId(): string {
  return `evt_${ulid()}`;
}
```

Uses `monotonicFactory()` to guarantee monotonically increasing IDs even when called in the same millisecond. This preserves sort order which is essential for the append-only ledger.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ledger/event-id.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/ledger/event-id.ts test/ledger/event-id.test.ts
git commit -m "feat: ULID-based event ID generation with evt_ prefix"
```

---

### Task 4: Config Resolution

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\config.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\config.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveConfig } from '../src/config.js';
import path from 'node:path';

describe('resolveConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses CLI flags as highest priority', () => {
    const config = resolveConfig({
      coordinationRoot: 'D:\\test\\root',
      agent: 'codex',
    });
    expect(config.coordination_root).toBe('D:\\test\\root');
    expect(config.agent).toBe('codex');
  });

  it('falls back to environment variables', () => {
    process.env.ARTHREA_COORDINATION_ROOT = 'D:\\env\\root';
    process.env.ARTHREA_AGENT = 'claude';
    const config = resolveConfig({});
    expect(config.coordination_root).toBe('D:\\env\\root');
    expect(config.agent).toBe('claude');
  });

  it('uses built-in defaults as lowest priority', () => {
    delete process.env.ARTHREA_COORDINATION_ROOT;
    delete process.env.ARTHREA_AGENT;
    const config = resolveConfig({});
    expect(config.lock_ttl_ms).toBe(10000);
    expect(config.lock_retries).toBe(3);
    expect(config.lock_retry_delay_ms).toBe(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/config.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement config.ts**

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { parse as parseYaml } from 'yaml';
import type { BridgeConfig } from './types.js';

const DEFAULTS: BridgeConfig = {
  coordination_root: join('D:', 'OneDrive', 'Arthrea_Coordination'),
  agent: '',
  lock_ttl_ms: 10000,
  lock_retries: 3,
  lock_retry_delay_ms: 1000,
};

interface CLIFlags {
  coordinationRoot?: string;
  agent?: string;
  autoCommit?: boolean;
  humanInvoked?: boolean;
}

function loadYamlConfig(filePath: string): Partial<BridgeConfig> {
  if (!existsSync(filePath)) return {};
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return parseYaml(raw) as Partial<BridgeConfig>;
  } catch {
    return {};
  }
}

function findBridgeRcUpwards(startDir: string): Partial<BridgeConfig> {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, '.bridgerc.yaml');
    if (existsSync(candidate)) return loadYamlConfig(candidate);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {};
}

export function resolveConfig(flags: CLIFlags): BridgeConfig {
  const envConfig: Partial<BridgeConfig> = {};
  if (process.env.ARTHREA_COORDINATION_ROOT) {
    envConfig.coordination_root = process.env.ARTHREA_COORDINATION_ROOT;
  }
  if (process.env.ARTHREA_AGENT) {
    envConfig.agent = process.env.ARTHREA_AGENT;
  }

  const userConfig = loadYamlConfig(join(homedir(), '.arthrea-bridge.yaml'));
  const cwdConfig = findBridgeRcUpwards(process.cwd());

  // Resolve root first using levels 1-4 + default
  const resolvedRoot =
    flags.coordinationRoot ??
    envConfig.coordination_root ??
    userConfig.coordination_root ??
    cwdConfig.coordination_root ??
    DEFAULTS.coordination_root;

  // Level 5: coordination-root .bridgerc.yaml (after root known)
  const coordConfig = loadYamlConfig(join(resolvedRoot, '.bridgerc.yaml'));

  // Merge: CLI > env > user > cwd > coordination > defaults
  return {
    coordination_root: resolvedRoot,
    agent:
      flags.agent ??
      envConfig.agent ??
      userConfig.agent ??
      cwdConfig.agent ??
      coordConfig.agent ??
      DEFAULTS.agent,
    lock_ttl_ms:
      userConfig.lock_ttl_ms ??
      cwdConfig.lock_ttl_ms ??
      coordConfig.lock_ttl_ms ??
      DEFAULTS.lock_ttl_ms,
    lock_retries:
      userConfig.lock_retries ??
      cwdConfig.lock_retries ??
      coordConfig.lock_retries ??
      DEFAULTS.lock_retries,
    lock_retry_delay_ms:
      userConfig.lock_retry_delay_ms ??
      cwdConfig.lock_retry_delay_ms ??
      coordConfig.lock_retry_delay_ms ??
      DEFAULTS.lock_retry_delay_ms,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/config.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.ts test/config.test.ts
git commit -m "feat: 6-level config resolution (CLI > env > user > cwd > coordination > defaults)"
```

---

### Task 5: Global Write Lock

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\locks\file-lock.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\locks\file-lock.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { acquireLock, releaseLock } from '../../src/locks/file-lock.js';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('file-lock', () => {
  let lockDir: string;

  beforeEach(() => {
    lockDir = mkdtempSync(join(tmpdir(), 'bridge-lock-'));
    mkdirSync(join(lockDir, '.locks'), { recursive: true });
  });

  afterEach(() => {
    rmSync(lockDir, { recursive: true, force: true });
  });

  it('acquires a lock and creates write.lock', async () => {
    const result = await acquireLock(lockDir, {
      agent: 'claude',
      command: 'claim-task',
      ttlMs: 10000,
      retries: 3,
      retryDelayMs: 100,
    });
    expect(result.acquired).toBe(true);
    expect(result.warnings).toEqual([]);
    const lockPath = join(lockDir, '.locks', 'write.lock');
    expect(existsSync(lockPath)).toBe(true);
    const content = JSON.parse(readFileSync(lockPath, 'utf-8'));
    expect(content.agent).toBe('claude');
    expect(content.command).toBe('claim-task');
  });

  it('releases a lock only when token matches', async () => {
    const result = await acquireLock(lockDir, {
      agent: 'claude',
      command: 'test',
      ttlMs: 10000,
      retries: 3,
      retryDelayMs: 100,
    });
    releaseLock(lockDir, result.token!);
    const lockFile = join(lockDir, '.locks', 'write.lock');
    expect(existsSync(lockFile)).toBe(false);
  });

  it('does NOT release a lock owned by another process', async () => {
    const result = await acquireLock(lockDir, {
      agent: 'claude',
      command: 'test',
      ttlMs: 60000,
      retries: 3,
      retryDelayMs: 100,
    });
    // Try to release with a wrong token (simulates stale Process A)
    releaseLock(lockDir, 'wrong-token');
    const lockFile = join(lockDir, '.locks', 'write.lock');
    expect(existsSync(lockFile)).toBe(true); // lock still held
    // Clean up with correct token
    releaseLock(lockDir, result.token!);
  });

  it('fails to acquire when lock is held and not expired', async () => {
    await acquireLock(lockDir, {
      agent: 'claude',
      command: 'test',
      ttlMs: 60000,
      retries: 1,
      retryDelayMs: 50,
    });
    const result = await acquireLock(lockDir, {
      agent: 'codex',
      command: 'test2',
      ttlMs: 10000,
      retries: 1,
      retryDelayMs: 50,
    });
    expect(result.acquired).toBe(false);
    expect(result.error).toMatch(/LOCK_TIMEOUT/);
  });

  it('recovers a stale lock', async () => {
    await acquireLock(lockDir, {
      agent: 'claude',
      command: 'old',
      ttlMs: 1, // expires immediately
      retries: 3,
      retryDelayMs: 100,
    });
    await new Promise(r => setTimeout(r, 50));
    const result = await acquireLock(lockDir, {
      agent: 'codex',
      command: 'new',
      ttlMs: 10000,
      retries: 3,
      retryDelayMs: 100,
    });
    expect(result.acquired).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/recovered stale lock/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/locks/file-lock.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement file-lock.ts**

```typescript
import {
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
  openSync,
  closeSync,
} from 'node:fs';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { monotonicFactory } from 'ulid';
import type { LockContent } from '../types.js';

const ulid = monotonicFactory();

interface LockOptions {
  agent: string;
  command: string;
  ttlMs: number;
  retries: number;
  retryDelayMs: number;
}

interface LockResult {
  acquired: boolean;
  warnings: string[];
  error?: string;
  token?: string;
}

function lockPath(stateDir: string): string {
  return join(stateDir, '.locks', 'write.lock');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function acquireLock(
  stateDir: string,
  options: LockOptions,
): Promise<LockResult> {
  const path = lockPath(stateDir);
  const warnings: string[] = [];

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      const now = new Date();
      const token = ulid();
      const content: LockContent = {
        agent: options.agent,
        pid: process.pid,
        machine: hostname(),
        command: options.command,
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + options.ttlMs).toISOString(),
        token,
      };

      // Atomic exclusive create (wx flag)
      const fd = openSync(path, 'wx');
      writeFileSync(fd, JSON.stringify(content, null, 2), 'utf-8');
      closeSync(fd);
      return { acquired: true, warnings, token };
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code !== 'EEXIST') throw err;

      // Lock file exists - check if stale
      if (existsSync(path)) {
        try {
          const existing: LockContent = JSON.parse(
            readFileSync(path, 'utf-8'),
          );
          const expiresAt = new Date(existing.expires_at).getTime();

          if (Date.now() > expiresAt) {
            warnings.push(
              `recovered stale lock from ${existing.agent}/${existing.command} at ${existing.created_at}`,
            );
            unlinkSync(path);
            continue; // retry immediately
          }
        } catch {
          warnings.push('recovered corrupted lock file');
          try { unlinkSync(path); } catch { /* ignore */ }
          continue;
        }
      }

      if (attempt < options.retries) {
        await sleep(options.retryDelayMs);
      }
    }
  }

  return {
    acquired: false,
    warnings,
    error: 'LOCK_TIMEOUT',
  };
}

export function releaseLock(stateDir: string, token: string): void {
  const path = lockPath(stateDir);
  try {
    if (!existsSync(path)) return;
    const current: LockContent = JSON.parse(readFileSync(path, 'utf-8'));
    // Only delete if WE own this lock - prevents Process A deleting Process B's lock
    if (current.token === token) {
      unlinkSync(path);
    }
  } catch {
    // Lock already released or unreadable
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/locks/file-lock.test.ts`
Expected: 5 tests PASS (acquire, token release, wrong-token rejection, lock contention, stale recovery)

- [ ] **Step 5: Commit**

```bash
git add src/locks/file-lock.ts test/locks/file-lock.test.ts
git commit -m "feat: global write lock with atomic creation, stale recovery, and retry"
```

---

### Task 6: Ledger Writer and Reader

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\ledger\writer.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\ledger\reader.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\ledger\writer.test.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\ledger\reader.test.ts`

- [ ] **Step 1: Write the writer test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { appendEvent } from '../../src/ledger/writer.js';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BridgeEvent, BridgeConfig } from '../../src/types.js';

function makeTestRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'bridge-writer-'));
  mkdirSync(join(root, 'state', '.locks'), { recursive: true });
  mkdirSync(join(root, 'projections'), { recursive: true });
  writeFileSync(join(root, 'state', 'events.jsonl'), '', 'utf-8');
  writeFileSync(join(root, 'projections', '_meta.json'), JSON.stringify({
    last_event_id: '',
    event_count: 0,
    ledger_size_bytes: 0,
    rebuilt_at: new Date().toISOString(),
  }), 'utf-8');
  return root;
}

const testConfig: BridgeConfig = {
  coordination_root: '',
  agent: 'claude',
  lock_ttl_ms: 10000,
  lock_retries: 3,
  lock_retry_delay_ms: 100,
};

describe('appendEvent', () => {
  let root: string;

  beforeEach(() => {
    root = makeTestRoot();
    testConfig.coordination_root = root;
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('appends event to events.jsonl and updates projection', async () => {
    const event: BridgeEvent = {
      event_id: 'evt_test1',
      schema_version: 1,
      event_type: 'task.created',
      timestamp: new Date().toISOString(),
      agent: 'claude',
      summary: 'Test task created',
      payload: { task_id: 'test-task', title: 'Test' },
    };

    const result = await appendEvent(event, testConfig);
    expect(result.event_id).toBe('evt_test1');
    expect(result.written_files).toContain('state/events.jsonl');

    const ledger = readFileSync(join(root, 'state', 'events.jsonl'), 'utf-8');
    const lines = ledger.trim().split('\n');
    expect(lines.length).toBe(1);
    const written = JSON.parse(lines[0]);
    expect(written.event_id).toBe('evt_test1');
  });

  it('updates projections/_meta.json after write', async () => {
    const event: BridgeEvent = {
      event_id: 'evt_test2',
      schema_version: 1,
      event_type: 'task.created',
      timestamp: new Date().toISOString(),
      agent: 'claude',
      summary: 'Test',
      payload: { task_id: 'test-2' },
    };

    await appendEvent(event, testConfig);

    const meta = JSON.parse(readFileSync(join(root, 'projections', '_meta.json'), 'utf-8'));
    expect(meta.last_event_id).toBe('evt_test2');
    expect(meta.event_count).toBe(1);
  });

  it('releases the lock even on projection failure', async () => {
    const event: BridgeEvent = {
      event_id: 'evt_test3',
      schema_version: 1,
      event_type: 'task.created',
      timestamp: new Date().toISOString(),
      agent: 'claude',
      summary: 'Test',
      payload: { task_id: 'test-3' },
    };

    // Make projections dir a file to cause a real write failure
    // (rmSync won't work because writer recreates the dir)
    rmSync(join(root, 'projections'), { recursive: true, force: true });
    writeFileSync(join(root, 'projections'), 'not-a-directory', 'utf-8');

    const result = await appendEvent(event, testConfig);
    // Event should still be in ledger
    const ledger = readFileSync(join(root, 'state', 'events.jsonl'), 'utf-8');
    expect(ledger).toContain('evt_test3');
    // Warnings about projection failure
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ledger/writer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement writer.ts**

The writer supports an optional `preWriteCheck` callback that runs **under the lock** before the event is appended. This is how conflict-checking commands (like `claim-task`) verify state atomically - no TOCTOU race.

```typescript
import { appendFileSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { acquireLock, releaseLock } from '../locks/file-lock.js';
import type { BridgeEvent, BridgeConfig, WriteResponse, ProjectionMeta, ErrorResponse } from '../types.js';
import { PROJECTION_FILES } from '../types.js';

export type PreWriteCheck = (root: string) => ErrorResponse | null;

export interface AppendOptions {
  preWriteCheck?: PreWriteCheck;
}

export async function appendEvent(
  event: BridgeEvent,
  config: BridgeConfig,
  options: AppendOptions = {},
): Promise<WriteResponse> {
  const root = config.coordination_root;
  const stateDir = join(root, 'state');
  const projectionsDir = join(root, 'projections');
  const warnings: string[] = [];
  const writtenFiles: string[] = [];

  // Acquire global write lock
  const lockResult = await acquireLock(stateDir, {
    agent: config.agent,
    command: event.event_type,
    ttlMs: config.lock_ttl_ms,
    retries: config.lock_retries,
    retryDelayMs: config.lock_retry_delay_ms,
  });

  if (!lockResult.acquired) {
    throw Object.assign(new Error(lockResult.error ?? 'LOCK_TIMEOUT'), {
      code: 'LOCK_TIMEOUT',
    });
  }
  const lockToken = lockResult.token!;
  warnings.push(...lockResult.warnings);

  try {
    // Run conflict check UNDER THE LOCK against authoritative state
    if (options.preWriteCheck) {
      const conflict = options.preWriteCheck(root);
      if (conflict) {
        throw Object.assign(new Error(conflict.message), {
          code: conflict.code,
          details: conflict.details,
        });
      }
    }

    // Append to authoritative ledger
    const line = JSON.stringify(event) + '\n';
    const ledgerPath = join(stateDir, 'events.jsonl');
    appendFileSync(ledgerPath, line, 'utf-8');
    writtenFiles.push('state/events.jsonl');

    // Update projection file(s)
    try {
      for (const [projFile, types] of Object.entries(PROJECTION_FILES)) {
        if (types.includes(event.event_type)) {
          const projPath = join(projectionsDir, projFile);
          if (!existsSync(projectionsDir)) mkdirSync(projectionsDir, { recursive: true });
          appendFileSync(projPath, line, 'utf-8');
          writtenFiles.push(`projections/${projFile}`);
        }
      }

      // Update _meta.json
      const metaPath = join(projectionsDir, '_meta.json');
      const ledgerSize = statSync(ledgerPath).size;
      const ledgerContent = readFileSync(ledgerPath, 'utf-8').trim();
      const eventCount = ledgerContent ? ledgerContent.split('\n').length : 0;

      const meta: ProjectionMeta = {
        last_event_id: event.event_id,
        event_count: eventCount,
        ledger_size_bytes: ledgerSize,
        rebuilt_at: new Date().toISOString(),
      };
      writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
      writtenFiles.push('projections/_meta.json');
    } catch (err) {
      warnings.push(`Projection update failed: ${(err as Error).message}. Ledger is intact.`);
    }
  } finally {
    // Token-guarded release: only deletes if we still own the lock
    releaseLock(stateDir, lockToken);
  }

  return {
    event_id: event.event_id,
    event_type: event.event_type,
    written_files: writtenFiles,
    warnings,
    conflicts: [],
    git_commit: null,
    state_snapshot: event.payload,
  };
}
```

- [ ] **Step 4: Run writer test to verify it passes**

Run: `npx vitest run test/ledger/writer.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Write the reader test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readLedger, readProjection, checkProjectionFreshness } from '../../src/ledger/reader.js';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function makeEvents(...events: Array<{ event_id: string; event_type: string; agent: string; supersedes?: string }>): string {
  return events.map(e => JSON.stringify({
    event_id: e.event_id,
    schema_version: 1,
    event_type: e.event_type,
    timestamp: new Date().toISOString(),
    agent: e.agent,
    summary: 'test',
    payload: {},
    supersedes: e.supersedes ?? null,
  })).join('\n') + '\n';
}

describe('reader', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'bridge-reader-'));
    mkdirSync(join(root, 'state'), { recursive: true });
    mkdirSync(join(root, 'projections'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('reads all events from the ledger', () => {
    writeFileSync(join(root, 'state', 'events.jsonl'), makeEvents(
      { event_id: 'evt_1', event_type: 'task.created', agent: 'claude' },
      { event_id: 'evt_2', event_type: 'task.claimed', agent: 'codex' },
    ));

    const events = readLedger(root);
    expect(events.length).toBe(2);
    expect(events[0].event_id).toBe('evt_1');
    expect(events[1].event_id).toBe('evt_2');
  });

  it('filters out superseded events by default', () => {
    writeFileSync(join(root, 'state', 'events.jsonl'), makeEvents(
      { event_id: 'evt_1', event_type: 'task.claimed', agent: 'claude' },
      { event_id: 'evt_2', event_type: 'event.corrected', agent: 'claude', supersedes: 'evt_1' },
    ));

    const events = readLedger(root, { includeSuperseded: false });
    expect(events.length).toBe(1);
    expect(events[0].event_id).toBe('evt_2');
  });

  it('includes superseded events when requested', () => {
    writeFileSync(join(root, 'state', 'events.jsonl'), makeEvents(
      { event_id: 'evt_1', event_type: 'task.claimed', agent: 'claude' },
      { event_id: 'evt_2', event_type: 'event.corrected', agent: 'claude', supersedes: 'evt_1' },
    ));

    const events = readLedger(root, { includeSuperseded: true });
    expect(events.length).toBe(2);
  });

  it('filters by event type', () => {
    writeFileSync(join(root, 'state', 'events.jsonl'), makeEvents(
      { event_id: 'evt_1', event_type: 'task.created', agent: 'claude' },
      { event_id: 'evt_2', event_type: 'decision.recorded', agent: 'codex' },
    ));

    const events = readLedger(root, { eventType: 'task.*' });
    expect(events.length).toBe(1);
    expect(events[0].event_type).toBe('task.created');
  });

  it('filters by agent', () => {
    writeFileSync(join(root, 'state', 'events.jsonl'), makeEvents(
      { event_id: 'evt_1', event_type: 'task.created', agent: 'claude' },
      { event_id: 'evt_2', event_type: 'task.created', agent: 'codex' },
    ));

    const events = readLedger(root, { agent: 'claude' });
    expect(events.length).toBe(1);
  });

  it('checks projection freshness', () => {
    const lastEventId = 'evt_last';
    const ledgerContent = makeEvents(
      { event_id: lastEventId, event_type: 'task.created', agent: 'claude' },
    );
    const ledgerPath = join(root, 'state', 'events.jsonl');
    writeFileSync(ledgerPath, ledgerContent);
    const actualSize = statSync(ledgerPath).size;

    writeFileSync(join(root, 'projections', '_meta.json'), JSON.stringify({
      last_event_id: lastEventId,
      event_count: 1,
      ledger_size_bytes: actualSize,
      rebuilt_at: new Date().toISOString(),
    }));

    expect(checkProjectionFreshness(root)).toBe(true);
  });

  it('detects stale projections', () => {
    writeFileSync(join(root, 'state', 'events.jsonl'), makeEvents(
      { event_id: 'evt_1', event_type: 'task.created', agent: 'claude' },
      { event_id: 'evt_2', event_type: 'task.claimed', agent: 'codex' },
    ));
    writeFileSync(join(root, 'projections', '_meta.json'), JSON.stringify({
      last_event_id: 'evt_1',
      event_count: 1,
      ledger_size_bytes: 50,
      rebuilt_at: new Date().toISOString(),
    }));

    expect(checkProjectionFreshness(root)).toBe(false);
  });
});
```

- [ ] **Step 6: Implement reader.ts**

```typescript
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { BridgeEvent, ProjectionMeta } from '../types.js';

interface ReadOptions {
  includeSuperseded?: boolean;
  eventType?: string;
  agent?: string;
  since?: string;
}

export function readLedger(root: string, options: ReadOptions = {}): BridgeEvent[] {
  const ledgerPath = join(root, 'state', 'events.jsonl');
  if (!existsSync(ledgerPath)) return [];

  const content = readFileSync(ledgerPath, 'utf-8').trim();
  if (!content) return [];

  let events: BridgeEvent[] = content
    .split('\n')
    .map(line => JSON.parse(line) as BridgeEvent);

  // Filter superseded events
  if (!options.includeSuperseded) {
    const supersededIds = new Set(
      events
        .filter(e => e.supersedes)
        .map(e => e.supersedes!),
    );
    events = events.filter(e => !supersededIds.has(e.event_id));
  }

  // Filter by event type (supports wildcard: task.*)
  if (options.eventType) {
    const pattern = options.eventType.replace('.', '\\.').replace('*', '.*');
    const regex = new RegExp(`^${pattern}$`);
    events = events.filter(e => regex.test(e.event_type));
  }

  // Filter by agent
  if (options.agent) {
    events = events.filter(e => e.agent === options.agent);
  }

  // Filter by since
  if (options.since) {
    const sinceDate = new Date(options.since).getTime();
    events = events.filter(e => new Date(e.timestamp).getTime() >= sinceDate);
  }

  return events;
}

export function readProjection(root: string, projectionFile: string): BridgeEvent[] {
  const projPath = join(root, 'projections', projectionFile);
  if (!existsSync(projPath)) return [];

  const content = readFileSync(projPath, 'utf-8').trim();
  if (!content) return [];

  return content.split('\n').map(line => JSON.parse(line) as BridgeEvent);
}

export function getLastLedgerEventId(root: string): string {
  const ledgerPath = join(root, 'state', 'events.jsonl');
  if (!existsSync(ledgerPath)) return '';

  const content = readFileSync(ledgerPath, 'utf-8').trim();
  if (!content) return '';

  const lines = content.split('\n');
  const lastLine = lines[lines.length - 1];
  const event = JSON.parse(lastLine) as BridgeEvent;
  return event.event_id;
}

export function checkProjectionFreshness(root: string): boolean {
  const metaPath = join(root, 'projections', '_meta.json');
  if (!existsSync(metaPath)) return false;

  const ledgerPath = join(root, 'state', 'events.jsonl');
  if (!existsSync(ledgerPath)) return false;

  try {
    const meta: ProjectionMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    const lastLedgerId = getLastLedgerEventId(root);
    const ledgerContent = readFileSync(ledgerPath, 'utf-8').trim();
    const ledgerEventCount = ledgerContent ? ledgerContent.split('\n').length : 0;
    const ledgerSize = statSync(ledgerPath).size;

    // Check all three fields, not just last_event_id
    return (
      meta.last_event_id === lastLedgerId &&
      meta.event_count === ledgerEventCount &&
      meta.ledger_size_bytes === ledgerSize
    );
  } catch {
    return false;
  }
}
```

- [ ] **Step 7: Run both test files**

Run: `npx vitest run test/ledger/`
Expected: all tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/ledger/writer.ts src/ledger/reader.ts test/ledger/writer.test.ts test/ledger/reader.test.ts
git commit -m "feat: ledger writer with lock-protected appends and reader with filtering"
```

---

### Task 7: Conflict Detection and Projections

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\ledger\conflicts.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\ledger\projections.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\ledger\conflicts.test.ts`

- [ ] **Step 1: Write the conflicts test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkTaskConflict, checkQuestionResolved } from '../../src/ledger/conflicts.js';
import type { BridgeEvent } from '../../src/types.js';

function makeTaskEvents(): BridgeEvent[] {
  return [
    {
      event_id: 'evt_1', schema_version: 1, event_type: 'task.created',
      timestamp: '2026-06-06T10:00:00Z', agent: 'claude', summary: 'Created',
      payload: { task_id: 'audit-db', title: 'Audit DB' },
    },
    {
      event_id: 'evt_2', schema_version: 1, event_type: 'task.claimed',
      timestamp: '2026-06-06T10:01:00Z', agent: 'claude', summary: 'Claimed',
      payload: { task_id: 'audit-db' },
    },
  ];
}

describe('checkTaskConflict', () => {
  it('returns conflict when task is already claimed', () => {
    const events = makeTaskEvents();
    const result = checkTaskConflict(events, 'audit-db');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('CONFLICT_TASK_ALREADY_CLAIMED');
  });

  it('returns null when task is not claimed', () => {
    const events = makeTaskEvents().slice(0, 1); // only created, not claimed
    const result = checkTaskConflict(events, 'audit-db');
    expect(result).toBeNull();
  });

  it('returns null when task was claimed then released', () => {
    const events: BridgeEvent[] = [
      ...makeTaskEvents(),
      {
        event_id: 'evt_3', schema_version: 1, event_type: 'task.released',
        timestamp: '2026-06-06T10:02:00Z', agent: 'claude', summary: 'Released',
        payload: { task_id: 'audit-db', status: 'completed' },
      },
    ];
    const result = checkTaskConflict(events, 'audit-db');
    expect(result).toBeNull();
  });
});

describe('checkQuestionResolved', () => {
  it('returns conflict when question is already resolved', () => {
    const events: BridgeEvent[] = [
      {
        event_id: 'evt_q1', schema_version: 1, event_type: 'question.asked',
        timestamp: '2026-06-06T10:00:00Z', agent: 'codex', summary: 'Asked',
        payload: { question: 'Test?' },
      },
      {
        event_id: 'evt_q2', schema_version: 1, event_type: 'question.resolved',
        timestamp: '2026-06-06T10:01:00Z', agent: 'glen', summary: 'Resolved',
        payload: { answer: 'Yes' },
        related_events: ['evt_q1'],
      },
    ];
    const result = checkQuestionResolved(events, 'evt_q1');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('CONFLICT_QUESTION_ALREADY_RESOLVED');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/ledger/conflicts.test.ts`

- [ ] **Step 3: Implement conflicts.ts**

```typescript
import type { BridgeEvent, ErrorResponse } from '../types.js';
import { ERROR_CODES } from '../types.js';

export function checkTaskConflict(
  events: BridgeEvent[],
  taskId: string,
): ErrorResponse | null {
  const taskEvents = events.filter(
    e => (e.payload as Record<string, unknown>).task_id === taskId,
  );

  // Process events in ledger order to resolve current state
  let activeClaim: BridgeEvent | null = null;
  for (const e of taskEvents) {
    if (e.event_type === 'task.claimed') {
      activeClaim = e;
    } else if (e.event_type === 'task.released') {
      activeClaim = null;
    }
    // event.corrected with supersedes is already filtered out by reader
  }

  if (activeClaim) {
    return {
      error: true,
      code: ERROR_CODES.CONFLICT_TASK_ALREADY_CLAIMED,
      message: `Task ${taskId} is already claimed by ${activeClaim.agent} (${activeClaim.event_id})`,
      details: {
        existing_claim: activeClaim.event_id,
        agent: activeClaim.agent,
        claimed_at: activeClaim.timestamp,
      },
    };
  }

  return null;
}

export function checkQuestionResolved(
  events: BridgeEvent[],
  questionEventId: string,
): ErrorResponse | null {
  const resolution = events.find(
    e =>
      e.event_type === 'question.resolved' &&
      e.related_events?.includes(questionEventId),
  );

  if (resolution) {
    return {
      error: true,
      code: ERROR_CODES.CONFLICT_QUESTION_ALREADY_RESOLVED,
      message: `Question ${questionEventId} is already resolved (${resolution.event_id})`,
      details: {
        resolution_event: resolution.event_id,
        resolved_at: resolution.timestamp,
      },
    };
  }

  return null;
}
```

- [ ] **Step 4: Implement projections.ts**

```typescript
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { BridgeEvent, ProjectionMeta } from '../types.js';
import { PROJECTION_FILES } from '../types.js';

export function rebuildProjections(root: string): { rebuilt: string[]; warnings: string[] } {
  const ledgerPath = join(root, 'state', 'events.jsonl');
  const projectionsDir = join(root, 'projections');
  const rebuilt: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(ledgerPath)) {
    warnings.push('No events.jsonl found');
    return { rebuilt, warnings };
  }

  const content = readFileSync(ledgerPath, 'utf-8').trim();
  if (!content) return { rebuilt, warnings };

  const events: BridgeEvent[] = content
    .split('\n')
    .map(line => JSON.parse(line) as BridgeEvent);

  if (!existsSync(projectionsDir)) mkdirSync(projectionsDir, { recursive: true });

  // Rebuild each projection file
  for (const [projFile, types] of Object.entries(PROJECTION_FILES)) {
    const matching = events.filter(e => types.includes(e.event_type));
    const projPath = join(projectionsDir, projFile);
    const lines = matching.map(e => JSON.stringify(e)).join('\n');
    writeFileSync(projPath, lines ? lines + '\n' : '', 'utf-8');
    rebuilt.push(projFile);
  }

  // Update _meta.json
  const lastEvent = events[events.length - 1];
  const meta: ProjectionMeta = {
    last_event_id: lastEvent.event_id,
    event_count: events.length,
    ledger_size_bytes: statSync(ledgerPath).size,
    rebuilt_at: new Date().toISOString(),
  };
  writeFileSync(join(projectionsDir, '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  rebuilt.push('_meta.json');

  return { rebuilt, warnings };
}
```

- [ ] **Step 5: Run all ledger tests**

Run: `npx vitest run test/ledger/`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/ledger/conflicts.ts src/ledger/projections.ts test/ledger/conflicts.test.ts
git commit -m "feat: conflict detection for task claims/question resolution + projection rebuilder"
```

---

### Task 8: JSON Schemas and Validator

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\schemas\validator.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\schemas\definitions.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\schemas\validator.test.ts`

- [ ] **Step 1: Write the validator test**

```typescript
import { describe, it, expect } from 'vitest';
import { validateEvent } from '../../src/schemas/validator.js';

describe('validateEvent', () => {
  it('passes a valid event', () => {
    const result = validateEvent({
      event_id: 'evt_01JTEST',
      schema_version: 1,
      event_type: 'task.created',
      timestamp: '2026-06-06T14:00:00.000Z',
      agent: 'claude',
      summary: 'Test task',
      payload: { task_id: 'test', title: 'Test Task' },
    });
    expect(result.valid).toBe(true);
  });

  it('fails when required fields are missing', () => {
    const result = validateEvent({
      event_id: 'evt_01JTEST',
      event_type: 'task.created',
    } as any);
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('fails on invalid event_type', () => {
    const result = validateEvent({
      event_id: 'evt_01JTEST',
      schema_version: 1,
      event_type: 'invalid.type',
      timestamp: '2026-06-06T14:00:00.000Z',
      agent: 'claude',
      summary: 'Test',
      payload: {},
    });
    expect(result.valid).toBe(false);
  });

  it('fails when event_id does not start with evt_', () => {
    const result = validateEvent({
      event_id: 'bad_prefix',
      schema_version: 1,
      event_type: 'task.created',
      timestamp: '2026-06-06T14:00:00.000Z',
      agent: 'claude',
      summary: 'Test',
      payload: {},
    });
    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/schemas/validator.test.ts`

- [ ] **Step 3: Implement definitions.ts with embedded schemas**

```typescript
import { EVENT_TYPES } from '../types.js';

export const BASE_EVENT_SCHEMA = {
  type: 'object',
  required: ['event_id', 'schema_version', 'event_type', 'timestamp', 'agent', 'summary', 'payload'],
  properties: {
    event_id: { type: 'string', pattern: '^evt_[0-9A-HJKMNP-TV-Z]{26}$' },
    schema_version: { type: 'integer', minimum: 1 },
    event_type: { type: 'string', enum: [...EVENT_TYPES] },
    timestamp: { type: 'string', format: 'date-time' },
    agent: { type: 'string', minLength: 1 },
    summary: { type: 'string', minLength: 1 },
    payload: { type: 'object' },
    related_events: { type: 'array', items: { type: 'string' } },
    supersedes: { type: ['string', 'null'] },
    metadata: { type: 'object' },
  },
  additionalProperties: false,
};
```

**Note:** v1 validates base event structure only (required fields, event_id format, valid event_type, timestamp format). Event-specific payload schemas (e.g. requiring task_id for task events) are v1.1 scope. This is honestly "base event validation," not full payload validation.

- [ ] **Step 4: Implement validator.ts**

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { BASE_EVENT_SCHEMA } from './definitions.js';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile(BASE_EVENT_SCHEMA);

interface ValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
}

export function validateEvent(event: unknown): ValidationResult {
  const isValid = validate(event);

  if (isValid) {
    return { valid: true };
  }

  return {
    valid: false,
    errors: (validate.errors ?? []).map(err => ({
      path: err.instancePath || '/',
      message: err.message ?? 'Unknown validation error',
    })),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/schemas/validator.test.ts`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/schemas/validator.ts src/schemas/definitions.ts test/schemas/validator.test.ts
git commit -m "feat: JSON schema validation for bridge events with AJV"
```

---

### Task 9: CLI Framework and Init-Coordination

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\cli.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\init-coordination.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\commands\init-coordination.test.ts`

- [ ] **Step 1: Write the init-coordination test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initCoordination } from '../../src/commands/init-coordination.js';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('init-coordination', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'bridge-init-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates the full directory structure', async () => {
    const targetPath = join(testDir, 'coordination');
    await initCoordination(targetPath, false);

    expect(existsSync(join(targetPath, 'state', 'events.jsonl'))).toBe(true);
    expect(existsSync(join(targetPath, 'state', '.locks'))).toBe(true);
    expect(existsSync(join(targetPath, 'projections', '_meta.json'))).toBe(true);
    expect(existsSync(join(targetPath, 'registry', 'agents.yaml'))).toBe(true);
    expect(existsSync(join(targetPath, 'registry', 'projects.yaml'))).toBe(true);
    expect(existsSync(join(targetPath, 'registry', 'source_locations.yaml'))).toBe(true);
    expect(existsSync(join(targetPath, 'schemas'))).toBe(true);
    expect(existsSync(join(targetPath, 'handoffs'))).toBe(true);
    expect(existsSync(join(targetPath, 'reviews'))).toBe(true);
    expect(existsSync(join(targetPath, 'patches'))).toBe(true);
    expect(existsSync(join(targetPath, 'snapshots'))).toBe(true);
    expect(existsSync(join(targetPath, 'config', 'event_types.yaml'))).toBe(true);
    expect(existsSync(join(targetPath, 'README.md'))).toBe(true);
    expect(existsSync(join(targetPath, '.gitignore'))).toBe(true);
  });

  it('creates empty events.jsonl', async () => {
    const targetPath = join(testDir, 'coordination');
    await initCoordination(targetPath, false);
    const content = readFileSync(join(targetPath, 'state', 'events.jsonl'), 'utf-8');
    expect(content).toBe('');
  });

  it('creates valid _meta.json', async () => {
    const targetPath = join(testDir, 'coordination');
    await initCoordination(targetPath, false);
    const meta = JSON.parse(readFileSync(join(targetPath, 'projections', '_meta.json'), 'utf-8'));
    expect(meta.last_event_id).toBe('');
    expect(meta.event_count).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/commands/init-coordination.test.ts`

- [ ] **Step 3: Implement init-coordination.ts**

```typescript
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify as yamlStringify } from 'yaml';
import { EVENT_TYPES } from '../types.js';
import type { ProjectionMeta } from '../types.js';

const DIRS = [
  'state/.locks',
  'projections',
  'registry',
  'schemas',
  'handoffs',
  'reviews',
  'patches',
  'snapshots',
  'config',
];

const PROJECTION_FILES = [
  'tasks.jsonl',
  'decisions.jsonl',
  'open_questions.jsonl',
  'reviews.jsonl',
  'handoffs.jsonl',
  'patches.jsonl',
];

export async function initCoordination(targetPath: string, dryRun: boolean): Promise<string[]> {
  const created: string[] = [];

  // Safety: refuse to init into any non-empty directory
  if (existsSync(targetPath)) {
    const entries = readdirSync(targetPath);
    // Allow empty dirs and dirs with only .git
    const meaningful = entries.filter(e => e !== '.git');
    if (meaningful.length > 0) {
      throw new Error(
        `Refusing to init: ${targetPath} is not empty (contains: ${meaningful.slice(0, 5).join(', ')}). ` +
        `This could destroy existing data. Use an empty directory or delete the target first.`
      );
    }
  }

  if (dryRun) {
    return [
      ...DIRS.map(d => `${d}/`),
      'state/events.jsonl',
      ...PROJECTION_FILES.map(f => `projections/${f}`),
      'projections/_meta.json',
      'registry/agents.yaml',
      'registry/projects.yaml',
      'registry/source_locations.yaml',
      'config/event_types.yaml',
      'README.md',
      'CURRENT_STATE.md',
      '.gitignore',
    ];
  }

  // Create directories
  for (const dir of DIRS) {
    const fullPath = join(targetPath, dir);
    mkdirSync(fullPath, { recursive: true });
    created.push(dir);
  }

  // state/events.jsonl (empty)
  writeFileSync(join(targetPath, 'state', 'events.jsonl'), '', 'utf-8');

  // projections (empty files + _meta.json)
  for (const file of PROJECTION_FILES) {
    writeFileSync(join(targetPath, 'projections', file), '', 'utf-8');
  }
  const meta: ProjectionMeta = {
    last_event_id: '',
    event_count: 0,
    ledger_size_bytes: 0,
    rebuilt_at: new Date().toISOString(),
  };
  writeFileSync(join(targetPath, 'projections', '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

  // registry/agents.yaml
  const agents = {
    agents: {
      claude: {
        display_name: 'Claude Code',
        capabilities: ['long-form-extraction', 'foundry-mcp', 'prose-worldbuilding', 'commits', 'astinus-development'],
        default_model: 'claude-opus-4-6',
        advisory_defaults: { provider: 'codex-cli', note: 'Uses codex exec with ChatGPT login' },
      },
      codex: {
        display_name: 'OpenAI Codex',
        capabilities: ['architecture-review', 'schema-audit', 'tests', 'integration-scripts', 'pipeline-validation'],
        default_model: 'gpt-4o',
        advisory_defaults: { provider: 'codex-cli', note: 'Uses codex exec with ChatGPT login' },
      },
      glen: {
        display_name: 'Glen Pryer',
        capabilities: ['canon-authority', 'final-approval'],
        is_human: true,
        note: 'Human. All canon decisions require Glen\'s approval.',
      },
      chatgpt: {
        display_name: 'ChatGPT',
        capabilities: ['image-generation', 'brainstorming'],
        note: 'Accessible via Codex CLI (codex exec). No direct bridge invocation.',
      },
    },
  };
  writeFileSync(join(targetPath, 'registry', 'agents.yaml'), yamlStringify(agents), 'utf-8');

  // registry/projects.yaml
  const projects = {
    projects: {
      astinus: { path: 'D:\\OneDrive\\Claude_code\\Astinus', role: 'Canon app and world bible', primary_agent: 'claude', safety: 'normal' },
      'foundry-world': { path: 'C:\\Users\\gpbea\\AppData\\Local\\FoundryVTT\\Data\\worlds\\arthrea', role: 'Playable runtime', primary_agent: 'claude', safety: 'clone-before-edit' },
      'foundry-mcp': { path: 'D:\\OneDrive\\Claude_code\\foundry-vtt', role: 'Foundry MCP/module code', primary_agent: 'claude', safety: 'normal' },
      'hule-source': { path: 'D:\\OneDrive\\CHATGPT HISTORY\\Hule_Source', role: 'Historical source archive', safety: 'read-only-default' },
      coordination: { path: 'D:\\OneDrive\\Arthrea_Coordination', role: 'Assistant coordination brain', safety: 'append-only-state' },
      bridge: { path: 'D:\\OneDrive\\Arthrea_Coordination_Bridge', role: 'Bridge implementation', safety: 'normal' },
    },
  };
  writeFileSync(join(targetPath, 'registry', 'projects.yaml'), yamlStringify(projects), 'utf-8');

  // registry/source_locations.yaml
  const sources = {
    sources: {
      chatgpt_hule_raw: { path: 'D:\\OneDrive\\CHATGPT HISTORY\\Hule_Source', type: 'raw_export', canon_status: 'mixed' },
      astinus_db: { path: 'D:\\OneDrive\\Claude_code\\Astinus\\world_bible\\astinus.db', type: 'database', canon_status: 'intended_canonical' },
      foundry_arthrea: { path: 'C:\\Users\\gpbea\\AppData\\Local\\FoundryVTT\\Data\\worlds\\arthrea', type: 'foundry_world', canon_status: 'live_production' },
    },
  };
  writeFileSync(join(targetPath, 'registry', 'source_locations.yaml'), yamlStringify(sources), 'utf-8');

  // config/event_types.yaml
  writeFileSync(join(targetPath, 'config', 'event_types.yaml'), yamlStringify({ event_types: [...EVENT_TYPES] }), 'utf-8');

  // .gitignore
  writeFileSync(join(targetPath, '.gitignore'), 'state/.locks/\nscratch/\n.env\n', 'utf-8');

  // README.md
  writeFileSync(join(targetPath, 'README.md'), [
    '# Arthrea Coordination',
    '',
    'Shared coordination state for the Claude-Codex Arthrea bridge.',
    '',
    '`state/events.jsonl` is the authoritative append-only ledger.',
    'Projection files in `projections/` are derived and rebuildable.',
    '`CURRENT_STATE.md` is GENERATED - do not edit manually.',
    '',
    'See the bridge repo for CLI documentation.',
  ].join('\n'), 'utf-8');

  // CURRENT_STATE.md placeholder
  writeFileSync(join(targetPath, 'CURRENT_STATE.md'), '<!-- GENERATED - do not edit manually -->\n# Current State\n\nNo events yet.\n', 'utf-8');

  return created;
}
```

- [ ] **Step 4: Implement cli.ts**

```typescript
import { Command } from 'commander';
import { config } from 'dotenv';
import { resolveConfig } from './config.js';
import { BRIDGE_VERSION, ERROR_CODES } from './types.js';
import { initCoordination } from './commands/init-coordination.js';

config();

const program = new Command();

program
  .name('arthrea-bridge')
  .version(BRIDGE_VERSION)
  .description('Claude-Codex coordination bridge for the Arthrea worldbuilding ecosystem')
  .option('--coordination-root <path>', 'Path to Arthrea_Coordination repo')
  .option('--agent <name>', 'Agent identity (claude/codex/glen)')
  // --dry-run is command-specific (init-coordination, rebuild-projections), not global
  .option('--json', 'Force JSON output')
  .option('--stdin', 'Read input as JSON from stdin')
  // auto-commit removed from v1 - not implemented
  .option('--human-invoked', 'Required with --agent glen');

function output(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

function validateGlenAgent(opts: { agent?: string; humanInvoked?: boolean }): void {
  if (opts.agent === 'glen' && !opts.humanInvoked) {
    output({
      error: true,
      code: ERROR_CODES.GLEN_AGENT_REQUIRES_HUMAN_FLAG,
      message: '--agent glen requires --human-invoked flag. Assistants should use their own agent name with approved_by in payload.',
    });
    process.exit(1);
  }
}

async function readStdin(): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

program
  .command('init-coordination')
  .description('Scaffold a fresh Arthrea_Coordination repo')
  .requiredOption('--path <path>', 'Target directory path')
  .option('--dry-run', 'Show what would be created without writing')
  .action(async (opts) => {
    const dryRun = opts.dryRun ?? false;
    const created = await initCoordination(opts.path, dryRun);
    output({ status: dryRun ? 'dry_run' : 'created', path: opts.path, items: created });
  });

// Shared error handler for all command actions
async function runCommand(fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    output(result);
  } catch (err: unknown) {
    const e = err as Error & { code?: string; details?: unknown };
    output({ error: true, code: e.code ?? 'ERROR', message: e.message, details: e.details });
    process.exit(1);
  }
}

// Commands added in subsequent tasks use runCommand() for consistent error output

program.parse();
```

- [ ] **Step 5: Build and test the CLI**

Run:
```bash
npx tsc
node dist/cli.js --version
node dist/cli.js init-coordination --path "D:\tmp\test-coordination" --dry-run
```
Expected: version output, then dry-run result with file list

- [ ] **Step 6: Run the init test**

Run: `npx vitest run test/commands/init-coordination.test.ts`
Expected: 3 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/cli.ts src/commands/init-coordination.ts test/commands/init-coordination.test.ts
git commit -m "feat: CLI framework with commander + init-coordination scaffolding command"
```

---

### Task 10: Task Commands (create, claim, update, release)

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\create-task.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\claim-task.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\update-task.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\release-task.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\commands\claim-task.test.ts`

- [ ] **Step 1: Write the claim-task test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeClaimTask } from '../../src/commands/claim-task.js';
import { executeCreateTask } from '../../src/commands/create-task.js';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BridgeConfig } from '../../src/types.js';

function makeTestRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'bridge-task-'));
  mkdirSync(join(root, 'state', '.locks'), { recursive: true });
  mkdirSync(join(root, 'projections'), { recursive: true });
  writeFileSync(join(root, 'state', 'events.jsonl'), '', 'utf-8');
  writeFileSync(join(root, 'projections', 'tasks.jsonl'), '', 'utf-8');
  writeFileSync(join(root, 'projections', '_meta.json'), JSON.stringify({
    last_event_id: '', event_count: 0, ledger_size_bytes: 0, rebuilt_at: new Date().toISOString(),
  }), 'utf-8');
  return root;
}

const makeConfig = (root: string): BridgeConfig => ({
  coordination_root: root,
  agent: 'claude',
  lock_ttl_ms: 10000,
  lock_retries: 3,
  lock_retry_delay_ms: 100,
});

describe('claim-task', () => {
  let root: string;

  beforeEach(() => { root = makeTestRoot(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('claims a task successfully', async () => {
    const config = makeConfig(root);
    await executeCreateTask({ task_id: 'test-task', title: 'Test' }, config);
    const result = await executeClaimTask({ task_id: 'test-task' }, config);
    expect(result.event_type).toBe('task.claimed');
    expect(result.conflicts).toEqual([]);
  });

  it('returns conflict when task is already claimed', async () => {
    const config = makeConfig(root);
    await executeCreateTask({ task_id: 'test-task', title: 'Test' }, config);
    await executeClaimTask({ task_id: 'test-task' }, config);

    const config2 = { ...config, agent: 'codex' };
    await expect(
      executeClaimTask({ task_id: 'test-task' }, config2),
    ).rejects.toThrow(/already claimed/);
  });

  it('handles concurrent claims safely (only one succeeds)', async () => {
    const config = makeConfig(root);
    await executeCreateTask({ task_id: 'race-task', title: 'Race' }, config);

    const config1 = { ...config, agent: 'claude' };
    const config2 = { ...config, agent: 'codex' };

    // Fire both claims concurrently
    const results = await Promise.allSettled([
      executeClaimTask({ task_id: 'race-task' }, config1),
      executeClaimTask({ task_id: 'race-task' }, config2),
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // Exactly one should succeed, one should fail with conflict
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(/already claimed/);
  });
});
```

- [ ] **Step 2: Implement create-task.ts**

```typescript
import { generateEventId } from '../ledger/event-id.js';
import { validateEvent } from '../schemas/validator.js';
import { appendEvent } from '../ledger/writer.js';
import type { BridgeConfig, BridgeEvent, WriteResponse } from '../types.js';
import { SCHEMA_VERSION, BRIDGE_VERSION } from '../types.js';

interface CreateTaskInput {
  task_id: string;
  title: string;
  description?: string;
  priority?: string;
  assignee?: string;
}

export async function executeCreateTask(
  input: CreateTaskInput,
  config: BridgeConfig,
): Promise<WriteResponse> {
  const event: BridgeEvent = {
    event_id: generateEventId(),
    schema_version: SCHEMA_VERSION,
    event_type: 'task.created',
    timestamp: new Date().toISOString(),
    agent: config.agent,
    summary: `Created task: ${input.title}`,
    payload: {
      task_id: input.task_id,
      title: input.title,
      ...(input.description && { description: input.description }),
      ...(input.priority && { priority: input.priority }),
      ...(input.assignee && { assignee: input.assignee }),
    },
    metadata: { bridge_version: BRIDGE_VERSION, dry_run: false },
  };

  const validation = validateEvent(event);
  if (!validation.valid) {
    throw Object.assign(new Error(`Validation failed: ${JSON.stringify(validation.errors)}`), { code: 'VALIDATION_FAILED' });
  }

  return appendEvent(event, config);
}
```

- [ ] **Step 3: Implement claim-task.ts**

Uses `preWriteCheck` to verify no existing claim **under the global write lock**. This eliminates the TOCTOU race where two processes could both read "unclaimed" and both append a claim.

```typescript
import { generateEventId } from '../ledger/event-id.js';
import { validateEvent } from '../schemas/validator.js';
import { appendEvent } from '../ledger/writer.js';
import { readLedger } from '../ledger/reader.js';
import { checkTaskConflict } from '../ledger/conflicts.js';
import type { BridgeConfig, BridgeEvent, WriteResponse } from '../types.js';
import { SCHEMA_VERSION, BRIDGE_VERSION } from '../types.js';

interface ClaimTaskInput {
  task_id: string;
}

export async function executeClaimTask(
  input: ClaimTaskInput,
  config: BridgeConfig,
): Promise<WriteResponse> {
  const event: BridgeEvent = {
    event_id: generateEventId(),
    schema_version: SCHEMA_VERSION,
    event_type: 'task.claimed',
    timestamp: new Date().toISOString(),
    agent: config.agent,
    summary: `Claimed task: ${input.task_id}`,
    payload: { task_id: input.task_id },
    metadata: { bridge_version: BRIDGE_VERSION, dry_run: false },
  };

  const validation = validateEvent(event);
  if (!validation.valid) {
    throw Object.assign(new Error(`Validation failed: ${JSON.stringify(validation.errors)}`), { code: 'VALIDATION_FAILED' });
  }

  // Conflict check runs UNDER THE LOCK inside appendEvent
  return appendEvent(event, config, {
    preWriteCheck: (root) => {
      const events = readLedger(root, { eventType: 'task.*' });
      return checkTaskConflict(events, input.task_id);
    },
  });
}
```

- [ ] **Step 4: Implement update-task.ts**

```typescript
import { generateEventId } from '../ledger/event-id.js';
import { validateEvent } from '../schemas/validator.js';
import { appendEvent } from '../ledger/writer.js';
import type { BridgeConfig, BridgeEvent, WriteResponse } from '../types.js';
import { SCHEMA_VERSION, BRIDGE_VERSION } from '../types.js';

interface UpdateTaskInput {
  task_id: string;
  status?: string;
  priority?: string;
  notes?: string;
}

export async function executeUpdateTask(
  input: UpdateTaskInput,
  config: BridgeConfig,
): Promise<WriteResponse> {
  const event: BridgeEvent = {
    event_id: generateEventId(),
    schema_version: SCHEMA_VERSION,
    event_type: 'task.updated',
    timestamp: new Date().toISOString(),
    agent: config.agent,
    summary: `Updated task: ${input.task_id}`,
    payload: { ...input },
    metadata: { bridge_version: BRIDGE_VERSION, dry_run: false },
  };

  const validation = validateEvent(event);
  if (!validation.valid) {
    throw Object.assign(new Error(`Validation failed: ${JSON.stringify(validation.errors)}`), { code: 'VALIDATION_FAILED' });
  }

  return appendEvent(event, config);
}
```

- [ ] **Step 5: Implement release-task.ts**

```typescript
import { generateEventId } from '../ledger/event-id.js';
import { validateEvent } from '../schemas/validator.js';
import { appendEvent } from '../ledger/writer.js';
import { readLedger } from '../ledger/reader.js';
import type { BridgeConfig, BridgeEvent, WriteResponse } from '../types.js';
import { SCHEMA_VERSION, BRIDGE_VERSION } from '../types.js';

interface ReleaseTaskInput {
  task_id: string;
  status: 'completed' | 'blocked' | 'abandoned' | 'reassigned';
  notes?: string;
  deliverables?: string[];
  override?: boolean;
  approved_by?: string;
}

export async function executeReleaseTask(
  input: ReleaseTaskInput,
  config: BridgeConfig,
): Promise<WriteResponse> {
  const event: BridgeEvent = {
    event_id: generateEventId(),
    schema_version: SCHEMA_VERSION,
    event_type: 'task.released',
    timestamp: new Date().toISOString(),
    agent: config.agent,
    summary: `Released task: ${input.task_id} (${input.status})`,
    payload: { ...input },
    metadata: { bridge_version: BRIDGE_VERSION, dry_run: false },
  };

  const validation = validateEvent(event);
  if (!validation.valid) {
    throw Object.assign(new Error(`Validation failed: ${JSON.stringify(validation.errors)}`), { code: 'VALIDATION_FAILED' });
  }

  // Validate claim state UNDER THE LOCK
  return appendEvent(event, config, {
    preWriteCheck: (root) => {
      const events = readLedger(root, { eventType: 'task.*' });
      const taskEvents = events.filter(
        e => (e.payload as Record<string, unknown>).task_id === input.task_id,
      );

      // Find active claim by processing events in order
      let activeClaim: BridgeEvent | null = null;
      for (const e of taskEvents) {
        if (e.event_type === 'task.claimed') activeClaim = e;
        if (e.event_type === 'task.released') activeClaim = null;
      }

      if (!activeClaim) {
        return {
          error: true,
          code: 'CONFLICT_TASK_NOT_CLAIMED',
          message: `Task ${input.task_id} is not currently claimed`,
        };
      }

      // Verify releasing agent owns the claim (or has explicit override with approval)
      if (activeClaim.agent !== config.agent) {
        if (!input.override || !input.approved_by) {
          return {
            error: true,
            code: 'CONFLICT_TASK_OWNED_BY_OTHER',
            message: `Task ${input.task_id} is claimed by ${activeClaim.agent}, not ${config.agent}. Override requires: override: true + approved_by.`,
            details: { owner: activeClaim.agent, claim_event: activeClaim.event_id },
          };
        }
        // Override is allowed - approved_by is already in the payload via ...input spread
      }

      // Set related_events to point back to the active claim
      event.related_events = [activeClaim.event_id];
      return null;
    },
  });
}
```

- [ ] **Step 6: Register task commands in cli.ts**

Add to `cli.ts` after the init-coordination command:

```typescript
import { executeCreateTask } from './commands/create-task.js';
import { executeClaimTask } from './commands/claim-task.js';
import { executeUpdateTask } from './commands/update-task.js';
import { executeReleaseTask } from './commands/release-task.js';

program
  .command('create-task')
  .description('Create a new task')
  .requiredOption('--task-id <id>', 'Task identifier')
  .requiredOption('--title <title>', 'Task title')
  .option('--description <desc>', 'Task description')
  .option('--priority <p>', 'Task priority')
  .action(async (opts) => {
    const parentOpts = program.opts();
    validateGlenAgent(parentOpts);
    const config = resolveConfig(parentOpts);
    const result = await executeCreateTask(opts, config);
    output(result);
  });

program
  .command('claim-task')
  .description('Claim a task for the current agent')
  .requiredOption('--task-id <id>', 'Task to claim')
  .action(async (opts) => {
    const parentOpts = program.opts();
    validateGlenAgent(parentOpts);
    const config = resolveConfig(parentOpts);
    try {
      const result = await executeClaimTask(opts, config);
      output(result);
    } catch (err: unknown) {
      const e = err as Error & { code?: string; details?: unknown };
      output({ error: true, code: e.code ?? 'ERROR', message: e.message, details: e.details });
      process.exit(1);
    }
  });

program
  .command('update-task')
  .description('Update a task status or details')
  .requiredOption('--task-id <id>', 'Task to update')
  .option('--status <s>', 'New status')
  .option('--priority <p>', 'New priority')
  .option('--notes <n>', 'Notes')
  .action(async (opts) => {
    const parentOpts = program.opts();
    validateGlenAgent(parentOpts);
    const config = resolveConfig(parentOpts);
    const result = await executeUpdateTask(opts, config);
    output(result);
  });

program
  .command('release-task')
  .description('Release a claimed task')
  .requiredOption('--task-id <id>', 'Task to release')
  .requiredOption('--status <s>', 'Release status: completed|blocked|abandoned|reassigned')
  .action(async (opts) => {
    const parentOpts = program.opts();
    validateGlenAgent(parentOpts);
    const config = resolveConfig(parentOpts);
    const stdinData = parentOpts.stdin ? await readStdin() : {};
    const result = await executeReleaseTask({ ...opts, ...stdinData }, config);
    output(result);
  });
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run test/commands/claim-task.test.ts`
Expected: 3 tests PASS (claim, conflict, concurrent)

- [ ] **Step 8: Commit**

```bash
git add src/commands/create-task.ts src/commands/claim-task.ts src/commands/update-task.ts src/commands/release-task.ts src/cli.ts test/commands/claim-task.test.ts
git commit -m "feat: task lifecycle commands (create, claim, update, release) with conflict detection"
```

---

### Task 11: Coordination Commands (handoff, decision, question, review, patch)

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\publish-handoff.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\record-decision.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\ask-question.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\resolve-question.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\request-review.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\publish-review.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\publish-patch.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\commands\publish-handoff.test.ts`

All coordination commands follow the same pattern as task commands: build event, validate, append. The key differences are the payload shapes and which projections they write to.

- [ ] **Step 1: Write the publish-handoff test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executePublishHandoff } from '../../src/commands/publish-handoff.js';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BridgeConfig } from '../../src/types.js';

function makeTestRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'bridge-handoff-'));
  mkdirSync(join(root, 'state', '.locks'), { recursive: true });
  mkdirSync(join(root, 'projections'), { recursive: true });
  mkdirSync(join(root, 'handoffs'), { recursive: true });
  writeFileSync(join(root, 'state', 'events.jsonl'), '', 'utf-8');
  writeFileSync(join(root, 'projections', 'handoffs.jsonl'), '', 'utf-8');
  writeFileSync(join(root, 'projections', '_meta.json'), JSON.stringify({
    last_event_id: '', event_count: 0, ledger_size_bytes: 0, rebuilt_at: new Date().toISOString(),
  }), 'utf-8');
  return root;
}

describe('publish-handoff', () => {
  let root: string;
  const config: BridgeConfig = {
    coordination_root: '',
    agent: 'claude',
    lock_ttl_ms: 10000,
    lock_retries: 3,
    lock_retry_delay_ms: 100,
  };

  beforeEach(() => { root = makeTestRoot(); config.coordination_root = root; });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('publishes a handoff event', async () => {
    const result = await executePublishHandoff({
      summary: 'Completed DB audit',
      target_agent: 'codex',
      files_touched: ['astinus.db'],
      risks: ['Duplicate IDs'],
      next_steps: ['Dedupe NPCs'],
    }, config);

    expect(result.event_type).toBe('handoff.published');
    expect(result.written_files).toContain('state/events.jsonl');

    const ledger = readFileSync(join(root, 'state', 'events.jsonl'), 'utf-8').trim();
    const event = JSON.parse(ledger);
    expect(event.payload.target_agent).toBe('codex');
  });
});
```

- [ ] **Step 2: Implement all coordination commands**

Each follows the same pattern. Implement `publish-handoff.ts`, `record-decision.ts`, `ask-question.ts`, `resolve-question.ts`, `request-review.ts`, `publish-review.ts`, `publish-patch.ts`.

`publish-handoff.ts`:
```typescript
import { generateEventId } from '../ledger/event-id.js';
import { validateEvent } from '../schemas/validator.js';
import { appendEvent } from '../ledger/writer.js';
import type { BridgeConfig, BridgeEvent, WriteResponse } from '../types.js';
import { SCHEMA_VERSION, BRIDGE_VERSION } from '../types.js';

interface HandoffInput {
  summary: string;
  target_agent: string;
  files_touched?: string[];
  risks?: string[];
  next_steps?: string[];
  context?: string;
}

export async function executePublishHandoff(
  input: HandoffInput,
  config: BridgeConfig,
): Promise<WriteResponse> {
  const event: BridgeEvent = {
    event_id: generateEventId(),
    schema_version: SCHEMA_VERSION,
    event_type: 'handoff.published',
    timestamp: new Date().toISOString(),
    agent: config.agent,
    summary: input.summary,
    payload: { ...input },
    metadata: { bridge_version: BRIDGE_VERSION, dry_run: false },
  };

  const validation = validateEvent(event);
  if (!validation.valid) {
    throw Object.assign(new Error(`Validation failed: ${JSON.stringify(validation.errors)}`), { code: 'VALIDATION_FAILED' });
  }

  return appendEvent(event, config);
}
```

Implement each command using the same pattern as `publish-handoff`. Reference table:

| Command | event_type | Required payload fields | Conflict check (preWriteCheck) |
|---|---|---|---|
| `record-decision` | `decision.recorded` | `decision`, `approved_by`, `rationale`, `scope` | None |
| `ask-question` | `question.asked` | `question`, `target`, `context`, `options`, `blocking` | None |
| `resolve-question` | `question.resolved` | `question_id`, `answer`, `rationale` | `checkQuestionResolved` under lock |
| `request-review` | `review.requested` | `target`, `scope`, `files_or_branch`, `question` | None |
| `publish-review` | `review.published` | `responds_to`, `severity`, `findings`, `verdict` | None |
| `publish-patch` | `patch.proposed` | `scope`, `branch`, `repo`, `rationale`, `review_requested` | None |

`resolve-question` uses `preWriteCheck` under the lock:

```typescript
return appendEvent(event, config, {
  preWriteCheck: (root) => {
    const events = readLedger(root);
    return checkQuestionResolved(events, input.question_id);
  },
});
```

`publish-review` and `resolve-question` should set `related_events` pointing to the event they respond to.

- [ ] **Step 3: Register all commands in cli.ts**

Add `program.command(...)` blocks for each, following the pattern from Task 10. Commands accepting complex input use `--stdin` with `readStdin()`.

- [ ] **Step 4: Run the handoff test**

Run: `npx vitest run test/commands/publish-handoff.test.ts`
Expected: PASS

- [ ] **Step 5: Build and smoke test**

```bash
npx tsc
node dist/cli.js --agent claude publish-handoff --help
```
Expected: help text showing options

- [ ] **Step 6: Commit**

```bash
git add src/commands/publish-handoff.ts src/commands/record-decision.ts src/commands/ask-question.ts src/commands/resolve-question.ts src/commands/request-review.ts src/commands/publish-review.ts src/commands/publish-patch.ts src/cli.ts test/commands/publish-handoff.test.ts
git commit -m "feat: coordination commands (handoff, decision, question, review, patch)"
```

---

### Task 12: Read Commands and Rebuild Projections

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\get-state.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\get-landscape.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\get-history.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\get-task.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\get-decision.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\get-open-question.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\get-reviews.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\get-handoffs.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\rebuild-projections.ts`

- [ ] **Step 1: Implement get-state.ts**

get-state always reads from the authoritative ledger. No projection rebuild, no lock needed for reads.

```typescript
import { readLedger } from '../ledger/reader.js';
import type { BridgeConfig } from '../types.js';

export async function executeGetState(
  config: BridgeConfig,
  options: { filter?: string; since?: string },
): Promise<Record<string, unknown>> {
  const root = config.coordination_root;

  // Read directly from authoritative ledger - no projections needed
  const events = readLedger(root, {
    includeSuperseded: false,
    since: options.since,
  });

  // Compute open tasks by processing events in ledger order per task_id.
  // Handles reclaims correctly: claimed -> released -> claimed = still open.
  const taskState = new Map<string, { agent: string; claimed_at: string }>();
  for (const e of events) {
    const taskId = (e.payload as Record<string, unknown>).task_id as string | undefined;
    if (!taskId) continue;
    if (e.event_type === 'task.claimed') {
      taskState.set(taskId, { agent: e.agent, claimed_at: e.timestamp });
    } else if (e.event_type === 'task.released') {
      taskState.delete(taskId);
    }
  }
  const openTasks = Array.from(taskState.entries())
    .map(([task_id, state]) => ({ task_id, ...state }));

  const pendingReviews = events.filter(e => e.event_type === 'review.requested')
    .filter(req => !events.some(
      e => e.event_type === 'review.published' && e.related_events?.includes(req.event_id)
    ));

  const unresolvedQuestions = events.filter(e => e.event_type === 'question.asked')
    .filter(q => !events.some(
      e => e.event_type === 'question.resolved' && e.related_events?.includes(q.event_id)
    ));

  const recentDecisions = events
    .filter(e => e.event_type === 'decision.recorded')
    .slice(-10);

  return {
    open_tasks: openTasks,
    pending_reviews: pendingReviews.length,
    unresolved_questions: unresolvedQuestions.length,
    recent_decisions: recentDecisions.length,
    total_events: events.length,
  };
}
```

- [ ] **Step 2: Implement get-landscape.ts**

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { BridgeConfig } from '../types.js';

export async function executeGetLandscape(config: BridgeConfig): Promise<Record<string, unknown>> {
  const root = config.coordination_root;
  const result: Record<string, unknown> = {};

  for (const file of ['agents.yaml', 'projects.yaml', 'source_locations.yaml']) {
    const filePath = join(root, 'registry', file);
    if (existsSync(filePath)) {
      result[file.replace('.yaml', '')] = parseYaml(readFileSync(filePath, 'utf-8'));
    }
  }

  return result;
}
```

- [ ] **Step 3: Implement get-history.ts**

```typescript
import { readLedger } from '../ledger/reader.js';
import type { BridgeConfig, BridgeEvent } from '../types.js';

export async function executeGetHistory(
  config: BridgeConfig,
  options: { since?: string; agent?: string; type?: string; includeSuperseded?: boolean },
): Promise<BridgeEvent[]> {
  return readLedger(config.coordination_root, {
    since: options.since,
    agent: options.agent,
    eventType: options.type,
    includeSuperseded: options.includeSuperseded ?? false,
  });
}
```

- [ ] **Step 4: Implement entity lookup commands**

Entity lookup and current-state commands always read from the authoritative ledger. This avoids the supersession bug where `event.corrected` events are not in type-specific projections and therefore cannot filter out the events they correct. Projections remain as derived artifacts for `rebuild-projections`, `doctor`, and history inspection only.

```typescript
// get-task.ts
import { readLedger } from '../ledger/reader.js';
import type { BridgeConfig, BridgeEvent } from '../types.js';

export async function executeGetTask(
  config: BridgeConfig,
  options: { taskId?: string },
): Promise<BridgeEvent[]> {
  const root = config.coordination_root;
  const events = readLedger(root, { eventType: 'task.*', includeSuperseded: false });

  return options.taskId
    ? events.filter(e => (e.payload as Record<string, unknown>).task_id === options.taskId)
    : events;
}
```

All other entity commands (`get-decision`, `get-open-question`, `get-reviews`, `get-handoffs`) follow the same pattern: `readLedger(root, { eventType: '<type>.*', includeSuperseded: false })`.

- [ ] **Step 5: Implement rebuild-projections.ts**

Rebuild acquires the global write lock because it rewrites all projection files. A concurrent append during rebuild could corrupt a projection mid-write.

```typescript
import { rebuildProjections } from '../ledger/projections.js';
import { generateEventId } from '../ledger/event-id.js';
import { acquireLock, releaseLock } from '../locks/file-lock.js';
import { appendFileSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { BridgeConfig, BridgeEvent, ProjectionMeta } from '../types.js';
import { SCHEMA_VERSION, BRIDGE_VERSION } from '../types.js';

export async function executeRebuildProjections(
  config: BridgeConfig,
  dryRun: boolean,
): Promise<{ rebuilt: string[]; warnings: string[] }> {
  if (dryRun) {
    return { rebuilt: ['(dry run) all projection files'], warnings: [] };
  }

  const root = config.coordination_root;
  const stateDir = join(root, 'state');

  // Acquire write lock - projections must not be written while rebuilding
  const lockResult = await acquireLock(stateDir, {
    agent: config.agent,
    command: 'rebuild-projections',
    ttlMs: config.lock_ttl_ms,
    retries: config.lock_retries,
    retryDelayMs: config.lock_retry_delay_ms,
  });

  if (!lockResult.acquired) {
    throw Object.assign(new Error(lockResult.error ?? 'LOCK_TIMEOUT'), {
      code: 'LOCK_TIMEOUT',
    });
  }
  const lockToken = lockResult.token!;

  try {
    const result = rebuildProjections(root);

    // Log projections.rebuilt as a LEDGER-ONLY system event.
    // This event type intentionally has no projection file — it is metadata
    // about the projections themselves. Tests verify freshness remains true after.
    const event: BridgeEvent = {
      event_id: generateEventId(),
      schema_version: SCHEMA_VERSION,
      event_type: 'projections.rebuilt',
      timestamp: new Date().toISOString(),
      agent: config.agent,
      summary: `Rebuilt ${result.rebuilt.length} projection files`,
      payload: { rebuilt: result.rebuilt },
      metadata: { bridge_version: BRIDGE_VERSION, dry_run: false },
    };

    const line = JSON.stringify(event) + '\n';
    const ledgerPath = join(stateDir, 'events.jsonl');
    appendFileSync(ledgerPath, line, 'utf-8');

    // Update _meta.json to include the rebuild event
    const ledgerContent = readFileSync(ledgerPath, 'utf-8').trim();
    const eventCount = ledgerContent ? ledgerContent.split('\n').length : 0;
    const meta: ProjectionMeta = {
      last_event_id: event.event_id,
      event_count: eventCount,
      ledger_size_bytes: statSync(ledgerPath).size,
      rebuilt_at: new Date().toISOString(),
    };
    writeFileSync(join(root, 'projections', '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

    return result;
  } finally {
    releaseLock(stateDir, lockToken);
  }
}
```

- [ ] **Step 6: Register all read commands in cli.ts**

Add `program.command(...)` for each: `get-state`, `get-landscape`, `get-history`, `get-task`, `get-decision`, `get-open-question`, `get-reviews`, `get-handoffs`, `rebuild-projections`.

- [ ] **Step 7: Build and test**

```bash
npx tsc
npx vitest run
```
Expected: all tests PASS, no compile errors

- [ ] **Step 8: Commit**

```bash
git add src/commands/get-*.ts src/commands/rebuild-projections.ts src/cli.ts
git commit -m "feat: read commands (get-state, get-landscape, get-history, entity lookups) + rebuild-projections"
```

---

### Task 13: Doctor Command

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\doctor.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\commands\doctor.test.ts`

- [ ] **Step 1: Write the doctor test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeDoctor } from '../../src/commands/doctor.js';
import { initCoordination } from '../../src/commands/init-coordination.js';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BridgeConfig } from '../../src/types.js';

describe('doctor', () => {
  let root: string;
  const config: BridgeConfig = {
    coordination_root: '', agent: 'claude',
    lock_ttl_ms: 10000, lock_retries: 3, lock_retry_delay_ms: 100,
  };

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'bridge-doctor-'));
    const targetPath = join(root, 'coordination');
    await initCoordination(targetPath, false);
    config.coordination_root = targetPath;
  });

  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('passes all checks on a freshly scaffolded repo', async () => {
    const checks = await executeDoctor(config);
    const failures = checks.filter(c => c.status === 'FAIL');
    expect(failures.length).toBe(0);
  });

  it('detects invalid JSONL', async () => {
    writeFileSync(join(config.coordination_root, 'state', 'events.jsonl'), 'not json\n', 'utf-8');
    const checks = await executeDoctor(config);
    const jsonlCheck = checks.find(c => c.name === 'valid_jsonl');
    expect(jsonlCheck?.status).toBe('FAIL');
  });
});
```

- [ ] **Step 2: Implement doctor.ts**

```typescript
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { checkProjectionFreshness } from '../ledger/reader.js';
import type { BridgeConfig, DoctorCheck } from '../types.js';

export async function executeDoctor(config: BridgeConfig): Promise<DoctorCheck[]> {
  const root = config.coordination_root;
  const checks: DoctorCheck[] = [];

  // 1. Coordination root exists
  checks.push(existsSync(root)
    ? { name: 'coordination_root', status: 'PASS', message: `Root exists: ${root}` }
    : { name: 'coordination_root', status: 'FAIL', message: `Root not found: ${root}` });
  if (!existsSync(root)) return checks;

  // 2. Registry files valid
  for (const file of ['agents.yaml', 'projects.yaml', 'source_locations.yaml']) {
    const filePath = join(root, 'registry', file);
    try {
      if (!existsSync(filePath)) throw new Error('File missing');
      parseYaml(readFileSync(filePath, 'utf-8'));
      checks.push({ name: `registry_${file}`, status: 'PASS', message: `${file} loads and parses` });
    } catch (err) {
      checks.push({ name: `registry_${file}`, status: 'FAIL', message: `${file}: ${(err as Error).message}` });
    }
  }

  // 3. events.jsonl valid JSONL
  const ledgerPath = join(root, 'state', 'events.jsonl');
  if (existsSync(ledgerPath)) {
    const content = readFileSync(ledgerPath, 'utf-8').trim();
    if (!content) {
      checks.push({ name: 'valid_jsonl', status: 'PASS', message: 'events.jsonl is empty (valid)' });
    } else {
      try {
        const lines = content.split('\n');
        lines.forEach((line, i) => JSON.parse(line));
        checks.push({ name: 'valid_jsonl', status: 'PASS', message: `${lines.length} events, all valid JSON` });
      } catch (err) {
        checks.push({ name: 'valid_jsonl', status: 'FAIL', message: `Invalid JSONL: ${(err as Error).message}` });
      }
    }
  } else {
    checks.push({ name: 'valid_jsonl', status: 'FAIL', message: 'events.jsonl not found' });
  }

  // 4. No duplicate event IDs
  if (existsSync(ledgerPath)) {
    const content = readFileSync(ledgerPath, 'utf-8').trim();
    if (content) {
      try {
        const ids = content.split('\n').map(line => JSON.parse(line).event_id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        checks.push(dupes.length === 0
          ? { name: 'no_duplicate_ids', status: 'PASS', message: 'No duplicate event IDs' }
          : { name: 'no_duplicate_ids', status: 'FAIL', message: `Duplicate IDs: ${dupes.join(', ')}` });
      } catch {
        checks.push({ name: 'no_duplicate_ids', status: 'WARN', message: 'Could not check (invalid JSONL)' });
      }
    } else {
      checks.push({ name: 'no_duplicate_ids', status: 'PASS', message: 'No events to check' });
    }
  }

  // 5. Projections fresh
  const fresh = checkProjectionFreshness(root);
  checks.push(fresh
    ? { name: 'projections_fresh', status: 'PASS', message: 'Projections match ledger' }
    : { name: 'projections_fresh', status: 'WARN', message: 'Projections are stale or missing' });

  // 6. No OneDrive conflict files (v1: state/ and projections/ only; post-v1: recursive scan)
  const conflictFiles: string[] = [];
  for (const dir of ['state', 'projections', 'handoffs', 'reviews', 'patches']) {
    const dirPath = join(root, dir);
    if (existsSync(dirPath)) {
      const files = readdirSync(dirPath);
      conflictFiles.push(...files.filter(f => /\(.*\)\.\w+$/.test(f)).map(f => `${dir}/${f}`));
    }
  }
  checks.push(conflictFiles.length === 0
    ? { name: 'no_onedrive_conflicts', status: 'PASS', message: 'No OneDrive conflict files in checked dirs' }
    : { name: 'no_onedrive_conflicts', status: 'FAIL', message: `Conflict files: ${conflictFiles.join(', ')}` });
  // Post-v1: recursive scan under coordination root excluding .git and .locks

  // 7. No stale write lock
  const lockPath = join(root, 'state', '.locks', 'write.lock');
  if (existsSync(lockPath)) {
    try {
      const lock = JSON.parse(readFileSync(lockPath, 'utf-8'));
      const expired = new Date(lock.expires_at).getTime() < Date.now();
      checks.push(expired
        ? { name: 'lock_state', status: 'WARN', message: `Stale lock from ${lock.agent}/${lock.command}` }
        : { name: 'lock_state', status: 'WARN', message: `Active lock held by ${lock.agent}/${lock.command}` });
    } catch {
      checks.push({ name: 'lock_state', status: 'WARN', message: 'Corrupted lock file' });
    }
  } else {
    checks.push({ name: 'lock_state', status: 'PASS', message: 'No active locks' });
  }

  // 8. Codex CLI available and logged in via ChatGPT
  try {
    const { checkCodexLogin } = await import('../api/codex-cli.js');
    const loggedIn = await checkCodexLogin();
    checks.push(loggedIn
      ? { name: 'codex_cli', status: 'PASS', message: 'Codex CLI logged in via ChatGPT' }
      : { name: 'codex_cli', status: 'WARN', message: 'Codex CLI not logged in via ChatGPT (advisory commands will fail)' });
  } catch {
    checks.push({ name: 'codex_cli', status: 'WARN', message: 'Codex CLI not found (advisory commands will fail)' });
  }

  // 9. Validate event schemas (base event structure)
  if (existsSync(ledgerPath)) {
    const content = readFileSync(ledgerPath, 'utf-8').trim();
    if (content) {
      try {
        const { validateEvent } = await import('../schemas/validator.js');
        const lines = content.split('\n');
        const invalid: string[] = [];
        for (const line of lines) {
          const event = JSON.parse(line);
          const result = validateEvent(event);
          if (!result.valid) invalid.push(event.event_id);
        }
        checks.push(invalid.length === 0
          ? { name: 'event_schemas', status: 'PASS', message: 'All events pass base schema validation' }
          : { name: 'event_schemas', status: 'FAIL', message: `${invalid.length} events fail schema: ${invalid.slice(0, 5).join(', ')}` });
      } catch (err) {
        checks.push({ name: 'event_schemas', status: 'WARN', message: `Could not validate: ${(err as Error).message}` });
      }
    }
  }

  return checks;
}
```

- [ ] **Step 3: Register in cli.ts**

```typescript
import { executeDoctor } from './commands/doctor.js';

program
  .command('doctor')
  .description('Run health checks on the coordination state')
  .action(async () => {
    const parentOpts = program.opts();
    const config = resolveConfig(parentOpts);
    const checks = await executeDoctor(config);
    output({ checks, summary: { pass: checks.filter(c => c.status === 'PASS').length, warn: checks.filter(c => c.status === 'WARN').length, fail: checks.filter(c => c.status === 'FAIL').length } });
  });
```

- [ ] **Step 4: Run doctor test**

Run: `npx vitest run test/commands/doctor.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/doctor.ts test/commands/doctor.test.ts src/cli.ts
git commit -m "feat: doctor command with 9-point health check (including schema validation and Codex CLI status)"
```

---

### Task 14: Advisory Commands (Codex CLI + peer critique/review/brainstorm)

**Files:**
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\api\codex-cli.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\request-peer-critique.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\request-peer-review.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\src\commands\request-peer-brainstorm.ts`
- Create: `D:\OneDrive\Arthrea_Coordination_Bridge\test\commands\request-peer-critique.test.ts`

**No paid API calls.** Advisory commands shell out to `codex exec` which uses Glen's existing ChatGPT subscription. Fails closed if Codex CLI is not logged in via ChatGPT.

- [ ] **Step 1: Write the advisory test (with mocked codex-cli module)**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeRequestPeerCritique } from '../../src/commands/request-peer-critique.js';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BridgeConfig } from '../../src/types.js';

vi.mock('../../src/api/codex-cli.js', () => ({
  checkCodexLogin: vi.fn().mockResolvedValue(true),
  callCodexExec: vi.fn().mockResolvedValue({
    success: true,
    response: 'Weak assumption: no rollback plan. If the UUID migration fails halfway, you have no recovery path.',
  }),
}));

function makeTestRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'bridge-advisory-'));
  mkdirSync(join(root, 'state', '.locks'), { recursive: true });
  mkdirSync(join(root, 'projections'), { recursive: true });
  mkdirSync(join(root, 'scratch'), { recursive: true });
  writeFileSync(join(root, 'state', 'events.jsonl'), '', 'utf-8');
  writeFileSync(join(root, 'projections', '_meta.json'), JSON.stringify({
    last_event_id: '', event_count: 0, ledger_size_bytes: 0, rebuilt_at: new Date().toISOString(),
  }), 'utf-8');
  return root;
}

describe('request-peer-critique', () => {
  let root: string;
  const config: BridgeConfig = {
    coordination_root: '', agent: 'claude',
    lock_ttl_ms: 10000,
    lock_retries: 3, lock_retry_delay_ms: 100,
  };

  beforeEach(() => {
    root = makeTestRoot();
    config.coordination_root = root;
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('logs a completed event on successful codex exec call', async () => {
    const result = await executeRequestPeerCritique({
      idea: 'Migrate all entities to UUIDs',
    }, config);

    expect(result.event_type).toBe('peer.critique.completed');
    const ledger = readFileSync(join(root, 'state', 'events.jsonl'), 'utf-8').trim();
    const event = JSON.parse(ledger);
    expect(event.payload.response).toContain('Weak assumption');
    expect(event.payload.provider).toBe('codex-cli');
  });

  it('logs a failed event when codex exec fails', async () => {
    const { callCodexExec } = await import('../../src/api/codex-cli.js');
    (callCodexExec as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: 'Codex CLI exited with code 1',
    });

    const result = await executeRequestPeerCritique({
      idea: 'Test idea',
    }, config);

    expect(result.event_type).toBe('peer.critique.failed');
  });

  it('logs failed event and throws when Codex CLI is not logged in', async () => {
    const { checkCodexLogin } = await import('../../src/api/codex-cli.js');
    (checkCodexLogin as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    await expect(
      executeRequestPeerCritique({ idea: 'Test' }, config),
    ).rejects.toThrow(/not logged in/);

    // Verify the failure was logged as an auditable event
    const ledger = readFileSync(join(root, 'state', 'events.jsonl'), 'utf-8').trim();
    expect(ledger.length).toBeGreaterThan(0);
    const event = JSON.parse(ledger);
    expect(event.event_type).toBe('peer.critique.failed');
    expect(event.payload.auth_status).toBe('not_logged_in');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/commands/request-peer-critique.test.ts`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement codex-cli.ts**

On Windows, `execFile('codex', ...)` fails with EPERM/EINVAL because `codex` resolves to `codex.cmd`. Use `spawn` with `shell: true`. Also, `codex login status` may emit output on stderr, not stdout - check both.

```typescript
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { monotonicFactory } from 'ulid';

const fileUlid = monotonicFactory();

interface CodexResult {
  success: boolean;
  response?: string;
  error?: string;
  exitCode?: number;
}

function runCodex(args: string[], options?: {
  stdin?: string;
  timeout?: number;
}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, {
      shell: true,
      timeout: options?.timeout ?? 30000,
    });

    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk.toString()));

    if (options?.stdin && child.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: stdout.join(''),
        stderr: stderr.join(''),
      });
    });

    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout: stdout.join(''),
        stderr: err.message,
      });
    });
  });
}

export async function checkCodexLogin(): Promise<boolean> {
  const result = await runCodex(['login', 'status'], { timeout: 10000 });
  // Check both stdout AND stderr - Codex CLI may emit on either
  const combined = result.stdout + result.stderr;
  // Fail closed: must be ChatGPT login, not API key
  return combined.includes('Logged in using ChatGPT');
}

export async function callCodexExec(params: {
  prompt: string;
  coordinationRoot: string;
  workingDir?: string;
}): Promise<CodexResult> {
  const scratchDir = join(params.coordinationRoot, 'scratch');
  if (!existsSync(scratchDir)) mkdirSync(scratchDir, { recursive: true });

  const outputFile = join(scratchDir, `codex-response-${fileUlid()}.md`);
  const workDir = params.workingDir ?? join('D:', 'OneDrive', 'codex', 'Foundry');

  const result = await runCodex(
    [
      'exec',
      '--skip-git-repo-check',
      '--output-last-message', `"${outputFile}"`,
      '-C', `"${workDir}"`,
      '-',
    ],
    { stdin: params.prompt, timeout: 300000 },
  );

  if (result.exitCode !== 0) {
    return {
      success: false,
      error: (result.stderr || result.stdout || 'Unknown error').slice(0, 500),
      exitCode: result.exitCode,
    };
  }

  try {
    if (existsSync(outputFile)) {
      return { success: true, response: readFileSync(outputFile, 'utf-8') };
    }
    return { success: false, error: 'Codex exec completed but no output file written' };
  } catch (readErr) {
    return { success: false, error: `Failed to read output: ${(readErr as Error).message}` };
  }
}
```

- [ ] **Step 4: Implement request-peer-critique.ts**

```typescript
import { generateEventId } from '../ledger/event-id.js';
import { validateEvent } from '../schemas/validator.js';
import { appendEvent } from '../ledger/writer.js';
import { checkCodexLogin, callCodexExec } from '../api/codex-cli.js';
import type { BridgeConfig, BridgeEvent, WriteResponse } from '../types.js';
import { SCHEMA_VERSION, BRIDGE_VERSION } from '../types.js';

const MAX_RESPONSE_CHARS = 50000;
const MAX_PROMPT_SUMMARY = 2000;

interface CritiqueInput {
  idea: string;
  context?: string;
}

export async function executeRequestPeerCritique(
  input: CritiqueInput,
  config: BridgeConfig,
): Promise<WriteResponse> {
  // Fail closed: must be logged in via ChatGPT
  const loggedIn = await checkCodexLogin();
  if (!loggedIn) {
    // Log the failure as an auditable event BEFORE failing
    const failEvent: BridgeEvent = {
      event_id: generateEventId(),
      schema_version: SCHEMA_VERSION,
      event_type: 'peer.critique.failed',
      timestamp: new Date().toISOString(),
      agent: config.agent,
      summary: 'Peer critique failed: Codex CLI not logged in via ChatGPT',
      payload: {
        provider: 'codex-cli',
        error_message: 'Codex CLI is not logged in via ChatGPT',
        auth_status: 'not_logged_in',
      },
      metadata: { bridge_version: BRIDGE_VERSION, dry_run: false },
    };
    await appendEvent(failEvent, config);

    throw Object.assign(
      new Error('Codex CLI not logged in via ChatGPT. Run: codex login'),
      { code: 'ADVISORY_NOT_AVAILABLE' },
    );
  }

  const prompt = [
    'You are an adversarial thinker. Poke holes in this idea.',
    'Find weak assumptions, missing considerations, failure modes.',
    'Be constructive - identify problems AND suggest fixes.',
    'Do not invent problems that do not exist.',
    '',
    '---',
    '',
    input.idea,
    ...(input.context ? ['', 'Context:', input.context] : []),
  ].join('\n');

  let event: BridgeEvent;

  // Call Codex CLI (NO lock held - per spec section 4.5)
  const result = await callCodexExec({
    prompt,
    coordinationRoot: config.coordination_root,
  });

  if (result.success && result.response) {
    const truncated = result.response.length > MAX_RESPONSE_CHARS;
    event = {
      event_id: generateEventId(),
      schema_version: SCHEMA_VERSION,
      event_type: 'peer.critique.completed',
      timestamp: new Date().toISOString(),
      agent: config.agent,
      summary: `Peer critique via Codex CLI: ${result.response.slice(0, 100)}...`,
      payload: {
        provider: 'codex-cli',
        prompt_summary: input.idea.slice(0, MAX_PROMPT_SUMMARY),
        response: truncated ? result.response.slice(0, MAX_RESPONSE_CHARS) : result.response,
        truncated,
      },
      metadata: { bridge_version: BRIDGE_VERSION, dry_run: false },
    };
  } else {
    event = {
      event_id: generateEventId(),
      schema_version: SCHEMA_VERSION,
      event_type: 'peer.critique.failed',
      timestamp: new Date().toISOString(),
      agent: config.agent,
      summary: `Peer critique failed: ${(result.error ?? 'unknown').slice(0, 100)}`,
      payload: {
        provider: 'codex-cli',
        error_message: (result.error ?? 'unknown').slice(0, 500),
        exit_code: result.exitCode ?? null,
      },
      metadata: { bridge_version: BRIDGE_VERSION, dry_run: false },
    };
  }

  const validation = validateEvent(event);
  if (!validation.valid) {
    throw Object.assign(new Error(`Validation failed: ${JSON.stringify(validation.errors)}`), { code: 'VALIDATION_FAILED' });
  }

  // Write to ledger AFTER Codex call (lock acquired inside appendEvent)
  return appendEvent(event, config);
}
```

- [ ] **Step 5: Implement request-peer-review.ts and request-peer-brainstorm.ts**

Same pattern as critique, different system prompt text:

- Review: `"You are a senior engineer doing a thorough code/plan review. Be specific. Cite line numbers. Flag bugs, security issues, missed edge cases. If solid, say so."`
- Brainstorm: `"You are a creative collaborator. Generate diverse ideas, options, and alternatives. Consider unconventional approaches. Structure your response as numbered options with trade-offs."`

- [ ] **Step 6: Register advisory commands in cli.ts**

```typescript
program
  .command('request-peer-critique')
  .description('Request adversarial critique via Codex CLI (ChatGPT login, no paid API)')
  .action(async () => {
    const parentOpts = program.opts();
    validateGlenAgent(parentOpts);
    const config = resolveConfig(parentOpts);
    const stdinData = await readStdin();
    try {
      const result = await executeRequestPeerCritique(stdinData as any, config);
      output(result);
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      output({ error: true, code: e.code ?? 'ERROR', message: e.message });
      process.exit(1);
    }
  });
```

- [ ] **Step 7: Run advisory test**

Run: `npx vitest run test/commands/request-peer-critique.test.ts`
Expected: 3 tests PASS (success, exec failure, login failure)

- [ ] **Step 8: Commit**

```bash
git add src/api/codex-cli.ts src/commands/request-peer-critique.ts src/commands/request-peer-review.ts src/commands/request-peer-brainstorm.ts test/commands/request-peer-critique.test.ts src/cli.ts
git commit -m "feat: advisory collaboration via Codex CLI (ChatGPT login, no paid API)"
```

---

### Task 15: Scaffold Coordination Repo and End-to-End Smoke Test

**Files:**
- Run: `init-coordination` against the real target path
- Verify: doctor passes on freshly created repo

- [ ] **Step 1: Build the bridge**

```bash
cd "D:\OneDrive\Arthrea_Coordination_Bridge"
npx tsc
```

- [ ] **Step 2: Scaffold the coordination repo**

```bash
node dist/cli.js init-coordination --path "D:\OneDrive\Arthrea_Coordination"
# Note: init-coordination has no global options needed before it
```

- [ ] **Step 3: Initialise git in coordination repo**

```bash
cd "D:\OneDrive\Arthrea_Coordination"
git init
git add .
git commit -m "chore: initial coordination repo scaffold"
```

- [ ] **Step 4: Run doctor against the real repo**

```bash
cd "D:\OneDrive\Arthrea_Coordination_Bridge"
node dist/cli.js --coordination-root "D:\OneDrive\Arthrea_Coordination" --agent claude doctor
```

Expected: all checks PASS (codex_cli may WARN if Codex CLI not installed/logged in)

- [ ] **Step 5: End-to-end task lifecycle**

```bash
# Global options before subcommand (Commander default)
node dist/cli.js --agent claude --coordination-root "D:\OneDrive\Arthrea_Coordination" create-task --task-id test-e2e --title "E2E smoke test"
node dist/cli.js --agent claude --coordination-root "D:\OneDrive\Arthrea_Coordination" claim-task --task-id test-e2e
node dist/cli.js --coordination-root "D:\OneDrive\Arthrea_Coordination" get-task --task-id test-e2e
node dist/cli.js --agent claude --coordination-root "D:\OneDrive\Arthrea_Coordination" release-task --task-id test-e2e --status completed
node dist/cli.js --coordination-root "D:\OneDrive\Arthrea_Coordination" get-state
```

Expected: each command succeeds, get-state shows no open tasks after release.

- [ ] **Step 6: Run full test suite**

```bash
cd "D:\OneDrive\Arthrea_Coordination_Bridge"
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 7: Set up environment for daily use**

Add to Glen's shell profile or `.env`:
```
ARTHREA_COORDINATION_ROOT=D:\OneDrive\Arthrea_Coordination
ARTHREA_AGENT=claude
```

Create `~/.arthrea-bridge.yaml`:
```yaml
coordination_root: "D:\\OneDrive\\Arthrea_Coordination"
agent: claude
# auto_commit removed from v1
```

- [ ] **Step 8: Final commit on bridge repo**

```bash
cd "D:\OneDrive\Arthrea_Coordination_Bridge"
git add .
git commit -m "feat: complete bridge v1.0.0 - ready for Claude-Codex coordination"
```
