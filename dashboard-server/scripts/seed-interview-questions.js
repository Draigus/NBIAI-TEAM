// Seed script: generate interview question banks for all Couch Heroes disciplines.
// Run: ANTHROPIC_API_KEY=... node scripts/seed-interview-questions.js
//
// Requires the server's .env for DATABASE_URL and an ANTHROPIC_API_KEY.

require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
const { buildGenerationPrompt, DEPTH_FOCUS } = require('../lib/interview-questions-prompt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DISCIPLINES = Object.keys(DEPTH_FOCUS);

async function main() {
  const client = new Anthropic.default();

  // Find Couch Heroes client
  const { rows: clientRows } = await pool.query("SELECT id FROM clients WHERE name ILIKE '%couch heroes%' LIMIT 1");
  if (!clientRows.length) {
    console.error('Couch Heroes client not found in database. Create it first.');
    process.exit(1);
  }
  const clientId = clientRows[0].id;

  // Find an admin user for created_by
  const { rows: adminRows } = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  const createdBy = adminRows.length ? adminRows[0].id : null;

  for (const discipline of DISCIPLINES) {
    console.log(`\nGenerating questions for ${discipline}...`);

    // Check if questions already exist
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM interview_question_bank WHERE client_id = $1 AND discipline = $2',
      [clientId, discipline]
    );
    if (parseInt(existing[0].cnt, 10) > 0) {
      console.log(`  Skipping — ${existing[0].cnt} questions already exist for ${discipline}`);
      continue;
    }

    const prompt = buildGenerationPrompt({
      jdText: `${discipline} role at Couch Heroes, a fully remote game studio (~55 people, UK + Greece) building multiplayer games.`,
      clientName: 'Couch Heroes',
      discipline,
      seniority: 'mid-to-senior',
    });

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      });

      const text = message.content[0]?.text || '[]';
      let questions;
      try {
        questions = JSON.parse(text);
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        questions = match ? JSON.parse(match[0]) : [];
      }

      let inserted = 0;
      for (const q of questions) {
        if (!q.question_text || !q.category) continue;
        const cat = q.category.toLowerCase();
        const validCats = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
        if (!validCats.includes(cat)) continue;
        await pool.query(
          `INSERT INTO interview_question_bank (client_id, discipline, category, question_text, depth_type, source, created_by)
           VALUES ($1, $2, $3, $4, $5, 'ai_generated', $6)`,
          [clientId, discipline, cat, q.question_text.trim(), q.depth_type || null, createdBy]
        );
        inserted++;
      }
      console.log(`  Inserted ${inserted} questions for ${discipline}`);
    } catch (e) {
      console.error(`  Failed for ${discipline}: ${e.message}`);
    }
  }

  console.log('\nDone.');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
