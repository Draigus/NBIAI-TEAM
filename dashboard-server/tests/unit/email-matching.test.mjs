// dashboard-server/tests/unit/email-matching.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { pool, truncate } = require('../helpers/db.js');
const { createTestUser, createTestClient, createTestTask } = require('../helpers/fixtures.js');
const { matchSubjectToTask } = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('matchSubjectToTask', () => {
  it('matches exact client name in subject and falls back to most recent project', async () => {
    const client = await createTestClient({ name: 'Lighthouse Games' });
    const project = await createTestTask({ title: 'LH Rebranding', client_id: client.id, item_type: 'project', status: 'In progress' });

    const result = await matchSubjectToTask('Lighthouse Games - some feedback');
    expect(result.taskId).toBe(project.id);
    expect(result.clientId).toBe(client.id);
    expect(result.confidence).toBe('high');
  });

  it('matches deeper in the hierarchy when feature title appears in subject', async () => {
    const client = await createTestClient({ name: 'Sumo Digital Ltd' });
    const project = await createTestTask({ title: 'Sumo Hiring', client_id: client.id, item_type: 'project', status: 'In progress' });
    const feature = await createTestTask({ title: 'Character Design', client_id: client.id, item_type: 'feature', parent_id: project.id, status: 'In progress' });

    const result = await matchSubjectToTask('Sumo Digital Ltd - Character Design review');
    expect(result.taskId).toBe(feature.id);
    expect(result.confidence).toBe('high');
  });

  it('case-insensitive matching', async () => {
    const client = await createTestClient({ name: 'Epic games' });
    const project = await createTestTask({ title: 'Epic Onboarding', client_id: client.id, item_type: 'project', status: 'In progress' });

    const result = await matchSubjectToTask('EPIC GAMES - onboarding docs');
    expect(result.taskId).toBe(project.id);
    expect(result.confidence).toBe('high');
  });

  it('returns low confidence when no exact client match but partial match exists', async () => {
    const client = await createTestClient({ name: 'Lighthouse Games' });
    const project = await createTestTask({ title: 'LH Project', client_id: client.id, item_type: 'project', status: 'In progress' });

    const result = await matchSubjectToTask('Lighthouse new assets');
    expect(result.taskId).toBe(project.id);
    expect(result.confidence).toBe('low');
  });

  it('returns null taskId when no client matches at all', async () => {
    await createTestClient({ name: 'Totally Different' });

    const result = await matchSubjectToTask('Random unrelated email');
    expect(result.taskId).toBeNull();
    expect(result.confidence).toBe('none');
  });

  it('skips Done and Cancelled tasks when matching', async () => {
    const client = await createTestClient({ name: 'Hello Games' });
    await createTestTask({ title: 'Old Project', client_id: client.id, item_type: 'project', status: 'Done' });
    const active = await createTestTask({ title: 'New Project', client_id: client.id, item_type: 'project', status: 'In progress' });

    const result = await matchSubjectToTask('Hello Games - update');
    expect(result.taskId).toBe(active.id);
  });
});
