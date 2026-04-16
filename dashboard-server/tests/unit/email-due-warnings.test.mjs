// dashboard-server/tests/unit/email-due-warnings.test.mjs
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const { buildDueWarningEmails } = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('buildDueWarningEmails', () => {
  it('returns empty array when no tasks are due or late', async () => {
    const user = await createTestUser({ username: 'alice' });
    await createTestTask({ assignees: ['alice'], due_date: '2099-01-01', status: 'In progress' });
    const emails = await buildDueWarningEmails('2026-04-16');
    expect(emails).toEqual([]);
  });

  it('sends one email per assignee consolidating all their due/late tickets', async () => {
    const alice = await createTestUser({ username: 'alice', email: 'alice@example.invalid' });
    const client = await createTestClient({ name: 'Acme' });
    await createTestTask({ title: 'Due Today', assignees: ['alice'], due_date: '2026-04-16', status: 'In progress', client_id: client.id });
    await createTestTask({ title: 'Late 1d', assignees: ['alice'], due_date: '2026-04-15', status: 'In progress', client_id: client.id });

    const emails = await buildDueWarningEmails('2026-04-16');
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('alice@example.invalid');
    expect(emails[0].html).toContain('Due Today');
    expect(emails[0].html).toContain('Late 1d');
  });

  it('skips Done and Cancelled tasks', async () => {
    await createTestUser({ username: 'bob', email: 'bob@example.invalid' });
    await createTestTask({ title: 'Finished', assignees: ['bob'], due_date: '2026-04-10', status: 'Done' });
    await createTestTask({ title: 'Killed', assignees: ['bob'], due_date: '2026-04-10', status: 'Cancelled' });

    const emails = await buildDueWarningEmails('2026-04-16');
    expect(emails).toEqual([]);
  });

  it('skips users with no email address', async () => {
    await createTestUser({ username: 'nomail', email: null });
    await createTestTask({ title: 'Overdue', assignees: ['nomail'], due_date: '2026-04-10', status: 'In progress' });

    const emails = await buildDueWarningEmails('2026-04-16');
    expect(emails).toEqual([]);
  });
});
