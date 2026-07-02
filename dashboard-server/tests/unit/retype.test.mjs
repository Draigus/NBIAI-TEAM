import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestTask, createTestClient } = require('../helpers/fixtures.js');
const app = require('../../server.js');

// No afterAll(end()) — the pool is shared across test files and is
// closed when the fork exits. Ending it here poisons every file that
// runs after this one ("Cannot use a pool after calling end on the pool").

describe('PATCH /api/tasks/:id/retype', () => {
  let user, token;

  beforeEach(async () => {
    await truncate();
    user = await createTestUser({ role: 'admin' });
    token = await mintSession(user.id);
  });

  it('retypes a single item with no children', async () => {
    const client = await createTestClient();
    // Create an initiative root, then a project under it
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', parent_id: init.id, title: 'MyProject' });

    const res = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });

    expect(res.status).toBe(200);
    expect(res.body.changes).toHaveLength(1);
    expect(res.body.changes[0].id).toBe(proj.id);
    expect(res.body.changes[0].previousType).toBe('project');
    expect(res.body.changes[0].newType).toBe('feature');
    expect(res.body.undoToken).toBeDefined();

    // Verify DB
    const { rows } = await pool.query('SELECT item_type FROM tasks WHERE id = $1', [proj.id]);
    expect(rows[0].item_type).toBe('feature');
  });

  it('cascades retype to descendants with offset', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', parent_id: init.id, title: 'P1' });
    const feat = await createTestTask({ client_id: client.id, item_type: 'feature', parent_id: proj.id, title: 'F1' });
    const story = await createTestTask({ client_id: client.id, item_type: 'story', parent_id: feat.id, title: 'S1' });

    // Retype project -> feature (offset +1)
    // feature -> story, story -> task
    const res = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });

    expect(res.status).toBe(200);
    expect(res.body.changes).toHaveLength(3);

    const byId = {};
    for (const c of res.body.changes) byId[c.id] = c;

    expect(byId[proj.id].newType).toBe('feature');
    expect(byId[feat.id].newType).toBe('story');
    expect(byId[story.id].newType).toBe('task');

    // Verify DB
    const { rows } = await pool.query(
      'SELECT id, item_type FROM tasks WHERE id = ANY($1)',
      [[proj.id, feat.id, story.id]]
    );
    const dbMap = {};
    for (const r of rows) dbMap[r.id] = r.item_type;
    expect(dbMap[proj.id]).toBe('feature');
    expect(dbMap[feat.id]).toBe('story');
    expect(dbMap[story.id]).toBe('task');
  });

  it('clamps descendants at task level', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const feat = await createTestTask({ client_id: client.id, item_type: 'feature', parent_id: init.id, title: 'F1' });
    const story = await createTestTask({ client_id: client.id, item_type: 'story', parent_id: feat.id, title: 'S1' });
    const task = await createTestTask({ client_id: client.id, item_type: 'task', parent_id: story.id, title: 'T1' });

    // Retype feature -> task (offset +2), story would go to idx 5 (clamped to 4=task), task would go to idx 6 (clamped to 4=task)
    const res = await request(app)
      .patch(`/api/tasks/${feat.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'task' });

    expect(res.status).toBe(200);

    // All three should be changed
    const byId = {};
    for (const c of res.body.changes) byId[c.id] = c;

    expect(byId[feat.id].newType).toBe('task');
    expect(byId[story.id].newType).toBe('task');
    expect(byId[task.id].newType).toBe('task');
  });

  it('fixes equal-type nesting after clamping by reparenting', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const feat = await createTestTask({ client_id: client.id, item_type: 'feature', parent_id: init.id, title: 'F1' });
    const story = await createTestTask({ client_id: client.id, item_type: 'story', parent_id: feat.id, title: 'S1' });
    const task = await createTestTask({ client_id: client.id, item_type: 'task', parent_id: story.id, title: 'T1' });

    // Retype feature -> task (offset +2). story and task both clamp to task.
    // story (task) is child of feat (task) -- same type, needs reparenting.
    // task (task) is child of story (task) -- also same type, needs reparenting.
    const res = await request(app)
      .patch(`/api/tasks/${feat.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'task' });

    expect(res.status).toBe(200);

    // After fix: story and task should be reparented to feat's parent (init)
    // since feat is now task under init, and story/task can't nest under same-type
    const { rows } = await pool.query(
      'SELECT id, parent_id, item_type FROM tasks WHERE id = ANY($1) ORDER BY created_at',
      [[feat.id, story.id, task.id]]
    );
    const dbMap = {};
    for (const r of rows) dbMap[r.id] = r;

    // feat stays under init
    expect(dbMap[feat.id].parent_id).toBe(init.id);
    expect(dbMap[feat.id].item_type).toBe('task');

    // story should be reparented to init (nearest valid ancestor above feat)
    expect(dbMap[story.id].parent_id).toBe(init.id);
    expect(dbMap[story.id].item_type).toBe('task');

    // task should also be reparented to init
    expect(dbMap[task.id].parent_id).toBe(init.id);
    expect(dbMap[task.id].item_type).toBe('task');
  });

  it('rejects invalid newType', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', parent_id: init.id, title: 'P1' });

    const res = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'epic' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects retyping that would violate parent constraint', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', parent_id: init.id, title: 'P1' });
    const feat = await createTestTask({ client_id: client.id, item_type: 'feature', parent_id: proj.id, title: 'F1' });

    // Try to retype feature to initiative -- parent (project) is not above initiative
    const res = await request(app)
      .patch(`/api/tasks/${feat.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'initiative' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns empty changes when newType equals current type', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', parent_id: init.id, title: 'P1' });

    const res = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'project' });

    expect(res.status).toBe(200);
    expect(res.body.changes).toHaveLength(0);
    expect(res.body.undoToken).toBeNull();
  });
});

describe('PATCH /api/tasks/retype-undo', () => {
  let user, token;

  beforeEach(async () => {
    await truncate();
    user = await createTestUser({ role: 'admin' });
    token = await mintSession(user.id);
  });

  it('reverts a cascade with valid undo token', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', parent_id: init.id, title: 'P1' });
    const feat = await createTestTask({ client_id: client.id, item_type: 'feature', parent_id: proj.id, title: 'F1' });

    // Retype project -> feature
    const retypeRes = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });

    expect(retypeRes.status).toBe(200);
    const { undoToken } = retypeRes.body;

    // Undo
    const undoRes = await request(app)
      .patch('/api/tasks/retype-undo')
      .set('Authorization', `Bearer ${token}`)
      .send({ undoToken });

    expect(undoRes.status).toBe(200);
    expect(undoRes.body.reverted).toBe(2);

    // Verify DB restored
    const { rows } = await pool.query(
      'SELECT id, item_type FROM tasks WHERE id = ANY($1)',
      [[proj.id, feat.id]]
    );
    const dbMap = {};
    for (const r of rows) dbMap[r.id] = r.item_type;
    expect(dbMap[proj.id]).toBe('project');
    expect(dbMap[feat.id]).toBe('feature');
  });

  it('rejects expired undo token with 410', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', parent_id: init.id, title: 'P1' });

    // Retype
    const retypeRes = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });

    const { undoToken } = retypeRes.body;

    // Expire the token manually
    await pool.query(
      "UPDATE retype_undo_tokens SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1",
      [undoToken]
    );

    const undoRes = await request(app)
      .patch('/api/tasks/retype-undo')
      .set('Authorization', `Bearer ${token}`)
      .send({ undoToken });

    expect(undoRes.status).toBe(410);
  });

  it('rejects when a row was modified after cascade (409)', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', parent_id: init.id, title: 'P1' });

    // Retype
    const retypeRes = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });

    const { undoToken } = retypeRes.body;

    // Simulate another user modifying the item (bumps version again)
    await pool.query('UPDATE tasks SET title = $1, version = version + 1 WHERE id = $2', ['Modified', proj.id]);

    const undoRes = await request(app)
      .patch('/api/tasks/retype-undo')
      .set('Authorization', `Bearer ${token}`)
      .send({ undoToken });

    expect(undoRes.status).toBe(409);
    expect(undoRes.body.error).toMatch(/modified/i);
  });

  it('undo token is single-use (second attempt returns 410)', async () => {
    const client = await createTestClient();
    const init = await createTestTask({ client_id: client.id, item_type: 'initiative', parent_id: null, title: 'Root' });
    const proj = await createTestTask({ client_id: client.id, item_type: 'project', parent_id: init.id, title: 'P1' });

    // Retype
    const retypeRes = await request(app)
      .patch(`/api/tasks/${proj.id}/retype`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newType: 'feature' });

    const { undoToken } = retypeRes.body;

    // First undo succeeds
    const firstUndo = await request(app)
      .patch('/api/tasks/retype-undo')
      .set('Authorization', `Bearer ${token}`)
      .send({ undoToken });
    expect(firstUndo.status).toBe(200);

    // Second undo fails
    const secondUndo = await request(app)
      .patch('/api/tasks/retype-undo')
      .set('Authorization', `Bearer ${token}`)
      .send({ undoToken });
    expect(secondUndo.status).toBe(410);
  });
});
