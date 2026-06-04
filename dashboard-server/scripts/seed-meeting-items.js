'use strict';
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const MEETINGS_JSON = path.resolve(__dirname, '../../intelligence/compiled/meetings.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // 1. Read existing status overrides before we drop the table
  let overrides = new Map();
  try {
    const { rows } = await pool.query('SELECT action_id, status FROM meeting_action_status');
    rows.forEach(r => overrides.set(r.action_id, r.status));
    console.log(`Read ${overrides.size} status overrides from meeting_action_status`);
  } catch {
    console.log('No meeting_action_status table found (already migrated or fresh install)');
  }

  // 2. Read meetings.json
  if (!fs.existsSync(MEETINGS_JSON)) {
    console.log('No meetings.json found — tables created empty.');
    await pool.end();
    return;
  }
  const data = JSON.parse(fs.readFileSync(MEETINGS_JSON, 'utf8'));
  const sections = data.sections || {};

  // 3. Insert all items
  let inserted = 0, skipped = 0;
  const SECTION_NAMES = ['actions', 'decisions', 'people', 'learnings', 'numbers', 'timeline', 'threads'];
  for (const section of SECTION_NAMES) {
    const items = sections[section] || [];
    for (const item of items) {
      let itemId = item.id;
      if (!itemId) {
        const prefix = section.slice(0, 3);
        const slug = (item.period || item.label || item.title || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 4).join('-');
        itemId = `${prefix}_${slug}`;
      }

      const itemData = { ...item };
      delete itemData.id;

      if (section === 'actions' && overrides.has(itemId)) {
        itemData.status = overrides.get(itemId);
      }

      try {
        await pool.query(
          `INSERT INTO meeting_items (item_id, section, data, source)
           VALUES ($1, $2, $3, 'compiled')
           ON CONFLICT (item_id) DO NOTHING`,
          [itemId, section, JSON.stringify(itemData)]
        );
        inserted++;
      } catch (err) {
        console.error(`Failed to insert ${itemId}:`, err.message);
      }
    }
  }
  console.log(`Inserted ${inserted} items, skipped ${skipped}`);

  // 4. Populate metadata
  await pool.query(
    `INSERT INTO meeting_metadata (id, meeting_count, date_range_start, date_range_end, compiled_at)
     VALUES (1, $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       meeting_count = $1, date_range_start = $2, date_range_end = $3, compiled_at = $4, updated_at = now()`,
    [
      data.meeting_count || 0,
      data.date_range ? data.date_range.start : null,
      data.date_range ? data.date_range.end : null,
      data.compiled_at || null
    ]
  );
  console.log('Metadata populated');

  // 5. Drop old meeting_action_status table
  try {
    await pool.query('DROP TABLE IF EXISTS meeting_action_status');
    console.log('Dropped meeting_action_status table');
  } catch (err) {
    console.log('Could not drop meeting_action_status:', err.message);
  }

  await pool.end();
  console.log('Done.');
}

run().catch(err => { console.error('Seed failed:', err); process.exit(1); });
