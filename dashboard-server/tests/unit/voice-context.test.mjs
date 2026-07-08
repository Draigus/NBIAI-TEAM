import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { buildVoiceContext } = require('../../lib/voice-context');

function fixturePool() {
  return {
    query: vi.fn().mockImplementation((sql) => {
      if (sql.includes('FROM tasks')) {
        return Promise.resolve({ rows: [
          { title: 'Fix voice module', item_type: 'task', status: 'In progress', priority: 'Urgent', due_date: '2026-07-10', client: null },
          { title: 'Wonderland analytics', item_type: 'project', status: 'Blocked', priority: 'High', due_date: null, client: 'Lighthouse Games' },
        ] });
      }
      if (sql.includes('FROM calendar_events')) {
        return Promise.resolve({ rows: [
          { title: 'David Luong 1:1', event_type: 'meeting', start_date: '2026-07-08', end_date: '2026-07-08' },
        ] });
      }
      if (sql.includes('GROUP BY status')) {
        return Promise.resolve({ rows: [
          { status: 'open', n: 13 }, { status: 'please_review', n: 2 },
        ] });
      }
      if (sql.includes("status = 'open'")) {
        return Promise.resolve({ rows: [{ title: 'Kanban drag drops card' }] });
      }
      if (sql.includes('FROM leads')) {
        return Promise.resolve({ rows: [
          { title: 'Studio X pitch', next_followup_date: '2026-07-07', next_action: 'Send deck', stage: 'Proposal' },
        ] });
      }
      return Promise.resolve({ rows: [] });
    }),
  };
}

describe('buildVoiceContext', () => {
  it('formats all sections with a timestamp header', async () => {
    const text = await buildVoiceContext(fixturePool(), { log: vi.fn() });
    expect(text).toMatch(/^WorkSage snapshot as of \d{2}:\d{2}/);
    expect(text).toContain('[task] Fix voice module (In progress, Urgent, due 2026-07-10)');
    expect(text).toContain('[project] Wonderland analytics (Blocked, High, Lighthouse Games)');
    expect(text).toContain('David Luong 1:1');
    expect(text).toContain('open: 13');
    expect(text).toContain('please_review: 2');
    expect(text).toContain('Kanban drag drops card');
    expect(text).toContain('Studio X pitch (Proposal, follow up 2026-07-07: Send deck)');
  });

  it('states emptiness rather than omitting sections', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const text = await buildVoiceContext(pool, { log: vi.fn() });
    expect(text).toContain('no work items in progress');
    expect(text).toContain('no meetings or events');
    expect(text).toContain('no open bugs');
    expect(text).toContain('no leads needing follow-up');
  });

  it('returns null when a query fails, and logs', async () => {
    const log = vi.fn();
    const pool = { query: vi.fn().mockRejectedValue(new Error('db down')) };
    const text = await buildVoiceContext(pool, { log });
    expect(text).toBeNull();
    expect(log).toHaveBeenCalledWith('warn', 'Voice', expect.any(String),
      expect.objectContaining({ error: 'db down' }));
  });

  it('returns null when queries exceed the timeout', async () => {
    const pool = { query: vi.fn().mockImplementation(() => new Promise(() => {})) };
    const text = await buildVoiceContext(pool, { log: vi.fn(), timeoutMs: 20 });
    expect(text).toBeNull();
  });
});
