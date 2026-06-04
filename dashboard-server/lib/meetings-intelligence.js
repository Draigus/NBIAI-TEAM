'use strict';

const crypto = require('crypto');

const VALID_SECTIONS = ['actions', 'decisions', 'people', 'learnings', 'numbers', 'timeline', 'threads', 'meetings'];

const REQUIRED_FIELDS = {
  actions: ['description', 'status'],
  decisions: ['decision'],
  people: ['name'],
  learnings: ['insight'],
  numbers: ['figure'],
  timeline: ['period', 'label'],
  threads: ['title', 'status'],
  meetings: ['title', 'date']
};

const SECTION_SORT = {
  actions: "data->>'date' DESC NULLS LAST",
  decisions: "data->>'date' DESC NULLS LAST",
  learnings: "data->>'date' DESC NULLS LAST",
  numbers: "data->>'date' DESC NULLS LAST",
  people: "data->>'name' ASC",
  timeline: "created_at ASC",
  threads: "created_at DESC",
  meetings: "data->>'date' DESC NULLS LAST"
};

const SECTION_PREFIX = { actions: 'act', decisions: 'dec', people: 'per', learnings: 'lrn', numbers: 'num', timeline: 'tl', threads: 'thr', meetings: 'mtg' };

function generateItemId(section, data) {
  const prefix = SECTION_PREFIX[section] || section.slice(0, 3);
  const dateStr = section === 'meetings' && data.date
    ? data.date.replace(/-/g, '')
    : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const text = data.description || data.decision || data.name || data.insight || data.figure || data.title || data.label || 'item';
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 4).join('-');
  if (section === 'meetings') return `${prefix}_${dateStr}_${slug}`;
  const rand = crypto.randomBytes(2).toString('hex');
  return `${prefix}_${dateStr}_${slug}_${rand}`;
}

function validateRequired(section, data) {
  const required = REQUIRED_FIELDS[section];
  if (!required) return null;
  const missing = required.filter(f => !data[f] && data[f] !== 0);
  if (missing.length) return `Missing required fields: ${missing.join(', ')}`;
  return null;
}

async function getAll(pool) {
  const { rows: metaRows } = await pool.query('SELECT * FROM meeting_metadata WHERE id = 1');
  const meta = metaRows[0] || { meeting_count: 0, date_range_start: null, date_range_end: null, compiled_at: null };

  const sections = {};
  for (const section of VALID_SECTIONS) {
    const order = SECTION_SORT[section] || 'created_at DESC';
    const { rows } = await pool.query(
      `SELECT item_id, section, data, source, created_at, updated_at FROM meeting_items WHERE section = $1 ORDER BY ${order}`,
      [section]
    );
    sections[section] = rows.map(r => ({ id: r.item_id, source: r.source, ...r.data }));
  }

  return {
    meeting_count: meta.meeting_count,
    date_range: meta.date_range_start ? { start: meta.date_range_start, end: meta.date_range_end } : null,
    compiled_at: meta.compiled_at,
    sections
  };
}

async function getStats(pool) {
  const { rows: metaRows } = await pool.query('SELECT * FROM meeting_metadata WHERE id = 1');
  const meta = metaRows[0] || {};

  const { rows } = await pool.query(`
    SELECT
      count(*) FILTER (WHERE section = 'actions') AS action_count,
      count(*) FILTER (WHERE section = 'actions' AND data->>'status' = 'open') AS open_actions,
      count(*) FILTER (WHERE section = 'actions' AND data->>'status' = 'done') AS done_actions,
      count(*) FILTER (WHERE section = 'actions' AND data->>'status' = 'overdue') AS overdue_actions,
      count(*) FILTER (WHERE section = 'decisions') AS decision_count,
      count(*) FILTER (WHERE section = 'people') AS people_count,
      count(*) FILTER (WHERE section = 'learnings') AS learning_count,
      count(*) FILTER (WHERE section = 'numbers') AS number_count,
      count(*) FILTER (WHERE section = 'threads') AS thread_count,
      count(*) FILTER (WHERE section = 'meetings') AS meeting_record_count
    FROM meeting_items
  `);
  const counts = rows[0] || {};

  return {
    meeting_count: meta.meeting_count || 0,
    date_range: meta.date_range_start ? { start: meta.date_range_start, end: meta.date_range_end } : null,
    compiled_at: meta.compiled_at || null,
    action_count: parseInt(counts.action_count) || 0,
    open_actions: parseInt(counts.open_actions) || 0,
    done_actions: parseInt(counts.done_actions) || 0,
    overdue_actions: parseInt(counts.overdue_actions) || 0,
    decision_count: parseInt(counts.decision_count) || 0,
    people_count: parseInt(counts.people_count) || 0,
    learning_count: parseInt(counts.learning_count) || 0,
    number_count: parseInt(counts.number_count) || 0,
    thread_count: parseInt(counts.thread_count) || 0,
    meeting_record_count: parseInt(counts.meeting_record_count) || 0
  };
}

async function createItem(pool, section, data, itemId) {
  if (!VALID_SECTIONS.includes(section)) throw new Error('Invalid section: ' + section);
  const err = validateRequired(section, data);
  if (err) throw new Error(err);
  const id = itemId || generateItemId(section, data);
  const { rows } = await pool.query(
    `INSERT INTO meeting_items (item_id, section, data, source)
     VALUES ($1, $2, $3, 'manual')
     RETURNING item_id, section, data, source, created_at, updated_at`,
    [id, section, JSON.stringify(data)]
  );
  const r = rows[0];
  return { id: r.item_id, section: r.section, source: r.source, ...r.data };
}

async function updateItem(pool, itemId, dataUpdates) {
  const { rows } = await pool.query(
    `UPDATE meeting_items SET data = data || $2::jsonb, updated_at = now()
     WHERE item_id = $1
     RETURNING item_id, section, data, source, created_at, updated_at`,
    [itemId, JSON.stringify(dataUpdates)]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return { id: r.item_id, section: r.section, source: r.source, ...r.data };
}

async function deleteItem(pool, itemId) {
  const { rowCount } = await pool.query('DELETE FROM meeting_items WHERE item_id = $1', [itemId]);
  return rowCount > 0;
}

module.exports = { getAll, getStats, createItem, updateItem, deleteItem, generateItemId, validateRequired, VALID_SECTIONS, REQUIRED_FIELDS };
