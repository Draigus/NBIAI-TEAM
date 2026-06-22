require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REWRITES = [
  {
    prefix: 'ce7b10a1',
    text: `You are a mid-level designer on a live 5v5 hero shooter with 20 heroes across 4 roles (tank, damage, support, flex). Your daily challenge system awards 3 challenges per day, each worth 50 Tokens (a match pays 100 Tokens baseline). After 6 months, hero-specific challenges distort ranked play: in 15% of ranked matches at least one player picks an off-hero for a challenge, and off-hero picks have a 42% win rate versus 51% for mains. You need to redesign the challenge system from the mechanic level -- not choose between options but design the replacement rules. Specify: (1) the exact challenge eligibility rule that prevents ranked distortion -- what heroes or actions qualify, what mode restrictions apply, and how the system determines whether a challenge is 'safe' for ranked (e.g. role-based rather than hero-based, or ranked-excluded entirely); (2) the reward structure for the replacement challenges -- how many per day, what they pay, whether incomplete challenges roll over or expire, and what the weekly earning cap is compared to the current 1,050 Tokens per week; (3) the specific failure mode you are designing against -- the player behaviour that would exploit your new system in a way the old system did not allow (e.g. if you use role-based challenges, a player who queues as support but plays damage to complete a damage challenge); (4) one challenge type you considered and rejected because it would create a worse distortion than the current hero-specific system, and what that distortion would be.`
  },
];

(async () => {
  for (const r of REWRITES) {
    const result = await pool.query(
      "UPDATE interview_question_bank SET question_text = $1, updated_at = NOW() WHERE id::text LIKE $2 RETURNING id",
      [r.text, r.prefix + '%']
    );
    console.log(result.rows.length ? 'APPLIED: ' + result.rows[0].id : 'NOT FOUND: ' + r.prefix);
  }
  console.log('Done.');
  await pool.end();
})();
