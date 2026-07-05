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

    it('filters on import time (created_at), not meeting date (audit finding 6)', async () => {
      const pool = makeMockPool([
        { rows: [{ value: '2026-07-01T00:00:00Z' }], rowCount: 1 },
        { rows: [
          { item_id: 'm-1', created_at: '2026-07-05T07:00:00Z', data: { source_id: 'g-1', title: 'Late import', date: '2026-06-20', summary: 'S' } },
        ], rowCount: 1 },
      ]);
      const meetings = await cli.fetchNewMeetings(pool);
      const meetingsQuery = pool.query.mock.calls[1][0];
      expect(meetingsQuery).toContain('created_at >');
      expect(meetingsQuery).not.toContain("data->>'date')::timestamptz >");
      expect(meetings[0]._imported_at).toBe('2026-07-05T07:00:00Z');
    });
  });

  describe('processSignal', () => {
    it('creates new signal and action when fingerprint is new', async () => {
      const pool = makeMockPool([
        { rows: [], rowCount: 0 },           // checkSignal
        { rows: [{ id: 's-new' }], rowCount: 1 },  // createSignal
        { rows: [], rowCount: 0 },           // auto_categories lookup
        { rows: [{ id: 'a-new' }], rowCount: 1 },  // INSERT aios_actions
        { rows: [], rowCount: 0 },           // linkAction
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
        { rows: [{ id: 's-existing', status: 'open', evidence_count: 1 }], rowCount: 1 }, // checkSignal
        { rows: [{ id: 's-existing', evidence_count: 2 }], rowCount: 1 }, // enrichSignal
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

    it('re-raises rejected signals with materially new info (audit finding 5)', async () => {
      const pool = makeMockPool([
        { rows: [{ id: 's-rej', status: 'rejected', evidence_count: 3 }], rowCount: 1 }, // checkSignal
        { rows: [{ id: 's-rej', evidence_count: 4 }], rowCount: 1 },                     // enrichSignal
        { rows: [], rowCount: 0 },                                                       // auto_categories
        { rows: [{ id: 'a-reraised' }], rowCount: 1 },                                   // INSERT aios_actions
        { rows: [], rowCount: 0 },                                                       // linkAction
      ]);
      const result = await cli.processSignal(pool, {
        fingerprint: 'topic:old_idea:ch',
        signal_type: 'product',
        title: 'Old idea, new facts: budget approved',
        source_id: 'meeting-999',
        source_quote: 'Budget was approved yesterday',
        confidence: 'high',
        risk_class: 'low',
        materially_new: true,
      });
      expect(result.action).toBe('reraised');
      expect(result.signal_id).toBe('s-rej');
      expect(result.action_id).toBe('a-reraised');
      const linkCall = pool.query.mock.calls[4][0];
      expect(linkCall).toContain('linked_action_id');
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
