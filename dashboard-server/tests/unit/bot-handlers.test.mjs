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
