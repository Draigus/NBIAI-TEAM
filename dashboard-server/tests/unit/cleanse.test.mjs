import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestTask, createTestContact, createTestLead, createTestLeadStage, createTestExpense, createTestSow, createTestClientNote, createTestBugReport } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

describe('GET /api/admin/cleanse/preview', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/cleanse/preview');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin users', async () => {
    const user = await createTestUser({ role: 'member' });
    const token = await mintSession(user.id);
    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects client-portal users', async () => {
    const client = await createTestClient();
    const user = await createTestUser({ role: 'admin', client_id: client.id, client_role: 'admin' });
    const token = await mintSession(user.id);
    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns category list with correct counts', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    await createTestTask({ client_id: client.id });
    await createTestTask({ client_id: client.id });
    await createTestContact({ client_id: client.id });

    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Version', '2');
    expect(res.status).toBe(200);

    const categories = res.body.data.categories;
    expect(Array.isArray(categories)).toBe(true);

    const tasksCat = categories.find(c => c.id === 'tasks');
    expect(tasksCat).toBeDefined();
    expect(tasksCat.count).toBe(2);
    expect(tasksCat.label).toBe('Projects & Tasks');

    const clientsCat = categories.find(c => c.id === 'clients');
    expect(clientsCat).toBeDefined();
    expect(clientsCat.count).toBe(1);
    expect(clientsCat.tier).toBe('nuclear');
    expect(clientsCat.cascades).toContain('contacts');
  });

  it('returns zero counts for empty categories', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .get('/api/admin/cleanse/preview')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Version', '2');
    expect(res.status).toBe(200);

    const categories = res.body.data.categories;
    const tasksCat = categories.find(c => c.id === 'tasks');
    expect(tasksCat.count).toBe(0);
  });
});

describe('POST /api/admin/cleanse', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/admin/cleanse')
      .send({ categories: ['tasks'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(401);
  });

  it('rejects wrong confirmation string', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: ['tasks'], confirmation: 'wrong' });
    expect(res.status).toBe(400);
    expect(res.body.error.message || res.body.error).toMatch(/confirmation/i);
  });

  it('rejects empty categories array', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: [], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid category IDs', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: ['tasks', 'not_real'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(400);
    expect(res.body.error.message || res.body.error).toMatch(/not_real/);
  });

  it('deletes tasks and cascades to child tables', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const task = await createTestTask();
    await pool.query('INSERT INTO task_notes (task_id, text, author) VALUES ($1, $2, $3)', [task.id, 'note', 'test']);

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Version', '2')
      .send({ categories: ['tasks'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted.tasks).toBe(1);

    const remaining = await pool.query('SELECT count(*)::int AS n FROM tasks');
    expect(remaining.rows[0].n).toBe(0);
    const notes = await pool.query('SELECT count(*)::int AS n FROM task_notes');
    expect(notes.rows[0].n).toBe(0);
  });

  it('nullifies FK columns when contacts deleted without leads', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    const contact = await createTestContact({ client_id: client.id });
    const stage = await createTestLeadStage();
    const lead = await createTestLead({ client_id: client.id, stage_id: stage.id });
    // Manually set primary_contact_id since createTestLead doesn't support it
    await pool.query('UPDATE leads SET primary_contact_id = $1 WHERE id = $2', [contact.id, lead.id]);

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .send({ categories: ['contacts'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);

    const leads = await pool.query('SELECT primary_contact_id FROM leads');
    expect(leads.rows[0].primary_contact_id).toBeNull();
  });

  it('deletes clients and cascades all dependent categories', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    await createTestContact({ client_id: client.id });
    await createTestClientNote({ client_id: client.id });
    const stage = await createTestLeadStage();
    await createTestLead({ client_id: client.id, stage_id: stage.id });
    const task = await createTestTask({ client_id: client.id });

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Version', '2')
      .send({ categories: ['clients'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted.clients).toBeGreaterThanOrEqual(1);
    expect(res.body.data.deleted.contacts).toBeGreaterThanOrEqual(1);
    expect(res.body.data.deleted.leads).toBeGreaterThanOrEqual(1);

    // Task should remain but with client_id nullified
    const tasks = await pool.query('SELECT client_id FROM tasks WHERE id = $1', [task.id]);
    expect(tasks.rows[0].client_id).toBeNull();
  });

  it('returns localStorageKeys in response', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    await createTestTask();

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Version', '2')
      .send({ categories: ['tasks'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.localStorageKeys)).toBe(true);
    expect(res.body.data.localStorageKeys).toContain('nbi_dashboard_tasks');
  });

  it('handles multiple categories in one request', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    await createTestTask();
    const stage = await createTestLeadStage();
    await createTestLead({ stage_id: stage.id });

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Version', '2')
      .send({ categories: ['tasks', 'leads'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted.tasks).toBeGreaterThan(0);
    expect(res.body.data.deleted.leads).toBeGreaterThan(0);

    const t = await pool.query('SELECT count(*)::int AS n FROM tasks');
    expect(t.rows[0].n).toBe(0);
    const l = await pool.query('SELECT count(*)::int AS n FROM leads');
    expect(l.rows[0].n).toBe(0);
  });

  it('clients category forces cascade of contacts, leads, client_notes, sows', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient();
    await createTestContact({ client_id: client.id });
    await createTestSow({ client_id: client.id });

    const res = await request(app)
      .post('/api/admin/cleanse')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Version', '2')
      .send({ categories: ['clients'], confirmation: 'DELETE ALL SELECTED DATA' });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted.contacts).toBe(1);
    expect(res.body.data.deleted.sows).toBe(1);
  });
});
