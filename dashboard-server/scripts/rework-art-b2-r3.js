require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REWRITES = [
  // cf747c11 (R1: 6, R2: 6) -- "correct choice too obvious; make trade-off harder"
  // Fix: replace with a scenario where the candidate must evaluate a specific
  // adapted asset that LOOKS safe but carries hidden contamination risk,
  // and all 3 options have real costs
  {
    prefix: 'cf747c11',
    text: `Your studio acquired 1,200 concept art pieces from a cancelled dark-fantasy ARPG. Your new project is a bright, stylised co-op adventure for Switch and PC. You triaged the archive and adapted 35 environment reference pieces by repainting them in your new game's colour palette. Three weeks later, the art director reviews the first blockout map and flags a problem: the wall proportions, window placement patterns, and doorway heights across the map match the ARPG's Gothic architecture rather than your game's storybook fantasy style. Your environment artists used the adapted references for layout planning -- the colour was correct but the underlying spatial language (2:1 height-to-width window ratios, narrow pointed arches, asymmetric wall segments) carried over because those proportions were not part of the colour adaptation pass. The map is 3 weeks into a 6-week build. Three options: (A) rework the map's architectural proportions now -- costs 2 weeks of rework on existing blockout, but the spatial language is fixed before any detail art begins; (B) continue building on the current proportions and adjust only the most visible hero structures (entrance, central plaza, boss arena) -- saves 1.5 weeks but 60% of the map retains Gothic proportions, creating an inconsistent style across the level; (C) accept the Gothic proportions as an intentional style departure for this map and retroactively update the visual bible to accommodate both storybook and Gothic-influenced layouts -- no rework cost but sets a precedent that adapted references can override the bible, which will compound across future maps. Choose one. Rule out one and state the specific production or creative consequence that makes it unacceptable for a stylised co-op game shipping on Switch. For prevention: state the specific property of an adapted reference that your adaptation process must verify beyond colour -- proportions, silhouette ratios, spatial rhythm, or material finish -- and how you test for it before the reference enters the library.`
  },

  // e18ff82a (R1: 5, R2: 6) -- "over-explains transferable work; needs candidate to identify it"
  // Fix: present the 3 settings and let the candidate determine what transfers,
  // with a risky allocation decision that has real waste consequences
  {
    prefix: 'e18ff82a',
    text: `You are leading a 4-person concept team on a new IP -- a multiplayer extraction shooter. Three months into a 6-month pre-production. The setting is not locked: it could be post-apocalyptic wasteland, retro-futurist metropolis, or near-future military black site. The game director chooses at month 4 based on market analysis. Vertical slice gate at month 6 requires 3 hero character concepts, 2 environment key arts, a weapon family sheet, and a colour script. At 4 artists for 3 months (60 artist-weeks), you must allocate work knowing that 2 of 3 settings will be killed and any setting-specific work for those 2 is wasted. Your creative lead proposes a bold allocation: spend 30 artist-weeks (50%) on setting-specific exploration across all 3 directions -- 10 weeks per setting -- so the team has a deep body of work ready to accelerate whichever setting wins. The alternative: spend only 10 artist-weeks on setting-specific exploration (split across 3 directions) and 50 artist-weeks on setting-agnostic foundations. The bold allocation wastes 20 artist-weeks (67% of the setting-specific work) but gives the winning direction a 3-week head start on the vertical slice. The conservative allocation wastes only 6.7 artist-weeks but the winning direction has almost no developed concepts when it is chosen at month 4, requiring a sprint to produce the vertical slice deliverables in 2 months. State which allocation you choose and the specific vertical-slice deliverable that justifies your choice -- the one deliverable that benefits most (or suffers most) from early setting-specific exploration. State which type of concept art is the riskiest to produce before the setting is locked (the type where a wrong-setting version has zero salvage value) and the type that is safest (where even a wrong-setting version teaches the team something useful about the game's visual identity). If the game director delays the setting decision to month 5 instead of month 4, state which allocation you switch to (if any) and why the extra month of uncertainty changes the calculus.`
  },
];

(async () => {
  let applied = 0, notFound = 0;
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
      notFound++;
    }
  }
  console.log('\nTotal applied:', applied, 'of', REWRITES.length);
  console.log('Not found:', notFound);
  await pool.end();
})();
