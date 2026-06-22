require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REWRITES = [
  // 7d485a2f - score 6 R1, "production prioritisation not level design"
  // Fix: replace hour-by-hour allocation with a forced spatial design decision under time pressure
  {
    prefix: '7d485a2f',
    text: `You are a senior level designer with three maps in flight. Map C has a certification submission in 10 days and a showstopping spawn-trap bug: defenders can see attackers within 0.5 seconds of round start from a position that covers both exits of the attacker spawn room. The spawn room is 8x6 metres with two exits -- north (3m wide) and east (2.5m wide). The defender position is a headglitch on a crate 22 metres from the north exit with a partial angle into the east exit. You have three spatial fixes available: (A) add a 2-metre-tall wall segment 4 metres outside the north exit that blocks the headglitch sightline but also blocks attacker vision of mid for the first 3 seconds of the round, changing the opening dynamic; (B) move the attacker spawn room 5 metres south, which breaks the sightline entirely but changes spawn-to-A-site timing from 12 seconds to 14 seconds and spawn-to-B-site from 11 to 10 seconds; (C) raise the spawn room floor by 1.5 metres so the headglitch angle no longer clears the spawn exit lip, but this creates a downhill advantage for attackers exiting north that did not exist before. Choose one fix. State which of the other two you are ruling out and why that spatial side-effect is worse than the side-effect of your chosen fix. Specify what you would check in a single 10-round playtest to confirm your fix did not introduce a new imbalance.`
  },

  // da2775a9 - score 6 R1, "tests art-direction vocabulary not game design"
  // Fix: replace lighting/material specs with spatial and gameplay-driven constraints
  {
    prefix: 'da2775a9',
    text: `You are a senior level designer on a 5v5 tactical shooter with a 0.8-second headshot TTK and 5.5 m/s movement speed. You have designed a flanking route: a 3-metre-wide alley, 18 metres long, connecting attacker spawn to B bombsite. The route must be discoverable by new players within their first 3 matches but not visible from the main lane during normal play. The artist's first pass made the entrance a dark gap in a wall, identical in shape and scale to three non-playable decorative gaps on the same building facade. In your last playtest with 8 new players, zero found the flank in 12 rounds -- they assumed it was background geometry. You need to redesign the entrance to distinguish it from the decorative gaps without making it obvious from the main lane (which would let defenders pre-aim it). State the one spatial change to the entrance geometry that signals 'this is a path' without adding signage or UI markers, the one environmental object you place within the first 3 metres of the alley that confirms the player's decision to enter was correct, and the specific sightline constraint you enforce so a defender standing at B site cannot see more than 4 metres into the alley from any position. Then state why you would not widen the alley entrance beyond 4 metres even though it would improve discoverability.`
  },

  // ddefa407 - score 6 R1, "milestone logistics not game design"
  // Fix: replace scheduling question with a spawn-trap diagnosis question requiring spatial reasoning
  {
    prefix: 'ddefa407',
    text: `You are a level design lead on a 5v5 competitive shooter. A senior designer's map has a suspected spawn trap on the defender side of B bombsite: in 8 of 24 playtest rounds, attackers reached a position where they could see defenders exiting B spawn within 2 seconds of round start. The designer insists it is not a spawn trap because defenders can avoid the sightline by taking a 4-second detour through a side corridor. Your playtest data: defenders who took the side corridor arrived at B site 6 seconds later than attackers, losing site control in 100% of those rounds. Defenders who took the direct route were killed in the first 3 seconds in 33% of those rounds but arrived at B site on time in the other 67%. The map has a 14-second round timer before the bomb can be planted. You need to determine whether this is a geometry problem (the sightline from the attacker angle into defender spawn is the issue) or a timing problem (the side corridor is too slow, making the direct route the only viable option despite the risk). State the one temporary geometry change you would make to test each hypothesis, what data from a 20-round playtest would confirm each hypothesis, and which fix you would ship if both hypotheses turn out to be partially correct -- the sightline block or the corridor shortcut -- and why you would not ship both simultaneously.`
  },

  // ae325174 - score 6 R1, "management judgement not design competence"
  // Fix: replace designer evaluation with a concrete systems/economy/map diagnosis requiring design craft
  {
    prefix: 'ae325174',
    text: `You are a game design lead on a 5v5 competitive shooter reviewing three deliverables before the season launch in 4 weeks. Deliverable 1 (systems): the weapon progression system has 20 weapons but 3 dominate ranked play at all skill tiers -- the assault rifle, the burst SMG, and the bolt-action sniper account for 78% of kills across 200,000 matches. The remaining 17 weapons have pick rates below 4% each. Deliverable 2 (levels): the newest map has a 50.1% attacker win rate across 80,000 matches, but heatmaps show 40% of the map's playable area receives under 3% of player traffic -- two entire zones are functionally dead. Deliverable 3 (economy): the battle pass has an 88% completion rate at tier 50 but drops to 12% at tier 100, meaning 76% of paying players never reach the premium rewards they paid for. You can fix one deliverable before launch. The other two ship as-is and get patched in season 2. State which deliverable you fix first and why -- using a specific retention or revenue metric to justify the priority. For the deliverable you chose, state the single design change you would make (not 'rebalance weapons' but the specific lever -- e.g. 'reduce the assault rifle's first-shot accuracy by X degrees'). For each of the two you defer, state the one-sentence risk summary you present to the studio director.`
  },

  // 2114efd9 - score 6 R1, "battle pass cadence drifts to live-ops PM"
  // Fix: anchor in game-design-specific reward types and player behaviour, not content scheduling
  {
    prefix: '2114efd9',
    text: `You are a game design lead on a free-to-play 5v5 hero shooter. Your 12-week season battle pass has 100 tiers. Season 2 data: 40% of players completed tier 50 by week 6, then 30% of those players stopped logging in entirely for the remaining 6 weeks -- the 'dead zone.' Median weekly play is 6-8 hours and must stay there. Your reward structure is the problem: tiers 1-50 contain 3 hero skins, 2 weapon skins, 5 emotes, and 40 filler items (XP boosts, sprays, banners). Tiers 51-100 contain 2 hero skins, 1 weapon skin, 2 emotes, and 45 filler items. The perceived value per tier drops sharply after tier 50 because the ratio of desirable rewards to filler increases from 1:4 to 1:9. Your Season 3 goal: keep week 8-12 login retention within 15% of week 1-4 without increasing total grind hours. Redesign the reward distribution across the 100 tiers. State how many desirable rewards (skins, emotes) you move from the first half to the second half, what you replace them with in the first half to maintain early engagement, what specific new reward type you introduce exclusively in tiers 70-100 to create a pull that filler items cannot, and what the one reward type is that you would never gate behind tier 90 because it would make the pass feel punitive.`
  },

  // 4bab44f0 - score 6 R1, "onboarding product management not game design"
  // Fix: make the onboarding problem specifically about teaching game mechanics, not retention metrics
  {
    prefix: '4bab44f0',
    text: `You are a game design lead on a free-to-play 5v5 hero shooter with 20 heroes, each with 4 abilities. Day-7 retention is 22% (target: 35%). Analytics breakdown: 45% of churned players quit during the tutorial, and of those, 60% quit at the 'ability combo' lesson where they must chain two abilities on a specific hero. The combo requires activating ability 1 (a dash) within 0.5 seconds of ability 2 (a slam), and the tutorial gate requires 3 successful combos in a row. Success rate on the gate: 18% on first attempt, 42% by third attempt. Players who pass the gate have 41% day-7 retention -- above target. Players who fail 3 times and skip the tutorial have 14% day-7 retention. The combo gate is working as a skill filter but it is also the single biggest churn point. Three options: (A) remove the 3-in-a-row requirement and accept 1 successful combo (raises pass rate to ~70% but teaches less mastery); (B) replace the timed combo with a slow-motion training mode where the 0.5-second window is stretched to 1.5 seconds, then tighten it over 3 attempts (estimated pass rate: 55%, teaches the timing progressively); (C) remove the combo from the tutorial entirely and teach it as a contextual tooltip during the first PvP match (zero tutorial churn, but the tooltip fires mid-combat and 80% of players ignore mid-combat UI). Choose one. Rule out one explicitly. State what you expect to happen to day-7 retention for players who pass through your chosen option versus the current 41% for gate-passers, and whether any reduction is acceptable.`
  },

  // 4ec1c7e9 - score 6 R1, "generic F2P prestige theory"
  // Fix: anchor in specific game-design mechanics, not abstract progression philosophy
  {
    prefix: '4ec1c7e9',
    text: `You are a game design lead on a free-to-play 5v5 competitive shooter with cosmetic-only monetisation. You need a prestige system for players who have completed the ranked ladder (top 2% of the player base, approximately 8,000 players who reach Champion rank each season). Current problem: these players have no progression goal after reaching Champion, average session length drops 40% post-Champion, and 25% stop playing before the season ends. Your constraints: zero gameplay-affecting unlocks, no statistical advantage at any account level, and the system must not create a perception among new players that veterans have an unfair edge. Design a prestige system with exactly 3 tiers above Champion. For each tier: state the specific unlock type (not 'a cosmetic' but what kind -- e.g. a custom kill-feed icon, a lobby animation, a unique weapon inspect), the approximate hours required to reach it from the previous tier, and why that unlock type creates visible prestige without suggesting power. Then state the one prestige reward type you explicitly rejected and why -- specifically, what player perception it would create that violates your cosmetic-only constraint even though it technically grants no gameplay advantage.`
  },

  // 5959d1bb - score 5 R1, "generic UX not game-specific"
  // Fix: anchor in game-specific re-queue psychology, combat data display, and match-type consequences
  {
    prefix: '5959d1bb',
    text: `You are a mid-level designer building the post-match screen for a 5v5 competitive shooter with a round-based economy (buy phase each round, loss bonus, economy management). Average session is 3 matches. Your data: 60% re-queue rate target, but current re-queue rate is 42%. Exit surveys show the top reason for not re-queuing is 'I need a break after a loss' (38% of exits). The post-match screen currently shows: final scoreboard, personal K/D/A, and a 'Play Again' button. You have space for 4 panels above the fold on console at 1080p. The game-specific tension: showing detailed round-by-round economy data (buy decisions, loss bonus tracking, eco-round impact) would help competitive players improve but adds cognitive load that may drive casual players away faster. Showing only highlight clips and MVP votes would improve casual re-queue but would be dismissed as shallow by your ranked audience (55% of active players). Design the 4 panels in priority order. State what game-specific information each panel contains (not generic stats -- information tied to your round economy, ability usage, or positional play). State which single piece of information you deliberately exclude from the post-match screen entirely and show only in a separate match history view, and why showing it immediately after a loss would reduce re-queue rate.`
  },

  // 908658f3 - score 6 R1, "contradicts itself (non-technical but gives tick rate example)"
  // Fix: remove the tick-rate example, make all 3 changes purely game-design-level
  {
    prefix: '908658f3',
    text: `You are a game design lead on a 5v5 competitive shooter where wallhacks are the most reported cheat (60% of all reports). Internal controlled testing with a wallhack-equipped team shows perfect enemy position knowledge provides a 35% win-rate advantage. Your anti-cheat team handles detection and prevention -- they have asked you to reduce the strategic value of wallhack information purely through game design changes. Design three specific game-design-level changes (mechanics, rules, or systems -- not anti-cheat software, not networking changes, not rendering changes) that reduce the advantage of knowing enemy positions through walls. For each change: name the specific mechanic or rule you alter (e.g. 'add a 3-second positional uncertainty to the minimap ping after a player fires'), quantify the expected reduction in wallhack advantage as a percentage of the current 35%, and state the specific gameplay cost for legitimate players who do not cheat. Then choose which of the three changes you would not ship even if it reduced wallhack advantage by 10 percentage points, because the gameplay cost to legitimate players crosses a line you are not willing to cross. Name that line.`
  },

  // 6b5806af - score 6 R1, "invites fabricated metrics"
  // Fix: supply the live data, make the candidate diagnose from it rather than invent metrics
  {
    prefix: '6b5806af',
    text: `You are a level design lead establishing spatial standards for a 5v5 competitive shooter. Combat metrics: 0.6-second headshot TTK, 1.4-second body TTK, 5.5 m/s movement speed, 3-metre jump height, 40-metre maximum effective rifle range. Your 7-map pool launched 6 months ago. Live data from 2 million matches shows a problem: the two tight maps (8-15m engagement distances, dense cover) have a combined 45% pick rate and 8% dodge rate, while the two open maps (25-35m sightlines, sparse cover) have a combined 18% pick rate and 28% dodge rate. Queue health is degrading -- at off-peak, open-map queue times exceed 4 minutes because players keep dodging them. You need to write a spatial standard that your 4 designers follow for all future maps. The standard must define a mandatory engagement distance band that every zone on every map must fall within. State the specific minimum and maximum sightline lengths you mandate, what cover-to-open ratio you require per zone type, and how you handle the case where one of your open-map designers argues that the standard eliminates their preferred style entirely. Then state whether you retroactively apply the standard to the two underperforming open maps or leave them as-is, and what the queue-health consequence of each choice is.`
  },

  // 90c7d0fc - score 6 R1, "facilitation technique not game design"
  // Fix: replace debrief structure with a spatial diagnosis problem the candidate solves directly
  {
    prefix: '90c7d0fc',
    text: `You are a level design lead on a 5v5 tactical shooter. Your newest map's playtest data: 70% of kills cluster in the mid-lane connector (a 5-metre-wide corridor, 20 metres long, connecting attacker-side mid to defender-side mid), attackers win 62% of rounds when they take mid control first, and B bombsite receives only 8% of total player traffic despite having 3 entry points. Defenders rotate from B site to mid in 4.5 seconds but from A site to mid in 2 seconds, meaning A-site defenders can reinforce mid before B-site defenders can. The B bombsite is a 14x10-metre room with 6 cover pieces, 3 entries (north, south-east, and a window), and a bomb plant zone in the centre. Your hypothesis: mid is dominant not because mid is too strong, but because B site is too weak -- it does not reward attackers enough to justify the longer rotation from attacker spawn (9 seconds to B versus 5 seconds to mid). State the one specific geometry change you would make to B site to increase its attractiveness without weakening mid directly. State what metric you would expect to shift in the next 30-round playtest if your hypothesis is correct, and what result would prove your hypothesis wrong and force you to nerf mid instead. Then state why making B site more attractive and nerfing mid simultaneously would make the problem harder to diagnose.`
  },

  // 6f813e47 - score 6 R1, "under-specified blockout dimensions"
  // Fix: supply the specific failure data and force a precise corrective calculation
  {
    prefix: '6f813e47',
    text: `You are a senior level designer building a blockout for a 5v5 bomb-defusal map in Unreal Engine 5. Player capsule: 1.8m tall, 0.6m wide; crouch height: 1.2m; movement speed: 5.5 m/s; jump height: 3m. Your first blockout used 3-metre-wide corridors and 8x8-metre rooms. Playtest feedback: 'cramped.' Your measurements confirm: two players moving in opposite directions in a 3m corridor physically overlap (2 capsules at 0.6m each = 1.2m, but players strafe unpredictably and need clearance for peek-lean animations that extend the capsule width to 0.8m). In the 8x8m rooms, 5 players fighting simultaneously reported 'broom cupboard' -- the effective combat space after subtracting 4 crouch-cover pieces (each 1.5m x 0.8m footprint) is only 32.8 square metres, giving each player 6.5 square metres. For reference, your game's dodge-roll covers 3 metres and a shotgun's effective range is 8 metres -- a player cannot dodge in any direction without hitting a wall or another player. Calculate the minimum corridor width that allows two players to pass with at least 0.4m of clearance on each side of each capsule. Calculate the minimum room dimensions that give 5 players at least 12 square metres each after subtracting 4 standard cover pieces. State the specific corridor width and room dimensions you use in your revised blockout. Then state the threshold below which a room is 'too small for a bombsite fight' versus 'acceptable for a connector hallway,' and how you validate these dimensions without waiting for a full 10-person playtest.`
  },

  // ce7b10a1 - score 6 R1, "product instrumentation not game design"
  // Fix: replace analytics/product question with a game-design-specific social space problem
  {
    prefix: 'ce7b10a1',
    text: `You are a mid-level designer on a live 5v5 hero shooter. You shipped a pre-match social hub 4 weeks ago -- a 3D lobby where players see each other's characters, can emote, and inspect loadouts before queuing. Usage data: 85% of players pass through the hub, average dwell time is 9 seconds, 3% have used an emote in the hub. However, the hub increased battle pass emote purchases by 12% -- players see other players' emotes and buy them, even though almost nobody uses them in the hub itself. The hub is a display case, not a social space. Your product manager wants to invest another sprint making the hub more interactive (adding minigames, duelling, target practice). But your game's core loop is fast: 90-second queue times, 25-minute matches, immediate re-queue. Every second spent in the hub is a second not spent in the core loop. Design the one specific interactive element you would add to the hub that increases average dwell time from 9 seconds to at least 25 seconds without delaying queue entry. State why you chose an interactive element tied to your game's combat mechanics (e.g. a firing range with the current match's weapon loadout) rather than a generic social feature (e.g. a photo booth), what the specific risk is if dwell time exceeds 45 seconds (the point at which it may cannibalise re-queue rate), and the one interactive element you would explicitly reject because it creates a skill-practice advantage that makes the hub feel mandatory rather than optional.`
  },

  // f6666341 - score 4 R1, "numerical contradiction (1.2s is not an increase from 1.6s)"
  // Fix: correct the numbers and tighten the cascade analysis
  {
    prefix: 'f6666341',
    text: `You are a game design lead on a 5v5 hero shooter with 20 characters, each with 3 abilities and 1 ultimate. Current TTK: 0.8 seconds for headshots, 1.6 seconds for body shots. The creative director wants to increase body-shot TTK to 3.0 seconds to make ability usage and positioning more important than raw aim. Your competitive community plays the game specifically for its fast TTK -- it is the primary differentiator from competitors. You identify the cascade problem: 8 of 20 heroes become overpowered at 3.0-second body TTK because their abilities were balanced around the current 1.6-second kill speed. Specifically: healing abilities that restore 50HP in 1 second are marginal at 1.6s TTK (the target dies before the heal matters) but dominant at 3.0s TTK (the heal effectively doubles the target's survivability). Shield abilities that block 100 damage absorb one body-shot kill at 1.6s but absorb nearly two kills' worth of damage at 3.0s. Movement abilities that reposition over 0.5 seconds are interruptible at 1.6s TTK but safe at 3.0s. State which category of ability (healing, shielding, or movement) breaks most severely at 3.0s TTK and why. Then evaluate a partial TTK increase to 2.2 seconds body-shot: does the cascade still break the same 8 heroes, fewer heroes, or different heroes? State the specific TTK threshold at which healing abilities transition from balanced to dominant, and what you recommend to the creative director -- the full 3.0s change, the partial 2.2s change, or an alternative approach that achieves the creative director's goal (more ability and positioning relevance) without changing TTK at all. If you recommend the alternative, name the specific mechanic.`
  },
];

(async () => {
  let applied = 0;
  let notFound = 0;
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
