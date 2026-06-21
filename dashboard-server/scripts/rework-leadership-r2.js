require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REWRITES = [
  {
    // cc59dbca - R1 score 6, "technical art/rendering optimisation question, not Leadership"
    // Fix: reframe as leadership conflict resolution with decision-rights framework
    prefix: 'cc59dbca',
    text: `Your multiplayer game targets 60fps on PS5 and Xbox with 50-player sessions. The art director and lead engineer have been deadlocked for two weeks and it has escalated to you. The art director's team built 8 character models at 120K triangles with 4K textures -- the visual standard they were hired to deliver. The lead engineer's GPU profiling proves these models blow the frame and memory budgets at 50 players: 6M triangles per frame versus a 3.2M budget, 4.25GB VRAM versus 3.5GB available. Both have data supporting their position. The art director cites reference screenshots from a AAA competitor -- which runs 12-player lobbies, not 50. The engineer says physics do not change and the game will ship at 35fps, failing certification. Twelve more characters are in the same pipeline. Every day without resolution costs GBP 8,500 in idle artist salaries. You have three options: back the art director and reduce player count from 50 to 24 (fits the memory budget but undermines the core design pitch to your publisher); back the engineer and mandate reduced-quality assets (fits at 50 players but the art director tells you privately she will resign because it contradicts the quality commitment she was recruited on); or impose an LOD-based compromise that requires 3 weeks of engineering work neither lead requested and that both view as your overreach. Which option do you choose and what specifically do you say to the lead you overrule in the conversation where you deliver the decision? Then: what decision-rights framework do you implement so that the next time a creative-versus-technical conflict emerges, it resolves at the lead level without requiring your intervention -- who owns the call, what data triggers escalation, and what is the time limit before a default decision takes effect?`
  },
  {
    // 22cfdb69 - R1 score 6, "investor finance homework, not leadership"
    // Fix: reframe as founder control, co-founder disagreement, and team communication decision
    prefix: '22cfdb69',
    text: `Your studio has 48 staff, burns GBP 320K per month, and has 11 months of runway. You and your co-founder own 85% of the company. You need GBP 4.5M to ship a multiplayer game 18 months from launch. Two viable paths exist. Path A: a Series A raising GBP 3.2M at GBP 18M pre-money from a gaming VC who wants a board seat, quarterly reporting, and anti-dilution protection. This dilutes you and your co-founder from 85% to 67% and gives the VC effective veto over future fundraising, M&A, and executive hiring. You would still need GBP 1.5M in venture debt to close the gap, and the lender requires the equity round to close first. Path B: a publisher advance of GBP 2M recouped at 100% before a 70/30 split, combined with a GBP 500K grant. This covers GBP 2.5M, leaving a GBP 2M gap -- meaning you either cut 15 staff to reduce burn or take the remaining GBP 2M from the same publisher on worse terms. Your co-founder wants Path A because she cannot face laying people off. Your finance contractor warns that the VC's anti-dilution ratchet could dilute you below 50% if you ever raise at a lower valuation. Your lead engineer, who holds 2% equity, has heard rumours about the funding situation and asks you directly whether he should start looking for another job. Three people know the full picture; the rest of the team does not. What path do you choose and why, how do you handle the disagreement with your co-founder if you choose differently from her, what do you say to the lead engineer today, and at what point and with what message do you inform the broader studio about the financial situation?`
  },
  {
    // fb9ad9bf - R1 score 6, "UK tax-claim specialist exercise, not Leadership"
    // Fix: reframe as managing cash-flow risk, stakeholder communication, and contingency planning
    prefix: 'fb9ad9bf',
    text: `Your UK studio has 52 staff and a multiplayer game 14 months from launch. Your 18-month cash-flow forecast depends on three non-revenue inflows totalling GBP 1.05M: a GBP 520K VGTR claim due in 8 weeks, a GBP 350K Innovate UK grant with a decision in 10 weeks, and a GBP 180K R&D tax credit refund in 12 weeks. Combined, these represent 3.1 months of runway at your GBP 340K monthly burn. Last Friday, HMRC sent a pre-enquiry letter challenging the VGTR claim. Your tax adviser gives it a 60% chance of surviving in full, 30% chance of a 40% reduction, and 10% chance of disallowance. The Innovate UK grant requires match funding you planned to source from the VGTR proceeds -- if VGTR is reduced, the grant application may collapse too. Worst case: you lose GBP 870K (VGTR plus grant), reducing runway from 14 months to 11.4 months -- 2.6 months short of launch. Your publisher expects a milestone build in 4 months and would need 90 days' notice of any schedule risk. Your board meets in 3 weeks. Your team does not know. The HMRC response takes 6 weeks. What do you do in the next two weeks -- before you know the HMRC outcome? Specifically: what contingency cuts do you identify but not yet execute, what do you tell the board at the 3-week meeting, what do you tell the publisher now versus after the HMRC decision, and what is the specific trigger threshold (VGTR outcome, grant decision, or both) at which you execute the contingency?`
  },
  {
    // 1ca98c9a - R1 score 6, "duplicates R&D-tax theme, claim-defensibility mechanics"
    // Fix: completely different scenario -- managing an irreplaceable but toxic lead engineer
    prefix: '1ca98c9a',
    text: `Your studio's lead network engineer wrote 80% of your custom multiplayer networking stack -- 60Hz server-authoritative with client-side prediction and rollback -- over 3 years. He is the only person who fully understands the system. The game launches in 9 months. In the last quarter: two mid-level engineers on his team requested transfers citing his code-review style, which one described as humiliating; a junior who joined 4 months ago filed a formal HR complaint after being publicly berated in a sprint retro for a bug that turned out to be in the lead's own code; and your CTO admits privately that he avoids giving the lead critical feedback because the studio cannot afford to lose him before launch. The networking stack has no documentation, no architectural diagrams, and the lead resists pair programming because it slows him down. If he leaves, your CTO estimates 4-6 months to ramp a replacement -- longer than you have before launch. His technical output is exceptional: lowest defect rate on the team, ships on time, and he solved a desync issue last month that no one else could diagnose. He does not believe there is a problem -- he says the junior was not ready for the pace of a live-service team. What action do you take this week, what is the specific conversation you have with the lead including what you require him to change and what consequence you set if he does not, what is your contingency plan if he reacts by threatening to leave, and what structural change do you make to reduce the bus-factor risk on the networking stack before launch regardless of the behavioural outcome?`
  },
  {
    // f4c78408 - R1 score 6, "IFRS 15 is a finance-specialist test, not Leadership"
    // Fix: reframe as a monetisation strategy decision with board-level stakeholder conflict
    prefix: 'f4c78408',
    text: `Your multiplayer game is 6 months from launch. The monetisation model is premium at GBP 29.99 with a GBP 9.99 seasonal battle pass and a virtual-currency cosmetic shop. Your publisher's head of commercial presents data at a board meeting: three comparable titles launched premium in the last 18 months and converted to free-to-play within 8 months because player populations dropped below the minimum viable for healthy matchmaking. His recommendation: launch F2P with a GBP 14.99 battle pass and aggressive cosmetic pricing, projecting 3x the player base at 70% lower revenue per user. Your game designer objects: the economy was balanced around premium pricing, the cosmetic pipeline produces 40 items per season at premium conversion rates, and F2P requires a 4x larger cosmetic catalogue -- which the art team cannot produce in 6 months without cutting gameplay polish. Your finance lead models two scenarios: premium launch projects 120K units year one (GBP 3.6M sales plus GBP 1.2M live-service = GBP 4.8M total) versus F2P launch projects 400K players with 5% battle-pass conversion and 2% cosmetic spend (GBP 1.08M year one, growing 40% year-over-year if retention holds). The premium model front-loads revenue but risks population collapse. The F2P model requires 18 months to break even, and your runway is 12 months without additional funding. The board wants a recommendation next week. What do you recommend, what specific data would you need to validate the publisher's population-collapse claim for your genre and player-count requirements, and if you launch premium, what is your contingency trigger -- the exact player-count threshold and post-launch timeline at which you convert to F2P, and what does the studio need to have ready in advance so the conversion does not take 3 months?`
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
