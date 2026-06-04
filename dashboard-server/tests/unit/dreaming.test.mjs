import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function mockPool(...queryResults) {
  let callIndex = 0;
  return {
    query: vi.fn(async () => {
      const result = queryResults[callIndex] || { rows: [] };
      callIndex++;
      return result;
    }),
  };
}

function baseCtx(pool) {
  return {
    pool: pool || mockPool(),
    log: vi.fn(),
    fs: require('fs'),
    path: require('path'),
  };
}

// ── Bug Velocity ──────────────────────────────────────────────────

describe('Bug Velocity Analyser', () => {
  const bugVelocity = require('../../cron/dreaming/bug-velocity');

  it('returns warning when bugs opened > closed by more than 2', async () => {
    const pool = mockPool(
      { rows: [{ opened: '8', closed: '2' }] },   // current week
      { rows: [{ opened: '3', closed: '3' }] },   // prior week
      { rows: [] },                                 // stale bugs
      { rows: [{ count: '0' }] }                    // please_review
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    const growing = result.insights.find(i => i.title === 'Bug backlog growing');
    expect(growing).toBeDefined();
    expect(growing.severity).toBe('critical'); // net 6 > 5
    expect(result.trends.bugs_velocity.trend).toBe('worsening');
  });

  it('returns achievement when bugs closed > opened by more than 2', async () => {
    const pool = mockPool(
      { rows: [{ opened: '1', closed: '5' }] },
      { rows: [{ opened: '2', closed: '2' }] },
      { rows: [] },
      { rows: [{ count: '0' }] }
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    const shrinking = result.insights.find(i => i.title === 'Bug backlog shrinking');
    expect(shrinking).toBeDefined();
    expect(result.trends.bugs_velocity.trend).toBe('improving');
  });

  it('detects stale bugs older than 14 days', async () => {
    const pool = mockPool(
      { rows: [{ opened: '0', closed: '0' }] },
      { rows: [{ opened: '0', closed: '0' }] },
      { rows: [{ id: 1, title: 'Old bug', status: 'open', priority: 'high', created_at: '2025-01-01' }] },
      { rows: [{ count: '0' }] }
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    const stale = result.insights.find(i => i.title.includes('bugs open longer than 14 days'));
    expect(stale).toBeDefined();
  });

  it('detects please_review queue buildup', async () => {
    const pool = mockPool(
      { rows: [{ opened: '0', closed: '0' }] },
      { rows: [{ opened: '0', closed: '0' }] },
      { rows: [] },
      { rows: [{ count: '10' }] }
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    const review = result.insights.find(i => i.title.includes('bugs awaiting review'));
    expect(review).toBeDefined();
    expect(review.severity).toBe('info');
  });

  it('returns no insights when everything is balanced', async () => {
    const pool = mockPool(
      { rows: [{ opened: '3', closed: '3' }] },
      { rows: [{ opened: '3', closed: '3' }] },
      { rows: [] },
      { rows: [{ count: '2' }] }
    );
    const result = await bugVelocity.analyse(baseCtx(pool));
    expect(result.insights).toHaveLength(0);
    expect(result.trends.bugs_velocity.trend).toBe('stable');
  });
});

// ── Task Velocity ─────────────────────────────────────────────────

describe('Task Velocity Analyser', () => {
  const taskVelocity = require('../../cron/dreaming/task-velocity');

  it('warns when tasks added exceed completed by more than 5', async () => {
    const pool = mockPool(
      { rows: [{ completed: '2', added: '10' }] },
      { rows: [{ completed: '5', added: '5' }] },
      { rows: [] },  // stalled
      { rows: [] }   // zero movement
    );
    const result = await taskVelocity.analyse(baseCtx(pool));
    const growing = result.insights.find(i => i.title.includes('growing faster'));
    expect(growing).toBeDefined();
    expect(growing.severity).toBe('warning');
  });

  it('detects stalled tasks', async () => {
    const pool = mockPool(
      { rows: [{ completed: '5', added: '5' }] },
      { rows: [{ completed: '5', added: '5' }] },
      { rows: [{ id: 1, title: 'Stalled task', status: 'In Progress', client_name: 'TestCo', updated_at: '2025-01-01' }] },
      { rows: [] }
    );
    const result = await taskVelocity.analyse(baseCtx(pool));
    const stalled = result.insights.find(i => i.title.includes('stalled'));
    expect(stalled).toBeDefined();
  });

  it('detects zero-movement clients', async () => {
    const pool = mockPool(
      { rows: [{ completed: '5', added: '5' }] },
      { rows: [{ completed: '5', added: '5' }] },
      { rows: [] },
      { rows: [{ client_name: 'Dormant Ltd', active_count: 12 }] }
    );
    const result = await taskVelocity.analyse(baseCtx(pool));
    const dormant = result.insights.find(i => i.title.includes('no movement'));
    expect(dormant).toBeDefined();
    expect(dormant.evidence).toContain('client:Dormant Ltd');
  });
});

// ── Achievements ──────────────────────────────────────────────────

describe('Achievements Analyser', () => {
  const achievements = require('../../cron/dreaming/achievements');

  it('detects bug fix momentum', async () => {
    const pool = mockPool(
      { rows: [{ opened: '1', closed: '5' }] },
      { rows: [] },  // milestones
      { rows: [] },  // cleared backlogs
      { rows: [] }   // on-track clients
    );
    const result = await achievements.analyse(baseCtx(pool));
    const momentum = result.insights.find(i => i.title === 'Bug fix momentum');
    expect(momentum).toBeDefined();
  });

  it('detects milestone hits', async () => {
    const pool = mockPool(
      { rows: [{ opened: '0', closed: '0' }] },
      { rows: [{ client_name: 'Acme', title: 'Sprint 1', pct: 90 }] },
      { rows: [] },
      { rows: [] }
    );
    const result = await achievements.analyse(baseCtx(pool));
    const milestone = result.insights.find(i => i.title.includes('reached'));
    expect(milestone).toBeDefined();
    expect(milestone.title).toContain('Acme');
  });

  it('detects on-track clients', async () => {
    const pool = mockPool(
      { rows: [{ opened: '0', closed: '0' }] },
      { rows: [] },
      { rows: [] },
      { rows: [{ client_name: 'GoodCo', total: 10 }] }
    );
    const result = await achievements.analyse(baseCtx(pool));
    const onTrack = result.insights.find(i => i.title.includes('on track'));
    expect(onTrack).toBeDefined();
  });
});

// ── Capacity Pressure ─────────────────────────────────────────────

describe('Capacity Pressure Analyser', () => {
  const capacityPressure = require('../../cron/dreaming/capacity-pressure');

  it('flags overloaded team members', async () => {
    const pool = mockPool(
      { rows: [{ display_name: 'Alice', capacity_hours_per_week: 40 }] },
      { rows: [{ assignee: 'Alice', task_count: 16 }] },
      { rows: [{ avg_util: 160 }] }
    );
    const result = await capacityPressure.analyse(baseCtx(pool));
    const overloaded = result.insights.find(i => i.title.includes('Alice'));
    expect(overloaded).toBeDefined();
    expect(overloaded.severity).toBe('critical'); // 16*4=64, 64/40=160% > 150%
  });

  it('returns improving trend when nobody is overloaded', async () => {
    const pool = mockPool(
      { rows: [{ display_name: 'Bob', capacity_hours_per_week: 40 }] },
      { rows: [{ assignee: 'Bob', task_count: 5 }] },
      { rows: [{ avg_util: 50 }] }
    );
    const result = await capacityPressure.analyse(baseCtx(pool));
    expect(result.insights).toHaveLength(0);
    expect(result.trends.capacity_pressure.trend).toBe('improving');
  });
});

// ── Memory Staleness ──────────────────────────────────────────────

describe('Memory Staleness Analyser', () => {
  const memoryStaleness = require('../../cron/dreaming/memory-staleness');

  it('returns empty when memory dir does not exist', async () => {
    const mockFs = {
      existsSync: vi.fn(() => false),
      readdirSync: vi.fn(() => []),
      statSync: vi.fn(),
      readFileSync: vi.fn(),
    };
    const ctx = { ...baseCtx(), fs: mockFs, path: require('path') };
    const result = await memoryStaleness.analyse(ctx);
    expect(result.insights).toHaveLength(0);
    expect(result.stale_report.memory_files).toHaveLength(0);
  });

  it('detects broken references in memory files', async () => {
    const oldDate = new Date(Date.now() - 100 * 86400000);
    const mockFs = {
      existsSync: vi.fn((p) => {
        if (p.includes('memory')) return true;
        if (p.includes('nonexistent.js')) return false;
        return true;
      }),
      readdirSync: vi.fn(() => ['test_memory.md']),
      statSync: vi.fn(() => ({ mtime: oldDate })),
      readFileSync: vi.fn(() => 'Reference to `nonexistent.js` in code.'),
    };
    const ctx = { ...baseCtx(), fs: mockFs, path: require('path') };
    const result = await memoryStaleness.analyse(ctx);
    expect(result.stale_report.memory_files.length).toBeGreaterThan(0);
    const entry = result.stale_report.memory_files[0];
    expect(entry.broken_refs).toBe(true);
  });
});

// ── Brain Coherence ───────────────────────────────────────────────

describe('Brain Coherence Analyser', () => {
  const brainCoherence = require('../../cron/dreaming/brain-coherence');

  it('detects client mismatches between DB and brain', async () => {
    const pool = mockPool(
      { rows: [{ name: 'NewClient' }] },  // clients query
      { rows: [] }                          // users query
    );
    const mockFs = {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => '## ExistingClient\nSome content'),
      readdirSync: vi.fn(() => ['clients_detailed.md']),
      statSync: vi.fn(() => ({ mtime: new Date() })),
    };
    const ctx = { ...baseCtx(pool), fs: mockFs, path: require('path') };
    const result = await brainCoherence.analyse(ctx);
    expect(result.cross_refs.brain_db_drift.length).toBeGreaterThan(0);
    expect(result.cross_refs.brain_db_drift[0].type).toBe('client_mismatch');
  });
});

// ── Skill Coverage ────────────────────────────────────────────────

describe('Skill Coverage Analyser', () => {
  const skillCoverage = require('../../cron/dreaming/skill-coverage');

  it('detects skills without learnings and roles without knowledge', async () => {
    const mockFs = {
      existsSync: vi.fn((p) => {
        if (p.includes('learnings.md')) return false;
        if (p.includes('knowledge')) return false;
        return true;
      }),
      readdirSync: vi.fn((dir, opts) => {
        if (dir.includes('skills')) {
          return Array.from({ length: 8 }, (_, i) => ({
            isDirectory: () => true,
            name: 'skill-' + i,
          }));
        }
        if (dir.includes('roles')) {
          return Array.from({ length: 5 }, (_, i) => ({
            isDirectory: () => true,
            name: i === 0 ? '_template' : 'role-' + i,
          }));
        }
        return [];
      }),
    };
    const ctx = { ...baseCtx(), fs: mockFs, path: require('path') };
    const result = await skillCoverage.analyse(ctx);
    expect(result.stale_report.skills_without_learnings.length).toBe(8);
    expect(result.stale_report.roles_without_knowledge.length).toBe(4);
    const skillGap = result.insights.find(i => i.title.includes('skills have no learnings'));
    expect(skillGap).toBeDefined();
    const roleGap = result.insights.find(i => i.title.includes('roles have no knowledge'));
    expect(roleGap).toBeDefined();
  });
});

// ── Orchestrator ──────────────────────────────────────────────────

describe('Dreaming Engine Orchestrator', () => {
  const { runDreamingEngine, insightId } = require('../../cron/dreaming/index');

  it('generates deterministic insight IDs', () => {
    const id1 = insightId('risk', 'Bug backlog growing', ['opened_7d:8', 'closed_7d:2']);
    const id2 = insightId('risk', 'Bug backlog growing', ['closed_7d:2', 'opened_7d:8']);
    expect(id1).toBe(id2); // sorted evidence
    expect(id1).toHaveLength(12);
  });

  it('continues when an analyser throws', async () => {
    const pool = mockPool(
      // The pool will return empty rows for all queries.
      // Some analysers will get undefined rows and may throw,
      // but the orchestrator should catch those and continue.
      ...Array(30).fill({ rows: [{ opened: '0', closed: '0', completed: '0', added: '0', count: '0', avg_util: '0' }] })
    );

    // Mock fs to avoid filesystem-dependent analysers throwing
    const mockFs = {
      existsSync: vi.fn(() => false),
      readdirSync: vi.fn(() => []),
      statSync: vi.fn(() => ({ mtime: new Date() })),
      readFileSync: vi.fn(() => ''),
    };

    const ctx = {
      pool,
      log: vi.fn(),
      fs: mockFs,
      path: require('path'),
    };

    const result = await runDreamingEngine(ctx);
    expect(result).toBeDefined();
    expect(result.analysers_run).toBe(7);
    expect(Array.isArray(result.insights)).toBe(true);
    expect(result.trends).toBeDefined();
  });
});
