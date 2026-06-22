require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Round 2 rewrites for 7 questions that scored 6 in Codex R1.
// Common feedback: test process/ranking/classification rather than game-specific craft.
// Fix: replace process questions with craft-specific decisions under production pressure.

const REWRITES = [

  // 36dc3be0 -- R1 score 6, "Python vs Blueprint obvious, production arithmetic"
  // Was: 3 editor tools, choose 2 to build, Python vs Blueprint
  // Fix: remove the obvious Python/BP choice, force a single tool architecture decision with a game-specific collision failure
  {
    prefix: '36dc3be0',
    text: `You are Snr Technical Artist on a multiplayer shooter in Unreal 5. Your environment team places collision volumes on modular kit pieces manually -- 20 minutes per piece, 200 pieces per map. You are building an auto-collision editor tool. The tool must generate collision for the kit library and validate it during level assembly. The game-specific problem: your modular kit has 3 piece types that need different collision strategies -- solid walls (simple box), archways with pass-through gaps (convex decomposition with max 4 hulls), and grated walkways (simplified plane collision, ignoring the visual holes). The tool must detect which strategy to apply per mesh. Three detection approaches: (A) naming convention -- the mesh name suffix (_solid, _arch, _grate) drives the collision strategy -- fast to implement but the naming convention was already violated 40% of the time by the outsource studio, and retroactively renaming 800 assets is a 2-day task; (B) geometry analysis -- the tool samples the mesh bounding box, convexity, and open-face ratio to classify it automatically -- handles any mesh but misclassifies L-shaped corridor pieces as archways (15% false positive rate on your test set of 60 pieces); (C) artist-tagged metadata -- each mesh has a custom collision_type metadata field set in the asset import pipeline, with a validator that blocks import if the field is empty -- accurate and enforced but requires retooling the import pipeline (3-day setup) and training the outsource studio. Choose one. Rule out one and state the specific multiplayer gameplay failure (player snagging, grenade clipping, or AI navigation break) it causes when misclassification occurs on a shipped map. For your chosen approach, state the per-piece collision generation time target and how you validate the output against a reference set of hand-authored collision for 20 test pieces.`
  },

  // 393f2d61 -- R1 score 6, "generic UI prioritisation, not art-specific"
  // Was: UI motion language 3 tiers with simultaneous fire management
  // Fix: anchor in a game-specific HUD animation that affects gameplay readability
  {
    prefix: '393f2d61',
    text: `You are UI/UX Lead on a competitive 5v5 hero shooter in Unreal 5 using UMG. The ability cooldown HUD uses animated radial sweeps (clock-wipe fill) to show remaining cooldown on 4 abilities. The sweep animation runs at 60fps in UMG and costs 0.15ms per ability (0.6ms total for 4). Your UI frame budget is 2ms on PS5. Problem: during a team fight, the kill feed, objective ticker, and damage direction indicators also animate, pushing total UI to 3.1ms. The art director says the radial cooldown sweep is the most important animation because it gives competitive players frame-accurate ability timing. Three approaches to stay under 2ms: (A) convert the radial sweep to a pre-rendered sprite sheet atlas with 60 frames per ability -- drops the per-ability cost from 0.15ms to 0.02ms (0.08ms total) but the sprite sheet cannot dynamically adjust to ability haste buffs that change cooldown duration mid-match, causing visual desync between displayed and actual cooldown; (B) keep the radial sweep as material-based but reduce the kill feed and damage indicators to instant (no animation) -- saves 0.8ms from those systems, keeping total under 2ms, but instant kill feed entries are harder to read during rapid multi-kills and damage indicators without directional fade lose spatial clarity; (C) implement a dynamic LOD on all animations where the system drops from 60fps to 30fps rendering when more than 3 animations are concurrent -- halves the cost under load but the cooldown sweep visibly stutters at 30fps on a 144Hz monitor, which competitive players will notice. Choose one. Rule out one and state the specific competitive gameplay moment where it causes a player to misread ability availability. For your choice, state the latency (in ms or frames) between actual ability ready state and the HUD reflecting it, and whether that latency is acceptable in a ranked match.`
  },

  // 4d1698bd -- R1 score 6, "broad classification, UX generalist could answer"
  // Was: HUD declutter with element classification
  // Fix: force a game-specific HUD widget design decision, not classification
  {
    prefix: '4d1698bd',
    text: `You are UI/UX Lead on a 5v5 hero shooter in Unreal 5. Each hero has 4 abilities and an ultimate. During playtesting, players report they cannot track enemy ability usage in team fights. Engineering can restructure 2 HUD widget layers in 3 weeks. The specific design problem: enemy ability indicators currently appear as 5 small icons per enemy (4 abilities + ult) above their nameplates. With 5 enemies, that is 25 icons competing with friendly ability bars, health indicators, and the kill feed. At 30+ metres, the enemy icons are under 12 pixels each and unreadable. You must redesign the enemy ability communication system. Three approaches: (A) remove per-ability icons entirely and replace with a single threat-level indicator per enemy (low/medium/high based on abilities off cooldown) -- reduces visual noise from 25 icons to 5 colour-coded badges but players cannot identify which specific ability is available; (B) contextual enemy ability display that only shows an enemy's abilities when the player aims at them within 40 metres, displayed as a larger format near the crosshair -- full information when needed but invisible otherwise, so flanking enemies with ready ultimates give no warning; (C) audio-visual callouts where enemy ultimate readiness triggers a brief screen-edge flash and audio cue when an enemy within 50 metres charges their ult past 80% -- no persistent screen clutter but limited to ultimates only, and the audio cue competes with combat sound. Choose one. Rule out one and state the specific team-fight scenario where a player dies because the approach failed to communicate critical enemy ability information. For the 2 widget layers engineering can restructure, state which 2 current HUD elements you replace with your chosen system and what information about friendly heroes you sacrifice to make room.`
  },

  // 60a2bced -- R1 score 6, "tests engine-version trivia more than art judgement"
  // Was: Nanite/Lumen exclusion per asset category
  // Fix: anchor in a visual quality decision, not engine feature knowledge
  {
    prefix: '60a2bced',
    text: `You are Snr Environment Artist on an open-world survival game in Unreal 5.4 targeting PS5 at 30fps. Your world has dense urban ruins with 400+ unique static meshes and natural terrain with foliage. The rendering pipeline uses Nanite for high-poly static meshes and Lumen for global illumination. QA has filed 3 specific visual bugs: (A) chain-link fences and shattered windows flicker at distance because their masked materials produce pixel-thin geometry that Nanite's cluster culling cannot handle -- the fence appears and disappears as the camera moves; (B) light leaks through interior walls thinner than 15cm when Lumen's software traces pass through the geometry -- visible as bright rectangles on corridor walls; (C) foliage cards (grass, fern, leaf litter) render as solid planes instead of alpha-cutout shapes under Nanite, making the forest floor look like a field of green rectangles. For each of the 3 bugs, you must choose a rendering fallback that fixes the visual artefact. For bug A (fences/windows): state whether you use traditional LODs with manual alpha-test threshold, screen-door dithering, or a mesh-based alternative to masked materials (solid slat geometry instead of alpha-cutout). For bug B (light leaks): state whether you add wall thickness (15cm → 30cm, costs 2,000 extra triangles per wall section), place shadow-only blocking geometry, or switch affected interiors from Lumen to baked lightmaps. For bug C (foliage): state whether you exclude all foliage from Nanite and use HISM with manual LODs, keep foliage on Nanite but switch to opaque geometry (3D modelled leaves), or use a hybrid (trunks on Nanite, leaf cards on HISM). For one of the three, state the visual quality you lose compared to the ideal rendering path and why you accept it.`
  },

  // 78685707 -- R1 score 6, "fixes handed to candidate, tests ranking not diagnosis"
  // Was: day/night 3 artefacts, fixes pre-specified, choose 2 of 3
  // Fix: remove the pre-specified fixes, force the candidate to diagnose and propose
  {
    prefix: '78685707',
    text: `You are Snr Lighting Artist on an open-world survival game in Unreal 5.4 targeting PS5 and PC. The game has a 24-hour day/night cycle completing in 40 real-time minutes. The directional light (sun/moon) rotates continuously; the sky uses a dynamic sky material with atmospheric scattering. During the dusk period (when the sun passes below the horizon and the moon takes over), three problems appear simultaneously and QA cannot separate them because they occur within the same 3-minute window. Symptoms: the sky visibly "jumps" for one frame during the handoff, the horizon band turns an unnatural grey-green for roughly 15 seconds, and character shadows elongate to 40+ metres and flicker during the transition. The level designer asks you to diagnose these. For each symptom, state the most likely root cause (not the fix -- the cause): is the sky jump caused by a material parameter discontinuity, a light source swap, or a skybox texture blend? Is the grey-green horizon caused by the scattering model, the sky gradient LUT, or an HDR tonemapping artefact? Are the flickering long shadows caused by cascade resolution, light rotation speed, or contact shadow distance? State your diagnosis for each and the specific engine setting or graph node you would inspect first to confirm it. Your lighting budget is 3ms on PS5 and you are currently at 2.6ms during the dusk window. You can spend 0.4ms on fixes. State which of the three symptoms you prioritise fixing first and why -- based on player camera behaviour during dusk (are they looking at the sky, the horizon, or their character's shadow?).`
  },

  // a8e1082b -- R1 score 6, "generic UI compromise, not deep game UX craft"
  // Was: localisation shop cards across 5 languages
  // Fix: anchor in a game-specific shop interaction failure, not text expansion
  {
    prefix: 'a8e1082b',
    text: `You are UI/UX Lead on a free-to-play multiplayer game in Unreal 5 shipping in English, German, Japanese, Korean, and Arabic (RTL). The shop screen has a timed daily rotation of 8 item cards at 1080p. Each card shows: item name, rarity badge, price with premium currency icon, a "compare to equipped" stat delta, and a 2-line description. The game-specific problem: the "compare to equipped" stat delta is the most important purchase signal -- it shows +15 Attack or -3 Speed in coloured text. During a post-launch review, German-language players report that the stat delta is truncated on 30% of items because German compound words expand the item name by 55%, pushing the stat delta below the card's visible area. Japanese players report a different issue: the price and rarity badge overlap because the Yen symbol (¥) is wider than the dollar sign and the rarity badge text ("レジェンダリー" for "Legendary") is 3x longer than the English equivalent. You cannot make per-language layouts (engineering constraint). For the German stat-delta truncation, choose one fix: (A) auto-shrink the item name font from 14px to 10px when it exceeds 20 characters -- preserves all text but 10px is below your minimum readability threshold for TV viewing at 2.5m; (B) move the stat delta to a persistent footer bar below the card grid rather than inside each card -- always visible but the comparison is now spatially separated from the item it refers to; (C) truncate the German item name at 20 characters with an ellipsis and show the full name on hover/select -- saves space but the truncated name may cut before the meaningful word (German compound nouns have meaning at the end). Choose one, rule out one, and state the specific German item name pattern where your choice fails. For the Japanese price/rarity overlap, state the specific pixel adjustment or layout restructure you apply and which element loses screen space.`
  },

  // e63b4cea -- R1 score 6, "tests handoff process, not game-specific UI craft"
  // Was: UI handoff spec to engineering with 3 prior failures
  // Fix: replace with a game-specific widget behaviour design problem
  {
    prefix: 'e63b4cea',
    text: `You are UI/UX Lead on a multiplayer RPG in Unreal 5 with UMG. You are designing the drag-and-drop behaviour for the inventory screen. The inventory has a 10×8 grid (80 slots). Items occupy 1×1 to 2×3 slots. Players can drag items between inventory, equipment paper doll (14 slots), and a "salvage" zone. The game-specific complexity: during multiplayer co-op, another player can trade you an item while you are mid-drag, inserting it into your inventory and potentially displacing the grid position your dragged item was heading for. Additionally, combat can start during inventory management (no pause in multiplayer), and the design team requires that taking damage cancels any active drag and returns the item to its origin slot. Three drag feedback approaches: (A) ghost preview -- the dragged item shows as a semi-transparent ghost at the cursor, and valid drop zones highlight green while invalid zones highlight red. On the grid, multi-slot items project their full footprint. The ghost updates every frame. Cost: 0.3ms for the preview overlay. Problem: when a traded item arrives mid-drag and shifts the grid, the green/red preview becomes stale for 1-2 frames before recalculating; (B) slot reservation -- when the player picks up an item, the origin slot is marked "reserved" (greyed out) and the destination slot group is pre-reserved on hover, blocking incoming trades from using those slots. Cost: near zero rendering. Problem: the reservation blocks valid trades -- the other player sees "inventory full" even though the slots are only tentatively reserved; (C) snap-back with animation -- the item teleports to the cursor instantly but if the drop zone becomes invalid (due to a trade arriving or combat starting), the item animates back to its origin slot over 0.2 seconds. No reservation, no ghost preview. Cost: 0.1ms for the spring animation. Problem: the snap-back on combat-start feels like input was eaten, and players may not understand why the drag was cancelled. Choose one. Rule out one and state the specific multiplayer scenario (trade during drag, combat interrupt, or both simultaneously) where it produces a confusing or unfair result. For multi-slot items (2×3), state how your approach handles the case where only 4 of 6 destination slots are free.`
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
