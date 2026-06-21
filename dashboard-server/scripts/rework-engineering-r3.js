require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Round 3: 1 remaining REWORK question.
// c288d35b scored 6 twice -- Codex says "IT/build operations triage" and "diagnosis embedded in prompt."
// Fix: replace the IT triage entirely with a UE5 gameplay debugging scenario where the candidate
// must diagnose the problem from symptoms, not be told the root cause.

const REWRITES = [
  {
    prefix: 'c288d35b',
    text: `You are leading gameplay on an Unreal Engine 5 multiplayer arena game, server-authoritative at 60Hz with client-side prediction. QA files a bug with a video attachment: "Player ability damage numbers are wrong in online matches but correct in local testing." The video shows a player casting a fireball ability (base damage 200, modified by a 1.5x buff from a teammate's aura). In the local test, the fireball deals 300 damage. In the online match, the same fireball with the same buff active deals 200 damage -- the buff multiplier is not applied. QA's reproduction steps: host a 2-player match, have Player A activate the damage-boost aura, have Player B cast a fireball at an enemy while inside the aura. Damage dealt: 200 (unbuffed). Expected: 300. The bug reproduces 100% of the time in online matches and never reproduces in PIE with "Play As Client" mode (which simulates networking but uses local function calls instead of real RPCs). Your codebase has three systems involved: (1) the damage-boost aura, which applies a gameplay effect via GAS that sets the Tag.DamageMultiplier gameplay tag on nearby allies, (2) the fireball ability, which reads Tag.DamageMultiplier during its damage calculation phase on the server, and (3) the GAS replication setup, which determines when gameplay effects are replicated to the server versus applied locally. You have 30 minutes before the milestone build. Walk through your diagnosis: what is the most likely root cause given that the bug appears in real networking but not in PIE-simulated networking (name the specific GAS replication or prediction mechanism that behaves differently), what is the one-line code fix, and how do you write an automated test that catches this category of buff-not-applying-in-multiplayer bug for all 30 abilities in your system?`
  },
];

(async () => {
  let applied = 0;
  for (const r of REWRITES) {
    const result = await pool.query(
      "UPDATE interview_question_bank SET question_text = $1, updated_at = NOW() WHERE id::text LIKE $2 RETURNING id",
      [r.text, r.prefix + '%']
    );
    if (result.rows.length) {
      console.log('APPLIED:', result.rows[0].id);
      applied++;
    } else {
      console.log('NOT FOUND:', r.prefix);
    }
  }
  console.log('\nTotal applied:', applied, 'of', REWRITES.length);
  await pool.end();
})();
