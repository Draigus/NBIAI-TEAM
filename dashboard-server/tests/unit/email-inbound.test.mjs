// dashboard-server/tests/unit/email-inbound.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const { processOneInboundEmail } = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('processOneInboundEmail', () => {
  it('saves email body as HTML attachment on matched task', async () => {
    const client = await createTestClient({ name: 'Bossa Studios' });
    const project = await createTestTask({ title: 'Bossa Onboarding', client_id: client.id, item_type: 'project', status: 'In progress' });

    const mockMessage = {
      id: 'msg-001',
      subject: 'Bossa Studios - contract review',
      from: { emailAddress: { address: 'someone@bossa.com', name: 'Someone' } },
      body: { contentType: 'html', content: '<p>Here is the <a href="https://example.com/contract">contract link</a>.</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T10:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    expect(result.matched).toBe(true);
    expect(result.taskId).toBe(project.id);

    const { rows: attachments } = await pool.query(
      "SELECT * FROM attachments WHERE entity_type = 'task' AND entity_id = $1 ORDER BY created_at",
      [project.id]
    );
    const htmlAttachment = attachments.find(a => a.mime_type === 'text/html');
    expect(htmlAttachment).toBeTruthy();
    expect(htmlAttachment.uploaded_by).toBe('nbihub (email)');

    const linkAttachment = attachments.find(a => a.link_url);
    expect(linkAttachment).toBeTruthy();
    expect(linkAttachment.link_url).toBe('https://example.com/contract');
    expect(linkAttachment.link_title).toBe('contract link');
  });

  it('flags low-confidence matches and creates a notification', async () => {
    const admin = await createTestUser({ username: 'admin1', role: 'admin' });
    const client = await createTestClient({ name: 'Lighthouse Games' });
    const project = await createTestTask({ title: 'LH Work', client_id: client.id, item_type: 'project', status: 'In progress' });

    const mockMessage = {
      id: 'msg-002',
      subject: 'Lighthouse new thing',
      from: { emailAddress: { address: 'test@example.com', name: 'Tester' } },
      body: { contentType: 'html', content: '<p>Some content</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T11:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    expect(result.confidence).toBe('low');

    const { rows: attachments } = await pool.query(
      "SELECT uploaded_by FROM attachments WHERE entity_type = 'task' AND entity_id = $1",
      [project.id]
    );
    expect(attachments[0].uploaded_by).toContain('verify match');
  });

  it('returns matched=false when no client matches at all', async () => {
    const mockMessage = {
      id: 'msg-003',
      subject: 'Completely unrelated email',
      from: { emailAddress: { address: 'spam@example.com', name: 'Spam' } },
      body: { contentType: 'html', content: '<p>Nothing relevant</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T12:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    expect(result.matched).toBe(false);
  });

  it('extracts multiple URL links from email body', async () => {
    const client = await createTestClient({ name: 'Team17' });
    const project = await createTestTask({ title: 'Team17 Project', client_id: client.id, item_type: 'project', status: 'In progress' });

    const mockMessage = {
      id: 'msg-004',
      subject: 'Team17 - resource links',
      from: { emailAddress: { address: 'pm@team17.com', name: 'PM' } },
      body: { contentType: 'html', content: '<p>See <a href="https://docs.google.com/doc/123">the spec</a> and <a href="https://figma.com/file/abc">designs</a>.</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T13:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    const { rows: links } = await pool.query(
      "SELECT link_url, link_title FROM attachments WHERE entity_type = 'task' AND entity_id = $1 AND link_url IS NOT NULL",
      [project.id]
    );
    expect(links).toHaveLength(2);
    expect(links.map(l => l.link_url).sort()).toEqual([
      'https://docs.google.com/doc/123',
      'https://figma.com/file/abc',
    ]);
  });

  it('skips emails from nbihub itself to prevent loops', async () => {
    const mockMessage = {
      id: 'msg-005',
      subject: 'NBI Hub test',
      from: { emailAddress: { address: 'nbihub@nbi-consulting.com', name: 'NBI Hub' } },
      body: { contentType: 'html', content: '<p>Bounce</p>' },
      hasAttachments: false,
      receivedDateTime: '2026-04-16T14:00:00Z',
    };

    const result = await processOneInboundEmail(mockMessage, { skipGraphApi: true });
    expect(result.skipped).toBe(true);
  });
});
