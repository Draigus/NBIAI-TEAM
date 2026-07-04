import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  isAuthorised, buildActionBlocks, handleButtonAction, buildDispatchPrompt, truncateForSlack,
  buildTranscript, createChannelQueue, ACK_TEXT
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
    expect(pool.query.mock.calls.length).toBe(1);
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

describe('buildTranscript', () => {
  const GLEN = 'U_GLEN';

  it('labels Glen and the bot, oldest first', () => {
    const messages = [
      { user: GLEN, text: 'who does the tech test?', ts: '1.0' },
      { bot_id: 'B1', text: 'Otto is the primary candidate.', ts: '2.0' },
      { user: GLEN, text: 'and Mustafa?', ts: '3.0' },
    ];
    const t = buildTranscript(messages, { glenId: GLEN });
    const glenIdx = t.indexOf('Glen: who does the tech test?');
    const botIdx = t.indexOf('WorkSage: Otto is the primary candidate.');
    expect(glenIdx).toBeGreaterThanOrEqual(0);
    expect(botIdx).toBeGreaterThan(glenIdx);
    expect(t.indexOf('Glen: and Mustafa?')).toBeGreaterThan(botIdx);
  });

  it('excludes the triggering message by ts', () => {
    const messages = [
      { user: GLEN, text: 'earlier message', ts: '1.0' },
      { user: GLEN, text: 'the question itself', ts: '2.0' },
    ];
    const t = buildTranscript(messages, { glenId: GLEN, excludeTs: '2.0' });
    expect(t).toContain('earlier message');
    expect(t).not.toContain('the question itself');
  });

  it('filters out the "On it" acknowledgement noise', () => {
    const messages = [
      { user: GLEN, text: 'question one', ts: '1.0' },
      { bot_id: 'B1', text: ACK_TEXT, ts: '2.0' },
      { bot_id: 'B1', text: 'a real answer', ts: '3.0' },
    ];
    const t = buildTranscript(messages, { glenId: GLEN });
    expect(t).toContain('question one');
    expect(t).toContain('a real answer');
    expect(t).not.toContain(ACK_TEXT);
  });

  it('truncates very long individual messages', () => {
    const messages = [
      { bot_id: 'B1', text: 'y'.repeat(5000), ts: '1.0' },
    ];
    const t = buildTranscript(messages, { glenId: GLEN });
    expect(t.length).toBeLessThan(5000);
  });

  it('caps total size by dropping oldest messages first', () => {
    const messages = [];
    for (let i = 0; i < 30; i++) {
      messages.push({ user: GLEN, text: `msg-${i} ` + 'z'.repeat(900), ts: `${i}.0` });
    }
    const t = buildTranscript(messages, { glenId: GLEN });
    expect(t.length).toBeLessThanOrEqual(10000);
    expect(t).toContain('msg-29');
    expect(t).not.toContain('msg-0 ');
  });

  it('returns empty string for no usable messages', () => {
    expect(buildTranscript([], { glenId: GLEN })).toBe('');
    expect(buildTranscript([{ bot_id: 'B1', text: ACK_TEXT, ts: '1.0' }], { glenId: GLEN })).toBe('');
  });
});

describe('buildDispatchPrompt with transcript', () => {
  it('includes the conversation block when a transcript is given', () => {
    const p = buildDispatchPrompt('and Mustafa?', 'Glen: who does the tech test?\nWorkSage: Otto is primary.');
    expect(p).toContain('Conversation so far');
    expect(p).toContain('Glen: who does the tech test?');
    expect(p).toContain('and Mustafa?');
  });

  it('omits the conversation block when transcript is empty', () => {
    const p = buildDispatchPrompt('standalone question', '');
    expect(p).not.toContain('Conversation so far');
    expect(p).toContain('standalone question');
  });
});

describe('createChannelQueue', () => {
  it('runs tasks for the same channel strictly in order', async () => {
    const queue = createChannelQueue();
    const order = [];
    let releaseFirst;
    const firstGate = new Promise(r => { releaseFirst = r; });

    const p1 = queue.enqueue('C1', async () => { await firstGate; order.push('first'); });
    const p2 = queue.enqueue('C1', async () => { order.push('second'); });

    // Second task must not run while first is blocked
    await new Promise(r => setTimeout(r, 20));
    expect(order).toEqual([]);

    releaseFirst();
    await Promise.all([p1, p2]);
    expect(order).toEqual(['first', 'second']);
  });

  it('runs different channels concurrently', async () => {
    const queue = createChannelQueue();
    const order = [];
    let releaseC1;
    const c1Gate = new Promise(r => { releaseC1 = r; });

    const p1 = queue.enqueue('C1', async () => { await c1Gate; order.push('c1'); });
    const p2 = queue.enqueue('C2', async () => { order.push('c2'); });

    await p2;
    expect(order).toEqual(['c2']);
    releaseC1();
    await p1;
    expect(order).toEqual(['c2', 'c1']);
  });

  it('a rejected task does not break the chain', async () => {
    const queue = createChannelQueue();
    const order = [];
    await expect(queue.enqueue('C1', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    await queue.enqueue('C1', async () => { order.push('after-failure'); });
    expect(order).toEqual(['after-failure']);
  });
});
