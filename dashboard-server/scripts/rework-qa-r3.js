require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REWRITES = [
  {
    // 2dccb4df - R2 score 6, "8 slots for 6 bugs blunts the trade-off"
    // Fix: make the math force a genuine exclusion -- 4 slots for 6 bugs, each with real stakes
    prefix: '2dccb4df',
    text: `You are QA lead on a free-to-play PvP shooter. The four crashes in the release candidate are already assigned to engineering for the Tuesday cert submission -- Sony TRC and Microsoft XR require zero crash-to-dashboard. That leaves 4 remaining engineering slots before submission. Six gameplay bugs are competing for those 4 slots: (1) A wall-breach exploit on the competitive map "Dockyard" -- posted on Reddit with a reproduction video and 2,000 upvotes. Not a cert blocker, but the ranked season starts at launch and this exploit gives free sightlines into both spawn areas. (2) A UI overlap hides the purchase confirmation button in the real-money store on ultrawide monitors (21:9 and 32:9). The monetisation team estimates 8% of PC players use ultrawide and warns of refund risk. (3) A weapon dealing 0 damage on headshots when the target is climbing a ladder. Rare interaction but fully reproducible, competitive integrity issue in ranked play. (4) An incorrect hitbox on the character "Kestrel" -- her crouch animation shrinks the visual model but the hitbox does not update, so headshots during crouch register as body shots. Affects every match where Kestrel is picked, and she is the most popular character in the beta at 34% pick rate. (5) A memory leak in spectator camera reaching 800MB after 40 minutes. Does not affect ranked play but will crash tournament broadcasts and streamer spectating. (6) An audio desync where ability sound effects lag 200ms behind visual effects when more than 8 players use abilities within 15 metres. Affects gameplay clarity in team fights but has no cert or economy risk. Pick your 4. For each of the 2 you exclude, state the specific risk you are accepting, whether it can be hotfixed day-one or requires a client patch, and what you tell the platform holders about it in the submission notes.`
  },
  {
    // 4baf7df4 - R2 score 6, "over-indexes on arithmetic, not enough observability for QA craft"
    // Fix: shift from calculating numbers to testing whether the exploit chain actually works and what breaks
    prefix: '4baf7df4',
    text: `You are QA on a free-to-play mobile strategy game with a player marketplace. The economy designers have flagged a theoretical exploit: seasonal event tokens can buy exclusive crafting materials, those materials can be crafted into tradeable items, and tradeable items can be sold on the marketplace for gold. During promotional events, gold can buy gem-discounted bundles -- creating an unintended token-to-gem conversion path. The designers modelled this on a spreadsheet and concluded it is not economically viable for players (too slow, too many steps). Your job is not to recalculate their spreadsheet -- it is to test whether the exploit chain actually works in the live game and whether there are failure points the designers did not model. You have a debug menu and a test server. Three specific things the designers' spreadsheet does not account for: (1) The marketplace has a "buy order" system where players can set standing orders. Can a player set a buy order for the crafted item, then fill their own order from a second account, bypassing the 24-hour listing period? (2) The crafting recipe produces items with random stat rolls. The marketplace prices items by rarity tier, not by stats. Can a player craft 10 items, list only the low-roll ones for gold (which sell at the same tier price as high-rolls), and keep the high-rolls for gameplay advantage -- effectively getting paid to gear up? (3) The event token shop has a "buy all" button that purchases the maximum quantity in one tap. Is there a daily purchase limit on crafting materials, or can a player dump 2,000 tokens into materials in one session and flood the marketplace? Test these three scenarios on the test server. For each one, report: does it work as described, what is the actual behaviour you observed, and is it a fix-now-before-event (9 days away), fix-during-event, or acceptable-design-tradeoff?`
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
