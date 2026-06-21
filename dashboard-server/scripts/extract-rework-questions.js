require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const IDS = process.argv.slice(2);
if (!IDS.length) { console.error('Usage: node extract-rework-questions.js id1 id2 ...'); process.exit(1); }

(async () => {
  for (const prefix of IDS) {
    const r = await pool.query(
      "SELECT id, discipline, category, question_text FROM interview_question_bank WHERE id::text LIKE $1",
      [prefix + '%']
    );
    if (r.rows.length) {
      const q = r.rows[0];
      console.log(`\n--- ${q.id} | ${q.discipline} | ${q.category} ---`);
      console.log(q.question_text);
    } else {
      console.log(`\n--- ${prefix} | NOT FOUND ---`);
    }
  }
  await pool.end();
})();
