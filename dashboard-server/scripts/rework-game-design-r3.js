require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REWRITES = [
  // ae325174 - scored 5 in R2, "product prioritisation not game design craft"
  // The question kept drifting because its core structure is "rank 3 deliverables by business impact."
  // Fix: replace entirely with a pure game-design diagnosis problem -- give the candidate one broken system and make them fix it
  {
    prefix: 'ae325174',
    text: `You are a game design lead on a 5v5 competitive shooter. Your weapon progression system has 20 weapons across 4 categories (rifles, SMGs, shotguns, snipers). Live data from 200,000 ranked matches shows 3 weapons account for 78% of all kills: the assault rifle (38%), the burst SMG (22%), and the bolt-action sniper (18%). The remaining 17 weapons each have pick rates below 4%. Your damage model: every weapon has a base DPS value, a range-dependent damage falloff curve, and an accuracy penalty per consecutive shot (recoil). The 3 dominant weapons share a trait: they all have damage falloff curves that are flat to 25 metres, meaning they deal full damage across the entire engagement distance range of 6 of your 7 maps. The 17 underperforming weapons have steeper falloff -- they lose 20-40% damage between 15m and 25m. You have two options to rebalance: (A) steepen the dominant weapons' falloff curves so they lose 15% damage past 18m (a direct nerf that will anger the ranked community but levels the field); (B) flatten the underperforming weapons' falloff curves to match the dominant weapons (a buff to 17 weapons that risks power creep and reduces TTK across the board by an estimated 12%, which breaks your ability balance). Choose one. State why you are rejecting the other. For your chosen approach, specify the exact parameter change you make to one weapon as a concrete example, what the new kill-time at 20 metres would be compared to the current kill-time, and what single metric from the first 50,000 post-patch matches would confirm the rebalance is working versus making things worse.`
  },

  // 5959d1bb - scored 5 in R2, "post-match screen is UX/product surface"
  // This question is fundamentally about screen layout, which is UX work regardless of game-specific content.
  // Fix: replace entirely with a round-economy design problem -- the session-layer game design that drives match-to-match engagement
  {
    prefix: '5959d1bb',
    text: `You are a mid-level designer building the round economy for a 5v5 competitive shooter with 24 rounds per match (first to 13 wins). Each round has a 15-second buy phase where players purchase weapons and abilities from a shared team economy. Current economy rules: winning a round awards 3,000 credits per player, losing awards 1,900 + 500 per consecutive loss (loss bonus caps at 3,400 after 4 losses). A full loadout costs 4,500 credits. After 500,000 matches, your data shows a problem: teams that win the first 3 rounds (pistol round + 2 gun rounds) win the match 72% of the time. The loss bonus is not recovering losing teams fast enough -- by round 4, the losing team has 2,400 credits per player while the winning team has 4,100, meaning the losing team cannot buy a full loadout until round 6 at the earliest. By then, the score is typically 5-1 and the match feels decided. Three options: (A) increase loss bonus base from 1,900 to 2,500 (losing teams can full-buy by round 4, but this reduces the punishment for losing, making the pistol round feel less consequential); (B) add a round-4 'reset bonus' of 2,000 credits to the losing team only (directly addresses the round-4 gap but creates a cliff where losing 3 is optimal if you were going to lose anyway); (C) reduce full-loadout cost from 4,500 to 3,800 credits (both teams can full-buy earlier, speeding up the economy cycle but reducing the number of eco rounds from ~5 per half to ~2). Choose one. Rule out one explicitly. State the target metric for 'first-to-3 wins the match' that you want to achieve (what percentage makes the early rounds feel consequential but not deterministic), and specify what your economy does on round 13 (the half-switch) -- full reset, partial carry, or something else.`
  },

  // ce7b10a1 - scored 5 in R2, "hub engagement is product design"
  // This question is fundamentally about a lobby feature, which is product/UX regardless of framing.
  // Fix: replace entirely with a live-service mechanic design problem
  {
    prefix: 'ce7b10a1',
    text: `You are a mid-level designer on a live 5v5 hero shooter with 20 heroes. Your game has a daily challenge system: 3 challenges per day, each requiring a specific hero or ability type (e.g. 'deal 2,000 damage with Flame abilities'). Challenges reward 50 Tokens each (a match pays 100 Tokens baseline). After 6 months live, the system has two problems. Problem 1: challenges distort ranked play. In 15% of ranked matches, at least one player picks a hero they do not main because their daily challenge requires it. These off-hero picks have a 42% win rate versus 51% for main-hero picks. Problem 2: challenge completions cluster at exactly 3 per day -- players log in, complete their 3 challenges in casual mode (not ranked), and log out. Daily session length for challenge-driven players averages 45 minutes versus 90 minutes for non-challenge players. Three redesigns: (A) remove hero-specific challenges entirely and replace with role-generic ones ('deal 2,000 damage with any hero') -- eliminates the ranked distortion but also eliminates the incentive to try new heroes; (B) restrict hero-specific challenges to casual mode only -- protects ranked integrity but creates two parallel progression tracks and adds UI complexity; (C) replace daily challenges with weekly challenges that require cumulative play across 5+ matches ('win 10 rounds' instead of 'deal 2,000 Flame damage') -- eliminates hero distortion and extends engagement past 3-and-done, but removes the daily login hook that drives DAU. Choose one. Rule out one explicitly. State the one metric you would track over 30 days to confirm your redesign is not reducing overall engagement, and name the specific threshold below which you would revert to the old system.`
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
