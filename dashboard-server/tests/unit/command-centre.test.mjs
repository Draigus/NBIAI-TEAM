// dashboard-server/tests/unit/command-centre.test.mjs
//
// Unit tests for the Command Centre route module scanners.
// Imports the factory function with a mock pool and calls _computeSnapshot()
// to verify all scanners run and return the expected shape without a real DB.

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
import express from 'express';
import request from 'supertest';
const require = createRequire(import.meta.url);

const routeFactory = require('../../routes/command-centre.js');

function makeRouter(poolOverride) {
  const mockPool = poolOverride || { query: vi.fn().mockResolvedValue({ rows: [] }) };
  return routeFactory({
    pool: mockPool,
    log: vi.fn(),
    requireNBI: (req, res, next) => next(),
    _msalClient: null,
  });
}

describe('Command Centre', () => {
  describe('GET /api/command-centre/snapshot', () => {
    it('returns a router with _computeSnapshot attached', () => {
      const router = makeRouter();
      expect(router).toBeDefined();
      expect(typeof router._computeSnapshot).toBe('function');
    });
  });

  describe('computeSnapshot', () => {
    it('runs all scanners and returns four_cs scores', async () => {
      const router = makeRouter();
      const snapshot = await router._computeSnapshot();
      expect(snapshot).toHaveProperty('four_cs');
      expect(snapshot.four_cs).toHaveProperty('context');
      expect(snapshot.four_cs).toHaveProperty('connections');
      expect(snapshot.four_cs).toHaveProperty('capabilities');
      expect(snapshot.four_cs).toHaveProperty('cadence');
      expect(typeof snapshot.four_cs.context.score).toBe('number');
      expect(snapshot.four_cs.context.max).toBe(10);
    });

    it('scanSkills returns array of skill objects', async () => {
      const router = makeRouter();
      const snapshot = await router._computeSnapshot();
      expect(Array.isArray(snapshot.skills)).toBe(true);
      if (snapshot.skills.length > 0) {
        expect(snapshot.skills[0]).toHaveProperty('name');
        expect(snapshot.skills[0]).toHaveProperty('last_modified');
        expect(snapshot.skills[0]).toHaveProperty('has_learnings');
      }
    });

    it('scanMemory returns health object', async () => {
      const router = makeRouter();
      const snapshot = await router._computeSnapshot();
      expect(snapshot.memory).toHaveProperty('health');
      expect(typeof snapshot.memory.health.total).toBe('number');
      expect(typeof snapshot.memory.health.fresh).toBe('number');
    });

    it('scanBrain returns roles array', async () => {
      const router = makeRouter();
      const snapshot = await router._computeSnapshot();
      expect(snapshot.brain).toHaveProperty('roles');
      expect(Array.isArray(snapshot.brain.roles)).toBe(true);
    });

    it('scanConnections returns buckets object', async () => {
      const router = makeRouter();
      const snapshot = await router._computeSnapshot();
      expect(snapshot.connections).toHaveProperty('buckets');
      expect(snapshot.connections).toHaveProperty('local_mcp');
      expect(snapshot.connections).toHaveProperty('cloud_mcp');
      const buckets = snapshot.connections.buckets;
      expect(buckets).toHaveProperty('tasks');
      expect(buckets).toHaveProperty('knowledge');
    });

    it('scanSessions returns stats and live_state', async () => {
      const router = makeRouter();
      const snapshot = await router._computeSnapshot();
      expect(snapshot.sessions).toHaveProperty('stats');
      expect(snapshot.sessions).toHaveProperty('live_state');
      expect(typeof snapshot.sessions.stats.total_this_week).toBe('number');
    });

    it('scanBugs returns by_status and by_priority', async () => {
      const router = makeRouter();
      const snapshot = await router._computeSnapshot();
      expect(snapshot.bugs).toHaveProperty('by_status');
      expect(snapshot.bugs).toHaveProperty('by_priority');
      expect(snapshot.bugs).toHaveProperty('recent_activity');
    });

    it('four_cs scores are bounded 0-10', async () => {
      const router = makeRouter();
      const snapshot = await router._computeSnapshot();
      ['context', 'connections', 'capabilities', 'cadence'].forEach(key => {
        const c = snapshot.four_cs[key];
        expect(c.score).toBeGreaterThanOrEqual(0);
        expect(c.score).toBeLessThanOrEqual(10);
        expect(c.max).toBe(10);
        expect(Array.isArray(c.details)).toBe(true);
      });
    });
  });
});

// ——— HTTP endpoint tests via supertest ———

function makeApp(poolOverride) {
  const app = express();
  const mockPool = poolOverride || { query: vi.fn().mockResolvedValue({ rows: [] }) };
  const router = routeFactory({
    pool: mockPool,
    log: vi.fn(),
    requireNBI: (req, res, next) => next(),
    _msalClient: null,
  });
  app.use(router);
  return { app, mockPool };
}

function makeMockPool(overrides = {}) {
  return {
    query: vi.fn().mockImplementation((sql) => {
      // Stats query (client-work) — must be checked before 'Blocked' pattern
      // since stats SQL contains "status = 'Blocked'" as a FILTER clause
      if (sql.includes('FILTER') && sql.includes('open_tasks')) {
        return { rows: overrides.stats || [{ open_tasks: '0', overdue: '0', blocked: '0', due_today: '0', due_this_week: '0' }] };
      }
      // Critical bugs query
      if (sql.includes('bug_reports') && sql.includes('critical')) {
        return { rows: overrides.criticalBugs || [] };
      }
      // Review bugs query
      if (sql.includes('bug_reports') && sql.includes('please_review')) {
        return { rows: overrides.reviewBugs || [] };
      }
      // Recent fixes query
      if (sql.includes('bug_reports') && sql.includes('resolved')) {
        return { rows: overrides.recentFixes || [] };
      }
      // Bug hotspots
      if (sql.includes('bug_reports') && sql.includes('page')) {
        return { rows: overrides.hotspots || [] };
      }
      // Overdue with clients (fires)
      if (sql.includes('due_date::date <') && sql.includes('client_name')) {
        return { rows: overrides.overdueWithClients || [] };
      }
      // Blocked items (briefing query — simple "status = 'Blocked'" without FILTER)
      if (sql.includes("status = 'Blocked'") && !sql.includes('FILTER')) {
        return { rows: overrides.blocked || [] };
      }
      // CC snapshots
      if (sql.includes('cc_snapshots')) {
        return { rows: overrides.snapshots || [] };
      }
      // Client-work: per-client counts (GROUP BY c.name, c.id)
      if (sql.includes('GROUP BY c.name')) {
        return { rows: overrides.clients || [] };
      }
      // Velocity (DATE_TRUNC)
      if (sql.includes('DATE_TRUNC')) {
        return { rows: overrides.velocity || [] };
      }
      if (sql.includes('finance_data')) {
        return { rows: overrides.financeData || [] };
      }
      return { rows: [] };
    }),
  };
}

describe('Command Centre — Briefing endpoint', () => {
  it('GET /api/command-centre/briefing returns fires array in response', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/command-centre/briefing');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('fires');
    expect(Array.isArray(res.body.data.fires)).toBe(true);
  });

  it('fires array is empty when no critical items exist', async () => {
    const pool = makeMockPool({});
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/briefing');
    expect(res.status).toBe(200);
    expect(res.body.data.fires).toEqual([]);
  });

  it('fires contain correct shape when critical bugs exist', async () => {
    const pool = makeMockPool({
      criticalBugs: [
        { id: 101, title: 'Server crash on login', priority: 'critical', created_at: '2026-05-10T00:00:00Z' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/briefing');
    expect(res.status).toBe(200);

    const fires = res.body.data.fires;
    expect(fires.length).toBeGreaterThanOrEqual(1);

    const fire = fires[0];
    expect(fire).toHaveProperty('severity');
    expect(fire).toHaveProperty('title');
    expect(fire).toHaveProperty('client');
    expect(fire).toHaveProperty('link_type');
    expect(fire).toHaveProperty('link_id');
    expect(fire).toHaveProperty('age_days');
    expect(fire.severity).toBe('CRITICAL');
    expect(fire.title).toBe('Server crash on login');
    expect(fire.client).toBe('WorkSage');
    expect(fire.link_type).toBe('bug');
    expect(fire.link_id).toBe(101);
    expect(typeof fire.age_days).toBe('number');
  });

  it('fires include overdue tasks with client names', async () => {
    const pool = makeMockPool({
      overdueWithClients: [
        { id: 55, title: 'Overdue delivery', due_date: '2026-05-01', priority: 'high', client_name: 'Couch Heroes' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/briefing');
    expect(res.status).toBe(200);

    const overdueFire = res.body.data.fires.find(f => f.link_id === 55);
    expect(overdueFire).toBeDefined();
    expect(overdueFire.client).toBe('Couch Heroes');
    expect(overdueFire.link_type).toBe('task');
    expect(overdueFire.severity).toContain('LATE');
  });

  it('fires include blocked items', async () => {
    const pool = makeMockPool({
      blocked: [
        { id: 77, title: 'Blocked feature', status: 'Blocked', priority: 'medium', due_date: null, client_id: null },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/briefing');
    expect(res.status).toBe(200);

    const blockedFire = res.body.data.fires.find(f => f.link_id === 77);
    expect(blockedFire).toBeDefined();
    expect(blockedFire.severity).toBe('BLOCKED');
  });

  it('briefing response includes all expected top-level keys', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/command-centre/briefing');
    expect(res.status).toBe(200);

    const data = res.body.data;
    expect(data).toHaveProperty('date');
    expect(data).toHaveProperty('critical');
    expect(data).toHaveProperty('fires');
    expect(data).toHaveProperty('calendar');
    expect(data).toHaveProperty('work_queue');
    expect(data).toHaveProperty('bugs');
    expect(data).toHaveProperty('claude_state');
    expect(data).toHaveProperty('client_deliveries');
    expect(data).toHaveProperty('knowledge_flags');
    expect(res.body.error).toBeNull();
  });
});

describe('Command Centre — Client-work endpoint', () => {
  it('GET /api/command-centre/client-work returns correct response shape', async () => {
    const pool = makeMockPool({
      clients: [
        { client_name: 'Couch Heroes', client_id: 1, done: '10', in_progress: '3', todo: '5', total: '18' },
        { client_name: 'NBI Internal', client_id: 2, done: '20', in_progress: '2', todo: '8', total: '30' },
      ],
      velocity: [
        { week_start: '2026-05-05', completed: '7' },
        { week_start: '2026-05-12', completed: '12' },
      ],
      stats: [{ open_tasks: '15', overdue: '3', blocked: '1', due_today: '2', due_this_week: '6' }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/client-work');
    expect(res.status).toBe(200);

    const data = res.body.data;
    expect(data).toHaveProperty('clients');
    expect(data).toHaveProperty('velocity');
    expect(data).toHaveProperty('stats');
    expect(res.body.error).toBeNull();
  });

  it('clients array has correct object shape', async () => {
    const pool = makeMockPool({
      clients: [
        { client_name: 'Couch Heroes', client_id: 1, done: '10', in_progress: '3', todo: '5', total: '18' },
      ],
      stats: [{ open_tasks: '5', overdue: '2', blocked: '1', due_today: '3', due_this_week: '4' }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/client-work');
    expect(res.status).toBe(200);

    const client = res.body.data.clients[0];
    expect(client).toHaveProperty('name', 'Couch Heroes');
    expect(client).toHaveProperty('id', 1);
    expect(client).toHaveProperty('done', 10);
    expect(client).toHaveProperty('in_progress', 3);
    expect(client).toHaveProperty('todo', 5);
    expect(client).toHaveProperty('total', 18);
    // All numeric, not strings
    expect(typeof client.done).toBe('number');
    expect(typeof client.in_progress).toBe('number');
    expect(typeof client.todo).toBe('number');
    expect(typeof client.total).toBe('number');
  });

  it('velocity array has correct object shape', async () => {
    const pool = makeMockPool({
      velocity: [
        { week_start: '2026-05-05', completed: '7' },
      ],
      stats: [{ open_tasks: '5', overdue: '2', blocked: '1', due_today: '3', due_this_week: '4' }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/client-work');
    expect(res.status).toBe(200);

    const vel = res.body.data.velocity[0];
    expect(vel).toHaveProperty('week_start', '2026-05-05');
    expect(vel).toHaveProperty('completed', 7);
    expect(typeof vel.completed).toBe('number');
  });

  it('stats object has all expected fields', async () => {
    const pool = makeMockPool({
      stats: [{ open_tasks: '15', overdue: '3', blocked: '1', due_today: '2', due_this_week: '6' }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/client-work');
    expect(res.status).toBe(200);

    const stats = res.body.data.stats;
    expect(stats).toHaveProperty('open_tasks', 15);
    expect(stats).toHaveProperty('overdue', 3);
    expect(stats).toHaveProperty('blocked', 1);
    expect(stats).toHaveProperty('due_today', 2);
    expect(stats).toHaveProperty('due_this_week', 6);
  });

  it('handles empty database gracefully', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/client-work');
    expect(res.status).toBe(200);

    const data = res.body.data;
    expect(data.clients).toEqual([]);
    expect(data.velocity).toEqual([]);
    expect(data.stats).toEqual({});
    expect(res.body.error).toBeNull();
  });

  it('returns 500 with error message on pool failure', async () => {
    const pool = { query: vi.fn().mockRejectedValue(new Error('Connection refused')) };
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/client-work');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Connection refused');
    expect(res.body.data).toBeNull();
  });
});

describe('Command Centre — Pipeline endpoint', () => {
  function makePipelineMockPool(overrides = {}) {
    return {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes('lead_pipeline_stages') && sql.includes('GROUP BY')) {
          return { rows: overrides.stages || [] };
        }
        if (sql.includes('last_contacted') && sql.includes('14')) {
          return { rows: overrides.stale || [] };
        }
        if (sql.includes('next_followup_date')) {
          return { rows: overrides.followups || [] };
        }
        if (sql.includes('is_won') && sql.includes('90 days')) {
          return { rows: overrides.conversion || [{ won: '0', total: '0' }] };
        }
        if (sql.includes('completed_at') && sql.includes('avg_days')) {
          return { rows: overrides.velocity || [{ avg_days: null }] };
        }
        if (sql.includes('DATE_TRUNC') && sql.includes('generate_series')) {
          return { rows: overrides.trend || [] };
        }
        if (sql.includes('total_weighted')) {
          return { rows: overrides.totalPipeline || [{ total_weighted: '0' }] };
        }
        return { rows: [] };
      }),
    };
  }

  it('GET /api/command-centre/pipeline returns correct shape', async () => {
    const pool = makePipelineMockPool();
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/pipeline');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('stages');
    expect(res.body.data).toHaveProperty('stale_leads');
    expect(res.body.data).toHaveProperty('upcoming_followups');
    expect(res.body.data).toHaveProperty('analytics');
    expect(res.body.error).toBeNull();
  });

  it('returns pipeline stages with counts and weighted values', async () => {
    const pool = makePipelineMockPool({
      stages: [
        { name: 'Lead', sort_order: 1, colour: '#6b7280', count: '3', weighted_total: '15000' },
        { name: 'Proposal', sort_order: 4, colour: '#f59e0b', count: '2', weighted_total: '50000' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/pipeline');
    expect(res.body.data.stages).toHaveLength(2);
    expect(res.body.data.stages[0]).toEqual({
      name: 'Lead', sort_order: 1, colour: '#6b7280', count: 3, weighted_total: 15000,
    });
  });

  it('returns stale leads with contact name', async () => {
    const pool = makePipelineMockPool({
      stale: [
        { id: 'abc', title: 'Stale deal', last_contacted: '2026-04-01', contact_name: 'John' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/pipeline');
    expect(res.body.data.stale_leads).toHaveLength(1);
    expect(res.body.data.stale_leads[0].title).toBe('Stale deal');
    expect(res.body.data.stale_leads[0].contact_name).toBe('John');
  });

  it('returns analytics with conversion rate and velocity', async () => {
    const pool = makePipelineMockPool({
      conversion: [{ won: '5', total: '20' }],
      velocity: [{ avg_days: '18.5' }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/pipeline');
    const a = res.body.data.analytics;
    expect(a.conversion_rate).toBe(25);
    expect(a.avg_deal_days).toBe(18.5);
  });
});

describe('Command Centre — AIOS-detail endpoint', () => {
  it('GET /api/command-centre/aios-detail returns correct shape', async () => {
    const pool = makeMockPool({
      snapshots: [{
        data: {
          four_cs: {
            context: { score: 7, max: 10, details: ['Brain core fresh'] },
            connections: { score: 6, max: 10, details: ['comms: connected'] },
            capabilities: { score: 8, max: 10, details: ['30 skills'] },
            cadence: { score: 2, max: 10, details: ['WorkSage cron active'] },
          },
          brain: { modules: [], roles: [] },
          skills: [],
          memory: { files: [], health: { total: 0, fresh: 0, stale: 0 } },
          connections: { buckets: {} },
        },
        snapshot_date: '2026-05-16',
        updated_at: '2026-05-16T10:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/aios-detail');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('four_cs');
    expect(res.body.data).toHaveProperty('recommendations');
    expect(res.body.data).toHaveProperty('history');
    expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    expect(res.body.error).toBeNull();
  });

  it('returns 404 when no snapshot exists', async () => {
    const pool = makeMockPool({ snapshots: [] });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/aios-detail');
    expect(res.status).toBe(404);
  });

  it('returns snapshot_date and last_updated fields', async () => {
    const pool = makeMockPool({
      snapshots: [{
        data: {
          four_cs: {
            context: { score: 5, max: 10, details: [] },
            connections: { score: 5, max: 10, details: [] },
            capabilities: { score: 5, max: 10, details: [] },
            cadence: { score: 5, max: 10, details: [] },
          },
          brain: { modules: [], roles: [] },
          skills: [],
          memory: { files: [], health: { total: 0, fresh: 0, stale: 0 } },
          connections: { buckets: {} },
        },
        snapshot_date: '2026-05-16',
        updated_at: '2026-05-16T09:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/aios-detail');
    expect(res.status).toBe(200);
    expect(res.body.data.snapshot_date).toBe('2026-05-16');
    expect(res.body.data.last_updated).toBe('2026-05-16T09:00:00Z');
  });

  it('generates cadence recommendation when cadence score is low', async () => {
    const pool = makeMockPool({
      snapshots: [{
        data: {
          four_cs: {
            context: { score: 7, max: 10, details: [] },
            connections: { score: 6, max: 10, details: [] },
            capabilities: { score: 8, max: 10, details: [] },
            cadence: { score: 3, max: 10, details: [] },
          },
          brain: { modules: [], roles: [] },
          skills: [],
          memory: { files: [], health: { total: 0, fresh: 0, stale: 0 } },
          connections: { buckets: {} },
        },
        snapshot_date: '2026-05-16',
        updated_at: '2026-05-16T10:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/aios-detail');
    expect(res.status).toBe(200);
    const cadenceRec = res.body.data.recommendations.find(r => r.category === 'cadence');
    expect(cadenceRec).toBeDefined();
    expect(cadenceRec.severity).toBe('info');
    expect(cadenceRec.action).toBe('plan');
  });

  it('history is an array', async () => {
    const pool = makeMockPool({
      snapshots: [{
        data: {
          four_cs: {
            context: { score: 7, max: 10, details: [] },
            connections: { score: 6, max: 10, details: [] },
            capabilities: { score: 8, max: 10, details: [] },
            cadence: { score: 2, max: 10, details: [] },
          },
          brain: { modules: [], roles: [] },
          skills: [],
          memory: { files: [], health: { total: 0, fresh: 0, stale: 0 } },
          connections: { buckets: {} },
        },
        snapshot_date: '2026-05-16',
        updated_at: '2026-05-16T10:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/aios-detail');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.history)).toBe(true);
  });
});

// ——— Project Health endpoint tests ———

describe('Command Centre — Project-health endpoint', () => {
  function makeHealthMockPool(overrides = {}) {
    return {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes('milestones') && sql.includes('target_date')) {
          return { rows: overrides.milestones || [] };
        }
        if (sql.includes('sows') && sql.includes('end_date')) {
          return { rows: overrides.sows || [] };
        }
        if (sql.includes('MAX') && sql.includes('updated_at') && sql.includes('client_id')) {
          return { rows: overrides.health || [] };
        }
        return { rows: [] };
      }),
    };
  }

  it('GET /api/command-centre/project-health returns correct shape', async () => {
    const pool = makeHealthMockPool();
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/project-health');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('client_health');
    expect(res.body.data).toHaveProperty('milestones');
    expect(res.body.data).toHaveProperty('sow_status');
    expect(res.body.error).toBeNull();
  });

  it('returns client health with risk indicators', async () => {
    const pool = makeHealthMockPool({
      health: [{
        client_id: 'c1', client_name: 'Acme', total: '20', done: '10', overdue: '3',
        blocked: '1', last_activity: '2026-05-10T00:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/project-health');
    const clients = res.body.data.client_health;
    expect(clients).toHaveLength(1);
    expect(clients[0].client_name).toBe('Acme');
    expect(clients[0]).toHaveProperty('risk');
    expect(clients[0]).toHaveProperty('pct_complete');
    expect(clients[0]).toHaveProperty('days_since_activity');
  });

  it('returns upcoming milestones', async () => {
    const pool = makeHealthMockPool({
      milestones: [{
        id: 'm1', title: 'Beta launch', client_name: 'Acme',
        target_date: '2026-06-01', total_items: '5', done_items: '2',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/project-health');
    expect(res.body.data.milestones).toHaveLength(1);
    expect(res.body.data.milestones[0].title).toBe('Beta launch');
  });

  it('flags SOWs expiring within 60 days', async () => {
    const soon = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const pool = makeHealthMockPool({
      sows: [{
        id: 's1', title: 'Master Services Agreement', client_name: 'Acme',
        start_date: '2026-01-01', end_date: soon, status: 'active',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/project-health');
    const sows = res.body.data.sow_status;
    expect(sows).toHaveLength(1);
    expect(sows[0].expiring_soon).toBe(true);
    expect(typeof sows[0].days_remaining).toBe('number');
  });

  it('marks low-overdue client as green risk', async () => {
    const recentActivity = new Date(Date.now() - 2 * 86400000).toISOString();
    const pool = makeHealthMockPool({
      health: [{
        client_id: 'c2', client_name: 'Healthy Co', total: '10', done: '8', overdue: '0',
        blocked: '0', last_activity: recentActivity,
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/project-health');
    expect(res.body.data.client_health[0].risk).toBe('green');
    expect(res.body.data.client_health[0].pct_complete).toBe(80);
  });

  it('marks high-overdue client as red risk', async () => {
    const oldActivity = new Date(Date.now() - 20 * 86400000).toISOString();
    const pool = makeHealthMockPool({
      health: [{
        client_id: 'c3', client_name: 'At Risk Co', total: '10', done: '2', overdue: '4',
        blocked: '3', last_activity: oldActivity,
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/project-health');
    expect(res.body.data.client_health[0].risk).toBe('red');
  });
});

describe('Command Centre — Team-workload endpoint', () => {
  function makeTeamMockPool(overrides = {}) {
    return {
      query: vi.fn().mockImplementation((sql) => {
        // SPOF must be checked before workload — SPOF SQL also contains assignee/GROUP BY/client_name
        if (sql.includes('client_totals') && sql.includes('0.8')) {
          return { rows: overrides.spof || [] };
        }
        if (sql.includes('assignee') && sql.includes('GROUP BY') && sql.includes('client_name')) {
          return { rows: overrides.workload || [] };
        }
        if (sql.includes('time_entries') && sql.includes('SUM')) {
          return { rows: overrides.time || [] };
        }
        return { rows: [] };
      }),
    };
  }

  it('GET /api/command-centre/team-workload returns correct shape', async () => {
    const pool = makeTeamMockPool();
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/team-workload');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('assignees');
    expect(res.body.data).toHaveProperty('time_logged');
    expect(res.body.data).toHaveProperty('spof');
    expect(res.body.data).toHaveProperty('alerts');
    expect(res.body.error).toBeNull();
  });

  it('returns assignee workload grouped by client', async () => {
    const pool = makeTeamMockPool({
      workload: [
        { assignee: 'Glen', client_name: 'NBI', active_count: '5' },
        { assignee: 'Glen', client_name: 'CH', active_count: '3' },
        { assignee: 'Claude', client_name: 'NBI', active_count: '12' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/team-workload');
    const assignees = res.body.data.assignees;
    expect(assignees.length).toBeGreaterThanOrEqual(2);
    var glen = assignees.find(function(a) { return a.name === 'Glen'; });
    expect(glen).toBeDefined();
    expect(glen.total).toBe(8);
    expect(glen.clients).toHaveLength(2);
  });

  it('returns time_logged per user', async () => {
    const pool = makeTeamMockPool({
      time: [
        { user_name: 'Glen', total_hours: '14.5' },
        { user_name: 'Claude', total_hours: '8.0' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/team-workload');
    expect(res.status).toBe(200);
    const timeLogged = res.body.data.time_logged;
    expect(timeLogged).toHaveLength(2);
    expect(timeLogged[0].user_name).toBe('Glen');
    expect(typeof timeLogged[0].hours).toBe('number');
    expect(timeLogged[0].hours).toBe(14.5);
  });

  it('returns spof rows correctly', async () => {
    const pool = makeTeamMockPool({
      spof: [
        { assignee: 'Glen', client_name: 'Couch Heroes', assignee_count: 9, client_total: 10, pct: 90 },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/team-workload');
    expect(res.status).toBe(200);
    expect(res.body.data.spof).toHaveLength(1);
    expect(res.body.data.spof[0].pct).toBe(90);
  });

  it('generates overloaded alert when assignee has >15 tasks', async () => {
    const pool = makeTeamMockPool({
      workload: [
        { assignee: 'Glen', client_name: 'NBI', active_count: '16' },
      ],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/team-workload');
    expect(res.status).toBe(200);
    const alerts = res.body.data.alerts;
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    var overloaded = alerts.find(function(a) { return a.type === 'overloaded'; });
    expect(overloaded).toBeDefined();
    expect(overloaded.name).toBe('Glen');
  });

  it('returns 500 with error message on pool failure', async () => {
    const pool = { query: vi.fn().mockRejectedValue(new Error('DB connection lost')) };
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/team-workload');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('DB connection lost');
    expect(res.body.data).toBeNull();
  });
});

describe('Command Centre — Handoffs endpoint', () => {
  it('GET /api/command-centre/handoffs returns correct shape', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/command-centre/handoffs');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('projects');
    expect(Array.isArray(res.body.data.projects)).toBe(true);
    expect(res.body.error).toBeNull();
  });

  it('returns project entries with handoff metadata', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/command-centre/handoffs');
    // The test repo has projects/nbi_dashboard/session_handoffs/ with real files
    const projects = res.body.data.projects;
    if (projects.length > 0) {
      const p = projects[0];
      expect(p).toHaveProperty('project');
      expect(p).toHaveProperty('handoff_count');
      expect(p).toHaveProperty('latest_handoff');
      expect(p.latest_handoff).toHaveProperty('filename');
      expect(p.latest_handoff).toHaveProperty('title');
      expect(p.latest_handoff).toHaveProperty('date');
    }
  });
});

describe('Command Centre — Financial-pulse endpoint', () => {
  it('GET /api/command-centre/financial-pulse returns correct shape', async () => {
    const pool = makeMockPool({
      financeData: [{
        data: {
          revenue: [{ client: 'Acme', annual: 120000, type: 'Retainer', status: 'Active', startMonth: 1 }],
          payroll: [{ name: 'Glen', role: 'MD', monthly: 5000, annual: 60000, billable: true }],
          pipeline: [],
          opex: [{ name: 'Office', amount: 500, tag: 'Premises', type: 'recurring' }],
          targets: { y2026: 500000, y2027: 700000 },
          employerCostPct: 15,
        },
        updated_at: '2026-05-16T10:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/financial-pulse');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('revenue');
    expect(res.body.data).toHaveProperty('costs');
    expect(res.body.data).toHaveProperty('margins');
    expect(res.body.data).toHaveProperty('contracts');
    expect(res.body.data).toHaveProperty('last_updated');
    expect(res.body.error).toBeNull();
  });

  it('returns 404 when no finance data exists', async () => {
    const pool = makeMockPool({ financeData: [] });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/financial-pulse');
    expect(res.status).toBe(404);
  });

  it('computes gross margin correctly', async () => {
    const pool = makeMockPool({
      financeData: [{
        data: {
          revenue: [{ client: 'A', annual: 200000 }],
          payroll: [{ name: 'X', annual: 80000, billable: true }],
          pipeline: [], opex: [], targets: {}, employerCostPct: 0,
        },
        updated_at: '2026-05-16T10:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/financial-pulse');
    expect(res.body.data.margins.gross_margin_pct).toBe(60);
  });
});
