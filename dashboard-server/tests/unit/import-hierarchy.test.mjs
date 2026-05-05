// dashboard-server/tests/unit/import-hierarchy.test.mjs
//
// Tests for the new "nbi-hierarchy-csv" import format that preserves
// project/feature/story/task hierarchy via _temp_id + _temp_parent_id
// columns. Built to fix the failed Lighthouse Backlog Builder import
// (bug df1fb00b) where the hierarchy collapsed to flat tasks.
//
// Sections:
//   1. detectImportFormat — recognises hierarchy CSV by header triple
//   2. mapRowsToTasks 'nbi-hierarchy-csv' — passes all 17 columns through
//   3. POST /api/tasks/bulk — accepts hierarchy fields + resolves
//      client name -> UUID + links parents via _temp_id

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient } = require('../helpers/fixtures.js');
const app = require('../../server.js');
const { detectImportFormat, mapRowsToTasks } = require('../../server.js');

beforeEach(async () => { await truncate(); });

// ============================================================================
// 1. Format detector
// ============================================================================

describe('detectImportFormat (hierarchy CSV)', () => {
  it('returns nbi-hierarchy-csv when _temp_id + _temp_parent_id + item_type all present', () => {
    const headers = ['_temp_id', '_temp_parent_id', 'item_type', 'task', 'description', 'status'];
    const result = detectImportFormat(headers);
    expect(result.format).toBe('nbi-hierarchy-csv');
  });

  it('returns nbi-hierarchy-csv even with extra columns mixed in', () => {
    const headers = ['_temp_id', '_temp_parent_id', 'item_type', 'task', 'description',
      'status', 'priority', 'hours_estimated', 'assignees', 'client_id', 'practice_area',
      'start_date', 'end_date', 'due_date', 'success_factor', 'collaborations', 'notes'];
    expect(detectImportFormat(headers).format).toBe('nbi-hierarchy-csv');
  });

  it('does NOT return nbi-hierarchy-csv when only _temp_id is present (missing item_type)', () => {
    const headers = ['_temp_id', 'task', 'description', 'status'];
    expect(detectImportFormat(headers).format).not.toBe('nbi-hierarchy-csv');
  });

  it('does NOT return nbi-hierarchy-csv when only item_type is present (missing _temp_id)', () => {
    const headers = ['item_type', 'task', 'description', 'status'];
    expect(detectImportFormat(headers).format).not.toBe('nbi-hierarchy-csv');
  });

  it('still detects nbi-csv for legacy task/status/priority headers (regression)', () => {
    const headers = ['task', 'status', 'priority', 'assignee'];
    expect(detectImportFormat(headers).format).toBe('nbi-csv');
  });

  it('detection is case-insensitive on header names', () => {
    const headers = ['_TEMP_ID', '_Temp_Parent_Id', 'ITEM_TYPE', 'task'];
    expect(detectImportFormat(headers).format).toBe('nbi-hierarchy-csv');
  });
});

// ============================================================================
// 2. Mapper (nbi-hierarchy-csv branch)
// ============================================================================

describe('mapRowsToTasks (nbi-hierarchy-csv branch)', () => {
  const headers = ['_temp_id', '_temp_parent_id', 'item_type', 'task', 'description',
    'status', 'priority', 'hours_estimated', 'assignees', 'client_id', 'practice_area',
    'start_date', 'end_date', 'due_date', 'success_factor', 'collaborations', 'notes'];

  it('preserves _temp_id and _temp_parent_id on every row', () => {
    const rows = [
      ['P1', '', 'project', 'My Project', '', 'Not started', '', '', '', 'Lighthouse Games', 'gaming', '', '', '', '', '', ''],
      ['F1', 'P1', 'feature', 'My Feature', '', 'Not started', '', '', '', 'Lighthouse Games', 'gaming', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0]._temp_id).toBe('P1');
    expect(out[0]._temp_parent_id).toBe('');
    expect(out[1]._temp_id).toBe('F1');
    expect(out[1]._temp_parent_id).toBe('P1');
  });

  it('sets item_type to project / feature / story / task as given', () => {
    const rows = [
      ['P1', '', 'project', 'P', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['F1', 'P1', 'feature', 'F', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['S1', 'F1', 'story', 'S', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['T1', 'S1', 'task', 'T', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out.map(r => r.item_type)).toEqual(['project', 'feature', 'story', 'task']);
  });

  it('normalises dd/mm/yyyy dates to ISO yyyy-mm-dd', () => {
    const rows = [
      ['T1', '', 'task', 'T', '', '', '', '', '', '', '', '11/05/2026', '01/06/2026', '25/05/2026', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0].start_date).toBe('2026-05-11');
    expect(out[0].end_date).toBe('2026-06-01');
    expect(out[0].due_date).toBe('2026-05-25');
  });

  it('leaves blank dates blank (not "NaN-NaN-NaN" or anything weird)', () => {
    const rows = [
      ['T1', '', 'task', 'T', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0].start_date).toBe('');
    expect(out[0].end_date).toBe('');
    expect(out[0].due_date).toBe('');
  });

  it('passes through ISO yyyy-mm-dd dates unchanged', () => {
    const rows = [
      ['T1', '', 'task', 'T', '', '', '', '', '', '', '', '2026-05-11', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0].start_date).toBe('2026-05-11');
  });

  it('normalises status casing (Not Started -> Not started; Complete -> Done)', () => {
    const rows = [
      ['T1', '', 'task', 'T1', '', 'Not Started', '', '', '', '', '', '', '', '', '', '', ''],
      ['T2', '', 'task', 'T2', '', 'In Progress', '', '', '', '', '', '', '', '', '', '', ''],
      ['T3', '', 'task', 'T3', '', 'Complete', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0].status).toBe('Not started');
    expect(out[1].status).toBe('In progress');
    expect(out[2].status).toBe('Done');
  });

  it('splits assignees on comma, semicolon, or "/" and trims', () => {
    const rows = [
      ['T1', '', 'task', 'T', '', '', '', '', 'Marie, Ruan; Stavros', '', '', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0].assignees).toEqual(['Marie', 'Ruan', 'Stavros']);
  });

  it('captures client_id text (e.g. "Lighthouse Games") for downstream resolution', () => {
    const rows = [
      ['T1', '', 'task', 'T', '', '', '', '', '', 'Lighthouse Games', '', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0].client).toBe('Lighthouse Games');
  });

  it('captures practice_area, success_factor, collaborations, notes, hours_estimated', () => {
    const rows = [
      ['T1', '', 'task', 'T', 'desc here', 'Not started', 'Critical', '4', 'Marie',
       'Lighthouse Games', 'gaming', '', '', '', 'success criteria here', 'Service team', 'note here'],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0].practice_area).toBe('gaming');
    expect(out[0].success_factor).toBe('success criteria here');
    expect(out[0].collaborations).toBe('Service team');
    expect(out[0].notes).toBe('note here');
    expect(out[0].hoursEstimated).toBe(4);
  });

  it('captures hours_spent alongside hours_estimated', () => {
    const headersWithSpent = ['_temp_id', '_temp_parent_id', 'item_type', 'task', 'description',
      'status', 'priority', 'hours_estimated', 'hours_spent', 'assignees', 'client_id', 'practice_area',
      'start_date', 'end_date', 'due_date', 'success_factor', 'collaborations', 'notes'];
    const rows = [
      ['T1', '', 'task', 'My Task', '', 'Not started', '', '8', '3', 'Marie',
       'Lighthouse Games', 'gaming', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headersWithSpent, rows);
    expect(out[0].hoursEstimated).toBe(8);
    expect(out[0].hoursSpent).toBe(3);
  });

  it('defaults hoursSpent to 0 when column is absent', () => {
    const rows = [
      ['T1', '', 'task', 'My Task', '', 'Not started', '', '4', 'Marie',
       'Lighthouse Games', 'gaming', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0].hoursEstimated).toBe(4);
    expect(out[0].hoursSpent).toBe(0);
  });

  it('maps Critical priority through (preserving the upstream "Critical" value)', () => {
    const rows = [
      ['T1', '', 'task', 'T', '', '', 'Critical', '', '', '', '', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    // We accept either 'Critical' or 'Critical ACT' (whatever the existing
    // priority normaliser picks). Just ensure it's not empty/dropped.
    expect(out[0].priority).toMatch(/^Critical/);
  });

  it('drops rows with empty title (e.g. CSV typo with empty task field)', () => {
    const rows = [
      ['S2.1', 'F2', 'story', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['T1', '', 'task', 'Real Task', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Real Task');
  });
});

// ============================================================================
// 3. POST /api/tasks/bulk integration
// ============================================================================

describe('POST /api/tasks/bulk (hierarchy import path)', () => {
  let admin, token, lighthouse;

  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin' });
    token = await mintSession(admin.id);
    lighthouse = await createTestClient({ name: 'Lighthouse Games', sector: 'gaming' });
  });

  it('creates a project + feature + story + task with correct item_type and parent links via _temp_id', async () => {
    const tasks = [
      { _temp_id: 'P1', title: 'Data Systems', item_type: 'project', client_id: lighthouse.id },
      { _temp_id: 'F1', _temp_parent_id: 'P1', title: 'Core Tables', item_type: 'feature', client_id: lighthouse.id },
      { _temp_id: 'S1', _temp_parent_id: 'F1', title: 'dim_date', item_type: 'story', client_id: lighthouse.id },
      { _temp_id: 'T1', _temp_parent_id: 'S1', title: 'Define schema', item_type: 'task', client_id: lighthouse.id, hours_estimated: 3 },
    ];
    const res = await request(app)
      .post('/api/tasks/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks });
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(4);

    const { rows } = await pool.query(
      `SELECT id, title, item_type, parent_id, client_id, hours_estimated
       FROM tasks WHERE client_id = $1 ORDER BY item_type DESC, title`,
      [lighthouse.id]
    );
    expect(rows).toHaveLength(4);
    const byTitle = Object.fromEntries(rows.map(r => [r.title, r]));
    expect(byTitle['Data Systems'].item_type).toBe('project');
    expect(byTitle['Data Systems'].parent_id).toBeNull();
    expect(byTitle['Core Tables'].item_type).toBe('feature');
    expect(byTitle['Core Tables'].parent_id).toBe(byTitle['Data Systems'].id);
    expect(byTitle['dim_date'].item_type).toBe('story');
    expect(byTitle['dim_date'].parent_id).toBe(byTitle['Core Tables'].id);
    expect(byTitle['Define schema'].item_type).toBe('task');
    expect(byTitle['Define schema'].parent_id).toBe(byTitle['dim_date'].id);
    expect(byTitle['Define schema'].hours_estimated).toBe(3);
  });

  it('persists start_date, end_date, success_factor, practice_area, collaborations', async () => {
    const tasks = [
      { _temp_id: 'T1', title: 'Schema task', item_type: 'task', client_id: lighthouse.id,
        start_date: '2026-05-11', end_date: '2026-06-01', due_date: '2026-05-25',
        success_factor: 'Schema delivered with sign-off', practice_area: 'gaming',
        collaborations: 'IT for Entra work' },
    ];
    const res = await request(app)
      .post('/api/tasks/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks });
    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      `SELECT title, start_date, end_date, due_date, success_factor, practice_area, collaborations
       FROM tasks WHERE client_id = $1`, [lighthouse.id]
    );
    expect(rows[0].start_date).toBe('2026-05-11');
    expect(rows[0].end_date).toBe('2026-06-01');
    expect(rows[0].due_date).toBe('2026-05-25');
    expect(rows[0].success_factor).toBe('Schema delivered with sign-off');
    expect(rows[0].practice_area).toBe('gaming');
    expect(rows[0].collaborations).toBe('IT for Entra work');
  });

  it('resolves a client by NAME when client is passed instead of client_id', async () => {
    const tasks = [
      { _temp_id: 'P1', title: 'Project for LH', item_type: 'project', client: 'Lighthouse Games' },
    ];
    const res = await request(app)
      .post('/api/tasks/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks });
    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      'SELECT client_id FROM tasks WHERE title = $1', ['Project for LH']);
    expect(rows[0].client_id).toBe(lighthouse.id);
  });

  it('returns 400 when an unknown client name is supplied', async () => {
    const tasks = [
      { _temp_id: 'P1', title: 'Orphan project', item_type: 'project', client: 'Nonexistent Studio' },
    ];
    const res = await request(app)
      .post('/api/tasks/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/client/i);
    expect(res.body.error).toMatch(/Nonexistent Studio/);
  });

  it('keeps existing nbi-csv import path working: title-only tasks still create', async () => {
    const tasks = [
      { title: 'Plain task A', client_id: lighthouse.id },
      { title: 'Plain task B', client_id: lighthouse.id },
    ];
    const res = await request(app)
      .post('/api/tasks/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks });
    expect(res.status).toBe(201);
    const { rows } = await pool.query(
      'SELECT title, item_type FROM tasks WHERE client_id = $1 ORDER BY title',
      [lighthouse.id]
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].item_type).toBe('task');
  });

  it('auto-repairs orphan story parent_ids from the _temp_id prefix (S6.1 with blank parent -> F6)', async () => {
    // Mirrors the LH Backlog Builder source CSV where S6.1, S6.2, S6.3 etc.
    // have empty _temp_parent_id cells but should belong to F6.
    const tasks = [
      { _temp_id: 'P1', title: 'Project', item_type: 'project', client_id: lighthouse.id },
      { _temp_id: 'F6', _temp_parent_id: 'P1', title: 'Analytics - Telemetry', item_type: 'feature', client_id: lighthouse.id },
      { _temp_id: 'S6.0', _temp_parent_id: 'F6', title: 'Phase 1 QA', item_type: 'story', client_id: lighthouse.id },
      { _temp_id: 'S6.1', /* parent blank */ title: 'Phase 2 QA', item_type: 'story', client_id: lighthouse.id },
      { _temp_id: 'S6.2', /* parent blank */ title: 'Phase 3 QA', item_type: 'story', client_id: lighthouse.id },
      { _temp_id: 'T6.2.1', /* parent blank */ title: 'Phase 3 QA Initial Review', item_type: 'task', client_id: lighthouse.id },
    ];
    const res = await request(app)
      .post('/api/tasks/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks });
    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      `SELECT id, title, item_type, parent_id FROM tasks WHERE client_id = $1`,
      [lighthouse.id]
    );
    const byTitle = Object.fromEntries(rows.map(r => [r.title, r]));
    // S6.1 and S6.2 should now hang under the F6 feature
    expect(byTitle['Phase 2 QA'].parent_id).toBe(byTitle['Analytics - Telemetry'].id);
    expect(byTitle['Phase 3 QA'].parent_id).toBe(byTitle['Analytics - Telemetry'].id);
    // T6.2.1 should hang under S6.2 (the story matching its prefix)
    expect(byTitle['Phase 3 QA Initial Review'].parent_id).toBe(byTitle['Phase 3 QA'].id);
  });

  it('auto-repairs tasks whose parent _temp_id was dropped (e.g. T2.2.1 pointing at empty-title S2.1 falls back to F2)', async () => {
    // Mirrors the LH source CSV: S2.1 has empty title so the mapper drops it.
    // Eleven T2.2.X tasks reference S2.1 — they should fall back to feature F2.
    const tasks = [
      { _temp_id: 'P1', title: 'Project', item_type: 'project', client_id: lighthouse.id },
      { _temp_id: 'F2', _temp_parent_id: 'P1', title: 'Alpha Ready Dashboards', item_type: 'feature', client_id: lighthouse.id },
      // S2.1 deliberately not in the batch — simulating the dropped empty-title row
      { _temp_id: 'T2.2.1', _temp_parent_id: 'S2.1', title: 'FTUE Dash Initial Concept Exploration', item_type: 'task', client_id: lighthouse.id },
      { _temp_id: 'T2.2.2', _temp_parent_id: 'S2.1', title: 'FTUE Dash Detailed Plan', item_type: 'task', client_id: lighthouse.id },
    ];
    const res = await request(app)
      .post('/api/tasks/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks });
    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      `SELECT id, title, parent_id FROM tasks WHERE client_id = $1`,
      [lighthouse.id]
    );
    const byTitle = Object.fromEntries(rows.map(r => [r.title, r]));
    expect(byTitle['FTUE Dash Initial Concept Exploration'].parent_id).toBe(byTitle['Alpha Ready Dashboards'].id);
    expect(byTitle['FTUE Dash Detailed Plan'].parent_id).toBe(byTitle['Alpha Ready Dashboards'].id);
  });

  it('allows feature/story/task children to inherit client from project parent when client_id omitted on children', async () => {
    const tasks = [
      { _temp_id: 'P1', title: 'Inherit project', item_type: 'project', client_id: lighthouse.id },
      { _temp_id: 'F1', _temp_parent_id: 'P1', title: 'Inherit feature', item_type: 'feature' },
      { _temp_id: 'T1', _temp_parent_id: 'F1', title: 'Inherit task', item_type: 'task' },
    ];
    const res = await request(app)
      .post('/api/tasks/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks });
    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      'SELECT title, client_id FROM tasks WHERE title LIKE $1', ['Inherit %']
    );
    expect(rows).toHaveLength(3);
    rows.forEach(r => expect(r.client_id).toBe(lighthouse.id));
  });
});
