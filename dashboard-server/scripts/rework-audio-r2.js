require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REWRITES = [
  {
    // ea04207e - R1 score 6, "speculative tool trivia rather than shipped-game judgement"
    // Fix: ground it in a specific production decision, not middleware architecture comparison
    prefix: 'ea04207e',
    text: `You are 6 months into developing a 5v5 multiplayer hero shooter on Unreal Engine. Your team of 3 sound designers has been using the engine's native audio system (MetaSounds) because no one had middleware experience when the project started. You now have 12 characters with 540 sound events, and three problems have emerged that MetaSounds cannot solve without custom C++ engineering: (1) you need per-character soundbank loading because loading all audio into memory at once uses 310MB on console (budget: 256MB), but MetaSounds has no concept of bank management -- everything loads with the level; (2) you need real-time profiling to diagnose why your mix collapses during team fights, but MetaSounds has no equivalent to Wwise's or FMOD's profiler -- you can only see CPU usage, not per-voice counts, bus levels, or priority steal events; (3) your adaptive music system was hand-coded in Blueprints by an audio programmer who left the studio, and no one on the team can maintain it -- a middleware music system would let your sound designers own it without code. Adopting Wwise or FMOD now means: migrating 540 events (estimated 4-6 weeks for one designer), re-implementing all Blueprint audio triggers (estimated 2 weeks of programmer time), licence cost (Wwise: free under 200 sounds in a bank or $3K/year for unlimited; FMOD: free under $200K revenue or $6K/year for unlimited), and the risk that the migration introduces audio regressions 6 months before ship. Your producer asks: is the migration worth it, or should you spend the same 6-8 weeks building custom bank management and a basic profiler in C++? Walk through your decision: what specific evidence you use to make the case (not "middleware is better" but "here is what breaks if we stay on MetaSounds and here is the cost in bugs, person-weeks, and ship risk"), what your migration plan is if you choose middleware (which 540 events do you migrate first, how do you run both systems in parallel during transition), and what happens if you choose to stay -- specifically, can a 3-person audio team maintain custom C++ audio infrastructure while also shipping 4 new characters before launch?`
  },
  {
    // 5cd7efb9 - R1 score 6, "rehearsable style-guide answers"
    // Fix: ground it in a specific delivery failure and force concrete acceptance testing
    prefix: '5cd7efb9',
    text: `You are building the audio style guide for a dark fantasy co-op game. Your outsource partner has just delivered their first batch of 3 creature audio sets (wolf pack, giant spider, armoured skeleton) and all 3 have the same problem: the vocalizations sound like processed synthesiser patches run through granular effects. The wolf growl sounds like filtered white noise with pitch modulation. The spider hiss sounds like the wolf growl with a shorter envelope. The skeleton rattle sounds like the wolf growl with a resonant filter. They are technically functional but sonically indistinguishable from each other -- in a blind test with your team, no one could identify which creature was which from audio alone. This is a gameplay problem: your game has a mechanic where players must identify approaching creatures by sound in dark environments before visual contact. If all creatures sound the same, this mechanic does not work. The outsource partner's creative lead says "this is how we do creature audio" and points to their 3 shipped sci-fi shooters as reference. You need to redirect them without burning the relationship. Walk through: what 3 specific reference recordings or sound sources you provide per creature to define what each should sound like (e.g., wolf: real wolf vocalizations layered with large dog growls and bear breathing, processed with pitch-down and subtle reverb; spider: insect wing recordings, wet foley, and pressurised air, no vocal element; skeleton: bone percussion recordings, ceramic impacts, and cloth movement with no tonal content), what your rejection criteria are for the redelivery (what specific measurements or listening tests each creature must pass -- e.g., "3 out of 5 listeners must correctly identify the creature from a 2-second audio clip at 50% volume during gameplay audio"), what process you change in the style guide so the next batch does not have the same problem (what "this is correct / this is wrong" examples you add, and how many per creature type), and how you handle the schedule impact -- the redelivery adds 2 weeks to a 14-week timeline with 9 more creature types still to come.`
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
