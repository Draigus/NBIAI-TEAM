import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

async function seedItem(section, itemId, data) {
  await pool.query(
    `INSERT INTO meeting_items (item_id, section, data, source) VALUES ($1, $2, $3, 'compiled')`,
    [itemId, section, JSON.stringify(data)]
  );
}

async function seedMeta(count, start, end, compiled) {
  await pool.query(
    `INSERT INTO meeting_metadata (id, meeting_count, date_range_start, date_range_end, compiled_at)
     VALUES (1, $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET meeting_count=$1, date_range_start=$2, date_range_end=$3, compiled_at=$4`,
    [count, start, end, compiled]
  );
}

describe('meetings-intelligence CRUD', () => {
  let token;
  beforeEach(async () => {
    const user = await createTestUser({ role: 'admin' });
    token = await mintSession(user.id);
  });

  it('GET /api/meetings/compiled returns empty when no data', async () => {
    const res = await request(app)
      .get('/api/meetings/compiled')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.sections.actions).toEqual([]);
    expect(res.body.meeting_count).toBe(0);
  });

  it('GET /api/meetings/compiled returns seeded data', async () => {
    await seedMeta(3, '2026-03-06', '2026-05-22', '2026-06-01T12:00:00.000Z');
    await seedItem('actions', 'act_test_1', { date: '2026-05-21', description: 'Test action', status: 'open', workstream: 'nbi' });
    await seedItem('decisions', 'dec_test_1', { date: '2026-05-20', decision: 'Test decision', workstream: 'nbi' });

    const res = await request(app)
      .get('/api/meetings/compiled')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.meeting_count).toBe(3);
    expect(res.body.sections.actions).toHaveLength(1);
    expect(res.body.sections.actions[0].id).toBe('act_test_1');
    expect(res.body.sections.actions[0].description).toBe('Test action');
    expect(res.body.sections.decisions).toHaveLength(1);
  });

  it('POST /api/meetings/items creates an item', async () => {
    const res = await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'actions', data: { description: 'New action', status: 'open' } })
      .expect(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.description).toBe('New action');
    expect(res.body.source).toBe('manual');
  });

  it('POST /api/meetings/items validates required fields', async () => {
    await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'actions', data: { description: 'Missing status' } })
      .expect(400);
  });

  it('POST /api/meetings/items rejects invalid section', async () => {
    await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'invalid', data: { x: 1 } })
      .expect(400);
  });

  it('PATCH /api/meetings/items/:id updates fields', async () => {
    await seedItem('actions', 'act_patch_test', { description: 'Original', status: 'open', workstream: 'nbi' });

    const res = await request(app)
      .patch('/api/meetings/items/act_patch_test')
      .set('Cookie', `nbi_session=${token}`)
      .send({ data: { status: 'done' } })
      .expect(200);
    expect(res.body.status).toBe('done');
    expect(res.body.description).toBe('Original');
  });

  it('PATCH /api/meetings/items/:id returns 404 for missing item', async () => {
    await request(app)
      .patch('/api/meetings/items/nonexistent')
      .set('Cookie', `nbi_session=${token}`)
      .send({ data: { status: 'done' } })
      .expect(404);
  });

  it('DELETE /api/meetings/items/:id removes item', async () => {
    await seedItem('actions', 'act_del_test', { description: 'To delete', status: 'open' });

    await request(app)
      .delete('/api/meetings/items/act_del_test')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    const { rows } = await pool.query("SELECT * FROM meeting_items WHERE item_id = 'act_del_test'");
    expect(rows).toHaveLength(0);
  });

  it('DELETE /api/meetings/items/:id returns 404 for missing item', async () => {
    await request(app)
      .delete('/api/meetings/items/nonexistent')
      .set('Cookie', `nbi_session=${token}`)
      .expect(404);
  });

  it('GET /api/meetings/stats returns correct counts', async () => {
    await seedMeta(10, '2026-03-06', '2026-05-22', null);
    await seedItem('actions', 'a1', { description: 'A1', status: 'open' });
    await seedItem('actions', 'a2', { description: 'A2', status: 'done' });
    await seedItem('decisions', 'd1', { decision: 'D1' });

    const res = await request(app)
      .get('/api/meetings/stats')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.meeting_count).toBe(10);
    expect(res.body.action_count).toBe(2);
    expect(res.body.open_actions).toBe(1);
    expect(res.body.done_actions).toBe(1);
    expect(res.body.decision_count).toBe(1);
  });

  it('POST with custom item_id uses it', async () => {
    const res = await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'decisions', item_id: 'dec_custom_id', data: { decision: 'Custom ID test' } })
      .expect(201);
    expect(res.body.id).toBe('dec_custom_id');
  });

  it('POST with duplicate item_id returns 409', async () => {
    await seedItem('actions', 'act_dup', { description: 'Existing', status: 'open' });

    await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'actions', item_id: 'act_dup', data: { description: 'Duplicate', status: 'open' } })
      .expect(409);
  });

  it('POST meetings section creates with deterministic ID', async () => {
    const res = await request(app)
      .post('/api/meetings/items')
      .set('Cookie', `nbi_session=${token}`)
      .send({ section: 'meetings', data: { title: 'Test Meeting', date: '2026-04-15', attendees: ['Glen', 'Aris'], summary: 'Test summary' } })
      .expect(201);
    expect(res.body.id).toBe('mtg_20260415_test-meeting');
    expect(res.body.title).toBe('Test Meeting');
    expect(res.body.source).toBe('manual');
  });

  it('GET compiled includes meetings section', async () => {
    await seedItem('meetings', 'mtg_20260415_test', { title: 'Test', date: '2026-04-15', summary: 'S' });
    const res = await request(app)
      .get('/api/meetings/compiled')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.sections.meetings).toHaveLength(1);
    expect(res.body.sections.meetings[0].id).toBe('mtg_20260415_test');
  });

  it('GET stats includes meeting_record_count', async () => {
    await seedItem('meetings', 'mtg_s1', { title: 'M1', date: '2026-04-15' });
    await seedItem('meetings', 'mtg_s2', { title: 'M2', date: '2026-04-16' });
    const res = await request(app)
      .get('/api/meetings/stats')
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
    expect(res.body.meeting_record_count).toBe(2);
  });
});
