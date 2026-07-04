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
