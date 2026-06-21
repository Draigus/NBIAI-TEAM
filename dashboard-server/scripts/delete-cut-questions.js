require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CUT_IDS = [
  // Art (4) - prefix lookup needed
  '2c5c510b', 'a71dff09', '761cd428', '963b25ac',
  // Audio (3)
  'e66f5e8f', '5b01089b', 'a61a6cef',
  // Engineering (1)
  '8babfaf9',
];

(async () => {
  let deleted = 0;
  for (const prefix of CUT_IDS) {
    const r = await pool.query(
      "DELETE FROM interview_question_bank WHERE id::text LIKE $1 RETURNING id, discipline, substring(question_text, 1, 60) as preview",
      [prefix + '%']
    );
    if (r.rows.length) {
      console.log('DELETED:', r.rows[0].id, '|', r.rows[0].discipline, '|', r.rows[0].preview);
      deleted++;
    } else {
      console.log('NOT FOUND:', prefix);
    }
  }
  console.log('\nTotal deleted:', deleted);
  const count = await pool.query('SELECT count(*) as cnt FROM interview_question_bank');
  console.log('Remaining questions:', count.rows[0].cnt);
  await pool.end();
})();
