require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REWRITES = [
  // 32c5c7db (score 6) -- "reads more like product triage than UX craft"
  // Fix: replace feature-list prioritisation with a concrete UX design problem
  // that forces UI craft decisions, not PM-style feature ranking
  {
    prefix: '32c5c7db',
    text: `You are the solo UX lead on a 45-person multiplayer game team in Unreal 5. The next milestone requires shipping a new ranked mode. The ranked mode has 5 UI screens: queue screen (rank display, party formation, map/mode selection), draft/ban screen (hero selection with timer, 10 player slots, pick order), loading screen (team composition summary, player cards, tips), in-match ranked overlay (SR change preview, streak indicator, match score), and post-match results (SR delta, promotion/demotion animation, season progress). You have 1 UI programmer for the milestone. You prototype all 5 screens in Figma and find: the draft/ban screen requires a 90-second real-time timer with 10 simultaneous player slots updating live -- the most complex widget hierarchy -- estimated at 3 engineer-weeks alone. The queue screen is 1 week. The other 3 screens are 0.5 weeks each. Total: 5.5 weeks for 1 programmer in a 4-week milestone. You must cut 1.5 weeks. State which screen you redesign to reduce engineering complexity (not which you defer -- you must ship all 5). For the draft/ban screen specifically, state the single UX simplification that saves the most engineering time: reducing simultaneous visible player slots from 10 to 2 (your team + opponent currently picking), removing the real-time timer animation in favour of a static countdown number, or replacing the hero grid with a searchable list. Choose one, rule out one, and state the player-experience cost of your choice versus the engineering time saved.`
  },

  // a4fdaef1 (score 6) -- "mostly production scheduling arithmetic; needs lighting-specific triage"
  // Fix: replace day-by-day scheduling with a lighting craft decision about
  // what you can and cannot do on blockout vs final-art maps
  {
    prefix: 'a4fdaef1',
    text: `You are the senior lighting artist on a narrative multiplayer game in Unreal 5 with Lumen. Your 4-week lighting block starts Monday. Map readiness: 2 maps have final environment art and VFX, 3 maps have first-pass blockout with placeholder grey materials, 2 maps have VFX landing mid-block, 1 map has character art being reworked. On the 3 blockout maps, Lumen GI responds to the placeholder grey materials with flat, uniform bounce light -- meaning any colour temperature, fill placement, or post-process exposure you set now will be wrong once the final materials (which have actual albedo, roughness, and emissive values) replace the placeholders. You have a choice: (A) light the blockout maps to a "good enough" level now, knowing you will rework 60-80% of the lighting when final materials land -- essentially doing the work twice but having milestone-presentable screenshots; (B) do only exposure, key light direction, and fog density on the blockout maps (work that survives material changes) and leave fill lights, post-process colour grading, and emissive response for a second pass after materials are final -- the milestone screenshots will look flat but you avoid double work; (C) skip the blockout maps entirely and spend all 4 weeks perfecting the 2 final-art maps to shippable quality -- the milestone shows 2 polished maps and 6 grey ones. Choose one. Rule out one and state the specific stakeholder reaction (art director, producer, or publisher) that makes it unacceptable. For the 2 maps where VFX lands mid-block: VFX typically adds emissive particles, muzzle flash lights, and explosion illumination that changes your exposure settings by 0.5-1.0 EV stops. State whether you light before VFX and adjust after, or delay lighting those maps until VFX is integrated, and the production consequence of each.`
  },

  // e0cab97a (score 5) -- "EU clause and fine exposure turn this into legal/compliance recall"
  // Fix: remove regulatory citation demands, focus on concrete monetisation UI
  // design decisions that affect player trust and conversion
  {
    prefix: 'e0cab97a',
    text: `You are designing the in-game shop for a free-to-play mobile battle royale in Unity targeting iOS and Android. The shop has rotating daily offers, bundles, 2 virtual currencies (premium gems and soft coins), a season pass, and a battle pass. ARPDAU target: $2.80. Audience: 14-22 years old. The shop has one critical UX problem: dual-currency pricing. An item can cost either 500 gems (premium, bought with real money) or 12,000 coins (soft, earned in-game). You need to display both prices on the item card. Three approaches: (A) show both prices side by side on every card -- transparent but cluttered, and 68% of players in soft-launch A/B testing ignored the coin price entirely because the gem price was visually dominant; (B) default to the gem price with a toggle to show the coin price -- cleaner but the coin price is hidden, and players who grind instead of pay feel the shop is not for them (soft-launch churn in non-payer segment was 15% higher); (C) show only the coin price by default and display the gem price as a "Buy Now" shortcut -- maximises perceived fairness but soft-launch gem revenue dropped 22% because the conversion funnel added one extra tap. Choose one. Rule out one and state the specific revenue or retention metric it damages. For the purchase confirmation flow, the current 3-tap flow (select item → confirm currency → confirm purchase) has a 12% cart abandonment rate at the currency confirmation step. State whether you merge the currency selection into the item card (removing a step but risking accidental purchases) or keep the extra confirmation but redesign the currency selection as a visual toggle rather than a modal dialog. State the specific accidental-purchase mitigation if you remove a confirmation step.`
  },

  // c5ad7b5c (score 5) -- "generic mobile social UX; needs game-specific constraints"
  // Fix: add squad queue readiness, match-in-progress rejoining, and
  // tournament bracket coordination as game-specific social UI problems
  {
    prefix: 'c5ad7b5c',
    text: `You are the solo UI/UX lead on a F2P mobile squad shooter in Unity, shipping iOS and Android with a 150MB install cap. 4-player squads, guilds up to 50 members, text chat only. The party-formation screen must handle a specific game problem: when a squad leader hits "Queue," all 4 members must confirm readiness within 10 seconds or the queue attempt fails. In soft-launch data, 35% of queue attempts fail because one member is AFK or has their phone backgrounded. Three readiness approaches: (A) auto-ready all party members and let them cancel within 5 seconds -- reduces failed queues to 8% but 12% of matches start with an AFK player who did not intend to queue; (B) require explicit ready-up with a push notification to backgrounded players -- reliable but the push notification adds 3-6 seconds of latency and iOS throttles notifications after 5 per hour; (C) show each member's activity state (last interaction timestamp) and let the squad leader exclude idle members before queuing, auto-filling with matchmaking -- reliable but the squad leader must make a social decision to exclude a friend. Choose one. Rule out one and state the specific player sentiment it creates (frustration, guilt, or AFK abuse). For the guild tournament bracket problem: a 30-person guild is coordinating an 8-team bracket where each team is 4 players. The bracket screen must show team assignments, match schedule, current scores, and the "lobby up" button for the next match. On a 6-inch phone screen at 44px minimum touch targets, you cannot display all 8 teams with rosters simultaneously. State the specific navigation structure (scrollable list, bracket visualisation with zoom, or tab-per-round) and what information you show on the default view versus what requires a tap to reveal.`
  },

  // 41ad70da (score 6) -- "demands too many invented exact numbers"
  // Fix: reduce deliverable-counting, focus on the core concept art trade-off:
  // how to communicate gameplay constraints through visual design
  {
    prefix: '41ad70da',
    text: `You are Lead Concept Artist designing the environment concept package for a 16-player multiplayer map: a destroyed industrial fishing port on a Greek island. The map must support extraction mode with 3 extraction points, 2 indoor combat zones, and 80+ metre sniper sightlines. The core tension: extraction games need navigation clarity (players must instantly read extraction point locations from 80 metres) but the setting is a destroyed port (visual chaos, collapsed structures, rubble). You need to communicate both in a single concept package. For the top-down layout concept, state how you visually indicate the 3 extraction zones so the environment team understands they must be readable at distance -- what visual device (unique silhouette, colour coding, lighting contrast, or material differentiation) separates extraction points from general combat space, and what minimum silhouette height at 80 metres you target. For the material language, you define 3 primary material families for the port. The art director reviews your concept and says the three families look too similar at distance -- the map reads as a uniform grey-brown mass from the default camera height. State the specific visual fix: which material property (colour temperature, value contrast, or roughness) you adjust on which family, and the minimum value separation between families that produces readable differentiation at 30+ metres. For the 2 indoor combat zones, state whether you give them a distinct material palette from the exterior (visually jarring transitions but clear indoor/outdoor distinction) or extend the exterior materials inward (seamless but players may not realise they have entered an interior). Choose one and state the gameplay readability consequence of the alternative.`
  },

  // cf747c11 (score 6) -- "generic asset-governance exercise; needs shipped-game style drift examples"
  // Fix: anchor in a specific contamination scenario where an adapted asset
  // pulls production art in the wrong direction
  {
    prefix: 'cf747c11',
    text: `Your studio acquired the concept art archive from a cancelled dark-fantasy ARPG: 1,200 pieces. Your new project is a bright, stylised co-op adventure for Switch and PC. The art director wants to mine the archive for time savings but worries about tone contamination. You triage 200 environment pieces and find 40 that show architectural structures (castles, bridges, towers) with proportions and layouts useful for your game's level design. The problem: every one of those 40 pieces uses the ARPG's material language -- pitted iron, blood-stained stone, desaturated moss, warm candlelight in cold environments. If your environment artists use these as reference, they will unconsciously adopt the ARPG's surface finish and lighting mood even if they change the colour palette. You have seen this happen before: an adapted reference with the right silhouette but the wrong material language produces art that is 70% correct but requires a full rework of surface detail -- costing more time than starting from scratch. For the 40 architectural pieces, state the specific adaptation process that preserves the structural layout (plan view, proportions, modular logic) while actively removing the material language: do you (A) create a greyscale structural extraction (strip colour, materials, and lighting, keep only silhouette and proportions) that cannot carry tonal contamination; (B) paint over the pieces in the new game's style (2-3 hours per piece, 80-120 hours total) to create "clean" references; (C) write a reference usage guide that tells artists to use the pieces for layout only and ignore materials -- relying on discipline rather than physical separation. Choose one. Rule out one and state the specific contamination incident it fails to prevent. For the remaining 1,000 non-architectural pieces (characters, props, UI, VFX), state the single visual element you use as the discard criterion: what specific property of a concept piece makes it unsalvageable regardless of adaptation effort?`
  },

  // 057a8b73 (score 6) -- "too process-heavy; needs concrete conflict where bible prevents bad asset"
  // Fix: anchor around a specific visual bible enforcement failure
  {
    prefix: '057a8b73',
    text: `Your studio is in pre-production on a sci-fi co-op extraction shooter in Unreal 5. You are building a visual bible for a team growing from 3 to 12 artists. At month 4, the visual bible has locked: character proportions (semi-realistic, 7.5 head heights), material language (brushed metal, polymer panels, fabric underlayers), colour palette (cool-dominant with warm accent restricted to faction insignia and UI), and silhouette rules (all characters must read as distinct classes at 30-metre gameplay distance). At month 5, artist 8 joins and submits a character concept for a heavy armour class. The concept is technically excellent -- strong rendering, clear construction, detailed materials. But it violates the bible in 3 ways: the proportions are 8.5 head heights (heroic, not semi-realistic), the armour uses a warm bronze metal that reads as the accent colour reserved for faction insignia, and the silhouette at 30 metres is indistinguishable from the existing tank class. The artist argues the violations make the character look better. They are not wrong -- the concept is more visually striking than the bible-compliant version would be. State which of the 3 violations you reject outright as non-negotiable (and the specific downstream production or gameplay reason), which you negotiate (what compromise preserves the artist's intent within the bible's constraints), and which you accept as a valid bible update (and how you propagate the change to existing work without breaking consistency). For the enforceability problem, state the specific mechanism that catches violations before they reach this stage: a pre-submission self-check template, a mandatory concept review gate with you as the gatekeeper, or a visual overlay tool that tests silhouette distinctness against the existing roster. Choose one and state why the other two fail at 12 artists.`
  },

  // e18ff82a (score 5) -- "generic team management and morale; needs specific reusable art outputs"
  // Fix: replace morale handling with concrete art deliverables that
  // have value across settings, with measurable waste metrics
  {
    prefix: 'e18ff82a',
    text: `You are leading a 4-person concept team on a new IP. Three months into a 6-month pre-production. The setting is not locked: post-apocalyptic sci-fi, retro-futurist, or near-future military. Decision at month 4 based on market analysis. Vertical slice gate at month 6. You need to produce concept art that is not wasted regardless of which setting is chosen. You audit what transfers across all 3 settings and what does not. Transferable: character body type proportions and class silhouettes (the heavy/medium/light distinction works in any setting), weapon ergonomic studies (grip angles, sight lines, two-handed vs one-handed proportions), environment scale studies (corridor widths for multiplayer flow, cover height relative to character, sightline distances), and colour theory explorations (palette relationships, contrast ratios, readability tests). Non-transferable: costume design (a retro-futurist jacket is useless if the setting goes military), vehicle design (wildly different across all 3 settings), architectural style (Brutalist bunkers vs chrome towers vs bombed-out suburbs), and key art (setting-specific hero shots). You calculate: at 4 artists for 3 months, you have roughly 60 artist-weeks. If 40% of output is setting-specific, you waste 24 artist-weeks when 2 of 3 settings are killed. State the exact work allocation: how many artist-weeks you assign to transferable work, how many to setting-agnostic exploration (material studies, lighting mood tests), and the maximum artist-weeks you allow on setting-specific work (knowing 67% will be wasted). For the transferable work, state 3 specific deliverables each artist produces, the format (silhouette sheet, proportion study, colour key), and how each deliverable feeds directly into the vertical slice regardless of setting. State the single type of work you explicitly forbid until month 4 and the specific artist behaviour you watch for that signals they are drifting into it.`
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
