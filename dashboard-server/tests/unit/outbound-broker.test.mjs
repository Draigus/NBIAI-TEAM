import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { createBroker } = require('../../lib/outbound-broker');

function makeMockSlack() {
  return {
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ok: true, ts: '1234567890.123456' }),
    },
  };
}

function makeMockPool() {
  const poolResults = [];
  const clientResults = [];
  const mockClient = {
    query: vi.fn().mockImplementation(() => {
      const result = clientResults.shift();
      return Promise.resolve(result || { rows: [], rowCount: 0 });
    }),
    release: vi.fn(),
  };
  return {
    query: vi.fn().mockImplementation(() => {
      const result = poolResults.shift();
      return Promise.resolve(result || { rows: [], rowCount: 0 });
    }),
    connect: vi.fn().mockResolvedValue(mockClient),
    _pushResult: (r) => poolResults.push(r),
    _pushClientResult: (r) => clientResults.push(r),
    _client: mockClient,
  };
}

describe('outbound-broker', () => {
  let pool, log, broker, mockSlack;

  beforeEach(() => {
    pool = makeMockPool();
    log = vi.fn();
    mockSlack = makeMockSlack();
    broker = createBroker({
      pool, log,
      slackBotToken: 'xoxb-test-token',
      glenSlackUserId: 'U_GLEN_TEST',
      maxDmsPerDay: 20,
      _slackClient: mockSlack,
    });
  });

  describe('createBroker startup safety', () => {
    it('starts in disabled mode with blank glenSlackUserId', () => {
      const b = createBroker({ pool, log, slackBotToken: 'xoxb-test', glenSlackUserId: '' });
      expect(b.configured).toBe(false);
    });

    it('starts in disabled mode with blank slackBotToken', () => {
      const b = createBroker({ pool, log, slackBotToken: '', glenSlackUserId: 'U_GLEN' });
      expect(b.configured).toBe(false);
    });

    it('does not throw on construction with blank config', () => {
      expect(() => createBroker({ pool, log, slackBotToken: '', glenSlackUserId: '' })).not.toThrow();
    });

    it('reports configured when both values present', () => {
      expect(broker.configured).toBe(true);
    });
  });

  describe('validateDestination', () => {
    it('accepts Glen Slack ID', () => {
      expect(broker.validateDestination('slack_dm', 'U_GLEN_TEST')).toEqual({ valid: true });
    });

    it('rejects non-Glen Slack DM', () => {
      const result = broker.validateDestination('slack_dm', 'U_SOMEONE_ELSE');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('allowlist');
    });

    it('accepts email_draft to any address', () => {
      expect(broker.validateDestination('email_draft', 'anyone@example.com')).toEqual({ valid: true });
    });

    it('rejects unknown destination type', () => {
      const result = broker.validateDestination('sms', '+447700900000');
      expect(result.valid).toBe(false);
    });

    it('rejects slack_dm when broker is unconfigured', () => {
      const b = createBroker({ pool, log, slackBotToken: '', glenSlackUserId: '' });
      const result = b.validateDestination('slack_dm', 'U_ANYONE');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not configured');
    });
  });

  describe('queueMessage', () => {
    it('inserts into aios_outbound_queue and returns id', async () => {
      pool._pushResult({ rows: [{ id: 'q-1' }], rowCount: 1 });

      const result = await broker.queueMessage({
        actionId: '11111111-2222-3333-4444-555555555555',
        destinationType: 'slack_dm',
        destinationId: 'U_GLEN_TEST',
        draftText: 'Good morning',
        reason: 'Morning brief',
      });

      expect(result.id).toBe('q-1');
      const [sql] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO aios_outbound_queue');
    });

    it('rejects if destination not on allowlist', async () => {
      await expect(broker.queueMessage({
        actionId: 'a-1',
        destinationType: 'slack_dm',
        destinationId: 'U_SOMEONE_ELSE',
        draftText: 'Hello',
        reason: 'test',
      })).rejects.toThrow('allowlist');
    });

    it('rejects if no actionId provided', async () => {
      await expect(broker.queueMessage({
        destinationType: 'slack_dm',
        destinationId: 'U_GLEN_TEST',
        draftText: 'Hello',
        reason: 'test',
      })).rejects.toThrow('actionId');
    });

    it('rejects slack_dm when broker is unconfigured', async () => {
      const b = createBroker({ pool, log, slackBotToken: '', glenSlackUserId: '' });
      await expect(b.queueMessage({
        actionId: 'a-1',
        destinationType: 'slack_dm',
        destinationId: 'U_ANYONE',
        draftText: 'Hello',
        reason: 'test',
      })).rejects.toThrow('not configured');
    });
  });

  describe('processQueue', () => {
    it('sends approved messages via transaction and records delivery', async () => {
      const queueItem = {
        id: 'q1', action_id: 'a1',
        destination_type: 'slack_dm', destination_id: 'U_GLEN_TEST',
        draft_text: 'Morning brief content', approval_status: 'approved',
      };
      // Stale recovery query
      pool._pushResult({ rowCount: 0 });
      // Transaction queries go through client
      pool._pushClientResult({ rows: [] }); // BEGIN
      pool._pushClientResult({ rows: [queueItem] }); // UPDATE RETURNING (claim)
      pool._pushClientResult({ rows: [] }); // COMMIT
      // Post-transaction queries go through pool
      pool._pushResult({ rows: [{ count: '0' }] }); // rate limit check
      pool._pushResult({ rowCount: 1 }); // UPDATE sent

      const results = await broker.processQueue();
      expect(results.sent).toBe(1);
      expect(results.failed).toBe(0);
    });

    it('returns items to pending when daily rate limit exceeded', async () => {
      const queueItem = {
        id: 'q1', action_id: 'a1',
        destination_type: 'slack_dm', destination_id: 'U_GLEN_TEST',
        draft_text: 'Hello', approval_status: 'approved',
      };
      // Stale recovery query
      pool._pushResult({ rowCount: 0 });
      // Transaction queries go through client
      pool._pushClientResult({ rows: [] }); // BEGIN
      pool._pushClientResult({ rows: [queueItem] }); // UPDATE RETURNING (claim)
      pool._pushClientResult({ rows: [] }); // COMMIT
      // Post-transaction queries go through pool
      pool._pushResult({ rows: [{ count: '20' }] }); // rate limit exceeded
      pool._pushResult({ rowCount: 1 }); // UPDATE back to pending

      const results = await broker.processQueue();
      expect(results.rateLimited).toBe(1);
      expect(results.failed).toBe(0);
    });

    it('returns skipped when broker is unconfigured', async () => {
      const b = createBroker({ pool, log, slackBotToken: '', glenSlackUserId: '' });
      const results = await b.processQueue();
      expect(results.sent).toBe(0);
      expect(results.skipped).toBeTruthy();
    });
  });

  describe('Block Kit support', () => {
    it('queueMessage stores draft_blocks when provided', async () => {
      pool._pushResult({ rows: [{ id: 'q-blocks-1' }], rowCount: 1 });

      const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'hello' } }];
      await broker.queueMessage({
        actionId: 'a-1',
        destinationType: 'slack_dm',
        destinationId: 'U_GLEN_TEST',
        draftText: 'hello',
        draftBlocks: blocks,
      });

      const insertCall = pool.query.mock.calls.find(c => c[0].includes('INSERT INTO aios_outbound_queue'));
      expect(insertCall[0]).toContain('draft_blocks');
      expect(insertCall[1]).toContainEqual(JSON.stringify(blocks));
    });

    it('processQueue passes blocks to chat.postMessage when present', async () => {
      const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'hi' } }];
      // Stale recovery query
      pool._pushResult({ rowCount: 0 });
      // Transaction queries go through client
      pool._pushClientResult({ rows: [] }); // BEGIN
      pool._pushClientResult({ rows: [{ id: 'q-1', action_id: 'a-1', destination_id: 'U_GLEN_TEST', draft_text: 'hi', draft_blocks: blocks }], rowCount: 1 }); // UPDATE RETURNING (claim)
      pool._pushClientResult({ rows: [] }); // COMMIT
      // Post-transaction queries go through pool
      pool._pushResult({ rows: [{ count: '0' }] }); // rate limit check
      pool._pushResult({ rowCount: 1 }); // UPDATE sent

      await broker.processQueue();

      expect(mockSlack.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'U_GLEN_TEST', text: 'hi', blocks })
      );
    });
  });
});
