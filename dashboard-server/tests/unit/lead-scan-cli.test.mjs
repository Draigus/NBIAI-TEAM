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

describe('lead-scan-cli', () => {
  let cli;
  beforeEach(async () => {
    vi.resetModules();
    cli = require('../../scripts/lead-scan-cli');
  });

  describe('findStaleLeads', () => {
    it('returns leads overdue >30 days', async () => {
      const pool = makeMockPool([{
        rows: [
          { id: 'l-1', title: 'Jen MacLean', last_contacted: '2026-03-19', staleness: 'overdue', days_stale: 107, next_action: 'Follow up on GDC conversation', contact_email: 'jen@example.com', contact_name: 'Jen MacLean' },
        ],
        rowCount: 1,
      }]);
      const leads = await cli.findStaleLeads(pool);
      expect(leads).toHaveLength(1);
      expect(leads[0].staleness).toBe('overdue');
      expect(leads[0].days_stale).toBe(107);
    });

    it('returns empty array when no stale leads', async () => {
      const pool = makeMockPool([{ rows: [], rowCount: 0 }]);
      const leads = await cli.findStaleLeads(pool);
      expect(leads).toHaveLength(0);
    });
  });

  describe('buildFollowUpDraft', () => {
    it('generates email subject and body for a stale lead', () => {
      const draft = cli.buildFollowUpDraft({
        title: 'Jen MacLean',
        contact_name: 'Jen MacLean',
        next_action: 'Follow up on GDC conversation',
        days_stale: 107,
        last_contacted: '2026-03-19',
      });
      expect(draft.subject).toContain('Jen');
      expect(draft.body).toContain('GDC');
      expect(draft.to).toBeUndefined();
    });

    it('includes contact email when available', () => {
      const draft = cli.buildFollowUpDraft({
        title: 'Mike Palan',
        contact_name: 'Mike Palan',
        contact_email: 'mike@enoma.com',
        next_action: 'Enoma Capital intro',
        days_stale: 45,
      });
      expect(draft.to).toBe('mike@enoma.com');
    });
  });
});
