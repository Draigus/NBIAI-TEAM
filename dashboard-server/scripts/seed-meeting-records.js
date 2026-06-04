'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// ANTHROPIC_API_KEY needed for Phase 2 LLM backfill only (idempotent via progress file)
if (!process.env.ANTHROPIC_API_KEY) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../projects/news-aggregator/.env'), override: false });
}
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

// --- Config ---
const GRANOLA_DIR = path.resolve(__dirname, '../../intelligence/raw/granola');
const PERSON_REGISTRY = path.resolve(__dirname, '../../intelligence/compiled/person_registry.json');
const PROGRESS_FILE = path.resolve(__dirname, '../backfill_progress.json');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SKIP_BACKFILL = process.argv.includes('--skip-backfill');
const SKIP_PEOPLE = process.argv.includes('--skip-people');

// --- Helpers ---

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const raw = match[1];
  const frontmatter = {};

  for (const line of raw.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Parse YAML arrays [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    }
    // Strip quotes
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }

  const body = content.slice(match[0].length).trim();
  return { frontmatter, body };
}

function extractTitle(body) {
  const h1 = body.match(/^#\s+(.+)/m);
  return h1 ? h1[1].trim() : null;
}

function extractDateFromFilename(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function extractParticipantsFromContext(body) {
  // Look for ## Context section, then find "Participants:" or "Attendees:"
  const contextMatch = body.match(/## Context\s*\n([\s\S]*?)(?=\n## |\n$|$)/);
  if (!contextMatch) return [];

  const contextText = contextMatch[1];
  const partMatch = contextText.match(/(?:Participants|Attendees):\s*(.+)/i);
  if (!partMatch) return [];

  // Parse "Glen, Lorenza, Aris, Dino, Vardis" or "Glen Pryer, Aris Konstantinidis"
  return partMatch[1]
    .split(/[,.]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.includes('covering') && !s.includes('session'));
}

function extractSummary(body) {
  // Get first content section (## Key Content or first ## section after title)
  const sections = body.split(/\n## /);
  if (sections.length > 1) {
    const firstSection = sections[1];
    const lines = firstSection.split('\n').slice(1, 8).join(' ').trim();
    return lines.slice(0, 500);
  }
  return body.slice(0, 300);
}

function extractDecisions(body) {
  const decMatch = body.match(/## Decisions\s*[/—–-]?\s*Insights?\s*\n([\s\S]*?)(?=\n## |\n$|$)/i)
    || body.match(/## Decisions\s*\n([\s\S]*?)(?=\n## |\n$|$)/i);
  if (!decMatch) return '';
  return decMatch[1].trim().slice(0, 1000);
}

function extractContextText(body) {
  const contextMatch = body.match(/## Context\s*\n([\s\S]*?)(?=\n## |\n$|$)/);
  return contextMatch ? contextMatch[1].trim() : '';
}

function buildMeetingItemId(date, title) {
  const dateCompact = date.replace(/-/g, '');
  const slug = slugify(title);
  return `mtg_${dateCompact}_${slug}`;
}

// --- Phase 1: Import Meeting Records ---

async function phase1Import() {
  console.log('\n=== Phase 1: Import Meeting Records ===\n');

  const files = fs.readdirSync(GRANOLA_DIR).filter(f => f.endsWith('.md')).sort();
  console.log(`Found ${files.length} Granola files`);

  let imported = 0, skipped = 0, errors = 0;

  for (const filename of files) {
    const filepath = path.join(GRANOLA_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);

    const isPatternA = !!frontmatter.meeting_id;
    const isPatternB = !!frontmatter.source_id;

    // Extract date
    let meetingDate;
    if (isPatternA && frontmatter.date) {
      meetingDate = frontmatter.date;
    } else {
      meetingDate = extractDateFromFilename(filename);
    }
    if (!meetingDate) {
      console.error(`  SKIP ${filename}: no date found`);
      skipped++;
      continue;
    }

    // Extract title
    let title;
    if (isPatternA && frontmatter.title) {
      title = typeof frontmatter.title === 'string' ? frontmatter.title : frontmatter.title[0];
    } else {
      title = extractTitle(body);
    }
    if (!title) {
      title = filename.replace(/^\d{4}-\d{2}-\d{2}_/, '').replace(/\.md$/, '').replace(/-/g, ' ');
    }

    // Extract attendees
    let attendees = [];
    if (isPatternA && frontmatter.participants) {
      attendees = Array.isArray(frontmatter.participants)
        ? frontmatter.participants
        : [frontmatter.participants];
      // Clean up "(implied)" etc
      attendees = attendees.map(a => a.replace(/\s*\(.*?\)\s*/g, '').trim());
    } else {
      attendees = extractParticipantsFromContext(body);
    }

    // Extract topics
    let topics = [];
    if (isPatternB && frontmatter.topics_detected) {
      topics = Array.isArray(frontmatter.topics_detected)
        ? frontmatter.topics_detected
        : [frontmatter.topics_detected];
    } else if (isPatternA && frontmatter.domain) {
      topics = Array.isArray(frontmatter.domain)
        ? frontmatter.domain
        : [frontmatter.domain];
    }

    // Build source_id
    let sourceId;
    if (isPatternB && frontmatter.source_id) {
      sourceId = frontmatter.source_id;
    } else if (isPatternA && frontmatter.meeting_id) {
      sourceId = `granola_${frontmatter.meeting_id.split('-')[0]}`;
    }

    // Build source_path
    let sourcePath;
    if (isPatternB && frontmatter.source_path) {
      sourcePath = frontmatter.source_path;
    } else if (isPatternA && frontmatter.meeting_id) {
      sourcePath = `granola://meetings/${frontmatter.meeting_id}`;
    }

    // Build workstream/client
    let workstream = null;
    if (frontmatter.client) {
      workstream = frontmatter.client;
    } else if (frontmatter.sensitivity_class === 'client_scoped') {
      // Try to detect from bank_candidates
      const banks = frontmatter.bank_candidates;
      if (Array.isArray(banks)) {
        const clientBank = banks.find(b => b.startsWith('client_'));
        if (clientBank) workstream = clientBank.replace('client_', '');
      }
    }

    // Build the JSONB data
    const data = {
      date: meetingDate,
      title: title,
      attendees: attendees,
      topics: topics,
      summary: extractSummary(body),
      decisions_text: extractDecisions(body),
      context: extractContextText(body),
      source_id: sourceId || null,
      source_path: sourcePath || null,
      workstream: workstream,
      ingested: frontmatter.ingested || null,
      extract_type: frontmatter.extract_type || null
    };

    const itemId = buildMeetingItemId(meetingDate, title);

    try {
      const result = await pool.query(
        `INSERT INTO meeting_items (item_id, section, data, source)
         VALUES ($1, 'meetings', $2, 'compiled')
         ON CONFLICT (item_id) DO NOTHING`,
        [itemId, JSON.stringify(data)]
      );
      if (result.rowCount > 0) {
        imported++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`  ERROR ${filename}: ${err.message}`);
      errors++;
    }
  }

  console.log(`Imported: ${imported}, Skipped (duplicate): ${skipped}, Errors: ${errors}`);

  // Update meeting_metadata
  const { rows } = await pool.query(
    `SELECT COUNT(*) as cnt FROM meeting_items WHERE section = 'meetings'`
  );
  const meetingCount = parseInt(rows[0].cnt, 10);

  const dateRange = await pool.query(
    `SELECT MIN(data->>'date') as earliest, MAX(data->>'date') as latest
     FROM meeting_items WHERE section = 'meetings'`
  );

  await pool.query(
    `UPDATE meeting_metadata SET
       meeting_count = $1,
       date_range_start = $2,
       date_range_end = $3,
       updated_at = now()
     WHERE id = 1`,
    [meetingCount, dateRange.rows[0].earliest, dateRange.rows[0].latest]
  );
  console.log(`Meeting metadata updated: ${meetingCount} meetings, ${dateRange.rows[0].earliest} to ${dateRange.rows[0].latest}`);

  return imported;
}

// --- Phase 2: LLM Backfill ---

async function phase2Backfill() {
  console.log('\n=== Phase 2: LLM Backfill — Link Items to Meetings ===\n');

  const anthropic = new Anthropic.default();

  // Load progress
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    console.log(`Loaded progress: ${Object.keys(progress).length} items already linked`);
  }

  // Get all non-meeting items that have a date in their JSONB
  const { rows: items } = await pool.query(`
    SELECT item_id, section, data
    FROM meeting_items
    WHERE section != 'meetings'
      AND data->>'date' IS NOT NULL
    ORDER BY data->>'date'
  `);
  console.log(`Found ${items.length} dated items to potentially link`);

  // Get all meetings indexed by date
  const { rows: meetings } = await pool.query(`
    SELECT item_id, data
    FROM meeting_items
    WHERE section = 'meetings'
    ORDER BY data->>'date'
  `);

  const meetingsByDate = {};
  for (const m of meetings) {
    const date = m.data.date;
    if (!meetingsByDate[date]) meetingsByDate[date] = [];
    meetingsByDate[date].push(m);
  }

  // Find earliest meeting date
  const allDates = Object.keys(meetingsByDate).sort();
  const earliestMeeting = allDates[0];
  console.log(`Earliest meeting: ${earliestMeeting}, Latest: ${allDates[allDates.length - 1]}`);

  // Categorise items
  const singleMatch = [];
  const needsLlm = [];
  const preMeeting = [];

  for (const item of items) {
    if (progress[item.item_id]) continue; // already linked

    const itemDate = item.data.date;
    if (itemDate < earliestMeeting) {
      preMeeting.push(item);
      continue;
    }

    const candidates = meetingsByDate[itemDate];
    if (!candidates || candidates.length === 0) {
      preMeeting.push(item); // no meeting on this date
      continue;
    }

    if (candidates.length === 1) {
      singleMatch.push({ item, meetingId: candidates[0].item_id });
    } else {
      needsLlm.push(item);
    }
  }

  console.log(`Single-match: ${singleMatch.length}, Needs LLM: ${needsLlm.length}, Pre-meeting/no-match: ${preMeeting.length}`);

  // Phase 2a: Auto-link single matches
  let linked = 0;
  for (const { item, meetingId } of singleMatch) {
    await pool.query(
      `UPDATE meeting_items
       SET data = jsonb_set(data, '{source_meeting_id}', $1::jsonb),
           updated_at = now()
       WHERE item_id = $2`,
      [JSON.stringify(meetingId), item.item_id]
    );
    progress[item.item_id] = meetingId;
    linked++;
  }
  console.log(`Auto-linked ${linked} single-match items`);

  // Phase 2b: LLM disambiguation
  if (needsLlm.length > 0) {
    // Group by date
    const byDate = {};
    for (const item of needsLlm) {
      const d = item.data.date;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(item);
    }

    const dates = Object.keys(byDate).sort();
    console.log(`\nLLM disambiguation needed for ${dates.length} dates (${needsLlm.length} items):`);

    for (const date of dates) {
      const dateItems = byDate[date];
      const candidates = meetingsByDate[date];

      // Build candidate list for prompt
      const candidateDescriptions = candidates.map(c => ({
        id: c.item_id,
        title: c.data.title,
        attendees: (c.data.attendees || []).join(', '),
        topics: (c.data.topics || []).join(', '),
        summary: (c.data.summary || '').slice(0, 200)
      }));

      // Build items list for prompt
      const itemDescriptions = dateItems.map(it => ({
        item_id: it.item_id,
        section: it.section,
        content: JSON.stringify(it.data).slice(0, 300)
      }));

      const prompt = `Given these meetings on ${date}:
${JSON.stringify(candidateDescriptions, null, 2)}

Match each of the following items to the most likely meeting they came from. Return ONLY a JSON object mapping item_id to meeting_id. If uncertain, use your best judgement based on topic overlap.

Items:
${JSON.stringify(itemDescriptions, null, 2)}

Respond with ONLY valid JSON, no explanation. Format: {"item_id": "meeting_id", ...}`;

      let result = null;
      let retries = 0;
      while (retries < 3 && !result) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }]
          });

          const text = response.content[0].text.trim();
          // Extract JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          }
        } catch (err) {
          retries++;
          console.error(`  Retry ${retries}/3 for ${date}: ${err.message}`);
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
        }
      }

      if (!result) {
        console.error(`  FAILED to disambiguate items on ${date} after 3 retries`);
        continue;
      }

      // Validate and apply
      const validMeetingIds = new Set(candidates.map(c => c.item_id));
      let dateLinked = 0;

      for (const item of dateItems) {
        const assignedMeeting = result[item.item_id];
        if (!assignedMeeting || !validMeetingIds.has(assignedMeeting)) {
          console.warn(`  Invalid/missing assignment for ${item.item_id} on ${date}`);
          continue;
        }

        await pool.query(
          `UPDATE meeting_items
           SET data = jsonb_set(data, '{source_meeting_id}', $1::jsonb),
               updated_at = now()
           WHERE item_id = $2`,
          [JSON.stringify(assignedMeeting), item.item_id]
        );
        progress[item.item_id] = assignedMeeting;
        dateLinked++;
      }

      console.log(`  ${date}: linked ${dateLinked}/${dateItems.length} items`);
    }
  }

  // Save progress
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  console.log(`\nTotal linked: ${Object.keys(progress).length} items`);
  console.log(`Pre-meeting/unmatched (skipped): ${preMeeting.length}`);

  return Object.keys(progress).length;
}

// --- Phase 3: People Linkage ---

async function phase3People() {
  console.log('\n=== Phase 3: People Linkage ===\n');

  // Load person registry
  const registry = JSON.parse(fs.readFileSync(PERSON_REGISTRY, 'utf8'));

  // Build alias -> person_key lookup (lowercase)
  const aliasMap = {};
  for (const [key, person] of Object.entries(registry)) {
    const names = [person.display, ...(person.aliases || [])];
    for (const name of names) {
      aliasMap[name.toLowerCase()] = key;
    }
  }

  // Get all people items
  const { rows: people } = await pool.query(`
    SELECT item_id, data
    FROM meeting_items
    WHERE section = 'people'
  `);
  console.log(`Found ${people.length} people items`);

  // Get all meetings
  const { rows: meetings } = await pool.query(`
    SELECT item_id, data
    FROM meeting_items
    WHERE section = 'meetings'
  `);

  let updated = 0;

  for (const person of people) {
    // Try to identify this person from their data
    const personLabel = person.data.label || person.data.name || person.data.title || '';
    const personKey = aliasMap[personLabel.toLowerCase()];

    if (!personKey) {
      // Try partial match on first word
      const firstName = personLabel.split(/\s+/)[0];
      if (!firstName || !aliasMap[firstName.toLowerCase()]) continue;
    }

    const matchKey = personKey || aliasMap[personLabel.split(/\s+/)[0].toLowerCase()];
    if (!matchKey) continue;

    const personData = registry[matchKey];
    const personNames = [personData.display, ...(personData.aliases || [])].map(n => n.toLowerCase());

    // Find all meetings where this person is an attendee
    const meetingIds = [];
    for (const meeting of meetings) {
      const attendees = (meeting.data.attendees || []).map(a => a.toLowerCase());
      const isAttendee = attendees.some(att =>
        personNames.some(pn => att.includes(pn) || pn.includes(att))
      );
      if (isAttendee) {
        meetingIds.push(meeting.item_id);
      }
    }

    if (meetingIds.length > 0) {
      await pool.query(
        `UPDATE meeting_items
         SET data = jsonb_set(data, '{meeting_ids}', $1::jsonb),
             updated_at = now()
         WHERE item_id = $2`,
        [JSON.stringify(meetingIds), person.item_id]
      );
      updated++;
    }
  }

  console.log(`Updated ${updated}/${people.length} people with meeting links`);
  return updated;
}

// --- Main ---

async function main() {
  console.log('=== Seed Meeting Records ===');
  console.log(`Flags: skip-backfill=${SKIP_BACKFILL}, skip-people=${SKIP_PEOPLE}\n`);

  try {
    const importCount = await phase1Import();

    if (!SKIP_BACKFILL) {
      await phase2Backfill();
    } else {
      console.log('\n[Skipping Phase 2: Backfill]');
    }

    if (!SKIP_PEOPLE) {
      await phase3People();
    } else {
      console.log('\n[Skipping Phase 3: People Linkage]');
    }

    console.log('\n=== Done ===');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
