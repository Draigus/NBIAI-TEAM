// dashboard-server/tests/unit/email-pm-report.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const {
  createTestUser, createTestClient, createTestTask,
  createTestTeam, createTestTeamMember, createTestAuditEntry,
} = require('../helpers/fixtures.js');
const { buildPmReportEmails } = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('buildPmReportEmails', () => {
  it('returns empty array when lead has no team changes', async () => {
    const lead = await createTestUser({ username: 'pm1', email: 'pm1@example.invalid' });
    const client = await createTestClient({ name: 'Acme' });
    const team = await createTestTeam({ name: 'Acme Team', client_id: client.id });
    await createTestTeamMember({ team_id: team.id, user_id: lead.id, role: 'lead' });

    // No audit entries, no due tasks
    const emails = await buildPmReportEmails('2026-04-16', '2026-04-15T08:00:00Z', '2026-04-16T08:00:00Z');
    expect(emails).toEqual([]);
  });

  it('includes changed tickets in the report', async () => {
    const lead = await createTestUser({ username: 'pm2', email: 'pm2@example.invalid' });
    const client = await createTestClient({ name: 'Beta' });
    const team = await createTestTeam({ name: 'Beta Team', client_id: client.id });
    await createTestTeamMember({ team_id: team.id, user_id: lead.id, role: 'lead' });

    const task = await createTestTask({ title: 'Build API', client_id: client.id, status: 'In progress' });
    await createTestAuditEntry({
      entity_type: 'task', entity_id: task.id, action: 'update',
      changed_by: 'dev1', changes: { status: { from: 'Not started', to: 'In progress' } },
      created_at: '2026-04-15T12:00:00Z', // within the test window
    });

    const emails = await buildPmReportEmails('2026-04-16', '2026-04-15T08:00:00Z', '2026-04-16T08:00:00Z');
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('pm2@example.invalid');
    expect(emails[0].html).toContain('Build API');
  });

  it('includes overdue and upcoming-due tasks', async () => {
    const lead = await createTestUser({ username: 'pm3', email: 'pm3@example.invalid' });
    const client = await createTestClient({ name: 'Gamma' });
    const team = await createTestTeam({ name: 'Gamma Team', client_id: client.id });
    await createTestTeamMember({ team_id: team.id, user_id: lead.id, role: 'lead' });

    await createTestTask({ title: 'Overdue Item', client_id: client.id, due_date: '2026-04-10', status: 'In progress' });
    await createTestTask({ title: 'Due Soon', client_id: client.id, due_date: '2026-04-17', status: 'In progress' });

    const emails = await buildPmReportEmails('2026-04-16', '2026-04-15T08:00:00Z', '2026-04-16T08:00:00Z');
    expect(emails).toHaveLength(1);
    expect(emails[0].html).toContain('Overdue Item');
    expect(emails[0].html).toContain('Due Soon');
  });

  it('skips team leads with no email', async () => {
    const lead = await createTestUser({ username: 'nomail_pm', email: null });
    const client = await createTestClient({ name: 'Delta' });
    const team = await createTestTeam({ name: 'Delta Team', client_id: client.id });
    await createTestTeamMember({ team_id: team.id, user_id: lead.id, role: 'lead' });

    await createTestTask({ title: 'Late', client_id: client.id, due_date: '2026-04-01', status: 'In progress' });

    const emails = await buildPmReportEmails('2026-04-16', '2026-04-15T08:00:00Z', '2026-04-16T08:00:00Z');
    expect(emails).toEqual([]);
  });
});
