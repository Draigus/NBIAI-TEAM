require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REWRITES = [
  {
    // 33279b0d - R2 score 6, "Jira architecture and permissions design rather than shipped-game production"
    // Fix: replace Jira structure question entirely with a cert pipeline scheduling problem
    prefix: '33279b0d',
    text: `You are production lead at a 65-person studio shipping a multiplayer title on PS5, Xbox, and PC in 16 weeks. Your cert submission requires three parallel workstreams to converge in week 14 (2 weeks before ship for platform review): (1) Sony TRC compliance covering 120 requirements -- 18 currently untested, 6 known failures (Activities API not updating on mode change, network error dialogs using custom text instead of system dialogs, suspend/resume save corruption, trophy unlock firing 1 kill late, body text at 11px failing minimum size requirement, and HDR tone-mapping producing washed-out colours on SDR displays). (2) Microsoft XR compliance covering 85 requirements -- 12 untested, 3 known failures (Quick Resume dropping the online session with no reconnection, text-to-speech not implemented for the new Season UI, and SmartDelivery delivering the Xbox One asset package to Series X on 5% of installs). (3) An outsource art vendor delivering 40 environment props that must pass tech art validation before inclusion in the cert build. The vendor has delivered 25 of 40; 8 of the 25 failed tech art review (incorrect LOD transition distances causing visible pop-in at 12m, collision meshes extending 2x beyond visual mesh causing invisible walls, and 3 props exceeding the 5K triangle budget by 40%). QA team: 8 people. Platform test hardware: 2 PS5 dev kits, 2 Xbox dev kits (shared with gameplay QA). Each TRC/XR requirement averages 45 minutes to test on target hardware. The 30 untested requirements need 22.5 hours of test time. The 6 Sony fixes need 8 engineer-days; the 3 Xbox fixes need 4 engineer-days. Engineering allocation: 2 engineers starting week 2. The vendor's remaining 15 props are due in week 4. At their current 32% first-pass failure rate, expect 5 failures requiring rework at 2 artist-days each from your 1 internal tech artist. Design the week-by-week pipeline: which engineering fixes ship first (considering which failures are hard cert blocks vs advisories), when does QA test each platform, how do you schedule the outsource rework without blocking the tech artist from their other cert responsibilities (LOD and VRAM validation on all builds), and at what week do you make the call to cut the vendor's remaining props from the cert build and ship with internal assets only?`
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
