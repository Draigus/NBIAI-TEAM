import requests, json

BASE = 'http://localhost:8888'
resp = requests.post(f'{BASE}/api/auth/login', json={'username': 'glen', 'password': 'nbi2026'})
token = resp.json()['token']
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

updates = {
    '2a0f22eb-ae9e-4e9f-b388-7af264d2f026': {
        'description': 'Create a one-page map showing exactly what a player gets for their money at each price point ($5.99 to $99.99). For each tier, list what items they can afford and what they cannot. Flag any gaps where Julius needs to confirm pricing.',
        'success_factor': 'One-page document exists showing all 6 HC tiers and what each one buys. Any unconfirmed prices are clearly flagged. Glen can explain the value chain to Jonas in plain English.'
    },
    '08b5cfd2-752a-4ede-b07d-8caf9aab6f14': {
        'description': "Check whether Goals' revenue assumptions are realistic. They assume 10.4% of players will pay and spend $32.48 on average. Find published data from EA, Konami, or analyst reports showing what comparable games actually achieve. State clearly whether Goals' targets are aggressive, conservative, or realistic.",
        'success_factor': "Written assessment with at least 2 cited sources comparing Goals' assumptions to real-world data. Clear verdict: realistic, aggressive, or fantasy. If aggressive, state what the implication is for pricing."
    },
    'c71fe1e3-7324-42c2-8bf2-95ef688057ab': {
        'description': 'Build a chart showing where Goals sits vs 5-8 competitors at each price tier. For example: "At the $9.99 tier, Goals gives you X coins per dollar. The market average is Y. Goals is at the 60th percentile." Verify 2-3 competitor prices are still current by checking their stores.',
        'success_factor': 'Position map exists for all 6 tiers. Each tier shows: Goals price, market range (min/median/max), Goals percentile. One clear sentence summarising overall position.'
    },
    'aa76655a-6ddf-4fdf-8755-c7b839b60fd5': {
        'description': "Compare how much extra value Goals gives for buying bigger packs vs how much competitors give. Goals currently gives ~19% bonus at the top tier. EA FC gives ~40%. Fortnite gives ~24%. Assess whether Goals' bonuses are enough to motivate players to spend more.",
        'success_factor': 'Comparison table showing discount curves for Goals + 4 competitors. Written recommendation: keep current curve, steepen it, or flatten it. With reasoning.'
    },
    '528b8719-76cf-4a42-b7e4-3a3bde4fd5e2': {
        'description': 'Review the 6-tier price structure ($5.99 to $99.99). Check: Is $5.99 too high for a first purchase? Are there gaps between tiers that need filling? Is the top tier appropriate? Compare structure to what EA FC, Fortnite, and Apex use.',
        'success_factor': 'Written audit covering: entry point assessment, tier gap analysis, whale ceiling analysis. Clear recommendation for each: keep, add tier, or adjust. Supported by competitor comparison.'
    },
    '0f3d8495-40a0-4408-bb0c-2a0b41168527': {
        'description': 'Build a table showing how much Goals actually keeps after platform fees at each price point and platform. Steam takes 30%, Epic takes 12%, PlayStation and Xbox take 30%. Calculate the net for all 6 tiers on all 4 platforms.',
        'success_factor': 'Complete net revenue table (6 tiers x 4 platforms = 24 cells). Any concerns about margins flagged. Epic advantage quantified as a percentage.'
    },
    '5abbe6f3-ee98-4676-b132-e24d419dcdfa': {
        'description': 'Model 4 "what if" scenarios showing what happens to revenue if prices change. Scenario A: raise everything 10%. Scenario B: raise everything 20%. Scenario C: raise only the cheapest tier. Scenario D: keep prices but give better bonuses on the biggest pack. Show revenue impact as a range (pessimistic to optimistic) for each.',
        'success_factor': '4 scenarios modelled with revenue ranges. Each shows: price change, assumed conversion impact, net revenue change. Clear recommendation on which scenario is best for launch.'
    },
    '3f85d19c-ebf6-4bd4-af10-1dfa11370af2': {
        'description': 'Research what EA FC, Fortnite, Apex, and eFootball offer to first-time buyers (starter packs, first-purchase bonuses, welcome deals). Based on findings, recommend 2-3 specific offers Goals could implement to get new players to make their first purchase.',
        'success_factor': '2-3 specific first-purchase recommendations. Each includes: what it is, what it costs Goals, expected benefit. Clearly framed as additional to the core pricing, not a change to it.'
    },
    '71a15aa9-83f4-4845-9cb6-dc6d58850da2': {
        'description': 'Go through all 40+ countries in the pricing spreadsheet. Mark each one green (fine as-is), amber (needs review), or red (must change before submission). Use the FX deviation column and the existing recommendation flags. Cross-reference with how many beta players came from each country.',
        'success_factor': 'Every country has a colour rating. Red countries have a one-sentence explanation of the problem. Output is a ranked list with highest-risk markets at the top.'
    },
    '8ee2c197-1b7e-4625-9e4a-d8de3a8150b4': {
        'description': 'For each red/amber country (expect 5-10), find out what EA FC and Fortnite actually charge there. Check SteamDB for Steam prices, PlayStation Store web pages for console prices. Build a comparison: what Goals charges vs what EA FC charges in each market.',
        'success_factor': 'Comparison table for all red/amber countries. Each row: country, Goals price, EA FC price, Fortnite price, percentage difference. Sources cited for every price.'
    },
    '888ae735-0cb5-4714-bc6d-e7239d1789e8': {
        'description': 'Check that every price in the PlayStation and Xbox columns of the pricing matrix matches a real platform tier. Sony and Xbox only allow specific price points. If any price is not a valid tier, flag it because it will be rejected during submission.',
        'success_factor': 'Written confirmation: all prices are valid platform tiers, OR a list of specific prices that need adjustment with the nearest valid tier for each.'
    },
    'bd79ea54-5bcd-4c5c-80a4-a7f47dc2ab67': {
        'description': "For each red/amber country, write a one-page recommendation card. Each card should be completely standalone so Julius can action it without reading the full report. Include: current price, what is wrong, recommended new price, why, and what happens if we do not change it.",
        'success_factor': '8-12 country cards completed. Each is self-contained. Julius can read one card and know exactly what to change in the pricing spreadsheet for that country.'
    },
    '7a0fea4e-0ddd-4919-a510-1d25d176bfc2': {
        'description': "Write one paragraph that directly answers Jonas' question: \"Are we pricing too low?\" Use the competitive position data, the payer assumptions, and the scenario modelling to take a clear position. No hedging. Say \"yes you are too low\" or \"no, your pricing is appropriate\" and back it up with numbers.",
        'success_factor': 'One paragraph exists that Jonas can read and immediately know whether to raise prices or not. Contains a specific recommendation with a number.'
    },
    '9fec6a3e-c725-4f0c-8484-482eb0b8ebf3': {
        'description': 'List every pricing risk identified during the analysis. For each: what could go wrong, how likely is it, how bad would it be, which markets does it affect, and what should Goals do about it. Rank them from most to least dangerous.',
        'success_factor': 'Minimum 7 risks documented. Each has severity, likelihood, affected markets, and a mitigation action. Top 3 risks have specific, implementable steps Goals can take immediately.'
    },
    '1ed0a347-c846-422e-972b-a3a378a25377': {
        'description': 'Write the 5 most impactful things Goals should do before submitting prices to Sony/Xbox. Each recommendation must be specific enough that Julius can implement it without asking follow-up questions. Include the expected revenue impact of each.',
        'success_factor': '5 recommendations written. Each has: exact change to make, evidence for why, expected revenue impact (range), and what happens if they skip it. A studio economy designer would read these and act same day.'
    },
    '200aa306-433d-41d9-a029-cdf0702dd361': {
        'description': 'Write a simple step-by-step guide that Julius can follow when Goals creates a new item and needs to set prices for it. Include a worked example (e.g. pricing a new celebration for Brazil). This should be a tool that outlasts the engagement.',
        'success_factor': 'One-page guide exists. Julius can follow it without NBI help. Worked example included. PPP lookup table for all launch markets included.'
    },
    'b1377499-9cdf-417e-ab1f-13c11a88be53': {
        'description': 'Write 3-5 quick tactical observations about how Goals can maximise revenue during the World Cup (June 2026). Keep it short (half a page). This is a teaser showing what a full live service engagement could deliver.',
        'success_factor': '3-5 bullet points. Each is a specific, actionable pricing tactic for the World Cup window. Clearly positioned as a taste of what Phase 2 would cover in detail.'
    },
    '6b8ed1ed-103b-48b7-bc7e-7910c9f1bcce': {
        'description': "Write a brief \"what comes next\" section for the deliverable. Position the logical follow-on work (post-launch data review, A/B testing, World Cup strategy) naturally. Should feel helpful, not like a sales pitch.",
        'success_factor': 'Half-page section written. Reads as genuine advice, not upselling. Recommends a check-in call 2-3 weeks post-launch. Does NOT include NBI pricing.'
    },
    'e3bc69ec-21e8-47b8-9c31-1742dd2cf256': {
        'description': 'Assemble all findings into the final document for Jonas and Julius. 12-18 pages. Executive summary first (1 page with the headline answer and top 5 actions). Then sections covering competitive position, regional pricing, scenarios, risks, recommendations, framework, and appendix.',
        'success_factor': 'Complete document draft ready for internal review. All sections filled with real findings (no placeholders). Internally consistent. Written in British English, direct and numbers-backed.'
    },
    'f08a1e0b-ebe8-4791-92c6-bdfa5c2c2820': {
        'description': 'Glen reviews the document for accuracy and tone. Tom reviews for commercial positioning and brand. Address all feedback and produce the final version. Send to Jonas and Julius 24 hours before the review call.',
        'success_factor': 'Final document approved by both Glen and Tom. Sent to client. Review call scheduled and confirmed.'
    },
    '1bff9b6f-4279-435e-9a6f-bacb0259e87d': {
        'description': 'Run a 30-45 minute remote call with Jonas and Julius. Walk them through the top 5 recommendations and regional highlights. Answer their questions. Send a follow-up email within 24 hours summarising agreed actions and next steps.',
        'success_factor': 'Call completed. Follow-up email sent within 24 hours. Phase 2 interest level documented. Any adjusted recommendations captured.'
    },
}

success = 0
fail = 0
for task_id, payload in updates.items():
    r = requests.patch(f'{BASE}/api/tasks/{task_id}', headers=headers, json=payload)
    if r.status_code == 200:
        success += 1
    else:
        fail += 1
        print(f'FAIL {task_id}: {r.status_code} {r.text[:200]}')

print(f'Updated: {success}/{len(updates)}. Failures: {fail}')
