// dashboard-server/tests/unit/command-centre.test.mjs
//
// Unit tests for the Command Centre route module scanners.
// Imports the factory function with a mock pool and calls _computeSnapshot()
// to verify all scanners run and return the expected shape without a real DB.

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
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
