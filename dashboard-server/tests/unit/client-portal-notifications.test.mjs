// dashboard-server/tests/unit/client-portal-notifications.test.mjs
//
// Tests for email notifications when client portal users create bugs or comments.
// Verifies:
//   - Client user creating a bug triggers admin email notifications
//   - NBI (internal) user creating a bug does NOT trigger email notifications
//   - Client user posting a comment triggers admin email notifications
//   - Email failures do not cause the endpoint to return an error

import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestBugReport } = require('../helpers/fixtures.js');

// Mock sendEmailAsync before loading the app — the email module is cached by
// Node's require system, so we intercept it at source.
const emailModule = require('../../lib/email');
const originalSendEmailAsync = emailModule.sendEmailAsync;
let sendEmailSpy;

beforeEach(async () => {
  await truncate();
  // Replace sendEmailAsync with a spy before each test
  sendEmailSpy = vi.fn();
  emailModule.sendEmailAsync = sendEmailSpy;
});

afterAll(() => {
  // Restore original function (don't close pool — it's shared across test files)
  emailModule.sendEmailAsync = originalSendEmailAsync;
});

const app = require('../../server.js');

describe('Client portal email notifications — bug creation', () => {
  it('sends email to NBI admins when a client user creates a bug report', async () => {
    const client = await createTestClient({ name: 'Acme Corp' });
    const admin = await createTestUser({ role: 'admin', email: 'admin@nbi.test', display_name: 'NBI Admin' });
    const clientUser = await createTestUser({
      role: 'member', client_id: client.id, client_role: 'member',
      display_name: 'Lorenza Test',
    });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Login page broken', type: 'bug', description: 'Cannot log in on mobile' });

    expect(res.status).toBe(201);
    expect(res.body.source).toBe('client');

    // Allow async notification to fire (sendEmailAsync is fire-and-forget)
    await new Promise(r => setTimeout(r, 100));

    expect(sendEmailSpy).toHaveBeenCalled();
    const call = sendEmailSpy.mock.calls[0][0];
    expect(call.to).toBe('admin@nbi.test');
    expect(call.subject).toContain('[WorkSage]');
    expect(call.subject).toContain('Login page broken');
    expect(call.subject).toContain('Acme Corp');
    expect(call.html).toContain('Login page broken');
    expect(call.html).toContain('Cannot log in on mobile');
  });

  it('sends email to ALL active NBI admins (not just one)', async () => {
    const client = await createTestClient({ name: 'TestCo' });
    const admin1 = await createTestUser({ role: 'admin', email: 'admin1@nbi.test' });
    const admin2 = await createTestUser({ role: 'admin', email: 'admin2@nbi.test' });
    const clientUser = await createTestUser({
      role: 'member', client_id: client.id, client_role: 'member',
    });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Multi-admin test', type: 'bug' });

    expect(res.status).toBe(201);
    await new Promise(r => setTimeout(r, 100));

    // Should send to both admins
    expect(sendEmailSpy).toHaveBeenCalledTimes(2);
    const recipients = sendEmailSpy.mock.calls.map(c => c[0].to);
    expect(recipients).toContain('admin1@nbi.test');
    expect(recipients).toContain('admin2@nbi.test');
  });

  it('does NOT send email when an NBI (internal) user creates a bug', async () => {
    const admin = await createTestUser({ role: 'admin', email: 'admin@nbi.test' });
    const nbiMember = await createTestUser({ role: 'member' }); // no client_id
    const token = await mintSession(nbiMember.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Internal bug', type: 'bug' });

    expect(res.status).toBe(201);
    expect(res.body.source).toBe('internal');
    await new Promise(r => setTimeout(r, 100));

    expect(sendEmailSpy).not.toHaveBeenCalled();
  });

  it('does NOT send email when an admin creates a bug', async () => {
    const admin = await createTestUser({ role: 'admin', email: 'admin@nbi.test' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Admin-created bug', type: 'bug' });

    expect(res.status).toBe(201);
    await new Promise(r => setTimeout(r, 100));

    expect(sendEmailSpy).not.toHaveBeenCalled();
  });

  it('truncates long descriptions to 500 chars in the email', async () => {
    const client = await createTestClient({ name: 'LongDesc Corp' });
    const admin = await createTestUser({ role: 'admin', email: 'admin@nbi.test' });
    const clientUser = await createTestUser({
      role: 'member', client_id: client.id, client_role: 'member',
    });
    const token = await mintSession(clientUser.id);

    const longDesc = 'A'.repeat(800);
    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Long description bug', type: 'bug', description: longDesc });

    expect(res.status).toBe(201);
    await new Promise(r => setTimeout(r, 100));

    expect(sendEmailSpy).toHaveBeenCalled();
    const call = sendEmailSpy.mock.calls[0][0];
    // Should contain the truncated description (500 A's) followed by '...'
    expect(call.html).toContain('A'.repeat(500));
    expect(call.html).toContain('...');
    // Should NOT contain the full 800-char description
    expect(call.html).not.toContain('A'.repeat(501));
  });
});

describe('Client portal email notifications — comment creation', () => {
  it('sends email to NBI admins when a client user posts a comment', async () => {
    const client = await createTestClient({ name: 'CommentCo' });
    const admin = await createTestUser({ role: 'admin', email: 'admin@nbi.test' });
    const clientUser = await createTestUser({
      role: 'member', client_id: client.id, client_role: 'member',
      display_name: 'Client Commenter',
    });

    // Create a bug report owned by the client
    const bug = await createTestBugReport({ user_id: clientUser.id, title: 'Existing bug' });
    await pool.query(
      'UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE id = $3',
      ['client', client.id, bug.id]
    );

    const token = await mintSession(clientUser.id);
    const res = await request(app)
      .post(`/api/bug-reports/${bug.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'This is still happening after the update' });

    expect(res.status).toBe(201);
    await new Promise(r => setTimeout(r, 100));

    // sendEmailSpy should have been called for the admin email notification
    expect(sendEmailSpy).toHaveBeenCalled();
    const emailCalls = sendEmailSpy.mock.calls;
    // Find the call to the admin
    const adminCall = emailCalls.find(c => c[0].to === 'admin@nbi.test');
    expect(adminCall).toBeDefined();
    expect(adminCall[0].subject).toContain('[WorkSage]');
    expect(adminCall[0].subject).toContain('New comment');
    expect(adminCall[0].subject).toContain('Client Commenter');
    expect(adminCall[0].html).toContain('This is still happening after the update');
    expect(adminCall[0].html).toContain('Existing bug');
  });

  it('does NOT send email when an NBI user posts a comment', async () => {
    const admin = await createTestUser({ role: 'admin', email: 'admin@nbi.test' });
    const nbiMember = await createTestUser({ role: 'member', display_name: 'NBI Member' });

    const bug = await createTestBugReport({ user_id: nbiMember.id, title: 'Internal bug' });
    const token = await mintSession(nbiMember.id);

    const res = await request(app)
      .post(`/api/bug-reports/${bug.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Internal comment' });

    expect(res.status).toBe(201);
    await new Promise(r => setTimeout(r, 100));

    // sendEmailSpy should NOT have been called for email notifications
    // (in-app notifications via createNotification may still fire, but those are separate)
    expect(sendEmailSpy).not.toHaveBeenCalled();
  });
});

describe('Client portal email notifications — error resilience', () => {
  it('email failure does not cause bug creation endpoint to fail', async () => {
    // Make the admin query inside notifyAdminsOfClientActivity throw an error
    // by temporarily breaking pool.query for the admin lookup
    const client = await createTestClient({ name: 'ErrorCo' });
    const admin = await createTestUser({ role: 'admin', email: 'admin@nbi.test' });
    const clientUser = await createTestUser({
      role: 'member', client_id: client.id, client_role: 'member',
    });
    const token = await mintSession(clientUser.id);

    // Make sendEmailAsync throw
    sendEmailSpy.mockImplementation(() => { throw new Error('SMTP exploded'); });

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bug despite email failure', type: 'bug' });

    // The API should still return 201 — email is fire-and-forget
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Bug despite email failure');
  });

  it('email failure does not cause comment endpoint to fail', async () => {
    const client = await createTestClient({ name: 'ErrorCo2' });
    const admin = await createTestUser({ role: 'admin', email: 'admin@nbi.test' });
    const clientUser = await createTestUser({
      role: 'member', client_id: client.id, client_role: 'member',
    });

    const bug = await createTestBugReport({ user_id: clientUser.id, title: 'Bug for comment' });
    await pool.query(
      'UPDATE bug_reports SET source = $1, reporter_client_id = $2 WHERE id = $3',
      ['client', client.id, bug.id]
    );

    const token = await mintSession(clientUser.id);

    // Make sendEmailAsync throw
    sendEmailSpy.mockImplementation(() => { throw new Error('SMTP exploded'); });

    const res = await request(app)
      .post(`/api/bug-reports/${bug.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Comment despite email failure' });

    // The API should still return 201
    expect(res.status).toBe(201);
    expect(res.body.text).toBe('Comment despite email failure');
  });

  it('does not send to admins who have no email address', async () => {
    const client = await createTestClient({ name: 'NoEmailCo' });
    // Admin with email
    await createTestUser({ role: 'admin', email: 'has-email@nbi.test' });
    // Admin without email
    await createTestUser({ role: 'admin', email: null });
    const clientUser = await createTestUser({
      role: 'member', client_id: client.id, client_role: 'member',
    });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Email filter test', type: 'bug' });

    expect(res.status).toBe(201);
    await new Promise(r => setTimeout(r, 100));

    // Should only send to the admin with an email
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy.mock.calls[0][0].to).toBe('has-email@nbi.test');
  });

  it('does not send to client-scoped admin users (only NBI admins)', async () => {
    const clientA = await createTestClient({ name: 'ClientA' });
    const clientB = await createTestClient({ name: 'ClientB' });
    // NBI admin (no client_id)
    await createTestUser({ role: 'admin', email: 'nbi-admin@nbi.test' });
    // Client admin (has client_id) — should NOT receive notifications
    await createTestUser({ role: 'admin', email: 'client-admin@client.test', client_id: clientB.id, client_role: 'admin' });
    const clientUser = await createTestUser({
      role: 'member', client_id: clientA.id, client_role: 'member',
    });
    const token = await mintSession(clientUser.id);

    const res = await request(app)
      .post('/api/bug-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'NBI-only notification test', type: 'bug' });

    expect(res.status).toBe(201);
    await new Promise(r => setTimeout(r, 100));

    // Should only send to the NBI admin, not the client admin
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy.mock.calls[0][0].to).toBe('nbi-admin@nbi.test');
  });
});
